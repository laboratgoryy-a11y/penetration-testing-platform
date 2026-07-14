#!/usr/bin/env node

/**
 * أداة مراقبة الشبكة في الوقت الفعلي
 * Real-time Network Monitor
 */

const http = require('http');
const readline = require('readline');

// الألوان
const colors = {
  reset: '\x1b[0m',
  bright: '\x1b[1m',
  dim: '\x1b[2m',
  red: '\x1b[31m',
  green: '\x1b[32m',
  yellow: '\x1b[33m',
  blue: '\x1b[34m',
  magenta: '\x1b[35m',
  cyan: '\x1b[36m',
  white: '\x1b[37m',
  bgRed: '\x1b[41m',
  bgGreen: '\x1b[42m',
  bgYellow: '\x1b[43m',
  bgBlue: '\x1b[44m'
};

function log(message, color = 'reset') {
  console.log(`${colors[color]}${message}${colors.reset}`);
}

function clearScreen() {
  console.clear();
  process.stdout.write('\x1b[2J\x1b[0f');
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

      res.on('data', (chunk) => {
        data += chunk;
      });

      res.on('end', () => {
        try {
          resolve(JSON.parse(data));
        } catch (error) {
          reject(error);
        }
      });
    });

    req.on('error', reject);
    req.setTimeout(5000, () => {
      req.destroy();
      reject(new Error('Timeout'));
    });

    req.end();
  });
}

function formatTime(date) {
  if (!date) return 'N/A';
  const d = new Date(date);
  return d.toLocaleTimeString('ar-SA', { hour: '2-digit', minute: '2-digit', second: '2-digit' });
}

function formatDate(date) {
  if (!date) return 'N/A';
  const d = new Date(date);
  return d.toLocaleDateString('ar-SA', { year: 'numeric', month: '2-digit', day: '2-digit' });
}

function getStatusColor(status) {
  const statusColors = {
    'RUNNING': 'blue',
    'PENDING': 'yellow',
    'COMPLETED': 'green',
    'FAILED': 'red',
    'STOPPED': 'dim'
  };
  return statusColors[status] || 'reset';
}

function getStatusIcon(status) {
  const icons = {
    'RUNNING': '⚡',
    'PENDING': '⏳',
    'COMPLETED': '✅',
    'FAILED': '❌',
    'STOPPED': '⏸️'
  };
  return icons[status] || '❓';
}

function getSeverityColor(severity) {
  const colors = {
    'CRITICAL': 'red',
    'HIGH': 'red',
    'MEDIUM': 'yellow',
    'LOW': 'blue'
  };
  return colors[severity] || 'reset';
}

function drawBox(title, content, width = 70) {
  const topBorder = '╔' + '═'.repeat(width - 2) + '╗';
  const bottomBorder = '╚' + '═'.repeat(width - 2) + '╝';
  const titleLine = '║ ' + title + ' '.repeat(width - title.length - 3) + '║';
  const separator = '╟' + '─'.repeat(width - 2) + '╢';

  console.log(colors.cyan + topBorder + colors.reset);
  console.log(colors.bright + titleLine + colors.reset);
  console.log(colors.cyan + separator + colors.reset);

  content.forEach(line => {
    const padding = ' '.repeat(Math.max(0, width - line.length - 4));
    console.log(colors.cyan + '║ ' + colors.reset + line + padding + colors.cyan + ' ║' + colors.reset);
  });

  console.log(colors.cyan + bottomBorder + colors.reset);
}

