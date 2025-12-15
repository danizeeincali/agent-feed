# Processing Pill Visibility Test Suite - Quick Reference

**Status**: ✅ TDD RED Phase Complete
**Test File**: `/workspaces/agent-feed/frontend/src/components/__tests__/RealSocialMediaFeed.processingPill.test.tsx`
**Tests Created**: 13
**Current Result**: All 12 tests failing (as expected for RED phase)

---

## Test Suite Summary

### Test Counts by Category

| Category | Tests | Priority |
|----------|-------|----------|
| Core Functionality | 3 | HIGH |
| UI Feedback | 2 | HIGH |
| Multi-Post Handling | 1 | MEDIUM |
| Error Handling | 1 | HIGH |
| Performance & Timing | 1 | MEDIUM |
| User Interaction | 1 | MEDIUM |
| Backward Compatibility | 1 | LOW |
| Edge Cases | 2 | MEDIUM |
| **TOTAL** | **13** | - |

---

## Running the Tests

### Full Suite
```bash
cd /workspaces/agent-feed/frontend
npm test -- RealSocialMediaFeed.processingPill.test.tsx
```

### Single Test
```bash
npm test -- RealSocialMediaFeed.processingPill.test.tsx -t "should show processing state"
```

### With Coverage
```bash
npm test -- RealSocialMediaFeed.processingPill.test.tsx --coverage
```

---

## Current Test Status

### ❌ RED Phase (Current)
All 13 tests are failing as expected. Common failure reasons:
- Processing state not implemented in button
- Form closes immediately on submit
- Textarea not disabled during processing
- No validation for empty comments
- No debouncing logic

### Next: GREEN Phase
Implement these features to make tests pass:

1. **Add Processing State Management**
   ```typescript
   const [processingComments, setProcessingComments] = useState<Map<string, boolean>>(new Map());
   ```

2. **Update Submit Button**
   ```tsx
   <Button disabled={isProcessing}>
     {isProcessing ? (
       <>
         <Loader2 className="animate-spin" />
         Adding Comment...
       </>
     ) : 'Add Comment'}
   </Button>
   ```

3. **Disable Textarea During Processing**
   ```tsx
   <Textarea
     disabled={isProcessing}
     // ... other props
   />
   ```

4. **Prevent Form Closure**
   ```typescript
   // Don't close form until API completes
   if (!isProcessing) {
     setShowCommentForm(false);
   }
   ```

5. **Add Empty Validation**
   ```typescript
   if (!newComment.trim()) return;
   ```

---

## Test Structure

Each test follows the **Arrange-Act-Assert** pattern:

```typescript
it('test name', async () => {
  // ARRANGE
  renderWithProviders(<RealSocialMediaFeed />);
  await waitFor(() => expect(screen.queryByText(/loading/i)).not.toBeInTheDocument());

  // ACT
  const commentButton = screen.getAllByText(/comment/i)[0];
  await user.click(commentButton);

  // ASSERT
  expect(screen.getByText(/adding comment/i)).toBeInTheDocument();
});
```

---

## Key Test Features

### 1. Provider Wrapping
All tests wrap component with necessary providers:
```typescript
<QueryClientProvider client={queryClient}>
  <UserProvider defaultUserId="test-user-123">
    <RealSocialMediaFeed />
  </UserProvider>
</QueryClientProvider>
```

### 2. API Mocking
```typescript
const mockApiService = {
  on: vi.fn(),
  off: vi.fn(),
  getPosts: vi.fn(() => Promise.resolve({...})),
  getFilterData: vi.fn(() => Promise.resolve({...}))
};
```

### 3. Fetch Mocking
```typescript
mockFetch = vi.fn(() =>
  Promise.resolve({
    ok: true,
    json: () => Promise.resolve({ /* comment data */ })
  })
);
global.fetch = mockFetch;
```

---

## Test Scenarios

### ✅ Core Tests (Must Pass)

1. **Processing State Visibility**
   - Verifies "Adding Comment..." text appears
   - Checks textarea is disabled
   - Ensures form stays open

