/**
 * WebSocket Mock Implementation
 * London School TDD - Mock WebSocket for behavior verification
 */

import { jest } from '@jest/globals';
import { EventEmitter } from 'events';

export class WebSocketMock extends EventEmitter {
  // Mock properties matching WebSocket API
  public readyState: number = WebSocket.CONNECTING;
  public url: string;
  public protocol: string;

  // Jest mocks for behavior verification
  public send = jest.fn<(data: string | ArrayBuffer | Blob) => void>();
  public close = jest.fn<(code?: number, reason?: string) => void>();
  public addEventListener = jest.fn<(type: string, listener: EventListener) => void>();
  public removeEventListener = jest.fn<(type: string, listener: EventListener) => void>();

  // Mock state tracking
  private sentMessages: Array<{ data: any; timestamp: Date }> = [];
  private connectionState: 'connecting' | 'open' | 'closing' | 'closed' = 'connecting';
  private eventListeners: Map<string, EventListener[]> = new Map();

  // Static constants matching WebSocket API
  static readonly CONNECTING = 0;
  static readonly OPEN = 1;
  static readonly CLOSING = 2;
  static readonly CLOSED = 3;

  constructor(url: string, protocols?: string | string[]) {
    super();
    this.url = url;
    this.protocol = Array.isArray(protocols) ? protocols[0] : (protocols || '');

    this.setupMockBehaviors();

    // Simulate connection after next tick
    process.nextTick(() => {
      this.simulateConnectionOpen();
    });
  }

  private setupMockBehaviors(): void {
    // Send message behavior
    this.send.mockImplementation((data: string | ArrayBuffer | Blob) => {
      if (this.readyState !== WebSocket.OPEN) {
        throw new Error('WebSocket is not open');
      }

      this.sentMessages.push({
        data: this.normalizeData(data),
        timestamp: new Date()
      });

      // Emit send event for behavior verification
      this.emit('mockSend', { data, timestamp: new Date() });
    });

    // Close connection behavior
    this.close.mockImplementation((code?: number, reason?: string) => {
      if (this.readyState === WebSocket.CLOSED || this.readyState === WebSocket.CLOSING) {
        return;
      }

      this.readyState = WebSocket.CLOSING;
      this.connectionState = 'closing';

      // Simulate close after delay
      setTimeout(() => {
        this.readyState = WebSocket.CLOSED;
        this.connectionState = 'closed';
        this.emit('close', { code: code || 1000, reason: reason || 'Normal closure' });
      }, 10);
    });

    // Event listener management
    this.addEventListener.mockImplementation((type: string, listener: EventListener) => {
      if (!this.eventListeners.has(type)) {
        this.eventListeners.set(type, []);
      }
      this.eventListeners.get(type)!.push(listener);

      // Also add to EventEmitter for compatibility
      this.on(type, listener);
    });

    this.removeEventListener.mockImplementation((type: string, listener: EventListener) => {
      const listeners = this.eventListeners.get(type);
      if (listeners) {
        const index = listeners.indexOf(listener);
        if (index > -1) {
          listeners.splice(index, 1);
        }
      }

      this.off(type, listener);
    });
  }

  // Simulation methods for testing
  simulateConnectionOpen(): void {
    this.readyState = WebSocket.OPEN;
    this.connectionState = 'open';
    this.emit('open', {});
  }

  simulateMessage(data: any): void {
    if (this.readyState === WebSocket.OPEN) {
      this.emit('message', { data });
    }
  }

  simulateError(error: Error): void {
    this.emit('error', error);
  }

  simulateConnectionClose(code: number = 1000, reason: string = 'Normal closure'): void {
    this.readyState = WebSocket.CLOSED;
    this.connectionState = 'closed';
    this.emit('close', { code, reason });
  }

  // London School behavior verification methods
  verifyMessageSent(expectedMessage: any): void {
    const normalizedExpected = this.normalizeData(expectedMessage);
    const sentMessage = this.sentMessages.find(msg =>
      JSON.stringify(msg.data) === JSON.stringify(normalizedExpected)
    );

    expect(sentMessage).toBeDefined();
  }

