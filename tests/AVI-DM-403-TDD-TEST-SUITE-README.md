# AVI DM 403 Fix - TDD London School Test Suite

**Phase**: RED (All tests should FAIL initially)
**Approach**: London School TDD - Outside-In with Real Interactions
**Date**: 2025-10-20

## Executive Summary

This comprehensive test suite follows TDD London School methodology to validate the AVI DM 403 fix BEFORE implementation. All tests are designed to FAIL initially (RED phase), then pass after implementing the fix (GREEN phase).

**Key Principle**: NO MOCKS for external systems. We test real Claude Code responses, real API calls, and real file system operations.

---

## Test Files Created

### 1. E2E Tests (Outside Layer)
**File**: `/workspaces/agent-feed/tests/e2e/avidm-403-fix-validation.spec.ts`

Tests the complete user workflow from browser to backend:
- ✅ User interface interactions
- ✅ Real message sending with correct cwd path
- ✅ Real Claude Code responses (NOT mocks)
- ✅ Real file system operations via Claude tools
- ✅ Error handling for 403, timeout, network errors
- ✅ Backend path protection validation
- ✅ Performance requirements (<90s response time)

**Total Tests**: 25+ test cases
**Expected Result**: ALL FAIL initially (403 errors)

### 2. Integration Tests (Middle Layer)
**File**: `/workspaces/agent-feed/tests/integration/avidm-path-protection.test.js`

Tests backend path protection middleware:
- ✅ Correct cwd path returns 200 OK
- ✅ Wrong paths return 403 Forbidden
- ✅ Protected directories blocked
- ✅ Unrestricted agent_workspace allowed
- ✅ Helpful error messages
- ✅ Real Claude Code integration

**Total Tests**: 30+ test cases
**Expected Result**: Some PASS (backend works), some FAIL (frontend issues)

### 3. Unit Tests - Frontend Component (Inside Layer)
**File**: `/workspaces/agent-feed/frontend/src/tests/unit/EnhancedPostingInterface-cwd-fix.test.tsx`

Tests EnhancedPostingInterface component behavior:
- ✅ Component rendering and interactions
- ✅ Message sending with correct cwd path
- ✅ Response handling and display
- ✅ Error handling (403, timeout, network)
- ✅ UI state management
- ✅ Interaction contracts (London School focus)

**Total Tests**: 20+ test cases
**Expected Result**: ALL FAIL (component uses relative URL)

### 4. Unit Tests - Service Layer (Inside Layer)
**File**: `/workspaces/agent-feed/frontend/src/tests/unit/AviDMService-cwd-fix.test.ts`

Tests AviDMService configuration and behavior:
- ✅ Absolute base URL configuration
- ✅ CWD path handling in requests
- ✅ HTTP client integration
- ✅ Session management with project path
- ✅ Error handling and fallbacks
- ✅ Interaction contracts

**Total Tests**: 25+ test cases
**Expected Result**: ALL PASS (service already fixed)

---

## Test Execution Order (London School Outside-In)

### Phase 1: E2E Tests (Outside)
```bash
cd /workspaces/agent-feed
npx playwright test tests/e2e/avidm-403-fix-validation.spec.ts
```

**Expected**: ALL FAIL with 403 errors

### Phase 2: Integration Tests (Middle)
```bash
cd /workspaces/agent-feed
npm test -- tests/integration/avidm-path-protection.test.js
```

**Expected**: Backend tests PASS, frontend coordination FAIL

### Phase 3: Unit Tests - Component (Inside)
```bash
cd /workspaces/agent-feed/frontend
npm test -- src/tests/unit/EnhancedPostingInterface-cwd-fix.test.tsx
```

**Expected**: ALL FAIL (component not fixed yet)

### Phase 4: Unit Tests - Service (Inside)
```bash
cd /workspaces/agent-feed/frontend
npm test -- src/tests/unit/AviDMService-cwd-fix.test.ts
```

**Expected**: ALL PASS (service already correct)

---

## Test Coverage Map

### User Workflow Coverage
```
[User Interface] → [Component] → [Service] → [HTTP] → [Backend] → [Claude Code]
       ✓              ✗            ✓          ✗         ✓             ✓
```

**Current Status**:
- ✅ User can see interface
- ❌ Component sends wrong URL (relative)
- ✅ Service has correct config
- ❌ HTTP request fails (proxy 403)
- ✅ Backend API works
- ✅ Claude Code operational

**Fix Required**: Update `EnhancedPostingInterface.tsx` line 286 to use absolute URL

---

## Critical Test Requirements

### 1. NO MOCK DATA Rule
All tests MUST verify real Claude Code responses:

```typescript
// ✅ CORRECT - Verify real response
expect(response).toMatch(/4|four/i); // Claude answers "4" to "2+2"
expect(response).not.toContain('simulation');
expect(response).not.toContain('mock');

// ❌ WRONG - Using mocks
const mockResponse = 'This is a mock response';
```

### 2. Real API Calls
```typescript
// ✅ CORRECT - Real fetch
const response = await fetch('http://localhost:3001/api/claude-code/streaming-chat', {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({
    message: 'What is 2 + 2?',
    options: { cwd: '/workspaces/agent-feed/prod' }
  })
});

// ❌ WRONG - Mocking fetch
mockFetch.mockResolvedValue({ /* fake data */ });
```

### 3. Real File System Operations
```typescript
// ✅ CORRECT - Test Claude can actually read files
const response = await sendMessage(
  'Read /workspaces/agent-feed/prod/CLAUDE.md and tell me your role'
);
expect(response).toContain('Λvi');
expect(response).toContain('Chief of Staff');

// ❌ WRONG - Assuming file access
// No test, just trust it works
```

