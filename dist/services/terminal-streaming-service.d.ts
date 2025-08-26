/**
 * Advanced Terminal Streaming Service
 *
 * Enhanced terminal streaming service that integrates with Claude Instance Manager
 * to provide robust WebSocket terminal connections with session management,
 * authentication, and multi-client support.
 */
import { Server as SocketIOServer } from 'socket.io';
import { EventEmitter } from 'events';
interface AdvancedTerminalConfig {
    shell?: string;
    maxSessions?: number;
    sessionTimeout?: number;
    authentication?: boolean;
    enableMetrics?: boolean;
    rateLimitWindow?: number;
    rateLimitMax?: number;
}
export declare class AdvancedTerminalStreamingService extends EventEmitter {
    private sessions;
    private io;
    private config;
    private rateLimits;
    private cleanupInterval?;
    private metricsInterval?;
    private namespace;
    constructor(io: SocketIOServer, config?: AdvancedTerminalConfig);
    /**
     * Initialize the terminal streaming service
     */
    initialize(): void;
    private setupNamespace;
    private handleConnection;
    private setupSocketEvents;
    private startStreaming;
    private stopStreaming;
    private sendStreamingStatus;
    private sendAvailableInstances;
    private sendMetrics;
    private handleDisconnect;
    private connectToInstanceManager;
    private broadcastTerminalData;
    private broadcastInstanceStatus;
    private handleInstanceDestroyed;
    private getSocketSessions;
    private checkRateLimit;
    private generateSessionId;
    private startCleanupProcess;
    private cleanupStaleSessions;
    private startMetricsCollection;
    private collectMetrics;
    /**
     * Public methods for external access
     */
    getSessionStats(): {
        totalSessions: number;
        activeSessions: number;
        sessionsByInstance: Record<string, number>;
        sessionsByUser: Record<string, number>;
        totalMetrics: {
            totalMessages: number;
            totalBytes: number;
            totalErrors: number;
            averageSessionDuration: number;
        };
        config: {
            maxSessions: number;
            sessionTimeout: number;
            authentication: boolean;
        };
    };
    private getSessionsByInstance;
    private getSessionsByUser;
    private getTotalMetrics;
    broadcastToSessions(event: string, data: any): void;
    /**
     * Shutdown the service
     */
    destroy(): void;
}
export default AdvancedTerminalStreamingService;
//# sourceMappingURL=terminal-streaming-service.d.ts.map