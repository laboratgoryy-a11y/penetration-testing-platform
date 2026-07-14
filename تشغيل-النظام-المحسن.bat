@echo off
chcp 65001 >nul
title 🚀 منصة اختبار الاختراق - قائمة التحكم المحسّنة
color 0A

:MENU
cls
echo ═══════════════════════════════════════════════════════════════════
echo            🚀 منصة اختبار الاختراق - قائمة التحكم
echo ═══════════════════════════════════════════════════════════════════
echo.
echo   🎯 التشغيل السريع:
echo   ─────────────────────────────────────────────────────────────
echo   [1] تشغيل النظام الكامل (الخادم + الواجهة)
echo   [2] تشغيل الخادم فقط
echo   [3] فتح الواجهة في المتصفح
echo.
echo   🔍 اختبار فحص الويب المحسّن:
echo   ─────────────────────────────────────────────────────────────
echo   [9] اختبار فحص الويب المحسّن ⭐ جديد!
echo.
echo   ⚙️  إدارة النظام:
echo   ─────────────────────────────────────────────────────────────
echo   [4] إعادة تشغيل النظام
echo   [5] إيقاف النظام الكامل
echo   [6] عرض حالة النظام
echo   [7] اختبار الاتصال
echo   [8] فتح أدوات التتبع والاختبار
echo.
echo   [0] خروج
echo.
echo ═══════════════════════════════════════════════════════════════════
echo.
set /p choice="اختر رقم الخيار: "

if "%choice%"=="1" goto START_FULL
if "%choice%"=="2" goto START_SERVER
if "%choice%"=="3" goto OPEN_BROWSER
if "%choice%"=="4" goto RESTART
if "%choice%"=="5" goto STOP
if "%choice%"=="6" goto STATUS
if "%choice%"=="7" goto TEST_CONNECTION
if "%choice%"=="8" goto DEBUG_TOOLS
if "%choice%"=="9" goto WEB_SCAN_TEST
if "%choice%"=="0" goto EXIT
goto MENU

:START_FULL
cls
echo ═══════════════════════════════════════════════════════════════════
echo                      🚀 تشغيل النظام الكامل
echo ═══════════════════════════════════════════════════════════════════
echo.
echo [1/4] جاري إيقاف العمليات القديمة...
taskkill /F /IM node.exe >nul 2>&1
timeout /t 2 /nobreak >nul
echo ✅ تم إيقاف العمليات القديمة

echo.
echo [2/4] جاري تشغيل الخادم...
set PORT=3000
start "Penetration Testing Server" cmd /k "color 0A && echo ═══════════════════════════════════════════════════════════════════ && echo            🚀 خادم منصة اختبار الاختراق && echo ═══════════════════════════════════════════════════════════════════ && echo. && echo ✅ الخادم يعمل على المنفذ 3000 && echo 🌐 الرابط: http://localhost:3000 && echo. && echo 📝 لإيقاف الخادم: اضغط Ctrl+C && echo ═══════════════════════════════════════════════════════════════════ && echo. && node server-sqlite.js"

echo ✅ تم تشغيل الخادم

echo.
echo [3/4] جاري الانتظار لتشغيل الخادم...
timeout /t 8 /nobreak >nul
echo ✅ الخادم جاهز

echo.
echo [4/4] جاري فتح الواجهة في المتصفح...
start http://localhost:3000/login.html
timeout /t 2 /nobreak >nul
echo ✅ تم فتح الواجهة

echo.
echo ═══════════════════════════════════════════════════════════════════
echo                    ✅ تم تشغيل النظام بنجاح!
echo ═══════════════════════════════════════════════════════════════════
echo.
echo 🌐 روابط النظام:
echo    • صفحة تسجيل الدخول: http://localhost:3000/login.html
echo    • الواجهة الرئيسية: http://localhost:3000/index.html
echo    • فحص الويب المحسّن: http://localhost:3000/test-web-scan-efficient.html
echo.
echo 🔑 بيانات الدخول:
echo    • اسم المستخدم: admin
echo    • كلمة المرور: password
echo.
echo 💡 نصيحة: اضغط F12 في المتصفح لفتح Console ورؤية السجلات
echo ═══════════════════════════════════════════════════════════════════
echo.
pause
goto MENU

:START_SERVER
cls
echo ═══════════════════════════════════════════════════════════════════
echo                      🚀 تشغيل الخادم فقط
echo ═══════════════════════════════════════════════════════════════════
echo.
echo جاري إيقاف العمليات القديمة...
taskkill /F /IM node.exe >nul 2>&1
timeout /t 2 /nobreak >nul

