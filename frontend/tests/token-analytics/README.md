# Token Analytics Test Suite

Comprehensive test coverage for token cost analytics using TDD London School methodology with NLD-informed risk mitigation.

## Test Structure

```
tests/token-analytics/
├── unit/                    # Unit tests with mock-driven development
├── integration/             # Integration tests for component collaboration
├── e2e/                    # End-to-end tests with Playwright
├── performance/            # Performance regression tests
├── mocks/                  # Mock factories and test doubles
├── utilities/              # Test utilities and helpers
└── README.md              # This file
```

## NLD Risk Mitigation Coverage

### 1. Memory Leak Prevention (78% Risk)
- **Unit Tests**: Memory management during streaming operations
- **Integration Tests**: Long-running session memory monitoring
- **Performance Tests**: Memory leak detection and prevention
- **E2E Tests**: Memory usage under realistic load conditions

### 2. WebSocket Stability (65% Risk)
- **Unit Tests**: Connection lifecycle management
- **Integration Tests**: Reconnection logic and error recovery
- **Performance Tests**: High-frequency message handling
- **E2E Tests**: Cross-browser WebSocket compatibility

### 3. Token Calculation Accuracy (72% Risk)
- **Unit Tests**: Property-based testing for precision
- **Integration Tests**: Calculation consistency across components
- **Performance Tests**: Accuracy under computational load
- **E2E Tests**: User-facing calculation validation

## London School TDD Methodology

### Outside-In Development
Tests drive development from user behavior down to implementation details:

1. **Acceptance Tests** (E2E) → Define user requirements
2. **Integration Tests** → Verify component collaborations  
3. **Unit Tests** → Design object interactions through mocks

### Mock-Driven Development
- **Behavior Verification**: Focus on object interactions, not state
- **Contract Definition**: Use mocks to establish clear interfaces
- **Collaboration Testing**: Verify how objects work together
- **Dependency Isolation**: Test units in complete isolation

## Test Categories

### Unit Tests (`/unit/`)
- **TokenCostAnalytics.test.tsx**: Core component behavior with mocks
- **Focus**: Object interactions and collaborations
- **Mocking**: All external dependencies mocked
- **Coverage**: Business logic, error handling, edge cases

### Integration Tests (`/integration/`)
- **WebSocketTokenStream.test.tsx**: Real-time streaming integration
- **Focus**: Component collaboration and data flow
- **Mocking**: External services, real internal interactions
- **Coverage**: End-to-end workflows, error recovery

### E2E Tests (`/e2e/`)
- **TokenAnalyticsE2E.spec.ts**: Complete user scenarios
- **Focus**: User experience and cross-browser compatibility
- **Mocking**: Minimal, mostly real services
- **Coverage**: User workflows, performance, accessibility

### Performance Tests (`/performance/`)
- **TokenAnalyticsPerformance.test.ts**: Regression prevention
- **Focus**: Performance benchmarks and memory monitoring
- **Mocking**: High-performance test doubles
- **Coverage**: Scalability, memory efficiency, responsiveness

## Mock Architecture

### Mock Factories (`/mocks/TokenAnalyticsMocks.ts`)
- **WebSocket Service**: Connection management, message handling
- **Token Calculator**: Precision calculations, batch processing
- **Memory Monitor**: Memory usage tracking, leak detection
- **Budget Alerts**: Threshold monitoring, notification system

### Mock Strategies
1. **Simple Mocks**: Basic behavior verification
2. **Realistic Mocks**: Network delays, error simulation
3. **High-Performance Mocks**: Stress testing, bulk operations
4. **Contract Mocks**: Interface definition and evolution

## Test Utilities (`/utilities/`)

### TestUtilities.ts Features
- **TokenDataBuilder**: Test data generation with builder pattern
- **WebSocketTestUtil**: WebSocket behavior simulation
- **PerformanceTester**: Automated performance measurement
- **MemoryLeakTester**: Memory leak detection and validation

## Running Tests

### Unit Tests
```bash
# Run all unit tests
npm run test:unit

# Run with coverage
npm run test:unit:coverage

# Watch mode
npm run test:unit:watch
```

