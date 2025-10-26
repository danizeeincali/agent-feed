import Database from 'better-sqlite3';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';
import { TokenAnalyticsWriter } from '../src/services/TokenAnalyticsWriter.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

console.log('🧪 Testing Cache Token Write Functionality');
console.log('='.repeat(60));

const dbPath = join(__dirname, '..', 'database.db');
const db = new Database(dbPath);

try {
  // Initialize TokenAnalyticsWriter
  const writer = new TokenAnalyticsWriter(db);

  // Create test SDK messages with cache tokens
  const testMessages = [
    {
      type: 'result',
      usage: {
        input_tokens: 1000,
        output_tokens: 500,
        cache_read_input_tokens: 5000,  // Simulating cache hit
        cache_creation_input_tokens: 200 // Simulating cache creation
      },
      modelUsage: {
        'claude-sonnet-4-20250514': {
          input_tokens: 1000,
          output_tokens: 500
        }
      },
      total_cost_usd: 0.0123,
      duration_ms: 1500,
      num_turns: 1
    }
  ];

  const sessionId = 'test-cache-session-' + Date.now();

  console.log('\n📝 Test Case 1: Write Record with Cache Tokens');
  console.log('Input data:');
  console.log('  Input tokens:', testMessages[0].usage.input_tokens);
  console.log('  Output tokens:', testMessages[0].usage.output_tokens);
  console.log('  Cache read tokens:', testMessages[0].usage.cache_read_input_tokens);
  console.log('  Cache creation tokens:', testMessages[0].usage.cache_creation_input_tokens);

  // Write metrics
  await writer.writeTokenMetrics(testMessages, sessionId);

  console.log('\n✅ Write operation completed');

  // Verify the record was written
  console.log('\n📋 Test Case 2: Verify Written Record');
  const record = db.prepare(`
    SELECT *
    FROM token_analytics
    WHERE sessionId = ?
    ORDER BY timestamp DESC
    LIMIT 1
  `).get(sessionId);

  if (!record) {
    throw new Error('❌ Record not found in database');
  }

  console.log('Retrieved record:');
  console.log('  ID:', record.id);
  console.log('  Session ID:', record.sessionId);
  console.log('  Model:', record.model);
  console.log('  Input tokens:', record.inputTokens);
  console.log('  Output tokens:', record.outputTokens);
  console.log('  Cache read tokens:', record.cacheReadTokens);
  console.log('  Cache creation tokens:', record.cacheCreationTokens);
  console.log('  Total tokens:', record.totalTokens);
  console.log('  Estimated cost: $' + record.estimatedCost.toFixed(6));

  // Validate values
  console.log('\n📋 Test Case 3: Validate Cache Token Values');

  const tests = [
    {
      name: 'Input tokens',
      expected: 1000,
      actual: record.inputTokens
    },
    {
      name: 'Output tokens',
      expected: 500,
      actual: record.outputTokens
    },
    {
      name: 'Cache read tokens',
      expected: 5000,
      actual: record.cacheReadTokens
    },
    {
      name: 'Cache creation tokens',
      expected: 200,
      actual: record.cacheCreationTokens
    }
  ];

  let allPassed = true;
  tests.forEach(test => {
    const passed = test.expected === test.actual;
    const status = passed ? '✅ PASS' : '❌ FAIL';
    console.log(`  ${test.name}: ${status} (expected: ${test.expected}, actual: ${test.actual})`);
    if (!passed) allPassed = false;
  });

  // Test cost calculation
  console.log('\n📋 Test Case 4: Validate Cost Calculation');

  // Calculate expected cost manually
  const PRICING = {
    input: 0.003,
    output: 0.015,
    cacheRead: 0.0003,
    cacheCreation: 0.003
  };

  const expectedCost =
    (1000 * PRICING.input / 1000) +
    (500 * PRICING.output / 1000) +
    (5000 * PRICING.cacheRead / 1000) +
    (200 * PRICING.cacheCreation / 1000);

  console.log('  Expected cost breakdown:');
  console.log('    Input: $' + (1000 * PRICING.input / 1000).toFixed(6));
  console.log('    Output: $' + (500 * PRICING.output / 1000).toFixed(6));
  console.log('    Cache read: $' + (5000 * PRICING.cacheRead / 1000).toFixed(6));
  console.log('    Cache creation: $' + (200 * PRICING.cacheCreation / 1000).toFixed(6));
  console.log('  Expected total: $' + expectedCost.toFixed(6));
  console.log('  Actual total: $' + record.estimatedCost.toFixed(6));

  const costMatch = Math.abs(expectedCost - record.estimatedCost) < 0.000001;
  console.log('  Cost calculation:', costMatch ? '✅ PASS' : '❌ FAIL');

  if (!costMatch) allPassed = false;

  // Calculate savings from cache
  console.log('\n📋 Test Case 5: Calculate Cache Savings');
  const fullPriceCost =
    ((1000 + 5000) * PRICING.input / 1000) +  // All input at full price
    (500 * PRICING.output / 1000);
  const actualCost = record.estimatedCost;
  const savings = fullPriceCost - actualCost;
  const savingsPercent = (savings / fullPriceCost) * 100;

  console.log('  Cost without cache: $' + fullPriceCost.toFixed(6));
  console.log('  Cost with cache: $' + actualCost.toFixed(6));
  console.log('  Savings: $' + savings.toFixed(6) + ' (' + savingsPercent.toFixed(1) + '%)');
  console.log('  Cache efficiency:', savings > 0 ? '✅ SAVING MONEY' : '❌ NO SAVINGS');

  // Cleanup test record
  console.log('\n🧹 Cleanup: Removing test record');
  const deleteResult = db.prepare('DELETE FROM token_analytics WHERE sessionId = ?').run(sessionId);
  console.log('  Deleted records:', deleteResult.changes);

  console.log('\n' + '='.repeat(60));
  if (allPassed) {
    console.log('✅ ALL TESTS PASSED - Cache token tracking is working correctly!');
    console.log('\n💡 Key Findings:');
    console.log('  - Cache tokens are now saved to database');
    console.log('  - Cost calculations include cache discounts');
    console.log('  - Cache provides significant cost savings (90% discount on reads)');
  } else {
    console.log('❌ SOME TESTS FAILED - Review errors above');
    process.exit(1);
  }

} catch (error) {
  console.error('\n❌ Test failed:', error.message);
  console.error(error.stack);
  process.exit(1);
} finally {
  db.close();
}
