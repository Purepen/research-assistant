#!/usr/bin/env bash
# Build + push a fresh image and force ECS to redeploy it.
# Usage: ./deploy.sh backend | frontend | both
# Must be run from infra/envs/prod (or with that dir already `terraform init`-ed).
set -euo pipefail

TARGET="${1:-both}"
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
ENV_DIR="$SCRIPT_DIR/../envs/prod"
REPO_ROOT="$SCRIPT_DIR/../.."

cd "$ENV_DIR"

REGION=$(aws configure get region)
CLUSTER=$(terraform output -raw ecs_cluster_name)

ecr_login() {
  local repo_url="$1"
  aws ecr get-login-password --region "$REGION" \
    | docker login --username AWS --password-stdin "${repo_url%/*}"
}

deploy_backend() {
  echo "==> backend"
  local repo_url image
  repo_url=$(terraform output -raw backend_ecr_repository_url)
  image="$repo_url:latest"
  ecr_login "$repo_url"
  docker build -t "$image" "$REPO_ROOT/backend"
  docker push "$image"
  aws ecs update-service --cluster "$CLUSTER" --service "${CLUSTER}-backend" --force-new-deployment >/dev/null
  echo "backend redeploying: $(terraform output -raw backend_url)"
}

deploy_frontend() {
  echo "==> frontend"
  local repo_url image backend_url
  repo_url=$(terraform output -raw frontend_ecr_repository_url)
  backend_url=$(terraform output -raw backend_url)
  image="$repo_url:latest"
  ecr_login "$repo_url"
  docker build -t "$image" \
    --build-arg NEXT_PUBLIC_API_URL="$backend_url" \
    "$REPO_ROOT/frontend"
  docker push "$image"
  aws ecs update-service --cluster "$CLUSTER" --service "${CLUSTER}-frontend" --force-new-deployment >/dev/null
  echo "frontend redeploying: $(terraform output -raw frontend_url)"
}

case "$TARGET" in
  backend)  deploy_backend ;;
  frontend) deploy_frontend ;;
  both)     deploy_backend; deploy_frontend ;;
  *) echo "Usage: $0 backend|frontend|both" >&2; exit 1 ;;
esac

echo "Give the ALB health checks 1-2 minutes before checking the URL."
