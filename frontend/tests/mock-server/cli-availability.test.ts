/**
 * Mock Server Tests for CLI Availability Endpoint
 * Tests that simulate various backend server responses
 * to validate frontend handling of different scenarios
 */

import { describe, it, expect, beforeEach, afterEach, vi, beforeAll, afterAll } from 'vitest';
import { setupServer } from 'msw/node';
import { http, HttpResponse } from 'msw';

// Mock server setup
const server = setupServer();

beforeAll(() => {
  server.listen({ onUnhandledRequest: 'error' });
});

afterEach(() => {
  server.resetHandlers();
});

afterAll(() => {
  server.close();
});

// Helper to make API calls like the frontend does
const makeApiCall = async (endpoint: string) => {
  const response = await fetch(`http://localhost:3002/api/claude${endpoint}`, {
    method: 'GET',
    headers: {
      'Content-Type': 'application/json',
    },
  });
  
  if (!response.ok) {
    throw new Error(`HTTP ${response.status}: ${response.statusText}`);
  }
  
  return await response.json();
};

describe('CLI Availability Mock Server Tests', () => {
  describe('Successful CLI Detection Responses', () => {
    it('should return claudeAvailable: true when CLI is found', async () => {
      // ARRANGE
      server.use(
        http.get('http://localhost:3002/api/claude/check', () => {
          return HttpResponse.json({
            success: true,
            message: 'Claude Code CLI found at /usr/local/bin/claude',
            claudeAvailable: true
          });
        })
      );

      // ACT
      const response = await makeApiCall('/check');

      // ASSERT
      expect(response.success).toBe(true);
      expect(response.claudeAvailable).toBe(true);
      expect(response.message).toContain('found');
    });

    it('should return claudeAvailable: false when CLI is not found', async () => {
      // ARRANGE
      server.use(
        http.get('http://localhost:3002/api/claude/check', () => {
          return HttpResponse.json({
            success: true,
            message: 'Claude Code CLI not found',
            claudeAvailable: false
          });
        })
      );

      // ACT
      const response = await makeApiCall('/check');

      // ASSERT
      expect(response.success).toBe(true);
      expect(response.claudeAvailable).toBe(false);
      expect(response.message).toContain('not found');
    });
  });

  describe('Error Response Scenarios', () => {
    it('should handle 500 server error', async () => {
      // ARRANGE
      server.use(
        http.get('http://localhost:3002/api/claude/check', () => {
          return new HttpResponse(null, {
            status: 500,
            statusText: 'Internal Server Error'
          });
        })
      );

      // ACT & ASSERT
      await expect(makeApiCall('/check')).rejects.toThrow('HTTP 500: Internal Server Error');
    });

    it('should handle 404 endpoint not found', async () => {
      // ARRANGE
      server.use(
        http.get('http://localhost:3002/api/claude/check', () => {
          return new HttpResponse(null, {
            status: 404,
            statusText: 'Not Found'
          });
        })
      );

      // ACT & ASSERT
      await expect(makeApiCall('/check')).rejects.toThrow('HTTP 404: Not Found');
    });

    it('should handle network timeout', async () => {
      // ARRANGE
      server.use(
        http.get('http://localhost:3002/api/claude/check', async () => {
          // Simulate a long delay that would timeout
          await new Promise(resolve => setTimeout(resolve, 10000));
          return HttpResponse.json({ success: true });
        })
      );

      // ACT & ASSERT
      // Note: This would need AbortController in real implementation
      // For now, we'll test the concept
      const controller = new AbortController();
      setTimeout(() => controller.abort(), 1000);

      await expect(fetch('http://localhost:3002/api/claude/check', {
        signal: controller.signal
      })).rejects.toThrow();
    });
  });

  describe('Malformed Response Scenarios', () => {
    it('should handle response missing claudeAvailable field', async () => {
      // ARRANGE
      server.use(
        http.get('http://localhost:3002/api/claude/check', () => {
          return HttpResponse.json({
            success: true,
            message: 'Response without claudeAvailable field'
            // claudeAvailable field is intentionally missing
          });
        })
      );

      // ACT
      const response = await makeApiCall('/check');

      // ASSERT
      expect(response.success).toBe(true);
      expect(response.claudeAvailable).toBeUndefined();
      
      // Simulate frontend logic
      const availabilityResult = response.claudeAvailable || false;
      expect(availabilityResult).toBe(false);
    });

    it('should handle null claudeAvailable field', async () => {
      // ARRANGE
      server.use(
        http.get('http://localhost:3002/api/claude/check', () => {
          return HttpResponse.json({
            success: true,
            message: 'Response with null claudeAvailable',
            claudeAvailable: null
          });
        })
      );

      // ACT
      const response = await makeApiCall('/check');

      // ASSERT
      expect(response.success).toBe(true);
      expect(response.claudeAvailable).toBe(null);
      
      // Simulate frontend logic
      const availabilityResult = response.claudeAvailable || false;
      expect(availabilityResult).toBe(false);
    });

    it('should handle invalid JSON response', async () => {
      // ARRANGE
      server.use(
        http.get('http://localhost:3002/api/claude/check', () => {
          return new HttpResponse('invalid json{', {
            status: 200,
            headers: {
              'Content-Type': 'application/json'
            }
          });
        })
      );

      // ACT & ASSERT
      await expect(makeApiCall('/check')).rejects.toThrow();
    });

    it('should handle empty response', async () => {
      // ARRANGE
      server.use(
        http.get('http://localhost:3002/api/claude/check', () => {
          return new HttpResponse('', {
            status: 200,
            headers: {
              'Content-Type': 'application/json'
            }
          });
        })
      );

      // ACT & ASSERT
      await expect(makeApiCall('/check')).rejects.toThrow();
    });
  });

  describe('Various Data Type Scenarios', () => {
    it('should handle string value for claudeAvailable', async () => {
      // ARRANGE
      server.use(
        http.get('http://localhost:3002/api/claude/check', () => {
          return HttpResponse.json({
            success: true,
            message: 'String value for claudeAvailable',
            claudeAvailable: 'true' // String instead of boolean
          });
        })
      );

      // ACT
      const response = await makeApiCall('/check');

      // ASSERT
      expect(response.claudeAvailable).toBe('true');
      
      // Test frontend logic handling
      const availabilityResult = response.claudeAvailable || false;
      expect(availabilityResult).toBe('true'); // Truthy string
    });

    it('should handle number value for claudeAvailable', async () => {
      // ARRANGE
      server.use(
        http.get('http://localhost:3002/api/claude/check', () => {
          return HttpResponse.json({
            success: true,
            message: 'Number value for claudeAvailable',
            claudeAvailable: 1 // Number instead of boolean
          });
        })
      );

      // ACT
      const response = await makeApiCall('/check');

      // ASSERT
      expect(response.claudeAvailable).toBe(1);
      
      // Test frontend logic handling
      const availabilityResult = response.claudeAvailable || false;
      expect(availabilityResult).toBe(1); // Truthy number
    });

    it('should handle array value for claudeAvailable', async () => {
      // ARRANGE
      server.use(
        http.get('http://localhost:3002/api/claude/check', () => {
          return HttpResponse.json({
            success: true,
            message: 'Array value for claudeAvailable',
            claudeAvailable: ['claude', 'found'] // Array instead of boolean
          });
        })
      );

      // ACT
      const response = await makeApiCall('/check');

      // ASSERT
      expect(Array.isArray(response.claudeAvailable)).toBe(true);
      
      // Test frontend logic handling
      const availabilityResult = response.claudeAvailable || false;
      expect(availabilityResult).toEqual(['claude', 'found']); // Truthy array
    });
  });

  describe('CORS and Headers Scenarios', () => {
    it('should handle missing CORS headers', async () => {
      // ARRANGE
      server.use(
        http.get('http://localhost:3002/api/claude/check', () => {
          return HttpResponse.json(
            {
              success: true,
              claudeAvailable: true
            },
            {
              headers: {
                // Intentionally missing CORS headers
                'Content-Type': 'application/json'
              }
            }
          );
        })
      );

      // ACT
      const response = await makeApiCall('/check');

      // ASSERT
      expect(response.success).toBe(true);
    });

    it('should handle incorrect Content-Type header', async () => {
      // ARRANGE
      server.use(
        http.get('http://localhost:3002/api/claude/check', () => {
          return HttpResponse.json(
            {
              success: true,
              claudeAvailable: true
            },
            {
              headers: {
                'Content-Type': 'text/plain' // Wrong content type
              }
            }
          );
        })
      );

      // ACT
      const response = await makeApiCall('/check');

      // ASSERT
      expect(response.success).toBe(true);
    });
  });

  describe('Performance and Load Scenarios', () => {
    it('should handle slow response (2 second delay)', async () => {
      // ARRANGE
      server.use(
        http.get('http://localhost:3002/api/claude/check', async () => {
          await new Promise(resolve => setTimeout(resolve, 2000));
          return HttpResponse.json({
            success: true,
            claudeAvailable: true
          });
        })
      );

      // ACT
      const startTime = Date.now();
      const response = await makeApiCall('/check');
      const endTime = Date.now();

      // ASSERT
      expect(response.success).toBe(true);
      expect(endTime - startTime).toBeGreaterThan(1900); // Allow for some variance
    });

    it('should handle multiple concurrent requests', async () => {
      // ARRANGE
      server.use(
        http.get('http://localhost:3002/api/claude/check', () => {
          return HttpResponse.json({
            success: true,
            claudeAvailable: true,
            timestamp: Date.now()
          });
        })
      );

      // ACT
      const promises = Array.from({ length: 5 }, () => makeApiCall('/check'));
      const responses = await Promise.all(promises);

      // ASSERT
      expect(responses).toHaveLength(5);
      responses.forEach(response => {
        expect(response.success).toBe(true);
        expect(response.claudeAvailable).toBe(true);
      });
    });
  });

  describe('CRITICAL: User Bug Reproduction', () => {
    it('should reproduce working backend with CLI available scenario', async () => {
      // This test simulates the exact scenario the user reported:
      // Backend server running on port 3002, CLI detected as available
      
      // ARRANGE - Mock the backend responding correctly
      server.use(
        http.get('http://localhost:3002/api/claude/check', () => {
          return HttpResponse.json({
            success: true,
            message: 'Claude Code CLI found at /usr/local/bin/claude',
            claudeAvailable: true // Backend correctly detects CLI
          });
        })
      );

      // ACT - Make the same API call as frontend
      const response = await makeApiCall('/check');

      // ASSERT - This should work perfectly
      expect(response.success).toBe(true);
      expect(response.claudeAvailable).toBe(true);
      expect(response.message).toContain('found');
      
      // Simulate the frontend logic from SimpleLauncher
      const availabilityResult = response.claudeAvailable || false;
      expect(availabilityResult).toBe(true);
      
      // UI state should be correct
      const shouldShowWarning = !availabilityResult;
      const shouldDisableButtons = !availabilityResult;
      
      expect(shouldShowWarning).toBe(false);
      expect(shouldDisableButtons).toBe(false);
    });

    it('should test the exact API endpoint and format used by frontend', async () => {
      // ARRANGE - Test the exact endpoint structure
      const endpoint = '/check';
      const fullUrl = `http://localhost:3002/api/claude${endpoint}`;
      
      server.use(
        http.get(fullUrl, () => {
          return HttpResponse.json({
            success: true,
            claudeAvailable: true
          });
        })
      );

      // ACT - Use exact same fetch call as SimpleLauncher
      const response = await fetch(fullUrl, {
        method: 'GET',
        headers: {
          'Content-Type': 'application/json',
        },
      });
      
      expect(response.ok).toBe(true);
      
      const jsonData = await response.json();
      
      // Replicate exact logic from SimpleLauncher line 107
      const availabilityResult = jsonData.claudeAvailable || false;

      // ASSERT - This should work exactly as expected
      expect(availabilityResult).toBe(true);
    });
  });
});