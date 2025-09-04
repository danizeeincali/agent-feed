# Claude Code Configuration System Research Report

## Executive Summary

This research documents Claude Code's configuration discovery system, directory structure, isolation mechanisms, and production deployment strategies. Key findings reveal critical security limitations in current deny permissions system and provide comprehensive solutions for production environment isolation.

## 1. Configuration Discovery Process

### 1.1 Startup Sequence

Claude Code follows this discovery order during startup:

1. **Authentication & Credential Loading**: Checks for API keys and authentication
2. **Update Check**: Automatic update verification on startup
3. **Configuration File Discovery**: Hierarchical search for settings files
4. **Context Gathering**: CLAUDE.md file aggregation from discovered locations
5. **Agent Discovery**: Scanning for custom agents in specified directories
6. **MCP Server Initialization**: Loading Model Context Protocol servers

### 1.2 CLAUDE.md File Discovery Order

Claude Code reads memory files recursively in this sequence:

1. **Home Directory**: `~/.claude/CLAUDE.md` (applies to all sessions)
2. **Parent Directories**: Recursive search up to `/` from current working directory
3. **Current Working Directory**: Where `claude` command is executed
4. **Child Directories**: On-demand loading when working with files in subdirectories

**Critical**: CLAUDE.local.md files are also discovered and take precedence for local, git-ignored memories.

### 1.3 Settings File Hierarchy (Priority Order)

1. **Enterprise Settings** (Highest Priority)
   - macOS: `/Library/Application Support/ClaudeCode/managed-settings.json`
   - Linux/WSL: `/etc/claude-code/managed-settings.json`

2. **Command Line Arguments**

3. **Local Project Settings**
   - `.claude/settings.local.json` (personal, git-ignored)

4. **Shared Project Settings**
   - `.claude/settings.json` (team-shared, version controlled)

5. **User Settings** (Lowest Priority)
   - `~/.claude/settings.json` (applies to all projects)

## 2. Complete .claude Directory Structure

### 2.1 User-Level Configuration (`~/.claude/`)

```
~/.claude/
├── settings.json           # Global user settings
├── agents/                 # User agents (available across all projects)
│   ├── code-reviewer.md   # Custom agent definition
│   └── security-audit.md  # Security-focused agent
└── CLAUDE.md              # Global context file
```

### 2.2 Project-Level Configuration (`.claude/`)

```
.claude/
├── settings.json           # Team-shared settings (version controlled)
├── settings.local.json     # Personal settings (git-ignored)
├── agents/                 # Project-specific agents
│   ├── project-expert.md  # Domain-specific agent
│   └── testing-agent.md   # Testing specialist
├── commands/               # Custom slash commands
│   ├── debug-workflow.md  # /debug-workflow command
│   └── deploy-check.md    # /deploy-check command
└── CLAUDE.md              # Project context file
```

### 2.3 Directory-Level Configuration

```
src/components/.claude/
├── CLAUDE.md              # Component-specific context
└── agents/
    └── component-dev.md   # Component development specialist
```

## 3. Agent Discovery Algorithm

### 3.1 Discovery Paths

Claude Code scans for agents in this order:

1. **User Agents**: `~/.claude/agents/` (global availability)
2. **Project Agents**: `.claude/agents/` (project-specific)
3. **Directory Agents**: `<subdirectory>/.claude/agents/` (context-specific)

**Priority**: Project-level agents override user-level agents with same name.

### 3.2 Agent File Format

Agents must be Markdown files with YAML frontmatter:

```yaml
---
name: agent-name            # Required: Unique identifier
description: Agent purpose  # Required: When to invoke
tools: tool1, tool2        # Optional: Inherits all tools if omitted
---

System prompt and role definition goes here.
Multiple paragraphs defining capabilities and approach.
```

### 3.3 Discovery Requirements

- **File Extension**: Must be `.md`
- **Frontmatter**: Must contain valid YAML with `name` field
- **Location**: Must be in recognized `agents/` directories
- **Hot Reload**: Changes detected automatically without restart

