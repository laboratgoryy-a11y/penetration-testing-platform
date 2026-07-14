@echo off
chcp 65001 >nul
color 0A
echo.
echo ════════════════════════════════════════════════════════════
echo    🌐 فحص شبكة faraa net
echo ════════════════════════════════════════════════════════════
echo.
echo 📡 معلومات الشبكة:
echo    الاسم: faraa net
echo    MAC: 4a:1f:4c:46:18:2b
echo    التشفير: WPA2/WPA3-Personal
echo    التردد: 2.4 GHz
echo.
echo ════════════════════════════════════════════════════════════
echo.

echo [1/3] 🔍 التحقق من الإعدادات...
if not exist .env (
    echo ❌ ملف .env غير موجود
    echo 💡 انسخ .env.example إلى .env
    pause
    exit /b 1
)
echo ✅ الإعدادات موجودة
echo.

echo [2/3] 📝 إنشاء تصريح لشبكة faraa net...
node create-faraa-net-authorization.js
if errorlevel 1 (
    echo.
    echo ❌ فشل إنشاء التصريح
    pause
    exit /b 1
)

echo.
echo ════════════════════════════════════════════════════════════
echo [3/3] ✅ النظام جاهز!
echo ════════════════════════════════════════════════════════════
echo.
echo 📝 الخطوات التالية:
echo.
echo 1️⃣  افتح المتصفح على:
echo    http://localhost:3000/test-network-analyzer.html
echo.
echo 2️⃣  الصق معرّف التصريح من الأعلى ☝
echo.
echo 3️⃣  اضغط "اكتشاف الشبكات"
echo    ستجد شبكة "faraa net" في القائمة
echo.
echo 4️⃣  اختر الشبكة واضغط "بدء الفحص"
echo.
echo 5️⃣  انتظر النتائج (2-10 دقائق)
echo.
echo ════════════════════════════════════════════════════════════
echo.
echo 💡 نصيحة: احفظ معرّف التصريح لاستخدامه لاحقاً
echo.
pause
