# London School TDD: Real Dynamic Pages Test Suite

## 🔥 Overview

This test suite implements **London School Test-Driven Development** principles for dynamic pages functionality with a **ZERO MOCKS POLICY**. All tests run against real API endpoints, real components, and real data flows.

## 🚫 NO MOCKS POLICY

**CRITICAL**: This test suite enforces a strict no-mocks policy:
- ✅ Real API endpoints with actual backend
- ✅ Real component rendering with actual data  
- ✅ Real user interactions and behaviors
- ✅ Real error scenarios and network conditions
- ❌ NO mock services, data, or components

## 🎯 London School TDD Principles

### 1. Outside-In Development
- Start with acceptance tests defining user behavior
- Work from external interfaces down to implementation
- Focus on what the system should do, not how it does it

### 2. Mock-Driven Design (But No Mocks in Tests)
- Use mocks during development to define contracts
- Remove mocks for final testing against real collaborators
- Verify actual object interactions and collaborations

### 3. Behavior Verification
- Test **how objects collaborate** rather than **what they contain**
- Focus on interaction patterns and message passing
- Verify contracts between system components

## 📁 Test Structure

```
real-dynamic-pages/
├── api-integration/           # Real API endpoint tests
│   └── dynamic-pages-api.test.ts
├── component-behavior/        # Real component behavior tests  
│   └── dynamic-page-renderer.test.tsx
├── user-journey/             # Real E2E user scenarios
│   └── end-to-end-scenarios.test.ts
├── error-handling/           # Real error scenario tests
│   └── network-failures.test.ts
├── performance/              # Real load and timing tests
│   └── load-times-responsiveness.test.ts
├── scripts/                  # Test execution scripts
│   ├── run-tests.sh
│   └── ci-setup.yml
├── reports/                  # Generated test reports
├── jest.config.js           # Jest configuration
├── playwright.config.ts     # Playwright configuration
├── test-setup.ts           # Test environment setup
├── api-environment.ts      # Real API configuration
└── README.md               # This file
```

## 🧪 Test Categories

### 1. API Integration Tests
**File**: `api-integration/dynamic-pages-api.test.ts`

- Tests real API endpoints with actual backend
- Verifies contract compliance between frontend and backend
- Validates data flow collaboration patterns
- Ensures API response structure and timing

**Key Features**:
- Real HTTP requests to running backend
- Contract verification with actual responses
- Collaboration tracking and verification
- Error handling with real network conditions

### 2. Component Behavior Tests  
**File**: `component-behavior/dynamic-page-renderer.test.tsx`

- Tests real React components with actual data
- Verifies component collaboration with services
- Validates rendering behavior with real API responses
- Ensures proper state management and lifecycle

**Key Features**:
- Real component rendering with React Testing Library
- Actual API calls during component lifecycle
- Real data loading and error states
- Navigation and interaction testing

### 3. User Journey Tests
**File**: `user-journey/end-to-end-scenarios.test.ts`

- Tests complete user workflows with real browser
- Verifies end-to-end system integration
- Validates user experience across multiple pages
- Ensures accessibility and responsiveness

**Key Features**:
- Real browser automation with Playwright
- Complete user workflow testing
- Cross-browser and cross-device validation
- Performance and accessibility verification

### 4. Error Handling Tests
**File**: `error-handling/network-failures.test.ts`

- Tests real error scenarios and network failures
- Verifies system resilience under stress
- Validates error recovery and user experience
- Ensures graceful degradation

**Key Features**:
- Real network timeout and failure simulation
- HTTP error status code handling
- Connection error and DNS failure testing
- Retry logic and recovery pattern validation

### 5. Performance Tests
**File**: `performance/load-times-responsiveness.test.ts`

- Tests real system performance under load
- Measures actual response times and throughput
- Validates memory usage and efficiency
- Ensures acceptable user experience

**Key Features**:
- Real load testing with concurrent requests
- Memory usage monitoring and leak detection
- Response time measurement and analysis
- Performance regression detection

## 🚀 Running the Tests

### Prerequisites

1. **Real Backend Running**:
   ```bash
   npm run dev  # Start backend on localhost:3000
   ```

2. **Real Frontend Running** (for E2E tests):
   ```bash
   cd frontend
   npm run dev  # Start frontend on localhost:5173
   ```

3. **Database Connection**:
   - Ensure real database is connected and accessible
   - Verify `/api/health` endpoint returns `{"database": true}`

### Execute All Tests

```bash
# Run comprehensive test suite
cd frontend/tests/tdd-london-school/real-dynamic-pages
./scripts/run-tests.sh
```

### Execute Individual Test Categories

