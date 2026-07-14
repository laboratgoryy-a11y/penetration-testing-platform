const { Pool } = require('pg');
require('dotenv').config();

const pool = new Pool({
  host: process.env.DB_HOST || 'localhost',
  port: parseInt(process.env.DB_PORT || '5432'),
  database: process.env.DB_NAME || 'penetration_testing_platform',
  user: process.env.DB_USER || 'postgres',
  password: process.env.DB_PASSWORD,
});

async function testConnection() {
  try {
    console.log('Testing PostgreSQL connection...');
    const result = await pool.query('SELECT NOW(), version()');
    console.log('✓ PostgreSQL connected successfully!');
    console.log('  Time:', result.rows[0].now);
    console.log('  Version:', result.rows[0].version.split('\n')[0]);
    
    // Check if database exists
    const dbCheck = await pool.query(
      "SELECT datname FROM pg_database WHERE datname = $1",
      [process.env.DB_NAME || 'penetration_testing_platform']
    );
    
    if (dbCheck.rows.length > 0) {
      console.log('✓ Database exists');
      
      // Check if tables exist
      const tableCheck = await pool.query(
        "SELECT COUNT(*) as count FROM information_schema.tables WHERE table_schema = 'public'"
      );
      console.log(`✓ Found ${tableCheck.rows[0].count} tables in database`);
    } else {
      console.log('✗ Database does not exist - needs to be created');
    }
    
    await pool.end();
    process.exit(0);
  } catch (error) {
    console.error('✗ Connection failed:', error.message);
    process.exit(1);
  }
}

testConnection();
