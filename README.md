# Meal Planner

Meal Planner is a full-stack FastAPI and React app for meal planning, recipes, shopping, pantry tracking, nutrition logging, and Strava-backed training summaries.

## Local Development

Backend dependencies are managed with `uv`.

```bash
cd backend
uv sync
uv run uvicorn app.main:app --reload --host 0.0.0.0 --port 8000
```

Frontend dependencies are managed with npm.

```bash
cd frontend
npm install
npm run dev -- --host
```

The frontend runs at `http://localhost:5173`. The API runs at `http://localhost:8000`.

## Runtime Configuration

Backend environment variables:

| Variable | Required | Purpose |
| --- | --- | --- |
| `REPO_TYPE` | Deployed | `sqlite` locally by default, `firestore` in GCP. |
| `ALLOWED_DOMAIN` | Deployed | Restricts Firebase-authenticated users to this email domain. Empty disables auth. |
| `API_KEY` | Deployed | Shared secret for machine/API access through `X-API-Key`. |
| `FIT_FILES_BUCKET` | Deployed for FIT uploads | GCS bucket for uploaded `.fit` files. Local dev falls back to `backend/data/fit_files` if unset. |
| `STRAVA_CLIENT_ID` | Strava sync | Strava OAuth client ID. |
| `STRAVA_CLIENT_SECRET` | Strava sync | Strava OAuth client secret. |

Frontend build args:

| Build arg | Purpose |
| --- | --- |
| `VITE_FIREBASE_API_KEY` | Firebase Web App API key for browser auth. |
| `VITE_FIREBASE_AUTH_DOMAIN` | Firebase auth domain, currently `npzr-2010.firebaseapp.com`. |
| `VITE_FIREBASE_PROJECT_ID` | Firebase/GCP project ID. |

## GitHub Secrets and Variables

The deploy workflow submits `cloudbuild.yaml` and injects runtime config via Cloud Build substitutions.

Required GitHub Actions secrets:

| Secret | Purpose |
| --- | --- |
| `GCP_PROJECT_ID` | Dedicated Meal Planner GCP/Firebase project ID: `tartties-meals`. |
| `GCP_SA_KEY` | Service account JSON used by `google-github-actions/auth`. |
| `FIREBASE_API_KEY` | Firebase Web App API key compiled into the frontend. |
| `API_KEY` | Machine/API access key for deployed API calls. |
| `STRAVA_CLIENT_ID` | Strava OAuth app client ID. |
| `STRAVA_CLIENT_SECRET` | Strava OAuth app client secret. |

Optional GitHub Actions variable:

| Variable | Default | Purpose |
| --- | --- | --- |
| `FIREBASE_AUTH_DOMAIN` | `tartties-meals.firebaseapp.com` | Firebase auth domain compiled into the frontend. |
| `IMAGE_REPOSITORY` | `europe-west1-docker.pkg.dev/tartties-meals/meal-planner` | Artifact Registry Docker repository used by Cloud Build. |
| `FIT_FILES_BUCKET` | `tartties-meals-shopping-fit-files` | GCS bucket used for uploaded FIT files. |
| `CLOUDBUILD_SOURCE_BUCKET` | `tartties-meals-cloudbuild-source` | GCS bucket where GitHub uploads Cloud Build source bundles. |

## Strava Setup

Create a Strava API application and set its callback domain to the deployed Meal Planner domain.

The callback endpoint is:

```text
https://<meal-planner-host>/api/fitness/strava/callback
```

For the current Cloud Run URL, use:

```text
https://meal-planner-562863312675.europe-west1.run.app/api/fitness/strava/callback
```

If a custom domain such as `meal-planner.saskcowgames.com` is added later, update the Strava app settings and use:

```text
https://meal-planner.saskcowgames.com/api/fitness/strava/callback
```

Strava does not expose original FIT-file download through its documented OAuth API. The app syncs activity data automatically and provides an activity deep link plus a manual `.fit` upload control. In production, uploaded FIT files are written to GCS.

## GCP Infrastructure

Meal Planner should use a dedicated GCP/Firebase project. Infrastructure for that project is managed from:

```text
infra/
```

Terraform owns durable infrastructure, not frequently changing runtime config.

For Meal Planner FIT uploads, Terraform should provide:

- Private GCS bucket, default name `tartties-meals-shopping-fit-files`.
- Private GCS bucket for Cloud Build source bundles, default name `tartties-meals-cloudbuild-source`.
- Artifact Registry Docker repository, default path `europe-west1-docker.pkg.dev/tartties-meals/meal-planner`.
- IAM binding allowing the Cloud Run runtime service account to write objects.
- IAM binding allowing GitHub Actions to upload source bundles and submit Cloud Build jobs.

Runtime config such as Strava OAuth credentials is supplied by the GitHub deploy workflow into Cloud Build, not by Terraform.

Terraform state is stored in a GCS bucket using the backend setup documented in `infra/README.md`.

## Deployment

Deploys run from `.github/workflows/deploy.yml` on pushes to `main`.

The workflow:

1. Runs backend import checks.
2. Runs frontend TypeScript checks.
3. Authenticates to GCP.
4. Submits `cloudbuild.yaml`.
5. Cloud Build builds the combined frontend/backend Docker image and deploys Cloud Run.

Cloud Build substitutions used by deployment:

| Substitution | Source |
| --- | --- |
| `_REGION` | Workflow env `GCP_REGION`. |
| `_FIREBASE_API_KEY` | GitHub secret `FIREBASE_API_KEY`. |
| `_FIREBASE_AUTH_DOMAIN` | GitHub variable `FIREBASE_AUTH_DOMAIN`. |
| `_API_KEY` | GitHub secret `API_KEY`. |
| `_FIT_FILES_BUCKET` | GitHub variable `FIT_FILES_BUCKET`. |
| `_STRAVA_CLIENT_ID` | GitHub secret `STRAVA_CLIENT_ID`. |
| `_STRAVA_CLIENT_SECRET` | GitHub secret `STRAVA_CLIENT_SECRET`. |
