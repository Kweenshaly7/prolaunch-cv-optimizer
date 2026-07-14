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

variable "database_url" {
  description = "Connection string for the Supabase database"
  type        = string
  sensitive   = true
}

variable "direct_url" {
  description = "Direct connection string for the Supabase database"
  type        = string
  sensitive   = true
}

variable "clerk_publishable_key" {
  description = "Clerk Publishable Key"
  type        = string
}

variable "clerk_secret_key" {
  description = "Clerk Secret Key"
  type        = string
  sensitive   = true
}

variable "zapier_secret" {
  description = "Zapier webhook secret"
  type        = string
  sensitive   = true
}
