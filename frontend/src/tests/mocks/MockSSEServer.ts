/**
 * Mock SSE Server for Testing
 * Simulates real SSE server behavior with configurable scenarios
 */

import { EventEmitter } from 'events';
import { TestConfig, TEST_SCENARIOS } from '../config/sse-migration-test-config';

export interface MockSSEMessage {
  id?: string;
  event?: string;
  data: any;
  retry?: number;
}

export interface MockSSEServerOptions {
  port?: number;
  delay?: number;
  errorRate?: number;
  scenario?: keyof typeof TEST_SCENARIOS;
}

export class MockSSEServer extends EventEmitter {
  private connections: Map<string, MockSSEConnection> = new Map();
  private isRunning = false;
  private messageQueue: MockSSEMessage[] = [];
  private options: MockSSEServerOptions;

  constructor(options: MockSSEServerOptions = {}) {
    super();
    this.options = {
      port: 3002,
      delay: 100,
      errorRate: 0.1,
      ...options,
    };
  }

  start(): Promise<void> {
    return new Promise((resolve) => {
      this.isRunning = true;
      this.emit('server:started', { port: this.options.port });
      resolve();
    });
  }

  stop(): Promise<void> {
    return new Promise((resolve) => {
      this.isRunning = false;
      this.connections.clear();
      this.messageQueue = [];
      this.emit('server:stopped');
      resolve();
    });
  }

  createConnection(clientId: string): MockSSEConnection {
    const connection = new MockSSEConnection(clientId, this.options);
    this.connections.set(clientId, connection);
    
    // Process queued messages
    this.messageQueue.forEach(message => {
      connection.sendMessage(message);
    });
    
    this.emit('connection:created', { clientId, total: this.connections.size });
    return connection;
  }

  closeConnection(clientId: string): void {
    const connection = this.connections.get(clientId);
    if (connection) {
      connection.close();
      this.connections.delete(clientId);
      this.emit('connection:closed', { clientId, total: this.connections.size });
    }
  }

  broadcast(message: MockSSEMessage): void {
    if (this.connections.size === 0) {
      this.messageQueue.push(message);
      return;
    }

    this.connections.forEach((connection, clientId) => {
      if (Math.random() > this.options.errorRate!) {
        connection.sendMessage(message);
      } else {
        connection.simulateError(new Error('Simulated network error'));
      }
    });

    this.emit('message:broadcast', { message, recipients: this.connections.size });
  }

  sendToClient(clientId: string, message: MockSSEMessage): void {
    const connection = this.connections.get(clientId);
    if (connection) {
      if (Math.random() > this.options.errorRate!) {
        connection.sendMessage(message);
      } else {
        connection.simulateError(new Error('Simulated client error'));
      }
    }
  }

  simulateScenario(scenario: keyof typeof TEST_SCENARIOS): void {
    const scenarioConfig = TEST_SCENARIOS[scenario];
    this.options = { ...this.options, ...scenarioConfig.config.mock };
    
    switch (scenario) {
      case 'networkFailure':
        this.simulateNetworkFailure();
        break;
      case 'highVolume':
        this.simulateHighVolume();
        break;
      case 'serverError':
        this.simulateServerError();
        break;
      case 'connectionDrop':
        this.simulateConnectionDrop();
        break;
    }
  }

  private simulateNetworkFailure(): void {
    this.connections.forEach(connection => {
      connection.simulateNetworkFailure();
    });
  }

  private simulateHighVolume(): void {
    const messageCount = 1000;
    const interval = setInterval(() => {
      if (this.connections.size === 0) {
        clearInterval(interval);
        return;
      }

      this.broadcast({
        event: 'high-volume-test',
        data: { timestamp: Date.now(), index: Math.random() },
      });
    }, 10);

    setTimeout(() => clearInterval(interval), messageCount * 10);
  }

  private simulateServerError(): void {
    this.connections.forEach(connection => {
      connection.simulateError(new Error('500 Internal Server Error'));
    });
  }

  private simulateConnectionDrop(): void {
    this.connections.forEach((connection, clientId) => {
      setTimeout(() => {
        connection.simulateDisconnect();
        // Simulate reconnection after delay
        setTimeout(() => {
          this.createConnection(clientId);
        }, 2000);
      }, Math.random() * 5000);
    });
  }

