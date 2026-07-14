@echo off
chcp 65001 >nul
echo.
echo ╔════════════════════════════════════════════════════════════╗
echo ║                  🔥 حل سريع للمشكلة                       ║
echo ╚════════════════════════════════════════════════════════════╝
echo.
echo 🔄 إيقاف الخادم الحالي...
taskkill /F /IM node.exe 2>nul
if %errorlevel% equ 0 (
    echo ✅ تم إيقاف الخادم القديم
) else (
    echo ⚠️ لم يكن هناك خادم يعمل
)

echo.
echo ⏳ انتظار 3 ثواني...
timeout /t 3 /nobreak >nul

echo.
echo 🚀 بدء الخادم الجديد...
start "Penetration Testing Server" cmd /k "npm start"

echo.
echo ✅ تم بدء الخادم الجديد!
echo.
echo ⏳ انتظر 10 ثواني حتى يبدأ الخادم بالكامل...
echo.
timeout /t 10 /nobreak

echo.
echo ╔════════════════════════════════════════════════════════════╗
echo ║                  ✅ الخادم جاهز الآن!                     ║
echo ╚════════════════════════════════════════════════════════════╝
echo.
echo 🌐 افتح المتصفح: http://localhost:3000
echo 👤 Username: admin
echo 🔑 Password: admin123
echo.
echo 📋 الخطوات التالية:
echo    1. افتح المتصفح
echo    2. اضغط F12 لفتح Console
echo    3. امسح Cache: Ctrl+Shift+Delete
echo    4. أعد تحميل الصفحة: Ctrl+F5
echo    5. جرب الفحص مرة أخرى!
echo.
echo ⚠️ مهم: امسح Cache المتصفح قبل الاختبار!
echo.
pause
