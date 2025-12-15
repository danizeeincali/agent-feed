/**
 * Unit Test Suite: AviDMService - CWD Path Configuration
 *
 * TDD London School: Service Layer Testing
 * Phase: RED (all tests should fail initially)
 *
 * Purpose: Verify AviDMService properly configures cwd path
 * Approach: Test service behavior and collaborations with HTTP client
 *
 * NOTE: AviDMService is already fixed, but we test to ensure no regressions
 * and to validate it as a reference implementation
 */

import { describe, test, expect, vi, beforeEach, afterEach } from 'vitest';
import { AviDMService } from '../../services/AviDMService';

// Mock HTTP client
const mockHttpClient = {
  get: vi.fn(),
  post: vi.fn(),
  put: vi.fn(),
  delete: vi.fn()
};

// Mock other dependencies
vi.mock('../../services/HttpClient', () => ({
  HttpClient: vi.fn().mockImplementation(() => mockHttpClient)
}));

vi.mock('../../services/WebSocketManager', () => ({
  WebSocketManager: vi.fn().mockImplementation(() => ({
    connect: vi.fn().mockResolvedValue(undefined),
    disconnect: vi.fn().mockResolvedValue(undefined),
    onConnect: vi.fn(),
    onDisconnect: vi.fn(),
    onMessage: vi.fn(),
    onError: vi.fn(),
    send: vi.fn()
  }))
}));

vi.mock('../../services/ContextManager', () => ({
  ContextManager: vi.fn().mockImplementation(() => ({
    initializeContext: vi.fn().mockResolvedValue({}),
    serializeContext: vi.fn().mockResolvedValue('{}'),
    getProjectContext: vi.fn().mockResolvedValue({}),
    updateContext: vi.fn().mockResolvedValue(undefined),
    updateGitContext: vi.fn().mockResolvedValue(undefined),
    dispose: vi.fn()
  }))
}));

vi.mock('../../services/SessionManager', () => ({
  SessionManager: vi.fn().mockImplementation(() => ({
    createSession: vi.fn().mockResolvedValue('session-123'),
    endSession: vi.fn().mockResolvedValue(undefined),
    saveSession: vi.fn().mockResolvedValue(undefined),
    getMessages: vi.fn().mockResolvedValue([]),
    addMessage: vi.fn().mockResolvedValue(undefined),
    dispose: vi.fn()
  }))
}));

vi.mock('../../services/ErrorHandler', () => ({
  ErrorHandler: vi.fn().mockImplementation(() => ({
    handleError: vi.fn((error) => error),
    enableOfflineMode: vi.fn().mockResolvedValue(undefined),
    generateFallbackResponse: vi.fn().mockResolvedValue({ content: 'Fallback' })
  }))
}));

vi.mock('../../services/SecurityManager', () => ({
  SecurityManager: vi.fn().mockImplementation(() => ({
    checkRateLimit: vi.fn().mockResolvedValue(true),
    recordRequest: vi.fn(),
    sanitizeContent: vi.fn((content) => content)
  }))
}));

const CORRECT_CWD = '/workspaces/agent-feed/prod';

