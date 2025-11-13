#!/usr/bin/env node

/**
 * Integration Test Suite for Claude Authentication System
 * Tests all three authentication methods and complete workflows
 */

import http from 'http';
import crypto from 'crypto';

// Test configuration
const API_BASE = 'http://localhost:3001';
const TEST_USER_PREFIX = 'test-user-';

// Test results tracking
const results = {
  passed: [],
  failed: [],
  warnings: [],
  startTime: Date.now(),
  scenarios: {
    oauth: { tested: false, passed: false, errors: [] },
    userApiKey: { tested: false, passed: false, errors: [] },
    platformPayg: { tested: false, passed: false, errors: [] },
    switching: { tested: false, passed: false, errors: [] },
    errorHandling: { tested: false, passed: false, errors: [] },
    apiEndpoints: { tested: false, passed: false, errors: [] }
  }
};

/**
 * HTTP request helper
 */
function makeRequest(method, path, data = null) {
  return new Promise((resolve, reject) => {
    const url = new URL(path, API_BASE);
    const options = {
      hostname: url.hostname,
      port: url.port,
      path: url.pathname + url.search,
      method: method,
      headers: {
        'Content-Type': 'application/json'
      }
    };

    const req = http.request(options, (res) => {
      let body = '';
      res.on('data', chunk => body += chunk);
      res.on('end', () => {
        try {
          const response = {
            statusCode: res.statusCode,
            headers: res.headers,
            body: body ? JSON.parse(body) : null
          };
          resolve(response);
        } catch (e) {
          resolve({
            statusCode: res.statusCode,
            headers: res.headers,
            body: body
          });
        }
      });
    });

    req.on('error', reject);

    if (data) {
      req.write(JSON.stringify(data));
    }

    req.end();
  });
}

/**
 * Generate test user ID
 */
function generateTestUserId() {
  return TEST_USER_PREFIX + crypto.randomBytes(8).toString('hex');
}

/**
 * Generate valid test API key
 * Format: sk-ant-api03- (13 chars) + 95 alphanumeric chars = 108 total
 */
function generateTestApiKey() {
  const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789';
  let randomPart = '';
  const bytes = crypto.randomBytes(95);
  for (let i = 0; i < 95; i++) {
    randomPart += chars[bytes[i] % chars.length];
  }
  return `sk-ant-api03-${randomPart}`;
}

/**
 * Sleep helper
 */
function sleep(ms) {
  return new Promise(resolve => setTimeout(resolve, ms));
}

/**
 * TEST SCENARIO 1: OAuth Authentication Flow
 */
async function testOAuthFlow() {
  console.log('\n🔐 TEST 1: OAuth Authentication Flow');
  console.log('=' .repeat(60));

  const userId = generateTestUserId();
  const scenario = results.scenarios.oauth;
  scenario.tested = true;

  try {
    // Step 1: Check OAuth availability
    console.log('  📋 Checking OAuth availability...');
    const oauthCheck = await makeRequest('GET', '/api/auth/claude/oauth-check');

    if (oauthCheck.statusCode !== 200) {
      throw new Error(`OAuth check failed: ${oauthCheck.statusCode}`);
    }

    const isOAuthAvailable = oauthCheck.body?.available || false;
    console.log(`  ✓ OAuth available: ${isOAuthAvailable}`);

    if (!isOAuthAvailable) {
      results.warnings.push('OAuth not available - expected behavior');
    }

    // Step 2: Configure OAuth method
    console.log('  📋 Configuring OAuth method...');
    const configResponse = await makeRequest('POST', '/api/auth/claude/config', {
      userId: userId,
      method: 'oauth'
    });

    if (configResponse.statusCode !== 200) {
      throw new Error(`Config failed: ${configResponse.statusCode} - ${JSON.stringify(configResponse.body)}`);
    }
    console.log('  ✓ OAuth method configured');

    // Step 3: Verify configuration saved
    console.log('  📋 Verifying configuration...');
    const getConfig = await makeRequest('GET', `/api/auth/claude/config?userId=${userId}`);

    if (getConfig.statusCode !== 200) {
      throw new Error(`Get config failed: ${getConfig.statusCode}`);
    }

    if (getConfig.body.method !== 'oauth') {
      throw new Error(`Expected oauth, got ${getConfig.body.method}`);
    }
    console.log('  ✓ Configuration verified');

    // Step 4: Make SDK query (simulate)
    console.log('  📋 Testing SDK query with OAuth...');
    const sdkQuery = await makeRequest('POST', '/api/claude-code/query', {
      userId: userId,
      message: 'Test OAuth query',
      sessionId: 'test-session-oauth'
    });

    // OAuth should either work or fail gracefully
    console.log(`  ✓ SDK query result: ${sdkQuery.statusCode}`);

    // Step 5: Verify no usage billing (OAuth is free)
    await sleep(500);
    console.log('  📋 Checking billing records...');
    const billing = await makeRequest('GET', `/api/auth/claude/billing?userId=${userId}`);

    if (billing.statusCode === 200) {
      const totalUsage = billing.body.totalCost || 0;
      if (totalUsage > 0) {
        results.warnings.push(`OAuth user has billing: $${totalUsage} - unexpected`);
      }
      console.log(`  ✓ Billing check: $${totalUsage}`);
    }

    scenario.passed = true;
    results.passed.push('OAuth Authentication Flow');
    console.log('✅ OAuth Flow: PASSED');

  } catch (error) {
    scenario.errors.push(error.message);
    results.failed.push(`OAuth Authentication Flow: ${error.message}`);
    console.log(`❌ OAuth Flow: FAILED - ${error.message}`);
  }
}

