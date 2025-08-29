/**
 * SSE Connection Manager - High-level API for frontend integration
 *
 * This service provides a clean interface between the frontend components
 * and the enhanced SSE Event Streamer, preventing handler multiplication
 * and connection storms through intelligent management.
 */
import { EventEmitter } from 'events';
import { Response } from 'express';
import { SSEEvent } from './SSEEventStreamer';
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
export declare class SSEConnectionManager extends EventEmitter {
    private static instance;
    private sseStreamer;
    private connectionRegistry;
    private processManager;
    private constructor();
    static getInstance(): SSEConnectionManager;
    /**
     * Setup event handlers for the SSE streamer
     */
    private setupEventHandlers;
    /**
     * Set the process manager for integration
     */
    setProcessManager(processManager: EnhancedProcessManager): void;
    /**
     * Create a new SSE connection with comprehensive validation
     */
    createConnection(instanceId: string, clientId: string, response: Response, options?: ConnectionOptions): Promise<ConnectionInfo>;
    /**
     * Close a specific connection
     */
    closeConnection(connectionId: string): Promise<void>;
    /**
     * Close all connections for an instance
     */
    closeInstanceConnections(instanceId: string): Promise<number>;
    /**
     * Send a message to specific connection
     */
    sendToConnection(connectionId: string, event: SSEEvent): boolean;
    /**
     * Broadcast message to all connections for an instance
     */
    broadcastToInstance(instanceId: string, event: SSEEvent): number;
    /**
     * Create and broadcast an output event
     */
    sendOutput(instanceId: string, output: string, source?: string): void;
    /**
     * Create and broadcast a status event
     */
    sendStatus(instanceId: string, status: string, details?: any): void;
    /**
     * Create and broadcast an error event
     */
    sendError(instanceId: string, error: Error | string): void;
    /**
     * Get connection info by ID
     */
    getConnection(connectionId: string): ConnectionInfo | null;
    /**
     * Get all connections for an instance
     */
    getConnectionsForInstance(instanceId: string): ConnectionInfo[];
    /**
     * Get all active connections
     */
    getActiveConnections(): ConnectionInfo[];
    /**
     * Get streaming metrics
     */
    getMetrics(): StreamingMetrics;
    /**
     * Get comprehensive service statistics
     */
    getServiceStatistics(): any;
    /**
     * Handle connection registered event
     */
    private handleConnectionRegistered;
    /**
     * Handle connection unregistered event
     */
    private handleConnectionUnregistered;
    /**
     * Handle connection unhealthy event
     */
    private handleConnectionUnhealthy;
    /**
     * Force flush all buffers
     */
    flushBuffers(): void;
    /**
     * Get health status for all connections
     */
    getHealthStatus(): {
        healthy: number;
        degraded: number;
        unhealthy: number;
    };
    /**
     * Graceful shutdown of all connections
     */
    shutdown(): Promise<void>;
}
export declare const sseConnectionManager: SSEConnectionManager;
export default SSEConnectionManager;
//# sourceMappingURL=SSEConnectionManager.d.ts.map