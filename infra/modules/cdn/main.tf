# Single CloudFront distribution in front of both ALBs, one path per existing
# backend router prefix. This exists purely to get an HTTPS origin (Google's
# OAuth "Authorized JavaScript origins" flatly refuses non-localhost http://)
# without buying a domain — CloudFront's own *.cloudfront.net domain already
# has a valid cert. Same distribution for both services also makes the
# frontend and API same-origin, so there's no CORS to manage between them.
#
# Caching is disabled everywhere for now (both the Next.js app and the API are
# fully dynamic/auth-gated) — this is an HTTPS terminator, not a CDN cache,
# until someone deliberately opts specific paths into caching.
#
# Known risk to verify after cutover: CloudFront caps request body size for
# viewer requests. Test a real guidelines/dataset file upload through the new
# domain, not just sign-in — if a large upload gets rejected, uploads need to
# go direct-to-S3 (already the roadmap.md WS1.4 direction) rather than through
# this edge.

locals {
  backend_path_patterns = [
    "/auth/*",
    "/research/*",
    "/projects/*",
    "/user/*",
    "/topics/*",
    "/health",
    "/docs",
    "/redoc",
    "/openapi.json",
  ]

  # AWS managed policies (fixed IDs, same in every account/region)
  cache_policy_disabled          = "4135ea2d-6df8-44a3-9df3-4b5a84be39ad" # Managed-CachingDisabled
  origin_request_all_except_host = "b689b0a8-53d0-40ab-baf2-68738e2966ac" # Managed-AllViewerExceptHostHeader
}

resource "aws_cloudfront_distribution" "this" {
  enabled         = true
  comment         = "${var.name_prefix} v1 showcase — HTTPS edge in front of two HTTP-only ALBs"
  price_class     = var.price_class
  http_version    = "http2"
  is_ipv6_enabled = true

  origin {
    origin_id   = "frontend"
    domain_name = var.frontend_origin_domain
    custom_origin_config {
      http_port              = 80
      https_port             = 443
      origin_protocol_policy = "http-only"
      origin_ssl_protocols   = ["TLSv1.2"]
    }
  }

  origin {
    origin_id   = "backend"
    domain_name = var.backend_origin_domain
    custom_origin_config {
      http_port              = 80
      https_port             = 443
      origin_protocol_policy = "http-only"
      origin_ssl_protocols   = ["TLSv1.2"]
    }
  }

  default_cache_behavior {
    target_origin_id         = "frontend"
    viewer_protocol_policy   = "redirect-to-https"
    allowed_methods          = ["GET", "HEAD", "OPTIONS", "PUT", "POST", "PATCH", "DELETE"]
    cached_methods           = ["GET", "HEAD"]
    compress                 = true
    cache_policy_id          = local.cache_policy_disabled
    origin_request_policy_id = local.origin_request_all_except_host
  }

  dynamic "ordered_cache_behavior" {
    for_each = local.backend_path_patterns
    content {
      path_pattern             = ordered_cache_behavior.value
      target_origin_id         = "backend"
      viewer_protocol_policy   = "redirect-to-https"
      allowed_methods          = ["GET", "HEAD", "OPTIONS", "PUT", "POST", "PATCH", "DELETE"]
      cached_methods           = ["GET", "HEAD"]
      compress                 = true
      cache_policy_id          = local.cache_policy_disabled
      origin_request_policy_id = local.origin_request_all_except_host
    }
  }

  restrictions {
    geo_restriction {
      restriction_type = "none"
    }
  }

  viewer_certificate {
    cloudfront_default_certificate = true
  }
}
