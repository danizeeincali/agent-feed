/**
 * EventSource Mock for SSE Testing - London School TDD Approach
 * Provides comprehensive mocking capabilities for Server-Sent Events
 */

import { jest } from '@jest/globals';

export interface MockEventSourceConfig {
  url: string;
  readyState: number;
  withCredentials: boolean;
  autoConnect?: boolean;
  initialDelay?: number;
  reconnectDelay?: number;
  maxReconnectAttempts?: number;
}

export interface SSEEvent {
  type: string;
  data: any;
  id?: string;
  retry?: number;
  origin?: string;
  lastEventId?: string;
}

export class MockEventSource extends EventTarget implements EventSource {
  public url: string;
  public readyState: number = EventSource.CONNECTING;
  public withCredentials: boolean = false;
  public CONNECTING = 0 as const;
  public OPEN = 1 as const;
  public CLOSED = 2 as const;

  // London School - Mock Collaborators
  private mockConfig: MockEventSourceConfig;
  private eventQueue: SSEEvent[] = [];
  private listeners: Map<string, Set<EventListenerOrEventListenerObject>> = new Map();
  private timeouts: NodeJS.Timeout[] = [];
  private reconnectAttempts: number = 0;

  // Jest Mock Functions for Behavior Verification
  public onOpenMock = jest.fn<() => void>();
  public onErrorMock = jest.fn<(event: Event) => void>();
  public onMessageMock = jest.fn<(event: MessageEvent) => void>();
  public addEventListenerMock = jest.fn<(type: string, listener: EventListenerOrEventListenerObject) => void>();
  public removeEventListenerMock = jest.fn<(type: string, listener: EventListenerOrEventListenerObject) => void>();
  public closeMock = jest.fn<() => void>();

  // Event Handler Properties (EventSource interface compliance)
  public onopen: ((this: EventSource, ev: Event) => any) | null = null;
  public onerror: ((this: EventSource, ev: Event) => any) | null = null;
  public onmessage: ((this: EventSource, ev: MessageEvent) => any) | null = null;

  constructor(url: string, eventSourceInitDict?: EventSourceInit) {
    super();
    this.url = url;
    this.withCredentials = eventSourceInitDict?.withCredentials || false;
    
    this.mockConfig = {
      url,
      readyState: this.readyState,
      withCredentials: this.withCredentials,
      autoConnect: true,
      initialDelay: 100,
      reconnectDelay: 1000,
      maxReconnectAttempts: 3
    };

    if (this.mockConfig.autoConnect) {
      this.scheduleConnect();
    }
  }

  // London School - Mock Contract Verification
  public getInteractionHistory() {
    return {
      onOpen: this.onOpenMock.mock.calls,
      onError: this.onErrorMock.mock.calls,
      onMessage: this.onMessageMock.mock.calls,
      addEventListener: this.addEventListenerMock.mock.calls,
      removeEventListener: this.removeEventListenerMock.mock.calls,
      close: this.closeMock.mock.calls
    };
  }

  // EventSource Interface Implementation
  public addEventListener(type: string, listener: EventListenerOrEventListenerObject): void {
    this.addEventListenerMock(type, listener);
    
    if (!this.listeners.has(type)) {
      this.listeners.set(type, new Set());
    }
    this.listeners.get(type)!.add(listener);
    super.addEventListener(type, listener);
  }

  public removeEventListener(type: string, listener: EventListenerOrEventListenerObject): void {
    this.removeEventListenerMock(type, listener);
    
    const eventListeners = this.listeners.get(type);
    if (eventListeners) {
      eventListeners.delete(listener);
    }
    super.removeEventListener(type, listener);
  }

  public close(): void {
    this.closeMock();
    this.readyState = this.CLOSED;
    this.clearTimeouts();
  }

  // Mock Control Methods - London School Test Coordination
  public mockConnect(): void {
    if (this.readyState === this.OPEN) return;
    
    this.readyState = this.OPEN;
    this.reconnectAttempts = 0;
    
    const openEvent = new Event('open');
    this.triggerEvent(openEvent);
    
    if (this.onopen) {
      this.onopen.call(this, openEvent);
      this.onOpenMock();
    }
  }

  public mockDisconnect(error?: boolean): void {
    const prevState = this.readyState;
    this.readyState = this.CLOSED;
    
    if (error) {
      const errorEvent = new Event('error');
      this.triggerEvent(errorEvent);
      
      if (this.onerror) {
        this.onerror.call(this, errorEvent);
        this.onErrorMock(errorEvent);
      }
      
      // London School - Test Auto-Reconnection Behavior
      if (this.reconnectAttempts < this.mockConfig.maxReconnectAttempts!) {
        this.scheduleReconnect();
      }
    }
  }

  public mockMessage(data: any, type: string = 'message', id?: string): void {
    if (this.readyState !== this.OPEN) {
      throw new Error('Cannot send message when EventSource is not open');
    }

    const messageEvent = new MessageEvent(type, {
      data: typeof data === 'string' ? data : JSON.stringify(data),
      origin: new URL(this.url).origin,
      lastEventId: id || Date.now().toString()
    });

    this.triggerEvent(messageEvent);
    
    if (this.onmessage) {
      this.onmessage.call(this, messageEvent);
      this.onMessageMock(messageEvent);
    }
  }

