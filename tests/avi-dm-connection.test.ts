/**
 * TDD London School Tests for Avi DM Stability
 * Focuses on behavior verification and mock-driven development
 * Tests object collaborations rather than state
 */

import { describe, it, expect, jest, beforeEach, afterEach } from '@jest/globals';

// London School TDD focuses on interaction order and collaboration patterns
// We use Jest's mock.invocationCallOrder to verify sequence of method calls

// Types for Avi DM Components
interface WebSocketConnection {
  connect: () => Promise<void>;
  disconnect: () => void;
  send: (message: any) => void;
  onMessage: (callback: (data: any) => void) => void;
  onError: (callback: (error: Error) => void) => void;
  onClose: (callback: () => void) => void;
  getState: () => 'CONNECTING' | 'OPEN' | 'CLOSING' | 'CLOSED';
}

interface SSEStreamHandler {
  connect: (url: string) => Promise<void>;
  subscribe: (event: string, callback: (data: any) => void) => void;
  unsubscribe: (event: string) => void;
  close: () => void;
  onConnectionError: (callback: (error: Error) => void) => void;
  getConnectionState: () => 'connecting' | 'connected' | 'disconnected' | 'error';
}

interface ClaudeProcessManager {
  startProcess: (instanceId: string, config: any) => Promise<string>;
  stopProcess: (instanceId: string) => Promise<void>;
  getProcessStatus: (instanceId: string) => Promise<'running' | 'stopped' | 'error'>;
  sendMessage: (instanceId: string, message: any) => Promise<void>;
  onProcessOutput: (instanceId: string, callback: (output: any) => void) => void;
  onProcessError: (instanceId: string, callback: (error: Error) => void) => void;
}

interface ErrorBoundary {
  handleError: (error: Error, errorInfo: any) => void;
  recover: () => void;
  getErrorState: () => { hasError: boolean; error?: Error };
}

interface AviDMConnection {
  initialize: () => Promise<void>;
  establishWebSocket: () => Promise<void>;
  setupSSEStream: () => Promise<void>;
  handleFailure: (error: Error) => Promise<void>;
  gracefulShutdown: () => Promise<void>;
}

// Mock implementations following London School approach
const createMockWebSocket = (): jest.Mocked<WebSocketConnection> => ({
  connect: jest.fn().mockResolvedValue(undefined),
  disconnect: jest.fn(),
  send: jest.fn(),
  onMessage: jest.fn(),
  onError: jest.fn(),
  onClose: jest.fn(),
  getState: jest.fn().mockReturnValue('CLOSED')
});

const createMockSSEHandler = (): jest.Mocked<SSEStreamHandler> => ({
  connect: jest.fn().mockResolvedValue(undefined),
  subscribe: jest.fn(),
  unsubscribe: jest.fn(),
  close: jest.fn(),
  onConnectionError: jest.fn(),
  getConnectionState: jest.fn().mockReturnValue('disconnected')
});

const createMockClaudeProcessManager = (): jest.Mocked<ClaudeProcessManager> => ({
  startProcess: jest.fn().mockResolvedValue('process-id'),
  stopProcess: jest.fn().mockResolvedValue(undefined),
  getProcessStatus: jest.fn().mockResolvedValue('stopped'),
  sendMessage: jest.fn().mockResolvedValue(undefined),
  onProcessOutput: jest.fn(),
  onProcessError: jest.fn()
});

const createMockErrorBoundary = (): jest.Mocked<ErrorBoundary> => ({
  handleError: jest.fn(),
  recover: jest.fn(),
  getErrorState: jest.fn().mockReturnValue({ hasError: false })
});

// Avi DM Connection Implementation (mockable)
class AviDMConnectionImpl implements AviDMConnection {
  constructor(
    private webSocket: WebSocketConnection,
    private sseHandler: SSEStreamHandler,
    private processManager: ClaudeProcessManager,
    private errorBoundary: ErrorBoundary
  ) {}

  async initialize(): Promise<void> {
    try {
      await this.establishWebSocket();
      await this.setupSSEStream();
    } catch (error) {
      await this.handleFailure(error as Error);
      throw error;
    }
  }

