import { describe, it, expect, beforeAll } from 'vitest';
import fetch from 'node-fetch';

describe('Agents API Integration Tests - Real API Server', () => {
  const baseUrl = 'http://localhost:3001/api';
  let serverAvailable = false;

  beforeAll(async () => {
    try {
      const response = await fetch('http://localhost:3001/health');
      serverAvailable = response.ok;
    } catch (error) {
      console.warn('⚠️  API server not running on port 3001');
    }
  });

  describe('GET /api/agents - List All Agents', () => {
    it('should return 11 real agents from filesystem', async () => {
      if (!serverAvailable) {
        console.log('⏭️  Skipping: Server not available');
        return;
      }

      const response = await fetch(`${baseUrl}/agents`);
      const data = await response.json();

      expect(response.ok).toBe(true);
      expect(data.success).toBe(true);
      expect(data.data).toBeInstanceOf(Array);
      expect(data.data.length).toBe(11);
    });

    it('should return agents with correct structure', async () => {
      if (!serverAvailable) return;

      const response = await fetch(`${baseUrl}/agents`);
      const data = await response.json();

      const agent = data.data[0];
      expect(agent).toHaveProperty('id');
      expect(agent).toHaveProperty('slug');
      expect(agent).toHaveProperty('name');
      expect(agent).toHaveProperty('description');
      expect(agent).toHaveProperty('tools');
      expect(agent).toHaveProperty('color');
      expect(agent).toHaveProperty('content');
      expect(agent).toHaveProperty('filePath');
    });

    it('should include agent-feedback-agent in results', async () => {
      if (!serverAvailable) return;

      const response = await fetch(`${baseUrl}/agents`);
      const data = await response.json();

      const feedbackAgent = data.data.find(a => a.slug === 'agent-feedback-agent');
      expect(feedbackAgent).toBeDefined();
      expect(feedbackAgent.name).toBe('agent-feedback-agent');
    });

    it('should return valid agent IDs (UUID format)', async () => {
      if (!serverAvailable) return;

      const response = await fetch(`${baseUrl}/agents`);
      const data = await response.json();

      data.data.forEach(agent => {
        expect(agent.id).toBeDefined();
        expect(agent.id.length).toBeGreaterThan(8);
        expect(typeof agent.id).toBe('string');
      });
    });

    it('should return agents with non-empty descriptions', async () => {
      if (!serverAvailable) return;

      const response = await fetch(`${baseUrl}/agents`);
      const data = await response.json();

      data.data.forEach(agent => {
        expect(agent.description).toBeDefined();
        expect(agent.description.length).toBeGreaterThan(10);
      });
    });

    it('should return agents with tools arrays', async () => {
      if (!serverAvailable) return;

      const response = await fetch(`${baseUrl}/agents`);
      const data = await response.json();

      data.data.forEach(agent => {
        expect(agent.tools).toBeInstanceOf(Array);
        expect(agent.tools.length).toBeGreaterThan(0);
      });
    });

    it('should identify system agents by usage field', async () => {
      if (!serverAvailable) return;

      const response = await fetch(`${baseUrl}/agents`);
      const data = await response.json();

      const systemAgents = data.data.filter(a => a.usage && a.usage.includes('SYSTEM'));
      expect(systemAgents.length).toBeGreaterThan(0);

      // Verify at least one system agent exists
      const feedbackAgent = data.data.find(a => a.slug === 'agent-feedback-agent');
      expect(feedbackAgent.usage).toContain('SYSTEM');
    });

    it('should return response in under 100ms', async () => {
      if (!serverAvailable) return;

      const start = Date.now();
      await fetch(`${baseUrl}/agents`);
      const duration = Date.now() - start;

      expect(duration).toBeLessThan(100);
    });
  });

  describe('GET /api/agents/:slug - Single Agent', () => {
    it('should return agent-feedback-agent by slug', async () => {
      if (!serverAvailable) return;

      const response = await fetch(`${baseUrl}/agents/agent-feedback-agent`);
      const data = await response.json();

      expect(response.ok).toBe(true);
      expect(data.success).toBe(true);
      expect(data.data.slug).toBe('agent-feedback-agent');
      expect(data.data.name).toBe('agent-feedback-agent');
    });

    it('should include markdown content in response', async () => {
      if (!serverAvailable) return;

      const response = await fetch(`${baseUrl}/agents/agent-feedback-agent`);
      const data = await response.json();

      expect(data.data.content).toBeDefined();
      expect(data.data.content.length).toBeGreaterThan(100);
    });

    it('should return 404 for non-existent agent', async () => {
      if (!serverAvailable) return;

      const response = await fetch(`${baseUrl}/agents/non-existent-agent`);
      const data = await response.json();

      expect(response.status).toBe(404);
      expect(data.success).toBe(false);
    });

    it('should return consistent agent ID for same agent', async () => {
      if (!serverAvailable) return;

      const response1 = await fetch(`${baseUrl}/agents/agent-feedback-agent`);
      const data1 = await response1.json();

      const response2 = await fetch(`${baseUrl}/agents/agent-feedback-agent`);
      const data2 = await response2.json();

      expect(data1.data.id).toBe(data2.data.id);
    });
  });

  describe('API Performance and Reliability', () => {
    it('should handle concurrent requests', async () => {
      if (!serverAvailable) return;

      const requests = Array(10).fill(null).map(() =>
        fetch(`${baseUrl}/agents`)
      );

      const responses = await Promise.all(requests);

      responses.forEach(response => {
        expect(response.ok).toBe(true);
      });
    });

    it('should use cache for repeated requests', async () => {
      if (!serverAvailable) return;

      // First request (cold cache)
      const start1 = Date.now();
      await fetch(`${baseUrl}/agents/agent-feedback-agent`);
      const duration1 = Date.now() - start1;

      // Second request (hot cache)
      const start2 = Date.now();
      await fetch(`${baseUrl}/agents/agent-feedback-agent`);
      const duration2 = Date.now() - start2;

      // Cache should make second request faster
      expect(duration2).toBeLessThanOrEqual(duration1);
    });
  });
});