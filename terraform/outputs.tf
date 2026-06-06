output "public_ip" {
  value = azurerm_public_ip.sports.ip_address
}

output "website_url" {
  value = "http://${azurerm_public_ip.sports.ip_address}"
}

output "ssh_command" {
  value = "ssh ${var.admin_username}@${azurerm_public_ip.sports.ip_address}"
}

output "resource_group" {
  value = azurerm_resource_group.sports.name
}