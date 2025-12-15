# TDD Test Suite - Quick Reference

## Quick Start

```bash
# Run all tests (they should FAIL - RED phase)
npm test

# Run specific issue tests
npm test -- CommentThread.author.test.tsx        # Issue 1
npm test -- RealSocialMediaFeed.realtime.test.tsx # Issue 2
npm run test:integration -- onboarding-next-step.test.js # Issue 3
npm test -- CommentThread.processing.test.tsx     # Issue 4
```

## Test Files Summary

| Issue | File | Tests | Focus |
|-------|------|-------|-------|
| 1 | `CommentThread.author.test.tsx` | 11 | Agent display names |
| 2 | `RealSocialMediaFeed.realtime.test.tsx` | 14 | Real-time updates |
| 3 | `onboarding-next-step.test.js` | 12 | WebSocket emission |
| 4 | `CommentThread.processing.test.tsx` | 13 | Processing indicators |

**Total**: 40+ tests

## Implementation Checklist

### Issue 1: Comment Author Display
**File to Fix**: `/workspaces/agent-feed/frontend/src/components/CommentThread.tsx`

```typescript
// Current (WRONG)
const authorName = comment.author_agent ? "Avi" : comment.user?.name || "User";

// Target (CORRECT)
const authorName = comment.author_agent
  ? comment.agent?.display_name || formatAgentName(comment.agent?.name) || "Agent"
  : comment.user?.name || "User";
```

**Tests to Pass**: 11 tests in `CommentThread.author.test.tsx`

---

### Issue 2: Real-Time Comment Updates
**File to Fix**: `/workspaces/agent-feed/frontend/src/components/RealSocialMediaFeed.tsx`

```typescript
// Add WebSocket listener
useEffect(() => {
  socket.on('comment:created', (data) => {
    // Update comment counter
    setPosts(posts => posts.map(post =>
      post.id === data.postId
        ? { ...post, comment_count: post.comment_count + 1 }
        : post
    ));

    // Reload visible comments
    if (expandedPosts[data.postId]) {
      loadComments(data.postId);
    }
  });

  return () => socket.off('comment:created');
}, [socket, expandedPosts]);
```

**Tests to Pass**: 14 tests in `RealSocialMediaFeed.realtime.test.tsx`

---

### Issue 3: Next Step WebSocket Emission
**File to Fix**: `/workspaces/agent-feed/api-server/services/onboarding/onboarding-flow-service.js`

```javascript
// After creating next step post
async createNextStepPost(userId, step) {
  const post = await postRepository.create({
    content: getStepContent(step),
    onboarding_step: step,
    metadata: {
      isOnboarding: true,
      step: step,
      systemGenerated: true
    }
  });

  // CRITICAL: Emit WebSocket event
  io.emit('post:created', { post });

  return post;
}
```

**Tests to Pass**: 12 tests in `onboarding-next-step.test.js`

---

### Issue 4: Comment Processing Indicator
**File to Fix**: `/workspaces/agent-feed/frontend/src/components/CommentThread.tsx`

```typescript
// Add processing state
const [processingComments, setProcessingComments] = useState<Set<number>>(new Set());

const handleSubmit = async (content) => {
  const tempId = Date.now();
  setProcessingComments(prev => new Set(prev).add(tempId));

  // Set timeout
  const timeoutId = setTimeout(() => {
    setProcessingComments(prev => {
      const next = new Set(prev);
      next.delete(tempId);
      return next;
    });
  }, 30000);

  const newComment = await onCommentSubmit(content);

  // Listen for reply
  socket.on('comment:created', (data) => {
    if (data.comment.parent_comment_id === newComment.id) {
      clearTimeout(timeoutId);
      setProcessingComments(prev => {
        const next = new Set(prev);
        next.delete(tempId);
        return next;
      });
    }
  });
};

// Render indicator
{processingComments.has(commentId) && (
  <div className="processing-pill">
    <Loader className="animate-spin" size={12} />
    Processing...
  </div>
)}
```

**Tests to Pass**: 13 tests in `CommentThread.processing.test.tsx`

---

## Test Commands

### Watch Mode (Recommended)
```bash
npm test -- --watch
```

### Coverage Report
```bash
npm test -- --coverage
```

### Specific Test Pattern
```bash
npm test -- --grep "should display agent display name"
```

### Verbose Output
```bash
npm test -- --verbose
```

## Expected Flow

### 1. RED Phase ✅ (Current)
```
FAIL  CommentThread.author.test.tsx (11 failed)
FAIL  RealSocialMediaFeed.realtime.test.tsx (14 failed)
FAIL  onboarding-next-step.test.js (12 failed)
FAIL  CommentThread.processing.test.tsx (13 failed)

Tests: 50 failed, 50 total
```

### 2. GREEN Phase (Next)
Implement fixes until:
```
PASS  CommentThread.author.test.tsx (11 passed)
PASS  RealSocialMediaFeed.realtime.test.tsx (14 passed)
PASS  onboarding-next-step.test.js (12 passed)
PASS  CommentThread.processing.test.tsx (13 passed)

Tests: 50 passed, 50 total
Coverage: >90%
```

### 3. REFACTOR Phase (Final)
- Clean up code
- Remove duplication
- Optimize performance
- Tests still pass

## Common Issues

### Tests Won't Run
```bash
# Install dependencies
npm install

# Install test dependencies
npm install --save-dev @testing-library/react @testing-library/user-event vitest
```

### WebSocket Mocks Not Working
```typescript
// Make sure mock is before import
vi.mock('../hooks/useSocket', () => ({
  default: () => ({ on: mockOn, off: mockOff })
}));
```

### Async Tests Timing Out
```typescript
// Increase timeout
it('should do async thing', async () => {
  // ...
}, 10000); // 10 second timeout
```

## Files Created

```
/workspaces/agent-feed/
├── frontend/src/components/__tests__/
│   ├── CommentThread.author.test.tsx       (Issue 1)
│   ├── RealSocialMediaFeed.realtime.test.tsx (Issue 2)
│   └── CommentThread.processing.test.tsx    (Issue 4)
├── tests/
│   ├── integration/
│   │   └── onboarding-next-step.test.js     (Issue 3)
│   ├── TDD-TEST-SUITE-INDEX.md              (Full docs)
│   └── TDD-QUICK-REFERENCE.md               (This file)
```

## Success Metrics

- ✅ All 40+ tests written
- ✅ All tests currently failing (RED)
- ⏳ Implement fixes (GREEN)
- ⏳ Refactor code (REFACTOR)
- ⏳ All tests passing
- ⏳ Coverage >90%

---

**Status**: RED Phase Complete - Ready for Implementation
**Next**: Begin implementing fixes to turn tests GREEN
