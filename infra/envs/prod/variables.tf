variable "aws_region" {
  type    = string
  default = "us-east-1"
}

variable "name_prefix" {
  type    = string
  default = "research-assistant-prod"
}

variable "backend_image_tag" {
  type    = string
  default = "latest"
}

variable "frontend_image_tag" {
  type    = string
  default = "latest"
}

# ── Secrets — set these in terraform.tfvars (gitignored), never commit them ───

variable "jwt_secret_key" {
  type      = string
  sensitive = true
}

variable "fernet_key" {
  type      = string
  sensitive = true
}

variable "openai_api_key" {
  type        = string
  sensitive   = true
  description = "System key for the free-trial fallback. Required for the free trial to work at all — see app/utils/openai_key.py."
}

variable "resend_api_key" {
  type      = string
  sensitive = true
  default   = ""
}

variable "google_client_id" {
  type        = string
  default     = ""
  description = "Not secret (public OAuth client id), but optional — leave blank to disable Google sign-in (auth_service.py fails closed, not open, when unset)."
}
