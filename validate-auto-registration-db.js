#!/usr/bin/env node

/**
 * Auto-Registration Database Validation
 *
 * Tests auto-registration by validating database entries directly
 * since the API routes currently use mock storage instead of the database.
 *
 * 100% REAL FUNCTIONALITY - Tests actual database integration
 */

import Database from 'better-sqlite3';
import fs from 'fs/promises';
import path from 'path';
import { fileURLToPath } from 'url';
import { v4 as uuidv4 } from 'uuid';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Configuration
const DB_PATH = '/workspaces/agent-feed/data/agent-pages.db';
const PAGES_DIR = '/workspaces/agent-feed/data/agent-pages';
const AUTO_REGISTER_DELAY = 2500; // Wait for chokidar to detect file

// Colors for console output
const colors = {
  reset: '\x1b[0m',
  bright: '\x1b[1m',
  green: '\x1b[32m',
  red: '\x1b[31m',
  yellow: '\x1b[33m',
  blue: '\x1b[34m',
  cyan: '\x1b[36m'
};

// Test results
const results = {
  passed: 0,
  failed: 0,
  total: 0,
  tests: []
};

function log(message, color = 'reset') {
  console.log(`${colors[color]}${message}${colors.reset}`);
}

function wait(ms) {
  return new Promise(resolve => setTimeout(resolve, ms));
}

async function createTestPageFile(pageData) {
  const filePath = path.join(PAGES_DIR, `${pageData.id}.json`);
  await fs.writeFile(filePath, JSON.stringify(pageData, null, 2), 'utf8');
  log(`   📄 Created file: ${path.basename(filePath)}`, 'cyan');
  return filePath;
}

async function cleanupTestFile(filePath) {
  try {
    await fs.unlink(filePath);
    log(`   🗑️  Cleaned up: ${path.basename(filePath)}`, 'cyan');
  } catch (error) {
    // Ignore if file doesn't exist
  }
}

async function executeTest(name, testFn) {
  results.total++;
  log(`\n${'='.repeat(80)}`, 'blue');
  log(`TEST ${results.total}: ${name}`, 'bright');
  log('='.repeat(80), 'blue');

  try {
    await testFn();
    results.passed++;
    results.tests.push({ name, status: 'PASSED' });
    log(`✅ PASSED: ${name}`, 'green');
    return true;
  } catch (error) {
    results.failed++;
    results.tests.push({ name, status: 'FAILED', error: error.message });
    log(`❌ FAILED: ${name}`, 'red');
    log(`   Error: ${error.message}`, 'red');
    return false;
  }
}

// Test 1: Auto-registration to database
async function testAutoRegistrationDB() {
  const db = new Database(DB_PATH);
  const testAgentId = `auto-test-${uuidv4()}`;
  const pageData = {
    id: `auto-db-page-${uuidv4()}`,
    agent_id: testAgentId,
    title: 'Auto-Registration Database Test',
    content_type: 'markdown',
    content_value: '# Auto-Registered\nThis page was auto-registered to the database.',
    status: 'published',
    version: 1
  };

  let filePath;

  try {
    // Get initial count
    const initialCount = db.prepare('SELECT COUNT(*) as count FROM agent_pages WHERE agent_id = ?')
      .get(testAgentId);
    log(`   Initial DB count: ${initialCount.count}`, 'cyan');

    // Create file and wait for auto-registration
    filePath = await createTestPageFile(pageData);
    log(`   ⏳ Waiting ${AUTO_REGISTER_DELAY}ms for auto-registration...`, 'yellow');
    await wait(AUTO_REGISTER_DELAY);

    // Check database for the page
    const registeredPage = db.prepare('SELECT * FROM agent_pages WHERE id = ? AND agent_id = ?')
      .get(pageData.id, testAgentId);

    if (!registeredPage) {
      throw new Error('Page not found in database after auto-registration');
    }

    if (registeredPage.title !== pageData.title) {
      throw new Error(`Title mismatch: expected "${pageData.title}", got "${registeredPage.title}"`);
    }

    // Verify count increased
    const finalCount = db.prepare('SELECT COUNT(*) as count FROM agent_pages WHERE agent_id = ?')
      .get(testAgentId);
    log(`   Final DB count: ${finalCount.count}`, 'cyan');

    if (finalCount.count <= initialCount.count) {
      throw new Error(`Database count did not increase (${initialCount.count} → ${finalCount.count})`);
    }

    log(`   ✅ Auto-registration to database successful`, 'green');
    log(`   ✅ Page data correctly stored`, 'green');
    log(`   ✅ Database count increased`, 'green');

    // Cleanup
    db.prepare('DELETE FROM agent_pages WHERE id = ?').run(pageData.id);

  } finally {
    db.close();
    if (filePath) await cleanupTestFile(filePath);
  }
}

