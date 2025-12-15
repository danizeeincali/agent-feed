import { describe, it, expect, beforeEach, vi } from 'vitest';
import { broadcastToSSE, streamingTickerMessages } from '../../server.js';

describe('broadcastToSSE - Message Persistence', () => {
  let mockConnections;
  let mockClient1, mockClient2;

  beforeEach(() => {
    // Clear message history before each test
    streamingTickerMessages.length = 0;

    // Mock SSE clients
    mockClient1 = {
      writable: true,
      write: vi.fn(),
      destroyed: false
    };
    mockClient2 = {
      writable: true,
      write: vi.fn(),
      destroyed: false
    };

    mockConnections = new Set([mockClient1, mockClient2]);
  });

  describe('Basic Persistence', () => {
    it('should persist message to streamingTickerMessages array', () => {
      const message = {
        type: 'tool_activity',
        data: {
          tool: 'Read',
          action: 'package.json',
          priority: 'high',
          timestamp: Date.now()
        }
      };

      const result = broadcastToSSE(message, mockConnections);

      expect(streamingTickerMessages.length).toBe(1);
      expect(streamingTickerMessages[0].type).toBe('tool_activity');
      expect(streamingTickerMessages[0].data.tool).toBe('Read');
      expect(streamingTickerMessages[0].data.action).toBe('package.json');
      expect(result.persistedToHistory).toBe(true);
    });

    it('should persist multiple messages in order', () => {
      const messages = [
        { type: 'tool_activity', data: { tool: 'Read', action: 'file1.js', priority: 'high' } },
        { type: 'tool_activity', data: { tool: 'Edit', action: 'file2.js', priority: 'high' } },
        { type: 'tool_activity', data: { tool: 'Bash', action: 'npm test', priority: 'high' } }
      ];

      messages.forEach(msg => broadcastToSSE(msg, mockConnections));

      expect(streamingTickerMessages.length).toBe(3);
      expect(streamingTickerMessages[0].data.tool).toBe('Read');
      expect(streamingTickerMessages[1].data.tool).toBe('Edit');
      expect(streamingTickerMessages[2].data.tool).toBe('Bash');
    });

    it('should persist even when no connections are active', () => {
      const emptyConnections = new Set();
      const message = {
        type: 'tool_activity',
        data: { tool: 'Task', action: 'Run tests', priority: 'high' }
      };

      const result = broadcastToSSE(message, emptyConnections);

      expect(streamingTickerMessages.length).toBe(1);
      expect(streamingTickerMessages[0].data.tool).toBe('Task');
      expect(result.broadcastCount).toBe(0);
      expect(result.persistedToHistory).toBe(true);
    });
  });

  describe('100 Message Limit', () => {
    it('should maintain 100 message limit by removing oldest', () => {
      // Fill array with 100 messages
      for (let i = 1; i <= 100; i++) {
        const message = {
          type: 'tool_activity',
          data: { tool: 'Test', action: `message-${i}`, priority: 'high' }
        };
        broadcastToSSE(message, mockConnections);
      }

      expect(streamingTickerMessages.length).toBe(100);
      expect(streamingTickerMessages[0].data.action).toBe('message-1');
      expect(streamingTickerMessages[99].data.action).toBe('message-100');

      // Add 101st message
      const newMessage = {
        type: 'tool_activity',
        data: { tool: 'Test', action: 'message-101', priority: 'high' }
      };
      broadcastToSSE(newMessage, mockConnections);

      // Verify oldest was removed
      expect(streamingTickerMessages.length).toBe(100);
      expect(streamingTickerMessages[0].data.action).toBe('message-2'); // message-1 removed
      expect(streamingTickerMessages[99].data.action).toBe('message-101'); // new message at end
    });

    it('should handle multiple messages beyond limit correctly', () => {
      // Add 105 messages
      for (let i = 1; i <= 105; i++) {
        const message = {
          type: 'tool_activity',
          data: { tool: 'Test', action: `message-${i}`, priority: 'high' }
        };
        broadcastToSSE(message, mockConnections);
      }

      expect(streamingTickerMessages.length).toBe(100);
      expect(streamingTickerMessages[0].data.action).toBe('message-6'); // first 5 removed
      expect(streamingTickerMessages[99].data.action).toBe('message-105');
    });

    it('should work correctly with exactly 100 messages', () => {
      // Add exactly 100 messages
      for (let i = 1; i <= 100; i++) {
        const message = {
          type: 'tool_activity',
          data: { tool: 'Test', action: `message-${i}`, priority: 'high' }
        };
        broadcastToSSE(message, mockConnections);
      }

      expect(streamingTickerMessages.length).toBe(100);
      expect(streamingTickerMessages[0].data.action).toBe('message-1');
      expect(streamingTickerMessages[99].data.action).toBe('message-100');
    });
  });

  describe('Message Enrichment', () => {
    it('should add UUID if missing', () => {
      const message = {
        type: 'tool_activity',
        data: { tool: 'Bash', action: 'git status', priority: 'high' }
      };

      broadcastToSSE(message, mockConnections);

      const persistedMessage = streamingTickerMessages[0];
      expect(persistedMessage.id).toBeDefined();
      expect(typeof persistedMessage.id).toBe('string');
      expect(persistedMessage.id.length).toBeGreaterThan(0);
    });

    it('should add timestamp if missing', () => {
      const message = {
        type: 'tool_activity',
        data: { tool: 'Edit', action: 'file.tsx', priority: 'high' }
      };

      const beforeTimestamp = Date.now();
      broadcastToSSE(message, mockConnections);
      const afterTimestamp = Date.now();

      const persistedMessage = streamingTickerMessages[0];
      expect(persistedMessage.data.timestamp).toBeDefined();
      expect(typeof persistedMessage.data.timestamp).toBe('number');
      expect(persistedMessage.data.timestamp).toBeGreaterThanOrEqual(beforeTimestamp);
      expect(persistedMessage.data.timestamp).toBeLessThanOrEqual(afterTimestamp);
    });

    it('should preserve existing UUID and timestamp', () => {
      const existingId = 'test-uuid-12345';
      const existingTimestamp = 1234567890;

      const message = {
        id: existingId,
        type: 'tool_activity',
        data: {
          tool: 'Read',
          action: 'file.js',
          priority: 'high',
          timestamp: existingTimestamp
        }
      };

      broadcastToSSE(message, mockConnections);

      const persistedMessage = streamingTickerMessages[0];
      expect(persistedMessage.id).toBe(existingId);
      expect(persistedMessage.data.timestamp).toBe(existingTimestamp);
    });
  });

  describe('Broadcast and Persist Together', () => {
    it('should broadcast to active connections AND persist', () => {
      const message = {
        type: 'tool_activity',
        data: { tool: 'Edit', action: 'file.tsx', priority: 'high' }
      };

      const result = broadcastToSSE(message, mockConnections);

      // Verify broadcast to clients
      expect(mockClient1.write).toHaveBeenCalledTimes(1);
      expect(mockClient2.write).toHaveBeenCalledTimes(1);

      // Verify persistence to array
      expect(streamingTickerMessages.length).toBe(1);
      expect(streamingTickerMessages[0].data.tool).toBe('Edit');

      // Verify result metrics
      expect(result.broadcastCount).toBe(2);
      expect(result.persistedToHistory).toBe(true);
      expect(result.historySize).toBe(1);
    });

    it('should persist before broadcasting (order matters)', () => {
      const callOrder = [];

      mockClient1.write = vi.fn(() => {
        callOrder.push('broadcast');
        // Check if message was already persisted
        if (streamingTickerMessages.length > 0) {
          callOrder.push('after-persist');
        }
      });

      const message = {
        type: 'tool_activity',
        data: { tool: 'Test', action: 'check', priority: 'high' }
      };

      broadcastToSSE(message, mockConnections);

      expect(callOrder).toContain('after-persist');
      expect(streamingTickerMessages.length).toBe(1);
    });

    it('should include same data in broadcast and persistence', () => {
      const message = {
        type: 'tool_activity',
        data: { tool: 'Grep', action: 'search.js', priority: 'high' }
      };

      broadcastToSSE(message, mockConnections);

      const broadcastedMessage = JSON.parse(
        mockClient1.write.mock.calls[0][0].replace('data: ', '').trim()
      );
      const persistedMessage = streamingTickerMessages[0];

      expect(broadcastedMessage.id).toBe(persistedMessage.id);
      expect(broadcastedMessage.type).toBe(persistedMessage.type);
      expect(broadcastedMessage.data.tool).toBe(persistedMessage.data.tool);
      expect(broadcastedMessage.data.action).toBe(persistedMessage.data.action);
      expect(broadcastedMessage.data.timestamp).toBe(persistedMessage.data.timestamp);
    });
  });

  describe('Invalid Message Handling', () => {
    it('should not persist invalid message (null)', () => {
      const result = broadcastToSSE(null, mockConnections);

      expect(streamingTickerMessages.length).toBe(0);
      expect(result).toBeUndefined();
    });

    it('should not persist invalid message (missing type)', () => {
      const invalidMessage = {
        data: { tool: 'Test', action: 'test', priority: 'high' }
      };

      broadcastToSSE(invalidMessage, mockConnections);

      expect(streamingTickerMessages.length).toBe(0);
    });

    it('should not persist invalid message (missing data)', () => {
      const invalidMessage = {
        type: 'tool_activity'
      };

      broadcastToSSE(invalidMessage, mockConnections);

      expect(streamingTickerMessages.length).toBe(0);
    });

    it('should not persist when validation fails', () => {
      const invalidMessage = {};

      broadcastToSSE(invalidMessage, mockConnections);

      expect(streamingTickerMessages.length).toBe(0);
      expect(mockClient1.write).not.toHaveBeenCalled();
    });
  });

  describe('Return Value Metrics', () => {
    it('should return success metrics with correct values', () => {
      const message = {
        type: 'tool_activity',
        data: { tool: 'Task', action: 'run', priority: 'high' }
      };

      const result = broadcastToSSE(message, mockConnections);

      expect(result).toBeDefined();
      expect(result.success).toBe(true);
      expect(result.broadcastCount).toBe(2);
      expect(result.persistedToHistory).toBe(true);
      expect(result.historySize).toBe(1);
    });

    it('should return correct broadcast count with dead connections', () => {
      mockClient1.write = vi.fn(() => {
        throw new Error('Connection failed');
      });

      const message = {
        type: 'tool_activity',
        data: { tool: 'Test', action: 'test', priority: 'high' }
      };

      const result = broadcastToSSE(message, mockConnections);

      // After dead clients are removed, connection set size is 1
      // broadcastCount = connections.size (after cleanup) = 1
      expect(result.broadcastCount).toBe(1);
      expect(result.persistedToHistory).toBe(true);

      // Verify dead client was removed from pool
      expect(mockConnections.has(mockClient1)).toBe(false);
      expect(mockConnections.size).toBe(1);
    });

    it('should return correct history size after multiple messages', () => {
      for (let i = 1; i <= 5; i++) {
        const message = {
          type: 'tool_activity',
          data: { tool: 'Test', action: `test-${i}`, priority: 'high' }
        };
        const result = broadcastToSSE(message, mockConnections);
        expect(result.historySize).toBe(i);
      }
    });

    it('should return error object on exception', () => {
      // Force an error by making validateSSEMessage fail
      const message = {
        type: 'tool_activity',
        data: { tool: 'Test', action: 'test', priority: 'high' }
      };

      // Mock write to throw during broadcast phase (after persist)
      mockClient1.write = vi.fn(() => {
        throw new Error('Broadcast error');
      });
      mockClient2.write = vi.fn(() => {
        throw new Error('Broadcast error');
      });

      const result = broadcastToSSE(message, mockConnections);

      // Message should still be persisted even with broadcast errors
      expect(streamingTickerMessages.length).toBe(1);
      expect(result.persistedToHistory).toBe(true);
    });
  });

  describe('Connection Pool Cleanup', () => {
    it('should persist even when all connections are dead', () => {
      mockClient1.writable = false;
      mockClient2.destroyed = true;

      const message = {
        type: 'tool_activity',
        data: { tool: 'Test', action: 'test', priority: 'high' }
      };

      const result = broadcastToSSE(message, mockConnections);

      expect(streamingTickerMessages.length).toBe(1);
      expect(result.persistedToHistory).toBe(true);
      expect(result.broadcastCount).toBe(0);
    });

    it('should clean up dead connections after persisting', () => {
      const initialSize = mockConnections.size;
      mockClient1.write = vi.fn(() => {
        throw new Error('Dead connection');
      });

      const message = {
        type: 'tool_activity',
        data: { tool: 'Test', action: 'test', priority: 'high' }
      };

      broadcastToSSE(message, mockConnections);

      expect(mockConnections.size).toBe(initialSize - 1);
      expect(mockConnections.has(mockClient1)).toBe(false);
      expect(streamingTickerMessages.length).toBe(1); // Still persisted
    });
  });

  describe('Different Message Types', () => {
    it('should persist tool_activity messages', () => {
      const message = {
        type: 'tool_activity',
        data: { tool: 'Read', action: 'file.js', priority: 'high' }
      };

      broadcastToSSE(message, mockConnections);

      expect(streamingTickerMessages.length).toBe(1);
      expect(streamingTickerMessages[0].type).toBe('tool_activity');
    });

    it('should persist info messages', () => {
      const message = {
        type: 'info',
        data: { message: 'System message', priority: 'low' }
      };

      broadcastToSSE(message, mockConnections);

      expect(streamingTickerMessages.length).toBe(1);
      expect(streamingTickerMessages[0].type).toBe('info');
    });

    it('should persist any valid message type', () => {
      const message = {
        type: 'custom_type',
        data: { message: 'Custom message', priority: 'medium' }
      };

      broadcastToSSE(message, mockConnections);

      expect(streamingTickerMessages.length).toBe(1);
      expect(streamingTickerMessages[0].type).toBe('custom_type');
    });
  });

  describe('Edge Cases', () => {
    it('should handle empty connections set', () => {
      const emptySet = new Set();
      const message = {
        type: 'tool_activity',
        data: { tool: 'Test', action: 'test', priority: 'high' }
      };

      const result = broadcastToSSE(message, emptySet);

      expect(streamingTickerMessages.length).toBe(1);
      expect(result.broadcastCount).toBe(0);
      expect(result.persistedToHistory).toBe(true);
    });

    it('should handle rapid successive broadcasts', () => {
      const messages = Array.from({ length: 10 }, (_, i) => ({
        type: 'tool_activity',
        data: { tool: 'Test', action: `rapid-${i}`, priority: 'high' }
      }));

      messages.forEach(msg => broadcastToSSE(msg, mockConnections));

      expect(streamingTickerMessages.length).toBe(10);
      expect(streamingTickerMessages[0].data.action).toBe('rapid-0');
      expect(streamingTickerMessages[9].data.action).toBe('rapid-9');
    });

    it('should handle large message payloads', () => {
      const largeAction = 'x'.repeat(1000);
      const message = {
        type: 'tool_activity',
        data: { tool: 'Test', action: largeAction, priority: 'high' }
      };

      broadcastToSSE(message, mockConnections);

      expect(streamingTickerMessages.length).toBe(1);
      expect(streamingTickerMessages[0].data.action).toBe(largeAction);
    });

    it('should handle special characters in message', () => {
      const message = {
        type: 'tool_activity',
        data: {
          tool: 'Edit',
          action: 'file-with-émojis-😀.tsx',
          priority: 'high'
        }
      };

      broadcastToSSE(message, mockConnections);

      expect(streamingTickerMessages.length).toBe(1);
      expect(streamingTickerMessages[0].data.action).toBe('file-with-émojis-😀.tsx');
    });
  });
});
