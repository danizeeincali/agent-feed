# Implementation Guide: Comment Counter Refetch

**Quick Start Guide for Moving from RED → GREEN**

This guide provides step-by-step instructions for implementing the functionality to make all TDD tests pass.

---

## Overview

You have **60 failing tests** waiting for implementation. Follow this guide to make them pass systematically.

```
Current:  🔴 RED (60 failing tests)
Goal:     🟢 GREEN (60 passing tests)
Method:   Implement minimum code to pass tests
```

---

## Step-by-Step Implementation

### Step 1: Implement refetchPost API Function

**File**: `/workspaces/agent-feed/frontend/src/services/api.ts`

**Location**: Add to the `ApiService` class, around line 410 (after `getAgentPost`)

**Implementation**:

```typescript
/**
 * Refetch a post to get updated data (bypasses cache)
 * Used after comment creation to get updated comment counter
 */
async refetchPost(postId: string): Promise<ApiResponse<AgentPost>> {
  // Validate input
  if (!postId || typeof postId !== 'string' || !postId.trim()) {
    throw new Error('Invalid post ID provided');
  }

  // Bypass cache - always fetch fresh data
  const endpoint = `/v1/agent-posts/${postId}`;

  try {
    // Use request method with cache disabled
    const response = await this.request<ApiResponse<AgentPost>>(
      endpoint,
      {},
      false // useCache = false - important!
    );

    // Clear cache for this post to ensure consistency
    this.clearCache(`/v1/agent-posts/${postId}`);
    this.clearCache('/v1/agent-posts');

    return response;
  } catch (error) {
    console.error('Error refetching post:', error);
    throw new Error(
      `Failed to refetch post ${postId}: ${
        error instanceof Error ? error.message : 'Unknown error'
      }`
    );
  }
}
```

**Test It**:
```bash
npm test -- agentFeed.refetch.test.ts
```

**Expected**: 22 tests should now pass ✅

---

### Step 2: Create usePosts Hook

**File**: `/workspaces/agent-feed/frontend/src/hooks/usePosts.ts` (create new file)

**Implementation**:

```typescript
import { useState, useCallback } from 'react';

/**
 * Post interface (match your actual Post type)
 */
interface Post {
  id: string;
  title: string;
  content: string;
  authorAgent: string;
  publishedAt: string;
  comments: number;
  metadata?: any;
  [key: string]: any; // Allow other properties
}

/**
 * Hook for managing post list state with optimistic updates
 */
export function usePosts() {
  const [posts, setPosts] = useState<Post[]>([]);

  /**
   * Update a specific post in the list
   * Creates new array and object (immutable)
   * Optimized to preserve references for unchanged posts
   */
  const updatePostInList = useCallback((
    postId: string,
    updates: Partial<Post>
  ) => {
    setPosts(prevPosts => {
      // Find the post index
      const postIndex = prevPosts.findIndex(p => p.id === postId);

      // If post not found, return unchanged array
      if (postIndex === -1) {
        return prevPosts;
      }

      // Create new array with updated post
      const newPosts = [...prevPosts];

      // Create new post object with updates
      newPosts[postIndex] = {
        ...prevPosts[postIndex],
        ...updates
      };

      return newPosts;
    });
  }, []);

  return {
    posts,
    setPosts,
    updatePostInList
  };
}
```

**Test It**:
```bash
npm test -- usePosts.test.tsx
```

**Expected**: 20 tests should now pass ✅

---

### Step 3: Update CommentForm Component

**File**: `/workspaces/agent-feed/frontend/src/components/CommentForm.tsx`

**Changes Needed**:

#### 3.1: Add Imports

```typescript
// Add these imports at the top
import { usePosts } from '../hooks/usePosts';
import { apiService } from '../services/api';
```

#### 3.2: Add Hook to Component

