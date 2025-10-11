# Health Monitor Quick Reference

**Quick reference for using the Health Monitor in Phase 2**

---

## Installation & Setup

```typescript
import { HealthMonitor } from './src/avi/health-monitor';
import type { HealthConfig, SystemHealth } from './src/types/health';

// 1. Create health monitor with custom config
const healthMonitor = new HealthMonitor(
  {
    maxContextTokens: 50000,    // Context limit
    checkInterval: 30000,       // 30 second checks
    restartThreshold: 0.9,      // 90% threshold
  },
  tokenCounter,                 // Your token counting function
  database,                     // DatabaseManager instance
  10                            // Max workers
);

// 2. Start monitoring
healthMonitor.start();

// 3. Stop monitoring (on shutdown)
healthMonitor.stop();
```

---

## Core Methods

### Check Avi Health
```typescript
const status = healthMonitor.checkHealth();
// Returns: HealthStatus
// {
//   healthy: true,
//   contextTokens: 25000,
//   uptime: 123456,
//   lastCheck: Date,
//   warnings: []
// }
```

### Check Database Health
```typescript
const dbHealth = await healthMonitor.checkDatabaseHealth();
// Returns: DatabaseHealth
// {
//   connected: true,
//   responseTime: 15
// }
```

### Check Worker Health
```typescript
const workerHealth = await healthMonitor.checkWorkerHealth();
// Returns: WorkerHealth
// {
//   healthy: true,
//   activeWorkers: 3,
//   maxWorkers: 10,
//   utilization: 30
// }
```

### Get System Health (Comprehensive)
```typescript
const systemHealth = await healthMonitor.getSystemHealth();
// Returns: SystemHealth (combines all checks)
// {
//   healthy: true,
//   contextTokens: 25000,
//   thresholdPercentage: 50,
//   isNearThreshold: false,
//   database: { connected: true, responseTime: 15 },
//   workers: { healthy: true, activeWorkers: 3, maxWorkers: 10 }
// }
```

---

## Event Handling

### Restart Required (Context Bloat)
```typescript
healthMonitor.on('restartRequired', (details) => {
  console.log(`Restart: ${details.reason}`);
  // details.contextTokens: current token count
  // details.threshold: max allowed

  await orchestrator.gracefulRestart();
});
```

### Health Status Changed
```typescript
healthMonitor.on('healthStatusChanged', (status) => {
  console.log(`Health changed: ${status.healthy}`);
  // Triggered on healthy <-> unhealthy transition
});
```

### Database Connection Lost
```typescript
healthMonitor.on('databaseConnectionLost', (error) => {
  console.error(`DB lost: ${error.error}`);
  // error.timestamp: when it happened

  await database.reconnect();
});
```

### Worker Overload
```typescript
healthMonitor.on('workerOverload', (stats) => {
  console.warn(`Overload: ${stats.activeWorkers}/${stats.maxWorkers}`);

  await orchestrator.scaleWorkers();
});
```

---

## Common Patterns

### Pattern 1: Auto-Restart on Context Bloat
```typescript
class AviOrchestrator {
  private healthMonitor: HealthMonitor;

  constructor(db: DatabaseManager) {
    this.healthMonitor = new HealthMonitor(
      undefined,  // Use defaults
      () => this.countTokens(),
      db
    );

    // Auto-restart on bloat
    this.healthMonitor.on('restartRequired', async () => {
      await this.gracefulRestart();
    });

    this.healthMonitor.start();
  }

  private countTokens(): number {
    return this.currentContextSize;
  }

  async gracefulRestart(): Promise<void> {
    await this.saveState();
    await this.workerPool.waitForCompletion(30000);
    this.currentContextSize = 1500;
  }
}
```

