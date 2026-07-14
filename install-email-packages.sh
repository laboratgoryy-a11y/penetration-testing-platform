#!/bin/bash

# Script to install optional email service packages
# Run this script to install packages for your chosen email provider

echo "📧 Email Service Package Installer"
echo "=================================="
echo ""
echo "Choose your email provider:"
echo "1) SMTP (built-in with nodemailer - already installed)"
echo "2) SendGrid"
echo "3) AWS SES"
echo "4) Mailgun"
echo "5) Install all"
echo "6) Exit"
echo ""
read -p "Enter your choice (1-6): " choice

case $choice in
  1)
    echo "✅ SMTP is already available with nodemailer"
    echo "No additional packages needed!"
    ;;
  2)
    echo "📦 Installing SendGrid..."
    npm install @sendgrid/mail
    echo "✅ SendGrid installed!"
    echo ""
    echo "Configuration needed in .env:"
    echo "EMAIL_PROVIDER=sendgrid"
    echo "SENDGRID_API_KEY=your_api_key"
    ;;
  3)
    echo "📦 Installing AWS SDK..."
    npm install aws-sdk
    echo "✅ AWS SES installed!"
    echo ""
    echo "Configuration needed in .env:"
    echo "EMAIL_PROVIDER=ses"
    echo "AWS_REGION=us-east-1"
    echo "AWS_ACCESS_KEY_ID=your_key"
    echo "AWS_SECRET_ACCESS_KEY=your_secret"
    ;;
  4)
    echo "📦 Installing Mailgun..."
    npm install mailgun.js form-data
    echo "✅ Mailgun installed!"
    echo ""
    echo "Configuration needed in .env:"
    echo "EMAIL_PROVIDER=mailgun"
    echo "MAILGUN_API_KEY=your_api_key"
    echo "MAILGUN_DOMAIN=your_domain"
    ;;
  5)
    echo "📦 Installing all email providers..."
    npm install @sendgrid/mail aws-sdk mailgun.js form-data
    echo "✅ All providers installed!"
    ;;
  6)
    echo "👋 Exiting..."
    exit 0
    ;;
  *)
    echo "❌ Invalid choice"
    exit 1
    ;;
esac

echo ""
echo "✨ Installation complete!"
echo ""
echo "Next steps:"
echo "1. Copy .env.example to .env"
echo "2. Update email configuration in .env"
echo "3. Run: npm run build"
echo "4. Run: npm start"
echo ""
echo "For detailed setup instructions, see:"
echo "docs/REAL_FEATURES_SETUP.md"
