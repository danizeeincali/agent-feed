# Comment Counter Fix - Implementation Guide

**Status**: Ready for Implementation
**Complexity**: Medium
**Estimated Time**: 8-12 hours
**Dependencies**: None (all prerequisites met)

---

## Quick Reference

### Files to Create (2)
1. `/workspaces/agent-feed/frontend/src/hooks/usePosts.ts` - State management hook
2. `/workspaces/agent-feed/frontend/src/hooks/__tests__/usePosts.test.ts` - Unit tests

### Files to Modify (3)
1. `/workspaces/agent-feed/frontend/src/services/api.ts` - Add refetchPost method
2. `/workspaces/agent-feed/frontend/src/components/CommentForm.tsx` - Add refetch logic
3. `/workspaces/agent-feed/frontend/src/components/SocialMediaFeed.tsx` - Use usePosts hook

### Files to Identify (1)
1. Post counter display component - Need to locate where `{post.comments}` is rendered

---

## Phase 1: Core Infrastructure

### Step 1.1: Create `usePosts` Hook

**File**: `/workspaces/agent-feed/frontend/src/hooks/usePosts.ts`

```typescript
/**
 * usePosts Hook - Centralized post state management with refetch capability
 *
 * Provides optimistic updates and server confirmation for post data.
 * Supports comment counter synchronization.
 */

import { useState, useCallback } from 'react';
import { apiService } from '../services/api';
import { AgentPost, ApiResponse } from '../types/api';

export interface UsePostsOptions {
  initialPosts?: AgentPost[];
  onError?: (error: Error) => void;
}

export interface UsePostsReturn {
  posts: AgentPost[];
  setPosts: React.Dispatch<React.SetStateAction<AgentPost[]>>;
  updatePostInList: (postId: string, updates: Partial<AgentPost>) => void;
  refetchPost: (postId: string) => Promise<void>;
  isRefetching: boolean;
  error: string | null;
}

export function usePosts(options: UsePostsOptions = {}): UsePostsReturn {
  const { initialPosts = [], onError } = options;

  const [posts, setPosts] = useState<AgentPost[]>(initialPosts);
  const [isRefetching, setIsRefetching] = useState(false);
  const [error, setError] = useState<string | null>(null);

  /**
   * Update a specific post in the list without refetching
   * Used for optimistic updates
   */
  const updatePostInList = useCallback((postId: string, updates: Partial<AgentPost>) => {
    setPosts(prev => prev.map(post =>
      post.id === postId
        ? { ...post, ...updates, engagement: { ...post.engagement, ...updates.engagement } }
        : post
    ));
  }, []);

  /**
   * Refetch a single post from the server and update the list
   * Used to confirm optimistic updates with server data
   */
  const refetchPost = useCallback(async (postId: string) => {
    setIsRefetching(true);
    setError(null);

    try {
      const response = await apiService.refetchPost(postId);

      if (response.success && response.data) {
        // Update post in list with confirmed server data
        updatePostInList(postId, response.data);
      } else {
        throw new Error('Failed to refetch post');
      }
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Unknown error';
      setError(errorMessage);
      onError?.(err instanceof Error ? err : new Error(errorMessage));
      console.error('Error refetching post:', err);
    } finally {
      setIsRefetching(false);
    }
  }, [updatePostInList, onError]);

  return {
    posts,
    setPosts,
    updatePostInList,
    refetchPost,
    isRefetching,
    error
  };
}
```

**Validation**:
- [ ] File created at correct path
- [ ] No TypeScript errors
- [ ] Imports resolve correctly
- [ ] Function signature matches specification

---

### Step 1.2: Add Refetch Method to API Service

**File**: `/workspaces/agent-feed/frontend/src/services/api.ts`

**Location**: After `getAgentPost` method (around line 413)

```typescript
/**
 * Refetch a single post to get updated data
 * Clears cache to ensure fresh data from server
 *
 * @param postId - The post ID to refetch
 * @returns Promise with updated post data
 */
async refetchPost(postId: string): Promise<ApiResponse<AgentPost>> {
  // Clear cache for this specific post to force fresh fetch
  this.clearCache(`/v1/agent-posts/${postId}`);

  // Fetch fresh data from server
  return this.getAgentPost(postId);
}
```