### Pattern 2: Dashboard Health Display
```typescript
// Express endpoint for health dashboard
app.get('/health', async (req, res) => {
  const systemHealth = await healthMonitor.getSystemHealth();

  res.json({
    status: systemHealth.healthy ? 'healthy' : 'unhealthy',
    components: {
      context: {
        tokens: systemHealth.contextTokens,
        percentage: systemHealth.thresholdPercentage,
        near_threshold: systemHealth.isNearThreshold,
      },
      database: {
        connected: systemHealth.database.connected,
        response_time_ms: systemHealth.database.responseTime,
      },
      workers: {
        active: systemHealth.workers.activeWorkers,
        max: systemHealth.workers.maxWorkers,
        utilization: systemHealth.workers.utilization,
      },
    },
    uptime_ms: systemHealth.uptime,
    warnings: systemHealth.warnings,
  });
});
```

### Pattern 3: Alerting Integration
```typescript
healthMonitor.on('restartRequired', async (details) => {
  // Send alert to Slack
  await slackClient.send({
    channel: '#alerts',
    text: `🔄 Avi restart required: ${details.details}`,
    priority: 'high',
  });
});

healthMonitor.on('databaseConnectionLost', async (error) => {
  // Send critical alert
  await pagerDuty.createIncident({
    title: 'Database connection lost',
    description: error.error,
    severity: 'critical',
  });
});
```

### Pattern 4: Health Check Before Operations
```typescript
class WorkerSpawner {
  async spawnWorker(ticket: WorkTicket): Promise<void> {
    // Check health before spawning
    const workerHealth = await healthMonitor.checkWorkerHealth();

    if (!workerHealth.healthy) {
      throw new Error(
        `Cannot spawn worker: pool at ${workerHealth.utilization}% capacity`
      );
    }

    // Proceed with spawning
    const worker = new AgentWorker(ticket);
    await worker.execute();
  }
}
```

---

## Decision Logic

### Determine if Restart is Needed
```typescript
const systemHealth = await healthMonitor.getSystemHealth();
const restartReason = healthMonitor.getRestartReason(systemHealth);

if (restartReason.shouldRestart) {
  console.log(`Restart: ${restartReason.reason}`);
  console.log(`Details: ${restartReason.details}`);

  switch (restartReason.reason) {
    case 'context_bloat':
      await orchestrator.gracefulRestart();
      break;
    case 'database_failure':
      await database.reconnect();
      break;
    case 'worker_overload':
      await orchestrator.scaleWorkers();
      break;
  }
}
```

### Quick Health Check
```typescript
// Simple boolean check
if (healthMonitor.shouldRestart()) {
  await orchestrator.gracefulRestart();
}
```

---

## Configuration Options

### Default Configuration
```typescript
const DEFAULT_CONFIG: HealthConfig = {
  maxContextTokens: 50000,     // 50K token limit
  checkInterval: 30000,        // Check every 30 seconds
  restartThreshold: 0.9,       // Restart at 90% capacity
};
```

### Custom Configuration Examples
```typescript
// Development: More frequent checks, higher threshold
const devConfig: HealthConfig = {
  maxContextTokens: 100000,    // Higher limit for dev
  checkInterval: 10000,        // Check every 10s
  restartThreshold: 0.95,      // Restart at 95%
};

// Production: Conservative settings
const prodConfig: HealthConfig = {
  maxContextTokens: 40000,     // Lower limit for safety
  checkInterval: 60000,        // Check every 60s
  restartThreshold: 0.85,      // Restart at 85%
};

// Testing: Aggressive monitoring
const testConfig: HealthConfig = {
  maxContextTokens: 10000,     // Small limit for testing
  checkInterval: 5000,         // Check every 5s
  restartThreshold: 0.8,       // Restart at 80%
};
```

---

## Token Counting Integration

### With Anthropic SDK
```typescript
import Anthropic from '@anthropic-ai/sdk';

const anthropic = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY });

// Token counter function
const tokenCounter = () => {
  // Count tokens in current Avi context
  const tokenCount = anthropic.countTokens({
    messages: aviContext.messages,
    system: aviContext.systemPrompt,
  });

  return tokenCount.input_tokens;
};

const healthMonitor = new HealthMonitor(
  undefined,
  tokenCounter,
  database
);
```

