/**
 * System Template Seeding Integration Tests
 *
 * Tests with REAL PostgreSQL database to verify:
 * - Template seeding from JSON files
 * - 3 templates are inserted correctly
 * - Idempotency (can run multiple times)
 * - Data structure matches schema
 * - UPSERT behavior on conflicts
 */

import { describe, it, expect, beforeAll, afterAll, beforeEach } from '@jest/globals';
import { Pool } from 'pg';
import { seedSystemTemplates } from '../../../src/database/seed-templates';
import * as fs from 'fs/promises';
import * as path from 'path';

describe('System Template Seeding Integration Tests', () => {
  let pool: Pool;
  const templateDir = path.join(__dirname, '../../../config/system/agent-templates');

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
    // Clean database and recreate schema
    await pool.query('DROP SCHEMA public CASCADE');
    await pool.query('CREATE SCHEMA public');
    await pool.query('GRANT ALL ON SCHEMA public TO postgres');
    await pool.query('GRANT ALL ON SCHEMA public TO public');

    // Create schema
    const schemaSQL = await fs.readFile(
      path.join(__dirname, '../../../src/database/schema/001_initial_schema.sql'),
      'utf-8'
    );
    await pool.query(schemaSQL);
  });

  describe('Template Seeding', () => {
    it('should seed all 3 templates from JSON files', async () => {
      // Verify table is initially empty
      let result = await pool.query('SELECT COUNT(*) as count FROM system_agent_templates');
      expect(parseInt(result.rows[0].count)).toBe(0);

      // Run seeding
      await seedSystemTemplates(pool, templateDir);

      // Verify 3 templates were inserted
      result = await pool.query('SELECT COUNT(*) as count FROM system_agent_templates');
      expect(parseInt(result.rows[0].count)).toBe(3);

      // Verify template names
      result = await pool.query(
        'SELECT name FROM system_agent_templates ORDER BY name'
      );
      const names = result.rows.map((row) => row.name);
      expect(names).toContain('creative-writer');
      expect(names).toContain('data-analyst');
      expect(names).toContain('tech-guru');
    });

    it('should correctly populate all template fields', async () => {
      await seedSystemTemplates(pool, templateDir);

      // Fetch tech-guru template
      const result = await pool.query(
        'SELECT * FROM system_agent_templates WHERE name = $1',
        ['tech-guru']
      );

      expect(result.rows).toHaveLength(1);

      const template = result.rows[0];

      // Verify required fields
      expect(template.name).toBe('tech-guru');
      expect(template.version).toBeGreaterThan(0);

      // Verify JSONB fields
      expect(template.posting_rules).toBeDefined();
      expect(typeof template.posting_rules).toBe('object');
      expect(template.posting_rules.max_length).toBeDefined();

      expect(template.api_schema).toBeDefined();
      expect(typeof template.api_schema).toBe('object');

      expect(template.safety_constraints).toBeDefined();
      expect(typeof template.safety_constraints).toBe('object');

      // Verify text fields
      expect(template.default_personality).toBeDefined();
      expect(typeof template.default_personality).toBe('string');

      // Verify timestamps
      expect(template.created_at).toBeInstanceOf(Date);
      expect(template.updated_at).toBeInstanceOf(Date);
    });

    it('should handle JSONB data correctly', async () => {
      await seedSystemTemplates(pool, templateDir);

      const result = await pool.query(
        'SELECT posting_rules, api_schema, safety_constraints FROM system_agent_templates WHERE name = $1',
        ['tech-guru']
      );

      const template = result.rows[0];

      // Verify posting_rules structure
      expect(template.posting_rules).toMatchObject({
        max_length: expect.any(Number),
      });

      // Verify API schema structure
      expect(template.api_schema).toHaveProperty('endpoint');
      expect(template.api_schema).toHaveProperty('auth_type');

      // Verify safety constraints
      expect(template.safety_constraints).toHaveProperty('prohibited_words');
      expect(Array.isArray(template.safety_constraints.prohibited_words)).toBe(true);
    });
  });

  describe('Idempotency', () => {
    it('should allow running seed multiple times without errors', async () => {
      // First seed
      await seedSystemTemplates(pool, templateDir);

      let result = await pool.query('SELECT COUNT(*) as count FROM system_agent_templates');
      expect(parseInt(result.rows[0].count)).toBe(3);

      // Second seed (should UPSERT)
      await seedSystemTemplates(pool, templateDir);

      // Should still have 3 templates (no duplicates)
      result = await pool.query('SELECT COUNT(*) as count FROM system_agent_templates');
      expect(parseInt(result.rows[0].count)).toBe(3);
    });

    it('should update existing templates on conflict', async () => {
      // First seed
      await seedSystemTemplates(pool, templateDir);

      // Get initial updated_at
      let result = await pool.query(
        'SELECT version, updated_at FROM system_agent_templates WHERE name = $1',
        ['tech-guru']
      );
      const initialVersion = result.rows[0].version;
      const initialUpdatedAt = result.rows[0].updated_at;

      // Wait a moment to ensure timestamp difference
      await new Promise((resolve) => setTimeout(resolve, 100));

      // Modify version in database
      await pool.query(
        'UPDATE system_agent_templates SET version = $1, updated_at = NOW() WHERE name = $2',
        [initialVersion + 1, 'tech-guru']
      );

      // Second seed (should restore original version)
      await seedSystemTemplates(pool, templateDir);

      // Verify version was restored
      result = await pool.query(
        'SELECT version, updated_at FROM system_agent_templates WHERE name = $1',
        ['tech-guru']
      );

      expect(result.rows[0].version).toBe(initialVersion);
      // updated_at should be newer
      expect(result.rows[0].updated_at.getTime()).toBeGreaterThan(
        initialUpdatedAt.getTime()
      );
    });

    it('should preserve created_at on updates', async () => {
      // First seed
      await seedSystemTemplates(pool, templateDir);

      let result = await pool.query(
        'SELECT created_at FROM system_agent_templates WHERE name = $1',
        ['tech-guru']
      );
      const originalCreatedAt = result.rows[0].created_at;

      // Wait a moment
      await new Promise((resolve) => setTimeout(resolve, 100));

      // Second seed
      await seedSystemTemplates(pool, templateDir);

      // Verify created_at is unchanged
      result = await pool.query(
        'SELECT created_at FROM system_agent_templates WHERE name = $1',
        ['tech-guru']
      );

      expect(result.rows[0].created_at.getTime()).toBe(originalCreatedAt.getTime());
    });
  });

  describe('Data Validation', () => {
    it('should enforce version > 0 constraint', async () => {
      // Create invalid template JSON
      const invalidTemplate = {
        name: 'invalid-template',
        version: 0, // Invalid
        posting_rules: { max_length: 280 },
        api_schema: { endpoint: '/api/post' },
        safety_constraints: { prohibited_words: [] },
        default_personality: 'Test',
      };

      // Try to insert manually (should fail)
      await expect(
        pool.query(
          `
          INSERT INTO system_agent_templates (
            name, version, posting_rules, api_schema, safety_constraints
          ) VALUES ($1, $2, $3, $4, $5)
        `,
          [
            invalidTemplate.name,
            invalidTemplate.version,
            JSON.stringify(invalidTemplate.posting_rules),
            JSON.stringify(invalidTemplate.api_schema),
            JSON.stringify(invalidTemplate.safety_constraints),
          ]
        )
      ).rejects.toThrow(/system_only/);
    });

    it('should require all mandatory JSONB fields', async () => {
      // Try to insert without posting_rules
      await expect(
        pool.query(
          `
          INSERT INTO system_agent_templates (
            name, version, api_schema, safety_constraints
          ) VALUES ($1, $2, $3, $4)
        `,
          [
            'incomplete-template',
            1,
            JSON.stringify({ endpoint: '/api/post' }),
            JSON.stringify({ prohibited_words: [] }),
          ]
        )
      ).rejects.toThrow(/null value|not null/);
    });
  });

  describe('Template Content Verification', () => {
    it('should match JSON file content for tech-guru', async () => {
      await seedSystemTemplates(pool, templateDir);

      // Read JSON file
      const jsonContent = await fs.readFile(
        path.join(templateDir, 'tech-guru.json'),
        'utf-8'
      );
      const expectedTemplate = JSON.parse(jsonContent);

      // Fetch from database
      const result = await pool.query(
        'SELECT * FROM system_agent_templates WHERE name = $1',
        ['tech-guru']
      );

      const actualTemplate = result.rows[0];

      // Verify core fields match
      expect(actualTemplate.name).toBe(expectedTemplate.name);
      expect(actualTemplate.version).toBe(expectedTemplate.version);
      expect(actualTemplate.default_personality).toBe(expectedTemplate.default_personality);

      // Verify JSONB fields match
      expect(actualTemplate.posting_rules).toEqual(expectedTemplate.posting_rules);
      expect(actualTemplate.api_schema).toEqual(expectedTemplate.api_schema);
      expect(actualTemplate.safety_constraints).toEqual(
        expectedTemplate.safety_constraints
      );
    });

    it('should match JSON file content for creative-writer', async () => {
      await seedSystemTemplates(pool, templateDir);

      const jsonContent = await fs.readFile(
        path.join(templateDir, 'creative-writer.json'),
        'utf-8'
      );
      const expectedTemplate = JSON.parse(jsonContent);

      const result = await pool.query(
        'SELECT * FROM system_agent_templates WHERE name = $1',
        ['creative-writer']
      );

      const actualTemplate = result.rows[0];

      expect(actualTemplate.name).toBe(expectedTemplate.name);
      expect(actualTemplate.version).toBe(expectedTemplate.version);
      expect(actualTemplate.posting_rules).toEqual(expectedTemplate.posting_rules);
    });

    it('should match JSON file content for data-analyst', async () => {
      await seedSystemTemplates(pool, templateDir);

      const jsonContent = await fs.readFile(
        path.join(templateDir, 'data-analyst.json'),
        'utf-8'
      );
      const expectedTemplate = JSON.parse(jsonContent);

      const result = await pool.query(
        'SELECT * FROM system_agent_templates WHERE name = $1',
        ['data-analyst']
      );

      const actualTemplate = result.rows[0];

      expect(actualTemplate.name).toBe(expectedTemplate.name);
      expect(actualTemplate.version).toBe(expectedTemplate.version);
      expect(actualTemplate.safety_constraints).toEqual(
        expectedTemplate.safety_constraints
      );
    });
  });

  describe('Error Handling', () => {
    it('should fail gracefully if config directory does not exist', async () => {
      await expect(
        seedSystemTemplates(pool, '/nonexistent/path')
      ).rejects.toThrow();
    });

    it('should fail gracefully on invalid JSON', async () => {
      // Create temp directory with invalid JSON
      const tempDir = path.join(__dirname, '../fixtures/invalid-templates');
      await fs.mkdir(tempDir, { recursive: true });

      await fs.writeFile(
        path.join(tempDir, 'invalid.json'),
        'this is not valid JSON{{'
      );

      await expect(seedSystemTemplates(pool, tempDir)).rejects.toThrow();

      // Cleanup
      await fs.rm(tempDir, { recursive: true });
    });

    it('should rollback transaction on error', async () => {
      // Create temp directory with one valid and one invalid template
      const tempDir = path.join(__dirname, '../fixtures/mixed-templates');
      await fs.mkdir(tempDir, { recursive: true });

      // Valid template
      await fs.writeFile(
        path.join(tempDir, 'valid.json'),
        JSON.stringify({
          name: 'valid-template',
          version: 1,
          posting_rules: { max_length: 280 },
          api_schema: { endpoint: '/api/post' },
          safety_constraints: { prohibited_words: [] },
          default_personality: 'Test',
        })
      );

      // Invalid template (missing required field)
      await fs.writeFile(
        path.join(tempDir, 'invalid.json'),
        JSON.stringify({
          name: 'invalid-template',
          version: 1,
          // Missing posting_rules
          api_schema: { endpoint: '/api/post' },
          safety_constraints: { prohibited_words: [] },
        })
      );

      // Should fail
      await expect(seedSystemTemplates(pool, tempDir)).rejects.toThrow();

      // Verify no templates were inserted
      const result = await pool.query('SELECT COUNT(*) as count FROM system_agent_templates');
      expect(parseInt(result.rows[0].count)).toBe(0);

      // Cleanup
      await fs.rm(tempDir, { recursive: true });
    });
  });

  describe('Query Performance', () => {
    it('should efficiently query templates after seeding', async () => {
      await seedSystemTemplates(pool, templateDir);

      // Query by name (primary key)
      const startTime = Date.now();
      const result = await pool.query(
        'SELECT * FROM system_agent_templates WHERE name = $1',
        ['tech-guru']
      );
      const queryTime = Date.now() - startTime;

      expect(result.rows).toHaveLength(1);
      expect(queryTime).toBeLessThan(50); // Should be very fast (PK lookup)
    });

    it('should support JSONB containment queries', async () => {
      await seedSystemTemplates(pool, templateDir);

      // Query templates with specific posting rule
      const result = await pool.query(`
        SELECT name FROM system_agent_templates
        WHERE posting_rules @> '{"max_length": 280}'::jsonb
      `);

      expect(result.rows.length).toBeGreaterThan(0);
    });
  });

  describe('Multi-Template Operations', () => {
    it('should handle batch queries efficiently', async () => {
      await seedSystemTemplates(pool, templateDir);

      // Fetch all templates at once
      const result = await pool.query(
        'SELECT * FROM system_agent_templates ORDER BY name'
      );

      expect(result.rows).toHaveLength(3);

      // Verify all templates have required fields
      result.rows.forEach((template) => {
        expect(template.name).toBeDefined();
        expect(template.version).toBeGreaterThan(0);
        expect(template.posting_rules).toBeDefined();
        expect(template.api_schema).toBeDefined();
        expect(template.safety_constraints).toBeDefined();
      });
    });

    it('should support filtering by version', async () => {
      await seedSystemTemplates(pool, templateDir);

      // Query templates with version >= 1
      const result = await pool.query(
        'SELECT COUNT(*) as count FROM system_agent_templates WHERE version >= 1'
      );

      expect(parseInt(result.rows[0].count)).toBe(3);
    });
  });
});
