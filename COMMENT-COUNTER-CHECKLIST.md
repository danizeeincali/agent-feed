# Comment Counter Fix - Complete Checklist

**Status**: Ready for Implementation
**Last Updated**: 2025-10-16

---

## Pre-Implementation Review

### ✅ Documentation Review
- [x] Read SPARC-COMMENT-COUNTER-FIX-SPEC.md
- [x] Read COMMENT-COUNTER-CODE-REVIEW-REPORT.md
- [x] Read COMMENT-COUNTER-IMPLEMENTATION-GUIDE.md
- [x] Read COMMENT-COUNTER-REVIEW-SUMMARY.md
- [x] Read COMMENT-COUNTER-ARCHITECTURE-DIAGRAM.md
- [ ] Team discussion and approval

### ✅ Environment Setup
- [ ] Node modules installed (`npm install`)
- [ ] Development server running (`npm run dev`)
- [ ] Backend API running (port 3001)
- [ ] Database accessible
- [ ] Git branch created (`git checkout -b fix/comment-counter-refetch`)

### ✅ Tool Verification
- [ ] TypeScript compiler working (`npm run typecheck`)
- [ ] Linter configured (`npm run lint`)
- [ ] Unit test framework ready (`npm run test`)
- [ ] Playwright E2E tests configured (`npm run test:e2e`)

---

## Phase 1: Core Infrastructure

### Step 1.1: Create usePosts Hook
**File**: `/workspaces/agent-feed/frontend/src/hooks/usePosts.ts`

- [ ] File created
- [ ] Imports added (useState, useCallback, apiService, types)
- [ ] UsePostsOptions interface defined
- [ ] UsePostsReturn interface defined
- [ ] usePosts function implemented
  - [ ] State variables (posts, isRefetching, error)
  - [ ] updatePostInList function
  - [ ] refetchPost function
  - [ ] Error handling
- [ ] TypeScript compilation succeeds
- [ ] No linting errors

**Validation Commands**:
```bash
npm run typecheck
npm run lint
```

---

### Step 1.2: Add Refetch Method to API Service
**File**: `/workspaces/agent-feed/frontend/src/services/api.ts`

- [ ] Location identified (after getAgentPost, line ~413)
- [ ] refetchPost method added
  - [ ] JSDoc comment
  - [ ] clearCache call
  - [ ] getAgentPost call
  - [ ] Proper return type
- [ ] TypeScript compilation succeeds
- [ ] No linting errors

**Validation Commands**:
```bash
npm run typecheck
npm run lint
```

---

### Step 1.3: Write Unit Tests
**File**: `/workspaces/agent-feed/frontend/src/hooks/__tests__/usePosts.test.ts`

- [ ] Test file created
- [ ] Mock setup (apiService)
- [ ] Test suite: updatePostInList
  - [ ] Updates post comments count
  - [ ] Does not modify other posts
- [ ] Test suite: refetchPost
  - [ ] Refetches and updates on success
  - [ ] Sets error state on failure
  - [ ] Sets isRefetching flag during fetch
- [ ] Test suite: Optimistic Update + Refetch
  - [ ] Optimistically updates then confirms
  - [ ] Handles server returning different count
- [ ] All tests pass
- [ ] 100% code coverage for usePosts

**Validation Commands**:
```bash
npm run test usePosts
npm run test -- --coverage
```

**Expected Output**:
```
PASS  src/hooks/__tests__/usePosts.test.ts
  usePosts Hook
    updatePostInList
      ✓ should update post comments count optimistically (Xms)
      ✓ should not modify other posts (Xms)
    refetchPost
      ✓ should refetch post and update state on success (Xms)
      ✓ should set error state on refetch failure (Xms)
      ✓ should set isRefetching flag during refetch (Xms)
    Optimistic Update + Refetch Pattern
      ✓ should optimistically update then confirm with refetch (Xms)
      ✓ should handle server returning different count (Xms)

Coverage:
  File                | % Stmts | % Branch | % Funcs | % Lines
  ─────────────────── | ────── | ──────── | ─────── | ───────
  hooks/usePosts.ts   | 100    | 100      | 100     | 100
```

---

## Phase 2: Component Integration

### Step 2.1: Modify SocialMediaFeed
**File**: `/workspaces/agent-feed/frontend/src/components/SocialMediaFeed.tsx`

- [ ] Import usePosts hook
- [ ] Replace useState with usePosts
- [ ] Add handleRefetchPost callback
- [ ] Pass onRefetchNeeded to child components
- [ ] Verify WebSocket handler still works
- [ ] TypeScript compilation succeeds
- [ ] Component renders without errors
- [ ] Manual smoke test passes

