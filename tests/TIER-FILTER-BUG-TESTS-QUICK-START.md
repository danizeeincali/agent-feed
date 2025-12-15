# Tier Filter Bug Fix Tests - Quick Start Guide

## Test Suite Overview

**Total Tests**: 66 tests across 3 layers
**Expected Status**: Most tests FAIL initially (bugs exist)
**Methodology**: London School TDD

---

## Quick Commands

### Run All Tests (Automated)

```bash
chmod +x tests/run-tier-filter-bug-tests.sh
./tests/run-tier-filter-bug-tests.sh
```

### Frontend Unit Tests Only

```bash
cd frontend
npm test -- IsolatedRealAgentManager-tier-bug-fix.test.tsx --run
```

**Expected**: 6 failures, 10 passes

### Backend Integration Tests Only

```bash
npx mocha tests/integration/agent-tier-filtering-fix.test.cjs --timeout 10000 --reporter spec
```

**Expected**: ~12 failures, ~13 passes

### E2E Tests (Manual - Requires Running Servers)

```bash
# Terminal 1
cd frontend && npm run dev

# Terminal 2
cd api-server && npm start

# Terminal 3
npx playwright test tests/e2e/tier-filter-bug-fix-validation.spec.ts
```

**Expected**: All 25 tests fail

---

## Test Files

1. **Frontend Unit**: `frontend/src/tests/unit/IsolatedRealAgentManager-tier-bug-fix.test.tsx`
2. **Backend Integration**: `tests/integration/agent-tier-filtering-fix.test.cjs`
3. **E2E Playwright**: `tests/e2e/tier-filter-bug-fix-validation.spec.ts`

---

## What Tests Validate

### Frontend (16 tests)

- ❌ apiService NOT destroyed on tier change
- ❌ loadAgents called with correct tier
- ❌ Component stays mounted during tier changes
- ✅ Tier buttons remain clickable

### Backend (25 tests)

- ❌ GET /agents?tier=1 returns 9 agents
- ❌ GET /agents?tier=2 returns 10 agents
- ❌ GET /agents?tier=all returns 19 agents
- ❌ All agents have tier field
- ✅ Metadata structure correct

### E2E (25 tests)

- ❌ NO "Route Disconnected" error on tier clicks
- ❌ Agents display after tier change
- ❌ NO console errors
- ❌ API status stays "Active"
- ❌ Screenshots show working UI

---

## Expected Test Results (Before Fix)

```
Frontend:   6 FAIL, 10 PASS
Backend:   12 FAIL, 13 PASS
E2E:       25 FAIL, 0 PASS
───────────────────────────
TOTAL:     43 FAIL, 23 PASS
```

## Expected Test Results (After Fix)

```
Frontend:   0 FAIL, 16 PASS
Backend:    0 FAIL, 25 PASS
E2E:        0 FAIL, 25 PASS
───────────────────────────
TOTAL:      0 FAIL, 66 PASS ✅
```

---

## Root Causes Being Tested

### Frontend Bug

**File**: `frontend/src/components/IsolatedRealAgentManager.tsx`
**Line**: 118
**Issue**: `loadAgents` in useEffect dependencies causes cleanup on tier change

### Backend Bug

**File**: Unknown (needs investigation)
**Issue**: Repository loads agents, but API returns empty data

---

## Fix Verification

After implementing fixes:

```bash
# Should see all green ✅
./tests/run-tier-filter-bug-tests.sh

# Expected output:
# Frontend:   16 passed ✅
# Backend:    25 passed ✅
# E2E:        25 passed ✅
# TOTAL:      66 passed ✅
```

---

## Troubleshooting

### Frontend tests fail to run

```bash
cd frontend
npm install
npm test -- IsolatedRealAgentManager-tier-bug-fix.test.tsx --run
```

### Backend tests fail to run

```bash
npm install --save-dev mocha chai supertest
npx mocha tests/integration/agent-tier-filtering-fix.test.cjs --timeout 10000
```

### E2E tests timeout

Make sure both servers are running:
```bash
# Check frontend: http://localhost:5173
# Check backend: http://localhost:3001/health
```

---

## Screenshots Location

E2E tests create screenshots in:
```
tests/e2e/screenshots/
├── tier-filter-bug-fix-t1-state.png
├── tier-filter-bug-fix-t2-state.png
├── tier-filter-bug-fix-all-state.png
└── tier-sequence-*.png
```

---

**Quick Reference**:
- Investigation Report: `TIER-FILTER-ERRORS-INVESTIGATION.md`
- Test Summary: `tests/TIER-FILTER-BUG-FIX-TEST-SUITE-SUMMARY.md`
- This Quick Start: `tests/TIER-FILTER-BUG-TESTS-QUICK-START.md`
