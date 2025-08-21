# SPARC Architecture: Dual Claude Code System Design

**Phase**: Architecture Design  
**Date**: 2025-08-20  
**Status**: Design Complete

## 🏗️ System Architecture Overview

```
┌─────────────────────────────────────────────────────────────┐
│                    VPS Environment                          │
├─────────────────────────────────────────────────────────────┤
│  ┌─────────────────┐    ┌─────────────────┐                │
│  │ Development     │    │ Production      │                │
│  │ Claude Instance │◄──►│ Claude Instance │                │
│  │ (Port 3001)     │    │ (Port 3000)     │                │
│  │                 │    │                 │                │
│  │ .claude/dev/    │    │ .claude/prod/   │                │
│  │ src/            │    │ agent_workspace/│                │
│  │ frontend/       │    │ @agents/        │                │
│  └─────────────────┘    └─────────────────┘                │
│           │                       │                         │
│           └───────────┬───────────┘                         │
│                       │                                     │
│           ┌─────────────────────┐                          │
│           │ Dual Instance       │                          │
│           │ Dashboard           │                          │
│           │ (Port 3002)         │                          │
│           │                     │                          │
│           │ - Status Monitor    │                          │
│           │ - Communication Log │                          │
│           │ - Agent Manager     │                          │
│           │ - File Viewer       │                          │
│           └─────────────────────┘                          │
└─────────────────────────────────────────────────────────────┘
```

## 🔧 Component Architecture

### 1. Development Instance
```
Development Claude Code Instance
├── Process: claude-dev (PID isolation)
├── Config: .claude/dev/
├── Workspace: /workspaces/agent-feed/
├── Purpose: Terminal-based development assistance
├── Permissions: --dangerous-skip-permissions
└── Communication: → Production (auto handoff)
```

### 2. Production Instance
```
Production Claude Code Instance
├── Process: claude-prod (PID isolation)
├── Config: .claude/prod/
├── Workspace: /workspaces/agent-feed/agent_workspace/
├── Purpose: Autonomous agent orchestration
├── Permissions: --dangerous-skip-permissions (sandboxed)
└── Communication: → Development (user confirmation required)
```

### 3. Communication Layer
```
Inter-Instance Communication
├── Protocol: JSON message queue
├── Transport: File-based queue + WebSocket fallback
├── Security: Permission gates + audit logging
├── Reliability: Timeout + retry logic
└── Monitoring: Real-time message tracking
```

## 📁 Workspace Isolation Design

### Development Workspace
```
/workspaces/agent-feed/
├── .claude/dev/              # Dev instance config
│   ├── config.json          # Dev-specific settings
│   ├── memory/              # Dev instance memory
│   └── logs/                # Dev instance logs
├── src/                     # Development codebase
├── frontend/                # Agent Link interface
├── tests/                   # Test suites
└── docs/                    # Documentation
```

### Production Workspace
```
/workspaces/agent-feed/agent_workspace/
├── .claude/prod/            # Prod instance config
│   ├── config.json         # Prod-specific settings
│   ├── memory/             # Prod instance memory
│   └── logs/               # Prod instance logs
├── agents/                 # Agent execution environment
│   ├── customer-service/   # Individual agent workspaces
│   ├── content-creator/
│   └── data-analyst/
├── shared/                 # User-accessible files
│   ├── reports/           # Generated .md files
│   ├── dashboards/        # Dynamic .html pages
│   └── exports/           # Agent outputs
├── data/                  # Persistent agent data
│   ├── databases/         # Agent databases
│   ├── state/            # Agent state files
│   └── cache/            # Temporary data
└── logs/                 # Agent execution logs
    ├── agent-logs/       # Individual agent logs
    ├── system-logs/      # System-level logs
    └── audit-logs/       # Security audit logs
```

### Agent Definitions
```
/@agents/
├── business/              # Business agents
│   ├── customer-service.json
│   ├── content-creator.json
│   └── data-analyst.json
├── personal/              # Personal agents
│   ├── assistant.json
│   └── scheduler.json
└── shared/                # Utility agents
    └── file-manager.json
```

## 🔐 Security Architecture

