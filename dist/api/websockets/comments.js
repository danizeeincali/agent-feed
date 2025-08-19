"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.commentWebSocketManager = void 0;
const ws_1 = __importDefault(require("ws"));
const logger_1 = require("@/utils/logger");
const connection_1 = require("@/database/connection");
class CommentWebSocketManager {
    wss = null;
    connections = new Map();
    initialize(server) {
        this.wss = new ws_1.default.Server({
            server,
            path: '/api/ws/comments'
        });
        this.wss.on('connection', (ws, request) => {
            const url = new URL(request.url || '', `http://${request.headers.host}`);
            const postId = url.pathname.split('/').pop();
            if (!postId) {
                ws.close(1008, 'Invalid post ID');
                return;
            }
            logger_1.logger.info('WebSocket connection established for post', { postId });
            // Add connection to post group
            if (!this.connections.has(postId)) {
                this.connections.set(postId, new Set());
            }
            this.connections.get(postId).add(ws);
            // Handle client messages
            ws.on('message', (data) => {
                try {
                    const message = JSON.parse(data.toString());
                    this.handleClientMessage(ws, message, postId);
                }
                catch (error) {
                    logger_1.logger.error('Failed to parse WebSocket message', { error });
                }
            });
            // Handle connection close
            ws.on('close', () => {
                logger_1.logger.info('WebSocket connection closed for post', { postId });
                this.connections.get(postId)?.delete(ws);
                // Clean up empty post groups
                if (this.connections.get(postId)?.size === 0) {
                    this.connections.delete(postId);
                }
            });
            // Handle errors
            ws.on('error', (error) => {
                logger_1.logger.error('WebSocket error', { error, postId });
                this.connections.get(postId)?.delete(ws);
            });
            // Send initial connection confirmation
            ws.send(JSON.stringify({
                type: 'connection_established',
                postId,
                message: 'Connected to comment updates'
            }));
        });
        logger_1.logger.info('Comment WebSocket server initialized');
    }
    handleClientMessage(ws, message, postId) {
        switch (message.type) {
            case 'ping':
                ws.send(JSON.stringify({ type: 'pong' }));
                break;
            case 'subscribe_comment':
                // Handle comment-specific subscriptions
                this.handleCommentSubscription(ws, message.commentId, postId);
                break;
            default:
                logger_1.logger.warn('Unknown WebSocket message type', { type: message.type });
        }
    }
    handleCommentSubscription(ws, commentId, postId) {
        // Store comment-specific subscription
        // This could be extended to track user-specific subscriptions
        logger_1.logger.info('Comment subscription added', { commentId, postId });
    }
    broadcastToPost(postId, data) {
        const connections = this.connections.get(postId);
        if (!connections || connections.size === 0) {
            return;
        }
        const message = JSON.stringify(data);
        const deadConnections = [];
        connections.forEach(ws => {
            if (ws.readyState === ws_1.default.OPEN) {
                try {
                    ws.send(message);
                }
                catch (error) {
                    logger_1.logger.error('Failed to send WebSocket message', { error });
                    deadConnections.push(ws);
                }
            }
            else {
                deadConnections.push(ws);
            }
        });
        // Clean up dead connections
        deadConnections.forEach(ws => {
            connections.delete(ws);
        });
        logger_1.logger.debug('WebSocket message broadcast', {
            postId,
            type: data.type,
            connections: connections.size
        });
    }
    broadcastCommentUpdate(postId, commentId, updateType) {
        this.broadcastToPost(postId, {
            type: 'comment_update',
            commentId,
            postId,
            data: { updateType }
        });
    }
    broadcastReactionUpdate(postId, commentId, reactions) {
        this.broadcastToPost(postId, {
            type: 'reaction_update',
            commentId,
            postId,
            data: { reactions }
        });
    }
    async notifySubscribers(commentId, notificationType) {
        try {
            // Get active subscriptions for this comment
            const subscriptions = await connection_1.db.query(`
        SELECT DISTINCT cs.user_id, cs.subscription_type, c.post_id
        FROM comment_subscriptions cs
        JOIN comments c ON cs.comment_id = c.id OR c.parent_id = cs.comment_id
        WHERE (cs.comment_id = $1 OR c.id = $1) 
        AND cs.is_active = TRUE
        AND (
          (cs.subscription_type = 'thread') OR
          (cs.subscription_type = 'replies' AND $2 = 'reply') OR
          (cs.subscription_type = 'mentions' AND $2 = 'mention')
        )
      `, [commentId, notificationType]);
            if (subscriptions.rows.length === 0) {
                return;
            }
            const postId = subscriptions.rows[0].post_id;
            // Group users by subscription type
            const notificationData = {
                commentId,
                notificationType,
                subscribers: subscriptions.rows.map(row => ({
                    userId: row.user_id,
                    subscriptionType: row.subscription_type
                }))
            };
            this.broadcastToPost(postId, {
                type: 'subscription_notification',
                commentId,
                postId,
                data: notificationData
            });
            logger_1.logger.info('Subscription notifications sent', {
                commentId,
                notificationType,
                subscriberCount: subscriptions.rows.length
            });
        }
        catch (error) {
            logger_1.logger.error('Failed to send subscription notifications', {
                error: error instanceof Error ? error.message : 'Unknown error',
                commentId,
                notificationType
            });
        }
    }
    getConnectionStats() {
        const stats = {};
        this.connections.forEach((connections, postId) => {
            stats[postId] = connections.size;
        });
        return stats;
    }
    close() {
        if (this.wss) {
            this.wss.close();
            logger_1.logger.info('Comment WebSocket server closed');
        }
    }
}
exports.commentWebSocketManager = new CommentWebSocketManager();
//# sourceMappingURL=comments.js.map