/**
 * TDD London School: Integration Tests for Message Handling Enhancement
 * Focus: Test collaboration patterns between all message handling components
 * Approach: Verify end-to-end workflows with mock-driven integration
 */

const { jest } = require('@jest/globals');

// Import unit test mocks for integration testing
const { 
  MessageSequencer,
  mockMessageStore,
  mockIdGenerator,
  mockOrderManager,
  mockConcurrencyHandler 
} = require('../../unit/message/message-sequencing.test');

const {
  ToolUsageHandler,
  mockToolCapture,
  mockTerminalDisplay,
  mockChatFilter,
  mockClaudeToolMonitor,
  mockChannelRouter
} = require('../../unit/tool/tool-usage-capture.test');

const {
  WebSocketMessageHandler,
  mockMessageQueue,
  mockSequentialProcessor,
  mockMessageFilter,
  mockChannelBroadcaster,
  mockWebSocketManager,
  mockConnectionHandler
} = require('../../unit/websocket/websocket-message-handling.test');

// Integration-specific mocks for system-wide collaboration
const mockSystemOrchestrator = {
  coordinate: jest.fn(),
  validateWorkflow: jest.fn(),
  handleSystemEvent: jest.fn(),
  getSystemState: jest.fn()
};

const mockIntegrationLogger = {
  logWorkflow: jest.fn(),
  logError: jest.fn(),
  logMetrics: jest.fn(),
  exportLogs: jest.fn()
};

// Swarm coordination for integration tests
const mockSwarmCoordinator = {
  notifyIntegrationTest: jest.fn(),
  coordinateComponents: jest.fn(),
  validateIntegration: jest.fn(),
  shareIntegrationResults: jest.fn()
};

