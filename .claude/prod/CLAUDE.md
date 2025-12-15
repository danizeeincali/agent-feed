# Production Claude Instance Configuration

## Overview
This is the production Claude instance for the agent-feed project, designed for debugging, testing, and production support.

## Features
- **Isolated Environment**: Separate from development instance
- **Debug Terminal**: Direct access to production debugging
- **Permission Override**: Uses `--dangerously-skip-permissions` for full access
- **Dual Instance Support**: Works alongside development Claude

## Usage

### Initialize Claude
```bash
cd .claude/prod
claude --dangerously-skip-permissions
```

### Directory Structure
```
.claude/prod/
├── package.json     # Production Claude configuration
├── CLAUDE.md        # This configuration file
├── debug/           # Debug logs and temporary files
├── agents/          # Production agent configurations
└── terminals/       # Terminal session management
```

## Integration
This instance integrates with the main project through:
- Shared codebase access (read/write)
- Independent WebSocket connections
- Separate terminal interface
- Production-specific configurations

## Debug Features
- Terminal interface for production debugging
- Real-time connection monitoring
- Agent performance tracking
- System health diagnostics