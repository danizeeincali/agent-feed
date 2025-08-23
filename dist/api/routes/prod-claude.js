"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = __importDefault(require("express"));
const prod_claude_service_1 = require("@/services/prod-claude-service");
const hub_server_1 = require("@/websockets/hub-server");
const logger_1 = require("@/utils/logger");
const router = express_1.default.Router();
/**
 * Get production Claude service status
 */
router.get('/status', (req, res) => {
    try {
        const serviceStatus = prod_claude_service_1.prodClaudeService.getStatus();
        const hubStatus = hub_server_1.hubServer.getStatus();
        res.json({
            success: true,
            timestamp: new Date().toISOString(),
            service: serviceStatus,
            hub: hubStatus,
            environment: {
                prodClaudeEnabled: process.env.PROD_CLAUDE_ENABLED === 'true',
                devMode: process.env.DEV_MODE === 'true',
                nodeEnv: process.env.NODE_ENV
            }
        });
    }
    catch (error) {
        logger_1.logger.error('Error getting production Claude status:', error);
        res.status(500).json({
            success: false,
            error: 'Failed to get status',
            message: error instanceof Error ? error.message : 'Unknown error'
        });
    }
});
/**
 * Start production Claude service
 */
router.post('/start', async (req, res) => {
    try {
        await prod_claude_service_1.prodClaudeService.start();
        res.json({
            success: true,
            message: 'Production Claude service started',
            timestamp: new Date().toISOString(),
            status: prod_claude_service_1.prodClaudeService.getStatus()
        });
    }
    catch (error) {
        logger_1.logger.error('Error starting production Claude service:', error);
        res.status(500).json({
            success: false,
            error: 'Failed to start service',
            message: error instanceof Error ? error.message : 'Unknown error'
        });
    }
});
/**
 * Stop production Claude service
 */
router.post('/stop', async (req, res) => {
    try {
        await prod_claude_service_1.prodClaudeService.stop();
        res.json({
            success: true,
            message: 'Production Claude service stopped',
            timestamp: new Date().toISOString(),
            status: prod_claude_service_1.prodClaudeService.getStatus()
        });
    }
    catch (error) {
        logger_1.logger.error('Error stopping production Claude service:', error);
        res.status(500).json({
            success: false,
            error: 'Failed to stop service',
            message: error instanceof Error ? error.message : 'Unknown error'
        });
    }
});
/**
 * Send message to production Claude instance
 */
router.post('/message', async (req, res) => {
    try {
        const { type, payload, requiresResponse = true } = req.body;
        if (!type || !payload) {
            return res.status(400).json({
                success: false,
                error: 'Missing required fields',
                message: 'type and payload are required'
            });
        }
        const messageId = `msg_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
        // Send message through hub
        const success = hub_server_1.hubServer.sendToInstance('prod-claude', {
            id: messageId,
            type,
            from: 'api',
            payload,
            timestamp: new Date().toISOString(),
            requiresResponse
        });
        if (!success) {
            return res.status(503).json({
                success: false,
                error: 'Production Claude instance not available',
                message: 'Instance not connected to hub'
            });
        }
        res.json({
            success: true,
            messageId,
            message: 'Message sent to production Claude instance',
            timestamp: new Date().toISOString()
        });
    }
    catch (error) {
        logger_1.logger.error('Error sending message to production Claude:', error);
        res.status(500).json({
            success: false,
            error: 'Failed to send message',
            message: error instanceof Error ? error.message : 'Unknown error'
        });
    }
});
/**
 * Get hub server status and connected instances
 */
router.get('/hub/status', (req, res) => {
    try {
        const hubStatus = hub_server_1.hubServer.getStatus();
        res.json({
            success: true,
            timestamp: new Date().toISOString(),
            hub: hubStatus
        });
    }
    catch (error) {
        logger_1.logger.error('Error getting hub status:', error);
        res.status(500).json({
            success: false,
            error: 'Failed to get hub status',
            message: error instanceof Error ? error.message : 'Unknown error'
        });
    }
});
/**
 * Get connected instances by type
 */
router.get('/hub/instances/:type', (req, res) => {
    try {
        const { type } = req.params;
        const instances = hub_server_1.hubServer.getInstancesByType(type);
        res.json({
            success: true,
            instanceType: type,
            instances,
            count: instances.length,
            timestamp: new Date().toISOString()
        });
    }
    catch (error) {
        logger_1.logger.error('Error getting instances by type:', error);
        res.status(500).json({
            success: false,
            error: 'Failed to get instances',
            message: error instanceof Error ? error.message : 'Unknown error'
        });
    }
});
/**
 * Send direct message to specific instance
 */
router.post('/hub/send/:instanceId', (req, res) => {
    try {
        const { instanceId } = req.params;
        const { message } = req.body;
        if (!message) {
            return res.status(400).json({
                success: false,
                error: 'Missing message',
                message: 'message field is required'
            });
        }
        const success = hub_server_1.hubServer.sendToInstance(instanceId, message);
        if (!success) {
            return res.status(404).json({
                success: false,
                error: 'Instance not found',
                message: `Instance ${instanceId} is not connected`
            });
        }
        res.json({
            success: true,
            message: `Message sent to ${instanceId}`,
            timestamp: new Date().toISOString()
        });
    }
    catch (error) {
        logger_1.logger.error('Error sending direct message:', error);
        res.status(500).json({
            success: false,
            error: 'Failed to send message',
            message: error instanceof Error ? error.message : 'Unknown error'
        });
    }
});
/**
 * Health check endpoint
 */
router.get('/health', (req, res) => {
    try {
        const serviceStatus = prod_claude_service_1.prodClaudeService.getStatus();
        const isHealthy = serviceStatus.running && serviceStatus.clientStatus.connected;
        res.status(isHealthy ? 200 : 503).json({
            success: isHealthy,
            status: isHealthy ? 'healthy' : 'unhealthy',
            timestamp: new Date().toISOString(),
            checks: {
                serviceRunning: serviceStatus.running,
                clientConnected: serviceStatus.clientStatus.connected,
                hubRunning: hub_server_1.hubServer.getStatus().running
            }
        });
    }
    catch (error) {
        logger_1.logger.error('Error in health check:', error);
        res.status(500).json({
            success: false,
            status: 'error',
            error: error instanceof Error ? error.message : 'Unknown error',
            timestamp: new Date().toISOString()
        });
    }
});
exports.default = router;
//# sourceMappingURL=prod-claude.js.map