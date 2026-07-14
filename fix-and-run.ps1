# إصلاح المشاكل وتشغيل النظام

Write-Host "=== إصلاح مشاكل التثبيت ===" -ForegroundColor Cyan

# إنهاء العمليات المعلقة
Write-Host "إنهاء العمليات المعلقة..." -ForegroundColor Yellow
Get-Process | Where-Object {$_.Name -like "*winget*" -or $_.Name -like "*msiexec*"} | Stop-Process -Force -ErrorAction SilentlyContinue

Write-Host "`n=== التحقق من Node.js ===" -ForegroundColor Cyan

# التحقق من وجود Node.js
$nodeExists = Get-Command node -ErrorAction SilentlyContinue

if ($nodeExists) {
    Write-Host "✓ Node.js مثبت بالفعل!" -ForegroundColor Green
    node --version
    npm --version
} else {
    Write-Host "✗ Node.js غير مثبت" -ForegroundColor Red
    Write-Host "`nيرجى تثبيت Node.js يدوياً:" -ForegroundColor Yellow
    Write-Host "1. انقر نقراً مزدوجاً على ملف: nodejs-installer.msi" -ForegroundColor White
    Write-Host "2. اتبع خطوات التثبيت" -ForegroundColor White
    Write-Host "3. أعد تشغيل PowerShell" -ForegroundColor White
    Write-Host "4. شغل هذا الملف مرة أخرى" -ForegroundColor White
    exit
}

Write-Host "`n=== التحقق من ملف .env ===" -ForegroundColor Cyan

if (!(Test-Path ".env")) {
    Write-Host "إنشاء ملف .env..." -ForegroundColor Yellow
    Copy-Item ".env.example" ".env"
    Write-Host "✓ تم إنشاء ملف .env" -ForegroundColor Green
} else {
    Write-Host "✓ ملف .env موجود" -ForegroundColor Green
}

Write-Host "`n=== التحقق من المكتبات ===" -ForegroundColor Cyan

if (!(Test-Path "node_modules")) {
    Write-Host "تثبيت المكتبات... (قد يستغرق بضع دقائق)" -ForegroundColor Yellow
    npm install
    Write-Host "✓ تم تثبيت المكتبات" -ForegroundColor Green
} else {
    Write-Host "✓ المكتبات مثبتة" -ForegroundColor Green
}

Write-Host "`n=== معلومات مهمة ===" -ForegroundColor Cyan
Write-Host "⚠ النظام يحتاج إلى:" -ForegroundColor Yellow
Write-Host "  - PostgreSQL (قاعدة بيانات)" -ForegroundColor White
Write-Host "  - Redis (للتخزين المؤقت)" -ForegroundColor White
Write-Host "`nإذا لم يكونا مثبتين، استخدم Docker بدلاً من ذلك:" -ForegroundColor Yellow
Write-Host "  docker-compose up -d" -ForegroundColor White

Write-Host "`n=== تشغيل النظام ===" -ForegroundColor Cyan
Write-Host "جاري تشغيل النظام..." -ForegroundColor Yellow
Write-Host "افتح المتصفح على: http://localhost:3000" -ForegroundColor Green
Write-Host "`nلإيقاف النظام: اضغط Ctrl+C" -ForegroundColor Yellow
Write-Host "`n" -ForegroundColor White

npm run dev
