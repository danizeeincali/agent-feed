/**
 * Client Registry - Instance registration and discovery for WebSocket Hub
 * Manages client connections, capabilities, and service discovery
 */
import { EventEmitter } from 'events';
export interface ClientRegistryConfig {
    maxClients: number;
    sessionTimeout: number;
    enableMetrics: boolean;
    enableHeartbeat: boolean;
    heartbeatInterval?: number;
    enableServiceDiscovery: boolean;
}
export interface RegisteredClient {
    id: string;
    instanceType: 'frontend' | 'claude-production' | 'claude-dev' | 'webhook';
    metadata: {
        userId?: string;
        sessionId: string;
        capabilities: string[];
        registeredAt: Date;
        lastActivity: Date;
        channels: Set<string>;
        version?: string;
        userAgent?: string;
        connectionInfo?: {
            ip: string;
            transport: string;
            protocol: string;
        };
    };
    status: 'connected' | 'disconnected' | 'idle' | 'active';
    heartbeat?: {
        lastPing: Date;
        lastPong: Date;
        latency: number;
        missedPings: number;
    };
}
export interface ClaudeInstance {
    instanceId: string;
    clientId: string;
    version: string;
    capabilities: string[];
    webhookUrl?: string;
    status: 'active' | 'inactive' | 'maintenance';
    registeredAt: Date;
    lastActivity: Date;
    metrics?: {
        messagesProcessed: number;
        averageResponseTime: number;
        errorCount: number;
        uptime: number;
    };
}
export interface ServiceEndpoint {
    id: string;
    type: string;
    url: string;
    capabilities: string[];
    metadata: Record<string, any>;
    health: 'healthy' | 'unhealthy' | 'unknown';
    lastHealthCheck: Date;
}
export interface RegistryMetrics {
    totalClients: number;
    clientsByType: Map<string, number>;
    totalClaudeInstances: number;
    averageSessionDuration: number;
    activeServices: number;
    connectionRate: number;
    disconnectionRate: number;
}
export declare class ClientRegistry extends EventEmitter {
    private config;
    private clients;
    private claudeInstances;
    private serviceEndpoints;
    private sessionHistory;
    private metrics;
    private heartbeatInterval?;
    private cleanupInterval?;
    constructor(config: ClientRegistryConfig);
    /**
     * Initialize registry metrics
     */
    private initializeMetrics;
    /**
     * Register a new client
     */
    registerClient(clientId: string, metadata: RegisteredClient['metadata']): void;
    /**
     * Unregister a client
     */
    unregisterClient(clientId: string): void;
    /**
     * Register a Claude instance
     */
    registerClaudeInstance(clientId: string, instanceData: {
        instanceId: string;
        version: string;
        capabilities: string[];
        webhookUrl?: string;
    }): Promise<void>;
    /**
     * Update client activity
     */
    updateClientActivity(clientId: string): void;
    /**
     * Update client heartbeat
     */
    updateClientHeartbeat(clientId: string, type: 'ping' | 'pong'): void;
    /**
     * Add client to channel
     */
    addClientToChannel(clientId: string, channel: string): void;
    /**
     * Remove client from channel
     */
    removeClientFromChannel(clientId: string, channel: string): void;
    /**
     * Get client by ID
     */
    getClient(clientId: string): RegisteredClient | undefined;
    /**
     * Get all clients
     */
    getAllClients(): RegisteredClient[];
    /**
     * Get clients by instance type
     */
    getClientsByType(instanceType: string): RegisteredClient[];
    /**
     * Get clients by capability
     */
    getClientsByCapability(capability: string): RegisteredClient[];
    /**
     * Get clients subscribed to channel
     */
    getClientsInChannel(channel: string): RegisteredClient[];
    /**
     * Get Claude instance by ID
     */
    getClaudeInstance(instanceId: string): ClaudeInstance | undefined;
    /**
     * Get all Claude instances
     */
    getAllClaudeInstances(): ClaudeInstance[];
    /**
     * Get active Claude instances
     */
    getActiveClaudeInstances(): ClaudeInstance[];
    /**
     * Find Claude instances by capability
     */
    findClaudeInstancesByCapability(capability: string): ClaudeInstance[];
    /**
     * Update Claude instance metrics
     */
    updateClaudeInstanceMetrics(instanceId: string, metrics: Partial<ClaudeInstance['metrics']>): void;
    /**
     * Register service endpoint
     */
    registerServiceEndpoint(endpoint: Omit<ServiceEndpoint, 'health' | 'lastHealthCheck'>): Promise<void>;
    /**
     * Unregister service endpoint
     */
    unregisterServiceEndpoint(endpointId: string): void;
    /**
     * Get service endpoints by type
     */
    getServiceEndpointsByType(type: string): ServiceEndpoint[];
    /**
     * Get healthy service endpoints
     */
    getHealthyServiceEndpoints(): ServiceEndpoint[];
    /**
     * Perform health check on service endpoint
     */
    performHealthCheck(endpointId: string): Promise<void>;
    /**
     * Get registry metrics
     */
    getMetrics(): RegistryMetrics;
    /**
     * Get client health summary
     */
    getClientHealthSummary(): {
        healthy: number;
        unhealthy: number;
        idle: number;
        totalConnections: number;
        averageLatency: number;
    };
    /**
     * Get session statistics
     */
    getSessionStatistics(): {
        averageSessionDuration: number;
        totalSessions: number;
        activeSessions: number;
        recentDisconnections: number;
    };
    /**
     * Start heartbeat monitoring
     */
    private startHeartbeat;
    /**
     * Check client heartbeats and mark stale clients
     */
    private checkClientHeartbeats;
    /**
     * Start cleanup routine
     */
    private startCleanup;
    /**
     * Clean up stale data
     */
    private cleanupStaleData;
    /**
     * Update registry metrics
     */
    private updateMetrics;
    /**
     * Infer instance type from metadata
     */
    private inferInstanceType;
    /**
     * Check if instance type is a Claude instance
     */
    private isClaudeInstanceType;
    /**
     * Check endpoint health (basic implementation)
     */
    private checkEndpointHealth;
    /**
     * Update configuration
     */
    updateConfig(newConfig: Partial<ClientRegistryConfig>): void;
    /**
     * Clean up resources
     */
    shutdown(): Promise<void>;
}
//# sourceMappingURL=ClientRegistry.d.ts.map