#!/usr/bin/env node

/**
 * أداة فحص سريع للشبكات - Quick Network Scanner
 * تتيح فحص شبكة مباشرة من سطر الأوامر
 */

const https = require('https');
const http = require('http');

// الألوان للـ Console
const colors = {
  reset: '\x1b[0m',
  bright: '\x1b[1m',
  red: '\x1b[31m',
  green: '\x1b[32m',
  yellow: '\x1b[33m',
  blue: '\x1b[34m',
  magenta: '\x1b[35m',
  cyan: '\x1b[36m'
};

function log(message, color = 'reset') {
  console.log(`${colors[color]}${message}${colors.reset}`);
}

function printHeader() {
  console.clear();
  log('═══════════════════════════════════════════════════════════════', 'cyan');
  log('        🌐 أداة الفحص السريع للشبكات', 'bright');
  log('           Quick Network Scanner Tool', 'cyan');
  log('═══════════════════════════════════════════════════════════════', 'cyan');
  console.log();
}

async function scanNetwork(ssid, bssid, authorizationId) {
  const data = JSON.stringify({
    target: {
      ssid: ssid,
      bssid: bssid,
      authorizationId: authorizationId
    },
    config: {
      testTypes: ['TRAFFIC_ANALYSIS'],
      maxAttempts: 100
    }
  });

  const options = {
    hostname: 'localhost',
    port: 3000,
    path: '/api/v1/network/tests',
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Content-Length': data.length
    }
  };

  return new Promise((resolve, reject) => {
    const req = http.request(options, (res) => {
      let responseData = '';

      res.on('data', (chunk) => {
        responseData += chunk;
      });

      res.on('end', () => {
        try {
          const result = JSON.parse(responseData);
          resolve(result);
        } catch (error) {
          reject(new Error('فشل تحليل الاستجابة'));
        }
      });
    });

    req.on('error', (error) => {
      reject(error);
    });

    req.write(data);
    req.end();
  });
}

async function checkStatus(sessionId) {
  const options = {
    hostname: 'localhost',
    port: 3000,
    path: `/api/v1/network/tests/${sessionId}/status`,
    method: 'GET'
  };

  return new Promise((resolve, reject) => {
    const req = http.request(options, (res) => {
      let responseData = '';

      res.on('data', (chunk) => {
        responseData += chunk;
      });

      res.on('end', () => {
        try {
          const result = JSON.parse(responseData);
          resolve(result);
        } catch (error) {
          reject(new Error('فشل تحليل الاستجابة'));
        }
      });
    });

    req.on('error', (error) => {
      reject(error);
    });

    req.end();
  });
}

async function getResults(sessionId) {
  const options = {
    hostname: 'localhost',
    port: 3000,
    path: `/api/v1/network/tests/${sessionId}/results`,
    method: 'GET'
  };

  return new Promise((resolve, reject) => {
    const req = http.request(options, (res) => {
      let responseData = '';

      res.on('data', (chunk) => {
        responseData += chunk;
      });

      res.on('end', () => {
        try {
          const result = JSON.parse(responseData);
          resolve(result);
        } catch (error) {
          reject(new Error('فشل تحليل الاستجابة'));
        }
      });
    });

    req.on('error', (error) => {
      reject(error);
    });

    req.end();
  });
}

function printResults(results) {
  console.log();
  log('═══════════════════════════════════════════════════════════════', 'cyan');
  log('📊 نتائج الفحص', 'bright');
  log('═══════════════════════════════════════════════════════════════', 'cyan');
  console.log();

  log(`🌐 الشبكة: ${results.target.ssid}`, 'green');
  log(`📍 BSSID: ${results.target.bssid}`, 'blue');
  console.log();

  if (results.vulnerabilities && results.vulnerabilities.length > 0) {
    log(`🔍 الثغرات المكتشفة: ${results.vulnerabilities.length}`, 'yellow');
    console.log();

    results.vulnerabilities.forEach((vuln, index) => {
      const severityColor = {
        'CRITICAL': 'red',
        'HIGH': 'red',
        'MEDIUM': 'yellow',
        'LOW': 'blue'
      }[vuln.severity] || 'reset';

      log(`  ${index + 1}. ${vuln.type}`, 'bright');
      log(`     الخطورة: ${vuln.severity}`, severityColor);
      log(`     الوصف: ${vuln.description}`, 'reset');
      if (vuln.remediation) {
        log(`     الحل: ${vuln.remediation}`, 'green');
      }
      console.log();
    });
  } else {
    log('✅ لم يتم اكتشاف ثغرات', 'green');
    console.log();
  }

  if (results.connectedDevices && results.connectedDevices.length > 0) {
    log(`💻 الأجهزة المتصلة: ${results.connectedDevices.length}`, 'cyan');
    console.log();

    results.connectedDevices.forEach((device, index) => {
      log(`  ${index + 1}. ${device.hostname || 'Unknown'}`, 'bright');
      log(`     MAC: ${device.macAddress}`, 'blue');
      log(`     IP: ${device.ipAddress || 'N/A'}`, 'blue');
      log(`     المصنّع: ${device.vendor || 'Unknown'}`, 'magenta');
      console.log();
    });
  }

  if (results.trafficAnalysis) {
    log('📈 تحليل حركة المرور:', 'cyan');
    log(`   إجمالي الحزم: ${results.trafficAnalysis.totalPackets}`, 'blue');
    if (results.trafficAnalysis.insecureProtocols && results.trafficAnalysis.insecureProtocols.length > 0) {
      log(`   بروتوكولات غير آمنة: ${results.trafficAnalysis.insecureProtocols.join(', ')}`, 'red');
    }
    console.log();
  }

  log('═══════════════════════════════════════════════════════════════', 'cyan');
}