describe('Message Handling Integration - London School TDD', () => {
  let messageSequencer, toolUsageHandler, webSocketMessageHandler;
  let integrationOrchestrator;

  beforeAll(async () => {
    await mockSwarmCoordinator.notifyIntegrationTest('message-handling-integration');
  });

  beforeEach(() => {
    // Clear all mocks across all components
    jest.clearAllMocks();
    
    // Initialize components with their mocked dependencies
    messageSequencer = new MessageSequencer(
      mockMessageStore,
      mockIdGenerator,
      mockOrderManager,
      mockConcurrencyHandler
    );

    toolUsageHandler = new ToolUsageHandler(
      mockToolCapture,
      mockTerminalDisplay,
      mockChatFilter,
      mockClaudeToolMonitor,
      mockChannelRouter
    );

    webSocketMessageHandler = new WebSocketMessageHandler(
      mockMessageQueue,
      mockSequentialProcessor,
      mockMessageFilter,
      mockChannelBroadcaster,
      mockWebSocketManager,
      mockConnectionHandler
    );

    // Integration orchestrator that coordinates all components
    integrationOrchestrator = new IntegrationOrchestrator(
      messageSequencer,
      toolUsageHandler,
      webSocketMessageHandler,
      mockSystemOrchestrator,
      mockIntegrationLogger
    );
  });

  afterEach(async () => {
    await mockSwarmCoordinator.coordinateComponents({
      testContext: expect.any(String),
      componentInteractions: jest.getAllMockCalls()
    });
  });

  afterAll(async () => {
    await mockSwarmCoordinator.shareIntegrationResults({
      testSuite: 'message-handling-integration',
      workflows: mockSystemOrchestrator.getSystemState(),
      metrics: mockIntegrationLogger.exportLogs()
    });
  });

  describe('Chat vs Terminal Separation Integration', () => {
    it('should maintain chat vs terminal separation across all components', async () => {
      // Arrange - Simulate a complex message with both chat and tool content
      const complexMessage = {
        id: 'integration_msg_1',
        type: 'assistant-response',
        content: 'I have analyzed your code and found several issues.',
        toolUsage: {
          tool: 'Grep',
          pattern: 'console.log',
          results: ['file1.js:10', 'file2.js:25', 'file3.js:42']
        },
        timestamp: Date.now()
      };

      // Setup mock expectations for the integration workflow
      mockIdGenerator.generate.mockResolvedValue('msg_integrated_001');
      mockIdGenerator.validateFormat.mockReturnValue(true);
      mockMessageStore.save.mockResolvedValue(complexMessage);
      
      mockChatFilter.shouldExcludeFromChat.mockImplementation(msg => 
        msg.type === 'tool-usage' || Boolean(msg.toolUsage)
      );
      mockChatFilter.cleanChatResponse.mockReturnValue({
        chatContent: complexMessage.content,
        toolContent: complexMessage.toolUsage
      });
      
      mockChannelRouter.determineDestination.mockImplementation((content, type) =>
        type === 'tool-usage' ? 'terminal' : 'chat'
      );
      mockChannelRouter.routeToChat.mockResolvedValue({ routed: true });
      mockChannelRouter.routeToTerminal.mockResolvedValue({ routed: true });
      
      mockMessageQueue.enqueue.mockResolvedValue({ queued: true });
      mockSequentialProcessor.process.mockResolvedValue({ processed: true });
      mockChannelBroadcaster.determineTargetChannels.mockImplementation(msg =>
        msg.toolUsage ? ['terminal'] : ['chat']
      );
      mockChannelBroadcaster.broadcastToChannel.mockResolvedValue({ broadcasted: true });

      // Act - Process the message through the integrated system
      const result = await integrationOrchestrator.processComplexMessage(complexMessage);

      // Assert - Verify the integration workflow
      expect(mockSystemOrchestrator.coordinate).toHaveBeenCalledWith(
        'message-processing',
        expect.objectContaining({ messageId: complexMessage.id })
      );

      // Verify message sequencing was involved
      expect(mockIdGenerator.generate).toHaveBeenCalledWith('message');
      expect(mockMessageStore.save).toHaveBeenCalled();

      // Verify tool usage separation
      expect(mockChatFilter.cleanChatResponse).toHaveBeenCalledWith(complexMessage);
      expect(mockChannelRouter.routeToChat).toHaveBeenCalledWith(complexMessage.content);
      expect(mockChannelRouter.routeToTerminal).toHaveBeenCalledWith(complexMessage.toolUsage);

      // Verify WebSocket processing
      expect(mockMessageQueue.enqueue).toHaveBeenCalled();
      expect(mockChannelBroadcaster.determineTargetChannels).toHaveBeenCalled();

      // Verify integration logging
      expect(mockIntegrationLogger.logWorkflow).toHaveBeenCalledWith(
        'complex-message-processing',
        expect.objectContaining({ success: true })
      );

      expect(result.chatSent).toBe(true);
      expect(result.terminalSent).toBe(true);
      expect(result.separated).toBe(true);
    });

    it('should show all responses in terminal while filtering chat content', async () => {
      // Arrange - Multiple message types that should all appear in terminal
      const messages = [
        { id: 'term_1', type: 'chat', content: 'User question' },
        { id: 'term_2', type: 'assistant-response', content: 'Assistant answer' },
        { id: 'term_3', type: 'tool-usage', tool: 'Read', file_path: '/test.js' },
        { id: 'term_4', type: 'system', content: 'System notification' }
      ];

      // Setup mocks for terminal display of all messages
      mockTerminalDisplay.send.mockResolvedValue({ sent: true });
      mockChatFilter.shouldExcludeFromChat.mockImplementation(msg => 
        msg.type === 'tool-usage' || msg.type === 'system'
      );
      mockChannelBroadcaster.determineTargetChannels.mockReturnValue(['terminal']);
      mockMessageQueue.enqueue.mockResolvedValue({ queued: true });
      mockSequentialProcessor.process.mockResolvedValue({ processed: true });

      // Act - Process all messages through integration
      const results = await integrationOrchestrator.processMessagesForTerminal(messages);

      // Assert - Verify all messages go to terminal
      expect(mockTerminalDisplay.send).toHaveBeenCalledTimes(4);
      messages.forEach((msg, index) => {
        expect(mockTerminalDisplay.send).toHaveBeenNthCalledWith(
          index + 1,
          expect.any(String),
          expect.objectContaining({ channel: 'terminal' })
        );
      });

      // Verify chat filtering worked properly
      expect(mockChatFilter.shouldExcludeFromChat).toHaveBeenCalledTimes(4);
      
      // Verify WebSocket coordination
      expect(mockMessageQueue.enqueue).toHaveBeenCalledTimes(4);
      expect(mockChannelBroadcaster.determineTargetChannels).toHaveBeenCalledTimes(4);

      expect(results.terminalMessageCount).toBe(4);
      expect(results.chatMessageCount).toBe(2); // Only chat and assistant-response
    });

    it('should show only conversation in chat channel', async () => {
      // Arrange - Mixed messages where only conversational ones should reach chat
      const messages = [
        { id: 'chat_1', type: 'user', content: 'How do I fix this bug?' },
        { id: 'chat_2', type: 'assistant-response', content: 'Here is how you can fix it...' },
        { id: 'tool_1', type: 'tool-usage', tool: 'Edit', file_path: '/bug.js' },
        { id: 'chat_3', type: 'user', content: 'Thank you!' },
        { id: 'chat_4', type: 'assistant-response', content: 'You are welcome!' }
      ];

      // Setup chat filtering mocks
      mockChatFilter.shouldExcludeFromChat.mockImplementation(msg => 
        msg.type === 'tool-usage'
      );
      mockChatFilter.cleanChatResponse.mockImplementation(msg => ({
        chatContent: msg.type !== 'tool-usage' ? msg.content : null,
        toolContent: msg.type === 'tool-usage' ? msg : null
      }));
      mockChannelRouter.routeToChat.mockResolvedValue({ routed: true });

      // Act - Process messages for chat display
      const result = await integrationOrchestrator.processMessagesForChat(messages);

      // Assert - Verify only conversational messages reach chat
      expect(mockChannelRouter.routeToChat).toHaveBeenCalledTimes(4);
      expect(mockChannelRouter.routeToChat).not.toHaveBeenCalledWith(
        expect.objectContaining({ tool: 'Edit' })
      );

      // Verify proper filtering
      expect(mockChatFilter.shouldExcludeFromChat).toHaveBeenCalledTimes(5);
      expect(mockChatFilter.cleanChatResponse).toHaveBeenCalledTimes(5);

      expect(result.chatMessages).toHaveLength(4);
      expect(result.excludedMessages).toHaveLength(1);
    });
  });

  describe('WebSocket Reconnection Integration', () => {
    it('should handle WebSocket reconnection with message recovery', async () => {
      // Arrange - Simulate reconnection scenario
      const reconnectionEvent = {
        connectionId: 'conn_integration_test',
        lastMessageId: 'msg_100',
        disconnectedAt: Date.now() - 30000,
        reconnectedAt: Date.now()
      };

      const missedMessages = [
        { id: 'msg_101', type: 'chat', content: 'Message during disconnect 1' },
        { id: 'msg_102', type: 'tool-usage', tool: 'Bash', command: 'npm test' },
        { id: 'msg_103', type: 'chat', content: 'Message during disconnect 2' }
      ];

      // Setup mocks for reconnection handling
      mockConnectionHandler.getConnectionState.mockReturnValue('disconnected');
      mockConnectionHandler.handleReconnection.mockResolvedValue({
        reconnected: true,
        missedMessages: missedMessages.length,
        recoveredMessages: missedMessages
      });
      mockMessageStore.getAll.mockResolvedValue(missedMessages);
      mockOrderManager.maintainSequence.mockResolvedValue(missedMessages);
      mockMessageQueue.enqueue.mockResolvedValue({ queued: true });

      // Act - Handle reconnection through integration
      const result = await integrationOrchestrator.handleReconnectionWithRecovery(reconnectionEvent);

      // Assert - Verify integrated reconnection workflow
      expect(mockSystemOrchestrator.coordinate).toHaveBeenCalledWith(
        'websocket-reconnection',
        expect.objectContaining({ connectionId: reconnectionEvent.connectionId })
      );

      // Verify connection handling
      expect(mockConnectionHandler.handleReconnection).toHaveBeenCalledWith(reconnectionEvent);

      // Verify message recovery and sequencing
      expect(mockMessageStore.getAll).toHaveBeenCalled();
      expect(mockOrderManager.maintainSequence).toHaveBeenCalledWith(missedMessages);

      // Verify messages are re-queued
      expect(mockMessageQueue.enqueue).toHaveBeenCalledTimes(3);

      // Verify integration logging
      expect(mockIntegrationLogger.logWorkflow).toHaveBeenCalledWith(
        'reconnection-recovery',
        expect.objectContaining({ 
          reconnected: true,
          messagesRecovered: 3
        })
      );

      expect(result.success).toBe(true);
      expect(result.messagesRecovered).toBe(3);
    });

    it('should maintain message order during reconnection', async () => {
      // Arrange - Messages that need to be reordered after reconnection
      const outOfOrderMessages = [
        { id: 'msg_reconnect_3', timestamp: 3000, order: null },
        { id: 'msg_reconnect_1', timestamp: 1000, order: null },
        { id: 'msg_reconnect_2', timestamp: 2000, order: null }
      ];

      mockConnectionHandler.handleReconnection.mockResolvedValue({
        reconnected: true,
        outOfOrderMessages
      });
      mockOrderManager.reorderMessages.mockResolvedValue([
        { id: 'msg_reconnect_1', timestamp: 1000, order: 0 },
        { id: 'msg_reconnect_2', timestamp: 2000, order: 1 },
        { id: 'msg_reconnect_3', timestamp: 3000, order: 2 }
      ]);
      mockSequentialProcessor.process.mockResolvedValue({ processed: true });

      // Act - Handle reconnection with reordering
      const result = await integrationOrchestrator.handleReconnectionWithReorder({
        connectionId: 'conn_reorder',
        outOfOrderMessages
      });

      // Assert - Verify reordering during reconnection
      expect(mockOrderManager.reorderMessages).toHaveBeenCalledWith(outOfOrderMessages);
      expect(mockSequentialProcessor.process).toHaveBeenCalledTimes(3);

      // Verify messages processed in correct order
      expect(mockSequentialProcessor.process).toHaveBeenNthCalledWith(
        1, expect.objectContaining({ id: 'msg_reconnect_1', order: 0 })
      );
      expect(mockSequentialProcessor.process).toHaveBeenNthCalledWith(
        2, expect.objectContaining({ id: 'msg_reconnect_2', order: 1 })
      );
      expect(mockSequentialProcessor.process).toHaveBeenNthCalledWith(
        3, expect.objectContaining({ id: 'msg_reconnect_3', order: 2 })
      );

      expect(result.reorderedCount).toBe(3);
    });
  });

  describe('End-to-End Message Flow Integration', () => {
    it('should handle complete message lifecycle from WebSocket to display', async () => {
      // Arrange - Complete message lifecycle scenario
      const incomingMessage = {
        rawData: JSON.stringify({
          type: 'assistant-response-with-tools',
          content: 'I will analyze your code and run some tests.',
          tools: [
            { name: 'Read', parameters: { file_path: '/src/app.js' } },
            { name: 'Bash', parameters: { command: 'npm test' } }
          ],
          timestamp: Date.now()
        })
      };

      // Setup complete workflow mocks
      mockMessageQueue.enqueue.mockResolvedValue({ queued: true, position: 1 });
      mockSequentialProcessor.process.mockResolvedValue({ processed: true });
      mockIdGenerator.generate.mockResolvedValue('msg_lifecycle_001');
      mockMessageStore.save.mockResolvedValue({ saved: true });
      mockOrderManager.assignOrder.mockReturnValue({ assigned: true, order: 0 });
      
      mockChatFilter.cleanChatResponse.mockReturnValue({
        chatContent: 'I will analyze your code and run some tests.',
        toolContent: incomingMessage.tools
      });
      
      mockChannelRouter.routeToChat.mockResolvedValue({ routed: true });
      mockChannelRouter.routeToTerminal.mockResolvedValue({ routed: true });
      mockTerminalDisplay.send.mockResolvedValue({ sent: true });
      
      mockChannelBroadcaster.determineTargetChannels.mockReturnValue(['chat', 'terminal']);
      mockChannelBroadcaster.broadcastToChannel.mockResolvedValue({ broadcasted: true });

      // Act - Process complete message lifecycle
      const result = await integrationOrchestrator.handleCompleteMessageLifecycle(incomingMessage);

      // Assert - Verify complete integration workflow
      
      // 1. WebSocket message queuing
      expect(mockMessageQueue.enqueue).toHaveBeenCalled();
      expect(mockSequentialProcessor.process).toHaveBeenCalled();

      // 2. Message sequencing and ID assignment
      expect(mockIdGenerator.generate).toHaveBeenCalled();
      expect(mockMessageStore.save).toHaveBeenCalled();
      expect(mockOrderManager.assignOrder).toHaveBeenCalled();

      // 3. Chat/Tool separation
      expect(mockChatFilter.cleanChatResponse).toHaveBeenCalled();
      expect(mockChannelRouter.routeToChat).toHaveBeenCalled();
      expect(mockChannelRouter.routeToTerminal).toHaveBeenCalled();

      // 4. Broadcasting to appropriate channels
      expect(mockChannelBroadcaster.determineTargetChannels).toHaveBeenCalled();
      expect(mockChannelBroadcaster.broadcastToChannel).toHaveBeenCalledWith(
        'chat', expect.any(String)
      );
      expect(mockChannelBroadcaster.broadcastToChannel).toHaveBeenCalledWith(
        'terminal', expect.any(Object)
      );

      // 5. System coordination and logging
      expect(mockSystemOrchestrator.coordinate).toHaveBeenCalledWith(
        'complete-message-lifecycle',
        expect.any(Object)
      );
      expect(mockIntegrationLogger.logWorkflow).toHaveBeenCalledWith(
        'message-lifecycle',
        expect.objectContaining({ success: true })
      );

      expect(result.lifecycle).toBe('completed');
      expect(result.chatDelivered).toBe(true);
      expect(result.terminalDelivered).toBe(true);
      expect(result.toolsProcessed).toBe(2);
    });
  });
});

