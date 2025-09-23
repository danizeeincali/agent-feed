/**
 * Mock implementation for AviDMService - London School TDD approach
 * Focuses on behavior verification and interaction testing
 */

import { AviDMService } from '../../services/AviDMService';
import {
  ClaudeResponse,
  ConversationMessage,
  ConnectionStatus,
  ClaudeCodeConfig,
  HealthCheckResponse,
  SystemStatus
} from '../../types/claude-integration';

// Mock event emitter for behavior verification
class MockEventEmitter {
  private listeners = new Map<string, Set<Function>>();
  
  on = jest.fn((event: string, callback: Function) => {
    if (!this.listeners.has(event)) {
      this.listeners.set(event, new Set());
    }
    this.listeners.get(event)!.add(callback);
  });
  
  off = jest.fn((event: string, callback: Function) => {
    const eventListeners = this.listeners.get(event);
    if (eventListeners) {
      eventListeners.delete(callback);
    }
  });
  
  emit = jest.fn((event: string, data?: any) => {
    const eventListeners = this.listeners.get(event);
    if (eventListeners) {
      eventListeners.forEach(callback => callback(data));
    }
  });
  
  // Test helpers
  getListenersFor(event: string): Function[] {
    return Array.from(this.listeners.get(event) || []);
  }
  
  hasListenerFor(event: string): boolean {
    return this.listeners.has(event) && this.listeners.get(event)!.size > 0;
  }
}

// Mock WebSocket Manager
class MockWebSocketManager {
  onConnect = jest.fn();
  onDisconnect = jest.fn();
  onMessage = jest.fn();
  onError = jest.fn();
  connect = jest.fn().mockResolvedValue(undefined);
  disconnect = jest.fn().mockResolvedValue(undefined);
  send = jest.fn();
  isConnected = jest.fn().mockReturnValue(true);
}

// Mock HTTP Client
class MockHttpClient {
  get = jest.fn();
  post = jest.fn();
  put = jest.fn();
  delete = jest.fn();
}

// Mock Context Manager
class MockContextManager {
  initializeContext = jest.fn().mockResolvedValue({
    projectPath: '/test/project',
    fileTree: [],
    currentBranch: 'main'
  });
  updateContext = jest.fn().mockResolvedValue(undefined);
  getProjectContext = jest.fn().mockResolvedValue({
    projectPath: '/test/project',
    fileTree: [],
    currentBranch: 'main'
  });
  serializeContext = jest.fn().mockResolvedValue(JSON.stringify({}));
  updateGitContext = jest.fn().mockResolvedValue(undefined);
  dispose = jest.fn();
}

// Mock Session Manager
class MockSessionManager {
  createSession = jest.fn().mockResolvedValue(undefined);
  saveSession = jest.fn().mockResolvedValue(undefined);
  endSession = jest.fn().mockResolvedValue(undefined);
  getMessages = jest.fn().mockResolvedValue([]);
  addMessage = jest.fn().mockResolvedValue(undefined);
  dispose = jest.fn();
}

// Mock Error Handler
class MockErrorHandler {
  handleError = jest.fn((error: any) => {
    if (error instanceof Error) {
      return {
        message: error.message,
        code: 'MOCK_ERROR',
        operation: 'mock_operation',
        timestamp: new Date().toISOString()
      };
    }
    return error;
  });
  enableOfflineMode = jest.fn().mockResolvedValue(undefined);
  generateFallbackResponse = jest.fn().mockResolvedValue({
    content: 'Fallback response',
    suggestions: []
  });
}

// Mock Security Manager
class MockSecurityManager {
  sanitizeContent = jest.fn((content: string) => content);
  checkRateLimit = jest.fn().mockResolvedValue(true);
  recordRequest = jest.fn();
}

/**
 * Mock AviDMService implementation for London School TDD
 * Focuses on verifying interactions and behavior rather than state
 */