**Exact Change**:
```diff
  async getAgentPost(id: string): Promise<ApiResponse<AgentPost>> {
    return this.request<ApiResponse<AgentPost>>(`/v1/agent-posts/${id}`);
  }

+ /**
+  * Refetch a single post to get updated data
+  * Clears cache to ensure fresh data from server
+  */
+ async refetchPost(postId: string): Promise<ApiResponse<AgentPost>> {
+   this.clearCache(`/v1/agent-posts/${postId}`);
+   return this.getAgentPost(postId);
+ }

  async createAgentPost(postData: Partial<AgentPost>): Promise<ApiResponse<AgentPost>> {
```

**Validation**:
- [ ] Method added after `getAgentPost`
- [ ] No TypeScript errors
- [ ] Cache clearing works correctly
- [ ] Returns proper type

---

### Step 1.3: Write Unit Tests for usePosts Hook

**File**: `/workspaces/agent-feed/frontend/src/hooks/__tests__/usePosts.test.ts`

```typescript
/**
 * usePosts Hook Tests - TDD London School
 */

import { renderHook, act, waitFor } from '@testing-library/react';
import { usePosts } from '../usePosts';
import { apiService } from '../../services/api';

// Mock API service
jest.mock('../../services/api', () => ({
  apiService: {
    refetchPost: jest.fn(),
  }
}));

describe('usePosts Hook', () => {
  const mockPosts = [
    {
      id: 'post-1',
      title: 'Test Post',
      content: 'Test content',
      authorAgent: 'test-agent',
      publishedAt: '2025-10-16T00:00:00Z',
      engagement: {
        comments: 0,
        likes: 0,
        shares: 0,
        views: 0
      },
      metadata: {
        businessImpact: 5,
        tags: ['test']
      }
    }
  ];

  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('updatePostInList', () => {
    it('should update post comments count optimistically', () => {
      const { result } = renderHook(() => usePosts({ initialPosts: mockPosts }));

      act(() => {
        result.current.updatePostInList('post-1', {
          engagement: { ...mockPosts[0].engagement, comments: 1 }
        });
      });

      expect(result.current.posts[0].engagement.comments).toBe(1);
    });

    it('should not modify other posts', () => {
      const multiplePosts = [
        { ...mockPosts[0], id: 'post-1' },
        { ...mockPosts[0], id: 'post-2' },
        { ...mockPosts[0], id: 'post-3' }
      ];

      const { result } = renderHook(() => usePosts({ initialPosts: multiplePosts }));

      act(() => {
        result.current.updatePostInList('post-2', {
          engagement: { ...mockPosts[0].engagement, comments: 5 }
        });
      });

      expect(result.current.posts[0].engagement.comments).toBe(0); // Unchanged
      expect(result.current.posts[1].engagement.comments).toBe(5); // Updated
      expect(result.current.posts[2].engagement.comments).toBe(0); // Unchanged
    });
  });

  describe('refetchPost', () => {
    it('should refetch post and update state on success', async () => {
      const updatedPost = {
        ...mockPosts[0],
        engagement: { ...mockPosts[0].engagement, comments: 3 }
      };

      (apiService.refetchPost as jest.Mock).mockResolvedValue({
        success: true,
        data: updatedPost
      });

      const { result } = renderHook(() => usePosts({ initialPosts: mockPosts }));

      await act(async () => {
        await result.current.refetchPost('post-1');
      });

      expect(apiService.refetchPost).toHaveBeenCalledWith('post-1');
      expect(result.current.posts[0].engagement.comments).toBe(3);
      expect(result.current.isRefetching).toBe(false);
      expect(result.current.error).toBe(null);
    });

    it('should set error state on refetch failure', async () => {
      const errorMessage = 'Network error';
      (apiService.refetchPost as jest.Mock).mockRejectedValue(new Error(errorMessage));

      const onError = jest.fn();
      const { result } = renderHook(() => usePosts({
        initialPosts: mockPosts,
        onError
      }));

      await act(async () => {
        await result.current.refetchPost('post-1');
      });

      expect(result.current.error).toBe(errorMessage);
      expect(onError).toHaveBeenCalledWith(expect.any(Error));
      expect(result.current.isRefetching).toBe(false);
    });

    it('should set isRefetching flag during refetch', async () => {
      let resolveRefetch: (value: any) => void;
      const refetchPromise = new Promise(resolve => {
        resolveRefetch = resolve;
      });

      (apiService.refetchPost as jest.Mock).mockReturnValue(refetchPromise);

      const { result } = renderHook(() => usePosts({ initialPosts: mockPosts }));

      const refetchPromiseResult = act(async () => {
        return result.current.refetchPost('post-1');
      });

      // Check that isRefetching is true during fetch
      await waitFor(() => {
        expect(result.current.isRefetching).toBe(true);
      });

      // Resolve the refetch
      resolveRefetch!({ success: true, data: mockPosts[0] });
      await refetchPromiseResult;

      // Check that isRefetching is false after fetch
      expect(result.current.isRefetching).toBe(false);
    });
  });

  describe('Optimistic Update + Refetch Pattern', () => {
    it('should optimistically update then confirm with refetch', async () => {
      const { result } = renderHook(() => usePosts({ initialPosts: mockPosts }));

      // Optimistic update
      act(() => {
        result.current.updatePostInList('post-1', {
          engagement: { ...mockPosts[0].engagement, comments: 1 }
        });
      });

      expect(result.current.posts[0].engagement.comments).toBe(1);

      // Refetch to confirm
      (apiService.refetchPost as jest.Mock).mockResolvedValue({
        success: true,
        data: {
          ...mockPosts[0],
          engagement: { ...mockPosts[0].engagement, comments: 1 }
        }
      });

      await act(async () => {
        await result.current.refetchPost('post-1');
      });

      expect(result.current.posts[0].engagement.comments).toBe(1);
    });

    it('should handle server returning different count than optimistic', async () => {
      const { result } = renderHook(() => usePosts({ initialPosts: mockPosts }));

      // Optimistic update: +1
      act(() => {
        result.current.updatePostInList('post-1', {
          engagement: { ...mockPosts[0].engagement, comments: 1 }
        });
      });

      expect(result.current.posts[0].engagement.comments).toBe(1);

      // Server returns 2 (another user commented simultaneously)
      (apiService.refetchPost as jest.Mock).mockResolvedValue({
        success: true,
        data: {
          ...mockPosts[0],
          engagement: { ...mockPosts[0].engagement, comments: 2 }
        }
      });

      await act(async () => {
        await result.current.refetchPost('post-1');
      });

      expect(result.current.posts[0].engagement.comments).toBe(2);
    });
  });
});
```

