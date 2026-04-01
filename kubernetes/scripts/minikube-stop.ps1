# minikube-stop.ps1

$ScriptDir = Split-Path -Parent $MyInvocation.MyCommand.Path

# Scale everything down first
Write-Host "Scaling down all services..."
& "$ScriptDir\deploy.bat" down -Context minikube

# Stop minikube
Write-Host ""
Write-Host "Stopping minikube..."
minikube stop

if ($LASTEXITCODE -ne 0) {
  Write-Host "ERROR: minikube failed to stop."
  exit 1
}

Write-Host ""
Write-Host "============================================"
Write-Host "  minikube stopped."
Write-Host "============================================"