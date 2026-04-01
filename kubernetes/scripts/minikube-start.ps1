# Check Docker is running
try {
  docker info 2>&1 | Out-Null
  if ($LASTEXITCODE -ne 0) { throw }
  Write-Host "OK Docker is running"
} catch {
  Write-Host "ERROR: Docker Desktop is not running."
  Write-Host "       Please start Docker Desktop and try again."
  exit 1
}

# Check minikube is installed
try {
  minikube version 2>&1 | Out-Null
  if ($LASTEXITCODE -ne 0) { throw }
  Write-Host "OK minikube is installed"
} catch {
  Write-Host "ERROR: minikube is not installed."
  Write-Host "       Run: winget install Kubernetes.minikube"
  Write-Host "       Then close and reopen your terminal/VS Code and try again."
  exit 1
}

# Check kubectl is installed
try {
  kubectl version --client 2>&1 | Out-Null
  if ($LASTEXITCODE -ne 0) { throw }
  Write-Host "OK kubectl is installed"
} catch {
  Write-Host "ERROR: kubectl is not installed."
  Write-Host "       Run: winget install Kubernetes.kubectl"
  Write-Host "       Then close and reopen your terminal/VS Code and try again."
  exit 1
}

# Check discovery-token.yaml exists
$ScriptDir = Split-Path -Parent $MyInvocation.MyCommand.Path
$TokenFile = Join-Path $ScriptDir "..\secrets\discovery-token.yaml"

if (-not (Test-Path $TokenFile)) {
  Write-Host ""
  Write-Host "ERROR: kubernetes/secrets/discovery-token.yaml not found."
  Write-Host "       Get this file from a teammate and place it at:"
  Write-Host "       kubernetes/secrets/discovery-token.yaml"
  Write-Host "       Never commit this file."
  exit 1
}
Write-Host "OK discovery-token.yaml found"

# Check if minikube is already running
$status = minikube status --format='{{.Host}}' 2>&1
if ($status -eq "Running") {
  Write-Host ""
  Write-Host "minikube is already running, skipping start."
} else {
  Write-Host ""
  Write-Host "Starting minikube..."
  minikube start `
    --kubernetes-version=v1.31.0 `
    --driver=docker `
    --cpus=4 `
    --memory=4g

  if ($LASTEXITCODE -ne 0) {
    Write-Host "ERROR: minikube failed to start."
    exit 1
  }
}

# Enable ingress addon
Write-Host ""
Write-Host "Enabling ingress addon..."
minikube addons enable ingress

# Create namespace
Write-Host ""
Write-Host "Creating namespace..."
kubectl create namespace 22012s26-ezspot --context=minikube 2>&1 | Out-Null
Write-Host "OK namespace ready"

# Apply discovery-token
Write-Host ""
Write-Host "Applying discovery-token..."
kubectl apply -f $TokenFile --context=minikube -n 22012s26-ezspot
if ($LASTEXITCODE -ne 0) {
  Write-Host "ERROR: failed to apply discovery-token.yaml"
  exit 1
}
Write-Host "OK discovery-token applied"

# Create database-secrets
Write-Host ""
Write-Host "Creating database-secrets..."
& "$ScriptDir\deploy.bat" secrets -Context minikube
if ($LASTEXITCODE -ne 0) {
  Write-Host "ERROR: failed to create database-secrets."
  Write-Host "       Make sure .env is filled in at the repo root."
  exit 1
}

# Scale everything up
Write-Host ""
Write-Host "Scaling up all services..."
& "$ScriptDir\deploy.bat" up -Context minikube
if ($LASTEXITCODE -ne 0) {
  Write-Host "ERROR: deploy up failed."
  exit 1
}

# Open frontend URL in a new terminal (must stay open)
Write-Host ""
Write-Host "Opening frontend URL in a new terminal window..."
Start-Process powershell -ArgumentList "-NoExit", "-Command", "minikube service frontend -n 22012s26-ezspot --url"

Write-Host ""
Write-Host "============================================"
Write-Host "  minikube is ready!"
Write-Host "============================================"
Write-Host ""
Write-Host "Check the new terminal window for your local URL."