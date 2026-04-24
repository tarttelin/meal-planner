output "project_id" {
  description = "Meal Planner GCP/Firebase project ID."
  value       = var.project_id
}

output "firebase_web_app_id" {
  description = "Firebase Web App ID for Meal Planner."
  value       = google_firebase_web_app.meal_planner.app_id
}

output "fit_files_bucket" {
  description = "GCS bucket for uploaded FIT files."
  value       = google_storage_bucket.fit_files.name
}

output "cloudbuild_source_bucket" {
  description = "GCS bucket where GitHub uploads Cloud Build source bundles."
  value       = google_storage_bucket.cloudbuild_source.name
}

output "artifact_registry_repository" {
  description = "Artifact Registry Docker repository for Meal Planner images."
  value       = "${google_artifact_registry_repository.docker.location}-docker.pkg.dev/${var.project_id}/${google_artifact_registry_repository.docker.repository_id}"
}

output "github_actions_service_account" {
  description = "Service account used by GitHub Actions."
  value       = google_service_account.github_actions.email
}

output "github_actions_service_account_key" {
  description = "Base64 service account key for GitHub secret GCP_SA_KEY, if enabled."
  value       = var.use_service_account_key ? google_service_account_key.github_actions[0].private_key : null
  sensitive   = true
}

output "cloud_build_service_account" {
  description = "Cloud Build service account granted deploy permissions."
  value       = local.cloud_build_service_account
}

output "runtime_service_account" {
  description = "Default Cloud Run runtime service account granted Firestore and FIT bucket access."
  value       = local.runtime_service_account
}
