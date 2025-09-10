/**
 * TDD COMPREHENSIVE ROUTE VALIDATION TEST SUITE
 * 
 * PURPOSE: Validate complete system functionality based on user issues:
 * - "both feed and agents dont work"
 * - "Error HTTP 404: Not Found"
 * - "no posts on the feed"
 * 
 * VALIDATION TARGETS:
 * - All API endpoints return 200 (not 404)
 * - Feed route (/) loads without "Disconnected" errors
 * - Agents route (/agents) returns real agent data
 * - Posts API returns actual data (not empty)
 * - Frontend-backend proxy communication
 * - Real-time WebSocket connections
 */

const request = require('supertest');
const WebSocket = require('ws');
const { spawn } = require('child_process');
const fs = require('fs');
const path = require('path');

// Test Configuration
const BACKEND_URL = 'http://localhost:3000';
const FRONTEND_URL = 'http://localhost:5173';
const WS_URL = 'ws://localhost:3000';

describe('TDD Route Connectivity Validation', () => {
  let backendResponse;
  let frontendResponse;

  beforeAll(async () => {
    console.log('🚀 Starting TDD Route Validation Suite...');
    console.log(`Backend URL: ${BACKEND_URL}`);
    console.log(`Frontend URL: ${FRONTEND_URL}`);
  });

  describe('Backend API Endpoint Validation - Critical User Issues', () => {
    test('Health endpoint should return 200 status with healthy services', async () => {
      const response = await request(BACKEND_URL)
        .get('/health')
        .expect(200);

      expect(response.body).toHaveProperty('status', 'healthy');
      expect(response.body).toHaveProperty('services');
      expect(response.body.services.http_api).toBe('healthy');
      expect(response.body.services.database).toBe('healthy');
    });

    test('Posts API should return 200 with real data (NOT 404 or empty)', async () => {
      const response = await request(BACKEND_URL)
        .get('/api/v1/agent-posts')
        .expect(200);

      expect(response.body).toHaveProperty('success', true);
      expect(response.body).toHaveProperty('data');
      expect(Array.isArray(response.body.data)).toBe(true);
      expect(response.body.data.length).toBeGreaterThan(0);
      
      // Validate actual post structure
      const firstPost = response.body.data[0];
      expect(firstPost).toHaveProperty('id');
      expect(firstPost).toHaveProperty('title');
      expect(firstPost).toHaveProperty('content');
      expect(firstPost).toHaveProperty('author_agent');
      
      console.log(`✅ Posts API returned ${response.body.data.length} real posts`);
    });

    test('Agents API should return 200 with real agent data (NOT 404)', async () => {
      const response = await request(BACKEND_URL)
        .get('/api/agents')
        .expect(200);

      expect(response.body).toHaveProperty('success', true);
      expect(response.body).toHaveProperty('data');
      expect(Array.isArray(response.body.data)).toBe(true);
      expect(response.body.data.length).toBeGreaterThan(0);
      
      // Validate agent structure
      const firstAgent = response.body.data[0];
      expect(firstAgent).toHaveProperty('id');
      expect(firstAgent).toHaveProperty('name');
      expect(firstAgent).toHaveProperty('display_name');
      expect(firstAgent).toHaveProperty('status', 'active');
      
      console.log(`✅ Agents API returned ${response.body.data.length} real agents`);
    });

    test('All production API routes should return 200 (no 404 errors)', async () => {
      const productionRoutes = [
        '/api/agents',
        '/api/v1/agent-posts',
        '/api/v1/activities',
        '/api/v1/metrics/system',
        '/api/v1/analytics',
        '/api/health',
        '/api/filter-stats'
      ];

      for (const route of productionRoutes) {
        const response = await request(BACKEND_URL)
          .get(route);
        
        expect(response.status).not.toBe(404);
        expect([200, 201, 202].includes(response.status)).toBe(true);
        console.log(`✅ ${route} returned status ${response.status}`);
      }
    });

    test('Database connectivity should be operational with real data', async () => {
      const response = await request(BACKEND_URL)
        .get('/api/v1/agent-posts')
        .expect(200);

      expect(response.body.database_type).toBe('SQLite');
      expect(response.body.total).toBeGreaterThan(0);
      console.log(`✅ Database operational with ${response.body.total} total records`);
    });
  });

  describe('Frontend Route Accessibility - User Issue Resolution', () => {
    test('Frontend should be accessible and serve the main page', async () => {
      const response = await fetch(FRONTEND_URL);
      expect(response.status).toBe(200);
      
      const html = await response.text();
      expect(html).toContain('<title>Agent Feed - Claude Code Orchestration</title>');
      expect(html).toContain('div id="root"');
      console.log('✅ Frontend main page accessible');
    });

    test('Frontend should proxy API requests correctly to backend', async () => {
      // Test that frontend can proxy API requests to backend
      const proxyResponse = await fetch(`${FRONTEND_URL}/api/health`);
      expect(proxyResponse.status).toBe(200);
      
      const healthData = await proxyResponse.json();
      expect(healthData.status).toBe('healthy');
      console.log('✅ Frontend-backend proxy communication working');
    });

    test('Frontend routes should not return 404 errors', async () => {
      const frontendRoutes = [
        '/',
        '/agents'
      ];

      for (const route of frontendRoutes) {
        const response = await fetch(`${FRONTEND_URL}${route}`);
        expect(response.status).not.toBe(404);
        expect(response.status).toBe(200);
        console.log(`✅ Frontend route ${route} accessible`);
      }
    });
  });

  describe('Data Flow Validation - Real vs Mock Data', () => {
    test('Posts endpoint should return actual content (not empty or mock)', async () => {
      const response = await request(BACKEND_URL)
        .get('/api/v1/agent-posts')
        .expect(200);

      const posts = response.body.data;
      expect(posts.length).toBeGreaterThan(0);
      
      // Check for real content patterns
      const hasRealContent = posts.some(post => 
        post.content && 
        post.content.length > 10 && 
        !post.content.includes('mock') &&
        !post.content.includes('test') &&
        !post.content.includes('placeholder')
      );
      
      expect(hasRealContent).toBe(true);
      console.log('✅ Posts contain real content (not mock data)');
    });

    test('Agents should have realistic performance metrics', async () => {
      const response = await request(BACKEND_URL)
        .get('/api/agents')
        .expect(200);

      const agents = response.body.data;
      expect(agents.length).toBeGreaterThan(0);
      
      // Validate realistic agent data
      const hasPerformanceMetrics = agents.some(agent => 
        agent.performance_metrics &&
        agent.performance_metrics.success_rate > 0 &&
        agent.performance_metrics.usage_count > 0
      );
      
      expect(hasPerformanceMetrics).toBe(true);
      console.log('✅ Agents have realistic performance metrics');
    });
  });

  describe('Real-time Connectivity - WebSocket Validation', () => {
    test('WebSocket connection should establish successfully', (done) => {
      const ws = new WebSocket(`${WS_URL}/terminal`);
      
      ws.on('open', () => {
        console.log('✅ WebSocket connection established');
        ws.close();
        done();
      });
      
      ws.on('error', (error) => {
        console.error('❌ WebSocket connection failed:', error);
        done(error);
      });
      
      // Timeout after 5 seconds
      setTimeout(() => {
        if (ws.readyState !== WebSocket.OPEN) {
          ws.close();
          done(new Error('WebSocket connection timeout'));
        }
      }, 5000);
    });

    test('SSE streaming should be available', async () => {
      const response = await request(BACKEND_URL)
        .get('/health')
        .expect(200);

      expect(response.body.services.sse_streaming).toBe('healthy');
      console.log('✅ SSE streaming service healthy');
    });
  });

  describe('Error-free Operation Validation', () => {
    test('API responses should not contain error messages', async () => {
      const response = await request(BACKEND_URL)
        .get('/api/v1/agent-posts')
        .expect(200);

      const responseText = JSON.stringify(response.body);
      expect(responseText).not.toContain('error');
      expect(responseText).not.toContain('failed');
      expect(responseText).not.toContain('404');
      expect(responseText).not.toContain('not found');
      console.log('✅ API responses error-free');
    });

    test('System should not have disconnection errors', async () => {
      const healthResponse = await request(BACKEND_URL)
        .get('/health')
        .expect(200);

      expect(healthResponse.body.status).toBe('healthy');
      expect(healthResponse.body.services.claude_terminal).toBe('healthy');
      expect(healthResponse.body.services.database).toBe('healthy');
      console.log('✅ No disconnection errors detected');
    });
  });

  describe('Performance and Load Validation', () => {
    test('API endpoints should respond within acceptable time', async () => {
      const startTime = Date.now();
      
      await request(BACKEND_URL)
        .get('/api/v1/agent-posts')
        .expect(200);
      
      const responseTime = Date.now() - startTime;
      expect(responseTime).toBeLessThan(5000); // 5 second timeout
      console.log(`✅ API response time: ${responseTime}ms`);
    });

    test('Multiple concurrent requests should succeed', async () => {
      const requests = Array(5).fill(null).map(() => 
        request(BACKEND_URL)
          .get('/api/agents')
          .expect(200)
      );
      
      const responses = await Promise.all(requests);
      expect(responses.length).toBe(5);
      responses.forEach(response => {
        expect(response.status).toBe(200);
      });
      console.log('✅ Concurrent requests handled successfully');
    });
  });

  afterAll(async () => {
    console.log('🏁 TDD Route Validation Suite Complete');
  });
});

// Export test results for reporting
module.exports = {
  testSuiteName: 'TDD Route Connectivity Validation',
  purpose: 'Validate system functionality based on user issues',
  userIssues: [
    'both feed and agents dont work',
    'Error HTTP 404: Not Found', 
    'no posts on the feed'
  ],
  validationTargets: [
    'All API endpoints return 200 (not 404)',
    'Feed route (/) loads without Disconnected errors',
    'Agents route (/agents) returns real agent data',
    'Posts API returns actual data (not empty)',
    'Frontend-backend proxy communication',
    'Real-time WebSocket connections'
  ]
};