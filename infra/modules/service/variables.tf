variable "name_prefix" {
  type = string
}

variable "service_name" {
  type        = string
  description = "e.g. \"backend\" or \"frontend\""
}

variable "vpc_id" {
  type = string
}

variable "public_subnet_ids" {
  type        = list(string)
  description = "Where the ALB lives"
}

variable "private_subnet_ids" {
  type        = list(string)
  description = "Where the ECS task lives (reaches the internet via the shared NAT gateway)"
}

variable "ecs_cluster_id" {
  type = string
}

variable "image_url" {
  type        = string
  description = "Full ECR image URI including tag, e.g. <repo_url>:latest"
}

variable "container_port" {
  type = number
}

variable "health_check_path" {
  type = string
}

variable "cpu" {
  type    = number
  default = 512
}

variable "memory" {
  type    = number
  default = 1024
}

variable "health_check_grace_period_seconds" {
  type        = number
  default     = 90
  description = "Time to let the container boot before ECS starts acting on failed ALB health checks. The backend measured ~20s to import pandas/openai-agents and become ready — 90s leaves real margin."
}

variable "desired_count" {
  type    = number
  default = 1
}

variable "environment" {
  type        = map(string)
  default     = {}
  description = "Plain (non-sensitive) container environment variables"
}

variable "secrets" {
  type        = map(string)
  default     = {}
  description = "Container env vars sourced from Secrets Manager: { ENV_VAR_NAME = secret_arn }"
}

variable "task_role_policy_json" {
  type        = string
  default     = null
  description = "Optional inline policy JSON granting the task role extra permissions (e.g. backend's S3 access)"
}

variable "log_retention_days" {
  type    = number
  default = 14
}
