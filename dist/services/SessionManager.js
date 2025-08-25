"use strict";
/**
 * Session Manager - Handles session persistence and state management
 * for Claude instances with database storage and recovery capabilities
 */
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.SessionManager = void 0;
const fs_1 = require("fs");
const path_1 = __importDefault(require("path"));
const events_1 = require("events");
const uuid_1 = require("uuid");
const winston_1 = __importDefault(require("winston"));
class SessionManager extends events_1.EventEmitter {
    sessions = new Map();
    sessionStorage;
    logger;
    persistenceInterval;
    cleanupInterval;
    snapshotInterval;
    constructor(storageDirectory = './sessions', persistenceIntervalMs = 30000) {
        super();
        this.sessionStorage = storageDirectory;
        this.setupLogger();
        this.ensureStorageDirectory();
        this.startPersistenceRoutine(persistenceIntervalMs);
        this.startCleanupRoutine();
        this.startSnapshotRoutine();
        this.loadPersistedSessions();
    }
    setupLogger() {
        this.logger = winston_1.default.createLogger({
            level: 'info',
            format: winston_1.default.format.combine(winston_1.default.format.timestamp(), winston_1.default.format.errors({ stack: true }), winston_1.default.format.json()),
            transports: [
                new winston_1.default.transports.File({
                    filename: 'logs/session-manager.log',
                    level: 'info'
                }),
                new winston_1.default.transports.File({
                    filename: 'logs/session-manager-error.log',
                    level: 'error'
                }),
                new winston_1.default.transports.Console({
                    format: winston_1.default.format.simple(),
                    level: 'debug'
                })
            ]
        });
    }
    async ensureStorageDirectory() {
        try {
            await fs_1.promises.mkdir(this.sessionStorage, { recursive: true });
            await fs_1.promises.mkdir(path_1.default.join(this.sessionStorage, 'active'), { recursive: true });
            await fs_1.promises.mkdir(path_1.default.join(this.sessionStorage, 'archived'), { recursive: true });
            await fs_1.promises.mkdir(path_1.default.join(this.sessionStorage, 'snapshots'), { recursive: true });
        }
        catch (error) {
            this.logger.error('Failed to create session storage directories:', error);
            throw error;
        }
    }
    /**
     * Create new session
     */
    async createSession(instanceId, clientId, metadata = {}) {
        const sessionId = (0, uuid_1.v4)();
        const session = {
            id: sessionId,
            instanceId,
            clientId,
            startTime: new Date(),
            lastActivity: new Date(),
            status: 'active',
            metadata,
            messageHistory: [],
            config: {
                maxMessages: 1000,
                autoArchive: true,
                ttl: 24 * 60 * 60 * 1000 // 24 hours
            }
        };
        this.sessions.set(sessionId, session);
        await this.persistSession(session);
        this.logger.info(`Created session ${sessionId} for instance ${instanceId}`);
        this.emit('sessionCreated', session);
        return sessionId;
    }
    /**
     * Get session by ID
     */
    getSession(sessionId) {
        return this.sessions.get(sessionId) || null;
    }
    /**
     * Get sessions by instance ID
     */
    getSessionsByInstance(instanceId) {
        return Array.from(this.sessions.values()).filter(session => session.instanceId === instanceId);
    }
    /**
     * Get sessions by client ID
     */
    getSessionsByClient(clientId) {
        return Array.from(this.sessions.values()).filter(session => session.clientId === clientId);
    }
    /**
     * Update session activity
     */
    async updateSessionActivity(sessionId) {
        const session = this.sessions.get(sessionId);
        if (!session) {
            throw new Error(`Session ${sessionId} not found`);
        }
        session.lastActivity = new Date();
        await this.persistSession(session);
        this.emit('sessionUpdated', session);
    }
    /**
     * Add message to session history
     */
    async addMessage(sessionId, message) {
        const session = this.sessions.get(sessionId);
        if (!session) {
            this.logger.warn(`Attempted to add message to non-existent session ${sessionId}`);
            return;
        }
        session.messageHistory.push(message);
        session.lastActivity = new Date();
        // Trim message history if it exceeds max
        if (session.messageHistory.length > session.config.maxMessages) {
            const excess = session.messageHistory.length - session.config.maxMessages;
            const removedMessages = session.messageHistory.splice(0, excess);
            // Archive removed messages
            await this.archiveMessages(sessionId, removedMessages);
        }
        await this.persistSession(session);
        this.emit('messageAdded', { sessionId, message });
    }
    /**
     * Get session message history
     */
    getMessageHistory(sessionId, limit = 100) {
        const session = this.sessions.get(sessionId);
        if (!session) {
            return [];
        }
        return session.messageHistory.slice(-limit);
    }
    /**
     * Pause session
     */
    async pauseSession(sessionId) {
        const session = this.sessions.get(sessionId);
        if (!session) {
            throw new Error(`Session ${sessionId} not found`);
        }
        session.status = 'paused';
        session.lastActivity = new Date();
        await this.persistSession(session);
        this.logger.info(`Paused session ${sessionId}`);
        this.emit('sessionPaused', session);
    }
    /**
     * Resume session
     */
    async resumeSession(sessionId) {
        const session = this.sessions.get(sessionId);
        if (!session) {
            throw new Error(`Session ${sessionId} not found`);
        }
        session.status = 'active';
        session.lastActivity = new Date();
        await this.persistSession(session);
        this.logger.info(`Resumed session ${sessionId}`);
        this.emit('sessionResumed', session);
    }
    /**
     * Terminate session
     */
    async terminateSession(sessionId, archive = true) {
        const session = this.sessions.get(sessionId);
        if (!session) {
            throw new Error(`Session ${sessionId} not found`);
        }
        session.status = 'terminated';
        session.lastActivity = new Date();
        if (archive && session.config.autoArchive) {
            await this.archiveSession(session);
        }
        else {
            await this.persistSession(session);
        }
        this.sessions.delete(sessionId);
        this.logger.info(`Terminated session ${sessionId}`);
        this.emit('sessionTerminated', session);
    }
    /**
     * Archive session
     */
    async archiveSession(session) {
        try {
            session.status = 'archived';
            const archivePath = path_1.default.join(this.sessionStorage, 'archived', `${session.id}.json`);
            await fs_1.promises.writeFile(archivePath, JSON.stringify(session, null, 2));
            // Remove from active storage
            const activePath = path_1.default.join(this.sessionStorage, 'active', `${session.id}.json`);
            try {
                await fs_1.promises.unlink(activePath);
            }
            catch (error) {
                // File might not exist, that's okay
            }
            this.logger.info(`Archived session ${session.id}`);
            this.emit('sessionArchived', session);
        }
        catch (error) {
            this.logger.error(`Failed to archive session ${session.id}:`, error);
            throw error;
        }
    }
    /**
     * Archive messages separately
     */
    async archiveMessages(sessionId, messages) {
        try {
            const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
            const archivePath = path_1.default.join(this.sessionStorage, 'archived', `${sessionId}-messages-${timestamp}.json`);
            await fs_1.promises.writeFile(archivePath, JSON.stringify(messages, null, 2));
            this.logger.debug(`Archived ${messages.length} messages for session ${sessionId}`);
        }
        catch (error) {
            this.logger.error(`Failed to archive messages for session ${sessionId}:`, error);
        }
    }
    /**
     * Persist session to disk
     */
    async persistSession(session) {
        try {
            const sessionPath = path_1.default.join(this.sessionStorage, 'active', `${session.id}.json`);
            await fs_1.promises.writeFile(sessionPath, JSON.stringify(session, null, 2));
        }
        catch (error) {
            this.logger.error(`Failed to persist session ${session.id}:`, error);
            throw error;
        }
    }
    /**
     * Load persisted sessions from disk
     */
    async loadPersistedSessions() {
        try {
            const activePath = path_1.default.join(this.sessionStorage, 'active');
            const files = await fs_1.promises.readdir(activePath);
            let loadedCount = 0;
            for (const file of files) {
                if (file.endsWith('.json')) {
                    try {
                        const filePath = path_1.default.join(activePath, file);
                        const data = await fs_1.promises.readFile(filePath, 'utf-8');
                        const session = JSON.parse(data);
                        // Convert date strings back to Date objects
                        session.startTime = new Date(session.startTime);
                        session.lastActivity = new Date(session.lastActivity);
                        session.messageHistory = session.messageHistory.map(msg => ({
                            ...msg,
                            timestamp: new Date(msg.timestamp)
                        }));
                        this.sessions.set(session.id, session);
                        loadedCount++;
                    }
                    catch (error) {
                        this.logger.error(`Failed to load session from file ${file}:`, error);
                    }
                }
            }
            this.logger.info(`Loaded ${loadedCount} persisted sessions`);
        }
        catch (error) {
            this.logger.error('Failed to load persisted sessions:', error);
        }
    }
    /**
     * Create session snapshot
     */
    async createSnapshot(sessionId, instanceState) {
        const session = this.sessions.get(sessionId);
        if (!session) {
            return;
        }
        const snapshot = {
            sessionId,
            instanceId: session.instanceId,
            timestamp: new Date(),
            instanceState,
            messageCount: session.messageHistory.length,
            lastMessages: session.messageHistory.slice(-10) // Last 10 messages
        };
        try {
            const snapshotPath = path_1.default.join(this.sessionStorage, 'snapshots', `${sessionId}-${Date.now()}.json`);
            await fs_1.promises.writeFile(snapshotPath, JSON.stringify(snapshot, null, 2));
            this.logger.debug(`Created snapshot for session ${sessionId}`);
        }
        catch (error) {
            this.logger.error(`Failed to create snapshot for session ${sessionId}:`, error);
        }
    }
    /**
     * Start persistence routine
     */
    startPersistenceRoutine(intervalMs) {
        this.persistenceInterval = setInterval(async () => {
            try {
                const activeSessions = Array.from(this.sessions.values()).filter(session => session.status === 'active');
                for (const session of activeSessions) {
                    await this.persistSession(session);
                }
                if (activeSessions.length > 0) {
                    this.logger.debug(`Persisted ${activeSessions.length} active sessions`);
                }
            }
            catch (error) {
                this.logger.error('Error in persistence routine:', error);
            }
        }, intervalMs);
    }
    /**
     * Start cleanup routine for expired sessions
     */
    startCleanupRoutine() {
        this.cleanupInterval = setInterval(async () => {
            try {
                const now = new Date().getTime();
                const expiredSessions = [];
                for (const [sessionId, session] of this.sessions) {
                    const age = now - session.lastActivity.getTime();
                    if (age > session.config.ttl) {
                        expiredSessions.push(sessionId);
                    }
                }
                for (const sessionId of expiredSessions) {
                    await this.terminateSession(sessionId, true);
                }
                if (expiredSessions.length > 0) {
                    this.logger.info(`Cleaned up ${expiredSessions.length} expired sessions`);
                }
            }
            catch (error) {
                this.logger.error('Error in cleanup routine:', error);
            }
        }, 5 * 60 * 1000); // Run every 5 minutes
    }
    /**
     * Start snapshot routine
     */
    startSnapshotRoutine() {
        this.snapshotInterval = setInterval(() => {
            // This would be called with instance state from the process manager
            // For now, it's just a placeholder
            this.emit('snapshotRequested');
        }, 10 * 60 * 1000); // Every 10 minutes
    }
    /**
     * Get session statistics
     */
    getStats() {
        const sessions = Array.from(this.sessions.values());
        const statusCounts = sessions.reduce((acc, session) => {
            acc[session.status] = (acc[session.status] || 0) + 1;
            return acc;
        }, {});
        return {
            totalSessions: sessions.length,
            statusCounts,
            totalMessages: sessions.reduce((sum, session) => sum + session.messageHistory.length, 0),
            averageMessagesPerSession: sessions.length > 0
                ? sessions.reduce((sum, session) => sum + session.messageHistory.length, 0) / sessions.length
                : 0,
            oldestSession: sessions.length > 0
                ? Math.min(...sessions.map(s => s.startTime.getTime()))
                : null,
            newestSession: sessions.length > 0
                ? Math.max(...sessions.map(s => s.startTime.getTime()))
                : null
        };
    }
    /**
     * Shutdown session manager
     */
    async shutdown() {
        this.logger.info('Shutting down Session Manager...');
        // Clear intervals
        if (this.persistenceInterval) {
            clearInterval(this.persistenceInterval);
        }
        if (this.cleanupInterval) {
            clearInterval(this.cleanupInterval);
        }
        if (this.snapshotInterval) {
            clearInterval(this.snapshotInterval);
        }
        // Persist all active sessions
        const persistPromises = Array.from(this.sessions.values()).map(session => this.persistSession(session));
        try {
            await Promise.all(persistPromises);
            this.logger.info(`Persisted ${persistPromises.length} sessions during shutdown`);
        }
        catch (error) {
            this.logger.error('Error persisting sessions during shutdown:', error);
        }
        this.sessions.clear();
        this.logger.info('Session Manager shutdown complete');
    }
}
exports.SessionManager = SessionManager;
exports.default = SessionManager;
//# sourceMappingURL=SessionManager.js.map