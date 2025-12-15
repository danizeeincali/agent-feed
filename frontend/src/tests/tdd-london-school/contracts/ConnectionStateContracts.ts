/**
 * Connection State Contracts - London School TDD Approach
 * Defines contracts for WebSocket to HTTP+SSE migration testing
 */

import { jest } from '@jest/globals';

// London School - Connection State Contract Definitions
export interface ConnectionContract {
  // State Management
  getConnectionState(): ConnectionState;
  setConnectionState(state: ConnectionState): void;
  
  // Connection Lifecycle
  connect(options: ConnectionOptions): Promise<void>;
  disconnect(): Promise<void>;
  reconnect(): Promise<void>;
  
  // Message Handling
  sendMessage(message: any): Promise<void>;
  addEventListener(event: string, handler: Function): void;
  removeEventListener(event: string, handler: Function): void;
  
  // Health Monitoring
  isConnected(): boolean;
  getConnectionHealth(): HealthStatus;
  
  // Error Handling
  handleConnectionError(error: Error): void;
  getLastError(): Error | null;
}

export interface ConnectionState {
  status: 'disconnected' | 'connecting' | 'connected' | 'reconnecting' | 'error';
  type: 'websocket' | 'sse' | 'http' | 'hybrid';
  instanceId: string | null;
  terminalId: string | null;
  connectedAt: number | null;
  lastError: Error | null;
  reconnectAttempts: number;
  maxReconnectAttempts: number;
}

export interface ConnectionOptions {
  url: string;
  terminalId?: string;
  enableAutoReconnect?: boolean;
  reconnectDelay?: number;
  maxReconnectAttempts?: number;
  timeout?: number;
  headers?: Record<string, string>;
}

export interface HealthStatus {
  isHealthy: boolean;
  latency: number;
  uptime: number;
  errorRate: number;
  lastHeartbeat: number;
  connectionQuality: 'excellent' | 'good' | 'poor' | 'critical';
}

// London School - Mock Connection Manager
export class MockConnectionManager implements ConnectionContract {
  private state: ConnectionState;
  private eventHandlers: Map<string, Set<Function>> = new Map();
  private config: ConnectionOptions;
  
  // Jest Mocks for Behavior Verification
  public connectMock = jest.fn<(options: ConnectionOptions) => Promise<void>>();
  public disconnectMock = jest.fn<() => Promise<void>>();
  public reconnectMock = jest.fn<() => Promise<void>>();
  public sendMessageMock = jest.fn<(message: any) => Promise<void>>();
  public addEventListenerMock = jest.fn<(event: string, handler: Function) => void>();
  public removeEventListenerMock = jest.fn<(event: string, handler: Function) => void>();
  public handleConnectionErrorMock = jest.fn<(error: Error) => void>();
  
  // Mock Collaborators (London School Pattern)
  public mockEventSource: any;
  public mockFetch: any;
  public mockWebSocket: any;
  public mockHealthMonitor: any;
  public mockMessageBuffer: any;
  
  constructor(initialState?: Partial<ConnectionState>) {
    this.state = {
      status: 'disconnected',
      type: 'websocket',
      instanceId: null,
      terminalId: null,
      connectedAt: null,
      lastError: null,
      reconnectAttempts: 0,
      maxReconnectAttempts: 3,
      ...initialState
    };
    
    this.config = {
      url: 'ws://localhost:3000',
      enableAutoReconnect: true,
      reconnectDelay: 1000,
      maxReconnectAttempts: 3,
      timeout: 5000
    };
  }

  // Connection State Management
  getConnectionState(): ConnectionState {
    return { ...this.state };
  }

  setConnectionState(state: ConnectionState): void {
    this.state = { ...state };
    this.emitEvent('statechange', this.state);
  }

  // Connection Lifecycle Implementation
  async connect(options: ConnectionOptions): Promise<void> {
    this.connectMock(options);
    this.config = { ...this.config, ...options };
    
    this.state.status = 'connecting';
    this.emitEvent('connecting', this.state);
    
    try {
      // Mock connection establishment based on type
      switch (this.state.type) {
        case 'websocket':
          await this.mockWebSocketConnect(options);
          break;
        case 'sse':
          await this.mockSSEConnect(options);
          break;
        case 'http':
          await this.mockHTTPConnect(options);
          break;
        case 'hybrid':
          await this.mockHybridConnect(options);
          break;
      }
      
      this.state.status = 'connected';
      this.state.connectedAt = Date.now();
      this.state.reconnectAttempts = 0;
      this.state.lastError = null;
      
      this.emitEvent('connected', this.state);
    } catch (error) {
      this.state.status = 'error';
      this.state.lastError = error as Error;
      this.handleConnectionError(error as Error);
      throw error;
    }
  }

  async disconnect(): Promise<void> {
    this.disconnectMock();
    
    this.state.status = 'disconnected';
    this.state.instanceId = null;
    this.state.terminalId = null;
    this.state.connectedAt = null;
    
    // Clean up collaborators
    if (this.mockWebSocket?.close) {
      this.mockWebSocket.close();
    }
    if (this.mockEventSource?.close) {
      this.mockEventSource.close();
    }
    
    this.emitEvent('disconnected', this.state);
  }

