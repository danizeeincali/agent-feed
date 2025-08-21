# Agent Workspace Rules

## 🎯 Primary Rule: ALL AGENT WORK GOES UNDER `/prod/agent_workspace/`

### Critical Guidelines for Production Claude

#### ✅ **Required Agent Workspace Location**
- **Primary Location**: `/workspaces/agent-feed/prod/agent_workspace/`
- **All agent directories must be created under this path**
- **No exceptions** - this ensures complete isolation and protection

#### 🚨 **Forbidden Agent Locations**
- ❌ **NEVER** create agent directories in root `/workspaces/agent-feed/`
- ❌ **NEVER** create agent directories in `/workspaces/agent-feed/src/`
- ❌ **NEVER** create agent directories in `/workspaces/agent-feed/frontend/`
- ❌ **NEVER** create agent directories outside of the designated workspace

## 📁 Agent Workspace Structure

```
/workspaces/agent-feed/prod/agent_workspace/
├── .protected                    # Protection marker (DO NOT MODIFY)
├── .gitignore                   # Git protection rules (DO NOT MODIFY)
├── README.md                    # Workspace documentation
├── agents/                      # Individual agent directories
│   ├── agent-001/              # Example agent directory
│   ├── agent-research/         # Research-focused agent
│   └── agent-coordination/     # Coordination agent
├── shared/                     # Shared resources between agents
│   ├── data/                   # Shared data files
│   ├── configs/               # Shared configurations
│   └── utils/                 # Shared utilities
├── outputs/                    # Agent outputs and results
├── logs/                      # Agent-specific logs
├── temp/                      # Temporary files (auto-cleaned)
└── backups/                   # Automated backups
```

## 🛡️ Protection Mechanisms

### Automatic Protection
- The agent workspace is **automatically protected** from external interference
- Git ignore rules prevent accidental commits of sensitive agent data
- Continuous monitoring ensures workspace integrity
- Automated cleanup prevents resource exhaustion

### Isolation Benefits
- **Complete isolation** from development environment
- **No interference** with main application code
- **Safe experimentation** within protected boundaries
- **Easy cleanup** and maintenance

## 📋 Agent Directory Guidelines

### Creating New Agent Directories
```bash
# ✅ CORRECT - Under agent_workspace
/workspaces/agent-feed/prod/agent_workspace/agents/my-new-agent/

# ❌ WRONG - Outside workspace
/workspaces/agent-feed/my-agent/
/workspaces/agent-feed/agents/my-agent/
```

### Directory Structure for Individual Agents
```
agent_workspace/agents/[agent-name]/
├── config/                     # Agent-specific configuration
├── data/                      # Agent data and inputs
├── outputs/                   # Agent results and outputs
├── logs/                      # Agent execution logs
├── temp/                      # Temporary processing files
└── README.md                  # Agent documentation
```

## 🔄 Data Flow Guidelines

### Input Sources (READ-ONLY)
- System instructions from `/prod/system_instructions/`
- Configuration from `/prod/config/`
- User inputs via designated channels

### Output Destinations (WRITE-ALLOWED)
- Agent outputs to `/prod/agent_workspace/outputs/`
- Logs to `/prod/agent_workspace/logs/`
- Temporary data to `/prod/agent_workspace/temp/`

### Shared Resources
- Use `/prod/agent_workspace/shared/` for inter-agent communication
- Follow naming conventions for shared resources
- Clean up shared resources after use

## 🧹 Maintenance Guidelines

### Automatic Cleanup
- Temporary files are automatically cleaned after 24 hours
- Log files are rotated and archived after 7 days
- Old agent directories can be archived after 30 days of inactivity

### Manual Maintenance
- Regularly review agent outputs for valuable results
- Archive completed projects to free up space
- Update agent documentation as needed

## 🚨 Violation Monitoring

### Monitored Activities
- Agent directory creation outside of workspace
- File operations outside allowed areas
- Resource usage exceeding limits
- Security policy violations

### Response Actions
- **Level 1**: Warning and guidance
- **Level 2**: Operation blocking
- **Level 3**: Temporary restriction
- **Level 4**: Security alert and lockdown

## 📊 Performance Guidelines

### Resource Management
- **Memory**: Each agent limited to 256MB base allocation
- **Storage**: Maximum 1GB per agent directory
- **CPU**: Fair sharing with automatic throttling
- **Network**: Rate limiting on external requests

### Optimization Tips
- Use shared resources efficiently
- Clean up temporary files promptly
- Implement proper error handling and cleanup
- Monitor resource usage and optimize accordingly

---

**Remember: The agent workspace is your protected environment. Use it wisely and respect the boundaries!**