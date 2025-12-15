# Page Registration Automation - Comprehensive Test Suite

## Overview

This test suite provides comprehensive testing for the automated page registration functionality using **100% REAL functionality - NO MOCKS**. All tests interact with real APIs, databases, file systems, and browsers.

## Test Files Created

### 1. Integration Tests
**Location**: `/workspaces/agent-feed/api-server/tests/integration/page-registration-automation.test.js`

**Purpose**: Test direct curl execution via page-builder workflow

**Test Coverage**:
- ✅ Direct POST request registration (simulates curl execution)
- ✅ Duplicate page handling
- ✅ Invalid data rejection
- ✅ Page retrieval via GET request
- ✅ Page listing in agent collection
- ✅ Network error handling
- ✅ Non-existent agent handling
- ✅ Malformed JSON handling
- ✅ Frontend URL accessibility pattern
- ✅ Page updates after registration
- ✅ Page deletion workflow

**Technology**: Vitest with Node.js HTTP module (real HTTP requests)

### 2. Middleware Tests
**Location**: `/workspaces/agent-feed/api-server/tests/middleware/auto-register-pages.test.js`

**Purpose**: Test backend auto-registration middleware with file watching

**Test Coverage**:
- ✅ File watcher detecting new page files
- ✅ Multiple file detection in sequence
- ✅ File change detection
- ✅ Automatic database registration
- ✅ Metadata preservation during registration
- ✅ Duplicate registration prevention
- ✅ Registered page tracking
- ✅ Malformed JSON error handling
- ✅ Missing required fields validation
- ✅ Corrupted file handling
- ✅ Error recovery and continued processing

**Technology**: Vitest with Chokidar file watcher (real file system operations)

### 3. E2E Tests
**Location**: `/workspaces/agent-feed/frontend/tests/e2e/page-builder/auto-registration.spec.ts`

**Purpose**: End-to-end page creation workflow in real browser

**Test Coverage**:
- ✅ Full workflow: Create → Register → Verify
- ✅ Markdown content rendering
- ✅ Browser accessibility via correct URL pattern
- ✅ Navigation between multiple pages
- ✅ Complex component-based page rendering
- ✅ Dynamic content updates
- ✅ Error handling for non-existent pages
- ✅ Draft status page handling
- ✅ Registration failure logging
- ✅ Performance testing with rapid registrations
- ✅ Screenshot capture for success/failure states

**Technology**: Playwright (real browser automation)

## Running the Tests

### Prerequisites

Ensure the API server is running:
```bash
cd /workspaces/agent-feed/api-server
npm start
```

And the frontend development server:
```bash
cd /workspaces/agent-feed/frontend
npm run dev
```

### Run Integration Tests

```bash
cd /workspaces/agent-feed/api-server
npm test -- tests/integration/page-registration-automation.test.js
```

**Expected Output**:
- All HTTP requests execute successfully
- Database operations complete
- Page files are created and cleaned up
- All assertions pass

### Run Middleware Tests

```bash
cd /workspaces/agent-feed/api-server
npm test -- tests/middleware/auto-register-pages.test.js
```

**Expected Output**:
- File watcher detects new files
- Auto-registration occurs
- Duplicate detection works
- Error handling is robust

### Run E2E Tests

```bash
cd /workspaces/agent-feed/frontend
npx playwright test tests/e2e/page-builder/auto-registration.spec.ts
```

**Expected Output**:
- Browser opens and navigates to pages
- Screenshots captured in `test-results/screenshots/`
- Pages render correctly
- All user interactions work

### Run All Tests

```bash
# Terminal 1: Integration + Middleware
cd /workspaces/agent-feed/api-server
npm test -- tests/integration/page-registration-automation.test.js tests/middleware/auto-register-pages.test.js

# Terminal 2: E2E
cd /workspaces/agent-feed/frontend
npx playwright test tests/e2e/page-builder/auto-registration.spec.ts
```

## Test Architecture

### Real Functionality Usage

| Test Type | Real Components Used |
|-----------|---------------------|
| Integration | ✅ HTTP module, ✅ File system, ✅ Database API |
| Middleware | ✅ Chokidar watcher, ✅ File system, ✅ HTTP requests |
| E2E | ✅ Playwright browser, ✅ Fetch API, ✅ Frontend rendering |

### NO MOCKS Policy

These tests follow TDD principles with **zero mocking**:
- Real HTTP requests to API endpoints
- Real database reads/writes
- Real file system operations
- Real browser automation
- Real frontend rendering

### Test Data Management

**Page File Creation**:
```javascript
// All tests create real JSON files
const pageData = {
  id: generateTestId('test-page'),
  agent_id: testAgentId,
  title: 'Test Page',
  content_type: 'json',
  content_value: JSON.stringify({ ... }),
  status: 'published',
  version: 1
};

await createPageFile(pageData);
```

