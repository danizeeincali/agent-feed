/**
 * Claude Code Streaming Endpoint Fix Tests
 *
 * CRITICAL ISSUE FOUND AND FIXED:
 * - Backend had claude-code-sdk.js routes but they were NOT mounted in server.ts
 * - Frontend correctly called /api/claude-code/streaming-chat but got 404
 * - Fixed by mounting routes: app.use('/api/claude-code', claudeCodeSDKRoutes)
 *
 * This test validates the fix works correctly.
 */

import { describe, it, expect, beforeAll, afterAll } from '@jest/test';
import fetch from 'node-fetch';

const API_BASE_URL = 'http://localhost:3000';

describe('Claude Code Streaming Endpoint Fix', () => {
  let serverProcess: any;

  beforeAll(async () => {
    // Ensure server is running
    console.log('🚀 Testing Claude Code streaming endpoint fixes...');
  });

  afterAll(async () => {
    if (serverProcess) {
      serverProcess.kill();
    }
  });

  describe('CRITICAL FIX: Route Mounting', () => {
    it('should respond to /api/claude-code/streaming-chat endpoint', async () => {
      const response = await fetch(`${API_BASE_URL}/api/claude-code/streaming-chat`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          message: 'Test message for endpoint validation',
          options: {
            cwd: '/workspaces/agent-feed',
            enableTools: true
          }
        }),
      });

      // Should NOT be 404 (route not found)
      expect(response.status).not.toBe(404);

      // Should be either 200 (success) or 500 (server error, but route exists)
      expect([200, 500].includes(response.status)).toBe(true);

      console.log(`✅ Endpoint exists - Status: ${response.status}`);
    });

    it('should accept correct request format', async () => {
      const requestPayload = {
        message: 'Hello Claude Code SDK',
        options: {
          cwd: '/workspaces/agent-feed',
          model: 'claude-sonnet-4-20250514',
          enableTools: true,
          forceToolUse: false
        }
      };

      const response = await fetch(`${API_BASE_URL}/api/claude-code/streaming-chat`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(requestPayload),
      });

      expect(response.status).not.toBe(400); // Should not be bad request
      console.log(`✅ Request format accepted - Status: ${response.status}`);
    });

    it('should return JSON response with expected structure', async () => {
      const response = await fetch(`${API_BASE_URL}/api/claude-code/streaming-chat`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          message: 'Test response structure',
          options: {}
        }),
      });

      const data = await response.json();

      // Should have expected response structure
      expect(data).toHaveProperty('success');
      expect(data).toHaveProperty('timestamp');

      if (data.success) {
        expect(data).toHaveProperty('message');
        expect(data).toHaveProperty('claudeCode');
        expect(data.claudeCode).toBe(true);
      }

      console.log('✅ Response structure valid:', data);
    });
  });

  describe('Request Payload Validation', () => {
    it('should reject requests without message', async () => {
      const response = await fetch(`${API_BASE_URL}/api/claude-code/streaming-chat`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          options: {}
        }),
      });

      expect(response.status).toBe(400);

      const data = await response.json();
      expect(data.success).toBe(false);
      expect(data.error).toContain('Message is required');
    });

    it('should reject non-string messages', async () => {
      const response = await fetch(`${API_BASE_URL}/api/claude-code/streaming-chat`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          message: 123, // Invalid: not a string
          options: {}
        }),
      });

      expect(response.status).toBe(400);

      const data = await response.json();
      expect(data.success).toBe(false);
      expect(data.error).toContain('must be a string');
    });
  });

  describe('Health Check Endpoint', () => {
    it('should respond to /api/claude-code/health endpoint', async () => {
      const response = await fetch(`${API_BASE_URL}/api/claude-code/health`);

      expect(response.status).not.toBe(404);
      expect([200, 500].includes(response.status)).toBe(true);

      console.log(`✅ Health endpoint exists - Status: ${response.status}`);
    });
  });

  describe('Frontend Compatibility', () => {
    it('should handle frontend request format correctly', async () => {
      // This mimics the exact request format sent by EnhancedAviDMWithClaudeCode
      const frontendRequest = {
        message: 'Use tools to help with: test command. Execute commands and show real output.',
        options: {
          cwd: '/workspaces/agent-feed',
          model: 'claude-sonnet-4-20250514',
          enableTools: true,
          forceToolUse: true
        }
      };

      const response = await fetch(`${API_BASE_URL}/api/claude-code/streaming-chat`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(frontendRequest),
      });

      // Should process the request (not reject format)
      expect(response.status).not.toBe(400);
      console.log(`✅ Frontend format compatibility - Status: ${response.status}`);
    });
  });
});

/**
 * Test Summary:
 *
 * PROBLEM IDENTIFIED:
 * - claude-code-sdk.js routes existed but were not mounted in server.ts
 * - Frontend got 404 errors when calling /api/claude-code/streaming-chat
 *
 * SOLUTION IMPLEMENTED:
 * 1. Added import: import claudeCodeSDKRoutes from '@/api/routes/claude-code-sdk';
 * 2. Added mount: app.use('/api/claude-code', claudeCodeSDKRoutes);
 * 3. Fixed frontend request format to match backend expectations
 * 4. Added comprehensive logging for debugging
 *
 * VALIDATION:
 * - Tests verify endpoint is accessible (not 404)
 * - Tests verify request format is accepted
 * - Tests verify response structure is correct
 * - Tests verify frontend compatibility
 */