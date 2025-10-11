/**
 * E2E API Integration Tests with PostgreSQL
 * Tests all updated API endpoints with real PostgreSQL data
 * Phase 2A: Validation that dual database mode works correctly
 */

import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import axios from 'axios';

const API_BASE_URL = 'http://localhost:3001/api';
const TEST_USER_ID = 'anonymous';

describe('E2E API Integration Tests (PostgreSQL Mode)', () => {
  let testPostId = null;

  beforeAll(async () => {
    // Wait for server to be ready
    let retries = 10;
    while (retries > 0) {
      try {
        await axios.get(`${API_BASE_URL}/agents`);
        console.log('✅ API server is ready');
        break;
      } catch (error) {
        retries--;
        if (retries === 0) {
          throw new Error('API server failed to start');
        }
        console.log(`⏳ Waiting for API server... (${retries} retries left)`);
        await new Promise(resolve => setTimeout(resolve, 2000));
      }
    }
  });

  describe('GET /api/agents', () => {
    it('should retrieve all agents from PostgreSQL', async () => {
      const response = await axios.get(`${API_BASE_URL}/agents`, {
        params: { userId: TEST_USER_ID }
      });

      expect(response.status).toBe(200);
      expect(response.data.success).toBe(true);
      expect(response.data.data).toBeInstanceOf(Array);
      expect(response.data.total).toBeGreaterThan(0);
      expect(response.data.source).toBe('PostgreSQL');

      console.log(`✅ Retrieved ${response.data.total} agents from PostgreSQL`);

      if (response.data.data.length > 0) {
        const agent = response.data.data[0];
        expect(agent).toHaveProperty('id');
        expect(agent).toHaveProperty('name');
        expect(agent).toHaveProperty('display_name');
        expect(agent).toHaveProperty('status');

        console.log(`   Sample agent: ${agent.name} (${agent.display_name})`);
      }
    });
  });

  describe('GET /api/agents/:slug', () => {
    it('should retrieve specific agent by name', async () => {
      // First get all agents to find one
      const allAgents = await axios.get(`${API_BASE_URL}/agents`, {
        params: { userId: TEST_USER_ID }
      });

      expect(allAgents.data.data.length).toBeGreaterThan(0);

      const testAgent = allAgents.data.data[0];
      const response = await axios.get(`${API_BASE_URL}/agents/${testAgent.name}`, {
        params: { userId: TEST_USER_ID }
      });

      expect(response.status).toBe(200);
      expect(response.data.success).toBe(true);
      expect(response.data.data).toBeTruthy();
      expect(response.data.data.name).toBe(testAgent.name);
      expect(response.data.source).toBe('PostgreSQL');

      console.log(`✅ Retrieved agent: ${response.data.data.name}`);
    });

    it('should return 404 for non-existent agent', async () => {
      try {
        await axios.get(`${API_BASE_URL}/agents/NonExistentAgent`, {
          params: { userId: TEST_USER_ID }
        });
        // Should not reach here
        expect(true).toBe(false);
      } catch (error) {
        expect(error.response.status).toBe(404);
        expect(error.response.data.success).toBe(false);
        expect(error.response.data.source).toBe('PostgreSQL');
        console.log('✅ Correctly returned 404 for non-existent agent');
      }
    });
  });

  describe('GET /api/agent-posts', () => {
    it('should retrieve posts from PostgreSQL with pagination', async () => {
      const response = await axios.get(`${API_BASE_URL}/agent-posts`, {
        params: {
          userId: TEST_USER_ID,
          limit: 20,
          offset: 0
        }
      });

      expect(response.status).toBe(200);
      expect(response.data.success).toBe(true);
      expect(response.data.data).toBeInstanceOf(Array);
      expect(response.data.source).toBe('PostgreSQL');
      expect(response.data.limit).toBe(20);
      expect(response.data.offset).toBe(0);

      console.log(`✅ Retrieved ${response.data.data.length} posts from PostgreSQL`);

      if (response.data.data.length > 0) {
        const post = response.data.data[0];
        expect(post).toHaveProperty('id');
        expect(post).toHaveProperty('author_agent');
        expect(post).toHaveProperty('content');

        console.log(`   Sample post by: ${post.author_agent}`);
        console.log(`   Content preview: ${post.content.substring(0, 50)}...`);
      }
    });

    it('should respect pagination parameters', async () => {
      const limit = 5;
      const response = await axios.get(`${API_BASE_URL}/agent-posts`, {
        params: {
          userId: TEST_USER_ID,
          limit: limit,
          offset: 0
        }
      });

      expect(response.status).toBe(200);
      expect(response.data.data.length).toBeLessThanOrEqual(limit);
      expect(response.data.limit).toBe(limit);

      console.log(`✅ Pagination working: requested ${limit}, received ${response.data.data.length}`);
    });
  });

  describe('POST /api/v1/agent-posts', () => {
    it('should create new post in PostgreSQL', async () => {
      const newPost = {
        title: 'E2E Test Post - PostgreSQL Integration',
        content: 'This post was created by the E2E test suite to verify PostgreSQL integration is working correctly.',
        author_agent: 'ProductionValidator',
        userId: TEST_USER_ID,
        metadata: {
          tags: ['test', 'e2e', 'postgresql', 'phase2a'],
          postType: 'test',
          businessImpact: 10
        }
      };

      const response = await axios.post(`${API_BASE_URL}/v1/agent-posts`, newPost);

      expect(response.status).toBe(201);
      expect(response.data.success).toBe(true);
      expect(response.data.data).toBeTruthy();
      expect(response.data.data.id).toBeTruthy();
      expect(response.data.data.author_agent).toBe(newPost.author_agent);
      expect(response.data.data.content).toBe(newPost.content);
      expect(response.data.source).toBe('PostgreSQL');

      // Save post ID for later tests
      testPostId = response.data.data.id;

      console.log(`✅ Created test post in PostgreSQL: ${testPostId}`);
      console.log(`   Title: ${response.data.data.title}`);
      console.log(`   Author: ${response.data.data.author_agent}`);
    });

    it('should validate required fields', async () => {
      try {
        await axios.post(`${API_BASE_URL}/v1/agent-posts`, {
          title: 'Test Post',
          // Missing content and author_agent
        });
        expect(true).toBe(false); // Should not reach here
      } catch (error) {
        expect(error.response.status).toBe(400);
        expect(error.response.data.success).toBe(false);
        console.log('✅ Correctly validated required fields');
      }
    });

    it('should validate content length', async () => {
      const longContent = 'x'.repeat(10001); // Exceeds max length

      try {
        await axios.post(`${API_BASE_URL}/v1/agent-posts`, {
          title: 'Test Post',
          content: longContent,
          author_agent: 'TestAgent',
          userId: TEST_USER_ID
        });
        expect(true).toBe(false); // Should not reach here
      } catch (error) {
        expect(error.response.status).toBe(400);
        expect(error.response.data.success).toBe(false);
        expect(error.response.data.error).toContain('exceeds maximum length');
        console.log('✅ Correctly validated content length');
      }
    });
  });

  describe('POST /api/v1/agent-posts - Verify Created Post', () => {
    it('should retrieve the created test post', async () => {
      expect(testPostId).toBeTruthy();

      const response = await axios.get(`${API_BASE_URL}/agent-posts`, {
        params: {
          userId: TEST_USER_ID,
          limit: 100
        }
      });

      expect(response.status).toBe(200);

      const createdPost = response.data.data.find(p => p.id === testPostId);
      expect(createdPost).toBeTruthy();
      expect(createdPost.author_agent).toBe('ProductionValidator');
      expect(createdPost.content).toContain('E2E test suite');

      console.log(`✅ Verified created post can be retrieved: ${testPostId}`);
    });
  });

  describe('Data Integrity', () => {
    it('should have consistent data between endpoints', async () => {
      const agentsResponse = await axios.get(`${API_BASE_URL}/agents`, {
        params: { userId: TEST_USER_ID }
      });
      const postsResponse = await axios.get(`${API_BASE_URL}/agent-posts`, {
        params: { userId: TEST_USER_ID, limit: 100 }
      });

      expect(agentsResponse.data.source).toBe('PostgreSQL');
      expect(postsResponse.data.source).toBe('PostgreSQL');

      console.log('\n📊 Data Integrity Check:');
      console.log(`   Agents: ${agentsResponse.data.total} (PostgreSQL)`);
      console.log(`   Posts: ${postsResponse.data.data.length} (PostgreSQL)`);
      console.log('\n✅ All endpoints using PostgreSQL consistently');
    });
  });

  describe('Response Format Validation', () => {
    it('should return consistent response structure across endpoints', async () => {
      const agentsResponse = await axios.get(`${API_BASE_URL}/agents`, {
        params: { userId: TEST_USER_ID }
      });
      const postsResponse = await axios.get(`${API_BASE_URL}/agent-posts`, {
        params: { userId: TEST_USER_ID }
      });

      // Validate response structure
      expect(agentsResponse.data).toHaveProperty('success');
      expect(agentsResponse.data).toHaveProperty('data');
      expect(agentsResponse.data).toHaveProperty('total');
      expect(agentsResponse.data).toHaveProperty('timestamp');
      expect(agentsResponse.data).toHaveProperty('source');

      expect(postsResponse.data).toHaveProperty('success');
      expect(postsResponse.data).toHaveProperty('data');
      expect(postsResponse.data).toHaveProperty('source');

      console.log('✅ Response structure consistent across endpoints');
    });
  });
});
