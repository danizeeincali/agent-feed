/**
 * Session Manager
 * Advanced session lifecycle and state management for Claude Code SDK
 *
 * Features:
 * - Session creation and termination
 * - State persistence and recovery
 * - Automatic cleanup and timeout handling
 * - Session metrics and monitoring
 * - Cross-session resource management
 */

import { EventEmitter } from 'events';
import Redis from 'redis';
import { Session, SessionConfig, SessionMetrics } from './ClaudeCodeSDKManager';

export interface SessionState {
  sessionId: string;
  userId: string;
  type: 'streaming' | 'headless';
  status: 'active' | 'suspended' | 'terminated';
  context: {
    messages: any[];
    artifacts: any[];
    workingState: Record<string, any>;
  };
  metadata: {
    created: Date;
    lastActivity: Date;
    totalMessages: number;
    totalTokens: number;
    toolCallsCount: number;
  };
}

export interface SessionTimeout {
  sessionId: string;
  userId: string;
  scheduledAt: Date;
  reason: 'inactivity' | 'max_duration' | 'resource_limit';
}

export interface SessionCleanupResult {
  terminatedSessions: string[];
  freedResources: {
    memory: number;
    contexts: number;
    tempFiles: number;
  };
  errors: string[];
}

export class SessionManager extends EventEmitter {
  private sessions: Map<string, Session>;
  private sessionStates: Map<string, SessionState>;
  private sessionTimeouts: Map<string, NodeJS.Timeout>;
  private redis: Redis.RedisClientType;
  private config: SessionConfig;
  private cleanupInterval: NodeJS.Timeout | null = null;

  constructor(config: any) {
    super();
    this.config = config;
    this.sessions = new Map();
    this.sessionStates = new Map();
    this.sessionTimeouts = new Map();

    this.initializeRedis();
  }

  /**
   * Create a new session
   */
  async createSession(userId: string, type: 'streaming' | 'headless'): Promise<Session> {
    const sessionId = this.generateSessionId();

    const session: Session = {
      id: sessionId,
      userId,
      type,
      status: 'active',
      created: new Date(),
      lastActivity: new Date(),
      configuration: {
        workingDirectory: '/workspaces/agent-feed/prod',
        toolPermissions: {
          fileSystem: { read: [], write: [], execute: [] },
          network: { allowHttp: false, allowedDomains: [], allowedPorts: [] },
          system: { allowBash: false, allowedCommands: [], dangerousMode: false },
          tools: { allowed: [], restricted: [], customLimits: {} }
        },
        contextSettings: {
          maxSize: this.config.maxContextSize,
          compactionThreshold: this.config.autoCompactionThreshold,
          compactionStrategy: 'moderate',
          preservePatterns: [],
          snapshotInterval: this.config.snapshotInterval
        },
        resourceLimits: {
          maxMemoryUsage: 1000000000,
          maxCpuUsage: 80,
          maxDiskUsage: 5000000000,
          maxNetworkUsage: 1000000000,
          maxConcurrentOperations: 5
        },
        dangerousMode: {
          enabled: false,
          justification: '',
          approver: '',
          timeLimit: 0,
          auditLevel: 'verbose',
          restrictions: {
            allowedOperations: [],
            forbiddenPaths: [],
            maxConcurrentOperations: 1
          }
        }
      },
      metrics: {
        tokensUsed: 0,
        toolCallsCount: 0,
        averageResponseTime: 0,
        errorCount: 0
      }
    };

    // Store session
    this.sessions.set(sessionId, session);

    // Create initial session state
    const sessionState: SessionState = {
      sessionId,
      userId,
      type,
      status: 'active',
      context: {
        messages: [],
        artifacts: [],
        workingState: {}
      },
      metadata: {
        created: new Date(),
        lastActivity: new Date(),
        totalMessages: 0,
        totalTokens: 0,
        toolCallsCount: 0
      }
    };

    this.sessionStates.set(sessionId, sessionState);

    // Persist to Redis
    await this.persistSessionState(sessionId, sessionState);

    // Set up timeout
    this.scheduleSessionTimeout(sessionId);

    // Emit event
    this.emit('sessionCreated', { sessionId, userId, type });

    console.log(`✅ Session created: ${sessionId} for user ${userId} (${type})`);
    return session;
  }

