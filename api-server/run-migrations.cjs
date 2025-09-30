/**
 * Run Database Migrations
 * Uses existing migration system to set up schema and migrate data
 */

const dbConnection = require('./config/database');
const fs = require('fs');
const path = require('path');

// Import migrations
const migration001 = require('./migrations/001_initial_schema');
const migration002 = require('./migrations/002_migrate_json_pages');

const migrations = [migration001, migration002];

async function runMigrations() {
  console.log('🚀 Starting database migrations...\n');

  try {
    const db = dbConnection.connect();

    // Create migrations tracking table
    db.exec(`
      CREATE TABLE IF NOT EXISTS schema_migrations (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        version INTEGER NOT NULL UNIQUE,
        name TEXT NOT NULL,
        applied_at DATETIME DEFAULT CURRENT_TIMESTAMP
      );
    `);

    // Get applied migrations
    const appliedVersions = db
      .prepare('SELECT version FROM schema_migrations ORDER BY version')
      .all()
      .map(row => row.version);

    console.log(`Applied migrations: ${appliedVersions.join(', ') || 'none'}`);
    console.log(`Total migrations available: ${migrations.length}\n`);

    // Run pending migrations
    for (const migration of migrations) {
      const version = migration.version;
      const name = migration.description || `Migration ${version}`;

      if (appliedVersions.includes(version)) {
        console.log(`⏭️  Skipping migration ${version}: ${name} (already applied)`);
        continue;
      }

      console.log(`\n📦 Running migration ${version}: ${name}`);

      try {
        // Run migration
        await migration.up(db);

        // Record migration
        db.prepare(
          'INSERT INTO schema_migrations (version, name) VALUES (?, ?)'
        ).run(version, name);

        console.log(`✅ Migration ${version} completed successfully`);
      } catch (error) {
        console.error(`❌ Migration ${version} failed:`, error.message);
        console.error(error.stack);
        throw error;
      }
    }

    // Display final statistics
    console.log('\n\n📊 Database Statistics:');

    const agentCount = db.prepare('SELECT COUNT(*) as count FROM agents').get();
    console.log(`   Agents: ${agentCount.count}`);

    const pageCount = db.prepare('SELECT COUNT(*) as count FROM agent_pages').get();
    console.log(`   Pages: ${pageCount.count}`);

    const publishedCount = db
      .prepare("SELECT COUNT(*) as count FROM agent_pages WHERE status='published'")
      .get();
    console.log(`   Published pages: ${publishedCount.count}`);

    const draftCount = db
      .prepare("SELECT COUNT(*) as count FROM agent_pages WHERE status='draft'")
      .get();
    console.log(`   Draft pages: ${draftCount.count}`);

    console.log('\n✅ All migrations completed successfully!');
    console.log(`✅ Database ready: ${dbConnection.dbPath}`);
  } catch (error) {
    console.error('\n❌ Migration failed:', error);
    process.exit(1);
  } finally {
    dbConnection.close();
  }
}

// Run if executed directly
if (require.main === module) {
  runMigrations().catch(error => {
    console.error('Fatal error:', error);
    process.exit(1);
  });
}

module.exports = runMigrations;