/**
 * FeedMonitor - Polls feeds and creates work tickets
 * Phase 3A: Feed Monitoring
 * Real PostgreSQL + Real HTTP - NO MOCKS
 */

import type { DatabaseManager } from '../types/database-manager';
import type { WorkTicketQueue } from '../queue/work-ticket';
import type { FeedPollResult, PollAllResult } from '../types/feed';
import { FeedParser } from './feed-parser';
import { FeedRepository } from './repositories/feed.repository';
import { FeedItemRepository } from './repositories/feed-item.repository';
import { FeedPositionRepository } from './repositories/feed-position.repository';
import { Priority } from '../types/work-ticket';

export interface FeedMonitorConfig {
  database: DatabaseManager;
  workQueue: WorkTicketQueue;
  httpTimeout?: number;
  maxConcurrentFeeds?: number;
}

export class FeedMonitor {
  private feedRepo: FeedRepository;
  private feedItemRepo: FeedItemRepository;
  private positionRepo: FeedPositionRepository;
  private parser: FeedParser;
  private workQueue: WorkTicketQueue;
  private httpTimeout: number;
  private maxConcurrent: number;

  constructor(config: FeedMonitorConfig) {
    this.feedRepo = new FeedRepository(config.database);
    this.feedItemRepo = new FeedItemRepository(config.database);
    this.positionRepo = new FeedPositionRepository(config.database);
    this.parser = new FeedParser();
    this.workQueue = config.workQueue;
    this.httpTimeout = config.httpTimeout || 10000;
    this.maxConcurrent = config.maxConcurrentFeeds || 10;
  }

  /**
   * Poll all active feeds due for fetching
   */
  async pollAllActiveFeeds(): Promise<PollAllResult> {
    const startTime = Date.now();
    const result: PollAllResult = {
      feedsChecked: 0,
      itemsFound: 0,
      itemsNew: 0,
      ticketsCreated: 0,
      errors: [],
      durationMs: 0,
    };

    try {
      // Get feeds due for fetch
      const feeds = await this.feedRepo.getFeedsDueForFetch(100);

      // Poll feeds with limited concurrency
      const batches = this.createBatches(feeds, this.maxConcurrent);

      for (const batch of batches) {
        const promises = batch.map(feed =>
          this.pollSingleFeed(feed.id)
            .catch(error => ({
              feedId: feed.id,
              itemsFound: 0,
              itemsNew: 0,
              ticketsCreated: 0,
              durationMs: 0,
              error: error.message,
            }))
        );

        const batchResults = await Promise.all(promises);

        for (const feedResult of batchResults) {
          result.feedsChecked++;

          if (feedResult.error) {
            result.errors.push({
              feedId: feedResult.feedId,
              error: feedResult.error,
            });
          } else {
            result.itemsFound += feedResult.itemsFound;
            result.itemsNew += feedResult.itemsNew;
            result.ticketsCreated += feedResult.ticketsCreated;
          }
        }
      }

      result.durationMs = Date.now() - startTime;
      return result;

    } catch (error) {
      result.durationMs = Date.now() - startTime;
      result.errors.push({
        feedId: 'unknown',
        error: error instanceof Error ? error.message : 'Unknown error',
      });
      return result;
    }
  }

