// Simple web scan authorization creation
const fs = require('fs');
const path = require('path');

// Create a simple authorization file
const webAuth = {
  id: 'web-scan-2024',
  user_id: 'admin',
  organization_name: 'منصة اختبار الاختراق',
  valid_from: '2024-01-01',
  valid_until: '2027-12-31',
  signed_by: 'مدير الأمن السيبراني',
  digital_signature: 'SIGNATURE-' + Date.now(),
  document_path: '/uploads/authorizations/web-scan-2024.pdf',
  status: 'ACTIVE',
  allowed_operations: ['WEB_SCAN', 'ALL'],
  created_at: new Date().toISOString()
};

// Save authorization to a file
const authPath = path.join(__dirname, 'authorizations', 'web-scan-2024.json');
if (!fs.existsSync(path.dirname(authPath))) {
  fs.mkdirSync(path.dirname(authPath), { recursive: true });
}

fs.writeFileSync(authPath, JSON.stringify(webAuth, null, 2));

console.log('✅ تم إنشاء تصريح فحص الويب بنجاح!');
console.log('ID:', webAuth.id);
console.log('المنظمة:', webAuth.organization_name);
console.log('الحالة:', webAuth.status);
console.log('صالح حتى:', webAuth.valid_until);
console.log('العمليات المسموحة:', webAuth.allowed_operations.join(', '));
console.log('ملف التصريح:', authPath);