**Manual Test**:
```bash
# Start dev server
npm run dev

# Open browser to http://localhost:5173
# Verify:
1. Posts load correctly
2. No console errors
3. Feed displays normally
```

---

### Step 2.2: Modify CommentForm
**File**: `/workspaces/agent-feed/frontend/src/components/CommentForm.tsx`

- [ ] Add new props to interface
  - [ ] onRefetchNeeded prop
  - [ ] currentCommentCount prop
- [ ] Update handleSubmit function
  - [ ] Call onRefetchNeeded after successful comment
  - [ ] Add logging for debugging
  - [ ] Preserve error handling
- [ ] TypeScript compilation succeeds
- [ ] Component renders without errors
- [ ] Manual smoke test passes

**Manual Test**:
```bash
# In browser:
1. Find a post
2. Click expand
3. Type comment
4. Submit
5. Verify no console errors
6. Check network tab for:
   - POST /api/agent-posts/:id/comments
   - GET /api/v1/agent-posts/:id
```

---

### Step 2.3: Identify & Update Post Display Component
**Files**: Need to identify (likely ExpandablePost.tsx or PostCard.tsx)

- [ ] Component identified
- [ ] Comment counter display located
- [ ] Verify it reads from post.engagement.comments
- [ ] Add data-testid="comment-count" attribute
- [ ] (Optional) Add loading spinner during refetch
- [ ] TypeScript compilation succeeds
- [ ] Component renders without errors

**Search Commands**:
```bash
grep -rn "post.comments\|engagement.comments" frontend/src/components/
grep -rn "MessageCircle" frontend/src/components/
```

---

## Phase 3: Testing & Validation

### Step 3.1: Integration Tests
**File**: `/workspaces/agent-feed/frontend/src/components/__tests__/CommentForm.refetch.test.tsx`

- [ ] Test file created
- [ ] Mock apiService setup
- [ ] Test: onRefetchNeeded called after successful submission
- [ ] Test: onRefetchNeeded NOT called on failure
- [ ] All tests pass

**Validation Commands**:
```bash
npm run test CommentForm.refetch
```

---

### Step 3.2: E2E Tests
**File**: `/workspaces/agent-feed/tests/e2e/comment-counter.spec.ts`

- [ ] Test file created
- [ ] Test: Counter updates within 500ms after manual comment
- [ ] Test: Worker outcome comment updates counter
- [ ] Test: Multiple rapid comments handled correctly
- [ ] Test: Page refresh preserves correct counter
- [ ] All tests pass

**Validation Commands**:
```bash
# Start backend first
cd /workspaces/agent-feed
npm start

# In new terminal
cd /workspaces/agent-feed/frontend
npm run test:e2e comment-counter
```

**Expected Output**:
```
Running 4 tests using 1 worker

  ✓  comment counter updates within 500ms (Xms)
  ✓  worker outcome comment updates counter (Xms)
  ✓  multiple rapid comments handled correctly (Xms)
  ✓  page refresh preserves correct counter (Xms)

  4 passed (Xs)
```

---

### Step 3.3: Manual Testing

#### Test Case 1: Manual Comment
- [ ] Navigate to feed
- [ ] Find post with 0 comments
- [ ] Expand post
- [ ] Type test comment: "Manual test comment"
- [ ] Submit comment
- [ ] **Verify**: Counter updates from 0 → 1 within 500ms
- [ ] **Verify**: No console errors
- [ ] **Verify**: Network tab shows:
  - POST /api/agent-posts/:id/comments (success)
  - GET /api/v1/agent-posts/:id (success)

#### Test Case 2: Worker Outcome Comment
- [ ] Create new post via UI
- [ ] Note post ID
- [ ] Use API client (Postman/curl) to post worker comment:
```bash
curl -X POST http://localhost:3001/api/agent-posts/POST_ID/comments \
  -H "Content-Type: application/json" \
  -d '{
    "content": "Worker outcome: Task completed",
    "author": "test-worker",
    "skipTicket": true
  }'
```
- [ ] **Verify**: Counter updates in UI (may need user to post comment)
- [ ] **Verify**: Counter shows correct total count

#### Test Case 3: Multiple Rapid Comments
- [ ] Expand post
- [ ] Post comment 1 → wait for update
- [ ] Post comment 2 immediately
- [ ] Post comment 3 immediately
- [ ] **Verify**: Counter shows correct count (3)
- [ ] **Verify**: No race conditions or incorrect counts

#### Test Case 4: Page Refresh
- [ ] Post comment on a post
- [ ] Wait for counter to update
- [ ] Refresh page (Ctrl+R / Cmd+R)
- [ ] **Verify**: Counter persists correct value

