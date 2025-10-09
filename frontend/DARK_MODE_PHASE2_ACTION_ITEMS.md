# Dark Mode Phase 2 - Action Items Checklist

**Priority:** CRITICAL  
**Target:** Production Ready Status  
**Estimated Total Effort:** 12-20 hours

---

## 🔴 CRITICAL - Day 1 (8-12 hours)

### Task 1: Fix TypeScript Compilation Errors (6-8 hours)

**Status:** 🔴 BLOCKING - Must complete first

#### 1.1 Export Missing Types from UnifiedAgentPage
- [ ] Export `AgentStats` interface/type
- [ ] Export `AgentActivity` interface/type  
- [ ] Export `AgentPost` interface/type
- **Files:** `/workspaces/agent-feed/frontend/src/components/UnifiedAgentPage.tsx`

#### 1.2 Fix Missing UI Component Exports
- [ ] Create or export `badge` component from `../ui/badge`
- [ ] Create or export `tabs` component from `../ui/tabs`
- **Files:** `/workspaces/agent-feed/frontend/src/ui/`

#### 1.3 Export CommentSort from CommentThread
- [ ] Export `CommentSort` type from CommentThread component
- **Files:** `/workspaces/agent-feed/frontend/src/components/CommentThread.tsx`

#### 1.4 Fix Private Property Access
- [ ] Make FilterDebugger.log public or create accessor
- [ ] Make ApiService.request public or create wrapper methods
- **Files:** 
  - `/workspaces/agent-feed/frontend/src/utils/filterDebugger.ts`
  - `/workspaces/agent-feed/frontend/src/services/api.ts`

#### 1.5 Fix Agent Configuration Type Errors
- [ ] Add `slug` property to AgentData type
- [ ] Make `configuration` non-optional or add null checks
- [ ] Add `capabilities.filter` method to type definition
- **Files:** `/workspaces/agent-feed/frontend/src/types/api.ts`

#### 1.6 Fix Comment Type Errors  
- [ ] Add `likesCount` to Comment interface
- [ ] Update comment utilities to use correct property names
- **Files:** `/workspaces/agent-feed/frontend/src/utils/commentUtils.tsx`

#### Verification:
```bash
npm run typecheck
# Should show: 0 errors
```

---

### Task 2: Verify Production Build (30 minutes)

**Status:** 🟡 Depends on Task 1

- [ ] Run `npm run build`
- [ ] Verify build succeeds
- [ ] Check bundle size (should be reasonable)
- [ ] Verify no warnings in build output

#### Verification:
```bash
npm run build
# Should complete successfully
# Check dist/ folder exists
ls -lh dist/
```

---

## 🟡 HIGH PRIORITY - Day 1 Afternoon (4-6 hours)

### Task 3: Fix E2E Test Selectors (2-3 hours)

**Status:** 🟡 Should complete Day 1

#### 3.1 Update Feed Post Card Selectors
- [ ] Review actual DOM structure of post cards
- [ ] Add `data-testid="post-card"` to post components
- [ ] Update test selectors in `dark-mode-phase2-visual.spec.ts`
- **Files:** 
  - `/workspaces/agent-feed/frontend/src/components/Post.tsx` (or similar)
  - `/workspaces/agent-feed/frontend/tests/e2e/accessibility/dark-mode-phase2-visual.spec.ts`

#### 3.2 Update Draft Card Selectors
- [ ] Add `data-testid="draft-card"` to draft components
- [ ] Update test selectors
- **Files:** `/workspaces/agent-feed/frontend/src/components/DraftCard.tsx` (or similar)

#### 3.3 Update Agent Card Selectors
- [ ] Add `data-testid="agent-card"` to agent components
- [ ] Update test selectors
- **Files:** `/workspaces/agent-feed/frontend/src/components/AgentCard.tsx` (or similar)

#### 3.4 Add Proper Wait Conditions
- [ ] Add `waitForSelector` for dynamic content
- [ ] Increase timeout for slow-loading components
- [ ] Add retry logic where appropriate

#### Verification:
```bash
npx playwright test tests/e2e/accessibility/dark-mode-phase2-visual.spec.ts
# Should show: 13/13 passed
```

---

### Task 4: Manual Dark Mode Verification (1-2 hours)

**Status:** 🟢 Can do in parallel

- [ ] Start dev server: `npm run dev`
- [ ] Test dark mode toggle in browser
- [ ] Verify all pages:
  - [ ] Feed page (`/`)
  - [ ] Drafts page (`/drafts`)
  - [ ] Agents page (`/agents`)
  - [ ] Individual agent pages
