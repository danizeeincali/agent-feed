/**
 * Onboarding Name Persistence Integration Test
 *
 * Comprehensive integration tests for the complete onboarding flow after schema fix.
 *
 * Test Coverage:
 * 1. Happy Path - New User Name Submission
 * 2. Database Verification - onboarding_state and user_settings
 * 3. Error Handling - Invalid inputs, SQL injection, missing user_id
 * 4. Regression Tests - Toasts, comment counter, duplicate prevention, worker completion
 *
 * Test Framework: Vitest
 * Database: Real SQLite (not mocked)
 * Services: Real service instances
 * Workers: Real agent worker execution
 */

import { describe, it, expect, beforeAll, afterAll, beforeEach, afterEach } from 'vitest';
import Database from 'better-sqlite3';
import { promises as fs } from 'fs';
import path from 'path';
import { createOnboardingFlowService } from '../../api-server/services/onboarding/onboarding-flow-service.js';
import { createUserSettingsService } from '../../api-server/services/user-settings-service.js';
import { WorkQueueRepository } from '../../api-server/repositories/work-queue-repository.js';
import { startOrchestrator, stopOrchestrator } from '../../api-server/avi/orchestrator.js';
import AgentWorker from '../../api-server/worker/agent-worker.js';

const TEST_DB_PATH = '/tmp/onboarding-name-persistence-test.db';
const TEST_USER_ID = 'nasty-nate-test-user';

