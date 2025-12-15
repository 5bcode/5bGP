# Deploy Script for Flip to 5B
# Run this in PowerShell

$ErrorActionPreference = "Stop"

# Generate a random refresh secret if not provided
$refreshSecret = [System.Guid]::NewGuid().ToString()

Write-Host "======================================" -ForegroundColor Cyan
Write-Host "  Flip to 5B - Cloud Run Deployment" -ForegroundColor Cyan
Write-Host "======================================" -ForegroundColor Cyan
Write-Host ""

Write-Host "Checking for gcloud CLI..." -ForegroundColor Cyan
if (!(Get-Command gcloud -ErrorAction SilentlyContinue)) {
    Write-Error "gcloud CLI is not installed. Please install the Google Cloud SDK first: https://cloud.google.com/sdk/docs/install"
}

# 1. Login check
Write-Host "Verifying authentication..." -ForegroundColor Cyan
$account = gcloud config get-value account 2>$null
if (-not $account -or $account -eq "(unset)") {
    Write-Host "Please login to Google Cloud:" -ForegroundColor Yellow
    gcloud auth login
}

# 2. Project Setup
$projectId = gcloud config get-value project 2>$null
if (-not $projectId -or $projectId -eq "(unset)") {
    $projectId = Read-Host "Enter your Google Cloud Project ID"
    gcloud config set project $projectId
}
Write-Host "Deploying to Project: $projectId" -ForegroundColor Green

# 3. Enable Services
Write-Host "Enabling Cloud Run and Cloud Build APIs (this may take a moment)..." -ForegroundColor Cyan
gcloud services enable run.googleapis.com cloudbuild.googleapis.com

# 4. Deploy with refresh secret
Write-Host "Building and Deploying to Cloud Run..." -ForegroundColor Cyan
Write-Host "Using Refresh Secret: $refreshSecret" -ForegroundColor DarkGray

gcloud run deploy flip-to-5b `
    --source . `
    --platform managed `
    --region us-central1 `
    --timeout 300 `
    --allow-unauthenticated `
    --set-env-vars "GCP_PROJECT_ID=$projectId,REFRESH_SECRET=$refreshSecret"

Write-Host ""
Write-Host "Deployment Complete!" -ForegroundColor Green

# 5. Get Service URL
Write-Host ""
Write-Host "Fetching service URL..." -ForegroundColor Cyan
$serviceUrl = gcloud run services describe flip-to-5b --region us-central1 --format "value(status.url)" 2>$null

