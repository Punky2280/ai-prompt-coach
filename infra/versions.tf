terraform {
  required_version = ">= 1.9.3"
  required_providers {
    google = {
      source  = "hashicorp/google"
      version = "~> 5.33.0"
    }
  }
}
