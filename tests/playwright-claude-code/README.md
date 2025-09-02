# Claude Code Integration - Playwright Test Suite

Comprehensive Playwright test suite for validating Claude Code integration in production environments.

## Overview

This test suite provides production-ready validation for the Claude Code integration, ensuring:

- ✅ Complete workflow functionality
- ✅ Message handling and WebSocket resilience  
- ✅ Tool usage display validation
- ✅ Regression testing
- ✅ Visual regression testing
- ✅ Performance benchmarking
- ✅ Cross-browser compatibility
- ✅ CI/CD integration

## Test Structure

```
tests/playwright-claude-code/
├── specs/
│   ├── 01-complete-workflow.spec.ts      # End-to-end workflow tests
│   ├── 02-message-handling.spec.ts       # Message & WebSocket tests
│   ├── 03-tool-usage-display.spec.ts     # Tool usage validation
│   ├── 04-regression-tests.spec.ts       # Existing functionality
│   ├── 05-visual-regression.spec.ts      # Visual consistency
│   ├── 06-performance-benchmarks.spec.ts # Performance testing
│   └── 07-ci-integration.spec.ts         # CI/CD validation
├── utils/
│   ├── global-setup.ts                   # Global test setup
│   ├── global-teardown.ts                # Global test cleanup
│   └── test-helpers.ts                   # Reusable test utilities
├── playwright.config.ts                  # Playwright configuration
└── package.json                          # Test dependencies
```

## Prerequisites

1. **Running Services**:
   - Frontend: `http://localhost:5173`
   - Backend: `http://localhost:8080`

2. **Environment Setup**:
   ```bash
   # Install Playwright browsers
   npm run install:browsers
   
   # Or from root directory
   cd tests/playwright-claude-code
   npx playwright install --with-deps
   ```

## Running Tests

### Quick Start
```bash
# Run all tests
npm run test

# Run with UI (interactive mode)
npm run test:ui

# Run in headed mode (visible browser)
npm run test:headed

# Debug specific test
npm run test:debug
```

### Specific Test Suites
```bash
# Complete workflow tests
npm run test:workflow

# Message handling tests
npm run test:messages

# Tool usage validation
npm run test:tools

# Regression tests
npm run test:regression

# Visual regression tests
npm run test:visual

# Performance benchmarks
npm run test:performance

# CI integration tests
npm run test:ci
```

### Browser-Specific Testing
```bash
# Chrome/Chromium only
npm run test:chrome

# Firefox only
npm run test:firefox

# Safari/WebKit only
npm run test:safari

# Mobile browsers
npm run test:mobile

# Microsoft Edge
npm run test:edge

# All browsers
npm run test:full
```

### Performance and Production Testing
```bash
# Production environment simulation
npm run test:production

# Smoke tests (essential functionality)
npm run test:smoke

# Parallel execution (faster)
npm run test:parallel

# Serial execution (more stable)
npm run test:serial
```

## Test Scenarios

### 1. Complete Workflow Tests (`01-complete-workflow.spec.ts`)

- **Button Click → Instance Creation**: Tests all 4 instance creation buttons
- **Message Sending → Response**: Validates end-to-end communication
- **Chat vs Terminal Separation**: Ensures proper message routing
- **Message Sequencing**: Verifies chronological ordering
- **Instance Lifecycle**: Tests creation, interaction, and cleanup

### 2. Message Handling Tests (`02-message-handling.spec.ts`)

- **Rapid Message Sending**: 10+ messages sent quickly without dropping
- **Message Order Preservation**: Concurrent messages maintain sequence
- **WebSocket Resilience**: Connection interruption and recovery
- **Queue Overflow Handling**: System stability under load
- **Chat/Terminal Separation**: Tool output routing validation
- **Concurrent Users**: Multiple users accessing same instance
- **Performance Under Load**: Sustained message throughput testing

### 3. Tool Usage Display Tests (`03-tool-usage-display.spec.ts`)

- **Terminal-Only Tool Display**: Tool execution appears in terminal, not chat
- **Bash Command Formatting**: Proper formatting of command output
- **File Operation Tools**: Read, Write, Edit tool usage validation
- **Multiple Tool Sequences**: Complex multi-tool operations
- **Error Handling**: Graceful tool error display
- **Terminal History**: Persistent tool usage history
- **Tool Type Formatting**: Distinct formatting for different tools

### 4. Regression Tests (`04-regression-tests.spec.ts`)

- **API Stability**: Core endpoints remain functional
- **Navigation Preservation**: All routes continue working
- **CRUD Operations**: Instance management functionality
- **WebSocket Stability**: Connection reliability
- **Error Handling**: Graceful failure modes
- **UI Responsiveness**: Component behavior across viewports
- **Performance Characteristics**: Load time and interaction speed
- **Accessibility Features**: Keyboard navigation and ARIA compliance
- **State Persistence**: Browser refresh handling

### 5. Visual Regression Tests (`05-visual-regression.spec.ts`)

- **Page Layout Consistency**: Screenshots of key UI states
- **Responsive Design**: Multiple viewport testing
- **Button and Form States**: Hover, focus, active states
- **Loading and Error States**: Visual feedback consistency
- **Typography and Spacing**: Text rendering and layout
- **Color Scheme Consistency**: Theme application
- **Animation States**: Transition and animation frames
- **Cross-Browser Visuals**: Rendering consistency across browsers