async function main() {
  printHeader();

  // قراءة المعاملات من سطر الأوامر
  const args = process.argv.slice(2);

  if (args.length < 3) {
    log('❌ معاملات ناقصة!', 'red');
    console.log();
    log('الاستخدام:', 'yellow');
    log('  node quick-network-scan.js <SSID> <BSSID> <Authorization-ID>', 'cyan');
    console.log();
    log('مثال:', 'yellow');
    log('  node quick-network-scan.js "faraa net" "4a:1f:4c:46:18:2b" "uuid-here"', 'cyan');
    console.log();
    process.exit(1);
  }

  const [ssid, bssid, authorizationId] = args;

  log('📋 معلومات الفحص:', 'bright');
  log(`   SSID: ${ssid}`, 'blue');
  log(`   BSSID: ${bssid}`, 'blue');
  log(`   Authorization: ${authorizationId.substring(0, 8)}...`, 'blue');
  console.log();

  try {
    // بدء الفحص
    log('🚀 بدء الفحص...', 'yellow');
    const scanResponse = await scanNetwork(ssid, bssid, authorizationId);

    if (!scanResponse.success) {
      throw new Error(scanResponse.error?.message || 'فشل بدء الفحص');
    }

    const sessionId = scanResponse.data.sessionId;
    log(`✅ تم بدء الفحص بنجاح!`, 'green');
    log(`   معرف الجلسة: ${sessionId}`, 'cyan');
    console.log();

    // مراقبة الحالة
    log('⏳ جاري الفحص...', 'yellow');
    let status = 'RUNNING';
    let attempts = 0;
    const maxAttempts = 60; // 5 دقائق

    while (status === 'RUNNING' || status === 'PENDING') {
      await new Promise(resolve => setTimeout(resolve, 5000)); // انتظر 5 ثواني

      const statusResponse = await checkStatus(sessionId);
      status = statusResponse.data.status;

      process.stdout.write(`\r⏳ الحالة: ${status} (${attempts * 5}s)`);

      attempts++;
      if (attempts >= maxAttempts) {
        log('\n⚠️  انتهت المهلة. يمكنك التحقق من النتائج لاحقاً.', 'yellow');
        log(`   معرف الجلسة: ${sessionId}`, 'cyan');
        process.exit(0);
      }
    }

    console.log(); // سطر جديد بعد التحديثات

    if (status === 'COMPLETED') {
      log('✅ اكتمل الفحص!', 'green');
      console.log();

      // الحصول على النتائج
      log('📊 جاري تحميل النتائج...', 'yellow');
      const resultsResponse = await getResults(sessionId);

      if (resultsResponse.success) {
        printResults(resultsResponse.data.results);
      } else {
        throw new Error('فشل تحميل النتائج');
      }
    } else if (status === 'FAILED') {
      log('❌ فشل الفحص!', 'red');
      process.exit(1);
    } else if (status === 'STOPPED') {
      log('⚠️  تم إيقاف الفحص', 'yellow');
      process.exit(0);
    }

  } catch (error) {
    console.log();
    log('❌ خطأ: ' + error.message, 'red');
    console.log();
    
    if (error.code === 'ECONNREFUSED') {
      log('💡 تأكد من تشغيل السيرفر:', 'yellow');
      log('   npm start', 'cyan');
    }
    
    process.exit(1);
  }
}

// تشغيل البرنامج
main();
