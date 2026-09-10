@echo off
setlocal enabledelayedexpansion

echo ============================================
echo   رقيم - رفع ونشر الفرونت إند بضغطة واحدة
echo ============================================
echo.

cd /d D:\laragon\www\raqeem-frontend

echo === الملفات المتغيرة ===
git status --short
echo.

set /p msg="اكتب وصف التحديث (أو اتركه فارغاً): "
if "%msg%"=="" set msg=تحديث

echo.
echo [1/3] جاري الرفع لـ GitHub...
git add .
git commit -m "%msg%"
git push origin main

if errorlevel 1 (
    echo.
    echo ❌ فشل الرفع لـ GitHub - توقف السكربت
    pause
    exit /b 1
)

echo.
echo ✅ تم الرفع بنجاح
echo.
echo [2/3] جاري الاتصال بالسيرفر وبدء النشر...
echo.

ssh -i "%USERPROFILE%\.ssh\raqeem_deploy" raqeem@vps.molhamyic.cloud "~/deploy-frontend.sh"

echo.
echo [3/3] ✅ اكتملت العملية بالكامل - الرفع والنشر معاً
echo.
pause