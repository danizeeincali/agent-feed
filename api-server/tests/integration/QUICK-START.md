# Quick Start - Onboarding Bridge Fix Tests

## TL;DR

```bash
cd /workspaces/agent-feed/api-server/tests/integration

# Quick validation (30 seconds)
node quick-validation.js

# Full test suite (2-3 minutes)
./run-onboarding-bridge-test.sh
```

## What These Tests Do

✅ Verify onboarding phases are complete in database
✅ Check for zero onboarding bridges (Priority 1-2)
✅ Validate API only returns Priority 3+ bridges
✅ Confirm multiple calls don't recreate bridges
✅ Test priority service logic with real data

## Current Status (2025-11-04)

⚠️  **BUG CONFIRMED** - Priority 1 bridge exists when it shouldn't

### Expected After Fix:
```
✅ Phase 1 Complete: true
✅ Phase 2 Complete: true
✅ Onboarding Bridges: 0
✅ Priority 1-2 Bridges: 0
✅ API Returns: Priority 3+ only
✅ Multiple Calls: No new onboarding bridges
```

### Currently Seeing:
```
✅ Phase 1 Complete: true
✅ Phase 2 Complete: true
❌ Onboarding Bridges: 1  (continue_thread, Priority 1)
❌ Priority 1-2 Bridges: 1
❌ API Returns: Priority 1
❌ Multiple Calls: Keep returning Priority 1
```

## Files

| File | Purpose | Time |
|------|---------|------|
| `quick-validation.js` | Fast check | 30s |
| `onboarding-bridge-permanent-fix.test.js` | Full suite (26 tests) | 2-3min |
| `run-onboarding-bridge-test.sh` | Test runner | 2-3min |

## Fix Required

**File**: `/workspaces/agent-feed/api-server/services/engagement/bridge-priority-service.js`

**Method**: `checkLastInteraction(userId)` around line 171

**Add**: Onboarding completion check before returning Priority 1 bridges

See `VALIDATION-REPORT.md` for detailed fix recommendations.

## After Fix is Applied

1. Clear existing bad bridge:
   ```bash
   sqlite3 /workspaces/agent-feed/database.db \
     "DELETE FROM hemingway_bridges WHERE user_id='demo-user-123' AND bridge_type='continue_thread' AND active=1"
   ```

2. Run quick validation:
   ```bash
   node quick-validation.js
   ```

3. Should see:
   ```
   ✅ ALL VALIDATIONS PASSED
   🎉 Onboarding Bridge Fix is working correctly!
   ```

## Documentation

- `VALIDATION-REPORT.md` - Detailed bug analysis and fix recommendations
- `ONBOARDING-BRIDGE-FIX-TEST-README.md` - Complete test documentation
- Test files have inline comments explaining each validation

---

**Need Help?** Check `VALIDATION-REPORT.md` for root cause and recommended fixes.
