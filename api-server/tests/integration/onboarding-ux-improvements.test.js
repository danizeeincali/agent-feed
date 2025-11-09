/**
 * Integration Tests for Onboarding UX Improvements
 * Following TDD methodology - these tests should FAIL until implementation is complete
 *
 * Testing:
 * 1. Name persistence to user_settings.display_name
 * 2. Agent creates new posts (not comments) for topic shifts
 * 3. Timeout increases to 240s with grace period planning mode at 192s
 */

const request = require('supertest');
const { expect } = require('@jest/globals');
const fixtures = require('../fixtures/onboarding-data');

// These imports will need to be adjusted based on actual project structure
const app = require('../../src/app'); // Main Express app
const db = require('../../src/db'); // Database connection
const { createTestUser, cleanupTestData } = require('../helpers/test-utils');

describe('Onboarding UX Improvements - Integration Tests', () => {
  let testUser;
  let authToken;

  beforeEach(async () => {
    // Setup: Create test user and get auth token
    testUser = await createTestUser();
    authToken = testUser.token;
  });

  afterEach(async () => {
    // Cleanup: Remove test data
    await cleanupTestData(testUser.id);
  });

  describe('Feature 1: Name Persistence to user_settings.display_name', () => {
    test('should save display name to user_settings table when user completes onboarding', async () => {
      const onboardingData = fixtures.onboardingResponses.withName;

      const response = await request(app)
        .post('/api/onboarding/complete')
        .set('Authorization', `Bearer ${authToken}`)
        .send(onboardingData)
        .expect(200);

      // Verify API response
      expect(response.body.success).toBe(true);
      expect(response.body.user_settings).toBeDefined();
      expect(response.body.user_settings.display_name).toBe('Orko');

      // Verify database state
      const userSettings = await db.query(
        'SELECT display_name, onboarding_completed, onboarding_completed_at FROM user_settings WHERE user_id = $1',
        [testUser.id]
      );

      expect(userSettings.rows[0].display_name).toBe('Orko');
      expect(userSettings.rows[0].onboarding_completed).toBe(true);
      expect(userSettings.rows[0].onboarding_completed_at).toBeInstanceOf(Date);
    });

    test('should handle display name with special characters and spaces', async () => {
      const specialNames = [
        'John O\'Brien',
        'María García',
        'Alex-Smith',
        'User 123',
        'Name with emoji 👋'
      ];

      for (const name of specialNames) {
        const response = await request(app)
          .post('/api/onboarding/complete')
          .set('Authorization', `Bearer ${authToken}`)
          .send({ ...fixtures.onboardingResponses.withName, userName: name })
          .expect(200);

        expect(response.body.user_settings.display_name).toBe(name);

        const userSettings = await db.query(
          'SELECT display_name FROM user_settings WHERE user_id = $1',
          [testUser.id]
        );
        expect(userSettings.rows[0].display_name).toBe(name);
      }
    });

    test('should set display_name to NULL if user skips name entry', async () => {
      const response = await request(app)
        .post('/api/onboarding/complete')
        .set('Authorization', `Bearer ${authToken}`)
        .send(fixtures.onboardingResponses.withoutName)
        .expect(200);

      expect(response.body.user_settings.display_name).toBeNull();

      const userSettings = await db.query(
        'SELECT display_name FROM user_settings WHERE user_id = $1',
        [testUser.id]
      );
      expect(userSettings.rows[0].display_name).toBeNull();
    });

    test('should return display name in GET /api/user/settings endpoint', async () => {
      // First set the name
      await request(app)
        .post('/api/onboarding/complete')
        .set('Authorization', `Bearer ${authToken}`)
        .send(fixtures.onboardingResponses.withName)
        .expect(200);

      // Then retrieve it
      const response = await request(app)
        .get('/api/user/settings')
        .set('Authorization', `Bearer ${authToken}`)
        .expect(200);

      expect(response.body.display_name).toBe('Orko');
    });

    test('should allow updating display name after onboarding', async () => {
      // Initial onboarding
      await request(app)
        .post('/api/onboarding/complete')
        .set('Authorization', `Bearer ${authToken}`)
        .send(fixtures.onboardingResponses.withName)
        .expect(200);

      // Update name
      const response = await request(app)
        .patch('/api/user/settings')
        .set('Authorization', `Bearer ${authToken}`)
        .send({ display_name: 'Orko Updated' })
        .expect(200);

      expect(response.body.display_name).toBe('Orko Updated');

      // Verify in database
      const userSettings = await db.query(
        'SELECT display_name FROM user_settings WHERE user_id = $1',
        [testUser.id]
      );
      expect(userSettings.rows[0].display_name).toBe('Orko Updated');
    });

    test('should include display name in user profile response', async () => {
      await request(app)
        .post('/api/onboarding/complete')
        .set('Authorization', `Bearer ${authToken}`)
        .send(fixtures.onboardingResponses.withName)
        .expect(200);

      const response = await request(app)
        .get('/api/user/profile')
        .set('Authorization', `Bearer ${authToken}`)
        .expect(200);

      expect(response.body.display_name).toBe('Orko');
      expect(response.body.username).not.toBe('Integration Test User');
    });

    test('should validate display name length constraints', async () => {
      const tooLongName = 'A'.repeat(256); // Assuming max 255 chars

      const response = await request(app)
        .post('/api/onboarding/complete')
        .set('Authorization', `Bearer ${authToken}`)
        .send({ ...fixtures.onboardingResponses.withName, userName: tooLongName })
        .expect(400);

      expect(response.body.error).toBeDefined();
      expect(response.body.error).toMatch(/name.*too long/i);
    });

    test('should sanitize display name input to prevent XSS', async () => {
      const maliciousName = '<script>alert("xss")</script>Orko';

      const response = await request(app)
        .post('/api/onboarding/complete')
        .set('Authorization', `Bearer ${authToken}`)
        .send({ ...fixtures.onboardingResponses.withName, userName: maliciousName })
        .expect(200);

      // Name should be sanitized
      expect(response.body.user_settings.display_name).not.toContain('<script>');
      expect(response.body.user_settings.display_name).toMatch(/Orko/);
    });
  });

  describe('Feature 2: Agent Creates New Posts (Not Comments) for Topic Shifts', () => {
    test('should create separate posts for each onboarding question', async () => {
      const response = await request(app)
        .post('/api/onboarding/start')
        .set('Authorization', `Bearer ${authToken}`)
        .expect(200);

      // Should receive multiple posts, not comments
      expect(response.body.posts).toBeDefined();
      expect(Array.isArray(response.body.posts)).toBe(true);
      expect(response.body.posts.length).toBeGreaterThanOrEqual(3);

      // Each post should be a root-level post (no parent)
      response.body.posts.forEach(post => {
        expect(post.parent_post_id).toBeNull();
        expect(post.post_type).toBe('onboarding');
      });
    });

    test('should verify posts are NOT comments in database', async () => {
      await request(app)
        .post('/api/onboarding/start')
        .set('Authorization', `Bearer ${authToken}`)
        .expect(200);

      // Query database for onboarding posts
      const posts = await db.query(
        `SELECT id, parent_post_id, post_type, content
         FROM posts
         WHERE user_id = $1 AND post_type = 'onboarding'
         ORDER BY created_at ASC`,
        [testUser.id]
      );

      expect(posts.rows.length).toBeGreaterThanOrEqual(3);

      posts.rows.forEach(post => {
        // Verify each is a root post (not a comment)
        expect(post.parent_post_id).toBeNull();
      });
    });

    test('should create posts with correct metadata indicating topic shifts', async () => {
      const response = await request(app)
        .post('/api/onboarding/start')
        .set('Authorization', `Bearer ${authToken}`)
        .expect(200);

      const posts = response.body.posts;

      // Verify metadata structure
      expect(posts[0]).toMatchObject({
        post_type: 'onboarding',
        metadata: expect.objectContaining({
          onboardingStep: expect.any(String),
          questionType: expect.any(String)
        })
      });
    });

    test('should create posts in correct chronological order', async () => {
      const response = await request(app)
        .post('/api/onboarding/start')
        .set('Authorization', `Bearer ${authToken}`)
        .expect(200);

      const posts = response.body.posts;

      // Verify posts are ordered by creation time
      for (let i = 1; i < posts.length; i++) {
        const prevTime = new Date(posts[i - 1].created_at);
        const currTime = new Date(posts[i].created_at);
        expect(currTime.getTime()).toBeGreaterThanOrEqual(prevTime.getTime());
      }
    });

    test('should allow user to respond to each onboarding post separately', async () => {
      // Start onboarding
      const startResponse = await request(app)
        .post('/api/onboarding/start')
        .set('Authorization', `Bearer ${authToken}`)
        .expect(200);

      const posts = startResponse.body.posts;

      // Respond to each post
      for (const post of posts) {
        const response = await request(app)
          .post(`/api/posts/${post.id}/respond`)
          .set('Authorization', `Bearer ${authToken}`)
          .send({ content: 'My response' })
          .expect(200);

        expect(response.body.success).toBe(true);
      }
    });

    test('should NOT create comment hierarchy for onboarding questions', async () => {
      await request(app)
        .post('/api/onboarding/start')
        .set('Authorization', `Bearer ${authToken}`)
        .expect(200);

      // Check for any comments in database
      const comments = await db.query(
        `SELECT id FROM posts
         WHERE user_id = $1
         AND post_type = 'onboarding'
         AND parent_post_id IS NOT NULL`,
        [testUser.id]
      );

      // Should be 0 - all onboarding interactions should be posts
      expect(comments.rows.length).toBe(0);
    });

    test('should distinguish between onboarding posts and regular conversation posts', async () => {
      // Create onboarding posts
      await request(app)
        .post('/api/onboarding/start')
        .set('Authorization', `Bearer ${authToken}`)
        .expect(200);

      // Create a regular post
      await request(app)
        .post('/api/posts')
        .set('Authorization', `Bearer ${authToken}`)
        .send({ content: 'Regular question about AI' })
        .expect(200);

      // Query all posts
      const allPosts = await db.query(
        `SELECT post_type FROM posts WHERE user_id = $1`,
        [testUser.id]
      );

      const onboardingPosts = allPosts.rows.filter(p => p.post_type === 'onboarding');
      const regularPosts = allPosts.rows.filter(p => p.post_type !== 'onboarding');

      expect(onboardingPosts.length).toBeGreaterThanOrEqual(3);
      expect(regularPosts.length).toBeGreaterThanOrEqual(1);
    });
  });

  describe('Feature 3: Timeout Configuration - 240s with Grace Period at 192s', () => {
    test('should configure maximum timeout to 240 seconds (240000ms)', async () => {
      const response = await request(app)
        .get('/api/config/timeout')
        .set('Authorization', `Bearer ${authToken}`)
        .expect(200);

      expect(response.body.maxTimeout).toBe(240000);
      expect(response.body.maxTimeoutSeconds).toBe(240);
    });

    test('should set grace period at 80% of timeout (192 seconds)', async () => {
      const response = await request(app)
        .get('/api/config/timeout')
        .set('Authorization', `Bearer ${authToken}`)
        .expect(200);

      expect(response.body.gracePeriodTimeout).toBe(192000);
      expect(response.body.gracePeriodSeconds).toBe(192);
      expect(response.body.gracePeriodPercentage).toBe(0.8);
    });

    test('should activate planning mode when grace period is reached', async () => {
      // Mock a long-running query
      const queryStart = Date.now();

      const response = await request(app)
        .post('/api/query/execute')
        .set('Authorization', `Bearer ${authToken}`)
        .send({
          query: 'Long running query',
          simulateDelay: 195000 // 195s - past grace period
        })
        .expect(200);

      expect(response.body.planningModeActivated).toBe(true);
      expect(response.body.activatedAt).toBeGreaterThanOrEqual(192000);
    });

    test('should NOT timeout queries under 240 seconds', async () => {
      const response = await request(app)
        .post('/api/query/execute')
        .set('Authorization', `Bearer ${authToken}`)
        .send({
          query: 'Query within timeout',
          simulateDelay: 230000 // 230s - under timeout
        })
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.timedOut).toBe(false);
    });

    test('should timeout queries exceeding 240 seconds', async () => {
      const response = await request(app)
        .post('/api/query/execute')
        .set('Authorization', `Bearer ${authToken}`)
        .send({
          query: 'Query exceeding timeout',
          simulateDelay: 250000 // 250s - exceeds timeout
        })
        .expect(408); // Request Timeout

      expect(response.body.timedOut).toBe(true);
      expect(response.body.duration).toBeGreaterThan(240000);
    });

    test('should provide warning at 50% of timeout (120s)', async () => {
      const response = await request(app)
        .post('/api/query/execute')
        .set('Authorization', `Bearer ${authToken}`)
        .send({
          query: 'Query with progress monitoring',
          simulateDelay: 125000 // 125s - past 50%
        })
        .expect(200);

      expect(response.body.warnings).toBeDefined();
      expect(response.body.warnings).toContain('50% timeout threshold reached');
    });

    test('should emit progress events during long queries', async () => {
      const events = [];

      const response = await request(app)
        .post('/api/query/execute')
        .set('Authorization', `Bearer ${authToken}`)
        .send({
          query: 'Query with events',
          simulateDelay: 200000,
          captureEvents: true
        })
        .expect(200);

      expect(response.body.events).toBeDefined();
      expect(response.body.events.length).toBeGreaterThan(0);

      // Should have events at key milestones
      const hasGracePeriodEvent = response.body.events.some(
        e => e.type === 'grace_period_reached'
      );
      expect(hasGracePeriodEvent).toBe(true);
    });

    test('should correctly calculate time remaining at various points', async () => {
      const testPoints = [
        { elapsed: 60000, expected: 180000 },   // 60s elapsed, 180s remaining
        { elapsed: 120000, expected: 120000 },  // 120s elapsed, 120s remaining
        { elapsed: 192000, expected: 48000 },   // Grace period, 48s remaining
        { elapsed: 220000, expected: 20000 }    // Near timeout, 20s remaining
      ];

      for (const point of testPoints) {
        const response = await request(app)
          .post('/api/query/time-remaining')
          .set('Authorization', `Bearer ${authToken}`)
          .send({ elapsedTime: point.elapsed })
          .expect(200);

        expect(response.body.timeRemaining).toBe(point.expected);
      }
    });

    test('should store timeout configuration in database', async () => {
      const config = await db.query(
        `SELECT config_value FROM system_config WHERE config_key = 'query_timeout'`
      );

      expect(config.rows[0].config_value).toBe('240000');
    });

    test('should allow admin to configure custom timeout values', async () => {
      const adminToken = 'admin-token'; // Mock admin auth

      const response = await request(app)
        .post('/api/admin/config/timeout')
        .set('Authorization', `Bearer ${adminToken}`)
        .send({
          maxTimeout: 300000,
          gracePeriodPercentage: 0.75
        })
        .expect(200);

      expect(response.body.maxTimeout).toBe(300000);
      expect(response.body.gracePeriodTimeout).toBe(225000);
    });
  });

  describe('Integration: Combined Features', () => {
    test('should complete full onboarding flow with all improvements', async () => {
      // Start onboarding
      const startResponse = await request(app)
        .post('/api/onboarding/start')
        .set('Authorization', `Bearer ${authToken}`)
        .expect(200);

      // Verify posts created (not comments)
      expect(startResponse.body.posts.length).toBeGreaterThanOrEqual(3);
      startResponse.body.posts.forEach(post => {
        expect(post.parent_post_id).toBeNull();
      });

      // Complete onboarding with name
      const completeResponse = await request(app)
        .post('/api/onboarding/complete')
        .set('Authorization', `Bearer ${authToken}`)
        .send(fixtures.onboardingResponses.withName)
        .expect(200);

      // Verify name saved
      expect(completeResponse.body.user_settings.display_name).toBe('Orko');

      // Verify timeout config available
      const configResponse = await request(app)
        .get('/api/config/timeout')
        .set('Authorization', `Bearer ${authToken}`)
        .expect(200);

      expect(configResponse.body.maxTimeout).toBe(240000);
    });

    test('should use display name in posts created after onboarding', async () => {
      // Complete onboarding
      await request(app)
        .post('/api/onboarding/complete')
        .set('Authorization', `Bearer ${authToken}`)
        .send(fixtures.onboardingResponses.withName)
        .expect(200);

      // Create a new post
      const postResponse = await request(app)
        .post('/api/posts')
        .set('Authorization', `Bearer ${authToken}`)
        .send({ content: 'My first post' })
        .expect(200);

      // Verify author name is display name
      expect(postResponse.body.author_name).toBe('Orko');
      expect(postResponse.body.author_name).not.toBe('Integration Test User');
    });

    test('should handle onboarding timeout scenarios with grace period', async () => {
      const response = await request(app)
        .post('/api/onboarding/start')
        .set('Authorization', `Bearer ${authToken}`)
        .send({ simulateSlowResponse: true })
        .expect(200);

      // Should complete within timeout even with slow responses
      expect(response.body.duration).toBeLessThan(240000);

      // Should activate planning mode if needed
      if (response.body.duration > 192000) {
        expect(response.body.planningModeActivated).toBe(true);
      }
    });
  });
});
