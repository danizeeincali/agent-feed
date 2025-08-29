# TDD London School - Claude Process Regression Test Suite

**CRITICAL REGRESSION PROTECTION** for Claude process functionality using London School TDD methodology.

## 🎯 Purpose

This test suite protects the core Claude process functionality from regressions by testing:

- **Claude process spawning WITHOUT --print flags** (CRITICAL)
- **Working directory resolution** (prod → `/workspaces/agent-feed/prod`)
- **Authentication flow and environment inheritance**
- **SSE integration and connection stability**
- **Error handling and recovery scenarios**

## 🏗️ London School TDD Methodology

This suite follows **London School (mockist) TDD principles**:

- **Outside-In Development**: Tests drive from user behavior to implementation
- **Mock-Driven Development**: Extensive mocking isolates units and defines contracts
- **Behavior Verification**: Focus on **HOW objects collaborate**, not what they contain
- **Contract Testing**: Mocks define clear interfaces and responsibilities
- **Fast, Isolated Tests**: No external dependencies, deterministic results

## 📁 Test Structure

```
tests/regression/
├── claude-process-spawning.test.js      # CRITICAL: Process spawning contracts
├── working-directory-resolution.test.js # Directory resolution behavior
├── authentication-flow.test.js          # Auth detection and inheritance
├── sse-integration.test.js              # SSE connection and broadcasting
├── error-handling.test.js               # Error scenarios and recovery
├── jest.config.js                       # Jest configuration
├── jest.setup.js                        # Test environment setup
├── __mocks__/                           # Mock implementations
│   ├── child_process.js                 # Mock child_process.spawn()
│   ├── node-pty.js                      # Mock PTY processes
│   └── fs.js                            # Mock filesystem operations
└── run-regression-tests.js              # Test runner with reporting
```

## 🚀 Quick Start

### Run All Regression Tests
```bash
cd tests/regression
npm test
```

### Run Specific Test Categories
```bash
npm run test:spawning    # Claude process spawning
npm run test:directories # Working directory resolution
npm run test:auth        # Authentication flow
npm run test:sse         # SSE integration
npm run test:errors      # Error handling
```

### Watch Mode for Development
```bash
npm run test:watch
```

### Coverage Report
```bash
npm run test:coverage
```

### CI/CD Integration
```bash
npm run test:ci
```

## 🔍 Critical Test Cases

### 1. Claude Process Spawning (CRITICAL)
```javascript
test('should spawn prod button WITHOUT --print flag (CRITICAL)', () => {
  // Verifies that prod button spawns 'claude' with no additional arguments
  // CRITICAL: Prevents --print flag regression that breaks interactive sessions
});
```

### 2. Working Directory Resolution (CRITICAL) 
```javascript
test('should resolve prod button to /workspaces/agent-feed/prod (CRITICAL)', async () => {
  // Verifies prod button spawns in correct directory
  // CRITICAL: Prevents directory resolution regression
});
```

### 3. Authentication Detection (CRITICAL)
```javascript
test('should detect authentication via credentials file (CRITICAL)', async () => {
  // Verifies Claude Code authentication inheritance works
  // CRITICAL: Prevents authentication failures
});
```

### 4. SSE Connection Establishment (CRITICAL)
```javascript
test('should establish SSE connection with correct headers (CRITICAL)', () => {
  // Verifies SSE headers and connection setup
  // CRITICAL: Prevents terminal connection failures
});
```

## 📊 Test Reports

After running tests, reports are generated in `test-results/`:

- `summary.json` - Overall test results and status
- `performance.json` - Test execution performance metrics  
- `analysis.json` - Failure analysis and recommendations
- `regression-test-results.xml` - JUnit format for CI/CD
- `regression-test-report.html` - HTML report with details

## 🏆 Coverage Requirements

Strict coverage thresholds protect critical functionality:

- **Global**: 85% lines, 90% functions, 85% branches, 85% statements
- **real-claude-backend.js**: 95% (critical file)
- **simple-backend.js**: 90% (important file)

