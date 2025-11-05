# SPARC: Onboarding Bridge Permanent Removal

**Date**: 2025-11-04
**Issue**: Onboarding bridge keeps recreating despite deletion
**Root Cause**: Onboarding state shows incomplete, triggering Priority Service to recreate bridge

## Root Cause
- `onboarding_state.phase1_completed = 0`
- `user_settings.onboarding_completed = 0`
- `BridgePriorityService` sees incomplete state and creates Priority 2 onboarding bridge

## Fix
Mark onboarding complete in 3 database tables:
1. DELETE active onboarding bridges
2. UPDATE `onboarding_state` (mark phases complete)
3. UPDATE `user_settings` (mark onboarding complete)

## Success Criteria
- ✅ 0 active onboarding bridges
- ✅ phase1_completed = 1, phase2_completed = 1
- ✅ onboarding_completed = 1
- ✅ Bridge API returns Priority 3+ only
- ✅ All tests passing (NO MOCKS)
