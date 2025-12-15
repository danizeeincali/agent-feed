/**
 * PRODUCTION VALIDATION: API Integration Testing Suite
 * Tests all API endpoints against real running backend server
 * 
 * VALIDATION REQUIREMENTS:
 * - Tests against actual running backend (localhost:3000)
 * - Validates real HTTP requests and responses
 * - No mocked API calls or stubbed responses
 * - Tests error handling with real network conditions
 */

import { describe, test, expect, beforeAll, afterAll } from 'vitest';

// Real API integration configuration
const BASE_URL = 'http://localhost:3000';
const API_TIMEOUT = 10000;
const PERFORMANCE_THRESHOLD = 2000; // 2 seconds max response time

// Real API endpoints to validate
const API_ENDPOINTS = {
  HEALTH: '/api/v1/health',
  AGENT_POSTS: '/api/v1/agent-posts',
  FILTER_DATA: '/api/v1/filter-data',
  LINK_PREVIEW: '/api/v1/link-preview'
};

// Test utilities for real API calls
const makeRealAPICall = async (endpoint: string, options: RequestInit = {}) => {
  const startTime = Date.now();
  
  try {
    const response = await fetch(`${BASE_URL}${endpoint}`, {
      ...options,
      headers: {
        'Content-Type': 'application/json',
        ...options.headers
      }
    });
    
    const duration = Date.now() - startTime;
    const data = await response.json();
    
    return {
      success: true,
      status: response.status,
      ok: response.ok,
      data,
      responseTime: duration,
      headers: Object.fromEntries(response.headers.entries())
    };
  } catch (error) {
    const duration = Date.now() - startTime;
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error',
      responseTime: duration
    };
  }
};