### 6. Performance Benchmarks (`06-performance-benchmarks.spec.ts`)

- **Page Load Performance**: <5s initial load, <2s DOM ready, <3s FCP
- **Memory Usage Monitoring**: <100MB total, <200% growth during operations
- **Network Optimization**: No excessive duplicate requests, <2s API response
- **Interaction Latency**: <10s average response time
- **WebSocket Performance**: Message throughput under load
- **Concurrent User Simulation**: 3+ simultaneous users
- **Resource Usage**: DOM growth and cleanup validation

### 7. CI Integration Tests (`07-ci-integration.spec.ts`)

- **Cross-Browser Compatibility**: Chrome, Firefox, Safari, Edge
- **Headless Operation**: Full functionality without UI
- **Environment Configuration**: Development vs production settings
- **Parallel Execution**: Test isolation and stability
- **CI-Friendly Reporting**: Metrics and artifacts for CI/CD
- **Test Cleanup**: Proper resource cleanup between tests
- **Production Readiness**: Performance and error thresholds

## Configuration

### Playwright Configuration (`playwright.config.ts`)

```typescript
// Key configuration highlights:
- Timeout: 60s per test, 10s per assertion
- Retry: 2 attempts on CI, 0 locally
- Browsers: Chrome, Firefox, Safari, Edge, Mobile
- Screenshots: On failure only
- Video: Retain on failure
- Trace: On first retry
- Parallel: Full parallelism except on CI
```

### Environment Variables

```bash
# CI Environment
CI=true                    # Enables CI-specific behavior

# Custom Configuration
NODE_ENV=production        # Environment-specific testing
PORT=5173                 # Frontend port
API_PORT=8080             # Backend port
```

## Test Helpers (`utils/test-helpers.ts`)

The `ClaudeCodeTestHelpers` class provides reusable functionality:

- `navigateToClaudeInstances()`: Navigate to instances page
- `createInstance(type)`: Create new Claude instance
- `sendMessageToInstance(id, message)`: Send and wait for response
- `getChatMessages()`: Retrieve all chat messages
- `getTerminalOutput(id)`: Get terminal content
- `waitForWebSocketConnection()`: Wait for WS connection
- `verifyToolUsageInTerminalOnly()`: Validate tool separation
- `testRapidMessageSending()`: Stress test messaging
- `measurePerformance()`: Collect performance metrics
- `cleanupInstances()`: Remove test instances

## Reporting

### HTML Report
```bash
npm run report
```

### CI/CD Integration
- JUnit XML output: `test-results/junit-results.xml`
- JSON results: `test-results/results.json`
- Screenshots: `test-results/screenshots/`
- Videos: `test-results/videos/`

## Production Validation Standards

### Performance Requirements
- Page Load: <5 seconds
- First Contentful Paint: <3 seconds
- Message Response: <10 seconds average
- Memory Usage: <100MB sustained
- API Response: <2 seconds average

### Reliability Requirements
- Test Success Rate: >95%
- WebSocket Stability: No connection errors
- Cross-Browser: Chrome, Firefox, Safari, Edge support
- Mobile Compatibility: iOS Safari, Android Chrome
- Concurrent Users: Support 3+ simultaneous users

### Quality Assurance
- Zero Critical Console Errors
- Proper Error Handling
- Accessibility Compliance
- Visual Consistency
- State Persistence

## Troubleshooting

### Common Issues

1. **Service Not Running**
   ```bash
   # Check if services are running
   curl http://localhost:5173
   curl http://localhost:8080/health
   ```

2. **Port Conflicts**
   ```bash
   # Find processes using ports
   lsof -i :5173
   lsof -i :8080
   ```

3. **Browser Installation**
   ```bash
   # Reinstall browsers
   npx playwright install --force
   ```

4. **WebSocket Issues**
   ```bash
   # Check WebSocket endpoint
   curl -i -N -H "Connection: Upgrade" -H "Upgrade: websocket" \
        -H "Sec-WebSocket-Key: test" -H "Sec-WebSocket-Version: 13" \
        http://localhost:8080
   ```

### Debug Mode

```bash
# Run with debug output
DEBUG=pw:* npm run test

# Run specific test with full debug
npm run test:debug -- --grep "should create Claude Interactive instance"

# Generate trace for failed test
npm run test -- --trace on
```

## Contributing

1. **Adding New Tests**: Follow existing patterns in `specs/`
2. **Extending Helpers**: Add reusable functions to `test-helpers.ts`
3. **Visual Tests**: Update screenshots when UI changes intentionally
4. **Performance Tests**: Adjust thresholds for different environments

## Deployment Readiness

This test suite validates production readiness by ensuring:

- ✅ All critical workflows function correctly
- ✅ No message dropping or corruption occurs
- ✅ Tool usage displays properly in terminal
- ✅ Previous functionality remains stable
- ✅ UI renders consistently across browsers
- ✅ Performance meets production standards
- ✅ Error handling works gracefully
- ✅ WebSocket connections are resilient
- ✅ Concurrent usage is supported
- ✅ Mobile devices are supported

**Ready for production deployment when all tests pass consistently.**