# Dual Claude Code System - Usage Guide

## 🚀 System Overview

The Dual Claude Code System provides two isolated Claude instances:

- **Development Instance**: Current Claude Code session (terminal-based coding assistance)
- **Production Instance**: Autonomous agent orchestration system

## 🏗️ Architecture

```
┌─────────────────────┐    ┌─────────────────────┐
│   Development       │    │    Production       │
│   Instance          │◄──►│    Instance         │
│   (Current Claude)  │    │   (Separate Process)│
└─────────────────────┘    └─────────────────────┘
│                                                 │
├─ Workspace: /workspaces/agent-feed/           ├─ Workspace: /agent_workspace/
├─ Config: .claude/dev/config.json             ├─ Config: .claude/prod/config.json
├─ Purpose: Coding assistance                  ├─ Purpose: Agent orchestration
└─ Restrictions: No agent_workspace/ access    └─ Restrictions: No dev workspace access
```

## 🔧 Getting Started

### 1. Start Production Instance

```bash
# Launch production Claude Code for agent orchestration
node /workspaces/agent-feed/src/dual-system/production-claude-launcher.js
```

### 2. Start Dashboard (Optional)

```bash
# Launch monitoring dashboard on port 3002
node /workspaces/agent-feed/src/dual-system/dual-instance-dashboard.js
```

### 3. Use Current Claude as Development

The Claude Code instance you're talking to right now IS the development instance. No separate launch needed.

## 📡 Communication Protocols

### Dev → Prod (Auto Handoff)

```javascript
// From development instance (current Claude)
const DualInstanceManager = require('./src/dual-system/DualInstanceManager');
const manager = new DualInstanceManager();
await manager.initialize();

// Send task to production (no confirmation required)
const messageId = await manager.sendDevToProduction(
  'Deploy customer service agent',
  { priority: 'high', agent: 'customer-service-v1' }
);
```

### Prod → Dev (Requires Confirmation)

```javascript
// From production instance (automatic when needed)
const messageId = await manager.sendProductionToDev(
  'fix_frontend_bug',
  'Customer service interface has rendering issue',
  { component: 'CustomerDashboard', error: 'infinite spinner' }
);

// User must approve via dashboard or API
```

## 🤖 Agent Management

### Agent Definitions

Agents are defined in `/workspaces/agent-feed/@agents/`:

```json
{
  "id": "customer-service-v1",
  "name": "Customer Service Agent",
  "capabilities": ["ticket-management", "customer-communication"],
  "workspace": {
    "directory": "agent_workspace/agents/customer-service/"
  }
}
```

### Agent Workspace Structure

```
agent_workspace/
├── agents/           # Individual agent workspaces
│   └── customer-service/
├── shared/           # Shared files (viewable in Agent Link)
│   ├── customer-responses/
│   └── escalations/
├── data/             # Agent databases and storage
└── logs/             # Agent execution logs
```

## 🔒 Security & Isolation

### Development Instance Restrictions

- ✅ Full access to `/workspaces/agent-feed/`
- ❌ Cannot access `/workspaces/agent-feed/agent_workspace/`
- ❌ Cannot access `/workspaces/agent-feed/.claude/prod/`
- ✅ Can send handoffs to production automatically

### Production Instance Restrictions

- ✅ Full access to `/workspaces/agent-feed/agent_workspace/`
- ❌ Cannot access development workspace
- ❌ Cannot access `/workspaces/agent-feed/.claude/dev/`
- ✅ Can request development assistance (with user confirmation)

## 📊 Monitoring & Dashboard

### Dashboard Features (Port 3002)

- Real-time instance status
- Message queue monitoring
- Confirmation handling
- Agent activity tracking
- Performance metrics

### API Endpoints

```bash
# Get system status
GET http://localhost:3002/api/status

# Get message history
GET http://localhost:3002/api/messages

# Handle confirmation
POST http://localhost:3002/api/confirm/:messageId
```

## 🎯 Common Workflows

### 1. Deploy New Agent

**From Development (Current Claude):**

```javascript
// 1. Create agent definition in @agents/
// 2. Send deployment handoff
const manager = new DualInstanceManager();
await manager.sendDevToProduction(
  'Deploy new marketing agent',
  { agent: 'marketing-automation-v1', features: ['email-campaigns'] }
);
```

**Production automatically:**
- Loads agent definition
- Creates workspace
- Starts agent execution

### 2. Handle Production Issues

**Production detects issue and requests help:**

```javascript
await manager.sendProductionToDev(
  'debug_agent_failure',
  'Marketing agent crashing on startup',
  { agent: 'marketing-automation-v1', error: 'module not found' }
);
```

**User confirmation required:**
- Review request in dashboard
- Approve/deny based on priority
- Development instance gets access if approved

### 3. Update Production Code

**From Development:**

```javascript
// 1. Fix code in development workspace
// 2. Test thoroughly
// 3. Send update handoff
await manager.sendDevToProduction(
  'Update customer service agent with bug fix',
  { 
    agent: 'customer-service-v1',
    changes: ['fix infinite spinner', 'improve error handling'],
    testing: 'all tests passing'
  }
);
```

## 🔄 Persistence

### Production Data Persistence

- Agent workspace (`/agent_workspace/`) persists through development updates
- Shared files remain accessible in Agent Link interface
- Agent databases and logs are preserved
- Configuration changes require careful coordination

### Development Updates

When updating system code from development:
1. Test changes thoroughly in dev workspace
2. Use handoff to deploy to production
3. Production data remains isolated and safe
4. Rollback possible via version control

## 🛠️ Commands Reference

### Testing

```bash
# Run complete dual system tests
node /workspaces/agent-feed/src/dual-system/dual-system-test.js

# Test specific component
node -e "const DualInstanceManager = require('./src/dual-system/DualInstanceManager'); /* test code */"
```

### Management

```bash
# Start production instance
node /workspaces/agent-feed/src/dual-system/production-claude-launcher.js

# Start dashboard
node /workspaces/agent-feed/src/dual-system/dual-instance-dashboard.js

# Check communication queue
ls -la /tmp/claude-communication/

# Monitor production heartbeat
tail -f /tmp/claude-communication/production-heartbeat.json
```

### Debugging

```bash
# View audit logs
cat /tmp/claude-communication/audit.log | jq .

# Check instance logs
tail -f .claude/prod/logs/claude-prod.log
tail -f .claude/dev/logs/claude-dev.log

# Monitor agent activity
ls -la agent_workspace/shared/customer-responses/
```

## 🎉 Success Indicators

### System Health

- ✅ All tests passing (100% success rate)
- ✅ Production instance generating customer responses
- ✅ Dev→Prod handoffs working automatically
- ✅ Prod→Dev requests requiring confirmation
- ✅ Workspace isolation maintained
- ✅ Agent Link integration ready

### Example Output

```bash
📊 Test Results Summary
========================
✅ Passed: 8
❌ Failed: 0
⏱️  Total time: 1021ms
📈 Success rate: 100.0%

🎉 All tests passed! Dual system is ready for deployment.
```

## 🚀 Next Steps

1. **Agent Development**: Create more business agents in `@agents/`
2. **Agent Link Integration**: Connect shared files to Agent Link UI
3. **Production Scaling**: Monitor and scale agent resources
4. **Advanced Features**: Add more sophisticated agent capabilities

---

**The dual Claude Code system is now fully operational! 🎯**

- Development Instance: Ready for coding (current session)
- Production Instance: Ready for agent orchestration
- Communication: Bidirectional with security gates
- Monitoring: Dashboard and API available
- Testing: Comprehensive suite passing 100%