/**
 * SSEClaudeInstanceManager Tests
 * 
 * Comprehensive unit tests for the SSE-based Claude instance manager
 */

import { SSEClaudeInstanceManager, SSEConnectionState } from '../SSEClaudeInstanceManager';

// Mock EventSource
class MockEventSource {
  public onopen: ((event: Event) => void) | null = null;
  public onmessage: ((event: MessageEvent) => void) | null = null;
  public onerror: ((event: Event) => void) | null = null;
  public readyState: number = EventSource.CONNECTING;

  constructor(public url: string, public init?: EventSourceInit) {}

  close() {
    this.readyState = EventSource.CLOSED;
  }
}

// Mock fetch
global.fetch = jest.fn();
(global as any).EventSource = MockEventSource;

describe('SSEClaudeInstanceManager', () => {
  let manager: SSEClaudeInstanceManager;
  let mockEventSource: MockEventSource;

  beforeEach(() => {
    manager = new SSEClaudeInstanceManager({
      apiBaseUrl: 'http://test',
      sseEndpoint: '/api/claude/instances/{instanceId}/terminal/stream',
      inputEndpoint: '/api/claude/instances/{instanceId}/terminal/input',
      maxReconnectAttempts: 3,
      reconnectDelay: 1000,
      bufferSize: 100,
      heartbeatInterval: 30000,
      connectionTimeout: 10000,
      commandTimeout: 30000
    });

    // Reset mocks
    jest.clearAllMocks();
    (fetch as jest.Mock).mockClear();
  });

  afterEach(async () => {
    await manager.cleanup();
  });

  describe('Connection Management', () => {
    test('should initialize in disconnected state', () => {
      const state = manager.getConnectionState();
      expect(state.state).toBe(SSEConnectionState.DISCONNECTED);
      expect(state.instanceId).toBeNull();
    });

    test('should connect to instance successfully', async () => {
      const connectPromise = manager.connect('test-instance');
      
      // Simulate EventSource creation and connection
      const eventSources = (global as any).EventSource.mock.instances;
      mockEventSource = eventSources[eventSources.length - 1];
      
      // Trigger connection open
      mockEventSource.readyState = EventSource.OPEN;
      if (mockEventSource.onopen) {
        mockEventSource.onopen(new Event('open'));
      }

      await connectPromise;

      const state = manager.getConnectionState();
      expect(state.state).toBe(SSEConnectionState.CONNECTED);
      expect(state.instanceId).toBe('test-instance');
    });

    test('should handle connection timeout', async () => {
      jest.useFakeTimers();

      const connectPromise = manager.connect('test-instance');
      
      // Fast-forward past connection timeout
      jest.advanceTimersByTime(11000);

      await expect(connectPromise).rejects.toThrow();

      jest.useRealTimers();
    });

    test('should disconnect cleanly', async () => {
      // First connect
      await manager.connect('test-instance');
      const eventSources = (global as any).EventSource.mock.instances;
      mockEventSource = eventSources[eventSources.length - 1];
      
      if (mockEventSource.onopen) {
        mockEventSource.onopen(new Event('open'));
      }

      // Then disconnect
      await manager.disconnect();

      const state = manager.getConnectionState();
      expect(state.state).toBe(SSEConnectionState.DISCONNECTED);
      expect(state.instanceId).toBeNull();
    });
  });

  describe('Message Handling', () => {
    beforeEach(async () => {
      await manager.connect('test-instance');
      const eventSources = (global as any).EventSource.mock.instances;
      mockEventSource = eventSources[eventSources.length - 1];
      
      if (mockEventSource.onopen) {
        mockEventSource.onopen(new Event('open'));
      }
    });

    test('should handle terminal output messages', () => {
      const outputHandler = jest.fn();
      manager.on('terminalOutput', outputHandler);

      const messageData = {
        type: 'output',
        data: 'Hello World',
        isReal: true
      };

      if (mockEventSource.onmessage) {
        mockEventSource.onmessage(new MessageEvent('message', {
          data: JSON.stringify(messageData)
        }));
      }

      expect(outputHandler).toHaveBeenCalledWith(
        expect.objectContaining({
          content: 'Hello World',
          isReal: true
        })
      );
    });

    test('should handle error messages', () => {
      const errorHandler = jest.fn();
      manager.on('terminalError', errorHandler);

      const messageData = {
        type: 'error',
        error: 'Test error'
      };

      if (mockEventSource.onmessage) {
        mockEventSource.onmessage(new MessageEvent('message', {
          data: JSON.stringify(messageData)
        }));
      }

      expect(errorHandler).toHaveBeenCalledWith(
        expect.objectContaining({
          error: 'Test error'
        })
      );
    });

    test('should ignore non-real output messages', () => {
      const outputHandler = jest.fn();
      manager.on('terminalOutput', outputHandler);

      const messageData = {
        type: 'output',
        data: 'Fake output',
        isReal: false
      };

      if (mockEventSource.onmessage) {
        mockEventSource.onmessage(new MessageEvent('message', {
          data: JSON.stringify(messageData)
        }));
      }

      expect(outputHandler).not.toHaveBeenCalled();
    });
  });

  describe('Command Sending', () => {
    beforeEach(async () => {
      await manager.connect('test-instance');
      const eventSources = (global as any).EventSource.mock.instances;
      mockEventSource = eventSources[eventSources.length - 1];
      
      if (mockEventSource.onopen) {
        mockEventSource.onopen(new Event('open'));
      }
    });

    test('should send input successfully', async () => {
      (fetch as jest.Mock).mockResolvedValue({
        ok: true,
        json: () => Promise.resolve({ success: true })
      });

      const result = await manager.sendInput('test command');

      expect(fetch).toHaveBeenCalledWith(
        'http://test/api/claude/instances/test-instance/terminal/input',
        expect.objectContaining({
          method: 'POST',
          body: expect.stringContaining('test command\\n')
        })
      );
      expect(result.success).toBe(true);
    });

    test('should handle command timeout', async () => {
      jest.useFakeTimers();

      (fetch as jest.Mock).mockImplementation(() => 
        new Promise(resolve => setTimeout(resolve, 35000))
      );

      const commandPromise = manager.sendInput('test command');
      
      jest.advanceTimersByTime(31000);

      const result = await commandPromise;
      expect(result.success).toBe(false);
      expect(result.error).toContain('aborted');

      jest.useRealTimers();
    });

    test('should fail when not connected', async () => {
      await manager.disconnect();

      await expect(manager.sendInput('test')).rejects.toThrow('Not connected');
    });
  });

  describe('Message History', () => {
    beforeEach(async () => {
      await manager.connect('test-instance');
      const eventSources = (global as any).EventSource.mock.instances;
      mockEventSource = eventSources[eventSources.length - 1];
      
      if (mockEventSource.onopen) {
        mockEventSource.onopen(new Event('open'));
      }
    });

    test('should store message history', () => {
      const messageData = {
        type: 'output',
        data: 'Test output',
        isReal: true
      };

      if (mockEventSource.onmessage) {
        mockEventSource.onmessage(new MessageEvent('message', {
          data: JSON.stringify(messageData)
        }));
      }

      const history = manager.getMessageHistory();
      expect(history).toHaveLength(1);
      expect(history[0].content).toBe('Test output');
    });

    test('should limit history size', () => {
      // Send more messages than buffer size
      for (let i = 0; i < 150; i++) {
        const messageData = {
          type: 'output',
          data: `Message ${i}`,
          isReal: true
        };

        if (mockEventSource.onmessage) {
          mockEventSource.onmessage(new MessageEvent('message', {
            data: JSON.stringify(messageData)
          }));
        }
      }

      const history = manager.getMessageHistory();
      expect(history.length).toBeLessThanOrEqual(100); // Buffer size
    });

    test('should clear history', () => {
      const messageData = {
        type: 'output',
        data: 'Test output',
        isReal: true
      };

      if (mockEventSource.onmessage) {
        mockEventSource.onmessage(new MessageEvent('message', {
          data: JSON.stringify(messageData)
        }));
      }

      expect(manager.getMessageHistory()).toHaveLength(1);
      
      manager.clearHistory();
      
      expect(manager.getMessageHistory()).toHaveLength(0);
    });
  });

  describe('Reconnection Logic', () => {
    test('should attempt reconnection on connection loss', async () => {
      jest.useFakeTimers();

      await manager.connect('test-instance');
      const eventSources = (global as any).EventSource.mock.instances;
      mockEventSource = eventSources[eventSources.length - 1];
      
      if (mockEventSource.onopen) {
        mockEventSource.onopen(new Event('open'));
      }

      // Simulate connection loss
      mockEventSource.readyState = EventSource.CLOSED;
      if (mockEventSource.onerror) {
        mockEventSource.onerror(new Event('error'));
      }

      // Should be in reconnecting state
      expect(manager.getConnectionState().state).toBe(SSEConnectionState.RECONNECTING);

      jest.useRealTimers();
    });

    test('should respect max reconnection attempts', async () => {
      jest.useFakeTimers();

      await manager.connect('test-instance');
      const eventSources = (global as any).EventSource.mock.instances;
      mockEventSource = eventSources[eventSources.length - 1];
      
      if (mockEventSource.onopen) {
        mockEventSource.onopen(new Event('open'));
      }

      // Simulate multiple connection failures
      for (let i = 0; i < 5; i++) {
        mockEventSource.readyState = EventSource.CLOSED;
        if (mockEventSource.onerror) {
          mockEventSource.onerror(new Event('error'));
        }
        jest.advanceTimersByTime(2000);
      }

      // Should eventually give up
      expect(manager.getConnectionState().state).toBe(SSEConnectionState.ERROR);

      jest.useRealTimers();
    });
  });

  describe('Statistics', () => {
    test('should provide connection statistics', () => {
      const stats = manager.getStatistics();
      
      expect(stats).toHaveProperty('connectionState');
      expect(stats).toHaveProperty('messageCount');
      expect(stats).toHaveProperty('bufferUtilization');
    });
  });
});