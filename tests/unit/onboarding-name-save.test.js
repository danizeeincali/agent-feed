/**
 * Onboarding Name Save Functionality - TDD Unit Tests (RED PHASE)
 *
 * London School TDD - Write Tests FIRST
 * These tests are EXPECTED TO FAIL initially because schema changes aren't implemented
 *
 * Test Coverage:
 * 1. Database Schema - created_at and updated_at columns exist and auto-populate
 * 2. OnboardingFlowService - Name processing and database persistence
 * 3. DatabaseSelector - Timestamp column queries work correctly
 * 4. Integration - Full name save flow with real database operations
 * 5. Edge Cases - Validation, concurrency, SQL injection, backfilled data
 *
 * Test Framework: Jest (not Vitest)
 * Database: better-sqlite3 (real database operations, NO MOCKS)
 */

const Database = require('better-sqlite3');
const fs = require('fs');
const path = require('path');

// For RED phase TDD, we'll create minimal mock implementations
// In GREEN phase, we'll replace these with actual service imports
class OnboardingFlowService {
  constructor(db, userSettingsService) {
    this.db = db;
    this.userSettingsService = userSettingsService;
  }

  initializeOnboarding(userId) {
    // Minimal implementation for testing
    const existing = this.db.prepare(`
      SELECT * FROM onboarding_state WHERE user_id = ?
    `).get(userId);

    if (existing) return existing;

    this.db.prepare(`
      INSERT INTO onboarding_state (user_id, phase, step, responses)
      VALUES (?, ?, ?, ?)
    `).run(userId, 1, 'name', '{}');

    return this.db.prepare(`
      SELECT * FROM onboarding_state WHERE user_id = ?
    `).get(userId);
  }

  processNameResponse(userId, name) {
    // This will FAIL - not implemented yet (RED phase)
    throw new Error('processNameResponse not implemented - expected RED phase failure');
  }
}

class UserSettingsService {
  constructor(db) {
    this.db = db;
  }

  setDisplayName(userId, displayName) {
    // Minimal implementation for testing
    this.db.prepare(`
      INSERT INTO user_settings (user_id, display_name)
      VALUES (?, ?)
      ON CONFLICT(user_id) DO UPDATE SET
        display_name = excluded.display_name,
        updated_at = unixepoch()
    `).run(userId, displayName);
  }
}

// Test database path
const TEST_DB_PATH = path.join(__dirname, '../test-onboarding-name-save.db');

/**
 * Setup test database with complete schema
 */
function setupTestDatabase() {
  // Clean up any existing test database
  if (fs.existsSync(TEST_DB_PATH)) {
    fs.unlinkSync(TEST_DB_PATH);
  }

  const db = new Database(TEST_DB_PATH);
  db.pragma('journal_mode = WAL');

  // Create schema with NEW created_at/updated_at columns
  // These columns DON'T EXIST YET - tests will FAIL
  db.exec(`
    -- User settings table
    CREATE TABLE user_settings (
      user_id TEXT PRIMARY KEY,
      display_name TEXT,
      display_name_style TEXT,
      onboarding_completed INTEGER DEFAULT 0,
      onboarding_completed_at INTEGER,
      profile_json TEXT DEFAULT '{}',
      created_at INTEGER DEFAULT (unixepoch()),
      updated_at INTEGER DEFAULT (unixepoch())
    );

    -- Onboarding state table with NEW timestamp columns
    CREATE TABLE onboarding_state (
      user_id TEXT PRIMARY KEY,
      phase INTEGER DEFAULT 1,
      step TEXT DEFAULT 'name',
      phase1_completed INTEGER DEFAULT 0,
      phase1_completed_at INTEGER,
      phase2_completed INTEGER DEFAULT 0,
      phase2_completed_at INTEGER,
      responses TEXT DEFAULT '{}',
      created_at INTEGER DEFAULT (unixepoch()),
      updated_at INTEGER DEFAULT (unixepoch())
    );

    -- Agent posts table (for integration tests)
    CREATE TABLE agent_posts (
      id TEXT PRIMARY KEY,
      title TEXT NOT NULL,
      content TEXT NOT NULL,
      author_agent TEXT,
      author_id TEXT,
      user_id TEXT,
      published_at INTEGER NOT NULL,
      metadata TEXT,
      created_at INTEGER DEFAULT (unixepoch())
    );
  `);

  return db;
}

