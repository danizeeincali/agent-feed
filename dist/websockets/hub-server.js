"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.hubServer = exports.HubServer = void 0;
const ws_1 = require("ws");
const events_1 = require("events");
const logger_1 = require("@/utils/logger");
/**
 * WebSocket Hub Server
 * Central hub for communication between Claude instances and frontend
 */
class HubServer extends events_1.EventEmitter {
    wss = null;
    instances = new Map();
    port;
    healthCheckInterval = null;
    constructor(port = 3004) {
        super();
        this.port = port;
    }
    /**
     * Start the hub server
     */
    start() {
        return new Promise((resolve, reject) => {
            try {
                this.wss = new ws_1.WebSocketServer({
                    port: this.port,
                    perMessageDeflate: false,
                    clientTracking: true
                });
                this.wss.on('connection', (ws, request) => {
                    this.handleNewConnection(ws, request);
                });
                this.wss.on('listening', () => {
                    logger_1.logger.info(`WebSocket Hub Server started on port ${this.port}`);
                    this.startHealthCheck();
                    resolve();
                });
                this.wss.on('error', (error) => {
                    logger_1.logger.error('WebSocket Hub Server error:', error);
                    reject(error);
                });
            }
            catch (error) {
                reject(error);
            }
        });
    }
    /**
     * Stop the hub server
     */
    async stop() {
        return new Promise((resolve) => {
            if (this.healthCheckInterval) {
                clearInterval(this.healthCheckInterval);
                this.healthCheckInterval = null;
            }
            if (this.wss) {
                // Close all connections gracefully
                this.instances.forEach((instance, instanceId) => {
                    logger_1.logger.info(`Closing connection for instance: ${instanceId}`);
                    instance.ws.close(1000, 'Server shutdown');
                });
                this.wss.close(() => {
                    logger_1.logger.info('WebSocket Hub Server stopped');
                    resolve();
                });
            }
            else {
                resolve();
            }
        });
    }
    /**
     * Handle new WebSocket connection
     */
    handleNewConnection(ws, request) {
        logger_1.logger.info('New WebSocket connection', {
            origin: request.headers.origin,
            userAgent: request.headers['user-agent']
        });
        // Setup message handler
        ws.on('message', (data) => {
            try {
                const message = JSON.parse(data.toString());
                this.handleMessage(ws, message);
            }
            catch (error) {
                logger_1.logger.error('Failed to parse message:', error);
                this.sendError(ws, 'Invalid message format');
            }
        });
        // Setup close handler
        ws.on('close', (code, reason) => {
            this.handleDisconnection(ws, code, reason);
        });
        // Setup error handler
        ws.on('error', (error) => {
            logger_1.logger.error('WebSocket connection error:', error);
        });
        // Setup ping/pong for keepalive
        ws.on('ping', () => {
            ws.pong();
        });
        ws.on('pong', () => {
            // Update last seen for the instance
            for (const [instanceId, instance] of this.instances.entries()) {
                if (instance.ws === ws) {
                    instance.lastSeen = new Date();
                    break;
                }
            }
        });
    }
    /**
     * Handle incoming messages
     */
    handleMessage(ws, message) {
        logger_1.logger.debug('Received message', {
            id: message.id,
            type: message.type,
            from: message.from,
            to: message.to
        });
        switch (message.type) {
            case 'register':
                this.handleRegistration(ws, message);
                break;
            case 'command':
            case 'chat':
            case 'system':
                this.forwardMessage(message);
                break;
            case 'response':
                this.handleResponse(message);
                break;
            case 'forward':
                this.forwardDirectMessage(message);
                break;
            default:
                logger_1.logger.warn('Unknown message type:', message.type);
                this.sendError(ws, `Unknown message type: ${message.type}`);
        }
    }
    /**
     * Handle instance registration
     */
    handleRegistration(ws, message) {
        const { instanceId, instanceType, capabilities } = message.payload;
        if (!instanceId || !instanceType) {
            this.sendError(ws, 'Registration requires instanceId and instanceType');
            return;
        }
        // Check if instance already registered
        if (this.instances.has(instanceId)) {
            logger_1.logger.warn(`Instance ${instanceId} already registered, updating connection`);
            const existingInstance = this.instances.get(instanceId);
            if (existingInstance.ws !== ws) {
                existingInstance.ws.close(1000, 'Replaced by new connection');
            }
        }
        // Register the new instance
        this.instances.set(instanceId, {
            ws,
            instanceId,
            instanceType,
            capabilities: capabilities || {},
            lastSeen: new Date()
        });
        logger_1.logger.info(`Instance registered: ${instanceId} (${instanceType})`, {
            capabilities: capabilities || {},
            totalInstances: this.instances.size
        });
        // Send registration confirmation
        this.sendMessage(ws, {
            type: 'registration_confirmed',
            instanceId,
            timestamp: new Date().toISOString(),
            connectedInstances: Array.from(this.instances.keys())
        });
        // Notify other instances about new registration
        this.broadcastToInstances({
            type: 'instance_connected',
            instanceId,
            instanceType,
            capabilities,
            timestamp: new Date().toISOString()
        }, instanceId);
        this.emit('instanceRegistered', { instanceId, instanceType, capabilities });
    }
    /**
     * Forward message to appropriate instance
     */
    forwardMessage(message) {
        const targetInstanceId = message.to || this.determineTarget(message);
        if (!targetInstanceId) {
            logger_1.logger.error('No target instance specified for message:', message.id);
            return;
        }
        const targetInstance = this.instances.get(targetInstanceId);
        if (!targetInstance) {
            logger_1.logger.error(`Target instance not found: ${targetInstanceId}`);
            this.sendErrorToSender(message, `Target instance not found: ${targetInstanceId}`);
            return;
        }
        // Generate unique message ID if not present
        if (!message.id) {
            message.id = `msg_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
        }
        logger_1.logger.debug(`Forwarding message ${message.id} to ${targetInstanceId}`);
        this.sendMessage(targetInstance.ws, {
            id: message.id,
            type: message.type,
            from: message.from,
            payload: message.payload,
            timestamp: message.timestamp,
            requiresResponse: message.requiresResponse
        });
    }
    /**
     * Handle response messages
     */
    handleResponse(message) {
        // Forward response back to the original sender
        // In a more complex system, we'd track request-response mappings
        const originalSender = this.determineResponseTarget(message);
        if (originalSender) {
            const senderInstance = this.instances.get(originalSender);
            if (senderInstance) {
                this.sendMessage(senderInstance.ws, {
                    type: 'response',
                    messageId: message.payload.messageId,
                    from: message.from,
                    payload: message.payload,
                    timestamp: message.timestamp
                });
            }
        }
        else {
            // Broadcast response to frontend instances if no specific target
            this.broadcastToInstanceType('frontend', {
                type: 'response',
                from: message.from,
                payload: message.payload,
                timestamp: message.timestamp
            });
        }
    }
    /**
     * Forward direct message to specific instance
     */
    forwardDirectMessage(message) {
        if (!message.to) {
            logger_1.logger.error('Direct message requires target instance');
            return;
        }
        const targetInstance = this.instances.get(message.to);
        if (!targetInstance) {
            logger_1.logger.error(`Direct message target not found: ${message.to}`);
            return;
        }
        this.sendMessage(targetInstance.ws, message.payload);
    }
    /**
     * Determine target instance for a message
     */
    determineTarget(message) {
        // Simple routing logic - can be made more sophisticated
        switch (message.type) {
            case 'command':
            case 'system':
                // Route to production Claude by default
                return 'prod-claude';
            case 'chat':
                // Check if dev mode is enabled for chat
                const prodInstance = this.instances.get('prod-claude');
                if (prodInstance?.capabilities?.devMode && prodInstance?.capabilities?.chatEnabled) {
                    return 'prod-claude';
                }
                // Fallback to dev instance if available
                return 'dev-claude';
            default:
                return null;
        }
    }
    /**
     * Determine response target (simplified)
     */
    determineResponseTarget(message) {
        // In a real implementation, we'd track request origins
        // For now, assume frontend as the typical originator
        const frontendInstances = Array.from(this.instances.values())
            .filter(instance => instance.instanceType === 'frontend');
        return frontendInstances.length > 0 ? frontendInstances[0].instanceId : null;
    }
    /**
     * Send message to WebSocket
     */
    sendMessage(ws, message) {
        if (ws.readyState === ws_1.WebSocket.OPEN) {
            ws.send(JSON.stringify(message));
        }
        else {
            logger_1.logger.warn('Attempted to send message to closed WebSocket');
        }
    }
    /**
     * Send error message
     */
    sendError(ws, error) {
        this.sendMessage(ws, {
            type: 'error',
            error,
            timestamp: new Date().toISOString()
        });
    }
    /**
     * Send error to message sender
     */
    sendErrorToSender(message, error) {
        const senderInstance = this.instances.get(message.from);
        if (senderInstance) {
            this.sendError(senderInstance.ws, error);
        }
    }
    /**
     * Broadcast message to all instances except sender
     */
    broadcastToInstances(message, excludeInstanceId) {
        this.instances.forEach((instance, instanceId) => {
            if (instanceId !== excludeInstanceId) {
                this.sendMessage(instance.ws, message);
            }
        });
    }
    /**
     * Broadcast message to instances of specific type
     */
    broadcastToInstanceType(instanceType, message) {
        this.instances.forEach((instance) => {
            if (instance.instanceType === instanceType) {
                this.sendMessage(instance.ws, message);
            }
        });
    }
    /**
     * Handle WebSocket disconnection
     */
    handleDisconnection(ws, code, reason) {
        // Find and remove the disconnected instance
        let disconnectedInstanceId = null;
        for (const [instanceId, instance] of this.instances.entries()) {
            if (instance.ws === ws) {
                disconnectedInstanceId = instanceId;
                this.instances.delete(instanceId);
                break;
            }
        }
        if (disconnectedInstanceId) {
            logger_1.logger.info(`Instance disconnected: ${disconnectedInstanceId}`, {
                code,
                reason: reason.toString(),
                remainingInstances: this.instances.size
            });
            // Notify other instances about disconnection
            this.broadcastToInstances({
                type: 'instance_disconnected',
                instanceId: disconnectedInstanceId,
                timestamp: new Date().toISOString()
            });
            this.emit('instanceDisconnected', { instanceId: disconnectedInstanceId, code, reason });
        }
    }
    /**
     * Start health check for connected instances
     */
    startHealthCheck() {
        this.healthCheckInterval = setInterval(() => {
            const now = new Date();
            const staleThreshold = 60000; // 1 minute
            this.instances.forEach((instance, instanceId) => {
                if (now.getTime() - instance.lastSeen.getTime() > staleThreshold) {
                    logger_1.logger.warn(`Instance ${instanceId} appears stale, sending ping`);
                    if (instance.ws.readyState === ws_1.WebSocket.OPEN) {
                        instance.ws.ping();
                    }
                    else {
                        logger_1.logger.warn(`Removing stale instance: ${instanceId}`);
                        this.instances.delete(instanceId);
                    }
                }
            });
        }, 30000); // Check every 30 seconds
    }
    /**
     * Get hub status
     */
    getStatus() {
        return {
            running: this.wss !== null,
            port: this.port,
            connectedInstances: Array.from(this.instances.values()).map(instance => ({
                instanceId: instance.instanceId,
                instanceType: instance.instanceType,
                capabilities: instance.capabilities,
                lastSeen: instance.lastSeen
            }))
        };
    }
    /**
     * Send message to specific instance
     */
    sendToInstance(instanceId, message) {
        const instance = this.instances.get(instanceId);
        if (instance) {
            this.sendMessage(instance.ws, message);
            return true;
        }
        return false;
    }
    /**
     * Get connected instances by type
     */
    getInstancesByType(instanceType) {
        return Array.from(this.instances.values())
            .filter(instance => instance.instanceType === instanceType)
            .map(instance => instance.instanceId);
    }
}
exports.HubServer = HubServer;
// Export singleton instance
exports.hubServer = new HubServer();
//# sourceMappingURL=hub-server.js.map