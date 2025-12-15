/**
 * Initialize Database Service
 * Handles database initialization operations
 * Implements database init logic for SPARC-SYSTEM-INITIALIZATION.md
 * Agent 1: Infrastructure & Database
 */

import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

/**
 * Initialize Database Service Class
 * Provides database initialization with migrations and seed data
 */
class InitDatabaseService {
  constructor(database, options = {}) {
    if (!database) {
      throw new Error('Database instance is required for InitDatabaseService');
    }
    this.db = database;
    this.migrationsDir = options.migrationsDir ||
      path.join(__dirname, '../../db/migrations');
  }

  /**
   * Run all migrations in order
   * @returns {Object} Migration result
   */
  runMigrations() {
    try {
      const migrations = [
        '010-user-settings.sql',
        '011-add-onboarding-fields.sql',
        '012-onboarding-tables.sql'
      ];

      const results = [];

      for (const migration of migrations) {
        const migrationPath = path.join(this.migrationsDir, migration);

        if (!fs.existsSync(migrationPath)) {
          console.warn(`Migration file not found: ${migration}`);
          results.push({
            migration,
            status: 'skipped',
            reason: 'File not found'
          });
          continue;
        }

        try {
          const sql = fs.readFileSync(migrationPath, 'utf8');
          this.db.exec(sql);

          console.log(`✅ Migration applied: ${migration}`);
          results.push({
            migration,
            status: 'applied',
            timestamp: new Date().toISOString()
          });
        } catch (error) {
          console.error(`Error applying migration ${migration}:`, error.message);
          results.push({
            migration,
            status: 'failed',
            error: error.message
          });
        }
      }

      const successful = results.filter(r => r.status === 'applied').length;
      const failed = results.filter(r => r.status === 'failed').length;

      return {
        success: failed === 0,
        totalMigrations: migrations.length,
        applied: successful,
        failed,
        results,
        timestamp: new Date().toISOString()
      };
    } catch (error) {
      console.error('Error running migrations:', error);
      throw error;
    }
  }

  /**
   * Create default user and initial data
   * @param {string} userId - User ID to create
   * @param {string} displayName - Initial display name
   * @returns {Object} Creation result
   */
  createDefaultUser(userId = 'demo-user-123', displayName = 'User') {
    try {
      const results = {};

      // 1. Insert user settings
      const userStmt = this.db.prepare(`
        INSERT OR IGNORE INTO user_settings (user_id, display_name)
        VALUES (?, ?)
      `);
      results.userSettings = userStmt.run(userId, displayName).changes > 0;

      // 2. Insert onboarding state
      const onboardingStmt = this.db.prepare(`
        INSERT OR IGNORE INTO onboarding_state (user_id, phase, step)
        VALUES (?, 1, 'name')
      `);
      results.onboardingState = onboardingStmt.run(userId).changes > 0;

      // 3. Insert initial Hemingway bridge
      const bridgeStmt = this.db.prepare(`
        INSERT OR IGNORE INTO hemingway_bridges (
          id, user_id, bridge_type, content, priority, active
        ) VALUES (?, ?, 'question', ?, 4, 1)
      `);
      const bridgeId = `initial-bridge-${userId}`;
      const bridgeContent = 'Welcome! What brings you to Agent Feed today?';
      results.initialBridge = bridgeStmt.run(bridgeId, userId, bridgeContent).changes > 0;

      console.log(`✅ Created default user: ${userId}`);

      return {
        success: true,
        userId,
        displayName,
        created: results,
        timestamp: new Date().toISOString()
      };
    } catch (error) {
      console.error('Error creating default user:', error);
      throw error;
    }
  }

  /**
   * Initialize complete database (migrations + default user)
   * @param {Object} options - Initialization options
   * @returns {Object} Initialization result
   */
  initializeDatabase(options = {}) {
    try {
      const userId = options.userId || 'demo-user-123';
      const displayName = options.displayName || 'User';

      // Step 1: Run migrations
      console.log('Step 1: Running migrations...');
      const migrationResult = this.runMigrations();

      if (!migrationResult.success) {
        return {
          success: false,
          error: 'Migration failed',
          migrationResult,
          timestamp: new Date().toISOString()
        };
      }

      // Step 2: Create default user
      console.log('Step 2: Creating default user...');
      const userResult = this.createDefaultUser(userId, displayName);

      // Step 3: Verify initialization
      console.log('Step 3: Verifying initialization...');
      const verification = this.verifyInitialization(userId);

      console.log('✅ Database initialization complete');

      return {
        success: true,
        migrationResult,
        userResult,
        verification,
        timestamp: new Date().toISOString()
      };
    } catch (error) {
      console.error('Error initializing database:', error);
      throw error;
    }
  }

