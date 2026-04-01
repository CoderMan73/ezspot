param(
  [string]$Command = ""
)

$ErrorActionPreference = "Stop"

$ScriptDir = Split-Path -Parent $MyInvocation.MyCommand.Path
$RepoRoot = Join-Path $ScriptDir ".."

if ($Command -eq "") {
  Write-Host "ERROR: no command specified."
  Write-Host "Usage: docker-compose-tools.bat <up|down>"
  exit 1
}

Set-Location $RepoRoot

switch ($Command.ToLower()) {

  "up" {
    Write-Host "Starting Docker Compose stack..."
    docker-compose up --build -d
    Write-Host ""
    Write-Host "Stack started."
    Write-Host "  Frontend: http://localhost:3000/"
    Write-Host "  Backend:  http://localhost:5000/api"
    Write-Host "  Adminer:  http://localhost:8080"
  }

  "down" {
    Write-Host "Stopping Docker Compose stack..."
    docker-compose down
    Write-Host ""
    Write-Host "Stack stopped."
  }

  default {
    Write-Host "ERROR: invalid argument '$Command'. Use 'up' or 'down'."
    exit 1
  }

}