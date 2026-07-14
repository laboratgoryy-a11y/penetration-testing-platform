// Database Setup Script
// يقوم بإنشاء قاعدة البيانات وتطبيق Schema وإضافة البيانات التجريبية

const { Pool } = require('pg');
const fs = require('fs');
const path = require('path');
require('dotenv').config();

// إعدادات الاتصال
const connectionConfig = {
  host: process.env.DB_HOST || 'localhost',
  port: parseInt(process.env.DB_PORT || '5432'),
  user: process.env.DB_USER || 'postgres',
  password: process.env.DB_PASSWORD || 'postgres',
  database: 'postgres' // نتصل بقاعدة postgres الافتراضية أولاً
};

const dbName = process.env.DB_NAME || 'penetration_testing_platform';

async function setupDatabase() {
  console.log('='.repeat(60));
  console.log('🚀 بدء إعداد قاعدة البيانات');
  console.log('='.repeat(60));

  let pool = new Pool(connectionConfig);

  try {
    // 1. التحقق من وجود قاعدة البيانات
    console.log('\n📋 الخطوة 1: التحقق من قاعدة البيانات...');
    const checkDbQuery = `
      SELECT 1 FROM pg_database WHERE datname = $1
    `;
    const result = await pool.query(checkDbQuery, [dbName]);

    if (result.rows.length === 0) {
      // إنشاء قاعدة البيانات
      console.log(`✨ إنشاء قاعدة البيانات: ${dbName}`);
      await pool.query(`CREATE DATABASE ${dbName}`);
      console.log('✅ تم إنشاء قاعدة البيانات بنجاح');
    } else {
      console.log(`✅ قاعدة البيانات ${dbName} موجودة بالفعل`);
    }

    // إغلاق الاتصال بقاعدة postgres
    await pool.end();

    // 2. الاتصال بقاعدة البيانات الجديدة
    console.log(`\n📋 الخطوة 2: الاتصال بقاعدة البيانات ${dbName}...`);
    pool = new Pool({
      ...connectionConfig,
      database: dbName
    });

    // 3. تطبيق Schema
    console.log('\n📋 الخطوة 3: تطبيق Schema...');
    const schemaPath = path.join(__dirname, 'src', 'database', 'schema.sql');
    
    if (!fs.existsSync(schemaPath)) {
      throw new Error(`ملف Schema غير موجود: ${schemaPath}`);
    }

    const schemaSQL = fs.readFileSync(schemaPath, 'utf8');
    await pool.query(schemaSQL);
    console.log('✅ تم تطبيق Schema بنجاح');

    // 4. إضافة البيانات التجريبية
    console.log('\n📋 الخطوة 4: إضافة البيانات التجريبية...');
    const seedPath = path.join(__dirname, 'src', 'database', 'seed-data.sql');
    
    if (!fs.existsSync(seedPath)) {
      console.log('⚠️  ملف البيانات التجريبية غير موجود، تخطي هذه الخطوة');
    } else {
      const seedSQL = fs.readFileSync(seedPath, 'utf8');
      await pool.query(seedSQL);
      console.log('✅ تم إضافة البيانات التجريبية بنجاح');
    }

    // 5. التحقق من البيانات
    console.log('\n📋 الخطوة 5: التحقق من البيانات...');
    const stats = await getStats(pool);
    console.log('\n📊 إحصائيات قاعدة البيانات:');
    console.log(`   👥 المستخدمين: ${stats.users}`);
    console.log(`   🔐 التصاريح: ${stats.authorizations}`);
    console.log(`   🔍 جلسات الفحص: ${stats.scans}`);
    console.log(`   🐟 حملات التصيد: ${stats.campaigns}`);
    console.log(`   📡 اختبارات الشبكات: ${stats.networkTests}`);
    console.log(`   🐛 الثغرات: ${stats.vulnerabilities}`);
    console.log(`   📝 سجلات التدقيق: ${stats.auditLogs}`);
    console.log(`   📄 التقارير: ${stats.reports}`);

    console.log('\n' + '='.repeat(60));
    console.log('✅ تم إعداد قاعدة البيانات بنجاح!');
    console.log('='.repeat(60));
    console.log('\n💡 معلومات الاتصال:');
    console.log(`   Host: ${connectionConfig.host}`);
    console.log(`   Port: ${connectionConfig.port}`);
    console.log(`   Database: ${dbName}`);
    console.log(`   User: ${connectionConfig.user}`);
    console.log('\n💡 مستخدمين تجريبيين:');
    console.log('   admin / password123');
    console.log('   pentester / password123');
    console.log('   analyst / password123');
    console.log('\n');

  } catch (error) {
    console.error('\n❌ خطأ في إعداد قاعدة البيانات:');
    console.error(error.message);
    
    if (error.code === 'ECONNREFUSED') {
      console.error('\n💡 تأكد من:');
      console.error('   1. تشغيل PostgreSQL');
      console.error('   2. صحة معلومات الاتصال في ملف .env');
      console.error('   3. السماح بالاتصال من localhost');
    }
    
    process.exit(1);
  } finally {
    await pool.end();
  }
}

async function getStats(pool) {
  const queries = {
    users: 'SELECT COUNT(*) FROM users',
    authorizations: 'SELECT COUNT(*) FROM authorizations',
    scans: 'SELECT COUNT(*) FROM scan_sessions',
    campaigns: 'SELECT COUNT(*) FROM phishing_campaigns',
    networkTests: 'SELECT COUNT(*) FROM network_test_sessions',
    vulnerabilities: 'SELECT COUNT(*) FROM vulnerabilities',
    auditLogs: 'SELECT COUNT(*) FROM audit_logs',
    reports: 'SELECT COUNT(*) FROM reports'
  };

  const stats = {};
  
  for (const [key, query] of Object.entries(queries)) {
    try {
      const result = await pool.query(query);
      stats[key] = parseInt(result.rows[0].count);
    } catch (error) {
      stats[key] = 0;
    }
  }

  return stats;
}

// تشغيل السكربت
if (require.main === module) {
  setupDatabase().catch(console.error);
}

module.exports = { setupDatabase };
