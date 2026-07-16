variable "name_prefix" {
  type = string
}

variable "frontend_origin_domain" {
  description = "DNS name of the frontend service's ALB (HTTP-only origin; CloudFront terminates TLS at the edge)"
  type        = string
}

variable "backend_origin_domain" {
  description = "DNS name of the backend service's ALB (HTTP-only origin; CloudFront terminates TLS at the edge)"
  type        = string
}

variable "price_class" {
  description = "PriceClass_100 (US/Canada/Europe only) keeps this cheap; widen later if traffic needs it"
  type        = string
  default     = "PriceClass_100"
}
