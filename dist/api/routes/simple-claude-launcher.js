"use strict";
/**
 * Simple Claude Launcher API Routes
 * HTTP endpoints for process management - no WebSocket complexity
 */
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = require("express");
const SimpleProcessManager_1 = require("../../services/SimpleProcessManager");
const router = (0, express_1.Router)();
const processManager = new SimpleProcessManager_1.SimpleProcessManager();
/**
 * Launch Claude Code instance
 * POST /api/claude/launch
 */
router.post('/launch', async (req, res) => {
    try {
        console.log('🚀 Launch request received');
        const status = await processManager.launchClaude();
        if (status.status === 'error') {
            return res.status(400).json({
                success: false,
                message: 'Failed to launch Claude',
                error: status.error,
                status
            });
        }
        res.json({
            success: true,
            message: 'Claude launched successfully',
            status,
            workingDirectory: processManager.getWorkingDirectory()
        });
    }
    catch (error) {
        console.error('Launch error:', error);
        res.status(500).json({
            success: false,
            message: 'Internal server error',
            error: error instanceof Error ? error.message : 'Unknown error'
        });
    }
});
/**
 * Stop Claude Code instance
 * POST /api/claude/stop
 */
router.post('/stop', async (req, res) => {
    try {
        console.log('🛑 Stop request received');
        const status = await processManager.stopClaude();
        res.json({
            success: true,
            message: 'Claude stopped',
            status
        });
    }
    catch (error) {
        console.error('Stop error:', error);
        res.status(500).json({
            success: false,
            message: 'Error stopping Claude',
            error: error instanceof Error ? error.message : 'Unknown error'
        });
    }
});
/**
 * Get current process status
 * GET /api/claude/status
 */
router.get('/status', (req, res) => {
    try {
        const status = processManager.getStatus();
        res.json({
            success: true,
            status,
            workingDirectory: processManager.getWorkingDirectory()
        });
    }
    catch (error) {
        console.error('Status error:', error);
        res.status(500).json({
            success: false,
            message: 'Error getting status',
            error: error instanceof Error ? error.message : 'Unknown error'
        });
    }
});
/**
 * Check if Claude Code is available
 * GET /api/claude/check
 */
router.get('/check', async (req, res) => {
    try {
        const available = await processManager.isClaudeAvailable();
        res.json({
            success: true,
            claudeAvailable: available,
            message: available ? 'Claude Code is available' : 'Claude Code not found'
        });
    }
    catch (error) {
        console.error('Check error:', error);
        res.status(500).json({
            success: false,
            message: 'Error checking Claude availability',
            error: error instanceof Error ? error.message : 'Unknown error'
        });
    }
});
/**
 * Health check
 * GET /api/claude/health
 */
router.get('/health', (req, res) => {
    res.json({
        success: true,
        message: 'Claude Launcher API is healthy',
        timestamp: new Date().toISOString(),
        workingDirectory: processManager.getWorkingDirectory()
    });
});
// Graceful shutdown
process.on('SIGTERM', () => {
    console.log('Shutting down Claude Launcher API...');
    processManager.destroy();
    process.exit(0);
});
process.on('SIGINT', () => {
    console.log('Shutting down Claude Launcher API...');
    processManager.destroy();
    process.exit(0);
});
exports.default = router;
//# sourceMappingURL=simple-claude-launcher.js.map