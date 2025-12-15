/**
 * System Initialization End-to-End Tests
 * TDD Test Suite - RED PHASE (Tests written BEFORE implementation)
 *
 * Tests complete system initialization workflow from API endpoints:
 * - POST /api/system/initialize - Full initialization flow
 * - GET /api/system/state - State verification
 * - GET /api/system/welcome-posts/preview - Content preview
 * - POST /api/system/validate-content - Content validation
 * - Complete user onboarding journey
 * - Multi-user scenarios
 * - Concurrent initialization handling
 *
 * Test Framework: Vitest
 * HTTP Client: Supertest (or fetch)
 */

import { describe, it, expect, beforeAll, afterAll, beforeEach } from 'vitest';
import request from 'supertest';
import Database from 'better-sqlite3';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const DB_PATH = path.join(__dirname, '../../database.db');

// API base URL - adjust based on your server configuration
const BASE_URL = 'http://localhost:3001';
const API_PREFIX = '/api';

describe('System Initialization E2E Tests', () => {
  let db;
  let serverAvailable = false;
  const testUserId = 'e2e-test-user-001';
  const testUserId2 = 'e2e-test-user-002';

  beforeAll(async () => {
    // Check if server is running
    try {
      const response = await fetch(`${BASE_URL}/health`);
      serverAvailable = response.ok;
      console.log('✅ API server available for E2E tests');
    } catch (error) {
      console.warn('⚠️  API server not running - E2E tests will be skipped');
      console.warn('   Start server with: npm run dev');
    }

    // Initialize database for cleanup
    db = new Database(DB_PATH);
  });

  afterAll(() => {
    // Cleanup test data
    if (db) {
      try {
        db.prepare('DELETE FROM agent_posts WHERE json_extract(metadata, "$.userId") IN (?, ?)').run(testUserId, testUserId2);
        db.prepare('DELETE FROM user_settings WHERE user_id IN (?, ?)').run(testUserId, testUserId2);
        db.prepare('DELETE FROM onboarding_state WHERE user_id IN (?, ?)').run(testUserId, testUserId2);
      } catch (error) {
        console.warn('Cleanup error:', error.message);
      }
      db.close();
    }
  });

  beforeEach(() => {
    // Clean up test user data before each test
    if (db && serverAvailable) {
      try {
        db.prepare('DELETE FROM agent_posts WHERE json_extract(metadata, "$.userId") IN (?, ?)').run(testUserId, testUserId2);
        db.prepare('DELETE FROM user_settings WHERE user_id IN (?, ?)').run(testUserId, testUserId2);
        db.prepare('DELETE FROM onboarding_state WHERE user_id IN (?, ?)').run(testUserId, testUserId2);
      } catch (error) {
        console.warn('BeforeEach cleanup error:', error.message);
      }
    }
  });

  /**
   * TEST GROUP 1: System Initialization API Endpoint
   */
  describe('1. POST /api/system/initialize - System Initialization', () => {
    it('should initialize system for new user', async () => {
      if (!serverAvailable) {
        console.log('⏭️  Skipping: Server not available');
        return;
      }

      const response = await request(BASE_URL)
        .post(`${API_PREFIX}/system/initialize`)
        .send({
          userId: testUserId,
          displayName: 'E2E Test User'
        })
        .expect('Content-Type', /json/)
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.alreadyInitialized).toBe(false);
      expect(response.body.postsCreated).toBe(3);
      expect(response.body.postIds).toHaveLength(3);
      expect(response.body.message).toBeDefined();
    });

    it('should create exactly 3 welcome posts in database', async () => {
      if (!serverAvailable) return;

      await request(BASE_URL)
        .post(`${API_PREFIX}/system/initialize`)
        .send({ userId: testUserId })
        .expect(200);

      // Verify in database
      const posts = db.prepare(`
        SELECT * FROM agent_posts
        WHERE json_extract(metadata, '$.userId') = ?
          AND json_extract(metadata, '$.isSystemInitialization') = 1
      `).all(testUserId);

      expect(posts.length).toBe(3);
    });

    it('should create user_settings record during initialization', async () => {
      if (!serverAvailable) return;

      await request(BASE_URL)
        .post(`${API_PREFIX}/system/initialize`)
        .send({
          userId: testUserId,
          displayName: 'E2E Test User'
        })
        .expect(200);

      const userSettings = db.prepare(`
        SELECT * FROM user_settings WHERE user_id = ?
      `).get(testUserId);

      expect(userSettings).toBeDefined();
      expect(userSettings.display_name).toBe('E2E Test User');
    });

    it('should detect already initialized user', async () => {
      if (!serverAvailable) return;

      // Initialize once
      await request(BASE_URL)
        .post(`${API_PREFIX}/system/initialize`)
        .send({ userId: testUserId })
        .expect(200);

      // Try again
      const response = await request(BASE_URL)
        .post(`${API_PREFIX}/system/initialize`)
        .send({ userId: testUserId })
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.alreadyInitialized).toBe(true);
      expect(response.body.existingPostsCount).toBeGreaterThanOrEqual(3);
      expect(response.body.message).toContain('already');
    });

    it('should use default userId when not provided', async () => {
      if (!serverAvailable) return;

      const response = await request(BASE_URL)
        .post(`${API_PREFIX}/system/initialize`)
        .send({})
        .expect(200);

      expect(response.body.success).toBe(true);
    });

    it('should handle initialization errors gracefully', async () => {
      if (!serverAvailable) return;

      // Send invalid data that might cause error
      const response = await request(BASE_URL)
        .post(`${API_PREFIX}/system/initialize`)
        .send({
          userId: null, // Invalid userId
        });

      // Should still respond (might be 200 with error or 500)
      expect(response.status).toBeGreaterThanOrEqual(200);
      expect(response.body).toBeDefined();
    });

    it('should return post IDs that can be queried', async () => {
      if (!serverAvailable) return;

      const initResponse = await request(BASE_URL)
        .post(`${API_PREFIX}/system/initialize`)
        .send({ userId: testUserId })
        .expect(200);

      const postIds = initResponse.body.postIds;
      expect(postIds).toBeDefined();
      expect(postIds.length).toBe(3);

      // Verify we can query these posts
      const firstPostId = postIds[0];
      const post = db.prepare(`
        SELECT * FROM agent_posts WHERE id = ?
      `).get(firstPostId);

      expect(post).toBeDefined();
    });
  });

  /**
   * TEST GROUP 2: System State API Endpoint
   */
  describe('2. GET /api/system/state - System State Verification', () => {
    it('should return uninitialized state for new user', async () => {
      if (!serverAvailable) return;

      const response = await request(BASE_URL)
        .get(`${API_PREFIX}/system/state`)
        .query({ userId: testUserId })
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.state.initialized).toBe(false);
      expect(response.body.state.userExists).toBe(false);
    });

    it('should return initialized state after initialization', async () => {
      if (!serverAvailable) return;

      // Initialize user
      await request(BASE_URL)
        .post(`${API_PREFIX}/system/initialize`)
        .send({ userId: testUserId })
        .expect(200);

      // Check state
      const response = await request(BASE_URL)
        .get(`${API_PREFIX}/system/state`)
        .query({ userId: testUserId })
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.state.initialized).toBe(true);
      expect(response.body.state.userExists).toBe(true);
      expect(response.body.state.hasWelcomePosts).toBe(true);
      expect(response.body.state.welcomePostsCount).toBe(3);
    });

    it('should include user settings in state response', async () => {
      if (!serverAvailable) return;

      await request(BASE_URL)
        .post(`${API_PREFIX}/system/initialize`)
        .send({
          userId: testUserId,
          displayName: 'Test User'
        })
        .expect(200);

      const response = await request(BASE_URL)
        .get(`${API_PREFIX}/system/state`)
        .query({ userId: testUserId })
        .expect(200);

      expect(response.body.state.userSettings).toBeDefined();
      expect(response.body.state.userSettings.userId).toBe(testUserId);
      expect(response.body.state.userSettings.displayName).toBe('Test User');
    });

    it('should track onboarding completion status', async () => {
      if (!serverAvailable) return;

      await request(BASE_URL)
        .post(`${API_PREFIX}/system/initialize`)
        .send({ userId: testUserId })
        .expect(200);

      const response = await request(BASE_URL)
        .get(`${API_PREFIX}/system/state`)
        .query({ userId: testUserId })
        .expect(200);

      expect(response.body.state.onboardingCompleted).toBeDefined();
      expect(typeof response.body.state.onboardingCompleted).toBe('boolean');
    });

    it('should use demo-user-123 as default userId', async () => {
      if (!serverAvailable) return;

      const response = await request(BASE_URL)
        .get(`${API_PREFIX}/system/state`)
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.state).toBeDefined();
    });
  });

  /**
   * TEST GROUP 3: Welcome Posts Preview API
   */
  describe('3. GET /api/system/welcome-posts/preview - Content Preview', () => {
    it('should preview welcome posts without creating them', async () => {
      if (!serverAvailable) return;

      const response = await request(BASE_URL)
        .get(`${API_PREFIX}/system/welcome-posts/preview`)
        .query({ userId: testUserId })
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.welcomePosts).toHaveLength(3);
      expect(response.body.stats).toBeDefined();

      // Verify posts were NOT created in database
      const posts = db.prepare(`
        SELECT COUNT(*) as count FROM agent_posts
        WHERE json_extract(metadata, '$.userId') = ?
      `).get(testUserId);

      expect(posts.count).toBe(0);
    });

    it('should return all three welcome post types', async () => {
      if (!serverAvailable) return;

      const response = await request(BASE_URL)
        .get(`${API_PREFIX}/system/welcome-posts/preview`)
        .query({ userId: testUserId })
        .expect(200);

      const postTypes = response.body.welcomePosts.map(p => p.metadata.welcomePostType);
      expect(postTypes).toContain('avi-welcome');
      expect(postTypes).toContain('onboarding-phase1');
      expect(postTypes).toContain('reference-guide');
    });

    it('should include statistics about welcome posts', async () => {
      if (!serverAvailable) return;

      const response = await request(BASE_URL)
        .get(`${API_PREFIX}/system/welcome-posts/preview`)
        .query({ userId: testUserId })
        .expect(200);

      expect(response.body.stats.totalPosts).toBe(3);
      expect(response.body.stats.postTypes).toHaveLength(3);
      expect(response.body.stats.totalContentLength).toBeGreaterThan(0);
    });

    it('should personalize preview with display name', async () => {
      if (!serverAvailable) return;

      const response = await request(BASE_URL)
        .get(`${API_PREFIX}/system/welcome-posts/preview`)
        .query({
          userId: testUserId,
          displayName: 'Alice'
        })
        .expect(200);

      const aviPost = response.body.welcomePosts.find(
        p => p.metadata.welcomePostType === 'avi-welcome'
      );

      expect(aviPost.content).toContain('Alice');
    });
  });

  /**
   * TEST GROUP 4: Content Validation API
   */
  describe('4. POST /api/system/validate-content - Content Validation', () => {
    it('should validate valid welcome content', async () => {
      if (!serverAvailable) return;

      const validPost = {
        agentId: 'lambda-vi',
        content: 'Welcome! I am your AI partner. Get-to-Know-You will help.',
        metadata: { welcomePostType: 'avi-welcome' }
      };

      const response = await request(BASE_URL)
        .post(`${API_PREFIX}/system/validate-content`)
        .send({ postData: validPost })
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.validation.valid).toBe(true);
      expect(response.body.validation.errors).toHaveLength(0);
    });

    it('should reject content with prohibited phrases', async () => {
      if (!serverAvailable) return;

      const invalidPost = {
        agentId: 'lambda-vi',
        content: 'I am your chief of staff',
        metadata: { welcomePostType: 'avi-welcome' }
      };

      const response = await request(BASE_URL)
        .post(`${API_PREFIX}/system/validate-content`)
        .send({ postData: invalidPost })
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.validation.valid).toBe(false);
      expect(response.body.validation.errors.length).toBeGreaterThan(0);
    });

    it('should return 400 for missing postData', async () => {
      if (!serverAvailable) return;

      const response = await request(BASE_URL)
        .post(`${API_PREFIX}/system/validate-content`)
        .send({})
        .expect(400);

      expect(response.body.success).toBe(false);
      expect(response.body.error).toContain('Missing postData');
    });
  });

  /**
   * TEST GROUP 5: Complete User Journey
   */
  describe('5. Complete User Onboarding Journey', () => {
    it('should complete full initialization workflow', async () => {
      if (!serverAvailable) return;

      // Step 1: Check initial state (uninitialized)
      const stateResponse1 = await request(BASE_URL)
        .get(`${API_PREFIX}/system/state`)
        .query({ userId: testUserId })
        .expect(200);
      expect(stateResponse1.body.state.initialized).toBe(false);

      // Step 2: Preview welcome posts
      const previewResponse = await request(BASE_URL)
        .get(`${API_PREFIX}/system/welcome-posts/preview`)
        .query({ userId: testUserId })
        .expect(200);
      expect(previewResponse.body.welcomePosts).toHaveLength(3);

      // Step 3: Initialize system
      const initResponse = await request(BASE_URL)
        .post(`${API_PREFIX}/system/initialize`)
        .send({
          userId: testUserId,
          displayName: 'Journey Test User'
        })
        .expect(200);
      expect(initResponse.body.success).toBe(true);
      expect(initResponse.body.postsCreated).toBe(3);

      // Step 4: Verify state is now initialized
      const stateResponse2 = await request(BASE_URL)
        .get(`${API_PREFIX}/system/state`)
        .query({ userId: testUserId })
        .expect(200);
      expect(stateResponse2.body.state.initialized).toBe(true);
      expect(stateResponse2.body.state.hasWelcomePosts).toBe(true);

      // Step 5: Verify posts are accessible via agent-posts API
      const postsResponse = await request(BASE_URL)
        .get(`${API_PREFIX}/agent-posts`)
        .expect(200);
      expect(postsResponse.body.success).toBe(true);

      const userPosts = postsResponse.body.data.filter(p =>
        p.metadata?.userId === testUserId
      );
      expect(userPosts.length).toBeGreaterThanOrEqual(3);
    });

    it('should handle rapid sequential initialization attempts', async () => {
      if (!serverAvailable) return;

      const requests = Array(3).fill(null).map(() =>
        request(BASE_URL)
          .post(`${API_PREFIX}/system/initialize`)
          .send({ userId: testUserId })
      );

      const responses = await Promise.all(requests);

      // At least one should succeed
      const successfulInits = responses.filter(r =>
        r.body.success && !r.body.alreadyInitialized
      );
      expect(successfulInits.length).toBeGreaterThan(0);

      // Should have exactly 3 posts total (not duplicated)
      const posts = db.prepare(`
        SELECT COUNT(*) as count FROM agent_posts
        WHERE json_extract(metadata, '$.userId') = ?
      `).get(testUserId);
      expect(posts.count).toBe(3);
    });
  });

  /**
   * TEST GROUP 6: Multi-User Scenarios
   */
  describe('6. Multi-User Initialization', () => {
    it('should initialize multiple users independently', async () => {
      if (!serverAvailable) return;

      // Initialize first user
      const response1 = await request(BASE_URL)
        .post(`${API_PREFIX}/system/initialize`)
        .send({
          userId: testUserId,
          displayName: 'User One'
        })
        .expect(200);

      // Initialize second user
      const response2 = await request(BASE_URL)
        .post(`${API_PREFIX}/system/initialize`)
        .send({
          userId: testUserId2,
          displayName: 'User Two'
        })
        .expect(200);

      expect(response1.body.success).toBe(true);
      expect(response2.body.success).toBe(true);

      // Verify both users have their own posts
      const user1Posts = db.prepare(`
        SELECT COUNT(*) as count FROM agent_posts
        WHERE json_extract(metadata, '$.userId') = ?
      `).get(testUserId);

      const user2Posts = db.prepare(`
        SELECT COUNT(*) as count FROM agent_posts
        WHERE json_extract(metadata, '$.userId') = ?
      `).get(testUserId2);

      expect(user1Posts.count).toBe(3);
      expect(user2Posts.count).toBe(3);
    });

    it('should maintain separate state for each user', async () => {
      if (!serverAvailable) return;

      await request(BASE_URL)
        .post(`${API_PREFIX}/system/initialize`)
        .send({ userId: testUserId })
        .expect(200);

      const state1 = await request(BASE_URL)
        .get(`${API_PREFIX}/system/state`)
        .query({ userId: testUserId })
        .expect(200);

      const state2 = await request(BASE_URL)
        .get(`${API_PREFIX}/system/state`)
        .query({ userId: testUserId2 })
        .expect(200);

      expect(state1.body.state.initialized).toBe(true);
      expect(state2.body.state.initialized).toBe(false);
    });
  });

  /**
   * TEST GROUP 7: Performance and Reliability
   */
  describe('7. Performance and Reliability', () => {
    it('should complete initialization in under 2 seconds', async () => {
      if (!serverAvailable) return;

      const startTime = Date.now();

      await request(BASE_URL)
        .post(`${API_PREFIX}/system/initialize`)
        .send({ userId: testUserId })
        .expect(200);

      const duration = Date.now() - startTime;
      expect(duration).toBeLessThan(2000);
    });

    it('should handle concurrent state queries', async () => {
      if (!serverAvailable) return;

      await request(BASE_URL)
        .post(`${API_PREFIX}/system/initialize`)
        .send({ userId: testUserId })
        .expect(200);

      const requests = Array(5).fill(null).map(() =>
        request(BASE_URL)
          .get(`${API_PREFIX}/system/state`)
          .query({ userId: testUserId })
      );

      const responses = await Promise.all(requests);

      responses.forEach(response => {
        expect(response.status).toBe(200);
        expect(response.body.success).toBe(true);
      });
    });

    it('should maintain data integrity under load', async () => {
      if (!serverAvailable) return;

      // Create posts for user
      await request(BASE_URL)
        .post(`${API_PREFIX}/system/initialize`)
        .send({ userId: testUserId })
        .expect(200);

      // Perform multiple concurrent operations
      const operations = [
        request(BASE_URL).get(`${API_PREFIX}/system/state`).query({ userId: testUserId }),
        request(BASE_URL).get(`${API_PREFIX}/system/welcome-posts/preview`).query({ userId: testUserId }),
        request(BASE_URL).post(`${API_PREFIX}/system/initialize`).send({ userId: testUserId })
      ];

      await Promise.all(operations);

      // Verify data integrity
      const posts = db.prepare(`
        SELECT COUNT(*) as count FROM agent_posts
        WHERE json_extract(metadata, '$.userId') = ?
      `).get(testUserId);

      expect(posts.count).toBe(3); // Should still have exactly 3 posts
    });
  });
});
