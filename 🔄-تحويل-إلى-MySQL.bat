@echo off
chcp 65001 >nul
cls
echo ═══════════════════════════════════════════════════════════
echo 🔄 تحويل النظام من PostgreSQL إلى MySQL
echo ═══════════════════════════════════════════════════════════
echo.
echo هذا السكريبت سيقوم بـ:
echo   1. نسخ ملف الاتصال بـ MySQL
echo   2. تثبيت mysql2 package
echo   3. إعداد ملف .env
echo.
echo ═══════════════════════════════════════════════════════════
pause
echo.

echo [1/3] نسخ ملف الاتصال...
copy /Y src\database\connection-mysql-complete.ts src\database\connection.ts
if %errorlevel% equ 0 (
    echo ✓ تم نسخ ملف الاتصال بنجاح
) else (
    echo ✗ فشل نسخ ملف الاتصال
    pause
    exit /b 1
)
echo.

echo [2/3] تثبيت mysql2...
call npm install mysql2
if %errorlevel% equ 0 (
    echo ✓ تم تثبيت mysql2 بنجاح
) else (
    echo ✗ فشل تثبيت mysql2
    pause
    exit /b 1
)
echo.

echo [3/3] إعداد ملف .env...
if not exist .env (
    echo # Database Configuration > .env
    echo DB_HOST=localhost >> .env
    echo DB_PORT=3306 >> .env
    echo DB_NAME=penetration_testing_platform >> .env
    echo DB_USER=root >> .env
    echo DB_PASSWORD= >> .env
    echo. >> .env
    echo # Server Configuration >> .env
    echo PORT=3001 >> .env
    echo NODE_ENV=development >> .env
    echo API_VERSION=v1 >> .env
    echo. >> .env
    echo # JWT Configuration >> .env
    echo JWT_SECRET=your-super-secret-jwt-key-change-this >> .env
    echo JWT_EXPIRES_IN=24h >> .env
    echo ✓ تم إنشاء ملف .env
) else (
    echo ⚠ ملف .env موجود بالفعل - لم يتم التعديل
)
echo.

echo ═══════════════════════════════════════════════════════════
echo ✅ اكتمل التحويل!
echo ═══════════════════════════════════════════════════════════
echo.
echo الخطوات التالية:
echo.
echo 1. تأكد من تشغيل MySQL في XAMPP
echo 2. افتح phpMyAdmin: http://localhost/phpmyadmin
echo 3. أنشئ قاعدة بيانات: penetration_testing_platform
echo 4. استورد الملف: src\database\schema-mysql-complete.sql
echo 5. شغل النظام: npm start
echo.
echo للمزيد من التفاصيل، اقرأ: MYSQL_SETUP_COMPLETE_GUIDE.md
echo.
echo ═══════════════════════════════════════════════════════════
pause
