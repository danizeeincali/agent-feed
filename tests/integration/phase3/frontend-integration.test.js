/**
 * Phase 3 Integration Tests: Frontend Integration & MCP Protocol
 * London School TDD - Mock-driven frontend and protocol testing
 */

import { MockFactory } from '../../factories/mock-factory.js';
import { WebSocketManager } from '../../../src/websocket/manager.js';
import { MCPProtocolHandler } from '../../../src/mcp/protocol-handler.js';
import { FrontendIntegration } from '../../../src/frontend/integration.js';

describe('Phase 3 Integration: Frontend & MCP Protocol', () => {
  let mockFactory;
  let mockWebSocket;
  let mockMCPClient;
  let mockAgentLinkAPI;
  let mockEventEmitter;
  let mockLogger;

  beforeEach(() => {
    mockFactory = new MockFactory();
    mockAgentLinkAPI = mockFactory.createAgentLinkMocks();
    
    mockWebSocket = {
      send: jest.fn(),
      on: jest.fn(),
      emit: jest.fn(),
      close: jest.fn(),
      readyState: 1, // OPEN
      clients: new Set()
    };

    mockMCPClient = {
      connect: jest.fn(),
      disconnect: jest.fn(),
      sendRequest: jest.fn(),
      onNotification: jest.fn(),
      onRequest: jest.fn(),
      isConnected: jest.fn().mockReturnValue(true)
    };

    mockEventEmitter = {
      on: jest.fn(),
      emit: jest.fn(),
      removeListener: jest.fn()
    };

    mockLogger = {
      info: jest.fn(),
      error: jest.fn(),
      debug: jest.fn(),
      warn: jest.fn()
    };
  });

  describe('Real-time Agent Execution Updates', () => {
    it('should broadcast agent execution start to connected clients', async () => {
      // Arrange
      const wsManager = new WebSocketManager(mockWebSocket, mockLogger);
      const frontendIntegration = new FrontendIntegration(
        wsManager,
        mockAgentLinkAPI,
        mockEventEmitter
      );

      const executionEvent = {
        type: 'agent_execution_start',
        agentId: 'agent-123',
        agentName: 'coder',
        task: { action: 'write_file', file: 'test.js' },
        timestamp: new Date().toISOString()
      };

      mockWebSocket.clients.add({ id: 'client-1', send: jest.fn() });
      mockWebSocket.clients.add({ id: 'client-2', send: jest.fn() });

      // Act
      await frontendIntegration.broadcastAgentEvent(executionEvent);

      // Assert - Verify WebSocket broadcast
      expect(mockAgentLinkAPI.emitWebSocketEvent).toHaveBeenCalledWith({
        eventType: 'agent_execution_start',
        data: executionEvent,
        recipients: ['client-1', 'client-2']
      });

      // Verify each client received the event
      mockWebSocket.clients.forEach(client => {
        expect(client.send).toHaveBeenCalledWith(
          JSON.stringify({
            type: 'agent_execution_start',
            data: executionEvent
          })
        );
      });
    });

    it('should handle agent completion with file artifacts', async () => {
      // Arrange
      const wsManager = new WebSocketManager(mockWebSocket, mockLogger);
      const frontendIntegration = new FrontendIntegration(
        wsManager,
        mockAgentLinkAPI,
        mockEventEmitter
      );

      const completionEvent = {
        type: 'agent_execution_complete',
        agentId: 'agent-123',
        result: {
          success: true,
          artifacts: [
            { type: 'file', path: '/workspace/src/component.js', size: 1024 },
            { type: 'file', path: '/workspace/tests/component.test.js', size: 512 }
          ],
          duration: 5000
        },
        timestamp: new Date().toISOString()
      };

      mockAgentLinkAPI.postActivity.mockResolvedValue({
        id: 'activity-456',
        type: 'agent_completion'
      });

      // Act
      await frontendIntegration.handleAgentCompletion(completionEvent);

      // Assert - Verify activity logging
      expect(mockAgentLinkAPI.postActivity).toHaveBeenCalledWith({
        agentId: 'agent-123',
        type: 'completion',
        details: {
          success: true,
          artifacts: completionEvent.result.artifacts,
          duration: 5000
        },
        timestamp: expect.any(String)
      });

      // Verify WebSocket notification
      expect(mockAgentLinkAPI.emitWebSocketEvent).toHaveBeenCalledWith({
        eventType: 'agent_execution_complete',
        data: completionEvent
      });
    });

    it('should coordinate multi-agent workflow updates', async () => {
      // Arrange
      const frontendIntegration = new FrontendIntegration(
        mockWebSocket,
        mockAgentLinkAPI,
        mockEventEmitter
      );

      const workflowEvents = [
        {
          type: 'workflow_step',
          step: 1,
          agentId: 'agent-researcher',
          status: 'completed',
          nextAgent: 'agent-coder'
        },
        {
          type: 'workflow_step',
          step: 2,
          agentId: 'agent-coder',
          status: 'in_progress',
          estimatedDuration: 30000
        }
      ];

      // Act
      for (const event of workflowEvents) {
        await frontendIntegration.updateWorkflowProgress(event);
      }

      // Assert - Verify workflow coordination
      expect(mockAgentLinkAPI.emitWebSocketEvent).toHaveBeenCalledTimes(2);
      
      // Verify handoff notification
      expect(mockAgentLinkAPI.emitWebSocketEvent).toHaveBeenCalledWith({
        eventType: 'agent_handoff',
        data: {
          from: 'agent-researcher',
          to: 'agent-coder',
          workflowStep: 2
        }
      });
    });
  });

  describe('MCP Protocol Integration', () => {
    it('should handle MCP tool execution requests', async () => {
      // Arrange
      const mcpHandler = new MCPProtocolHandler(mockMCPClient, mockLogger);
      const toolRequest = {
        id: 'req-123',
        method: 'tools/call',
        params: {
          name: 'claude_code_write',
          arguments: {
            file_path: '/workspace/src/index.js',
            content: 'console.log("Hello from MCP");'
          }
        }
      };

      mockMCPClient.sendRequest.mockResolvedValue({
        id: 'req-123',
        result: {
          success: true,
          content: 'File written successfully'
        }
      });

      // Act
      const response = await mcpHandler.handleToolRequest(toolRequest);

      // Assert - Verify MCP tool execution
      expect(mockMCPClient.sendRequest).toHaveBeenCalledWith({
        method: 'tools/call',
        params: {
          name: 'claude_code_write',
          arguments: {
            file_path: '/workspace/src/index.js',
            content: 'console.log("Hello from MCP");'
          }
        }
      });

      expect(response).toEqual({
        id: 'req-123',
        result: {
          success: true,
          content: 'File written successfully'
        }
      });
    });

    it('should manage MCP resource subscriptions', async () => {
      // Arrange
      const mcpHandler = new MCPProtocolHandler(mockMCPClient, mockLogger);
      const subscriptionRequest = {
        uri: 'file:///workspace/src/',
        method: 'resource_changed'
      };

      mockMCPClient.onNotification.mockImplementation((method, handler) => {
        if (method === 'notifications/resources/updated') {
          // Simulate resource update notification
          setTimeout(() => {
            handler({
              method: 'notifications/resources/updated',
              params: {
                uri: 'file:///workspace/src/index.js',
                changes: ['content_modified']
              }
            });
          }, 100);
        }
      });

      let notificationReceived = false;
      const notificationHandler = (notification) => {
        notificationReceived = true;
        expect(notification.params.uri).toBe('file:///workspace/src/index.js');
      };

      // Act
      await mcpHandler.subscribeToResource(subscriptionRequest, notificationHandler);

      // Wait for notification
      await new Promise(resolve => setTimeout(resolve, 150));

      // Assert - Verify resource subscription
      expect(mockMCPClient.onNotification).toHaveBeenCalledWith(
        'notifications/resources/updated',
        expect.any(Function)
      );
      expect(notificationReceived).toBe(true);
    });

    it('should handle MCP connection lifecycle', async () => {
      // Arrange
      const mcpHandler = new MCPProtocolHandler(mockMCPClient, mockLogger);
      
      mockMCPClient.connect.mockResolvedValue({ connected: true });
      mockMCPClient.disconnect.mockResolvedValue({ disconnected: true });

      // Act - Connect
      await mcpHandler.connect();

      // Assert - Verify connection
      expect(mockMCPClient.connect).toHaveBeenCalled();
      expect(mockLogger.info).toHaveBeenCalledWith(
        expect.stringContaining('MCP client connected')
      );

      // Act - Disconnect
      await mcpHandler.disconnect();

      // Assert - Verify disconnection
      expect(mockMCPClient.disconnect).toHaveBeenCalled();
      expect(mockLogger.info).toHaveBeenCalledWith(
        expect.stringContaining('MCP client disconnected')
      );
    });
  });

  describe('Cross-Session Persistence', () => {
    it('should restore agent state across browser sessions', async () => {
      // Arrange
      const frontendIntegration = new FrontendIntegration(
        mockWebSocket,
        mockAgentLinkAPI,
        mockEventEmitter
      );

      const sessionData = {
        sessionId: 'session-123',
        userId: 'user-456',
        activeAgents: [
          { id: 'agent-123', name: 'coder', status: 'idle' },
          { id: 'agent-456', name: 'tester', status: 'running' }
        ],
        workflowState: {
          currentStep: 3,
          completedSteps: [1, 2],
          context: { projectPath: '/workspace' }
        }
      };

      mockAgentLinkAPI.postActivity.mockResolvedValue({
        id: 'activity-restore',
        type: 'session_restore'
      });

      // Act
      await frontendIntegration.restoreSession(sessionData);

      // Assert - Verify session restoration
      expect(mockAgentLinkAPI.postActivity).toHaveBeenCalledWith({
        type: 'session_restore',
        sessionId: 'session-123',
        details: {
          activeAgents: sessionData.activeAgents,
          workflowState: sessionData.workflowState
        }
      });

      // Verify agents are reactivated
      expect(mockAgentLinkAPI.emitWebSocketEvent).toHaveBeenCalledWith({
        eventType: 'session_restored',
        data: {
          sessionId: 'session-123',
          activeAgents: sessionData.activeAgents.length
        }
      });
    });

    it('should persist workflow progress for recovery', async () => {
      // Arrange
      const frontendIntegration = new FrontendIntegration(
        mockWebSocket,
        mockAgentLinkAPI,
        mockEventEmitter
      );

      const workflowProgress = {
        workflowId: 'workflow-789',
        steps: [
          { id: 1, status: 'completed', agentId: 'agent-123', duration: 5000 },
          { id: 2, status: 'in_progress', agentId: 'agent-456', startTime: Date.now() },
          { id: 3, status: 'pending', agentId: 'agent-789' }
        ],
        checkpoint: {
          artifacts: ['/workspace/src/index.js'],
          context: { lastModified: Date.now() }
        }
      };

      // Act
      await frontendIntegration.persistWorkflowProgress(workflowProgress);

      // Assert - Verify workflow persistence
      expect(mockAgentLinkAPI.postActivity).toHaveBeenCalledWith({
        type: 'workflow_checkpoint',
        workflowId: 'workflow-789',
        details: {
          completedSteps: 1,
          totalSteps: 3,
          currentAgent: 'agent-456',
          checkpoint: workflowProgress.checkpoint
        }
      });
    });
  });

  describe('Error Handling and Resilience', () => {
    it('should handle WebSocket disconnection gracefully', async () => {
      // Arrange
      const wsManager = new WebSocketManager(mockWebSocket, mockLogger);
      mockWebSocket.readyState = 3; // CLOSED

      const event = {
        type: 'agent_update',
        data: { agentId: 'agent-123', status: 'completed' }
      };

      // Act
      const result = await wsManager.sendEvent(event);

      // Assert - Verify graceful handling
      expect(result).toEqual({
        success: false,
        error: 'WebSocket not connected',
        queued: true
      });

      expect(mockLogger.warn).toHaveBeenCalledWith(
        expect.stringContaining('WebSocket disconnected, queuing event')
      );
    });

    it('should implement MCP protocol error recovery', async () => {
      // Arrange
      const mcpHandler = new MCPProtocolHandler(mockMCPClient, mockLogger);
      
      mockMCPClient.sendRequest
        .mockRejectedValueOnce(new Error('Connection lost'))
        .mockResolvedValueOnce({ id: 'req-123', result: { success: true } });

      mockMCPClient.isConnected
        .mockReturnValueOnce(false)
        .mockReturnValueOnce(true);

      mockMCPClient.connect.mockResolvedValue({ connected: true });

      const request = {
        method: 'tools/call',
        params: { name: 'test_tool' }
      };

      // Act
      const response = await mcpHandler.sendRequestWithRetry(request);

      // Assert - Verify error recovery
      expect(mockMCPClient.connect).toHaveBeenCalled();
      expect(mockMCPClient.sendRequest).toHaveBeenCalledTimes(2);
      expect(response.result.success).toBe(true);

      expect(mockLogger.warn).toHaveBeenCalledWith(
        expect.stringContaining('MCP request failed, retrying')
      );
    });
  });
});