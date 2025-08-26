"use strict";
/**
 * Advanced Terminal Streaming Service
 *
 * Enhanced terminal streaming service that integrates with Claude Instance Manager
 * to provide robust WebSocket terminal connections with session management,
 * authentication, and multi-client support.
 */
Object.defineProperty(exports, "__esModule", { value: true });
exports.AdvancedTerminalStreamingService = void 0;
const events_1 = require("events");
const logger_1 = require("@/utils/logger");
const claude_instance_manager_1 = require("@/services/claude-instance-manager");
const DEFAULT_CONFIG = {
    shell: '/bin/bash',
    maxSessions: 100,
    sessionTimeout: 30 * 60 * 1000, // 30 minutes
    authentication: true,
    enableMetrics: true,
    rateLimitWindow: 60000, // 1 minute
    rateLimitMax: 1000 // 1000 requests per minute
};
class AdvancedTerminalStreamingService extends events_1.EventEmitter {
    sessions = new Map();
    io;
    config;
    rateLimits = new Map();
    cleanupInterval;
    metricsInterval;
    namespace;
    constructor(io, config = {}) {
        super();
        this.io = io;
        this.config = { ...DEFAULT_CONFIG, ...config };
        this.initialize();
    }
    /**
     * Initialize the terminal streaming service
     */
    initialize() {
        console.log('🔧 Initializing AdvancedTerminalStreamingService...');
        // Set up WebSocket namespace
        this.setupNamespace();
        // Start cleanup process
        this.startCleanupProcess();
        // Start metrics collection if enabled
        if (this.config.enableMetrics) {
            this.startMetricsCollection();
        }
        // Connect to Claude Instance Manager
        this.connectToInstanceManager();
        console.log('✅ AdvancedTerminalStreamingService initialization complete');
    }
    setupNamespace() {
        // CONSOLIDATION FIX: Use unified /terminal namespace as primary terminal interface
        this.namespace = this.io.of('/terminal');
        console.log('✅ Created /terminal namespace (unified terminal interface)');
        // Authentication middleware
        if (this.config.authentication) {
            this.namespace.use(async (socket, next) => {
                try {
                    const auth = socket.handshake.auth;
                    const userId = auth.userId || auth.user_id || 'anonymous';
                    const username = auth.username || `User-${userId.slice(0, 8)}`;
                    socket.user = { id: userId, username };
                    console.log('🔍 Terminal streaming auth:', { socketId: socket.id, userId, username });
                    next();
                }
                catch (error) {
                    console.error('❌ Terminal streaming auth failed:', error);
                    next(new Error('Authentication required'));
                }
            });
        }
        // Connection handler
        this.namespace.on('connection', (socket) => {
            this.handleConnection(socket);
        });
    }
    handleConnection(socket) {
        const user = socket.user;
        logger_1.logger.info('Terminal streaming client connected', {
            socketId: socket.id,
            userId: user?.id,
            username: user?.username
        });
        this.setupSocketEvents(socket);
        // Send connection confirmation
        socket.emit('terminal:connected', {
            message: 'Connected to Advanced Terminal Streaming Service',
            supportedFeatures: [
                'instance_streaming',
                'multi_session',
                'metrics',
                'rate_limiting',
                'auto_reconnect',
                'unified_namespace'
            ],
            timestamp: new Date().toISOString()
        });
    }
    setupSocketEvents(socket) {
        const user = socket.user;
        // Start streaming from an instance
        socket.on('streaming:start', async (data) => {
            try {
                if (!this.checkRateLimit(socket.id)) {
                    socket.emit('streaming:error', { message: 'Rate limit exceeded' });
                    return;
                }
                await this.startStreaming(socket, data.instanceId);
            }
            catch (error) {
                logger_1.logger.error('Failed to start streaming', { error: error.message, socketId: socket.id });
                socket.emit('streaming:error', { message: error.message });
            }
        });
        // Stop streaming
        socket.on('streaming:stop', (data) => {
            try {
                this.stopStreaming(socket, data.sessionId);
            }
            catch (error) {
                logger_1.logger.error('Failed to stop streaming', { error: error.message, socketId: socket.id });
                socket.emit('streaming:error', { message: 'Failed to stop streaming' });
            }
        });
        // Get streaming status
        socket.on('streaming:status', () => {
            try {
                if (!this.checkRateLimit(socket.id)) {
                    socket.emit('streaming:error', { message: 'Rate limit exceeded' });
                    return;
                }
                this.sendStreamingStatus(socket);
            }
            catch (error) {
                logger_1.logger.error('Failed to get streaming status', { error: error.message, socketId: socket.id });
                socket.emit('streaming:error', { message: 'Failed to get status' });
            }
        });
        // Get available instances
        socket.on('streaming:instances', () => {
            try {
                if (!this.checkRateLimit(socket.id)) {
                    socket.emit('streaming:error', { message: 'Rate limit exceeded' });
                    return;
                }
                this.sendAvailableInstances(socket);
            }
            catch (error) {
                logger_1.logger.error('Failed to get instances', { error: error.message, socketId: socket.id });
                socket.emit('streaming:error', { message: 'Failed to get instances' });
            }
        });
        // Get metrics (if enabled)
        if (this.config.enableMetrics) {
            socket.on('streaming:metrics', () => {
                try {
                    if (!this.checkRateLimit(socket.id)) {
                        socket.emit('streaming:error', { message: 'Rate limit exceeded' });
                        return;
                    }
                    this.sendMetrics(socket);
                }
                catch (error) {
                    logger_1.logger.error('Failed to get metrics', { error: error.message, socketId: socket.id });
                    socket.emit('streaming:error', { message: 'Failed to get metrics' });
                }
            });
        }
        // Handle ping for connection health
        socket.on('ping', () => {
            const sessions = this.getSocketSessions(socket.id);
            sessions.forEach(session => {
                session.lastActivity = new Date();
            });
            socket.emit('pong', { timestamp: new Date().toISOString() });
        });
        // Handle disconnect
        socket.on('disconnect', (reason) => {
            this.handleDisconnect(socket, reason);
        });
        // Handle errors
        socket.on('error', (error) => {
            logger_1.logger.error('Terminal streaming socket error', {
                socketId: socket.id,
                error: error.message,
                userId: user?.id
            });
        });
    }
    async startStreaming(socket, instanceId) {
        const user = socket.user;
        // Check session limits
        const existingSessions = this.getSocketSessions(socket.id);
        if (existingSessions.length >= 5) { // Max 5 sessions per client
            throw new Error('Maximum streaming sessions limit reached');
        }
        if (this.sessions.size >= this.config.maxSessions) {
            throw new Error('Server streaming session limit reached');
        }
        // Verify instance exists and is running
        const instance = claude_instance_manager_1.claudeInstanceManager.getInstanceStatus(instanceId);
        if (!instance) {
            throw new Error(`Instance ${instanceId} not found`);
        }
        if (instance.status !== 'running') {
            throw new Error(`Instance ${instanceId} is not running`);
        }
        // Check if instance has terminal session
        const terminalSession = claude_instance_manager_1.claudeInstanceManager.getTerminalSession(instanceId);
        if (!terminalSession) {
            throw new Error(`No terminal session found for instance ${instanceId}`);
        }
        // Create streaming session
        const sessionId = this.generateSessionId();
        const streamingSession = {
            sessionId,
            instanceId,
            socket,
            userId: user?.id,
            username: user?.username,
            startTime: new Date(),
            lastActivity: new Date(),
            isActive: true,
            metrics: {
                messagesReceived: 0,
                messagesTransmitted: 0,
                bytesTransferred: 0,
                errors: 0
            }
        };
        this.sessions.set(sessionId, streamingSession);
        // Join instance room for broadcasts
        socket.join(`streaming:${instanceId}`);
        // Add client to Claude instance terminal
        claude_instance_manager_1.claudeInstanceManager.addTerminalClient(instanceId, socket.id);
        // Send streaming started confirmation
        socket.emit('streaming:started', {
            sessionId,
            instanceId,
            instanceName: instance.name,
            terminalSize: terminalSession.size,
            timestamp: new Date().toISOString()
        });
        // Send initial terminal history
        const history = claude_instance_manager_1.claudeInstanceManager.getTerminalHistory(instanceId, 50);
        if (history.length > 0) {
            const historyData = history.join('');
            socket.emit('streaming:data', {
                sessionId,
                instanceId,
                data: historyData,
                isHistory: true,
                timestamp: new Date().toISOString()
            });
            // Update metrics
            streamingSession.metrics.messagesTransmitted++;
            streamingSession.metrics.bytesTransferred += historyData.length;
        }
        logger_1.logger.info('Terminal streaming started', {
            sessionId,
            instanceId,
            socketId: socket.id,
            userId: user?.id
        });
        this.emit('streaming:started', { sessionId, instanceId, socket });
    }
    stopStreaming(socket, sessionId) {
        const sessions = sessionId
            ? [this.sessions.get(sessionId)].filter(Boolean)
            : this.getSocketSessions(socket.id);
        for (const session of sessions) {
            if (session && session.socket.id === socket.id) {
                // Remove from Claude instance terminal
                claude_instance_manager_1.claudeInstanceManager.removeTerminalClient(session.instanceId, socket.id);
                // Leave streaming room
                socket.leave(`streaming:${session.instanceId}`);
                // Mark as inactive
                session.isActive = false;
                // Send stop confirmation
                socket.emit('streaming:stopped', {
                    sessionId: session.sessionId,
                    instanceId: session.instanceId,
                    metrics: session.metrics,
                    timestamp: new Date().toISOString()
                });
                // Remove session
                this.sessions.delete(session.sessionId);
                logger_1.logger.info('Terminal streaming stopped', {
                    sessionId: session.sessionId,
                    instanceId: session.instanceId,
                    socketId: socket.id
                });
                this.emit('streaming:stopped', { session });
            }
        }
    }
    sendStreamingStatus(socket) {
        const sessions = this.getSocketSessions(socket.id);
        const status = sessions.map(session => ({
            sessionId: session.sessionId,
            instanceId: session.instanceId,
            startTime: session.startTime,
            lastActivity: session.lastActivity,
            isActive: session.isActive,
            metrics: session.metrics
        }));
        socket.emit('streaming:status_response', {
            sessions: status,
            totalSessions: status.length,
            timestamp: new Date().toISOString()
        });
    }
    sendAvailableInstances(socket) {
        const instances = claude_instance_manager_1.claudeInstanceManager.listInstances()
            .filter(instance => instance.status === 'running')
            .map(instance => ({
            id: instance.id,
            name: instance.name,
            type: instance.type,
            status: instance.status,
            pid: instance.pid,
            createdAt: instance.createdAt,
            hasTerminalSession: !!instance.terminalSessionId,
            connectedClients: claude_instance_manager_1.claudeInstanceManager.getTerminalSession(instance.id)?.clients.size || 0
        }));
        socket.emit('streaming:instances_response', {
            instances,
            total: instances.length,
            timestamp: new Date().toISOString()
        });
    }
    sendMetrics(socket) {
        const sessionMetrics = Array.from(this.sessions.values()).map(session => ({
            sessionId: session.sessionId,
            instanceId: session.instanceId,
            userId: session.userId,
            metrics: session.metrics,
            duration: Date.now() - session.startTime.getTime()
        }));
        const globalMetrics = {
            totalSessions: this.sessions.size,
            activeSessions: Array.from(this.sessions.values()).filter(s => s.isActive).length,
            totalMessages: sessionMetrics.reduce((sum, s) => sum + s.metrics.messagesTransmitted, 0),
            totalBytes: sessionMetrics.reduce((sum, s) => sum + s.metrics.bytesTransferred, 0),
            totalErrors: sessionMetrics.reduce((sum, s) => sum + s.metrics.errors, 0)
        };
        socket.emit('streaming:metrics_response', {
            global: globalMetrics,
            sessions: sessionMetrics,
            timestamp: new Date().toISOString()
        });
    }
    handleDisconnect(socket, reason) {
        const user = socket.user;
        logger_1.logger.info('Terminal streaming client disconnected', {
            socketId: socket.id,
            reason,
            userId: user?.id
        });
        // Stop all streaming sessions for this socket
        this.stopStreaming(socket);
        // Clean up rate limiting
        this.rateLimits.delete(socket.id);
        this.emit('client:disconnect', { socketId: socket.id, reason });
    }
    connectToInstanceManager() {
        // Listen for terminal data from instances
        claude_instance_manager_1.claudeInstanceManager.on('terminalData', (instanceId, data) => {
            this.broadcastTerminalData(instanceId, data);
        });
        // Listen for instance status changes
        claude_instance_manager_1.claudeInstanceManager.on('instanceStatusChanged', (instanceId, status) => {
            this.broadcastInstanceStatus(instanceId, status);
        });
        // Listen for instance destruction
        claude_instance_manager_1.claudeInstanceManager.on('instanceDestroyed', (instanceId) => {
            this.handleInstanceDestroyed(instanceId);
        });
        console.log('✅ Connected to Claude Instance Manager events');
    }
    broadcastTerminalData(instanceId, data) {
        // Find all streaming sessions for this instance
        const instanceSessions = Array.from(this.sessions.values())
            .filter(session => session.instanceId === instanceId && session.isActive);
        for (const session of instanceSessions) {
            try {
                session.socket.emit('streaming:data', {
                    sessionId: session.sessionId,
                    instanceId,
                    data,
                    timestamp: new Date().toISOString()
                });
                // Update metrics
                session.metrics.messagesTransmitted++;
                session.metrics.bytesTransferred += data.length;
                session.lastActivity = new Date();
            }
            catch (error) {
                logger_1.logger.error('Failed to broadcast terminal data', {
                    sessionId: session.sessionId,
                    instanceId,
                    error: error.message
                });
                session.metrics.errors++;
            }
        }
    }
    broadcastInstanceStatus(instanceId, status) {
        this.namespace.to(`streaming:${instanceId}`).emit('streaming:instance_status', {
            instanceId,
            status,
            timestamp: new Date().toISOString()
        });
        // If instance stopped, stop all streaming sessions
        if (status === 'stopped' || status === 'error') {
            const instanceSessions = Array.from(this.sessions.values())
                .filter(session => session.instanceId === instanceId);
            for (const session of instanceSessions) {
                this.stopStreaming(session.socket, session.sessionId);
            }
        }
    }
    handleInstanceDestroyed(instanceId) {
        // Notify all streaming clients
        this.namespace.to(`streaming:${instanceId}`).emit('streaming:instance_destroyed', {
            instanceId,
            message: 'Instance has been destroyed',
            timestamp: new Date().toISOString()
        });
        // Stop all streaming sessions for this instance
        const instanceSessions = Array.from(this.sessions.values())
            .filter(session => session.instanceId === instanceId);
        for (const session of instanceSessions) {
            this.stopStreaming(session.socket, session.sessionId);
        }
    }
    getSocketSessions(socketId) {
        return Array.from(this.sessions.values())
            .filter(session => session.socket.id === socketId);
    }
    checkRateLimit(socketId) {
        const now = Date.now();
        const limit = this.rateLimits.get(socketId);
        if (!limit || now > limit.resetTime) {
            this.rateLimits.set(socketId, {
                requests: 1,
                resetTime: now + this.config.rateLimitWindow
            });
            return true;
        }
        if (limit.requests >= this.config.rateLimitMax) {
            return false;
        }
        limit.requests++;
        return true;
    }
    generateSessionId() {
        return `stream_${Date.now()}_${Math.random().toString(36).substring(2)}`;
    }
    startCleanupProcess() {
        this.cleanupInterval = setInterval(() => {
            this.cleanupStaleSessions();
        }, 5 * 60 * 1000); // Every 5 minutes
        console.log('✅ Started terminal streaming cleanup process');
    }
    cleanupStaleSessions() {
        const now = new Date();
        const staleSessions = [];
        for (const [sessionId, session] of this.sessions.entries()) {
            const timeSinceActivity = now.getTime() - session.lastActivity.getTime();
            if (timeSinceActivity > this.config.sessionTimeout || !session.isActive) {
                staleSessions.push(sessionId);
            }
        }
        for (const sessionId of staleSessions) {
            const session = this.sessions.get(sessionId);
            if (session) {
                this.stopStreaming(session.socket, sessionId);
                logger_1.logger.info('Cleaned up stale streaming session', { sessionId });
            }
        }
        if (staleSessions.length > 0) {
            logger_1.logger.info('Streaming cleanup completed', { cleanedSessions: staleSessions.length });
        }
    }
    startMetricsCollection() {
        this.metricsInterval = setInterval(() => {
            this.collectMetrics();
        }, 30000); // Every 30 seconds
        console.log('✅ Started terminal streaming metrics collection');
    }
    collectMetrics() {
        const metrics = this.getSessionStats();
        // Emit metrics to interested clients (if any are subscribed)
        this.namespace.emit('streaming:metrics_broadcast', {
            ...metrics,
            timestamp: new Date().toISOString()
        });
        this.emit('metrics:collected', metrics);
    }
    /**
     * Public methods for external access
     */
    getSessionStats() {
        return {
            totalSessions: this.sessions.size,
            activeSessions: Array.from(this.sessions.values()).filter(s => s.isActive).length,
            sessionsByInstance: this.getSessionsByInstance(),
            sessionsByUser: this.getSessionsByUser(),
            totalMetrics: this.getTotalMetrics(),
            config: {
                maxSessions: this.config.maxSessions,
                sessionTimeout: this.config.sessionTimeout,
                authentication: this.config.authentication
            }
        };
    }
    getSessionsByInstance() {
        const instanceCounts = {};
        for (const session of this.sessions.values()) {
            if (session.isActive) {
                instanceCounts[session.instanceId] = (instanceCounts[session.instanceId] || 0) + 1;
            }
        }
        return instanceCounts;
    }
    getSessionsByUser() {
        const userCounts = {};
        for (const session of this.sessions.values()) {
            if (session.isActive) {
                const userId = session.userId || 'anonymous';
                userCounts[userId] = (userCounts[userId] || 0) + 1;
            }
        }
        return userCounts;
    }
    getTotalMetrics() {
        const sessions = Array.from(this.sessions.values());
        return {
            totalMessages: sessions.reduce((sum, s) => sum + s.metrics.messagesTransmitted, 0),
            totalBytes: sessions.reduce((sum, s) => sum + s.metrics.bytesTransferred, 0),
            totalErrors: sessions.reduce((sum, s) => sum + s.metrics.errors, 0),
            averageSessionDuration: sessions.length > 0
                ? sessions.reduce((sum, s) => sum + (Date.now() - s.startTime.getTime()), 0) / sessions.length
                : 0
        };
    }
    broadcastToSessions(event, data) {
        this.namespace.emit(event, {
            ...data,
            timestamp: new Date().toISOString()
        });
    }
    /**
     * Shutdown the service
     */
    destroy() {
        console.log('🛑 Shutting down AdvancedTerminalStreamingService...');
        // Clear intervals
        if (this.cleanupInterval) {
            clearInterval(this.cleanupInterval);
        }
        if (this.metricsInterval) {
            clearInterval(this.metricsInterval);
        }
        // Stop all streaming sessions
        for (const session of this.sessions.values()) {
            this.stopStreaming(session.socket, session.sessionId);
        }
        this.sessions.clear();
        this.rateLimits.clear();
        console.log('✅ AdvancedTerminalStreamingService shutdown complete');
    }
}
exports.AdvancedTerminalStreamingService = AdvancedTerminalStreamingService;
exports.default = AdvancedTerminalStreamingService;
//# sourceMappingURL=terminal-streaming-service.js.map