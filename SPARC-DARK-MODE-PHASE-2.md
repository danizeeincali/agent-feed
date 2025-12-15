# SPARC Specification - Dark Mode Phase 2: Remaining Components

**Date**: 2025-10-09
**Phase**: 2 (Completion Phase)
**Status**: In Progress
**Methodology**: SPARC + TDD + Claude-Flow Swarm

---

## S - SPECIFICATION

### Problem Statement
Initial dark mode implementation covered page builder components but missed standalone page components, resulting in white backgrounds appearing in:
- Feed posts (RealSocialMediaFeed.tsx)
- Draft cards (DraftManager.tsx)
- Agent cards (AgentDashboard.tsx)
- Activity cards (RealActivityFeed.tsx)
- Charts (LineChart, BarChart, PieChart)
- Agent profile pages (18+ instances)
- Comment systems

### Requirements

**Functional Requirements**:
1. All component backgrounds must have dark mode variants
2. Text colors must have sufficient contrast in both modes (WCAG AA)
3. Border colors must be visible in both modes
4. Hover/interactive states must work in both modes
5. No white backgrounds should appear when dark mode is active

**Technical Requirements**:
1. Apply consistent dark mode pattern across all components
2. Maintain existing functionality - zero breaking changes
3. Pass all Playwright accessibility tests
4. WCAG 2.1 Level AA compliance minimum

**Success Criteria**:
- ✅ Zero white backgrounds in dark mode
- ✅ All text readable (contrast ratio ≥ 4.5:1)
- ✅ All interactive states visible
- ✅ Playwright tests pass (95%+ pass rate)
- ✅ User confirmation of fix

---

## P - PSEUDOCODE

### Pattern Application Algorithm

```
FOR EACH component file in priority list:
  1. Read the file
  2. Identify all bg-white instances
  3. Apply dark mode transformation:
     - bg-white → bg-white dark:bg-gray-900
     - border-gray-200 → border-gray-200 dark:border-gray-700
     - text-gray-900 → text-gray-900 dark:text-gray-100
     - hover:bg-gray-50 → hover:bg-gray-50 dark:hover:bg-gray-800
  4. Identify all text-gray-* instances
  5. Apply dark mode text colors:
     - text-gray-700 → text-gray-700 dark:text-gray-300
     - text-gray-600 → text-gray-600 dark:text-gray-400
     - text-gray-500 → text-gray-500 dark:text-gray-400
  6. Save file
  7. Add to modified files list
END FOR

FOR EACH modified file:
  1. Create Playwright test
  2. Run test in dark mode
  3. Capture screenshot
  4. Verify no white backgrounds
END FOR
```

---

## A - ARCHITECTURE

### Component Hierarchy

```
App.tsx (✅ Dark mode enabled)
├── Layout
│   ├── Sidebar (✅ Dark mode enabled)
│   ├── Header (✅ Dark mode enabled)
│   └── Main Content
│       ├── Feed Page (❌ Needs dark mode)
│       │   └── RealSocialMediaFeed.tsx
│       │       └── Post Cards (❌ White backgrounds)
│       ├── Drafts Page (❌ Needs dark mode)
│       │   └── DraftManager.tsx
│       │       └── Draft Cards (❌ White backgrounds)
│       ├── Agents Page (❌ Needs dark mode)
│       │   └── AgentDashboard.tsx
│       │       └── Agent Cards (❌ White backgrounds)
│       ├── Activity Page (❌ Needs dark mode)
│       │   └── RealActivityFeed.tsx
│       │       └── Activity Cards (❌ White backgrounds)
│       └── Agent Profile (❌ Needs dark mode)
│           └── AgentProfile.tsx
│               └── Profile Sections (❌ White backgrounds)
```

### Concurrent Agent Strategy

**Agent 1 - Critical Components**:
- RealSocialMediaFeed.tsx (4 instances)
- DraftManager.tsx (6 instances)
- RealActivityFeed.tsx (2 instances)

**Agent 2 - Agent Pages**:
- AgentDashboard.tsx (7 instances)
- AgentProfile.tsx (18 instances)
- AgentProfileTab.tsx (11 instances)

