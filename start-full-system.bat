@echo off
echo ========================================
echo تشغيل النظام الكامل مع قاعدة البيانات
echo ========================================
echo.
echo Database: "web scanner"
echo Port: 3001
echo.
echo جميع الميزات مفعلة:
echo - لوحة التحكم
echo - فحص الويب
echo - تحليل الشبكات
echo - حملات التصيد
echo - فحص IP
echo - التقارير
echo - التصاريح
echo.

node server-full-mysql.js

pause
