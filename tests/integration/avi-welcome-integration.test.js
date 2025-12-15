/**
 * Avi Welcome Post Integration Test
 * Tests the actual onboarding-flow-service implementation
 */

import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import Database from 'better-sqlite3';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import { createOnboardingFlowService } from '../../api-server/services/onboarding/onboarding-flow-service.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Test database path
const TEST_DB_PATH = path.join(__dirname, '../avi-welcome-integration-test.db');

/**
 * Setup test database with required schema
 */
function setupTestDatabase() {
  // Clean up any existing test database
  if (fs.existsSync(TEST_DB_PATH)) {
    fs.unlinkSync(TEST_DB_PATH);
  }

  const db = new Database(TEST_DB_PATH);
  db.pragma('journal_mode = WAL');

  // Create tables
  db.exec(`
    -- Posts table
    CREATE TABLE agent_posts (
      id TEXT PRIMARY KEY,
      title TEXT NOT NULL,
      content TEXT NOT NULL,
      author_agent TEXT,
      author_id TEXT,
      published_at INTEGER NOT NULL,
      metadata TEXT,
      created_at INTEGER DEFAULT (unixepoch())
    );

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

    -- User settings table (matches actual schema)
    CREATE TABLE user_settings (
      user_id TEXT PRIMARY KEY,
      display_name TEXT,
      display_name_style TEXT DEFAULT 'display',
      onboarding_completed INTEGER DEFAULT 0,
      onboarding_completed_at INTEGER,
      profile_json TEXT DEFAULT '{}',
      created_at INTEGER DEFAULT (unixepoch()),
      updated_at INTEGER DEFAULT (unixepoch())
    );
  `);

  return db;
}

