output "alb_dns_name" {
  value = aws_lb.this.dns_name
}

output "url" {
  value = "http://${aws_lb.this.dns_name}"
}

output "task_security_group_id" {
  value = aws_security_group.task.id
}
