/**
 * Validation Tests for Protected Config Manager and Tampering Detector
 *
 * This script validates the security mechanisms implementation:
 * - ProtectedConfigManager functionality
 * - TamperingDetector monitoring
 * - Backup and restore operations
 * - Privilege checking
 * - Error handling
 *
 * Usage: npx tsx src/config/managers/validation-test.ts
 */

import fs from 'fs/promises';
import path from 'path';
import { ProtectedConfigManager, ProtectedConfig } from './protected-config-manager.js';
import { TamperingDetector } from './tampering-detector.js';
import { PrivilegeChecker } from '../utils/privilege-checker.js';
import {
  SecurityError,
  PermissionError,
  IntegrityError,
} from '../errors/security-errors.js';

// Test configuration
const TEST_AGENT = 'test-validation-agent';
const TEST_DIR = '/tmp/protected-config-test';
const AGENT_DIR = path.join(TEST_DIR, '.claude/agents');
const SYSTEM_DIR = path.join(AGENT_DIR, '.system');
const BACKUP_DIR = path.join(TEST_DIR, 'backups');

/**
 * Test results tracker
 */
class TestResults {
  passed = 0;
  failed = 0;
  errors: string[] = [];

  success(message: string) {
    this.passed++;
    console.log(`✅ PASS: ${message}`);
  }

  fail(message: string, error?: any) {
    this.failed++;
    const errorMsg = error ? `: ${error.message || error}` : '';
    console.error(`❌ FAIL: ${message}${errorMsg}`);
    this.errors.push(message);
  }

  summary() {
    console.log('\n' + '='.repeat(60));
    console.log('TEST SUMMARY');
    console.log('='.repeat(60));
    console.log(`Total Tests: ${this.passed + this.failed}`);
    console.log(`Passed: ${this.passed}`);
    console.log(`Failed: ${this.failed}`);

    if (this.failed > 0) {
      console.log('\nFailed Tests:');
      this.errors.forEach(err => console.log(`  - ${err}`));
    }

    return this.failed === 0;
  }
}

const results = new TestResults();

/**
 * Setup test environment
 */
async function setup() {
  console.log('Setting up test environment...');

  // Create directories
  await fs.mkdir(SYSTEM_DIR, { recursive: true });
  await fs.mkdir(BACKUP_DIR, { recursive: true });

  // Create test protected config
  const testConfig: ProtectedConfig = {
    version: '1.0.0',
    agent_id: TEST_AGENT,
    checksum: 'sha256:placeholder',
    permissions: {
      workspace: {
        root: '/test/workspace',
        max_storage: '100MB',
      },
      resource_limits: {
        max_memory: '256MB',
        max_cpu_percent: 50,
        max_execution_time: '300s',
        max_concurrent_tasks: 3,
      },
    },
  };

  // Write initial config
  const manager = new ProtectedConfigManager({
    agentDirectory: AGENT_DIR,
    backupDirectory: BACKUP_DIR,
    systemDirectory: SYSTEM_DIR,
  });

  // Set admin privileges for testing
  process.env.SYSTEM_ADMIN = 'true';

  const configWithChecksum = await manager.updateProtectedConfig(TEST_AGENT, testConfig);
  console.log(`Created test config: ${configWithChecksum.version}`);
}

/**
 * Cleanup test environment
 */
async function cleanup() {
  console.log('\nCleaning up test environment...');
  try {
    await fs.rm(TEST_DIR, { recursive: true, force: true });
  } catch (error) {
    console.warn(`Cleanup warning: ${(error as Error).message}`);
  }
}

/**
 * Test 1: ProtectedConfigManager - Update Config
 */
