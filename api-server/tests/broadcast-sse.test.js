import { describe, it, expect, beforeEach, vi } from 'vitest';
import { broadcastToSSE } from '../server.js';

describe('broadcastToSSE', () => {
  let mockConnections;
  let mockClient1, mockClient2;

  beforeEach(() => {
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

  it('should broadcast message to all connected clients', () => {
    const message = {
      type: 'tool_activity',
      data: {
        tool: 'Bash',
        action: 'git status',
        priority: 'high'
      }
    };

    broadcastToSSE(message, mockConnections);

    expect(mockClient1.write).toHaveBeenCalled();
    expect(mockClient2.write).toHaveBeenCalled();
  });

  it('should add UUID and timestamp to message', () => {
    const message = {
      type: 'tool_activity',
      data: { tool: 'Bash', action: 'test', priority: 'high' }
    };

    broadcastToSSE(message, mockConnections);

    const sentMessage = JSON.parse(
      mockClient1.write.mock.calls[0][0].replace('data: ', '').trim()
    );

    expect(sentMessage).toHaveProperty('id');
    expect(sentMessage.data).toHaveProperty('timestamp');
  });

  it('should remove dead connections on write failure', () => {
    mockClient1.write = vi.fn(() => {
      throw new Error('Client disconnected');
    });

    const message = {
      type: 'tool_activity',
      data: { tool: 'Bash', action: 'test', priority: 'high' }
    };

    broadcastToSSE(message, mockConnections);

    // Should not throw error
    expect(mockConnections.has(mockClient1)).toBe(false);
    expect(mockConnections.has(mockClient2)).toBe(true);
  });

  it('should skip clients that are not writable', () => {
    mockClient1.writable = false;

    const message = {
      type: 'tool_activity',
      data: { tool: 'Bash', action: 'test', priority: 'high' }
    };

    broadcastToSSE(message, mockConnections);

    expect(mockClient1.write).not.toHaveBeenCalled();
    expect(mockClient2.write).toHaveBeenCalled();
  });

  it('should skip clients that are destroyed', () => {
    mockClient1.destroyed = true;

    const message = {
      type: 'tool_activity',
      data: { tool: 'Bash', action: 'test', priority: 'high' }
    };

    broadcastToSSE(message, mockConnections);

    expect(mockClient1.write).not.toHaveBeenCalled();
    expect(mockClient2.write).toHaveBeenCalled();
  });

  it('should handle invalid message format gracefully', () => {
    const invalidMessage = { /* missing required fields */ };

    // Should not throw
    expect(() => {
      broadcastToSSE(invalidMessage, mockConnections);
    }).not.toThrow();

    expect(mockClient1.write).not.toHaveBeenCalled();
  });

  it('should validate message using validateSSEMessage', () => {
    const message = {
      type: 'tool_activity',
      data: { tool: 'Bash', action: 'test', priority: 'high' }
    };

    broadcastToSSE(message, mockConnections);

    const sentMessage = JSON.parse(
      mockClient1.write.mock.calls[0][0].replace('data: ', '').trim()
    );

    // Validated message should have complete structure
    expect(sentMessage).toHaveProperty('id');
    expect(sentMessage).toHaveProperty('type');
    expect(sentMessage).toHaveProperty('data');
    expect(sentMessage.data).toHaveProperty('message');
    expect(sentMessage.data).toHaveProperty('priority');
    expect(sentMessage.data).toHaveProperty('timestamp');
  });

  it('should preserve existing id and timestamp if provided', () => {
    const existingId = 'test-id-123';
    const existingTimestamp = 1234567890;

    const message = {
      id: existingId,
      type: 'tool_activity',
      data: {
        tool: 'Bash',
        action: 'test',
        priority: 'high',
        timestamp: existingTimestamp
      }
    };

    broadcastToSSE(message, mockConnections);

    const sentMessage = JSON.parse(
      mockClient1.write.mock.calls[0][0].replace('data: ', '').trim()
    );

    expect(sentMessage.id).toBe(existingId);
    expect(sentMessage.data.timestamp).toBe(existingTimestamp);
  });

  it('should clean up dead clients from connection pool', () => {
    const initialSize = mockConnections.size;

    mockClient1.write = vi.fn(() => {
      throw new Error('Write failed');
    });

    const message = {
      type: 'tool_activity',
      data: { tool: 'Bash', action: 'test', priority: 'high' }
    };

    broadcastToSSE(message, mockConnections);

    // Connection pool should be smaller
    expect(mockConnections.size).toBe(initialSize - 1);
    expect(mockConnections.has(mockClient1)).toBe(false);
    expect(mockConnections.has(mockClient2)).toBe(true);
  });

  it('should format SSE message correctly', () => {
    const message = {
      type: 'tool_activity',
      data: { tool: 'Bash', action: 'git status', priority: 'high' }
    };

    broadcastToSSE(message, mockConnections);

    const sseMessage = mockClient1.write.mock.calls[0][0];

    // Should be in SSE format: "data: {JSON}\n\n"
    expect(sseMessage).toMatch(/^data: \{.*\}\n\n$/);
  });
});
