# Operation Limits for Production Claude

## Overview

This document defines specific operational limits and constraints for the production Claude instance. These limits ensure system stability, security, and performance while preventing resource exhaustion and potential security issues.

## Resource Limits

### Compute Resources

#### CPU Usage Limits
- **Maximum CPU Usage**: 80% of available CPU cores
- **Sustained Usage**: No more than 60% CPU for longer than 5 minutes
- **Process Priority**: Nice level +10 (lower priority than system processes)
- **CPU Time Limit**: 1 hour maximum for any single operation
- **Concurrent Operations**: Maximum 10 CPU-intensive operations simultaneously

#### Memory Usage Limits
- **Maximum Memory**: 2GB total allocation
- **Per-Operation Limit**: 512MB maximum per individual operation
- **Buffer Limits**: 100MB maximum for file buffers
- **Cache Limits**: 256MB maximum for operational cache
- **Memory Leak Prevention**: Automatic cleanup after 1 hour of inactivity

#### Process Limits
- **Maximum Processes**: 50 child processes
- **Process Lifetime**: 2 hours maximum per process
- **Fork Limits**: No fork bombing - maximum 5 new processes per minute
- **Thread Limits**: 100 threads maximum
- **File Descriptor Limits**: 1000 open file descriptors maximum

### Storage Limits

#### Workspace Storage
```bash
# Production workspace storage quotas
/workspaces/agent-feed/prod/agent_workspace/
├── Total Quota: 10GB
├── Per Agent Limit: 1GB  
├── Shared Resources: 2GB
├── Logs: 1GB (auto-rotation)
├── Cache: 500MB (auto-cleanup)
├── Temp Files: 500MB (24h TTL)
└── Archives: 5GB (90-day retention)
```

#### File Operation Limits
- **Maximum File Size**: 50MB per individual file
- **Maximum Files Per Directory**: 10,000 files
- **Directory Depth**: 20 levels maximum
- **Filename Length**: 255 characters maximum
- **Total Workspace Files**: 100,000 files maximum

#### I/O Operation Limits
- **Read Operations**: 1000 operations per minute
- **Write Operations**: 500 operations per minute  
- **Delete Operations**: 100 operations per minute
- **File Transfer Rate**: 100MB/minute maximum
- **Disk I/O Priority**: Background priority (lower than system)

### Network Limits

#### Connection Limits
- **Concurrent Connections**: 50 outbound connections maximum
- **Connection Rate**: 10 new connections per minute
- **Connection Lifetime**: 30 minutes maximum per connection
- **Idle Timeout**: 5 minutes for idle connections
- **Total Bandwidth**: 10 Mbps maximum

#### Protocol Restrictions
```json
{
  "allowed_protocols": ["HTTP", "HTTPS", "WebSocket"],
  "forbidden_protocols": [
    "FTP", "FTPS", "SSH", "Telnet", "SMTP", "POP3", 
    "IMAP", "SNMP", "TFTP", "NFS", "SMB"
  ],
  "port_restrictions": {
    "allowed_outbound": [80, 443, 8080, 8443, 3000, 3001, 5000],
    "forbidden_outbound": [22, 23, 25, 110, 143, 993, 995, 1433, 3306, 5432],
    "no_inbound_listening": true
  }
}
```

#### Data Transfer Limits
- **Upload Limit**: 10MB per request
- **Download Limit**: 50MB per request
- **Total Daily Transfer**: 1GB maximum
- **Request Size**: 1MB maximum payload
- **Response Size**: 5MB maximum response

## Operational Limits

### API Operation Limits

#### Request Rate Limits
```json
{
  "global_limits": {
    "requests_per_minute": 1000,
    "requests_per_hour": 10000,
    "requests_per_day": 50000
  },
  "endpoint_specific_limits": {
    "/api/health": "100/minute",
    "/api/status": "50/minute", 
    "/api/metrics": "30/minute",
    "/api/logs": "10/minute",
    "/api/workspace/*": "200/minute"
  },
  "burst_allowance": {
    "max_burst": 50,
    "burst_window": "10s",
    "recovery_time": "60s"
  }
}
```

