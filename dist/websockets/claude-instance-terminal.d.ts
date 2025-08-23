/**
 * Claude Instance Terminal WebSocket Handler
 *
 * Real-time terminal communication for Claude instances using Socket.IO
 * with authentication, rate limiting, and multi-client synchronization.
 */
import { Server as SocketIOServer } from 'socket.io';
export declare class ClaudeInstanceTerminalWebSocket {
    private io;
    private connectedClients;
    private rateLimits;
    private heartbeatInterval?;
    constructor(io: SocketIOServer);
    private setupNamespace;
    private handleConnection;
    private setupSocketHandlers;
    private handleTerminalDisconnect;
    private handleClientDisconnect;
    private setupInstanceManagerEvents;
    private broadcastTerminalData;
    private broadcastInstanceStatus;
    private handleInstanceDestroyed;
    private checkRateLimit;
    private validateTerminalInput;
    private validateTerminalSize;
    private startHeartbeat;
    private performHeartbeat;
    /**
     * Get statistics about terminal connections
     */
    getStats(): any;
    /**
     * Shutdown handler
     */
    shutdown(): void;
}
export default ClaudeInstanceTerminalWebSocket;
//# sourceMappingURL=claude-instance-terminal.d.ts.map