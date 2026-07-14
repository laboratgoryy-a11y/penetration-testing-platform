@echo off
chcp 65001 >nul
cls
echo.
echo ╔════════════════════════════════════════════════════════════╗
echo ║                                                            ║
echo ║              🔍 التحقق من الإصلاحات                       ║
echo ║                                                            ║
echo ╚════════════════════════════════════════════════════════════╝
echo.

echo 📋 جاري التحقق من الملفات المعدلة...
echo.

REM Check Crawler.ts
echo 1️⃣ التحقق من Crawler.ts...
findstr /C:"Added 20 common paths" src\services\Crawler.ts >nul 2>&1
if %errorlevel% equ 0 (
    echo    ✅ Crawler.ts - تم الإصلاح
) else (
    echo    ❌ Crawler.ts - لم يتم الإصلاح
)

REM Check WebScanner.ts
echo 2️⃣ التحقق من WebScanner.ts...
findstr /C:"respectRobotsTxt: false" src\services\WebScanner.ts >nul 2>&1
if %errorlevel% equ 0 (
    echo    ✅ WebScanner.ts - تم الإصلاح
) else (
    echo    ❌ WebScanner.ts - لم يتم الإصلاح
)

REM Check operations-manager.js
echo 3️⃣ التحقق من operations-manager.js...
findstr /C:"authorizationId: authorizationId" public\js\operations-manager.js >nul 2>&1
if %errorlevel% equ 0 (
    echo    ✅ operations-manager.js - تم الإصلاح
) else (
    echo    ❌ operations-manager.js - لم يتم الإصلاح
)

echo.
echo ═══════════════════════════════════════════════════════════
echo.

REM Check if server is running
echo 🔍 التحقق من حالة السيرفر...
tasklist | findstr /I "node.exe" >nul 2>&1
if %errorlevel% equ 0 (
    echo    ⚠️ السيرفر يعمل - يجب إعادة تشغيله!
    echo.
    echo    💡 لإعادة التشغيل:
    echo       1. اضغط مرتين على: ⚡-أعد-التشغيل-الآن.bat
    echo       أو
    echo       2. taskkill /F /IM node.exe
    echo       3. npm start
) else (
    echo    ⚠️ السيرفر لا يعمل - يجب بدء التشغيل!
    echo.
    echo    💡 لبدء السيرفر:
    echo       اكتب: npm start
)

echo.
echo ═══════════════════════════════════════════════════════════
echo.

REM Check Node.js
echo 🔍 التحقق من Node.js...
node --version >nul 2>&1
if %errorlevel% equ 0 (
    for /f "tokens=*" %%i in ('node --version') do set NODE_VERSION=%%i
    echo    ✅ Node.js مثبت: !NODE_VERSION!
) else (
    echo    ❌ Node.js غير مثبت!
)

REM Check npm
echo 🔍 التحقق من npm...
npm --version >nul 2>&1
if %errorlevel% equ 0 (
    for /f "tokens=*" %%i in ('npm --version') do set NPM_VERSION=%%i
    echo    ✅ npm مثبت: !NPM_VERSION!
) else (
    echo    ❌ npm غير مثبت!
)

echo.
echo ═══════════════════════════════════════════════════════════
echo.

REM Check if node_modules exists
echo 🔍 التحقق من الحزم...
if exist "node_modules\" (
    echo    ✅ node_modules موجود
) else (
    echo    ❌ node_modules غير موجود - يجب تشغيل: npm install
)

echo.
echo ═══════════════════════════════════════════════════════════
echo.

REM Summary
echo 📊 الملخص:
echo.
echo ✅ الإصلاحات:
echo    • Crawler.ts - تحسين استخراج الروابط
echo    • WebScanner.ts - تعطيل robots.txt
echo    • operations-manager.js - إصلاح Network form
echo.
echo ⚠️ الخطوات التالية:
echo    1. إعادة تشغيل السيرفر (إذا كان يعمل)
echo    2. مسح كاش المتصفح (Ctrl + Shift + Delete)
echo    3. اختبار الإصلاحات
echo.
echo 🎯 للبدء:
echo    • اضغط مرتين على: ⚡-أعد-التشغيل-الآن.bat
echo    • افتح: اختبر-الإصلاحات-الآن.html
echo.

pause