```typescript
export const CommentForm: React.FC<CommentFormProps> = ({
  postId,
  parentId,
  currentUser = 'current-user',
  onCommentAdded,
  // ... other props
}) => {
  // Add this hook
  const { updatePostInList } = usePosts();

  // ... existing state
```

**Note**: If you get "Cannot read property 'updatePostInList' of undefined", you need to pass the hook instance from parent component (see step 3.3)

#### 3.3: Better Approach - Pass updatePost as Prop

Since `CommentForm` doesn't own the posts state, pass the function as a prop:

**Update Props Interface**:
```typescript
interface CommentFormProps {
  postId: string;
  parentId?: string;
  currentUser?: string;
  onCommentAdded?: () => void;
  updatePost?: (postId: string, updates: any) => void; // Add this
  // ... other props
}
```

**Update Parent Component** (PostCard.tsx or PostList.tsx):
```typescript
// In parent component that uses CommentForm
const { posts, updatePostInList } = usePosts();

// Pass to CommentForm
<CommentForm
  postId={post.id}
  onCommentAdded={handleCommentsUpdate}
  updatePost={updatePostInList} // Pass the function
/>
```

#### 3.4: Update handleSubmit Function

Replace the existing `handleSubmit` with this implementation:

```typescript
const handleSubmit = async (e: React.FormEvent) => {
  e.preventDefault();

  if (!content.trim()) {
    setError('Comment content is required');
    return;
  }

  if (content.length > maxLength) {
    setError(`Comment content must be under ${maxLength} characters`);
    return;
  }

  setIsSubmitting(true);
  setError('');

  // Store original count for rollback
  let originalCount: number | undefined;

  try {
    // STEP 1: Optimistic update (if updatePost provided)
    if (updatePost) {
      // Get current post to find original count
      // In real implementation, you might need to get this from context/props
      originalCount = 0; // You'll need to get the actual current count

      // Optimistic increment
      updatePost(postId, {
        comments: originalCount + 1
      });
    }

    // STEP 2: Create comment via API
    console.log('Submitting comment via API service:', {
      postId,
      content: content.trim(),
      parentId,
      author: currentUser
    });

    const result = await apiService.createComment(postId, content.trim(), {
      parentId: parentId || undefined,
      author: currentUser,
      mentionedUsers: useMentionInput
        ? MentionService.extractMentions(content)
        : extractMentions(content)
    });

    console.log('Comment submitted successfully:', result);

    // STEP 3: Refetch to confirm counter
    if (updatePost) {
      try {
        const updatedPost = await apiService.refetchPost(postId);

        // STEP 4: Update with confirmed value
        updatePost(postId, {
          comments: updatedPost.data.comments
        });
      } catch (refetchError) {
        console.warn('Refetch failed, keeping optimistic update:', refetchError);
        // Keep optimistic update on refetch failure
        // It will sync on next page load
      }
    }

    // STEP 5: Clear form and notify parent
    setContent('');
    onCommentAdded?.();

  } catch (error) {
    console.error('Comment submission failed:', error);

    // STEP 6: Rollback optimistic update on error
    if (updatePost && originalCount !== undefined) {
      updatePost(postId, {
        comments: originalCount
      });
    }

    setError(error instanceof Error ? error.message : 'Failed to post technical analysis');
  } finally {
    setIsSubmitting(false);
  }
};
```

---

### Step 4: Update Parent Components

You need to update the components that use `CommentForm` to provide the posts state.

#### Option A: PostCard Component (Recommended)

**File**: `/workspaces/agent-feed/frontend/src/components/PostCard.tsx`

**Changes**:

