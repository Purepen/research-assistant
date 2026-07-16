terraform {
  required_version = ">= 1.5"
  required_providers {
    aws = {
      source  = "hashicorp/aws"
      version = "~> 5.0"
    }
    random = {
      source  = "hashicorp/random"
      version = "~> 3.6"
    }
  }

  # Local state for now (solo project, v1 showcase). Before this is ever
  # touched by more than one person or a CI pipeline, switch to a remote
  # backend (S3 + DynamoDB lock table) — terraform.tfstate holds plaintext
  # secrets (the generated DB password, etc.), so treat this file like a
  # credential and never commit it (see infra/.gitignore).
}

provider "aws" {
  region = var.aws_region
}

data "aws_availability_zones" "available" {
  state = "available"
}

locals {
  azs = slice(data.aws_availability_zones.available.names, 0, 2)
}

module "network" {
  source      = "../../modules/network"
  name_prefix = var.name_prefix
  azs         = local.azs
}

module "security" {
  source         = "../../modules/security"
  name_prefix    = var.name_prefix
  jwt_secret_key = var.jwt_secret_key
  fernet_key     = var.fernet_key
  openai_api_key = var.openai_api_key
  resend_api_key = var.resend_api_key
}

module "storage" {
  source      = "../../modules/storage"
  name_prefix = var.name_prefix
}

module "ecr" {
  source      = "../../modules/ecr"
  name_prefix = var.name_prefix
}

resource "aws_ecs_cluster" "this" {
  name = var.name_prefix
}

# ── Backend service (created first so we know its URL before building the
#    frontend image — see infra/README.md for the full bootstrap sequence) ──

module "backend_service" {
  source             = "../../modules/service"
  name_prefix        = var.name_prefix
  service_name       = "backend"
  vpc_id             = module.network.vpc_id
  public_subnet_ids  = module.network.public_subnet_ids
  private_subnet_ids = module.network.private_subnet_ids
  ecs_cluster_id     = aws_ecs_cluster.this.id
  image_url          = "${module.ecr.backend_repository_url}:${var.backend_image_tag}"
  container_port     = 8000
  health_check_path  = "/health"
  cpu                = 512
  memory             = 1024

  environment = {
    STORAGE_TYPE     = "local" # S3 plumbing isn't finished yet — see infra/modules/storage/main.tf
    STORAGE_PATH     = "/app/storage"
    REQUIRE_BYOK     = "false"                             # must be false/unset for the free trial to work at all
    FRONTEND_URL     = "https://${module.cdn.domain_name}" # CloudFront domain, not the frontend ALB directly — see infra/modules/cdn
    GOOGLE_CLIENT_ID = var.google_client_id
  }

  secrets = {
    DATABASE_URL   = module.database.database_url_secret_arn
    JWT_SECRET_KEY = module.security.jwt_secret_key_arn
    FERNET_KEY     = module.security.fernet_key_arn
    OPENAI_API_KEY = module.security.openai_api_key_arn
    RESEND_API_KEY = module.security.resend_api_key_arn
  }
}

module "database" {
  source             = "../../modules/database"
  name_prefix        = var.name_prefix
  vpc_id             = module.network.vpc_id
  private_subnet_ids = module.network.private_subnet_ids
}

# Separate from the database module itself to avoid a backend_service <->
# database module dependency cycle (backend_service needs the DB's secret
# ARN; the DB's ingress rule needs backend_service's security group id).
resource "aws_security_group_rule" "db_from_backend" {
  type                     = "ingress"
  from_port                = 5432
  to_port                  = 5432
  protocol                 = "tcp"
  security_group_id        = module.database.security_group_id
  source_security_group_id = module.backend_service.task_security_group_id
}

module "frontend_service" {
  source             = "../../modules/service"
  name_prefix        = var.name_prefix
  service_name       = "frontend"
  vpc_id             = module.network.vpc_id
  public_subnet_ids  = module.network.public_subnet_ids
  private_subnet_ids = module.network.private_subnet_ids
  ecs_cluster_id     = aws_ecs_cluster.this.id
  image_url          = "${module.ecr.frontend_repository_url}:${var.frontend_image_tag}"
  container_port     = 3000
  health_check_path  = "/"
  cpu                = 256
  memory             = 512
}

# HTTPS edge — see infra/modules/cdn/main.tf for why this exists (Google OAuth
# refuses non-localhost http:// origins outright) and why it's one
# distribution routing to both ALBs rather than one each.
module "cdn" {
  source                 = "../../modules/cdn"
  name_prefix            = var.name_prefix
  frontend_origin_domain = module.frontend_service.alb_dns_name
  backend_origin_domain  = module.backend_service.alb_dns_name
}

