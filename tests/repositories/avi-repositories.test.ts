/**
 * AVI Repositories Integration Tests
 *
 * Comprehensive test suite for all repository layer operations.
 * Uses REAL PostgreSQL database (no mocks) following TDD principles.
 *
 * Test Coverage:
 * - SystemTemplateRepository (TIER 1)
 * - UserCustomizationRepository (TIER 2)
 * - AgentMemoryRepository (TIER 3)
 * - AviStateRepository
 * - WorkQueueRepository
 * - 3-tier composition logic
 * - Data isolation
 * - Error handling
 */

import { SystemTemplateRepository } from '../../src/repositories/SystemTemplateRepository';
import { UserCustomizationRepository } from '../../src/repositories/UserCustomizationRepository';
import { AgentMemoryRepository } from '../../src/repositories/AgentMemoryRepository';
import { AviStateRepository } from '../../src/repositories/AviStateRepository';
import { WorkQueueRepository } from '../../src/repositories/WorkQueueRepository';
import { query } from '../../src/database/pg-pool';

// Repository instances
const systemTemplateRepo = new SystemTemplateRepository();
const userCustomizationRepo = new UserCustomizationRepository();
const agentMemoryRepo = new AgentMemoryRepository();
const aviStateRepo = new AviStateRepository();
const workQueueRepo = new WorkQueueRepository();

// Test user IDs for data isolation testing
const TEST_USER_1 = 'test-user-1';
const TEST_USER_2 = 'test-user-2';

