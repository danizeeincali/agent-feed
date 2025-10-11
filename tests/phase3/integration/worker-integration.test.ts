/**
 * AgentWorker Integration Tests
 * Phase 3B: REAL Claude API Integration
 *
 * REAL TESTS - NO MOCKS:
 * - Real PostgreSQL database
 * - Real Claude API calls
 * - Real agent context loading
 * - Real response generation and storage
 *
 * REQUIREMENTS:
 * - Set ANTHROPIC_API_KEY in .env file
 * - Ensure PostgreSQL is running
 * - Have tech-guru agent template in database
 */

import { describe, it, expect, beforeAll, afterAll, beforeEach } from '@jest/globals';
import { Pool } from 'pg';
import { AgentWorker } from '../../../src/worker/agent-worker';
import { ResponseGenerator } from '../../../src/worker/response-generator';
import { DatabaseManager } from '../../../src/types/database-manager';
import Anthropic from '@anthropic-ai/sdk';
import type { WorkTicket } from '../../../src/types/work-ticket';

// Skip tests if API key not configured
const SKIP_TESTS = !process.env.ANTHROPIC_API_KEY || process.env.ANTHROPIC_API_KEY === 'your_api_key_here';

const describeOrSkip = SKIP_TESTS ? describe.skip : describe;

