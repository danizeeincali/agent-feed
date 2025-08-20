# Regression Test Framework - API Reference

Complete API reference for the Regression Test Framework.

## Core Classes

### RegressionTestFramework

Main orchestrator class for the regression testing system.

#### Constructor
```typescript
constructor(config: TestConfiguration)
```

#### Methods

##### initialize()
```typescript
async initialize(): Promise<void>
```
Initializes the framework and all its components.

##### registerSuite()
```typescript
async registerSuite(suite: TestSuite): Promise<void>
```
Registers a test suite with the framework.

##### runAll()
```typescript
async runAll(): Promise<TestExecution>
```
Runs all registered test suites.

##### runSuites()
```typescript
async runSuites(suites: TestSuite[]): Promise<TestExecution>
```
Runs specific test suites.

##### runByCategory()
```typescript
async runByCategory(category: string): Promise<TestExecution>
```
Runs tests filtered by category.

##### runByTags()
```typescript
async runByTags(tags: string[]): Promise<TestExecution>
```
Runs tests filtered by tags.

##### generatePMReport()
```typescript
async generatePMReport(execution: TestExecution): Promise<PMReport>
```
Generates a PM-oriented report.

##### generateTechnicalReport()
```typescript
async generateTechnicalReport(execution: TestExecution): Promise<string>
```
Generates technical documentation.

##### cleanup()
```typescript
async cleanup(): Promise<void>
```
Cleans up resources.

#### Properties

##### isRunning
```typescript
get isRunning(): boolean
```
Indicates if tests are currently running.

##### configuration
```typescript
get configuration(): TestConfiguration
```
Returns the current configuration.

---

### TestSuiteManager

Manages test suite organization and categorization.

#### Methods

##### initialize()
```typescript
async initialize(): Promise<void>
```

##### registerSuite()
```typescript
async registerSuite(suite: TestSuite): Promise<void>
```

##### getAllSuites()
```typescript
async getAllSuites(): Promise<TestSuite[]>
```

##### getSuiteById()
```typescript
async getSuiteById(id: string): Promise<TestSuite | undefined>
```

##### getSuitesByCategory()
```typescript
async getSuitesByCategory(category: string): Promise<TestSuite[]>
```

##### getSuitesByTags()
```typescript
async getSuitesByTags(tags: string[]): Promise<TestSuite[]>
```

##### searchSuites()
```typescript
async searchSuites(query: string): Promise<TestSuite[]>
```

---

### TestRunner

Executes tests with parallel processing support.

#### Constructor
```typescript
constructor(config: TestConfiguration)
```

#### Methods

##### initialize()
```typescript
async initialize(): Promise<void>
```

##### runSuites()
```typescript
async runSuites(suites: TestSuite[]): Promise<TestResult[]>
```

##### stop()
```typescript
async stop(): Promise<void>
```

##### cleanup()
```typescript
async cleanup(): Promise<void>
```

---

### TestResultCollector

Collects and analyzes test results.

#### Methods

##### addResult()
```typescript
addResult(result: TestResult): void
```

##### generateSummary()
```typescript
generateSummary(results: TestResult[]): ExecutionSummary
```

##### getFailureAnalysis()
```typescript
getFailureAnalysis(): FailureAnalysis
```

##### calculateTrends()
```typescript
calculateTrends(metric: string, timeframe?: string): TrendAnalysis[]
```

---

### PMReportGenerator

Generates executive-level reports.

#### Methods

##### generateReport()
```typescript
async generateReport(execution: TestExecution, historicalData?: TestExecution[]): Promise<PMReport>
```

---

### ChangeVerificationWorkflow

Manages change approval workflows.

#### Methods

##### createVerification()
```typescript
async createVerification(changeId: string, requester?: string, description?: string): Promise<ChangeVerification>
```

##### submitApproval()
```typescript
async submitApproval(verificationId: string, approver: string, approved: boolean, comments?: string): Promise<ChangeVerification>
```

##### getPendingApprovals()
```typescript
async getPendingApprovals(approver: string): Promise<ChangeVerification[]>
```

---

### NLDIntegration

Neural Learning Development integration.

#### Methods

##### learnFromExecution()
```typescript
async learnFromExecution(execution: TestExecution): Promise<void>
```

##### predictTestOutcomes()
```typescript
async predictTestOutcomes(testIds: string[]): Promise<PredictionResult[]>
```

##### detectFailurePatterns()
```typescript
async detectFailurePatterns(results: TestResult[]): Promise<NLDPattern[]>
```

##### detectFlakyTests()
```typescript
async detectFlakyTests(historicalResults: Map<string, TestResult[]>): Promise<FlakyTestAnalysis>
```

##### getInsights()
```typescript
async getInsights(): Promise<NLDInsights>
```

## Factory Functions

### createRegressionFramework()
```typescript
function createRegressionFramework(config: RegressionTestConfig): RegressionTestFramework
```
Creates a configured regression test framework instance.

### createTestCase()
```typescript
function createTestCase(options: TestCaseOptions): TestCase
```
Creates a test case with the specified options.

### createTestSuite()
```typescript
function createTestSuite(options: TestSuiteOptions): TestSuite
```
Creates a test suite with the specified test cases.

### getDefaultConfig()
```typescript
function getDefaultConfig(): RegressionTestConfig
```
Returns the default framework configuration.

### quickStart()
```typescript
async function quickStart(testSuites: TestSuite[]): Promise<void>
```
Quick setup and execution for simple scenarios.

## Utility Classes

### TestUtils

Utility functions for common test patterns.

#### Methods

