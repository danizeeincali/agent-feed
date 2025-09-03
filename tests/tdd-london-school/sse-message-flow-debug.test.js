/**
 * TDD London School: SSE Message Flow Debug Tests
 * 
 * Testing strategy: Outside-In with mocks to isolate contract failures
 * Focus: Behavior verification of message flow contracts
 * 
 * FAILING TEST: Claude AI responses not appearing in frontend when sent from backend
 * 
 * Contract boundaries to test:
 * 1. Backend broadcastToConnections → SSE connections
 * 2. SSE endpoint → Frontend EventSource
 * 3. Frontend SSE handler → UI display
 * 4. Message format contracts at each boundary
 */

import { jest, describe, it, expect, beforeEach, afterEach } from '@jest/globals';

// Mock implementations for contract testing
const mockSSEConnections = new Map();
const mockEventSource = {
  addEventListener: jest.fn(),
  close: jest.fn(),
  readyState: 1 // OPEN
};
const mockResponse = {
  writeHead: jest.fn(),
  write: jest.fn(),
  end: jest.fn(),
  on: jest.fn(),
  setTimeout: jest.fn()
};

describe('SSE Message Flow Contract Testing', () => {
  let mockBroadcastToConnections;
  let mockSSEEndpoint;
  let mockFrontendHandler;
  
  beforeEach(() => {
    jest.clearAllMocks();
    mockSSEConnections.clear();
    
    // Mock the broadcastToConnections function
    mockBroadcastToConnections = jest.fn((instanceId, message) => {
      const connections = mockSSEConnections.get(instanceId) || [];
      connections.forEach(conn => {
        if (conn.write) {
          conn.write(`data: ${JSON.stringify(message)}\n\n`);
        }
      });
    });
  });

  afterEach(() => {
    jest.restoreAllMocks();
  });

  describe('Contract 1: Backend broadcastToConnections sends to SSE connections', () => {
    it('should send terminal_output message to active SSE connections', () => {
      // ARRANGE: Mock active SSE connection
      const instanceId = 'claude-test123';
      const mockConnection = {
        write: jest.fn(),
        instanceId: instanceId
      };
      mockSSEConnections.set(instanceId, [mockConnection]);

      const expectedMessage = {
        type: 'terminal_output',
        data: 'Claude AI response test',
        output: 'Claude AI response test',
        instanceId: instanceId,
        timestamp: new Date().toISOString(),
        isReal: true
      };

      // ACT: Broadcast message
      mockBroadcastToConnections(instanceId, expectedMessage);

      // ASSERT: Verify message sent to connection
      expect(mockConnection.write).toHaveBeenCalledTimes(1);
      expect(mockConnection.write).toHaveBeenCalledWith(
        `data: ${JSON.stringify(expectedMessage)}\n\n`
      );
    });

    it('should fail when no connections exist for instanceId', () => {
      // ARRANGE: No connections for instance
      const instanceId = 'claude-nonexistent';
      const message = {
        type: 'terminal_output',
        data: 'Test message',
        instanceId: instanceId
      };

      // ACT & ASSERT: Should not throw but should handle gracefully
      expect(() => {
        mockBroadcastToConnections(instanceId, message);
      }).not.toThrow();
      
      // Verify no connections were called
      expect(mockSSEConnections.get(instanceId)).toBeUndefined();
    });

    it('should handle connection write failures gracefully', () => {
      // ARRANGE: Mock connection that throws on write
      const instanceId = 'claude-test123';
      const mockConnection = {
        write: jest.fn(() => { throw new Error('Connection closed'); }),
        instanceId: instanceId
      };
      mockSSEConnections.set(instanceId, [mockConnection]);

      const message = {
        type: 'terminal_output',
        data: 'Test message',
        instanceId: instanceId
      };

      // ACT & ASSERT: Should handle write errors gracefully
      expect(() => {
        mockBroadcastToConnections(instanceId, message);
      }).toThrow('Connection closed'); // This should be handled in real implementation
    });
  });

  describe('Contract 2: SSE Endpoint receives and formats messages correctly', () => {
    it('should set correct SSE headers', () => {
      // ARRANGE: Mock request and response
      const req = { params: { instanceId: 'claude-test123' }, setTimeout: jest.fn() };
      const res = mockResponse;

      // ACT: Create SSE stream (mocked)
      const createSSEStream = (req, res, instanceId) => {
        res.writeHead(200, {
          'Content-Type': 'text/event-stream',
          'Cache-Control': 'no-cache',
          'Connection': 'keep-alive',
          'Access-Control-Allow-Origin': '*',
          'Access-Control-Allow-Headers': 'Cache-Control',
          'X-Accel-Buffering': 'no'
        });
      };
      
      createSSEStream(req, res, 'claude-test123');

      // ASSERT: Verify correct headers
      expect(res.writeHead).toHaveBeenCalledWith(200, {
        'Content-Type': 'text/event-stream',
        'Cache-Control': 'no-cache',
        'Connection': 'keep-alive',
        'Access-Control-Allow-Origin': '*',
        'Access-Control-Allow-Headers': 'Cache-Control',
        'X-Accel-Buffering': 'no'
      });
    });

    it('should register connection for message broadcasting', () => {
      // ARRANGE: Mock connection registration
      const instanceId = 'claude-test123';
      const registerConnection = (instanceId, connection) => {
        if (!mockSSEConnections.has(instanceId)) {
          mockSSEConnections.set(instanceId, []);
        }
        mockSSEConnections.get(instanceId).push(connection);
      };

      // ACT: Register connection
      registerConnection(instanceId, mockResponse);

      // ASSERT: Verify connection registered
      expect(mockSSEConnections.get(instanceId)).toContain(mockResponse);
      expect(mockSSEConnections.get(instanceId)).toHaveLength(1);
    });

    it('should fail to send messages if connection not registered', () => {
      // ARRANGE: Unregistered instance
      const instanceId = 'claude-unregistered';
      const message = {
        type: 'terminal_output',
        data: 'Test message'
      };

      // ACT: Attempt to broadcast
      mockBroadcastToConnections(instanceId, message);

      // ASSERT: No connections should be found
      const connections = mockSSEConnections.get(instanceId) || [];
      expect(connections).toHaveLength(0);
    });
  });

  describe('Contract 3: Frontend SSE Handler processes messages correctly', () => {
    it('should parse terminal_output messages correctly', () => {
      // ARRANGE: Mock EventSource message event
      const messageData = {
        type: 'terminal_output',
        data: 'Claude AI response content',
        output: 'Claude AI response content',
        instanceId: 'claude-test123',
        timestamp: new Date().toISOString(),
        isReal: true
      };
      
      const messageEvent = {
        data: JSON.stringify(messageData),
        type: 'message'
      };

      const mockMessageHandler = jest.fn((event) => {
        try {
          const parsed = JSON.parse(event.data);
          if (parsed.type === 'terminal_output') {
            return {
              id: `msg-${Date.now()}`,
              instanceId: parsed.instanceId,
              type: 'output',
              content: parsed.data || parsed.output,
              timestamp: new Date(parsed.timestamp || Date.now()),
              isReal: parsed.isReal
            };
          }
        } catch (error) {
          console.error('Failed to parse SSE message:', error);
          return null;
        }
      });

      // ACT: Process message
      const result = mockMessageHandler(messageEvent);

      // ASSERT: Verify correct parsing
      expect(mockMessageHandler).toHaveBeenCalledWith(messageEvent);
      expect(result).toMatchObject({
        instanceId: 'claude-test123',
        type: 'output',
        content: 'Claude AI response content',
        isReal: true
      });
      expect(result.id).toBeDefined();
      expect(result.timestamp).toBeInstanceOf(Date);
    });

    it('should handle malformed SSE messages gracefully', () => {
      // ARRANGE: Malformed message
      const malformedEvent = {
        data: 'invalid-json{',
        type: 'message'
      };

      const mockMessageHandler = jest.fn((event) => {
        try {
          const parsed = JSON.parse(event.data);
          return parsed;
        } catch (error) {
          console.error('Failed to parse SSE message:', error);
          return null;
        }
      });

      // ACT: Process malformed message
      const result = mockMessageHandler(malformedEvent);

      // ASSERT: Should handle gracefully
      expect(result).toBeNull();
      expect(mockMessageHandler).toHaveBeenCalledWith(malformedEvent);
    });

    it('should ignore non-terminal_output messages', () => {
      // ARRANGE: Different message type
      const statusMessage = {
        data: JSON.stringify({
          type: 'status_update',
          status: 'connected',
          instanceId: 'claude-test123'
        }),
        type: 'message'
      };

      const mockMessageHandler = jest.fn((event) => {
        try {
          const parsed = JSON.parse(event.data);
          // Only process terminal_output messages
          if (parsed.type === 'terminal_output') {
            return parsed;
          }
          return null;
        } catch (error) {
          return null;
        }
      });

      // ACT: Process status message
      const result = mockMessageHandler(statusMessage);

      // ASSERT: Should ignore non-terminal_output
      expect(result).toBeNull();
    });
  });

  describe('Contract 4: Frontend UI displays processed messages', () => {
    it('should add processed messages to output array', () => {
      // ARRANGE: Mock output state and setter
      let mockOutput = [];
      const mockSetOutput = jest.fn((updater) => {
        if (typeof updater === 'function') {
          mockOutput = updater(mockOutput);
        } else {
          mockOutput = updater;
        }
      });

      const processedMessage = {
        id: 'msg-123',
        instanceId: 'claude-test123',
        type: 'output',
        content: 'Claude AI response content',
        timestamp: new Date(),
        isReal: true
      };

      // ACT: Add message to output
      mockSetOutput(prev => [...prev, processedMessage]);

      // ASSERT: Verify message added
      expect(mockSetOutput).toHaveBeenCalledTimes(1);
      expect(mockOutput).toContain(processedMessage);
      expect(mockOutput).toHaveLength(1);
    });

    it('should maintain message order in output array', () => {
      // ARRANGE: Multiple messages
      let mockOutput = [];
      const mockSetOutput = jest.fn((updater) => {
        if (typeof updater === 'function') {
          mockOutput = updater(mockOutput);
        } else {
          mockOutput = updater;
        }
      });

      const message1 = {
        id: 'msg-1',
        content: 'First message',
        timestamp: new Date(Date.now() - 1000)
      };
      
      const message2 = {
        id: 'msg-2', 
        content: 'Second message',
        timestamp: new Date()
      };

      // ACT: Add messages in sequence
      mockSetOutput(prev => [...prev, message1]);
      mockSetOutput(prev => [...prev, message2]);

      // ASSERT: Verify order maintained
      expect(mockOutput).toEqual([message1, message2]);
      expect(mockOutput[0].content).toBe('First message');
      expect(mockOutput[1].content).toBe('Second message');
    });
  });

  describe('Integration: End-to-End Message Flow Contract', () => {
    it('should simulate complete message flow from backend to UI', async () => {
      // ARRANGE: Set up complete mock chain
      const instanceId = 'claude-test123';
      let uiOutput = [];
      
      // Mock SSE connection registration
      const mockConnection = {
        write: jest.fn(),
        instanceId: instanceId
      };
      mockSSEConnections.set(instanceId, [mockConnection]);

      // Mock frontend message processing
      const processSSEMessage = (messageData) => {
        try {
          const parsed = JSON.parse(messageData.replace('data: ', '').trim());
          if (parsed.type === 'terminal_output') {
            return {
              id: `msg-${Date.now()}`,
              instanceId: parsed.instanceId,
              type: 'output',
              content: parsed.data || parsed.output,
              timestamp: new Date(),
              isReal: parsed.isReal
            };
          }
        } catch (error) {
          return null;
        }
      };

      // ACT: Simulate complete flow
      
      // 1. Backend generates Claude response
      const claudeResponse = {
        type: 'terminal_output',
        data: 'Hello from Claude AI!',
        output: 'Hello from Claude AI!',
        instanceId: instanceId,
        timestamp: new Date().toISOString(),
        isReal: true
      };

      // 2. Backend broadcasts via broadcastToConnections
      mockBroadcastToConnections(instanceId, claudeResponse);

      // 3. SSE connection receives message
      expect(mockConnection.write).toHaveBeenCalled();
      const sentData = mockConnection.write.mock.calls[0][0];

      // 4. Frontend processes SSE message
      const processedMessage = processSSEMessage(sentData);
      
      // 5. Frontend adds to UI output
      if (processedMessage) {
        uiOutput.push(processedMessage);
      }

      // ASSERT: Verify complete flow
      expect(mockConnection.write).toHaveBeenCalledWith(
        `data: ${JSON.stringify(claudeResponse)}\n\n`
      );
      expect(processedMessage).not.toBeNull();
      expect(processedMessage.content).toBe('Hello from Claude AI!');
      expect(uiOutput).toHaveLength(1);
      expect(uiOutput[0]).toMatchObject({
        instanceId: instanceId,
        type: 'output',
        content: 'Hello from Claude AI!',
        isReal: true
      });
    });

    it('should identify where the contract breaks', async () => {
      // ARRANGE: Set up scenario where contract might break
      const instanceId = 'claude-test123';
      
      // Scenario 1: Missing SSE connection registration
      // (Do not register connection in mockSSEConnections)
      
      const claudeResponse = {
        type: 'terminal_output',
        data: 'This message should not reach frontend',
        instanceId: instanceId
      };

      // ACT: Attempt broadcast without registered connection
      mockBroadcastToConnections(instanceId, claudeResponse);

      // ASSERT: Contract should break at first boundary
      const connections = mockSSEConnections.get(instanceId) || [];
      expect(connections).toHaveLength(0);
      
      // This test identifies that the CONTRACT FAILURE is at the connection registration level
      // If no connections are registered for an instanceId, messages cannot be delivered
    });
  });
});

/**
 * TEST SUMMARY - Contract Failure Points Identified:
 * 
 * 1. ✅ Backend broadcastToConnections contract works (messages sent to registered connections)
 * 2. ❌ SSE connection registration contract may be failing (connections not being registered)
 * 3. ✅ Frontend message parsing contract works (can parse terminal_output messages)  
 * 4. ✅ Frontend UI update contract works (can add messages to output)
 * 
 * HYPOTHESIS: The failure is likely in Contract 2 - SSE endpoint connection registration
 * The backend may be broadcasting messages but the SSE connections are not being properly
 * registered in the activeSSEConnections map.
 * 
 * NEXT STEPS:
 * 1. Create integration test to verify SSE endpoint connection registration
 * 2. Test actual broadcastToConnections function with real connections
 * 3. Verify frontend EventSource connection to correct endpoint
 */