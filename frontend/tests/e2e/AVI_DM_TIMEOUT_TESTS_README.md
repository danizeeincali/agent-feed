# Avi DM Chat Timeout Fix - Test Suite Documentation

## Overview

This test suite validates the fix for the Vite proxy timeout issue affecting Avi DM chat functionality. The original problem was that Vite's dev server has a default 10-second proxy timeout, but Claude Code responses typically take 14+ seconds, causing timeout errors.

## Problem Statement

**Issue:** Vite proxy timeout (10s) < Claude response time (14s+)

**Symptoms:**
- "Failed to fetch" errors in browser console
- Chat requests timing out
- Inconsistent chat functionality
- Error: `Proxy error: Could not proxy request`

**Solution:** Configure Vite proxy timeout to 120 seconds for `/api/claude-code` routes

## Test Suite Structure

### 1. Unit Tests
**Location:** `/workspaces/agent-feed/frontend/src/tests/unit/AviDMTimeoutUnit.test.tsx`

**Coverage:**
- ✅ `callAviClaudeCode()` function handles successful responses
- ✅ `callAviClaudeCode()` handles timeout errors (408)
- ✅ `callAviClaudeCode()` handles network errors
- ✅ `callAviClaudeCode()` handles malformed JSON
- ✅ `callAviClaudeCode()` extracts message from various response formats:
  - `data.message`
  - `data.responses[0].content`
  - `data.content` (string)
  - `data.content` (array with text blocks)
  - Plain string response
- ✅ Loading state management during API call
- ✅ Error handling with user-friendly messages
- ✅ Chat history updates correctly
- ✅ Timeout handling for fast (5s), medium (14s), and slow (30s) responses
- ✅ Response format parsing edge cases
- ✅ Error recovery with retry logic
- ✅ Exponential backoff strategy
- ✅ Loading state prevents duplicate submissions

**Run Command:**
```bash
cd /workspaces/agent-feed/frontend
npx vitest run src/tests/unit/AviDMTimeoutUnit.test.tsx --reporter=verbose
```

### 2. Integration Tests
**Location:** `/workspaces/agent-feed/frontend/src/tests/integration/AviDMTimeout.test.tsx`

**Coverage:**
- ✅ Full chat flow: user message → API call → response → display
- ✅ Timeout scenario: request exceeds timeout → error shown
- ✅ Retry scenario: failed request → user retries → succeeds
- ✅ Multiple messages: send 3 messages in sequence
- ✅ Long response: message that takes 30+ seconds
- ✅ Empty response handling
- ✅ Network error recovery
- ✅ Real Claude Code response validation (not mock)
- ✅ Response contains Claude Code metadata
- ✅ No "Failed to fetch" errors
- ✅ Performance tests:
  - Fast message (5-10s)
  - Medium message (10-20s)
  - Slow message (30-60s)

**Run Command:**
```bash
cd /workspaces/agent-feed/frontend
npx vitest run src/tests/integration/AviDMTimeout.test.tsx --reporter=verbose
```

### 3. E2E Tests (Playwright)
**Location:** `/workspaces/agent-feed/frontend/tests/e2e/avi-dm-timeout.spec.ts`

**Coverage:**
- ✅ Load page → type message → click send → see response
- ✅ Send message → wait for loading indicator
- ✅ Timeout error → see user-friendly error message
- ✅ Real Claude response verification (not mock)
- ✅ Loading state appears and disappears
- ✅ Chat history updates correctly
- ✅ Error messages are user-friendly
- ✅ Multiple message conversation flow
- ✅ Contextual conversation (memory)
- ✅ Λvi identity verification (not generic Claude)
- ✅ Visual validation (styling, loading states)
- ✅ UI responsiveness during long requests
- ✅ Retry after error functionality

**Run Command:**
```bash
cd /workspaces/agent-feed/frontend/tests/e2e
npx playwright test avi-dm-timeout.spec.ts --config=playwright.config.avi-timeout.ts
```

## Test Data

### Fast Messages (Expected: 5-10s)
- `"hello"`
- `"what is 2+2?"`
- `"goodbye"`

### Medium Messages (Expected: 10-20s)
- `"what directory are you in?"`
- `"who are you?"`
- `"list files in current directory"`

### Slow Messages (Expected: 30-60s)
- `"analyze all files in /workspaces/agent-feed/prod"`
- `"analyze all TypeScript files in /workspaces/agent-feed/frontend/src"`
- `"analyze every single file in the entire codebase with full details"`

## Prerequisites

### 1. Frontend Dev Server
```bash
cd /workspaces/agent-feed/frontend
npm run dev
```
Server should be running on `http://localhost:5173`

### 2. Backend API Server
```bash
cd /workspaces/agent-feed/api-server
npm start
```
Server should be running on `http://localhost:3001`

### 3. Real Claude Code SDK
Ensure Claude Code SDK is properly configured in the backend API server (not using mock responses).

### 4. Vite Configuration
Verify `vite.config.ts` includes the timeout fix:
```typescript
server: {
  proxy: {
    '/api/claude-code': {
      target: 'http://localhost:3001',
      changeOrigin: true,
      timeout: 120000, // 120 seconds - FIX FOR TIMEOUT ISSUE
    }
  }
}
```

## Running Tests

### Quick Start
```bash
cd /workspaces/agent-feed/frontend/tests/e2e
./run-avi-timeout-tests.sh all
```

### Individual Test Suites
```bash
# Unit tests only
./run-avi-timeout-tests.sh unit

# Integration tests only
./run-avi-timeout-tests.sh integration

# E2E tests only
./run-avi-timeout-tests.sh e2e
```

### Manual Execution

