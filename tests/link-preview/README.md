# 🔗 Link Preview TDD Test Suite

A comprehensive Test-Driven Development test suite for link preview functionality using the **London School (mockist) approach**. This suite emphasizes behavior verification through mock interactions and outside-in development methodology.

## 📋 Overview

This test suite provides complete coverage for the link preview service including:

- **Unit Tests** - Mock-driven behavior verification
- **Integration Tests** - End-to-end workflow testing
- **E2E Tests** - Frontend rendering and user interaction testing
- **Performance Tests** - Load testing and benchmarks

## 🏗 Architecture

### London School TDD Approach

The test suite follows London School TDD principles:

1. **Outside-In Development** - Start with acceptance tests and work inward
2. **Mock-Driven Development** - Use mocks to isolate units and define contracts  
3. **Behavior Verification** - Focus on interactions between objects
4. **Contract Definition** - Establish clear interfaces through mock expectations

### Test Structure

```
tests/link-preview/
├── unit/                     # Unit tests with mocked dependencies
│   ├── LinkPreviewService.test.js
│   ├── YouTubeMetadataService.test.js
│   ├── PlatformHandlers.test.js
│   ├── CacheManagement.test.js
│   └── RateLimiting.test.js
├── integration/              # Integration tests with real services
│   ├── EndToEndFlow.test.js
│   └── FailureScenarios.test.js
├── e2e/                      # Playwright E2E tests
│   ├── frontend-rendering/
│   │   └── link-preview-rendering.spec.js
│   └── playwright.config.js
├── performance/              # Performance and load tests
│   ├── benchmark.test.js
│   └── load-test.js
├── setup.js                  # Global test setup and utilities
├── jest.config.js           # Jest configuration
└── run-tests.sh             # Test runner script
```

## 🚀 Quick Start

### Prerequisites

- Node.js 18+ 
- npm 8+
- Backend service running on port 3001
- Frontend service running on port 3000 (for E2E tests)

### Installation

```bash
cd tests/link-preview
npm install
```

### Running Tests

```bash
# Run all tests (unit + integration + E2E)
npm test

# Run specific test types
npm run test:unit
npm run test:integration  
npm run test:e2e
npm run test:performance

# Run all tests including performance
npm run test:all

# Run with coverage
npm run test:coverage

# Run in parallel
npm run test:parallel

# Watch mode for development
npm run test:watch
```

## 🧪 Test Categories

### Unit Tests

Mock-driven tests focusing on behavior verification:

- **LinkPreviewService.test.js** - Core service behavior and collaboration patterns
- **YouTubeMetadataService.test.js** - YouTube-specific API interactions  
- **PlatformHandlers.test.js** - Platform-specific URL handling (LinkedIn, Twitter/X, generic)
- **CacheManagement.test.js** - Caching behavior and invalidation
- **RateLimiting.test.js** - Rate limiting and backoff strategies

```bash
# Run unit tests only
npm run test:unit

# Run with coverage
npm run coverage:unit

# Debug unit tests
npm run test:debug
```

### Integration Tests

End-to-end workflow testing with real services:

- **EndToEndFlow.test.js** - Complete link preview workflows
- **FailureScenarios.test.js** - Error handling and recovery

```bash
# Run integration tests
npm run test:integration

# Run with coverage  
npm run coverage:integration
```

### E2E Tests

Playwright tests for frontend rendering and interactions:

- **link-preview-rendering.spec.js** - Visual rendering, responsive design, accessibility

```bash
# Run E2E tests
npm run test:e2e

# Run with UI mode
npm run e2e:ui

# Run in headed mode
npm run e2e:headed

# Debug E2E tests
npm run e2e:debug

# View test report
npm run e2e:report
```

### Performance Tests

Load testing and performance benchmarks:

- **benchmark.test.js** - Performance thresholds and resource usage
- **load-test.js** - Scalable load testing scenarios

```bash
# Run performance benchmarks
npm run benchmark

# Run load tests
npm run load-test:smoke    # Light load test
npm run load-test:load     # Normal load test  
npm run load-test:stress   # High load test
npm run load-test:spike    # Spike load test
npm run load-test:soak     # Extended duration test
```

## 📊 Test Reports

Test reports are generated in the `reports/` directory:

- **Coverage Report** - `reports/coverage/lcov-report/index.html`
- **E2E Report** - `reports/e2e/playwright-html/index.html`
- **Test Summary** - `reports/test-summary.html`

## 🛠 Configuration

### Jest Configuration

Key Jest settings in `jest.config.js`:

```javascript
{
  testEnvironment: 'node',
  setupFilesAfterEnv: ['<rootDir>/setup.js'],
  coverageThreshold: {
    global: {
      branches: 80,
      functions: 80,
      lines: 80,
      statements: 80
    }
  },
  testTimeout: 10000
}
```

### Playwright Configuration

E2E test configuration in `e2e/playwright.config.js`:

```javascript
{
  testDir: './frontend-rendering',
  use: {
    baseURL: 'http://localhost:3000',
    trace: 'on-first-retry',
    screenshot: 'only-on-failure'
  },
  projects: ['chromium', 'firefox', 'webkit', 'mobile-chrome', 'mobile-safari']
}
```

