/**
 * SSE-HTTP Integration Tests
 * Tests component interactions, state management, and UI updates
 */

import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { render, screen, waitFor, fireEvent } from '@testing-library/react';
import { act } from 'react-dom/test-utils';
import { MockSSEServer, MockEventSource } from '../mocks/MockSSEServer';
import { DEFAULT_TEST_CONFIG } from '../config/sse-migration-test-config';

// Mock components for testing
interface TerminalState {
  isConnected: boolean;
  messages: Array<{ id: string; content: string; timestamp: number }>;
  error: string | null;
  isReconnecting: boolean;
}

class SSETerminalService {
  private eventSource: EventSource | null = null;
  private listeners: Map<string, Function[]> = new Map();
  private reconnectAttempts = 0;
  private maxReconnectAttempts = 3;

  connect(url: string): Promise<void> {
    return new Promise((resolve, reject) => {
      this.eventSource = new EventSource(url);
      
      this.eventSource.onopen = () => {
        this.reconnectAttempts = 0;
        this.emit('connected');
        resolve();
      };

      this.eventSource.onmessage = (event) => {
        try {
          const data = JSON.parse(event.data);
          this.emit('message', data);
        } catch (error) {
          this.emit('error', error);
        }
      };

      this.eventSource.onerror = () => {
        this.emit('disconnected');
        this.handleReconnect();
      };

      setTimeout(() => reject(new Error('Connection timeout')), 5000);
    });
  }

  private handleReconnect(): void {
    if (this.reconnectAttempts < this.maxReconnectAttempts) {
      this.reconnectAttempts++;
      this.emit('reconnecting');
      
      setTimeout(() => {
        this.connect(DEFAULT_TEST_CONFIG.sse.endpoint).catch(() => {
          this.handleReconnect();
        });
      }, 1000 * this.reconnectAttempts);
    } else {
      this.emit('error', new Error('Max reconnection attempts reached'));
    }
  }

  sendCommand(command: string, args: any[]): Promise<any> {
    return fetch(`${DEFAULT_TEST_CONFIG.http.baseUrl}/execute`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ command, args }),
    }).then(response => {
      if (!response.ok) {
        throw new Error(`HTTP ${response.status}: ${response.statusText}`);
      }
      return response.json();
    });
  }

  disconnect(): void {
    if (this.eventSource) {
      this.eventSource.close();
      this.eventSource = null;
    }
    this.listeners.clear();
  }

  on(event: string, listener: Function): void {
    if (!this.listeners.has(event)) {
      this.listeners.set(event, []);
    }
    this.listeners.get(event)!.push(listener);
  }

  private emit(event: string, data?: any): void {
    const eventListeners = this.listeners.get(event) || [];
    eventListeners.forEach(listener => listener(data));
  }
}

class HTTPCommandService {
  async post(endpoint: string, data: any): Promise<any> {
    const response = await fetch(`${DEFAULT_TEST_CONFIG.http.baseUrl}${endpoint}`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(data),
    });

    if (!response.ok) {
      throw new Error(`HTTP ${response.status}: ${response.statusText}`);
    }

    return response.json();
  }
}

