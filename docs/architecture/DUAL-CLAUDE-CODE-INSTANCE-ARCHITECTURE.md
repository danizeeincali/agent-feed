# DUAL CLAUDE CODE INSTANCE ARCHITECTURE
**System Architect Design for Agent-Feed Dual Environment**

**Author**: System Architecture Designer  
**Date**: 2025-08-19  
**Status**: IMPLEMENTATION-READY  
**Purpose**: Separate Development and Production Agent Ecosystems  

---

## EXECUTIVE SUMMARY

This architecture establishes **two isolated Claude Code instances** for the Agent-Feed system:

1. **Development Instance** - For building AgentLink (coding agents: coder, reviewer, tester, etc.)
2. **Production Instance** - For running 29 business/productivity agents (21 existing + 8 new)

**Key Benefits**:
- Clear separation of concerns between development and business operations
- Isolated authentication and configuration management
- Independent scaling and resource allocation
- Seamless workflow handoffs between environments
- Unified frontend experience for all agent activities

---

## SYSTEM ARCHITECTURE OVERVIEW

### High-Level Architecture Diagram

```
┌─────────────────────────────────────────────────────────────────────────────────┐
│                           AGENT-FEED DUAL ARCHITECTURE                         │
│                                                                                 │
│  ┌─────────────────────────────────────────────────────────────────────────┐   │
│  │                         AGENTLINK FRONTEND                              │   │
│  │                      (Unified User Interface)                           │   │
│  │                                                                         │   │
│  │  ┌─────────────┐  ┌─────────────┐  ┌─────────────┐  ┌─────────────┐   │   │
│  │  │Development  │  │Production   │  │ Unified     │  │  Activity   │   │   │
│  │  │ Agent       │  │ Agent       │  │ Dashboard   │  │  Feed       │   │   │
│  │  │ Dashboard   │  │ Dashboard   │  │             │  │             │   │   │
│  │  └─────────────┘  └─────────────┘  └─────────────┘  └─────────────┘   │   │
│  └─────────────────────────────────────────────────────────────────────────┘   │
│                                    │                                           │
│                                    │ API Gateway (Port 3000)                  │
│                                    ▼                                           │
│  ┌─────────────────────────────────────────────────────────────────────────┐   │
│  │                        API ROUTING LAYER                               │   │
│  │                                                                         │   │
│  │     /api/dev/*  ──────────────────┐    ┌──────────────── /api/prod/*   │   │
│  │                                   │    │                               │   │
│  │     /api/handoff/* ───────────────┼────┼─────────────────────────────   │   │
│  └─────────────────────────────────────────────────────────────────────────┘   │
│                                     │    │                                     │
│                                     ▼    ▼                                     │
│  ┌─────────────────────────────────────────────────────────────────────────┐   │
│  │                    DEVELOPMENT INSTANCE                                │   │
│  │                    Claude Code DEV-001                                 │   │
│  │                    Ports: 8080-8089                                    │   │
│  │                                                                         │   │
│  │  ┌─────────────┐  ┌─────────────┐  ┌─────────────┐  ┌─────────────┐   │   │
│  │  │   Coder     │  │  Reviewer   │  │   Tester    │  │  DevOps     │   │   │
│  │  │   Agent     │  │   Agent     │  │   Agent     │  │   Agent     │   │   │
│  │  └─────────────┘  └─────────────┘  └─────────────┘  └─────────────┘   │   │
│  │                                                                         │   │
│  │  ┌─────────────┐  ┌─────────────┐  ┌─────────────┐  ┌─────────────┐   │   │
│  │  │ Frontend    │  │  Backend    │  │ Database    │  │Architecture │   │   │
│  │  │  Agent      │  │   Agent     │  │   Agent     │  │   Agent     │   │   │
│  │  └─────────────┘  └─────────────┘  └─────────────┘  └─────────────┘   │   │
│  │                                                                         │   │
│  │  ┌─────────────┐  ┌─────────────┐                                     │   │
│  │  │Integration  │  │Performance  │      ← 10 Development Agents         │   │
│  │  │   Agent     │  │   Agent     │                                     │   │
│  │  └─────────────┘  └─────────────┘                                     │   │
│  │                                                                         │   │
│  │  🔧 TOOLS: Read, Write, Edit, Bash, Glob, Grep, MultiEdit, LS         │   │
│  │  📁 WORKSPACE: /workspaces/agent-feed                                  │   │
│  │  🔐 AUTH: .claude-dev                                                  │   │
│  └─────────────────────────────────────────────────────────────────────────┘   │
│                                                                                 │
│  ┌─────────────────────────────────────────────────────────────────────────┐   │
│  │                     PRODUCTION INSTANCE                                │   │
│  │                     Claude Code PROD-001                               │   │
│  │                     Ports: 8090-8119                                   │   │
│  │                                                                         │   │
│  │  ┌─────────────┐  ┌─────────────┐  ┌─────────────┐  ┌─────────────┐   │   │
│  │  │Chief of     │  │Personal     │  │ Impact      │  │Goal         │   │   │
│  │  │Staff Agent  │  │Todos Agent  │  │Filter Agent │  │Analyst      │   │   │
│  │  └─────────────┘  └─────────────┘  └─────────────┘  └─────────────┘   │   │
│  │                                                                         │   │
│  │  ┌─────────────┐  ┌─────────────┐  ┌─────────────┐  ┌─────────────┐   │   │
│  │  │ Meeting     │  │ Follow-ups  │  │   Agent     │  │    Meta     │   │   │
│  │  │Prep Agent   │  │   Agent     │  │Feedback Agt │  │   Agent     │   │   │
│  │  └─────────────┘  └─────────────┘  └─────────────┘  └─────────────┘   │   │
│  │                                                                         │   │
│  │  ┌─────────────┐  ┌─────────────┐  ┌─────────────┐  ┌─────────────┐   │   │
│  │  │Financial    │  │Opportunity  │  │ Market      │  │Bull-Beaver  │   │   │
│  │  │Viability    │  │Scout Agent  │  │Research     │  │Bear Agent   │   │   │
│  │  └─────────────┘  └─────────────┘  └─────────────┘  └─────────────┘   │   │
│  │                                                                         │   │
│  │         ⋮ (Additional 17 Business Agents) ⋮                           │   │
│  │                                                                         │   │
│  │  🚫 NO CODING TOOLS: Limited to business operations only              │   │
│  │  📁 WORKSPACE: /workspace/business                                     │   │
│  │  🔐 AUTH: .claude-prod                                                 │   │
│  └─────────────────────────────────────────────────────────────────────────┘   │
│                                                                                 │
│  ┌─────────────────────────────────────────────────────────────────────────┐   │
│  │                        SHARED INFRASTRUCTURE                           │   │
│  │                                                                         │   │
│  │  ┌─────────────┐  ┌─────────────┐  ┌─────────────┐  ┌─────────────┐   │   │
│  │  │ PostgreSQL  │  │   Redis     │  │ Message     │  │Monitoring   │   │   │
│  │  │ Database    │  │   Cache     │  │  Queue      │  │  Stack      │   │   │
│  │  └─────────────┘  └─────────────┘  └─────────────┘  └─────────────┘   │   │
│  └─────────────────────────────────────────────────────────────────────────┘   │
└─────────────────────────────────────────────────────────────────────────────────┘
```

