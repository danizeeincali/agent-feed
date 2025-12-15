/**
 * SSE Event Streaming Service
 * 
 * Handles Server-Sent Events (SSE) for terminal output streaming with:
 * - Position-tracked incremental output streaming
 * - Connection management and monitoring
 * - Integration with Enhanced Process Manager
 * - Error recovery and connection health monitoring
 * 
 * Addresses TDD SSE prevention strategies and buffer accumulation issues.
 */

import { EventEmitter } from 'events';
import { Response } from 'express';
import { logger } from '../utils/logger';
import { enhancedProcessManager, ProcessInfo } from './EnhancedProcessManager';

export interface SSEConnection {
  id: string;
  instanceId: string;
  response: Response;
  startTime: Date;
  lastMessage: Date;
  messageCount: number;
  outputPosition: number;
  isAlive: boolean;
}

export interface SSEMessage {
  type: 'connected' | 'terminal_output' | 'status' | 'error' | 'heartbeat' | 'instance_status';
  instanceId: string;
  data?: any;
  timestamp: string;
  position?: number;
  totalLength?: number;
  isIncremental?: boolean;
}

export interface SSEMetrics {
  totalConnections: number;
  activeConnections: number;
  messagesPerSecond: number;
  averageConnectionDuration: number;
  errorRate: number;
}

/**
 * Connection manager for SSE streams
 */
export class ConnectionManager {
  private connections = new Map<string, SSEConnection>();
  private instanceConnections = new Map<string, Set<string>>();
  private connectionsByType = new Map<string, Set<string>>();

  /**
   * Add new connection
   */
  public addConnection(connection: SSEConnection): void {
    this.connections.set(connection.id, connection);

    // Track by instance
    if (!this.instanceConnections.has(connection.instanceId)) {
      this.instanceConnections.set(connection.instanceId, new Set());
    }
    this.instanceConnections.get(connection.instanceId)!.add(connection.id);

    // Track by connection type (for general status connections)
    const type = connection.instanceId.startsWith('__') ? 'status' : 'terminal';
    if (!this.connectionsByType.has(type)) {
      this.connectionsByType.set(type, new Set());
    }
    this.connectionsByType.get(type)!.add(connection.id);

    logger.debug(`SSE connection added: ${connection.id}`, {
      instanceId: connection.instanceId,
      totalConnections: this.connections.size
    });
  }

  /**
   * Remove connection
   */
  public removeConnection(connectionId: string): boolean {
    const connection = this.connections.get(connectionId);
    if (!connection) return false;

    // Clean up tracking
    const instanceConnections = this.instanceConnections.get(connection.instanceId);
    if (instanceConnections) {
      instanceConnections.delete(connectionId);
      if (instanceConnections.size === 0) {
        this.instanceConnections.delete(connection.instanceId);
      }
    }

    const type = connection.instanceId.startsWith('__') ? 'status' : 'terminal';
    const typeConnections = this.connectionsByType.get(type);
    if (typeConnections) {
      typeConnections.delete(connectionId);
      if (typeConnections.size === 0) {
        this.connectionsByType.delete(type);
      }
    }

    this.connections.delete(connectionId);

    logger.debug(`SSE connection removed: ${connectionId}`, {
      instanceId: connection.instanceId,
      duration: Date.now() - connection.startTime.getTime(),
      messageCount: connection.messageCount,
      remainingConnections: this.connections.size
    });

    return true;
  }

  /**
   * Get connections for instance
   */
  public getConnectionsForInstance(instanceId: string): SSEConnection[] {
    const connectionIds = this.instanceConnections.get(instanceId) || new Set();
    return Array.from(connectionIds)
      .map(id => this.connections.get(id))
      .filter((conn): conn is SSEConnection => conn !== undefined && conn.isAlive);
  }

  /**
   * Get all active connections
   */
  public getActiveConnections(): SSEConnection[] {
    return Array.from(this.connections.values()).filter(conn => conn.isAlive);
  }

  /**
   * Get connection by ID
   */
  public getConnection(connectionId: string): SSEConnection | undefined {
    return this.connections.get(connectionId);
  }

  /**
   * Mark connection as dead
   */
  public markConnectionDead(connectionId: string): void {
    const connection = this.connections.get(connectionId);
    if (connection) {
      connection.isAlive = false;
    }
  }

  /**
   * Cleanup dead connections
   */
  public cleanupDeadConnections(): number {
    const deadConnections = Array.from(this.connections.values())
      .filter(conn => !conn.isAlive);

    deadConnections.forEach(conn => this.removeConnection(conn.id));

    return deadConnections.length;
  }

