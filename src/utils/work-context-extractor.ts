/**
 * Work Context Extractor
 *
 * Extracts posting context from work ticket metadata to determine:
 * - Origin type (post/comment/autonomous)
 * - Parent post ID for reply targeting
 * - Parent comment ID for nested replies
 * - Conversation depth
 *
 * Used by ClaudeCodeWorker to determine appropriate posting strategy
 * for agent outcomes (reply to existing post vs create new post).
 */

import { WorkTicket } from '../types/work-ticket';
import logger from './logger';

/**
 * Origin type discriminator
 * - post: Originated from a user-created post
 * - comment: Originated from a user-created comment
 * - autonomous: Created by system/cron (no parent)
 */
export type OriginType = 'post' | 'comment' | 'autonomous';

/**
 * Extracted work context from ticket metadata
 */
export interface WorkContext {
  /** Ticket identifier */
  ticketId: string;

  /** Origin type (post/comment/autonomous) */
  originType: OriginType;

  /** Parent post ID if replying (null for autonomous) */
  parentPostId: number | null;

  /** Parent comment ID if nested reply (null for top-level) */
  parentCommentId: number | null;

  /** Original user request text */
  userRequest: string;

  /** Conversation depth (0 = top-level) */
  conversationDepth: number;

  /** User ID */
  userId: string;

  /** Agent name */
  agentName: string;
}

/**
 * Reply target for threaded comments
 */
export interface ReplyTarget {
  /** Post ID to reply to */
  postId: number;

  /** Optional comment ID for nested replies */
  commentId?: number;
}

/**
 * Ticket metadata structure from database
 * Based on post_metadata JSONB field from work_queue table
 */
interface TicketMetadata {
  // Comment metadata
  type?: 'post' | 'comment';
  parent_post_id?: number;
  parent_post_title?: string;
  parent_post_content?: string;
  parent_comment_id?: number;
  mentioned_users?: string[];
  depth?: number;

  // Post metadata
  title?: string;
  tags?: string[];

  // Additional fields
  [key: string]: any;
}

/**
 * Work Context Extractor
 *
 * Extracts context from work tickets for determining posting strategy
 */
export class WorkContextExtractor {
  /**
   * Extract complete context from work ticket
   *
   * Parses ticket metadata to determine origin type, parent IDs,
   * and conversation context. Handles missing metadata gracefully
   * with safe defaults.
   *
   * @param ticket - Work ticket to extract context from
   * @returns WorkContext with all required fields
   */
  extractContext(ticket: WorkTicket): WorkContext {
    try {
      // Extract metadata from payload
      const metadata = this.extractMetadata(ticket);

      // Determine origin type
      const originType = this.determineOriginType(metadata, ticket);

      // Extract parent IDs
      const parentPostId = this.extractParentPostId(metadata, ticket, originType);
      const parentCommentId = this.extractParentCommentId(metadata);

      // Extract user request
      const userRequest = this.extractUserRequest(ticket);

      // Extract conversation depth
      const conversationDepth = metadata?.depth || 0;

      logger.debug('Context extracted from ticket', {
        ticketId: ticket.id,
        originType,
        parentPostId,
        parentCommentId,
        conversationDepth,
      });

      return {
        ticketId: ticket.id,
        originType,
        parentPostId,
        parentCommentId,
        userRequest,
        conversationDepth,
        userId: ticket.userId,
        agentName: ticket.agentName,
      };
    } catch (error) {
      logger.warn('Failed to extract context from ticket, using defaults', {
        ticketId: ticket.id,
        error: error instanceof Error ? error.message : String(error),
      });

      // Return minimal valid context as fallback
      return {
        ticketId: ticket.id,
        originType: 'autonomous',
        parentPostId: null,
        parentCommentId: null,
        userRequest: this.extractUserRequest(ticket) || 'Unknown request',
        conversationDepth: 0,
        userId: ticket.userId,
        agentName: ticket.agentName,
      };
    }
  }

  /**
   * Determine if ticket originated from post or comment
   *
   * @param ticket - Work ticket
   * @returns Origin type discriminator
   */
  determineOriginType(metadata: TicketMetadata | null, ticket: WorkTicket): OriginType {
    // Check explicit type field
    if (metadata?.type) {
      if (metadata.type === 'comment') {
        return 'comment';
      }
      if (metadata.type === 'post') {
        return 'post';
      }
    }

    // No metadata or explicit type = autonomous
    if (!metadata || Object.keys(metadata).length === 0) {
      return 'autonomous';
    }

    // Has parent_post_id but no type = likely comment
    if (metadata.parent_post_id) {
      return 'comment';
    }

    // Has title or tags = likely post
    if (metadata.title || metadata.tags) {
      return 'post';
    }

    // Default to autonomous
    return 'autonomous';
  }

