@echo off
setlocal
chcp 65001 >nul
title How-to-Graph External Link

cd /d "%~dp0"

powershell -NoProfile -ExecutionPolicy Bypass -File "%~dp0scripts\open-external-link.ps1"

echo.
echo External link stopped.
pause
