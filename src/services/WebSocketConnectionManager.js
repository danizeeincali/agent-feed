/**
 * SPARC WebSocket Connection Manager
 * Provides persistent WebSocket connection management with lifecycle separation
 */

const WebSocket = require('ws');
const { EventEmitter } = require('events');

class WebSocketConnectionManager extends EventEmitter {
  constructor(options = {}) {
    super();
    
    this.connections = new Map(); // instanceId -> Set<WebSocket>
    this.connectionsBySocket = new Map(); // WebSocket -> instanceId
    this.connectionHealth = new Map(); // connectionId -> HealthData
    this.heartbeatInterval = options.heartbeatInterval || 30000; // 30 seconds
    this.connectionTimeout = options.connectionTimeout || 10000; // 10 seconds
    this.retryAttempts = options.retryAttempts || 3;
    this.retryDelay = options.retryDelay || 1000;
    
    // Start health monitoring
    this.startHealthMonitoring();
    
    console.log('🔗 SPARC WebSocket Connection Manager initialized');
  }

  /**
   * Register a new WebSocket connection
   */
  registerConnection(ws, instanceId) {
    console.log(`🔗 SPARC: Registering WebSocket for instance ${instanceId}`);
    
    // Add to instance connections
    if (!this.connections.has(instanceId)) {
      this.connections.set(instanceId, new Set());
    }
    this.connections.get(instanceId).add(ws);
    this.connectionsBySocket.set(ws, instanceId);
    
    // Generate connection ID and register health monitoring
    const connectionId = `ws_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
    ws._connectionId = connectionId;
    ws._instanceId = instanceId;
    ws._registrationTime = Date.now();
    
    this.registerConnectionHealth(connectionId, 'websocket');
    
    // Setup connection handlers
    this.setupConnectionHandlers(ws);
    
    console.log(`✅ SPARC: WebSocket registered for ${instanceId} (ID: ${connectionId})`);
    console.log(`📊 SPARC: Active connections for ${instanceId}: ${this.connections.get(instanceId).size}`);
    
    this.emit('connectionRegistered', { instanceId, connectionId, ws });
    
    return connectionId;
  }

  /**
   * Setup WebSocket event handlers with proper lifecycle management
   */
  setupConnectionHandlers(ws) {
    const instanceId = ws._instanceId;
    const connectionId = ws._connectionId;
    
    // Handle connection close - CRITICAL: Only remove on explicit disconnect
    ws.on('close', (code, reason) => {
      console.log(`🔌 SPARC: WebSocket closed for ${instanceId} (code: ${code}, reason: ${reason})`);
      
      // SPARC FIX: Only remove connection on normal close or client disconnect
      // Do NOT remove on process completion or temporary disconnects
      if (code === 1000 || code === 1001) { // Normal closure or going away
        this.removeConnection(ws);
        console.log(`🧹 SPARC: Connection removed for normal close: ${connectionId}`);
      } else {
        console.log(`⚠️ SPARC: Connection preserved for reconnection: ${connectionId} (code: ${code})`);
        // Mark as disconnected but keep in pool for reconnection
        this.updateConnectionHealth(connectionId, null, 'disconnected');
      }
      
      this.emit('connectionClosed', { instanceId, connectionId, code, reason });
    });

    // Handle connection errors - CRITICAL: Don't remove on temporary errors
    ws.on('error', (error) => {
      console.error(`❌ SPARC: WebSocket error for ${instanceId}:`, error);
      
      // Update health but keep connection for potential recovery
      this.updateConnectionHealth(connectionId, null, 'error');
      this.emit('connectionError', { instanceId, connectionId, error });
      
      // Don't remove connection here - let reconnection logic handle it
    });

    // Handle ping/pong for connection health
    ws.on('pong', () => {
      const responseTime = Date.now() - (ws._lastPingTime || Date.now());
      this.updateConnectionHealth(connectionId, responseTime, 'healthy');
    });

    console.log(`🔧 SPARC: Connection handlers setup for ${connectionId}`);
  }

  /**
   * Remove a WebSocket connection (only on explicit disconnect)
   */
  removeConnection(ws) {
    const instanceId = this.connectionsBySocket.get(ws);
    const connectionId = ws._connectionId;
    
    if (instanceId && this.connections.has(instanceId)) {
      this.connections.get(instanceId).delete(ws);
      
      // Clean up empty instance sets
      if (this.connections.get(instanceId).size === 0) {
        this.connections.delete(instanceId);
      }
    }
    
    this.connectionsBySocket.delete(ws);
    
    if (connectionId) {
      this.connectionHealth.delete(connectionId);
    }
    
    console.log(`🗑️ SPARC: Connection fully removed: ${connectionId} from ${instanceId}`);
    this.emit('connectionRemoved', { instanceId, connectionId });
  }

  /**
   * Broadcast message to all connections for an instance
   * CRITICAL: Enhanced with connection persistence logic
   */
  broadcastToInstance(instanceId, message) {
    const connections = this.connections.get(instanceId);
    if (!connections || connections.size === 0) {
      console.log(`⚠️ SPARC: No active connections for instance ${instanceId}`);
      return { sent: 0, failed: 0, preserved: 0 };
    }

    const wsMessage = JSON.stringify({
      ...message,
      timestamp: message.timestamp || Date.now(),
      instanceId: instanceId
    });

    let sent = 0;
    let failed = 0;
    let preserved = 0;
    const disconnectedConnections = new Set();

    connections.forEach(ws => {
      if (ws.readyState === WebSocket.OPEN) {
        try {
          const sendStart = Date.now();
          ws.send(wsMessage);
          const sendTime = Date.now() - sendStart;
          
          // Update connection health on successful send
          if (ws._connectionId) {
            this.updateConnectionHealth(ws._connectionId, sendTime, 'healthy');
          }
          
          sent++;
        } catch (error) {
          console.error(`❌ SPARC: Failed to send to ${ws._connectionId}:`, error);
          failed++;
          
          // Mark as failed but don't remove immediately
          if (ws._connectionId) {
            this.updateConnectionHealth(ws._connectionId, null, 'failed');
          }
        }
      } else if (ws.readyState === WebSocket.CONNECTING) {
        // Connection is still establishing - preserve it
        preserved++;
        console.log(`⏳ SPARC: Connection ${ws._connectionId} still connecting, preserved`);
      } else {
        // Connection is closed or closing - mark for potential removal
        disconnectedConnections.add(ws);
      }
    });

    // SPARC FIX: Only remove connections that are definitively dead
    // and have been disconnected for more than reconnection window
    const now = Date.now();
    const reconnectionWindow = 30000; // 30 seconds
    
    disconnectedConnections.forEach(ws => {
      const timeSinceRegistration = now - (ws._registrationTime || now);
      const isRecentConnection = timeSinceRegistration < reconnectionWindow;
      
      if (!isRecentConnection && ws.readyState === WebSocket.CLOSED) {
        // Only remove truly dead connections after reconnection window
        console.log(`🗑️ SPARC: Removing definitively dead connection: ${ws._connectionId}`);
        connections.delete(ws);
        this.connectionsBySocket.delete(ws);
        
        if (ws._connectionId) {
          this.connectionHealth.delete(ws._connectionId);
        }
      } else {
        preserved++;
        console.log(`🛡️ SPARC: Preserving potentially recoverable connection: ${ws._connectionId}`);
      }
    });

    const total = sent + failed + preserved;
    console.log(`📤 SPARC: Broadcast to ${instanceId}: ${sent} sent, ${failed} failed, ${preserved} preserved (${total} total)`);
    
    this.emit('broadcast', { instanceId, sent, failed, preserved, total });
    
    return { sent, failed, preserved, total };
  }

  /**
   * Get connections for an instance
   */
  getInstanceConnections(instanceId) {
    return this.connections.get(instanceId) || new Set();
  }

  /**
   * Get connection health status
   */
  getConnectionHealth(connectionId) {
    return this.connectionHealth.get(connectionId);
  }

  /**
   * Get all connection health statuses
   */
  getAllConnectionHealth() {
    const healthMap = {};
    for (const [id, health] of this.connectionHealth.entries()) {
      healthMap[id] = health;
    }
    return healthMap;
  }

  /**
   * Register connection health monitoring
   */
  registerConnectionHealth(connectionId, type = 'websocket') {
    this.connectionHealth.set(connectionId, {
      type,
      status: 'healthy',
      lastPing: new Date(),
      responseTime: 0,
      createdAt: new Date(),
      failureCount: 0
    });
  }

  /**
   * Update connection health
   */
  updateConnectionHealth(connectionId, responseTime = null, status = 'healthy') {
    const health = this.connectionHealth.get(connectionId);
    if (!health) return;

    health.lastPing = new Date();
    health.status = status;
    
    if (responseTime !== null) {
      health.responseTime = responseTime;
    }
    
    if (status === 'error' || status === 'failed') {
      health.failureCount = (health.failureCount || 0) + 1;
    } else if (status === 'healthy') {
      health.failureCount = 0;
    }

    this.connectionHealth.set(connectionId, health);
  }

  /**
   * Start health monitoring with heartbeat
   */
  startHealthMonitoring() {
    setInterval(() => {
      this.performHealthCheck();
    }, this.heartbeatInterval);

    console.log(`💗 SPARC: Health monitoring started (interval: ${this.heartbeatInterval}ms)`);
  }

  /**
   * Perform health check on all connections
   */
  performHealthCheck() {
    const now = Date.now();
    const staleConnections = [];

    for (const [connectionId, health] of this.connectionHealth.entries()) {
      const timeSinceLastPing = now - health.lastPing.getTime();
      
      if (timeSinceLastPing > this.connectionTimeout * 2) {
        // Connection is very stale
        staleConnections.push({ connectionId, health, timeSinceLastPing });
      }
    }

    if (staleConnections.length > 0) {
      console.log(`🔍 SPARC: Found ${staleConnections.length} stale connections`);
      
      staleConnections.forEach(({ connectionId, timeSinceLastPing }) => {
        console.log(`⚠️ SPARC: Stale connection ${connectionId} (${Math.round(timeSinceLastPing/1000)}s since last ping)`);
        
        // Update status but don't remove - let natural cleanup handle it
        this.updateConnectionHealth(connectionId, null, 'stale');
      });
    }

    const totalConnections = this.connectionHealth.size;
    const healthyConnections = Array.from(this.connectionHealth.values())
      .filter(h => h.status === 'healthy').length;
    
    if (totalConnections > 0) {
      console.log(`💗 SPARC Health Check: ${healthyConnections}/${totalConnections} healthy connections`);
    }
  }

  /**
   * Get comprehensive statistics
   */
  getStats() {
    const instanceStats = {};
    let totalConnections = 0;
    
    for (const [instanceId, connections] of this.connections.entries()) {
      const activeConnections = Array.from(connections)
        .filter(ws => ws.readyState === WebSocket.OPEN).length;
      const totalInstanceConnections = connections.size;
      
      instanceStats[instanceId] = {
        active: activeConnections,
        total: totalInstanceConnections,
        preserved: totalInstanceConnections - activeConnections
      };
      
      totalConnections += totalInstanceConnections;
    }

    const healthStats = {};
    for (const [status, connections] of this.groupConnectionsByStatus()) {
      healthStats[status] = connections.length;
    }

    return {
      instances: instanceStats,
      totalConnections,
      health: healthStats,
      uptime: Date.now() - this.startTime
    };
  }

  /**
   * Group connections by health status
   */
  groupConnectionsByStatus() {
    const statusGroups = new Map();
    
    for (const [connectionId, health] of this.connectionHealth.entries()) {
      const status = health.status;
      if (!statusGroups.has(status)) {
        statusGroups.set(status, []);
      }
      statusGroups.get(status).push({ connectionId, health });
    }
    
    return statusGroups;
  }

  /**
   * Cleanup and destroy manager
   */
  destroy() {
    console.log('🛑 SPARC: Destroying WebSocket Connection Manager');
    
    // Close all connections gracefully
    for (const [instanceId, connections] of this.connections.entries()) {
      connections.forEach(ws => {
        if (ws.readyState === WebSocket.OPEN) {
          ws.close(1000, 'Server shutdown');
        }
      });
    }

    // Clear all data structures
    this.connections.clear();
    this.connectionsBySocket.clear();
    this.connectionHealth.clear();
    
    this.emit('destroyed');
    console.log('✅ SPARC: WebSocket Connection Manager destroyed');
  }
}

module.exports = { WebSocketConnectionManager };