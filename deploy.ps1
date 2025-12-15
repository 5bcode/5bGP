# Deploy Script for Flip to 5B
# Run this in PowerShell

$ErrorActionPreference = "Stop"

Write-Host "Checking for gcloud CLI..." -ForegroundColor Cyan
if (!(Get-Command gcloud -ErrorAction SilentlyContinue)) {
    Write-Error "gcloud CLI is not installed. Please install the Google Cloud SDK first: https://cloud.google.com/sdk/docs/install"
}

# 1. Login check
Write-Host "Verifying authentication..." -ForegroundColor Cyan
$account = gcloud config get-value account 2>$null
if (-not $account) {
    Write-Host "Please login to Google Cloud:" -ForegroundColor Yellow
    gcloud auth login
}

# 2. Project Setup
$projectId = gcloud config get-value project 2>$null
if (-not $projectId) {
    $projectId = Read-Host "Enter your Google Cloud Project ID"
    gcloud config set project $projectId
}
Write-Host "Deploying to Project: $projectId" -ForegroundColor Green

# 3. Enable Services
Write-Host "Enabling Cloud Run and Cloud Build APIs (this may take a moment)..." -ForegroundColor Cyan
gcloud services enable run.googleapis.com cloudbuild.googleapis.com

# 4. Deploy
Write-Host "Building and Deploying to Cloud Run..." -ForegroundColor Cyan
# We deploy from the current directory (Root) using the Dockerfile we created
gcloud run deploy flip-to-5b `
    --source . `
    --platform managed `
    --region us-central1 `
    --timeout 300 `
    --allow-unauthenticated `
    --set-env-vars "GCP_PROJECT_ID=$projectId"

Write-Host "Deployment Complete!" -ForegroundColor Green
