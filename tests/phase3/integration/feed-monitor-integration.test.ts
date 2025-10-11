/**
 * FeedMonitor Integration Tests
 * Phase 3A: Feed Monitoring
 *
 * REAL TESTS - NO MOCKS:
 * - Real PostgreSQL database
 * - Real HTTP fetches from actual RSS feeds
 * - Real work ticket creation
 * - Real database persistence
 */

import { describe, it, expect, beforeAll, afterAll, beforeEach } from '@jest/globals';
import { Pool } from 'pg';
import { FeedMonitor } from '../../../src/feed/feed-monitor';
import { WorkTicketQueue } from '../../../src/queue/work-ticket';
import { DatabaseManager } from '../../../src/types/database-manager';
import { FeedRepository } from '../../../src/feed/repositories/feed.repository';

describe('FeedMonitor Integration Tests (REAL Database + REAL HTTP)', () => {
  let pool: Pool;
  let database: DatabaseManager;
  let feedMonitor: FeedMonitor;
  let workQueue: WorkTicketQueue;
  let feedRepo: FeedRepository;

  beforeAll(async () => {
    // Connect to REAL PostgreSQL
    pool = new Pool({
      host: process.env.DB_HOST || 'localhost',
      port: parseInt(process.env.DB_PORT || '5432'),
      database: process.env.DB_NAME || 'avidm_dev',
      user: process.env.DB_USER || 'postgres',
      password: process.env.DB_PASSWORD || 'dev_password_change_in_production',
    });

    database = {
      query: async (text, params) => pool.query(text, params),
      connect: async () => pool.connect(),
      end: async () => pool.end(),
    } as unknown as DatabaseManager;

    workQueue = new WorkTicketQueue(database);
    feedRepo = new FeedRepository(database);

    feedMonitor = new FeedMonitor({
      database,
      workQueue,
      httpTimeout: 15000, // Longer timeout for real HTTP
      maxConcurrentFeeds: 3,
    });

    console.log('✅ Connected to REAL PostgreSQL for integration tests');
  });

  afterAll(async () => {
    await pool.end();
  });

  beforeEach(async () => {
    // Clean up test data
    await pool.query(`DELETE FROM feed_fetch_logs WHERE feed_id IN (SELECT id FROM user_feeds WHERE user_id LIKE 'test-%')`);
    await pool.query(`DELETE FROM agent_responses WHERE user_id LIKE 'test-%'`);
    await pool.query(`DELETE FROM feed_items WHERE feed_id IN (SELECT id FROM user_feeds WHERE user_id LIKE 'test-%')`);
    await pool.query(`DELETE FROM feed_positions WHERE feed_id IN (SELECT id FROM user_feeds WHERE user_id LIKE 'test-%')`);
    await pool.query(`DELETE FROM user_feeds WHERE user_id LIKE 'test-%'`);
    await pool.query(`DELETE FROM work_queue WHERE user_id LIKE 'test-%'`);
  });

  describe('Real Feed Fetching', () => {
    it('should fetch and parse REAL Hacker News RSS feed', async () => {
      // Create feed pointing to REAL Hacker News RSS
      const feed = await feedRepo.createFeed({
        userId: 'test-hn-user',
        agentName: 'tech-guru',
        feedUrl: 'https://hnrss.org/newest?count=5',
        feedType: 'rss',
        feedName: 'Hacker News - Newest',
        fetchIntervalMinutes: 15,
      });

      console.log('📡 Fetching REAL Hacker News RSS feed...');

      // Poll the feed (this makes REAL HTTP request!)
      const result = await feedMonitor.pollSingleFeed(feed.id);

      console.log(`✅ Found ${result.itemsFound} items, ${result.itemsNew} new`);

      // Verify we got real data
      expect(result.itemsFound).toBeGreaterThan(0);
      expect(result.itemsNew).toBeGreaterThan(0);
      expect(result.durationMs).toBeGreaterThan(0);

      // Verify items were stored in database
      const storedItems = await pool.query(`
        SELECT * FROM feed_items WHERE feed_id = $1
      `, [feed.id]);

      expect(storedItems.rows.length).toBe(result.itemsNew);
      expect(storedItems.rows[0].title).toBeDefined();
      expect(storedItems.rows[0].link).toContain('http');

      console.log(`📦 Stored ${storedItems.rows.length} items in database`);
      console.log(`📝 First item: "${storedItems.rows[0].title}"`);
    }, 30000); // 30s timeout for real HTTP

    it('should fetch REAL JSON Feed (if available)', async () => {
      // JSON Feed from jsonfeed.org blog
      const feed = await feedRepo.createFeed({
        userId: 'test-json-user',
        agentName: 'tech-guru',
        feedUrl: 'https://www.jsonfeed.org/feed.json',
        feedType: 'json',
        feedName: 'JSON Feed Blog',
        fetchIntervalMinutes: 15,
      });

      console.log('📡 Fetching REAL JSON Feed...');

      const result = await feedMonitor.pollSingleFeed(feed.id);

      console.log(`✅ Found ${result.itemsFound} items, ${result.itemsNew} new`);

      expect(result.itemsFound).toBeGreaterThan(0);
      expect(result.itemsNew).toBeGreaterThan(0);
    }, 30000);

    it('should handle 404 errors gracefully', async () => {
      const feed = await feedRepo.createFeed({
        userId: 'test-404-user',
        agentName: 'tech-guru',
        feedUrl: 'https://example.com/nonexistent-feed.rss',
        feedType: 'rss',
        feedName: '404 Test Feed',
        fetchIntervalMinutes: 15,
      });

      await expect(feedMonitor.pollSingleFeed(feed.id)).rejects.toThrow(/404/);

      // Verify error was logged
      const logs = await pool.query(`
        SELECT * FROM feed_fetch_logs WHERE feed_id = $1
      `, [feed.id]);

      expect(logs.rows.length).toBe(1);
      expect(logs.rows[0].status).toBe('error');
      expect(logs.rows[0].error_message).toContain('404');
    }, 15000);
  });

  describe('Work Ticket Creation', () => {
    it('should create work tickets for new feed items', async () => {
      const feed = await feedRepo.createFeed({
        userId: 'test-ticket-user',
        agentName: 'tech-guru',
        feedUrl: 'https://hnrss.org/newest?count=3',
        feedType: 'rss',
        feedName: 'HN Test',
        fetchIntervalMinutes: 15,
      });

      console.log('📡 Fetching feed and creating work tickets...');

      const result = await feedMonitor.pollSingleFeed(feed.id);

      console.log(`✅ Created ${result.ticketsCreated} work tickets`);

      expect(result.ticketsCreated).toBe(result.itemsNew);

      // Verify tickets in database
      const tickets = await pool.query(`
        SELECT * FROM work_queue WHERE user_id = 'test-ticket-user'
      `);

      expect(tickets.rows.length).toBe(result.ticketsCreated);
      expect(tickets.rows[0].status).toBe('pending');
      expect(tickets.rows[0].assigned_agent).toBe('tech-guru');
      expect(tickets.rows[0].post_metadata).toHaveProperty('feedItemId');

      console.log(`🎫 Verified ${tickets.rows.length} tickets in database`);
    }, 30000);

    it('should NOT create duplicate tickets on second poll', async () => {
      const feed = await feedRepo.createFeed({
        userId: 'test-duplicate-user',
        agentName: 'tech-guru',
        feedUrl: 'https://hnrss.org/newest?count=2',
        feedType: 'rss',
        feedName: 'Duplicate Test',
        fetchIntervalMinutes: 15,
      });

      // First poll
      console.log('📡 First poll...');
      const result1 = await feedMonitor.pollSingleFeed(feed.id);
      console.log(`✅ First poll: ${result1.itemsNew} new items`);

      // Second poll (should find no new items)
      console.log('📡 Second poll (should be 0 new)...');
      const result2 = await feedMonitor.pollSingleFeed(feed.id);
      console.log(`✅ Second poll: ${result2.itemsNew} new items`);

      expect(result1.itemsNew).toBeGreaterThan(0);
      expect(result2.itemsNew).toBe(0);
      expect(result2.ticketsCreated).toBe(0);

      console.log('✅ Duplicate prevention working!');
    }, 60000);
  });

  describe('Feed Position Tracking', () => {
    it('should track last processed item position', async () => {
      const feed = await feedRepo.createFeed({
        userId: 'test-position-user',
        agentName: 'tech-guru',
        feedUrl: 'https://hnrss.org/newest?count=3',
        feedType: 'rss',
        feedName: 'Position Test',
        fetchIntervalMinutes: 15,
      });

      await feedMonitor.pollSingleFeed(feed.id);

      // Check position was recorded
      const position = await pool.query(`
        SELECT * FROM feed_positions WHERE feed_id = $1
      `, [feed.id]);

      expect(position.rows.length).toBe(1);
      expect(position.rows[0].last_item_guid).toBeDefined();
      expect(position.rows[0].items_processed).toBeGreaterThan(0);

      console.log(`📍 Position tracked: ${position.rows[0].items_processed} items processed`);
    }, 30000);
  });

  describe('Multiple Feeds Concurrently', () => {
    it('should poll multiple feeds in batches', async () => {
      // Create 3 feeds
      const feeds = await Promise.all([
        feedRepo.createFeed({
          userId: 'test-multi-user-1',
          agentName: 'tech-guru',
          feedUrl: 'https://hnrss.org/newest?count=2',
          feedType: 'rss',
          feedName: 'Feed 1',
        }),
        feedRepo.createFeed({
          userId: 'test-multi-user-2',
          agentName: 'tech-guru',
          feedUrl: 'https://hnrss.org/best?count=2',
          feedType: 'rss',
          feedName: 'Feed 2',
        }),
        feedRepo.createFeed({
          userId: 'test-multi-user-3',
          agentName: 'tech-guru',
          feedUrl: 'https://www.jsonfeed.org/feed.json',
          feedType: 'json',
          feedName: 'Feed 3',
        }),
      ]);

      console.log('📡 Polling 3 feeds concurrently...');

      const result = await feedMonitor.pollAllActiveFeeds();

      console.log(`✅ Checked ${result.feedsChecked} feeds`);
      console.log(`✅ Found ${result.itemsFound} total items`);
      console.log(`✅ ${result.itemsNew} new items`);
      console.log(`✅ ${result.ticketsCreated} tickets created`);

      expect(result.feedsChecked).toBeGreaterThanOrEqual(3);
      expect(result.itemsFound).toBeGreaterThan(0);
      expect(result.errors.length).toBeLessThan(result.feedsChecked); // Some might succeed
    }, 60000);
  });

  describe('Error Handling', () => {
    it('should increment error count on failures', async () => {
      const feed = await feedRepo.createFeed({
        userId: 'test-error-user',
        agentName: 'tech-guru',
        feedUrl: 'https://invalid-domain-that-does-not-exist-12345.com/feed.rss',
        feedType: 'rss',
        feedName: 'Error Test',
      });

      await expect(feedMonitor.pollSingleFeed(feed.id)).rejects.toThrow();

      // Check error count increased
      const updated = await feedRepo.getFeedById(feed.id);
      expect(updated?.errorCount).toBe(1);
      expect(updated?.lastError).toBeDefined();
    }, 15000);

    it('should continue polling other feeds if one fails', async () => {
      // Create good and bad feeds
      await feedRepo.createFeed({
        userId: 'test-mixed-1',
        agentName: 'tech-guru',
        feedUrl: 'https://invalid.invalid/feed.rss',
        feedType: 'rss',
        feedName: 'Bad Feed',
      });

      await feedRepo.createFeed({
        userId: 'test-mixed-2',
        agentName: 'tech-guru',
        feedUrl: 'https://hnrss.org/newest?count=1',
        feedType: 'rss',
        feedName: 'Good Feed',
      });

      const result = await feedMonitor.pollAllActiveFeeds();

      // Should have processed both, with at least one error
      expect(result.feedsChecked).toBeGreaterThanOrEqual(2);
      expect(result.errors.length).toBeGreaterThan(0);

      // But some should succeed
      expect(result.itemsNew).toBeGreaterThan(0);
    }, 60000);
  });
});