  /**
   * Get session by ID
   */
  async getSession(sessionId: string): Promise<Session | null> {
    let session = this.sessions.get(sessionId);

    if (!session) {
      // Try to restore from Redis
      session = await this.restoreSessionFromRedis(sessionId);
      if (session) {
        this.sessions.set(sessionId, session);
      }
    }

    return session || null;
  }

  /**
   * Update session
   */
  async updateSession(sessionId: string, updates: Partial<Session>): Promise<void> {
    const session = this.sessions.get(sessionId);
    if (!session) {
      throw new Error(`Session ${sessionId} not found`);
    }

    // Apply updates
    Object.assign(session, updates, { lastActivity: new Date() });

    // Update session state
    const sessionState = this.sessionStates.get(sessionId);
    if (sessionState) {
      sessionState.metadata.lastActivity = new Date();
      await this.persistSessionState(sessionId, sessionState);
    }

    // Reset timeout
    this.resetSessionTimeout(sessionId);

    this.emit('sessionUpdated', { sessionId, updates });
  }

  /**
   * Terminate session
   */
  async terminateSession(sessionId: string, reason?: string): Promise<void> {
    const session = this.sessions.get(sessionId);
    if (!session) {
      console.warn(`Attempt to terminate non-existent session: ${sessionId}`);
      return;
    }

    try {
      // Update session status
      session.status = 'terminated';
      session.lastActivity = new Date();

      // Update session state
      const sessionState = this.sessionStates.get(sessionId);
      if (sessionState) {
        sessionState.status = 'terminated';
        sessionState.metadata.lastActivity = new Date();
        await this.persistSessionState(sessionId, sessionState);
      }

      // Clear timeout
      this.clearSessionTimeout(sessionId);

      // Cleanup resources
      await this.cleanupSessionResources(sessionId);

      // Remove from active sessions
      this.sessions.delete(sessionId);
      this.sessionStates.delete(sessionId);

      // Emit event
      this.emit('sessionTerminated', { sessionId, reason: reason || 'manual' });

      console.log(`✅ Session terminated: ${sessionId} (${reason || 'manual'})`);

    } catch (error) {
      console.error(`❌ Error terminating session ${sessionId}:`, error);
      throw error;
    }
  }

  /**
   * Suspend session temporarily
   */
  async suspendSession(sessionId: string, reason?: string): Promise<void> {
    const session = this.sessions.get(sessionId);
    if (!session) {
      throw new Error(`Session ${sessionId} not found`);
    }

    session.status = 'suspended';
    session.lastActivity = new Date();

    // Update session state
    const sessionState = this.sessionStates.get(sessionId);
    if (sessionState) {
      sessionState.status = 'suspended';
      await this.persistSessionState(sessionId, sessionState);
    }

    this.emit('sessionSuspended', { sessionId, reason: reason || 'manual' });
  }

  /**
   * Resume suspended session
   */
  async resumeSession(sessionId: string): Promise<void> {
    const session = this.sessions.get(sessionId);
    if (!session) {
      throw new Error(`Session ${sessionId} not found`);
    }

    if (session.status !== 'suspended') {
      throw new Error(`Session ${sessionId} is not suspended`);
    }

    session.status = 'active';
    session.lastActivity = new Date();

    // Update session state
    const sessionState = this.sessionStates.get(sessionId);
    if (sessionState) {
      sessionState.status = 'active';
      await this.persistSessionState(sessionId, sessionState);
    }

    // Reset timeout
    this.scheduleSessionTimeout(sessionId);

    this.emit('sessionResumed', { sessionId });
  }

  /**
   * Save session state snapshot
   */
  async saveSessionState(sessionId: string, state: Partial<SessionState>): Promise<void> {
    const existingState = this.sessionStates.get(sessionId);
    if (!existingState) {
      throw new Error(`Session state ${sessionId} not found`);
    }

    // Merge state updates
    Object.assign(existingState, state);
    existingState.metadata.lastActivity = new Date();

    // Persist to Redis
    await this.persistSessionState(sessionId, existingState);

    this.emit('sessionStateSaved', { sessionId });
  }