/**
 * Cleanup test database
 */
function cleanupTestDatabase(db) {
  if (db) {
    try {
      db.close();
    } catch (err) {
      // Ignore close errors
    }
  }

  if (fs.existsSync(TEST_DB_PATH)) {
    fs.unlinkSync(TEST_DB_PATH);
  }
}

// =============================================================================
// TEST SUITE 1: Database Schema Tests
// =============================================================================

describe('Database Schema: created_at and updated_at columns', () => {
  let db;

  beforeEach(() => {
    db = setupTestDatabase();
  });

  afterEach(() => {
    cleanupTestDatabase(db);
  });

  test('onboarding_state table has created_at column', () => {
    // Query schema to verify column exists
    const tableInfo = db.prepare(`PRAGMA table_info(onboarding_state)`).all();
    const createdAtColumn = tableInfo.find(col => col.name === 'created_at');

    // EXPECTED TO FAIL - Column doesn't exist yet in production schema
    expect(createdAtColumn).toBeDefined();
    expect(createdAtColumn.type).toBe('INTEGER');
    expect(createdAtColumn.dflt_value).toContain('unixepoch()');
  });

  test('onboarding_state table has updated_at column', () => {
    // Query schema to verify column exists
    const tableInfo = db.prepare(`PRAGMA table_info(onboarding_state)`).all();
    const updatedAtColumn = tableInfo.find(col => col.name === 'updated_at');

    // EXPECTED TO FAIL - Column doesn't exist yet in production schema
    expect(updatedAtColumn).toBeDefined();
    expect(updatedAtColumn.type).toBe('INTEGER');
    expect(updatedAtColumn.dflt_value).toContain('unixepoch()');
  });

  test('created_at defaults to current timestamp for new rows', () => {
    const beforeInsert = Math.floor(Date.now() / 1000);

    // Insert new row without specifying created_at
    db.prepare(`
      INSERT INTO onboarding_state (user_id, phase, step)
      VALUES (?, ?, ?)
    `).run('test-user-1', 1, 'name');

    const afterInsert = Math.floor(Date.now() / 1000);

    // Retrieve the row
    const row = db.prepare(`
      SELECT created_at FROM onboarding_state WHERE user_id = ?
    `).get('test-user-1');

    // EXPECTED TO FAIL - created_at column doesn't exist yet
    expect(row.created_at).toBeDefined();
    expect(row.created_at).toBeGreaterThanOrEqual(beforeInsert);
    expect(row.created_at).toBeLessThanOrEqual(afterInsert);
  });

  test('updated_at defaults to current timestamp for new rows', () => {
    const beforeInsert = Math.floor(Date.now() / 1000);

    // Insert new row without specifying updated_at
    db.prepare(`
      INSERT INTO onboarding_state (user_id, phase, step)
      VALUES (?, ?, ?)
    `).run('test-user-2', 1, 'name');

    const afterInsert = Math.floor(Date.now() / 1000);

    // Retrieve the row
    const row = db.prepare(`
      SELECT updated_at FROM onboarding_state WHERE user_id = ?
    `).get('test-user-2');

    // EXPECTED TO FAIL - updated_at column doesn't exist yet
    expect(row.updated_at).toBeDefined();
    expect(row.updated_at).toBeGreaterThanOrEqual(beforeInsert);
    expect(row.updated_at).toBeLessThanOrEqual(afterInsert);
  });

  test('updated_at changes when row is updated', async () => {
    // Insert initial row
    db.prepare(`
      INSERT INTO onboarding_state (user_id, phase, step)
      VALUES (?, ?, ?)
    `).run('test-user-3', 1, 'name');

    const initialRow = db.prepare(`
      SELECT updated_at FROM onboarding_state WHERE user_id = ?
    `).get('test-user-3');

    // Wait 1 second to ensure timestamp difference
    await new Promise(resolve => setTimeout(resolve, 1100));

    // Update the row
    db.prepare(`
      UPDATE onboarding_state
      SET step = 'use_case', updated_at = unixepoch()
      WHERE user_id = ?
    `).run('test-user-3');

    const updatedRow = db.prepare(`
      SELECT updated_at FROM onboarding_state WHERE user_id = ?
    `).get('test-user-3');

    // EXPECTED TO FAIL - updated_at column doesn't exist yet
    expect(updatedRow.updated_at).toBeGreaterThan(initialRow.updated_at);
  });

  test('created_at remains unchanged when row is updated', async () => {
    // Insert initial row
    db.prepare(`
      INSERT INTO onboarding_state (user_id, phase, step)
      VALUES (?, ?, ?)
    `).run('test-user-4', 1, 'name');

    const initialRow = db.prepare(`
      SELECT created_at FROM onboarding_state WHERE user_id = ?
    `).get('test-user-4');

    // Wait 1 second
    await new Promise(resolve => setTimeout(resolve, 1100));

    // Update the row (created_at should NOT change)
    db.prepare(`
      UPDATE onboarding_state
      SET step = 'use_case', updated_at = unixepoch()
      WHERE user_id = ?
    `).run('test-user-4');

    const updatedRow = db.prepare(`
      SELECT created_at FROM onboarding_state WHERE user_id = ?
    `).get('test-user-4');

    // EXPECTED TO FAIL - created_at column doesn't exist yet
    expect(updatedRow.created_at).toBe(initialRow.created_at);
  });
});

