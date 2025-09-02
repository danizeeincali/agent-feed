/**
 * TDD London School: Tool Usage Capture Tests
 * Focus: Mock-driven behavior verification for tool usage separation
 * Approach: Test collaborations between tool capture and display systems
 */

const { jest } = require('@jest/globals');

// Mock contracts for tool usage capture collaborators
const mockToolCapture = {
  captureUsage: jest.fn(),
  formatUsage: jest.fn(),
  filterByType: jest.fn(),
  trackUsageMetrics: jest.fn()
};

const mockTerminalDisplay = {
  send: jest.fn(),
  format: jest.fn(),
  clear: jest.fn(),
  showToolOutput: jest.fn()
};

const mockChatFilter = {
  shouldExcludeFromChat: jest.fn(),
  separateToolFromChat: jest.fn(),
  cleanChatResponse: jest.fn()
};

const mockClaudeToolMonitor = {
  onToolUse: jest.fn(),
  onToolComplete: jest.fn(),
  getActiveTools: jest.fn(),
  getToolHistory: jest.fn()
};

const mockChannelRouter = {
  routeToTerminal: jest.fn(),
  routeToChat: jest.fn(),
  determineDestination: jest.fn()
};

// Swarm coordination mock for tool testing
const mockSwarmCoordinator = {
  notifyToolTest: jest.fn(),
  shareToolPatterns: jest.fn(),
  coordinateToolValidation: jest.fn()
};

