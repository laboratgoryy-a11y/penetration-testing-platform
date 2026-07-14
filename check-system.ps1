# فحص النظام

Write-Host "=== فحص متطلبات النظام ===" -ForegroundColor Cyan

# فحص Node.js
Write-Host "`n1. Node.js:" -ForegroundColor Yellow
$node = Get-Command node -ErrorAction SilentlyContinue
if ($node) {
    Write-Host "   ✓ مثبت" -ForegroundColor Green
    Write-Host "   الإصدار: $(node --version)" -ForegroundColor White
} else {
    Write-Host "   ✗ غير مثبت" -ForegroundColor Red
}

# فحص npm
Write-Host "`n2. npm:" -ForegroundColor Yellow
$npm = Get-Command npm -ErrorAction SilentlyContinue
if ($npm) {
    Write-Host "   ✓ مثبت" -ForegroundColor Green
    Write-Host "   الإصدار: $(npm --version)" -ForegroundColor White
} else {
    Write-Host "   ✗ غير مثبت" -ForegroundColor Red
}

# فحص Docker
Write-Host "`n3. Docker:" -ForegroundColor Yellow
$docker = Get-Command docker -ErrorAction SilentlyContinue
if ($docker) {
    Write-Host "   ✓ مثبت" -ForegroundColor Green
    Write-Host "   الإصدار: $(docker --version)" -ForegroundColor White
    
    # فحص تشغيل Docker
    $dockerRunning = docker ps 2>$null
    if ($LASTEXITCODE -eq 0) {
        Write-Host "   ✓ Docker يعمل" -ForegroundColor Green
    } else {
        Write-Host "   ✗ Docker غير مشغل" -ForegroundColor Red
    }
} else {
    Write-Host "   ✗ غير مثبت" -ForegroundColor Red
}

# فحص PostgreSQL
Write-Host "`n4. PostgreSQL:" -ForegroundColor Yellow
$psql = Get-Command psql -ErrorAction SilentlyContinue
if ($psql) {
    Write-Host "   ✓ مثبت" -ForegroundColor Green
} else {
    Write-Host "   ✗ غير مثبت" -ForegroundColor Red
}

# فحص Redis
Write-Host "`n5. Redis:" -ForegroundColor Yellow
$redis = Get-Command redis-server -ErrorAction SilentlyContinue
if ($redis) {
    Write-Host "   ✓ مثبت" -ForegroundColor Green
} else {
    Write-Host "   ✗ غير مثبت" -ForegroundColor Red
}

# فحص ملف .env
Write-Host "`n6. ملف .env:" -ForegroundColor Yellow
if (Test-Path ".env") {
    Write-Host "   ✓ موجود" -ForegroundColor Green
} else {
    Write-Host "   ✗ غير موجود" -ForegroundColor Red
}

# فحص node_modules
Write-Host "`n7. المكتبات (node_modules):" -ForegroundColor Yellow
if (Test-Path "node_modules") {
    Write-Host "   ✓ مثبتة" -ForegroundColor Green
} else {
    Write-Host "   ✗ غير مثبتة" -ForegroundColor Red
}

# فحص ملف التثبيت
Write-Host "`n8. ملف تثبيت Node.js:" -ForegroundColor Yellow
if (Test-Path "nodejs-installer.msi") {
    Write-Host "   ✓ موجود" -ForegroundColor Green
} else {
    Write-Host "   ✗ غير موجود" -ForegroundColor Red
}

# التوصيات
Write-Host "`n=== التوصيات ===" -ForegroundColor Cyan

if (!$node) {
    Write-Host "`n⚠ يجب تثبيت Node.js أولاً!" -ForegroundColor Yellow
    Write-Host "الطريقة 1: انقر نقراً مزدوجاً على nodejs-installer.msi" -ForegroundColor White
    Write-Host "الطريقة 2: استخدم Docker بدلاً من ذلك" -ForegroundColor White
}

if ($node -and !$docker -and (!$psql -or !$redis)) {
    Write-Host "`n⚠ يُنصح بتثبيت Docker لتسهيل الإعداد" -ForegroundColor Yellow
    Write-Host "Docker سيقوم بتثبيت PostgreSQL و Redis تلقائياً" -ForegroundColor White
}

if ($docker -and $dockerRunning) {
    Write-Host "`n✓ يمكنك تشغيل النظام باستخدام Docker!" -ForegroundColor Green
    Write-Host "شغل الملف: run-with-docker.ps1" -ForegroundColor White
}

if ($node -and $npm) {
    Write-Host "`n✓ يمكنك تشغيل النظام باستخدام Node.js!" -ForegroundColor Green
    Write-Host "شغل الملف: fix-and-run.ps1" -ForegroundColor White
}

Write-Host "`n"
