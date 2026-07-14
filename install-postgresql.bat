@echo off
chcp 65001 >nul
echo ============================================================
echo تثبيت PostgreSQL
echo ============================================================
echo.

echo هذا السكربت سيساعدك في تثبيت PostgreSQL
echo.
echo الخيارات المتاحة:
echo   1. تثبيت PostgreSQL باستخدام Chocolatey (موصى به)
echo   2. تثبيت PostgreSQL باستخدام Docker
echo   3. تحميل المثبت الرسمي
echo   4. الخروج
echo.

set /p choice="اختر رقم الخيار: "

if "%choice%"=="1" goto chocolatey
if "%choice%"=="2" goto docker
if "%choice%"=="3" goto official
if "%choice%"=="4" goto end

:chocolatey
echo.
echo ============================================================
echo تثبيت PostgreSQL باستخدام Chocolatey
echo ============================================================
echo.

where choco >nul 2>&1
if %errorlevel% neq 0 (
    echo ❌ Chocolatey غير مثبت
    echo.
    echo لتثبيت Chocolatey، قم بتشغيل PowerShell كمسؤول وأدخل:
    echo Set-ExecutionPolicy Bypass -Scope Process -Force; [System.Net.ServicePointManager]::SecurityProtocol = [System.Net.ServicePointManager]::SecurityProtocol -bor 3072; iex ((New-Object System.Net.WebClient).DownloadString('https://community.chocolatey.org/install.ps1'))
    echo.
    pause
    goto end
)

echo ✓ Chocolatey مثبت
echo.
echo جاري تثبيت PostgreSQL...
choco install postgresql15 -y

if %errorlevel% equ 0 (
    echo.
    echo ✅ تم تثبيت PostgreSQL بنجاح!
    echo.
    echo معلومات الاتصال الافتراضية:
    echo   Host: localhost
    echo   Port: 5432
    echo   User: postgres
    echo   Password: postgres
    echo.
) else (
    echo.
    echo ❌ فشل التثبيت
    echo.
)

pause
goto end

:docker
echo.
echo ============================================================
echo تثبيت PostgreSQL باستخدام Docker
echo ============================================================
echo.

where docker >nul 2>&1
if %errorlevel% neq 0 (
    echo ❌ Docker غير مثبت
    echo.
    echo لتثبيت Docker Desktop:
    echo 1. قم بتحميله من: https://www.docker.com/products/docker-desktop
    echo 2. قم بتثبيته
    echo 3. أعد تشغيل الكمبيوتر
    echo 4. شغّل هذا السكربت مرة أخرى
    echo.
    pause
    goto end
)

echo ✓ Docker مثبت
echo.
echo جاري تشغيل PostgreSQL في Docker...
docker run --name postgres-pentest -e POSTGRES_PASSWORD=postgres -e POSTGRES_USER=postgres -p 5432:5432 -d postgres:15

if %errorlevel% equ 0 (
    echo.
    echo ✅ تم تشغيل PostgreSQL في Docker بنجاح!
    echo.
    echo معلومات الاتصال:
    echo   Host: localhost
    echo   Port: 5432
    echo   User: postgres
    echo   Password: postgres
    echo   Container: postgres-pentest
    echo.
    echo لإيقاف PostgreSQL: docker stop postgres-pentest
    echo لبدء PostgreSQL: docker start postgres-pentest
    echo.
) else (
    echo.
    echo ❌ فشل تشغيل Docker container
    echo.
    echo قد يكون السبب:
    echo   - Container موجود بالفعل (جرب: docker start postgres-pentest)
    echo   - المنفذ 5432 مستخدم
    echo.
)

pause
goto end

:official
echo.
echo ============================================================
echo تحميل المثبت الرسمي
echo ============================================================
echo.
echo سيتم فتح صفحة التحميل في المتصفح...
echo.
start https://www.postgresql.org/download/windows/
echo.
echo بعد التحميل:
echo 1. شغّل المثبت
echo 2. اتبع التعليمات
echo 3. احفظ كلمة المرور التي تدخلها
echo 4. استخدم المنفذ الافتراضي 5432
echo.
pause
goto end

:end
echo.
echo ============================================================
echo الخطوة التالية: إعداد قاعدة البيانات
echo ============================================================
echo.
echo بعد تثبيت PostgreSQL، قم بتشغيل:
echo   node setup-database.js
echo.
pause
