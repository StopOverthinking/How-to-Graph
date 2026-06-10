$ErrorActionPreference = "Stop"

$ProjectRoot = Split-Path -Parent $PSScriptRoot
Set-Location -LiteralPath $ProjectRoot

$BundledNode = "C:\Users\PEN\.cache\codex-runtimes\codex-primary-runtime\dependencies\node\bin\node.exe"
$ViteEntry = "node_modules\vite\bin\vite.js"

if (-not (Test-Path -LiteralPath $ViteEntry)) {
  Write-Host "Dependencies are missing. Running npm install first."
  npm install
  if ($LASTEXITCODE -ne 0) {
    exit $LASTEXITCODE
  }
}

Write-Host "Running default Vite build..."
npm run build
$defaultExit = $LASTEXITCODE

if ($defaultExit -eq 0) {
  Write-Host "Default build passed."
  exit 0
}

Write-Host "Default build failed with exit code $defaultExit."

if (-not (Test-Path -LiteralPath $BundledNode)) {
  Write-Host "Bundled Codex Node runtime was not found: $BundledNode"
  exit $defaultExit
}

Write-Host "Retrying Vite build with bundled Codex Node..."
& $BundledNode $ViteEntry build
$fallbackExit = $LASTEXITCODE

if ($fallbackExit -eq 0) {
  Write-Host "Bundled Node build passed."
  exit 0
}

Write-Host "Bundled Node build failed with exit code $fallbackExit."
exit $fallbackExit
