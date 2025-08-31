/**
 * WebSocket Connection Registry
 * SPARC Architecture Component - Manages WebSocket connections per Claude instance
 * 
 * Fixes the core connection establishment issue by providing proper
 * registration, lookup, and cleanup of WebSocket connections
 */

import { normalizeInstanceId, parseInstanceMetadata } from './websocket-instance-normalizer';

export interface ConnectionMetadata {
  connectedAt: Date;
  instanceId: string;
  lastPing: Date;
  messagesSent: number;
  messagesReceived: number;
  health: 'healthy' | 'degraded' | 'unhealthy';
  clientInfo?: {
    userAgent: string;
    remoteAddress: string;
  };
}

export interface ConnectionRegistryStats {
  totalConnections: number;
  connectionsPerInstance: Map<string, number>;
  healthyConnections: number;
  degradedConnections: number;
  unhealthyConnections: number;
  oldestConnection: Date | null;
  averageConnectionAge: number;
}

/**
 * Robust WebSocket Connection Registry
 * Manages the mapping between Claude instances and their WebSocket connections
 */
export class WebSocketConnectionRegistry {
  // Primary connection mapping: instanceId -> Set<WebSocket>
  private connections = new Map<string, Set<WebSocket>>();
  
  // Reverse mapping for quick cleanup: WebSocket -> instanceId
  private connectionInstances = new Map<WebSocket, string>();
  
  // Connection metadata tracking
  private connectionMetadata = new Map<WebSocket, ConnectionMetadata>();
  
  // Health monitoring
  private healthCheckInterval: NodeJS.Timeout | null = null;
  private readonly HEALTH_CHECK_INTERVAL = 30000; // 30 seconds
  private readonly PING_TIMEOUT = 10000; // 10 seconds
  
  constructor(enableHealthChecks: boolean = true) {
    if (enableHealthChecks) {
      this.startHealthChecking();
    }
  }
  
  /**
   * Registers a WebSocket connection for a specific Claude instance
   * @param websocket - WebSocket connection to register
   * @param instanceId - Claude instance ID (will be normalized)
   * @param clientInfo - Optional client information
   * @returns True if registration successful
   */
  register(
    websocket: WebSocket, 
    instanceId: string, 
    clientInfo?: ConnectionMetadata['clientInfo']
  ): boolean {
    try {
      const normalizedId = normalizeInstanceId(instanceId);
      
      // Validate WebSocket state
      if (websocket.readyState !== WebSocket.OPEN) {
        console.warn(`Cannot register WebSocket in state ${websocket.readyState} for ${normalizedId}`);
        return false;
      }
      
      // Initialize connection set for instance if needed
      if (!this.connections.has(normalizedId)) {
        this.connections.set(normalizedId, new Set());
      }
      
      // Add to primary mapping
      this.connections.get(normalizedId)!.add(websocket);
      
      // Add to reverse mapping
      this.connectionInstances.set(websocket, normalizedId);
      
      // Store metadata
      const metadata: ConnectionMetadata = {
        connectedAt: new Date(),
        instanceId: normalizedId,
        lastPing: new Date(),
        messagesSent: 0,
        messagesReceived: 0,
        health: 'healthy',
        clientInfo
      };
      this.connectionMetadata.set(websocket, metadata);
      
      // Setup WebSocket close handler for auto-cleanup
      websocket.addEventListener('close', () => {
        this.unregister(websocket);
      });
      
      console.log(`✅ Registered WebSocket for instance ${normalizedId} (${this.connections.get(normalizedId)!.size} total)`);
      return true;
      
    } catch (error) {
      console.error(`❌ Failed to register WebSocket for ${instanceId}:`, error);
      return false;
    }
  }
  
  /**
   * Unregisters a WebSocket connection
   * @param websocket - WebSocket to unregister
   * @returns True if unregistration successful
   */
  unregister(websocket: WebSocket): boolean {
    try {
      const instanceId = this.connectionInstances.get(websocket);
      
      if (instanceId) {
        // Remove from primary mapping
        const connections = this.connections.get(instanceId);
        if (connections) {
          connections.delete(websocket);
          
          // Clean up empty sets
          if (connections.size === 0) {
            this.connections.delete(instanceId);
          }
        }
        
        // Remove from reverse mapping
        this.connectionInstances.delete(websocket);
        
        console.log(`🗑️ Unregistered WebSocket for instance ${instanceId} (${connections?.size || 0} remaining)`);
      }
      
      // Remove metadata
      this.connectionMetadata.delete(websocket);
      
      return true;
      
    } catch (error) {
      console.error('❌ Failed to unregister WebSocket:', error);
      return false;
    }
  }
  
