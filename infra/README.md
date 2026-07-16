# Deploying research-assistant to AWS

A "v1 showcase" deploy: the existing app, containerized, running on ECS
Fargate behind an ALB, with Aurora Serverless v2 Postgres and Terraform
managing all of it. This is deliberately **not** the full serverless
Lambda/Step-Functions rebuild in `roadmap.md` — that's the planned v2. This
v1 reuses the pieces v2 needs anyway (VPC, Aurora, S3, ECR, secrets), so
nothing here is wasted work.

## What gets created

- VPC: 2 public + 2 private subnets, 1 NAT gateway
- ECS Fargate cluster running 2 services (backend, frontend), each behind
  its own Application Load Balancer
- One CloudFront distribution in front of both ALBs (path-based: `/auth/*`,
  `/research/*`, `/projects/*`, `/user/*`, `/topics/*`, `/health`, `/docs`,
  `/redoc`, `/openapi.json` → backend; everything else → frontend). This is
  the app's actual HTTPS entry point (`app_url` output) — the two ALB URLs
  are plain HTTP and exist only as CloudFront origins now, not something you
  visit directly. It exists because Google's OAuth "Authorized JavaScript
  origins" flatly refuses non-localhost `http://` — see "Google sign-in"
  below. Same distribution for both services also makes them same-origin, so
  there's nothing to configure for CORS between them.
- Aurora Serverless v2 PostgreSQL (private subnets only)
- S3 bucket for uploads (provisioned, not wired into the app yet — see below)
- ECR repositories for both Docker images
- Secrets Manager entries for JWT secret, Fernet key, system OpenAI key,
  Resend key, and the generated DB connection string

**Known v1 limitation:** file uploads (guidelines/dataset/past-project docs)
use local container storage (`STORAGE_TYPE=local`), not the S3 bucket that
gets created. The app's S3 code path isn't fully wired yet — `storage_adapter.py`
can *save* to S3 but the pipeline still expects to *read* uploads back from a
local filesystem path, not an S3 key. Local storage on ECS Fargate's ephemeral
disk works fine as long as the container that received the upload is still
the one processing it shortly after (true today — generation runs as a
background task in the same process) and doesn't get replaced mid-request.
Finishing the real S3 plumbing is a fast-follow, not a blocker for going live.

**Verify after the CloudFront cutover:** test an actual guidelines/dataset
file upload through `app_url`, not just sign-in. CloudFront imposes its own
request-body-size limit on viewer requests, separate from anything the app
enforces — if a real `.docx`/`.xlsx` upload gets rejected where it worked
fine hitting the backend ALB directly, that's the cause, and the fix is
routing uploads direct-to-S3 (the roadmap.md WS1.4 direction already), not a
CloudFront setting.

## One-time setup (per machine)

Already done on this machine: Terraform and AWS CLI installed via `winget`,
Docker Desktop running.

1. Create an AWS account (aws.amazon.com), enable MFA on root, set a billing
   budget alert, create an IAM user (`terraform-deploy`, `AdministratorAccess`
   for now), generate an access key.
2. `aws configure` — paste in the access key ID/secret, pick a region
   (defaults below assume `us-east-1`), output format `json`.
3. `cd infra/envs/prod && cp terraform.tfvars.example terraform.tfvars` (a
   real `terraform.tfvars` with generated JWT/Fernet keys already exists on
   this machine — just fill in `openai_api_key` and, optionally,
   `resend_api_key`/`google_client_id`).

## First deploy (bootstrap order matters)

The frontend bakes `NEXT_PUBLIC_API_URL` into its build at Docker-build time
(browser code, not a runtime env var) — so CloudFront has to exist first so
we know the one HTTPS URL both frontend and backend will actually be served
from.