describe('AVI Repositories Integration Tests', () => {
  // Cleanup before and after tests
  beforeAll(async () => {
    await cleanupTestData();
  });

  afterAll(async () => {
    await cleanupTestData();
  });

  describe('SystemTemplateRepository (TIER 1)', () => {
    const testTemplate = {
      name: 'test-tech-guru',
      version: 1,
      model: 'claude-sonnet-4-5-20250929',
      posting_rules: {
        max_length: 280,
        rate_limit_per_hour: 20,
        category: 'tech'
      },
      api_schema: {
        platform: 'twitter',
        endpoints: { post: '/v2/tweets' }
      },
      safety_constraints: {
        content_filters: ['profanity'],
        max_mentions_per_post: 3
      },
      default_personality: 'You are a tech enthusiast who loves AI',
      default_response_style: {
        tone: 'professional',
        length: 'concise'
      }
    };

    test('should create a system template', async () => {
      const template = await systemTemplateRepo.create(testTemplate);

      expect(template).toBeDefined();
      expect(template.name).toBe(testTemplate.name);
      expect(template.version).toBe(testTemplate.version);
      expect(template.posting_rules).toMatchObject(testTemplate.posting_rules);
    });

    test('should retrieve template by ID', async () => {
      const template = await systemTemplateRepo.getById('test-tech-guru');

      expect(template).not.toBeNull();
      expect(template?.name).toBe('test-tech-guru');
    });

    test('should retrieve all templates', async () => {
      const templates = await systemTemplateRepo.getAll();

      expect(templates.length).toBeGreaterThanOrEqual(1);
      expect(templates[0]).toHaveProperty('name');
      expect(templates[0]).toHaveProperty('posting_rules');
    });

    test('should retrieve templates by category', async () => {
      const templates = await systemTemplateRepo.getByCategory('tech');

      expect(templates.length).toBeGreaterThanOrEqual(1);
      expect(templates[0].posting_rules).toHaveProperty('category', 'tech');
    });

    test('should update template', async () => {
      const updated = await systemTemplateRepo.update('test-tech-guru', {
        version: 2,
        default_personality: 'Updated personality'
      });

      expect(updated).not.toBeNull();
      expect(updated?.version).toBe(2);
      expect(updated?.default_personality).toBe('Updated personality');
    });

    test('should check if template exists', async () => {
      const exists = await systemTemplateRepo.exists('test-tech-guru');
      const notExists = await systemTemplateRepo.exists('nonexistent-template');

      expect(exists).toBe(true);
      expect(notExists).toBe(false);
    });

    test('should reject template creation with invalid data', async () => {
      await expect(
        systemTemplateRepo.create({
          ...testTemplate,
          name: '',
        })
      ).rejects.toThrow('Template name is required');

      await expect(
        systemTemplateRepo.create({
          ...testTemplate,
          name: 'invalid-template',
          version: 0,
        })
      ).rejects.toThrow('Template version must be positive');
    });
  });

  describe('UserCustomizationRepository (TIER 2)', () => {
    test('should create user customization', async () => {
      const customization = await userCustomizationRepo.create({
        user_id: TEST_USER_1,
        agent_template: 'test-tech-guru',
        custom_name: 'My Tech Assistant',
        personality: 'Friendly and helpful tech expert',
        interests: { topics: ['AI', 'web development'] },
        response_style: { tone: 'casual', length: 'brief' }
      });

      expect(customization).toBeDefined();
      expect(customization.user_id).toBe(TEST_USER_1);
      expect(customization.custom_name).toBe('My Tech Assistant');
    });

    test('should retrieve customization by user and template', async () => {
      const customization = await userCustomizationRepo.getByUserAndTemplate(
        TEST_USER_1,
        'test-tech-guru'
      );

      expect(customization).not.toBeNull();
      expect(customization?.user_id).toBe(TEST_USER_1);
      expect(customization?.agent_template).toBe('test-tech-guru');
    });

    test('should retrieve all customizations for user', async () => {
      const customizations = await userCustomizationRepo.getByUser(TEST_USER_1);

      expect(customizations.length).toBeGreaterThanOrEqual(1);
      expect(customizations[0].user_id).toBe(TEST_USER_1);
    });

    test('should update customization', async () => {
      const existing = await userCustomizationRepo.getByUserAndTemplate(
        TEST_USER_1,
        'test-tech-guru'
      );

      const updated = await userCustomizationRepo.update(existing!.id, {
        personality: 'Updated personality',
        enabled: false
      });

      expect(updated).not.toBeNull();
      expect(updated?.personality).toBe('Updated personality');
      expect(updated?.enabled).toBe(false);
    });

    test('should prevent setting protected fields', async () => {
      await expect(
        userCustomizationRepo.create({
          user_id: TEST_USER_2,
          agent_template: 'test-tech-guru',
          // @ts-ignore - Testing runtime validation
          posting_rules: { malicious: 'override' }
        })
      ).rejects.toThrow('Cannot customize protected field');
    });

    test('should enforce personality length limit', async () => {
      const longPersonality = 'x'.repeat(5001);

      await expect(
        userCustomizationRepo.create({
          user_id: TEST_USER_2,
          agent_template: 'test-tech-guru',
          personality: longPersonality
        })
      ).rejects.toThrow('Personality text too long');
    });

    test('should compose agent with TIER 1 + TIER 2', async () => {
      const composed = await userCustomizationRepo.composeAgent(
        TEST_USER_1,
        'test-tech-guru'
      );

      // TIER 1: Protected fields from system template
      expect(composed.model).toBe('claude-sonnet-4-5-20250929');
      expect(composed.posting_rules).toHaveProperty('max_length', 280);
      expect(composed.api_schema).toHaveProperty('platform', 'twitter');
      expect(composed.safety_constraints).toHaveProperty('content_filters');

      // TIER 2: User customizations applied
      expect(composed.agent_name).toBe('My Tech Assistant');
      expect(composed.personality).toBe('Updated personality');
      expect(composed.response_style).toHaveProperty('tone', 'casual');

      // Metadata
      expect(composed.user_id).toBe(TEST_USER_1);
      expect(composed.template_name).toBe('test-tech-guru');
      expect(composed.template_version).toBe(2);
    });

    test('should compose agent with defaults when no customization exists', async () => {
      const composed = await userCustomizationRepo.composeAgent(
        'new-user',
        'test-tech-guru'
      );

      // Should use system template defaults
      expect(composed.personality).toBe('Updated personality'); // from template
      expect(composed.agent_name).toBe('test-tech-guru'); // template name
      expect(composed.customization_id).toBeNull();
    });
  });

  describe('AgentMemoryRepository (TIER 3)', () => {
    test('should create agent memory', async () => {
      const memory = await agentMemoryRepo.create({
        user_id: TEST_USER_1,
        agent_name: 'test-tech-guru',
        post_id: 'post-123',
        content: 'User asked about React hooks',
        metadata: { topic: 'React', sentiment: 'curious' }
      });

      expect(memory).toBeDefined();
      expect(memory.user_id).toBe(TEST_USER_1);
      expect(memory.content).toContain('React hooks');
    });

    test('should retrieve memories by user', async () => {
      const memories = await agentMemoryRepo.getByUser(TEST_USER_1);

      expect(memories.length).toBeGreaterThanOrEqual(1);
      expect(memories[0].user_id).toBe(TEST_USER_1);
    });

    test('should retrieve memories by agent', async () => {
      const memories = await agentMemoryRepo.getByAgent(
        TEST_USER_1,
        'test-tech-guru'
      );

      expect(memories.length).toBeGreaterThanOrEqual(1);
      expect(memories[0].agent_name).toBe('test-tech-guru');
    });

    test('should retrieve relevant memories by context', async () => {
      // Create memories with different topics
      await agentMemoryRepo.create({
        user_id: TEST_USER_1,
        agent_name: 'test-tech-guru',
        content: 'Discussion about TypeScript',
        metadata: { topic: 'TypeScript' }
      });

      await agentMemoryRepo.create({
        user_id: TEST_USER_1,
        agent_name: 'test-tech-guru',
        content: 'Discussion about Python',
        metadata: { topic: 'Python' }
      });

      // Query for TypeScript-related memories
      const memories = await agentMemoryRepo.getRelevant(
        TEST_USER_1,
        'test-tech-guru',
        { topic: 'TypeScript' },
        5
      );

      expect(memories.length).toBeGreaterThanOrEqual(1);
      expect(
        memories.some(m => m.content.includes('TypeScript'))
      ).toBe(true);
    });

    test('should retrieve recent memories', async () => {
      const memories = await agentMemoryRepo.getRecent(
        TEST_USER_1,
        'test-tech-guru',
        7,
        10
      );

      expect(memories.length).toBeGreaterThanOrEqual(1);
      // All should be within last 7 days
      const weekAgo = new Date();
      weekAgo.setDate(weekAgo.getDate() - 7);
      expect(new Date(memories[0].created_at).getTime()).toBeGreaterThan(
        weekAgo.getTime()
      );
    });

    test('should enforce data isolation between users', async () => {
      // Create memory for user 2
      await agentMemoryRepo.create({
        user_id: TEST_USER_2,
        agent_name: 'test-tech-guru',
        content: 'User 2 private conversation',
        metadata: { topic: 'private' }
      });

      // Query user 1's memories
      const user1Memories = await agentMemoryRepo.getByUser(TEST_USER_1);

      // Should not contain user 2's data
      expect(
        user1Memories.every(m => m.user_id === TEST_USER_1)
      ).toBe(true);
      expect(
        user1Memories.some(m => m.content.includes('User 2 private'))
      ).toBe(false);
    });

    test('should get memory count', async () => {
      const count = await agentMemoryRepo.getCount(TEST_USER_1);
      expect(count).toBeGreaterThanOrEqual(1);

      const agentCount = await agentMemoryRepo.getCount(
        TEST_USER_1,
        'test-tech-guru'
      );
      expect(agentCount).toBeGreaterThanOrEqual(1);
    });

    test('should search memories by content', async () => {
      const results = await agentMemoryRepo.search(TEST_USER_1, 'React', 10);

      expect(results.length).toBeGreaterThanOrEqual(1);
      expect(results[0].content.toLowerCase()).toContain('react');
    });

    test('should bulk create memories', async () => {
      const memories = await agentMemoryRepo.createBulk([
        {
          user_id: TEST_USER_1,
          agent_name: 'test-tech-guru',
          content: 'Bulk memory 1'
        },
        {
          user_id: TEST_USER_1,
          agent_name: 'test-tech-guru',
          content: 'Bulk memory 2'
        }
      ]);

      expect(memories.length).toBe(2);
      expect(memories[0].content).toBe('Bulk memory 1');
      expect(memories[1].content).toBe('Bulk memory 2');
    });
  });

  describe('AviStateRepository', () => {
    test('should initialize state', async () => {
      const state = await aviStateRepo.initialize();

      expect(state).toBeDefined();
      expect(state.id).toBe(1);
      expect(state.context_size).toBe(0);
    });

    test('should get current state', async () => {
      const state = await aviStateRepo.get();

      expect(state).not.toBeNull();
      expect(state.id).toBe(1);
    });

    test('should update state fields', async () => {
      const updated = await aviStateRepo.update({
        status: 'running',
        context_size: 1500,
        active_workers: 3
      });

      expect(updated.status).toBe('running');
      expect(updated.context_size).toBe(1500);
      expect(updated.active_workers).toBe(3);
    });

    test('should get/set feed position', async () => {
      await aviStateRepo.setLastFeedPosition('post-999');
      const position = await aviStateRepo.getLastFeedPosition();

      expect(position).toBe('post-999');
    });

    test('should get/increment context size', async () => {
      await aviStateRepo.resetContextSize();

      const newSize = await aviStateRepo.incrementContextSize(500);
      expect(newSize).toBe(500);

      const size2 = await aviStateRepo.incrementContextSize(300);
      expect(size2).toBe(800);
    });

    test('should check context limit approaching', async () => {
      await aviStateRepo.resetContextSize();
      await aviStateRepo.incrementContextSize(60000);

      const approaching = await aviStateRepo.isContextLimitApproaching(50000);
      expect(approaching).toBe(true);
    });

    test('should increment counters', async () => {
      const ticketCount = await aviStateRepo.incrementTicketsProcessed();
      expect(ticketCount).toBeGreaterThanOrEqual(1);

      const workerCount = await aviStateRepo.incrementWorkersSpawned();
      expect(workerCount).toBeGreaterThanOrEqual(1);
    });

    test('should record health check', async () => {
      await aviStateRepo.recordHealthCheck(null);

      const state = await aviStateRepo.get();
      expect(state.last_health_check).not.toBeNull();
    });

    test('should record restart', async () => {
      await aviStateRepo.recordRestart();

      const state = await aviStateRepo.get();
      expect(state.last_restart).not.toBeNull();
      expect(state.context_size).toBe(0);
      expect(state.status).toBe('restarting');
    });
  });

  describe('WorkQueueRepository', () => {
    test('should create work ticket', async () => {
      const ticket = await workQueueRepo.create({
        user_id: TEST_USER_1,
        post_id: 'post-456',
        post_content: 'New post about AI',
        post_author: 'alice',
        assigned_agent: 'test-tech-guru',
        priority: 5
      });

      expect(ticket).toBeDefined();
      expect(ticket.user_id).toBe(TEST_USER_1);
      expect(ticket.status).toBe('pending');
      expect(ticket.priority).toBe(5);
    });

    test('should retrieve ticket by ID', async () => {
      const created = await workQueueRepo.create({
        user_id: TEST_USER_1,
        post_id: 'post-789',
        post_content: 'Another post'
      });

      const retrieved = await workQueueRepo.getById(created.id);

      expect(retrieved).not.toBeNull();
      expect(retrieved?.id).toBe(created.id);
    });

    test('should get all tickets', async () => {
      const tickets = await workQueueRepo.getAll();

      expect(tickets.length).toBeGreaterThanOrEqual(1);
    });

    test('should get tickets by status', async () => {
      const pending = await workQueueRepo.getAll('pending');

      expect(pending.length).toBeGreaterThanOrEqual(1);
      expect(pending.every(t => t.status === 'pending')).toBe(true);
    });

    test('should get pending tickets', async () => {
      const pending = await workQueueRepo.getPending();

      expect(pending.length).toBeGreaterThanOrEqual(1);
      expect(pending[0].status).toBe('pending');
    });

    test('should assign worker to ticket', async () => {
      const ticket = await workQueueRepo.create({
        user_id: TEST_USER_1,
        post_id: 'post-assign',
        post_content: 'Test assignment'
      });

      const assigned = await workQueueRepo.assignWorker(ticket.id, 'worker-123');

      expect(assigned).not.toBeNull();
      expect(assigned?.worker_id).toBe('worker-123');
      expect(assigned?.status).toBe('assigned');
      expect(assigned?.assigned_at).not.toBeNull();
    });

    test('should update ticket status', async () => {
      const ticket = await workQueueRepo.create({
        user_id: TEST_USER_1,
        post_id: 'post-status',
        post_content: 'Test status update'
      });

      const updated = await workQueueRepo.updateStatus(ticket.id, 'in_progress');

      expect(updated).not.toBeNull();
      expect(updated?.status).toBe('in_progress');
      expect(updated?.started_at).not.toBeNull();
    });

    test('should complete ticket with result', async () => {
      const ticket = await workQueueRepo.create({
        user_id: TEST_USER_1,
        post_id: 'post-complete',
        post_content: 'Test completion'
      });

      const completed = await workQueueRepo.complete(ticket.id, {
        post_url: 'https://twitter.com/user/status/123',
        engagement: { likes: 5, retweets: 2 }
      });

      expect(completed).not.toBeNull();
      expect(completed?.status).toBe('completed');
      expect(completed?.result).toHaveProperty('post_url');
      expect(completed?.completed_at).not.toBeNull();
    });

    test('should fail ticket with error', async () => {
      const ticket = await workQueueRepo.create({
        user_id: TEST_USER_1,
        post_id: 'post-fail',
        post_content: 'Test failure'
      });

      const failed = await workQueueRepo.fail(ticket.id, 'API rate limit exceeded');

      expect(failed).not.toBeNull();
      expect(failed?.status).toBe('failed');
      expect(failed?.error_message).toBe('API rate limit exceeded');
      expect(failed?.retry_count).toBe(1);
    });

    test('should get tickets by user', async () => {
      const tickets = await workQueueRepo.getByUser(TEST_USER_1);

      expect(tickets.length).toBeGreaterThanOrEqual(1);
      expect(tickets.every(t => t.user_id === TEST_USER_1)).toBe(true);
    });

    test('should get tickets by agent', async () => {
      const tickets = await workQueueRepo.getByAgent('test-tech-guru');

      expect(tickets.length).toBeGreaterThanOrEqual(1);
      expect(tickets.every(t => t.assigned_agent === 'test-tech-guru')).toBe(true);
    });

    test('should get count by status', async () => {
      const counts = await workQueueRepo.getCountByStatus();

      expect(counts).toHaveProperty('pending');
      expect(counts).toHaveProperty('completed');
      expect(counts).toHaveProperty('failed');
      expect(typeof counts.pending).toBe('number');
    });
  });
});

/**
 * Cleanup helper - removes test data
 */
async function cleanupTestData(): Promise<void> {
  try {
    // Delete in reverse order of dependencies
    await query('DELETE FROM work_queue WHERE user_id LIKE $1', ['test-user-%']);
    await query('DELETE FROM agent_memories WHERE user_id LIKE $1', ['test-user-%']);
    await query('DELETE FROM user_agent_customizations WHERE user_id LIKE $1', ['test-user-%']);
    await query('DELETE FROM system_agent_templates WHERE name LIKE $1', ['test-%']);

    // Reset AVI state
    await query(
      `UPDATE avi_state SET
         context_size = 0,
         active_workers = 0,
         status = NULL
       WHERE id = 1`
    );
  } catch (error) {
    console.error('Cleanup error:', error);
  }
}