export class MockAviDMService extends MockEventEmitter {
  // Mock dependencies - accessible for verification
  public mockHttpClient: MockHttpClient;
  public mockWebSocketManager: MockWebSocketManager;
  public mockContextManager: MockContextManager;
  public mockSessionManager: MockSessionManager;
  public mockErrorHandler: MockErrorHandler;
  public mockSecurityManager: MockSecurityManager;
  
  // Mock state
  private mockIsInitialized = false;
  private mockCurrentSessionId: string | null = null;
  private mockConnectionStatus: ConnectionStatus = {
    isConnected: false,
    connectionQuality: 'offline',
    reconnectAttempts: 0
  };
  
  // Mock methods with jest functions for behavior verification
  initialize = jest.fn(async (projectPath?: string) => {
    this.mockIsInitialized = true;
    this.mockConnectionStatus = {
      isConnected: true,
      connectionQuality: 'excellent',
      reconnectAttempts: 0
    };
    this.emit('initialized');
    return Promise.resolve();
  });
  
  sendMessage = jest.fn(async (message: string, options = {}) => {
    if (!this.mockIsInitialized) {
      throw new Error('Service not initialized');
    }
    
    const response: ClaudeResponse = {
      id: `mock-${Date.now()}`,
      requestId: `req-${Date.now()}`,
      content: `Mock response to: ${message}`,
      metadata: {
        model: 'mock-claude',
        tokensUsed: message.length,
        processingTime: 100
      },
      status: 'success'
    };
    
    this.emit('messageReceived', response);
    return response;
  });
  
  sendMessageStream = jest.fn(async (message: string, onChunk: (chunk: string) => void, options = {}) => {
    if (!this.mockConnectionStatus.isConnected) {
      throw new Error('WebSocket connection required for streaming');
    }
    
    // Simulate streaming chunks
    const chunks = ['Mock ', 'streaming ', 'response ', 'to: ', message];
    for (let i = 0; i < chunks.length; i++) {
      setTimeout(() => onChunk(chunks[i]), i * 100);
    }
    
    setTimeout(() => this.emit('streamComplete', `req-${Date.now()}`), chunks.length * 100);
  });
  
  createSession = jest.fn(async (projectId: string, projectPath?: string, preferences = {}) => {
    const sessionId = `session-${Date.now()}`;
    this.mockCurrentSessionId = sessionId;
    this.emit('sessionStarted', { sessionId, projectId });
    return sessionId;
  });
  
  endSession = jest.fn(async (sessionId?: string) => {
    const targetSessionId = sessionId || this.mockCurrentSessionId;
    if (targetSessionId) {
      this.mockCurrentSessionId = null;
      this.emit('sessionEnded', { sessionId: targetSessionId });
    }
  });
  
  getConversationHistory = jest.fn(async (sessionId?: string, limit?: number): Promise<ConversationMessage[]> => {
    return [
      {
        id: 'msg-1',
        sessionId: sessionId || this.mockCurrentSessionId || '',
        role: 'user',
        content: 'Hello',
        timestamp: new Date().toISOString(),
        metadata: { tokenCount: 5 }
      },
      {
        id: 'msg-2',
        sessionId: sessionId || this.mockCurrentSessionId || '',
        role: 'assistant',
        content: 'Hello! How can I help?',
        timestamp: new Date().toISOString(),
        metadata: { tokenCount: 15 }
      }
    ];
  });
  
  updateProjectContext = jest.fn(async (context: any) => {
    this.emit('contextUpdated', context);
  });
  
  injectFileContext = jest.fn(async (files: any[]) => {
    this.emit('fileContextInjected', files);
  });
  
  injectGitContext = jest.fn(async (gitInfo: any) => {
    this.emit('gitContextInjected', gitInfo);
  });
  
  checkConnection = jest.fn(async (): Promise<ConnectionStatus> => {
    return this.mockConnectionStatus;
  });
  
