# تشغيل النظام باستخدام Docker

Write-Host "=== تشغيل منصة اختبار الاختراق باستخدام Docker ===" -ForegroundColor Cyan

# التحقق من Docker
Write-Host "`nالتحقق من Docker..." -ForegroundColor Yellow
$dockerExists = Get-Command docker -ErrorAction SilentlyContinue

if (!$dockerExists) {
    Write-Host "✗ Docker غير مثبت!" -ForegroundColor Red
    Write-Host "`nيرجى تثبيت Docker Desktop:" -ForegroundColor Yellow
    Write-Host "1. حمل من: https://www.docker.com/products/docker-desktop/" -ForegroundColor White
    Write-Host "2. ثبته وأعد تشغيل الجهاز" -ForegroundColor White
    Write-Host "3. شغل هذا الملف مرة أخرى" -ForegroundColor White
    
    # محاولة فتح الرابط
    Write-Host "`nهل تريد فتح صفحة التحميل؟ (Y/N)" -ForegroundColor Yellow
    $response = Read-Host
    if ($response -eq "Y" -or $response -eq "y") {
        Start-Process "https://www.docker.com/products/docker-desktop/"
    }
    exit
}

Write-Host "✓ Docker مثبت" -ForegroundColor Green
docker --version

# التحقق من تشغيل Docker
Write-Host "`nالتحقق من تشغيل Docker..." -ForegroundColor Yellow
$dockerRunning = docker ps 2>$null

if ($LASTEXITCODE -ne 0) {
    Write-Host "✗ Docker غير مشغل!" -ForegroundColor Red
    Write-Host "يرجى تشغيل Docker Desktop أولاً" -ForegroundColor Yellow
    exit
}

Write-Host "✓ Docker يعمل" -ForegroundColor Green

# إنشاء ملف .env إذا لم يكن موجوداً
if (!(Test-Path ".env")) {
    Write-Host "`nإنشاء ملف .env..." -ForegroundColor Yellow
    Copy-Item ".env.example" ".env"
    Write-Host "✓ تم إنشاء ملف .env" -ForegroundColor Green
}

# تشغيل Docker Compose
Write-Host "`n=== تشغيل النظام ===" -ForegroundColor Cyan
Write-Host "جاري تشغيل جميع الخدمات..." -ForegroundColor Yellow
Write-Host "(قد يستغرق بضع دقائق في المرة الأولى)" -ForegroundColor Yellow

docker-compose up -d

if ($LASTEXITCODE -eq 0) {
    Write-Host "`n✓ تم تشغيل النظام بنجاح!" -ForegroundColor Green
    Write-Host "`n=== معلومات الوصول ===" -ForegroundColor Cyan
    Write-Host "النظام الرئيسي: http://localhost:3000" -ForegroundColor White
    Write-Host "توثيق API: http://localhost:3000/api-docs" -ForegroundColor White
    
    Write-Host "`n=== الأوامر المفيدة ===" -ForegroundColor Cyan
    Write-Host "عرض السجلات: docker-compose logs -f" -ForegroundColor White
    Write-Host "إيقاف النظام: docker-compose down" -ForegroundColor White
    Write-Host "إعادة التشغيل: docker-compose restart" -ForegroundColor White
    Write-Host "عرض الحالة: docker-compose ps" -ForegroundColor White
    
    Write-Host "`nجاري عرض السجلات... (اضغط Ctrl+C للخروج)" -ForegroundColor Yellow
    Start-Sleep -Seconds 3
    docker-compose logs -f
} else {
    Write-Host "`n✗ فشل تشغيل النظام!" -ForegroundColor Red
    Write-Host "راجع الأخطاء أعلاه" -ForegroundColor Yellow
}