#### Test Case 5: Error Handling
- [ ] Stop backend server
- [ ] Try to post comment
- [ ] **Verify**: Error message shown
- [ ] **Verify**: Counter handles failure gracefully
- [ ] Start backend server
- [ ] Retry comment
- [ ] **Verify**: Counter updates correctly

---

## Phase 4: Optimization & Polish

### Step 4.1: Performance Monitoring (Optional)
- [ ] Add performance.now() timing
- [ ] Log update duration to console
- [ ] (Optional) Add to analytics/monitoring
- [ ] Verify average update time <500ms

### Step 4.2: Loading Indicators (Optional)
- [ ] Add isRefetching state to UI
- [ ] Show spinner/skeleton during refetch
- [ ] Smooth transition animation
- [ ] Verify UX improvement

### Step 4.3: Debouncing (Optional, if needed)
- [ ] Implement debounced refetch (300ms)
- [ ] Test with rapid comments
- [ ] Verify correct final count
- [ ] No race conditions

---

## Phase 5: Code Quality

### Step 5.1: Code Review
- [ ] Self-review all changes
- [ ] Check for code duplication
- [ ] Verify naming conventions
- [ ] Ensure consistent style
- [ ] Add JSDoc comments where needed
- [ ] Remove debug console.logs (or make conditional)

### Step 5.2: TypeScript & Linting
- [ ] No TypeScript errors: `npm run typecheck`
- [ ] No linting errors: `npm run lint`
- [ ] All imports resolve correctly
- [ ] All types are properly defined

### Step 5.3: Test Coverage
- [ ] Unit tests: 100% coverage for new code
- [ ] Integration tests: All passing
- [ ] E2E tests: All passing
- [ ] Manual tests: All scenarios validated

**Validation Commands**:
```bash
npm run typecheck
npm run lint
npm run test -- --coverage
npm run test:e2e
```

---

## Phase 6: Documentation

### Step 6.1: Code Documentation
- [ ] JSDoc comments on usePosts hook
- [ ] JSDoc comments on refetchPost method
- [ ] Inline comments for complex logic
- [ ] Update component prop documentation

### Step 6.2: Update README (if applicable)
- [ ] Document new usePosts hook
- [ ] Document refetch behavior
- [ ] Update architecture documentation

---

## Phase 7: Deployment

### Step 7.1: Pre-Deployment
- [ ] All tests passing
- [ ] Code reviewed by team
- [ ] No console errors in browser
- [ ] No TypeScript errors
- [ ] No linting warnings

### Step 7.2: Git Workflow
```bash
# Verify clean state
git status

# Add changes
git add frontend/src/hooks/usePosts.ts
git add frontend/src/hooks/__tests__/usePosts.test.ts
git add frontend/src/services/api.ts
git add frontend/src/components/CommentForm.tsx
git add frontend/src/components/SocialMediaFeed.tsx
git add tests/e2e/comment-counter.spec.ts

# Commit
git commit -m "feat: implement comment counter refetch on post

- Add usePosts hook for centralized state management
- Add refetchPost method to API service
- Update CommentForm to trigger refetch after comment creation
- Modify SocialMediaFeed to use usePosts hook
- Add comprehensive unit and E2E tests
- Ensure counter updates within 500ms (performance requirement)

Fixes comment counter displaying 0 when comments exist.
Resolves #ISSUE_NUMBER

🤖 Generated with Claude Code (https://claude.com/claude-code)
Co-Authored-By: Claude <noreply@anthropic.com>"

# Push to remote
git push origin fix/comment-counter-refetch
```

### Step 7.3: Pull Request
- [ ] Create PR on GitHub/GitLab
- [ ] Fill out PR template
- [ ] Link related issue
- [ ] Request code review
- [ ] Wait for CI/CD pipeline
- [ ] Address review comments

**PR Title**: `feat: implement comment counter refetch on post`

**PR Description**:
```markdown
## Summary
Fixes comment counter displaying 0 when actual comments exist by implementing a refetch mechanism after comment creation.

## Changes
- ✅ Created `usePosts` hook for centralized post state management
- ✅ Added `refetchPost` method to API service
- ✅ Updated `CommentForm` to trigger refetch after comment creation
- ✅ Modified `SocialMediaFeed` to use new hook
- ✅ Comprehensive test coverage (unit + integration + E2E)

## Testing
- [x] Unit tests: 100% coverage
- [x] Integration tests: All passing
- [x] E2E tests: All scenarios validated
- [x] Manual testing: All test cases passed
- [x] Performance: Update time <500ms ✅

## Related
Closes #ISSUE_NUMBER
Implements SPARC-COMMENT-COUNTER-FIX-SPEC.md
```

### Step 7.4: CI/CD Pipeline
- [ ] Build succeeds
- [ ] Tests pass in CI
- [ ] Linting passes
- [ ] TypeScript compilation succeeds
- [ ] E2E tests pass