if ($serviceUrl) {
    Write-Host ""
    Write-Host "======================================" -ForegroundColor Green
    Write-Host "  END-TO-END DEPLOYMENT TESTING" -ForegroundColor Green
    Write-Host "======================================" -ForegroundColor Green
    Write-Host ""
    Write-Host "Service URL: $serviceUrl" -ForegroundColor Yellow
    Write-Host ""
    
    # Test 1: Health Check (Root endpoint)
    Write-Host "Test 1: Health Check (GET /)..." -ForegroundColor Cyan
    try {
        $response = Invoke-WebRequest -Uri $serviceUrl -Method GET -TimeoutSec 30 -UseBasicParsing
        if ($response.StatusCode -eq 200) {
            Write-Host "  [PASS] Root endpoint returns 200 OK" -ForegroundColor Green
        }
        else {
            Write-Host "  [WARN] Root endpoint returned status: $($response.StatusCode)" -ForegroundColor Yellow
        }
    }
    catch {
        Write-Host "  [FAIL] Health check failed: $($_.Exception.Message)" -ForegroundColor Red
    }
    
    # Test 2: Mapping Endpoint
    Write-Host "Test 2: Mapping API (GET /mapping)..." -ForegroundColor Cyan
    try {
        $mappingUrl = "$serviceUrl/mapping"
        $response = Invoke-RestMethod -Uri $mappingUrl -Method GET -TimeoutSec 30
        $itemCount = if ($response -is [array]) { $response.Count } else { ($response | Get-Member -MemberType NoteProperty).Count }
        if ($itemCount -gt 0) {
            Write-Host "  [PASS] Mapping endpoint returned $itemCount items" -ForegroundColor Green
        }
        else {
            Write-Host "  [WARN] Mapping endpoint returned empty data" -ForegroundColor Yellow
        }
    }
    catch {
        Write-Host "  [FAIL] Mapping test failed: $($_.Exception.Message)" -ForegroundColor Red
    }
    
    # Test 3: Prices Endpoint
    Write-Host "Test 3: Prices API (GET /prices/latest)..." -ForegroundColor Cyan
    try {
        $pricesUrl = "$serviceUrl/prices/latest"
        $response = Invoke-RestMethod -Uri $pricesUrl -Method GET -TimeoutSec 30
        $priceCount = if ($response.data) { ($response.data | Get-Member -MemberType NoteProperty).Count } else { 0 }
        if ($priceCount -gt 0) {
            Write-Host "  [PASS] Prices endpoint returned $priceCount items" -ForegroundColor Green
        }
        else {
            Write-Host "  [WARN] Prices endpoint returned empty data (may still be initializing)" -ForegroundColor Yellow
        }
    }
    catch {
        Write-Host "  [FAIL] Prices test failed: $($_.Exception.Message)" -ForegroundColor Red
    }
    
    # Test 4: Refresh Endpoint (Unauthorized)
    Write-Host "Test 4: Refresh Auth (POST /refresh without token)..." -ForegroundColor Cyan
    try {
        $refreshUrl = "$serviceUrl/refresh"
        $response = Invoke-WebRequest -Uri $refreshUrl -Method POST -TimeoutSec 10 -UseBasicParsing -ErrorAction SilentlyContinue
        Write-Host "  [FAIL] Refresh endpoint should reject unauthorized requests" -ForegroundColor Red
    }
    catch {
        if ($_.Exception.Response.StatusCode -eq 401 -or $_.Exception.Response.StatusCode.Value__ -eq 401) {
            Write-Host "  [PASS] Refresh endpoint correctly rejects unauthorized requests (401)" -ForegroundColor Green
        }
        else {
            Write-Host "  [INFO] Refresh endpoint returned: $($_.Exception.Message)" -ForegroundColor Yellow
        }
    }
    
    # Test 5: Refresh Endpoint (Authorized)
    Write-Host "Test 5: Refresh Auth (POST /refresh with valid token)..." -ForegroundColor Cyan
    try {
        $refreshUrl = "$serviceUrl/refresh"
        $headers = @{ "X-Refresh-Token" = $refreshSecret }
        $response = Invoke-RestMethod -Uri $refreshUrl -Method POST -Headers $headers -TimeoutSec 60
        if ($response.status -eq "refreshed") {
            Write-Host "  [PASS] Authorized refresh succeeded - $($response.count) items updated" -ForegroundColor Green
        }
        else {
            Write-Host "  [WARN] Unexpected response: $($response | ConvertTo-Json -Compress)" -ForegroundColor Yellow
        }
    }
    catch {
        Write-Host "  [FAIL] Authorized refresh failed: $($_.Exception.Message)" -ForegroundColor Red
    }
    
    Write-Host ""
    Write-Host "======================================" -ForegroundColor Green
    Write-Host "  DEPLOYMENT SUMMARY" -ForegroundColor Green
    Write-Host "======================================" -ForegroundColor Green
    Write-Host ""
    Write-Host "Service URL: $serviceUrl" -ForegroundColor Cyan
    Write-Host ""
    Write-Host "IMPORTANT: Save your refresh secret for Cloud Scheduler:" -ForegroundColor Yellow
    Write-Host "  REFRESH_SECRET=$refreshSecret" -ForegroundColor White
    Write-Host ""
    Write-Host "To set up Cloud Scheduler for automatic price refresh:" -ForegroundColor DarkGray
    Write-Host "  gcloud scheduler jobs create http refresh-prices \" -ForegroundColor DarkGray
    Write-Host "    --schedule='*/5 * * * *' \" -ForegroundColor DarkGray
    Write-Host "    --uri='$serviceUrl/refresh' \" -ForegroundColor DarkGray
    Write-Host "    --http-method=POST \" -ForegroundColor DarkGray
    Write-Host "    --headers='X-Refresh-Token=$refreshSecret'" -ForegroundColor DarkGray
    Write-Host ""
    
}
else {
    Write-Host "[WARN] Could not fetch service URL for testing" -ForegroundColor Yellow
}