**Validation**:
- [ ] All tests pass
- [ ] 100% code coverage for usePosts hook
- [ ] Tests follow TDD London School pattern
- [ ] Tests cover error scenarios

---

## Phase 2: Component Integration

### Step 2.1: Modify SocialMediaFeed to Use usePosts Hook

**File**: `/workspaces/agent-feed/frontend/src/components/SocialMediaFeed.tsx`

**Changes Required**:

```diff
  import { apiService } from '@/services/api';
  import { useDebounce } from '../hooks/useDebounce';
+ import { usePosts } from '../hooks/usePosts';

  const SocialMediaFeed: React.FC<SocialMediaFeedProps> = memo(({ className = '' }) => {
-   const [posts, setPosts] = useState<AgentPost[]>([]);
+   const { posts, setPosts, updatePostInList, refetchPost, isRefetching } = usePosts();

    // ... existing code ...

    // EXISTING WebSocket handler (line ~191) - Keep as is
    const handleCommentCreated = (data: any) => {
      setPosts(prev => prev.map(post => {
        if (post.id === data.postId) {
          return {
            ...post,
            comments: (post.comments || 0) + 1
          };
        }
        return post;
      }));
    };

+   /**
+    * Handle refetch request from CommentForm
+    * Provides fallback if WebSocket doesn't update
+    */
+   const handleRefetchPost = useCallback(async (postId: string) => {
+     await refetchPost(postId);
+   }, [refetchPost]);

    // ... rest of component ...

    return (
      <div className={cn('space-y-4', className)}>
        {/* ... existing JSX ... */}
        {posts.map(post => (
          <PostCard
            key={post.id}
            post={post}
+           onRefetchNeeded={handleRefetchPost}
          />
        ))}
      </div>
    );
  });
```

