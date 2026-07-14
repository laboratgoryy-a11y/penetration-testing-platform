@echo off
chcp 65001 >nul
echo.
echo ╔════════════════════════════════════════════════════════════╗
echo ║          🔧 اختبار الإصلاحات - Web Scanner + Network      ║
echo ╚════════════════════════════════════════════════════════════╝
echo.
echo 📋 الإصلاحات المطبقة:
echo    ✅ Web Scanner - تحسين الزحف إلى صفحات متعددة
echo    ✅ Network Analyzer - إصلاح هيكل البيانات
echo.
echo ═══════════════════════════════════════════════════════════
echo.

:MENU
echo.
echo اختر الاختبار:
echo.
echo [1] إعادة تشغيل الخادم
echo [2] اختبار Web Scanner (Console)
echo [3] اختبار Network Analyzer (Console)
echo [4] فتح المتصفح
echo [5] عرض ملف الإصلاحات
echo [0] خروج
echo.
set /p choice="اختيارك: "

if "%choice%"=="1" goto RESTART
if "%choice%"=="2" goto TEST_WEB
if "%choice%"=="3" goto TEST_NETWORK
if "%choice%"=="4" goto OPEN_BROWSER
if "%choice%"=="5" goto SHOW_FIXES
if "%choice%"=="0" goto END
goto MENU

:RESTART
echo.
echo 🔄 إعادة تشغيل الخادم...
echo.
taskkill /F /IM node.exe 2>nul
timeout /t 2 /nobreak >nul
start "Penetration Testing Server" cmd /k "npm start"
echo.
echo ✅ تم إعادة تشغيل الخادم
echo ⏳ انتظر 5 ثواني حتى يبدأ الخادم...
timeout /t 5 /nobreak
goto MENU

:TEST_WEB
echo.
echo 📊 اختبار Web Scanner:
echo.
echo 1. افتح المتصفح: http://localhost:3000
echo 2. سجل الدخول (admin / admin123)
echo 3. اضغط F12 لفتح Console
echo 4. اختر "بدء عملية جديدة" > "فحص الويب"
echo 5. اختر تصريح نشط
echo 6. أدخل URL: https://juice-shop.herokuapp.com
echo 7. ابدأ الفحص
echo.
echo 🔍 راقب Console للرسائل التالية:
echo    - "🕷️ Crawler starting..."
echo    - "📡 Phase 1: Crawling"
echo    - "✓ Crawling completed: X pages discovered"
echo    - "🔍 Phase 2: Testing vulnerabilities"
echo.
echo ✅ النتيجة المتوقعة:
echo    - 10-50 صفحة تم فحصها (بدلاً من 0)
echo    - اكتشاف ثغرات متنوعة
echo    - مدة الفحص: 30-120 ثانية
echo.
pause
goto MENU

:TEST_NETWORK
echo.
echo 📡 اختبار Network Analyzer:
echo.
echo 1. افتح المتصفح: http://localhost:3000
echo 2. سجل الدخول (admin / admin123)
echo 3. اضغط F12 لفتح Console
echo 4. اذهب إلى "تحليل الشبكات"
echo 5. اضغط "بدء عملية جديدة" > "تحليل الشبكة"
echo 6. املأ النموذج:
echo    - اختر تصريح نشط
echo    - BSSID: 00:11:22:33:44:55
echo    - SSID: TestNetwork
echo    - اختر نوع اختبار
echo 7. اضغط "بدء التحليل"
echo.
echo 🔍 راقب Console للرسائل التالية:
echo    - "Creating network test: { target: { ... } }"
echo    - "Network test created: { success: true }"
echo.
echo ✅ النتيجة المتوقعة:
echo    - رسالة نجاح: "تم بدء تحليل الشبكة بنجاح!"
echo    - الانتقال إلى صفحة Network
echo    - ظهور التحليل في القائمة
echo.
pause
goto MENU

:OPEN_BROWSER
echo.
echo 🌐 فتح المتصفح...
start http://localhost:3000
echo.
echo ✅ تم فتح المتصفح
echo 📝 بيانات الدخول:
echo    Username: admin
echo    Password: admin123
echo.
pause
goto MENU

:SHOW_FIXES
echo.
echo 📄 فتح ملف الإصلاحات...
start إصلاح-المشاكل-الحالية.md
goto MENU

:END
echo.
echo 👋 شكراً لاستخدام أداة الاختبار!
echo.
pause
exit
