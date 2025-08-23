import { EventEmitter } from 'events';
/**
 * Production Claude WebSocket Client
 * Connects production Claude instance to the WebSocket hub
 */
export declare class ProdClaudeClient extends EventEmitter {
    private ws;
    private hubUrl;
    private reconnectAttempts;
    private maxReconnectAttempts;
    private reconnectDelay;
    private heartbeatInterval;
    private isConnected;
    private instanceId;
    private devModeConfig;
    private prodConfig;
    private securityBoundaries;
    constructor(hubUrl?: string);
    /**
     * Initialize the client with configuration loading
     */
    initialize(): Promise<void>;
    /**
     * Load dev mode and production configurations
     */
    private loadConfigurations;
    /**
     * Load and parse security boundaries from system instructions
     */
    private loadSecurityBoundaries;
    /**
     * Connect to the WebSocket hub
     */
    private connect;
    /**
     * Setup WebSocket event handlers
     */
    private setupWebSocketHandlers;
    /**
     * Register this instance with the hub
     */
    private registerWithHub;
    /**
     * Handle incoming messages from the hub
     */
    private handleIncomingMessage;
    /**
     * Validate message security based on boundaries
     */
    private validateMessageSecurity;
    /**
     * Check if chat is allowed based on dev mode settings
     */
    private isChatAllowed;
    /**
     * Handle command messages
     */
    private handleCommand;
    /**
     * Handle chat messages (only if dev mode allows)
     */
    private handleChat;
    /**
     * Handle system messages
     */
    private handleSystemMessage;
    /**
     * Execute a command with security validation
     */
    private executeCommand;
    /**
     * Read a file with path validation
     */
    private readFile;
    /**
     * Write a file with path and content validation
     */
    private writeFile;
    /**
     * List directory contents with path validation
     */
    private listDirectory;
    /**
     * Check if a path is allowed based on security boundaries
     */
    private isPathAllowed;
    /**
     * Get current health status
     */
    private getHealthStatus;
    /**
     * Get current capabilities
     */
    private getCapabilities;
    /**
     * Send a response back through the hub
     */
    private sendResponse;
    /**
     * Send an error response
     */
    private sendErrorResponse;
    /**
     * Start heartbeat mechanism
     */
    private startHeartbeat;
    /**
     * Stop heartbeat mechanism
     */
    private stopHeartbeat;
    /**
     * Schedule reconnection attempt
     */
    private scheduleReconnect;
    /**
     * Setup event handlers for external use
     */
    private setupEventHandlers;
    /**
     * Graceful shutdown
     */
    shutdown(): Promise<void>;
    /**
     * Get connection status
     */
    getStatus(): {
        connected: boolean;
        instanceId: string;
        devMode: boolean;
        sandboxMode: boolean;
        reconnectAttempts: number;
    };
}
export declare const prodClaudeClient: ProdClaudeClient;
//# sourceMappingURL=prod-claude-client.d.ts.map