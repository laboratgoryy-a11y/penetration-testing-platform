@echo off
chcp 65001 >nul
title منصة اختبار الاختراق - قائمة التحكم

:MENU
cls
echo ============================================================
echo           منصة اختبار الاختراق - قائمة التحكم
echo ============================================================
echo.
echo   [1] تشغيل النظام الكامل (الخادم + الواجهة)
echo   [2] تشغيل الخادم فقط
echo   [3] فتح الواجهة في المتصفح
echo   [4] إعادة تشغيل النظام
echo   [5] إيقاف النظام الكامل
echo   [6] عرض حالة النظام
echo   [7] اختبار الاتصال
echo   [8] فتح أدوات التتبع والاختبار
echo   [0] خروج
echo.
echo ============================================================
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
if "%choice%"=="0" goto EXIT
goto MENU

:START_FULL
cls
echo ============================================================
echo تشغيل النظام الكامل
echo ============================================================
echo.
echo جاري إيقاف العمليات القديمة...
taskkill /F /IM node.exe >nul 2>&1
timeout /t 2 /nobreak >nul

echo جاري تشغيل الخادم...
set PORT=3001
start "Penetration Testing Server" cmd /k "echo الخادم يعمل على المنفذ 3001 && node server-sqlite.js"

echo جاري الانتظار لتشغيل الخادم...
timeout /t 5 /nobreak >nul

echo جاري فتح الواجهة في المتصفح...
start http://localhost:3001/login.html

echo.
echo ============================================================
echo ✓ تم تشغيل النظام بنجاح!
echo ============================================================
echo.
echo رابط النظام: http://localhost:3001
echo صفحة تسجيل الدخول: http://localhost:3001/login.html
echo الواجهة الرئيسية: http://localhost:3001/index.html
echo.
echo بيانات الدخول:
echo   اسم المستخدم: admin
echo   كلمة المرور: password
echo ============================================================
echo.
pause
goto MENU

:START_SERVER
cls
echo ============================================================
echo تشغيل الخادم فقط
echo ============================================================
echo.
echo جاري إيقاف العمليات القديمة...
taskkill /F /IM node.exe >nul 2>&1
timeout /t 2 /nobreak >nul

echo جاري تشغيل الخادم...
set PORT=3001
start "Penetration Testing Server" cmd /k "echo الخادم يعمل على المنفذ 3001 && node server-sqlite.js"

echo.
echo ✓ تم تشغيل الخادم على المنفذ 3001
echo.
echo للوصول إلى الواجهة، اختر الخيار [3] من القائمة
echo.
pause
goto MENU

:OPEN_BROWSER
cls
echo ============================================================
echo فتح الواجهة في المتصفح
echo ============================================================
echo.
echo جاري التحقق من الخادم...
curl -s http://localhost:3001 >nul 2>&1
if errorlevel 1 (
    echo ❌ الخادم لا يعمل!
    echo.
    echo يرجى تشغيل الخادم أولاً باختيار الخيار [1] أو [2]
    echo.
    pause
    goto MENU
)

echo ✓ الخادم يعمل بشكل صحيح
echo.
echo جاري فتح الواجهة...
start http://localhost:3001/login.html
echo.
echo ✓ تم فتح الواجهة   المتصفح
echo.
pause
goto MENU

:RESTART
cls
echo ============================================================
echo إعادة تشغيل النظام
echo ============================================================
echo.
echo جاري إيقاف النظام...
taskkill /F /IM node.exe >nul 2>&1
timeout /t 2 /nobreak >nul
echo ✓ تم إيقاف النظام

echo.
echo جاري تشغيل النظام...
set PORT=3001
start "Penetration Testing Server" cmd /k "echo الخادم يعمل على المنفذ 3001 && node server-sqlite.js"
timeout /t 5 /nobreak >nul

echo.
echo ✓ تم إعادة تشغيل النظام بنجاح
echo.
pause
goto MENU

:STOP
cls
echo ============================================================
echo إيقاف النظام الكامل
echo ============================================================
echo.
echo جاري إيقاف جميع عمليات Node.js...
taskkill /F /IM node.exe >nul 2>&1

