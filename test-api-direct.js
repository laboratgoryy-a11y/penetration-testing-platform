/**
 * اختبار مباشر لـ API الثغرات
 */

const Database = require('better-sqlite3');
const db = new Database('penetration_testing.db');

console.log('🔍 Testing Vulnerabilities API\n');

// 1. الحصول على آخر فحص
console.log('1️⃣ Getting latest scan...');
const latestScan = db.prepare('SELECT * FROM scan_sessions ORDER BY created_at DESC LIMIT 1').get();
console.log('Latest scan:', latestScan);
console.log('');

if (latestScan) {
  // 2. الحصول على الثغرات لهذا الفحص
  console.log(`2️⃣ Getting vulnerabilities for scan: ${latestScan.id}`);
  const vulns = db.prepare('SELECT * FROM vulnerabilities WHERE scan_session_id = ? ORDER BY severity DESC').all(latestScan.id);
  console.log(`Found ${vulns.length} vulnerabilities:`);
  console.log('');
  
  vulns.forEach((v, i) => {
    console.log(`${i + 1}. ${v.type} (${v.severity})`);
    console.log(`   Location: ${v.location}`);
    console.log(`   Description: ${v.description}`);
    console.log('');
  });

  // 3. اختبار الـ API response format
  console.log('3️⃣ API Response Format:');
  const apiResponse = {
    success: true,
    data: vulns
  };
  console.log(JSON.stringify(apiResponse, null, 2));
}

db.close();
