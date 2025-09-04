# Configuration File Templates and Override Mechanisms

## Overview

This document provides comprehensive templates for all configuration files required for Claude Code production isolation, along with the override mechanisms that ensure complete containment and security.

## Core Configuration Templates

### 1. Main Configuration Template (`config.json`)

```json
{
  "$schema": "https://claude.ai/schemas/config/v2.0.0.json",
  "version": "2.0.0",
  "environment": "production-isolated",
  "metadata": {
    "created_at": "{{TIMESTAMP}}",
    "created_by": "system-architecture",
    "description": "Production isolated Claude Code configuration",
    "documentation": "/workspaces/agent-feed/docs/sparc/architecture/"
  },
  
  "isolation": {
    "enabled": true,
    "strict_mode": true,
    "enforcement_level": "maximum",
    "root_path": "/workspaces/agent-feed/prod",
    "parent_access": "forbidden",
    "upward_traversal": "blocked",
    "symlink_resolution": "within_boundaries",
    "path_canonicalization": "enforced"
  },
  
  "workspace": {
    "root": "/workspaces/agent-feed/prod",
    "agent_workspace": "/workspaces/agent-feed/prod/agent_workspace",
    "config_path": "/workspaces/agent-feed/prod/.claude",
    "temp_directory": "/workspaces/agent-feed/prod/temp",
    "log_directory": "/workspaces/agent-feed/prod/logs",
    "backup_directory": "/workspaces/agent-feed/prod/backup",
    "cache_directory": "/workspaces/agent-feed/prod/.claude/cache"
  },
  
  "discovery": {
    "agent_paths": [
      "/workspaces/agent-feed/prod/.claude/agents"
    ],
    "tool_paths": [
      "/workspaces/agent-feed/prod/.claude/tools"
    ],
    "prompt_paths": [
      "/workspaces/agent-feed/prod/.claude/prompts"
    ],
    "schema_paths": [
      "/workspaces/agent-feed/prod/.claude/schemas"
    ],
    "parent_discovery": false,
    "recursive_search": false,
    "search_depth": 0,
    "cache_discovery": true,
    "validation_required": true
  },
  
  "security": {
    "enforce_boundaries": true,
    "path_validation": "strict",
    "command_filtering": "whitelist",
    "network_restrictions": true,
    "file_access_control": "enforced",
    "audit_all_operations": true,
    "real_time_monitoring": true,
    "incident_response": "automatic"
  },
  
  "agents": {
    "auto_discovery": true,
    "registration_required": true,
    "validation_enabled": true,
    "isolation_enforced": true,
    "max_concurrent": 10,
    "default_timeout": 300000,
    "workspace_isolation": true,
    "security_clearance_required": true
  },
  
  "override_prevention": {
    "parent_configs": "disabled",
    "system_configs": "filtered",
    "user_configs": "ignored",
    "global_settings": "overridden",
    "environment_variables": "sandboxed"
  }
}
```

### 2. Workspace Configuration Template (`workspace.json`)

