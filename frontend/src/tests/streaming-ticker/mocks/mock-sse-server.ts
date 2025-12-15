/**
 * Mock SSE Server for Testing
 *
 * Provides a mock server for testing SSE functionality including:
 * - Simulated EventSource connections
 * - Message broadcasting
 * - Connection state management
 * - Error simulation
 */

import { EventEmitter } from 'events';

export interface MockSSEServerOptions {
  port?: number;
  delay?: number;
  enableLogging?: boolean;
}

export interface MockInstance {
  id: string;
  status: 'running' | 'stopped' | 'starting' | 'not_found';
  connections: Set<MockConnection>;
  messageBuffer: any[];
}

export interface MockConnection {
  instanceId: string;
  isConnected: boolean;
  lastMessageTime: number;
  messageCount: number;
}

export class MockSSEServer extends EventEmitter {
  private instances: Map<string, MockInstance> = new Map();
  private options: Required<MockSSEServerOptions>;
  public port: number;

  constructor(options: MockSSEServerOptions = {}) {
    super();

    this.options = {
      port: options.port || 3001,
      delay: options.delay || 10,
      enableLogging: options.enableLogging || false,
      ...options
    };

    this.port = this.options.port;

    // Initialize default instances
    this.createInstance('claude-test-123', 'running');
    this.createInstance('claude-instance-1', 'running');
    this.createInstance('claude-instance-2', 'running');
  }

  /**
   * Create a mock instance
   */
  createInstance(instanceId: string, status: MockInstance['status'] = 'running'): void {
    this.instances.set(instanceId, {
      id: instanceId,
      status,
      connections: new Set(),
      messageBuffer: []
    });

    this.log(`Created instance: ${instanceId} (${status})`);
  }

  /**
   * Set instance status
   */
  setInstanceStatus(instanceId: string, status: MockInstance['status']): void {
    const instance = this.instances.get(instanceId);
    if (instance) {
      instance.status = status;
      this.log(`Instance ${instanceId} status: ${status}`);
    }
  }

  /**
   * Get instance information
   */
  getInstance(instanceId: string): MockInstance | undefined {
    return this.instances.get(instanceId);
  }

  /**
   * List all instances
   */
  listInstances(): Array<{id: string, status: string}> {
    return Array.from(this.instances.values()).map(instance => ({
      id: instance.id,
      status: instance.status
    }));
  }

  /**
   * Simulate connection to instance
   */
  connectToInstance(instanceId: string): MockConnection {
    const instance = this.instances.get(instanceId);
    if (!instance) {
      throw new Error(`Instance ${instanceId} not found`);
    }

    if (instance.status !== 'running' && instance.status !== 'starting') {
      throw new Error(`Instance ${instanceId} is not running`);
    }

    const connection: MockConnection = {
      instanceId,
      isConnected: true,
      lastMessageTime: Date.now(),
      messageCount: 0
    };

    instance.connections.add(connection);
    this.log(`Connected to instance: ${instanceId}`);

    // Send initial connection message
    setTimeout(() => {
      this.sendToConnection(connection, {
        type: 'connected',
        instanceId,
        timestamp: Date.now()
      });
    }, this.options.delay);

    return connection;
  }

  /**
   * Disconnect from instance
   */
  disconnectFromInstance(instanceId: string): void {
    const instance = this.instances.get(instanceId);
    if (instance) {
      instance.connections.forEach(connection => {
        connection.isConnected = false;
      });
      instance.connections.clear();
      this.log(`Disconnected from instance: ${instanceId}`);
    }
  }

  /**
   * Reconnect to instance (simulate reconnection)
   */
  reconnectInstance(instanceId: string): void {
    const instance = this.instances.get(instanceId);
    if (instance) {
      instance.connections.forEach(connection => {
        connection.isConnected = true;
        connection.lastMessageTime = Date.now();
      });
      this.log(`Reconnected to instance: ${instanceId}`);
    }
  }

  /**
   * Send message to specific instance
   */
  sendToInstance(instanceId: string, message: any): void {
    const instance = this.instances.get(instanceId);
    if (!instance) {
      this.log(`Instance ${instanceId} not found for message`);
      return;
    }

    const fullMessage = {
      ...message,
      instanceId,
      timestamp: message.timestamp || Date.now()
    };

    // Add to buffer
    instance.messageBuffer.push(fullMessage);

    // Send to all connections
    instance.connections.forEach(connection => {
      if (connection.isConnected) {
        this.sendToConnection(connection, fullMessage);
      }
    });

    this.log(`Sent message to ${instanceId}: ${message.type}`);
  }

  /**
   * Send raw data to instance (for testing malformed data)
   */
  sendRawToInstance(instanceId: string, rawData: string): void {
    const instance = this.instances.get(instanceId);
    if (!instance) {
      return;
    }

    instance.connections.forEach(connection => {
      if (connection.isConnected) {
        this.emit(`message:${connection.instanceId}`, rawData);
      }
    });

    this.log(`Sent raw data to ${instanceId}`);
  }

  /**
   * Send message to specific connection
   */
  private sendToConnection(connection: MockConnection, message: any): void {
    if (!connection.isConnected) {
      return;
    }

    connection.messageCount++;
    connection.lastMessageTime = Date.now();

    // Emit message event
    setTimeout(() => {
      this.emit(`message:${connection.instanceId}`, message);
    }, this.options.delay);
  }

  /**
   * Broadcast message to all instances
   */
  broadcast(message: any): void {
    this.instances.forEach((instance, instanceId) => {
      this.sendToInstance(instanceId, message);
    });
  }

