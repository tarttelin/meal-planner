terraform {
  required_version = ">= 1.6.0"

  backend "gcs" {
    prefix = "meal-planner/terraform/state"
  }

  required_providers {
    google = {
      source  = "hashicorp/google"
      version = "~> 6.0"
    }
    google-beta = {
      source  = "hashicorp/google-beta"
      version = "~> 6.0"
    }
  }
}
