"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = __importDefault(require("express"));
const router = express_1.default.Router();
// Store current Claude Code session info
let currentSession = {
    sessionId: process.env.CLAUDE_SESSION_ID || 'current-session',
    userId: 'claude-code-user',
    startTime: new Date(),
    activities: []
};
// Real-time activity tracking
const addActivity = (activity) => {
    const newActivity = {
        id: `act-${Date.now()}`,
        agentName: 'claude-code-assistant',
        instance: 'production',
        type: activity.type || 'assistance',
        description: activity.description,
        timestamp: new Date(),
        metadata: activity.metadata || {}
    };
    currentSession.activities.unshift(newActivity);
    // Keep only last 50 activities
    if (currentSession.activities.length > 50) {
        currentSession.activities = currentSession.activities.slice(0, 50);
    }
    return newActivity;
};
// Production agents endpoint (showing this Claude Code instance + production agents)
router.get('/prod/agents', (req, res) => {
    const agents = [
        {
            id: 'claude-prod-001',
            name: 'claude-code-assistant',
            description: 'AI assistant helping with AgentLink development and system architecture',
            status: 'active',
            instance: 'production',
            capabilities: [
                'system-architecture',
                'code-generation',
                'problem-solving',
                'real-time-assistance'
            ],
            priority: 'P0',
            color: '#2563eb',
            lastActivity: currentSession.activities[0]?.timestamp || new Date()
        },
        {
            id: 'prod-002',
            name: 'chief-of-staff-agent',
            description: 'Strategic orchestration and central coordination for VP-level workflow optimization',
            status: 'active',
            instance: 'production',
            capabilities: ['strategic-coordination', 'workflow-orchestration', 'resource-allocation'],
            priority: 'P0',
            color: '#2563eb',
            lastActivity: new Date(Date.now() - 1 * 60 * 1000)
        },
        {
            id: 'prod-003',
            name: 'personal-todos-agent',
            description: 'Task management with Fibonacci priority system (P0-P7)',
            status: 'busy',
            instance: 'production',
            capabilities: ['task-management', 'priority-system', 'fibonacci-prioritization'],
            priority: 'P0',
            color: '#059669',
            lastActivity: new Date(Date.now() - 3 * 60 * 1000)
        },
        {
            id: 'prod-004',
            name: 'impact-filter-agent',
            description: 'Transform vague requests into actionable initiatives with business impact analysis',
            status: 'active',
            instance: 'production',
            capabilities: ['impact-analysis', 'initiative-structuring', 'business-value-assessment'],
            priority: 'P1',
            color: '#dc2626',
            lastActivity: new Date(Date.now() - 8 * 60 * 1000)
        },
        {
            id: 'prod-005',
            name: 'opportunity-scout-agent',
            description: 'Market opportunity identification and micro-business analysis',
            status: 'idle',
            instance: 'production',
            capabilities: ['opportunity-identification', 'market-analysis', 'trend-analysis'],
            priority: 'P2',
            color: '#0891b2',
            lastActivity: new Date(Date.now() - 20 * 60 * 1000)
        }
    ];
    res.json({ agents });
});
// Combined activities endpoint
router.get('/activities', (req, res) => {
    const limit = parseInt(req.query.limit) || 20;
    const activities = currentSession.activities.slice(0, limit);
    res.json({ activities });
});
// Production activities only
router.get('/prod/activities', (req, res) => {
    const activities = currentSession.activities.filter(a => a.instance === 'production');
    res.json({ activities });
});
// Health check
router.get('/health', (req, res) => {
    res.json({
        status: 'healthy',
        instances: {
            development: {
                status: 'down',
                port: 8080,
                agents: 0,
                lastCheck: new Date()
            },
            production: {
                status: 'healthy',
                port: 8090,
                agents: 5,
                lastCheck: new Date()
            }
        },
        timestamp: new Date()
    });
});
// Add activity endpoint (for this Claude Code instance to report its activities)
router.post('/activity', (req, res) => {
    const { type, description, metadata } = req.body;
    const activity = addActivity({
        type,
        description,
        metadata
    });
    res.json({ success: true, activity });
});
// Session info
router.get('/session', (req, res) => {
    res.json({
        sessionId: currentSession.sessionId,
        userId: currentSession.userId,
        startTime: currentSession.startTime,
        activityCount: currentSession.activities.length,
        uptime: Date.now() - currentSession.startTime.getTime()
    });
});
// Initialize with startup activity
addActivity({
    type: 'system_startup',
    description: 'Claude Code assistant initialized and connected to AgentLink system',
    metadata: {
        sessionId: currentSession.sessionId,
        capabilities: ['architecture', 'development', 'real-time-assistance']
    }
});
exports.default = router;
//# sourceMappingURL=claude-code-integration.js.map