# إعادة تشغيل الخادم - PowerShell Script

Write-Host "========================================" -ForegroundColor Cyan
Write-Host "   إعادة تشغيل الخادم" -ForegroundColor Cyan
Write-Host "========================================" -ForegroundColor Cyan
Write-Host ""

# 1. إيقاف الخادم الحالي
Write-Host "[1/4] إيقاف الخادم الحالي..." -ForegroundColor Yellow
Get-Process -Name node -ErrorAction SilentlyContinue | Stop-Process -Force
Start-Sleep -Seconds 2

# 2. إعادة بناء المشروع
Write-Host "[2/4] إعادة بناء المشروع..." -ForegroundColor Yellow
npm run build
if ($LASTEXITCODE -ne 0) {
    Write-Host ""
    Write-Host "[خطأ] فشل بناء المشروع!" -ForegroundColor Red
    Read-Host "اضغط Enter للخروج"
    exit 1
}

# 3. تشغيل الخادم في نافذة جديدة
Write-Host "[3/4] تشغيل الخادم..." -ForegroundColor Yellow
Start-Process powershell -ArgumentList "-NoExit", "-Command", "npm start"

# 4. انتظار بدء الخادم
Write-Host "[4/4] انتظار بدء الخادم..." -ForegroundColor Yellow
Start-Sleep -Seconds 5

Write-Host ""
Write-Host "========================================" -ForegroundColor Green
Write-Host "   تم إعادة تشغيل الخادم بنجاح!" -ForegroundColor Green
Write-Host "========================================" -ForegroundColor Green
Write-Host ""
Write-Host "الخادم يعمل على: http://localhost:3001" -ForegroundColor White
Write-Host ""

# فتح المتصفح
$response = Read-Host "هل تريد فتح المتصفح؟ (Y/N)"
if ($response -eq "Y" -or $response -eq "y" -or $response -eq "") {
    Start-Process "http://localhost:3001"
    Write-Host "تم فتح المتصفح!" -ForegroundColor Green
}

Write-Host ""
Write-Host "تم!" -ForegroundColor Green
Start-Sleep -Seconds 2
