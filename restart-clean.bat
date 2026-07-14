@echo off
echo ========================================
echo   إعادة تشغيل النظام بشكل نظيف
echo   Clean System Restart
echo ========================================
echo.

echo [1/3] إيقاف جميع عمليات Node.js...
echo        Stopping all Node.js processes...
taskkill /F /IM node.exe 2>nul
if %errorlevel% equ 0 (
    echo        ✓ تم إيقاف العمليات بنجاح
) else (
    echo        ℹ لا توجد عمليات Node.js قيد التشغيل
)
echo.

echo [2/3] انتظار 2 ثانية...
echo        Waiting 2 seconds...
timeout /t 2 /nobreak >nul
echo.

echo [3/3] بدء الخادم...
echo        Starting server...
echo.
echo ========================================
echo   الخادم يعمل الآن
echo   Server is now running
echo ========================================
echo.
echo   افتح المتصفح على:
echo   Open browser at: http://localhost:3001
echo.
echo   للخروج اضغط Ctrl+C
echo   Press Ctrl+C to stop
echo.
echo ========================================
echo.

node server-full-mysql.js
