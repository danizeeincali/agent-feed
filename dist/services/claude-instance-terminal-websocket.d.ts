/**
 * Claude Instance Terminal WebSocket Service
 *
 * Provides WebSocket bridge for streaming terminal output from Claude instances
 * to frontend clients. Integrates with claude-instance-manager PTY sessions.
 */
import { Server as SocketIOServer } from 'socket.io';
import { EventEmitter } from 'events';
export declare class ClaudeInstanceTerminalWebSocket extends EventEmitter {
    private io;
    private clients;
    private rateLimits;
    private heartbeatInterval?;
    private namespace;
    constructor(io: SocketIOServer);
    /**
     * Initialize the terminal WebSocket namespace
     */
    initialize(): void;
    private setupAuthentication;
    private setupConnectionHandlers;
    private handleConnection;
    private setupSocketEvents;
    private connectClientToInstance;
    private handleTerminalInput;
    private handleTerminalResize;
    private disconnectClientFromInstance;
    private sendInstanceList;
    private handleClientDisconnect;
    private connectInstanceManagerEvents;
    private broadcastTerminalData;
    private broadcastInstanceStatus;
    private broadcastInstanceCreated;
    private handleInstanceDestroyed;
    private disconnectInstanceClients;
    private checkRateLimit;
    private startHeartbeat;
    private performHeartbeat;
    /**
     * Get statistics about terminal connections
     */
    getStats(): any;
    private getInstanceConnections;
    /**
     * Shutdown the service
     */
    shutdown(): void;
}
export default ClaudeInstanceTerminalWebSocket;
//# sourceMappingURL=claude-instance-terminal-websocket.d.ts.map