async function displayDashboard() {
  try {
    clearScreen();

    // العنوان
    log('═══════════════════════════════════════════════════════════════════════', 'cyan');
    log('                  🌐 مراقب الشبكات في الوقت الفعلي', 'bright');
    log('                    Real-time Network Monitor', 'cyan');
    log('═══════════════════════════════════════════════════════════════════════', 'cyan');
    console.log();

    // الوقت الحالي
    const now = new Date();
    log(`⏰ ${now.toLocaleString('ar-SA')}`, 'dim');
    console.log();

    // جلب البيانات
    const [testsResponse] = await Promise.all([
      fetchData('/api/v1/network/tests').catch(() => ({ success: false, data: { tests: [] } }))
    ]);

    const tests = testsResponse.success ? testsResponse.data.tests : [];

    // إحصائيات عامة
    const stats = {
      total: tests.length,
      running: tests.filter(t => t.status === 'RUNNING').length,
      completed: tests.filter(t => t.status === 'COMPLETED').length,
      failed: tests.filter(t => t.status === 'FAILED').length,
      pending: tests.filter(t => t.status === 'PENDING').length
    };

    // عرض الإحصائيات
    const statsContent = [
      `${colors.bright}إجمالي الفحوصات:${colors.reset} ${stats.total}`,
      `${colors.blue}⚡ قيد التنفيذ:${colors.reset} ${stats.running}`,
      `${colors.green}✅ مكتمل:${colors.reset} ${stats.completed}`,
      `${colors.red}❌ فشل:${colors.reset} ${stats.failed}`,
      `${colors.yellow}⏳ قيد الانتظار:${colors.reset} ${stats.pending}`
    ];

    drawBox('📊 الإحصائيات', statsContent);
    console.log();

    // الفحوصات النشطة
    const activeTests = tests.filter(t => t.status === 'RUNNING' || t.status === 'PENDING');

    if (activeTests.length > 0) {
      const activeContent = [];
      activeTests.forEach((test, index) => {
        const icon = getStatusIcon(test.status);
        const statusColor = getStatusColor(test.status);
        const startTime = formatTime(test.startedAt);

        activeContent.push(
          `${index + 1}. ${icon} ${test.ssid || 'Unknown'} (${test.bssid || 'N/A'})`
        );
        activeContent.push(
          `   ${colors[statusColor]}الحالة: ${test.status}${colors.reset} | بدأ: ${startTime}`
        );
        if (index < activeTests.length - 1) {
          activeContent.push('');
        }
      });

      drawBox('⚡ الفحوصات النشطة', activeContent);
      console.log();
    }

    // آخر الفحوصات المكتملة
    const completedTests = tests
      .filter(t => t.status === 'COMPLETED')
      .sort((a, b) => new Date(b.completedAt) - new Date(a.completedAt))
      .slice(0, 5);

    if (completedTests.length > 0) {
      const completedContent = [];
      completedTests.forEach((test, index) => {
        const completedTime = formatTime(test.completedAt);

        completedContent.push(
          `${index + 1}. ✅ ${test.ssid || 'Unknown'} (${test.bssid || 'N/A'})`
        );
        completedContent.push(
          `   اكتمل: ${completedTime}`
        );
        if (index < completedTests.length - 1) {
          completedContent.push('');
        }
      });

      drawBox('✅ آخر الفحوصات المكتملة', completedContent);
      console.log();
    }

    // تعليمات
    log('═══════════════════════════════════════════════════════════════════════', 'cyan');
    log('  [R] تحديث | [Q] خروج | التحديث التلقائي كل 5 ثواني', 'dim');
    log('═══════════════════════════════════════════════════════════════════════', 'cyan');

  } catch (error) {
    clearScreen();
    log('═══════════════════════════════════════════════════════════════════════', 'red');
    log('❌ خطأ في الاتصال بالسيرفر', 'red');
    log('═══════════════════════════════════════════════════════════════════════', 'red');
    console.log();
    log('💡 تأكد من:', 'yellow');
    log('   1. تشغيل السيرفر: npm start', 'cyan');
    log('   2. السيرفر يعمل على المنفذ 3000', 'cyan');
    console.log();
    log(`الخطأ: ${error.message}`, 'red');
    console.log();
  }
}

async function startMonitoring() {
  let isRunning = true;
  let autoRefreshInterval;

  // إعداد readline للتفاعل
  readline.emitKeypressEvents(process.stdin);
  if (process.stdin.isTTY) {
    process.stdin.setRawMode(true);
  }

  process.stdin.on('keypress', (str, key) => {
    if (key.name === 'q' || (key.ctrl && key.name === 'c')) {
      isRunning = false;
      clearInterval(autoRefreshInterval);
      clearScreen();
      log('👋 تم إيقاف المراقبة', 'green');
      process.exit(0);
    } else if (key.name === 'r') {
      displayDashboard();
    }
  });

  // عرض أول مرة
  await displayDashboard();

  // التحديث التلقائي كل 5 ثواني
  autoRefreshInterval = setInterval(async () => {
    if (isRunning) {
      await displayDashboard();
    }
  }, 5000);
}

// بدء المراقبة
log('🚀 بدء مراقبة الشبكات...', 'green');
setTimeout(() => {
  startMonitoring();
}, 1000);
