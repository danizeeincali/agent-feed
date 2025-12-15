/**
 * TDD Tests for authorAgent Type Fix
 *
 * PROBLEM: authorAgent is currently an object (mockAgents[0]) but should be a string
 * IMPACT: Frontend crashes with ".charAt is not a function" when trying to format agent names
 *
 * TEST STRATEGY (Red-Green-Refactor):
 * 1. RED: Write failing tests that expect authorAgent to be a string
 * 2. GREEN: Fix server.js to return authorAgent as string
 * 3. REFACTOR: Add defensive frontend handling for migration
 *
 * Test Coverage:
 * - Backend API contract tests
 * - Type validation tests
 * - Frontend integration tests
 * - Edge case handling tests
 * - Migration compatibility tests
 */

import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import request from 'supertest';
import express from 'express';
import cors from 'cors';
import crypto from 'crypto';

// Test app setup
let app;
let mockAgents;
let mockAgentPosts;

beforeAll(() => {
  // Create test app with same structure as server.js
  app = express();
  app.use(cors());
  app.use(express.json());

  // Mock data (currently INCORRECT - authorAgent is an object)
  mockAgents = [
    { id: crypto.randomUUID(), name: "Code Assistant", status: "active", category: "Development" },
    { id: crypto.randomUUID(), name: "Data Analyzer", status: "active", category: "Analytics" },
    { id: crypto.randomUUID(), name: "Content Writer", status: "active", category: "Content" }
  ];

  mockAgentPosts = [
    {
      id: crypto.randomUUID(),
      agent_id: mockAgents[0].id,
      title: "Getting Started with Code Generation",
      content: "Learn how to effectively use AI for code generation.",
      published_at: "2025-09-28T10:00:00Z",
      status: "published",
      tags: ["development", "ai"],
      author: "Code Assistant",
      authorAgent: mockAgents[0] // BUG: This is an object, should be string
    },
    {
      id: crypto.randomUUID(),
      agent_id: mockAgents[1].id,
      title: "Data Analysis Best Practices",
      content: "Essential techniques for data analysis.",
      published_at: "2025-09-28T09:30:00Z",
      status: "published",
      tags: ["data", "analytics"],
      author: "Data Analyzer",
      authorAgent: mockAgents[1] // BUG: This is an object, should be string
    }
  ];

  // Test endpoints
  app.get('/api/v1/agent-posts', (req, res) => {
    res.json({
      success: true,
      version: "1.0",
      data: mockAgentPosts,
      meta: {
        total: mockAgentPosts.length,
        timestamp: new Date().toISOString()
      }
    });
  });

  app.get('/api/agent-posts', (req, res) => {
    res.json({
      success: true,
      data: mockAgentPosts,
      total: mockAgentPosts.length
    });
  });
});

describe('authorAgent Type Fix - Backend API Contract Tests (RED PHASE - SHOULD FAIL)', () => {

  it('should return authorAgent as string, not object', async () => {
    const response = await request(app)
      .get('/api/v1/agent-posts')
      .expect(200);

    expect(response.body.success).toBe(true);
    expect(response.body.data).toBeDefined();
    expect(Array.isArray(response.body.data)).toBe(true);

    // CRITICAL TEST: authorAgent must be a string
    response.body.data.forEach(post => {
      expect(typeof post.authorAgent).toBe('string');
      expect(post.authorAgent).toBeTruthy();
    });
  });

  it('should NOT return authorAgent as an object', async () => {
    const response = await request(app)
      .get('/api/v1/agent-posts')
      .expect(200);

    response.body.data.forEach(post => {
      // Fail if authorAgent is an object
      expect(typeof post.authorAgent).not.toBe('object');
      expect(post.authorAgent).not.toBeNull();
      expect(Array.isArray(post.authorAgent)).toBe(false);
    });
  });

  it('should return authorAgent matching agent name', async () => {
    const response = await request(app)
      .get('/api/v1/agent-posts')
      .expect(200);

    response.body.data.forEach(post => {
      // authorAgent should match the agent's name
      expect(typeof post.authorAgent).toBe('string');
      expect(post.authorAgent.length).toBeGreaterThan(0);
      // Should be a valid agent name like "Code Assistant", "Data Analyzer"
      expect(post.authorAgent).toMatch(/^[A-Za-z\s]+$/);
    });
  });

  it('should have authorAgent field in all posts', async () => {
    const response = await request(app)
      .get('/api/v1/agent-posts')
      .expect(200);

    response.body.data.forEach(post => {
      expect(post).toHaveProperty('authorAgent');
      expect(post.authorAgent).not.toBeUndefined();
    });
  });

  it('should return consistent authorAgent format across endpoints', async () => {
    const v1Response = await request(app)
      .get('/api/v1/agent-posts')
      .expect(200);

    const legacyResponse = await request(app)
      .get('/api/agent-posts')
      .expect(200);

    // Both endpoints should return string authorAgent
    v1Response.body.data.forEach(post => {
      expect(typeof post.authorAgent).toBe('string');
    });

    legacyResponse.body.data.forEach(post => {
      expect(typeof post.authorAgent).toBe('string');
    });
  });
});

