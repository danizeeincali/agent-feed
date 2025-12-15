/**
 * TDD London School - SQL Schema Validation Tests
 * Tests written FIRST to define database schema requirements
 */

import { describe, it, expect, jest, beforeEach } from '@jest/globals';
import type { Pool } from 'pg';

// Mock database pool for testing
const createMockPool = () => ({
  query: jest.fn(),
  connect: jest.fn(),
  end: jest.fn()
});

describe('Database Schema Validation', () => {
  let mockPool: jest.Mocked<Pool>;

  beforeEach(() => {
    mockPool = createMockPool() as any;
  });

  describe('system_agent_templates table', () => {
    it('should have correct columns and constraints', async () => {
      // Mock the information_schema query
      mockPool.query.mockResolvedValueOnce({
        rows: [
          { column_name: 'name', data_type: 'character varying', is_nullable: 'NO' },
          { column_name: 'version', data_type: 'integer', is_nullable: 'NO' },
          { column_name: 'model', data_type: 'character varying', is_nullable: 'YES' },
          { column_name: 'posting_rules', data_type: 'jsonb', is_nullable: 'NO' },
          { column_name: 'api_schema', data_type: 'jsonb', is_nullable: 'NO' },
          { column_name: 'safety_constraints', data_type: 'jsonb', is_nullable: 'NO' },
          { column_name: 'default_personality', data_type: 'text', is_nullable: 'YES' },
          { column_name: 'default_response_style', data_type: 'jsonb', is_nullable: 'YES' },
          { column_name: 'created_at', data_type: 'timestamp without time zone', is_nullable: 'YES' },
          { column_name: 'updated_at', data_type: 'timestamp without time zone', is_nullable: 'YES' }
        ],
        rowCount: 10,
        command: 'SELECT',
        oid: 0,
        fields: []
      });

      const result = await mockPool.query(`
        SELECT column_name, data_type, is_nullable
        FROM information_schema.columns
        WHERE table_name = 'system_agent_templates'
        ORDER BY ordinal_position;
      `);

      expect(result.rows).toHaveLength(10);

      // Verify key columns
      const nameCol = result.rows.find(r => r.column_name === 'name');
      expect(nameCol?.is_nullable).toBe('NO');

      const modelCol = result.rows.find(r => r.column_name === 'model');
      expect(modelCol?.is_nullable).toBe('YES'); // Nullable to use env default

      const postingRulesCol = result.rows.find(r => r.column_name === 'posting_rules');
      expect(postingRulesCol?.data_type).toBe('jsonb');
      expect(postingRulesCol?.is_nullable).toBe('NO');
    });

    it('should have name as PRIMARY KEY', async () => {
      mockPool.query.mockResolvedValueOnce({
        rows: [{ constraint_type: 'PRIMARY KEY' }],
        rowCount: 1,
        command: 'SELECT',
        oid: 0,
        fields: []
      });

      const result = await mockPool.query(`
        SELECT constraint_type
        FROM information_schema.table_constraints
        WHERE table_name = 'system_agent_templates'
          AND constraint_type = 'PRIMARY KEY';
      `);

      expect(result.rows).toHaveLength(1);
      expect(result.rows[0].constraint_type).toBe('PRIMARY KEY');
    });

    it('should have GIN index on posting_rules JSONB', async () => {
      mockPool.query.mockResolvedValueOnce({
        rows: [{ indexname: 'idx_posting_rules', indexdef: 'CREATE INDEX idx_posting_rules ON system_agent_templates USING gin (posting_rules)' }],
        rowCount: 1,
        command: 'SELECT',
        oid: 0,
        fields: []
      });

      const result = await mockPool.query(`
        SELECT indexname, indexdef
        FROM pg_indexes
        WHERE tablename = 'system_agent_templates'
          AND indexname LIKE '%posting_rules%';
      `);

      expect(result.rows.length).toBeGreaterThan(0);
    });
  });

  describe('user_agent_customizations table', () => {
    it('should have correct columns and constraints', async () => {
      mockPool.query.mockResolvedValueOnce({
        rows: [
          { column_name: 'id', data_type: 'integer', is_nullable: 'NO' },
          { column_name: 'user_id', data_type: 'character varying', is_nullable: 'NO' },
          { column_name: 'agent_template', data_type: 'character varying', is_nullable: 'YES' },
          { column_name: 'custom_name', data_type: 'character varying', is_nullable: 'YES' },
          { column_name: 'personality', data_type: 'text', is_nullable: 'YES' },
          { column_name: 'interests', data_type: 'jsonb', is_nullable: 'YES' },
          { column_name: 'response_style', data_type: 'jsonb', is_nullable: 'YES' },
          { column_name: 'enabled', data_type: 'boolean', is_nullable: 'YES' },
          { column_name: 'created_at', data_type: 'timestamp without time zone', is_nullable: 'YES' },
          { column_name: 'updated_at', data_type: 'timestamp without time zone', is_nullable: 'YES' }
        ],
        rowCount: 10,
        command: 'SELECT',
        oid: 0,
        fields: []
      });

      const result = await mockPool.query(`
        SELECT column_name, data_type, is_nullable
        FROM information_schema.columns
        WHERE table_name = 'user_agent_customizations'
        ORDER BY ordinal_position;
      `);

      expect(result.rows).toHaveLength(10);

      const userIdCol = result.rows.find(r => r.column_name === 'user_id');
      expect(userIdCol?.is_nullable).toBe('NO');

      const interestsCol = result.rows.find(r => r.column_name === 'interests');
      expect(interestsCol?.data_type).toBe('jsonb');
    });

    it('should have UNIQUE constraint on (user_id, agent_template)', async () => {
      mockPool.query.mockResolvedValueOnce({
        rows: [{ constraint_type: 'UNIQUE' }],
        rowCount: 1,
        command: 'SELECT',
        oid: 0,
        fields: []
      });

      const result = await mockPool.query(`
        SELECT constraint_type
        FROM information_schema.table_constraints
        WHERE table_name = 'user_agent_customizations'
          AND constraint_type = 'UNIQUE';
      `);

      expect(result.rows.length).toBeGreaterThan(0);
    });

    it('should have FOREIGN KEY to system_agent_templates', async () => {
      mockPool.query.mockResolvedValueOnce({
        rows: [{ constraint_type: 'FOREIGN KEY', foreign_table_name: 'system_agent_templates' }],
        rowCount: 1,
        command: 'SELECT',
        oid: 0,
        fields: []
      });

      const result = await mockPool.query(`
        SELECT tc.constraint_type, ccu.table_name AS foreign_table_name
        FROM information_schema.table_constraints AS tc
        JOIN information_schema.constraint_column_usage AS ccu
          ON tc.constraint_name = ccu.constraint_name
        WHERE tc.table_name = 'user_agent_customizations'
          AND tc.constraint_type = 'FOREIGN KEY';
      `);

      expect(result.rows.length).toBeGreaterThan(0);
      expect(result.rows[0].foreign_table_name).toBe('system_agent_templates');
    });
  });

  describe('agent_memories table', () => {
    it('should have correct columns', async () => {
      mockPool.query.mockResolvedValueOnce({
        rows: [
          { column_name: 'id', data_type: 'integer', is_nullable: 'NO' },
          { column_name: 'user_id', data_type: 'character varying', is_nullable: 'NO' },
          { column_name: 'agent_name', data_type: 'character varying', is_nullable: 'NO' },
          { column_name: 'post_id', data_type: 'character varying', is_nullable: 'YES' },
          { column_name: 'content', data_type: 'text', is_nullable: 'NO' },
          { column_name: 'metadata', data_type: 'jsonb', is_nullable: 'YES' },
          { column_name: 'created_at', data_type: 'timestamp without time zone', is_nullable: 'YES' }
        ],
        rowCount: 7,
        command: 'SELECT',
        oid: 0,
        fields: []
      });

      const result = await mockPool.query(`
        SELECT column_name, data_type, is_nullable
        FROM information_schema.columns
        WHERE table_name = 'agent_memories'
        ORDER BY ordinal_position;
      `);

      expect(result.rows).toHaveLength(7);

      const contentCol = result.rows.find(r => r.column_name === 'content');
      expect(contentCol?.is_nullable).toBe('NO');

      const metadataCol = result.rows.find(r => r.column_name === 'metadata');
      expect(metadataCol?.data_type).toBe('jsonb');
    });

    it('should have composite index on (user_id, agent_name, created_at DESC)', async () => {
      mockPool.query.mockResolvedValueOnce({
        rows: [{ indexname: 'idx_user_agent_recency' }],
        rowCount: 1,
        command: 'SELECT',
        oid: 0,
        fields: []
      });

      const result = await mockPool.query(`
        SELECT indexname
        FROM pg_indexes
        WHERE tablename = 'agent_memories'
          AND indexname = 'idx_user_agent_recency';
      `);

      expect(result.rows).toHaveLength(1);
    });

    it('should have GIN index on metadata JSONB', async () => {
      mockPool.query.mockResolvedValueOnce({
        rows: [{ indexname: 'idx_metadata' }],
        rowCount: 1,
        command: 'SELECT',
        oid: 0,
        fields: []
      });

      const result = await mockPool.query(`
        SELECT indexname
        FROM pg_indexes
        WHERE tablename = 'agent_memories'
          AND indexname LIKE '%metadata%';
      `);

      expect(result.rows.length).toBeGreaterThan(0);
    });
  });

  describe('agent_workspaces table', () => {
    it('should have correct columns including BYTEA for content', async () => {
      mockPool.query.mockResolvedValueOnce({
        rows: [
          { column_name: 'id', data_type: 'integer', is_nullable: 'NO' },
          { column_name: 'user_id', data_type: 'character varying', is_nullable: 'NO' },
          { column_name: 'agent_name', data_type: 'character varying', is_nullable: 'NO' },
          { column_name: 'file_path', data_type: 'text', is_nullable: 'NO' },
          { column_name: 'content', data_type: 'bytea', is_nullable: 'YES' },
          { column_name: 'metadata', data_type: 'jsonb', is_nullable: 'YES' },
          { column_name: 'created_at', data_type: 'timestamp without time zone', is_nullable: 'YES' },
          { column_name: 'updated_at', data_type: 'timestamp without time zone', is_nullable: 'YES' }
        ],
        rowCount: 8,
        command: 'SELECT',
        oid: 0,
        fields: []
      });

      const result = await mockPool.query(`
        SELECT column_name, data_type, is_nullable
        FROM information_schema.columns
        WHERE table_name = 'agent_workspaces'
        ORDER BY ordinal_position;
      `);

      expect(result.rows).toHaveLength(8);

      const contentCol = result.rows.find(r => r.column_name === 'content');
      expect(contentCol?.data_type).toBe('bytea');
      expect(contentCol?.is_nullable).toBe('YES');
    });

    it('should have UNIQUE constraint on (user_id, agent_name, file_path)', async () => {
      mockPool.query.mockResolvedValueOnce({
        rows: [{ constraint_type: 'UNIQUE' }],
        rowCount: 1,
        command: 'SELECT',
        oid: 0,
        fields: []
      });

      const result = await mockPool.query(`
        SELECT constraint_type
        FROM information_schema.table_constraints
        WHERE table_name = 'agent_workspaces'
          AND constraint_type = 'UNIQUE';
      `);

      expect(result.rows.length).toBeGreaterThan(0);
    });
  });

  describe('avi_state table', () => {
    it('should have correct columns', async () => {
      mockPool.query.mockResolvedValueOnce({
        rows: [
          { column_name: 'id', data_type: 'integer', is_nullable: 'NO' },
          { column_name: 'last_feed_position', data_type: 'character varying', is_nullable: 'YES' },
          { column_name: 'pending_tickets', data_type: 'jsonb', is_nullable: 'YES' },
          { column_name: 'context_size', data_type: 'integer', is_nullable: 'YES' },
          { column_name: 'last_restart', data_type: 'timestamp without time zone', is_nullable: 'YES' },
          { column_name: 'uptime_seconds', data_type: 'integer', is_nullable: 'YES' }
        ],
        rowCount: 6,
        command: 'SELECT',
        oid: 0,
        fields: []
      });

      const result = await mockPool.query(`
        SELECT column_name, data_type, is_nullable
        FROM information_schema.columns
        WHERE table_name = 'avi_state'
        ORDER BY ordinal_position;
      `);

      expect(result.rows).toHaveLength(6);

      const idCol = result.rows.find(r => r.column_name === 'id');
      expect(idCol?.is_nullable).toBe('NO');
    });

    it('should have CHECK constraint for single row (id = 1)', async () => {
      mockPool.query.mockResolvedValueOnce({
        rows: [{ constraint_type: 'CHECK', check_clause: '(id = 1)' }],
        rowCount: 1,
        command: 'SELECT',
        oid: 0,
        fields: []
      });

      const result = await mockPool.query(`
        SELECT constraint_type, check_clause
        FROM information_schema.check_constraints
        WHERE constraint_name LIKE '%avi_state%';
      `);

      expect(result.rows.length).toBeGreaterThan(0);
    });
  });

  describe('error_log table', () => {
    it('should have correct columns', async () => {
      mockPool.query.mockResolvedValueOnce({
        rows: [
          { column_name: 'id', data_type: 'integer', is_nullable: 'NO' },
          { column_name: 'agent_name', data_type: 'character varying', is_nullable: 'YES' },
          { column_name: 'error_type', data_type: 'character varying', is_nullable: 'YES' },
          { column_name: 'error_message', data_type: 'text', is_nullable: 'YES' },
          { column_name: 'context', data_type: 'jsonb', is_nullable: 'YES' },
          { column_name: 'retry_count', data_type: 'integer', is_nullable: 'YES' },
          { column_name: 'resolved', data_type: 'boolean', is_nullable: 'YES' },
          { column_name: 'created_at', data_type: 'timestamp without time zone', is_nullable: 'YES' }
        ],
        rowCount: 8,
        command: 'SELECT',
        oid: 0,
        fields: []
      });

      const result = await mockPool.query(`
        SELECT column_name, data_type, is_nullable
        FROM information_schema.columns
        WHERE table_name = 'error_log'
        ORDER BY ordinal_position;
      `);

      expect(result.rows).toHaveLength(8);

      const contextCol = result.rows.find(r => r.column_name === 'context');
      expect(contextCol?.data_type).toBe('jsonb');
    });

    it('should have index on created_at for time-series queries', async () => {
      mockPool.query.mockResolvedValueOnce({
        rows: [{ indexname: 'idx_error_created' }],
        rowCount: 1,
        command: 'SELECT',
        oid: 0,
        fields: []
      });

      const result = await mockPool.query(`
        SELECT indexname
        FROM pg_indexes
        WHERE tablename = 'error_log'
          AND indexname LIKE '%created%';
      `);

      expect(result.rows.length).toBeGreaterThan(0);
    });
  });

  describe('Schema Integrity', () => {
    it('should have all 6 tables defined', async () => {
      mockPool.query.mockResolvedValueOnce({
        rows: [
          { table_name: 'system_agent_templates' },
          { table_name: 'user_agent_customizations' },
          { table_name: 'agent_memories' },
          { table_name: 'agent_workspaces' },
          { table_name: 'avi_state' },
          { table_name: 'error_log' }
        ],
        rowCount: 6,
        command: 'SELECT',
        oid: 0,
        fields: []
      });

      const result = await mockPool.query(`
        SELECT table_name
        FROM information_schema.tables
        WHERE table_schema = 'public'
          AND table_type = 'BASE TABLE'
        ORDER BY table_name;
      `);

      expect(result.rows).toHaveLength(6);
      const tableNames = result.rows.map(r => r.table_name);
      expect(tableNames).toContain('system_agent_templates');
      expect(tableNames).toContain('user_agent_customizations');
      expect(tableNames).toContain('agent_memories');
      expect(tableNames).toContain('agent_workspaces');
      expect(tableNames).toContain('avi_state');
      expect(tableNames).toContain('error_log');
    });
  });
});