### Permission Model
```
┌─────────────────┐         ┌─────────────────┐
│ Development     │         │ Production      │
│ Instance        │         │ Instance        │
│                 │         │                 │
│ Permissions:    │         │ Permissions:    │
│ ✓ Full system   │         │ ✓ agent_workspace/│
│ ✓ Code changes  │         │ ✓ @agents/       │
│ ✓ Config dev    │         │ ✓ Config prod    │
│ ✗ Config prod   │         │ ✗ src/           │
│ ✗ agent_workspace│        │ ✗ frontend/      │
│   (read-only)   │         │ ✗ Config dev     │
└─────────────────┘         └─────────────────┘
```

### Communication Security
```
Dev → Prod (Auto Handoff)
├── Message: {"type": "handoff", "task": "...", "context": "..."}
├── Validation: Schema validation, rate limiting
├── Logging: Full audit trail
└── Execution: Immediate (no confirmation)

Prod → Dev (Gated Request)
├── Message: {"type": "request", "action": "...", "reason": "..."}
├── Gate: User confirmation dialog
├── Timeout: 30 seconds for user response
└── Execution: Only after explicit approval
```

## 🔄 Process Management

### Process Architecture
```bash
# PM2 Configuration
ecosystem.config.js:
{
  apps: [
    {
      name: "claude-dev",
      script: "claude",
      args: "--dangerous-skip-permissions --config .claude/dev/",
      cwd: "/workspaces/agent-feed/",
      instances: 1,
      env: {
        CLAUDE_INSTANCE: "development",
        PORT: 3001
      }
    },
    {
      name: "claude-prod",
      script: "claude", 
      args: "--dangerous-skip-permissions --config .claude/prod/",
      cwd: "/workspaces/agent-feed/agent_workspace/",
      instances: 1,
      env: {
        CLAUDE_INSTANCE: "production",
        PORT: 3000
      }
    },
    {
      name: "dual-dashboard",
      script: "node",
      args: "dual-instance-dashboard.js",
      cwd: "/workspaces/agent-feed/",
      instances: 1,
      env: {
        PORT: 3002
      }
    }
  ]
}
```

### Health Monitoring
```javascript
// Health Check System
const healthChecks = {
  devInstance: {
    endpoint: "http://localhost:3001/health",
    interval: 30000,
    timeout: 5000
  },
  prodInstance: {
    endpoint: "http://localhost:3000/health", 
    interval: 30000,
    timeout: 5000
  },
  communication: {
    check: () => testMessageQueue(),
    interval: 60000
  }
};
```

## 📨 Communication Protocol Design

### Message Schema
```json
{
  "id": "uuid-v4",
  "timestamp": "2025-08-20T20:00:00Z",
  "source": "development|production",
  "target": "development|production", 
  "type": "handoff|request|response|status",
  "priority": "low|medium|high|critical",
  "payload": {
    "action": "string",
    "data": "object",
    "context": "string"
  },
  "security": {
    "requiresConfirmation": "boolean",
    "permissions": ["array"],
    "auditLevel": "basic|detailed|full"
  }
}
```

### Queue Implementation
```javascript
// File-based message queue
class DualInstanceMessageQueue {
  constructor() {
    this.devToProduct = '/tmp/claude-dev-to-prod.queue';
    this.prodToDev = '/tmp/claude-prod-to-dev.queue';
    this.processing = new Set();
  }
  
  async sendMessage(source, target, message) {
    const queueFile = this.getQueueFile(source, target);
    await this.writeMessage(queueFile, message);
    await this.notifyTarget(target);
  }
  
  async processQueue(instanceType) {
    const queueFile = this.getQueueFile(null, instanceType);
    const messages = await this.readMessages(queueFile);
    
    for (const message of messages) {
      if (await this.requiresConfirmation(message)) {
        await this.requestUserConfirmation(message);
      }
      await this.executeMessage(message);
    }
  }
}
```

## 🎯 Agent Execution Architecture

