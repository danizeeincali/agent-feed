/**
 * FeedPositionRepository - Track feed polling positions
 * Phase 3A: Feed Monitoring
 * Real PostgreSQL - NO MOCKS
 */

import type { DatabaseManager } from '../../types/database-manager';
import type { FeedPosition } from '../../types/feed';

export class FeedPositionRepository {
  constructor(private db: DatabaseManager) {}

  /**
   * Get feed position
   */
  async getPosition(feedId: string): Promise<FeedPosition | null> {
    const result = await this.db.query<any>(`
      SELECT * FROM feed_positions WHERE feed_id = $1
    `, [feedId]);

    return result.rows.length > 0 ? this.mapRowToPosition(result.rows[0]) : null;
  }

  /**
   * Update feed position after processing new items
   */
  async updatePosition(
    feedId: string,
    lastItemGuid: string,
    lastItemId: string,
    lastPublishedAt: Date | undefined,
    itemsProcessed: number
  ): Promise<void> {
    await this.db.query(`
      INSERT INTO feed_positions (
        feed_id, last_item_guid, last_item_id, last_published_at,
        items_processed, updated_at
      ) VALUES ($1, $2, $3, $4, $5, NOW())
      ON CONFLICT (feed_id) DO UPDATE SET
        last_item_guid = EXCLUDED.last_item_guid,
        last_item_id = EXCLUDED.last_item_id,
        last_published_at = EXCLUDED.last_published_at,
        items_processed = feed_positions.items_processed + EXCLUDED.items_processed,
        updated_at = NOW()
    `, [feedId, lastItemGuid, lastItemId, lastPublishedAt || null, itemsProcessed]);
  }

  /**
   * Check if item is new (not seen before)
   */
  async isNewItem(feedId: string, itemGuid: string, publishedAt?: Date): Promise<boolean> {
    const position = await this.getPosition(feedId);

    if (!position) {
      // No position = first fetch, all items are new
      return true;
    }

    // If we've seen this exact GUID, it's not new
    if (position.lastItemGuid === itemGuid) {
      return false;
    }

    // If item is older than last published date, it's not new
    if (publishedAt && position.lastPublishedAt && publishedAt <= position.lastPublishedAt) {
      return false;
    }

    return true;
  }

  /**
   * Map database row to FeedPosition
   */
  private mapRowToPosition(row: any): FeedPosition {
    return {
      feedId: row.feed_id,
      lastItemGuid: row.last_item_guid,
      lastItemId: row.last_item_id,
      lastPublishedAt: row.last_published_at ? new Date(row.last_published_at) : undefined,
      itemsProcessed: parseInt(row.items_processed) || 0,
      itemsTotal: parseInt(row.items_total) || 0,
      cursorData: row.cursor_data || {},
      updatedAt: new Date(row.updated_at),
    };
  }
}
