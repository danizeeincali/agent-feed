/**
 * @file Tool Call Rendering Performance Benchmarks
 * @description Performance tests to ensure tool call visualization doesn't degrade system performance
 * These tests establish performance baselines and regression thresholds
 */

const { describe, test, expect, beforeAll, afterAll, beforeEach } = require('@jest/globals');
const { performance } = require('perf_hooks');

// Mock components that will be implemented
const ToolCallFormatter = require('../../src/services/ToolCallFormatter');
const MessageProcessor = require('../../src/services/MessageProcessor');
const WebSocketService = require('../../src/services/WebSocketService');

describe('Tool Call Rendering Performance Benchmarks', () => {
  let formatter;
  let processor;
  let wsService;

  beforeAll(() => {
    // Initialize performance monitoring
    if (global.gc) {
      global.gc();
    }
  });

  beforeEach(() => {
    formatter = new ToolCallFormatter();
    processor = new MessageProcessor();
    wsService = new WebSocketService();
  });

  describe('Formatting Performance', () => {
    test('should format single tool call under 1ms', () => {
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

      const iterations = 1000;
      const startTime = performance.now();

      for (let i = 0; i < iterations; i++) {
        formatter.formatToolCall(toolCall);
      }

      const endTime = performance.now();
      const avgTime = (endTime - startTime) / iterations;

      expect(avgTime).toBeLessThan(1); // Under 1ms per format
    });

    test('should handle batch formatting efficiently', () => {
      const toolCalls = Array(100).fill().map((_, i) => ({
        type: 'function',
        function: {
          name: 'Bash',
          arguments: JSON.stringify({ command: `echo "test ${i}"` })
        }
      }));

      const startTime = performance.now();
      const results = formatter.formatBatch(toolCalls);
      const endTime = performance.now();

      const duration = endTime - startTime;
      
      expect(duration).toBeLessThan(50); // Batch of 100 under 50ms
      expect(results).toHaveLength(100);
    });

    test('should maintain performance with large arguments', () => {
      const largeContent = 'A'.repeat(10000); // 10KB content
      const toolCall = {
        type: 'function',
        function: {
          name: 'Write',
          arguments: JSON.stringify({
            file_path: '/tmp/large-file.txt',
            content: largeContent
          })
        }
      };

      const iterations = 100;
      const startTime = performance.now();

      for (let i = 0; i < iterations; i++) {
        formatter.formatToolCall(toolCall);
      }

      const endTime = performance.now();
      const avgTime = (endTime - startTime) / iterations;

      expect(avgTime).toBeLessThan(5); // Under 5ms even with large arguments
    });
  });

  describe('Memory Performance', () => {
    test('should not create memory leaks with repeated formatting', () => {
      const initialMemory = process.memoryUsage().heapUsed;
      const toolCall = {
        type: 'function',
        function: {
          name: 'Bash',
          arguments: JSON.stringify({ command: 'echo test' })
        }
      };

      // Format many tool calls
      for (let i = 0; i < 10000; i++) {
        formatter.formatToolCall(toolCall);
      }

      // Force garbage collection
      if (global.gc) {
        global.gc();
      }

      const finalMemory = process.memoryUsage().heapUsed;
      const memoryIncrease = finalMemory - initialMemory;

      // Should not increase memory by more than 1MB for 10k formats
      expect(memoryIncrease).toBeLessThan(1024 * 1024);
    });

    test('should efficiently handle object creation and disposal', () => {
      const iterations = 1000;
      let objects = [];

      const startTime = performance.now();

      // Create and process tool call objects
      for (let i = 0; i < iterations; i++) {
        const toolCall = {
          type: 'function',
          function: {
            name: 'Read',
            arguments: JSON.stringify({ file_path: `/tmp/test${i}.txt` })
          }
        };

        const formatted = formatter.formatToolCall(toolCall);
        objects.push(formatted);
      }

      // Clear references
      objects = null;

      const endTime = performance.now();
      const duration = endTime - startTime;

      expect(duration).toBeLessThan(100); // 1000 operations under 100ms
    });
  });

  describe('WebSocket Performance', () => {
    test('should process tool call messages without latency increase', async () => {
      const baselineMessages = Array(50).fill().map((_, i) => ({
        type: 'chat',
        content: `Regular message ${i}`
      }));

      const toolCallMessages = Array(50).fill().map((_, i) => ({
        type: 'tool_call',
        data: {
          function: {
            name: 'Bash',
            arguments: JSON.stringify({ command: `echo "tool call ${i}"` })
          }
        }
      }));

      // Baseline performance
      const baselineStart = performance.now();
      for (const message of baselineMessages) {
        await processor.processMessage(message);
      }
      const baselineTime = performance.now() - baselineStart;

      // Tool call performance
      const toolCallStart = performance.now();
      for (const message of toolCallMessages) {
        await processor.processMessage(message);
      }
      const toolCallTime = performance.now() - toolCallStart;

      // Tool call processing should not be more than 50% slower than baseline
      const performanceRatio = toolCallTime / baselineTime;
      expect(performanceRatio).toBeLessThan(1.5);
    });

    test('should maintain WebSocket throughput with tool call formatting', async () => {
      const messageCount = 200;
      const messages = Array(messageCount).fill().map((_, i) => ({
        type: 'tool_call',
        data: {
          function: {
            name: 'Bash',
            arguments: JSON.stringify({ command: `echo "throughput test ${i}"` })
          }
        }
      }));

      const startTime = performance.now();
      let processedCount = 0;

      const processMessage = async (message) => {
        await wsService.handleMessage(message);
        processedCount++;
      };

      // Process all messages
      await Promise.all(messages.map(processMessage));

      const endTime = performance.now();
      const duration = endTime - startTime;
      const messagesPerSecond = (messageCount / duration) * 1000;

      // Should process at least 500 messages per second
      expect(messagesPerSecond).toBeGreaterThan(500);
      expect(processedCount).toBe(messageCount);
    });
  });

  describe('Rendering Performance', () => {
    test('should render tool call display elements quickly', () => {
      const toolCallData = {
        type: 'function',
        function: {
          name: 'Write',
          arguments: JSON.stringify({
            file_path: '/workspaces/agent-feed/src/new-file.js',
            content: 'console.log("performance test");'
          })
        }
      };

      const iterations = 500;
      const startTime = performance.now();

      for (let i = 0; i < iterations; i++) {
        // Simulate DOM rendering operations
        const element = formatter.createDisplayElement(toolCallData);
        formatter.updateElementContent(element);
        formatter.applyStyles(element);
      }

      const endTime = performance.now();
      const avgRenderTime = (endTime - startTime) / iterations;

      expect(avgRenderTime).toBeLessThan(2); // Under 2ms per render
    });

    test('should handle rapid status updates efficiently', () => {
      const statusUpdates = [
        { type: 'running', command: 'npm install' },
        { type: 'progress', percent: 25 },
        { type: 'progress', percent: 50 },
        { type: 'progress', percent: 75 },
        { type: 'completed', exitCode: 0 }
      ];

      const iterations = 100;
      const startTime = performance.now();

      for (let i = 0; i < iterations; i++) {
        statusUpdates.forEach(status => {
          formatter.updateStatus(status);
        });
      }

      const endTime = performance.now();
      const duration = endTime - startTime;

      // Should handle 500 status updates (100 * 5) under 100ms
      expect(duration).toBeLessThan(100);
    });

    test('should optimize preview text generation', () => {
      const longOutputs = Array(100).fill().map((_, i) => ({
        content: `This is a very long output text that needs to be truncated for preview display. Test iteration ${i}. `.repeat(50),
        truncated: true
      }));

      const startTime = performance.now();

      longOutputs.forEach(output => {
        formatter.generatePreview(output);
      });

      const endTime = performance.now();
      const duration = endTime - startTime;

      expect(duration).toBeLessThan(50); // 100 preview generations under 50ms
    });
  });

  describe('Concurrent Performance', () => {
    test('should handle concurrent tool call processing', async () => {
      const concurrentCalls = Array(20).fill().map((_, i) => ({
        type: 'function',
        function: {
          name: 'Bash',
          arguments: JSON.stringify({ command: `echo "concurrent ${i}"` })
        }
      }));

      const startTime = performance.now();

      // Process all calls concurrently
      const results = await Promise.all(
        concurrentCalls.map(call => 
          formatter.formatToolCallAsync(call)
        )
      );

      const endTime = performance.now();
      const duration = endTime - startTime;

      expect(results).toHaveLength(20);
      expect(duration).toBeLessThan(100); // Concurrent processing under 100ms
    });

    test('should maintain performance with multiple WebSocket connections', async () => {
      const connectionCount = 10;
      const messagesPerConnection = 20;

      const startTime = performance.now();
      let totalProcessed = 0;

      const processConnectionMessages = async (connectionId) => {
        const messages = Array(messagesPerConnection).fill().map((_, i) => ({
          type: 'tool_call',
          connectionId,
          data: {
            function: {
              name: 'Read',
              arguments: JSON.stringify({ file_path: `/tmp/conn${connectionId}-${i}.txt` })
            }
          }
        }));

        for (const message of messages) {
          await wsService.handleMessage(message);
          totalProcessed++;
        }
      };

      // Simulate multiple concurrent connections
      await Promise.all(
        Array(connectionCount).fill().map((_, i) => 
          processConnectionMessages(i)
        )
      );

      const endTime = performance.now();
      const duration = endTime - startTime;
      const messagesPerSecond = (totalProcessed / duration) * 1000;

      expect(totalProcessed).toBe(connectionCount * messagesPerConnection);
      expect(messagesPerSecond).toBeGreaterThan(200); // At least 200 msg/sec with 10 connections
    });
  });

  describe('Resource Usage Benchmarks', () => {
    test('should maintain CPU efficiency', () => {
      const cpuIntensiveOperations = Array(1000).fill().map((_, i) => ({
        type: 'function',
        function: {
          name: 'Grep',
          arguments: JSON.stringify({
            pattern: `complex.*regex.*pattern.*${i}`,
            path: '/large/directory/structure',
            output_mode: 'content'
          })
        }
      }));

      const startTime = performance.now();
      const startCpuUsage = process.cpuUsage();

      cpuIntensiveOperations.forEach(operation => {
        formatter.formatToolCall(operation);
      });

      const endTime = performance.now();
      const endCpuUsage = process.cpuUsage(startCpuUsage);

      const wallClockTime = endTime - startTime;
      const cpuTime = (endCpuUsage.user + endCpuUsage.system) / 1000; // Convert to ms

      // CPU efficiency ratio should be reasonable
      const efficiency = cpuTime / wallClockTime;
      expect(efficiency).toBeLessThan(2); // Should not use more than 2x CPU time vs wall time
    });

    test('should handle file system operation formatting efficiently', () => {
      const fileOperations = [
        { name: 'Read', args: { file_path: '/very/long/path/to/file.txt' } },
        { name: 'Write', args: { file_path: '/another/long/path.js', content: 'test'.repeat(1000) } },
        { name: 'Edit', args: { file_path: '/path/to/edit.js', old_string: 'old', new_string: 'new' } },
        { name: 'Glob', args: { pattern: '**/*.{js,ts,jsx,tsx}', path: '/src' } }
      ];

      const iterations = 250; // 1000 total operations (250 * 4)
      const startTime = performance.now();

      for (let i = 0; i < iterations; i++) {
        fileOperations.forEach(op => {
          const toolCall = {
            type: 'function',
            function: {
              name: op.name,
              arguments: JSON.stringify(op.args)
            }
          };
          formatter.formatToolCall(toolCall);
        });
      }

      const endTime = performance.now();
      const duration = endTime - startTime;

      expect(duration).toBeLessThan(200); // 1000 file operations under 200ms
    });
  });
});