  /**
   * Poll a single feed
   */
  async pollSingleFeed(feedId: string): Promise<FeedPollResult> {
    const startTime = Date.now();

    try {
      // 1. Get feed configuration
      const feed = await this.feedRepo.getFeedById(feedId);
      if (!feed) {
        throw new Error('Feed not found');
      }

      // 2. Fetch feed content
      const content = await this.fetchFeedContent(feed.feedUrl);

      // 3. Parse feed
      const parsed = this.parser.parse(content);

      // 4. Filter new items
      const newItems = [];
      for (const item of parsed.items) {
        const isNew = await this.positionRepo.isNewItem(
          feedId,
          item.guid,
          item.publishedAt
        );

        if (isNew) {
          newItems.push(item);
        }
      }

      // 5. Store new items
      const storedItems = await this.feedItemRepo.storeFeedItems(feedId, newItems);

      // 6. Create work tickets if automation enabled
      let ticketsCreated = 0;
      if (feed.automationEnabled && storedItems.length > 0) {
        for (const item of storedItems) {
          await this.workQueue.createTicket({
            type: 'post_response',
            priority: this.calculatePriority(feed.responseConfig),
            agentName: feed.agentName,
            userId: feed.userId,
            payload: {
              feedId: feed.id,
              feedItemId: item.id,
              itemGuid: item.itemGuid,
            },
          });

          // Update item status to queued
          await this.feedItemRepo.updateProcessingStatus(item.id, 'queued');
          ticketsCreated++;
        }
      }

      // 7. Update feed position
      if (storedItems.length > 0) {
        const lastItem = storedItems[0];
        await this.positionRepo.updatePosition(
          feedId,
          lastItem.itemGuid,
          lastItem.id,
          lastItem.publishedAt,
          storedItems.length
        );
      }

      // 8. Update feed last_fetched
      await this.feedRepo.updateLastFetched(feedId);

      // 9. Log success
      await this.logFetchSuccess(feedId, parsed.items.length, storedItems.length, Date.now() - startTime);

      return {
        feedId,
        itemsFound: parsed.items.length,
        itemsNew: storedItems.length,
        ticketsCreated,
        durationMs: Date.now() - startTime,
      };

    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Unknown error';

      // Log failure
      await this.logFetchError(feedId, errorMessage, Date.now() - startTime);

      // Update feed error count
      await this.feedRepo.updateFeedError(feedId, errorMessage);

      throw error;
    }
  }

  /**
   * Fetch feed content via HTTP
   */
  private async fetchFeedContent(url: string): Promise<string> {
    try {
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), this.httpTimeout);

      const response = await fetch(url, {
        signal: controller.signal,
        headers: {
          'User-Agent': 'AVI-Agent-Feed/1.0 (https://github.com/yourusername/agent-feed)',
          'Accept': 'application/rss+xml, application/atom+xml, application/xml, text/xml',
        },
      });

      clearTimeout(timeoutId);

      if (!response.ok) {
        if (response.status === 404) {
          throw new Error('Feed not found (404)');
        } else if (response.status === 429) {
          throw new Error('Rate limited (429)');
        } else {
          throw new Error(`HTTP ${response.status}: ${response.statusText}`);
        }
      }

      return await response.text();

    } catch (error) {
      if (error instanceof Error && error.name === 'AbortError') {
        throw new Error('Feed fetch timeout');
      }
      throw error;
    }
  }

  /**
   * Calculate ticket priority from feed config
   */
  private calculatePriority(responseConfig: Record<string, any>): number {
    const configPriority = responseConfig?.priority;

    if (configPriority === 'high') return Priority.HIGH;
    if (configPriority === 'low') return Priority.LOW;
    return Priority.MEDIUM;
  }

  /**
   * Log successful fetch
   */
  private async logFetchSuccess(
    feedId: string,
    itemsFound: number,
    itemsNew: number,
    durationMs: number
  ): Promise<void> {
    try {
      await this.feedRepo['db'].query(`
        INSERT INTO feed_fetch_logs (
          feed_id, status, items_found, items_new, fetch_duration_ms
        ) VALUES ($1, 'success', $2, $3, $4)
      `, [feedId, itemsFound, itemsNew, durationMs]);
    } catch (error) {
      // Don't fail feed polling if logging fails
      console.error('Failed to log fetch success:', error);
    }
  }

  /**
   * Log fetch error
   */
  private async logFetchError(
    feedId: string,
    errorMessage: string,
    durationMs: number
  ): Promise<void> {
    try {
      await this.feedRepo['db'].query(`
        INSERT INTO feed_fetch_logs (
          feed_id, status, error_message, fetch_duration_ms
        ) VALUES ($1, 'error', $2, $3)
      `, [feedId, errorMessage, durationMs]);
    } catch (error) {
      // Don't fail feed polling if logging fails
      console.error('Failed to log fetch error:', error);
    }
  }

  /**
   * Create batches for concurrent processing
   */
  private createBatches<T>(items: T[], batchSize: number): T[][] {
    const batches: T[][] = [];
    for (let i = 0; i < items.length; i += batchSize) {
      batches.push(items.slice(i, i + batchSize));
    }
    return batches;
  }
}
