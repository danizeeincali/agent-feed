# Escape Sequence Storm TDD Test Suite

A comprehensive Test-Driven Development (TDD) test suite that demonstrates and prevents terminal escape sequence storms through systematic identification and testing of root causes.

## 🎯 Purpose

This test suite **intentionally demonstrates broken behavior** that causes terminal escape sequence storms. The tests are designed to **FAIL initially**, showing exactly what needs to be fixed to prevent these storms.

## 🚨 Expected Behavior

**⚠️ THESE TESTS SHOULD FAIL INITIALLY!**

- ❌ **Failing tests** = Successful demonstration of the problems
- ✅ **Passing tests** = Storm prevention mechanisms are working
- 🔧 **Goal**: Fix the issues until all tests pass

## 🔍 Root Causes Tested

### 1. Button Click Debouncing Failures
- **Problem**: Multiple rapid clicks spawn overlapping Claude instances
- **Storm Effect**: Creates competing processes with conflicting terminal output
- **Test Files**: `tests/unit/escape-sequence-storm/button-click-debouncing.test.ts`

### 2. PTY Process Management Issues  
- **Problem**: Improper PTY process lifecycle and escape sequence handling
- **Storm Effect**: Multiple processes output conflicting escape sequences
- **Test Files**: `tests/unit/escape-sequence-storm/pty-process-management.test.ts`

### 3. SSE Connection Multiplication
- **Problem**: Event listener multiplication creates duplicate data streams
- **Storm Effect**: Same output processed multiple times, amplifying conflicts
- **Test Files**: `tests/unit/escape-sequence-storm/sse-connection-management.test.ts`

### 4. Output Buffer Management Failures
- **Problem**: Unbounded buffering without rate limiting overwhelms system
- **Storm Effect**: Memory exhaustion and processing backlogs
- **Test Files**: `tests/unit/escape-sequence-storm/output-buffer-management.test.ts`

### 5. System-Wide Integration Failures
- **Problem**: Combined failures create perfect storm conditions
- **Storm Effect**: Complete terminal breakdown and system unresponsiveness
- **Test Files**: `tests/integration/escape-sequence-storm/end-to-end-prevention.test.ts`

## 🚀 Quick Start

### Run All Tests

```bash
# Make script executable (first time only)
chmod +x tests/escape-sequence-storm/run-tests.sh

# Run complete test suite
./tests/escape-sequence-storm/run-tests.sh
```

### Run Specific Categories

```bash
# Test specific failure categories
npx jest --config=tests/escape-sequence-storm/jest.config.js --testNamePattern="Button Click Debouncing"
npx jest --config=tests/escape-sequence-storm/jest.config.js --testNamePattern="PTY Process Management"
npx jest --config=tests/escape-sequence-storm/jest.config.js --testNamePattern="SSE Connection Management" 
npx jest --config=tests/escape-sequence-storm/jest.config.js --testNamePattern="Output Buffer Management"
npx jest --config=tests/escape-sequence-storm/jest.config.js --testNamePattern="End-to-End"
```

### Manual Test Execution

```bash
# Navigate to test directory
cd tests/escape-sequence-storm

# Install dependencies (if needed)
npm install

# Run with coverage
npx jest --coverage --verbose
```

## 📋 Test Structure

```
tests/escape-sequence-storm/
├── README.md                              # This file
├── run-tests.sh                          # Main test runner script
├── jest.config.js                       # Jest configuration
├── jest.setup.js                        # Test environment setup
├── global-setup.js                      # Global test setup
├── global-teardown.js                   # Global test teardown
├── test-results-processor.js            # Results analysis
│
├── unit/escape-sequence-storm/
│   ├── button-click-debouncing.test.ts         # Button click failures
│   ├── pty-process-management.test.ts          # PTY process issues
│   ├── sse-connection-management.test.ts       # SSE connection problems
│   └── output-buffer-management.test.ts        # Buffer management failures
│
├── integration/escape-sequence-storm/
│   └── end-to-end-prevention.test.ts           # Complete storm scenarios
│
├── coverage/                             # Test coverage reports
├── reports/                             # HTML test reports
└── artifacts/                           # Test metadata and artifacts
```

## 🔧 Understanding Test Results

### Initial Run (Expected)
```
❌ Button Click Debouncing: 8 failures
❌ PTY Process Management: 12 failures  
❌ SSE Connection Management: 10 failures
❌ Output Buffer Management: 9 failures
❌ End-to-End Integration: 6 failures
```

**This is CORRECT!** These failures show the exact broken behaviors causing escape sequence storms.

### After Implementing Fixes
```
✅ Button Click Debouncing: All tests pass
✅ PTY Process Management: All tests pass
✅ SSE Connection Management: All tests pass  
✅ Output Buffer Management: All tests pass
✅ End-to-End Integration: All tests pass
```

**Success!** The escape sequence storms have been prevented.

## 🛠️ Implementation Roadmap

### Phase 1: Quick Wins (1-2 days)
1. **Button Click Debouncing** (Priority 1)
   - Add loading state management
   - Implement button debouncing logic
   - Disable buttons during async operations

