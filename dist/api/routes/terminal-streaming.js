"use strict";
/**
 * Terminal Streaming API Routes
 * RESTful endpoints for terminal session management
 */
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = require("express");
const logger_1 = require("@/utils/logger");
const server_1 = require("@/api/server");
const router = (0, express_1.Router)();
// Middleware for terminal API authentication (simplified for demo)
const requireTerminalAuth = (req, res, next) => {
    // In production, implement proper authentication
    const authHeader = req.headers.authorization;
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
        return res.status(401).json({
            error: 'Authentication required',
            message: 'Bearer token required for terminal access'
        });
    }
    // Add user context to request
    req.userId = 'demo-user'; // Replace with actual user extraction
    next();
};
// Apply authentication middleware to all routes
router.use(requireTerminalAuth);
/**
 * Get terminal session statistics
 * GET /api/v1/terminal/stats
 */
router.get('/stats', async (req, res) => {
    try {
        const webSocketIntegration = (0, server_1.getWebSocketHubIntegration)();
        if (!webSocketIntegration) {
            return res.status(503).json({
                error: 'WebSocket integration not available',
                message: 'Terminal streaming service not initialized'
            });
        }
        // Get stats from terminal streaming service if available
        const stats = {
            serverStatus: 'running',
            timestamp: new Date().toISOString(),
            // Add actual stats when service is accessible
            totalSessions: 0,
            activeSessions: 0,
            sessionsByUser: {},
            systemInfo: {
                platform: process.platform,
                nodeVersion: process.version,
                uptime: process.uptime()
            }
        };
        logger_1.logger.info('Terminal stats requested', { userId: req.userId });
        res.json({
            success: true,
            data: stats
        });
    }
    catch (error) {
        logger_1.logger.error('Failed to get terminal stats', {
            error: error.message,
            userId: req.userId
        });
        res.status(500).json({
            error: 'Internal server error',
            message: error.message
        });
    }
});
/**
 * List all terminal sessions for the authenticated user
 * GET /api/v1/terminal/sessions
 */
router.get('/sessions', async (req, res) => {
    try {
        const userId = req.userId;
        // In a real implementation, this would query the terminal streaming service
        const sessions = {
            user: userId,
            sessions: [],
            totalCount: 0,
            timestamp: new Date().toISOString()
        };
        logger_1.logger.info('Terminal sessions listed', { userId, sessionCount: sessions.totalCount });
        res.json({
            success: true,
            data: sessions
        });
    }
    catch (error) {
        logger_1.logger.error('Failed to list terminal sessions', {
            error: error.message,
            userId: req.userId
        });
        res.status(500).json({
            error: 'Internal server error',
            message: error.message
        });
    }
});
/**
 * Kill a specific terminal session
 * DELETE /api/v1/terminal/sessions/:sessionId
 */
router.delete('/sessions/:sessionId', async (req, res) => {
    try {
        const { sessionId } = req.params;
        const userId = req.userId;
        if (!sessionId) {
            return res.status(400).json({
                error: 'Session ID required',
                message: 'Session ID must be provided'
            });
        }
        // In a real implementation, this would kill the actual session
        logger_1.logger.info('Terminal session kill requested', { sessionId, userId });
        res.json({
            success: true,
            message: 'Session killed successfully',
            sessionId,
            timestamp: new Date().toISOString()
        });
    }
    catch (error) {
        logger_1.logger.error('Failed to kill terminal session', {
            error: error.message,
            sessionId: req.params.sessionId,
            userId: req.userId
        });
        res.status(500).json({
            error: 'Internal server error',
            message: error.message
        });
    }
});
/**
 * Create a new terminal session (HTTP endpoint for session creation)
 * POST /api/v1/terminal/sessions
 */
router.post('/sessions', async (req, res) => {
    try {
        const userId = req.userId;
        const { shell, cwd, cols, rows, env } = req.body;
        const sessionConfig = {
            shell: shell || '/bin/bash',
            cwd: cwd || process.cwd(),
            cols: cols || 80,
            rows: rows || 24,
            env: env || {}
        };
        // Generate session ID
        const sessionId = `http_session_${Date.now()}_${Math.random().toString(36).substring(2)}`;
        logger_1.logger.info('Terminal session creation requested via HTTP', {
            sessionId,
            userId,
            config: sessionConfig
        });
        res.status(201).json({
            success: true,
            message: 'Session creation initiated',
            data: {
                sessionId,
                ...sessionConfig,
                websocketUrl: '/terminal',
                instructions: 'Connect to WebSocket namespace /terminal to interact with the session'
            },
            timestamp: new Date().toISOString()
        });
    }
    catch (error) {
        logger_1.logger.error('Failed to create terminal session via HTTP', {
            error: error.message,
            userId: req.userId
        });
        res.status(500).json({
            error: 'Internal server error',
            message: error.message
        });
    }
});
/**
 * Get terminal session details
 * GET /api/v1/terminal/sessions/:sessionId
 */
