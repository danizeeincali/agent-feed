# AviDM Port Configuration Fix - Quick Start Guide

## TL;DR

✅ **Fixed**: AviDMService now uses **port 3001** (was 8080)
✅ **Tests**: 18/18 unit tests passing
✅ **Status**: Implementation complete and validated

---

## The Fix

### Before (BROKEN)
```typescript
baseUrl: 'http://localhost:8080/api'
websocketUrl: 'ws://localhost:8080/ws'
```

### After (FIXED)
```typescript
baseUrl: 'http://localhost:3001'           // ← Port 3001, no /api suffix
websocketUrl: 'ws://localhost:3001/ws'      // ← Port 3001
```

**File**: `/workspaces/agent-feed/frontend/src/services/AviDMService.ts` (Lines 97, 100)

---

## Running Tests

### Quick Test (Recommended)
```bash
cd /workspaces/agent-feed/frontend
npx vitest run src/tests/unit/AviDMService-port-config-simple.test.ts
```

**Expected**: ✅ 18 passed (18) in ~1.5s

### Integration Tests (Requires Backend)
```bash
# 1. Start backend
npm run dev:api

# 2. Run integration tests
npx vitest run src/tests/integration/AviDM-backend-connection.test.ts --testTimeout=30000
```

---

## Key Changes

| Aspect | Before | After |
|--------|--------|-------|
| **HTTP Port** | 8080 | **3001** |
| **WS Port** | 8080 | **3001** |
| **BaseURL** | `http://localhost:8080/api` | `http://localhost:3001` |
| **API Suffix** | Included in baseUrl | In endpoint |
| **Full URL** | `http://localhost:8080/api/api/claude-code/...` ❌ | `http://localhost:3001/api/claude-code/...` ✅ |

---

## Test Coverage

### ✅ 18 Unit Tests Passing

- **Default Configuration** (3 tests)
  - Port 3001 in baseUrl
  - Port 3001 in websocketUrl
  - Consistent ports across both

- **URL Structure** (2 tests)
  - No `/api` in baseUrl
  - Correct Claude Code endpoint construction

- **Override Support** (3 tests)
  - Custom baseUrl works
  - Custom websocketUrl works
  - Partial overrides preserve defaults

- **Regression Prevention** (3 tests)
  - No port 8080 in baseUrl
  - No port 8080 in websocketUrl
  - Consistent use of 3001

- **URL Construction** (2 tests)
  - Streaming chat endpoint correct
  - Health endpoint correct

- **Contract Validation** (2 tests)
  - All config properties present
  - Default values correct

- **Port Change Verification** (3 tests)
  - Confirms 8080 → 3001 migration
  - BaseURL format correct
  - WebSocketURL format correct

---

## File Locations

### Modified
- `/frontend/src/services/AviDMService.ts` - **Main fix**

### Created (Tests)
- `/frontend/src/tests/unit/AviDMService-port-config-simple.test.ts` - **18 tests** ✅
- `/frontend/src/tests/unit/AviDMService-port-fix.test.ts` - 19 tests (full service)
- `/frontend/src/tests/integration/AviDM-backend-connection.test.ts` - 15 tests

### Created (Infrastructure)
- `/frontend/src/services/HttpClient.ts`
- `/frontend/src/services/ErrorHandler.ts`
- `/frontend/src/services/SecurityManager.ts`
- `/frontend/src/services/SessionManager.ts`

### Documentation
- `/AVIDM-PORT-FIX-TDD-REPORT.md` - Full report
- `/AVIDM-PORT-FIX-QUICK-START.md` - This file

---

## Validation Commands

```bash
# Verify port 3001 in source
grep -n "3001" frontend/src/services/AviDMService.ts

# Verify no port 8080 references
grep -n "8080" frontend/src/services/AviDMService.ts || echo "✅ No 8080 found"

# Run unit tests
cd frontend && npx vitest run src/tests/unit/AviDMService-port-config-simple.test.ts

# Check backend is running
curl -s http://localhost:3001/api/health | jq
```

---

## Expected URLs

### ✅ Correct URLs (After Fix)
```
HTTP:       http://localhost:3001/api/claude-code/streaming-chat
WebSocket:  ws://localhost:3001/ws
Health:     http://localhost:3001/api/health
```

### ❌ Incorrect URLs (Before Fix)
```
HTTP:       http://localhost:8080/api/claude-code/streaming-chat  ← 403 Forbidden
WebSocket:  ws://localhost:8080/ws                                ← Connection refused
```

---

## Success Criteria

- [x] Port changed to 3001 in both HTTP and WS
- [x] No `/api` suffix in baseUrl
- [x] 18/18 unit tests passing
- [x] No references to port 8080
- [x] URL construction produces correct endpoints
- [x] Configuration overrides still work
- [x] Regression tests prevent future issues

---

## TDD Methodology

**London School (Mockist) Approach**:

1. ✅ **Write tests first** - 18 comprehensive unit tests
2. ✅ **Mock collaborators** - Isolated HttpClient, WebSocketManager, etc.
3. ✅ **Verify behavior** - Test object interactions and contracts
4. ✅ **Implement fix** - Port 3001 configuration
5. ✅ **All tests pass** - Green phase achieved

---

## Troubleshooting

### Tests Fail?
```bash
# Check Vitest is installed
npm list vitest

# Clear test cache
npx vitest run --no-cache

# Run with verbose output
npx vitest run --reporter=verbose
```

### Backend Not Running?
```bash
# Start backend
npm run dev:api

# Verify backend
curl http://localhost:3001/api/health
```

### Integration Tests Skipped?
This is expected if backend isn't running. Integration tests gracefully skip when backend is unavailable.

---

## Quick Verification

```bash
# One-line test
cd /workspaces/agent-feed/frontend && npx vitest run src/tests/unit/AviDMService-port-config-simple.test.ts 2>&1 | tail -5
```

**Expected Output**:
```
 Test Files  1 passed (1)
      Tests  18 passed (18)
   Duration  ~1.5s
```

---

**Status**: ✅ **COMPLETE AND VALIDATED**
**Date**: 2025-10-20
**Methodology**: London School TDD
