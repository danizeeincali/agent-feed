/**
 * Schema Creation Integration Tests
 *
 * Tests with REAL PostgreSQL database to verify:
 * - All 6 tables are created correctly
 * - Column data types match specifications
 * - Constraints are enforced (CHECK, UNIQUE, NOT NULL)
 * - Foreign keys work correctly
 * - GIN indexes exist and work
 * - Default values are applied
 */

import { describe, it, expect, beforeAll, afterAll, beforeEach } from '@jest/globals';
import { Pool } from 'pg';

describe('Schema Creation Integration Tests', () => {
  let pool: Pool;

  beforeAll(async () => {
    // Connect to REAL test database
    pool = new Pool({
      host: process.env.DB_HOST || 'localhost',
      port: parseInt(process.env.DB_PORT || '5432'),
      database: 'avidm_test', // Dedicated test database
      user: process.env.DB_USER || 'postgres',
      password: process.env.DB_PASSWORD || 'postgres',
    });
  });

  afterAll(async () => {
    await pool.end();
  });

  beforeEach(async () => {
    // Clean database before each test
    await pool.query('DROP SCHEMA public CASCADE');
    await pool.query('CREATE SCHEMA public');
    await pool.query('GRANT ALL ON SCHEMA public TO postgres');
    await pool.query('GRANT ALL ON SCHEMA public TO public');

    // Run the schema creation script
    const fs = require('fs');
    const path = require('path');
    const schemaSQL = fs.readFileSync(
      path.join(__dirname, '../../../src/database/schema/001_initial_schema.sql'),
      'utf-8'
    );
    await pool.query(schemaSQL);
  });

  describe('Table Creation', () => {
    it('should create all 6 tables', async () => {
      const result = await pool.query(`
        SELECT table_name
        FROM information_schema.tables
        WHERE table_schema = 'public'
        ORDER BY table_name
      `);

      const tableNames = result.rows.map((row) => row.table_name);

      expect(tableNames).toContain('system_agent_templates');
      expect(tableNames).toContain('user_agent_customizations');
      expect(tableNames).toContain('agent_memories');
      expect(tableNames).toContain('agent_workspaces');
      expect(tableNames).toContain('avi_state');
      expect(tableNames).toContain('error_log');
      expect(tableNames).toHaveLength(6);
    });
  });

  describe('TIER 1: system_agent_templates', () => {
    it('should have correct columns and data types', async () => {
      const result = await pool.query(`
        SELECT column_name, data_type, is_nullable, column_default
        FROM information_schema.columns
        WHERE table_schema = 'public'
          AND table_name = 'system_agent_templates'
        ORDER BY ordinal_position
      `);

      const columns = result.rows.map((row) => ({
        name: row.column_name,
        type: row.data_type,
        nullable: row.is_nullable,
        default: row.column_default,
      }));

      // Verify primary key
      expect(columns.find((c) => c.name === 'name')).toMatchObject({
        type: 'character varying',
        nullable: 'NO',
      });

      // Verify version column
      expect(columns.find((c) => c.name === 'version')).toMatchObject({
        type: 'integer',
        nullable: 'NO',
      });

      // Verify JSONB columns
      expect(columns.find((c) => c.name === 'posting_rules')?.type).toBe('jsonb');
      expect(columns.find((c) => c.name === 'api_schema')?.type).toBe('jsonb');
      expect(columns.find((c) => c.name === 'safety_constraints')?.type).toBe('jsonb');

      // Verify timestamps
      expect(columns.find((c) => c.name === 'created_at')?.type).toBe('timestamp without time zone');
      expect(columns.find((c) => c.name === 'updated_at')?.type).toBe('timestamp without time zone');
    });

    it('should enforce CHECK constraint (version > 0)', async () => {
      // Valid insert
      await pool.query(`
        INSERT INTO system_agent_templates (
          name, version, posting_rules, api_schema, safety_constraints
        ) VALUES (
          'test-agent',
          1,
          '{"max_length": 280}'::jsonb,
          '{"endpoint": "/api/post"}'::jsonb,
          '{"prohibited_words": []}'::jsonb
        )
      `);

      // Invalid insert (version = 0)
      await expect(
        pool.query(`
          INSERT INTO system_agent_templates (
            name, version, posting_rules, api_schema, safety_constraints
          ) VALUES (
            'bad-agent',
            0,
            '{"max_length": 280}'::jsonb,
            '{"endpoint": "/api/post"}'::jsonb,
            '{"prohibited_words": []}'::jsonb
          )
        `)
      ).rejects.toThrow(/system_only/);
    });

    it('should have primary key constraint on name', async () => {
      await pool.query(`
        INSERT INTO system_agent_templates (
          name, version, posting_rules, api_schema, safety_constraints
        ) VALUES (
          'test-agent',
          1,
          '{}'::jsonb,
          '{}'::jsonb,
          '{}'::jsonb
        )
      `);

      // Duplicate name should fail
      await expect(
        pool.query(`
          INSERT INTO system_agent_templates (
            name, version, posting_rules, api_schema, safety_constraints
          ) VALUES (
            'test-agent',
            2,
            '{}'::jsonb,
            '{}'::jsonb,
            '{}'::jsonb
          )
        `)
      ).rejects.toThrow(/duplicate key/);
    });
  });

  describe('TIER 2: user_agent_customizations', () => {
    it('should have correct columns and data types', async () => {
      const result = await pool.query(`
        SELECT column_name, data_type, is_nullable
        FROM information_schema.columns
        WHERE table_schema = 'public'
          AND table_name = 'user_agent_customizations'
        ORDER BY ordinal_position
      `);

      const columns = result.rows.map((row) => ({
        name: row.column_name,
        type: row.data_type,
        nullable: row.is_nullable,
      }));

      expect(columns.find((c) => c.name === 'id')).toMatchObject({
        type: 'integer',
        nullable: 'NO',
      });

      expect(columns.find((c) => c.name === 'user_id')).toMatchObject({
        type: 'character varying',
        nullable: 'NO',
      });

      expect(columns.find((c) => c.name === 'agent_template')).toMatchObject({
        type: 'character varying',
        nullable: 'NO',
      });

      expect(columns.find((c) => c.name === 'interests')?.type).toBe('jsonb');
      expect(columns.find((c) => c.name === 'response_style')?.type).toBe('jsonb');
      expect(columns.find((c) => c.name === 'enabled')?.type).toBe('boolean');
    });

    it('should enforce foreign key to system_agent_templates', async () => {
      // First create a template
      await pool.query(`
        INSERT INTO system_agent_templates (
          name, version, posting_rules, api_schema, safety_constraints
        ) VALUES (
          'tech-guru',
          1,
          '{}'::jsonb,
          '{}'::jsonb,
          '{}'::jsonb
        )
      `);

      // Valid customization
      await pool.query(`
        INSERT INTO user_agent_customizations (
          user_id, agent_template, custom_name
        ) VALUES (
          'user_123', 'tech-guru', 'My Tech Buddy'
        )
      `);

      // Invalid reference (non-existent template)
      await expect(
        pool.query(`
          INSERT INTO user_agent_customizations (
            user_id, agent_template, custom_name
          ) VALUES (
            'user_123', 'non-existent', 'Test'
          )
        `)
      ).rejects.toThrow(/violates foreign key constraint/);
    });

    it('should enforce UNIQUE constraint on (user_id, agent_template)', async () => {
      // Create template
      await pool.query(`
        INSERT INTO system_agent_templates (
          name, version, posting_rules, api_schema, safety_constraints
        ) VALUES (
          'tech-guru',
          1,
          '{}'::jsonb,
          '{}'::jsonb,
          '{}'::jsonb
        )
      `);

      // First customization
      await pool.query(`
        INSERT INTO user_agent_customizations (
          user_id, agent_template
        ) VALUES (
          'user_123', 'tech-guru'
        )
      `);

      // Duplicate should fail
      await expect(
        pool.query(`
          INSERT INTO user_agent_customizations (
            user_id, agent_template
          ) VALUES (
            'user_123', 'tech-guru'
          )
        `)
      ).rejects.toThrow(/duplicate key|unique_user_template/);
    });

    it('should enforce personality length CHECK constraint', async () => {
      // Create template
      await pool.query(`
        INSERT INTO system_agent_templates (
          name, version, posting_rules, api_schema, safety_constraints
        ) VALUES (
          'tech-guru',
          1,
          '{}'::jsonb,
          '{}'::jsonb,
          '{}'::jsonb
        )
      `);

      // Valid personality (under 5000 chars)
      await pool.query(`
        INSERT INTO user_agent_customizations (
          user_id, agent_template, personality
        ) VALUES (
          'user_123', 'tech-guru', '${'a'.repeat(4999)}'
        )
      `);

      // Invalid personality (over 5000 chars)
      await expect(
        pool.query(`
          INSERT INTO user_agent_customizations (
            user_id, agent_template, personality
          ) VALUES (
            'user_456', 'tech-guru', '${'a'.repeat(5001)}'
          )
        `)
      ).rejects.toThrow(/personality_length/);
    });

    it('should cascade delete when template is deleted', async () => {
      // Create template
      await pool.query(`
        INSERT INTO system_agent_templates (
          name, version, posting_rules, api_schema, safety_constraints
        ) VALUES (
          'tech-guru',
          1,
          '{}'::jsonb,
          '{}'::jsonb,
          '{}'::jsonb
        )
      `);

      // Create customization
      await pool.query(`
        INSERT INTO user_agent_customizations (
          user_id, agent_template
        ) VALUES (
          'user_123', 'tech-guru'
        )
      `);

      // Verify customization exists
      let result = await pool.query(
        'SELECT COUNT(*) as count FROM user_agent_customizations'
      );
      expect(parseInt(result.rows[0].count)).toBe(1);

      // Delete template
      await pool.query(`DELETE FROM system_agent_templates WHERE name = 'tech-guru'`);

      // Verify customization was cascade deleted
      result = await pool.query('SELECT COUNT(*) as count FROM user_agent_customizations');
      expect(parseInt(result.rows[0].count)).toBe(0);
    });
  });

  describe('TIER 3: agent_memories', () => {
    it('should have correct columns and data types', async () => {
      const result = await pool.query(`
        SELECT column_name, data_type, is_nullable
        FROM information_schema.columns
        WHERE table_schema = 'public'
          AND table_name = 'agent_memories'
        ORDER BY ordinal_position
      `);

      const columns = result.rows.map((row) => ({
        name: row.column_name,
        type: row.data_type,
        nullable: row.is_nullable,
      }));

      expect(columns.find((c) => c.name === 'id')).toMatchObject({
        type: 'integer',
        nullable: 'NO',
      });

      expect(columns.find((c) => c.name === 'user_id')).toMatchObject({
        type: 'character varying',
        nullable: 'NO',
      });

      expect(columns.find((c) => c.name === 'content')).toMatchObject({
        type: 'text',
        nullable: 'NO',
      });

      expect(columns.find((c) => c.name === 'metadata')?.type).toBe('jsonb');
    });

    it('should auto-populate created_at timestamp', async () => {
      await pool.query(`
        INSERT INTO agent_memories (user_id, agent_name, content)
        VALUES ('user_123', 'tech-guru', 'Test memory')
      `);

      const result = await pool.query(`
        SELECT created_at FROM agent_memories WHERE user_id = 'user_123'
      `);

      expect(result.rows[0].created_at).toBeInstanceOf(Date);
      expect(result.rows[0].created_at.getTime()).toBeGreaterThan(Date.now() - 5000);
    });

    it('should enforce no_manual_delete CHECK constraint', async () => {
      // Insert with created_at
      await pool.query(`
        INSERT INTO agent_memories (user_id, agent_name, content, created_at)
        VALUES ('user_123', 'tech-guru', 'Test memory', NOW())
      `);

      // Try to insert without created_at (should fail CHECK constraint)
      await expect(
        pool.query(`
          INSERT INTO agent_memories (user_id, agent_name, content, created_at)
          VALUES ('user_123', 'tech-guru', 'Test memory', NULL)
        `)
      ).rejects.toThrow(/no_manual_delete/);
    });
  });

  describe('TIER 3: agent_workspaces', () => {
    it('should have correct columns and data types', async () => {
      const result = await pool.query(`
        SELECT column_name, data_type, is_nullable
        FROM information_schema.columns
        WHERE table_schema = 'public'
          AND table_name = 'agent_workspaces'
        ORDER BY ordinal_position
      `);

      const columns = result.rows.map((row) => ({
        name: row.column_name,
        type: row.data_type,
        nullable: row.is_nullable,
      }));

      expect(columns.find((c) => c.name === 'id')).toMatchObject({
        type: 'integer',
        nullable: 'NO',
      });

      expect(columns.find((c) => c.name === 'file_path')).toMatchObject({
        type: 'text',
        nullable: 'NO',
      });

      expect(columns.find((c) => c.name === 'content')?.type).toBe('bytea');
      expect(columns.find((c) => c.name === 'metadata')?.type).toBe('jsonb');
    });

    it('should enforce UNIQUE constraint on (user_id, agent_name, file_path)', async () => {
      // First file
      await pool.query(`
        INSERT INTO agent_workspaces (user_id, agent_name, file_path, content)
        VALUES ('user_123', 'tech-guru', '/test.txt', 'Hello'::bytea)
      `);

      // Duplicate should fail
      await expect(
        pool.query(`
          INSERT INTO agent_workspaces (user_id, agent_name, file_path, content)
          VALUES ('user_123', 'tech-guru', '/test.txt', 'World'::bytea)
        `)
      ).rejects.toThrow(/duplicate key|unique_user_agent_file/);
    });

    it('should allow same file path for different users', async () => {
      // User 1
      await pool.query(`
        INSERT INTO agent_workspaces (user_id, agent_name, file_path, content)
        VALUES ('user_123', 'tech-guru', '/test.txt', 'User1'::bytea)
      `);

      // User 2 with same path should succeed
      await pool.query(`
        INSERT INTO agent_workspaces (user_id, agent_name, file_path, content)
        VALUES ('user_456', 'tech-guru', '/test.txt', 'User2'::bytea)
      `);

      const result = await pool.query(
        'SELECT COUNT(*) as count FROM agent_workspaces'
      );
      expect(parseInt(result.rows[0].count)).toBe(2);
    });
  });

  describe('avi_state', () => {
    it('should have correct columns and data types', async () => {
      const result = await pool.query(`
        SELECT column_name, data_type, is_nullable, column_default
        FROM information_schema.columns
        WHERE table_schema = 'public'
          AND table_name = 'avi_state'
        ORDER BY ordinal_position
      `);

      const columns = result.rows.map((row) => ({
        name: row.column_name,
        type: row.data_type,
        nullable: row.is_nullable,
        default: row.column_default,
      }));

      expect(columns.find((c) => c.name === 'id')).toMatchObject({
        type: 'integer',
        nullable: 'NO',
      });

      expect(columns.find((c) => c.name === 'context_size')).toMatchObject({
        type: 'integer',
        nullable: 'NO',
      });

      expect(columns.find((c) => c.name === 'pending_tickets')?.type).toBe('jsonb');
    });

    it('should enforce single row CHECK constraint (id = 1)', async () => {
      // Valid insert with id = 1
      await pool.query(`INSERT INTO avi_state (id) VALUES (1)`);

      // Try to insert id = 2 (should fail)
      await expect(
        pool.query(`INSERT INTO avi_state (id) VALUES (2)`)
      ).rejects.toThrow(/single_row/);
    });

    it('should allow update of existing row', async () => {
      await pool.query(`INSERT INTO avi_state (id, context_size) VALUES (1, 0)`);

      await pool.query(`
        UPDATE avi_state SET context_size = 1000 WHERE id = 1
      `);

      const result = await pool.query('SELECT context_size FROM avi_state WHERE id = 1');
      expect(result.rows[0].context_size).toBe(1000);
    });
  });

  describe('error_log', () => {
    it('should have correct columns and data types', async () => {
      const result = await pool.query(`
        SELECT column_name, data_type, is_nullable, column_default
        FROM information_schema.columns
        WHERE table_schema = 'public'
          AND table_name = 'error_log'
        ORDER BY ordinal_position
      `);

      const columns = result.rows.map((row) => ({
        name: row.column_name,
        type: row.data_type,
        nullable: row.is_nullable,
        default: row.column_default,
      }));

      expect(columns.find((c) => c.name === 'id')).toMatchObject({
        type: 'integer',
        nullable: 'NO',
      });

      expect(columns.find((c) => c.name === 'retry_count')).toMatchObject({
        type: 'integer',
        nullable: 'NO',
      });

      expect(columns.find((c) => c.name === 'resolved')).toMatchObject({
        type: 'boolean',
        nullable: 'NO',
      });

      expect(columns.find((c) => c.name === 'context')?.type).toBe('jsonb');
    });

    it('should auto-populate default values', async () => {
      await pool.query(`
        INSERT INTO error_log (error_message)
        VALUES ('Test error')
      `);

      const result = await pool.query('SELECT * FROM error_log');

      expect(result.rows[0].retry_count).toBe(0);
      expect(result.rows[0].resolved).toBe(false);
      expect(result.rows[0].created_at).toBeInstanceOf(Date);
    });
  });

  describe('GIN Indexes', () => {
    it('should create GIN indexes on JSONB columns', async () => {
      // Run indexes.sql
      const fs = require('fs');
      const path = require('path');
      const indexesSQL = fs.readFileSync(
        path.join(__dirname, '../../../src/database/schema/indexes.sql'),
        'utf-8'
      );
      await pool.query(indexesSQL);

      // Check for GIN index on agent_memories.metadata
      const memoriesIndexResult = await pool.query(`
        SELECT indexname, indexdef
        FROM pg_indexes
        WHERE tablename = 'agent_memories'
          AND indexname = 'idx_agent_memories_metadata'
      `);

      expect(memoriesIndexResult.rows).toHaveLength(1);
      expect(memoriesIndexResult.rows[0].indexdef).toContain('gin');
      expect(memoriesIndexResult.rows[0].indexdef).toContain('jsonb_path_ops');

      // Check for GIN index on user_agent_customizations.interests
      const customizationsIndexResult = await pool.query(`
        SELECT indexname, indexdef
        FROM pg_indexes
        WHERE tablename = 'user_agent_customizations'
          AND indexname = 'idx_user_agent_customizations_interests'
      `);

      expect(customizationsIndexResult.rows).toHaveLength(1);
      expect(customizationsIndexResult.rows[0].indexdef).toContain('gin');

      // Check for GIN index on agent_workspaces.metadata
      const workspacesIndexResult = await pool.query(`
        SELECT indexname, indexdef
        FROM pg_indexes
        WHERE tablename = 'agent_workspaces'
          AND indexname = 'idx_agent_workspaces_metadata'
      `);

      expect(workspacesIndexResult.rows).toHaveLength(1);
      expect(workspacesIndexResult.rows[0].indexdef).toContain('gin');
    });

    it('should use jsonb_path_ops for optimal performance', async () => {
      // Run indexes.sql
      const fs = require('fs');
      const path = require('path');
      const indexesSQL = fs.readFileSync(
        path.join(__dirname, '../../../src/database/schema/indexes.sql'),
        'utf-8'
      );
      await pool.query(indexesSQL);

      // Verify jsonb_path_ops is used (60% smaller indexes)
      const result = await pool.query(`
        SELECT indexname, indexdef
        FROM pg_indexes
        WHERE tablename IN ('agent_memories', 'user_agent_customizations', 'agent_workspaces')
          AND indexdef LIKE '%gin%'
      `);

      result.rows.forEach((row) => {
        expect(row.indexdef).toContain('jsonb_path_ops');
      });
    });
  });

  describe('Multi-User Data Isolation', () => {
    it('should maintain separate data for different users', async () => {
      // User 1 data
      await pool.query(`
        INSERT INTO agent_memories (user_id, agent_name, content)
        VALUES
          ('user_123', 'tech-guru', 'User 1 memory 1'),
          ('user_123', 'tech-guru', 'User 1 memory 2')
      `);

      // User 2 data
      await pool.query(`
        INSERT INTO agent_memories (user_id, agent_name, content)
        VALUES
          ('user_456', 'tech-guru', 'User 2 memory 1')
      `);

      // Query user 1 data
      const user1Result = await pool.query(
        'SELECT COUNT(*) as count FROM agent_memories WHERE user_id = $1',
        ['user_123']
      );
      expect(parseInt(user1Result.rows[0].count)).toBe(2);

      // Query user 2 data
      const user2Result = await pool.query(
        'SELECT COUNT(*) as count FROM agent_memories WHERE user_id = $1',
        ['user_456']
      );
      expect(parseInt(user2Result.rows[0].count)).toBe(1);
    });
  });
});
