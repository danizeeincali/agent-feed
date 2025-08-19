"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = __importDefault(require("express"));
const router = express_1.default.Router();
// Mock data for dual instance activities
const mockActivities = [
    {
        id: 'act-1',
        agentName: 'Chief of Staff',
        instance: 'production',
        type: 'delegation',
        description: 'Delegated strategic planning task',
        timestamp: new Date()
    },
    {
        id: 'act-2',
        agentName: 'Code Generator',
        instance: 'development',
        type: 'code_generation',
        description: 'Generated new API endpoint',
        timestamp: new Date()
    }
];
// Get activities for dual instance view
router.get('/activities', (req, res) => {
    const limit = parseInt(req.query.limit) || 20;
    res.json({
        success: true,
        activities: mockActivities.slice(0, limit),
        timestamp: new Date().toISOString()
    });
});
// Get handoff status
router.get('/handoff/status', (req, res) => {
    res.json({
        success: true,
        handoffs: [],
        timestamp: new Date().toISOString()
    });
});
// Create a handoff
router.post('/handoff', (req, res) => {
    const { fromInstance, toInstance, type, description } = req.body;
    res.json({
        success: true,
        handoff: {
            id: `handoff-${Date.now()}`,
            fromInstance,
            toInstance,
            type,
            description,
            status: 'pending',
            timestamp: new Date()
        }
    });
});
exports.default = router;
//# sourceMappingURL=dual-instance.js.map