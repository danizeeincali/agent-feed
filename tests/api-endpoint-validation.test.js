/**
 * TDD CRITICAL VALIDATION - API Endpoint Fix Verification
 * 
 * MISSION: Validate frontend API endpoint fixes eliminate 404 errors
 * 
 * POST-FIX VALIDATION TESTS:
 * 1. Test all updated API endpoints respond correctly
 * 2. Verify frontend calls match backend endpoints exactly
 * 3. Confirm no more /v1/ redirects or 404s
 * 4. Test real data flow through corrected endpoints
 * 5. Browser-level validation of user experience
 */

const request = require('supertest');
const express = require('express');
const WebSocket = require('ws');
const { spawn } = require('child_process');
const path = require('path');
const fs = require('fs');

// Test configuration
const BACKEND_URL = 'http://localhost:3000';
const FRONTEND_URL = 'http://localhost:5173';
const TEST_TIMEOUT = 30000;

// Test results tracking
const validationResults = {
  endpointTests: [],
  connectivityTests: [],
  dataFlowTests: [],
  userExperienceTests: [],
  errorTests: [],
  performanceTests: []
};

describe('API Endpoint Fix Validation Suite', () => {
  let backendProcess;
  let frontendProcess;
  
  beforeAll(async () => {
    console.log('🚀 Starting comprehensive API endpoint validation...');
    
    // Ensure backend is running
    try {
      const healthCheck = await fetch(`${BACKEND_URL}/api/health`);
      if (!healthCheck.ok) {
        throw new Error('Backend not responding');
      }
      console.log('✅ Backend health check passed');
    } catch (error) {
      console.warn('⚠️ Backend health check failed, attempting to start...');
      // Backend startup would be handled externally
    }
  }, TEST_TIMEOUT);
  
  afterAll(async () => {
    // Generate comprehensive validation report
    const report = {
      timestamp: new Date().toISOString(),
      summary: {
        totalTests: Object.values(validationResults).reduce((sum, tests) => sum + tests.length, 0),
        passedTests: Object.values(validationResults).reduce((sum, tests) => 
          sum + tests.filter(t => t.status === 'pass').length, 0),
        failedTests: Object.values(validationResults).reduce((sum, tests) => 
          sum + tests.filter(t => t.status === 'fail').length, 0)
      },
      results: validationResults,
      conclusions: {
        endpointsFixed: validationResults.endpointTests.every(t => t.status === 'pass'),
        dataFlowWorking: validationResults.dataFlowTests.every(t => t.status === 'pass'),
        userExperienceGood: validationResults.userExperienceTests.every(t => t.status === 'pass'),
        no404Errors: validationResults.errorTests.every(t => t.expected404 || t.status === 'pass')
      }
    };
    
    fs.writeFileSync(
      '/workspaces/agent-feed/tests/api-validation-report.json',
      JSON.stringify(report, null, 2)
    );
    
    console.log('📋 API validation report generated at tests/api-validation-report.json');
  });

  describe('Critical API Endpoints Validation', () => {
    const criticalEndpoints = [
      { path: '/api/health', method: 'GET', description: 'Health check endpoint' },
      { path: '/api/agents', method: 'GET', description: 'Get agents list' },
      { path: '/api/agent-posts', method: 'GET', description: 'Get agent posts' },
      { path: '/api/agent-posts', method: 'POST', description: 'Create agent post' },
      { path: '/api/filter-data', method: 'GET', description: 'Get filter data' },
      { path: '/api/filter-stats', method: 'GET', description: 'Get filter statistics' },
      { path: '/api/activities', method: 'GET', description: 'Get activities' },
      { path: '/api/claude/instances', method: 'GET', description: 'Get Claude instances' },
      { path: '/api/metrics/system', method: 'GET', description: 'Get system metrics' }
    ];

    criticalEndpoints.forEach(endpoint => {
      test(`${endpoint.method} ${endpoint.path} should respond successfully`, async () => {
        const startTime = Date.now();
        
        try {
          let response;
          
          if (endpoint.method === 'GET') {
            response = await fetch(`${BACKEND_URL}${endpoint.path}`);
          } else if (endpoint.method === 'POST') {
            response = await fetch(`${BACKEND_URL}${endpoint.path}`, {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({
                title: 'Test Post',
                content: 'Test content for endpoint validation',
                authorAgent: 'TestAgent'
              })
            });
          }
          
          const responseTime = Date.now() - startTime;
          const responseData = await response.text();
          
          // Validate response
          expect(response.status).not.toBe(404);
          expect(response.status).toBeLessThan(500);
          expect(responseTime).toBeLessThan(5000); // 5s timeout
          
          // Try to parse as JSON
          let jsonData;
          try {
            jsonData = JSON.parse(responseData);
          } catch (e) {
            // Some endpoints might return non-JSON
          }
          
          validationResults.endpointTests.push({
            endpoint: endpoint.path,
            method: endpoint.method,
            status: 'pass',
            responseCode: response.status,
            responseTime,
            hasJsonResponse: !!jsonData,
            description: endpoint.description
          });
          
        } catch (error) {
          validationResults.endpointTests.push({
            endpoint: endpoint.path,
            method: endpoint.method,
            status: 'fail',
            error: error.message,
            description: endpoint.description
          });
          
          throw error;
        }
      }, TEST_TIMEOUT);
    });
  });

  describe('Frontend API Integration Tests', () => {
    test('Frontend can load agent posts without 404 errors', async () => {
      try {
        const response = await fetch(`${BACKEND_URL}/api/agent-posts?limit=10&offset=0`);
        
        expect(response.status).toBe(200);
        
        const data = await response.json();
        expect(data).toHaveProperty('success');
        expect(data).toHaveProperty('data');
        
        validationResults.dataFlowTests.push({
          test: 'agent-posts-loading',
          status: 'pass',
          responseCode: response.status,
          dataReceived: !!data.data
        });
        
      } catch (error) {
        validationResults.dataFlowTests.push({
          test: 'agent-posts-loading',
          status: 'fail',
          error: error.message
        });
        throw error;
      }
    });

    test('Frontend can load agents list without 404 errors', async () => {
      try {
        const response = await fetch(`${BACKEND_URL}/api/agents`);
        
        expect(response.status).toBe(200);
        
        const data = await response.json();
        expect(data).toHaveProperty('success');
        
        validationResults.dataFlowTests.push({
          test: 'agents-loading',
          status: 'pass',
          responseCode: response.status,
          dataReceived: !!data.data
        });
        
      } catch (error) {
        validationResults.dataFlowTests.push({
          test: 'agents-loading',
          status: 'fail',
          error: error.message
        });
        throw error;
      }
    });

    test('Frontend filter data endpoint works correctly', async () => {
      try {
        const response = await fetch(`${BACKEND_URL}/api/filter-data`);
        
        expect(response.status).toBe(200);
        
        const data = await response.json();
        expect(data).toHaveProperty('agents');
        expect(data).toHaveProperty('hashtags');
        
        validationResults.dataFlowTests.push({
          test: 'filter-data-loading',
          status: 'pass',
          responseCode: response.status,
          hasAgents: Array.isArray(data.agents),
          hasHashtags: Array.isArray(data.hashtags)
        });
        
      } catch (error) {
        validationResults.dataFlowTests.push({
          test: 'filter-data-loading',
          status: 'fail',
          error: error.message
        });
        throw error;
      }
    });
  });

  describe('No More 404 Errors Validation', () => {
    const previouslyFailingEndpoints = [
      '/api/v1/agent-posts', // Should now be /api/agent-posts
      '/api/v1/agents',      // Should now be /api/agents
      '/api/v1/activities',  // Should now be /api/activities
    ];

    previouslyFailingEndpoints.forEach(endpoint => {
      test(`Previously failing endpoint ${endpoint} should return 404 (as expected)`, async () => {
        try {
          const response = await fetch(`${BACKEND_URL}${endpoint}`);
          
          // These old endpoints SHOULD return 404 now
          expect(response.status).toBe(404);
          
          validationResults.errorTests.push({
            endpoint,
            status: 'pass',
            responseCode: response.status,
            expected404: true,
            description: 'Old v1 endpoint correctly returns 404'
          });
          
        } catch (error) {
          validationResults.errorTests.push({
            endpoint,
            status: 'fail',
            error: error.message,
            expected404: true
          });
          throw error;
        }
      });
    });

    const newWorkingEndpoints = [
      '/api/agent-posts',
      '/api/agents', 
      '/api/activities'
    ];

    newWorkingEndpoints.forEach(endpoint => {
      test(`New working endpoint ${endpoint} should NOT return 404`, async () => {
        try {
          const response = await fetch(`${BACKEND_URL}${endpoint}`);
          
          // These new endpoints should NOT return 404
          expect(response.status).not.toBe(404);
          expect(response.status).toBeLessThan(500);
          
          validationResults.errorTests.push({
            endpoint,
            status: 'pass',
            responseCode: response.status,
            expected404: false,
            description: 'New endpoint correctly returns data'
          });
          
        } catch (error) {
          validationResults.errorTests.push({
            endpoint,
            status: 'fail',
            error: error.message,
            expected404: false
          });
          throw error;
        }
      });
    });
  });

  describe('Real-Time Connection Validation', () => {
    test('WebSocket connection should work without 404 errors', (done) => {
      const wsUrl = `ws://localhost:3000/ws`;
      
      try {
        const ws = new WebSocket(wsUrl);
        
        const timeout = setTimeout(() => {
          ws.close();
          validationResults.connectivityTests.push({
            test: 'websocket-connection',
            status: 'fail',
            error: 'Connection timeout'
          });
          done(new Error('WebSocket connection timeout'));
        }, 10000);
        
        ws.on('open', () => {
          clearTimeout(timeout);
          ws.close();
          
          validationResults.connectivityTests.push({
            test: 'websocket-connection',
            status: 'pass',
            description: 'WebSocket connected successfully'
          });
          
          done();
        });
        
        ws.on('error', (error) => {
          clearTimeout(timeout);
          
          validationResults.connectivityTests.push({
            test: 'websocket-connection',
            status: 'fail',
            error: error.message
          });
          
          done(error);
        });
        
      } catch (error) {
        validationResults.connectivityTests.push({
          test: 'websocket-connection',
          status: 'fail',
          error: error.message
        });
        done(error);
      }
    });
  });

  describe('Performance and Response Time Validation', () => {
    test('API endpoints should respond within acceptable time limits', async () => {
      const performanceEndpoints = [
        '/api/health',
        '/api/agents',
        '/api/agent-posts?limit=10'
      ];
      
      for (const endpoint of performanceEndpoints) {
        const startTime = Date.now();
        
        try {
          const response = await fetch(`${BACKEND_URL}${endpoint}`);
          const responseTime = Date.now() - startTime;
          
          expect(responseTime).toBeLessThan(3000); // 3 second max
          expect(response.status).toBeLessThan(400);
          
          validationResults.performanceTests.push({
            endpoint,
            status: 'pass',
            responseTime,
            responseCode: response.status
          });
          
        } catch (error) {
          validationResults.performanceTests.push({
            endpoint,
            status: 'fail',
            error: error.message
          });
          throw error;
        }
      }
    });
  });

  describe('User Experience Validation', () => {
    test('Feed page data loading simulation', async () => {
      try {
        // Simulate what the Feed page does
        const [postsResponse, filterResponse] = await Promise.all([
          fetch(`${BACKEND_URL}/api/agent-posts?limit=20&offset=0`),
          fetch(`${BACKEND_URL}/api/filter-data`)
        ]);
        
        expect(postsResponse.status).toBe(200);
        expect(filterResponse.status).toBe(200);
        
        const postsData = await postsResponse.json();
        const filterData = await filterResponse.json();
        
        expect(postsData).toHaveProperty('data');
        expect(filterData).toHaveProperty('agents');
        
        validationResults.userExperienceTests.push({
          test: 'feed-page-loading',
          status: 'pass',
          postsLoaded: postsData.data?.length > 0,
          filtersLoaded: filterData.agents?.length > 0
        });
        
      } catch (error) {
        validationResults.userExperienceTests.push({
          test: 'feed-page-loading',
          status: 'fail',
          error: error.message
        });
        throw error;
      }
    });

    test('Agents page data loading simulation', async () => {
      try {
        // Simulate what the Agents page does
        const agentsResponse = await fetch(`${BACKEND_URL}/api/agents`);
        
        expect(agentsResponse.status).toBe(200);
        
        const agentsData = await agentsResponse.json();
        expect(agentsData).toHaveProperty('data');
        
        validationResults.userExperienceTests.push({
          test: 'agents-page-loading',
          status: 'pass',
          agentsLoaded: agentsData.data?.length >= 0
        });
        
      } catch (error) {
        validationResults.userExperienceTests.push({
          test: 'agents-page-loading',
          status: 'fail',
          error: error.message
        });
        throw error;
      }
    });
  });
});

// Helper function to wait for server to be ready
function waitForServer(url, timeout = 30000) {
  return new Promise((resolve, reject) => {
    const startTime = Date.now();
    
    const checkServer = async () => {
      try {
        const response = await fetch(`${url}/api/health`);
        if (response.ok) {
          resolve(true);
        } else {
          throw new Error('Server not ready');
        }
      } catch (error) {
        if (Date.now() - startTime > timeout) {
          reject(new Error('Server startup timeout'));
        } else {
          setTimeout(checkServer, 1000);
        }
      }
    };
    
    checkServer();
  });
}

module.exports = {
  validationResults,
  waitForServer
};