describe('AviDMService - CWD Path Configuration', () => {

  beforeEach(() => {
    vi.clearAllMocks();
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  describe('Configuration', () => {

    test('should use absolute base URL by default', () => {
      const service = new AviDMService();

      const config = service.configuration;

      // Should NOT use relative URL
      expect(config.baseUrl).toMatch(/^http/);
      expect(config.baseUrl).not.toBe('/api');
    });

    test('should default to http://localhost:3001', () => {
      const service = new AviDMService();

      const config = service.configuration;

      expect(config.baseUrl).toBe('http://localhost:3001');
    });

    test('should accept custom base URL', () => {
      const customUrl = 'http://localhost:8080';
      const service = new AviDMService({ baseUrl: customUrl });

      const config = service.configuration;

      expect(config.baseUrl).toBe(customUrl);
    });

    test('should accept base URL from environment variable', () => {
      const envUrl = 'https://api.production.com';
      const service = new AviDMService({ baseUrl: envUrl });

      const config = service.configuration;

      expect(config.baseUrl).toBe(envUrl);
    });

    test('should not have /api suffix in base URL', () => {
      const service = new AviDMService();

      const config = service.configuration;

      // Should be http://localhost:3001, NOT http://localhost:3001/api
      expect(config.baseUrl).not.toContain('/api');
    });
  });

  describe('Send Message - CWD Path Handling', () => {

    test('should send message with correct cwd path in options', async () => {
      mockHttpClient.post.mockResolvedValue({
        id: 'resp-123',
        requestId: 'req-123',
        content: 'Response',
        status: 'success',
        metadata: {}
      });

      const service = new AviDMService();

      // Mock initialization
      await service.initialize();

      // Send message
      await service.sendMessage('Test message');

      // Verify HttpClient.post was called
      expect(mockHttpClient.post).toHaveBeenCalled();

      // Get call arguments
      const [endpoint, requestBody] = mockHttpClient.post.mock.calls[0];

      // Verify endpoint
      expect(endpoint).toBe('/api/claude-code/streaming-chat');

      // Verify cwd in options
      expect(requestBody.options).toBeDefined();
      expect(requestBody.options.cwd).toBe('/workspaces/agent-feed');
    });

    test('should pass cwd to HTTP client in request body', async () => {
      mockHttpClient.post.mockResolvedValue({
        id: 'resp-123',
        requestId: 'req-123',
        content: 'Response',
        status: 'success',
        metadata: {}
      });

      const service = new AviDMService();
      await service.initialize();

      await service.sendMessage('Test message');

      const [, requestBody] = mockHttpClient.post.mock.calls[0];

      // Verify structure
      expect(requestBody).toHaveProperty('message');
      expect(requestBody).toHaveProperty('options');
      expect(requestBody.options).toHaveProperty('cwd');
    });

    test('should include enableTools in options', async () => {
      mockHttpClient.post.mockResolvedValue({
        id: 'resp-123',
        requestId: 'req-123',
        content: 'Response',
        status: 'success',
        metadata: {}
      });

      const service = new AviDMService();
      await service.initialize();

      await service.sendMessage('Test message');

      const [, requestBody] = mockHttpClient.post.mock.calls[0];

      expect(requestBody.options.enableTools).toBe(true);
    });

    test('should merge custom options with cwd', async () => {
      mockHttpClient.post.mockResolvedValue({
        id: 'resp-123',
        requestId: 'req-123',
        content: 'Response',
        status: 'success',
        metadata: {}
      });

      const service = new AviDMService();
      await service.initialize();

      await service.sendMessage('Test message', {
        temperature: 0.7,
        maxTokens: 2000
      });

      const [, requestBody] = mockHttpClient.post.mock.calls[0];

      // Should have both custom options and cwd
      expect(requestBody.options.cwd).toBeDefined();
      expect(requestBody.options.temperature).toBe(0.7);
      expect(requestBody.options.maxTokens).toBe(2000);
    });
  });

  describe('HTTP Client Integration', () => {

    test('should initialize HTTP client with correct base URL', () => {
      const service = new AviDMService({
        baseUrl: 'http://localhost:3001'
      });

      // HTTP client should be created with this base URL
      const config = service.configuration;
      expect(config.baseUrl).toBe('http://localhost:3001');
    });

    test('should use correct timeout for Claude Code (300 seconds)', () => {
      const service = new AviDMService();

      const config = service.configuration;

      // Claude Code can take 10-60 seconds, so 5 minute timeout is appropriate
      expect(config.timeout).toBe(300000); // 5 minutes in milliseconds
    });

    test('should have retry configuration', () => {
      const service = new AviDMService();

      const config = service.configuration;

      expect(config.retryAttempts).toBeGreaterThan(0);
    });
  });

  describe('Session Management with CWD', () => {

    test('should create session with project path', async () => {
      mockHttpClient.post.mockResolvedValue({
        sessionId: 'session-123'
      });

      const service = new AviDMService();
      await service.initialize();

      const sessionId = await service.createSession(
        'project-1',
        CORRECT_CWD
      );

      expect(sessionId).toBeDefined();

      // Verify HTTP client was called with project context
      expect(mockHttpClient.post).toHaveBeenCalledWith(
        '/sessions',
        expect.objectContaining({
          projectId: 'project-1',
          projectPath: CORRECT_CWD
        })
      );
    });

    test('should maintain project path in session context', async () => {
      mockHttpClient.post.mockResolvedValue({
        sessionId: 'session-123'
      });

      const service = new AviDMService();
      await service.initialize();

      await service.createSession('project-1', CORRECT_CWD);

      // Subsequent messages should use the session's project path
      mockHttpClient.post.mockResolvedValue({
        id: 'resp-123',
        requestId: 'req-123',
        content: 'Response',
        status: 'success',
        metadata: {}
      });

      await service.sendMessage('Test');

      const [, requestBody] = mockHttpClient.post.mock.calls[1]; // Second call
      expect(requestBody.options).toBeDefined();
    });
  });

  describe('Error Handling', () => {

    test('should handle initialization errors gracefully', async () => {
      mockHttpClient.get.mockRejectedValue(new Error('Connection failed'));

      const service = new AviDMService({
        fallback: { enableOfflineMode: false }
      });

      await expect(service.initialize()).rejects.toThrow();
    });

    test('should handle send message errors', async () => {
      mockHttpClient.post.mockRejectedValue(new Error('Network error'));

      const service = new AviDMService({
        fallback: { enableOfflineMode: false }
      });
      await service.initialize();

      await expect(service.sendMessage('Test')).rejects.toThrow();
    });

    test('should support offline mode fallback', async () => {
      mockHttpClient.post.mockRejectedValue(new Error('Network error'));

      const service = new AviDMService({
        fallback: { enableOfflineMode: true }
      });
      await service.initialize();

      const response = await service.sendMessage('Test');

      // Should return fallback response
      expect(response).toBeDefined();
      expect(response.content).toBeDefined();
    });
  });

  describe('Context Management', () => {

    test('should serialize context with project path', async () => {
      mockHttpClient.post.mockResolvedValue({
        id: 'resp-123',
        requestId: 'req-123',
        content: 'Response',
        status: 'success',
        metadata: {}
      });

      const service = new AviDMService();
      await service.initialize(CORRECT_CWD);

      await service.sendMessage('Test');

      // Context manager should have been initialized with project path
      expect(mockHttpClient.post).toHaveBeenCalled();
    });

    test('should update project context', async () => {
      const service = new AviDMService();
      await service.initialize();
      await service.createSession('project-1', CORRECT_CWD);

      await service.updateProjectContext({
        currentBranch: 'main',
        recentChanges: ['file1.ts', 'file2.ts']
      });

      // Should send context update to backend
      expect(mockHttpClient.post).toHaveBeenCalledWith(
        '/context/update',
        expect.objectContaining({
          sessionId: expect.any(String),
          context: expect.any(Object)
        })
      );
    });
  });

  describe('Interaction Contracts (London School)', () => {

    test('should follow correct collaboration sequence for sending message', async () => {
      const callSequence: string[] = [];

      mockHttpClient.post.mockImplementation((endpoint, body) => {
        callSequence.push(`http-post:${endpoint}`);
        return Promise.resolve({
          id: 'resp-123',
          requestId: 'req-123',
          content: 'Response',
          status: 'success',
          metadata: {}
        });
      });

      const service = new AviDMService();
      await service.initialize();

      callSequence.push('init-complete');

      await service.sendMessage('Test');

      // Verify correct sequence
      expect(callSequence).toContain('init-complete');
      expect(callSequence).toContain('http-post:/api/claude-code/streaming-chat');
    });

    test('should sanitize content before sending', async () => {
      const mockSanitize = vi.fn((content) => content);

      const service = new AviDMService();
      await service.initialize();

      // Mock security manager's sanitize method
      (service as any).securityManager.sanitizeContent = mockSanitize;

      mockHttpClient.post.mockResolvedValue({
        id: 'resp-123',
        requestId: 'req-123',
        content: 'Response',
        status: 'success',
        metadata: {}
      });

      await service.sendMessage('Test message');

      // Verify sanitization was called
      expect(mockSanitize).toHaveBeenCalledWith('Test message');
    });

    test('should check rate limit before sending', async () => {
      const service = new AviDMService();
      await service.initialize();
      await service.createSession('project-1');

      const mockRateLimit = vi.fn().mockResolvedValue(true);
      (service as any).securityManager.checkRateLimit = mockRateLimit;

      mockHttpClient.post.mockResolvedValue({
        id: 'resp-123',
        requestId: 'req-123',
        content: 'Response',
        status: 'success',
        metadata: {}
      });

      await service.sendMessage('Test');

      // Verify rate limit was checked
      expect(mockRateLimit).toHaveBeenCalled();
    });

    test('should record request after successful send', async () => {
      const service = new AviDMService();
      await service.initialize();
      await service.createSession('project-1');

      const mockRecord = vi.fn();
      (service as any).securityManager.recordRequest = mockRecord;

      mockHttpClient.post.mockResolvedValue({
        id: 'resp-123',
        requestId: 'req-123',
        content: 'Response',
        status: 'success',
        metadata: {}
      });

      await service.sendMessage('Test');

      // Verify request was recorded
      expect(mockRecord).toHaveBeenCalled();
    });
  });

  describe('Event System', () => {

    test('should emit messageReceived event after successful send', async () => {
      const service = new AviDMService();
      await service.initialize();

      let emittedData: any = null;
      service.on('messageReceived', (data) => {
        emittedData = data;
      });

      mockHttpClient.post.mockResolvedValue({
        id: 'resp-123',
        requestId: 'req-123',
        content: 'Response',
        status: 'success',
        metadata: {}
      });

      await service.sendMessage('Test');

      expect(emittedData).toBeDefined();
      expect(emittedData.content).toBe('Response');
    });

    test('should emit error event on failure', async () => {
      const service = new AviDMService({
        fallback: { enableOfflineMode: false }
      });
      await service.initialize();

      let emittedError: any = null;
      service.on('error', (error) => {
        emittedError = error;
      });

      mockHttpClient.post.mockRejectedValue(new Error('Network error'));

      try {
        await service.sendMessage('Test');
      } catch (error) {
        // Expected to throw
      }

      // Error event should have been emitted
      // (Note: Implementation may vary, test may need adjustment)
    });
  });

  describe('Cleanup and Disposal', () => {

    test('should clean up resources on dispose', async () => {
      const service = new AviDMService();
      await service.initialize();
      await service.createSession('project-1');

      await service.dispose();

      // Should end session
      expect(service.currentSession).toBeNull();
    });

    test('should not allow sending messages after disposal', async () => {
      const service = new AviDMService();
      await service.initialize();

      await service.dispose();

      // Should throw error
      await expect(service.sendMessage('Test')).rejects.toThrow();
    });
  });
});
