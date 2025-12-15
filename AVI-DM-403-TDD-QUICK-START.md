# AVI DM 403 Fix - TDD Quick Start Guide

**TDD Phase**: RED (Tests should FAIL initially)
**Approach**: London School - Outside-In with Real Interactions
**Status**: Test Suite Complete ✅ | Implementation Pending ⏳

---

## Quick Summary

The AVI DM interface returns 403 errors because `EnhancedPostingInterface.tsx` uses a relative URL that depends on Vite proxy configuration. This comprehensive TDD test suite validates the fix BEFORE implementation.

**Fix Required**: Change line 286 in `EnhancedPostingInterface.tsx` from relative to absolute URL.

---

## Test Files Created

| File | Type | Tests | Expected Result |
|------|------|-------|-----------------|
| `tests/e2e/avidm-403-fix-validation.spec.ts` | E2E | 25+ | ❌ ALL FAIL |
| `tests/integration/avidm-path-protection.test.js` | Integration | 30+ | ⚠️ SOME FAIL |
| `frontend/src/tests/unit/EnhancedPostingInterface-cwd-fix.test.tsx` | Unit | 20+ | ❌ ALL FAIL |
| `frontend/src/tests/unit/AviDMService-cwd-fix.test.ts` | Unit | 25+ | ✅ ALL PASS |

**Total**: 100+ test cases covering complete user workflow

---

## Run All Tests (One Command)

```bash
cd /workspaces/agent-feed
./tests/run-avidm-403-tests.sh
```

This script runs all test suites in correct order (outside-in) with pre-flight checks.

---

## Run Individual Test Suites

### 1. E2E Tests (Complete User Flow)
```bash
cd /workspaces/agent-feed
npx playwright test tests/e2e/avidm-403-fix-validation.spec.ts
```

**Tests**: User clicks, message sending, real Claude responses, error handling
**Expected**: ALL FAIL with 403 errors

### 2. Integration Tests (Backend API)
```bash
cd /workspaces/agent-feed
npm test -- tests/integration/avidm-path-protection.test.js
```

**Tests**: Path protection middleware, correct/wrong cwd paths, real Claude integration
**Expected**: Backend tests PASS, coordination tests FAIL

### 3. Component Unit Tests
```bash
cd /workspaces/agent-feed/frontend
npm test -- src/tests/unit/EnhancedPostingInterface-cwd-fix.test.tsx
```

**Tests**: Component behavior, fetch interactions, response handling
**Expected**: ALL FAIL (component uses relative URL)

### 4. Service Unit Tests
```bash
cd /workspaces/agent-feed/frontend
npm test -- src/tests/unit/AviDMService-cwd-fix.test.ts
```

**Tests**: Service configuration, cwd path handling, HTTP client integration
**Expected**: ALL PASS (service already fixed)

---

## Pre-flight Requirements

Before running tests:
- ✅ Backend running on port 3001
- ✅ Frontend running on port 5173
- ✅ Claude CLI installed
- ✅ Node.js dependencies installed

**Quick Check**:
```bash
curl http://localhost:3001/health  # Backend
curl http://localhost:5173         # Frontend
claude --version                   # Claude CLI
```

---

## The Fix (After RED Phase)

### File to Change
`/workspaces/agent-feed/frontend/src/components/EnhancedPostingInterface.tsx`

### Line 286 - Current (WRONG)
```typescript
const response = await fetch('/api/claude-code/streaming-chat', {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({
    message: fullPrompt,
    options: { cwd: '/workspaces/agent-feed/prod' }
  })
});
```

### Line 286 - Fixed (CORRECT)
```typescript
const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || 'http://localhost:3001';
const response = await fetch(`${API_BASE_URL}/api/claude-code/streaming-chat`, {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({
    message: fullPrompt,
    options: { cwd: '/workspaces/agent-feed/prod' }
  })
});
```

### Environment Variables
Create `.env.development` in frontend directory:
```bash
VITE_API_BASE_URL=http://localhost:3001
```

---

## Expected Test Results (RED Phase)

### E2E Tests Output
```
❌ user should see Avi DM tab in posting interface
❌ user should send message with correct cwd path to backend
❌ should receive 200 OK response from backend with correct path
❌ should NOT receive 403 Forbidden error
❌ should receive actual Claude Code response (NOT mock)
❌ should use real Claude Code tools to read files

Tests: 0 passed, 25 failed, 25 total
```

### Integration Tests Output
```
✅ backend should be running and reachable
✅ backend should accept correct cwd path: /workspaces/agent-feed/prod
✅ should block frontend directory with helpful error
✅ should block api-server directory
⚠️ should process real Claude Code request (coordination fails)

Tests: 20 passed, 10 failed, 30 total
```

