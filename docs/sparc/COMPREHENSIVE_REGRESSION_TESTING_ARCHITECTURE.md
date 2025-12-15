# SPARC Phase A: Comprehensive Regression Testing Architecture

## Multi-Layer Test Architecture Blueprint

### 1. ARCHITECTURAL OVERVIEW

```
┌─────────────────────────────────────────────────────────────────┐
│                    REGRESSION TEST ARCHITECTURE                  │
├─────────────────────────────────────────────────────────────────┤
│  ┌─────────────────┐  ┌─────────────────┐  ┌─────────────────┐  │
│  │   E2E TESTS     │  │  LOAD TESTING   │  │   MONITORING    │  │
│  │                 │  │                 │  │                 │  │
│  │ • Browser Auto  │  │ • Concurrent    │  │ • Metrics       │  │
│  │ • User Flows    │  │ • Performance   │  │ • Alerts        │  │
│  │ • UI Validation │  │ • Memory Leaks  │  │ • Dashboards    │  │
│  └─────────────────┘  └─────────────────┘  └─────────────────┘  │
├─────────────────────────────────────────────────────────────────┤
│  ┌─────────────────┐  ┌─────────────────┐  ┌─────────────────┐  │
│  │ INTEGRATION     │  │   API TESTS     │  │  ERROR RECOVERY │  │
│  │     TESTS       │  │                 │  │     TESTS       │  │
│  │                 │  │ • HTTP/SSE      │  │                 │  │
│  │ • Instance Flow │  │ • Endpoints     │  │ • Failure Sim   │  │
│  │ • Terminal I/O  │  │ • Real Processes│  │ • Recovery Val  │  │
│  │ • Multi-Instance│  │ • Auth Flow     │  │ • Cleanup Tests │  │
│  └─────────────────┘  └─────────────────┘  └─────────────────┘  │
├─────────────────────────────────────────────────────────────────┤
│  ┌─────────────────┐  ┌─────────────────┐  ┌─────────────────┐  │
│  │   UNIT TESTS    │  │   MOCK LAYER    │  │  TEST UTILITIES │  │
│  │                 │  │                 │  │                 │  │
│  │ • Directory Res │  │ • Process Mocks │  │ • Test Harness  │  │
│  │ • Auth Detection│  │ • SSE Simulators│  │ • Data Factories│  │
│  │ • Input Valid   │  │ • Network Mocks │  │ • Assertions    │  │
│  │ • Error Handling│  │ • File System   │  │ • Reporters     │  │
│  └─────────────────┘  └─────────────────┘  └─────────────────┘  │
├─────────────────────────────────────────────────────────────────┤
│                        TEST INFRASTRUCTURE                       │
├─────────────────────────────────────────────────────────────────┤
│  ┌─────────────────┐  ┌─────────────────┐  ┌─────────────────┐  │
│  │   CI/CD PIPELINE│  │  TEST DATABASE  │  │   REPORTING     │  │
│  │                 │  │                 │  │                 │  │
│  │ • GitHub Actions│  │ • Test Results  │  │ • HTML Reports  │  │
│  │ • Quality Gates │  │ • Metrics Store │  │ • Coverage Maps │  │
│  │ • Auto Deploy   │  │ • Trend Analysis│  │ • Failure Alerts│  │
│  │ • Rollback      │  │ • Regression DB │  │ • Performance   │  │
│  └─────────────────┘  └─────────────────┘  └─────────────────┘  │
└─────────────────────────────────────────────────────────────────┘
```

### 2. LAYER SPECIFICATIONS

#### 2.1 Unit Test Layer (Foundation)

**Purpose**: Validate individual components in isolation with 90%+ coverage

**Components Tested**:
- `DirectoryResolver` class methods
- Authentication detection functions
- Process lifecycle management utilities
- SSE connection handlers
- Input validation functions
- Error handling mechanisms

**Test Framework Stack**:
```typescript
// Primary: Jest with TypeScript support
// Mock Framework: jest-mock with custom factories
// Assertion Library: @testing-library/jest-dom
// Coverage: Istanbul/NYC with lcov reporting
```

**Execution Pattern**:
```
Parallel Execution → Isolated Test Environment → Mock All External Dependencies
```

**File Structure**:
```
tests/unit/
├── core/
│   ├── DirectoryResolver.test.ts
│   ├── AuthenticationDetection.test.ts
│   ├── ProcessLifecycleManager.test.ts
│   └── SSEConnectionHandler.test.ts
├── validation/
│   ├── InputValidation.test.ts
│   ├── SecurityValidation.test.ts
│   └── ErrorHandling.test.ts
├── mocks/
│   ├── ProcessMocks.ts
│   ├── FilesystemMocks.ts
│   └── NetworkMocks.ts
└── fixtures/
    ├── TestData.ts
    └── MockResponses.ts
```

