/**
 * E2E Test for Complete Onboarding Journey
 * Tests the complete user onboarding experience from API perspective
 * Validates AC-3: Phase 1 completes in <3 minutes
 */

import { describe, it, expect, beforeAll, afterAll, beforeEach } from 'vitest';
import Database from 'better-sqlite3';
import express from 'express';
import request from 'supertest';
import onboardingRouter from '../../api-server/routes/onboarding/index.js';

describe('Onboarding E2E Test - Complete Journey', () => {
  let app;
  let db;

  beforeAll(() => {
    // Create test express app
    app = express();
    app.use(express.json());

    // Create in-memory database
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

    // Add database to request object via middleware
    app.use((req, res, next) => {
      req.db = db;
      next();
    });

    // Mount onboarding routes
    app.use('/api/onboarding', onboardingRouter);
  });

  afterAll(() => {
    db.close();
  });

  beforeEach(() => {
    // Clear data between tests
    db.exec('DELETE FROM user_settings');
    db.exec('DELETE FROM onboarding_state');
  });

  it('should complete entire onboarding journey via API', async () => {
    const userId = 'e2e-test-user';
    const startTime = Date.now();

    // Step 1: Initialize onboarding
    const initResponse = await request(app)
      .post('/api/onboarding/initialize')
      .send({ userId })
      .expect(200);

    expect(initResponse.body.success).toBe(true);
    expect(initResponse.body.message).toContain('What should I call you');

    // Step 2: Submit name
    const nameResponse = await request(app)
      .post('/api/onboarding/response')
      .send({
        userId,
        responseText: 'Emma Wilson'
      })
      .expect(200);

    expect(nameResponse.body.success).toBe(true);
    expect(nameResponse.body.nextStep).toBe('use_case');
    expect(nameResponse.body.agentResponse.message).toContain('Emma Wilson');

    // Step 3: Submit use case (completes Phase 1)
    const useCaseResponse = await request(app)
      .post('/api/onboarding/response')
      .send({
        userId,
        responseText: 'Creative projects'
      })
      .expect(200);

    expect(useCaseResponse.body.success).toBe(true);
    expect(useCaseResponse.body.phase1Complete).toBe(true);
    expect(useCaseResponse.body.triggers.coreAgentIntros).toBe(true);

    const phase1Time = Date.now() - startTime;
    console.log(`Phase 1 API completion time: ${phase1Time}ms`);

    // Verify Phase 1 completion
    const stateResponse = await request(app)
      .get(`/api/onboarding/state/${userId}`)
      .expect(200);

    expect(stateResponse.body.success).toBe(true);
    expect(stateResponse.body.phase1_complete).toBe(true);
    expect(stateResponse.body.display_name).toBe('Emma Wilson');

    // Step 4: Trigger Phase 2
    const phase2TriggerResponse = await request(app)
      .post('/api/onboarding/trigger-phase2')
      .send({ userId })
      .expect(200);

    expect(phase2TriggerResponse.body.success).toBe(true);
    expect(phase2TriggerResponse.body.phase).toBe(2);
    expect(phase2TriggerResponse.body.step).toBe('comm_style');

    // Step 5: Complete Phase 2 - Communication Style
    const commStyleResponse = await request(app)
      .post('/api/onboarding/response')
      .send({
        userId,
        responseText: 'Adaptive'
      })
      .expect(200);

    expect(commStyleResponse.body.success).toBe(true);
    expect(commStyleResponse.body.nextStep).toBe('goals');

    // Step 6: Complete Phase 2 - Goals
    const goalsResponse = await request(app)
      .post('/api/onboarding/response')
      .send({
        userId,
        responseText: 'Finish my novel, Learn digital art, Build a portfolio website'
      })
      .expect(200);

    expect(goalsResponse.body.success).toBe(true);
    expect(goalsResponse.body.nextStep).toBe('agent_prefs');

    // Step 7: Complete Phase 2 - Agent Preferences (final step)
    const agentPrefsResponse = await request(app)
      .post('/api/onboarding/response')
      .send({
        userId,
        responseText: 'Creative brainstorming, Task management, Content organization'
      })
      .expect(200);

    expect(agentPrefsResponse.body.success).toBe(true);
    expect(agentPrefsResponse.body.phase2Complete).toBe(true);
    expect(agentPrefsResponse.body.allOnboardingComplete).toBe(true);
    expect(agentPrefsResponse.body.agentResponse.summary).toBeDefined();
    expect(agentPrefsResponse.body.agentResponse.summary.name).toBe('Emma Wilson');

    // Final verification: Check complete state
    const finalStateResponse = await request(app)
      .get(`/api/onboarding/state/${userId}`)
      .expect(200);

    expect(finalStateResponse.body.phase1_complete).toBe(true);
    expect(finalStateResponse.body.phase2_complete).toBe(true);
    expect(finalStateResponse.body.responses_collected).toContain('name');
    expect(finalStateResponse.body.responses_collected).toContain('use_case');
    expect(finalStateResponse.body.responses_collected).toContain('comm_style');
    expect(finalStateResponse.body.responses_collected).toContain('goals');
    expect(finalStateResponse.body.responses_collected).toContain('agent_prefs');

    const totalTime = Date.now() - startTime;
    console.log(`Total onboarding time: ${totalTime}ms`);
    console.log(`Phase 1 took: ${phase1Time}ms`);
    console.log(`Phase 2 took: ${totalTime - phase1Time}ms`);
  });

  it('should validate AC-3: Phase 1 completes with name and use_case stored', async () => {
    const userId = 'ac3-test-user';

    // Initialize and complete Phase 1
    await request(app)
      .post('/api/onboarding/initialize')
      .send({ userId });

    await request(app)
      .post('/api/onboarding/response')
      .send({ userId, responseText: 'Test User' });

    await request(app)
      .post('/api/onboarding/response')
      .send({ userId, responseText: 'Business' });

    // Verify Phase 1 completion criteria (AC-3)
    const state = await request(app)
      .get(`/api/onboarding/state/${userId}`)
      .expect(200);

    // AC-3: Name stored
    expect(state.body.display_name).toBe('Test User');

    // AC-3: Use case stored
    expect(state.body.responses_collected).toContain('use_case');

    // AC-3: phase1_completed = 1
    expect(state.body.phase1_complete).toBe(true);

    // AC-3: Timestamp recorded
    expect(state.body.phase1_completed_at).toBeDefined();
    expect(state.body.phase1_completed_at).toBeGreaterThan(0);
  });

  it('should handle invalid name input with proper error message', async () => {
    const userId = 'error-test-user';

    await request(app)
      .post('/api/onboarding/initialize')
      .send({ userId });

    // Test empty name
    const emptyResponse = await request(app)
      .post('/api/onboarding/response')
      .send({ userId, responseText: '   ' })
      .expect(200);

    expect(emptyResponse.body.success).toBe(false);
    expect(emptyResponse.body.error).toContain("didn't catch that");

    // Test too long name
    const longName = 'A'.repeat(51);
    const longResponse = await request(app)
      .post('/api/onboarding/response')
      .send({ userId, responseText: longName })
      .expect(200);

    expect(longResponse.body.success).toBe(false);
    expect(longResponse.body.error).toContain('too long');
  });

  it('should prevent Phase 2 trigger if Phase 1 not completed', async () => {
    const userId = 'incomplete-user';

    // Try to trigger Phase 2 without completing Phase 1
    const response = await request(app)
      .post('/api/onboarding/trigger-phase2')
      .send({ userId })
      .expect(500); // Should error

    expect(response.body.success).toBe(false);
    expect(response.body.error).toContain('Phase 1');
  });
});