  /**
   * Simulate high-frequency messages
   */
  simulateHighFrequency(instanceId: string, messageCount: number, interval: number = 10): void {
    let sent = 0;
    const intervalId = setInterval(() => {
      if (sent >= messageCount) {
        clearInterval(intervalId);
        return;
      }

      this.sendToInstance(instanceId, {
        type: 'terminal_output',
        data: `High frequency message ${sent + 1}`,
        sequenceNumber: sent + 1
      });

      sent++;
    }, interval);
  }

  /**
   * Simulate heartbeat messages
   */
  startHeartbeat(instanceId: string, interval: number = 30000): NodeJS.Timeout {
    return setInterval(() => {
      this.sendToInstance(instanceId, {
        type: 'heartbeat',
        timestamp: Date.now()
      });
    }, interval);
  }

  /**
   * Simulate error conditions
   */
  simulateError(instanceId: string, errorType: string = 'connection_error'): void {
    this.sendToInstance(instanceId, {
      type: 'error',
      errorType,
      message: `Simulated ${errorType}`,
      timestamp: Date.now()
    });
  }

  /**
   * Simulate network latency
   */
  simulateLatency(minMs: number = 50, maxMs: number = 200): void {
    const latency = Math.random() * (maxMs - minMs) + minMs;
    this.options.delay = latency;
  }

  /**
   * Get connection statistics
   */
  getConnectionStats(instanceId?: string): any {
    if (instanceId) {
      const instance = this.instances.get(instanceId);
      if (!instance) {
        return null;
      }

      return {
        instanceId,
        connectionCount: instance.connections.size,
        messageBufferSize: instance.messageBuffer.length,
        totalMessages: Array.from(instance.connections).reduce(
          (sum, conn) => sum + conn.messageCount, 0
        )
      };
    }

    return {
      totalInstances: this.instances.size,
      totalConnections: Array.from(this.instances.values()).reduce(
        (sum, instance) => sum + instance.connections.size, 0
      ),
      instanceStats: Array.from(this.instances.keys()).map(id =>
        this.getConnectionStats(id)
      )
    };
  }

  /**
   * Clear message buffers
   */
  clearMessageBuffers(instanceId?: string): void {
    if (instanceId) {
      const instance = this.instances.get(instanceId);
      if (instance) {
        instance.messageBuffer = [];
      }
    } else {
      this.instances.forEach(instance => {
        instance.messageBuffer = [];
      });
    }
  }

  /**
   * Get message history for instance
   */
  getMessageHistory(instanceId: string): any[] {
    const instance = this.instances.get(instanceId);
    return instance ? [...instance.messageBuffer] : [];
  }

  /**
   * Reset server state
   */
  reset(): void {
    this.instances.clear();
    this.removeAllListeners();

    // Recreate default instances
    this.createInstance('claude-test-123', 'running');
    this.createInstance('claude-instance-1', 'running');
    this.createInstance('claude-instance-2', 'running');

    this.log('Server reset');
  }

  /**
   * Start server (for compatibility)
   */
  async start(): Promise<void> {
    this.log(`Mock SSE Server started on port ${this.port}`);
    return Promise.resolve();
  }

  /**
   * Stop server
   */
  async close(): Promise<void> {
    this.instances.forEach((instance, instanceId) => {
      this.disconnectFromInstance(instanceId);
    });

    this.removeAllListeners();
    this.log('Mock SSE Server closed');
    return Promise.resolve();
  }

  /**
   * Log message (if logging enabled)
   */
  private log(message: string): void {
    if (this.options.enableLogging) {
      console.log(`[MockSSEServer] ${message}`);
    }
  }
}

/**
 * Create and start a mock SSE server
 */
export async function createMockSSEServer(options?: MockSSEServerOptions): Promise<MockSSEServer> {
  const server = new MockSSEServer(options);
  await server.start();
  return server;
}

/**
 * Create mock EventSource that connects to MockSSEServer
 */
export function createMockEventSource(server: MockSSEServer) {
  return class MockEventSource {
    public onopen: ((event: Event) => void) | null = null;
    public onmessage: ((event: MessageEvent) => void) | null = null;
    public onerror: ((event: Event) => void) | null = null;
    public readyState: number = 0;
    public url: string;

    private instanceId: string;
    private connection: MockConnection | null = null;

    constructor(url: string) {
      this.url = url;

      // Extract instance ID from URL
      const match = url.match(/\/instances\/([^\/]+)\/terminal\/stream/);
      this.instanceId = match ? match[1] : 'unknown';

      // Simulate connection
      setTimeout(() => {
        try {
          this.connection = server.connectToInstance(this.instanceId);
          this.readyState = 1; // OPEN
          this.onopen?.(new Event('open'));

          // Listen for messages
          server.on(`message:${this.instanceId}`, (data: any) => {
            if (this.readyState === 1) {
              const event = new MessageEvent('message', {
                data: typeof data === 'string' ? data : JSON.stringify(data)
              });
              this.onmessage?.(event);
            }
          });

        } catch (error) {
          this.readyState = 2; // CLOSED
          this.onerror?.(new Event('error'));
        }
      }, 10);
    }

    close(): void {
      this.readyState = 2; // CLOSED
      if (this.connection) {
        this.connection.isConnected = false;
      }
      server.removeAllListeners(`message:${this.instanceId}`);
    }

    static readonly CONNECTING = 0;
    static readonly OPEN = 1;
    static readonly CLOSED = 2;
  };
}

export default MockSSEServer;