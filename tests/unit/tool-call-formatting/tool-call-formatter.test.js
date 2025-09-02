/**
 * @file Tool Call Formatter Unit Tests
 * @description Tests for tool call formatting functionality - TDD approach
 * These tests will initially fail until implementation is complete
 */

const { describe, test, expect, beforeEach, afterEach } = require('@jest/globals');

// Mock dependencies - will be replaced with actual implementation
const ToolCallFormatter = require('../../../src/services/ToolCallFormatter');
const MessageProcessor = require('../../../src/services/MessageProcessor');

describe('ToolCallFormatter', () => {
  let formatter;
  let mockProcessor;

  beforeEach(() => {
    mockProcessor = {
      processMessage: jest.fn(),
      formatOutput: jest.fn(),
      handleError: jest.fn()
    };
    formatter = new ToolCallFormatter(mockProcessor);
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe('Tool Call Format Requirements', () => {
    test('should format Bash tool calls with bullet point prefix', () => {
      const toolCall = {
        type: 'function',
        function: {
          name: 'Bash',
          arguments: JSON.stringify({
            command: 'npm test',
            description: 'Run test suite'
          })
        }
      };

      const result = formatter.formatToolCall(toolCall);

      expect(result).toContain('● Bash(npm test)');
      expect(result).not.toContain('function_call');
      expect(result).not.toContain('arguments');
    });

    test('should format Read tool calls with file path', () => {
      const toolCall = {
        type: 'function',
        function: {
          name: 'Read',
          arguments: JSON.stringify({
            file_path: '/workspaces/agent-feed/src/app.js',
            limit: 100
          })
        }
      };

      const result = formatter.formatToolCall(toolCall);

      expect(result).toContain('● Read(/workspaces/agent-feed/src/app.js)');
      expect(result).not.toContain('limit');
    });

    test('should format Write tool calls with file path only', () => {
      const toolCall = {
        type: 'function',
        function: {
          name: 'Write',
          arguments: JSON.stringify({
            file_path: '/workspaces/agent-feed/tests/new-test.js',
            content: 'const test = true;'
          })
        }
      };

      const result = formatter.formatToolCall(toolCall);

      expect(result).toContain('● Write(/workspaces/agent-feed/tests/new-test.js)');
      expect(result).not.toContain('content');
    });

    test('should format Edit tool calls with file path', () => {
      const toolCall = {
        type: 'function',
        function: {
          name: 'Edit',
          arguments: JSON.stringify({
            file_path: '/workspaces/agent-feed/src/config.js',
            old_string: 'port: 3000',
            new_string: 'port: 4000'
          })
        }
      };

      const result = formatter.formatToolCall(toolCall);

      expect(result).toContain('● Edit(/workspaces/agent-feed/src/config.js)');
      expect(result).not.toContain('old_string');
      expect(result).not.toContain('new_string');
    });

    test('should format Grep tool calls with pattern', () => {
      const toolCall = {
        type: 'function',
        function: {
          name: 'Grep',
          arguments: JSON.stringify({
            pattern: 'function.*test',
            path: '/workspaces/agent-feed/src',
            output_mode: 'files_with_matches'
          })
        }
      };

      const result = formatter.formatToolCall(toolCall);

      expect(result).toContain('● Grep(function.*test)');
    });

    test('should format WebFetch tool calls with URL', () => {
      const toolCall = {
        type: 'function',
        function: {
          name: 'WebFetch',
          arguments: JSON.stringify({
            url: 'https://example.com/api/data',
            prompt: 'Extract API documentation'
          })
        }
      };

      const result = formatter.formatToolCall(toolCall);

      expect(result).toContain('● WebFetch(https://example.com/api/data)');
    });
  });

  describe('Status Update Formatting', () => {
    test('should show running status for background processes', () => {
      const status = {
        type: 'running',
        command: 'npm run build',
        background: true
      };

      const result = formatter.formatStatus(status);

      expect(result).toContain('⎿ Running in background');
      expect(result).toMatch(/├─|└─/); // Tree structure indicators
    });

    test('should show completion status', () => {
      const status = {
        type: 'completed',
        command: 'npm test',
        exitCode: 0,
        output: 'All tests passed'
      };

      const result = formatter.formatStatus(status);

      expect(result).toContain('✓');
      expect(result).toContain('Completed');
    });

    test('should show error status with exit code', () => {
      const status = {
        type: 'error',
        command: 'npm run lint',
        exitCode: 1,
        error: 'Linting errors found'
      };

      const result = formatter.formatStatus(status);

      expect(result).toContain('✗');
      expect(result).toContain('Failed');
      expect(result).toContain('exit code 1');
    });
  });

  describe('Output Preview Formatting', () => {
    test('should show preview with magnifying glass icon', () => {
      const output = {
        type: 'preview',
        content: 'COMPREHENSIVE TEST RESULTS\nAll systems operational',
        truncated: true
      };

      const result = formatter.formatPreview(output);

      expect(result).toContain('⎿ 🔍 COMPREHENSIVE...');
      expect(result).not.toContain('All systems operational');
    });

    test('should handle long output with truncation', () => {
      const longOutput = 'A'.repeat(1000);
      const output = {
        type: 'preview',
        content: longOutput,
        truncated: true
      };

      const result = formatter.formatPreview(output);

      expect(result).toContain('🔍');
      expect(result.length).toBeLessThan(200);
      expect(result).toContain('...');
    });

    test('should preserve important keywords in preview', () => {
      const output = {
        type: 'preview',
        content: 'ERROR: Critical failure in authentication module\nTest results: FAILED\nCompilation: SUCCESS',
        truncated: true
      };

      const result = formatter.formatPreview(output);

      expect(result).toContain('ERROR');
      expect(result).toContain('FAILED');
    });
  });

  describe('WebSocket Integration', () => {
    test('should maintain WebSocket compatibility', () => {
      const wsMessage = {
        type: 'tool_call',
        data: {
          function: {
            name: 'Bash',
            arguments: JSON.stringify({ command: 'ls -la' })
          }
        }
      };

      expect(() => {
        formatter.processWebSocketMessage(wsMessage);
      }).not.toThrow();
    });

    test('should not interfere with existing message handling', () => {
      const existingMessage = {
        type: 'chat',
        content: 'Hello world'
      };

      const result = formatter.processWebSocketMessage(existingMessage);

      expect(result.type).toBe('chat');
      expect(result.content).toBe('Hello world');
    });
  });

  describe('Error Handling', () => {
    test('should gracefully handle malformed tool calls', () => {
      const malformedCall = {
        type: 'function',
        function: {
          name: 'InvalidTool',
          arguments: 'not-json'
        }
      };

      expect(() => {
        formatter.formatToolCall(malformedCall);
      }).not.toThrow();

      const result = formatter.formatToolCall(malformedCall);
      expect(result).toContain('InvalidTool');
    });

    test('should handle missing function name', () => {
      const incompleteCall = {
        type: 'function',
        function: {
          arguments: JSON.stringify({ test: true })
        }
      };

      const result = formatter.formatToolCall(incompleteCall);
      expect(result).toContain('Unknown');
    });

    test('should handle network interruptions gracefully', () => {
      const networkError = new Error('Network connection lost');
      
      expect(() => {
        formatter.handleError(networkError);
      }).not.toThrow();
    });
  });

  describe('Performance Requirements', () => {
    test('should format tool calls within 10ms', () => {
      const toolCall = {
        type: 'function',
        function: {
          name: 'Bash',
          arguments: JSON.stringify({ command: 'echo test' })
        }
      };

      const start = performance.now();
      formatter.formatToolCall(toolCall);
      const duration = performance.now() - start;

      expect(duration).toBeLessThan(10);
    });

    test('should handle batch formatting efficiently', () => {
      const toolCalls = Array(100).fill().map((_, i) => ({
        type: 'function',
        function: {
          name: 'Bash',
          arguments: JSON.stringify({ command: `echo test${i}` })
        }
      }));

      const start = performance.now();
      toolCalls.forEach(call => formatter.formatToolCall(call));
      const duration = performance.now() - start;

      expect(duration).toBeLessThan(100); // 100 calls in under 100ms
    });
  });
});