  /**
   * Verify database initialization
   * @param {string} userId - User ID to verify
   * @returns {Object} Verification result
   */
  verifyInitialization(userId = 'demo-user-123') {
    try {
      const checks = {};

      // Check user_settings table
      const userSettings = this.db.prepare(`
        SELECT user_id FROM user_settings WHERE user_id = ?
      `).get(userId);
      checks.userSettingsExists = !!userSettings;

      // Check onboarding_state table
      const onboardingState = this.db.prepare(`
        SELECT user_id FROM onboarding_state WHERE user_id = ?
      `).get(userId);
      checks.onboardingStateExists = !!onboardingState;

      // Check hemingway_bridges table
      const bridge = this.db.prepare(`
        SELECT id FROM hemingway_bridges WHERE user_id = ? AND active = 1
      `).get(userId);
      checks.initialBridgeExists = !!bridge;

      // Check agent_introductions table exists (may be empty)
      const agentIntrosTable = this.db.prepare(`
        SELECT name FROM sqlite_master
        WHERE type='table' AND name='agent_introductions'
      `).get();
      checks.agentIntroductionsTableExists = !!agentIntrosTable;

      const allChecksPass = Object.values(checks).every(check => check === true);

      return {
        valid: allChecksPass,
        checks,
        message: allChecksPass
          ? 'Database initialization verified successfully'
          : 'Some initialization checks failed',
        timestamp: new Date().toISOString()
      };
    } catch (error) {
      console.error('Error verifying initialization:', error);
      return {
        valid: false,
        error: error.message,
        timestamp: new Date().toISOString()
      };
    }
  }

  /**
   * Check if database is initialized
   * @returns {Object} Initialization status
   */
  isInitialized() {
    try {
      // Check if required tables exist
      const requiredTables = ['user_settings', 'onboarding_state', 'hemingway_bridges', 'agent_introductions'];
      const existingTables = this.db.prepare(`
        SELECT name FROM sqlite_master
        WHERE type='table' AND name IN (${requiredTables.map(() => '?').join(',')})
      `).all(...requiredTables);

      const missingTables = requiredTables.filter(
        table => !existingTables.find(t => t.name === table)
      );

      const initialized = missingTables.length === 0;

      return {
        initialized,
        requiredTables: requiredTables.length,
        existingTables: existingTables.length,
        missingTables,
        message: initialized
          ? 'Database is initialized'
          : `Missing tables: ${missingTables.join(', ')}`
      };
    } catch (error) {
      console.error('Error checking initialization status:', error);
      return {
        initialized: false,
        error: error.message
      };
    }
  }

  /**
   * Get database schema info
   * @returns {Object} Schema information
   */
  getSchemaInfo() {
    try {
      const tables = this.db.prepare(`
        SELECT
          name,
          sql
        FROM sqlite_master
        WHERE type='table' AND name NOT LIKE 'sqlite_%'
        ORDER BY name
      `).all();

      const indexes = this.db.prepare(`
        SELECT
          name,
          tbl_name,
          sql
        FROM sqlite_master
        WHERE type='index' AND name NOT LIKE 'sqlite_%'
        ORDER BY tbl_name, name
      `).all();

      return {
        tables: tables.map(t => ({
          name: t.name,
          schema: t.sql
        })),
        indexes: indexes.map(i => ({
          name: i.name,
          table: i.tbl_name,
          schema: i.sql
        })),
        totalTables: tables.length,
        totalIndexes: indexes.length,
        timestamp: new Date().toISOString()
      };
    } catch (error) {
      console.error('Error getting schema info:', error);
      throw error;
    }
  }
}

/**
 * Create and export service instance factory
 * @param {Database} db - better-sqlite3 database instance
 * @param {Object} options - Service options
 * @returns {InitDatabaseService} Service instance
 */
export function createInitDatabaseService(db, options = {}) {
  return new InitDatabaseService(db, options);
}

export default InitDatabaseService;
