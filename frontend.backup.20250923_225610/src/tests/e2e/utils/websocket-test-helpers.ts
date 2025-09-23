/**
 * WebSocket Test Utilities and Helper Functions
 * Comprehensive utilities for E2E WebSocket testing
 */

import { WebSocket } from 'ws';
import { spawn, ChildProcess } from 'child_process';
import { performance } from 'perf_hooks';
import { EventEmitter } from 'events';

export interface WebSocketTestMessage {
  type: string;
  data: any;
  timestamp: string;
  id: string;
  channel?: string;
  userId?: string;
}

export interface ConnectionStats {
  connectedAt: number;
  messagesSent: number;
  messagesReceived: number;
  reconnectionCount: number;
  lastPingTime: number;
  averageLatency: number;
}

export interface PerformanceMetrics {
  connectionTime: number;
  messageLatency: number[];
  throughput: number;
  errorRate: number;
  reconnectionTime: number;
}

/**
 * Enhanced WebSocket Test Client with comprehensive features
 */
export class EnhancedWebSocketTestClient extends EventEmitter {
  private ws: WebSocket | null = null;
  private messages: WebSocketTestMessage[] = [];
  private listeners: Map<string, Function[]> = new Map();
  private connectionStats: ConnectionStats;
  private performanceMetrics: PerformanceMetrics;
  private heartbeatInterval: NodeJS.Timeout | null = null;
  private reconnectTimer: NodeJS.Timeout | null = null;
  private isReconnecting = false;

  constructor(
    private url: string,
    private options: {
      autoReconnect?: boolean;
      maxReconnectAttempts?: number;
      reconnectDelay?: number;
      heartbeatInterval?: number;
      messageTimeout?: number;
    } = {}
  ) {
    super();
    this.connectionStats = {
      connectedAt: 0,
      messagesSent: 0,
      messagesReceived: 0,
      reconnectionCount: 0,
      lastPingTime: 0,
      averageLatency: 0
    };
    
    this.performanceMetrics = {
      connectionTime: 0,
      messageLatency: [],
      throughput: 0,
      errorRate: 0,
      reconnectionTime: 0
    };
  }

  async connect(connectionOptions?: any): Promise<void> {
    const startTime = performance.now();
    
    return new Promise((resolve, reject) => {
      try {
        this.ws = new WebSocket(this.url, {
          ...connectionOptions,
          headers: {
            'User-Agent': 'WebSocket-Test-Client/1.0',
            'X-Test-Session': `test-${Date.now()}`,
            ...connectionOptions?.headers
          }
        });

        this.ws.on('open', () => {
          this.performanceMetrics.connectionTime = performance.now() - startTime;
          this.connectionStats.connectedAt = Date.now();
          
          console.log(`WebSocket connected to ${this.url} in ${this.performanceMetrics.connectionTime.toFixed(2)}ms`);
          
          this.startHeartbeat();
          this.emit('connected');
          resolve();
        });

        this.ws.on('message', (data) => {
          this.handleMessage(data);
        });

        this.ws.on('close', (code, reason) => {
          this.emit('disconnected', { code, reason: reason.toString() });
          this.stopHeartbeat();
          
          if (this.options.autoReconnect && !this.isReconnecting && code !== 1000) {
            this.scheduleReconnect();
          }
        });

        this.ws.on('error', (error) => {
          this.emit('error', error);
          reject(error);
        });

        this.ws.on('pong', () => {
          const latency = Date.now() - this.connectionStats.lastPingTime;
          this.performanceMetrics.messageLatency.push(latency);
          this.updateAverageLatency();
        });

        // Connection timeout
        setTimeout(() => {
          if (this.ws && this.ws.readyState !== WebSocket.OPEN) {
            this.ws.close();
            reject(new Error('WebSocket connection timeout'));
          }
        }, this.options.messageTimeout || 5000);

      } catch (error) {
        reject(error);
      }
    });
  }

  disconnect(): void {
    this.stopHeartbeat();
    if (this.reconnectTimer) {
      clearTimeout(this.reconnectTimer);
      this.reconnectTimer = null;
    }
    
    if (this.ws) {
      this.ws.close(1000, 'Client disconnect');
      this.ws = null;
    }
  }

