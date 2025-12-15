/**
 * TDD Test Suite: OAuth Authorization Flow
 *
 * Tests OAuth redirect flow, callback handling, and token storage.
 * These tests are written FIRST (TDD) and will initially FAIL.
 *
 * Coverage:
 * - OAuth authorization redirect
 * - OAuth callback with authorization code
 * - OAuth error handling
 * - Token storage in database
 * - Billing summary for new users
 */

const request = require('supertest');
const express = require('express');
const Database = require('better-sqlite3');
const crypto = require('crypto');

// Test configuration
const TEST_USER_ID = 'oauth-test-user-' + Date.now();
const MOCK_AUTH_CODE = 'mock_auth_code_' + crypto.randomBytes(16).toString('hex');
const MOCK_ACCESS_TOKEN = 'mock_access_token_' + crypto.randomBytes(32).toString('hex');
const MOCK_REFRESH_TOKEN = 'mock_refresh_token_' + crypto.randomBytes(32).toString('hex');

// Test results tracker
const testResults = {
  total: 0,
  passed: 0,
  failed: 0,
  errors: []
};

/**
 * Create test app with OAuth routes
 * Using in-memory database for isolation
 */
function createTestApp() {
  const app = express();
  app.use(express.json());
  app.use(express.urlencoded({ extended: true }));

  // Create in-memory SQLite database
  const db = new Database(':memory:');

  // Initialize database schema (simplified for testing)
  db.exec(`
    CREATE TABLE IF NOT EXISTS claude_auth_config (
      user_id TEXT PRIMARY KEY,
      auth_method TEXT NOT NULL DEFAULT 'platform_payg',
      encrypted_api_key TEXT,
      oauth_access_token TEXT,
      oauth_refresh_token TEXT,
      oauth_token_expires_at INTEGER,
      created_at INTEGER DEFAULT (strftime('%s', 'now')),
      updated_at INTEGER DEFAULT (strftime('%s', 'now'))
    );

    CREATE TABLE IF NOT EXISTS billing_usage (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      user_id TEXT NOT NULL,
      session_id TEXT,
      tokens_used INTEGER DEFAULT 0,
      estimated_cost REAL DEFAULT 0.0,
      timestamp INTEGER DEFAULT (strftime('%s', 'now'))
    );
  `);

  app.locals.db = db;

  // ===== OAUTH ROUTES TO BE IMPLEMENTED =====

  /**
   * GET /oauth/authorize
   * Redirects to Anthropic OAuth authorization endpoint
   */
  app.get('/oauth/authorize', (req, res) => {
    const userId = req.query.userId;

    if (!userId) {
      return res.status(400).json({ error: 'userId is required' });
    }

    // TODO: Implement OAuth redirect
    // This should redirect to: https://claude.ai/oauth/authorize
    // With parameters: client_id, redirect_uri, scope, state

    // PLACEHOLDER: Return 501 Not Implemented for TDD
    res.status(501).json({ error: 'OAuth authorization not yet implemented' });
  });

  /**
   * GET /oauth/callback
   * Handles OAuth callback from Anthropic
   */
  app.get('/oauth/callback', async (req, res) => {
    const { code, state, error, error_description } = req.query;

    // TODO: Implement OAuth callback handling
    // Should:
    // 1. Check for errors
    // 2. Exchange code for tokens
    // 3. Store tokens in database
    // 4. Redirect to settings page

    // PLACEHOLDER: Return 501 Not Implemented for TDD
    res.status(501).json({ error: 'OAuth callback not yet implemented' });
  });

  /**
   * POST /oauth/token/exchange
   * Exchange authorization code for access token (internal API for testing)
   */
  app.post('/oauth/token/exchange', async (req, res) => {
    const { code, userId } = req.body;

    if (!code || !userId) {
      return res.status(400).json({ error: 'code and userId are required' });
    }

    // TODO: Implement token exchange
    // Should call Anthropic API to exchange code for tokens

    // PLACEHOLDER: Return 501 Not Implemented for TDD
    res.status(501).json({ error: 'Token exchange not yet implemented' });
  });

  // ===== HELPER ROUTES FOR TESTING =====

  /**
   * GET /api/auth/claude/config
   * Get authentication configuration
   */
  app.get('/api/auth/claude/config', (req, res) => {
    const userId = req.query.userId || 'demo-user';

    const config = db.prepare(`
      SELECT auth_method, encrypted_api_key, oauth_access_token
      FROM claude_auth_config
      WHERE user_id = ?
    `).get(userId);

    if (!config) {
      return res.json({
        method: 'platform_payg',
        hasApiKey: false,
        hasOAuthToken: false
      });
    }

    res.json({
      method: config.auth_method,
      hasApiKey: !!config.encrypted_api_key,
      hasOAuthToken: !!config.oauth_access_token
    });
  });

  /**
   * POST /api/auth/claude/config
   * Set authentication method
   */
  app.post('/api/auth/claude/config', (req, res) => {
    const { userId, method, oauthAccessToken, oauthRefreshToken } = req.body;

    if (!userId || !method) {
      return res.status(400).json({ error: 'userId and method are required' });
    }

    const stmt = db.prepare(`
      INSERT INTO claude_auth_config (user_id, auth_method, oauth_access_token, oauth_refresh_token, updated_at)
      VALUES (?, ?, ?, ?, strftime('%s', 'now'))
      ON CONFLICT(user_id) DO UPDATE SET
        auth_method = excluded.auth_method,
        oauth_access_token = excluded.oauth_access_token,
        oauth_refresh_token = excluded.oauth_refresh_token,
        updated_at = excluded.updated_at
    `);

    stmt.run(userId, method, oauthAccessToken || null, oauthRefreshToken || null);

    res.json({
      success: true,
      method
    });
  });

  /**
   * GET /api/auth/claude/billing
   * Get billing summary
   */
  app.get('/api/auth/claude/billing', (req, res) => {
    const userId = req.query.userId || 'demo-user';

    const summary = db.prepare(`
      SELECT
        COUNT(*) as total_sessions,
        COALESCE(SUM(tokens_used), 0) as total_tokens,
        COALESCE(SUM(estimated_cost), 0.0) as total_cost
      FROM billing_usage
      WHERE user_id = ?
    `).get(userId);

    res.json({
      userId,
      totalSessions: summary.total_sessions,
      totalTokens: summary.total_tokens,
      totalCost: summary.total_cost
    });
  });

  return { app, db };
}