---

## DETAILED COMPONENT SPECIFICATIONS

### 1. DEVELOPMENT INSTANCE (Claude Code DEV-001)

#### Purpose and Scope
- **Primary Function**: Build and maintain the AgentLink system
- **Agent Types**: Development-focused agents (10 agents max)
- **Workspace**: Full access to codebase and infrastructure
- **Tools**: Complete Claude Code toolset including coding capabilities

#### Agent Configuration
```json
{
  "instance_id": "claude-code-dev-001",
  "environment": "development",
  "max_agents": 10,
  "port_range": "8080-8089",
  "workspace_root": "/workspaces/agent-feed",
  "auth_file": "/home/user/.claude-dev",
  "capabilities": {
    "file_operations": true,
    "code_execution": true,
    "system_commands": true,
    "network_access": true,
    "package_management": true
  },
  "agents": [
    {
      "name": "coder-agent",
      "type": "development",
      "tools": ["Read", "Write", "Edit", "MultiEdit", "Bash"],
      "specialization": "Core development and feature implementation"
    },
    {
      "name": "reviewer-agent",
      "type": "development",
      "tools": ["Read", "Grep", "Glob", "Edit"],
      "specialization": "Code review and quality assurance"
    },
    {
      "name": "tester-agent",
      "type": "development",
      "tools": ["Read", "Write", "Bash", "Grep"],
      "specialization": "Test creation and validation"
    },
    {
      "name": "frontend-agent",
      "type": "development",
      "tools": ["Read", "Write", "Edit", "MultiEdit"],
      "specialization": "React/TypeScript frontend development"
    },
    {
      "name": "backend-agent",
      "type": "development",
      "tools": ["Read", "Write", "Edit", "Bash"],
      "specialization": "API and server-side development"
    },
    {
      "name": "database-agent",
      "type": "development",
      "tools": ["Read", "Write", "Bash", "Grep"],
      "specialization": "Schema design and migrations"
    },
    {
      "name": "devops-agent",
      "type": "development",
      "tools": ["Read", "Write", "Bash", "Edit"],
      "specialization": "Infrastructure and deployment"
    },
    {
      "name": "architecture-agent",
      "type": "development",
      "tools": ["Read", "Write", "Edit", "Glob"],
      "specialization": "System design and documentation"
    },
    {
      "name": "integration-agent",
      "type": "development",
      "tools": ["Read", "Write", "Bash", "Grep"],
      "specialization": "Service integration and APIs"
    },
    {
      "name": "performance-agent",
      "type": "development",
      "tools": ["Read", "Bash", "Grep", "Edit"],
      "specialization": "Performance optimization and monitoring"
    }
  ]
}
```

### 2. PRODUCTION INSTANCE (Claude Code PROD-001)

#### Purpose and Scope
- **Primary Function**: Execute business operations and productivity workflows
- **Agent Types**: Business-focused agents (29 agents max)
- **Workspace**: Restricted to business data and configurations
- **Tools**: Limited toolset focused on business operations (NO coding capabilities)

#### Agent Configuration
```json
{
  "instance_id": "claude-code-prod-001",
  "environment": "production",
  "max_agents": 29,
  "port_range": "8090-8119",
  "workspace_root": "/workspace/business",
  "auth_file": "/home/user/.claude-prod",
  "capabilities": {
    "file_operations": true,
    "code_execution": false,
    "system_commands": false,
    "network_access": true,
    "package_management": false
  },
  "restricted_tools": ["Bash", "Edit", "Write"],
  "allowed_operations": [
    "data_analysis",
    "document_creation",
    "task_management",
    "communication",
    "planning",
    "reporting"
  ],
  "agents": [
    {
      "name": "chief-of-staff-agent",
      "type": "coordination",
      "priority": "P0",
      "specialization": "Strategic coordination and oversight"
    },
    {
      "name": "personal-todos-agent",
      "type": "productivity",
      "priority": "P1",
      "specialization": "Task and project management"
    },
    {
      "name": "impact-filter-agent",
      "type": "analysis",
      "priority": "P1",
      "specialization": "Business impact assessment"
    },
    {
      "name": "goal-analyst-agent",
      "type": "analysis",
      "priority": "P2",
      "specialization": "Goal setting and tracking"
    },
    {
      "name": "meeting-prep-agent",
      "type": "productivity",
      "priority": "P2",
      "specialization": "Meeting preparation and agenda"
    },
    {
      "name": "follow-ups-agent",
      "type": "productivity",
      "priority": "P2",
      "specialization": "Follow-up tracking and delegation"
    },
    {
      "name": "agent-feedback-agent",
      "type": "optimization",
      "priority": "P3",
      "specialization": "Agent performance feedback"
    },
    {
      "name": "meta-agent",
      "type": "coordination",
      "priority": "P3",
      "specialization": "System meta-analysis"
    },
    {
      "name": "financial-viability-analyzer-agent",
      "type": "analysis",
      "priority": "P2",
      "specialization": "Financial analysis and viability"
    },
    {
      "name": "opportunity-scout-agent",
      "type": "research",
      "priority": "P2",
      "specialization": "Opportunity identification"
    },
    {
      "name": "market-research-analyst-agent",
      "type": "research",
      "priority": "P2",
      "specialization": "Market analysis and trends"
    },
    {
      "name": "bull-beaver-bear-agent",
      "type": "framework",
      "priority": "P1",
      "specialization": "Experiment design framework"
    }
  ]
}
```

---

## AUTHENTICATION SEPARATION STRATEGY

### 1. Dual Authentication Configuration

#### Development Authentication (.claude-dev)
```bash
# /home/user/.claude-dev
{
  "api_key": "${CLAUDE_API_KEY_DEV}",
  "user_id": "dev-user-${USER_ID}",
  "workspace": "/workspaces/agent-feed",
  "environment": "development",
  "permissions": [
    "file_read",
    "file_write",
    "code_execution",
    "system_access",
    "network_access"
  ],
  "rate_limits": {
    "requests_per_minute": 200,
    "concurrent_agents": 10
  },
  "toolset": "full"
}
```

#### Production Authentication (.claude-prod)
```bash
# /home/user/.claude-prod
{
  "api_key": "${CLAUDE_API_KEY_PROD}",
  "user_id": "prod-user-${USER_ID}",
  "workspace": "/workspace/business",
  "environment": "production",
  "permissions": [
    "data_read",
    "data_write",
    "document_creation",
    "api_access"
  ],
  "rate_limits": {
    "requests_per_minute": 300,
    "concurrent_agents": 29
  },
  "toolset": "business_only",
  "restricted_operations": [
    "code_execution",
    "system_commands",
    "file_system_modification"
  ]
}
```