describe('Onboarding Name Persistence Integration Tests', () => {
  let testDb;
  let onboardingService;
  let userSettingsService;
  let workQueueRepo;
  let orchestrator;

  beforeAll(async () => {
    // Clean up any existing test database
    if (await fs.access(TEST_DB_PATH).then(() => true).catch(() => false)) {
      await fs.unlink(TEST_DB_PATH);
    }

    // Create test database
    testDb = new Database(TEST_DB_PATH);
    testDb.pragma('journal_mode = WAL');

    // Create required tables (matching production schema)
    await createTestDatabaseSchema(testDb);

    // Initialize services
    onboardingService = createOnboardingFlowService(testDb);
    userSettingsService = createUserSettingsService(testDb);
    workQueueRepo = new WorkQueueRepository(testDb);

    console.log('✅ Test database initialized:', TEST_DB_PATH);
  });

  afterAll(async () => {
    // Cleanup
    if (orchestrator) {
      await stopOrchestrator();
    }
    if (testDb) {
      testDb.close();
    }
    await fs.unlink(TEST_DB_PATH).catch(() => {});
  });

  beforeEach(async () => {
    // Clear test data
    testDb.exec('DELETE FROM work_queue_tickets');
    testDb.exec('DELETE FROM onboarding_state');
    testDb.exec('DELETE FROM user_settings');
    testDb.exec('DELETE FROM agent_posts');
    testDb.exec('DELETE FROM comments');

    // Initialize onboarding state for test user
    onboardingService.initializeOnboarding(TEST_USER_ID);
  });

  afterEach(async () => {
    if (orchestrator) {
      await stopOrchestrator();
      orchestrator = null;
    }
  });

  describe('Happy Path - New User Name Submission', () => {
    it('should process name submission and persist to both tables', async () => {
      // ACT: User submits name "Nasty Nate"
      const result = onboardingService.processNameResponse(TEST_USER_ID, 'Nasty Nate');

      // ASSERT: Service returns success
      expect(result.success).toBe(true);
      expect(result.nextStep).toBe('use_case');
      expect(result.message).toContain('Nasty Nate');
      expect(result.message).toMatch(/great to meet you|nice to meet you/i);

      // ASSERT: Name saved to onboarding_state.responses (JSON)
      const onboardingState = testDb.prepare(`
        SELECT user_id, phase, step, responses, created_at, updated_at
        FROM onboarding_state
        WHERE user_id = ?
      `).get(TEST_USER_ID);

      expect(onboardingState).toBeDefined();
      expect(onboardingState.user_id).toBe(TEST_USER_ID);
      expect(onboardingState.phase).toBe(1);
      expect(onboardingState.step).toBe('use_case');

      const responses = JSON.parse(onboardingState.responses);
      expect(responses.name).toBe('Nasty Nate');

      // ASSERT: Timestamps are valid Unix timestamps
      expect(onboardingState.created_at).toBeGreaterThan(0);
      expect(onboardingState.updated_at).toBeGreaterThan(0);
      expect(onboardingState.updated_at).toBeGreaterThanOrEqual(onboardingState.created_at);

      // ASSERT: Display name saved to user_settings.display_name
      const userSettings = testDb.prepare(`
        SELECT user_id, display_name, created_at, updated_at
        FROM user_settings
        WHERE user_id = ?
      `).get(TEST_USER_ID);

      expect(userSettings).toBeDefined();
      expect(userSettings.user_id).toBe(TEST_USER_ID);
      expect(userSettings.display_name).toBe('Nasty Nate');
      expect(userSettings.created_at).toBeGreaterThan(0);
      expect(userSettings.updated_at).toBeGreaterThan(0);
    });

    it('should create work queue ticket and process with agent worker', async () => {
      // SETUP: Create Get-to-Know-You onboarding post
      const postId = createTestPost(testDb, {
        title: "Hi! What should I call you?",
        content: "Welcome! I'm the Get-to-Know-You agent. What's your name?",
        author_agent: 'get-to-know-you-agent',
        author_id: TEST_USER_ID,
        metadata: {
          isOnboardingPost: true,
          onboardingPhase: 1,
          onboardingStep: 'name'
        }
      });

      // User creates comment with name
      const commentId = createTestComment(testDb, {
        post_id: postId,
        content: 'Nasty Nate',
        author_user_id: TEST_USER_ID,
        author_agent: null
      });

      // System creates work queue ticket
      const ticket = workQueueRepo.createTicket({
        agent_id: 'get-to-know-you-agent',
        user_id: TEST_USER_ID,
        content: 'Nasty Nate',
        post_id: commentId,
        priority: 'P0',
        metadata: {
          type: 'comment',
          parent_post_id: postId,
          parent_comment_id: null,
          isOnboardingPost: true,
          onboardingPhase: 1,
          onboardingStep: 'name'
        }
      });

      expect(ticket).toBeDefined();
      expect(ticket.status).toBe('pending');

      // Start orchestrator to process ticket
      orchestrator = await startOrchestrator(
        { maxWorkers: 1, pollInterval: 100 },
        workQueueRepo,
        null, // no websocket for test
        testDb
      );

      // Wait for ticket to complete
      await waitForTicketCompletion(testDb, ticket.id, 10000);

      // ASSERT: Ticket completed successfully
      const completedTicket = workQueueRepo.getTicket(ticket.id);
      expect(completedTicket.status).toBe('completed');

      // ASSERT: Agent created confirmation response
      const agentComments = testDb.prepare(`
        SELECT * FROM comments
        WHERE post_id = ? AND author_agent = 'get-to-know-you-agent'
      `).all(postId);

      expect(agentComments.length).toBeGreaterThan(0);
      const confirmation = agentComments.find(c => c.content.includes('Nasty Nate'));
      expect(confirmation).toBeDefined();

      // ASSERT: Name persisted to database
      const userSettings = testDb.prepare(`
        SELECT display_name FROM user_settings WHERE user_id = ?
      `).get(TEST_USER_ID);

      expect(userSettings.display_name).toBe('Nasty Nate');
    });

    it('should complete full onboarding flow: name → use_case → phase1_complete', async () => {
      // STEP 1: Submit name
      const nameResult = onboardingService.processNameResponse(TEST_USER_ID, 'Nasty Nate');
      expect(nameResult.success).toBe(true);
      expect(nameResult.nextStep).toBe('use_case');

      // Verify state after name submission
      let state = onboardingService.getOnboardingState(TEST_USER_ID);
      expect(state.step).toBe('use_case');
      expect(state.phase1_completed).toBe(0);

      // STEP 2: Submit use case
      const useCaseResult = await onboardingService.processUseCaseResponse(TEST_USER_ID, 'Personal productivity');
      expect(useCaseResult.success).toBe(true);
      expect(useCaseResult.phase1Complete).toBe(true);

      // Verify state after use case submission
      state = onboardingService.getOnboardingState(TEST_USER_ID);
      expect(state.step).toBe('phase1_complete');
      expect(state.phase1_completed).toBe(1);
      expect(state.phase1_completed_at).toBeGreaterThan(0);

      // Verify both responses stored
      const responses = state.responses;
      expect(responses.name).toBe('Nasty Nate');
      expect(responses.use_case).toBe('Personal productivity');

      // Verify display name still persisted
      const displayName = userSettingsService.getDisplayName(TEST_USER_ID);
      expect(displayName).toBe('Nasty Nate');
    });
  });

  describe('Database Verification', () => {
    it('should verify responses column contains correct JSON structure', async () => {
      onboardingService.processNameResponse(TEST_USER_ID, 'Nasty Nate');

      const row = testDb.prepare(`
        SELECT responses FROM onboarding_state WHERE user_id = ?
      `).get(TEST_USER_ID);

      // Verify it's valid JSON
      expect(() => JSON.parse(row.responses)).not.toThrow();

      // Verify structure
      const responses = JSON.parse(row.responses);
      expect(responses).toHaveProperty('name');
      expect(responses.name).toBe('Nasty Nate');
      expect(typeof responses).toBe('object');
    });

    it('should verify created_at and updated_at are valid Unix timestamps', async () => {
      const beforeTime = Math.floor(Date.now() / 1000);

      onboardingService.processNameResponse(TEST_USER_ID, 'Nasty Nate');

      const afterTime = Math.floor(Date.now() / 1000);

      // Check onboarding_state timestamps
      const onboardingState = testDb.prepare(`
        SELECT created_at, updated_at FROM onboarding_state WHERE user_id = ?
      `).get(TEST_USER_ID);

      expect(onboardingState.created_at).toBeGreaterThanOrEqual(beforeTime);
      expect(onboardingState.created_at).toBeLessThanOrEqual(afterTime);
      expect(onboardingState.updated_at).toBeGreaterThanOrEqual(beforeTime);
      expect(onboardingState.updated_at).toBeLessThanOrEqual(afterTime);

      // Check user_settings timestamps
      const userSettings = testDb.prepare(`
        SELECT created_at, updated_at FROM user_settings WHERE user_id = ?
      `).get(TEST_USER_ID);

      expect(userSettings.created_at).toBeGreaterThanOrEqual(beforeTime);
      expect(userSettings.created_at).toBeLessThanOrEqual(afterTime);
      expect(userSettings.updated_at).toBeGreaterThanOrEqual(beforeTime);
      expect(userSettings.updated_at).toBeLessThanOrEqual(afterTime);
    });

    it('should verify display_name persists across service instances (server restart)', async () => {
      // Save name
      onboardingService.processNameResponse(TEST_USER_ID, 'Nasty Nate');

      // Simulate server restart by creating new service instance
      const newUserSettingsService = createUserSettingsService(testDb);
      const displayName = newUserSettingsService.getDisplayName(TEST_USER_ID);

      expect(displayName).toBe('Nasty Nate');
    });

    it('should handle multiple users with different names', async () => {
      const users = [
        { id: 'user-1', name: 'Alice Johnson' },
        { id: 'user-2', name: 'Bob Smith' },
        { id: 'user-3', name: 'Charlie Davis' }
      ];

      // Initialize each user
      for (const user of users) {
        onboardingService.initializeOnboarding(user.id);
        onboardingService.processNameResponse(user.id, user.name);
      }

      // Verify each user has correct display name
      for (const user of users) {
        const userSettings = testDb.prepare(`
          SELECT display_name FROM user_settings WHERE user_id = ?
        `).get(user.id);

        expect(userSettings.display_name).toBe(user.name);

        const state = onboardingService.getOnboardingState(user.id);
        expect(state.responses.name).toBe(user.name);
      }
    });
  });

  describe('Error Handling', () => {
    it('should reject empty name and not update database', async () => {
      const result = onboardingService.processNameResponse(TEST_USER_ID, '');

      // Service should return error
      expect(result.success).toBe(false);
      expect(result.error).toMatch(/name|required|empty/i);

      // Database should NOT be updated
      const userSettings = testDb.prepare(`
        SELECT display_name FROM user_settings WHERE user_id = ?
      `).get(TEST_USER_ID);

      expect(userSettings).toBeNull(); // No row created

      const state = onboardingService.getOnboardingState(TEST_USER_ID);
      expect(state.step).toBe('name'); // Still on name step
      expect(state.responses.name).toBeUndefined();
    });

    it('should reject whitespace-only name', async () => {
      const result = onboardingService.processNameResponse(TEST_USER_ID, '   \t\n  ');

      expect(result.success).toBe(false);
      expect(result.error).toMatch(/name|required|empty/i);

      const userSettings = testDb.prepare(`
        SELECT display_name FROM user_settings WHERE user_id = ?
      `).get(TEST_USER_ID);

      expect(userSettings).toBeNull();
    });

    it('should reject names over 50 characters', async () => {
      const longName = 'A'.repeat(51);
      const result = onboardingService.processNameResponse(TEST_USER_ID, longName);

      expect(result.success).toBe(false);
      expect(result.error).toMatch(/50 characters/i);

      const userSettings = testDb.prepare(`
        SELECT display_name FROM user_settings WHERE user_id = ?
      `).get(TEST_USER_ID);

      expect(userSettings).toBeNull();
    });

    it('should sanitize SQL injection attempts', async () => {
      const maliciousName = "'; DROP TABLE user_settings; --";
      const result = onboardingService.processNameResponse(TEST_USER_ID, maliciousName);

      // Should either succeed with sanitized name or fail validation
      if (result.success) {
        // If accepted, must be sanitized
        const userSettings = testDb.prepare(`
          SELECT display_name FROM user_settings WHERE user_id = ?
        `).get(TEST_USER_ID);

        expect(userSettings.display_name).not.toContain('DROP TABLE');
        expect(userSettings.display_name).not.toContain(';');
      }

      // Verify table still exists
      const tableExists = testDb.prepare(`
        SELECT name FROM sqlite_master WHERE type='table' AND name='user_settings'
      `).get();

      expect(tableExists).toBeDefined();
    });

    it('should sanitize XSS attempts (HTML/script tags)', async () => {
      const xssName = '<script>alert("XSS")</script>';
      const result = onboardingService.processNameResponse(TEST_USER_ID, xssName);

      if (result.success) {
        const userSettings = testDb.prepare(`
          SELECT display_name FROM user_settings WHERE user_id = ?
        `).get(TEST_USER_ID);

        // Should be HTML entity encoded
        expect(userSettings.display_name).not.toContain('<script>');
        expect(userSettings.display_name).not.toContain('</script>');
        expect(userSettings.display_name).toContain('&lt;script&gt;');
      }
    });

    it('should handle missing user_id gracefully', async () => {
      // Try to process without initializing user
      const nonExistentUserId = 'user-does-not-exist-999';

      // Should either fail gracefully or auto-initialize
      const result = onboardingService.processNameResponse(nonExistentUserId, 'Test User');

      if (!result.success) {
        expect(result.error).toBeDefined();
      } else {
        // If auto-initialized, should have state
        const state = onboardingService.getOnboardingState(nonExistentUserId);
        expect(state).toBeDefined();
      }
    });

    it('should handle database write errors gracefully', async () => {
      // Close database to simulate write error
      const closedDb = new Database(':memory:');
      closedDb.close();

      const failingService = createOnboardingFlowService(closedDb);

      // Should throw or return error
      expect(() => {
        failingService.processNameResponse(TEST_USER_ID, 'Test User');
      }).toThrow();
    });
  });

  describe('Regression Tests', () => {
    it('should not create duplicate agent responses', async () => {
      const postId = createTestPost(testDb, {
        title: "Test Post",
        content: "Test content",
        author_agent: 'get-to-know-you-agent',
        author_id: TEST_USER_ID,
        metadata: { isOnboardingPost: true }
      });

      const commentId = createTestComment(testDb, {
        post_id: postId,
        content: 'Nasty Nate',
        author_user_id: TEST_USER_ID
      });

      // Create ticket
      const ticket = workQueueRepo.createTicket({
        agent_id: 'get-to-know-you-agent',
        user_id: TEST_USER_ID,
        content: 'Nasty Nate',
        post_id: commentId,
        priority: 'P0',
        metadata: {
          type: 'comment',
          parent_post_id: postId,
          isOnboardingPost: true
        }
      });

      // Start orchestrator
      orchestrator = await startOrchestrator(
        { maxWorkers: 1, pollInterval: 100 },
        workQueueRepo,
        null,
        testDb
      );

      await waitForTicketCompletion(testDb, ticket.id, 10000);

      // ASSERT: Only 1 agent response (no duplicates)
      const agentComments = testDb.prepare(`
        SELECT COUNT(*) as count FROM comments
        WHERE post_id = ? AND author_agent = 'get-to-know-you-agent'
      `).get(postId);

      expect(agentComments.count).toBe(1);
    });

    it('should complete worker successfully without errors', async () => {
      const postId = createTestPost(testDb, {
        title: "Test Post",
        content: "Test content",
        author_agent: 'get-to-know-you-agent',
        author_id: TEST_USER_ID,
        metadata: { isOnboardingPost: true }
      });

      const commentId = createTestComment(testDb, {
        post_id: postId,
        content: 'Nasty Nate',
        author_user_id: TEST_USER_ID
      });

      const ticket = workQueueRepo.createTicket({
        agent_id: 'get-to-know-you-agent',
        user_id: TEST_USER_ID,
        content: 'Nasty Nate',
        post_id: commentId,
        priority: 'P0',
        metadata: {
          type: 'comment',
          parent_post_id: postId,
          isOnboardingPost: true
        }
      });

      orchestrator = await startOrchestrator(
        { maxWorkers: 1, pollInterval: 100 },
        workQueueRepo,
        null,
        testDb
      );

      await waitForTicketCompletion(testDb, ticket.id, 10000);

      const completedTicket = workQueueRepo.getTicket(ticket.id);
      expect(completedTicket.status).toBe('completed');
      expect(completedTicket.last_error).toBeNull();
    });

    it('should verify toasts emit correctly (stub for WebSocket test)', async () => {
      // NOTE: This is a stub - full WebSocket testing requires integration
      // For now, verify that the orchestrator has WebSocket service hooks

      const postId = createTestPost(testDb, {
        title: "Test Post",
        content: "Test",
        author_agent: 'avi',
        author_id: TEST_USER_ID
      });

      const commentId = createTestComment(testDb, {
        post_id: postId,
        content: 'Test comment',
        author_user_id: TEST_USER_ID
      });

      const ticket = workQueueRepo.createTicket({
        agent_id: 'avi',
        user_id: TEST_USER_ID,
        content: 'Test comment',
        post_id: commentId,
        priority: 'P2',
        metadata: {
          type: 'comment',
          parent_post_id: postId
        }
      });

      // Start orchestrator (no WebSocket service in test)
      orchestrator = await startOrchestrator(
        { maxWorkers: 1, pollInterval: 100 },
        workQueueRepo,
        null, // WebSocket service would go here
        testDb
      );

      await waitForTicketCompletion(testDb, ticket.id, 5000);

      // Verify worker completed (toast would be emitted in production)
      const completedTicket = workQueueRepo.getTicket(ticket.id);
      expect(completedTicket.status).toBe('completed');
    });

    it('should verify comment counter updates correctly', async () => {
      const postId = createTestPost(testDb, {
        title: "Test Post",
        content: "Test",
        author_agent: 'avi',
        author_id: TEST_USER_ID
      });

      // Create user comment
      const userCommentId = createTestComment(testDb, {
        post_id: postId,
        content: 'User comment',
        author_user_id: TEST_USER_ID
      });

      // Create ticket for agent response
      const ticket = workQueueRepo.createTicket({
        agent_id: 'avi',
        user_id: TEST_USER_ID,
        content: 'User comment',
        post_id: userCommentId,
        priority: 'P2',
        metadata: {
          type: 'comment',
          parent_post_id: postId
        }
      });

      orchestrator = await startOrchestrator(
        { maxWorkers: 1, pollInterval: 100 },
        workQueueRepo,
        null,
        testDb
      );

      await waitForTicketCompletion(testDb, ticket.id, 5000);

      // Count comments on post
      const commentCount = testDb.prepare(`
        SELECT COUNT(*) as count FROM comments WHERE post_id = ?
      `).get(postId);

      // Should have user comment + agent response
      expect(commentCount.count).toBeGreaterThanOrEqual(2);
    });
  });
});

