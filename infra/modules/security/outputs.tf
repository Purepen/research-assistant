output "jwt_secret_key_arn" {
  value = aws_secretsmanager_secret.jwt_secret_key.arn
}

output "fernet_key_arn" {
  value = aws_secretsmanager_secret.fernet_key.arn
}

output "openai_api_key_arn" {
  value = aws_secretsmanager_secret.openai_api_key.arn
}

output "resend_api_key_arn" {
  value = aws_secretsmanager_secret.resend_api_key.arn
}
