/**
 * Connection Monitor for NLD Integration
 * Monitors WebSocket connections and captures relevant events
 */

import { nld } from './core';

export interface ConnectionConfig {
  url: string;
  reconnectInterval?: number;
  maxReconnectAttempts?: number;
  timeout?: number;
  enableNLD?: boolean;
}

export class NLDConnectionMonitor {
  private socket: WebSocket | null = null;
  private config: ConnectionConfig;
  private connectionState: 'disconnected' | 'connecting' | 'connected' | 'disconnecting' | 'error' = 'disconnected';
  private reconnectAttempts = 0;
  private reconnectTimer: number | null = null;
  private connectionStartTime = 0;
  private lastError: Event | null = null;

  constructor(config: ConnectionConfig) {
    this.config = {
      reconnectInterval: 1000,
      maxReconnectAttempts: 5,
      timeout: 10000,
      enableNLD: true,
      ...config
    };
  }

  connect(): void {
    if (this.connectionState === 'connecting' || this.connectionState === 'connected') {
      this.captureUserAction('duplicate_connect_attempt');
      return;
    }

    this.setState('connecting');
    this.connectionStartTime = Date.now();

    try {
      this.socket = new WebSocket(this.config.url);
      this.setupSocketListeners();

      // Set connection timeout
      const timeout = setTimeout(() => {
        if (this.connectionState === 'connecting') {
          this.captureTimeout();
          this.socket?.close();
        }
      }, this.config.timeout);

      this.socket.addEventListener('open', () => {
        clearTimeout(timeout);
      }, { once: true });

    } catch (error) {
      this.captureError(error);
      this.setState('error');
    }
  }

  disconnect(): void {
    if (this.connectionState === 'disconnected' || this.connectionState === 'disconnecting') {
      this.captureUserAction('duplicate_disconnect_attempt');
      return;
    }

    this.setState('disconnecting');
    this.clearReconnectTimer();
    
    if (this.socket) {
      this.socket.close(1000, 'User initiated disconnect');
    }
  }

  send(data: string | ArrayBufferLike | Blob | ArrayBufferView): void {
    if (this.connectionState !== 'connected') {
      this.captureStateViolation('send_without_connection', {
        currentState: this.connectionState,
        action: 'send'
      });
      throw new Error('Cannot send data: not connected');
    }

    try {
      this.socket?.send(data);
    } catch (error) {
      this.captureError(error);
    }
  }

  private setupSocketListeners(): void {
    if (!this.socket) return;

    this.socket.addEventListener('open', this.handleOpen.bind(this));
    this.socket.addEventListener('message', this.handleMessage.bind(this));
    this.socket.addEventListener('close', this.handleClose.bind(this));
    this.socket.addEventListener('error', this.handleError.bind(this));
  }

  private handleOpen(event: Event): void {
    const connectionDuration = Date.now() - this.connectionStartTime;
    this.setState('connected');
    this.reconnectAttempts = 0;
    
    this.captureConnectionEvent('connection', {
      duration: connectionDuration,
      attempt: this.reconnectAttempts + 1,
      url: this.config.url
    });

    // Check for suspiciously fast connections (potential race condition)
    if (connectionDuration < 50) {
      nld.captureEvent('connection', {
        duration: connectionDuration,
        suspiciouslyFast: true
      }, {
        url: this.config.url
      });
    }
  }

  private handleMessage(event: MessageEvent): void {
    // Monitor message patterns for potential issues
    try {
      const data = JSON.parse(event.data);
      
      // Check for error messages that might indicate server-side issues
      if (data.error || data.type === 'error') {
        this.captureError(data, 'server_error');
      }
    } catch (e) {
      // Non-JSON message, ignore
    }
  }

