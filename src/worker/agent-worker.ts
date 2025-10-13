/**
 * AgentWorker - Executes work tickets and generates responses
 * Phase 3B: Agent Worker Implementation
 */

import type { DatabaseManager } from '../types/database-manager';
import type { WorkTicket } from '../types/work-ticket';
import type { WorkerResult } from '../types/worker';
import type { FeedItem } from '../types/feed';
import { ResponseGenerator } from './response-generator';
import { MemoryUpdater } from './memory-updater';
import { composeAgentContext } from '../database/context-composer';
import type { AgentContext as Phase1Context } from '../types/agent-context';
import type { AgentContext as Phase3Context } from '../types/worker';

export class AgentWorker {
  private db: DatabaseManager;
  private responseGenerator: ResponseGenerator;
  private memoryUpdater: MemoryUpdater;

  constructor(db: DatabaseManager, responseGenerator?: ResponseGenerator, memoryUpdater?: MemoryUpdater) {
    this.db = db;
    this.responseGenerator = responseGenerator || new ResponseGenerator();
    this.memoryUpdater = memoryUpdater || new MemoryUpdater(db);
  }

  /**
   * Execute work ticket - main entry point
   */
  async executeTicket(ticket: WorkTicket): Promise<WorkerResult> {
    const startTime = Date.now();

    try {
      // 1. Load agent context (from Phase 1)
      const phase1Context = await composeAgentContext(
        ticket.userId,
        ticket.agentName,
        this.db
      );

      // 2. Load feed item
      const feedItem = await this.loadFeedItem(ticket.payload.feedItemId);

      if (!feedItem) {
        throw new Error('Feed item not found');
      }

      // 3. Convert Phase 1 context to Phase 3 context format
      const context = this.convertContext(phase1Context, ticket.userId);

      // 4. Generate response
      const response = await this.responseGenerator.generate(context, feedItem, {
        maxLength: phase1Context.posting_rules.max_length,
        minLength: 50,
        temperature: phase1Context.response_style?.tone === 'professional' ? 0.5 : 0.7,
      });

      // 5. Validate response
      const validation = this.responseGenerator.validateResponse(
        response.content,
        context,
        feedItem
      );

      if (!validation.valid) {
        throw new Error(`Response validation failed: ${validation.errors.join(', ')}`);
      }

      // 6. Store response in database
      const responseId = await this.storeResponse(
        ticket,
        feedItem,
        response.content,
        response.tokensUsed,
        response.durationMs,
        validation
      );

      // 7. Update agent memory with this interaction
      try {
        await this.memoryUpdater.updateMemory(
          feedItem,
          response.content,
          ticket.agentName,
          ticket.userId
        );
      } catch (memoryError) {
        // Log but don't fail the whole operation if memory update fails
        console.error('Memory update failed:', memoryError);
      }

      // 8. Mark feed item as processed
      await this.markFeedItemProcessed(feedItem.id);

      const duration = Date.now() - startTime;

      return {
        success: true,
        output: { responseId },
        tokensUsed: response.tokensUsed,
        duration,
      };
    } catch (error) {
      const duration = Date.now() - startTime;

      // Log error and store failed response
      await this.storeFailedResponse(ticket, error as Error);

      return {
        success: false,
        error: error as Error,
        tokensUsed: 0,
        duration,
      };
    }
  }

  /**
   * Load feed item from database
   */
  private async loadFeedItem(feedItemId: string): Promise<FeedItem | null> {
    const result = await this.db.query<any>(`
      SELECT fi.*, uf.feed_name, uf.feed_url
      FROM feed_items fi
      JOIN user_feeds uf ON uf.id = fi.feed_id
      WHERE fi.id = $1
    `, [feedItemId]);

    if (result.rows.length === 0) {
      return null;
    }

    const row = result.rows[0];
    return {
      id: row.id,
      feedId: row.feed_id,
      itemGuid: row.item_guid,
      title: row.title,
      content: row.content,
      contentSnippet: row.content_snippet,
      author: row.author,
      link: row.link,
      publishedAt: row.published_at ? new Date(row.published_at) : undefined,
      discoveredAt: new Date(row.discovered_at),
      processed: row.processed,
      processingStatus: row.processing_status,
      metadata: row.metadata || {},
      createdAt: new Date(row.created_at),
    };
  }

  /**
   * Convert Phase 1 context to Phase 3 context format
   */
  private convertContext(phase1Context: Phase1Context, userId: string): Phase3Context {
    return {
      userId,
      agentName: phase1Context.agentName,
      personality: phase1Context.personality,
      postingRules: {
        maxLength: phase1Context.posting_rules.max_length,
        minLength: 50,
        blockedWords: phase1Context.safety_constraints.content_filters,
      },
      responseStyle: {
        temperature: 0.7,
        tone: phase1Context.response_style.tone,
        formality: phase1Context.response_style.length,
      },
      memories: [], // TODO: Load from agent_memories table
      model: phase1Context.model || 'claude-sonnet-4-5-20250929',
    };
  }

  /**
   * Store successful response in database
   */
  private async storeResponse(
    ticket: WorkTicket,
    feedItem: FeedItem,
    content: string,
    tokensUsed: number,
    durationMs: number,
    validation: any
  ): Promise<string> {
    const result = await this.db.query<any>(`
      INSERT INTO agent_responses (
        work_ticket_id, feed_item_id, agent_name, user_id,
        response_content, response_metadata, tokens_used,
        generation_time_ms, validation_results, status
      ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, 'validated')
      RETURNING id
    `, [
      ticket.id,
      feedItem.id,
      ticket.agentName,
      ticket.userId,
      content,
      JSON.stringify({ model: 'claude-sonnet-4-5-20250929' }),
      tokensUsed,
      durationMs,
      JSON.stringify(validation),
    ]);

    return result.rows[0].id;
  }

  /**
   * Store failed response in database
   */
  private async storeFailedResponse(ticket: WorkTicket, error: Error): Promise<void> {
    try {
      await this.db.query(`
        INSERT INTO agent_responses (
          work_ticket_id, feed_item_id, agent_name, user_id,
          response_content, error_message, status
        ) VALUES ($1, $2, $3, $4, $5, $6, 'failed')
      `, [
        ticket.id,
        ticket.payload.feedItemId,
        ticket.agentName,
        ticket.userId,
        '',
        error.message,
      ]);
    } catch (dbError) {
      console.error('Failed to store failed response:', dbError);
    }
  }

  /**
   * Mark feed item as processed
   */
  private async markFeedItemProcessed(feedItemId: string): Promise<void> {
    await this.db.query(`
      UPDATE feed_items
      SET processed = TRUE,
          processing_status = 'completed'
      WHERE id = $1
    `, [feedItemId]);
  }
}