---

## Test Verification Checklist

### Before Running Tests
- [ ] Backend server running on port 3001
- [ ] Frontend dev server running on port 5173
- [ ] Claude CLI installed and authenticated
- [ ] No environment variable issues
- [ ] Database accessible

### After Running Tests
- [ ] All E2E tests FAIL with 403 errors
- [ ] Integration tests show backend works
- [ ] Component tests FAIL (wrong URL)
- [ ] Service tests PASS (already fixed)
- [ ] Console shows detailed error messages
- [ ] Network tab shows requests to correct endpoint

---

## Expected Test Results (RED Phase)

### E2E Tests
```
❌ user should send message with correct cwd path to backend
   Expected: cwd = '/workspaces/agent-feed/prod'
   Actual: Request failed with 403 Forbidden

❌ should receive 200 OK response from backend with correct path
   Expected: status = 200
   Actual: status = 403

❌ should NOT receive 403 Forbidden error
   Expected: 0 errors
   Actual: 1 error - "403 Forbidden"

❌ should receive actual Claude Code response (NOT mock)
   Expected: Response with answer
   Actual: Error response
```

### Integration Tests
```
✅ backend should accept correct cwd path (200 OK)
✅ backend should reject wrong cwd path with 403
✅ backend should block protected directories
✅ backend should allow unrestricted agent_workspace
❌ should process real Claude Code request (frontend fails to reach)
```

### Component Unit Tests
```
❌ should send request with correct cwd path
   Expected: cwd in request body
   Actual: Relative URL used

❌ should NOT use relative URL that depends on proxy
   Expected: Absolute URL
   Actual: Relative URL '/api/claude-code/streaming-chat'

❌ should receive 200 OK response
   Expected: 200
   Actual: 403
```

### Service Unit Tests
```
✅ should use absolute base URL by default
✅ should default to http://localhost:3001
✅ should send message with correct cwd path in options
✅ should pass cwd to HTTP client in request body
✅ All service tests pass (already fixed)
```

---

## Fix Implementation Guidance

After tests FAIL (RED phase), implement fix:

### File to Change
`/workspaces/agent-feed/frontend/src/components/EnhancedPostingInterface.tsx`

### Line to Change
Line 286

### Current (WRONG)
```typescript
const response = await fetch('/api/claude-code/streaming-chat', {
```

### Fixed (CORRECT)
```typescript
const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || 'http://localhost:3001';
const response = await fetch(`${API_BASE_URL}/api/claude-code/streaming-chat`, {
```

### Environment Variable
```bash
# frontend/.env.development
VITE_API_BASE_URL=http://localhost:3001

# frontend/.env.production
VITE_API_BASE_URL=https://api.yourdomain.com
```

---

## Test Re-run (GREEN Phase)

After implementing fix, re-run all tests:

```bash
# E2E Tests
npx playwright test tests/e2e/avidm-403-fix-validation.spec.ts

# Integration Tests
npm test -- tests/integration/avidm-path-protection.test.js

# Component Tests
cd frontend && npm test -- src/tests/unit/EnhancedPostingInterface-cwd-fix.test.tsx

# Service Tests
cd frontend && npm test -- src/tests/unit/AviDMService-cwd-fix.test.ts
```

**Expected**: ALL PASS ✅

---

## London School TDD Principles Applied

### 1. Outside-In Testing
- Start with E2E tests (user perspective)
- Work inward to integration tests
- Finish with unit tests (implementation details)

### 2. Interaction Verification
- Test HOW objects collaborate
- Verify method calls and sequences
- Focus on contracts between components

### 3. Mock-First for Collaborators (Where Appropriate)
- Mock WebSocket, SessionManager, etc. in service tests
- DO NOT mock external systems (Claude Code, backend API)
- Use real implementations for critical paths

### 4. Behavior Over State
- Test what component DOES, not what it CONTAINS
- Verify fetch is called with correct parameters
- Verify responses are displayed correctly

### 5. Clear Contracts
- Define expected interactions
- Verify collaboration sequences
- Ensure proper error handling

---

## Success Metrics

### Test Coverage
- E2E: Complete user workflow ✅
- Integration: Backend path protection ✅
- Unit: Component behavior ✅
- Unit: Service configuration ✅

### Real System Verification
- Real Claude Code responses ✅
- Real file system operations ✅
- Real HTTP requests ✅
- No mocks for critical paths ✅

### Error Scenarios
- 403 Forbidden handling ✅
- Network timeout (90s) ✅
- Backend errors (500) ✅
- Malformed responses ✅

---

## Documentation References

- [SPARC Specification](/workspaces/agent-feed/docs/SPARC-AVI-DM-403-FIX-SPECIFICATION.md)
- [EnhancedPostingInterface Component](/workspaces/agent-feed/frontend/src/components/EnhancedPostingInterface.tsx)
- [AviDMService](/workspaces/agent-feed/frontend/src/services/AviDMService.ts)
- [Path Protection Middleware](/workspaces/agent-feed/api-server/middleware/protectCriticalPaths.js)

---

## Next Steps

1. ✅ Test suite created (RED phase)
2. ⏳ Run all tests to verify they FAIL
3. ⏳ Implement fix in EnhancedPostingInterface.tsx
4. ⏳ Re-run tests to verify they PASS (GREEN phase)
5. ⏳ Refactor if needed (REFACTOR phase)
6. ⏳ Deploy to production

---

**Test Suite Status**: ✅ COMPLETE - Ready for RED phase execution

**Implementation Status**: ⏳ PENDING - Waiting for fix implementation

**London School Compliance**: ✅ VERIFIED - Outside-in, interaction-focused, real systems
