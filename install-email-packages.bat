@echo off
REM Script to install optional email service packages for Windows
REM Run this script to install packages for your chosen email provider

echo.
echo 📧 Email Service Package Installer
echo ==================================
echo.
echo Choose your email provider:
echo 1) SMTP (built-in with nodemailer - already installed)
echo 2) SendGrid
echo 3) AWS SES
echo 4) Mailgun
echo 5) Install all
echo 6) Exit
echo.
set /p choice="Enter your choice (1-6): "

if "%choice%"=="1" (
    echo ✅ SMTP is already available with nodemailer
    echo No additional packages needed!
    goto end
)

if "%choice%"=="2" (
    echo 📦 Installing SendGrid...
    call npm install @sendgrid/mail
    echo ✅ SendGrid installed!
    echo.
    echo Configuration needed in .env:
    echo EMAIL_PROVIDER=sendgrid
    echo SENDGRID_API_KEY=your_api_key
    goto end
)

if "%choice%"=="3" (
    echo 📦 Installing AWS SDK...
    call npm install aws-sdk
    echo ✅ AWS SES installed!
    echo.
    echo Configuration needed in .env:
    echo EMAIL_PROVIDER=ses
    echo AWS_REGION=us-east-1
    echo AWS_ACCESS_KEY_ID=your_key
    echo AWS_SECRET_ACCESS_KEY=your_secret
    goto end
)

if "%choice%"=="4" (
    echo 📦 Installing Mailgun...
    call npm install mailgun.js form-data
    echo ✅ Mailgun installed!
    echo.
    echo Configuration needed in .env:
    echo EMAIL_PROVIDER=mailgun
    echo MAILGUN_API_KEY=your_api_key
    echo MAILGUN_DOMAIN=your_domain
    goto end
)

if "%choice%"=="5" (
    echo 📦 Installing all email providers...
    call npm install @sendgrid/mail aws-sdk mailgun.js form-data
    echo ✅ All providers installed!
    goto end
)

if "%choice%"=="6" (
    echo 👋 Exiting...
    exit /b 0
)

echo ❌ Invalid choice
exit /b 1

:end
echo.
echo ✨ Installation complete!
echo.
echo Next steps:
echo 1. Copy .env.example to .env
echo 2. Update email configuration in .env
echo 3. Run: npm run build
echo 4. Run: npm start
echo.
echo For detailed setup instructions, see:
echo docs\REAL_FEATURES_SETUP.md
echo.
pause