if errorlevel 1 (
    echo ℹ️ لا توجد عمليات قيد التشغيل
) else (
    echo ✓ تم إيقاف النظام بنجاح
)
echo.
pause
goto MENU

:STATUS
cls
echo ============================================================
echo حالة النظام
echo ============================================================
echo.
echo جاري التحقق من الخادم...
curl -s http://localhost:3001 >nul 2>&1
if errorlevel 1 (
    echo ❌ الخادم: غير متصل
    echo.
    echo العمليات النشطة:
    tasklist | findstr node.exe
    if errorlevel 1 (
        echo   لا توجد عمليات Node.js قيد التشغيل
    )
) else (
    echo ✓ الخادم: يعمل بشكل صحيح
    echo ✓ المنفذ: 3001
    echo ✓ الرابط: http://localhost:3001
    echo.
    echo العمليات النشطة:
    tasklist | findstr node.exe
)
echo.
echo ============================================================
echo قاعدة البيانات:
sqlite3 penetration_testing.db "SELECT COUNT(*) || ' فحص' as total FROM scan_sessions;" 2>nul
if errorlevel 1 (
    echo   ⚠️ لا يمكن الوصول إلى قاعدة البيانات
) else (
    echo   ✓ قاعدة البيانات متاحة
)
echo ============================================================
echo.
pause
goto MENU

:TEST_CONNECTION
cls
echo ============================================================
echo اختبار الاتصال
echo ============================================================
echo.
echo 1. اختبار الخادم الرئيسي...
curl -s http://localhost:3001 >nul 2>&1
if errorlevel 1 (
    echo    ❌ فشل الاتصال بالخادم
) else (
    echo    ✓ الخادم يعمل
)

echo.
echo 2. اختبار API...
curl -s http://localhost:3001/api/v1/scans/web >nul 2>&1
if errorlevel 1 (
    echo    ❌ فشل الاتصال بـ API
) else (
    echo    ✓ API يعمل
)

echo.
echo 3. اختبار قاعدة البيانات...
sqlite3 penetration_testing.db "SELECT 1;" >nul 2>&1
if errorlevel 1 (
    echo    ❌ فشل الاتصال بقاعدة البيانات
) else (
    echo    ✓ قاعدة البيانات تعمل
)

echo.
echo ============================================================
pause
goto MENU

:DEBUG_TOOLS
cls
echo ============================================================
echo أدوات التتبع والاختبار
echo ============================================================
echo.
echo جاري التحقق من الخادم...
curl -s http://localhost:3001 >nul 2>&1
if errorlevel 1 (
    echo ❌ الخادم لا يعمل!
    echo.
    echo يرجى تشغيل الخادم أولاً
    echo.
    pause
    goto MENU
)

echo ✓ الخادم يعمل
echo.
echo جاري فتح أدوات التتبع...
echo.
echo   [1] أداة تتبع المسار الكامل
start http://localhost:3001/debug-scan-flow.html
timeout /t 1 /nobreak >nul

echo   [2] أداة اختبار API
start http://localhost:3001/test-vuln-api.html
timeout /t 1 /nobreak >nul

echo   [3] أداة اختبار النتائج
start http://localhost:3001/test-scan-results.html
timeout /t 1 /nobreak >nul

echo.
echo ✓ تم فتح جميع أدوات التتبع
echo.
echo ملاحظة: افتح Console في المتصفح (F12) لرؤية السجلات التفصيلية
echo.
pause
goto MENU

:EXIT
cls
echo ============================================================
echo هل تريد إيقاف النظام قبل الخروج؟
echo ============================================================
echo.
set /p stop_choice="[Y] نعم  [N] لا: "

if /i "%stop_choice%"=="Y" (
    echo.
    echo جاري إيقاف النظام...
    taskkill /F /IM node.exe >nul 2>&1
    echo ✓ تم إيقاف النظام
    timeout /t 2 /nobreak >nul
)

echo.
echo شكراً لاستخدام منصة اختبار الاختراق
echo.
exit