### Step 7.5: Staging Deployment
- [ ] Deploy to staging environment
- [ ] Smoke test on staging
- [ ] Verify comment counter behavior
- [ ] Check for any regressions

### Step 7.6: Production Deployment
- [ ] Get approval from team
- [ ] Deploy to production
- [ ] Monitor error logs
- [ ] Monitor performance metrics
- [ ] Verify counter updates in production

---

## Phase 8: Post-Deployment

### Step 8.1: Monitoring
- [ ] Check error rates in production
- [ ] Monitor comment counter update times
- [ ] Watch for any user-reported issues
- [ ] Verify WebSocket + refetch fallback working

**Monitoring Queries**:
```sql
-- Check comment counts in database
SELECT id, metadata->>'comment_count' as count
FROM agent_memories
WHERE metadata->>'comment_count' != '0';

-- Verify backend counter increments
SELECT * FROM agent_memories
WHERE id = 'POST_ID';
```

### Step 8.2: User Feedback
- [ ] Collect user feedback
- [ ] Monitor support tickets
- [ ] Check for any confusion or issues
- [ ] Document lessons learned

### Step 8.3: Metrics Collection
- [ ] Track comment counter accuracy
- [ ] Measure update latency (should be <500ms)
- [ ] Monitor API call volume
- [ ] Track error rates

---

## Rollback Plan

### If Issues Are Found:

1. **Immediate Rollback**:
```bash
git revert <commit-hash>
git push origin main
```

2. **Identify Issue**:
- Check error logs
- Review failed test output
- Investigate user reports

3. **Fix Forward**:
- Create hotfix branch
- Fix the issue
- Add regression test
- Deploy fix

---

## Success Criteria Verification

### Functional Requirements ✅
- [ ] Counter shows 0 initially for new posts
- [ ] Counter increments after manual comment
- [ ] Counter increments after worker outcome comment
- [ ] Counter persists after page refresh
- [ ] Counter accurate with multiple rapid comments

### Performance Requirements ✅
- [ ] Update time <500ms (measured)
- [ ] No UI jank or flicker
- [ ] Smooth user experience
- [ ] Acceptable API call volume

### Quality Requirements ✅
- [ ] 100% test coverage for new code
- [ ] No TypeScript errors
- [ ] No linting warnings
- [ ] No console errors
- [ ] Code follows existing patterns

### Documentation Requirements ✅
- [ ] Code is well-commented
- [ ] Implementation guide provided
- [ ] Architecture documented
- [ ] Team trained on changes

---

## Final Sign-Off

### Technical Lead Approval
- [ ] Code reviewed and approved
- [ ] Architecture validated
- [ ] Tests comprehensive
- [ ] Performance acceptable

### Product Owner Approval
- [ ] Requirements met
- [ ] User experience acceptable
- [ ] No regressions introduced
- [ ] Ready for production

### Deployment Approval
- [ ] All checklists completed
- [ ] Staging validated
- [ ] Rollback plan ready
- [ ] Monitoring in place

---

## Completion

**Date Completed**: _______________

**Deployed By**: _______________

**Production URL**: _______________

**Notes**:
```
[Add any notes about the deployment, issues encountered, or optimizations made]
```

---

## Quick Reference

### Useful Commands
```bash
# Development
npm run dev                    # Start dev server
npm run typecheck              # TypeScript validation
npm run lint                   # ESLint check

# Testing
npm run test                   # Run unit tests
npm run test -- --coverage     # With coverage
npm run test:e2e              # Run E2E tests

# Build
npm run build                 # Production build

# Git
git status                    # Check changes
git add .                     # Stage all changes
git commit -m "message"       # Commit changes
git push origin branch-name   # Push to remote
```

### File Paths (Quick Copy)
```
/workspaces/agent-feed/frontend/src/hooks/usePosts.ts
/workspaces/agent-feed/frontend/src/hooks/__tests__/usePosts.test.ts
/workspaces/agent-feed/frontend/src/services/api.ts
/workspaces/agent-feed/frontend/src/components/CommentForm.tsx
/workspaces/agent-feed/frontend/src/components/SocialMediaFeed.tsx
/workspaces/agent-feed/tests/e2e/comment-counter.spec.ts
```

### Key Documentation
- SPARC-COMMENT-COUNTER-FIX-SPEC.md
- COMMENT-COUNTER-CODE-REVIEW-REPORT.md
- COMMENT-COUNTER-IMPLEMENTATION-GUIDE.md
- COMMENT-COUNTER-ARCHITECTURE-DIAGRAM.md

---

**Checklist Complete**
**Ready to Begin Implementation**
**Good Luck! 🚀**
