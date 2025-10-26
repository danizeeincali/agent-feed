#!/usr/bin/env node

/**
 * Test Analytics Write Script
 *
 * Tests the TokenAnalyticsWriter service to verify:
 * 1. Database connection works
 * 2. Metrics extraction from SDK messages works
 * 3. Cost calculation works
 * 4. Database writes succeed
 *
 * Usage: node scripts/test-analytics-write.js
 */

import Database from 'better-sqlite3';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';
import { randomUUID } from 'crypto';
import { TokenAnalyticsWriter } from '../src/services/TokenAnalyticsWriter.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

// Database path
const DB_PATH = join(__dirname, '..', 'database.db');

console.log('🧪 Token Analytics Write Test');
console.log('=' .repeat(60));
console.log('Database path:', DB_PATH);
console.log('');

/**
 * Mock SDK messages that simulate a real Claude Code SDK response
 */
const mockSDKMessages = [
  {
    type: 'input',
    role: 'user',
    content: 'Test message'
  },
  {
    type: 'result',
    usage: {
      input_tokens: 1250,
      output_tokens: 850,
      cache_read_input_tokens: 500,
      cache_creation_input_tokens: 200
    },
    modelUsage: {
      'claude-sonnet-4-20250514': {
        input_tokens: 1250,
        output_tokens: 850,
        cache_read_input_tokens: 500,
        cache_creation_input_tokens: 200
      }
    },
    total_cost_usd: 0.025,
    duration_ms: 1850,
    num_turns: 3,
    id: 'msg_test_' + randomUUID()
  }
];

/**
 * Run test suite
 */