echo جاري تشغيل الخادم...
set PORT=3000
start "Penetration Testing Server" cmd /k "color 0A && echo ═══════════════════════════════════════════════════════════════════ && echo            🚀 خادم منصة اختبار الاختراق && echo ═══════════════════════════════════════════════════════════════════ && echo. && echo ✅ الخادم يعمل على المنفذ 3000 && echo 🌐 الرابط: http://localhost:3000 && echo. && echo 📝 لإيقاف الخادم: اضغط Ctrl+C && echo ═══════════════════════════════════════════════════════════════════ && echo. && node server-sqlite.js"

echo.
echo ✅ تم تشغيل الخادم على المنفذ 3000
echo.
echo للوصول إلى الواجهة، اختر الخيار [3] من القائمة
echo.
pause
goto MENU

:OPEN_BROWSER
cls
echo ═══════════════════════════════════════════════════════════════════
echo                    🌐 فتح الواجهة في المتصفح
echo ═══════════════════════════════════════════════════════════════════
echo.
echo جاري التحقق من الخادم...
curl -s http://localhost:3000 >nul 2>&1
if errorlevel 1 (
    echo ❌ الخادم لا يعمل!
    echo.
    echo يرجى تشغيل الخادم أولاً باختيار الخيار [1] أو [2]
    echo.
    pause
    goto MENU
)

echo ✅ الخادم يعمل بشكل صحيح
echo.
echo جاري فتح الواجهة...
start http://localhost:3000/login.html
echo.
echo ✅ تم فتح الواجهة في المتصفح
echo.
pause
goto MENU

:WEB_SCAN_TEST
cls
echo ═══════════════════════════════════════════════════════════════════
echo              🔍 اختبار فحص الويب المحسّن ⭐
echo ═══════════════════════════════════════════════════════════════════
echo.
echo جاري التحقق من الخادم...
curl -s http://localhost:3000 >nul 2>&1
if errorlevel 1 (
    echo ❌ الخادم لا يعمل!
    echo.
    echo هل تريد تشغيل الخادم الآن؟
    set /p start_choice="[Y] نعم  [N] لا: "
    
    if /i "!start_choice!"=="Y" (
        echo.
        echo جاري تشغيل الخادم...
        set PORT=3000
        start "Penetration Testing Server" cmd /k "color 0A && echo ═══════════════════════════════════════════════════════════════════ && echo            🚀 خادم منصة اختبار الاختراق && echo ═══════════════════════════════════════════════════════════════════ && echo. && echo ✅ الخادم يعمل على المنفذ 3000 && echo 🌐 الرابط: http://localhost:3000 && echo. && node server-sqlite.js"
        
        echo جاري الانتظار...
        timeout /t 8 /nobreak >nul
    ) else (
        pause
        goto MENU
    )
)

echo ✅ الخادم يعمل
echo.
echo جاري فتح صفحة اختبار فحص الويب المحسّنة...
start http://localhost:3000/test-web-scan-efficient.html

echo.
echo ═══════════════════════════════════════════════════════════════════
echo                    ✅ تم فتح صفحة الاختبار!
echo ═══════════════════════════════════════════════════════════════════
echo.
echo 📝 الخطوات:
echo    1️⃣  أدخل رابط الموقع المستهدف
echo    2️⃣  اختر التصريح (أو أنشئ واحداً جديداً)
echo    3️⃣  اختر نوع الفحص (قياسي موصى به)
echo    4️⃣  اضغط "بدء الفحص"
echo    5️⃣  راقب التقدم والسجلات
echo    6️⃣  اعرض النتائج
echo.
echo 🌐 مواقع اختبار موصى بها:
echo    • OWASP Juice Shop: https://owasp.org/www-project-juice-shop/
echo    • TestPHP: http://testphp.vulnweb.com/
echo    • Altoro Mutual: http://demo.testfire.net/
echo.
echo 💡 نصيحة: اضغط F12 لفتح Console ورؤية السجلات المفصلة
echo ═══════════════════════════════════════════════════════════════════
echo.
pause
goto MENU

:RESTART
cls
echo ═══════════════════════════════════════════════════════════════════
echo                      🔄 إعادة تشغيل النظام
echo ═══════════════════════════════════════════════════════════════════
echo.
echo جاري إيقاف النظام...
taskkill /F /IM node.exe >nul 2>&1
timeout /t 2 /nobreak >nul
echo ✅ تم إيقاف النظام

echo.
echo جاري تشغيل النظام...
set PORT=3000
start "Penetration Testing Server" cmd /k "color 0A && echo ═══════════════════════════════════════════════════════════════════ && echo            🚀 خادم منصة اختبار الاختراق && echo ═══════════════════════════════════════════════════════════════════ && echo. && echo ✅ الخادم يعمل على المنفذ 3000 && echo 🌐 الرابط: http://localhost:3000 && echo. && node server-sqlite.js"
timeout /t 5 /nobreak >nul

echo.
echo ✅ تم إعادة تشغيل النظام بنجاح
echo.
pause
goto MENU

