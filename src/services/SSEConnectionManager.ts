/**
 * SSE Connection Manager - High-level API for frontend integration
 * 
 * This service provides a clean interface between the frontend components
 * and the enhanced SSE Event Streamer, preventing handler multiplication
 * and connection storms through intelligent management.
 */

import { EventEmitter } from 'events';
import { Response } from 'express';
import { SSEEventStreamer, SSEEvent, SSEConnection } from './SSEEventStreamer';
import { EnhancedProcessManager } from './EnhancedProcessManager';

export interface ConnectionOptions {
  priority?: 'low' | 'normal' | 'high';
  maxConnections?: number;
  enableBuffering?: boolean;
  rateLimitOverride?: {
    maxRequests: number;
    windowMs: number;
  };
}

export interface ConnectionInfo {
  id: string;
  instanceId: string;
  clientId: string;
  connected: boolean;
  health: 'healthy' | 'degraded' | 'unhealthy';
  messageCount: number;
  bytesTransferred: number;
  lastActivity: number;
}

export interface StreamingMetrics {
  totalConnections: number;
  activeConnections: number;
  messagesPerSecond: number;
  avgLatency: number;
  bufferUtilization: number;
  healthScore: number;
}

export class SSEConnectionManager extends EventEmitter {
  private static instance: SSEConnectionManager;
  private sseStreamer: SSEEventStreamer;
  private connectionRegistry = new Map<string, ConnectionInfo>();
  private processManager: EnhancedProcessManager | null = null;

  private constructor() {
    super();
    this.sseStreamer = SSEEventStreamer.getInstance();
    this.setupEventHandlers();
  }

  static getInstance(): SSEConnectionManager {
    if (!SSEConnectionManager.instance) {
      SSEConnectionManager.instance = new SSEConnectionManager();
    }
    return SSEConnectionManager.instance;
  }

  /**
   * Setup event handlers for the SSE streamer
   */
  private setupEventHandlers(): void {
    this.sseStreamer.on('connection:registered', (data) => {
      this.handleConnectionRegistered(data);
    });

    this.sseStreamer.on('connection:unregistered', (data) => {
      this.handleConnectionUnregistered(data);
    });

    this.sseStreamer.on('connection:unhealthy', (data) => {
      this.handleConnectionUnhealthy(data);
    });

    this.sseStreamer.on('connection:rate-limited', (data) => {
      this.emit('connection:throttled', data);
    });

    this.sseStreamer.on('broadcast:completed', (data) => {
      this.emit('broadcast:metrics', data);
    });

    this.sseStreamer.on('health:check', (data) => {
      this.emit('health:update', data);
    });
  }

  /**
   * Set the process manager for integration
   */
  setProcessManager(processManager: EnhancedProcessManager): void {
    this.processManager = processManager;
    this.sseStreamer.setProcessManager(processManager);
  }

  /**
   * Create a new SSE connection with comprehensive validation
   */
  async createConnection(
    instanceId: string,
    clientId: string,
    response: Response,
    options: ConnectionOptions = {}
  ): Promise<ConnectionInfo> {
    try {
      const result = await this.sseStreamer.registerConnection(
        instanceId,
        clientId,
        response,
        {
          priority: options.priority,
          maxConnections: options.maxConnections
        }
      );

      if (!result.success) {
        throw new Error(`Connection registration failed: ${result.reason}`);
      }

      const connectionInfo: ConnectionInfo = {
        id: result.connectionId,
        instanceId,
        clientId,
        connected: true,
        health: 'healthy',
        messageCount: 0,
        bytesTransferred: 0,
        lastActivity: Date.now()
      };

      this.connectionRegistry.set(result.connectionId, connectionInfo);

      console.log(`SSE connection created: ${result.connectionId} for ${instanceId}`);
      
      return connectionInfo;

    } catch (error) {
      console.error('Failed to create SSE connection:', error);
      throw error;
    }
  }

  /**
   * Close a specific connection
   */
  async closeConnection(connectionId: string): Promise<void> {
    try {
      await this.sseStreamer.unregisterConnection(connectionId);
      this.connectionRegistry.delete(connectionId);
      console.log(`SSE connection closed: ${connectionId}`);
    } catch (error) {
      console.error(`Failed to close connection ${connectionId}:`, error);
      throw error;
    }
  }

  /**
   * Close all connections for an instance
   */
  async closeInstanceConnections(instanceId: string): Promise<number> {
    const connections = this.getConnectionsForInstance(instanceId);
    let closedCount = 0;

    for (const connection of connections) {
      try {
        await this.closeConnection(connection.id);
        closedCount++;
      } catch (error) {
        console.error(`Error closing connection ${connection.id}:`, error);
      }
    }

    return closedCount;
  }

  /**
   * Send a message to specific connection
   */
  sendToConnection(connectionId: string, event: SSEEvent): boolean {
    return this.sseStreamer.sendToConnection(connectionId, event);
  }

