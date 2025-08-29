"use strict";
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
Object.defineProperty(exports, "__esModule", { value: true });
exports.sseEventStreamer = exports.SSEEventStreamer = exports.ConnectionManager = void 0;
const events_1 = require("events");
const logger_1 = require("../utils/logger");
const EnhancedProcessManager_1 = require("./EnhancedProcessManager");
/**
 * Connection manager for SSE streams
 */
class ConnectionManager {
    connections = new Map();
    instanceConnections = new Map();
    connectionsByType = new Map();
    /**
     * Add new connection
     */
    addConnection(connection) {
        this.connections.set(connection.id, connection);
        // Track by instance
        if (!this.instanceConnections.has(connection.instanceId)) {
            this.instanceConnections.set(connection.instanceId, new Set());
        }
        this.instanceConnections.get(connection.instanceId).add(connection.id);
        // Track by connection type (for general status connections)
        const type = connection.instanceId.startsWith('__') ? 'status' : 'terminal';
        if (!this.connectionsByType.has(type)) {
            this.connectionsByType.set(type, new Set());
        }
        this.connectionsByType.get(type).add(connection.id);
        logger_1.logger.debug(`SSE connection added: ${connection.id}`, {
            instanceId: connection.instanceId,
            totalConnections: this.connections.size
        });
    }
    /**
     * Remove connection
     */
    removeConnection(connectionId) {
        const connection = this.connections.get(connectionId);
        if (!connection)
            return false;
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
        logger_1.logger.debug(`SSE connection removed: ${connectionId}`, {
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
    getConnectionsForInstance(instanceId) {
        const connectionIds = this.instanceConnections.get(instanceId) || new Set();
        return Array.from(connectionIds)
            .map(id => this.connections.get(id))
            .filter((conn) => conn !== undefined && conn.isAlive);
    }
    /**
     * Get all active connections
     */
    getActiveConnections() {
        return Array.from(this.connections.values()).filter(conn => conn.isAlive);
    }
    /**
     * Get connection by ID
     */
    getConnection(connectionId) {
        return this.connections.get(connectionId);
    }
    /**
     * Mark connection as dead
     */
    markConnectionDead(connectionId) {
        const connection = this.connections.get(connectionId);
        if (connection) {
            connection.isAlive = false;
        }
    }
    /**
     * Cleanup dead connections
     */
    cleanupDeadConnections() {
        const deadConnections = Array.from(this.connections.values())
            .filter(conn => !conn.isAlive);
        deadConnections.forEach(conn => this.removeConnection(conn.id));
        return deadConnections.length;
    }
    /**
     * Get connection metrics
     */
    getMetrics() {
        const active = this.getActiveConnections();
        const byInstance = {};
        const byType = {};
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
exports.ConnectionManager = ConnectionManager;
/**
 * SSE Event Streaming Service
 */
class SSEEventStreamer extends events_1.EventEmitter {
    connectionManager = new ConnectionManager();
    healthMonitor;
    metricsCollector;
    metrics = {
        totalConnections: 0,
        activeConnections: 0,
        messagesPerSecond: 0,
        averageConnectionDuration: 0,
        errorRate: 0
    };
    messageCount = 0;
    errorCount = 0;
    lastMetricsUpdate = Date.now();
    constructor() {
        super();
        this.startMonitoring();
        this.setupProcessManagerIntegration();
    }
    /**
     * Create terminal SSE stream
     */
    createTerminalStream(instanceId, response, connectionId) {
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
        const connection = {
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
        logger_1.logger.info(`Terminal SSE stream created: ${connId}`, {
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
    createStatusStream(response, connectionId) {
        const connId = connectionId || `sse-status-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
        return this.createTerminalStream('__status__', response, connId);
    }
    /**
     * Send buffered output to new connection
     */
    sendBufferedOutput(connectionId) {
        const connection = this.connectionManager.getConnection(connectionId);
        if (!connection || connection.instanceId.startsWith('__')) {
            return;
        }
        try {
            const { output, newPosition, totalLength } = EnhancedProcessManager_1.enhancedProcessManager
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
        }
        catch (error) {
            logger_1.logger.error(`Failed to send buffered output to ${connectionId}`, error);
        }
    }
    /**
     * Setup connection event handlers
     */
    setupConnectionHandlers(connectionId) {
        const connection = this.connectionManager.getConnection(connectionId);
        if (!connection)
            return;
        const { response } = connection;
        // Handle client disconnect
        response.on('close', () => {
            logger_1.logger.debug(`SSE client disconnected: ${connectionId}`);
            this.connectionManager.markConnectionDead(connectionId);
            this.emit('connection:closed', { connectionId });
        });
        response.on('error', (error) => {
            logger_1.logger.error(`SSE connection error: ${connectionId}`, error);
            this.connectionManager.markConnectionDead(connectionId);
            this.errorCount++;
            this.emit('connection:error', { connectionId, error });
        });
        // Handle connection abort
        response.on('finish', () => {
            logger_1.logger.debug(`SSE connection finished: ${connectionId}`);
            this.connectionManager.markConnectionDead(connectionId);
        });
    }
    /**
     * Send message to specific connection
     */
    sendMessage(connectionId, message) {
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
        }
        catch (error) {
            logger_1.logger.error(`Failed to send message to ${connectionId}`, error);
            this.connectionManager.markConnectionDead(connectionId);
            this.errorCount++;
            return false;
        }
    }
    /**
     * Broadcast message to instance connections
     */
    broadcastToInstance(instanceId, message) {
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
    broadcastToAll(message) {
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
    setupProcessManagerIntegration() {
        // Handle terminal output
        EnhancedProcessManager_1.enhancedProcessManager.on('terminal:output', (outputData) => {
            const { instanceId, data, source, timestamp, filtered } = outputData;
            const message = {
                type: 'terminal_output',
                instanceId,
                data,
                timestamp: timestamp.toISOString()
            };
            this.broadcastToInstance(instanceId, message);
            if (filtered) {
                logger_1.logger.debug(`Escape sequences filtered for ${instanceId}`, {
                    instanceId,
                    originalLength: data.length
                });
            }
        });
        // Handle process status changes
        EnhancedProcessManager_1.enhancedProcessManager.on('instance:created', (processInfo) => {
            this.broadcastInstanceStatus(processInfo.instanceId, 'running', {
                pid: processInfo.pid,
                command: processInfo.command,
                startTime: processInfo.startTime
            });
        });
        EnhancedProcessManager_1.enhancedProcessManager.on('instance:exit', (exitData) => {
            this.broadcastInstanceStatus(exitData.instanceId, 'stopped', {
                code: exitData.code,
                signal: exitData.signal,
                uptime: exitData.uptime
            });
        });
        EnhancedProcessManager_1.enhancedProcessManager.on('instance:error', (errorData) => {
            this.broadcastInstanceStatus(errorData.instanceId, 'error', {
                error: errorData.error
            });
        });
        // Handle resource violations
        EnhancedProcessManager_1.enhancedProcessManager.on('instance:resource-violation', (violationData) => {
            const message = {
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
        EnhancedProcessManager_1.enhancedProcessManager.on('instance:hung', (hangData) => {
            const message = {
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
    broadcastInstanceStatus(instanceId, status, details = {}) {
        const message = {
            type: 'instance_status',
            instanceId,
            data: {
                status,
                ...details
            },
            timestamp: new Date().toISOString()
        };
        this.broadcastToInstance(instanceId, message);
        logger_1.logger.debug(`Instance status broadcast: ${instanceId}`, {
            instanceId,
            status,
            connections: this.connectionManager.getConnectionsForInstance(instanceId).length
        });
    }
    /**
     * Send heartbeat to all connections
     */
    sendHeartbeat() {
        const connections = this.connectionManager.getActiveConnections();
        const heartbeatMessage = {
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
    startMonitoring() {
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
    performHealthCheck() {
        // Cleanup dead connections
        const cleanedUp = this.connectionManager.cleanupDeadConnections();
        if (cleanedUp > 0) {
            logger_1.logger.debug(`Cleaned up ${cleanedUp} dead SSE connections`);
        }
        // Send heartbeat
        this.sendHeartbeat();
        // Log connection status
        const metrics = this.connectionManager.getMetrics();
        logger_1.logger.debug('SSE connection health check', {
            total: metrics.total,
            active: metrics.active,
            byType: metrics.byType
        });
    }
    /**
     * Update performance metrics
     */
    updateMetrics() {
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
            const totalDuration = activeConnections.reduce((sum, conn) => sum + (now - conn.startTime.getTime()), 0);
            this.metrics.averageConnectionDuration = totalDuration / activeConnections.length;
        }
        this.lastMetricsUpdate = now;
        this.messageCount = 0; // Reset counter
    }
    /**
     * Get performance metrics
     */
    getMetrics() {
        return {
            ...this.metrics,
            connections: this.connectionManager.getMetrics()
        };
    }
    /**
     * Get connection info
     */
    getConnectionInfo(connectionId) {
        return this.connectionManager.getConnection(connectionId) || null;
    }
    /**
     * Close connection
     */
    closeConnection(connectionId) {
        const connection = this.connectionManager.getConnection(connectionId);
        if (!connection)
            return false;
        try {
            connection.response.end();
            this.connectionManager.markConnectionDead(connectionId);
            return true;
        }
        catch (error) {
            logger_1.logger.error(`Failed to close connection ${connectionId}`, error);
            return false;
        }
    }
    /**
     * Close all connections for instance
     */
    closeInstanceConnections(instanceId) {
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
    async shutdown() {
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
        logger_1.logger.info(`Closing ${activeConnections.length} SSE connections`);
        activeConnections.forEach(connection => {
            try {
                connection.response.end();
            }
            catch (error) {
                logger_1.logger.error(`Error closing connection ${connection.id}`, error);
            }
        });
        logger_1.logger.info('SSE Event Streamer shutdown complete');
        this.emit('shutdown');
    }
}
exports.SSEEventStreamer = SSEEventStreamer;
// Export singleton instance
exports.sseEventStreamer = new SSEEventStreamer();
exports.default = SSEEventStreamer;
//# sourceMappingURL=SSEEventStreamer.js.map