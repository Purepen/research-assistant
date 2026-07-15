variable "name_prefix" {
  type = string
}

variable "jwt_secret_key" {
  type        = string
  sensitive   = true
  description = "Backend JWT_SECRET_KEY (>=32 chars) — auth_service.py fails fast without it"
}

variable "fernet_key" {
  type        = string
  sensitive   = true
  description = "Backend FERNET_KEY for encrypting BYOK OpenAI keys at rest — core/crypto.py fails fast without it"
}

variable "openai_api_key" {
  type        = string
  sensitive   = true
  description = "System OpenAI key used for the free-trial fallback (see app/utils/openai_key.py). Required if you want the free trial to actually work."
}

variable "resend_api_key" {
  type        = string
  sensitive   = true
  default     = ""
  description = "Resend API key for transactional email (verification/reset). Optional — email failures are non-fatal."
}