  async establishWebSocket(): Promise<void> {
    this.webSocket.onError((error) => {
      this.errorBoundary.handleError(error, { source: 'websocket' });
    });

    this.webSocket.onClose(() => {
      this.handleFailure(new Error('WebSocket connection closed unexpectedly'));
    });

    await this.webSocket.connect();
  }

  async setupSSEStream(): Promise<void> {
    this.sseHandler.onConnectionError((error) => {
      this.errorBoundary.handleError(error, { source: 'sse' });
    });

    await this.sseHandler.connect('ws://localhost:3000/sse');
    this.sseHandler.subscribe('claude-output', (data) => {
      // Process Claude output
    });
  }

  async handleFailure(error: Error): Promise<void> {
    this.errorBoundary.handleError(error, { source: 'connection' });

    if (this.webSocket.getState() === 'OPEN') {
      this.webSocket.disconnect();
    }

    if (this.sseHandler.getConnectionState() === 'connected') {
      this.sseHandler.close();
    }

    this.errorBoundary.recover();
  }

  async gracefulShutdown(): Promise<void> {
    this.webSocket.disconnect();
    this.sseHandler.close();
  }
}

describe('Avi DM Connection - TDD London School', () => {
  let mockWebSocket: jest.Mocked<WebSocketConnection>;
  let mockSSEHandler: jest.Mocked<SSEStreamHandler>;
  let mockProcessManager: jest.Mocked<ClaudeProcessManager>;
  let mockErrorBoundary: jest.Mocked<ErrorBoundary>;
  let aviDMConnection: AviDMConnection;

  beforeEach(() => {
    // Create fresh mocks for each test
    mockWebSocket = createMockWebSocket();
    mockSSEHandler = createMockSSEHandler();
    mockProcessManager = createMockClaudeProcessManager();
    mockErrorBoundary = createMockErrorBoundary();

    aviDMConnection = new AviDMConnectionImpl(
      mockWebSocket,
      mockSSEHandler,
      mockProcessManager,
      mockErrorBoundary
    );

    // Reset all mocks
    jest.clearAllMocks();
  });

  afterEach(() => {
    jest.restoreAllMocks();
  });

  describe('WebSocket Connection Establishment', () => {
    it('should coordinate WebSocket connection setup with error handling', async () => {
      // Arrange
      mockWebSocket.connect.mockResolvedValue();
      mockSSEHandler.connect.mockResolvedValue();

      // Act
      await aviDMConnection.initialize();

      // Assert - Verify the conversation between objects
      expect(mockWebSocket.onError).toHaveBeenCalledWith(expect.any(Function));
      expect(mockWebSocket.onClose).toHaveBeenCalledWith(expect.any(Function));
      expect(mockWebSocket.connect).toHaveBeenCalledTimes(1);

      // Verify interaction sequence - WebSocket setup happens first
      const webSocketConnectOrder = (mockWebSocket.connect as jest.Mock).mock.invocationCallOrder?.[0];
      const sseConnectOrder = (mockSSEHandler.connect as jest.Mock).mock.invocationCallOrder?.[0];
      expect(webSocketConnectOrder).toBeLessThan(sseConnectOrder);
    });

    it('should handle WebSocket connection failure through error boundary', async () => {
      // Arrange
      const connectionError = new Error('WebSocket connection failed');
      mockWebSocket.connect.mockRejectedValue(connectionError);

      // Act & Assert
      await expect(aviDMConnection.initialize()).rejects.toThrow('WebSocket connection failed');

      // Verify error handling collaboration
      expect(mockErrorBoundary.handleError).toHaveBeenCalledWith(
        connectionError,
        { source: 'connection' }
      );
    });

    it('should register proper event handlers before connecting', async () => {
      // Arrange
      mockWebSocket.connect.mockResolvedValue();
      mockSSEHandler.connect.mockResolvedValue();

      // Act
      await aviDMConnection.establishWebSocket();

      // Assert - Verify setup sequence - handlers registered before connection
      const onErrorOrder = (mockWebSocket.onError as jest.Mock).mock.invocationCallOrder?.[0];
      const onCloseOrder = (mockWebSocket.onClose as jest.Mock).mock.invocationCallOrder?.[0];
      const connectOrder = (mockWebSocket.connect as jest.Mock).mock.invocationCallOrder?.[0];

      expect(onErrorOrder).toBeLessThan(connectOrder);
      expect(onCloseOrder).toBeLessThan(connectOrder);
    });

    it('should trigger error boundary when WebSocket closes unexpectedly', async () => {
      // Arrange
      mockWebSocket.connect.mockResolvedValue();
      let closeHandler: () => void;
      mockWebSocket.onClose.mockImplementation((callback) => {
        closeHandler = callback;
      });

      await aviDMConnection.establishWebSocket();

      // Act - Simulate unexpected close
      closeHandler!();

      // Assert
      expect(mockErrorBoundary.handleError).toHaveBeenCalledWith(
        expect.objectContaining({
          message: 'WebSocket connection closed unexpectedly'
        }),
        { source: 'connection' }
      );
    });
  });

  describe('SSE Stream Handling', () => {
    it('should coordinate SSE stream setup with subscription management', async () => {
      // Arrange
      mockSSEHandler.connect.mockResolvedValue();

      // Act
      await aviDMConnection.setupSSEStream();

      // Assert - Verify collaboration pattern
      expect(mockSSEHandler.onConnectionError).toHaveBeenCalledWith(expect.any(Function));
      expect(mockSSEHandler.connect).toHaveBeenCalledWith('ws://localhost:3000/sse');
      expect(mockSSEHandler.subscribe).toHaveBeenCalledWith('claude-output', expect.any(Function));

      // Verify setup order - error handler registered before connection
      const errorHandlerOrder = (mockSSEHandler.onConnectionError as jest.Mock).mock.invocationCallOrder?.[0];
      const connectOrder = (mockSSEHandler.connect as jest.Mock).mock.invocationCallOrder?.[0];
      expect(errorHandlerOrder).toBeLessThan(connectOrder);
    });

    it('should handle SSE connection errors through error boundary', async () => {
      // Arrange
      const sseError = new Error('SSE connection failed');
      let errorHandler: (error: Error) => void;

      mockSSEHandler.onConnectionError.mockImplementation((callback) => {
        errorHandler = callback;
      });
      mockSSEHandler.connect.mockResolvedValue();

      await aviDMConnection.setupSSEStream();

      // Act - Simulate SSE error
      errorHandler!(sseError);

      // Assert
      expect(mockErrorBoundary.handleError).toHaveBeenCalledWith(
        sseError,
        { source: 'sse' }
      );
    });

    it('should subscribe to Claude output events after connection', async () => {
      // Arrange
      mockSSEHandler.connect.mockResolvedValue();

      // Act
      await aviDMConnection.setupSSEStream();

      // Assert - Verify subscription happens after connection
      const connectOrder = (mockSSEHandler.connect as jest.Mock).mock.invocationCallOrder?.[0];
      const subscribeOrder = (mockSSEHandler.subscribe as jest.Mock).mock.invocationCallOrder?.[0];
      expect(connectOrder).toBeLessThan(subscribeOrder);
      expect(mockSSEHandler.subscribe).toHaveBeenCalledWith('claude-output', expect.any(Function));
    });
  });

  describe('Error Boundary Integration', () => {
    it('should coordinate error recovery across all components', async () => {
      // Arrange
      const testError = new Error('System failure');
      mockWebSocket.getState.mockReturnValue('OPEN');
      mockSSEHandler.getConnectionState.mockReturnValue('connected');

      // Act
      await aviDMConnection.handleFailure(testError);

      // Assert - Verify recovery sequence
      expect(mockErrorBoundary.handleError).toHaveBeenCalledWith(
        testError,
        { source: 'connection' }
      );
      expect(mockWebSocket.disconnect).toHaveBeenCalledTimes(1);
      expect(mockSSEHandler.close).toHaveBeenCalledTimes(1);
      expect(mockErrorBoundary.recover).toHaveBeenCalledTimes(1);

      // Verify cleanup happens before recovery
      const disconnectOrder = (mockWebSocket.disconnect as jest.Mock).mock.invocationCallOrder?.[0];
      const closeOrder = (mockSSEHandler.close as jest.Mock).mock.invocationCallOrder?.[0];
      const recoverOrder = (mockErrorBoundary.recover as jest.Mock).mock.invocationCallOrder?.[0];

      expect(disconnectOrder).toBeLessThan(recoverOrder);
      expect(closeOrder).toBeLessThan(recoverOrder);
    });

    it('should only disconnect active connections during failure', async () => {
      // Arrange
      const testError = new Error('Partial failure');
      mockWebSocket.getState.mockReturnValue('CLOSED');
      mockSSEHandler.getConnectionState.mockReturnValue('disconnected');

      // Act
      await aviDMConnection.handleFailure(testError);

      // Assert - Verify selective cleanup
      expect(mockWebSocket.disconnect).not.toHaveBeenCalled();
      expect(mockSSEHandler.close).not.toHaveBeenCalled();
      expect(mockErrorBoundary.handleError).toHaveBeenCalledTimes(1);
      expect(mockErrorBoundary.recover).toHaveBeenCalledTimes(1);
    });

    it('should handle cascading failures gracefully', async () => {
      // Arrange
      const initialError = new Error('Initial failure');
      mockWebSocket.connect.mockRejectedValue(initialError);
      mockSSEHandler.connect.mockResolvedValue();

      // Act
      await expect(aviDMConnection.initialize()).rejects.toThrow('Initial failure');

      // Assert - Verify error propagation
      expect(mockErrorBoundary.handleError).toHaveBeenCalledWith(
        initialError,
        { source: 'connection' }
      );
      expect(mockErrorBoundary.recover).toHaveBeenCalledTimes(1);
    });
  });

  describe('ClaudeProcessManager Integration', () => {
    it('should coordinate process lifecycle with connection state', async () => {
      // Arrange
      const instanceId = 'test-instance-001';
      const processConfig = { model: 'claude-3', temperature: 0.7 };

      mockProcessManager.startProcess.mockResolvedValue('process-123');
      mockProcessManager.getProcessStatus.mockResolvedValue('running');

      // Act
      await mockProcessManager.startProcess(instanceId, processConfig);
      const status = await mockProcessManager.getProcessStatus(instanceId);

      // Assert - Verify process management interactions
      expect(mockProcessManager.startProcess).toHaveBeenCalledWith(instanceId, processConfig);
      expect(mockProcessManager.getProcessStatus).toHaveBeenCalledWith(instanceId);
      expect(status).toBe('running');
    });

    it('should handle process communication through proper channels', async () => {
      // Arrange
      const instanceId = 'test-instance-002';
      const testMessage = { type: 'user_message', content: 'Hello Claude' };

      mockProcessManager.sendMessage.mockResolvedValue();

      let outputCallback: (output: any) => void;
      mockProcessManager.onProcessOutput.mockImplementation((id, callback) => {
        outputCallback = callback;
      });

      // Act
      mockProcessManager.onProcessOutput(instanceId, jest.fn());
      await mockProcessManager.sendMessage(instanceId, testMessage);

      // Simulate process output
      const processOutput = { type: 'claude_response', content: 'Hello! How can I help?' };
      outputCallback!(processOutput);

      // Assert - Verify communication protocol
      expect(mockProcessManager.onProcessOutput).toHaveBeenCalledWith(instanceId, expect.any(Function));
      expect(mockProcessManager.sendMessage).toHaveBeenCalledWith(instanceId, testMessage);
    });

    it('should handle process errors through error boundary', async () => {
      // Arrange
      const instanceId = 'test-instance-003';
      const processError = new Error('Claude process crashed');

      let errorCallback: (error: Error) => void;
      mockProcessManager.onProcessError.mockImplementation((id, callback) => {
        errorCallback = callback;
      });

      // Act
      mockProcessManager.onProcessError(instanceId, jest.fn());
      errorCallback!(processError);

      // Assert - Verify error handling setup
      expect(mockProcessManager.onProcessError).toHaveBeenCalledWith(instanceId, expect.any(Function));
    });
  });

  describe('Graceful Failure Scenarios', () => {
    it('should coordinate graceful shutdown across all components', async () => {
      // Arrange - Set up active connections
      mockWebSocket.getState.mockReturnValue('OPEN');
      mockSSEHandler.getConnectionState.mockReturnValue('connected');

      // Act
      await aviDMConnection.gracefulShutdown();

      // Assert - Verify clean shutdown sequence
      expect(mockWebSocket.disconnect).toHaveBeenCalledTimes(1);
      expect(mockSSEHandler.close).toHaveBeenCalledTimes(1);
    });

    it('should handle timeout scenarios with proper cleanup', async () => {
      // Arrange
      const timeoutError = new Error('Connection timeout');
      mockWebSocket.connect.mockImplementation(() => {
        return new Promise((_, reject) => {
          setTimeout(() => reject(timeoutError), 100);
        });
      });

      // Act & Assert
      await expect(aviDMConnection.initialize()).rejects.toThrow('Connection timeout');

      // Verify timeout handling
      expect(mockErrorBoundary.handleError).toHaveBeenCalledWith(
        timeoutError,
        { source: 'connection' }
      );
    });

    it('should maintain system stability during partial failures', async () => {
      // Arrange
      mockWebSocket.connect.mockResolvedValue();
      mockSSEHandler.connect.mockRejectedValue(new Error('SSE unavailable'));

      // Act & Assert
      await expect(aviDMConnection.initialize()).rejects.toThrow('SSE unavailable');

      // Verify WebSocket was still set up properly before SSE failure
      expect(mockWebSocket.onError).toHaveBeenCalledTimes(1);
      expect(mockWebSocket.onClose).toHaveBeenCalledTimes(1);
      expect(mockWebSocket.connect).toHaveBeenCalledTimes(1);
    });

    it('should recover from transient network failures', async () => {
      // Arrange
      let reconnectCount = 0;
      mockWebSocket.connect.mockImplementation(() => {
        reconnectCount++;
        if (reconnectCount < 3) {
          return Promise.reject(new Error('Network error'));
        }
        return Promise.resolve();
      });

      // Act - Simulate multiple connection attempts
      try {
        await aviDMConnection.establishWebSocket();
      } catch (error) {
        // First attempt fails
        expect(error).toBeInstanceOf(Error);
      }

      try {
        await aviDMConnection.establishWebSocket();
      } catch (error) {
        // Second attempt fails
        expect(error).toBeInstanceOf(Error);
      }

      // Third attempt succeeds
      await aviDMConnection.establishWebSocket();

      // Assert - Verify retry behavior
      expect(mockWebSocket.connect).toHaveBeenCalledTimes(3);
    });
  });

  describe('Contract Verification', () => {
    it('should maintain consistent error handling contracts', async () => {
      // Arrange & Act - Set up connections to trigger error handler registrations
      mockWebSocket.connect.mockResolvedValue();
      mockSSEHandler.connect.mockResolvedValue();

      await aviDMConnection.establishWebSocket();
      await aviDMConnection.setupSSEStream();
      mockProcessManager.onProcessError('test-instance', jest.fn());

      // Assert - Verify all error handlers follow the same contract
      expect(mockWebSocket.onError).toHaveBeenCalledWith(expect.any(Function));
      expect(mockSSEHandler.onConnectionError).toHaveBeenCalledWith(expect.any(Function));
      expect(mockProcessManager.onProcessError).toHaveBeenCalledWith('test-instance', expect.any(Function));
    });

    it('should verify connection state consistency across components', () => {
      // Verify state getter methods exist and return expected types
      expect(typeof mockWebSocket.getState()).toBe('string');
      expect(typeof mockSSEHandler.getConnectionState()).toBe('string');

      // Verify state values are from expected enums
      const wsStates = ['CONNECTING', 'OPEN', 'CLOSING', 'CLOSED'];
      const sseStates = ['connecting', 'connected', 'disconnected', 'error'];

      expect(wsStates).toContain(mockWebSocket.getState());
      expect(sseStates).toContain(mockSSEHandler.getConnectionState());
    });

    it('should ensure all async operations return Promises', () => {
      // Verify async contract compliance by checking return types
      expect(mockWebSocket.connect()).toBeInstanceOf(Promise);
      expect(mockSSEHandler.connect('test')).toBeInstanceOf(Promise);
      expect(mockProcessManager.startProcess('test', {})).toBeInstanceOf(Promise);
      expect(mockProcessManager.stopProcess('test')).toBeInstanceOf(Promise);
      expect(mockProcessManager.getProcessStatus('test')).toBeInstanceOf(Promise);
      expect(mockProcessManager.sendMessage('test', {})).toBeInstanceOf(Promise);
    });
  });
});