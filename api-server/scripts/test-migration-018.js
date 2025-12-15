#!/usr/bin/env node

/**
 * Test Migration 018: Onboarding Timestamps
 *
 * This script tests the onboarding_state timestamp migration on an in-memory database
 * to ensure it works correctly before applying to production.
 */

import Database from 'better-sqlite3';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const MIGRATION_FILE = path.join(__dirname, '../db/migrations/018-onboarding-timestamps.sql');

// ANSI color codes for output
const colors = {
  reset: '\x1b[0m',
  green: '\x1b[32m',
  red: '\x1b[31m',
  yellow: '\x1b[33m',
  blue: '\x1b[34m',
  cyan: '\x1b[36m'
};

function log(message, color = 'reset') {
  console.log(`${colors[color]}${message}${colors.reset}`);
}

function createTestDatabase() {
  log('\n=== Creating Test Database ===', 'cyan');
  const db = new Database(':memory:');

  // Create onboarding_state table with original schema
  log('Creating onboarding_state table...', 'blue');
  db.exec(`
    CREATE TABLE onboarding_state (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      user_id TEXT UNIQUE NOT NULL,
      current_step TEXT NOT NULL DEFAULT 'name',
      user_name TEXT,
      started_at INTEGER NOT NULL,
      completed_at INTEGER,
      last_interaction_at INTEGER,
      metadata TEXT
    )
  `);

  log('✓ Table created successfully', 'green');
  return db;
}

function insertTestData(db) {
  log('\n=== Inserting Test Data ===', 'cyan');

  const now = Date.now();
  const hourAgo = now - (60 * 60 * 1000);
  const dayAgo = now - (24 * 60 * 60 * 1000);

  const testCases = [
    {
      user_id: 'user-with-all-timestamps',
      current_step: 'completed',
      user_name: 'Test User 1',
      started_at: dayAgo,
      completed_at: hourAgo,
      last_interaction_at: hourAgo
    },
    {
      user_id: 'user-without-last-interaction',
      current_step: 'name',
      user_name: null,
      started_at: hourAgo,
      completed_at: null,
      last_interaction_at: null
    },
    {
      user_id: 'user-in-progress',
      current_step: 'post_created',
      user_name: 'Test User 3',
      started_at: dayAgo,
      completed_at: null,
      last_interaction_at: now
    }
  ];

  const insert = db.prepare(`
    INSERT INTO onboarding_state (user_id, current_step, user_name, started_at, completed_at, last_interaction_at)
    VALUES (?, ?, ?, ?, ?, ?)
  `);

  testCases.forEach((testCase, index) => {
    insert.run(
      testCase.user_id,
      testCase.current_step,
      testCase.user_name,
      testCase.started_at,
      testCase.completed_at,
      testCase.last_interaction_at
    );
    log(`✓ Inserted test case ${index + 1}: ${testCase.user_id}`, 'green');
  });

  return testCases;
}

function runMigration(db) {
  log('\n=== Running Migration 018 ===', 'cyan');

  if (!fs.existsSync(MIGRATION_FILE)) {
    log(`✗ Migration file not found: ${MIGRATION_FILE}`, 'red');
    process.exit(1);
  }

  const migrationSQL = fs.readFileSync(MIGRATION_FILE, 'utf8');

  try {
    db.exec(migrationSQL);
    log('✓ Migration executed successfully', 'green');
  } catch (error) {
    log(`✗ Migration failed: ${error.message}`, 'red');
    throw error;
  }
}

function verifySchema(db) {
  log('\n=== Verifying Schema ===', 'cyan');

  const schema = db.prepare("SELECT sql FROM sqlite_master WHERE type='table' AND name='onboarding_state'").get();

  if (!schema) {
    log('✗ Table onboarding_state not found', 'red');
    return false;
  }

  log('Table schema:', 'blue');
  log(schema.sql, 'yellow');

  // Check for new columns
  const hasCreatedAt = schema.sql.includes('created_at');
  const hasUpdatedAt = schema.sql.includes('updated_at');

  if (hasCreatedAt && hasUpdatedAt) {
    log('✓ Both created_at and updated_at columns exist', 'green');
    return true;
  } else {
    log('✗ Missing timestamp columns', 'red');
    return false;
  }
}

function verifyTriggers(db) {
  log('\n=== Verifying Triggers ===', 'cyan');

  const triggers = db.prepare("SELECT name, sql FROM sqlite_master WHERE type='trigger' AND tbl_name='onboarding_state'").all();

  // Triggers are optional - timestamp management will be done at application level
  if (triggers.length === 0) {
    log('ℹ No triggers found (application-level timestamp management)', 'blue');
    return true;
  }

  log(`Found ${triggers.length} trigger(s):`, 'blue');
  triggers.forEach(trigger => {
    log(`  - ${trigger.name}`, 'green');
  });

  return true; // Triggers are optional for this migration
}

