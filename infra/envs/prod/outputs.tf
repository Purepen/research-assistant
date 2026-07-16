output "backend_url" {
  value = module.backend_service.url
}

output "frontend_url" {
  value = module.frontend_service.url
}

output "backend_ecr_repository_url" {
  value = module.ecr.backend_repository_url
}

output "frontend_ecr_repository_url" {
  value = module.ecr.frontend_repository_url
}

output "database_endpoint" {
  value = module.database.cluster_endpoint
}

output "ecs_cluster_name" {
  value = aws_ecs_cluster.this.name
}

output "app_url" {
  description = "HTTPS entry point — use this for NEXT_PUBLIC_API_URL, Google Cloud Console's Authorized JavaScript origins, and to actually visit the site"
  value       = "https://${module.cdn.domain_name}"
}
