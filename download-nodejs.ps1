# تحميل Node.js تلقائياً

Write-Host "=== تحميل Node.js ===" -ForegroundColor Cyan

# رابط Node.js LTS (الإصدار المستقر)
$nodeUrl = "https://nodejs.org/dist/v20.11.0/node-v20.11.0-x64.msi"
$outputPath = "node-installer-v20.msi"

Write-Host "`nجاري التحميل..." -ForegroundColor Yellow
Write-Host "الحجم: حوالي 30 MB" -ForegroundColor Yellow
Write-Host ""

try {
    # تحميل الملف
    $ProgressPreference = 'SilentlyContinue'
    Invoke-WebRequest -Uri $nodeUrl -OutFile $outputPath -UseBasicParsing
    
    Write-Host "`n✓ تم التحميل بنجاح!" -ForegroundColor Green
    Write-Host "`nالملف: $outputPath" -ForegroundColor White
    
    Write-Host "`nهل تريد تثبيت Node.js الآن؟ (Y/N)" -ForegroundColor Yellow
    $response = Read-Host
    
    if ($response -eq "Y" -or $response -eq "y") {
        Write-Host "`nجاري التثبيت..." -ForegroundColor Yellow
        Start-Process msiexec.exe -ArgumentList "/i $outputPath /quiet /norestart" -Wait
        Write-Host "`n✓ تم التثبيت!" -ForegroundColor Green
        Write-Host "`nأعد تشغيل PowerShell ثم شغل: START.bat" -ForegroundColor Yellow
        
        # تحديث المتغيرات البيئية
        $env:Path = [System.Environment]::GetEnvironmentVariable("Path","Machine") + ";" + [System.Environment]::GetEnvironmentVariable("Path","User")
        
        Write-Host "`nالتحقق من التثبيت..." -ForegroundColor Yellow
        & node --version
        & npm --version
    } else {
        Write-Host "`nيمكنك تثبيته لاحقاً بالنقر على: $outputPath" -ForegroundColor White
    }
    
} catch {
    Write-Host "`n✗ فشل التحميل!" -ForegroundColor Red
    Write-Host "الخطأ: $($_.Exception.Message)" -ForegroundColor Red
    Write-Host "`nحمل يدوياً من: https://nodejs.org/" -ForegroundColor Yellow
}

Write-Host "`n"
pause
