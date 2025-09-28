/**
 * Jest Setup for TDD London School Activities Tests
 * Sets up real database for testing with cleanup
 */

const Database = require('better-sqlite3');
const path = require('path');
const fs = require('fs');

// Test database path
const TEST_DB_PATH = path.join(__dirname, 'test-activities.db');

// Global test database instance
global.testDb = null;

/**
 * Clean up test database before each test
 */
beforeEach(async () => {
  // Remove existing test database
  if (fs.existsSync(TEST_DB_PATH)) {
    fs.unlinkSync(TEST_DB_PATH);
  }

  // Create fresh test database
  global.testDb = new Database(TEST_DB_PATH);

  // Create activities table
  global.testDb.exec(`
    CREATE TABLE IF NOT EXISTS activities (
      id TEXT PRIMARY KEY,
      type TEXT NOT NULL,
      title TEXT NOT NULL,
      description TEXT,
      metadata TEXT DEFAULT '{}',
      actor TEXT NOT NULL,
      target_type TEXT,
      target_id TEXT,
      timestamp DATETIME DEFAULT CURRENT_TIMESTAMP,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP
    );

    CREATE INDEX IF NOT EXISTS idx_activities_timestamp ON activities(timestamp DESC);
    CREATE INDEX IF NOT EXISTS idx_activities_actor ON activities(actor);
    CREATE INDEX IF NOT EXISTS idx_activities_type ON activities(type);
  `);
});

/**
 * Clean up after each test
 */
afterEach(async () => {
  if (global.testDb) {
    global.testDb.close();
    global.testDb = null;
  }

  // Remove test database file
  if (fs.existsSync(TEST_DB_PATH)) {
    fs.unlinkSync(TEST_DB_PATH);
  }
});

/**
 * Helper to get test database path for injection into modules
 */
global.getTestDbPath = () => TEST_DB_PATH;