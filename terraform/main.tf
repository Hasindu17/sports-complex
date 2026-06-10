# ══════════════════════════════════════════════
# Apex Sports Complex — Azure Infrastructure
# Managed by Terraform
# ══════════════════════════════════════════════

terraform {
  required_version = ">= 1.0"
  required_providers {
    azurerm = {
      source  = "hashicorp/azurerm"
      version = "~> 3.0"
    }
  }
}

provider "azurerm" {
  features {}
}

# ── RESOURCE 1: Resource Group ───────────────
# Container for ALL resources
# Delete this → deletes everything inside
resource "azurerm_resource_group" "sports" {
  name     = "${var.project_name}-rg"
  location = var.location

  tags = {
    Project     = var.project_name
    Environment = var.environment
    ManagedBy   = "terraform"
  }
}

# ── RESOURCE 2: Virtual Network ───────────────
# Private network — your servers live here
# Internet cannot reach servers directly
resource "azurerm_virtual_network" "sports" {
  name                = "${var.project_name}-vnet"
  address_space       = ["10.0.0.0/16"]
  location            = azurerm_resource_group.sports.location
  resource_group_name = azurerm_resource_group.sports.name

  tags = { ManagedBy = "terraform" }
}

# ── RESOURCE 3: Subnet ────────────────────────
# Smaller network inside VNet
# 10.0.1.0/24 = 254 available IPs
# Your VM gets one IP from this range
resource "azurerm_subnet" "sports" {
  name                 = "${var.project_name}-subnet"
  resource_group_name  = azurerm_resource_group.sports.name
  virtual_network_name = azurerm_virtual_network.sports.name
  address_prefixes     = ["10.0.1.0/24"]
}

# ── RESOURCE 4: Public IP ─────────────────────
# ⭐ UPDATED: Added zones = ["2"]
# Required because our VM is in zone 2
# Standard SKU Public IP must match VM zone
# Without this → Azure rejects the VM creation
resource "azurerm_public_ip" "sports" {
  name                = "${var.project_name}-pip"
  location            = azurerm_resource_group.sports.location
  resource_group_name = azurerm_resource_group.sports.name
  allocation_method   = "Static"
  sku                 = "Standard"
  zones               = ["2"]

  tags = { ManagedBy = "terraform" }
}

# ── RESOURCE 5: Network Security Group ────────
# Firewall rules — only open ports we need
# Port 22  = SSH  (manage server remotely)
# Port 80  = HTTP (your website)
# Port 443 = HTTPS (secure website)
# Everything else = BLOCKED automatically
resource "azurerm_network_security_group" "sports" {
  name                = "${var.project_name}-nsg"
  location            = azurerm_resource_group.sports.location
  resource_group_name = azurerm_resource_group.sports.name

  security_rule {
    name                       = "allow-ssh"
    priority                   = 100
    direction                  = "Inbound"
    access                     = "Allow"
    protocol                   = "Tcp"
    source_port_range          = "*"
    destination_port_range     = "22"
    source_address_prefix      = "*"
    destination_address_prefix = "*"
  }

  security_rule {
    name                       = "allow-http"
    priority                   = 110
    direction                  = "Inbound"
    access                     = "Allow"
    protocol                   = "Tcp"
    source_port_range          = "*"
    destination_port_range     = "80"
    source_address_prefix      = "*"
    destination_address_prefix = "*"
  }

  security_rule {
    name                       = "allow-https"
    priority                   = 120
    direction                  = "Inbound"
    access                     = "Allow"
    protocol                   = "Tcp"
    source_port_range          = "*"
    destination_port_range     = "443"
    source_address_prefix      = "*"
    destination_address_prefix = "*"
  }

  tags = { ManagedBy = "terraform" }
}