### 2. Environment-Specific Claude Code Startup

#### Development Instance Startup Script
```bash
#!/bin/bash
# scripts/start-dev-claude.sh

export CLAUDE_CONFIG_PATH="/home/user/.claude-dev"
export CLAUDE_WORKSPACE="/workspaces/agent-feed"
export CLAUDE_INSTANCE_ID="claude-code-dev-001"
export CLAUDE_PORT_RANGE="8080-8089"
export CLAUDE_MAX_AGENTS="10"
export CLAUDE_ENVIRONMENT="development"

# Start Claude Code with development configuration
claude-code \
  --config "${CLAUDE_CONFIG_PATH}" \
  --workspace "${CLAUDE_WORKSPACE}" \
  --port-range "${CLAUDE_PORT_RANGE}" \
  --max-agents "${CLAUDE_MAX_AGENTS}" \
  --environment "${CLAUDE_ENVIRONMENT}" \
  --enable-coding-tools \
  --enable-system-access \
  --log-level debug
```

#### Production Instance Startup Script
```bash
#!/bin/bash
# scripts/start-prod-claude.sh

export CLAUDE_CONFIG_PATH="/home/user/.claude-prod"
export CLAUDE_WORKSPACE="/workspace/business"
export CLAUDE_INSTANCE_ID="claude-code-prod-001"
export CLAUDE_PORT_RANGE="8090-8119"
export CLAUDE_MAX_AGENTS="29"
export CLAUDE_ENVIRONMENT="production"

# Start Claude Code with production configuration
claude-code \
  --config "${CLAUDE_CONFIG_PATH}" \
  --workspace "${CLAUDE_WORKSPACE}" \
  --port-range "${CLAUDE_PORT_RANGE}" \
  --max-agents "${CLAUDE_MAX_AGENTS}" \
  --environment "${CLAUDE_ENVIRONMENT}" \
  --disable-coding-tools \
  --disable-system-access \
  --business-mode \
  --log-level info
```

---

## API ROUTING AND ENDPOINT DESIGN

### 1. API Gateway Routing Configuration

#### Route Configuration
```typescript
// src/api/routes/dual-instance-router.ts

interface RouteConfig {
  development: {
    baseUrl: 'http://localhost:8080',
    pathPrefix: '/api/dev',
    instanceId: 'claude-code-dev-001'
  },
  production: {
    baseUrl: 'http://localhost:8090',
    pathPrefix: '/api/prod',
    instanceId: 'claude-code-prod-001'
  },
  handoff: {
    pathPrefix: '/api/handoff',
    coordinator: 'chief-of-staff-agent'
  }
}

class DualInstanceRouter {
  constructor() {
    this.setupDevelopmentRoutes();
    this.setupProductionRoutes();
    this.setupHandoffRoutes();
  }

  setupDevelopmentRoutes() {
    // Development agent routes
    app.use('/api/dev/agents', this.createAgentProxy('development'));
    app.use('/api/dev/tasks', this.createTaskProxy('development'));
    app.use('/api/dev/code', this.createCodeProxy('development'));
    app.use('/api/dev/build', this.createBuildProxy('development'));
    app.use('/api/dev/deploy', this.createDeployProxy('development'));
  }

  setupProductionRoutes() {
    // Production agent routes
    app.use('/api/prod/agents', this.createAgentProxy('production'));
    app.use('/api/prod/tasks', this.createTaskProxy('production'));
    app.use('/api/prod/business', this.createBusinessProxy('production'));
    app.use('/api/prod/analytics', this.createAnalyticsProxy('production'));
    app.use('/api/prod/coordination', this.createCoordinationProxy('production'));
  }

  setupHandoffRoutes() {
    // Cross-instance coordination
    app.post('/api/handoff/dev-to-prod', this.handleDevToProdHandoff);
    app.post('/api/handoff/prod-to-dev', this.handleProdToDevHandoff);
    app.get('/api/handoff/status/:workflowId', this.getHandoffStatus);
  }
}
```

### 2. Endpoint Specifications

#### Development Endpoints
```typescript
// Development-specific endpoints (coding and building)
interface DevelopmentEndpoints {
  // Agent management
  'GET /api/dev/agents': 'List development agents';
  'POST /api/dev/agents/:agentId/spawn': 'Spawn development agent';
  'GET /api/dev/agents/:agentId/status': 'Get agent status';
  
  // Code operations
  'POST /api/dev/code/read': 'Read code files';
  'POST /api/dev/code/write': 'Write code files';
  'POST /api/dev/code/edit': 'Edit code files';
  'POST /api/dev/code/review': 'Trigger code review';
  
  // Build and deployment
  'POST /api/dev/build/start': 'Start build process';
  'GET /api/dev/build/status': 'Get build status';
  'POST /api/dev/deploy/staging': 'Deploy to staging';
  'POST /api/dev/deploy/production': 'Deploy to production';
  
  // Testing
  'POST /api/dev/test/run': 'Execute tests';
  'GET /api/dev/test/results': 'Get test results';
  'POST /api/dev/test/coverage': 'Generate coverage report';
}
```

#### Production Endpoints
```typescript
// Production-specific endpoints (business operations)
interface ProductionEndpoints {
  // Agent management
  'GET /api/prod/agents': 'List production agents';
  'POST /api/prod/agents/:agentId/activate': 'Activate business agent';
  'GET /api/prod/agents/:agentId/metrics': 'Get agent metrics';
  
  // Business operations
  'POST /api/prod/tasks/create': 'Create business task';
  'GET /api/prod/tasks/priority/:priority': 'Get tasks by priority';
  'POST /api/prod/followups/create': 'Create follow-up';
  'GET /api/prod/followups/pending': 'Get pending follow-ups';
  
  // Analysis and insights
  'POST /api/prod/analysis/impact': 'Trigger impact analysis';
  'POST /api/prod/analysis/market': 'Trigger market research';
  'GET /api/prod/insights/summary': 'Get business insights';
  
  // Coordination
  'POST /api/prod/coordination/strategy': 'Submit strategic request';
  'GET /api/prod/coordination/status': 'Get coordination status';
  'POST /api/prod/coordination/escalate': 'Escalate to Chief of Staff';
}
```

#### Handoff Endpoints
```typescript
// Cross-instance workflow handoffs
interface HandoffEndpoints {
  // Development to Production handoff
  'POST /api/handoff/dev-to-prod': {
    body: {
      feature: string;
      deploymentStatus: 'completed' | 'staged';
      businessContext: string;
      nextSteps: string[];
    };
    response: {
      handoffId: string;
      assignedAgent: string;
      estimatedCompletion: Date;
    };
  };
  
  // Production to Development handoff
  'POST /api/handoff/prod-to-dev': {
    body: {
      requirement: string;
      businessJustification: string;
      priority: 'P0' | 'P1' | 'P2' | 'P3';
      timeline: string;
    };
    response: {
      handoffId: string;
      assignedDevAgent: string;
      estimatedDelivery: Date;
    };
  };
  
  // Handoff status tracking
  'GET /api/handoff/status/:workflowId': {
    response: {
      workflowId: string;
      status: 'pending' | 'in_progress' | 'completed' | 'failed';
      sourceInstance: 'development' | 'production';
      targetInstance: 'production' | 'development';
      progress: number; // 0-100
      currentStep: string;
      nextActions: string[];
    };
  };
}
```