  /**
   * Get connection metrics
   */
  public getMetrics(): {
    total: number;
    active: number;
    byInstance: Record<string, number>;
    byType: Record<string, number>;
  } {
    const active = this.getActiveConnections();
    const byInstance: Record<string, number> = {};
    const byType: Record<string, number> = {};

    active.forEach(conn => {
      byInstance[conn.instanceId] = (byInstance[conn.instanceId] || 0) + 1;
      const type = conn.instanceId.startsWith('__') ? 'status' : 'terminal';
      byType[type] = (byType[type] || 0) + 1;
    });

    return {
      total: this.connections.size,
      active: active.length,
      byInstance,
      byType
    };
  }
}

/**
 * SSE Event Streaming Service
 */
export class SSEEventStreamer extends EventEmitter {
  private connectionManager = new ConnectionManager();
  private healthMonitor?: NodeJS.Timeout;
  private metricsCollector?: NodeJS.Timeout;
  private metrics: SSEMetrics = {
    totalConnections: 0,
    activeConnections: 0,
    messagesPerSecond: 0,
    averageConnectionDuration: 0,
    errorRate: 0
  };
  private messageCount = 0;
  private errorCount = 0;
  private lastMetricsUpdate = Date.now();

  constructor() {
    super();
    this.startMonitoring();
    this.setupProcessManagerIntegration();
  }

  /**
   * Create terminal SSE stream
   */
  public createTerminalStream(
    instanceId: string,
    response: Response,
    connectionId?: string
  ): string {
    const connId = connectionId || `sse-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
    
    // Set SSE headers
    response.writeHead(200, {
      'Content-Type': 'text/event-stream',
      'Cache-Control': 'no-cache',
      'Connection': 'keep-alive',
      'Access-Control-Allow-Origin': '*',
      'Access-Control-Allow-Headers': 'Cache-Control',
      'X-Accel-Buffering': 'no' // Disable nginx buffering
    });

    // Prevent timeouts
    response.setTimeout(0);
    
    // Create connection
    const connection: SSEConnection = {
      id: connId,
      instanceId,
      response,
      startTime: new Date(),
      lastMessage: new Date(),
      messageCount: 0,
      outputPosition: 0,
      isAlive: true
    };

    this.connectionManager.addConnection(connection);
    this.metrics.totalConnections++;

    // Send initial connection message
    this.sendMessage(connId, {
      type: 'connected',
      instanceId,
      data: { message: `Terminal connected to instance ${instanceId}` },
      timestamp: new Date().toISOString()
    });

    // Send buffered output if available
    this.sendBufferedOutput(connId);

    // Setup connection handlers
    this.setupConnectionHandlers(connId);

    logger.info(`Terminal SSE stream created: ${connId}`, {
      instanceId,
      connectionId: connId,
      totalConnections: this.connectionManager.getMetrics().total
    });

    this.emit('connection:created', { connectionId: connId, instanceId });

    return connId;
  }

  /**
   * Create status SSE stream
   */
  public createStatusStream(response: Response, connectionId?: string): string {
    const connId = connectionId || `sse-status-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
    
    return this.createTerminalStream('__status__', response, connId);
  }

  /**
   * Send buffered output to new connection
   */
  private sendBufferedOutput(connectionId: string): void {
    const connection = this.connectionManager.getConnection(connectionId);
    if (!connection || connection.instanceId.startsWith('__')) {
      return;
    }

    try {
      const { output, newPosition, totalLength } = enhancedProcessManager
        .getIncrementalOutput(connection.instanceId, connection.outputPosition);

      if (output && output.length > 0) {
        this.sendMessage(connectionId, {
          type: 'terminal_output',
          instanceId: connection.instanceId,
          data: output,
          timestamp: new Date().toISOString(),
          position: connection.outputPosition,
          totalLength,
          isIncremental: true
        });

        connection.outputPosition = newPosition;
      }
    } catch (error) {
      logger.error(`Failed to send buffered output to ${connectionId}`, error);
    }
  }

  /**
   * Setup connection event handlers
   */
  private setupConnectionHandlers(connectionId: string): void {
    const connection = this.connectionManager.getConnection(connectionId);
    if (!connection) return;

    const { response } = connection;

    // Handle client disconnect
    response.on('close', () => {
      logger.debug(`SSE client disconnected: ${connectionId}`);
      this.connectionManager.markConnectionDead(connectionId);
      this.emit('connection:closed', { connectionId });
    });

    response.on('error', (error) => {
      logger.error(`SSE connection error: ${connectionId}`, error);
      this.connectionManager.markConnectionDead(connectionId);
      this.errorCount++;
      this.emit('connection:error', { connectionId, error });
    });

    // Handle connection abort
    response.on('finish', () => {
      logger.debug(`SSE connection finished: ${connectionId}`);
      this.connectionManager.markConnectionDead(connectionId);
    });
  }

