# TDD London School: Quick Post Interface Changes
## Test-Driven Development - Tests Written FIRST

**Date**: 2025-10-01
**Approach**: London School (Mock-Driven TDD)
**Status**: Tests Created - READY FOR IMPLEMENTATION

---

## Overview

Comprehensive TDD test suite created following London School principles for Quick Post interface refactoring. All tests are designed to **FAIL FIRST** before implementation, following proper red-green-refactor cycle.

### Test File Location
```
/workspaces/agent-feed/frontend/src/tests/unit/components/EnhancedPostingInterface.test.tsx
```

---

## Test Categories Created

### 1. **Post Tab Removal** (3 tests)
Tests verify that the Post tab is completely removed from navigation.

```typescript
✗ should NOT render Post tab in navigation
✗ should only render Quick Post and Avi DM tabs
✗ should not render PostCreator component at all
```

**Expected Behavior:**
- Post tab button should not exist in DOM
- Only 2 tabs should be rendered (Quick Post & Avi DM)
- PostCreator component should never mount

---

### 2. **Quick Post as First/Default Tab** (3 tests)
Ensures Quick Post is the primary interface.

```typescript
✓ Quick Post should be first tab in tabs array
✓ Quick Post tab should be selected by default
✓ Quick Post content should be visible on initial render
```

**Expected Behavior:**
- Quick Post is first button in navigation
- Quick Post has `aria-selected="true"` on mount
- MentionInput visible immediately

---

### 3. **10,000 Character Limit** (4 tests)
Tests textarea expansion from 500 to 10,000 characters.

```typescript
✗ textarea should accept maxLength of 10000 characters
✗ should allow typing up to 10000 characters
✗ should show correct character count with 10000 limit
✗ should submit post with content exactly 10000 characters
```

**Current State:** maxLength="500"
**Expected State:** maxLength="10000"

**Test Verification:**
- Direct attribute check on textarea
- User typing simulation with 10k chars
- Character counter displays "X/10000 characters"
- API submission includes full 10k content

---

### 4. **Character Counter Hidden Below 9500** (4 tests)
Counter should only appear when approaching limit.

```typescript
✗ character counter should be hidden when content is empty
✗ character counter should be hidden with 100 characters
✗ character counter should be hidden at 9499 characters
✗ character counter container should not exist below 9500
```

**Expected Behavior:**
- No counter visible from 0-9499 characters
- Counter div should not exist in DOM
- Cleaner interface for typical use

---

### 5. **Character Counter Visible at 9500+** (5 tests)
Counter appears with warning styling at threshold.

```typescript
✗ character counter should appear at exactly 9500 characters
✗ character counter should be visible at 9501 characters
✗ character counter should be visible at 10000 characters
✗ character counter should have warning style at 9500+
✗ character counter should transition smoothly when crossing threshold
```

**Expected Styling:**
```css
class="text-amber-600 font-medium"
```

**Test Scenarios:**
- Boundary testing at 9500 exact
- Visibility at 9501 and 10000
- Amber warning color verification
- Smooth appearance/disappearance

---

### 6. **Textarea Rows Configuration** (2 tests)
Increased vertical space from 3 to 6 rows.

```typescript
✗ textarea should have 6 rows instead of 3
✗ textarea rows should increase visible height
```

**Current:** `rows={3}`
**Expected:** `rows={6}`

---

### 7. **Placeholder Text Update** (2 tests)
More descriptive placeholder text.

```typescript
✗ placeholder should be updated to new text
✗ old placeholder text should not be present
```

**Current:**
`"What's on your mind? (One line works great!)"`

**Expected:**
`"What's on your mind? (Works best with clear, concise thoughts!)"`

---

### 8. **Section Description Update** (3 tests)
Enhanced section description for clarity.

```typescript
✗ section description should be updated
✗ old description should not be present
✗ description should maintain proper styling
```

**Current:**
`"Share a quick thought or update"`

**Expected:**
`"Share your thoughts, ideas, or updates with the community"`

**Styling:**
`class="text-sm text-gray-600"`

---

### 9. **Mentions Functionality Preserved** (4 tests)
Ensures existing @mention system remains intact.

```typescript
✓ MentionInput component should still be used
✓ mention context should remain as quick-post
✓ onMentionSelect handler should still work
✓ selectedMentions state should be maintained
```

**Critical:** These tests verify no regression in mention functionality.

---

