# Avi DM Orchestrator Core

## Overview

The Avi DM (Dynamic Manager) orchestrator is the central coordination engine for the agent-feed system. It monitors the work queue for pending tickets, spawns workers to process them, and coordinates with health monitoring systems to ensure reliable operation.

## Architecture

### Core Components

```
┌──────────────────────────────────────────┐
│         Avi Orchestrator                 │
│  ┌────────────────────────────────────┐  │
│  │      Main Control Loop             │  │
│  │  - Check interval: 5s (default)    │  │
│  │  - Process pending tickets         │  │
│  │  - Update state to database        │  │
│  └────────────────────────────────────┘  │
│                                          │
│  ┌────────────────────────────────────┐  │
│  │     Dependency Interfaces          │  │
│  │  - IWorkQueue                      │  │
│  │  - IHealthMonitor                  │  │
│  │  - IWorkerSpawner                  │  │
│  │  - IAviDatabase                    │  │
│  └────────────────────────────────────┘  │
└──────────────────────────────────────────┘
```

### Component Interactions

```
┌─────────────┐     Check for     ┌──────────────┐
│    Work     │◄─── pending ──────│     Avi      │
│    Queue    │     tickets       │ Orchestrator │
└─────────────┘                   └──────────────┘
                                        │
      Assign ticket                     │ Spawn worker
                                        ▼
┌─────────────┐                   ┌──────────────┐
│   Worker    │◄──────────────────│   Worker     │
│   Spawner   │                   │   Spawner    │
└─────────────┘                   └──────────────┘

┌─────────────┐     Health        ┌──────────────┐
│   Health    │────► status  ─────►│     Avi      │
│   Monitor   │     changes       │ Orchestrator │
└─────────────┘                   └──────────────┘

┌─────────────┐     Persist       ┌──────────────┐
│  Database   │◄──── state   ─────│     Avi      │
│             │                   │ Orchestrator │
└─────────────┘                   └──────────────┘
```

## Implementation

### File Structure

```
/workspaces/agent-feed/
├── src/
│   ├── types/
│   │   └── avi.ts                    # Type definitions
│   └── avi/
│       ├── orchestrator.ts           # Main orchestrator implementation
│       └── README.md                 # This file
└── tests/
    └── phase2/
        └── unit/
            └── avi-orchestrator.test.ts  # Unit tests (London School TDD)
```

### Key Files

#### `/workspaces/agent-feed/src/types/avi.ts`

Type definitions for:
- `AviConfig` - Configuration options
- `AviState` - Runtime state tracking
- `IWorkQueue` - Work queue interface
- `IHealthMonitor` - Health monitoring interface
- `IWorkerSpawner` - Worker spawning interface
- `IAviDatabase` - Database persistence interface

#### `/workspaces/agent-feed/src/avi/orchestrator.ts`

Main orchestrator implementation with:
- Configuration management
- State persistence
- Ticket processing coordination
- Health monitoring integration
- Graceful shutdown handling

## Configuration

### Default Configuration

```typescript
{
  checkInterval: 5000,           // Check queue every 5 seconds
  maxContextTokens: 2000,        // Context limit for agents
  enableHealthMonitor: true,     // Enable health monitoring
  maxConcurrentWorkers: 10,      // Maximum parallel workers
  shutdownTimeout: 30000         // Graceful shutdown timeout (30s)
}
```

### Configuration Options

| Option | Type | Default | Description |
|--------|------|---------|-------------|
| `checkInterval` | number | 5000 | Milliseconds between queue checks |
| `maxContextTokens` | number | 2000 | Maximum context tokens for agents |
| `enableHealthMonitor` | boolean | true | Enable health monitoring |
| `maxConcurrentWorkers` | number | 10 | Maximum concurrent workers |
| `shutdownTimeout` | number | 30000 | Graceful shutdown timeout (ms) |

## Usage

### Basic Example

