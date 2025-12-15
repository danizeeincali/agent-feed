# Streaming Loop Protection - Testing Guide

## Overview

This document provides comprehensive testing strategies for the Streaming Loop Protection System, including unit tests, integration tests, E2E tests, and regression testing procedures.

## Test Strategy

### Test Pyramid

```
        ┌─────────────┐
        │  E2E Tests  │  <- Visual tests with screenshots
        │   (10%)     │
        ├─────────────┤
        │ Integration │  <- API and component tests
        │    (30%)    │
        ├─────────────┤
        │ Unit Tests  │  <- Core logic tests
        │   (60%)     │
        └─────────────┘
```

## Test Suites

### 1. Unit Tests

**Location**: `/tests/unit/protection/`

#### Timeout Protection Tests

```javascript
// tests/unit/protection/timeout-protection.test.js
describe('TimeoutProtection', () => {
  let timeoutProtection;

  beforeEach(() => {
    timeoutProtection = new TimeoutProtection({
      timeout: 1000 // 1 second for testing
    });
  });

  test('should complete request within timeout', async () => {
    const result = await timeoutProtection.wrapRequest('test-1', async () => {
      await sleep(500);
      return 'success';
    });

    expect(result).toBe('success');
  });

  test('should abort request on timeout', async () => {
    await expect(async () => {
      await timeoutProtection.wrapRequest('test-2', async (signal) => {
        await sleep(2000);
        return 'should not reach';
      });
    }).rejects.toThrow(TimeoutError);
  });

  test('should clean up resources on timeout', async () => {
    const cleanup = jest.fn();
    const tp = new TimeoutProtection({ timeout: 500, cleanup });

    try {
      await tp.wrapRequest('test-3', async () => {
        await sleep(1000);
      });
    } catch (e) {
      // Expected to timeout
    }

    expect(cleanup).toHaveBeenCalledWith('test-3');
  });

  test('should emit timeout event', async () => {
    const timeoutSpy = jest.fn();
    timeoutProtection.on('timeout', timeoutSpy);

    try {
      await timeoutProtection.wrapRequest('test-4', async () => {
        await sleep(2000);
      });
    } catch (e) {
      // Expected
    }

    expect(timeoutSpy).toHaveBeenCalledWith(
      expect.objectContaining({
        requestId: 'test-4',
        elapsedTime: expect.any(Number)
      })
    );
  });
});
```

#### Worker Monitor Tests

```javascript
// tests/unit/protection/worker-monitor.test.js
describe('WorkerMonitor', () => {
  let monitor;

  beforeEach(() => {
    monitor = new WorkerMonitor();
  });

  test('should register worker', () => {
    monitor.registerWorker('worker-1', {
      agentId: 'avi',
      ticketId: 'ticket-1'
    });

    const status = monitor.getStatus();
    expect(status.activeWorkers).toBe(1);
    expect(status.workers[0].workerId).toBe('worker-1');
  });

  test('should kill worker', async () => {
    const mockProcess = {
      kill: jest.fn()
    };

    monitor.registerWorker('worker-1', {
      agentId: 'avi',
      process: mockProcess
    });

    await monitor.killWorker('worker-1');

    expect(mockProcess.kill).toHaveBeenCalledWith('SIGTERM');
  });

  test('should emit worker events', (done) => {
    monitor.on('worker:created', (data) => {
      expect(data.workerId).toBe('worker-1');
      done();
    });

    monitor.registerWorker('worker-1', { agentId: 'avi' });
  });

  test('should collect worker metrics', () => {
    const mockProcess = {
      cpuUsage: () => ({ user: 1000, system: 500 }),
      memoryUsage: () => ({ heapUsed: 1024 * 1024 * 10 })
    };

    monitor.registerWorker('worker-1', {
      agentId: 'avi',
      process: mockProcess
    });

    const metrics = monitor.collectWorkerMetrics('worker-1');
    expect(metrics).toBeDefined();
    expect(metrics.memoryUsage).toBeCloseTo(10, 1);
  });
});
```

#### Circuit Breaker Tests

