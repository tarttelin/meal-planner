#!/usr/bin/env bash
set -euo pipefail

PROJECT_ID="${1:?Usage: ./bootstrap-state-bucket.sh PROJECT_ID [LOCATION]}"
LOCATION="${2:-EU}"
BUCKET="${PROJECT_ID}-tfstate"

gcloud services enable storage.googleapis.com --project="${PROJECT_ID}"
gcloud storage buckets create "gs://${BUCKET}" \
  --project="${PROJECT_ID}" \
  --location="${LOCATION}" \
  --uniform-bucket-level-access
gcloud storage buckets update "gs://${BUCKET}" --versioning

cat > backend.hcl <<EOF
bucket = "${BUCKET}"
prefix = "meal-planner/terraform/state"
EOF

echo "Created gs://${BUCKET} and wrote backend.hcl"