## 🔧 Development Utilities

### Mock Utilities

The test suite provides comprehensive mock utilities in `setup.js`:

```javascript
// Create swarm mocks for service dependencies
const mockService = createSwarmMock('ServiceName', {
  method1: jest.fn(),
  method2: jest.fn().mockResolvedValue('result')
});

// Verify contract interactions
verifySwarmContract(mockService, [
  { method: 'method1', calls: [['arg1', 'arg2']] },
  { method: 'method2', calls: [['arg3']] }
]);

// Verify interaction sequence
verifyInteractionSequence({
  service1: mockService1,
  service2: mockService2  
}, [
  { mock: 'service1', method: 'method1' },
  { mock: 'service2', method: 'method2' }
]);
```

### Performance Utilities

```javascript
// Measure execution time
const { result, executionTime } = await measureExecutionTime(
  () => linkPreviewService.getLinkPreview(url)
);

expect(executionTime).toBeLessThan(5000);
```

## 📈 Performance Benchmarks

The test suite includes comprehensive performance testing:

### Response Time Thresholds

- **Generic URLs**: < 10 seconds fresh, < 500ms cached
- **YouTube URLs**: < 8 seconds fresh, < 200ms cached  
- **Error Scenarios**: < 5 seconds
- **Cache Hits**: < 200ms average

### Load Testing Scenarios

- **Smoke Test**: 2 concurrent users, 10 seconds
- **Load Test**: 10 concurrent users, 30 seconds
- **Stress Test**: 25 concurrent users, 60 seconds
- **Spike Test**: Up to 50 concurrent users, stepped load
- **Soak Test**: 5 concurrent users, 5 minutes

### Performance Metrics

- **Throughput**: Requests per second
- **Response Time**: Average, P95, P99 percentiles
- **Success Rate**: Percentage of successful requests
- **Resource Usage**: Memory consumption, connection pools
- **Cache Efficiency**: Hit ratio, eviction patterns

## 🔍 Debugging

### Debug Unit Tests

```bash
# Run in debug mode with detailed output
npm run test:debug

# Run specific test file
jest --config=jest.config.js unit/LinkPreviewService.test.js --verbose

# Run with inspect mode
node --inspect-brk node_modules/.bin/jest --runInBand unit/
```

### Debug E2E Tests  

```bash
# Run in headed mode to see browser
npm run e2e:headed

# Run in debug mode with inspector
npm run e2e:debug

# Run specific test
cd e2e && npx playwright test --grep "should render YouTube video previews"
```

### Debug Performance Issues

```bash
# Run with memory profiling
node --inspect performance/load-test.js stress

# Monitor resource usage
npm run benchmark 2>&1 | grep -E "(Memory|Performance)"
```

## 🤝 Contributing

### Adding New Tests

1. **Unit Tests**: Add to appropriate category in `unit/`
2. **Integration Tests**: Add to `integration/`
3. **E2E Tests**: Add to `e2e/frontend-rendering/`
4. **Performance Tests**: Add to `performance/`

### Test Naming Conventions

- **Unit Tests**: `[Component].test.js`
- **Integration Tests**: `[Feature]Flow.test.js` 
- **E2E Tests**: `[feature].spec.js`
- **Performance Tests**: `[type].test.js` or `[type].js`

### Mock Patterns

Follow London School TDD patterns:

```javascript
describe('Service Collaboration', () => {
  it('should coordinate with dependencies properly', async () => {
    // Arrange - Setup mock expectations
    mockDependency.method.mockResolvedValue(expectedResult);
    
    // Act - Execute behavior
    const result = await service.operation();
    
    // Assert - Verify interactions
    expect(mockDependency.method).toHaveBeenCalledWith(expectedArgs);
    expect(result).toEqual(expectedResult);
  });
});
```

## 📚 Resources

- [London School TDD](https://github.com/testdouble/contributing-tests/wiki/London-school-TDD)
- [Jest Documentation](https://jestjs.io/docs/getting-started)
- [Playwright Documentation](https://playwright.dev/docs/intro)
- [Test-Driven Development Principles](https://martinfowler.com/articles/mocksArentStubs.html)

## 🔧 Troubleshooting

### Common Issues

1. **Tests Timing Out**
   ```bash
   # Increase timeout
   jest --config=jest.config.js --testTimeout=30000
   ```

2. **Services Not Running**
   ```bash
   # Start backend
   npm run dev:backend
   
   # Start frontend (for E2E)
   cd frontend && npm run dev
   ```

3. **Port Conflicts**
   ```bash
   # Check running processes
   lsof -i :3000
   lsof -i :3001
   ```

4. **Memory Issues in Load Tests**
   ```bash
   # Run with increased memory
   node --max-old-space-size=4096 performance/load-test.js
   ```

### Getting Help

- Check the test output for detailed error messages
- Review the generated reports in `reports/`
- Enable verbose output with `--verbose` flag
- Use debug mode for step-by-step execution

## 📄 License

MIT License - see the main project LICENSE file for details.