```javascript
// tests/unit/protection/circuit-breaker.test.js
describe('CircuitBreaker', () => {
  let breaker;

  beforeEach(() => {
    breaker = new CircuitBreaker({
      threshold: 3,
      window: 5000,
      recovery: 1000
    });
  });

  test('should execute operation when closed', async () => {
    const result = await breaker.execute(() => Promise.resolve('success'));
    expect(result).toBe('success');
    expect(breaker.state).toBe('closed');
  });

  test('should trip after threshold failures', async () => {
    // Trigger 3 failures
    for (let i = 0; i < 3; i++) {
      try {
        await breaker.execute(() => Promise.reject(new Error('fail')));
      } catch (e) {
        // Expected
      }
    }

    expect(breaker.state).toBe('open');
  });

  test('should reject requests when open', async () => {
    // Trip the breaker
    for (let i = 0; i < 3; i++) {
      try {
        await breaker.execute(() => Promise.reject(new Error('fail')));
      } catch (e) {}
    }

    // Should reject
    await expect(
      breaker.execute(() => Promise.resolve('should reject'))
    ).rejects.toThrow(CircuitBreakerOpenError);
  });

  test('should recover after timeout', async () => {
    // Trip the breaker
    for (let i = 0; i < 3; i++) {
      try {
        await breaker.execute(() => Promise.reject(new Error('fail')));
      } catch (e) {}
    }

    // Wait for recovery period
    await sleep(1500);

    // Should move to half-open and accept request
    const result = await breaker.execute(() => Promise.resolve('recovered'));
    expect(result).toBe('recovered');
    expect(breaker.state).toBe('closed');
  });

  test('should emit events on state changes', (done) => {
    let tripEventReceived = false;

    breaker.on('circuit-breaker:tripped', () => {
      tripEventReceived = true;
    });

    // Trip the breaker
    Promise.all([
      breaker.execute(() => Promise.reject(new Error('fail'))).catch(() => {}),
      breaker.execute(() => Promise.reject(new Error('fail'))).catch(() => {}),
      breaker.execute(() => Promise.reject(new Error('fail'))).catch(() => {})
    ]).then(() => {
      expect(tripEventReceived).toBe(true);
      done();
    });
  });
});
```

### 2. Integration Tests

**Location**: `/tests/integration/protection/`

#### API Integration Tests

```javascript
// tests/integration/protection/api-integration.test.js
describe('Protection API Integration', () => {
  let server;
  let request;

  beforeAll(async () => {
    server = await startTestServer();
    request = supertest(server);
  });

  afterAll(async () => {
    await stopTestServer(server);
  });

  test('GET /api/workers/status returns active workers', async () => {
    const response = await request
      .get('/api/workers/status')
      .set('Authorization', `Bearer ${TEST_TOKEN}`)
      .expect(200);

    expect(response.body.success).toBe(true);
    expect(response.body.data).toHaveProperty('activeWorkers');
    expect(response.body.data).toHaveProperty('workers');
  });

  test('POST /api/workers/:workerId/kill terminates worker', async () => {
    // Create a test worker
    const worker = await createTestWorker();

    const response = await request
      .post(`/api/workers/${worker.id}/kill`)
      .set('Authorization', `Bearer ${ADMIN_TOKEN}`)
      .send({ reason: 'Test termination' })
      .expect(200);

    expect(response.body.success).toBe(true);
    expect(response.body.message).toContain('terminated');
  });

  test('GET /api/protection/circuit-breaker returns state', async () => {
    const response = await request
      .get('/api/protection/circuit-breaker')
      .set('Authorization', `Bearer ${TEST_TOKEN}`)
      .expect(200);

    expect(response.body.data).toHaveProperty('state');
    expect(['closed', 'open', 'half-open']).toContain(response.body.data.state);
  });

  test('timeout protection triggers on long requests', async () => {
    const response = await request
      .post('/api/test/long-request')
      .set('Authorization', `Bearer ${TEST_TOKEN}`)
      .send({ duration: 35000 }) // Longer than timeout
      .expect(408); // Request Timeout

    expect(response.body.error).toContain('timeout');
  });
});
```

### 3. E2E Tests (Playwright)

**Location**: `/frontend/tests/e2e/streaming-loop-protection.spec.ts`

The E2E tests are fully documented in the test file itself. Key scenarios:

1. **Timeout Auto-Stop Test**: Verifies timeout protection triggers
2. **Monitoring Dashboard Test**: Checks worker display
3. **Manual Kill Test**: Tests worker termination
4. **Circuit Breaker Test**: Validates circuit breaker activation
5. **Metrics Display Test**: Verifies statistics rendering
6. **Concurrent Requests Test**: Tests system under load
7. **Queue Status Test**: Checks queue display

#### Running E2E Tests

```bash
# Run all protection tests
npm run test:e2e -- streaming-loop-protection

# Run specific test
npm run test:e2e -- streaming-loop-protection -g "should auto-stop query on timeout"

# Run with UI
npm run test:e2e:ui -- streaming-loop-protection

# Run in headed mode (see browser)
npm run test:e2e -- streaming-loop-protection --headed

# Generate screenshots
npm run test:e2e -- streaming-loop-protection --update-snapshots
```

### 4. Load Testing

**Location**: `/tests/load/protection-load-test.js`

```javascript
// tests/load/protection-load-test.js
import { check } from 'k6';
import http from 'k6/http';

export let options = {
  stages: [
    { duration: '1m', target: 10 },  // Ramp up
    { duration: '3m', target: 50 },  // Load
    { duration: '1m', target: 100 }, // Peak
    { duration: '1m', target: 0 },   // Ramp down
  ],
  thresholds: {
    'http_req_duration': ['p(95)<500'], // 95% under 500ms
    'timeouts': ['count<10'],           // Less than 10 timeouts
  },
};

export default function () {
  const res = http.post('http://localhost:3001/api/agent/query', {
    query: 'Test query for load testing',
    agent_id: 'avi'
  }, {
    headers: { 'Authorization': `Bearer ${__ENV.TEST_TOKEN}` }
  });

  check(res, {
    'status is 200': (r) => r.status === 200,
    'response time < 30s': (r) => r.timings.duration < 30000,
  });

  // Track timeouts
  if (res.status === 408) {
    console.log('Timeout occurred');
  }

  // Track circuit breaker
  if (res.status === 503 && res.body.includes('circuit')) {
    console.log('Circuit breaker open');
  }
}
```

**Running Load Tests**:

```bash
# Install k6
brew install k6  # macOS
# or download from k6.io

# Run load test
k6 run tests/load/protection-load-test.js

# Run with custom duration
k6 run --duration 5m tests/load/protection-load-test.js

# Run with custom VUs
k6 run --vus 100 tests/load/protection-load-test.js
```

## Test Coverage Requirements

### Minimum Coverage Targets

- Unit Tests: 80% code coverage
- Integration Tests: 70% API coverage
- E2E Tests: 100% user flow coverage

### Coverage Report

```bash
# Generate coverage report
npm run test:coverage

# View coverage report
open coverage/lcov-report/index.html
```

## Regression Testing

### Automated Regression Suite

```bash
# Run full regression suite
npm run test:regression

# Run protection-specific regression
npm run test:regression:protection
```

### Regression Test Checklist

- [ ] All timeout scenarios tested
- [ ] Worker kill functionality verified
- [ ] Circuit breaker states validated
- [ ] Metrics collection accurate
- [ ] WebSocket events working
- [ ] Database cleanup functioning
- [ ] Error handling robust
- [ ] Performance benchmarks met

## Visual Regression Testing

### Screenshot Comparison

```bash
# Generate baseline screenshots
npm run test:e2e -- streaming-loop-protection --update-snapshots

# Compare against baseline
npm run test:visual:compare

# Review differences
npm run test:visual:review
```

### Screenshot Organization

```
frontend/tests/screenshots/streaming-protection/
├── 01-timeout-initial-state.png
├── 02-timeout-query-submitted.png
├── 03-timeout-processing.png
├── 04-timeout-auto-stop-message.png
├── 05-timeout-final-state.png
├── 06-monitoring-dashboard-overview.png
├── ...
└── 30-queue-final-state.png
```

## Continuous Integration

### CI Pipeline Configuration