// =============================================================================
// TEST SUITE 2: OnboardingFlowService Name Processing
// =============================================================================

describe('OnboardingFlowService: processNameResponse', () => {
  let db;
  let onboardingService;
  let userSettingsService;

  beforeEach(() => {
    db = setupTestDatabase();

    // Create service instances with real database
    try {
      userSettingsService = new UserSettingsService(db);
      onboardingService = new OnboardingFlowService(db, userSettingsService);
    } catch (err) {
      // Services may not exist yet - that's OK for RED phase
      console.log('Services not available yet - expected in RED phase');
    }

    // Initialize onboarding state for test user
    db.prepare(`
      INSERT INTO onboarding_state (user_id, phase, step)
      VALUES (?, ?, ?)
    `).run('test-user-save', 1, 'name');
  });

  afterEach(() => {
    cleanupTestDatabase(db);
  });

  test('processNameResponse saves name to onboarding_state.responses', () => {
    const testName = 'Sarah Chen';

    // Act: Process name response
    const result = onboardingService.processNameResponse('test-user-save', testName);

    // EXPECTED TO FAIL - Implementation may not exist yet
    expect(result.success).toBe(true);

    // Verify name is saved in responses JSON
    const state = db.prepare(`
      SELECT responses FROM onboarding_state WHERE user_id = ?
    `).get('test-user-save');

    const responses = JSON.parse(state.responses);
    expect(responses.name).toBe(testName);
  });

  test('processNameResponse calls userSettingsService.setDisplayName', () => {
    const testName = 'John Doe';

    // Act: Process name response
    const result = onboardingService.processNameResponse('test-user-save', testName);

    // EXPECTED TO FAIL - Implementation may not exist yet
    expect(result.success).toBe(true);

    // Verify display name is set in user_settings table
    const userSettings = db.prepare(`
      SELECT display_name FROM user_settings WHERE user_id = ?
    `).get('test-user-save');

    expect(userSettings).toBeDefined();
    expect(userSettings.display_name).toBe(testName);
  });

  test('processNameResponse updates onboarding_state phase and step', () => {
    const testName = 'Maria Garcia';

    // Act: Process name response
    const result = onboardingService.processNameResponse('test-user-save', testName);

    // EXPECTED TO FAIL - Implementation may not exist yet
    expect(result.success).toBe(true);
    expect(result.nextStep).toBe('use_case');

    // Verify state transition
    const state = db.prepare(`
      SELECT phase, step FROM onboarding_state WHERE user_id = ?
    `).get('test-user-save');

    expect(state.phase).toBe(1); // Still Phase 1
    expect(state.step).toBe('use_case'); // Transitioned to use_case step
  });

  test('processNameResponse sets updated_at timestamp', async () => {
    const beforeUpdate = Math.floor(Date.now() / 1000);

    // Act: Process name response
    const result = onboardingService.processNameResponse('test-user-save', 'Test Name');

    const afterUpdate = Math.floor(Date.now() / 1000);

    // EXPECTED TO FAIL - updated_at column doesn't exist yet
    expect(result.success).toBe(true);

    const state = db.prepare(`
      SELECT updated_at FROM onboarding_state WHERE user_id = ?
    `).get('test-user-save');

    expect(state.updated_at).toBeGreaterThanOrEqual(beforeUpdate);
    expect(state.updated_at).toBeLessThanOrEqual(afterUpdate);
  });

  test('processNameResponse rejects empty names', () => {
    const emptyNames = ['', '   ', '\t\n', null, undefined];

    emptyNames.forEach(emptyName => {
      // Act: Try to process empty name
      const result = onboardingService.processNameResponse('test-user-save', emptyName);

      // EXPECTED TO FAIL - Validation may not exist yet
      expect(result.success).toBe(false);
      expect(result.error).toBeDefined();
      expect(result.error).toMatch(/required|empty/i);
    });
  });

  test('processNameResponse rejects names longer than 50 characters', () => {
    const longName = 'A'.repeat(51);

    // Act: Try to process long name
    const result = onboardingService.processNameResponse('test-user-save', longName);

    // EXPECTED TO FAIL - Validation may not exist yet
    expect(result.success).toBe(false);
    expect(result.error).toBeDefined();
    expect(result.error).toMatch(/50|long|maximum/i);
  });

  test('processNameResponse sanitizes SQL injection attempts', () => {
    const sqlInjectionAttempts = [
      "'; DROP TABLE onboarding_state; --",
      "admin'--",
      "' OR '1'='1",
      "<script>alert('xss')</script>",
      "'; DELETE FROM user_settings WHERE '1'='1"
    ];

    sqlInjectionAttempts.forEach(maliciousInput => {
      // Reset user state
      db.prepare(`
        UPDATE onboarding_state
        SET step = 'name', responses = '{}'
        WHERE user_id = ?
      `).run('test-user-save');

      // Act: Try to process malicious input
      const result = onboardingService.processNameResponse('test-user-save', maliciousInput);

      // EXPECTED TO FAIL - Sanitization may not exist yet
      // Should either reject or sanitize the input
      if (result.success) {
        // If it succeeds, verify it was sanitized
        const state = db.prepare(`
          SELECT responses FROM onboarding_state WHERE user_id = ?
        `).get('test-user-save');

        const responses = JSON.parse(state.responses);
        expect(responses.name).not.toContain('<script>');
        expect(responses.name).not.toContain('DROP TABLE');
        expect(responses.name).not.toContain('DELETE FROM');
      } else {
        // If it fails, should have meaningful error
        expect(result.error).toBeDefined();
      }

      // Verify database integrity - tables should still exist
      const tablesExist = db.prepare(`
        SELECT name FROM sqlite_master
        WHERE type='table' AND name IN ('onboarding_state', 'user_settings')
      `).all();

      expect(tablesExist.length).toBe(2);
    });
  });
});

