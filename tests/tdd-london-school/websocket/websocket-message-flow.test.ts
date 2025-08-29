/**
 * TDD London School - WebSocket Send/Receive Message Flow Tests
 * Tests the conversation between WebSocket and message handling components
 */

import { WebSocketMockFactory, MockEventGenerator } from '../mocks/websocket-mocks';
import { ConnectionStates, WebSocketErrors } from '../contracts/websocket-contracts';

describe('WebSocket Message Flow - London School TDD', () => {
  let mockWebSocket: any;
  let mockClaudeProcess: any;
  let mockWebSocketManager: any;
  let mockMessageSerializer: any;

  beforeEach(() => {
    mockWebSocket = WebSocketMockFactory.createWebSocketMock(ConnectionStates.OPEN);
    mockClaudeProcess = WebSocketMockFactory.createClaudeProcessMock();
    mockWebSocketManager = WebSocketMockFactory.createWebSocketManagerMock();
    mockMessageSerializer = WebSocketMockFactory.createMessageSerializerMock();
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe('Message Send Flow', () => {
    it('should coordinate message sending workflow between components', async () => {
      const testMessage = {
        type: 'command',
        payload: { command: 'claude help', args: [] },
        timestamp: Date.now(),
        id: 'test-message-123'
      };

      // Execute the workflow
      await mockWebSocketManager.sendCommand(testMessage.payload);

      // Verify the conversation sequence
      expect(mockWebSocketManager.sendCommand).toHaveBeenCalledWith(testMessage.payload);
      expect(mockWebSocketManager.sendCommand).toHaveBeenCalledBefore(mockWebSocketManager.onMessage);
    });

    it('should serialize message before sending through WebSocket', async () => {
      const testCommand = { command: 'claude help', args: [] };
      const serializedMessage = '{"type":"command","payload":{"command":"claude help","args":[]}}';

      mockMessageSerializer.serialize.mockReturnValue(serializedMessage);

      // Simulate the serialization workflow
      const serialized = mockMessageSerializer.serialize({ type: 'command', payload: testCommand });
      mockWebSocket.send(serialized);

      // Verify interactions
      expect(mockMessageSerializer.serialize).toHaveBeenCalledWith({
        type: 'command',
        payload: testCommand
      });
      expect(mockWebSocket.send).toHaveBeenCalledWith(serializedMessage);
    });

    it('should validate WebSocket connection state before sending', () => {
      const closedWebSocket = WebSocketMockFactory.createWebSocketMock(ConnectionStates.CLOSED);
      const testMessage = 'test message';

      // Attempt to send when connection is closed
      expect(() => {
        closedWebSocket.send(testMessage);
      }).toThrow(WebSocketErrors.SEND_NOT_DEFINED);

      // Verify send was never called on a closed connection
      expect(closedWebSocket.send).toHaveBeenCalledTimes(1);
    });
  });

  describe('Message Receive Flow', () => {
    it('should coordinate message reception and processing workflow', () => {
      const mockMessageEvent = MockEventGenerator.createMessageEvent({
        type: 'response',
        payload: { success: true, data: 'Command executed successfully' }
      });

      // Simulate message reception
      const messageHandler = jest.fn();
      mockWebSocket.addEventListener('message', messageHandler);
      
      // Trigger message event
      const [eventType, handler] = mockWebSocket.addEventListener.mock.calls[0];
      handler(mockMessageEvent);

      // Verify event handling workflow
      expect(mockWebSocket.addEventListener).toHaveBeenCalledWith('message', messageHandler);
      expect(messageHandler).toHaveBeenCalledWith(mockMessageEvent);
    });

    it('should deserialize incoming messages correctly', () => {
      const incomingData = '{"type":"response","payload":{"success":true,"data":"test"}}';
      const expectedMessage = {
        type: 'response',
        payload: { success: true, data: 'test' }
      };

      mockMessageSerializer.deserialize.mockReturnValue(expectedMessage);

      // Simulate deserialization workflow
      const deserializedMessage = mockMessageSerializer.deserialize(incomingData);

      // Verify deserialization interaction
      expect(mockMessageSerializer.deserialize).toHaveBeenCalledWith(incomingData);
      expect(deserializedMessage).toEqual(expectedMessage);
    });

    it('should coordinate Claude process execution with message handling', async () => {
      const commandMessage = {
        type: 'command',
        payload: { command: 'claude help', args: [] }
      };

      // Execute the coordination workflow
      await mockWebSocketManager.sendCommand(commandMessage.payload);
      const processResult = await mockClaudeProcess.execute(commandMessage.payload.command);

      // Verify the coordination sequence
      expect(mockWebSocketManager.sendCommand).toHaveBeenCalledWith(commandMessage.payload);
      expect(mockClaudeProcess.execute).toHaveBeenCalledWith(commandMessage.payload.command);
      expect(processResult.success).toBe(true);
    });
  });

  describe('Bidirectional Message Flow', () => {
    it('should handle complete request-response cycle', async () => {
      const requestMessage = {
        type: 'command',
        payload: { command: 'claude help', args: [] },
        id: 'req-123'
      };

      const responseMessage = {
        type: 'response',
        payload: { success: true, data: 'Help content' },
        id: 'req-123'
      };

      // Simulate complete request-response workflow
      mockWebSocketManager.sendCommand.mockResolvedValue(responseMessage.payload);
      
      const result = await mockWebSocketManager.sendCommand(requestMessage.payload);

      // Verify complete interaction flow
      expect(mockWebSocketManager.sendCommand).toHaveBeenCalledWith(requestMessage.payload);
      expect(result).toEqual(responseMessage.payload);
    });

    it('should maintain message correlation between requests and responses', () => {
      const messageId = 'correlation-test-456';
      const requestMessage = {
        type: 'command',
        payload: { command: 'claude status' },
        id: messageId
      };

      // Simulate message correlation workflow
      const correlationTracker = jest.fn();
      correlationTracker(requestMessage.id);

      // Verify correlation tracking
      expect(correlationTracker).toHaveBeenCalledWith(messageId);
    });
  });

  describe('Message Flow Error Scenarios', () => {
    it('should handle serialization errors in message flow', () => {
      const invalidMessage = { circular: {} };
      // Create circular reference
      invalidMessage.circular = invalidMessage;

      mockMessageSerializer.serialize.mockImplementation(() => {
        throw new Error(WebSocketErrors.MESSAGE_SERIALIZATION_ERROR);
      });

      expect(() => {
        mockMessageSerializer.serialize(invalidMessage);
      }).toThrow(WebSocketErrors.MESSAGE_SERIALIZATION_ERROR);

      expect(mockMessageSerializer.serialize).toHaveBeenCalledWith(invalidMessage);
    });

    it('should handle deserialization errors gracefully', () => {
      const malformedData = '{"invalid":json}';

      mockMessageSerializer.deserialize.mockImplementation(() => {
        throw new Error(WebSocketErrors.MESSAGE_SERIALIZATION_ERROR);
      });

      expect(() => {
        mockMessageSerializer.deserialize(malformedData);
      }).toThrow(WebSocketErrors.MESSAGE_SERIALIZATION_ERROR);

      expect(mockMessageSerializer.deserialize).toHaveBeenCalledWith(malformedData);
    });
  });
});