  getStats() {
    return {
      isRunning: this.isRunning,
      connections: this.connections.size,
      queuedMessages: this.messageQueue.length,
      options: this.options,
    };
  }
}

export class MockSSEConnection extends EventEmitter {
  private clientId: string;
  private isConnected = false;
  private messageBuffer: MockSSEMessage[] = [];
  private options: MockSSEServerOptions;

  constructor(clientId: string, options: MockSSEServerOptions) {
    super();
    this.clientId = clientId;
    this.options = options;
    this.connect();
  }

  private connect(): void {
    setTimeout(() => {
      this.isConnected = true;
      this.emit('open');
      
      // Send buffered messages
      this.messageBuffer.forEach(message => {
        this.sendMessage(message);
      });
      this.messageBuffer = [];
    }, this.options.delay);
  }

  sendMessage(message: MockSSEMessage): void {
    if (!this.isConnected) {
      this.messageBuffer.push(message);
      return;
    }

    setTimeout(() => {
      if (this.isConnected) {
        const sseEvent = this.formatSSEMessage(message);
        this.emit('message', { data: sseEvent });
      }
    }, this.options.delay);
  }

  private formatSSEMessage(message: MockSSEMessage): string {
    let sseData = '';
    
    if (message.id) {
      sseData += `id: ${message.id}\n`;
    }
    
    if (message.event) {
      sseData += `event: ${message.event}\n`;
    }
    
    if (message.retry) {
      sseData += `retry: ${message.retry}\n`;
    }
    
    const dataStr = typeof message.data === 'string' 
      ? message.data 
      : JSON.stringify(message.data);
    
    sseData += `data: ${dataStr}\n\n`;
    
    return sseData;
  }

  simulateError(error: Error): void {
    this.emit('error', error);
  }

  simulateDisconnect(): void {
    this.isConnected = false;
    this.emit('close');
  }

  simulateNetworkFailure(): void {
    this.simulateDisconnect();
    // Simulate reconnection attempt
    setTimeout(() => {
      if (Math.random() > 0.5) {
        this.connect();
      }
    }, 2000);
  }

  close(): void {
    this.isConnected = false;
    this.messageBuffer = [];
    this.emit('close');
  }

  isAlive(): boolean {
    return this.isConnected;
  }
}

// Test utilities for mock server
export class MockSSETestUtils {
  static async withMockServer<T>(
    options: MockSSEServerOptions,
    testFn: (server: MockSSEServer) => Promise<T>
  ): Promise<T> {
    const server = new MockSSEServer(options);
    
    try {
      await server.start();
      return await testFn(server);
    } finally {
      await server.stop();
    }
  }

  static createMockEventSource(url: string): MockEventSource {
    return new MockEventSource(url);
  }

  static async waitForConnection(server: MockSSEServer, clientId: string, timeout = 5000): Promise<void> {
    return new Promise((resolve, reject) => {
      const timer = setTimeout(() => {
        reject(new Error(`Connection timeout for client ${clientId}`));
      }, timeout);

      server.on('connection:created', (data) => {
        if (data.clientId === clientId) {
          clearTimeout(timer);
          resolve();
        }
      });
    });
  }

  static async waitForMessage(connection: MockSSEConnection, timeout = 5000): Promise<any> {
    return new Promise((resolve, reject) => {
      const timer = setTimeout(() => {
        reject(new Error('Message timeout'));
      }, timeout);

      connection.once('message', (data) => {
        clearTimeout(timer);
        resolve(data);
      });
    });
  }
}

// Mock EventSource for testing
export class MockEventSource extends EventEmitter {
  public readyState: number = 0;
  public url: string;
  
  static readonly CONNECTING = 0;
  static readonly OPEN = 1;
  static readonly CLOSED = 2;

  constructor(url: string) {
    super();
    this.url = url;
    
    // Simulate connection
    setTimeout(() => {
      this.readyState = MockEventSource.OPEN;
      this.emit('open');
    }, 100);
  }

  close(): void {
    this.readyState = MockEventSource.CLOSED;
    this.emit('close');
  }

  // Test helper methods
  simulateMessage(data: any, event?: string): void {
    this.emit('message', {
      data: typeof data === 'string' ? data : JSON.stringify(data),
      type: event || 'message',
    });
  }

  simulateError(error: Error): void {
    this.emit('error', error);
  }

  simulateClose(): void {
    this.readyState = MockEventSource.CLOSED;
    this.emit('close');
  }
}