async function runTests() {
  let db;
  let writer;
  let testsPassed = 0;
  let testsFailed = 0;

  try {
    // Test 1: Database connection
    console.log('📋 Test 1: Database Connection');
    try {
      db = new Database(DB_PATH);
      console.log('✅ Database connected successfully');
      testsPassed++;
    } catch (error) {
      console.error('❌ Database connection failed:', error.message);
      testsFailed++;
      return;
    }

    // Test 2: Verify token_analytics table exists
    console.log('\n📋 Test 2: Verify token_analytics Table');
    try {
      const tableInfo = db.prepare("SELECT name FROM sqlite_master WHERE type='table' AND name='token_analytics'").get();
      if (tableInfo) {
        console.log('✅ token_analytics table exists');

        // Show table schema
        const schema = db.prepare("PRAGMA table_info(token_analytics)").all();
        console.log('   Table schema:');
        schema.forEach(col => {
          console.log(`   - ${col.name}: ${col.type}`);
        });
        testsPassed++;
      } else {
        console.error('❌ token_analytics table does not exist');
        testsFailed++;
        return;
      }
    } catch (error) {
      console.error('❌ Table verification failed:', error.message);
      testsFailed++;
      return;
    }

    // Test 3: Initialize TokenAnalyticsWriter
    console.log('\n📋 Test 3: Initialize TokenAnalyticsWriter');
    try {
      writer = new TokenAnalyticsWriter(db);
      if (writer.initialized) {
        console.log('✅ TokenAnalyticsWriter initialized');
        testsPassed++;
      } else {
        console.error('❌ TokenAnalyticsWriter not initialized properly');
        testsFailed++;
        return;
      }
    } catch (error) {
      console.error('❌ Writer initialization failed:', error.message);
      testsFailed++;
      return;
    }

    // Test 4: Extract metrics from mock messages
    console.log('\n📋 Test 4: Extract Metrics from SDK Messages');
    try {
      const sessionId = `test_session_${Date.now()}`;
      const metrics = writer.extractMetricsFromSDK(mockSDKMessages, sessionId);

      if (metrics) {
        console.log('✅ Metrics extracted successfully');
        console.log('   Session ID:', metrics.sessionId);
        console.log('   Model:', metrics.model);
        console.log('   Input tokens:', metrics.inputTokens);
        console.log('   Output tokens:', metrics.outputTokens);
        console.log('   Cache read tokens:', metrics.cacheReadTokens);
        console.log('   Cache creation tokens:', metrics.cacheCreationTokens);
        console.log('   Total tokens:', metrics.totalTokens);
        testsPassed++;
      } else {
        console.error('❌ Metrics extraction failed - returned null');
        testsFailed++;
      }
    } catch (error) {
      console.error('❌ Metrics extraction error:', error.message);
      testsFailed++;
    }

    // Test 5: Calculate estimated cost
    console.log('\n📋 Test 5: Calculate Estimated Cost');
    try {
      const testUsage = {
        inputTokens: 1000,
        outputTokens: 500,
        cacheReadTokens: 200,
        cacheCreationTokens: 100
      };

      const cost = writer.calculateEstimatedCost(testUsage, 'claude-sonnet-4-20250514');

      console.log('✅ Cost calculation successful');
      console.log('   Test usage:', testUsage);
      console.log('   Estimated cost: $' + cost.toFixed(6));
      console.log('   Cost breakdown:');
      console.log('     - Input (1000 tokens): $' + ((1000 * 0.003) / 1000).toFixed(6));
      console.log('     - Output (500 tokens): $' + ((500 * 0.015) / 1000).toFixed(6));
      console.log('     - Cache read (200 tokens): $' + ((200 * 0.0003) / 1000).toFixed(6));
      console.log('     - Cache creation (100 tokens): $' + ((100 * 0.003) / 1000).toFixed(6));
      testsPassed++;
    } catch (error) {
      console.error('❌ Cost calculation error:', error.message);
      testsFailed++;
    }

    // Test 6: Write metrics to database
    console.log('\n📋 Test 6: Write Metrics to Database');
    try {
      const sessionId = `test_session_write_${Date.now()}`;

      // Count records before write
      const beforeCount = db.prepare('SELECT COUNT(*) as count FROM token_analytics').get().count;
      console.log('   Records before write:', beforeCount);

      // Write metrics
      await writer.writeTokenMetrics(mockSDKMessages, sessionId);

      // Wait a bit for async write to complete
      await new Promise(resolve => setTimeout(resolve, 100));

      // Count records after write
      const afterCount = db.prepare('SELECT COUNT(*) as count FROM token_analytics').get().count;
      console.log('   Records after write:', afterCount);

      if (afterCount > beforeCount) {
        console.log('✅ Database write successful');
        console.log('   New records written:', afterCount - beforeCount);

        // Fetch the written record
        const record = db.prepare('SELECT * FROM token_analytics WHERE sessionId = ? ORDER BY timestamp DESC LIMIT 1').get(sessionId);
        if (record) {
          console.log('   Written record:');
          console.log('     - ID:', record.id);
          console.log('     - Timestamp:', record.timestamp);
          console.log('     - Model:', record.model);
          console.log('     - Total tokens:', record.totalTokens);
          console.log('     - Estimated cost: $' + record.estimatedCost.toFixed(6));
        }
        testsPassed++;
      } else {
        console.error('❌ Database write failed - no new records');
        testsFailed++;
      }
    } catch (error) {
      console.error('❌ Database write error:', error.message);
      console.error('   Stack:', error.stack);
      testsFailed++;
    }

    // Test 7: Query recent analytics
    console.log('\n📋 Test 7: Query Recent Analytics');
    try {
      const recent = db.prepare(`
        SELECT
          id, timestamp, sessionId, model,
          inputTokens, outputTokens, totalTokens,
          estimatedCost
        FROM token_analytics
        ORDER BY timestamp DESC
        LIMIT 5
      `).all();

      console.log('✅ Query successful');
      console.log('   Recent records:', recent.length);

      if (recent.length > 0) {
        console.log('   Last 5 analytics records:');
        recent.forEach((r, i) => {
          console.log(`   ${i + 1}. ${r.timestamp} - ${r.model} - ${r.totalTokens} tokens - $${r.estimatedCost.toFixed(6)}`);
        });
      }
      testsPassed++;
    } catch (error) {
      console.error('❌ Query error:', error.message);
      testsFailed++;
    }

  } catch (error) {
    console.error('\n❌ Unexpected error:', error);
    testsFailed++;
  } finally {
    if (db) {
      db.close();
    }
  }

  // Print summary
  console.log('\n' + '='.repeat(60));
  console.log('📊 Test Summary');
  console.log('='.repeat(60));
  console.log('✅ Tests passed:', testsPassed);
  console.log('❌ Tests failed:', testsFailed);
  console.log('📊 Total tests:', testsPassed + testsFailed);
  console.log('Success rate:', ((testsPassed / (testsPassed + testsFailed)) * 100).toFixed(1) + '%');
  console.log('');

  if (testsFailed === 0) {
    console.log('🎉 All tests passed! Analytics system is working correctly.');
    process.exit(0);
  } else {
    console.log('⚠️  Some tests failed. Please review the errors above.');
    process.exit(1);
  }
}

// Run tests
runTests().catch(error => {
  console.error('Fatal error:', error);
  process.exit(1);
});