# ── RESOURCE 6: Network Interface ─────────────
# Virtual network card for the VM
# Connects: VM → Subnet → Public IP
resource "azurerm_network_interface" "sports" {
  name                = "${var.project_name}-nic"
  location            = azurerm_resource_group.sports.location
  resource_group_name = azurerm_resource_group.sports.name

  ip_configuration {
    name                          = "internal"
    subnet_id                     = azurerm_subnet.sports.id
    private_ip_address_allocation = "Dynamic"
    public_ip_address_id          = azurerm_public_ip.sports.id
  }

  tags = { ManagedBy = "terraform" }
}

# Connect NSG firewall to the network card
resource "azurerm_network_interface_security_group_association" "sports" {
  network_interface_id      = azurerm_network_interface.sports.id
  network_security_group_id = azurerm_network_security_group.sports.id
}

# ── RESOURCE 7: Linux Virtual Machine ─────────
# Your actual server in Azure!
#
# ⭐ UPDATED 1: size = "Standard_DC2s_v3"
#    Changed from Standard_B1s (not available)
#    DC2s_v3 = 2 CPU, 8GB RAM
#    Available in zone 2 of eastus2 ✅
#
# ⭐ UPDATED 2: zone = "2"
#    Pins VM to Availability Zone 2
#    Zone = separate physical datacenter
#    Required for DC2s_v3 in eastus2
#
# custom_data = startup script (runs once on boot)
#    Installs Docker + runs your sports complex!
resource "azurerm_linux_virtual_machine" "sports" {
  name                  = "${var.project_name}-vm"
  location              = azurerm_resource_group.sports.location
  resource_group_name   = azurerm_resource_group.sports.name
  size                  = "Standard_DC2s_v3"
  zone                  = "2"
  admin_username        = var.admin_username
  network_interface_ids = [azurerm_network_interface.sports.id]

  # RSA key — Azure requires RSA (not ed25519)
  admin_ssh_key {
    username   = var.admin_username
    public_key = var.ssh_public_key != "" ? var.ssh_public_key : file(var.ssh_public_key_path)
  }

  os_disk {
    caching              = "ReadWrite"
    storage_account_type = "Standard_LRS"
  }

  # Ubuntu 22.04 LTS — industry standard server OS
  source_image_reference {
    publisher = "Canonical"
    offer     = "0001-com-ubuntu-server-jammy"
    sku       = "22_04-lts-gen2"
    version   = "latest"
  }

  # Startup script — runs automatically when VM boots!
  # Installs Docker + Docker Compose, and deploys the full app stack
  custom_data = base64encode(<<-EOF
    #!/bin/bash
    # Update and install dependencies
    apt-get update -y
    apt-get install -y docker.io docker-compose
    systemctl enable docker
    systemctl start docker

    # Prepare application stack
    mkdir -p /opt/sports-complex
    cd /opt/sports-complex

    # Write docker-compose.yml
    cat <<'COMPOSE' > docker-compose.yml
    version: '3.8'
    services:
      db:
        image: postgres:17
        container_name: sports-complex-db
        restart: unless-stopped
        environment:
          POSTGRES_DB:       sports_complex
          POSTGRES_USER:     sports_user
          POSTGRES_PASSWORD: sports_pass
        volumes:
          - postgres_data:/var/lib/postgresql/data
        healthcheck:
          test: ["CMD-SHELL", "pg_isready -U sports_user -d sports_complex"]
          interval: 10s
          timeout: 5s
          retries: 5

      api:
        image: hasindu2001/sports-complex-api:latest
        container_name: sports-complex-api
        restart: unless-stopped
        environment:
          DATABASE_URL: postgresql://sports_user:sports_pass@db:5432/sports_complex
        depends_on:
          db:
            condition: service_healthy

      web:
        image: hasindu2001/sports-complex:latest
        container_name: apex-sports-complex
        restart: unless-stopped
        ports:
          - "80:80"
        depends_on:
          - api

    volumes:
      postgres_data:
        driver: local
    COMPOSE

    # Run docker-compose
    docker-compose up -d
    echo "Done!" > /tmp/setup-complete.txt
  EOF
  )

  tags = {
    Project   = var.project_name
    ManagedBy = "terraform"
  }
}

