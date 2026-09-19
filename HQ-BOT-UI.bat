@echo off
setlocal EnableExtensions
cd /d "%~dp0"
title Raqeem HQ Bot UI

if exist "C:\laragon\bin\nodejs\node-v22\node.exe" (
  set "PATH=C:\laragon\bin\nodejs\node-v22;C:\laragon\bin\nodejs;%PATH%"
) else if exist "C:\laragon\bin\nodejs\node.exe" (
  set "PATH=C:\laragon\bin\nodejs;%PATH%"
)

where node >nul 2>&1
if errorlevel 1 (
  echo [ERROR] Node.js not found. Start Laragon / install Node.
  pause
  exit /b 1
)

echo Starting http://127.0.0.1:3921 ...
echo Leave this window OPEN.
echo.
call npm run hq:bot -- --ui
echo.
pause
endlocal
