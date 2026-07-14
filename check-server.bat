@echo off
chcp 65001 >nul
title فحص حالة الخادم

echo ============================================================
echo فحص حالة الخادم
echo ============================================================
echo.

echo [1] التحقق من عمليات Node.js...
tasklist | findstr node.exe
if errorlevel 1 (
    echo ❌ لا توجد عمليات Node.js قيد التشغيل
    echo.
    echo 💡 لتشغيل الخادم، شغل: تشغيل-سريع.bat
) else (
    echo ✓ Node.js يعمل
)

echo.
echo [2] التحقق من المنفذ 3001...
netstat -ano | findstr :3001
if errorlevel 1 (
    echo ❌ المنفذ 3001 غير مستخدم
) else (
    echo ✓ المنفذ 3001 مستخدم
)

echo.
echo [3] اختبار الاتصال...
curl -s http://localhost:3001 >nul 2>&1
if errorlevel 1 (
    echo ❌ لا يمكن الاتصال بالخادم
) else (
    echo ✓ الخادم يستجيب
)

echo.
echo ============================================================
pause
