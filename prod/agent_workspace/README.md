# 🔒 Protected Agent Workspace

## ⚠️ DO NOT MODIFY FILES IN THIS DIRECTORY

This is a **protected workspace** for the production Claude instance. All files and subdirectories here are managed exclusively by agents and should never be manually edited.

## Purpose

This workspace provides an isolated environment where production agents can:
- Generate outputs without affecting the main codebase
- Store temporary work files
- Maintain logs and data
- Operate independently from development activities

## Directory Structure

```
agent_workspace/
├── outputs/     # Agent-generated deliverables
├── temp/        # Temporary working files (auto-cleaned)
├── logs/        # Agent operation logs
└── data/        # Persistent agent data
```

## Protection Rules

1. **No Manual Edits**: Never directly modify files in this directory
2. **Git Ignored**: All contents are excluded from version control
3. **Agent Only**: Only the production Claude instance should write here
4. **Isolated**: Changes here don't affect the main application

## Access

To interact with this workspace:
1. Use the production Claude instance from `/prod`
2. Initialize with: `claude --dangerously-skip-permissions`
3. Let agents manage all file operations

## Recovery

If workspace becomes corrupted:
```bash
cd /workspaces/agent-feed/prod
./reset-workspace.sh  # Safely resets workspace while preserving configs
```

---
**Managed by Production Claude Instance**