---

## FRONTEND INTEGRATION STRATEGY

### 1. Unified Dashboard Design

#### Component Architecture
```typescript
// src/components/DualInstanceDashboard.tsx

interface DualInstanceDashboardProps {
  developmentAgents: Agent[];
  productionAgents: Agent[];
  activeWorkflows: Workflow[];
}

const DualInstanceDashboard: React.FC<DualInstanceDashboardProps> = ({
  developmentAgents,
  productionAgents,
  activeWorkflows
}) => {
  const [activeTab, setActiveTab] = useState<'development' | 'production' | 'unified'>('unified');

  return (
    <div className="dual-instance-dashboard">
      <div className="dashboard-header">
        <h1>Agent-Feed Command Center</h1>
        <div className="instance-selector">
          <button 
            className={`tab ${activeTab === 'development' ? 'active' : ''}`}
            onClick={() => setActiveTab('development')}
          >
            Development ({developmentAgents.filter(a => a.status === 'active').length}/10)
          </button>
          <button 
            className={`tab ${activeTab === 'production' ? 'active' : ''}`}
            onClick={() => setActiveTab('production')}
          >
            Production ({productionAgents.filter(a => a.status === 'active').length}/29)
          </button>
          <button 
            className={`tab ${activeTab === 'unified' ? 'active' : ''}`}
            onClick={() => setActiveTab('unified')}
          >
            Unified View
          </button>
        </div>
      </div>

      <div className="dashboard-content">
        {activeTab === 'development' && (
          <DevelopmentDashboard agents={developmentAgents} />
        )}
        {activeTab === 'production' && (
          <ProductionDashboard agents={productionAgents} />
        )}
        {activeTab === 'unified' && (
          <UnifiedDashboard 
            developmentAgents={developmentAgents}
            productionAgents={productionAgents}
            activeWorkflows={activeWorkflows}
          />
        )}
      </div>
    </div>
  );
};
```

### 2. Agent Activity Differentiation

#### Visual Design System
```css
/* Agent type differentiation */
.agent-card.development {
  border-left: 4px solid #3B82F6; /* Blue for development */
  background: linear-gradient(135deg, #EBF4FF 0%, #DBEAFE 100%);
}

.agent-card.production {
  border-left: 4px solid #10B981; /* Green for production */
  background: linear-gradient(135deg, #ECFDF5 0%, #D1FAE5 100%);
}

.agent-card.coordinating {
  border-left: 4px solid #F59E0B; /* Amber for cross-instance */
  background: linear-gradient(135deg, #FFFBEB 0%, #FEF3C7 100%);
}

/* Agent status indicators */
.agent-status.development-active::before {
  content: "🔧";
  margin-right: 8px;
}

.agent-status.production-active::before {
  content: "🏢";
  margin-right: 8px;
}

.agent-status.handoff::before {
  content: "🔄";
  margin-right: 8px;
}
```

### 3. Real-Time Activity Feed

#### Activity Stream Component
```typescript
// src/components/ActivityStream.tsx

interface ActivityStreamProps {
  activities: Activity[];
  filterByInstance?: 'development' | 'production' | 'all';
}

const ActivityStream: React.FC<ActivityStreamProps> = ({ 
  activities, 
  filterByInstance = 'all' 
}) => {
  const filteredActivities = activities.filter(activity => {
    if (filterByInstance === 'all') return true;
    return activity.instanceType === filterByInstance;
  });

  return (
    <div className="activity-stream">
      <div className="stream-header">
        <h3>Live Activity Feed</h3>
        <div className="activity-filters">
          <span className="filter development">🔧 Dev: {getDevActivityCount()}</span>
          <span className="filter production">🏢 Prod: {getProdActivityCount()}</span>
          <span className="filter handoff">🔄 Handoffs: {getHandoffCount()}</span>
        </div>
      </div>
      
      <div className="stream-content">
        {filteredActivities.map(activity => (
          <ActivityCard 
            key={activity.id} 
            activity={activity}
            instanceType={activity.instanceType}
          />
        ))}
      </div>
    </div>
  );
};

interface ActivityCardProps {
  activity: Activity;
  instanceType: 'development' | 'production';
}

const ActivityCard: React.FC<ActivityCardProps> = ({ activity, instanceType }) => {
  const getActivityIcon = () => {
    switch (activity.type) {
      case 'code_change': return '📝';
      case 'test_run': return '🧪';
      case 'deployment': return '🚀';
      case 'task_creation': return '📋';
      case 'analysis_complete': return '📊';
      case 'meeting_prep': return '📅';
      case 'handoff': return '🔄';
      default: return '🤖';
    }
  };

  return (
    <div className={`activity-card ${instanceType}`}>
      <div className="activity-header">
        <span className="activity-icon">{getActivityIcon()}</span>
        <span className="agent-name">{activity.agentName}</span>
        <span className="timestamp">{formatTimestamp(activity.timestamp)}</span>
      </div>
      <div className="activity-content">
        <h4>{activity.title}</h4>
        <p>{activity.description}</p>
        {activity.metadata && (
          <div className="activity-metadata">
            {Object.entries(activity.metadata).map(([key, value]) => (
              <span key={key} className="metadata-tag">
                {key}: {value}
              </span>
            ))}
          </div>
        )}
      </div>
    </div>
  );
};
```

---

## WORKFLOW HANDOFF MECHANISM

### 1. Development to Production Handoff

