# SPARC Specification: Search Input Repositioning

**Date**: 2025-10-04
**Status**: Draft
**Priority**: Medium
**Methodology**: SPARC + NLD + TDD

---

## Problem Statement

### Current State
The search functionality in the Social Media Feed component requires clicking a search icon to toggle visibility of a separate search input container below the header. This creates:
- Extra click required to search
- Search input appears/disappears, causing layout shift
- Wasted vertical space when search is hidden
- Non-intuitive UX (users don't know search exists until they click icon)

**Current Layout**:
```
[Feed Header Container]
  Row 1: Title/Desc | [Refresh] [Filter▼] [Sort▼] [🔍] [Status]

[Search Container] (conditionally shown when search icon clicked)
  [🔍 Search posts by title, content, or author...]
```

**Location**: `frontend/src/components/SocialMediaFeed.tsx`
- Lines 520-602: Header layout
- Lines 604-621: Separate search container

### Desired State
Move the search input to always be visible within the feed header, positioned below the refresh button and inline with the filter dropdown. This ensures:
- Search always visible (no toggle required)
- Better space utilization
- More intuitive UX
- Consistent layout (no shift)
- Search and filter controls grouped together logically

**Desired Layout**:
```
[Feed Header Container]
  Row 1: Title/Desc                    | [Refresh]
  Row 2: [🔍 Search posts...]          | [Filter▼] [Sort▼] [Status]
```

---

## Root Cause Analysis

1. **Toggle Button Pattern**: Search uses toggle button (line 570-578) instead of always-visible input
2. **Separate Container**: Search input in separate conditional container (lines 604-621)
3. **State Management**: `showSearch` state (line 100) controls visibility
4. **Nested Flex Layout**: Controls are deeply nested making repositioning complex

---

## Solution Approach

### Option A: Two-Row Layout with Integrated Search (SELECTED)

**Implementation**:
1. Restructure header into 2 distinct rows using flex column
2. Row 1: Title/Description (left) + Refresh button (right)
3. Row 2: Search input (left, ~60% width) + Filter/Sort/Status (right, ~40% width)
4. Remove search toggle button and `showSearch` state
5. Remove separate search container
6. Search always visible

**Pros**:
- Clear visual hierarchy
- Search prominently visible
- Filter controls grouped together
- Maintains all functionality
- Better UX (no hidden features)

**Cons**:
- Takes more vertical space (minimal - only ~40px)
- Slight learning curve for existing users

### Option B: Keep Current Layout with Always-Visible Search

**Pros**:
- Minimal changes

**Cons**:
- Still uses separate container
- Less intuitive grouping
- More vertical space

**Decision**: Option A selected for better UX and logical grouping

---

## Success Criteria

### Functional Requirements
1. ✅ Search input always visible (no toggle)
2. ✅ Search positioned on Row 2, left side
3. ✅ Filter/Sort controls positioned on Row 2, right side, inline with search
4. ✅ Refresh button remains on Row 1, right side
5. ✅ Title/Description remains on Row 1, left side
6. ✅ All search functionality works (debounce, loading state, results)
7. ✅ All filter/sort functionality works
8. ✅ Connection status and LiveActivityIndicator still visible

### Visual Requirements
1. ✅ Proper alignment between rows
2. ✅ Consistent spacing (4-6px gaps)
3. ✅ Search input width ~60-70% of container
4. ✅ Filter controls don't wrap on desktop (min-width: 768px)
5. ✅ Responsive on mobile (stack if needed)
6. ✅ No layout shift or CLS issues
7. ✅ Maintains current color scheme and styling

### Technical Requirements
1. ✅ No breaking changes to search/filter logic
2. ✅ All existing tests continue to pass
3. ✅ New tests validate layout structure
4. ✅ No console errors or warnings
5. ✅ 100% real functionality (no mocks or simulations)
6. ✅ Accessibility maintained (labels, ARIA, keyboard nav)

---

## Test Plan

### Unit Tests
**File**: `frontend/src/tests/components/SocialMediaFeed.test.tsx` (create or update)

1. Test search input is rendered without toggle
2. Test search input is always visible
3. Test search toggle button is NOT rendered
4. Test Row 1 contains title and refresh button
5. Test Row 2 contains search input and filter controls
6. Test search input has correct placeholder text
7. Test filter/sort dropdowns are rendered in Row 2

### Integration Tests
**File**: `frontend/src/tests/integration/search-input-layout.test.tsx` (new)

1. Test search input renders on mount (no interaction needed)
2. Test typing in search input triggers debounced search
3. Test filter dropdown works alongside search
4. Test sort dropdown works alongside search
5. Test search and filter work together (combined query)
6. Test layout remains stable during search operations
7. Test responsive layout on different viewport sizes

### E2E Tests
**File**: `frontend/tests/e2e/core-features/search-input-layout.spec.ts` (new)

1. Capture screenshot of new layout on desktop (1920x1080)
2. Capture screenshot of new layout on mobile (375x667)
3. Capture screenshot of new layout on tablet (768x1024)
4. Test search input is visible on page load
5. Test search input accepts text and shows results
6. Test filter controls are inline with search
7. Measure element positions (Row 1 vs Row 2 alignment)
8. Test no horizontal scroll on any viewport

---

## Implementation Steps

### Phase 1: Specification (CURRENT)
- [x] Define problem and desired state
- [x] Root cause analysis
- [x] Select solution approach
- [x] Define success criteria
- [x] Create test plan

### Phase 2: Pseudocode
- [ ] Detailed pseudocode for layout restructure
- [ ] Detailed pseudocode for state cleanup
- [ ] Detailed pseudocode for unit tests
- [ ] Detailed pseudocode for integration tests
- [ ] Detailed pseudocode for E2E tests

### Phase 3: Implementation (Concurrent Agents)
- [ ] Agent 1: Restructure layout + Unit tests
- [ ] Agent 2: Integration tests
- [ ] Agent 3: E2E tests + Screenshots

### Phase 4: Validation
- [ ] All tests passing
- [ ] Screenshots captured and validated
- [ ] Visual validation complete
- [ ] No regressions

### Phase 5: Completion
- [ ] Final validation report
- [ ] Documentation updated
- [ ] Production ready

---

## Risk Assessment

### Low Risk
- ✅ Layout-only change (no logic modifications)
- ✅ Well-understood change (simple restructure)
- ✅ Easy to rollback
- ✅ No API changes
- ✅ No state management complexity

### Potential Issues
1. **Mobile responsiveness**: May need to stack on small screens
   - **Mitigation**: Use Tailwind responsive classes (md:, lg:)

2. **Existing users expecting search icon**: Behavior change
   - **Mitigation**: Search is more discoverable now (better UX)

3. **Vertical space increase**: Takes more header space
   - **Mitigation**: Minimal increase (~40px), better UX trade-off

---

## Dependencies

### Code Dependencies
- `frontend/src/components/SocialMediaFeed.tsx` (primary change)
- Tailwind CSS (layout classes)
- React state management (remove `showSearch`)

### Test Dependencies
- Vitest (unit and integration tests)
- Playwright (E2E tests)
- React Testing Library
- Frontend dev server (port 5173)

---

## Files to Modify

### Modified Files
1. `frontend/src/components/SocialMediaFeed.tsx`
   - Lines 100: Remove `showSearch` state
   - Lines 520-602: Restructure header into 2 rows
   - Lines 570-578: Remove search toggle button
   - Lines 604-621: Remove separate search container

### Created Files
1. `SEARCH_INPUT_REPOSITION_SPEC.md` (this file)
2. `SEARCH_INPUT_REPOSITION_PSEUDOCODE.md`
3. `frontend/src/tests/components/SocialMediaFeed.test.tsx` (unit tests)
4. `frontend/src/tests/integration/search-input-layout.test.tsx` (integration tests)
5. `frontend/tests/e2e/core-features/search-input-layout.spec.ts` (E2E tests)
6. `SEARCH_INPUT_REPOSITION_FINAL_VALIDATION_REPORT.md`

---

## Rollback Plan

If issues are discovered:

1. **Immediate Rollback**:
   - Revert `SocialMediaFeed.tsx` changes
   - Restore search toggle button
   - Restore `showSearch` state
   - Restore separate search container

2. **Verification**:
   - Run existing test suite
   - Confirm app returns to previous state

---

## Acceptance Criteria

- [ ] Layout restructured into 2 rows
- [ ] Search input always visible in Row 2 (left)
- [ ] Filter/Sort in Row 2 (right, inline)
- [ ] Search toggle button removed
- [ ] `showSearch` state removed
- [ ] Separate search container removed
- [ ] Unit tests created and passing (7+ tests)
- [ ] Integration tests created and passing (7+ tests)
- [ ] E2E tests created and passing (8+ tests)
- [ ] Screenshots captured (3 viewports)
- [ ] Element position measurements validated
- [ ] No horizontal scroll on any viewport
- [ ] All existing tests still passing
- [ ] No console errors
- [ ] Final validation report generated

---

**SPARC Phase**: Specification ✅
**Next Phase**: Pseudocode
**Estimated Effort**: 2-3 hours (with concurrent agents)
**Complexity**: Low-Medium
**Confidence**: High