**Validation**:
- [ ] Component uses usePosts hook
- [ ] WebSocket handler still works
- [ ] Refetch callback passed to children
- [ ] No TypeScript errors
- [ ] No runtime errors

---

### Step 2.2: Modify CommentForm to Trigger Refetch

**File**: `/workspaces/agent-feed/frontend/src/components/CommentForm.tsx`

**Changes Required**:

```diff
  interface CommentFormProps {
    postId: string;
    parentId?: string;
    currentUser?: string;
    onCommentAdded?: () => void;
+   onRefetchNeeded?: (postId: string) => Promise<void>;
+   currentCommentCount?: number;
    placeholder?: string;
    // ... existing props ...
  }

  export const CommentForm: React.FC<CommentFormProps> = ({
    postId,
    parentId,
    currentUser = 'current-user',
    onCommentAdded,
+   onRefetchNeeded,
+   currentCommentCount = 0,
    // ... existing props ...
  }) => {
    const [content, setContent] = useState('');
    const [isSubmitting, setIsSubmitting] = useState(false);
    const [error, setError] = useState('');

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

+     // STEP 1: Optimistic update (via parent callback)
+     const optimisticCount = currentCommentCount + 1;

      try {
        console.log('Submitting comment via API service:', {
          postId,
          content: content.trim(),
          parentId,
          author: currentUser
        });

-       const result = await apiService.createComment(postId, content.trim(), {
+       // STEP 2: Create comment on server
+       await apiService.createComment(postId, content.trim(), {
          parentId: parentId || undefined,
          author: currentUser,
          mentionedUsers: useMentionInput ? MentionService.extractMentions(content) : extractMentions(content)
        });

-       console.log('Comment submitted successfully:', result);
+       console.log('Comment submitted successfully');

        setContent('');
+
+       // STEP 3: Trigger parent callbacks
        onCommentAdded?.();
+
+       // STEP 4: Refetch post to confirm counter (fallback for WebSocket)
+       if (onRefetchNeeded) {
+         console.log('🔄 Triggering post refetch for comment counter update');
+         await onRefetchNeeded(postId);
+       }
+
      } catch (error) {
        console.error('Comment submission failed:', error);
        setError(error instanceof Error ? error.message : 'Failed to post technical analysis');
+
+       // STEP 5: Rollback not needed here - parent will handle via refetch failure
      } finally {
        setIsSubmitting(false);
      }
    };

    // ... rest of component unchanged ...
  };
```

**Validation**:
- [ ] Props updated correctly
- [ ] Refetch triggered after comment creation
- [ ] Error handling preserved
- [ ] Loading states work correctly
- [ ] No TypeScript errors

---

### Step 2.3: Update Post Display Component (Need to Identify)

**Action Required**: Locate where comment counter is displayed

**Search Strategy**:
```bash
# Find components that display comment count
grep -rn "post.comments\|comments:" frontend/src/components/*.tsx

# Or look for comment-related icons
grep -rn "MessageCircle\|comment-count" frontend/src/components/*.tsx
```

**Expected Pattern**:
```tsx
// Likely in ExpandablePost.tsx, PostCard.tsx, or similar
<div className="engagement-stats">
  <MessageCircle className="w-4 h-4" />
  <span data-testid="comment-count">{post.engagement?.comments || 0}</span>
</div>
```

**Required Change**: Ensure counter reads from `post.engagement.comments` (already using state)

**Validation**:
- [ ] Counter display component identified
- [ ] Counter reads from state (not static data)
- [ ] Counter has data-testid for E2E testing
- [ ] Visual indication during refetch (optional)

---

## Phase 3: Testing & Validation

### Step 3.1: Integration Tests

**File**: `/workspaces/agent-feed/frontend/src/components/__tests__/CommentForm.refetch.test.tsx`

