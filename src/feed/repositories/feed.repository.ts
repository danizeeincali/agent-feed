/**
 * FeedRepository - Database operations for feeds
 * Phase 3A: Feed Monitoring
 * Real PostgreSQL - NO MOCKS
 */

import type { DatabaseManager } from '../../types/database-manager';
import type { UserFeed, FeedType } from '../../types/feed';

export class FeedRepository {
  constructor(private db: DatabaseManager) {}

  /**
   * Get all active feeds due for fetching
   */
  async getFeedsDueForFetch(limit: number = 100): Promise<UserFeed[]> {
    const result = await this.db.query<any>(`
      SELECT * FROM feeds_due_for_fetch
      LIMIT $1
    `, [limit]);

    return result.rows.map(this.mapRowToFeed);
  }

  /**
   * Get feed by ID
   */
  async getFeedById(feedId: string): Promise<UserFeed | null> {
    const result = await this.db.query<any>(`
      SELECT * FROM user_feeds WHERE id = $1
    `, [feedId]);

    return result.rows.length > 0 ? this.mapRowToFeed(result.rows[0]) : null;
  }

  /**
   * Get all active feeds for a user
   */
  async getUserFeeds(userId: string): Promise<UserFeed[]> {
    const result = await this.db.query<any>(`
      SELECT * FROM user_feeds
      WHERE user_id = $1 AND status = 'active'
      ORDER BY created_at DESC
    `, [userId]);

    return result.rows.map(this.mapRowToFeed);
  }

  /**
   * Create new feed
   */
  async createFeed(feed: {
    userId: string;
    agentName: string;
    feedUrl: string;
    feedType: FeedType;
    feedName?: string;
    feedDescription?: string;
    fetchIntervalMinutes?: number;
  }): Promise<UserFeed> {
    const result = await this.db.query<any>(`
      INSERT INTO user_feeds (
        user_id, agent_name, feed_url, feed_type, feed_name,
        feed_description, fetch_interval_minutes
      ) VALUES ($1, $2, $3, $4, $5, $6, $7)
      RETURNING *
    `, [
      feed.userId,
      feed.agentName,
      feed.feedUrl,
      feed.feedType,
      feed.feedName || null,
      feed.feedDescription || null,
      feed.fetchIntervalMinutes || 15
    ]);

    return this.mapRowToFeed(result.rows[0]);
  }

  /**
   * Update feed last fetched timestamp
   */
  async updateLastFetched(feedId: string): Promise<void> {
    await this.db.query(`
      UPDATE user_feeds
      SET last_fetched_at = NOW(),
          error_count = 0,
          last_error = NULL,
          status = 'active'
      WHERE id = $1
    `, [feedId]);
  }

  /**
   * Update feed error
   */
  async updateFeedError(feedId: string, errorMessage: string): Promise<void> {
    await this.db.query(`
      UPDATE user_feeds
      SET error_count = error_count + 1,
          last_error = $2,
          status = CASE
            WHEN error_count + 1 >= 5 THEN 'error'::VARCHAR(20)
            ELSE status
          END
      WHERE id = $1
    `, [feedId, errorMessage]);
  }

  /**
   * Pause feed
   */
  async pauseFeed(feedId: string, reason?: string): Promise<void> {
    await this.db.query(`
      UPDATE user_feeds
      SET status = 'paused',
          last_error = $2
      WHERE id = $1
    `, [feedId, reason || null]);
  }

  /**
   * Map database row to UserFeed object
   */
  private mapRowToFeed(row: any): UserFeed {
    return {
      id: row.id,
      userId: row.user_id,
      agentName: row.agent_name,
      feedUrl: row.feed_url,
      feedType: row.feed_type,
      feedName: row.feed_name,
      feedDescription: row.feed_description,
      fetchIntervalMinutes: parseInt(row.fetch_interval_minutes),
      lastFetchedAt: row.last_fetched_at ? new Date(row.last_fetched_at) : undefined,
      lastError: row.last_error,
      errorCount: parseInt(row.error_count) || 0,
      status: row.status,
      automationEnabled: row.automation_enabled,
      responseConfig: row.response_config || {},
      createdAt: new Date(row.created_at),
      updatedAt: new Date(row.updated_at),
    };
  }
}
