############################
#  Service account
############################
resource "google_service_account" "run_exec" {
  account_id   = "cloud-run-exec"
  display_name = "Cloud Run execution SA"
  project      = var.project_id
}

resource "google_project_iam_member" "run_exec_log_writer" {
  role    = "roles/logging.logWriter"
  member  = "serviceAccount:${google_service_account.run_exec.email}"
  project = var.project_id
}

############################
#  Cloud Run service
############################
resource "google_cloud_run_v2_service" "api" {
  name     = "prompt-coach-api"
  location = var.region
  project  = var.project_id

  template {
    service_account = google_service_account.run_exec.email

    containers {
      image = "us-docker.pkg.dev/${var.project_id}/api/app:latest"

      # Environment variables
      env {
        name  = "NODE_ENV"
        value = "production"
      }
    }
  }

  traffic {
    percent = 100
    type    = "TRAFFIC_TARGET_ALLOCATION_TYPE_LATEST"
  }
}

############################
#  Outputs
############################
output "cloud_run_url" {
  description = "Public URL of the Cloud Run service"
  value       = google_cloud_run_v2_service.api.uri
}
