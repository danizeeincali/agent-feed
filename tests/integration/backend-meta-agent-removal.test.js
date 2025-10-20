/**
 * Integration Tests: Backend Meta Agent Removal
 *
 * Tests backend services after meta-agent removal:
 * - Agent loading via repository
 * - Protection validation service updates
 * - API endpoint responses
 *
 * Related Specification: /workspaces/agent-feed/docs/SPARC-META-AGENT-REMOVAL-SPEC.md
 * Related Architecture: /workspaces/agent-feed/docs/SPARC-META-AGENT-REMOVAL-ARCHITECTURE.md
 *
 * @module tests/integration/backend-meta-agent-removal
 */

const request = require('supertest');
const path = require('path');

// Mock imports (adjust based on actual app structure)
const { loadAgentTools } = require('../../api-server/avi/loadAgentTools');

// ============================================================================
// TEST CONSTANTS
// ============================================================================

const EXPECTED_TOTAL_AGENTS = 18;
const REMOVED_AGENTS = ['meta-agent', 'meta-update-agent'];

const PHASE_4_2_SPECIALISTS = [
  'agent-architect-agent',
  'agent-maintenance-agent',
  'skills-architect-agent',
  'skills-maintenance-agent',
  'learning-optimizer-agent',
  'system-architect-agent'
];

// ============================================================================
// TEST SUITE
// ============================================================================

describe('Backend Meta Agent Removal Integration', () => {

  // --------------------------------------------------------------------------
  // AGENT LOADING TESTS
  // --------------------------------------------------------------------------

  describe('Agent Repository Loading', () => {
    let loadedAgents;

    beforeAll(async () => {
      // Load agents using the actual repository loader
      loadedAgents = await loadAgentTools();
    });

    test('should load exactly 18 agents', () => {
      expect(loadedAgents).toHaveLength(EXPECTED_TOTAL_AGENTS);
    });

    test('should not load meta-agent', () => {
      const metaAgent = loadedAgents.find(a => a.name === 'meta-agent' || a.slug === 'meta-agent');
      expect(metaAgent).toBeUndefined();
    });

    test('should not load meta-update-agent', () => {
      const metaUpdateAgent = loadedAgents.find(a =>
        a.name === 'meta-update-agent' || a.slug === 'meta-update-agent'
      );
      expect(metaUpdateAgent).toBeUndefined();
    });

    test('should load all 6 Phase 4.2 specialists', () => {
      const specialists = loadedAgents.filter(a =>
        PHASE_4_2_SPECIALISTS.includes(a.name)
      );
      expect(specialists).toHaveLength(6);
    });

    test('loaded agents should have correct tier distribution', () => {
      const tier1Count = loadedAgents.filter(a => a.tier === 1).length;
      const tier2Count = loadedAgents.filter(a => a.tier === 2).length;

      expect(tier1Count).toBe(8);
      expect(tier2Count).toBe(8);
    });
  });

  // --------------------------------------------------------------------------
  // PROTECTION VALIDATION SERVICE TESTS
  // --------------------------------------------------------------------------

  describe('Protection Validation Service', () => {
    const protectionService = require('../../api-server/services/protection-validation.service');

    test('GetProtectedAgentRegistry should not include meta agents', () => {
      const registry = protectionService.GetProtectedAgentRegistry();

      expect(registry.metaCoordination).toBeDefined();
      expect(registry.metaCoordination).not.toContain('meta-agent');
      expect(registry.metaCoordination).not.toContain('meta-update-agent');
    });

    test('GetProtectedAgentRegistry should include Phase 4.2 specialists', () => {
      const registry = protectionService.GetProtectedAgentRegistry();

      expect(registry.phase42Specialists).toBeDefined();
      expect(registry.phase42Specialists).toHaveLength(6);

      PHASE_4_2_SPECIALISTS.forEach(specialist => {
        expect(registry.phase42Specialists).toContain(specialist);
      });
    });

    test('allProtected should not include meta agents', () => {
      const registry = protectionService.GetProtectedAgentRegistry();

      expect(registry.allProtected).not.toContain('meta-agent');
      expect(registry.allProtected).not.toContain('meta-update-agent');
    });

    test('DetermineProtectionStatus should return not protected for removed agents', () => {
      const mockAgent = { slug: 'meta-agent', tier: 2, visibility: 'protected' };
      const mockUser = { isAdmin: false };

      const protection = protectionService.DetermineProtectionStatus(mockAgent, mockUser);

      // Should not match META_COORDINATION_AGENTS anymore
      expect(protection.protectionReason).not.toBe('META_COORDINATION');
    });
  });

  // --------------------------------------------------------------------------
  // TIER CLASSIFICATION SERVICE TESTS
  // --------------------------------------------------------------------------

  describe('Tier Classification Service', () => {
    const tierService = require('../../api-server/services/tier-classification.service');

    test('GetAgentsByTier(1) should return 8 agents', () => {
      const tier1Agents = tierService.GetAgentsByTier(1);
      expect(tier1Agents).toHaveLength(8);
    });

    test('GetAgentsByTier(2) should return 8 agents', () => {
      const tier2Agents = tierService.GetAgentsByTier(2);
      expect(tier2Agents).toHaveLength(8);
    });

    test('GetAgentsByTier(2) should not include meta agents', () => {
      const tier2Agents = tierService.GetAgentsByTier(2);

      const hasMeta = tier2Agents.some(a =>
        a.name === 'meta-agent' || a.name === 'meta-update-agent'
      );
      expect(hasMeta).toBe(false);
    });

    test('GetAgentsByTier(2) should include all Phase 4.2 specialists', () => {
      const tier2Agents = tierService.GetAgentsByTier(2);

      PHASE_4_2_SPECIALISTS.forEach(specialist => {
        const exists = tier2Agents.some(a => a.name === specialist);
        expect(exists).toBe(true);
      });
    });
  });

  // --------------------------------------------------------------------------
  // API ENDPOINT TESTS (if app is available)
  // --------------------------------------------------------------------------

  describe('API Endpoints', () => {
    // Note: These tests assume an Express app is exported
    // Adjust based on actual app structure

    test.skip('GET /api/agents should return 18 agents', async () => {
      // const app = require('../../api-server/server');
      // const response = await request(app).get('/api/agents');

      // expect(response.status).toBe(200);
      // expect(response.body).toHaveLength(18);
    });

    test.skip('GET /api/agents should not return meta-agent', async () => {
      // const app = require('../../api-server/server');
      // const response = await request(app).get('/api/agents');

      // const metaAgent = response.body.find(a => a.name === 'meta-agent');
      // expect(metaAgent).toBeUndefined();
    });

    test.skip('GET /api/agents should not return meta-update-agent', async () => {
      // const app = require('../../api-server/server');
      // const response = await request(app).get('/api/agents');

      // const metaUpdateAgent = response.body.find(a => a.name === 'meta-update-agent');
      // expect(metaUpdateAgent).toBeUndefined();
    });

    test.skip('GET /api/agents?tier=1 should return 8 agents', async () => {
      // const app = require('../../api-server/server');
      // const response = await request(app).get('/api/agents?tier=1');

      // expect(response.status).toBe(200);
      // expect(response.body).toHaveLength(8);
    });

    test.skip('GET /api/agents?tier=2 should return 8 agents', async () => {
      // const app = require('../../api-server/server');
      // const response = await request(app).get('/api/agents?tier=2');

      // expect(response.status).toBe(200);
      // expect(response.body).toHaveLength(8);
    });
  });
});
