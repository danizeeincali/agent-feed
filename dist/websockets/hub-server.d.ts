import { EventEmitter } from 'events';
/**
 * WebSocket Hub Server
 * Central hub for communication between Claude instances and frontend
 */
export declare class HubServer extends EventEmitter {
    private wss;
    private instances;
    private port;
    private healthCheckInterval;
    constructor(port?: number);
    /**
     * Start the hub server
     */
    start(): Promise<void>;
    /**
     * Stop the hub server
     */
    stop(): Promise<void>;
    /**
     * Handle new WebSocket connection
     */
    private handleNewConnection;
    /**
     * Handle incoming messages
     */
    private handleMessage;
    /**
     * Handle instance registration
     */
    private handleRegistration;
    /**
     * Forward message to appropriate instance
     */
    private forwardMessage;
    /**
     * Handle response messages
     */
    private handleResponse;
    /**
     * Forward direct message to specific instance
     */
    private forwardDirectMessage;
    /**
     * Determine target instance for a message
     */
    private determineTarget;
    /**
     * Determine response target (simplified)
     */
    private determineResponseTarget;
    /**
     * Send message to WebSocket
     */
    private sendMessage;
    /**
     * Send error message
     */
    private sendError;
    /**
     * Send error to message sender
     */
    private sendErrorToSender;
    /**
     * Broadcast message to all instances except sender
     */
    private broadcastToInstances;
    /**
     * Broadcast message to instances of specific type
     */
    private broadcastToInstanceType;
    /**
     * Handle WebSocket disconnection
     */
    private handleDisconnection;
    /**
     * Start health check for connected instances
     */
    private startHealthCheck;
    /**
     * Get hub status
     */
    getStatus(): {
        running: boolean;
        port: number;
        connectedInstances: Array<{
            instanceId: string;
            instanceType: string;
            capabilities: any;
            lastSeen: Date;
        }>;
    };
    /**
     * Send message to specific instance
     */
    sendToInstance(instanceId: string, message: any): boolean;
    /**
     * Get connected instances by type
     */
    getInstancesByType(instanceType: string): string[];
}
export declare const hubServer: HubServer;
//# sourceMappingURL=hub-server.d.ts.map