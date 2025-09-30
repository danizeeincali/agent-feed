import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import fetch from 'node-fetch';

/**
 * UNIT TESTS: Dynamic Pages API Endpoints
 * Tests backend API responses and data structures
 *
 * Requires: Backend API running on localhost:3001
 */

const API_BASE = 'http://localhost:3001';
const TEST_AGENT_ID = 'personal-todos-agent';

describe('Dynamic Pages API - Unit Tests', () => {

  describe('GET /api/agent-pages/agents/:agentId/pages', () => {

    it('should return 200 status code', async () => {
      const response = await fetch(`${API_BASE}/api/agent-pages/agents/${TEST_AGENT_ID}/pages`);
      expect(response.status).toBe(200);
    });

    it('should return success: true in response', async () => {
      const response = await fetch(`${API_BASE}/api/agent-pages/agents/${TEST_AGENT_ID}/pages`);
      const data = await response.json();
      expect(data.success).toBe(true);
    });

    it('should return array of pages', async () => {
      const response = await fetch(`${API_BASE}/api/agent-pages/agents/${TEST_AGENT_ID}/pages`);
      const data = await response.json();
      expect(Array.isArray(data.pages)).toBe(true);
    });

    it('should return pages with required fields', async () => {
      const response = await fetch(`${API_BASE}/api/agent-pages/agents/${TEST_AGENT_ID}/pages`);
      const data = await response.json();

      if (data.pages.length > 0) {
        const page = data.pages[0];
        expect(page).toHaveProperty('id');
        expect(page).toHaveProperty('agentId');
        expect(page).toHaveProperty('title');
        expect(page).toHaveProperty('createdAt');
        expect(page).toHaveProperty('updatedAt');
      }
    });

    it('should return pagination metadata', async () => {
      const response = await fetch(`${API_BASE}/api/agent-pages/agents/${TEST_AGENT_ID}/pages`);
      const data = await response.json();
      expect(data).toHaveProperty('total');
      expect(data).toHaveProperty('limit');
      expect(data).toHaveProperty('offset');
    });

    it('should respect limit query parameter', async () => {
      const response = await fetch(`${API_BASE}/api/agent-pages/agents/${TEST_AGENT_ID}/pages?limit=1`);
      const data = await response.json();
      expect(data.limit).toBe(1);
      expect(data.pages.length).toBeLessThanOrEqual(1);
    });

    it('should respect offset query parameter', async () => {
      const response = await fetch(`${API_BASE}/api/agent-pages/agents/${TEST_AGENT_ID}/pages?offset=0`);
      const data = await response.json();
      expect(data.offset).toBe(0);
    });

    it('should return empty array for non-existent agent', async () => {
      const response = await fetch(`${API_BASE}/api/agent-pages/agents/non-existent-agent/pages`);
      const data = await response.json();
      expect(response.status).toBe(200);
      expect(data.pages).toEqual([]);
      expect(data.total).toBe(0);
    });

    it('should return timestamp in response', async () => {
      const response = await fetch(`${API_BASE}/api/agent-pages/agents/${TEST_AGENT_ID}/pages`);
      const data = await response.json();
      expect(data).toHaveProperty('timestamp');
      expect(new Date(data.timestamp).toString()).not.toBe('Invalid Date');
    });
  });

  describe('GET /api/agent-pages/agents/:agentId/pages/:pageId', () => {

    it('should return 200 for existing page', async () => {
      const response = await fetch(`${API_BASE}/api/agent-pages/agents/${TEST_AGENT_ID}/pages/personal-todos-dashboard-v3`);
      expect(response.status).toBe(200);
    });

    it('should return success: true for existing page', async () => {
      const response = await fetch(`${API_BASE}/api/agent-pages/agents/${TEST_AGENT_ID}/pages/personal-todos-dashboard-v3`);
      const data = await response.json();
      expect(data.success).toBe(true);
    });

    it('should return page data in page property', async () => {
      const response = await fetch(`${API_BASE}/api/agent-pages/agents/${TEST_AGENT_ID}/pages/personal-todos-dashboard-v3`);
      const data = await response.json();
      expect(data).toHaveProperty('page');
      expect(data.page).toHaveProperty('id');
    });

    it('should return correct page ID', async () => {
      const response = await fetch(`${API_BASE}/api/agent-pages/agents/${TEST_AGENT_ID}/pages/personal-todos-dashboard-v3`);
      const data = await response.json();
      expect(data.page.id).toBe('personal-todos-dashboard-v3');
    });

    it('should return correct agent ID', async () => {
      const response = await fetch(`${API_BASE}/api/agent-pages/agents/${TEST_AGENT_ID}/pages/personal-todos-dashboard-v3`);
      const data = await response.json();
      expect(data.page.agentId).toBe(TEST_AGENT_ID);
    });

    it('should return page title', async () => {
      const response = await fetch(`${API_BASE}/api/agent-pages/agents/${TEST_AGENT_ID}/pages/personal-todos-dashboard-v3`);
      const data = await response.json();
      expect(data.page.title).toBe('Personal Todos Dashboard');
    });

    it('should return page layout or content', async () => {
      const response = await fetch(`${API_BASE}/api/agent-pages/agents/${TEST_AGENT_ID}/pages/personal-todos-dashboard-v3`);
      const data = await response.json();
      expect(data.page.layout || data.page.content_value).toBeDefined();
    });

    it('should return 404 for non-existent page', async () => {
      const response = await fetch(`${API_BASE}/api/agent-pages/agents/${TEST_AGENT_ID}/pages/non-existent-page-id`);
      expect(response.status).toBe(404);
    });

    it('should return error message for non-existent page', async () => {
      const response = await fetch(`${API_BASE}/api/agent-pages/agents/${TEST_AGENT_ID}/pages/non-existent-page-id`);
      const data = await response.json();
      expect(data.success).toBe(false);
      expect(data.error).toBeDefined();
    });
  });

  describe('GET /api/agents/:slug', () => {

    it('should return agent data by slug', async () => {
      const response = await fetch(`${API_BASE}/api/agents/${TEST_AGENT_ID}`);
      expect(response.status).toBe(200);
    });

    it('should return success: true', async () => {
      const response = await fetch(`${API_BASE}/api/agents/${TEST_AGENT_ID}`);
      const data = await response.json();
      expect(data.success).toBe(true);
    });

    it('should return agent slug', async () => {
      const response = await fetch(`${API_BASE}/api/agents/${TEST_AGENT_ID}`);
      const data = await response.json();
      expect(data.data.slug).toBe(TEST_AGENT_ID);
    });

    it('should return agent name', async () => {
      const response = await fetch(`${API_BASE}/api/agents/${TEST_AGENT_ID}`);
      const data = await response.json();
      expect(data.data.name).toBe(TEST_AGENT_ID);
    });

    it('should return 404 for non-existent agent', async () => {
      const response = await fetch(`${API_BASE}/api/agents/non-existent-agent-slug`);
      expect(response.status).toBe(404);
    });
  });

  describe('POST /api/agent-pages/agents/:agentId/pages', () => {

    it('should accept page creation request with valid layout', async () => {
      const response = await fetch(`${API_BASE}/api/agent-pages/agents/${TEST_AGENT_ID}/pages`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          title: 'Test Page',
          description: 'Test description',
          layout: [
            { id: 'header-1', type: 'header', config: { title: 'Test', level: 1 } }
          ],
          components: ['header']
        })
      });

      expect([200, 201]).toContain(response.status);
    });

    it('should return created page data', async () => {
      const response = await fetch(`${API_BASE}/api/agent-pages/agents/${TEST_AGENT_ID}/pages`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          title: 'Test Page 2',
          description: 'Test description 2',
          layout: [
            { id: 'header-1', type: 'header', config: { title: 'Test 2', level: 1 } }
          ],
          components: ['header']
        })
      });

      const data = await response.json();
      expect(data.success).toBe(true);
      expect(data.page).toBeDefined();
      expect(data.page.id).toBeDefined();
    });

    it('should reject invalid page creation without layout', async () => {
      const response = await fetch(`${API_BASE}/api/agent-pages/agents/${TEST_AGENT_ID}/pages`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          title: 'Invalid Page',
          description: 'Missing layout',
          content: '{}'
        })
      });

      expect(response.status).toBe(400);
      const data = await response.json();
      expect(data.success).toBe(false);
      expect(data.error).toContain('Validation error');
    });
  });

  describe('API Response Performance', () => {

    it('should respond within 500ms for pages list', async () => {
      const startTime = Date.now();
      await fetch(`${API_BASE}/api/agent-pages/agents/${TEST_AGENT_ID}/pages`);
      const endTime = Date.now();

      expect(endTime - startTime).toBeLessThan(500);
    });

    it('should respond within 500ms for single page', async () => {
      const startTime = Date.now();
      await fetch(`${API_BASE}/api/agent-pages/agents/${TEST_AGENT_ID}/pages/personal-todos-dashboard-v3`);
      const endTime = Date.now();

      expect(endTime - startTime).toBeLessThan(500);
    });
  });

  describe('API Data Validation', () => {

    it('should return valid JSON', async () => {
      const response = await fetch(`${API_BASE}/api/agent-pages/agents/${TEST_AGENT_ID}/pages`);
      const contentType = response.headers.get('content-type');
      expect(contentType).toContain('application/json');
    });

    it('should return valid ISO date strings', async () => {
      const response = await fetch(`${API_BASE}/api/agent-pages/agents/${TEST_AGENT_ID}/pages/personal-todos-dashboard-v3`);
      const data = await response.json();

      const createdAt = new Date(data.page.createdAt);
      const updatedAt = new Date(data.page.updatedAt);

      expect(createdAt.toString()).not.toBe('Invalid Date');
      expect(updatedAt.toString()).not.toBe('Invalid Date');
    });

    it('should return consistent data types', async () => {
      const response = await fetch(`${API_BASE}/api/agent-pages/agents/${TEST_AGENT_ID}/pages`);
      const data = await response.json();

      expect(typeof data.success).toBe('boolean');
      expect(typeof data.total).toBe('number');
      expect(typeof data.limit).toBe('number');
      expect(typeof data.offset).toBe('number');
    });
  });

  describe('CORS Headers', () => {

    it('should include CORS headers', async () => {
      const response = await fetch(`${API_BASE}/api/agent-pages/agents/${TEST_AGENT_ID}/pages`);
      const corsHeader = response.headers.get('access-control-allow-origin');
      expect(corsHeader).toBeDefined();
    });
  });

});