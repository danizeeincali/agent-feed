/**
 * London School Mock: WebSocket Implementation
 * 
 * Comprehensive mock for WebSocket that allows behavior verification
 * and interaction testing without real network connections
 */

import { jest } from '@jest/globals';

export interface WebSocketMockEvents {
  open: jest.Mock;
  message: jest.Mock;
  error: jest.Mock;
  close: jest.Mock;
}

export class WebSocketMock {
  public static readonly CONNECTING = 0;
  public static readonly OPEN = 1;
  public static readonly CLOSING = 2;
  public static readonly CLOSED = 3;

  public CONNECTING = WebSocketMock.CONNECTING;
  public OPEN = WebSocketMock.OPEN;
  public CLOSING = WebSocketMock.CLOSING;
  public CLOSED = WebSocketMock.CLOSED;

  public readyState: number = WebSocketMock.CONNECTING;
  public url: string;
  public protocol: string = '';
  public binaryType: BinaryType = 'blob';

  // Mock methods for behavior verification
  public send = jest.fn();
  public close = jest.fn();
  public addEventListener = jest.fn();
  public removeEventListener = jest.fn();
  public dispatchEvent = jest.fn();

  // Event handlers for direct assignment
  public onopen: ((event: Event) => void) | null = null;
  public onclose: ((event: CloseEvent) => void) | null = null;
  public onmessage: ((event: MessageEvent) => void) | null = null;
  public onerror: ((event: Event) => void) | null = null;

  // Internal event storage for testing
  private eventListeners: Map<string, Function[]> = new Map();

  constructor(url: string, protocols?: string | string[]) {
    this.url = url;
    
    // Mock addEventListener to store listeners for testing
    this.addEventListener.mockImplementation((event: string, listener: Function) => {
      if (!this.eventListeners.has(event)) {
        this.eventListeners.set(event, []);
      }
      this.eventListeners.get(event)!.push(listener);
    });

    // Mock removeEventListener
    this.removeEventListener.mockImplementation((event: string, listener: Function) => {
      const listeners = this.eventListeners.get(event);
      if (listeners) {
        const index = listeners.indexOf(listener);
        if (index > -1) {
          listeners.splice(index, 1);
        }
      }
    });

    // Mock close method
    this.close.mockImplementation((code?: number, reason?: string) => {
      this.readyState = WebSocketMock.CLOSING;
      setTimeout(() => {
        this.readyState = WebSocketMock.CLOSED;
        this.triggerEvent('close', { code: code || 1000, reason: reason || '' });
      }, 0);
    });

    // Mock send method with validation
    this.send.mockImplementation((data: any) => {
      if (this.readyState !== WebSocketMock.OPEN) {
        throw new Error('WebSocket is not open');
      }
      // In real implementation, this would send over network
      // For mock, we just verify the call was made
    });
  }

  // Helper methods for testing
  public simulateOpen(): void {
    this.readyState = WebSocketMock.OPEN;
    this.triggerEvent('open', {});
  }

  public simulateMessage(data: any): void {
    if (this.readyState === WebSocketMock.OPEN) {
      this.triggerEvent('message', { data });
    }
  }

  public simulateError(error?: any): void {
    this.triggerEvent('error', error || new Error('WebSocket error'));
  }

  public simulateClose(code: number = 1000, reason: string = ''): void {
    this.readyState = WebSocketMock.CLOSING;
    setTimeout(() => {
      this.readyState = WebSocketMock.CLOSED;
      this.triggerEvent('close', { code, reason });
    }, 0);
  }

  private triggerEvent(eventType: string, eventData: any): void {
    // Trigger addEventListener callbacks
    const listeners = this.eventListeners.get(eventType) || [];
    listeners.forEach(listener => {
      try {
        listener(eventData);
      } catch (error) {
        console.error(`Error in WebSocket ${eventType} listener:`, error);
      }
    });

    // Trigger direct event handlers
    switch (eventType) {
      case 'open':
        if (this.onopen) this.onopen(eventData);
        break;
      case 'message':
        if (this.onmessage) this.onmessage(eventData);
        break;
      case 'error':
        if (this.onerror) this.onerror(eventData);
        break;
      case 'close':
        if (this.onclose) this.onclose(eventData);
        break;
    }
  }

  // Testing utilities
  public getEventListeners(eventType: string): Function[] {
    return this.eventListeners.get(eventType) || [];
  }

  public hasEventListener(eventType: string): boolean {
    const listeners = this.eventListeners.get(eventType);
    return listeners !== undefined && listeners.length > 0;
  }

  public getCallHistory(method: 'send' | 'close' | 'addEventListener' | 'removeEventListener') {
    return (this[method] as jest.Mock).mock.calls;
  }

  public reset(): void {
    this.readyState = WebSocketMock.CONNECTING;
    this.eventListeners.clear();
    this.send.mockClear();
    this.close.mockClear();
    this.addEventListener.mockClear();
    this.removeEventListener.mockClear();
    this.dispatchEvent.mockClear();
    this.onopen = null;
    this.onclose = null;
    this.onmessage = null;
    this.onerror = null;
  }
}

// Factory function for creating WebSocket mocks in tests
export function createWebSocketMock(url?: string): WebSocketMock {
  return new WebSocketMock(url || 'ws://localhost:3001/terminal');
}

// Mock WebSocket constructor for global replacement
export function mockWebSocketConstructor(): jest.Mock {
  return jest.fn().mockImplementation((url: string, protocols?: string | string[]) => {
    return new WebSocketMock(url, protocols);
  });
}

// Helper for setting up WebSocket mocks in tests
export function setupWebSocketMock(): {
  WebSocketConstructor: jest.Mock;
  createMockInstance: (url?: string) => WebSocketMock;
} {
  const WebSocketConstructor = mockWebSocketConstructor();
  (global as any).WebSocket = WebSocketConstructor;
  
  return {
    WebSocketConstructor,
    createMockInstance: createWebSocketMock
  };
}

// Contract verification helpers
export function verifyWebSocketContract(mockInstance: WebSocketMock) {
  // Verify standard WebSocket interface compliance
  expect(mockInstance).toHaveProperty('readyState');
  expect(mockInstance).toHaveProperty('url');
  expect(mockInstance).toHaveProperty('send');
  expect(mockInstance).toHaveProperty('close');
  expect(mockInstance).toHaveProperty('addEventListener');
  expect(mockInstance).toHaveProperty('removeEventListener');
  
  // Verify constants
  expect(mockInstance.CONNECTING).toBe(0);
  expect(mockInstance.OPEN).toBe(1);
  expect(mockInstance.CLOSING).toBe(2);
  expect(mockInstance.CLOSED).toBe(3);
}