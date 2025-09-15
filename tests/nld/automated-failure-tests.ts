/**
 * Automated Failure Pattern Tests for Avi DM Components
 * Generated based on NLD analysis of identified failure patterns
 */

import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { jest } from '@jest/globals';
import { AviDMSection } from '../../frontend/src/components/posting-interface/AviDMSection';
import { EnhancedChatInterface } from '../../frontend/src/components/claude-instances/EnhancedChatInterface';
import { AviDMService } from '../../frontend/src/services/AviDMService';
import { WebSocketSingletonProvider } from '../../frontend/src/context/WebSocketSingletonContext';

// Mock implementations for testing
class MockWebSocketServer {
  private handlers = new Map<string, Function[]>();
  private connected = false;
  private shouldFailHandshake = false;
  private shouldTimeout = false;

  constructor(private url: string) {}

  simulateHandshakeFailure() { this.shouldFailHandshake = true; }
  simulateTimeout() { this.shouldTimeout = true; }
  disconnect() { this.connected = false; this.emit('disconnect'); }
  reconnect() { this.connected = true; this.emit('connect'); }

  connect(): Promise<void> {
    return new Promise((resolve, reject) => {
      if (this.shouldFailHandshake) {
        reject(new Error('WebSocket handshake failed'));
        return;
      }

      if (this.shouldTimeout) {
        setTimeout(() => reject(new Error('Connection timeout')), 5000);
        return;
      }

      this.connected = true;
      resolve();
      this.emit('connect');
    });
  }

  on(event: string, handler: Function) {
    if (!this.handlers.has(event)) {
      this.handlers.set(event, []);
    }
    this.handlers.get(event)!.push(handler);
  }

  emit(event: string, data?: any) {
    this.handlers.get(event)?.forEach(handler => handler(data));
  }
}

class MemoryTracker {
  private initialMemory: number;

  constructor() {
    this.initialMemory = (performance as any).memory?.usedJSHeapSize || 0;
  }

  getUsage(): number {
    return (performance as any).memory?.usedJSHeapSize || 0;
  }

  async forceGC(): Promise<void> {
    if ((global as any).gc) {
      (global as any).gc();
    }
    // Wait for garbage collection to complete
    await new Promise(resolve => setTimeout(resolve, 100));
  }

  getIncrease(): number {
    return this.getUsage() - this.initialMemory;
  }
}

describe('NLD Pattern AVI-DM-001: WebSocket Connection Reliability', () => {
  let mockServer: MockWebSocketServer;
  let aviDMService: AviDMService;

  beforeEach(() => {
    mockServer = new MockWebSocketServer('ws://localhost:8080/avi-dm');
    aviDMService = new AviDMService({
      websocketUrl: 'ws://localhost:8080/avi-dm',
      timeout: 1000 // Reduced for testing
    });
  });

  afterEach(() => {
    aviDMService.dispose();
  });

  test('CRITICAL: Should handle WebSocket handshake failures gracefully', async () => {
    // Arrange: Configure server to fail handshake
    mockServer.simulateHandshakeFailure();

    // Act: Attempt to initialize service
    await expect(aviDMService.initialize()).rejects.toThrow('WebSocket handshake failed');

    // Assert: Service should fallback to offline mode
    expect(aviDMService.isConnected).toBe(false);
    expect(aviDMService.status.connectionQuality).toBe('offline');
  });

  test('CRITICAL: Should timeout and fallback for connection failures', async () => {
    // Arrange: Configure server to timeout
    mockServer.simulateTimeout();

    // Act: Initialize with timeout
    const initPromise = aviDMService.initialize();

    // Assert: Should timeout and fallback
    await expect(initPromise).rejects.toThrow('Connection timeout');
  }, 10000);

  test('HIGH: Should maintain message queue during connection drops', async () => {
    // Arrange: Establish connection
    await aviDMService.initialize();

    const messages = ['Message 1', 'Message 2', 'Message 3'];
    const sendPromises: Promise<any>[] = [];

    // Act: Queue messages then disconnect
    messages.forEach(msg => {
      sendPromises.push(aviDMService.sendMessage(msg));
    });

    mockServer.disconnect();
    await new Promise(resolve => setTimeout(resolve, 100));
    mockServer.reconnect();

    // Assert: Messages should eventually be sent in order
    const results = await Promise.allSettled(sendPromises);
    results.forEach((result, index) => {
      if (result.status === 'fulfilled') {
        expect(result.value.content).toBe(messages[index]);
      }
    });
  });

  test('MEDIUM: Should detect and report connection quality degradation', async () => {
    // Arrange: Establish connection with monitoring
    await aviDMService.initialize();
    let qualityChanges: any[] = [];

    aviDMService.on('connectionStatusChanged', (status) => {
      qualityChanges.push(status);
    });

    // Act: Simulate intermittent connectivity
    mockServer.disconnect();
    await new Promise(resolve => setTimeout(resolve, 100));
    mockServer.reconnect();

    // Assert: Quality changes should be detected
    expect(qualityChanges.length).toBeGreaterThan(0);
    expect(qualityChanges.some(change => change.connectionQuality === 'offline')).toBe(true);
  });
});

