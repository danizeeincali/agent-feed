const dbConnection = require('../config/database.cjs');
const migration001 = require('./001_initial_schema.cjs');
const migration002 = require('./002_migrate_json_pages.cjs');
const migration003 = require('./003_add_agent_slugs.cjs');

class MigrationManager {
  constructor() {
    this.db = dbConnection.getDb();
    this.migrations = [
      migration001,
      migration002,
      migration003
    ];

    this.initializeVersionTable();
  }

  /**
   * Initialize migration version table
   */
  initializeVersionTable() {
    this.db.exec(`
      CREATE TABLE IF NOT EXISTS schema_versions (
        version INTEGER PRIMARY KEY,
        description TEXT NOT NULL,
        applied_at DATETIME DEFAULT CURRENT_TIMESTAMP
      )
    `);
  }

  /**
   * Get current schema version
   */
  getCurrentVersion() {
    const stmt = this.db.prepare('SELECT MAX(version) as version FROM schema_versions');
    const result = stmt.get();
    return result.version || 0;
  }

  /**
   * Apply single migration
   */
  applyMigration(migration) {
    const transaction = this.db.transaction(() => {
      // Run migration
      migration.up(this.db);

      // Record version
      const stmt = this.db.prepare(`
        INSERT INTO schema_versions (version, description)
        VALUES (?, ?)
      `);
      stmt.run(migration.version, migration.description);

      console.log(`✓ Applied migration ${migration.version}: ${migration.description}`);
    });

    transaction();
  }

  /**
   * Run all pending migrations
   */
  runMigrations() {
    const currentVersion = this.getCurrentVersion();
    console.log(`Current schema version: ${currentVersion}`);

    const pendingMigrations = this.migrations.filter(
      m => m.version > currentVersion
    );

    if (pendingMigrations.length === 0) {
      console.log('No pending migrations');
      return;
    }

    console.log(`Running ${pendingMigrations.length} pending migrations...`);

    for (const migration of pendingMigrations) {
      try {
        this.applyMigration(migration);
      } catch (error) {
        console.error(`✗ Migration ${migration.version} failed:`, error.message);
        throw error;
      }
    }

    console.log('All migrations completed successfully');
  }

  /**
   * Get migration history
   */
  getHistory() {
    const stmt = this.db.prepare(`
      SELECT version, description, applied_at
      FROM schema_versions
      ORDER BY version ASC
    `);
    return stmt.all();
  }
}

module.exports = new MigrationManager();