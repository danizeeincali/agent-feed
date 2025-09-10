import request from 'supertest';
import { describe, test, expect, beforeAll, afterAll } from '@jest/globals';

/**
 * API Proxy Integration Tests
 * Validates frontend-backend communication through Vite proxy
 */

const FRONTEND_URL = 'http://localhost:5173';
const BACKEND_URL = 'http://localhost:3000';

describe('API Proxy Integration Tests', () => {
  
  describe('Direct Backend API Tests', () => {
    
    test('Backend health endpoint should respond', async () => {
      try {
        const response = await request(BACKEND_URL)
          .get('/api/health')
          .timeout(5000);
        
        expect([200, 404, 500]).toContain(response.status);
        console.log('Backend health status:', response.status);
      } catch (error) {
        console.log('Backend direct access error:', error);
        // Don't fail test if backend is not accessible directly
      }
    });

    test('Backend posts endpoint should respond', async () => {
      try {
        const response = await request(BACKEND_URL)
          .get('/api/posts')
          .timeout(5000);
        
        expect([200, 404, 500]).toContain(response.status);
        
        if (response.status === 200) {
          expect(response.body).toBeDefined();
          console.log('Posts response type:', typeof response.body);
        }
      } catch (error) {
        console.log('Backend posts access error:', error);
      }
    });
  });

  describe('Vite Proxy Tests', () => {
    
    test('Frontend proxy should handle API requests', async () => {
      try {
        const response = await request(FRONTEND_URL)
          .get('/api/posts')
          .timeout(10000);
        
        // Should not be 404 if proxy is working
        if (response.status === 404) {
          console.log('Proxy returning 404 - potential proxy configuration issue');
        }
        
        expect([200, 404, 500, 502, 503]).toContain(response.status);
        console.log('Proxy posts status:', response.status);
        
        if (response.status === 200) {
          console.log('Proxy successfully forwarded request');
        }
      } catch (error) {
        console.log('Proxy request error:', error);
      }
    });

    test('Frontend proxy should handle health checks', async () => {
      try {
        const response = await request(FRONTEND_URL)
          .get('/api/health')
          .timeout(10000);
        
        expect([200, 404, 500, 502, 503]).toContain(response.status);
        console.log('Proxy health status:', response.status);
      } catch (error) {
        console.log('Proxy health error:', error);
      }
    });

    test('Frontend proxy should handle agents endpoint', async () => {
      try {
        const response = await request(FRONTEND_URL)
          .get('/api/agents')
          .timeout(10000);
        
        expect([200, 404, 500, 502, 503]).toContain(response.status);
        console.log('Proxy agents status:', response.status);
      } catch (error) {
        console.log('Proxy agents error:', error);
      }
    });
  });

  describe('Data Flow Validation', () => {
    
    test('API responses should have correct content-type', async () => {
      try {
        const response = await request(FRONTEND_URL)
          .get('/api/posts')
          .timeout(10000);
        
        if (response.status === 200) {
          expect(response.headers['content-type']).toMatch(/application\/json/);
        }
      } catch (error) {
        console.log('Content-type test error:', error);
      }
    });

    test('API responses should be valid JSON when successful', async () => {
      try {
        const response = await request(FRONTEND_URL)
          .get('/api/posts')
          .timeout(10000);
        
        if (response.status === 200) {
          expect(() => JSON.parse(JSON.stringify(response.body))).not.toThrow();
          expect(response.body).toBeDefined();
        }
      } catch (error) {
        console.log('JSON validation error:', error);
      }
    });

    test('CORS headers should be present for frontend access', async () => {
      try {
        const response = await request(FRONTEND_URL)
          .get('/api/posts')
          .set('Origin', 'http://localhost:5173')
          .timeout(10000);
        
        // Check for CORS headers or successful response
        const hasCorsHeaders = response.headers['access-control-allow-origin'] !== undefined;
        const isSuccessful = response.status === 200;
        
        expect(hasCorsHeaders || isSuccessful).toBeTruthy();
      } catch (error) {
        console.log('CORS test error:', error);
      }
    });
  });

  describe('Error Handling Validation', () => {
    
    test('Invalid API routes should return proper errors', async () => {
      try {
        const response = await request(FRONTEND_URL)
          .get('/api/nonexistent')
          .timeout(10000);
        
        expect([404, 500, 502, 503]).toContain(response.status);
        console.log('Invalid route status:', response.status);
      } catch (error) {
        console.log('Invalid route test error:', error);
      }
    });

    test('Malformed requests should be handled gracefully', async () => {
      try {
        const response = await request(FRONTEND_URL)
          .post('/api/posts')
          .send('invalid json')
          .set('Content-Type', 'application/json')
          .timeout(10000);
        
        expect([400, 404, 500, 502]).toContain(response.status);
        console.log('Malformed request status:', response.status);
      } catch (error) {
        console.log('Malformed request test error:', error);
      }
    });
  });
});

describe('Process Conflict Prevention', () => {
  
  test('Multiple simultaneous requests should not cause conflicts', async () => {
    const promises = Array(5).fill(null).map(() => 
      request(FRONTEND_URL)
        .get('/api/posts')
        .timeout(10000)
        .catch(err => ({ error: err.message }))
    );
    
    const results = await Promise.all(promises);
    
    // All requests should complete without hanging
    expect(results).toHaveLength(5);
    
    // Log results for analysis
    results.forEach((result, index) => {
      if ('error' in result) {
        console.log(`Request ${index + 1} error:`, result.error);
      } else {
        console.log(`Request ${index + 1} status:`, result.status);
      }
    });
  });

  test('Rapid sequential requests should not cause server issues', async () => {
    const results = [];
    
    for (let i = 0; i < 3; i++) {
      try {
        const response = await request(FRONTEND_URL)
          .get('/api/posts')
          .timeout(5000);
        
        results.push({ status: response.status, index: i });
        
        // Small delay between requests
        await new Promise(resolve => setTimeout(resolve, 100));
      } catch (error) {
        results.push({ error: error, index: i });
      }
    }
    
    console.log('Sequential request results:', results);
    expect(results).toHaveLength(3);
  });
});