:STOP
cls
echo ═══════════════════════════════════════════════════════════════════
echo                      ⏹️  إيقاف النظام الكامل
echo ═══════════════════════════════════════════════════════════════════
echo.
echo جاري إيقاف جميع عمليات Node.js...
taskkill /F /IM node.exe >nul 2>&1

if errorlevel 1 (
    echo ℹ️  لا توجد عمليات قيد التشغيل
) else (
    echo ✅ تم إيقاف النظام بنجاح
)
echo.
pause
goto MENU

:STATUS
cls
echo ═══════════════════════════════════════════════════════════════════
echo                        📊 حالة النظام
echo ═══════════════════════════════════════════════════════════════════
echo.
echo جاري التحقق من الخادم...
curl -s http://localhost:3000 >nul 2>&1
if errorlevel 1 (
    echo ❌ الخادم: غير متصل
    echo.
    echo العمليات النشطة:
    tasklist | findstr node.exe
    if errorlevel 1 (
        echo   لا توجد عمليات Node.js قيد التشغيل
    )
) else (
    echo ✅ الخادم: يعمل بشكل صحيح
    echo ✅ المنفذ: 3000
    echo ✅ الرابط: http://localhost:3000
    echo.
    echo العمليات النشطة:
    tasklist | findstr node.exe
)
echo.
echo ═══════════════════════════════════════════════════════════════════
echo قاعدة البيانات:
if exist penetration_testing.db (
    echo   ✅ قاعدة البيانات موجودة
) else (
    echo   ⚠️  قاعدة البيانات غير موجودة
)
echo ═══════════════════════════════════════════════════════════════════
echo.
pause
goto MENU

:TEST_CONNECTION
cls
echo ═══════════════════════════════════════════════════════════════════
echo                      🔌 اختبار الاتصال
echo ═══════════════════════════════════════════════════════════════════
echo.
echo 1. اختبار الخادم الرئيسي...
curl -s http://localhost:3000 >nul 2>&1
if errorlevel 1 (
    echo    ❌ فشل الاتصال بالخادم
) else (
    echo    ✅ الخادم يعمل
)

echo.
echo 2. اختبار API...
curl -s http://localhost:3000/api/v1/scans/web >nul 2>&1
if errorlevel 1 (
    echo    ❌ فشل الاتصال بـ API
) else (
    echo    ✅ API يعمل
)

echo.
echo 3. اختبار قاعدة البيانات...
if exist penetration_testing.db (
    echo    ✅ قاعدة البيانات موجودة
) else (
    echo    ❌ قاعدة البيانات غير موجودة
)

echo.
echo ═══════════════════════════════════════════════════════════════════
pause
goto MENU

:DEBUG_TOOLS
cls
echo ═══════════════════════════════════════════════════════════════════
echo                    🛠️  أدوات التتبع والاختبار
echo ═══════════════════════════════════════════════════════════════════
echo.
echo جاري التحقق من الخادم...
curl -s http://localhost:3000 >nul 2>&1
if errorlevel 1 (
    echo ❌ الخادم لا يعمل!
    echo.
    echo يرجى تشغيل الخادم أولاً
    echo.
    pause
    goto MENU
)

echo ✅ الخادم يعمل
echo.
echo جاري فتح أدوات التتبع...
echo.
echo   [1] أداة تتبع المسار الكامل
start http://localhost:3000/debug-scan-flow.html
timeout /t 1 /nobreak >nul

echo   [2] أداة اختبار API
start http://localhost:3000/test-vuln-api.html
timeout /t 1 /nobreak >nul

echo   [3] أداة اختبار النتائج
start http://localhost:3000/test-scan-results.html
timeout /t 1 /nobreak >nul

echo   [4] أداة فحص الويب المحسّنة ⭐
start http://localhost:3000/test-web-scan-efficient.html
timeout /t 1 /nobreak >nul

echo.
echo ✅ تم فتح جميع أدوات التتبع
echo.
echo 💡 ملاحظة: افتح Console في المتصفح (F12) لرؤية السجلات التفصيلية
echo ═══════════════════════════════════════════════════════════════════
echo.
pause
goto MENU

:EXIT
cls
echo ═══════════════════════════════════════════════════════════════════
echo                          👋 الخروج
echo ═══════════════════════════════════════════════════════════════════
echo.
echo هل تريد إيقاف النظام قبل الخروج؟
echo.
set /p stop_choice="[Y] نعم  [N] لا: "

if /i "%stop_choice%"=="Y" (
    echo.
    echo جاري إيقاف النظام...
    taskkill /F /IM node.exe >nul 2>&1
    echo ✅ تم إيقاف النظام
    timeout /t 2 /nobreak >nul
)

echo.
echo ═══════════════════════════════════════════════════════════════════
echo            شكراً لاستخدام منصة اختبار الاختراق! 🎉
echo ═══════════════════════════════════════════════════════════════════
echo.
timeout /t 2 /nobreak >nul
exit
