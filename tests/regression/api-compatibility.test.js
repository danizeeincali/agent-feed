/**
 * API Compatibility Regression Tests
 *
 * This test suite validates that all API endpoints maintain backward compatibility
 * and continue to function correctly after changes.
 */

const request = require('supertest');
const BASE_URL = process.env.TEST_BASE_URL || 'http://localhost:3001';

describe('API Compatibility Regression Tests', () => {

  describe('/api/activities', () => {
    test('GET should return valid response structure', async () => {
      const response = await request(BASE_URL)
        .get('/api/activities')
        .expect(200);

      expect(response.body).toHaveProperty('success', true);
      expect(response.body).toHaveProperty('data');
      expect(response.body).toHaveProperty('activities'); // Backward compatibility
      expect(response.body).toHaveProperty('pagination');
      expect(response.body).toHaveProperty('metadata');

      // Validate metadata structure
      expect(response.body.metadata).toHaveProperty('data_source', 'real_database');
      expect(response.body.metadata).toHaveProperty('no_fake_data', true);
      expect(response.body.metadata).toHaveProperty('authentic_source', true);
      expect(response.body.metadata).toHaveProperty('timestamp');
    });

    test('GET should handle pagination parameters', async () => {
      const response = await request(BASE_URL)
        .get('/api/activities?page=2&limit=5')
        .expect(200);

      expect(response.body.metadata.query_params).toMatchObject({
        page: 2,
        limit: 5
      });
    });

    test('GET should handle filter parameters', async () => {
      const response = await request(BASE_URL)
        .get('/api/activities?type=test&actor=TestActor')
        .expect(200);

      expect(response.body.metadata.query_params).toMatchObject({
        type: 'test',
        actor: 'TestActor'
      });
    });

    test('POST should create activity successfully', async () => {
      const activityData = {
        type: 'regression_test',
        title: 'Test Activity Creation',
        actor: 'RegressionTestSuite'
      };

      const response = await request(BASE_URL)
        .post('/api/activities')
        .send(activityData)
        .expect(201);

      expect(response.body).toHaveProperty('success', true);
      expect(response.body).toHaveProperty('data');
      expect(response.body).toHaveProperty('activity'); // Backward compatibility
      expect(response.body.data).toHaveProperty('id');
      expect(response.body.data).toMatchObject(activityData);
    });

    test('POST should validate required fields', async () => {
      const response = await request(BASE_URL)
        .post('/api/activities')
        .send({})
        .expect(400);

      expect(response.body).toHaveProperty('success', false);
      expect(response.body).toHaveProperty('error');
      expect(response.body.error).toContain('required');
    });

    test('should support CORS headers', async () => {
      const response = await request(BASE_URL)
        .options('/api/activities')
        .expect(200);

      expect(response.headers).toHaveProperty('access-control-allow-origin', '*');
      expect(response.headers).toHaveProperty('access-control-allow-methods');
      expect(response.headers).toHaveProperty('access-control-allow-headers');
    });

    test('should reject unsupported HTTP methods', async () => {
      const response = await request(BASE_URL)
        .delete('/api/activities')
        .expect(405);

      expect(response.body).toHaveProperty('success', false);
      expect(response.body).toHaveProperty('allowed_methods');
      expect(response.body.allowed_methods).toContain('GET');
      expect(response.body.allowed_methods).toContain('POST');
    });
  });

  describe('/api/agents', () => {
    test('GET should return agents list', async () => {
      const response = await request(BASE_URL)
        .get('/api/agents')
        .expect(200);

      expect(response.body).toHaveProperty('success', true);
      expect(response.body).toHaveProperty('agents');
      expect(Array.isArray(response.body.agents)).toBe(true);

      if (response.body.agents.length > 0) {
        const agent = response.body.agents[0];
        expect(agent).toHaveProperty('id');
        expect(agent).toHaveProperty('name');
        expect(agent).toHaveProperty('status');
        expect(agent).toHaveProperty('category');
      }
    });
  });

  describe('/api/agent-posts', () => {
    test('GET should return posts structure', async () => {
      const response = await request(BASE_URL)
        .get('/api/agent-posts')
        .expect(200);

      expect(response.body).toHaveProperty('success', true);
      expect(response.body).toHaveProperty('data');
      expect(Array.isArray(response.body.data)).toBe(true);

      if (response.body.data.length > 0) {
        const post = response.body.data[0];
        expect(post).toHaveProperty('id');
        expect(post).toHaveProperty('agent_id');
        expect(post).toHaveProperty('title');
        expect(post).toHaveProperty('content');
        expect(post).toHaveProperty('status');
        expect(post).toHaveProperty('tags');
      }
    });
  });

  describe('/api/filter-data', () => {
    test('GET should return filter options', async () => {
      const response = await request(BASE_URL)
        .get('/api/filter-data')
        .expect(200);

      expect(response.body).toHaveProperty('success', true);
      expect(response.body).toHaveProperty('data');
      expect(response.body.data).toHaveProperty('categories');
      expect(Array.isArray(response.body.data.categories)).toBe(true);
    });
  });

  describe('/api/filter-stats', () => {
    test('GET should return usage statistics', async () => {
      const response = await request(BASE_URL)
        .get('/api/filter-stats')
        .expect(200);

      expect(response.body).toHaveProperty('success', true);
      expect(response.body).toHaveProperty('data');
      expect(response.body.data).toHaveProperty('user_id');
      expect(response.body.data).toHaveProperty('total_filters_applied');
      expect(response.body.data).toHaveProperty('most_used_filters');
    });
  });

  describe('/api/v1/agent-posts', () => {
    test('GET should return versioned API response', async () => {
      const response = await request(BASE_URL)
        .get('/api/v1/agent-posts')
        .expect(200);

      expect(response.body).toHaveProperty('success', true);
      expect(response.body).toHaveProperty('version', '1.0');
      expect(response.body).toHaveProperty('data');
      expect(Array.isArray(response.body.data)).toBe(true);
    });
  });

  describe('Response Time Performance', () => {
    test('All endpoints should respond within acceptable time', async () => {
      const endpoints = [
        '/api/activities',
        '/api/agents',
        '/api/agent-posts',
        '/api/filter-data',
        '/api/filter-stats',
        '/api/v1/agent-posts'
      ];

      for (const endpoint of endpoints) {
        const startTime = Date.now();
        await request(BASE_URL)
          .get(endpoint)
          .expect(200);
        const responseTime = Date.now() - startTime;

        expect(responseTime).toBeLessThan(5000); // 5 second timeout
        console.log(`${endpoint}: ${responseTime}ms`);
      }
    });
  });
});