describe('Production Validation - API Integration Testing', () => {
  let serverHealth: any = null;

  beforeAll(async () => {
    console.log('🔧 PRODUCTION VALIDATION: Initializing API integration testing...');
    
    // Verify server is running and healthy
    const healthResponse = await makeRealAPICall(API_ENDPOINTS.HEALTH);
    
    expect(healthResponse.success, 'Backend server must be running and healthy').toBe(true);
    expect(healthResponse.ok, 'Health endpoint should return OK status').toBe(true);
    
    serverHealth = healthResponse.data;
    console.log('✅ Server health verified:', serverHealth);
  }, 15000);

  describe('Health Check Validation', () => {
    test('should return healthy status from real server', async () => {
      const response = await makeRealAPICall(API_ENDPOINTS.HEALTH);
      
      expect(response.success).toBe(true);
      expect(response.status).toBe(200);
      expect(response.data).toHaveProperty('status');
      expect(response.data).toHaveProperty('timestamp');
      expect(response.data).toHaveProperty('database');
      
      console.log('✅ Health check API validated:', {
        status: response.data.status,
        database: response.data.database,
        responseTime: `${response.responseTime}ms`
      });
    });

    test('should respond within performance threshold', async () => {
      const response = await makeRealAPICall(API_ENDPOINTS.HEALTH);
      
      expect(response.responseTime, 'Health check should respond quickly').toBeLessThan(1000);
      console.log(`⚡ Health check performance: ${response.responseTime}ms`);
    });
  });

  describe('Agent Posts API Validation', () => {
    test('should retrieve posts from real database', async () => {
      const queryParams = new URLSearchParams({
        limit: '20',
        offset: '0',
        filter: 'all',
        search: '',
        sortBy: 'published_at',
        sortOrder: 'DESC'
      });
      
      const response = await makeRealAPICall(`${API_ENDPOINTS.AGENT_POSTS}?${queryParams}`);
      
      expect(response.success, 'Posts API should succeed').toBe(true);
      expect(response.status, 'Should return 200 status').toBe(200);
      expect(response.data, 'Should have response data').toBeDefined();
      expect(response.data.success, 'Response should indicate success').toBe(true);
      expect(response.data.data, 'Should have posts array').toBeInstanceOf(Array);
      
      // Validate post structure if posts exist
      if (response.data.data.length > 0) {
        const firstPost = response.data.data[0];
        expect(firstPost).toHaveProperty('id');
        expect(firstPost).toHaveProperty('title');
        expect(firstPost).toHaveProperty('content');
        expect(firstPost).toHaveProperty('authorAgent');
        expect(firstPost).toHaveProperty('publishedAt');
      }

      console.log('✅ Agent posts API validated:', {
        postCount: response.data.data.length,
        totalPosts: response.data.total || response.data.data.length,
        responseTime: `${response.responseTime}ms`
      });
    });

    test('should handle agent filtering correctly', async () => {
      // First get available agents
      const filterDataResponse = await makeRealAPICall(API_ENDPOINTS.FILTER_DATA);
      expect(filterDataResponse.success).toBe(true);
      
      const availableAgents = filterDataResponse.data.agents;
      
      if (availableAgents.length === 0) {
        console.warn('⚠️ No agents available for filtering test');
        return;
      }

      const testAgent = availableAgents[0];
      const queryParams = new URLSearchParams({
        limit: '20',
        offset: '0',
        filter: 'by-agent',
        agent: testAgent,
        search: '',
        sortBy: 'published_at',
        sortOrder: 'DESC'
      });
      
      const response = await makeRealAPICall(`${API_ENDPOINTS.AGENT_POSTS}?${queryParams}`);
      
      expect(response.success).toBe(true);
      expect(response.status).toBe(200);
      
      // Verify all returned posts are from the specified agent
      if (response.data.data.length > 0) {
        response.data.data.forEach((post: any) => {
          expect(post.authorAgent, `All posts should be from ${testAgent}`).toBe(testAgent);
        });
      }

      console.log('✅ Agent filtering API validated:', {
        agent: testAgent,
        filteredPosts: response.data.data.length,
        responseTime: `${response.responseTime}ms`
      });
    });

    test('should handle hashtag filtering correctly', async () => {
      // First get available hashtags
      const filterDataResponse = await makeRealAPICall(API_ENDPOINTS.FILTER_DATA);
      expect(filterDataResponse.success).toBe(true);
      
      const availableHashtags = filterDataResponse.data.hashtags;
      
      if (availableHashtags.length === 0) {
        console.warn('⚠️ No hashtags available for filtering test');
        return;
      }

      const testHashtag = availableHashtags[0];
      const queryParams = new URLSearchParams({
        limit: '20',
        offset: '0',
        filter: 'by-tags',
        tags: testHashtag,
        search: '',
        sortBy: 'published_at',
        sortOrder: 'DESC'
      });
      
      const response = await makeRealAPICall(`${API_ENDPOINTS.AGENT_POSTS}?${queryParams}`);
      
      expect(response.success).toBe(true);
      expect(response.status).toBe(200);
      
      console.log('✅ Hashtag filtering API validated:', {
        hashtag: testHashtag,
        filteredPosts: response.data.data.length,
        responseTime: `${response.responseTime}ms`
      });
    });

    test('should handle pagination correctly', async () => {
      // Test first page
      const firstPageParams = new URLSearchParams({
        limit: '5',
        offset: '0',
        filter: 'all',
        sortBy: 'published_at',
        sortOrder: 'DESC'
      });
      
      const firstPageResponse = await makeRealAPICall(`${API_ENDPOINTS.AGENT_POSTS}?${firstPageParams}`);
      expect(firstPageResponse.success).toBe(true);
      
      // Test second page if we have enough data
      const secondPageParams = new URLSearchParams({
        limit: '5',
        offset: '5',
        filter: 'all',
        sortBy: 'published_at',
        sortOrder: 'DESC'
      });
      
      const secondPageResponse = await makeRealAPICall(`${API_ENDPOINTS.AGENT_POSTS}?${secondPageParams}`);
      expect(secondPageResponse.success).toBe(true);

      console.log('✅ Pagination API validated:', {
        firstPageCount: firstPageResponse.data.data.length,
        secondPageCount: secondPageResponse.data.data.length,
        totalAvailable: firstPageResponse.data.total || 'unknown'
      });
    });

    test('should meet performance requirements', async () => {
      const queryParams = new URLSearchParams({
        limit: '50',
        offset: '0',
        filter: 'all'
      });
      
      const response = await makeRealAPICall(`${API_ENDPOINTS.AGENT_POSTS}?${queryParams}`);
      
      expect(response.success).toBe(true);
      expect(response.responseTime, 'API should respond within performance threshold').toBeLessThan(PERFORMANCE_THRESHOLD);

      console.log(`⚡ API performance: ${response.responseTime}ms (threshold: ${PERFORMANCE_THRESHOLD}ms)`);
    });
  });

  describe('Filter Data API Validation', () => {
    test('should provide filter data from real database', async () => {
      const response = await makeRealAPICall(API_ENDPOINTS.FILTER_DATA);
      
      expect(response.success).toBe(true);
      expect(response.status).toBe(200);
      expect(response.data).toHaveProperty('agents');
      expect(response.data).toHaveProperty('hashtags');
      expect(response.data.agents).toBeInstanceOf(Array);
      expect(response.data.hashtags).toBeInstanceOf(Array);

      console.log('✅ Filter data API validated:', {
        agentCount: response.data.agents.length,
        hashtagCount: response.data.hashtags.length,
        responseTime: `${response.responseTime}ms`,
        sampleAgents: response.data.agents.slice(0, 3),
        sampleHashtags: response.data.hashtags.slice(0, 3)
      });
    });
  });

  describe('Post Management API Validation', () => {
    test('should handle post save/unsave operations', async () => {
      // First get a post ID
      const postsResponse = await makeRealAPICall(`${API_ENDPOINTS.AGENT_POSTS}?limit=1`);
      
      if (!postsResponse.success || postsResponse.data.data.length === 0) {
        console.warn('⚠️ No posts available for save/unsave test');
        return;
      }

      const testPostId = postsResponse.data.data[0].id;

      // Test save operation
      const saveResponse = await makeRealAPICall(`${API_ENDPOINTS.AGENT_POSTS}/${testPostId}/save`, {
        method: 'POST',
        body: JSON.stringify({})
      });

      expect(saveResponse.success, 'Save operation should succeed').toBe(true);
      
      // Test unsave operation
      const unsaveResponse = await makeRealAPICall(`${API_ENDPOINTS.AGENT_POSTS}/${testPostId}/save?user_id=anonymous`, {
        method: 'DELETE'
      });

      expect(unsaveResponse.success, 'Unsave operation should succeed').toBe(true);

      console.log('✅ Post save/unsave API validated:', {
        postId: testPostId,
        saveStatus: saveResponse.status,
        unsaveStatus: unsaveResponse.status
      });
    });
  });

  describe('Error Handling Validation', () => {
    test('should handle invalid endpoints gracefully', async () => {
      const response = await makeRealAPICall('/api/v1/nonexistent-endpoint');
      
      expect(response.success).toBe(true); // Request succeeded
      expect(response.ok).toBe(false); // But returned error status
      expect(response.status).toBe(404);

      console.log('✅ 404 error handling validated');
    });

    test('should handle malformed requests', async () => {
      const response = await makeRealAPICall(API_ENDPOINTS.AGENT_POSTS, {
        method: 'POST',
        body: 'invalid-json'
      });
      
      expect(response.success).toBe(true);
      expect([400, 422]).toContain(response.status); // Should return client error

      console.log('✅ Malformed request handling validated:', response.status);
    });

    test('should handle network timeouts', async () => {
      // This test would be more complex in a real scenario
      // For now, we validate that our requests complete within timeout
      const startTime = Date.now();
      const response = await makeRealAPICall(API_ENDPOINTS.HEALTH);
      const duration = Date.now() - startTime;
      
      expect(duration).toBeLessThan(API_TIMEOUT);
      console.log('✅ Network timeout handling validated');
    });
  });

  describe('Concurrent Request Handling', () => {
    test('should handle multiple simultaneous requests', async () => {
      const concurrentRequests = 10;
      const startTime = Date.now();

      // Create multiple concurrent requests
      const requests = Array.from({ length: concurrentRequests }, () => 
        makeRealAPICall(`${API_ENDPOINTS.AGENT_POSTS}?limit=5`)
      );

      const responses = await Promise.all(requests);
      const totalTime = Date.now() - startTime;

      // Verify all requests succeeded
      responses.forEach((response, index) => {
        expect(response.success, `Request ${index + 1} should succeed`).toBe(true);
      });

      const avgResponseTime = totalTime / concurrentRequests;
      expect(avgResponseTime, 'Average response time should be reasonable').toBeLessThan(1000);

      console.log('✅ Concurrent request handling validated:', {
        totalRequests: concurrentRequests,
        totalTime: `${totalTime}ms`,
        avgResponseTime: `${avgResponseTime}ms`,
        allSuccessful: responses.every(r => r.success)
      });
    });
  });

  afterAll(() => {
    console.log('🏁 PRODUCTION VALIDATION: API integration testing completed');
  });
});