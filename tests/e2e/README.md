# Page Registration E2E Test Suite

Comprehensive end-to-end validation tests for the complete page registration workflow.

## Overview

This test suite validates the **entire page registration system** using real functionality:
- ✅ Real API server (no mocks)
- ✅ Real file system operations
- ✅ Real database (SQLite)
- ✅ Real Playwright browser automation
- ✅ Real performance measurements

## Test Suites

### 1. Complete Workflow Test (`page-registration-workflow.test.js`)

Validates the full page registration lifecycle:

- **Server Startup**: Verifies auto-registration middleware initializes
- **Page Creation**: Creates page files in `/data/agent-pages/`
- **Auto-Registration**: Validates detection within < 1 second
- **API Accessibility**: Tests GET/POST/PUT/DELETE endpoints
- **Database Verification**: Confirms data integrity
- **No Script Creation**: Ensures agents don't create forbidden scripts
- **Frontend Compatibility**: Validates API responses for frontend

**Key Tests:**
```javascript
✓ Complete workflow: create → register → verify → render
✓ Handle concurrent page creations
✓ Update existing page when file is modified
```

### 2. Agent Compliance Test (`agent-compliance.test.js`)

Validates that Claude agents follow proper procedures:

- **Pre-flight Checks**: API availability verification
- **Bash Tool Usage**: Direct curl execution (no script files)
- **Verification Workflow**: Proper validation steps
- **Success Reporting**: Accurate status reporting
- **Error Handling**: Graceful failure without scripts

**Key Tests:**
```javascript
✓ Execute pre-flight check before registration
✓ Use Bash tool for registration (no script creation)
✓ Follow proper verification workflow
✓ Report success properly
✓ Handle errors gracefully without scripts
✓ Use Read tool for verification, not cat/grep
```

**Forbidden Behaviors:**
- ❌ Creating `.sh` script files
- ❌ Using `cat` or `grep` via Bash (use Read/Grep tools)
- ❌ Skipping verification steps
- ❌ Ignoring API errors

### 3. Failure Recovery Test (`failure-recovery.test.js`)

Validates system behavior during failures:

- **Server Restart**: System recovery after restart
- **Auto-Registration Retry**: Handles transient failures
- **Manual Fallback**: Direct API registration when needed
- **Database Lock Handling**: Concurrent write safety
- **Corrupted File Recovery**: Rejects invalid files gracefully
- **Missing Fields**: Validates required field enforcement

**Key Tests:**
```javascript
✓ Recover from server restart
✓ Retry auto-registration on initial failure
✓ Handle database lock gracefully
✓ Handle manual fallback when auto-registration fails
✓ Recover from corrupted page file
✓ Handle missing required fields gracefully
```

### 4. Performance Test (`performance.test.js`)

Validates system performance under load:

- **Registration Speed**: Target < 1000ms per page
- **API Response Time**: Target < 200ms
- **Memory Stability**: Target < 100MB increase for 100 pages
- **Concurrent Operations**: Handle 50 concurrent registrations
- **Bulk Load**: Process 100 pages successfully
- **Database Performance**: Query times < 10ms average

**Key Tests:**
```javascript
✓ Register page within 1 second
✓ Maintain stable memory usage under load
✓ Handle concurrent page creations (50 simultaneous)
✓ Handle bulk load (100 pages)
✓ Maintain API response time under load
✓ Handle database query performance
✓ Generate performance summary report
```

**Performance Thresholds:**
- Registration Time: **< 1000ms**
- API Response: **< 200ms**
- Memory Increase: **< 100MB** (for 100 pages)
- Concurrent Load: **50 operations**
- Bulk Load: **100 pages**

## Running Tests

### Run All Tests
```bash
cd /workspaces/agent-feed
./tests/e2e/run-all-tests.sh
```

### Run Individual Test Suite
```bash
# Workflow test
npx playwright test tests/e2e/page-registration-workflow.test.js

# Compliance test
npx playwright test tests/e2e/agent-compliance.test.js

# Recovery test
npx playwright test tests/e2e/failure-recovery.test.js

# Performance test
npx playwright test tests/e2e/performance.test.js
```

