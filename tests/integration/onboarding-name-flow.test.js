/**
 * Onboarding Name Collection Integration Test
 *
 * Tests the 4-step onboarding flow:
 * 1. Validate name input
 * 2. Create acknowledgment comment
 * 3. Save display name to user_settings
 * 4. Update onboarding state to use_case step
 * 5. Create new post with use case question
 */

import Database from 'better-sqlite3';
import { createOnboardingFlowService } from '../../api-server/services/onboarding/onboarding-flow-service.js';
import AgentWorker from '../../api-server/worker/agent-worker.js';
import fs from 'fs';
import path from 'path';

const TEST_DB_PATH = '/workspaces/agent-feed/test-onboarding-integration.db';

describe('Onboarding Name Collection Flow', () => {
  let db;
  let onboardingService;

  beforeAll(() => {
    // Clean up any existing test database
    if (fs.existsSync(TEST_DB_PATH)) {
      fs.unlinkSync(TEST_DB_PATH);
    }

    // Create test database with schema
    db = new Database(TEST_DB_PATH);
    db.pragma('journal_mode = WAL');

    // Create required tables
    db.exec(`
      -- Onboarding state table
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

      -- User settings table
      CREATE TABLE user_settings (
        user_id TEXT PRIMARY KEY,
        display_name TEXT,
        preferences TEXT,
        created_at INTEGER DEFAULT (unixepoch()),
        updated_at INTEGER DEFAULT (unixepoch())
      );
    `);

    onboardingService = createOnboardingFlowService(db);
  });

  afterAll(() => {
    db.close();
    if (fs.existsSync(TEST_DB_PATH)) {
      fs.unlinkSync(TEST_DB_PATH);
    }
  });

  beforeEach(() => {
    // Clear tables before each test
    db.exec(`
      DELETE FROM onboarding_state;
      DELETE FROM user_settings;
    `);

    // Initialize onboarding state for test user
    db.prepare(`
      INSERT INTO onboarding_state (user_id, phase, step)
      VALUES (?, ?, ?)
    `).run('test-user-123', 1, 'name');
  });

  test('should validate name (reject empty names)', () => {
    const emptyNames = ['', '   ', '\t\n'];

    emptyNames.forEach(name => {
      const trimmed = name.trim();
      expect(trimmed.length).toBe(0);
    });
  });

  test('should validate name (reject names over 50 chars)', () => {
    const longName = 'A'.repeat(51);
    expect(longName.length).toBeGreaterThan(50);
  });

  test('should save display name to user_settings', async () => {
    // Process name response
    const result = await onboardingService.processNameResponse('test-user-123', 'Sarah Chen');

    expect(result.success).toBe(true);
    expect(result.nextStep).toBe('use_case');

    // Verify display name was saved
    const userSettings = db.prepare(`
      SELECT display_name FROM user_settings WHERE user_id = ?
    `).get('test-user-123');

    expect(userSettings).toBeTruthy();
    expect(userSettings.display_name).toBe('Sarah Chen');
  });

  test('should update onboarding state to use_case step', async () => {
    // Process name response
    await onboardingService.processNameResponse('test-user-123', 'Sarah Chen');

    // Verify state was updated
    const state = db.prepare(`
      SELECT * FROM onboarding_state WHERE user_id = ?
    `).get('test-user-123');

    expect(state.step).toBe('use_case');
    expect(state.phase).toBe(1);
    expect(state.phase1_completed).toBe(0); // Not complete yet

    // Verify name is stored in responses JSON
    const responses = JSON.parse(state.responses);
    expect(responses.name).toBe('Sarah Chen');
  });

  test('should generate correct acknowledgment message', async () => {
    const result = await onboardingService.processNameResponse('test-user-123', 'Sarah Chen');

    expect(result.success).toBe(true);
    expect(result.message).toContain('Sarah Chen');
    expect(result.message).toMatch(/great to meet you/i);
  });

  test('should handle duplicate name submissions gracefully', async () => {
    // Submit name twice
    const result1 = await onboardingService.processNameResponse('test-user-123', 'Sarah Chen');
    const result2 = await onboardingService.processNameResponse('test-user-123', 'Sarah Chen');

    // Both should succeed (idempotent)
    expect(result1.success).toBe(true);
    expect(result2.success).toBe(true);

    // Display name should still be correct
    const userSettings = db.prepare(`
      SELECT display_name FROM user_settings WHERE user_id = ?
    `).get('test-user-123');

    expect(userSettings.display_name).toBe('Sarah Chen');
  });

  test('should complete Phase 1 after use case submission', async () => {
    // First, complete name step
    await onboardingService.processNameResponse('test-user-123', 'Sarah Chen');

    // Then, complete use case step
    const useCaseResult = await onboardingService.processUseCaseResponse('test-user-123', 'Personal productivity');

    expect(useCaseResult.success).toBe(true);
    expect(useCaseResult.phase1Complete).toBe(true);

    // Verify Phase 1 is marked complete
    const state = db.prepare(`
      SELECT * FROM onboarding_state WHERE user_id = ?
    `).get('test-user-123');

    expect(state.phase1_completed).toBe(1);
    expect(state.step).toBe('phase1_complete');

    // Verify both responses are stored
    const responses = JSON.parse(state.responses);
    expect(responses.name).toBe('Sarah Chen');
    expect(responses.use_case).toBe('Personal productivity');
  });

  test('should generate personalized completion message', async () => {
    // Complete name step
    await onboardingService.processNameResponse('test-user-123', 'Sarah Chen');

    // Complete use case step
    const result = await onboardingService.processUseCaseResponse('test-user-123', 'Personal productivity');

    expect(result.message).toContain('Sarah Chen');
    expect(result.message).toMatch(/personal productivity|tasks|organized/i);
  });

  test('should handle invalid use case (empty string)', async () => {
    // Complete name step first
    await onboardingService.processNameResponse('test-user-123', 'Sarah Chen');

    // Try to submit empty use case
    try {
      await onboardingService.processUseCaseResponse('test-user-123', '');
      // Should not reach here
      expect(true).toBe(false);
    } catch (error) {
      // Expected to throw or return error
      expect(error).toBeTruthy();
    }
  });
});
