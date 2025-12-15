/**
 * Page Transformation Tests
 * Tests for transformPageForFrontend() function
 *
 * TDD Approach:
 * 1. Write failing tests first
 * 2. Implement transformation function
 * 3. Apply to endpoints
 * 4. Verify all tests pass
 */

import { describe, it, expect, beforeAll, afterAll, beforeEach } from 'vitest';
import Database from 'better-sqlite3';
import express from 'express';
import request from 'supertest';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';
import crypto from 'crypto';
import agentPagesRouter, { initializeAgentPagesRoutes } from '../../routes/agent-pages.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);
const TEST_DB_PATH = join(__dirname, '../../test-page-transformation.db');

let db;
let app;

beforeAll(() => {
  // Create test database
  db = new Database(TEST_DB_PATH);
  db.pragma('foreign_keys = ON');

  // Create schema
  db.exec(`
    CREATE TABLE IF NOT EXISTS agents (
      id TEXT PRIMARY KEY,
      name TEXT NOT NULL,
      description TEXT,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
    );

    CREATE TABLE IF NOT EXISTS agent_pages (
      id TEXT PRIMARY KEY DEFAULT (lower(hex(randomblob(16)))),
      agent_id TEXT NOT NULL,
      title TEXT NOT NULL,
      content_type TEXT NOT NULL DEFAULT 'text' CHECK (content_type IN ('text', 'markdown', 'json', 'component')),
      content_value TEXT NOT NULL,
      content_metadata TEXT,
      status TEXT NOT NULL DEFAULT 'draft' CHECK (status IN ('draft', 'published')),
      tags TEXT,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      version INTEGER DEFAULT 1,
      FOREIGN KEY (agent_id) REFERENCES agents(id) ON DELETE CASCADE
    );

    CREATE INDEX IF NOT EXISTS idx_agent_pages_agent_id ON agent_pages(agent_id);
    CREATE INDEX IF NOT EXISTS idx_agent_pages_status ON agent_pages(status);
    CREATE INDEX IF NOT EXISTS idx_agent_pages_created_at ON agent_pages(created_at);
  `);

  // Initialize routes with test database
  initializeAgentPagesRoutes(db);

  // Setup Express app
  app = express();
  app.use(express.json());
  app.use('/api/agent-pages', agentPagesRouter);
});

afterAll(() => {
  db.close();
  // Clean up test database
  const fs = require('fs');
  if (fs.existsSync(TEST_DB_PATH)) {
    fs.unlinkSync(TEST_DB_PATH);
  }
});

beforeEach(() => {
  // Clean up tables before each test
  db.exec('DELETE FROM agent_pages');
  db.exec('DELETE FROM agents');
});