  /**
   * Send message to specific connection
   */
  public sendMessage(connectionId: string, message: SSEMessage): boolean {
    const connection = this.connectionManager.getConnection(connectionId);
    if (!connection || !connection.isAlive) {
      return false;
    }

    try {
      const data = `data: ${JSON.stringify(message)}\n\n`;
      connection.response.write(data);
      
      connection.lastMessage = new Date();
      connection.messageCount++;
      this.messageCount++;

      // Update output position for terminal output
      if (message.type === 'terminal_output' && message.position !== undefined) {
        connection.outputPosition = message.position + (message.data?.length || 0);
      }

      return true;

    } catch (error) {
      logger.error(`Failed to send message to ${connectionId}`, error);
      this.connectionManager.markConnectionDead(connectionId);
      this.errorCount++;
      return false;
    }
  }

  /**
   * Broadcast message to instance connections
   */
  public broadcastToInstance(instanceId: string, message: SSEMessage): number {
    const connections = this.connectionManager.getConnectionsForInstance(instanceId);
    let successCount = 0;

    connections.forEach(connection => {
      if (this.sendMessage(connection.id, message)) {
        successCount++;
      }
    });

    // Also broadcast to status connections for general events
    if (message.type === 'instance_status') {
      const statusConnections = this.connectionManager.getConnectionsForInstance('__status__');
      statusConnections.forEach(connection => {
        this.sendMessage(connection.id, message);
      });
    }

    return successCount;
  }

  /**
   * Broadcast message to all connections
   */
  public broadcastToAll(message: SSEMessage): number {
    const connections = this.connectionManager.getActiveConnections();
    let successCount = 0;

    connections.forEach(connection => {
      if (this.sendMessage(connection.id, message)) {
        successCount++;
      }
    });

    return successCount;
  }

  /**
   * Setup integration with Enhanced Process Manager
   */
  private setupProcessManagerIntegration(): void {
    // Handle terminal output
    enhancedProcessManager.on('terminal:output', (outputData) => {
      const { instanceId, data, source, timestamp, filtered } = outputData;

      const message: SSEMessage = {
        type: 'terminal_output',
        instanceId,
        data,
        timestamp: timestamp.toISOString()
      };

      this.broadcastToInstance(instanceId, message);

      if (filtered) {
        logger.debug(`Escape sequences filtered for ${instanceId}`, {
          instanceId,
          originalLength: data.length
        });
      }
    });

    // Handle process status changes
    enhancedProcessManager.on('instance:created', (processInfo: ProcessInfo) => {
      this.broadcastInstanceStatus(processInfo.instanceId, 'running', {
        pid: processInfo.pid,
        command: processInfo.command,
        startTime: processInfo.startTime
      });
    });

    enhancedProcessManager.on('instance:exit', (exitData) => {
      this.broadcastInstanceStatus(exitData.instanceId, 'stopped', {
        code: exitData.code,
        signal: exitData.signal,
        uptime: exitData.uptime
      });
    });

    enhancedProcessManager.on('instance:error', (errorData) => {
      this.broadcastInstanceStatus(errorData.instanceId, 'error', {
        error: errorData.error
      });
    });

    // Handle resource violations
    enhancedProcessManager.on('instance:resource-violation', (violationData) => {
      const message: SSEMessage = {
        type: 'error',
        instanceId: violationData.instanceId,
        data: {
          type: 'resource_violation',
          resourceType: violationData.type,
          current: violationData.current,
          limit: violationData.limit
        },
        timestamp: new Date().toISOString()
      };

      this.broadcastToInstance(violationData.instanceId, message);
    });

    // Handle hung processes
    enhancedProcessManager.on('instance:hung', (hangData) => {
      const message: SSEMessage = {
        type: 'error',
        instanceId: hangData.instanceId,
        data: {
          type: 'process_hung',
          timeSinceActivity: hangData.timeSinceActivity,
          uptime: hangData.uptime
        },
        timestamp: new Date().toISOString()
      };

      this.broadcastToInstance(hangData.instanceId, message);
    });
  }

  /**
   * Broadcast instance status change
   */
  private broadcastInstanceStatus(instanceId: string, status: string, details: any = {}): void {
    const message: SSEMessage = {
      type: 'instance_status',
      instanceId,
      data: {
        status,
        ...details
      },
      timestamp: new Date().toISOString()
    };

    this.broadcastToInstance(instanceId, message);
    
    logger.debug(`Instance status broadcast: ${instanceId}`, {
      instanceId,
      status,
      connections: this.connectionManager.getConnectionsForInstance(instanceId).length
    });
  }

