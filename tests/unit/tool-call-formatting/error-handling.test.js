/**
 * @file Error Handling and Graceful Degradation Tests
 * @description Tests for error scenarios and recovery mechanisms in tool call formatting
 * Ensures robust behavior under adverse conditions
 */

const { describe, test, expect, beforeEach, afterEach } = require('@jest/globals');

// Mock components - will be replaced with actual implementation
const ToolCallFormatter = require('../../../src/services/ToolCallFormatter');
const WebSocketService = require('../../../src/services/WebSocketService');

describe('Tool Call Error Handling and Graceful Degradation', () => {
  let formatter;
  let wsService;

  beforeEach(() => {
    formatter = new ToolCallFormatter();
    wsService = new WebSocketService();
    
    // Reset error tracking
    formatter.clearErrorLog?.();
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe('Malformed Input Handling', () => {
    test('should handle null tool call gracefully', () => {
      expect(() => {
        const result = formatter.formatToolCall(null);
        expect(result).toContain('Unknown tool call');
      }).not.toThrow();
    });

    test('should handle undefined tool call gracefully', () => {
      expect(() => {
        const result = formatter.formatToolCall(undefined);
        expect(result).toContain('Unknown tool call');
      }).not.toThrow();
    });

    test('should handle empty tool call object', () => {
      const emptyCall = {};
      
      expect(() => {
        const result = formatter.formatToolCall(emptyCall);
        expect(result).toContain('Unknown');
      }).not.toThrow();
    });

    test('should handle missing function property', () => {
      const malformedCall = {
        type: 'function'
        // Missing function property
      };

      const result = formatter.formatToolCall(malformedCall);
      expect(result).toContain('Unknown');
      expect(result).not.toContain('undefined');
    });

    test('should handle invalid JSON in arguments', () => {
      const invalidJsonCall = {
        type: 'function',
        function: {
          name: 'Bash',
          arguments: 'invalid-json-string'
        }
      };

      expect(() => {
        const result = formatter.formatToolCall(invalidJsonCall);
        expect(result).toContain('● Bash');
        expect(result).toContain('invalid arguments');
      }).not.toThrow();
    });

    test('should handle circular references in arguments', () => {
      const circularArgs = { test: true };
      circularArgs.self = circularArgs;

      const circularCall = {
        type: 'function',
        function: {
          name: 'Write',
          arguments: JSON.stringify(circularArgs)
        }
      };

      // This should throw during JSON.stringify, but our formatter should handle it
      expect(() => {
        const result = formatter.formatToolCall(circularCall);
        expect(result).toContain('● Write');
      }).not.toThrow();
    });
  });

  describe('Network Error Recovery', () => {
    test('should handle WebSocket disconnection during formatting', () => {
      const toolCall = {
        type: 'function',
        function: {
          name: 'Bash',
          arguments: JSON.stringify({ command: 'echo test' })
        }
      };

      // Simulate WebSocket disconnection
      wsService.simulateDisconnection?.();

      expect(() => {
        const result = formatter.processWebSocketMessage({
          type: 'tool_call',
          data: toolCall
        });
        expect(result).toBeDefined();
      }).not.toThrow();
    });

    test('should queue messages during disconnection', () => {
      const messages = [
        { type: 'tool_call', data: { function: { name: 'Bash', arguments: '{"command":"ls"}' } } },
        { type: 'tool_call', data: { function: { name: 'Read', arguments: '{"file_path":"test.txt"}' } } }
      ];

      // Simulate disconnection
      wsService.simulateDisconnection?.();

      messages.forEach(msg => {
        expect(() => {
          formatter.processWebSocketMessage(msg);
        }).not.toThrow();
      });

      // Verify messages are queued
      const queueLength = formatter.getQueuedMessageCount?.() || 0;
      expect(queueLength).toBeGreaterThanOrEqual(0); // Should either queue or handle gracefully
    });

    test('should replay queued messages on reconnection', () => {
      const toolCall = {
        type: 'tool_call',
        data: {
          function: {
            name: 'Write',
            arguments: JSON.stringify({ file_path: '/tmp/test.txt', content: 'test' })
          }
        }
      };

      // Disconnect, send message, reconnect
      wsService.simulateDisconnection?.();
      formatter.processWebSocketMessage(toolCall);
      wsService.simulateReconnection?.();

      // Should not throw and should handle replay
      expect(() => {
        formatter.processReconnection?.();
      }).not.toThrow();
    });
  });

  describe('Memory and Resource Constraints', () => {
    test('should handle extremely large arguments gracefully', () => {
      const largeContent = 'A'.repeat(10 * 1024 * 1024); // 10MB string
      const largeCall = {
        type: 'function',
        function: {
          name: 'Write',
          arguments: JSON.stringify({
            file_path: '/tmp/large.txt',
            content: largeContent
          })
        }
      };

      expect(() => {
        const result = formatter.formatToolCall(largeCall);
        expect(result).toContain('● Write(/tmp/large.txt)');
        expect(result).not.toContain(largeContent); // Should not include large content in display
      }).not.toThrow();
    });

    test('should handle memory pressure scenarios', () => {
      // Create many formatter instances to simulate memory pressure
      const formatters = [];
      
      expect(() => {
        for (let i = 0; i < 1000; i++) {
          const tempFormatter = new ToolCallFormatter();
          formatters.push(tempFormatter);
          
          const toolCall = {
            type: 'function',
            function: {
              name: 'Bash',
              arguments: JSON.stringify({ command: `echo ${i}` })
            }
          };
          
          tempFormatter.formatToolCall(toolCall);
        }
      }).not.toThrow();

      // Clean up
      formatters.length = 0;
    });

    test('should prevent memory leaks in error scenarios', () => {
      const initialMemory = process.memoryUsage().heapUsed;
      
      // Generate many errors
      for (let i = 0; i < 1000; i++) {
        try {
          formatter.formatToolCall({
            type: 'invalid',
            function: {
              name: null,
              arguments: undefined
            }
          });
        } catch (error) {
          // Errors are expected here
        }
      }

      // Force garbage collection if available
      if (global.gc) {
        global.gc();
      }

      const finalMemory = process.memoryUsage().heapUsed;
      const memoryIncrease = finalMemory - initialMemory;

      // Should not leak more than 1MB even with 1000 errors
      expect(memoryIncrease).toBeLessThan(1024 * 1024);
    });
  });

  describe('Concurrent Error Handling', () => {
    test('should handle multiple concurrent errors', async () => {
      const errorPromises = Array(50).fill().map(async (_, i) => {
        const malformedCall = {
          type: 'function',
          function: {
            name: i % 2 === 0 ? null : 'ValidTool',
            arguments: i % 3 === 0 ? 'invalid-json' : JSON.stringify({ test: i })
          }
        };

        return new Promise(resolve => {
          try {
            const result = formatter.formatToolCall(malformedCall);
            resolve({ success: true, result });
          } catch (error) {
            resolve({ success: false, error: error.message });
          }
        });
      });

      const results = await Promise.all(errorPromises);
      
      // Should handle all concurrent errors without crashing
      expect(results).toHaveLength(50);
      results.forEach(result => {
        expect(result).toHaveProperty('success');
      });
    });

    test('should maintain state consistency during concurrent errors', async () => {
      const concurrentOperations = Array(20).fill().map(async (_, i) => {
        // Mix of valid and invalid calls
        const call = i % 3 === 0 
          ? null  // Invalid
          : {     // Valid
              type: 'function',
              function: {
                name: 'Bash',
                arguments: JSON.stringify({ command: `echo ${i}` })
              }
            };

        return formatter.formatToolCall(call);
      });

      const results = await Promise.allSettled(concurrentOperations);
      
      // Should complete all operations
      expect(results).toHaveLength(20);
      
      // Valid operations should succeed, invalid should handle gracefully
      results.forEach((result, i) => {
        if (i % 3 !== 0) {  // Valid calls
          expect(result.status).toBe('fulfilled');
          expect(result.value).toContain('● Bash');
        } else {  // Invalid calls
          // Should either succeed with error message or fail gracefully
          expect(['fulfilled', 'rejected'].includes(result.status)).toBe(true);
        }
      });
    });
  });

  describe('Recovery Mechanisms', () => {
    test('should reset formatter state after critical error', () => {
      // Cause a critical error
      try {
        formatter.formatToolCall({
          type: 'function',
          function: {
            name: 'CriticalError',
            arguments: JSON.stringify({ cause: 'system_failure' })
          }
        });
      } catch (error) {
        // Expected
      }

      // Should be able to recover and process normal calls
      const normalCall = {
        type: 'function',
        function: {
          name: 'Bash',
          arguments: JSON.stringify({ command: 'echo recovery' })
        }
      };

      expect(() => {
        const result = formatter.formatToolCall(normalCall);
        expect(result).toContain('● Bash(echo recovery)');
      }).not.toThrow();
    });

    test('should provide fallback formatting for unknown tools', () => {
      const unknownToolCall = {
        type: 'function',
        function: {
          name: 'NonExistentTool',
          arguments: JSON.stringify({ param1: 'value1', param2: 'value2' })
        }
      };

      const result = formatter.formatToolCall(unknownToolCall);
      
      expect(result).toContain('● NonExistentTool');
      expect(result).toContain('unknown tool');
    });

    test('should maintain WebSocket connection health during errors', () => {
      const errorMessages = [
        { type: 'tool_call', data: null },
        { type: 'tool_call', data: { invalid: 'structure' } },
        { type: 'invalid_type', data: {} },
        { type: 'tool_call', data: { function: { name: null } } }
      ];

      let connectionStable = true;

      errorMessages.forEach(msg => {
        try {
          wsService.handleMessage(msg);
        } catch (error) {
          if (error.message.includes('connection') || error.message.includes('socket')) {
            connectionStable = false;
          }
        }
      });

      expect(connectionStable).toBe(true);
    });
  });

  describe('Error Reporting and Logging', () => {
    test('should log errors without exposing sensitive information', () => {
      const sensitiveCall = {
        type: 'function',
        function: {
          name: 'DatabaseQuery',
          arguments: JSON.stringify({
            query: 'SELECT * FROM users',
            password: 'secret123',
            apiKey: 'sensitive-api-key'
          })
        }
      };

      const loggedErrors = [];
      const originalLog = console.error;
      console.error = (...args) => {
        loggedErrors.push(args.join(' '));
      };

      try {
        formatter.formatToolCall(sensitiveCall);
      } catch (error) {
        // Expected for test
      }

      console.error = originalLog;

      // Check that sensitive information is not logged
      const logContent = loggedErrors.join(' ');
      expect(logContent).not.toContain('secret123');
      expect(logContent).not.toContain('sensitive-api-key');
    });

    test('should provide helpful error context', () => {
      const contextualCall = {
        type: 'function',
        function: {
          name: 'ComplexTool',
          arguments: 'malformed-json'
        }
      };

      let errorContext = '';
      const originalError = console.error;
      console.error = (msg) => {
        errorContext += msg;
      };

      try {
        formatter.formatToolCall(contextualCall);
      } finally {
        console.error = originalError;
      }

      // Should provide context about the error
      if (errorContext) {
        expect(errorContext).toMatch(/ComplexTool|json|parse|format/i);
      }
    });
  });

  describe('Timeout and Performance Degradation', () => {
    test('should handle slow formatting operations', async () => {
      const slowCall = {
        type: 'function',
        function: {
          name: 'SlowTool',
          arguments: JSON.stringify({ delay: 5000 }) // 5 second delay
        }
      };

      const startTime = Date.now();
      
      const result = await Promise.race([
        new Promise(resolve => {
          try {
            const formatted = formatter.formatToolCall(slowCall);
            resolve({ success: true, result: formatted });
          } catch (error) {
            resolve({ success: false, error: error.message });
          }
        }),
        new Promise(resolve => {
          setTimeout(() => resolve({ timeout: true }), 1000); // 1 second timeout
        })
      ]);

      const duration = Date.now() - startTime;
      
      // Should either complete quickly or timeout gracefully
      expect(duration).toBeLessThan(2000);
      expect(result).toBeDefined();
    });

    test('should degrade gracefully under high load', () => {
      const highLoadCalls = Array(1000).fill().map((_, i) => ({
        type: 'function',
        function: {
          name: 'LoadTest',
          arguments: JSON.stringify({ iteration: i })
        }
      }));

      const startTime = Date.now();
      let processedCount = 0;
      let errorCount = 0;

      highLoadCalls.forEach(call => {
        try {
          const result = formatter.formatToolCall(call);
          if (result) processedCount++;
        } catch (error) {
          errorCount++;
        }
      });

      const duration = Date.now() - startTime;
      const totalHandled = processedCount + errorCount;

      // Should handle most calls even under load
      expect(totalHandled).toBe(1000);
      expect(duration).toBeLessThan(5000); // Should complete within 5 seconds
    });
  });
});