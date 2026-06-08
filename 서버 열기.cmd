@echo off
setlocal
chcp 65001 >nul
title How-to-Graph Server

cd /d "%~dp0"

where npm >nul 2>nul
if errorlevel 1 (
  echo Node.js or npm was not found.
  echo Install Node.js, then run this file again.
  pause
  exit /b 1
)

if not exist "node_modules\vite\bin\vite.js" (
  echo Installing required files for the first run...
  call npm install
  if errorlevel 1 (
    echo Install failed.
    pause
    exit /b 1
  )
)

start "" powershell -NoProfile -ExecutionPolicy Bypass -Command "$url='http://localhost:5173/'; for($i=0; $i -lt 40; $i++){ try { $response=Invoke-WebRequest -UseBasicParsing -Uri $url -TimeoutSec 1; if($response.StatusCode -ge 200){ Start-Process $url; exit } } catch { Start-Sleep -Milliseconds 500 } }; Start-Process $url"

echo Starting the server. Press Ctrl+C in this window to stop it.
call npm run dev -- --port 5173

echo.
echo Server stopped.
pause
