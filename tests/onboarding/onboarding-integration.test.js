/**
 * Integration Tests for Onboarding Flow
 * Tests Phase 1 → Phase 2 transitions and complete onboarding journey
 */

import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import Database from 'better-sqlite3';
import { createOnboardingFlowService } from '../../api-server/services/onboarding/onboarding-flow-service.js';
import { createOnboardingStateService } from '../../api-server/services/onboarding/onboarding-state-service.js';
import { createOnboardingResponseHandler } from '../../api-server/services/onboarding/onboarding-response-handler.js';
import { createUserSettingsService } from '../../api-server/services/user-settings-service.js';

describe('Onboarding Integration Tests', () => {
  let db;
  let flowService;
  let stateService;
  let handler;
  let userSettingsService;

  beforeEach(() => {
    db = new Database(':memory:');

    // Create tables
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

    flowService = createOnboardingFlowService(db);
    stateService = createOnboardingStateService(db);
    handler = createOnboardingResponseHandler(db);
    userSettingsService = createUserSettingsService(db);
  });

  afterEach(() => {
    db.close();
  });

  // Integration Test 1: Complete Phase 1 flow (name → use_case → completion)
  it('should complete Phase 1 onboarding flow end-to-end', async () => {
    const userId = 'integration-test-1';

    // Step 1: Initialize
    const init = await handler.processResponse(userId, '', null);
    expect(init.success).toBe(true);
    expect(init.action).toBe('initialized');

    // Step 2: Submit name
    const nameResponse = await handler.processResponse(userId, 'Alice Johnson', null);
    expect(nameResponse.success).toBe(true);
    expect(nameResponse.nextStep).toBe('use_case');

    // Verify name stored in user_settings
    const userSettings = userSettingsService.getUserSettings(userId);
    expect(userSettings.display_name).toBe('Alice Johnson');

    // Step 3: Submit use case
    const useCaseResponse = await handler.processResponse(userId, 'Business management', null);
    expect(useCaseResponse.success).toBe(true);
    expect(useCaseResponse.phase1Complete).toBe(true);

    // Verify Phase 1 completion in state
    const state = stateService.getState(userId);
    expect(state.phase1_completed).toBe(1);
    expect(state.phase1_completed_at).toBeDefined();
    expect(state.responses.name).toBe('Alice Johnson');
    expect(state.responses.use_case).toBe('business');

    // Verify profile updated
    const updatedSettings = userSettingsService.getUserSettings(userId);
    expect(updatedSettings.profile_json.use_case).toBe('business');
  });

  // Integration Test 2: Phase 1 → Phase 2 transition
  it('should transition from Phase 1 to Phase 2 correctly', async () => {
    const userId = 'integration-test-2';

    // Complete Phase 1
    await handler.processResponse(userId, '', null);
    await handler.processResponse(userId, 'Bob Smith', null);
    await handler.processResponse(userId, 'Learning & development', null);

    // Verify Phase 1 complete
    let state = stateService.getState(userId);
    expect(state.phase1_completed).toBe(1);
    expect(state.phase2_completed).toBe(0);

    // Trigger Phase 2
    const phase2Trigger = flowService.triggerPhase2(userId);
    expect(phase2Trigger.success).toBe(true);
    expect(phase2Trigger.phase).toBe(2);
    expect(phase2Trigger.step).toBe('comm_style');

    // Verify state updated to Phase 2
    state = stateService.getState(userId);
    expect(state.phase).toBe(2);
    expect(state.step).toBe('comm_style');
  });

  // Integration Test 3: Complete onboarding journey (Phase 1 + Phase 2)
  it('should complete entire onboarding journey from start to finish', async () => {
    const userId = 'integration-test-3';
    const startTime = Date.now();

    // Phase 1: Initialize
    await handler.processResponse(userId, '', null);

    // Phase 1: Name
    await handler.processResponse(userId, 'Charlie Davis', null);

    // Phase 1: Use Case (completes Phase 1)
    const phase1Complete = await handler.processResponse(userId, 'Personal productivity', null);
    expect(phase1Complete.phase1Complete).toBe(true);

    // Verify Phase 1 timing (should be fast)
    const phase1Time = Date.now() - startTime;
    console.log(`Phase 1 completion time: ${phase1Time}ms`);
    // In real usage, Phase 1 should complete in <3 minutes (180000ms)
    // For automated tests, we just verify it completed
    expect(phase1Time).toBeLessThan(5000); // 5 seconds for test execution

    // Trigger Phase 2
    flowService.triggerPhase2(userId);

    // Phase 2: Communication Style
    await handler.processResponse(userId, 'Casual', null);

    // Phase 2: Goals
    await handler.processResponse(userId, 'Get organized, Save time, Reduce stress', null);

    // Phase 2: Agent Preferences (completes Phase 2)
    const phase2Complete = await handler.processResponse(userId, 'Task management, Strategic planning', null);
    expect(phase2Complete.phase2Complete).toBe(true);
    expect(phase2Complete.allOnboardingComplete).toBe(true);

    // Verify complete state
    const finalState = stateService.getProgressSummary(userId);
    expect(finalState.phase1_complete).toBe(true);
    expect(finalState.phase2_complete).toBe(true);
    expect(finalState.responses_collected).toContain('name');
    expect(finalState.responses_collected).toContain('use_case');
    expect(finalState.responses_collected).toContain('comm_style');
    expect(finalState.responses_collected).toContain('goals');
    expect(finalState.responses_collected).toContain('agent_prefs');

    // Verify all responses stored
    const allResponses = stateService.getAllResponses(userId);
    expect(allResponses.name).toBe('Charlie Davis');
    expect(allResponses.use_case).toBe('personal_productivity');
    expect(allResponses.comm_style).toBe('casual');
    expect(allResponses.goals).toEqual(['Get organized', 'Save time', 'Reduce stress']);
    expect(allResponses.agent_prefs).toEqual(['Task management', 'Strategic planning']);
  });
});
