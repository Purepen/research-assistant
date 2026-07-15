output "cluster_endpoint" {
  value = aws_rds_cluster.this.endpoint
}

output "database_url_secret_arn" {
  value = aws_secretsmanager_secret.database_url.arn
}

output "security_group_id" {
  value = aws_security_group.db.id
}
