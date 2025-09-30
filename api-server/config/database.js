const Database = require('better-sqlite3');
const path = require('path');

class DatabaseConnection {
  constructor(dbPath) {
    this.dbPath = dbPath || path.join(__dirname, '../../data/agent-pages.db');
    this.db = null;
  }

  connect() {
    if (this.db) {
      return this.db;
    }

    this.db = new Database(this.dbPath, {
      verbose: process.env.NODE_ENV === 'development' ? console.log : null
    });

    // Configure for optimal performance
    this.db.pragma('journal_mode = WAL');
    this.db.pragma('foreign_keys = ON');
    this.db.pragma('synchronous = NORMAL');
    this.db.pragma('cache_size = -64000'); // 64MB cache

    console.log(`Database connected: ${this.dbPath}`);
    return this.db;
  }

  getDb() {
    if (!this.db) {
      return this.connect();
    }
    return this.db;
  }

  close() {
    if (this.db) {
      this.db.close();
      this.db = null;
      console.log('Database connection closed');
    }
  }

  backup(backupPath) {
    if (!this.db) {
      throw new Error('Database not connected');
    }

    const backupDb = new Database(backupPath);
    this.db.backup(backupDb);
    backupDb.close();
    console.log(`Database backed up to: ${backupPath}`);
  }
}

module.exports = new DatabaseConnection();