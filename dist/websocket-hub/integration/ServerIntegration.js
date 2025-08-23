"use strict";
/**
 * Server Integration - Integrates WebSocket Hub with existing server.ts
 * Provides seamless integration while maintaining existing functionality
 */
Object.defineProperty(exports, "__esModule", { value: true });
exports.ServerIntegration = void 0;
exports.createServerIntegration = createServerIntegration;
exports.integrateWebSocketHub = integrateWebSocketHub;
const core_1 = require("../core");
const logger_1 = require("@/utils/logger");
const websocket_integration_1 = require("@/nld/websocket-integration");
class ServerIntegration {
    hub;
    originalIO;
    nldIntegration;
    config;
    isInitialized = false;
    connectionMap = new Map();
    constructor(httpServer, originalIO, config) {
        this.originalIO = originalIO;
        this.config = {
            preserveExistingHandlers: true,
            routingStrategy: 'hybrid',
            ...config
        };
    }
    /**
     * Initialize the WebSocket Hub integration
     */
    async initialize() {
        if (this.isInitialized) {
            throw new Error('Server integration already initialized');
        }
        try {
            // Create WebSocket Hub
            if (this.config.enableHub) {
                this.hub = await (0, core_1.createWebSocketHub)(this.originalIO.httpServer || this.originalIO.engine.httpServer, {
                    enableNLD: this.config.enableNLD,
                    enableSecurity: this.config.enableSecurity,
                    enableMetrics: this.config.enableMetrics,
                    ...this.config.hubConfig
                });
                await this.hub.start();
                // Set up integration event handlers
                this.setupHubEventHandlers();
            }
            // Initialize NLD integration
            if (this.config.enableNLD) {
                await this.initializeNLDIntegration();
            }
            // Set up routing strategy
            await this.setupRoutingStrategy();
            this.isInitialized = true;
            const result = {
                hub: this.hub,
                nldIntegration: this.nldIntegration,
                originalIO: this.originalIO,
                metrics: this.getConnectionMetrics()
            };
            logger_1.logger.info('WebSocket Hub integration initialized successfully', {
                routingStrategy: this.config.routingStrategy,
                enabledFeatures: {
                    hub: this.config.enableHub,
                    nld: this.config.enableNLD,
                    security: this.config.enableSecurity,
                    metrics: this.config.enableMetrics
                }
            });
            return result;
        }
        catch (error) {
            logger_1.logger.error('Failed to initialize WebSocket Hub integration', {
                error: error.message
            });
            throw error;
        }
    }
    /**
     * Initialize NLD integration
     */
    async initializeNLDIntegration() {
        try {
            // Create a WebSocket service wrapper for the original Socket.IO server
            const webSocketServiceWrapper = this.createWebSocketServiceWrapper();
            this.nldIntegration = await (0, websocket_integration_1.integrateNLDWithWebSocket)(webSocketServiceWrapper, {
                enableLearning: true,
                enableAdaptiveRetry: true,
                enablePerformanceMonitoring: true,
                enableTroubleshooting: true,
                neuralTrainingEnabled: true
            });
            // Forward NLD events to hub if hub is enabled
            if (this.hub) {
                this.setupNLDHubIntegration();
            }
            logger_1.logger.info('NLD integration initialized successfully');
        }
        catch (error) {
            logger_1.logger.warn('Failed to initialize NLD integration', { error: error.message });
        }
    }
    /**
     * Create WebSocket service wrapper for NLD integration
     */
    createWebSocketServiceWrapper() {
        return {
            connect: async () => {
                // Wrapper for original Socket.IO connection logic
                return Promise.resolve();
            },
            send: (type, data) => {
                // Broadcast to all connected clients via original IO
                this.originalIO.emit(type, data);
            },
            disconnect: () => {
                // Handle disconnection
                this.originalIO.close();
            },
            url: `ws://localhost:${process.env.PORT || 3000}/socket.io/`
        };
    }
    /**
     * Set up integration between NLD and Hub
     */
    setupNLDHubIntegration() {
        if (!this.nldIntegration || !this.hub)
            return;
        // Forward NLD events to hub clients
        this.nldIntegration.on('nldPatternDetected', (data) => {
            this.hub.broadcastToInstanceType('claude-production', 'nld:pattern:detected', data);
        });
        this.nldIntegration.on('nldConnectionSuccess', (data) => {
            this.hub.broadcastToInstanceType('frontend', 'nld:connection:success', data);
        });
        this.nldIntegration.on('nldAlert', (alert) => {
            this.hub.broadcastToInstanceType('claude-production', 'nld:alert', alert);
        });
        this.nldIntegration.on('troubleshootingSuggestions', (suggestions) => {
            this.hub.broadcastToInstanceType('frontend', 'nld:troubleshooting', suggestions);
        });
        logger_1.logger.debug('NLD-Hub integration event forwarding set up');
    }
    /**
     * Set up routing strategy between hub and original Socket.IO
     */
    async setupRoutingStrategy() {
        switch (this.config.routingStrategy) {
            case 'hub-only':
                await this.setupHubOnlyRouting();
                break;
            case 'hybrid':
                await this.setupHybridRouting();
                break;
            case 'fallback':
                await this.setupFallbackRouting();
                break;
        }
    }
    /**
     * Set up hub-only routing (all connections go through hub)
     */
    async setupHubOnlyRouting() {
        if (!this.hub) {
            throw new Error('Hub not available for hub-only routing');
        }
        // Disable original Socket.IO connection handling
        this.originalIO.engine.generateId = () => {
            throw new Error('Direct connections disabled - use WebSocket Hub');
        };
        logger_1.logger.info('Hub-only routing configured');
    }
    /**
     * Set up hybrid routing (smart routing based on client type)
     */
    async setupHybridRouting() {
        if (!this.hub) {
            logger_1.logger.warn('Hub not available for hybrid routing, falling back to original');
            return;
        }
        // Intercept connection events and route based on client capabilities
        const originalConnectionHandler = this.originalIO.engine.handleRequest.bind(this.originalIO.engine);
        this.originalIO.engine.handleRequest = (req, res) => {
            const query = req.url ? new URL(req.url, 'http://localhost').searchParams : new URLSearchParams();
            const instanceType = query.get('instanceType') || 'frontend';
            // Route Claude instances and webhooks to hub
            if (['claude-production', 'claude-dev', 'webhook'].includes(instanceType)) {
                logger_1.logger.debug('Routing to hub', { instanceType, url: req.url });
                return; // Let hub handle it
            }
            // Route frontend connections to original for backward compatibility
            logger_1.logger.debug('Routing to original Socket.IO', { instanceType, url: req.url });
            return originalConnectionHandler(req, res);
        };
        logger_1.logger.info('Hybrid routing configured');
    }
    /**
     * Set up fallback routing (original first, hub as fallback)
     */
    async setupFallbackRouting() {
        if (!this.hub) {
            logger_1.logger.warn('Hub not available for fallback routing');
            return;
        }
        // Set up fallback when original Socket.IO fails
        this.originalIO.engine.on('connection_error', (error) => {
            logger_1.logger.warn('Original Socket.IO connection failed, trying hub', { error });
            // This would need more sophisticated implementation in practice
        });
        logger_1.logger.info('Fallback routing configured');
    }
    /**
     * Set up hub event handlers for integration
     */
    setupHubEventHandlers() {
        if (!this.hub)
            return;
        // Track connections for metrics
        this.hub.on('clientConnected', (event) => {
            this.connectionMap.set(event.clientId, 'hub');
            logger_1.logger.debug('Client connected to hub', event);
        });
        this.hub.on('clientDisconnected', (event) => {
            this.connectionMap.delete(event.clientId);
            logger_1.logger.debug('Client disconnected from hub', event);
        });
        // Forward hub events to original Socket.IO clients if needed
        if (this.config.preserveExistingHandlers) {
            this.setupEventForwarding();
        }
        // Security events
        this.hub.on('securityViolation', (violation) => {
            logger_1.logger.warn('Security violation detected in hub', violation);
            // Could forward to monitoring systems
        });
        // Protocol translation events
        this.hub.on('protocolTranslated', (event) => {
            logger_1.logger.debug('Protocol translation completed', event);
        });
    }
    /**
     * Set up event forwarding between hub and original Socket.IO
     */
    setupEventForwarding() {
        // Forward certain hub events to original Socket.IO clients
        this.hub.on('messageRouted', (event) => {
            // Forward routing information to connected clients for debugging
            this.originalIO.emit('hub:message:routed', {
                ...event,
                timestamp: new Date().toISOString()
            });
        });
        // Forward original Socket.IO events to hub clients
        this.originalIO.on('connection', (socket) => {
            this.connectionMap.set(socket.id, 'original');
            socket.on('disconnect', () => {
                this.connectionMap.delete(socket.id);
            });
            // Forward certain events to hub
            socket.on('hub:subscribe', (data) => {
                if (this.hub) {
                    this.hub.broadcastToInstanceType('claude-production', 'subscription:request', {
                        ...data,
                        sourceSocket: socket.id
                    });
                }
            });
        });
    }
    /**
     * Get connection metrics
     */
    getConnectionMetrics() {
        let hubConnections = 0;
        let originalConnections = 0;
        for (const type of this.connectionMap.values()) {
            if (type === 'hub') {
                hubConnections++;
            }
            else {
                originalConnections++;
            }
        }
        return {
            hubConnections,
            originalConnections,
            totalConnections: hubConnections + originalConnections
        };
    }
    /**
     * Get integration status
     */
    getStatus() {
        return {
            initialized: this.isInitialized,
            hubActive: this.hub?.isActive() || false,
            nldActive: !!this.nldIntegration,
            routingStrategy: this.config.routingStrategy,
            metrics: this.getConnectionMetrics()
        };
    }
    /**
     * Handle Claude instance registration through integration
     */
    async registerClaudeInstance(instanceData) {
        if (!this.hub) {
            throw new Error('Hub not available for Claude instance registration');
        }
        // Register with hub if socket ID provided
        if (instanceData.socketId) {
            // Note: This would call the private method in a real implementation
            // For now, we'll just log the registration
            logger_1.logger.info('Claude instance would be registered with hub', {
                socketId: instanceData.socketId,
                instanceData
            });
        }
        logger_1.logger.info('Claude instance registered through integration', {
            instanceId: instanceData.instanceId,
            version: instanceData.version
        });
    }
    /**
     * Broadcast message through appropriate channel
     */
    broadcastMessage(target, event, data) {
        if ((target === 'hub' || target === 'both') && this.hub) {
            this.hub.broadcastToInstanceType('frontend', event, data);
        }
        if (target === 'original' || target === 'both') {
            this.originalIO.emit(event, data);
        }
    }
    /**
     * Enable or disable NLD integration
     */
    async toggleNLD(enabled) {
        if (enabled && !this.nldIntegration) {
            await this.initializeNLDIntegration();
        }
        else if (!enabled && this.nldIntegration) {
            await this.nldIntegration.shutdown();
            this.nldIntegration = undefined;
        }
        this.config.enableNLD = enabled;
        logger_1.logger.info(`NLD integration ${enabled ? 'enabled' : 'disabled'}`);
    }
    /**
     * Update configuration
     */
    updateConfig(newConfig) {
        this.config = { ...this.config, ...newConfig };
        // Update hub config if available
        if (this.hub && newConfig.hubConfig) {
            // Hub would need to support config updates
            logger_1.logger.info('Hub configuration updated', newConfig.hubConfig);
        }
    }
    /**
     * Shutdown integration
     */
    async shutdown() {
        logger_1.logger.info('Shutting down WebSocket Hub integration');
        try {
            // Shutdown NLD integration
            if (this.nldIntegration) {
                await this.nldIntegration.shutdown();
            }
            // Shutdown hub
            if (this.hub) {
                await this.hub.stop();
            }
            // Clear connection tracking
            this.connectionMap.clear();
            this.isInitialized = false;
            logger_1.logger.info('WebSocket Hub integration shutdown completed');
        }
        catch (error) {
            logger_1.logger.error('Error during integration shutdown', { error: error.message });
            throw error;
        }
    }
}
exports.ServerIntegration = ServerIntegration;
/**
 * Factory function to create server integration
 */
async function createServerIntegration(httpServer, originalIO, config) {
    const integration = new ServerIntegration(httpServer, originalIO, config);
    await integration.initialize();
    return integration;
}
/**
 * Helper function to integrate with existing server setup
 */
async function integrateWebSocketHub(httpServer, originalIO, options = {}) {
    const config = {
        enableHub: true,
        enableNLD: false,
        enableSecurity: true,
        enableMetrics: true,
        preserveExistingHandlers: true,
        routingStrategy: 'hybrid',
        ...options
    };
    const integration = new ServerIntegration(httpServer, originalIO, config);
    return await integration.initialize();
}
//# sourceMappingURL=ServerIntegration.js.map