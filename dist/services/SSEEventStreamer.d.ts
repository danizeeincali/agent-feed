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
export declare class ConnectionManager {
    private connections;
    private instanceConnections;
    private connectionsByType;
    /**
     * Add new connection
     */
    addConnection(connection: SSEConnection): void;
    /**
     * Remove connection
     */
    removeConnection(connectionId: string): boolean;
    /**
     * Get connections for instance
     */
    getConnectionsForInstance(instanceId: string): SSEConnection[];
    /**
     * Get all active connections
     */
    getActiveConnections(): SSEConnection[];
    /**
     * Get connection by ID
     */
    getConnection(connectionId: string): SSEConnection | undefined;
    /**
     * Mark connection as dead
     */
    markConnectionDead(connectionId: string): void;
    /**
     * Cleanup dead connections
     */
    cleanupDeadConnections(): number;
    /**
     * Get connection metrics
     */
    getMetrics(): {
        total: number;
        active: number;
        byInstance: Record<string, number>;
        byType: Record<string, number>;
    };
}
/**
 * SSE Event Streaming Service
 */
export declare class SSEEventStreamer extends EventEmitter {
    private connectionManager;
    private healthMonitor?;
    private metricsCollector?;
    private metrics;
    private messageCount;
    private errorCount;
    private lastMetricsUpdate;
    constructor();
    /**
     * Create terminal SSE stream
     */
    createTerminalStream(instanceId: string, response: Response, connectionId?: string): string;
    /**
     * Create status SSE stream
     */
    createStatusStream(response: Response, connectionId?: string): string;
    /**
     * Send buffered output to new connection
     */
    private sendBufferedOutput;
    /**
     * Setup connection event handlers
     */
    private setupConnectionHandlers;
    /**
     * Send message to specific connection
     */
    sendMessage(connectionId: string, message: SSEMessage): boolean;
    /**
     * Broadcast message to instance connections
     */
    broadcastToInstance(instanceId: string, message: SSEMessage): number;
    /**
     * Broadcast message to all connections
     */
    broadcastToAll(message: SSEMessage): number;
    /**
     * Setup integration with Enhanced Process Manager
     */
    private setupProcessManagerIntegration;
    /**
     * Broadcast instance status change
     */
    private broadcastInstanceStatus;
    /**
     * Send heartbeat to all connections
     */
    sendHeartbeat(): void;
    /**
     * Start monitoring and maintenance
     */
    private startMonitoring;
    /**
     * Perform health check
     */
    private performHealthCheck;
    /**
     * Update performance metrics
     */
    private updateMetrics;
    /**
     * Get performance metrics
     */
    getMetrics(): SSEMetrics & {
        connections: any;
    };
    /**
     * Get connection info
     */
    getConnectionInfo(connectionId: string): SSEConnection | null;
    /**
     * Close connection
     */
    closeConnection(connectionId: string): boolean;
    /**
     * Close all connections for instance
     */
    closeInstanceConnections(instanceId: string): number;
    /**
     * Shutdown service
     */
    shutdown(): Promise<void>;
}
export declare const sseEventStreamer: SSEEventStreamer;
export default SSEEventStreamer;
//# sourceMappingURL=SSEEventStreamer.d.ts.map