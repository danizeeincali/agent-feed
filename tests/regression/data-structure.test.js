/**
 * Data Structure Validation Regression Tests
 *
 * This test suite validates that API responses maintain consistent data structures
 * and schemas across different endpoints and scenarios.
 */

const request = require('supertest');
const BASE_URL = process.env.TEST_BASE_URL || 'http://localhost:3001';

describe('Data Structure Regression Tests', () => {

  describe('Activities Data Structure', () => {
    let createdActivityId;

    beforeAll(async () => {
      // Create a test activity for structure validation
      const response = await request(BASE_URL)
        .post('/api/activities')
        .send({
          type: 'structure_test',
          title: 'Data Structure Test Activity',
          actor: 'StructureTestSuite'
        });
      createdActivityId = response.body.data.id;
    });

    test('GET /api/activities response structure', async () => {
      const response = await request(BASE_URL)
        .get('/api/activities')
        .expect(200);

      // Validate top-level structure
      expect(response.body).toMatchObject({
        success: expect.any(Boolean),
        data: expect.any(Array),
        activities: expect.any(Array), // Backward compatibility
        pagination: expect.objectContaining({
          total: expect.any(Number),
          page: expect.any(Number),
          limit: expect.any(Number),
          pages: expect.any(Number)
        }),
        metadata: expect.objectContaining({
          total_count: expect.any(Number),
          data_source: expect.any(String),
          no_fake_data: expect.any(Boolean),
          no_database_mocks: expect.any(Boolean),
          authentic_source: expect.any(Boolean),
          timestamp: expect.stringMatching(/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}.\d{3}Z$/),
          query_params: expect.objectContaining({
            page: expect.any(Number),
            limit: expect.any(Number)
          })
        })
      });

      // Validate activity structure if activities exist
      if (response.body.data.length > 0) {
        const activity = response.body.data[0];
        expect(activity).toMatchObject({
          id: expect.any(String),
          type: expect.any(String),
          title: expect.any(String),
          actor: expect.any(String),
          timestamp: expect.stringMatching(/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}.\d{3}Z$/),
          created_at: expect.stringMatching(/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}.\d{3}Z$/)
        });
      }
    });

    test('POST /api/activities response structure', async () => {
      const activityData = {
        type: 'test_structure',
        title: 'Structure Validation Test',
        actor: 'TestActor'
      };

      const response = await request(BASE_URL)
        .post('/api/activities')
        .send(activityData)
        .expect(201);

      expect(response.body).toMatchObject({
        success: true,
        data: expect.objectContaining({
          id: expect.any(String),
          type: activityData.type,
          title: activityData.title,
          actor: activityData.actor,
          description: expect.any(String),
          target_type: null,
          target_id: null,
          metadata: expect.any(Object),
          timestamp: expect.stringMatching(/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}.\d{3}Z$/),
          created_at: expect.stringMatching(/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}.\d{3}Z$/)
        }),
        activity: expect.any(Object), // Backward compatibility
        metadata: expect.objectContaining({
          data_source: 'real_database',
          no_fake_data: true,
          authentic_source: true,
          created_at: expect.stringMatching(/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}.\d{3}Z$/)
        })
      });

      // Ensure backward compatibility fields match
      expect(response.body.data).toEqual(response.body.activity);
    });
  });

  describe('Agents Data Structure', () => {
    test('GET /api/agents response structure', async () => {
      const response = await request(BASE_URL)
        .get('/api/agents')
        .expect(200);

      expect(response.body).toMatchObject({
        success: true,
        agents: expect.any(Array)
      });

      if (response.body.agents.length > 0) {
        response.body.agents.forEach(agent => {
          expect(agent).toMatchObject({
            id: expect.any(Number),
            name: expect.any(String),
            status: expect.stringMatching(/^(active|inactive)$/),
            category: expect.any(String)
          });
        });
      }
    });
  });

  describe('Agent Posts Data Structure', () => {
    test('GET /api/agent-posts response structure', async () => {
      const response = await request(BASE_URL)
        .get('/api/agent-posts')
        .expect(200);

      expect(response.body).toMatchObject({
        success: true,
        data: expect.any(Array)
      });

      if (response.body.data.length > 0) {
        response.body.data.forEach(post => {
          expect(post).toMatchObject({
            id: expect.any(Number),
            agent_id: expect.any(Number),
            title: expect.any(String),
            content: expect.any(String),
            published_at: expect.stringMatching(/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}Z$/),
            status: expect.stringMatching(/^(published|draft|archived)$/),
            tags: expect.any(Array)
          });

          // Validate tags structure
          post.tags.forEach(tag => {
            expect(typeof tag).toBe('string');
          });
        });
      }
    });

    test('GET /api/v1/agent-posts versioned response structure', async () => {
      const response = await request(BASE_URL)
        .get('/api/v1/agent-posts')
        .expect(200);

      expect(response.body).toMatchObject({
        success: true,
        version: '1.0',
        data: expect.any(Array)
      });

      // Should have same data structure as non-versioned endpoint
      if (response.body.data.length > 0) {
        response.body.data.forEach(post => {
          expect(post).toMatchObject({
            id: expect.any(Number),
            agent_id: expect.any(Number),
            title: expect.any(String),
            content: expect.any(String),
            published_at: expect.stringMatching(/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}Z$/),
            status: expect.any(String),
            tags: expect.any(Array)
          });
        });
      }
    });
  });

  describe('Filter Data Structure', () => {
    test('GET /api/filter-data response structure', async () => {
      const response = await request(BASE_URL)
        .get('/api/filter-data')
        .expect(200);

      expect(response.body).toMatchObject({
        success: true,
        data: expect.objectContaining({
          categories: expect.any(Array)
        })
      });

      response.body.data.categories.forEach(category => {
        expect(category).toMatchObject({
          id: expect.any(String),
          name: expect.any(String),
          count: expect.any(Number)
        });
      });
    });
  });

  describe('Filter Stats Data Structure', () => {
    test('GET /api/filter-stats response structure', async () => {
      const response = await request(BASE_URL)
        .get('/api/filter-stats')
        .expect(200);

      expect(response.body).toMatchObject({
        success: true,
        data: expect.objectContaining({
          user_id: expect.any(String),
          total_filters_applied: expect.any(Number),
          most_used_filters: expect.any(Array)
        })
      });

      response.body.data.most_used_filters.forEach(filter => {
        expect(filter).toMatchObject({
          filter: expect.any(String),
          usage_count: expect.any(Number)
        });
      });
    });
  });

  describe('Error Response Structure', () => {
    test('Invalid POST request should return consistent error structure', async () => {
      const response = await request(BASE_URL)
        .post('/api/activities')
        .send({})
        .expect(400);

      expect(response.body).toMatchObject({
        success: false,
        error: expect.any(String),
        provided_data: expect.any(Array)
      });
    });

    test('Unsupported method should return consistent error structure', async () => {
      const response = await request(BASE_URL)
        .patch('/api/activities')
        .expect(405);

      expect(response.body).toMatchObject({
        success: false,
        error: expect.any(String),
        allowed_methods: expect.any(Array)
      });

      expect(response.body.allowed_methods).toContain('GET');
      expect(response.body.allowed_methods).toContain('POST');
    });
  });

  describe('Content Type Validation', () => {
    test('All JSON responses should have correct Content-Type header', async () => {
      const endpoints = [
        '/api/activities',
        '/api/agents',
        '/api/agent-posts',
        '/api/filter-data',
        '/api/filter-stats',
        '/api/v1/agent-posts'
      ];

      for (const endpoint of endpoints) {
        const response = await request(BASE_URL)
          .get(endpoint)
          .expect(200);

        expect(response.headers['content-type']).toMatch(/application\/json/);
      }
    });
  });

  describe('Pagination Structure Consistency', () => {
    test('Pagination structure should be consistent across paginated endpoints', async () => {
      const response = await request(BASE_URL)
        .get('/api/activities?page=1&limit=10')
        .expect(200);

      if (response.body.pagination) {
        expect(response.body.pagination).toMatchObject({
          total: expect.any(Number),
          page: expect.any(Number),
          limit: expect.any(Number),
          pages: expect.any(Number)
        });

        // Validate pagination math
        const { total, page, limit, pages } = response.body.pagination;
        expect(page).toBeGreaterThanOrEqual(1);
        expect(limit).toBeGreaterThanOrEqual(1);
        expect(pages).toBe(Math.ceil(total / limit));
      }
    });
  });
});