@echo off
echo ========================================
echo   إضافة كلمات المرور للمستخدمين
echo   Adding Passwords to Users
echo ========================================
echo.

echo يرجى تشغيل الأوامر التالية في phpMyAdmin أو MySQL:
echo Please run the following commands in phpMyAdmin or MySQL:
echo.
echo ----------------------------------------
type fix-users-add-password.sql
echo ----------------------------------------
echo.
echo.
echo بعد تطبيق التحديثات، استخدم:
echo After applying updates, use:
echo.
echo   اسم المستخدم: admin
echo   Username: admin
echo   كلمة المرور: 123456
echo   Password: 123456
echo.
echo   أو / Or:
echo.
echo   اسم المستخدم: user1
echo   Username: user1
echo   كلمة المرور: 123456
echo   Password: 123456
echo.
pause