- [ ] Check all components:
  - [ ] Post cards
  - [ ] Draft cards
  - [ ] Agent cards
  - [ ] Search inputs
  - [ ] Activity cards
  - [ ] Charts/graphs
- [ ] Take screenshots for documentation
- [ ] Note any visual issues

#### Checklist per Component:
- [ ] Background color is dark (not white)
- [ ] Text color has sufficient contrast
- [ ] Borders are visible
- [ ] Icons are visible
- [ ] Hover states work correctly

---

## 🟢 MEDIUM PRIORITY - Day 2 (4-6 hours)

### Task 5: Fix Unit Test Infrastructure (2-3 hours)

**Status:** 🟢 Important but not blocking

#### 5.1 Fix SSE Connection Test Cleanup
- [ ] Add proper cleanup in test teardown
- [ ] Mock connection timeouts properly
- [ ] Prevent infinite retry loops
- **Files:** `/workspaces/agent-feed/frontend/src/hooks/useAdvancedSSEConnection.ts`

#### 5.2 Add Test Timeouts
- [ ] Set reasonable timeouts for connection tests
- [ ] Use `vi.useFakeTimers()` for time-dependent tests
- [ ] Add cleanup for all timers

#### Verification:
```bash
npm test -- --run --reporter=verbose
# Should complete without timeout
```

---

### Task 6: Fix ESLint Configuration (30 minutes)

**Status:** 🟢 Quick fix

- [ ] Update package.json lint script
- [ ] Remove `--ext` flag
- [ ] Test eslint runs successfully

#### Change:
```json
// package.json
"lint": "eslint . --report-unused-disable-directives --max-warnings 0"
```

#### Verification:
```bash
npm run lint
# Should complete without config errors
```

---

### Task 7: Run Full Regression Suite (1-2 hours)

**Status:** 🟢 Final validation

- [ ] Run all Playwright tests
- [ ] Run all unit tests
- [ ] Run type checking
- [ ] Run linting
- [ ] Document any new failures

#### Commands:
```bash
npm run typecheck
npm run lint  
npm test -- --run
npx playwright test
```

---

## 🔵 LOW PRIORITY - Day 3 (Optional)

### Task 8: Test Coverage Report (1 hour)

- [ ] Generate coverage report: `npm test -- --coverage`
- [ ] Review coverage metrics
- [ ] Identify gaps
- [ ] Document findings

### Task 9: Performance Testing (1-2 hours)

- [ ] Measure dark mode toggle performance
- [ ] Check bundle size impact
- [ ] Run Lighthouse audit
- [ ] Document metrics

### Task 10: Accessibility Audit (1-2 hours)

- [ ] Run axe-core tests
- [ ] Check color contrast ratios (WCAG AA)
- [ ] Test keyboard navigation
- [ ] Test screen reader compatibility
- [ ] Document issues

### Task 11: Documentation (1 hour)

- [ ] Document dark mode implementation
- [ ] Update component guidelines
- [ ] Create testing procedures
- [ ] Update README if needed

---

## Success Criteria

### Minimum for Production (Must Have):
- ✅ TypeScript: 0 compilation errors
- ✅ Build: Succeeds without errors
- ✅ E2E Visual Tests: 13/13 passing (100%)
- ✅ Manual QA: All pages verified working in dark mode

### Nice to Have:
- ✅ Unit Tests: All passing without timeout
- ✅ ESLint: Running and passing
- ✅ E2E Full Suite: All dark mode tests passing
- ✅ Coverage: >80% for modified files

### Production Ready Checklist:
- [ ] All TypeScript errors fixed
- [ ] Production build succeeds
- [ ] All E2E dark mode tests passing
- [ ] Manual QA sign-off
- [ ] No console errors in dark mode
- [ ] Performance acceptable
- [ ] Accessibility standards met

---

## Quick Reference Commands

```bash
# Check TypeScript errors
npm run typecheck

# Build for production
npm run build

# Run dark mode E2E tests
npx playwright test tests/e2e/accessibility/dark-mode-phase2-visual.spec.ts

# Run all tests
npm test -- --run && npm run typecheck && npx playwright test

# Start dev server for manual testing
npm run dev

# Generate test coverage
npm test -- --coverage

# Check bundle size
npm run build && ls -lh dist/
```

---

## Contact for Help

If you get stuck on any task:
1. Check the detailed test report: `DARK_MODE_PHASE2_TEST_REPORT.md`
2. Review error logs in test output
3. Check TypeScript error messages for specific line numbers
4. Test manually in browser to see actual behavior

---

**Last Updated:** $(date)  
**Status:** Work In Progress  
**Next Review:** After completing Day 1 tasks

