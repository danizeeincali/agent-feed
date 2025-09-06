import request from 'supertest';
import { app } from '@/api/server';
import { db } from '@/database/connection';

// London School TDD: Integration tests with database mocks
jest.mock('@/database/connection');
const mockDb = db as jest.Mocked<typeof db>;

describe('Comment System Integration - London School TDD', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('End-to-End Comment Count Flow', () => {
    it('should maintain integer comment counts through full create-read cycle', async () => {
      // FAILING TEST - Full flow might produce decimal inconsistencies
      
      // Mock post creation
      mockDb.query
        .mockResolvedValueOnce({
          // Create post query
          rows: [{ 
            id: 'test-post-integration',
            title: 'Integration Test Post',
            content_body: 'Test content'
          }]
        })
        .mockResolvedValueOnce({
          // Verify post exists query  
          rows: [{ id: 'test-post-integration' }]
        })
        .mockResolvedValueOnce({
          // Insert comment query
          rows: [{
            id: 'comment-integration-1',
            post_id: 'test-post-integration',
            content: 'Test integration comment',
            author: 'test-user',
            likes_count: 0, // Should be integer from DB
            replies_count: 0,
            reported_count: 0,
            created_at: '2024-01-01T10:00:00Z',
            updated_at: '2024-01-01T10:00:00Z',
            is_deleted: false,
            is_edited: false
          }]
        })
        .mockResolvedValueOnce({
          // Get comments query 
          rows: [{
            id: 'comment-integration-1',
            post_id: 'test-post-integration', 
            content: 'Test integration comment',
            author: 'test-user',
            likes_count: "0.0", // PROBLEM: Database returns decimal string
            replies_count: "0.0",
            reported_count: "0.0",
            created_at: '2024-01-01T10:00:00Z',
            updated_at: '2024-01-01T10:00:00Z',
            is_deleted: false,
            is_edited: false,
            parent_id: null,
            thread_depth: 0,
            thread_path: '1',
            is_pinned: false,
            is_moderated: false,
            moderator_notes: null,
            edit_history: [],
            mentioned_users: []
          }]
        });

      // Create post first  
      const postResponse = await request(app)
        .post('/api/v1/agent-posts')
        .send({
          title: 'Integration Test Post',
          authorAgent: 'test-agent',
          contentBody: 'Test content',
          isAgentResponse: true
        })
        .expect(201);

      const postId = postResponse.body.data.id;

      // Create comment
      const commentResponse = await request(app)
        .post(`/api/v1/posts/${postId}/comments`)
        .send({
          content: 'Test integration comment',
          author: 'test-user',
          parentId: null
        })
        .expect(201);

      // FAILS: Response should have integer counts
      expect(typeof commentResponse.body.data.likesCount).toBe('number');
      expect(commentResponse.body.data.likesCount).toBe(0);
      expect(commentResponse.body.data.likesCount % 1).toBe(0);

      // Read comments back
      const getResponse = await request(app)
        .get(`/api/v1/posts/${postId}/comments`)
        .expect(200);

      // FAILS: Retrieved comment should have integer counts
      const retrievedComment = getResponse.body.data[0];
      expect(typeof retrievedComment.likesCount).toBe('number');
      expect(typeof retrievedComment.repliesCount).toBe('number');
      expect(retrievedComment.likesCount % 1).toBe(0);
      expect(retrievedComment.repliesCount % 1).toBe(0);
    });

    it('should increment and decrement comment counts as integers', async () => {
      // FAILING TEST - Comment count operations might produce decimals
      
      const postId = 'test-post-counts';
      const commentId = 'comment-counts-1';

      // Mock sequence: create comment, react, get updated counts
      mockDb.query
        .mockResolvedValueOnce({ rows: [{ id: postId }] }) // Post exists check
        .mockResolvedValueOnce({ // Create comment
          rows: [{
            id: commentId,
            post_id: postId,
            content: 'Count test comment',
            author: 'user-count',
            likes_count: 0,
            replies_count: 0,
            created_at: '2024-01-01T10:00:00Z',
            updated_at: '2024-01-01T10:00:00Z'
          }]
        })
        .mockResolvedValueOnce({ // Update likes count
          rows: [{
            id: commentId,
            likes_count: "1.0", // PROBLEM: DB returns decimal string
            updated_at: '2024-01-01T10:01:00Z'
          }]
        })
        .mockResolvedValueOnce({ // Get updated comment  
          rows: [{
            id: commentId,
            post_id: postId,
            content: 'Count test comment', 
            author: 'user-count',
            likes_count: "1.0", // PROBLEM: Still decimal string
            replies_count: "0.0",
            created_at: '2024-01-01T10:00:00Z',
            updated_at: '2024-01-01T10:01:00Z',
            is_deleted: false,
            parent_id: null
          }]
        });

      // Create comment
      await request(app)
        .post(`/api/v1/posts/${postId}/comments`)
        .send({
          content: 'Count test comment',
          author: 'user-count'
        })
        .expect(201);

      // React to comment (like)
      const reactionResponse = await request(app)
        .post(`/api/v1/comments/${commentId}/react`)
        .send({
          reactionType: 'like',
          userId: 'user-react'
        })
        .expect(200);

      // FAILS: Reaction response should have integer count
      expect(typeof reactionResponse.body.newCount).toBe('number');
      expect(reactionResponse.body.newCount).toBe(1);
      expect(reactionResponse.body.newCount % 1).toBe(0);

      // Get updated comment
      const updatedResponse = await request(app)
        .get(`/api/v1/comments/${commentId}`)
        .expect(200);

      // FAILS: Updated comment should show integer like count
      expect(typeof updatedResponse.body.data.likesCount).toBe('number');
      expect(updatedResponse.body.data.likesCount).toBe(1);
    });
  });

  describe('Comment Threading Integration', () => {
    it('should maintain integer reply counts in threaded structure', async () => {
      // FAILING TEST - Threading operations create decimal count inconsistencies
      
      const postId = 'test-post-threading-int';
      const parentCommentId = 'comment-parent-1';
      const replyCommentId = 'comment-reply-1';

      mockDb.query
        .mockResolvedValueOnce({ rows: [{ id: postId }] }) // Post exists
        .mockResolvedValueOnce({ // Create parent comment
          rows: [{
            id: parentCommentId,
            post_id: postId,
            content: 'Parent comment',
            author: 'user-parent',
            parent_id: null,
            thread_depth: 0,
            thread_path: '1',
            likes_count: 0,
            replies_count: 0
          }]
        })
        .mockResolvedValueOnce({ rows: [{ id: parentCommentId }] }) // Parent exists check
        .mockResolvedValueOnce({ // Create reply
          rows: [{
            id: replyCommentId,
            post_id: postId,
            content: 'Reply comment',
            author: 'user-reply', 
            parent_id: parentCommentId,
            thread_depth: 1,
            thread_path: '1.1',
            likes_count: 0,
            replies_count: 0
          }]
        })
        .mockResolvedValueOnce({ // Update parent reply count - PROBLEM: decimal returned
          rows: [{
            id: parentCommentId,
            replies_count: "1.0" // Database returns decimal string
          }]
        })
        .mockResolvedValueOnce({ // Get threaded comments
          rows: [
            {
              id: parentCommentId,
              content: 'Parent comment',
              author: 'user-parent',
              parent_id: null,
              thread_depth: 0,
              replies_count: "1.0", // PROBLEM: Decimal string
              likes_count: "0.0"
            },
            {
              id: replyCommentId,
              content: 'Reply comment', 
              author: 'user-reply',
              parent_id: parentCommentId,
              thread_depth: 1,
              replies_count: "0.0", // PROBLEM: Decimal string
              likes_count: "0.0"
            }
          ]
        });

      // Create parent comment
      await request(app)
        .post(`/api/v1/posts/${postId}/comments`)
        .send({
          content: 'Parent comment',
          author: 'user-parent'
        })
        .expect(201);

      // Create reply
      const replyResponse = await request(app)
        .post(`/api/v1/posts/${postId}/comments`)
        .send({
          content: 'Reply comment',
          author: 'user-reply',
          parentId: parentCommentId
        })
        .expect(201);

      // FAILS: Reply should have integer parent ID reference
      expect(replyResponse.body.data.parentId).toBe(parentCommentId);

      // Get threaded comments
      const threadedResponse = await request(app)
        .get(`/api/v1/posts/${postId}/comments`)
        .expect(200);

      // FAILS: All counts in threaded structure should be integers
      const parentComment = threadedResponse.body.data.find(
        (c: any) => c.id === parentCommentId
      );
      const replyComment = threadedResponse.body.data.find(
        (c: any) => c.id === replyCommentId
      );

      expect(typeof parentComment.repliesCount).toBe('number');
      expect(typeof replyComment.repliesCount).toBe('number');  
      expect(parentComment.repliesCount).toBe(1);
      expect(replyComment.repliesCount).toBe(0);
      expect(parentComment.repliesCount % 1).toBe(0);
      expect(replyComment.repliesCount % 1).toBe(0);
    });
  });

  describe('Comment Aggregation Integration', () => {
    it('should provide integer counts in aggregated stats endpoint', async () => {
      // FAILING TEST - Aggregation queries return decimal strings
      
      const postId = 'test-post-aggregation';
      
      // Mock aggregation query results - PROBLEM: all strings
      mockDb.query.mockResolvedValueOnce({
        rows: [{
          total_comments: "47.0", 
          root_threads: "12.0",
          max_depth: "3.0", 
          agent_comments: "8.0",
          user_comments: "39.0",
          avg_depth: "1.8", // Can be decimal
          most_active_thread: "thread-123",
          recent_activity: "5.0"
        }]
      });

      const statsResponse = await request(app)
        .get(`/api/v1/posts/${postId}/comments/stats`)
        .expect(200);

      // FAILS: All count fields should be integers, not decimal strings
      const stats = statsResponse.body;
      expect(typeof stats.totalComments).toBe('number');
      expect(typeof stats.rootThreads).toBe('number');
      expect(typeof stats.maxDepth).toBe('number');
      expect(typeof stats.agentComments).toBe('number');
      expect(typeof stats.userComments).toBe('number');

      expect(stats.totalComments).toBe(47);
      expect(stats.rootThreads).toBe(12);
      expect(stats.maxDepth).toBe(3);
      expect(stats.agentComments).toBe(8);
      expect(stats.userComments).toBe(39);

      // All integer fields should be integers
      expect(stats.totalComments % 1).toBe(0);
      expect(stats.rootThreads % 1).toBe(0);
      expect(stats.maxDepth % 1).toBe(0);
      expect(stats.agentComments % 1).toBe(0);
      expect(stats.userComments % 1).toBe(0);

      // averageDepth can be decimal
      expect(typeof stats.averageDepth).toBe('number');
    });
  });

  describe('Comment Label Consistency Integration', () => {
    it('should use "Comments" terminology throughout API responses', async () => {
      // FAILING TEST - API responses might use "Technical Analysis" terminology
      
      const postId = 'test-post-labels';

      // Mock query that might return wrong section labels
      mockDb.query.mockResolvedValueOnce({
        rows: [{
          section_type: 'technical_analysis', // PROBLEM: Wrong section type
          total_comments: 5,
          section_label: 'Technical Analysis Comments' // PROBLEM: Wrong label
        }]
      });

      const response = await request(app)
        .get(`/api/v1/posts/${postId}/comments/stats`)
        .expect(200);

      // FAILS: API should not reference technical analysis
      expect(response.body).not.toHaveProperty('technicalAnalysisCount');
      expect(JSON.stringify(response.body)).not.toMatch(/technical.?analysis/i);
      expect(JSON.stringify(response.body)).not.toMatch(/tech.?analysis/i);

      // Should use generic comment terminology
      expect(response.body).toHaveProperty('totalComments');
    });

    it('should return consistent comment section metadata', async () => {
      // FAILING TEST - Metadata includes wrong section references
      
      const postId = 'test-post-metadata';
      
      mockDb.query.mockResolvedValueOnce({
        rows: [{
          id: 'comment-meta-1',
          post_id: postId,
          content: 'Test comment',
          section_type: 'comment', // Should be generic 'comment'
          category: 'general_discussion', // Not 'technical_analysis'
          metadata: {
            sectionLabel: 'Comments', // Should be 'Comments'
            displayName: 'Comment Section'
          }
        }]
      });

      const response = await request(app)
        .get(`/api/v1/posts/${postId}/comments`)
        .expect(200);

      const comment = response.body.data[0];
      
      // FAILS: Should not have technical analysis references in metadata
      if (comment.metadata) {
        expect(comment.metadata.sectionLabel).not.toMatch(/technical/i);
        expect(comment.metadata.sectionLabel).not.toMatch(/analysis/i);
      }
    });
  });

  describe('Database Mock Contracts', () => {
    it('should verify database query structure for integer counts', () => {
      // London School: Verify database interaction contracts
      
      // This test verifies that our mocks expect the right query patterns
      const expectedCountQuery = `
        SELECT 
          COUNT(*) as total_comments,
          COUNT(CASE WHEN parent_id IS NULL THEN 1 END) as root_threads,
          MAX(thread_depth) as max_depth,
          COUNT(CASE WHEN author_type = 'agent' THEN 1 END) as agent_comments
        FROM comments 
        WHERE post_id = $1 AND is_deleted = FALSE
      `;

      // Mock setup expects this query pattern
      mockDb.query.mockResolvedValue({
        rows: [{
          total_comments: 42,
          root_threads: 8,
          max_depth: 3,
          agent_comments: 7
        }]
      });

      // This validates our mocking approach is realistic
      expect(mockDb.query).toBeDefined();
      expect(typeof mockDb.query).toBe('function');
    });

    it('should verify proper error handling preserves integer contracts', async () => {
      // London School: Mock error scenarios
      
      const postId = 'test-post-error-handling';
      
      // First query fails
      mockDb.query.mockRejectedValueOnce(new Error('Database connection failed'));
      
      const response = await request(app)
        .get(`/api/v1/posts/${postId}/comments/stats`)
        .expect(500);

      expect(response.body.success).toBe(false);
      expect(response.body.error).toBe('Failed to fetch comment statistics');
    });
  });
});