  /**
   * Extract parent post ID for reply targeting
   *
   * @param metadata - Ticket metadata
   * @param ticket - Work ticket
   * @param originType - Determined origin type
   * @returns Parent post ID or null
   */
  extractParentPostId(
    metadata: TicketMetadata | null,
    ticket: WorkTicket,
    originType: OriginType
  ): number | null {
    // For autonomous tasks, no parent
    if (originType === 'autonomous') {
      return null;
    }

    // Priority 1: Explicit parent_post_id in metadata
    if (metadata?.parent_post_id) {
      return metadata.parent_post_id;
    }

    // Priority 2: For post type, use feedItemId (post replies to itself)
    if (originType === 'post' && ticket.payload?.feedItemId) {
      const postId = parseInt(ticket.payload.feedItemId, 10);
      if (!isNaN(postId)) {
        return postId;
      }
    }

    // Priority 3: Parse from payload.feedItemId
    if (ticket.payload?.feedItemId) {
      const feedItemId = parseInt(ticket.payload.feedItemId, 10);
      if (!isNaN(feedItemId)) {
        logger.warn('Using feedItemId as parent_post_id fallback', {
          ticketId: ticket.id,
          feedItemId: ticket.payload.feedItemId,
        });
        return feedItemId;
      }
    }

    logger.warn('No parent_post_id found for non-autonomous ticket', {
      ticketId: ticket.id,
      originType,
      hasMetadata: !!metadata,
      hasFeedItemId: !!ticket.payload?.feedItemId,
    });

    return null;
  }

  /**
   * Extract parent comment ID (if replying to comment)
   *
   * @param metadata - Ticket metadata
   * @returns Parent comment ID or null
   */
  extractParentCommentId(metadata: TicketMetadata | null): number | null {
    if (!metadata || !metadata.parent_comment_id) {
      return null;
    }

    return metadata.parent_comment_id;
  }

  /**
   * Get conversation depth from metadata
   *
   * @param ticket - Work ticket
   * @returns Conversation depth (0 = top-level)
   */
  getConversationDepth(ticket: WorkTicket): number {
    const metadata = this.extractMetadata(ticket);
    return metadata?.depth || 0;
  }

  /**
   * Determine reply target for posting
   *
   * @param context - Work context
   * @returns Reply target with post and optional comment ID
   * @throws Error if context is autonomous (cannot determine target)
   */
  getReplyTarget(context: WorkContext): ReplyTarget {
    if (context.originType === 'autonomous') {
      throw new Error('Cannot determine reply target for autonomous task');
    }

    if (!context.parentPostId) {
      throw new Error('Cannot determine reply target: missing parent_post_id');
    }

    return {
      postId: context.parentPostId,
      commentId: context.parentCommentId || undefined,
    };
  }

  /**
   * Extract metadata from ticket payload
   * Handles various payload structures
   *
   * @param ticket - Work ticket
   * @returns Metadata object or null
   */
  private extractMetadata(ticket: WorkTicket): TicketMetadata | null {
    if (!ticket.payload) {
      return null;
    }

    // Priority 1: payload.metadata
    if (ticket.payload.metadata && typeof ticket.payload.metadata === 'object') {
      return ticket.payload.metadata as TicketMetadata;
    }

    // Priority 2: payload.post_metadata (alternative structure)
    if (ticket.payload.post_metadata && typeof ticket.payload.post_metadata === 'object') {
      return ticket.payload.post_metadata as TicketMetadata;
    }

    // No metadata found
    return null;
  }

  /**
   * Extract user request from ticket payload
   * Handles multiple payload structures
   *
   * @param ticket - Work ticket
   * @returns User request text or empty string
   */
  private extractUserRequest(ticket: WorkTicket): string {
    if (!ticket.payload) {
      return '';
    }

    // Priority 1: Direct content field
    if (ticket.payload.content && typeof ticket.payload.content === 'string') {
      return ticket.payload.content;
    }

    // Priority 2: Post content
    if (ticket.payload.post?.content && typeof ticket.payload.post.content === 'string') {
      return ticket.payload.post.content;
    }

    // Priority 3: Feed item content
    if (ticket.payload.feedItem?.content && typeof ticket.payload.feedItem.content === 'string') {
      return ticket.payload.feedItem.content;
    }

    // Priority 4: post_content field (from database)
    if (ticket.payload.post_content && typeof ticket.payload.post_content === 'string') {
      return ticket.payload.post_content;
    }

    logger.warn('No user request found in ticket payload', {
      ticketId: ticket.id,
      payloadKeys: Object.keys(ticket.payload),
    });

    return '';
  }
}

/**
 * Singleton instance for convenience
 */
export const workContextExtractor = new WorkContextExtractor();

/**
 * Convenience function for extracting context
 *
 * @param ticket - Work ticket
 * @returns Work context
 */
export function extractContext(ticket: WorkTicket): WorkContext {
  return workContextExtractor.extractContext(ticket);
}

/**
 * Convenience function for getting reply target
 *
 * @param context - Work context
 * @returns Reply target
 * @throws Error if context is autonomous
 */
export function getReplyTarget(context: WorkContext): ReplyTarget {
  return workContextExtractor.getReplyTarget(context);
}
