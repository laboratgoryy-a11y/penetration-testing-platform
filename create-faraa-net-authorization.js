#!/usr/bin/env node

/**
 * إنشاء تصريح خاص لشبكة faraa net
 */

const mysql = require('mysql2/promise');
const { v4: uuidv4 } = require('uuid');
require('dotenv').config();

async function createFaraaNetAuthorization() {
  let connection;

  try {
    console.log('🔌 الاتصال بقاعدة البيانات...');
    
    connection = await mysql.createConnection({
      host: process.env.DB_HOST || 'localhost',
      port: parseInt(process.env.DB_PORT || '3306'),
      user: process.env.DB_USER || 'root',
      password: process.env.DB_PASSWORD || '',
      database: process.env.DB_NAME || 'web_scanner'
    });

    console.log('✅ تم الاتصال بنجاح');

    // البحث عن مستخدم admin
    const [users] = await connection.execute(
      'SELECT id, username FROM users WHERE role = ? LIMIT 1',
      ['admin']
    );

    if (users.length === 0) {
      console.error('❌ لم يتم العثور على مستخدم admin');
      return;
    }

    const adminUser = users[0];
    console.log(`✅ المستخدم: ${adminUser.username}`);

    // إنشاء التصريح لشبكة faraa net
    const authorizationId = uuidv4();
    const now = new Date();
    const oneYearLater = new Date();
    oneYearLater.setFullYear(oneYearLater.getFullYear() + 1);

    await connection.execute(
      `INSERT INTO authorizations 
       (id, user_id, type, scope_type, scope_value, start_date, end_date, 
        approved_by, notes, status, created_at, updated_at)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      [
        authorizationId,
        adminUser.id,
        'NETWORK_ANALYSIS',
        'NETWORK',
        'faraa net', // اسم شبكتك
        now,
        oneYearLater,
        adminUser.username,
        'تصريح لفحص شبكة faraa net الخاصة - BSSID: 4a:1f:4c:46:18:2b',
        'ACTIVE',
        now,
        now
      ]
    );

    console.log('\n' + '='.repeat(70));
    console.log('✅ تم إنشاء التصريح لشبكة faraa net بنجاح!');
    console.log('='.repeat(70));
    console.log('\n📋 معلومات التصريح:');
    console.log('─'.repeat(70));
    console.log(`معرّف التصريح:`);
    console.log(`\x1b[32m${authorizationId}\x1b[0m`);
    console.log(`\nالشبكة: faraa net`);
    console.log(`BSSID: 4a:1f:4c:46:18:2b`);
    console.log(`التشفير: WPA2/WPA3-Personal`);
    console.log(`صالح حتى: ${oneYearLater.toLocaleDateString('ar-SA')}`);
    console.log('─'.repeat(70));
    
    console.log('\n📝 الخطوات التالية:');
    console.log('1. انسخ معرّف التصريح الأخضر أعلاه');
    console.log('2. افتح: http://localhost:3000/test-network-analyzer.html');
    console.log('3. الصق المعرّف في حقل "معرّف التصريح"');
    console.log('4. اضغط "اكتشاف الشبكات" - ستجد شبكتك في القائمة');
    console.log('5. اختر "faraa net" وابدأ الفحص!');
    
    console.log('\n💡 نصيحة: احفظ معرّف التصريح في مكان آمن');

  } catch (error) {
    console.error('\n❌ حدث خطأ:', error.message);
  } finally {
    if (connection) {
      await connection.end();
    }
  }
}

console.log('🌐 إنشاء تصريح لشبكة faraa net...\n');
createFaraaNetAuthorization()
  .then(() => {
    console.log('\n✅ تم الانتهاء بنجاح!');
    process.exit(0);
  })
  .catch((error) => {
    console.error('\n❌ فشل:', error);
    process.exit(1);
  });
