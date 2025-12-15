# Agent Workspace Rules - Production Environment

## Overview

The production agent workspace (`/workspaces/agent-feed/prod/agent_workspace/`) is the **ONLY** area where production Claude has full read-write access. These rules ensure safe, organized, and efficient operations within this workspace.

## Directory Structure and Rules

### Core Directory Layout
```
/workspaces/agent-feed/prod/agent_workspace/
├── agents/                    # Individual agent working directories
│   ├── [agent-id]/           # Per-agent isolated workspace
│   │   ├── inputs/           # Input data and instructions
│   │   ├── outputs/          # Generated deliverables
│   │   ├── temp/            # Temporary working files
│   │   ├── logs/            # Agent-specific logs
│   │   └── metadata.json    # Agent configuration and status
├── shared/                   # Shared resources and collaboration
│   ├── templates/           # Reusable templates and patterns
│   ├── libraries/           # Shared code and utilities
│   ├── documentation/       # Collaborative documentation
│   └── communications/      # Inter-agent communication
├── data/                    # Data storage and management
│   ├── inputs/             # System-provided input data
│   ├── outputs/            # Final deliverables
│   ├── cache/              # Cached computations and results
│   └── archives/           # Historical data and backups
├── logs/                   # Centralized logging
│   ├── system/             # System operation logs
│   ├── agents/             # Agent activity logs
│   ├── errors/             # Error and exception logs
│   └── audit/              # Audit and compliance logs
└── config/                 # Workspace configuration
    ├── agent_configs/      # Agent-specific configurations
    ├── shared_configs/     # Shared configuration files
    └── workspace.json      # Main workspace configuration
```

## Access Control Rules

### Full Access Zones (Read-Write)
Production Claude has complete access to:
- All directories under `/prod/agent_workspace/`
- Creation, modification, and deletion of files and directories
- Execution of safe operations within the workspace
- Management of agent data and configurations

### Protected Operations
Even within the workspace, certain operations require validation:

#### File Operations
- **Maximum File Size**: 50MB per file (prevents resource exhaustion)
- **File Type Restrictions**: Executable files must be explicitly validated
- **Virus Scanning**: All uploaded content scanned for malware
- **Content Validation**: Text files validated for malicious content

#### Directory Operations
- **Depth Limit**: Maximum 10 levels deep (prevents infinite recursion)
- **Name Restrictions**: No special characters or system reserved names
- **Size Limits**: Maximum 1000 files per directory
- **Cleanup Requirements**: Temporary directories auto-cleaned after 24 hours

## Agent Isolation Rules

### Individual Agent Workspaces
Each agent operates in an isolated environment:

#### Workspace Allocation
```
/prod/agent_workspace/agents/[agent-id]/
├── inputs/          # Read-only input data for the agent
├── outputs/         # Agent deliverables and results
├── temp/           # Temporary files (auto-cleaned)
├── logs/           # Agent operation logs
└── metadata.json   # Agent status and configuration
```

#### Isolation Boundaries
- **Private Workspace**: Each agent has exclusive access to its directory
- **Shared Resources**: Limited access to shared libraries and templates
- **Communication**: Controlled inter-agent communication through shared channels
- **Resource Limits**: CPU, memory, and storage quotas per agent

### Resource Management
Each agent workspace is subject to:
- **Storage Quota**: 1GB maximum per agent
- **File Count Limit**: 10,000 files maximum per agent
- **Processing Time**: 1 hour maximum continuous operation
- **Memory Usage**: 512MB maximum RAM usage per operation

## Data Management Rules

### Input Data Handling
- **Validation Required**: All input data must be validated before processing
- **Sanitization**: Text inputs sanitized for malicious content
- **Format Verification**: File formats verified against expected types
- **Size Limits**: Maximum 10MB per input file

### Output Data Management
- **Quality Validation**: All outputs validated for completeness and correctness
- **Format Compliance**: Outputs must conform to specified formats
- **Version Control**: All significant outputs versioned and tracked
- **Backup Requirements**: Important outputs automatically backed up

### Temporary File Management
- **Automatic Cleanup**: Temp files deleted after 24 hours
- **Size Monitoring**: Temp directory size monitored and limited
- **Naming Convention**: Standardized naming for easy identification
- **Security Scanning**: Temp files scanned for malicious content

## Collaboration Rules

### Shared Resource Access
Agents can access shared resources under controlled conditions:

