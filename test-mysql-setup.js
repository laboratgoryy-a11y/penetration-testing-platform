// Test MySQL Setup and Connection
const mysql = require('mysql2/promise');
require('dotenv').config();

const config = {
  host: process.env.DB_HOST || 'localhost',
  port: parseInt(process.env.DB_PORT || '3306'),
  user: process.env.DB_USER || 'root',
  password: process.env.DB_PASSWORD || '',
};

async function testConnection() {
  console.log('🔍 Testing MySQL Connection...\n');
  console.log('Configuration:');
  console.log(`  Host: ${config.host}`);
  console.log(`  Port: ${config.port}`);
  console.log(`  User: ${config.user}`);
  console.log(`  Password: ${config.password ? '***' : '(empty)'}\n`);

  let connection;
  
  try {
    // Test 1: Connect to MySQL server
    console.log('Test 1: Connecting to MySQL server...');
    connection = await mysql.createConnection(config);
    console.log('✅ Connected to MySQL server\n');

    // Test 2: Check if database exists
    console.log('Test 2: Checking if web_scanner database exists...');
    const [databases] = await connection.query(
      "SHOW DATABASES LIKE 'web_scanner'"
    );
    
    if (databases.length === 0) {
      console.log('❌ Database "web_scanner" does not exist');
      console.log('\n📝 To create the database, run:');
      console.log('   mysql -u root -e "CREATE DATABASE web_scanner"');
      console.log('\n   Or in phpMyAdmin:');
      console.log('   CREATE DATABASE web_scanner CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;\n');
      await connection.end();
      return;
    }
    
    console.log('✅ Database "web_scanner" exists\n');

    // Test 3: Connect to web_scanner database
    console.log('Test 3: Connecting to web_scanner database...');
    await connection.query('USE web_scanner');
    console.log('✅ Connected to web_scanner database\n');

    // Test 4: Check tables
    console.log('Test 4: Checking database tables...');
    const [tables] = await connection.query('SHOW TABLES');
    
    if (tables.length === 0) {
      console.log('❌ No tables found in database');
      console.log('\n📝 To create tables, run:');
      console.log('   mysql -u root web_scanner < src/database/schema.sql');
      console.log('\n   Or import src/database/schema.sql in phpMyAdmin\n');
      await connection.end();
      return;
    }

    console.log(`✅ Found ${tables.length} tables:`);
    tables.forEach(table => {
      const tableName = Object.values(table)[0];
      console.log(`   - ${tableName}`);
    });
    console.log('');

    // Test 5: Check specific required tables
    console.log('Test 5: Verifying required tables...');
    const requiredTables = [
      'users',
      'sessions',
      'roles',
      'permissions',
      'authorizations',
      'scan_sessions',
      'vulnerabilities',
      'phishing_campaigns',
      'network_test_sessions',
      'audit_logs',
      'reports'
    ];

    const existingTables = tables.map(t => Object.values(t)[0]);
    const missingTables = requiredTables.filter(t => !existingTables.includes(t));

    if (missingTables.length > 0) {
      console.log(`❌ Missing required tables: ${missingTables.join(', ')}`);
      console.log('\n📝 Please import the complete schema:');
      console.log('   mysql -u root web_scanner < src/database/schema.sql\n');
      await connection.end();
      return;
    }

    console.log('✅ All required tables exist\n');

    // Test 6: Check roles data
    console.log('Test 6: Checking default roles...');
    const [roles] = await connection.query('SELECT name FROM roles');
    
    if (roles.length === 0) {
      console.log('⚠️  No roles found (will be created on first run)');
    } else {
      console.log(`✅ Found ${roles.length} roles:`);
      roles.forEach(role => {
        console.log(`   - ${role.name}`);
      });
    }
    console.log('');

    // Test 7: Test query execution
    console.log('Test 7: Testing query execution...');
    const [result] = await connection.query('SELECT 1 + 1 AS result');
    console.log(`✅ Query executed successfully (1 + 1 = ${result[0].result})\n`);

    // All tests passed
    console.log('═══════════════════════════════════════════════════════');
    console.log('🎉 All tests passed! MySQL setup is complete.');
    console.log('═══════════════════════════════════════════════════════');
    console.log('\n✅ You can now start the server:');
    console.log('   node server-mysql.js');
    console.log('   or');
    console.log('   start-mysql-server.bat\n');
    console.log('📖 Then open: http://localhost:3001/login.html\n');

  } catch (error) {
    console.error('\n❌ Error:', error.message);
    
    if (error.code === 'ECONNREFUSED') {
      console.log('\n📝 MySQL is not running. Please:');
      console.log('   1. Open XAMPP Control Panel');
      console.log('   2. Click "Start" next to MySQL');
      console.log('   3. Wait for MySQL to start');
      console.log('   4. Run this test again\n');
    } else if (error.code === 'ER_ACCESS_DENIED_ERROR') {
      console.log('\n📝 Access denied. Please check:');
      console.log('   1. Username is correct (default: root)');
      console.log('   2. Password is correct (default: empty)');
      console.log('   3. Update .env file if needed\n');
    } else {
      console.log('\n📝 Please check:');
      console.log('   1. MySQL is running in XAMPP');
      console.log('   2. Port 3306 is not blocked');
      console.log('   3. .env file is configured correctly\n');
    }
  } finally {
    if (connection) {
      await connection.end();
    }
  }
}

// Run the test
testConnection().catch(console.error);