```json
{
  "workspace_id": "prod-isolated-workspace-{{UUID}}",
  "name": "Production Isolated Environment",
  "description": "Self-contained Claude Code production environment with complete isolation",
  "version": "2.0.0",
  "created_at": "{{TIMESTAMP}}",
  
  "boundaries": {
    "read_allowed": [
      "/workspaces/agent-feed/prod/**/*",
      "/usr/bin/node",
      "/usr/bin/npm",
      "/bin/bash",
      "/bin/sh"
    ],
    "write_allowed": [
      "/workspaces/agent-feed/prod/agent_workspace/**/*",
      "/workspaces/agent-feed/prod/logs/**/*",
      "/workspaces/agent-feed/prod/temp/**/*",
      "/workspaces/agent-feed/prod/monitoring/**/*",
      "/workspaces/agent-feed/prod/backup/**/*"
    ],
    "execute_allowed": [
      "/usr/bin/node",
      "/usr/bin/npm",
      "/workspaces/agent-feed/prod/scripts/**/*.sh",
      "/workspaces/agent-feed/prod/scripts/**/*.js"
    ],
    "forbidden": [
      "/workspaces/agent-feed/src/**/*",
      "/workspaces/agent-feed/frontend/**/*",
      "/workspaces/agent-feed/.git/**/*",
      "/workspaces/agent-feed/.env*",
      "/workspaces/agent-feed/CLAUDE.md",
      "/workspaces/agent-feed/package.json",
      "/workspaces/agent-feed/node_modules/**/*",
      "/etc/**/*",
      "/var/**/*",
      "/usr/**/*",
      "~/**/*",
      "$HOME/**/*"
    ]
  },
  
  "inheritance": {
    "parent_configs": false,
    "system_configs": false,
    "user_configs": false,
    "global_settings": false,
    "environment_variables": "filtered"
  },
  
  "features": {
    "git_integration": false,
    "package_management": "restricted",
    "system_commands": "whitelist_only",
    "network_access": "limited",
    "file_system_access": "bounded",
    "terminal_access": "sandboxed"
  },
  
  "resource_limits": {
    "max_file_size": "100MB",
    "max_workspace_size": "1GB",
    "max_log_size": "500MB",
    "max_temp_size": "200MB",
    "max_cache_size": "100MB"
  },
  
  "monitoring": {
    "track_all_operations": true,
    "log_access_patterns": true,
    "monitor_resource_usage": true,
    "detect_anomalies": true,
    "alert_on_violations": true
  }
}
```

### 3. Isolation Enforcement Template (`isolation.json`)

```json
{
  "isolation_version": "2.0.0",
  "enforcement_level": "maximum",
  "created_at": "{{TIMESTAMP}}",
  
  "path_control": {
    "validation_mode": "strict",
    "canonicalization": "required",
    "symlink_handling": "resolve_and_validate",
    "traversal_prevention": "enforced",
    "case_sensitivity": "enforced"
  },
  
  "command_control": {
    "execution_mode": "whitelist_only",
    "parameter_validation": "enforced",
    "environment_isolation": "complete",
    "working_directory_control": "enforced",
    "shell_access": "restricted"
  },
  
  "network_control": {
    "outbound_connections": "limited",
    "inbound_connections": "blocked",
    "dns_resolution": "filtered",
    "proxy_usage": "forbidden",
    "file_downloads": "restricted"
  },
  
  "filesystem_control": {
    "mount_points": "restricted",
    "device_access": "blocked",
    "special_files": "blocked",
    "pipe_access": "restricted",
    "socket_access": "limited"
  },
  
  "enforcement_mechanisms": {
    "pre_operation_validation": true,
    "real_time_monitoring": true,
    "post_operation_audit": true,
    "automatic_blocking": true,
    "incident_response": "immediate"
  }
}
```

## Security Policy Templates

### 4. Path Whitelist Template (`isolation/path-whitelist.json`)

```json
{
  "version": "2.0.0",
  "description": "Comprehensive path whitelist for production isolation",
  "updated_at": "{{TIMESTAMP}}",
  
  "allowed_read_paths": {
    "production_environment": [
      "/workspaces/agent-feed/prod/**/*"
    ],
    "system_binaries": [
      "/usr/bin/node",
      "/usr/bin/npm",
      "/bin/bash",
      "/bin/sh",
      "/bin/cat",
      "/bin/ls",
      "/bin/grep",
      "/usr/bin/find"
    ],
    "system_libraries": [
      "/usr/lib/node_modules/**/*",
      "/usr/local/lib/node_modules/**/*"
    ]
  },
  
  "allowed_write_paths": {
    "agent_workspace": [
      "/workspaces/agent-feed/prod/agent_workspace/**/*"
    ],
    "logs": [
      "/workspaces/agent-feed/prod/logs/**/*"
    ],
    "temporary": [
      "/workspaces/agent-feed/prod/temp/**/*"
    ],
    "monitoring": [
      "/workspaces/agent-feed/prod/monitoring/**/*"
    ],
    "backup": [
      "/workspaces/agent-feed/prod/backup/**/*"
    ],
    "cache": [
      "/workspaces/agent-feed/prod/.claude/cache/**/*"
    ]
  },
  
  "allowed_execute_paths": {
    "system_commands": [
      "/usr/bin/node",
      "/usr/bin/npm",
      "/bin/bash",
      "/bin/sh"
    ],
    "production_scripts": [
      "/workspaces/agent-feed/prod/scripts/**/*.sh",
      "/workspaces/agent-feed/prod/scripts/**/*.js"
    ]
  },
  
  "path_validation": {
    "normalize_paths": true,
    "resolve_symlinks": true,
    "check_canonical": true,
    "prevent_traversal": true,
    "case_sensitive": true,
    "length_limit": 4096
  },
  
  "exceptions": {
    "temporary_permissions": [],
    "emergency_access": [],
    "maintenance_windows": []
  }
}
```

