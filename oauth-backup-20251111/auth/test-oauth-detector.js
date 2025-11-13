#!/usr/bin/env node

/**
 * Test OAuth Token Detection
 * Tests the OAuthTokenExtractor against the real Claude CLI installation
 */

import {
  checkOAuthAvailability,
  getOAuthStatus,
  extractOAuthToken,
  getUserInfo
} from './OAuthTokenExtractor.js';

async function testOAuthDetection() {
  console.log('='.repeat(80));
  console.log('OAUTH TOKEN DETECTION TEST');
  console.log('='.repeat(80));
  console.log();

  // Test 1: Quick Status Check
  console.log('📋 Test 1: Quick OAuth Status Check');
  console.log('-'.repeat(80));
  const status = getOAuthStatus();
  console.log(JSON.stringify(status, null, 2));
  console.log();

  // Test 2: Full Availability Check
  console.log('🔍 Test 2: Full OAuth Availability Check');
  console.log('-'.repeat(80));
  const availability = await checkOAuthAvailability();
  console.log(JSON.stringify(availability, null, 2));
  console.log();

  // Test 3: Extract OAuth Token
  console.log('🔑 Test 3: Extract OAuth Token');
  console.log('-'.repeat(80));
  const token = await extractOAuthToken();
  if (token) {
    console.log('✅ OAuth token extracted successfully!');
    console.log({
      hasAccessToken: !!token.accessToken,
      hasRefreshToken: !!token.refreshToken,
      accessTokenLength: token.accessToken?.length || 0,
      subscriptionType: token.subscriptionType,
      scopes: token.scopes,
      expiresAt: token.expiresAt ? new Date(token.expiresAt).toISOString() : null,
      isValid: token.expiresAt ? Date.now() < token.expiresAt : false
    });
  } else {
    console.log('❌ No OAuth token available');
  }
  console.log();

  // Test 4: Get User Info
  console.log('👤 Test 4: Get User Info');
  console.log('-'.repeat(80));
  const userInfo = await getUserInfo();
  console.log(JSON.stringify(userInfo, null, 2));
  console.log();

  // Summary
  console.log('='.repeat(80));
  console.log('TEST SUMMARY');
  console.log('='.repeat(80));
  console.log(`✅ Claude CLI Installed: ${status.installed ? 'YES' : 'NO'}`);
  console.log(`✅ OAuth Available: ${availability.available ? 'YES' : 'NO'}`);
  console.log(`✅ Token Extracted: ${token ? 'YES' : 'NO'}`);
  console.log(`✅ User Info Retrieved: ${userInfo ? 'YES' : 'NO'}`);

  if (availability.available && token) {
    console.log();
    console.log('🎉 OAuth detection is working correctly!');
    console.log(`   Subscription: ${token.subscriptionType}`);
    console.log(`   Scopes: ${token.scopes.join(', ')}`);
  } else {
    console.log();
    console.log('⚠️  OAuth not fully available');
    console.log(`   Reason: ${availability.reason || 'Unknown'}`);
  }
  console.log('='.repeat(80));
}

// Run the test
testOAuthDetection().catch(error => {
  console.error('❌ Test failed:', error);
  process.exit(1);
});
