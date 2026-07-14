#!/usr/bin/env node

/**
 * أداة توليد تقارير الشبكات
 * Network Report Generator
 */

const http = require('http');
const fs = require('fs');
const path = require('path');

// الألوان
const colors = {
  reset: '\x1b[0m',
  bright: '\x1b[1m',
  red: '\x1b[31m',
  green: '\x1b[32m',
  yellow: '\x1b[33m',
  blue: '\x1b[34m',
  cyan: '\x1b[36m'
};

function log(message, color = 'reset') {
  console.log(`${colors[color]}${message}${colors.reset}`);
}

function printHeader() {
  console.clear();
  log('═══════════════════════════════════════════════════════════════', 'cyan');
  log('        📊 أداة توليد تقارير الشبكات', 'bright');
  log('           Network Report Generator', 'cyan');
  log('═══════════════════════════════════════════════════════════════', 'cyan');
  console.log();
}

async function fetchData(endpoint) {
  return new Promise((resolve, reject) => {
    const options = {
      hostname: 'localhost',
      port: 3000,
      path: endpoint,
      method: 'GET'
    };

    const req = http.request(options, (res) => {
      let data = '';
      res.on('data', (chunk) => { data += chunk; });
      res.on('end', () => {
        try {
          resolve(JSON.parse(data));
        } catch (error) {
          reject(error);
        }
      });
    });

    req.on('error', reject);
    req.end();
  });
}

function generateHTMLReport(data) {
  const { test, vulnerabilities, devices } = data;
  
  const html = `<!DOCTYPE html>
<html dir="rtl" lang="ar">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>تقرير فحص الشبكة - ${test.ssid}</title>
  <style>
    * { margin: 0; padding: 0; box-sizing: border-box; }
    body { font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif; background: #f5f5f5; padding: 20px; }
    .container { max-width: 1200px; margin: 0 auto; background: white; padding: 40px; border-radius: 10px; box-shadow: 0 2px 10px rgba(0,0,0,0.1); }
    .header { text-align: center; border-bottom: 3px solid #3b82f6; padding-bottom: 20px; margin-bottom: 30px; }
    .header h1 { color: #1e40af; font-size: 32px; margin-bottom: 10px; }
    .header .subtitle { color: #666; font-size: 14px; }
    .section { margin-bottom: 30px; }
    .section-title { color: #1e40af; font-size: 24px; margin-bottom: 15px; padding-bottom: 10px; border-bottom: 2px solid #e5e7eb; }
    .info-grid { display: grid; grid-template-columns: repeat(auto-fit, minmax(250px, 1fr)); gap: 15px; margin-bottom: 20px; }
    .info-card { background: #f9fafb; padding: 15px; border-radius: 8px; border-right: 4px solid #3b82f6; }
    .info-label { font-size: 12px; color: #666; margin-bottom: 5px; }
    .info-value { font-size: 16px; color: #111; font-weight: 600; }
    .vuln-card { background: #fff; border: 1px solid #e5e7eb; border-radius: 8px; padding: 20px; margin-bottom: 15px; }
    .vuln-card.critical { border-right: 5px solid #dc2626; background: #fef2f2; }
    .vuln-card.high { border-right: 5px solid #f59e0b; background: #fef3c7; }
    .vuln-card.medium { border-right: 5px solid #eab308; background: #fef9c3; }
    .vuln-card.low { border-right: 5px solid #3b82f6; background: #f0f9ff; }
    .vuln-header { display: flex; justify-content: space-between; align-items: center; margin-bottom: 10px; }
    .vuln-title { font-size: 18px; font-weight: 600; color: #111; }
    .severity-badge { padding: 6px 12px; border-radius: 20px; font-size: 12px; font-weight: 600; color: white; }
    .severity-badge.critical { background: #dc2626; }
    .severity-badge.high { background: #f59e0b; }
    .severity-badge.medium { background: #eab308; }
    .severity-badge.low { background: #3b82f6; }
    .device-table { width: 100%; border-collapse: collapse; }
    .device-table th { background: #f9fafb; padding: 12px; text-align: right; border-bottom: 2px solid #e5e7eb; }
    .device-table td { padding: 12px; border-bottom: 1px solid #e5e7eb; }
    .footer { text-align: center; margin-top: 40px; padding-top: 20px; border-top: 2px solid #e5e7eb; color: #666; font-size: 12px; }
    @media print { body { background: white; padding: 0; } .container { box-shadow: none; } }
  </style>
</head>
<body>
  <div class="container">
    <div class="header">
      <h1>🌐 تقرير فحص الشبكة</h1>
      <div class="subtitle">تم إنشاؤه في: ${new Date().toLocaleString('ar-SA')}</div>
    </div>

    <div class="section">
      <h2 class="section-title">📋 معلومات الشبكة</h2>
      <div class="info-grid">
        <div class="info-card">
          <div class="info-label">اسم الشبكة (SSID)</div>
          <div class="info-value">${test.ssid || 'N/A'}</div>
        </div>
        <div class="info-card">
          <div class="info-label">عنوان MAC (BSSID)</div>
          <div class="info-value">${test.bssid || 'N/A'}</div>
        </div>
        <div class="info-card">
          <div class="info-label">الحالة</div>
          <div class="info-value">${test.status || 'N/A'}</div>
        </div>
        <div class="info-card">
          <div class="info-label">تاريخ الفحص</div>
          <div class="info-value">${test.startedAt ? new Date(test.startedAt).toLocaleDateString('ar-SA') : 'N/A'}</div>
        </div>
      </div>
    </div>

    <div class="section">
      <h2 class="section-title">🔍 الثغرات المكتشفة (${vulnerabilities.length})</h2>
      ${vulnerabilities.length === 0 ? '<p style="text-align: center; padding: 40px; color: #10b981; font-size: 18px;">✅ لم يتم اكتشاف ثغرات! الشبكة آمنة.</p>' : 
        vulnerabilities.map(v => `
          <div class="vuln-card ${v.severity.toLowerCase()}">
            <div class="vuln-header">
              <div class="vuln-title">${v.type.replace(/_/g, ' ')}</div>
              <span class="severity-badge ${v.severity.toLowerCase()}">${v.severity}</span>
            </div>
            <p style="color: #666; margin-bottom: 10px;">${v.description}</p>
            ${v.remediation ? `<p style="background: #f0fdf4; padding: 10px; border-radius: 6px; color: #166534; font-size: 14px;"><strong>الحل:</strong> ${v.remediation}</p>` : ''}
          </div>
        `).join('')
      }
    </div>

    <div class="section">
      <h2 class="section-title">💻 الأجهزة المتصلة (${devices.length})</h2>
      ${devices.length === 0 ? '<p style="text-align: center; padding: 20px; color: #666;">لا توجد أجهزة مكتشفة</p>' : `
        <table class="device-table">
          <thead>
            <tr>
              <th>#</th>
              <th>اسم الجهاز</th>
              <th>عنوان MAC</th>
              <th>عنوان IP</th>
              <th>المصنّع</th>
            </tr>
          </thead>
          <tbody>
            ${devices.map((d, i) => `
              <tr>
                <td>${i + 1}</td>
                <td>${d.hostname || 'Unknown'}</td>
                <td style="font-family: monospace;">${d.macAddress || 'N/A'}</td>
                <td style="font-family: monospace;">${d.ipAddress || 'N/A'}</td>
                <td>${d.vendor || 'Unknown'}</td>
              </tr>
            `).join('')}
          </tbody>
        </table>
      `}
    </div>

    <div class="footer">
      <p>تم إنشاء هذا التقرير بواسطة نظام اختبار اختراق الشبكات</p>
      <p>Penetration Testing Platform - Network Security Report</p>
    </div>
  </div>
</body>
</html>`;

  return html;
}