describe('transformPageForFrontend() - TDD Tests', () => {
  describe('content_value transformation (new format)', () => {
    it('should transform content_value with layout and components to frontend format', async () => {
      // Setup test data
      const agentId = 'test-agent-1';
      const pageId = 'test-page-1';

      db.prepare('INSERT INTO agents (id, name) VALUES (?, ?)').run(agentId, 'Test Agent');

      const contentValue = JSON.stringify({
        layout: 'mobile-first',
        responsive: true,
        components: [
          {
            type: 'Container',
            props: { size: 'lg' },
            children: [
              {
                type: 'Card',
                props: { title: 'Test Card' }
              }
            ]
          }
        ]
      });

      db.prepare(`
        INSERT INTO agent_pages (id, agent_id, title, content_type, content_value, status)
        VALUES (?, ?, ?, ?, ?, ?)
      `).run(pageId, agentId, 'Test Page', 'json', contentValue, 'published');

      // Make request
      const res = await request(app)
        .get(`/api/agent-pages/agents/${agentId}/pages/${pageId}`)
        .expect(200);

      // Assertions
      expect(res.body.success).toBe(true);
      expect(res.body.page).toBeDefined();
      expect(res.body.page.layout).toBe('mobile-first');
      expect(res.body.page.responsive).toBe(true);
      expect(res.body.page.components).toBeInstanceOf(Array);
      expect(res.body.page.components).toHaveLength(1);
      expect(res.body.page.components[0].type).toBe('Container');
      expect(res.body.page.components[0].children).toHaveLength(1);
      expect(res.body.page.components[0].children[0].type).toBe('Card');
    });

    it('should extract nested layout structure from content_value', async () => {
      const agentId = 'test-agent-2';
      const pageId = 'test-page-2';

      db.prepare('INSERT INTO agents (id, name) VALUES (?, ?)').run(agentId, 'Test Agent 2');

      const contentValue = JSON.stringify({
        id: 'dashboard',
        title: 'Dashboard',
        layout: 'grid',
        components: [
          { type: 'DataCard', props: { value: '{{stats.total}}' } },
          { type: 'Chart', props: { data: '{{chartData}}' } }
        ]
      });

      db.prepare(`
        INSERT INTO agent_pages (id, agent_id, title, content_type, content_value, status)
        VALUES (?, ?, ?, ?, ?, ?)
      `).run(pageId, agentId, 'Dashboard', 'json', contentValue, 'published');

      const res = await request(app)
        .get(`/api/agent-pages/agents/${agentId}/pages/${pageId}`)
        .expect(200);

      expect(res.body.page.layout).toBe('grid');
      expect(res.body.page.components).toHaveLength(2);
      expect(res.body.page.components[0].type).toBe('DataCard');
      expect(res.body.page.components[1].type).toBe('Chart');
    });

    it('should handle content_value with only components array', async () => {
      const agentId = 'test-agent-3';
      const pageId = 'test-page-3';

      db.prepare('INSERT INTO agents (id, name) VALUES (?, ?)').run(agentId, 'Test Agent 3');

      const contentValue = JSON.stringify({
        components: [
          { type: 'Text', props: { children: 'Hello World' } }
        ]
      });

      db.prepare(`
        INSERT INTO agent_pages (id, agent_id, title, content_type, content_value, status)
        VALUES (?, ?, ?, ?, ?, ?)
      `).run(pageId, agentId, 'Simple Page', 'json', contentValue, 'published');

      const res = await request(app)
        .get(`/api/agent-pages/agents/${agentId}/pages/${pageId}`)
        .expect(200);

      expect(res.body.page.components).toHaveLength(1);
      expect(res.body.page.components[0].type).toBe('Text');
    });
  });

  describe('specification transformation (legacy format)', () => {
    it('should transform legacy specification field to frontend format', async () => {
      const agentId = 'legacy-agent-1';
      const pageId = 'legacy-page-1';

      db.prepare('INSERT INTO agents (id, name) VALUES (?, ?)').run(agentId, 'Legacy Agent');

      const specification = JSON.stringify({
        components: [
          { type: 'TaskList', props: { tasks: [] } }
        ],
        layout: 'single'
      });

      // Store in content_value to simulate legacy data migrated to new schema
      db.prepare(`
        INSERT INTO agent_pages (id, agent_id, title, content_type, content_value, status)
        VALUES (?, ?, ?, ?, ?, ?)
      `).run(pageId, agentId, 'Legacy Page', 'json', specification, 'published');

      const res = await request(app)
        .get(`/api/agent-pages/agents/${agentId}/pages/${pageId}`)
        .expect(200);

      expect(res.body.page.components).toHaveLength(1);
      expect(res.body.page.components[0].type).toBe('TaskList');
      expect(res.body.page.layout).toBe('single');
    });

    it('should handle complex legacy specification with nested structure', async () => {
      const agentId = 'legacy-agent-2';
      const pageId = 'legacy-page-2';

      db.prepare('INSERT INTO agents (id, name) VALUES (?, ?)').run(agentId, 'Legacy Agent 2');

      const specification = JSON.stringify({
        id: 'comprehensive-dashboard',
        title: 'Todos Dashboard',
        layout: 'mobile-first',
        responsive: true,
        components: [
          {
            type: 'Container',
            props: { size: 'lg' },
            children: [
              {
                type: 'Grid',
                props: { className: 'grid-cols-2' },
                children: [
                  { type: 'DataCard', props: { title: 'Total', value: '{{stats.total}}' } },
                  { type: 'DataCard', props: { title: 'Completed', value: '{{stats.completed}}' } }
                ]
              }
            ]
          }
        ]
      });

      db.prepare(`
        INSERT INTO agent_pages (id, agent_id, title, content_type, content_value, status)
        VALUES (?, ?, ?, ?, ?, ?)
      `).run(pageId, agentId, 'Legacy Dashboard', 'json', specification, 'published');

      const res = await request(app)
        .get(`/api/agent-pages/agents/${agentId}/pages/${pageId}`)
        .expect(200);

      expect(res.body.page.layout).toBe('mobile-first');
      expect(res.body.page.responsive).toBe(true);
      expect(res.body.page.components).toHaveLength(1);
      expect(res.body.page.components[0].type).toBe('Container');
      expect(res.body.page.components[0].children[0].type).toBe('Grid');
      expect(res.body.page.components[0].children[0].children).toHaveLength(2);
    });
  });

  describe('error handling', () => {
    it('should handle invalid JSON in content_value gracefully', async () => {
      const agentId = 'error-agent-1';
      const pageId = 'error-page-1';

      db.prepare('INSERT INTO agents (id, name) VALUES (?, ?)').run(agentId, 'Error Agent');

      // Insert invalid JSON
      db.prepare(`
        INSERT INTO agent_pages (id, agent_id, title, content_type, content_value, status)
        VALUES (?, ?, ?, ?, ?, ?)
      `).run(pageId, agentId, 'Error Page', 'json', 'invalid json{', 'published');

      const res = await request(app)
        .get(`/api/agent-pages/agents/${agentId}/pages/${pageId}`)
        .expect(200);

      // Should still return the page, with content_value as-is
      expect(res.body.success).toBe(true);
      expect(res.body.page).toBeDefined();
      expect(res.body.page.content_value).toBe('invalid json{');
    });

    it('should handle missing layout/components fields', async () => {
      const agentId = 'missing-agent-1';
      const pageId = 'missing-page-1';

      db.prepare('INSERT INTO agents (id, name) VALUES (?, ?)').run(agentId, 'Missing Agent');

      // Valid JSON but missing expected fields
      const contentValue = JSON.stringify({
        id: 'test',
        title: 'Test'
        // No layout or components
      });

      db.prepare(`
        INSERT INTO agent_pages (id, agent_id, title, content_type, content_value, status)
        VALUES (?, ?, ?, ?, ?, ?)
      `).run(pageId, agentId, 'Missing Fields', 'json', contentValue, 'published');

      const res = await request(app)
        .get(`/api/agent-pages/agents/${agentId}/pages/${pageId}`)
        .expect(200);

      expect(res.body.success).toBe(true);
      expect(res.body.page).toBeDefined();
      // Should include the parsed content even without layout/components
      // Database fields take precedence over content fields
      expect(res.body.page.id).toBe('missing-page-1'); // From database
      expect(res.body.page.title).toBe('Missing Fields'); // From database page title
    });

    it('should handle empty content_value', async () => {
      const agentId = 'empty-agent-1';
      const pageId = 'empty-page-1';

      db.prepare('INSERT INTO agents (id, name) VALUES (?, ?)').run(agentId, 'Empty Agent');

      db.prepare(`
        INSERT INTO agent_pages (id, agent_id, title, content_type, content_value, status)
        VALUES (?, ?, ?, ?, ?, ?)
      `).run(pageId, agentId, 'Empty Page', 'json', '', 'published');

      const res = await request(app)
        .get(`/api/agent-pages/agents/${agentId}/pages/${pageId}`)
        .expect(200);

      expect(res.body.success).toBe(true);
      expect(res.body.page).toBeDefined();
    });
  });

  describe('list endpoint transformation', () => {
    it('should transform all pages in list response', async () => {
      const agentId = 'list-agent-1';

      db.prepare('INSERT INTO agents (id, name) VALUES (?, ?)').run(agentId, 'List Agent');

      // Create multiple pages with different formats
      const page1Content = JSON.stringify({
        layout: 'grid',
        components: [{ type: 'Card', props: { title: 'Page 1' } }]
      });

      const page2Content = JSON.stringify({
        components: [{ type: 'Text', props: { children: 'Page 2' } }],
        layout: 'single'
      });

      db.prepare(`
        INSERT INTO agent_pages (id, agent_id, title, content_type, content_value, status)
        VALUES (?, ?, ?, ?, ?, ?)
      `).run('page-1', agentId, 'Page 1', 'json', page1Content, 'published');

      db.prepare(`
        INSERT INTO agent_pages (id, agent_id, title, content_type, content_value, status)
        VALUES (?, ?, ?, ?, ?, ?)
      `).run('page-2', agentId, 'Page 2', 'json', page2Content, 'published');

      const res = await request(app)
        .get(`/api/agent-pages/agents/${agentId}/pages`)
        .expect(200);

      expect(res.body.success).toBe(true);
      expect(res.body.pages).toHaveLength(2);

      // Check first page
      expect(res.body.pages[0].layout).toBe('grid');
      expect(res.body.pages[0].components).toHaveLength(1);

      // Check second page
      expect(res.body.pages[1].layout).toBe('single');
      expect(res.body.pages[1].components).toHaveLength(1);
    });

    it('should handle mixed valid and invalid pages in list', async () => {
      const agentId = 'mixed-agent-1';

      db.prepare('INSERT INTO agents (id, name) VALUES (?, ?)').run(agentId, 'Mixed Agent');

      const validContent = JSON.stringify({
        layout: 'flex',
        components: [{ type: 'Button', props: { children: 'Click' } }]
      });

      db.prepare(`
        INSERT INTO agent_pages (id, agent_id, title, content_type, content_value, status)
        VALUES (?, ?, ?, ?, ?, ?)
      `).run('valid-page', agentId, 'Valid Page', 'json', validContent, 'published');

      db.prepare(`
        INSERT INTO agent_pages (id, agent_id, title, content_type, content_value, status)
        VALUES (?, ?, ?, ?, ?, ?)
      `).run('invalid-page', agentId, 'Invalid Page', 'json', 'invalid{json', 'published');

      const res = await request(app)
        .get(`/api/agent-pages/agents/${agentId}/pages`)
        .expect(200);

      expect(res.body.success).toBe(true);
      expect(res.body.pages).toHaveLength(2);

      // Valid page should be transformed
      const validPage = res.body.pages.find(p => p.id === 'valid-page');
      expect(validPage.layout).toBe('flex');
      expect(validPage.components).toHaveLength(1);

      // Invalid page should still be returned
      const invalidPage = res.body.pages.find(p => p.id === 'invalid-page');
      expect(invalidPage).toBeDefined();
    });
  });

  describe('backward compatibility', () => {
    it('should maintain all original page fields', async () => {
      const agentId = 'compat-agent-1';
      const pageId = 'compat-page-1';

      db.prepare('INSERT INTO agents (id, name) VALUES (?, ?)').run(agentId, 'Compat Agent');

      const contentValue = JSON.stringify({
        layout: 'stack',
        components: [{ type: 'Stack', props: {} }]
      });

      const contentMetadata = JSON.stringify({ author: 'test', version: 2 });
      const tags = JSON.stringify(['test', 'demo']);

      db.prepare(`
        INSERT INTO agent_pages (id, agent_id, title, content_type, content_value, content_metadata, status, tags)
        VALUES (?, ?, ?, ?, ?, ?, ?, ?)
      `).run(pageId, agentId, 'Compat Page', 'json', contentValue, contentMetadata, 'published', tags);

      const res = await request(app)
        .get(`/api/agent-pages/agents/${agentId}/pages/${pageId}`)
        .expect(200);

      // Check all fields are preserved
      expect(res.body.page.id).toBe(pageId);
      expect(res.body.page.agent_id).toBe(agentId);
      expect(res.body.page.title).toBe('Compat Page');
      expect(res.body.page.content_type).toBe('json');
      expect(res.body.page.status).toBe('published');
      expect(res.body.page.content_metadata).toEqual({ author: 'test', version: 2 });
      expect(res.body.page.tags).toEqual(['test', 'demo']);
      expect(res.body.page.created_at).toBeDefined();
      expect(res.body.page.updated_at).toBeDefined();
      expect(res.body.page.version).toBe(1);

      // Check transformation happened
      expect(res.body.page.layout).toBe('stack');
      expect(res.body.page.components).toHaveLength(1);
    });

    it('should not break non-JSON content types', async () => {
      const agentId = 'text-agent-1';
      const pageId = 'text-page-1';

      db.prepare('INSERT INTO agents (id, name) VALUES (?, ?)').run(agentId, 'Text Agent');

      db.prepare(`
        INSERT INTO agent_pages (id, agent_id, title, content_type, content_value, status)
        VALUES (?, ?, ?, ?, ?, ?)
      `).run(pageId, agentId, 'Text Page', 'text', 'This is plain text content', 'published');

      const res = await request(app)
        .get(`/api/agent-pages/agents/${agentId}/pages/${pageId}`)
        .expect(200);

      expect(res.body.page.content_type).toBe('text');
      expect(res.body.page.content_value).toBe('This is plain text content');
      // Should not have components/layout for non-JSON content
    });
  });
});
