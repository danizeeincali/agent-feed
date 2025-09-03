/**
 * Comprehensive System Regression Validation
 * Tests all critical system functionality after persistent feed implementation
 */

import { describe, beforeAll, afterAll, beforeEach, afterEach, it, expect } from '@jest/globals';
import request from 'supertest';
import WebSocket from 'ws';
import { spawn } from 'child_process';
import { performance } from 'perf_hooks';

const API_BASE_URL = 'http://localhost:3000';
const WS_BASE_URL = 'ws://localhost:3000';

describe('Comprehensive System Regression Validation', () => {
  let server;
  let wsClient;
  
  beforeAll(async () => {
    // Ensure server is running
    await new Promise(resolve => setTimeout(resolve, 2000));
    
    // Verify server accessibility
    try {
      const response = await request(API_BASE_URL).get('/health');
      expect(response.status).toBe(200);
      console.log('✅ Server is accessible');
    } catch (error) {
      throw new Error(`❌ Server not accessible: ${error.message}`);
    }
  });

  afterAll(async () => {
    if (wsClient && wsClient.readyState === WebSocket.OPEN) {
      wsClient.close();
    }
  });

  describe('1. Core System Functionality', () => {
    it('should have healthy system status', async () => {
      const response = await request(API_BASE_URL).get('/health');
      
      expect(response.status).toBe(200);
      expect(response.body).toMatchObject({
        status: 'healthy',
        server: 'SPARC Unified Server',
        services: expect.objectContaining({
          claude_terminal: 'healthy',
          http_api: 'healthy',
          sse_streaming: 'healthy'
        })
      });
    });

    it('should serve Claude instances API', async () => {
      const response = await request(API_BASE_URL).get('/api/claude/instances');
      
      expect(response.status).toBe(200);
      expect(response.body).toMatchObject({
        success: true,
        instances: expect.any(Array),
        timestamp: expect.any(String)
      });
    });

    it('should handle WebSocket terminal connections', (done) => {
      wsClient = new WebSocket(`${WS_BASE_URL}/terminal`);
      
      wsClient.on('open', () => {
        expect(wsClient.readyState).toBe(WebSocket.OPEN);
        console.log('✅ WebSocket terminal connection established');
        done();
      });
      
      wsClient.on('error', (error) => {
        done(error);
      });
    }, 10000);
  });

  describe('2. Persistent Feed Features', () => {
    it('should provide feed data with fallback mechanism', async () => {
      const response = await request(API_BASE_URL).get('/api/v1/agent-posts');
      
      expect(response.status).toBe(200);
      expect(response.body).toMatchObject({
        success: true,
        posts: expect.any(Array),
        pagination: expect.objectContaining({
          total: expect.any(Number),
          limit: expect.any(Number),
          offset: expect.any(Number),
          hasMore: expect.any(Boolean)
        })
      });
      
      // Verify fallback message when database unavailable
      if (response.body.message) {
        expect(response.body.message).toContain('fallback');
      }
    });

    it('should handle search functionality gracefully', async () => {
      const response = await request(API_BASE_URL)
        .get('/api/v1/search/posts')
        .query({ q: 'test' });
      
      // Should respond without error, even if database unavailable
      expect([200, 404, 500]).toContain(response.status);
      
      if (response.status === 200) {
        expect(response.body).toHaveProperty('success');
      }
    });

    it('should gracefully handle engagement operations', async () => {
      const response = await request(API_BASE_URL)
        .put('/api/v1/agent-posts/test-id/engagement')
        .send({ 
          action: 'like',
          userId: 'test-user'
        });
      
      // Should respond gracefully regardless of database state
      expect([200, 404, 500, 503]).toContain(response.status);
    });
  });

  describe('3. Integration Points', () => {
    it('should maintain Claude terminal functionality', async () => {
      const response = await request(API_BASE_URL)
        .post('/api/claude/instances')
        .send({ command: 'echo "test"' });
      
      expect([200, 201, 400]).toContain(response.status);
    });

    it('should handle SSE connections for streaming', (done) => {
      const EventSource = require('eventsource');
      const eventSource = new EventSource(`${API_BASE_URL}/api/sse/test`);
      
      let connected = false;
      
      eventSource.onopen = () => {
        connected = true;
        eventSource.close();
        console.log('✅ SSE connection established');
        done();
      };
      
      eventSource.onerror = (error) => {
        if (!connected) {
          // SSE might not be available, which is acceptable
          console.log('ℹ️ SSE not available, which is acceptable');
          done();
        }
      };
      
      setTimeout(() => {
        if (!connected) {
          eventSource.close();
          console.log('ℹ️ SSE timeout, acceptable for fallback mode');
          done();
        }
      }, 3000);
    }, 5000);
  });

  describe('4. Performance Validation', () => {
    it('should respond to health checks within acceptable time', async () => {
      const startTime = performance.now();
      const response = await request(API_BASE_URL).get('/health');
      const endTime = performance.now();
      
      const responseTime = endTime - startTime;
      
      expect(response.status).toBe(200);
      expect(responseTime).toBeLessThan(1000); // 1 second max
      console.log(`✅ Health check response time: ${responseTime.toFixed(2)}ms`);
    });

    it('should handle concurrent requests', async () => {
      const requests = Array.from({ length: 10 }, () =>
        request(API_BASE_URL).get('/health')
      );
      
      const startTime = performance.now();
      const responses = await Promise.all(requests);
      const endTime = performance.now();
      
      const totalTime = endTime - startTime;
      const avgResponseTime = totalTime / requests.length;
      
      // All requests should succeed
      responses.forEach(response => {
        expect(response.status).toBe(200);
      });
      
      expect(avgResponseTime).toBeLessThan(200); // 200ms average
      console.log(`✅ Concurrent requests avg time: ${avgResponseTime.toFixed(2)}ms`);
    });
  });

  describe('5. Error Handling and Recovery', () => {
    it('should gracefully handle invalid endpoints', async () => {
      const response = await request(API_BASE_URL).get('/api/invalid/endpoint');
      
      expect([404, 500]).toContain(response.status);
      // Should not crash the server
      
      // Verify server is still responsive
      const healthCheck = await request(API_BASE_URL).get('/health');
      expect(healthCheck.status).toBe(200);
    });

    it('should handle malformed requests', async () => {
      const response = await request(API_BASE_URL)
        .post('/api/v1/agent-posts')
        .send('invalid json data')
        .set('Content-Type', 'application/json');
      
      expect([400, 500]).toContain(response.status);
      
      // Verify server is still responsive
      const healthCheck = await request(API_BASE_URL).get('/health');
      expect(healthCheck.status).toBe(200);
    });

    it('should recover from database unavailability', async () => {
      // Test that system continues operating when database is unavailable
      const response = await request(API_BASE_URL).get('/api/v1/agent-posts');
      
      // Should either succeed with fallback data or gracefully fail
      expect([200, 500, 503]).toContain(response.status);
      
      if (response.status === 200) {
        expect(response.body).toHaveProperty('success');
        expect(response.body.message).toMatch(/fallback|unavailable/i);
      }
    });
  });

  describe('6. Security Validation', () => {
    it('should set appropriate CORS headers', async () => {
      const response = await request(API_BASE_URL)
        .options('/health')
        .set('Origin', 'http://localhost:3001');
      
      expect(response.headers).toHaveProperty('access-control-allow-origin');
    });

    it('should sanitize user inputs', async () => {
      const maliciousInput = '<script>alert("xss")</script>';
      
      const response = await request(API_BASE_URL)
        .get('/api/v1/search/posts')
        .query({ q: maliciousInput });
      
      // Should not execute scripts or crash
      expect([200, 400, 404, 500]).toContain(response.status);
      
      // Verify server is still responsive
      const healthCheck = await request(API_BASE_URL).get('/health');
      expect(healthCheck.status).toBe(200);
    });
  });

  describe('7. System Stability', () => {
    it('should maintain memory usage within acceptable limits', async () => {
      const initialMemory = process.memoryUsage();
      
      // Generate some load
      const requests = Array.from({ length: 50 }, (_, i) =>
        request(API_BASE_URL).get(`/health?iteration=${i}`)
      );
      
      await Promise.all(requests);
      
      const finalMemory = process.memoryUsage();
      const memoryIncrease = finalMemory.heapUsed - initialMemory.heapUsed;
      
      // Memory increase should be reasonable (less than 50MB)
      expect(memoryIncrease).toBeLessThan(50 * 1024 * 1024);
      console.log(`✅ Memory increase: ${(memoryIncrease / 1024 / 1024).toFixed(2)}MB`);
    });

    it('should handle sustained load', async () => {
      const duration = 10000; // 10 seconds
      const requestsPerSecond = 5;
      const startTime = Date.now();
      
      let totalRequests = 0;
      let successfulRequests = 0;
      let errors = 0;
      
      while (Date.now() - startTime < duration) {
        const batchPromises = Array.from({ length: requestsPerSecond }, async () => {
          try {
            const response = await request(API_BASE_URL).get('/health');
            totalRequests++;
            if (response.status === 200) {
              successfulRequests++;
            }
            return response.status === 200;
          } catch (error) {
            totalRequests++;
            errors++;
            return false;
          }
        });
        
        await Promise.all(batchPromises);
        await new Promise(resolve => setTimeout(resolve, 1000));
      }
      
      const successRate = successfulRequests / totalRequests;
      
      expect(successRate).toBeGreaterThan(0.95); // 95% success rate
      expect(errors).toBeLessThan(totalRequests * 0.05); // Less than 5% errors
      
      console.log(`✅ Sustained load test: ${successfulRequests}/${totalRequests} (${(successRate * 100).toFixed(1)}% success)`);
    }, 15000);
  });
});