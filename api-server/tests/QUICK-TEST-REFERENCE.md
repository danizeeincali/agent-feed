# Streaming Loop Protection - Quick Test Reference

## Running Tests

```bash
cd /workspaces/agent-feed/api-server

# Run all tests
npm test

# Run unit tests only
npm test -- tests/unit/ --run

# Run specific test file
npm test -- tests/unit/loop-detector.test.js --run

# Run integration tests
npm test -- tests/integration/ --run

# Run E2E tests (requires backend)
npm test -- tests/e2e/ --run

# Run with coverage
npm test -- --coverage

# Watch mode
npm test -- tests/unit/ --watch
```

## Test Files Location

```
/api-server/tests/
├── helpers/
│   └── test-utils.js                      # Reusable test utilities
├── unit/
│   ├── loop-detector.test.js              # 12 tests
│   ├── circuit-breaker.test.js            # 11 tests
│   ├── worker-health-monitor.test.js      # 9 tests
│   └── emergency-monitor.test.js          # 8 tests
├── integration/
│   ├── auto-kill-workflow.test.js         # 10 tests
│   └── circuit-breaker-workflow.test.js   # 12 tests
└── e2e/
    └── streaming-protection-e2e.test.js   # 11 tests
```

## Test Coverage

| Component | Tests | Status |
|-----------|-------|--------|
| Loop Detector | 12 | ✅ Passing |
| Circuit Breaker | 11 | ✅ Passing |
| Worker Health Monitor | 9 | ✅ Passing |
| Emergency Monitor | 8 | ⏳ Pending impl |
| Auto-Kill Workflow | 10 | ⏳ Pending impl |
| Circuit Breaker Workflow | 12 | ⏳ Pending impl |
| E2E Protection | 11 | ⏳ Pending backend |
| **TOTAL** | **73** | 32 passing |

## Key Test Scenarios

### Unit Tests
- ✅ Loop detection (repetitive chunks)
- ✅ Stagnation detection (30s no progress)
- ✅ Circuit breaker opening (3 failures)
- ✅ Worker health monitoring
- ✅ Emergency monitor periodic checking

### Integration Tests
- ⏳ Auto-kill on timeout
- ⏳ Auto-kill on chunk limit
- ⏳ Auto-kill on loop detection
- ⏳ Circuit breaker blocking queries
- ⏳ Partial response saving

### E2E Tests
- ⏳ Normal query completion
- ⏳ Long-running query auto-kill
- ⏳ Emergency monitor detection
- ⏳ Monitoring endpoints
- ⏳ Cost tracking

## Quick Test Examples

### Run Loop Detector Tests
```bash
npm test -- tests/unit/loop-detector.test.js --run
```

### Run Circuit Breaker Tests
```bash
npm test -- tests/unit/circuit-breaker.test.js --run
```

### Run All Unit Tests
```bash
npm test -- tests/unit/ --run
```

### Generate Coverage Report
```bash
npm test -- --coverage
```

## Test Utilities

Import from `../helpers/test-utils.js`:

```javascript
import {
  createMockWorker,
  simulateStreamingLoop,
  waitForAutoKill,
  assertWorkerKilled,
  createMockMessage,
  createMockHealthMonitor,
  createMockCircuitBreaker,
  sleep,
} from '../helpers/test-utils.js';
```

## Expected Test Output

```
✓ tests/unit/loop-detector.test.js (12)
✓ tests/unit/circuit-breaker.test.js (11)
✓ tests/unit/worker-health-monitor.test.js (9)
⏳ tests/unit/emergency-monitor.test.js (8) - Pending implementation
⏳ tests/integration/auto-kill-workflow.test.js (10) - Pending implementation
⏳ tests/integration/circuit-breaker-workflow.test.js (12) - Pending implementation
⏳ tests/e2e/streaming-protection-e2e.test.js (11) - Requires backend

Test Files  3 passed | 4 pending (7)
     Tests  32 passed | 41 pending (73)
```

## Next Steps

1. **Implement Emergency Monitor**: `/api-server/services/emergency-monitor.js`
2. **Integrate Protection**: Modify `/api-server/worker/agent-worker.js`
3. **Add Monitoring Routes**: Create `/api-server/routes/monitoring.js`
4. **Run Tests**: `npm test -- --coverage`

## Documentation

See `/api-server/tests/STREAMING-PROTECTION-TEST-SUMMARY.md` for full details.
