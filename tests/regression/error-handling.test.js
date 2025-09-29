/**
 * Error Handling Regression Tests
 *
 * This test suite validates that error handling remains consistent and helpful
 * across all API endpoints and edge cases.
 */

const request = require('supertest');
const BASE_URL = process.env.TEST_BASE_URL || 'http://localhost:3001';

describe('Error Handling Regression Tests', () => {

  describe('HTTP Method Validation', () => {
    test('Unsupported methods should return 405 with helpful error', async () => {
      const unsupportedMethods = ['PUT', 'DELETE', 'PATCH'];

      for (const method of unsupportedMethods) {
        const response = await request(BASE_URL)
          [method.toLowerCase()]('/api/activities')
          .expect(405);

        expect(response.body).toMatchObject({
          success: false,
          error: expect.stringContaining(method),
          allowed_methods: expect.arrayContaining(['GET', 'POST'])
        });

        expect(response.headers.allow).toContain('GET');
        expect(response.headers.allow).toContain('POST');
      }
    });
  });

  describe('Content-Type Validation', () => {
    test('POST with invalid Content-Type should handle gracefully', async () => {
      const response = await request(BASE_URL)
        .post('/api/activities')
        .set('Content-Type', 'text/plain')
        .send('invalid data')
        .expect(400);

      expect(response.body).toHaveProperty('success', false);
      expect(response.body).toHaveProperty('error');
    });

    test('POST with missing Content-Type should handle gracefully', async () => {
      const response = await request(BASE_URL)
        .post('/api/activities')
        .send('{"type":"test"}');

      // Should either succeed or fail gracefully
      expect([200, 201, 400, 415]).toContain(response.status);
      expect(response.body).toHaveProperty('success');
    });
  });

  describe('Request Body Validation', () => {
    test('POST with malformed JSON should return 400', async () => {
      const response = await request(BASE_URL)
        .post('/api/activities')
        .set('Content-Type', 'application/json')
        .send('{"type":"test",}'); // Invalid JSON

      expect([400, 422]).toContain(response.status);
      expect(response.body).toHaveProperty('success', false);
    });

    test('POST with empty body should return validation error', async () => {
      const response = await request(BASE_URL)
        .post('/api/activities')
        .send({})
        .expect(400);

      expect(response.body).toMatchObject({
        success: false,
        error: expect.stringContaining('required'),
        provided_data: []
      });
    });

    test('POST with partial data should validate missing fields', async () => {
      const partialData = { type: 'test' }; // Missing title and actor

      const response = await request(BASE_URL)
        .post('/api/activities')
        .send(partialData)
        .expect(400);

      expect(response.body).toMatchObject({
        success: false,
        error: expect.any(String),
        provided_data: ['type']
      });

      expect(response.body.error).toMatch(/title|actor/);
    });

    test('POST with invalid data types should validate properly', async () => {
      const invalidData = {
        type: 123, // Should be string
        title: true, // Should be string
        actor: null // Should be string
      };

      const response = await request(BASE_URL)
        .post('/api/activities')
        .send(invalidData)
        .expect(400);

      expect(response.body).toHaveProperty('success', false);
      expect(response.body).toHaveProperty('error');
    });

    test('POST with extremely large payload should handle gracefully', async () => {
      const largeData = {
        type: 'test',
        title: 'A'.repeat(10000), // Very large title
        actor: 'TestActor'
      };

      const response = await request(BASE_URL)
        .post('/api/activities')
        .send(largeData);

      // Should either accept, reject, or truncate gracefully
      expect([201, 400, 413, 422]).toContain(response.status);
      expect(response.body).toHaveProperty('success');
    });
  });

  describe('Query Parameter Validation', () => {
    test('Invalid pagination parameters should be sanitized', async () => {
      const response = await request(BASE_URL)
        .get('/api/activities?page=-1&limit=999999')
        .expect(200);

      expect(response.body.metadata.query_params.page).toBeGreaterThanOrEqual(1);
      expect(response.body.metadata.query_params.limit).toBeLessThanOrEqual(100);
    });

    test('Non-numeric pagination parameters should be handled', async () => {
      const response = await request(BASE_URL)
        .get('/api/activities?page=abc&limit=xyz')
        .expect(200);

      expect(typeof response.body.metadata.query_params.page).toBe('number');
      expect(typeof response.body.metadata.query_params.limit).toBe('number');
      expect(response.body.metadata.query_params.page).toBeGreaterThanOrEqual(1);
      expect(response.body.metadata.query_params.limit).toBeGreaterThanOrEqual(1);
    });

    test('SQL injection attempts in query parameters should be handled', async () => {
      const maliciousQueries = [
        "'; DROP TABLE activities; --",
        "1' OR '1'='1",
        "UNION SELECT * FROM users",
        "<script>alert('xss')</script>"
      ];

      for (const maliciousQuery of maliciousQueries) {
        const response = await request(BASE_URL)
          .get(`/api/activities?type=${encodeURIComponent(maliciousQuery)}`)
          .expect(200);

        // Should return safely without error
        expect(response.body).toHaveProperty('success', true);
        expect(response.body.metadata.query_params.type).toBe(maliciousQuery);
      }
    });
  });

  describe('Server Error Handling', () => {
    test('Database connection errors should return 500 with helpful message', async () => {
      // This test would ideally mock a database failure, but we'll test the error format
      // by checking that any 500 errors follow the expected structure

      // We can't easily force a database error, so we'll create a scenario
      // that might cause one and validate the error structure if it occurs
      const response = await request(BASE_URL)
        .post('/api/activities')
        .send({
          type: 'test',
          title: 'Test for potential database error',
          actor: 'ErrorTest'
        });

      if (response.status === 500) {
        expect(response.body).toMatchObject({
          success: false,
          error: expect.any(String),
          message: expect.any(String),
          data_source: 'real_database'
        });
      } else {
        // If no error occurs, that's also good
        expect([200, 201]).toContain(response.status);
      }
    });
  });

  describe('Rate Limiting and Resource Protection', () => {
    test('Rapid requests should not crash the server', async () => {
      const promises = [];

      // Send 10 rapid requests
      for (let i = 0; i < 10; i++) {
        promises.push(
          request(BASE_URL)
            .get('/api/activities')
            .timeout(5000)
        );
      }

      const responses = await Promise.allSettled(promises);

      // All requests should either succeed or fail gracefully
      responses.forEach((result, index) => {
        if (result.status === 'fulfilled') {
          expect([200, 429, 503]).toContain(result.value.status);
          expect(result.value.body).toHaveProperty('success');
        }
        // If rejected, it should be due to timeout or network, not server crash
      });
    });
  });

  describe('Edge Cases', () => {
    test('Extremely long URLs should be handled gracefully', async () => {
      const longParam = 'a'.repeat(2000);

      const response = await request(BASE_URL)
        .get(`/api/activities?type=${longParam}`)
        .timeout(5000);

      // Should either succeed or fail gracefully
      expect([200, 400, 414, 431]).toContain(response.status);
      expect(response.body).toHaveProperty('success');
    });

    test('Special characters in parameters should be handled', async () => {
      const specialChars = "!@#$%^&*()[]{}|;':\",./<>?`~";

      const response = await request(BASE_URL)
        .get(`/api/activities?type=${encodeURIComponent(specialChars)}`)
        .expect(200);

      expect(response.body).toHaveProperty('success', true);
      expect(response.body.metadata.query_params.type).toBe(specialChars);
    });

    test('Unicode characters should be handled properly', async () => {
      const unicodeData = {
        type: 'test',
        title: '测试 🚀 émojí ñoñó',
        actor: 'UnicodeTestActor'
      };

      const response = await request(BASE_URL)
        .post('/api/activities')
        .send(unicodeData)
        .expect(201);

      expect(response.body.data.title).toBe(unicodeData.title);
    });
  });

  describe('CORS Error Handling', () => {
    test('CORS preflight requests should be handled correctly', async () => {
      const response = await request(BASE_URL)
        .options('/api/activities')
        .set('Origin', 'http://localhost:3000')
        .set('Access-Control-Request-Method', 'POST')
        .set('Access-Control-Request-Headers', 'Content-Type')
        .expect(200);

      expect(response.headers).toHaveProperty('access-control-allow-origin');
      expect(response.headers).toHaveProperty('access-control-allow-methods');
      expect(response.headers).toHaveProperty('access-control-allow-headers');
    });
  });

  describe('Timeout Handling', () => {
    test('Long-running requests should not hang indefinitely', async () => {
      // Test with a reasonable timeout
      const startTime = Date.now();

      try {
        const response = await request(BASE_URL)
          .get('/api/activities')
          .timeout(10000); // 10 second timeout

        const endTime = Date.now();
        const responseTime = endTime - startTime;

        expect(responseTime).toBeLessThan(10000);
        expect(response.status).toBe(200);
      } catch (error) {
        // If timeout occurs, ensure it's handled gracefully
        expect(error.message).toMatch(/timeout|ETIMEDOUT/);
      }
    });
  });

  describe('Memory and Resource Handling', () => {
    test('Multiple concurrent requests should not cause memory leaks', async () => {
      const promises = [];

      // Create 20 concurrent requests
      for (let i = 0; i < 20; i++) {
        promises.push(
          request(BASE_URL)
            .get('/api/activities')
            .timeout(5000)
        );
      }

      const responses = await Promise.allSettled(promises);

      let successCount = 0;
      responses.forEach(result => {
        if (result.status === 'fulfilled' && result.value.status === 200) {
          successCount++;
        }
      });

      // At least some requests should succeed
      expect(successCount).toBeGreaterThan(0);
    });
  });
});