### Phase 2: Core Fixes (3-5 days)  
2. **PTY Process Management** (Priority 2)
   - Fix process cleanup before spawning
   - Implement escape sequence filtering
   - Add proper event handler cleanup

3. **SSE Connection Management** (Priority 3)
   - Ensure single connection per instance
   - Fix event handler multiplication
   - Implement proper reconnection logic

### Phase 3: System Hardening (2-3 days)
4. **Output Buffer Management** (Priority 4)
   - Add output rate limiting
   - Implement buffer size limits  
   - Fix position tracking issues

### Phase 4: Advanced Features (3-4 days)
5. **Storm Detection & Mitigation** (Priority 5)
   - Add automatic storm detection
   - Implement circuit breaker patterns
   - Create graceful degradation

## 📊 Generated Reports

After running tests, find detailed reports at:

- **Coverage Report**: `coverage/index.html` - Code coverage analysis
- **HTML Test Report**: `reports/escape-sequence-storm-test-report.html` - Detailed test results
- **Analysis Report**: `ANALYSIS_REPORT.md` - Root cause analysis and fix priorities
- **Summary Report**: `SUMMARY_REPORT.md` - Executive summary of findings

## 🔍 Test Analysis Features

The test suite includes advanced analysis capabilities:

### Automatic Root Cause Detection
- Categorizes failures by impact and priority
- Identifies patterns in test failures
- Maps failures to specific code areas

### Fix Priority Recommendations
- Ranks fixes by effort vs impact
- Provides specific implementation steps
- Suggests optimal implementation order

### Implementation Timeline
- Breaks work into manageable phases
- Estimates effort and duration
- Tracks dependencies between fixes

## 💡 Key Test Scenarios

### Button Click Storm Reproduction
```typescript
// This test SHOULD FAIL initially
test('Multiple rapid clicks create multiple instances', async () => {
  const prodButton = screen.getByTitle('Launch Claude in prod directory');
  
  // Simulate user frantically clicking
  for (let i = 0; i < 10; i++) {
    fireEvent.click(prodButton);
  }
  
  // Should only create 1 instance, not 10
  expect(createCalls).toHaveLength(1); // FAILS initially
});
```

### PTY Conflict Detection
```typescript  
// This test SHOULD FAIL initially
test('PTY processes create conflicting escape sequences', async () => {
  // Send conflicting sequences from multiple processes
  const conflicts = ['\x1b[2J\x1b[H', '\x1b[?1049h', '\x1b[?1049l'];
  
  // Should filter or manage conflicts
  expect(hasConflicts).toBe(false); // FAILS initially
});
```

### SSE Multiplication Prevention
```typescript
// This test SHOULD FAIL initially  
test('Multiple SSE connections to same instance', async () => {
  connectSSE(instanceId);
  connectSSE(instanceId); // Second connection
  connectSSE(instanceId); // Third connection
  
  // Should only create one connection
  expect(EventSource).toHaveBeenCalledTimes(1); // FAILS initially
});
```

## 🤝 Contributing

### Running Tests During Development

```bash
# Watch mode for active development
npx jest --config=tests/escape-sequence-storm/jest.config.js --watch

# Debug specific test
npx jest --config=tests/escape-sequence-storm/jest.config.js --testNamePattern="specific test name" --runInBand --detectOpenHandles
```

### Adding New Test Cases

1. Identify a new failure scenario
2. Add test that demonstrates the broken behavior (should fail initially)
3. Implement the fix
4. Verify test passes after fix
5. Update documentation

### Test Naming Convention

- **Unit tests**: `[component]-[failure-type].test.ts`
- **Integration tests**: `[workflow]-[storm-scenario].test.ts`
- **Test names**: Should describe the failure condition, not the expected behavior

## 🚨 Troubleshooting

### Tests Pass Immediately (Unexpected)
This might indicate:
1. Fixes have already been implemented
2. Test environment isn't reproducing the conditions correctly
3. Mocks need adjustment to simulate real conditions

### Tests Hang or Timeout
This indicates:
1. Successful reproduction of the hanging conditions (good!)
2. Timeout values may need adjustment for CI environments
3. Cleanup logic might need improvement

### No Test Output
Check:
1. Jest configuration paths are correct
2. Dependencies are installed (`npm install` in test directory)
3. File permissions on `run-tests.sh` (`chmod +x`)

## 📚 Related Documentation

- **Root Cause Analysis**: `tests/SPARC_DEBUG_ROOT_CAUSE_ANALYSIS.md`
- **NLD Patterns**: `src/nld/` directory
- **Original Issue Reports**: Search codebase for "escape sequence storm"

## 🏆 Success Metrics

The test suite is successful when:

1. **Initial Run**: Most/all tests fail (demonstrates problems exist)
2. **After Fixes**: All tests pass (problems are resolved)
3. **Performance**: Terminal remains responsive under load
4. **Stability**: No memory leaks or resource exhaustion
5. **User Experience**: Single button click creates single instance

---

**Remember**: Failing tests are SUCCESS in this TDD suite - they show us exactly what needs to be fixed to prevent escape sequence storms!

*Happy Testing! 🧪*