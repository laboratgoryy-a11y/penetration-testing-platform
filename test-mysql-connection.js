/**
 * اختبار الاتصال بـ MySQL
 * Test MySQL Connection
 * 
 * استخدام:
 * node test-mysql-connection.js
 */

const mysql = require('mysql2/promise');
require('dotenv').config();

const config = {
  host: process.env.DB_HOST || 'localhost',
  port: parseInt(process.env.DB_PORT || '3306'),
  database: process.env.DB_NAME || 'penetration_testing_platform',
  user: process.env.DB_USER || 'root',
  password: process.env.DB_PASSWORD || '',
};

async function testConnection() {
  console.log('═══════════════════════════════════════════════════════════');
  console.log('🔍 اختبار الاتصال بـ MySQL');
  console.log('═══════════════════════════════════════════════════════════\n');

  console.log('📋 إعدادات الاتصال:');
  console.log(`   Host: ${config.host}`);
  console.log(`   Port: ${config.port}`);
  console.log(`   Database: ${config.database}`);
  console.log(`   User: ${config.user}`);
  console.log(`   Password: ${config.password ? '***' : '(empty)'}\n`);

  let connection;

  try {
    // Test 1: Connect to MySQL server
    console.log('🔌 [1/5] الاتصال بخادم MySQL...');
    connection = await mysql.createConnection({
      host: config.host,
      port: config.port,
      user: config.user,
      password: config.password,
    });
    console.log('   ✅ تم الاتصال بخادم MySQL بنجاح\n');

    // Test 2: Check MySQL version
    console.log('📊 [2/5] التحقق من إصدار MySQL...');
    const [versionRows] = await connection.query('SELECT VERSION() as version');
    console.log(`   ✅ إصدار MySQL: ${versionRows[0].version}\n`);

    // Test 3: Check if database exists
    console.log('🗄️  [3/5] التحقق من وجود قاعدة البيانات...');
    const [dbRows] = await connection.query(
      'SELECT SCHEMA_NAME FROM information_schema.SCHEMATA WHERE SCHEMA_NAME = ?',
      [config.database]
    );

    if (dbRows.length === 0) {
      console.log(`   ⚠️  قاعدة البيانات "${config.database}" غير موجودة`);
      console.log('   💡 قم بإنشائها باستخدام:');
      console.log(`      CREATE DATABASE ${config.database} CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;\n`);
      
      // Try to create database
      console.log('   🔧 محاولة إنشاء قاعدة البيانات...');
      await connection.query(
        `CREATE DATABASE IF NOT EXISTS ${config.database} CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci`
      );
      console.log('   ✅ تم إنشاء قاعدة البيانات بنجاح\n');
    } else {
      console.log(`   ✅ قاعدة البيانات "${config.database}" موجودة\n`);
    }

    // Test 4: Connect to database
    console.log('🔗 [4/5] الاتصال بقاعدة البيانات...');
    await connection.changeUser({ database: config.database });
    console.log('   ✅ تم الاتصال بقاعدة البيانات بنجاح\n');

    // Test 5: Check tables
    console.log('📋 [5/5] التحقق من الجداول...');
    const [tables] = await connection.query('SHOW TABLES');
    
    if (tables.length === 0) {
      console.log('   ⚠️  لا توجد جداول في قاعدة البيانات');
      console.log('   💡 قم باستيراد Schema من:');
      console.log('      src/database/schema-mysql-complete.sql\n');
    } else {
      console.log(`   ✅ عدد الجداول: ${tables.length}`);
      console.log('   📊 الجداول الموجودة:');
      tables.forEach((table, index) => {
        const tableName = Object.values(table)[0];
        console.log(`      ${index + 1}. ${tableName}`);
      });
      console.log('');
    }

    // Test query
    console.log('🧪 اختبار استعلام بسيط...');
    const [result] = await connection.query('SELECT 1 + 1 AS result');
    console.log(`   ✅ النتيجة: ${result[0].result}\n`);

    console.log('═══════════════════════════════════════════════════════════');
    console.log('✅ جميع الاختبارات نجحت!');
    console.log('═══════════════════════════════════════════════════════════\n');

    console.log('🎯 الخطوات التالية:');
    if (tables.length === 0) {
      console.log('   1. استورد Schema: src/database/schema-mysql-complete.sql');
      console.log('   2. شغل النظام: npm start');
    } else {
      console.log('   1. شغل النظام: npm start');
      console.log('   2. افتح المتصفح: http://localhost:3001/login.html');
    }
    console.log('');

  } catch (error) {
    console.log('═══════════════════════════════════════════════════════════');
    console.log('❌ فشل الاختبار!');
    console.log('═══════════════════════════════════════════════════════════\n');

    console.log('🔍 تفاصيل الخطأ:');
    console.log(`   الرسالة: ${error.message}`);
    console.log(`   الكود: ${error.code}\n`);

    console.log('💡 الحلول المقترحة:\n');

    if (error.code === 'ECONNREFUSED') {
      console.log('   ❌ لا يمكن الاتصال بخادم MySQL');
      console.log('   ✓ تأكد من تشغيل MySQL في XAMPP Control Panel');
      console.log('   ✓ تحقق من أن المنفذ 3306 غير محجوب');
    } else if (error.code === 'ER_ACCESS_DENIED_ERROR') {
      console.log('   ❌ خطأ في اسم المستخدم أو كلمة المرور');
      console.log('   ✓ تحقق من DB_USER و DB_PASSWORD في ملف .env');
      console.log('   ✓ المستخدم الافتراضي: root');
      console.log('   ✓ كلمة المرور الافتراضية: (فارغة)');
    } else if (error.code === 'ER_BAD_DB_ERROR') {
      console.log('   ❌ قاعدة البيانات غير موجودة');
      console.log('   ✓ أنشئ قاعدة البيانات من phpMyAdmin');
      console.log('   ✓ أو استخدم: create-database-mysql.sql');
    } else {
      console.log('   ❌ خطأ غير متوقع');
      console.log('   ✓ تحقق من إعدادات .env');
      console.log('   ✓ تأكد من تثبيت mysql2: npm install mysql2');
      console.log('   ✓ راجع الدليل: MYSQL_SETUP_COMPLETE_GUIDE.md');
    }
    console.log('');

  } finally {
    if (connection) {
      await connection.end();
      console.log('🔌 تم إغلاق الاتصال\n');
    }
  }
}

// Run test
testConnection().catch(console.error);
