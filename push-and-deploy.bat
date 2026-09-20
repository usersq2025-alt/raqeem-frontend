@echo off
chcp 65001 >nul
setlocal enabledelayedexpansion

echo ============================================
echo   Raqeem - push and deploy FRONTEND
echo ============================================
echo.

cd /d "%~dp0"
set "PATH=C:\laragon\bin\git\cmd;C:\laragon\bin\git\bin;%PATH%"

echo === Changed files ===
git status --short
echo.

REM Optional arg: commit message. If missing and stdin is interactive, ask once.
set "msg=%~1"
if "%msg%"=="" (
  if "%RAQEEM_DEPLOY_MSG%"=="" (
    set /p msg="Commit message (Enter = update): "
  ) else (
    set "msg=%RAQEEM_DEPLOY_MSG%"
  )
)
if "%msg%"=="" set "msg=update"

echo.
echo [1/3] Pushing to GitHub...
git add .
git diff --cached --quiet
if errorlevel 1 (
  git -c user.name="User" -c user.email="usersq2025@gmail.com" commit -m "!msg!"
  if errorlevel 1 (
    echo Commit failed
    pause
    exit /b 1
  )
) else (
  echo Nothing new to commit - deploying current main
)

git push origin main
if errorlevel 1 (
  echo Push failed
  pause
  exit /b 1
)

echo.
echo [2/3] Deploying on server...
if not exist "%USERPROFILE%\.ssh\raqeem_deploy" (
  echo SSH key missing: %USERPROFILE%\.ssh\raqeem_deploy
  pause
  exit /b 1
)

ssh -i "%USERPROFILE%\.ssh\raqeem_deploy" -o BatchMode=yes raqeem@vps.molhamyic.cloud "~/deploy-frontend.sh"
if errorlevel 1 (
  echo Server deploy failed
  pause
  exit /b 1
)

echo.
echo [3/3] Done - https://raqeem-edu.com
echo.
pause
endlocal
