# تثبيت PostgreSQL تلقائياً
Write-Host "جاري تحميل PostgreSQL..." -ForegroundColor Green

$postgresUrl = "https://get.enterprisedb.com/postgresql/postgresql-16.1-1-windows-x64.exe"
$installerPath = "$env:TEMP\postgresql-installer.exe"

try {
    # تحميل المثبت
    Write-Host "تحميل من: $postgresUrl"
    Invoke-WebRequest -Uri $postgresUrl -OutFile $installerPath -UseBasicParsing
    
    Write-Host "تم التحميل بنجاح!" -ForegroundColor Green
    Write-Host "موقع الملف: $installerPath" -ForegroundColor Yellow
    Write-Host ""
    Write-Host "لتثبيت PostgreSQL، قم بتشغيل الأمر التالي:" -ForegroundColor Cyan
    Write-Host "Start-Process '$installerPath' -Wait" -ForegroundColor White
    
} catch {
    Write-Host "فشل التحميل: $_" -ForegroundColor Red
}