  /**
   * Send heartbeat to all connections
   */
  public sendHeartbeat(): void {
    const connections = this.connectionManager.getActiveConnections();
    const heartbeatMessage: SSEMessage = {
      type: 'heartbeat',
      instanceId: 'system',
      data: { timestamp: new Date().toISOString() },
      timestamp: new Date().toISOString()
    };

    connections.forEach(connection => {
      // Only send heartbeat if connection hasn't received messages recently
      const timeSinceLastMessage = Date.now() - connection.lastMessage.getTime();
      if (timeSinceLastMessage > 30000) { // 30 seconds
        this.sendMessage(connection.id, heartbeatMessage);
      }
    });
  }

  /**
   * Start monitoring and maintenance
   */
  private startMonitoring(): void {
    // Health monitoring every 30 seconds
    this.healthMonitor = setInterval(() => {
      this.performHealthCheck();
    }, 30000);

    // Metrics collection every 10 seconds
    this.metricsCollector = setInterval(() => {
      this.updateMetrics();
    }, 10000);
  }

  /**
   * Perform health check
   */
  private performHealthCheck(): void {
    // Cleanup dead connections
    const cleanedUp = this.connectionManager.cleanupDeadConnections();
    if (cleanedUp > 0) {
      logger.debug(`Cleaned up ${cleanedUp} dead SSE connections`);
    }

    // Send heartbeat
    this.sendHeartbeat();

    // Log connection status
    const metrics = this.connectionManager.getMetrics();
    logger.debug('SSE connection health check', {
      total: metrics.total,
      active: metrics.active,
      byType: metrics.byType
    });
  }

  /**
   * Update performance metrics
   */
  private updateMetrics(): void {
    const now = Date.now();
    const timeDelta = (now - this.lastMetricsUpdate) / 1000; // seconds

    const connectionMetrics = this.connectionManager.getMetrics();
    this.metrics.activeConnections = connectionMetrics.active;

    if (timeDelta > 0) {
      this.metrics.messagesPerSecond = this.messageCount / timeDelta;
    }

    if (this.metrics.totalConnections > 0) {
      this.metrics.errorRate = this.errorCount / this.metrics.totalConnections;
    }

    // Calculate average connection duration
    const activeConnections = this.connectionManager.getActiveConnections();
    if (activeConnections.length > 0) {
      const totalDuration = activeConnections.reduce((sum, conn) => 
        sum + (now - conn.startTime.getTime()), 0);
      this.metrics.averageConnectionDuration = totalDuration / activeConnections.length;
    }

    this.lastMetricsUpdate = now;
    this.messageCount = 0; // Reset counter
  }

  /**
   * Get performance metrics
   */
  public getMetrics(): SSEMetrics & { connections: any } {
    return {
      ...this.metrics,
      connections: this.connectionManager.getMetrics()
    };
  }

  /**
   * Get connection info
   */
  public getConnectionInfo(connectionId: string): SSEConnection | null {
    return this.connectionManager.getConnection(connectionId) || null;
  }

  /**
   * Close connection
   */
  public closeConnection(connectionId: string): boolean {
    const connection = this.connectionManager.getConnection(connectionId);
    if (!connection) return false;

    try {
      connection.response.end();
      this.connectionManager.markConnectionDead(connectionId);
      return true;
    } catch (error) {
      logger.error(`Failed to close connection ${connectionId}`, error);
      return false;
    }
  }

  /**
   * Close all connections for instance
   */
  public closeInstanceConnections(instanceId: string): number {
    const connections = this.connectionManager.getConnectionsForInstance(instanceId);
    let closedCount = 0;

    connections.forEach(connection => {
      if (this.closeConnection(connection.id)) {
        closedCount++;
      }
    });

    return closedCount;
  }

  /**
   * Shutdown service
   */
  public async shutdown(): Promise<void> {
    // Stop monitoring
    if (this.healthMonitor) {
      clearInterval(this.healthMonitor);
      this.healthMonitor = undefined;
    }

    if (this.metricsCollector) {
      clearInterval(this.metricsCollector);
      this.metricsCollector = undefined;
    }

    // Close all connections
    const activeConnections = this.connectionManager.getActiveConnections();
    logger.info(`Closing ${activeConnections.length} SSE connections`);

    activeConnections.forEach(connection => {
      try {
        connection.response.end();
      } catch (error) {
        logger.error(`Error closing connection ${connection.id}`, error);
      }
    });

    logger.info('SSE Event Streamer shutdown complete');
    this.emit('shutdown');
  }
}

// Export singleton instance
export const sseEventStreamer = new SSEEventStreamer();

export default SSEEventStreamer;