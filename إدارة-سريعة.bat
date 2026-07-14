@echo off
chcp 65001 >nul

REM اختصارات سريعة لإدارة النظام

if "%1"=="start" goto START
if "%1"=="stop" goto STOP
if "%1"=="restart" goto RESTART
if "%1"=="status" goto STATUS
if "%1"=="open" goto OPEN
if "%1"=="debug" goto DEBUG
goto HELP

:START
echo تشغيل النظام...
taskkill /F /IM node.exe >nul 2>&1
timeout /t 1 /nobreak >nul
set PORT=3001
start "Penetration Testing Server" cmd /k "node server-sqlite.js"
timeout /t 3 /nobreak >nul
echo ✓ تم تشغيل النظام
goto END

:STOP
echo إيقاف النظام...
taskkill /F /IM node.exe >nul 2>&1
echo ✓ تم إيقاف النظام
goto END

:RESTART
echo إعادة تشغيل النظام...
taskkill /F /IM node.exe >nul 2>&1
timeout /t 2 /nobreak >nul
set PORT=3001
start "Penetration Testing Server" cmd /k "node server-sqlite.js"
timeout /t 3 /nobreak >nul
echo ✓ تم إعادة تشغيل النظام
goto END

:STATUS
echo حالة النظام:
curl -s http://localhost:3001 >nul 2>&1
if errorlevel 1 (
    echo ❌ الخادم غير متصل
) else (
    echo ✓ الخادم يعمل على http://localhost:3001
)
goto END

:OPEN
start http://localhost:3001/login.html
echo ✓ تم فتح الواجهة
goto END

:DEBUG
start http://localhost:3001/debug-scan-flow.html
start http://localhost:3001/test-vuln-api.html
echo ✓ تم فتح أدوات التتبع
goto END

:HELP
echo ============================================================
echo إدارة سريعة لمنصة اختبار الاختراق
echo ============================================================
echo.
echo الاستخدام: إدارة-سريعة.bat [أمر]
echo.
echo الأوامر المتاحة:
echo   start      - تشغيل النظام
echo   stop       - إيقاف النظام
echo   restart    - إعادة تشغيل النظام
echo   status     - عرض حالة النظام
echo   open       - فتح الواجهة في المتصفح
echo   debug      - فتح أدوات التتبع
echo.
echo أمثلة:
echo   إدارة-سريعة.bat start
echo   إدارة-سريعة.bat stop
echo   إدارة-سريعة.bat restart
echo ============================================================

:END
