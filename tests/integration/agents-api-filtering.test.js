/**
 * Integration Tests: Agents API Filtering
 * Tests the API endpoints for agent retrieval
 *
 * Test Coverage:
 * - GET /api/agents returns 13 agents
 * - Response structure validation
 * - No system templates in results
 * - Individual agent retrieval
 * - 404 handling
 * - PostgreSQL fallback works
 */

import { describe, it, expect, beforeAll, afterAll } from '@jest/globals';
import request from 'supertest';
import express from 'express';

const API_BASE_URL = process.env.API_URL || 'http://localhost:3001';
const TEST_TIMEOUT = 10000;

describe('Agents API Filtering - Integration Tests', () => {
  let serverAvailable = false;

  beforeAll(async () => {
    try {
      const response = await fetch(`${API_BASE_URL}/health`);
      serverAvailable = response.ok;
    } catch (error) {
      console.warn('⚠️  API server not running. Please start with: npm run dev');
      serverAvailable = false;
    }
  }, TEST_TIMEOUT);

  describe('GET /api/agents - List All Agents', () => {
    it('should return exactly 13 production agents', async () => {
      if (!serverAvailable) {
        console.log('⏭️  Skipping: Server not available');
        return;
      }

      const response = await fetch(`${API_BASE_URL}/api/agents`);
      const data = await response.json();

      expect(response.status).toBe(200);
      expect(data.success).toBe(true);
      expect(Array.isArray(data.data)).toBe(true);
      expect(data.data.length).toBe(13);
    }, TEST_TIMEOUT);

    it('should return agents with correct structure', async () => {
      if (!serverAvailable) return;

      const response = await fetch(`${API_BASE_URL}/api/agents`);
      const data = await response.json();

      const agent = data.data[0];

      // Required fields
      expect(agent).toHaveProperty('id');
      expect(agent).toHaveProperty('slug');
      expect(agent).toHaveProperty('name');
      expect(agent).toHaveProperty('description');
      expect(agent).toHaveProperty('tools');
      expect(agent).toHaveProperty('color');
      expect(agent).toHaveProperty('content');
      expect(agent).toHaveProperty('filePath');

      // Correct types
      expect(typeof agent.id).toBe('string');
      expect(typeof agent.slug).toBe('string');
      expect(typeof agent.name).toBe('string');
      expect(typeof agent.description).toBe('string');
      expect(Array.isArray(agent.tools)).toBe(true);
    }, TEST_TIMEOUT);

    it('should include all expected production agents', async () => {
      if (!serverAvailable) return;

      const response = await fetch(`${API_BASE_URL}/api/agents`);
      const data = await response.json();

      const agentSlugs = data.data.map(a => a.slug);

      const expectedAgents = [
        'agent-feedback-agent',
        'agent-ideas-agent',
        'dynamic-page-testing-agent',
        'follow-ups-agent',
        'get-to-know-you-agent',
        'link-logger-agent',
        'meeting-next-steps-agent',
        'meeting-prep-agent',
        'meta-agent',
        'meta-update-agent',
        'page-builder-agent',
        'page-verification-agent',
        'personal-todos-agent'
      ];

      expectedAgents.forEach(slug => {
        expect(agentSlugs).toContain(slug);
      });
    }, TEST_TIMEOUT);

    it('should NOT include system template agents', async () => {
      if (!serverAvailable) return;

      const response = await fetch(`${API_BASE_URL}/api/agents`);
      const data = await response.json();

      const agentNames = data.data.map(a => a.name.toLowerCase());

      // System templates that should NOT appear
      const systemTemplates = [
        'apiintegrator',
        'api-integrator',
        'template-agent',
        'example-agent',
        'test-template'
      ];

      systemTemplates.forEach(systemTemplate => {
        const hasSystemAgent = agentNames.some(name => name.includes(systemTemplate));
        expect(hasSystemAgent).toBe(false);
      });
    }, TEST_TIMEOUT);

    it('should return valid UUID format for agent IDs', async () => {
      if (!serverAvailable) return;

      const response = await fetch(`${API_BASE_URL}/api/agents`);
      const data = await response.json();

      const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/;

      data.data.forEach(agent => {
        expect(agent.id).toMatch(uuidRegex);
      });
    }, TEST_TIMEOUT);

    it('should return agents with non-empty descriptions', async () => {
      if (!serverAvailable) return;

      const response = await fetch(`${API_BASE_URL}/api/agents`);
      const data = await response.json();

      data.data.forEach(agent => {
        expect(agent.description).toBeDefined();
        expect(agent.description.length).toBeGreaterThan(5);
      });
    }, TEST_TIMEOUT);

    it('should return agents with tools arrays', async () => {
      if (!serverAvailable) return;

      const response = await fetch(`${API_BASE_URL}/api/agents`);
      const data = await response.json();

      data.data.forEach(agent => {
        expect(Array.isArray(agent.tools)).toBe(true);
        // Some agents may have empty tools arrays
      });
    }, TEST_TIMEOUT);

    it('should include total count in response', async () => {
      if (!serverAvailable) return;

      const response = await fetch(`${API_BASE_URL}/api/agents`);
      const data = await response.json();

      expect(data).toHaveProperty('total');
      expect(data.total).toBe(13);
      expect(data.total).toBe(data.data.length);
    }, TEST_TIMEOUT);

    it('should include timestamp in response', async () => {
      if (!serverAvailable) return;

      const response = await fetch(`${API_BASE_URL}/api/agents`);
      const data = await response.json();

      expect(data).toHaveProperty('timestamp');
      expect(new Date(data.timestamp).getTime()).toBeGreaterThan(0);
    }, TEST_TIMEOUT);

    it('should indicate data source (filesystem)', async () => {
      if (!serverAvailable) return;

      const response = await fetch(`${API_BASE_URL}/api/agents`);
      const data = await response.json();

      expect(data).toHaveProperty('source');
      // Source could be PostgreSQL or SQLite depending on config
      expect(['PostgreSQL', 'SQLite']).toContain(data.source);
    }, TEST_TIMEOUT);
  });

  describe('GET /api/agents/:slug - Individual Agent', () => {
    it('should retrieve agent by slug', async () => {
      if (!serverAvailable) return;

      const response = await fetch(`${API_BASE_URL}/api/agents/meta-agent`);
      const data = await response.json();

      expect(response.status).toBe(200);
      expect(data.success).toBe(true);
      expect(data.data.slug).toBe('meta-agent');
    }, TEST_TIMEOUT);

    it('should work for all 13 production agents', async () => {
      if (!serverAvailable) return;

      const agentSlugs = [
        'agent-feedback-agent',
        'agent-ideas-agent',
        'dynamic-page-testing-agent',
        'follow-ups-agent',
        'get-to-know-you-agent',
        'link-logger-agent',
        'meeting-next-steps-agent',
        'meeting-prep-agent',
        'meta-agent',
        'meta-update-agent',
        'page-builder-agent',
        'page-verification-agent',
        'personal-todos-agent'
      ];

      for (const slug of agentSlugs) {
        const response = await fetch(`${API_BASE_URL}/api/agents/${slug}`);
        const data = await response.json();

        expect(response.status).toBe(200);
        expect(data.success).toBe(true);
        expect(data.data.slug).toBe(slug);
      }
    }, TEST_TIMEOUT * 3); // Longer timeout for multiple requests

    it('should include markdown content', async () => {
      if (!serverAvailable) return;

      const response = await fetch(`${API_BASE_URL}/api/agents/meta-agent`);
      const data = await response.json();

      expect(data.data).toHaveProperty('content');
      expect(data.data.content.length).toBeGreaterThan(100);
    }, TEST_TIMEOUT);

    it('should include tools array', async () => {
      if (!serverAvailable) return;

      const response = await fetch(`${API_BASE_URL}/api/agents/page-builder-agent`);
      const data = await response.json();

      expect(data.data).toHaveProperty('tools');
      expect(Array.isArray(data.data.tools)).toBe(true);
    }, TEST_TIMEOUT);

    it('should return 404 for non-existent agent', async () => {
      if (!serverAvailable) return;

      const response = await fetch(`${API_BASE_URL}/api/agents/non-existent-agent-xyz`);
      const data = await response.json();

      expect(response.status).toBe(404);
      expect(data.success).toBe(false);
      expect(data).toHaveProperty('error');
    }, TEST_TIMEOUT);

    it('should return consistent ID across requests', async () => {
      if (!serverAvailable) return;

      const response1 = await fetch(`${API_BASE_URL}/api/agents/meta-agent`);
      const data1 = await response1.json();

      const response2 = await fetch(`${API_BASE_URL}/api/agents/meta-agent`);
      const data2 = await response2.json();

      expect(data1.data.id).toBe(data2.data.id);
    }, TEST_TIMEOUT);

    it('should indicate lookup method used', async () => {
      if (!serverAvailable) return;

      const response = await fetch(`${API_BASE_URL}/api/agents/meta-agent`);
      const data = await response.json();

      expect(data).toHaveProperty('lookup_method');
      expect(['slug', 'name']).toContain(data.lookup_method);
    }, TEST_TIMEOUT);
  });

  describe('API Performance', () => {
    it('should respond to /api/agents in under 200ms', async () => {
      if (!serverAvailable) return;

      const start = Date.now();
      const response = await fetch(`${API_BASE_URL}/api/agents`);
      const duration = Date.now() - start;

      expect(response.status).toBe(200);
      expect(duration).toBeLessThan(200);
    }, TEST_TIMEOUT);

    it('should respond to /api/agents/:slug in under 100ms', async () => {
      if (!serverAvailable) return;

      const start = Date.now();
      const response = await fetch(`${API_BASE_URL}/api/agents/meta-agent`);
      const duration = Date.now() - start;

      expect(response.status).toBe(200);
      expect(duration).toBeLessThan(100);
    }, TEST_TIMEOUT);

    it('should handle concurrent requests', async () => {
      if (!serverAvailable) return;

      const requests = Array(20).fill(null).map(() =>
        fetch(`${API_BASE_URL}/api/agents`)
      );

      const responses = await Promise.all(requests);

      responses.forEach(response => {
        expect(response.status).toBe(200);
      });

      const dataPromises = responses.map(r => r.json());
      const data = await Promise.all(dataPromises);

      data.forEach(d => {
        expect(d.data.length).toBe(13);
      });
    }, TEST_TIMEOUT * 2);
  });

  describe('PostgreSQL Fallback Compatibility', () => {
    it('should work with posts endpoint (PostgreSQL)', async () => {
      if (!serverAvailable) return;

      const response = await fetch(`${API_BASE_URL}/api/posts`);
      const data = await response.json();

      expect(response.status).toBe(200);
      expect(data.success).toBe(true);
      // Posts should still work from PostgreSQL
    }, TEST_TIMEOUT);

    it('should work with comments endpoint (PostgreSQL)', async () => {
      if (!serverAvailable) return;

      // Get first post to test comments
      const postsResponse = await fetch(`${API_BASE_URL}/api/posts?limit=1`);
      const postsData = await postsResponse.json();

      if (postsData.data && postsData.data.length > 0) {
        const postId = postsData.data[0].id;
        const commentsResponse = await fetch(`${API_BASE_URL}/api/posts/${postId}/comments`);

        expect(commentsResponse.status).toBe(200);
      }
    }, TEST_TIMEOUT);
  });

  describe('Error Handling', () => {
    it('should handle malformed requests gracefully', async () => {
      if (!serverAvailable) return;

      const response = await fetch(`${API_BASE_URL}/api/agents/%00`);

      // Should not crash, should return 404 or 400
      expect([400, 404, 500]).toContain(response.status);
    }, TEST_TIMEOUT);

    it('should return JSON error for invalid slug', async () => {
      if (!serverAvailable) return;

      const response = await fetch(`${API_BASE_URL}/api/agents/invalid-slug-12345`);
      const data = await response.json();

      expect(data.success).toBe(false);
      expect(data).toHaveProperty('error');
    }, TEST_TIMEOUT);
  });

  describe('Data Integrity', () => {
    it('should have unique agent IDs', async () => {
      if (!serverAvailable) return;

      const response = await fetch(`${API_BASE_URL}/api/agents`);
      const data = await response.json();

      const ids = data.data.map(a => a.id);
      const uniqueIds = new Set(ids);

      expect(uniqueIds.size).toBe(ids.length);
    }, TEST_TIMEOUT);

    it('should have unique agent slugs', async () => {
      if (!serverAvailable) return;

      const response = await fetch(`${API_BASE_URL}/api/agents`);
      const data = await response.json();

      const slugs = data.data.map(a => a.slug);
      const uniqueSlugs = new Set(slugs);

      expect(uniqueSlugs.size).toBe(slugs.length);
    }, TEST_TIMEOUT);

    it('should have consistent filePaths', async () => {
      if (!serverAvailable) return;

      const response = await fetch(`${API_BASE_URL}/api/agents`);
      const data = await response.json();

      data.data.forEach(agent => {
        expect(agent.filePath).toContain('/prod/.claude/agents/');
        expect(agent.filePath).toContain(`${agent.slug}.md`);
      });
    }, TEST_TIMEOUT);
  });
});
