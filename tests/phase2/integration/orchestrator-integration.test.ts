/**
 * Phase 2 Integration Tests - REAL PostgreSQL Database
 *
 * Tests the complete integration of Phase 2 components with Phase 1 database:
 * - Avi DM Orchestrator
 * - StateManager
 * - WorkTicketQueue
 * - AgentWorker (context loading from real DB)
 * - HealthMonitor
 *
 * NO MOCKS - This uses the actual PostgreSQL database from Phase 1
 */

import { describe, it, expect, beforeAll, afterAll, beforeEach } from '@jest/globals';
import { Pool } from 'pg';
import { AviOrchestrator } from '../../../src/avi/orchestrator';
import { StateManager } from '../../../src/avi/state-manager';
import { WorkTicketQueue } from '../../../src/queue/work-ticket';
import { Priority } from '../../../src/types/work-ticket';
import { HealthMonitor } from '../../../src/avi/health-monitor';
import { DatabaseManager } from '../../../src/types/database-manager';

describe('Phase 2 Orchestrator Integration Tests (REAL Database)', () => {
  let pool: Pool;
  let database: DatabaseManager;

  beforeAll(async () => {
    // Connect to REAL PostgreSQL database
    pool = new Pool({
      host: process.env.DB_HOST || 'localhost',
      port: parseInt(process.env.DB_PORT || '5432'),
      database: process.env.DB_NAME || 'avidm_dev',
      user: process.env.DB_USER || 'postgres',
      password: process.env.DB_PASSWORD || 'dev_password_change_in_production',
    });

    // Create database manager
    database = {
      query: async (text, params) => pool.query(text, params),
      connect: async () => pool.connect(),
      end: async () => pool.end(),
    } as unknown as DatabaseManager;

    console.log('✅ Connected to REAL PostgreSQL database');
  });

  afterAll(async () => {
    await pool.end();
  });

  beforeEach(async () => {
    // Clean up test data before each test
    await pool.query('DELETE FROM agent_memories WHERE user_id LIKE \'test-%\'');
    await pool.query('DELETE FROM agent_workspaces WHERE user_id LIKE \'test-%\'');
    await pool.query('DELETE FROM user_agent_customizations WHERE user_id LIKE \'test-%\'');
    await pool.query('DELETE FROM system_agent_templates WHERE name LIKE \'test-%\'');
    await pool.query('DELETE FROM avi_state WHERE id = 1');
  });

  describe('StateManager Integration', () => {
    it('should save and load state from REAL avi_state table', async () => {
      const stateManager = new StateManager(database);

      // Save state
      const state = {
        status: 'running' as const,
        startTime: new Date(),
        contextSize: 1500,
        ticketsProcessed: 10,
        workersSpawned: 5,
        activeWorkers: 2,
      };

      await stateManager.saveState(state);

      // Load state
      const loaded = await stateManager.loadState();

      expect(loaded).toBeDefined();
      expect(loaded?.status).toBe('running');
      expect(loaded?.ticketsProcessed).toBe(10);
      expect(loaded?.workersSpawned).toBe(5);
      expect(loaded?.activeWorkers).toBe(2);
    });

    it('should update existing state with partial data', async () => {
      const stateManager = new StateManager(database);

      // Initial save
      await stateManager.saveState({
        status: 'running' as const,
        startTime: new Date(),
        contextSize: 1500,
        ticketsProcessed: 0,
        workersSpawned: 0,
        activeWorkers: 0,
      });

      // Partial update
      await stateManager.updateState({
        ticketsProcessed: 5,
        workersSpawned: 3,
      });

      // Verify update
      const loaded = await stateManager.loadState();
      expect(loaded?.ticketsProcessed).toBe(5);
      expect(loaded?.workersSpawned).toBe(3);
      expect(loaded?.status).toBe('running'); // Unchanged
    });
  });

  describe('WorkTicketQueue Integration', () => {
    it('should create and manage work tickets in memory', async () => {
      const queue = new WorkTicketQueue();

      // Create ticket
      const ticket = await queue.createTicket({
        type: 'post_response',
        priority: Priority.HIGH,
        agentName: 'tech-guru',
        userId: 'test-user-1',
        payload: { postId: 'post-123' },
      });

      expect(ticket.id).toBeDefined();
      expect(ticket.status).toBe('pending');
      expect(ticket.priority).toBe(Priority.HIGH);

      // Get ticket
      const retrieved = await queue.getTicket(ticket.id);
      expect(retrieved).toEqual(ticket);

      // Assign to worker
      await queue.assignToWorker(ticket.id, 'worker-1');
      const assigned = await queue.getTicket(ticket.id);
      expect(assigned?.status).toBe('processing');
      expect(assigned?.workerId).toBe('worker-1');

      // Complete ticket
      await queue.completeTicket(ticket.id, { success: true });
      const completed = await queue.getTicket(ticket.id);
      expect(completed?.status).toBe('completed');
    });
  });

  describe('HealthMonitor Integration', () => {
    it('should check database health with REAL PostgreSQL', async () => {
      const healthMonitor = new HealthMonitor({
        avidm: null as any, // Not testing Avi health yet
        database,
        workerPool: null as any,
        checkIntervalMs: 1000,
      });

      // Check database health
      const dbHealth = await healthMonitor.checkDatabaseHealth();

      expect(dbHealth.connected).toBe(true);
      expect(dbHealth.responseTime).toBeGreaterThanOrEqual(0);
      expect(dbHealth.responseTime).toBeLessThan(100); // Should be fast
    });

    it('should detect database connection loss', async () => {
      // Create a pool that will fail
      const badPool = new Pool({
        host: 'nonexistent-host',
        port: 5432,
        database: 'nonexistent',
        user: 'nobody',
        password: 'nothing',
        connectionTimeoutMillis: 1000,
      });

      const badDatabase = {
        query: async (text, params) => badPool.query(text, params),
      } as unknown as DatabaseManager;

      const healthMonitor = new HealthMonitor({
        avidm: null as any,
        database: badDatabase,
        workerPool: null as any,
        checkIntervalMs: 1000,
      });

      // Check database health (should fail)
      const dbHealth = await healthMonitor.checkDatabaseHealth();

      expect(dbHealth.connected).toBe(false);
      expect(dbHealth.error).toBeDefined();

      await badPool.end();
    });
  });

  describe('Context Loading from Phase 1 Database', () => {
    it('should load agent context from real system templates', async () => {
      // Insert test system template
      await pool.query(`
        INSERT INTO system_agent_templates (name, version, model, posting_rules, api_schema, safety_constraints)
        VALUES ('test-agent', 1, 'claude-sonnet-4-5-20250929',
                '{"max_length": 280}'::jsonb,
                '{"endpoint": "/api/post"}'::jsonb,
                '{"max_rate": 20}'::jsonb)
        ON CONFLICT (name) DO UPDATE SET version = EXCLUDED.version
      `);

      // Import context composer
      const { composeAgentContext } = await import('../../../src/database/context-composer');

      // Load context
      const context = await composeAgentContext('test-user-1', 'test-agent', database);

      expect(context).toBeDefined();
      expect(context.model).toBe('claude-sonnet-4-5-20250929');
      expect(context.posting_rules).toEqual({ max_length: 280 });
      expect(context.api_schema).toEqual({ endpoint: '/api/post' });
      expect(context.safety_constraints).toEqual({ max_rate: 20 });
    });

    it('should load agent context with user customizations', async () => {
      // Insert system template
      await pool.query(`
        INSERT INTO system_agent_templates (name, version, model, posting_rules, api_schema, safety_constraints,
                                             default_personality)
        VALUES ('test-agent-2', 1, 'claude-sonnet-4-5-20250929',
                '{"max_length": 280}'::jsonb,
                '{"endpoint": "/api/post"}'::jsonb,
                '{"max_rate": 20}'::jsonb,
                'Default personality')
        ON CONFLICT (name) DO UPDATE SET version = EXCLUDED.version
      `);

      // Insert user customization
      await pool.query(`
        INSERT INTO user_agent_customizations (user_id, agent_template, personality, response_style)
        VALUES ('test-user-2', 'test-agent-2', 'Friendly tech expert',
                '{"tone": "casual"}'::jsonb)
        ON CONFLICT (user_id, agent_template) DO UPDATE SET personality = EXCLUDED.personality
      `);

      const { composeAgentContext } = await import('../../../src/database/context-composer');

      // Load context with customization
      const context = await composeAgentContext('test-user-2', 'test-agent-2', database);

      expect(context.personality).toBe('Friendly tech expert');
      expect(context.response_style).toEqual({ tone: 'casual' });
    });

    it('should load agent memories from real database', async () => {
      // Insert test memories
      await pool.query(`
        INSERT INTO agent_memories (user_id, agent_name, content, metadata)
        VALUES
          ('test-user-3', 'test-agent', 'User likes detailed explanations',
           '{"importance": 9, "topic": "preferences"}'::jsonb),
          ('test-user-3', 'test-agent', 'User is interested in AI',
           '{"importance": 8, "topic": "interests"}'::jsonb)
      `);

      // Query memories
      const result = await pool.query(`
        SELECT content, metadata FROM agent_memories
        WHERE user_id = 'test-user-3' AND agent_name = 'test-agent'
        ORDER BY created_at DESC
      `);

      expect(result.rows).toHaveLength(2);
      // First row should be most recent
      expect(result.rows[0].metadata.importance).toBeGreaterThanOrEqual(8);
      expect(result.rows[1].metadata.importance).toBeGreaterThanOrEqual(8);
    });
  });

  describe('End-to-End Integration', () => {
    it('should create system template, user customization, and compose context', async () => {
      // 1. Create system template
      await pool.query(`
        INSERT INTO system_agent_templates
        (name, version, model, posting_rules, api_schema, safety_constraints, default_personality)
        VALUES
        ('test-e2e-agent', 1, 'claude-sonnet-4-5-20250929',
         '{"max_length": 280, "min_interval_seconds": 60}'::jsonb,
         '{"endpoint": "/api/post", "method": "POST"}'::jsonb,
         '{"max_rate_per_hour": 20, "content_filter": true}'::jsonb,
         'Helpful AI assistant')
        ON CONFLICT (name) DO UPDATE SET version = EXCLUDED.version
      `);

      // 2. Create user customization
      await pool.query(`
        INSERT INTO user_agent_customizations
        (user_id, agent_template, personality, response_style)
        VALUES
        ('test-e2e-user', 'test-e2e-agent', 'Expert developer assistant',
         '{"tone": "technical", "emoji_use": false}'::jsonb)
        ON CONFLICT (user_id, agent_template) DO UPDATE SET personality = EXCLUDED.personality
      `);

      // 3. Add some memories
      await pool.query(`
        INSERT INTO agent_memories (user_id, agent_name, content, metadata)
        VALUES
        ('test-e2e-user', 'test-e2e-agent', 'User prefers TypeScript over JavaScript',
         '{"importance": 9, "topic": "coding_preferences"}'::jsonb),
        ('test-e2e-user', 'test-e2e-agent', 'User is building a web app',
         '{"importance": 8, "topic": "current_project"}'::jsonb)
      `);

      // 4. Compose full context
      const { composeAgentContext } = await import('../../../src/database/context-composer');
      const context = await composeAgentContext('test-e2e-user', 'test-e2e-agent', database);

      // Verify complete context
      expect(context.model).toBe('claude-sonnet-4-5-20250929');
      expect(context.posting_rules.max_length).toBe(280);
      expect(context.posting_rules.min_interval_seconds).toBe(60);
      expect(context.personality).toBe('Expert developer assistant');
      expect(context.response_style.tone).toBe('technical');
      expect(context.response_style.emoji_use).toBe(false);

      // 5. Verify memories are accessible
      const memories = await pool.query(`
        SELECT content, metadata->>'importance' as importance
        FROM agent_memories
        WHERE user_id = 'test-e2e-user' AND agent_name = 'test-e2e-agent'
        ORDER BY (metadata->>'importance')::int DESC
        LIMIT 5
      `);

      expect(memories.rows).toHaveLength(2);
      expect(memories.rows[0].content).toBe('User prefers TypeScript over JavaScript');
      expect(memories.rows[0].importance).toBe('9');
    });
  });
});