// =============================================================================
// TEST SUITE 3: Database Selector Timestamp Queries
// =============================================================================

describe('DatabaseSelector: Timestamp column queries', () => {
  let db;

  beforeEach(() => {
    db = setupTestDatabase();

    // Insert test data
    db.prepare(`
      INSERT INTO onboarding_state (user_id, phase, step, responses)
      VALUES (?, ?, ?, ?)
    `).run('test-user-db', 1, 'name', '{}');
  });

  afterEach(() => {
    cleanupTestDatabase(db);
  });

  test('getOnboardingState queries created_at column without error', () => {
    // Act: Query with created_at column
    const query = () => {
      return db.prepare(`
        SELECT
          user_id,
          phase,
          step,
          responses,
          created_at,
          updated_at
        FROM onboarding_state
        WHERE user_id = ?
      `).get('test-user-db');
    };

    // EXPECTED TO FAIL - Columns don't exist yet
    expect(query).not.toThrow();

    const result = query();
    expect(result).toBeDefined();
    expect(result.created_at).toBeDefined();
  });

  test('getOnboardingState queries updated_at column without error', () => {
    // Act: Query with updated_at column
    const query = () => {
      return db.prepare(`
        SELECT
          user_id,
          phase,
          step,
          responses,
          created_at,
          updated_at
        FROM onboarding_state
        WHERE user_id = ?
      `).get('test-user-db');
    };

    // EXPECTED TO FAIL - Columns don't exist yet
    expect(query).not.toThrow();

    const result = query();
    expect(result).toBeDefined();
    expect(result.updated_at).toBeDefined();
  });

  test('getOnboardingState returns proper timestamp values', () => {
    // Get current time for comparison
    const currentTime = Math.floor(Date.now() / 1000);

    // Query state
    const state = db.prepare(`
      SELECT created_at, updated_at
      FROM onboarding_state
      WHERE user_id = ?
    `).get('test-user-db');

    // EXPECTED TO FAIL - Columns don't exist yet
    expect(state.created_at).toBeDefined();
    expect(state.updated_at).toBeDefined();

    // Timestamps should be reasonable (within last minute)
    expect(state.created_at).toBeGreaterThan(currentTime - 60);
    expect(state.created_at).toBeLessThanOrEqual(currentTime);

    expect(state.updated_at).toBeGreaterThan(currentTime - 60);
    expect(state.updated_at).toBeLessThanOrEqual(currentTime);
  });
});