  private handleClose(event: CloseEvent): void {
    const wasConnected = this.connectionState === 'connected';
    this.setState('disconnected');

    this.captureConnectionEvent('disconnection', {
      code: event.code,
      reason: event.reason,
      wasClean: event.wasClean,
      wasConnected,
      reconnectAttempts: this.reconnectAttempts
    });

    // Determine if this was unexpected
    if (!event.wasClean && wasConnected) {
      this.captureError(event, 'unexpected_disconnection');
    }

    // Auto-reconnect logic
    if (this.shouldReconnect(event)) {
      this.scheduleReconnect();
    }
  }

  private handleError(event: Event): void {
    this.lastError = event;
    this.captureError(event);
    this.setState('error');
  }

  private shouldReconnect(event: CloseEvent): boolean {
    // Don't reconnect if explicitly closed by user
    if (event.code === 1000) return false;
    
    // Don't exceed max attempts
    if (this.reconnectAttempts >= (this.config.maxReconnectAttempts || 5)) {
      this.captureError(new Error('Max reconnect attempts exceeded'), 'max_attempts_exceeded');
      return false;
    }

    return true;
  }

  private scheduleReconnect(): void {
    this.reconnectAttempts++;
    
    // Exponential backoff
    const delay = Math.min(
      this.config.reconnectInterval! * Math.pow(2, this.reconnectAttempts - 1),
      30000 // Max 30 seconds
    );

    this.captureConnectionEvent('retry', {
      attempt: this.reconnectAttempts,
      delay,
      maxAttempts: this.config.maxReconnectAttempts
    });

    this.reconnectTimer = window.setTimeout(() => {
      this.connect();
    }, delay);
  }

  private clearReconnectTimer(): void {
    if (this.reconnectTimer) {
      clearTimeout(this.reconnectTimer);
      this.reconnectTimer = null;
    }
  }

  private setState(newState: typeof this.connectionState): void {
    const previousState = this.connectionState;
    this.connectionState = newState;

    if (this.config.enableNLD) {
      nld.captureEvent('connection', {
        state: newState,
        previousState,
        transition: `${previousState} → ${newState}`,
        timestamp: Date.now()
      }, {
        url: this.config.url
      });
    }

    // Emit state change event
    if (typeof window !== 'undefined') {
      window.dispatchEvent(new CustomEvent('connection:state-change', {
        detail: { previousState, newState, timestamp: Date.now() }
      }));
    }
  }

  private captureConnectionEvent(type: 'connection' | 'disconnection' | 'retry', data: any): void {
    if (!this.config.enableNLD) return;

    nld.captureEvent(type, data, {
      url: this.config.url,
      duration: Date.now() - this.connectionStartTime
    });
  }

  private captureError(error: any, errorType?: string): void {
    if (!this.config.enableNLD) return;

    nld.captureEvent('error', {
      error: error.message || error.toString(),
      errorType: errorType || 'connection_error',
      code: error.code,
      reason: error.reason,
      reconnectAttempts: this.reconnectAttempts,
      connectionState: this.connectionState
    }, {
      url: this.config.url
    });
  }

  private captureTimeout(): void {
    if (!this.config.enableNLD) return;

    nld.captureEvent('timeout', {
      timeout: this.config.timeout,
      connectionState: this.connectionState,
      attempt: this.reconnectAttempts + 1
    }, {
      url: this.config.url,
      duration: Date.now() - this.connectionStartTime
    });
  }

  private captureUserAction(action: string): void {
    if (!this.config.enableNLD) return;

    nld.captureEvent('user_action', {
      action,
      connectionState: this.connectionState,
      timestamp: Date.now()
    }, {
      url: this.config.url
    });
  }

  private captureStateViolation(violation: string, data: any): void {
    if (!this.config.enableNLD) return;

    nld.captureEvent('error', {
      violation,
      severity: 'high',
      ...data
    }, {
      url: this.config.url
    });
  }

  // Public getters
  getState(): string {
    return this.connectionState;
  }

  isConnected(): boolean {
    return this.connectionState === 'connected';
  }

  getReconnectAttempts(): number {
    return this.reconnectAttempts;
  }

  getLastError(): Event | null {
    return this.lastError;
  }
}