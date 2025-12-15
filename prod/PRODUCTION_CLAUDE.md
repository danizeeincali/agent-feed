# Production Claude Instance Configuration

## 🏗️ New Production Structure

The production Claude instance has been relocated from `.claude/prod` to `/prod` for better visibility and organization.

## Directory Structure

```
/workspaces/agent-feed/
├── frontend/              # Development environment
├── src/                   # Source code
├── docs/                  # Documentation
└── prod/                  # PRODUCTION CLAUDE INSTANCE
    ├── agent_workspace/   # 🔒 PROTECTED - Agent work area
    │   ├── outputs/       # Agent deliverables
    │   ├── temp/          # Temporary files
    │   ├── logs/          # Operation logs
    │   └── data/          # Persistent data
    ├── config/            # Production configurations
    ├── terminal/          # Terminal interface
    ├── logs/              # System logs
    ├── monitoring/        # Health monitoring
    ├── security/          # Security configs
    └── backups/           # Backup storage
```

## 🚀 Initialization

### Quick Start
```bash
cd /workspaces/agent-feed/prod
claude --dangerously-skip-permissions
```

### Using Terminal Interface
```bash
cd /workspaces/agent-feed/prod
node terminal/interface.js
```

### Using Init Script
```bash
cd /workspaces/agent-feed/prod
./init.sh
```

## 🔒 Protected Workspace

The `agent_workspace/` directory is **completely protected**:
- **No manual edits allowed** - Agents manage all files
- **Git ignored** - Not tracked in version control
- **Isolated operations** - Changes don't affect main code
- **Auto-managed** - Agents handle cleanup and organization

## 📋 Key Features

### 1. Isolation
- Production runs independently from development
- Agent workspace protected from accidental changes
- Clear separation of concerns

### 2. Visibility
- No hidden directories - everything in `/prod`
- Clear structure and organization
- Easy to monitor and debug

### 3. Protection
- Multiple layers of .gitignore rules
- Protected marker files
- Access control documentation

### 4. Flexibility
- Configurations can be updated in `/prod/config`
- Agent workspace remains isolated
- Easy migration and backup

## 🛠️ Common Operations

### Reset Agent Workspace
```bash
cd /workspaces/agent-feed/prod
./reset-workspace.sh
```

### View Agent Logs
```bash
tail -f /workspaces/agent-feed/prod/agent_workspace/logs/*.log
```

### Check System Status
```bash
cd /workspaces/agent-feed/prod
./status.sh
```

### Backup Production Data
```bash
cd /workspaces/agent-feed/prod
./backup.sh
```

## 🔧 Configuration

### Agent Settings
Edit `/prod/config/agents.json` to configure agent behaviors

### Claude Options
Edit `/prod/config/claude.config.js` for Claude-specific settings

### Security Rules
Edit `/prod/security/policies.json` for access controls

## ⚠️ Important Notes

1. **Never manually edit files in `agent_workspace/`**
2. **Always use Claude instance for agent operations**
3. **Configurations in `/prod/config` can be carefully updated**
4. **Main development happens in parent directories**
5. **Production is isolated but not hidden**

## 📊 Monitoring

- **Logs**: `/prod/logs/` - System operation logs
- **Metrics**: `/prod/monitoring/` - Performance data
- **Agent Logs**: `/prod/agent_workspace/logs/` - Agent-specific logs

## 🔄 Migration from .claude/prod

If you had a previous installation in `.claude/prod`:
1. Files have been migrated to `/prod`
2. Update any scripts pointing to old location
3. Old directory can be safely removed

## 🆘 Troubleshooting

### Permission Issues
```bash
chmod +x /workspaces/agent-feed/prod/*.sh
```

### Reset Production
```bash
cd /workspaces/agent-feed/prod
./clean-install.sh
```

### Connection Problems
```bash
cd /workspaces/agent-feed/prod
./test-connections.sh
```

---

**Production Claude Instance v2.0** - Isolated, Protected, Visible