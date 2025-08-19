/**
 * Claude Sessions Database Management
 * Handles persistence of Claude Code sessions, agents, and tasks
 */
import { ClaudeSession, ClaudeAgent, ClaudeTask } from '@/services/claude-integration';
export interface ClaudeSessionRecord {
    id: string;
    user_id: string;
    swarm_id: string;
    status: 'initializing' | 'active' | 'paused' | 'completed' | 'failed';
    configuration: any;
    metrics: any;
    created_at: Date;
    updated_at: Date;
    ended_at?: Date;
}
export interface ClaudeAgentRecord {
    id: string;
    session_id: string;
    name: string;
    type: string;
    status: 'spawning' | 'active' | 'idle' | 'error' | 'terminated';
    capabilities: string[];
    performance: any;
    health: any;
    created_at: Date;
    last_used?: Date;
}
export interface ClaudeTaskRecord {
    id: string;
    session_id: string;
    agent_id?: string;
    type: string;
    description: string;
    status: 'pending' | 'assigned' | 'running' | 'completed' | 'failed' | 'cancelled';
    priority: 'low' | 'medium' | 'high' | 'critical';
    input: any;
    output?: any;
    error?: string;
    created_at: Date;
    started_at?: Date;
    completed_at?: Date;
}
/**
 * Claude Sessions Database Manager
 */
export declare class ClaudeSessionsDB {
    /**
     * Create a new Claude session record
     */
    static createSession(session: ClaudeSession): Promise<ClaudeSessionRecord>;
    /**
     * Update Claude session record
     */
    static updateSession(sessionId: string, updates: Partial<ClaudeSession>): Promise<ClaudeSessionRecord | null>;
    /**
     * Get Claude session by ID
     */
    static getSession(sessionId: string): Promise<ClaudeSessionRecord | null>;
    /**
     * Get all sessions for a user
     */
    static getUserSessions(userId: string, limit?: number, offset?: number): Promise<ClaudeSessionRecord[]>;
    /**
     * Delete Claude session record
     */
    static deleteSession(sessionId: string): Promise<boolean>;
    /**
     * Save agent information to database
     */
    static saveAgent(agent: ClaudeAgent, sessionId: string): Promise<void>;
    /**
     * Update agent status and metrics
     */
    static updateAgent(agentId: string, updates: Partial<ClaudeAgent>): Promise<void>;
    /**
     * Save task information
     */
    static saveTask(task: ClaudeTask): Promise<void>;
    /**
     * Update task status
     */
    static updateTask(taskId: string, updates: Partial<ClaudeTask>): Promise<void>;
    /**
     * Get task data from database
     */
    private static getTaskData;
    /**
     * Get session statistics
     */
    static getSessionStats(userId?: string): Promise<any>;
    /**
     * Cleanup old sessions
     */
    static cleanupOldSessions(olderThanDays?: number): Promise<number>;
}
export declare const claudeSessionsPersistence: {
    syncSession(session: ClaudeSession): Promise<void>;
    syncAgent(agent: ClaudeAgent, sessionId: string): Promise<void>;
    syncTask(task: ClaudeTask): Promise<void>;
    loadUserSessions(userId: string): Promise<ClaudeSessionRecord[]>;
};
//# sourceMappingURL=claude-sessions.d.ts.map