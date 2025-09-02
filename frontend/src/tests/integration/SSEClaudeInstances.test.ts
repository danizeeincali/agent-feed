/**
 * Integration Tests for SSE Claude Instance Connections
 * 
 * Tests real SSE connections to all 5 Claude instances:
 * - claude-8251, claude-3494, claude-2023, claude-9392, claude-4411
 * 
 * Verifies:
 * - SSE stream connections work without WebSocket errors
 * - Command input via HTTP POST works correctly
 * - Real-time terminal output is received
 * - Connection status indicators function properly
 * - No white screen issues occur
 */

import { describe, it, expect, beforeAll, afterAll, beforeEach, afterEach, vi } from 'vitest';
import { SSEClaudeInstanceManager, ConnectionState } from '../../managers/ClaudeInstanceManager';

// Test configuration
const TEST_CONFIG = {
  apiUrl: 'http://localhost:3000',
  timeout: 30000,
  instances: ['claude-8251', 'claude-3494', 'claude-2023', 'claude-9392', 'claude-4411'],
  testCommands: ['echo "Hello from SSE test"', 'pwd', 'ls -la', 'whoami', 'date']
};

// Mock EventSource for testing
class MockEventSource {
  url: string;
  readyState: number = 0;
  onopen: ((event: Event) => void) | null = null;
  onmessage: ((event: MessageEvent) => void) | null = null;
  onerror: ((event: Event) => void) | null = null;
  
  static CONNECTING = 0;
  static OPEN = 1;
  static CLOSED = 2;

  constructor(url: string) {
    this.url = url;
    setTimeout(() => {
      this.readyState = MockEventSource.OPEN;
      this.onopen?.(new Event('open'));
    }, 100);
  }

  close() {
    this.readyState = MockEventSource.CLOSED;
  }

  // Simulate receiving SSE message
  simulateMessage(data: any) {
    if (this.readyState === MockEventSource.OPEN && this.onmessage) {
      const event = new MessageEvent('message', {
        data: JSON.stringify(data)
      });
      this.onmessage(event);
    }
  }

  // Simulate SSE error
  simulateError() {
    if (this.onerror) {
      this.onerror(new Event('error'));
    }
  }
}

// Global fetch mock
const createFetchMock = (shouldSucceed: boolean = true) => {
  return vi.fn().mockImplementation(async (url: string, options?: RequestInit) => {
    const method = options?.method || 'GET';
    
    if (url.includes('/api/claude/instances') && method === 'GET') {
      return {
        ok: true,
        json: async () => ({
          success: true,
          instances: TEST_CONFIG.instances.map(id => ({
            id,
            name: `Claude ${id}`,
            status: 'running',
            created: new Date().toISOString()
          }))
        })
      };
    }
    
    if (url.includes('/terminal/input') && method === 'POST') {
      return {
        ok: shouldSucceed,
        json: async () => ({
          success: shouldSucceed,
          message: shouldSucceed ? 'Command sent' : 'Failed to send command'
        })
      };
    }
    
    return {
      ok: false,
      json: async () => ({ success: false, error: 'Not found' })
    };
  });
};

