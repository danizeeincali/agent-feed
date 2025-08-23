/**
 * Terminal WebSocket Handler
 *
 * Manages WebSocket connections for terminal communication,
 * multi-tab synchronization, and process management.
 */
import { Server as SocketIOServer, Socket } from 'socket.io';
export declare class TerminalWebSocket {
    private io;
    private sessions;
    private readonly SHARED_SESSION_ID;
    private readonly MAX_BUFFER_SIZE;
    constructor(io: SocketIOServer);
    /**
     * Initialize the shared terminal session
     */
    private initializeSharedSession;
    /**
     * Setup ProcessManager event listeners
     */
    private setupProcessManagerListeners;
    /**
     * Handle new socket connection
     */
    handleConnection(socket: Socket): void;
    /**
     * Add data to session buffer
     */
    private addToBuffer;
    /**
     * Broadcast to all sockets in a session
     */
    private broadcastToSession;
    /**
     * Broadcast to all connected sockets
     */
    private broadcastToAll;
    /**
     * Clean up resources
     */
    cleanup(): void;
}
export default TerminalWebSocket;
//# sourceMappingURL=TerminalWebSocket.d.ts.map