##### createAssertionTest()
```typescript
static createAssertionTest(id: string, name: string, assertion: () => boolean | Promise<boolean>): TestCase
```

##### createAsyncTest()
```typescript
static createAsyncTest(id: string, name: string, operation: () => Promise<any>, validator?: (result: any) => boolean): TestCase
```

##### createPerformanceTest()
```typescript
static createPerformanceTest(id: string, name: string, operation: () => Promise<any>, maxDuration: number): TestCase
```

## Type Definitions

### Core Types

#### TestCase
```typescript
interface TestCase {
  id: string;
  name: string;
  description: string;
  category: TestCategory;
  priority: TestPriority;
  tags: string[];
  timeout?: number;
  retries?: number;
  dependencies?: string[];
  metadata?: Record<string, any>;
  execute: () => Promise<TestResult>;
}
```

#### TestSuite
```typescript
interface TestSuite {
  id: string;
  name: string;
  description: string;
  category: TestCategory;
  testCases: TestCase[];
  beforeAll?: () => Promise<void>;
  afterAll?: () => Promise<void>;
  beforeEach?: () => Promise<void>;
  afterEach?: () => Promise<void>;
}
```

#### TestResult
```typescript
interface TestResult {
  testId: string;
  status: TestStatus;
  duration: number;
  startTime: Date;
  endTime: Date;
  error?: Error;
  output?: string;
  screenshot?: string;
  logs?: LogEntry[];
  metrics?: TestMetrics;
  artifacts?: string[];
}
```

#### TestExecution
```typescript
interface TestExecution {
  id: string;
  suiteId: string;
  results: TestResult[];
  summary: ExecutionSummary;
  startTime: Date;
  endTime: Date;
  environment: TestEnvironment;
  configuration: TestConfiguration;
}
```

#### PMReport
```typescript
interface PMReport {
  id: string;
  title: string;
  executionId: string;
  generatedAt: Date;
  status: OverallStatus;
  summary: ExecutiveSummary;
  riskAssessment: RiskAssessment;
  recommendations: Recommendation[];
  trends: TrendAnalysis[];
  nextSteps: string[];
}
```

### Configuration Types

#### TestConfiguration
```typescript
interface TestConfiguration {
  parallel: boolean;
  maxWorkers: number;
  timeout: number;
  retries: number;
  reporters: string[];
  coverage: boolean;
  screenshots: boolean;
  videos: boolean;
}
```

#### RegressionTestConfig
```typescript
interface RegressionTestConfig extends TestConfiguration {
  outputDir?: string;
  enableNLD?: boolean;
  enableVerificationWorkflow?: boolean;
  generatePMReports?: boolean;
}
```

### Enums

#### TestCategory
```typescript
enum TestCategory {
  UNIT = 'unit',
  INTEGRATION = 'integration',
  E2E = 'e2e',
  PERFORMANCE = 'performance',
  SECURITY = 'security',
  ACCESSIBILITY = 'accessibility',
  VISUAL = 'visual',
  API = 'api'
}
```

#### TestPriority
```typescript
enum TestPriority {
  CRITICAL = 'critical',
  HIGH = 'high',
  MEDIUM = 'medium',
  LOW = 'low'
}
```

#### TestStatus
```typescript
enum TestStatus {
  PENDING = 'pending',
  RUNNING = 'running',
  PASSED = 'passed',
  FAILED = 'failed',
  SKIPPED = 'skipped',
  TIMEOUT = 'timeout',
  ERROR = 'error'
}
```

#### OverallStatus
```typescript
enum OverallStatus {
  GREEN = 'green',
  YELLOW = 'yellow',
  RED = 'red'
}
```

## Events

### Framework Events

The `RegressionTestFramework` extends `EventEmitter` and emits the following events:

- `initialized` - Framework initialization complete
- `testStart` - Individual test started
- `testComplete` - Individual test completed  
- `suiteComplete` - Test suite completed
- `executionStart` - Test execution started
- `executionComplete` - Test execution completed
- `reportGenerated` - Report generated
- `patternDetected` - NLD pattern detected
- `error` - Error occurred

### Usage
```typescript
framework.on('testComplete', (result: TestResult) => {
  console.log(`Test ${result.testId}: ${result.status}`);
});

framework.on('executionComplete', (execution: TestExecution) => {
  console.log(`Execution completed: ${execution.summary.passed}/${execution.summary.total} passed`);
});
```

## Error Handling

### Custom Error Types

The framework defines custom error types for better error handling:

```typescript
class TestExecutionError extends Error {
  constructor(message: string, public testId: string, public originalError?: Error) {
    super(message);
    this.name = 'TestExecutionError';
  }
}

class ConfigurationError extends Error {
  constructor(message: string, public configKey?: string) {
    super(message);
    this.name = 'ConfigurationError';
  }
}

class ValidationError extends Error {
  constructor(message: string, public validationTarget: string) {
    super(message);
    this.name = 'ValidationError';
  }
}
```

## Performance Considerations

### Parallel Execution
- Default worker count: `min(4, CPU cores)`
- Configurable via `maxWorkers` setting
- Uses Node.js worker threads for true parallelism
- Automatic task distribution and load balancing

### Memory Management
- Automatic cleanup of completed test artifacts
- Configurable retention policies
- Streaming for large test outputs
- Memory usage monitoring

### Optimization Tips
1. Use parallel execution for independent tests
2. Set appropriate timeouts to avoid hanging tests  
3. Implement proper test isolation
4. Monitor and optimize slow tests
5. Use NLD recommendations for performance improvements

---

For more examples and detailed usage, see the [README](./README.md) and [example test suites](../tests/regression/example-suites/).