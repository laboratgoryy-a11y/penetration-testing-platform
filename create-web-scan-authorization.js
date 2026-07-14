const Database = require('better-sqlite3');

const db = new Database('penetration_testing.db');

// إنشاء تصريح لفحص الويب
const authId = 'web-scan-2024';
const insertAuth = db.prepare(`
  INSERT INTO authorizations (id, user_id, organization_name, valid_from, valid_until, signed_by, digital_signature, document_path, status, allowed_operations)
  VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
`);

try {
  insertAuth.run(
    authId,
    'user-001',
    'منصة اختبار الاختراق',
    '2024-01-01',
    '2027-12-31',
    'مدير الأمن السيبراني',
    'SIGNATURE-' + Date.now(),
    `/uploads/authorizations/${authId}.pdf`,
    'ACTIVE',
    JSON.stringify(['WEB_SCAN', 'ALL'])
  );
  
  console.log('✅ تم إنشاء تصريح فحص الويب بنجاح!');
  console.log('ID:', authId);
  console.log('المنظمة: منصة اختبار الاختراق');
  console.log('الحالة: ACTIVE');
  console.log('صالح حتى: 2027-12-31');
  console.log('العمليات المسموحة: WEB_SCAN, ALL');
} catch (error) {
  console.error('❌ خطأ في إنشاء التصريح:', error.message);
}

db.close();
