# Parse parameters
param(
  [string]$Command = "",
  [string]$Context = "minikube",
  [string]$EnvFileOverride = ""
)

# Set any error to end execution
$ErrorActionPreference = "Stop"

# Get directories
$ScriptDir = Split-Path -Parent $MyInvocation.MyCommand.Path
$ManifestsDir = Join-Path $ScriptDir "..\manifests"
$RepoRoot = Join-Path $ScriptDir "..\.."

# Variables
$Namespace = "22012s26-ezspot"
$ProdContext = "discovery"

# validate command
$ValidCommands = @("up", "down", "status", "secrets")

# Print help
if ($Command -eq "") {
  Write-Host "Error: no command specified."
  Write-Host ""
  Write-Host "Usage: deploy.bat <command> [-Context <name>] [-EnvFileOverride <path>]"
  Write-Host ""
  Write-Host "Commands:"
  Write-Host "  up       Apply manifests and scale all deployments to 1"
  Write-Host "  down     Scale all deployments to 0"
  Write-Host "  status   Show pods, services, ingress"
  Write-Host "  secrets  Create or update Kubernetes secrets from .env"
  Write-Host ""
  Write-Host "Options:"
  Write-Host "  -Context <name>  kubectl context (default: minikube)"
  Write-Host "                   Use -Context discovery for production"
  Write-Host "  -EnvFileOverride <path>  Explicit env file path (optional)"
  exit 1
}

# If we parse something weird
if ($ValidCommands -notcontains $Command) {
  Write-Host "Error: unknown command '$Command'"
  exit 1
}

# Resolve env file by context: discovery prefers .env.discovery, others default to .env.
$DefaultEnvFile = Join-Path $RepoRoot ".env"
$DiscoveryEnvFile = Join-Path $RepoRoot ".env.discovery"

if ($EnvFileOverride) {
  $EnvFile = $EnvFileOverride
} elseif ($Context -eq $ProdContext -and (Test-Path $DiscoveryEnvFile)) {
  $EnvFile = $DiscoveryEnvFile
} else {
  $EnvFile = $DefaultEnvFile
}

# load selected env file
if (-not (Test-Path $EnvFile)) {
  Write-Host "Error: env file not found at $EnvFile"
  if ($Context -eq $ProdContext) {
    Write-Host "Tip: create .env.discovery at the repo root for deployment values."
  } else {
    Write-Host "Copy .env.example to .env at the repo root and fill in values."
  }
  exit 1
}

Write-Host "Using env file: $EnvFile"

# Read the file
Get-Content $EnvFile | ForEach-Object {
  if ($_ -match '^\s*#') { return }   # skip comments
  if ($_ -match '^\s*$') { return }   # skip blank lines
  if ($_ -match '^([^=]+)=([^#]*)') {
    [System.Environment]::SetEnvironmentVariable($matches[1].Trim(), $matches[2].Trim())
  }
}

Write-Host "IMAGE_TAG = $([System.Environment]::GetEnvironmentVariable('IMAGE_TAG'))"

# kubectl helper
function Kct {
  kubectl --context=$Context -n $Namespace @args
}

# production safety check
if ($Command -eq "down" -and $Context -eq $ProdContext) {
  Write-Host ""
  Write-Host "WARNING: You are about to scale down PRODUCTION ($ProdContext)."
  Write-Host "         This will take the entire application offline."
  Write-Host ""
  $confirm = Read-Host "         Type 'yes' to confirm"
  if ($confirm -ne "yes") {
    Write-Host "Aborted."
    exit 0
  }
}

# envsubst replacement — reads a yaml file and substitutes ${VARIABLE} placeholders
function Invoke-Envsubst {
  param([string]$FilePath)
  $content = Get-Content $FilePath -Raw
  $content = [regex]::Replace($content, '\$\{(\w+)\}', {
    param($match)
    $varName = $match.Groups[1].Value
    $value = [System.Environment]::GetEnvironmentVariable($varName)
    if ($null -eq $value) { $match.Value } else { $value }
  })
  return $content
}

