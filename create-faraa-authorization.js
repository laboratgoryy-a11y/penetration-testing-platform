const Database = require('better-sqlite3');

const db = new Database('penetration_testing.db');

// إنشاء تصريح لشبكة faraa net
const authId = 'faraa-net-2024';
const insertAuth = db.prepare(`
  INSERT INTO authorizations (id, user_id, organization_name, valid_from, valid_until, signed_by, digital_signature, document_path, status, allowed_operations)
  VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
`);

try {
  insertAuth.run(
    authId,
    'user-002',
    'شبكة faraa net',
    '2024-03-06',
    '2027-03-06',
    'مدير الأمن السيبراني',
    'SIGNATURE-' + Date.now(),
    `/uploads/authorizations/${authId}.pdf`,
    'ACTIVE',
    JSON.stringify(['NETWORK_TEST', 'ALL'])
  );
  
  console.log('✅ تم إنشاء التصريح بنجاح!');
  console.log('ID:', authId);
  console.log('المنظمة: شبكة faraa net');
  console.log('الحالة: ACTIVE');
  console.log('صالح حتى: 2027-03-06');
  console.log('العمليات المسموحة: NETWORK_TEST, ALL');
} catch (error) {
  console.error('❌ خطأ في إنشاء التصريح:', error.message);
}

db.close();
