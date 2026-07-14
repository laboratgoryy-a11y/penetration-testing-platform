@echo off
chcp 65001 >nul
echo ========================================
echo 🌐 تشغيل نظام تحليل الشبكات
echo ========================================
echo.

echo 📋 الخطوة 1: التحقق من الإعدادات...
if not exist .env (
    echo ❌ ملف .env غير موجود
    echo 💡 انسخ .env.example إلى .env أولاً
    pause
    exit /b 1
)

echo ✅ ملف .env موجود
echo.

echo 📋 الخطوة 2: إنشاء تصريح تجريبي...
node create-network-authorization.js
if errorlevel 1 (
    echo.
    echo ❌ فشل إنشاء التصريح
    echo 💡 تأكد من تشغيل MySQL وصحة بيانات الاتصال
    pause
    exit /b 1
)

echo.
echo ========================================
echo ✅ النظام جاهز!
echo ========================================
echo.
echo 📝 الخطوات التالية:
echo.
echo 1. افتح المتصفح على:
echo    http://localhost:3000/test-network-analyzer.html
echo.
echo 2. الصق معرّف التصريح من الأعلى
echo.
echo 3. اضغط "اكتشاف الشبكات"
echo.
echo 4. ابدأ الفحص!
echo.
echo ========================================
echo.
pause