async function main() {
  printHeader();

  const args = process.argv.slice(2);

  if (args.length < 1) {
    log('❌ معاملات ناقصة!', 'red');
    console.log();
    log('الاستخدام:', 'yellow');
    log('  node generate-network-report.js <Session-ID> [output-file.html]', 'cyan');
    console.log();
    log('مثال:', 'yellow');
    log('  node generate-network-report.js abc123 report.html', 'cyan');
    console.log();
    process.exit(1);
  }

  const sessionId = args[0];
  const outputFile = args[1] || `network-report-${sessionId.substring(0, 8)}-${Date.now()}.html`;

  try {
    log('📊 جاري جلب بيانات الفحص...', 'yellow');
    
    const [testResponse, vulnsResponse, devicesResponse] = await Promise.all([
      fetchData(`/api/v1/network/tests/${sessionId}`),
      fetchData(`/api/v1/network/tests/${sessionId}/vulnerabilities`),
      fetchData(`/api/v1/network/tests/${sessionId}/devices`)
    ]);

    if (!testResponse.success) {
      throw new Error('فشل جلب بيانات الفحص');
    }

    const data = {
      test: testResponse.data,
      vulnerabilities: vulnsResponse.success ? vulnsResponse.data : [],
      devices: devicesResponse.success ? devicesResponse.data : []
    };

    log('✅ تم جلب البيانات بنجاح', 'green');
    log(`   الشبكة: ${data.test.ssid}`, 'blue');
    log(`   الثغرات: ${data.vulnerabilities.length}`, 'blue');
    log(`   الأجهزة: ${data.devices.length}`, 'blue');
    console.log();

    log('📝 جاري إنشاء التقرير...', 'yellow');
    const html = generateHTMLReport(data);

    log('💾 جاري حفظ التقرير...', 'yellow');
    fs.writeFileSync(outputFile, html, 'utf8');

    log('✅ تم إنشاء التقرير بنجاح!', 'green');
    console.log();
    log(`📄 الملف: ${path.resolve(outputFile)}`, 'cyan');
    log(`📊 الحجم: ${(Buffer.byteLength(html, 'utf8') / 1024).toFixed(2)} KB`, 'cyan');
    console.log();
    log('💡 لفتح التقرير:', 'yellow');
    log(`   start ${outputFile}`, 'cyan');
    console.log();

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

main();
