/**
 * Terminal WebSocket Service
 * Manages WebSocket connections for terminal communication
 */

export interface TerminalMessage {
  type: 'data' | 'resize' | 'ping' | 'pong' | 'error' | 'connect' | 'disconnect';
  data?: string;
  cols?: number;
  rows?: number;
  error?: string;
  timestamp?: number;
}

export interface TerminalConnectionOptions {
  url: string;
  reconnectAttempts?: number;
  reconnectDelay?: number;
  pingInterval?: number;
  maxMessageSize?: number;
}

export class TerminalWebSocketService {
  private ws: WebSocket | null = null;
  private reconnectAttempts = 0;
  private maxReconnectAttempts: number;
  private reconnectDelay: number;
  private pingInterval: number;
  private pingTimer: NodeJS.Timeout | null = null;
  private connectionUrl: string;
  private isConnecting = false;
  private isDestroyed = false;
  private maxMessageSize: number;

  // Event handlers
  private onDataCallback?: (data: string) => void;
  private onConnectCallback?: () => void;
  private onDisconnectCallback?: (reason?: string) => void;
  private onErrorCallback?: (error: string) => void;
  private onStatusChangeCallback?: (status: 'connecting' | 'connected' | 'disconnected' | 'error') => void;

  constructor(options: TerminalConnectionOptions) {
    this.connectionUrl = options.url;
    this.maxReconnectAttempts = options.reconnectAttempts || 5;
    this.reconnectDelay = options.reconnectDelay || 3000;
    this.pingInterval = options.pingInterval || 30000;
    this.maxMessageSize = options.maxMessageSize || 1024 * 1024; // 1MB
  }

  /**
   * Connect to the terminal WebSocket server
   */
  connect(): Promise<void> {
    if (this.isDestroyed) {
      throw new Error('TerminalWebSocketService has been destroyed');
    }

    if (this.ws?.readyState === WebSocket.OPEN) {
      return Promise.resolve();
    }

    if (this.isConnecting) {
      return new Promise((resolve, reject) => {
        const checkConnection = () => {
          if (this.ws?.readyState === WebSocket.OPEN) {
            resolve();
          } else if (!this.isConnecting) {
            reject(new Error('Connection failed'));
          } else {
            setTimeout(checkConnection, 100);
          }
        };
        checkConnection();
      });
    }

    return new Promise((resolve, reject) => {
      this.isConnecting = true;
      this.onStatusChangeCallback?.('connecting');

      try {
        this.ws = new WebSocket(this.connectionUrl);
        
        const connectTimeout = setTimeout(() => {
          if (this.ws?.readyState !== WebSocket.OPEN) {
            this.ws?.close();
            reject(new Error('Connection timeout'));
          }
        }, 10000);

        this.ws.onopen = () => {
          clearTimeout(connectTimeout);
          this.isConnecting = false;
          this.reconnectAttempts = 0;
          this.startPingInterval();
          this.onStatusChangeCallback?.('connected');
          this.onConnectCallback?.();
          resolve();
        };

        this.ws.onmessage = (event) => {
          try {
            if (event.data.length > this.maxMessageSize) {
              console.warn('Received message exceeds maximum size, truncating');
              return;
            }

            const message: TerminalMessage = JSON.parse(event.data);
            this.handleMessage(message);
          } catch (error) {
            // Handle raw data messages (common in terminal communication)
            if (typeof event.data === 'string') {
              this.onDataCallback?.(event.data);
            } else {
              console.error('Failed to parse terminal message:', error);
            }
          }
        };

        this.ws.onclose = (event) => {
          clearTimeout(connectTimeout);
          this.isConnecting = false;
          this.stopPingInterval();
          this.onStatusChangeCallback?.('disconnected');
          
          const reason = event.reason || `Connection closed (code: ${event.code})`;
          this.onDisconnectCallback?.(reason);

          // Attempt reconnection if not manually closed
          if (!this.isDestroyed && event.code !== 1000) {
            this.scheduleReconnect();
          }
        };

        this.ws.onerror = (error) => {
          clearTimeout(connectTimeout);
          this.isConnecting = false;
          this.onStatusChangeCallback?.('error');
          
          const errorMessage = `WebSocket error: ${error}`;
          this.onErrorCallback?.(errorMessage);
          reject(new Error(errorMessage));
        };

      } catch (error) {
        this.isConnecting = false;
        const errorMessage = `Failed to create WebSocket connection: ${error}`;
        this.onErrorCallback?.(errorMessage);
        reject(new Error(errorMessage));
      }
    });
  }

