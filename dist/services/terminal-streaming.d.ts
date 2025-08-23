/**
 * Advanced WebSocket Terminal Streaming Service
 * Provides robust terminal streaming with session management, authentication, and security
 */
import { Server as SocketIOServer } from 'socket.io';
import { EventEmitter } from 'events';
interface TerminalConfig {
    shell?: string;
    cwd?: string;
    cols?: number;
    rows?: number;
    env?: Record<string, string>;
    maxSessions?: number;
    sessionTimeout?: number;
    authentication?: boolean;
}
export declare class TerminalStreamingService extends EventEmitter {
    private sessions;
    private io;
    private config;
    private cleanupInterval;
    constructor(io: SocketIOServer, config?: TerminalConfig);
    private setupNamespace;
    private setupRateLimiting;
    private checkRateLimit;
    private createSession;
    private handleInput;
    private handleResize;
    private killSession;
    private listSessions;
    private handleDisconnection;
    private handleSocketError;
    private startCleanupProcess;
    private cleanupStaleSessions;
    private generateSessionId;
    private getDefaultSessionId;
    getSessionStats(): {
        totalSessions: number;
        activeSessions: number;
        sessionsByUser: Record<string, number>;
        serverConfig: {
            maxSessions: number;
            sessionTimeout: number;
        };
    };
    private getSessionsByUser;
    broadcastToSessions(event: string, data: any): void;
    destroy(): void;
}
export default TerminalStreamingService;
//# sourceMappingURL=terminal-streaming.d.ts.map