### Run with UI Mode
```bash
npx playwright test tests/e2e/page-registration-workflow.test.js --ui
```

### Run with Debug Mode
```bash
npx playwright test tests/e2e/page-registration-workflow.test.js --debug
```

## Test Configuration

Each test suite uses isolated ports to prevent conflicts:
- **Workflow Test**: Port 3002, Frontend 5174
- **Compliance Test**: Port 3001 (default)
- **Recovery Test**: Port 3003
- **Performance Test**: Port 3004

## Test Data Cleanup

All tests automatically clean up:
- ✅ Test page files in `/data/agent-pages/`
- ✅ Database entries in `agent_pages` table
- ✅ Test agents in `agents` table
- ✅ Server processes

## Test Results

Results are saved to `/tests/e2e/results/`:
```
results/
├── page-registration-workflow_20251004_120000.json
├── agent-compliance_20251004_120000.json
├── failure-recovery_20251004_120000.json
├── performance_20251004_120000.json
└── summary_20251004_120000.txt
```

## Success Criteria

All tests must pass with:
- ✅ 100% test success rate
- ✅ All assertions passing
- ✅ No server crashes
- ✅ No memory leaks
- ✅ Performance thresholds met
- ✅ No forbidden scripts created

## Troubleshooting

### Test Timeouts
If tests timeout, check:
- Server is running on correct port
- Database is not locked
- File system permissions are correct

### Database Errors
If database errors occur:
- Ensure `/data/agent-pages.db` exists
- Check database schema is up to date
- Verify foreign key constraints

### Port Conflicts
If port conflicts occur:
- Stop existing servers on test ports
- Use different ports in test configuration
- Check for zombie processes: `lsof -i :3001`

### Memory Issues
If memory issues occur:
- Reduce bulk load count in performance tests
- Enable garbage collection: `node --expose-gc`
- Check for resource leaks in test cleanup

## Architecture

### Test Structure
```
tests/e2e/
├── page-registration-workflow.test.js  # Complete workflow
├── agent-compliance.test.js            # Agent behavior
├── failure-recovery.test.js            # Error scenarios
├── performance.test.js                 # Performance metrics
├── run-all-tests.sh                    # Test runner
├── results/                            # Test outputs
└── README.md                           # This file
```

### Dependencies
- **Playwright**: Browser automation
- **better-sqlite3**: Database testing
- **Node.js http**: API testing
- **fs/promises**: File system operations

## Best Practices

### For Test Development
1. Always clean up test data
2. Use unique IDs (UUID) for test entities
3. Use isolated ports for test servers
4. Include descriptive console output
5. Verify both success and failure paths

### For Running Tests
1. Run tests in clean environment
2. Monitor console output for errors
3. Check results directory for details
4. Review performance metrics
5. Verify no test artifacts remain

## Continuous Integration

These tests are designed to run in CI/CD pipelines:

```yaml
# Example GitHub Actions workflow
- name: Run E2E Tests
  run: |
    cd /workspaces/agent-feed
    chmod +x tests/e2e/run-all-tests.sh
    ./tests/e2e/run-all-tests.sh
```

## Maintenance

### Adding New Tests
1. Follow existing test structure
2. Use isolated test data (unique IDs)
3. Clean up resources in `afterAll`
4. Add to `run-all-tests.sh` runner
5. Update this README

### Updating Thresholds
Performance thresholds are defined in `performance.test.js`:
```javascript
const THRESHOLDS = {
  REGISTRATION_TIME_MS: 1000,
  API_RESPONSE_TIME_MS: 200,
  CONCURRENT_LOAD: 50,
  BULK_LOAD: 100,
  MEMORY_INCREASE_MB: 100,
};
```

## Support

For issues or questions:
1. Check test output in `/tests/e2e/results/`
2. Review console logs for errors
3. Verify database state
4. Check server logs
5. Review this README

---

**Last Updated**: 2025-10-04
**Test Suite Version**: 1.0.0
**Compatibility**: Node.js >= 16, Playwright >= 1.55