### 5. Command Whitelist Template (`isolation/command-whitelist.json`)

```json
{
  "version": "2.0.0",
  "description": "Approved commands for production environment",
  "updated_at": "{{TIMESTAMP}}",
  
  "allowed_commands": {
    "file_operations": {
      "read": [
        "cat /workspaces/agent-feed/prod/**/*",
        "ls /workspaces/agent-feed/prod/**/*",
        "head /workspaces/agent-feed/prod/**/*",
        "tail /workspaces/agent-feed/prod/**/*",
        "grep -r \"pattern\" /workspaces/agent-feed/prod/**/*",
        "find /workspaces/agent-feed/prod -name \"pattern\""
      ],
      "write": [
        "echo \"content\" > /workspaces/agent-feed/prod/agent_workspace/**/*",
        "mkdir -p /workspaces/agent-feed/prod/agent_workspace/**/*",
        "touch /workspaces/agent-feed/prod/agent_workspace/**/*",
        "cp /workspaces/agent-feed/prod/**/* /workspaces/agent-feed/prod/agent_workspace/**/*"
      ]
    },
    "node_operations": [
      "node /workspaces/agent-feed/prod/**/*.js",
      "npm --prefix /workspaces/agent-feed/prod install",
      "npm --prefix /workspaces/agent-feed/prod run *",
      "npm --prefix /workspaces/agent-feed/prod list"
    ],
    "system_info": [
      "ps aux | grep node",
      "df -h /workspaces/agent-feed/prod",
      "du -sh /workspaces/agent-feed/prod/**/*",
      "date",
      "whoami",
      "pwd"
    ],
    "monitoring": [
      "tail -f /workspaces/agent-feed/prod/logs/**/*.log",
      "grep -i error /workspaces/agent-feed/prod/logs/**/*.log",
      "wc -l /workspaces/agent-feed/prod/logs/**/*.log"
    ]
  },
  
  "command_validation": {
    "parameter_sanitization": true,
    "path_validation": true,
    "injection_prevention": true,
    "output_filtering": true,
    "execution_timeout": 30
  },
  
  "restricted_patterns": {
    "shell_injection": [
      ";",
      "|",
      "&",
      "$(",
      "`",
      "&&",
      "||"
    ],
    "dangerous_commands": [
      "rm -rf",
      "sudo",
      "su",
      "chmod 777",
      "chown",
      "mount",
      "umount"
    ]
  }
}
```

## Agent Configuration Templates

### 6. Agent Definition Template (`templates/agent-template.md`)

```markdown
# {{AGENT_NAME}} Agent

## Metadata
- **Agent ID**: {{AGENT_ID}}
- **Version**: {{VERSION}}
- **Created**: {{TIMESTAMP}}
- **Category**: {{CATEGORY}}
- **Security Level**: {{SECURITY_LEVEL}}

## Role and Responsibilities
{{DESCRIPTION}}

### Primary Functions
- {{FUNCTION_1}}
- {{FUNCTION_2}}
- {{FUNCTION_3}}

### Secondary Functions
- {{SECONDARY_FUNCTION_1}}
- {{SECONDARY_FUNCTION_2}}

## Capabilities

