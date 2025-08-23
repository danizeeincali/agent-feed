/**
 * WebSocket Hub - Main hub class for managing WebSocket connections
 * Solves webhook/WebSocket mismatch by providing protocol translation
 * and real-time bidirectional communication
 */
import { EventEmitter } from 'events';
import { Server as HTTPServer } from 'http';
import { Socket } from 'socket.io';
export interface WebSocketHubConfig {
    port: number;
    cors: {
        origin: string[];
        credentials: boolean;
    };
    transports: string[];
    pingTimeout: number;
    pingInterval: number;
    maxConnections: number;
    enableNLD: boolean;
    enableSecurity: boolean;
    enableMetrics: boolean;
    routingStrategy: 'round-robin' | 'weighted' | 'session-affinity';
    claudeInstanceUrl?: string;
}
export interface ConnectedClient {
    id: string;
    socket: Socket;
    instanceType: 'frontend' | 'claude-production' | 'claude-dev' | 'webhook';
    metadata: {
        userId?: string;
        sessionId?: string;
        capabilities: string[];
        registeredAt: Date;
        lastActivity: Date;
        channels: Set<string>;
    };
}
export interface HubMetrics {
    totalConnections: number;
    activeChannels: number;
    messagesPerSecond: number;
    protocolTranslations: number;
    errors: number;
    uptime: number;
}
export declare class WebSocketHub extends EventEmitter {
    private io;
    private httpServer;
    private config;
    private messageRouter;
    private securityManager;
    private clientRegistry;
    private protocolTranslator;
    private nldIntegration?;
    private connectedClients;
    private channels;
    private metrics;
    private isRunning;
    private startTime;
    constructor(httpServer: HTTPServer, config: WebSocketHubConfig);
    /**
     * Initialize hub metrics
     */
    private initializeMetrics;
    /**
     * Initialize core components
     */
    private initializeComponents;
    /**
     * Set up Socket.IO server
     */
    private setupSocketIO;
    /**
     * Set up event handlers for core components
     */
    private setupComponentEventHandlers;
    /**
     * Authenticate client connection
     */
    private authenticateClient;
    /**
     * Handle new client connection
     */
    private handleClientConnection;
    /**
     * Set up event handlers for a connected client
     */
    private setupClientEventHandlers;
    /**
     * Subscribe client to a channel
     */
    private subscribeClientToChannel;
    /**
     * Unsubscribe client from a channel
     */
    private unsubscribeClientFromChannel;
    /**
     * Handle client message
     */
    private handleClientMessage;
    /**
     * Register Claude instance for webhook translation
     */
    private registerClaudeInstance;
    /**
     * Handle client disconnection
     */
    private handleClientDisconnection;
    /**
     * Start the WebSocket Hub
     */
    start(): Promise<void>;
    /**
     * Stop the WebSocket Hub
     */
    stop(): Promise<void>;
    /**
     * Start metrics collection
     */
    private startMetricsCollection;
    /**
     * Update hub metrics
     */
    private updateMetrics;
    /**
     * Get current hub metrics
     */
    getMetrics(): HubMetrics;
    /**
     * Get connected clients information
     */
    getConnectedClients(): Array<{
        id: string;
        instanceType: string;
        capabilities: string[];
        channels: string[];
    }>;
    /**
     * Get active channels information
     */
    getActiveChannels(): Array<{
        channel: string;
        clientCount: number;
        clients: string[];
    }>;
    /**
     * Broadcast message to all clients of a specific instance type
     */
    broadcastToInstanceType(instanceType: string, event: string, data: any): void;
    /**
     * Send message to specific client
     */
    sendToClient(clientId: string, event: string, data: any): boolean;
    /**
     * Generate unique session ID
     */
    private generateSessionId;
    /**
     * Check if hub is running
     */
    isActive(): boolean;
}
//# sourceMappingURL=WebSocketHub.d.ts.map