# SPARC Specification - Dark Mode Phase 4 (Final Fixes)

**Project:** Agent Feed Frontend - Dark Mode Phase 4
**Date:** 2025-10-09
**Status:** Final white backgrounds elimination

---

## S - Specification

### Problem Statement

User reports 3 remaining white backgrounds:
1. **All Post Filter** (FilterPanel.tsx)
2. **Agents Background** (already mostly fixed, need to verify)
3. **Analytics Cards** (TokenAnalyticsDashboard.tsx + EnhancedPerformanceTab.jsx)

### Requirements

#### 1. FilterPanel Component
**File:** `/workspaces/agent-feed/frontend/src/components/FilterPanel.tsx`

**White Backgrounds Found:**
- Line 249: Button active state `bg-white`
- Line 280: Advanced filter dropdown `bg-white`
- Line 351: Toggle switch `after:bg-white`
- Line 375: Toggle switch `after:bg-white`
- Line 390: Button state `bg-white`
- Line 400: Button state `bg-white`
- Line 434: Agent dropdown `bg-white`
- Line 464: Agent suggestions `bg-white`
- Line 490: Hashtag suggestions `bg-white`

**Total:** 9 instances requiring dark mode

#### 2. Analytics Cards - TokenAnalyticsDashboard
**File:** `/workspaces/agent-feed/frontend/src/components/TokenAnalyticsDashboard.tsx`

**White Backgrounds Found:**
- Line 419: SummaryCard component `bg-white`
- Line 422: Card text `text-gray-600`
- Line 423: Card value `text-gray-900`
- Line 458: MessageList container `bg-white`
- Line 459: Header border `border-gray-200`
- Line 461: Heading `text-gray-900`
- Line 469: Search input (no dark mode)
- Line 477: Empty state text `text-gray-500`
- Line 481: Divider `divide-gray-200`
- Line 483: Hover state `hover:bg-gray-50`
- Line 487-505: Badge backgrounds (multiple)
- Line 509: Message text `text-gray-900`

**Total:** 15+ instances requiring dark mode

#### 3. Agents Background Verification
**File:** `/workspaces/agent-feed/frontend/src/components/AgentDashboard.tsx`
**Status:** Already has dark mode (verified in grep)
**Action:** Double-check for any missed instances

---

## P - Pseudocode

```
FUNCTION fixPhase4DarkMode():
  // Agent 1: Fix FilterPanel
  FOR each white background in FilterPanel.tsx:
    IF dropdown/popup:
      REPLACE: bg-white → bg-white dark:bg-gray-900
      REPLACE: border-gray-200 → border-gray-200 dark:border-gray-700
    IF button state:
      ADD: dark:bg-gray-800
      ADD: dark:text-gray-300
      ADD: dark:hover:bg-gray-700
    IF toggle switch:
      ADD: dark:after:bg-gray-700
      ADD: dark:bg-gray-700
  END FOR

  // Agent 2: Fix TokenAnalyticsDashboard
  FOR each component:
    APPLY standard pattern:
      bg-white → bg-white dark:bg-gray-900
      text-gray-900 → text-gray-900 dark:text-gray-100
      text-gray-600 → text-gray-600 dark:text-gray-400
      border-gray-200 → border-gray-200 dark:border-gray-700
      hover:bg-gray-50 → hover:bg-gray-50 dark:hover:bg-gray-800

    FOR badge in badges:
      bg-blue-100 → dark:bg-blue-900/30
      text-blue-800 → dark:text-blue-300
    END FOR
  END FOR

  // Agent 3: Verify and fix remaining
  SEARCH for: bg-white WITHOUT dark:
  APPLY fixes to any found instances
END FUNCTION
```

---

## A - Architecture

### Component Dependency Map

```
RealSocialMediaFeed (Feed Page)
│
├── FilterPanel ⚠️ NEEDS DARK MODE
│   ├── Button States (bg-white)
│   ├── Dropdown Panels (bg-white)
│   └── Toggle Switches (bg-white)
│
└── Posts (already fixed)

RealAnalytics (Analytics Page)
│
├── TokenAnalyticsDashboard ⚠️ NEEDS DARK MODE
│   ├── SummaryCard (bg-white)
│   └── MessageList (bg-white)
│
└── EnhancedPerformanceTab (already fixed in Phase 3)

AgentDashboard
└── All components ✅ Already have dark mode
```

---

## R - Refinement

### Implementation Plan

**Phase 4A: Concurrent Agent Fixes (30 min)**

**Agent 1: FilterPanel (15 min)**
- Fix 9 white background instances
- Apply dropdown/button patterns
- Test filter interactions

**Agent 2: TokenAnalyticsDashboard (15 min)**
- Fix SummaryCard component (line 419)
- Fix MessageList component (line 458)
- Apply badge dark variants

**Agent 3: Final Verification (10 min)**
- Search entire codebase for remaining `bg-white` without `dark:`
- Fix any discovered instances
- Verify AgentDashboard

**Phase 4B: Testing & Validation (20 min)**
- Create Playwright tests
- Capture screenshots
- Run regression tests
- Final report

**Total Time:** 50 minutes

---

## C - Completion

### Definition of Done

- [ ] FilterPanel: All 9 instances fixed
- [ ] TokenAnalyticsDashboard: All 15+ instances fixed
- [ ] AgentDashboard: Verified (already has dark mode)
- [ ] Playwright tests created
- [ ] Screenshots captured
- [ ] No remaining `bg-white` without `dark:`
- [ ] Light mode preserved
- [ ] Zero errors
- [ ] 100% real and capable

---

## Pattern Reference

### Standard Patterns
```tsx
bg-white → bg-white dark:bg-gray-900
text-gray-900 → text-gray-900 dark:text-gray-100
border-gray-200 → border-gray-200 dark:border-gray-700
hover:bg-gray-50 → hover:bg-gray-50 dark:hover:bg-gray-800
```

### Badge Patterns
```tsx
bg-blue-100 text-blue-800 → dark:bg-blue-900/30 dark:text-blue-300
bg-green-100 text-green-800 → dark:bg-green-900/30 dark:text-green-300
bg-purple-100 text-purple-800 → dark:bg-purple-900/30 dark:text-purple-300
```

### Toggle Switch Pattern
```tsx
after:bg-white → dark:after:bg-gray-700
bg-gray-200 → dark:bg-gray-700
```

---

**SPARC Specification Complete - Ready for Implementation**
