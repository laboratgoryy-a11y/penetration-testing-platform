#!/usr/bin/env node

/**
 * سكربت إنشاء تصريح تجريبي لتحليل الشبكات
 * يُستخدم للاختبار السريع
 */

const mysql = require('mysql2/promise');
const { v4: uuidv4 } = require('uuid');
require('dotenv').config();

async function createNetworkAuthorization() {
  let connection;

  try {
    console.log('🔌 الاتصال بقاعدة البيانات...');
    
    // الاتصال بقاعدة البيانات
    connection = await mysql.createConnection({
      host: process.env.DB_HOST || 'localhost',
      port: parseInt(process.env.DB_PORT || '3306'),
      user: process.env.DB_USER || 'root',
      password: process.env.DB_PASSWORD || '',
      database: process.env.DB_NAME || 'web_scanner'
    });

    console.log('✅ تم الاتصال بنجاح');

    // البحث عن مستخدم admin
    console.log('\n🔍 البحث عن مستخدم admin...');
    const [users] = await connection.execute(
      'SELECT id, username FROM users WHERE role = ? LIMIT 1',
      ['admin']
    );

    if (users.length === 0) {
      console.error('❌ لم يتم العثور على مستخدم admin');
      console.log('💡 الرجاء إنشاء مستخدم admin أولاً');
      return;
    }

    const adminUser = users[0];
    console.log(`✅ تم العثور على المستخدم: ${adminUser.username}`);

    // إنشاء التصريح
    console.log('\n📝 إنشاء تصريح تحليل الشبكات...');
    
    const authorizationId = uuidv4();
    const now = new Date();
    const oneYearLater = new Date();
    oneYearLater.setFullYear(oneYearLater.getFullYear() + 1);

    const authorizationData = {
      id: authorizationId,
      user_id: adminUser.id,
      type: 'NETWORK_ANALYSIS',
      scope_type: 'NETWORK',
      scope_value: '*', // جميع الشبكات
      start_date: now,
      end_date: oneYearLater,
      approved_by: adminUser.username,
      notes: 'تصريح تجريبي لاختبار نظام تحليل الشبكات - تم إنشاؤه تلقائياً',
      status: 'ACTIVE',
      created_at: now,
      updated_at: now
    };

    await connection.execute(
      `INSERT INTO authorizations 
       (id, user_id, type, scope_type, scope_value, start_date, end_date, 
        approved_by, notes, status, created_at, updated_at)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      [
        authorizationData.id,
        authorizationData.user_id,
        authorizationData.type,
        authorizationData.scope_type,
        authorizationData.scope_value,
        authorizationData.start_date,
        authorizationData.end_date,
        authorizationData.approved_by,
        authorizationData.notes,
        authorizationData.status,
        authorizationData.created_at,
        authorizationData.updated_at
      ]
    );

    console.log('✅ تم إنشاء التصريح بنجاح!');
    console.log('\n' + '='.repeat(70));
    console.log('📋 معلومات التصريح:');
    console.log('='.repeat(70));
    console.log(`معرّف التصريح (Authorization ID):`);
    console.log(`\x1b[32m${authorizationId}\x1b[0m`);
    console.log(`\nالنوع: ${authorizationData.type}`);
    console.log(`النطاق: ${authorizationData.scope_type} - ${authorizationData.scope_value}`);
    console.log(`تاريخ البدء: ${authorizationData.start_date.toLocaleDateString('ar-SA')}`);
    console.log(`تاريخ الانتهاء: ${authorizationData.end_date.toLocaleDateString('ar-SA')}`);
    console.log(`المستخدم: ${adminUser.username}`);
    console.log('='.repeat(70));
    
    console.log('\n📝 انسخ معرّف التصريح أعلاه واستخدمه في صفحة الاختبار:');
    console.log('   http://localhost:3000/test-network-analyzer.html');
    
    console.log('\n💡 نصيحة: يمكنك نسخ المعرّف مباشرة من السطر الأخضر أعلاه');

  } catch (error) {
    console.error('\n❌ حدث خطأ:', error.message);
    
    if (error.code === 'ER_NO_SUCH_TABLE') {
      console.log('\n💡 يبدو أن جدول authorizations غير موجود');
      console.log('   الرجاء تشغيل السيرفر أولاً لإنشاء الجداول:');
      console.log('   npm start');
    } else if (error.code === 'ECONNREFUSED') {
      console.log('\n💡 لا يمكن الاتصال بقاعدة البيانات');
      console.log('   تأكد من:');
      console.log('   1. تشغيل MySQL');
      console.log('   2. صحة بيانات الاتصال في ملف .env');
    }
    
    console.error('\nتفاصيل الخطأ الكاملة:');
    console.error(error);
  } finally {
    if (connection) {
      await connection.end();
      console.log('\n🔌 تم إغلاق الاتصال بقاعدة البيانات');
    }
  }
}

// تشغيل السكربت
console.log('🚀 بدء إنشاء تصريح تحليل الشبكات...\n');
createNetworkAuthorization()
  .then(() => {
    console.log('\n✅ تم الانتهاء بنجاح!');
    process.exit(0);
  })
  .catch((error) => {
    console.error('\n❌ فشل السكربت:', error);
    process.exit(1);
  });
