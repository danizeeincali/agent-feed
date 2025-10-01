/**
 * @test Avi DM Claude Code Integration Tests
 * @description Integration tests for real Claude Code API in Avi DM
 * @prerequisites
 *   - Backend API server running
 *   - CLAUDE.md exists in /prod
 *   - Real Claude Code SDK configured
 */

import { describe, it, expect, beforeAll, afterAll, beforeEach, vi } from 'vitest';

const API_BASE = process.env.VITE_API_URL || 'http://localhost:3001';
const STREAMING_CHAT_ENDPOINT = `${API_BASE}/api/claude-code/streaming-chat`;

interface ChatMessage {
  role: 'user' | 'assistant';
  content: string;
}

interface ClaudeResponse {
  response: string;
  toolsUsed?: string[];
  metadata?: {
    tokensUsed?: number;
    modelUsed?: string;
    responseTime?: number;
  };
  error?: string;
}

describe('Avi DM Claude Code Integration Tests', () => {
  let chatHistory: ChatMessage[] = [];

  beforeEach(() => {
    chatHistory = [];
  });

  describe('Real API Call Tests', () => {
    it('should successfully call /api/claude-code/streaming-chat', async () => {
      const response = await fetch(STREAMING_CHAT_ENDPOINT, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          message: 'Hello, who are you?',
          history: []
        })
      });

      expect(response.ok).toBe(true);
      expect(response.status).toBe(200);

      const data: ClaudeResponse = await response.json();

      expect(data).toHaveProperty('response');
      expect(typeof data.response).toBe('string');
      expect(data.response.length).toBeGreaterThan(0);
    }, 30000);

    it('should return real Claude response (not mock)', async () => {
      const response = await fetch(STREAMING_CHAT_ENDPOINT, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          message: 'What is 2+2?',
          history: []
        })
      });

      const data: ClaudeResponse = await response.json();

      // Real Claude should not return template responses
      expect(data.response).not.toMatch(/Thanks for your message/i);
      expect(data.response).not.toMatch(/simulated/i);
      expect(data.response).not.toMatch(/mock/i);

      // Should contain actual answer
      expect(data.response.toLowerCase()).toContain('4');
    }, 30000);

    it('should include conversation history in subsequent calls', async () => {
      // First message
      const firstResponse = await fetch(STREAMING_CHAT_ENDPOINT, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          message: 'My favorite color is blue.',
          history: []
        })
      });

      const firstData: ClaudeResponse = await firstResponse.json();
      chatHistory.push({ role: 'user', content: 'My favorite color is blue.' });
      chatHistory.push({ role: 'assistant', content: firstData.response });

      // Second message referencing first
      const secondResponse = await fetch(STREAMING_CHAT_ENDPOINT, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          message: 'What is my favorite color?',
          history: chatHistory
        })
      });

      const secondData: ClaudeResponse = await secondResponse.json();

      // Should remember context
      expect(secondData.response.toLowerCase()).toContain('blue');
    }, 60000);

    it('should handle complex multi-turn conversations', async () => {
      const messages = [
        'I have a variable x = 5',
        'Now add 3 to x',
        'What is the final value?'
      ];

      for (const message of messages) {
        chatHistory.push({ role: 'user', content: message });

        const response = await fetch(STREAMING_CHAT_ENDPOINT, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            message,
            history: chatHistory.slice(0, -1) // All except current message
          })
        });

        const data: ClaudeResponse = await response.json();
        chatHistory.push({ role: 'assistant', content: data.response });
      }

      // Final response should reference the calculation
      const finalResponse = chatHistory[chatHistory.length - 1].content;
      expect(finalResponse.toLowerCase()).toMatch(/8|eight/);
    }, 90000);
  });

  describe('CLAUDE.md System Context Tests', () => {
    it('should include CLAUDE.md system context in responses', async () => {
      const response = await fetch(STREAMING_CHAT_ENDPOINT, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          message: 'Who are you and what is your purpose?',
          history: []
        })
      });

      const data: ClaudeResponse = await response.json();

      // Should identify as Λvi based on CLAUDE.md
      const lowerResponse = data.response.toLowerCase();
      expect(
        lowerResponse.includes('avi') ||
        lowerResponse.includes('λvi') ||
        lowerResponse.includes('personal ai assistant')
      ).toBe(true);
    }, 30000);

    it('should reference system context without explicitly being asked', async () => {
      const response = await fetch(STREAMING_CHAT_ENDPOINT, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          message: 'What can you help me with?',
          history: []
        })
      });

      const data: ClaudeResponse = await response.json();

      // Should mention capabilities from CLAUDE.md
      const lowerResponse = data.response.toLowerCase();
      expect(
        lowerResponse.includes('help') ||
        lowerResponse.includes('assist') ||
        lowerResponse.includes('support')
      ).toBe(true);

      // Should have substantive response
      expect(data.response.length).toBeGreaterThan(100);
    }, 30000);

    it('should access CLAUDE.md via Read tool in /prod directory', async () => {
      const response = await fetch(STREAMING_CHAT_ENDPOINT, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          message: 'Can you read your system instructions from CLAUDE.md?',
          history: []
        })
      });

      const data: ClaudeResponse = await response.json();

      // Should indicate successful read or reference the file
      const lowerResponse = data.response.toLowerCase();
      expect(
        lowerResponse.includes('claude.md') ||
        lowerResponse.includes('system') ||
        lowerResponse.includes('instructions')
      ).toBe(true);

      // Should have tool usage if SDK reports it
      if (data.toolsUsed) {
        expect(data.toolsUsed).toContain('Read');
      }
    }, 30000);
  });

  describe('Response Parsing Tests', () => {
    it('should parse JSON response format correctly', async () => {
      const response = await fetch(STREAMING_CHAT_ENDPOINT, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          message: 'Hello',
          history: []
        })
      });

      expect(response.headers.get('content-type')).toContain('application/json');

      const data: ClaudeResponse = await response.json();

      expect(data).toBeTypeOf('object');
      expect(data).toHaveProperty('response');
    }, 30000);

    it('should handle streaming response format', async () => {
      const response = await fetch(STREAMING_CHAT_ENDPOINT, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          message: 'Tell me a short story',
          history: []
        })
      });

      const data: ClaudeResponse = await response.json();

      // Response should be complete (not cut off)
      expect(data.response.length).toBeGreaterThan(50);
      expect(data.response.trim()).toBeTruthy();

      // Should not have streaming artifacts
      expect(data.response).not.toContain('undefined');
      expect(data.response).not.toContain('[object Object]');
    }, 30000);

    it('should parse tool usage metadata', async () => {
      const response = await fetch(STREAMING_CHAT_ENDPOINT, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          message: 'List files in the current directory',
          history: []
        })
      });

      const data: ClaudeResponse = await response.json();

      // If tools are used, metadata should be present
      if (data.toolsUsed && data.toolsUsed.length > 0) {
        expect(Array.isArray(data.toolsUsed)).toBe(true);
        expect(data.toolsUsed.every(tool => typeof tool === 'string')).toBe(true);
      }
    }, 30000);

    it('should parse various response formats (markdown, code, plain text)', async () => {
      const testCases = [
        { message: 'Write a markdown list of 3 colors', expectFormat: 'markdown' },
        { message: 'Show me a hello world in Python', expectFormat: 'code' },
        { message: 'Say hello', expectFormat: 'text' }
      ];

      for (const testCase of testCases) {
        const response = await fetch(STREAMING_CHAT_ENDPOINT, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            message: testCase.message,
            history: []
          })
        });

        const data: ClaudeResponse = await response.json();

        expect(data.response).toBeTruthy();
        expect(typeof data.response).toBe('string');

        // Check for expected format markers
        if (testCase.expectFormat === 'markdown') {
          expect(data.response).toMatch(/[-*]|\d\./);
        } else if (testCase.expectFormat === 'code') {
          expect(
            data.response.includes('print') ||
            data.response.includes('def') ||
            data.response.includes('```')
          ).toBe(true);
        }
      }
    }, 90000);
  });

  describe('Error Recovery Tests', () => {
    it('should handle malformed requests gracefully', async () => {
      const response = await fetch(STREAMING_CHAT_ENDPOINT, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          // Missing required 'message' field
          history: []
        })
      });

      expect(response.ok).toBe(false);
      expect([400, 422, 500]).toContain(response.status);

      const data = await response.json();
      expect(data).toHaveProperty('error');
    }, 30000);

    it('should provide user feedback on API errors', async () => {
      // Intentionally invalid request
      const response = await fetch(STREAMING_CHAT_ENDPOINT, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: 'invalid json'
      });

      expect(response.ok).toBe(false);

      const text = await response.text();
      expect(text.length).toBeGreaterThan(0);
    }, 30000);

    it('should handle empty message gracefully', async () => {
      const response = await fetch(STREAMING_CHAT_ENDPOINT, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          message: '',
          history: []
        })
      });

      // Should either reject or return helpful error
      if (!response.ok) {
        expect(response.status).toBeGreaterThanOrEqual(400);
      } else {
        const data: ClaudeResponse = await response.json();
        expect(data).toHaveProperty('error');
      }
    }, 30000);

    it('should recover from transient failures', async () => {
      const maxRetries = 3;
      let lastError: Error | null = null;

      for (let attempt = 0; attempt < maxRetries; attempt++) {
        try {
          const response = await fetch(STREAMING_CHAT_ENDPOINT, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              message: 'Test recovery',
              history: []
            })
          });

          if (response.ok) {
            const data: ClaudeResponse = await response.json();
            expect(data.response).toBeTruthy();
            break; // Success
          } else {
            lastError = new Error(`HTTP ${response.status}`);
          }
        } catch (error) {
          lastError = error as Error;
          if (attempt === maxRetries - 1) {
            throw error;
          }
          await new Promise(resolve => setTimeout(resolve, 1000));
        }
      }

      // Should eventually succeed or have specific error
      expect(lastError).toBeNull();
    }, 90000);
  });

  describe('Avi Identity Verification (Λvi-specific)', () => {
    it('should respond with Λvi personality (not generic Claude)', async () => {
      const response = await fetch(STREAMING_CHAT_ENDPOINT, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          message: 'Introduce yourself',
          history: []
        })
      });

      const data: ClaudeResponse = await response.json();

      // Should NOT introduce as generic Claude
      expect(data.response.toLowerCase()).not.toContain('i am claude');
      expect(data.response.toLowerCase()).not.toContain('i\'m claude');

      // Should reference Avi identity
      const lowerResponse = data.response.toLowerCase();
      expect(
        lowerResponse.includes('avi') ||
        lowerResponse.includes('λvi') ||
        lowerResponse.includes('personal assistant')
      ).toBe(true);
    }, 30000);

    it('should maintain Avi identity across conversation', async () => {
      const messages = [
        'What is your name?',
        'Tell me more about yourself',
        'What are you designed to do?'
      ];

      const responses: string[] = [];

      for (const message of messages) {
        chatHistory.push({ role: 'user', content: message });

        const response = await fetch(STREAMING_CHAT_ENDPOINT, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            message,
            history: chatHistory.slice(0, -1)
          })
        });

        const data: ClaudeResponse = await response.json();
        responses.push(data.response.toLowerCase());
        chatHistory.push({ role: 'assistant', content: data.response });
      }

      // Should consistently reference Avi identity
      const aviMentions = responses.filter(r =>
        r.includes('avi') || r.includes('λvi')
      ).length;

      expect(aviMentions).toBeGreaterThan(0);

      // Should not switch to Claude identity
      const claudeMentions = responses.filter(r =>
        r.includes('i am claude') || r.includes('i\'m claude')
      ).length;

      expect(claudeMentions).toBe(0);
    }, 90000);

    it('should reference system context appropriately', async () => {
      const response = await fetch(STREAMING_CHAT_ENDPOINT, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          message: 'What are your capabilities?',
          history: []
        })
      });

      const data: ClaudeResponse = await response.json();

      // Should provide specific, not generic, capabilities
      expect(data.response.length).toBeGreaterThan(100);

      // Should be personalized
      const lowerResponse = data.response.toLowerCase();
      expect(
        lowerResponse.includes('help') ||
        lowerResponse.includes('assist') ||
        lowerResponse.includes('support')
      ).toBe(true);
    }, 30000);
  });

  describe('Performance Tests', () => {
    it('should respond within reasonable time (<10s)', async () => {
      const startTime = Date.now();

      const response = await fetch(STREAMING_CHAT_ENDPOINT, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          message: 'Hello',
          history: []
        })
      });

      await response.json();

      const endTime = Date.now();
      const duration = endTime - startTime;

      expect(duration).toBeLessThan(10000); // 10 seconds
    }, 30000);

    it('should NOT have artificial 1000ms delay', async () => {
      const startTime = Date.now();

      const response = await fetch(STREAMING_CHAT_ENDPOINT, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          message: 'Quick test',
          history: []
        })
      });

      await response.json();

      const endTime = Date.now();
      const duration = endTime - startTime;

      // Should not be exactly 1000ms (mock delay)
      expect(Math.abs(duration - 1000)).toBeGreaterThan(100);
    }, 30000);
  });
});
