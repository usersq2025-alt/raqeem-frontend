@echo off
setlocal EnableExtensions
cd /d "%~dp0"

REM Keep window open on any failure path
title Raqeem HQ Bot

REM Laragon Node (adjust if your node folder name differs)
if exist "C:\laragon\bin\nodejs\node-v22\node.exe" (
  set "PATH=C:\laragon\bin\nodejs\node-v22;C:\laragon\bin\nodejs;%PATH%"
) else if exist "C:\laragon\bin\nodejs\node.exe" (
  set "PATH=C:\laragon\bin\nodejs;%PATH%"
)

where node >nul 2>&1
if errorlevel 1 (
  echo.
  echo [ERROR] Node.js not found.
  echo Open Laragon, start Node, or install Node, then try again.
  echo.
  pause
  exit /b 1
)

where npm >nul 2>&1
if errorlevel 1 (
  echo.
  echo [ERROR] npm not found next to node.exe
  echo.
  pause
  exit /b 1
)

echo ============================================
echo   Raqeem HQ Bot  -  local tool placer
echo ============================================
echo.
echo   [1] Browser UI   (recommended)
echo   [2] Console menu
echo.
set "choice=1"
set /p choice="Choose 1 or 2 [default 1]: "

if "%choice%"=="2" goto console
goto ui

:ui
echo.
echo Starting browser UI on http://127.0.0.1:3921 ...
echo Leave this window OPEN while you use the bot.
echo.
call npm run hq:bot -- --ui
goto end

:console
echo.
call npm run hq:bot
goto end

:end
echo.
if errorlevel 1 (
  echo [ERROR] Bot exited with code %ERRORLEVEL%
) else (
  echo Done.
)
echo.
pause
endlocal
