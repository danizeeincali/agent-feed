import { Socket } from 'socket.io';
declare class ConnectionLimiter {
    private static instance;
    private connections;
    private readonly MAX_CONNECTIONS_PER_USER;
    private readonly CONNECTION_TIMEOUT;
    static getInstance(): ConnectionLimiter;
    addConnection(socket: Socket, userId: string): boolean;
    removeConnection(socketId: string, userId: string): void;
    getConnectionCount(userId: string): number;
    getTotalConnections(): number;
    private cleanupStaleConnections;
    private isConnectionActive;
    private forceDisconnect;
    startPeriodicCleanup(): void;
    getStatus(): {
        totalConnections: number;
        userCount: number;
        connections: Record<string, number>;
    };
}
export declare const connectionLimiter: ConnectionLimiter;
export {};
//# sourceMappingURL=connectionLimiter.d.ts.map