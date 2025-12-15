import WebSocket from 'ws';
import { Server } from 'http';
import { logger } from '@/utils/logger';
import { db } from '@/database/connection';

interface CommentWebSocketData {
  type: 'comment_update' | 'comment_delete' | 'reaction_update' | 'subscription_notification';
  commentId: string;
  postId: string;
  data?: any;
}

class CommentWebSocketManager {
  private wss: WebSocket.Server | null = null;
  private connections = new Map<string, Set<WebSocket>>();

  public initialize(server: Server): void {
    this.wss = new WebSocket.Server({ 
      server,
      path: '/api/ws/comments'
    });

    this.wss.on('connection', (ws: WebSocket, request) => {
      const url = new URL(request.url || '', `http://${request.headers.host}`);
      const postId = url.pathname.split('/').pop();

      if (!postId) {
        ws.close(1008, 'Invalid post ID');
        return;
      }

      logger.info('WebSocket connection established for post', { postId });

      // Add connection to post group
      if (!this.connections.has(postId)) {
        this.connections.set(postId, new Set());
      }
      this.connections.get(postId)!.add(ws);

      // Handle client messages
      ws.on('message', (data: WebSocket.Data) => {
        try {
          const message = JSON.parse(data.toString());
          this.handleClientMessage(ws, message, postId);
        } catch (error) {
          logger.error('Failed to parse WebSocket message', { error });
        }
      });

      // Handle connection close
      ws.on('close', () => {
        logger.info('WebSocket connection closed for post', { postId });
        this.connections.get(postId)?.delete(ws);
        
        // Clean up empty post groups
        if (this.connections.get(postId)?.size === 0) {
          this.connections.delete(postId);
        }
      });

      // Handle errors
      ws.on('error', (error) => {
        logger.error('WebSocket error', { error, postId });
        this.connections.get(postId)?.delete(ws);
      });

      // Send initial connection confirmation
      ws.send(JSON.stringify({
        type: 'connection_established',
        postId,
        message: 'Connected to comment updates'
      }));
    });

    logger.info('Comment WebSocket server initialized');
  }

  private handleClientMessage(ws: WebSocket, message: any, postId: string): void {
    switch (message.type) {
      case 'ping':
        ws.send(JSON.stringify({ type: 'pong' }));
        break;
      
      case 'subscribe_comment':
        // Handle comment-specific subscriptions
        this.handleCommentSubscription(ws, message.commentId, postId);
        break;
        
      default:
        logger.warn('Unknown WebSocket message type', { type: message.type });
    }
  }

  private handleCommentSubscription(ws: WebSocket, commentId: string, postId: string): void {
    // Store comment-specific subscription
    // This could be extended to track user-specific subscriptions
    logger.info('Comment subscription added', { commentId, postId });
  }

  public broadcastToPost(postId: string, data: CommentWebSocketData): void {
    const connections = this.connections.get(postId);
    if (!connections || connections.size === 0) {
      return;
    }

    const message = JSON.stringify(data);
    const deadConnections: WebSocket[] = [];

    connections.forEach(ws => {
      if (ws.readyState === WebSocket.OPEN) {
        try {
          ws.send(message);
        } catch (error) {
          logger.error('Failed to send WebSocket message', { error });
          deadConnections.push(ws);
        }
      } else {
        deadConnections.push(ws);
      }
    });

    // Clean up dead connections
    deadConnections.forEach(ws => {
      connections.delete(ws);
    });

    logger.debug('WebSocket message broadcast', { 
      postId, 
      type: data.type, 
      connections: connections.size 
    });
  }

  public broadcastCommentUpdate(postId: string, commentId: string, updateType: 'created' | 'updated' | 'deleted'): void {
    this.broadcastToPost(postId, {
      type: 'comment_update',
      commentId,
      postId,
      data: { updateType }
    });
  }

  public broadcastReactionUpdate(postId: string, commentId: string, reactions: any): void {
    this.broadcastToPost(postId, {
      type: 'reaction_update',
      commentId,
      postId,
      data: { reactions }
    });
  }

  public async notifySubscribers(commentId: string, notificationType: 'reply' | 'mention' | 'reaction'): Promise<void> {
    try {
      // Get active subscriptions for this comment
      const subscriptions = await db.query(`
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

      logger.info('Subscription notifications sent', { 
        commentId, 
        notificationType, 
        subscriberCount: subscriptions.rows.length 
      });

    } catch (error) {
      logger.error('Failed to send subscription notifications', { 
        error: error instanceof Error ? error.message : 'Unknown error',
        commentId,
        notificationType 
      });
    }
  }

  public getConnectionStats(): { [postId: string]: number } {
    const stats: { [postId: string]: number } = {};
    this.connections.forEach((connections, postId) => {
      stats[postId] = connections.size;
    });
    return stats;
  }

  public close(): void {
    if (this.wss) {
      this.wss.close();
      logger.info('Comment WebSocket server closed');
    }
  }
}

export const commentWebSocketManager = new CommentWebSocketManager();