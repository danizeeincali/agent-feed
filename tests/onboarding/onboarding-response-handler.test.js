/**
 * Unit Tests for Onboarding Response Handler
 * Tests response processing logic for Phase 1 and Phase 2
 */

import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import Database from 'better-sqlite3';
import { createOnboardingResponseHandler } from '../../api-server/services/onboarding/onboarding-response-handler.js';

describe('OnboardingResponseHandler - Unit Tests', () => {
  let db;
  let handler;

  beforeEach(() => {
    // Create in-memory database for testing
    db = new Database(':memory:');

    // Create required tables
    db.exec(`
      CREATE TABLE IF NOT EXISTS user_settings (
        user_id TEXT PRIMARY KEY,
        display_name TEXT NOT NULL,
        display_name_style TEXT,
        profile_json TEXT DEFAULT '{}',
        onboarding_completed INTEGER DEFAULT 0,
        onboarding_completed_at INTEGER,
        created_at INTEGER DEFAULT (unixepoch()),
        updated_at INTEGER DEFAULT (unixepoch())
      ) STRICT;

      CREATE TABLE IF NOT EXISTS onboarding_state (
        user_id TEXT PRIMARY KEY,
        phase INTEGER DEFAULT 1,
        step TEXT,
        phase1_completed INTEGER DEFAULT 0,
        phase1_completed_at INTEGER,
        phase2_completed INTEGER DEFAULT 0,
        phase2_completed_at INTEGER,
        responses TEXT DEFAULT '{}',
        created_at INTEGER NOT NULL,
        updated_at INTEGER NOT NULL
      ) STRICT;
    `);

    handler = createOnboardingResponseHandler(db);
  });

  afterEach(() => {
    db.close();
  });

  // Test 1: Initialize onboarding for first-time user
  it('should initialize onboarding for first-time user', async () => {
    const result = await handler.processResponse('test-user-1', '', null);

    expect(result.success).toBe(true);
    expect(result.action).toBe('initialized');
    expect(result.message).toContain('What should I call you');
    expect(result.examples).toBeDefined();
    expect(result.examples.length).toBeGreaterThan(0);
  });

  // Test 2: Process valid name response
  it('should process valid name response and move to use_case step', async () => {
    // Initialize
    await handler.processResponse('test-user-2', '', null);

    // Submit name
    const result = await handler.processResponse('test-user-2', 'Alex Chen', null);

    expect(result.success).toBe(true);
    expect(result.step).toBe('name');
    expect(result.nextStep).toBe('use_case');
    expect(result.phase).toBe(1);
    expect(result.agentResponse.message).toContain('Alex Chen');
    expect(result.agentResponse.options).toContain('Personal productivity');
  });

  // Test 3: Reject invalid name (too long)
  it('should reject name longer than 50 characters', async () => {
    await handler.processResponse('test-user-3', '', null);

    const longName = 'A'.repeat(51);
    const result = await handler.processResponse('test-user-3', longName, null);

    expect(result.success).toBe(false);
    expect(result.error).toContain('too long');
    expect(result.retry).toBe(true);
  });

  // Test 4: Reject empty name
  it('should reject empty or whitespace-only name', async () => {
    await handler.processResponse('test-user-4', '', null);

    const result = await handler.processResponse('test-user-4', '   ', null);

    expect(result.success).toBe(false);
    expect(result.error).toContain("didn't catch that");
    expect(result.retry).toBe(true);
  });

  // Test 5: Process use case and complete Phase 1
  it('should process use case response and complete Phase 1', async () => {
    // Initialize and submit name
    await handler.processResponse('test-user-5', '', null);
    await handler.processResponse('test-user-5', 'Sarah', null);

    // Submit use case
    const result = await handler.processResponse('test-user-5', 'Personal productivity', null);

    expect(result.success).toBe(true);
    expect(result.step).toBe('use_case');
    expect(result.phase1Complete).toBe(true);
    expect(result.agentResponse.message).toContain('Sarah');
    expect(result.agentResponse.message).toContain('Personal Todos Agent');
    expect(result.triggers.coreAgentIntros).toBe(true);
    expect(result.triggers.agents).toContain('personal-todos-agent');
  });

  // Test 6: Normalize use case variations
  it('should normalize use case variations to standard values', async () => {
    await handler.processResponse('test-user-6', '', null);
    await handler.processResponse('test-user-6', 'John', null);

    // Test various inputs
    const testCases = [
      { input: 'personal productivity', expected: 'personal_productivity' },
      { input: 'BUSINESS MANAGEMENT', expected: 'business' },
      { input: 'creative stuff', expected: 'creative_projects' },
      { input: 'I want to learn', expected: 'learning' },
      { input: 'something else', expected: 'other' }
    ];

    for (const testCase of testCases) {
      const result = await handler.processResponse('test-user-6-' + testCase.expected, testCase.input, null);

      // Check that it was stored correctly by querying the state
      const state = db.prepare('SELECT responses FROM onboarding_state WHERE user_id = ?')
        .get('test-user-6-' + testCase.expected);

      const responses = JSON.parse(state.responses);
      expect(responses.use_case).toBe(testCase.expected);
    }
  });

  // Test 7: Process Phase 2 communication style
  it('should process communication style in Phase 2', async () => {
    // Complete Phase 1 first
    await handler.processResponse('test-user-7', '', null);
    await handler.processResponse('test-user-7', 'Maria', null);
    await handler.processResponse('test-user-7', 'Business', null);

    // Manually trigger Phase 2
    db.prepare(`
      UPDATE onboarding_state
      SET phase = 2, step = 'comm_style'
      WHERE user_id = ?
    `).run('test-user-7');

    // Submit comm style
    const result = await handler.processResponse('test-user-7', 'Casual and friendly', null);

    expect(result.success).toBe(true);
    expect(result.step).toBe('comm_style');
    expect(result.nextStep).toBe('goals');
    expect(result.phase).toBe(2);
  });

  // Test 8: Complete entire Phase 2 flow
  it('should complete Phase 2 with all responses', async () => {
    // Complete Phase 1
    await handler.processResponse('test-user-8', '', null);
    await handler.processResponse('test-user-8', 'David', null);
    await handler.processResponse('test-user-8', 'Creative projects', null);

    // Start Phase 2
    db.prepare(`
      UPDATE onboarding_state
      SET phase = 2, step = 'comm_style'
      WHERE user_id = ?
    `).run('test-user-8');

    // Submit comm style
    await handler.processResponse('test-user-8', 'Adaptive', null);

    // Submit goals
    await handler.processResponse('test-user-8', 'Write a book, Learn photography, Build a website', null);

    // Submit agent preferences (final step)
    const result = await handler.processResponse('test-user-8', 'Creative brainstorming, Task management', null);

    expect(result.success).toBe(true);
    expect(result.step).toBe('agent_prefs');
    expect(result.phase2Complete).toBe(true);
    expect(result.allOnboardingComplete).toBe(true);
    expect(result.agentResponse.message).toContain('David');
    expect(result.agentResponse.summary).toBeDefined();
    expect(result.agentResponse.summary.name).toBe('David');
    expect(result.agentResponse.summary.use_case).toBe('creative_projects');
  });
});
