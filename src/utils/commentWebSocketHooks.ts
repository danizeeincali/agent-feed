import { commentWebSocketManager } from '@/api/websockets/comments';
import { logger } from '@/utils/logger';

/**
 * WebSocket hooks for comment operations
 * These functions integrate with the existing comment routes to provide real-time updates
 */

export const commentHooks = {
  /**
   * Called after a comment is created
   */
  onCommentCreated: async (postId: string, commentId: string, parentId?: string) => {
    try {
      commentWebSocketManager.broadcastCommentUpdate(postId, commentId, 'created');
      
      if (parentId) {
        // Notify subscribers of the parent comment
        await commentWebSocketManager.notifySubscribers(parentId, 'reply');
      }
      
      logger.debug('Comment creation broadcasted', { postId, commentId, parentId });
    } catch (error) {
      logger.error('Failed to broadcast comment creation', { error, postId, commentId });
    }
  },

  /**
   * Called after a comment is updated
   */
  onCommentUpdated: async (postId: string, commentId: string) => {
    try {
      commentWebSocketManager.broadcastCommentUpdate(postId, commentId, 'updated');
      logger.debug('Comment update broadcasted', { postId, commentId });
    } catch (error) {
      logger.error('Failed to broadcast comment update', { error, postId, commentId });
    }
  },

  /**
   * Called after a comment is deleted
   */
  onCommentDeleted: async (postId: string, commentId: string) => {
    try {
      commentWebSocketManager.broadcastCommentUpdate(postId, commentId, 'deleted');
      logger.debug('Comment deletion broadcasted', { postId, commentId });
    } catch (error) {
      logger.error('Failed to broadcast comment deletion', { error, postId, commentId });
    }
  },

  /**
   * Called after a reaction is added/removed
   */
  onReactionUpdated: async (postId: string, commentId: string, reactions: any) => {
    try {
      commentWebSocketManager.broadcastReactionUpdate(postId, commentId, reactions);
      
      // Notify comment subscribers about the reaction
      await commentWebSocketManager.notifySubscribers(commentId, 'reaction');
      
      logger.debug('Reaction update broadcasted', { postId, commentId });
    } catch (error) {
      logger.error('Failed to broadcast reaction update', { error, postId, commentId });
    }
  },

  /**
   * Called when a user is mentioned in a comment
   */
  onUserMentioned: async (postId: string, commentId: string, mentionedUsers: string[]) => {
    try {
      if (mentionedUsers.length > 0) {
        await commentWebSocketManager.notifySubscribers(commentId, 'mention');
        logger.debug('Mention notifications sent', { postId, commentId, mentionedUsers });
      }
    } catch (error) {
      logger.error('Failed to send mention notifications', { error, postId, commentId });
    }
  }
};

export default commentHooks;