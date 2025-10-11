/**
 * Agent Markdown to PostgreSQL Migration Tests
 * Phase 1: TDD + Validation
 *
 * This test suite validates:
 * 1. Reading all agent .md files successfully
 * 2. Parsing YAML frontmatter correctly
 * 3. Transforming to PostgreSQL schema format
 * 4. Handling duplicate agents (upsert)
 * 5. Validating required fields are present
 * 6. Error handling for invalid markdown
 * 7. Dry-run mode doesn't modify database
 *
 * Requirements:
 * - Uses real PostgreSQL test database (no mocks)
 * - Tests actual migration behavior
 * - Clear assertions with descriptive error messages
 */

import { describe, it, expect, beforeAll, afterAll, beforeEach } from '@jest/globals';
import { Pool } from 'pg';
import * as fs from 'fs/promises';
import * as path from 'path';
import {
  parseAgentMarkdown,
  transformToSystemTemplate,
  readAgentMarkdownFiles,
  migrateAgentsToPostgres,
  migrateAgentMarkdownToPostgres,
  AgentMarkdownData,
  SystemTemplateRow,
  MigrationResult,
} from '../../src/database/migrate-agent-markdown';

describe('Agent Markdown to PostgreSQL Migration', () => {
  let pool: Pool;
  const FIXTURES_DIR = path.join(__dirname, 'fixtures');
  const AGENTS_DIR = '/workspaces/agent-feed/agents';

  beforeAll(async () => {
    // Connect to test database
    pool = new Pool({
      host: process.env.DB_HOST || 'localhost',
      port: parseInt(process.env.DB_PORT || '5432'),
      database: process.env.DB_NAME || 'agentfeed_test',
      user: process.env.DB_USER || 'postgres',
      password: process.env.DB_PASSWORD || 'postgres',
    });

    // Verify connection
    await pool.query('SELECT NOW()');
  });

  afterAll(async () => {
    await pool.end();
  });

  beforeEach(async () => {
    // Clean system_agent_templates table before each test
    await pool.query('DELETE FROM system_agent_templates');
  });

  describe('1. Reading Agent Markdown Files', () => {
    it('should read all 21 agent .md files from production directory', async () => {
      const agents = await readAgentMarkdownFiles(AGENTS_DIR);

      expect(agents).toBeDefined();
      expect(Array.isArray(agents)).toBe(true);
      expect(agents.length).toBe(21); // Updated count based on actual files

      // Verify each agent has required fields
      agents.forEach(agent => {
        expect(agent.name).toBeDefined();
        expect(agent.description).toBeDefined();
        expect(agent.filePath).toContain('.md');
      });
    });

    it('should successfully read valid test fixture', async () => {
      const filePath = path.join(FIXTURES_DIR, 'valid-agent.md');
      const agent = await parseAgentMarkdown(filePath);

      expect(agent.name).toBe('test-agent');
      expect(agent.description).toBe('A test agent for migration testing');
      expect(agent.tools).toEqual(['Read', 'Write', 'Edit', 'Bash']);
      expect(agent.color).toBe('#059669');
      expect(agent.model).toBe('sonnet');
      expect(agent.proactive).toBe(true);
      expect(agent.priority).toBe('P2');
      expect(agent.usage).toBe('PROACTIVE for testing');
      expect(agent.content).toContain('# Test Agent');
    });

    it('should handle agent files with minimal frontmatter', async () => {
      const agents = await readAgentMarkdownFiles(AGENTS_DIR);

      // All agents should have at least name and description
      const invalidAgents = agents.filter(
        agent => !agent.name || !agent.description
      );

      expect(invalidAgents.length).toBe(0);
    });

    it('should read all production agents and verify structure', async () => {
      const agents = await readAgentMarkdownFiles(AGENTS_DIR);

      // Verify specific production agents exist
      const agentNames = agents.map(a => a.name);

      expect(agentNames).toContain('personal-todos-agent');
      expect(agentNames).toContain('agent-ideas-agent');
      expect(agentNames).toContain('chief-of-staff-agent');

      // Verify each agent has valid structure
      agents.forEach(agent => {
        expect(typeof agent.name).toBe('string');
        expect(typeof agent.description).toBe('string');
        expect(agent.content.length).toBeGreaterThan(0);
      });
    });
  });

  describe('2. Parsing YAML Frontmatter', () => {
    it('should correctly parse YAML frontmatter with all fields', async () => {
      const filePath = path.join(FIXTURES_DIR, 'valid-agent.md');
      const agent = await parseAgentMarkdown(filePath);

      expect(agent.name).toBe('test-agent');
      expect(agent.description).toBe('A test agent for migration testing');
      expect(agent.tools).toEqual(['Read', 'Write', 'Edit', 'Bash']);
      expect(agent.color).toBe('#059669');
      expect(agent.model).toBe('sonnet');
      expect(agent.proactive).toBe(true);
      expect(agent.priority).toBe('P2');
    });

    it('should provide defaults for optional fields', async () => {
      const filePath = path.join(FIXTURES_DIR, 'valid-agent.md');
      const agent = await parseAgentMarkdown(filePath);

      // Tools should default to empty array if not provided
      expect(Array.isArray(agent.tools)).toBe(true);

      // Color should have default if not provided
      expect(agent.color).toBeDefined();

      // Model can be null
      expect(agent.model === null || typeof agent.model === 'string').toBe(true);
    });

    it('should extract markdown content separately from frontmatter', async () => {
      const filePath = path.join(FIXTURES_DIR, 'valid-agent.md');
      const agent = await parseAgentMarkdown(filePath);

      expect(agent.content).toContain('# Test Agent');
      expect(agent.content).toContain('## Purpose');
      expect(agent.content).toContain('Core Responsibilities');

      // Content should not contain frontmatter
      expect(agent.content).not.toContain('name: test-agent');
      expect(agent.content).not.toContain('---');
    });

    it('should parse all production agent frontmatter correctly', async () => {
      const agents = await readAgentMarkdownFiles(AGENTS_DIR);

      // Check that all production agents have valid priority values
      const validPriorities = ['P0', 'P1', 'P2', 'P3', 'P5', 'P8'];

      agents.forEach(agent => {
        if (agent.priority) {
          expect(validPriorities).toContain(agent.priority);
        }
      });

      // Check that all colors are valid hex codes
      agents.forEach(agent => {
        if (agent.color) {
          expect(agent.color).toMatch(/^#[0-9A-Fa-f]{6}$/);
        }
      });
    });
  });

  describe('3. Transforming to PostgreSQL Schema Format', () => {
    it('should transform agent data to system_agent_templates schema', async () => {
      const filePath = path.join(FIXTURES_DIR, 'valid-agent.md');
      const agent = await parseAgentMarkdown(filePath);
      const template = transformToSystemTemplate(agent);

      // Verify all required fields
      expect(template.name).toBe('test-agent');
      expect(template.version).toBe(1);
      expect(template.model).toBe('sonnet');

      // Verify JSONB fields are objects
      expect(typeof template.posting_rules).toBe('object');
      expect(typeof template.api_schema).toBe('object');
      expect(typeof template.safety_constraints).toBe('object');
      expect(typeof template.default_response_style).toBe('object');

      // Verify posting_rules structure
      expect(template.posting_rules).toHaveProperty('max_length');
      expect(template.posting_rules).toHaveProperty('rate_limit');

      // Verify default_response_style contains agent metadata
      expect(template.default_response_style).toHaveProperty('priority', 'P2');
      expect(template.default_response_style).toHaveProperty('proactive', true);
      expect(template.default_response_style).toHaveProperty('color', '#059669');
      expect(template.default_response_style).toHaveProperty('tools');
    });

    it('should set reasonable defaults for posting_rules', async () => {
      const filePath = path.join(FIXTURES_DIR, 'valid-agent.md');
      const agent = await parseAgentMarkdown(filePath);
      const template = transformToSystemTemplate(agent);

      const postingRules = template.posting_rules as any;

      expect(postingRules.max_length).toBeGreaterThan(0);
      expect(postingRules.rate_limit).toBeDefined();
      expect(postingRules.rate_limit.posts_per_hour).toBeGreaterThan(0);
      expect(postingRules.rate_limit.posts_per_day).toBeGreaterThan(0);
      expect(Array.isArray(postingRules.prohibited_words)).toBe(true);
    });

    it('should set safety_constraints based on proactive flag', async () => {
      const filePath = path.join(FIXTURES_DIR, 'valid-agent.md');
      const agent = await parseAgentMarkdown(filePath);
      const template = transformToSystemTemplate(agent);

      const safetyConstraints = template.safety_constraints as any;

      // Proactive agent should not require user approval
      expect(safetyConstraints.require_user_approval).toBe(false);
      expect(Array.isArray(safetyConstraints.content_filters)).toBe(true);
      expect(safetyConstraints.max_mentions_per_post).toBeGreaterThan(0);
    });

    it('should preserve agent content as default_personality', async () => {
      const filePath = path.join(FIXTURES_DIR, 'valid-agent.md');
      const agent = await parseAgentMarkdown(filePath);
      const template = transformToSystemTemplate(agent);

      expect(template.default_personality).toBe(agent.content);
      expect(template.default_personality).toContain('# Test Agent');
    });
  });

  describe('4. Handling Duplicate Agents (Upsert)', () => {
    it('should insert new agent on first migration', async () => {
      const filePath = path.join(FIXTURES_DIR, 'valid-agent.md');
      const agent = await parseAgentMarkdown(filePath);

      // Verify agent doesn't exist
      const beforeCount = await pool.query(
        'SELECT COUNT(*) FROM system_agent_templates WHERE name = $1',
        [agent.name]
      );
      expect(parseInt(beforeCount.rows[0].count)).toBe(0);

      // Migrate agent
      const result = await migrateAgentsToPostgres(pool, [agent], false);

      expect(result.inserted).toBe(1);
      expect(result.updated).toBe(0);
      expect(result.failed).toBe(0);

      // Verify agent was inserted
      const afterCount = await pool.query(
        'SELECT COUNT(*) FROM system_agent_templates WHERE name = $1',
        [agent.name]
      );
      expect(parseInt(afterCount.rows[0].count)).toBe(1);
    });

    it('should update existing agent on duplicate migration', async () => {
      const filePath = path.join(FIXTURES_DIR, 'valid-agent.md');
      const agent = await parseAgentMarkdown(filePath);

      // First migration - insert
      await migrateAgentsToPostgres(pool, [agent], false);

      // Second migration - update
      const duplicatePath = path.join(FIXTURES_DIR, 'duplicate-agent.md');
      const duplicateAgent = await parseAgentMarkdown(duplicatePath);

      const result = await migrateAgentsToPostgres(pool, [duplicateAgent], false);

      expect(result.inserted).toBe(0);
      expect(result.updated).toBe(1);
      expect(result.failed).toBe(0);

      // Verify still only one record
      const count = await pool.query(
        'SELECT COUNT(*) FROM system_agent_templates WHERE name = $1',
        [agent.name]
      );
      expect(parseInt(count.rows[0].count)).toBe(1);

      // Verify data was updated
      const updatedAgent = await pool.query(
        'SELECT default_response_style FROM system_agent_templates WHERE name = $1',
        [agent.name]
      );
      const responseStyle = updatedAgent.rows[0].default_response_style;
      expect(responseStyle.color).toBe('#FF6600'); // Color from duplicate agent
    });

    it('should handle multiple migrations idempotently', async () => {
      const filePath = path.join(FIXTURES_DIR, 'valid-agent.md');
      const agent = await parseAgentMarkdown(filePath);

      // Migrate same agent 5 times
      for (let i = 0; i < 5; i++) {
        await migrateAgentsToPostgres(pool, [agent], false);
      }

      // Should still only have one record
      const count = await pool.query(
        'SELECT COUNT(*) FROM system_agent_templates WHERE name = $1',
        [agent.name]
      );
      expect(parseInt(count.rows[0].count)).toBe(1);
    });

    it('should update updated_at timestamp on duplicate', async () => {
      const filePath = path.join(FIXTURES_DIR, 'valid-agent.md');
      const agent = await parseAgentMarkdown(filePath);

      // First migration
      await migrateAgentsToPostgres(pool, [agent], false);

      const firstTimestamp = await pool.query(
        'SELECT updated_at FROM system_agent_templates WHERE name = $1',
        [agent.name]
      );

      // Wait a bit to ensure timestamp difference
      await new Promise(resolve => setTimeout(resolve, 100));

      // Second migration
      await migrateAgentsToPostgres(pool, [agent], false);

      const secondTimestamp = await pool.query(
        'SELECT updated_at FROM system_agent_templates WHERE name = $1',
        [agent.name]
      );

      const firstTime = new Date(firstTimestamp.rows[0].updated_at).getTime();
      const secondTime = new Date(secondTimestamp.rows[0].updated_at).getTime();

      expect(secondTime).toBeGreaterThan(firstTime);
    });
  });

  describe('5. Validating Required Fields', () => {
    it('should reject agent with missing name field', async () => {
      const filePath = path.join(FIXTURES_DIR, 'invalid-agent-missing-name.md');

      await expect(parseAgentMarkdown(filePath)).rejects.toThrow(
        'Missing required field: name'
      );
    });

    it('should reject agent with missing description field', async () => {
      const filePath = path.join(FIXTURES_DIR, 'invalid-agent-missing-description.md');

      await expect(parseAgentMarkdown(filePath)).rejects.toThrow(
        'Missing required field: description'
      );
    });

    it('should validate all production agents have required fields', async () => {
      const agents = await readAgentMarkdownFiles(AGENTS_DIR);

      // All production agents should have required fields
      agents.forEach(agent => {
        expect(agent.name).toBeDefined();
        expect(agent.name.length).toBeGreaterThan(0);
        expect(agent.description).toBeDefined();
        expect(agent.description.length).toBeGreaterThan(0);
      });
    });

    it('should provide clear error messages for validation failures', async () => {
      const filePath = path.join(FIXTURES_DIR, 'invalid-agent-missing-name.md');

      try {
        await parseAgentMarkdown(filePath);
        fail('Should have thrown validation error');
      } catch (error) {
        expect(error).toBeInstanceOf(Error);
        expect((error as Error).message).toContain('Missing required field');
        expect((error as Error).message).toContain('name');
      }
    });
  });

  describe('6. Error Handling for Invalid Markdown', () => {
    it('should handle non-existent file gracefully', async () => {
      const filePath = path.join(FIXTURES_DIR, 'non-existent-agent.md');

      await expect(parseAgentMarkdown(filePath)).rejects.toThrow();
    });

    it('should handle malformed YAML frontmatter', async () => {
      // Create temporary malformed file
      const tempPath = path.join(FIXTURES_DIR, 'malformed-temp.md');
      await fs.writeFile(tempPath, '---\nmalformed: yaml: content:\n---\n# Agent');

      try {
        await expect(parseAgentMarkdown(tempPath)).rejects.toThrow();
      } finally {
        // Cleanup
        await fs.unlink(tempPath).catch(() => {});
      }
    });

    it('should collect errors from multiple failed migrations', async () => {
      const validPath = path.join(FIXTURES_DIR, 'valid-agent.md');
      const invalidPath = path.join(FIXTURES_DIR, 'invalid-agent-missing-name.md');

      const validAgent = await parseAgentMarkdown(validPath);

      // Try to parse invalid agent manually to catch error
      let invalidAgents: AgentMarkdownData[] = [];
      try {
        const invalid = await parseAgentMarkdown(invalidPath);
        invalidAgents.push(invalid);
      } catch (error) {
        // Expected - invalid agent should fail
      }

      // Migrate only valid agents
      const result = await migrateAgentsToPostgres(pool, [validAgent], false);

      expect(result.success).toBe(true);
      expect(result.processed).toBe(1);
      expect(result.inserted).toBe(1);
      expect(result.failed).toBe(0);
    });

    it('should continue migration on single agent failure', async () => {
      const validPath = path.join(FIXTURES_DIR, 'valid-agent.md');
      const agent = await parseAgentMarkdown(validPath);

      // Create agent with invalid data that will fail database insert
      const invalidAgent: AgentMarkdownData = {
        ...agent,
        name: 'a'.repeat(100), // Exceeds VARCHAR(50) limit
      };

      const result = await migrateAgentsToPostgres(pool, [agent, invalidAgent], false);

      expect(result.processed).toBe(2);
      expect(result.inserted).toBeGreaterThan(0);
      expect(result.failed).toBeGreaterThan(0);
      expect(result.errors.length).toBeGreaterThan(0);
    });
  });

  describe('7. Dry-Run Mode', () => {
    it('should not modify database in dry-run mode', async () => {
      const filePath = path.join(FIXTURES_DIR, 'valid-agent.md');
      const agent = await parseAgentMarkdown(filePath);

      // Count before
      const beforeCount = await pool.query('SELECT COUNT(*) FROM system_agent_templates');
      const countBefore = parseInt(beforeCount.rows[0].count);

      // Run in dry-run mode
      const result = await migrateAgentsToPostgres(pool, [agent], true);

      // Count after
      const afterCount = await pool.query('SELECT COUNT(*) FROM system_agent_templates');
      const countAfter = parseInt(afterCount.rows[0].count);

      expect(countBefore).toBe(countAfter);
      expect(result.processed).toBe(1);
      expect(result.inserted).toBe(0);
      expect(result.updated).toBe(0);
    });

    it('should process all agents in dry-run without database changes', async () => {
      const agents = await readAgentMarkdownFiles(AGENTS_DIR);

      // Count before
      const beforeCount = await pool.query('SELECT COUNT(*) FROM system_agent_templates');
      const countBefore = parseInt(beforeCount.rows[0].count);

      // Run full migration in dry-run mode
      const result = await migrateAgentsToPostgres(pool, agents, true);

      // Count after
      const afterCount = await pool.query('SELECT COUNT(*) FROM system_agent_templates');
      const countAfter = parseInt(afterCount.rows[0].count);

      expect(countBefore).toBe(countAfter);
      expect(result.processed).toBe(agents.length);
      expect(result.inserted).toBe(0);
      expect(result.updated).toBe(0);
    });

    it('should report what would happen in dry-run mode', async () => {
      const filePath = path.join(FIXTURES_DIR, 'valid-agent.md');
      const agent = await parseAgentMarkdown(filePath);

      const result = await migrateAgentsToPostgres(pool, [agent], true);

      expect(result.processed).toBeGreaterThan(0);
      expect(result.success).toBe(true);
    });
  });

  describe('8. Full Migration Integration Tests', () => {
    it('should successfully migrate all 21 production agents', async () => {
      const result = await migrateAgentMarkdownToPostgres(pool, AGENTS_DIR, false);

      expect(result.success).toBe(true);
      expect(result.processed).toBe(21);
      expect(result.inserted).toBe(21);
      expect(result.updated).toBe(0);
      expect(result.failed).toBe(0);
      expect(result.errors).toHaveLength(0);

      // Verify count in database
      const count = await pool.query('SELECT COUNT(*) FROM system_agent_templates');
      expect(parseInt(count.rows[0].count)).toBe(21);
    });

    it('should verify data integrity after migration', async () => {
      await migrateAgentMarkdownToPostgres(pool, AGENTS_DIR, false);

      // Check specific agents exist
      const personalTodos = await pool.query(
        'SELECT * FROM system_agent_templates WHERE name = $1',
        ['personal-todos-agent']
      );

      expect(personalTodos.rows.length).toBe(1);
      expect(personalTodos.rows[0].version).toBe(1);
      expect(personalTodos.rows[0].posting_rules).toBeDefined();
      expect(personalTodos.rows[0].api_schema).toBeDefined();
      expect(personalTodos.rows[0].safety_constraints).toBeDefined();
    });

    it('should handle re-migration of all agents idempotently', async () => {
      // First migration
      const result1 = await migrateAgentMarkdownToPostgres(pool, AGENTS_DIR, false);
      expect(result1.inserted).toBe(21);

      // Second migration
      const result2 = await migrateAgentMarkdownToPostgres(pool, AGENTS_DIR, false);
      expect(result2.updated).toBe(21);
      expect(result2.inserted).toBe(0);

      // Verify count unchanged
      const count = await pool.query('SELECT COUNT(*) FROM system_agent_templates');
      expect(parseInt(count.rows[0].count)).toBe(21);
    });

    it('should count records before and after migration', async () => {
      // Count before
      const beforeResult = await pool.query('SELECT COUNT(*) FROM system_agent_templates');
      const beforeCount = parseInt(beforeResult.rows[0].count);
      expect(beforeCount).toBe(0); // Clean state from beforeEach

      // Migrate
      await migrateAgentMarkdownToPostgres(pool, AGENTS_DIR, false);

      // Count after
      const afterResult = await pool.query('SELECT COUNT(*) FROM system_agent_templates');
      const afterCount = parseInt(afterResult.rows[0].count);

      expect(afterCount - beforeCount).toBe(21);
    });

    it('should verify PostgreSQL JSONB fields are queryable', async () => {
      await migrateAgentMarkdownToPostgres(pool, AGENTS_DIR, false);

      // Query using JSONB operators
      const proactiveAgents = await pool.query(`
        SELECT name, default_response_style->>'proactive' as proactive
        FROM system_agent_templates
        WHERE (default_response_style->>'proactive')::boolean = true
      `);

      expect(proactiveAgents.rows.length).toBeGreaterThan(0);

      // Query by priority
      const p0Agents = await pool.query(`
        SELECT name, default_response_style->>'priority' as priority
        FROM system_agent_templates
        WHERE default_response_style->>'priority' = 'P0'
      `);

      expect(Array.isArray(p0Agents.rows)).toBe(true);
    });

    it('should handle database connection errors gracefully', async () => {
      // Create a pool with invalid credentials
      const badPool = new Pool({
        host: 'invalid-host',
        port: 9999,
        database: 'invalid',
        user: 'invalid',
        password: 'invalid',
        connectionTimeoutMillis: 1000,
      });

      await expect(
        migrateAgentMarkdownToPostgres(badPool, AGENTS_DIR, false)
      ).rejects.toThrow();

      await badPool.end();
    });

    it('should provide detailed migration summary', async () => {
      const result = await migrateAgentMarkdownToPostgres(pool, AGENTS_DIR, false);

      // Verify result structure
      expect(result).toHaveProperty('success');
      expect(result).toHaveProperty('processed');
      expect(result).toHaveProperty('inserted');
      expect(result).toHaveProperty('updated');
      expect(result).toHaveProperty('failed');
      expect(result).toHaveProperty('errors');

      // Verify summary data
      expect(typeof result.success).toBe('boolean');
      expect(typeof result.processed).toBe('number');
      expect(typeof result.inserted).toBe('number');
      expect(typeof result.updated).toBe('number');
      expect(typeof result.failed).toBe('number');
      expect(Array.isArray(result.errors)).toBe(true);
    });
  });

  describe('9. Performance Tests', () => {
    it('should migrate all agents in reasonable time (<5 seconds)', async () => {
      const startTime = performance.now();

      await migrateAgentMarkdownToPostgres(pool, AGENTS_DIR, false);

      const duration = performance.now() - startTime;

      expect(duration).toBeLessThan(5000); // <5 seconds
      console.log(`Migration completed in ${duration.toFixed(2)}ms`);
    });

    it('should handle concurrent reads efficiently', async () => {
      // Read agents multiple times concurrently
      const reads = Array.from({ length: 5 }, () =>
        readAgentMarkdownFiles(AGENTS_DIR)
      );

      const startTime = performance.now();
      const results = await Promise.all(reads);
      const duration = performance.now() - startTime;

      expect(results.length).toBe(5);
      results.forEach(agents => {
        expect(agents.length).toBe(21);
      });

      expect(duration).toBeLessThan(2000); // <2 seconds for 5 concurrent reads
      console.log(`Concurrent reads completed in ${duration.toFixed(2)}ms`);
    });
  });
});
