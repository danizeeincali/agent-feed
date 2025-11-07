/**
 * System Initialization Test Helpers
 * Utility functions for testing system initialization
 */

import Database from 'better-sqlite3';

/**
 * Create a test database connection
 * @param {string} dbPath - Path to database file
 * @returns {Database} Database instance
 */
export function createTestDatabase(dbPath) {
  const db = new Database(dbPath);
  db.pragma('foreign_keys = ON');
  db.pragma('journal_mode = WAL');
  return db;
}

/**
 * Clean up test user data
 * @param {Database} db - Database instance
 * @param {string} userId - User ID to clean up
 */
export function cleanupTestUser(db, userId) {
  try {
    db.prepare('DELETE FROM agent_posts WHERE json_extract(metadata, "$.userId") = ?').run(userId);
    db.prepare('DELETE FROM user_settings WHERE user_id = ?').run(userId);
    db.prepare('DELETE FROM onboarding_state WHERE user_id = ?').run(userId);
    db.prepare('DELETE FROM hemingway_bridges WHERE user_id = ?').run(userId);
    db.prepare('DELETE FROM agent_introductions WHERE user_id = ?').run(userId);
  } catch (error) {
    console.warn('Cleanup warning:', error.message);
  }
}

/**
 * Count welcome posts for a user
 * @param {Database} db - Database instance
 * @param {string} userId - User ID
 * @returns {number} Number of welcome posts
 */
export function countWelcomePosts(db, userId) {
  const result = db.prepare(`
    SELECT COUNT(*) as count
    FROM agent_posts
    WHERE json_extract(metadata, '$.userId') = ?
      AND json_extract(metadata, '$.isSystemInitialization') = 1
  `).get(userId);

  return result?.count || 0;
}

/**
 * Get all welcome posts for a user
 * @param {Database} db - Database instance
 * @param {string} userId - User ID
 * @returns {Array} Array of post objects
 */
export function getWelcomePosts(db, userId) {
  return db.prepare(`
    SELECT *
    FROM agent_posts
    WHERE json_extract(metadata, '$.userId') = ?
      AND json_extract(metadata, '$.isSystemInitialization') = 1
    ORDER BY created_at DESC
  `).all(userId);
}

/**
 * Verify post order matches expected sequence
 * @param {Array} posts - Array of posts
 * @returns {Object} Validation result
 */
export function verifyPostOrder(posts) {
  if (posts.length !== 3) {
    return {
      valid: false,
      error: `Expected 3 posts, got ${posts.length}`
    };
  }

  const postTypes = posts.map(p => {
    const metadata = typeof p.metadata === 'string'
      ? JSON.parse(p.metadata)
      : p.metadata;
    return metadata.welcomePostType;
  });

  // Expected order (DESC by created_at): avi-welcome, onboarding-phase1, reference-guide
  const expectedOrder = ['avi-welcome', 'onboarding-phase1', 'reference-guide'];
  const matches = postTypes.every((type, index) => type === expectedOrder[index]);

  return {
    valid: matches,
    actualOrder: postTypes,
    expectedOrder,
    error: matches ? null : 'Post order does not match expected sequence'
  };
}

/**
 * Get user settings
 * @param {Database} db - Database instance
 * @param {string} userId - User ID
 * @returns {Object|null} User settings or null
 */
export function getUserSettings(db, userId) {
  return db.prepare(`
    SELECT * FROM user_settings WHERE user_id = ?
  `).get(userId);
}

/**
 * Check if user has onboarding state
 * @param {Database} db - Database instance
 * @param {string} userId - User ID
 * @returns {boolean} True if onboarding state exists
 */
export function hasOnboardingState(db, userId) {
  const result = db.prepare(`
    SELECT COUNT(*) as count FROM onboarding_state WHERE user_id = ?
  `).get(userId);
  return result?.count > 0;
}

/**
 * Get database table counts
 * @param {Database} db - Database instance
 * @returns {Object} Table counts
 */
export function getTableCounts(db) {
  const tables = ['agent_posts', 'comments', 'user_settings', 'onboarding_state', 'hemingway_bridges', 'agent_introductions'];
  const counts = {};

  for (const table of tables) {
    try {
      const result = db.prepare(`SELECT COUNT(*) as count FROM ${table}`).get();
      counts[table] = result?.count || 0;
    } catch (error) {
      counts[table] = 0;
    }
  }

  return counts;
}

/**
 * Verify database is empty (all critical tables have 0 rows)
 * @param {Database} db - Database instance
 * @returns {Object} Verification result
 */
export function verifyDatabaseEmpty(db) {
  const counts = getTableCounts(db);
  const totalRows = Object.values(counts).reduce((sum, count) => sum + count, 0);

  return {
    isEmpty: totalRows === 0,
    totalRows,
    tableCounts: counts
  };
}

/**
 * Create mock welcome posts for testing
 * @param {string} userId - User ID
 * @returns {Array} Array of mock post objects
 */
export function createMockWelcomePosts(userId) {
  return [
    {
      title: 'Welcome to Agent Feed!',
      content: 'Welcome! This is a test post.',
      authorId: userId,
      agentId: 'lambda-vi',
      metadata: {
        isSystemInitialization: true,
        welcomePostType: 'avi-welcome',
        userId
      }
    },
    {
      title: "Hi! Let's Get Started",
      content: 'Test onboarding post',
      authorId: userId,
      agentId: 'get-to-know-you-agent',
      metadata: {
        isSystemInitialization: true,
        welcomePostType: 'onboarding-phase1',
        userId
      }
    },
    {
      title: '📚 How Agent Feed Works',
      content: 'Test reference guide',
      authorId: userId,
      agentId: 'lambda-vi',
      metadata: {
        isSystemInitialization: true,
        welcomePostType: 'reference-guide',
        userId
      }
    }
  ];
}

/**
 * Wait for async operations to complete
 * @param {number} ms - Milliseconds to wait
 * @returns {Promise} Promise that resolves after delay
 */
export function delay(ms) {
  return new Promise(resolve => setTimeout(resolve, ms));
}

/**
 * Validate welcome post content structure
 * @param {Object} post - Post object to validate
 * @returns {Object} Validation result
 */
export function validateWelcomePostStructure(post) {
  const errors = [];

  if (!post.title) errors.push('Missing title');
  if (!post.content) errors.push('Missing content');
  if (!post.authorId && !post.author_agent) errors.push('Missing author information');
  if (!post.agentId) errors.push('Missing agentId');
  if (!post.metadata) errors.push('Missing metadata');

  if (post.metadata) {
    if (!post.metadata.isSystemInitialization) {
      errors.push('Missing isSystemInitialization flag');
    }
    if (!post.metadata.welcomePostType) {
      errors.push('Missing welcomePostType');
    }
  }

  return {
    valid: errors.length === 0,
    errors
  };
}

/**
 * Create test fixtures for system initialization
 * @returns {Object} Test fixtures
 */
export function createTestFixtures() {
  return {
    testUser1: {
      userId: 'fixture-test-user-001',
      displayName: 'Fixture Test User'
    },
    testUser2: {
      userId: 'fixture-test-user-002',
      displayName: 'Second Test User'
    },
    mockPosts: createMockWelcomePosts('fixture-test-user-001')
  };
}

export default {
  createTestDatabase,
  cleanupTestUser,
  countWelcomePosts,
  getWelcomePosts,
  verifyPostOrder,
  getUserSettings,
  hasOnboardingState,
  getTableCounts,
  verifyDatabaseEmpty,
  createMockWelcomePosts,
  delay,
  validateWelcomePostStructure,
  createTestFixtures
};