#### 2.2 Integration Test Layer (Critical Paths)

**Purpose**: Validate component interactions and data flow with 100% critical path coverage

**Integration Scenarios**:
- Complete instance creation flow (all 4 button types)
- Terminal I/O streaming with real processes
- Process termination and cleanup workflows
- Error recovery and failover scenarios
- Multi-instance coordination

**Test Environment**: 
```
Real Backend + Real Database + Mock External Services
```

**Execution Pattern**:
```
Sequential Execution → Shared Test Database → Real Process Spawning
```

**File Structure**:
```
tests/integration/
├── flows/
│   ├── InstanceCreationFlow.test.ts
│   ├── TerminalIOFlow.test.ts
│   ├── ProcessTerminationFlow.test.ts
│   └── ErrorRecoveryFlow.test.ts
├── scenarios/
│   ├── AllButtonTypes.test.ts
│   ├── MultiInstance.test.ts
│   ├── ConcurrentOperations.test.ts
│   └── FailureRecovery.test.ts
├── contracts/
│   ├── APIContracts.test.ts
│   ├── SSEContracts.test.ts
│   └── ProcessContracts.test.ts
└── helpers/
    ├── IntegrationSetup.ts
    ├── TestDatabase.ts
    └── ProcessValidators.ts
```

#### 2.3 E2E Test Layer (User Workflows)

**Purpose**: Validate complete user workflows with 100% user story coverage

**Browser Automation**: Playwright for cross-browser testing

**Test Scenarios**:
- All 4 launch button workflows
- Terminal interaction sequences
- Instance management operations
- Error condition handling
- Responsive design validation

**Execution Environment**:
```
Real Frontend + Real Backend + Real Browser + Real Processes
```

**File Structure**:
```
tests/e2e/
├── workflows/
│   ├── LaunchButtons.spec.ts
│   ├── TerminalInteraction.spec.ts
│   ├── InstanceManagement.spec.ts
│   └── ErrorHandling.spec.ts
├── regression/
│   ├── NoWhiteScreen.spec.ts
│   ├── NoMockResponses.spec.ts
│   ├── RealOutputOnly.spec.ts
│   └── ConnectionStability.spec.ts
├── performance/
│   ├── LoadTesting.spec.ts
│   ├── MemoryLeakDetection.spec.ts
│   └── ResponseTimes.spec.ts
└── helpers/
    ├── PageObjects.ts
    ├── BrowserSetup.ts
    └── E2EUtilities.ts
```

### 3. TEST EXECUTION ORCHESTRATION

#### 3.1 Parallel Execution Strategy

```typescript
// Unit Tests: Maximum Parallelization
const UNIT_TEST_CONFIG = {
  maxWorkers: '100%',  // Use all available CPU cores
  testTimeout: 5000,   // 5 second timeout per test
  setupFilesAfterEnv: ['<rootDir>/tests/setup/unit.setup.ts'],
  testEnvironment: 'node',
  collectCoverage: true,
  coverageThreshold: {
    global: {
      branches: 90,
      functions: 90,
      lines: 90,
      statements: 90
    }
  }
};

// Integration Tests: Controlled Parallelization
const INTEGRATION_TEST_CONFIG = {
  maxWorkers: 2,       // Limit to 2 workers to avoid resource conflicts
  testTimeout: 30000,  // 30 second timeout for complex flows
  setupFilesAfterEnv: ['<rootDir>/tests/setup/integration.setup.ts'],
  testEnvironment: 'node',
  runInBand: false,    // Allow parallel execution with resource management
  globalSetup: '<rootDir>/tests/setup/globalSetup.ts',
  globalTeardown: '<rootDir>/tests/setup/globalTeardown.ts'
};

// E2E Tests: Sequential Execution
const E2E_TEST_CONFIG = {
  maxWorkers: 1,       // Sequential execution to avoid browser conflicts
  testTimeout: 60000,  // 1 minute timeout for full workflows
  setupFilesAfterEnv: ['<rootDir>/tests/setup/e2e.setup.ts'],
  testEnvironment: 'playwright',
  runInBand: true,     // Force sequential execution
  retries: 3,          // Retry flaky E2E tests
  reporter: [['html', { outputFolder: 'tests/reports/e2e' }]]
};
```

#### 3.2 Test Isolation Patterns

**Database Isolation**:
```typescript
// Each integration test gets isolated database state
beforeEach(async () => {
  await testDatabase.reset();
  await testDatabase.seed(baseTestData);
});

afterEach(async () => {
  await testDatabase.cleanup();
});
```

