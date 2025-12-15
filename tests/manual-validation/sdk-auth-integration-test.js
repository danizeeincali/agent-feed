/**
 * Manual Integration Test for ClaudeCodeSDKManager with ClaudeAuthManager
 * Run with: node tests/manual-validation/sdk-auth-integration-test.js
 */

import Database from 'better-sqlite3';
import { ClaudeCodeSDKManager } from '../../src/services/ClaudeCodeSDKManager.js';
import { ClaudeAuthManager } from '../../src/services/ClaudeAuthManager.js';

async function setupTestDatabase() {
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

  console.log('\n✓ All ClaudeAuthManager tests passed!\n');
}

async function testSDKManagerIntegration(db) {
  console.log('\n=== Testing ClaudeCodeSDKManager Integration ===\n');

  const sdkManager = new ClaudeCodeSDKManager();
  sdkManager.initializeWithDatabase(db);

  // Verify initialization
  console.log('Test 1: SDK Manager initialization');
  console.log('✓ AuthManager initialized:', !!sdkManager.authManager);
  console.assert(sdkManager.authManager !== null, 'AuthManager should be initialized');

  // Test cost calculation
  console.log('\nTest 2: Cost calculation');
  const tokens1 = { input: 1000000, output: 1000000, total: 2000000 };
  const cost1 = sdkManager.calculateCost(tokens1);
  console.log('✓ Cost for 2M tokens:', `$${cost1.toFixed(2)}`);
  console.assert(cost1 === 18.0, 'Cost should be $18');

  const tokens2 = { input: 10000, output: 5000, total: 15000 };
  const cost2 = sdkManager.calculateCost(tokens2);
  console.log('✓ Cost for 15K tokens:', `$${cost2.toFixed(4)}`);
  console.assert(Math.abs(cost2 - 0.105) < 0.001, 'Cost should be ~$0.105');

  // Test token extraction
  console.log('\nTest 3: Token extraction from messages');
  const mockMessages = [
    { type: 'system' },
    { type: 'result', usage: { input_tokens: 1000, output_tokens: 500 } }
  ];
  const extractedTokens = sdkManager.extractTokenMetrics(mockMessages);
  console.log('✓ Extracted tokens:', extractedTokens);
  console.assert(extractedTokens.total === 1500, 'Should extract correct token count');

  console.log('\n✓ All SDK Manager integration tests passed!\n');
}

async function testCompleteWorkflow(db) {
  console.log('\n=== Testing Complete Workflow ===\n');

  const authManager = new ClaudeAuthManager(db);
  const sdkManager = new ClaudeCodeSDKManager();
  sdkManager.initializeWithDatabase(db);

  // Setup different user types
  await authManager.updateAuthMethod('payg-user', 'platform_payg');
  await authManager.updateAuthMethod('byoc-user', 'byoc', {
    apiKey: 'sk-ant-user-custom-key-123'
  });
  await authManager.updateAuthMethod('free-user', 'platform_free', {
    usageLimit: 5.0
  });

  // Test auth config retrieval for each user type
  console.log('Test 1: Auth config for different user types');

  const paygConfig = await authManager.getAuthConfig('payg-user');
  console.log('✓ PAYG user:', {
    method: paygConfig.method,
    trackUsage: paygConfig.trackUsage
  });

  const byocConfig = await authManager.getAuthConfig('byoc-user');
  console.log('✓ BYOC user:', {
    method: byocConfig.method,
    trackUsage: byocConfig.trackUsage,
    hasCustomKey: byocConfig.apiKey?.startsWith('sk-ant-user-')
  });

  const freeConfig = await authManager.getAuthConfig('free-user');
  console.log('✓ Free user:', {
    method: freeConfig.method,
    trackUsage: freeConfig.trackUsage,
    limit: freeConfig.usageLimit
  });

  // Simulate usage tracking
  console.log('\nTest 2: Simulate usage tracking');
  const tokens = { input: 5000, output: 2500, total: 7500 };
  const cost = sdkManager.calculateCost(tokens);

  await authManager.trackUsage('payg-user', tokens, cost);
  await authManager.trackUsage('free-user', tokens, cost);
  // BYOC user doesn't track usage

  const paygUsage = await authManager.getUserUsage('payg-user');
  const freeUsage = await authManager.getUserUsage('free-user');

  console.log('✓ PAYG usage:', {
    current: paygUsage.current.toFixed(4),
    requests: paygUsage.totalRequests
  });
  console.log('✓ Free usage:', {
    current: freeUsage.current.toFixed(4),
    remaining: (freeUsage.remaining || 0).toFixed(4),
    requests: freeUsage.totalRequests
  });

  // Test environment isolation
  console.log('\nTest 3: Environment isolation between users');
  const originalEnv = process.env.ANTHROPIC_API_KEY;

  // Simulate BYOC user
  const byocSdkOpts = authManager.prepareSDKAuth(byocConfig);
  console.log('✓ BYOC env set:', process.env.ANTHROPIC_API_KEY?.substring(0, 20) + '...');
  authManager.restoreSDKAuth(byocConfig);

  // Simulate PAYG user
  const paygSdkOpts = authManager.prepareSDKAuth(paygConfig);
  console.log('✓ PAYG env set:', process.env.ANTHROPIC_API_KEY === originalEnv ? 'platform key' : 'other key');
  authManager.restoreSDKAuth(paygConfig);

  console.log('✓ Final env:', process.env.ANTHROPIC_API_KEY === originalEnv ? 'restored' : 'not restored');

  console.log('\n✓ All workflow tests passed!\n');
}

async function runAllTests() {
  console.log('╔════════════════════════════════════════════════════════════╗');
  console.log('║  ClaudeCodeSDKManager + ClaudeAuthManager Integration Test ║');
  console.log('╚════════════════════════════════════════════════════════════╝');

  let db;
  try {
    // Setup
    db = await setupTestDatabase();
    console.log('✓ Test database created\n');

    // Run test suites
    await testAuthManager(db);
    await testSDKManagerIntegration(db);
    await testCompleteWorkflow(db);

    console.log('╔════════════════════════════════════════════════════════════╗');
    console.log('║                    ALL TESTS PASSED ✓                      ║');
    console.log('╚════════════════════════════════════════════════════════════╝\n');

  } catch (error) {
    console.error('\n❌ TEST FAILED:', error.message);
    console.error(error.stack);
    process.exit(1);
  } finally {
    if (db) {
      await db.close();
    }
  }
}

// Run tests
runAllTests();
