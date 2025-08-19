"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = __importDefault(require("express"));
const router = express_1.default.Router();
// Production agents configuration
const PRODUCTION_AGENTS = [
    { id: 'chief-of-staff-agent', name: 'Chief of Staff', category: 'coordination', priority: 'critical' },
    { id: 'personal-todos-agent', name: 'Personal Todos', category: 'productivity', priority: 'high' },
    { id: 'meeting-prep-agent', name: 'Meeting Prep', category: 'productivity', priority: 'high' },
    { id: 'impact-filter-agent', name: 'Impact Filter', category: 'analysis', priority: 'high' },
    { id: 'bull-beaver-bear-agent', name: 'Bull Beaver Bear', category: 'analysis', priority: 'medium' },
    { id: 'goal-analyst-agent', name: 'Goal Analyst', category: 'analysis', priority: 'high' },
    { id: 'follow-ups-agent', name: 'Follow Ups', category: 'productivity', priority: 'high' },
    { id: 'prd-observer-agent', name: 'PRD Observer', category: 'documentation', priority: 'medium' },
    { id: 'opportunity-scout-agent', name: 'Opportunity Scout', category: 'research', priority: 'high' },
    { id: 'market-research-analyst-agent', name: 'Market Research Analyst', category: 'research', priority: 'high' },
    { id: 'financial-viability-analyzer-agent', name: 'Financial Viability Analyzer', category: 'analysis', priority: 'high' },
    { id: 'link-logger-agent', name: 'Link Logger', category: 'documentation', priority: 'low' },
    { id: 'agent-feedback-agent', name: 'Agent Feedback', category: 'meta', priority: 'medium' },
    { id: 'get-to-know-you-agent', name: 'Get To Know You', category: 'social', priority: 'low' },
    { id: 'agent-feed-post-composer-agent', name: 'Feed Post Composer', category: 'content', priority: 'medium' },
    { id: 'agent-ideas-agent', name: 'Agent Ideas', category: 'meta', priority: 'medium' },
    { id: 'meta-agent', name: 'Meta Agent', category: 'meta', priority: 'high' },
    { id: 'meta-update-agent', name: 'Meta Update', category: 'meta', priority: 'medium' },
    { id: 'opportunity-log-maintainer-agent', name: 'Opportunity Log Maintainer', category: 'documentation', priority: 'medium' },
    { id: 'meeting-next-steps-agent', name: 'Meeting Next Steps', category: 'productivity', priority: 'high' },
    { id: 'chief-of-staff-automation-agent', name: 'Chief of Staff Automation', category: 'coordination', priority: 'critical' }
];
const getCategoryColor = (category) => {
    const colors = {
        coordination: '#3B82F6',
        productivity: '#10B981',
        analysis: '#F59E0B',
        documentation: '#8B5CF6',
        research: '#EC4899',
        meta: '#6B7280',
        social: '#06B6D4',
        content: '#84CC16'
    };
    return colors[category] || '#6B7280';
};
// Get production agents
router.get('/production', (req, res) => {
    const agents = PRODUCTION_AGENTS.map(agent => ({
        id: agent.id,
        name: agent.name,
        description: `${agent.name} - ${agent.category} agent for business operations`,
        status: Math.random() > 0.3 ? 'active' : 'idle',
        instance: 'production',
        capabilities: [agent.category, 'automation', 'analysis', 'reporting'],
        priority: agent.priority,
        color: getCategoryColor(agent.category),
        lastActivity: new Date(Date.now() - Math.random() * 3600000).toISOString(),
        category: agent.category,
        cpu_usage: Math.floor(Math.random() * 60) + 20,
        memory_usage: Math.floor(Math.random() * 50) + 30,
        response_time: Math.floor(Math.random() * 2000) + 500,
        success_rate: 0.85 + Math.random() * 0.14,
        total_tasks: Math.floor(Math.random() * 200) + 50
    }));
    res.json({
        success: true,
        agents,
        timestamp: new Date().toISOString()
    });
});
// Get development agents (placeholder for now)
router.get('/development', (req, res) => {
    // Development agents would come from actual Claude Code instances
    const devAgents = [
        {
            id: 'code-generator',
            name: 'Code Generator',
            description: 'Automated code generation and refactoring',
            status: 'active',
            instance: 'development',
            capabilities: ['coding', 'testing', 'refactoring', 'documentation'],
            priority: 'high',
            color: '#8B5CF6',
            lastActivity: new Date().toISOString(),
            category: 'development',
            cpu_usage: 45,
            memory_usage: 62,
            response_time: 1200,
            success_rate: 0.92,
            total_tasks: 156
        },
        {
            id: 'test-runner',
            name: 'Test Runner',
            description: 'Automated testing and validation',
            status: 'active',
            instance: 'development',
            capabilities: ['testing', 'validation', 'coverage', 'reporting'],
            priority: 'high',
            color: '#06B6D4',
            lastActivity: new Date().toISOString(),
            category: 'testing',
            cpu_usage: 38,
            memory_usage: 45,
            response_time: 890,
            success_rate: 0.95,
            total_tasks: 234
        }
    ];
    res.json({
        success: true,
        agents: devAgents,
        timestamp: new Date().toISOString()
    });
});
// Get all agents
router.get('/all', (req, res) => {
    const prodAgents = PRODUCTION_AGENTS.map(agent => ({
        id: agent.id,
        name: agent.name,
        description: `${agent.name} - ${agent.category} agent`,
        status: Math.random() > 0.3 ? 'active' : 'idle',
        instance: 'production',
        capabilities: [agent.category, 'automation', 'analysis'],
        priority: agent.priority,
        color: getCategoryColor(agent.category),
        lastActivity: new Date(Date.now() - Math.random() * 3600000).toISOString(),
        category: agent.category
    }));
    const devAgents = [
        {
            id: 'code-generator',
            name: 'Code Generator',
            description: 'Automated code generation',
            status: 'active',
            instance: 'development',
            capabilities: ['coding', 'testing', 'refactoring'],
            priority: 'high',
            color: '#8B5CF6',
            lastActivity: new Date().toISOString(),
            category: 'development'
        }
    ];
    res.json({
        success: true,
        agents: [...prodAgents, ...devAgents],
        production: prodAgents,
        development: devAgents,
        timestamp: new Date().toISOString()
    });
});
exports.default = router;
//# sourceMappingURL=agents-instance.js.map