**Process Isolation**:
```typescript
// Each test gets isolated process namespace
beforeEach(async () => {
  testProcessManager.createIsolatedNamespace();
});

afterEach(async () => {
  await testProcessManager.cleanupAllProcesses();
  await testProcessManager.destroyNamespace();
});
```

**Port Isolation**:
```typescript
// Dynamic port allocation to avoid conflicts
const testServerPort = await findAvailablePort(3000, 4000);
const testServer = createTestServer(testServerPort);
```

### 4. CI/CD INTEGRATION ARCHITECTURE

#### 4.1 GitHub Actions Pipeline

```yaml
# .github/workflows/regression-testing.yml
name: Comprehensive Regression Testing

on:
  push:
    branches: [main, develop]
  pull_request:
    branches: [main]
  schedule:
    - cron: '0 2 * * *'  # Daily at 2 AM

jobs:
  unit-tests:
    runs-on: ubuntu-latest
    strategy:
      matrix:
        node-version: [18, 20]
    steps:
      - uses: actions/checkout@v3
      - uses: actions/setup-node@v3
        with:
          node-version: ${{ matrix.node-version }}
      - run: npm ci
      - run: npm run test:unit
      - uses: codecov/codecov-action@v3
        with:
          file: ./coverage/lcov.info

  integration-tests:
    runs-on: ubuntu-latest
    needs: unit-tests
    services:
      postgres:
        image: postgres:14
        env:
          POSTGRES_PASSWORD: testpass
        options: >-
          --health-cmd pg_isready
          --health-interval 10s
          --health-timeout 5s
          --health-retries 5
    steps:
      - uses: actions/checkout@v3
      - uses: actions/setup-node@v3
      - run: npm ci
      - run: npm run test:integration
      - uses: actions/upload-artifact@v3
        with:
          name: integration-test-results
          path: tests/reports/integration/

  e2e-tests:
    runs-on: ubuntu-latest
    needs: integration-tests
    steps:
      - uses: actions/checkout@v3
      - uses: actions/setup-node@v3
      - uses: microsoft/playwright@v1.40.0
      - run: npm ci
      - run: npm run test:e2e
      - uses: actions/upload-artifact@v3
        if: always()
        with:
          name: playwright-report
          path: tests/reports/e2e/

  regression-analysis:
    runs-on: ubuntu-latest
    needs: [unit-tests, integration-tests, e2e-tests]
    steps:
      - uses: actions/checkout@v3
      - run: npm ci
      - run: npm run analyze:regression
      - run: npm run generate:report
```

#### 4.2 Quality Gates

```typescript
// Quality gate configuration
const QUALITY_GATES = {
  UNIT_TESTS: {
    minCoverage: 90,
    maxFailures: 0,
    maxDuration: 300, // 5 minutes
  },
  INTEGRATION_TESTS: {
    minCoverage: 100, // 100% of critical paths
    maxFailures: 0,
    maxDuration: 900, // 15 minutes
  },
  E2E_TESTS: {
    minSuccessRate: 100, // All workflows must pass
    maxFailures: 0,
    maxDuration: 1800, // 30 minutes
  },
  PERFORMANCE_TESTS: {
    maxInstanceCreationTime: 3000, // 3 seconds
    maxTerminalResponseTime: 100,  // 100ms
    maxMemoryLeak: 50, // 50MB
  }
};

// Gate enforcement
function enforceQualityGates(testResults: TestResults): void {
  for (const [gateName, gate] of Object.entries(QUALITY_GATES)) {
    const result = testResults[gateName];
    
    if (!meetsQualityGate(result, gate)) {
      throw new QualityGateError(`${gateName} quality gate failed`, result, gate);
    }
  }
}
```

### 5. TEST DATA MANAGEMENT

#### 5.1 Test Database Schema

```sql
-- Test results storage
CREATE TABLE test_executions (
    id SERIAL PRIMARY KEY,
    execution_id UUID UNIQUE NOT NULL,
    branch VARCHAR(100),
    commit_hash VARCHAR(40),
    started_at TIMESTAMP DEFAULT NOW(),
    completed_at TIMESTAMP,
    status VARCHAR(20), -- 'running', 'passed', 'failed', 'cancelled'
    total_tests INTEGER,
    passed_tests INTEGER,
    failed_tests INTEGER,
    coverage_percentage DECIMAL(5,2)
);

CREATE TABLE test_results (
    id SERIAL PRIMARY KEY,
    execution_id UUID REFERENCES test_executions(execution_id),
    test_suite VARCHAR(100), -- 'unit', 'integration', 'e2e'
    test_name VARCHAR(200),
    test_file VARCHAR(500),
    status VARCHAR(20),
    duration_ms INTEGER,
    error_message TEXT,
    stack_trace TEXT,
    created_at TIMESTAMP DEFAULT NOW()
);

CREATE TABLE regression_alerts (
    id SERIAL PRIMARY KEY,
    execution_id UUID REFERENCES test_executions(execution_id),
    alert_type VARCHAR(50), -- 'new_failure', 'performance_degradation', 'coverage_drop'
    severity VARCHAR(20), -- 'critical', 'high', 'medium', 'low'
    description TEXT,
    created_at TIMESTAMP DEFAULT NOW(),
    resolved_at TIMESTAMP,
    resolved_by VARCHAR(100)
);
```