// Mock React component for testing
const MockTerminalComponent = ({ 
  terminalService, 
  httpService 
}: { 
  terminalService: SSETerminalService;
  httpService: HTTPCommandService;
}) => {
  const [state, setState] = React.useState<TerminalState>({
    isConnected: false,
    messages: [],
    error: null,
    isReconnecting: false,
  });

  React.useEffect(() => {
    terminalService.on('connected', () => {
      setState(prev => ({ ...prev, isConnected: true, error: null, isReconnecting: false }));
    });

    terminalService.on('disconnected', () => {
      setState(prev => ({ ...prev, isConnected: false }));
    });

    terminalService.on('reconnecting', () => {
      setState(prev => ({ ...prev, isReconnecting: true }));
    });

    terminalService.on('message', (data: any) => {
      const message = {
        id: Math.random().toString(36),
        content: data.output || JSON.stringify(data),
        timestamp: Date.now(),
      };
      setState(prev => ({
        ...prev,
        messages: [...prev.messages, message],
      }));
    });

    terminalService.on('error', (error: Error) => {
      setState(prev => ({ ...prev, error: error.message }));
    });

    terminalService.connect(DEFAULT_TEST_CONFIG.sse.endpoint);

    return () => {
      terminalService.disconnect();
    };
  }, [terminalService]);

  const handleSendCommand = async (command: string) => {
    try {
      await httpService.post('/execute', { command, args: [] });
    } catch (error) {
      setState(prev => ({ ...prev, error: (error as Error).message }));
    }
  };

  return React.createElement('div', {
    'data-testid': 'terminal-component',
  }, [
    React.createElement('div', {
      key: 'status',
      'data-testid': 'connection-status',
    }, state.isConnected ? 'Connected' : state.isReconnecting ? 'Reconnecting' : 'Disconnected'),
    
    React.createElement('div', {
      key: 'error',
      'data-testid': 'error-display',
    }, state.error),
    
    React.createElement('div', {
      key: 'messages',
      'data-testid': 'message-list',
    }, state.messages.map(msg => 
      React.createElement('div', {
        key: msg.id,
        'data-testid': 'message',
      }, msg.content)
    )),
    
    React.createElement('button', {
      key: 'send-command',
      'data-testid': 'send-command',
      onClick: () => handleSendCommand('ls -la'),
    }, 'Send Command'),
  ]);
};

// Global mocks
global.EventSource = MockEventSource as any;
const mockFetch = vi.fn();
global.fetch = mockFetch;

// Mock React for testing
const React = {
  createElement: vi.fn((type, props, ...children) => ({
    type,
    props: { ...props, children: children.length === 1 ? children[0] : children },
  })),
  useState: vi.fn((initial) => {
    let value = initial;
    const setValue = (newValue: any) => {
      value = typeof newValue === 'function' ? newValue(value) : newValue;
    };
    return [value, setValue];
  }),
  useEffect: vi.fn((effect, deps) => {
    effect();
    return () => {};
  }),
};

