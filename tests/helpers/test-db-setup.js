/**
 * Test Database Setup Helpers
 *
 * Provides utilities for setting up and tearing down test databases.
 * NO MOCKS - Uses real SQLite databases for testing.
 */

const Database = require('better-sqlite3');
const fs = require('fs').promises;
const path = require('path');

class TestDatabaseHelper {
  constructor(testName) {
    this.testName = testName;
    this.dbPath = path.join(__dirname, `../test-data/${testName}-test.db`);
    this.db = null;
  }

  /**
   * Initialize a fresh test database with schema
   */
  async initialize() {
    // Ensure test data directory exists
    await fs.mkdir(path.dirname(this.dbPath), { recursive: true });

    // Remove existing test database
    try {
      await fs.unlink(this.dbPath);
    } catch (error) {
      // Ignore if file doesn't exist
    }

    // Create new database
    this.db = new Database(this.dbPath);

    // Initialize schema
    this.db.exec(`
      CREATE TABLE IF NOT EXISTS tickets (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        title TEXT NOT NULL,
        description TEXT,
        status TEXT DEFAULT 'open',
        agentId TEXT,
        priority TEXT DEFAULT 'medium',
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
      );

      CREATE TABLE IF NOT EXISTS posts (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        ticketId INTEGER,
        agentId TEXT NOT NULL,
        content TEXT NOT NULL,
        metadata TEXT,
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        FOREIGN KEY (ticketId) REFERENCES tickets(id) ON DELETE CASCADE
      );

      CREATE TABLE IF NOT EXISTS agents (
        agentId TEXT PRIMARY KEY,
        displayName TEXT NOT NULL,
        description TEXT,
        isSystemIdentity BOOLEAN DEFAULT 0,
        capabilities TEXT,
        status TEXT DEFAULT 'active',
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
      );

      CREATE INDEX IF NOT EXISTS idx_tickets_agentId ON tickets(agentId);
      CREATE INDEX IF NOT EXISTS idx_tickets_status ON tickets(status);
      CREATE INDEX IF NOT EXISTS idx_posts_ticketId ON posts(ticketId);
      CREATE INDEX IF NOT EXISTS idx_posts_agentId ON posts(agentId);
      CREATE INDEX IF NOT EXISTS idx_agents_isSystemIdentity ON agents(isSystemIdentity);
    `);

    return this.db;
  }

  /**
   * Seed the database with test data
   */
  seedTestData() {
    if (!this.db) {
      throw new Error('Database not initialized. Call initialize() first.');
    }

    // Insert system agent (avi)
    this.db.prepare(`
      INSERT INTO agents (agentId, displayName, description, isSystemIdentity, capabilities)
      VALUES (?, ?, ?, ?, ?)
    `).run(
      'avi',
      'Λvi (Amplifying Virtual Intelligence)',
      'AI system coordinator and amplification agent',
      1,
      JSON.stringify(['coordination', 'amplification', 'system-level-operations'])
    );

    // Insert regular test agents
    this.db.prepare(`
      INSERT INTO agents (agentId, displayName, description, isSystemIdentity)
      VALUES (?, ?, ?, ?)
    `).run('test-agent-1', 'Test Agent 1', 'First test agent', 0);

    this.db.prepare(`
      INSERT INTO agents (agentId, displayName, description, isSystemIdentity)
      VALUES (?, ?, ?, ?)
    `).run('test-agent-2', 'Test Agent 2', 'Second test agent', 0);

    // Insert test tickets
    const ticketStmt = this.db.prepare(`
      INSERT INTO tickets (title, description, agentId, status)
      VALUES (?, ?, ?, ?)
    `);

    ticketStmt.run('Avi test ticket 1', 'Test ticket for avi agent', 'avi', 'open');
    ticketStmt.run('Avi test ticket 2', 'Another test ticket', 'avi', 'in_progress');
    ticketStmt.run('Regular agent ticket', 'Ticket for regular agent', 'test-agent-1', 'open');

    // Insert test posts
    const postStmt = this.db.prepare(`
      INSERT INTO posts (ticketId, agentId, content)
      VALUES (?, ?, ?)
    `);

    postStmt.run(1, 'avi', 'Λvi: Initial analysis complete');
    postStmt.run(2, 'avi', 'Λvi: Processing ticket with system-level coordination');
    postStmt.run(3, 'test-agent-1', 'Regular agent response');

    return this.db;
  }

  /**
   * Clear all data from tables
   */
  clearAllData() {
    if (!this.db) return;

    this.db.prepare('DELETE FROM posts').run();
    this.db.prepare('DELETE FROM tickets').run();
    this.db.prepare('DELETE FROM agents').run();
  }

  /**
   * Get database instance
   */
  getDatabase() {
    return this.db;
  }

  /**
   * Close and cleanup database
   */
  async cleanup() {
    if (this.db) {
      this.db.close();
      this.db = null;
    }

    try {
      await fs.unlink(this.dbPath);
    } catch (error) {
      // Ignore if file doesn't exist
    }
  }

  /**
   * Get statistics about test data
   */
  getStatistics() {
    if (!this.db) return null;

    return {
      tickets: this.db.prepare('SELECT COUNT(*) as count FROM tickets').get().count,
      posts: this.db.prepare('SELECT COUNT(*) as count FROM posts').get().count,
      agents: this.db.prepare('SELECT COUNT(*) as count FROM agents').get().count,
      aviTickets: this.db.prepare('SELECT COUNT(*) as count FROM tickets WHERE agentId = ?').get('avi').count,
      aviPosts: this.db.prepare('SELECT COUNT(*) as count FROM posts WHERE agentId = ?').get('avi').count
    };
  }
}

/**
 * Create a test database helper
 */
function createTestDatabase(testName) {
  return new TestDatabaseHelper(testName);
}

/**
 * Test data generators
 */
const TestDataGenerators = {
  /**
   * Generate test ticket data
   */
  generateTicket(overrides = {}) {
    return {
      title: 'Test Ticket',
      description: 'Test ticket description',
      agentId: 'avi',
      status: 'open',
      priority: 'medium',
      ...overrides
    };
  },

  /**
   * Generate test post data
   */
  generatePost(overrides = {}) {
    return {
      ticketId: 1,
      agentId: 'avi',
      content: 'Test post content',
      ...overrides
    };
  },

  /**
   * Generate test agent data
   */
  generateAgent(overrides = {}) {
    return {
      agentId: 'test-agent',
      displayName: 'Test Agent',
      description: 'Test agent description',
      isSystemIdentity: 0,
      status: 'active',
      ...overrides
    };
  },

  /**
   * Generate avi system agent data
   */
  generateAviAgent() {
    return {
      agentId: 'avi',
      displayName: 'Λvi (Amplifying Virtual Intelligence)',
      description: 'AI system coordinator and amplification agent',
      isSystemIdentity: 1,
      capabilities: ['coordination', 'amplification', 'system-level-operations'],
      status: 'active'
    };
  }
};

module.exports = {
  TestDatabaseHelper,
  createTestDatabase,
  TestDataGenerators
};
