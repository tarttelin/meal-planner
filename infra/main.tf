provider "google" {
  project = var.project_id
  region  = var.region
}

provider "google-beta" {
  project = var.project_id
  region  = var.region
}

locals {
  fit_files_bucket_name          = var.fit_files_bucket_name != "" ? var.fit_files_bucket_name : "${var.project_id}-shopping-fit-files"
  cloudbuild_source_bucket_name  = var.cloudbuild_source_bucket_name != "" ? var.cloudbuild_source_bucket_name : "${var.project_id}-cloudbuild-source"
  cloud_build_service_account    = google_service_account.cloud_build.email
  runtime_service_account        = "${data.google_project.project.number}-compute@developer.gserviceaccount.com"
  github_actions_service_account = google_service_account.github_actions.email
}

data "google_project" "project" {
  project_id = var.project_id
}

resource "google_project_service" "required_apis" {
  for_each = toset([
    "artifactregistry.googleapis.com",
    "cloudbuild.googleapis.com",
    "cloudresourcemanager.googleapis.com",
    "containerregistry.googleapis.com",
    "firebase.googleapis.com",
    "firestore.googleapis.com",
    "iam.googleapis.com",
    "identitytoolkit.googleapis.com",
    "run.googleapis.com",
    "serviceusage.googleapis.com",
    "storage.googleapis.com",
  ])

  project                    = var.project_id
  service                    = each.value
  disable_dependent_services = false
  disable_on_destroy         = false
}

resource "google_firebase_project" "default" {
  provider = google-beta
  project  = var.project_id

  depends_on = [google_project_service.required_apis]
}

resource "google_firebase_web_app" "meal_planner" {
  provider     = google-beta
  project      = var.project_id
  display_name = "Meal Planner"

  depends_on = [google_firebase_project.default]
}

resource "google_firestore_database" "default" {
  project     = var.project_id
  name        = "(default)"
  location_id = var.firestore_location
  type        = "FIRESTORE_NATIVE"

  depends_on = [google_project_service.required_apis]
}

resource "google_storage_bucket" "fit_files" {
  name                        = local.fit_files_bucket_name
  location                    = var.storage_location
  uniform_bucket_level_access = true
  force_destroy               = false
  public_access_prevention    = "enforced"

  versioning {
    enabled = true
  }

  lifecycle_rule {
    condition {
      age = 365
    }
    action {
      type          = "SetStorageClass"
      storage_class = "NEARLINE"
    }
  }

  depends_on = [google_project_service.required_apis]
}

resource "google_storage_bucket" "cloudbuild_source" {
  name                        = local.cloudbuild_source_bucket_name
  location                    = var.storage_location
  uniform_bucket_level_access = true
  force_destroy               = false
  public_access_prevention    = "enforced"

  lifecycle_rule {
    condition {
      age = 14
    }
    action {
      type = "Delete"
    }
  }

  depends_on = [google_project_service.required_apis]
}

resource "google_service_account" "github_actions" {
  project      = var.project_id
  account_id   = "meal-planner-github-actions"
  display_name = "Meal Planner GitHub Actions"
  description  = "Deploys Meal Planner through Cloud Build."

  depends_on = [google_project_service.required_apis]
}

resource "google_service_account" "cloud_build" {
  project      = var.project_id
  account_id   = "meal-planner-cloud-build"
  display_name = "Meal Planner Cloud Build"
  description  = "Builds and deploys Meal Planner from Cloud Build."

  depends_on = [google_project_service.required_apis]
}

resource "google_project_iam_member" "github_actions_roles" {
  for_each = toset([
    "roles/cloudbuild.builds.editor",
    "roles/serviceusage.serviceUsageConsumer",
  ])

  project = var.project_id
  role    = each.value
  member  = "serviceAccount:${local.github_actions_service_account}"
}

resource "google_storage_bucket_iam_member" "github_actions_source_upload" {
  bucket = google_storage_bucket.cloudbuild_source.name
  role   = "roles/storage.objectCreator"
  member = "serviceAccount:${local.github_actions_service_account}"
}

resource "google_storage_bucket_iam_member" "github_actions_source_read" {
  bucket = google_storage_bucket.cloudbuild_source.name
  role   = "roles/storage.legacyBucketReader"
  member = "serviceAccount:${local.github_actions_service_account}"
}

resource "google_service_account_iam_member" "github_actions_act_as_cloud_build" {
  service_account_id = google_service_account.cloud_build.name
  role               = "roles/iam.serviceAccountUser"
  member             = "serviceAccount:${local.github_actions_service_account}"
}

resource "google_service_account_key" "github_actions" {
  count              = var.use_service_account_key ? 1 : 0
  service_account_id = google_service_account.github_actions.name
  public_key_type    = "TYPE_X509_PEM_FILE"
}

resource "google_project_iam_member" "cloud_build_roles" {
  for_each = toset([
    "roles/iam.serviceAccountUser",
    "roles/artifactregistry.writer",
    "roles/logging.logWriter",
    "roles/run.admin",
    "roles/storage.admin",
  ])

  project = var.project_id
  role    = each.value
  member  = "serviceAccount:${local.cloud_build_service_account}"

  depends_on = [google_project_service.required_apis]
}

resource "google_storage_bucket_iam_member" "cloud_build_source_read" {
  bucket = google_storage_bucket.cloudbuild_source.name
  role   = "roles/storage.objectViewer"
  member = "serviceAccount:${local.cloud_build_service_account}"
}

resource "google_project_iam_member" "runtime_firestore" {
  project = var.project_id
  role    = "roles/datastore.user"
  member  = "serviceAccount:${local.runtime_service_account}"

  depends_on = [google_firestore_database.default]
}

resource "google_storage_bucket_iam_member" "runtime_fit_files" {
  bucket = google_storage_bucket.fit_files.name
  role   = "roles/storage.objectUser"
  member = "serviceAccount:${local.runtime_service_account}"
}