  /**
   * Gets all WebSocket connections for a specific instance
   * @param instanceId - Claude instance ID
   * @returns Set of WebSocket connections (empty set if none)
   */
  getConnections(instanceId: string): Set<WebSocket> {
    const normalizedId = normalizeInstanceId(instanceId);
    return this.connections.get(normalizedId) || new Set();
  }
  
  /**
   * Gets the instance ID associated with a WebSocket
   * @param websocket - WebSocket connection
   * @returns Instance ID or null if not found
   */
  getInstanceId(websocket: WebSocket): string | null {
    return this.connectionInstances.get(websocket) || null;
  }
  
  /**
   * Gets connection metadata for a WebSocket
   * @param websocket - WebSocket connection
   * @returns Connection metadata or null if not found
   */
  getConnectionMetadata(websocket: WebSocket): ConnectionMetadata | null {
    return this.connectionMetadata.get(websocket) || null;
  }
  
  /**
   * Checks if an instance has any active connections
   * @param instanceId - Claude instance ID
   * @returns True if instance has active connections
   */
  hasConnections(instanceId: string): boolean {
    const connections = this.getConnections(instanceId);
    return connections.size > 0;
  }
  
  /**
   * Gets count of connections for an instance
   * @param instanceId - Claude instance ID
   * @returns Number of active connections
   */
  getConnectionCount(instanceId: string): number {
    return this.getConnections(instanceId).size;
  }
  
  /**
   * Records a message sent through a WebSocket
   * @param websocket - WebSocket that sent the message
   */
  recordMessageSent(websocket: WebSocket): void {
    const metadata = this.connectionMetadata.get(websocket);
    if (metadata) {
      metadata.messagesSent++;
    }
  }
  
  /**
   * Records a message received through a WebSocket
   * @param websocket - WebSocket that received the message
   */
  recordMessageReceived(websocket: WebSocket): void {
    const metadata = this.connectionMetadata.get(websocket);
    if (metadata) {
      metadata.messagesReceived++;
      metadata.lastPing = new Date();
    }
  }
  
  /**
   * Broadcasts a message to all connections for a specific instance
   * @param instanceId - Target instance ID
   * @param message - Message to broadcast
   * @returns Number of successful sends
   */
  broadcast(instanceId: string, message: any): number {
    const connections = this.getConnections(instanceId);
    let successCount = 0;
    const messageStr = JSON.stringify(message);
    
    connections.forEach(websocket => {
      try {
        if (websocket.readyState === WebSocket.OPEN) {
          websocket.send(messageStr);
          this.recordMessageSent(websocket);
          successCount++;
        } else {
          // Auto-cleanup non-open connections
          this.unregister(websocket);
        }
      } catch (error) {
        console.error(`❌ Failed to send message to WebSocket:`, error);
        this.unregister(websocket);
      }
    });
    
    if (successCount === 0 && connections.size > 0) {
      console.warn(`⚠️ No successful broadcasts for ${instanceId} despite ${connections.size} registered connections`);
    }
    
    return successCount;
  }
  
  /**
   * Performs cleanup of dead/stale connections
   * @returns Number of connections cleaned up
   */
  cleanup(): number {
    let cleanedUp = 0;
    const now = new Date();
    const STALE_TIMEOUT = 5 * 60 * 1000; // 5 minutes
    
    // Collect connections to clean up
    const toCleanup: WebSocket[] = [];
    
    this.connectionMetadata.forEach((metadata, websocket) => {
      const isStale = now.getTime() - metadata.lastPing.getTime() > STALE_TIMEOUT;
      const isClosed = websocket.readyState === WebSocket.CLOSED || 
                      websocket.readyState === WebSocket.CLOSING;
      
      if (isStale || isClosed) {
        toCleanup.push(websocket);
      }
    });
    
    // Perform cleanup
    toCleanup.forEach(websocket => {
      if (this.unregister(websocket)) {
        cleanedUp++;
      }
    });
    
    if (cleanedUp > 0) {
      console.log(`🧹 Cleaned up ${cleanedUp} stale WebSocket connections`);
    }
    
    return cleanedUp;
  }
  
