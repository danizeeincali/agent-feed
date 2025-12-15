# Test Files Requiring Updates - System Analytics Removal

**Date**: October 3, 2025
**Related**: System Analytics tab removal from Analytics Dashboard

---

## Overview

The following **10 test files** contain references to "System Analytics" or "system tab" and require updates to reflect the new 2-tab analytics structure.

---

## Test Files List

### 1. `/workspaces/agent-feed/frontend/src/tests/production-validation/RealComponentTests.test.tsx`

**Likely Issues**:
- Tests System Analytics component rendering
- Assertions for system tab existence

**Required Changes**:
```diff
- expect(screen.getByText('System Analytics')).toBeInTheDocument();
+ expect(screen.getByText('Claude SDK Analytics')).toBeInTheDocument();

- expect(tabs).toHaveLength(3);
+ expect(tabs).toHaveLength(2);
```

**Priority**: 🔴 HIGH

---

### 2. `/workspaces/agent-feed/frontend/src/tests/integration/RealAnalytics.whitescreenprevention.integration.test.tsx`

**Likely Issues**:
- White screen prevention tests for system tab
- Loading state tests for SystemAnalytics component

**Required Changes**:
- Remove system tab test cases
- Update assertions to focus on claude-sdk and performance tabs

**Priority**: 🟡 MEDIUM

---

### 3. `/workspaces/agent-feed/frontend/src/tests/integration/tab-navigation.test.tsx`

**Likely Issues**:
- Tab switching tests including "system" tab
- Tab count assertions
- Navigation flow tests

**Required Changes**:
```diff
- const tabs = ['system', 'claude-sdk', 'performance'];
+ const tabs = ['claude-sdk', 'performance'];

- fireEvent.click(screen.getByText('System Analytics'));
- expect(screen.getByTestId('system-analytics')).toBeVisible();
+ // Remove system tab navigation tests
```

**Priority**: 🔴 HIGH

---

### 4. `/workspaces/agent-feed/frontend/src/tests/integration/ClaudeSDKAnalytics.full-validation.test.tsx`

**Likely Issues**:
- May reference system tab in test context
- Tab comparison assertions

**Required Changes**:
- Verify and remove system tab references
- Update tab count if present

**Priority**: 🟢 LOW

---

### 5. `/workspaces/agent-feed/frontend/src/tests/integration/analytics-user-flow.integration.test.tsx`

**Likely Issues**:
- User flow testing through all analytics tabs
- Step-by-step navigation including system tab

**Required Changes**:
```diff
- it('should navigate through all analytics tabs', () => {
-   // Start on system tab
-   expect(screen.getByText('System Analytics')).toBeInTheDocument();
-
-   // Switch to Claude SDK tab
-   fireEvent.click(screen.getByText('Claude SDK Analytics'));
+ it('should navigate through all analytics tabs', () => {
+   // Start on claude-sdk tab (default)
+   expect(screen.getByText('Claude SDK Analytics')).toBeInTheDocument();
```

**Priority**: 🔴 HIGH

---

### 6. `/workspaces/agent-feed/frontend/src/tests/analytics/ClaudeSDKTabSimple.test.tsx`

**Likely Issues**:
- May compare behavior with system tab
- Tab isolation tests

**Required Changes**:
- Verify system tab references
- Update if comparison logic exists

**Priority**: 🟢 LOW

---

### 7. `/workspaces/agent-feed/frontend/src/tests/analytics/ClaudeSDKTab.test.tsx`

**Likely Issues**:
- Similar to ClaudeSDKTabSimple.test.tsx
- Tab context references

**Required Changes**:
- Verify and update system tab references

**Priority**: 🟢 LOW

---

### 8. `/workspaces/agent-feed/frontend/src/tests/regression/AllTabsFunctionality.regression.test.tsx`

**Likely Issues**:
- Tests all tabs functionality
- Tab array includes 'system'

**Required Changes**:
```diff
- const allTabs = ['system', 'claude-sdk', 'performance'];
+ const allTabs = ['claude-sdk', 'performance'];

- allTabs.forEach(tab => {
-   it(`should render ${tab} tab correctly`, () => {
+ allTabs.forEach(tab => {
+   it(`should render ${tab} tab correctly`, () => {
```

**Priority**: 🔴 HIGH

---

### 9. `/workspaces/agent-feed/frontend/src/tests/regression/analytics-lazy-loading.regression.test.tsx`

**Likely Issues**:
- Lazy loading tests for system tab
- Component mount timing tests

**Required Changes**:
- Remove system tab from lazy loading tests
- Update component loading assertions

**Priority**: 🟡 MEDIUM

---

### 10. `/workspaces/agent-feed/frontend/src/tests/contracts/ComponentCollaborations.contract.test.tsx`

**Likely Issues**:
- Contract tests for component interactions
- SystemAnalytics component collaboration tests

**Required Changes**:
- Update contracts to reflect 2-tab system
- Remove SystemAnalytics from component collaboration assertions

**Priority**: 🟡 MEDIUM