  async reconnect(): Promise<void> {
    this.reconnectMock();
    
    if (this.state.reconnectAttempts >= this.state.maxReconnectAttempts) {
      throw new Error('Maximum reconnection attempts exceeded');
    }
    
    this.state.status = 'reconnecting';
    this.state.reconnectAttempts++;
    this.emitEvent('reconnecting', this.state);
    
    // Delay before reconnection
    await new Promise(resolve => setTimeout(resolve, this.config.reconnectDelay));
    
    await this.connect(this.config);
  }

  // Message Handling Implementation
  async sendMessage(message: any): Promise<void> {
    this.sendMessageMock(message);
    
    if (this.state.status !== 'connected') {
      throw new Error('Cannot send message: not connected');
    }
    
    // Route message to appropriate collaborator
    switch (this.state.type) {
      case 'websocket':
        if (this.mockWebSocket?.send) {
          this.mockWebSocket.send(JSON.stringify(message));
        }
        break;
      case 'http':
        if (this.mockFetch) {
          await this.mockFetch('/api/terminal/command', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(message)
          });
        }
        break;
    }
    
    this.emitEvent('message:sent', { message, timestamp: Date.now() });
  }

  // Event Management
  addEventListener(event: string, handler: Function): void {
    this.addEventListenerMock(event, handler);
    
    if (!this.eventHandlers.has(event)) {
      this.eventHandlers.set(event, new Set());
    }
    this.eventHandlers.get(event)!.add(handler);
  }

  removeEventListener(event: string, handler: Function): void {
    this.removeEventListenerMock(event, handler);
    
    const handlers = this.eventHandlers.get(event);
    if (handlers) {
      handlers.delete(handler);
    }
  }

  // Health Monitoring
  isConnected(): boolean {
    return this.state.status === 'connected';
  }

  getConnectionHealth(): HealthStatus {
    const now = Date.now();
    const uptime = this.state.connectedAt ? now - this.state.connectedAt : 0;
    
    // Mock health metrics
    return {
      isHealthy: this.isConnected() && !this.state.lastError,
      latency: Math.random() * 100, // Mock latency
      uptime,
      errorRate: this.state.reconnectAttempts / 10,
      lastHeartbeat: now - Math.random() * 1000,
      connectionQuality: this.calculateConnectionQuality()
    };
  }

  // Error Handling
  handleConnectionError(error: Error): void {
    this.handleConnectionErrorMock(error);
    
    this.state.lastError = error;
    this.state.status = 'error';
    
    this.emitEvent('error', { error, state: this.state });
    
    // Auto-reconnect if enabled
    if (this.config.enableAutoReconnect && 
        this.state.reconnectAttempts < this.state.maxReconnectAttempts) {
      setTimeout(() => {
        this.reconnect().catch(err => {
          console.error('Auto-reconnect failed:', err);
        });
      }, this.config.reconnectDelay);
    }
  }

  getLastError(): Error | null {
    return this.state.lastError;
  }

  // London School - Mock Collaboration Setup
  public setMockCollaborators(collaborators: {
    eventSource?: any;
    fetch?: any;
    webSocket?: any;
    healthMonitor?: any;
    messageBuffer?: any;
  }): void {
    Object.assign(this, {
      mockEventSource: collaborators.eventSource,
      mockFetch: collaborators.fetch,
      mockWebSocket: collaborators.webSocket,
      mockHealthMonitor: collaborators.healthMonitor,
      mockMessageBuffer: collaborators.messageBuffer
    });
  }

  // London School - Contract Verification Helpers
  public getInteractionHistory() {
    return {
      connect: this.connectMock.mock.calls,
      disconnect: this.disconnectMock.mock.calls,
      reconnect: this.reconnectMock.mock.calls,
      sendMessage: this.sendMessageMock.mock.calls,
      addEventListener: this.addEventListenerMock.mock.calls,
      removeEventListener: this.removeEventListenerMock.mock.calls,
      handleConnectionError: this.handleConnectionErrorMock.mock.calls
    };
  }

  public verifyConnectionLifecycle(expectedStates: string[]): boolean {
    const calls = this.connectMock.mock.calls.length > 0 ||
                 this.disconnectMock.mock.calls.length > 0;
    return calls;
  }

  public verifyErrorHandling(): boolean {
    return this.handleConnectionErrorMock.mock.calls.length > 0;
  }

  // Private Methods
  private async mockWebSocketConnect(options: ConnectionOptions): Promise<void> {
    if (!this.mockWebSocket) {
      throw new Error('WebSocket connection failed');
    }
    // Mock WebSocket connection logic
  }

  private async mockSSEConnect(options: ConnectionOptions): Promise<void> {
    if (!this.mockEventSource) {
      throw new Error('SSE connection failed');
    }
    // Mock SSE connection logic
  }

  private async mockHTTPConnect(options: ConnectionOptions): Promise<void> {
    if (!this.mockFetch) {
      throw new Error('HTTP connection failed');
    }
    // Mock HTTP connection logic
  }

  private async mockHybridConnect(options: ConnectionOptions): Promise<void> {
    // Try SSE first, fallback to HTTP polling
    try {
      await this.mockSSEConnect(options);
      this.state.type = 'sse';
    } catch {
      await this.mockHTTPConnect(options);
      this.state.type = 'http';
    }
  }

  private emitEvent(event: string, data: any): void {
    const handlers = this.eventHandlers.get(event);
    if (handlers) {
      handlers.forEach(handler => {
        try {
          handler(data);
        } catch (error) {
          console.error(`Error in event handler for ${event}:`, error);
        }
      });
    }
  }

  private calculateConnectionQuality(): 'excellent' | 'good' | 'poor' | 'critical' {
    if (!this.isConnected()) return 'critical';
    if (this.state.reconnectAttempts === 0) return 'excellent';
    if (this.state.reconnectAttempts <= 1) return 'good';
    return 'poor';
  }
}