#### Use Case: Feature Deployment Complete
```typescript
// Scenario: Development agents complete a feature, hand off to production agents

interface DevToProdHandoff {
  trigger: 'deployment_complete' | 'feature_ready' | 'manual_handoff';
  
  workflow: {
    // 1. Development completion
    developmentPhase: {
      completedBy: 'deployment-agent';
      status: 'completed';
      artifacts: {
        deployedFeature: string;
        testResults: TestResults;
        documentationUpdates: string[];
      };
    };
    
    // 2. Handoff initiation
    handoffPhase: {
      initiatedBy: 'deployment-agent';
      targetInstance: 'production';
      coordinatedBy: 'chief-of-staff-agent';
      businessContext: string;
    };
    
    // 3. Production adoption
    productionPhase: {
      receivedBy: 'chief-of-staff-agent';
      assignedAgents: [
        'personal-todos-agent',    // Create tasks for feature adoption
        'impact-filter-agent',     // Analyze business impact
        'agent-feedback-agent'     // Gather user feedback
      ];
      expectedOutcomes: string[];
    };
  };
}

// Implementation
class DevToProdHandoffManager {
  async initiateHandoff(handoff: DevToProdHandoff): Promise<HandoffResult> {
    // 1. Validate development completion
    const devValidation = await this.validateDevelopmentComplete(handoff);
    if (!devValidation.isValid) {
      throw new Error(`Development validation failed: ${devValidation.issues.join(', ')}`);
    }
    
    // 2. Create handoff record
    const handoffRecord = await this.createHandoffRecord({
      id: generateId(),
      type: 'dev_to_prod',
      sourceInstance: 'development',
      targetInstance: 'production',
      status: 'initiated',
      metadata: handoff
    });
    
    // 3. Notify production Chief of Staff
    await this.notifyProductionChiefOfStaff({
      handoffId: handoffRecord.id,
      featureDetails: handoff.workflow.developmentPhase.artifacts,
      businessContext: handoff.workflow.handoffPhase.businessContext,
      priority: this.calculateHandoffPriority(handoff)
    });
    
    // 4. Create production tasks
    const productionTasks = await this.createProductionTasks({
      handoffId: handoffRecord.id,
      feature: handoff.workflow.developmentPhase.artifacts.deployedFeature,
      assignedAgents: handoff.workflow.productionPhase.assignedAgents
    });
    
    return {
      handoffId: handoffRecord.id,
      status: 'handed_off',
      productionTasks: productionTasks.map(t => t.id),
      estimatedCompletion: this.calculateEstimatedCompletion(productionTasks)
    };
  }
}
```

### 2. Production to Development Handoff

#### Use Case: Business Requirement Identification
```typescript
// Scenario: Production agents identify need for new feature/enhancement

interface ProdToDevHandoff {
  trigger: 'business_requirement' | 'optimization_needed' | 'user_feedback';
  
  workflow: {
    // 1. Business analysis
    analysisPhase: {
      completedBy: 'impact-filter-agent' | 'market-research-analyst-agent';
      findings: {
        businessNeed: string;
        impactScore: number;
        marketJustification: string;
        urgency: 'low' | 'medium' | 'high' | 'critical';
      };
    };
    
    // 2. Strategic coordination
    coordinationPhase: {
      reviewedBy: 'chief-of-staff-agent';
      priority: 'P0' | 'P1' | 'P2' | 'P3';
      resourceAllocation: {
        timelineWeeks: number;
        requiredAgents: string[];
        budget: number;
      };
    };
    
    // 3. Development assignment
    developmentPhase: {
      assignedTo: string[]; // Development agents
      requirements: {
        functionalSpecs: string[];
        technicalConstraints: string[];
        acceptanceCriteria: string[];
      };
      deliverables: string[];
    };
  };
}

// Implementation
class ProdToDevHandoffManager {
  async initiateHandoff(handoff: ProdToDevHandoff): Promise<HandoffResult> {
    // 1. Validate business justification
    const businessValidation = await this.validateBusinessJustification(handoff);
    if (businessValidation.score < 7) { // Minimum impact score
      return {
        status: 'rejected',
        reason: 'Insufficient business justification',
        score: businessValidation.score
      };
    }
    
    // 2. Get Chief of Staff approval
    const approval = await this.getChiefOfStaffApproval({
      businessNeed: handoff.workflow.analysisPhase.findings.businessNeed,
      impactScore: handoff.workflow.analysisPhase.findings.impactScore,
      urgency: handoff.workflow.analysisPhase.findings.urgency
    });
    
    if (!approval.approved) {
      return {
        status: 'rejected',
        reason: approval.reason
      };
    }
    
    // 3. Create development work items
    const workItems = await this.createDevelopmentWorkItems({
      priority: handoff.workflow.coordinationPhase.priority,
      requirements: handoff.workflow.developmentPhase.requirements,
      timeline: handoff.workflow.coordinationPhase.resourceAllocation.timelineWeeks
    });
    
    // 4. Assign development agents
    const assignments = await this.assignDevelopmentAgents({
      workItems: workItems,
      requiredAgents: handoff.workflow.coordinationPhase.resourceAllocation.requiredAgents
    });
    
    return {
      handoffId: generateId(),
      status: 'assigned',
      workItems: workItems.map(w => w.id),
      assignments: assignments,
      estimatedDelivery: this.calculateDeliveryDate(workItems)
    };
  }
}
```

---

## DEPLOYMENT AND MANAGEMENT APPROACH

### 1. Docker Compose Configuration

#### Dual Instance Container Setup
```yaml
# docker-compose.dual-claude.yml

version: '3.8'

services:
  # Development Claude Code Instance
  claude-code-dev:
    image: claude-code:latest
    container_name: claude-dev-001
    environment:
      - CLAUDE_CONFIG_PATH=/config/.claude-dev
      - CLAUDE_WORKSPACE=/workspace/agent-feed
      - CLAUDE_INSTANCE_ID=claude-code-dev-001
      - CLAUDE_PORT_RANGE=8080-8089
      - CLAUDE_MAX_AGENTS=10
      - CLAUDE_ENVIRONMENT=development
      - CLAUDE_ENABLE_CODING_TOOLS=true
      - CLAUDE_ENABLE_SYSTEM_ACCESS=true
    ports:
      - "8080-8089:8080-8089"
    volumes:
      - ./config/.claude-dev:/config/.claude-dev:ro
      - ./:/workspace/agent-feed
      - dev_agent_memory:/memory
      - dev_agent_logs:/logs
    networks:
      - agent_network
    restart: unless-stopped
    healthcheck:
      test: ["CMD", "curl", "-f", "http://localhost:8080/health"]
      interval: 30s
      timeout: 10s
      retries: 3

  # Production Claude Code Instance  
  claude-code-prod:
    image: claude-code:latest
    container_name: claude-prod-001
    environment:
      - CLAUDE_CONFIG_PATH=/config/.claude-prod
      - CLAUDE_WORKSPACE=/workspace/business
      - CLAUDE_INSTANCE_ID=claude-code-prod-001
      - CLAUDE_PORT_RANGE=8090-8119
      - CLAUDE_MAX_AGENTS=29
      - CLAUDE_ENVIRONMENT=production
      - CLAUDE_ENABLE_CODING_TOOLS=false
      - CLAUDE_BUSINESS_MODE=true
    ports:
      - "8090-8119:8090-8119"
    volumes:
      - ./config/.claude-prod:/config/.claude-prod:ro
      - ./workspace/business:/workspace/business
      - prod_agent_memory:/memory
      - prod_agent_logs:/logs
    networks:
      - agent_network
    restart: unless-stopped
    healthcheck:
      test: ["CMD", "curl", "-f", "http://localhost:8090/health"]
      interval: 30s
      timeout: 10s
      retries: 3

  # AgentLink Frontend (Unified Interface)
  agentlink-frontend:
    build: ./frontend
    container_name: agentlink-ui
    environment:
      - VITE_API_BASE_URL=http://localhost:3000
      - VITE_DEV_CLAUDE_URL=http://claude-code-dev:8080
      - VITE_PROD_CLAUDE_URL=http://claude-code-prod:8090
    ports:
      - "3001:3000"
    depends_on:
      - agentlink-api
      - claude-code-dev
      - claude-code-prod
    networks:
      - agent_network

  # AgentLink API Gateway
  agentlink-api:
    build: ./api
    container_name: agentlink-gateway
    environment:
      - DATABASE_URL=postgresql://postgres:password@database:5432/agent_feed
      - REDIS_URL=redis://redis:6379
      - DEV_CLAUDE_URL=http://claude-code-dev:8080
      - PROD_CLAUDE_URL=http://claude-code-prod:8090
    ports:
      - "3000:3000"
    depends_on:
      - database
      - redis
    networks:
      - agent_network

  # Shared Infrastructure
  database:
    image: postgres:15
    container_name: agentfeed-db
    environment:
      - POSTGRES_DB=agent_feed
      - POSTGRES_USER=postgres
      - POSTGRES_PASSWORD=password
    volumes:
      - postgres_data:/var/lib/postgresql/data
      - ./database/dual-instance-schema.sql:/docker-entrypoint-initdb.d/init.sql
    ports:
      - "5432:5432"
    networks:
      - agent_network

  redis:
    image: redis:7-alpine
    container_name: agentfeed-redis
    volumes:
      - redis_data:/data
    ports:
      - "6379:6379"
    networks:
      - agent_network

volumes:
  postgres_data:
  redis_data:
  dev_agent_memory:
  dev_agent_logs:
  prod_agent_memory:
  prod_agent_logs:

networks:
  agent_network:
    driver: bridge
```