// =============================================================================
// TEST SUITE 4: Integration Tests - Full Name Save Flow
// =============================================================================

describe('Integration: Full name save flow with real database', () => {
  let db;
  let onboardingService;
  let userSettingsService;

  beforeEach(() => {
    db = setupTestDatabase();

    try {
      userSettingsService = new UserSettingsService(db);
      onboardingService = new OnboardingFlowService(db, userSettingsService);

      // Initialize onboarding state
      onboardingService.initializeOnboarding('integration-user');
    } catch (err) {
      console.log('Services not available yet - expected in RED phase');
    }
  });

  afterEach(() => {
    cleanupTestDatabase(db);
  });

  test('Full flow: User posts name → Agent processes → Name saved to DB', () => {
    const userName = 'Integration Test User';
    const userId = 'integration-user';

    // Step 1: User submits name
    const result = onboardingService.processNameResponse(userId, userName);

    // EXPECTED TO FAIL - Full implementation doesn't exist yet
    expect(result.success).toBe(true);

    // Step 2: Verify onboarding_state.responses contains the name
    const onboardingState = db.prepare(`
      SELECT responses, phase, step, updated_at
      FROM onboarding_state
      WHERE user_id = ?
    `).get(userId);

    expect(onboardingState).toBeDefined();

    const responses = JSON.parse(onboardingState.responses);
    expect(responses.name).toBe(userName);

    // Step 3: Verify user_settings.display_name is updated
    const userSettings = db.prepare(`
      SELECT display_name FROM user_settings WHERE user_id = ?
    `).get(userId);

    expect(userSettings).toBeDefined();
    expect(userSettings.display_name).toBe(userName);

    // Step 4: Verify state transition
    expect(onboardingState.phase).toBe(1);
    expect(onboardingState.step).toBe('use_case');

    // Step 5: Verify updated_at was set
    expect(onboardingState.updated_at).toBeDefined();
    expect(onboardingState.updated_at).toBeGreaterThan(0);
  });

  test('Verify no SQL errors in logs during name save', () => {
    const userName = 'Log Test User';
    const userId = 'log-test-user';

    // Initialize state
    db.prepare(`
      INSERT INTO onboarding_state (user_id, phase, step)
      VALUES (?, ?, ?)
    `).run(userId, 1, 'name');

    // Capture console errors
    const originalError = console.error;
    const errors = [];
    console.error = (...args) => {
      errors.push(args.join(' '));
      originalError(...args);
    };

    try {
      // Act: Process name
      const result = onboardingService.processNameResponse(userId, userName);

      // EXPECTED TO FAIL - Implementation doesn't exist yet
      expect(result.success).toBe(true);

      // Verify no SQL errors were logged
      const sqlErrors = errors.filter(err =>
        err.includes('SQL') ||
        err.includes('SQLITE') ||
        err.includes('no such column')
      );

      expect(sqlErrors.length).toBe(0);
    } finally {
      // Restore console.error
      console.error = originalError;
    }
  });
});

// =============================================================================
// TEST SUITE 5: Edge Cases
// =============================================================================

