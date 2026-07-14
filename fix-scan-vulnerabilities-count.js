/**
 * إصلاح عدد الثغرات في الفحوصات القديمة
 * يقوم بحساب الثغرات الفعلية وتحديث قاعدة البيانات
 */

const Database = require('better-sqlite3');
const db = new Database('penetration_testing.db');

console.log('🔧 إصلاح عدد الثغرات في الفحوصات...\n');

try {
    // الحصول على جميع الفحوصات
    const scans = db.prepare('SELECT id, target_url, total_vulnerabilities FROM scan_sessions').all();
    
    console.log(`📊 Found ${scans.length} scans\n`);
    
    let fixed = 0;
    
    for (const scan of scans) {
        // حساب عدد الثغرات الفعلي
        const vulnCount = db.prepare('SELECT COUNT(*) as count FROM vulnerabilities WHERE scan_session_id = ?').get(scan.id);
        const actualCount = vulnCount.count;
        
        if (actualCount !== scan.total_vulnerabilities) {
            console.log(`🔄 Fixing scan: ${scan.id}`);
            console.log(`   Target: ${scan.target_url}`);
            console.log(`   Old count: ${scan.total_vulnerabilities}`);
            console.log(`   Actual count: ${actualCount}`);
            
            // تحديث العدد
            db.prepare('UPDATE scan_sessions SET total_vulnerabilities = ? WHERE id = ?').run(actualCount, scan.id);
            
            console.log(`   ✅ Updated!\n`);
            fixed++;
        }
    }
    
    console.log(`\n✅ Fixed ${fixed} scans`);
    console.log(`✅ ${scans.length - fixed} scans were already correct`);
    
} catch (error) {
    console.error('❌ Error:', error.message);
} finally {
    db.close();
}