```bash
cd infra/envs/prod

# 1. Create everything, including CloudFront. The two ECS services will exist
#    but crash-loop (no image pushed to their ECR repos yet) — expected.
#    CloudFront distributions take 5-15 minutes to reach "Deployed" after
#    creation — don't be alarmed if app_url isn't reachable immediately.
terraform init
terraform plan
terraform apply

# 2. Build + push the backend image
BACKEND_REPO=$(terraform output -raw backend_ecr_repository_url)
aws ecr get-login-password --region us-east-1 | docker login --username AWS --password-stdin "${BACKEND_REPO%/*}"
docker build -t "$BACKEND_REPO:latest" ../../../backend
docker push "$BACKEND_REPO:latest"

# 3. Build + push the frontend, pointed at the CloudFront domain — NOT the
#    backend ALB directly (CloudFront routes /auth/*, /research/*, etc. to it).
#    NEXT_PUBLIC_GOOGLE_CLIENT_ID must be passed too (also a build-time bake,
#    same as the API URL) or Google sign-in silently no-ops in the browser —
#    no error, the button just never gets wired up.
APP_URL=$(terraform output -raw app_url)
FRONTEND_REPO=$(terraform output -raw frontend_ecr_repository_url)
GOOGLE_CLIENT_ID=$(terraform console <<< 'var.google_client_id' | tr -d '"')
docker build -t "$FRONTEND_REPO:latest" \
  --build-arg NEXT_PUBLIC_API_URL="$APP_URL" \
  --build-arg NEXT_PUBLIC_GOOGLE_CLIENT_ID="$GOOGLE_CLIENT_ID" \
  ../../../frontend
docker push "$FRONTEND_REPO:latest"

# 4. Both services are still running the old (nonexistent/failed) task —
#    force them to pull the image that now exists at :latest
CLUSTER=$(terraform output -raw ecs_cluster_name)
aws ecs update-service --cluster "$CLUSTER" --service "${CLUSTER}-backend" --force-new-deployment >/dev/null
aws ecs update-service --cluster "$CLUSTER" --service "${CLUSTER}-frontend" --force-new-deployment >/dev/null

echo "App: $APP_URL"
```

`infra/scripts/deploy.sh` does steps 2-4 for you once the infra from step 1
exists (run it any time you push a code change, not just on first deploy).

Give the ALB health checks 1-2 minutes after each `force-new-deployment`
before hitting `app_url` — `GET /health` (backend) and `GET /` (frontend)
need to pass twice before the ALB routes traffic to the new task.

## Google sign-in

Google's OAuth client refuses `http://` "Authorized JavaScript origins" for
anything but `localhost` — this app's sign-in uses Google Identity Services'
token flow (`accounts.id.initialize`/`renderButton`, no redirect URI
involved), so the **only** field that matters is that origins list. After
`terraform apply` produces `app_url`:

1. Go to [Google Cloud Console → APIs & Services → Credentials](https://console.cloud.google.com/apis/credentials)
   and open the OAuth 2.0 Client ID this app uses.
2. Under **Authorized JavaScript origins**, add the exact `app_url` value
   (e.g. `https://d123abc456.cloudfront.net`) — no trailing slash, no path.
3. Save. Changes usually take a few minutes to propagate on Google's side.
4. Rebuild the frontend (step 3 above / `deploy.sh frontend`) if you haven't
   already baked `NEXT_PUBLIC_API_URL=$APP_URL` into it.

If the Google consent screen is still in "Testing" publishing status, only
pre-approved test-user emails can complete sign-in at all (a Google Cloud
Console setting, unrelated to the origin fix above).

## Redeploying after a code change

```bash
cd infra/envs/prod
./scripts/deploy.sh backend   # or: frontend, or: both
```

This uses the `:latest` tag + forced redeployment, which is simple but not
fully reproducible (no way to know exactly which commit is live from the tag
alone). A CI pipeline that tags images with the git SHA and runs
`terraform apply -var backend_image_tag=<sha>` is a natural next step —
not built yet.

## Tearing it down

```bash
cd infra/envs/prod
terraform destroy
```

Costs nothing once destroyed except whatever's still in S3/ECR (both set to
`force_delete`/no retention beyond the lifecycle policy, so `destroy` takes
those with it too).

## Cost

Roughly $60-90/month running continuously: NAT gateway (~$33), Aurora
Serverless v2 at 0.5 ACU floor (~$43 if never idle-scaled further), 2 ALBs
(~$32-40), ECS Fargate compute (~$15-25 for the two small tasks), S3/ECR/
Secrets Manager/CloudWatch (a few dollars). CloudFront adds negligible cost at
this traffic level — it's pure usage-based (per-request + per-GB, no fixed
monthly charge), so a solo-developer/demo workload is cents, not dollars.
`terraform destroy` between demos if cost matters more than uptime.

Note: `terraform destroy` removes the CloudFront distribution too, which
means the Google-authorized origin disappears with it — re-registering the
new `app_url` in Google Cloud Console after every destroy/recreate cycle is
one more manual step to remember (CloudFront domain names aren't stable
across create/destroy, only across updates to an existing distribution).

## What's next (v2, per roadmap.md)

Workstream 1 (S3 state contract, Lambda entrypoints, this same Postgres) →
Workstream 2 (Terraform for Step Functions + per-phase Lambdas + Amplify
frontend). The VPC, Aurora, S3, and secrets modules here are written so v2 can
reuse them directly rather than starting over.
