@echo off
chcp 65001 >nul
title 🔍 اختبار فحص الويب المحسّن - جاهز للاستخدام!
color 0A

cls
echo.
echo ═══════════════════════════════════════════════════════════════════
echo.
echo            🔍 اختبار فحص الويب المحسّن
echo            ✅ تم إصلاح مشكلة التوقف عند 90%%
echo            ⚡ الآن يكتمل بنسبة 100%% بكفاءة عالية!
echo.
echo ═══════════════════════════════════════════════════════════════════
echo.
echo.

echo 📋 التحقق من المتطلبات...
echo.

REM التحقق من Node.js
where node >nul 2>&1
if %errorlevel% neq 0 (
    echo ❌ Node.js غير مثبت!
    echo    يرجى تثبيت Node.js من: https://nodejs.org/
    echo.
    pause
    exit /b 1
)
echo ✅ Node.js مثبت

REM التحقق من npm
where npm >nul 2>&1
if %errorlevel% neq 0 (
    echo ❌ npm غير مثبت!
    echo.
    pause
    exit /b 1
)
echo ✅ npm مثبت

echo.
echo ═══════════════════════════════════════════════════════════════════
echo.

echo 🔍 التحقق من حالة الخادم...
echo.

REM التحقق من تشغيل الخادم
curl -s http://localhost:3000 >nul 2>&1
if %errorlevel% neq 0 (
    echo ⚠️  الخادم غير مشغل!
    echo.
    echo 🚀 هل تريد تشغيل الخادم الآن؟
    echo    [1] نعم، شغل الخادم
    echo    [2] لا، سأشغله يدوياً
    echo.
    set /p choice="اختر (1 أو 2): "
    
    if "!choice!"=="1" (
        echo.
        echo 🚀 جاري تشغيل الخادم...
        start "Penetration Testing Server" cmd /k "npm start"
        echo.
        echo ⏳ انتظار تشغيل الخادم...
        timeout /t 10 >nul
        
        REM التحقق مرة أخرى
        curl -s http://localhost:3000 >nul 2>&1
        if %errorlevel% neq 0 (
            echo ❌ فشل تشغيل الخادم!
            echo    يرجى تشغيله يدوياً: npm start
            echo.
            pause
            exit /b 1
        )
        echo ✅ تم تشغيل الخادم بنجاح!
    ) else (
        echo.
        echo 📝 يرجى تشغيل الخادم يدوياً:
        echo    npm start
        echo.
        echo ثم قم بتشغيل هذا الملف مرة أخرى
        echo.
        pause
        exit /b 1
    )
) else (
    echo ✅ الخادم يعمل بنجاح على http://localhost:3000
)

echo.
echo ═══════════════════════════════════════════════════════════════════
echo.

echo 📂 فتح صفحة الاختبار المحسّنة...
echo.
timeout /t 2 >nul

start http://localhost:3000/test-web-scan-efficient.html

echo ✅ تم فتح صفحة الاختبار في المتصفح
echo.

echo ═══════════════════════════════════════════════════════════════════
echo.
echo                    🎯 التعليمات السريعة
echo ═══════════════════════════════════════════════════════════════════
echo.
echo 📝 الخطوات:
echo    1️⃣  أدخل رابط الموقع المستهدف
echo    2️⃣  اختر التصريح (إذا لم يكن لديك، أنشئ واحداً)
echo    3️⃣  اختر نوع الفحص:
echo        • سريع: 2-5 دقائق (50 طلب)
echo        • قياسي: 5-10 دقائق (100 طلب) ⭐ موصى به
echo        • عميق: 10-20 دقيقة (200 طلب)
echo    4️⃣  اضغط "بدء الفحص"
echo    5️⃣  راقب التقدم والسجلات
echo    6️⃣  اعرض النتائج
echo.
echo ═══════════════════════════════════════════════════════════════════
echo.
echo 🌐 مواقع اختبار موصى بها:
echo.
echo    1. OWASP Juice Shop ⭐
echo       https://owasp.org/www-project-juice-shop/
echo       الثغرات: 15-30 | الوقت: 10-15 دقيقة
echo.
echo    2. TestPHP Vulnweb
echo       http://testphp.vulnweb.com/
echo       الثغرات: 5-10 | الوقت: 5-10 دقائق
echo.
echo    3. Altoro Mutual
echo       http://demo.testfire.net/
echo       الثغرات: 10-20 | الوقت: 10-15 دقيقة
echo.
echo ═══════════════════════════════════════════════════════════════════
echo.
echo 💡 نصائح مهمة:
echo.
echo    ✅ افتح Console (F12) لرؤية السجلات المفصلة
echo    ✅ راقب التقدم بانتظام
echo    ✅ لا تغلق الصفحة أثناء الفحص
echo    ✅ احفظ التقرير للرجوع إليه
echo.
echo ═══════════════════════════════════════════════════════════════════
echo.
echo 🔗 روابط مفيدة:
echo.
echo    • صفحة الاختبار:
echo      http://localhost:3000/test-web-scan-efficient.html
echo.
echo    • إنشاء تصريح جديد:
echo      http://localhost:3000/إنشاء-تصريح-تجريبي.html
echo.
echo    • لوحة التحكم:
echo      http://localhost:3000/index.html
echo.
echo ═══════════════════════════════════════════════════════════════════
echo.
echo 📚 المزيد من المعلومات:
echo.
echo    • دليل شامل: دليل-فحص-الويب-المحسن.md
echo    • دليل سريع: ابدأ-فحص-الويب-الآن.md
echo    • تفاصيل التحسينات: WEB_SCAN_IMPROVEMENTS.md
echo    • ملخص الإصلاح: SCAN_FIXED_SUMMARY.md
echo.
echo ═══════════════════════════════════════════════════════════════════
echo.
echo ✨ الميزات الجديدة:
echo.
echo    ✅ الفحص يكتمل بنسبة 100%% (تم إصلاح مشكلة 90%%)
echo    ✅ تحديثات فورية كل ثانيتين
echo    ✅ سجلات مباشرة ومفصلة
echo    ✅ حفظ فوري للثغرات
echo    ✅ شريط تقدم دقيق
echo    ✅ واجهة جميلة وسهلة
echo    ✅ معالجة أخطاء شاملة
echo.
echo ═══════════════════════════════════════════════════════════════════
echo.
echo                    🎉 جاهز للاستخدام!
echo.
echo ═══════════════════════════════════════════════════════════════════
echo.
echo 📝 ملاحظة: لا تغلق هذه النافذة أثناء الفحص
echo.
echo اضغط أي زر للخروج (الخادم سيستمر في العمل)...
pause >nul

echo.
echo 👋 شكراً لاستخدام منصة اختبار الاختراق!
echo.
timeout /t 2 >nul