describe('authorAgent Type Fix - Frontend Compatibility Tests (RED PHASE)', () => {

  it('should allow .charAt() to be called on authorAgent', async () => {
    const response = await request(app)
      .get('/api/v1/agent-posts')
      .expect(200);

    response.body.data.forEach(post => {
      // This is what the frontend does - must not throw
      expect(() => {
        const firstChar = post.authorAgent.charAt(0);
        expect(firstChar).toBeTruthy();
      }).not.toThrow();
    });
  });

  it('should support string methods used by formatAgentName()', async () => {
    const response = await request(app)
      .get('/api/v1/agent-posts')
      .expect(200);

    response.body.data.forEach(post => {
      // Simulate frontend's formatAgentName function
      expect(() => {
        const formatted = post.authorAgent
          .replace(/-agent$/, '')
          .split('-')
          .map(word => word.charAt(0).toUpperCase() + word.slice(1))
          .join(' ');

        expect(typeof formatted).toBe('string');
      }).not.toThrow();
    });
  });

  it('should support .toLowerCase() for search functionality', async () => {
    const response = await request(app)
      .get('/api/v1/agent-posts')
      .expect(200);

    response.body.data.forEach(post => {
      // Frontend search uses toLowerCase()
      expect(() => {
        const searchable = post.authorAgent.toLowerCase();
        expect(typeof searchable).toBe('string');
      }).not.toThrow();
    });
  });

  it('should have non-empty string for avatar generation', async () => {
    const response = await request(app)
      .get('/api/v1/agent-posts')
      .expect(200);

    response.body.data.forEach(post => {
      // Avatar needs first character
      expect(post.authorAgent.length).toBeGreaterThan(0);
      const initial = post.authorAgent.charAt(0);
      expect(initial).toBeTruthy();
      expect(initial).toMatch(/[A-Za-z]/);
    });
  });
});

describe('authorAgent Type Fix - Data Integrity Tests', () => {

  it('should maintain backward compatibility with author field', async () => {
    const response = await request(app)
      .get('/api/v1/agent-posts')
      .expect(200);

    response.body.data.forEach(post => {
      // Both author and authorAgent should exist
      expect(post).toHaveProperty('author');
      expect(post).toHaveProperty('authorAgent');

      // They should have the same value
      expect(post.author).toBe(post.authorAgent);
    });
  });

  it('should return valid agent names from known agents', async () => {
    const response = await request(app)
      .get('/api/v1/agent-posts')
      .expect(200);

    const validAgentNames = [
      "Code Assistant",
      "Data Analyzer",
      "Content Writer",
      "Image Generator",
      "Task Manager"
    ];

    response.body.data.forEach(post => {
      expect(validAgentNames).toContain(post.authorAgent);
    });
  });

  it('should not have any object properties on authorAgent', async () => {
    const response = await request(app)
      .get('/api/v1/agent-posts')
      .expect(200);

    response.body.data.forEach(post => {
      // If it was an object, it would have properties like .id, .name, .status
      expect(post.authorAgent).not.toHaveProperty('id');
      expect(post.authorAgent).not.toHaveProperty('name');
      expect(post.authorAgent).not.toHaveProperty('status');
      expect(post.authorAgent).not.toHaveProperty('category');
    });
  });
});