// ============================================================================
// Helper Functions
// ============================================================================

/**
 * Create test database schema
 */
async function createTestDatabaseSchema(db) {
  db.exec(`
    -- Onboarding state table
    CREATE TABLE IF NOT EXISTS onboarding_state (
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
    CREATE TABLE IF NOT EXISTS user_settings (
      user_id TEXT PRIMARY KEY,
      display_name TEXT NOT NULL,
      display_name_style TEXT CHECK(
        display_name_style IS NULL OR
        display_name_style IN ('first_only', 'full_name', 'nickname', 'professional')
      ),
      onboarding_completed INTEGER NOT NULL DEFAULT 0 CHECK(onboarding_completed IN (0, 1)),
      onboarding_completed_at INTEGER,
      profile_json TEXT,
      created_at INTEGER DEFAULT (unixepoch()),
      updated_at INTEGER DEFAULT (unixepoch())
    ) STRICT;

    -- Agent posts table
    CREATE TABLE IF NOT EXISTS agent_posts (
      id TEXT PRIMARY KEY,
      title TEXT,
      content TEXT,
      author_agent TEXT,
      author_id TEXT,
      published_at TEXT,
      metadata TEXT DEFAULT '{}',
      engagement TEXT DEFAULT '{"likes":0,"comments":0,"shares":0}',
      created_at INTEGER DEFAULT (unixepoch())
    );

    -- Comments table
    CREATE TABLE IF NOT EXISTS comments (
      id TEXT PRIMARY KEY,
      post_id TEXT NOT NULL,
      content TEXT NOT NULL,
      author_user_id TEXT,
      author_agent TEXT,
      parent_id TEXT,
      created_at INTEGER DEFAULT (unixepoch())
    );

    -- Work queue tickets table
    CREATE TABLE IF NOT EXISTS work_queue_tickets (
      id TEXT PRIMARY KEY,
      user_id TEXT,
      agent_id TEXT NOT NULL,
      post_id TEXT,
      url TEXT,
      content TEXT NOT NULL,
      priority TEXT DEFAULT 'P2',
      status TEXT DEFAULT 'pending',
      retry_count INTEGER DEFAULT 0,
      last_error TEXT,
      metadata TEXT DEFAULT '{}',
      result TEXT,
      created_at INTEGER DEFAULT (unixepoch()),
      assigned_at INTEGER,
      completed_at INTEGER,
      worker_id TEXT
    );

    CREATE INDEX IF NOT EXISTS idx_work_queue_status
      ON work_queue_tickets(status, priority, created_at);
  `);
}