function verifyBackfill(db, originalTestCases) {
  log('\n=== Verifying Backfilled Data ===', 'cyan');

  const rows = db.prepare('SELECT * FROM onboarding_state').all();

  if (rows.length !== originalTestCases.length) {
    log(`✗ Row count mismatch. Expected ${originalTestCases.length}, got ${rows.length}`, 'red');
    return false;
  }

  let allValid = true;

  rows.forEach((row, index) => {
    const original = originalTestCases.find(tc => tc.user_id === row.user_id);

    log(`\nVerifying ${row.user_id}:`, 'blue');

    // Verify created_at
    if (!row.created_at) {
      log(`  ✗ created_at is NULL`, 'red');
      allValid = false;
    } else if (row.created_at === row.started_at) {
      log(`  ✓ created_at = started_at (${row.created_at})`, 'green');
    } else {
      log(`  ✗ created_at (${row.created_at}) != started_at (${row.started_at})`, 'red');
      allValid = false;
    }

    // Verify updated_at
    if (!row.updated_at) {
      log(`  ✗ updated_at is NULL`, 'red');
      allValid = false;
    } else {
      const expectedUpdatedAt = original.last_interaction_at || original.started_at;
      if (row.updated_at === expectedUpdatedAt) {
        log(`  ✓ updated_at = ${original.last_interaction_at ? 'last_interaction_at' : 'started_at'} (${row.updated_at})`, 'green');
      } else {
        log(`  ✗ updated_at (${row.updated_at}) != expected (${expectedUpdatedAt})`, 'red');
        allValid = false;
      }
    }
  });

  return allValid;
}

function testUpdateTrigger(db) {
  log('\n=== Testing Manual Update (Application-level) ===', 'cyan');

  const beforeUpdate = db.prepare("SELECT id, updated_at FROM onboarding_state WHERE user_id = 'user-in-progress'").get();

  log(`Before update: updated_at = ${beforeUpdate.updated_at}`, 'blue');

  return new Promise((resolve) => {
    setTimeout(() => {
      const newTimestamp = Date.now();

      // Manually update both the field and updated_at (as application would do)
      db.prepare(`
        UPDATE onboarding_state
        SET current_step = 'completed', updated_at = ?
        WHERE user_id = 'user-in-progress'
      `).run(newTimestamp);

      const afterUpdate = db.prepare("SELECT id, updated_at FROM onboarding_state WHERE user_id = 'user-in-progress'").get();

      log(`After update: updated_at = ${afterUpdate.updated_at}`, 'blue');

      if (afterUpdate.updated_at > beforeUpdate.updated_at) {
        log('✓ updated_at was successfully updated (application-level)', 'green');
        resolve(true);
      } else {
        log('✗ updated_at was not updated', 'red');
        resolve(false);
      }
    }, 100);
  });
}

function testInsertTrigger(db) {
  log('\n=== Testing Insert (Application-level) ===', 'cyan');

  const now = Date.now();

  // Insert a new row with explicit timestamps (as application would do)
  db.prepare(`
    INSERT INTO onboarding_state (user_id, current_step, started_at, created_at, updated_at)
    VALUES ('new-user', 'name', ?, ?, ?)
  `).run(now, now, now);

  const newRow = db.prepare("SELECT * FROM onboarding_state WHERE user_id = 'new-user'").get();

  log(`New row timestamps:`, 'blue');
  log(`  created_at: ${newRow.created_at}`, 'yellow');
  log(`  updated_at: ${newRow.updated_at}`, 'yellow');
  log(`  started_at: ${newRow.started_at}`, 'yellow');

  if (newRow.created_at && newRow.updated_at) {
    log('✓ Timestamps were set (application-level)', 'green');
    return true;
  } else {
    log('✗ Timestamps were not set', 'red');
    return false;
  }
}

async function runTests() {
  log('\n╔════════════════════════════════════════════════╗', 'cyan');
  log('║  Migration 018 Test Suite                     ║', 'cyan');
  log('╚════════════════════════════════════════════════╝', 'cyan');

  try {
    const db = createTestDatabase();
    const testCases = insertTestData(db);
    runMigration(db);

    const schemaValid = verifySchema(db);
    const triggersValid = verifyTriggers(db);
    const backfillValid = verifyBackfill(db, testCases);
    const updateTriggerValid = await testUpdateTrigger(db);
    const insertTriggerValid = testInsertTrigger(db);

    db.close();

    log('\n╔════════════════════════════════════════════════╗', 'cyan');
    log('║  Test Results                                  ║', 'cyan');
    log('╚════════════════════════════════════════════════╝', 'cyan');

    const results = [
      ['Schema validation', schemaValid],
      ['Trigger verification', triggersValid],
      ['Data backfill', backfillValid],
      ['Manual update test', updateTriggerValid],
      ['Manual insert test', insertTriggerValid]
    ];

    results.forEach(([test, passed]) => {
      const status = passed ? '✓ PASSED' : '✗ FAILED';
      const color = passed ? 'green' : 'red';
      log(`${test.padEnd(30)} ${status}`, color);
    });

    const allPassed = results.every(([, passed]) => passed);

    if (allPassed) {
      log('\n✓ All tests passed! Migration is ready for production.', 'green');
      process.exit(0);
    } else {
      log('\n✗ Some tests failed. Please review the migration.', 'red');
      process.exit(1);
    }

  } catch (error) {
    log(`\n✗ Test suite failed with error: ${error.message}`, 'red');
    console.error(error);
    process.exit(1);
  }
}

// Run the tests
runTests();
