@echo off
echo ========================================
echo تشغيل سريع لاختبار قسم فحص الويب
echo ========================================
echo.

echo [1/3] بناء المشروع...
call npm run build
if %errorlevel% neq 0 (
    echo خطأ في البناء!
    pause
    exit /b 1
)

echo.
echo [2/3] بدء الخادم...
echo افتح المتصفح على: http://localhost:3000
echo.
echo للإيقاف: اضغط Ctrl+C
echo.

start http://localhost:3000

call npm start

pause
