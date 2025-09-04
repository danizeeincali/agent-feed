# Directory Structure Specification for Claude Code Production Isolation

## Overview

This document provides the complete directory structure specification for implementing Claude Code production isolation within `/workspaces/agent-feed/prod/`. The structure ensures complete containment, self-sufficiency, and security isolation.

## Complete Directory Structure

```
/workspaces/agent-feed/prod/
├── .claude/                                    # 🔒 CLAUDE CODE CONFIGURATION ROOT
│   ├── config.json                            # Main Claude configuration
│   ├── workspace.json                         # Workspace-specific settings
│   ├── version.json                           # Version and compatibility info
│   ├── isolation.json                         # Isolation enforcement config
│   │
│   ├── agents/                                # 🤖 AGENT DEFINITIONS
│   │   ├── meta-agent.md                     # Production meta-agent
│   │   ├── production-validator.md           # Production validation agent
│   │   ├── system-monitor.md                 # System monitoring agent
│   │   ├── security-guardian.md              # Security enforcement agent
│   │   ├── performance-analyzer.md           # Performance monitoring
│   │   ├── log-analyzer.md                   # Log analysis agent
│   │   ├── backup-manager.md                 # Backup operations agent
│   │   ├── health-checker.md                 # Health monitoring agent
│   │   ├── compliance-auditor.md             # Compliance checking
│   │   └── registry.json                     # Agent registry database
│   │
│   ├── tools/                                 # 🛠️ CUSTOM TOOL CONFIGURATIONS
│   │   ├── file-operations.json              # Secure file operations
│   │   ├── network-access.json               # Network restrictions
│   │   ├── security-tools.json               # Security tooling
│   │   ├── monitoring-tools.json             # Monitoring utilities
│   │   ├── validation-tools.json             # Validation utilities
│   │   ├── audit-tools.json                  # Audit and compliance
│   │   └── custom-commands.json              # Custom command definitions
│   │
│   ├── prompts/                               # 📝 SYSTEM PROMPTS
│   │   ├── system-prompt.md                  # Main system prompt
│   │   ├── security-prompt.md                # Security guidelines
│   │   ├── isolation-prompt.md               # Isolation enforcement
│   │   ├── agent-coordination-prompt.md      # Agent coordination
│   │   ├── error-handling-prompt.md          # Error handling guidelines
│   │   ├── compliance-prompt.md              # Compliance requirements
│   │   └── user-interaction-prompt.md        # User interaction guidelines
│   │
│   ├── settings/                              # ⚙️ ENVIRONMENT SETTINGS
│   │   ├── environment.json                  # Environment variables
│   │   ├── paths.json                        # Path configurations
│   │   ├── permissions.json                  # Permission matrix
│   │   ├── features.json                     # Feature toggles
│   │   ├── integrations.json                 # Integration settings
│   │   ├── performance.json                  # Performance tuning
│   │   └── logging.json                      # Logging configuration
│   │
│   ├── isolation/                             # 🛡️ ISOLATION ENFORCEMENT
│   │   ├── path-whitelist.json               # Allowed file paths
│   │   ├── path-blacklist.json               # Forbidden file paths
│   │   ├── command-whitelist.json            # Allowed commands
│   │   ├── command-blacklist.json            # Forbidden commands
│   │   ├── network-rules.json                # Network access rules
│   │   ├── validation-rules.json             # Boundary validation rules
│   │   ├── security-policies.json            # Security enforcement policies
│   │   └── boundary-definitions.json         # Boundary definitions
│   │
│   ├── templates/                             # 📋 CONFIGURATION TEMPLATES
│   │   ├── agent-template.md                 # Standard agent template
│   │   ├── tool-template.json                # Standard tool template
│   │   ├── prompt-template.md                # Standard prompt template
│   │   ├── config-template.json              # Configuration templates
│   │   └── security-template.json            # Security templates
│   │
│   ├── schemas/                               # 📊 VALIDATION SCHEMAS
│   │   ├── config-schema.json                # Configuration validation
│   │   ├── agent-schema.json                 # Agent definition validation
│   │   ├── tool-schema.json                  # Tool configuration validation
│   │   ├── security-schema.json              # Security policy validation
│   │   └── isolation-schema.json             # Isolation rule validation
│   │
│   ├── hooks/                                 # 🪝 OPERATION HOOKS
│   │   ├── pre-operation/                    # Pre-operation hooks
│   │   │   ├── security-check.js            # Security validation
│   │   │   ├── boundary-validate.js         # Boundary validation
│   │   │   ├── permission-check.js          # Permission verification
│   │   │   └── audit-log.js                 # Audit logging
│   │   ├── post-operation/                   # Post-operation hooks
│   │   │   ├── cleanup.js                   # Resource cleanup
│   │   │   ├── metrics-update.js            # Metrics updating
│   │   │   ├── status-report.js             # Status reporting
│   │   │   └── compliance-check.js          # Compliance validation
│   │   └── error-handling/                   # Error handling hooks
│   │       ├── security-incident.js         # Security incident response
│   │       ├── boundary-violation.js        # Boundary violation handling
│   │       ├── system-error.js              # System error handling
│   │       └── recovery.js                  # Recovery procedures
│   │
│   ├── cache/                                 # 🗂️ CONFIGURATION CACHE
│   │   ├── agent-cache/                      # Cached agent definitions
│   │   ├── tool-cache/                       # Cached tool configurations
│   │   ├── validation-cache/                 # Cached validation results
│   │   └── performance-cache/                # Performance optimization cache
│   │
│   └── metadata/                              # 📋 METADATA STORAGE
│       ├── installation.json                 # Installation metadata
│       ├── version-history.json              # Version tracking
│       ├── security-status.json              # Security status
│       ├── performance-metrics.json          # Performance data
│       └── compliance-status.json            # Compliance tracking
│
├── agent_workspace/                           # 🏢 AGENT WORK AREA (Existing - Enhanced)
│   ├── outputs/                              # Agent deliverables
│   ├── temp/                                 # Temporary files
│   ├── logs/                                 # Agent operation logs
│   ├── data/                                 # Persistent agent data
│   ├── shared/                               # Shared resources between agents
│   ├── nld-agent/                            # NLD agent workspace (existing)
│   ├── meta-agent/                           # Meta-agent workspace
│   ├── security-guardian/                    # Security guardian workspace
│   ├── system-monitor/                       # System monitor workspace
│   └── [other agent workspaces]/             # Individual agent workspaces
│
├── config/                                    # 🔧 LEGACY CONFIGURATION (Backwards Compatibility)
│   ├── claude.config.js                     # Existing configuration (preserved)
│   ├── agents.json                          # Legacy agent configuration
│   ├── security.json                        # Legacy security settings
│   └── [other legacy configs]/              # Other existing configurations
│
├── system_instructions/                       # 📖 SYSTEM INSTRUCTIONS (Read-Only Integration)
│   ├── rules/                               # System rules (existing)
│   ├── architecture/                        # Architecture docs (existing)
│   ├── migration/                           # Migration guides (existing)
│   ├── api/                                 # API definitions (existing)
│   └── workspace/                           # Workspace rules (existing)
│
├── logs/                                      # 📊 SYSTEM LOGS (Enhanced)
│   ├── claude/                              # Claude Code operation logs
│   │   ├── startup.log                      # System startup logs
│   │   ├── configuration.log                # Configuration changes
│   │   ├── security.log                     # Security events
│   │   ├── performance.log                  # Performance metrics
│   │   ├── errors.log                       # Error logs
│   │   └── audit.log                        # Comprehensive audit trail
│   ├── agents/                              # Agent-specific logs
│   │   ├── meta-agent.log                   # Meta-agent operations
│   │   ├── security-guardian.log            # Security events
│   │   ├── system-monitor.log               # System monitoring
│   │   └── [other agents].log               # Other agent logs
│   ├── isolation/                           # Isolation enforcement logs
│   │   ├── boundary-violations.log          # Boundary violations
│   │   ├── access-control.log               # Access control events
│   │   ├── validation-failures.log          # Validation failures
│   │   └── security-incidents.log           # Security incidents
│   └── system/                              # System-level logs
│       ├── system-instruction-validation.log # Existing validation log
│       ├── resource-usage.log               # Resource utilization
│       ├── network-activity.log             # Network access logs
│       └── compliance.log                   # Compliance monitoring
│
├── monitoring/                                # 📈 MONITORING SYSTEM (Enhanced)
│   ├── dashboards/                          # Monitoring dashboards
│   │   ├── security-dashboard.json          # Security status dashboard
│   │   ├── performance-dashboard.json       # Performance monitoring
│   │   ├── isolation-dashboard.json         # Isolation status
│   │   └── agent-dashboard.json             # Agent monitoring
│   ├── metrics/                             # Metrics collection
│   │   ├── security-metrics.json            # Security metrics
│   │   ├── performance-metrics.json         # Performance data
│   │   ├── isolation-metrics.json           # Isolation effectiveness
│   │   └── agent-metrics.json               # Agent performance
│   ├── alerts/                              # Alert configurations
│   │   ├── security-alerts.json             # Security alert rules
│   │   ├── performance-alerts.json          # Performance alerts
│   │   ├── boundary-alerts.json             # Boundary violation alerts
│   │   └── system-alerts.json               # System health alerts
│   └── reports/                             # Generated reports
│       ├── daily-reports/                   # Daily status reports
│       ├── security-reports/                # Security assessment reports
│       ├── performance-reports/             # Performance analysis
│       └── compliance-reports/              # Compliance status reports
│
├── security/                                  # 🔐 SECURITY INFRASTRUCTURE (Enhanced)
│   ├── policies/                            # Security policies
│   │   ├── access-control.json              # Access control policies
│   │   ├── data-protection.json             # Data protection rules
│   │   ├── network-security.json            # Network security policies
│   │   └── incident-response.json           # Incident response procedures
│   ├── certificates/                        # Security certificates
│   ├── keys/                               # Encryption keys (secure storage)
│   ├── audit/                              # Security audit files
│   │   ├── access-logs/                    # Detailed access logs
│   │   ├── security-events/                # Security event details
│   │   └── compliance-records/             # Compliance documentation
│   └── validation/                          # Security validation tools
│       ├── boundary-validator.js           # Boundary validation script
│       ├── security-scanner.js             # Security scanning tools
│       └── compliance-checker.js           # Compliance validation
│
├── backup/                                   # 💾 BACKUP SYSTEM (Enhanced)
│   ├── configurations/                      # Configuration backups
│   │   ├── daily/                          # Daily configuration backups
│   │   ├── weekly/                         # Weekly configuration backups
│   │   └── monthly/                        # Monthly configuration backups
│   ├── agent-workspaces/                   # Agent workspace backups
│   ├── logs/                               # Log file backups
│   ├── security/                           # Security data backups
│   └── system-state/                       # System state snapshots
│
├── temp/                                     # 🗂️ TEMPORARY FILES (New)
│   ├── operations/                         # Temporary operation files
│   ├── cache/                              # Temporary cache files
│   ├── downloads/                          # Temporary downloads
│   └── processing/                         # Temporary processing files
│
├── scripts/                                  # 📜 OPERATIONAL SCRIPTS (Enhanced)
│   ├── initialization/                     # System initialization scripts
│   │   ├── setup-isolation.sh             # Isolation setup script
│   │   ├── configure-security.sh          # Security configuration
│   │   ├── validate-installation.sh       # Installation validation
│   │   └── initial-agent-setup.sh         # Agent setup script
│   ├── maintenance/                        # Maintenance scripts
│   │   ├── cleanup-temp.sh               # Temporary file cleanup
│   │   ├── rotate-logs.sh                # Log rotation
│   │   ├── backup-system.sh              # System backup
│   │   └── health-check.sh               # Health monitoring
│   ├── security/                          # Security scripts
│   │   ├── security-scan.sh              # Security scanning
│   │   ├── boundary-test.sh              # Boundary testing
│   │   ├── compliance-check.sh           # Compliance validation
│   │   └── incident-response.sh          # Incident response
│   └── utilities/                         # Utility scripts
│       ├── reset-workspace.sh            # Workspace reset
│       ├── agent-status.sh               # Agent status check
│       ├── system-info.sh                # System information
│       └── troubleshooting.sh            # Troubleshooting utilities
│
└── [existing prod files and directories]     # Existing production structure preserved
```

