import { useEffect, useRef, useCallback } from 'react';
import { socket, subscribeToPost, unsubscribeFromPost } from '../services/socket';
import { CommentTreeNode } from '../components/comments/CommentSystem';

interface UseRealtimeCommentsOptions {
  enabled?: boolean;
  onCommentAdded?: (comment: CommentTreeNode) => void;
  onCommentUpdated?: (comment: CommentTreeNode) => void;
  onCommentDeleted?: (commentId: string) => void;
  onAgentResponse?: (response: CommentTreeNode) => void;
  onReactionUpdate?: (commentId: string, reactions: Record<string, number>) => void;
  onConnectionChange?: (connected: boolean) => void;
}

/**
 * Custom hook for real-time comment updates via WebSocket (Socket.IO)
 *
 * Features:
 * - Subscribes to real-time comment events for a specific post
 * - Handles comment additions, updates, and deletions
 * - Manages WebSocket connection lifecycle
 * - Provides callbacks for all comment events
 * - Auto-reconnection on connection loss
 * - Cleanup on unmount
 *
 * Events listened to:
 * - comment:added - New comment posted
 * - comment:updated - Comment content/status updated
 * - comment:deleted - Comment soft deleted
 * - comment:reaction - Reaction added to comment
 * - agent:response - Agent responded to a comment
 */
