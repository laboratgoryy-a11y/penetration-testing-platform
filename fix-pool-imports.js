/**
 * Script to replace all Pool imports from 'pg' to 'mysql2/promise'
 * استبدال جميع استيرادات Pool من pg إلى mysql2/promise
 */

const fs = require('fs');
const path = require('path');

// قائمة الملفات التي تحتاج تعديل
const filesToFix = [
  'src/services/WebScanner.ts',
  'src/services/SessionManager.ts',
  'src/services/SecureDataDeletion.ts',
  'src/services/ReportGenerator.ts',
  'src/services/PhishingEngine.ts',
  'src/services/NetworkNotificationService.ts',
  'src/services/NetworkAnalyzer.ts',
  'src/services/MFAService.ts',
  'src/services/KeyManagementService.ts',
  'src/services/ip-scanner/AuthorizationValidator.ts',
  'src/services/ErrorHandler.ts',
  'src/services/DataRetentionService.ts',
  'src/services/CVEService.ts',
  'src/services/AuthorizationService.ts',
  'src/services/AuthorizationManager.ts',
  'src/services/AuthorizationExpirationMonitor.ts',
  'src/services/AuthorizationBypassDetector.ts',
  'src/services/AuthenticationService.ts',
  'src/services/AuditRetentionService.ts',
  'src/services/AuditorNotificationService.ts',
  'src/services/AuditLogger.ts',
  'src/services/AuditAccessControl.ts',
  'src/services/ip-scanner/NSEScriptManager.ts',
  'src/services/ip-scanner/NotificationService.ts',
  'src/services/ip-scanner/NmapService.ts',
  'src/services/ip-scanner/MLEngine.ts',
  'src/services/ip-scanner/ComparisonService.ts',
  'src/services/ip-scanner/RecommendationEngine.ts',
  'src/services/ip-scanner/VulnerabilityScanner.ts',
  'src/services/ip-scanner/SchedulerService.ts',
  'src/services/ip-scanner/ScheduleEngine.ts',
  'src/api/routes/ipScanRoutes.ts'
];

let successCount = 0;
let errorCount = 0;
let skippedCount = 0;

console.log('═══════════════════════════════════════════════════════════');
console.log('🔧 استبدال استيرادات Pool من pg إلى mysql2/promise');
console.log('═══════════════════════════════════════════════════════════\n');

filesToFix.forEach((filePath, index) => {
  try {
    const fullPath = path.join(__dirname, filePath);
    
    // التحقق من وجود الملف
    if (!fs.existsSync(fullPath)) {
      console.log(`⚠️  [${index + 1}/${filesToFix.length}] تخطي: ${filePath} (غير موجود)`);
      skippedCount++;
      return;
    }

    // قراءة محتوى الملف
    let content = fs.readFileSync(fullPath, 'utf8');
    
    // التحقق من وجود الاستيراد القديم
    if (!content.includes("from 'pg'") && !content.includes('from "pg"')) {
      console.log(`⏭️  [${index + 1}/${filesToFix.length}] تخطي: ${filePath} (تم التعديل مسبقاً)`);
      skippedCount++;
      return;
    }

    // استبدال الاستيراد
    const oldImport1 = "import { Pool } from 'pg';";
    const oldImport2 = 'import { Pool } from "pg";';
    const newImport = "import { Pool } from 'mysql2/promise';";

    if (content.includes(oldImport1)) {
      content = content.replace(oldImport1, newImport);
    } else if (content.includes(oldImport2)) {
      content = content.replace(oldImport2, newImport);
    }

    // كتابة المحتوى المعدل
    fs.writeFileSync(fullPath, content, 'utf8');
    
    console.log(`✅ [${index + 1}/${filesToFix.length}] تم: ${filePath}`);
    successCount++;
    
  } catch (error) {
    console.error(`❌ [${index + 1}/${filesToFix.length}] خطأ في ${filePath}:`, error.message);
    errorCount++;
  }
});

console.log('\n═══════════════════════════════════════════════════════════');
console.log('📊 النتائج:');
console.log('═══════════════════════════════════════════════════════════');
console.log(`✅ نجح: ${successCount}`);
console.log(`⏭️  تم تخطيه: ${skippedCount}`);
console.log(`❌ فشل: ${errorCount}`);
console.log(`📁 الإجمالي: ${filesToFix.length}`);
console.log('═══════════════════════════════════════════════════════════\n');

if (successCount > 0) {
  console.log('🎉 تم استبدال الاستيرادات بنجاح!');
  console.log('');
  console.log('الخطوات التالية:');
  console.log('1. تثبيت mysql2: npm install mysql2');
  console.log('2. بناء المشروع: npm run build');
  console.log('3. تشغيل النظام: npm start');
  console.log('');
}

if (errorCount > 0) {
  console.log('⚠️  بعض الملفات فشلت. راجع الأخطاء أعلاه.');
  process.exit(1);
}
