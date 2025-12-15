#!/usr/bin/env node

/**
 * Simple TDD Test Runner
 * Runs TDD tests with minimal Jest configuration
 */

import { execSync } from 'child_process';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const rootDir = path.join(__dirname, '..');

// Set environment variables for tests
process.env.API_KEY_ENCRYPTION_SECRET = '0123456789abcdef0123456789abcdef0123456789abcdef0123456789abcdef';
process.env.CLAUDE_PLATFORM_KEY = 'sk-ant-api03-platform-AAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAA';

// Test files to run
const testFiles = [
  'api-server/tests/unit/services/auth/ApiKeyEncryption.test.js',
  'api-server/tests/unit/services/auth/ClaudeAuthManager.test.js',
  'api-server/tests/integration/api/claude-auth.test.js',
  'src/services/__tests__/ClaudeAuthManager.test.js',
  'src/services/__tests__/ClaudeCodeSDKManager.auth.test.js'
];

console.log('🧪 Running TDD Test Suite\n');
console.log('=' .repeat(80));

const results = {
  total: 0,
  passed: 0,
  failed: 0,
  skipped: 0,
  errors: []
};

for (const testFile of testFiles) {
  const fullPath = path.join(rootDir, testFile);
  console.log(`\n📝 Running: ${testFile}`);
  console.log('-'.repeat(80));

  try {
    // Run Jest on individual file with minimal config
    const output = execSync(
      `npx jest "${fullPath}" --testEnvironment=node --verbose --no-coverage --forceExit`,
      {
        cwd: rootDir,
        encoding: 'utf8',
        stdio: 'pipe',
        env: {
          ...process.env,
          NODE_ENV: 'test'
        }
      }
    );

    console.log(output);
    results.passed++;
    console.log('✅ PASSED\n');
  } catch (error) {
    results.failed++;
    console.log('❌ FAILED\n');
    console.log(error.stdout || error.message);
    results.errors.push({
      file: testFile,
      error: error.stderr || error.stdout || error.message
    });
  }

  results.total++;
}

console.log('\n' + '='.repeat(80));
console.log('📊 Test Summary');
console.log('='.repeat(80));
console.log(`Total Test Files: ${results.total}`);
console.log(`✅ Passed: ${results.passed}`);
console.log(`❌ Failed: ${results.failed}`);
console.log(`⏭️  Skipped: ${results.skipped}`);

if (results.failed > 0) {
  console.log('\n❌ FAILURES:');
  console.log('='.repeat(80));
  results.errors.forEach(({ file, error }) => {
    console.log(`\n📁 ${file}`);
    console.log(error);
  });

  console.log('\n⚠️  Some tests failed. Review and fix implementation.');
  process.exit(1);
} else {
  console.log('\n🎉 All tests passed!');
  process.exit(0);
}
