/**
 * End-to-End Flow Integration Tests
 * Phase 3C: Complete System Integration
 *
 * REAL TESTS - NO MOCKS:
 * - Real PostgreSQL database
 * - Real RSS feed fetching (Hacker News)
 * - Real Claude API calls
 * - Real agent context loading
 * - Real work ticket creation
 * - Real response generation and storage
 *
 * REQUIREMENTS:
 * - Set ANTHROPIC_API_KEY in .env file
 * - Ensure PostgreSQL is running
 * - Internet connection for RSS feeds
 * - Have tech-guru agent template in database
 *
 * COMPLETE FLOW:
 * 1. FeedMonitor fetches real RSS feed
 * 2. FeedParser parses feed items
 * 3. Feed items stored in database
 * 4. Work tickets created for new items
 * 5. AgentWorker processes tickets
 * 6. ResponseGenerator calls Claude API
 * 7. Responses validated and stored
 * 8. Feed items marked as processed
 */

import { describe, it, expect, beforeAll, afterAll, beforeEach } from '@jest/globals';
import { Pool } from 'pg';
import { FeedMonitor } from '../../../src/feed/feed-monitor';
import { AgentWorker } from '../../../src/worker/agent-worker';
import { ResponseGenerator } from '../../../src/worker/response-generator';
import { DatabaseManager } from '../../../src/types/database-manager';
import Anthropic from '@anthropic-ai/sdk';
import type { WorkTicket } from '../../../src/types/work-ticket';

// Skip tests if API key not configured
const SKIP_TESTS = !process.env.ANTHROPIC_API_KEY || process.env.ANTHROPIC_API_KEY === 'your_api_key_here';

const describeOrSkip = SKIP_TESTS ? describe.skip : describe;