```bash
# API Integration Tests
npm test -- --testPathPattern="api-integration"

# Component Behavior Tests  
npm test -- --testPathPattern="component-behavior"

# Error Handling Tests
npm test -- --testPathPattern="error-handling"

# Performance Tests
npm test -- --testPathPattern="performance"

# User Journey Tests (Playwright)
npx playwright test user-journey/
```

### Generate Coverage Report

```bash
npm test -- --coverage --testPathPattern="(api-integration|component-behavior|error-handling|performance)"
```

## 📊 Test Reports

The test suite generates comprehensive reports:

### 1. HTML Test Report
- **Location**: `reports/london-school-test-report.html`
- **Content**: Complete test execution summary with London School TDD compliance

### 2. Coverage Report
- **Location**: `reports/coverage/lcov-report/index.html`
- **Content**: Code coverage analysis for tested components

### 3. Playwright Report
- **Location**: `reports/playwright-report/index.html`
- **Content**: E2E test results with screenshots and videos

### 4. Performance Metrics
- **Location**: Console output and test logs
- **Content**: Response times, memory usage, and performance analysis

## 🔧 Configuration

### Jest Configuration
**File**: `jest.config.js`

- Configured for London School TDD approach
- Real API testing environment
- Coverage thresholds and reporting
- No mock transformation or stubbing

### Playwright Configuration  
**File**: `playwright.config.ts`

- Real browser testing setup
- Cross-browser and cross-device testing
- Performance and accessibility validation
- Integration with real services

### Environment Setup
**File**: `api-environment.ts`

- Real API endpoint configuration
- Database connection verification
- Network timeout settings
- Health check utilities

## 🎯 London School TDD Compliance

### Collaboration Tracking
The test suite tracks all object collaborations:

```typescript
// Example collaboration verification
verifyCollaboration([
  { source: 'TestComponent', target: '/api/agents', method: 'GET' },
  { source: 'TestComponent', target: '/api/agents/test/pages', method: 'POST' }
]);
```

### Contract Verification
APIs are tested against real contracts:

```typescript
// Example contract verification
const contract = {
  endpoint: '/api/agents',
  method: 'GET',
  expectedResponse: {
    success: expect.any(Boolean),
    agents: expect.any(Array)
  }
};
await verifyApiContract(contract);
```

### Behavior Focus
Tests verify **how objects collaborate** rather than internal state:

```typescript
// Focus on interactions, not implementation
expect(mockService.method).toHaveBeenCalledWith(expectedData);
verifyCollaboration([...expectedInteractionPattern]);
```

## 🚫 What's NOT Included

Following London School TDD principles, this test suite does NOT include:

- ❌ Mock services or data
- ❌ Stubbed API responses  
- ❌ Fake components or utilities
- ❌ Simulated user interactions
- ❌ Mocked network conditions
- ❌ Artificial performance constraints

## 📈 Continuous Integration

### CI Configuration
**File**: `scripts/ci-setup.yml`

- Real service orchestration in CI
- Database setup and migration
- Comprehensive test execution
- Report generation and artifact upload

### CI Requirements
- Real PostgreSQL database service
- Backend service startup and health verification
- Frontend build and serve
- Cross-browser testing with real browsers

## 🛡️ Quality Gates

The test suite enforces quality gates:

1. **Coverage Threshold**: 85% minimum coverage
2. **Performance Standards**: Response times under defined limits
3. **Error Handling**: Graceful degradation verified
4. **Accessibility**: WCAG compliance validated
5. **Cross-Browser**: Chrome, Firefox, Safari compatibility

## 🤝 Contributing

When adding new tests:

1. **Follow London School TDD**: Outside-in, behavior-focused
2. **Maintain NO MOCKS Policy**: Use real services only
3. **Add Collaboration Tracking**: Verify object interactions
4. **Include Performance Metrics**: Measure real system performance
5. **Update Documentation**: Keep README current

## 📚 References

- [London School TDD Methodology](https://github.com/testdouble/contributing-tests/wiki/London-school-TDD)
- [Growing Object-Oriented Software, Guided by Tests](http://www.growing-object-oriented-software.com/)
- [Mock Roles, Not Objects](https://www.jmock.org/oopsla2004.pdf)
- [Integration Testing Best Practices](https://martinfowler.com/articles/microservice-testing/)

---

## 🎉 Success Criteria

This test suite successfully implements London School TDD when:

✅ All tests run against real services with no mocks  
✅ Object collaborations are verified and tracked  
✅ Behavior is tested over implementation details  
✅ Contracts between components are validated  
✅ Real user journeys are automated and verified  
✅ Performance meets real-world requirements  
✅ Error scenarios are tested with actual failures  
✅ System integration is proven end-to-end  

**🔥 London School TDD: Real collaboration, Real data, Real confidence.**