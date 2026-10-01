@echo off
setlocal
powershell.exe -NoProfile -ExecutionPolicy Bypass -File "%~dp0start.ps1" %*
set "BOT_EXIT=%ERRORLEVEL%"
if not "%BOT_EXIT%"=="0" if not defined RAQEEM_BOT_NO_PAUSE pause
exit /b %BOT_EXIT%