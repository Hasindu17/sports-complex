variable "project_name" {
  description = "Name prefix for all resources"
  type        = string
  default     = "sports-complex"
}

variable "location" {
  description = "Azure region"
  type        = string
  default     = "eastus2"
}

variable "environment" {
  description = "dev or prod"
  type        = string
  default     = "dev"
}

variable "admin_username" {
  description = "VM admin username"
  type        = string
  default     = "azureuser"
}