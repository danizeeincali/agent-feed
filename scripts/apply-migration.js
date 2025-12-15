const fs = require('fs');
const pg = require('pg');
require('dotenv').config();

async function applyMigration() {
  const pool = new pg.Pool({
    host: process.env.DB_HOST,
    port: parseInt(process.env.DB_PORT),
    database: process.env.POSTGRES_DB,
    user: process.env.POSTGRES_USER,
    password: process.env.POSTGRES_PASSWORD || 'dev_password_change_in_production'
  });

  console.log('Connecting to PostgreSQL...');
  const client = await pool.connect();
  
  try {
    console.log('Reading migration file...');
    const migration = fs.readFileSync('/workspaces/agent-feed/src/database/migrations/004_add_performance_indexes.sql', 'utf8');
    
    console.log('Applying migration 004_add_performance_indexes.sql...');
    await client.query(migration);
    
    console.log('✅ Migration applied successfully!');
    
    // Validate indexes
    console.log('\nValidating indexes...');
    const validation = await client.query('SELECT * FROM validate_performance_indexes()');
    console.log('Validation results:', validation.rows);
    
    // Get index count
    const indexCount = await client.query(`
      SELECT COUNT(*) as count 
      FROM pg_indexes 
      WHERE schemaname = 'public' 
      AND indexname LIKE 'idx_%'
    `);
    console.log(`\nTotal indexes created: ${indexCount.rows[0].count}`);
    
  } catch (error) {
    console.error('❌ Migration failed:', error.message);
    throw error;
  } finally {
    client.release();
    await pool.end();
  }
}

applyMigration()
  .then(() => {
    console.log('\n✅ Database optimization complete!');
    process.exit(0);
  })
  .catch(error => {
    console.error('\n❌ Error:', error);
    process.exit(1);
  });