```typescript
/**
 * CommentForm Refetch Integration Tests
 */

import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { CommentForm } from '../CommentForm';
import { apiService } from '../../services/api';

jest.mock('../../services/api');

describe('CommentForm - Refetch Integration', () => {
  const mockApiService = apiService as jest.Mocked<typeof apiService>;

  beforeEach(() => {
    jest.clearAllMocks();
    mockApiService.createComment.mockResolvedValue({
      success: true,
      data: { id: 'comment-1', content: 'Test' }
    });
  });

  it('should call onRefetchNeeded after successful comment submission', async () => {
    const onRefetchNeeded = jest.fn().mockResolvedValue(undefined);
    const user = userEvent.setup();

    render(
      <CommentForm
        postId="post-123"
        onRefetchNeeded={onRefetchNeeded}
        currentCommentCount={0}
      />
    );

    const input = screen.getByPlaceholderText(/provide technical analysis/i);
    const button = screen.getByRole('button', { name: /post analysis/i });

    await user.type(input, 'Test comment');
    await user.click(button);

    await waitFor(() => {
      expect(onRefetchNeeded).toHaveBeenCalledWith('post-123');
    });
  });

  it('should not call onRefetchNeeded if comment creation fails', async () => {
    mockApiService.createComment.mockRejectedValue(new Error('API Error'));
    const onRefetchNeeded = jest.fn();
    const user = userEvent.setup();

    render(
      <CommentForm
        postId="post-123"
        onRefetchNeeded={onRefetchNeeded}
      />
    );

    const input = screen.getByPlaceholderText(/provide technical analysis/i);
    const button = screen.getByRole('button', { name: /post analysis/i });

    await user.type(input, 'Test comment');
    await user.click(button);

    await waitFor(() => {
      expect(mockApiService.createComment).toHaveBeenCalled();
    });

    expect(onRefetchNeeded).not.toHaveBeenCalled();
  });
});
```

**Validation**:
- [ ] All integration tests pass
- [ ] Refetch callback tested
- [ ] Error scenarios covered

---

### Step 3.2: E2E Tests with Playwright

**File**: `/workspaces/agent-feed/tests/e2e/comment-counter.spec.ts`