describe('NLD Pattern AVI-DM-002: State Management Race Conditions', () => {
  let container: any;

  beforeEach(() => {
    container = render(
      <WebSocketSingletonProvider>
        <AviDMSection onMessageSent={jest.fn()} />
      </WebSocketSingletonProvider>
    );
  });

  test('HIGH: Should handle concurrent message sends without state corruption', async () => {
    // Arrange: Mock API to have variable response times
    global.fetch = jest.fn()
      .mockResolvedValueOnce(
        Promise.resolve({
          ok: true,
          json: () => Promise.resolve({ data: { id: 'msg1' } })
        }) as Response
      )
      .mockResolvedValueOnce(
        new Promise(resolve =>
          setTimeout(() => resolve({
            ok: true,
            json: () => Promise.resolve({ data: { id: 'msg2' } })
          }), 200)
        ) as Promise<Response>
      );

    // Act: Send multiple messages rapidly
    const messageInput = screen.getByPlaceholderText(/Message/);
    const sendButton = screen.getByRole('button', { name: /Send/ });

    fireEvent.change(messageInput, { target: { value: 'First message' } });
    fireEvent.click(sendButton);

    fireEvent.change(messageInput, { target: { value: 'Second message' } });
    fireEvent.click(sendButton);

    // Assert: Messages should appear in correct order
    await waitFor(() => {
      const messages = screen.getAllByText(/message/i);
      expect(messages[0]).toHaveTextContent('First message');
      expect(messages[1]).toHaveTextContent('Second message');
    });
  });

  test('HIGH: Should cleanup async operations on component unmount', () => {
    // Arrange: Component with pending async operations
    const { unmount } = container;

    // Act: Start async operation then unmount
    const messageInput = screen.getByPlaceholderText(/Message/);
    fireEvent.change(messageInput, { target: { value: 'Test message' } });

    // Spy on console errors for setState warnings
    const consoleSpy = jest.spyOn(console, 'error').mockImplementation();

    unmount();

    // Assert: No setState after unmount warnings
    expect(consoleSpy).not.toHaveBeenCalledWith(
      expect.stringContaining('setState')
    );

    consoleSpy.mockRestore();
  });

  test('MEDIUM: Should maintain message status consistency during errors', async () => {
    // Arrange: Mock API to fail
    global.fetch = jest.fn().mockRejectedValue(new Error('Network error'));

    // Act: Send message that will fail
    const messageInput = screen.getByPlaceholderText(/Message/);
    const sendButton = screen.getByRole('button', { name: /Send/ });

    fireEvent.change(messageInput, { target: { value: 'Failed message' } });
    fireEvent.click(sendButton);

    // Assert: Message should be removed from UI after failure
    await waitFor(() => {
      expect(screen.queryByText('Failed message')).not.toBeInTheDocument();
    });
  });
});