  send(type: string, data: any, options?: { 
    timeout?: number;
    expectResponse?: boolean;
    channel?: string;
    priority?: 'low' | 'normal' | 'high';
  }): Promise<WebSocketTestMessage | void> {
    return new Promise((resolve, reject) => {
      if (!this.ws || this.ws.readyState !== WebSocket.OPEN) {
        reject(new Error('WebSocket not connected'));
        return;
      }

      const message: WebSocketTestMessage = {
        type,
        data,
        timestamp: new Date().toISOString(),
        id: this.generateMessageId(),
        channel: options?.channel,
        userId: `test-user-${Date.now()}`
      };

      try {
        this.ws.send(JSON.stringify(message));
        this.connectionStats.messagesSent++;
        this.emit('messageSent', message);

        if (options?.expectResponse) {
          const timeout = options.timeout || this.options.messageTimeout || 5000;
          
          const responseListener = (response: WebSocketTestMessage) => {
            if (response.data?.requestId === message.id || 
                response.data?.correlationId === message.id) {
              resolve(response);
            }
          };

          this.on(`response_${message.id}`, responseListener);

          setTimeout(() => {
            this.off(`response_${message.id}`, responseListener);
            reject(new Error(`Response timeout for message ${message.id}`));
          }, timeout);
        } else {
          resolve();
        }
      } catch (error) {
        reject(error);
      }
    });
  }

  subscribe(type: string, callback: (data: WebSocketTestMessage) => void): () => void {
    if (!this.listeners.has(type)) {
      this.listeners.set(type, []);
    }
    this.listeners.get(type)!.push(callback);

    return () => {
      const typeListeners = this.listeners.get(type);
      if (typeListeners) {
        const index = typeListeners.indexOf(callback);
        if (index > -1) {
          typeListeners.splice(index, 1);
        }
        if (typeListeners.length === 0) {
          this.listeners.delete(type);
        }
      }
    };
  }

  waitForMessage(
    type: string | ((msg: WebSocketTestMessage) => boolean), 
    timeout: number = 5000
  ): Promise<WebSocketTestMessage> {
    return new Promise((resolve, reject) => {
      const predicate = typeof type === 'string' 
        ? (msg: WebSocketTestMessage) => msg.type === type
        : type;

      // Check existing messages first
      const existingMessage = this.messages.find(predicate);
      if (existingMessage) {
        resolve(existingMessage);
        return;
      }

      // Listen for new messages
      const listener = (message: WebSocketTestMessage) => {
        if (predicate(message)) {
          resolve(message);
        }
      };

      this.on('messageReceived', listener);

      setTimeout(() => {
        this.off('messageReceived', listener);
        reject(new Error(`Timeout waiting for message matching criteria`));
      }, timeout);
    });
  }

  waitForMessages(
    count: number, 
    filter?: (msg: WebSocketTestMessage) => boolean,
    timeout: number = 10000
  ): Promise<WebSocketTestMessage[]> {
    return new Promise((resolve, reject) => {
      const matchingMessages: WebSocketTestMessage[] = [];
      const filterFn = filter || (() => true);

      // Check existing messages
      const existingMatches = this.messages.filter(filterFn);
      matchingMessages.push(...existingMatches);

      if (matchingMessages.length >= count) {
        resolve(matchingMessages.slice(0, count));
        return;
      }

      const listener = (message: WebSocketTestMessage) => {
        if (filterFn(message)) {
          matchingMessages.push(message);
          if (matchingMessages.length >= count) {
            this.off('messageReceived', listener);
            resolve(matchingMessages.slice(0, count));
          }
        }
      };

      this.on('messageReceived', listener);

      setTimeout(() => {
        this.off('messageReceived', listener);
        reject(new Error(`Timeout waiting for ${count} messages, got ${matchingMessages.length}`));
      }, timeout);
    });
  }

  private handleMessage(data: Buffer | string): void {
    try {
      const messageData = typeof data === 'string' ? data : data.toString();
      const message: WebSocketTestMessage = JSON.parse(messageData);
      
      message.timestamp = message.timestamp || new Date().toISOString();
      message.id = message.id || this.generateMessageId();

      this.messages.push(message);
      this.connectionStats.messagesReceived++;
      
      this.emit('messageReceived', message);
      this.notifyListeners(message.type, message);

      // Handle correlation responses
      if (message.data?.requestId || message.data?.correlationId) {
        const correlationId = message.data.requestId || message.data.correlationId;
        this.emit(`response_${correlationId}`, message);
      }

      // Handle system messages
      this.handleSystemMessage(message);

    } catch (error) {
      console.error('Failed to parse WebSocket message:', error);
      this.emit('parseError', { error, data });
    }
  }

