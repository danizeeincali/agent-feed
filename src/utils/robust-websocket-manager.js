/**
 * SPARC Robust WebSocket Manager
 * Implements connection lifecycle management with automatic recovery
 */

class RobustWebSocketManager {
  constructor(options = {}) {
    this.url = options.url || 'ws://localhost:3002/terminal';
    this.maxReconnectAttempts = options.maxReconnectAttempts || 5;
    this.baseReconnectDelay = options.baseReconnectDelay || 1000;
    this.maxReconnectDelay = options.maxReconnectDelay || 30000;
    this.heartbeatInterval = options.heartbeatInterval || 30000;
    this.responseTimeout = options.responseTimeout || 5000;
    
    // Connection state
    this.connectionState = 'DISCONNECTED';
    this.socket = null;
    this.reconnectAttempts = 0;
    this.lastHeartbeat = null;
    this.lastPong = null;
    
    // Event handlers
    this.eventHandlers = {
      connect: [],
      disconnect: [],
      message: [],
      error: [],
      reconnect: []
    };
    
    // Timers
    this.reconnectTimer = null;
    this.heartbeatTimer = null;
    this.responseTimeoutTimer = null;
    
    // Statistics
    this.stats = {
      connectAttempts: 0,
      successfulConnections: 0,
      disconnections: 0,
      reconnections: 0,
      messagesReceived: 0,
      messagesSent: 0,
      averageLatency: 0
    };
  }
  
  /**
   * Establish WebSocket connection
   */
  async connect() {
    if (this.connectionState === 'CONNECTING' || this.connectionState === 'CONNECTED') {
      return Promise.resolve();
    }
    
    this.connectionState = 'CONNECTING';
    this.stats.connectAttempts++;
    
    return new Promise((resolve, reject) => {
      try {
        console.log(`🔌 Connecting to ${this.url}...`);
        
        // Import Socket.IO client (assuming browser environment)
        if (typeof io !== 'undefined') {
          this.socket = io('/terminal', {
            transports: ['websocket', 'polling'],
            timeout: this.responseTimeout,
            reconnection: false // We handle reconnection ourselves
          });
        } else {
          // Node.js environment - use WebSocket directly
          const WebSocket = require('ws');
          this.socket = new WebSocket(this.url);
        }
        
        this.setupEventHandlers(resolve, reject);
        
      } catch (error) {
        this.connectionState = 'DISCONNECTED';
        console.error('Connection setup error:', error);
        reject(error);
      }
    });
  }
  
  /**
   * Setup WebSocket event handlers
   */
  setupEventHandlers(connectResolve, connectReject) {
    const connectTimeout = setTimeout(() => {
      this.connectionState = 'DISCONNECTED';
      connectReject(new Error('Connection timeout'));
    }, this.responseTimeout);
    
    // Connection opened
    const onOpen = () => {
      clearTimeout(connectTimeout);
      this.connectionState = 'CONNECTED';
      this.stats.successfulConnections++;
      this.reconnectAttempts = 0;
      
      console.log('✅ WebSocket connected');
      
      this.startHeartbeat();
      this.emit('connect');
      connectResolve();
    };
    
    // Message received
    const onMessage = (data) => {
      this.stats.messagesReceived++;
      this.updateLatency();
      
      // Handle pong responses
      if (this.isPongMessage(data)) {
        this.lastPong = Date.now();
        return;
      }
      
      this.emit('message', data);
    };
    
    // Connection closed
    const onClose = (code, reason) => {
      clearTimeout(connectTimeout);
      this.connectionState = 'DISCONNECTED';
      this.stats.disconnections++;
      
      console.log(`🔌 WebSocket closed: ${code} - ${reason}`);
      
      this.stopHeartbeat();
      this.emit('disconnect', { code, reason });
      
      // Schedule reconnection if not intentional disconnect
      if (code !== 1000 && this.reconnectAttempts < this.maxReconnectAttempts) {
        this.scheduleReconnection();
      }
    };
    
    // Error occurred
    const onError = (error) => {
      console.error('🔌 WebSocket error:', error);
      this.emit('error', error);
      
      if (this.connectionState === 'CONNECTING') {
        clearTimeout(connectTimeout);
        connectReject(error);
      }
    };
    
    // Attach handlers based on socket type
    if (this.socket.on) {
      // Socket.IO
      this.socket.on('connect', onOpen);
      this.socket.on('message', onMessage);
      this.socket.on('disconnect', onClose);
      this.socket.on('connect_error', onError);
    } else {
      // Native WebSocket
      this.socket.onopen = onOpen;
      this.socket.onmessage = (event) => onMessage(event.data);
      this.socket.onclose = (event) => onClose(event.code, event.reason);
      this.socket.onerror = onError;
    }
  }
  
  /**
   * Disconnect WebSocket
   */
  disconnect() {
    if (this.socket) {
      this.connectionState = 'DISCONNECTING';
      
      // Clear timers
      this.stopHeartbeat();
      if (this.reconnectTimer) {
        clearTimeout(this.reconnectTimer);
        this.reconnectTimer = null;
      }
      
      // Close connection
      if (this.socket.disconnect) {
        this.socket.disconnect();
      } else {
        this.socket.close(1000, 'Client disconnect');
      }
      
      this.socket = null;
      this.connectionState = 'DISCONNECTED';
    }
  }
  
