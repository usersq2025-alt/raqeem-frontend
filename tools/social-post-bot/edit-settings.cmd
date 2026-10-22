@echo off
rem Opens the secret settings file .env (OpenAI key, Meta credentials). Creates it from the template if missing.
pushd "%~dp0"
if not exist ".env" copy ".env.example" ".env" >nul
start "" notepad ".env"
echo Save the file, then restart the bot so it picks up the changes.
popd
timeout /t 4 >nul