---

## Common Update Patterns

### Pattern 1: Tab Count Assertions
```diff
- expect(screen.getAllByRole('tab')).toHaveLength(3);
+ expect(screen.getAllByRole('tab')).toHaveLength(2);
```

### Pattern 2: Default Tab Expectations
```diff
- expect(getInitialTab()).toBe('system');
+ expect(getInitialTab()).toBe('claude-sdk');
```

### Pattern 3: Tab Existence Checks
```diff
- expect(screen.getByText('System Analytics')).toBeInTheDocument();
+ // Remove - system tab no longer exists
```

### Pattern 4: Tab Navigation Arrays
```diff
- const tabs = ['system', 'claude-sdk', 'performance'];
+ const tabs = ['claude-sdk', 'performance'];
```

### Pattern 5: Tab Switching Tests
```diff
- fireEvent.click(screen.getByText('System Analytics'));
- expect(screen.getByTestId('system-analytics')).toBeVisible();
+ // Remove - system tab no longer clickable
```

---

## Testing Strategy

### Step 1: Identify Failures
```bash
npm run test 2>&1 | tee test-failures.log
grep -i "system\|analytics" test-failures.log
```

### Step 2: Update Tests by Priority

1. **HIGH Priority** (Critical path tests):
   - RealComponentTests.test.tsx
   - tab-navigation.test.tsx
   - analytics-user-flow.integration.test.tsx
   - AllTabsFunctionality.regression.test.tsx

2. **MEDIUM Priority** (Integration tests):
   - RealAnalytics.whitescreenprevention.integration.test.tsx
   - analytics-lazy-loading.regression.test.tsx
   - ComponentCollaborations.contract.test.tsx

3. **LOW Priority** (Isolated component tests):
   - ClaudeSDKAnalytics.full-validation.test.tsx
   - ClaudeSDKTabSimple.test.tsx
   - ClaudeSDKTab.test.tsx

### Step 3: Run Tests After Each Update
```bash
# Test individual file
npm run test -- path/to/test-file.test.tsx

# Test all analytics tests
npm run test -- --grep="analytics"

# Full test suite
npm run test
```

---

## Expected Test Outcomes

### Before Updates:
- ❌ ~10-15 test failures related to system tab
- ❌ Tab count assertions fail
- ❌ Default tab assertions fail
- ❌ System tab navigation tests fail

### After Updates:
- ✅ All tab navigation tests pass with 2 tabs
- ✅ Default tab correctly set to claude-sdk
- ✅ No references to system tab
- ✅ All analytics integration tests pass

---

## Validation Checklist

After updating each test file:

- [ ] No references to 'system' tab remain
- [ ] Tab count assertions use `2` instead of `3`
- [ ] Default tab assertions expect `'claude-sdk'`
- [ ] Tab navigation arrays contain only `['claude-sdk', 'performance']`
- [ ] Test runs successfully with `npm run test -- <file-path>`
- [ ] No console errors or warnings
- [ ] Test coverage remains consistent

---

## Automation Script (Optional)

```bash
#!/bin/bash
# auto-fix-system-tab-tests.sh

# Find all test files with 'system' references
TEST_FILES=$(grep -rl "System Analytics\|'system'" frontend/src/tests/)

echo "Found ${#TEST_FILES[@]} test files with system tab references"

for file in $TEST_FILES; do
  echo "Processing: $file"

  # Replace common patterns (use with caution - review changes!)
  sed -i "s/'system', 'claude-sdk', 'performance'/'claude-sdk', 'performance'/g" "$file"
  sed -i "s/toHaveLength(3)/toHaveLength(2)/g" "$file"
  sed -i "s/getInitialTab()).toBe('system')/getInitialTab()).toBe('claude-sdk')/g" "$file"

  echo "✅ Updated: $file"
done

echo "⚠️  Review changes with: git diff frontend/src/tests/"
```

**Note**: Manual review is recommended after running automation scripts.

---

## Summary

- **Total Files**: 10 test files require updates
- **Priority Breakdown**: 4 HIGH, 3 MEDIUM, 3 LOW
- **Estimated Time**: 30-60 minutes (depending on test complexity)
- **Risk Level**: LOW (test-only changes, no production code affected)

---

## Next Steps

1. ✅ Run `npm run test` to identify actual failures
2. ⏳ Update HIGH priority test files first
3. ⏳ Run tests after each update to verify fixes
4. ⏳ Update MEDIUM and LOW priority tests
5. ⏳ Run full test suite to confirm all passing
6. ⏳ Document any unexpected issues or edge cases

---

**Document Created**: October 3, 2025
**Author**: Research Agent (Documentation Specialist)
**Related Documents**:
- `/workspaces/agent-feed/SYSTEM_ANALYTICS_REMOVAL_CHANGELOG.md`
- `/workspaces/agent-feed/SYSTEM_ANALYTICS_REMOVAL_SUMMARY.txt`
- `/workspaces/agent-feed/SYSTEM_ANALYTICS_REMOVAL_PLAN.md`
