variable "name_prefix" {
  type        = string
  description = "Prefix for resource names, e.g. \"research-assistant-prod\""
}

variable "vpc_cidr" {
  type    = string
  default = "10.20.0.0/16"
}

variable "azs" {
  type        = list(string)
  description = "Two availability zones to spread subnets across"
}