async function testUpdateConfig() {
  console.log('\n--- Test 1: Update Protected Config ---');

  try {
    const manager = new ProtectedConfigManager({
      agentDirectory: AGENT_DIR,
      backupDirectory: BACKUP_DIR,
      systemDirectory: SYSTEM_DIR,
    });

    const updates = {
      permissions: {
        resource_limits: {
          max_memory: '512MB',
          max_cpu_percent: 75,
          max_execution_time: '600s',
          max_concurrent_tasks: 5,
        },
      },
    };

    const updated = await manager.updateProtectedConfig(TEST_AGENT, updates);

    if (updated.version === '1.0.1') {
      results.success('Config version incremented correctly');
    } else {
      results.fail(`Expected version 1.0.1, got ${updated.version}`);
    }

    if (updated.checksum.startsWith('sha256:')) {
      results.success('Checksum computed and added');
    } else {
      results.fail('Checksum missing or invalid');
    }
  } catch (error) {
    results.fail('Update config failed', error);
  }
}

/**
 * Test 2: ProtectedConfigManager - Backup Creation
 */
async function testBackupCreation() {
  console.log('\n--- Test 2: Backup Creation ---');

  try {
    const manager = new ProtectedConfigManager({
      agentDirectory: AGENT_DIR,
      backupDirectory: BACKUP_DIR,
      systemDirectory: SYSTEM_DIR,
    });

    const history = await manager.getUpdateHistory(TEST_AGENT);

    if (history.length >= 1) {
      results.success(`Found ${history.length} backup(s)`);
    } else {
      results.fail('No backups found');
    }

    if (history[0].version) {
      results.success(`Backup has version: ${history[0].version}`);
    } else {
      results.fail('Backup missing version');
    }
  } catch (error) {
    results.fail('Backup creation test failed', error);
  }
}

/**
 * Test 3: ProtectedConfigManager - Rollback
 */
async function testRollback() {
  console.log('\n--- Test 3: Rollback to Previous Version ---');

  try {
    const manager = new ProtectedConfigManager({
      agentDirectory: AGENT_DIR,
      backupDirectory: BACKUP_DIR,
      systemDirectory: SYSTEM_DIR,
    });

    // Get current version
    const history = await manager.getUpdateHistory(TEST_AGENT);
    const currentVersion = history[0]?.version;

    // Rollback
    await manager.rollbackProtectedConfig(TEST_AGENT);

    results.success('Rollback executed without error');

    // Verify rollback
    const configPath = path.join(SYSTEM_DIR, `${TEST_AGENT}.protected.yaml`);
    const content = await fs.readFile(configPath, 'utf-8');

    if (content.length > 0) {
      results.success('Config file restored');
    } else {
      results.fail('Config file empty after rollback');
    }
  } catch (error) {
    results.fail('Rollback test failed', error);
  }
}

/**
 * Test 4: PrivilegeChecker - Admin Privileges
 */
async function testPrivileges() {
  console.log('\n--- Test 4: Privilege Checking ---');

  // Test with admin privileges
  process.env.SYSTEM_ADMIN = 'true';
  if (PrivilegeChecker.isSystemAdmin()) {
    results.success('System admin detected correctly');
  } else {
    results.fail('Failed to detect system admin');
  }

  // Test without admin privileges
  delete process.env.SYSTEM_ADMIN;
  delete process.env.ADMIN_TOKEN;
  if (!PrivilegeChecker.isSystemAdmin()) {
    results.success('Non-admin detected correctly');
  } else {
    results.fail('False positive on admin detection');
  }

  // Restore admin for remaining tests
  process.env.SYSTEM_ADMIN = 'true';
}

/**
 * Test 5: PermissionError on Unauthorized Update
 */
