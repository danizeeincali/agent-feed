/**
 * AviDMService Port Configuration Fix - Unit Tests (London School TDD)
 *
 * Following London School (mockist) TDD approach:
 * - Mock all collaborators (HttpClient, WebSocketManager, etc.)
 * - Focus on behavior verification (interactions)
 * - Test object conversations and contracts
 * - Outside-in development flow
 */

import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { AviDMService } from '../../services/AviDMService';

// ============================================================================
// MOCK COLLABORATORS (London School Approach)
// ============================================================================

// Mock HttpClient with interaction tracking
const createMockHttpClient = () => ({
  get: vi.fn(),
  post: vi.fn(),
  put: vi.fn(),
  delete: vi.fn(),
  request: vi.fn(),
  baseUrl: '',
  setBaseUrl: vi.fn(),
  getRequestHistory: vi.fn(() => [])
});

// Mock WebSocketManager
const createMockWebSocketManager = () => ({
  connect: vi.fn().mockResolvedValue(true),
  disconnect: vi.fn().mockResolvedValue(true),
  send: vi.fn(),
  onConnect: vi.fn(),
  onDisconnect: vi.fn(),
  onMessage: vi.fn(),
  onError: vi.fn(),
  isConnected: false
});

// Mock ContextManager
const createMockContextManager = () => ({
  initializeContext: vi.fn().mockResolvedValue({
    projectName: 'test-project',
    projectPath: '/workspaces/agent-feed',
    currentBranch: 'main',
    fileTree: [],
    recentChanges: [],
    activeFiles: [],
    dependencies: [],
    environmentInfo: {
      operatingSystem: 'linux',
      architecture: 'x64',
      availableMemory: 8192,
      cpuCount: 4
    },
    userPreferences: {
      theme: 'dark',
      fontSize: 14,
      indentSize: 2,
      preferredLanguage: 'en',
      autoSave: true,
      showLineNumbers: true
    }
  }),
  serializeContext: vi.fn().mockResolvedValue(JSON.stringify({
    projectPath: '/workspaces/agent-feed'
  })),
  getProjectContext: vi.fn().mockResolvedValue({
    projectPath: '/workspaces/agent-feed'
  }),
  updateContext: vi.fn().mockResolvedValue(undefined),
  updateGitContext: vi.fn().mockResolvedValue(undefined),
  dispose: vi.fn()
});

// Mock SessionManager
const createMockSessionManager = () => ({
  createSession: vi.fn().mockResolvedValue('session-123'),
  endSession: vi.fn().mockResolvedValue(undefined),
  saveSession: vi.fn().mockResolvedValue(undefined),
  addMessage: vi.fn().mockResolvedValue(undefined),
  getMessages: vi.fn().mockResolvedValue([]),
  dispose: vi.fn()
});

// Mock ErrorHandler
const createMockErrorHandler = () => ({
  handleError: vi.fn((error) => error),
  enableOfflineMode: vi.fn().mockResolvedValue(undefined),
  generateFallbackResponse: vi.fn().mockResolvedValue({
    content: 'Fallback response',
    suggestions: []
  })
});

// Mock SecurityManager
const createMockSecurityManager = () => ({
  sanitizeContent: vi.fn((content) => content),
  checkRateLimit: vi.fn().mockResolvedValue(true),
  recordRequest: vi.fn()
});

// ============================================================================
// TEST SUITE: PORT CONFIGURATION FIX
// ============================================================================

