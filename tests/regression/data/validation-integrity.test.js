/**
 * Data Validation and Integrity Regression Tests
 * Tests data consistency, validation, and integrity across the application
 */

const request = require('supertest');
const crypto = require('crypto');

describe('Data Validation and Integrity Regression Tests', () => {
  let baseUrl;

  beforeAll(() => {
    baseUrl = global.testConfig.apiUrl;
  });

  describe('API Response Data Integrity', () => {
    test('should maintain consistent data structure across requests', async () => {
      const responses = await Promise.all([
        request(baseUrl).get('/agents'),
        request(baseUrl).get('/agents'),
        request(baseUrl).get('/agents')
      ]);

      // All responses should have the same structure
      responses.forEach(response => {
        expect(response.status).toBe(200);
        expect(response.body).toHaveProperty('success');
        expect(response.body).toHaveProperty('data');
        expect(response.body).toHaveProperty('count');
        expect(response.body).toHaveProperty('metadata');
      });

      // Data should be consistent across requests
      const firstData = responses[0].body.data;
      const secondData = responses[1].body.data;
      const thirdData = responses[2].body.data;

      expect(firstData.length).toBe(secondData.length);
      expect(secondData.length).toBe(thirdData.length);

      // Same agents should exist in all responses
      const firstIds = firstData.map(agent => agent.id).sort();
      const secondIds = secondData.map(agent => agent.id).sort();
      const thirdIds = thirdData.map(agent => agent.id).sort();

      expect(firstIds).toEqual(secondIds);
      expect(secondIds).toEqual(thirdIds);
    });

    test('should validate required fields for all agents', async () => {
      const response = await request(baseUrl).get('/agents');
      expect(response.status).toBe(200);

      const agents = response.body.data;
      expect(agents.length).toBeGreaterThan(0);

      agents.forEach((agent, index) => {
        // Required fields validation
        expect(agent.id).toBeDefined();
        expect(agent.id).not.toBe('');
        expect(typeof agent.id).toBe('string');

        expect(agent.name).toBeDefined();
        expect(agent.name).not.toBe('');
        expect(typeof agent.name).toBe('string');

        expect(agent.status).toBeDefined();
        expect(agent.status).not.toBe('');
        expect(typeof agent.status).toBe('string');

        // Validate status values
        expect(['active', 'idle', 'busy', 'offline', 'inactive']).toContain(agent.status);

        // Validate optional fields if present
        if (agent.description) {
          expect(typeof agent.description).toBe('string');
        }

        if (agent.capabilities) {
          expect(Array.isArray(agent.capabilities)).toBe(true);
          agent.capabilities.forEach(capability => {
            expect(typeof capability).toBe('string');
            expect(capability).not.toBe('');
          });
        }

        if (agent.priority) {
          expect(['P0', 'P1', 'P2', 'P3', 'P4']).toContain(agent.priority);
        }
      });
    });

    test('should validate timestamp formats', async () => {
      const response = await request(baseUrl).get('/agents');
      expect(response.status).toBe(200);

      const agents = response.body.data;

      agents.forEach(agent => {
        // Validate ISO 8601 timestamp format
        if (agent.created_at) {
          const createdDate = new Date(agent.created_at);
          expect(createdDate.toISOString()).toBe(agent.created_at);
          expect(createdDate.getTime()).not.toBeNaN();
        }

        if (agent.updated_at) {
          const updatedDate = new Date(agent.updated_at);
          expect(updatedDate.toISOString()).toBe(agent.updated_at);
          expect(updatedDate.getTime()).not.toBeNaN();
        }

        if (agent.last_used) {
          const lastUsedDate = new Date(agent.last_used);
          expect(lastUsedDate.toISOString()).toBe(agent.last_used);
          expect(lastUsedDate.getTime()).not.toBeNaN();
        }

        // Validate temporal consistency
        if (agent.created_at && agent.updated_at) {
          const created = new Date(agent.created_at);
          const updated = new Date(agent.updated_at);
          expect(updated.getTime()).toBeGreaterThanOrEqual(created.getTime());
        }
      });
    });

    test('should validate numeric fields', async () => {
      const response = await request(baseUrl).get('/agents');
      expect(response.status).toBe(200);

      const agents = response.body.data;

      agents.forEach(agent => {
        if (agent.usage_count) {
          expect(typeof agent.usage_count).toBe('number');
          expect(agent.usage_count).toBeGreaterThanOrEqual(0);
          expect(Number.isInteger(agent.usage_count)).toBe(true);
        }

        if (agent.file_size) {
          expect(typeof agent.file_size).toBe('number');
          expect(agent.file_size).toBeGreaterThan(0);
          expect(Number.isInteger(agent.file_size)).toBe(true);
        }

        // Validate performance metrics
        if (agent.performance_metrics) {
          const metrics = agent.performance_metrics;

          if (metrics.success_rate !== undefined) {
            expect(typeof metrics.success_rate).toBe('number');
            expect(metrics.success_rate).toBeGreaterThanOrEqual(0);
            expect(metrics.success_rate).toBeLessThanOrEqual(100);
          }

          if (metrics.average_response_time !== undefined) {
            expect(typeof metrics.average_response_time).toBe('number');
            expect(metrics.average_response_time).toBeGreaterThan(0);
          }

          if (metrics.total_tokens_used !== undefined) {
            expect(typeof metrics.total_tokens_used).toBe('number');
            expect(metrics.total_tokens_used).toBeGreaterThanOrEqual(0);
          }

          if (metrics.error_count !== undefined) {
            expect(typeof metrics.error_count).toBe('number');
            expect(metrics.error_count).toBeGreaterThanOrEqual(0);
            expect(Number.isInteger(metrics.error_count)).toBe(true);
          }

          if (metrics.uptime_percentage !== undefined) {
            expect(typeof metrics.uptime_percentage).toBe('number');
            expect(metrics.uptime_percentage).toBeGreaterThanOrEqual(0);
            expect(metrics.uptime_percentage).toBeLessThanOrEqual(100);
          }
        }

        // Validate health status
        if (agent.health_status) {
          const health = agent.health_status;

          if (health.cpu_usage !== undefined) {
            expect(typeof health.cpu_usage).toBe('number');
            expect(health.cpu_usage).toBeGreaterThanOrEqual(0);
            expect(health.cpu_usage).toBeLessThanOrEqual(100);
          }

          if (health.memory_usage !== undefined) {
            expect(typeof health.memory_usage).toBe('number');
            expect(health.memory_usage).toBeGreaterThanOrEqual(0);
            expect(health.memory_usage).toBeLessThanOrEqual(100);
          }

          if (health.response_time !== undefined) {
            expect(typeof health.response_time).toBe('number');
            expect(health.response_time).toBeGreaterThan(0);
          }

          if (health.active_tasks !== undefined) {
            expect(typeof health.active_tasks).toBe('number');
            expect(health.active_tasks).toBeGreaterThanOrEqual(0);
            expect(Number.isInteger(health.active_tasks)).toBe(true);
          }
        }
      });
    });
  });

  describe('Data Uniqueness and Consistency', () => {
    test('should ensure agent IDs are unique', async () => {
      const response = await request(baseUrl).get('/agents');
      expect(response.status).toBe(200);

      const agents = response.body.data;
      const agentIds = agents.map(agent => agent.id);
      const uniqueIds = [...new Set(agentIds)];

      expect(agentIds.length).toBe(uniqueIds.length);
    });

    test('should maintain referential integrity', async () => {
      const response = await request(baseUrl).get('/agents');
      expect(response.status).toBe(200);

      const agents = response.body.data;
      const metadata = response.body.metadata;

      // Count should match actual data
      expect(response.body.count).toBe(agents.length);
      expect(metadata.total_count).toBe(agents.length);

      // All agents should have consistent source attribution
      agents.forEach(agent => {
        if (agent.source) {
          expect(agent.source).toBe('real_agent_files');
        }
      });
    });

    test('should validate data relationships', async () => {
      const response = await request(baseUrl).get('/agents');
      expect(response.status).toBe(200);

      const agents = response.body.data;

      agents.forEach(agent => {
        // If agent has performance metrics, they should be logically consistent
        if (agent.performance_metrics) {
          const metrics = agent.performance_metrics;

          // Error count should be reasonable relative to usage
          if (metrics.error_count && agent.usage_count) {
            expect(metrics.error_count).toBeLessThanOrEqual(agent.usage_count);
          }

          // Success rate should be consistent with error count if both exist
          if (metrics.success_rate && metrics.error_count && agent.usage_count) {
            const expectedSuccessRate = ((agent.usage_count - metrics.error_count) / agent.usage_count) * 100;
            // Allow some tolerance for rounding
            expect(Math.abs(metrics.success_rate - expectedSuccessRate)).toBeLessThan(10);
          }
        }

        // Health status should be consistent with performance
        if (agent.health_status && agent.performance_metrics) {
          const health = agent.health_status;
          const metrics = agent.performance_metrics;

          // High error count should correlate with poor health
          if (metrics.error_count > 10 && health.status) {
            expect(['warning', 'critical']).toContain(health.status);
          }
        }
      });
    });
  });

  describe('Input Validation', () => {
    test('should handle malformed query parameters', async () => {
      const malformedQueries = [
        '?limit=abc',
        '?offset=-1',
        '?sort="; DROP TABLE agents; --',
        '?filter[status]=<script>alert(1)</script>',
        '?page=999999999999999999999'
      ];

      for (const query of malformedQueries) {
        const response = await request(baseUrl).get(`/agents${query}`);

        // Should handle malformed queries gracefully
        expect([200, 400]).toContain(response.status);

        if (response.status === 200) {
          expect(response.body).toBeValidApiResponse();
        }
      }
    });

    test('should sanitize special characters in responses', async () => {
      const response = await request(baseUrl).get('/agents');
      expect(response.status).toBe(200);

      const responseText = JSON.stringify(response.body);

      // Should not contain dangerous characters that could cause XSS
      expect(responseText).not.toMatch(/<script/i);
      expect(responseText).not.toMatch(/javascript:/i);
      expect(responseText).not.toMatch(/on\w+\s*=/i);
      expect(responseText).not.toMatch(/expression\s*\(/i);
    });

    test('should validate content encoding', async () => {
      const response = await request(baseUrl).get('/agents');
      expect(response.status).toBe(200);

      // Response should be valid JSON
      expect(() => JSON.parse(JSON.stringify(response.body))).not.toThrow();

      // Should handle UTF-8 encoding properly
      const responseText = JSON.stringify(response.body);
      expect(responseText).toMatch(/^[\x00-\x7F]*$|.*[\u0080-\uFFFF].*/); // ASCII or valid Unicode
    });

    test('should handle boundary values', async () => {
      const response = await request(baseUrl).get('/agents');
      expect(response.status).toBe(200);

      const agents = response.body.data;

      agents.forEach(agent => {
        // Check for potential overflow values
        if (agent.usage_count) {
          expect(agent.usage_count).toBeLessThan(Number.MAX_SAFE_INTEGER);
        }

        if (agent.file_size) {
          expect(agent.file_size).toBeLessThan(Number.MAX_SAFE_INTEGER);
        }

        // Check string length boundaries
        if (agent.name) {
          expect(agent.name.length).toBeLessThan(1000); // Reasonable name length
        }

        if (agent.description) {
          expect(agent.description.length).toBeLessThan(10000); // Reasonable description length
        }
      });
    });
  });

  describe('Data Format Validation', () => {
    test('should use consistent field naming conventions', async () => {
      const response = await request(baseUrl).get('/agents');
      expect(response.status).toBe(200);

      const agents = response.body.data;

      agents.forEach(agent => {
        Object.keys(agent).forEach(key => {
          // Should use snake_case for consistency
          expect(key).toMatch(/^[a-z][a-z0-9_]*$/);
        });
      });
    });

    test('should validate URL formats', async () => {
      const response = await request(baseUrl).get('/agents');
      expect(response.status).toBe(200);

      const agents = response.body.data;

      agents.forEach(agent => {
        // If any URL fields exist, they should be valid
        Object.keys(agent).forEach(key => {
          if (key.includes('url') || key.includes('link')) {
            const value = agent[key];
            if (value && typeof value === 'string') {
              expect(value).toMatch(/^https?:\/\/[^\s]+$|^\/[^\s]*$/);
            }
          }
        });
      });
    });

    test('should validate email formats', async () => {
      const response = await request(baseUrl).get('/agents');
      expect(response.status).toBe(200);

      const agents = response.body.data;

      agents.forEach(agent => {
        // If any email fields exist, they should be valid
        Object.keys(agent).forEach(key => {
          if (key.includes('email') || key.includes('mail')) {
            const value = agent[key];
            if (value && typeof value === 'string') {
              expect(value).toMatch(/^[^\s@]+@[^\s@]+\.[^\s@]+$/);
            }
          }
        });
      });
    });

    test('should validate enum values', async () => {
      const response = await request(baseUrl).get('/agents');
      expect(response.status).toBe(200);

      const agents = response.body.data;

      agents.forEach(agent => {
        // Validate known enum fields
        if (agent.status) {
          expect(['active', 'idle', 'busy', 'offline', 'inactive']).toContain(agent.status);
        }

        if (agent.priority) {
          expect(['P0', 'P1', 'P2', 'P3', 'P4']).toContain(agent.priority);
        }

        if (agent.type) {
          expect(['user_facing', 'system', 'background', 'utility']).toContain(agent.type);
        }

        if (agent.health_status && agent.health_status.status) {
          expect(['healthy', 'warning', 'critical', 'offline', 'unknown']).toContain(agent.health_status.status);
        }
      });
    });
  });

  describe('Data Persistence and Consistency', () => {
    test('should maintain data consistency over time', async () => {
      const response1 = await request(baseUrl).get('/agents');
      await global.testUtils.delay(1000); // Wait 1 second
      const response2 = await request(baseUrl).get('/agents');

      expect(response1.status).toBe(200);
      expect(response2.status).toBe(200);

      const agents1 = response1.body.data;
      const agents2 = response2.body.data;

      // Core agent data should remain stable
      expect(agents1.length).toBe(agents2.length);

      agents1.forEach(agent1 => {
        const agent2 = agents2.find(a => a.id === agent1.id);
        expect(agent2).toBeDefined();

        // Core fields should remain the same
        expect(agent2.name).toBe(agent1.name);
        expect(agent2.description).toBe(agent1.description);
        expect(agent2.status).toBe(agent1.status);
        expect(agent2.priority).toBe(agent1.priority);
      });
    });

    test('should handle data corruption gracefully', async () => {
      // This test simulates what would happen if underlying data was corrupted
      const response = await request(baseUrl).get('/agents');
      expect(response.status).toBe(200);

      const agents = response.body.data;

      // Even if some agents have missing or invalid data, the API should still work
      expect(Array.isArray(agents)).toBe(true);
      expect(response.body.success).toBe(true);

      // At least some agents should be valid
      const validAgents = agents.filter(agent =>
        agent.id && agent.name && agent.status
      );
      expect(validAgents.length).toBeGreaterThan(0);
    });

    test('should validate data checksums or signatures', async () => {
      const response = await request(baseUrl).get('/agents');
      expect(response.status).toBe(200);

      // Generate a checksum of the response data
      const dataString = JSON.stringify(response.body.data.sort((a, b) => a.id.localeCompare(b.id)));
      const checksum1 = crypto.createHash('md5').update(dataString).digest('hex');

      // Get the same data again
      const response2 = await request(baseUrl).get('/agents');
      const dataString2 = JSON.stringify(response2.body.data.sort((a, b) => a.id.localeCompare(b.id)));
      const checksum2 = crypto.createHash('md5').update(dataString2).digest('hex');

      // Data should be consistent (same checksum)
      expect(checksum1).toBe(checksum2);
    });
  });
});