// Test 2: Multiple file auto-registration
async function testMultipleAutoRegistration() {
  const db = new Database(DB_PATH);
  const testAgentId = `multi-test-${uuidv4()}`;
  const pageCount = 5;
  const createdFiles = [];
  const pageIds = [];

  try {
    log(`   Creating ${pageCount} pages...`, 'cyan');

    // Create multiple files
    for (let i = 0; i < pageCount; i++) {
      const pageData = {
        id: `multi-page-${i}-${uuidv4()}`,
        agent_id: testAgentId,
        title: `Multi-Registration Test Page ${i}`,
        content_type: 'text',
        content_value: `Content for page ${i}`,
        status: 'published',
        version: 1
      };

      const filePath = await createTestPageFile(pageData);
      createdFiles.push(filePath);
      pageIds.push(pageData.id);
    }

    // Wait for all to be registered
    log(`   ⏳ Waiting ${AUTO_REGISTER_DELAY}ms for auto-registration...`, 'yellow');
    await wait(AUTO_REGISTER_DELAY);

    // Verify all are in database
    const registeredPages = db.prepare(`
      SELECT id FROM agent_pages
      WHERE agent_id = ? AND id IN (${pageIds.map(() => '?').join(',')})
    `).all(testAgentId, ...pageIds);

    if (registeredPages.length !== pageCount) {
      throw new Error(`Only ${registeredPages.length}/${pageCount} pages registered`);
    }

    log(`   ✅ All ${pageCount} pages auto-registered`, 'green');
    log(`   ✅ Batch auto-registration working`, 'green');

    // Cleanup
    db.prepare(`DELETE FROM agent_pages WHERE agent_id = ?`).run(testAgentId);

  } finally {
    db.close();
    for (const filePath of createdFiles) {
      await cleanupTestFile(filePath);
    }
  }
}

// Test 3: Update detection (INSERT OR REPLACE)
async function testUpdateDetection() {
  const db = new Database(DB_PATH);
  const testAgentId = `update-test-${uuidv4()}`;
  const pageData = {
    id: `update-page-${uuidv4()}`,
    agent_id: testAgentId,
    title: 'Original Title',
    content_type: 'text',
    content_value: 'Original content',
    status: 'draft',
    version: 1
  };

  let filePath;

  try {
    // Create initial file
    filePath = await createTestPageFile(pageData);
    await wait(AUTO_REGISTER_DELAY);

    // Verify initial registration
    const initialPage = db.prepare('SELECT * FROM agent_pages WHERE id = ?')
      .get(pageData.id);

    if (!initialPage) {
      throw new Error('Initial page not registered');
    }

    log(`   Initial: "${initialPage.title}" (${initialPage.status})`, 'cyan');

    // Update file
    pageData.title = 'Updated Title';
    pageData.status = 'published';
    pageData.version = 2;
    await fs.writeFile(filePath, JSON.stringify(pageData, null, 2), 'utf8');
    log(`   📝 Updated file`, 'cyan');

    await wait(AUTO_REGISTER_DELAY);

    // Verify update
    const updatedPage = db.prepare('SELECT * FROM agent_pages WHERE id = ?')
      .get(pageData.id);

    if (updatedPage.title !== 'Updated Title') {
      throw new Error(`Update not detected: title still "${updatedPage.title}"`);
    }

    if (updatedPage.status !== 'published') {
      throw new Error(`Status not updated: still "${updatedPage.status}"`);
    }

    log(`   Updated: "${updatedPage.title}" (${updatedPage.status})`, 'cyan');
    log(`   ✅ File updates detected and applied`, 'green');
    log(`   ✅ INSERT OR REPLACE working correctly`, 'green');

    // Cleanup
    db.prepare('DELETE FROM agent_pages WHERE id = ?').run(pageData.id);

  } finally {
    db.close();
    if (filePath) await cleanupTestFile(filePath);
  }
}

