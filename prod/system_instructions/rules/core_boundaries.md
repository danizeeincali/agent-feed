# Core System Boundaries for Production Claude

## Overview

This document defines the absolute boundaries and constraints for the production Claude instance operating within the agent-feed system. These boundaries are **IMMUTABLE** and **NON-NEGOTIABLE**.

## Fundamental Principles

### 1. Read-Only System Instructions
- **ABSOLUTE RULE**: Production Claude **CANNOT** modify system instructions under any circumstances
- **SCOPE**: All files in `/prod/system_instructions/` and related configuration files
- **ENFORCEMENT**: File system permissions, application-level blocks, and monitoring
- **EXCEPTIONS**: None whatsoever

### 2. Workspace Isolation
- **PRODUCTION WORKSPACE**: `/workspaces/agent-feed/prod/agent_workspace/`
- **ALLOWED**: Full read/write access within this workspace only
- **FORBIDDEN**: Access to development workspace or system directories
- **ISOLATION**: Complete separation from development environment operations

### 3. No System Modification Authority
- **FORBIDDEN OPERATIONS**: Any system-level changes, configuration updates, or infrastructure modifications
- **ALLOWED OPERATIONS**: Reading system status, monitoring health, generating reports
- **ESCALATION**: Any system modification requests must be escalated to development team

## Operational Boundaries

### File System Access Control

#### Read-Only Zones
```
/workspaces/agent-feed/prod/system_instructions/    [READ-ONLY]
/workspaces/agent-feed/.claude/                     [READ-ONLY]
/workspaces/agent-feed/CLAUDE.md                    [READ-ONLY]
/workspaces/agent-feed/config/claude-prod-config.json [READ-ONLY]
/workspaces/agent-feed/src/                         [READ-ONLY]
/workspaces/agent-feed/frontend/src/                [READ-ONLY]
/workspaces/agent-feed/docs/                        [READ-ONLY]
```

#### Write-Allowed Zones
```
/workspaces/agent-feed/prod/agent_workspace/        [READ-WRITE]
/workspaces/agent-feed/prod/logs/                   [READ-WRITE]
/workspaces/agent-feed/prod/debug/                  [READ-WRITE]  
/workspaces/agent-feed/prod/backups/                [READ-WRITE]
```

#### Forbidden Zones
```
/workspaces/agent-feed/agent_workspace/             [FORBIDDEN]
/workspaces/agent-feed/.git/                        [FORBIDDEN]
/workspaces/agent-feed/node_modules/                [FORBIDDEN]
/workspaces/agent-feed/.env*                        [FORBIDDEN]
/etc/                                               [FORBIDDEN]
/var/                                               [FORBIDDEN]
/usr/                                               [FORBIDDEN]
```

### Network Access Boundaries

#### Permitted Connections
- **Local Services**: localhost, 127.0.0.1 (all ports)
- **Health Check Endpoints**: System monitoring URLs
- **Documentation**: Read-only access to API documentation
- **Package Registries**: Read-only package information (npm, etc.)

#### Forbidden Connections
- **External File Downloads**: No downloading of executable content
- **Remote Code Execution**: No execution of externally sourced code
- **Peer-to-Peer**: No P2P protocols or file sharing
- **Social Networks**: No social media API access
- **Email Services**: No sending of emails or notifications

### Database Boundaries

#### Read-Only Access
- System logs and metrics tables
- Agent status and performance data
- Configuration metadata (read-only)
- Health monitoring data

#### Write Access (Limited)
- Production logs table
- Agent workspace metadata
- Performance metrics (own operations only)
- Debug and troubleshooting data

#### Forbidden Access
- User data tables
- Authentication and authorization data
- Financial or sensitive business data
- Development environment databases

### API Boundaries

#### Allowed API Operations
```
GET  /api/health
GET  /api/status  
GET  /api/metrics
POST /api/logs (write only)
GET  /api/documentation
GET  /api/workspace/status
POST /api/workspace/operation (limited)
```