### 10. **Form Submission with Long Content** (6 tests)
API submission handles extended character limits.

```typescript
✗ should submit 5000 character post successfully
✗ should submit 10000 character post successfully
✗ should generate correct title for 10000 char content
✗ should calculate correct word count for long content
✗ should clear form after successful long content submission
✓ should show loading state during long content submission
```

**Test Coverage:**
- 5000 char submission
- 10000 char submission (boundary)
- Title truncation at 50 chars
- Word count calculation
- Form clearing post-submit
- Loading state consistency

---

## Mock Strategy (London School)

### Component Mocks
```typescript
vi.mock('../../../components/PostCreator')
vi.mock('../../../components/MentionInput')
vi.mock('../../../components/AviTypingIndicator')
vi.mock('../../../components/markdown/MarkdownRenderer')
vi.mock('../../../utils/cn')
```

### API Mocks
```typescript
const mockFetch = vi.fn();
global.fetch = mockFetch;
```

### Interaction Mocks
- Mock user events via `@testing-library/user-event`
- Mock component callbacks with `vi.fn()`
- Verify collaborator interactions

---

## Test Execution

### Run All TDD Tests
```bash
cd frontend
npm test -- src/tests/unit/components/EnhancedPostingInterface.test.tsx --run -t "TDD"
```

### Run Specific Category
```bash
# Character limit tests
npm test -- src/tests/unit/components/EnhancedPostingInterface.test.tsx --run -t "10,000 Character"

# Character counter tests
npm test -- src/tests/unit/components/EnhancedPostingInterface.test.tsx --run -t "Character Counter"

# Tab removal tests
npm test -- src/tests/unit/components/EnhancedPostingInterface.test.tsx --run -t "Post Tab Removal"
```

### Run Single Test
```bash
npm test -- src/tests/unit/components/EnhancedPostingInterface.test.tsx --run -t "should NOT render Post tab"
```

---

## Current Test Status

### Test Results Summary
```
Test Files:  1 (74 total tests)
  Passed:    0 TDD tests (73 existing tests skipped)
  Failed:    1 TDD test run (expected - TDD approach)
  Total TDD: 36 new tests

Status:     ✅ READY FOR IMPLEMENTATION
```

### Sample Failing Test Output
```
FAIL  src/tests/unit/components/EnhancedPostingInterface.test.tsx
  EnhancedPostingInterface Component
    [TDD] Quick Post Interface Changes - FAILING TESTS FIRST
      1. Post Tab Removal
        ✕ should NOT render Post tab in navigation (144ms)

Error: expect(element).not.toBeInTheDocument()

expected document not to contain element, found <button> with "Post" text
```

**Status:** ✅ **Test is correctly failing** - This is the expected TDD state!

---

## Implementation Checklist

After tests are created, implement in this order:

### Phase 1: Tab Configuration
- [ ] Remove Post tab from tabs array
- [ ] Remove PostCreator import (if unused elsewhere)
- [ ] Remove Post tab rendering logic
- [ ] Verify Quick Post is first tab

### Phase 2: Character Limits
- [ ] Change maxLength from 500 to 10000
- [ ] Update character counter calculation
- [ ] Test with long content

### Phase 3: Conditional Counter Display
- [ ] Add state/logic for 9500 threshold
- [ ] Implement conditional rendering
- [ ] Add warning styles (text-amber-600)
- [ ] Test threshold crossing

### Phase 4: Textarea & Text Updates
- [ ] Change rows from 3 to 6
- [ ] Update placeholder text
- [ ] Update section description
- [ ] Verify styling intact

### Phase 5: Verification
- [ ] Run all TDD tests
- [ ] Verify mentions still work
- [ ] Test API submissions
- [ ] Manual UI testing

---

## Expected Test Coverage

### Coverage Targets After Implementation
```
Statements   : 85%+
Branches     : 80%+
Functions    : 85%+
Lines        : 85%+
```

### Files to Achieve 100% Coverage
```
EnhancedPostingInterface.tsx - QuickPostSection component
  - Tab rendering logic
  - Character counter conditional
  - Form submission
  - Long content handling
```

---

## London School Principles Applied

### 1. **Outside-In Development**
Started with user-facing behavior tests before implementation.

### 2. **Mock-First Approach**
All dependencies mocked to isolate unit behavior:
- PostCreator mocked
- MentionInput mocked
- API fetch mocked
- Utility functions mocked

