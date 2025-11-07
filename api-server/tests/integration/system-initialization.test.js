/**
 * System Initialization Integration Tests
 * TDD Test Suite - RED PHASE (Tests written BEFORE implementation)
 *
 * Tests comprehensive system initialization workflow including:
 * - Database reset (all tables cleared correctly)
 * - Welcome content creation (3 posts with correct content)
 * - Engagement score reset to 0
 * - Agent workspace cleanup
 * - Introduction queue reset to default state
 * - Error handling (database errors, missing tables)
 * - Idempotency (can run initialization multiple times safely)
 * - Verification queries (confirm clean state)
 *
 * Test Framework: Vitest
 * Database: /workspaces/agent-feed/database.db
 */

import { describe, it, expect, beforeAll, afterAll, beforeEach } from 'vitest';
import Database from 'better-sqlite3';
import path from 'path';
import { fileURLToPath } from 'url';
import ResetDatabaseService from '../../services/database/reset-database.service.js';
import welcomeContentService from '../../services/system-initialization/welcome-content-service.js';
import FirstTimeSetupService from '../../services/system-initialization/first-time-setup-service.js';
import SystemStateService from '../../services/system-initialization/system-state-service.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const DB_PATH = path.join(__dirname, '../../database.db');

describe('System Initialization Integration Tests', () => {
  let db;
  let resetService;
  let setupService;
  let stateService;
  const testUserId = 'test-user-init-001';

  beforeAll(() => {
    // Initialize database connection
    db = new Database(DB_PATH);
    db.pragma('foreign_keys = ON');

    // Initialize services
    resetService = new ResetDatabaseService(db);
    setupService = new FirstTimeSetupService(db);
    stateService = new SystemStateService(db);

    console.log('✅ Test database and services initialized');
  });

  afterAll(() => {
    // Cleanup test data
    try {
      db.prepare('DELETE FROM agent_posts WHERE json_extract(metadata, "$.userId") = ?').run(testUserId);
      db.prepare('DELETE FROM user_settings WHERE user_id = ?').run(testUserId);
      db.prepare('DELETE FROM onboarding_state WHERE user_id = ?').run(testUserId);
    } catch (error) {
      console.warn('Cleanup error:', error.message);
    }

    if (db) {
      db.close();
    }
  });

  beforeEach(() => {
    // Clean up test user data before each test
    try {
      db.prepare('DELETE FROM agent_posts WHERE json_extract(metadata, "$.userId") = ?').run(testUserId);
      db.prepare('DELETE FROM user_settings WHERE user_id = ?').run(testUserId);
      db.prepare('DELETE FROM onboarding_state WHERE user_id = ?').run(testUserId);
    } catch (error) {
      console.warn('BeforeEach cleanup error:', error.message);
    }
  });

  /**
   * TEST GROUP 1: Database Reset Functionality
   */
  describe('1. Database Reset Operations', () => {
    it('should successfully reset database when confirmation is provided', () => {
      // Create some test data first
      const stmt = db.prepare(`
        INSERT OR IGNORE INTO user_settings (user_id, display_name)
        VALUES (?, ?)
      `);
      stmt.run(testUserId, 'Test User');

      // Reset database
      const result = resetService.resetDatabase({ confirmReset: true });

      expect(result.success).toBe(true);
      expect(result.message).toBe('Database reset successfully');
      expect(result.tablesCleared).toBeDefined();
      expect(result.timestamp).toBeDefined();
    });

    it('should fail to reset database without confirmation', () => {
      const result = resetService.resetDatabase({ confirmReset: false });

      expect(result.success).toBe(false);
      expect(result.error).toBe('Reset confirmation required');
      expect(result.message).toContain('confirmReset');
    });

    it('should clear all records from agent_posts table', () => {
      // Insert test post
      db.prepare(`
        INSERT INTO agent_posts (title, content, author_agent, metadata)
        VALUES (?, ?, ?, json(?))
      `).run('Test', 'Content', 'test-agent', JSON.stringify({ userId: testUserId }));

      // Reset
      resetService.resetDatabase({ confirmReset: true });

      // Verify empty
      const count = db.prepare('SELECT COUNT(*) as count FROM agent_posts').get();
      expect(count.count).toBe(0);
    });

    it('should clear all records from comments table', () => {
      // This test will fail until comments table is properly handled in reset
      resetService.resetDatabase({ confirmReset: true });

      const count = db.prepare('SELECT COUNT(*) as count FROM comments').get();
      expect(count.count).toBe(0);
    });

    it('should clear all records from user_settings table', () => {
      resetService.resetDatabase({ confirmReset: true });

      const count = db.prepare('SELECT COUNT(*) as count FROM user_settings').get();
      expect(count.count).toBe(0);
    });

    it('should return accurate table statistics after reset', () => {
      resetService.resetDatabase({ confirmReset: true });
      const stats = resetService.getDatabaseStats();

      expect(stats.totalRows).toBe(0);
      expect(stats.tables).toBeGreaterThan(0);
      expect(stats.tableStats).toBeDefined();
    });

    it('should verify database is empty after reset', () => {
      resetService.resetDatabase({ confirmReset: true });
      const verification = resetService.verifyEmpty();

      expect(verification.isEmpty).toBe(true);
      expect(verification.totalRows).toBe(0);
      expect(verification.message).toBe('Database is empty');
    });

    it('should handle missing tables gracefully during reset', () => {
      // This should not throw even if some tables don't exist
      expect(() => {
        resetService.resetDatabase({ confirmReset: true });
      }).not.toThrow();
    });
  });

  /**
   * TEST GROUP 2: Welcome Content Creation
   */
  describe('2. Welcome Content Generation', () => {
    it('should generate exactly 3 welcome posts', () => {
      const posts = welcomeContentService.createAllWelcomePosts(testUserId, 'Test User');

      expect(posts).toHaveLength(3);
    });

    it('should generate Λvi welcome post as the first post', () => {
      const posts = welcomeContentService.createAllWelcomePosts(testUserId, 'Test User');
      const aviPost = posts.find(p => p.agentId === 'lambda-vi' && p.metadata.welcomePostType === 'avi-welcome');

      expect(aviPost).toBeDefined();
      expect(aviPost.title).toBe('Welcome to Agent Feed!');
      expect(aviPost.content).toContain('Welcome');
      expect(aviPost.isAgentResponse).toBe(true);
    });

    it('should generate onboarding post from Get-to-Know-You agent', () => {
      const posts = welcomeContentService.createAllWelcomePosts(testUserId);
      const onboardingPost = posts.find(p => p.agentId === 'get-to-know-you-agent');

      expect(onboardingPost).toBeDefined();
      expect(onboardingPost.title).toBe("Hi! Let's Get Started");
      expect(onboardingPost.metadata.welcomePostType).toBe('onboarding-phase1');
      expect(onboardingPost.metadata.onboardingPhase).toBe(1);
    });

    it('should generate reference guide post', () => {
      const posts = welcomeContentService.createAllWelcomePosts(testUserId);
      const referencePost = posts.find(p => p.metadata.welcomePostType === 'reference-guide');

      expect(referencePost).toBeDefined();
      expect(referencePost.title).toBe('📚 How Agent Feed Works');
      expect(referencePost.metadata.isSystemDocumentation).toBe(true);
    });

    it('should personalize Λvi welcome with user display name', () => {
      const aviPost = welcomeContentService.generateAviWelcome(testUserId, 'Alice');

      expect(aviPost.content).toContain('Alice');
    });

    it('should mark all welcome posts with system initialization metadata', () => {
      const posts = welcomeContentService.createAllWelcomePosts(testUserId);

      posts.forEach(post => {
        expect(post.metadata.isSystemInitialization).toBe(true);
        expect(post.metadata.createdAt).toBeDefined();
      });
    });

    it('should validate welcome content for prohibited phrases', () => {
      const validPost = welcomeContentService.generateAviWelcome(testUserId);
      const validation = welcomeContentService.validateWelcomeContent(validPost);

      expect(validation.valid).toBe(true);
      expect(validation.errors).toHaveLength(0);
    });

    it('should reject content containing "chief of staff"', () => {
      const invalidPost = {
        agentId: 'lambda-vi',
        content: 'I am your chief of staff',
        metadata: { welcomePostType: 'avi-welcome' }
      };
      const validation = welcomeContentService.validateWelcomeContent(invalidPost);

      expect(validation.valid).toBe(false);
      expect(validation.errors).toContain('Content contains prohibited phrase "chief of staff"');
    });

    it('should return posts in reverse chronological order for correct display', () => {
      const posts = welcomeContentService.createAllWelcomePosts(testUserId);

      // Posts should be ordered: Reference Guide (oldest), Onboarding, Λvi Welcome (newest)
      expect(posts[0].metadata.welcomePostType).toBe('reference-guide');
      expect(posts[1].metadata.welcomePostType).toBe('onboarding-phase1');
      expect(posts[2].metadata.welcomePostType).toBe('avi-welcome');
    });
  });

  /**
   * TEST GROUP 3: System State Management
   */
  describe('3. System State Tracking', () => {
    it('should report system as uninitialized before first setup', () => {
      const state = stateService.getSystemState();

      expect(state.database).toBeDefined();
      expect(state.users).toBeDefined();
      expect(state.health).toBeDefined();
      expect(state.timestamp).toBeDefined();
    });

    it('should track user statistics accurately', () => {
      // Create test user
      db.prepare(`
        INSERT INTO user_settings (user_id, display_name, onboarding_completed)
        VALUES (?, ?, ?)
      `).run(testUserId, 'Test User', 0);

      const userState = stateService.getUserState();

      expect(userState.totalUsers).toBeGreaterThan(0);
      expect(userState.namedUsers).toBeDefined();
      expect(userState.onboardedUsers).toBeDefined();
    });

    it('should track onboarding state progress', () => {
      const onboardingState = stateService.getOnboardingState();

      expect(onboardingState.totalStates).toBeDefined();
      expect(onboardingState.inPhase1).toBeDefined();
      expect(onboardingState.phase1Completed).toBeDefined();
    });

    it('should provide database statistics', () => {
      const dbState = stateService.getDatabaseState();

      expect(dbState.tables).toBeInstanceOf(Array);
      expect(dbState.tableCounts).toBeDefined();
      expect(dbState.totalTables).toBeGreaterThan(0);
    });

    it('should check system health status', () => {
      const health = stateService.getHealthStatus();

      expect(health.healthy).toBeDefined();
      expect(health.requiredTables).toBeGreaterThan(0);
      expect(health.existingTables).toBeGreaterThan(0);
    });

    it('should detect missing critical tables', () => {
      const health = stateService.getHealthStatus();

      expect(health.missingTables).toBeInstanceOf(Array);
      // Should have all required tables in a healthy system
      expect(health.missingTables.length).toBe(0);
    });

    it('should provide concise system summary', () => {
      const summary = stateService.getSummary();

      expect(summary.initialized).toBeDefined();
      expect(summary.users).toBeDefined();
      expect(summary.healthy).toBeDefined();
      expect(summary.timestamp).toBeDefined();
    });
  });

  /**
   * TEST GROUP 4: Idempotency Testing
   */
  describe('4. Idempotency and Safety', () => {
    it('should allow multiple resets without errors', () => {
      expect(() => {
        resetService.resetDatabase({ confirmReset: true });
        resetService.resetDatabase({ confirmReset: true });
        resetService.resetDatabase({ confirmReset: true });
      }).not.toThrow();
    });

    it('should detect if user already has welcome posts', async () => {
      // Initialize once
      await setupService.initializeSystemWithPosts(testUserId);

      // Try to initialize again
      const result = await setupService.initializeSystemWithPosts(testUserId);

      expect(result.alreadyInitialized).toBe(true);
      expect(result.existingPostsCount).toBeGreaterThanOrEqual(3);
    });

    it('should not duplicate welcome posts on repeated initialization', async () => {
      await setupService.initializeSystemWithPosts(testUserId);
      await setupService.initializeSystemWithPosts(testUserId);

      const postCount = db.prepare(`
        SELECT COUNT(*) as count
        FROM agent_posts
        WHERE json_extract(metadata, '$.userId') = ?
          AND json_extract(metadata, '$.isSystemInitialization') = 1
      `).get(testUserId);

      // Should have exactly 3 posts, not 6
      expect(postCount.count).toBe(3);
    });

    it('should preserve foreign key constraints during reset', () => {
      resetService.resetDatabase({ confirmReset: true });

      // Check that foreign keys are still enabled
      const fkStatus = db.pragma('foreign_keys', { simple: true });
      expect(fkStatus).toBe(1);
    });
  });

  /**
   * TEST GROUP 5: Error Handling
   */
  describe('5. Error Handling', () => {
    it('should handle database connection errors gracefully', () => {
      const invalidService = new ResetDatabaseService(null);

      // Should throw meaningful error
      expect(() => {
        new ResetDatabaseService(null);
      }).toThrow('Database instance is required');
    });

    it('should handle missing template files gracefully', () => {
      // This will fail if template files don't exist
      expect(() => {
        welcomeContentService.generateAviWelcome(testUserId);
      }).not.toThrow();
    });

    it('should validate table names to prevent SQL injection', () => {
      expect(() => {
        resetService.clearTable('malicious_table; DROP TABLE users;');
      }).toThrow('Invalid table name');
    });

    it('should re-enable foreign keys after reset error', () => {
      try {
        // Force an error during reset
        resetService.resetDatabase({ confirmReset: true });
      } catch (error) {
        // Ignore error
      }

      const fkStatus = db.pragma('foreign_keys', { simple: true });
      expect(fkStatus).toBe(1);
    });

    it('should provide detailed error messages for failed operations', async () => {
      const invalidService = new FirstTimeSetupService(null);

      try {
        await invalidService.initializeSystemWithPosts(testUserId);
        expect.fail('Should have thrown error');
      } catch (error) {
        expect(error.message).toBeDefined();
        expect(error.message.length).toBeGreaterThan(0);
      }
    });
  });

  /**
   * TEST GROUP 6: Engagement Score Reset
   */
  describe('6. Engagement Score Management', () => {
    it('should reset engagement scores to 0 during initialization', () => {
      // This test assumes engagement scores exist in metadata or separate table
      resetService.resetDatabase({ confirmReset: true });

      // Verify no engagement scores exist
      const posts = db.prepare('SELECT * FROM agent_posts').all();
      expect(posts.length).toBe(0);
    });

    it('should initialize new posts with engagement score of 0', async () => {
      const result = await setupService.initializeSystemWithPosts(testUserId);

      const posts = db.prepare(`
        SELECT * FROM agent_posts
        WHERE json_extract(metadata, '$.userId') = ?
      `).all(testUserId);

      posts.forEach(post => {
        const metadata = JSON.parse(post.metadata);
        expect(metadata.engagement_score || 0).toBe(0);
      });
    });
  });

  /**
   * TEST GROUP 7: Introduction Queue Reset
   */
  describe('7. Agent Introduction Queue', () => {
    it('should reset introduction queue to default state', () => {
      resetService.resetDatabase({ confirmReset: true });

      const introCount = db.prepare(`
        SELECT COUNT(*) as count FROM agent_introductions
      `).get();

      expect(introCount.count).toBe(0);
    });

    it('should track agent introduction statistics', () => {
      const agentState = stateService.getAgentState();

      expect(agentState.totalIntroductions).toBeDefined();
      expect(agentState.uniqueAgents).toBeDefined();
    });
  });

  /**
   * TEST GROUP 8: Verification Queries
   */
  describe('8. State Verification', () => {
    it('should verify clean state after reset', () => {
      resetService.resetDatabase({ confirmReset: true });
      const verification = resetService.verifyEmpty();

      expect(verification.isEmpty).toBe(true);
      expect(verification.message).toContain('empty');
    });

    it('should confirm all welcome posts are created correctly', async () => {
      const result = await setupService.initializeSystemWithPosts(testUserId);

      expect(result.postsCreated).toBe(3);
      expect(result.postIds).toHaveLength(3);

      // Verify posts exist in database
      const posts = db.prepare(`
        SELECT * FROM agent_posts
        WHERE json_extract(metadata, '$.userId') = ?
      `).all(testUserId);

      expect(posts.length).toBe(3);
    });

    it('should verify post order is correct in database', async () => {
      await setupService.initializeSystemWithPosts(testUserId);

      const posts = db.prepare(`
        SELECT * FROM agent_posts
        WHERE json_extract(metadata, '$.userId') = ?
        ORDER BY created_at DESC
      `).all(testUserId);

      // Most recent should be Λvi welcome
      const firstPost = JSON.parse(posts[0].metadata);
      expect(firstPost.welcomePostType).toBe('avi-welcome');
    });

    it('should confirm database schema integrity after operations', () => {
      resetService.resetDatabase({ confirmReset: true });

      const tables = db.prepare(`
        SELECT name FROM sqlite_master
        WHERE type='table' AND name NOT LIKE 'sqlite_%'
      `).all();

      expect(tables.length).toBeGreaterThan(0);
    });
  });
});
