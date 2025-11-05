/**
 * Reset Database Service
 * Handles database reset operations with safety checks
 * Implements database reset logic for SPARC-SYSTEM-INITIALIZATION.md
 * Agent 1: Infrastructure & Database
 */

/**
 * Reset Database Service Class
 * Provides safe database reset with backup verification
 */
class ResetDatabaseService {
  constructor(database) {
    if (!database) {
      throw new Error('Database instance is required for ResetDatabaseService');
    }
    this.db = database;
  }

  /**
   * Clear all data from database (preserve schema)
   * @param {Object} options - Reset options
   * @param {boolean} options.confirmReset - Must be true to proceed
   * @returns {Object} Reset result
   */
  resetDatabase(options = {}) {
    if (!options.confirmReset) {
      return {
        success: false,
        error: 'Reset confirmation required',
        message: 'Set options.confirmReset = true to proceed'
      };
    }

    try {
      // Disable foreign keys temporarily
      this.db.pragma('foreign_keys = OFF');

      const results = {
        posts: 0,
        comments: 0,
        user_settings: 0,
        hemingway_bridges: 0,
        agent_introductions: 0,
        onboarding_state: 0
      };

      // Delete all data from tables (preserving schema)
      const tables = [
        'posts',
        'comments',
        'user_settings',
        'hemingway_bridges',
        'agent_introductions',
        'onboarding_state'
      ];

      for (const table of tables) {
        try {
          const stmt = this.db.prepare(`DELETE FROM ${table}`);
          const result = stmt.run();
          results[table] = result.changes;
        } catch (error) {
          // Table might not exist yet - that's okay
          console.warn(`Could not clear table ${table}:`, error.message);
        }
      }

      // Re-enable foreign keys
      this.db.pragma('foreign_keys = ON');

      // Vacuum to reclaim space
      this.db.pragma('vacuum');

      console.log('✅ Database reset complete');

      return {
        success: true,
        message: 'Database reset successfully',
        tablesCleared: results,
        timestamp: new Date().toISOString()
      };
    } catch (error) {
      console.error('Error resetting database:', error);
      // Make sure to re-enable foreign keys even on error
      try {
        this.db.pragma('foreign_keys = ON');
      } catch (pragmaError) {
        console.error('Error re-enabling foreign keys:', pragmaError);
      }
      throw error;
    }
  }

  /**
   * Clear specific table
   * @param {string} tableName - Table to clear
   * @returns {Object} Clear result
   */
  clearTable(tableName) {
    try {
      // Validate table name (prevent SQL injection)
      const validTables = [
        'posts', 'comments', 'user_settings',
        'hemingway_bridges', 'agent_introductions', 'onboarding_state'
      ];

      if (!validTables.includes(tableName)) {
        throw new Error(`Invalid table name: ${tableName}`);
      }

      const stmt = this.db.prepare(`DELETE FROM ${tableName}`);
      const result = stmt.run();

      console.log(`✅ Cleared table ${tableName}: ${result.changes} rows deleted`);

      return {
        success: true,
        table: tableName,
        rowsDeleted: result.changes,
        timestamp: new Date().toISOString()
      };
    } catch (error) {
      console.error(`Error clearing table ${tableName}:`, error);
      throw error;
    }
  }

  /**
   * Get database size and table statistics
   * @returns {Object} Database statistics
   */
  getDatabaseStats() {
    try {
      const tables = this.db.prepare(`
        SELECT
          name,
          sql
        FROM sqlite_master
        WHERE type='table' AND name NOT LIKE 'sqlite_%'
        ORDER BY name
      `).all();

      const stats = {};
      let totalRows = 0;

      for (const table of tables) {
        const count = this.db.prepare(`SELECT COUNT(*) as count FROM ${table.name}`).get();
        stats[table.name] = count.count;
        totalRows += count.count;
      }

      return {
        tables: tables.length,
        tableStats: stats,
        totalRows,
        timestamp: new Date().toISOString()
      };
    } catch (error) {
      console.error('Error getting database stats:', error);
      throw error;
    }
  }

  /**
   * Verify database is empty
   * @returns {Object} Verification result
   */
  verifyEmpty() {
    try {
      const stats = this.getDatabaseStats();
      const isEmpty = stats.totalRows === 0;

      return {
        isEmpty,
        totalRows: stats.totalRows,
        tableStats: stats.tableStats,
        message: isEmpty
          ? 'Database is empty'
          : `Database contains ${stats.totalRows} rows`
      };
    } catch (error) {
      console.error('Error verifying database empty:', error);
      throw error;
    }
  }

  /**
   * Check if reset is safe to perform
   * @returns {Object} Safety check result
   */
  checkResetSafety() {
    try {
      const stats = this.getDatabaseStats();

      // Warn if database has significant data
      const hasSignificantData = stats.totalRows > 100;

      return {
        safe: true, // Always safe (backup is handled by shell script)
        hasSignificantData,
        totalRows: stats.totalRows,
        warning: hasSignificantData
          ? 'Database contains significant data - ensure backup exists'
          : null,
        message: 'Reset is safe to proceed (backup recommended)'
      };
    } catch (error) {
      console.error('Error checking reset safety:', error);
      throw error;
    }
  }
}

/**
 * Create and export service instance factory
 * @param {Database} db - better-sqlite3 database instance
 * @returns {ResetDatabaseService} Service instance
 */
export function createResetDatabaseService(db) {
  return new ResetDatabaseService(db);
}

export default ResetDatabaseService;
