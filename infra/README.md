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
(browser code, not a runtime env var) — so the backend has to exist first so
we know its URL.

```bash
cd infra/envs/prod

# 1. Create everything. The two ECS services will exist but crash-loop
#    (no image pushed to their ECR repos yet) — that's expected.
terraform init
terraform plan
terraform apply

# 2. Build + push the backend image
BACKEND_REPO=$(terraform output -raw backend_ecr_repository_url)
aws ecr get-login-password --region us-east-1 | docker login --username AWS --password-stdin "${BACKEND_REPO%/*}"
docker build -t "$BACKEND_REPO:latest" ../../../backend
docker push "$BACKEND_REPO:latest"

# 3. Now the backend URL is known — build + push the frontend with it baked in
BACKEND_URL=$(terraform output -raw backend_url)
FRONTEND_REPO=$(terraform output -raw frontend_ecr_repository_url)
docker build -t "$FRONTEND_REPO:latest" \
  --build-arg NEXT_PUBLIC_API_URL="$BACKEND_URL" \
  ../../../frontend
docker push "$FRONTEND_REPO:latest"

# 4. Both services are still running the old (nonexistent/failed) task —
#    force them to pull the image that now exists at :latest
CLUSTER=$(terraform output -raw ecs_cluster_name)
aws ecs update-service --cluster "$CLUSTER" --service "${CLUSTER}-backend" --force-new-deployment >/dev/null
aws ecs update-service --cluster "$CLUSTER" --service "${CLUSTER}-frontend" --force-new-deployment >/dev/null

echo "Frontend: $(terraform output -raw frontend_url)"
echo "Backend:  $BACKEND_URL"
```

`infra/scripts/deploy.sh` does steps 2-4 for you once the infra from step 1
exists (run it any time you push a code change, not just on first deploy).

Give the ALB health checks 1-2 minutes after each `force-new-deployment`
before hitting the URL — `GET /health` (backend) and `GET /` (frontend) need
to pass twice before the ALB routes traffic to the new task.

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
Secrets Manager/CloudWatch (a few dollars). `terraform destroy` between demos
if cost matters more than uptime.

## What's next (v2, per roadmap.md)

Workstream 1 (S3 state contract, Lambda entrypoints, this same Postgres) →
Workstream 2 (Terraform for Step Functions + per-phase Lambdas + Amplify
frontend). The VPC, Aurora, S3, and secrets modules here are written so v2 can
reuse them directly rather than starting over.
