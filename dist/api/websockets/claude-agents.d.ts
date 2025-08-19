/**
 * Claude Code Agent WebSocket Integration
 * Provides real-time communication for Claude agents
 */
import { Server as SocketIOServer } from 'socket.io';
export declare class ClaudeAgentWebSocketManager {
    private io;
    private connectedSockets;
    private isInitialized;
    /**
     * Initialize WebSocket manager with Socket.IO server
     */
    initialize(io: SocketIOServer): void;
    /**
     * Setup Claude-specific namespace
     */
    private setupNamespace;
    /**
     * Authenticate socket connection
     */
    private authenticateSocket;
    /**
     * Handle new socket connection
     */
    private handleConnection;
    /**
     * Setup socket event handlers
     */
    private setupSocketEvents;
    /**
     * Handle session subscription
     */
    private handleSessionSubscribe;
    /**
     * Handle session unsubscription
     */
    private handleSessionUnsubscribe;
    /**
     * Handle session creation
     */
    private handleSessionCreate;
    /**
     * Handle session termination
     */
    private handleSessionTerminate;
    /**
     * Handle agent subscription
     */
    private handleAgentSubscribe;
    /**
     * Handle agent unsubscription
     */
    private handleAgentUnsubscribe;
    /**
     * Handle agent spawning
     */
    private handleAgentSpawn;
    /**
     * Handle task subscription
     */
    private handleTaskSubscribe;
    /**
     * Handle task unsubscription
     */
    private handleTaskUnsubscribe;
    /**
     * Handle task orchestration
     */
    private handleTaskOrchestrate;
    /**
     * Handle workflow execution
     */
    private handleWorkflowExecute;
    /**
     * Handle metrics request
     */
    private handleMetricsRequest;
    /**
     * Handle health request
     */
    private handleHealthRequest;
    /**
     * Handle socket disconnection
     */
    private handleDisconnection;
    /**
     * Send user sessions to socket
     */
    private sendUserSessions;
    /**
     * Setup orchestrator event listeners
     */
    private setupOrchestratorEvents;
    /**
     * Broadcast message to specific room
     */
    private broadcast;
    /**
     * Broadcast message to all connected clients
     */
    private broadcastToAll;
    /**
     * Broadcast message to specific user
     */
    private broadcastToUser;
    /**
     * Get connected clients count
     */
    getConnectedCount(): number;
    /**
     * Shutdown WebSocket manager
     */
    shutdown(): void;
}
export declare const claudeAgentWebSocketManager: ClaudeAgentWebSocketManager;
//# sourceMappingURL=claude-agents.d.ts.map