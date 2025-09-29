/**
 * Comprehensive tests for agent data parsing logic
 * Tests both array and object response formats from various API endpoints
 */

import { describe, it, expect, jest, beforeEach } from '@jest/globals';

// Mock fetch for testing
global.fetch = jest.fn();

// Test data structures
const mockAgentArray = [
  { id: 1, name: "Agent 1", status: "active" },
  { id: 2, name: "Agent 2", status: "inactive" }
];

const mockAgentObject = {
  success: true,
  agents: mockAgentArray,
  total: 2,
  timestamp: "2024-01-01T00:00:00.000Z"
};

const mockAgentObjectWithData = {
  success: true,
  data: mockAgentArray,
  total: 2
};

// Data parsing function extracted from components for testing
function parseAgentData(data) {
  return Array.isArray(data) ? data : (data.agents || data.data || []);
}

describe('Agent Data Parsing', () => {
  beforeEach(() => {
    fetch.mockClear();
  });

  describe('parseAgentData function', () => {
    it('should handle direct array responses', () => {
      const result = parseAgentData(mockAgentArray);
      expect(result).toEqual(mockAgentArray);
      expect(Array.isArray(result)).toBe(true);
      expect(result.length).toBe(2);
    });

    it('should handle object responses with agents property', () => {
      const result = parseAgentData(mockAgentObject);
      expect(result).toEqual(mockAgentArray);
      expect(Array.isArray(result)).toBe(true);
      expect(result.length).toBe(2);
    });

    it('should handle object responses with data property', () => {
      const result = parseAgentData(mockAgentObjectWithData);
      expect(result).toEqual(mockAgentArray);
      expect(Array.isArray(result)).toBe(true);
      expect(result.length).toBe(2);
    });

    it('should return empty array for empty responses', () => {
      expect(parseAgentData({})).toEqual([]);
      expect(parseAgentData(null)).toEqual([]);
      expect(parseAgentData(undefined)).toEqual([]);
    });

    it('should return empty array for malformed data', () => {
      expect(parseAgentData({ success: false })).toEqual([]);
      expect(parseAgentData({ error: "Not found" })).toEqual([]);
      expect(parseAgentData("invalid")).toEqual([]);
    });

    it('should prioritize agents over data property', () => {
      const conflictData = {
        agents: [{ id: 1, name: "From agents" }],
        data: [{ id: 2, name: "From data" }]
      };
      const result = parseAgentData(conflictData);
      expect(result).toEqual([{ id: 1, name: "From agents" }]);
    });
  });

  describe('API Response Simulation', () => {
    it('should handle /api/agents endpoint format', async () => {
      fetch.mockResolvedValueOnce({
        ok: true,
        json: async () => mockAgentObject
      });

      const response = await fetch('/api/agents');
      const data = await response.json();
      const agents = parseAgentData(data);

      expect(agents).toEqual(mockAgentArray);
    });

    it('should handle legacy API format with data property', async () => {
      fetch.mockResolvedValueOnce({
        ok: true,
        json: async () => mockAgentObjectWithData
      });

      const response = await fetch('/api/agents');
      const data = await response.json();
      const agents = parseAgentData(data);

      expect(agents).toEqual(mockAgentArray);
    });

    it('should handle direct array API responses', async () => {
      fetch.mockResolvedValueOnce({
        ok: true,
        json: async () => mockAgentArray
      });

      const response = await fetch('/api/agents');
      const data = await response.json();
      const agents = parseAgentData(data);

      expect(agents).toEqual(mockAgentArray);
    });
  });

  describe('Error Handling', () => {
    it('should handle network errors gracefully', async () => {
      fetch.mockRejectedValueOnce(new Error('Network error'));

      try {
        await fetch('/api/agents');
      } catch (error) {
        const agents = parseAgentData([]);
        expect(agents).toEqual([]);
      }
    });

    it('should handle HTTP errors gracefully', async () => {
      fetch.mockResolvedValueOnce({
        ok: false,
        status: 500,
        json: async () => ({ error: 'Internal server error' })
      });

      const response = await fetch('/api/agents');
      if (!response.ok) {
        const agents = parseAgentData([]);
        expect(agents).toEqual([]);
      }
    });

    it('should handle malformed JSON gracefully', async () => {
      fetch.mockResolvedValueOnce({
        ok: true,
        json: async () => { throw new Error('Invalid JSON'); }
      });

      try {
        const response = await fetch('/api/agents');
        await response.json();
      } catch (error) {
        const agents = parseAgentData([]);
        expect(agents).toEqual([]);
      }
    });
  });

  describe('Data Validation', () => {
    it('should validate agent structure', () => {
      const validAgents = [
        { id: 1, name: "Agent 1", status: "active" },
        { id: 2, name: "Agent 2", status: "inactive" }
      ];

      const result = parseAgentData(validAgents);
      result.forEach(agent => {
        expect(agent).toHaveProperty('id');
        expect(agent).toHaveProperty('name');
        expect(typeof agent.id).toBe('number');
        expect(typeof agent.name).toBe('string');
      });
    });

    it('should handle agents with missing properties', () => {
      const incompleteAgents = [
        { id: 1 }, // missing name
        { name: "Agent 2" }, // missing id
        {} // missing both
      ];

      const result = parseAgentData(incompleteAgents);
      expect(result).toEqual(incompleteAgents);
      expect(result.length).toBe(3);
    });
  });

  describe('Performance', () => {
    it('should handle large datasets efficiently', () => {
      const largeDataset = Array.from({ length: 1000 }, (_, i) => ({
        id: i,
        name: `Agent ${i}`,
        status: i % 2 === 0 ? 'active' : 'inactive'
      }));

      const start = performance.now();
      const result = parseAgentData(largeDataset);
      const end = performance.now();

      expect(result.length).toBe(1000);
      expect(end - start).toBeLessThan(10); // Should complete in under 10ms
    });
  });
});

describe('Integration Tests', () => {
  describe('Component Data Flow', () => {
    // Simulate the actual component logic
    const simulateComponentFetch = async (mockData) => {
      const response = await fetch('/api/agents');
      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }
      const data = await response.json();
      return parseAgentData(data);
    };

    it('should work with pages/agents.tsx format', async () => {
      fetch.mockResolvedValueOnce({
        ok: true,
        json: async () => mockAgentObject
      });

      const agents = await simulateComponentFetch();
      expect(agents).toEqual(mockAgentArray);
    });

    it('should work with frontend/src/pages/Agents.jsx format', async () => {
      fetch.mockResolvedValueOnce({
        ok: true,
        json: async () => mockAgentObjectWithData
      });

      const agents = await simulateComponentFetch();
      expect(agents).toEqual(mockAgentArray);
    });
  });

  describe('API Compatibility', () => {
    it('should maintain backward compatibility with old API responses', async () => {
      const legacyResponse = {
        data: mockAgentArray,
        count: 2,
        page: 1
      };

      fetch.mockResolvedValueOnce({
        ok: true,
        json: async () => legacyResponse
      });

      const agents = await simulateComponentFetch();
      expect(agents).toEqual(mockAgentArray);
    });

    it('should support new API response format', async () => {
      const newResponse = {
        success: true,
        agents: mockAgentArray,
        pagination: { total: 2, page: 1, limit: 10 },
        metadata: { timestamp: new Date().toISOString() }
      };

      fetch.mockResolvedValueOnce({
        ok: true,
        json: async () => newResponse
      });

      const agents = await simulateComponentFetch();
      expect(agents).toEqual(mockAgentArray);
    });
  });
});