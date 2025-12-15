/**
 * TDD Test Suite: AVI Session Manager
 *
 * London School TDD Approach:
 * - Mock Claude Code SDK interactions
 * - Mock file system operations
 * - Focus on behavior verification
 * - Test object collaborations
 *
 * Coverage:
 * - Session lifecycle management
 * - Lazy initialization
 * - Idle timeout and cleanup
 * - Context reuse
 * - Token tracking
 * - Error handling and recovery
 */

import { describe, it, expect, jest, beforeEach, afterEach } from '@jest/globals';

// Mock ClaudeCodeSDKManager
const mockSdkManager = {
  executeHeadlessTask: jest.fn()
};

const mockGetClaudeCodeSDKManager = jest.fn(() => mockSdkManager);

jest.unstable_mockModule('../../prod/src/services/ClaudeCodeSDKManager.js', () => ({
  getClaudeCodeSDKManager: mockGetClaudeCodeSDKManager
}));

// Mock fs promises
const mockReadFile = jest.fn();
jest.unstable_mockModule('fs', () => ({
  promises: {
    readFile: mockReadFile
  }
}));

// Mock timers
jest.useFakeTimers();

describe('AviSessionManager', () => {
  let AviSessionManager;
  let sessionManager;

  beforeEach(async () => {
    // Reset all mocks
    jest.clearAllMocks();

    // Setup default successful responses
    mockReadFile.mockResolvedValue(`
      ## 🤖 Meet Λvi - Your Chief of Staff
      AVI is your intelligent assistant.

      ## 🚨 MANDATORY: Λvi Behavioral Patterns
      Be concise and helpful.
    `);

    mockSdkManager.executeHeadlessTask.mockResolvedValue({
      success: true,
      messages: [
        {
          type: 'assistant',
          content: [
            { type: 'text', text: 'Hello, I am AVI. How can I help you?' }
          ]
        }
      ],
      usage: {
        total_tokens: 1700
      }
    });

    // Import module after mocks are setup
    const module = await import('../../avi/session-manager.js');
    AviSessionManager = module.default;

    // Create fresh instance
    sessionManager = new AviSessionManager({
      idleTimeout: 60000 // 1 minute for testing
    });
  });

  afterEach(() => {
    jest.clearAllTimers();
    jest.restoreAllMocks();
  });

  describe('Lazy Initialization', () => {
    it('should not initialize session on construction', () => {
      // Assert
      expect(sessionManager.sessionActive).toBe(false);
      expect(sessionManager.sessionId).toBeNull();
      expect(mockGetClaudeCodeSDKManager).not.toHaveBeenCalled();
    });

    it('should initialize session on first chat', async () => {
      // Act
      await sessionManager.chat('Hello');

      // Assert
      expect(mockGetClaudeCodeSDKManager).toHaveBeenCalled();
      expect(sessionManager.sessionActive).toBe(true);
      expect(sessionManager.sessionId).toMatch(/^avi-session-/);
    });

    it('should load AVI prompt from CLAUDE.md on initialization', async () => {
      // Act
      await sessionManager.initialize();

      // Assert
      expect(mockReadFile).toHaveBeenCalledWith(
        expect.stringContaining('CLAUDE.md'),
        'utf-8'
      );
      expect(sessionManager.systemPrompt).toBeTruthy();
      expect(sessionManager.systemPrompt).toContain('Λvi');
    });

    it('should start cleanup timer on initialization', async () => {
      // Act
      await sessionManager.initialize();

      // Assert
      expect(sessionManager.cleanupTimer).toBeTruthy();
    });

    it('should return initialization metadata', async () => {
      // Act
      const result = await sessionManager.initialize();

      // Assert
      expect(result).toEqual({
        sessionId: expect.stringMatching(/^avi-session-/),
        status: 'initialized',
        tokensUsed: 30000
      });
    });
  });

  describe('Session Reuse', () => {
    it('should reuse existing session on subsequent chats', async () => {
      // Arrange
      await sessionManager.initialize();
      const firstSessionId = sessionManager.sessionId;
      jest.clearAllMocks();

      // Act
      await sessionManager.chat('Question 1');
      await sessionManager.chat('Question 2');

      // Assert
      expect(sessionManager.sessionId).toBe(firstSessionId);
      expect(mockGetClaudeCodeSDKManager).not.toHaveBeenCalled();
      expect(mockSdkManager.executeHeadlessTask).toHaveBeenCalledTimes(2);
    });

    it('should return reused status when session already active', async () => {
      // Arrange
      await sessionManager.initialize();
      const firstSessionId = sessionManager.sessionId;

      // Act
      const result = await sessionManager.initialize();

      // Assert
      expect(result).toEqual({
        sessionId: firstSessionId,
        status: 'reused',
        tokensUsed: 0
      });
    });

    it('should update activity timestamp on each interaction', async () => {
      // Arrange
      await sessionManager.initialize();
      const firstActivity = sessionManager.lastActivity;

      jest.advanceTimersByTime(1000);

      // Act
      await sessionManager.chat('Test message');

      // Assert
      expect(sessionManager.lastActivity).toBeGreaterThan(firstActivity);
    });

    it('should pass sessionId to SDK on subsequent calls', async () => {
      // Arrange
      await sessionManager.initialize();
      const sessionId = sessionManager.sessionId;

      // Act
      await sessionManager.chat('Test message');

      // Assert
      expect(mockSdkManager.executeHeadlessTask).toHaveBeenCalledWith(
        expect.any(String),
        expect.objectContaining({
          sessionId: sessionId
        })
      );
    });
  });

  describe('Chat Functionality', () => {
    it('should send user message to SDK', async () => {
      // Arrange
      const userMessage = 'What is the current working directory?';

      // Act
      await sessionManager.chat(userMessage);

      // Assert
      expect(mockSdkManager.executeHeadlessTask).toHaveBeenCalledWith(
        expect.stringContaining(userMessage),
        expect.any(Object)
      );
    });

    it('should enforce maxTokens limit', async () => {
      // Arrange
      const maxTokens = 2000;

      // Act
      await sessionManager.chat('Test', { maxTokens });

      // Assert
      expect(mockSdkManager.executeHeadlessTask).toHaveBeenCalledWith(
        expect.any(String),
        expect.objectContaining({
          maxTokens: maxTokens
        })
      );
    });

    it('should include system prompt on first interaction', async () => {
      // Arrange
      const userMessage = 'Hello';

      // Act
      await sessionManager.chat(userMessage, { includeSystemPrompt: true });

      // Assert
      expect(mockSdkManager.executeHeadlessTask).toHaveBeenCalledWith(
        expect.stringContaining('Λvi'),
        expect.any(Object)
      );
    });

    it('should extract text response from SDK result', async () => {
      // Arrange
      mockSdkManager.executeHeadlessTask.mockResolvedValue({
        success: true,
        messages: [
          {
            type: 'assistant',
            content: [
              { type: 'text', text: 'This is the response' }
            ]
          }
        ],
        usage: { total_tokens: 1700 }
      });

      // Act
      const result = await sessionManager.chat('Test');

      // Assert
      expect(result.response).toBe('This is the response');
    });

    it('should handle multiple text blocks in response', async () => {
      // Arrange
      mockSdkManager.executeHeadlessTask.mockResolvedValue({
        success: true,
        messages: [
          {
            type: 'assistant',
            content: [
              { type: 'text', text: 'Part 1' },
              { type: 'text', text: 'Part 2' }
            ]
          }
        ],
        usage: { total_tokens: 1700 }
      });

      // Act
      const result = await sessionManager.chat('Test');

      // Assert
      expect(result.response).toContain('Part 1');
      expect(result.response).toContain('Part 2');
    });

    it('should increment interaction count', async () => {
      // Act
      await sessionManager.chat('Message 1');
      await sessionManager.chat('Message 2');
      await sessionManager.chat('Message 3');

      // Assert
      expect(sessionManager.interactionCount).toBe(3);
    });
  });

  describe('Token Tracking', () => {
    it('should track tokens from SDK usage data', async () => {
      // Arrange
      mockSdkManager.executeHeadlessTask.mockResolvedValue({
        success: true,
        messages: [{ type: 'assistant', content: [{ type: 'text', text: 'Response' }] }],
        usage: { total_tokens: 1850 }
      });

      // Act
      const result = await sessionManager.chat('Test');

      // Assert
      expect(result.tokensUsed).toBe(1850);
    });

    it('should accumulate total tokens across interactions', async () => {
      // Arrange
      mockSdkManager.executeHeadlessTask.mockResolvedValue({
        success: true,
        messages: [{ type: 'assistant', content: [{ type: 'text', text: 'Response' }] }],
        usage: { total_tokens: 1700 }
      });

      // Act
      await sessionManager.chat('Message 1');
      await sessionManager.chat('Message 2');
      await sessionManager.chat('Message 3');

      // Assert
      expect(sessionManager.totalTokensUsed).toBe(1700 * 3);
    });

    it('should default to 1700 tokens if usage data missing', async () => {
      // Arrange
      mockSdkManager.executeHeadlessTask.mockResolvedValue({
        success: true,
        messages: [{ type: 'assistant', content: [{ type: 'text', text: 'Response' }] }]
        // No usage data
      });

      // Act
      const result = await sessionManager.chat('Test');

      // Assert
      expect(result.tokensUsed).toBe(1700);
    });

    it('should include token metrics in chat result', async () => {
      // Arrange
      await sessionManager.initialize();

      // Act
      const result = await sessionManager.chat('Test');

      // Assert
      expect(result).toHaveProperty('tokensUsed');
      expect(result).toHaveProperty('totalTokens');
      expect(result).toHaveProperty('interactionCount');
      expect(result.interactionCount).toBe(1);
    });
  });

  describe('Idle Timeout and Cleanup', () => {
    it('should check idle timeout periodically', async () => {
      // Arrange
      await sessionManager.initialize();
      const checkSpy = jest.spyOn(sessionManager, 'checkIdleTimeout');

      // Act
      jest.advanceTimersByTime(60000); // 1 minute

      // Assert
      expect(checkSpy).toHaveBeenCalled();
    });

    it('should cleanup session after idle timeout', async () => {
      // Arrange
      await sessionManager.initialize();
      expect(sessionManager.sessionActive).toBe(true);

      // Act - Advance past idle timeout
      jest.advanceTimersByTime(61000); // 61 seconds

      // Assert
      expect(sessionManager.sessionActive).toBe(false);
      expect(sessionManager.sessionId).toBeNull();
    });

    it('should not cleanup if there is recent activity', async () => {
      // Arrange
      await sessionManager.initialize();

      // Act - Activity within timeout window
      jest.advanceTimersByTime(30000); // 30 seconds
      await sessionManager.chat('Keep alive');
      jest.advanceTimersByTime(30000); // Another 30 seconds

      // Assert
      expect(sessionManager.sessionActive).toBe(true);
    });

    it('should clear cleanup timer on cleanup', async () => {
      // Arrange
      await sessionManager.initialize();
      const timerId = sessionManager.cleanupTimer;

      // Act
      sessionManager.cleanup();

      // Assert
      expect(sessionManager.cleanupTimer).toBeNull();
    });

    it('should log session statistics on cleanup', async () => {
      // Arrange
      await sessionManager.chat('Message 1');
      await sessionManager.chat('Message 2');
      const consoleSpy = jest.spyOn(console, 'log');

      // Act
      sessionManager.cleanup();

      // Assert
      expect(consoleSpy).toHaveBeenCalledWith(
        expect.stringContaining('AVI session cleaned up'),
        expect.objectContaining({
          interactions: 2,
          tokensUsed: expect.any(Number)
        })
      );
    });
  });

  describe('Error Handling', () => {
    it('should throw error when SDK fails', async () => {
      // Arrange
      mockSdkManager.executeHeadlessTask.mockResolvedValue({
        success: false,
        error: 'SDK connection failed'
      });

      // Act & Assert
      await expect(sessionManager.chat('Test')).rejects.toThrow(
        'AVI chat failed: SDK connection failed'
      );
    });

    it('should recover from session loss', async () => {
      // Arrange
      await sessionManager.initialize();
      const firstSessionId = sessionManager.sessionId;

      // First call fails with session error
      mockSdkManager.executeHeadlessTask
        .mockRejectedValueOnce(new Error('session expired'))
        .mockResolvedValueOnce({
          success: true,
          messages: [{ type: 'assistant', content: [{ type: 'text', text: 'Recovered' }] }],
          usage: { total_tokens: 1700 }
        });

      // Act
      const result = await sessionManager.chat('Test');

      // Assert
      expect(result.success).toBe(true);
      expect(sessionManager.sessionId).not.toBe(firstSessionId); // New session
      expect(mockSdkManager.executeHeadlessTask).toHaveBeenCalledTimes(2);
    });

    it('should handle missing AVI prompt file gracefully', async () => {
      // Arrange
      mockReadFile.mockRejectedValue(new Error('File not found'));

      // Act & Assert
      await expect(sessionManager.initialize()).rejects.toThrow('File not found');
      expect(sessionManager.sessionActive).toBe(false);
    });

    it('should provide fallback response when extraction fails', async () => {
      // Arrange
      mockSdkManager.executeHeadlessTask.mockResolvedValue({
        success: true,
        messages: [], // Empty messages
        usage: { total_tokens: 1700 }
      });

      // Act
      const result = await sessionManager.chat('Test');

      // Assert
      expect(result.response).toContain('unable to generate a response');
    });

    it('should handle SDK initialization failure', async () => {
      // Arrange
      mockGetClaudeCodeSDKManager.mockImplementation(() => {
        throw new Error('SDK not available');
      });

      // Act & Assert
      await expect(sessionManager.initialize()).rejects.toThrow('SDK not available');
      expect(sessionManager.sessionActive).toBe(false);
    });
  });

  describe('Session Status', () => {
    it('should return complete status information', async () => {
      // Arrange
      await sessionManager.chat('Test 1');
      await sessionManager.chat('Test 2');

      // Act
      const status = sessionManager.getStatus();

      // Assert
      expect(status).toEqual({
        active: true,
        sessionId: expect.stringMatching(/^avi-session-/),
        lastActivity: expect.any(Number),
        idleTime: expect.any(Number),
        idleTimeout: 60000,
        interactionCount: 2,
        totalTokensUsed: expect.any(Number),
        averageTokensPerInteraction: expect.any(Number)
      });
    });

    it('should calculate average tokens per interaction', async () => {
      // Arrange
      mockSdkManager.executeHeadlessTask.mockResolvedValue({
        success: true,
        messages: [{ type: 'assistant', content: [{ type: 'text', text: 'Response' }] }],
        usage: { total_tokens: 2000 }
      });

      await sessionManager.chat('Test 1');
      await sessionManager.chat('Test 2');

      // Act
      const status = sessionManager.getStatus();

      // Assert
      expect(status.averageTokensPerInteraction).toBe(2000);
    });

    it('should handle status when session inactive', () => {
      // Act
      const status = sessionManager.getStatus();

      // Assert
      expect(status.active).toBe(false);
      expect(status.sessionId).toBeNull();
      expect(status.lastActivity).toBeNull();
      expect(status.idleTime).toBeNull();
    });

    it('should calculate idle time correctly', async () => {
      // Arrange
      await sessionManager.initialize();
      const initialActivity = sessionManager.lastActivity;

      // Act
      jest.advanceTimersByTime(5000); // 5 seconds
      const status = sessionManager.getStatus();

      // Assert
      expect(status.idleTime).toBeGreaterThanOrEqual(5000);
    });
  });

  describe('Configuration', () => {
    it('should accept custom idle timeout', () => {
      // Arrange
      const customTimeout = 120000; // 2 minutes

      // Act
      const customManager = new AviSessionManager({
        idleTimeout: customTimeout
      });

      // Assert
      expect(customManager.idleTimeout).toBe(customTimeout);
    });

    it('should default to 60 minutes idle timeout', () => {
      // Arrange & Act
      const defaultManager = new AviSessionManager();

      // Assert
      expect(defaultManager.idleTimeout).toBe(60 * 60 * 1000);
    });
  });

  describe('Singleton Pattern', () => {
    it('should export getAviSession factory function', async () => {
      // Arrange
      const { getAviSession } = await import('../../avi/session-manager.js');

      // Act
      const instance1 = getAviSession();
      const instance2 = getAviSession();

      // Assert
      expect(instance1).toBe(instance2);
    });

    it('should create singleton on first call', async () => {
      // Arrange
      const { getAviSession } = await import('../../avi/session-manager.js');

      // Act
      const instance = getAviSession({ idleTimeout: 90000 });

      // Assert
      expect(instance).toBeInstanceOf(AviSessionManager);
    });
  });

  describe('Prompt Loading', () => {
    it('should extract AVI-specific sections from CLAUDE.md', async () => {
      // Arrange
      mockReadFile.mockResolvedValue(`
        # Full Document

        ## 🤖 Meet Λvi - Your Chief of Staff
        AVI is your assistant.

        ## 🚨 MANDATORY: Λvi Behavioral Patterns
        Be helpful.

        ## 🎯 Specialized Agent Routing
        Route to specialists.

        ## Other Section
        Ignore this.
      `);

      // Act
      const prompt = await sessionManager.loadAviPrompt();

      // Assert
      expect(prompt).toContain('Meet Λvi');
      expect(prompt).toContain('Behavioral Patterns');
      expect(prompt).toContain('Specialized Agent Routing');
      expect(prompt).not.toContain('Other Section');
    });

    it('should add working directory context to prompt', async () => {
      // Act
      const prompt = await sessionManager.loadAviPrompt();

      // Assert
      expect(prompt).toContain('Working Directory');
      expect(prompt).toContain('/workspaces/agent-feed/prod/agent_workspace/');
    });

    it('should define AVI role and responsibilities', async () => {
      // Act
      const prompt = await sessionManager.loadAviPrompt();

      // Assert
      expect(prompt).toContain('Your Role');
      expect(prompt).toContain('Answer user questions');
      expect(prompt).toContain('Coordinate specialist agents');
    });

    it('should specify token limits in prompt', async () => {
      // Act
      const prompt = await sessionManager.loadAviPrompt();

      // Assert
      expect(prompt).toContain('max 2000 tokens');
    });
  });
});
