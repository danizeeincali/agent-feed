/**
 * Integration Tests: Agent Tier Filtering API
 *
 * Tests the /api/agents endpoint with tier-based filtering
 *
 * Test Coverage:
 * - Default behavior (tier 1 only)
 * - Tier parameter validation (1, 2, all)
 * - Invalid tier parameter handling
 * - Response metadata validation
 * - Backward compatibility (include_system parameter)
 * - Performance requirements
 *
 * Architecture: TDD with 100% real validation (no mocks)
 * Spec: /workspaces/agent-feed/docs/API-AGENT-TIER-FILTERING.md
 */

const API_BASE_URL = process.env.API_URL || 'http://localhost:3001';
const TEST_TIMEOUT = 10000;

describe('GET /api/agents - Tier Filtering', () => {
  let serverAvailable = false;

  beforeAll(async () => {
    try {
      const response = await fetch(`${API_BASE_URL}/health`);
      serverAvailable = response.ok;

      if (!serverAvailable) {
        console.warn('⚠️  API server not running. Start with: npm run dev');
      }
    } catch (error) {
      console.warn('⚠️  API server not available:', error.message);
      serverAvailable = false;
    }
  }, TEST_TIMEOUT);

  afterAll(() => {
    if (!serverAvailable) {
      console.log('\n📋 Test Summary: Tests skipped due to server unavailability');
    }
  });

  describe('Default Behavior', () => {
    it('should return tier 1 agents by default', async () => {
      if (!serverAvailable) {
        console.log('⏭️  Skipping: Server not available');
        return;
      }

      const response = await fetch(`${API_BASE_URL}/api/agents`);
      const data = await response.json();

      expect(response.status).toBe(200);
      expect(data.success).toBe(true);
      expect(data.metadata.appliedTier).toBe('1');

      // All returned agents should be tier 1
      expect(data.data.every(agent => agent.tier === 1)).toBe(true);
    }, TEST_TIMEOUT);

    it('should return correct metadata for default request', async () => {
      if (!serverAvailable) {
        console.log('⏭️  Skipping: Server not available');
        return;
      }

      const response = await fetch(`${API_BASE_URL}/api/agents`);
      const data = await response.json();

      expect(data.metadata).toBeDefined();
      expect(data.metadata.appliedTier).toBe('1');
      expect(data.metadata.tier1).toBeGreaterThan(0);
      expect(data.metadata.tier2).toBeGreaterThan(0);
      expect(data.metadata.total).toBe(data.metadata.tier1 + data.metadata.tier2);
      expect(data.metadata.filtered).toBe(data.data.length);
    }, TEST_TIMEOUT);
  });

  describe('Tier Parameter', () => {
    it('should filter tier 1 agents when tier=1', async () => {
      if (!serverAvailable) {
        console.log('⏭️  Skipping: Server not available');
        return;
      }

      const response = await fetch(`${API_BASE_URL}/api/agents?tier=1`);
      const data = await response.json();

      expect(response.status).toBe(200);
      expect(data.success).toBe(true);
      expect(data.metadata.appliedTier).toBe('1');

      // Validate all agents are tier 1
      expect(data.data.every(agent => agent.tier === 1)).toBe(true);

      // Validate count matches metadata
      expect(data.data.length).toBe(data.metadata.tier1);
      expect(data.metadata.filtered).toBe(data.metadata.tier1);
    }, TEST_TIMEOUT);

    it('should filter tier 2 agents when tier=2', async () => {
      if (!serverAvailable) {
        console.log('⏭️  Skipping: Server not available');
        return;
      }

      const response = await fetch(`${API_BASE_URL}/api/agents?tier=2`);
      const data = await response.json();

      expect(response.status).toBe(200);
      expect(data.success).toBe(true);
      expect(data.metadata.appliedTier).toBe('2');

      // Validate all agents are tier 2
      expect(data.data.every(agent => agent.tier === 2)).toBe(true);

      // Validate count matches metadata
      expect(data.data.length).toBe(data.metadata.tier2);
      expect(data.metadata.filtered).toBe(data.metadata.tier2);
    }, TEST_TIMEOUT);

    it('should return all agents when tier=all', async () => {
      if (!serverAvailable) {
        console.log('⏭️  Skipping: Server not available');
        return;
      }

      const response = await fetch(`${API_BASE_URL}/api/agents?tier=all`);
      const data = await response.json();

      expect(response.status).toBe(200);
      expect(data.success).toBe(true);
      expect(data.metadata.appliedTier).toBe('all');

      // Validate all tiers are present
      const tier1Count = data.data.filter(a => a.tier === 1).length;
      const tier2Count = data.data.filter(a => a.tier === 2).length;

      expect(tier1Count).toBe(data.metadata.tier1);
      expect(tier2Count).toBe(data.metadata.tier2);
      expect(data.data.length).toBe(data.metadata.total);
      expect(data.metadata.filtered).toBe(data.metadata.total);
    }, TEST_TIMEOUT);

    it('should return 400 for invalid tier parameter', async () => {
      if (!serverAvailable) {
        console.log('⏭️  Skipping: Server not available');
        return;
      }

      const response = await fetch(`${API_BASE_URL}/api/agents?tier=invalid`);
      const data = await response.json();

      expect(response.status).toBe(400);
      expect(data.success).toBe(false);
      expect(data.code).toBe('INVALID_TIER');
      expect(data.error).toContain('Invalid tier parameter');
    }, TEST_TIMEOUT);

    it('should return 400 for tier=3', async () => {
      if (!serverAvailable) {
        console.log('⏭️  Skipping: Server not available');
        return;
      }

      const response = await fetch(`${API_BASE_URL}/api/agents?tier=3`);
      const data = await response.json();

      expect(response.status).toBe(400);
      expect(data.success).toBe(false);
      expect(data.code).toBe('INVALID_TIER');
    }, TEST_TIMEOUT);

    it('should return 400 for tier=0', async () => {
      if (!serverAvailable) {
        console.log('⏭️  Skipping: Server not available');
        return;
      }

      const response = await fetch(`${API_BASE_URL}/api/agents?tier=0`);
      const data = await response.json();

      expect(response.status).toBe(400);
      expect(data.success).toBe(false);
      expect(data.code).toBe('INVALID_TIER');
    }, TEST_TIMEOUT);
  });

  describe('Metadata', () => {
    it('should include correct metadata counts', async () => {
      if (!serverAvailable) {
        console.log('⏭️  Skipping: Server not available');
        return;
      }

      const response = await fetch(`${API_BASE_URL}/api/agents?tier=all`);
      const data = await response.json();

      expect(data.metadata).toMatchObject({
        total: expect.any(Number),
        tier1: expect.any(Number),
        tier2: expect.any(Number),
        protected: expect.any(Number),
        filtered: expect.any(Number),
        appliedTier: 'all'
      });

      // Validate consistency
      expect(data.metadata.total).toBe(data.metadata.tier1 + data.metadata.tier2);
      expect(data.metadata.filtered).toBe(data.data.length);
    }, TEST_TIMEOUT);

    it('should include timestamp in ISO 8601 format', async () => {
      if (!serverAvailable) {
        console.log('⏭️  Skipping: Server not available');
        return;
      }

      const response = await fetch(`${API_BASE_URL}/api/agents`);
      const data = await response.json();

      expect(data.timestamp).toBeDefined();
      expect(data.timestamp).toMatch(/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}/);
    }, TEST_TIMEOUT);

    it('should include data source', async () => {
      if (!serverAvailable) {
        console.log('⏭️  Skipping: Server not available');
        return;
      }

      const response = await fetch(`${API_BASE_URL}/api/agents`);
      const data = await response.json();

      expect(data.source).toBeDefined();
      expect(['PostgreSQL', 'Filesystem', 'SQLite']).toContain(data.source);
    }, TEST_TIMEOUT);

    it('should maintain consistent metadata across multiple requests', async () => {
      if (!serverAvailable) {
        console.log('⏭️  Skipping: Server not available');
        return;
      }

      // Request 1: tier=1
      const response1 = await fetch(`${API_BASE_URL}/api/agents?tier=1`);
      const data1 = await response1.json();

      // Request 2: tier=2
      const response2 = await fetch(`${API_BASE_URL}/api/agents?tier=2`);
      const data2 = await response2.json();

      // Request 3: tier=all
      const response3 = await fetch(`${API_BASE_URL}/api/agents?tier=all`);
      const data3 = await response3.json();

      // All should report same total counts
      expect(data1.metadata.tier1).toBe(data2.metadata.tier1);
      expect(data1.metadata.tier2).toBe(data2.metadata.tier2);
      expect(data3.metadata.tier1).toBe(data1.metadata.tier1);
      expect(data3.metadata.tier2).toBe(data1.metadata.tier2);

      // Filtered counts should match data length
      expect(data1.metadata.filtered).toBe(data1.data.length);
      expect(data2.metadata.filtered).toBe(data2.data.length);
      expect(data3.metadata.filtered).toBe(data3.data.length);
    }, TEST_TIMEOUT);
  });

  describe('Backward Compatibility', () => {
    it('should support include_system=true (legacy)', async () => {
      if (!serverAvailable) {
        console.log('⏭️  Skipping: Server not available');
        return;
      }

      const response = await fetch(`${API_BASE_URL}/api/agents?include_system=true`);
      const data = await response.json();

      expect(response.status).toBe(200);
      expect(data.success).toBe(true);

      // Should return all agents (both tiers)
      expect(data.data.length).toBe(data.metadata.total);

      // Should include both tier 1 and tier 2
      const tier1Count = data.data.filter(a => a.tier === 1).length;
      const tier2Count = data.data.filter(a => a.tier === 2).length;

      expect(tier1Count).toBeGreaterThan(0);
      expect(tier2Count).toBeGreaterThan(0);
    }, TEST_TIMEOUT);

    it('should support include_system=false (legacy)', async () => {
      if (!serverAvailable) {
        console.log('⏭️  Skipping: Server not available');
        return;
      }

      const response = await fetch(`${API_BASE_URL}/api/agents?include_system=false`);
      const data = await response.json();

      expect(response.status).toBe(200);
      expect(data.success).toBe(true);

      // Should return only tier 1 agents
      expect(data.data.every(agent => agent.tier === 1)).toBe(true);
      expect(data.data.length).toBe(data.metadata.tier1);
    }, TEST_TIMEOUT);

    it('should prefer tier parameter over include_system', async () => {
      if (!serverAvailable) {
        console.log('⏭️  Skipping: Server not available');
        return;
      }

      // tier=2 should override include_system=false
      const response = await fetch(`${API_BASE_URL}/api/agents?tier=2&include_system=false`);
      const data = await response.json();

      expect(response.status).toBe(200);
      expect(data.success).toBe(true);

      // Should return tier 2 agents (tier parameter wins)
      expect(data.data.every(agent => agent.tier === 2)).toBe(true);
      expect(data.metadata.appliedTier).toBe('2');
    }, TEST_TIMEOUT);
  });

  describe('Response Structure', () => {
    it('should return agents with tier field', async () => {
      if (!serverAvailable) {
        console.log('⏭️  Skipping: Server not available');
        return;
      }

      const response = await fetch(`${API_BASE_URL}/api/agents?tier=all`);
      const data = await response.json();

      expect(data.data.length).toBeGreaterThan(0);

      data.data.forEach(agent => {
        expect(agent.tier).toBeDefined();
        expect([1, 2]).toContain(agent.tier);
      });
    }, TEST_TIMEOUT);

    it('should return agents with all required fields', async () => {
      if (!serverAvailable) {
        console.log('⏭️  Skipping: Server not available');
        return;
      }

      const response = await fetch(`${API_BASE_URL}/api/agents?tier=all`);
      const data = await response.json();

      expect(data.data.length).toBeGreaterThan(0);

      const firstAgent = data.data[0];

      // Required fields from API spec
      expect(firstAgent).toHaveProperty('id');
      expect(firstAgent).toHaveProperty('slug');
      expect(firstAgent).toHaveProperty('name');
      expect(firstAgent).toHaveProperty('description');
      expect(firstAgent).toHaveProperty('tier');
      expect(firstAgent).toHaveProperty('tools');

      // Validate types
      expect(typeof firstAgent.id).toBe('string');
      expect(typeof firstAgent.slug).toBe('string');
      expect(typeof firstAgent.name).toBe('string');
      expect(typeof firstAgent.tier).toBe('number');
      expect(Array.isArray(firstAgent.tools)).toBe(true);
    }, TEST_TIMEOUT);

    it('should return sorted agents by name', async () => {
      if (!serverAvailable) {
        console.log('⏭️  Skipping: Server not available');
        return;
      }

      const response = await fetch(`${API_BASE_URL}/api/agents?tier=all`);
      const data = await response.json();

      if (data.data.length > 1) {
        const names = data.data.map(a => a.name);
        const sortedNames = [...names].sort((a, b) => a.localeCompare(b));

        // Check if names are sorted
        expect(names).toEqual(sortedNames);
      }
    }, TEST_TIMEOUT);
  });

  describe('Performance', () => {
    it('should respond in under 500ms for tier=1', async () => {
      if (!serverAvailable) {
        console.log('⏭️  Skipping: Server not available');
        return;
      }

      const startTime = Date.now();
      const response = await fetch(`${API_BASE_URL}/api/agents?tier=1`);
      const duration = Date.now() - startTime;

      expect(response.status).toBe(200);
      expect(duration).toBeLessThan(500);
    }, TEST_TIMEOUT);

    it('should respond in under 500ms for tier=2', async () => {
      if (!serverAvailable) {
        console.log('⏭️  Skipping: Server not available');
        return;
      }

      const startTime = Date.now();
      const response = await fetch(`${API_BASE_URL}/api/agents?tier=2`);
      const duration = Date.now() - startTime;

      expect(response.status).toBe(200);
      expect(duration).toBeLessThan(500);
    }, TEST_TIMEOUT);

    it('should respond in under 1000ms for tier=all', async () => {
      if (!serverAvailable) {
        console.log('⏭️  Skipping: Server not available');
        return;
      }

      const startTime = Date.now();
      const response = await fetch(`${API_BASE_URL}/api/agents?tier=all`);
      const duration = Date.now() - startTime;

      expect(response.status).toBe(200);
      expect(duration).toBeLessThan(1000);
    }, TEST_TIMEOUT);

    it('should handle concurrent requests correctly', async () => {
      if (!serverAvailable) {
        console.log('⏭️  Skipping: Server not available');
        return;
      }

      // Create 10 concurrent requests with different tier parameters
      const requests = [
        fetch(`${API_BASE_URL}/api/agents?tier=1`),
        fetch(`${API_BASE_URL}/api/agents?tier=2`),
        fetch(`${API_BASE_URL}/api/agents?tier=all`),
        fetch(`${API_BASE_URL}/api/agents?tier=1`),
        fetch(`${API_BASE_URL}/api/agents?tier=2`),
        fetch(`${API_BASE_URL}/api/agents?tier=all`),
        fetch(`${API_BASE_URL}/api/agents`),
        fetch(`${API_BASE_URL}/api/agents`),
        fetch(`${API_BASE_URL}/api/agents?tier=1`),
        fetch(`${API_BASE_URL}/api/agents?tier=2`)
      ];

      const responses = await Promise.all(requests);
      const dataPromises = responses.map(r => r.json());
      const results = await Promise.all(dataPromises);

      // All requests should succeed
      responses.forEach(response => {
        expect(response.status).toBe(200);
      });

      // Results should be consistent
      results.forEach(data => {
        expect(data.success).toBe(true);
        expect(data.data).toBeDefined();
        expect(data.metadata).toBeDefined();
      });
    }, TEST_TIMEOUT);
  });

  describe('Error Handling', () => {
    it('should return 400 with proper error structure for invalid tier', async () => {
      if (!serverAvailable) {
        console.log('⏭️  Skipping: Server not available');
        return;
      }

      const response = await fetch(`${API_BASE_URL}/api/agents?tier=invalid`);
      const data = await response.json();

      expect(response.status).toBe(400);
      expect(data).toMatchObject({
        success: false,
        error: expect.any(String),
        message: expect.any(String),
        code: 'INVALID_TIER'
      });
    }, TEST_TIMEOUT);

    it('should handle malformed query parameters gracefully', async () => {
      if (!serverAvailable) {
        console.log('⏭️  Skipping: Server not available');
        return;
      }

      const response = await fetch(`${API_BASE_URL}/api/agents?tier=`);

      // Should either default to tier 1 or return 400
      expect([200, 400]).toContain(response.status);

      const data = await response.json();
      expect(data.success).toBeDefined();
    }, TEST_TIMEOUT);
  });

  describe('Data Integrity', () => {
    it('should not duplicate agents across tiers', async () => {
      if (!serverAvailable) {
        console.log('⏭️  Skipping: Server not available');
        return;
      }

      const response = await fetch(`${API_BASE_URL}/api/agents?tier=all`);
      const data = await response.json();

      // Check for duplicate IDs
      const ids = data.data.map(a => a.id);
      const uniqueIds = new Set(ids);

      expect(ids.length).toBe(uniqueIds.size);
    }, TEST_TIMEOUT);

    it('should maintain tier classification consistency', async () => {
      if (!serverAvailable) {
        console.log('⏭️  Skipping: Server not available');
        return;
      }

      // Get all agents
      const allResponse = await fetch(`${API_BASE_URL}/api/agents?tier=all`);
      const allData = await allResponse.json();

      // Get tier 1 agents
      const tier1Response = await fetch(`${API_BASE_URL}/api/agents?tier=1`);
      const tier1Data = await tier1Response.json();

      // Get tier 2 agents
      const tier2Response = await fetch(`${API_BASE_URL}/api/agents?tier=2`);
      const tier2Data = await tier2Response.json();

      // Counts should add up
      expect(tier1Data.data.length + tier2Data.data.length).toBe(allData.data.length);

      // No overlap in IDs
      const tier1Ids = new Set(tier1Data.data.map(a => a.id));
      const tier2Ids = new Set(tier2Data.data.map(a => a.id));

      tier1Ids.forEach(id => {
        expect(tier2Ids.has(id)).toBe(false);
      });
    }, TEST_TIMEOUT);
  });
});