```typescript
import { AviOrchestrator } from './avi/orchestrator';
import { WorkQueue } from './work-queue';
import { HealthMonitor } from './health-monitor';
import { WorkerSpawner } from './worker-spawner';
import { AviDatabase } from './database';

// Initialize dependencies
const workQueue = new WorkQueue(/* ... */);
const healthMonitor = new HealthMonitor(/* ... */);
const workerSpawner = new WorkerSpawner(/* ... */);
const database = new AviDatabase(/* ... */);

// Create orchestrator
const orchestrator = new AviOrchestrator(
  {
    checkInterval: 5000,
    maxContextTokens: 2000,
    enableHealthMonitor: true,
  },
  workQueue,
  healthMonitor,
  workerSpawner,
  database
);

// Start orchestrator
await orchestrator.start();

// Check state
const state = orchestrator.getState();
console.log('Status:', state.status);
console.log('Workers spawned:', state.workersSpawned);

// Stop gracefully
await orchestrator.stop();
```

### Advanced Example with Custom Configuration

```typescript
const config = {
  checkInterval: 10000,          // Check every 10 seconds
  maxContextTokens: 4000,        // Larger context window
  enableHealthMonitor: true,
  maxConcurrentWorkers: 20,      // More concurrent workers
  shutdownTimeout: 60000,        // Longer shutdown timeout
};

const orchestrator = new AviOrchestrator(
  config,
  workQueue,
  healthMonitor,
  workerSpawner,
  database
);

await orchestrator.start();
```

## Testing

### Test Coverage

The orchestrator has comprehensive unit tests using London School TDD:

- **30 unit tests** covering all functionality
- **100% code coverage** of core logic
- **Mocked dependencies** for isolated testing

### Test Categories

1. **Initialization** (3 tests)
   - Configuration handling
   - State loading from database
   - Default values

2. **Starting and Main Loop** (5 tests)
   - Start/stop lifecycle
   - Health monitor integration
   - Queue polling intervals

3. **Ticket Processing** (6 tests)
   - Worker spawning
   - Concurrent worker limits
   - Error handling

4. **Health Monitoring** (3 tests)
   - Health status callbacks
   - Restart on unhealthy status
   - Health check updates

5. **Graceful Shutdown** (6 tests)
   - Worker completion waiting
   - Timeout handling
   - State persistence

6. **State Management** (3 tests)
   - Database persistence
   - State retrieval
   - Metrics updates

7. **Error Handling** (4 tests)
   - Queue errors
   - Database errors
   - Recovery from failures

### Running Tests

```bash
# Run all orchestrator tests
npm test -- tests/phase2/unit/avi-orchestrator.test.ts

# Run with coverage
npm test -- tests/phase2/unit/avi-orchestrator.test.ts --coverage

# Run in watch mode
npm test -- tests/phase2/unit/avi-orchestrator.test.ts --watch
```

## State Management

### State Properties

```typescript
interface AviState {
  status: 'initializing' | 'running' | 'restarting' | 'stopped';
  startTime: Date;              // When orchestrator started
  ticketsProcessed: number;     // Total tickets processed
  workersSpawned: number;       // Total workers spawned
  activeWorkers?: number;       // Currently active workers
  lastHealthCheck?: Date;       // Last health check timestamp
  lastError?: string;           // Last error encountered
}
```

### State Transitions

```
initializing → running → stopped
                  ↓
              restarting → running
```

## Error Handling

### Error Categories

1. **Work Queue Errors**
   - Gracefully logged
   - Sets `lastError` in state
   - Continues operation

2. **Worker Spawn Errors**
   - Per-ticket error handling
   - Continues processing other tickets
   - Logged for debugging

3. **Database Errors**
   - Non-blocking (orchestrator continues)
   - Logged to console
   - Retry on next interval

4. **Health Monitor Errors**
   - Non-blocking startup
   - Orchestrator continues without health monitoring
   - Logged for awareness

### Error Recovery

