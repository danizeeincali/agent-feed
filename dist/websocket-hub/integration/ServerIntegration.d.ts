/**
 * Server Integration - Integrates WebSocket Hub with existing server.ts
 * Provides seamless integration while maintaining existing functionality
 */
import { Server as HTTPServer } from 'http';
import { Server as SocketIOServer } from 'socket.io';
import { WebSocketHub, WebSocketHubConfig } from '../core';
import { NLDWebSocketIntegration } from '@/nld/websocket-integration';
export interface ServerIntegrationConfig {
    enableHub: boolean;
    enableNLD: boolean;
    enableSecurity: boolean;
    enableMetrics: boolean;
    hubConfig?: Partial<WebSocketHubConfig>;
    preserveExistingHandlers: boolean;
    routingStrategy: 'hub-only' | 'hybrid' | 'fallback';
}
export interface IntegrationResult {
    hub: WebSocketHub;
    nldIntegration?: NLDWebSocketIntegration;
    originalIO: SocketIOServer;
    metrics: {
        hubConnections: number;
        originalConnections: number;
        totalConnections: number;
    };
}
export declare class ServerIntegration {
    private hub;
    private originalIO;
    private nldIntegration?;
    private config;
    private isInitialized;
    private connectionMap;
    constructor(httpServer: HTTPServer, originalIO: SocketIOServer, config: ServerIntegrationConfig);
    /**
     * Initialize the WebSocket Hub integration
     */
    initialize(): Promise<IntegrationResult>;
    /**
     * Initialize NLD integration
     */
    private initializeNLDIntegration;
    /**
     * Create WebSocket service wrapper for NLD integration
     */
    private createWebSocketServiceWrapper;
    /**
     * Set up integration between NLD and Hub
     */
    private setupNLDHubIntegration;
    /**
     * Set up routing strategy between hub and original Socket.IO
     */
    private setupRoutingStrategy;
    /**
     * Set up hub-only routing (all connections go through hub)
     */
    private setupHubOnlyRouting;
    /**
     * Set up hybrid routing (smart routing based on client type)
     */
    private setupHybridRouting;
    /**
     * Set up fallback routing (original first, hub as fallback)
     */
    private setupFallbackRouting;
    /**
     * Set up hub event handlers for integration
     */
    private setupHubEventHandlers;
    /**
     * Set up event forwarding between hub and original Socket.IO
     */
    private setupEventForwarding;
    /**
     * Get connection metrics
     */
    getConnectionMetrics(): IntegrationResult['metrics'];
    /**
     * Get integration status
     */
    getStatus(): {
        initialized: boolean;
        hubActive: boolean;
        nldActive: boolean;
        routingStrategy: string;
        metrics: IntegrationResult['metrics'];
    };
    /**
     * Handle Claude instance registration through integration
     */
    registerClaudeInstance(instanceData: {
        instanceId: string;
        version: string;
        capabilities: string[];
        webhookUrl?: string;
        socketId?: string;
    }): Promise<void>;
    /**
     * Broadcast message through appropriate channel
     */
    broadcastMessage(target: 'hub' | 'original' | 'both', event: string, data: any): void;
    /**
     * Enable or disable NLD integration
     */
    toggleNLD(enabled: boolean): Promise<void>;
    /**
     * Update configuration
     */
    updateConfig(newConfig: Partial<ServerIntegrationConfig>): void;
    /**
     * Shutdown integration
     */
    shutdown(): Promise<void>;
}
/**
 * Factory function to create server integration
 */
export declare function createServerIntegration(httpServer: HTTPServer, originalIO: SocketIOServer, config: ServerIntegrationConfig): Promise<ServerIntegration>;
/**
 * Helper function to integrate with existing server setup
 */
export declare function integrateWebSocketHub(httpServer: HTTPServer, originalIO: SocketIOServer, options?: Partial<ServerIntegrationConfig>): Promise<IntegrationResult>;
//# sourceMappingURL=ServerIntegration.d.ts.map