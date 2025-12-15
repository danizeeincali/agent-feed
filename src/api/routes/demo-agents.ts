import express from 'express';

const router = express.Router();

// Mock data for demonstration
const developmentAgents = [
  {
    id: 'dev-001',
    name: 'coder',
    description: 'Implementation specialist for writing clean, efficient code',
    status: 'active',
    instance: 'development',
    capabilities: ['javascript', 'typescript', 'react', 'nodejs'],
    priority: 'P1',
    color: '#10b981',
    lastActivity: new Date(Date.now() - 5 * 60 * 1000).toISOString()
  },
  {
    id: 'dev-002',
    name: 'reviewer',
    description: 'Code review and quality assurance specialist',
    status: 'busy',
    instance: 'development',
    capabilities: ['code-review', 'quality-assurance', 'security'],
    priority: 'P1',
    color: '#f59e0b',
    lastActivity: new Date(Date.now() - 2 * 60 * 1000).toISOString()
  },
  {
    id: 'dev-003',
    name: 'tester',
    description: 'Comprehensive testing and quality assurance specialist',
    status: 'idle',
    instance: 'development',
    capabilities: ['unit-testing', 'integration-testing', 'e2e-testing'],
    priority: 'P2',
    color: '#8b5cf6',
    lastActivity: new Date(Date.now() - 15 * 60 * 1000).toISOString()
  }
];

const productionAgents = [
  {
    id: 'prod-001',
    name: 'chief-of-staff-agent',
    description: 'Strategic orchestration and central coordination for VP-level workflow optimization',
    status: 'active',
    instance: 'production',
    capabilities: ['strategic-coordination', 'workflow-orchestration', 'resource-allocation'],
    priority: 'P0',
    color: '#2563eb',
    lastActivity: new Date(Date.now() - 1 * 60 * 1000).toISOString()
  },
  {
    id: 'prod-002',
    name: 'personal-todos-agent',
    description: 'Task management with Fibonacci priority system (P0-P7)',
    status: 'busy',
    instance: 'production',
    capabilities: ['task-management', 'priority-system', 'fibonacci-prioritization'],
    priority: 'P0',
    color: '#059669',
    lastActivity: new Date(Date.now() - 3 * 60 * 1000).toISOString()
  },
  {
    id: 'prod-003',
    name: 'impact-filter-agent',
    description: 'Transform vague requests into actionable initiatives with business impact analysis',
    status: 'active',
    instance: 'production',
    capabilities: ['impact-analysis', 'initiative-structuring', 'business-value-assessment'],
    priority: 'P1',
    color: '#dc2626',
    lastActivity: new Date(Date.now() - 8 * 60 * 1000).toISOString()
  },
  {
    id: 'prod-004',
    name: 'opportunity-scout-agent',
    description: 'Market opportunity identification and micro-business analysis',
    status: 'idle',
    instance: 'production',
    capabilities: ['opportunity-identification', 'market-analysis', 'trend-analysis'],
    priority: 'P2',
    color: '#0891b2',
    lastActivity: new Date(Date.now() - 20 * 60 * 1000).toISOString()
  }
];

const mockActivities = [
  {
    id: 'act-001',
    agentName: 'coder',
    instance: 'development',
    type: 'code_generation',
    description: 'Implemented dual instance dashboard component with real-time updates',
    timestamp: new Date(Date.now() - 2 * 60 * 1000),
    metadata: { files_modified: 3, lines_added: 247 }
  },
  {
    id: 'act-002',
    agentName: 'chief-of-staff-agent',
    instance: 'production',
    type: 'strategic_planning',
    description: 'Analyzed Q4 strategic initiatives and prioritized resource allocation',
    timestamp: new Date(Date.now() - 5 * 60 * 1000),
    metadata: { initiatives_reviewed: 12, priority_updates: 8 }
  },
  {
    id: 'act-003',
    agentName: 'reviewer',
    instance: 'development',
    type: 'code_review',
    description: 'Reviewed pull request #247: Enhanced WebSocket integration',
    timestamp: new Date(Date.now() - 7 * 60 * 1000),
    metadata: { issues_found: 2, suggestions: 5 }
  },
  {
    id: 'act-004',
    agentName: 'personal-todos-agent',
    instance: 'production',
    type: 'task_management',
    description: 'Updated task priorities using Fibonacci system, completed 8 high-priority items',
    timestamp: new Date(Date.now() - 10 * 60 * 1000),
    metadata: { tasks_completed: 8, priority_changes: 15 }
  }
];

const mockHandoffs = [
  {
    id: 'handoff-001',
    fromInstance: 'development',
    toInstance: 'production',
    type: 'feature_deployment',
    status: 'completed',
    description: 'Deployed dual instance dashboard feature to production environment',
    timestamp: new Date(Date.now() - 30 * 60 * 1000)
  },
  {
    id: 'handoff-002',
    fromInstance: 'production',
    toInstance: 'development',
    type: 'business_requirement',
    status: 'in_progress',
    description: 'Request for enhanced analytics dashboard with real-time KPI tracking',
    timestamp: new Date(Date.now() - 15 * 60 * 1000)
  }
];

// Development agents endpoint
router.get('/dev/agents', (req, res) => {
  res.json({ agents: developmentAgents });
});

// Production agents endpoint
router.get('/prod/agents', (req, res) => {
  res.json({ agents: productionAgents });
});

// Combined activities endpoint
router.get('/activities', (req, res) => {
  const limit = parseInt(req.query.limit as string) || 10;
  const activities = mockActivities
    .sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime())
    .slice(0, limit);
  
  res.json({ activities });
});

// Development activities
router.get('/dev/activities', (req, res) => {
  const activities = mockActivities.filter(a => a.instance === 'development');
  res.json({ activities });
});

// Production activities
router.get('/prod/activities', (req, res) => {
  const activities = mockActivities.filter(a => a.instance === 'production');
  res.json({ activities });
});

// Handoffs endpoint
router.get('/handoff/status', (req, res) => {
  res.json({ handoffs: mockHandoffs });
});

// Health check with mock data
router.get('/health', (req, res) => {
  res.json({
    status: 'healthy',
    instances: {
      development: {
        status: 'healthy',
        port: 8080,
        agents: developmentAgents.length,
        lastCheck: new Date()
      },
      production: {
        status: 'healthy',
        port: 8090,
        agents: productionAgents.length,
        lastCheck: new Date()
      }
    },
    timestamp: new Date()
  });
});

// Create new handoff
router.post('/handoff/create', (req, res) => {
  const { fromInstance, toInstance, type, description } = req.body;
  
  const newHandoff = {
    id: `handoff-${Date.now()}`,
    fromInstance,
    toInstance,
    type,
    status: 'pending',
    description,
    timestamp: new Date()
  };
  
  mockHandoffs.unshift(newHandoff);
  
  res.json({
    success: true,
    handoff: newHandoff
  });
});

export default router;