### 2. Management Scripts

#### Instance Management Script
```bash
#!/bin/bash
# scripts/manage-dual-claude.sh

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
PROJECT_ROOT="$(dirname "$SCRIPT_DIR")"

# Configuration
DEV_CONFIG_PATH="$PROJECT_ROOT/config/.claude-dev"
PROD_CONFIG_PATH="$PROJECT_ROOT/config/.claude-prod"
DOCKER_COMPOSE_FILE="$PROJECT_ROOT/docker-compose.dual-claude.yml"

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

usage() {
    echo "Usage: $0 {start|stop|restart|status|logs|health} [dev|prod|all]"
    echo ""
    echo "Commands:"
    echo "  start    - Start Claude Code instances"
    echo "  stop     - Stop Claude Code instances"
    echo "  restart  - Restart Claude Code instances"
    echo "  status   - Show instance status"
    echo "  logs     - Show instance logs"
    echo "  health   - Check instance health"
    echo ""
    echo "Instances:"
    echo "  dev      - Development instance only"
    echo "  prod     - Production instance only"
    echo "  all      - Both instances (default)"
}

check_prerequisites() {
    if [[ ! -f "$DEV_CONFIG_PATH" ]]; then
        echo -e "${RED}Error: Development config not found at $DEV_CONFIG_PATH${NC}"
        return 1
    fi
    
    if [[ ! -f "$PROD_CONFIG_PATH" ]]; then
        echo -e "${RED}Error: Production config not found at $PROD_CONFIG_PATH${NC}"
        return 1
    fi
    
    if ! command -v docker-compose &> /dev/null; then
        echo -e "${RED}Error: docker-compose not found${NC}"
        return 1
    fi
    
    return 0
}

start_instances() {
    local instance="${1:-all}"
    
    case "$instance" in
        "dev")
            echo -e "${BLUE}Starting development Claude Code instance...${NC}"
            docker-compose -f "$DOCKER_COMPOSE_FILE" up -d claude-code-dev
            ;;
        "prod")
            echo -e "${BLUE}Starting production Claude Code instance...${NC}"
            docker-compose -f "$DOCKER_COMPOSE_FILE" up -d claude-code-prod
            ;;
        "all")
            echo -e "${BLUE}Starting all Claude Code instances...${NC}"
            docker-compose -f "$DOCKER_COMPOSE_FILE" up -d claude-code-dev claude-code-prod
            ;;
        *)
            echo -e "${RED}Invalid instance: $instance${NC}"
            usage
            return 1
            ;;
    esac
    
    echo -e "${GREEN}Instance(s) started successfully${NC}"
}

stop_instances() {
    local instance="${1:-all}"
    
    case "$instance" in
        "dev")
            echo -e "${YELLOW}Stopping development Claude Code instance...${NC}"
            docker-compose -f "$DOCKER_COMPOSE_FILE" stop claude-code-dev
            ;;
        "prod")
            echo -e "${YELLOW}Stopping production Claude Code instance...${NC}"
            docker-compose -f "$DOCKER_COMPOSE_FILE" stop claude-code-prod
            ;;
        "all")
            echo -e "${YELLOW}Stopping all Claude Code instances...${NC}"
            docker-compose -f "$DOCKER_COMPOSE_FILE" stop claude-code-dev claude-code-prod
            ;;
        *)
            echo -e "${RED}Invalid instance: $instance${NC}"
            usage
            return 1
            ;;
    esac
    
    echo -e "${GREEN}Instance(s) stopped successfully${NC}"
}

show_status() {
    echo -e "${BLUE}Claude Code Instance Status:${NC}"
    echo ""
    
    # Development instance
    if docker-compose -f "$DOCKER_COMPOSE_FILE" ps claude-code-dev | grep -q "Up"; then
        echo -e "Development Instance: ${GREEN}Running${NC}"
        echo "  Container: claude-dev-001"
        echo "  Ports: 8080-8089"
        echo "  Max Agents: 10"
    else
        echo -e "Development Instance: ${RED}Stopped${NC}"
    fi
    
    echo ""
    
    # Production instance
    if docker-compose -f "$DOCKER_COMPOSE_FILE" ps claude-code-prod | grep -q "Up"; then
        echo -e "Production Instance: ${GREEN}Running${NC}"
        echo "  Container: claude-prod-001"
        echo "  Ports: 8090-8119"
        echo "  Max Agents: 29"
    else
        echo -e "Production Instance: ${RED}Stopped${NC}"
    fi
}

show_logs() {
    local instance="${1:-all}"
    
    case "$instance" in
        "dev")
            docker-compose -f "$DOCKER_COMPOSE_FILE" logs -f claude-code-dev
            ;;
        "prod")
            docker-compose -f "$DOCKER_COMPOSE_FILE" logs -f claude-code-prod
            ;;
        "all")
            docker-compose -f "$DOCKER_COMPOSE_FILE" logs -f claude-code-dev claude-code-prod
            ;;
        *)
            echo -e "${RED}Invalid instance: $instance${NC}"
            usage
            return 1
            ;;
    esac
}

check_health() {
    echo -e "${BLUE}Checking Claude Code instance health...${NC}"
    echo ""
    
    # Development instance health
    if curl -sf http://localhost:8080/health > /dev/null 2>&1; then
        echo -e "Development Instance Health: ${GREEN}Healthy${NC}"
    else
        echo -e "Development Instance Health: ${RED}Unhealthy${NC}"
    fi
    
    # Production instance health
    if curl -sf http://localhost:8090/health > /dev/null 2>&1; then
        echo -e "Production Instance Health: ${GREEN}Healthy${NC}"
    else
        echo -e "Production Instance Health: ${RED}Unhealthy${NC}"
    fi
}

# Main script logic
main() {
    if ! check_prerequisites; then
        exit 1
    fi
    
    local command="$1"
    local instance="$2"
    
    case "$command" in
        "start")
            start_instances "$instance"
            ;;
        "stop")
            stop_instances "$instance"
            ;;
        "restart")
            stop_instances "$instance"
            sleep 2
            start_instances "$instance"
            ;;
        "status")
            show_status
            ;;
        "logs")
            show_logs "$instance"
            ;;
        "health")
            check_health
            ;;
        *)
            usage
            exit 1
            ;;
    esac
}

main "$@"
```