```typescript
/**
 * Comment Counter E2E Tests
 * Tests real user workflows with actual backend
 */

import { test, expect } from '@playwright/test';

test.describe('Comment Counter Real-time Updates', () => {
  test.beforeEach(async ({ page }) => {
    // Navigate to feed
    await page.goto('http://localhost:5173/');

    // Wait for posts to load
    await page.waitForSelector('[data-testid="post-card"]', { timeout: 10000 });
  });

  test('comment counter updates within 500ms after posting comment', async ({ page }) => {
    // Find first post
    const firstPost = page.locator('[data-testid="post-card"]').first();
    const commentCounter = firstPost.locator('[data-testid="comment-count"]');

    // Get initial count
    const initialCountText = await commentCounter.textContent();
    const initialCount = parseInt(initialCountText || '0', 10);

    // Expand post to show comment form
    const expandButton = firstPost.locator('[data-testid="expand-button"]');
    await expandButton.click();

    // Wait for comment form to appear
    await page.waitForSelector('[data-testid="comment-input"]');

    // Type comment
    const commentInput = page.locator('[data-testid="comment-input"]');
    await commentInput.fill('E2E test comment from Playwright');

    // Submit comment
    const startTime = Date.now();
    const submitButton = page.locator('[data-testid="submit-comment"]');
    await submitButton.click();

    // Wait for counter to update (max 500ms per spec)
    await expect(commentCounter).toHaveText(
      String(initialCount + 1),
      { timeout: 500 }
    );

    const updateTime = Date.now() - startTime;
    console.log(`✅ Counter updated in ${updateTime}ms`);

    // Verify update time meets requirement
    expect(updateTime).toBeLessThan(500);
  });

  test('worker outcome comment updates counter', async ({ page, request }) => {
    // Create a new post first
    await page.locator('[data-testid="create-post-button"]').click();
    await page.locator('[data-testid="post-title"]').fill('Test Post for Worker');
    await page.locator('[data-testid="post-content"]').fill('Test content');
    await page.locator('[data-testid="submit-post"]').click();

    // Wait for post to appear
    await page.waitForSelector('[data-testid="post-card"]', { timeout: 5000 });

    // Get the post ID from the newly created post
    const newPost = page.locator('[data-testid="post-card"]').first();
    const postId = await newPost.getAttribute('data-post-id');

    // Get initial comment count
    const commentCounter = newPost.locator('[data-testid="comment-count"]');
    const initialCountText = await commentCounter.textContent();
    const initialCount = parseInt(initialCountText || '0', 10);

    // Simulate worker posting outcome comment via API (skipTicket=true)
    const startTime = Date.now();

    await request.post(`http://localhost:3001/api/agent-posts/${postId}/comments`, {
      data: {
        content: 'Worker outcome: Task completed successfully',
        author: 'test-worker-agent',
        skipTicket: true
      },
      headers: {
        'Content-Type': 'application/json'
      }
    });

    // Verify counter updates within 500ms
    await expect(commentCounter).toHaveText(
      String(initialCount + 1),
      { timeout: 500 }
    );

    const updateTime = Date.now() - startTime;
    console.log(`✅ Worker comment counter updated in ${updateTime}ms`);

    expect(updateTime).toBeLessThan(500);
  });

  test('multiple rapid comments handled correctly', async ({ page }) => {
    const firstPost = page.locator('[data-testid="post-card"]').first();
    const commentCounter = firstPost.locator('[data-testid="comment-count"]');

    // Get initial count
    const initialCountText = await commentCounter.textContent();
    const initialCount = parseInt(initialCountText || '0', 10);

    // Expand post
    await firstPost.locator('[data-testid="expand-button"]').click();
    await page.waitForSelector('[data-testid="comment-input"]');

    // Post 3 comments rapidly
    for (let i = 1; i <= 3; i++) {
      const commentInput = page.locator('[data-testid="comment-input"]');
      await commentInput.fill(`Rapid comment ${i}`);

      const submitButton = page.locator('[data-testid="submit-comment"]');
      await submitButton.click();

      // Wait for submission to complete
      await page.waitForTimeout(200);
    }

    // Verify final count is correct (initial + 3)
    await expect(commentCounter).toHaveText(
      String(initialCount + 3),
      { timeout: 1000 }
    );
  });

  test('comment counter rolls back on failed submission', async ({ page }) => {
    // TODO: Implement by mocking network failure or invalid comment
    // This requires service worker or request interception
  });

  test('page refresh preserves correct counter', async ({ page }) => {
    // Post a comment
    const firstPost = page.locator('[data-testid="post-card"]').first();
    await firstPost.locator('[data-testid="expand-button"]').click();

    const commentInput = page.locator('[data-testid="comment-input"]');
    await commentInput.fill('Test comment before refresh');

    const submitButton = page.locator('[data-testid="submit-comment"]');
    await submitButton.click();

    // Wait for counter to update
    await page.waitForTimeout(600);

    // Get updated count
    const commentCounter = firstPost.locator('[data-testid="comment-count"]');
    const countBeforeRefresh = await commentCounter.textContent();

    // Refresh page
    await page.reload();

    // Wait for posts to load
    await page.waitForSelector('[data-testid="post-card"]');

    // Verify counter persists
    const newFirstPost = page.locator('[data-testid="post-card"]').first();
    const counterAfterRefresh = newFirstPost.locator('[data-testid="comment-count"]');

    expect(await counterAfterRefresh.textContent()).toBe(countBeforeRefresh);
  });
});
```

**Validation**:
- [ ] All E2E tests pass
- [ ] Tests run against real backend
- [ ] Performance requirement (<500ms) validated
- [ ] Worker outcome scenario tested
- [ ] Edge cases covered

---

## Phase 4: Optimization & Polish

### Step 4.1: Add Debouncing (Optional)

If rapid comment submissions cause issues:

```typescript
// In CommentForm.tsx
import { useDebounce } from '../hooks/useDebounce';

const debouncedRefetch = useMemo(
  () => debounce(async (postId: string) => {
    if (onRefetchNeeded) {
      await onRefetchNeeded(postId);
    }
  }, 300),
  [onRefetchNeeded]
);
```

### Step 4.2: Add Loading Indicator (Optional)

```typescript
// In post display component
<div className="flex items-center space-x-2">
  <MessageCircle className="w-4 h-4" />
  <span data-testid="comment-count">
    {isRefetching ? (
      <Loader2 className="w-4 h-4 animate-spin" />
    ) : (
      post.engagement?.comments || 0
    )}
  </span>
