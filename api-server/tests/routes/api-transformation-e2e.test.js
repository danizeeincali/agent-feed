/**
 * API Transformation End-to-End Tests
 * Tests the complete API flow with transformation
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
const TEST_DB_PATH = join(__dirname, '../../test-api-e2e.db');

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
  `);

  // Initialize routes
  initializeAgentPagesRoutes(db);

  // Setup Express app
  app = express();
  app.use(express.json());
  app.use('/api/agent-pages', agentPagesRouter);
});

afterAll(() => {
  db.close();
  const fs = require('fs');
  if (fs.existsSync(TEST_DB_PATH)) {
    fs.unlinkSync(TEST_DB_PATH);
  }
});

beforeEach(() => {
  db.exec('DELETE FROM agent_pages');
  db.exec('DELETE FROM agents');
});

describe('API Transformation E2E', () => {
  describe('POST → GET flow with transformation', () => {
    it('should create a page and retrieve it with transformation applied', async () => {
      const agentId = 'dashboard-agent';
      const pageData = {
        title: 'Analytics Dashboard',
        content_type: 'json',
        content_value: JSON.stringify({
          layout: 'grid',
          responsive: true,
          components: [
            {
              type: 'Card',
              props: { title: 'Revenue', value: '{{metrics.revenue}}' }
            },
            {
              type: 'Chart',
              props: { data: '{{chartData}}', type: 'line' }
            }
          ]
        }),
        status: 'published',
        tags: ['analytics', 'dashboard']
      };

      // Create page via API
      const createRes = await request(app)
        .post(`/api/agent-pages/agents/${agentId}/pages`)
        .send(pageData)
        .expect(201);

      expect(createRes.body.success).toBe(true);
      expect(createRes.body.page).toBeDefined();
      const pageId = createRes.body.page.id;

      // Retrieve page via API
      const getRes = await request(app)
        .get(`/api/agent-pages/agents/${agentId}/pages/${pageId}`)
        .expect(200);

      // Verify transformation
      expect(getRes.body.success).toBe(true);
      expect(getRes.body.page.layout).toBe('grid');
      expect(getRes.body.page.responsive).toBe(true);
      expect(getRes.body.page.components).toHaveLength(2);
      expect(getRes.body.page.components[0].type).toBe('Card');
      expect(getRes.body.page.components[1].type).toBe('Chart');

      // Verify original fields preserved
      expect(getRes.body.page.title).toBe('Analytics Dashboard');
      expect(getRes.body.page.status).toBe('published');
      expect(getRes.body.page.tags).toEqual(['analytics', 'dashboard']);
    });

    it('should handle complex nested component structure', async () => {
      const agentId = 'complex-agent';
      const pageData = {
        title: 'Complex Dashboard',
        content_type: 'json',
        content_value: JSON.stringify({
          id: 'complex-dashboard',
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
                    {
                      type: 'DataCard',
                      props: { title: 'Total', value: '{{stats.total}}' }
                    },
                    {
                      type: 'DataCard',
                      props: { title: 'Active', value: '{{stats.active}}' }
                    }
                  ]
                }
              ]
            }
          ]
        })
      };

      const createRes = await request(app)
        .post(`/api/agent-pages/agents/${agentId}/pages`)
        .send(pageData)
        .expect(201);

      const pageId = createRes.body.page.id;

      const getRes = await request(app)
        .get(`/api/agent-pages/agents/${agentId}/pages/${pageId}`)
        .expect(200);

      expect(getRes.body.page.layout).toBe('mobile-first');
      expect(getRes.body.page.responsive).toBe(true);
      expect(getRes.body.page.components).toHaveLength(1);
      expect(getRes.body.page.components[0].type).toBe('Container');
      expect(getRes.body.page.components[0].children).toHaveLength(1);
      expect(getRes.body.page.components[0].children[0].type).toBe('Grid');
      expect(getRes.body.page.components[0].children[0].children).toHaveLength(2);
    });
  });

  describe('List endpoint with multiple pages', () => {
    it('should transform all pages in list response', async () => {
      const agentId = 'multi-page-agent';

      db.prepare('INSERT INTO agents (id, name) VALUES (?, ?)').run(agentId, 'Multi Page Agent');

      // Create multiple pages with different structures
      const pages = [
        {
          id: 'page-1',
          title: 'Dashboard 1',
          content_value: JSON.stringify({
            layout: 'grid',
            components: [{ type: 'Card', props: {} }]
          })
        },
        {
          id: 'page-2',
          title: 'Dashboard 2',
          content_value: JSON.stringify({
            layout: 'flex',
            responsive: true,
            components: [
              { type: 'Chart', props: {} },
              { type: 'Table', props: {} }
            ]
          })
        },
        {
          id: 'page-3',
          title: 'Simple Page',
          content_value: JSON.stringify({
            components: [{ type: 'Text', props: { children: 'Hello' } }]
          })
        }
      ];

      for (const page of pages) {
        db.prepare(`
          INSERT INTO agent_pages (id, agent_id, title, content_type, content_value, status)
          VALUES (?, ?, ?, ?, ?, ?)
        `).run(page.id, agentId, page.title, 'json', page.content_value, 'published');
      }

      const res = await request(app)
        .get(`/api/agent-pages/agents/${agentId}/pages`)
        .expect(200);

      expect(res.body.success).toBe(true);
      expect(res.body.pages).toHaveLength(3);
      expect(res.body.total).toBe(3);

      // Check each page is transformed
      const page1 = res.body.pages.find(p => p.id === 'page-1');
      expect(page1.layout).toBe('grid');
      expect(page1.components).toHaveLength(1);

      const page2 = res.body.pages.find(p => p.id === 'page-2');
      expect(page2.layout).toBe('flex');
      expect(page2.responsive).toBe(true);
      expect(page2.components).toHaveLength(2);

      const page3 = res.body.pages.find(p => p.id === 'page-3');
      expect(page3.components).toHaveLength(1);
    });

    it('should handle pagination with transformation', async () => {
      const agentId = 'paginated-agent';

      db.prepare('INSERT INTO agents (id, name) VALUES (?, ?)').run(agentId, 'Paginated Agent');

      // Create 5 pages
      for (let i = 1; i <= 5; i++) {
        const content = JSON.stringify({
          layout: 'stack',
          components: [{ type: 'Text', props: { children: `Page ${i}` } }]
        });

        db.prepare(`
          INSERT INTO agent_pages (id, agent_id, title, content_type, content_value, status)
          VALUES (?, ?, ?, ?, ?, ?)
        `).run(`page-${i}`, agentId, `Page ${i}`, 'json', content, 'published');
      }

      // Get first 2 pages
      const res1 = await request(app)
        .get(`/api/agent-pages/agents/${agentId}/pages?limit=2&offset=0`)
        .expect(200);

      expect(res1.body.pages).toHaveLength(2);
      expect(res1.body.total).toBe(5);
      expect(res1.body.limit).toBe(2);
      expect(res1.body.offset).toBe(0);

      // All pages should be transformed
      res1.body.pages.forEach(page => {
        expect(page.layout).toBe('stack');
        expect(page.components).toHaveLength(1);
      });

      // Get next 2 pages
      const res2 = await request(app)
        .get(`/api/agent-pages/agents/${agentId}/pages?limit=2&offset=2`)
        .expect(200);

      expect(res2.body.pages).toHaveLength(2);
      res2.body.pages.forEach(page => {
        expect(page.layout).toBe('stack');
      });
    });
  });

  describe('Real-world scenarios', () => {
    it('should handle personal todos dashboard structure', async () => {
      const agentId = 'personal-todos-agent';
      const pageData = {
        title: 'Personal Todos Dashboard',
        content_type: 'json',
        content_value: JSON.stringify({
          id: 'comprehensive-dashboard',
          title: 'Personal Todos Dashboard',
          layout: 'mobile-first',
          responsive: true,
          components: [
            {
              type: 'Container',
              props: { size: 'lg', className: 'p-4 md:p-6' },
              children: [
                {
                  type: 'Stack',
                  props: { className: 'gap-6' },
                  children: [
                    {
                      type: 'Grid',
                      props: { className: 'grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4' },
                      children: [
                        {
                          type: 'DataCard',
                          props: {
                            title: 'Total Tasks',
                            value: '{{stats.total_tasks}}',
                            subtitle: 'Active items',
                            trend: 'up'
                          }
                        },
                        {
                          type: 'DataCard',
                          props: {
                            title: 'Completed',
                            value: '{{stats.completed_tasks}}',
                            subtitle: 'This week',
                            trend: 'up'
                          }
                        }
                      ]
                    }
                  ]
                }
              ]
            }
          ]
        })
      };

      const createRes = await request(app)
        .post(`/api/agent-pages/agents/${agentId}/pages`)
        .send(pageData)
        .expect(201);

      const pageId = createRes.body.page.id;

      const getRes = await request(app)
        .get(`/api/agent-pages/agents/${agentId}/pages/${pageId}`)
        .expect(200);

      // Verify deep nested structure is preserved
      expect(getRes.body.page.layout).toBe('mobile-first');
      expect(getRes.body.page.responsive).toBe(true);
      expect(getRes.body.page.components[0].type).toBe('Container');
      expect(getRes.body.page.components[0].children[0].type).toBe('Stack');
      expect(getRes.body.page.components[0].children[0].children[0].type).toBe('Grid');
      expect(getRes.body.page.components[0].children[0].children[0].children).toHaveLength(2);
      expect(getRes.body.page.components[0].children[0].children[0].children[0].props.value).toBe('{{stats.total_tasks}}');
    });

    it('should preserve data binding expressions in components', async () => {
      const agentId = 'data-binding-agent';
      const pageData = {
        title: 'Data Binding Test',
        content_type: 'json',
        content_value: JSON.stringify({
          layout: 'stack',
          components: [
            {
              type: 'DataCard',
              props: {
                title: 'Dynamic Value',
                value: '{{user.name}}',
                subtitle: '{{user.email}}',
                badge: '{{user.status}}'
              }
            },
            {
              type: 'Text',
              props: {
                children: 'Welcome, {{user.firstName}}!'
              }
            }
          ]
        })
      };

      const createRes = await request(app)
        .post(`/api/agent-pages/agents/${agentId}/pages`)
        .send(pageData)
        .expect(201);

      const getRes = await request(app)
        .get(`/api/agent-pages/agents/${agentId}/pages/${createRes.body.page.id}`)
        .expect(200);

      // Verify data binding expressions are preserved
      expect(getRes.body.page.components[0].props.value).toBe('{{user.name}}');
      expect(getRes.body.page.components[0].props.subtitle).toBe('{{user.email}}');
      expect(getRes.body.page.components[1].props.children).toBe('Welcome, {{user.firstName}}!');
    });
  });
});