router.get('/sessions/:sessionId', async (req, res) => {
    try {
        const { sessionId } = req.params;
        const userId = req.userId;
        if (!sessionId) {
            return res.status(400).json({
                error: 'Session ID required',
                message: 'Session ID must be provided'
            });
        }
        // In a real implementation, this would query the actual session
        const sessionDetails = {
            sessionId,
            userId,
            status: 'unknown',
            startTime: new Date().toISOString(),
            lastActivity: new Date().toISOString(),
            metadata: {
                shell: '/bin/bash',
                cwd: process.cwd(),
                cols: 80,
                rows: 24
            }
        };
        logger_1.logger.info('Terminal session details requested', { sessionId, userId });
        res.json({
            success: true,
            data: sessionDetails
        });
    }
    catch (error) {
        logger_1.logger.error('Failed to get terminal session details', {
            error: error.message,
            sessionId: req.params.sessionId,
            userId: req.userId
        });
        res.status(500).json({
            error: 'Internal server error',
            message: error.message
        });
    }
});
/**
 * Send input to a terminal session via HTTP (alternative to WebSocket)
 * POST /api/v1/terminal/sessions/:sessionId/input
 */
router.post('/sessions/:sessionId/input', async (req, res) => {
    try {
        const { sessionId } = req.params;
        const userId = req.userId;
        const { input } = req.body;
        if (!sessionId) {
            return res.status(400).json({
                error: 'Session ID required',
                message: 'Session ID must be provided'
            });
        }
        if (!input || typeof input !== 'string') {
            return res.status(400).json({
                error: 'Input required',
                message: 'Input must be a non-empty string'
            });
        }
        logger_1.logger.info('Terminal input sent via HTTP', {
            sessionId,
            userId,
            inputLength: input.length
        });
        res.json({
            success: true,
            message: 'Input sent successfully',
            sessionId,
            timestamp: new Date().toISOString(),
            note: 'For real-time interaction, use WebSocket connection'
        });
    }
    catch (error) {
        logger_1.logger.error('Failed to send terminal input via HTTP', {
            error: error.message,
            sessionId: req.params.sessionId,
            userId: req.userId
        });
        res.status(500).json({
            error: 'Internal server error',
            message: error.message
        });
    }
});
/**
 * Health check for terminal streaming service
 * GET /api/v1/terminal/health
 */
router.get('/health', async (req, res) => {
    try {
        const health = {
            status: 'healthy',
            timestamp: new Date().toISOString(),
            service: 'terminal-streaming',
            version: '1.0.0',
            features: {
                websocket_streaming: true,
                session_management: true,
                rate_limiting: true,
                authentication: process.env.TERMINAL_AUTH_ENABLED === 'true',
                cleanup_automation: true
            },
            limits: {
                maxSessions: parseInt(process.env.TERMINAL_MAX_SESSIONS || '50'),
                sessionTimeout: parseInt(process.env.TERMINAL_SESSION_TIMEOUT || '1800000'),
                maxSessionsPerUser: 5
            }
        };
        res.json({
            success: true,
            data: health
        });
    }
    catch (error) {
        logger_1.logger.error('Terminal health check failed', { error: error.message });
        res.status(500).json({
            error: 'Health check failed',
            message: error.message
        });
    }
});
/**
 * Terminal streaming configuration
 * GET /api/v1/terminal/config
 */
router.get('/config', async (req, res) => {
    try {
        const config = {
            websocketNamespace: '/terminal',
            supportedShells: process.platform === 'win32' ?
                ['powershell.exe', 'cmd.exe'] :
                ['/bin/bash', '/bin/sh', '/bin/zsh'],
            defaultShell: process.env.TERMINAL_SHELL ||
                (process.platform === 'win32' ? 'powershell.exe' : '/bin/bash'),
            features: {
                resize: true,
                multiSession: true,
                authentication: process.env.TERMINAL_AUTH_ENABLED === 'true',
                rateLimiting: true
            },
            events: {
                connection: 'connect to /terminal namespace',
                creation: 'terminal:create',
                input: 'terminal:input',
                output: 'terminal:output',
                resize: 'terminal:resize',
                exit: 'terminal:exit',
                error: 'terminal:error'
            }
        };
        res.json({
            success: true,
            data: config
        });
    }
    catch (error) {
        logger_1.logger.error('Failed to get terminal config', { error: error.message });
        res.status(500).json({
            error: 'Internal server error',
            message: error.message
        });
    }
});
exports.default = router;
//# sourceMappingURL=terminal-streaming.js.map