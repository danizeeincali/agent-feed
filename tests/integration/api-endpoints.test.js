/**
 * API Endpoints Integration Tests
 * Tests all 25+ API endpoints for functionality, authentication, and validation
 */

const request = require('supertest');
const { app } = require('../../src/api/server');
const { db } = require('../../src/database/connection');
const jwt = require('jsonwebtoken');
const bcrypt = require('bcryptjs');

describe('API Endpoints Integration Tests', () => {
  let authToken;
  let testUser;
  let testFeed;
  let testSession;

  beforeAll(async () => {
    // Setup test database
    await db.migrate();
    
    // Create test user
    const hashedPassword = await bcrypt.hash('testpassword123', 10);
    const userResult = await db.query(`
      INSERT INTO users (email, name, password_hash) 
      VALUES ($1, $2, $3) 
      RETURNING *
    `, ['test@example.com', 'Test User', hashedPassword]);
    
    testUser = userResult.rows[0];
    
    // Generate auth token
    authToken = jwt.sign(
      { userId: testUser.id, email: testUser.email },
      process.env.JWT_SECRET || 'test-secret',
      { expiresIn: '1h' }
    );
  });

  afterAll(async () => {
    // Cleanup test data
    await db.query('DELETE FROM users WHERE email = $1', ['test@example.com']);
    await db.close();
  });

  describe('Health Check Endpoints', () => {
    test('GET /health should return system status', async () => {
      const response = await request(app)
        .get('/health')
        .expect(200);

      expect(response.body).toHaveProperty('status');
      expect(response.body).toHaveProperty('timestamp');
      expect(response.body).toHaveProperty('services');
      expect(response.body.services).toHaveProperty('database');
      expect(response.body.services).toHaveProperty('redis');
    });

    test('GET /api/v1 should return API information', async () => {
      const response = await request(app)
        .get('/api/v1')
        .expect(200);

      expect(response.body).toHaveProperty('name', 'Agent Feed API');
      expect(response.body).toHaveProperty('endpoints');
      expect(response.body.features).toHaveProperty('claude_flow_integration', true);
    });
  });

  describe('Authentication Endpoints', () => {
    test('POST /api/v1/auth/register should create new user', async () => {
      const userData = {
        email: 'newuser@example.com',
        name: 'New User',
        password: 'password123'
      };

      const response = await request(app)
        .post('/api/v1/auth/register')
        .send(userData)
        .expect(201);

      expect(response.body).toHaveProperty('user');
      expect(response.body).toHaveProperty('accessToken');
      expect(response.body.user.email).toBe(userData.email);
      
      // Cleanup
      await db.query('DELETE FROM users WHERE email = $1', [userData.email]);
    });

    test('POST /api/v1/auth/login should authenticate user', async () => {
      const loginData = {
        email: 'test@example.com',
        password: 'testpassword123'
      };

      const response = await request(app)
        .post('/api/v1/auth/login')
        .send(loginData)
        .expect(200);

      expect(response.body).toHaveProperty('accessToken');
      expect(response.body).toHaveProperty('refreshToken');
      expect(response.body).toHaveProperty('user');
    });

    test('GET /api/v1/auth/profile should return user profile', async () => {
      const response = await request(app)
        .get('/api/v1/auth/profile')
        .set('Authorization', `Bearer ${authToken}`)
        .expect(200);

      expect(response.body).toHaveProperty('id', testUser.id);
      expect(response.body).toHaveProperty('email', 'test@example.com');
    });

    test('PUT /api/v1/auth/profile should update user profile', async () => {
      const updateData = {
        name: 'Updated Test User',
        preferences: {
          theme: 'dark',
          notifications: { email: false }
        }
      };

      const response = await request(app)
        .put('/api/v1/auth/profile')
        .set('Authorization', `Bearer ${authToken}`)
        .send(updateData)
        .expect(200);

      expect(response.body.name).toBe(updateData.name);
      expect(response.body.preferences.theme).toBe('dark');
    });

    test('POST /api/v1/auth/logout should invalidate session', async () => {
      await request(app)
        .post('/api/v1/auth/logout')
        .set('Authorization', `Bearer ${authToken}`)
        .expect(200);
    });
  });

  describe('Feed Management Endpoints', () => {
    beforeEach(async () => {
      // Create test feed
      const feedResult = await db.query(`
        INSERT INTO feeds (user_id, name, url, feed_type) 
        VALUES ($1, $2, $3, $4) 
        RETURNING *
      `, [testUser.id, 'Test Feed', 'https://example.com/feed.rss', 'rss']);
      
      testFeed = feedResult.rows[0];
    });

    afterEach(async () => {
      // Cleanup test feed
      if (testFeed) {
        await db.query('DELETE FROM feeds WHERE id = $1', [testFeed.id]);
      }
    });

    test('GET /api/v1/feeds should return user feeds', async () => {
      const response = await request(app)
        .get('/api/v1/feeds')
        .set('Authorization', `Bearer ${authToken}`)
        .expect(200);

      expect(Array.isArray(response.body.feeds)).toBe(true);
      expect(response.body.feeds.length).toBeGreaterThan(0);
      expect(response.body.feeds[0]).toHaveProperty('id');
      expect(response.body.feeds[0]).toHaveProperty('name');
    });

    test('POST /api/v1/feeds should create new feed', async () => {
      const feedData = {
        name: 'New Test Feed',
        url: 'https://example.com/new-feed.rss',
        feed_type: 'rss',
        fetch_interval: 30
      };

      const response = await request(app)
        .post('/api/v1/feeds')
        .set('Authorization', `Bearer ${authToken}`)
        .send(feedData)
        .expect(201);

      expect(response.body).toHaveProperty('id');
      expect(response.body.name).toBe(feedData.name);
      expect(response.body.url).toBe(feedData.url);
      
      // Cleanup
      await db.query('DELETE FROM feeds WHERE id = $1', [response.body.id]);
    });

    test('GET /api/v1/feeds/:id should return feed details', async () => {
      const response = await request(app)
        .get(`/api/v1/feeds/${testFeed.id}`)
        .set('Authorization', `Bearer ${authToken}`)
        .expect(200);

      expect(response.body.id).toBe(testFeed.id);
      expect(response.body.name).toBe(testFeed.name);
    });

    test('PUT /api/v1/feeds/:id should update feed', async () => {
      const updateData = {
        name: 'Updated Feed Name',
        fetch_interval: 60
      };

      const response = await request(app)
        .put(`/api/v1/feeds/${testFeed.id}`)
        .set('Authorization', `Bearer ${authToken}`)
        .send(updateData)
        .expect(200);

      expect(response.body.name).toBe(updateData.name);
      expect(response.body.fetch_interval).toBe(updateData.fetch_interval);
    });

    test('GET /api/v1/feeds/:id/items should return feed items', async () => {
      // Create test feed item
      await db.query(`
        INSERT INTO feed_items (feed_id, title, content, url, content_hash) 
        VALUES ($1, $2, $3, $4, $5)
      `, [testFeed.id, 'Test Item', 'Test Content', 'https://example.com/item1', 'hash123']);

      const response = await request(app)
        .get(`/api/v1/feeds/${testFeed.id}/items`)
        .set('Authorization', `Bearer ${authToken}`)
        .expect(200);

      expect(Array.isArray(response.body.items)).toBe(true);
      expect(response.body.items.length).toBeGreaterThan(0);
    });

    test('POST /api/v1/feeds/:id/fetch should trigger manual fetch', async () => {
      const response = await request(app)
        .post(`/api/v1/feeds/${testFeed.id}/fetch`)
        .set('Authorization', `Bearer ${authToken}`)
        .expect(200);

      expect(response.body).toHaveProperty('message');
      expect(response.body).toHaveProperty('fetch_id');
    });

    test('DELETE /api/v1/feeds/:id should delete feed', async () => {
      await request(app)
        .delete(`/api/v1/feeds/${testFeed.id}`)
        .set('Authorization', `Bearer ${authToken}`)
        .expect(200);

      // Verify deletion
      const checkResult = await db.query('SELECT * FROM feeds WHERE id = $1', [testFeed.id]);
      expect(checkResult.rows.length).toBe(0);
      
      testFeed = null; // Prevent cleanup
    });
  });

  describe('Claude Flow Endpoints', () => {
    beforeEach(async () => {
      // Create test session
      const sessionResult = await db.query(`
        INSERT INTO claude_flow_sessions (user_id, swarm_id, configuration) 
        VALUES ($1, $2, $3) 
        RETURNING *
      `, [testUser.id, 'test-swarm-123', JSON.stringify({ topology: 'mesh', max_agents: 3 })]);
      
      testSession = sessionResult.rows[0];
    });

    afterEach(async () => {
      // Cleanup test session
      if (testSession) {
        await db.query('DELETE FROM claude_flow_sessions WHERE id = $1', [testSession.id]);
      }
    });

    test('GET /api/v1/claude-flow/sessions should return user sessions', async () => {
      const response = await request(app)
        .get('/api/v1/claude-flow/sessions')
        .set('Authorization', `Bearer ${authToken}`)
        .expect(200);

      expect(Array.isArray(response.body.sessions)).toBe(true);
      expect(response.body.sessions.length).toBeGreaterThan(0);
    });

    test('POST /api/v1/claude-flow/sessions should create new session', async () => {
      const sessionData = {
        topology: 'hierarchical',
        max_agents: 5,
        description: 'Test Claude Flow Session'
      };

      const response = await request(app)
        .post('/api/v1/claude-flow/sessions')
        .set('Authorization', `Bearer ${authToken}`)
        .send(sessionData)
        .expect(201);

      expect(response.body).toHaveProperty('id');
      expect(response.body).toHaveProperty('swarm_id');
      expect(response.body.configuration.topology).toBe(sessionData.topology);
      
      // Cleanup
      await db.query('DELETE FROM claude_flow_sessions WHERE id = $1', [response.body.id]);
    });

    test('GET /api/v1/claude-flow/sessions/:id should return session details', async () => {
      const response = await request(app)
        .get(`/api/v1/claude-flow/sessions/${testSession.id}`)
        .set('Authorization', `Bearer ${authToken}`)
        .expect(200);

      expect(response.body.id).toBe(testSession.id);
      expect(response.body.swarm_id).toBe(testSession.swarm_id);
    });

    test('POST /api/v1/claude-flow/sessions/:id/agents should spawn agent', async () => {
      const agentData = {
        type: 'researcher',
        capabilities: ['data_analysis', 'research']
      };

      const response = await request(app)
        .post(`/api/v1/claude-flow/sessions/${testSession.id}/agents`)
        .set('Authorization', `Bearer ${authToken}`)
        .send(agentData)
        .expect(201);

      expect(response.body).toHaveProperty('agent_id');
      expect(response.body).toHaveProperty('status');
    });

    test('POST /api/v1/claude-flow/sessions/:id/tasks should orchestrate task', async () => {
      const taskData = {
        task: 'Analyze recent feed items for trends',
        priority: 'high',
        strategy: 'adaptive'
      };

      const response = await request(app)
        .post(`/api/v1/claude-flow/sessions/${testSession.id}/tasks`)
        .set('Authorization', `Bearer ${authToken}`)
        .send(taskData)
        .expect(201);

      expect(response.body).toHaveProperty('task_id');
      expect(response.body).toHaveProperty('status');
    });

    test('DELETE /api/v1/claude-flow/sessions/:id should end session', async () => {
      await request(app)
        .delete(`/api/v1/claude-flow/sessions/${testSession.id}`)
        .set('Authorization', `Bearer ${authToken}`)
        .expect(200);

      // Verify session is marked as ended
      const checkResult = await db.query('SELECT status FROM claude_flow_sessions WHERE id = $1', [testSession.id]);
      expect(checkResult.rows[0].status).toBe('completed');
      
      testSession = null; // Prevent cleanup
    });
  });

  describe('Automation Endpoints', () => {
    test('GET /api/v1/automation/feeds/:id/triggers should return triggers', async () => {
      if (!testFeed) {
        // Create test feed for this test
        const feedResult = await db.query(`
          INSERT INTO feeds (user_id, name, url, feed_type) 
          VALUES ($1, $2, $3, $4) 
          RETURNING *
        `, [testUser.id, 'Automation Test Feed', 'https://example.com/auto-feed.rss', 'rss']);
        testFeed = feedResult.rows[0];
      }

      const response = await request(app)
        .get(`/api/v1/automation/feeds/${testFeed.id}/triggers`)
        .set('Authorization', `Bearer ${authToken}`)
        .expect(200);

      expect(Array.isArray(response.body.triggers)).toBe(true);
    });

    test('POST /api/v1/automation/feeds/:id/triggers should create trigger', async () => {
      if (!testFeed) {
        const feedResult = await db.query(`
          INSERT INTO feeds (user_id, name, url, feed_type) 
          VALUES ($1, $2, $3, $4) 
          RETURNING *
        `, [testUser.id, 'Automation Test Feed', 'https://example.com/auto-feed.rss', 'rss']);
        testFeed = feedResult.rows[0];
      }

      const triggerData = {
        name: 'Keyword Trigger',
        trigger_type: 'keyword_match',
        conditions: {
          keywords: ['AI', 'machine learning']
        }
      };

      const response = await request(app)
        .post(`/api/v1/automation/feeds/${testFeed.id}/triggers`)
        .set('Authorization', `Bearer ${authToken}`)
        .send(triggerData)
        .expect(201);

      expect(response.body).toHaveProperty('id');
      expect(response.body.name).toBe(triggerData.name);
      
      // Cleanup
      await db.query('DELETE FROM automation_triggers WHERE id = $1', [response.body.id]);
    });

    test('GET /api/v1/automation/feeds/:id/actions should return actions', async () => {
      if (!testFeed) {
        const feedResult = await db.query(`
          INSERT INTO feeds (user_id, name, url, feed_type) 
          VALUES ($1, $2, $3, $4) 
          RETURNING *
        `, [testUser.id, 'Automation Test Feed', 'https://example.com/auto-feed.rss', 'rss']);
        testFeed = feedResult.rows[0];
      }

      const response = await request(app)
        .get(`/api/v1/automation/feeds/${testFeed.id}/actions`)
        .set('Authorization', `Bearer ${authToken}`)
        .expect(200);

      expect(Array.isArray(response.body.actions)).toBe(true);
    });

    test('POST /api/v1/automation/feeds/:id/actions should create action', async () => {
      if (!testFeed) {
        const feedResult = await db.query(`
          INSERT INTO feeds (user_id, name, url, feed_type) 
          VALUES ($1, $2, $3, $4) 
          RETURNING *
        `, [testUser.id, 'Automation Test Feed', 'https://example.com/auto-feed.rss', 'rss']);
        testFeed = feedResult.rows[0];
      }

      const actionData = {
        name: 'Claude Flow Analysis',
        action_type: 'claude_flow_spawn',
        config: {
          agent_type: 'analyzer',
          task: 'Analyze feed item sentiment'
        }
      };

      const response = await request(app)
        .post(`/api/v1/automation/feeds/${testFeed.id}/actions`)
        .set('Authorization', `Bearer ${authToken}`)
        .send(actionData)
        .expect(201);

      expect(response.body).toHaveProperty('id');
      expect(response.body.name).toBe(actionData.name);
      
      // Cleanup
      await db.query('DELETE FROM automation_actions WHERE id = $1', [response.body.id]);
    });

    test('GET /api/v1/automation/feeds/:id/results should return automation results', async () => {
      if (!testFeed) {
        const feedResult = await db.query(`
          INSERT INTO feeds (user_id, name, url, feed_type) 
          VALUES ($1, $2, $3, $4) 
          RETURNING *
        `, [testUser.id, 'Automation Test Feed', 'https://example.com/auto-feed.rss', 'rss']);
        testFeed = feedResult.rows[0];
      }

      const response = await request(app)
        .get(`/api/v1/automation/feeds/${testFeed.id}/results`)
        .set('Authorization', `Bearer ${authToken}`)
        .expect(200);

      expect(Array.isArray(response.body.results)).toBe(true);
      expect(response.body).toHaveProperty('pagination');
    });
  });

  describe('Error Handling', () => {
    test('Should return 401 for protected endpoints without auth', async () => {
      await request(app)
        .get('/api/v1/feeds')
        .expect(401);
    });

    test('Should return 404 for non-existent resources', async () => {
      await request(app)
        .get('/api/v1/feeds/non-existent-id')
        .set('Authorization', `Bearer ${authToken}`)
        .expect(404);
    });

    test('Should return 400 for invalid request data', async () => {
      await request(app)
        .post('/api/v1/feeds')
        .set('Authorization', `Bearer ${authToken}`)
        .send({ invalid: 'data' })
        .expect(400);
    });

    test('Should handle rate limiting', async () => {
      // Make multiple rapid requests to trigger rate limit
      const requests = Array(110).fill(null).map(() => 
        request(app).get('/health')
      );

      const responses = await Promise.all(requests);
      const rateLimitedResponses = responses.filter(r => r.status === 429);
      
      expect(rateLimitedResponses.length).toBeGreaterThan(0);
    });
  });

  describe('Data Validation', () => {
    test('Should validate email format in registration', async () => {
      await request(app)
        .post('/api/v1/auth/register')
        .send({
          email: 'invalid-email',
          name: 'Test User',
          password: 'password123'
        })
        .expect(400);
    });

    test('Should validate feed URL format', async () => {
      await request(app)
        .post('/api/v1/feeds')
        .set('Authorization', `Bearer ${authToken}`)
        .send({
          name: 'Test Feed',
          url: 'invalid-url',
          feed_type: 'rss'
        })
        .expect(400);
    });

    test('Should validate required fields', async () => {
      await request(app)
        .post('/api/v1/feeds')
        .set('Authorization', `Bearer ${authToken}`)
        .send({
          name: 'Test Feed'
          // Missing required URL field
        })
        .expect(400);
    });
  });
});
