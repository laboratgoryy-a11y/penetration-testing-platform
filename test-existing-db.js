// Test connection to existing "web scanner" database
const mysql = require('mysql2/promise');
require('dotenv').config();

const config = {
  host: process.env.DB_HOST || 'localhost',
  port: parseInt(process.env.DB_PORT || '3306'),
  database: 'web scanner', // Database name with space
  user: process.env.DB_USER || 'root',
  password: process.env.DB_PASSWORD || '',
  charset: 'utf8mb4'
};

async function testConnection() {
  console.log('🔍 Testing Connection to Existing Database...\n');
  console.log('Configuration:');
  console.log(`  Host: ${config.host}:${config.port}`);
  console.log(`  Database: "${config.database}"`);
  console.log(`  User: ${config.user}`);
  console.log(`  Password: ${config.password ? '***' : '(empty)'}`);
  console.log(`  Charset: ${config.charset}\n`);

  let connection;
  
  try {
    // Test 1: Connect to database
    console.log('Test 1: Connecting to "web scanner" database...');
    connection = await mysql.createConnection(config);
    console.log('✅ Connected successfully\n');

    // Test 2: Check tables
    console.log('Test 2: Checking tables...');
    const [tables] = await connection.query('SHOW TABLES');
    
    if (tables.length === 0) {
      console.log('❌ No tables found in database\n');
      await connection.end();
      return;
    }
    
    console.log(`✅ Found ${tables.length} tables:`);
    tables.forEach(table => {
      const tableName = Object.values(table)[0];
      console.log(`   - ${tableName}`);
    });
    console.log('');

    // Test 3: Check users table
    console.log('Test 3: Checking users table...');
    const [users] = await connection.query('SELECT id, name, status FROM users');
    
    if (users.length === 0) {
      console.log('⚠️  No users found in database\n');
    } else {
      console.log(`✅ Found ${users.length} users:`);
      users.forEach(user => {
        console.log(`   - ID: ${user.id}, Name: ${user.name}, Status: ${user.status}`);
      });
    }
    console.log('');

    // Test 4: Check user_roles
    console.log('Test 4: Checking user_roles...');
    const [roles] = await connection.query(`
      SELECT ur.user_id, u.name, ur.role_id 
      FROM user_roles ur 
      JOIN users u ON ur.user_id = u.id
    `);
    
    if (roles.length === 0) {
      console.log('⚠️  No user roles found\n');
    } else {
      console.log(`✅ Found ${roles.length} user role assignments:`);
      roles.forEach(role => {
        const roleType = role.role_id === 1 ? 'ADMIN' : 'USER';
        console.log(`   - User: ${role.name} (ID: ${role.user_id}) → Role: ${roleType} (${role.role_id})`);
      });
    }
    console.log('');

    // Test 5: Check bookmarks
    console.log('Test 5: Checking bookmarks...');
    const [bookmarks] = await connection.query(`
      SELECT b.id, b.user_id, u.name, b.title, b.url 
      FROM bookmarks b 
      JOIN users u ON b.user_id = u.id
    `);
    
    if (bookmarks.length === 0) {
      console.log('⚠️  No bookmarks found\n');
    } else {
      console.log(`✅ Found ${bookmarks.length} bookmarks:`);
      bookmarks.forEach(bookmark => {
        console.log(`   - User: ${bookmark.name}, Title: ${bookmark.title}, URL: ${bookmark.url}`);
      });
    }
    console.log('');

    // Test 6: Test admin user login
    console.log('Test 6: Testing admin user...');
    const [adminUsers] = await connection.query(
      'SELECT u.*, ur.role_id FROM users u LEFT JOIN user_roles ur ON u.id = ur.user_id WHERE u.name = ? AND u.status = ?',
      ['admin', 'active']
    );
    
    if (adminUsers.length === 0) {
      console.log('❌ Admin user not found or not active\n');
    } else {
      const admin = adminUsers[0];
      console.log('✅ Admin user found:');
      console.log(`   - ID: ${admin.id}`);
      console.log(`   - Name: ${admin.name}`);
      console.log(`   - Description: ${admin.description}`);
      console.log(`   - Status: ${admin.status}`);
      console.log(`   - Role ID: ${admin.role_id}`);
      console.log(`   - Role Type: ${admin.role_id === 1 ? 'ADMIN' : 'USER'}`);
    }
    console.log('');

    // All tests passed
    console.log('═══════════════════════════════════════════════════════');
    console.log('🎉 All tests passed! Database is ready.');
    console.log('═══════════════════════════════════════════════════════');
    console.log('\n✅ You can now start the server:');
    console.log('   start-existing-db.bat\n');
    console.log('📖 Then login with:');
    console.log('   Username: admin (or user1, user2)');
    console.log('   Password: any password\n');
    console.log('🌐 Access: http://localhost:3001/login.html\n');

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
      console.log('   1. Username is correct (current: root)');
      console.log('   2. Password is correct (current: admin)');
      console.log('   3. Update .env file if needed\n');
    } else if (error.code === 'ER_BAD_DB_ERROR') {
      console.log('\n📝 Database "web scanner" does not exist. Please:');
      console.log('   1. Open phpMyAdmin');
      console.log('   2. Create database: CREATE DATABASE `web scanner`;');
      console.log('   3. Import your tables\n');
    } else {
      console.log('\n📝 Please check:');
      console.log('   1. MySQL is running in XAMPP');
      console.log('   2. Database name is correct: "web scanner" (with space)');
      console.log('   3. Username and password are correct');
      console.log('   4. .env file is configured correctly\n');
    }
  } finally {
    if (connection) {
      await connection.end();
    }
  }
}

// Run the test
testConnection().catch(console.error);