  /**
   * Send message through WebSocket
   */
  send(data) {
    if (this.connectionState !== 'CONNECTED' || !this.socket) {
      throw new Error('WebSocket not connected');
    }
    
    try {
      if (this.socket.emit) {
        // Socket.IO
        this.socket.emit('message', data);
      } else {
        // Native WebSocket
        this.socket.send(typeof data === 'string' ? data : JSON.stringify(data));
      }
      
      this.stats.messagesSent++;
      return true;
      
    } catch (error) {
      console.error('Failed to send message:', error);
      return false;
    }
  }
  
  /**
   * Start heartbeat monitoring
   */
  startHeartbeat() {
    if (this.heartbeatTimer) return;
    
    this.heartbeatTimer = setInterval(() => {
      if (this.connectionState === 'CONNECTED') {
        this.sendHeartbeat();
        this.checkHeartbeatResponse();
      }
    }, this.heartbeatInterval);
  }
  
  /**
   * Stop heartbeat monitoring
   */
  stopHeartbeat() {
    if (this.heartbeatTimer) {
      clearInterval(this.heartbeatTimer);
      this.heartbeatTimer = null;
    }
  }
  
  /**
   * Send heartbeat ping
   */
  sendHeartbeat() {
    this.lastHeartbeat = Date.now();
    
    try {
      if (this.socket.emit) {
        this.socket.emit('ping', { timestamp: this.lastHeartbeat });
      } else {
        this.socket.send(JSON.stringify({ type: 'ping', timestamp: this.lastHeartbeat }));
      }
    } catch (error) {
      console.error('Failed to send heartbeat:', error);
    }
  }
  
  /**
   * Check heartbeat response
   */
  checkHeartbeatResponse() {
    if (this.lastHeartbeat && this.lastPong) {
      const timeSinceHeartbeat = Date.now() - this.lastHeartbeat;
      const timeSincePong = Date.now() - this.lastPong;
      
      // If no pong received within timeout, consider connection stale
      if (timeSincePong > this.responseTimeout && timeSinceHeartbeat > this.responseTimeout) {
        console.warn('🔌 Heartbeat timeout - connection may be stale');
        this.forceReconnection();
      }
    }
  }
  
  /**
   * Check if message is a pong response
   */
  isPongMessage(data) {
    try {
      const parsed = typeof data === 'string' ? JSON.parse(data) : data;
      return parsed.type === 'pong';
    } catch (error) {
      return false;
    }
  }
  
  /**
   * Force reconnection
   */
  forceReconnection() {
    console.log('🔄 Forcing reconnection...');
    
    if (this.socket) {
      // Close current connection
      this.socket.close?.() || this.socket.disconnect?.();
    }
    
    this.scheduleReconnection();
  }
  
  /**
   * Schedule reconnection attempt
   */
  scheduleReconnection() {
    if (this.reconnectTimer || this.reconnectAttempts >= this.maxReconnectAttempts) {
      return;
    }
    
    const delay = this.getReconnectDelay(this.reconnectAttempts + 1);
    console.log(`🔄 Scheduling reconnection attempt ${this.reconnectAttempts + 1}/${this.maxReconnectAttempts} in ${delay}ms`);
    
    this.reconnectTimer = setTimeout(async () => {
      this.reconnectTimer = null;
      this.reconnectAttempts++;
      
      try {
        await this.connect();
        this.stats.reconnections++;
        this.emit('reconnect', { attempt: this.reconnectAttempts });
        
      } catch (error) {
        console.error(`Reconnection attempt ${this.reconnectAttempts} failed:`, error);
        
        if (this.reconnectAttempts < this.maxReconnectAttempts) {
          this.scheduleReconnection();
        } else {
          console.error('All reconnection attempts exhausted');
          this.emit('error', new Error('Reconnection failed'));
        }
      }
    }, delay);
  }
  
  /**
   * Calculate reconnection delay with exponential backoff
   */
  getReconnectDelay(attempt) {
    const delay = Math.min(
      this.baseReconnectDelay * Math.pow(2, attempt - 1),
      this.maxReconnectDelay
    );
    
    // Add jitter to prevent thundering herd
    return delay + Math.random() * 1000;
  }
  
  /**
   * Update latency statistics
   */
  updateLatency() {
    if (this.lastHeartbeat) {
      const latency = Date.now() - this.lastHeartbeat;
      
      // Update average latency using exponential moving average
      this.stats.averageLatency = this.stats.averageLatency 
        ? (this.stats.averageLatency * 0.9 + latency * 0.1)
        : latency;
    }
  }
  
  /**
   * Register event handler
   */
  on(event, handler) {
    if (this.eventHandlers[event]) {
      this.eventHandlers[event].push(handler);
    }
  }
  
  /**
   * Emit event to registered handlers
   */
  emit(event, data) {
    if (this.eventHandlers[event]) {
      this.eventHandlers[event].forEach(handler => {
        try {
          handler(data);
        } catch (error) {
          console.error(`Error in ${event} handler:`, error);
        }
      });
    }
  }
  
  /**
   * Check if connection is alive
   */
  isConnectionAlive() {
    return this.connectionState === 'CONNECTED' && this.socket;
  }
  
  /**
   * Get connection statistics
   */
  getStats() {
    return {
      ...this.stats,
      connectionState: this.connectionState,
      reconnectAttempts: this.reconnectAttempts,
      uptime: this.connectionState === 'CONNECTED' 
        ? Date.now() - (this.lastPong || Date.now())
        : 0
    };
  }
}

module.exports = { RobustWebSocketManager };