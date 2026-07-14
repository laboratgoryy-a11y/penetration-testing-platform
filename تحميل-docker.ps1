# سكريبت تحميل Docker Desktop تلقائياً
Write-Host "========================================" -ForegroundColor Cyan
Write-Host "   تحميل Docker Desktop" -ForegroundColor Cyan
Write-Host "========================================" -ForegroundColor Cyan
Write-Host ""

$dockerUrl = "https://desktop.docker.com/win/main/amd64/Docker%20Desktop%20Installer.exe"
$installerPath = "$PSScriptRoot\Docker-Desktop-Installer.exe"

Write-Host "📥 جاري التحميل من Docker..." -ForegroundColor Yellow
Write-Host "الرابط: $dockerUrl" -ForegroundColor Gray
Write-Host ""

try {
    # التحقق من وجود الملف
    if (Test-Path $installerPath) {
        Write-Host "✅ الملف موجود مسبقاً: $installerPath" -ForegroundColor Green
        $download = Read-Host "هل تريد إعادة التحميل؟ (y/n)"
        if ($download -ne 'y') {
            Write-Host "تم التخطي." -ForegroundColor Yellow
            Write-Host ""
            Write-Host "لتثبيت Docker، شغّل:" -ForegroundColor Cyan
            Write-Host ".\Docker-Desktop-Installer.exe" -ForegroundColor White
            exit
        }
    }

    # تحميل الملف
    Write-Host "⏳ جاري التحميل... (قد يستغرق عدة دقائق)" -ForegroundColor Yellow
    
    $ProgressPreference = 'SilentlyContinue'
    Invoke-WebRequest -Uri $dockerUrl -OutFile $installerPath -UseBasicParsing
    $ProgressPreference = 'Continue'
    
    Write-Host ""
    Write-Host "✅ تم التحميل بنجاح!" -ForegroundColor Green
    Write-Host "📁 الموقع: $installerPath" -ForegroundColor Gray
    Write-Host ""
    Write-Host "========================================" -ForegroundColor Cyan
    Write-Host "   الخطوات التالية" -ForegroundColor Cyan
    Write-Host "========================================" -ForegroundColor Cyan
    Write-Host ""
    Write-Host "1️⃣  شغّل المثبت:" -ForegroundColor Yellow
    Write-Host "   .\Docker-Desktop-Installer.exe" -ForegroundColor White
    Write-Host ""
    Write-Host "2️⃣  بعد التثبيت، أعد تشغيل الجهاز" -ForegroundColor Yellow
    Write-Host ""
    Write-Host "3️⃣  شغّل Docker Desktop" -ForegroundColor Yellow
    Write-Host ""
    Write-Host "4️⃣  في مجلد المشروع، شغّل:" -ForegroundColor Yellow
    Write-Host "   docker-compose up" -ForegroundColor White
    Write-Host ""
    Write-Host "5️⃣  افتح المتصفح على:" -ForegroundColor Yellow
    Write-Host "   http://localhost:3000" -ForegroundColor White
    Write-Host ""
    
    $install = Read-Host "هل تريد تشغيل المثبت الآن؟ (y/n)"
    if ($install -eq 'y') {
        Write-Host ""
        Write-Host "🚀 جاري تشغيل المثبت..." -ForegroundColor Green
        Start-Process $installerPath -Wait
    }
    
} catch {
    Write-Host ""
    Write-Host "❌ فشل التحميل!" -ForegroundColor Red
    Write-Host "الخطأ: $_" -ForegroundColor Red
    Write-Host ""
    Write-Host "💡 الحل البديل:" -ForegroundColor Yellow
    Write-Host "1. افتح المتصفح" -ForegroundColor White
    Write-Host "2. اذهب إلى: https://www.docker.com/products/docker-desktop/" -ForegroundColor White
    Write-Host "3. حمّل Docker Desktop يدوياً" -ForegroundColor White
}

Write-Host ""
Write-Host "اضغط أي مفتاح للخروج..." -ForegroundColor Gray
$null = $Host.UI.RawUI.ReadKey("NoEcho,IncludeKeyDown")