  /**
   * Broadcast message to all connections for an instance
   */
  broadcastToInstance(instanceId: string, event: SSEEvent) {
    return this.sseStreamer.broadcastToInstance(instanceId, event);
  }

  /**
   * Create and broadcast an output event
   */
  sendOutput(instanceId: string, output: string, source = 'stdout'): void {
    const outputEvent = this.sseStreamer.createOutputEvent(instanceId, output, source);
    this.broadcastToInstance(instanceId, outputEvent);
  }

  /**
   * Create and broadcast a status event
   */
  sendStatus(instanceId: string, status: string, details: any = {}): void {
    const statusEvent = this.sseStreamer.createInstanceStatusEvent(instanceId, status, details);
    this.broadcastToInstance(instanceId, statusEvent);
  }

  /**
   * Create and broadcast an error event
   */
  sendError(instanceId: string, error: Error | string): void {
    const errorMessage = typeof error === 'string' ? error : error.message;
    const errorEvent = this.sseStreamer.createSSEEvent(instanceId, 'error', {
      error: errorMessage,
      timestamp: Date.now(),
      stack: typeof error === 'object' ? error.stack : undefined
    });
    this.broadcastToInstance(instanceId, errorEvent);
  }

  /**
   * Get connection info by ID
   */
  getConnection(connectionId: string): ConnectionInfo | null {
    return this.connectionRegistry.get(connectionId) || null;
  }

  /**
   * Get all connections for an instance
   */
  getConnectionsForInstance(instanceId: string): ConnectionInfo[] {
    const connections: ConnectionInfo[] = [];
    for (const connection of this.connectionRegistry.values()) {
      if (connection.instanceId === instanceId) {
        connections.push(connection);
      }
    }
    return connections;
  }

  /**
   * Get all active connections
   */
  getActiveConnections(): ConnectionInfo[] {
    return Array.from(this.connectionRegistry.values()).filter(c => c.connected);
  }

  /**
   * Get streaming metrics
   */
  getMetrics(): StreamingMetrics {
    const stats = this.sseStreamer.getServiceStatistics();
    
    return {
      totalConnections: stats.connections.total,
      activeConnections: stats.connections.active,
      messagesPerSecond: 0, // This would need to be calculated from recent activity
      avgLatency: 0, // This would need to be tracked
      bufferUtilization: stats.buffers.count > 0 ? 
        (stats.buffers.totalSize / (stats.buffers.count * 1000)) * 100 : 0,
      healthScore: stats.health.averageHealthScore
    };
  }

  /**
   * Get comprehensive service statistics
   */
  getServiceStatistics() {
    return this.sseStreamer.getServiceStatistics();
  }

  /**
   * Handle connection registered event
   */
  private handleConnectionRegistered(data: any): void {
    console.log(`Connection registered: ${data.connectionId} for ${data.instanceId}`);
    this.emit('connection:created', data);
  }

  /**
   * Handle connection unregistered event
   */
  private handleConnectionUnregistered(data: any): void {
    this.connectionRegistry.delete(data.connectionId);
    console.log(`Connection unregistered: ${data.connectionId}`);
    this.emit('connection:closed', data);
  }

  /**
   * Handle connection unhealthy event
   */
  private handleConnectionUnhealthy(data: any): void {
    const connection = this.connectionRegistry.get(data.connectionId);
    if (connection) {
      connection.health = 'unhealthy';
    }
    console.warn(`Connection unhealthy: ${data.connectionId}`, data.reason);
    this.emit('connection:unhealthy', data);
  }

  /**
   * Force flush all buffers
   */
  flushBuffers(): void {
    // This functionality is handled internally by the streamer
    console.log('Requesting buffer flush for all instances');
    this.emit('buffers:flush-requested');
  }

  /**
   * Get health status for all connections
   */
  getHealthStatus(): { healthy: number; degraded: number; unhealthy: number } {
    let healthy = 0, degraded = 0, unhealthy = 0;
    
    for (const connection of this.connectionRegistry.values()) {
      switch (connection.health) {
        case 'healthy': healthy++; break;
        case 'degraded': degraded++; break;
        case 'unhealthy': unhealthy++; break;
      }
    }
    
    return { healthy, degraded, unhealthy };
  }

  /**
   * Graceful shutdown of all connections
   */
  async shutdown(): Promise<void> {
    console.log('SSEConnectionManager: Starting shutdown');
    
    // Close all registered connections
    const connectionIds = Array.from(this.connectionRegistry.keys());
    for (const connectionId of connectionIds) {
      try {
        await this.closeConnection(connectionId);
      } catch (error) {
        console.error(`Error closing connection during shutdown: ${connectionId}`, error);
      }
    }

    // Shutdown the underlying streamer
    await this.sseStreamer.gracefulShutdown();

    // Clear registry
    this.connectionRegistry.clear();

    // Remove all listeners
    this.removeAllListeners();

    console.log('SSEConnectionManager: Shutdown complete');
  }
}

// Export singleton instance
export const sseConnectionManager = SSEConnectionManager.getInstance();
export default SSEConnectionManager;