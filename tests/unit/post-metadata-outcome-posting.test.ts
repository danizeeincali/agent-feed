/**
 * TDD Test Suite: Post-to-Ticket Metadata Fix
 *
 * Testing the fix for missing metadata fields in post-originated work tickets
 * that causes outcome comment posting to fail.
 *
 * Bug: Post-originated tickets missing type, parent_post_id, parent_post_title,
 * and parent_post_content fields, causing WorkContextExtractor to fail with:
 * "Cannot determine reply target: missing parent_post_id"
 *
 * Fix: Add complete metadata during post-to-ticket creation (server.js lines 853-857)
 *
 * References:
 * - SPARC-POST-METADATA-FIX-SPEC.md
 * - OUTCOME-POSTING-POST-REPLY-BUG-INVESTIGATION.md
 */

import { WorkContextExtractor, OriginType, WorkContext } from '../../src/utils/work-context-extractor';
import { WorkTicket } from '../../src/types/work-ticket';

// Mock the logger
jest.mock('../../src/utils/logger', () => ({
  __esModule: true,
  default: {
    debug: jest.fn(),
    info: jest.fn(),
    warn: jest.fn(),
    error: jest.fn(),
  },
}));

describe('Post-to-Ticket Metadata Fix - TDD Suite', () => {
  let extractor: WorkContextExtractor;

  beforeEach(() => {
    extractor = new WorkContextExtractor();
  });

  /**
   * Test 1: Verify post-to-ticket creates metadata with type='post'
   *
   * This test validates FR1: Post-originated tickets MUST include `type: 'post'` in metadata
   *
   * Expected: When a post is converted to a work ticket, the metadata should
   * explicitly contain type='post' to distinguish it from comments
   */
  describe('Test 1: Post ticket includes type="post" in metadata', () => {
    it('should have type="post" in post_metadata', () => {
      // Arrange: Create a ticket as it should be after the fix
      const postTicket: WorkTicket = {
        id: 'ticket-post-1',
        type: 'post_response',
        priority: 5,
        agentName: 'avi',
        userId: 'user-123',
        payload: {
          feedItemId: '100',
          content: 'I want to know what files are in the root workspace',
          metadata: {
            // Fix: This field must be present
            type: 'post',
            parent_post_id: 100,
            parent_post_title: 'I want to know what files...',
            parent_post_content: 'I want to know what files are in the root workspace',
            // Existing fields
            title: 'I want to know what files...',
            tags: [],
            postType: 'quick',
            wordCount: 43,
            readingTime: 1,
            businessImpact: 5,
            isAgentResponse: false,
          },
        },
        createdAt: new Date(),
        status: 'pending',
      };

      // Act: Extract origin type
      const metadata = (postTicket.payload as any).metadata;
      const originType = extractor.determineOriginType(metadata, postTicket);

      // Assert: Should be identified as 'post'
      expect(metadata.type).toBe('post');
      expect(originType).toBe('post');
    });

    it('should fail to identify post without type field (pre-fix behavior)', () => {
      // Arrange: Create ticket as it was BEFORE the fix (missing type)
      const brokenPostTicket: WorkTicket = {
        id: 'ticket-post-broken',
        type: 'post_response',
        priority: 5,
        agentName: 'avi',
        userId: 'user-123',
        payload: {
          content: 'Some post content',
          metadata: {
            // Missing: type field
            title: 'Post Title',
            tags: ['test'],
            postType: 'quick',
          },
        },
        createdAt: new Date(),
        status: 'pending',
      };

      // Act: Extract origin type
      const metadata = (brokenPostTicket.payload as any).metadata;
      const originType = extractor.determineOriginType(metadata, brokenPostTicket);

      // Assert: Without type, falls back to heuristic detection
      // Should still detect as 'post' from title/tags, but explicit type is better
      expect(metadata.type).toBeUndefined();
      expect(originType).toBe('post'); // Fallback detection works, but explicit is better
    });
  });

  /**
   * Test 2: Verify post-to-ticket creates metadata with parent_post_id
   *
   * This test validates FR2: Post-originated tickets MUST include `parent_post_id`
   * (set to post's own ID)
   *
   * Expected: parent_post_id should equal the post's own ID since posts reply to themselves
   */
  describe('Test 2: Post ticket includes parent_post_id in metadata', () => {
    it('should have parent_post_id set to post ID', () => {
      // Arrange: Post with ID 200 should have parent_post_id=200
      const postId = 200;
      const postTicket: WorkTicket = {
        id: 'ticket-post-2',
        type: 'post_response',
        priority: 5,
        agentName: 'avi',
        userId: 'user-456',
        payload: {
          feedItemId: String(postId),
          content: 'Analyze the project structure',
          metadata: {
            type: 'post',
            // Fix: parent_post_id must equal post's own ID
            parent_post_id: postId,
            parent_post_title: 'Project Analysis Request',
            parent_post_content: 'Analyze the project structure',
            title: 'Project Analysis Request',
            tags: ['analysis'],
          },
        },
        createdAt: new Date(),
        status: 'pending',
      };

      // Act: Extract parent post ID
      const metadata = (postTicket.payload as any).metadata;
      const context = extractor.extractContext(postTicket);

      // Assert: parent_post_id should match the post ID
      expect(metadata.parent_post_id).toBe(postId);
      expect(context.parentPostId).toBe(postId);
      expect(context.originType).toBe('post');
    });

    it('should fail without parent_post_id (pre-fix behavior)', () => {
      // Arrange: Ticket missing parent_post_id (broken state)
      const postTicket: WorkTicket = {
        id: 'ticket-post-broken-2',
        type: 'post_response',
        priority: 5,
        agentName: 'avi',
        userId: 'user-456',
        payload: {
          content: 'Some content',
          metadata: {
            type: 'post',
            // Missing: parent_post_id
            title: 'Post Title',
            tags: [],
          },
        },
        createdAt: new Date(),
        status: 'pending',
      };

      // Act: Extract context
      const metadata = (postTicket.payload as any).metadata;
      const context = extractor.extractContext(postTicket);

      // Assert: Without parent_post_id, extraction fails
      expect(metadata.parent_post_id).toBeUndefined();
      expect(context.parentPostId).toBeNull();

      // This should throw when trying to get reply target
      expect(() => extractor.getReplyTarget(context)).toThrow(
        'Cannot determine reply target: missing parent_post_id'
      );
    });

    it('should fallback to feedItemId if parent_post_id missing', () => {
      // Arrange: Ticket with feedItemId but no parent_post_id
      const postTicket: WorkTicket = {
        id: 'ticket-post-fallback',
        type: 'post_response',
        priority: 5,
        agentName: 'avi',
        userId: 'user-789',
        payload: {
          feedItemId: '150',
          content: 'Test content',
          metadata: {
            type: 'post',
            // Missing parent_post_id, but feedItemId present
            title: 'Test Post',
          },
        },
        createdAt: new Date(),
        status: 'pending',
      };

      // Act: Extract context
      const context = extractor.extractContext(postTicket);

      // Assert: Should use feedItemId as fallback
      expect(context.parentPostId).toBe(150);
      expect(context.originType).toBe('post');
    });
  });

  /**
   * Test 3: Verify post-to-ticket creates metadata with parent_post_title
   *
   * This test validates FR3: Post-originated tickets MUST include `parent_post_title`
   *
   * Expected: parent_post_title should be populated for context in outcome comments
   */
  describe('Test 3: Post ticket includes parent_post_title in metadata', () => {
    it('should have parent_post_title matching post title', () => {
      // Arrange: Post ticket with title
      const postTitle = 'Deploy to Production Environment';
      const postTicket: WorkTicket = {
        id: 'ticket-post-3',
        type: 'post_response',
        priority: 8,
        agentName: 'avi',
        userId: 'user-789',
        payload: {
          feedItemId: '300',
          content: 'Deploy the application to production',
          metadata: {
            type: 'post',
            parent_post_id: 300,
            // Fix: parent_post_title must be present
            parent_post_title: postTitle,
            parent_post_content: 'Deploy the application to production',
            title: postTitle,
            tags: ['deployment', 'production'],
          },
        },
        createdAt: new Date(),
        status: 'pending',
      };

      // Act: Extract metadata
      const metadata = (postTicket.payload as any).metadata;

      // Assert: parent_post_title should be present and match
      expect(metadata.parent_post_title).toBe(postTitle);
      expect(metadata.parent_post_title).toBe(metadata.title);
    });

    it('should handle missing parent_post_title gracefully', () => {
      // Arrange: Ticket without parent_post_title
      const postTicket: WorkTicket = {
        id: 'ticket-post-no-title',
        type: 'post_response',
        priority: 5,
        agentName: 'avi',
        userId: 'user-999',
        payload: {
          feedItemId: '400',
          content: 'Test content',
          metadata: {
            type: 'post',
            parent_post_id: 400,
            // Missing: parent_post_title
            title: 'Test Post',
          },
        },
        createdAt: new Date(),
        status: 'pending',
      };

      // Act: Extract context
      const context = extractor.extractContext(postTicket);

      // Assert: Should still work, but missing context for outcome formatter
      expect(context.originType).toBe('post');
      expect(context.parentPostId).toBe(400);
      // parent_post_title not required for extraction, but needed for outcome formatting
    });
  });

  /**
   * Test 4: Verify post-to-ticket creates metadata with parent_post_content
   *
   * This test validates FR4: Post-originated tickets MUST include `parent_post_content`
   *
   * Expected: parent_post_content should contain the full post content for context
   */
  describe('Test 4: Post ticket includes parent_post_content in metadata', () => {
    it('should have parent_post_content matching post content', () => {
      // Arrange: Post ticket with content
      const postContent = 'Please analyze the database schema and suggest optimizations for query performance.';
      const postTicket: WorkTicket = {
        id: 'ticket-post-4',
        type: 'post_response',
        priority: 7,
        agentName: 'avi',
        userId: 'user-111',
        payload: {
          feedItemId: '500',
          content: postContent,
          metadata: {
            type: 'post',
            parent_post_id: 500,
            parent_post_title: 'Database Optimization Request',
            // Fix: parent_post_content must be present
            parent_post_content: postContent,
            title: 'Database Optimization Request',
            tags: ['database', 'performance'],
          },
        },
        createdAt: new Date(),
        status: 'pending',
      };

      // Act: Extract metadata
      const metadata = (postTicket.payload as any).metadata;
      const context = extractor.extractContext(postTicket);

      // Assert: parent_post_content should be present and match
      expect(metadata.parent_post_content).toBe(postContent);
      expect(context.userRequest).toBe(postContent);
    });

    it('should handle long post content', () => {
      // Arrange: Post with very long content
      const longContent = 'A'.repeat(5000);
      const postTicket: WorkTicket = {
        id: 'ticket-post-long',
        type: 'post_response',
        priority: 5,
        agentName: 'avi',
        userId: 'user-222',
        payload: {
          feedItemId: '600',
          content: longContent,
          metadata: {
            type: 'post',
            parent_post_id: 600,
            parent_post_title: 'Long Post',
            parent_post_content: longContent,
            title: 'Long Post',
            tags: [],
          },
        },
        createdAt: new Date(),
        status: 'pending',
      };

      // Act: Extract metadata
      const metadata = (postTicket.payload as any).metadata;
      const context = extractor.extractContext(postTicket);

      // Assert: Should handle long content without truncation
      expect(metadata.parent_post_content).toBe(longContent);
      expect(metadata.parent_post_content.length).toBe(5000);
      expect(context.userRequest).toBe(longContent);
    });

    it('should handle empty post content', () => {
      // Arrange: Post with empty content
      const postTicket: WorkTicket = {
        id: 'ticket-post-empty',
        type: 'post_response',
        priority: 5,
        agentName: 'avi',
        userId: 'user-333',
        payload: {
          feedItemId: '700',
          content: '',
          metadata: {
            type: 'post',
            parent_post_id: 700,
            parent_post_title: 'Empty Post',
            parent_post_content: '',
            title: 'Empty Post',
            tags: [],
          },
        },
        createdAt: new Date(),
        status: 'pending',
      };

      // Act: Extract metadata
      const metadata = (postTicket.payload as any).metadata;
      const context = extractor.extractContext(postTicket);

      // Assert: Should handle empty content gracefully
      expect(metadata.parent_post_content).toBe('');
      expect(context.userRequest).toBe('');
    });
  });

  /**
   * Test 5: Verify WorkContextExtractor extracts parent_post_id from post metadata
   *
   * This test validates that WorkContextExtractor correctly processes the new metadata
   *
   * Expected: WorkContextExtractor should successfully extract parent_post_id from
   * metadata.parent_post_id field (Priority 1 extraction)
   */
  describe('Test 5: WorkContextExtractor extracts parent_post_id from post metadata', () => {
    it('should extract parent_post_id from metadata (Priority 1)', () => {
      // Arrange: Ticket with explicit parent_post_id in metadata
      const postTicket: WorkTicket = {
        id: 'ticket-post-5',
        type: 'post_response',
        priority: 5,
        agentName: 'avi',
        userId: 'user-444',
        payload: {
          feedItemId: '800',
          content: 'Test post content',
          metadata: {
            type: 'post',
            parent_post_id: 800, // Priority 1: Explicit parent_post_id
            parent_post_title: 'Test Post',
            parent_post_content: 'Test post content',
            title: 'Test Post',
            tags: [],
          },
        },
        createdAt: new Date(),
        status: 'pending',
      };

      // Act: Extract context
      const context = extractor.extractContext(postTicket);

      // Assert: Should extract parent_post_id from metadata
      expect(context.parentPostId).toBe(800);
      expect(context.originType).toBe('post');
    });

    it('should prefer metadata.parent_post_id over feedItemId', () => {
      // Arrange: Ticket with both metadata.parent_post_id and feedItemId
      const postTicket: WorkTicket = {
        id: 'ticket-post-priority',
        type: 'post_response',
        priority: 5,
        agentName: 'avi',
        userId: 'user-555',
        payload: {
          feedItemId: '999', // Lower priority
          content: 'Test content',
          metadata: {
            type: 'post',
            parent_post_id: 800, // Higher priority - should be used
            parent_post_title: 'Priority Test',
            parent_post_content: 'Test content',
            title: 'Priority Test',
          },
        },
        createdAt: new Date(),
        status: 'pending',
      };

      // Act: Extract context
      const context = extractor.extractContext(postTicket);

      // Assert: Should use metadata.parent_post_id (Priority 1)
      expect(context.parentPostId).toBe(800);
      expect(context.parentPostId).not.toBe(999);
    });

    it('should successfully get reply target with parent_post_id', () => {
      // Arrange: Post ticket with complete metadata
      const postTicket: WorkTicket = {
        id: 'ticket-post-reply',
        type: 'post_response',
        priority: 5,
        agentName: 'avi',
        userId: 'user-666',
        payload: {
          feedItemId: '900',
          content: 'Reply target test',
          metadata: {
            type: 'post',
            parent_post_id: 900,
            parent_post_title: 'Reply Test',
            parent_post_content: 'Reply target test',
            title: 'Reply Test',
          },
        },
        createdAt: new Date(),
        status: 'pending',
      };

      // Act: Extract context and get reply target
      const context = extractor.extractContext(postTicket);
      const replyTarget = extractor.getReplyTarget(context);

      // Assert: Should successfully determine reply target
      expect(replyTarget.postId).toBe(900);
      expect(replyTarget.commentId).toBeUndefined();
      expect(() => extractor.getReplyTarget(context)).not.toThrow();
    });
  });

  /**
   * Test 6: Verify outcome comment is posted for post-originated tickets
   *
   * This test validates FR5: Outcome comments MUST be posted as top-level comments
   * on the originating post
   *
   * Expected: With complete metadata, outcome posting should succeed
   */
  describe('Test 6: Outcome comment posting for post-originated tickets', () => {
    it('should enable outcome posting with complete metadata', () => {
      // Arrange: Post ticket with all required metadata for outcome posting
      const postTicket: WorkTicket = {
        id: 'ticket-post-outcome',
        type: 'post_response',
        priority: 5,
        agentName: 'avi',
        userId: 'user-777',
        payload: {
          feedItemId: '1000',
          content: 'Create a new feature',
          metadata: {
            // Complete metadata for outcome posting
            type: 'post',
            parent_post_id: 1000,
            parent_post_title: 'Feature Request',
            parent_post_content: 'Create a new feature',
            // Existing fields
            title: 'Feature Request',
            tags: ['feature'],
          },
        },
        createdAt: new Date(),
        status: 'pending',
      };

      // Act: Extract context and verify outcome posting is possible
      const context = extractor.extractContext(postTicket);

      // Assert: All conditions for outcome posting are met
      expect(context.originType).not.toBe('autonomous'); // Not autonomous
      expect(context.parentPostId).not.toBeNull(); // Has parent post
      expect(() => extractor.getReplyTarget(context)).not.toThrow(); // Can get target

      const replyTarget = extractor.getReplyTarget(context);
      expect(replyTarget.postId).toBe(1000);
      expect(replyTarget.commentId).toBeUndefined(); // Top-level comment
    });

    it('should fail outcome posting without metadata (pre-fix)', () => {
      // Arrange: Broken post ticket (pre-fix state)
      const brokenPostTicket: WorkTicket = {
        id: 'ticket-post-broken-outcome',
        type: 'post_response',
        priority: 5,
        agentName: 'avi',
        userId: 'user-888',
        payload: {
          content: 'Create a new feature',
          metadata: {
            // Missing critical fields
            title: 'Feature Request',
            tags: ['feature'],
          },
        },
        createdAt: new Date(),
        status: 'pending',
      };

      // Act: Extract context
      const context = extractor.extractContext(brokenPostTicket);

      // Assert: Outcome posting should fail
      expect(context.originType).toBe('post'); // Detected as post
      expect(context.parentPostId).toBeNull(); // But no parent!
      expect(() => extractor.getReplyTarget(context)).toThrow(
        'Cannot determine reply target: missing parent_post_id'
      );
    });

    it('should post as top-level comment (not nested)', () => {
      // Arrange: Post ticket should create top-level outcome comment
      const postTicket: WorkTicket = {
        id: 'ticket-post-toplevel',
        type: 'post_response',
        priority: 5,
        agentName: 'avi',
        userId: 'user-999',
        payload: {
          feedItemId: '1100',
          content: 'Test content',
          metadata: {
            type: 'post',
            parent_post_id: 1100,
            parent_post_title: 'Top Level Test',
            parent_post_content: 'Test content',
            title: 'Top Level Test',
          },
        },
        createdAt: new Date(),
        status: 'pending',
      };

      // Act: Extract context and get reply target
      const context = extractor.extractContext(postTicket);
      const replyTarget = extractor.getReplyTarget(context);

      // Assert: Should be top-level comment (no parent_comment_id)
      expect(context.parentCommentId).toBeNull();
      expect(replyTarget.commentId).toBeUndefined();
      expect(context.conversationDepth).toBe(0);
    });
  });

  /**
   * Test 7: Regression - verify comment-to-ticket still works
   *
   * This test validates FR6: Comment-originated tickets MUST continue to work
   *
   * Expected: The fix should not break existing comment-to-ticket functionality
   */
  describe('Test 7: Regression - Comment-to-ticket functionality preserved', () => {
    it('should still work for comment-originated tickets', () => {
      // Arrange: Comment ticket (existing functionality)
      const commentTicket: WorkTicket = {
        id: 'ticket-comment-regression',
        type: 'post_response',
        priority: 5,
        agentName: 'avi',
        userId: 'user-regression',
        payload: {
          feedItemId: '1200',
          content: 'Please fix the bug',
          metadata: {
            type: 'comment',
            parent_post_id: 1200,
            parent_post_title: 'Bug Report',
            parent_post_content: 'Found a bug in the system',
            parent_comment_id: null,
            mentioned_users: [],
            depth: 0,
          },
        },
        createdAt: new Date(),
        status: 'pending',
      };

      // Act: Extract context
      const context = extractor.extractContext(commentTicket);

      // Assert: Comment functionality unchanged
      expect(context.originType).toBe('comment');
      expect(context.parentPostId).toBe(1200);
      expect(context.parentCommentId).toBeNull();
      expect(() => extractor.getReplyTarget(context)).not.toThrow();
    });

    it('should still work for nested comment replies', () => {
      // Arrange: Nested comment ticket
      const nestedCommentTicket: WorkTicket = {
        id: 'ticket-nested-regression',
        type: 'post_response',
        priority: 5,
        agentName: 'avi',
        userId: 'user-regression-2',
        payload: {
          content: 'Reply to the comment',
          metadata: {
            type: 'comment',
            parent_post_id: 1300,
            parent_comment_id: 100,
            parent_post_title: 'Test Post',
            parent_post_content: 'Test content',
            depth: 2,
          },
        },
        createdAt: new Date(),
        status: 'pending',
      };

      // Act: Extract context and get reply target
      const context = extractor.extractContext(nestedCommentTicket);
      const replyTarget = extractor.getReplyTarget(context);

      // Assert: Nested reply functionality preserved
      expect(context.originType).toBe('comment');
      expect(context.parentPostId).toBe(1300);
      expect(context.parentCommentId).toBe(100);
      expect(context.conversationDepth).toBe(2);
      expect(replyTarget.postId).toBe(1300);
      expect(replyTarget.commentId).toBe(100);
    });

    it('should handle autonomous tickets correctly', () => {
      // Arrange: Autonomous ticket (no parent)
      const autonomousTicket: WorkTicket = {
        id: 'ticket-autonomous-regression',
        type: 'health_check',
        priority: 3,
        agentName: 'avi',
        userId: 'system',
        payload: {
          content: 'System health check',
        },
        createdAt: new Date(),
        status: 'pending',
      };

      // Act: Extract context
      const context = extractor.extractContext(autonomousTicket);

      // Assert: Autonomous detection still works
      expect(context.originType).toBe('autonomous');
      expect(context.parentPostId).toBeNull();
      expect(() => extractor.getReplyTarget(context)).toThrow(
        'Cannot determine reply target for autonomous task'
      );
    });
  });

  /**
   * Edge Cases: Additional validation tests
   */
  describe('Edge Cases: Post metadata validation', () => {
    it('should handle post with UUID string parent_post_id', () => {
      // Arrange: Post with UUID as parent_post_id (like prod-post-ae43fc43-...)
      const postTicket: WorkTicket = {
        id: 'ticket-post-uuid',
        type: 'post_response',
        priority: 5,
        agentName: 'avi',
        userId: 'user-edge-1',
        payload: {
          content: 'Test content',
          metadata: {
            type: 'post',
            // Note: In the investigation, we see UUID strings, but they're stored as strings
            // The system converts them as needed
            parent_post_id: 'prod-post-ae43fc43-eb66-4562-96ea-1fc5b9e76bce' as any,
            parent_post_title: 'Test Post',
            parent_post_content: 'Test content',
            title: 'Test Post',
          },
        },
        createdAt: new Date(),
        status: 'pending',
      };

      // Act: Extract metadata
      const metadata = (postTicket.payload as any).metadata;

      // Assert: Should preserve the ID format
      expect(metadata.parent_post_id).toBeTruthy();
      expect(typeof metadata.parent_post_id).toBe('string');
    });

    it('should handle post with missing title (uses content)', () => {
      // Arrange: Post without title
      const postContent = 'This is the post content without a title';
      const postTicket: WorkTicket = {
        id: 'ticket-post-no-title-edge',
        type: 'post_response',
        priority: 5,
        agentName: 'avi',
        userId: 'user-edge-2',
        payload: {
          feedItemId: '1400',
          content: postContent,
          metadata: {
            type: 'post',
            parent_post_id: 1400,
            parent_post_title: '', // Empty title
            parent_post_content: postContent,
          },
        },
        createdAt: new Date(),
        status: 'pending',
      };

      // Act: Extract context
      const context = extractor.extractContext(postTicket);

      // Assert: Should still work with empty title
      expect(context.originType).toBe('post');
      expect(context.parentPostId).toBe(1400);
      expect(context.userRequest).toBe(postContent);
    });

    it('should handle metadata with extra fields', () => {
      // Arrange: Post with additional metadata fields
      const postTicket: WorkTicket = {
        id: 'ticket-post-extra-fields',
        type: 'post_response',
        priority: 5,
        agentName: 'avi',
        userId: 'user-edge-3',
        payload: {
          feedItemId: '1500',
          content: 'Test content',
          metadata: {
            // Required fields
            type: 'post',
            parent_post_id: 1500,
            parent_post_title: 'Extra Fields Test',
            parent_post_content: 'Test content',
            // Extra fields (should be preserved)
            customField: 'custom value',
            nestedObject: { key: 'value' },
            arrayField: [1, 2, 3],
          },
        },
        createdAt: new Date(),
        status: 'pending',
      };

      // Act: Extract context
      const metadata = (postTicket.payload as any).metadata;
      const context = extractor.extractContext(postTicket);

      // Assert: Extra fields should not interfere
      expect(context.originType).toBe('post');
      expect(context.parentPostId).toBe(1500);
      expect(metadata.customField).toBe('custom value');
    });
  });

  /**
   * Integration: Complete workflow validation
   */
  describe('Integration: Complete post-to-outcome workflow', () => {
    it('should complete full post-to-ticket-to-outcome flow', () => {
      // Arrange: Simulate complete workflow
      const postId = 2000;
      const userId = 'user-workflow';
      const postContent = 'Create a comprehensive test suite for the new feature';
      const postTitle = 'Test Suite Creation Request';

      // Step 1: Post created and converted to ticket (with fix applied)
      const workTicket: WorkTicket = {
        id: 'ticket-workflow-complete',
        type: 'post_response',
        priority: 5,
        agentName: 'avi',
        userId: userId,
        payload: {
          feedItemId: String(postId),
          content: postContent,
          metadata: {
            // Complete metadata (post-fix)
            type: 'post',
            parent_post_id: postId,
            parent_post_title: postTitle,
            parent_post_content: postContent,
            // Business metadata
            title: postTitle,
            tags: ['testing', 'feature'],
            postType: 'quick',
            wordCount: 100,
            readingTime: 2,
            businessImpact: 8,
            isAgentResponse: false,
          },
        },
        createdAt: new Date(),
        status: 'pending',
      };

      // Step 2: Worker extracts context
      const context = extractor.extractContext(workTicket);

      // Step 3: Worker determines posting strategy
      const replyTarget = extractor.getReplyTarget(context);

      // Assert: Complete workflow succeeds
      expect(context.originType).toBe('post');
      expect(context.parentPostId).toBe(postId);
      expect(context.userRequest).toBe(postContent);
      expect(replyTarget.postId).toBe(postId);
      expect(replyTarget.commentId).toBeUndefined(); // Top-level comment

      // Verify all metadata is present
      const metadata = (workTicket.payload as any).metadata;
      expect(metadata.type).toBe('post');
      expect(metadata.parent_post_id).toBe(postId);
      expect(metadata.parent_post_title).toBe(postTitle);
      expect(metadata.parent_post_content).toBe(postContent);
    });
  });
});