### Mock Token Counter (Testing)
```typescript
// For unit tests
const mockTokenCounter = jest.fn().mockReturnValue(25000);

const healthMonitor = new HealthMonitor(
  undefined,
  mockTokenCounter,
  mockDatabase
);

// Simulate context bloat
mockTokenCounter.mockReturnValue(52000);
const status = healthMonitor.checkHealth();
expect(status.healthy).toBe(false);
```

---

## Testing

### Unit Test Example
```typescript
describe('HealthMonitor', () => {
  let healthMonitor: HealthMonitor;
  let mockTokenCounter: jest.Mock;
  let mockDatabase: jest.Mocked<DatabaseManager>;

  beforeEach(() => {
    mockTokenCounter = jest.fn().mockReturnValue(30000);
    mockDatabase = {
      query: jest.fn().mockResolvedValue({ rows: [{ result: 1 }] }),
    } as any;

    healthMonitor = new HealthMonitor(
      undefined,
      mockTokenCounter,
      mockDatabase
    );
  });

  it('should detect context bloat', () => {
    mockTokenCounter.mockReturnValue(55000);

    const status = healthMonitor.checkHealth();

    expect(status.healthy).toBe(false);
    expect(status.warnings).toContain(
      expect.stringContaining('Context approaching limit')
    );
  });
});
```

---

## Troubleshooting

### Problem: Health checks not running
```typescript
// Solution: Make sure you called start()
healthMonitor.start();

// Verify monitoring is active
const metrics = healthMonitor.getMetrics();
console.log(`Uptime: ${metrics.uptime}ms`); // Should be > 0
```

### Problem: Database health always fails
```typescript
// Solution: Verify database is passed to constructor
const healthMonitor = new HealthMonitor(
  undefined,
  tokenCounter,
  database  // ← Make sure this is provided
);

// Test database connection separately
const dbHealth = await healthMonitor.checkDatabaseHealth();
console.log(dbHealth.error); // See specific error
```

### Problem: Events not firing
```typescript
// Solution: Register listeners BEFORE starting monitoring
healthMonitor.on('restartRequired', handler);
healthMonitor.start(); // ← Start after listener registration
```

### Problem: Token counter errors
```typescript
// Solution: Add error handling to token counter
const safeTokenCounter = () => {
  try {
    return anthropic.countTokens(context).input_tokens;
  } catch (error) {
    console.error('Token counting failed:', error);
    return 0; // Safe default
  }
};
```

---

## Best Practices

1. **Always start monitoring**
   ```typescript
   healthMonitor.start(); // Don't forget this!
   ```

2. **Register event handlers before starting**
   ```typescript
   healthMonitor.on('restartRequired', handler);
   healthMonitor.start();
   ```

3. **Stop monitoring on shutdown**
   ```typescript
   process.on('SIGTERM', () => {
     healthMonitor.stop();
     process.exit(0);
   });
   ```

4. **Use async/await for health checks**
   ```typescript
   const health = await healthMonitor.getSystemHealth();
   ```

5. **Provide all dependencies**
   ```typescript
   new HealthMonitor(config, tokenCounter, database, maxWorkers);
   ```

6. **Handle errors gracefully**
   ```typescript
   healthMonitor.on('databaseConnectionLost', async (error) => {
     await reconnectWithRetry();
   });
   ```

---

## File Locations

- **Implementation:** `/workspaces/agent-feed/src/avi/health-monitor.ts`
- **Types:** `/workspaces/agent-feed/src/types/health.ts`
- **Tests:** `/workspaces/agent-feed/tests/phase2/unit/health-monitor*.test.ts`
- **Documentation:** `/workspaces/agent-feed/PHASE-2-HEALTH-MONITOR-IMPLEMENTATION.md`

---

## Related Documentation

- [Phase 2 Architecture](/workspaces/agent-feed/PHASE-2-ARCHITECTURE.md)
- [Health Monitor Implementation](/workspaces/agent-feed/PHASE-2-HEALTH-MONITOR-IMPLEMENTATION.md)
- [TDD Context Composer Summary](/workspaces/agent-feed/TDD-CONTEXT-COMPOSER-SUMMARY.md)

---

**Last Updated:** 2025-10-10
**Version:** 1.0
**Status:** Production Ready ✅