describe('Tool Usage Capture - London School TDD', () => {
  let toolUsageHandler;

  beforeAll(async () => {
    await mockSwarmCoordinator.notifyToolTest('tool-usage-capture-tests');
  });

  beforeEach(() => {
    jest.clearAllMocks();
    
    // Inject dependencies following London School approach
    toolUsageHandler = new ToolUsageHandler(
      mockToolCapture,
      mockTerminalDisplay,
      mockChatFilter,
      mockClaudeToolMonitor,
      mockChannelRouter
    );
  });

  afterEach(async () => {
    await mockSwarmCoordinator.coordinateToolValidation({
      testContext: expect.any(String),
      mockInteractions: jest.getAllMockCalls()
    });
  });

  afterAll(async () => {
    await mockSwarmCoordinator.shareToolPatterns({
      testSuite: 'tool-usage-capture',
      toolPatterns: mockClaudeToolMonitor.getToolHistory()
    });
  });

  describe('Claude Tool Usage Capture', () => {
    it('should capture Claude tool usage', async () => {
      // Arrange
      const toolUsage = {
        tool: 'Read',
        parameters: { file_path: '/test/file.js' },
        timestamp: Date.now(),
        sessionId: 'session_123'
      };

      mockToolCapture.captureUsage.mockResolvedValue({
        ...toolUsage,
        captured: true,
        id: 'capture_001'
      });
      mockToolCapture.trackUsageMetrics.mockResolvedValue({ tracked: true });

      // Act
      const result = await toolUsageHandler.captureToolUsage(toolUsage);

      // Assert - Verify tool capture collaboration
      expect(mockToolCapture.captureUsage).toHaveBeenCalledWith(
        expect.objectContaining({
          tool: 'Read',
          parameters: expect.objectContaining({ file_path: '/test/file.js' })
        })
      );
      expect(mockToolCapture.trackUsageMetrics).toHaveBeenCalledWith(result);
      expect(result.captured).toBe(true);
    });

    it('should monitor Claude tool lifecycle', async () => {
      // Arrange
      const toolStart = {
        tool: 'Bash',
        command: 'npm test',
        startTime: Date.now()
      };
      const toolComplete = {
        ...toolStart,
        endTime: Date.now() + 5000,
        exitCode: 0,
        output: 'Tests passed'
      };

      mockClaudeToolMonitor.onToolUse.mockResolvedValue({ monitored: true });
      mockClaudeToolMonitor.onToolComplete.mockResolvedValue({ completed: true });

      // Act
      await toolUsageHandler.startToolMonitoring(toolStart);
      await toolUsageHandler.completeToolMonitoring(toolComplete);

      // Assert - Verify monitoring workflow
      expect(mockClaudeToolMonitor.onToolUse).toHaveBeenCalledWith(
        expect.objectContaining({ tool: 'Bash', command: 'npm test' })
      );
      expect(mockClaudeToolMonitor.onToolComplete).toHaveBeenCalledWith(
        expect.objectContaining({
          tool: 'Bash',
          exitCode: 0,
          output: 'Tests passed'
        })
      );
    });

    it('should handle tool usage errors gracefully', async () => {
      // Arrange
      const failedToolUsage = {
        tool: 'Write',
        parameters: { file_path: '/invalid/path' },
        error: 'Permission denied'
      };

      mockToolCapture.captureUsage.mockRejectedValue(
        new Error('Capture failed')
      );

      // Act & Assert
      await expect(toolUsageHandler.captureToolUsage(failedToolUsage))
        .rejects.toThrow('Capture failed');

      // Verify error handling
      expect(mockToolCapture.captureUsage).toHaveBeenCalledWith(failedToolUsage);
      expect(mockToolCapture.trackUsageMetrics).not.toHaveBeenCalled();
    });
  });

  describe('Terminal-Only Tool Usage Display', () => {
    it('should send tool usage to terminal only', async () => {
      // Arrange
      const toolUsage = {
        tool: 'Grep',
        pattern: 'function.*test',
        results: ['file1.js:10', 'file2.js:25'],
        timestamp: Date.now()
      };

      mockChannelRouter.determineDestination.mockReturnValue('terminal');
      mockTerminalDisplay.format.mockReturnValue('Formatted tool output');
      mockTerminalDisplay.send.mockResolvedValue({ sent: true });

      // Act
      await toolUsageHandler.displayToolUsage(toolUsage);

      // Assert - Verify terminal-only routing
      expect(mockChannelRouter.determineDestination).toHaveBeenCalledWith(
        toolUsage,
        'tool-usage'
      );
      expect(mockTerminalDisplay.format).toHaveBeenCalledWith(toolUsage);
      expect(mockTerminalDisplay.send).toHaveBeenCalledWith(
        'Formatted tool output',
        { channel: 'terminal' }
      );
    });

    it('should format tool usage display properly', async () => {
      // Arrange
      const toolUsage = {
        tool: 'Edit',
        file_path: '/src/component.tsx',
        changes: 'Added useState hook',
        lines_modified: 5
      };

      const expectedFormat = `
🔧 Tool: Edit
📁 File: /src/component.tsx
✏️  Changes: Added useState hook
📊 Lines Modified: 5
⏱️  Timestamp: ${toolUsage.timestamp}
      `.trim();

      mockToolCapture.formatUsage.mockReturnValue(expectedFormat);
      mockTerminalDisplay.showToolOutput.mockResolvedValue({ displayed: true });

      // Act
      await toolUsageHandler.formatAndDisplay(toolUsage);

      // Assert - Verify formatting collaboration
      expect(mockToolCapture.formatUsage).toHaveBeenCalledWith(
        toolUsage,
        { format: 'terminal', includeMetadata: true }
      );
      expect(mockTerminalDisplay.showToolOutput).toHaveBeenCalledWith(
        expectedFormat
      );
    });

    it('should prevent tool usage from appearing in chat', async () => {
      // Arrange
      const toolUsageMessage = {
        type: 'tool-usage',
        tool: 'MultiEdit',
        content: 'Tool output should not appear in chat',
        source: 'claude-tool'
      };

      mockChatFilter.shouldExcludeFromChat.mockReturnValue(true);
      mockChatFilter.separateToolFromChat.mockReturnValue({
        chatContent: null,
        toolContent: toolUsageMessage.content
      });

      // Act
      const result = await toolUsageHandler.processMessage(toolUsageMessage);

      // Assert - Verify chat exclusion
      expect(mockChatFilter.shouldExcludeFromChat).toHaveBeenCalledWith(
        toolUsageMessage
      );
      expect(mockChatFilter.separateToolFromChat).toHaveBeenCalledWith(
        toolUsageMessage
      );
      expect(result.sentToChat).toBe(false);
      expect(result.sentToTerminal).toBe(true);
    });
  });

  describe('Chat vs Terminal Separation', () => {
    it('should not mix tool usage with chat responses', async () => {
      // Arrange
      const mixedMessage = {
        type: 'response',
        content: 'Here is your answer',
        toolUsage: {
          tool: 'Read',
          file_path: '/config.json'
        },
        timestamp: Date.now()
      };

      mockChatFilter.cleanChatResponse.mockReturnValue({
        chatContent: 'Here is your answer',
        toolContent: { tool: 'Read', file_path: '/config.json' }
      });
      mockChannelRouter.routeToChat.mockResolvedValue({ routed: true });
      mockChannelRouter.routeToTerminal.mockResolvedValue({ routed: true });

      // Act
      await toolUsageHandler.separateAndRoute(mixedMessage);

      // Assert - Verify separation and routing
      expect(mockChatFilter.cleanChatResponse).toHaveBeenCalledWith(mixedMessage);
      expect(mockChannelRouter.routeToChat).toHaveBeenCalledWith(
        'Here is your answer'
      );
      expect(mockChannelRouter.routeToTerminal).toHaveBeenCalledWith(
        expect.objectContaining({ tool: 'Read' })
      );
    });

    it('should handle tool-only messages correctly', async () => {
      // Arrange
      const toolOnlyMessage = {
        type: 'tool-execution',
        tool: 'Bash',
        command: 'ls -la',
        output: 'drwxr-xr-x 1 user user 4096 Aug 31 15:00 .'
      };

      mockChatFilter.shouldExcludeFromChat.mockReturnValue(true);
      mockChannelRouter.determineDestination.mockReturnValue('terminal');

      // Act
      await toolUsageHandler.processToolOnlyMessage(toolOnlyMessage);

      // Assert - Verify terminal-only processing
      expect(mockChatFilter.shouldExcludeFromChat).toHaveBeenCalledWith(
        toolOnlyMessage
      );
      expect(mockChannelRouter.determineDestination).toHaveBeenCalledWith(
        toolOnlyMessage,
        'tool-only'
      );
      expect(mockChannelRouter.routeToChat).not.toHaveBeenCalled();
    });

    it('should maintain conversation flow in chat', async () => {
      // Arrange
      const conversationMessage = {
        type: 'assistant-response',
        content: 'I have analyzed the code and found the following issues...',
        excludeTools: true
      };

      mockChatFilter.shouldExcludeFromChat.mockReturnValue(false);
      mockChatFilter.cleanChatResponse.mockReturnValue({
        chatContent: conversationMessage.content,
        toolContent: null
      });

      // Act
      await toolUsageHandler.processConversationMessage(conversationMessage);

      // Assert - Verify chat-only routing
      expect(mockChatFilter.cleanChatResponse).toHaveBeenCalledWith(
        conversationMessage
      );
      expect(mockChannelRouter.routeToChat).toHaveBeenCalledWith(
        conversationMessage.content
      );
      expect(mockChannelRouter.routeToTerminal).not.toHaveBeenCalled();
    });
  });
});

