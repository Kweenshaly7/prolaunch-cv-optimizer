variable "environment" {
  description = "The deployment environment (e.g., staging, prod)"
  type        = string
}

variable "project_name" {
  description = "The name of the project"
  type        = string
  default     = "prolaunch-cv-optimizer"
}

variable "aws_region" {
  description = "AWS region for all resources"
  type        = string
  default     = "us-east-1"
}