</div>
```

### Step 4.3: Add Performance Monitoring

```typescript
// In CommentForm.tsx handleSubmit
const startTime = performance.now();

await onRefetchNeeded(postId);

const duration = performance.now() - startTime;
console.log(`Comment counter updated in ${duration.toFixed(2)}ms`);

// Optional: Track in analytics
if (engagementTracker) {
  engagementTracker.trackPerformance({
    action: 'comment_counter_update',
    duration,
    postId
  });
}
```

---

## Deployment Checklist

### Pre-Deployment
- [ ] All unit tests pass (npm run test)
- [ ] All integration tests pass
- [ ] All E2E tests pass (npm run test:e2e)
- [ ] TypeScript compilation succeeds (npm run typecheck)
- [ ] No linting errors (npm run lint)
- [ ] Manual testing completed
- [ ] Code review approved
- [ ] Documentation updated

### Deployment
- [ ] Create feature branch: `git checkout -b fix/comment-counter-refetch`
- [ ] Commit changes with clear message
- [ ] Push to remote
- [ ] Create pull request
- [ ] Wait for CI/CD pipeline
- [ ] Deploy to staging environment
- [ ] Smoke test on staging
- [ ] Deploy to production
- [ ] Monitor for errors

### Post-Deployment
- [ ] Verify counter updates in production
- [ ] Monitor performance metrics
- [ ] Check error logs
- [ ] User acceptance testing
- [ ] Update issue tracker
- [ ] Document lessons learned

---

## Troubleshooting Guide

### Issue: Counter doesn't update
**Diagnosis**:
1. Check browser console for errors
2. Verify refetch callback is passed to CommentForm
3. Check network tab for POST and GET requests
4. Verify API service refetchPost method exists

**Solution**:
```typescript
// Add debug logging
console.log('🔍 Refetch callback provided:', !!onRefetchNeeded);
console.log('🔍 Calling refetch for post:', postId);
```

---

### Issue: Counter updates too slowly (>500ms)
**Diagnosis**:
1. Check network latency
2. Verify backend response time
3. Check for network throttling in DevTools

**Solution**:
- Use optimistic updates immediately
- Add loading spinner
- Consider WebSocket as primary mechanism

---

### Issue: Race condition with multiple comments
**Diagnosis**:
- Multiple refetch calls overlap
- Counter shows incorrect value

**Solution**:
```typescript
// Add request sequencing
const refetchQueue = useRef<Promise<void>>(Promise.resolve());

const refetchPost = useCallback(async (postId: string) => {
  refetchQueue.current = refetchQueue.current.then(() =>
    apiService.refetchPost(postId)
  );
  return refetchQueue.current;
}, []);
```

---

### Issue: TypeScript errors after implementation
**Common Errors**:
```typescript
// Error: Property 'refetchPost' does not exist
// Solution: Ensure api.ts is saved and TypeScript server restarted

// Error: Cannot find module '../hooks/usePosts'
// Solution: Verify file path and extension (.ts not .tsx)
```

---

## Success Criteria

### Functional ✅
- [ ] Counter shows 0 initially
- [ ] Counter increments after manual comment
- [ ] Counter increments after worker comment
- [ ] Counter shows correct value after page refresh
- [ ] Counter rolls back on error (if applicable)

### Performance ✅
- [ ] Update time <500ms (measured in E2E tests)
- [ ] No visible flicker or jank
- [ ] Smooth user experience

### Quality ✅
- [ ] 100% test coverage for new code
- [ ] No TypeScript errors
- [ ] No linting warnings
- [ ] No console errors
- [ ] Code follows existing patterns

---

## Next Steps After Implementation

1. **Monitor Production**: Watch error rates and performance metrics
2. **Gather Feedback**: Collect user feedback on counter behavior
3. **Optimize if Needed**: Consider React Query migration for better performance
4. **Document Learnings**: Update team knowledge base

---

**Implementation Guide Complete**
**Ready to Begin**: Phase 1, Step 1.1 (Create usePosts Hook)
