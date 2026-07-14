@echo off
chcp 65001 >nul
cls

echo ╔════════════════════════════════════════════════════════╗
echo ║     🎨 تشغيل واجهة منصة اختبار الاختراق 🎨          ║
echo ╚════════════════════════════════════════════════════════╝
echo.

echo [1/4] التحقق من Node.js...
node --version >nul 2>&1
if %errorlevel% neq 0 (
    echo ❌ Node.js غير مثبت!
    echo.
    echo قم بتثبيته من: nodejs-installer.msi
    pause
    exit /b 1
)
echo ✅ Node.js مثبت

echo.
echo [2/4] التحقق من المكتبات...
if not exist "node_modules" (
    echo ⏳ جاري تثبيت المكتبات...
    call npm install
)
echo ✅ المكتبات جاهزة

echo.
echo [3/4] التحقق من الواجهة...
if not exist "public\index.html" (
    echo ❌ ملفات الواجهة مفقودة!
    pause
    exit /b 1
)
echo ✅ الواجهة جاهزة

echo.
echo [4/4] تشغيل الخادم...
echo.
echo ════════════════════════════════════════════════════════
echo.
echo 🌐 الواجهة ستعمل على:
echo    http://localhost:3000
echo.
echo 📚 توثيق API:
echo    http://localhost:3000/api-docs
echo.
echo 💡 نصيحة: اضغط Ctrl+C لإيقاف الخادم
echo.
echo ════════════════════════════════════════════════════════
echo.

REM Set PATH for npm
set PATH=%PATH%;%APPDATA%\npm

call npm run dev

pause