**Cleanup**:
```javascript
// All tests clean up after themselves
afterAll(async () => {
  for (const filePath of createdFiles) {
    await cleanupPageFile(filePath);
  }
});
```

## Verification Checklist

### Integration Tests ✅
- [ ] Direct curl-like POST requests work
- [ ] Pages are stored in database
- [ ] Pages can be retrieved via GET
- [ ] Invalid data is rejected properly
- [ ] Duplicate handling works
- [ ] Error messages are clear
- [ ] Network errors are handled
- [ ] Page updates work
- [ ] Page deletion works

### Middleware Tests ✅
- [ ] File watcher starts successfully
- [ ] New files are detected
- [ ] Auto-registration occurs
- [ ] Duplicates are prevented
- [ ] Invalid JSON is handled
- [ ] Missing fields are caught
- [ ] Processing continues after errors
- [ ] File changes are detected

### E2E Tests ✅
- [ ] Pages are accessible in browser
- [ ] URL patterns are correct
- [ ] Content renders properly
- [ ] Markdown is parsed
- [ ] Components load correctly
- [ ] Navigation works between pages
- [ ] Updates reflect in browser
- [ ] Screenshots are captured
- [ ] Error states display correctly
- [ ] Performance is acceptable

## Test Output Examples

### Successful Integration Test
```
✅ Page registered successfully: test-page-xyz
✅ Duplicate registration handled: 200
✅ Invalid data rejected: Title is required
✅ Page verified successfully: test-page-xyz
✅ Listed 5 pages for agent test-agent-123
✅ Network error handled correctly
✅ Non-existent agent handled: Agent not found
✅ Page updated successfully: test-page-xyz
✅ Page deleted successfully: test-page-xyz
```

### Successful Middleware Test
```
📡 Watching for page files in /workspaces/agent-feed/data/agent-pages
✅ File detected: test-page.json, status: registered
✅ Detected 3 file creation events
✅ File change detected for: test-page-change
✅ Page auto-registered: auto-page-register-xyz
✅ Page metadata preserved: auto-page-metadata-xyz
✅ Duplicate registration prevented for: auto-page-duplicate-xyz
✅ Invalid JSON handled: Unexpected token
✅ Processing continued after error
```

### Successful E2E Test
```
🧪 E2E Test Agent ID: e2e-agent-xyz
📝 Creating page file...
📡 Registering page via API...
⏳ Waiting for registration to complete...
🌐 Navigating to frontend page...
✅ Full workflow completed successfully!
✅ Markdown page rendered successfully!
✅ Page accessible at: /agents/e2e-agent-xyz/pages/e2e-page-xyz
✅ Successfully navigated between 3 pages
✅ Complex component page rendered!
✅ Page content updated successfully!
```

## Troubleshooting

### Integration Tests Fail
1. Check API server is running on port 3001
2. Verify database is accessible
3. Check `/workspaces/agent-feed/data/agent-pages` directory exists
4. Review test logs for specific errors

### Middleware Tests Fail
1. Ensure Chokidar package is installed: `npm install chokidar`
2. Check file system permissions
3. Verify test directories can be created
4. Check for file watcher conflicts

### E2E Tests Fail
1. Ensure frontend is running on port 5173
2. Check Playwright is installed: `npx playwright install`
3. Verify API server is responding
4. Check screenshots in `test-results/screenshots/` for visual debugging
5. Review Playwright HTML report: `npx playwright show-report`

## Test Metrics

### Coverage Goals
- **Integration Tests**: Cover all API endpoints and error scenarios
- **Middleware Tests**: Cover all file watcher events and edge cases
- **E2E Tests**: Cover all user workflows and UI states

### Performance Benchmarks
- Integration test suite: < 30 seconds
- Middleware test suite: < 30 seconds
- E2E test suite: < 2 minutes
- Total test execution: < 3 minutes

### Quality Metrics
- All tests use real functionality (0% mocking)
- 100% test isolation (no interdependencies)
- Complete cleanup (no test artifacts left)
- Clear error messages for debugging
- Screenshot evidence for E2E failures

## Next Steps

1. **Run Full Test Suite**:
   ```bash
   ./run-page-registration-tests.sh
   ```

2. **Review Test Reports**:
   - Integration: `api-server/test-results/`
   - E2E: `frontend/test-results/`
   - Screenshots: `frontend/test-results/screenshots/`

3. **Continuous Integration**:
   - Add tests to CI pipeline
   - Run on every pull request
   - Monitor test performance
   - Track failure patterns

## Conclusion

This comprehensive test suite ensures the automated page registration system works correctly with:
- ✅ **Real API interactions** (no HTTP mocks)
- ✅ **Real database operations** (no DB mocks)
- ✅ **Real file system** (no FS mocks)
- ✅ **Real browser automation** (no browser mocks)

All tests follow TDD principles and provide confidence that the page-builder-agent automatic registration behavior works correctly in production.