  /**
   * Restore session state from storage
   */
  async restoreSessionState(sessionId: string): Promise<SessionState | null> {
    let sessionState = this.sessionStates.get(sessionId);

    if (!sessionState) {
      // Try to restore from Redis
      try {
        const redisData = await this.redis.get(`session:state:${sessionId}`);
        if (redisData) {
          sessionState = JSON.parse(redisData);
          this.sessionStates.set(sessionId, sessionState!);
        }
      } catch (error) {
        console.error(`Error restoring session state ${sessionId}:`, error);
      }
    }

    return sessionState || null;
  }

  /**
   * Get active sessions for a user
   */
  async getActiveSessions(userId?: string): Promise<Session[]> {
    const sessions = Array.from(this.sessions.values());

    if (userId) {
      return sessions.filter(session =>
        session.userId === userId && session.status === 'active'
      );
    }

    return sessions.filter(session => session.status === 'active');
  }

  /**
   * Get session metrics
   */
  async getSessionMetrics(sessionId: string): Promise<SessionMetrics | null> {
    const session = this.sessions.get(sessionId);
    return session ? session.metrics : null;
  }

  /**
   * Get aggregated session statistics
   */
  async getSessionStatistics(): Promise<{
    total: number;
    active: number;
    suspended: number;
    terminated: number;
    byType: { streaming: number; headless: number };
    averageDuration: number;
  }> {
    const allSessions = Array.from(this.sessions.values());

    const stats = {
      total: allSessions.length,
      active: allSessions.filter(s => s.status === 'active').length,
      suspended: allSessions.filter(s => s.status === 'suspended').length,
      terminated: allSessions.filter(s => s.status === 'terminated').length,
      byType: {
        streaming: allSessions.filter(s => s.type === 'streaming').length,
        headless: allSessions.filter(s => s.type === 'headless').length
      },
      averageDuration: this.calculateAverageDuration(allSessions)
    };

    return stats;
  }

  /**
   * Cleanup expired and inactive sessions
   */
  async cleanupSessions(): Promise<SessionCleanupResult> {
    const result: SessionCleanupResult = {
      terminatedSessions: [],
      freedResources: {
        memory: 0,
        contexts: 0,
        tempFiles: 0
      },
      errors: []
    };

    const now = new Date();
    const timeoutThreshold = this.config.defaultTimeout;

    for (const [sessionId, session] of this.sessions.entries()) {
      try {
        const inactiveTime = now.getTime() - session.lastActivity.getTime();

        // Check for timeout
        if (inactiveTime > timeoutThreshold && session.status === 'active') {
          await this.terminateSession(sessionId, 'inactivity_timeout');
          result.terminatedSessions.push(sessionId);
          result.freedResources.contexts++;
        }

        // Check for zombie sessions (terminated but still in memory)
        if (session.status === 'terminated') {
          this.sessions.delete(sessionId);
          this.sessionStates.delete(sessionId);
          result.freedResources.memory++;
        }

      } catch (error) {
        console.error(`Error cleaning up session ${sessionId}:`, error);
        result.errors.push(`${sessionId}: ${error.message}`);
      }
    }

    // Cleanup Redis entries
    await this.cleanupRedisEntries();

    console.log(`🧹 Session cleanup completed: ${result.terminatedSessions.length} sessions terminated`);
    return result;
  }

  /**
   * Start session manager background tasks
   */
  async start(): Promise<void> {
    // Start cleanup interval
    this.cleanupInterval = setInterval(async () => {
      try {
        await this.cleanupSessions();
      } catch (error) {
        console.error('Session cleanup error:', error);
      }
    }, 60000); // Every minute

    console.log('✅ Session Manager started');
  }

