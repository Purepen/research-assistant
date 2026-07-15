variable "name_prefix" {
  type = string
}

variable "vpc_id" {
  type = string
}

variable "private_subnet_ids" {
  type = list(string)
}

variable "db_name" {
  type    = string
  default = "research_assistant"
}

variable "master_username" {
  type    = string
  default = "app_admin"
}

variable "min_capacity" {
  type        = number
  default     = 0.5
  description = "Aurora Serverless v2 min ACU. 0.5 is the safe, well-supported floor for a first deploy — true 0-ACU auto-pause can be explored later."
}

variable "max_capacity" {
  type    = number
  default = 2
}
