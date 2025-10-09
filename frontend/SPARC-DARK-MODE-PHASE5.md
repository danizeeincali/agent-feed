# SPARC Specification - Dark Mode Phase 5 (Final Critical Fixes)

**Project:** Agent Feed Frontend - Dark Mode Phase 5
**Date:** 2025-10-09
**Status:** User-reported white backgrounds

---

## S - Specification

### Problem Statement

User reports 3 critical remaining white backgrounds:
1. **Performance tab cards** - RealAnalytics.tsx metric cards
2. **24-hour filter button** - Time period filter in analytics
3. **Agent Manager background** - SimpleAgentManager already has dark mode

### Requirements

#### 1. RealAnalytics Component
**File:** `/workspaces/agent-feed/frontend/src/components/RealAnalytics.tsx`

**White Backgrounds Found:**
- Line 57: Warning container `bg-yellow-50`
- Line 76: Loading container `bg-white`
- Line 94: Error container `bg-red-50`
- Line 112: Inline error `bg-red-50`
- Line 287: Tab error `bg-red-50`
- Line 308: Overview card `bg-white`
- Line 334: Active Users card `bg-white`
- Line 377: Recent Activity card `bg-white`

**Total:** 8 instances requiring dark mode

#### 2. SimpleAgentManager Verification
**File:** `/workspaces/agent-feed/frontend/src/components/SimpleAgentManager.tsx`
**Status:** Already has dark mode (verified)
**Action:** Confirm it's the active agent manager component

---

## P - Pseudocode

```
FUNCTION fixPhase5DarkMode():
  // Agent 1: Fix RealAnalytics loading/error states
  FOR each error/loading container:
    IF yellow warning:
      bg-yellow-50 → bg-yellow-50 dark:bg-yellow-900/20
      border-yellow-200 → border-yellow-200 dark:border-yellow-700
      text-yellow-600/700/800 → dark:text-yellow-400/300/200
    IF red error:
      bg-red-50 → bg-red-50 dark:bg-red-900/20
      border-red-200 → border-red-200 dark:border-red-700
      text-red-600/700/800 → dark:text-red-400/300/200
    IF white loading:
      bg-white → bg-white dark:bg-gray-900
      border-gray-200 → border-gray-200 dark:border-gray-700
  END FOR

  // Agent 2: Fix RealAnalytics metric cards
  FOR each metric card:
    bg-white → bg-white dark:bg-gray-900
    border-gray-200 → border-gray-200 dark:border-gray-700
    text-gray-600 → text-gray-600 dark:text-gray-400
    text-gray-900 → text-gray-900 dark:text-gray-100
  END FOR

  // Agent 3: Verify SimpleAgentManager
  CHECK if SimpleAgentManager is active component
  IF active:
    CONFIRM dark mode working
  ELSE:
    FIND and FIX active agent manager
  END IF
END FUNCTION
```

---

## A - Architecture

### Component Dependency Map

```
RealAnalytics (Analytics Page) ⚠️ NEEDS DARK MODE
│
├── ClaudeSDKAnalyticsLoading ⚠️ Line 76: bg-white
├── ClaudeSDKAnalyticsError ⚠️ Line 94: bg-red-50
├── Overview Card ⚠️ Line 308: bg-white
├── Active Users Card ⚠️ Line 334: bg-white
└── Recent Activity Card ⚠️ Line 377: bg-white

SimpleAgentManager ✅ Already has dark mode
├── Skeleton loading (line 75)
├── Refresh button (line 97)
├── Search input (line 117)
└── Agent cards (line 124)
```

---

## R - Refinement

### Implementation Plan

**Phase 5A: Concurrent Agent Fixes (20 min)**

**Agent 1: RealAnalytics Error/Loading States (10 min)**
- Fix warning container (line 57)
- Fix loading container (line 76)
- Fix error containers (lines 94, 112, 287)
- Test loading and error states

**Agent 2: RealAnalytics Metric Cards (10 min)**
- Fix Overview card (line 308)
- Fix Active Users card (line 334)
- Fix Recent Activity card (line 377)

**Agent 3: Agent Manager Verification (10 min)**
- Verify SimpleAgentManager is active
- Check which AgentManager is loaded in routes
- Confirm dark mode working

**Phase 5B: Testing & Validation (20 min)**
- Create Playwright tests
- Capture screenshots
- Run regression tests
- Final report

**Total Time:** 40 minutes

---

## C - Completion

### Definition of Done

- [ ] RealAnalytics: All 8 instances fixed
- [ ] Loading/Error states have dark mode
- [ ] Metric cards have dark mode
- [ ] AgentManager verified as working
- [ ] Playwright tests created
- [ ] Screenshots captured
- [ ] No remaining white backgrounds
- [ ] Light mode preserved
- [ ] Zero errors
- [ ] 100% real and capable

---

## Pattern Reference

### Error/Warning States
```tsx
// Yellow Warning
bg-yellow-50 → bg-yellow-50 dark:bg-yellow-900/20
border-yellow-200 → border-yellow-200 dark:border-yellow-700
text-yellow-600 → text-yellow-600 dark:text-yellow-400
text-yellow-700 → text-yellow-700 dark:text-yellow-300
text-yellow-800 → text-yellow-800 dark:text-yellow-200

// Red Error
bg-red-50 → bg-red-50 dark:bg-red-900/20
border-red-200 → border-red-200 dark:border-red-700
text-red-600 → text-red-600 dark:text-red-400
text-red-700 → text-red-700 dark:text-red-300
text-red-800 → text-red-800 dark:text-red-200
```

### Standard Patterns
```tsx
bg-white → bg-white dark:bg-gray-900
border-gray-200 → border-gray-200 dark:border-gray-700
text-gray-600 → text-gray-600 dark:text-gray-400
text-gray-900 → text-gray-900 dark:text-gray-100
```

---

**SPARC Specification Complete - Ready for Implementation**
