# Comprehensive Regression Test Suite

This directory contains a comprehensive test suite designed to prevent regressions and ensure the quality of the Agent Feed Frontend application.

## Test Structure

```
src/tests/
├── unit/                    # Unit tests for individual components
│   ├── AgentManager.test.tsx
│   ├── DualInstanceDashboard.test.tsx
│   ├── WebSocketContext.test.tsx
│   └── ErrorBoundary.test.tsx
├── integration/             # Integration tests for component interactions
│   ├── ComponentInteraction.test.tsx
│   └── ApiIntegration.test.tsx
├── e2e/                     # End-to-end tests using Playwright
│   └── UserWorkflows.spec.ts
├── performance/             # Performance and memory tests
│   ├── RenderPerformance.test.tsx
│   └── BundleSize.test.js
├── regression/              # Regression prevention tests
│   └── WhiteScreenPrevention.test.tsx
└── README.md
```

## Test Categories

### 1. Core Feature Tests

#### Enhanced Agent Manager (Priority: HIGH)
- **File**: `unit/AgentManager.test.tsx`
- **Coverage**: All three tabs, filtering, search functionality
- **Key Tests**:
  - Agent grid rendering and pagination
  - Search and filter functionality
  - CRUD operations (Create, Edit, Delete agents)
  - Bulk operations and selection
  - Status toggle functionality
  - Template-based agent creation
  - API integration and error handling
  - Auto-refresh mechanism
  - Accessibility compliance

#### Dual Instance Dashboard (Priority: HIGH)
- **File**: `unit/DualInstanceDashboard.test.tsx`
- **Coverage**: Dual instance functionality and synchronization
- **Key Tests**:
  - Instance panel rendering
  - Synchronization controls
  - Real-time updates
  - Performance monitoring
  - Error handling
  - WebSocket integration
  - Responsive design
  - Cross-instance data management

#### WebSocket Integration (Priority: HIGH)
- **File**: `unit/WebSocketContext.test.tsx`
- **Coverage**: Real-time communication and connection management
- **Key Tests**:
  - Connection establishment and teardown
  - Message sending and receiving
  - Reconnection logic
  - Error handling
  - Message listener management
  - Configuration handling
  - Cleanup on unmount

### 2. Integration Tests

#### Component Interaction Testing (Priority: HIGH)
- **File**: `integration/ComponentInteraction.test.tsx`
- **Coverage**: Cross-component communication and state management
- **Key Tests**:
  - Navigation between routes
  - State persistence across components
  - WebSocket message handling across components
  - Error boundary integration
  - Performance under concurrent operations
  - Mobile and responsive behavior

#### API Integration Validation (Priority: HIGH)
- **File**: `integration/ApiIntegration.test.tsx`
- **Coverage**: Backend communication and data handling
- **Key Tests**:
  - Successful API calls and response handling
  - Error response handling
  - Retry logic and failure recovery
  - Data validation and sanitization
  - Caching behavior
  - Concurrent request handling
  - Authentication and authorization
  - Performance under load

### 3. End-to-End Tests

#### User Workflows (Priority: HIGH)
- **File**: `e2e/UserWorkflows.spec.ts`
- **Coverage**: Complete user journeys and workflows
- **Key Tests**:
  - Application loading without white screen
  - Navigation between all routes
  - Agent management workflow (create, edit, delete)
  - Dual instance dashboard operations
  - Real-time feature functionality
  - Error recovery scenarios
  - Performance under normal usage
  - Accessibility compliance
  - Mobile device compatibility
  - Visual regression prevention

### 4. Performance Tests

#### Render Performance (Priority: MEDIUM)
- **File**: `performance/RenderPerformance.test.tsx`
- **Coverage**: Component rendering speed and memory usage
- **Key Tests**:
  - Initial render time limits
  - Re-render performance optimization
  - Memory leak detection
  - Large dataset handling
  - Concurrent operation performance
  - Regression detection
  - Stress testing

#### Bundle Size and Load Performance (Priority: MEDIUM)
- **File**: `performance/BundleSize.test.js`
- **Coverage**: Asset optimization and loading performance
- **Key Tests**:
  - Total bundle size limits
  - Code splitting effectiveness
  - Asset compression verification
  - Tree shaking validation
  - Performance budget compliance
  - Load time estimation
  - Bundle size tracking over time

### 5. Regression Prevention

