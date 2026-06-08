$ErrorActionPreference = "Stop"

$ProjectRoot = Split-Path -Parent $PSScriptRoot
$LocalUrl = "http://127.0.0.1:5173/"

Set-Location -LiteralPath $ProjectRoot

function Test-LocalApp {
  try {
    $response = Invoke-WebRequest -UseBasicParsing -Uri $LocalUrl -TimeoutSec 2
    return $response.StatusCode -ge 200
  } catch {
    return $false
  }
}

if (-not (Get-Command npm -ErrorAction SilentlyContinue)) {
  Write-Host "Node.js or npm was not found."
  Write-Host "Install Node.js, then run this file again."
  exit 1
}

if (-not (Test-Path -LiteralPath "node_modules\vite\bin\vite.js")) {
  Write-Host "Installing required files for the first run..."
  npm install
  if ($LASTEXITCODE -ne 0) {
    Write-Host "Install failed."
    exit $LASTEXITCODE
  }
}

if (-not (Test-LocalApp)) {
  Write-Host "Starting the local app on $LocalUrl"
  $quotedRoot = $ProjectRoot.Replace("'", "''")
  $serverCommand = "Set-Location -LiteralPath '$quotedRoot'; npm run dev -- --host 127.0.0.1 --port 5173 --strictPort"
  Start-Process powershell -WindowStyle Normal -ArgumentList @(
    "-NoProfile",
    "-ExecutionPolicy",
    "Bypass",
    "-NoExit",
    "-Command",
    $serverCommand
  )

  for ($i = 0; $i -lt 40; $i++) {
    if (Test-LocalApp) {
      break
    }
    Start-Sleep -Milliseconds 500
  }
}

if (-not (Test-LocalApp)) {
  Write-Host "The local app did not respond on $LocalUrl"
  Write-Host "Check whether another program is already using port 5173."
  exit 1
}

Write-Host ""
Write-Host "Temporary external link mode"
Write-Host "Keep this window open while using the link."
Write-Host "The public URL will look like https://...trycloudflare.com"
Write-Host "Press Ctrl+C here to stop the external link."
Write-Host ""

npx --yes wrangler@latest tunnel quick-start $LocalUrl