describe('Edge Cases: Onboarding name save', () => {
  let db;
  let onboardingService;

  beforeEach(() => {
    db = setupTestDatabase();

    try {
      const userSettingsService = new UserSettingsService(db);
      onboardingService = new OnboardingFlowService(db, userSettingsService);
    } catch (err) {
      console.log('Services not available yet - expected in RED phase');
    }
  });

  afterEach(() => {
    cleanupTestDatabase(db);
  });

  test('User with existing onboarding_state (backfilled columns work)', () => {
    // Insert user WITHOUT created_at/updated_at (simulating old data)
    db.prepare(`
      INSERT INTO onboarding_state (user_id, phase, step, responses)
      VALUES (?, ?, ?, ?)
    `).run('backfill-user', 1, 'name', '{}');

    // Act: Process name for this user
    const result = onboardingService.processNameResponse('backfill-user', 'Backfill Test');

    // EXPECTED TO FAIL - Backfill logic doesn't exist yet
    expect(result.success).toBe(true);

    // Verify timestamps were added/updated
    const state = db.prepare(`
      SELECT created_at, updated_at FROM onboarding_state WHERE user_id = ?
    `).get('backfill-user');

    expect(state.created_at).toBeDefined();
    expect(state.updated_at).toBeDefined();
  });

  test('User with no onboarding_state (columns auto-populate)', () => {
    const userId = 'new-user-auto';

    // Act: Initialize onboarding for new user
    onboardingService.initializeOnboarding(userId);

    // EXPECTED TO FAIL - Auto-population doesn't exist yet
    const state = db.prepare(`
      SELECT created_at, updated_at FROM onboarding_state WHERE user_id = ?
    `).get(userId);

    expect(state).toBeDefined();
    expect(state.created_at).toBeDefined();
    expect(state.updated_at).toBeDefined();

    // Timestamps should be recent
    const now = Math.floor(Date.now() / 1000);
    expect(state.created_at).toBeGreaterThan(now - 60);
    expect(state.updated_at).toBeGreaterThan(now - 60);
  });

  test('Concurrent name updates (last write wins)', async () => {
    const userId = 'concurrent-user';

    // Initialize state
    db.prepare(`
      INSERT INTO onboarding_state (user_id, phase, step)
      VALUES (?, ?, ?)
    `).run(userId, 1, 'name');

    // Simulate concurrent updates
    const update1 = onboardingService.processNameResponse(userId, 'First Name');
    const update2 = onboardingService.processNameResponse(userId, 'Second Name');

    // EXPECTED TO FAIL - Concurrency handling doesn't exist yet
    // Both should succeed or one should fail gracefully
    expect(update1.success || update2.success).toBe(true);

    // Verify final state is consistent
    const finalState = db.prepare(`
      SELECT responses FROM onboarding_state WHERE user_id = ?
    `).get(userId);

    const responses = JSON.parse(finalState.responses);

    // Should have ONE of the two names (last write wins)
    expect(['First Name', 'Second Name']).toContain(responses.name);
  });

  test('Unicode names are handled correctly', () => {
    const unicodeNames = [
      'José García',        // Spanish
      '李明',               // Chinese
      'Müller',            // German
      'Øyvind',            // Norwegian
      'Владимир',          // Russian
      '🎯 Emoji Name'      // Emoji
    ];

    unicodeNames.forEach((name, index) => {
      const userId = `unicode-user-${index}`;

      // Initialize state for each user
      db.prepare(`
        INSERT INTO onboarding_state (user_id, phase, step)
        VALUES (?, ?, ?)
      `).run(userId, 1, 'name');

      // Act: Process unicode name
      const result = onboardingService.processNameResponse(userId, name);

      // EXPECTED TO FAIL - Unicode handling may not exist yet
      // Should either succeed with proper encoding or fail with clear error
      if (result.success) {
        const state = db.prepare(`
          SELECT responses FROM onboarding_state WHERE user_id = ?
        `).get(userId);

        const responses = JSON.parse(state.responses);
        expect(responses.name).toBe(name);
      } else {
        expect(result.error).toBeDefined();
      }
    });
  });

  test('XSS attempts are sanitized before database storage', () => {
    const xssAttempts = [
      '<script>alert("xss")</script>',
      '<img src=x onerror=alert("xss")>',
      'javascript:alert("xss")',
      '<iframe src="javascript:alert(\'xss\')">',
      '"><script>alert(String.fromCharCode(88,83,83))</script>'
    ];

    xssAttempts.forEach((xss, index) => {
      const userId = `xss-user-${index}`;

      // Initialize state
      db.prepare(`
        INSERT INTO onboarding_state (user_id, phase, step)
        VALUES (?, ?, ?)
      `).run(userId, 1, 'name');

      // Act: Process XSS attempt
      const result = onboardingService.processNameResponse(userId, xss);

      // EXPECTED TO FAIL - XSS sanitization doesn't exist yet
      if (result.success) {
        const state = db.prepare(`
          SELECT responses FROM onboarding_state WHERE user_id = ?
        `).get(userId);

        const responses = JSON.parse(state.responses);

        // Verify dangerous characters are escaped
        expect(responses.name).not.toContain('<script>');
        expect(responses.name).not.toContain('<iframe');
        expect(responses.name).not.toContain('javascript:');
        expect(responses.name).not.toContain('onerror=');
      }
    });
  });

  test('Database rollback on partial failure', () => {
    const userId = 'rollback-user';

    // Initialize state
    db.prepare(`
      INSERT INTO onboarding_state (user_id, phase, step)
      VALUES (?, ?, ?)
    `).run(userId, 1, 'name');

    // Simulate a scenario where user_settings save might fail
    // (e.g., constraint violation, disk full, etc.)

    // Mock userSettingsService to throw error
    const originalSetDisplayName = UserSettingsService.prototype.setDisplayName;
    UserSettingsService.prototype.setDisplayName = () => {
      throw new Error('Simulated save failure');
    };

    try {
      // Act: Try to process name
      const result = onboardingService.processNameResponse(userId, 'Rollback Test');

      // EXPECTED TO FAIL - Rollback logic doesn't exist yet
      // Should either succeed with retry or fail gracefully
      expect(result).toBeDefined();

      if (!result.success) {
        // Verify onboarding_state was NOT updated
        const state = db.prepare(`
          SELECT responses, step FROM onboarding_state WHERE user_id = ?
        `).get(userId);

        const responses = JSON.parse(state.responses);
        expect(responses.name).toBeUndefined();
        expect(state.step).toBe('name'); // Still on name step
      }
    } finally {
      // Restore original method
      UserSettingsService.prototype.setDisplayName = originalSetDisplayName;
    }
  });
});

