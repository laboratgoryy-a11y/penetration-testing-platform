@echo off
echo ========================================
echo   اعادة تشغيل الخادم
echo ========================================
echo.

echo [1/4] ايقاف الخادم الحالي...
taskkill /F /IM node.exe 2>nul
timeout /t 2 /nobreak >nul

echo [2/4] اعادة بناء المشروع...
call npm run build
if %errorlevel% neq 0 (
    echo.
    echo [خطأ] فشل بناء المشروع!
    pause
    exit /b 1
)

echo [3/4] تشغيل الخادم...
start "Penetration Testing Server" cmd /k "npm start"

echo [4/4] انتظار بدء الخادم...
timeout /t 5 /nobreak >nul

echo.
echo ========================================
echo   تم اعادة تشغيل الخادم بنجاح!
echo ========================================
echo.
echo الخادم يعمل على: http://localhost:3001
echo.
echo اضغط اي مفتاح لفتح المتصفح...
pause >nul

start http://localhost:3001

echo.
echo تم!
timeout /t 2 /nobreak >nul
