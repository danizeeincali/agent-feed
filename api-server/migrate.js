/**
 * Migration Runner Script
 * Executes database migrations to set up schema and migrate JSON data
 */

import dbManager from './database.js';
import migration001 from './migrations/001_initial_schema.js';
import migration002 from './migrations/002_migrate_json_pages.js';

const migrations = [migration001, migration002];

async function runMigrations() {
  console.log('🚀 Starting database migrations...\n');

  try {
    // Connect to database
    const db = dbManager.connect();

    // Create migrations table if not exists
    db.exec(`
      CREATE TABLE IF NOT EXISTS schema_migrations (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        name TEXT NOT NULL UNIQUE,
        applied_at DATETIME DEFAULT CURRENT_TIMESTAMP
      );
    `);

    // Get applied migrations
    const appliedMigrations = db
      .prepare('SELECT name FROM schema_migrations')
      .all()
      .map(row => row.name);

    console.log(`Applied migrations: ${appliedMigrations.length}`);
    console.log(`Pending migrations: ${migrations.length - appliedMigrations.length}\n`);

    // Run pending migrations
    for (const migration of migrations) {
      if (appliedMigrations.includes(migration.name)) {
        console.log(`⏭️  Skipping ${migration.name} (already applied)`);
        continue;
      }

      console.log(`\n📦 Running migration: ${migration.name}`);
      console.log(`   Description: ${migration.description}`);

      try {
        // Run migration
        migration.up(db);

        // Validate migration
        if (migration.validate && !migration.validate(db)) {
          throw new Error('Migration validation failed');
        }

        // Record migration
        db.prepare('INSERT INTO schema_migrations (name) VALUES (?)').run(
          migration.name
        );

        console.log(`✅ Migration ${migration.name} completed successfully`);
      } catch (error) {
        console.error(`❌ Migration ${migration.name} failed:`, error.message);
        throw error;
      }
    }

    console.log('\n\n✅ All migrations completed successfully!');

    // Display statistics
    console.log('\n📊 Database Statistics:');
    const pageCount = db.prepare('SELECT COUNT(*) as count FROM agent_pages').get();
    const agentCount = db.prepare('SELECT COUNT(*) as count FROM agents').get();

    console.log(`   Agents: ${agentCount.count}`);
    console.log(`   Pages: ${pageCount.count}`);

    console.log('\n✅ Database ready for use');
  } catch (error) {
    console.error('\n❌ Migration failed:', error);
    process.exit(1);
  } finally {
    dbManager.close();
  }
}

// Run migrations if executed directly
if (import.meta.url === `file://${process.argv[1]}`) {
  runMigrations();
}

export default runMigrations;