### Agent Definition Schema
```json
{
  "id": "customer-service-v1",
  "name": "Customer Service Agent",
  "type": "business",
  "version": "1.0.0",
  "description": "Handles customer inquiries and support tickets",
  "capabilities": [
    "ticket-management",
    "customer-communication", 
    "knowledge-base-search"
  ],
  "workspace": {
    "directory": "agent_workspace/agents/customer-service/",
    "storage": "1GB",
    "databases": ["tickets.db", "customers.db"],
    "permissions": ["read-shared", "write-logs", "execute-queries"]
  },
  "execution": {
    "schedule": "24/7",
    "resources": {
      "memory": "512MB",
      "cpu": "0.5 cores"
    },
    "timeout": 300000,
    "retries": 3
  },
  "communication": {
    "inputs": ["email", "chat", "api"],
    "outputs": ["response", "ticket-update", "escalation"],
    "protocols": ["http", "websocket", "file"]
  },
  "monitoring": {
    "metrics": ["response-time", "accuracy", "satisfaction"],
    "alerts": ["error-rate", "timeout", "resource-limit"],
    "logging": "detailed"
  }
}
```

### Agent Lifecycle Management
```javascript
class AgentManager {
  async loadAgent(agentDefinition) {
    const agent = new Agent(agentDefinition);
    await agent.initialize();
    await agent.allocateResources();
    await agent.loadState();
    return agent;
  }
  
  async executeAgent(agent, task) {
    const context = await this.buildContext(agent, task);
    const result = await agent.execute(context);
    await agent.saveState();
    await this.logExecution(agent, task, result);
    return result;
  }
  
  async monitorAgent(agent) {
    const metrics = await agent.getMetrics();
    await this.updateDashboard(metrics);
    await this.checkAlerts(metrics);
  }
}
```

## 📊 Monitoring & Observability

### Dashboard Architecture
```
Dual Instance Dashboard (Port 3002)
├── Real-time Status Panel
│   ├── Instance Health (CPU, Memory, Status)
│   ├── Communication Queue Status
│   └── Active Agent Count
├── Communication Monitor
│   ├── Message Flow Visualization
│   ├── Handoff Success Rate
│   └── Confirmation Requests
├── Agent Management
│   ├── Agent Status Grid
│   ├── Performance Metrics
│   └── Execution Logs
└── File Viewer
    ├── Shared Markdown Files
    ├── Dynamic HTML Pages
    └── Agent Output Downloads
```

### Metrics Collection
```javascript
const metrics = {
  instances: {
    development: {
      health: 'healthy|degraded|down',
      cpu: 'percentage',
      memory: 'bytes',
      lastHeartbeat: 'timestamp'
    },
    production: {
      health: 'healthy|degraded|down', 
      cpu: 'percentage',
      memory: 'bytes',
      agentCount: 'number',
      lastHeartbeat: 'timestamp'
    }
  },
  communication: {
    messagesPerMinute: 'number',
    averageLatency: 'milliseconds',
    errorRate: 'percentage',
    queueDepth: 'number'
  },
  agents: {
    active: 'number',
    executing: 'number',
    averageExecutionTime: 'milliseconds',
    successRate: 'percentage'
  }
};
```

## 🔄 Deployment Architecture

### VPS Configuration
```bash
# System Setup
sudo apt update && sudo apt install -y nodejs npm pm2 nginx redis-server
npm install -g claude-code

# Directory Structure
/opt/agent-feed/
├── development/     # Dev instance workspace
├── production/      # Prod instance workspace  
├── dashboard/       # Dual instance dashboard
├── logs/           # Centralized logs
└── backups/        # Automated backups

# Service Configuration
systemctl enable claude-dev
systemctl enable claude-prod
systemctl enable dual-dashboard
systemctl enable nginx
```

### SSL & Reverse Proxy
```nginx
# /etc/nginx/sites-available/dual-claude
server {
    listen 80;
    server_name your-domain.com;
    return 301 https://$server_name$request_uri;
}

server {
    listen 443 ssl;
    server_name your-domain.com;
    
    ssl_certificate /path/to/cert.pem;
    ssl_certificate_key /path/to/key.pem;
    
    # Development Instance
    location /dev/ {
        proxy_pass http://localhost:3001/;
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
    }
    
    # Production Instance  
    location /prod/ {
        proxy_pass http://localhost:3000/;
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
    }
    
    # Dual Dashboard
    location / {
        proxy_pass http://localhost:3002/;
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection "upgrade";
    }
}
```

---

*This architecture provides a robust foundation for the dual Claude Code system, ensuring proper isolation, secure communication, and comprehensive monitoring while maintaining the flexibility needed for both development and production workflows.*