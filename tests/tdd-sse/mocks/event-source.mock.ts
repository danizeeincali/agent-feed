/**
 * Enhanced EventSource Mock for TDD London School Testing
 * 
 * Provides comprehensive mocking capabilities for SSE testing:
 * - Connection state management
 * - Event simulation and verification
 * - Instance tracking for deduplication tests
 * - Error simulation for recovery testing
 */

export class MockEventSource implements EventSource {
  public readonly url: string;
  public readyState: number;
  public onopen: ((this: EventSource, ev: Event) => any) | null = null;
  public onmessage: ((this: EventSource, ev: MessageEvent) => any) | null = null;
  public onerror: ((this: EventSource, ev: Event) => any) | null = null;
  
  private listeners: Map<string, EventListener[]> = new Map();
  private isClosed: boolean = false;
  private connectionDelay: number = 0;
  
  // Static tracking for test verification
  static instances: MockEventSource[] = [];
  static connectionCount: number = 0;
  static lastCreated: MockEventSource | null = null;

  constructor(url: string, eventSourceInitDict?: EventSourceInit) {
    this.url = url;
    this.readyState = MockEventSource.CONNECTING;
    
    // Track instance creation
    MockEventSource.instances.push(this);
    MockEventSource.connectionCount++;
    MockEventSource.lastCreated = this;
    
    // Simulate async connection
    setTimeout(() => {
      if (!this.isClosed) {
        this.readyState = MockEventSource.OPEN;
        this.dispatchEvent(new Event('open'));
        if (this.onopen) {
          this.onopen.call(this, new Event('open'));
        }
      }
    }, this.connectionDelay);
  }

  addEventListener(type: string, listener: EventListener): void {
    if (!this.listeners.has(type)) {
      this.listeners.set(type, []);
    }
    
    const typeListeners = this.listeners.get(type)!;
    if (!typeListeners.includes(listener)) {
      typeListeners.push(listener);
    }
  }

  removeEventListener(type: string, listener: EventListener): void {
    const typeListeners = this.listeners.get(type);
    if (typeListeners) {
      const index = typeListeners.indexOf(listener);
      if (index > -1) {
        typeListeners.splice(index, 1);
      }
    }
  }

  dispatchEvent(event: Event): boolean {
    const typeListeners = this.listeners.get(event.type) || [];
    typeListeners.forEach(listener => {
      try {
        listener(event);
      } catch (error) {
        console.error('Error in event listener:', error);
      }
    });
    
    // Also call direct handlers
    if (event.type === 'message' && this.onmessage && event instanceof MessageEvent) {
      this.onmessage.call(this, event);
    } else if (event.type === 'error' && this.onerror) {
      this.onerror.call(this, event);
    } else if (event.type === 'open' && this.onopen) {
      this.onopen.call(this, event);
    }
    
    return true;
  }

  close(): void {
    if (!this.isClosed) {
      this.isClosed = true;
      this.readyState = MockEventSource.CLOSED;
      this.listeners.clear();
    }
  }

  // Test helper methods
  public setConnectionDelay(delay: number): void {
    this.connectionDelay = delay;
  }

  public getListenerCount(type: string): number {
    return this.listeners.get(type)?.length || 0;
  }

  public hasListener(type: string, listener: EventListener): boolean {
    return this.listeners.get(type)?.includes(listener) || false;
  }

  public simulateMessage(data: any, eventType: string = 'message', id?: string): void {
    if (this.readyState === MockEventSource.OPEN && !this.isClosed) {
      const messageEvent = new MessageEvent(eventType, {
        data: typeof data === 'string' ? data : JSON.stringify(data),
        lastEventId: id,
        origin: new URL(this.url).origin
      });
      this.dispatchEvent(messageEvent);
    }
  }

  public simulateError(error: string | Error = 'Connection error'): void {
    const errorEvent = new ErrorEvent('error', {
      message: error instanceof Error ? error.message : error,
      error: error instanceof Error ? error : new Error(error)
    });
    this.dispatchEvent(errorEvent);
  }

  public simulateClose(): void {
    this.close();
  }

  public simulateOpen(): void {
    if (!this.isClosed) {
      this.readyState = MockEventSource.OPEN;
      const openEvent = new Event('open');
      this.dispatchEvent(openEvent);
      if (this.onopen) {
        this.onopen.call(this, openEvent);
      }
    }
  }