/**
 * Test runner helper
 */
async function runTest(name, testFn) {
  testResults.total++;
  try {
    await testFn();
    testResults.passed++;
    console.log(`✅ PASS: ${name}`);
    return true;
  } catch (error) {
    testResults.failed++;
    testResults.errors.push({ test: name, error: error.message });
    console.error(`❌ FAIL: ${name}`);
    console.error(`   Error: ${error.message}`);
    return false;
  }
}

/**
 * Assertion helpers
 */
function assertEqual(actual, expected, message) {
  if (actual !== expected) {
    throw new Error(message || `Expected ${expected}, got ${actual}`);
  }
}

function assertContains(string, substring, message) {
  if (!string || !string.includes(substring)) {
    throw new Error(message || `Expected string to contain "${substring}", got "${string}"`);
  }
}

function assertStatus(response, expectedStatus, message) {
  if (response.status !== expectedStatus) {
    throw new Error(message || `Expected status ${expectedStatus}, got ${response.status}`);
  }
}

// ===== TEST SUITE =====

async function runTestSuite() {
  console.log('\n📋 Running TDD OAuth Flow Test Suite...\n');
  console.log('⚠️  EXPECTED: Most tests should FAIL initially (TDD approach)\n');

  const { app, db } = createTestApp();

  // Test 1: OAuth authorize redirects to Anthropic
  await runTest('OAuth authorize redirects to Anthropic OAuth endpoint', async () => {
    const res = await request(app)
      .get('/oauth/authorize')
      .query({ userId: TEST_USER_ID });

    // TDD: We expect this to fail initially
    assertStatus(res, 302, 'Should return 302 redirect status');
    assertContains(res.headers.location, 'claude.ai/oauth/authorize', 'Should redirect to Anthropic OAuth');
  });

  // Test 2: OAuth authorize includes required parameters
  await runTest('OAuth authorize URL contains client_id, redirect_uri, scope, state', async () => {
    const res = await request(app)
      .get('/oauth/authorize')
      .query({ userId: TEST_USER_ID });

    assertStatus(res, 302);
    const location = res.headers.location;

    assertContains(location, 'client_id=', 'Should include client_id parameter');
    assertContains(location, 'redirect_uri=', 'Should include redirect_uri parameter');
    assertContains(location, 'scope=', 'Should include scope parameter');
    assertContains(location, 'state=', 'Should include state parameter');
  });

  // Test 3: OAuth callback with valid code exchanges for token
  await runTest('OAuth callback with valid code exchanges for access token', async () => {
    const res = await request(app)
      .get('/oauth/callback')
      .query({
        code: MOCK_AUTH_CODE,
        state: 'valid-state-token'
      });

    // Should redirect to settings page after success
    assertStatus(res, 302, 'Should redirect after successful token exchange');
    assertContains(res.headers.location, '/settings', 'Should redirect to settings page');
  });

  // Test 4: OAuth callback with error parameter redirects with error
  await runTest('OAuth callback with error parameter redirects to settings with error message', async () => {
    const res = await request(app)
      .get('/oauth/callback')
      .query({
        error: 'access_denied',
        error_description: 'User denied access'
      });

    assertStatus(res, 302);
    assertContains(res.headers.location, '/settings', 'Should redirect to settings');
    assertContains(res.headers.location, 'error=', 'Should include error parameter');
  });

  // Test 5: OAuth callback stores tokens in database
  await runTest('OAuth callback stores access and refresh tokens in database', async () => {
    // First, manually trigger token exchange
    const exchangeRes = await request(app)
      .post('/oauth/token/exchange')
      .send({
        code: MOCK_AUTH_CODE,
        userId: TEST_USER_ID
      });

    assertStatus(exchangeRes, 200, 'Token exchange should succeed');

    // Then verify tokens are stored
    const configRes = await request(app)
      .get('/api/auth/claude/config')
      .query({ userId: TEST_USER_ID });

    assertStatus(configRes, 200);
    assertEqual(configRes.body.method, 'oauth', 'Auth method should be oauth');
    assertEqual(configRes.body.hasOAuthToken, true, 'Should have OAuth token stored');
  });

  // Test 6: setAuthMethod saves oauth tokens correctly
  await runTest('setAuthMethod correctly saves OAuth tokens to database', async () => {
    const res = await request(app)
      .post('/api/auth/claude/config')
      .send({
        userId: TEST_USER_ID,
        method: 'oauth',
        oauthAccessToken: MOCK_ACCESS_TOKEN,
        oauthRefreshToken: MOCK_REFRESH_TOKEN
      });

    assertStatus(res, 200);
    assertEqual(res.body.success, true, 'Should return success');
    assertEqual(res.body.method, 'oauth', 'Should confirm oauth method');

    // Verify database storage
    const record = db.prepare(`
      SELECT oauth_access_token, oauth_refresh_token, auth_method
      FROM claude_auth_config
      WHERE user_id = ?
    `).get(TEST_USER_ID);

    assertEqual(record.auth_method, 'oauth', 'Database should store oauth method');
    assertEqual(record.oauth_access_token, MOCK_ACCESS_TOKEN, 'Database should store access token');
    assertEqual(record.oauth_refresh_token, MOCK_REFRESH_TOKEN, 'Database should store refresh token');
  });

  // Test 7: getBillingSummary returns zero for new users
  await runTest('getBillingSummary returns zero cost for new OAuth users', async () => {
    const newUserId = 'new-oauth-user-' + Date.now();

    // Set up OAuth for new user
    await request(app)
      .post('/api/auth/claude/config')
      .send({
        userId: newUserId,
        method: 'oauth',
        oauthAccessToken: MOCK_ACCESS_TOKEN
      });

    // Get billing summary
    const res = await request(app)
      .get('/api/auth/claude/billing')
      .query({ userId: newUserId });

    assertStatus(res, 200);
    assertEqual(res.body.totalCost, 0, 'New user should have zero cost');
    assertEqual(res.body.totalTokens, 0, 'New user should have zero tokens');
    assertEqual(res.body.totalSessions, 0, 'New user should have zero sessions');
  });

  // Test 8: OAuth authorize requires userId parameter
  await runTest('OAuth authorize returns 400 without userId parameter', async () => {
    const res = await request(app)
      .get('/oauth/authorize');

    assertStatus(res, 400, 'Should return 400 Bad Request');
    assertContains(res.body.error, 'userId', 'Error should mention userId');
  });

  // Test 9: OAuth callback validates state parameter
  await runTest('OAuth callback rejects invalid state parameter', async () => {
    const res = await request(app)
      .get('/oauth/callback')
      .query({
        code: MOCK_AUTH_CODE,
        state: 'invalid-state-that-does-not-match'
      });

    // Should redirect with error
    assertStatus(res, 302);
    assertContains(res.headers.location, 'error=', 'Should include error in redirect');
  });

  // Test 10: Token exchange returns proper error for invalid code
  await runTest('Token exchange returns error for invalid authorization code', async () => {
    const res = await request(app)
      .post('/oauth/token/exchange')
      .send({
        code: 'invalid-code-12345',
        userId: TEST_USER_ID
      });

    // Should return 400 or 401
    if (res.status !== 400 && res.status !== 401) {
      throw new Error(`Expected 400 or 401, got ${res.status}`);
    }
    assertContains(res.body.error, 'invalid', 'Error should mention invalid code');
  });

  // Cleanup
  db.close();

  // Print summary
  console.log('\n' + '='.repeat(60));
  console.log('📊 Test Summary:');
  console.log('='.repeat(60));
  console.log(`Total Tests:  ${testResults.total}`);
  console.log(`✅ Passed:    ${testResults.passed}`);
  console.log(`❌ Failed:    ${testResults.failed}`);
  console.log(`Success Rate: ${((testResults.passed / testResults.total) * 100).toFixed(1)}%`);

  if (testResults.failed > 0) {
    console.log('\n❌ Failed Tests:');
    testResults.errors.forEach((err, i) => {
      console.log(`${i + 1}. ${err.test}`);
      console.log(`   ${err.error}\n`);
    });
  }

  console.log('\n💡 TDD Approach: Write tests first, implement features after');
  console.log('📝 Next Steps:');
  console.log('   1. Implement OAuth routes in api-server/routes/auth/');
  console.log('   2. Add Anthropic OAuth integration');
  console.log('   3. Re-run tests until all pass\n');

  return testResults;
}

// Run tests if executed directly
if (require.main === module) {
  runTestSuite()
    .then(results => {
      process.exit(results.failed > 0 ? 1 : 0);
    })
    .catch(error => {
      console.error('Fatal error running tests:', error);
      process.exit(1);
    });
}

module.exports = { runTestSuite, createTestApp };
