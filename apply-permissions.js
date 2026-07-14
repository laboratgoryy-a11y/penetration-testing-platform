const { Pool } = require('pg');
const fs = require('fs');
const path = require('path');

// Database configuration
const pool = new Pool({
  host: 'localhost',
  port: 5432,
  database: 'penetration_testing_platform',
  user: 'postgres',
  password: 'your_password'
});

async function applyPermissions() {
  const client = await pool.connect();
  
  try {
    console.log('🔄 Connecting to database...');
    
    // Read SQL file
    const sqlFile = path.join(__dirname, 'fix-permissions.sql');
    const sql = fs.readFileSync(sqlFile, 'utf8');
    
    console.log('📝 Executing SQL...');
    console.log(sql);
    
    // Execute SQL
    await client.query(sql);
    
    console.log('✅ Permissions applied successfully!');
    
    // Verify permissions
    console.log('\n🔍 Verifying permissions for PENTESTER role...');
    const result = await client.query(`
      SELECT r.name as role, p.resource, p.action
      FROM role_permissions rp
      JOIN roles r ON rp.role_id = r.id
      JOIN permissions p ON rp.permission_id = p.id
      WHERE r.name = 'PENTESTER'
      ORDER BY p.resource, p.action;
    `);
    
    console.log('\nPENTESTER Permissions:');
    console.table(result.rows);
    
  } catch (error) {
    console.error('❌ Error applying permissions:', error.message);
    throw error;
  } finally {
    client.release();
    await pool.end();
  }
}

// Run the script
applyPermissions()
  .then(() => {
    console.log('\n✅ Done! You can now restart the server.');
    process.exit(0);
  })
  .catch((error) => {
    console.error('\n❌ Failed:', error);
    process.exit(1);
  });
