"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.commentHooks = void 0;
const comments_1 = require("@/api/websockets/comments");
const logger_1 = require("@/utils/logger");
/**
 * WebSocket hooks for comment operations
 * These functions integrate with the existing comment routes to provide real-time updates
 */
exports.commentHooks = {
    /**
     * Called after a comment is created
     */
    onCommentCreated: async (postId, commentId, parentId) => {
        try {
            comments_1.commentWebSocketManager.broadcastCommentUpdate(postId, commentId, 'created');
            if (parentId) {
                // Notify subscribers of the parent comment
                await comments_1.commentWebSocketManager.notifySubscribers(parentId, 'reply');
            }
            logger_1.logger.debug('Comment creation broadcasted', { postId, commentId, parentId });
        }
        catch (error) {
            logger_1.logger.error('Failed to broadcast comment creation', { error, postId, commentId });
        }
    },
    /**
     * Called after a comment is updated
     */
    onCommentUpdated: async (postId, commentId) => {
        try {
            comments_1.commentWebSocketManager.broadcastCommentUpdate(postId, commentId, 'updated');
            logger_1.logger.debug('Comment update broadcasted', { postId, commentId });
        }
        catch (error) {
            logger_1.logger.error('Failed to broadcast comment update', { error, postId, commentId });
        }
    },
    /**
     * Called after a comment is deleted
     */
    onCommentDeleted: async (postId, commentId) => {
        try {
            comments_1.commentWebSocketManager.broadcastCommentUpdate(postId, commentId, 'deleted');
            logger_1.logger.debug('Comment deletion broadcasted', { postId, commentId });
        }
        catch (error) {
            logger_1.logger.error('Failed to broadcast comment deletion', { error, postId, commentId });
        }
    },
    /**
     * Called after a reaction is added/removed
     */
    onReactionUpdated: async (postId, commentId, reactions) => {
        try {
            comments_1.commentWebSocketManager.broadcastReactionUpdate(postId, commentId, reactions);
            // Notify comment subscribers about the reaction
            await comments_1.commentWebSocketManager.notifySubscribers(commentId, 'reaction');
            logger_1.logger.debug('Reaction update broadcasted', { postId, commentId });
        }
        catch (error) {
            logger_1.logger.error('Failed to broadcast reaction update', { error, postId, commentId });
        }
    },
    /**
     * Called when a user is mentioned in a comment
     */
    onUserMentioned: async (postId, commentId, mentionedUsers) => {
        try {
            if (mentionedUsers.length > 0) {
                await comments_1.commentWebSocketManager.notifySubscribers(commentId, 'mention');
                logger_1.logger.debug('Mention notifications sent', { postId, commentId, mentionedUsers });
            }
        }
        catch (error) {
            logger_1.logger.error('Failed to send mention notifications', { error, postId, commentId });
        }
    }
};
exports.default = exports.commentHooks;
//# sourceMappingURL=commentWebSocketHooks.js.map