# apply all manifests
function Invoke-ApplyManifests {
  Write-Host "Applying manifests to context: $Context"
  Write-Host ""

  $files = @(
    "$ManifestsDir\database\pvc.yaml",
    "$ManifestsDir\database\deployment.yaml",
    "$ManifestsDir\database\service.yaml",
    "$ManifestsDir\backend\deployment.yaml",
    "$ManifestsDir\backend\service.yaml",
    "$ManifestsDir\frontend\deployment.yaml",
    "$ManifestsDir\frontend\service.yaml",
    "$ManifestsDir\ingress.yaml"
  )

  foreach ($file in $files) {
    Write-Host "  Applying: $([System.IO.Path]::GetFileName($file))"
    $substituted = Invoke-Envsubst $file
    $substituted | kubectl --context=$Context apply -f -
  }

  Write-Host ""
  Write-Host "All manifests applied."
}

# Commands
switch ($Command) {

  "up" {
    Invoke-ApplyManifests

    Write-Host "Scaling all deployments to 1..."
    foreach ($deployment in @("database", "backend", "frontend")) {
      Write-Host "  Scaling $deployment -> 1"
      Kct scale deployment/$deployment --replicas=1
    }

    # update image tags directly since apply can't update deployments
    $backendImage = "container.cs.vt.edu/anonymous/capsp26-coe-pdf-extraction-team-e-zspot/backend:$([System.Environment]::GetEnvironmentVariable('IMAGE_TAG'))"
    $frontendImage = "container.cs.vt.edu/anonymous/capsp26-coe-pdf-extraction-team-e-zspot/frontend:$([System.Environment]::GetEnvironmentVariable('IMAGE_TAG'))"

    kubectl --context=$Context set image deployment/backend container-0=$backendImage -n $Namespace
    kubectl --context=$Context set image deployment/frontend container-0=$frontendImage -n $Namespace

    Write-Host ""
    Write-Host "Waiting for rollouts..."
    foreach ($deployment in @("database", "backend", "frontend")) {
      Write-Host "  Waiting on $deployment..."
      Kct rollout status deployment/$deployment --timeout=120s
    }

    Write-Host ""
    Write-Host "All services up."
    Kct get pods
  }

  "down" {
    Write-Host "Scaling all deployments to 0 on context: $Context"
    foreach ($deployment in @("database", "backend", "frontend")) {
      Write-Host "  Scaling $deployment -> 0"
      Kct scale deployment/$deployment --replicas=0
    }
    Write-Host ""
    Write-Host "All services scaled down."
  }

  "status" {
    Write-Host "=== Context: $Context | Namespace: $Namespace ==="
    Write-Host ""
    Write-Host "--- Pods ---"
    Kct get pods
    Write-Host ""
    Write-Host "--- Services ---"
    Kct get services
    Write-Host ""
    Write-Host "--- Ingress ---"
    Kct get ingress
  }

  "secrets" {
    Write-Host "Creating/updating secrets on context: $Context"
    $dbPassword = [System.Environment]::GetEnvironmentVariable("DB_PASSWORD")
    $rootPassword = [System.Environment]::GetEnvironmentVariable("ROOT_PASSWORD")
    $sessionSecret = [System.Environment]::GetEnvironmentVariable("SESSION_SECRET")

    kubectl --context=$Context create secret generic database-secrets `
      --from-literal=DB_PASSWORD="$dbPassword" `
      --from-literal=ROOT_PASSWORD="$rootPassword" `
      --dry-run=client -o yaml | kubectl --context=$Context -n $Namespace apply -f -

    kubectl --context=$Context create secret generic auth-secrets `
      --from-literal=SESSION_SECRET="$sessionSecret" `
      --dry-run=client -o yaml | kubectl --context=$Context -n $Namespace apply -f -

    Write-Host "database-secrets and auth-secrets applied."
  }

}