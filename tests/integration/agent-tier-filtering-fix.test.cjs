/**
 * TDD Integration Test Suite: Backend Tier Filtering Bug Fixes
 *
 * EXPECTED BEHAVIOR: All tests should FAIL initially (backend returns empty data)
 * After fix implementation: All tests should PASS
 *
 * Root Cause Investigation Needed:
 * - Backend logs show "📂 Loaded 9/19 agents (tier=1)"
 * - But API returns {"success":true,"data":[]}
 * - Possible issue in response serialization or data transformation
 */

const request = require('supertest');
const { expect } = require('chai');

// Will be initialized in before hook
let app;
let server;

describe('TDD: Backend Tier Filtering Bug Fixes', () => {
  before(async () => {
    // Dynamically import the server
    const serverModule = await import('../../api-server/server.js');
    app = serverModule.default || serverModule.app;
    server = serverModule.server;
  });

  after(async () => {
    // Clean shutdown
    if (server && server.close) {
      await new Promise((resolve) => server.close(resolve));
    }
  });

  describe('Bug #1: GET /agents?tier=1 returns empty data', () => {
    it('should return 9 tier 1 agents', async () => {
      // Act
      const response = await request(app)
        .get('/api/v1/claude-live/prod/agents?tier=1')
        .expect('Content-Type', /json/)
        .expect(200);

      // Assert
      expect(response.body).to.have.property('success', true);
      expect(response.body).to.have.property('data').that.is.an('array');

      // BUG: Currently FAILS - returns empty array []
      expect(response.body.data).to.have.lengthOf(9);

      // Verify all agents are tier 1
      response.body.data.forEach(agent => {
        expect(agent).to.have.property('tier', 1);
      });
    });

    it('should return agents with all required fields', async () => {
      // Act
      const response = await request(app)
        .get('/api/v1/claude-live/prod/agents?tier=1')
        .expect(200);

      // Assert
      expect(response.body.success).to.be.true;
      expect(response.body.data).to.be.an('array');

      // BUG: Currently FAILS - data array is empty
      expect(response.body.data.length).to.be.greaterThan(0);

      // Verify first agent has required fields
      const agent = response.body.data[0];
      expect(agent).to.have.property('id');
      expect(agent).to.have.property('name');
      expect(agent).to.have.property('slug');
      expect(agent).to.have.property('tier', 1);
      expect(agent).to.have.property('description');
    });

    it('should include agent metadata in response', async () => {
      // Act
      const response = await request(app)
        .get('/api/v1/claude-live/prod/agents?tier=1')
        .expect(200);

      // Assert
      expect(response.body).to.have.property('metadata');
      expect(response.body.metadata).to.have.property('total');
      expect(response.body.metadata).to.have.property('tier1');
      expect(response.body.metadata).to.have.property('tier2');
      expect(response.body.metadata).to.have.property('filtered', 9);
      expect(response.body.metadata).to.have.property('appliedTier', '1');
    });
  });

  describe('Bug #2: GET /agents?tier=2 returns empty data', () => {
    it('should return 10 tier 2 agents', async () => {
      // Act
      const response = await request(app)
        .get('/api/v1/claude-live/prod/agents?tier=2')
        .expect('Content-Type', /json/)
        .expect(200);

      // Assert
      expect(response.body).to.have.property('success', true);
      expect(response.body).to.have.property('data').that.is.an('array');

      // BUG: Currently FAILS - returns empty array []
      expect(response.body.data).to.have.lengthOf(10);

      // Verify all agents are tier 2
      response.body.data.forEach(agent => {
        expect(agent).to.have.property('tier', 2);
      });
    });

    it('should return different agents than tier 1', async () => {
      // Arrange: Get tier 1 agents
      const tier1Response = await request(app)
        .get('/api/v1/claude-live/prod/agents?tier=1')
        .expect(200);

      // Act: Get tier 2 agents
      const tier2Response = await request(app)
        .get('/api/v1/claude-live/prod/agents?tier=2')
        .expect(200);

      // Assert: Tier 2 agents should be different from tier 1
      const tier1Ids = new Set(tier1Response.body.data.map(a => a.id));
      const tier2Ids = new Set(tier2Response.body.data.map(a => a.id));

      // No overlap between tier 1 and tier 2
      tier2Ids.forEach(id => {
        expect(tier1Ids.has(id)).to.be.false;
      });
    });

    it('should include correct metadata for tier 2', async () => {
      // Act
      const response = await request(app)
        .get('/api/v1/claude-live/prod/agents?tier=2')
        .expect(200);

      // Assert
      expect(response.body.metadata).to.have.property('filtered', 10);
      expect(response.body.metadata).to.have.property('appliedTier', '2');
    });
  });

  describe('Bug #3: GET /agents without tier returns empty data', () => {
    it('should return all 19 agents when no tier specified', async () => {
      // Act
      const response = await request(app)
        .get('/api/v1/claude-live/prod/agents')
        .expect('Content-Type', /json/)
        .expect(200);

      // Assert
      expect(response.body).to.have.property('success', true);
      expect(response.body).to.have.property('data').that.is.an('array');

      // BUG: Currently FAILS - might return empty or only tier 1 agents
      // Default should be tier 1, but when explicitly requesting all, should return all
      expect(response.body.data.length).to.be.greaterThan(0);

      // Should default to tier 1
      expect(response.body.data.length).to.equal(9);
    });

    it('should return all agents when tier=all', async () => {
      // Act
      const response = await request(app)
        .get('/api/v1/claude-live/prod/agents?tier=all')
        .expect('Content-Type', /json/)
        .expect(200);

      // Assert
      expect(response.body.success).to.be.true;
      expect(response.body.data).to.be.an('array');
      expect(response.body.data).to.have.lengthOf(19);

      // Should include both tier 1 and tier 2 agents
      const tier1Count = response.body.data.filter(a => a.tier === 1).length;
      const tier2Count = response.body.data.filter(a => a.tier === 2).length;

      expect(tier1Count).to.equal(9);
      expect(tier2Count).to.equal(10);
    });

    it('should include correct total metadata when tier=all', async () => {
      // Act
      const response = await request(app)
        .get('/api/v1/claude-live/prod/agents?tier=all')
        .expect(200);

      // Assert
      expect(response.body.metadata).to.have.property('total', 19);
      expect(response.body.metadata).to.have.property('tier1', 9);
      expect(response.body.metadata).to.have.property('tier2', 10);
      expect(response.body.metadata).to.have.property('filtered', 19);
      expect(response.body.metadata).to.have.property('appliedTier', 'all');
    });
  });

  describe('Bug #4: Tier field missing or incorrect on agents', () => {
    it('should include tier field on all tier 1 agents', async () => {
      // Act
      const response = await request(app)
        .get('/api/v1/claude-live/prod/agents?tier=1')
        .expect(200);

      // Assert
      expect(response.body.data).to.be.an('array');

      // BUG: Data array is empty, so this will fail
      expect(response.body.data.length).to.be.greaterThan(0);

      response.body.data.forEach(agent => {
        expect(agent).to.have.property('tier');
        expect(agent.tier).to.equal(1);
      });
    });

    it('should include tier field on all tier 2 agents', async () => {
      // Act
      const response = await request(app)
        .get('/api/v1/claude-live/prod/agents?tier=2')
        .expect(200);

      // Assert
      expect(response.body.data).to.be.an('array');
      expect(response.body.data.length).to.be.greaterThan(0);

      response.body.data.forEach(agent => {
        expect(agent).to.have.property('tier');
        expect(agent.tier).to.equal(2);
      });
    });

    it('should include tier field on all agents when tier=all', async () => {
      // Act
      const response = await request(app)
        .get('/api/v1/claude-live/prod/agents?tier=all')
        .expect(200);

      // Assert
      response.body.data.forEach(agent => {
        expect(agent).to.have.property('tier');
        expect([1, 2]).to.include(agent.tier);
      });
    });
  });

  describe('Bug #5: Agent metadata parsing errors', () => {
    it('should parse agent frontmatter correctly for tier 1 agents', async () => {
      // Act
      const response = await request(app)
        .get('/api/v1/claude-live/prod/agents?tier=1')
        .expect(200);

      // Assert
      expect(response.body.data.length).to.be.greaterThan(0);

      const agent = response.body.data[0];

      // Required fields from frontmatter
      expect(agent).to.have.property('id').that.is.a('string');
      expect(agent).to.have.property('slug').that.is.a('string');
      expect(agent).to.have.property('name').that.is.a('string');
      expect(agent).to.have.property('description').that.is.a('string');

      // Tier system fields
      expect(agent).to.have.property('tier', 1);
      expect(agent).to.have.property('visibility');
      expect(agent).to.have.property('icon');
      expect(agent).to.have.property('icon_type');
      expect(agent).to.have.property('icon_emoji');

      // Optional fields
      expect(agent).to.have.property('tools').that.is.an('array');
      expect(agent).to.have.property('status');
      expect(agent).to.have.property('priority');
    });

    it('should parse agent frontmatter correctly for tier 2 agents', async () => {
      // Act
      const response = await request(app)
        .get('/api/v1/claude-live/prod/agents?tier=2')
        .expect(200);

      // Assert
      expect(response.body.data.length).to.be.greaterThan(0);

      const agent = response.body.data[0];

      // Verify tier 2 specific parsing
      expect(agent).to.have.property('tier', 2);
      expect(agent).to.have.property('visibility');

      // Tier 2 agents might have 'protected' visibility
      if (agent.visibility === 'protected') {
        expect(['public', 'protected']).to.include(agent.visibility);
      }
    });

    it('should include file metadata for cache invalidation', async () => {
      // Act
      const response = await request(app)
        .get('/api/v1/claude-live/prod/agents?tier=1')
        .expect(200);

      // Assert
      expect(response.body.data.length).to.be.greaterThan(0);

      const agent = response.body.data[0];

      // File metadata for caching
      expect(agent).to.have.property('hash').that.is.a('string');
      expect(agent).to.have.property('lastModified').that.is.a('string');
      expect(agent).to.have.property('filePath').that.is.a('string');
    });
  });

  describe('Response format validation', () => {
    it('should return consistent response structure for all tier endpoints', async () => {
      // Act: Test all tier values
      const tier1Response = await request(app)
        .get('/api/v1/claude-live/prod/agents?tier=1')
        .expect(200);

      const tier2Response = await request(app)
        .get('/api/v1/claude-live/prod/agents?tier=2')
        .expect(200);

      const allResponse = await request(app)
        .get('/api/v1/claude-live/prod/agents?tier=all')
        .expect(200);

      // Assert: All responses have same structure
      [tier1Response, tier2Response, allResponse].forEach(response => {
        expect(response.body).to.have.property('success');
        expect(response.body).to.have.property('data').that.is.an('array');
        expect(response.body).to.have.property('metadata');
        expect(response.body.metadata).to.have.property('total');
        expect(response.body.metadata).to.have.property('tier1');
        expect(response.body.metadata).to.have.property('tier2');
        expect(response.body.metadata).to.have.property('filtered');
        expect(response.body.metadata).to.have.property('appliedTier');
      });
    });

    it('should handle invalid tier parameter gracefully', async () => {
      // Act
      const response = await request(app)
        .get('/api/v1/claude-live/prod/agents?tier=999')
        .expect(200); // Should still return 200, just with empty data or default tier

      // Assert
      expect(response.body).to.have.property('success');
      expect(response.body).to.have.property('data').that.is.an('array');
    });

    it('should handle legacy include_system parameter', async () => {
      // Act: Test legacy parameter
      const legacyResponse = await request(app)
        .get('/api/v1/claude-live/prod/agents?include_system=true')
        .expect(200);

      const tierAllResponse = await request(app)
        .get('/api/v1/claude-live/prod/agents?tier=all')
        .expect(200);

      // Assert: include_system=true should behave like tier=all
      expect(legacyResponse.body.data.length).to.equal(tierAllResponse.body.data.length);
      expect(legacyResponse.body.data.length).to.equal(19);
    });
  });

  describe('Performance and consistency', () => {
    it('should return same data for repeated tier 1 requests', async () => {
      // Act: Make 3 consecutive requests
      const request1 = await request(app)
        .get('/api/v1/claude-live/prod/agents?tier=1')
        .expect(200);

      const request2 = await request(app)
        .get('/api/v1/claude-live/prod/agents?tier=1')
        .expect(200);

      const request3 = await request(app)
        .get('/api/v1/claude-live/prod/agents?tier=1')
        .expect(200);

      // Assert: All requests return same data
      expect(request1.body.data.length).to.equal(request2.body.data.length);
      expect(request2.body.data.length).to.equal(request3.body.data.length);
      expect(request1.body.data.length).to.equal(9);
    });

    it('should return data within acceptable time (< 1000ms)', async function() {
      this.timeout(2000); // Allow 2s timeout for test

      // Act
      const startTime = Date.now();

      await request(app)
        .get('/api/v1/claude-live/prod/agents?tier=1')
        .expect(200);

      const endTime = Date.now();
      const duration = endTime - startTime;

      // Assert: Should respond quickly
      expect(duration).to.be.lessThan(1000);
    });
  });

  describe('Tier count verification', () => {
    it('should match expected tier distribution (9 T1, 10 T2)', async () => {
      // Act: Get all agents
      const response = await request(app)
        .get('/api/v1/claude-live/prod/agents?tier=all')
        .expect(200);

      // Assert: Verify distribution matches expected counts
      const tier1Agents = response.body.data.filter(a => a.tier === 1);
      const tier2Agents = response.body.data.filter(a => a.tier === 2);

      expect(tier1Agents.length).to.equal(9);
      expect(tier2Agents.length).to.equal(10);
      expect(response.body.data.length).to.equal(19);
    });

    it('should have tier counts in metadata matching actual agent counts', async () => {
      // Act
      const response = await request(app)
        .get('/api/v1/claude-live/prod/agents?tier=all')
        .expect(200);

      // Assert: Metadata counts should match actual filtered counts
      const tier1Count = response.body.data.filter(a => a.tier === 1).length;
      const tier2Count = response.body.data.filter(a => a.tier === 2).length;

      expect(response.body.metadata.tier1).to.equal(tier1Count);
      expect(response.body.metadata.tier2).to.equal(tier2Count);
      expect(response.body.metadata.total).to.equal(tier1Count + tier2Count);
    });
  });
});