  reconnect = jest.fn(async () => {
    this.mockConnectionStatus = {
      isConnected: true,
      connectionQuality: 'excellent',
      reconnectAttempts: this.mockConnectionStatus.reconnectAttempts + 1
    };
    this.emit('reconnected');
  });
  
  healthCheck = jest.fn(async (): Promise<HealthCheckResponse> => {
    return {
      status: 'healthy',
      version: '1.0.0',
      uptime: 123456,
      timestamp: new Date().toISOString()
    };
  });
  
  getSystemStatus = jest.fn(async (): Promise<SystemStatus> => {
    return {
      status: 'operational',
      activeConnections: 1,
      memoryUsage: 50,
      cpuUsage: 25,
      timestamp: new Date().toISOString()
    };
  });
  
  dispose = jest.fn(async () => {
    this.mockIsInitialized = false;
    this.mockCurrentSessionId = null;
    this.mockConnectionStatus = {
      isConnected: false,
      connectionQuality: 'offline',
      reconnectAttempts: 0
    };
    this.emit('disposed');
  });
  
  // Getters for state verification
  get isConnected(): boolean {
    return this.mockConnectionStatus.isConnected;
  }
  
  get currentSession(): string | null {
    return this.mockCurrentSessionId;
  }
  
  get status(): ConnectionStatus {
    return { ...this.mockConnectionStatus };
  }
  
  get configuration(): ClaudeCodeConfig {
    return {
      baseUrl: 'http://localhost:8080/api',
      timeout: 30000,
      retryAttempts: 3,
      websocketUrl: 'ws://localhost:8080/ws',
      rateLimits: { messagesPerMinute: 30, tokensPerHour: 50000 },
      security: {
        enableAuth: false,
        allowedOrigins: ['localhost:5173'],
        sanitizeContent: true
      },
      fallback: {
        enableOfflineMode: true,
        cacheResponses: true,
        maxCacheSize: 100
      }
    };
  }
  
  constructor(config: Partial<ClaudeCodeConfig> = {}) {
    super();
    
    // Initialize mock dependencies
    this.mockHttpClient = new MockHttpClient();
    this.mockWebSocketManager = new MockWebSocketManager();
    this.mockContextManager = new MockContextManager();
    this.mockSessionManager = new MockSessionManager();
    this.mockErrorHandler = new MockErrorHandler();
    this.mockSecurityManager = new MockSecurityManager();
  }
  
  // Test utility methods for behavior verification
  __testUtils = {
    setInitialized: (initialized: boolean) => {
      this.mockIsInitialized = initialized;
    },
    
    setConnectionStatus: (status: Partial<ConnectionStatus>) => {
      this.mockConnectionStatus = { ...this.mockConnectionStatus, ...status };
    },
    
    setCurrentSession: (sessionId: string | null) => {
      this.mockCurrentSessionId = sessionId;
    },
    
    triggerWebSocketError: (error: any) => {
      this.emit('error', error);
    },
    
    triggerDisconnection: (reason: string) => {
      this.mockConnectionStatus.isConnected = false;
      this.emit('disconnected', { reason });
    },
    
    getCallCount: (method: string) => {
      return (this as any)[method].mock.calls.length;
    },
    
    getCallArgs: (method: string, callIndex = 0) => {
      return (this as any)[method].mock.calls[callIndex];
    },
    
    reset: () => {
      Object.keys(this).forEach(key => {
        const method = (this as any)[key];
        if (method && typeof method.mockClear === 'function') {
          method.mockClear();
        }
      });
      this.listeners.clear();
    }
  };
}

// Factory function for creating mock instances
export const createMockAviDMService = (config: Partial<ClaudeCodeConfig> = {}) => {
  return new MockAviDMService(config);
};

// Mock module for jest.mock() usage
export const mockAviDMServiceModule = {
  AviDMService: MockAviDMService,
  default: MockAviDMService
};
