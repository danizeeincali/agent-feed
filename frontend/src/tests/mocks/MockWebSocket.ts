/**
 * MockWebSocket - London School TDD Mock Implementation
 * Provides comprehensive WebSocket mock with behavior verification capabilities
 */

export class MockWebSocket implements WebSocket {
  public static instances: MockWebSocket[] = [];
  
  // WebSocket properties
  public readonly url: string;
  public readyState: number = WebSocket.CONNECTING;
  public binaryType: BinaryType = 'blob';
  public bufferedAmount: number = 0;
  public extensions: string = '';
  public protocol: string = '';
  
  // Mock-specific properties for behavior verification
  public onopen: ((event: Event) => void) | null = null;
  public onclose: ((event: CloseEvent) => void) | null = null;
  public onmessage: ((event: MessageEvent) => void) | null = null;
  public onerror: ((event: Event) => void) | null = null;
  
  // Event listener tracking for London School verification
  public eventListeners: Map<string, Set<EventListener>> = new Map();
  public sentMessages: any[] = [];
  public closeHistory: Array<{ code: number; reason: string; timestamp: number }> = [];
  public openDelayMs: number = 0;
  public autoResponses: Map<string, any> = new Map();
  
  // Mock control flags
  public shouldFailOnConnect: boolean = false;
  public shouldFailOnSend: boolean = false;
  public connectDelay: number = 0;
  public closeDelay: number = 0;
  
  // Jest spies for interaction verification
  public send = jest.fn().mockImplementation(this._send.bind(this));
  public close = jest.fn().mockImplementation(this._close.bind(this));
  public addEventListener = jest.fn().mockImplementation(this._addEventListener.bind(this));
  public removeEventListener = jest.fn().mockImplementation(this._removeEventListener.bind(this));
  public dispatchEvent = jest.fn().mockImplementation(this._dispatchEvent.bind(this));
  
  constructor(url: string, protocols?: string | string[]) {
    this.url = url;
    this.protocol = Array.isArray(protocols) ? protocols[0] || '' : protocols || '';
    MockWebSocket.instances.push(this);
    
    // Simulate connection process
    if (!this.shouldFailOnConnect) {
      setTimeout(() => this._simulateOpen(), this.connectDelay);
    } else {
      setTimeout(() => this._simulateError(), this.connectDelay);
    }
  }
  
  // Static methods for test control
  static reset(): void {
    MockWebSocket.instances = [];
  }
  
  static getLastInstance(): MockWebSocket | undefined {
    return MockWebSocket.instances[MockWebSocket.instances.length - 1];
  }
  
  static getAllInstances(): MockWebSocket[] {
    return [...MockWebSocket.instances];
  }
  
  // Mock behavior control
  setAutoResponse(messageType: string, response: any): void {
    this.autoResponses.set(messageType, response);
  }
  
  simulateMessage(data: any): void {
    if (this.readyState !== WebSocket.OPEN) {
      throw new Error('Cannot simulate message when WebSocket is not open');
    }
    
    const event = new MessageEvent('message', { data: JSON.stringify(data) });
    this._dispatchEvent(event);
  }
  
  simulateError(error?: Error): void {
    const errorEvent = new ErrorEvent('error', { error: error || new Error('Mock WebSocket error') });
    this._dispatchEvent(errorEvent);
  }
  
  simulateClose(code: number = 1000, reason: string = 'Normal closure'): void {
    this._close(code, reason);
  }
  
  // Private implementation methods
  private _send(data: string | ArrayBuffer | Blob | ArrayBufferView): void {
    if (this.shouldFailOnSend) {
      throw new Error('Mock WebSocket send failed');
    }
    
    if (this.readyState !== WebSocket.OPEN) {
      throw new Error('WebSocket is not open');
    }
    
    // Parse and store sent data for verification
    try {
      const parsedData = typeof data === 'string' ? JSON.parse(data) : data;
      this.sentMessages.push({
        data: parsedData,
        timestamp: Date.now(),
        raw: data
      });
      
      // Check for auto-responses
      if (typeof data === 'string') {
        const messageData = JSON.parse(data);
        if (this.autoResponses.has(messageData.type)) {
          setTimeout(() => {
            this.simulateMessage(this.autoResponses.get(messageData.type));
          }, 10);
        }
      }
    } catch (error) {
      this.sentMessages.push({
        data: data,
        timestamp: Date.now(),
        raw: data,
        parseError: error
      });
    }
  }
  
  private _close(code: number = 1000, reason: string = ''): void {
    if (this.readyState === WebSocket.CLOSED || this.readyState === WebSocket.CLOSING) {
      return;
    }
    
    this.readyState = WebSocket.CLOSING;
    this.closeHistory.push({ code, reason, timestamp: Date.now() });
    
    setTimeout(() => {
      this.readyState = WebSocket.CLOSED;
      const closeEvent = new CloseEvent('close', { code, reason, wasClean: code === 1000 });
      this._dispatchEvent(closeEvent);
    }, this.closeDelay);
  }
  
