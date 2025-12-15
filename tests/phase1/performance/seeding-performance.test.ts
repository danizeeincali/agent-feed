/**
 * Seeding Performance Tests
 * Phase 1: Verify system template seeding meets performance requirements
 *
 * Requirements:
 * - seedSystemTemplates() execution time: <2 seconds for 3 templates
 * - UPSERT operations: Idempotent and efficient
 * - File I/O: Fast JSON parsing
 * - Validation: Minimal overhead
 */

import { describe, it, expect, beforeAll, afterAll, beforeEach } from '@jest/globals';
import { Pool } from 'pg';
import * as fs from 'fs/promises';
import * as path from 'path';
import { seedSystemTemplates } from '../../../src/database/seed-templates';

describe('Seeding Performance Tests', () => {
  let pool: Pool;
  const SEEDING_THRESHOLD_MS = 2000; // Must complete in <2 seconds for 3 templates
  const TEST_CONFIG_DIR = '/tmp/test-agent-templates';

  beforeAll(async () => {
    // Connect to test database
    pool = new Pool({
      host: process.env.DB_HOST || 'localhost',
      port: parseInt(process.env.DB_PORT || '5432'),
      database: process.env.DB_NAME || 'agentfeed_test',
      user: process.env.DB_USER || 'postgres',
      password: process.env.DB_PASSWORD || 'postgres',
    });

    // Create test config directory
    await fs.mkdir(TEST_CONFIG_DIR, { recursive: true });

    // Create test template files
    await createTestTemplates();
  });

  afterAll(async () => {
    // Cleanup test directory
    await fs.rm(TEST_CONFIG_DIR, { recursive: true, force: true });
    await pool.end();
  });

  beforeEach(async () => {
    // Reset database
    await pool.query('DROP SCHEMA IF EXISTS public CASCADE');
    await pool.query('CREATE SCHEMA public');

    // Create tables
    const schemaSQL = `
      CREATE TABLE system_agent_templates (
        name VARCHAR(50) PRIMARY KEY,
        version INTEGER NOT NULL,
        model VARCHAR(100),
        posting_rules JSONB NOT NULL,
        api_schema JSONB NOT NULL,
        safety_constraints JSONB NOT NULL,
        default_personality TEXT,
        default_response_style JSONB,
        created_at TIMESTAMP DEFAULT NOW() NOT NULL,
        updated_at TIMESTAMP DEFAULT NOW() NOT NULL
      );
    `;

    await pool.query(schemaSQL);
  });

  async function createTestTemplates() {
    // Template 1: Tech Guru
    const techGuru = {
      name: 'tech-guru',
      version: 1,
      model: 'claude-sonnet-4-5-20250929',
      posting_rules: {
        max_length: 280,
        rate_limit_per_hour: 5,
        cooldown_seconds: 300,
        prohibited_words: ['spam', 'scam'],
      },
      api_schema: {
        endpoints: ['/api/post', '/api/reply'],
        auth_type: 'bearer',
      },
      safety_constraints: {
        content_filters: ['hate', 'violence', 'spam'],
        max_mentions_per_post: 3,
        require_human_approval_for: ['financial_advice', 'medical_advice'],
      },
      default_personality: 'You are a tech enthusiast who loves discussing AI, startups, and innovation.',
      default_response_style: {
        tone: 'friendly',
        length: 'concise',
        use_emojis: true,
      },
    };

    // Template 2: Creative Writer
    const creativeWriter = {
      name: 'creative-writer',
      version: 1,
      model: 'claude-sonnet-4-5-20250929',
      posting_rules: {
        max_length: 500,
        rate_limit_per_hour: 3,
        cooldown_seconds: 600,
        prohibited_words: ['plagiarism'],
      },
      api_schema: {
        endpoints: ['/api/post', '/api/thread'],
        auth_type: 'bearer',
      },
      safety_constraints: {
        content_filters: ['hate', 'violence'],
        max_mentions_per_post: 2,
        require_human_approval_for: ['controversial_topics'],
      },
      default_personality: 'You are a creative writer who crafts engaging stories and thoughtful prose.',
      default_response_style: {
        tone: 'thoughtful',
        length: 'detailed',
        use_emojis: false,
      },
    };

    // Template 3: Data Analyst
    const dataAnalyst = {
      name: 'data-analyst',
      version: 1,
      model: 'claude-sonnet-4-5-20250929',
      posting_rules: {
        max_length: 280,
        rate_limit_per_hour: 10,
        cooldown_seconds: 180,
        prohibited_words: ['fake', 'misleading'],
      },
      api_schema: {
        endpoints: ['/api/post'],
        auth_type: 'bearer',
      },
      safety_constraints: {
        content_filters: ['misinformation'],
        max_mentions_per_post: 5,
        require_human_approval_for: ['market_predictions'],
      },
      default_personality: 'You are a data analyst who shares insights backed by statistics and research.',
      default_response_style: {
        tone: 'professional',
        length: 'concise',
        use_emojis: false,
      },
    };

    await fs.writeFile(
      path.join(TEST_CONFIG_DIR, 'tech-guru.json'),
      JSON.stringify(techGuru, null, 2)
    );

    await fs.writeFile(
      path.join(TEST_CONFIG_DIR, 'creative-writer.json'),
      JSON.stringify(creativeWriter, null, 2)
    );

    await fs.writeFile(
      path.join(TEST_CONFIG_DIR, 'data-analyst.json'),
      JSON.stringify(dataAnalyst, null, 2)
    );
  }

  describe('Seeding Execution Time', () => {
    it('should seed 3 templates in <2 seconds (requirement)', async () => {
      const startTime = performance.now();

      await seedSystemTemplates(pool, TEST_CONFIG_DIR);

      const executionTime = performance.now() - startTime;

      expect(executionTime).toBeLessThan(SEEDING_THRESHOLD_MS);

      console.log(`Seeding time for 3 templates: ${executionTime.toFixed(2)}ms (threshold: ${SEEDING_THRESHOLD_MS}ms)`);

      // Verify all templates were inserted
      const result = await pool.query('SELECT COUNT(*) as count FROM system_agent_templates');
      expect(parseInt(result.rows[0].count)).toBe(3);
    });

    it('should measure file I/O time separately', async () => {
      const ioStartTime = performance.now();

      const files = await fs.readdir(TEST_CONFIG_DIR);
      const jsonFiles = files.filter(file => file.endsWith('.json'));

      const templateData = await Promise.all(
        jsonFiles.map(async file => {
          const filePath = path.join(TEST_CONFIG_DIR, file);
          const content = await fs.readFile(filePath, 'utf-8');
          return JSON.parse(content);
        })
      );

      const ioTime = performance.now() - ioStartTime;

      expect(templateData.length).toBe(3);
      expect(ioTime).toBeLessThan(100); // File I/O should be very fast

      console.log(`File I/O time: ${ioTime.toFixed(2)}ms`);
    });

    it('should measure database insert time', async () => {
      // Pre-load template data
      const files = await fs.readdir(TEST_CONFIG_DIR);
      const templateData = await Promise.all(
        files.filter(f => f.endsWith('.json')).map(async file => {
          const content = await fs.readFile(path.join(TEST_CONFIG_DIR, file), 'utf-8');
          return JSON.parse(content);
        })
      );

      const dbStartTime = performance.now();

      // Insert templates
      for (const template of templateData) {
        await pool.query(
          `INSERT INTO system_agent_templates (
            name, version, model, posting_rules, api_schema,
            safety_constraints, default_personality, default_response_style
          )
          VALUES ($1, $2, $3, $4, $5, $6, $7, $8)`,
          [
            template.name,
            template.version,
            template.model,
            JSON.stringify(template.posting_rules),
            JSON.stringify(template.api_schema),
            JSON.stringify(template.safety_constraints),
            template.default_personality,
            JSON.stringify(template.default_response_style),
          ]
        );
      }

      const dbTime = performance.now() - dbStartTime;

      expect(dbTime).toBeLessThan(SEEDING_THRESHOLD_MS);

      console.log(`Database insert time: ${dbTime.toFixed(2)}ms`);
    });
  });

  describe('UPSERT Performance (Idempotency)', () => {
    it('should perform UPSERT efficiently on second run', async () => {
      // First run: INSERT
      await seedSystemTemplates(pool, TEST_CONFIG_DIR);

      // Second run: UPDATE (should use ON CONFLICT)
      const startTime = performance.now();

      await seedSystemTemplates(pool, TEST_CONFIG_DIR);

      const executionTime = performance.now() - startTime;

      expect(executionTime).toBeLessThan(SEEDING_THRESHOLD_MS);

      console.log(`UPSERT time (second run): ${executionTime.toFixed(2)}ms`);

      // Verify still only 3 templates (no duplicates)
      const result = await pool.query('SELECT COUNT(*) as count FROM system_agent_templates');
      expect(parseInt(result.rows[0].count)).toBe(3);
    });

    it('should handle multiple consecutive seeding operations', async () => {
      const iterations = 5;
      const times: number[] = [];

      for (let i = 0; i < iterations; i++) {
        const startTime = performance.now();

        await seedSystemTemplates(pool, TEST_CONFIG_DIR);

        times.push(performance.now() - startTime);
      }

      const avgTime = times.reduce((a, b) => a + b, 0) / times.length;

      expect(avgTime).toBeLessThan(SEEDING_THRESHOLD_MS);

      console.log(`Average seeding time over ${iterations} runs: ${avgTime.toFixed(2)}ms`);
      console.log(`Individual times: ${times.map(t => t.toFixed(2)).join('ms, ')}ms`);

      // Verify still only 3 templates
      const result = await pool.query('SELECT COUNT(*) as count FROM system_agent_templates');
      expect(parseInt(result.rows[0].count)).toBe(3);
    });
  });

  describe('Validation Overhead', () => {
    it('should measure validation performance', async () => {
      const { validateSystemTemplateConfig } = await import('../../../src/types/agent-templates');

      const files = await fs.readdir(TEST_CONFIG_DIR);
      const templateData = await Promise.all(
        files.filter(f => f.endsWith('.json')).map(async file => {
          const content = await fs.readFile(path.join(TEST_CONFIG_DIR, file), 'utf-8');
          return JSON.parse(content);
        })
      );

      const validationStartTime = performance.now();

      for (const template of templateData) {
        const result = validateSystemTemplateConfig(template);
        expect(result.success).toBe(true);
      }

      const validationTime = performance.now() - validationStartTime;

      expect(validationTime).toBeLessThan(50); // Validation should be very fast

      console.log(`Validation time for 3 templates: ${validationTime.toFixed(2)}ms`);
    });
  });

  describe('Scalability Tests', () => {
    it('should project performance for 10 templates', async () => {
      // Create additional templates
      for (let i = 4; i <= 10; i++) {
        const template = {
          name: `agent-${i}`,
          version: 1,
          model: 'claude-sonnet-4-5-20250929',
          posting_rules: { max_length: 280, rate_limit_per_hour: 5 },
          api_schema: { endpoints: ['/api/post'] },
          safety_constraints: { content_filters: ['spam'] },
          default_personality: `Agent ${i} personality`,
        };

        await fs.writeFile(
          path.join(TEST_CONFIG_DIR, `agent-${i}.json`),
          JSON.stringify(template, null, 2)
        );
      }

      const startTime = performance.now();

      await seedSystemTemplates(pool, TEST_CONFIG_DIR);

      const executionTime = performance.now() - startTime;

      console.log(`Seeding time for 10 templates: ${executionTime.toFixed(2)}ms`);

      // Verify all templates were inserted
      const result = await pool.query('SELECT COUNT(*) as count FROM system_agent_templates');
      expect(parseInt(result.rows[0].count)).toBe(10);

      // Should scale linearly (10 templates ~= 3.3x time for 3 templates)
      expect(executionTime).toBeLessThan(SEEDING_THRESHOLD_MS * 3.5);
    });

    it('should handle large template files efficiently', async () => {
      // Create a template with large personality text
      const largeTemplate = {
        name: 'large-template',
        version: 1,
        model: 'claude-sonnet-4-5-20250929',
        posting_rules: {
          max_length: 280,
          rate_limit_per_hour: 5,
          cooldown_seconds: 300,
          prohibited_words: Array.from({ length: 100 }, (_, i) => `word${i}`),
        },
        api_schema: { endpoints: ['/api/post'] },
        safety_constraints: {
          content_filters: ['spam'],
          require_human_approval_for: Array.from({ length: 50 }, (_, i) => `topic${i}`),
        },
        default_personality: 'A'.repeat(4000), // 4KB personality text
        default_response_style: {
          tone: 'friendly',
          length: 'detailed',
          additional_data: Array.from({ length: 100 }, (_, i) => ({ key: i, value: `data${i}` })),
        },
      };

      await fs.writeFile(
        path.join(TEST_CONFIG_DIR, 'large-template.json'),
        JSON.stringify(largeTemplate, null, 2)
      );

      const startTime = performance.now();

      await seedSystemTemplates(pool, TEST_CONFIG_DIR);

      const executionTime = performance.now() - startTime;

      console.log(`Seeding time with large template: ${executionTime.toFixed(2)}ms`);

      // Should still be fast even with large data
      expect(executionTime).toBeLessThan(SEEDING_THRESHOLD_MS * 2);
    });
  });

  describe('Error Handling Performance', () => {
    it('should fail fast on invalid template', async () => {
      // Create invalid template
      const invalidTemplate = {
        name: 'invalid',
        // Missing required fields
      };

      await fs.writeFile(
        path.join(TEST_CONFIG_DIR, 'invalid.json'),
        JSON.stringify(invalidTemplate, null, 2)
      );

      const startTime = performance.now();

      await expect(seedSystemTemplates(pool, TEST_CONFIG_DIR)).rejects.toThrow();

      const executionTime = performance.now() - startTime;

      // Should fail fast, not waste time
      expect(executionTime).toBeLessThan(1000);

      console.log(`Fast failure time: ${executionTime.toFixed(2)}ms`);

      // Cleanup invalid file
      await fs.unlink(path.join(TEST_CONFIG_DIR, 'invalid.json'));
    });
  });

  describe('Concurrent Seeding Safety', () => {
    it('should handle concurrent seeding attempts safely', async () => {
      const concurrentSeeds = Array.from({ length: 5 }, () =>
        seedSystemTemplates(pool, TEST_CONFIG_DIR)
      );

      const startTime = performance.now();

      await Promise.all(concurrentSeeds);

      const executionTime = performance.now() - startTime;

      console.log(`Concurrent seeding time: ${executionTime.toFixed(2)}ms`);

      // Verify still only 3 templates (UPSERT handled concurrency)
      const result = await pool.query('SELECT COUNT(*) as count FROM system_agent_templates');
      expect(parseInt(result.rows[0].count)).toBe(3);

      // Should complete reasonably fast even with concurrency
      expect(executionTime).toBeLessThan(SEEDING_THRESHOLD_MS * 3);
    });
  });
});