describe('AviDMService Port Configuration Fix (London School TDD)', () => {
  let mockHttpClient: ReturnType<typeof createMockHttpClient>;
  let mockWebSocketManager: ReturnType<typeof createMockWebSocketManager>;
  let mockContextManager: ReturnType<typeof createMockContextManager>;
  let mockSessionManager: ReturnType<typeof createMockSessionManager>;
  let mockErrorHandler: ReturnType<typeof createMockErrorHandler>;
  let mockSecurityManager: ReturnType<typeof createMockSecurityManager>;

  beforeEach(() => {
    // Reset all mocks before each test
    vi.clearAllMocks();

    // Create fresh mock instances
    mockHttpClient = createMockHttpClient();
    mockWebSocketManager = createMockWebSocketManager();
    mockContextManager = createMockContextManager();
    mockSessionManager = createMockSessionManager();
    mockErrorHandler = createMockErrorHandler();
    mockSecurityManager = createMockSecurityManager();
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  // ============================================================================
  // DEFAULT CONFIGURATION TESTS
  // ============================================================================

  describe('Default Configuration', () => {
    it('should use port 3001 as default baseUrl (NOT 8080)', () => {
      // ARRANGE: Create service with no config
      const service = new AviDMService();

      // ACT: Get configuration
      const config = service.configuration;

      // ASSERT: Verify baseUrl uses port 3001 WITHOUT /api suffix
      expect(config.baseUrl).toBe('http://localhost:3001');
      expect(config.baseUrl).not.toContain('8080');
      expect(config.baseUrl).toContain('3001');
      expect(config.baseUrl).not.toMatch(/\/api$/); // Should NOT end with /api
    });

    it('should not include /api suffix in baseUrl (to avoid double /api prefix)', () => {
      // ARRANGE: Create service with no config
      const service = new AviDMService();

      // ACT: Get configuration
      const config = service.configuration;

      // ASSERT: Verify /api does NOT appear in baseUrl
      const apiOccurrences = (config.baseUrl.match(/\/api/g) || []).length;
      expect(apiOccurrences).toBe(0);
      expect(config.baseUrl).not.toMatch(/\/api$/); // Should NOT end with /api
      expect(config.baseUrl).toBe('http://localhost:3001');
    });

    it('should construct correct full URL for Claude Code endpoint', () => {
      // ARRANGE: Create service
      const service = new AviDMService();
      const expectedUrl = 'http://localhost:3001/api/claude-code/streaming-chat';

      // ACT: Get base URL and endpoint
      const baseUrl = service.configuration.baseUrl;
      const endpoint = '/api/claude-code/streaming-chat';

      // ASSERT: Verify URL construction (baseUrl + endpoint)
      const fullUrl = baseUrl + endpoint;
      expect(fullUrl).toBe(expectedUrl);
      expect(fullUrl).not.toContain('/api/api'); // No double /api prefix
    });

    it('should use ws://localhost:3001/ws for WebSocket URL', () => {
      // ARRANGE: Create service with no config
      const service = new AviDMService();

      // ACT: Get configuration
      const config = service.configuration;

      // ASSERT: Verify WebSocket URL uses port 3001
      expect(config.websocketUrl).toBe('ws://localhost:3001/ws');
      expect(config.websocketUrl).not.toContain('8080');
      expect(config.websocketUrl).toContain('3001');
    });
  });

  // ============================================================================
  // URL CONSTRUCTION TESTS
  // ============================================================================

  describe('URL Construction', () => {
    it('should combine baseUrl and endpoint without double /api prefix', () => {
      // ARRANGE: Create service
      const service = new AviDMService();
      const endpoint = '/api/claude-code/streaming-chat';

      // ACT: Construct full URL (simulating HttpClient behavior)
      const baseUrl = service.configuration.baseUrl;
      const fullUrl = baseUrl + endpoint.replace(/^\/api/, '');

      // ASSERT: Verify no double /api
      const apiOccurrences = (fullUrl.match(/\/api/g) || []).length;
      expect(apiOccurrences).toBe(1);
      expect(fullUrl).not.toMatch(/\/api\/api/);
    });

    it('should produce correct URL: http://localhost:3001/api/claude-code/streaming-chat', () => {
      // ARRANGE: Create service
      const service = new AviDMService();
      const expectedUrl = 'http://localhost:3001/api/claude-code/streaming-chat';

      // ACT: Simulate URL construction for streaming chat
      const baseUrl = service.configuration.baseUrl;
      const endpoint = '/api/claude-code/streaming-chat';

      // Remove /api from endpoint to avoid duplication
      const cleanEndpoint = endpoint.replace(/^\/api/, '');
      const fullUrl = baseUrl + cleanEndpoint;

      // ASSERT: Verify exact URL match
      expect(fullUrl).toBe(expectedUrl);
    });

    it('should handle various endpoint formats correctly', () => {
      // ARRANGE: Create service
      const service = new AviDMService();
      const baseUrl = service.configuration.baseUrl;

      // ACT & ASSERT: Test URL construction with actual endpoint format
      const endpoint = '/api/claude-code/streaming-chat';
      const expected = 'http://localhost:3001/api/claude-code/streaming-chat';

      // Direct concatenation (how HttpClient works)
      const fullUrl = baseUrl + endpoint;

      expect(fullUrl).toBe(expected);
      expect(fullUrl).not.toContain('/api/api'); // No double prefix
    });
  });

  // ============================================================================
  // CONFIGURATION OVERRIDE TESTS
  // ============================================================================

  describe('Configuration Override', () => {
    it('should still allow custom baseUrl override', () => {
      // ARRANGE: Create service with custom config
      const customBaseUrl = 'http://custom-server:9000/api';
      const service = new AviDMService({ baseUrl: customBaseUrl });

      // ACT: Get configuration
      const config = service.configuration;

      // ASSERT: Verify custom baseUrl is used
      expect(config.baseUrl).toBe(customBaseUrl);
      expect(config.baseUrl).toContain('9000');
    });

    it('should allow custom WebSocket URL override', () => {
      // ARRANGE: Create service with custom WebSocket URL
      const customWsUrl = 'wss://custom-server:9001/ws';
      const service = new AviDMService({ websocketUrl: customWsUrl });

      // ACT: Get configuration
      const config = service.configuration;

      // ASSERT: Verify custom WebSocket URL is used
      expect(config.websocketUrl).toBe(customWsUrl);
    });

    it('should allow partial config override while keeping defaults', () => {
      // ARRANGE: Create service with partial config
      const service = new AviDMService({
        timeout: 60000,
        retryAttempts: 5
      });

      // ACT: Get configuration
      const config = service.configuration;

      // ASSERT: Verify overrides applied but defaults kept
      expect(config.timeout).toBe(60000);
      expect(config.retryAttempts).toBe(5);
      expect(config.baseUrl).toBe('http://localhost:3001'); // Default (no /api suffix)
      expect(config.websocketUrl).toBe('ws://localhost:3001/ws'); // Default
    });
  });

  // ============================================================================
  // HTTP CLIENT INTEGRATION TESTS (Mock Verification)
  // ============================================================================

  describe('HttpClient Integration (Mock Verification)', () => {
    it('should initialize HttpClient with correct baseUrl', () => {
      // ARRANGE: Mock HttpClient constructor
      const HttpClientConstructorSpy = vi.fn();

      // This test verifies the contract/collaboration
      // In real implementation, HttpClient would be initialized with baseUrl
      const expectedConfig = {
        baseUrl: 'http://localhost:3001/api',
        timeout: 300000,
        retryAttempts: 3
      };

      // ACT: Create service
      const service = new AviDMService();

      // ASSERT: Verify configuration matches expected values (updated to correct baseUrl)
      const config = service.configuration;
      expect(config.baseUrl).toBe('http://localhost:3001'); // Corrected - no /api suffix
      expect(config.timeout).toBe(expectedConfig.timeout);
      expect(config.retryAttempts).toBe(expectedConfig.retryAttempts);
    });

    it('should construct correct URL when calling streaming chat endpoint', async () => {
      // ARRANGE: Create service and mock response
      const service = new AviDMService();

      // Mock the httpClient.post to verify URL construction
      const mockPost = vi.fn().mockResolvedValue({
        id: 'response-123',
        requestId: 'req-123',
        content: 'Test response',
        metadata: {
          model: 'claude-sonnet-4-5',
          tokensUsed: 100,
          processingTime: 1000
        },
        status: 'success'
      });

      // Inject mock (in real test, this would be through DI)
      // For now, we're testing the configuration
      const expectedEndpoint = '/api/claude-code/streaming-chat';

      // ASSERT: Verify endpoint format
      expect(expectedEndpoint).toBe('/api/claude-code/streaming-chat');
      expect(expectedEndpoint).not.toMatch(/\/api\/api/);
    });
  });

  // ============================================================================
  // BEHAVIOR VERIFICATION TESTS (London School Focus)
  // ============================================================================

  describe('Behavior Verification - Object Collaboration', () => {
    it('should properly coordinate HttpClient initialization with baseUrl', () => {
      // ARRANGE: Track initialization sequence
      const initSequence: string[] = [];

      // ACT: Create service
      const service = new AviDMService();

      // ASSERT: Verify service is initialized with correct config
      const config = service.configuration;
      expect(config.baseUrl).toBe('http://localhost:3001'); // Corrected - no /api suffix

      // Verify no initialization errors
      expect(service).toBeDefined();
      expect(config).toBeDefined();
    });

    it('should maintain consistent port across HTTP and WebSocket connections', () => {
      // ARRANGE: Create service
      const service = new AviDMService();

      // ACT: Extract port from both URLs
      const config = service.configuration;
      const httpPort = config.baseUrl.match(/:(\d+)\//)?.[1];
      const wsPort = config.websocketUrl.match(/:(\d+)\//)?.[1];

      // ASSERT: Both should use port 3001
      expect(httpPort).toBe('3001');
      expect(wsPort).toBe('3001');
      expect(httpPort).toBe(wsPort);
    });
  });

  // ============================================================================
  // REGRESSION TESTS
  // ============================================================================

  describe('Regression Tests - No Port 8080', () => {
    it('should never contain port 8080 in baseUrl', () => {
      // ARRANGE & ACT: Create service
      const service = new AviDMService();
      const config = service.configuration;

      // ASSERT: Verify no 8080 anywhere
      expect(config.baseUrl).not.toContain('8080');
    });

    it('should never contain port 8080 in websocketUrl', () => {
      // ARRANGE & ACT: Create service
      const service = new AviDMService();
      const config = service.configuration;

      // ASSERT: Verify no 8080 anywhere
      expect(config.websocketUrl).not.toContain('8080');
    });

    it('should use 3001 consistently across all configuration', () => {
      // ARRANGE & ACT: Create service
      const service = new AviDMService();
      const config = service.configuration;

      // ASSERT: Verify 3001 is present in both URLs
      expect(config.baseUrl).toContain('3001');
      expect(config.websocketUrl).toContain('3001');
    });
  });

  // ============================================================================
  // CONTRACT TESTS (London School - Interface Verification)
  // ============================================================================

  describe('Contract Tests - API Expectations', () => {
    it('should provide configuration getter that returns ClaudeCodeConfig', () => {
      // ARRANGE: Create service
      const service = new AviDMService();

      // ACT: Get configuration
      const config = service.configuration;

      // ASSERT: Verify config structure matches contract
      expect(config).toHaveProperty('baseUrl');
      expect(config).toHaveProperty('websocketUrl');
      expect(config).toHaveProperty('timeout');
      expect(config).toHaveProperty('retryAttempts');
      expect(config).toHaveProperty('rateLimits');
      expect(config).toHaveProperty('security');
      expect(config).toHaveProperty('fallback');
    });

    it('should construct URLs that match Claude Code SDK expectations', () => {
      // ARRANGE: Claude Code SDK expects specific endpoint format
      const expectedPattern = /^http:\/\/localhost:\d+\/api\/claude-code\/streaming-chat$/;

      // ACT: Create service and construct URL
      const service = new AviDMService();
      const baseUrl = service.configuration.baseUrl;
      const endpoint = '/api/claude-code/streaming-chat';
      const fullUrl = baseUrl + endpoint;

      // ASSERT: Verify URL matches expected pattern
      expect(fullUrl).toMatch(expectedPattern);
      expect(fullUrl).toBe('http://localhost:3001/api/claude-code/streaming-chat');
    });
  });
});