// Integration orchestrator implementation (will fail initially - TDD approach)
class IntegrationOrchestrator {
  constructor(messageSequencer, toolUsageHandler, webSocketMessageHandler, systemOrchestrator, integrationLogger) {
    this.messageSequencer = messageSequencer;
    this.toolUsageHandler = toolUsageHandler;
    this.webSocketMessageHandler = webSocketMessageHandler;
    this.systemOrchestrator = systemOrchestrator;
    this.integrationLogger = integrationLogger;
  }

  async processComplexMessage(complexMessage) {
    throw new Error('Not implemented yet - TDD integration approach');
  }

  async processMessagesForTerminal(messages) {
    throw new Error('Not implemented yet - TDD integration approach');
  }

  async processMessagesForChat(messages) {
    throw new Error('Not implemented yet - TDD integration approach');
  }

  async handleReconnectionWithRecovery(reconnectionEvent) {
    throw new Error('Not implemented yet - TDD integration approach');
  }

  async handleReconnectionWithReorder(reorderData) {
    throw new Error('Not implemented yet - TDD integration approach');
  }

  async handleCompleteMessageLifecycle(incomingMessage) {
    throw new Error('Not implemented yet - TDD integration approach');
  }
}

module.exports = {
  IntegrationOrchestrator,
  mockSystemOrchestrator,
  mockIntegrationLogger,
  mockSwarmCoordinator
};