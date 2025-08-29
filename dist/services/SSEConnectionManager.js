"use strict";
/**
 * SSE Connection Manager - High-level API for frontend integration
 *
 * This service provides a clean interface between the frontend components
 * and the enhanced SSE Event Streamer, preventing handler multiplication
 * and connection storms through intelligent management.
 */
Object.defineProperty(exports, "__esModule", { value: true });
exports.sseConnectionManager = exports.SSEConnectionManager = void 0;
const events_1 = require("events");
const SSEEventStreamer_1 = require("./SSEEventStreamer");
class SSEConnectionManager extends events_1.EventEmitter {
    static instance;
    sseStreamer;
    connectionRegistry = new Map();
    processManager = null;
    constructor() {
        super();
        this.sseStreamer = SSEEventStreamer_1.SSEEventStreamer.getInstance();
        this.setupEventHandlers();
    }
    static getInstance() {
        if (!SSEConnectionManager.instance) {
            SSEConnectionManager.instance = new SSEConnectionManager();
        }
        return SSEConnectionManager.instance;
    }
    /**
     * Setup event handlers for the SSE streamer
     */
    setupEventHandlers() {
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
    setProcessManager(processManager) {
        this.processManager = processManager;
        this.sseStreamer.setProcessManager(processManager);
    }
    /**
     * Create a new SSE connection with comprehensive validation
     */
    async createConnection(instanceId, clientId, response, options = {}) {
        try {
            const result = await this.sseStreamer.registerConnection(instanceId, clientId, response, {
                priority: options.priority,
                maxConnections: options.maxConnections
            });
            if (!result.success) {
                throw new Error(`Connection registration failed: ${result.reason}`);
            }
            const connectionInfo = {
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
        }
        catch (error) {
            console.error('Failed to create SSE connection:', error);
            throw error;
        }
    }
    /**
     * Close a specific connection
     */
    async closeConnection(connectionId) {
        try {
            await this.sseStreamer.unregisterConnection(connectionId);
            this.connectionRegistry.delete(connectionId);
            console.log(`SSE connection closed: ${connectionId}`);
        }
        catch (error) {
            console.error(`Failed to close connection ${connectionId}:`, error);
            throw error;
        }
    }
    /**
     * Close all connections for an instance
     */
    async closeInstanceConnections(instanceId) {
        const connections = this.getConnectionsForInstance(instanceId);
        let closedCount = 0;
        for (const connection of connections) {
            try {
                await this.closeConnection(connection.id);
                closedCount++;
            }
            catch (error) {
                console.error(`Error closing connection ${connection.id}:`, error);
            }
        }
        return closedCount;
    }
    /**
     * Send a message to specific connection
     */
    sendToConnection(connectionId, event) {
        return this.sseStreamer.sendToConnection(connectionId, event);
    }
    /**
     * Broadcast message to all connections for an instance
     */
    broadcastToInstance(instanceId, event) {
        return this.sseStreamer.broadcastToInstance(instanceId, event);
    }
    /**
     * Create and broadcast an output event
     */
    sendOutput(instanceId, output, source = 'stdout') {
        const outputEvent = this.sseStreamer.createOutputEvent(instanceId, output, source);
        this.broadcastToInstance(instanceId, outputEvent);
    }
    /**
     * Create and broadcast a status event
     */
    sendStatus(instanceId, status, details = {}) {
        const statusEvent = this.sseStreamer.createInstanceStatusEvent(instanceId, status, details);
        this.broadcastToInstance(instanceId, statusEvent);
    }
    /**
     * Create and broadcast an error event
     */
    sendError(instanceId, error) {
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
    getConnection(connectionId) {
        return this.connectionRegistry.get(connectionId) || null;
    }
    /**
     * Get all connections for an instance
     */
    getConnectionsForInstance(instanceId) {
        const connections = [];
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
    getActiveConnections() {
        return Array.from(this.connectionRegistry.values()).filter(c => c.connected);
    }
    /**
     * Get streaming metrics
     */
    getMetrics() {
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
    handleConnectionRegistered(data) {
        console.log(`Connection registered: ${data.connectionId} for ${data.instanceId}`);
        this.emit('connection:created', data);
    }
    /**
     * Handle connection unregistered event
     */
    handleConnectionUnregistered(data) {
        this.connectionRegistry.delete(data.connectionId);
        console.log(`Connection unregistered: ${data.connectionId}`);
        this.emit('connection:closed', data);
    }
    /**
     * Handle connection unhealthy event
     */
    handleConnectionUnhealthy(data) {
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
    flushBuffers() {
        // This functionality is handled internally by the streamer
        console.log('Requesting buffer flush for all instances');
        this.emit('buffers:flush-requested');
    }
    /**
     * Get health status for all connections
     */
    getHealthStatus() {
        let healthy = 0, degraded = 0, unhealthy = 0;
        for (const connection of this.connectionRegistry.values()) {
            switch (connection.health) {
                case 'healthy':
                    healthy++;
                    break;
                case 'degraded':
                    degraded++;
                    break;
                case 'unhealthy':
                    unhealthy++;
                    break;
            }
        }
        return { healthy, degraded, unhealthy };
    }
    /**
     * Graceful shutdown of all connections
     */
    async shutdown() {
        console.log('SSEConnectionManager: Starting shutdown');
        // Close all registered connections
        const connectionIds = Array.from(this.connectionRegistry.keys());
        for (const connectionId of connectionIds) {
            try {
                await this.closeConnection(connectionId);
            }
            catch (error) {
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
exports.SSEConnectionManager = SSEConnectionManager;
// Export singleton instance
exports.sseConnectionManager = SSEConnectionManager.getInstance();
exports.default = SSEConnectionManager;
//# sourceMappingURL=SSEConnectionManager.js.map