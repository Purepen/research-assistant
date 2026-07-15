# Reusable ECS Fargate service + its own ALB. Used twice (backend, frontend)
# — see infra/README.md for why two ALBs instead of one shared with routing
# rules: simpler to reason about for a v1, at the cost of a second ALB's
# ~$16-20/mo. Consolidate later if that matters more than simplicity.

data "aws_region" "current" {}

# ── Security groups ───────────────────────────────────────────────────────────

resource "aws_security_group" "alb" {
  name_prefix = "${var.name_prefix}-${var.service_name}-alb-"
  vpc_id      = var.vpc_id

  ingress {
    from_port   = 80
    to_port     = 80
    protocol    = "tcp"
    cidr_blocks = ["0.0.0.0/0"]
  }
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

resource "aws_security_group" "task" {
  name_prefix = "${var.name_prefix}-${var.service_name}-task-"
  vpc_id      = var.vpc_id

  ingress {
    from_port       = var.container_port
    to_port         = var.container_port
    protocol        = "tcp"
    security_groups = [aws_security_group.alb.id]
  }
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

# ── ALB ────────────────────────────────────────────────────────────────────────

resource "aws_lb" "this" {
  name               = "${var.name_prefix}-${var.service_name}"
  internal           = false
  load_balancer_type = "application"
  security_groups    = [aws_security_group.alb.id]
  subnets            = var.public_subnet_ids
}

resource "aws_lb_target_group" "this" {
  name        = "${var.name_prefix}-${var.service_name}"
  port        = var.container_port
  protocol    = "HTTP"
  vpc_id      = var.vpc_id
  target_type = "ip"

  health_check {
    path                = var.health_check_path
    healthy_threshold   = 2
    unhealthy_threshold = 3
    interval            = 30
    timeout             = 10
    matcher             = "200-399"
  }
}

resource "aws_lb_listener" "http" {
  load_balancer_arn = aws_lb.this.arn
  port              = 80
  protocol          = "HTTP"

  default_action {
    type             = "forward"
    target_group_arn = aws_lb_target_group.this.arn
  }
}

# ── IAM ────────────────────────────────────────────────────────────────────────

data "aws_iam_policy_document" "assume_ecs_task" {
  statement {
    actions = ["sts:AssumeRole"]
    principals {
      type        = "Service"
      identifiers = ["ecs-tasks.amazonaws.com"]
    }
  }
}

resource "aws_iam_role" "execution" {
  name               = "${var.name_prefix}-${var.service_name}-exec"
  assume_role_policy = data.aws_iam_policy_document.assume_ecs_task.json
}

resource "aws_iam_role_policy_attachment" "execution_managed" {
  role       = aws_iam_role.execution.name
  policy_arn = "arn:aws:iam::aws:policy/service-role/AmazonECSTaskExecutionRolePolicy"
}

# Execution role also needs to read the Secrets Manager secrets referenced
# in the task definition's `secrets` block (pulling ECR images is covered by
# the managed policy above).
data "aws_iam_policy_document" "execution_secrets" {
  count = length(var.secrets) > 0 ? 1 : 0
  statement {
    actions   = ["secretsmanager:GetSecretValue"]
    resources = values(var.secrets)
  }
}

resource "aws_iam_role_policy" "execution_secrets" {
  count  = length(var.secrets) > 0 ? 1 : 0
  name   = "read-secrets"
  role   = aws_iam_role.execution.id
  policy = data.aws_iam_policy_document.execution_secrets[0].json
}

resource "aws_iam_role" "task" {
  name               = "${var.name_prefix}-${var.service_name}-task"
  assume_role_policy = data.aws_iam_policy_document.assume_ecs_task.json
}

resource "aws_iam_role_policy" "task_extra" {
  count  = var.task_role_policy_json != null ? 1 : 0
  name   = "app-permissions"
  role   = aws_iam_role.task.id
  policy = var.task_role_policy_json
}

# ── Logs ───────────────────────────────────────────────────────────────────────

resource "aws_cloudwatch_log_group" "this" {
  name              = "/ecs/${var.name_prefix}-${var.service_name}"
  retention_in_days = var.log_retention_days
}

# ── Task definition + service ─────────────────────────────────────────────────

resource "aws_ecs_task_definition" "this" {
  family                   = "${var.name_prefix}-${var.service_name}"
  requires_compatibilities = ["FARGATE"]
  network_mode             = "awsvpc"
  cpu                      = var.cpu
  memory                   = var.memory
  execution_role_arn       = aws_iam_role.execution.arn
  task_role_arn            = aws_iam_role.task.arn

  container_definitions = jsonencode([
    {
      name      = var.service_name
      image     = var.image_url
      essential = true
      portMappings = [{
        containerPort = var.container_port
        protocol      = "tcp"
      }]
      environment = [for k, v in var.environment : { name = k, value = v }]
      secrets     = [for k, arn in var.secrets : { name = k, valueFrom = arn }]
      logConfiguration = {
        logDriver = "awslogs"
        options = {
          "awslogs-group"         = aws_cloudwatch_log_group.this.name
          "awslogs-region"        = data.aws_region.current.name
          "awslogs-stream-prefix" = var.service_name
        }
      }
    }
  ])
}

resource "aws_ecs_service" "this" {
  name                              = "${var.name_prefix}-${var.service_name}"
  cluster                           = var.ecs_cluster_id
  task_definition                   = aws_ecs_task_definition.this.arn
  desired_count                     = var.desired_count
  launch_type                       = "FARGATE"
  health_check_grace_period_seconds = var.health_check_grace_period_seconds

  network_configuration {
    subnets          = var.private_subnet_ids
    security_groups  = [aws_security_group.task.id]
    assign_public_ip = false
  }

  load_balancer {
    target_group_arn = aws_lb_target_group.this.arn
    container_name   = var.service_name
    container_port   = var.container_port
  }

  depends_on = [aws_lb_listener.http]
}