### Core Capabilities
- **{{CAPABILITY_1}}**: {{CAPABILITY_1_DESCRIPTION}}
- **{{CAPABILITY_2}}**: {{CAPABILITY_2_DESCRIPTION}}
- **{{CAPABILITY_3}}**: {{CAPABILITY_3_DESCRIPTION}}

### Technical Capabilities
- **Languages**: {{SUPPORTED_LANGUAGES}}
- **File Types**: {{SUPPORTED_FILE_TYPES}}
- **APIs**: {{SUPPORTED_APIS}}
- **Tools**: {{AVAILABLE_TOOLS}}

## Security Profile

### Trust Level
- **Classification**: {{TRUST_LEVEL}}
- **Clearance**: {{SECURITY_CLEARANCE}}
- **Verification**: {{VERIFICATION_METHOD}}

### Access Boundaries
```json
{
  "workspace": "{{WORKSPACE_PATH}}",
  "read_access": {{READ_PATHS}},
  "write_access": {{WRITE_PATHS}},
  "execute_access": {{EXECUTE_PATHS}},
  "forbidden_access": {{FORBIDDEN_PATHS}}
}
```

### Command Restrictions
- **Allowed**: {{ALLOWED_COMMANDS}}
- **Forbidden**: {{FORBIDDEN_COMMANDS}}
- **Validation**: {{VALIDATION_RULES}}

## Integration Points

### Agent Coordination
- **Coordinates With**: {{COORDINATION_AGENTS}}
- **Communication Protocol**: {{COMMUNICATION_PROTOCOL}}
- **Data Sharing**: {{DATA_SHARING_RULES}}

### System Integration
- **Monitoring Systems**: {{MONITORING_INTEGRATION}}
- **Logging Systems**: {{LOGGING_INTEGRATION}}
- **Alert Systems**: {{ALERT_INTEGRATION}}

## Monitoring and Validation

### Performance Metrics
- **Response Time**: {{TARGET_RESPONSE_TIME}}
- **Throughput**: {{TARGET_THROUGHPUT}}
- **Accuracy**: {{TARGET_ACCURACY}}
- **Availability**: {{TARGET_AVAILABILITY}}

### Compliance Requirements
- **Security Compliance**: {{SECURITY_REQUIREMENTS}}
- **Data Protection**: {{DATA_PROTECTION_RULES}}
- **Audit Requirements**: {{AUDIT_REQUIREMENTS}}

## Configuration

### Agent-Specific Settings
```json
{
  "agent_id": "{{AGENT_ID}}",
  "workspace_path": "{{WORKSPACE_PATH}}",
  "max_operations_per_hour": {{MAX_OPERATIONS}},
  "timeout_seconds": {{TIMEOUT}},
  "log_level": "{{LOG_LEVEL}}",
  "monitoring_enabled": {{MONITORING_ENABLED}}
}
```

### Environment Variables
- **{{ENV_VAR_1}}**: {{ENV_VAR_1_VALUE}}
- **{{ENV_VAR_2}}**: {{ENV_VAR_2_VALUE}}

## Error Handling

### Error Categories
- **Security Violations**: {{SECURITY_ERROR_HANDLING}}
- **Boundary Violations**: {{BOUNDARY_ERROR_HANDLING}}
- **System Errors**: {{SYSTEM_ERROR_HANDLING}}
- **Operation Failures**: {{OPERATION_ERROR_HANDLING}}

### Recovery Procedures
- **Automatic Recovery**: {{AUTO_RECOVERY_RULES}}
- **Manual Intervention**: {{MANUAL_INTERVENTION_TRIGGERS}}
- **Escalation**: {{ESCALATION_PROCEDURES}}

## Testing and Validation

### Test Cases
- **Security Tests**: {{SECURITY_TESTS}}
- **Boundary Tests**: {{BOUNDARY_TESTS}}
- **Performance Tests**: {{PERFORMANCE_TESTS}}
- **Integration Tests**: {{INTEGRATION_TESTS}}

