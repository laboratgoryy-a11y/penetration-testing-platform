@echo off
chcp 65001 >nul
color 0B
cls

echo.
echo ╔════════════════════════════════════════════════════════════╗
echo ║                                                            ║
echo ║        🔧 تثبيت MySQL للنظام - XAMPP Setup 🔧            ║
echo ║                                                            ║
echo ╚════════════════════════════════════════════════════════════╝
echo.
echo.

echo [الخطوة 1/5] التحقق من XAMPP...
echo.

if exist "C:\xampp\mysql\bin\mysql.exe" (
    echo ✓ تم العثور على XAMPP
    set MYSQL_PATH=C:\xampp\mysql\bin\mysql.exe
) else (
    echo ❌ XAMPP غير مثبت!
    echo.
    echo يرجى تثبيت XAMPP من:
    echo https://www.apachefriends.org/download.html
    echo.
    pause
    exit /b 1
)

echo.
echo [الخطوة 2/5] تثبيت مكتبة mysql2...
echo.
call npm install mysql2
if %errorlevel% neq 0 (
    echo ❌ فشل تثبيت mysql2
    pause
    exit /b 1
)
echo ✓ تم تثبيت mysql2

echo.
echo [الخطوة 3/5] إنشاء ملف .env...
echo.

if not exist ".env" (
    (
        echo # MySQL Configuration
        echo DB_HOST=localhost
        echo DB_PORT=3306
        echo DB_NAME=penetration_testing_platform
        echo DB_USER=root
        echo DB_PASSWORD=
        echo.
        echo # Server Configuration
        echo PORT=3001
        echo NODE_ENV=development
    ) > .env
    echo ✓ تم إنشاء ملف .env
) else (
    echo ℹ ملف .env موجود بالفعل
)

echo.
echo [الخطوة 4/5] إنشاء قاعدة البيانات...
echo.
echo يرجى التأكد من أن MySQL يعمل في XAMPP!
echo.
pause

echo جاري إنشاء قاعدة البيانات...
"%MYSQL_PATH%" -u root -e "source src/database/schema-mysql.sql" 2>nul
if %errorlevel% equ 0 (
    echo ✓ تم إنشاء قاعدة البيانات بنجاح
) else (
    echo ⚠️ حدث خطأ - جرب يدوياً عبر phpMyAdmin
    echo افتح: http://localhost/phpmyadmin
)

echo.
echo [الخطوة 5/5] نسخ ملف الاتصال...
echo.

if exist "src\database\connection.ts" (
    copy "src\database\connection.ts" "src\database\connection-postgres.backup" >nul 2>&1
    echo ✓ تم حفظ نسخة احتياطية من connection.ts
)

copy "src\database\connection-mysql.ts" "src\database\connection.ts" >nul 2>&1
if %errorlevel% equ 0 (
    echo ✓ تم استبدال ملف الاتصال بنسخة MySQL
) else (
    echo ℹ يمكنك نسخ الملف يدوياً
)

echo.
echo ════════════════════════════════════════════════════════════
echo.
echo ✅ اكتمل التثبيت!
echo.
echo 📝 الخطوات التالية:
echo.
echo 1. تأكد من أن MySQL يعمل في XAMPP
echo 2. افتح phpMyAdmin: http://localhost/phpmyadmin
echo 3. تحقق من قاعدة البيانات: penetration_testing_platform
echo 4. شغّل السيرفر: node server-complete.js
echo.
echo 🌐 بيانات الدخول الافتراضية:
echo    اسم المستخدم: admin
echo    كلمة المرور: admin123
echo.
echo ════════════════════════════════════════════════════════════
echo.
pause
