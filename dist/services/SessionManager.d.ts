/**
 * Session Manager - Handles session persistence and state management
 * for Claude instances with database storage and recovery capabilities
 */
import { EventEmitter } from 'events';
import { ClaudeInstanceStatus, ClaudeMessage } from './ClaudeProcessManager';
export interface SessionData {
    id: string;
    instanceId: string;
    clientId: string;
    startTime: Date;
    lastActivity: Date;
    status: 'active' | 'paused' | 'terminated' | 'archived';
    metadata: Record<string, any>;
    messageHistory: ClaudeMessage[];
    config: {
        maxMessages: number;
        autoArchive: boolean;
        ttl: number;
    };
}
export interface SessionSnapshot {
    sessionId: string;
    instanceId: string;
    timestamp: Date;
    instanceState: ClaudeInstanceStatus;
    messageCount: number;
    lastMessages: ClaudeMessage[];
}
export declare class SessionManager extends EventEmitter {
    private sessions;
    private sessionStorage;
    private logger;
    private persistenceInterval;
    private cleanupInterval;
    private snapshotInterval;
    constructor(storageDirectory?: string, persistenceIntervalMs?: number);
    private setupLogger;
    private ensureStorageDirectory;
    /**
     * Create new session
     */
    createSession(instanceId: string, clientId: string, metadata?: Record<string, any>): Promise<string>;
    /**
     * Get session by ID
     */
    getSession(sessionId: string): SessionData | null;
    /**
     * Get sessions by instance ID
     */
    getSessionsByInstance(instanceId: string): SessionData[];
    /**
     * Get sessions by client ID
     */
    getSessionsByClient(clientId: string): SessionData[];
    /**
     * Update session activity
     */
    updateSessionActivity(sessionId: string): Promise<void>;
    /**
     * Add message to session history
     */
    addMessage(sessionId: string, message: ClaudeMessage): Promise<void>;
    /**
     * Get session message history
     */
    getMessageHistory(sessionId: string, limit?: number): ClaudeMessage[];
    /**
     * Pause session
     */
    pauseSession(sessionId: string): Promise<void>;
    /**
     * Resume session
     */
    resumeSession(sessionId: string): Promise<void>;
    /**
     * Terminate session
     */
    terminateSession(sessionId: string, archive?: boolean): Promise<void>;
    /**
     * Archive session
     */
    private archiveSession;
    /**
     * Archive messages separately
     */
    private archiveMessages;
    /**
     * Persist session to disk
     */
    private persistSession;
    /**
     * Load persisted sessions from disk
     */
    private loadPersistedSessions;
    /**
     * Create session snapshot
     */
    createSnapshot(sessionId: string, instanceState: ClaudeInstanceStatus): Promise<void>;
    /**
     * Start persistence routine
     */
    private startPersistenceRoutine;
    /**
     * Start cleanup routine for expired sessions
     */
    private startCleanupRoutine;
    /**
     * Start snapshot routine
     */
    private startSnapshotRoutine;
    /**
     * Get session statistics
     */
    getStats(): {
        totalSessions: number;
        statusCounts: Record<string, number>;
        totalMessages: number;
        averageMessagesPerSession: number;
        oldestSession: number;
        newestSession: number;
    };
    /**
     * Shutdown session manager
     */
    shutdown(): Promise<void>;
}
export default SessionManager;
//# sourceMappingURL=SessionManager.d.ts.map