/**
 * EventSource Mock for TDD Testing
 * Provides controllable EventSource behavior for SSE endpoint consistency testing
 */

export interface EventSourceMockOptions {
  autoConnect?: boolean;
  connectionDelay?: number;
  simulateErrors?: boolean;
  errorTypes?: ('network' | 'timeout' | 'auth' | 'server')[];
}

export class EventSourceMock implements EventSource {
  public static readonly CONNECTING = 0;
  public static readonly OPEN = 1;
  public static readonly CLOSED = 2;

  public readonly CONNECTING = EventSourceMock.CONNECTING;
  public readonly OPEN = EventSourceMock.OPEN;
  public readonly CLOSED = EventSourceMock.CLOSED;

  public readyState: number = EventSourceMock.CONNECTING;
  public url: string;
  public withCredentials: boolean = false;

  private listeners: { [key: string]: EventListener[] } = {};
  private mockData: any[] = [];
  private mockErrors: Error[] = [];
  private connectionTimer?: NodeJS.Timeout;
  private messageTimer?: NodeJS.Timeout;
  private errorTimer?: NodeJS.Timeout;

  // Track all created instances for validation
  public static instances: EventSourceMock[] = [];
  public static lastCreatedUrl: string | null = null;

  constructor(url: string, eventSourceInitDict?: EventSourceInit) {
    this.url = url;
    this.withCredentials = eventSourceInitDict?.withCredentials || false;
    
    // Track instance
    EventSourceMock.instances.push(this);
    EventSourceMock.lastCreatedUrl = url;

    // Simulate connection behavior
    this.simulateConnection();
  }

  // EventSource interface methods
  addEventListener(type: string, listener: EventListener, options?: boolean | AddEventListenerOptions): void {
    if (!this.listeners[type]) {
      this.listeners[type] = [];
    }
    this.listeners[type].push(listener);
  }

  removeEventListener(type: string, listener: EventListener, options?: boolean | EventListenerOptions): void {
    if (this.listeners[type]) {
      const index = this.listeners[type].indexOf(listener);
      if (index !== -1) {
        this.listeners[type].splice(index, 1);
      }
    }
  }

  dispatchEvent(event: Event): boolean {
    const type = event.type;
    if (this.listeners[type]) {
      this.listeners[type].forEach(listener => {
        if (typeof listener === 'function') {
          listener(event);
        } else if (listener && typeof listener.handleEvent === 'function') {
          listener.handleEvent(event);
        }
      });
    }
    return true;
  }

  // EventSource event handlers
  public onopen: ((event: Event) => any) | null = null;
  public onmessage: ((event: MessageEvent) => any) | null = null;
  public onerror: ((event: Event) => any) | null = null;

  // Mock-specific methods
  public close(): void {
    this.readyState = EventSourceMock.CLOSED;
    
    if (this.connectionTimer) {
      clearTimeout(this.connectionTimer);
    }
    if (this.messageTimer) {
      clearTimeout(this.messageTimer);
    }
    if (this.errorTimer) {
      clearTimeout(this.errorTimer);
    }

    // Remove from tracking
    const index = EventSourceMock.instances.indexOf(this);
    if (index !== -1) {
      EventSourceMock.instances.splice(index, 1);
    }
  }

  // Test helper methods
  public mockMessage(data: any, eventType: string = 'message'): void {
    if (this.readyState !== EventSourceMock.OPEN) {
      throw new Error('Cannot send message when connection is not open');
    }

    const event = new MessageEvent('message', {
      data: JSON.stringify(data),
      origin: new URL(this.url).origin,
      lastEventId: '',
      source: null,
      ports: []
    });

    this.triggerEvent(eventType, event);
  }

  public mockError(error: Error | string = 'Connection failed'): void {
    const errorEvent = new Event('error');
    (errorEvent as any).message = typeof error === 'string' ? error : error.message;
    
    this.readyState = EventSourceMock.CLOSED;
    this.triggerEvent('error', errorEvent);
  }

  public mockOpen(): void {
    this.readyState = EventSourceMock.OPEN;
    const event = new Event('open');
    this.triggerEvent('open', event);
  }

  private simulateConnection(delay: number = 100): void {
    this.connectionTimer = setTimeout(() => {
      if (this.readyState === EventSourceMock.CONNECTING) {
        this.mockOpen();
      }
    }, delay);
  }

  private triggerEvent(type: string, event: Event): void {
    // Trigger event handler if set
    switch (type) {
      case 'open':
        if (this.onopen) this.onopen(event);
        break;
      case 'message':
        if (this.onmessage) this.onmessage(event as MessageEvent);
        break;
      case 'error':
        if (this.onerror) this.onerror(event);
        break;
    }

    // Trigger addEventListener listeners
    if (this.listeners[type]) {
      this.listeners[type].forEach(listener => {
        if (typeof listener === 'function') {
          listener(event);
        }
      });
    }
  }

  // Static test utilities
  public static reset(): void {
    // Close all instances and clear tracking
    EventSourceMock.instances.forEach(instance => instance.close());
    EventSourceMock.instances = [];
    EventSourceMock.lastCreatedUrl = null;
  }

  public static getCreatedUrls(): string[] {
    return EventSourceMock.instances.map(instance => instance.url);
  }

  public static getInstanceCount(): number {
    return EventSourceMock.instances.length;
  }

  public static findInstanceByUrl(url: string): EventSourceMock | null {
    return EventSourceMock.instances.find(instance => instance.url === url) || null;
  }
}

// Mock fetch for API calls
export class FetchMock {
  private static responses: Map<string, any> = new Map();
  private static calls: Array<{ url: string; options?: RequestInit }> = [];

  public static mockResponse(urlPattern: string | RegExp, response: any): void {
    const key = urlPattern instanceof RegExp ? urlPattern.source : urlPattern;
    this.responses.set(key, response);
  }

  public static mockImplementation(): typeof fetch {
    return async (input: RequestInfo | URL, init?: RequestInit): Promise<Response> => {
      const url = typeof input === 'string' ? input : input.toString();
      
      // Track the call
      FetchMock.calls.push({ url, options: init });

      // Find matching response
      let mockResponse = null;
      for (const [pattern, response] of FetchMock.responses.entries()) {
        const regex = new RegExp(pattern);
        if (regex.test(url)) {
          mockResponse = response;
          break;
        }
      }

      if (!mockResponse) {
        throw new Error(`No mock response defined for URL: ${url}`);
      }

      // Return mock response
      return new Response(JSON.stringify(mockResponse), {
        status: mockResponse.status || 200,
        statusText: mockResponse.statusText || 'OK',
        headers: mockResponse.headers || { 'Content-Type': 'application/json' }
      });
    };
  }

  public static getCalls(): Array<{ url: string; options?: RequestInit }> {
    return [...FetchMock.calls];
  }

  public static getCallsMatching(urlPattern: string | RegExp): Array<{ url: string; options?: RequestInit }> {
    const regex = urlPattern instanceof RegExp ? urlPattern : new RegExp(urlPattern);
    return FetchMock.calls.filter(call => regex.test(call.url));
  }

  public static reset(): void {
    FetchMock.responses.clear();
    FetchMock.calls = [];
  }
}

export default EventSourceMock;