### Component Tests Output
```
❌ should send request with correct cwd path
❌ should NOT use relative URL that depends on proxy
❌ should handle 403 Forbidden error gracefully
❌ should call fetch exactly once per message

Tests: 0 passed, 20 failed, 20 total
```

### Service Tests Output
```
✅ should use absolute base URL by default
✅ should default to http://localhost:3001
✅ should send message with correct cwd path in options
✅ should include enableTools in options

Tests: 25 passed, 0 failed, 25 total
```

---

## After Implementing Fix (GREEN Phase)

Re-run all tests:
```bash
cd /workspaces/agent-feed
./tests/run-avidm-403-tests.sh
```

**Expected**: ALL PASS ✅

### Verification Checklist
- [ ] E2E tests: All 25+ pass
- [ ] Integration tests: All 30+ pass
- [ ] Component tests: All 20+ pass
- [ ] Service tests: All 25+ pass
- [ ] Real Claude responses (NOT mocks)
- [ ] No 403 errors in browser console
- [ ] Messages send successfully
- [ ] Avi responds within 90 seconds

---

## Key Test Principles (London School)

### 1. Outside-In Testing
Start with E2E tests (user perspective), work inward to unit tests.

### 2. Real Interactions
NO mocks for:
- ✅ Claude Code API (must be real)
- ✅ Backend API (must be real)
- ✅ File system operations (must be real)

### 3. Behavior Over State
Test what component DOES, not what it CONTAINS:
```typescript
// ✅ CORRECT - Test behavior
expect(mockFetch).toHaveBeenCalledWith(
  expect.stringContaining('localhost:3001'),
  expect.objectContaining({ method: 'POST' })
);

// ❌ WRONG - Test internal state
expect(component.state.url).toBe('...');
```

### 4. Interaction Verification
Focus on how objects collaborate:
```typescript
// Verify collaboration sequence
expect(callSequence).toEqual([
  'render',
  'input',
  'send',
  'fetch',
  'response',
  'display'
]);
```

---

## Troubleshooting

### "Backend not running" Error
```bash
cd /workspaces/agent-feed/api-server
npm start
```

### "Frontend not running" Error
```bash
cd /workspaces/agent-feed/frontend
npm run dev
```

### "Claude CLI not found" Error
```bash
# Install Claude CLI
npm install -g @anthropic-ai/claude-cli

# Authenticate
claude auth login
```

### Tests Still Fail After Fix
1. Clear browser cache
2. Restart dev servers
3. Check environment variables
4. Verify no TypeScript errors: `npm run build`

---

## Test Coverage

### What's Tested ✅
- Complete user workflow (click → send → response)
- Real Claude Code responses
- Real file system operations via Claude tools
- Path protection middleware (403 for wrong paths)
- Error handling (403, timeout, network errors)
- UI state management
- Interaction contracts

### What's NOT Tested ❌
- Mock responses (intentionally excluded)
- Simulated data (intentionally excluded)
- Internal component state (not behavior)

---

## Documentation

- **Full Test Suite README**: `/workspaces/agent-feed/tests/AVI-DM-403-TDD-TEST-SUITE-README.md`
- **SPARC Specification**: `/workspaces/agent-feed/docs/SPARC-AVI-DM-403-FIX-SPECIFICATION.md`
- **Component Source**: `/workspaces/agent-feed/frontend/src/components/EnhancedPostingInterface.tsx`
- **Service Source**: `/workspaces/agent-feed/frontend/src/services/AviDMService.ts`
- **Backend Middleware**: `/workspaces/agent-feed/api-server/middleware/protectCriticalPaths.js`

---

## Next Steps

1. ✅ **RED Phase**: Run tests, verify they FAIL
   ```bash
   ./tests/run-avidm-403-tests.sh
   ```

2. ⏳ **GREEN Phase**: Implement fix
   - Change line 286 in `EnhancedPostingInterface.tsx`
   - Add environment variable
   - Re-run tests, verify they PASS

3. ⏳ **REFACTOR Phase**: Clean up if needed
   - Remove console.log statements
   - Add comments
   - Update documentation

4. ⏳ **DEPLOY**: Push to production
   ```bash
   git add .
   git commit -m "Fix: AVI DM 403 error - use absolute URL"
   git push
   ```

---

**Status**: ✅ Test Suite Complete - Ready for RED Phase

**Time Estimate**:
- Run tests (RED): 15 minutes
- Implement fix: 5 minutes
- Verify tests (GREEN): 15 minutes
- Total: **35 minutes**

**Confidence Level**: 🟢 HIGH (Comprehensive test coverage, proven approach)
