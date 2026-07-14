@echo off
chcp 65001 >nul
cls

echo ╔════════════════════════════════════════════════════════════╗
echo ║                                                            ║
echo ║   🚀 تشغيل منصة اختبار الاختراق - النسخة النهائية       ║
echo ║                                                            ║
echo ╚════════════════════════════════════════════════════════════╝
echo.

echo [1/3] التحقق من Node.js...
where node >nul 2>&1
if %errorlevel% neq 0 (
    echo ❌ Node.js غير مثبت!
    echo يرجى تثبيت Node.js من: https://nodejs.org
    pause
    exit /b 1
)
echo ✅ Node.js مثبت

echo.
echo [2/3] التحقق من MySQL...
echo ⚠️  تأكد من تشغيل XAMPP وأن MySQL يعمل على المنفذ 3306
echo.

echo [3/3] بدء الخادم...
echo.
echo ╔════════════════════════════════════════════════════════════╗
echo ║  الخادم يعمل الآن على:                                   ║
echo ║  http://localhost:3001                                     ║
echo ║                                                            ║
echo ║  افتح المتصفح واذهب إلى:                                 ║
echo ║  http://localhost:3001/login.html                          ║
echo ║                                                            ║
echo ║  بيانات الدخول:                                          ║
echo ║  اسم المستخدم: admin                                     ║
echo ║  كلمة المرور: 123456                                     ║
echo ║                                                            ║
echo ║  لإيقاف الخادم: اضغط Ctrl+C                              ║
echo ╚════════════════════════════════════════════════════════════╝
echo.

node server-full-mysql.js

pause