2. **Form Persistence**
   - Form doesn't close during API call
   - Closes only after success

3. **Button Loading State**
   - Button text changes
   - Spinner icon appears
   - Button is disabled

4. **Textarea Disabled**
   - Cannot edit during processing
   - Value unchanged

5. **Success Flow**
   - Form closes after success
   - Comment appears in feed

---

### 📊 Advanced Tests

6. **Multi-Post Independence**
   - Each post has independent processing state

7. **Error Recovery**
   - Processing state clears on error
   - Form stays open for retry
   - Inputs re-enabled

8. **Timing Accuracy**
   - Processing visible entire duration
   - State removed after completion

9. **Duplicate Prevention**
   - Prevents re-submission during processing
   - Debounces rapid clicks

10. **Regression: Blue Pill**
    - Original processing pill still works

11. **Rapid Clicking**
    - Only one API call despite multiple clicks

12. **Empty Comment Prevention**
    - No API call for empty/whitespace

---

## Implementation Checklist

When implementing the fix, complete these tasks:

### State Management
- [ ] Add `processingComments` Map state
- [ ] Track processing per post ID
- [ ] Clear processing state on completion/error

### UI Updates
- [ ] Update button text when processing
- [ ] Show Loader2 spinner in button
- [ ] Disable button during processing
- [ ] Disable textarea during processing
- [ ] Keep form open during processing

### Logic
- [ ] Validate non-empty comments
- [ ] Debounce submit clicks
- [ ] Prevent duplicate API calls
- [ ] Handle errors gracefully
- [ ] Close form only on success

### Multi-Post Support
- [ ] Per-post processing state (not global)
- [ ] Independent forms on different posts

---

## Expected Test Output After Implementation

### GREEN Phase (Target)
```
 PASS  src/components/__tests__/RealSocialMediaFeed.processingPill.test.tsx
  RealSocialMediaFeed - Processing Pill Visibility
    ✓ should show processing state when comment is submitted (45ms)
    ✓ should keep comment form open while processing (38ms)
    ✓ should show spinner in button during processing (42ms)
    ✓ should disable textarea while comment is processing (35ms)
    ✓ should close form after comment posts successfully (50ms)
    ✓ should handle multiple posts with independent processing states (55ms)
    ✓ should clear processing state if API fails (40ms)
    ✓ should show processing state for entire API call duration (520ms)
    ✓ should prevent form submission while processing (45ms)
    ✓ should still show the blue processing pill below form as fallback (38ms)
    ✓ should debounce rapid sequential submission attempts (42ms)
    ✓ should not show processing state for empty comment submission (30ms)

Test Suites: 1 passed, 1 total
Tests:       13 passed, 13 total
Time:        2.5s
```

---

## Files Involved

### Test Files
- `/workspaces/agent-feed/frontend/src/components/__tests__/RealSocialMediaFeed.processingPill.test.tsx`

### Component Files
- `/workspaces/agent-feed/frontend/src/components/RealSocialMediaFeed.tsx` (to be updated)

### Documentation
- `/workspaces/agent-feed/docs/TDD-PROCESSING-PILL-TEST-SUITE.md` (detailed)
- `/workspaces/agent-feed/docs/TDD-PROCESSING-PILL-QUICK-REFERENCE.md` (this file)

---

## Troubleshooting

### Tests Not Running
```bash
# Clear cache
npm test -- --clearCache

# Reinstall
rm -rf node_modules package-lock.json
npm install
```

### Provider Errors
Make sure test uses `renderWithProviders()` not `render()`

### Timeout Issues
Increase timeout for slow API tests:
```typescript
await waitFor(() => {
  // assertions
}, { timeout: 2000 });
```

---

## Next Steps

1. ✅ Tests created (RED phase complete)
2. ⏳ Implement features (GREEN phase)
3. ⏳ Refactor code (REFACTOR phase)
4. ⏳ Integration testing
5. ⏳ Manual QA verification

---

**Created**: 2025-11-14
**Phase**: RED (Test Creation Complete)
**Ready for**: Implementation (GREEN Phase)
