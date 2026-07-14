/**
 * فحص الثغرات في قاعدة البيانات
 */

const Database = require('better-sqlite3');

try {
  const db = new Database('penetration_testing.db');
  
  console.log('═══════════════════════════════════════════════════════════');
  console.log('           فحص الثغرات في قاعدة البيانات');
  console.log('═══════════════════════════════════════════════════════════\n');
  
  // 1. عرض جميع الفحوصات
  console.log('📊 جميع الفحوصات:');
  console.log('─'.repeat(60));
  const scans = db.prepare(`
    SELECT id, target_url, status, total_vulnerabilities, started_at
    FROM scan_sessions
    ORDER BY started_at DESC
    LIMIT 10
  `).all();
  
  if (scans.length === 0) {
    console.log('  ❌ لا توجد فحوصات في قاعدة البيانات');
  } else {
    scans.forEach((scan, index) => {
      console.log(`\n${index + 1}. Scan ID: ${scan.id}`);
      console.log(`   Target: ${scan.target_url}`);
      console.log(`   Status: ${scan.status}`);
      console.log(`   Vulnerabilities: ${scan.total_vulnerabilities || 0}`);
      console.log(`   Started: ${scan.started_at}`);
    });
  }
  
  console.log('\n' + '═'.repeat(60));
  
  // 2. عرض جميع الثغرات
  console.log('\n🔍 جميع الثغرات المحفوظة:');
  console.log('─'.repeat(60));
  const vulns = db.prepare(`
    SELECT v.*, s.target_url
    FROM vulnerabilities v
    LEFT JOIN scan_sessions s ON v.scan_session_id = s.id
    ORDER BY v.discovered_at DESC
    LIMIT 50
  `).all();
  
  if (vulns.length === 0) {
    console.log('  ❌ لا توجد ثغرات محفوظة في قاعدة البيانات');
  } else {
    console.log(`  ✅ تم العثور على ${vulns.length} ثغرة\n`);
    
    vulns.forEach((vuln, index) => {
      console.log(`${index + 1}. ${vuln.type} (${vuln.severity})`);
      console.log(`   Scan: ${vuln.scan_session_id}`);
      console.log(`   Target: ${vuln.target_url || 'N/A'}`);
      console.log(`   Location: ${vuln.location}`);
      console.log(`   Description: ${vuln.description}`);
      console.log(`   Discovered: ${vuln.discovered_at}`);
      console.log('');
    });
  }
  
  console.log('═'.repeat(60));
  
  // 3. إحصائيات الثغرات لكل فحص
  console.log('\n📈 إحصائيات الثغرات لكل فحص:');
  console.log('─'.repeat(60));
  const stats = db.prepare(`
    SELECT 
      s.id,
      s.target_url,
      s.status,
      s.total_vulnerabilities as reported_count,
      COUNT(v.id) as actual_count
    FROM scan_sessions s
    LEFT JOIN vulnerabilities v ON s.id = v.scan_session_id
    GROUP BY s.id
    ORDER BY s.started_at DESC
    LIMIT 10
  `).all();
  
  stats.forEach((stat, index) => {
    console.log(`\n${index + 1}. ${stat.target_url}`);
    console.log(`   Scan ID: ${stat.id}`);
    console.log(`   Status: ${stat.status}`);
    console.log(`   Reported Count: ${stat.reported_count || 0}`);
    console.log(`   Actual Count: ${stat.actual_count}`);
    
    if (stat.reported_count !== stat.actual_count) {
      console.log(`   ⚠️ MISMATCH! Reported: ${stat.reported_count}, Actual: ${stat.actual_count}`);
    } else {
      console.log(`   ✅ Match!`);
    }
  });
  
  console.log('\n' + '═'.repeat(60));
  
  // 4. الثغرات حسب النوع
  console.log('\n📊 الثغرات حسب النوع:');
  console.log('─'.repeat(60));
  const byType = db.prepare(`
    SELECT type, COUNT(*) as count
    FROM vulnerabilities
    GROUP BY type
    ORDER BY count DESC
  `).all();
  
  if (byType.length === 0) {
    console.log('  ❌ لا توجد ثغرات');
  } else {
    byType.forEach(item => {
      console.log(`  ${item.type}: ${item.count}`);
    });
  }
  
  console.log('\n' + '═'.repeat(60));
  
  // 5. الثغرات حسب الخطورة
  console.log('\n⚠️ الثغرات حسب الخطورة:');
  console.log('─'.repeat(60));
  const bySeverity = db.prepare(`
    SELECT severity, COUNT(*) as count
    FROM vulnerabilities
    GROUP BY severity
    ORDER BY 
      CASE severity
        WHEN 'CRITICAL' THEN 1
        WHEN 'HIGH' THEN 2
        WHEN 'MEDIUM' THEN 3
        WHEN 'LOW' THEN 4
        ELSE 5
      END
  `).all();
  
  if (bySeverity.length === 0) {
    console.log('  ❌ لا توجد ثغرات');
  } else {
    bySeverity.forEach(item => {
      const emoji = {
        'CRITICAL': '🔴',
        'HIGH': '🟠',
        'MEDIUM': '🟡',
        'LOW': '🟢',
        'INFO': '🔵'
      }[item.severity] || '⚪';
      console.log(`  ${emoji} ${item.severity}: ${item.count}`);
    });
  }
  
  console.log('\n' + '═'.repeat(60));
  console.log('✅ الفحص اكتمل بنجاح!');
  console.log('═'.repeat(60) + '\n');
  
  db.close();
  
} catch (error) {
  console.error('❌ خطأ:', error.message);
  process.exit(1);
}