## 🔧 Mock Architecture  

### Child Process Mocking
- **MockChildProcess**: Simulates real process spawning
- **Event-driven**: Emits spawn, exit, error events
- **Stream simulation**: Mock stdin/stdout/stderr
- **Deterministic**: Predictable behavior for testing

### Filesystem Mocking
- **Virtual filesystem**: In-memory file/directory state
- **Credentials simulation**: Mock Claude authentication files
- **Directory validation**: Simulates real filesystem checks
- **Permission handling**: Mock access permissions

### SSE Connection Mocking
- **Connection tracking**: Simulates multiple client connections
- **Error scenarios**: Tests connection failures and recovery
- **Broadcast verification**: Ensures messages reach all clients
- **Cleanup testing**: Validates dead connection removal

## 🚨 Regression Detection

The test suite detects **critical regressions** in:

1. **Process Spawning**: Any change to Claude spawn arguments
2. **Working Directories**: Changes to directory resolution logic
3. **Authentication**: Failures in auth detection or inheritance
4. **SSE Integration**: Connection setup or message broadcasting issues
5. **Error Handling**: Failures in error scenarios or recovery

When critical regressions are detected:
- Tests fail with clear error messages
- CI/CD pipeline should be stopped
- Reports highlight specific regression areas
- Exit codes indicate regression severity

## 🧪 Test Development Guidelines

### Writing New Tests
1. **Follow London School principles**: Mock dependencies, test behavior
2. **Use descriptive names**: Include "CRITICAL" for regression-critical tests
3. **Mock everything**: No real filesystem, process, or network calls
4. **Test contracts**: Verify how objects collaborate
5. **Fast execution**: Tests should complete in milliseconds

### Mock Development
1. **Event-driven**: Use EventEmitter for realistic behavior
2. **State management**: Track mock state consistently  
3. **Error simulation**: Support failure scenarios
4. **Cleanup**: Provide test reset functionality

### Adding Coverage
1. **Critical paths first**: Focus on user-facing functionality
2. **Edge cases**: Test error scenarios and edge conditions
3. **Integration points**: Test where components interact
4. **Recovery logic**: Test failure and recovery scenarios

## 🔄 Continuous Integration

### Pre-commit Hooks
```bash
# Run regression tests before each commit
npm test
```

### CI/CD Pipeline Integration
```yaml
# Example GitHub Actions
- name: Run Regression Tests
  run: |
    cd tests/regression
    npm ci
    npm run test:ci
```

### Failure Handling
- **Exit codes**: 0 = success, 1 = failure/regression
- **Reports**: Machine-readable JSON + human-readable HTML
- **Notifications**: Critical regressions trigger alerts

## 📈 Performance Metrics

The test suite tracks performance to prevent test suite degradation:

- **Individual test times**: Identifies slow tests
- **Total suite time**: Monitors suite performance  
- **Average test time**: London School tests should be fast (<100ms avg)
- **Slowest tests**: Reports tests needing optimization

## 🛠️ Troubleshooting

### Common Issues

**Tests failing with "Module not found"**
```bash
cd tests/regression
npm install
```

**Mocks not working correctly**  
- Check mock implementations in `__mocks__/`
- Verify jest.setup.js runs before tests
- Ensure proper mock cleanup between tests

**Coverage thresholds not met**
- Add tests for uncovered code paths
- Focus on critical functionality first
- Check coverage report for specific gaps

**Tests running slowly**
- Review mock implementations for unnecessary delays
- Check for real I/O operations leaking into tests
- Optimize test setup/teardown

### Debug Mode
```bash
npm run test:debug
```

## 🤝 Contributing

When contributing to the regression test suite:

1. **Maintain London School principles**
2. **Add tests for new functionality**  
3. **Update critical test cases for changes**
4. **Ensure fast, isolated test execution**
5. **Document test purpose and expectations**

## 📄 License

MIT - This test suite is designed to protect Claude process functionality from regressions.