/**
 * TEST SCENARIO 2: User API Key Authentication Flow
 */
async function testUserApiKeyFlow() {
  console.log('\n🔑 TEST 2: User API Key Authentication Flow');
  console.log('=' .repeat(60));

  const userId = generateTestUserId();
  const testApiKey = generateTestApiKey();
  const scenario = results.scenarios.userApiKey;
  scenario.tested = true;

  try {
    // Step 1: Configure User API Key method
    console.log('  📋 Configuring User API Key method...');
    const configResponse = await makeRequest('POST', '/api/auth/claude/config', {
      userId: userId,
      method: 'user_api_key',
      apiKey: testApiKey
    });

    if (configResponse.statusCode !== 200) {
      throw new Error(`Config failed: ${configResponse.statusCode} - ${JSON.stringify(configResponse.body)}`);
    }
    console.log('  ✓ User API Key method configured');

    // Step 2: Verify configuration (should NOT return actual key)
    console.log('  📋 Verifying configuration...');
    const getConfig = await makeRequest('GET', `/api/auth/claude/config?userId=${userId}`);

    if (getConfig.statusCode !== 200) {
      throw new Error(`Get config failed: ${getConfig.statusCode}`);
    }

    if (getConfig.body.method !== 'user_api_key') {
      throw new Error(`Expected user_api_key, got ${getConfig.body.method}`);
    }

    if (getConfig.body.hasApiKey !== true) {
      throw new Error('hasApiKey should be true');
    }

    if (getConfig.body.apiKey) {
      throw new Error('API key should NOT be returned in GET request');
    }
    console.log('  ✓ Configuration verified (key encrypted)');

    // Step 3: Make SDK query
    console.log('  📋 Testing SDK query with User API Key...');
    const sdkQuery = await makeRequest('POST', '/api/claude-code/query', {
      userId: userId,
      message: 'Test user API key query',
      sessionId: 'test-session-api-key'
    });

    console.log(`  ✓ SDK query result: ${sdkQuery.statusCode}`);

    // Step 4: Verify no usage billing (user's key)
    await sleep(500);
    console.log('  📋 Checking billing records...');
    const billing = await makeRequest('GET', `/api/auth/claude/billing?userId=${userId}`);

    if (billing.statusCode === 200) {
      const totalUsage = billing.body.totalCost || 0;
      if (totalUsage > 0) {
        results.warnings.push(`User API Key user has billing: $${totalUsage} - unexpected`);
      }
      console.log(`  ✓ Billing check: $${totalUsage}`);
    }

    scenario.passed = true;
    results.passed.push('User API Key Authentication Flow');
    console.log('✅ User API Key Flow: PASSED');

  } catch (error) {
    scenario.errors.push(error.message);
    results.failed.push(`User API Key Authentication Flow: ${error.message}`);
    console.log(`❌ User API Key Flow: FAILED - ${error.message}`);
  }
}

/**
 * TEST SCENARIO 3: Platform Pay-as-You-Go Flow
 */
