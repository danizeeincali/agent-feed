# Streaming Loop Protection System

## Overview

The Streaming Loop Protection System is a comprehensive 3-layer defense mechanism designed to prevent infinite streaming loops, runaway processes, and system resource exhaustion in the Agent Feed application.

## Problem Statement

Without proper safeguards, long-running AI agent queries can:
- Consume excessive server resources
- Block other users' requests
- Cause timeout issues in production
- Lead to poor user experience
- Result in system instability

## The 3-Layer Protection System

### Layer 1: Request Timeout Protection (30 seconds)

**Purpose**: Prevent individual requests from running indefinitely

**How It Works**:
```
User Query → API Server → Worker Process
                ↓
        [30s Timeout Monitor]
                ↓
        Auto-stop if exceeded
```

**Features**:
- Hard timeout at 30 seconds
- Automatic process termination
- User-friendly timeout message
- Graceful cleanup of resources

**User Experience**:
```
"Your request took longer than expected and was automatically stopped.
Please try simplifying your query or breaking it into smaller parts."
```

### Layer 2: Worker Monitoring & Manual Control

**Purpose**: Allow real-time monitoring and manual intervention

**Dashboard Features**:
- Active worker count
- Processing status for each worker
- Resource utilization metrics
- Manual kill button for runaway workers

**Monitoring UI**:
```
┌─────────────────────────────────────────┐
│  Worker Dashboard                        │
├─────────────────────────────────────────┤
│  Active Workers: 3                       │
│                                          │
│  Worker #1: Processing (15s elapsed)    │
│  [Kill Worker] [View Details]           │
│                                          │
│  Worker #2: Completed (5s)              │
│  Worker #3: Processing (28s elapsed)    │
│  [Kill Worker] [View Details]           │
└─────────────────────────────────────────┘
```

### Layer 3: Circuit Breaker Pattern

**Purpose**: Prevent cascading failures and system overload

**States**:
1. **Closed** (Normal): All requests processed normally
2. **Open** (Tripped): System paused after multiple failures
3. **Half-Open** (Recovery): Testing if system has recovered

**Trigger Conditions**:
- 3 consecutive failures within 5 minutes
- System resource utilization > 90%
- Error rate > 50% over 1 minute

**Recovery**:
- Automatic retry after 60 seconds
- Gradual reopening with limited requests
- Full recovery when success rate > 80%

**User Experience**:
```
"The system is temporarily paused due to multiple errors.
We're working to restore normal operation. Please try again in a moment."
```

## System Architecture

```
┌──────────────┐
│  User Query  │
└──────┬───────┘
       │
       ▼
┌──────────────────────────────────────────┐
│  Layer 1: Request Timeout (30s)          │
│  - Hard timeout enforcement              │
│  - Process termination                   │
│  - User notification                     │
└──────┬───────────────────────────────────┘
       │
       ▼
┌──────────────────────────────────────────┐
│  Layer 2: Worker Monitoring              │
│  - Active worker tracking                │
│  - Resource monitoring                   │
│  - Manual kill capability                │
└──────┬───────────────────────────────────┘
       │
       ▼
┌──────────────────────────────────────────┐
│  Layer 3: Circuit Breaker                │
│  - Failure tracking                      │
│  - Automatic trip on threshold           │
│  - Gradual recovery                      │
└──────────────────────────────────────────┘
```

## Configuration Options

### Timeout Settings

```javascript
// Default configuration
const PROTECTION_CONFIG = {
  requestTimeout: 30000,        // 30 seconds
  workerTimeout: 35000,         // 35 seconds (includes cleanup)
  circuitBreakerThreshold: 3,   // failures before trip
  circuitBreakerWindow: 300000, // 5 minutes
  circuitBreakerRecovery: 60000 // 1 minute
};
```

### Customizing Protection Levels

```javascript
// Adjust timeout for specific agent types
const config = {
  'analysis-agent': { timeout: 45000 },  // More time for analysis
  'quick-response': { timeout: 10000 },  // Fast responses only
  'default': { timeout: 30000 }
};
```