  /**
   * Send data to the terminal
   */
  send(data: string): boolean {
    if (!this.ws || this.ws.readyState !== WebSocket.OPEN) {
      console.warn('Terminal WebSocket not connected');
      return false;
    }

    try {
      if (data.length > this.maxMessageSize) {
        console.warn('Message size exceeds limit, truncating');
        data = data.substring(0, this.maxMessageSize);
      }

      const message: TerminalMessage = {
        type: 'data',
        data,
        timestamp: Date.now()
      };

      this.ws.send(JSON.stringify(message));
      return true;
    } catch (error) {
      console.error('Failed to send terminal data:', error);
      this.onErrorCallback?.(`Failed to send data: ${error}`);
      return false;
    }
  }

  /**
   * Send terminal resize event
   */
  resize(cols: number, rows: number): boolean {
    if (!this.ws || this.ws.readyState !== WebSocket.OPEN) {
      return false;
    }

    try {
      const message: TerminalMessage = {
        type: 'resize',
        cols,
        rows,
        timestamp: Date.now()
      };

      this.ws.send(JSON.stringify(message));
      return true;
    } catch (error) {
      console.error('Failed to send resize event:', error);
      return false;
    }
  }

  /**
   * Disconnect from the terminal
   */
  disconnect(): void {
    if (this.ws) {
      this.ws.close(1000, 'Manual disconnect');
      this.ws = null;
    }
    this.stopPingInterval();
    this.onStatusChangeCallback?.('disconnected');
  }

  /**
   * Destroy the service and cleanup resources
   */
  destroy(): void {
    this.isDestroyed = true;
    this.disconnect();
    this.clearEventHandlers();
  }

  /**
   * Get current connection status
   */
  getConnectionStatus(): 'connecting' | 'connected' | 'disconnected' | 'error' {
    if (this.isConnecting) return 'connecting';
    if (this.ws?.readyState === WebSocket.OPEN) return 'connected';
    if (this.ws?.readyState === WebSocket.CONNECTING) return 'connecting';
    return 'disconnected';
  }

  /**
   * Event handler setters
   */
  onData(callback: (data: string) => void): void {
    this.onDataCallback = callback;
  }

  onConnect(callback: () => void): void {
    this.onConnectCallback = callback;
  }

  onDisconnect(callback: (reason?: string) => void): void {
    this.onDisconnectCallback = callback;
  }

  onError(callback: (error: string) => void): void {
    this.onErrorCallback = callback;
  }

  onStatusChange(callback: (status: 'connecting' | 'connected' | 'disconnected' | 'error') => void): void {
    this.onStatusChangeCallback = callback;
  }

  /**
   * Private methods
   */
  private handleMessage(message: TerminalMessage): void {
    switch (message.type) {
      case 'data':
        if (message.data) {
          this.onDataCallback?.(message.data);
        }
        break;
      case 'ping':
        this.sendPong();
        break;
      case 'pong':
        // Heartbeat received
        break;
      case 'error':
        if (message.error) {
          this.onErrorCallback?.(message.error);
        }
        break;
      default:
        console.warn('Unknown terminal message type:', message.type);
    }
  }

  private startPingInterval(): void {
    this.stopPingInterval();
    this.pingTimer = setInterval(() => {
      this.sendPing();
    }, this.pingInterval);
  }

  private stopPingInterval(): void {
    if (this.pingTimer) {
      clearInterval(this.pingTimer);
      this.pingTimer = null;
    }
  }

  private sendPing(): void {
    if (this.ws?.readyState === WebSocket.OPEN) {
      const message: TerminalMessage = {
        type: 'ping',
        timestamp: Date.now()
      };
      this.ws.send(JSON.stringify(message));
    }
  }

  private sendPong(): void {
    if (this.ws?.readyState === WebSocket.OPEN) {
      const message: TerminalMessage = {
        type: 'pong',
        timestamp: Date.now()
      };
      this.ws.send(JSON.stringify(message));
    }
  }

  private scheduleReconnect(): void {
    if (this.reconnectAttempts >= this.maxReconnectAttempts || this.isDestroyed) {
      this.onErrorCallback?.(`Max reconnection attempts (${this.maxReconnectAttempts}) reached`);
      return;
    }

    this.reconnectAttempts++;
    const delay = Math.min(this.reconnectDelay * Math.pow(2, this.reconnectAttempts - 1), 30000);
    
    setTimeout(() => {
      if (!this.isDestroyed) {
        console.log(`Attempting to reconnect (${this.reconnectAttempts}/${this.maxReconnectAttempts})...`);
        this.connect().catch((error) => {
          console.error('Reconnection failed:', error);
        });
      }
    }, delay);
  }

  private clearEventHandlers(): void {
    this.onDataCallback = undefined;
    this.onConnectCallback = undefined;
    this.onDisconnectCallback = undefined;
    this.onErrorCallback = undefined;
    this.onStatusChangeCallback = undefined;
  }
}