#### 5.2 Test Data Factories

```typescript
// Test data generation
export class TestDataFactory {
  static createInstanceConfig(overrides: Partial<InstanceConfig> = {}): InstanceConfig {
    return {
      command: ['claude'],
      instanceType: 'skip-permissions',
      usePty: true,
      workingDirectory: '/workspaces/agent-feed',
      ...overrides
    };
  }

  static createProcessInfo(overrides: Partial<ProcessInfo> = {}): ProcessInfo {
    return {
      process: new MockProcess(),
      pid: Math.floor(Math.random() * 10000) + 1000,
      status: 'running',
      startTime: new Date(),
      command: 'claude --dangerously-skip-permissions',
      workingDirectory: '/workspaces/agent-feed',
      instanceType: 'skip-permissions',
      processType: 'pty',
      usePty: true,
      ...overrides
    };
  }

  static createSSEMessage(overrides: Partial<SSEMessage> = {}): SSEMessage {
    return {
      type: 'output',
      data: 'test output data',
      instanceId: 'claude-test-1001',
      timestamp: new Date().toISOString(),
      source: 'stdout',
      isReal: true,
      ...overrides
    };
  }
}
```

### 6. MONITORING AND ALERTING

#### 6.1 Real-time Test Monitoring

```typescript
// Test execution monitoring
export class TestMonitor {
  private metrics = new Map<string, TestMetrics>();
  private alerts = new AlertManager();
  
  recordTestExecution(testName: string, result: TestResult): void {
    const metrics = this.getOrCreateMetrics(testName);
    metrics.recordExecution(result);
    
    // Check for regressions
    if (this.detectRegression(metrics)) {
      this.alerts.sendRegressionAlert(testName, metrics);
    }
    
    // Check for performance degradation
    if (this.detectPerformanceDegradation(metrics)) {
      this.alerts.sendPerformanceAlert(testName, metrics);
    }
  }
  
  private detectRegression(metrics: TestMetrics): boolean {
    const recentFailures = metrics.getRecentFailures(10);
    const historicalSuccessRate = metrics.getHistoricalSuccessRate(100);
    
    // Alert if success rate drops below 95% or if there are 3+ consecutive failures
    return recentFailures >= 3 || historicalSuccessRate < 0.95;
  }
}
```

#### 6.2 Dashboard Integration

```typescript
// Test dashboard API
export class TestDashboardAPI {
  async getTestExecutionSummary(timeRange: TimeRange): Promise<ExecutionSummary> {
    return {
      totalExecutions: await this.db.countExecutions(timeRange),
      successRate: await this.db.calculateSuccessRate(timeRange),
      avgDuration: await this.db.calculateAvgDuration(timeRange),
      regressionCount: await this.db.countRegressions(timeRange),
      coverageTrend: await this.db.getCoverageTrend(timeRange)
    };
  }
  
  async getRegressionAlerts(severity: AlertSeverity[]): Promise<RegressionAlert[]> {
    return this.db.getActiveRegressionAlerts(severity);
  }
}
```

### 7. PERFORMANCE BENCHMARKING

#### 7.1 Benchmark Test Suite

```typescript
// Performance benchmark configuration
const BENCHMARK_SUITE = {
  INSTANCE_CREATION: {
    name: 'Instance Creation Performance',
    iterations: 50,
    maxDuration: 3000, // 3 seconds
    warmupIterations: 5,
    testFunction: benchmarkInstanceCreation
  },
  TERMINAL_RESPONSE: {
    name: 'Terminal Response Time',
    iterations: 100,
    maxDuration: 100, // 100ms
    warmupIterations: 10,
    testFunction: benchmarkTerminalResponse
  },
  SSE_THROUGHPUT: {
    name: 'SSE Message Throughput',
    iterations: 1000,
    maxThroughput: 1000, // messages per second
    warmupIterations: 50,
    testFunction: benchmarkSSEThroughput
  }
};
```

---

**ARCHITECTURE COMPLETION STATUS:** ✅ APPROVED
**NEXT PHASE:** Refinement Implementation (Phase R)
**ARCHITECTURAL PRINCIPLE:** Zero regression tolerance through comprehensive multi-layer testing