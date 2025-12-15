#!/usr/bin/env node

/**
 * Manual test runner for ApiKeyEncryption
 * Tests implementation without Jest to isolate issues
 */

process.env.API_KEY_ENCRYPTION_SECRET = 'test-encryption-secret-key-32-chars-long-minimum-required';

// Clear require cache to ensure fresh load
delete require.cache[require.resolve('../api-server/services/auth/ApiKeyEncryption.cjs')];

const { encryptApiKey, decryptApiKey, isValidApiKey, getEncryptionAlgorithm } = require('../api-server/services/auth/ApiKeyEncryption.cjs');

console.log('🧪 Running ApiKeyEncryption Tests\n');
console.log('=' + '='.repeat(79));

let passed = 0;
let failed = 0;

function test(name, fn) {
  try {
    fn();
    console.log(`✅ PASS: ${name}`);
    passed++;
  } catch (error) {
    console.log(`❌ FAIL: ${name}`);
    console.log(`   Error: ${error.message}`);
    failed++;
  }
}

function assert(condition, message) {
  if (!condition) {
    throw new Error(message || 'Assertion failed');
  }
}

// Run tests
test('getEncryptionAlgorithm returns aes-256-cbc', () => {
  assert(getEncryptionAlgorithm() === 'aes-256-cbc', 'Algorithm should be aes-256-cbc');
});

test('isValidApiKey accepts valid format', () => {
  const validKey = 'sk-ant-api03-' + 'A'.repeat(95);
  assert(isValidApiKey(validKey), 'Valid key should pass validation');
});

test('isValidApiKey rejects invalid format', () => {
  assert(!isValidApiKey('invalid-key'), 'Invalid key should fail validation');
  assert(!isValidApiKey('sk-ant-api03-'), 'Too short key should fail');
  assert(!isValidApiKey(null), 'Null should fail');
  assert(!isValidApiKey(''), 'Empty string should fail');
});

test('encrypt/decrypt roundtrip works', () => {
  const apiKey = 'sk-ant-api03-' + 'B'.repeat(95);
  const encrypted = encryptApiKey(apiKey);
  const decrypted = decryptApiKey(encrypted);
  assert(decrypted === apiKey, 'Decrypted key should match original');
});

test('encryption produces different results (random IV)', () => {
  const apiKey = 'sk-ant-api03-' + 'C'.repeat(95);
  const enc1 = encryptApiKey(apiKey);
  const enc2 = encryptApiKey(apiKey);
  assert(enc1 !== enc2, 'Same key should produce different encrypted values');
  assert(decryptApiKey(enc1) === apiKey, 'First encryption should decrypt correctly');
  assert(decryptApiKey(enc2) === apiKey, 'Second encryption should decrypt correctly');
});

test('encryption format is iv:encryptedData', () => {
  const apiKey = 'sk-ant-api03-' + 'D'.repeat(95);
  const encrypted = encryptApiKey(apiKey);
  assert(encrypted.match(/^[a-f0-9]+:[a-f0-9]+$/), 'Format should be hex:hex');
  const parts = encrypted.split(':');
  assert(parts.length === 2, 'Should have exactly 2 parts');
});

test('encryptApiKey throws on empty key', () => {
  let threw = false;
  try {
    encryptApiKey('');
  } catch (e) {
    threw = true;
    assert(e.message.includes('required'), 'Error message should mention required');
  }
  assert(threw, 'Should throw error for empty key');
});

test('encryptApiKey throws on null key', () => {
  let threw = false;
  try {
    encryptApiKey(null);
  } catch (e) {
    threw = true;
  }
  assert(threw, 'Should throw error for null key');
});

test('encryptApiKey throws when secret is missing', () => {
  const originalSecret = process.env.API_KEY_ENCRYPTION_SECRET;
  delete process.env.API_KEY_ENCRYPTION_SECRET;

  let threw = false;
  try {
    encryptApiKey('sk-ant-api03-' + 'E'.repeat(95));
  } catch (e) {
    threw = true;
    assert(e.message.includes('API_KEY_ENCRYPTION_SECRET'), 'Error should mention missing secret');
  }

  process.env.API_KEY_ENCRYPTION_SECRET = originalSecret;
  assert(threw, 'Should throw when secret is missing');
});

test('encryptApiKey throws when secret is too short', () => {
  const originalSecret = process.env.API_KEY_ENCRYPTION_SECRET;
  process.env.API_KEY_ENCRYPTION_SECRET = 'short';

  let threw = false;
  try {
    encryptApiKey('sk-ant-api03-' + 'F'.repeat(95));
  } catch (e) {
    threw = true;
    assert(e.message.includes('at least 32 characters'), 'Error should mention length requirement');
  }

  process.env.API_KEY_ENCRYPTION_SECRET = originalSecret;
  assert(threw, 'Should throw when secret is too short');
});

test('decryptApiKey throws on invalid format', () => {
  let threw = false;
  try {
    decryptApiKey('invalid-format');
  } catch (e) {
    threw = true;
  }
  assert(threw, 'Should throw for invalid format');
});

test('decryptApiKey throws on single-part string', () => {
  let threw = false;
  try {
    decryptApiKey('onlyonepart');
  } catch (e) {
    threw = true;
  }
  assert(threw, 'Should throw for single-part string');
});

test('isValidApiKey validates exact length (108 chars)', () => {
  const exactLength = 'sk-ant-api03-' + 'A'.repeat(95); // 13 + 95 = 108
  const tooShort = 'sk-ant-api03-' + 'A'.repeat(94);    // 107
  const tooLong = 'sk-ant-api03-' + 'A'.repeat(96);     // 109

  assert(isValidApiKey(exactLength), 'Exact length should pass');
  assert(!isValidApiKey(tooShort), 'Too short should fail');
  assert(!isValidApiKey(tooLong), 'Too long should fail');
});

console.log('\n' + '='.repeat(80));
console.log(`📊 Results: ${passed} passed, ${failed} failed`);
console.log('='.repeat(80));

if (failed > 0) {
  console.log('\n❌ Some tests failed');
  process.exit(1);
} else {
  console.log('\n✅ All tests passed!');
  process.exit(0);
}