## 4. Isolation and Path Restriction Mechanisms

### 4.1 Critical Security Issues

**⚠️ MAJOR FINDING**: Current deny permissions system is completely non-functional as of Claude Code v1.0.93.

**Affected Features**:
- File access restrictions (`permissions.deny`)
- Tool blocking
- Command filtering
- Pattern-based exclusions

**Risk Level**: HIGH - All documented deny rules are ignored.

### 4.2 Available Isolation Methods

#### 4.2.1 Container-Based Isolation (RECOMMENDED)

**Docker Sandbox Approach**:
```bash
# Run Claude in isolated container
docker run -it --rm \
  -v $(pwd):/workspace \
  -w /workspace \
  --network restricted \
  claude-code:latest --dangerously-skip-permissions
```

**Benefits**:
- Complete file system isolation
- Network access restrictions
- Credential protection
- System-level sandboxing

#### 4.2.2 DevContainer Setup

Official Anthropic-supported approach using VS Code devcontainers:

```json
{
  "name": "Claude Code Secure",
  "image": "mcr.microsoft.com/devcontainers/base:ubuntu",
  "customizations": {
    "vscode": {
      "extensions": ["anthropic.claude-code"]
    }
  },
  "postCreateCommand": "npm install -g @anthropic/claude-code",
  "remoteUser": "vscode"
}
```

#### 4.2.3 Git Worktrees for Multi-Instance

```bash
# Create isolated worktrees
git worktree add ../project-dev main
git worktree add ../project-prod production

# Run separate Claude instances
cd ../project-dev && claude
cd ../project-prod && claude --dangerously-skip-permissions
```

### 4.3 Permission Configuration (Limited Effectiveness)

Despite current bugs, proper permission configuration should include:

```json
{
  "permissions": {
    "allow": [
      "Bash(npm run test)",
      "Bash(npm run build)"
    ],
    "deny": [
      "Read(./.env*)",
      "Read(./secrets/**)",
      "Write(./prod/**)",
      "Bash(rm *)",
      "WebFetch"
    ]
  }
}
```

**Note**: Use PreToolUse hooks as workaround until deny system is fixed.

## 5. Production Configuration Strategy

### 5.1 Recommended Production Architecture

```
production-environment/
├── .devcontainer/
│   └── devcontainer.json     # Container isolation config
├── .claude/
│   ├── settings.json         # Production settings
│   ├── agents/              # Production-specific agents
│   │   ├── deployment.md    # Deployment specialist
│   │   └── monitoring.md    # Monitoring agent
│   └── commands/
│       ├── health-check.md  # /health-check command
│       └── rollback.md      # /rollback command
├── docker-compose.yml        # Multi-container setup
└── CLAUDE.md                # Production context
```

### 5.2 Production Settings Template

```json
{
  "permissions": {
    "mode": "default",
    "allow": [
      "Bash(kubectl get pods)",
      "Bash(docker ps)",
      "Read(./logs/**)",
      "Read(./monitoring/**)"
    ]
  },
  "environment": {
    "CLAUDE_CODE_DISABLE_NONESSENTIAL_TRAFFIC": "true",
    "DISABLE_TELEMETRY": "true",
    "VERBOSE_MODE": "false"
  },
  "additionalDirectories": [
    {
      "path": "./monitoring",
      "readClaudeMd": true,
      "alias": "monitor"
    }
  ]
}
```

### 5.3 Multi-Environment Setup

**Development Environment**:
- Full tool access
- Extensive debugging capabilities
- Local file system access

**Staging Environment**:
- Restricted tool set
- Container isolation
- Limited network access

**Production Environment**:
- Maximum security isolation
- Docker container required
- Network restrictions
- Audit logging enabled

### 5.4 Security Best Practices

1. **Always Use Containers in Production**
   - Docker or devcontainer isolation
   - Network access restrictions
   - Credential protection