  private handleSystemMessage(message: WebSocketTestMessage): void {
    switch (message.type) {
      case 'ping':
        this.send('pong', { timestamp: Date.now() });
        break;
      case 'heartbeat':
        this.send('heartbeat_ack', { timestamp: Date.now() });
        break;
      case 'error':
        this.emit('serverError', message.data);
        break;
      case 'system_stats':
        this.emit('systemStats', message.data);
        break;
    }
  }

  private notifyListeners(type: string, message: WebSocketTestMessage): void {
    const listeners = this.listeners.get(type);
    if (listeners) {
      listeners.forEach(listener => {
        try {
          listener(message);
        } catch (error) {
          console.error('Error in message listener:', error);
        }
      });
    }
  }

  private startHeartbeat(): void {
    const interval = this.options.heartbeatInterval || 30000;
    
    this.heartbeatInterval = setInterval(() => {
      if (this.ws && this.ws.readyState === WebSocket.OPEN) {
        this.connectionStats.lastPingTime = Date.now();
        this.ws.ping();
      }
    }, interval);
  }

  private stopHeartbeat(): void {
    if (this.heartbeatInterval) {
      clearInterval(this.heartbeatInterval);
      this.heartbeatInterval = null;
    }
  }

  private scheduleReconnect(): void {
    if (this.isReconnecting) return;
    
    this.isReconnecting = true;
    const delay = (this.options.reconnectDelay || 1000) * Math.pow(2, this.connectionStats.reconnectionCount);
    const maxDelay = 30000; // Max 30 seconds
    const actualDelay = Math.min(delay, maxDelay);

    console.log(`Scheduling reconnect attempt ${this.connectionStats.reconnectionCount + 1} in ${actualDelay}ms`);

    this.reconnectTimer = setTimeout(async () => {
      try {
        const startTime = performance.now();
        await this.connect();
        this.performanceMetrics.reconnectionTime = performance.now() - startTime;
        this.connectionStats.reconnectionCount++;
        this.isReconnecting = false;
        this.emit('reconnected');
      } catch (error) {
        this.isReconnecting = false;
        this.emit('reconnectFailed', error);
        
        if (this.connectionStats.reconnectionCount < (this.options.maxReconnectAttempts || 5)) {
          this.scheduleReconnect();
        }
      }
    }, actualDelay);
  }

  private updateAverageLatency(): void {
    const latencies = this.performanceMetrics.messageLatency;
    this.connectionStats.averageLatency = latencies.reduce((sum, latency) => sum + latency, 0) / latencies.length;
  }