  /**
   * Gets registry statistics
   * @returns Comprehensive stats about the connection registry
   */
  getStats(): ConnectionRegistryStats {
    const totalConnections = this.connectionMetadata.size;
    const connectionsPerInstance = new Map<string, number>();
    let healthyConnections = 0;
    let degradedConnections = 0;
    let unhealthyConnections = 0;
    let oldestConnection: Date | null = null;
    let totalAge = 0;
    
    // Calculate per-instance counts
    this.connections.forEach((connections, instanceId) => {
      connectionsPerInstance.set(instanceId, connections.size);
    });
    
    // Calculate health stats and ages
    const now = new Date();
    this.connectionMetadata.forEach(metadata => {
      switch (metadata.health) {
        case 'healthy': healthyConnections++; break;
        case 'degraded': degradedConnections++; break;
        case 'unhealthy': unhealthyConnections++; break;
      }
      
      const age = now.getTime() - metadata.connectedAt.getTime();
      totalAge += age;
      
      if (!oldestConnection || metadata.connectedAt < oldestConnection) {
        oldestConnection = metadata.connectedAt;
      }
    });
    
    return {
      totalConnections,
      connectionsPerInstance,
      healthyConnections,
      degradedConnections,
      unhealthyConnections,
      oldestConnection,
      averageConnectionAge: totalConnections > 0 ? totalAge / totalConnections : 0
    };
  }
  
  /**
   * Starts health checking for all connections
   */
  private startHealthChecking(): void {
    if (this.healthCheckInterval) {
      return; // Already running
    }
    
    this.healthCheckInterval = setInterval(() => {
      this.performHealthCheck();
    }, this.HEALTH_CHECK_INTERVAL);
  }
  
  /**
   * Stops health checking
   */
  stopHealthChecking(): void {
    if (this.healthCheckInterval) {
      clearInterval(this.healthCheckInterval);
      this.healthCheckInterval = null;
    }
  }
  
  /**
   * Performs health check on all connections
   */
  private performHealthCheck(): void {
    const now = new Date();
    let healthyCount = 0;
    let degradedCount = 0;
    let unhealthyCount = 0;
    
    this.connectionMetadata.forEach((metadata, websocket) => {
      const timeSinceLastPing = now.getTime() - metadata.lastPing.getTime();
      
      // Update health status based on ping time
      if (timeSinceLastPing < 60000) { // < 1 minute
        metadata.health = 'healthy';
        healthyCount++;
      } else if (timeSinceLastPing < 180000) { // < 3 minutes
        metadata.health = 'degraded';
        degradedCount++;
      } else {
        metadata.health = 'unhealthy';
        unhealthyCount++;
      }
      
      // Send ping to healthy connections
      if (metadata.health === 'healthy' && websocket.readyState === WebSocket.OPEN) {
        try {
          websocket.send(JSON.stringify({
            type: 'ping',
            timestamp: now.getTime()
          }));
          this.recordMessageSent(websocket);
        } catch (error) {
          console.warn(`⚠️ Failed to send ping to WebSocket:`, error);
          metadata.health = 'unhealthy';
        }
      }
    });
    
    // Log health summary periodically (every 5 minutes)
    if (now.getMinutes() % 5 === 0 && now.getSeconds() < 30) {
      console.log(`💗 Connection Health: ${healthyCount} healthy, ${degradedCount} degraded, ${unhealthyCount} unhealthy`);
    }
    
    // Perform cleanup
    this.cleanup();
  }
  
  /**
   * Destroys the registry and cleans up all resources
   */
  destroy(): void {
    this.stopHealthChecking();
    
    // Close all WebSocket connections
    this.connectionMetadata.forEach((metadata, websocket) => {
      if (websocket.readyState === WebSocket.OPEN) {
        websocket.close(1000, 'Registry shutdown');
      }
    });
    
    // Clear all maps
    this.connections.clear();
    this.connectionInstances.clear();
    this.connectionMetadata.clear();
    
    console.log('🏁 WebSocket Connection Registry destroyed');
  }
}

// Global registry instance for singleton pattern
export const globalConnectionRegistry = new WebSocketConnectionRegistry(true);