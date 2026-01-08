$ErrorActionPreference = "Stop"

Write-Host "Starting Development Environment..."

# Website
Write-Host "Launching Web Dashboard..."
Start-Process cmd -ArgumentList "/k cd /d ""$PSScriptRoot\web-dashboard"" && pnpm run dev"

# RuneLite Plugin
Write-Host "Launching RuneLite Plugin..."
Start-Process cmd -ArgumentList "/k cd /d ""$PSScriptRoot\runelite-plugin"" && .\gradlew.bat runClient"

Write-Host "Services started in new windows."