```yaml
# .github/workflows/protection-tests.yml
name: Protection System Tests

on:
  push:
    branches: [main, develop]
  pull_request:
    branches: [main]

jobs:
  unit-tests:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v2
      - name: Setup Node
        uses: actions/setup-node@v2
        with:
          node-version: '18'
      - run: npm install
      - run: npm run test:unit:protection
      - run: npm run test:coverage

  integration-tests:
    runs-on: ubuntu-latest
    services:
      postgres:
        image: postgres:14
        env:
          POSTGRES_PASSWORD: test
    steps:
      - uses: actions/checkout@v2
      - run: npm install
      - run: npm run test:integration:protection

  e2e-tests:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v2
      - run: npm install
      - run: npx playwright install
      - run: npm run test:e2e -- streaming-loop-protection
      - uses: actions/upload-artifact@v2
        if: always()
        with:
          name: playwright-screenshots
          path: frontend/tests/screenshots/

  load-tests:
    runs-on: ubuntu-latest
    if: github.ref == 'refs/heads/main'
    steps:
      - uses: actions/checkout@v2
      - uses: k6io/action@v0.1
        with:
          filename: tests/load/protection-load-test.js
```

## Test Data Management

### Test Fixtures

```javascript
// tests/fixtures/protection-fixtures.js
export const testWorkers = [
  {
    workerId: 'worker-test-1',
    agentId: 'avi',
    ticketId: 'ticket-1',
    status: 'active'
  },
  {
    workerId: 'worker-test-2',
    agentId: 'researcher',
    ticketId: 'ticket-2',
    status: 'completed'
  }
];

export const testTimeoutEvents = [
  {
    eventId: 'timeout-1',
    workerId: 'worker-test-1',
    elapsedTime: 30500,
    query: 'Test query that timed out'
  }
];

export const testCircuitBreakerStates = {
  closed: { state: 'closed', failureCount: 0 },
  open: { state: 'open', failureCount: 3, nextRetry: Date.now() + 60000 },
  halfOpen: { state: 'half-open', failureCount: 2 }
};
```

## Test Utilities

### Helper Functions

```javascript
// tests/utils/protection-helpers.js
export async function createTestWorker(options = {}) {
  const worker = await workerMonitor.registerWorker(
    options.workerId || 'test-worker',
    {
      agentId: options.agentId || 'avi',
      ticketId: options.ticketId || 'test-ticket',
      ...options
    }
  );
  return worker;
}

export async function triggerTimeout(workerId) {
  // Simulate timeout scenario
  await sleep(31000); // Exceed 30s timeout
}

export async function tripCircuitBreaker() {
  // Trigger 3 failures
  for (let i = 0; i < 3; i++) {
    try {
      await circuitBreaker.execute(() => Promise.reject(new Error('test')));
    } catch (e) {}
  }
}

export function assertWorkerStatus(worker, expectedStatus) {
  expect(worker.status).toBe(expectedStatus);
}
```

## Debugging Tests

### Debug Mode

```bash
# Run tests in debug mode
DEBUG=protection:* npm run test

# Run specific test in debug
npm run test:debug -- streaming-loop-protection
```

### Playwright Debug

```bash
# Run Playwright in debug mode
npx playwright test streaming-loop-protection --debug

# Pause on failure
npx playwright test streaming-loop-protection --pause-on-failure
```

## Test Maintenance

### Regular Tasks

- [ ] Update snapshots monthly
- [ ] Review and update test fixtures
- [ ] Check test execution time
- [ ] Update documentation
- [ ] Remove obsolete tests
- [ ] Add tests for new features

## Performance Benchmarks

### Expected Test Durations

- Unit Tests: < 30 seconds
- Integration Tests: < 2 minutes
- E2E Tests: < 10 minutes per scenario
- Load Tests: 5-10 minutes

## Troubleshooting Test Failures

### Common Issues

1. **Timeout in tests**: Increase test timeout or optimize code
2. **Flaky tests**: Add proper waits and assertions
3. **Screenshot differences**: Update baselines if intentional
4. **CI failures**: Check environment-specific issues

## Resources

- [Playwright Documentation](https://playwright.dev/)
- [Jest Documentation](https://jestjs.io/)
- [k6 Load Testing](https://k6.io/)
- [Testing Best Practices](https://testingjavascript.com/)