2. **Implement Defense in Depth**
   - Container isolation (primary)
   - Permission settings (backup)
   - PreToolUse hooks (workaround)
   - Audit logging (monitoring)

3. **Environment Segregation**
   - Separate configurations per environment
   - Different credential sets
   - Isolated workspaces

4. **Monitoring and Auditing**
   ```json
   {
     "logging": {
       "level": "info",
       "auditEnabled": true,
       "auditFile": "./logs/claude-audit.log"
     }
   }
   ```

## 6. Configuration File Templates

### 6.1 User Settings Template (`~/.claude/settings.json`)

```json
{
  "permissions": {
    "mode": "default"
  },
  "environment": {
    "ANTHROPIC_API_KEY": "${ANTHROPIC_API_KEY}"
  },
  "preferences": {
    "verboseMode": true,
    "autoUpdate": true
  }
}
```

### 6.2 Project Settings Template (`.claude/settings.json`)

```json
{
  "permissions": {
    "allow": [
      "Bash(npm run *)",
      "Bash(git status)",
      "Read(./src/**)",
      "Write(./src/**)",
      "Edit(./src/**)"
    ],
    "deny": [
      "Read(./.env*)",
      "Write(./node_modules/**)",
      "Bash(rm -rf *)"
    ]
  },
  "additionalDirectories": [
    "./backend",
    {
      "path": "./shared-libs",
      "readClaudeMd": true,
      "alias": "shared"
    }
  ]
}
```

### 6.3 Production Agent Template

```markdown
---
name: production-monitor
description: Production monitoring and health check specialist. Use for system status, log analysis, and performance monitoring.
tools: Read, Grep, Bash
---

You are a production monitoring specialist focused on system health and performance analysis.

Your responsibilities:
- Monitor system metrics and logs
- Identify performance bottlenecks
- Alert on anomalies
- Provide health status reports

Always prioritize system stability and security in your recommendations.
```

## 7. Implementation Recommendations

### 7.1 Immediate Actions

1. **Implement Container Isolation**: Use Docker or devcontainers for all production deployments
2. **Create Environment-Specific Configurations**: Separate settings for dev/staging/prod
3. **Deploy Security Monitoring**: Implement audit logging and monitoring
4. **Document Security Procedures**: Create incident response procedures

### 7.2 Long-Term Strategy

1. **Monitor Security Updates**: Track Claude Code updates for deny system fixes
2. **Implement Custom Hooks**: Develop PreToolUse hooks as deny system workaround
3. **Automate Configuration Management**: Use Infrastructure as Code for settings
4. **Regular Security Reviews**: Periodic assessment of isolation effectiveness

## 8. Troubleshooting Guide

### 8.1 Configuration Discovery Issues

**Problem**: Claude not finding configuration files
**Solution**: 
- Check file paths and permissions
- Verify JSON syntax in settings files
- Ensure proper directory structure

### 8.2 Agent Discovery Failures

**Problem**: Custom agents not appearing
**Solution**:
- Verify YAML frontmatter format
- Check `name` field is present and unique
- Ensure file has `.md` extension
- Confirm agent directory exists

### 8.3 Permission System Issues

**Problem**: Deny rules not working
**Solution**:
- Implement container isolation immediately
- Use PreToolUse hooks as workaround
- Monitor Claude Code updates for fixes

## 9. Conclusion

Claude Code's configuration system provides extensive customization capabilities but has critical security limitations. The non-functional deny permissions system requires immediate mitigation through container isolation. Production deployments must prioritize security through defense-in-depth strategies, with container isolation as the primary security control.

**Key Takeaways**:
- Container isolation is mandatory for production use
- Current deny permissions system is unreliable
- Proper configuration hierarchy enables flexible deployment strategies
- Agent discovery system is robust and well-designed
- Multi-environment configurations require careful planning

This research provides the foundation for secure Claude Code deployments while maintaining development productivity and system reliability.