  private generateMessageId(): string {
    return `msg_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  }

  // Getter methods
  getConnectionStats(): ConnectionStats {
    return { ...this.connectionStats };
  }

  getPerformanceMetrics(): PerformanceMetrics {
    return { ...this.performanceMetrics };
  }

  getMessages(filter?: (msg: WebSocketTestMessage) => boolean): WebSocketTestMessage[] {
    return filter ? this.messages.filter(filter) : [...this.messages];
  }

  clearMessages(): void {
    this.messages = [];
  }

  isConnected(): boolean {
    return this.ws !== null && this.ws.readyState === WebSocket.OPEN;
  }

  getConnectionState(): string {
    if (!this.ws) return 'disconnected';
    
    switch (this.ws.readyState) {
      case WebSocket.CONNECTING: return 'connecting';
      case WebSocket.OPEN: return 'connected';
      case WebSocket.CLOSING: return 'closing';
      case WebSocket.CLOSED: return 'closed';
      default: return 'unknown';
    }
  }
}

/**
 * Mock Server Manager for testing
 */
export class MockServerManager {
  private servers: Map<string, ChildProcess> = new Map();
  private configs: Map<string, any> = new Map();

  async startServer(
    name: string, 
    port: number, 
    config: {
      type: 'claude' | 'hub' | 'proxy';
      behavior?: any;
      latency?: number;
      errorRate?: number;
    }
  ): Promise<void> {
    if (this.servers.has(name)) {
      throw new Error(`Server ${name} is already running`);
    }

    this.configs.set(name, { port, ...config });

    return new Promise((resolve, reject) => {
      const serverScript = this.generateServerScript(port, config);
      
      const server = spawn('node', ['-e', serverScript], {
        stdio: 'pipe',
        env: { ...process.env, NODE_ENV: 'test' }
      });

      this.servers.set(name, server);

      server.stdout?.on('data', (data) => {
        const output = data.toString();
        console.log(`[${name}:${port}] ${output.trim()}`);
        
        if (output.includes(`Server started on port ${port}`)) {
          resolve();
        }
      });

      server.stderr?.on('data', (data) => {
        console.error(`[${name}:${port}] ERROR: ${data.toString().trim()}`);
      });

      server.on('error', (error) => {
        console.error(`Failed to start server ${name}:`, error);
        this.servers.delete(name);
        reject(error);
      });

      server.on('exit', (code, signal) => {
        console.log(`Server ${name} exited with code ${code}, signal ${signal}`);
        this.servers.delete(name);
      });

      setTimeout(() => {
        if (!output || !output.includes('Server started')) {
          this.stopServer(name);
          reject(new Error(`Timeout starting server ${name} on port ${port}`));
        }
      }, 10000);
    });
  }

  stopServer(name: string): void {
    const server = this.servers.get(name);
    if (server) {
      server.kill('SIGTERM');
      this.servers.delete(name);
      this.configs.delete(name);
      console.log(`Stopped server ${name}`);
    }
  }

  stopAllServers(): void {
    for (const name of this.servers.keys()) {
      this.stopServer(name);
    }
  }

  getServerConfig(name: string) {
    return this.configs.get(name);
  }

  isServerRunning(name: string): boolean {
    const server = this.servers.get(name);
    return server !== undefined && !server.killed;
  }

  private generateServerScript(port: number, config: any): string {
    const serverType = config.type;
    const latency = config.latency || 0;
    const errorRate = config.errorRate || 0;

    switch (serverType) {
      case 'claude':
        return `
          const WebSocket = require('ws');
          const server = new WebSocket.Server({ port: ${port} });
          
          server.on('connection', (ws) => {
            console.log('Claude instance connected');
            
            ws.on('message', (data) => {
              try {
                const message = JSON.parse(data);
                
                // Simulate processing latency
                setTimeout(() => {
                  // Simulate error rate
                  if (Math.random() < ${errorRate}) {
                    ws.send(JSON.stringify({
                      type: 'error',
                      data: { message: 'Simulated error', code: 'TEST_ERROR' },
                      requestId: message.id
                    }));
                    return;
                  }
                  
                  // Send successful response
                  ws.send(JSON.stringify({
                    type: 'response',
                    data: {
                      response: 'Claude processed: ' + (message.data?.prompt || 'unknown'),
                      instance: 'claude-${port}',
                      timestamp: new Date().toISOString(),
                      processingTime: ${latency}
                    },
                    requestId: message.id
                  }));
                }, ${latency});
              } catch (error) {
                ws.send(JSON.stringify({
                  type: 'error',
                  data: { message: 'Invalid message format', error: error.message },
                  requestId: 'unknown'
                }));
              }
            });
          });
          
          console.log('Server started on port ${port}');
        `;

      case 'hub':
        return `
          const WebSocket = require('ws');
          const server = new WebSocket.Server({ port: ${port} });
          const clients = new Set();
          
          server.on('connection', (ws, req) => {
            console.log('Hub client connected');
            clients.add(ws);
            
            ws.on('message', (data) => {
              try {
                const message = JSON.parse(data);
                
                // Route message based on type and instance
                setTimeout(() => {
                  if (message.type === 'claude_request') {
                    // Forward to appropriate Claude instance
                    console.log('Routing message to Claude instance:', message.data.instance);
                  }
                  
                  // Echo back for testing
                  ws.send(JSON.stringify({
                    type: 'hub_response',
                    data: {
                      routed: true,
                      original: message,
                      timestamp: new Date().toISOString()
                    },
                    requestId: message.id
                  }));
                }, ${latency});
              } catch (error) {
                console.error('Hub error:', error);
              }
            });
            
            ws.on('close', () => {
              clients.delete(ws);
            });
          });
          
          console.log('Server started on port ${port}');
        `;

      default:
        return `
          const WebSocket = require('ws');
          const server = new WebSocket.Server({ port: ${port} });
          
          server.on('connection', (ws) => {
            ws.on('message', (data) => {
              setTimeout(() => {
                ws.send(data); // Echo back
              }, ${latency});
            });
          });
          
          console.log('Server started on port ${port}');
        `;
    }
  }
}

/**
 * Performance and Load Testing Utilities
 */
export class LoadTestRunner {
  private clients: EnhancedWebSocketTestClient[] = [];
  private results: any[] = [];

  async runLoadTest(config: {
    url: string;
    clientCount: number;
    messagesPerClient: number;
    duration?: number;
    messageInterval?: number;
    messageType?: string;
    payloadSize?: number;
  }): Promise<{
    totalMessages: number;
    successfulMessages: number;
    failedMessages: number;
    averageLatency: number;
    throughput: number;
    errorRate: number;
    duration: number;
  }> {
    console.log(`Starting load test with ${config.clientCount} clients...`);
    
    const startTime = performance.now();
    
    // Create clients
    for (let i = 0; i < config.clientCount; i++) {
      const client = new EnhancedWebSocketTestClient(`${config.url}?clientId=${i}`, {
        autoReconnect: true,
        maxReconnectAttempts: 3
      });
      
      this.clients.push(client);
    }

    // Connect all clients
    await Promise.all(
      this.clients.map(client => client.connect().catch(error => {
        console.error('Client connection failed:', error);
      }))
    );

    const connectedClients = this.clients.filter(client => client.isConnected());
    console.log(`${connectedClients.length}/${config.clientCount} clients connected`);

    // Send messages
    const promises: Promise<any>[] = [];
    const messageData = this.generatePayload(config.payloadSize || 1024);

    connectedClients.forEach((client, clientIndex) => {
      for (let msgIndex = 0; msgIndex < config.messagesPerClient; msgIndex++) {
        promises.push(
          new Promise(async (resolve) => {
            try {
              const messageStartTime = performance.now();
              
              await client.send(config.messageType || 'load_test', {
                clientId: clientIndex,
                messageId: msgIndex,
                timestamp: Date.now(),
                data: messageData
              }, { expectResponse: true, timeout: 10000 });
              
              const messageEndTime = performance.now();
              
              resolve({
                success: true,
                latency: messageEndTime - messageStartTime,
                clientId: clientIndex,
                messageId: msgIndex
              });
            } catch (error) {
              resolve({
                success: false,
                error: error.message,
                clientId: clientIndex,
                messageId: msgIndex
              });
            }
          })
        );
      }
    });

    // Wait for all messages
    this.results = await Promise.all(promises);
    const endTime = performance.now();

    // Calculate statistics
    const totalMessages = this.results.length;
    const successfulMessages = this.results.filter(r => r.success).length;
    const failedMessages = totalMessages - successfulMessages;
    const latencies = this.results.filter(r => r.success).map(r => r.latency);
    const averageLatency = latencies.reduce((sum, lat) => sum + lat, 0) / latencies.length;
    const duration = endTime - startTime;
    const throughput = (successfulMessages / duration) * 1000; // messages per second
    const errorRate = failedMessages / totalMessages;

    // Clean up
    this.clients.forEach(client => client.disconnect());
    this.clients = [];

    return {
      totalMessages,
      successfulMessages,
      failedMessages,
      averageLatency,
      throughput,
      errorRate,
      duration
    };
  }

  private generatePayload(size: number): string {
    return 'x'.repeat(size);
  }

  getDetailedResults() {
    return this.results;
  }
}

/**
 * Test Data Generators
 */
export class TestDataGenerator {
  static generateClaudeRequest(options?: {
    prompt?: string;
    instance?: 'dev' | 'prod';
    channel?: string;
    priority?: 'low' | 'normal' | 'high';
  }) {
    return {
      type: 'claude_request',
      data: {
        prompt: options?.prompt || `Test prompt ${Date.now()}`,
        instance: options?.instance || 'prod',
        channel: options?.channel || `test-channel-${Math.random().toString(36).substr(2, 9)}`,
        priority: options?.priority || 'normal',
        metadata: {
          source: 'e2e-test',
          timestamp: new Date().toISOString(),
          testId: Math.random().toString(36).substr(2, 9)
        }
      }
    };
  }

  static generateBulkMessages(count: number, template?: any): any[] {
    const messages = [];
    for (let i = 0; i < count; i++) {
      messages.push({
        ...template,
        id: `bulk_${i}_${Date.now()}`,
        data: {
          ...template?.data,
          index: i,
          timestamp: new Date().toISOString()
        }
      });
    }
    return messages;
  }

  static generateSecurityTestPayloads(): any[] {
    return [
      // XSS attempts
      { type: 'xss_test', data: { content: '<script>alert("xss")</script>' } },
      { type: 'xss_test', data: { content: 'javascript:alert("xss")' } },
      
      // Injection attempts
      { type: 'injection_test', data: { query: "'; DROP TABLE users; --" } },
      { type: 'injection_test', data: { command: 'rm -rf /' } },
      
      // Oversized payloads
      { type: 'size_test', data: { content: 'x'.repeat(1000000) } },
      
      // Malformed data
      { type: 'format_test', data: null },
      { type: 'format_test', data: undefined },
      { type: 'format_test', data: { circular: {} } }
    ];
  }
}