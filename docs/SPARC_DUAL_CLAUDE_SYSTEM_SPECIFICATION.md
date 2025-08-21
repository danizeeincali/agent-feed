# SPARC Specification: Dual Claude Code System Architecture

**Project**: Dual Instance Claude Code System  
**Methodology**: SPARC-TDD-NLD-Swarm  
**Date**: 2025-08-20  
**Status**: Specification Phase

## 🎯 System Overview

Design and implement a dual Claude Code instance system where:
- **Development Instance**: Terminal-based coding assistance (current interaction model)
- **Production Instance**: Autonomous agentic system running business agents
- **Dual Interface**: Unified viewport to monitor and control both instances

## 📋 Core Requirements

### 1. Instance Separation & Isolation

**Development Instance**:
- Location: `/workspaces/agent-feed/` (current workspace)
- Claude Config: `.claude/dev/` (isolated configuration)
- Purpose: Terminal-based development assistance
- User Interaction: Direct terminal commands
- Permissions: `--dangerous-skip-permissions` (dev environment)

**Production Instance**:
- Location: `/workspaces/agent-feed/agent_workspace/`
- Claude Config: `.claude/prod/` (isolated configuration) 
- Purpose: Autonomous business agent orchestration
- User Interaction: Via agent definitions in `@agents/`
- Permissions: `--dangerous-skip-permissions` (controlled environment)

### 2. Workspace Architecture

```
/workspaces/agent-feed/
├── .claude/
│   ├── dev/          # Development instance config
│   └── prod/         # Production instance config
├── agent_workspace/  # Production agent environment
│   ├── agents/       # Agent code and databases
│   ├── shared/       # User-shared files (.md, .html)
│   ├── data/         # Agent persistent data
│   └── logs/         # Agent execution logs
├── src/              # Development codebase
└── frontend/         # Agent Link interface
```

### 3. Communication Protocols

**Dev → Production Handoff**:
- Automatic handoff allowed
- No user confirmation required
- Logged for audit trail

**Production → Dev Requests**:
- User confirmation required
- Security gate implementation
- Explicit approval before dev actions

**Inter-Instance Communication**:
- Message queue system
- JSON-based protocol
- Rate limiting and validation

### 4. Agent Definitions System

**Agent Directory Structure**:
```
@agents/
├── business/
│   ├── customer-service.json
│   ├── content-creator.json
│   └── data-analyst.json
├── personal/
│   ├── assistant.json
│   └── scheduler.json
└── shared/
    └── utilities.json
```

**Agent Definition Schema**:
```json
{
  "name": "customer-service",
  "type": "business",
  "capabilities": ["customer-support", "ticket-management"],
  "workspace": "agent_workspace/agents/customer-service/",
  "permissions": ["read-shared", "write-logs"],
  "schedule": "24/7",
  "resources": {
    "memory": "512MB",
    "storage": "1GB"
  }
}
```

### 5. Persistence Requirements

**Persistent Across Dev Updates**:
- Agent workspace data
- Agent execution state
- User-shared files
- Agent databases
- Configuration settings

**Ephemeral (Dev-Updated)**:
- Development codebase
- Frontend interface
- System configurations
- Development tools

### 6. Security & Safety

**Permission Gates**:
- Production requests to dev require user approval
- Cross-instance file access controls
- Audit logging for all interactions
- Resource isolation between instances

**Safety Mechanisms**:
- Agent resource limits
- Execution timeouts
- Error containment
- Rollback capabilities

### 7. User Interface Requirements

**Dual Instance Dashboard**:
- Real-time status of both instances
- Agent activity monitoring
- Resource usage visualization
- Communication log viewing
- Manual handoff controls

**Agent Link Integration**:
- Markdown file viewer for agent outputs
- Dynamic HTML page rendering
- Agent management interface
- File sharing controls

### 8. VPS Deployment

**System Requirements**:
- Two Claude Code processes
- Shared filesystem with isolation
- Process management (PM2 or systemd)
- Port allocation (3000: prod, 3001: dev, 3002: dual interface)
- SSL termination for external access

**Monitoring**:
- Process health checks
- Resource monitoring
- Log aggregation
- Error alerting

## 🔧 Technical Implementation Plan

### Phase 1: Workspace Setup
1. Create isolated .claude configurations
2. Set up agent_workspace structure
3. Implement file permission controls
4. Create agent definition schema

### Phase 2: Instance Management
1. Configure dual Claude Code processes
2. Implement inter-instance communication
3. Create permission gate system
4. Set up audit logging

### Phase 3: Agent System
1. Implement agent definition parser
2. Create agent execution environment
3. Set up shared file system
4. Implement resource monitoring

### Phase 4: User Interface
1. Build dual instance dashboard
2. Integrate with Agent Link
3. Create management controls
4. Implement real-time monitoring

### Phase 5: Production Deployment
1. VPS configuration
2. Process management setup
3. SSL and security hardening
4. Monitoring and alerting

## 🧪 Testing Strategy

**Unit Tests**:
- Agent definition parsing
- Permission gate logic
- Communication protocols
- File isolation

**Integration Tests**:
- Cross-instance communication
- Agent execution workflow
- Persistence validation
- Security boundary testing

**E2E Tests (Playwright)**:
- Dual dashboard functionality
- Agent management workflow
- File sharing and viewing
- Error handling scenarios

**Load Tests**:
- Multiple agent execution
- Resource usage validation
- Communication bottlenecks
- System stability

## 📊 Success Criteria

1. **Instance Isolation**: Dev and prod run independently without interference
2. **Communication**: Secure, audited communication between instances
3. **Persistence**: Production data survives development updates
4. **Security**: All cross-instance operations require proper authorization
5. **Monitoring**: Complete visibility into both instance states
6. **Agent Management**: Seamless agent definition and execution
7. **User Experience**: Intuitive dual interface for system control

## 🚨 Risk Considerations

**High Priority Risks**:
- Security breaches between instances
- Data loss during updates
- Resource conflicts
- Communication failures

**Mitigation Strategies**:
- Comprehensive testing at each phase
- Backup and recovery procedures
- Resource isolation enforcement
- Graceful degradation mechanisms

## 📈 Performance Requirements

- **Startup Time**: Both instances operational within 30 seconds
- **Response Time**: Inter-instance communication under 100ms
- **Resource Usage**: Each instance under 1GB RAM baseline
- **Availability**: 99.5% uptime for production instance
- **Scalability**: Support 10+ concurrent agents

---

*This specification serves as the foundation for implementing the dual Claude Code system using SPARC methodology, ensuring comprehensive planning before development begins.*