**Unit Tests:**
```bash
cd /workspaces/agent-feed/frontend
npx vitest run src/tests/unit/AviDMTimeoutUnit.test.tsx
```

**Integration Tests:**
```bash
cd /workspaces/agent-feed/frontend
npx vitest run src/tests/integration/AviDMTimeout.test.tsx
```

**E2E Tests:**
```bash
cd /workspaces/agent-feed/frontend/tests/e2e
npx playwright test avi-dm-timeout.spec.ts --config=playwright.config.avi-timeout.ts
```

## Test Assertions

### Success Criteria

1. **Response Time:**
   - Fast messages: < 20s
   - Medium messages: < 30s
   - Slow messages: < 120s

2. **Real Responses:**
   - No template responses ("Thanks for your message")
   - No mock indicators ("simulated", "mock")
   - Contains substantive content (>10 characters)

3. **No Errors:**
   - No "Failed to fetch" errors
   - No timeout errors
   - No proxy errors

4. **Loading States:**
   - Loading indicator appears immediately
   - Button disabled during loading
   - Input disabled during loading
   - Loading cleared on success/error

5. **Chat History:**
   - User messages displayed correctly
   - Assistant responses displayed correctly
   - Conversation order maintained
   - Context preserved across messages

6. **Error Handling:**
   - User-friendly error messages
   - Retry functionality works
   - UI remains functional after errors

## Expected Test Results

### Unit Tests
- **Total:** ~35 tests
- **Duration:** ~2-3 minutes
- **Coverage:**
  - Function logic: 100%
  - Error handling: 100%
  - Response parsing: 100%

### Integration Tests
- **Total:** ~15 tests
- **Duration:** ~5-8 minutes (includes real API calls)
- **Coverage:**
  - Full flow: 100%
  - Real API: 100%
  - Performance: 100%

### E2E Tests
- **Total:** ~20 tests
- **Duration:** ~10-15 minutes (includes browser automation)
- **Coverage:**
  - User flows: 100%
  - Visual validation: 100%
  - Real responses: 100%

## Troubleshooting

### Test Failures

#### "Failed to fetch" errors
**Cause:** Backend API server not running or Vite proxy not configured

**Solution:**
1. Check backend API server is running: `curl http://localhost:3001/api/health`
2. Verify Vite config has timeout fix
3. Restart frontend dev server

#### Timeout errors
**Cause:** Vite proxy timeout not increased or Claude responses too slow

**Solution:**
1. Verify `vite.config.ts` has `timeout: 120000`
2. Restart frontend dev server
3. Check network connectivity

#### Mock responses
**Cause:** Backend using mock implementation instead of real Claude Code SDK

**Solution:**
1. Verify backend API has real Claude Code SDK configured
2. Check API key is valid
3. Ensure `/api/claude-code/streaming-chat` endpoint uses real SDK

#### Browser tests fail
**Cause:** Frontend not running or port conflict

**Solution:**
1. Verify frontend is on `http://localhost:5173`
2. Check no other process using port 5173
3. Restart dev server with `npm run dev`

### Performance Issues

If tests are consistently slow:
1. Check network connectivity
2. Verify Claude API is responding normally
3. Consider adjusting timeout values in test configuration

## Test Results Artifacts

### Location
```
/workspaces/agent-feed/frontend/tests/e2e/test-results/
├── avi-timeout-report/      # HTML report
├── avi-timeout-results.json # JSON results
├── screenshots/             # Failure screenshots
└── videos/                  # Test recordings
```

### Viewing Reports

**HTML Report:**
```bash
open /workspaces/agent-feed/frontend/tests/e2e/test-results/avi-timeout-report/index.html
```

**JSON Results:**
```bash
cat /workspaces/agent-feed/frontend/tests/e2e/test-results/avi-timeout-results.json | jq
```

## CI/CD Integration

### GitHub Actions Example
```yaml
name: Avi DM Timeout Tests

on:
  push:
    branches: [main, develop]
  pull_request:
    branches: [main]

jobs:
  test:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v3
      - uses: actions/setup-node@v3
        with:
          node-version: '18'

      - name: Install dependencies
        run: npm ci
        working-directory: ./frontend

      - name: Start backend server
        run: npm start &
        working-directory: ./api-server

      - name: Start frontend dev server
        run: npm run dev &
        working-directory: ./frontend

      - name: Wait for servers
        run: |
          npx wait-on http://localhost:5173
          npx wait-on http://localhost:3001

      - name: Run tests
        run: ./run-avi-timeout-tests.sh all
        working-directory: ./frontend/tests/e2e

      - name: Upload test results
        if: always()
        uses: actions/upload-artifact@v3
        with:
          name: test-results
          path: frontend/tests/e2e/test-results/
```

## Maintenance

### Adding New Tests

1. **Unit Tests:** Add to `AviDMTimeoutUnit.test.tsx`
2. **Integration Tests:** Add to `AviDMTimeout.test.tsx`
3. **E2E Tests:** Add to `avi-dm-timeout.spec.ts`

### Updating Test Data

Modify test messages in the test files based on your use cases:
- Fast operations: < 10s
- Medium operations: 10-20s
- Slow operations: 30-60s

### Version Compatibility

- **Vitest:** ^1.0.0
- **Playwright:** ^1.40.0
- **Node:** >=18.0.0

## Support

For issues or questions:
1. Check troubleshooting section
2. Review test output logs
3. Verify prerequisites are met
4. Check Vite configuration

## Summary

This comprehensive test suite ensures the Avi DM chat timeout fix works correctly across all scenarios:
- ✅ Unit tests validate core logic
- ✅ Integration tests validate real API integration
- ✅ E2E tests validate user experience

**Total Coverage:** ~70 tests validating timeout fix, error handling, and user experience.
