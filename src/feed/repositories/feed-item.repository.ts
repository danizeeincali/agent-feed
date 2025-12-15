/**
 * FeedItemRepository - Database operations for feed items
 * Phase 3A: Feed Monitoring
 * Real PostgreSQL - NO MOCKS
 */

import type { DatabaseManager } from '../../types/database-manager';
import type { FeedItem, ParsedFeedItem } from '../../types/feed';

export class FeedItemRepository {
  constructor(private db: DatabaseManager) {}

  /**
   * Store new feed items (bulk insert)
   */
  async storeFeedItems(
    feedId: string,
    items: ParsedFeedItem[]
  ): Promise<FeedItem[]> {
    if (items.length === 0) {
      return [];
    }

    // Build bulk insert query
    const values: any[] = [];
    const placeholders: string[] = [];
    let paramIndex = 1;

    items.forEach((item, index) => {
      placeholders.push(`($${paramIndex}, $${paramIndex + 1}, $${paramIndex + 2}, $${paramIndex + 3}, $${paramIndex + 4}, $${paramIndex + 5}, $${paramIndex + 6}, $${paramIndex + 7})`);
      values.push(
        feedId,
        item.guid,
        item.title || null,
        item.content || null,
        item.contentSnippet || null,
        item.author || null,
        item.link || null,
        item.publishedAt || null
      );
      paramIndex += 8;
    });

    const query = `
      INSERT INTO feed_items (
        feed_id, item_guid, title, content, content_snippet,
        author, link, published_at
      ) VALUES ${placeholders.join(', ')}
      ON CONFLICT (feed_id, item_guid) DO NOTHING
      RETURNING *
    `;

    const result = await this.db.query<any>(query, values);

    return result.rows.map(this.mapRowToFeedItem);
  }

  /**
   * Get feed items by feed ID
   */
  async getFeedItems(
    feedId: string,
    options: {
      limit?: number;
      offset?: number;
      processed?: boolean;
    } = {}
  ): Promise<FeedItem[]> {
    const { limit = 50, offset = 0, processed } = options;

    let query = `
      SELECT * FROM feed_items
      WHERE feed_id = $1
    `;
    const params: any[] = [feedId];
    let paramIndex = 2;

    if (processed !== undefined) {
      query += ` AND processed = $${paramIndex}`;
      params.push(processed);
      paramIndex++;
    }

    query += ` ORDER BY published_at DESC NULLS LAST, discovered_at DESC`;
    query += ` LIMIT $${paramIndex} OFFSET $${paramIndex + 1}`;
    params.push(limit, offset);

    const result = await this.db.query<any>(query, params);

    return result.rows.map(this.mapRowToFeedItem);
  }

  /**
   * Get unprocessed feed items
   */
  async getUnprocessedItems(feedId: string, limit: number = 100): Promise<FeedItem[]> {
    const result = await this.db.query<any>(`
      SELECT * FROM feed_items
      WHERE feed_id = $1 AND processed = FALSE
      ORDER BY published_at DESC NULLS LAST, discovered_at DESC
      LIMIT $2
    `, [feedId, limit]);

    return result.rows.map(this.mapRowToFeedItem);
  }

  /**
   * Mark item as processed
   */
  async markAsProcessed(itemId: string): Promise<void> {
    await this.db.query(`
      UPDATE feed_items
      SET processed = TRUE,
          processing_status = 'completed'
      WHERE id = $1
    `, [itemId]);
  }

  /**
   * Update processing status
   */
  async updateProcessingStatus(
    itemId: string,
    status: 'pending' | 'queued' | 'processing' | 'completed' | 'failed' | 'skipped'
  ): Promise<void> {
    await this.db.query(`
      UPDATE feed_items
      SET processing_status = $1
      WHERE id = $2
    `, [status, itemId]);
  }

  /**
   * Get feed item by ID
   */
  async getItemById(itemId: string): Promise<FeedItem | null> {
    const result = await this.db.query<any>(`
      SELECT * FROM feed_items WHERE id = $1
    `, [itemId]);

    return result.rows.length > 0 ? this.mapRowToFeedItem(result.rows[0]) : null;
  }

  /**
   * Check if item exists by GUID
   */
  async itemExists(feedId: string, guid: string): Promise<boolean> {
    const result = await this.db.query<{ exists: boolean }>(`
      SELECT EXISTS(
        SELECT 1 FROM feed_items
        WHERE feed_id = $1 AND item_guid = $2
      ) as exists
    `, [feedId, guid]);

    return result.rows[0]?.exists || false;
  }

  /**
   * Map database row to FeedItem
   */
  private mapRowToFeedItem(row: any): FeedItem {
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
}
