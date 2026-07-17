# Aurora Serverless v2 PostgreSQL — private subnets only, no public access.
# The full connection string is generated here and stored in Secrets Manager
# as DATABASE_URL (matches app/api/dependencies.py's os.getenv("DATABASE_URL")
# exactly, so no application code changes are needed).

resource "random_password" "master" {
  length  = 32
  special = false # keep it URL-safe since it goes straight into a connection string
}

resource "aws_db_subnet_group" "this" {
  name       = "${var.name_prefix}-db"
  subnet_ids = var.private_subnet_ids
}

resource "aws_security_group" "db" {
  name_prefix = "${var.name_prefix}-db-"
  vpc_id      = var.vpc_id

  # Ingress is added as a separate aws_security_group_rule in envs/prod/main.tf
  # (not inline here) to avoid a module dependency cycle: this module doesn't
  # need to know about the backend service's security group, only the root
  # module — which already depends on both — does.

  egress {
    from_port   = 0
    to_port     = 0
    protocol    = "-1"
    cidr_blocks = ["0.0.0.0/0"]
  }

  lifecycle {
    create_before_destroy = true
  }
}

resource "aws_rds_cluster" "this" {
  cluster_identifier     = "${var.name_prefix}-db"
  engine                 = "aurora-postgresql"
  engine_mode            = "provisioned"
  engine_version         = "15.17"
  database_name          = var.db_name
  master_username        = var.master_username
  master_password        = random_password.master.result
  db_subnet_group_name   = aws_db_subnet_group.this.name
  vpc_security_group_ids = [aws_security_group.db.id]
  skip_final_snapshot    = true # v1 showcase — turn this off before anything holds real user data you can't lose

  serverlessv2_scaling_configuration {
    min_capacity = var.min_capacity
    max_capacity = var.max_capacity
  }
}

resource "aws_rds_cluster_instance" "this" {
  cluster_identifier = aws_rds_cluster.this.id
  instance_class     = "db.serverless"
  engine             = aws_rds_cluster.this.engine
  engine_version     = aws_rds_cluster.this.engine_version
}

resource "aws_secretsmanager_secret" "database_url" {
  name                    = "${var.name_prefix}/database-url"
  recovery_window_in_days = 0 # v1 showcase — delete immediately so a re-apply can reuse the name
}

resource "aws_secretsmanager_secret_version" "database_url" {
  secret_id     = aws_secretsmanager_secret.database_url.id
  secret_string = "postgresql://${var.master_username}:${random_password.master.result}@${aws_rds_cluster.this.endpoint}:5432/${var.db_name}"
}
