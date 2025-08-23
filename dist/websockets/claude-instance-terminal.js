"use strict";
/**
 * Claude Instance Terminal WebSocket Handler
 *
 * Real-time terminal communication for Claude instances using Socket.IO
 * with authentication, rate limiting, and multi-client synchronization.
 */
Object.defineProperty(exports, "__esModule", { value: true });
exports.ClaudeInstanceTerminalWebSocket = void 0;
const claude_instance_manager_1 = require("@/services/claude-instance-manager");
const logger_1 = require("@/utils/logger");
const RATE_LIMIT_WINDOW = 60000; // 1 minute
const RATE_LIMIT_MAX_MESSAGES = 1000; // 1000 messages per minute
const HEARTBEAT_INTERVAL = 30000; // 30 seconds
const INACTIVE_TIMEOUT = 300000; // 5 minutes
class ClaudeInstanceTerminalWebSocket {
    io;
    connectedClients = new Map();
    rateLimits = new Map();
    heartbeatInterval;
    constructor(io) {
        this.io = io;
        this.setupNamespace();
        this.startHeartbeat();
        this.setupInstanceManagerEvents();
    }
    setupNamespace() {
        console.log('🔧 Setting up terminal namespace /terminal...');
        const terminalNamespace = this.io.of('/terminal');
        console.log('✅ Terminal namespace /terminal created successfully');
        // Authentication middleware
        terminalNamespace.use(async (socket, next) => {
            try {
                console.log('🔍 Terminal namespace auth attempt:', {
                    socketId: socket.id,
                    auth: socket.handshake.auth
                });
                const token = socket.handshake.auth.token;
                const userId = socket.handshake.auth.userId;
                const username = socket.handshake.auth.username;
                console.log('🔍 Terminal auth values:', { token: !!token, userId, username });
                if (!userId) {
                    console.log('❌ Terminal auth failed: No userId provided');
                    return next(new Error('Authentication required'));
                }
                // Set user information
                socket.user = {
                    id: userId,
                    username: username || `User-${userId.slice(0, 8)}`
                };
                socket.lastActivity = new Date();
                next();
            }
            catch (error) {
                next(new Error('Authentication failed'));
            }
        });
        // Connection handler
        terminalNamespace.on('connection', (socket) => {
            this.handleConnection(socket);
        });
    }
    handleConnection(socket) {
        const userId = socket.user?.id;
        logger_1.logger.info('Terminal client connected', {
            socketId: socket.id,
            userId,
            username: socket.user?.username
        });
        // Store connected client
        this.connectedClients.set(socket.id, socket);
        // Set up event handlers
        this.setupSocketHandlers(socket);
        // Send welcome message
        socket.emit('connected', {
            message: 'Connected to Claude Instance Terminal',
            timestamp: new Date().toISOString()
        });
    }
    setupSocketHandlers(socket) {
        // Connect to instance terminal
        socket.on('connect_terminal', async (data) => {
            try {
                if (!this.checkRateLimit(socket.id)) {
                    socket.emit('error', { message: 'Rate limit exceeded' });
                    return;
                }
                const { instanceId } = data;
                // Verify instance exists
                const instance = claude_instance_manager_1.claudeInstanceManager.getInstanceStatus(instanceId);
                if (!instance) {
                    socket.emit('error', { message: 'Instance not found' });
                    return;
                }
                // Check if instance is running
                if (instance.status !== 'running') {
                    socket.emit('error', { message: 'Instance is not running' });
                    return;
                }
                // Add client to terminal session
                claude_instance_manager_1.claudeInstanceManager.addTerminalClient(instanceId, socket.id);
                socket.instanceId = instanceId;
                // Join instance room
                socket.join(`instance:${instanceId}`);
                // Send terminal history
                const history = claude_instance_manager_1.claudeInstanceManager.getTerminalHistory(instanceId);
                if (history.length > 0) {
                    socket.emit('terminal_data', {
                        data: history.join(''),
                        isHistory: true
                    });
                }
                // Get terminal session info
                const terminalSession = claude_instance_manager_1.claudeInstanceManager.getTerminalSession(instanceId);
                socket.emit('terminal_connected', {
                    instanceId,
                    sessionId: terminalSession?.id,
                    terminalSize: terminalSession?.size,
                    clientCount: terminalSession?.clients.size || 1,
                    timestamp: new Date().toISOString()
                });
                logger_1.logger.info('Client connected to terminal', {
                    socketId: socket.id,
                    instanceId,
                    userId: socket.user?.id
                });
            }
            catch (error) {
                logger_1.logger.error('Failed to connect to terminal', {
                    error: error.message,
                    socketId: socket.id
                });
                socket.emit('error', { message: 'Failed to connect to terminal' });
            }
        });
        // Handle terminal input
        socket.on('terminal_input', (data) => {
            try {
                if (!this.checkRateLimit(socket.id)) {
                    socket.emit('error', { message: 'Rate limit exceeded' });
                    return;
                }
                if (!socket.instanceId) {
                    socket.emit('error', { message: 'Not connected to any instance' });
                    return;
                }
                if (!this.validateTerminalInput(data.data)) {
                    socket.emit('error', { message: 'Invalid input' });
                    return;
                }
                // Write to terminal
                claude_instance_manager_1.claudeInstanceManager.writeToTerminal(socket.instanceId, data.data);
                socket.lastActivity = new Date();
                logger_1.logger.debug('Terminal input received', {
                    socketId: socket.id,
                    instanceId: socket.instanceId,
                    inputLength: data.data.length
                });
            }
            catch (error) {
                logger_1.logger.error('Failed to handle terminal input', {
                    error: error.message,
                    socketId: socket.id
                });
                socket.emit('error', { message: 'Failed to process input' });
            }
        });
        // Handle terminal resize
        socket.on('terminal_resize', (data) => {
            try {
                if (!socket.instanceId) {
                    socket.emit('error', { message: 'Not connected to any instance' });
                    return;
                }
                const { cols, rows } = data;
                // Validate dimensions
                if (!this.validateTerminalSize(cols, rows)) {
                    socket.emit('error', { message: 'Invalid terminal size' });
                    return;
                }
                // Resize terminal
                claude_instance_manager_1.claudeInstanceManager.resizeTerminal(socket.instanceId, cols, rows);
                socket.lastActivity = new Date();
                // Broadcast resize to other clients
                socket.to(`instance:${socket.instanceId}`).emit('terminal_resized', { cols, rows });
                logger_1.logger.debug('Terminal resized', {
                    socketId: socket.id,
                    instanceId: socket.instanceId,
                    cols,
                    rows
                });
            }
            catch (error) {
                logger_1.logger.error('Failed to resize terminal', {
                    error: error.message,
                    socketId: socket.id
                });
                socket.emit('error', { message: 'Failed to resize terminal' });
            }
        });
        // Handle disconnect from terminal
        socket.on('disconnect_terminal', () => {
            this.handleTerminalDisconnect(socket);
        });
        // Handle ping for connection health
        socket.on('ping', () => {
            socket.lastActivity = new Date();
            socket.emit('pong', { timestamp: new Date().toISOString() });
        });
        // Handle client disconnect
        socket.on('disconnect', (reason) => {
            this.handleClientDisconnect(socket, reason);
        });
        // Handle errors
        socket.on('error', (error) => {
            logger_1.logger.error('Socket error', {
                socketId: socket.id,
                error: error.message,
                userId: socket.user?.id
            });
        });
    }
    handleTerminalDisconnect(socket) {
        if (socket.instanceId) {
            claude_instance_manager_1.claudeInstanceManager.removeTerminalClient(socket.instanceId, socket.id);
            socket.leave(`instance:${socket.instanceId}`);
            logger_1.logger.info('Client disconnected from terminal', {
                socketId: socket.id,
                instanceId: socket.instanceId
            });
            socket.instanceId = undefined;
        }
        socket.emit('terminal_disconnected', {
            message: 'Disconnected from terminal',
            timestamp: new Date().toISOString()
        });
    }
    handleClientDisconnect(socket, reason) {
        logger_1.logger.info('Terminal client disconnected', {
            socketId: socket.id,
            reason,
            userId: socket.user?.id
        });
        // Clean up terminal connection
        this.handleTerminalDisconnect(socket);
        // Remove from connected clients
        this.connectedClients.delete(socket.id);
        // Clean up rate limiting
        this.rateLimits.delete(socket.id);
    }
    setupInstanceManagerEvents() {
        // Listen for terminal data from instance manager
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
    }
    broadcastTerminalData(instanceId, data) {
        this.io.of('/terminal').to(`instance:${instanceId}`).emit('terminal_data', {
            data,
            timestamp: new Date().toISOString()
        });
    }
    broadcastInstanceStatus(instanceId, status) {
        this.io.of('/terminal').to(`instance:${instanceId}`).emit('instance_status', {
            instanceId,
            status,
            timestamp: new Date().toISOString()
        });
    }
    handleInstanceDestroyed(instanceId) {
        this.io.of('/terminal').to(`instance:${instanceId}`).emit('instance_destroyed', {
            instanceId,
            message: 'Instance has been destroyed',
            timestamp: new Date().toISOString()
        });
        // Disconnect all clients from this instance
        const clients = this.io.of('/terminal').adapter.rooms.get(`instance:${instanceId}`);
        if (clients) {
            for (const clientId of clients) {
                const socket = this.connectedClients.get(clientId);
                if (socket) {
                    this.handleTerminalDisconnect(socket);
                }
            }
        }
    }
    checkRateLimit(socketId) {
        const now = Date.now();
        const limit = this.rateLimits.get(socketId);
        if (!limit || now > limit.resetTime) {
            this.rateLimits.set(socketId, {
                count: 1,
                resetTime: now + RATE_LIMIT_WINDOW
            });
            return true;
        }
        if (limit.count >= RATE_LIMIT_MAX_MESSAGES) {
            return false;
        }
        limit.count++;
        return true;
    }
    validateTerminalInput(input) {
        // Basic validation
        if (typeof input !== 'string') {
            return false;
        }
        // Length check (max 1000 characters per input)
        if (input.length > 1000) {
            return false;
        }
        // Check for potentially dangerous characters
        const dangerousPatterns = [
            /\x00/, // null bytes
            /\x1b\[[0-9;]*[a-zA-Z]/, // ANSI escape sequences (basic check)
        ];
        for (const pattern of dangerousPatterns) {
            if (pattern.test(input)) {
                return false;
            }
        }
        return true;
    }
    validateTerminalSize(cols, rows) {
        return (typeof cols === 'number' &&
            typeof rows === 'number' &&
            cols >= 10 && cols <= 500 &&
            rows >= 5 && rows <= 200);
    }
    startHeartbeat() {
        this.heartbeatInterval = setInterval(() => {
            this.performHeartbeat();
        }, HEARTBEAT_INTERVAL);
    }
    performHeartbeat() {
        const now = new Date();
        const inactiveThreshold = new Date(now.getTime() - INACTIVE_TIMEOUT);
        // Check for inactive clients
        for (const [socketId, socket] of this.connectedClients) {
            if (socket.lastActivity && socket.lastActivity < inactiveThreshold) {
                logger_1.logger.info('Disconnecting inactive client', {
                    socketId,
                    lastActivity: socket.lastActivity
                });
                socket.disconnect(true);
            }
        }
        // Broadcast heartbeat to all connected clients
        this.io.of('/terminal').emit('heartbeat', {
            timestamp: now.toISOString(),
            connectedClients: this.connectedClients.size
        });
    }
    /**
     * Get statistics about terminal connections
     */
    getStats() {
        const stats = {
            connectedClients: this.connectedClients.size,
            rateLimitedClients: this.rateLimits.size,
            activeInstances: new Set(Array.from(this.connectedClients.values())
                .map(socket => socket.instanceId)
                .filter(Boolean)).size
        };
        return stats;
    }
    /**
     * Shutdown handler
     */
    shutdown() {
        if (this.heartbeatInterval) {
            clearInterval(this.heartbeatInterval);
        }
        // Disconnect all clients
        for (const socket of this.connectedClients.values()) {
            socket.disconnect(true);
        }
        this.connectedClients.clear();
        this.rateLimits.clear();
        logger_1.logger.info('Claude Instance Terminal WebSocket shutdown complete');
    }
}
exports.ClaudeInstanceTerminalWebSocket = ClaudeInstanceTerminalWebSocket;
exports.default = ClaudeInstanceTerminalWebSocket;
//# sourceMappingURL=claude-instance-terminal.js.map