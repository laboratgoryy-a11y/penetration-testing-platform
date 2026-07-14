# تحميل Docker Desktop تلقائياً

Write-Host "=== تحميل Docker Desktop ===" -ForegroundColor Cyan

$dockerUrl = "https://desktop.docker.com/win/main/amd64/Docker%20Desktop%20Installer.exe"
$outputPath = "Docker-Desktop-Installer.exe"

Write-Host "`nجاري التحميل..." -ForegroundColor Yellow
Write-Host "الحجم: حوالي 500 MB" -ForegroundColor Yellow
Write-Host "قد يستغرق بضع دقائق..." -ForegroundColor Yellow
Write-Host ""

try {
    # تحميل الملف
    Invoke-WebRequest -Uri $dockerUrl -OutFile $outputPath -UseBasicParsing
    
    Write-Host "`n✓ تم التحميل بنجاح!" -ForegroundColor Green
    Write-Host "`nالملف: $outputPath" -ForegroundColor White
    
    Write-Host "`nهل تريد تثبيت Docker الآن؟ (Y/N)" -ForegroundColor Yellow
    $response = Read-Host
    
    if ($response -eq "Y" -or $response -eq "y") {
        Write-Host "`nجاري التثبيت..." -ForegroundColor Yellow
        Start-Process -FilePath $outputPath -Wait
        Write-Host "`n✓ تم التثبيت!" -ForegroundColor Green
        Write-Host "يرجى إعادة تشغيل الجهاز" -ForegroundColor Yellow
    } else {
        Write-Host "`nيمكنك تثبيته لاحقاً بالنقر على: $outputPath" -ForegroundColor White
    }
    
} catch {
    Write-Host "`n✗ فشل التحميل!" -ForegroundColor Red
    Write-Host "الخطأ: $($_.Exception.Message)" -ForegroundColor Red
    Write-Host "`nحمل يدوياً من: https://www.docker.com/products/docker-desktop/" -ForegroundColor Yellow
}

Write-Host "`n"
pause
