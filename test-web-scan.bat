@echo off
chcp 65001 >nul
title اختبار فحص الويب المحسّن
color 0A

echo.
echo ═══════════════════════════════════════════════════════════
echo            🔍 اختبار فحص الويب المحسّن
echo ═══════════════════════════════════════════════════════════
echo.

echo [1/3] التحقق من تشغيل الخادم...
timeout /t 2 >nul

curl -s http://localhost:3000 >nul 2>&1
if %errorlevel% neq 0 (
    echo ❌ الخادم غير مشغل!
    echo.
    echo يرجى تشغيل الخادم أولاً:
    echo    npm start
    echo.
    pause
    exit /b 1
)

echo ✅ الخادم يعمل بنجاح
echo.

echo [2/3] فتح صفحة الاختبار...
timeout /t 1 >nul

start http://localhost:3000/test-web-scan-efficient.html

echo ✅ تم فتح صفحة الاختبار
echo.

echo [3/3] فتح Console للسجلات...
echo.
echo 📝 نصائح:
echo    - اضغط F12 في المتصفح لفتح Console
echo    - راقب السجلات المفصلة
echo    - لا تغلق هذه النافذة أثناء الفحص
echo.

echo ═══════════════════════════════════════════════════════════
echo                    ✅ جاهز للاختبار!
echo ═══════════════════════════════════════════════════════════
echo.
echo الخطوات التالية:
echo    1. أدخل رابط الموقع المستهدف
echo    2. اختر التصريح
echo    3. اختر نوع الفحص (قياسي موصى به)
echo    4. اضغط "بدء الفحص"
echo    5. راقب التقدم والسجلات
echo.
echo مواقع اختبار موصى بها:
echo    - https://owasp.org/www-project-juice-shop/
echo    - http://testphp.vulnweb.com/
echo    - http://demo.testfire.net/
echo.
echo ═══════════════════════════════════════════════════════════
echo.

pause
