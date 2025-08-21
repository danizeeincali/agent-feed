# System Instructions - READ ONLY

🚨 **CRITICAL: This directory is read-only for the production Claude instance**

## Overview

This directory contains **system instructions** that the production Claude instance can read but **NEVER modify**. It serves as a communication channel from the development system to the production instance.

## Directory Structure

```
system_instructions/
├── README.md                    # This file - overview and rules
├── api/                        # API definitions and contracts
│   ├── allowed_operations.json # Operations prod is allowed to perform  
│   ├── forbidden_operations.json # Operations prod is forbidden from
│   └── endpoint_contracts.json # Complete API specifications
├── rules/                      # System rules and boundaries
│   ├── core_boundaries.md      # Immutable system boundaries
│   └── operation_limits.md     # Resource and operational limits
├── workspace/                  # Workspace guidelines
│   └── agent_workspace_rules.md # Where and how agents should work
├── architecture/               # System architecture documentation
│   └── system_overview.md      # Complete system architecture
└── migration/                  # Migration instructions
    ├── workspace_migration_plan.md # How to migrate agent_workspace
    └── validation_checkpoints.md   # Validation procedures
```

## 🔒 Protection Mechanisms

### Multi-Layer Security
1. **File System Permissions**: All files have 444 (read-only) permissions
2. **Directory Permissions**: All directories have 555 (read+execute only) permissions  
3. **Content Protection**: Immutable system rules and boundaries
4. **Continuous Monitoring**: Real-time violation detection and prevention

### Access Rules for Production Claude
- ✅ **CAN READ**: All files in this directory and subdirectories
- ✅ **CAN REFERENCE**: Use information for decision making
- ❌ **CANNOT WRITE**: No file creation, modification, or deletion
- ❌ **CANNOT EXECUTE**: No script execution (read-only access only)

## 📋 Key Instructions for Production Claude

### Agent Workspace Rules
- **All agent work must go under `/prod/agent_workspace/`**
- Never create agent directories outside of designated workspace
- The agent workspace is protected and managed automatically

### System Boundaries  
- Production instance operates only within `/prod/` directory
- Read system instructions but never modify them
- Respect all boundaries defined in `rules/core_boundaries.md`

### Operation Limits
- Follow resource limits defined in `rules/operation_limits.md`  
- Only perform operations listed in `api/allowed_operations.json`
- Never attempt operations in `api/forbidden_operations.json`

## 🚨 Violation Monitoring

This directory is continuously monitored for:
- Modification attempts
- Unauthorized access patterns  
- Boundary violations
- Security breaches

Any violations will trigger:
- Immediate blocking of the operation
- Security alert generation
- Pattern learning for future prevention
- Audit trail recording

## 🔄 Updates

Only the **development system** can update these instructions. Production Claude will automatically see updates but can never make changes.

---

**Remember: This directory enables safe communication from dev to prod while maintaining strict security boundaries.**