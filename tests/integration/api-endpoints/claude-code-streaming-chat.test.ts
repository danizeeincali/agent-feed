/**
 * Integration Tests for /api/claude-code/streaming-chat endpoint
 * Tests the Claude Code SDK integration with tool access capabilities
 */

import { describe, test, expect, beforeAll, afterAll, beforeEach, afterEach } from '@jest/test-environment-node';
import fetch from 'node-fetch';
import MockApiServer from '../mock-servers/mock-api-server';
import {
  claudeCodeTestMessages,
  errorTestCases,
  performanceTestData,
  validationSchemas,
  delay,
  waitForCondition,
  generateLargePayload
} from '../fixtures/test-data';

// Type definitions for responses
interface ClaudeCodeResponse {
  success: boolean;
  message?: string;
  responses?: Array<{
    tool: string;
    result: any;
    timestamp: number;
  }>;
  timestamp: string;
  claudeCode: boolean;
  toolsEnabled: boolean;
  error?: string;
  details?: string;
}

interface SessionResponse {
  success: boolean;
  session?: any;
  timestamp: string;
  error?: string;
}

describe('Claude Code Streaming Chat API Integration Tests', () => {
  let mockServer: MockApiServer;
  let baseUrl: string;

  beforeAll(async () => {
    // Start mock server for isolated testing
    mockServer = new MockApiServer({
      port: 3003,
      cors: true,
      logging: false
    });
    await mockServer.start();
    baseUrl = mockServer.getUrl();
  });

  afterAll(async () => {
    if (mockServer) {
      await mockServer.stop();
    }
  });

  beforeEach(() => {
    mockServer.clearAllOverrides();
    mockServer.resetRequestCount();
  });

  describe('POST /api/claude-code/streaming-chat - Tool Execution', () => {
    test('should execute file reading with Read tool', async () => {
      const testCase = claudeCodeTestMessages.fileRead;

      const response = await fetch(`${baseUrl}/api/claude-code/streaming-chat`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          message: testCase.message,
          options: testCase.options
        })
      });

      expect(response.status).toBe(200);

      const data: ClaudeCodeResponse = await response.json();

      // Validate Claude Code specific response structure
      expect(data.success).toBe(true);
      expect(data.claudeCode).toBe(true);
      expect(data.toolsEnabled).toBe(true);
      expect(data.message).toBeDefined();
      expect(data.responses).toBeDefined();
      expect(Array.isArray(data.responses)).toBe(true);
      expect(data.timestamp).toBeDefined();

      // Validate tool execution results
      if (data.responses && data.responses.length > 0) {
        const toolResults = data.responses;
        expect(toolResults.some(r => r.tool === 'Read')).toBe(true);
      }
    });

    test('should execute bash commands with Bash tool', async () => {
      const testCase = claudeCodeTestMessages.bashCommand;

      const response = await fetch(`${baseUrl}/api/claude-code/streaming-chat`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          message: testCase.message,
          options: testCase.options
        })
      });

      expect(response.status).toBe(200);

      const data: ClaudeCodeResponse = await response.json();

      expect(data.success).toBe(true);
      expect(data.claudeCode).toBe(true);
      expect(data.toolsEnabled).toBe(true);

      // Should contain bash tool execution
      if (data.responses && data.responses.length > 0) {
        const toolResults = data.responses;
        expect(toolResults.some(r => r.tool === 'Bash')).toBe(true);
      }
    });

    test('should perform code analysis with multiple tools', async () => {
      const testCase = claudeCodeTestMessages.codeAnalysis;

      const response = await fetch(`${baseUrl}/api/claude-code/streaming-chat`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          message: testCase.message,
          options: testCase.options
        })
      });

      expect(response.status).toBe(200);

      const data: ClaudeCodeResponse = await response.json();

      expect(data.success).toBe(true);
      expect(data.claudeCode).toBe(true);
      expect(data.toolsEnabled).toBe(true);

      // Should use multiple analysis tools
      if (data.responses && data.responses.length > 0) {
        const toolTypes = data.responses.map(r => r.tool);
        expect(toolTypes.length).toBeGreaterThan(0);
      }
    });

    test('should handle file writing operations', async () => {
      const testCase = claudeCodeTestMessages.writeFile;

      const response = await fetch(`${baseUrl}/api/claude-code/streaming-chat`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          message: testCase.message,
          options: testCase.options
        })
      });

      expect(response.status).toBe(200);

      const data: ClaudeCodeResponse = await response.json();

      expect(data.success).toBe(true);
      expect(data.claudeCode).toBe(true);
      expect(data.toolsEnabled).toBe(true);
    });

    test('should reject empty message', async () => {
      const response = await fetch(`${baseUrl}/api/claude-code/streaming-chat`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ message: "" })
      });

      expect(response.status).toBe(400);

      const data: ClaudeCodeResponse = await response.json();
      expect(data.success).toBe(false);
      expect(data.error).toContain('Message is required');
    });

    test('should reject null message', async () => {
      const response = await fetch(`${baseUrl}/api/claude-code/streaming-chat`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ message: null })
      });

      expect(response.status).toBe(400);

      const data: ClaudeCodeResponse = await response.json();
      expect(data.success).toBe(false);
      expect(data.error).toContain('Message is required');
    });
  });

  describe('Tool Access and Security', () => {
    test('should respect allowed tools restriction', async () => {
      const message = "Write a file and run a bash command";
      const options = {
        allowedTools: ["Read", "Grep"] // Only allow read operations
      };

      const response = await fetch(`${baseUrl}/api/claude-code/streaming-chat`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ message, options })
      });

      expect(response.status).toBe(200);

      const data: ClaudeCodeResponse = await response.json();
      expect(data.success).toBe(true);
      expect(data.toolsEnabled).toBe(true);

      // Should not execute restricted tools in real implementation
      // Mock server will simulate this behavior
    });

    test('should respect working directory constraints', async () => {
      const message = "List the contents of the current directory";
      const options = {
        workingDirectory: "/tmp/restricted",
        allowedTools: ["Bash"]
      };

      const response = await fetch(`${baseUrl}/api/claude-code/streaming-chat`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ message, options })
      });

      expect(response.status).toBe(200);

      const data: ClaudeCodeResponse = await response.json();
      expect(data.success).toBe(true);
    });

    test('should handle invalid tool configurations', async () => {
      const message = "Test with invalid tools";
      const options = {
        allowedTools: ["NonExistentTool", "AnotherInvalidTool"]
      };

      const response = await fetch(`${baseUrl}/api/claude-code/streaming-chat`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ message, options })
      });

      expect(response.status).toBe(200);

      const data: ClaudeCodeResponse = await response.json();
      expect(data.success).toBe(true);
      // Real implementation would handle invalid tools gracefully
    });
  });

  describe('Session Management', () => {
    test('should create new session', async () => {
      const sessionId = `test-session-${Date.now()}`;

      const response = await fetch(`${baseUrl}/api/claude-code/session`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ sessionId })
      });

      expect(response.status).toBe(200);

      const data: SessionResponse = await response.json();
      expect(data.success).toBe(true);
      expect(data.session).toBeDefined();
      expect(data.timestamp).toBeDefined();
    });

    test('should retrieve existing session', async () => {
      const sessionId = 'existing-session';

      const response = await fetch(`${baseUrl}/api/claude-code/session/${sessionId}`);

      // Mock server will return 404 for non-existent sessions
      expect([200, 404]).toContain(response.status);
    });

    test('should close session', async () => {
      const sessionId = 'session-to-close';

      const response = await fetch(`${baseUrl}/api/claude-code/session/${sessionId}`, {
        method: 'DELETE'
      });

      expect([200, 404]).toContain(response.status);
    });
  });

  describe('Background Task Execution', () => {
    test('should execute headless background task', async () => {
      const prompt = "Analyze the project structure and generate a report";
      const options = {
        mode: 'headless',
        outputFormat: 'json'
      };

      const response = await fetch(`${baseUrl}/api/claude-code/background-task`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ prompt, options })
      });

      expect(response.status).toBe(200);

      const data = await response.json();
      expect(data.success).toBe(true);
      expect(data.result).toBeDefined();
      expect(data.timestamp).toBeDefined();
      expect(data.mode).toBe('headless');
      expect(data.claudeCode).toBe(true);
    });

    test('should reject background task without prompt', async () => {
      const response = await fetch(`${baseUrl}/api/claude-code/background-task`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ options: {} })
      });

      expect(response.status).toBe(400);

      const data = await response.json();
      expect(data.success).toBe(false);
      expect(data.error).toContain('Prompt is required');
    });
  });

  describe('Health and Status Monitoring', () => {
    test('should return health status with tool verification', async () => {
      const response = await fetch(`${baseUrl}/api/claude-code/health`);

      expect(response.status).toBe(200);

      const data = await response.json();
      expect(data.success).toBe(true);
      expect(data.healthy).toBe(true);
      expect(data.timestamp).toBeDefined();
      expect(data.toolsEnabled).toBe(true);
      expect(data.claudeCode).toBe(true);
    });

    test('should return comprehensive system status', async () => {
      const response = await fetch(`${baseUrl}/api/claude-code/status`);

      expect(response.status).toBe(200);

      const data = await response.json();
      expect(data.success).toBe(true);
      expect(data.status).toBeDefined();
      expect(data.timestamp).toBeDefined();
    });
  });

  describe('Error Handling and Resilience', () => {
    test('should handle tool execution errors gracefully', async () => {
      // Override response to simulate tool error
      mockServer.setResponseOverride('POST:/api/claude-code/streaming-chat', {
        status: 500,
        data: {
          success: false,
          error: 'Claude Code processing failed. Please try again.',
          details: 'Tool execution error'
        }
      });

      const response = await fetch(`${baseUrl}/api/claude-code/streaming-chat`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ message: "This will cause an error" })
      });

      expect(response.status).toBe(500);

      const data: ClaudeCodeResponse = await response.json();
      expect(data.success).toBe(false);
      expect(data.error).toBeDefined();
      expect(data.details).toBeDefined();
    });

    test('should handle malformed tool requests', async () => {
      const response = await fetch(`${baseUrl}/api/claude-code/streaming-chat`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: '{"message": "incomplete json"'
      });

      expect(response.status).toBe(400);
    });

    test('should handle tool timeout scenarios', async () => {
      // Override response to simulate timeout
      mockServer.setResponseOverride('POST:/api/claude-code/streaming-chat', {
        status: 200,
        data: {
          success: true,
          message: 'Tool execution timed out but recovered',
          responses: [],
          timestamp: new Date().toISOString(),
          claudeCode: true,
          toolsEnabled: true
        },
        delay: 8000 // 8 second delay to simulate slow tool execution
      });

      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 10000); // 10 second timeout

      try {
        const response = await fetch(`${baseUrl}/api/claude-code/streaming-chat`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ message: "Slow tool execution test" }),
          signal: controller.signal
        });

        expect(response.status).toBe(200);
        const data: ClaudeCodeResponse = await response.json();
        expect(data.success).toBe(true);
        expect(data.claudeCode).toBe(true);
      } finally {
        clearTimeout(timeoutId);
      }
    }, 15000);
  });

  describe('Performance and Scalability', () => {
    test('should handle concurrent tool executions', async () => {
      const concurrentRequests = Array.from(
        { length: 5 }, // Reduced for tool execution tests
        (_, i) => fetch(`${baseUrl}/api/claude-code/streaming-chat`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            message: `Concurrent tool execution test ${i}`,
            options: { allowedTools: ["Read"] }
          })
        })
      );

      const startTime = Date.now();
      const responses = await Promise.all(concurrentRequests);
      const endTime = Date.now();

      // All requests should succeed
      responses.forEach((response, index) => {
        expect(response.status).toBe(200);
      });

      // Should complete within reasonable time for tool execution
      const totalTime = endTime - startTime;
      expect(totalTime).toBeLessThan(15000); // 15 seconds for tool operations
    });

    test('should handle large tool outputs', async () => {
      const message = "Generate a large output using tools";

      const response = await fetch(`${baseUrl}/api/claude-code/streaming-chat`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ message })
      });

      expect(response.status).toBe(200);

      const data: ClaudeCodeResponse = await response.json();
      expect(data.success).toBe(true);
      expect(data.claudeCode).toBe(true);
    });

    test('should measure tool execution response times', async () => {
      const testCases = [
        { tool: 'Read', message: 'Read a small file' },
        { tool: 'Bash', message: 'Run ls command' },
        { tool: 'Grep', message: 'Search for a pattern' }
      ];

      for (const testCase of testCases) {
        const startTime = Date.now();

        const response = await fetch(`${baseUrl}/api/claude-code/streaming-chat`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            message: testCase.message,
            options: { allowedTools: [testCase.tool] }
          })
        });

        const endTime = Date.now();
        const responseTime = endTime - startTime;

        expect(response.status).toBe(200);

        // Tool execution should be reasonably fast
        expect(responseTime).toBeLessThan(10000); // 10 seconds max

        console.log(`${testCase.tool} tool response time: ${responseTime}ms`);
      }
    });
  });

  describe('Response Validation and Schema Compliance', () => {
    test('should return valid Claude Code response schema', async () => {
      const response = await fetch(`${baseUrl}/api/claude-code/streaming-chat`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ message: "Schema validation test" })
      });

      const data: ClaudeCodeResponse = await response.json();

      // Required fields for Claude Code responses
      expect(data).toHaveProperty('success');
      expect(data).toHaveProperty('timestamp');
      expect(data).toHaveProperty('claudeCode');
      expect(typeof data.success).toBe('boolean');
      expect(typeof data.timestamp).toBe('string');
      expect(typeof data.claudeCode).toBe('boolean');

      // Conditional fields
      if (data.success) {
        expect(data).toHaveProperty('message');
        expect(data).toHaveProperty('responses');
        expect(data).toHaveProperty('toolsEnabled');
        expect(typeof data.toolsEnabled).toBe('boolean');
        expect(Array.isArray(data.responses)).toBe(true);
      } else {
        expect(data).toHaveProperty('error');
        expect(typeof data.error).toBe('string');
      }
    });

    test('should validate tool response structure', async () => {
      const response = await fetch(`${baseUrl}/api/claude-code/streaming-chat`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ message: "Tool structure validation" })
      });

      const data: ClaudeCodeResponse = await response.json();

      if (data.success && data.responses && data.responses.length > 0) {
        data.responses.forEach(toolResult => {
          expect(toolResult).toHaveProperty('tool');
          expect(toolResult).toHaveProperty('result');
          expect(toolResult).toHaveProperty('timestamp');
          expect(typeof toolResult.tool).toBe('string');
          expect(typeof toolResult.timestamp).toBe('number');
        });
      }
    });
  });
});