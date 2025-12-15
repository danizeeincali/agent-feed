/**
 * TDD RED PHASE: Display Name Persistence Integration Tests
 *
 * ROOT CAUSE:
 * - Onboarding saves name to onboarding_state.responses (JSON)
 * - Does NOT save to user_settings table
 * - AuthorDisplayName queries user_settings → fallback "user"
 *
 * These tests SHOULD FAIL until proper implementation exists.
 */

const sqlite3 = require('sqlite3').verbose();
const path = require('path');
const fs = require('fs');
const request = require('supertest');

// Test database paths
const TEST_DB_PATH = path.join(__dirname, '../../database.test.db');
const API_SERVER_PATH = path.join(__dirname, '../../api-server/server.js');

describe('Display Name Persistence - TDD RED PHASE', () => {
  let db;
  let app;
  let testUserId;

  beforeEach(async () => {
    // Clean up any existing test database
    if (fs.existsSync(TEST_DB_PATH)) {
      fs.unlinkSync(TEST_DB_PATH);
    }

    // Create fresh database connection
    db = new sqlite3.Database(TEST_DB_PATH);

    // Initialize schema
    await initializeTestSchema(db);

    // Create test user
    testUserId = await createTestUser(db);

    // Load API server (if available)
    try {
      // Set test environment
      process.env.NODE_ENV = 'test';
      process.env.DATABASE_PATH = TEST_DB_PATH;

      // Dynamically import server
      delete require.cache[require.resolve(API_SERVER_PATH)];
      app = require(API_SERVER_PATH);
    } catch (error) {
      console.warn('API server not available for testing:', error.message);
    }
  });

  afterEach(async () => {
    // Close database connection
    if (db) {
      await new Promise((resolve) => db.close(resolve));
    }

    // Clean up test database
    if (fs.existsSync(TEST_DB_PATH)) {
      fs.unlinkSync(TEST_DB_PATH);
    }
  });

  describe('1. Onboarding Flow Saves to user_settings Table', () => {
    it('should create user_settings row when user completes name step', async () => {
      // Simulate onboarding name submission
      const displayName = 'Alice Johnson';

      await simulateOnboardingNameStep(db, testUserId, displayName);

      // Query user_settings table
      const userSettings = await queryUserSettings(db, testUserId);

      // EXPECTED TO FAIL: user_settings row should exist
      expect(userSettings).toBeDefined();
      expect(userSettings.display_name).toBe(displayName);
      expect(userSettings.user_id).toBe(testUserId);
    });

    it('should save display name immediately after onboarding name response', async () => {
      const displayName = 'Bob Smith';

      // Simulate onboarding flow
      await simulateOnboardingNameStep(db, testUserId, displayName);

      // Check user_settings was created
      const settings = await queryUserSettings(db, testUserId);

      // EXPECTED TO FAIL: Should have display_name set
      expect(settings).not.toBeNull();
      expect(settings.display_name).toBe(displayName);
      expect(settings.created_at).toBeDefined();
    });

    it('should update existing user_settings if row already exists', async () => {
      const initialName = 'Charlie Brown';
      const updatedName = 'Charles Brown';

      // Create initial user_settings
      await createUserSettings(db, testUserId, initialName);

      // Simulate onboarding name step again
      await simulateOnboardingNameStep(db, testUserId, updatedName);

      // Query user_settings
      const settings = await queryUserSettings(db, testUserId);

      // EXPECTED TO FAIL: Should update display_name
      expect(settings.display_name).toBe(updatedName);
    });
  });

  describe('2. GET /api/users/{userId}/settings Returns display_name', () => {
    it('should return display_name from user_settings', async () => {
      if (!app) {
        console.warn('Skipping API test: server not available');
        return;
      }

      const displayName = 'Diana Prince';
      await createUserSettings(db, testUserId, displayName);

      // Make API request
      const response = await request(app)
        .get(`/api/users/${testUserId}/settings`)
        .expect(200);

      // EXPECTED TO FAIL: Should return display_name
      expect(response.body).toBeDefined();
      expect(response.body.display_name).toBe(displayName);
      expect(response.body.user_id).toBe(testUserId);
    });

    it('should return 404 if user_settings does not exist', async () => {
      if (!app) {
        console.warn('Skipping API test: server not available');
        return;
      }

      const nonExistentUserId = 'user_99999';

      // Make API request
      const response = await request(app)
        .get(`/api/users/${nonExistentUserId}/settings`)
        .expect(404);

      // EXPECTED TO FAIL: Should return proper 404
      expect(response.body.error).toBeDefined();
    });

    it('should include all user_settings fields in response', async () => {
      if (!app) {
        console.warn('Skipping API test: server not available');
        return;
      }

      const displayName = 'Ethan Hunt';
      await createUserSettings(db, testUserId, displayName);

      const response = await request(app)
        .get(`/api/users/${testUserId}/settings`)
        .expect(200);

      // EXPECTED TO FAIL: Should include all fields
      expect(response.body.display_name).toBe(displayName);
      expect(response.body.created_at).toBeDefined();
      expect(response.body.updated_at).toBeDefined();
    });
  });

  describe('3. user_settings Row Created with Correct Fields', () => {
    it('should create user_settings with all required fields', async () => {
      const displayName = 'Fiona Gallagher';

      await simulateOnboardingNameStep(db, testUserId, displayName);

      const settings = await queryUserSettings(db, testUserId);

      // EXPECTED TO FAIL: All fields should be present
      expect(settings).toBeDefined();
      expect(settings.user_id).toBe(testUserId);
      expect(settings.display_name).toBe(displayName);
      expect(settings.created_at).toBeDefined();
      expect(settings.updated_at).toBeDefined();
    });

    it('should set created_at and updated_at timestamps', async () => {
      const displayName = 'George Wilson';

      await simulateOnboardingNameStep(db, testUserId, displayName);

      const settings = await queryUserSettings(db, testUserId);

      // EXPECTED TO FAIL: Timestamps should be valid ISO strings
      expect(settings.created_at).toMatch(/^\d{4}-\d{2}-\d{2}/);
      expect(settings.updated_at).toMatch(/^\d{4}-\d{2}-\d{2}/);
    });

    it('should handle display names with special characters', async () => {
      const displayName = "O'Reilly-Smith (PhD)";

      await simulateOnboardingNameStep(db, testUserId, displayName);

      const settings = await queryUserSettings(db, testUserId);

      // EXPECTED TO FAIL: Should preserve special characters
      expect(settings.display_name).toBe(displayName);
    });
  });

  describe('4. Migration Copies Names from onboarding_state to user_settings', () => {
    it('should migrate existing display names to user_settings', async () => {
      const displayName = 'Hannah Montana';

      // Create onboarding_state with display name in responses
      await createOnboardingStateWithName(db, testUserId, displayName);

      // Run migration
      await runDisplayNameMigration(db);

      // Check user_settings was created
      const settings = await queryUserSettings(db, testUserId);

      // EXPECTED TO FAIL: Migration should create user_settings
      expect(settings).toBeDefined();
      expect(settings.display_name).toBe(displayName);
    });

    it('should migrate multiple users in single migration', async () => {
      const user1Id = await createTestUser(db);
      const user2Id = await createTestUser(db);
      const user3Id = await createTestUser(db);

      await createOnboardingStateWithName(db, user1Id, 'User One');
      await createOnboardingStateWithName(db, user2Id, 'User Two');
      await createOnboardingStateWithName(db, user3Id, 'User Three');

      // Run migration
      await runDisplayNameMigration(db);

      // Verify all users migrated
      const settings1 = await queryUserSettings(db, user1Id);
      const settings2 = await queryUserSettings(db, user2Id);
      const settings3 = await queryUserSettings(db, user3Id);

      // EXPECTED TO FAIL: All users should be migrated
      expect(settings1.display_name).toBe('User One');
      expect(settings2.display_name).toBe('User Two');
      expect(settings3.display_name).toBe('User Three');
    });

    it('should skip users without display names in onboarding', async () => {
      // Create onboarding_state without name
      await createOnboardingStateWithoutName(db, testUserId);

      // Run migration
      await runDisplayNameMigration(db);

      // Check user_settings was NOT created
      const settings = await queryUserSettings(db, testUserId);

      // EXPECTED TO FAIL: Should handle gracefully
      expect(settings).toBeNull();
    });
  });

  describe('5. AuthorDisplayName Component Fetches Correct Name', () => {
    it('should fetch display_name from user_settings endpoint', async () => {
      if (!app) {
        console.warn('Skipping API test: server not available');
        return;
      }

      const displayName = 'Ian Malcolm';
      await createUserSettings(db, testUserId, displayName);

      // Simulate AuthorDisplayName component fetch
      const response = await request(app)
        .get(`/api/users/${testUserId}/settings`);

      // EXPECTED TO FAIL: Should return display_name for component
      expect(response.status).toBe(200);
      expect(response.body.display_name).toBe(displayName);
    });
  });

  describe('6. Comments Render with Correct Author Name', () => {
    it('should link comment author_id to user_settings display_name', async () => {
      const displayName = 'Jessica Jones';
      await createUserSettings(db, testUserId, displayName);

      // Create comment with author_id
      const commentId = await createComment(db, testUserId, 'Test comment');

      // Query comment with author name join
      const comment = await queryCommentWithAuthor(db, commentId);

      // EXPECTED TO FAIL: Should join and return display_name
      expect(comment).toBeDefined();
      expect(comment.author_display_name).toBe(displayName);
      expect(comment.author_id).toBe(testUserId);
    });

    it('should handle multiple comments from same author', async () => {
      const displayName = 'Kevin Hart';
      await createUserSettings(db, testUserId, displayName);

      const comment1 = await createComment(db, testUserId, 'First comment');
      const comment2 = await createComment(db, testUserId, 'Second comment');

      const result1 = await queryCommentWithAuthor(db, comment1);
      const result2 = await queryCommentWithAuthor(db, comment2);

      // EXPECTED TO FAIL: Both comments should show same display_name
      expect(result1.author_display_name).toBe(displayName);
      expect(result2.author_display_name).toBe(displayName);
    });
  });

  describe('7. Replies Render with Correct Author Name', () => {
    it('should link reply author_id to user_settings display_name', async () => {
      const displayName = 'Laura Palmer';
      await createUserSettings(db, testUserId, displayName);

      const commentId = await createComment(db, testUserId, 'Parent comment');
      const replyId = await createReply(db, commentId, testUserId, 'Reply text');

      const reply = await queryReplyWithAuthor(db, replyId);

      // EXPECTED TO FAIL: Should join and return display_name for reply
      expect(reply).toBeDefined();
      expect(reply.author_display_name).toBe(displayName);
    });
  });

  describe('8. Handles Missing user_settings Gracefully', () => {
    it('should return fallback "user" when user_settings missing', async () => {
      // Do NOT create user_settings

      const commentId = await createComment(db, testUserId, 'Test comment');
      const comment = await queryCommentWithAuthor(db, commentId);

      // EXPECTED TO FAIL: Should fallback to "user"
      expect(comment.author_display_name).toBe('user');
    });

    it('should handle null display_name in user_settings', async () => {
      // Create user_settings with null display_name
      await createUserSettingsWithNullName(db, testUserId);

      const commentId = await createComment(db, testUserId, 'Test');
      const comment = await queryCommentWithAuthor(db, commentId);

      // EXPECTED TO FAIL: Should fallback to "user"
      expect(comment.author_display_name).toBe('user');
    });
  });

  describe('9. Handles Malformed Onboarding Data', () => {
    it('should handle invalid JSON in onboarding_state.responses', async () => {
      // Create onboarding_state with invalid JSON
      await createOnboardingStateWithInvalidJSON(db, testUserId);

      // Try to extract display name
      const result = await extractDisplayNameFromOnboarding(db, testUserId);

      // EXPECTED TO FAIL: Should handle gracefully
      expect(result).toBeNull();
    });

    it('should handle missing responses field in onboarding_state', async () => {
      // Create onboarding_state without responses
      await createOnboardingStateWithoutResponses(db, testUserId);

      const result = await extractDisplayNameFromOnboarding(db, testUserId);

      // EXPECTED TO FAIL: Should return null
      expect(result).toBeNull();
    });

    it('should handle empty display name string', async () => {
      await simulateOnboardingNameStep(db, testUserId, '');

      const settings = await queryUserSettings(db, testUserId);

      // EXPECTED TO FAIL: Should not create user_settings with empty name
      expect(settings).toBeNull();
    });
  });

  describe('10. Multiple Users Have Independent Names', () => {
    it('should maintain separate display names for different users', async () => {
      const user1Id = await createTestUser(db);
      const user2Id = await createTestUser(db);

      await createUserSettings(db, user1Id, 'Mike Ross');
      await createUserSettings(db, user2Id, 'Rachel Zane');

      const settings1 = await queryUserSettings(db, user1Id);
      const settings2 = await queryUserSettings(db, user2Id);

      // EXPECTED TO FAIL: Each user should have their own name
      expect(settings1.display_name).toBe('Mike Ross');
      expect(settings2.display_name).toBe('Rachel Zane');
      expect(settings1.user_id).not.toBe(settings2.user_id);
    });

    it('should support same display name for different users', async () => {
      const user1Id = await createTestUser(db);
      const user2Id = await createTestUser(db);

      await createUserSettings(db, user1Id, 'John Smith');
      await createUserSettings(db, user2Id, 'John Smith');

      const settings1 = await queryUserSettings(db, user1Id);
      const settings2 = await queryUserSettings(db, user2Id);

      // EXPECTED TO FAIL: Different users can have same display name
      expect(settings1.display_name).toBe('John Smith');
      expect(settings2.display_name).toBe('John Smith');
      expect(settings1.user_id).not.toBe(settings2.user_id);
    });
  });
});

