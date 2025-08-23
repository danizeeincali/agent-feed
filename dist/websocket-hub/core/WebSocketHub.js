"use strict";
/**
 * WebSocket Hub - Main hub class for managing WebSocket connections
 * Solves webhook/WebSocket mismatch by providing protocol translation
 * and real-time bidirectional communication
 */
Object.defineProperty(exports, "__esModule", { value: true });
exports.WebSocketHub = void 0;
const events_1 = require("events");
const socket_io_1 = require("socket.io");
const logger_1 = require("@/utils/logger");
const MessageRouter_1 = require("../routing/MessageRouter");
const SecurityManager_1 = require("../security/SecurityManager");
const ClientRegistry_1 = require("./ClientRegistry");
const ProtocolTranslator_1 = require("./ProtocolTranslator");
class WebSocketHub extends events_1.EventEmitter {
    io;
    httpServer;
    config;
    // Core components
    messageRouter;
    securityManager;
    clientRegistry;
    protocolTranslator;
    nldIntegration;
    // Internal state
    connectedClients = new Map();
    channels = new Map(); // channel -> client IDs
    metrics;
    isRunning = false;
    startTime;
    constructor(httpServer, config) {
        super();
        this.httpServer = httpServer;
        this.config = config;
        this.startTime = new Date();
        this.initializeMetrics();
        this.initializeComponents();
        this.setupSocketIO();
    }
    /**
     * Initialize hub metrics
     */
    initializeMetrics() {
        this.metrics = {
            totalConnections: 0,
            activeChannels: 0,
            messagesPerSecond: 0,
            protocolTranslations: 0,
            errors: 0,
            uptime: 0
        };
    }
    /**
     * Initialize core components
     */
    initializeComponents() {
        logger_1.logger.info('Initializing WebSocket Hub components', { config: this.config });
        // Initialize client registry
        this.clientRegistry = new ClientRegistry_1.ClientRegistry({
            maxClients: this.config.maxConnections,
            sessionTimeout: 300000, // 5 minutes
            enableMetrics: this.config.enableMetrics,
            enableHeartbeat: true,
            enableServiceDiscovery: true
        });
        // Initialize security manager
        this.securityManager = new SecurityManager_1.SecurityManager({
            enableChannelIsolation: this.config.enableSecurity,
            maxChannelsPerClient: 50,
            rateLimit: {
                messagesPerSecond: 10,
                burstSize: 20
            },
            allowedOrigins: this.config.cors.origin
        });
        // Initialize message router
        this.messageRouter = new MessageRouter_1.MessageRouter({
            strategy: this.config.routingStrategy,
            enableLoadBalancing: true,
            maxRetries: 3,
            enableMetrics: this.config.enableMetrics,
            retryDelay: 1000,
            circuitBreakerThreshold: 5
        });
        // Initialize protocol translator
        this.protocolTranslator = new ProtocolTranslator_1.ProtocolTranslator({
            enableWebhookTranslation: true,
            enableSSETranslation: false,
            maxPayloadSize: 1024 * 1024, // 1MB
            compressionEnabled: true,
            retryAttempts: 3,
            retryDelay: 1000,
            webhookTimeout: 10000,
            enableMetrics: this.config.enableMetrics
        });
        // Set up component event handlers
        this.setupComponentEventHandlers();
    }
    /**
     * Set up Socket.IO server
     */
    setupSocketIO() {
        this.io = new socket_io_1.Server(this.httpServer, {
            cors: this.config.cors,
            transports: this.config.transports,
            pingTimeout: this.config.pingTimeout,
            pingInterval: this.config.pingInterval,
            allowUpgrades: true,
            httpCompression: true,
            allowEIO3: true
        });
        // Authentication middleware
        this.io.use(async (socket, next) => {
            try {
                await this.authenticateClient(socket);
                next();
            }
            catch (error) {
                logger_1.logger.error('Client authentication failed', {
                    socketId: socket.id,
                    error: error.message
                });
                next(new Error(`Authentication failed: ${error.message}`));
            }
        });
        // Connection handler
        this.io.on('connection', (socket) => {
            this.handleClientConnection(socket);
        });
    }
    /**
     * Set up event handlers for core components
     */
    setupComponentEventHandlers() {
        // Client Registry events
        this.clientRegistry.on('clientRegistered', (clientId, metadata) => {
            this.emit('clientRegistered', { clientId, metadata });
            this.updateMetrics();
        });
        this.clientRegistry.on('clientUnregistered', (clientId) => {
            this.emit('clientUnregistered', { clientId });
            this.updateMetrics();
        });
        // Security Manager events
        this.securityManager.on('securityViolation', (violation) => {
            logger_1.logger.warn('Security violation detected', violation);
            this.emit('securityViolation', violation);
            this.metrics.errors++;
        });
        // Message Router events
        this.messageRouter.on('routingError', (error) => {
            logger_1.logger.error('Message routing error', error);
            this.emit('routingError', error);
            this.metrics.errors++;
        });
        this.messageRouter.on('messageRouted', (routingInfo) => {
            this.emit('messageRouted', routingInfo);
        });
        // Protocol Translator events
        this.protocolTranslator.on('translationError', (error) => {
            logger_1.logger.error('Protocol translation error', error);
            this.emit('translationError', error);
            this.metrics.errors++;
        });
        this.protocolTranslator.on('protocolTranslated', (translationInfo) => {
            this.metrics.protocolTranslations++;
            this.emit('protocolTranslated', translationInfo);
        });
    }
    /**
     * Authenticate client connection
     */
    async authenticateClient(socket) {
        const { token, userId, instanceType, capabilities } = socket.handshake.auth;
        // Basic validation
        if (!instanceType || !Array.isArray(capabilities)) {
            throw new Error('Invalid authentication parameters');
        }
        // Validate instance type
        const validInstanceTypes = ['frontend', 'claude-production', 'claude-dev', 'webhook'];
        if (!validInstanceTypes.includes(instanceType)) {
            throw new Error(`Invalid instance type: ${instanceType}`);
        }
        // Security validation
        if (this.config.enableSecurity) {
            await this.securityManager.validateClient({
                socketId: socket.id,
                origin: socket.handshake.headers.origin,
                instanceType,
                token,
                userId
            });
        }
        // Store authentication data on socket
        socket.data = {
            userId,
            instanceType,
            capabilities,
            authenticatedAt: new Date()
        };
    }
    /**
     * Handle new client connection
     */
    handleClientConnection(socket) {
        const { userId, instanceType, capabilities } = socket.data;
        logger_1.logger.info('Client connected to WebSocket Hub', {
            socketId: socket.id,
            userId,
            instanceType,
            capabilities
        });
        // Create client metadata
        const client = {
            id: socket.id,
            socket,
            instanceType,
            metadata: {
                userId,
                sessionId: this.generateSessionId(),
                capabilities,
                registeredAt: new Date(),
                lastActivity: new Date(),
                channels: new Set()
            }
        };
        // Register client
        this.connectedClients.set(socket.id, client);
        this.clientRegistry.registerClient(socket.id, client.metadata);
        // Set up client event handlers
        this.setupClientEventHandlers(socket, client);
        // Update metrics
        this.metrics.totalConnections++;
        this.updateMetrics();
        // Emit connection event
        this.emit('clientConnected', {
            clientId: socket.id,
            instanceType,
            capabilities,
            timestamp: new Date()
        });
    }
    /**
     * Set up event handlers for a connected client
     */
    setupClientEventHandlers(socket, client) {
        // Channel subscription
        socket.on('subscribe', async (data) => {
            try {
                await this.subscribeClientToChannel(client, data.channel, data.options);
                socket.emit('subscribed', {
                    channel: data.channel,
                    timestamp: new Date().toISOString()
                });
            }
            catch (error) {
                logger_1.logger.error('Channel subscription failed', {
                    clientId: socket.id,
                    channel: data.channel,
                    error: error.message
                });
                socket.emit('subscriptionError', {
                    channel: data.channel,
                    error: error.message
                });
            }
        });
        // Channel unsubscription
        socket.on('unsubscribe', async (data) => {
            try {
                await this.unsubscribeClientFromChannel(client, data.channel);
                socket.emit('unsubscribed', {
                    channel: data.channel,
                    timestamp: new Date().toISOString()
                });
            }
            catch (error) {
                logger_1.logger.error('Channel unsubscription failed', {
                    clientId: socket.id,
                    channel: data.channel,
                    error: error.message
                });
            }
        });
        // Message sending
        socket.on('sendMessage', async (data) => {
            try {
                await this.handleClientMessage(client, data);
            }
            catch (error) {
                logger_1.logger.error('Message handling failed', {
                    clientId: socket.id,
                    error: error.message
                });
                socket.emit('messageError', { error: error.message });
            }
        });
        // Protocol translation request
        socket.on('translateProtocol', async (data) => {
            try {
                const translated = await this.protocolTranslator.translate(data.payload, data.from, data.to);
                socket.emit('protocolTranslated', {
                    original: data.payload,
                    translated,
                    timestamp: new Date().toISOString()
                });
            }
            catch (error) {
                logger_1.logger.error('Protocol translation failed', {
                    clientId: socket.id,
                    error: error.message
                });
                socket.emit('translationError', { error: error.message });
            }
        });
        // Claude instance registration (for production Claude instances)
        socket.on('registerClaudeInstance', async (data) => {
            try {
                if (client.instanceType !== 'claude-production' && client.instanceType !== 'claude-dev') {
                    throw new Error('Only Claude instances can register');
                }
                await this.registerClaudeInstance(client, data);
                socket.emit('claudeInstanceRegistered', {
                    instanceId: data.instanceId,
                    timestamp: new Date().toISOString()
                });
            }
            catch (error) {
                logger_1.logger.error('Claude instance registration failed', {
                    clientId: socket.id,
                    error: error.message
                });
                socket.emit('registrationError', { error: error.message });
            }
        });
        // Heartbeat
        socket.on('ping', () => {
            client.metadata.lastActivity = new Date();
            socket.emit('pong', { timestamp: new Date().toISOString() });
        });
        // Disconnect handler
        socket.on('disconnect', (reason) => {
            this.handleClientDisconnection(client, reason);
        });
        // Error handler
        socket.on('error', (error) => {
            logger_1.logger.error('Client socket error', {
                clientId: socket.id,
                error: error.message
            });
            this.metrics.errors++;
        });
    }
    /**
     * Subscribe client to a channel
     */
    async subscribeClientToChannel(client, channel, options) {
        // Security check
        if (this.config.enableSecurity) {
            await this.securityManager.validateChannelAccess(client.id, channel, 'subscribe');
        }
        // Add client to channel
        if (!this.channels.has(channel)) {
            this.channels.set(channel, new Set());
        }
        this.channels.get(channel).add(client.id);
        client.metadata.channels.add(channel);
        // Join Socket.IO room
        client.socket.join(channel);
        logger_1.logger.debug('Client subscribed to channel', {
            clientId: client.id,
            channel,
            options
        });
        // Update metrics
        this.metrics.activeChannels = this.channels.size;
    }
    /**
     * Unsubscribe client from a channel
     */
    async unsubscribeClientFromChannel(client, channel) {
        // Remove client from channel
        const channelClients = this.channels.get(channel);
        if (channelClients) {
            channelClients.delete(client.id);
            if (channelClients.size === 0) {
                this.channels.delete(channel);
            }
        }
        client.metadata.channels.delete(channel);
        // Leave Socket.IO room
        client.socket.leave(channel);
        logger_1.logger.debug('Client unsubscribed from channel', {
            clientId: client.id,
            channel
        });
        // Update metrics
        this.metrics.activeChannels = this.channels.size;
    }
    /**
     * Handle client message
     */
    async handleClientMessage(client, data) {
        // Update activity
        client.metadata.lastActivity = new Date();
        // Security check
        if (this.config.enableSecurity) {
            await this.securityManager.validateMessage(client.id, data);
        }
        // Protocol translation if needed
        let processedMessage = data.message;
        if (data.protocol && data.protocol !== 'websocket') {
            processedMessage = await this.protocolTranslator.translate(data.message, data.protocol, 'websocket');
        }
        // Route message
        if (data.channel) {
            // Broadcast to channel
            await this.messageRouter.routeToChannel(data.channel, processedMessage, client.id);
            this.io.to(data.channel).emit('message', {
                channel: data.channel,
                message: processedMessage,
                from: client.id,
                timestamp: new Date().toISOString()
            });
        }
        else if (data.target) {
            // Direct message to target
            await this.messageRouter.routeToClient(data.target, processedMessage, client.id);
            this.io.to(data.target).emit('directMessage', {
                message: processedMessage,
                from: client.id,
                timestamp: new Date().toISOString()
            });
        }
        logger_1.logger.debug('Message processed', {
            clientId: client.id,
            channel: data.channel,
            target: data.target
        });
    }
    /**
     * Register Claude instance for webhook translation
     */
    async registerClaudeInstance(client, data) {
        // Register with client registry
        await this.clientRegistry.registerClaudeInstance(client.id, {
            instanceId: data.instanceId,
            version: data.version,
            capabilities: data.capabilities,
            webhookUrl: data.webhookUrl
        });
        // Enable webhook translation if URL provided
        if (data.webhookUrl) {
            await this.protocolTranslator.registerWebhookEndpoint(data.instanceId, data.webhookUrl);
        }
        logger_1.logger.info('Claude instance registered', {
            clientId: client.id,
            instanceId: data.instanceId,
            webhookUrl: data.webhookUrl
        });
    }
    /**
     * Handle client disconnection
     */
    handleClientDisconnection(client, reason) {
        logger_1.logger.info('Client disconnected from WebSocket Hub', {
            clientId: client.id,
            instanceType: client.instanceType,
            reason
        });
        // Remove from all channels
        for (const channel of client.metadata.channels) {
            const channelClients = this.channels.get(channel);
            if (channelClients) {
                channelClients.delete(client.id);
                if (channelClients.size === 0) {
                    this.channels.delete(channel);
                }
            }
        }
        // Unregister client
        this.clientRegistry.unregisterClient(client.id);
        this.connectedClients.delete(client.id);
        // Update metrics
        this.metrics.totalConnections = Math.max(0, this.metrics.totalConnections - 1);
        this.metrics.activeChannels = this.channels.size;
        // Emit disconnection event
        this.emit('clientDisconnected', {
            clientId: client.id,
            instanceType: client.instanceType,
            reason,
            timestamp: new Date()
        });
    }
    /**
     * Start the WebSocket Hub
     */
    async start() {
        if (this.isRunning) {
            throw new Error('WebSocket Hub is already running');
        }
        try {
            // Initialize NLD integration if enabled
            if (this.config.enableNLD) {
                // Initialize NLD integration with existing WebSocket service
                // Note: This would need to be adapted based on the actual WebSocket service structure
                logger_1.logger.info('Initializing NLD integration');
                // this.nldIntegration = await integrateNLDWithWebSocket(webSocketService);
            }
            this.isRunning = true;
            this.startTime = new Date();
            // Start metrics collection
            this.startMetricsCollection();
            logger_1.logger.info('WebSocket Hub started successfully', {
                port: this.config.port,
                enabledFeatures: {
                    security: this.config.enableSecurity,
                    nld: this.config.enableNLD,
                    metrics: this.config.enableMetrics
                }
            });
            this.emit('started', { timestamp: this.startTime });
        }
        catch (error) {
            logger_1.logger.error('Failed to start WebSocket Hub', { error: error.message });
            throw error;
        }
    }
    /**
     * Stop the WebSocket Hub
     */
    async stop() {
        if (!this.isRunning) {
            return;
        }
        logger_1.logger.info('Stopping WebSocket Hub...');
        try {
            // Disconnect all clients
            for (const client of this.connectedClients.values()) {
                client.socket.disconnect(true);
            }
            // Shutdown NLD integration
            if (this.nldIntegration) {
                await this.nldIntegration.shutdown();
            }
            // Close Socket.IO server
            this.io.close();
            this.isRunning = false;
            logger_1.logger.info('WebSocket Hub stopped successfully');
            this.emit('stopped', { timestamp: new Date() });
        }
        catch (error) {
            logger_1.logger.error('Error stopping WebSocket Hub', { error: error.message });
            throw error;
        }
    }
    /**
     * Start metrics collection
     */
    startMetricsCollection() {
        if (!this.config.enableMetrics)
            return;
        setInterval(() => {
            this.updateMetrics();
            this.emit('metricsUpdated', this.metrics);
        }, 30000); // Update every 30 seconds
    }
    /**
     * Update hub metrics
     */
    updateMetrics() {
        this.metrics.totalConnections = this.connectedClients.size;
        this.metrics.activeChannels = this.channels.size;
        this.metrics.uptime = Date.now() - this.startTime.getTime();
    }
    /**
     * Get current hub metrics
     */
    getMetrics() {
        this.updateMetrics();
        return { ...this.metrics };
    }
    /**
     * Get connected clients information
     */
    getConnectedClients() {
        return Array.from(this.connectedClients.values()).map(client => ({
            id: client.id,
            instanceType: client.instanceType,
            capabilities: client.metadata.capabilities,
            channels: Array.from(client.metadata.channels)
        }));
    }
    /**
     * Get active channels information
     */
    getActiveChannels() {
        return Array.from(this.channels.entries()).map(([channel, clients]) => ({
            channel,
            clientCount: clients.size,
            clients: Array.from(clients)
        }));
    }
    /**
     * Broadcast message to all clients of a specific instance type
     */
    broadcastToInstanceType(instanceType, event, data) {
        for (const client of this.connectedClients.values()) {
            if (client.instanceType === instanceType) {
                client.socket.emit(event, {
                    ...data,
                    timestamp: new Date().toISOString()
                });
            }
        }
    }
    /**
     * Send message to specific client
     */
    sendToClient(clientId, event, data) {
        const client = this.connectedClients.get(clientId);
        if (client) {
            client.socket.emit(event, {
                ...data,
                timestamp: new Date().toISOString()
            });
            return true;
        }
        return false;
    }
    /**
     * Generate unique session ID
     */
    generateSessionId() {
        return `hub_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
    }
    /**
     * Check if hub is running
     */
    isActive() {
        return this.isRunning;
    }
}
exports.WebSocketHub = WebSocketHub;
//# sourceMappingURL=WebSocketHub.js.map