describe('FR-3: Avi Welcome Post Generation (Integration)', () => {
  let db;
  let onboardingService;

  beforeEach(() => {
    db = setupTestDatabase();
    onboardingService = createOnboardingFlowService(db);
  });

  afterEach(() => {
    db.close();
    if (fs.existsSync(TEST_DB_PATH)) {
      fs.unlinkSync(TEST_DB_PATH);
    }
  });

  it('should create Avi welcome post after Phase 1 completion', async () => {
    const userId = 'test-user-123';
    const userName = 'Sarah Chen';

    // Initialize onboarding
    onboardingService.initializeOnboarding(userId);

    // Complete Phase 1 - Name step
    const nameResult = onboardingService.processNameResponse(userId, userName);
    expect(nameResult.success).toBe(true);
    expect(nameResult.nextStep).toBe('use_case');

    // Complete Phase 1 - Use case step
    const useCaseResult = await onboardingService.processUseCaseResponse(userId, 'Personal productivity');
    expect(useCaseResult.success).toBe(true);
    expect(useCaseResult.phase1Complete).toBe(true);

    // Check that Avi welcome was triggered
    expect(useCaseResult.aviWelcome).toBeDefined();
    expect(useCaseResult.aviWelcome.success).toBe(true);
    expect(useCaseResult.aviWelcome.postCreated).toBe(true);
    expect(useCaseResult.aviWelcome.userName).toBe(userName);

    // Verify post exists in database
    const post = db.prepare(`
      SELECT * FROM agent_posts
      WHERE id = ?
    `).get(useCaseResult.aviWelcome.postId);

    expect(post).toBeTruthy();
    expect(post.author_agent).toBe('avi');
    expect(post.author_id).toBe(userId);
    expect(post.title).toContain(userName);
    expect(post.content).toContain(userName);
    expect(post.content).toContain('Λvi');
  });

  it('should use warm, non-technical language in welcome post', async () => {
    const userId = 'test-user-456';
    const userName = 'Alex Rodriguez';

    // Initialize and complete Phase 1
    onboardingService.initializeOnboarding(userId);
    onboardingService.processNameResponse(userId, userName);
    const useCaseResult = await onboardingService.processUseCaseResponse(userId, 'Business management');

    // Get the post content
    const post = db.prepare(`
      SELECT content FROM agent_posts
      WHERE id = ?
    `).get(useCaseResult.aviWelcome.postId);

    // Verify warm language
    expect(post.content).toMatch(/welcome|excited|great|looking forward/i);
    expect(post.content).toContain(userName);
    expect(post.content).toContain('Λvi');
  });

  it('should NOT contain technical jargon in welcome post', async () => {
    const userId = 'test-user-789';
    const userName = 'Jamie Kim';

    // Initialize and complete Phase 1
    onboardingService.initializeOnboarding(userId);
    onboardingService.processNameResponse(userId, userName);
    const useCaseResult = await onboardingService.processUseCaseResponse(userId, 'Creative projects');

    // Get the post content
    const post = db.prepare(`
      SELECT content FROM agent_posts
      WHERE id = ?
    `).get(useCaseResult.aviWelcome.postId);

    // Define technical terms that should NOT appear
    const technicalTerms = ['code', 'debug', 'architecture', 'implementation', 'development', 'system', 'technical', 'API', 'database'];
    const lowerContent = post.content.toLowerCase();

    // Verify NO technical jargon
    technicalTerms.forEach(term => {
      expect(lowerContent).not.toContain(term);
    });
  });

  it('should only create Avi welcome once per user (no duplicates)', async () => {
    const userId = 'test-user-abc';
    const userName = 'Pat Johnson';

    // Initialize and complete Phase 1
    onboardingService.initializeOnboarding(userId);
    onboardingService.processNameResponse(userId, userName);
    await onboardingService.processUseCaseResponse(userId, 'Learning & development');

    // Try to trigger welcome again
    const result2 = await onboardingService.triggerAviWelcome(userId);

    // Should succeed but indicate already exists
    expect(result2.success).toBe(true);
    expect(result2.alreadyExists).toBe(true);
    expect(result2.postCreated).toBeUndefined();

    // Verify only ONE welcome post exists
    const posts = db.prepare(`
      SELECT COUNT(*) as count FROM agent_posts
      WHERE author_agent = 'avi'
        AND author_id = ?
        AND json_extract(metadata, '$.isOnboardingPost') = 1
        AND json_extract(metadata, '$.aviWelcomePost') = 1
    `).get(userId);

    expect(posts.count).toBe(1);
  });

  it('should handle name with special characters', async () => {
    const userId = 'test-user-special';
    const userName = 'María José García-López';

    // Initialize and complete Phase 1
    onboardingService.initializeOnboarding(userId);
    onboardingService.processNameResponse(userId, userName);
    const useCaseResult = await onboardingService.processUseCaseResponse(userId, 'Other');

    // Verify welcome post was created with correct name
    expect(useCaseResult.aviWelcome.success).toBe(true);
    expect(useCaseResult.aviWelcome.userName).toBe(userName);

    const post = db.prepare(`
      SELECT * FROM agent_posts
      WHERE id = ?
    `).get(useCaseResult.aviWelcome.postId);

    expect(post.title).toContain(userName);
    expect(post.content).toContain(userName);
  });

  it('should set correct metadata on welcome post', async () => {
    const userId = 'test-user-metadata';
    const userName = 'Taylor Swift';

    // Initialize and complete Phase 1
    onboardingService.initializeOnboarding(userId);
    onboardingService.processNameResponse(userId, userName);
    const useCaseResult = await onboardingService.processUseCaseResponse(userId, 'Business management');

    // Get post with metadata
    const post = db.prepare(`
      SELECT metadata FROM agent_posts
      WHERE id = ?
    `).get(useCaseResult.aviWelcome.postId);

    const metadata = JSON.parse(post.metadata);

    // Verify metadata structure
    expect(metadata.isOnboardingPost).toBe(true);
    expect(metadata.aviWelcomePost).toBe(true);
    expect(metadata.onboardingPhase).toBe('welcome');
    expect(metadata.userId).toBe(userId);
  });

  it('should fail gracefully if Phase 1 not complete', async () => {
    const userId = 'test-user-incomplete';

    // Initialize but don't complete Phase 1
    onboardingService.initializeOnboarding(userId);

    // Try to trigger welcome (should fail)
    const result = await onboardingService.triggerAviWelcome(userId);

    expect(result.success).toBe(false);
    expect(result.error).toContain('Phase 1 not complete');
  });

  it('should include helpful action items in welcome content', async () => {
    const userId = 'test-user-actions';
    const userName = 'Chris Evans';

    // Initialize and complete Phase 1
    onboardingService.initializeOnboarding(userId);
    onboardingService.processNameResponse(userId, userName);
    const useCaseResult = await onboardingService.processUseCaseResponse(userId, 'Personal productivity');

    // Get post content
    const post = db.prepare(`
      SELECT content FROM agent_posts
      WHERE id = ?
    `).get(useCaseResult.aviWelcome.postId);

    // Verify helpful content (tasks, ideas, links, meetings, etc.)
    expect(post.content).toMatch(/track tasks|stay organized/i);
    expect(post.content).toMatch(/ideas|projects/i);
    expect(post.content).toMatch(/links|resources/i);
    expect(post.content).toMatch(/meetings|follow-ups/i);
  });
});