  private _addEventListener(type: string, listener: EventListener | EventListenerObject): void {
    if (!this.eventListeners.has(type)) {
      this.eventListeners.set(type, new Set());
    }
    
    const listenerFunc = typeof listener === 'function' ? listener : listener.handleEvent;
    this.eventListeners.get(type)!.add(listenerFunc);
  }
  
  private _removeEventListener(type: string, listener: EventListener | EventListenerObject): void {
    const listeners = this.eventListeners.get(type);
    if (listeners) {
      const listenerFunc = typeof listener === 'function' ? listener : listener.handleEvent;
      listeners.delete(listenerFunc);
    }
  }
  
  private _dispatchEvent(event: Event): boolean {
    // Call direct handlers first
    switch (event.type) {
      case 'open':
        if (this.onopen) this.onopen(event);
        break;
      case 'close':
        if (this.onclose) this.onclose(event as CloseEvent);
        break;
      case 'message':
        if (this.onmessage) this.onmessage(event as MessageEvent);
        break;
      case 'error':
        if (this.onerror) this.onerror(event);
        break;
    }
    
    // Call registered event listeners
    const listeners = this.eventListeners.get(event.type);
    if (listeners) {
      listeners.forEach(listener => {
        try {
          listener(event);
        } catch (error) {
          console.error('Mock WebSocket event listener error:', error);
        }
      });
    }
    
    return true;
  }
  
  private _simulateOpen(): void {
    this.readyState = WebSocket.OPEN;
    const openEvent = new Event('open');
    this._dispatchEvent(openEvent);
  }
  
  private _simulateError(): void {
    this.readyState = WebSocket.CLOSED;
    const errorEvent = new ErrorEvent('error', { error: new Error('Connection failed') });
    this._dispatchEvent(errorEvent);
  }
  
  // Verification helpers for London School TDD
  getInteractionHistory() {
    return {
      sentMessages: this.sentMessages,
      closeHistory: this.closeHistory,
      eventListeners: Array.from(this.eventListeners.entries()).map(([type, listeners]) => ({
        type,
        count: listeners.size
      })),
      currentState: this.readyState,
      url: this.url
    };
  }
  
  // Fluent API for test setup
  withConnectDelay(ms: number): MockWebSocket {
    this.connectDelay = ms;
    return this;
  }
  
  withCloseDelay(ms: number): MockWebSocket {
    this.closeDelay = ms;
    return this;
  }
  
  withFailOnConnect(): MockWebSocket {
    this.shouldFailOnConnect = true;
    return this;
  }
  
  withFailOnSend(): MockWebSocket {
    this.shouldFailOnSend = true;
    return this;
  }
  
  withAutoResponse(messageType: string, response: any): MockWebSocket {
    this.setAutoResponse(messageType, response);
    return this;
  }
}

// WebSocket constants for mock
Object.defineProperty(MockWebSocket, 'CONNECTING', { value: 0 });
Object.defineProperty(MockWebSocket, 'OPEN', { value: 1 });
Object.defineProperty(MockWebSocket, 'CLOSING', { value: 2 });
Object.defineProperty(MockWebSocket, 'CLOSED', { value: 3 });

// Test utilities for London School TDD
export class WebSocketTestUtils {
  static expectConnectionAttempt(mockWs: MockWebSocket, url: string): void {
    expect(mockWs.url).toBe(url);
    expect(mockWs.readyState).toBe(WebSocket.CONNECTING);
  }
  
  static expectMessageSent(mockWs: MockWebSocket, expectedData: any): void {
    const lastMessage = mockWs.sentMessages[mockWs.sentMessages.length - 1];
    expect(lastMessage).toBeDefined();
    expect(lastMessage.data).toEqual(expectedData);
  }
  
  static expectMessagesSent(mockWs: MockWebSocket, count: number): void {
    expect(mockWs.sentMessages).toHaveLength(count);
  }
  
  static expectConnectionClosed(mockWs: MockWebSocket, code?: number, reason?: string): void {
    expect(mockWs.close).toHaveBeenCalled();
    if (code !== undefined) {
      expect(mockWs.close).toHaveBeenCalledWith(code, reason || expect.any(String));
    }
  }
  
  static expectEventListenerAdded(mockWs: MockWebSocket, eventType: string): void {
    expect(mockWs.addEventListener).toHaveBeenCalledWith(
      eventType,
      expect.any(Function)
    );
  }
  
  static expectNoInteractions(mockWs: MockWebSocket): void {
    expect(mockWs.send).not.toHaveBeenCalled();
    expect(mockWs.close).not.toHaveBeenCalled();
  }
  
  static createMockConnection(url: string, options: {
    shouldConnect?: boolean;
    connectDelay?: number;
    autoResponses?: Record<string, any>;
  } = {}): MockWebSocket {
    const mock = new MockWebSocket(url);
    
    if (options.shouldConnect === false) {
      mock.withFailOnConnect();
    }
    
    if (options.connectDelay) {
      mock.withConnectDelay(options.connectDelay);
    }
    
    if (options.autoResponses) {
      Object.entries(options.autoResponses).forEach(([type, response]) => {
        mock.withAutoResponse(type, response);
      });
    }
    
    return mock;
  }
}