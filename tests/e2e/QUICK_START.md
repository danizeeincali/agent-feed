# E2E Test Suite Quick Start Guide

Get up and running with the page registration E2E tests in 5 minutes.

## Prerequisites

- Node.js >= 16
- npm or yarn
- SQLite3
- Bash shell

## Quick Setup

### 1. Install Dependencies

```bash
cd /workspaces/agent-feed/tests/e2e
npm install
```

### 2. Verify Prerequisites

```bash
# Check Node version
node --version  # Should be >= 16

# Check database exists
ls -l /workspaces/agent-feed/data/agent-pages.db

# Check pages directory exists
ls -ld /workspaces/agent-feed/data/agent-pages/
```

### 3. Run Tests

#### Option A: Run All Tests (Recommended)
```bash
cd /workspaces/agent-feed
chmod +x tests/e2e/run-all-tests.sh
./tests/e2e/run-all-tests.sh
```

#### Option B: Run Individual Tests
```bash
cd /workspaces/agent-feed/tests/e2e

# Workflow test
npm run test:workflow

# Compliance test
npm run test:compliance

# Recovery test
npm run test:recovery

# Performance test
npm run test:performance
```

#### Option C: Run with UI (Interactive)
```bash
npm run test:ui
```

## Expected Output

### Successful Test Run
```
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
  Page Registration E2E Test Suite
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

  📅 Timestamp: 20251004_120000
  📂 Test Directory: /workspaces/agent-feed/tests/e2e
  📊 Results Directory: /workspaces/agent-feed/tests/e2e/results

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
Running: page-registration-workflow
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
  📝 Complete workflow: create → register → verify → render

✅ page-registration-workflow PASSED (45s)

[Additional tests...]

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
  Test Suite Summary
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

  Total Tests: 4
  Passed: 4
  Failed: 0

  📊 Summary: results/summary_20251004_120000.txt

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
  🎉 All tests PASSED!
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
```

## What Gets Tested

### 1. Complete Workflow Test (45-60s)
- ✅ Server startup with auto-registration
- ✅ Page file creation
- ✅ Auto-registration < 1 second
- ✅ API accessibility
- ✅ No forbidden scripts

### 2. Agent Compliance Test (30-45s)
- ✅ Pre-flight checks
- ✅ Bash tool usage (no scripts)
- ✅ Proper verification
- ✅ Error handling

### 3. Failure Recovery Test (60-90s)
- ✅ Server restart recovery
- ✅ Database lock handling
- ✅ Corrupted file recovery
- ✅ Manual fallback

### 4. Performance Test (90-120s)
- ✅ Registration speed < 1s
- ✅ API response < 200ms
- ✅ 50 concurrent operations
- ✅ 100 page bulk load
- ✅ Memory stability

## Troubleshooting

### Problem: Port Already in Use
```bash
# Find process using port
lsof -i :3001

# Kill process
kill -9 <PID>
```

### Problem: Database Locked
```bash
# Check for locked database
fuser /workspaces/agent-feed/data/agent-pages.db

# Kill locking process if needed
fuser -k /workspaces/agent-feed/data/agent-pages.db
```

### Problem: Test Timeout
```bash
# Increase timeout in playwright.config.js
timeout: 180000, // 3 minutes
```

### Problem: Permission Denied
```bash
# Make scripts executable
chmod +x tests/e2e/run-all-tests.sh

# Fix file permissions
chmod 755 /workspaces/agent-feed/data/agent-pages/
```

### Problem: Missing Dependencies
```bash
# Reinstall dependencies
cd /workspaces/agent-feed/tests/e2e
rm -rf node_modules package-lock.json
npm install
```

## Test Results

Results are saved in `/workspaces/agent-feed/tests/e2e/results/`:

```
results/
├── html-report/                    # HTML test report
├── test-results.json               # JSON results
├── junit.xml                       # JUnit format (CI/CD)
├── page-registration-workflow_*.json
├── agent-compliance_*.json
├── failure-recovery_*.json
├── performance_*.json
└── summary_*.txt                   # Test summary
```

View HTML report:
```bash
npm run test:report
```

## Understanding Test Output

### Green ✅ = Test Passed
```
✅ page-registration-workflow PASSED (45s)
   ✅ Complete workflow test
   ✅ Auto-registered in 342ms
   ✅ API response validated
```

### Red ❌ = Test Failed
```
❌ page-registration-workflow FAILED (30s)
   See: results/page-registration-workflow_*.json
```

Check the JSON file for details:
```bash
cat results/page-registration-workflow_*.json
```

## Performance Benchmarks

Expected performance on typical development machine:

| Metric | Target | Typical |
|--------|--------|---------|
| Registration Speed | < 1000ms | ~300-500ms |
| API Response | < 200ms | ~50-100ms |
| Concurrent (50) | Success | ~3-5s total |
| Bulk (100) | Success | ~8-12s total |
| Memory Increase | < 100MB | ~30-50MB |

## Next Steps

1. ✅ Run all tests to verify system health
2. ✅ Check test results in `results/` directory
3. ✅ Review README.md for detailed test documentation
4. ✅ Add tests to CI/CD pipeline
5. ✅ Monitor performance metrics over time

## Common Tasks

### Run Tests Before Commit
```bash
./tests/e2e/run-all-tests.sh
```

### Run Tests in CI/CD
```bash
cd /workspaces/agent-feed
npm install --prefix tests/e2e
./tests/e2e/run-all-tests.sh
```

### Debug Failing Test
```bash
npm run test:debug -- --grep "test name"
```

### Run Single Test Case
```bash
npx playwright test -g "should register page within 1 second"
```

## Support

If you encounter issues:

1. Check this guide's troubleshooting section
2. Review test output in `results/` directory
3. Check server logs
4. Verify database schema
5. Review main README.md

---

**Need Help?** Check `/workspaces/agent-feed/tests/e2e/README.md` for detailed documentation.