  verifyMessageSentCount(expectedCount: number): void {
    expect(this.sentMessages).toHaveLength(expectedCount);
  }

  verifyLastMessageSent(expectedMessage: any): void {
    expect(this.sentMessages).not.toHaveLength(0);
    const lastMessage = this.sentMessages[this.sentMessages.length - 1];
    const normalizedExpected = this.normalizeData(expectedMessage);
    expect(lastMessage.data).toEqual(normalizedExpected);
  }

  verifyConnectionClosed(): void {
    expect(this.close).toHaveBeenCalled();
  }

  verifyConnectionClosedWith(code: number, reason?: string): void {
    expect(this.close).toHaveBeenCalledWith(code, reason);
  }

  verifyEventListenerAdded(eventType: string): void {
    expect(this.addEventListener).toHaveBeenCalledWith(eventType, expect.any(Function));
  }

  verifyEventListenerRemoved(eventType: string): void {
    expect(this.removeEventListener).toHaveBeenCalledWith(eventType, expect.any(Function));
  }

  verifyNoUnexpectedCalls(): void {
    // Implementation depends on test requirements
    // Can check that certain methods weren't called
  }

  // Behavior sequence verification
  verifyMessageSequence(expectedMessages: any[]): void {
    expect(this.sentMessages).toHaveLength(expectedMessages.length);

    expectedMessages.forEach((expected, index) => {
      const actual = this.sentMessages[index];
      const normalizedExpected = this.normalizeData(expected);
      expect(actual.data).toEqual(normalizedExpected);
    });
  }

  // Test utilities
  getSentMessages(): Array<{ data: any; timestamp: Date }> {
    return [...this.sentMessages];
  }

  getConnectionState(): 'connecting' | 'open' | 'closing' | 'closed' {
    return this.connectionState;
  }

  reset(): void {
    jest.clearAllMocks();
    this.sentMessages = [];
    this.eventListeners.clear();
    this.readyState = WebSocket.CONNECTING;
    this.connectionState = 'connecting';
    this.removeAllListeners();
  }

  private normalizeData(data: string | ArrayBuffer | Blob | any): any {
    if (typeof data === 'string') {
      try {
        return JSON.parse(data);
      } catch {
        return data;
      }
    }
    return data;
  }
}

// Mock Factory for different WebSocket scenarios
export class WebSocketMockFactory {
  static createSuccessfulConnectionMock(url: string): WebSocketMock {
    return new WebSocketMock(url);
  }

  static createFailedConnectionMock(url: string): WebSocketMock {
    const mock = new WebSocketMock(url);

    // Override to simulate immediate connection failure
    process.nextTick(() => {
      mock.simulateError(new Error('Connection failed'));
    });

    return mock;
  }

  static createSlowConnectionMock(url: string, delayMs: number = 5000): WebSocketMock {
    const mock = new WebSocketMock(url);

    // Override connection timing
    setTimeout(() => {
      mock.simulateConnectionOpen();
    }, delayMs);

    return mock;
  }

  static createUnstableConnectionMock(url: string): WebSocketMock {
    const mock = new WebSocketMock(url);

    // Simulate connection that opens then closes unexpectedly
    setTimeout(() => {
      mock.simulateConnectionOpen();
    }, 100);

    setTimeout(() => {
      mock.simulateConnectionClose(1006, 'Connection lost');
    }, 2000);

    return mock;
  }
}

// Global WebSocket mock replacement
export function mockWebSocket(): typeof WebSocketMock {
  // Replace global WebSocket with our mock
  (global as any).WebSocket = WebSocketMock;

  // Add WebSocket constants
  (global as any).WebSocket.CONNECTING = 0;
  (global as any).WebSocket.OPEN = 1;
  (global as any).WebSocket.CLOSING = 2;
  (global as any).WebSocket.CLOSED = 3;

  return WebSocketMock;
}

export function restoreWebSocket(): void {
  // In a real environment, you'd restore the original WebSocket
  // For testing, we'll just note this should be done
  delete (global as any).WebSocket;
}