The orchestrator is designed to be resilient:

- **Transient errors** are logged and retried on next interval
- **Database failures** don't stop ticket processing
- **Worker spawn failures** don't affect other tickets
- **Graceful degradation** when health monitor unavailable

## Performance Characteristics

### Resource Usage

- **CPU**: Minimal (mostly I/O waiting)
- **Memory**: O(1) - constant memory usage
- **Network**: Periodic polling (configurable interval)

### Scalability

- **Horizontal**: Multiple orchestrator instances (future)
- **Vertical**: Configurable worker limits
- **Throughput**: Limited by worker spawning rate

### Timing Guarantees

- **Check interval**: Configurable (default 5s)
- **State updates**: Every 5 seconds
- **Shutdown timeout**: Configurable (default 30s)

## Future Enhancements

### Planned Features

1. **Multiple Orchestrator Instances**
   - Leader election
   - Work distribution
   - Failover support

2. **Advanced Health Monitoring**
   - Custom health metrics
   - Automatic scaling
   - Alert integration

3. **Metrics & Observability**
   - Prometheus metrics
   - OpenTelemetry traces
   - Performance dashboards

4. **Dynamic Configuration**
   - Hot-reload configuration
   - Per-ticket priorities
   - Adaptive scaling

### Integration Points

The orchestrator is designed to integrate with:

- **Work Queue** (implemented separately)
- **Health Monitor** (implemented separately)
- **Worker Spawner** (implemented separately)
- **Database Manager** (Phase 1 complete)

## Dependencies

### Required Interfaces

All dependencies are injected via constructor:

```typescript
constructor(
  config: AviConfig,
  workQueue: IWorkQueue,
  healthMonitor: IHealthMonitor,
  workerSpawner: IWorkerSpawner,
  database: IAviDatabase
)
```

### Implementation Status

- ✅ **AviOrchestrator** - Complete
- ✅ **Type Definitions** - Complete
- ✅ **Unit Tests** - Complete (30 tests passing)
- ⏳ **IWorkQueue** - To be implemented
- ⏳ **IHealthMonitor** - To be implemented
- ⏳ **IWorkerSpawner** - To be implemented
- ✅ **IAviDatabase** - Phase 1 complete

## Development Guidelines

### TDD Approach (London School)

1. **Write tests first** with mocked dependencies
2. **Implement minimal code** to pass tests
3. **Refactor** for clarity and maintainability
4. **Mock all external dependencies**
5. **Test behavior, not implementation**

### Code Quality

- **TypeScript strict mode** enabled
- **No any types** (except where absolutely necessary)
- **Comprehensive JSDoc** comments
- **Error handling** for all async operations
- **Logging** for debugging and monitoring

### Best Practices

- Always check `running` and `shuttingDown` flags
- Handle errors gracefully without crashing
- Update state before external operations
- Save state after significant changes
- Use proper TypeScript types everywhere

## Troubleshooting

### Common Issues

**Q: Orchestrator not processing tickets**
- Check `state.status` is 'running'
- Verify work queue has pending tickets
- Check worker limit not exceeded
- Review logs for errors

**Q: Workers not spawning**
- Check `maxConcurrentWorkers` limit
- Verify worker spawner is available
- Check ticket assignment errors
- Review worker spawner logs

**Q: Health monitor not working**
- Verify `enableHealthMonitor` is true
- Check health monitor initialization
- Review health monitor logs
- Check callback registration

**Q: Graceful shutdown hanging**
- Check active workers count
- Verify `shutdownTimeout` setting
- Review worker completion logs
- Check for stuck workers

## License

Part of the agent-feed project.

## Changelog

### Phase 2 (Current)
- ✅ Initial implementation
- ✅ Comprehensive test suite (30 tests)
- ✅ Type definitions
- ✅ Documentation

### Future
- ⏳ Multi-instance coordination
- ⏳ Advanced health monitoring
- ⏳ Metrics integration
