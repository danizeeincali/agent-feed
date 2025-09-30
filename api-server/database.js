/**
 * Database Connection Manager
 * Uses better-sqlite3 for synchronous SQLite operations
 * Follows security best practices: parameterized queries, no string concatenation
 */

import Database from 'better-sqlite3';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';
import fs from 'fs';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

// Database configuration
const DB_PATH = join(__dirname, '../data/agent-pages.db');
const SCHEMA_PATH = join(__dirname, '../src/database/schema/agent-pages.sql');

class DatabaseManager {
  constructor() {
    this.db = null;
  }

  /**
   * Initialize database connection
   * @returns {Database} SQLite database instance
   */
  connect() {
    if (this.db) {
      return this.db;
    }

    // Ensure data directory exists
    const dataDir = dirname(DB_PATH);
    if (!fs.existsSync(dataDir)) {
      fs.mkdirSync(dataDir, { recursive: true });
    }

    // Create database connection
    this.db = new Database(DB_PATH, {
      verbose: process.env.NODE_ENV === 'development' ? console.log : null
    });

    // Enable foreign keys
    this.db.pragma('foreign_keys = ON');

    // Set journal mode to WAL for better concurrency
    this.db.pragma('journal_mode = WAL');

    console.log(`✅ Database connected: ${DB_PATH}`);
    return this.db;
  }

  /**
   * Get database instance (singleton pattern)
   * @returns {Database}
   */
  getDatabase() {
    if (!this.db) {
      return this.connect();
    }
    return this.db;
  }

  /**
   * Run schema initialization
   * Creates all tables, indexes, and triggers
   */
  initializeSchema() {
    const db = this.getDatabase();

    // Read schema file
    if (!fs.existsSync(SCHEMA_PATH)) {
      throw new Error(`Schema file not found: ${SCHEMA_PATH}`);
    }

    const schema = fs.readFileSync(SCHEMA_PATH, 'utf-8');

    // Execute schema (split by semicolons, filter empty statements)
    const statements = schema
      .split(';')
      .map(s => s.trim())
      .filter(s => s.length > 0);

    db.transaction(() => {
      for (const statement of statements) {
        db.exec(statement + ';');
      }
    })();

    console.log('✅ Schema initialized successfully');
  }

  /**
   * Check if agents table exists, create if needed
   * Required for foreign key constraints
   */
  ensureAgentsTable() {
    const db = this.getDatabase();

    const agentsTableExists = db
      .prepare(
        "SELECT name FROM sqlite_master WHERE type='table' AND name='agents'"
      )
      .get();

    if (!agentsTableExists) {
      console.log('Creating agents table...');
      db.exec(`
        CREATE TABLE IF NOT EXISTS agents (
          id TEXT PRIMARY KEY,
          name TEXT NOT NULL,
          description TEXT,
          created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
          updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
        );
      `);

      // Insert default agent for existing pages
      db.prepare(`
        INSERT OR IGNORE INTO agents (id, name, description)
        VALUES (?, ?, ?)
      `).run('personal-todos-agent', 'Personal Todos Agent', 'Agent for managing personal todo lists');

      console.log('✅ Agents table created');
    }
  }

  /**
   * Close database connection
   */
  close() {
    if (this.db) {
      this.db.close();
      this.db = null;
      console.log('✅ Database connection closed');
    }
  }

  /**
   * Execute a transaction
   * @param {Function} fn - Function containing database operations
   * @returns {any} Result of transaction
   */
  transaction(fn) {
    const db = this.getDatabase();
    return db.transaction(fn)();
  }
}

// Singleton instance
const dbManager = new DatabaseManager();

export default dbManager;
export { DatabaseManager };