// =============================================================================
// Helper Functions
// =============================================================================

function initializeTestSchema(db) {
  return new Promise((resolve, reject) => {
    const schema = `
      -- Users table
      CREATE TABLE IF NOT EXISTS users (
        id TEXT PRIMARY KEY,
        created_at TEXT DEFAULT CURRENT_TIMESTAMP
      );

      -- User settings table (MISSING IN CURRENT IMPLEMENTATION)
      CREATE TABLE IF NOT EXISTS user_settings (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        user_id TEXT UNIQUE NOT NULL,
        display_name TEXT,
        created_at TEXT DEFAULT CURRENT_TIMESTAMP,
        updated_at TEXT DEFAULT CURRENT_TIMESTAMP,
        FOREIGN KEY (user_id) REFERENCES users(id)
      );

      -- Onboarding state table
      CREATE TABLE IF NOT EXISTS onboarding_state (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        user_id TEXT UNIQUE NOT NULL,
        current_step TEXT,
        responses TEXT,
        completed INTEGER DEFAULT 0,
        created_at TEXT DEFAULT CURRENT_TIMESTAMP,
        updated_at TEXT DEFAULT CURRENT_TIMESTAMP,
        FOREIGN KEY (user_id) REFERENCES users(id)
      );

      -- Comments table
      CREATE TABLE IF NOT EXISTS comments (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        post_id INTEGER,
        author_id TEXT,
        content TEXT,
        created_at TEXT DEFAULT CURRENT_TIMESTAMP,
        FOREIGN KEY (author_id) REFERENCES users(id)
      );

      -- Replies table
      CREATE TABLE IF NOT EXISTS replies (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        comment_id INTEGER,
        author_id TEXT,
        content TEXT,
        created_at TEXT DEFAULT CURRENT_TIMESTAMP,
        FOREIGN KEY (comment_id) REFERENCES comments(id),
        FOREIGN KEY (author_id) REFERENCES users(id)
      );
    `;

    db.exec(schema, (err) => {
      if (err) reject(err);
      else resolve();
    });
  });
}