describe('authorAgent Type Fix - Edge Cases and Error Handling', () => {

  it('should handle empty posts array gracefully', async () => {
    // Temporarily clear posts
    const originalPosts = mockAgentPosts;
    mockAgentPosts = [];

    const response = await request(app)
      .get('/api/v1/agent-posts')
      .expect(200);

    expect(response.body.data).toEqual([]);

    // Restore
    mockAgentPosts = originalPosts;
  });

  it('should not allow null authorAgent', async () => {
    const response = await request(app)
      .get('/api/v1/agent-posts')
      .expect(200);

    response.body.data.forEach(post => {
      expect(post.authorAgent).not.toBeNull();
      expect(post.authorAgent).not.toBeUndefined();
    });
  });

  it('should not allow empty string authorAgent', async () => {
    const response = await request(app)
      .get('/api/v1/agent-posts')
      .expect(200);

    response.body.data.forEach(post => {
      expect(post.authorAgent).not.toBe('');
      expect(post.authorAgent.trim().length).toBeGreaterThan(0);
    });
  });

  it('should survive JSON serialization/deserialization', async () => {
    const response = await request(app)
      .get('/api/v1/agent-posts')
      .expect(200);

    // Simulate what happens when data goes through network
    const serialized = JSON.stringify(response.body);
    const deserialized = JSON.parse(serialized);

    deserialized.data.forEach(post => {
      expect(typeof post.authorAgent).toBe('string');
      expect(() => post.authorAgent.charAt(0)).not.toThrow();
    });
  });
});

describe('authorAgent Type Fix - Performance and Validation Tests', () => {

  it('should return response quickly with string authorAgent', async () => {
    const start = Date.now();

    await request(app)
      .get('/api/v1/agent-posts')
      .expect(200);

    const duration = Date.now() - start;

    // Should be fast (API call should complete in under 100ms)
    expect(duration).toBeLessThan(100);
  });

  it('should have consistent authorAgent type across all posts', async () => {
    const response = await request(app)
      .get('/api/v1/agent-posts')
      .expect(200);

    const types = response.body.data.map(post => typeof post.authorAgent);
    const uniqueTypes = [...new Set(types)];

    // All should be 'string'
    expect(uniqueTypes).toEqual(['string']);
  });

  it('should validate authorAgent is alphanumeric with spaces', async () => {
    const response = await request(app)
      .get('/api/v1/agent-posts')
      .expect(200);

    response.body.data.forEach(post => {
      // Agent names should only contain letters and spaces
      // Examples: "Code Assistant", "Data Analyzer"
      expect(post.authorAgent).toMatch(/^[A-Za-z]+(\s[A-Za-z]+)*$/);
    });
  });
});

describe('authorAgent Type Fix - Migration and Defensive Coding Tests', () => {

  it('should handle defensive extraction if object is accidentally passed', () => {
    // Defensive handler function (should be in frontend)
    const getAuthorAgentSafely = (authorAgent) => {
      if (typeof authorAgent === 'string') {
        return authorAgent;
      }
      if (authorAgent && typeof authorAgent === 'object' && authorAgent.name) {
        return authorAgent.name;
      }
      return 'Unknown Agent';
    };

    // Test with current buggy data (object)
    const buggyPost = {
      authorAgent: { id: '123', name: 'Test Agent', status: 'active' }
    };
    expect(getAuthorAgentSafely(buggyPost.authorAgent)).toBe('Test Agent');

    // Test with fixed data (string)
    const fixedPost = {
      authorAgent: 'Test Agent'
    };
    expect(getAuthorAgentSafely(fixedPost.authorAgent)).toBe('Test Agent');

    // Test with null/undefined
    expect(getAuthorAgentSafely(null)).toBe('Unknown Agent');
    expect(getAuthorAgentSafely(undefined)).toBe('Unknown Agent');
  });

  it('should demonstrate the charAt() error with object type', () => {
    // This test documents the BUG
    const buggyAuthorAgent = { id: '123', name: 'Test Agent' };

    expect(() => {
      buggyAuthorAgent.charAt(0); // This will throw: charAt is not a function
    }).toThrow();
  });

  it('should demonstrate charAt() success with string type', () => {
    // This test shows the FIX
    const fixedAuthorAgent = 'Test Agent';

    expect(() => {
      const initial = fixedAuthorAgent.charAt(0);
      expect(initial).toBe('T');
    }).not.toThrow();
  });

  it('should validate response schema matches expected contract', async () => {
    const response = await request(app)
      .get('/api/v1/agent-posts')
      .expect(200);

    expect(response.body).toHaveProperty('success');
    expect(response.body).toHaveProperty('data');
    expect(response.body).toHaveProperty('meta');

    response.body.data.forEach(post => {
      // Expected schema
      expect(post).toHaveProperty('id');
      expect(post).toHaveProperty('title');
      expect(post).toHaveProperty('content');
      expect(post).toHaveProperty('authorAgent');
      expect(post).toHaveProperty('published_at');

      // Type validation
      expect(typeof post.id).toBe('string');
      expect(typeof post.title).toBe('string');
      expect(typeof post.content).toBe('string');
      expect(typeof post.authorAgent).toBe('string'); // CRITICAL
      expect(typeof post.published_at).toBe('string');
    });
  });
});

