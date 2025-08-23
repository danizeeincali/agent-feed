/**
 * WebSocket Connection Manager Mock
 * London School TDD - Mock the connection manager to isolate hook testing
 */

import { EventEmitter } from 'events';
import { 
  ConnectionState, 
  ConnectionOptions, 
  ConnectionMetrics, 
  HealthStatus 
} from '../../../src/services/connection/types';
import { MockSocket } from './socket-io-mock';

export interface MockConnectionManagerConfig {
  initialState?: ConnectionState;
  socket?: MockSocket | null;
  autoConnect?: boolean;
  shouldFailConnection?: boolean;
  reconnectDelay?: number;
  maxReconnectAttempts?: number;
}

export class MockWebSocketConnectionManager extends EventEmitter {
  private state: ConnectionState;
  private socket: MockSocket | null;
  private options: ConnectionOptions;
  private config: MockConnectionManagerConfig;
  private connectCallCount = 0;
  private disconnectCallCount = 0;
  private reconnectCallCount = 0;
  private stateHistory: Array<{ from: ConnectionState; to: ConnectionState; timestamp: number }> = [];
  
  constructor(options: ConnectionOptions = {}, config: MockConnectionManagerConfig = {}) {
    super();
    
    this.config = {
      initialState: ConnectionState.DISCONNECTED,
      socket: null,
      autoConnect: true,
      shouldFailConnection: false,
      reconnectDelay: 10,
      maxReconnectAttempts: 5,
      ...config
    };
    
    this.options = options;
    this.state = this.config.initialState!;
    this.socket = this.config.socket || null;
    
    // Auto-connect if enabled
    if (this.config.autoConnect && this.state === ConnectionState.DISCONNECTED) {
      process.nextTick(() => {
        this.connect().catch(() => {}); // Ignore errors in mock setup
      });
    }
  }
  
  async connect(options?: Partial<ConnectionOptions>): Promise<void> {
    this.connectCallCount++;
    
    if (this.state === ConnectionState.CONNECTED) {
      return;
    }
    
    this.setState(ConnectionState.CONNECTING);
    
    // Simulate connection delay
    await new Promise(resolve => setTimeout(resolve, 1));
    
    if (this.config.shouldFailConnection) {
      this.setState(ConnectionState.ERROR);
      const error = new Error('Mock connection failed');
      this.emit('error', {
        error,
        context: 'connection',
        recoverable: true
      });
      throw error;
    }
    
    // Create mock socket if not provided
    if (!this.socket) {
      this.socket = new MockSocket({
        connected: false,
        autoConnect: false
      });
    }
    
    // Set up socket event handlers
    this.setupSocketHandlers();
    
    // Simulate socket connection
    this.socket.connect();
    
    // Wait for socket to connect
    await new Promise<void>((resolve) => {
      const onConnect = () => {
        this.setState(ConnectionState.CONNECTED);
        this.emit('connected', {
          timestamp: new Date(),
          attempt: this.reconnectCallCount
        });
        resolve();
      };
      
      this.socket?.once('connect', onConnect);
    });
  }
  
  async disconnect(manual = false): Promise<void> {
    this.disconnectCallCount++;
    
    if (this.state === ConnectionState.DISCONNECTED) {
      return;
    }
    
    const newState = manual ? ConnectionState.MANUAL_DISCONNECT : ConnectionState.DISCONNECTED;
    this.setState(newState);
    
    if (this.socket) {
      this.socket.disconnect();
    }
    
    this.emit('disconnected', {
      timestamp: new Date(),
      reason: manual ? 'manual_disconnect' : 'programmatic_disconnect',
      manual
    });
  }
  
  async reconnect(): Promise<void> {
    this.reconnectCallCount++;
    
    if (this.reconnectCallCount > this.config.maxReconnectAttempts!) {
      const error = new Error(`Max reconnection attempts (${this.config.maxReconnectAttempts}) exceeded`);
      this.setState(ConnectionState.ERROR);
      this.emit('error', {
        error,
        context: 'reconnection',
        recoverable: false
      });
      throw error;
    }
    
    this.setState(ConnectionState.RECONNECTING);
    
    this.emit('reconnection_attempt', {
      attempt: this.reconnectCallCount,
      maxAttempts: this.config.maxReconnectAttempts!,
      delay: this.config.reconnectDelay!,
      reason: 'manual_reconnect'
    });
    
    // Simulate reconnection delay
    await new Promise(resolve => setTimeout(resolve, this.config.reconnectDelay));
    
    await this.connect();
  }
  
  getState(): ConnectionState {
    return this.state;
  }
  
  getMetrics(): ConnectionMetrics {
    return {
      connectionAttempts: this.connectCallCount,
      successfulConnections: this.state === ConnectionState.CONNECTED ? this.connectCallCount : this.connectCallCount - 1,
      failedConnections: this.config.shouldFailConnection ? 1 : 0,
      reconnectionAttempts: this.reconnectCallCount,
      totalDowntime: 0,
      averageLatency: 50,
      lastConnectionTime: this.state === ConnectionState.CONNECTED ? new Date() : null,
      lastDisconnectionTime: this.state === ConnectionState.DISCONNECTED ? new Date() : null,
      lastDisconnectionReason: null,
      bytesReceived: 1024,
      bytesSent: 512,
      messagesReceived: 10,
      messagesSent: 5
    };
  }
  