## Directory Permissions and Access Control

### Permission Matrix

| Directory | Read | Write | Execute | Owner | Group | Others |
|-----------|------|-------|---------|-------|-------|--------|
| `.claude/` | ✓ | ✓ | ✓ | claude | claude | r-- |
| `.claude/config.json` | ✓ | ✓ | - | claude | claude | r-- |
| `.claude/agents/` | ✓ | ✓ | ✓ | claude | claude | r-x |
| `.claude/isolation/` | ✓ | ✓ | - | claude | claude | r-- |
| `agent_workspace/` | ✓ | ✓ | ✓ | claude | claude | rwx |
| `system_instructions/` | ✓ | - | - | root | claude | r-- |
| `logs/` | ✓ | ✓ | - | claude | claude | r-- |
| `security/` | ✓ | ✓ | - | claude | security | r-- |
| `config/` | ✓ | - | - | claude | claude | r-- |

### Access Control Rules

```json
{
  "access_control": {
    "claude_config_root": {
      "path": "/workspaces/agent-feed/prod/.claude",
      "permissions": {
        "read": ["claude", "security-guardian"],
        "write": ["claude", "system-admin"],
        "execute": ["claude"]
      },
      "restrictions": {
        "no_external_access": true,
        "audit_all_changes": true,
        "backup_before_modify": true
      }
    },
    "isolation_configs": {
      "path": "/workspaces/agent-feed/prod/.claude/isolation",
      "permissions": {
        "read": ["claude", "security-guardian"],
        "write": ["system-admin"],
        "execute": ["none"]
      },
      "restrictions": {
        "immutable_during_operation": true,
        "require_validation": true,
        "log_all_access": true
      }
    },
    "agent_workspace": {
      "path": "/workspaces/agent-feed/prod/agent_workspace",
      "permissions": {
        "read": ["claude", "agents"],
        "write": ["claude", "agents"],
        "execute": ["claude", "agents"]
      },
      "restrictions": {
        "quota_enforced": true,
        "auto_cleanup": true,
        "isolation_enforced": true
      }
    }
  }
}
```

