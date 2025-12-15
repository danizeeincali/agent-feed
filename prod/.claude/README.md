# Claude Code Production Configuration

## Overview

This directory contains the complete Claude Code configuration for production isolation of the agent-feed system. It provides complete environment isolation, security boundaries, and agent management capabilities.

## Directory Structure

```
/workspaces/agent-feed/prod/.claude/
├── config.json          # Main Claude Code configuration
├── settings.json        # Environment-specific settings
├── tools.json          # Tool access restrictions and policies
├── agents/             # Agent definitions and configurations
│   └── meta-agent.md   # Production meta-agent
└── README.md           # This documentation
```

## Configuration Files

### config.json - Core Configuration

Defines the fundamental Claude Code behavior for production:

- **Working Directory**: `/workspaces/agent-feed/prod`
- **Isolation**: Complete workspace boundary enforcement
- **Agent Discovery**: Limited to production agents only
- **Security**: Restricted operations and path access
- **Resource Limits**: Memory, CPU, and file operation limits

### settings.json - Environment Settings

Production-specific environment configuration:

- **Environment Type**: `isolated-production`
- **Security Mode**: Strict validation and audit trails
- **Path Restrictions**: Blocked access to development directories
- **Integration**: MCP, Claude Flow, and AgentLink support
- **Monitoring**: Performance tracking and health checks

### tools.json - Tool Policies

Tool access restrictions and security policies:

- **File Operations**: Restricted to production workspace
- **System Commands**: Limited command set with validation
- **Network Access**: Minimal external connectivity
- **Rate Limiting**: Prevents resource exhaustion
- **Audit Trail**: Complete operation logging

## Agent Configuration

### meta-agent.md

The production meta-agent is configured for:

- **Agent-Feed System Management**: Complete application lifecycle
- **SPARC Methodology**: Specification, Pseudocode, Architecture, Refinement, Completion
- **Production Boundaries**: Strict workspace isolation
- **Security Compliance**: All operations within approved boundaries

## Security Features

### Complete Isolation

- **Workspace Boundaries**: Cannot access parent directories
- **Path Restrictions**: Blocked access to `/src`, `/frontend`, `/docs`, `/tests`
- **Operation Validation**: All file and system operations validated
- **Resource Limits**: Prevents resource exhaustion attacks

### Audit and Monitoring

- **Complete Audit Trail**: All operations logged with timestamps
- **Security Monitoring**: Suspicious activity detection
- **Performance Tracking**: Resource usage and bottleneck identification
- **Health Checks**: Continuous system health validation

### Access Control

- **Read-Only Paths**: System instructions and configuration directories
- **Restricted Commands**: Limited to safe system operations
- **Rate Limiting**: Prevents abuse and resource exhaustion
- **Confirmation Required**: Dangerous operations require explicit approval

## Usage

### Initialization

```bash
# Navigate to production directory
cd /workspaces/agent-feed/prod

# Start Claude Code with production configuration
claude
```

### Agent Management

```bash
# The meta-agent is automatically discovered from:
# /workspaces/agent-feed/prod/.claude/agents/meta-agent.md

# Agent operations are restricted to:
# /workspaces/agent-feed/prod/agent_workspace/
```

### Configuration Validation

```bash
# Validate configuration integrity
node /workspaces/agent-feed/prod/scripts/validate-config.js

# Test isolation boundaries
node /workspaces/agent-feed/prod/scripts/test-isolation.js
```

## Integration Points

### MCP (Model Context Protocol)

- **Claude Flow Integration**: SPARC methodology and swarm coordination
- **Neural Learning**: Pattern recognition and optimization
- **Performance Monitoring**: Real-time metrics and alerting

### AgentLink API

- **System Health**: Status updates and monitoring
- **Real-time Communication**: WebSocket integration
- **Performance Metrics**: API response times and system health

### Production System

- **Agent Workspace**: `/workspaces/agent-feed/prod/agent_workspace/`
- **System Instructions**: `/workspaces/agent-feed/prod/system_instructions/` (read-only)
- **Logging**: `/workspaces/agent-feed/prod/logs/`
- **Monitoring**: `/workspaces/agent-feed/prod/monitoring/`

## Validation and Testing

### Configuration Integrity

- **JSON Validation**: All configuration files are valid JSON
- **Path Validation**: All paths exist and are accessible
- **Permission Validation**: File and directory permissions are correct
- **Isolation Testing**: Boundary enforcement verification

### Security Testing

- **Access Control**: Verify restricted path blocking
- **Command Filtering**: Test blocked command prevention
- **Rate Limiting**: Validate operation throttling
- **Audit Trail**: Confirm complete operation logging

### Performance Testing

- **Resource Limits**: Test memory and CPU constraints
- **Operation Timeouts**: Verify timeout enforcement
- **Concurrent Operations**: Test multi-agent coordination
- **Health Monitoring**: Validate monitoring accuracy

## Troubleshooting

### Common Issues

1. **Permission Denied**: Check file permissions and path restrictions
2. **Configuration Invalid**: Validate JSON syntax and structure
3. **Agent Not Found**: Verify agent path and configuration
4. **Resource Limits**: Check memory and CPU usage

### Diagnostic Commands

```bash
# Check configuration validity
jsonlint /workspaces/agent-feed/prod/.claude/config.json

# Verify agent discovery
ls -la /workspaces/agent-feed/prod/.claude/agents/

# Test isolation boundaries
node -e "console.log(process.cwd())"
```

### Log Analysis

```bash
# View Claude logs
tail -f /workspaces/agent-feed/prod/logs/claude.log

# Check audit trail
tail -f /workspaces/agent-feed/prod/logs/audit.log

# Monitor agent activity
tail -f /workspaces/agent-feed/prod/agent_workspace/logs/*.log
```

## Maintenance

### Regular Tasks

1. **Log Rotation**: Prevent log files from consuming excessive disk space
2. **Configuration Backup**: Regular backup of configuration files
3. **Security Updates**: Keep all dependencies and tools updated
4. **Performance Monitoring**: Regular performance and security audits

### Updates and Changes

- **Configuration Changes**: All changes must be validated and tested
- **Agent Updates**: Agent modifications must maintain security boundaries
- **Tool Updates**: New tools must be reviewed and approved
- **Security Patches**: Priority updates for security vulnerabilities

## Support and Documentation

### Resources

- **Claude Code Documentation**: https://docs.claude.ai/
- **MCP Protocol**: https://modelcontextprotocol.io/
- **Agent Feed Repository**: Local system documentation

### Contact

For issues with this production configuration:

1. Check logs and diagnostic information
2. Validate configuration integrity
3. Test isolation boundaries
4. Review security policies

---

**Production Configuration v2.0** - Complete isolation, security, and agent management for the agent-feed system.