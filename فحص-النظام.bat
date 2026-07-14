@echo off
chcp 65001 >nul
title فحص النظام - تشخيص المشاكل
color 0E

echo.
echo ╔════════════════════════════════════════════════════════════╗
echo ║              فحص النظام - تشخيص المشاكل                   ║
echo ╚════════════════════════════════════════════════════════════╝
echo.

REM 1. فحص Node.js
echo [1/8] فحص Node.js...
where node >nul 2>&1
if %errorlevel% equ 0 (
    echo ✓ Node.js مثبت
    node --version
) else (
    echo ❌ Node.js غير مثبت!
    echo    يرجى تثبيته من: https://nodejs.org
)

echo.
echo [2/8] فحص npm...
where npm >nul 2>&1
if %errorlevel% equ 0 (
    echo ✓ npm مثبت
    npm --version
) else (
    echo ❌ npm غير مثبت!
)

echo.
echo [3/8] فحص الملفات الأساسية...
set FILES_OK=1
if exist "server-sqlite.js" (
    echo ✓ server-sqlite.js موجود
) else (
    echo ❌ server-sqlite.js غير موجود!
    set FILES_OK=0
)

if exist "simple-ip-scanner.js" (
    echo ✓ simple-ip-scanner.js موجود
) else (
    echo ❌ simple-ip-scanner.js غير موجود!
    set FILES_OK=0
)

if exist "advanced-web-scanner.js" (
    echo ✓ advanced-web-scanner.js موجود
) else (
    echo ❌ advanced-web-scanner.js غير موجود!
    set FILES_OK=0
)

if exist "package.json" (
    echo ✓ package.json موجود
) else (
    echo ❌ package.json غير موجود!
    set FILES_OK=0
)

echo.
echo [4/8] فحص المكتبات...
if exist "node_modules" (
    echo ✓ مجلد node_modules موجود
    if exist "node_modules\express" (
        echo ✓ Express مثبت
    ) else (
        echo ❌ Express غير مثبت - شغل: npm install
    )
    if exist "node_modules\better-sqlite3" (
        echo ✓ better-sqlite3 مثبت
    ) else (
        echo ❌ better-sqlite3 غير مثبت - شغل: npm install
    )
) else (
    echo ❌ المكتبات غير مثبتة!
    echo    شغل: npm install
)

echo.
echo [5/8] فحص قاعدة البيانات...
if exist "penetration_testing.db" (
    echo ✓ قاعدة البيانات موجودة
) else (
    echo ⚠ قاعدة البيانات غير موجودة
    echo   سيتم إنشاؤها عند التشغيل
)

echo.
echo [6/8] فحص المنفذ 3001...
netstat -ano | findstr :3001 >nul 2>&1
if %errorlevel% equ 0 (
    echo ⚠ المنفذ 3001 مستخدم!
    echo.
    echo العمليات المستخدمة للمنفذ:
    netstat -ano | findstr :3001
    echo.
    echo لإيقاف العملية، استخدم:
    echo taskkill /F /PID [رقم_العملية]
) else (
    echo ✓ المنفذ 3001 متاح
)

echo.
echo [7/8] فحص عمليات Node.js...
tasklist | findstr node.exe >nul 2>&1
if %errorlevel% equ 0 (
    echo ⚠ عمليات Node.js تعمل:
    tasklist | findstr node.exe
    echo.
    echo لإيقاف جميع العمليات:
    echo taskkill /F /IM node.exe
) else (
    echo ✓ لا توجد عمليات Node.js
)

echo.
echo [8/8] فحص اتصال الخادم...
powershell -Command "try { $response = Invoke-WebRequest -Uri 'http://localhost:3001/health' -TimeoutSec 3 -UseBasicParsing; if ($response.StatusCode -eq 200) { Write-Host '✓ الخادم يعمل ويستجيب!' -ForegroundColor Green; exit 0 } else { Write-Host '❌ الخادم لا يستجيب' -ForegroundColor Red; exit 1 } } catch { Write-Host '❌ الخادم لا يعمل' -ForegroundColor Red; exit 1 }"

echo.
echo ════════════════════════════════════════════════════════════
echo                        الخلاصة
echo ════════════════════════════════════════════════════════════

if %FILES_OK% equ 0 (
    echo.
    echo ❌ المشكلة: ملفات مفقودة
    echo    الحل: تأكد من أنك في مجلد المشروع الصحيح
    echo.
) else (
    echo.
    echo ✓ جميع الملفات موجودة
    echo.
)

echo للتشغيل، استخدم أحد الملفات:
echo   • تشغيل-محسّن.bat    (موصى به)
echo   • تشغيل-سريع.bat
echo   • تشغيل-النظام.bat
echo.

pause