```typescript
// Add imports
import { usePosts } from '../hooks/usePosts';

export const PostCard: React.FC<PostCardProps> = ({ post, className }) => {
  // Add this hook
  const { updatePostInList } = usePosts();

  // Update to use hook-managed engagement state
  const [engagementState, setEngagementState] = useState({
    bookmarked: false,
    bookmarks: post.bookmarks || 0,
    shares: post.shares || 0,
    views: post.views || 0,
    comments: post.comments || 0
  });

  // ... rest of component

  // Update CommentForm usage
  <CommentForm
    postId={post.id}
    onCommentAdded={handleCommentsUpdate}
    updatePost={(postId, updates) => {
      // Update local engagement state
      if (updates.comments !== undefined) {
        setEngagementState(prev => ({
          ...prev,
          comments: updates.comments
        }));
      }
      // Also update in posts list if managed by parent
      updatePostInList(postId, updates);
    }}
  />
```

#### Option B: Create Posts Context (Better for larger apps)

**File**: `/workspaces/agent-feed/frontend/src/contexts/PostsContext.tsx` (create new)

```typescript
import React, { createContext, useContext, ReactNode } from 'react';
import { usePosts } from '../hooks/usePosts';

const PostsContext = createContext<ReturnType<typeof usePosts> | null>(null);

export function PostsProvider({ children }: { children: ReactNode }) {
  const postsHook = usePosts();
  return (
    <PostsContext.Provider value={postsHook}>
      {children}
    </PostsContext.Provider>
  );
}

export function usePostsContext() {
  const context = useContext(PostsContext);
  if (!context) {
    throw new Error('usePostsContext must be used within PostsProvider');
  }
  return context;
}
```

Then wrap your app:

```typescript
// In App.tsx or main component
<PostsProvider>
  <YourAppRoutes />
</PostsProvider>
```

And use in components:

```typescript
// In CommentForm or PostCard
const { updatePostInList } = usePostsContext();
```

---

### Step 5: Run Integration Tests

**Test It**:
```bash
npm test -- comment-counter-flow.test.ts
```

**Expected**: 18 tests should now pass ✅

---

## Verification Checklist

After implementation, verify everything works:

### 1. Run All Tests
```bash
npm test
```

**Expected Output**:
```
✓ API: refetchPost (22 tests) - 22 passed
✓ Hook: usePosts (20 tests) - 20 passed
✓ Integration: Comment Counter Flow (18 tests) - 18 passed

Total: 60 passed, 0 failed
```

### 2. Check TypeScript
```bash
npm run typecheck
```

**Expected**: No TypeScript errors

### 3. Run Coverage
```bash
npm test -- --coverage
```

**Expected**: 100% coverage for new code

### 4. Manual Testing

1. Start the app:
   ```bash
   npm run dev
   ```

2. Test flow:
   - Create a post
   - Add a comment
   - **Verify**: Counter increments from 0 → 1 instantly
   - Refresh page
   - **Verify**: Counter still shows 1

3. Test error handling:
   - Disconnect network
   - Try to add comment
   - **Verify**: Counter rolls back
   - Reconnect network
   - Add comment
   - **Verify**: Counter updates correctly

---

## Common Issues and Solutions

### Issue 1: "refetchPost is not a function"

**Cause**: Function not exported or wrong import

**Solution**:
```typescript
// In api.ts, make sure the function is part of the class
class ApiService {
  // ... other methods

  async refetchPost(postId: string) {
    // implementation
  }
}

// Export should already exist:
export const apiService = new ApiService();
```

### Issue 2: "Cannot read property 'posts' of undefined"

**Cause**: Hook not properly provided to components

**Solution**: Use Context Provider approach (see Step 4, Option B)

### Issue 3: "Tests timeout"

**Cause**: Backend not running

**Solution**:
```bash
# In separate terminal
cd /workspaces/agent-feed/api-server
npm start

# Verify API is running
curl http://localhost:3001/api/health
```

### Issue 4: "Counter not updating in UI"

**Cause**: Component not reading from updated state

**Solution**: Ensure PostCard reads `engagementState.comments` which is updated by the hook

### Issue 5: "Optimistic update flickers"

**Cause**: Not using optimistic update correctly

**Solution**: Make sure you:
1. Update immediately (optimistic)
2. Create comment
3. Refetch and confirm
4. Update with confirmed value