#### White Screen Prevention (Priority: CRITICAL)
- **File**: `regression/WhiteScreenPrevention.test.tsx`
- **Coverage**: Comprehensive white screen prevention
- **Key Tests**:
  - Component rendering validation
  - API failure handling
  - WebSocket connection failures
  - Component lifecycle errors
  - Browser compatibility issues
  - Memory and performance edge cases
  - Route navigation edge cases
  - Accessibility maintenance
  - Visual regression prevention

#### Error Boundary Testing (Priority: HIGH)
- **File**: `unit/ErrorBoundary.test.tsx`
- **Coverage**: Error handling and recovery mechanisms
- **Key Tests**:
  - Error catching and fallback UI
  - Different error boundary types
  - Error reporting and analytics
  - State management during errors
  - Performance impact assessment
  - Accessibility during error states

## Running Tests

### All Tests
```bash
npm test
```

### Unit Tests Only
```bash
npm test src/tests/unit
```

### Integration Tests
```bash
npm test src/tests/integration
```

### End-to-End Tests
```bash
npx playwright test src/tests/e2e
```

### Performance Tests
```bash
npm test src/tests/performance
```

### Regression Tests
```bash
npm test src/tests/regression
```

### With Coverage
```bash
npm test --coverage
```

### Watch Mode
```bash
npm test --watch
```

## Test Configuration

### Jest Configuration
- Located in `jest.config.cjs`
- Configured for TypeScript and React
- Includes coverage thresholds
- Mock configurations for external dependencies

### Playwright Configuration
- Located in `playwright.config.ts`
- Configured for multiple browsers
- Includes visual regression testing
- Mobile device testing setup

## Coverage Requirements

- **Statements**: >80%
- **Branches**: >75%
- **Functions**: >80%
- **Lines**: >80%

## Performance Benchmarks

### Render Performance Targets
- **Component render time**: <1000ms
- **Re-render time**: <100ms
- **Memory usage**: <50MB increase per component cycle
- **Large dataset handling**: <3000ms for 1000+ items

### Bundle Size Targets
- **Total bundle**: <10MB
- **Main JS bundle**: <5MB
- **CSS bundle**: <1MB
- **Individual chunks**: <2MB

### Load Time Targets
- **Fast 3G**: <10 seconds
- **4G**: <5 seconds
- **WiFi**: <2 seconds

## Continuous Integration

### Pre-commit Hooks
- Run unit tests
- Check code coverage
- Lint and format code

### CI Pipeline
- Run all test suites
- Generate coverage reports
- Performance regression checks
- Bundle size tracking
- Visual regression testing

## Debugging Failed Tests

### Common Issues
1. **API Mock Failures**: Check mock configurations in `beforeEach` blocks
2. **Timing Issues**: Use `waitFor` for async operations
3. **WebSocket Mocks**: Ensure proper cleanup in tests
4. **Memory Leaks**: Check for proper component unmounting

### Debugging Tools
- React Developer Tools
- Chrome DevTools Performance tab
- Jest coverage reports
- Playwright trace viewer
- Bundle analyzer

## Best Practices

### Test Writing
1. **Arrange-Act-Assert**: Structure tests clearly
2. **One assertion per test**: Focus on single behaviors
3. **Descriptive names**: Explain what and why
4. **Proper cleanup**: Avoid test pollution
5. **Mock external dependencies**: Keep tests isolated

### Performance Testing
1. **Consistent environment**: Use same conditions
2. **Multiple iterations**: Average results
3. **Realistic data**: Use production-like datasets
4. **Monitor trends**: Track performance over time

### Regression Prevention
1. **Comprehensive coverage**: Test edge cases
2. **Error simulation**: Test failure scenarios
3. **Cross-browser testing**: Ensure compatibility
4. **Accessibility testing**: Maintain usability
5. **Visual regression**: Prevent UI regressions

## Maintenance

### Regular Updates
- Update test dependencies monthly
- Review and update performance benchmarks
- Add new test cases for new features
- Update mock data to match API changes

### Performance Monitoring
- Weekly bundle size reports
- Monthly performance regression analysis
- Quarterly comprehensive test suite review

## Contributing

When adding new features or fixing bugs:

1. **Add corresponding tests** for all new functionality
2. **Update existing tests** if behavior changes
3. **Run full test suite** before submitting PR
4. **Check coverage** and maintain targets
5. **Update documentation** for test changes

This comprehensive test suite ensures the reliability, performance, and user experience of the Agent Feed Frontend application while preventing regressions and maintaining code quality.