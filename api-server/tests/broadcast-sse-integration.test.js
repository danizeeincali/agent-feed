import { describe, it, expect, beforeAll } from 'vitest';
import { broadcastToSSE } from '../server.js';

describe('broadcastToSSE - Integration Test', () => {
  it('should be exported from server.js', () => {
    expect(broadcastToSSE).toBeDefined();
    expect(typeof broadcastToSSE).toBe('function');
  });

  it('should broadcast tool activity message successfully', () => {
    const mockConnections = new Set();
    const receivedMessages = [];

    // Create mock SSE client that records messages
    const mockClient = {
      writable: true,
      destroyed: false,
      write: (data) => {
        receivedMessages.push(data);
      }
    };

    mockConnections.add(mockClient);

    // Broadcast a tool activity message
    const message = {
      type: 'tool_activity',
      data: {
        tool: 'Bash',
        action: 'git status',
        priority: 'high'
      }
    };

    broadcastToSSE(message, mockConnections);

    // Verify message was sent
    expect(receivedMessages.length).toBe(1);

    // Parse SSE message
    const sseData = receivedMessages[0].replace('data: ', '').trim();
    const parsedMessage = JSON.parse(sseData);

    // Verify message structure
    expect(parsedMessage).toHaveProperty('id');
    expect(parsedMessage.type).toBe('tool_activity');
    expect(parsedMessage.data.tool).toBe('Bash');
    expect(parsedMessage.data.action).toBe('git status');
    expect(parsedMessage.data.priority).toBe('high');
    expect(parsedMessage.data).toHaveProperty('timestamp');
  });

  it('should work with multiple concurrent clients', () => {
    const mockConnections = new Set();
    const client1Messages = [];
    const client2Messages = [];
    const client3Messages = [];

    const mockClient1 = {
      writable: true,
      destroyed: false,
      write: (data) => client1Messages.push(data)
    };

    const mockClient2 = {
      writable: true,
      destroyed: false,
      write: (data) => client2Messages.push(data)
    };

    const mockClient3 = {
      writable: true,
      destroyed: false,
      write: (data) => client3Messages.push(data)
    };

    mockConnections.add(mockClient1);
    mockConnections.add(mockClient2);
    mockConnections.add(mockClient3);

    // Broadcast multiple messages
    const messages = [
      {
        type: 'tool_activity',
        data: { tool: 'Read', action: 'file.tsx', priority: 'high' }
      },
      {
        type: 'tool_activity',
        data: { tool: 'Edit', action: 'file.tsx', priority: 'high' }
      },
      {
        type: 'tool_activity',
        data: { tool: 'Bash', action: 'npm test', priority: 'high' }
      }
    ];

    messages.forEach(msg => broadcastToSSE(msg, mockConnections));

    // Verify all clients received all messages
    expect(client1Messages.length).toBe(3);
    expect(client2Messages.length).toBe(3);
    expect(client3Messages.length).toBe(3);

    // Verify message order is preserved
    const client1Parsed = client1Messages.map(m =>
      JSON.parse(m.replace('data: ', '').trim())
    );

    expect(client1Parsed[0].data.tool).toBe('Read');
    expect(client1Parsed[1].data.tool).toBe('Edit');
    expect(client1Parsed[2].data.tool).toBe('Bash');
  });

  it('should handle rapid broadcasts without data loss', () => {
    const mockConnections = new Set();
    const receivedMessages = [];

    const mockClient = {
      writable: true,
      destroyed: false,
      write: (data) => {
        receivedMessages.push(data);
      }
    };

    mockConnections.add(mockClient);

    // Rapid fire 100 messages
    for (let i = 0; i < 100; i++) {
      broadcastToSSE({
        type: 'tool_activity',
        data: {
          tool: 'Bash',
          action: `command-${i}`,
          priority: 'high'
        }
      }, mockConnections);
    }

    // All messages should be received
    expect(receivedMessages.length).toBe(100);

    // Verify unique IDs
    const ids = receivedMessages.map(m => {
      const parsed = JSON.parse(m.replace('data: ', '').trim());
      return parsed.id;
    });

    const uniqueIds = new Set(ids);
    expect(uniqueIds.size).toBe(100);
  });
});