## Monitoring Guide

### Key Metrics to Watch

1. **Worker Health**:
   - Active workers count
   - Average processing time
   - Success vs. failure rate

2. **Timeout Statistics**:
   - Number of timeouts per hour
   - Queries that frequently timeout
   - Average query complexity

3. **Circuit Breaker Events**:
   - Trip frequency
   - Recovery time
   - Impact on user experience

### Dashboard Access

Navigate to: `/monitoring` or `/admin/workers`

**Available Views**:
- Real-time worker status
- Historical performance graphs
- Timeout event log
- Circuit breaker state history

## Best Practices

### For Users

1. **Break down complex queries**: Split large requests into smaller parts
2. **Use specific prompts**: Clear, focused questions get better results
3. **Monitor progress**: Watch for timeout warnings
4. **Retry with modifications**: If timeout occurs, simplify the query

### For Developers

1. **Implement proper cleanup**: Always clean up resources on timeout
2. **Log timeout events**: Track patterns to optimize performance
3. **Test edge cases**: Verify protection works under load
4. **Monitor metrics**: Set up alerts for unusual patterns

### For System Administrators

1. **Regular health checks**: Monitor worker dashboard daily
2. **Adjust thresholds**: Fine-tune based on actual usage patterns
3. **Review timeout logs**: Identify problematic query patterns
4. **Capacity planning**: Scale workers based on demand

## Troubleshooting

### Common Issues

**Issue**: Queries timing out frequently
- **Solution**: Review query complexity, consider increasing timeout for specific agents
- **Check**: Worker resource utilization, database performance

**Issue**: Circuit breaker triggering often
- **Solution**: Investigate underlying errors, check system health
- **Check**: Error logs, worker failure patterns, resource constraints

**Issue**: Workers not responding to kill command
- **Solution**: Implement force-kill after 5 seconds, restart worker service
- **Check**: Worker process health, system resource availability

### Debug Mode

Enable verbose logging:
```javascript
DEBUG=worker:*,protection:* npm run dev
```

View detailed timeout information:
```javascript
// Check worker logs
tail -f logs/worker-protection.log
```

## Testing

See [STREAMING-LOOP-PROTECTION-TESTING.md](./STREAMING-LOOP-PROTECTION-TESTING.md) for comprehensive testing guide.

### Quick Validation

```bash
# Run protection tests
npm run test:e2e -- streaming-loop-protection

# Test timeout protection
npm run test:protection:timeout

# Test circuit breaker
npm run test:protection:circuit-breaker
```

## Performance Impact

The protection system has minimal performance overhead:
- Request overhead: < 5ms per request
- Memory overhead: ~10MB for monitoring
- CPU overhead: < 1% during normal operation

## Security Considerations

- Worker kill commands require authentication
- Monitoring dashboard requires admin role
- Timeout logs are sanitized (no sensitive data)
- Circuit breaker state is not user-manipulable

## Future Enhancements

1. **Adaptive Timeouts**: Automatically adjust based on query complexity
2. **Predictive Monitoring**: ML-based prediction of timeout likelihood
3. **User-Specific Limits**: Custom timeouts per user tier
4. **Advanced Circuit Breaker**: Multi-level circuit breakers per service
5. **Load Balancing**: Distribute workers across multiple servers

## References

- [API Documentation](./STREAMING-LOOP-PROTECTION-API.md)
- [Implementation Guide](./STREAMING-LOOP-PROTECTION-IMPLEMENTATION.md)
- [Testing Guide](./STREAMING-LOOP-PROTECTION-TESTING.md)
- [Worker Architecture](../architecture/worker-system.md)

## Support

For issues or questions:
- GitHub Issues: [agent-feed/issues](https://github.com/your-org/agent-feed/issues)
- Documentation: [docs/](../)
- Support Email: support@agent-feed.com
