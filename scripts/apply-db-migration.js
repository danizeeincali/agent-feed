import fs from 'fs';
import pg from 'pg';
import dotenv from 'dotenv';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

dotenv.config({ path: join(__dirname, '../.env') });

async function applyMigration() {
  const { Pool } = pg;

  const pool = new Pool({
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
    const migrationPath = join(__dirname, '../src/database/migrations/004_add_performance_indexes.sql');
    const migration = fs.readFileSync(migrationPath, 'utf8');

    console.log('Applying migration 004_add_performance_indexes.sql...');
    console.log(`Migration size: ${(migration.length / 1024).toFixed(2)} KB`);

    // Remove BEGIN/COMMIT and split into individual statements
    const cleanedMigration = migration
      .replace(/^BEGIN;/gm, '')
      .replace(/^COMMIT;/gm, '')
      .replace(/^ROLLBACK;/gm, '');

    // Split by semicolon and filter out comments/empty lines
    const statements = cleanedMigration
      .split(';')
      .map(s => s.trim())
      .filter(s => s.length > 0 && !s.startsWith('--'));

    console.log(`Executing ${statements.length} statements individually...\n`);

    for (let i = 0; i < statements.length; i++) {
      const stmt = statements[i];
      if (!stmt) continue;

      // Extract index name for better logging
      const indexMatch = stmt.match(/idx_[\w_]+/);
      const indexName = indexMatch ? indexMatch[0] : `statement ${i + 1}`;

      try {
        console.log(`  [${i + 1}/${statements.length}] Creating ${indexName}...`);
        await client.query(stmt);
        console.log(`  ✅ ${indexName} created`);
      } catch (error) {
        // If index already exists, that's okay
        if (error.code === '42P07') {
          console.log(`  ⚠️  ${indexName} already exists (skipping)`);
        } else {
          throw error;
        }
      }
    }

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
    console.log(`\nTotal indexes in database: ${indexCount.rows[0].count}`);

    // Run ANALYZE
    console.log('\nRunning ANALYZE on affected tables...');
    await client.query('ANALYZE agent_workspaces, agent_memories, user_agent_customizations');
    console.log('✅ ANALYZE complete');

  } catch (error) {
    console.error('❌ Migration failed:', error.message);
    console.error('Error details:', error);
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
    console.error('\n❌ Error:', error.message);
    process.exit(1);
  });