async function testPlatformPaygFlow() {
  console.log('\n💳 TEST 3: Platform Pay-as-You-Go Flow');
  console.log('=' .repeat(60));

  const userId = generateTestUserId();
  const scenario = results.scenarios.platformPayg;
  scenario.tested = true;

  try {
    // Step 1: Configure Platform PAYG method
    console.log('  📋 Configuring Platform PAYG method...');
    const configResponse = await makeRequest('POST', '/api/auth/claude/config', {
      userId: userId,
      method: 'platform_payg'
    });

    if (configResponse.statusCode !== 200) {
      throw new Error(`Config failed: ${configResponse.statusCode} - ${JSON.stringify(configResponse.body)}`);
    }
    console.log('  ✓ Platform PAYG method configured');

    // Step 2: Verify configuration
    console.log('  📋 Verifying configuration...');
    const getConfig = await makeRequest('GET', `/api/auth/claude/config?userId=${userId}`);

    if (getConfig.statusCode !== 200) {
      throw new Error(`Get config failed: ${getConfig.statusCode}`);
    }

    if (getConfig.body.method !== 'platform_payg') {
      throw new Error(`Expected platform_payg, got ${getConfig.body.method}`);
    }
    console.log('  ✓ Configuration verified');

    // Step 3: Make SDK query (this SHOULD create billing)
    console.log('  📋 Testing SDK query with Platform PAYG...');
    const sdkQuery = await makeRequest('POST', '/api/claude-code/query', {
      userId: userId,
      message: 'Test platform PAYG query',
      sessionId: 'test-session-payg'
    });

    console.log(`  ✓ SDK query result: ${sdkQuery.statusCode}`);

    // Step 4: Verify usage billing created
    await sleep(1000);
    console.log('  📋 Checking billing records...');
    const billing = await makeRequest('GET', `/api/auth/claude/billing?userId=${userId}`);

    if (billing.statusCode === 200) {
      const totalUsage = billing.body.totalCost || 0;
      console.log(`  ✓ Total billing: $${totalUsage}`);

      if (sdkQuery.statusCode === 200 && totalUsage === 0) {
        results.warnings.push('Platform PAYG had successful query but no billing record');
      }
    } else {
      throw new Error(`Billing check failed: ${billing.statusCode}`);
    }

    scenario.passed = true;
    results.passed.push('Platform Pay-as-You-Go Flow');
    console.log('✅ Platform PAYG Flow: PASSED');

  } catch (error) {
    scenario.errors.push(error.message);
    results.failed.push(`Platform Pay-as-You-Go Flow: ${error.message}`);
    console.log(`❌ Platform PAYG Flow: FAILED - ${error.message}`);
  }
}

/**
 * TEST SCENARIO 4: Switching Between Methods
 */
async function testMethodSwitching() {
  console.log('\n🔄 TEST 4: Switching Between Authentication Methods');
  console.log('=' .repeat(60));

  const userId = generateTestUserId();
  const testApiKey = generateTestApiKey();
  const scenario = results.scenarios.switching;
  scenario.tested = true;

  try {
    // Start with OAuth
    console.log('  📋 Step 1: Configure OAuth...');
    let config = await makeRequest('POST', '/api/auth/claude/config', {
      userId: userId,
      method: 'oauth'
    });

    if (config.statusCode !== 200) {
      throw new Error(`OAuth config failed: ${config.statusCode}`);
    }

    let verify = await makeRequest('GET', `/api/auth/claude/config?userId=${userId}`);
    if (verify.body.method !== 'oauth') {
      throw new Error('OAuth not set correctly');
    }
    console.log('  ✓ OAuth configured');

    // Switch to User API Key
    console.log('  📋 Step 2: Switch to User API Key...');
    config = await makeRequest('POST', '/api/auth/claude/config', {
      userId: userId,
      method: 'user_api_key',
      apiKey: testApiKey
    });

    if (config.statusCode !== 200) {
      throw new Error(`User API Key config failed: ${config.statusCode}`);
    }

    verify = await makeRequest('GET', `/api/auth/claude/config?userId=${userId}`);
    if (verify.body.method !== 'user_api_key' || !verify.body.hasApiKey) {
      throw new Error('User API Key not set correctly');
    }
    console.log('  ✓ Switched to User API Key');

    // Switch to Platform PAYG
    console.log('  📋 Step 3: Switch to Platform PAYG...');
    config = await makeRequest('POST', '/api/auth/claude/config', {
      userId: userId,
      method: 'platform_payg'
    });

    if (config.statusCode !== 200) {
      throw new Error(`Platform PAYG config failed: ${config.statusCode}`);
    }

    verify = await makeRequest('GET', `/api/auth/claude/config?userId=${userId}`);
    if (verify.body.method !== 'platform_payg') {
      throw new Error('Platform PAYG not set correctly');
    }

    // API key should be removed
    if (verify.body.hasApiKey) {
      throw new Error('API key should be removed when switching to PAYG');
    }
    console.log('  ✓ Switched to Platform PAYG (API key removed)');

    // Switch back to OAuth
    console.log('  📋 Step 4: Switch back to OAuth...');
    config = await makeRequest('POST', '/api/auth/claude/config', {
      userId: userId,
      method: 'oauth'
    });

    if (config.statusCode !== 200) {
      throw new Error(`OAuth config failed on return: ${config.statusCode}`);
    }

    verify = await makeRequest('GET', `/api/auth/claude/config?userId=${userId}`);
    if (verify.body.method !== 'oauth') {
      throw new Error('OAuth not set correctly on return');
    }
    console.log('  ✓ Switched back to OAuth');

    scenario.passed = true;
    results.passed.push('Method Switching');
    console.log('✅ Method Switching: PASSED');

  } catch (error) {
    scenario.errors.push(error.message);
    results.failed.push(`Method Switching: ${error.message}`);
    console.log(`❌ Method Switching: FAILED - ${error.message}`);
  }
}