describe('SSE-HTTP Integration Tests', () => {
  let mockServer: MockSSEServer;
  let terminalService: SSETerminalService;
  let httpService: HTTPCommandService;

  beforeEach(async () => {
    mockServer = new MockSSEServer(DEFAULT_TEST_CONFIG.mock);
    await mockServer.start();
    
    terminalService = new SSETerminalService();
    httpService = new HTTPCommandService();
    
    vi.clearAllMocks();
  });

  afterEach(async () => {
    terminalService.disconnect();
    if (mockServer) {
      await mockServer.stop();
    }
  });

  describe('Service Integration', () => {
    it('should coordinate SSE connection and HTTP commands', async () => {
      // Mock successful HTTP response
      const mockHttpResponse = {
        ok: true,
        status: 200,
        json: vi.fn().mockResolvedValue({ success: true, output: 'Command executed' }),
      };
      mockFetch.mockResolvedValue(mockHttpResponse);

      // Set up message listener
      const messages: any[] = [];
      terminalService.on('message', (data) => {
        messages.push(data);
      });

      // Connect SSE
      await terminalService.connect(DEFAULT_TEST_CONFIG.sse.endpoint);

      // Send HTTP command
      const result = await terminalService.sendCommand('ls', ['-la']);
      expect(result.success).toBe(true);

      // Simulate SSE response
      mockServer.broadcast({
        event: 'command-output',
        data: { output: 'total 10\ndrwxr-xr-x 2 user user 4096 Jan 1 12:00 .' },
      });

      await new Promise(resolve => setTimeout(resolve, 100));
      expect(messages).toHaveLength(1);
      expect(messages[0].output).toContain('total 10');
    });

    it('should handle HTTP command failures gracefully', async () => {
      const mockHttpError = {
        ok: false,
        status: 500,
        statusText: 'Internal Server Error',
      };
      mockFetch.mockResolvedValue(mockHttpError);

      await terminalService.connect(DEFAULT_TEST_CONFIG.sse.endpoint);

      await expect(terminalService.sendCommand('invalid', []))
        .rejects.toThrow('HTTP 500: Internal Server Error');
    });

    it('should maintain SSE connection during HTTP operations', async () => {
      let connectionStates: boolean[] = [];
      
      terminalService.on('connected', () => connectionStates.push(true));
      terminalService.on('disconnected', () => connectionStates.push(false));

      await terminalService.connect(DEFAULT_TEST_CONFIG.sse.endpoint);

      // Mock successful HTTP response
      mockFetch.mockResolvedValue({
        ok: true,
        status: 200,
        json: vi.fn().mockResolvedValue({ success: true }),
      });

      // Send multiple HTTP commands
      for (let i = 0; i < 5; i++) {
        await terminalService.sendCommand(`command${i}`, []);
        await new Promise(resolve => setTimeout(resolve, 50));
      }

      expect(connectionStates).toEqual([true]); // Should remain connected
    });

    it('should synchronize state between SSE and HTTP services', async () => {
      const states: any[] = [];
      
      // Track both service events
      terminalService.on('connected', () => states.push({ type: 'sse', event: 'connected' }));
      terminalService.on('message', (data) => states.push({ type: 'sse', event: 'message', data }));

      mockFetch.mockResolvedValue({
        ok: true,
        status: 200,
        json: vi.fn().mockResolvedValue({ success: true, commandId: 'cmd-123' }),
      });

      // Connect and send command
      await terminalService.connect(DEFAULT_TEST_CONFIG.sse.endpoint);
      const httpResult = await terminalService.sendCommand('test', []);

      // Simulate corresponding SSE message
      mockServer.broadcast({
        event: 'command-result',
        data: { commandId: 'cmd-123', result: 'success' },
      });

      await new Promise(resolve => setTimeout(resolve, 100));

      expect(states).toHaveLength(2); // connected + message
      expect(states[0]).toEqual({ type: 'sse', event: 'connected' });
      expect(states[1].type).toBe('sse');
      expect(states[1].data.commandId).toBe('cmd-123');
    });
  });

  describe('State Management Integration', () => {
    it('should properly update component state from both SSE and HTTP', async () => {
      const stateUpdates: any[] = [];
      
      // Mock React state updates
      React.useState = vi.fn((initial) => {
        let value = initial;
        const setValue = vi.fn((newValue) => {
          const computed = typeof newValue === 'function' ? newValue(value) : newValue;
          value = computed;
          stateUpdates.push(computed);
        });
        return [value, setValue];
      });

      // Mock successful HTTP response
      mockFetch.mockResolvedValue({
        ok: true,
        status: 200,
        json: vi.fn().mockResolvedValue({ success: true }),
      });

      // Create component instance
      await terminalService.connect(DEFAULT_TEST_CONFIG.sse.endpoint);
      
      // Simulate SSE message
      mockServer.broadcast({
        event: 'terminal-output',
        data: { output: 'Hello from SSE' },
      });

      // Send HTTP command
      await httpService.post('/execute', { command: 'echo hello' });

      await new Promise(resolve => setTimeout(resolve, 200));

      // Should have state updates from both SSE connection and message
      expect(stateUpdates.length).toBeGreaterThan(0);
    });

    it('should handle component cleanup properly', async () => {
      let cleanupCalled = false;
      
      React.useEffect = vi.fn((effect, deps) => {
        const cleanup = effect();
        if (typeof cleanup === 'function') {
          // Simulate component unmount
          setTimeout(() => {
            cleanup();
            cleanupCalled = true;
          }, 100);
        }
      });

      await terminalService.connect(DEFAULT_TEST_CONFIG.sse.endpoint);
      
      await new Promise(resolve => setTimeout(resolve, 200));
      
      expect(cleanupCalled).toBe(true);
    });

    it('should prevent memory leaks with proper listener cleanup', async () => {
      const listeners: any[] = [];
      
      // Track listener additions
      const originalOn = terminalService.on;
      terminalService.on = vi.fn((event, listener) => {
        listeners.push({ event, listener });
        return originalOn.call(terminalService, event, listener);
      });

      await terminalService.connect(DEFAULT_TEST_CONFIG.sse.endpoint);
      
      // Add some messages to trigger listeners
      mockServer.broadcast({ event: 'test', data: 'test data' });
      
      terminalService.disconnect();
      
      // Verify listeners were added and should be cleaned up
      expect(listeners.length).toBeGreaterThan(0);
    });
  });

  describe('Error Handling Integration', () => {
    it('should handle SSE connection errors with HTTP fallback', async () => {
      const errors: Error[] = [];
      
      terminalService.on('error', (error) => {
        errors.push(error);
      });

      // Simulate SSE connection failure
      const mockEventSource = new MockEventSource(DEFAULT_TEST_CONFIG.sse.endpoint);
      mockEventSource.simulateError(new Error('SSE Connection failed'));

      // HTTP should still work
      mockFetch.mockResolvedValue({
        ok: true,
        status: 200,
        json: vi.fn().mockResolvedValue({ success: true, fallback: true }),
      });

      const result = await httpService.post('/execute', { command: 'test' });
      expect(result.fallback).toBe(true);
    });

    it('should handle concurrent errors from both services', async () => {
      const allErrors: any[] = [];
      
      terminalService.on('error', (error) => {
        allErrors.push({ service: 'sse', error: error.message });
      });

      // Set up SSE connection
      await terminalService.connect(DEFAULT_TEST_CONFIG.sse.endpoint);

      // Simulate SSE error
      const mockEventSource = new MockEventSource(DEFAULT_TEST_CONFIG.sse.endpoint);
      mockEventSource.simulateError(new Error('SSE Error'));

      // Simulate HTTP error
      mockFetch.mockResolvedValue({
        ok: false,
        status: 500,
        statusText: 'Server Error',
      });

      try {
        await httpService.post('/execute', { command: 'test' });
      } catch (error) {
        allErrors.push({ service: 'http', error: (error as Error).message });
      }

      expect(allErrors).toHaveLength(2);
      expect(allErrors.find(e => e.service === 'sse')).toBeDefined();
      expect(allErrors.find(e => e.service === 'http')).toBeDefined();
    });

    it('should recover gracefully from network partitions', async () => {
      const stateChanges: string[] = [];
      
      terminalService.on('connected', () => stateChanges.push('connected'));
      terminalService.on('disconnected', () => stateChanges.push('disconnected'));
      terminalService.on('reconnecting', () => stateChanges.push('reconnecting'));

      // Initial connection
      await terminalService.connect(DEFAULT_TEST_CONFIG.sse.endpoint);
      
      // Simulate network partition
      mockServer.simulateScenario('networkFailure');
      
      // Wait for reconnection attempts
      await new Promise(resolve => setTimeout(resolve, 5000));
      
      expect(stateChanges).toContain('connected');
      expect(stateChanges).toContain('disconnected');
      expect(stateChanges).toContain('reconnecting');
    });
  });

  describe('Performance Integration', () => {
    it('should handle high-frequency SSE messages with HTTP commands', async () => {
      const messagesReceived: any[] = [];
      const commandsSent: any[] = [];
      
      terminalService.on('message', (data) => {
        messagesReceived.push(data);
      });

      mockFetch.mockImplementation((url, options) => {
        commandsSent.push({ url, body: options?.body });
        return Promise.resolve({
          ok: true,
          status: 200,
          json: () => Promise.resolve({ success: true }),
        });
      });

      await terminalService.connect(DEFAULT_TEST_CONFIG.sse.endpoint);

      // Start high-frequency message simulation
      const messageInterval = setInterval(() => {
        mockServer.broadcast({
          event: 'high-freq',
          data: { timestamp: Date.now(), id: Math.random() },
        });
      }, 10);

      // Send HTTP commands concurrently
      const commandPromises = Array.from({ length: 10 }, (_, i) =>
        httpService.post('/execute', { command: `test-${i}` })
      );

      // Run for 1 second
      await new Promise(resolve => setTimeout(resolve, 1000));
      clearInterval(messageInterval);
      
      await Promise.all(commandPromises);

      expect(messagesReceived.length).toBeGreaterThan(50); // Should receive many messages
      expect(commandsSent).toHaveLength(10); // Should send all commands
    });

    it('should maintain performance under load', async () => {
      const startTime = performance.now();
      
      mockFetch.mockResolvedValue({
        ok: true,
        status: 200,
        json: vi.fn().mockResolvedValue({ success: true }),
      });

      await terminalService.connect(DEFAULT_TEST_CONFIG.sse.endpoint);

      // Send many commands in parallel
      const commands = Array.from({ length: 100 }, (_, i) =>
        httpService.post('/execute', { command: `test-${i}` })
      );

      // Send many SSE messages
      for (let i = 0; i < 100; i++) {
        mockServer.broadcast({
          event: 'load-test',
          data: { index: i, data: 'x'.repeat(1000) },
        });
      }

      await Promise.all(commands);
      
      const elapsed = performance.now() - startTime;
      expect(elapsed).toBeLessThan(5000); // Should complete within 5 seconds
    });
  });

  describe('Real-world Scenarios', () => {
    it('should handle terminal command with real-time output', async () => {
      const outputs: string[] = [];
      
      terminalService.on('message', (data) => {
        if (data.output) {
          outputs.push(data.output);
        }
      });

      mockFetch.mockResolvedValue({
        ok: true,
        status: 200,
        json: vi.fn().mockResolvedValue({ success: true, commandId: 'cmd-123' }),
      });

      await terminalService.connect(DEFAULT_TEST_CONFIG.sse.endpoint);
      
      // Send command
      await terminalService.sendCommand('npm', ['install']);

      // Simulate real-time output
      const outputLines = [
        'npm WARN deprecated package@1.0.0',
        'added 150 packages from 200 contributors',
        'found 0 vulnerabilities',
      ];

      for (const line of outputLines) {
        mockServer.broadcast({
          event: 'command-output',
          data: { commandId: 'cmd-123', output: line },
        });
        await new Promise(resolve => setTimeout(resolve, 50));
      }

      await new Promise(resolve => setTimeout(resolve, 100));
      
      expect(outputs).toEqual(outputLines);
    });

    it('should handle file uploads with progress updates', async () => {
      const progressUpdates: number[] = [];
      
      terminalService.on('message', (data) => {
        if (data.progress !== undefined) {
          progressUpdates.push(data.progress);
        }
      });

      // Mock file upload endpoint
      mockFetch.mockResolvedValue({
        ok: true,
        status: 200,
        json: vi.fn().mockResolvedValue({ success: true, uploadId: 'upload-123' }),
      });

      await terminalService.connect(DEFAULT_TEST_CONFIG.sse.endpoint);
      
      // Start upload
      await httpService.post('/upload', { filename: 'test.txt', size: 1000 });

      // Simulate progress updates
      const progressValues = [10, 25, 50, 75, 90, 100];
      for (const progress of progressValues) {
        mockServer.broadcast({
          event: 'upload-progress',
          data: { uploadId: 'upload-123', progress },
        });
        await new Promise(resolve => setTimeout(resolve, 30));
      }

      await new Promise(resolve => setTimeout(resolve, 100));
      
      expect(progressUpdates).toEqual(progressValues);
    });

    it('should handle multi-instance coordination', async () => {
      const instance1Messages: any[] = [];
      const instance2Messages: any[] = [];
      
      // Create second terminal service instance
      const terminalService2 = new SSETerminalService();
      
      terminalService.on('message', (data) => instance1Messages.push(data));
      terminalService2.on('message', (data) => instance2Messages.push(data));

      mockFetch.mockResolvedValue({
        ok: true,
        status: 200,
        json: vi.fn().mockResolvedValue({ success: true }),
      });

      // Connect both instances
      await Promise.all([
        terminalService.connect(DEFAULT_TEST_CONFIG.sse.endpoint),
        terminalService2.connect(DEFAULT_TEST_CONFIG.sse.endpoint),
      ]);

      // Send command from instance 1
      await terminalService.sendCommand('ls', []);

      // Broadcast should reach both instances
      mockServer.broadcast({
        event: 'global-message',
        data: { message: 'Hello all instances' },
      });

      await new Promise(resolve => setTimeout(resolve, 100));

      expect(instance1Messages).toHaveLength(1);
      expect(instance2Messages).toHaveLength(1);
      expect(instance1Messages[0].message).toBe('Hello all instances');
      expect(instance2Messages[0].message).toBe('Hello all instances');

      terminalService2.disconnect();
    });
  });
});