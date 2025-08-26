"use strict";
/**
 * WebSocket Hub Integration with Existing Port 3001 Infrastructure
 * Solves webhook/WebSocket mismatch and enables real-time communication
 */
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.WebSocketHubIntegration = void 0;
// HTTP/SSE only - Socket.IO removed
// import { Server as SocketIOServer } from 'socket.io';
const http_1 = require("http");
const logger_1 = __importDefault(require("../utils/logger"));
class WebSocketHubIntegration {
    io;
    httpServer;
    clients = new Map();
    messageQueue = new Map();
    securityConfig;
    constructor(app, port = 3004) {
        // Create HTTP server for existing Express app
        this.httpServer = (0, http_1.createServer)(app);
        // Initialize Socket.IO with existing server
        this.io = new SocketIOServer(this.httpServer, {
            cors: {
                origin: ["http://localhost:3000", "http://localhost:3001"],
                methods: ["GET", "POST"],
                allowedHeaders: ["*"],
                credentials: true
            },
            transports: ['websocket', 'polling']
        });
        this.loadSecurityConfig();
        this.setupEventHandlers();
        this.startHeartbeatMonitoring();
        logger_1.default.info('WebSocket Hub Integration initialized on port', { port });
    }
    loadSecurityConfig() {
        try {
            // Load security boundaries from system instructions
            const fs = require('fs');
            const path = require('path');
            const allowedOpsPath = '/workspaces/agent-feed/prod/system_instructions/api/allowed_operations.json';
            const forbiddenOpsPath = '/workspaces/agent-feed/prod/system_instructions/api/forbidden_operations.json';
            if (fs.existsSync(allowedOpsPath) && fs.existsSync(forbiddenOpsPath)) {
                const allowedOps = JSON.parse(fs.readFileSync(allowedOpsPath, 'utf8'));
                const forbiddenOps = JSON.parse(fs.readFileSync(forbiddenOpsPath, 'utf8'));
                this.securityConfig = {
                    allowed: allowedOps,
                    forbidden: forbiddenOps,
                    enforced: true
                };
                logger_1.default.info('Security configuration loaded from system instructions');
            }
            else {
                logger_1.default.warn('System instructions not found, using default security config');
                this.securityConfig = { enforced: false };
            }
        }
        catch (error) {
            logger_1.default.error('Failed to load security configuration', error);
            this.securityConfig = { enforced: false };
        }
    }
    setupEventHandlers() {
        this.io.on('connection', (socket) => {
            logger_1.default.info('New WebSocket connection', { socketId: socket.id });
            // Handle client registration
            socket.on('register', (data) => {
                this.handleClientRegistration(socket, data);
            });
            // Handle messages between clients
            socket.on('message', (data) => {
                this.handleMessage(socket, data);
            });
            // Handle Claude instance registration
            socket.on('registerClaudeInstance', (data) => {
                this.handleClaudeRegistration(socket, data);
            });
            // Handle frontend messages to Claude
            socket.on('sendToClause', (data) => {
                this.routeToClaudeInstance(socket, data);
            });
            // Handle Claude responses back to frontend
            socket.on('claudeResponse', (data) => {
                this.routeFromClaudeInstance(socket, data);
            });
            // Handle heartbeat
            socket.on('heartbeat', () => {
                this.updateHeartbeat(socket.id);
            });
            // Handle disconnection
            socket.on('disconnect', () => {
                this.handleDisconnection(socket.id);
            });
            // Error handling
            socket.on('error', (error) => {
                logger_1.default.error('WebSocket error', { socketId: socket.id, error });
            });
        });
    }
    handleClientRegistration(socket, data) {
        try {
            const { instanceType, capabilities, authentication } = data;
            // Validate registration data
            if (!instanceType || !['frontend', 'claude-production', 'claude-development'].includes(instanceType)) {
                socket.emit('registrationError', { error: 'Invalid instance type' });
                return;
            }
            // Security validation for Claude instances
            if (instanceType.startsWith('claude-') && this.securityConfig.enforced) {
                if (!this.validateClaudeAuthentication(authentication)) {
                    socket.emit('registrationError', { error: 'Authentication failed' });
                    return;
                }
            }
            // Register client
            const client = {
                id: socket.id,
                instanceType: instanceType,
                socket,
                capabilities: capabilities || [],
                lastHeartbeat: new Date(),
                authenticated: true
            };
            this.clients.set(socket.id, client);
            this.messageQueue.set(socket.id, []);
            logger_1.default.info('Client registered successfully', {
                socketId: socket.id,
                instanceType,
                capabilities
            });
            socket.emit('registrationSuccess', {
                clientId: socket.id,
                instanceType,
                hubStatus: this.getHubStatus()
            });
            // Notify other clients of new instance (if allowed)
            this.broadcastToType('frontend', 'instanceAvailable', {
                instanceType,
                clientId: socket.id,
                capabilities
            });
        }
        catch (error) {
            logger_1.default.error('Client registration failed', { socketId: socket.id, error });
            socket.emit('registrationError', { error: 'Registration failed' });
        }
    }
    handleClaudeRegistration(socket, data) {
        const { instanceId, webhookUrl, devMode } = data;
        // Update client with Claude-specific data
        const client = this.clients.get(socket.id);
        if (client && client.instanceType.startsWith('claude-')) {
            client.instanceId = instanceId;
            client.webhookUrl = webhookUrl;
            client.devMode = devMode || false;
            logger_1.default.info('Claude instance registered', {
                socketId: socket.id,
                instanceId,
                devMode
            });
            socket.emit('claudeRegistrationSuccess', {
                instanceId,
                devMode,
                allowedOperations: this.securityConfig.allowed?.agentOperations || {}
            });
        }
    }
    handleMessage(socket, data) {
        try {
            const client = this.clients.get(socket.id);
            if (!client || !client.authenticated) {
                socket.emit('error', { error: 'Client not authenticated' });
                return;
            }
            const message = {
                id: this.generateMessageId(),
                from: socket.id,
                to: data.to || 'broadcast',
                type: data.type || 'command',
                payload: data.payload || data,
                timestamp: new Date(),
                channel: data.channel
            };
            // Security validation for Claude messages
            if (client.instanceType.startsWith('claude-') && this.securityConfig.enforced) {
                if (!this.validateClaudeMessage(message)) {
                    socket.emit('messageError', { error: 'Message violates security policy' });
                    return;
                }
            }
            // Route message to target
            if (data.to && data.to !== 'broadcast') {
                this.routeToClient(message);
            }
            else {
                this.broadcastMessage(message, socket.id);
            }
            logger_1.default.debug('Message processed', {
                messageId: message.id,
                from: client.instanceType,
                to: message.to,
                type: message.type
            });
        }
        catch (error) {
            logger_1.default.error('Message handling failed', { socketId: socket.id, error });
            socket.emit('messageError', { error: 'Message processing failed' });
        }
    }
    routeToClaudeInstance(socket, data) {
        const { instanceType = 'claude-production', message } = data;
        // Find available Claude instance
        const claudeClient = Array.from(this.clients.values()).find(client => client.instanceType === instanceType && client.authenticated);
        if (!claudeClient) {
            socket.emit('routingError', {
                error: `No ${instanceType} instance available`,
                availableInstances: Array.from(this.clients.values())
                    .filter(c => c.instanceType.startsWith('claude-'))
                    .map(c => ({ type: c.instanceType, id: c.id }))
            });
            return;
        }
        // Create routing message
        const routedMessage = {
            id: this.generateMessageId(),
            from: socket.id,
            fromType: 'frontend',
            message,
            timestamp: new Date()
        };
        claudeClient.socket.emit('frontendMessage', routedMessage);
        logger_1.default.info('Message routed to Claude instance', {
            from: socket.id,
            to: claudeClient.id,
            instanceType,
            messageId: routedMessage.id
        });
    }
    routeFromClaudeInstance(socket, data) {
        const { responseToId, message, error } = data;
        // Find frontend client that sent original message
        const frontendClient = this.clients.get(responseToId);
        if (!frontendClient) {
            logger_1.default.warn('Frontend client not found for Claude response', {
                responseToId,
                claudeId: socket.id
            });
            return;
        }
        const response = {
            id: this.generateMessageId(),
            from: socket.id,
            fromType: 'claude',
            responseToId,
            message,
            error,
            timestamp: new Date()
        };
        frontendClient.socket.emit('claudeResponse', response);
        logger_1.default.info('Response routed from Claude to frontend', {
            from: socket.id,
            to: responseToId,
            messageId: response.id
        });
    }
    validateClaudeAuthentication(auth) {
        // Implement Claude instance authentication logic
        // For now, basic validation
        return auth && (auth.token === 'claude-prod-token' || auth.instanceId);
    }
    validateClaudeMessage(message) {
        if (!this.securityConfig.enforced)
            return true;
        const { payload } = message;
        // Check against forbidden operations
        if (this.securityConfig.forbidden?.criticalForbiddenOperations) {
            const forbidden = this.securityConfig.forbidden.criticalForbiddenOperations;
            // Check for system modification attempts
            if (payload.path && payload.path.includes('system_instructions')) {
                return false;
            }
            // Check for development access attempts
            if (payload.path && (payload.path.includes('/src/') ||
                payload.path.includes('/frontend/') ||
                payload.path.includes('/tests/'))) {
                return false;
            }
        }
        return true;
    }
    routeToClient(message) {
        const targetClient = this.clients.get(message.to);
        if (targetClient) {
            targetClient.socket.emit('message', message);
        }
        else {
            // Queue message if client not available
            const queue = this.messageQueue.get(message.to) || [];
            queue.push(message);
            this.messageQueue.set(message.to, queue);
        }
    }
    broadcastMessage(message, excludeId) {
        this.clients.forEach((client, clientId) => {
            if (clientId !== excludeId) {
                client.socket.emit('message', message);
            }
        });
    }
    broadcastToType(instanceType, event, data) {
        this.clients.forEach(client => {
            if (client.instanceType === instanceType) {
                client.socket.emit(event, data);
            }
        });
    }
    updateHeartbeat(socketId) {
        const client = this.clients.get(socketId);
        if (client) {
            client.lastHeartbeat = new Date();
        }
    }
    handleDisconnection(socketId) {
        const client = this.clients.get(socketId);
        if (client) {
            logger_1.default.info('Client disconnected', {
                socketId,
                instanceType: client.instanceType
            });
            this.clients.delete(socketId);
            this.messageQueue.delete(socketId);
            // Notify other clients
            this.broadcastToType('frontend', 'instanceUnavailable', {
                instanceType: client.instanceType,
                clientId: socketId
            });
        }
    }
    startHeartbeatMonitoring() {
        setInterval(() => {
            const now = new Date();
            const timeout = 60000; // 60 seconds
            this.clients.forEach((client, clientId) => {
                if (now.getTime() - client.lastHeartbeat.getTime() > timeout) {
                    logger_1.default.warn('Client heartbeat timeout', {
                        clientId,
                        instanceType: client.instanceType,
                        lastHeartbeat: client.lastHeartbeat
                    });
                    client.socket.disconnect();
                    this.clients.delete(clientId);
                }
            });
        }, 30000); // Check every 30 seconds
    }
    getHubStatus() {
        return {
            totalClients: this.clients.size,
            clientsByType: Array.from(this.clients.values()).reduce((acc, client) => {
                acc[client.instanceType] = (acc[client.instanceType] || 0) + 1;
                return acc;
            }, {}),
            securityEnforced: this.securityConfig.enforced,
            uptime: process.uptime()
        };
    }
    generateMessageId() {
        return `msg_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
    }
    start() {
        return new Promise((resolve, reject) => {
            try {
                this.httpServer.listen(3001, () => {
                    logger_1.default.info('WebSocket Hub integrated and listening', {
                        port: 3001,
                        clientsConnected: this.clients.size
                    });
                    resolve();
                });
            }
            catch (error) {
                logger_1.default.error('Failed to start WebSocket Hub', error);
                reject(error);
            }
        });
    }
    getStats() {
        return {
            connections: this.clients.size,
            messageQueue: Array.from(this.messageQueue.values()).reduce((sum, queue) => sum + queue.length, 0),
            uptime: process.uptime(),
            hubStatus: this.getHubStatus()
        };
    }
}
exports.WebSocketHubIntegration = WebSocketHubIntegration;
exports.default = WebSocketHubIntegration;
//# sourceMappingURL=websocket-hub-integration.js.map