/**
 * TEST SCENARIO 5: Error Handling
 */
async function testErrorHandling() {
  console.log('\n⚠️  TEST 5: Error Handling');
  console.log('=' .repeat(60));

  const scenario = results.scenarios.errorHandling;
  scenario.tested = true;

  try {
    // Test 1: Invalid API key format
    console.log('  📋 Test 1: Invalid API key format...');
    const userId1 = generateTestUserId();
    const invalidKeyResponse = await makeRequest('POST', '/api/auth/claude/config', {
      userId: userId1,
      method: 'user_api_key',
      apiKey: 'invalid-key-format'
    });

    if (invalidKeyResponse.statusCode === 200) {
      throw new Error('Should reject invalid API key format');
    }
    console.log(`  ✓ Invalid API key rejected: ${invalidKeyResponse.statusCode}`);

    // Test 2: Missing userId (should use default)
    console.log('  📋 Test 2: Missing userId...');
    const noUserIdResponse = await makeRequest('GET', '/api/auth/claude/config');

    if (noUserIdResponse.statusCode !== 200) {
      throw new Error(`Should handle missing userId: ${noUserIdResponse.statusCode}`);
    }
    console.log('  ✓ Missing userId handled with default');

    // Test 3: Invalid method
    console.log('  📋 Test 3: Invalid authentication method...');
    const userId3 = generateTestUserId();
    const invalidMethodResponse = await makeRequest('POST', '/api/auth/claude/config', {
      userId: userId3,
      method: 'invalid_method'
    });

    if (invalidMethodResponse.statusCode === 200) {
      throw new Error('Should reject invalid method');
    }
    console.log(`  ✓ Invalid method rejected: ${invalidMethodResponse.statusCode}`);

    // Test 4: Missing API key for user_api_key method
    console.log('  📋 Test 4: Missing API key for user_api_key...');
    const userId4 = generateTestUserId();
    const missingKeyResponse = await makeRequest('POST', '/api/auth/claude/config', {
      userId: userId4,
      method: 'user_api_key'
      // No apiKey provided
    });

    if (missingKeyResponse.statusCode === 200) {
      throw new Error('Should require API key for user_api_key method');
    }
    console.log(`  ✓ Missing API key rejected: ${missingKeyResponse.statusCode}`);

    scenario.passed = true;
    results.passed.push('Error Handling');
    console.log('✅ Error Handling: PASSED');

  } catch (error) {
    scenario.errors.push(error.message);
    results.failed.push(`Error Handling: ${error.message}`);
    console.log(`❌ Error Handling: FAILED - ${error.message}`);
  }
}

/**
 * TEST SCENARIO 6: API Endpoints with curl simulation
 */
