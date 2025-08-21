# Production System Instructions - READ-ONLY Directory

## 🚨 CRITICAL: READ-ONLY ACCESS ONLY

This directory contains the complete system instructions architecture for the production Claude instance. **NO MODIFICATIONS ARE PERMITTED**.

## Directory Structure

```
prod/system_instructions/
├── README.md                 # This file
├── api/                      # API definitions and contracts
│   ├── allowed_operations.json
│   ├── forbidden_operations.json
│   ├── endpoint_contracts.json
│   ├── response_schemas.json
│   └── websocket_protocols.json
├── rules/                    # System rules and boundaries
│   ├── core_boundaries.md
│   ├── operation_limits.md
│   ├── error_handling.md
│   ├── escalation_procedures.md
│   └── security_policies.md
├── workspace/                # Agent workspace guidelines
│   ├── agent_workspace_rules.md
│   ├── file_permissions.md
│   ├── directory_structure.md
│   ├── safety_protocols.md
│   └── collaboration_guidelines.md
├── architecture/             # Architecture documentation
│   ├── system_overview.md
│   ├── component_interactions.md
│   ├── data_flow.md
│   ├── security_model.md
│   └── integration_patterns.md
└── migration/                # Migration and integration plans
    ├── workspace_migration_plan.md
    ├── rollback_procedures.md
    ├── validation_checkpoints.md
    ├── integration_tests.md
    └── compatibility_matrix.md
```

## Protection Mechanisms

### File System Level
- All files: **444 permissions** (read-only)
- All directories: **555 permissions** (read + execute only)
- Ownership: **system admin only**
- Immutable flags set where supported

### Application Level
- Hardcoded write restrictions in production Claude
- API endpoint validation against whitelist
- Path traversal prevention
- Operation logging and auditing

### Monitoring Level
- Real-time file integrity monitoring
- Checksum verification on access
- Automatic corruption detection
- Alert system for modification attempts

### Recovery Level
- Immutable backup copies
- Automatic restoration on corruption
- Version control integration
- Emergency rollback procedures

## Access Patterns

### Allowed Operations (Production Claude)
- Read any file in this directory
- Execute validation scripts
- Access API documentation
- View system rules and guidelines
- Review architecture documentation

### Forbidden Operations (Production Claude)
- Write to any file in this directory
- Modify file permissions
- Create new files or directories
- Delete existing files
- Move or rename files
- Execute system modification commands

## Integration Points

### With Existing Systems
- **Regression Protection**: Integrated with structure validation
- **Agent Workspace**: Provides migration path for current workspace
- **WebSocket Monitoring**: Defines communication protocols
- **Error Recovery**: Specifies recovery procedures

### With Development Environment
- **Clear Boundaries**: Defines what prod can/cannot access
- **API Contracts**: Ensures consistent interfaces
- **Documentation Sync**: Single source of truth for system behavior

## Validation and Monitoring

### Continuous Validation
- File integrity checks every 5 minutes
- Permission verification hourly
- Backup validation daily
- Full system audit weekly

### Alert Conditions
- Any file modification attempt
- Permission changes detected
- Checksum mismatches found
- Unauthorized access attempts
- System instruction corruption

### Recovery Triggers
- File corruption detected
- Permission escalation attempted
- Backup integrity compromised
- System instruction unavailable

## Emergency Procedures

### If System Instructions Are Compromised
1. **Immediate Response**: Isolate production instance
2. **Damage Assessment**: Check scope of modifications
3. **Automatic Recovery**: Restore from verified backup
4. **Security Analysis**: Investigate compromise vector
5. **System Validation**: Verify complete restoration

### If Production Instance Gains Write Access
1. **Emergency Stop**: Halt production instance immediately
2. **Permission Audit**: Check all file permissions
3. **Access Log Review**: Analyze all recent operations
4. **System Restoration**: Restore to known-good state
5. **Root Cause Analysis**: Determine escalation method

## Maintenance Schedule

### Daily Tasks
- Automated integrity verification
- Permission consistency check
- Backup validation
- Access log review

### Weekly Tasks
- Full system audit
- Security policy review
- Performance analysis
- Documentation updates

### Monthly Tasks
- Complete security assessment
- Disaster recovery testing
- Compliance verification
- Process improvement review

## Support and Escalation

### Level 1: Automated Response
- File integrity restoration
- Permission reset
- Access blocking
- Alert generation

### Level 2: System Administration
- Manual investigation
- Advanced diagnostics
- Configuration review
- Security analysis

### Level 3: Development Team
- Architecture modifications
- Security policy updates
- System redesign
- Emergency procedures

**Remember: This directory is the authoritative source for production system behavior. Any modifications must be made through the development environment and proper deployment procedures.**