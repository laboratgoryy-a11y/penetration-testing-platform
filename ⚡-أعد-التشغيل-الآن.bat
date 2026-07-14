@echo off
chcp 65001 >nul
cls
echo.
echo ╔════════════════════════════════════════════════════════════╗
echo ║                                                            ║
echo ║              ⚡ إعادة تشغيل تلقائية - الآن ⚡              ║
echo ║                                                            ║
echo ╚════════════════════════════════════════════════════════════╝
echo.
echo 🔧 تم إصلاح المشكلة في الكود!
echo 📋 الآن نحتاج فقط لإعادة تشغيل الخادم
echo.
echo ═══════════════════════════════════════════════════════════
echo.

echo 🔴 الخطوة 1: إيقاف الخادم القديم...
taskkill /F /IM node.exe 2>nul
if %errorlevel% equ 0 (
    echo    ✅ تم إيقاف الخادم القديم
) else (
    echo    ⚠️ لم يكن هناك خادم يعمل
)

echo.
echo ⏳ الخطوة 2: انتظار 3 ثواني...
timeout /t 3 /nobreak >nul
echo    ✅ تم

echo.
echo 🚀 الخطوة 3: بدء الخادم الجديد...
start "Penetration Testing Server - NEW" cmd /k "npm start"
echo    ✅ تم بدء الخادم الجديد

echo.
echo ⏳ الخطوة 4: انتظار 10 ثواني حتى يبدأ الخادم...
echo.
for /L %%i in (10,-1,1) do (
    <nul set /p="    ⏳ %%i ثواني متبقية...   "
    timeout /t 1 /nobreak >nul
    echo.
)

echo.
echo ╔════════════════════════════════════════════════════════════╗
echo ║                  ✅ الخادم جاهز الآن!                     ║
echo ╚════════════════════════════════════════════════════════════╝
echo.
echo 🌐 الخطوة 5: افتح المتصفح
echo    URL: http://localhost:3000
echo.
echo 🔑 الخطوة 6: سجل الدخول
echo    Username: admin
echo    Password: admin123
echo.
echo 🧹 الخطوة 7: امسح Cache المتصفح
echo    1. اضغط: Ctrl + Shift + Delete
echo    2. اختر: "Cached images and files"
echo    3. اضغط: "Clear data"
echo    4. اضغط: Ctrl + F5 (إعادة تحميل)
echo.
echo 🎯 الخطوة 8: جرب Network Analyzer
echo    1. اذهب إلى "تحليل الشبكات"
echo    2. "بدء عملية جديدة" ^> "تحليل الشبكة"
echo    3. املأ النموذج:
echo       - اختر تصريح نشط
echo       - BSSID: 4a:1f:4c:46:18:2b
echo       - SSID: faraa net
echo       - اختر نوع اختبار
echo    4. اضغط "بدء التحليل"
echo.
echo ═══════════════════════════════════════════════════════════
echo.
echo ✅ النتيجة المتوقعة:
echo    • رسالة نجاح: "تم بدء تحليل الشبكة بنجاح!"
echo    • الانتقال إلى صفحة Network
echo    • التحليل يظهر في القائمة
echo    • لا أخطاء في Console
echo.
echo ═══════════════════════════════════════════════════════════
echo.
echo 💡 نصيحة: افتح Console (F12) قبل الاختبار لرؤية التفاصيل
echo.
pause
