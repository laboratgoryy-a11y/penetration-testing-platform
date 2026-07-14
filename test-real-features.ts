/**
 * اختبار سريع للوظائف الحقيقية
 * 
 * الاستخدام:
 * ts-node test-real-features.ts
 */

import { EmailService } from './src/services/EmailService';
import { RealNetworkScanner } from './src/services/RealNetworkScanner';
import { config } from './src/config';

// ألوان للطباعة
const colors = {
  reset: '\x1b[0m',
  green: '\x1b[32m',
  red: '\x1b[31m',
  yellow: '\x1b[33m',
  blue: '\x1b[34m',
};

function log(message: string, color: string = colors.reset) {
  console.log(`${color}${message}${colors.reset}`);
}

async function testEmailService() {
  log('\n📧 Testing Email Service...', colors.blue);
  log('================================', colors.blue);

  try {
    const emailService = new EmailService({
      provider: config.email.provider,
      smtp: config.email.smtp,
      sendgrid: config.email.sendgrid,
      ses: config.email.ses,
      mailgun: config.email.mailgun,
    });

    // التحقق من الاتصال
    log('Verifying connection...', colors.yellow);
    const isValid = await emailService.verifyConnection();
    
    if (isValid) {
      log('✅ Email service connection verified!', colors.green);
      log(`Provider: ${config.email.provider}`, colors.green);
      
      // اختبار إرسال (اختياري - قم بإلغاء التعليق للاختبار الفعلي)
      /*
      log('\nSending test email...', colors.yellow);
      await emailService.send(
        'test@example.com',
        'Test Email from Penetration Testing Platform',
        '<h1>Hello!</h1><p>This is a test email from the platform.</p>',
        config.email.defaultFrom
      );
      log('✅ Test email sent successfully!', colors.green);
      */
      
      log('\n💡 To send a test email, uncomment the code in test-real-features.ts', colors.yellow);
    } else {
      log('❌ Email service verification failed', colors.red);
      log('Check your configuration in .env file', colors.yellow);
    }
  } catch (error) {
    log('❌ Email service test failed:', colors.red);
    console.error(error);
    log('\nTroubleshooting:', colors.yellow);
    log('1. Check EMAIL_PROVIDER in .env', colors.yellow);
    log('2. Verify SMTP/API credentials', colors.yellow);
    log('3. Check network connectivity', colors.yellow);
  }
}

async function testNetworkScanner() {
  log('\n🌐 Testing Network Scanner...', colors.blue);
  log('================================', colors.blue);

  if (!config.networkScanner.enableRealScanning) {
    log('⚠️  Real network scanning is disabled', colors.yellow);
    log('Set ENABLE_REAL_NETWORK_SCANNING=true in .env to enable', colors.yellow);
    return;
  }

  try {
    const scanner = new RealNetworkScanner(config.networkScanner.defaultInterface);

    // التحقق من المتطلبات
    log('Checking requirements...', colors.yellow);
    const requirements = await scanner.checkRequirements();
    
    if (requirements.available) {
      log('✅ All required tools are available!', colors.green);
      log(`Interface: ${config.networkScanner.defaultInterface}`, colors.green);
      
      // فحص نقاط الوصول (يتطلب صلاحيات root)
      log('\nScanning for access points...', colors.yellow);
      log('⚠️  This requires root privileges', colors.yellow);
      
      try {
        const accessPoints = await scanner.scanAccessPoints({
          timeout: 10,
        });
        
        log(`✅ Found ${accessPoints.length} access points:`, colors.green);
        accessPoints.forEach((ap, index) => {
          log(`\n${index + 1}. ${ap.ssid}`, colors.green);
          log(`   BSSID: ${ap.bssid}`, colors.reset);
          log(`   Channel: ${ap.channel}`, colors.reset);
          log(`   Encryption: ${ap.encryption}`, colors.reset);
          log(`   Signal: ${ap.signalStrength} dBm`, colors.reset);
          if (ap.vendor) {
            log(`   Vendor: ${ap.vendor}`, colors.reset);
          }
        });
      } catch (scanError) {
        log('⚠️  Scan failed - this is normal without root privileges', colors.yellow);
        log('Run with: sudo ts-node test-real-features.ts', colors.yellow);
      }
    } else {
      log('❌ Some required tools are missing:', colors.red);
      requirements.missing.forEach(tool => {
        log(`   - ${tool}`, colors.red);
      });
      log('\nInstall missing tools:', colors.yellow);
      log('Ubuntu/Debian: sudo apt-get install ' + requirements.missing.join(' '), colors.yellow);
      log('CentOS/RHEL: sudo yum install ' + requirements.missing.join(' '), colors.yellow);
    }
  } catch (error) {
    log('❌ Network scanner test failed:', colors.red);
    console.error(error);
    log('\nTroubleshooting:', colors.yellow);
    log('1. Install required tools (iw, iwlist, nmap, tcpdump)', colors.yellow);
    log('2. Check NETWORK_INTERFACE in .env', colors.yellow);
    log('3. Run with root privileges: sudo ts-node test-real-features.ts', colors.yellow);
  }
}

async function testConfiguration() {
  log('\n⚙️  Testing Configuration...', colors.blue);
  log('================================', colors.blue);

  const checks = [
    { name: 'Email Provider', value: config.email.provider, required: true },
    { name: 'Email From', value: config.email.defaultFrom.email, required: true },
    { name: 'Network Interface', value: config.networkScanner.defaultInterface, required: false },
    { name: 'Real Scanning', value: config.networkScanner.enableRealScanning ? 'Enabled' : 'Disabled', required: false },
    { name: 'NVD API Key', value: config.externalApis.nvd.apiKey ? 'Set' : 'Not set', required: false },
  ];

  checks.forEach(check => {
    const status = check.value ? '✅' : (check.required ? '❌' : '⚠️');
    const color = check.value ? colors.green : (check.required ? colors.red : colors.yellow);
    log(`${status} ${check.name}: ${check.value || 'Not configured'}`, color);
  });

  log('\n💡 Configuration file: .env', colors.blue);
  log('💡 Example file: .env.example', colors.blue);
}

async function main() {
  log('\n🚀 Real Features Test Suite', colors.blue);
  log('============================', colors.blue);
  log('Testing real (non-simulated) features\n', colors.reset);

  // اختبار التكوين
  await testConfiguration();

  // اختبار البريد الإلكتروني
  await testEmailService();

  // اختبار ماسح الشبكات
  await testNetworkScanner();

  // الخلاصة
  log('\n✨ Test Summary', colors.blue);
  log('================================', colors.blue);
  log('Email Service: Check results above', colors.reset);
  log('Network Scanner: Check results above', colors.reset);
  log('\nFor detailed setup instructions:', colors.yellow);
  log('- docs/REAL_FEATURES_SETUP.md', colors.yellow);
  log('- IMPLEMENTATION_SUMMARY.md', colors.yellow);
  log('- الوظائف-الحقيقية.md', colors.yellow);
  log('');
}

// تشغيل الاختبارات
main().catch(error => {
  log('\n❌ Test suite failed:', colors.red);
  console.error(error);
  process.exit(1);
});
