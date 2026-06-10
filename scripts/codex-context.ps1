$ErrorActionPreference = "Stop"

$ProjectRoot = Split-Path -Parent $PSScriptRoot
Set-Location -LiteralPath $ProjectRoot

function Write-Section {
  param([string] $Title)
  Write-Host ""
  Write-Host "== $Title =="
}

function Get-LineCount {
  param([string] $Path)
  if (-not (Test-Path -LiteralPath $Path)) {
    return 0
  }
  return (Get-Content -LiteralPath $Path | Measure-Object -Line).Lines
}

function Test-Url {
  param([string] $Url)
  try {
    $response = Invoke-WebRequest -UseBasicParsing -Uri $Url -TimeoutSec 2
    return "HTTP $($response.StatusCode)"
  } catch {
    return "not responding"
  }
}

Write-Section "Project"
Write-Host "Root: $ProjectRoot"

if (Test-Path -LiteralPath "package.json") {
  $package = Get-Content -Raw -LiteralPath "package.json" | ConvertFrom-Json
  Write-Host "Package: $($package.name)@$($package.version)"
  $scripts = $package.scripts.PSObject.Properties | ForEach-Object { "$($_.Name)=$($_.Value)" }
  Write-Host "Scripts: $($scripts -join '; ')"
}

Write-Section "Git"
try {
  $status = git status --short
  if ($status) {
    $status
  } else {
    Write-Host "clean"
  }
} catch {
  Write-Host "git status unavailable: $($_.Exception.Message)"
}

Write-Section "Local App"
Write-Host "127.0.0.1:5173: $(Test-Url 'http://127.0.0.1:5173/')"
Write-Host "localhost:5173: $(Test-Url 'http://localhost:5173/')"

Write-Section "Key Files"
$keyFiles = @(
  "src/main.jsx",
  "src/styles.css",
  "vite.config.js",
  "AGENTS.md",
  "scripts/open-external-link.ps1",
  "scripts/codex-context.ps1",
  "scripts/codex-verify.ps1"
)

foreach ($file in $keyFiles) {
  if (Test-Path -LiteralPath $file) {
    $item = Get-Item -LiteralPath $file
    $lines = Get-LineCount $file
    Write-Host "$file - $lines lines, $($item.Length) bytes"
  }
}

Write-Section "Main Anchors"
$anchors = @(
  @{ Label = "App"; Pattern = "function App\(" },
  @{ Label = "PlanWorkspace"; Pattern = "function PlanWorkspace\(" },
  @{ Label = "TableWorkspace"; Pattern = "function TableWorkspace\(" },
  @{ Label = "GraphWorkspace"; Pattern = "function GraphWorkspace\(" },
  @{ Label = "ShareDialog"; Pattern = "function ShareDialog\(" },
  @{ Label = "packShareState"; Pattern = "function packShareState\(" },
  @{ Label = "unpackShareState"; Pattern = "function unpackShareState\(" }
)

foreach ($anchor in $anchors) {
  $match = Select-String -Path "src/main.jsx" -Pattern $anchor.Pattern -List
  if ($match) {
    Write-Host "$($anchor.Label): src/main.jsx:$($match.LineNumber)"
  }
}

Write-Section "Search Defaults"
Write-Host "rg uses .ignore here; tmp/, dist/, node_modules/, and *.log are skipped by default."
Write-Host "Use rg -uuu or direct paths when old tmp artifacts are needed."