#### Template Usage
- **Read-Only Access**: Templates cannot be modified by individual agents
- **Version Control**: Template changes tracked and versioned
- **Approval Process**: New templates require approval before sharing
- **Usage Logging**: All template usage logged for analysis

#### Library Access
- **Sandboxed Execution**: Shared code executed in isolated environment
- **Security Validation**: All shared code validated for security
- **Performance Monitoring**: Library usage monitored for performance impact
- **Dependency Management**: Dependencies tracked and managed centrally

### Inter-Agent Communication
- **Controlled Channels**: Communication through designated shared directories
- **Message Validation**: All messages validated for content and format
- **Rate Limiting**: Message frequency limited to prevent spam
- **Audit Logging**: All communications logged for compliance

## Security Rules

### Access Control
- **Authentication**: All agent operations require valid authentication
- **Authorization**: Role-based access to different workspace areas
- **Session Management**: Limited session duration with auto-expiration
- **Activity Monitoring**: All activities logged and monitored

### Data Protection
- **No Sensitive Data**: Workspace cannot contain personally identifiable information
- **Encryption at Rest**: All stored data encrypted using AES-256
- **Secure Transmission**: All data transfers use encrypted connections
- **Access Auditing**: All data access events logged and audited

### Threat Prevention
- **Malware Scanning**: All files scanned for malicious content
- **Content Filtering**: Text content filtered for dangerous patterns
- **Execution Sandboxing**: All code execution in isolated sandbox
- **Network Isolation**: No direct network access from agent workspace

## Operational Rules

### Workspace Maintenance
- **Daily Cleanup**: Automated cleanup of temporary files and logs
- **Weekly Backup**: Full workspace backup every week
- **Monthly Audit**: Comprehensive security and compliance audit
- **Quarterly Review**: Workspace usage and efficiency review

### Performance Optimization
- **Resource Monitoring**: Continuous monitoring of CPU, memory, and storage
- **Performance Profiling**: Regular profiling of agent operations
- **Optimization Recommendations**: Automated suggestions for improvements
- **Capacity Planning**: Proactive capacity planning and scaling

### Error Handling
- **Graceful Degradation**: Operations continue despite non-critical errors
- **Error Recovery**: Automatic recovery from common error conditions
- **Error Reporting**: Comprehensive error logging and reporting
- **Escalation Procedures**: Clear escalation paths for critical errors

## Compliance and Auditing

### Audit Requirements
- **Complete Audit Trail**: All operations logged with full details
- **Data Integrity**: Regular integrity checks of all stored data
- **Access Logging**: All access attempts logged and analyzed
- **Compliance Reporting**: Regular compliance status reports

### Retention Policies
- **Log Retention**: Logs retained for 90 days minimum
- **Data Retention**: Output data retained based on business requirements
- **Backup Retention**: Backups retained for 1 year minimum
- **Archive Management**: Automated archiving of old data

### Violation Handling
- **Immediate Response**: Automatic blocking of policy violations
- **Investigation Process**: Systematic investigation of all violations
- **Corrective Actions**: Implementation of corrective measures
- **Process Improvement**: Continuous improvement based on violations

## Emergency Procedures

### Workspace Corruption
1. **Immediate Isolation**: Isolate corrupted workspace from system
2. **Data Recovery**: Attempt recovery from most recent backup
3. **Integrity Verification**: Verify integrity of recovered data
4. **Root Cause Analysis**: Investigate cause of corruption
5. **Prevention Measures**: Implement measures to prevent recurrence

### Security Incidents
1. **Incident Detection**: Automated detection of security incidents
2. **Immediate Response**: Immediate isolation and containment
3. **Forensic Analysis**: Detailed analysis of incident details
4. **Recovery Planning**: Systematic recovery and restoration
5. **Lessons Learned**: Documentation and process improvements

### Performance Issues
1. **Performance Monitoring**: Continuous monitoring of workspace performance
2. **Bottleneck Identification**: Automated identification of performance bottlenecks
3. **Resource Scaling**: Dynamic scaling of resources as needed
4. **Optimization Implementation**: Implementation of performance optimizations
5. **Monitoring Enhancement**: Enhancement of monitoring capabilities

These rules ensure that the production agent workspace operates safely, efficiently, and in compliance with all security and operational requirements while providing agents with the flexibility they need to perform their tasks effectively.