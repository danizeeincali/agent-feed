/**
 * Claude Instance WebSocket Handler
 * Provides real-time communication with dedicated Claude instances
 */
import { Server as HttpServer } from 'http';
import ClaudeProcessManager from '../../services/ClaudeProcessManager';
export declare class ClaudeInstanceWebSocketHandler {
    private io;
    private processManager;
    private sessions;
    private clientSockets;
    private connectionCount;
    private heartbeatInterval;
    constructor(server: HttpServer, processManager: ClaudeProcessManager);
    private setupEventHandlers;
    private handleConnection;
    private handleClientMessage;
    private handleJoinInstance;
    private handleSendMessage;
    private handleGetStatus;
    private handleInstanceMessage;
    private broadcastInstanceStatus;
    private broadcastError;
    private sendError;
    private updateSessionActivity;
    private handleDisconnection;
    private startHeartbeat;
    /**
     * Get current WebSocket statistics
     */
    getStats(): {
        connectedClients: number;
        activeSessions: number;
        sessionsByInstance: {
            [k: string]: number;
        };
        totalMessages: number;
    };
    /**
     * Shutdown WebSocket handler
     */
    shutdown(): void;
}
export default ClaudeInstanceWebSocketHandler;
//# sourceMappingURL=claude-instance-chat.d.ts.map