**Agent 3 - Charts & Comments**:
- LineChart.tsx (2 instances)
- BarChart.tsx (estimate 2 instances)
- PieChart.tsx (estimate 2 instances)
- CommentThread.tsx (3 instances)
- CommentSystem.tsx (1 instance)

**Agent 4 - Remaining Components**:
- BulletproofAgentProfile.tsx (4 instances)
- SimpleAgentManager.tsx (4 instances)
- BulletproofSocialMediaFeed.tsx (6 instances)
- BulletproofActivityPanel.tsx (2 instances)

---

## R - REFINEMENT

### Phase Breakdown

**Phase 1 - Critical (Highest Impact)**:
1. RealSocialMediaFeed.tsx - Post cards
2. DraftManager.tsx - Draft cards
3. AgentDashboard.tsx - Agent cards
4. RealActivityFeed.tsx - Activity cards
5. LineChart.tsx - Chart containers

**Phase 2 - High (Agent Pages)**:
6. AgentProfile.tsx - Profile sections
7. AgentProfileTab.tsx - Tab content
8. BulletproofAgentProfile.tsx - Alternative profile

**Phase 3 - Medium (Charts & Social)**:
9. BarChart.tsx - Bar chart containers
10. PieChart.tsx - Pie chart containers
11. CommentThread.tsx - Comment cards
12. CommentSystem.tsx - Comment UI
13. BulletproofSocialMediaFeed.tsx - Alternative feed

**Phase 4 - Low (Utilities)**:
14. SimpleAgentManager.tsx - Simple UI
15. BulletproofActivityPanel.tsx - Activity panel
16. DynamicPageWithData.tsx - Dynamic content
17. RouteErrorBoundary.tsx - Error displays

### Risk Assessment

**Low Risk Changes**:
- Purely additive (adding dark: variants)
- No logic changes
- No breaking changes
- Can be rolled back easily

**Testing Strategy**:
- Playwright tests for each component
- Visual regression with screenshots
- Accessibility validation with axe-core
- Manual browser testing

---

## C - COMPLETION

### Implementation Plan

1. **Concurrent Agent Deployment** (45 min)
   - Deploy 4 agents simultaneously
   - Each agent handles specific file set
   - Parallel execution for speed

2. **Validation Phase** (30 min)
   - Run Playwright tests
   - Capture screenshots
   - Validate dark backgrounds
   - Check contrast ratios

3. **Integration Testing** (15 min)
   - Test all pages manually
   - Verify no regressions
   - Confirm user-reported issues fixed

4. **Final Report** (10 min)
   - Document all changes
   - List test results
   - Provide deployment guidance

**Total Estimated Time**: 90 minutes

---

## Test-Driven Development (TDD)

### Test Cases to Create

**Feed Page Tests**:
```typescript
test('should have dark backgrounds for post cards in dark mode', async ({ page }) => {
  await page.emulateMedia({ colorScheme: 'dark' });
  await page.goto('/');

  const postCard = page.locator('[data-testid="post-card"]').first();
  const bgColor = await postCard.evaluate(el =>
    window.getComputedStyle(el).backgroundColor
  );

  expect(bgColor).not.toContain('255, 255, 255'); // Not white
  expect(bgColor).toContain('17, 24, 39'); // gray-900
});
```

**Drafts Page Tests**:
```typescript
test('should have dark backgrounds for draft cards in dark mode', async ({ page }) => {
  await page.emulateMedia({ colorScheme: 'dark' });
  await page.goto('/drafts');

  const draftCard = page.locator('.draft-card').first();
  const bgColor = await draftCard.evaluate(el =>
    window.getComputedStyle(el).backgroundColor
  );

  expect(bgColor).toContain('17, 24, 39'); // gray-900
});
```

**Agents Page Tests**:
```typescript
test('should have dark backgrounds for agent cards in dark mode', async ({ page }) => {
  await page.emulateMedia({ colorScheme: 'dark' });
  await page.goto('/agents');

  const agentCard = page.locator('.agent-card').first();
  const bgColor = await agentCard.evaluate(el =>
    window.getComputedStyle(el).backgroundColor
  );

  expect(bgColor).toContain('17, 24, 39'); // gray-900
});
```