describeOrSkip('AgentWorker Integration Tests (REAL Database + REAL Claude API)', () => {
  let pool: Pool;
  let database: DatabaseManager;
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

    console.log('✅ Connected to REAL PostgreSQL and Claude API for integration tests');
  });

  afterAll(async () => {
    await pool.end();
  });

  beforeEach(async () => {
    // Clean up test data
    await pool.query(`DELETE FROM agent_responses WHERE user_id LIKE 'test-worker-%'`);
    await pool.query(`DELETE FROM feed_items WHERE feed_id IN (SELECT id FROM user_feeds WHERE user_id LIKE 'test-worker-%')`);
    await pool.query(`DELETE FROM user_feeds WHERE user_id LIKE 'test-worker-%'`);
    await pool.query(`DELETE FROM work_queue WHERE user_id LIKE 'test-worker-%'`);
  });

  describe('End-to-End Worker Execution', () => {
    it('should execute work ticket with REAL Claude API', async () => {
      // 1. Create test feed
      const feedResult = await pool.query(`
        INSERT INTO user_feeds (
          user_id, agent_name, feed_url, feed_type, feed_name
        ) VALUES ($1, $2, $3, $4, $5)
        RETURNING id
      `, ['test-worker-user', 'tech-guru', 'https://example.com/feed', 'rss', 'Test Feed']);

      const feedId = feedResult.rows[0].id;

      // 2. Create test feed item
      const itemResult = await pool.query(`
        INSERT INTO feed_items (
          feed_id, item_guid, title, content, link, published_at
        ) VALUES ($1, $2, $3, $4, $5, $6)
        RETURNING id
      `, [
        feedId,
        'test-guid-123',
        'TypeScript 5.0 Released with New Features',
        'TypeScript 5.0 introduces decorators, const type parameters, and improved type inference...',
        'https://example.com/ts5',
        new Date(),
      ]);

      const feedItemId = itemResult.rows[0].id;

      // 3. Create work ticket
      const ticket: WorkTicket = {
        id: 'test-ticket-123',
        type: 'post_response',
        priority: 5,
        agentName: 'tech-guru',
        userId: 'test-worker-user',
        payload: {
          feedId,
          feedItemId,
          itemGuid: 'test-guid-123',
        },
        status: 'pending',
        createdAt: new Date(),
      };

      console.log('📡 Executing work ticket with REAL Claude API...');

      // 4. Execute ticket (REAL Claude API call!)
      const result = await worker.executeTicket(ticket);

      console.log(`✅ Worker execution: ${result.success ? 'SUCCESS' : 'FAILED'}`);
      console.log(`   Tokens used: ${result.tokensUsed || 0}`);
      console.log(`   Duration: ${result.durationMs}ms`);

      // 5. Verify result
      expect(result.success).toBe(true);
      expect(result.responseId).toBeDefined();
      expect(result.tokensUsed).toBeGreaterThan(0);
      expect(result.durationMs).toBeGreaterThan(0);

      // 6. Verify response stored in database
      const responseQuery = await pool.query(`
        SELECT * FROM agent_responses WHERE id = $1
      `, [result.responseId]);

      expect(responseQuery.rows.length).toBe(1);
      const response = responseQuery.rows[0];

      expect(response.user_id).toBe('test-worker-user');
      expect(response.agent_name).toBe('tech-guru');
      expect(response.response_content).toBeDefined();
      expect(response.response_content.length).toBeGreaterThan(50);
      expect(response.tokens_used).toBeGreaterThan(0);
      expect(response.status).toBe('validated');

      console.log(`📝 Response stored in database:`);
      console.log(`   Content: "${response.response_content.substring(0, 100)}..."`);
      console.log(`   Tokens: ${response.tokens_used}`);
      console.log(`   Status: ${response.status}`);

      // 7. Verify feed item marked as processed
      const itemQuery = await pool.query(`
        SELECT * FROM feed_items WHERE id = $1
      `, [feedItemId]);

      expect(itemQuery.rows[0].processed).toBe(true);
      expect(itemQuery.rows[0].processing_status).toBe('completed');

      console.log('✅ Feed item marked as processed');
    }, 60000); // 60s timeout for real API call

    it('should handle multiple tickets concurrently', async () => {
      // Create feed
      const feedResult = await pool.query(`
        INSERT INTO user_feeds (
          user_id, agent_name, feed_url, feed_type, feed_name
        ) VALUES ($1, $2, $3, $4, $5)
        RETURNING id
      `, ['test-worker-concurrent', 'tech-guru', 'https://example.com/feed', 'rss', 'Concurrent Test']);

      const feedId = feedResult.rows[0].id;

      // Create 3 feed items
      const items = await Promise.all([
        pool.query(`
          INSERT INTO feed_items (feed_id, item_guid, title, content)
          VALUES ($1, $2, $3, $4) RETURNING id
        `, [feedId, 'guid-1', 'Article 1', 'Content about AI and machine learning']),
        pool.query(`
          INSERT INTO feed_items (feed_id, item_guid, title, content)
          VALUES ($1, $2, $3, $4) RETURNING id
        `, [feedId, 'guid-2', 'Article 2', 'Content about web development frameworks']),
        pool.query(`
          INSERT INTO feed_items (feed_id, item_guid, title, content)
          VALUES ($1, $2, $3, $4) RETURNING id
        `, [feedId, 'guid-3', 'Article 3', 'Content about cloud infrastructure']),
      ]);

      // Create 3 tickets
      const tickets: WorkTicket[] = items.map((item, i) => ({
        id: `concurrent-ticket-${i}`,
        type: 'post_response',
        priority: 5,
        agentName: 'tech-guru',
        userId: 'test-worker-concurrent',
        payload: {
          feedId,
          feedItemId: item.rows[0].id,
          itemGuid: `guid-${i + 1}`,
        },
        status: 'pending',
        createdAt: new Date(),
      }));

      console.log('📡 Processing 3 tickets concurrently with REAL Claude API...');

      // Execute all tickets in parallel
      const results = await Promise.all(
        tickets.map(ticket => worker.executeTicket(ticket))
      );

      console.log(`✅ Processed ${results.length} tickets`);
      results.forEach((r, i) => {
        console.log(`   Ticket ${i + 1}: ${r.success ? 'SUCCESS' : 'FAILED'} - ${r.tokensUsed} tokens - ${r.durationMs}ms`);
      });

      // Verify all succeeded
      expect(results.every(r => r.success)).toBe(true);
      expect(results.every(r => r.tokensUsed && r.tokensUsed > 0)).toBe(true);

      // Verify all stored in database
      const responsesQuery = await pool.query(`
        SELECT * FROM agent_responses WHERE user_id = 'test-worker-concurrent'
      `);

      expect(responsesQuery.rows.length).toBe(3);
      responsesQuery.rows.forEach(row => {
        expect(row.status).toBe('validated');
        expect(row.response_content.length).toBeGreaterThan(50);
      });

      console.log('✅ All 3 responses stored in database');
    }, 120000); // 120s timeout for 3 API calls

    it('should validate response length constraints', async () => {
      // Create feed with strict length rules
      const feedResult = await pool.query(`
        INSERT INTO user_feeds (
          user_id, agent_name, feed_url, feed_type, feed_name
        ) VALUES ($1, $2, $3, $4, $5)
        RETURNING id
      `, ['test-worker-validation', 'tech-guru', 'https://example.com/feed', 'rss', 'Validation Test']);

      const feedId = feedResult.rows[0].id;

      const itemResult = await pool.query(`
        INSERT INTO feed_items (
          feed_id, item_guid, title, content
        ) VALUES ($1, $2, $3, $4)
        RETURNING id
      `, [feedId, 'validation-guid', 'Test Article', 'Short content for validation testing']);

      const ticket: WorkTicket = {
        id: 'validation-ticket',
        type: 'post_response',
        priority: 5,
        agentName: 'tech-guru',
        userId: 'test-worker-validation',
        payload: {
          feedId,
          feedItemId: itemResult.rows[0].id,
          itemGuid: 'validation-guid',
        },
        status: 'pending',
        createdAt: new Date(),
      };

      console.log('📡 Testing response validation with REAL Claude API...');

      const result = await worker.executeTicket(ticket);

      console.log(`✅ Validation result: ${result.success ? 'PASSED' : 'FAILED'}`);

      // Should succeed with proper length
      expect(result.success).toBe(true);

      const responseQuery = await pool.query(`
        SELECT * FROM agent_responses WHERE id = $1
      `, [result.responseId]);

      const response = responseQuery.rows[0];
      expect(response.response_content.length).toBeGreaterThanOrEqual(50);
      expect(response.response_content.length).toBeLessThanOrEqual(500);

      console.log(`✅ Response length validation passed: ${response.response_content.length} chars`);
    }, 60000);
  });

  describe('Error Handling', () => {
    it('should handle missing agent template gracefully', async () => {
      const ticket: WorkTicket = {
        id: 'error-ticket',
        type: 'post_response',
        priority: 5,
        agentName: 'nonexistent-agent',
        userId: 'test-worker-error',
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
      console.log(`✅ Error handled gracefully: ${result.error}`);
    });
  });
});
