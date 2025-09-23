/**
 * Agent API Endpoints Regression Tests
 * Tests all critical agent-related API functionality
 */

const request = require('supertest');
const path = require('path');
const fs = require('fs');

describe('Agent API Endpoints Regression Tests', () => {
  let server;
  let baseUrl;

  beforeAll(async () => {
    // Set up test environment
    baseUrl = global.testConfig.apiUrl;

    // Ensure the agents directory exists for testing
    const agentsDir = path.join(process.cwd(), 'prod', '.claude', 'agents');
    if (!fs.existsSync(agentsDir)) {
      fs.mkdirSync(agentsDir, { recursive: true });
    }

    // Create a test agent file
    const testAgentContent = `# Test Agent

A test agent for regression testing purposes.

## Capabilities
- Test execution
- Data validation
- System monitoring

## Configuration
- model: sonnet
- priority: P2
- proactive: false
`;

    fs.writeFileSync(path.join(agentsDir, 'test-agent.md'), testAgentContent);
  });

  afterAll(async () => {
    // Clean up test agent file
    const testAgentPath = path.join(process.cwd(), 'prod', '.claude', 'agents', 'test-agent.md');
    if (fs.existsSync(testAgentPath)) {
      fs.unlinkSync(testAgentPath);
    }
  });

  describe('GET /api/agents', () => {
    test('should return valid agent list', async () => {
      const response = await global.testUtils.retryAsync(async () => {
        const res = await request(baseUrl).get('/agents');
        expect(res.status).toBe(200);
        return res;
      });

      expect(response.body).toBeValidApiResponse();
      expect(response.body.success).toBe(true);
      expect(Array.isArray(response.body.data)).toBe(true);
      expect(response.body.count).toBeDefined();
      expect(response.body.metadata).toBeDefined();
    });

    test('should return agents with required fields', async () => {
      const response = await request(baseUrl).get('/agents');
      expect(response.status).toBe(200);

      const agents = response.body.data;
      expect(agents.length).toBeGreaterThan(0);

      agents.forEach(agent => {
        expect(agent).toBeValidAgent();
        expect(agent.id).toBeDefined();
        expect(agent.name).toBeDefined();
        expect(agent.status).toBeDefined();
        expect(agent.description).toBeDefined();
        expect(agent.capabilities).toBeDefined();
        expect(agent.created_at).toBeDefined();
        expect(agent.updated_at).toBeDefined();
      });
    });

    test('should include performance metrics', async () => {
      const response = await request(baseUrl).get('/agents');
      expect(response.status).toBe(200);

      const agents = response.body.data;
      agents.forEach(agent => {
        if (agent.performance_metrics) {
          expect(typeof agent.performance_metrics.success_rate).toBe('number');
          expect(typeof agent.performance_metrics.average_response_time).toBe('number');
          expect(typeof agent.performance_metrics.total_tokens_used).toBe('number');
          expect(typeof agent.performance_metrics.error_count).toBe('number');
          expect(typeof agent.performance_metrics.uptime_percentage).toBe('number');

          // Validate ranges
          expect(agent.performance_metrics.success_rate).toBeGreaterThanOrEqual(0);
          expect(agent.performance_metrics.success_rate).toBeLessThanOrEqual(100);
          expect(agent.performance_metrics.average_response_time).toBeGreaterThan(0);
          expect(agent.performance_metrics.total_tokens_used).toBeGreaterThanOrEqual(0);
          expect(agent.performance_metrics.error_count).toBeGreaterThanOrEqual(0);
          expect(agent.performance_metrics.uptime_percentage).toBeGreaterThanOrEqual(0);
          expect(agent.performance_metrics.uptime_percentage).toBeLessThanOrEqual(100);
        }
      });
    });

    test('should include health status', async () => {
      const response = await request(baseUrl).get('/agents');
      expect(response.status).toBe(200);

      const agents = response.body.data;
      agents.forEach(agent => {
        if (agent.health_status) {
          expect(typeof agent.health_status.cpu_usage).toBe('number');
          expect(typeof agent.health_status.memory_usage).toBe('number');
          expect(typeof agent.health_status.response_time).toBe('number');
          expect(typeof agent.health_status.last_heartbeat).toBe('string');
          expect(typeof agent.health_status.status).toBe('string');
          expect(typeof agent.health_status.active_tasks).toBe('number');

          // Validate status values
          expect(['healthy', 'warning', 'critical', 'offline']).toContain(agent.health_status.status);

          // Validate ranges
          expect(agent.health_status.cpu_usage).toBeGreaterThanOrEqual(0);
          expect(agent.health_status.cpu_usage).toBeLessThanOrEqual(100);
          expect(agent.health_status.memory_usage).toBeGreaterThanOrEqual(0);
          expect(agent.health_status.memory_usage).toBeLessThanOrEqual(100);
          expect(agent.health_status.response_time).toBeGreaterThan(0);
          expect(agent.health_status.active_tasks).toBeGreaterThanOrEqual(0);
        }
      });
    });

    test('should return proper metadata', async () => {
      const response = await request(baseUrl).get('/agents');
      expect(response.status).toBe(200);

      const metadata = response.body.metadata;
      expect(metadata.total_count).toBe(response.body.data.length);
      expect(metadata.data_source).toBe('real_agent_files');
      expect(metadata.file_based).toBe(true);
      expect(metadata.no_fake_data).toBe(true);
      expect(metadata.authentic_source).toBe(true);
      expect(metadata.discovery_time).toBeDefined();
      expect(metadata.agents_directory).toBeDefined();
    });

    test('should handle different priority levels', async () => {
      const response = await request(baseUrl).get('/agents');
      expect(response.status).toBe(200);

      const agents = response.body.data;
      const priorities = agents.map(agent => agent.priority).filter(Boolean);

      priorities.forEach(priority => {
        expect(['P0', 'P1', 'P2', 'P3', 'P4']).toContain(priority);
      });
    });

    test('should validate agent status values', async () => {
      const response = await request(baseUrl).get('/agents');
      expect(response.status).toBe(200);

      const agents = response.body.data;
      const validStatuses = ['active', 'idle', 'busy', 'offline', 'inactive'];

      agents.forEach(agent => {
        expect(validStatuses).toContain(agent.status);
      });
    });

    test('should return consistent data structure', async () => {
      // Make multiple requests to ensure consistency
      const responses = await Promise.all([
        request(baseUrl).get('/agents'),
        request(baseUrl).get('/agents'),
        request(baseUrl).get('/agents')
      ]);

      responses.forEach(response => {
        expect(response.status).toBe(200);
        expect(response.body).toBeValidApiResponse();
      });

      // Data should be consistent (same agent IDs)
      const firstAgentIds = responses[0].body.data.map(a => a.id).sort();
      const secondAgentIds = responses[1].body.data.map(a => a.id).sort();
      const thirdAgentIds = responses[2].body.data.map(a => a.id).sort();

      expect(firstAgentIds).toEqual(secondAgentIds);
      expect(secondAgentIds).toEqual(thirdAgentIds);
    });

    test('should handle CORS properly', async () => {
      const response = await request(baseUrl)
        .options('/agents')
        .set('Origin', 'http://localhost:3000')
        .set('Access-Control-Request-Method', 'GET');

      expect(response.status).toBe(200);
      expect(response.headers['access-control-allow-origin']).toBeDefined();
      expect(response.headers['access-control-allow-methods']).toBeDefined();
    });

    test('should respond within acceptable time', async () => {
      const startTime = Date.now();
      const response = await request(baseUrl).get('/agents');
      const endTime = Date.now();

      expect(response.status).toBe(200);
      expect(endTime - startTime).toBeLessThan(5000); // Should respond within 5 seconds
    });
  });

  describe('Error Handling', () => {
    test('should handle invalid HTTP methods', async () => {
      const response = await request(baseUrl)
        .post('/agents')
        .send({ test: 'data' });

      expect(response.status).toBe(405);
      expect(response.body.success).toBe(false);
      expect(response.body.error).toContain('Method POST not allowed');
    });

    test('should handle malformed requests gracefully', async () => {
      const response = await request(baseUrl)
        .get('/agents')
        .set('Content-Type', 'application/json')
        .set('Accept', 'text/plain'); // Unusual accept header

      expect(response.status).toBe(200);
      expect(response.body).toBeValidApiResponse();
    });

    test('should handle large request headers', async () => {
      const largeHeader = 'x'.repeat(1000);

      const response = await request(baseUrl)
        .get('/agents')
        .set('X-Test-Header', largeHeader);

      expect(response.status).toBe(200);
      expect(response.body).toBeValidApiResponse();
    });
  });

  describe('Data Validation', () => {
    test('should not return sensitive information', async () => {
      const response = await request(baseUrl).get('/agents');
      expect(response.status).toBe(200);

      const agents = response.body.data;
      agents.forEach(agent => {
        // Ensure no sensitive data is exposed
        expect(agent.file_path).toBeUndefined(); // File paths should not be exposed
        expect(agent.system_prompt).toBeUndefined(); // Full system prompts should not be exposed
        expect(agent.api_key).toBeUndefined();
        expect(agent.secret).toBeUndefined();
        expect(agent.token).toBeUndefined();
        expect(agent.password).toBeUndefined();
      });
    });

    test('should validate agent file parsing', async () => {
      const response = await request(baseUrl).get('/agents');
      expect(response.status).toBe(200);

      const agents = response.body.data;
      const testAgent = agents.find(agent => agent.id === 'test-agent');

      if (testAgent) {
        expect(testAgent.name).toBe('Test Agent');
        expect(testAgent.description).toContain('test agent');
        expect(testAgent.capabilities).toContain('test-capability');
        expect(testAgent.source).toBe('real_agent_files');
      }
    });

    test('should handle Unicode and special characters', async () => {
      const response = await request(baseUrl).get('/agents');
      expect(response.status).toBe(200);

      const agents = response.body.data;
      agents.forEach(agent => {
        // Ensure proper encoding of text fields
        if (agent.name) {
          expect(typeof agent.name).toBe('string');
          expect(agent.name.length).toBeGreaterThan(0);
        }
        if (agent.description) {
          expect(typeof agent.description).toBe('string');
          expect(agent.description.length).toBeGreaterThan(0);
        }
      });
    });

    test('should validate timestamp formats', async () => {
      const response = await request(baseUrl).get('/agents');
      expect(response.status).toBe(200);

      const agents = response.body.data;
      agents.forEach(agent => {
        if (agent.created_at) {
          expect(new Date(agent.created_at).toISOString()).toBe(agent.created_at);
        }
        if (agent.updated_at) {
          expect(new Date(agent.updated_at).toISOString()).toBe(agent.updated_at);
        }
        if (agent.last_used) {
          expect(new Date(agent.last_used).toISOString()).toBe(agent.last_used);
        }
      });
    });

    test('should maintain data integrity across requests', async () => {
      const response1 = await request(baseUrl).get('/agents');
      await global.testUtils.delay(100);
      const response2 = await request(baseUrl).get('/agents');

      expect(response1.status).toBe(200);
      expect(response2.status).toBe(200);

      // Agent data should be stable (same IDs, same names)
      const agents1 = response1.body.data;
      const agents2 = response2.body.data;

      expect(agents1.length).toBe(agents2.length);

      agents1.forEach(agent1 => {
        const agent2 = agents2.find(a => a.id === agent1.id);
        expect(agent2).toBeDefined();
        expect(agent2.name).toBe(agent1.name);
        expect(agent2.description).toBe(agent1.description);
      });
    });
  });

  describe('Performance Tests', () => {
    test('should handle concurrent requests', async () => {
      const concurrentRequests = 5;
      const requests = Array.from({ length: concurrentRequests }, () =>
        request(baseUrl).get('/agents')
      );

      const responses = await Promise.all(requests);

      responses.forEach(response => {
        expect(response.status).toBe(200);
        expect(response.body).toBeValidApiResponse();
      });

      // All responses should have the same data
      const firstResponseData = responses[0].body.data;
      responses.slice(1).forEach(response => {
        expect(response.body.data.length).toBe(firstResponseData.length);
      });
    });

    test('should maintain performance under load', async () => {
      const numberOfRequests = 10;
      const requestTimes = [];

      for (let i = 0; i < numberOfRequests; i++) {
        const startTime = Date.now();
        const response = await request(baseUrl).get('/agents');
        const endTime = Date.now();

        expect(response.status).toBe(200);
        requestTimes.push(endTime - startTime);
      }

      // Calculate average response time
      const averageTime = requestTimes.reduce((sum, time) => sum + time, 0) / requestTimes.length;
      expect(averageTime).toBeLessThan(2000); // Average should be under 2 seconds

      // No request should take excessively long
      requestTimes.forEach(time => {
        expect(time).toBeLessThan(5000); // Individual requests under 5 seconds
      });
    });
  });
});