async function testUnauthorizedUpdate() {
  console.log('\n--- Test 5: Unauthorized Update Prevention ---');

  try {
    // Remove admin privileges
    delete process.env.SYSTEM_ADMIN;
    delete process.env.ADMIN_TOKEN;

    const manager = new ProtectedConfigManager({
      agentDirectory: AGENT_DIR,
      backupDirectory: BACKUP_DIR,
      systemDirectory: SYSTEM_DIR,
    });

    try {
      await manager.updateProtectedConfig(TEST_AGENT, {
        permissions: { test: 'unauthorized' },
      });

      results.fail('Unauthorized update should have thrown PermissionError');
    } catch (error) {
      if (error instanceof PermissionError) {
        results.success('PermissionError thrown for unauthorized update');
      } else {
        results.fail('Wrong error type thrown', error);
      }
    }
  } catch (error) {
    results.fail('Unauthorized update test failed', error);
  } finally {
    // Restore admin
    process.env.SYSTEM_ADMIN = 'true';
  }
}

/**
 * Test 6: TamperingDetector - File Watching
 */
async function testTamperingDetection() {
  console.log('\n--- Test 6: Tampering Detection ---');

  try {
    const detector = new TamperingDetector({
      systemDirectory: SYSTEM_DIR,
      logDirectory: path.join(TEST_DIR, 'logs'),
      autoRestore: false, // Don't auto-restore for testing
    });

    detector.startWatching();

    if (detector.isActive()) {
      results.success('File watcher started successfully');
    } else {
      results.fail('File watcher failed to start');
    }

    const status = detector.getStatus();
    if (status.monitoring && status.directory === SYSTEM_DIR) {
      results.success('File watcher monitoring correct directory');
    } else {
      results.fail('File watcher status incorrect');
    }

    detector.stopWatching();

    if (!detector.isActive()) {
      results.success('File watcher stopped successfully');
    } else {
      results.fail('File watcher failed to stop');
    }
  } catch (error) {
    results.fail('Tampering detection test failed', error);
  }
}

/**
 * Test 7: Atomic Write Operation
 */
async function testAtomicWrite() {
  console.log('\n--- Test 7: Atomic Write Operation ---');

  try {
    const manager = new ProtectedConfigManager({
      agentDirectory: AGENT_DIR,
      backupDirectory: BACKUP_DIR,
      systemDirectory: SYSTEM_DIR,
    });

    const configPath = path.join(SYSTEM_DIR, `${TEST_AGENT}.protected.yaml`);

    // Record initial modification time
    const statsBefore = await fs.stat(configPath);

    // Perform update
    await manager.updateProtectedConfig(TEST_AGENT, {
      permissions: { atomic_test: true },
    });

    // Check file was updated
    const statsAfter = await fs.stat(configPath);

    if (statsAfter.mtime > statsBefore.mtime) {
      results.success('File modification detected');
    } else {
      results.fail('File not modified');
    }

    // Verify no temp files left behind
    const files = await fs.readdir(SYSTEM_DIR);
    const tempFiles = files.filter(f => f.includes('.tmp'));

    if (tempFiles.length === 0) {
      results.success('No temporary files left behind');
    } else {
      results.fail(`Found ${tempFiles.length} temporary file(s)`);
    }
  } catch (error) {
    results.fail('Atomic write test failed', error);
  }
}

/**
 * Main test runner
 */
async function runTests() {
  console.log('=' .repeat(60));
  console.log('PROTECTED CONFIG MANAGER & TAMPERING DETECTOR VALIDATION');
  console.log('='.repeat(60));

  try {
    await setup();

    await testUpdateConfig();
    await testBackupCreation();
    await testRollback();
    await testPrivileges();
    await testUnauthorizedUpdate();
    await testTamperingDetection();
    await testAtomicWrite();

    const success = results.summary();

    await cleanup();

    console.log('\n' + '='.repeat(60));
    if (success) {
      console.log('✅ ALL TESTS PASSED');
    } else {
      console.log('❌ SOME TESTS FAILED');
    }
    console.log('='.repeat(60));

    process.exit(success ? 0 : 1);
  } catch (error) {
    console.error('\n❌ Test execution failed:', error);
    await cleanup();
    process.exit(1);
  }
}

// Run tests
runTests();
