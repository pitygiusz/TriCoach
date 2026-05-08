terraform {
  required_providers {
    azurerm = {
      source  = "hashicorp/azurerm"
      version = "~> 3.100.0"
    }
    random = {
      source  = "hashicorp/random"
      version = "~> 3.6.0"
    }
  }
}

provider "azurerm" {
  features {
    key_vault {
      purge_soft_delete_on_destroy    = true
      recover_soft_deleted_key_vaults = true
    }
    resource_group {
      prevent_deletion_if_contains_resources = false
    }
  }
}

data "azurerm_client_config" "current" {}

variable "location" {
  default = "Central US"
}

variable "prefix" {
  default = "tricoach"
}

resource "random_string" "suffix" {
  length  = 6
  special = false
  upper   = false
}

resource "random_password" "sql_admin_password" {
  length           = 16
  special          = true
  override_special = "!#$%&*-_=+"
}

# Resource Group
resource "azurerm_resource_group" "rg" {
  name     = "${var.prefix}-rg-${random_string.suffix.result}"
  location = var.location
}

# SQL Database
resource "azurerm_mssql_server" "sql_server" {
  name                         = "${var.prefix}-sql-${random_string.suffix.result}"
  resource_group_name          = azurerm_resource_group.rg.name
  location                     = azurerm_resource_group.rg.location
  version                      = "12.0"
  administrator_login          = "tricoachadmin"
  administrator_login_password = random_password.sql_admin_password.result
}

resource "azurerm_mssql_database" "sql_db" {
  name      = "${var.prefix}-db"
  server_id = azurerm_mssql_server.sql_server.id
  sku_name  = "Basic"
}

# Cosmos DB
resource "azurerm_cosmosdb_account" "cosmos" {
  name                = "${var.prefix}-cosmos-${random_string.suffix.result}"
  location            = azurerm_resource_group.rg.location
  resource_group_name = azurerm_resource_group.rg.name
  offer_type          = "Standard"
  kind                = "GlobalDocumentDB"

  consistency_policy {
    consistency_level = "Session"
  }

  geo_location {
    location          = azurerm_resource_group.rg.location
    failover_priority = 0
  }
}

resource "azurerm_cosmosdb_sql_database" "cosmos_db" {
  name                = "${var.prefix}-social-db"
  resource_group_name = azurerm_resource_group.rg.name
  account_name        = azurerm_cosmosdb_account.cosmos.name
  throughput          = 400
}

# Service Bus
resource "azurerm_servicebus_namespace" "sb" {
  name                = "${var.prefix}-sb-${random_string.suffix.result}"
  location            = azurerm_resource_group.rg.location
  resource_group_name = azurerm_resource_group.rg.name
  sku                 = "Standard"
}

resource "azurerm_servicebus_topic" "training_events" {
  name         = "training-events"
  namespace_id = azurerm_servicebus_namespace.sb.id
}

# Blob Storage
resource "azurerm_storage_account" "storage" {
  name                     = "${var.prefix}store${random_string.suffix.result}"
  resource_group_name      = azurerm_resource_group.rg.name
  location                 = azurerm_resource_group.rg.location
  account_tier             = "Standard"
  account_replication_type = "LRS"
}

resource "azurerm_storage_container" "profiles" {
  name                  = "user-profiles"
  storage_account_name  = azurerm_storage_account.storage.name
  container_access_type = "private"
}

# Key Vault
resource "azurerm_key_vault" "kv" {
  name                        = "${var.prefix}-kv-${random_string.suffix.result}"
  location                    = azurerm_resource_group.rg.location
  resource_group_name         = azurerm_resource_group.rg.name
  tenant_id                   = data.azurerm_client_config.current.tenant_id
  sku_name                    = "standard"

  access_policy {
    tenant_id          = data.azurerm_client_config.current.tenant_id
    object_id          = data.azurerm_client_config.current.object_id
    secret_permissions = ["Get", "List", "Set", "Delete", "Purge"]
  }
}

resource "azurerm_key_vault_secret" "sql_password" {
  name         = "sql-admin-password"
  value        = random_password.sql_admin_password.result
  key_vault_id = azurerm_key_vault.kv.id
}

# Container Registry
resource "azurerm_container_registry" "acr" {
  name                = "${var.prefix}acr${random_string.suffix.result}"
  resource_group_name = azurerm_resource_group.rg.name
  location            = azurerm_resource_group.rg.location
  sku                 = "Basic"
  admin_enabled       = true
}

# Monitoring
resource "azurerm_log_analytics_workspace" "law" {
  name                = "${var.prefix}-law-${random_string.suffix.result}"
  location            = azurerm_resource_group.rg.location
  resource_group_name = azurerm_resource_group.rg.name
  sku                 = "PerGB2018"
  retention_in_days   = 30
}

resource "azurerm_application_insights" "app_insights" {
  name                = "${var.prefix}-appinsights-${random_string.suffix.result}"
  location            = azurerm_resource_group.rg.location
  resource_group_name = azurerm_resource_group.rg.name
  workspace_id        = azurerm_log_analytics_workspace.law.id
  application_type    = "web"
}

# Compute: App Service Plan & Microservices
resource "azurerm_service_plan" "asp" {
  name                = "${var.prefix}-asp"
  resource_group_name = azurerm_resource_group.rg.name
  location            = azurerm_resource_group.rg.location
  os_type             = "Linux"
  sku_name            = "B1" 
}

locals {
  microservices = {
    "gateway"   = { port = "3000" }
    "user"      = { port = "3001" }
    "training"  = { port = "3002" }
    "analytics" = { port = "3003" }
    "social"    = { port = "3004" }
    "race"      = { port = "3005" }
  }
}

resource "azurerm_linux_web_app" "microservices" {
  for_each            = local.microservices
  
  name                = "${var.prefix}-${each.key}-${random_string.suffix.result}"
  resource_group_name = azurerm_resource_group.rg.name
  location            = azurerm_service_plan.asp.location
  service_plan_id     = azurerm_service_plan.asp.id

  site_config {
    application_stack {
      docker_image_name   = "nginx:latest"
      docker_registry_url = "https://index.docker.io"
    }
  }

  app_settings = {
    "WEBSITES_PORT"                         = each.value.port
    "APPINSIGHTS_INSTRUMENTATIONKEY"        = azurerm_application_insights.app_insights.instrumentation_key
    "APPLICATIONINSIGHTS_CONNECTION_STRING" = azurerm_application_insights.app_insights.connection_string
  }
}

# Outputs
output "sql_server_fqdn" {
  value = azurerm_mssql_server.sql_server.fully_qualified_domain_name
}

output "acr_login_server" {
  value = azurerm_container_registry.acr.login_server
}

output "microservice_urls" {
  value = {
    for k, v in azurerm_linux_web_app.microservices : k => "https://${v.default_hostname}"
  }
}