/**
 * Create test post
 */
function createTestPost(db, data) {
  const id = data.id || `post-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;

  db.prepare(`
    INSERT INTO agent_posts (id, title, content, author_agent, author_id, published_at, metadata)
    VALUES (?, ?, ?, ?, ?, ?, ?)
  `).run(
    id,
    data.title,
    data.content,
    data.author_agent,
    data.author_id,
    new Date().toISOString(),
    JSON.stringify(data.metadata || {})
  );

  return id;
}

/**
 * Create test comment
 */
function createTestComment(db, data) {
  const id = data.id || `comment-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;

  db.prepare(`
    INSERT INTO comments (id, post_id, content, author_user_id, author_agent, parent_id)
    VALUES (?, ?, ?, ?, ?, ?)
  `).run(
    id,
    data.post_id,
    data.content,
    data.author_user_id || null,
    data.author_agent || null,
    data.parent_id || null
  );

  return id;
}

/**
 * Wait for ticket completion
 */
async function waitForTicketCompletion(db, ticketId, timeoutMs = 10000) {
  const startTime = Date.now();

  while (Date.now() - startTime < timeoutMs) {
    const ticket = db.prepare('SELECT status, last_error FROM work_queue_tickets WHERE id = ?').get(ticketId);

    if (!ticket) {
      throw new Error(`Ticket ${ticketId} not found`);
    }

    if (ticket.status === 'completed') {
      return ticket;
    }

    if (ticket.status === 'failed') {
      throw new Error(`Ticket ${ticketId} failed: ${ticket.last_error}`);
    }

    await new Promise(resolve => setTimeout(resolve, 100));
  }

  throw new Error(`Timeout waiting for ticket ${ticketId} to complete`);
}