### Integration Tests
```bash
# Run integration tests
npm run test:integration

# Run with memory profiling
npm run test:integration:memory
```

### E2E Tests
```bash
# Run all browsers
npm run test:e2e

# Run specific browser
npm run test:e2e:chromium
npm run test:e2e:webkit
npm run test:e2e:firefox

# Run with video recording
npm run test:e2e:video
```

### Performance Tests
```bash
# Run performance benchmarks
npm run test:performance

# Run memory leak tests
npm run test:memory

# Generate performance report
npm run test:performance:report
```

## Test Configuration

### Jest Configuration (unit/integration)
```json
{
  "testEnvironment": "jsdom",
  "setupFilesAfterEnv": ["<rootDir>/tests/setup.ts"],
  "coverageThreshold": {
    "global": {
      "branches": 90,
      "functions": 90,
      "lines": 90,
      "statements": 90
    }
  }
}
```

### Playwright Configuration (E2E)
```typescript
{
  projects: [
    { name: 'chromium', use: { ...devices['Desktop Chrome'] } },
    { name: 'firefox', use: { ...devices['Desktop Firefox'] } },
    { name: 'webkit', use: { ...devices['Desktop Safari'] } },
    { name: 'Mobile Chrome', use: { ...devices['Pixel 5'] } }
  ]
}
```

## Performance Benchmarks

### Target Thresholds
- **Memory Growth**: <30% during streaming sessions
- **UI Response Time**: <50ms for user interactions
- **WebSocket Latency**: <100ms average
- **Calculation Time**: <5ms per token calculation
- **Memory Leaks**: <5% object retention after cleanup

### Regression Detection
Tests automatically fail if performance degrades beyond acceptable thresholds:

- **Memory Leak Detection**: Fails if >10% objects survive garbage collection
- **Performance Regression**: Fails if >50% slower than baseline
- **UI Responsiveness**: Fails if >10% of frames drop below 60fps

## Continuous Integration

### Pre-commit Hooks
- Unit test validation
- Performance benchmark verification
- Memory leak detection
- Code coverage enforcement

### CI Pipeline
```yaml
- Unit Tests (Fast feedback)
- Integration Tests (Component verification)
- Performance Tests (Regression detection)  
- E2E Tests (User experience validation)
- Coverage Report (Quality metrics)
```

## Best Practices

### London School TDD
1. **Start with acceptance tests** defining user behavior
2. **Use mocks to drive design** and define contracts
3. **Focus on interactions** rather than implementation details
4. **Verify collaborations** between objects
5. **Keep tests independent** and isolated

### Performance Testing
1. **Set realistic thresholds** based on user requirements
2. **Test under load** to identify breaking points
3. **Monitor memory usage** throughout test execution
4. **Measure real user scenarios** with E2E tests
5. **Automate regression detection** in CI pipeline

### Mock Management
1. **Keep mocks simple** and focused on behavior
2. **Verify interactions** not implementation
3. **Use contract testing** to ensure compatibility
4. **Share mock contracts** across test types
5. **Evolve mocks** as requirements change

## Troubleshooting

### Common Issues

#### Memory Leaks in Tests
```bash
# Run with memory profiling
NODE_OPTIONS="--expose-gc" npm run test:memory
```

#### WebSocket Test Failures
```bash
# Check WebSocket server availability
npm run test:ws:connection

# Run with network simulation
npm run test:integration:network
```

#### Performance Test Instability
```bash
# Run with stable CPU allocation
npm run test:performance:stable

# Generate detailed performance report
npm run test:performance:detailed
```

### Debug Mode
```bash
# Run tests in debug mode
npm run test:debug

# Run with verbose logging
DEBUG=token-analytics:* npm run test
```

## Contributing

When adding new tests:

1. **Follow London School TDD** methodology
2. **Add NLD risk mitigation** context in test descriptions
3. **Include performance assertions** where applicable
4. **Document mock contracts** and behaviors
5. **Update this README** with new test patterns

## Coverage Reports

Test coverage reports are generated in:
- `coverage/` - Unit and integration test coverage
- `test-results/` - E2E test results and videos
- `performance-reports/` - Performance benchmark results

Target coverage: **90%** across all test types with focus on critical paths identified by NLD analysis.