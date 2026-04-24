# Meal Planner Infrastructure

This Terraform root is for the dedicated Meal Planner GCP/Firebase project.

The GCP project itself is created manually first. Terraform then owns the durable project infrastructure:

- required Google APIs
- Firebase project enablement
- Firebase Web App registration
- Firestore native database
- Artifact Registry Docker repository for app images
- private GCS bucket for uploaded Strava `.fit` files
- private GCS bucket for Cloud Build source bundles uploaded by GitHub Actions
- service account and IAM for GitHub Actions deploys
- dedicated service account and IAM for Cloud Build deployments
- Cloud Build and Cloud Run deploy permissions
- runtime service account access to Firestore and the FIT bucket

Runtime configuration such as Strava OAuth secrets, API keys, and app-specific env vars is injected by the GitHub deploy workflow into Cloud Build. It is not stored in Terraform.

## Remote State

Terraform state is stored in a GCS bucket. The state bucket has to exist before `terraform init`, so bootstrap it once after creating the project:

```bash
cd infra
./bootstrap-state-bucket.sh tartties-meals EU
```

That writes `backend.hcl`. Then initialise Terraform with:

```bash
terraform init -backend-config=backend.hcl
```

Do not commit `backend.hcl`; it is project-specific.

## Configure

```bash
cp terraform.tfvars.example terraform.tfvars
```

Set:

```hcl
project_id = "tartties-meals"
```

Terraform is intended to be run manually from a dev machine. The GitHub Actions service account created here is for application deployment only; GitHub does not run Terraform in this setup.

The GitHub Actions service account is deliberately narrow:

- it can submit Cloud Build jobs
- it can upload source bundles into the Cloud Build source bucket
- it does not have Cloud Run, Firestore, Storage Admin, or Terraform permissions

Cloud Build's own service account has the permissions needed to build the image, push it, and deploy Cloud Run.

## Apply

```bash
terraform plan
terraform apply
```

After apply, set GitHub secrets/variables from the outputs and Firebase console.

```bash
terraform output github_actions_service_account
terraform output -raw github_actions_service_account_key
terraform output fit_files_bucket
terraform output cloudbuild_source_bucket
terraform output artifact_registry_repository
```

## GitHub Configuration

Required GitHub secrets:

- `GCP_PROJECT_ID`: `tartties-meals`
- `GCP_SA_KEY`: `terraform output -raw github_actions_service_account_key`
- `FIREBASE_API_KEY`: from the Firebase Web App config
- `API_KEY`: your machine/API access secret
- `STRAVA_CLIENT_ID`: from the Strava API application
- `STRAVA_CLIENT_SECRET`: from the Strava API application

Recommended GitHub variables:

- `FIREBASE_AUTH_DOMAIN`: `tartties-meals.firebaseapp.com`
- `FIT_FILES_BUCKET`: `terraform output -raw fit_files_bucket`
- `CLOUDBUILD_SOURCE_BUCKET`: `terraform output -raw cloudbuild_source_bucket`
- `IMAGE_REPOSITORY`: `terraform output -raw artifact_registry_repository`