  public mockError(error: string | Error): void {
    const errorEvent = new Event('error');
    Object.defineProperty(errorEvent, 'error', {
      value: error,
      enumerable: true
    });
    
    this.triggerEvent(errorEvent);
    
    if (this.onerror) {
      this.onerror.call(this, errorEvent);
      this.onErrorMock(errorEvent);
    }
  }

  // London School - Queue Management for Testing Message Ordering
  public queueMessage(event: SSEEvent): void {
    this.eventQueue.push(event);
  }

  public flushMessageQueue(): void {
    while (this.eventQueue.length > 0) {
      const event = this.eventQueue.shift()!;
      this.mockMessage(event.data, event.type, event.id);
    }
  }

  public clearMessageQueue(): void {
    this.eventQueue = [];
  }

  public getQueuedMessages(): SSEEvent[] {
    return [...this.eventQueue];
  }

  // London School - State Assertion Helpers
  public isConnecting(): boolean {
    return this.readyState === this.CONNECTING;
  }

  public isOpen(): boolean {
    return this.readyState === this.OPEN;
  }

  public isClosed(): boolean {
    return this.readyState === this.CLOSED;
  }

  // Mock Configuration Updates
  public updateConfig(config: Partial<MockEventSourceConfig>): void {
    this.mockConfig = { ...this.mockConfig, ...config };
  }

  public getConfig(): MockEventSourceConfig {
    return { ...this.mockConfig };
  }

  // Private Methods
  private scheduleConnect(): void {
    const timeout = setTimeout(() => {
      this.mockConnect();
    }, this.mockConfig.initialDelay);
    
    this.timeouts.push(timeout);
  }

  private scheduleReconnect(): void {
    this.reconnectAttempts++;
    this.readyState = this.CONNECTING;
    
    const timeout = setTimeout(() => {
      if (this.reconnectAttempts <= this.mockConfig.maxReconnectAttempts!) {
        this.mockConnect();
      }
    }, this.mockConfig.reconnectDelay);
    
    this.timeouts.push(timeout);
  }

  private triggerEvent(event: Event): void {
    this.dispatchEvent(event);
    
    // Also trigger specific listeners
    const listeners = this.listeners.get(event.type);
    if (listeners) {
      listeners.forEach(listener => {
        if (typeof listener === 'function') {
          listener(event);
        } else {
          listener.handleEvent(event);
        }
      });
    }
  }

  private clearTimeouts(): void {
    this.timeouts.forEach(timeout => clearTimeout(timeout));
    this.timeouts = [];
  }
}

// London School - Factory for Creating Configured Mocks
export class EventSourceMockFactory {
  public static createConnectedMock(url: string, config?: Partial<MockEventSourceConfig>): MockEventSource {
    const mock = new MockEventSource(url, { withCredentials: config?.withCredentials });
    mock.updateConfig({ autoConnect: false, ...config });
    mock.mockConnect();
    return mock;
  }

  public static createDisconnectedMock(url: string, config?: Partial<MockEventSourceConfig>): MockEventSource {
    const mock = new MockEventSource(url, { withCredentials: config?.withCredentials });
    mock.updateConfig({ autoConnect: false, ...config });
    return mock;
  }

  public static createFailingMock(url: string, config?: Partial<MockEventSourceConfig>): MockEventSource {
    const mock = new MockEventSource(url, { withCredentials: config?.withCredentials });
    mock.updateConfig({ autoConnect: false, ...config });
    
    // Schedule immediate failure
    setTimeout(() => {
      mock.mockDisconnect(true);
    }, 10);
    
    return mock;
  }

  public static createSlowMock(url: string, delay: number = 5000, config?: Partial<MockEventSourceConfig>): MockEventSource {
    const mock = new MockEventSource(url, { withCredentials: config?.withCredentials });
    mock.updateConfig({ 
      autoConnect: false, 
      initialDelay: delay,
      ...config 
    });
    
    if (config?.autoConnect !== false) {
      mock.mockConnect();
    }
    
    return mock;
  }
}

// London School - Mock Contract Verification Helpers
export const createEventSourceContract = () => ({
  shouldConnect: (mock: MockEventSource) => {
    expect(mock.onOpenMock).toHaveBeenCalled();
    expect(mock.isOpen()).toBe(true);
  },
  
  shouldReceiveMessage: (mock: MockEventSource, expectedData: any) => {
    expect(mock.onMessageMock).toHaveBeenCalledWith(
      expect.objectContaining({
        data: typeof expectedData === 'string' ? expectedData : JSON.stringify(expectedData)
      })
    );
  },
  
  shouldHandleError: (mock: MockEventSource) => {
    expect(mock.onErrorMock).toHaveBeenCalled();
    expect(mock.isClosed()).toBe(true);
  },
  
  shouldReconnect: (mock: MockEventSource, attempts: number) => {
    expect(mock.onOpenMock).toHaveBeenCalledTimes(attempts);
  },
  
  shouldMaintainEventOrder: (mock: MockEventSource, expectedOrder: string[]) => {
    const calls = mock.onMessageMock.mock.calls;
    const actualOrder = calls.map(call => JSON.parse(call[0].data).type);
    expect(actualOrder).toEqual(expectedOrder);
  }
});