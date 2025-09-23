# Quick Start Guide - Regression Test Framework

Get up and running with the comprehensive regression test framework in minutes.

## Installation

The framework is already integrated into your project. No additional installation required.

## Basic Usage

### 1. Create Your First Test

```typescript
import { createTestCase, TestCategory } from './src/testing/regression';

const myFirstTest = createTestCase({
  id: 'my-first-test',
  name: 'My First Test',
  description: 'A simple test to verify basic functionality',
  category: TestCategory.UNIT,
  execute: async () => {
    // Your test logic here
    const result = Math.add ? Math.add(2, 2) : 2 + 2;
    
    if (result !== 4) {
      throw new Error('Basic math is broken!');
    }
    
    return {
      testId: 'my-first-test',
      status: 'passed' as const,
      duration: 0,
      startTime: new Date(),
      endTime: new Date(),
      output: 'Math works correctly!'
    };
  }
});
```

### 2. Create a Test Suite

```typescript
import { createTestSuite, TestCategory } from './src/testing/regression';

const basicTestSuite = createTestSuite({
  id: 'basic-suite',
  name: 'Basic Test Suite',
  description: 'My first test suite',
  category: TestCategory.UNIT,
  testCases: [myFirstTest]
});
```

### 3. Run Tests (Simple Way)

```typescript
import { quickStart } from './src/testing/regression';

// One-liner to run all tests
await quickStart([basicTestSuite]);
```

### 4. Run Tests (Full Control)

```typescript
import { createRegressionFramework, getDefaultConfig } from './src/testing/regression';

async function runMyTests() {
  // Create framework with default config
  const framework = createRegressionFramework(getDefaultConfig());
  
  // Initialize
  await framework.initialize();
  
  try {
    // Register your test suite
    await framework.registerSuite(basicTestSuite);
    
    // Run all tests
    const execution = await framework.runAll();
    
    console.log(`✅ Tests completed: ${execution.summary.passed}/${execution.summary.total} passed`);
    
    // Generate PM report
    if (execution.summary.failed > 0) {
      const pmReport = await framework.generatePMReport(execution);
      console.log(`📊 PM Report: ${pmReport.status} - ${pmReport.recommendations.length} recommendations`);
    }
    
  } finally {
    // Always cleanup
    await framework.cleanup();
  }
}

runMyTests();
```

## Common Test Patterns

### Unit Test Example
```typescript
import { TestUtils } from './src/testing/regression';

// Simple assertion test
const assertionTest = TestUtils.createAssertionTest(
  'user-validation',
  'Should validate user input',
  () => {
    const isValid = validateUser({ name: 'John', email: 'john@test.com' });
    return isValid === true;
  }
);

// Async operation test
const asyncTest = TestUtils.createAsyncTest(
  'api-call',
  'Should fetch user data',
  async () => {
    const response = await fetch('/api/user/123');
    return response.json();
  },
  (result) => result && result.id === '123' // validator function
);

// Performance test
const perfTest = TestUtils.createPerformanceTest(
  'fast-operation',
  'Should complete within 100ms',
  async () => {
    // Your operation here
    await processLargeDataset();
  },
  100 // max duration in ms
);
```

### Integration Test Example
```typescript
const integrationSuite = createTestSuite({
  id: 'api-integration',
  name: 'API Integration Tests',
  description: 'Tests for API connectivity',
  category: TestCategory.INTEGRATION,
  
  // Setup before all tests
  beforeAll: async () => {
    await startTestServer();
  },
  
  // Cleanup after all tests  
  afterAll: async () => {
    await stopTestServer();
  },
  
  testCases: [
    createTestCase({
      id: 'health-check',
      name: 'API Health Check',
      description: 'Verify API is responding',
      category: TestCategory.INTEGRATION,
      tags: ['api', 'health'],
      execute: async () => {
        const response = await fetch('http://localhost:3001/health');
        const data = await response.json();
        
        if (data.status !== 'ok') {
          throw new Error('API health check failed');
        }
      }
    })
  ]
});
```

## Configuration Options

```typescript
import { getDefaultConfig } from './src/testing/regression';

const customConfig = {
  ...getDefaultConfig(),
  
  // Test execution
  parallel: true,          // Enable parallel execution
  maxWorkers: 4,          // Number of worker threads
  timeout: 30000,         // Default timeout (30s)
  
  // Features
  enableNLD: true,        // Neural Learning Development
  enableVerificationWorkflow: true,  // Change approvals
  generatePMReports: true, // Executive reports
  
  // Output
  outputDir: './custom-reports',
  coverage: true,         // Code coverage
  screenshots: false,     // Screenshot on failure
  videos: false          // Video recording
};
```

## Viewing Results

### Console Output
```bash
📊 PM Report Generated: Test Execution Report - August 20, 2025
📈 Overall Status: green
✅ Success Rate: 94.2%
```

### Generated Files
```
./test-reports/
├── test-report-exec_123456789.md     # Technical report
├── pm-report-exec_123456789.json     # PM report
├── failure-analysis-exec_123456789.md # If failures exist  
└── performance-analysis-exec_123456789.md # If performance issues
```

