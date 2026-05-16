terraform {
  required_providers {
    google = {
      source  = "hashicorp/google"
      version = "~> 5.0"
    }
    random = {
      source  = "hashicorp/random"
      version = "~> 3.6.0"
    }
  }

  # WSPÓŁDZIELONY PLIK STANU (Zmieńcie nazwę bucketu na swoją!)
  backend "gcs" {
    bucket = "tricoach-terraform" 
    prefix = "terraform/state"
  }
}

variable "project_id" {
  description = "GCP Project ID"
  type        = string
}

variable "region" {
  description = "Deployment Region"
  default     = "europe-central2" # Warsaw
}

variable "prefix" {
  default = "tricoach"
}

provider "google" {
  project = var.project_id
  region  = var.region
}

resource "random_string" "suffix" {
  length  = 4
  special = false
  upper   = false
}

resource "random_password" "sql_password" {
  length           = 16
  special          = true
  override_special = "!#$%&*-_=+"
}

# 1. Cloud SQL (PostgreSQL Database)
resource "google_sql_database_instance" "sql_instance" {
  name             = "${var.prefix}-sql-${random_string.suffix.result}"
  database_version = "POSTGRES_15"
  region           = var.region

  settings {
    tier = "db-f1-micro"
  }
  deletion_protection = false
}

resource "google_sql_database" "database" {
  name     = "${var.prefix}-db"
  instance = google_sql_database_instance.sql_instance.name
}

resource "google_sql_user" "users" {
  name     = "tricoachadmin"
  instance = google_sql_database_instance.sql_instance.name
  password = random_password.sql_password.result
}

# 2. Firestore (NoSQL for Social features)
resource "google_firestore_database" "database" {
  project     = var.project_id
  name        = "(default)"
  location_id = var.region
  type        = "FIRESTORE_NATIVE"
}

# 3. Cloud Storage (Profile pictures)
resource "google_storage_bucket" "profiles_bucket" {
  name          = "${var.prefix}-profiles-${random_string.suffix.result}"
  location      = var.region
  force_destroy = true
}

# 4. Pub/Sub (Event messaging)
resource "google_pubsub_topic" "training_events" {
  name = "training-events"
}

# 5. Secret Manager (Storing SQL Password)
resource "google_secret_manager_secret" "sql_secret" {
  secret_id = "sql-admin-password"
  replication {
    auto {}
  }
}

resource "google_secret_manager_secret_version" "sql_secret_data" {
  secret      = google_secret_manager_secret.sql_secret.id
  secret_data = random_password.sql_password.result
}

# 6. Artifact Registry (Docker images)
resource "google_artifact_registry_repository" "acr" {
  location      = var.region
  repository_id = "${var.prefix}-repo"
  description   = "Docker repository for TriCoach microservices"
  format        = "DOCKER"
}

# 7. Cloud Run (Microservices Compute Layer)
locals {
  microservices = {
    "gateway"   = { port = 3000 }
    "user"      = { port = 3001 }
    "training"  = { port = 3002 }
    "analytics" = { port = 3003 }
    "social"    = { port = 3004 }
    "race"      = { port = 3005 }
  }
}

resource "google_cloud_run_v2_service" "microservices" {
  for_each = local.microservices

  name     = "${var.prefix}-${each.key}"
  location = var.region

  template {
    containers {
      image = "us-docker.pkg.dev/cloudrun/container/hello"
      ports {
        container_port = each.value.port
      }
    }
  }
}

# Allow public access for testing purposes
resource "google_cloud_run_service_iam_member" "public_access" {
  for_each = local.microservices

  location = google_cloud_run_v2_service.microservices[each.key].location
  project  = google_cloud_run_v2_service.microservices[each.key].project
  service  = google_cloud_run_v2_service.microservices[each.key].name
  role     = "roles/run.invoker"
  member   = "allUsers"
}

# Outputs
output "sql_instance_connection_name" {
  value = google_sql_database_instance.sql_instance.connection_name
}

output "artifact_registry_url" {
  value = "${var.region}-docker.pkg.dev/${var.project_id}/${google_artifact_registry_repository.acr.name}"
}

output "microservice_urls" {
  value = {
    for k, v in google_cloud_run_v2_service.microservices : k => v.uri
  }
}