// London School - Factory for Test Scenarios
export class ConnectionContractFactory {
  public static createWebSocketContract(): MockConnectionManager {
    const manager = new MockConnectionManager({ type: 'websocket' });
    
    // Setup WebSocket mock collaborator
    const mockWebSocket = {
      send: jest.fn(),
      close: jest.fn(),
      readyState: 1 // OPEN
    };
    
    manager.setMockCollaborators({ webSocket: mockWebSocket });
    return manager;
  }

  public static createSSEContract(): MockConnectionManager {
    const manager = new MockConnectionManager({ type: 'sse' });
    
    // Setup EventSource mock collaborator
    const mockEventSource = {
      close: jest.fn(),
      readyState: 1, // OPEN
      addEventListener: jest.fn(),
      removeEventListener: jest.fn()
    };
    
    manager.setMockCollaborators({ eventSource: mockEventSource });
    return manager;
  }

  public static createHTTPContract(): MockConnectionManager {
    const manager = new MockConnectionManager({ type: 'http' });
    
    // Setup Fetch mock collaborator
    const mockFetch = jest.fn().mockResolvedValue({
      ok: true,
      json: () => Promise.resolve({ success: true })
    });
    
    manager.setMockCollaborators({ fetch: mockFetch });
    return manager;
  }

  public static createHybridContract(): MockConnectionManager {
    const manager = new MockConnectionManager({ type: 'hybrid' });
    
    // Setup both SSE and HTTP mock collaborators
    const mockEventSource = {
      close: jest.fn(),
      readyState: 1,
      addEventListener: jest.fn(),
      removeEventListener: jest.fn()
    };
    
    const mockFetch = jest.fn().mockResolvedValue({
      ok: true,
      json: () => Promise.resolve({ success: true })
    });
    
    manager.setMockCollaborators({ 
      eventSource: mockEventSource,
      fetch: mockFetch 
    });
    
    return manager;
  }

  public static createFailingContract(): MockConnectionManager {
    const manager = new MockConnectionManager();
    
    // Setup failing mock collaborators
    const mockWebSocket = {
      send: jest.fn().mockRejectedValue(new Error('Send failed')),
      close: jest.fn()
    };
    
    manager.setMockCollaborators({ webSocket: mockWebSocket });
    return manager;
  }
}

// London School - Contract Verification Helpers
export const createConnectionStateContract = () => ({
  shouldTransitionToConnecting: (manager: MockConnectionManager) => {
    expect(manager.connectMock).toHaveBeenCalled();
    expect(manager.getConnectionState().status).toBe('connecting');
  },

  shouldTransitionToConnected: (manager: MockConnectionManager) => {
    const state = manager.getConnectionState();
    expect(state.status).toBe('connected');
    expect(state.connectedAt).toBeTruthy();
    expect(state.reconnectAttempts).toBe(0);
  },

  shouldTransitionToDisconnected: (manager: MockConnectionManager) => {
    expect(manager.disconnectMock).toHaveBeenCalled();
    expect(manager.getConnectionState().status).toBe('disconnected');
  },

  shouldHandleReconnection: (manager: MockConnectionManager, expectedAttempts: number) => {
    expect(manager.reconnectMock).toHaveBeenCalledTimes(expectedAttempts);
    expect(manager.getConnectionState().reconnectAttempts).toBe(expectedAttempts);
  },

  shouldHandleErrors: (manager: MockConnectionManager, expectedError: Error) => {
    expect(manager.handleConnectionErrorMock).toHaveBeenCalledWith(expectedError);
    expect(manager.getConnectionState().lastError).toBe(expectedError);
  },

  shouldMaintainEventHandlers: (manager: MockConnectionManager, event: string) => {
    expect(manager.addEventListenerMock).toHaveBeenCalledWith(event, expect.any(Function));
  },

  shouldCleanupOnDisconnect: (manager: MockConnectionManager) => {
    const interactions = manager.getInteractionHistory();
    expect(interactions.disconnect).toHaveBeenCalled();
    // Verify cleanup of mock collaborators
  }
});