The UI should not flicker if done correctly.

---

## Performance Optimization Tips

Once tests pass, consider these optimizations:

### 1. Debounce Refetch
```typescript
import { debounce } from 'lodash';

const debouncedRefetch = debounce((postId) => {
  apiService.refetchPost(postId);
}, 300);
```

### 2. Batch Refetches
```typescript
// If multiple comments created rapidly, refetch once
const refetchQueue = new Set<string>();

function queueRefetch(postId: string) {
  refetchQueue.add(postId);
  scheduleRefetchBatch();
}

const scheduleRefetchBatch = debounce(() => {
  const postIds = Array.from(refetchQueue);
  refetchQueue.clear();
  // Fetch all at once
}, 100);
```

### 3. Optimistic Update Timeout
```typescript
// If refetch takes too long, use optimistic value
const timeout = setTimeout(() => {
  // Keep optimistic value
}, 5000);

try {
  const result = await apiService.refetchPost(postId);
  clearTimeout(timeout);
  // Use confirmed value
} catch (error) {
  clearTimeout(timeout);
  // Keep optimistic value, log error
}
```

---

## Testing Your Implementation

### Unit Tests
```bash
# Test API function
npm test -- agentFeed.refetch.test.ts

# Test hook
npm test -- usePosts.test.tsx
```

### Integration Tests
```bash
# Test complete flow
npm test -- comment-counter-flow.test.ts
```

### Coverage
```bash
# Generate coverage report
npm test -- --coverage --reporter=html

# View in browser
open coverage/index.html
```

### Manual Testing Checklist

- [ ] Counter shows 0 initially
- [ ] Counter increments to 1 after comment
- [ ] Counter updates within 500ms
- [ ] Counter persists after page refresh
- [ ] Multiple comments increment correctly
- [ ] Error shows if comment fails
- [ ] Counter rolls back on error
- [ ] Rapid comments don't break counter
- [ ] Multiple users' comments all counted
- [ ] Worker/agent comments counted

---

## Success Criteria

✅ All 60 tests pass
✅ No TypeScript errors
✅ 100% coverage for new code
✅ Performance < 500ms
✅ Manual testing confirms behavior
✅ No console errors
✅ Code review approved

---

## Next Steps After GREEN

Once all tests pass, move to **REFACTOR** phase:

1. **Code Quality**
   - Extract duplicated code
   - Improve naming
   - Add JSDoc comments

2. **Performance**
   - Profile with browser DevTools
   - Optimize if needed
   - Add performance monitoring

3. **Documentation**
   - Update component docs
   - Add inline comments
   - Create usage examples

4. **Code Review**
   - Submit PR
   - Address feedback
   - Merge to main

---

## Resources

- **Test Files**:
  - `/workspaces/agent-feed/frontend/src/api/__tests__/agentFeed.refetch.test.ts`
  - `/workspaces/agent-feed/frontend/src/hooks/__tests__/usePosts.test.tsx`
  - `/workspaces/agent-feed/tests/integration/comment-counter-flow.test.ts`

- **Documentation**:
  - `/workspaces/agent-feed/tests/TEST-DOCUMENTATION.md`
  - `/workspaces/agent-feed/tests/TDD-COVERAGE-REPORT.md`
  - `/workspaces/agent-feed/SPARC-COMMENT-COUNTER-FIX-SPEC.md`

- **Commands**:
  ```bash
  npm test                    # Run all tests
  npm test -- --watch        # Watch mode
  npm test -- --coverage     # Coverage report
  npm run typecheck          # TypeScript check
  npm run dev                # Start dev server
  ```

---

## Questions?

If you get stuck:
1. Check the test error messages - they guide you
2. Review the specification document
3. Look at test assertions for expected behavior
4. Run tests in watch mode for instant feedback

---

**Guide Status**: ✅ Complete
**Current Phase**: 🔴 RED → 🟢 GREEN
**Next Step**: Implement code following this guide
