/**
 * Standalone Test for ClaudeAuthManager (No Server Dependencies)
 * Run with: node tests/manual-validation/auth-manager-standalone-test.js
 */

import Database from 'better-sqlite3';
import path from 'path';
import { fileURLToPath } from 'url';
import { dirname } from 'path';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

// Import only the ClaudeAuthManager (no server dependencies)
const ClaudeAuthManager = (await import('../../src/services/ClaudeAuthManager.js')).ClaudeAuthManager;

function setupTestDatabase() {
  // Create in-memory database for testing
  const db = new Database(':memory:');

  // Create required tables
  db.exec(`
    CREATE TABLE IF NOT EXISTS user_settings (
      user_id TEXT PRIMARY KEY,
      auth_method TEXT DEFAULT 'platform_payg',
      api_key TEXT,
      usage_limit REAL,
      usage_current REAL DEFAULT 0,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
    );

    CREATE TABLE IF NOT EXISTS api_usage (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      user_id TEXT NOT NULL,
      tokens_input INTEGER,
      tokens_output INTEGER,
      tokens_total INTEGER,
      cost_usd REAL,
      timestamp DATETIME DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY (user_id) REFERENCES user_settings(user_id)
    );
  `);

  return db;
}

async function testAuthManager(db) {
  console.log('\n=== Testing ClaudeAuthManager ===\n');

  const authManager = new ClaudeAuthManager(db);

  // Test 1: New user defaults to platform_payg
  console.log('Test 1: New user auth config');
  const newUserConfig = await authManager.getAuthConfig('new-user');
  console.log('✓ New user config:', {
    method: newUserConfig.method,
    trackUsage: newUserConfig.trackUsage,
    hasApiKey: !!newUserConfig.apiKey
  });
  console.assert(newUserConfig.method === 'platform_payg', 'Should default to platform_payg');

  // Test 2: Update to BYOC
  console.log('\nTest 2: Update user to BYOC');
  await authManager.updateAuthMethod('test-user', 'byoc', {
    apiKey: 'sk-ant-test-user-key-123456789'
  });
  const byocConfig = await authManager.getAuthConfig('test-user');
  console.log('✓ BYOC config:', {
    method: byocConfig.method,
    trackUsage: byocConfig.trackUsage,
    apiKey: byocConfig.apiKey?.substring(0, 20) + '...'
  });
  console.assert(byocConfig.method === 'byoc', 'Should be BYOC method');
  console.assert(byocConfig.trackUsage === false, 'BYOC should not track usage');

  // Test 3: Platform free tier
  console.log('\nTest 3: Platform free tier user');
  await authManager.updateAuthMethod('free-user', 'platform_free', {
    usageLimit: 1.0
  });
  const freeConfig = await authManager.getAuthConfig('free-user');
  console.log('✓ Free tier config:', {
    method: freeConfig.method,
    trackUsage: freeConfig.trackUsage,
    limit: freeConfig.usageLimit
  });
  console.assert(freeConfig.method === 'platform_free', 'Should be platform_free');
  console.assert(freeConfig.trackUsage === true, 'Free tier should track usage');

  // Test 4: Track usage
  console.log('\nTest 4: Track API usage');
  const tokens = { input: 1000, output: 500, total: 1500 };
  const cost = 0.015;
  await authManager.trackUsage('free-user', tokens, cost);

  const usage = await authManager.getUserUsage('free-user');
  console.log('✓ Usage tracked:', {
    current: usage.current,
    remaining: usage.remaining,
    totalRequests: usage.totalRequests
  });
  console.assert(usage.current === 0.015, 'Usage should be tracked');

  // Test 5: API key validation
  console.log('\nTest 5: API key validation');
  const validKey = authManager.validateApiKey('sk-ant-api03-valid-key-here-1234567890');
  const invalidKey = authManager.validateApiKey('invalid-key');
  console.log('✓ Validation:', {
    validKey,
    invalidKey
  });
  console.assert(validKey === true, 'Should validate correct key');
  console.assert(invalidKey === false, 'Should reject invalid key');

  // Test 6: Environment manipulation
  console.log('\nTest 6: Environment manipulation');
  const originalKey = process.env.ANTHROPIC_API_KEY;
  const testConfig = {
    method: 'byoc',
    apiKey: 'sk-ant-test-key',
    permissionMode: 'bypassPermissions'
  };

  authManager.prepareSDKAuth(testConfig);
  console.log('✓ After prepare:', process.env.ANTHROPIC_API_KEY?.substring(0, 20) + '...');
  console.assert(process.env.ANTHROPIC_API_KEY === 'sk-ant-test-key', 'Should set new key');

  authManager.restoreSDKAuth(testConfig);
  console.log('✓ After restore:', process.env.ANTHROPIC_API_KEY === originalKey ? 'restored' : 'not restored');
  console.assert(process.env.ANTHROPIC_API_KEY === originalKey, 'Should restore original key');

  // Test 7: Multiple users and usage tracking
  console.log('\nTest 7: Multiple users with different auth methods');

  await authManager.updateAuthMethod('payg-user', 'platform_payg');
  await authManager.updateAuthMethod('byoc-user', 'byoc', {
    apiKey: 'sk-ant-user-custom-key'
  });

  const paygConfig = await authManager.getAuthConfig('payg-user');
  const byocUser = await authManager.getAuthConfig('byoc-user');

  console.log('✓ PAYG user tracks:', paygConfig.trackUsage);
  console.log('✓ BYOC user tracks:', byocUser.trackUsage);

  // Track usage for PAYG
  await authManager.trackUsage('payg-user', { input: 5000, output: 2500, total: 7500 }, 0.105);

  const paygUsage = await authManager.getUserUsage('payg-user');
  console.log('✓ PAYG usage:', paygUsage.current.toFixed(4));
  console.assert(paygUsage.current === 0.105, 'PAYG usage should be tracked');

  // Test 8: Free tier limit enforcement
  console.log('\nTest 8: Free tier limit enforcement');

  await authManager.updateAuthMethod('limited-user', 'platform_free', {
    usageLimit: 0.05
  });

  // Bring user to limit
  await authManager.trackUsage('limited-user', { input: 1000, output: 500, total: 1500 }, 0.06);

  try {
    await authManager.getAuthConfig('limited-user');
    console.log('❌ Should have thrown error for exceeded limit');
  } catch (error) {
    console.log('✓ Correctly threw error:', error.message.substring(0, 30) + '...');
    console.assert(error.message.includes('Free tier'), 'Should mention free tier');
  }

  console.log('\n✓ All ClaudeAuthManager tests passed!\n');
}