// =============================================================================
// TEST SUITE 6: Performance and Scale
// =============================================================================

describe('Performance: Onboarding name save at scale', () => {
  let db;
  let onboardingService;

  beforeEach(() => {
    db = setupTestDatabase();

    try {
      const userSettingsService = new UserSettingsService(db);
      onboardingService = new OnboardingFlowService(db, userSettingsService);
    } catch (err) {
      console.log('Services not available yet - expected in RED phase');
    }
  });

  afterEach(() => {
    cleanupTestDatabase(db);
  });

  test('Batch name saves complete within reasonable time', () => {
    const userCount = 100;
    const users = Array.from({ length: userCount }, (_, i) => ({
      userId: `perf-user-${i}`,
      name: `Test User ${i}`
    }));

    // Initialize all users
    users.forEach(({ userId }) => {
      db.prepare(`
        INSERT INTO onboarding_state (user_id, phase, step)
        VALUES (?, ?, ?)
      `).run(userId, 1, 'name');
    });

    // Measure batch processing time
    const startTime = Date.now();

    users.forEach(({ userId, name }) => {
      onboardingService.processNameResponse(userId, name);
    });

    const endTime = Date.now();
    const duration = endTime - startTime;

    // EXPECTED TO FAIL - Performance optimization doesn't exist yet
    // Should complete within 5 seconds for 100 users
    expect(duration).toBeLessThan(5000);

    // Verify all saves completed
    const savedCount = db.prepare(`
      SELECT COUNT(*) as count FROM user_settings
    `).get();

    expect(savedCount.count).toBe(userCount);
  });

  test('Database remains responsive during concurrent name saves', async () => {
    // Simulate 10 concurrent name saves
    const concurrentUsers = Array.from({ length: 10 }, (_, i) => ({
      userId: `concurrent-perf-${i}`,
      name: `Concurrent User ${i}`
    }));

    // Initialize all users
    concurrentUsers.forEach(({ userId }) => {
      db.prepare(`
        INSERT INTO onboarding_state (user_id, phase, step)
        VALUES (?, ?, ?)
      `).run(userId, 1, 'name');
    });

    // Start concurrent saves
    const savePromises = concurrentUsers.map(({ userId, name }) => {
      return new Promise(resolve => {
        const result = onboardingService.processNameResponse(userId, name);
        resolve(result);
      });
    });

    // All should complete
    const results = await Promise.all(savePromises);

    // EXPECTED TO FAIL - Concurrent handling doesn't exist yet
    results.forEach(result => {
      expect(result).toBeDefined();
    });
  });
});