**Activity Page Tests**:
```typescript
test('should have dark backgrounds for activity cards in dark mode', async ({ page }) => {
  await page.emulateMedia({ colorScheme: 'dark' });
  await page.goto('/activity');

  const activityCard = page.locator('.activity-card').first();
  const bgColor = await activityCard.evaluate(el =>
    window.getComputedStyle(el).backgroundColor
  );

  expect(bgColor).toContain('17, 24, 39'); // gray-900
});
```

---

## Pattern Reference

### Standard Transformation

**Background Colors**:
```tsx
bg-white → bg-white dark:bg-gray-900
bg-gray-50 → bg-gray-50 dark:bg-gray-800
bg-gray-100 → bg-gray-100 dark:bg-gray-800
bg-gray-200 → bg-gray-200 dark:bg-gray-700
```

**Text Colors**:
```tsx
text-gray-900 → text-gray-900 dark:text-gray-100
text-gray-800 → text-gray-800 dark:text-gray-200
text-gray-700 → text-gray-700 dark:text-gray-300
text-gray-600 → text-gray-600 dark:text-gray-400
text-gray-500 → text-gray-500 dark:text-gray-400
```

**Border Colors**:
```tsx
border-gray-200 → border-gray-200 dark:border-gray-700
border-gray-300 → border-gray-300 dark:border-gray-700
border-gray-400 → border-gray-400 dark:border-gray-600
```

**Hover States**:
```tsx
hover:bg-gray-50 → hover:bg-gray-50 dark:hover:bg-gray-800
hover:bg-gray-100 → hover:bg-gray-100 dark:hover:bg-gray-800
hover:text-gray-600 → hover:text-gray-600 dark:hover:text-gray-300
```

---

## File Modification Checklist

### Phase 1 - Critical (Agent 1)
- [ ] `/src/components/RealSocialMediaFeed.tsx` (4 instances)
- [ ] `/src/components/DraftManager.tsx` (6 instances)
- [ ] `/src/components/RealActivityFeed.tsx` (2 instances)
- [ ] `/src/components/charts/LineChart.tsx` (2 instances)

### Phase 2 - Agent Pages (Agent 2)
- [ ] `/src/components/AgentDashboard.tsx` (7 instances)
- [ ] `/src/components/AgentProfile.tsx` (18 instances)
- [ ] `/src/components/AgentProfileTab.tsx` (11 instances)

### Phase 3 - Charts & Comments (Agent 3)
- [ ] `/src/components/charts/BarChart.tsx` (estimate 2)
- [ ] `/src/components/charts/PieChart.tsx` (estimate 2)
- [ ] `/src/components/CommentThread.tsx` (3 instances)
- [ ] `/src/components/comments/CommentThread.tsx` (1 instance)
- [ ] `/src/components/comments/CommentSystem.tsx` (1 instance)

### Phase 4 - Remaining (Agent 4)
- [ ] `/src/components/BulletproofAgentProfile.tsx` (4 instances)
- [ ] `/src/components/SimpleAgentManager.tsx` (4 instances)
- [ ] `/src/components/BulletproofSocialMediaFeed.tsx` (6 instances)
- [ ] `/src/components/BulletproofActivityPanel.tsx` (2 instances)
- [ ] `/src/components/DynamicPageWithData.tsx` (3 instances)
- [ ] `/src/components/RouteErrorBoundary.tsx` (1 instance)

---

## Success Metrics

**Code Quality**:
- ✅ 100% pattern consistency
- ✅ Zero breaking changes
- ✅ Zero TypeScript errors
- ✅ Zero ESLint warnings

**Accessibility**:
- ✅ WCAG 2.1 Level AA compliance
- ✅ Contrast ratio ≥ 4.5:1 for all text
- ✅ Zero axe-core violations

**Testing**:
- ✅ 95%+ Playwright test pass rate
- ✅ Zero white backgrounds in dark mode screenshots
- ✅ All user-reported areas fixed

**User Validation**:
- ✅ User confirms feed posts are dark
- ✅ User confirms draft cards are dark
- ✅ User confirms agent cards are dark
- ✅ User confirms activity cards are dark
- ✅ User confirms charts are dark

---

**SPARC Specification Complete**
**Ready for Implementation**: ✅
**Agent Deployment**: Ready to launch 4 concurrent agents
