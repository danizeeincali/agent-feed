interface ConnectionParams {
  url: string;
  protocols?: string[];
  timeout?: number;
  retryAttempts?: number;
}

interface ConnectionState {
  state: string;
  url: string;
  protocol?: string;
  connectTime: number;
}

interface NetworkManager {
  createWebSocketConnection: (params: ConnectionParams) => Promise<WebSocket> | WebSocket;
  validateConnectionParams: (params: ConnectionParams) => boolean;
  handleConnectionFailure: (error: Error) => { shouldRetry: boolean; retryDelay: number; fallbackAvailable: boolean };
  monitorConnectionHealth: () => { isHealthy: boolean; lastPingTime: number; missedPongs: number };
}

interface HeartbeatManager {
  start: () => NodeJS.Timeout | number;
  stop: () => void;
  sendPing: () => void;
  receivePong: () => void;
}

export class WebSocketManager {
  private ws: WebSocket | null = null;
  private connectionState: ConnectionState | null = null;
  private eventListeners: Map<string, Set<Function>> = new Map();
  private isProductionMode: boolean;
  private networkManager: NetworkManager;
  private heartbeatManager: HeartbeatManager;

  constructor(networkManager: NetworkManager, heartbeatManager: HeartbeatManager) {
    this.isProductionMode = process.env.NODE_ENV === 'production';
    this.networkManager = networkManager;
    this.heartbeatManager = heartbeatManager;
  }

  async connect(params: ConnectionParams): Promise<{ success: boolean; connection?: WebSocket }> {
    try {
      if (!this.networkManager.validateConnectionParams(params)) {
        throw new Error('Invalid connection parameters');
      }

      const ws = await this.networkManager.createWebSocketConnection(params);
      
      return new Promise((resolve, reject) => {
        const timeout = setTimeout(() => {
          reject(new Error('Connection timeout'));
        }, params.timeout || 10000);

        ws.onopen = () => {
          clearTimeout(timeout);
          this.ws = ws;
          this.connectionState = {
            state: 'connected',
            url: params.url,
            protocol: ws.protocol,
            connectTime: Date.now()
          };
          
          this.setupEventHandlers();
          resolve({ success: true, connection: ws });
        };

        ws.onerror = (error) => {
          clearTimeout(timeout);
          reject(new Error(`WebSocket connection failed: ${error}`));
        };
      });
    } catch (error) {
      const failure = this.networkManager.handleConnectionFailure(error as Error);
      throw new Error(error instanceof Error ? error.message : 'Connection failed');
    }
  }

  disconnect(): void {
    if (this.ws) {
      this.ws.close();
      this.ws = null;
      this.connectionState = null;
    }
  }

  async send(message: any): Promise<{ sent: boolean; messageId?: string }> {
    if (!this.ws || this.ws.readyState !== WebSocket.OPEN) {
      throw new Error('WebSocket not connected');
    }

    try {
      this.ws.send(JSON.stringify(message));
      return {
        sent: true,
        messageId: `msg-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`
      };
    } catch (error) {
      throw new Error(`Failed to send message: ${error}`);
    }
  }

  subscribe(event: string, handler: Function): () => void {
    if (!this.eventListeners.has(event)) {
      this.eventListeners.set(event, new Set());
    }
    this.eventListeners.get(event)!.add(handler);

    return () => {
      const handlers = this.eventListeners.get(event);
      if (handlers) {
        handlers.delete(handler);
      }
    };
  }

  unsubscribe(event: string, handler?: Function): void {
    if (handler) {
      const handlers = this.eventListeners.get(event);
      if (handlers) {
        handlers.delete(handler);
      }
    } else {
      this.eventListeners.delete(event);
    }
  }

  isConnected(): boolean {
    return this.ws !== null && this.ws.readyState === WebSocket.OPEN;
  }

  getConnectionState(): ConnectionState | null {
    return this.connectionState;
  }

  async reconnect(): Promise<{ success: boolean; attemptNumber: number }> {
    if (this.connectionState) {
      try {
        await this.connect({
          url: this.connectionState.url,
          timeout: 10000
        });
        return { success: true, attemptNumber: 1 };
      } catch (error) {
        return { success: false, attemptNumber: 1 };
      }
    }
    return { success: false, attemptNumber: 0 };
  }

  private setupEventHandlers(): void {
    if (!this.ws) return;

    this.ws.onmessage = (event) => {
      try {
        const data = JSON.parse(event.data);
        this.emit('message', data);
        
        if (data.type) {
          this.emit(data.type, data);
        }
      } catch (error) {
        console.error('Failed to parse WebSocket message:', error);
      }
    };

    this.ws.onclose = () => {
      this.emit('close', null);
      this.connectionState = null;
    };

    this.ws.onerror = (error) => {
      this.emit('error', error);
    };
  }

  private emit(event: string, data: any): void {
    const handlers = this.eventListeners.get(event);
    if (handlers) {
      handlers.forEach(handler => {
        try {
          handler(data);
        } catch (error) {
          console.error(`Error in WebSocket event handler for ${event}:`, error);
        }
      });
    }
  }
}

// Production implementation with real WebSocket
export class ProductionWebSocketManager extends WebSocketManager {
  constructor() {
    const networkManager: NetworkManager = {
      createWebSocketConnection: (params) => {
        return new WebSocket(params.url, params.protocols);
      },
      validateConnectionParams: (params) => {
        return !!(params.url && params.url.startsWith('ws'));
      },
      handleConnectionFailure: (error) => ({
        shouldRetry: true,
        retryDelay: 5000,
        fallbackAvailable: false
      }),
      monitorConnectionHealth: () => ({
        isHealthy: true,
        lastPingTime: Date.now(),
        missedPongs: 0
      })
    };

    const heartbeatManager: HeartbeatManager = {
      start: () => setInterval(() => this.sendHeartbeat(), 30000),
      stop: () => {},
      sendPing: () => this.sendHeartbeat(),
      receivePong: () => {}
    };

    super(networkManager, heartbeatManager);
  }

  private sendHeartbeat(): void {
    this.send({ type: 'ping', timestamp: Date.now() }).catch(() => {
      // Handle ping failure
    });
  }
}