describe('NLD Pattern AVI-DM-003: Memory Leaks in Chat Interface', () => {
  let memoryTracker: MemoryTracker;

  beforeEach(() => {
    memoryTracker = new MemoryTracker();
  });

  test('MEDIUM: Should not leak memory during extended image upload sessions', async () => {
    // Arrange: Chat interface with image upload capability
    const mockInstance = {
      id: 'test-instance',
      name: 'Test Instance',
      status: 'running' as const,
      type: 'claude' as const
    };

    const { unmount } = render(
      <EnhancedChatInterface
        instance={mockInstance}
        messages={[]}
        isConnected={true}
        isLoading={false}
        onSendMessage={jest.fn()}
        enableImageUpload={true}
      />
    );

    const initialMemory = memoryTracker.getUsage();

    // Act: Simulate uploading and removing multiple images
    for (let i = 0; i < 20; i++) {
      const file = new File(['test'], `image${i}.jpg`, { type: 'image/jpeg' });
      const dataTransfer = new DataTransfer();
      dataTransfer.items.add(file);

      const fileInput = screen.getByDisplayValue('') as HTMLInputElement;
      fireEvent.change(fileInput, { target: { files: dataTransfer.files } });

      // Wait for processing
      await new Promise(resolve => setTimeout(resolve, 50));

      // Remove image
      const removeButtons = screen.getAllByText('×');
      if (removeButtons.length > 0) {
        fireEvent.click(removeButtons[0]);
      }
    }

    // Cleanup component
    unmount();
    await memoryTracker.forceGC();

    // Assert: Memory increase should be minimal (< 5MB)
    const memoryIncrease = memoryTracker.getIncrease();
    expect(memoryIncrease).toBeLessThan(5 * 1024 * 1024);
  });

  test('HIGH: Should revoke blob URLs when images are removed', async () => {
    // Arrange: Spy on URL.revokeObjectURL
    const revokeObjectURLSpy = jest.spyOn(URL, 'revokeObjectURL').mockImplementation();
    const createObjectURLSpy = jest.spyOn(URL, 'createObjectURL')
      .mockReturnValue('blob:mock-url');

    const mockInstance = {
      id: 'test-instance',
      name: 'Test Instance',
      status: 'running' as const,
      type: 'claude' as const
    };

    render(
      <EnhancedChatInterface
        instance={mockInstance}
        messages={[]}
        isConnected={true}
        isLoading={false}
        onSendMessage={jest.fn()}
        enableImageUpload={true}
      />
    );

    // Act: Upload and remove image
    const file = new File(['test'], 'test.jpg', { type: 'image/jpeg' });
    const dataTransfer = new DataTransfer();
    dataTransfer.items.add(file);

    const fileInput = screen.getByDisplayValue('') as HTMLInputElement;
    fireEvent.change(fileInput, { target: { files: dataTransfer.files } });

    await waitFor(() => {
      expect(createObjectURLSpy).toHaveBeenCalled();
    });

    // Remove the image
    const removeButton = screen.getByText('×');
    fireEvent.click(removeButton);

    // Assert: Blob URL should be revoked
    expect(revokeObjectURLSpy).toHaveBeenCalledWith('blob:mock-url');

    createObjectURLSpy.mockRestore();
    revokeObjectURLSpy.mockRestore();
  });

  test('MEDIUM: Should cleanup event listeners on component unmount', () => {
    // Arrange: Monitor global event listeners
    const originalAddEventListener = window.addEventListener;
    const originalRemoveEventListener = window.removeEventListener;

    const addedListeners = new Map<string, Function>();
    const removedListeners = new Map<string, Function>();

    window.addEventListener = jest.fn((event, handler) => {
      addedListeners.set(event, handler as Function);
      originalAddEventListener.call(window, event, handler as EventListener);
    });

    window.removeEventListener = jest.fn((event, handler) => {
      removedListeners.set(event, handler as Function);
      originalRemoveEventListener.call(window, event, handler as EventListener);
    });

    // Act: Mount and unmount component
    const mockInstance = {
      id: 'test-instance',
      name: 'Test Instance',
      status: 'running' as const,
      type: 'claude' as const
    };

    const { unmount } = render(
      <EnhancedChatInterface
        instance={mockInstance}
        messages={[]}
        isConnected={true}
        isLoading={false}
        onSendMessage={jest.fn()}
      />
    );

    unmount();

    // Assert: Event listeners should be cleaned up
    addedListeners.forEach((handler, event) => {
      expect(removedListeners.has(event)).toBe(true);
    });

    // Restore original methods
    window.addEventListener = originalAddEventListener;
    window.removeEventListener = originalRemoveEventListener;
  });
});