describeOrSkip('End-to-End Flow Integration Tests (REAL Everything)', () => {
  let pool: Pool;
  let database: DatabaseManager;
  let feedMonitor: FeedMonitor;
  let worker: AgentWorker;
  let anthropic: Anthropic;

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

    // REAL Claude API client
    anthropic = new Anthropic({
      apiKey: process.env.ANTHROPIC_API_KEY,
    });

    const responseGenerator = new ResponseGenerator(anthropic);
    worker = new AgentWorker(database, responseGenerator);
    feedMonitor = new FeedMonitor(database);

    console.log('✅ Connected to REAL PostgreSQL, Claude API, and Feed Monitor for E2E tests');
  });

  afterAll(async () => {
    await pool.end();
  });

  beforeEach(async () => {
    // Clean up test data
    await pool.query(`DELETE FROM agent_responses WHERE user_id = 'test-e2e-user'`);
    await pool.query(`DELETE FROM work_queue WHERE user_id = 'test-e2e-user'`);
    await pool.query(`DELETE FROM feed_items WHERE feed_id IN (SELECT id FROM user_feeds WHERE user_id = 'test-e2e-user')`);
    await pool.query(`DELETE FROM user_feeds WHERE user_id = 'test-e2e-user'`);
  });

  describe('Complete System Flow: Feed → Parse → Store → Worker → Response', () => {
    it('should execute complete flow from real RSS feed to stored response', async () => {
      console.log('🚀 Starting End-to-End Flow Test...\n');

      // ============================================================
      // STEP 1: Create user feed configuration
      // ============================================================
      console.log('📋 STEP 1: Creating user feed configuration...');
      const feedResult = await pool.query(`
        INSERT INTO user_feeds (
          user_id, agent_name, feed_url, feed_type, feed_name, fetch_interval_minutes
        ) VALUES ($1, $2, $3, $4, $5, $6)
        RETURNING id
      `, [
        'test-e2e-user',
        'tech-guru',
        'https://hnrss.org/newest?count=3', // Real Hacker News RSS feed
        'rss',
        'Hacker News E2E Test',
        60
      ]);

      const feedId = feedResult.rows[0].id;
      console.log(`   ✅ Feed created: ${feedId}\n`);

      // ============================================================
      // STEP 2: Fetch and parse REAL RSS feed
      // ============================================================
      console.log('📡 STEP 2: Fetching and parsing REAL RSS feed from Hacker News...');
      const fetchResult = await feedMonitor.fetchFeed(feedId);

      expect(fetchResult.success).toBe(true);
      expect(fetchResult.itemsFound).toBeGreaterThan(0);
      console.log(`   ✅ Fetched ${fetchResult.itemsFound} items from real RSS feed`);
      console.log(`   📝 New items: ${fetchResult.itemsStored}\n`);

      // ============================================================
      // STEP 3: Verify feed items stored in database
      // ============================================================
      console.log('💾 STEP 3: Verifying feed items stored in database...');
      const itemsQuery = await pool.query(`
        SELECT id, title, content, link, processed, processing_status
        FROM feed_items
        WHERE feed_id = $1
        ORDER BY discovered_at DESC
      `, [feedId]);

      expect(itemsQuery.rows.length).toBeGreaterThan(0);
      console.log(`   ✅ Found ${itemsQuery.rows.length} items in database`);

      // Take first item for worker processing
      const feedItem = itemsQuery.rows[0];
      console.log(`   📰 Item to process: "${feedItem.title.substring(0, 60)}..."`);
      console.log(`   🔗 Link: ${feedItem.link}`);
      console.log(`   📊 Status: processed=${feedItem.processed}, status=${feedItem.processing_status}\n`);

      // ============================================================
      // STEP 4: Create work ticket
      // ============================================================
      console.log('🎫 STEP 4: Creating work ticket...');
      const ticket: WorkTicket = {
        id: `e2e-ticket-${Date.now()}`,
        type: 'post_response',
        priority: 5,
        agentName: 'tech-guru',
        userId: 'test-e2e-user',
        payload: {
          feedId,
          feedItemId: feedItem.id,
          itemGuid: feedItem.id,
        },
        status: 'pending',
        createdAt: new Date(),
      };

      console.log(`   ✅ Ticket created: ${ticket.id}\n`);

      // ============================================================
      // STEP 5: Execute worker with REAL Claude API
      // ============================================================
      console.log('🤖 STEP 5: Executing worker with REAL Claude API...');
      console.log('   ⏳ This may take 10-30 seconds...\n');

      const workerStart = Date.now();
      const result = await worker.executeTicket(ticket);
      const workerDuration = Date.now() - workerStart;

      console.log(`   ⏱️  Worker execution time: ${workerDuration}ms`);
      console.log(`   ${result.success ? '✅' : '❌'} Worker result: ${result.success ? 'SUCCESS' : 'FAILED'}`);

      if (result.success) {
        console.log(`   🆔 Response ID: ${result.responseId}`);
        console.log(`   🔢 Tokens used: ${result.tokensUsed}`);
        console.log(`   ⏱️  Generation time: ${result.durationMs}ms\n`);
      } else {
        console.log(`   ❌ Error: ${result.error}\n`);
      }

      // Verify worker succeeded
      expect(result.success).toBe(true);
      expect(result.responseId).toBeDefined();
      expect(result.tokensUsed).toBeGreaterThan(0);

      // ============================================================
      // STEP 6: Verify response stored in database
      // ============================================================
      console.log('💾 STEP 6: Verifying response stored in database...');
      const responseQuery = await pool.query(`
        SELECT
          id, user_id, agent_name, response_content, tokens_used,
          generation_time_ms, status, validation_results, created_at
        FROM agent_responses
        WHERE id = $1
      `, [result.responseId]);

      expect(responseQuery.rows.length).toBe(1);
      const response = responseQuery.rows[0];

      expect(response.user_id).toBe('test-e2e-user');
      expect(response.agent_name).toBe('tech-guru');
      expect(response.response_content).toBeDefined();
      expect(response.response_content.length).toBeGreaterThan(50);
      expect(response.response_content.length).toBeLessThanOrEqual(500);
      expect(response.tokens_used).toBeGreaterThan(0);
      expect(response.status).toBe('validated');

      console.log(`   ✅ Response stored successfully`);
      console.log(`   📝 Content preview: "${response.response_content.substring(0, 100)}..."`);
      console.log(`   📏 Length: ${response.response_content.length} characters`);
      console.log(`   🔢 Tokens: ${response.tokens_used}`);
      console.log(`   ⏱️  Generation time: ${response.generation_time_ms}ms`);
      console.log(`   ✅ Status: ${response.status}\n`);

      // ============================================================
      // STEP 7: Verify feed item marked as processed
      // ============================================================
      console.log('🏁 STEP 7: Verifying feed item marked as processed...');
      const updatedItemQuery = await pool.query(`
        SELECT processed, processing_status, updated_at
        FROM feed_items
        WHERE id = $1
      `, [feedItem.id]);

      expect(updatedItemQuery.rows[0].processed).toBe(true);
      expect(updatedItemQuery.rows[0].processing_status).toBe('completed');

      console.log(`   ✅ Feed item marked as processed`);
      console.log(`   📊 Status: processed=${updatedItemQuery.rows[0].processed}`);
      console.log(`   📊 Processing status: ${updatedItemQuery.rows[0].processing_status}\n`);

      // ============================================================
      // FINAL SUMMARY
      // ============================================================
      console.log('═══════════════════════════════════════════════════════');
      console.log('🎉 END-TO-END FLOW TEST COMPLETE');
      console.log('═══════════════════════════════════════════════════════');
      console.log('✅ Real RSS feed fetched (Hacker News)');
      console.log('✅ Feed items parsed and stored');
      console.log('✅ Work ticket created');
      console.log('✅ Worker executed with real Claude API');
      console.log('✅ Response generated and validated');
      console.log('✅ Response stored in database');
      console.log('✅ Feed item marked as processed');
      console.log('═══════════════════════════════════════════════════════\n');
      console.log('📊 METRICS:');
      console.log(`   • Feed items fetched: ${fetchResult.itemsFound}`);
      console.log(`   • Items stored: ${fetchResult.itemsStored}`);
      console.log(`   • Tokens used: ${response.tokens_used}`);
      console.log(`   • Worker execution: ${workerDuration}ms`);
      console.log(`   • Response length: ${response.response_content.length} chars`);
      console.log('═══════════════════════════════════════════════════════\n');
    }, 120000); // 120s timeout for complete flow

    it('should process multiple feed items concurrently', async () => {
      console.log('🚀 Starting Concurrent E2E Flow Test...\n');

      // Create feed
      const feedResult = await pool.query(`
        INSERT INTO user_feeds (
          user_id, agent_name, feed_url, feed_type, feed_name
        ) VALUES ($1, $2, $3, $4, $5)
        RETURNING id
      `, ['test-e2e-user', 'tech-guru', 'https://hnrss.org/newest?count=5', 'rss', 'Concurrent Test']);

      const feedId = feedResult.rows[0].id;

      // Fetch real feed
      console.log('📡 Fetching real RSS feed...');
      const fetchResult = await feedMonitor.fetchFeed(feedId);
      expect(fetchResult.success).toBe(true);
      console.log(`   ✅ Fetched ${fetchResult.itemsFound} items\n`);

      // Get feed items
      const itemsQuery = await pool.query(`
        SELECT id, title FROM feed_items WHERE feed_id = $1 LIMIT 3
      `, [feedId]);

      expect(itemsQuery.rows.length).toBeGreaterThanOrEqual(1);

      // Create tickets for all items
      const tickets: WorkTicket[] = itemsQuery.rows.map((item, i) => ({
        id: `concurrent-ticket-${i}-${Date.now()}`,
        type: 'post_response',
        priority: 5,
        agentName: 'tech-guru',
        userId: 'test-e2e-user',
        payload: {
          feedId,
          feedItemId: item.id,
          itemGuid: item.id,
        },
        status: 'pending',
        createdAt: new Date(),
      }));

      console.log(`🎫 Created ${tickets.length} work tickets`);
      console.log('🤖 Processing tickets concurrently with REAL Claude API...\n');

      // Execute all tickets in parallel
      const startTime = Date.now();
      const results = await Promise.all(
        tickets.map(ticket => worker.executeTicket(ticket))
      );
      const totalDuration = Date.now() - startTime;

      console.log(`⏱️  Total concurrent execution time: ${totalDuration}ms\n`);

      // Verify all succeeded
      results.forEach((r, i) => {
        console.log(`   Ticket ${i + 1}: ${r.success ? '✅ SUCCESS' : '❌ FAILED'} - ${r.tokensUsed || 0} tokens - ${r.durationMs}ms`);
      });
      console.log('');

      expect(results.every(r => r.success)).toBe(true);
      expect(results.every(r => r.tokensUsed && r.tokensUsed > 0)).toBe(true);

      // Verify all stored in database
      const responsesQuery = await pool.query(`
        SELECT * FROM agent_responses WHERE user_id = 'test-e2e-user'
      `);

      expect(responsesQuery.rows.length).toBe(tickets.length);
      responsesQuery.rows.forEach(row => {
        expect(row.status).toBe('validated');
        expect(row.response_content.length).toBeGreaterThan(50);
      });

      console.log('✅ All responses validated and stored\n');

      console.log('═══════════════════════════════════════════════════════');
      console.log('🎉 CONCURRENT E2E FLOW TEST COMPLETE');
      console.log('═══════════════════════════════════════════════════════');
      console.log(`✅ Processed ${tickets.length} items concurrently`);
      console.log(`⏱️  Total time: ${totalDuration}ms`);
      console.log(`⏱️  Average per item: ${Math.round(totalDuration / tickets.length)}ms`);
      console.log(`🔢 Total tokens: ${results.reduce((sum, r) => sum + (r.tokensUsed || 0), 0)}`);
      console.log('═══════════════════════════════════════════════════════\n');
    }, 180000); // 180s timeout for concurrent processing
  });

  describe('Error Recovery and Edge Cases', () => {
    it('should handle feed parsing errors gracefully', async () => {
      console.log('🚀 Testing Error Recovery...\n');

      // Create feed with invalid URL
      const feedResult = await pool.query(`
        INSERT INTO user_feeds (
          user_id, agent_name, feed_url, feed_type, feed_name
        ) VALUES ($1, $2, $3, $4, $5)
        RETURNING id
      `, ['test-e2e-user', 'tech-guru', 'https://invalid-url-that-does-not-exist.com/feed', 'rss', 'Error Test']);

      const feedId = feedResult.rows[0].id;

      // Try to fetch (should fail gracefully)
      const fetchResult = await feedMonitor.fetchFeed(feedId);

      expect(fetchResult.success).toBe(false);
      expect(fetchResult.error).toBeDefined();
      console.log(`   ✅ Error handled gracefully: ${fetchResult.error}\n`);
    });

    it('should handle missing agent template gracefully', async () => {
      const ticket: WorkTicket = {
        id: 'error-ticket',
        type: 'post_response',
        priority: 5,
        agentName: 'nonexistent-agent',
        userId: 'test-e2e-user',
        payload: {
          feedId: 'fake-feed',
          feedItemId: 'fake-item',
          itemGuid: 'fake-guid',
        },
        status: 'pending',
        createdAt: new Date(),
      };

      const result = await worker.executeTicket(ticket);

      expect(result.success).toBe(false);
      expect(result.error).toBeDefined();
      console.log(`   ✅ Missing template handled: ${result.error}\n`);
    });
  });
});

// Display helpful message when tests are skipped
if (SKIP_TESTS) {
  console.log('\n⚠️  End-to-End Integration Tests SKIPPED');
  console.log('   Reason: ANTHROPIC_API_KEY not configured\n');
  console.log('   To run these tests:');
  console.log('   1. Set ANTHROPIC_API_KEY in .env file');
  console.log('   2. Ensure PostgreSQL is running');
  console.log('   3. Run: npm test -- tests/phase3/integration/e2e-flow.test.ts\n');
}
