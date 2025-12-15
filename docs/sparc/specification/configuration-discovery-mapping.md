# SPARC Specification: Configuration Discovery Mapping

## Configuration File Discovery Map

### Root Level Configuration Files
```
/workspaces/agent-feed/
├── .claude-dev                    # Development instance marker
├── .claude-prod                   # Production instance marker  
├── CLAUDE.md                      # Main Claude Code configuration
├── claude-flow.config.json        # Global Claude Flow settings
└── logs/
    ├── claude-process-manager.log
    └── claude-process-manager-error.log
```

### Production Environment Configuration
```
/workspaces/agent-feed/prod/
├── .claude/                       # Incomplete Claude directory
├── .claude-flow/                  # Claude Flow prod settings
├── CLAUDE.md                      # Production Claude instructions (247 lines)
├── PRODUCTION_CLAUDE.md           # Additional prod documentation
├── config/
│   └── claude.config.js           # Runtime configuration
├── config.json                    # General configuration
├── system_instructions/           # System instruction files (READ-ONLY)
│   ├── README.md
│   ├── api/
│   │   ├── allowed_operations.json
│   │   └── forbidden_operations.json
│   ├── rules/
│   │   ├── core_boundaries.md
│   │   └── operation_limits.md
│   ├── workspace/
│   │   └── agent_workspace_rules.md
│   ├── architecture/
│   │   └── system_overview.md
│   └── migration/
│       ├── validation_checkpoints.md
│       └── workspace_migration_plan.md
└── agent_workspace/
    ├── README.md
    └── .claude-flow/
```

## Current Discovery Behavior Analysis

### 1. Path Resolution Pattern
- Claude Code searches current working directory first
- Traverses parent directories looking for configuration
- No boundary restrictions implemented
- Uses standard filesystem path traversal

### 2. Configuration Precedence
1. **Current Directory**: `.claude/` if present
2. **Parent Directory**: Searches upward for `.claude/`
3. **Global Configuration**: Uses root-level configurations
4. **Fallback**: Default embedded configurations

### 3. Critical Security Gaps

#### Missing Isolation
- **Problem**: Production Claude can access `/workspaces/agent-feed/.claude-dev`
- **Problem**: Production Claude can read `/workspaces/agent-feed/CLAUDE.md`
- **Problem**: Production Claude inherits `/workspaces/agent-feed/claude-flow.config.json`

#### Configuration Inheritance Chain
```
Current Discovery Chain (INSECURE):
1. /workspaces/agent-feed/prod/.claude/ (incomplete)
2. /workspaces/agent-feed/CLAUDE.md (ACCESSIBLE - VIOLATION)
3. /workspaces/agent-feed/claude-flow.config.json (ACCESSIBLE - VIOLATION)
4. Embedded defaults
```

#### Required Isolated Chain
```
Secure Discovery Chain (TARGET):
1. /workspaces/agent-feed/prod/.claude/ (complete)
2. /workspaces/agent-feed/prod/CLAUDE.md (isolated)
3. /workspaces/agent-feed/prod/.claude-flow.config.json (isolated)
4. Prod-specific defaults only
```

## Configuration File Analysis

### Current .claude Structure Analysis
- **Location**: `/workspaces/agent-feed/prod/.claude/`
- **Status**: Directory exists but incomplete
- **Issue**: Missing critical configuration files

### Required .claude Structure
```
/workspaces/agent-feed/prod/.claude/
├── config.json                   # Main Claude configuration
├── agents/                       # Agent definitions
│   ├── coder.json
│   ├── reviewer.json
│   ├── tester.json
│   └── ...all-agents...
├── workflows/                    # Workflow definitions
│   ├── sparc.json
│   ├── tdd.json
│   └── default.json
├── templates/                    # Code templates
├── schemas/                      # Configuration schemas
├── hooks/                        # Lifecycle hooks
│   ├── pre-task.js
│   ├── post-task.js
│   └── session-hooks.js
├── memory/                       # Local memory store
├── logs/                         # Claude-specific logs
├── cache/                        # Local cache
└── permissions.json              # Access permissions
```

### Configuration Content Requirements

#### 1. Agent Definitions Must Be Local
```json
{
  "agents": {
    "discovery": {
      "searchPaths": ["/workspaces/agent-feed/prod/agent_workspace/agents"],
      "restrictToLocal": true,
      "inheritanceBlocked": true
    }
  }
}
```

#### 2. Path Restrictions Must Be Enforced
```json
{
  "security": {
    "allowedPaths": [
      "/workspaces/agent-feed/prod"
    ],
    "forbiddenPaths": [
      "/workspaces/agent-feed/src",
      "/workspaces/agent-feed/frontend",
      "/workspaces/agent-feed/tests",
      "/workspaces/agent-feed/.claude-dev"
    ],
    "enforceIsolation": true
  }
}
```

#### 3. Configuration Inheritance Must Be Disabled
```json
{
  "inheritance": {
    "enabled": false,
    "parentConfigSearch": false,
    "globalConfigAccess": false
  }
}
```

## Discovery Algorithm Requirements

### Current Algorithm (INSECURE)
```pseudocode
function findConfiguration(currentPath) {
    while (currentPath !== '/') {
        if (exists(currentPath + '/.claude')) {
            return load(currentPath + '/.claude');
        }
        currentPath = parent(currentPath);
    }
    return loadGlobalConfig();
}
```

### Required Secure Algorithm
```pseudocode
function findConfigurationSecure(currentPath, isolationRoot) {
    // Ensure we never traverse above isolation root
    if (!currentPath.startsWith(isolationRoot)) {
        throw SecurityError("Path outside isolation boundary");
    }
    
    // Search only within isolation boundary
    while (currentPath.startsWith(isolationRoot)) {
        if (exists(currentPath + '/.claude')) {
            config = load(currentPath + '/.claude');
            validateIsolation(config, isolationRoot);
            return config;
        }
        if (currentPath === isolationRoot) break;
        currentPath = parent(currentPath);
    }
    
    // Load only local defaults
    return loadLocalDefaults(isolationRoot);
}
```

## Security Validation Requirements

### 1. Path Validation
- All file paths must be within `/workspaces/agent-feed/prod/`
- Symlink resolution must respect boundaries
- Relative path traversal must be blocked

### 2. Configuration Validation
- All configuration files must be within prod environment
- External references must be rejected
- Environment variable injection must be sanitized

### 3. Runtime Enforcement
- Continuous boundary monitoring
- Access attempt logging
- Violation prevention and alerting

## Migration Requirements

### Files to Migrate to /prod/.claude/
1. Agent definitions from root
2. Workflow configurations
3. Template files
4. Schema definitions
5. Hook implementations

### Files to Isolate in /prod/
1. Complete .claude directory structure
2. Local claude-flow.config.json
3. Production-specific CLAUDE.md
4. Isolated configuration files

### Files to Remove Access From
1. `/workspaces/agent-feed/.claude-dev`
2. `/workspaces/agent-feed/CLAUDE.md`
3. `/workspaces/agent-feed/claude-flow.config.json`
4. All development workspace files

---

**Status**: Configuration Discovery Mapping Complete
**Security Level**: CRITICAL
**Next Phase**: Pseudocode Design