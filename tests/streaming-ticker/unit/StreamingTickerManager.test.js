import { describe, it, expect, beforeEach, afterEach, vi, beforeAll, afterAll } from 'vitest';
import { EventEmitter } from 'events';
import StreamingTickerManager from '../../../src/services/StreamingTickerManager.js';

// Mock HTTP response object
const createMockResponse = () => ({
  writeHead: vi.fn(),
  write: vi.fn(),
  end: vi.fn(),
  headers: {},
  statusCode: 200
});

// Mock HTTP request object
const createMockRequest = () => ({
  on: vi.fn(),
  headers: {},
  url: '/test',
  method: 'GET'
});

describe('StreamingTickerManager', () => {
  let manager;
  let mockReq;
  let mockRes;

  beforeEach(() => {
    // Reset the singleton instance
    manager = StreamingTickerManager;
    manager.connections.clear();
    manager.isRunning = false;

    mockReq = createMockRequest();
    mockRes = createMockResponse();
  });

  afterEach(() => {
    // Clean up all connections
    manager.connections.clear();
    vi.clearAllMocks();
  });

  describe('Connection Management', () => {
    describe('createConnection', () => {
      it('should create a new SSE connection with proper headers', () => {
        const connectionId = manager.createConnection(mockReq, mockRes, 'testuser');

        expect(mockRes.writeHead).toHaveBeenCalledWith(200, {
          'Content-Type': 'text/event-stream',
          'Cache-Control': 'no-cache',
          'Connection': 'keep-alive',
          'Access-Control-Allow-Origin': '*',
          'Access-Control-Allow-Headers': 'Cache-Control'
        });

        expect(connectionId).toMatch(/^testuser_\d+_[a-z0-9]+$/);
        expect(manager.connections.has(connectionId)).toBe(true);
      });

      it('should use anonymous user when no userId provided', () => {
        const connectionId = manager.createConnection(mockReq, mockRes);

        expect(connectionId).toMatch(/^anonymous_\d+_[a-z0-9]+$/);
        expect(manager.connections.get(connectionId).userId).toBe('anonymous');
      });

      it('should send initial connection event', () => {
        const connectionId = manager.createConnection(mockReq, mockRes, 'testuser');

        expect(mockRes.write).toHaveBeenCalledWith(
          expect.stringContaining('data: {"type":"connection","data":{"status":"connected","connectionId":"' + connectionId + '"}}')
        );
      });

      it('should set up heartbeat mechanism', () => {
        vi.useFakeTimers();
        const connectionId = manager.createConnection(mockReq, mockRes, 'testuser');

        // Clear initial connection message
        mockRes.write.mockClear();

        // Advance time to trigger heartbeat
        vi.advanceTimersByTime(15000);

        expect(mockRes.write).toHaveBeenCalledWith(
          expect.stringContaining('data: {"type":"heartbeat","data":{"timestamp":')
        );

        vi.useRealTimers();
      });

      it('should handle connection close event', () => {
        const connectionId = manager.createConnection(mockReq, mockRes, 'testuser');
        const closeCallback = mockReq.on.mock.calls.find(call => call[0] === 'close')[1];

        expect(manager.connections.has(connectionId)).toBe(true);

        // Simulate connection close
        closeCallback();

        expect(manager.connections.has(connectionId)).toBe(false);
      });

      it('should set connection timeout', () => {
        vi.useFakeTimers();
        const connectionId = manager.createConnection(mockReq, mockRes, 'testuser');

        expect(manager.connections.has(connectionId)).toBe(true);

        // Advance time beyond timeout
        vi.advanceTimersByTime(manager.connectionTimeout + 1000);

        expect(manager.connections.has(connectionId)).toBe(false);
        expect(mockRes.end).toHaveBeenCalled();

        vi.useRealTimers();
      });
    });

    describe('sendToConnection', () => {
      let connectionId;

      beforeEach(() => {
        connectionId = manager.createConnection(mockReq, mockRes, 'testuser');
        mockRes.write.mockClear(); // Clear initial connection message
      });

      it('should send message to existing connection', () => {
        const message = { type: 'test', data: { content: 'hello' } };
        const result = manager.sendToConnection(connectionId, message);

        expect(result).toBe(true);
        expect(mockRes.write).toHaveBeenCalledWith(
          'data: {"type":"test","data":{"content":"hello"}}\n\n'
        );
      });

      it('should update last activity timestamp', () => {
        const connection = manager.connections.get(connectionId);
        const initialActivity = connection.lastActivity;

        // Wait a bit to ensure timestamp difference
        setTimeout(() => {
          manager.sendToConnection(connectionId, { type: 'test', data: {} });
          expect(connection.lastActivity).toBeGreaterThan(initialActivity);
        }, 10);
      });

      it('should return false for non-existent connection', () => {
        const result = manager.sendToConnection('nonexistent', { type: 'test', data: {} });
        expect(result).toBe(false);
      });

      it('should handle write errors gracefully', () => {
        mockRes.write.mockImplementation(() => {
          throw new Error('Write failed');
        });

        const result = manager.sendToConnection(connectionId, { type: 'test', data: {} });

        expect(result).toBe(false);
        expect(manager.connections.has(connectionId)).toBe(false);
      });
    });

    describe('broadcast', () => {
      let connectionIds;

      beforeEach(() => {
        connectionIds = [];
        for (let i = 0; i < 3; i++) {
          const req = createMockRequest();
          const res = createMockResponse();
          const id = manager.createConnection(req, res, `user${i}`);
          connectionIds.push(id);
        }
      });

      it('should send message to all active connections', () => {
        const message = { type: 'broadcast', data: { content: 'hello all' } };
        const sentCount = manager.broadcast(message);

        expect(sentCount).toBe(3);
      });

      it('should skip failed connections and return correct count', () => {
        // Make one connection fail
        const failingConnection = manager.connections.get(connectionIds[1]);
        failingConnection.response.write = vi.fn().mockImplementation(() => {
          throw new Error('Write failed');
        });

        const message = { type: 'broadcast', data: { content: 'hello all' } };
        const sentCount = manager.broadcast(message);

        expect(sentCount).toBe(2);
        expect(manager.connections.has(connectionIds[1])).toBe(false);
      });
    });

    describe('closeConnection', () => {
      let connectionId;

      beforeEach(() => {
        connectionId = manager.createConnection(mockReq, mockRes, 'testuser');
      });

      it('should close and remove connection', () => {
        manager.closeConnection(connectionId);

        expect(mockRes.end).toHaveBeenCalled();
        expect(manager.connections.has(connectionId)).toBe(false);
      });

      it('should handle close errors gracefully', () => {
        mockRes.end.mockImplementation(() => {
          throw new Error('Close failed');
        });

        // Should not throw
        expect(() => manager.closeConnection(connectionId)).not.toThrow();
        expect(manager.connections.has(connectionId)).toBe(false);
      });

      it('should handle non-existent connection', () => {
        expect(() => manager.closeConnection('nonexistent')).not.toThrow();
      });
    });
  });

  describe('Message Parsing', () => {
    describe('parseClaudeOutput', () => {
      it('should parse tool activity patterns', () => {
        const output = `
          Running command: npm test
          Reading file: package.json
          Writing to file: output.txt
          Editing file: config.js
          Searching for: test files
          Let me analyze this code
        `;

        const messages = manager.parseClaudeOutput(output);

        expect(messages).toHaveLength(6);
        expect(messages[0]).toMatchObject({
          type: 'tool_activity',
          tool: 'bash',
          action: 'npm test',
          priority: 'critical'
        });
        expect(messages[1]).toMatchObject({
          type: 'tool_activity',
          tool: 'read',
          action: 'package.json',
          priority: 'medium'
        });
      });

      it('should parse progress indicators', () => {
        const output = `
          Progress: 45%
          Step 3 of 10
          Step 7
        `;

        const messages = manager.parseClaudeOutput(output);

        expect(messages).toHaveLength(3);
        expect(messages[0]).toMatchObject({
          type: 'progress',
          percentage: '45',
          priority: 'medium'
        });
        expect(messages[1]).toMatchObject({
          type: 'progress',
          step: '3',
          total: '10'
        });
      });

      it('should return empty array for no matches', () => {
        const output = 'This is just regular text with no patterns';
        const messages = manager.parseClaudeOutput(output);
        expect(messages).toHaveLength(0);
      });

      it('should handle empty or null input', () => {
        expect(manager.parseClaudeOutput('')).toHaveLength(0);
        expect(manager.parseClaudeOutput(null)).toHaveLength(0);
        expect(manager.parseClaudeOutput(undefined)).toHaveLength(0);
      });
    });

    describe('getToolPriority', () => {
      it('should return correct priorities for tools', () => {
        expect(manager.getToolPriority('thinking')).toBe('low');
        expect(manager.getToolPriority('read')).toBe('medium');
        expect(manager.getToolPriority('search')).toBe('medium');
        expect(manager.getToolPriority('write')).toBe('high');
        expect(manager.getToolPriority('edit')).toBe('high');
        expect(manager.getToolPriority('bash')).toBe('critical');
      });

      it('should return medium priority for unknown tools', () => {
        expect(manager.getToolPriority('unknown')).toBe('medium');
        expect(manager.getToolPriority(null)).toBe('medium');
        expect(manager.getToolPriority(undefined)).toBe('medium');
      });
    });
  });

  describe('Claude Execution Streaming', () => {
    let connectionId;

    beforeEach(() => {
      connectionId = manager.createConnection(mockReq, mockRes, 'testuser');
      mockRes.write.mockClear();
    });

    it('should send execution start event', () => {
      manager.streamClaudeExecution(connectionId, 'test prompt');

      expect(mockRes.write).toHaveBeenCalledWith(
        expect.stringContaining('data: {"type":"execution_start","data":{"prompt":"test prompt","timestamp":')
      );
    });

    it('should simulate progressive tool activities', (done) => {
      vi.useFakeTimers();

      manager.streamClaudeExecution(connectionId, 'test prompt');
      mockRes.write.mockClear();

      // Fast-forward through all simulated activities
      vi.advanceTimersByTime(10000);

      // Should have sent multiple tool activities and completion
      expect(mockRes.write).toHaveBeenCalledWith(
        expect.stringContaining('tool_activity')
      );
      expect(mockRes.write).toHaveBeenCalledWith(
        expect.stringContaining('execution_complete')
      );

      vi.useRealTimers();
      done();
    });

    it('should handle connection that no longer exists', () => {
      manager.connections.delete(connectionId);

      // Should not throw
      expect(() => {
        manager.streamClaudeExecution(connectionId, 'test prompt');
      }).not.toThrow();
    });
  });

  describe('Statistics and Monitoring', () => {
    describe('getStats', () => {
      it('should return empty stats when no connections', () => {
        const stats = manager.getStats();

        expect(stats).toEqual({
          activeConnections: 0,
          connections: []
        });
      });

      it('should return correct stats for active connections', () => {
        const connectionId1 = manager.createConnection(mockReq, mockRes, 'user1');
        const connectionId2 = manager.createConnection(createMockRequest(), createMockResponse(), 'user2');

        const stats = manager.getStats();

        expect(stats.activeConnections).toBe(2);
        expect(stats.connections).toHaveLength(2);
        expect(stats.connections[0]).toMatchObject({
          id: connectionId1,
          userId: 'user1'
        });
        expect(stats.connections[0]).toHaveProperty('createdAt');
        expect(stats.connections[0]).toHaveProperty('lastActivity');
        expect(stats.connections[0]).toHaveProperty('duration');
      });
    });

    describe('cleanup', () => {
      it('should remove inactive connections', () => {
        vi.useFakeTimers();

        const connectionId = manager.createConnection(mockReq, mockRes, 'testuser');
        const connection = manager.connections.get(connectionId);

        // Make connection inactive
        connection.lastActivity = Date.now() - 120000; // 2 minutes ago

        manager.cleanup();

        expect(manager.connections.has(connectionId)).toBe(false);
        expect(mockRes.end).toHaveBeenCalled();

        vi.useRealTimers();
      });

      it('should keep active connections', () => {
        const connectionId = manager.createConnection(mockReq, mockRes, 'testuser');

        manager.cleanup();

        expect(manager.connections.has(connectionId)).toBe(true);
        expect(mockRes.end).not.toHaveBeenCalled();
      });
    });
  });

  describe('Error Handling', () => {
    it('should emit connectionClosed event on connection close', () => {
      const spy = vi.fn();
      manager.on('connectionClosed', spy);

      const connectionId = manager.createConnection(mockReq, mockRes, 'testuser');
      const closeCallback = mockReq.on.mock.calls.find(call => call[0] === 'close')[1];

      closeCallback();

      expect(spy).toHaveBeenCalledWith(connectionId);
    });

    it('should handle malformed JSON in parseClaudeOutput', () => {
      // Test with edge cases that might cause JSON parsing issues
      const output = 'Some text with {invalid json} content';
      const messages = manager.parseClaudeOutput(output);

      // Should not throw and should handle gracefully
      expect(messages).toBeInstanceOf(Array);
    });

    it('should handle concurrent connection operations', () => {
      const connectionIds = [];

      // Create multiple connections simultaneously
      for (let i = 0; i < 10; i++) {
        const req = createMockRequest();
        const res = createMockResponse();
        const id = manager.createConnection(req, res, `user${i}`);
        connectionIds.push(id);
      }

      expect(manager.connections.size).toBe(10);

      // Close half of them
      connectionIds.slice(0, 5).forEach(id => {
        manager.closeConnection(id);
      });

      expect(manager.connections.size).toBe(5);
    });
  });

  describe('Memory Management', () => {
    it('should not leak memory on connection creation/destruction', () => {
      const initialSize = manager.connections.size;

      // Create and destroy multiple connections
      for (let i = 0; i < 100; i++) {
        const req = createMockRequest();
        const res = createMockResponse();
        const id = manager.createConnection(req, res, `user${i}`);
        manager.closeConnection(id);
      }

      expect(manager.connections.size).toBe(initialSize);
    });

    it('should limit connection map growth', () => {
      // This tests that connections are properly cleaned up
      // and don't accumulate indefinitely
      const maxConnections = 1000;

      for (let i = 0; i < maxConnections + 100; i++) {
        const req = createMockRequest();
        const res = createMockResponse();
        const id = manager.createConnection(req, res, `user${i}`);

        // Randomly close some connections
        if (Math.random() < 0.3) {
          manager.closeConnection(id);
        }
      }

      // Should not have grown beyond reasonable limits
      expect(manager.connections.size).toBeLessThan(maxConnections);
    });
  });
});