---

## DATABASE SEPARATION STRATEGY

### 1. Logical Database Separation

#### Schema Design
```sql
-- Database: agent_feed
-- Separation via table prefixes and user permissions

-- Development tables (dev_*)
CREATE TABLE dev_agents (
    id VARCHAR PRIMARY KEY,
    name VARCHAR UNIQUE NOT NULL,
    instance_id VARCHAR DEFAULT 'claude-code-dev-001',
    agent_type VARCHAR DEFAULT 'development',
    status VARCHAR DEFAULT 'inactive',
    created_at TIMESTAMP DEFAULT NOW()
);

CREATE TABLE dev_tasks (
    id VARCHAR PRIMARY KEY,
    agent_id VARCHAR REFERENCES dev_agents(id),
    title VARCHAR NOT NULL,
    description TEXT,
    status VARCHAR DEFAULT 'pending',
    created_at TIMESTAMP DEFAULT NOW()
);

CREATE TABLE dev_code_changes (
    id VARCHAR PRIMARY KEY,
    agent_id VARCHAR REFERENCES dev_agents(id),
    file_path VARCHAR NOT NULL,
    change_type VARCHAR NOT NULL, -- create, update, delete
    content_hash VARCHAR,
    created_at TIMESTAMP DEFAULT NOW()
);

-- Production tables (prod_*)
CREATE TABLE prod_agents (
    id VARCHAR PRIMARY KEY,
    name VARCHAR UNIQUE NOT NULL,
    instance_id VARCHAR DEFAULT 'claude-code-prod-001',
    agent_type VARCHAR DEFAULT 'business',
    status VARCHAR DEFAULT 'inactive',
    created_at TIMESTAMP DEFAULT NOW()
);

CREATE TABLE prod_tasks (
    id VARCHAR PRIMARY KEY,
    agent_id VARCHAR REFERENCES prod_agents(id),
    title VARCHAR NOT NULL,
    description TEXT,
    priority VARCHAR, -- P0, P1, P2, P3
    impact_score INTEGER,
    status VARCHAR DEFAULT 'pending',
    created_at TIMESTAMP DEFAULT NOW()
);

CREATE TABLE prod_business_data (
    id VARCHAR PRIMARY KEY,
    agent_id VARCHAR REFERENCES prod_agents(id),
    data_type VARCHAR NOT NULL, -- memory, analysis, followup
    content JSONB NOT NULL,
    created_at TIMESTAMP DEFAULT NOW()
);

-- Cross-instance tables (shared_*)
CREATE TABLE shared_handoffs (
    id VARCHAR PRIMARY KEY,
    source_instance VARCHAR NOT NULL, -- development, production
    target_instance VARCHAR NOT NULL,
    source_agent_id VARCHAR,
    target_agent_id VARCHAR,
    handoff_type VARCHAR NOT NULL,
    status VARCHAR DEFAULT 'pending',
    metadata JSONB,
    created_at TIMESTAMP DEFAULT NOW()
);

CREATE TABLE shared_posts (
    id VARCHAR PRIMARY KEY,
    title VARCHAR NOT NULL,
    content TEXT NOT NULL,
    author_id VARCHAR NOT NULL,
    agent_id VARCHAR, -- References either dev_agents or prod_agents
    instance_source VARCHAR NOT NULL, -- development, production
    is_agent_response BOOLEAN DEFAULT FALSE,
    handoff_id VARCHAR REFERENCES shared_handoffs(id),
    created_at TIMESTAMP DEFAULT NOW()
);

-- Permissions
CREATE ROLE claude_dev_user;
GRANT SELECT, INSERT, UPDATE, DELETE ON dev_* TO claude_dev_user;
GRANT SELECT ON shared_* TO claude_dev_user;
GRANT INSERT ON shared_handoffs TO claude_dev_user;
GRANT INSERT ON shared_posts TO claude_dev_user;

CREATE ROLE claude_prod_user;
GRANT SELECT, INSERT, UPDATE, DELETE ON prod_* TO claude_prod_user;
GRANT SELECT ON shared_* TO claude_prod_user;
GRANT INSERT ON shared_handoffs TO claude_prod_user;
GRANT INSERT ON shared_posts TO claude_prod_user;
```

### 2. Data Access Layer