// Mock implementation class (will fail initially - TDD approach)
class ToolUsageHandler {
  constructor(toolCapture, terminalDisplay, chatFilter, claudeToolMonitor, channelRouter) {
    this.toolCapture = toolCapture;
    this.terminalDisplay = terminalDisplay;
    this.chatFilter = chatFilter;
    this.claudeToolMonitor = claudeToolMonitor;
    this.channelRouter = channelRouter;
  }

  async captureToolUsage(toolUsage) {
    throw new Error('Not implemented yet - TDD approach');
  }

  async startToolMonitoring(toolStart) {
    throw new Error('Not implemented yet - TDD approach');
  }

  async completeToolMonitoring(toolComplete) {
    throw new Error('Not implemented yet - TDD approach');
  }

  async displayToolUsage(toolUsage) {
    throw new Error('Not implemented yet - TDD approach');
  }

  async formatAndDisplay(toolUsage) {
    throw new Error('Not implemented yet - TDD approach');
  }

  async processMessage(message) {
    throw new Error('Not implemented yet - TDD approach');
  }

  async separateAndRoute(mixedMessage) {
    throw new Error('Not implemented yet - TDD approach');
  }

  async processToolOnlyMessage(toolMessage) {
    throw new Error('Not implemented yet - TDD approach');
  }

  async processConversationMessage(conversationMessage) {
    throw new Error('Not implemented yet - TDD approach');
  }
}

module.exports = {
  ToolUsageHandler,
  mockToolCapture,
  mockTerminalDisplay,
  mockChatFilter,
  mockClaudeToolMonitor,
  mockChannelRouter
};