export const useRealtimeComments = (
  postId: string,
  options: UseRealtimeCommentsOptions = {}
): void => {
  const {
    enabled = true,
    onCommentAdded,
    onCommentUpdated,
    onCommentDeleted,
    onAgentResponse,
    onReactionUpdate,
    onConnectionChange
  } = options;

  // Store callbacks in refs to avoid re-creating listeners on every render
  const callbacksRef = useRef({
    onCommentAdded,
    onCommentUpdated,
    onCommentDeleted,
    onAgentResponse,
    onReactionUpdate,
    onConnectionChange
  });

  // Update refs when callbacks change
  useEffect(() => {
    callbacksRef.current = {
      onCommentAdded,
      onCommentUpdated,
      onCommentDeleted,
      onAgentResponse,
      onReactionUpdate,
      onConnectionChange
    };
  }, [onCommentAdded, onCommentUpdated, onCommentDeleted, onAgentResponse, onReactionUpdate, onConnectionChange]);

  /**
   * Transform API comment data to CommentTreeNode format
   */
  const transformComment = useCallback((data: any): CommentTreeNode => {
    return {
      id: data.id,
      content: data.content,
      contentType: data.content_type || 'text',
      author: {
        type: data.author_type || (data.author?.startsWith('agent-') ? 'agent' : 'user'),
        id: data.author || 'unknown',
        name: data.author || 'Unknown',
        avatar: data.author?.charAt(0).toUpperCase() || 'U'
      },
      metadata: {
        threadDepth: data.thread_depth || 0,
        threadPath: data.thread_path || data.id,
        replyCount: data.reply_count || 0,
        likeCount: data.like_count || 0,
        reactionCount: data.reaction_count || 0,
        isAgentResponse: data.is_agent_response || false,
        responseToAgent: data.response_to_agent,
        conversationThreadId: data.conversation_thread_id,
        qualityScore: data.quality_score
      },
      engagement: {
        likes: data.like_count || 0,
        reactions: data.reactions || {},
        userReacted: false,
        userReactionType: undefined
      },
      status: data.status || 'published',
      children: [],
      createdAt: data.created_at || data.createdAt || new Date().toISOString(),
      updatedAt: data.updated_at || data.updatedAt || new Date().toISOString()
    };
  }, []);

  /**
   * Handle comment:added event
   */
  const handleCommentAdded = useCallback((data: any) => {
    console.log('[Realtime] Comment added:', data);

    if (data.postId === postId && callbacksRef.current.onCommentAdded) {
      try {
        const comment = transformComment(data.comment || data);
        callbacksRef.current.onCommentAdded(comment);
      } catch (err) {
        console.error('[Realtime] Error handling comment added:', err);
      }
    }
  }, [postId, transformComment]);

  /**
   * Handle comment:updated event
   */
  const handleCommentUpdated = useCallback((data: any) => {
    console.log('[Realtime] Comment updated:', data);

    if (data.postId === postId && callbacksRef.current.onCommentUpdated) {
      try {
        const comment = transformComment(data.comment || data);
        callbacksRef.current.onCommentUpdated(comment);
      } catch (err) {
        console.error('[Realtime] Error handling comment updated:', err);
      }
    }
  }, [postId, transformComment]);

  /**
   * Handle comment:deleted event
   */
  const handleCommentDeleted = useCallback((data: any) => {
    console.log('[Realtime] Comment deleted:', data);

    if (data.postId === postId && callbacksRef.current.onCommentDeleted) {
      try {
        const commentId = data.commentId || data.id;
        callbacksRef.current.onCommentDeleted(commentId);
      } catch (err) {
        console.error('[Realtime] Error handling comment deleted:', err);
      }
    }
  }, [postId]);

  /**
   * Handle comment:reaction event
   */
  const handleCommentReaction = useCallback((data: any) => {
    console.log('[Realtime] Comment reaction:', data);

    if (data.postId === postId && callbacksRef.current.onReactionUpdate) {
      try {
        const commentId = data.commentId || data.id;
        const reactions = data.reactions || {};
        callbacksRef.current.onReactionUpdate(commentId, reactions);
      } catch (err) {
        console.error('[Realtime] Error handling comment reaction:', err);
      }
    }
  }, [postId]);

  /**
   * Handle agent:response event
   */
  const handleAgentResponse = useCallback((data: any) => {
    console.log('[Realtime] Agent response:', data);

    if (data.postId === postId && callbacksRef.current.onAgentResponse) {
      try {
        const response = transformComment(data.response || data);
        callbacksRef.current.onAgentResponse(response);
      } catch (err) {
        console.error('[Realtime] Error handling agent response:', err);
      }
    }
  }, [postId, transformComment]);

  /**
   * Handle connection status changes
   */
  const handleConnect = useCallback(() => {
    console.log('[Realtime] WebSocket connected');

    if (callbacksRef.current.onConnectionChange) {
      callbacksRef.current.onConnectionChange(true);
    }

    // Subscribe to post-specific room when connected
    subscribeToPost(postId);
  }, [postId]);

  const handleDisconnect = useCallback(() => {
    console.log('[Realtime] WebSocket disconnected');

    if (callbacksRef.current.onConnectionChange) {
      callbacksRef.current.onConnectionChange(false);
    }
  }, []);

  const handleConnectError = useCallback((error: Error) => {
    console.error('[Realtime] WebSocket connection error:', error);
  }, []);

  const handleReconnect = useCallback((attemptNumber: number) => {
    console.log('[Realtime] WebSocket reconnected after', attemptNumber, 'attempts');

    if (callbacksRef.current.onConnectionChange) {
      callbacksRef.current.onConnectionChange(true);
    }

    // Re-subscribe to post room after reconnection
    subscribeToPost(postId);
  }, [postId]);

  /**
   * Setup WebSocket connection and event listeners
   */
  useEffect(() => {
    if (!enabled) {
      console.log('[Realtime] Real-time updates disabled');
      return;
    }

    console.log('[Realtime] Setting up real-time comments for post:', postId);

    // Connect to WebSocket if not already connected
    if (!socket.connected) {
      socket.connect();
    } else {
      // Already connected, subscribe immediately
      subscribeToPost(postId);
    }

    // Register connection event listeners
    socket.on('connect', handleConnect);
    socket.on('disconnect', handleDisconnect);
    socket.on('connect_error', handleConnectError);
    socket.on('reconnect', handleReconnect);

    // Register comment event listeners
    socket.on('comment:added', handleCommentAdded);
    socket.on('comment:updated', handleCommentUpdated);
    socket.on('comment:deleted', handleCommentDeleted);
    socket.on('comment:reaction', handleCommentReaction);
    socket.on('agent:response', handleAgentResponse);

    // Cleanup function - remove listeners and unsubscribe
    return () => {
      console.log('[Realtime] Cleaning up real-time comments for post:', postId);

      // Remove all event listeners
      socket.off('connect', handleConnect);
      socket.off('disconnect', handleDisconnect);
      socket.off('connect_error', handleConnectError);
      socket.off('reconnect', handleReconnect);
      socket.off('comment:added', handleCommentAdded);
      socket.off('comment:updated', handleCommentUpdated);
      socket.off('comment:deleted', handleCommentDeleted);
      socket.off('comment:reaction', handleCommentReaction);
      socket.off('agent:response', handleAgentResponse);

      // Unsubscribe from post-specific room
      unsubscribeFromPost(postId);

      // Note: We don't disconnect the socket here as it might be used by other components
      // Socket connection is managed globally by the socket service
    };
  }, [
    enabled,
    postId,
    handleConnect,
    handleDisconnect,
    handleConnectError,
    handleReconnect,
    handleCommentAdded,
    handleCommentUpdated,
    handleCommentDeleted,
    handleCommentReaction,
    handleAgentResponse
  ]);

  // Log current connection status for debugging
  useEffect(() => {
    if (enabled) {
      console.log('[Realtime] Socket connection status:', socket.connected ? 'Connected' : 'Disconnected');
    }
  }, [enabled, socket.connected]);
};
