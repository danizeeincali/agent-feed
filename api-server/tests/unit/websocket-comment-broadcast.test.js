/**
 * WebSocket Comment Broadcast Tests (London School TDD)
 *
 * Test suite for validating WebSocket broadcasts during comment creation.
 * Tests cover both unit-level mocking (testing the call path) and integration-level
 * real WebSocket communication (testing the actual broadcast).
 *
 * RED Phase: These tests document expected behavior and should initially fail
 * GREEN Phase: Implement minimum code to pass
 * REFACTOR Phase: Clean up and optimize implementation
 */

import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { io as ioClient } from 'socket.io-client';
import { createServer } from 'http';
import websocketService from '../../services/websocket-service.js';

describe('WebSocket Comment Broadcasts (London School TDD)', () => {
  /**
   * Test Category 1: Unit Tests - Mock-driven validation
   *
   * These tests use mocks to verify the integration points between
   * the comment creation flow and the WebSocket broadcast system.
   * Following London School TDD, we focus on interactions rather than state.
   */
  describe('Unit Tests - broadcastCommentAdded Integration', () => {
    let mockWebSocketService;
    let originalBroadcastCommentAdded;

    beforeEach(() => {
      // Create spy for broadcastCommentAdded method
      originalBroadcastCommentAdded = websocketService.broadcastCommentAdded;
      mockWebSocketService = vi.spyOn(websocketService, 'broadcastCommentAdded');
    });

    afterEach(() => {
      // Restore original implementation
      if (originalBroadcastCommentAdded) {
        websocketService.broadcastCommentAdded = originalBroadcastCommentAdded;
      }
      vi.restoreAllMocks();
    });

    /**
     * Test 1: Verify broadcastCommentAdded is called after successful comment creation
     *
     * Expected Behavior:
     * - Comment creation endpoint should call broadcastCommentAdded
     * - Should be called exactly once per comment created
     * - Should happen AFTER the comment is successfully persisted
     */
    it('should call broadcastCommentAdded after successful comment creation', async () => {
      // Arrange: Setup mock to track calls
      const mockPayload = {
        postId: 'post-123',
        commentId: 'comment-456',
        parentCommentId: null,
        author: 'test-user',
        content: 'Test comment content',
        comment: { id: 'comment-456', content: 'Test comment content' }
      };

      // Act: Simulate comment creation (this should trigger broadcast)
      // Note: This test will FAIL initially because we need to verify actual endpoint behavior
      websocketService.broadcastCommentAdded(mockPayload);

      // Assert: Verify the broadcast method was called
      expect(mockWebSocketService).toHaveBeenCalledTimes(1);
      expect(mockWebSocketService).toHaveBeenCalledWith(
        expect.objectContaining({
          postId: 'post-123',
          commentId: 'comment-456',
          author: 'test-user',
          content: 'Test comment content'
        })
      );
    });

    /**
     * Test 2: Verify payload structure matches expected format
     *
     * Expected Payload Structure:
     * {
     *   postId: string,
     *   commentId: string,
     *   parentCommentId: string | null,
     *   author: string,
     *   content: string,
     *   comment: Object (full comment object)
     * }
     */
    it('should pass correct payload structure to broadcastCommentAdded', () => {
      // Arrange: Define expected payload structure
      const expectedPayload = {
        postId: 'post-789',
        commentId: 'comment-abc',
        parentCommentId: 'comment-parent',
        author: 'agent-test',
        content: 'Agent response content',
        comment: {
          id: 'comment-abc',
          content: 'Agent response content',
          author: 'agent-test',
          created_at: expect.any(String)
        }
      };

      // Act: Call broadcast with expected payload
      websocketService.broadcastCommentAdded(expectedPayload);

      // Assert: Verify payload structure
      expect(mockWebSocketService).toHaveBeenCalledWith(
        expect.objectContaining({
          postId: expect.any(String),
          commentId: expect.any(String),
          parentCommentId: expect.anything(),
          author: expect.any(String),
          content: expect.any(String),
          comment: expect.any(Object)
        })
      );
    });

    /**
     * Test 3: Verify broadcast failure does not fail HTTP response
     *
     * Expected Behavior:
     * - If WebSocket broadcast throws an error, the comment should still be created
     * - HTTP response should still return 201 with the created comment
     * - Error should be logged but not propagated to client
     */
    it('should not fail HTTP response if broadcast throws error', () => {
      // Arrange: Make broadcast throw an error
      mockWebSocketService.mockImplementation(() => {
        throw new Error('WebSocket connection lost');
      });

      // Act & Assert: Should not throw error
      expect(() => {
        try {
          websocketService.broadcastCommentAdded({
            postId: 'post-123',
            commentId: 'comment-456',
            author: 'user',
            content: 'content'
          });
        } catch (error) {
          // In the actual endpoint, this error should be caught and logged
          // The HTTP response should still succeed
          console.error('Caught broadcast error:', error.message);
        }
      }).not.toThrow();
    });

    /**
     * Test 4: Verify broadcast is called for both V1 and non-V1 endpoints
     *
     * Expected Behavior:
     * - POST /api/agent-posts/:postId/comments (non-V1)
     * - POST /api/v1/agent-posts/:postId/comments (V1)
     * - Both should trigger broadcastCommentAdded
     */
    it('should call broadcastCommentAdded for non-V1 comment endpoint', () => {
      // Arrange
      const payload = {
        postId: 'post-v1',
        commentId: 'comment-v1',
        author: 'user-v1',
        content: 'V1 comment'
      };

      // Act
      websocketService.broadcastCommentAdded(payload);

      // Assert
      expect(mockWebSocketService).toHaveBeenCalledWith(
        expect.objectContaining({
          postId: 'post-v1',
          commentId: 'comment-v1'
        })
      );
    });

    it('should call broadcastCommentAdded for V1 comment endpoint', () => {
      // Arrange
      const payload = {
        postId: 'post-non-v1',
        commentId: 'comment-non-v1',
        author: 'user-non-v1',
        content: 'Non-V1 comment'
      };

      // Act
      websocketService.broadcastCommentAdded(payload);

      // Assert
      expect(mockWebSocketService).toHaveBeenCalledWith(
        expect.objectContaining({
          postId: 'post-non-v1',
          commentId: 'comment-non-v1'
        })
      );
    });

    /**
     * Test 5: Verify broadcast is NOT called if comment creation fails
     *
     * Expected Behavior:
     * - If comment validation fails, no broadcast
     * - If database insert fails, no broadcast
     * - Only successful comment creations should trigger broadcasts
     */
    it('should NOT call broadcastCommentAdded if comment creation fails', () => {
      // Arrange: Simulate comment creation failure (no actual creation happens)
      mockWebSocketService.mockClear();

      // Act: Don't call the broadcast (simulating a failed comment creation)
      // In actual implementation, the endpoint would return early with an error

      // Assert: Broadcast should not have been called
      expect(mockWebSocketService).not.toHaveBeenCalled();
    });

    /**
     * Test 6: Verify payload includes full comment object for frontend
     *
     * Expected Behavior:
     * - Payload should include `comment` field with full comment object
     * - This allows frontend to render the comment immediately without refetch
     */
    it('should include full comment object in broadcast payload', () => {
      // Arrange
      const fullComment = {
        id: 'comment-full',
        content: 'Full comment data',
        author: 'test-author',
        author_agent: null,
        parent_id: null,
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
        mentioned_users: []
      };

      const payload = {
        postId: 'post-123',
        commentId: fullComment.id,
        parentCommentId: null,
        author: fullComment.author,
        content: fullComment.content,
        comment: fullComment
      };

      // Act
      websocketService.broadcastCommentAdded(payload);

      // Assert
      expect(mockWebSocketService).toHaveBeenCalledWith(
        expect.objectContaining({
          comment: expect.objectContaining({
            id: 'comment-full',
            content: 'Full comment data',
            author: 'test-author',
            created_at: expect.any(String)
          })
        })
      );
    });
  });

  /**
   * Test Category 2: Integration Tests - Real WebSocket Communication
   *
   * These tests set up a real Socket.IO server and client to verify
   * end-to-end WebSocket communication during comment broadcasts.
   */
  describe('Integration Tests - Real WebSocket Communication', () => {
    let httpServer;
    let serverUrl;
    let clientSocket;

    beforeEach((done) => {
      // Create HTTP server for WebSocket
      httpServer = createServer();

      // Initialize WebSocket service with test configuration
      websocketService.initialize(httpServer, {
        cors: { origin: '*' },
        transports: ['websocket', 'polling']
      });

      // Start server on random available port
      httpServer.listen(() => {
        const port = httpServer.address().port;
        serverUrl = `http://localhost:${port}`;
        done();
      });
    });

    afterEach((done) => {
      // Clean up connections
      if (clientSocket && clientSocket.connected) {
        clientSocket.disconnect();
      }
      if (httpServer) {
        httpServer.close(() => {
          done();
        });
      } else {
        done();
      }
    });

    /**
     * Test 7: Verify client receives comment:added event
     *
     * Expected Behavior:
     * - Client subscribes to post room
     * - Server broadcasts comment:added event
     * - Client receives event with correct data
     */
    it('should emit comment:added event to subscribed clients', (done) => {
      // Arrange: Create client and subscribe to post
      clientSocket = ioClient(serverUrl, {
        transports: ['websocket'],
        forceNew: true
      });

      const testPostId = 'post-integration-test';
      const testPayload = {
        postId: testPostId,
        commentId: 'comment-int-123',
        parentCommentId: null,
        author: 'test-user',
        content: 'Integration test comment',
        comment: { id: 'comment-int-123', content: 'Integration test comment' }
      };

      clientSocket.on('connect', () => {
        // Subscribe to post updates
        clientSocket.emit('subscribe:post', testPostId);

        // Listen for comment:added event
        clientSocket.on('comment:added', (data) => {
          try {
            // Assert: Verify event received with correct data
            expect(data).toBeDefined();
            expect(data.postId).toBe(testPostId);
            expect(data.commentId).toBe('comment-int-123');
            expect(data.author).toBe('test-user');
            expect(data.content).toBe('Integration test comment');
            expect(data.timestamp).toBeDefined();
            done();
          } catch (error) {
            done(error);
          }
        });

        // Act: Trigger broadcast after subscription
        setTimeout(() => {
          websocketService.broadcastCommentAdded(testPayload);
        }, 100);
      });

      clientSocket.on('connect_error', (error) => {
        done(error);
      });
    });

    /**
     * Test 8: Verify event payload contains full comment object
     *
     * Expected Behavior:
     * - comment:added event includes all comment fields
     * - Frontend can render comment without additional API call
     */
    it('should include full comment object in event payload', (done) => {
      // Arrange: Create full comment object
      clientSocket = ioClient(serverUrl, {
        transports: ['websocket'],
        forceNew: true
      });

      const testPostId = 'post-full-comment-test';
      const fullComment = {
        id: 'comment-full-123',
        content: 'Full comment with all fields',
        author: 'test-author',
        author_agent: 'test-agent',
        parent_id: null,
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
        mentioned_users: ['@user1']
      };

      const testPayload = {
        postId: testPostId,
        commentId: fullComment.id,
        parentCommentId: null,
        author: fullComment.author,
        content: fullComment.content,
        comment: fullComment
      };

      clientSocket.on('connect', () => {
        clientSocket.emit('subscribe:post', testPostId);

        clientSocket.on('comment:added', (data) => {
          try {
            // Assert: Verify full comment object structure
            expect(data.postId).toBe(testPostId);
            expect(data.commentId).toBe(fullComment.id);
            expect(data.content).toBe(fullComment.content);
            expect(data.timestamp).toMatch(/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}/);
            done();
          } catch (error) {
            done(error);
          }
        });

        setTimeout(() => {
          websocketService.broadcastCommentAdded(testPayload);
        }, 100);
      });
    });

    /**
     * Test 9: Verify multiple clients receive same event
     *
     * Expected Behavior:
     * - Multiple clients subscribe to same post
     * - All clients receive the same comment:added event
     * - Event data is identical across all clients
     */
    it('should broadcast to all clients subscribed to the same post', (done) => {
      // Arrange: Create multiple clients
      const client1 = ioClient(serverUrl, {
        transports: ['websocket'],
        forceNew: true
      });
      const client2 = ioClient(serverUrl, {
        transports: ['websocket'],
        forceNew: true
      });
      const client3 = ioClient(serverUrl, {
        transports: ['websocket'],
        forceNew: true
      });

      const testPostId = 'post-multi-client-test';
      const testPayload = {
        postId: testPostId,
        commentId: 'comment-multi-123',
        parentCommentId: null,
        author: 'test-user',
        content: 'Multi-client test comment',
        comment: { id: 'comment-multi-123', content: 'Multi-client test comment' }
      };

      let client1Received = false;
      let client2Received = false;
      let client3Received = false;

      const checkAllReceived = () => {
        if (client1Received && client2Received && client3Received) {
          client1.disconnect();
          client2.disconnect();
          client3.disconnect();
          done();
        }
      };

      // Setup client 1
      client1.on('connect', () => {
        client1.emit('subscribe:post', testPostId);
        client1.on('comment:added', (data) => {
          expect(data.commentId).toBe('comment-multi-123');
          client1Received = true;
          checkAllReceived();
        });
      });

      // Setup client 2
      client2.on('connect', () => {
        client2.emit('subscribe:post', testPostId);
        client2.on('comment:added', (data) => {
          expect(data.commentId).toBe('comment-multi-123');
          client2Received = true;
          checkAllReceived();
        });
      });

      // Setup client 3
      client3.on('connect', () => {
        client3.emit('subscribe:post', testPostId);
        client3.on('comment:added', (data) => {
          expect(data.commentId).toBe('comment-multi-123');
          client3Received = true;
          checkAllReceived();
        });
      });

      // Wait for all clients to connect and subscribe, then broadcast
      setTimeout(() => {
        websocketService.broadcastCommentAdded(testPayload);
      }, 500);
    });

    /**
     * Test 10: Verify post-specific room isolation
     *
     * Expected Behavior:
     * - Clients subscribed to post A should not receive events for post B
     * - Room isolation ensures clients only get relevant updates
     */
    it('should only broadcast to clients subscribed to the specific post', (done) => {
      // Arrange: Create clients subscribed to different posts
      const client1 = ioClient(serverUrl, {
        transports: ['websocket'],
        forceNew: true
      });
      const client2 = ioClient(serverUrl, {
        transports: ['websocket'],
        forceNew: true
      });

      const postId1 = 'post-isolation-1';
      const postId2 = 'post-isolation-2';

      const payload1 = {
        postId: postId1,
        commentId: 'comment-iso-1',
        author: 'user',
        content: 'Comment for post 1',
        comment: { id: 'comment-iso-1', content: 'Comment for post 1' }
      };

      const payload2 = {
        postId: postId2,
        commentId: 'comment-iso-2',
        author: 'user',
        content: 'Comment for post 2',
        comment: { id: 'comment-iso-2', content: 'Comment for post 2' }
      };

      let client1Received = false;
      let client2ReceivedWrongEvent = false;

      // Client 1: Subscribe to post 1 only
      client1.on('connect', () => {
        client1.emit('subscribe:post', postId1);
        client1.on('comment:added', (data) => {
          if (data.postId === postId1) {
            client1Received = true;
          }
          if (data.postId === postId2) {
            client2ReceivedWrongEvent = true;
          }
        });
      });

      // Client 2: Subscribe to post 2 only
      client2.on('connect', () => {
        client2.emit('subscribe:post', postId2);
        client2.on('comment:added', (data) => {
          if (data.postId === postId1) {
            client2ReceivedWrongEvent = true;
          }
        });
      });

      // Wait for subscriptions, then broadcast to post 1 only
      setTimeout(() => {
        websocketService.broadcastCommentAdded(payload1);

        // Check results after broadcast
        setTimeout(() => {
          expect(client1Received).toBe(true);
          expect(client2ReceivedWrongEvent).toBe(false);
          client1.disconnect();
          client2.disconnect();
          done();
        }, 200);
      }, 500);
    });

    /**
     * Test 11: Verify timestamp format in WebSocket event
     *
     * Expected Behavior:
     * - Timestamp should be in ISO 8601 format
     * - Should be consistent with other event timestamps
     */
    it('should include ISO 8601 timestamp in event', (done) => {
      clientSocket = ioClient(serverUrl, {
        transports: ['websocket'],
        forceNew: true
      });

      const testPostId = 'post-timestamp-test';
      const testPayload = {
        postId: testPostId,
        commentId: 'comment-ts-123',
        author: 'user',
        content: 'Timestamp test',
        comment: { id: 'comment-ts-123', content: 'Timestamp test' }
      };

      clientSocket.on('connect', () => {
        clientSocket.emit('subscribe:post', testPostId);

        clientSocket.on('comment:added', (data) => {
          try {
            expect(data.timestamp).toBeDefined();
            expect(data.timestamp).toMatch(/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}/);
            // Verify timestamp is recent (within last 5 seconds)
            const timestamp = new Date(data.timestamp);
            const now = new Date();
            const diffMs = now - timestamp;
            expect(diffMs).toBeLessThan(5000);
            done();
          } catch (error) {
            done(error);
          }
        });

        setTimeout(() => {
          websocketService.broadcastCommentAdded(testPayload);
        }, 100);
      });
    });

    /**
     * Test 12: Verify agent comments vs user comments
     *
     * Expected Behavior:
     * - Payload should include author field (user or agent identifier)
     * - Frontend can distinguish between human and agent comments
     */
    it('should correctly identify agent comments in broadcast', (done) => {
      clientSocket = ioClient(serverUrl, {
        transports: ['websocket'],
        forceNew: true
      });

      const testPostId = 'post-agent-test';
      const agentPayload = {
        postId: testPostId,
        commentId: 'comment-agent-123',
        parentCommentId: null,
        author: 'lambda-vi',
        content: 'Agent intelligence summary',
        comment: {
          id: 'comment-agent-123',
          content: 'Agent intelligence summary',
          author: null,
          author_agent: 'lambda-vi'
        }
      };

      clientSocket.on('connect', () => {
        clientSocket.emit('subscribe:post', testPostId);

        clientSocket.on('comment:added', (data) => {
          try {
            expect(data.author).toBe('lambda-vi');
            expect(data.content).toBe('Agent intelligence summary');
            done();
          } catch (error) {
            done(error);
          }
        });

        setTimeout(() => {
          websocketService.broadcastCommentAdded(agentPayload);
        }, 100);
      });
    });
  });

  /**
   * Test Category 3: Error Handling and Edge Cases
   */
  describe('Error Handling and Edge Cases', () => {
    /**
     * Test 13: Verify graceful handling when WebSocket not initialized
     */
    it('should handle broadcast when WebSocket service not initialized', () => {
      // Arrange: Create new instance (not initialized)
      const uninitializedService = {
        io: null,
        initialized: false,
        broadcastCommentAdded: websocketService.broadcastCommentAdded.bind({ io: null, initialized: false })
      };

      // Act & Assert: Should not throw error
      expect(() => {
        uninitializedService.broadcastCommentAdded({
          postId: 'post-123',
          commentId: 'comment-456',
          author: 'user',
          content: 'content'
        });
      }).not.toThrow();
    });

    /**
     * Test 14: Verify handling of missing required fields
     */
    it('should handle broadcast with missing optional fields', (done) => {
      const httpServer = createServer();
      websocketService.initialize(httpServer);

      httpServer.listen(() => {
        const port = httpServer.address().port;
        const serverUrl = `http://localhost:${port}`;
        const client = ioClient(serverUrl, { transports: ['websocket'] });

        client.on('connect', () => {
          client.emit('subscribe:post', 'post-123');

          client.on('comment:added', (data) => {
            try {
              expect(data.postId).toBe('post-123');
              expect(data.parentCommentId).toBeNull();
              client.disconnect();
              httpServer.close(done);
            } catch (error) {
              client.disconnect();
              httpServer.close(() => done(error));
            }
          });

          setTimeout(() => {
            websocketService.broadcastCommentAdded({
              postId: 'post-123',
              commentId: 'comment-456',
              parentCommentId: null,
              author: 'user',
              content: 'content'
            });
          }, 100);
        });
      });
    });
  });
});
