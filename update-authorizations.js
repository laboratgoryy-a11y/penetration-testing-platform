// تحديث التصاريح لإضافة allowed_operations
const Database = require('better-sqlite3');
const db = new Database('penetration_testing.db');

try {
  // تحديث جميع التصاريح الموجودة بتنسيق JSON صحيح
  const updateStmt = db.prepare(`
    UPDATE authorizations 
    SET allowed_operations = ?
  `);
  
  const result = updateStmt.run('["ALL"]');
  console.log(`✓ تم تحديث ${result.changes} تصريح`);
  
  // عرض التصاريح المحدثة
  const authorizations = db.prepare('SELECT id, organization_name, allowed_operations FROM authorizations').all();
  console.log('\nالتصاريح الحالية:');
  authorizations.forEach(auth => {
    console.log(`- ${auth.id}: ${auth.organization_name} - Operations: ${auth.allowed_operations}`);
  });
  
} catch (error) {
  console.error('خطأ:', error.message);
} finally {
  db.close();
}
