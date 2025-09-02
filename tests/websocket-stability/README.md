# WebSocket Stability Tests

This test suite is specifically designed to **EXPOSE** and **PREVENT REGRESSION** of the 30-second WebSocket connection drop issue reported by users.

## 🎯 Test Philosophy: "Fail Fast, Fix Right"

These tests are **intentionally designed to FAIL** until the root cause is fixed. This approach ensures:

1. **Issue Validation**: Proves the problem actually exists
2. **Fix Verification**: Tests will pass only when properly fixed  
3. **Regression Prevention**: Prevents the issue from returning
4. **Reliable Reproduction**: Consistent way to reproduce the problem

## 📁 Test Structure

```
tests/websocket-stability/
├── websocket-connection-stability.test.js    # Long-duration connection tests (SHOULD FAIL)
├── claude-api-concurrent-test.test.js        # API call + WebSocket tests (SHOULD FAIL)  
├── regression-prevention-tests.test.js       # Fix validation tests (SHOULD FAIL until fixed)
├── test-runner.js                            # Orchestrates all tests with reporting
├── package.json                              # Test dependencies and scripts
└── README.md                                 # This file
```

## 🧪 Test Categories

### 1. Connection Stability Tests (`websocket-connection-stability.test.js`)
- **Purpose**: Expose the 30-second connection drop issue
- **Expected**: FAIL - connections drop before 60+ seconds
- **Tests**:
  - 60+ second connection persistence
  - Connection state monitoring  
  - Connection recovery after drop

### 2. Claude API Concurrent Tests (`claude-api-concurrent-test.test.js`)
- **Purpose**: Expose API calls causing WebSocket drops
- **Expected**: FAIL - API calls trigger connection drops
- **Tests**:
  - WebSocket + concurrent API calls
  - Directory query workflow (user-reported failure)
  - API call timing analysis (30+ second calls)

### 3. Regression Prevention Tests (`regression-prevention-tests.test.js`)
- **Purpose**: Define "success criteria" for the fix
- **Expected**: FAIL until fix is implemented, then PASS
- **Tests**:
  - 90+ second connection guarantee
  - API calls must not affect WebSocket
  - Directory workflow reliability  
  - Connection stability under load

## 🚀 Running the Tests

### Quick Start
```bash
cd /workspaces/agent-feed/tests/websocket-stability

# Install dependencies
npm install

# Run all tests with detailed reporting
node test-runner.js

# Run individual test suites
npm run test:stability      # Connection stability only
npm run test:concurrent     # API + WebSocket tests  
npm run test:regression     # Regression prevention tests
```

### Advanced Usage
```bash
# Watch mode for development
npm run test:watch

# Verbose output with all details
npm run test:verbose

# Debug WebSocket connections
npm run debug:connections

# Validate fix (runs regression tests only)
npm run validate:fix
```

## 📊 Understanding Test Results

### Expected Results (Before Fix)
```
🎯 WEBSOCKET STABILITY TEST SUMMARY
═══════════════════════════════════════════════════
📊 Total Tests: 10
✅ Passed: 1
❌ Failed: 9
⏱️  Duration: 180s

🔍 ISSUE DETECTION STATUS:
Connection Drops Detected: ✅ YES
API Timeout Issues: ✅ YES  
Regression Tests Ready: ✅ YES

🎯 SUCCESS: WebSocket connection drop issues have been EXPOSED!
   These failing tests prove the problem exists.
   Implement fixes, then re-run regression tests to validate.
```

### Expected Results (After Fix)
```
🎯 WEBSOCKET STABILITY TEST SUMMARY
═══════════════════════════════════════════════════
📊 Total Tests: 10
✅ Passed: 10
❌ Failed: 0
⏱️  Duration: 200s

🔍 ISSUE DETECTION STATUS:
Connection Drops Detected: ❌ NO
API Timeout Issues: ❌ NO
Regression Tests Ready: ✅ YES

🚀 EXCELLENT: Regression tests are PASSING!
   This indicates the WebSocket stability issues have been FIXED!
```

## 🔍 Test Methodology

### Real Conditions Testing
- **Real WebSocket connections** (not mocks)
- **Actual API calls** to Claude endpoints
- **Extended durations** (60-90+ seconds)
- **Concurrent operations** (multiple API calls + WebSocket)
- **User workflow simulation** (directory queries)

### Failure Detection
- Connection drops before target duration
- Unexpected WebSocket state changes
- API call timeouts exceeding 30 seconds
- Connection recovery failures
- System load causing instability

### Success Criteria (Regression Tests)
- Connections survive 90+ seconds
- API calls don't affect WebSocket health
- Directory queries complete reliably
- System handles concurrent load
- No unexpected errors or timeouts

## 🛠️ Debugging Failed Tests

### Connection Drop Analysis
```bash
# Check connection events
grep "Connection dropped" test-results/websocket-stability-report.md

# Analyze timing patterns  
grep "elapsed:" test-results/*.json | grep -E "[0-9]{5}" # Find ~30s drops

# Review API call patterns
grep "API call" test-results/*.json
```

### Common Failure Patterns
1. **30-second drops**: Connection closes at ~30,000ms
2. **API-triggered drops**: Connection closes during/after API calls
3. **Timeout cascades**: API timeouts leading to WebSocket closure
4. **State inconsistencies**: WebSocket state changing unexpectedly

## 📈 Monitoring & Metrics

The test runner generates detailed reports:
- `test-results/websocket-stability-report.json` - Machine-readable results
- `test-results/websocket-stability-report.md` - Human-readable analysis

### Key Metrics Tracked
- Connection duration before drops
- API call response times  
- WebSocket state changes
- Error patterns and frequency
- Success/failure rates per test type

## 🔧 Integration with Development Workflow

### Pre-Fix Development
1. Run tests to confirm issue reproduction
2. Analyze failure patterns for root cause investigation  
3. Use test outputs to guide fix implementation

### Post-Fix Validation  
1. Implement potential fixes
2. Run `npm run validate:fix` to test regression suite
3. All regression tests must pass for fix validation
4. Monitor for sustained success over multiple runs

### Continuous Integration
```bash
# Add to CI pipeline
- name: WebSocket Stability Tests
  run: |
    cd tests/websocket-stability  
    node test-runner.js
    # Expect failures until fix is implemented
    # Success = issue properly exposed
```

## 🎯 Success Definition

**This test suite is successful when:**

1. **Before Fix**: Tests reliably FAIL, exposing the connection drop issue
2. **After Fix**: Regression tests consistently PASS, proving stability
3. **Long-term**: Tests continue to pass, preventing regression

## 📞 Support & Troubleshooting

### Common Issues

**Tests not failing as expected?**
- Check server is running (`localhost:3000`)
- Verify WebSocket endpoint is available
- Review timeout settings in test configuration

**Tests taking too long?**  
- Adjust timeout values in package.json scripts
- Use `npm run test:single <test-file>` for individual tests
- Check system resources and network conditions

**Unclear test results?**
- Review generated reports in `test-results/`  
- Use `npm run test:verbose` for detailed output
- Check individual test logs for specific failure reasons

---

Remember: **These tests are designed to fail until the issue is fixed!** A failing test suite initially indicates the tests are working correctly by exposing the problem.