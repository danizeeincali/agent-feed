"use strict";
/**
 * Client Registry - Instance registration and discovery for WebSocket Hub
 * Manages client connections, capabilities, and service discovery
 */
Object.defineProperty(exports, "__esModule", { value: true });
exports.ClientRegistry = void 0;
const events_1 = require("events");
const logger_1 = require("@/utils/logger");
class ClientRegistry extends events_1.EventEmitter {
    config;
    clients = new Map();
    claudeInstances = new Map();
    serviceEndpoints = new Map();
    sessionHistory = [];
    metrics;
    heartbeatInterval;
    cleanupInterval;
    constructor(config) {
        super();
        this.config = {
            heartbeatInterval: 30000, // 30 seconds
            enableHeartbeat: true,
            enableServiceDiscovery: true,
            ...config
        };
        this.initializeMetrics();
        this.startHeartbeat();
        this.startCleanup();
    }
    /**
     * Initialize registry metrics
     */
    initializeMetrics() {
        this.metrics = {
            totalClients: 0,
            clientsByType: new Map(),
            totalClaudeInstances: 0,
            averageSessionDuration: 0,
            activeServices: 0,
            connectionRate: 0,
            disconnectionRate: 0
        };
    }
    /**
     * Register a new client
     */
    registerClient(clientId, metadata) {
        if (this.clients.size >= this.config.maxClients) {
            throw new Error(`Maximum clients limit reached: ${this.config.maxClients}`);
        }
        if (this.clients.has(clientId)) {
            throw new Error(`Client ${clientId} already registered`);
        }
        const client = {
            id: clientId,
            instanceType: this.inferInstanceType(metadata),
            metadata: {
                ...metadata,
                channels: new Set()
            },
            status: 'connected'
        };
        // Initialize heartbeat if enabled
        if (this.config.enableHeartbeat) {
            client.heartbeat = {
                lastPing: new Date(),
                lastPong: new Date(),
                latency: 0,
                missedPings: 0
            };
        }
        this.clients.set(clientId, client);
        this.updateMetrics();
        logger_1.logger.info('Client registered', {
            clientId,
            instanceType: client.instanceType,
            capabilities: metadata.capabilities
        });
        this.emit('clientRegistered', clientId, metadata);
    }
    /**
     * Unregister a client
     */
    unregisterClient(clientId) {
        const client = this.clients.get(clientId);
        if (!client) {
            logger_1.logger.warn('Attempted to unregister non-existent client', { clientId });
            return;
        }
        // Record session duration
        const sessionDuration = Date.now() - client.metadata.registeredAt.getTime();
        this.sessionHistory.push({
            clientId,
            duration: sessionDuration,
            disconnectedAt: new Date()
        });
        // Remove from Claude instances if applicable
        for (const [instanceId, instance] of this.claudeInstances.entries()) {
            if (instance.clientId === clientId) {
                this.claudeInstances.delete(instanceId);
                logger_1.logger.info('Claude instance unregistered', { instanceId, clientId });
                this.emit('claudeInstanceUnregistered', instanceId);
            }
        }
        this.clients.delete(clientId);
        this.updateMetrics();
        logger_1.logger.info('Client unregistered', {
            clientId,
            sessionDuration: Math.round(sessionDuration / 1000)
        });
        this.emit('clientUnregistered', clientId);
    }
    /**
     * Register a Claude instance
     */
    async registerClaudeInstance(clientId, instanceData) {
        const client = this.clients.get(clientId);
        if (!client) {
            throw new Error(`Client ${clientId} not found`);
        }
        if (!this.isClaudeInstanceType(client.instanceType)) {
            throw new Error(`Client ${clientId} is not a Claude instance type`);
        }
        const claudeInstance = {
            instanceId: instanceData.instanceId,
            clientId,
            version: instanceData.version,
            capabilities: instanceData.capabilities,
            webhookUrl: instanceData.webhookUrl,
            status: 'active',
            registeredAt: new Date(),
            lastActivity: new Date(),
            metrics: {
                messagesProcessed: 0,
                averageResponseTime: 0,
                errorCount: 0,
                uptime: 0
            }
        };
        this.claudeInstances.set(instanceData.instanceId, claudeInstance);
        this.updateMetrics();
        logger_1.logger.info('Claude instance registered', {
            instanceId: instanceData.instanceId,
            clientId,
            version: instanceData.version,
            webhookUrl: instanceData.webhookUrl
        });
        this.emit('claudeInstanceRegistered', instanceData.instanceId, claudeInstance);
        // Register as service endpoint if service discovery is enabled
        if (this.config.enableServiceDiscovery) {
            await this.registerServiceEndpoint({
                id: instanceData.instanceId,
                type: client.instanceType,
                url: instanceData.webhookUrl || `ws://client:${clientId}`,
                capabilities: instanceData.capabilities,
                metadata: {
                    version: instanceData.version,
                    clientId,
                    registeredAt: new Date().toISOString()
                }
            });
        }
    }
    /**
     * Update client activity
     */
    updateClientActivity(clientId) {
        const client = this.clients.get(clientId);
        if (client) {
            client.metadata.lastActivity = new Date();
            client.status = 'active';
            // Update Claude instance activity if applicable
            for (const instance of this.claudeInstances.values()) {
                if (instance.clientId === clientId) {
                    instance.lastActivity = new Date();
                    if (instance.metrics) {
                        instance.metrics.uptime = Date.now() - instance.registeredAt.getTime();
                    }
                }
            }
        }
    }
    /**
     * Update client heartbeat
     */
    updateClientHeartbeat(clientId, type) {
        const client = this.clients.get(clientId);
        if (client?.heartbeat) {
            const now = new Date();
            if (type === 'ping') {
                client.heartbeat.lastPing = now;
            }
            else {
                client.heartbeat.lastPong = now;
                client.heartbeat.latency = now.getTime() - client.heartbeat.lastPing.getTime();
                client.heartbeat.missedPings = 0;
            }
            this.updateClientActivity(clientId);
        }
    }
    /**
     * Add client to channel
     */
    addClientToChannel(clientId, channel) {
        const client = this.clients.get(clientId);
        if (client) {
            client.metadata.channels.add(channel);
            this.updateClientActivity(clientId);
        }
    }
    /**
     * Remove client from channel
     */
    removeClientFromChannel(clientId, channel) {
        const client = this.clients.get(clientId);
        if (client) {
            client.metadata.channels.delete(channel);
        }
    }
    /**
     * Get client by ID
     */
    getClient(clientId) {
        return this.clients.get(clientId);
    }
    /**
     * Get all clients
     */
    getAllClients() {
        return Array.from(this.clients.values());
    }
    /**
     * Get clients by instance type
     */
    getClientsByType(instanceType) {
        return Array.from(this.clients.values()).filter(client => client.instanceType === instanceType);
    }
    /**
     * Get clients by capability
     */
    getClientsByCapability(capability) {
        return Array.from(this.clients.values()).filter(client => client.metadata.capabilities.includes(capability));
    }
    /**
     * Get clients subscribed to channel
     */
    getClientsInChannel(channel) {
        return Array.from(this.clients.values()).filter(client => client.metadata.channels.has(channel));
    }
    /**
     * Get Claude instance by ID
     */
    getClaudeInstance(instanceId) {
        return this.claudeInstances.get(instanceId);
    }
    /**
     * Get all Claude instances
     */
    getAllClaudeInstances() {
        return Array.from(this.claudeInstances.values());
    }
    /**
     * Get active Claude instances
     */
    getActiveClaudeInstances() {
        return Array.from(this.claudeInstances.values()).filter(instance => instance.status === 'active');
    }
    /**
     * Find Claude instances by capability
     */
    findClaudeInstancesByCapability(capability) {
        return Array.from(this.claudeInstances.values()).filter(instance => instance.capabilities.includes(capability));
    }
    /**
     * Update Claude instance metrics
     */
    updateClaudeInstanceMetrics(instanceId, metrics) {
        const instance = this.claudeInstances.get(instanceId);
        if (instance?.metrics) {
            Object.assign(instance.metrics, metrics);
            instance.lastActivity = new Date();
        }
    }
    /**
     * Register service endpoint
     */
    async registerServiceEndpoint(endpoint) {
        if (!this.config.enableServiceDiscovery) {
            return;
        }
        const serviceEndpoint = {
            ...endpoint,
            health: 'unknown',
            lastHealthCheck: new Date()
        };
        this.serviceEndpoints.set(endpoint.id, serviceEndpoint);
        logger_1.logger.debug('Service endpoint registered', {
            id: endpoint.id,
            type: endpoint.type,
            url: endpoint.url
        });
        this.emit('serviceEndpointRegistered', endpoint.id, serviceEndpoint);
        // Perform initial health check
        await this.performHealthCheck(endpoint.id);
    }
    /**
     * Unregister service endpoint
     */
    unregisterServiceEndpoint(endpointId) {
        this.serviceEndpoints.delete(endpointId);
        this.emit('serviceEndpointUnregistered', endpointId);
    }
    /**
     * Get service endpoints by type
     */
    getServiceEndpointsByType(type) {
        return Array.from(this.serviceEndpoints.values()).filter(endpoint => endpoint.type === type);
    }
    /**
     * Get healthy service endpoints
     */
    getHealthyServiceEndpoints() {
        return Array.from(this.serviceEndpoints.values()).filter(endpoint => endpoint.health === 'healthy');
    }
    /**
     * Perform health check on service endpoint
     */
    async performHealthCheck(endpointId) {
        const endpoint = this.serviceEndpoints.get(endpointId);
        if (!endpoint)
            return;
        try {
            // Simple health check - in production, this would be more sophisticated
            const isHealthy = await this.checkEndpointHealth(endpoint.url);
            endpoint.health = isHealthy ? 'healthy' : 'unhealthy';
            endpoint.lastHealthCheck = new Date();
            this.emit('healthCheckCompleted', endpointId, endpoint.health);
        }
        catch (error) {
            endpoint.health = 'unhealthy';
            endpoint.lastHealthCheck = new Date();
            logger_1.logger.error('Health check failed', {
                endpointId,
                url: endpoint.url,
                error: error.message
            });
        }
    }
    /**
     * Get registry metrics
     */
    getMetrics() {
        this.updateMetrics();
        return { ...this.metrics };
    }
    /**
     * Get client health summary
     */
    getClientHealthSummary() {
        const clients = Array.from(this.clients.values());
        let healthy = 0;
        let unhealthy = 0;
        let idle = 0;
        let totalLatency = 0;
        let latencyCount = 0;
        clients.forEach(client => {
            if (client.status === 'active') {
                healthy++;
            }
            else if (client.status === 'idle') {
                idle++;
            }
            else {
                unhealthy++;
            }
            if (client.heartbeat?.latency) {
                totalLatency += client.heartbeat.latency;
                latencyCount++;
            }
        });
        return {
            healthy,
            unhealthy,
            idle,
            totalConnections: clients.length,
            averageLatency: latencyCount > 0 ? totalLatency / latencyCount : 0
        };
    }
    /**
     * Get session statistics
     */
    getSessionStatistics() {
        const now = Date.now();
        const recentThreshold = now - (60 * 60 * 1000); // 1 hour ago
        const activeSessions = this.clients.size;
        const totalSessions = this.sessionHistory.length + activeSessions;
        const recentDisconnections = this.sessionHistory.filter(session => session.disconnectedAt.getTime() > recentThreshold).length;
        // Calculate average session duration
        const completedSessions = this.sessionHistory.slice(-1000); // Last 1000 sessions
        const averageSessionDuration = completedSessions.length > 0
            ? completedSessions.reduce((sum, session) => sum + session.duration, 0) / completedSessions.length
            : 0;
        return {
            averageSessionDuration: Math.round(averageSessionDuration / 1000), // Convert to seconds
            totalSessions,
            activeSessions,
            recentDisconnections
        };
    }
    /**
     * Start heartbeat monitoring
     */
    startHeartbeat() {
        if (!this.config.enableHeartbeat)
            return;
        this.heartbeatInterval = setInterval(() => {
            this.checkClientHeartbeats();
        }, this.config.heartbeatInterval);
    }
    /**
     * Check client heartbeats and mark stale clients
     */
    checkClientHeartbeats() {
        const now = Date.now();
        const heartbeatTimeout = this.config.heartbeatInterval * 3; // 3x interval
        for (const [clientId, client] of this.clients.entries()) {
            if (!client.heartbeat)
                continue;
            const timeSinceLastPong = now - client.heartbeat.lastPong.getTime();
            if (timeSinceLastPong > heartbeatTimeout) {
                client.heartbeat.missedPings++;
                if (client.heartbeat.missedPings > 3) {
                    client.status = 'disconnected';
                    logger_1.logger.warn('Client marked as disconnected due to missed heartbeats', {
                        clientId,
                        missedPings: client.heartbeat.missedPings
                    });
                    this.emit('clientTimeout', clientId);
                }
                else {
                    client.status = 'idle';
                }
            }
        }
    }
    /**
     * Start cleanup routine
     */
    startCleanup() {
        this.cleanupInterval = setInterval(() => {
            this.cleanupStaleData();
        }, 60000); // Run every minute
    }
    /**
     * Clean up stale data
     */
    cleanupStaleData() {
        const now = Date.now();
        const sessionTimeout = this.config.sessionTimeout;
        // Remove disconnected clients that have timed out
        for (const [clientId, client] of this.clients.entries()) {
            if (client.status === 'disconnected') {
                const timeSinceLastActivity = now - client.metadata.lastActivity.getTime();
                if (timeSinceLastActivity > sessionTimeout) {
                    this.unregisterClient(clientId);
                }
            }
        }
        // Limit session history size
        if (this.sessionHistory.length > 10000) {
            this.sessionHistory.splice(0, 5000); // Remove oldest 5000 entries
        }
        // Perform health checks on service endpoints
        if (this.config.enableServiceDiscovery) {
            const healthCheckInterval = 5 * 60 * 1000; // 5 minutes
            for (const [endpointId, endpoint] of this.serviceEndpoints.entries()) {
                const timeSinceLastCheck = now - endpoint.lastHealthCheck.getTime();
                if (timeSinceLastCheck > healthCheckInterval) {
                    this.performHealthCheck(endpointId);
                }
            }
        }
    }
    /**
     * Update registry metrics
     */
    updateMetrics() {
        this.metrics.totalClients = this.clients.size;
        this.metrics.totalClaudeInstances = this.claudeInstances.size;
        this.metrics.activeServices = this.serviceEndpoints.size;
        // Update clients by type
        this.metrics.clientsByType.clear();
        for (const client of this.clients.values()) {
            const current = this.metrics.clientsByType.get(client.instanceType) || 0;
            this.metrics.clientsByType.set(client.instanceType, current + 1);
        }
        // Calculate average session duration
        const recentSessions = this.sessionHistory.slice(-100); // Last 100 sessions
        if (recentSessions.length > 0) {
            this.metrics.averageSessionDuration = recentSessions.reduce((sum, session) => sum + session.duration, 0) / recentSessions.length;
        }
    }
    /**
     * Infer instance type from metadata
     */
    inferInstanceType(metadata) {
        if (metadata.instanceType) {
            return metadata.instanceType;
        }
        // Fallback inference based on capabilities
        const capabilities = metadata.capabilities || [];
        if (capabilities.includes('claude-production'))
            return 'claude-production';
        if (capabilities.includes('claude-dev'))
            return 'claude-dev';
        if (capabilities.includes('webhook'))
            return 'webhook';
        return 'frontend';
    }
    /**
     * Check if instance type is a Claude instance
     */
    isClaudeInstanceType(instanceType) {
        return instanceType === 'claude-production' || instanceType === 'claude-dev';
    }
    /**
     * Check endpoint health (basic implementation)
     */
    async checkEndpointHealth(url) {
        try {
            // For WebSocket URLs, we can't do a simple HTTP check
            if (url.startsWith('ws://') || url.startsWith('wss://')) {
                return true; // Assume healthy for now
            }
            // For HTTP URLs, we could do a fetch request
            // This is a simplified implementation
            return true;
        }
        catch {
            return false;
        }
    }
    /**
     * Update configuration
     */
    updateConfig(newConfig) {
        this.config = { ...this.config, ...newConfig };
        this.emit('configUpdated', this.config);
    }
    /**
     * Clean up resources
     */
    async shutdown() {
        if (this.heartbeatInterval) {
            clearInterval(this.heartbeatInterval);
        }
        if (this.cleanupInterval) {
            clearInterval(this.cleanupInterval);
        }
        this.clients.clear();
        this.claudeInstances.clear();
        this.serviceEndpoints.clear();
        this.sessionHistory.length = 0;
        this.removeAllListeners();
        logger_1.logger.info('Client registry shutdown completed');
    }
}
exports.ClientRegistry = ClientRegistry;
//# sourceMappingURL=ClientRegistry.js.map