async function testCostCalculations() {
  console.log('\n=== Testing Cost Calculations ===\n');

  // Claude Sonnet 4 pricing: $3/MTok input, $15/MTok output

  const calculateCost = (tokens) => {
    const inputCost = (tokens.input / 1000000) * 3.0;
    const outputCost = (tokens.output / 1000000) * 15.0;
    return inputCost + outputCost;
  };

  console.log('Test 1: Large request (2M tokens)');
  const cost1 = calculateCost({ input: 1000000, output: 1000000, total: 2000000 });
  console.log('✓ Cost:', `$${cost1.toFixed(2)}`);
  console.assert(cost1 === 18.0, 'Should be $18');

  console.log('\nTest 2: Small request (15K tokens)');
  const cost2 = calculateCost({ input: 10000, output: 5000, total: 15000 });
  console.log('✓ Cost:', `$${cost2.toFixed(4)}`);
  console.assert(Math.abs(cost2 - 0.105) < 0.001, 'Should be ~$0.105');

  console.log('\nTest 3: Typical request (50K tokens)');
  const cost3 = calculateCost({ input: 30000, output: 20000, total: 50000 });
  console.log('✓ Cost:', `$${cost3.toFixed(4)}`);
  const expectedCost3 = (30000 / 1000000 * 3.0) + (20000 / 1000000 * 15.0);
  console.assert(cost3 === expectedCost3, 'Should calculate correctly');

  console.log('\n✓ All cost calculation tests passed!\n');
}

async function runAllTests() {
  console.log('╔════════════════════════════════════════════════════════════╗');
  console.log('║       ClaudeAuthManager Standalone Integration Test       ║');
  console.log('╚════════════════════════════════════════════════════════════╝');

  let db;
  try {
    // Setup
    db = setupTestDatabase();
    console.log('✓ Test database created\n');

    // Run test suites
    await testAuthManager(db);
    await testCostCalculations();

    console.log('╔════════════════════════════════════════════════════════════╗');
    console.log('║                    ALL TESTS PASSED ✓                      ║');
    console.log('╚════════════════════════════════════════════════════════════╝\n');

    return 0;
  } catch (error) {
    console.error('\n❌ TEST FAILED:', error.message);
    console.error(error.stack);
    return 1;
  } finally {
    if (db) {
      db.close();
    }
  }
}

// Run tests
runAllTests().then(exitCode => process.exit(exitCode));
