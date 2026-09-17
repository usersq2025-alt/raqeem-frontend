@echo off
chcp 65001 >nul
setlocal enabledelayedexpansion

echo ============================================
echo   رقيم - رفع ونشر الفرونت إند بضغطة واحدة
echo ============================================
echo.

cd /d "%~dp0"
set "PATH=C:\laragon\bin\git\cmd;C:\laragon\bin\git\bin;%PATH%"

echo === الملفات المتغيرة ===
git status --short
echo.

set /p msg="اكتب وصف التحديث (أو اتركه فارغاً): "
if "%msg%"=="" set msg=تحديث

echo.
echo [1/3] جاري الرفع لـ GitHub...
git add .
git diff --cached --quiet
if errorlevel 1 (
    git -c user.name="User" -c user.email="usersq2025@gmail.com" commit -m "%msg%"
    if errorlevel 1 (
        echo.
        echo فشل إنشاء الـ commit - توقف السكربت
        pause
        exit /b 1
    )
) else (
    echo لا توجد ملفات جديدة للـ commit - سيتم دفع ونشر النسخة الحالية
)

git push origin main
if errorlevel 1 (
    echo.
    echo فشل الرفع لـ GitHub - توقف السكربت
    pause
    exit /b 1
)

echo.
echo تم الرفع بنجاح
echo.
echo [2/3] جاري الاتصال بالسيرفر وبدء النشر...
echo.

if not exist "%USERPROFILE%\.ssh\raqeem_deploy" (
    echo مفتاح SSH غير موجود: %USERPROFILE%\.ssh\raqeem_deploy
    echo شغّل أولاً: NEW-PC-DEPLOY\INSTALL-SSH-KEY.bat
    pause
    exit /b 1
)

ssh -i "%USERPROFILE%\.ssh\raqeem_deploy" raqeem@vps.molhamyic.cloud "~/deploy-frontend.sh"

echo.
echo [3/3] اكتملت العملية بالكامل - الرفع والنشر معاً
echo.
pause