#### Operation Complexity Limits
- **Database Query Complexity**: Maximum 10 JOIN operations
- **Search Operations**: Maximum 1000 results per query
- **Batch Operations**: Maximum 100 items per batch
- **Aggregation Operations**: Maximum 1 million records
- **Export Operations**: Maximum 10MB per export

### Agent Operation Limits

#### Agent Resource Allocation
```json
{
  "per_agent_limits": {
    "memory": "100MB",
    "cpu_time": "10_minutes_per_hour",
    "storage": "1GB",
    "network_requests": "100/hour",
    "log_entries": "1000/hour"
  },
  "workspace_limits": {
    "max_files": "1000",
    "max_directories": "100", 
    "temp_file_ttl": "24_hours",
    "operation_timeout": "30_minutes"
  }
}
```

#### Agent Lifecycle Limits
- **Maximum Agent Lifetime**: 24 hours per agent instance
- **Idle Timeout**: 2 hours of inactivity triggers cleanup
- **Startup Timeout**: 5 minutes maximum to initialize
- **Operation Timeout**: 30 minutes maximum per operation
- **Cleanup Timeout**: 2 minutes maximum for cleanup operations

### Database Operation Limits

#### Query Limits
```sql
-- Read operation limits
SET SESSION max_execution_time = 30000;  -- 30 seconds
SET SESSION max_join_size = 1000000;     -- 1M rows max join
SET SESSION max_sort_length = 1000;      -- 1KB sort keys

-- Connection limits
SET SESSION max_connections_per_hour = 1000;
SET SESSION max_user_connections = 10;
```

#### Data Access Limits
- **Row Limit**: 10,000 rows per query result
- **Result Set Size**: 10MB maximum per query
- **Transaction Timeout**: 1 minute maximum
- **Lock Timeout**: 30 seconds maximum
- **Connection Pooling**: 5 connections maximum

## Security Operation Limits

### Authentication Limits
- **Login Attempts**: 5 failed attempts per hour
- **Session Duration**: 8 hours maximum
- **Token Refresh**: Once per hour maximum
- **Concurrent Sessions**: 3 sessions per user maximum
- **Password Complexity**: Minimum 12 characters with mixed case

### Authorization Limits
- **Permission Check Timeout**: 1 second maximum
- **Role Evaluation**: Maximum 10 roles per user
- **Policy Evaluation**: Maximum 50 policies per operation
- **Access Token Lifetime**: 1 hour maximum
- **Privilege Escalation**: Absolutely forbidden

### Audit and Monitoring Limits
- **Log Entry Size**: 5KB maximum per entry
- **Log Retention**: 90 days maximum
- **Metric Retention**: 1 year maximum
- **Alert Frequency**: Maximum 1 alert per minute per type
- **Forensic Data**: 30 days retention for security incidents

## Error Handling Limits

### Error Rate Thresholds
```json
{
  "acceptable_error_rates": {
    "client_errors_4xx": "1%",
    "server_errors_5xx": "0.1%", 
    "timeout_errors": "0.5%",
    "security_violations": "0.01%"
  },
  "alert_thresholds": {
    "error_rate_spike": "5x_baseline",
    "consecutive_errors": 10,
    "critical_error_rate": "1%",
    "security_incident_rate": "any"
  }
}
```

### Recovery Limits
- **Retry Attempts**: Maximum 3 retries per operation
- **Retry Backoff**: Exponential backoff with 1 second base
- **Circuit Breaker**: Open after 5 consecutive failures
- **Recovery Timeout**: 10 minutes maximum to recover
- **Failover Time**: 30 seconds maximum for automatic failover

## Enforcement Mechanisms