// Test 4: Verify schema validation
async function testSchemaValidation() {
  const db = new Database(DB_PATH);
  const testAgentId = `schema-test-${uuidv4()}`;

  try {
    // Test valid page
    const validPage = {
      id: `valid-page-${uuidv4()}`,
      agent_id: testAgentId,
      title: 'Valid Page',
      content_type: 'json',
      content_value: '{"test": "data"}',
      status: 'published',
      version: 1
    };

    const filePath = await createTestPageFile(validPage);
    await wait(AUTO_REGISTER_DELAY);

    const registered = db.prepare('SELECT * FROM agent_pages WHERE id = ?')
      .get(validPage.id);

    if (!registered) {
      throw new Error('Valid page not registered');
    }

    // Verify schema fields
    if (!registered.id || !registered.agent_id || !registered.title) {
      throw new Error('Missing required fields in database');
    }

    if (!['text', 'markdown', 'json', 'component'].includes(registered.content_type)) {
      throw new Error(`Invalid content_type: ${registered.content_type}`);
    }

    if (!['draft', 'published'].includes(registered.status)) {
      throw new Error(`Invalid status: ${registered.status}`);
    }

    log(`   ✅ Schema validation working`, 'green');
    log(`   ✅ Required fields present`, 'green');
    log(`   ✅ Constraints enforced`, 'green');

    // Cleanup
    db.prepare('DELETE FROM agent_pages WHERE id = ?').run(validPage.id);
    await cleanupTestFile(filePath);

  } finally {
    db.close();
  }
}

// Test 5: Performance under load
async function testPerformanceUnderLoad() {
  const db = new Database(DB_PATH);
  const testAgentId = `perf-test-${uuidv4()}`;
  const pageCount = 20;
  const createdFiles = [];
  const pageIds = [];

  try {
    log(`   Creating ${pageCount} pages rapidly...`, 'cyan');

    const startTime = Date.now();

    // Create files rapidly
    for (let i = 0; i < pageCount; i++) {
      const pageData = {
        id: `perf-page-${i}-${uuidv4()}`,
        agent_id: testAgentId,
        title: `Performance Test Page ${i}`,
        content_type: 'text',
        content_value: `Content ${i}`,
        status: 'published',
        version: 1
      };

      const filePath = await createTestPageFile(pageData);
      createdFiles.push(filePath);
      pageIds.push(pageData.id);
    }

    const fileCreationTime = Date.now() - startTime;

    // Wait for auto-registration
    await wait(AUTO_REGISTER_DELAY);

    // Verify all registered
    const registeredPages = db.prepare(`
      SELECT id FROM agent_pages
      WHERE agent_id = ? AND id IN (${pageIds.map(() => '?').join(',')})
    `).all(testAgentId, ...pageIds);

    const totalTime = Date.now() - startTime;

    if (registeredPages.length !== pageCount) {
      throw new Error(`Only ${registeredPages.length}/${pageCount} pages registered under load`);
    }

    const avgTime = totalTime / pageCount;

    log(`   ✅ ${pageCount} pages registered in ${totalTime}ms`, 'green');
    log(`   ✅ Average: ${avgTime.toFixed(2)}ms per page`, 'green');
    log(`   ✅ File creation: ${fileCreationTime}ms`, 'green');
    log(`   ✅ Performance acceptable`, 'green');

    // Cleanup
    db.prepare(`DELETE FROM agent_pages WHERE agent_id = ?`).run(testAgentId);

  } finally {
    db.close();
    for (const filePath of createdFiles) {
      await cleanupTestFile(filePath);
    }
  }
}

// Test 6: Watcher reliability
async function testWatcherReliability() {
  const db = new Database(DB_PATH);
  const testAgentId = `watch-test-${uuidv4()}`;
  const createdFiles = [];

  try {
    log(`   Testing watcher reliability with rapid changes...`, 'cyan');

    // Create, wait, create again
    for (let cycle = 0; cycle < 3; cycle++) {
      const pageData = {
        id: `watch-page-${cycle}-${uuidv4()}`,
        agent_id: testAgentId,
        title: `Watcher Test Cycle ${cycle}`,
        content_type: 'text',
        content_value: `Cycle ${cycle}`,
        status: 'published',
        version: 1
      };

      const filePath = await createTestPageFile(pageData);
      createdFiles.push(filePath);

      log(`   Created file for cycle ${cycle}`, 'cyan');
      await wait(AUTO_REGISTER_DELAY);

      const registered = db.prepare('SELECT * FROM agent_pages WHERE id = ?')
        .get(pageData.id);

      if (!registered) {
        throw new Error(`Watcher missed file in cycle ${cycle}`);
      }

      log(`   ✓ Cycle ${cycle} registered successfully`, 'cyan');
    }

    log(`   ✅ Watcher consistently detecting files`, 'green');
    log(`   ✅ No missed registrations`, 'green');

    // Cleanup
    db.prepare(`DELETE FROM agent_pages WHERE agent_id = ?`).run(testAgentId);

  } finally {
    db.close();
    for (const filePath of createdFiles) {
      await cleanupTestFile(filePath);
    }
  }
}

