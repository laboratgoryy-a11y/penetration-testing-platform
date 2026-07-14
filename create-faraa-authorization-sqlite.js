#!/usr/bin/env node

/**
 * إنشاء تصريح لشبكة faraa net باستخدام SQLite
 */

const sqlite3 = require('sqlite3').verbose();
const { v4: uuidv4 } = require('uuid');
const path = require('path');

async function createFaraaNetAuthorization() {
  const dbPath = path.join(__dirname, 'penetration_testing.db');
  const db = new sqlite3.Database(dbPath);

  return new Promise((resolve, reject) => {
    console.log('🌐 إنشاء تصريح لشبكة faraa net...\n');
    console.log('🔌 الاتصال بقاعدة البيانات SQLite...');

    // البحث عن مستخدم admin
    db.get('SELECT id, username FROM users WHERE role = ? LIMIT 1', ['admin'], (err, user) => {
      if (err) {
        console.error('❌ خطأ في قاعدة البيانات:', err.message);
        db.close();
        reject(err);
        return;
      }

      if (!user) {
        console.error('❌ لم يتم العثور على مستخدم admin');
        console.log('\n💡 الرجاء تسجيل الدخول أولاً لإنشاء مستخدم admin');
        db.close();
        resolve(null);
        return;
      }

      console.log(`✅ تم العثور على المستخدم: ${user.username}`);

      // إنشاء التصريح
      const authorizationId = uuidv4();
      const now = new Date().toISOString();
      const oneYearLater = new Date();
      oneYearLater.setFullYear(oneYearLater.getFullYear() + 1);

      const sql = `
        INSERT INTO authorizations 
        (id, user_id, type, scope_type, scope_value, start_date, end_date, 
         approved_by, notes, status, created_at, updated_at)
        VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
      `;

      const params = [
        authorizationId,
        user.id,
        'NETWORK_ANALYSIS',
        'NETWORK',
        'faraa net',
        now,
        oneYearLater.toISOString(),
        user.username,
        'تصريح لفحص شبكة faraa net الخاصة - BSSID: 4a:1f:4c:46:18:2b',
        'ACTIVE',
        now,
        now
      ];

      db.run(sql, params, function(err) {
        if (err) {
          console.error('❌ خطأ في إنشاء التصريح:', err.message);
          db.close();
          reject(err);
          return;
        }

        console.log('\n' + '═'.repeat(70));
        console.log('✅ تم إنشاء التصريح لشبكة faraa net بنجاح!');
        console.log('═'.repeat(70));
        console.log('\n📋 معلومات التصريح:');
        console.log('─'.repeat(70));
        console.log('معرّف التصريح (Authorization ID):');
        console.log('\x1b[32m%s\x1b[0m', authorizationId);
        console.log('\nالشبكة: faraa net');
        console.log('BSSID: 4a:1f:4c:46:18:2b');
        console.log('التشفير: WPA2/WPA3-Personal');
        console.log('صالح حتى:', oneYearLater.toLocaleDateString('ar-SA'));
        console.log('─'.repeat(70));
        
        console.log('\n📝 الخطوات التالية:');
        console.log('1. انسخ معرّف التصريح الأخضر أعلاه ☝');
        console.log('2. افتح: http://localhost:3000/test-network-analyzer.html');
        console.log('3. الصق المعرّف في حقل "معرّف التصريح"');
        console.log('4. أدخل بيانات شبكتك:');
        console.log('   SSID: faraa net');
        console.log('   BSSID: 4a:1f:4c:46:18:2b');
        console.log('5. اختر نوع الفحص واضغط "بدء الفحص"!');
        
        console.log('\n💡 نصيحة: احفظ معرّف التصريح في مكان آمن');
        console.log('═'.repeat(70));

        db.close();
        resolve(authorizationId);
      });
    });
  });
}

// تشغيل السكربت
createFaraaNetAuthorization()
  .then((authId) => {
    if (authId) {
      console.log('\n✅ تم الانتهاء بنجاح!');
      console.log('\n🚀 الآن افتح المتصفح على:');
      console.log('   http://localhost:3000/test-network-analyzer.html');
    }
    process.exit(0);
  })
  .catch((error) => {
    console.error('\n❌ فشل السكربت:', error.message);
    process.exit(1);
  });