### Accessing Report Data
```typescript
// Get execution results
const execution = await framework.runAll();

console.log('Summary:', execution.summary);
console.log('Results:', execution.results);
console.log('Environment:', execution.environment);

// Generate reports
const pmReport = await framework.generatePMReport(execution);
console.log('PM Report:', pmReport);

// Get historical data
const history = await framework.getExecutionHistory(10);
console.log('Last 10 executions:', history);
```

## Advanced Features

### Change Verification (Approval Workflow)
```typescript
// Create a verification for changes
const verification = await framework.verifyChanges('feature-xyz');
console.log(`Verification status: ${verification.status}`);

// Submit approval (if you're an approver)
const workflow = framework.verificationWorkflow;
await workflow.submitApproval(verification.id, 'john.doe', true, 'Looks good!');
```

### Neural Learning Insights
```typescript
// Get AI-powered insights
const insights = await framework.getNLDInsights();

console.log('Detected Patterns:', insights.patterns);
console.log('Predictions:', insights.predictions);  
console.log('Recommendations:', insights.recommendations);

// Predict test outcomes
const predictions = await framework.nldIntegration.predictTestOutcomes([
  'test-1', 'test-2', 'test-3'
]);

predictions.forEach(pred => {
  console.log(`${pred.testId}: ${pred.prediction} (${pred.confidence}% confidence)`);
});
```

### Running Specific Test Categories
```typescript
// Run only unit tests
const unitResults = await framework.runByCategory('unit');

// Run tests with specific tags
const smokeResults = await framework.runByTags(['smoke', 'critical']);

// Run high-priority tests only
const suiteManager = framework.suiteManager;
const criticalSuites = await suiteManager.getSuitesByTags(['critical']);
const criticalResults = await framework.runSuites(criticalSuites);
```

## Best Practices

### 1. Test Organization
```typescript
// ✅ Good: Descriptive names and proper categorization
const userServiceSuite = createTestSuite({
  id: 'user-service-unit-tests',
  name: 'User Service Unit Tests', 
  description: 'Comprehensive tests for user service operations',
  category: TestCategory.UNIT,
  testCases: [
    createTestCase({
      id: 'user-creation-with-valid-data',
      name: 'Should create user with valid data',
      tags: ['user', 'creation', 'validation'],
      // ...
    })
  ]
});

// ❌ Bad: Vague names and missing context  
const testSuite = createTestSuite({
  id: 'tests',
  name: 'Tests',
  category: TestCategory.UNIT,
  // ...
});
```

### 2. Error Handling
```typescript
// ✅ Good: Specific error messages and proper cleanup
createTestCase({
  id: 'database-connection',
  name: 'Should connect to database',
  execute: async () => {
    let connection;
    try {
      connection = await database.connect();
      
      if (!connection.isConnected()) {
        throw new Error('Database connection failed: not connected after successful connect call');
      }
      
    } catch (error) {
      throw new Error(`Database connection failed: ${error.message}`);
    } finally {
      if (connection) {
        await connection.close();
      }
    }
  }
});
```

### 3. Performance Considerations
```typescript
// ✅ Good: Appropriate timeouts and parallel-safe tests
createTestCase({
  id: 'api-response-time',
  timeout: 5000, // Specific timeout
  tags: ['performance', 'api'],
  execute: async () => {
    // Test-specific setup that doesn't interfere with other tests
    const testData = generateUniqueTestData();
    
    const startTime = Date.now();
    const result = await apiCall(testData);
    const duration = Date.now() - startTime;
    
    if (duration > 1000) {
      throw new Error(`API response too slow: ${duration}ms > 1000ms`);
    }
    
    // Cleanup test data
    await cleanupTestData(testData);
  }
});
```

## Troubleshooting

### Common Issues

**Tests not running in parallel:**
```typescript
// Make sure parallel is enabled and tests are independent
const config = {
  ...getDefaultConfig(),
  parallel: true,
  maxWorkers: 4
};
```

**Memory issues with large test suites:**
```typescript
// Reduce workers or optimize test data
const config = {
  ...getDefaultConfig(), 
  maxWorkers: 2, // Reduce from default
  // Implement proper cleanup in tests
};
```

**Flaky tests detected:**
```typescript
// Use NLD insights to identify patterns
const insights = await framework.getNLDInsights();
const flakyPatterns = insights.patterns.filter(p => p.type === 'failure' && p.pattern.includes('flaky'));

// Add explicit waits or improve test isolation
```

## Next Steps

1. **Explore Examples**: Check `/tests/regression/example-suites/` for comprehensive examples
2. **Read Documentation**: Review `/docs/regression/README.md` for full features
3. **API Reference**: See `/docs/regression/api-reference.md` for detailed API docs
4. **Integration**: Add tests to your CI/CD pipeline
5. **Monitoring**: Set up alerts based on PM report recommendations

---

**Ready to build robust, enterprise-scale test suites!** 🚀