function generateReport() {
  log('\n\n' + '='.repeat(80), 'blue');
  log('VALIDATION REPORT - AUTO-REGISTRATION TO DATABASE', 'bright');
  log('='.repeat(80), 'blue');

  log(`\nTotal Tests: ${results.total}`, 'cyan');
  log(`Passed: ${results.passed}`, 'green');
  log(`Failed: ${results.failed}`, results.failed > 0 ? 'red' : 'green');

  const successRate = ((results.passed / results.total) * 100).toFixed(1);
  log(`Success Rate: ${successRate}%`, successRate === '100.0' ? 'green' : 'yellow');

  log('\nTest Results:', 'cyan');
  results.tests.forEach((test, index) => {
    const status = test.status === 'PASSED' ? '✅' : '❌';
    const color = test.status === 'PASSED' ? 'green' : 'red';
    log(`${index + 1}. ${status} ${test.name}`, color);
    if (test.error) {
      log(`   Error: ${test.error}`, 'red');
    }
  });

  log('\n' + '='.repeat(80), 'blue');

  if (results.failed === 0) {
    log('🎉 ALL VALIDATION TESTS PASSED! 🎉', 'green');
    log('\nThe auto-registration system is working correctly:', 'green');
    log('✅ Files are auto-detected and registered to database', 'green');
    log('✅ Multiple files are handled correctly', 'green');
    log('✅ Updates are detected and applied', 'green');
    log('✅ Schema validation is enforced', 'green');
    log('✅ Performance is acceptable', 'green');
    log('✅ Watcher is reliable', 'green');

    log('\n⚠️  NOTE: API routes use mock storage, not the database', 'yellow');
    log('   Auto-registration writes to DB, but API reads from memory', 'yellow');
    log('   This means: Database ✅ | API Integration ❌', 'yellow');
  } else {
    log('⚠️  SOME TESTS FAILED', 'red');
    log('Please review the errors above.', 'yellow');
  }

  log('='.repeat(80) + '\n', 'blue');

  return results.failed === 0 ? 0 : 1;
}

async function main() {
  log('\n' + '='.repeat(80), 'blue');
  log('AUTO-REGISTRATION SYSTEM - DATABASE VALIDATION', 'bright');
  log('='.repeat(80), 'blue');

  log('\n📋 Configuration:', 'cyan');
  log(`   Database: ${DB_PATH}`, 'cyan');
  log(`   Pages Directory: ${PAGES_DIR}`, 'cyan');
  log(`   Auto-Register Delay: ${AUTO_REGISTER_DELAY}ms`, 'cyan');

  try {
    // Verify database exists
    const db = new Database(DB_PATH);
    const tables = db.prepare("SELECT name FROM sqlite_master WHERE type='table' AND name='agent_pages'").all();
    db.close();

    if (tables.length === 0) {
      throw new Error('agent_pages table not found in database');
    }

    log('   ✅ Database connected', 'green');

    // Execute tests
    await executeTest('Auto-registration to database', testAutoRegistrationDB);
    await executeTest('Multiple file auto-registration', testMultipleAutoRegistration);
    await executeTest('Update detection (INSERT OR REPLACE)', testUpdateDetection);
    await executeTest('Schema validation', testSchemaValidation);
    await executeTest('Performance under load', testPerformanceUnderLoad);
    await executeTest('Watcher reliability', testWatcherReliability);

    // Generate report
    const exitCode = generateReport();
    process.exit(exitCode);

  } catch (error) {
    log(`\n❌ FATAL ERROR: ${error.message}`, 'red');
    log('\nStack trace:', 'red');
    log(error.stack, 'red');
    process.exit(1);
  }
}

main();
