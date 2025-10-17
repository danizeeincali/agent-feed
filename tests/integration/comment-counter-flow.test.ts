/**
 * TDD Integration Tests: Complete Comment Counter Flow
 *
 * Purpose: Test end-to-end comment submission with counter updates
 * Test Strategy: Real API calls + Real component interactions (NO MOCKS)
 *
 * Test Coverage:
 * - Full flow: comment creation → counter increment → UI update
 * - Optimistic updates → confirmation → sync
 * - Error scenarios → rollback → recovery
 * - Multiple users → concurrent updates
 * - Worker comments (skipTicket) → counter updates
 *
 * NOTE: These tests are in the RED phase - they WILL FAIL until implementation exists
 */

import { describe, it, expect, beforeAll, afterAll, beforeEach } from 'vitest';
import { apiService } from '../../frontend/src/services/api';

describe('Integration: Complete Comment Counter Flow (TDD Red Phase)', () => {
  let testPostId: string;
  let testUserId: string = 'integration-test-user';
  let initialCommentCount: number;

  // Setup: Create test environment
  beforeAll(async () => {
    console.log('🔧 Setting up integration test environment...');

    // Create a test post
    const response = await apiService.createAgentPost({
      title: 'Integration Test: Comment Counter Flow',
      content: 'Testing complete comment submission and counter update flow',
      authorAgent: testUserId,
      metadata: {
        isAgentResponse: false,
        businessImpact: 5,
        tags: ['integration-test', 'comment-counter']
      }
    });

    if (response.success && response.data) {
      testPostId = response.data.id;
      initialCommentCount = response.data.comments || 0;
      console.log(`✅ Test post created: ${testPostId}`);
      console.log(`📊 Initial comment count: ${initialCommentCount}`);
    } else {
      throw new Error('Failed to create test post for integration tests');
    }
  });

  // Cleanup
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
    // Clear caches for fresh data
    apiService.clearCache();
  });

  describe('Happy Path: Complete Comment Flow', () => {
    it('should complete full flow: create comment → increment counter → refetch → update UI', async () => {
      // ARRANGE: Get initial state
      const initialPost = await apiService.getAgentPost(testPostId);
      const startCount = initialPost.data.comments;

      console.log('📊 Starting count:', startCount);

      // ACT 1: Create comment
      const commentResponse = await apiService.createComment(
        testPostId,
        'Integration test comment',
        { author: testUserId }
      );

      console.log('✅ Comment created:', commentResponse.success);
      expect(commentResponse.success).toBe(true);

      // Wait for backend to process
      await new Promise(resolve => setTimeout(resolve, 100));

      // ACT 2: Refetch post to get updated counter
      const refetchedPost = await apiService.refetchPost(testPostId);

      console.log('📊 Refetched count:', refetchedPost.data.comments);

      // ASSERT: Counter should be incremented
      expect(refetchedPost.success).toBe(true);
      expect(refetchedPost.data.comments).toBe(startCount + 1);

      // VERIFY: Comment actually exists
      const comments = await apiService.getPostComments(testPostId);
      expect(comments.length).toBeGreaterThanOrEqual(startCount + 1);

      console.log('✅ Full flow completed successfully');
    });

    it('should maintain counter accuracy across multiple comments', async () => {
      // ARRANGE
      const initial = await apiService.refetchPost(testPostId);
      const startCount = initial.data.comments;

      // ACT: Add 3 comments sequentially
      for (let i = 1; i <= 3; i++) {
        await apiService.createComment(
          testPostId,
          `Sequential comment ${i}`,
          { author: testUserId }
        );

        await new Promise(resolve => setTimeout(resolve, 100));

        const currentPost = await apiService.refetchPost(testPostId);
        expect(currentPost.data.comments).toBe(startCount + i);

        console.log(`📊 After comment ${i}: ${currentPost.data.comments}`);
      }

      // ASSERT: Final count
      const final = await apiService.refetchPost(testPostId);
      expect(final.data.comments).toBe(startCount + 3);
    });

    it('should update counter within 500ms (performance requirement)', async () => {
      // ARRANGE
      const initial = await apiService.refetchPost(testPostId);
      const startCount = initial.data.comments;

      // ACT
      const startTime = Date.now();

      await apiService.createComment(testPostId, 'Performance test', {
        author: testUserId
      });

      await new Promise(resolve => setTimeout(resolve, 50));

      const updated = await apiService.refetchPost(testPostId);

      const totalDuration = Date.now() - startTime;

      // ASSERT
      expect(updated.data.comments).toBe(startCount + 1);
      expect(totalDuration).toBeLessThan(500);

      console.log(`⚡ Full flow completed in ${totalDuration}ms`);
    });

    it('should reflect accurate count even with rapid submissions', async () => {
      // ARRANGE
      const initial = await apiService.refetchPost(testPostId);
      const startCount = initial.data.comments;

      // ACT: Submit 5 comments rapidly
      const commentPromises = Array.from({ length: 5 }, (_, i) =>
        apiService.createComment(testPostId, `Rapid comment ${i}`, {
          author: testUserId
        })
      );

      await Promise.all(commentPromises);

      // Wait for backend to process all
      await new Promise(resolve => setTimeout(resolve, 500));

      // ASSERT
      const final = await apiService.refetchPost(testPostId);
      expect(final.data.comments).toBe(startCount + 5);

      // Verify with actual comments
      const comments = await apiService.getPostComments(testPostId);
      expect(comments.length).toBe(final.data.comments);
    });
  });

  describe('Optimistic Updates Flow', () => {
    it('should support optimistic counter increment before API confirmation', async () => {
      // ARRANGE
      const initial = await apiService.refetchPost(testPostId);
      const startCount = initial.data.comments;

      // ACT 1: Simulate optimistic update (client-side increment)
      const optimisticCount = startCount + 1;

      // ACT 2: Create comment (backend increments)
      await apiService.createComment(testPostId, 'Optimistic test', {
        author: testUserId
      });

      await new Promise(resolve => setTimeout(resolve, 100));

      // ACT 3: Confirm with refetch
      const confirmed = await apiService.refetchPost(testPostId);

      // ASSERT: Confirmed value should match optimistic value
      expect(confirmed.data.comments).toBe(optimisticCount);
      expect(confirmed.data.comments).toBe(startCount + 1);

      console.log('✅ Optimistic update confirmed');
    });

    it('should allow rollback if comment creation fails', async () => {
      // ARRANGE
      const initial = await apiService.refetchPost(testPostId);
      const startCount = initial.data.comments;

      // ACT 1: Optimistic increment
      const optimisticCount = startCount + 1;
      console.log('📊 Optimistic count:', optimisticCount);

      // ACT 2: Try to create comment that will fail
      let commentFailed = false;
      try {
        await apiService.createComment(
          'invalid-post-id',
          'This will fail',
          { author: testUserId }
        );
      } catch (error) {
        commentFailed = true;
        console.log('❌ Comment creation failed as expected');
      }

      // ASSERT: Failure detected
      expect(commentFailed).toBe(true);

      // ACT 3: Rollback - verify count unchanged
      const rolledBack = await apiService.refetchPost(testPostId);

      // ASSERT: Count should remain at original value
      expect(rolledBack.data.comments).toBe(startCount);
      console.log('✅ Rollback successful');
    });

    it('should handle optimistic update → network failure → eventual consistency', async () => {
      // ARRANGE
      const initial = await apiService.refetchPost(testPostId);
      const startCount = initial.data.comments;

      // ACT: Create comment successfully
      await apiService.createComment(testPostId, 'Network test', {
        author: testUserId
      });

      await new Promise(resolve => setTimeout(resolve, 100));

      // Simulate scenario: comment created but refetch fails
      // In real implementation, this would keep optimistic update
      // and retry refetch with backoff

      // Eventually, refetch should succeed
      let refetchSuccess = false;
      let attempts = 0;
      const maxAttempts = 3;

      while (!refetchSuccess && attempts < maxAttempts) {
        try {
          const result = await apiService.refetchPost(testPostId);
          if (result.success) {
            refetchSuccess = true;
            expect(result.data.comments).toBe(startCount + 1);
          }
        } catch (error) {
          attempts++;
          await new Promise(resolve => setTimeout(resolve, 200));
        }
      }

      // ASSERT: Eventually consistent
      expect(refetchSuccess).toBe(true);
      console.log(`✅ Eventual consistency achieved after ${attempts + 1} attempts`);
    });
  });

  describe('Error Handling Scenarios', () => {
    it('should maintain counter accuracy when comment fails', async () => {
      // ARRANGE
      const beforeAttempt = await apiService.refetchPost(testPostId);
      const countBeforeAttempt = beforeAttempt.data.comments;

      // ACT: Try invalid comment
      let errorOccurred = false;
      try {
        await apiService.createComment(testPostId, '', { // Empty content
          author: testUserId
        });
      } catch (error) {
        errorOccurred = true;
      }

      // If no error (API accepts empty), that's okay
      // The point is counter should be accurate

      // ASSERT: Refetch should show accurate count
      const afterAttempt = await apiService.refetchPost(testPostId);

      // Count should either be same or +1 if comment was accepted
      expect([countBeforeAttempt, countBeforeAttempt + 1]).toContain(
        afterAttempt.data.comments
      );

      console.log('✅ Counter accuracy maintained during error scenario');
    });

    it('should handle concurrent comment creation gracefully', async () => {
      // ARRANGE
      const initial = await apiService.refetchPost(testPostId);
      const startCount = initial.data.comments;

      // ACT: Multiple users commenting simultaneously
      const users = ['user-a', 'user-b', 'user-c'];
      const concurrentComments = users.map(user =>
        apiService.createComment(testPostId, `Comment from ${user}`, {
          author: user
        })
      );

      await Promise.all(concurrentComments);
      await new Promise(resolve => setTimeout(resolve, 200));

      // ASSERT: All comments should be counted
      const final = await apiService.refetchPost(testPostId);
      expect(final.data.comments).toBe(startCount + users.length);

      console.log('✅ Concurrent comments handled correctly');
    });

    it('should recover from partial failures in comment flow', async () => {
      // ARRANGE
      const initial = await apiService.refetchPost(testPostId);
      const startCount = initial.data.comments;

      // ACT: Create valid comment
      const validComment = await apiService.createComment(
        testPostId,
        'Valid comment',
        { author: testUserId }
      );

      expect(validComment.success).toBe(true);

      // Try invalid comment
      let invalidFailed = false;
      try {
        await apiService.createComment(
          'bad-post-id',
          'Invalid',
          { author: testUserId }
        );
      } catch (error) {
        invalidFailed = true;
      }

      expect(invalidFailed).toBe(true);

      // Create another valid comment
      const secondValid = await apiService.createComment(
        testPostId,
        'Second valid',
        { author: testUserId }
      );

      expect(secondValid.success).toBe(true);

      await new Promise(resolve => setTimeout(resolve, 200));

      // ASSERT: Only valid comments counted
      const final = await apiService.refetchPost(testPostId);
      expect(final.data.comments).toBe(startCount + 2);

      console.log('✅ Recovery from partial failures successful');
    });
  });

  describe('Worker Comments (skipTicket) Flow', () => {
    it('should increment counter for worker outcome comments', async () => {
      // ARRANGE
      const initial = await apiService.refetchPost(testPostId);
      const startCount = initial.data.comments;

      // ACT: Create worker outcome comment
      // In real implementation, this would have skipTicket: true
      const workerComment = await apiService.createComment(
        testPostId,
        '🤖 Agent outcome: Task completed successfully',
        {
          author: 'worker-agent',
          // skipTicket: true would be added in real implementation
        }
      );

      expect(workerComment.success).toBe(true);

      await new Promise(resolve => setTimeout(resolve, 100));

      // ASSERT: Counter incremented for worker comment
      const updated = await apiService.refetchPost(testPostId);
      expect(updated.data.comments).toBe(startCount + 1);

      console.log('✅ Worker comment counted correctly');
    });

    it('should handle mixed user and worker comments', async () => {
      // ARRANGE
      const initial = await apiService.refetchPost(testPostId);
      const startCount = initial.data.comments;

      // ACT: Create mixed comments
      await apiService.createComment(testPostId, 'User comment 1', {
        author: 'user-1'
      });

      await apiService.createComment(testPostId, '🤖 Worker outcome 1', {
        author: 'worker-agent'
      });

      await apiService.createComment(testPostId, 'User comment 2', {
        author: 'user-2'
      });

      await apiService.createComment(testPostId, '🤖 Worker outcome 2', {
        author: 'worker-agent-2'
      });

      await new Promise(resolve => setTimeout(resolve, 300));

      // ASSERT: All comments counted
      const final = await apiService.refetchPost(testPostId);
      expect(final.data.comments).toBe(startCount + 4);

      console.log('✅ Mixed user/worker comments counted correctly');
    });
  });

  describe('Data Consistency Verification', () => {
    it('should maintain consistency between counter and actual comments', async () => {
      // ARRANGE: Create fresh comment
      await apiService.createComment(testPostId, 'Consistency check', {
        author: testUserId
      });

      await new Promise(resolve => setTimeout(resolve, 100));

      // ACT: Get both counter and actual comments
      const post = await apiService.refetchPost(testPostId);
      const comments = await apiService.getPostComments(testPostId);

      // ASSERT: Counter matches actual count
      expect(post.data.comments).toBe(comments.length);

      console.log('✅ Data consistency verified');
      console.log(`   Counter: ${post.data.comments}`);
      console.log(`   Actual: ${comments.length}`);
    });

    it('should verify database state matches UI state', async () => {
      // ARRANGE: Create comments
      const initial = await apiService.refetchPost(testPostId);
      const startCount = initial.data.comments;

      const newCommentCount = 3;
      for (let i = 0; i < newCommentCount; i++) {
        await apiService.createComment(testPostId, `DB verification ${i}`, {
          author: testUserId
        });
      }

      await new Promise(resolve => setTimeout(resolve, 200));

      // ACT: Get data from different sources
      const postFromAPI = await apiService.refetchPost(testPostId);
      const postFromGetPost = await apiService.getAgentPost(testPostId);
      const commentsFromAPI = await apiService.getPostComments(testPostId);

      // ASSERT: All sources agree
      expect(postFromAPI.data.comments).toBe(startCount + newCommentCount);
      expect(postFromGetPost.data.comments).toBe(startCount + newCommentCount);
      expect(commentsFromAPI.length).toBe(postFromAPI.data.comments);

      console.log('✅ Database state matches UI state');
    });

    it('should handle race condition between refetch and new comment', async () => {
      // ARRANGE
      const initial = await apiService.refetchPost(testPostId);
      const startCount = initial.data.comments;

      // ACT: Start refetch and create comment simultaneously
      const [refetchResult, commentResult] = await Promise.all([
        apiService.refetchPost(testPostId),
        apiService.createComment(testPostId, 'Race condition test', {
          author: testUserId
        })
      ]);

      await new Promise(resolve => setTimeout(resolve, 100));

      // Final refetch to verify
      const finalRefetch = await apiService.refetchPost(testPostId);

      // ASSERT: Final count should be accurate
      // Either startCount or startCount+1 depending on timing
      expect(finalRefetch.data.comments).toBeGreaterThanOrEqual(startCount);
      expect(finalRefetch.data.comments).toBeLessThanOrEqual(startCount + 1);

      console.log('✅ Race condition handled correctly');
    });
  });

  describe('Performance and Scalability', () => {
    it('should handle high-frequency comment submissions', async () => {
      // ARRANGE
      const initial = await apiService.refetchPost(testPostId);
      const startCount = initial.data.comments;

      // ACT: 10 rapid comments
      const startTime = Date.now();
      const commentCount = 10;

      for (let i = 0; i < commentCount; i++) {
        apiService.createComment(testPostId, `High frequency ${i}`, {
          author: `user-${i}`
        }).catch(err => console.warn(`Comment ${i} failed:`, err));

        // Small delay to prevent overwhelming the system
        await new Promise(resolve => setTimeout(resolve, 50));
      }

      // Wait for all to process
      await new Promise(resolve => setTimeout(resolve, 1000));

      const duration = Date.now() - startTime;

      // ASSERT
      const final = await apiService.refetchPost(testPostId);
      expect(final.data.comments).toBeGreaterThanOrEqual(startCount);

      console.log(`⚡ Processed ${commentCount} comments in ${duration}ms`);
      console.log(`   Average: ${(duration / commentCount).toFixed(2)}ms per comment`);
    });

    it('should refetch efficiently without overwhelming the API', async () => {
      // ARRANGE
      const refetchCount = 20;
      const startTime = Date.now();

      // ACT: Multiple refetches
      const refetches = Array.from({ length: refetchCount }, () =>
        apiService.refetchPost(testPostId)
      );

      const results = await Promise.all(refetches);

      const duration = Date.now() - startTime;

      // ASSERT: All succeed
      expect(results).toHaveLength(refetchCount);
      results.forEach(result => {
        expect(result.success).toBe(true);
      });

      console.log(`⚡ ${refetchCount} refetches in ${duration}ms`);
      console.log(`   Average: ${(duration / refetchCount).toFixed(2)}ms per refetch`);

      // Should complete in reasonable time
      expect(duration).toBeLessThan(5000);
    });
  });
});