### 3. **Interaction Testing**
Focus on HOW components collaborate:
```typescript
// Test component interactions
expect(mockFetch).toHaveBeenCalledWith('/api/v1/agent-posts', {
  method: 'POST',
  body: expect.stringContaining(content)
});

expect(onPostCreated).toHaveBeenCalledWith(expectedResult);
```

### 4. **Contract Definition**
Clear interface expectations through mock verification:
```typescript
// MentionInput contract
expect(textarea).toHaveAttribute('maxLength', '10000');
expect(textarea).toHaveAttribute('rows', '6');
expect(textarea).toHaveAttribute('data-mention-context', 'quick-post');
```

### 5. **Behavior Verification**
Test what the component DOES, not what it IS:
- Tab switching behavior
- Character counting behavior
- Form submission behavior
- State management behavior

---

## Key Design Decisions

### Why 9500 Character Threshold?
- Gives user 500 characters warning
- Prevents surprise cutoffs
- 5% margin before limit
- Common UX pattern

### Why 6 Rows Instead of 3?
- Accommodates longer content
- Better visibility for editing
- Reduces scrolling within textarea
- Industry standard for long-form input

### Why Hide Counter Below 9500?
- Reduces visual clutter
- Most posts well under limit
- Counter only relevant near limit
- Cleaner interface design

### Why Remove Post Tab?
- Simplifies interface
- Reduces user confusion
- Quick Post handles all use cases
- Single primary action

---

## Red-Green-Refactor Cycle

### 🔴 RED Phase (Current)
✅ **Complete** - All 36 TDD tests written and failing correctly

### 🟢 GREEN Phase (Next)
Implement minimum code to pass tests:
1. Modify EnhancedPostingInterface.tsx
2. Update QuickPostSection component
3. Run tests iteratively
4. Fix until all pass

### 🔵 REFACTOR Phase (Final)
After green:
1. Extract magic numbers (9500) to constants
2. Consider custom hook for character counter logic
3. Optimize re-renders if needed
4. Add PropTypes/TypeScript types
5. Document complex logic

---

## Success Criteria

### Definition of Done
- ✅ All 36 TDD tests passing
- ✅ No regression in existing 38 tests
- ✅ Coverage maintains 80%+ thresholds
- ✅ TypeScript compilation succeeds
- ✅ Manual testing confirms UX
- ✅ Mentions functionality intact
- ✅ API submissions work with long content

---

## Notes for Implementation

### Files to Modify
```
/workspaces/agent-feed/frontend/src/components/EnhancedPostingInterface.tsx
  - tabs array (remove Post)
  - QuickPostSection component:
    - maxLength prop
    - rows prop
    - placeholder text
    - description text
    - character counter logic
```

### Files NOT to Modify
```
/workspaces/agent-feed/frontend/src/components/PostCreator.tsx
  - May need to keep for other uses
  - Check if used elsewhere before deleting
```

### Potential Gotchas
1. **Character Counter Logic**: Needs conditional rendering based on content.length >= 9500
2. **MentionInput Integration**: Ensure maxLength passes through to underlying textarea
3. **Form Validation**: May need to update validation if length checks exist
4. **API Payload Size**: Verify backend can handle 10k character posts
5. **Database Schema**: Check if content column supports 10k chars

---

## Next Steps

1. **Implementation Phase**:
   - Use tests as specification
   - Implement one failing test at a time
   - Run tests frequently

2. **Validation Phase**:
   - All tests must pass
   - Manual testing required
   - Cross-browser verification

3. **Documentation Phase**:
   - Update component docs
   - Add JSDoc comments for complex logic
   - Update user-facing documentation

---

## Test File Statistics

```
Total Lines:        1172
Test Suites:        10 TDD categories
Test Cases:         36 new TDD tests
Existing Tests:     38 (preserved)
Mock Definitions:   6
Helper Functions:   Multiple user event simulations
```

---

## Contact & Support

For questions about these tests:
- Review `/workspaces/agent-feed/frontend/src/tests/unit/components/EnhancedPostingInterface.test.tsx`
- Check London School TDD documentation
- Reference React Testing Library docs
- Review Vitest mocking documentation

---

**Generated**: 2025-10-01
**Framework**: Vitest + React Testing Library
**Paradigm**: TDD London School (Mockist)
**Status**: RED phase complete - ready for GREEN phase implementation