  /**
   * Stop session manager
   */
  async stop(): Promise<void> {
    if (this.cleanupInterval) {
      clearInterval(this.cleanupInterval);
      this.cleanupInterval = null;
    }

    // Terminate all active sessions
    const activeSessions = Array.from(this.sessions.keys());
    await Promise.all(
      activeSessions.map(sessionId =>
        this.terminateSession(sessionId, 'shutdown')
      )
    );

    // Close Redis connection
    await this.redis.quit();

    console.log('✅ Session Manager stopped');
  }

  // Private helper methods

  private async initializeRedis(): Promise<void> {
    try {
      this.redis = Redis.createClient({
        url: process.env.REDIS_URL || 'redis://localhost:6379'
      });

      await this.redis.connect();
      console.log('✅ Redis connected for session management');

    } catch (error) {
      console.error('❌ Redis connection failed:', error);
      // Fallback to in-memory storage
    }
  }

  private generateSessionId(): string {
    return `session_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  }

  private async persistSessionState(sessionId: string, state: SessionState): Promise<void> {
    if (!this.redis) return;

    try {
      await this.redis.setEx(
        `session:state:${sessionId}`,
        3600, // 1 hour TTL
        JSON.stringify(state)
      );
    } catch (error) {
      console.error(`Error persisting session state ${sessionId}:`, error);
    }
  }

  private async restoreSessionFromRedis(sessionId: string): Promise<Session | null> {
    if (!this.redis) return null;

    try {
      const sessionData = await this.redis.get(`session:${sessionId}`);
      if (sessionData) {
        return JSON.parse(sessionData);
      }
    } catch (error) {
      console.error(`Error restoring session ${sessionId}:`, error);
    }

    return null;
  }

  private scheduleSessionTimeout(sessionId: string): void {
    // Clear existing timeout
    this.clearSessionTimeout(sessionId);

    // Set new timeout
    const timeout = setTimeout(async () => {
      try {
        await this.terminateSession(sessionId, 'timeout');
        this.emit('sessionTimeout', sessionId);
      } catch (error) {
        console.error(`Error handling session timeout ${sessionId}:`, error);
      }
    }, this.config.defaultTimeout);

    this.sessionTimeouts.set(sessionId, timeout);
  }

  private clearSessionTimeout(sessionId: string): void {
    const timeout = this.sessionTimeouts.get(sessionId);
    if (timeout) {
      clearTimeout(timeout);
      this.sessionTimeouts.delete(sessionId);
    }
  }

  private resetSessionTimeout(sessionId: string): void {
    this.scheduleSessionTimeout(sessionId);
  }

  private async cleanupSessionResources(sessionId: string): Promise<void> {
    try {
      // Remove Redis entries
      if (this.redis) {
        await this.redis.del(`session:${sessionId}`);
        await this.redis.del(`session:state:${sessionId}`);
      }

      // Cleanup temporary files
      // Implementation would depend on file system integration

      // Free memory references
      this.clearSessionTimeout(sessionId);

    } catch (error) {
      console.error(`Error cleaning up resources for session ${sessionId}:`, error);
    }
  }

  private async cleanupRedisEntries(): Promise<void> {
    if (!this.redis) return;

    try {
      // Get all session keys
      const keys = await this.redis.keys('session:*');

      // Check which sessions are still active
      const activeSessionIds = Array.from(this.sessions.keys());

      // Remove keys for inactive sessions
      for (const key of keys) {
        const sessionId = key.split(':').pop();
        if (sessionId && !activeSessionIds.includes(sessionId)) {
          await this.redis.del(key);
        }
      }

    } catch (error) {
      console.error('Error cleaning up Redis entries:', error);
    }
  }

  private calculateAverageDuration(sessions: Session[]): number {
    if (sessions.length === 0) return 0;

    const totalDuration = sessions.reduce((sum, session) => {
      const duration = session.lastActivity.getTime() - session.created.getTime();
      return sum + duration;
    }, 0);

    return totalDuration / sessions.length;
  }

  // Getter methods

  async getTotalSessions(): Promise<number> {
    return this.sessions.size;
  }

  async getAverageSessionDuration(): Promise<number> {
    const sessions = Array.from(this.sessions.values());
    return this.calculateAverageDuration(sessions);
  }
}