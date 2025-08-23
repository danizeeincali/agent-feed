/**
 * WebSocket Hub Integration with Existing Port 3001 Infrastructure
 * Solves webhook/WebSocket mismatch and enables real-time communication
 */
import { Express } from 'express';
export declare class WebSocketHubIntegration {
    private io;
    private httpServer;
    private clients;
    private messageQueue;
    private securityConfig;
    constructor(app: Express, port?: number);
    private loadSecurityConfig;
    private setupEventHandlers;
    private handleClientRegistration;
    private handleClaudeRegistration;
    private handleMessage;
    private routeToClaudeInstance;
    private routeFromClaudeInstance;
    private validateClaudeAuthentication;
    private validateClaudeMessage;
    private routeToClient;
    private broadcastMessage;
    private broadcastToType;
    private updateHeartbeat;
    private handleDisconnection;
    private startHeartbeatMonitoring;
    private getHubStatus;
    private generateMessageId;
    start(): Promise<void>;
    getStats(): {
        connections: number;
        messageQueue: number;
        uptime: number;
        hubStatus: {
            totalClients: number;
            clientsByType: Record<string, number>;
            securityEnforced: any;
            uptime: number;
        };
    };
}
export default WebSocketHubIntegration;
//# sourceMappingURL=websocket-hub-integration.d.ts.map