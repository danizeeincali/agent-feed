# Terminal Echo Duplication Prevention Test Suite

This comprehensive test suite ensures that the terminal interface operates without character echo duplication issues.

## Test Coverage

### 1. Regression Tests (`/regression/`)

#### `echo-duplication-prevention.test.ts`
- **Purpose**: Prevents regression of echo duplication bugs
- **Coverage**: Single character validation, incremental buildup prevention, character-by-character validation
- **Key Tests**:
  - Typing 'hello' results in exactly 'hello' appearing once
  - No incremental character buildup (h→he→hel→hell→hello)
  - Handles special characters, unicode, backspace, and paste operations
  - Performance impact validation

#### `claude-cli-interaction.test.ts`
- **Purpose**: Validates Claude CLI commands work without echo issues
- **Coverage**: CLI command execution, interactive mode, file operations, error handling
- **Key Tests**:
  - `claude --version`, `claude --help`, `claude auth status`
  - Interactive Claude sessions without echo loops
  - File analysis and code generation commands
  - Timeout and connection error scenarios

### 2. Integration Tests (`/integration/`)

#### `websocket-message-flow.test.ts`
- **Purpose**: Tests WebSocket communication layer
- **Coverage**: Message flow analysis, echo loop detection, queue management
- **Key Tests**:
  - Clean WebSocket connection without duplicate handshakes
  - Terminal input without message duplication
  - Echo loop prevention and detection
  - Message queue management under load
  - Connection stability and recovery

### 3. End-to-End Tests (`/e2e/`)

#### `terminal-interaction.spec.ts`
- **Purpose**: Complete user workflow testing
- **Coverage**: Full terminal functionality, button interactions, Claude CLI integration
- **Key Tests**:
  - All 4 terminal buttons work without echo issues
  - Cross-terminal session switching
  - Real Claude CLI command execution
  - Performance and responsiveness validation

### 4. Performance Tests (`/performance/`)

#### `terminal-performance.test.ts`
- **Purpose**: Ensures echo prevention doesn't impact performance
- **Coverage**: Typing latency, throughput, memory usage, sustained load
- **Key Tests**:
  - Character echo latency <100ms average, <500ms max
  - Rapid typing >50 characters per second
  - Memory leak prevention during extended sessions
  - Performance consistency under sustained load

## Running Tests

### Install Dependencies
```bash
cd /workspaces/agent-feed/tests
npm install
npx playwright install
```

### Run Specific Test Suites
```bash
# Echo duplication prevention
npm run test:echo

# WebSocket message flow
npm run test:websocket

# End-to-end terminal interaction
npm run test:e2e

# Claude CLI specific tests
npm run test:claude

# Performance tests
npm run test:performance

# Cross-browser testing
npm run test:cross-browser

# All tests
npm run test:all
```

### Debug Mode
```bash
# Run with browser visible
npm run test:headed

# Run in debug mode (step through)
npm run test:debug

# View test report
npm run test:report
```

## Validation Criteria

### ✅ PASS Criteria
- Typing 'hello' results in exactly 'hello' appearing once
- No incremental character buildup patterns
- Clean WebSocket message flow without duplicate sends
- All 4 terminal buttons function without echo issues  
- Claude CLI commands execute without character repetition
- Performance metrics within acceptable thresholds

### ❌ FAIL Criteria
- Any character duplication detected
- Incremental buildup patterns (h→he→hel→hell→hello)
- WebSocket echo loops
- Terminal unresponsiveness
- Performance degradation >25%

## Test Architecture

### Class Structure
- `TerminalEchoValidator`: Core echo detection and validation
- `WebSocketMessageTracker`: WebSocket message flow analysis
- `TerminalInteractionTester`: E2E user interaction testing
- `ClaudeCLITester`: Claude CLI specific testing
- `TerminalPerformanceTester`: Performance measurement and analysis

### Key Testing Patterns
- Character-by-character input validation
- Message flow analysis with timestamps
- Concurrent operation stress testing
- Performance regression detection
- Cross-browser compatibility validation

## Continuous Integration

Tests are configured for CI/CD with:
- HTML, JSON, and JUnit reporting
- Video/screenshot capture on failures
- Cross-browser testing (Chrome, Firefox, Safari)
- Retry logic for flaky tests
- Performance threshold validation

## Troubleshooting

### Common Issues
1. **WebSocket connection fails**: Ensure backend server is running
2. **Tests timeout**: Increase timeout in playwright config
3. **Performance tests fail**: Check system load during test execution
4. **Claude CLI tests fail**: Verify Claude CLI is installed and configured

### Debug Tips
- Use `npm run test:headed` to see browser interaction
- Check test-results/ directory for failure screenshots/videos
- Use `npm run test:debug` for step-through debugging
- Monitor browser console for JavaScript errors during tests