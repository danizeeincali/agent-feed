# Phase 2C - PostgreSQL UI/UX Validation Tests

This directory contains comprehensive Playwright tests for validating the frontend UI integration with the PostgreSQL backend.

## 📋 Test Suite Overview

The test suite validates:

1. **Agent Feed View**: Agents and posts load from PostgreSQL
2. **Post Creation**: New posts can be created and appear in the feed
3. **Agent Selection**: Posts can be filtered by agent
4. **Data Validation**: All API responses return `source: 'PostgreSQL'`
5. **UI Rendering**: Posts and agents render correctly
6. **Network Performance**: Acceptable load times and caching
7. **Error Handling**: Graceful error handling and user-friendly messages

## 🚀 Prerequisites

### 1. API Server Running on Port 3001 with PostgreSQL Mode

```bash
cd /workspaces/agent-feed/api-server

# Set PostgreSQL mode in environment
export USE_POSTGRES=true
export DATABASE_URL="postgresql://user:password@host:port/database"

# Start the API server
npm start
# or
node server.js
```

**Verify API Server:**
```bash
curl http://localhost:3001/api/posts
# Should return: { "source": "PostgreSQL", "posts": [...] }
```

### 2. Frontend Running on Port 5173 or 3000

```bash
cd /workspaces/agent-feed/frontend

# Start the frontend
npm run dev
# or
npm start
```

**Verify Frontend:**
Open browser to http://localhost:5173 and verify it loads

### 3. PostgreSQL Database with Test Data

Ensure your PostgreSQL database is populated with:
- At least 5 agents
- At least 10 posts
- Proper schema and indexes

## 🧪 Running the Tests

### Run All Phase 2 Tests

```bash
cd /workspaces/agent-feed

# Run with the Phase 2 configuration
npx playwright test --config tests/playwright/playwright.config.phase2.js
```

### Run Specific Test Groups

```bash
# Run only Agent Feed tests
npx playwright test --config tests/playwright/playwright.config.phase2.js -g "Agent Feed View"

# Run only Data Validation tests
npx playwright test --config tests/playwright/playwright.config.phase2.js -g "Data Validation"

# Run only Post Creation tests
npx playwright test --config tests/playwright/playwright.config.phase2.js -g "Post Creation"
```

### Run in Headed Mode (See Browser)

```bash
npx playwright test --config tests/playwright/playwright.config.phase2.js --headed
```

### Run in Debug Mode

```bash
npx playwright test --config tests/playwright/playwright.config.phase2.js --debug
```

### Run on Specific Browser

```bash
# Chromium only
npx playwright test --config tests/playwright/playwright.config.phase2.js --project=chromium

# Firefox only
npx playwright test --config tests/playwright/playwright.config.phase2.js --project=firefox

# Mobile Chrome
npx playwright test --config tests/playwright/playwright.config.phase2.js --project=mobile-chrome
```

## 📸 Screenshots

All screenshots are automatically saved to:
```
/workspaces/agent-feed/tests/playwright/screenshots/phase2/
```

Each screenshot is timestamped for easy identification:
- `agent-feed-initial-load_2025-10-10T12-30-45-123Z.png`
- `post-created-in-feed_2025-10-10T12-31-15-456Z.png`
- etc.

### View Screenshots

```bash
cd /workspaces/agent-feed/tests/playwright/screenshots/phase2/
ls -lht  # List screenshots, newest first
```

## 📊 Test Reports

### HTML Report

After running tests, view the HTML report:

```bash
npx playwright show-report tests/playwright/screenshots/phase2/playwright-report
```

### JSON Results

Raw test results are saved to:
```
tests/playwright/screenshots/phase2/test-results.json
```

### JUnit Results (for CI/CD)

```
tests/playwright/screenshots/phase2/junit-results.xml
```

## 🔍 Test Details

### 1. Agent Feed View Tests

- **Load agent feed with PostgreSQL data**: Verifies agents endpoint returns PostgreSQL data
- **Load posts with PostgreSQL data**: Verifies posts endpoint returns PostgreSQL data
- **Display post metadata**: Validates post fields and metadata

### 2. Post Creation Tests

- **Create new post**: Tests the full post creation flow
- **Validate post creation**: Ensures required fields are enforced

### 3. Agent Selection Tests

- **Filter posts by agent**: Tests agent filtering functionality
- **Display agent information**: Verifies agent cards/items render