#### Instance-Specific Data Access Objects
```typescript
// src/data/DevelopmentDAO.ts

class DevelopmentDAO {
  private db: DatabaseConnection;
  
  constructor(db: DatabaseConnection) {
    this.db = db;
  }
  
  async createAgent(agent: CreateDevAgentRequest): Promise<DevAgent> {
    const result = await this.db.query(`
      INSERT INTO dev_agents (id, name, agent_type, status)
      VALUES ($1, $2, $3, $4)
      RETURNING *
    `, [agent.id, agent.name, 'development', 'inactive']);
    
    return result.rows[0];
  }
  
  async getActiveAgents(): Promise<DevAgent[]> {
    const result = await this.db.query(`
      SELECT * FROM dev_agents 
      WHERE status = 'active' 
      ORDER BY created_at DESC
    `);
    
    return result.rows;
  }
  
  async createTask(task: CreateDevTaskRequest): Promise<DevTask> {
    const result = await this.db.query(`
      INSERT INTO dev_tasks (id, agent_id, title, description, status)
      VALUES ($1, $2, $3, $4, $5)
      RETURNING *
    `, [task.id, task.agentId, task.title, task.description, 'pending']);
    
    return result.rows[0];
  }
  
  async recordCodeChange(change: CodeChangeRequest): Promise<CodeChange> {
    const result = await this.db.query(`
      INSERT INTO dev_code_changes (id, agent_id, file_path, change_type, content_hash)
      VALUES ($1, $2, $3, $4, $5)
      RETURNING *
    `, [change.id, change.agentId, change.filePath, change.changeType, change.contentHash]);
    
    return result.rows[0];
  }
}

// src/data/ProductionDAO.ts

class ProductionDAO {
  private db: DatabaseConnection;
  
  constructor(db: DatabaseConnection) {
    this.db = db;
  }
  
  async createAgent(agent: CreateProdAgentRequest): Promise<ProdAgent> {
    const result = await this.db.query(`
      INSERT INTO prod_agents (id, name, agent_type, status)
      VALUES ($1, $2, $3, $4)
      RETURNING *
    `, [agent.id, agent.name, 'business', 'inactive']);
    
    return result.rows[0];
  }
  
  async getActiveAgents(): Promise<ProdAgent[]> {
    const result = await this.db.query(`
      SELECT * FROM prod_agents 
      WHERE status = 'active' 
      ORDER BY created_at DESC
    `);
    
    return result.rows;
  }
  
  async createTask(task: CreateProdTaskRequest): Promise<ProdTask> {
    const result = await this.db.query(`
      INSERT INTO prod_tasks (id, agent_id, title, description, priority, impact_score, status)
      VALUES ($1, $2, $3, $4, $5, $6, $7)
      RETURNING *
    `, [task.id, task.agentId, task.title, task.description, task.priority, task.impactScore, 'pending']);
    
    return result.rows[0];
  }
  
  async storeBusinessData(data: BusinessDataRequest): Promise<BusinessData> {
    const result = await this.db.query(`
      INSERT INTO prod_business_data (id, agent_id, data_type, content)
      VALUES ($1, $2, $3, $4)
      RETURNING *
    `, [data.id, data.agentId, data.dataType, JSON.stringify(data.content)]);
    
    return result.rows[0];
  }
}

// src/data/SharedDAO.ts

class SharedDAO {
  private db: DatabaseConnection;
  
  constructor(db: DatabaseConnection) {
    this.db = db;
  }
  
  async createHandoff(handoff: CreateHandoffRequest): Promise<Handoff> {
    const result = await this.db.query(`
      INSERT INTO shared_handoffs (id, source_instance, target_instance, source_agent_id, target_agent_id, handoff_type, metadata)
      VALUES ($1, $2, $3, $4, $5, $6, $7)
      RETURNING *
    `, [
      handoff.id, 
      handoff.sourceInstance, 
      handoff.targetInstance, 
      handoff.sourceAgentId, 
      handoff.targetAgentId, 
      handoff.handoffType, 
      JSON.stringify(handoff.metadata)
    ]);
    
    return result.rows[0];
  }
  
  async createPost(post: CreateSharedPostRequest): Promise<SharedPost> {
    const result = await this.db.query(`
      INSERT INTO shared_posts (id, title, content, author_id, agent_id, instance_source, is_agent_response, handoff_id)
      VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
      RETURNING *
    `, [
      post.id, 
      post.title, 
      post.content, 
      post.authorId, 
      post.agentId, 
      post.instanceSource, 
      post.isAgentResponse, 
      post.handoffId
    ]);
    
    return result.rows[0];
  }
  
  async getHandoffStatus(handoffId: string): Promise<HandoffStatus> {
    const result = await this.db.query(`
      SELECT h.*, 
             COUNT(p.id) as related_posts
      FROM shared_handoffs h
      LEFT JOIN shared_posts p ON p.handoff_id = h.id
      WHERE h.id = $1
      GROUP BY h.id
    `, [handoffId]);
    
    return result.rows[0];
  }
}
```

---

## IMPLEMENTATION TIMELINE

### Phase 1: Foundation Setup (Week 1-2)

#### Week 1: Infrastructure Setup
- **Day 1-2**: Create dual authentication configuration
  - Set up `.claude-dev` and `.claude-prod` files
  - Configure environment separation
  - Test authentication isolation

- **Day 3-4**: Database schema implementation
  - Create logical database separation
  - Implement dev_*, prod_*, shared_* tables
  - Set up user permissions and access controls

- **Day 5-7**: Docker container configuration
  - Build dual Claude Code container setup
  - Configure port ranges and resource allocation
  - Implement health checks and monitoring

#### Week 2: Basic API Integration
- **Day 8-10**: API routing layer
  - Implement dual instance router
  - Create development and production endpoints
  - Set up basic handoff mechanisms

- **Day 11-12**: Frontend dashboard updates
  - Add dual instance visualization
  - Implement instance switching UI
  - Create agent activity differentiation

- **Day 13-14**: Integration testing
  - Test dual instance startup and communication
  - Validate API routing and database separation
  - Verify authentication isolation

### Phase 2: Agent Implementation (Week 3-4)

#### Week 3: Development Instance Agents
- **Day 15-17**: Core development agents
  - Implement coder, reviewer, tester agents
  - Configure development toolset access
  - Test code manipulation capabilities

- **Day 18-19**: Specialized development agents
  - Add frontend, backend, database agents
  - Implement DevOps and architecture agents
  - Configure agent coordination

- **Day 20-21**: Development workflow testing
  - Test complete development workflows
  - Validate agent handoffs and coordination
  - Performance optimization

#### Week 4: Production Instance Agents
- **Day 22-24**: Core business agents
  - Implement Chief of Staff coordination
  - Add personal todos and impact filter agents
  - Configure business operation restrictions

- **Day 25-26**: Strategic agents
  - Add goal analyst and meeting prep agents
  - Implement follow-ups and feedback agents
  - Configure business data handling

- **Day 27-28**: Business workflow testing
  - Test complete business workflows
  - Validate strategic coordination
  - Cross-instance handoff testing

### Phase 3: Advanced Features (Week 5-6)

#### Week 5: Handoff Mechanisms
- **Day 29-31**: Development to production handoffs
  - Implement deployment completion triggers
  - Create business adoption workflows
  - Test feature delivery handoffs

- **Day 32-33**: Production to development handoffs
  - Implement requirement identification
  - Create strategic request routing
  - Test business-driven development

- **Day 34-35**: Handoff optimization
  - Performance tuning and error handling
  - Advanced workflow coordination
  - Comprehensive testing

#### Week 6: Production Readiness
- **Day 36-38**: Monitoring and observability
  - Implement comprehensive logging
  - Add performance metrics
  - Create alerting and health checks

- **Day 39-40**: Security and compliance
  - Security audit and hardening
  - Access control validation
  - Compliance documentation

- **Day 41-42**: Deployment and documentation
  - Production deployment preparation
  - Complete system documentation
  - User training materials

---

## CONCLUSION

This dual Claude Code instance architecture provides:

1. **Clear Separation**: Development and production environments with distinct capabilities and restrictions
2. **Unified Experience**: Single frontend interface showing activities from both instances
3. **Seamless Handoffs**: Structured workflow transitions between development and business operations
4. **Scalable Design**: Independent scaling and resource allocation for each instance
5. **Secure Isolation**: Separate authentication, configuration, and access controls

The architecture maintains the benefits of both environments while ensuring they work together as a cohesive system for building and operating the Agent-Feed platform.

**Next Steps**: Review architecture design, approve implementation timeline, and begin Phase 1 foundation setup.