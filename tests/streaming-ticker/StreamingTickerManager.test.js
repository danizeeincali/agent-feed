import { jest } from '@jest/globals';
import StreamingTickerManager from '../../src/services/StreamingTickerManager.js';

// Mock EventEmitter
const mockEventEmitter = {
  emit: jest.fn(),
  on: jest.fn(),
  removeListener: jest.fn()
};

describe('StreamingTickerManager', () => {
  let manager;
  let mockReq;
  let mockRes;

  beforeEach(() => {
    manager = StreamingTickerManager;
    manager.connections.clear();

    // Reset mocks
    jest.clearAllMocks();

    // Mock request object
    mockReq = {
      on: jest.fn()
    };

    // Mock response object
    mockRes = {
      writeHead: jest.fn(),
      write: jest.fn(),
      end: jest.fn()
    };
  });

  describe('Connection Management', () => {
    test('should create new connection with proper headers', () => {
      const connectionId = manager.createConnection(mockReq, mockRes, 'testuser');

      expect(mockRes.writeHead).toHaveBeenCalledWith(200, {
        'Content-Type': 'text/event-stream',
        'Cache-Control': 'no-cache',
        'Connection': 'keep-alive',
        'Access-Control-Allow-Origin': '*',
        'Access-Control-Allow-Headers': 'Cache-Control'
      });

      expect(connectionId).toMatch(/testuser_\d+_\w+/);
      expect(manager.connections.has(connectionId)).toBe(true);
    });

    test('should store connection with correct metadata', () => {
      const connectionId = manager.createConnection(mockReq, mockRes, 'testuser');
      const connection = manager.connections.get(connectionId);

      expect(connection).toMatchObject({
        response: mockRes,
        userId: 'testuser',
        createdAt: expect.any(Number),
        lastActivity: expect.any(Number)
      });
    });

    test('should handle connection close event', () => {
      const connectionId = manager.createConnection(mockReq, mockRes, 'testuser');

      // Simulate connection close
      const closeHandler = mockReq.on.mock.calls.find(call => call[0] === 'close')[1];
      closeHandler();

      expect(manager.connections.has(connectionId)).toBe(false);
    });

    test('should cleanup connection after timeout', (done) => {
      // Set shorter timeout for testing
      manager.connectionTimeout = 100;

      const connectionId = manager.createConnection(mockReq, mockRes, 'testuser');

      setTimeout(() => {
        expect(manager.connections.has(connectionId)).toBe(false);
        done();
      }, 150);
    });
  });

  describe('Message Sending', () => {
    let connectionId;

    beforeEach(() => {
      connectionId = manager.createConnection(mockReq, mockRes, 'testuser');
      jest.clearAllMocks(); // Clear initial connection messages
    });

    test('should send message to specific connection', () => {
      const message = { type: 'test', data: { content: 'hello' } };
      const result = manager.sendToConnection(connectionId, message);

      expect(result).toBe(true);
      expect(mockRes.write).toHaveBeenCalledWith(
        `data: ${JSON.stringify(message)}\n\n`
      );
    });

    test('should return false for non-existent connection', () => {
      const result = manager.sendToConnection('invalid-id', { type: 'test' });
      expect(result).toBe(false);
    });

    test('should handle write errors and close connection', () => {
      mockRes.write.mockImplementation(() => {
        throw new Error('Write failed');
      });

      const result = manager.sendToConnection(connectionId, { type: 'test' });

      expect(result).toBe(false);
      expect(manager.connections.has(connectionId)).toBe(false);
    });

    test('should broadcast to all connections', () => {
      const connectionId2 = manager.createConnection(mockReq, mockRes, 'testuser2');
      jest.clearAllMocks();

      const message = { type: 'broadcast', data: { content: 'hello all' } };
      const sentCount = manager.broadcast(message);

      expect(sentCount).toBe(2);
      expect(mockRes.write).toHaveBeenCalledTimes(2);
    });
  });

  describe('Claude Output Parsing', () => {
    test('should parse tool activity patterns', () => {
      const output = `
        Running command: npm install
        Reading file: package.json
        Writing to file: output.txt
        Let me analyze this code
      `;

      const messages = manager.parseClaudeOutput(output);

      expect(messages).toHaveLength(4);
      expect(messages[0]).toMatchObject({
        type: 'tool_activity',
        tool: 'bash',
        action: 'npm install'
      });
      expect(messages[1]).toMatchObject({
        type: 'tool_activity',
        tool: 'read',
        action: 'package.json'
      });
    });

    test('should parse progress indicators', () => {
      const output = 'Progress: 75% complete, Step 3 of 5';
      const messages = manager.parseClaudeOutput(output);

      expect(messages).toContainEqual(
        expect.objectContaining({
          type: 'progress',
          percentage: '75'
        })
      );
    });

    test('should assign correct priorities', () => {
      expect(manager.getToolPriority('bash')).toBe('critical');
      expect(manager.getToolPriority('write')).toBe('high');
      expect(manager.getToolPriority('thinking')).toBe('low');
    });
  });

  describe('Connection Statistics', () => {
    test('should return correct statistics', () => {
      const connectionId1 = manager.createConnection(mockReq, mockRes, 'user1');
      const connectionId2 = manager.createConnection(mockReq, mockRes, 'user2');

      const stats = manager.getStats();

      expect(stats.activeConnections).toBe(2);
      expect(stats.connections).toHaveLength(2);
      expect(stats.connections[0]).toMatchObject({
        id: connectionId1,
        userId: 'user1'
      });
    });
  });

  describe('Cleanup Operations', () => {
    test('should cleanup inactive connections', () => {
      const connectionId = manager.createConnection(mockReq, mockRes, 'testuser');
      const connection = manager.connections.get(connectionId);

      // Simulate old connection
      connection.lastActivity = Date.now() - 120000; // 2 minutes ago

      manager.cleanup();

      expect(manager.connections.has(connectionId)).toBe(false);
    });

    test('should keep active connections during cleanup', () => {
      const connectionId = manager.createConnection(mockReq, mockRes, 'testuser');

      manager.cleanup();

      expect(manager.connections.has(connectionId)).toBe(true);
    });
  });

  describe('Streaming Execution', () => {
    let connectionId;

    beforeEach(() => {
      connectionId = manager.createConnection(mockReq, mockRes, 'testuser');
      jest.clearAllMocks();
    });

    test('should start execution stream', () => {
      manager.streamClaudeExecution(connectionId, 'Test prompt');

      expect(mockRes.write).toHaveBeenCalledWith(
        expect.stringContaining('execution_start')
      );
    });

    test('should handle non-existent connection gracefully', () => {
      expect(() => {
        manager.streamClaudeExecution('invalid-id', 'Test prompt');
      }).not.toThrow();
    });
  });
});