  getHealth(): HealthStatus {
    return {
      isHealthy: this.state === ConnectionState.CONNECTED,
      latency: this.state === ConnectionState.CONNECTED ? 50 : null,
      lastPing: this.state === ConnectionState.CONNECTED ? new Date() : null,
      consecutiveFailures: this.config.shouldFailConnection ? 1 : 0,
      uptime: this.state === ConnectionState.CONNECTED ? 60000 : 0,
      serverTimestamp: new Date(),
      networkQuality: this.state === ConnectionState.CONNECTED ? 'excellent' : 'unknown'
    };
  }
  
  isConnected(): boolean {
    // CRITICAL: This is where the race condition logic should be tested
    const stateConnected = this.state === ConnectionState.CONNECTED;
    const socketConnected = this.socket?.connected === true;
    return stateConnected && socketConnected;
  }
  
  getSocket(): MockSocket | null {
    return this.socket;
  }
  
  updateOptions(options: Partial<ConnectionOptions>): void {
    this.options = { ...this.options, ...options };
  }
  
  destroy(): void {
    if (this.socket) {
      this.socket.destroy();
      this.socket = null;
    }
    this.removeAllListeners();
    this.emit('destroyed', { timestamp: new Date() });
  }
  
  // Mock-specific methods for testing
  
  getConnectCallCount(): number {
    return this.connectCallCount;
  }
  
  getDisconnectCallCount(): number {
    return this.disconnectCallCount;
  }
  
  getReconnectCallCount(): number {
    return this.reconnectCallCount;
  }
  
  getStateHistory(): Array<{ from: ConnectionState; to: ConnectionState; timestamp: number }> {
    return [...this.stateHistory];
  }
  
  // Force specific states for testing race conditions
  forceState(newState: ConnectionState): void {
    const oldState = this.state;
    this.state = newState;
    this.recordStateChange(oldState, newState);
  }
  
  forceSocketState(socketState: { connected?: boolean; connecting?: boolean; disconnected?: boolean }): void {
    if (this.socket) {
      this.socket.forceState(socketState);
    }
  }
  
  // Simulate race condition: Manager CONNECTED but socket not connected
  simulateRaceCondition(): void {
    this.forceState(ConnectionState.CONNECTED);
    this.forceSocketState({ connected: false, connecting: false, disconnected: false });
  }
  
  // Simulate specific connection scenarios
  simulateConnectionTimeout(): void {
    this.setState(ConnectionState.CONNECTING);
    setTimeout(() => {
      if (this.state === ConnectionState.CONNECTING) {
        this.setState(ConnectionState.ERROR);
        this.emit('error', {
          error: new Error('Connection timeout'),
          context: 'connection_timeout',
          recoverable: true
        });
      }
    }, 100);
  }
  
  simulateIntermittentConnection(): void {
    let connected = false;
    const toggle = () => {
      if (connected) {
        this.disconnect();
      } else {
        this.connect().catch(() => {});
      }
      connected = !connected;
      setTimeout(toggle, 50);
    };
    toggle();
  }
  
  private setupSocketHandlers(): void {
    if (!this.socket) return;
    
    this.socket.on('connect', () => {
      // Socket connect should trigger state change to CONNECTED
      if (this.state !== ConnectionState.CONNECTED) {
        this.setState(ConnectionState.CONNECTED);
      }
    });
    
    this.socket.on('disconnect', (reason: string) => {
      this.setState(ConnectionState.DISCONNECTED);
      this.emit('disconnected', {
        timestamp: new Date(),
        reason,
        manual: reason === 'io client disconnect'
      });
    });
    
    this.socket.on('connect_error', (error: Error) => {
      this.setState(ConnectionState.ERROR);
      this.emit('error', {
        error,
        context: 'socket_connect_error',
        recoverable: true
      });
    });
  }
  
  private setState(newState: ConnectionState): void {
    const oldState = this.state;
    this.state = newState;
    this.recordStateChange(oldState, newState);
    
    this.emit('state_change', {
      from: oldState,
      to: newState,
      timestamp: new Date()
    });
  }
  
  private recordStateChange(from: ConnectionState, to: ConnectionState): void {
    this.stateHistory.push({
      from,
      to,
      timestamp: Date.now()
    });
  }
}

// Mock factory for different scenarios
export const createMockConnectionManager = {
  disconnected: (options: ConnectionOptions = {}) => 
    new MockWebSocketConnectionManager(options, {
      initialState: ConnectionState.DISCONNECTED,
      autoConnect: false
    }),
    
  connected: (options: ConnectionOptions = {}) => {
    const manager = new MockWebSocketConnectionManager(options, {
      initialState: ConnectionState.CONNECTED,
      autoConnect: false
    });
    // Set up connected socket
    manager.forceSocketState({ connected: true, connecting: false, disconnected: false });
    return manager;
  },
  
  connecting: (options: ConnectionOptions = {}) => 
    new MockWebSocketConnectionManager(options, {
      initialState: ConnectionState.CONNECTING,
      autoConnect: false
    }),
    
  error: (options: ConnectionOptions = {}) => 
    new MockWebSocketConnectionManager(options, {
      initialState: ConnectionState.ERROR,
      autoConnect: false,
      shouldFailConnection: true
    }),
    
  raceCondition: (options: ConnectionOptions = {}) => {
    const manager = new MockWebSocketConnectionManager(options, {
      initialState: ConnectionState.CONNECTED,
      autoConnect: false
    });
    // Force race condition: Manager says connected but socket is not
    manager.simulateRaceCondition();
    return manager;
  },
  
  reconnecting: (options: ConnectionOptions = {}) => 
    new MockWebSocketConnectionManager(options, {
      initialState: ConnectionState.RECONNECTING,
      autoConnect: false
    })
};