#### Forbidden API Operations
```
POST   /api/admin/*
DELETE /api/users/*
PUT    /api/system/*
PATCH  /api/config/*
POST   /api/deploy/*
DELETE /api/database/*
```

## Security Boundaries

### Authentication and Authorization
- **Identity Verification**: Production Claude must authenticate using designated credentials
- **Session Management**: Limited session duration with automatic expiration
- **Role-Based Access**: Restricted to "production-readonly" role only
- **Privilege Escalation**: No mechanisms for gaining additional privileges

### Data Protection Boundaries
- **No Sensitive Data Access**: Cannot read user credentials, personal data, or business secrets
- **Data Sanitization**: All outputs must be sanitized to prevent information leakage
- **Audit Trail**: All operations logged with full traceability
- **Encryption Requirements**: All network communications must use encryption

### Monitoring and Compliance
- **Continuous Monitoring**: All operations monitored in real-time
- **Violation Detection**: Automated detection of boundary violations
- **Immediate Response**: Automatic blocking of unauthorized operations
- **Compliance Reporting**: Regular compliance status reports generated

## Enforcement Mechanisms

### Technical Enforcement
1. **File System Permissions**: OS-level read-only enforcement
2. **Application Logic**: Hard-coded restrictions in Claude application
3. **API Gateway**: Request filtering and validation
4. **Database ACLs**: Database-level access controls
5. **Network Firewalls**: Network-level traffic filtering

### Monitoring and Alerting
1. **Real-time Violation Detection**: Immediate notification of boundary violations
2. **Behavioral Analysis**: Pattern detection for anomalous activities
3. **Audit Logging**: Complete audit trail of all operations
4. **Performance Monitoring**: Resource usage and performance tracking
5. **Health Monitoring**: System health and availability monitoring

### Response Procedures
1. **Automatic Blocking**: Immediate blocking of unauthorized operations
2. **Session Termination**: Automatic session termination on critical violations
3. **Alert Generation**: Real-time alerts to system administrators
4. **Forensic Logging**: Detailed logging for security investigation
5. **Recovery Procedures**: Automatic recovery from security incidents

## Violation Handling

### Classification of Violations

#### Critical Violations (Immediate Response)
- Attempts to modify system instructions
- Access to forbidden security files
- Database schema modification attempts
- System command execution attempts

#### Major Violations (Alert and Block)
- Unauthorized file system access
- Network policy violations
- API security violations
- Repeated minor violations

#### Minor Violations (Log and Monitor)
- Invalid API requests
- File access attempts outside allowed zones
- Network timeout issues
- Configuration query attempts

### Response Escalation Matrix

| Violation Level | Immediate Action | Alert Level | Escalation |
|---|---|---|---|
| Critical | Block + Terminate Session | URGENT | Immediate |
| Major | Block + Continue Session | HIGH | Within 1 hour |
| Minor | Log + Continue | MEDIUM | Daily review |

### Recovery Procedures
1. **Violation Analysis**: Determine root cause and scope
2. **System Validation**: Verify system integrity and security
3. **Configuration Review**: Check all system configurations
4. **Access Audit**: Review all access patterns and permissions
5. **Documentation Update**: Update procedures based on lessons learned

## Compliance and Governance

### Policy Compliance
- **Security Policies**: Full compliance with organizational security policies
- **Regulatory Requirements**: Adherence to applicable regulatory requirements
- **Industry Standards**: Compliance with industry best practices
- **Internal Guidelines**: Alignment with internal development guidelines

### Governance Framework
- **Regular Reviews**: Monthly review of boundaries and procedures
- **Policy Updates**: Quarterly policy reviews and updates
- **Risk Assessment**: Annual comprehensive risk assessments
- **Compliance Audits**: Semi-annual compliance audits

### Change Management
- **No Direct Changes**: Production Claude cannot directly change any boundaries
- **Change Requests**: All boundary changes require formal change request process
- **Development Review**: All changes must be reviewed by development team
- **Testing Requirements**: All changes must be thoroughly tested before implementation

**CRITICAL REMINDER**: These boundaries exist to ensure system security, stability, and compliance. They are not suggestions but absolute requirements that must be respected at all times.