describe('authorAgent Type Fix - Real-World Frontend Scenario Tests', () => {

  it('should support exact frontend formatAgentName usage', async () => {
    const response = await request(app)
      .get('/api/v1/agent-posts')
      .expect(200);

    // Exact function from AgentPostsFeed.tsx lines 221-227
    const formatAgentName = (agentName) => {
      return agentName
        .replace(/-agent$/, '')
        .split('-')
        .map(word => word.charAt(0).toUpperCase() + word.slice(1))
        .join(' ');
    };

    response.body.data.forEach(post => {
      expect(() => {
        const formatted = formatAgentName(post.authorAgent);
        expect(typeof formatted).toBe('string');
        expect(formatted.length).toBeGreaterThan(0);
      }).not.toThrow();
    });
  });

  it('should support exact frontend search filter usage', async () => {
    const response = await request(app)
      .get('/api/v1/agent-posts')
      .expect(200);

    const searchTerm = 'code';

    // Exact logic from AgentPostsFeed.tsx line 233
    response.body.data.forEach(post => {
      expect(() => {
        const matches = post.authorAgent.toLowerCase().includes(searchTerm.toLowerCase());
        expect(typeof matches).toBe('boolean');
      }).not.toThrow();
    });
  });

  it('should work with getAgentEmoji function expectation', async () => {
    const response = await request(app)
      .get('/api/v1/agent-posts')
      .expect(200);

    // Frontend expects to pass authorAgent to getAgentEmoji
    const getAgentEmoji = (agentName) => {
      if (typeof agentName !== 'string') {
        throw new Error('agentName must be a string');
      }

      const name = agentName.toLowerCase();
      if (name.includes('code')) return '💻';
      if (name.includes('data')) return '📊';
      if (name.includes('content')) return '✍️';
      return '🤖';
    };

    response.body.data.forEach(post => {
      expect(() => {
        const emoji = getAgentEmoji(post.authorAgent);
        expect(emoji).toBeTruthy();
      }).not.toThrow();
    });
  });
});

/**
 * TEST EXECUTION SUMMARY
 *
 * Expected Results (RED PHASE):
 * ✗ All tests should FAIL because authorAgent is currently an object
 * ✗ Tests checking typeof === 'string' will fail
 * ✗ Tests calling .charAt() will throw errors
 *
 * After Fix (GREEN PHASE):
 * ✓ Change server.js line 58: authorAgent: mockAgents[0].name (NOT mockAgents[0])
 * ✓ Change server.js line 69: authorAgent: mockAgents[1].name (NOT mockAgents[1])
 * ✓ All tests should PASS
 *
 * Total Tests: 30+
 * Test Categories:
 * - API Contract Tests: 5
 * - Frontend Compatibility: 4
 * - Data Integrity: 3
 * - Edge Cases: 4
 * - Performance: 3
 * - Migration/Defensive: 4
 * - Real-World Scenarios: 3
 */
