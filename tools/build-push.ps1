$ErrorActionPreference = "Stop"

$ScriptDir = Split-Path -Parent $MyInvocation.MyCommand.Path
$RepoRoot = Join-Path $ScriptDir ".."
$EnvFile = Join-Path $RepoRoot ".env"
$Registry = "container.cs.vt.edu/anonymous/capsp26-coe-pdf-extraction-team-e-zspot"

# Load .env
if (-not (Test-Path $EnvFile)) {
  Write-Host "ERROR: .env file not found at repo root"
  exit 1
}

Get-Content $EnvFile | ForEach-Object {
  if ($_ -match '^\s*#') { return }
  if ($_ -match '^\s*$') { return }
  if ($_ -match '^([^=]+)=([^#]*)') {
    [System.Environment]::SetEnvironmentVariable($matches[1].Trim(), $matches[2].Trim())
  }
}

$ImageTag = [System.Environment]::GetEnvironmentVariable("IMAGE_TAG")

if (-not $ImageTag) {
  Write-Host "ERROR: IMAGE_TAG not set in .env"
  Write-Host "       Add IMAGE_TAG=your-tag to your .env file"
  exit 1
}

Write-Host "Building and pushing with tag: $ImageTag"
Write-Host ""

# Frontend
Write-Host "[1/3] Building frontend..."
docker build -t "$Registry/frontend:$ImageTag" "$RepoRoot/frontend"
Write-Host "[1/3] Pushing frontend..."
docker push "$Registry/frontend:$ImageTag"

# Backend
Write-Host ""
Write-Host "[2/3] Building backend..."
docker build -t "$Registry/backend:$ImageTag" "$RepoRoot/backend"
Write-Host "[2/3] Pushing backend..."
docker push "$Registry/backend:$ImageTag"

# Database
Write-Host ""
Write-Host "[3/3] Building database..."
docker build -t "$Registry/database:$ImageTag" -f "$RepoRoot/database/Dockerfile" $RepoRoot
Write-Host "[3/3] Pushing database..."
docker push "$Registry/database:$ImageTag"

Write-Host ""
Write-Host "Done! All images pushed with tag: $ImageTag"
Write-Host ""
Write-Host "To deploy run:"
Write-Host "  .\kubernetes\scripts\deploy.bat up -Context discovery"