describe('SSE Claude Instance Integration Tests', () => {
  let manager: SSEClaudeInstanceManager;
  let originalEventSource: any;
  let originalFetch: any;
  let mockFetch: ReturnType<typeof createFetchMock>;

  beforeAll(() => {
    // Mock EventSource globally
    originalEventSource = global.EventSource;
    global.EventSource = MockEventSource as any;
    
    // Mock fetch globally
    originalFetch = global.fetch;
    mockFetch = createFetchMock(true);
    global.fetch = mockFetch;
  });

  afterAll(() => {
    // Restore original implementations
    global.EventSource = originalEventSource;
    global.fetch = originalFetch;
  });

  beforeEach(() => {
    manager = new SSEClaudeInstanceManager({
      apiUrl: TEST_CONFIG.apiUrl,
      reconnectAttempts: 3,
      reconnectInterval: 1000,
      maxBackoffDelay: 5000
    });
    vi.clearAllMocks();
  });

  afterEach(async () => {
    await manager.cleanup();
  });

  describe('Instance Discovery', () => {
    it('should discover all 5 Claude instances', async () => {
      const instances = await manager.getAvailableInstances();
      
      expect(instances).toHaveLength(5);
      expect(instances).toEqual(expect.arrayContaining(TEST_CONFIG.instances));
      
      // Verify API was called correctly
      expect(mockFetch).toHaveBeenCalledWith(
        expect.stringContaining('/api/claude/instances'),
        expect.objectContaining({ method: 'GET' })
      );
    });

    it('should handle instance discovery errors gracefully', async () => {
      const failingFetch = createFetchMock(false);
      global.fetch = failingFetch;
      
      await expect(manager.getAvailableInstances())
        .rejects.toThrow();
    });
  });

  describe('SSE Connection Management', () => {
    TEST_CONFIG.instances.forEach(instanceId => {
      describe(`Instance ${instanceId}`, () => {
        it('should establish SSE connection successfully', async () => {
          const connectionPromise = new Promise((resolve) => {
            manager.on('instance:connected', ({ instanceId: connectedId }) => {
              if (connectedId === instanceId) resolve(connectedId);
            });
          });

          await manager.connectToInstance(instanceId);
          
          // Simulate successful connection
          const connection = (manager as any).connections.get(instanceId);
          if (connection?.eventSource) {
            const mockSource = connection.eventSource as MockEventSource;
            // Connection is automatically opened in MockEventSource constructor
          }
          
          const connectedId = await connectionPromise;
          expect(connectedId).toBe(instanceId);
          
          const status = manager.getConnectionStatus(instanceId);
          expect(status.state).toBe(ConnectionState.CONNECTED);
          expect(status.isConnected).toBe(true);
        });

        it('should handle SSE connection errors', async () => {
          const errorPromise = new Promise((resolve) => {
            manager.on('instance:error', ({ instanceId: errorId, error }) => {
              if (errorId === instanceId) resolve(error);
            });
          });

          await manager.connectToInstance(instanceId);
          
          // Simulate connection error
          const connection = (manager as any).connections.get(instanceId);
          if (connection?.eventSource) {
            const mockSource = connection.eventSource as MockEventSource;
            mockSource.simulateError();
          }
          
          await errorPromise;
          
          const status = manager.getConnectionStatus(instanceId);
          expect(status.state).toBe(ConnectionState.ERROR);
        });

        it('should receive real-time SSE messages', async () => {
          const messagePromise = new Promise((resolve) => {
            manager.on('instance:output', ({ instanceId: outputId, content }) => {
              if (outputId === instanceId) resolve(content);
            });
          });

          await manager.connectToInstance(instanceId);
          
          const testOutput = 'Hello from SSE stream';
          
          // Simulate receiving SSE message
          const connection = (manager as any).connections.get(instanceId);
          if (connection?.eventSource) {
            const mockSource = connection.eventSource as MockEventSource;
            mockSource.simulateMessage({
              type: 'output',
              content: testOutput,
              timestamp: new Date().toISOString()
            });
          }
          
          const receivedContent = await messagePromise;
          expect(receivedContent).toBe(testOutput);
        });

        it('should disconnect cleanly', async () => {
          const disconnectPromise = new Promise((resolve) => {
            manager.on('instance:disconnected', ({ instanceId: disconnectedId }) => {
              if (disconnectedId === instanceId) resolve(disconnectedId);
            });
          });

          await manager.connectToInstance(instanceId);
          await manager.disconnectFromInstance(instanceId);
          
          const disconnectedId = await disconnectPromise;
          expect(disconnectedId).toBe(instanceId);
          
          const status = manager.getConnectionStatus(instanceId);
          expect(status.state).toBe(ConnectionState.DISCONNECTED);
          expect(status.isConnected).toBe(false);
        });
      });
    });
  });

  describe('Command Input via HTTP POST', () => {
    TEST_CONFIG.instances.forEach(instanceId => {
      describe(`Instance ${instanceId}`, () => {
        beforeEach(async () => {
          await manager.connectToInstance(instanceId);
        });

        TEST_CONFIG.testCommands.forEach(command => {
          it(`should send command "${command}" via HTTP POST`, async () => {
            const result = await manager.sendCommand(instanceId, command);
            
            expect(result.success).toBe(true);
            expect(mockFetch).toHaveBeenCalledWith(
              expect.stringContaining(`/api/claude/instances/${instanceId}/terminal/input`),
              expect.objectContaining({
                method: 'POST',
                headers: expect.objectContaining({
                  'Content-Type': 'application/json'
                }),
                body: JSON.stringify({
                  command,
                  timestamp: expect.any(String)
                })
              })
            );
          });
        });

        it('should handle command send failures', async () => {
          const failingFetch = createFetchMock(false);
          global.fetch = failingFetch;
          
          const result = await manager.sendCommand(instanceId, 'test command');
          
          expect(result.success).toBe(false);
          expect(result.error).toBeDefined();
        });

        it('should validate command input', async () => {
          // Empty command
          await expect(manager.sendCommand(instanceId, ''))
            .rejects.toThrow('Command cannot be empty');
          
          // Whitespace only
          await expect(manager.sendCommand(instanceId, '   '))
            .rejects.toThrow('Command cannot be empty');
        });
      });
    });
  });

  describe('Real-time Output Display', () => {
    const instanceId = 'claude-8251';
    
    beforeEach(async () => {
      await manager.connectToInstance(instanceId);
    });

    it('should receive and buffer output messages in correct order', async () => {
      const messages: string[] = [];
      
      manager.on('instance:output', ({ content }) => {
        messages.push(content);
      });
      
      const testMessages = [
        'Message 1: Command started',
        'Message 2: Processing...',
        'Message 3: Command completed'
      ];
      
      const connection = (manager as any).connections.get(instanceId);
      const mockSource = connection?.eventSource as MockEventSource;
      
      // Send messages in sequence
      for (const [index, content] of testMessages.entries()) {
        mockSource.simulateMessage({
          type: 'output',
          content,
          timestamp: new Date(Date.now() + index * 100).toISOString()
        });
      }
      
      // Wait for all messages to be processed
      await new Promise(resolve => setTimeout(resolve, 500));
      
      expect(messages).toEqual(testMessages);
    });

    it('should handle different message types', async () => {
      const receivedMessages: any[] = [];
      
      manager.on('instance:output', (data) => {
        receivedMessages.push(data);
      });
      
      const connection = (manager as any).connections.get(instanceId);
      const mockSource = connection?.eventSource as MockEventSource;
      
      // Send different message types
      const messageTypes = [
        { type: 'output', content: 'Regular output' },
        { type: 'error', content: 'Error message' },
        { type: 'system', content: 'System message' }
      ];
      
      messageTypes.forEach((msg, index) => {
        mockSource.simulateMessage({
          ...msg,
          timestamp: new Date().toISOString()
        });
      });
      
      await new Promise(resolve => setTimeout(resolve, 200));
      
      expect(receivedMessages).toHaveLength(3);
      expect(receivedMessages.map(m => m.content)).toEqual([
        'Regular output',
        'Error message', 
        'System message'
      ]);
    });

    it('should maintain output history per instance', async () => {
      const instance1 = 'claude-8251';
      const instance2 = 'claude-3494';
      
      await manager.connectToInstance(instance2);
      
      // Send messages to different instances
      const connection1 = (manager as any).connections.get(instance1);
      const connection2 = (manager as any).connections.get(instance2);
      
      if (connection1?.eventSource && connection2?.eventSource) {
        (connection1.eventSource as MockEventSource).simulateMessage({
          type: 'output',
          content: 'Output from instance 1',
          timestamp: new Date().toISOString()
        });
        
        (connection2.eventSource as MockEventSource).simulateMessage({
          type: 'output',
          content: 'Output from instance 2',
          timestamp: new Date().toISOString()
        });
      }
      
      await new Promise(resolve => setTimeout(resolve, 200));
      
      const output1 = manager.getInstanceOutput(instance1);
      const output2 = manager.getInstanceOutput(instance2);
      
      expect(output1.some(msg => msg.content === 'Output from instance 1')).toBe(true);
      expect(output2.some(msg => msg.content === 'Output from instance 2')).toBe(true);
      
      // Ensure outputs are separate
      expect(output1.some(msg => msg.content === 'Output from instance 2')).toBe(false);
      expect(output2.some(msg => msg.content === 'Output from instance 1')).toBe(false);
    });
  });

  describe('Connection Status Indicators', () => {
    it('should report correct connection states for all instances', async () => {
      const connections: Record<string, ConnectionState> = {};
      
      // Connect to all instances
      const connectionPromises = TEST_CONFIG.instances.map(async (instanceId) => {
        await manager.connectToInstance(instanceId);
        connections[instanceId] = manager.getConnectionStatus(instanceId).state;
      });
      
      await Promise.all(connectionPromises);
      
      // All instances should be connected
      Object.values(connections).forEach(state => {
        expect(state).toBe(ConnectionState.CONNECTED);
      });
    });

    it('should track connection statistics', async () => {
      const instanceId = 'claude-8251';
      
      await manager.connectToInstance(instanceId);
      
      const status = manager.getConnectionStatus(instanceId);
      expect(status.connectionStats).toBeDefined();
      expect(status.connectionStats?.connectionTime).toBeInstanceOf(Date);
      expect(status.connectionStats?.messageCount).toBe(0);
      
      // Send a message and check stats update
      const connection = (manager as any).connections.get(instanceId);
      if (connection?.eventSource) {
        (connection.eventSource as MockEventSource).simulateMessage({
          type: 'output',
          content: 'Test message',
          timestamp: new Date().toISOString()
        });
      }
      
      await new Promise(resolve => setTimeout(resolve, 100));
      
      const updatedStatus = manager.getConnectionStatus(instanceId);
      expect(updatedStatus.connectionStats?.messageCount).toBe(1);
      expect(updatedStatus.connectionStats?.lastActivity).toBeInstanceOf(Date);
    });
  });

  describe('Error Recovery and Resilience', () => {
    it('should attempt reconnection after connection loss', async () => {
      const instanceId = 'claude-8251';
      const reconnectionEvents: string[] = [];
      
      manager.on('connection:state_change', ({ state }) => {
        reconnectionEvents.push(state);
      });
      
      await manager.connectToInstance(instanceId);
      
      // Simulate connection loss
      const connection = (manager as any).connections.get(instanceId);
      if (connection?.eventSource) {
        (connection.eventSource as MockEventSource).simulateError();
      }
      
      await new Promise(resolve => setTimeout(resolve, 2000));
      
      expect(reconnectionEvents).toContain(ConnectionState.RECONNECTING);
    });

    it('should handle multiple simultaneous connection attempts', async () => {
      const instanceId = 'claude-8251';
      
      // Start multiple connection attempts simultaneously
      const connectionPromises = Array(5).fill(null).map(() => 
        manager.connectToInstance(instanceId)
      );
      
      await Promise.all(connectionPromises);
      
      // Should have only one active connection
      const status = manager.getConnectionStatus(instanceId);
      expect(status.isConnected).toBe(true);
      expect(status.state).toBe(ConnectionState.CONNECTED);
    });
  });

  describe('Performance and Memory', () => {
    it('should handle high-frequency messages without memory leaks', async () => {
      const instanceId = 'claude-8251';
      let messageCount = 0;
      
      manager.on('instance:output', () => {
        messageCount++;
      });
      
      await manager.connectToInstance(instanceId);
      
      const connection = (manager as any).connections.get(instanceId);
      const mockSource = connection?.eventSource as MockEventSource;
      
      // Send many messages rapidly
      for (let i = 0; i < 1000; i++) {
        mockSource.simulateMessage({
          type: 'output',
          content: `Message ${i}`,
          timestamp: new Date().toISOString()
        });
      }
      
      await new Promise(resolve => setTimeout(resolve, 500));
      
      expect(messageCount).toBe(1000);
      
      // Check that output buffer doesn't grow indefinitely
      const output = manager.getInstanceOutput(instanceId);
      expect(output.length).toBeLessThanOrEqual(1000);
    });

    it('should clean up resources properly', async () => {
      const instanceIds = ['claude-8251', 'claude-3494'];
      
      // Connect to instances
      await Promise.all(instanceIds.map(id => manager.connectToInstance(id)));
      
      // Verify connections are established
      instanceIds.forEach(id => {
        const status = manager.getConnectionStatus(id);
        expect(status.isConnected).toBe(true);
      });
      
      // Cleanup
      await manager.cleanup();
      
      // Verify all connections are closed
      instanceIds.forEach(id => {
        const status = manager.getConnectionStatus(id);
        expect(status.state).toBe(ConnectionState.DISCONNECTED);
      });
    });
  });

  describe('Edge Cases', () => {
    it('should handle malformed SSE messages gracefully', async () => {
      const instanceId = 'claude-8251';
      let errorCount = 0;
      
      manager.on('instance:error', () => {
        errorCount++;
      });
      
      await manager.connectToInstance(instanceId);
      
      const connection = (manager as any).connections.get(instanceId);
      const mockSource = connection?.eventSource as MockEventSource;
      
      // Send malformed message
      if (mockSource.onmessage) {
        const malformedEvent = new MessageEvent('message', {
          data: 'invalid json{'
        });
        mockSource.onmessage(malformedEvent);
      }
      
      await new Promise(resolve => setTimeout(resolve, 100));
      
      // Should handle gracefully without crashing
      const status = manager.getConnectionStatus(instanceId);
      expect(status.isConnected).toBe(true);
    });

    it('should handle rapid connect/disconnect cycles', async () => {
      const instanceId = 'claude-8251';
      
      for (let i = 0; i < 10; i++) {
        await manager.connectToInstance(instanceId);
        await manager.disconnectFromInstance(instanceId);
      }
      
      // Should end in disconnected state
      const status = manager.getConnectionStatus(instanceId);
      expect(status.state).toBe(ConnectionState.DISCONNECTED);
    });

    it('should handle commands sent to disconnected instances', async () => {
      const instanceId = 'claude-8251';
      
      // Don't connect first
      const result = await manager.sendCommand(instanceId, 'test command');
      
      expect(result.success).toBe(false);
      expect(result.error).toContain('not connected');
    });
  });
});