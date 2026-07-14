@echo off
echo ========================================
echo تطبيق التعديلات الآمنة على قاعدة البيانات
echo ========================================
echo.

echo Database: "web scanner"
echo.

echo هذا السكريبت سيقوم بـ:
echo 1. إضافة أعمدة جديدة لجدول users
echo 2. إنشاء جداول جديدة (audit_logs, notifications, user_settings)
echo 3. تحديث كلمات المرور (اختياري)
echo.

echo ⚠️  ملاحظة: جميع البيانات الموجودة ستبقى آمنة!
echo.

pause

echo.
echo [1/2] تطبيق التعديلات الآمنة...
mysql -u root "web scanner" < safe-database-updates.sql

if errorlevel 1 (
    echo.
    echo ❌ فشل تطبيق التعديلات!
    echo.
    echo تحقق من:
    echo 1. MySQL يعمل في XAMPP
    echo 2. قاعدة البيانات "web scanner" موجودة
    echo 3. المستخدم root لديه صلاحيات
    echo.
    pause
    exit /b 1
)

echo ✅ تم تطبيق التعديلات بنجاح!
echo.

echo هل تريد تحديث كلمات المرور؟ (Y/N)
set /p update_passwords=

if /i "%update_passwords%"=="Y" (
    echo.
    echo [2/2] تحديث كلمات المرور...
    mysql -u root "web scanner" < update-passwords.sql
    
    if errorlevel 1 (
        echo ❌ فشل تحديث كلمات المرور!
    ) else (
        echo ✅ تم تحديث كلمات المرور بنجاح!
        echo.
        echo كلمات المرور الجديدة:
        echo - admin: Admin@123
        echo - user1: User1@123
        echo - user2: User2@123
    )
) else (
    echo تم تخطي تحديث كلمات المرور.
)

echo.
echo ========================================
echo ✅ اكتمل التطبيق!
echo ========================================
echo.
echo الجداول الجديدة:
echo - audit_logs
echo - notifications
echo - user_settings
echo.
echo الأعمدة الجديدة في users:
echo - email
echo - password_hash
echo - phone
echo - last_login
echo.
echo يمكنك الآن إعادة تشغيل الخادم:
echo start-existing-db.bat
echo.

pause
