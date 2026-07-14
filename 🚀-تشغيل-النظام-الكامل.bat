@echo off
chcp 65001 >nul
title 🚀 تشغيل نظام تحليل الشبكات الكامل

cls
echo ═══════════════════════════════════════════════════════════════
echo         🚀 تشغيل نظام تحليل الشبكات الكامل
echo ═══════════════════════════════════════════════════════════════
echo.

REM الخطوة 1: إيقاف العمليات القديمة
echo [1/5] إيقاف العمليات القديمة...
taskkill /F /IM node.exe >nul 2>&1
timeout /t 2 /nobreak >nul
echo ✓ تم إيقاف العمليات القديمة
echo.

REM الخطوة 2: تشغيل السيرفر
echo [2/5] تشغيل السيرفر...
set PORT=3000
start "Network Analysis Server" cmd /k "echo ═══════════════════════════════════════════════════════════════ && echo         🌐 سيرفر تحليل الشبكات && echo ═══════════════════════════════════════════════════════════════ && echo. && echo ✓ السيرفر يعمل على المنفذ 3000 && echo ✓ الرابط: http://localhost:3000 && echo. && node server-sqlite.js"
timeout /t 5 /nobreak >nul
echo ✓ تم تشغيل السيرفر
echo.

REM الخطوة 3: التحقق من السيرفر
echo [3/5] التحقق من السيرفر...
curl -s http://localhost:3000 >nul 2>&1
if errorlevel 1 (
    echo ❌ فشل الاتصال بالسيرفر!
    echo.
    echo يرجى التحقق من:
    echo   - Node.js مثبت
    echo   - المنفذ 3000 متاح
    echo   - ملف server-sqlite.js موجود
    echo.
    pause
    exit /b 1
)
echo ✓ السيرفر يعمل بشكل صحيح
echo.

REM الخطوة 4: فتح المتصفح
echo [4/5] فتح المتصفح...
start http://localhost:3000/login.html
timeout /t 2 /nobreak >nul
echo ✓ تم فتح المتصفح
echo.

REM الخطوة 5: عرض المعلومات
echo [5/5] النظام جاهز!
echo.
echo ═══════════════════════════════════════════════════════════════
echo         ✅ تم تشغيل النظام بنجاح!
echo ═══════════════════════════════════════════════════════════════
echo.
echo 🌐 الروابط:
echo    السيرفر: http://localhost:3000
echo    تسجيل الدخول: http://localhost:3000/login.html
echo    الواجهة الرئيسية: http://localhost:3000/index.html
echo.
echo 📋 بيانات الدخول:
echo    اسم المستخدم: admin
echo    كلمة المرور: password
echo.
echo 🛠️ الأدوات المتاحة:
echo    1. الفحص السريع: node quick-network-scan.js "SSID" "BSSID" "auth-id"
echo    2. المراقب: node network-monitor.js
echo    3. التقارير: node generate-network-report.js session-id report.html
echo.
echo 📚 الوثائق:
echo    - ⭐-ابدأ-من-هنا-الآن.txt
echo    - 🚀-ابدأ-الآن-دليل-سريع.md
echo    - ✅-الملخص-النهائي-الشامل.md
echo.
echo ═══════════════════════════════════════════════════════════════
echo.
echo 💡 نصيحة: لتفعيل البيانات التجريبية، شغّل:
echo    ⚡-تفعيل-البيانات-التجريبية.bat
echo.
echo ═══════════════════════════════════════════════════════════════
echo.
pause
