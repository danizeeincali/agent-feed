/**
 * Socket.IO Mock Implementation
 * London School TDD approach - mock at the lowest level for isolation
 */

import { EventEmitter } from 'events';

export interface MockSocketConfig {
  id?: string;
  connected?: boolean;
  connecting?: boolean;
  disconnected?: boolean;
  autoConnect?: boolean;
  connectionDelay?: number;
  shouldFailConnection?: boolean;
  failureReason?: string;
}

export class MockSocket extends EventEmitter {
  public id: string;
  public connected: boolean;
  public connecting: boolean;
  public disconnected: boolean;
  public io: any;
  
  private config: MockSocketConfig;
  private connectionTimer: NodeJS.Timeout | null = null;
  private emittedEvents: Array<{ event: string; data: any; timestamp: number }> = [];
  private listeners: Map<string, Function[]> = new Map();
  
  constructor(config: MockSocketConfig = {}) {
    super();
    this.config = {
      id: 'mock-socket-id',
      connected: false,
      connecting: false,
      disconnected: true,
      autoConnect: true,
      connectionDelay: 10,
      shouldFailConnection: false,
      ...config
    };
    
    this.id = this.config.id!;
    this.connected = this.config.connected!;
    this.connecting = this.config.connecting!;
    this.disconnected = this.config.disconnected!;
    
    // Mock io property
    this.io = {
      engine: {
        transport: {
          name: 'websocket'
        }
      }
    };
    
    if (this.config.autoConnect) {
      this.connect();
    }
  }
  
  connect(): MockSocket {
    if (this.connected) return this;
    
    this.connecting = true;
    this.disconnected = false;
    
    // Simulate async connection
    this.connectionTimer = setTimeout(() => {
      if (this.config.shouldFailConnection) {
        this.connecting = false;
        this.disconnected = true;
        this.emit('connect_error', new Error(this.config.failureReason || 'Connection failed'));
      } else {
        this.connecting = false;
        this.connected = true;
        this.disconnected = false;
        this.emit('connect');
      }
    }, this.config.connectionDelay);
    
    return this;
  }
  
  disconnect(): MockSocket {
    if (!this.connected && !this.connecting) return this;
    
    if (this.connectionTimer) {
      clearTimeout(this.connectionTimer);
      this.connectionTimer = null;
    }
    
    this.connected = false;
    this.connecting = false;
    this.disconnected = true;
    
    // Emit disconnect with reason
    process.nextTick(() => {
      this.emit('disconnect', 'io client disconnect');
    });
    
    return this;
  }
  
  emit(event: string, ...args: any[]): boolean {
    // Track emitted events for verification
    this.emittedEvents.push({
      event,
      data: args,
      timestamp: Date.now()
    });
    
    return super.emit(event, ...args);
  }
  
  on(event: string, listener: Function): this {
    if (!this.listeners.has(event)) {
      this.listeners.set(event, []);
    }
    this.listeners.get(event)!.push(listener);
    return super.on(event, listener);
  }
  
  off(event: string, listener?: Function): this {
    if (listener) {
      const listeners = this.listeners.get(event);
      if (listeners) {
        const index = listeners.indexOf(listener);
        if (index > -1) {
          listeners.splice(index, 1);
        }
      }
      return super.off(event, listener);
    } else {
      this.listeners.delete(event);
      return super.removeAllListeners(event);
    }
  }
  
  once(event: string, listener: Function): this {
    return super.once(event, listener);
  }
  
  // Mock-specific methods for testing
  getEmittedEvents(): Array<{ event: string; data: any; timestamp: number }> {
    return [...this.emittedEvents];
  }
  
  getLastEmittedEvent(): { event: string; data: any; timestamp: number } | null {
    return this.emittedEvents.length > 0 
      ? this.emittedEvents[this.emittedEvents.length - 1]
      : null;
  }
  
  clearEmittedEvents(): void {
    this.emittedEvents = [];
  }
  
  getListenersFor(event: string): Function[] {
    return this.listeners.get(event) || [];
  }
  
  // Simulate connection state changes for testing race conditions
  simulateConnectionRace(): void {
    // Manager says CONNECTED but socket.connected is false
    this.connected = false;
    this.disconnected = false;
    this.connecting = false;
  }
  
  simulateReconnectingState(): void {
    this.connected = false;
    this.disconnected = false;
    this.connecting = true;
  }
  
  // Force specific states for testing
  forceState(state: {
    connected?: boolean;
    connecting?: boolean; 
    disconnected?: boolean;
    id?: string;
  }): void {
    if (state.connected !== undefined) this.connected = state.connected;
    if (state.connecting !== undefined) this.connecting = state.connecting;
    if (state.disconnected !== undefined) this.disconnected = state.disconnected;
    if (state.id !== undefined) this.id = state.id;
  }
  
  // Clean up resources
  destroy(): void {
    if (this.connectionTimer) {
      clearTimeout(this.connectionTimer);
      this.connectionTimer = null;
    }
    this.removeAllListeners();
    this.emittedEvents = [];
    this.listeners.clear();
  }
}

// Mock io function factory
export function createMockIo(config: MockSocketConfig = {}): (url: string, options?: any) => MockSocket {
  return jest.fn().mockImplementation((url: string, options?: any) => {
    return new MockSocket({
      ...config,
      // Can override config based on URL or options
    });
  });
}

// Mock Socket.IO module
export const mockSocketIO = {
  io: createMockIo(),
  Socket: MockSocket
};

// Helper to create pre-configured mock scenarios
export const mockScenarios = {
  // Socket connects successfully
  successfulConnection: (config: Partial<MockSocketConfig> = {}) => new MockSocket({
    connected: false,
    connecting: false,
    disconnected: true,
    shouldFailConnection: false,
    connectionDelay: 1,
    ...config
  }),
  
  // Socket fails to connect
  failedConnection: (config: Partial<MockSocketConfig> = {}) => new MockSocket({
    connected: false,
    connecting: false, 
    disconnected: true,
    shouldFailConnection: true,
    failureReason: 'Connection timeout',
    connectionDelay: 1,
    ...config
  }),
  
  // Already connected socket
  connectedSocket: (config: Partial<MockSocketConfig> = {}) => new MockSocket({
    connected: true,
    connecting: false,
    disconnected: false,
    autoConnect: false,
    ...config
  }),
  
  // Socket in connecting state
  connectingSocket: (config: Partial<MockSocketConfig> = {}) => new MockSocket({
    connected: false,
    connecting: true,
    disconnected: false,
    autoConnect: false,
    connectionDelay: 100, // Longer delay for testing
    ...config
  }),
  
  // Disconnected socket
  disconnectedSocket: (config: Partial<MockSocketConfig> = {}) => new MockSocket({
    connected: false,
    connecting: false,
    disconnected: true,
    autoConnect: false,
    ...config
  }),
  
  // Race condition: Manager connected but socket not
  raceConditionSocket: (config: Partial<MockSocketConfig> = {}) => {
    const socket = new MockSocket({
      connected: false, // Socket not connected
      connecting: false,
      disconnected: false,
      autoConnect: false,
      ...config
    });
    socket.simulateConnectionRace();
    return socket;
  }
};