variable "project_id" {
  description = "Dedicated GCP/Firebase project ID for Meal Planner."
  type        = string
}

variable "region" {
  description = "Region for Cloud Run and regional resources."
  type        = string
  default     = "europe-west1"
}

variable "storage_location" {
  description = "Location for Cloud Storage buckets."
  type        = string
  default     = "EU"
}

variable "firestore_location" {
  description = "Firestore database location."
  type        = string
  default     = "eur3"
}

variable "allowed_domain" {
  description = "Google Workspace domain allowed to access Meal Planner."
  type        = string
  default     = "tarttelin.co.uk"
}

variable "fit_files_bucket_name" {
  description = "Bucket name for uploaded FIT files. Defaults to PROJECT_ID-shopping-fit-files."
  type        = string
  default     = ""
}

variable "cloudbuild_source_bucket_name" {
  description = "Bucket name where GitHub uploads Cloud Build source bundles. Defaults to PROJECT_ID-cloudbuild-source."
  type        = string
  default     = ""
}

variable "use_service_account_key" {
  description = "Create a GitHub Actions service account key for the current deploy workflow."
  type        = bool
  default     = true
}