### Validation Criteria
- **Functional Validation**: {{FUNCTIONAL_CRITERIA}}
- **Security Validation**: {{SECURITY_CRITERIA}}
- **Performance Validation**: {{PERFORMANCE_CRITERIA}}
```

### 7. Tool Configuration Template (`templates/tool-template.json`)

```json
{
  "tool_name": "{{TOOL_NAME}}",
  "tool_id": "{{TOOL_ID}}",
  "version": "{{VERSION}}",
  "description": "{{DESCRIPTION}}",
  "category": "{{CATEGORY}}",
  "created_at": "{{TIMESTAMP}}",
  
  "security": {
    "trust_level": "{{TRUST_LEVEL}}",
    "validation_required": {{VALIDATION_REQUIRED}},
    "audit_operations": {{AUDIT_OPERATIONS}},
    "boundary_enforcement": {{BOUNDARY_ENFORCEMENT}}
  },
  
  "capabilities": {
    "operations": {{SUPPORTED_OPERATIONS}},
    "file_types": {{SUPPORTED_FILE_TYPES}},
    "max_file_size": "{{MAX_FILE_SIZE}}",
    "concurrent_operations": {{MAX_CONCURRENT}}
  },
  
  "validation": {
    "pre_operation": [
      "{{PRE_VALIDATION_1}}",
      "{{PRE_VALIDATION_2}}",
      "{{PRE_VALIDATION_3}}"
    ],
    "post_operation": [
      "{{POST_VALIDATION_1}}",
      "{{POST_VALIDATION_2}}",
      "{{POST_VALIDATION_3}}"
    ],
    "error_handling": {
      "validation_failure": "{{VALIDATION_FAILURE_ACTION}}",
      "security_violation": "{{SECURITY_VIOLATION_ACTION}}",
      "boundary_violation": "{{BOUNDARY_VIOLATION_ACTION}}"
    }
  },
  
  "restrictions": {
    "allowed_paths": {{ALLOWED_PATHS}},
    "forbidden_paths": {{FORBIDDEN_PATHS}},
    "allowed_commands": {{ALLOWED_COMMANDS}},
    "forbidden_commands": {{FORBIDDEN_COMMANDS}},
    "max_execution_time": {{MAX_EXECUTION_TIME}},
    "resource_limits": {
      "memory": "{{MEMORY_LIMIT}}",
      "cpu": "{{CPU_LIMIT}}",
      "disk": "{{DISK_LIMIT}}"
    }
  },
  
  "monitoring": {
    "performance_tracking": {{PERFORMANCE_TRACKING}},
    "usage_statistics": {{USAGE_STATISTICS}},
    "error_reporting": {{ERROR_REPORTING}},
    "security_monitoring": {{SECURITY_MONITORING}}
  },
  
  "integration": {
    "compatible_agents": {{COMPATIBLE_AGENTS}},
    "required_permissions": {{REQUIRED_PERMISSIONS}},
    "environment_variables": {{ENVIRONMENT_VARIABLES}},
    "configuration_files": {{CONFIGURATION_FILES}}
  }
}
```

## Override Mechanisms

### 8. Configuration Override System

```json
{
  "override_system": {
    "version": "2.0.0",
    "priority_hierarchy": [
      "/workspaces/agent-feed/prod/.claude/config.json",
      "/workspaces/agent-feed/prod/.claude/workspace.json",
      "/workspaces/agent-feed/prod/.claude/isolation.json",
      "/workspaces/agent-feed/prod/.claude/settings/*.json"
    ],
    
    "prevention_rules": {
      "parent_directory_configs": {
        "action": "ignore",
        "paths": [
          "/workspaces/agent-feed/.claude/**/*",
          "/workspaces/agent-feed/CLAUDE.md",
          "~/.claude/**/*",
          "/etc/claude/**/*"
        ]
      },
      
      "system_configs": {
        "action": "filter",
        "allowed_keys": [
          "system.version",
          "system.platform",
          "system.node_version"
        ],
        "forbidden_keys": [
          "workspace.*",
          "security.*",
          "isolation.*",
          "agents.*"
        ]
      },
      
      "environment_variables": {
        "action": "sandbox",
        "allowed_variables": [
          "NODE_ENV",
          "PATH",
          "HOME"
        ],
        "override_variables": {
          "CLAUDE_WORKSPACE": "/workspaces/agent-feed/prod",
          "CLAUDE_CONFIG_PATH": "/workspaces/agent-feed/prod/.claude",
          "CLAUDE_ISOLATION": "enabled"
        }
      }
    },
    
    "validation": {
      "schema_validation": true,
      "security_validation": true,
      "boundary_validation": true,
      "compatibility_check": true
    }
  }
}
```

### 9. Dynamic Configuration Loading

```javascript
// Configuration Loader with Override Prevention
class IsolatedConfigLoader {
  constructor() {
    this.basePath = '/workspaces/agent-feed/prod/.claude';
    this.preventParentLookup = true;
    this.enforceIsolation = true;
  }
  