## File Creation Order and Dependencies

### Phase 1: Core Infrastructure
1. Create `.claude/` root directory
2. Deploy `config.json` and `workspace.json`
3. Set up `isolation/` directory with all policy files
4. Configure `settings/` with environment configurations

### Phase 2: Security Foundation
1. Deploy security policies and validation rules
2. Set up access control mechanisms
3. Configure boundary enforcement systems
4. Initialize audit and monitoring systems

### Phase 3: Agent Infrastructure
1. Create agent definition templates
2. Deploy core production agents
3. Set up agent discovery and registration
4. Configure agent workspace isolation

### Phase 4: Monitoring and Validation
1. Deploy monitoring dashboards and metrics
2. Set up validation and compliance systems
3. Configure alert and notification systems
4. Initialize backup and recovery systems

### Phase 5: Integration and Testing
1. Integrate with existing system instructions
2. Test boundary enforcement thoroughly
3. Validate agent functionality
4. Perform security and compliance testing

## Maintenance and Evolution

### Regular Maintenance Tasks
- **Daily**: Log rotation, temporary file cleanup, security scans
- **Weekly**: Configuration validation, backup verification, performance analysis
- **Monthly**: Compliance audits, security reviews, system optimization
- **Quarterly**: Architecture reviews, policy updates, disaster recovery testing

### Evolution Strategy
- **Version Control**: All configuration changes tracked and versioned
- **Rollback Capability**: Ability to rollback to previous configurations
- **Gradual Rollout**: New features tested in isolated environments first
- **Monitoring**: Continuous monitoring during changes and rollouts

### Scalability Considerations
- **Modular Design**: Configurations designed for easy scaling
- **Resource Management**: Automatic resource allocation and cleanup
- **Performance Optimization**: Built-in performance monitoring and tuning
- **Load Distribution**: Agent workload distribution and balancing

This directory structure provides the foundation for complete Claude Code production isolation while maintaining operational effectiveness and security compliance.