### 4. Data Validation Tests

- **Verify PostgreSQL source**: Ensures ALL API responses have `source: 'PostgreSQL'`
- **Verify database IDs**: Checks posts and agents have valid database IDs
- **Data persistence**: Verifies data persists across page reloads

### 5. UI Rendering Tests

- **Post structure**: Validates post HTML structure
- **Engagement metrics**: Checks for likes, comments, etc.
- **Empty states**: Ensures graceful handling of no results

### 6. Performance Tests

- **Load time**: Verifies initial load under 5 seconds
- **API caching**: Ensures no excessive API calls

### 7. Error Handling Tests

- **API errors**: Verifies graceful error handling
- **User-friendly messages**: Ensures no raw errors shown to users

## 🐛 Debugging Failed Tests

### View Test in Browser

```bash
npx playwright test --config tests/playwright/playwright.config.phase2.js --headed --debug
```

### Check Screenshots

All failed tests automatically capture screenshots. Check:
```
tests/playwright/screenshots/phase2/
```

### Check Console Logs

Tests capture console.log output from both the test and the browser:

```bash
npx playwright test --config tests/playwright/playwright.config.phase2.js 2>&1 | tee test-output.log
```

### Increase Timeouts

If tests are timing out, increase timeouts in the config:

```javascript
// tests/playwright/playwright.config.phase2.js
timeout: 60000, // 60 seconds
```

## ✅ Success Criteria

All tests should pass with the following validations:

1. ✅ All API responses return `source: 'PostgreSQL'`
2. ✅ Agent feed loads and displays agents from database
3. ✅ Posts load and display from database
4. ✅ Post creation works and new posts appear in feed
5. ✅ Agent filtering works (if implemented)
6. ✅ Data persists across page reloads
7. ✅ No raw errors displayed to users
8. ✅ Page loads in under 5 seconds

## 📝 Test Output Example

```
Running 25 tests using 1 worker

✓ Phase 2C - PostgreSQL UI/UX Validation > Agent Feed View > should load agent feed with PostgreSQL data (2.1s)
✓ Phase 2C - PostgreSQL UI/UX Validation > Agent Feed View > should load posts with PostgreSQL data (1.8s)
✓ Phase 2C - PostgreSQL UI/UX Validation > Data Validation > should verify all API calls return PostgreSQL source (2.5s)
✓ Phase 2C - PostgreSQL UI/UX Validation > PostgreSQL Integration Summary Report > should generate integration summary (3.2s)

25 passed (45s)

To view the HTML report, run:
  npx playwright show-report tests/playwright/screenshots/phase2/playwright-report
```

## 🔧 Environment Variables

You can customize test behavior with environment variables:

```bash
# Frontend URL (default: http://localhost:5173)
export FRONTEND_URL=http://localhost:3000

# Frontend port (default: 5173)
export FRONTEND_PORT=3000

# Run in CI mode
export CI=true

# API base URL (used for direct API validation)
export API_BASE_URL=http://localhost:3001
```

## 📦 Test Dependencies

The tests require:
- `@playwright/test` - Test framework
- Running API server on port 3001 with PostgreSQL mode
- Running frontend on port 5173 or 3000
- PostgreSQL database with test data

## 🚨 Common Issues

### Issue: "Timeout waiting for selector"

**Solution**: Ensure frontend is running and accessible at http://localhost:5173

### Issue: "API returned source: 'SQLite'"

**Solution**: Ensure API server has `USE_POSTGRES=true` environment variable set

### Issue: "No posts found"

**Solution**: Ensure PostgreSQL database has test data. Run seed script if needed.

### Issue: "Port 3001 already in use"

**Solution**: Stop other processes on port 3001 or change the port in the API server

## 📚 Additional Resources

- [Playwright Documentation](https://playwright.dev/)
- [Phase 2 Architecture](../../PHASE-2-ARCHITECTURE.md)
- [API Server Documentation](../../api-server/README.md)
- [Frontend Documentation](../../frontend/README.md)

## 🎯 Next Steps

After running these tests:

1. Review the HTML report for detailed results
2. Check screenshots for visual validation
3. Fix any failing tests
4. Run tests in CI/CD pipeline
5. Generate proof-of-functionality report with screenshots

---

**Last Updated**: 2025-10-10
**Test Suite Version**: 1.0.0
**Author**: QA Testing Agent