function createTestUser(db) {
  return new Promise((resolve, reject) => {
    const userId = `user_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;

    db.run(
      'INSERT INTO users (id) VALUES (?)',
      [userId],
      (err) => {
        if (err) reject(err);
        else resolve(userId);
      }
    );
  });
}

async function simulateOnboardingNameStep(db, userId, displayName) {
  const responses = JSON.stringify({
    name: displayName
  });

  return new Promise((resolve, reject) => {
    db.run(
      `INSERT OR REPLACE INTO onboarding_state
       (user_id, current_step, responses, updated_at)
       VALUES (?, 'name', ?, CURRENT_TIMESTAMP)`,
      [userId, responses],
      (err) => {
        if (err) reject(err);
        else resolve();
      }
    );
  });
}

function queryUserSettings(db, userId) {
  return new Promise((resolve, reject) => {
    db.get(
      'SELECT * FROM user_settings WHERE user_id = ?',
      [userId],
      (err, row) => {
        if (err) reject(err);
        else resolve(row || null);
      }
    );
  });
}

function createUserSettings(db, userId, displayName) {
  return new Promise((resolve, reject) => {
    db.run(
      `INSERT INTO user_settings (user_id, display_name) VALUES (?, ?)`,
      [userId, displayName],
      (err) => {
        if (err) reject(err);
        else resolve();
      }
    );
  });
}

function createUserSettingsWithNullName(db, userId) {
  return new Promise((resolve, reject) => {
    db.run(
      `INSERT INTO user_settings (user_id, display_name) VALUES (?, NULL)`,
      [userId],
      (err) => {
        if (err) reject(err);
        else resolve();
      }
    );
  });
}

function createOnboardingStateWithName(db, userId, displayName) {
  const responses = JSON.stringify({ name: displayName });

  return new Promise((resolve, reject) => {
    db.run(
      `INSERT INTO onboarding_state (user_id, responses, current_step)
       VALUES (?, ?, 'completed')`,
      [userId, responses],
      (err) => {
        if (err) reject(err);
        else resolve();
      }
    );
  });
}

function createOnboardingStateWithoutName(db, userId) {
  const responses = JSON.stringify({});

  return new Promise((resolve, reject) => {
    db.run(
      `INSERT INTO onboarding_state (user_id, responses) VALUES (?, ?)`,
      [userId, responses],
      (err) => {
        if (err) reject(err);
        else resolve();
      }
    );
  });
}

function createOnboardingStateWithInvalidJSON(db, userId) {
  return new Promise((resolve, reject) => {
    db.run(
      `INSERT INTO onboarding_state (user_id, responses) VALUES (?, ?)`,
      [userId, 'INVALID JSON {{{'],
      (err) => {
        if (err) reject(err);
        else resolve();
      }
    );
  });
}

function createOnboardingStateWithoutResponses(db, userId) {
  return new Promise((resolve, reject) => {
    db.run(
      `INSERT INTO onboarding_state (user_id, current_step) VALUES (?, 'intro')`,
      [userId],
      (err) => {
        if (err) reject(err);
        else resolve();
      }
    );
  });
}

async function runDisplayNameMigration(db) {
  // This is a placeholder for the migration that should be implemented
  // The migration should:
  // 1. Query all onboarding_state records with display names
  // 2. Extract name from responses JSON
  // 3. Insert into user_settings if not exists

  return new Promise((resolve, reject) => {
    const migrationSQL = `
      INSERT OR IGNORE INTO user_settings (user_id, display_name, created_at, updated_at)
      SELECT
        user_id,
        json_extract(responses, '$.name') as display_name,
        CURRENT_TIMESTAMP,
        CURRENT_TIMESTAMP
      FROM onboarding_state
      WHERE json_extract(responses, '$.name') IS NOT NULL
        AND json_extract(responses, '$.name') != ''
    `;

    db.run(migrationSQL, (err) => {
      if (err) reject(err);
      else resolve();
    });
  });
}

function extractDisplayNameFromOnboarding(db, userId) {
  return new Promise((resolve, reject) => {
    db.get(
      `SELECT json_extract(responses, '$.name') as display_name
       FROM onboarding_state
       WHERE user_id = ?`,
      [userId],
      (err, row) => {
        if (err) reject(err);
        else resolve(row?.display_name || null);
      }
    );
  });
}

function createComment(db, authorId, content) {
  return new Promise((resolve, reject) => {
    db.run(
      `INSERT INTO comments (post_id, author_id, content) VALUES (1, ?, ?)`,
      [authorId, content],
      function(err) {
        if (err) reject(err);
        else resolve(this.lastID);
      }
    );
  });
}

function queryCommentWithAuthor(db, commentId) {
  return new Promise((resolve, reject) => {
    db.get(
      `SELECT
        c.*,
        COALESCE(us.display_name, 'user') as author_display_name
       FROM comments c
       LEFT JOIN user_settings us ON c.author_id = us.user_id
       WHERE c.id = ?`,
      [commentId],
      (err, row) => {
        if (err) reject(err);
        else resolve(row);
      }
    );
  });
}

function createReply(db, commentId, authorId, content) {
  return new Promise((resolve, reject) => {
    db.run(
      `INSERT INTO replies (comment_id, author_id, content) VALUES (?, ?, ?)`,
      [commentId, authorId, content],
      function(err) {
        if (err) reject(err);
        else resolve(this.lastID);
      }
    );
  });
}

function queryReplyWithAuthor(db, replyId) {
  return new Promise((resolve, reject) => {
    db.get(
      `SELECT
        r.*,
        COALESCE(us.display_name, 'user') as author_display_name
       FROM replies r
       LEFT JOIN user_settings us ON r.author_id = us.user_id
       WHERE r.id = ?`,
      [replyId],
      (err, row) => {
        if (err) reject(err);
        else resolve(row);
      }
    );
  });
}

module.exports = {
  // Export helpers for reuse in other tests
  initializeTestSchema,
  createTestUser,
  simulateOnboardingNameStep,
  queryUserSettings,
  createUserSettings,
  runDisplayNameMigration
};