  public simulateReconnect(): void {
    this.readyState = MockEventSource.CONNECTING;
    setTimeout(() => {
      this.simulateOpen();
    }, 100);
  }

  public simulatePartialData(data: string): void {
    if (this.readyState === MockEventSource.OPEN && !this.isClosed) {
      const partialEvent = new MessageEvent('message', {
        data: data,
        origin: new URL(this.url).origin
      });
      this.dispatchEvent(partialEvent);
    }
  }

  // Static constants (matching real EventSource)
  static readonly CONNECTING = 0;
  static readonly OPEN = 1;
  static readonly CLOSED = 2;

  // Static test utilities
  static reset(): void {
    MockEventSource.instances = [];
    MockEventSource.connectionCount = 0;
    MockEventSource.lastCreated = null;
  }

  static getAllInstances(): MockEventSource[] {
    return [...MockEventSource.instances];
  }

  static getActiveConnections(): MockEventSource[] {
    return MockEventSource.instances.filter(instance => !instance.isClosed);
  }

  static getConnectionCount(): number {
    return MockEventSource.connectionCount;
  }

  static findByUrl(url: string): MockEventSource | undefined {
    return MockEventSource.instances.find(instance => instance.url === url);
  }

  static simulateMessageToAll(data: any, eventType: string = 'message'): void {
    MockEventSource.getActiveConnections().forEach(instance => {
      instance.simulateMessage(data, eventType);
    });
  }

  static simulateErrorToAll(error: string | Error = 'Global connection error'): void {
    MockEventSource.getActiveConnections().forEach(instance => {
      instance.simulateError(error);
    });
  }

  static closeAllConnections(): void {
    MockEventSource.instances.forEach(instance => {
      instance.close();
    });
  }

  static getConnectionsByState(state: number): MockEventSource[] {
    return MockEventSource.instances.filter(instance => instance.readyState === state);
  }

  static hasLiveConnections(): boolean {
    return MockEventSource.getActiveConnections().length > 0;
  }

  static getListenerCounts(): Map<string, number> {
    const counts = new Map<string, number>();
    
    MockEventSource.instances.forEach(instance => {
      instance.listeners.forEach((listeners, type) => {
        counts.set(type, (counts.get(type) || 0) + listeners.length);
      });
    });
    
    return counts;
  }

  // Advanced test scenarios
  static createSlowConnection(url: string, delay: number): MockEventSource {
    const instance = new MockEventSource(url);
    instance.setConnectionDelay(delay);
    return instance;
  }

  static createFailingConnection(url: string, errorAfter: number = 100): MockEventSource {
    const instance = new MockEventSource(url);
    
    setTimeout(() => {
      instance.simulateError('Connection failed during test');
    }, errorAfter);
    
    return instance;
  }

  static createPartialConnection(url: string): MockEventSource {
    const instance = new MockEventSource(url);
    
    // Override readyState to simulate partial connection
    Object.defineProperty(instance, 'readyState', {
      value: MockEventSource.CONNECTING,
      writable: false
    });
    
    return instance;
  }
}

// Helper functions for test scenarios
export function createMockSSEResponse(data: any, type: string = 'message'): string {
  return `data: ${JSON.stringify(data)}\n\n`;
}

export function createMockClaudeResponse(content: string, messageType: 'response' | 'error' | 'welcome' = 'response'): string {
  const response = {
    content,
    type: messageType,
    timestamp: Date.now(),
    id: Math.random().toString(36).substr(2, 9)
  };
  
  return createMockSSEResponse(response);
}

export function createMockStreamChunk(chunk: string, isComplete: boolean = false): string {
  if (isComplete) {
    return `data: ${JSON.stringify({ chunk, complete: true })}\n\n`;
  } else {
    return `data: ${JSON.stringify({ chunk, complete: false })}\n\n`;
  }
}

// Test assertion helpers
export function expectSingleConnection(url: string): void {
  const connections = MockEventSource.findByUrl(url);
  expect(MockEventSource.getActiveConnections().filter(c => c.url === url)).toHaveLength(1);
}

export function expectNoActiveConnections(): void {
  expect(MockEventSource.getActiveConnections()).toHaveLength(0);
}

export function expectConnectionCount(expected: number): void {
  expect(MockEventSource.getConnectionCount()).toBe(expected);
}

export function expectListenerCount(type: string, expected: number): void {
  const counts = MockEventSource.getListenerCounts();
  expect(counts.get(type) || 0).toBe(expected);
}