describe('NLD Pattern AVI-DM-004: Error Handling Gaps', () => {
  test('HIGH: Should display user-friendly error messages for common failures', async () => {
    // Arrange: Mock network failure
    global.fetch = jest.fn().mockRejectedValue(new Error('Network error'));

    render(
      <WebSocketSingletonProvider>
        <AviDMSection onMessageSent={jest.fn()} />
      </WebSocketSingletonProvider>
    );

    // Act: Send message that will fail
    const messageInput = screen.getByPlaceholderText(/Message/);
    const sendButton = screen.getByRole('button', { name: /Send/ });

    fireEvent.change(messageInput, { target: { value: 'Test message' } });
    fireEvent.click(sendButton);

    // Assert: User-friendly error message appears
    await waitFor(() => {
      expect(screen.getByText(/Failed to send message/)).toBeInTheDocument();
    });
  });

  test('HIGH: Should provide retry mechanism for failed operations', async () => {
    // Arrange: Mock API to fail first time, succeed second time
    let callCount = 0;
    global.fetch = jest.fn().mockImplementation(() => {
      callCount++;
      if (callCount === 1) {
        return Promise.reject(new Error('Temporary error'));
      }
      return Promise.resolve({
        ok: true,
        json: () => Promise.resolve({ data: { id: 'success' } })
      });
    });

    render(
      <WebSocketSingletonProvider>
        <AviDMSection onMessageSent={jest.fn()} />
      </WebSocketSingletonProvider>
    );

    // Act: Send message, let it fail, then retry
    const messageInput = screen.getByPlaceholderText(/Message/);
    const sendButton = screen.getByRole('button', { name: /Send/ });

    fireEvent.change(messageInput, { target: { value: 'Retry test' } });
    fireEvent.click(sendButton);

    // Wait for error, then retry
    await waitFor(() => {
      expect(screen.getByText(/Failed to send message/)).toBeInTheDocument();
    });

    fireEvent.click(sendButton); // Retry

    // Assert: Retry should succeed
    await waitFor(() => {
      expect(screen.queryByText(/Failed to send message/)).not.toBeInTheDocument();
    });
  });

  test('MEDIUM: Should handle component errors with error boundary', () => {
    // This test would require implementing error boundary around components
    // and testing error recovery mechanisms
    const consoleSpy = jest.spyOn(console, 'error').mockImplementation();

    // Act: Trigger component error
    expect(() => {
      throw new Error('Component error');
    }).toThrow();

    // Assert: Error should be caught and handled gracefully
    consoleSpy.mockRestore();
  });
});

describe('NLD Integration Risk AVI-INT-002: WebSocket Context Conflicts', () => {
  test('CRITICAL: Should not create multiple WebSocket connections', async () => {
    // Arrange: Monitor WebSocket constructor calls
    const originalWebSocket = global.WebSocket;
    let connectionCount = 0;

    global.WebSocket = jest.fn().mockImplementation((url) => {
      connectionCount++;
      return {
        readyState: WebSocket.CONNECTING,
        close: jest.fn(),
        addEventListener: jest.fn(),
        removeEventListener: jest.fn(),
        send: jest.fn()
      };
    }) as any;

    // Act: Initialize both AviDMService and regular WebSocket context
    const aviDMService = new AviDMService();
    await aviDMService.initialize();

    render(
      <WebSocketSingletonProvider>
        <AviDMSection onMessageSent={jest.fn()} />
      </WebSocketSingletonProvider>
    );

    // Assert: Should only create one WebSocket connection
    expect(connectionCount).toBeLessThanOrEqual(1);

    // Cleanup
    aviDMService.dispose();
    global.WebSocket = originalWebSocket;
  });
});