### Real-time Monitoring
```typescript
class OperationLimitsMonitor {
    private limits = {
        cpu: { max: 80, sustained: 60, timeWindow: 300000 }, // 5 minutes
        memory: { max: 2048, perOperation: 512 }, // MB
        network: { concurrent: 50, rateLimit: 10 }, // connections
        storage: { total: 10240, perAgent: 1024 } // MB
    };
    
    async enforceResourceLimits(operation: Operation): Promise<void> {
        const currentUsage = await this.getCurrentResourceUsage();
        
        // CPU limit enforcement
        if (currentUsage.cpu > this.limits.cpu.max) {
            throw new Error(`CPU usage limit exceeded: ${currentUsage.cpu}% > ${this.limits.cpu.max}%`);
        }
        
        // Memory limit enforcement
        if (currentUsage.memory > this.limits.memory.max) {
            throw new Error(`Memory usage limit exceeded: ${currentUsage.memory}MB > ${this.limits.memory.max}MB`);
        }
        
        // Storage limit enforcement
        if (currentUsage.storage > this.limits.storage.total) {
            throw new Error(`Storage limit exceeded: ${currentUsage.storage}MB > ${this.limits.storage.total}MB`);
        }
    }
}
```

### Automatic Circuit Breakers
```typescript
class CircuitBreakerManager {
    private breakers: Map<string, CircuitBreaker> = new Map();
    
    createCircuitBreaker(operationType: string): CircuitBreaker {
        return new CircuitBreaker({
            failureThreshold: 5,        // Open after 5 failures
            recoveryTimeout: 60000,     // 1 minute recovery time
            monitoringPeriod: 300000,   // 5 minute monitoring window
            onOpen: () => this.handleCircuitOpen(operationType),
            onHalfOpen: () => this.handleCircuitHalfOpen(operationType),
            onClose: () => this.handleCircuitClose(operationType)
        });
    }
    
    async executeWithCircuitBreaker<T>(
        operationType: string, 
        operation: () => Promise<T>
    ): Promise<T> {
        const breaker = this.getOrCreateBreaker(operationType);
        return breaker.execute(operation);
    }
}
```

### Quota Management
```typescript
class QuotaManager {
    private quotas: Map<string, Quota> = new Map();
    
    async checkQuota(resource: string, usage: number): Promise<boolean> {
        const quota = this.quotas.get(resource);
        if (!quota) return true;
        
        const currentUsage = await this.getCurrentUsage(resource);
        const wouldExceed = (currentUsage + usage) > quota.limit;
        
        if (wouldExceed) {
            await this.logQuotaViolation(resource, currentUsage, usage, quota.limit);
            return false;
        }
        
        return true;
    }
    
    async enforceQuota(resource: string, usage: number): Promise<void> {
        const allowed = await this.checkQuota(resource, usage);
        if (!allowed) {
            throw new QuotaExceededException(
                `Resource quota exceeded for ${resource}`
            );
        }
    }
}
```

## Violation Response Procedures

### Immediate Response Actions
1. **Operation Termination**: Immediately halt violating operation
2. **Resource Cleanup**: Clean up any allocated resources
3. **Violation Logging**: Log detailed violation information
4. **Alert Generation**: Generate appropriate alerts based on severity
5. **Evidence Preservation**: Preserve evidence for analysis

### Escalation Procedures
- **Minor Violations**: Log and continue monitoring
- **Major Violations**: Alert operations team within 15 minutes
- **Critical Violations**: Immediate escalation to security team
- **Repeated Violations**: Automatic session termination and investigation

### Recovery Actions
- **Resource Recovery**: Automatic cleanup of over-allocated resources
- **Service Recovery**: Restart affected services if necessary
- **Data Recovery**: Restore from backup if data corruption detected
- **Performance Recovery**: Implement performance optimization measures
- **Security Recovery**: Apply additional security measures as needed

These operational limits ensure that the production Claude instance operates within safe, secure, and performant boundaries while providing the flexibility needed for effective agent coordination and workspace management.