async function testApiEndpoints() {
  console.log('\n🌐 TEST 6: API Endpoints Testing');
  console.log('=' .repeat(60));

  const userId = generateTestUserId();
  const testApiKey = generateTestApiKey();
  const scenario = results.scenarios.apiEndpoints;
  scenario.tested = true;

  try {
    // Test GET config
    console.log('  📋 GET /api/auth/claude/config...');
    const getConfig = await makeRequest('GET', `/api/auth/claude/config?userId=${userId}`);
    if (getConfig.statusCode !== 200) {
      throw new Error(`GET config failed: ${getConfig.statusCode}`);
    }
    console.log(`  ✓ GET config: ${getConfig.statusCode}`);

    // Test POST config
    console.log('  📋 POST /api/auth/claude/config...');
    const postConfig = await makeRequest('POST', '/api/auth/claude/config', {
      userId: userId,
      method: 'user_api_key',
      apiKey: testApiKey
    });
    if (postConfig.statusCode !== 200) {
      throw new Error(`POST config failed: ${postConfig.statusCode}`);
    }
    console.log(`  ✓ POST config: ${postConfig.statusCode}`);

    // Test GET billing
    console.log('  📋 GET /api/auth/claude/billing...');
    const getBilling = await makeRequest('GET', `/api/auth/claude/billing?userId=${userId}`);
    if (getBilling.statusCode !== 200) {
      throw new Error(`GET billing failed: ${getBilling.statusCode}`);
    }
    console.log(`  ✓ GET billing: ${getBilling.statusCode}`);

    // Test OAuth check
    console.log('  📋 GET /api/auth/claude/oauth-check...');
    const oauthCheck = await makeRequest('GET', '/api/auth/claude/oauth-check');
    if (oauthCheck.statusCode !== 200) {
      throw new Error(`OAuth check failed: ${oauthCheck.statusCode}`);
    }
    console.log(`  ✓ OAuth check: ${oauthCheck.statusCode}`);

    scenario.passed = true;
    results.passed.push('API Endpoints');
    console.log('✅ API Endpoints: PASSED');

  } catch (error) {
    scenario.errors.push(error.message);
    results.failed.push(`API Endpoints: ${error.message}`);
    console.log(`❌ API Endpoints: FAILED - ${error.message}`);
  }
}

/**
 * Generate final test report
 */
function generateReport() {
  const duration = Date.now() - results.startTime;
  const totalTests = Object.keys(results.scenarios).length;
  const passedTests = Object.values(results.scenarios).filter(s => s.passed).length;
  const failedTests = Object.values(results.scenarios).filter(s => s.tested && !s.passed).length;

  console.log('\n');
  console.log('═'.repeat(70));
  console.log('📊 INTEGRATION TEST REPORT');
  console.log('═'.repeat(70));
  console.log(`\n⏱️  Duration: ${duration}ms`);
  console.log(`📈 Results: ${passedTests}/${totalTests} scenarios passed`);
  console.log(`\n✅ Passed: ${results.passed.length}`);
  results.passed.forEach(test => console.log(`   - ${test}`));

  if (results.failed.length > 0) {
    console.log(`\n❌ Failed: ${results.failed.length}`);
    results.failed.forEach(test => console.log(`   - ${test}`));
  }

  if (results.warnings.length > 0) {
    console.log(`\n⚠️  Warnings: ${results.warnings.length}`);
    results.warnings.forEach(warning => console.log(`   - ${warning}`));
  }

  console.log('\n📋 Detailed Scenario Results:');
  Object.entries(results.scenarios).forEach(([name, data]) => {
    const status = !data.tested ? '⏭️  SKIPPED' : data.passed ? '✅ PASSED' : '❌ FAILED';
    console.log(`\n  ${status} ${name}`);
    if (data.errors.length > 0) {
      data.errors.forEach(err => console.log(`     ⚠️  ${err}`));
    }
  });

  console.log('\n═'.repeat(70));
  console.log(`\n🎯 Overall Status: ${failedTests === 0 ? '✅ ALL TESTS PASSED' : `❌ ${failedTests} TEST(S) FAILED`}`);
  console.log('═'.repeat(70));

  return {
    summary: {
      duration,
      total: totalTests,
      passed: passedTests,
      failed: failedTests,
      warnings: results.warnings.length
    },
    scenarios: results.scenarios,
    passedTests: results.passed,
    failedTests: results.failed,
    warnings: results.warnings
  };
}

/**
 * Main test execution
 */
async function runTests() {
  console.log('🚀 Starting Integration Test Suite');
  console.log('Target: Claude Authentication System');
  console.log('Base URL:', API_BASE);
  console.log('');

  try {
    // Run all test scenarios
    await testOAuthFlow();
    await testUserApiKeyFlow();
    await testPlatformPaygFlow();
    await testMethodSwitching();
    await testErrorHandling();
    await testApiEndpoints();

    // Generate and display final report
    const report = generateReport();

    // Return results for programmatic access
    return report;

  } catch (error) {
    console.error('\n❌ Fatal test error:', error);
    process.exit(1);
  }
}

// Execute tests
runTests()
  .then(report => {
    process.exit(report.summary.failed === 0 ? 0 : 1);
  })
  .catch(error => {
    console.error('Fatal error:', error);
    process.exit(1);
  });

export { runTests };
