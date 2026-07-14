@echo off
chcp 65001 >nul
title تشغيل محسّن - منصة اختبار الاختراق
color 0A

echo.
echo ╔════════════════════════════════════════════════════════════╗
echo ║         تشغيل محسّن - منصة اختبار الاختراق                ║
echo ╚════════════════════════════════════════════════════════════╝
echo.

REM التحقق من Node.js
echo [1/6] التحقق من Node.js...
where node >nul 2>&1
if %errorlevel% neq 0 (
    echo ❌ Node.js غير مثبت!
    echo.
    echo يرجى تثبيت Node.js من: https://nodejs.org
    pause
    exit /b 1
)
node --version
echo ✓ Node.js مثبت

echo.
echo [2/6] التحقق من الملفات المطلوبة...
if not exist "server-sqlite.js" (
    echo ❌ ملف server-sqlite.js غير موجود!
    pause
    exit /b 1
)
if not exist "simple-ip-scanner.js" (
    echo ❌ ملف simple-ip-scanner.js غير موجود!
    pause
    exit /b 1
)
if not exist "advanced-web-scanner.js" (
    echo ❌ ملف advanced-web-scanner.js غير موجود!
    pause
    exit /b 1
)
echo ✓ جميع الملفات موجودة

echo.
echo [3/6] التحقق من المكتبات...
if not exist "node_modules" (
    echo ⚠ المكتبات غير مثبتة - جاري التثبيت...
    call npm install
    if %errorlevel% neq 0 (
        echo ❌ فشل تثبيت المكتبات!
        pause
        exit /b 1
    )
)
echo ✓ المكتبات مثبتة

echo.
echo [4/6] إيقاف العمليات القديمة...
taskkill /F /IM node.exe >nul 2>&1
timeout /t 2 /nobreak >nul
echo ✓ تم

echo.
echo [5/6] تشغيل الخادم...
set PORT=3001
start "Penetration Testing Server" cmd /k "title Server - Port 3001 && color 0B && echo ════════════════════════════════════════ && echo    الخادم يعمل على المنفذ 3001 && echo ════════════════════════════════════════ && echo. && node server-sqlite.js"

echo.
echo [6/6] انتظار تشغيل الخادم...
timeout /t 6 /nobreak >nul

REM التحقق من أن الخادم يعمل
echo.
echo التحقق من حالة الخادم...
powershell -Command "try { $response = Invoke-WebRequest -Uri 'http://localhost:3001/health' -TimeoutSec 5 -UseBasicParsing; if ($response.StatusCode -eq 200) { exit 0 } else { exit 1 } } catch { exit 1 }"

if %errorlevel% equ 0 (
    echo ✓ الخادم يعمل بنجاح!
    echo.
    echo ╔════════════════════════════════════════════════════════════╗
    echo ║                  ✓ النظام جاهز للاستخدام                 ║
    echo ╚════════════════════════════════════════════════════════════╝
    echo.
    echo 🌐 رابط النظام: http://localhost:3001
    echo 🔐 صفحة الدخول: http://localhost:3001/login.html
    echo 📊 الواجهة: http://localhost:3001/index.html
    echo.
    echo ════════════════════════════════════════════════════════════
    echo بيانات الدخول:
    echo   👤 اسم المستخدم: admin
    echo   🔑 كلمة المرور: password
    echo ════════════════════════════════════════════════════════════
    echo.
    echo اضغط على أي زر لفتح المتصفح...
    pause >nul
    start http://localhost:3001/login.html
    echo.
    echo ✓ تم فتح المتصفح
    echo.
    echo يمكنك إغلاق هذه النافذة الآن
    echo نافذة الخادم ستبقى مفتوحة في الخلفية
    echo.
) else (
    echo ❌ فشل تشغيل الخادم!
    echo.
    echo يرجى التحقق من:
    echo   1. نافذة الخادم للأخطاء
    echo   2. المنفذ 3001 غير مستخدم
    echo   3. ملف server-sqlite.js صحيح
    echo.
    echo للمساعدة، شغل: check-server.bat
    echo.
)

pause
