#!/usr/bin/env node

/**
 * OAuth API Key Extraction Demo
 * Demonstrates the enhanced extractApiKeyFromCLI() function
 */

import { extractApiKeyFromCLI, checkOAuthAvailability } from '../../api-server/services/auth/OAuthTokenExtractor.js';

console.log('='.repeat(80));
console.log('OAuth Token Extractor - API Key Extraction Demo');
console.log('='.repeat(80));
console.log();

// Test 1: Check OAuth availability (should prefer OAuth tokens)
console.log('Test 1: checkOAuthAvailability() - Full check with fallback');
console.log('-'.repeat(80));
const oauthResult = await checkOAuthAvailability();
console.log('Result:');
console.log(JSON.stringify(oauthResult, null, 2));
console.log();

// Test 2: Direct API key extraction
console.log('Test 2: extractApiKeyFromCLI() - Direct API key extraction');
console.log('-'.repeat(80));
const apiKeyResult = await extractApiKeyFromCLI();
console.log('Result:');
console.log(JSON.stringify(apiKeyResult, null, 2));
console.log();

// Summary
console.log('='.repeat(80));
console.log('Summary:');
console.log('-'.repeat(80));
console.log('✓ checkOAuthAvailability() now calls extractApiKeyFromCLI() as fallback');
console.log('✓ extractApiKeyFromCLI() reads ~/.claude/config.json');
console.log('✓ API key format validated: /^sk-ant-api03-[A-Za-z0-9_-]{95}AA$/');
console.log('✓ Supports multiple field names: api_key, apiKey, API_KEY, key');
console.log('✓ Graceful error handling for missing/malformed configs');
console.log('='.repeat(80));
