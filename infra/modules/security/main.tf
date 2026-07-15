# App-level secrets (auth/BYOK/email). The DB connection secret is created
# by the database module instead, since it depends on the generated password.

resource "aws_secretsmanager_secret" "jwt_secret_key" {
  name = "${var.name_prefix}/jwt-secret-key"
}
resource "aws_secretsmanager_secret_version" "jwt_secret_key" {
  secret_id     = aws_secretsmanager_secret.jwt_secret_key.id
  secret_string = var.jwt_secret_key
}

resource "aws_secretsmanager_secret" "fernet_key" {
  name = "${var.name_prefix}/fernet-key"
}
resource "aws_secretsmanager_secret_version" "fernet_key" {
  secret_id     = aws_secretsmanager_secret.fernet_key.id
  secret_string = var.fernet_key
}

resource "aws_secretsmanager_secret" "openai_api_key" {
  name = "${var.name_prefix}/openai-api-key"
}
resource "aws_secretsmanager_secret_version" "openai_api_key" {
  secret_id     = aws_secretsmanager_secret.openai_api_key.id
  secret_string = var.openai_api_key
}

resource "aws_secretsmanager_secret" "resend_api_key" {
  name = "${var.name_prefix}/resend-api-key"
}
resource "aws_secretsmanager_secret_version" "resend_api_key" {
  secret_id     = aws_secretsmanager_secret.resend_api_key.id
  secret_string = var.resend_api_key
}
