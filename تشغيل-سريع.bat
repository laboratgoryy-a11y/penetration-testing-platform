@echo off
chcp 65001 >nul
title تشغيل سريع - منصة اختبار الاختراق

echo ============================================================
echo تشغيل سريع للنظام
echo ============================================================
echo.

REM إيقاف أي عمليات Node.js قديمة
echo [1/4] إيقاف العمليات القديمة...
taskkill /F /IM node.exe >nul 2>&1
timeout /t 2 /nobreak >nul
echo ✓ تم

echo.
echo [2/4] تشغيل الخادم...
set PORT=3001
start "Penetration Testing Server" cmd /k "echo الخادم يعمل على المنفذ 3001 && echo. && node server-sqlite.js"

echo.
echo [3/4] انتظار تشغيل الخادم...
timeout /t 5 /nobreak >nul
echo ✓ تم

echo.
echo [4/4] فتح المتصفح...
start http://localhost:3001/login.html
echo ✓ تم

echo.
echo ============================================================
echo ✓ النظام يعمل الآن!
echo ============================================================
echo.
echo رابط النظام: http://localhost:3001
echo بيانات الدخول: admin / password
echo.
echo يمكنك إغلاق هذه النافذة الآن
echo ============================================================
pause
