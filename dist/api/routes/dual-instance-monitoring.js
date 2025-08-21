"use strict";
var __createBinding = (this && this.__createBinding) || (Object.create ? (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    var desc = Object.getOwnPropertyDescriptor(m, k);
    if (!desc || ("get" in desc ? !m.__esModule : desc.writable || desc.configurable)) {
      desc = { enumerable: true, get: function() { return m[k]; } };
    }
    Object.defineProperty(o, k2, desc);
}) : (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    o[k2] = m[k];
}));
var __setModuleDefault = (this && this.__setModuleDefault) || (Object.create ? (function(o, v) {
    Object.defineProperty(o, "default", { enumerable: true, value: v });
}) : function(o, v) {
    o["default"] = v;
});
var __importStar = (this && this.__importStar) || (function () {
    var ownKeys = function(o) {
        ownKeys = Object.getOwnPropertyNames || function (o) {
            var ar = [];
            for (var k in o) if (Object.prototype.hasOwnProperty.call(o, k)) ar[ar.length] = k;
            return ar;
        };
        return ownKeys(o);
    };
    return function (mod) {
        if (mod && mod.__esModule) return mod;
        var result = {};
        if (mod != null) for (var k = ownKeys(mod), i = 0; i < k.length; i++) if (k[i] !== "default") __createBinding(result, mod, k[i]);
        __setModuleDefault(result, mod);
        return result;
    };
})();
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = require("express");
const fs = __importStar(require("fs"));
const router = (0, express_1.Router)();
// Import and initialize dual instance manager
const DualInstanceManager = require('../../../src/dual-system/DualInstanceManager');
const dualInstanceManager = new DualInstanceManager();
dualInstanceManager.initialize().catch(console.error);
// Get overall system status
router.get('/status', (req, res) => {
    const status = dualInstanceManager.getStatus();
    // Check actual instance health
    const devHealthPath = '/tmp/claude-communication/development-heartbeat.json';
    const prodHealthPath = '/tmp/claude-communication/production-heartbeat.json';
    let devHealth = null;
    let prodHealth = null;
    try {
        if (fs.existsSync(devHealthPath)) {
            devHealth = JSON.parse(fs.readFileSync(devHealthPath, 'utf8'));
        }
    }
    catch (e) {
        console.error('Error reading dev heartbeat:', e);
    }
    try {
        if (fs.existsSync(prodHealthPath)) {
            prodHealth = JSON.parse(fs.readFileSync(prodHealthPath, 'utf8'));
        }
    }
    catch (e) {
        console.error('Error reading prod heartbeat:', e);
    }
    // Development is always current Claude Code instance
    const response = {
        timestamp: new Date().toISOString(),
        development: {
            status: 'running',
            health: {
                timestamp: new Date().toISOString(),
                pid: process.pid,
                workspace: '/workspaces/agent-feed/',
                type: 'development',
                isCurrent: true,
                status: 'healthy'
            }
        },
        production: {
            status: prodHealth ? 'running' : 'stopped',
            health: prodHealth
        },
        communication: status,
        pendingConfirmations: dualInstanceManager.getPendingConfirmations()
    };
    res.json(response);
});
// Get message history
router.get('/messages', (req, res) => {
    const limit = parseInt(req.query.limit) || 50;
    const history = dualInstanceManager.getMessageHistory(limit);
    res.json(history);
});
// Send dev to prod handoff
router.post('/handoff/dev-to-prod', async (req, res) => {
    try {
        const { task, context } = req.body;
        if (!task) {
            return res.status(400).json({ error: 'Task is required' });
        }
        const messageId = await dualInstanceManager.sendDevToProduction(task, context);
        // Emit WebSocket event for real-time update
        const io = req.app.get('io');
        if (io) {
            io.emit('dual-instance-message', {
                id: messageId,
                source: 'development',
                target: 'production',
                type: 'handoff',
                payload: { task, context },
                timestamp: new Date().toISOString(),
                security: { requiresConfirmation: false }
            });
        }
        res.json({ success: true, messageId });
    }
    catch (error) {
        console.error('Handoff error:', error);
        res.status(500).json({ error: error.message });
    }
});
// Handle confirmation
router.post('/confirm/:messageId', async (req, res) => {
    try {
        const { messageId } = req.params;
        const { approved, comment } = req.body;
        if (typeof approved !== 'boolean') {
            return res.status(400).json({ error: 'Approved must be a boolean' });
        }
        const result = await dualInstanceManager.handleUserConfirmation(messageId, approved, comment);
        // Emit WebSocket event
        const io = req.app.get('io');
        if (io) {
            io.emit('confirmation-processed', result);
        }
        res.json(result);
    }
    catch (error) {
        console.error('Confirmation error:', error);
        res.status(500).json({ error: error.message });
    }
});
// Get pending confirmations
router.get('/pending-confirmations', (req, res) => {
    const pending = dualInstanceManager.getPendingConfirmations();
    res.json(pending);
});
// Simulate production to dev request (for testing)
router.post('/simulate/prod-to-dev', async (req, res) => {
    try {
        const { action, reason, data } = req.body;
        if (!action || !reason) {
            return res.status(400).json({ error: 'Action and reason are required' });
        }
        const messageId = await dualInstanceManager.sendProductionToDev(action, reason, data);
        // Emit WebSocket event
        const io = req.app.get('io');
        if (io) {
            io.emit('dual-instance-message', {
                id: messageId,
                source: 'production',
                target: 'development',
                type: 'request',
                payload: { action, reason, data },
                timestamp: new Date().toISOString(),
                security: { requiresConfirmation: true }
            });
            io.emit('new-confirmation-request', {
                messageId,
                action,
                reason,
                timestamp: new Date().toISOString()
            });
        }
        res.json({ success: true, messageId, requiresConfirmation: true });
    }
    catch (error) {
        console.error('Prod to dev request error:', error);
        res.status(500).json({ error: error.message });
    }
});
// Get activities (for activity feed)
router.get('/activities', async (req, res) => {
    try {
        const messages = dualInstanceManager.getMessageHistory(20);
        // Transform messages into activities
        const activities = messages.map((msg) => ({
            id: msg.id,
            agentName: msg.source === 'development' ? 'Dev Claude' : 'Prod Claude',
            instance: msg.source,
            type: msg.type,
            description: msg.payload?.task || msg.payload?.action || 'Activity',
            timestamp: new Date(msg.timestamp),
            metadata: msg.payload
        }));
        res.json(activities);
    }
    catch (error) {
        console.error('Activities error:', error);
        res.status(500).json({ error: error.message });
    }
});
// Health check endpoint
router.get('/health', (req, res) => {
    res.json({
        status: 'healthy',
        timestamp: new Date().toISOString(),
        manager: dualInstanceManager.isInitialized
    });
});
exports.default = router;
//# sourceMappingURL=dual-instance-monitoring.js.map