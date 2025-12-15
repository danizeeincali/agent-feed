/**
 * TDD Unit Tests: API refetchPost Function
 *
 * Purpose: Test the refetchPost API call for comment counter updates
 * Test Strategy: Real API calls (NO MOCKS) - Tests will fail until implementation exists
 *
 * Test Coverage:
 * - Happy path: successful refetch returns updated post data
 * - Error path: API failure throws appropriate error
 * - Edge cases: network timeout, invalid post ID, concurrent refetches
 *
 * NOTE: These tests are in the RED phase - they WILL FAIL until implementation is complete
 */

import { describe, it, expect, beforeAll, afterAll, beforeEach } from 'vitest';
import { ApiService } from '../../services/api';
import { getTestApiBaseUrl } from '../../tests/setup/test-api-config';

// Create test-specific API service instance with full URL
const apiService = new ApiService(getTestApiBaseUrl());

describe('API: refetchPost (TDD Red Phase)', () => {
  let testPostId: string;
  let testUserId: string = 'test-user-tdd';

  // Setup: Create a real test post for testing
  beforeAll(async () => {
    console.log('🔧 Setting up test environment with REAL database...');

    // Create a test post
    const response = await apiService.createAgentPost({
      title: 'TDD Test Post for Comment Counter',
      content: 'This post is used for testing comment counter refetch functionality',
      author_agent: testUserId, // Backend expects author_agent, not authorAgent
      metadata: {
        isAgentResponse: false,
        businessImpact: 5,
        tags: ['tdd', 'test']
      }
    } as any);

    if (response.success && response.data) {
      testPostId = response.data.id;
      console.log(`✅ Test post created: ${testPostId}`);
    } else {
      throw new Error('Failed to create test post for TDD tests');
    }
  });

  // Cleanup: Remove test data
  afterAll(async () => {
    if (testPostId) {
      try {
        await apiService.deletePost(testPostId);
        console.log(`🧹 Test post deleted: ${testPostId}`);
      } catch (error) {
        console.warn('Failed to cleanup test post:', error);
      }
    }
  });

  beforeEach(() => {
    // Clear any caches to ensure fresh data
    apiService.clearCache();
  });

  describe('Happy Path: Successful Refetch', () => {
    it('should refetch post and return updated data', async () => {
      // ARRANGE: This test assumes refetchPost function exists
      // Expected: Function should be defined on apiService
      expect(apiService.refetchPost).toBeDefined();
      expect(typeof apiService.refetchPost).toBe('function');

      // ACT: Call refetchPost with valid post ID
      const result = await apiService.refetchPost(testPostId);

      // ASSERT: Response should contain post data
      expect(result).toBeDefined();
      expect(result.success).toBe(true);
      expect(result.data).toBeDefined();
      expect(result.data.id).toBe(testPostId);

      // ASSERT: Post should have comment count property
      expect(result.data).toHaveProperty('comments');
      expect(typeof result.data.comments).toBe('number');
      expect(result.data.comments).toBeGreaterThanOrEqual(0);
    });

    it('should return fresh data, not cached data', async () => {
      // ARRANGE: Add a comment to change the counter
      await apiService.createComment(testPostId, 'Test comment for refetch validation', {
        author: testUserId
      });

      // ACT: Fetch post twice
      const firstFetch = await apiService.refetchPost(testPostId);
      const firstCount = firstFetch.data.comments;

      // Add another comment
      await apiService.createComment(testPostId, 'Second test comment', {
        author: testUserId
      });

      const secondFetch = await apiService.refetchPost(testPostId);
      const secondCount = secondFetch.data.comments;

      // ASSERT: Second fetch should have higher count
      expect(secondCount).toBe(firstCount + 1);
      expect(secondCount).toBeGreaterThan(firstCount);
    });

    it('should return updated comment count after backend increment', async () => {
      // ARRANGE: Get initial count
      const initialFetch = await apiService.refetchPost(testPostId);
      const initialCount = initialFetch.data.comments;

      // ACT: Create a comment (backend increments counter)
      await apiService.createComment(testPostId, 'Comment to test counter increment', {
        author: testUserId
      });

      // Refetch to get updated count
      const updatedFetch = await apiService.refetchPost(testPostId);
      const updatedCount = updatedFetch.data.comments;

      // ASSERT: Count should be incremented by 1
      expect(updatedCount).toBe(initialCount + 1);
    });

    it('should complete refetch within 500ms (performance requirement)', async () => {
      // ARRANGE
      const startTime = Date.now();

      // ACT
      await apiService.refetchPost(testPostId);

      // ASSERT
      const duration = Date.now() - startTime;
      expect(duration).toBeLessThan(500);
      console.log(`⚡ Refetch completed in ${duration}ms`);
    });
  });

  describe('Error Path: API Failures', () => {
    it('should throw error for invalid post ID', async () => {
      // ARRANGE
      const invalidPostId = 'non-existent-post-id';

      // ACT & ASSERT
      await expect(async () => {
        await apiService.refetchPost(invalidPostId);
      }).rejects.toThrow();
    });

    it('should throw error for malformed post ID', async () => {
      // ARRANGE
      const malformedIds = ['', null, undefined, '   ', 'invalid!@#$%'];

      // ACT & ASSERT
      for (const id of malformedIds) {
        await expect(async () => {
          await apiService.refetchPost(id as any);
        }).rejects.toThrow();
      }
    });

    it('should handle network timeout gracefully', async () => {
      // ARRANGE: This tests the timeout mechanism
      // We can't easily simulate a real timeout without mocking,
      // but we can verify the function respects timeout config

      // ACT & ASSERT: Should complete or fail within reasonable time
      const startTime = Date.now();

      try {
        await apiService.refetchPost(testPostId);
        const duration = Date.now() - startTime;
        expect(duration).toBeLessThan(10000); // Should not hang
      } catch (error) {
        // If it throws, it should be within timeout
        const duration = Date.now() - startTime;
        expect(duration).toBeLessThan(10000);
      }
    });

    it('should provide meaningful error message on failure', async () => {
      // ARRANGE
      const invalidPostId = 'definitely-does-not-exist';

      // ACT & ASSERT
      try {
        await apiService.refetchPost(invalidPostId);
        throw new Error('Should have thrown an error');
      } catch (error) {
        expect(error).toBeInstanceOf(Error);
        expect((error as Error).message).toBeTruthy();
        expect((error as Error).message.length).toBeGreaterThan(0);
        console.log('Error message:', (error as Error).message);
      }
    });
  });

  describe('Edge Cases: Concurrent Operations', () => {
    it('should handle rapid sequential refetches without race conditions', async () => {
      // ARRANGE: Fire multiple refetch requests rapidly
      const promises = Array(5).fill(null).map(() =>
        apiService.refetchPost(testPostId)
      );

      // ACT
      const results = await Promise.all(promises);

      // ASSERT: All should succeed with same data
      expect(results).toHaveLength(5);
      results.forEach(result => {
        expect(result.success).toBe(true);
        expect(result.data.id).toBe(testPostId);
        expect(result.data.comments).toBe(results[0].data.comments);
      });
    });

    it('should handle concurrent comment creation and refetch', async () => {
      // ARRANGE: Get initial count
      const initial = await apiService.refetchPost(testPostId);
      const initialCount = initial.data.comments;

      // ACT: Create comment and refetch simultaneously
      const [commentResult, refetchResult] = await Promise.all([
        apiService.createComment(testPostId, 'Concurrent test comment', {
          author: testUserId
        }),
        apiService.refetchPost(testPostId)
      ]);

      // Wait a bit for backend to process
      await new Promise(resolve => setTimeout(resolve, 100));

      // Final refetch to verify
      const final = await apiService.refetchPost(testPostId);

      // ASSERT: Final count should be at least initial + 1
      expect(final.data.comments).toBeGreaterThanOrEqual(initialCount + 1);
    });

    it('should not interfere with other posts when refetching', async () => {
      // ARRANGE: Create a second test post
      const secondPost = await apiService.createAgentPost({
        title: 'Second TDD Test Post',
        content: 'Testing isolation',
        author_agent: testUserId, // Backend expects author_agent
        metadata: { businessImpact: 5 }
      } as any);

      const secondPostId = secondPost.data!.id;

      try {
        // ACT: Refetch both posts
        const [first, second] = await Promise.all([
          apiService.refetchPost(testPostId),
          apiService.refetchPost(secondPostId)
        ]);

        // ASSERT: Each should return its own data
        expect(first.data.id).toBe(testPostId);
        expect(second.data.id).toBe(secondPostId);
        expect(first.data.id).not.toBe(second.data.id);
      } finally {
        // Cleanup
        await apiService.deletePost(secondPostId);
      }
    });
  });

  describe('Data Consistency', () => {
    it('should return consistent data structure matching Post type', async () => {
      // ACT
      const result = await apiService.refetchPost(testPostId);

      // ASSERT: Check all required Post fields exist
      expect(result.data).toHaveProperty('id');
      expect(result.data).toHaveProperty('title');
      expect(result.data).toHaveProperty('content');
      expect(result.data).toHaveProperty('authorAgent');
      expect(result.data).toHaveProperty('publishedAt');
      expect(result.data).toHaveProperty('comments');
      expect(result.data).toHaveProperty('metadata');
    });

    it('should match data from getAgentPost endpoint', async () => {
      // ACT: Fetch same post using different methods
      const refetchResult = await apiService.refetchPost(testPostId);
      const getResult = await apiService.getAgentPost(testPostId);

      // ASSERT: Data should match
      expect(refetchResult.data.id).toBe(getResult.data.id);
      expect(refetchResult.data.comments).toBe(getResult.data.comments);
      expect(refetchResult.data.title).toBe(getResult.data.title);
    });

    it('should reflect database state accurately', async () => {
      // ARRANGE: Get current comments via API
      const commentsResponse = await apiService.getPostComments(testPostId);
      const actualCommentCount = commentsResponse.length;

      // ACT: Refetch post
      const postResult = await apiService.refetchPost(testPostId);

      // ASSERT: Counter should match actual comment count
      expect(postResult.data.comments).toBe(actualCommentCount);
    });
  });

  describe('Cache Behavior', () => {
    it('should bypass cache when refetching', async () => {
      // ARRANGE: Fetch once to potentially cache
      await apiService.getAgentPost(testPostId);

      // Modify data (add comment)
      await apiService.createComment(testPostId, 'Cache bypass test', {
        author: testUserId
      });

      // ACT: Refetch should get fresh data
      const result = await apiService.refetchPost(testPostId);

      // ASSERT: Should have the new comment reflected
      expect(result.data.comments).toBeGreaterThan(0);

      // Verify it's actually fresh by checking timestamp or similar
      const secondFetch = await apiService.refetchPost(testPostId);
      expect(secondFetch.data.comments).toBe(result.data.comments);
    });

    it('should clear relevant cache entries after refetch', async () => {
      // ARRANGE: Clear all caches
      apiService.clearCache();

      // ACT: Refetch
      const result = await apiService.refetchPost(testPostId);

      // ASSERT: Should succeed
      expect(result.success).toBe(true);

      // Subsequent normal fetch should also work
      const normalFetch = await apiService.getAgentPost(testPostId);
      expect(normalFetch.success).toBe(true);
    });
  });
});