  async loadConfiguration() {
    // Prevent parent directory scanning
    process.chdir('/workspaces/agent-feed/prod');
    
    // Override NODE_PATH to prevent parent module loading
    process.env.NODE_PATH = '/workspaces/agent-feed/prod/node_modules';
    
    // Load configurations in priority order
    const configs = await Promise.all([
      this.loadConfig('config.json'),
      this.loadConfig('workspace.json'),
      this.loadConfig('isolation.json'),
      this.loadSettings()
    ]);
    
    // Merge configurations with override prevention
    return this.mergeConfigurations(configs);
  }
  
  validatePath(path) {
    const canonicalPath = require('path').resolve(path);
    const allowedPrefix = '/workspaces/agent-feed/prod';
    
    if (!canonicalPath.startsWith(allowedPrefix)) {
      throw new Error(`Access denied: Path outside isolated environment`);
    }
    
    return canonicalPath;
  }
  
  preventParentAccess() {
    // Override common parent access methods
    const originalRequire = require;
    require = function(module) {
      if (module.includes('..') || module.startsWith('/workspaces/agent-feed/')) {
        throw new Error(`Module loading outside isolation boundary forbidden`);
      }
      return originalRequire(module);
    };
    
    // Override process.chdir
    const originalChdir = process.chdir;
    process.chdir = function(directory) {
      const resolvedDir = require('path').resolve(directory);
      if (!resolvedDir.startsWith('/workspaces/agent-feed/prod')) {
        throw new Error(`Directory change outside isolation boundary forbidden`);
      }
      return originalChdir(directory);
    };
  }
}
```

## Template Deployment Strategy

### 10. Automated Template Deployment

```bash
#!/bin/bash
# Template Deployment Script

BASE_DIR="/workspaces/agent-feed/prod"
CLAUDE_DIR="$BASE_DIR/.claude"
TIMESTAMP=$(date -u +"%Y-%m-%dT%H:%M:%SZ")
UUID=$(uuidgen)

# Create directory structure
mkdir -p $CLAUDE_DIR/{agents,tools,prompts,settings,isolation,templates,schemas,hooks,cache,metadata}
mkdir -p $CLAUDE_DIR/hooks/{pre-operation,post-operation,error-handling}

# Deploy configuration templates with variable substitution
sed -e "s/{{TIMESTAMP}}/$TIMESTAMP/g" \
    -e "s/{{UUID}}/$UUID/g" \
    templates/config.json.template > $CLAUDE_DIR/config.json

sed -e "s/{{TIMESTAMP}}/$TIMESTAMP/g" \
    -e "s/{{UUID}}/$UUID/g" \
    templates/workspace.json.template > $CLAUDE_DIR/workspace.json

# Set proper permissions
chmod 600 $CLAUDE_DIR/config.json
chmod 600 $CLAUDE_DIR/workspace.json
chmod 600 $CLAUDE_DIR/isolation.json
chmod -R 700 $CLAUDE_DIR/isolation/

# Validate deployment
node scripts/validate-configuration.js

echo "Configuration templates deployed successfully"
```

These comprehensive templates provide the foundation for complete Claude Code production isolation while maintaining flexibility and security. Each template includes extensive configuration options, validation rules, and override prevention mechanisms to ensure robust boundary enforcement.