@echo off
chcp 65001 >nul
cls

echo ╔════════════════════════════════════════════════════════╗
echo ║   🚀 تشغيل منصة اختبار الاختراق - النظام الكامل 🚀  ║
echo ╚════════════════════════════════════════════════════════╝
echo.

echo ⚠️  تنبيه: هذا النظام الحقيقي يتطلب:
echo    - PostgreSQL (قاعدة البيانات)
echo    - Redis (التخزين المؤقت)
echo.

echo [1/5] التحقق من Node.js...
node --version >nul 2>&1
if %errorlevel% neq 0 (
    echo ❌ Node.js غير مثبت!
    pause
    exit /b 1
)
echo ✅ Node.js مثبت

echo.
echo [2/5] التحقق من المكتبات...
if not exist "node_modules" (
    echo ⏳ جاري تثبيت المكتبات...
    call npm install
)
echo ✅ المكتبات جاهزة

echo.
echo [3/5] التحقق من PostgreSQL...
echo ⚠️  تأكد من تشغيل PostgreSQL على المنفذ 5432
echo.

echo [4/5] التحقق من Redis...
echo ⚠️  تأكد من تشغيل Redis على المنفذ 6379
echo.

echo [5/5] تشغيل النظام...
echo.
echo ════════════════════════════════════════════════════════
echo.
echo 🌐 النظام سيعمل على:
echo    http://localhost:3000
echo.
echo 📚 توثيق API:
echo    http://localhost:3000/api-docs
echo.
echo 💡 نصيحة: اضغط Ctrl+C لإيقاف النظام
echo.
echo ════════════════════════════════════════════════════════
echo.

REM Set PATH for npm
set PATH=%PATH%;%APPDATA%\npm

call npm run dev

pause
