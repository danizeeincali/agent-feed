/**
 * WebSocket Integration Tests for Tool Call Visualization
 * Tests the integration with existing WebSocket infrastructure
 * 
 * TESTING FOCUS:
 * - WebSocket compatibility with enhanced messages
 * - No performance degradation
 * - Stability under load
 * - Graceful fallback when tool visualization fails
 */

const WebSocket = require('ws');
const { toolCallFormatter } = require('../../../src/services/ToolCallFormatter');
const { ToolCallStatusManager } = require('../../../src/services/ToolCallStatusManager');

describe('WebSocket Integration for Tool Call Visualization', () => {
  let mockWSConnections;
  let originalBroadcast;

  beforeEach(() => {
    // Mock WebSocket connections map
    mockWSConnections = new Map();
    
    // Create mock WebSocket connection
    const mockWS = {
      readyState: WebSocket.OPEN,
      send: jest.fn(),
      close: jest.fn()
    };
    
    const connectionSet = new Set([mockWS]);
    mockWSConnections.set('test-instance', connectionSet);

    // Mock the original broadcast function behavior
    originalBroadcast = (instanceId, message) => {
      const connections = mockWSConnections.get(instanceId);
      if (connections && connections.size > 0) {
        const wsMessage = JSON.stringify({
          type: 'output',
          data: message.data || message.output,
          terminalId: instanceId,
          timestamp: message.timestamp,
          source: message.source || 'process'
        });
        
        connections.forEach(ws => {
          if (ws.readyState === WebSocket.OPEN) {
            ws.send(wsMessage);
          }
        });
      }
    };
  });

  describe('Enhanced Broadcast Function Integration', () => {
    test('should maintain original WebSocket message format for regular output', () => {
      const regularMessage = {
        data: 'Hello from Claude',
        timestamp: Date.now(),
        source: 'process'
      };

      // Simulate enhanced broadcast function
      const enhancedBroadcast = (instanceId, message) => {
        let formattedMessage;
        try {
          const rawOutput = message.data || message.output || '';
          formattedMessage = toolCallFormatter.formatToolCallOutput(rawOutput, instanceId);
          
          if (message.timestamp) formattedMessage.timestamp = message.timestamp;
          if (message.source) formattedMessage.source = message.source;
        } catch (error) {
          formattedMessage = {
            type: 'output',
            data: message.data || message.output,
            terminalId: instanceId,
            timestamp: message.timestamp,
            source: message.source || 'process'
          };
        }

        const connections = mockWSConnections.get(instanceId);
        if (connections && connections.size > 0) {
          const wsMessage = JSON.stringify(formattedMessage);
          connections.forEach(ws => {
            if (ws.readyState === WebSocket.OPEN) {
              ws.send(wsMessage);
            }
          });
        }
      };

      enhancedBroadcast('test-instance', regularMessage);

      const mockWS = Array.from(mockWSConnections.get('test-instance'))[0];
      expect(mockWS.send).toHaveBeenCalled();
      
      const sentMessage = JSON.parse(mockWS.send.mock.calls[0][0]);
      expect(sentMessage.type).toBe('output');
      expect(sentMessage.enhanced).toBe(false);
      expect(sentMessage.data).toBe('Hello from Claude');
    });

    test('should send enhanced messages for tool calls', () => {
      const toolCallMessage = {
        data: `<function_calls>
<invoke name="Bash">
<parameter name="command">npm test</parameter>
</invoke>
</function_calls>`,
        timestamp: Date.now(),
        source: 'claude-api'
      };

      const enhancedBroadcast = (instanceId, message) => {
        const rawOutput = message.data || message.output || '';
        const formattedMessage = toolCallFormatter.formatToolCallOutput(rawOutput, instanceId);
        
        if (message.timestamp) formattedMessage.timestamp = message.timestamp;
        if (message.source) formattedMessage.source = message.source;

        const connections = mockWSConnections.get(instanceId);
        if (connections) {
          const wsMessage = JSON.stringify(formattedMessage);
          connections.forEach(ws => {
            if (ws.readyState === WebSocket.OPEN) {
              ws.send(wsMessage);
            }
          });
        }
      };

      enhancedBroadcast('test-instance', toolCallMessage);

      const mockWS = Array.from(mockWSConnections.get('test-instance'))[0];
      expect(mockWS.send).toHaveBeenCalled();
      
      const sentMessage = JSON.parse(mockWS.send.mock.calls[0][0]);
      expect(sentMessage.type).toBe('tool_call');
      expect(sentMessage.enhanced).toBe(true);
      expect(sentMessage.toolCall).toBeDefined();
      expect(sentMessage.toolCall.toolName).toBe('Bash');
    });
  });

  describe('Performance Impact', () => {
    test('should not significantly impact broadcast performance', () => {
      const messages = Array.from({ length: 100 }, (_, i) => ({
        data: `Message ${i}`,
        timestamp: Date.now(),
        source: 'process'
      }));

      // Test original broadcast performance
      const originalStart = performance.now();
      messages.forEach(msg => {
        originalBroadcast('test-instance', msg);
      });
      const originalTime = performance.now() - originalStart;

      // Reset mock
      const mockWS = Array.from(mockWSConnections.get('test-instance'))[0];
      mockWS.send.mockClear();

      // Test enhanced broadcast performance
      const enhancedBroadcast = (instanceId, message) => {
        const rawOutput = message.data || message.output || '';
        const formattedMessage = toolCallFormatter.formatToolCallOutput(rawOutput, instanceId);
        
        const connections = mockWSConnections.get(instanceId);
        if (connections) {
          const wsMessage = JSON.stringify(formattedMessage);
          connections.forEach(ws => {
            if (ws.readyState === WebSocket.OPEN) {
              ws.send(wsMessage);
            }
          });
        }
      };

      const enhancedStart = performance.now();
      messages.forEach(msg => {
        enhancedBroadcast('test-instance', msg);
      });
      const enhancedTime = performance.now() - enhancedStart;

      // Enhanced broadcast should not be more than 50% slower
      const performanceRatio = enhancedTime / originalTime;
      expect(performanceRatio).toBeLessThan(1.5);
      
      console.log(`Original: ${originalTime.toFixed(2)}ms, Enhanced: ${enhancedTime.toFixed(2)}ms, Ratio: ${performanceRatio.toFixed(2)}`);
    });

    test('should handle high-frequency messages without memory leaks', () => {
      const initialMemory = process.memoryUsage();
      
      // Simulate high-frequency tool call messages
      for (let i = 0; i < 1000; i++) {
        const message = {
          data: i % 2 === 0 
            ? `<function_calls><invoke name="Test"><parameter name="id">${i}</parameter></invoke></function_calls>`
            : `Regular message ${i}`,
          timestamp: Date.now()
        };

        const formattedMessage = toolCallFormatter.formatToolCallOutput(message.data, 'perf-test');
        // Simulate sending to WebSocket
        JSON.stringify(formattedMessage);
      }

      // Force garbage collection if available
      if (global.gc) {
        global.gc();
      }

      const finalMemory = process.memoryUsage();
      const memoryIncrease = finalMemory.heapUsed - initialMemory.heapUsed;
      
      // Memory increase should be reasonable (less than 50MB)
      expect(memoryIncrease).toBeLessThan(50 * 1024 * 1024);
    });
  });

  describe('Error Resilience', () => {
    test('should continue working when WebSocket connections fail', () => {
      const failingWS = {
        readyState: WebSocket.OPEN,
        send: jest.fn(() => { throw new Error('WebSocket send failed'); })
      };

      const workingWS = {
        readyState: WebSocket.OPEN,
        send: jest.fn()
      };

      const connectionSet = new Set([failingWS, workingWS]);
      mockWSConnections.set('mixed-instance', connectionSet);

      const enhancedBroadcast = (instanceId, message) => {
        const connections = mockWSConnections.get(instanceId);
        if (connections) {
          const wsMessage = JSON.stringify({
            type: 'output',
            data: message.data,
            terminalId: instanceId
          });

          connections.forEach(ws => {
            if (ws.readyState === WebSocket.OPEN) {
              try {
                ws.send(wsMessage);
              } catch (error) {
                console.warn('WebSocket send failed:', error.message);
                connections.delete(ws); // Remove failing connection
              }
            }
          });
        }
      };

      enhancedBroadcast('mixed-instance', { data: 'Test message' });

      expect(failingWS.send).toHaveBeenCalled();
      expect(workingWS.send).toHaveBeenCalled();
      
      // Failing connection should be removed
      expect(mockWSConnections.get('mixed-instance').has(failingWS)).toBe(false);
      expect(mockWSConnections.get('mixed-instance').has(workingWS)).toBe(true);
    });

    test('should gracefully handle formatter errors', () => {
      // Create a scenario that might cause formatter errors
      const problematicMessage = {
        data: '<function_calls><invoke name="InvalidTool">', // Malformed
        timestamp: Date.now()
      };

      const enhancedBroadcast = (instanceId, message) => {
        let formattedMessage;
        try {
          const rawOutput = message.data || message.output || '';
          formattedMessage = toolCallFormatter.formatToolCallOutput(rawOutput, instanceId);
        } catch (error) {
          // Fallback to original format
          formattedMessage = {
            type: 'output',
            data: message.data,
            terminalId: instanceId,
            timestamp: message.timestamp,
            enhanced: false,
            error: 'formatting_failed'
          };
        }

        const connections = mockWSConnections.get(instanceId);
        if (connections) {
          const wsMessage = JSON.stringify(formattedMessage);
          connections.forEach(ws => {
            if (ws.readyState === WebSocket.OPEN) {
              ws.send(wsMessage);
            }
          });
        }
      };

      // Should not throw an error
      expect(() => {
        enhancedBroadcast('test-instance', problematicMessage);
      }).not.toThrow();

      const mockWS = Array.from(mockWSConnections.get('test-instance'))[0];
      expect(mockWS.send).toHaveBeenCalled();
      
      const sentMessage = JSON.parse(mockWS.send.mock.calls[0][0]);
      expect(sentMessage.type).toBe('output');
      expect(sentMessage.enhanced).toBe(false);
      expect(sentMessage.error).toBe('formatting_failed');
    });
  });

  describe('Status Update Integration', () => {
    test('should handle tool status updates through WebSocket', () => {
      const statusManager = new ToolCallStatusManager();
      const statusUpdates = [];

      // Mock broadcast to capture status updates
      const mockBroadcast = (instanceId, message) => {
        if (message.type === 'tool_status') {
          statusUpdates.push(message);
        }
      };

      statusManager.setBroadcastFunction(mockBroadcast);

      // Start monitoring a tool call
      statusManager.startMonitoring('tool-ws-test', 'ws-instance', {
        toolName: 'Read',
        parameters: { file_path: '/test/file.txt' }
      });

      // Should have sent initial status update
      expect(statusUpdates.length).toBeGreaterThan(0);
      expect(statusUpdates[0].toolStatusUpdate.status).toBe('starting');

      // Complete the tool call
      statusManager.completeToolCall('tool-ws-test', 'ws-instance', { result: 'success' });

      // Should have sent completion status
      const completionUpdate = statusUpdates.find(update => 
        update.toolStatusUpdate.status === 'completed'
      );
      expect(completionUpdate).toBeDefined();
    });
  });

  describe('Backward Compatibility', () => {
    test('should work with existing WebSocket client expectations', () => {
      // Test that enhanced messages still contain all required fields for existing clients
      const toolCallMessage = {
        data: `<function_calls><invoke name="Write"><parameter name="file_path">test.txt</parameter></invoke></function_calls>`,
        timestamp: Date.now(),
        source: 'claude-api'
      };

      const formattedMessage = toolCallFormatter.formatToolCallOutput(
        toolCallMessage.data, 
        'compat-test'
      );

      // Should still have basic required fields
      expect(formattedMessage).toHaveProperty('type');
      expect(formattedMessage).toHaveProperty('data');
      expect(formattedMessage).toHaveProperty('terminalId');
      expect(formattedMessage).toHaveProperty('timestamp');
      expect(formattedMessage).toHaveProperty('source');

      // But also have enhanced fields
      expect(formattedMessage).toHaveProperty('enhanced');
      expect(formattedMessage).toHaveProperty('toolCall');
    });
  });
});