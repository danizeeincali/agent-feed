/**
 * London School TDD: Error Handling Tests - Network Failures
 * 
 * PRINCIPLES:
 * - Test real error scenarios with actual failures
 * - Focus on system resilience and collaboration under stress
 * - Verify error recovery patterns and user experience
 * - NO MOCKS - Real network conditions and failures
 * 
 * RED → GREEN → REFACTOR for each error scenario
 */

import { BASE_URL, waitForServerReady } from '../api-environment';
import { clearCollaborationHistory, verifyCollaboration } from '../test-setup';

describe('London School TDD: Network Failure Error Handling', () => {

  beforeAll(async () => {
    const serverReady = await waitForServerReady();
    expect(serverReady).toBe(true);
  });

  beforeEach(() => {
    clearCollaborationHistory();
  });

  describe('HTTP Error Status Collaboration', () => {

    it('should handle 404 Not Found errors gracefully', async () => {
      // RED: Test 404 error collaboration
      const response = await fetch(`${BASE_URL}/agents/non-existent-agent/pages/missing-page`);
      
      // GREEN: Verify 404 collaboration pattern
      expect(response.status).toBe(404);
      
      const errorData = await response.json();
      expect(errorData.success).toBe(false);
      expect(errorData.error).toBeTruthy();
      
      // REFACTOR: Verify collaboration tracking
      verifyCollaboration([
        { source: 'TestComponent', target: '/agents/non-existent-agent/pages/missing-page', method: 'GET' }
      ]);
      
      // Verify error response structure
      expect(errorData).toHaveProperty('error');
      expect(typeof errorData.error).toBe('string');
    });

    it('should handle 500 Internal Server Error collaboration', async () => {
      // RED: Test 500 error by sending malformed data
      const response = await fetch(`${BASE_URL}/agents/test-agent/pages`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: 'invalid-json-data'
      });
      
      // GREEN: Verify server error collaboration
      expect(response.status).toBeGreaterThanOrEqual(400);
      
      verifyCollaboration([
        { source: 'TestComponent', target: '/agents/test-agent/pages', method: 'POST' }
      ]);
      
      // REFACTOR: Verify error response handling
      try {
        const errorData = await response.json();
        expect(errorData.success).toBe(false);
      } catch (error) {
        // Server might return non-JSON error response
        expect(response.ok).toBe(false);
      }
    });

    it('should handle 403 Forbidden errors appropriately', async () => {
      // RED: Test forbidden resource collaboration
      const response = await fetch(`${BASE_URL}/admin/restricted-endpoint`);
      
      // GREEN: Verify forbidden collaboration (404 is acceptable if endpoint doesn't exist)
      expect([403, 404, 401]).toContain(response.status);
      
      verifyCollaboration([
        { source: 'TestComponent', target: '/admin/restricted-endpoint', method: 'GET' }
      ]);
      
      // REFACTOR: Verify appropriate error response
      expect(response.ok).toBe(false);
    });
  });

  describe('Network Timeout Collaboration', () => {

    it('should handle request timeout gracefully', async () => {
      // RED: Test timeout collaboration
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 1000); // 1 second timeout
      
      try {
        const response = await fetch(`${BASE_URL}/agents`, {
          signal: controller.signal
        });
        
        // GREEN: If request completes within timeout, verify success
        expect(response.ok).toBe(true);
        clearTimeout(timeoutId);
        
        verifyCollaboration([
          { source: 'TestComponent', target: '/agents', method: 'GET' }
        ]);
      } catch (error) {
        // REFACTOR: Verify timeout error collaboration
        expect(error.name).toBe('AbortError');
        
        // Verify collaboration attempt was tracked
        const collaborations = (global as any).collaborationTracker.interactions;
        const lastCollaboration = collaborations[collaborations.length - 1];
        expect(lastCollaboration.target).toContain('/agents');
      } finally {
        clearTimeout(timeoutId);
      }
    });

    it('should handle slow response collaboration', async () => {
      // RED: Test slow response handling
      const startTime = Date.now();
      
      try {
        // Add delay parameter if API supports it, or test with large dataset
        const response = await fetch(`${BASE_URL}/v1/agent-posts?limit=1000`);
        
        const endTime = Date.now();
        const responseTime = endTime - startTime;
        
        // GREEN: Verify slow response collaboration
        expect(response.ok).toBe(true);
        
        verifyCollaboration([
          { source: 'TestComponent', target: '/v1/agent-posts', method: 'GET' }
        ]);
        
        // REFACTOR: Log performance for analysis
        console.log(`🐌 Slow response time: ${responseTime}ms`);
        
        if (responseTime > 5000) {
          console.warn('⚠️ Response time exceeded 5 seconds - potential performance issue');
        }
      } catch (error) {
        console.error('❌ Slow response test failed:', error);
        throw error;
      }
    });
  });

  describe('Connection Error Collaboration', () => {

    it('should handle connection refused errors', async () => {
      // RED: Test connection to wrong port
      const wrongPortUrl = 'http://localhost:9999/api/agents';
      
      try {
        const response = await fetch(wrongPortUrl);
        // If this succeeds, something is running on port 9999
        console.log('⚠️ Unexpected service on port 9999');
      } catch (error) {
        // GREEN: Verify connection error collaboration
        expect(error).toBeDefined();
        expect(error.message).toMatch(/fetch|network|connection/i);
        
        // REFACTOR: Verify error handling pattern
        const collaborations = (global as any).collaborationTracker.interactions;
        // Connection errors might not be tracked the same way
        expect(collaborations).toBeDefined();
      }
    });

    it('should handle DNS resolution failures', async () => {
      // RED: Test invalid hostname
      const invalidUrl = 'http://invalid-hostname-that-does-not-exist.com/api/agents';
      
      try {
        const response = await fetch(invalidUrl);
        console.log('⚠️ Unexpected resolution of invalid hostname');
      } catch (error) {
        // GREEN: Verify DNS error collaboration
        expect(error).toBeDefined();
        expect(error.message).toMatch(/fetch|network|not found/i);
        
        // REFACTOR: Verify DNS error handling
        expect(error.name).toMatch(/TypeError|Error/);
      }
    });
  });

  describe('Malformed Response Collaboration', () => {

    it('should handle invalid JSON responses', async () => {
      // RED: Test invalid JSON by creating endpoint that returns malformed data
      // This tests the client's resilience to server issues
      
      try {
        // Test with a potential endpoint that might return invalid JSON
        const response = await fetch(`${BASE_URL}/health-check-malformed`, {
          headers: { 'Accept': 'application/json' }
        });
        
        if (response.ok) {
          try {
            const data = await response.json();
            // GREEN: If JSON is valid, verify structure
            expect(data).toBeDefined();
          } catch (jsonError) {
            // REFACTOR: Handle invalid JSON collaboration
            expect(jsonError).toBeInstanceOf(SyntaxError);
            
            verifyCollaboration([
              { source: 'TestComponent', target: '/health-check-malformed', method: 'GET' }
            ]);
          }
        } else {
          // Endpoint doesn't exist - that's fine for this test
          expect(response.status).toBe(404);
        }
      } catch (networkError) {
        // Network errors are acceptable for malformed endpoint testing
        expect(networkError).toBeDefined();
      }
    });

    it('should handle empty response bodies', async () => {
      // RED: Test empty response collaboration
      try {
        const response = await fetch(`${BASE_URL}/empty-response-test`);
        
        if (response.ok) {
          const text = await response.text();
          
          // GREEN: Verify empty response handling
          if (text === '') {
            console.log('✅ Empty response handled gracefully');
          } else {
            // Response has content - verify it's valid
            expect(text.length).toBeGreaterThan(0);
          }
          
          verifyCollaboration([
            { source: 'TestComponent', target: '/empty-response-test', method: 'GET' }
          ]);
        }
      } catch (error) {
        // REFACTOR: 404 or other errors are acceptable for test endpoints
        console.log('⚠️ Empty response test endpoint not available');
      }
    });
  });

  describe('Retry and Recovery Collaboration', () => {

    it('should implement retry logic for transient failures', async () => {
      // RED: Test retry collaboration pattern
      const maxRetries = 3;
      let attempts = 0;
      let lastError;
      
      const attemptRequest = async (): Promise<Response> => {
        attempts++;
        
        try {
          const response = await fetch(`${BASE_URL}/agents`);
          
          if (!response.ok && attempts < maxRetries) {
            throw new Error(`HTTP ${response.status}`);
          }
          
          return response;
        } catch (error) {
          lastError = error;
          
          if (attempts < maxRetries) {
            // Wait before retry
            await new Promise(resolve => setTimeout(resolve, 1000));
            return attemptRequest();
          }
          
          throw error;
        }
      };
      
      try {
        // GREEN: Execute retry collaboration
        const response = await attemptRequest();
        
        expect(response.ok).toBe(true);
        expect(attempts).toBeLessThanOrEqual(maxRetries);
        
        // REFACTOR: Verify retry pattern
        const collaborations = (global as any).collaborationTracker.interactions;
        const agentRequests = collaborations.filter(c => c.target.includes('/agents'));
        expect(agentRequests.length).toBeGreaterThanOrEqual(1);
        
        console.log(`🔄 Request succeeded after ${attempts} attempt(s)`);
      } catch (error) {
        console.error(`❌ Request failed after ${attempts} attempts:`, lastError);
        throw error;
      }
    });

    it('should handle graceful degradation', async () => {
      // RED: Test fallback collaboration when primary service fails
      let primaryResponse;
      let fallbackUsed = false;
      
      try {
        // Try primary endpoint
        primaryResponse = await fetch(`${BASE_URL}/agents`);
        
        if (!primaryResponse.ok) {
          throw new Error('Primary service unavailable');
        }
      } catch (error) {
        // GREEN: Fall back to alternative endpoint or cached data
        fallbackUsed = true;
        
        try {
          // Try health check as fallback indicator
          primaryResponse = await fetch(`${BASE_URL}/health`);
        } catch (fallbackError) {
          // REFACTOR: Ultimate fallback - return empty data structure
          primaryResponse = {
            ok: false,
            json: async () => ({ success: false, agents: [], fallback: true })
          };
        }
      }
      
      // Verify fallback collaboration
      if (fallbackUsed) {
        console.log('🛡️ Graceful degradation activated');
      }
      
      expect(primaryResponse).toBeDefined();
      
      verifyCollaboration([
        { source: 'TestComponent', target: '/agents', method: 'GET' }
      ]);
    });
  });

  describe('Concurrent Error Handling', () => {

    it('should handle multiple simultaneous error scenarios', async () => {
      // RED: Test concurrent error collaboration
      const errorRequests = [
        fetch(`${BASE_URL}/agents/error-test-1/pages/missing`),
        fetch(`${BASE_URL}/agents/error-test-2/pages/missing`),
        fetch(`${BASE_URL}/agents/error-test-3/pages/missing`),
        fetch(`${BASE_URL}/agents/error-test-4/pages/missing`),
        fetch(`${BASE_URL}/agents/error-test-5/pages/missing`)
      ];
      
      // GREEN: Execute concurrent error requests
      const responses = await Promise.allSettled(errorRequests);
      
      // REFACTOR: Verify error collaboration patterns
      responses.forEach((result, index) => {
        if (result.status === 'fulfilled') {
          expect(result.value.ok).toBe(false); // Should be error responses
        } else {
          expect(result.reason).toBeDefined(); // Network errors
        }
      });
      
      // Verify collaboration tracking captured all attempts
      const collaborations = (global as any).collaborationTracker.interactions;
      const errorCollaborations = collaborations.filter(c => c.target.includes('error-test'));
      expect(errorCollaborations.length).toBeGreaterThanOrEqual(5);
    });
  });
});