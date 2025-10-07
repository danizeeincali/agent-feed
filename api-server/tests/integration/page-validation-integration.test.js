/**
 * Integration Tests: Page Validation Middleware with Agent Pages API
 *
 * Tests the full integration of validation middleware with the POST endpoint
 */

import { describe, it, expect, beforeAll, afterAll, beforeEach } from 'vitest';
import request from 'supertest';
import express from 'express';
import Database from 'better-sqlite3';
import { initializeAgentPagesRoutes } from '../../routes/agent-pages.js';
import feedbackLoop from '../../services/feedback-loop.js';

describe('Page Validation Integration Tests', () => {
  let app;
  let db;
  const TEST_AGENT_ID = 'test-validation-agent';

  beforeAll(() => {
    // Create in-memory database
    db = new Database(':memory:');

    // Create agents table
    db.exec(`
      CREATE TABLE IF NOT EXISTS agents (
        id TEXT PRIMARY KEY,
        name TEXT NOT NULL,
        description TEXT,
        created_at TEXT NOT NULL,
        updated_at TEXT NOT NULL
      )
    `);

    // Create agent_pages table
    db.exec(`
      CREATE TABLE IF NOT EXISTS agent_pages (
        id TEXT PRIMARY KEY,
        agent_id TEXT NOT NULL,
        title TEXT NOT NULL,
        content_type TEXT DEFAULT 'json',
        content_value TEXT,
        content_metadata TEXT,
        status TEXT DEFAULT 'published',
        tags TEXT,
        created_at TEXT NOT NULL,
        updated_at TEXT NOT NULL,
        version INTEGER DEFAULT 1,
        FOREIGN KEY (agent_id) REFERENCES agents(id)
      )
    `);

    // Create feedback loop tables
    db.exec(`
      CREATE TABLE IF NOT EXISTS validation_failures (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        page_id TEXT,
        agent_id TEXT,
        error_type TEXT,
        error_message TEXT,
        error_details TEXT,
        component_type TEXT,
        validation_rule TEXT,
        page_config TEXT,
        stack_trace TEXT,
        created_at TEXT DEFAULT CURRENT_TIMESTAMP
      )
    `);

    db.exec(`
      CREATE TABLE IF NOT EXISTS agent_performance_metrics (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        agent_id TEXT NOT NULL,
        date TEXT NOT NULL,
        total_attempts INTEGER DEFAULT 0,
        successful_attempts INTEGER DEFAULT 0,
        failed_attempts INTEGER DEFAULT 0,
        validation_failures INTEGER DEFAULT 0,
        success_rate REAL DEFAULT 0.0,
        avg_build_time REAL DEFAULT 0.0,
        created_at TEXT DEFAULT CURRENT_TIMESTAMP,
        updated_at TEXT DEFAULT CURRENT_TIMESTAMP,
        UNIQUE(agent_id, date)
      )
    `);

    db.exec(`
      CREATE TABLE IF NOT EXISTS failure_patterns (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        agent_id TEXT NOT NULL,
        pattern_type TEXT NOT NULL,
        error_signature TEXT NOT NULL,
        occurrence_count INTEGER DEFAULT 1,
        first_seen TEXT DEFAULT CURRENT_TIMESTAMP,
        last_seen TEXT DEFAULT CURRENT_TIMESTAMP,
        instruction_updated INTEGER DEFAULT 0,
        instruction_file TEXT,
        updated_at TEXT DEFAULT CURRENT_TIMESTAMP,
        UNIQUE(agent_id, error_signature)
      )
    `);

    // Create test agent
    db.prepare(`
      INSERT INTO agents (id, name, description, created_at, updated_at)
      VALUES (?, ?, ?, ?, ?)
    `).run(
      TEST_AGENT_ID,
      'Test Validation Agent',
      'Agent for validation testing',
      new Date().toISOString(),
      new Date().toISOString()
    );

    // Initialize feedback loop with database
    feedbackLoop.setDatabase(db);

    // Set up Express app
    app = express();
    app.use(express.json());
    app.use('/api/agent-pages', initializeAgentPagesRoutes(db));
  });

  afterAll(() => {
    db.close();
  });

  beforeEach(() => {
    // Clean up pages before each test
    db.prepare('DELETE FROM agent_pages').run();
  });

  describe('POST /api/agent-pages/agents/:agentId/pages - Validation Integration', () => {
    it('should accept valid page with components', async () => {
      const pageData = {
        title: 'Valid Dashboard',
        content_type: 'json',
        content_value: JSON.stringify({
          components: [
            { type: 'header', props: { title: 'Dashboard', level: 1 } },
            { type: 'stat', props: { label: 'Users', value: 100 } }
          ]
        })
      };

      const response = await request(app)
        .post(`/api/agent-pages/agents/${TEST_AGENT_ID}/pages`)
        .send(pageData)
        .expect(201);

      expect(response.body.success).toBe(true);
      expect(response.body.page).toBeDefined();
      expect(response.body.page.id).toBeDefined();
    });

    it('should reject page with invalid component type', async () => {
      const pageData = {
        title: 'Invalid Page',
        content_type: 'json',
        content_value: JSON.stringify({
          components: [
            { type: 'NonExistentWidget', props: {} }
          ]
        })
      };

      const response = await request(app)
        .post(`/api/agent-pages/agents/${TEST_AGENT_ID}/pages`)
        .send(pageData)
        .expect(400);

      expect(response.body.success).toBe(false);
      expect(response.body.error).toBe('Validation failed');
      expect(response.body.errors.length).toBeGreaterThan(0);
      expect(response.body.errors[0].message).toContain('Unknown component type');
      expect(response.body.feedbackRecorded).toBe(true);
    });

    it('should reject page with invalid component props', async () => {
      const pageData = {
        title: 'Invalid Props Page',
        content_type: 'json',
        content_value: JSON.stringify({
          components: [
            {
              type: 'header',
              props: { title: '' } // Empty title violates schema
            }
          ]
        })
      };

      const response = await request(app)
        .post(`/api/agent-pages/agents/${TEST_AGENT_ID}/pages`)
        .send(pageData)
        .expect(400);

      expect(response.body.success).toBe(false);
      expect(response.body.errors.length).toBeGreaterThan(0);
      expect(response.body.errors[0].message).toContain('Title is required');
    });

    it('should accept page with valid Sidebar component', async () => {
      const pageData = {
        title: 'Sidebar Page',
        content_type: 'json',
        content_value: JSON.stringify({
          components: [
            {
              type: 'Sidebar',
              props: {
                items: [
                  { id: '1', label: 'Home', href: '/' },
                  { id: '2', label: 'About', href: '/about' },
                  {
                    id: '3',
                    label: 'Products',
                    children: [
                      { id: '3a', label: 'Product A', href: '/products/a' },
                      { id: '3b', label: 'Product B', href: '/products/b' }
                    ]
                  }
                ]
              }
            }
          ]
        })
      };

      const response = await request(app)
        .post(`/api/agent-pages/agents/${TEST_AGENT_ID}/pages`)
        .send(pageData)
        .expect(201);

      expect(response.body.success).toBe(true);
    });

    it('should reject Sidebar with invalid href format', async () => {
      const pageData = {
        title: 'Invalid Sidebar Page',
        content_type: 'json',
        content_value: JSON.stringify({
          components: [
            {
              type: 'Sidebar',
              props: {
                items: [
                  { id: '1', label: 'Invalid', href: 'not-a-valid-path' }
                ]
              }
            }
          ]
        })
      };

      const response = await request(app)
        .post(`/api/agent-pages/agents/${TEST_AGENT_ID}/pages`)
        .send(pageData)
        .expect(400);

      expect(response.body.errors.length).toBeGreaterThan(0);
      expect(response.body.errors[0].message).toContain('Invalid href format');
    });

    it('should accept Sidebar with template variables in href', async () => {
      const pageData = {
        title: 'Template Sidebar Page',
        content_type: 'json',
        content_value: JSON.stringify({
          components: [
            {
              type: 'Sidebar',
              props: {
                items: [
                  { id: '1', label: 'Profile', href: '{{user.profileUrl}}' }
                ]
              }
            }
          ]
        })
      };

      const response = await request(app)
        .post(`/api/agent-pages/agents/${TEST_AGENT_ID}/pages`)
        .send(pageData)
        .expect(201);

      expect(response.body.success).toBe(true);
    });

    it('should reject page with Sidebar item without navigation', async () => {
      const pageData = {
        title: 'Invalid Navigation Page',
        content_type: 'json',
        content_value: JSON.stringify({
          components: [
            {
              type: 'Sidebar',
              props: {
                items: [
                  { id: '1', label: 'Good Link', href: '/' },
                  { id: '2', label: 'No Navigation' } // Error - blocks page creation
                ]
              }
            }
          ]
        })
      };

      const response = await request(app)
        .post(`/api/agent-pages/agents/${TEST_AGENT_ID}/pages`)
        .send(pageData)
        .expect(400);

      expect(response.body.success).toBe(false);
      expect(response.body.errors).toBeDefined();
      expect(response.body.errors.length).toBeGreaterThan(0);
      expect(response.body.errors[0].message).toContain('must have href, onClick, or children');
      // Page creation blocked due to navigation error
    });

    it('should validate complex nested component structure', async () => {
      const pageData = {
        title: 'Complex Page',
        content_type: 'json',
        content_value: JSON.stringify({
          components: [
            {
              type: 'Grid',
              props: { cols: 2 },
              children: [
                {
                  type: 'Card',
                  props: { title: 'Card 1' },
                  children: [
                    { type: 'header', props: { title: 'Header 1' } },
                    { type: 'Markdown', props: { content: '# Content' } }
                  ]
                },
                {
                  type: 'Card',
                  props: { title: 'Card 2' },
                  children: [
                    { type: 'stat', props: { label: 'Count', value: 42 } }
                  ]
                }
              ]
            }
          ]
        })
      };

      const response = await request(app)
        .post(`/api/agent-pages/agents/${TEST_AGENT_ID}/pages`)
        .send(pageData)
        .expect(201);

      expect(response.body.success).toBe(true);
    });

    it('should reject nested component with invalid props', async () => {
      const pageData = {
        title: 'Invalid Nested Page',
        content_type: 'json',
        content_value: JSON.stringify({
          components: [
            {
              type: 'Card',
              props: { title: 'Parent' },
              children: [
                {
                  type: 'stat',
                  props: { value: 42 } // Missing required 'label'
                }
              ]
            }
          ]
        })
      };

      const response = await request(app)
        .post(`/api/agent-pages/agents/${TEST_AGENT_ID}/pages`)
        .send(pageData)
        .expect(400);

      expect(response.body.errors.length).toBeGreaterThan(0);
    });

    it('should validate GanttChart date ranges', async () => {
      const pageData = {
        title: 'Invalid Gantt Page',
        content_type: 'json',
        content_value: JSON.stringify({
          components: [
            {
              type: 'GanttChart',
              props: {
                tasks: [
                  {
                    id: 1,
                    name: 'Task 1',
                    startDate: '2025-01-15',
                    endDate: '2025-01-10' // End before start - invalid
                  }
                ]
              }
            }
          ]
        })
      };

      const response = await request(app)
        .post(`/api/agent-pages/agents/${TEST_AGENT_ID}/pages`)
        .send(pageData)
        .expect(400);

      expect(response.body.errors.length).toBeGreaterThan(0);
      expect(response.body.errors[0].message).toContain('startDate after endDate');
    });

    it('should validate form with empty fields', async () => {
      const pageData = {
        title: 'Invalid Form Page',
        content_type: 'json',
        content_value: JSON.stringify({
          components: [
            {
              type: 'form',
              props: {
                fields: [] // Empty fields violates min(1)
              }
            }
          ]
        })
      };

      const response = await request(app)
        .post(`/api/agent-pages/agents/${TEST_AGENT_ID}/pages`)
        .send(pageData)
        .expect(400);

      expect(response.body.errors.length).toBeGreaterThan(0);
    });

    it('should accept page with components in specification.components', async () => {
      const pageData = {
        title: 'Spec Format Page',
        content_type: 'json',
        content_value: JSON.stringify({
          specification: {
            components: [
              { type: 'header', props: { title: 'Title' } }
            ]
          }
        })
      };

      const response = await request(app)
        .post(`/api/agent-pages/agents/${TEST_AGENT_ID}/pages`)
        .send(pageData)
        .expect(201);

      expect(response.body.success).toBe(true);
    });

    it('should accept page with no components', async () => {
      const pageData = {
        title: 'Empty Page',
        content_type: 'markdown',
        content_value: '# Just markdown'
      };

      const response = await request(app)
        .post(`/api/agent-pages/agents/${TEST_AGENT_ID}/pages`)
        .send(pageData)
        .expect(201);

      expect(response.body.success).toBe(true);
      // No components is OK
    });

    it('should validate Calendar event dates', async () => {
      const pageData = {
        title: 'Invalid Calendar Page',
        content_type: 'json',
        content_value: JSON.stringify({
          components: [
            {
              type: 'Calendar',
              props: {
                events: [
                  {
                    id: 1,
                    date: 'invalid-date',
                    title: 'Event'
                  }
                ]
              }
            }
          ]
        })
      };

      const response = await request(app)
        .post(`/api/agent-pages/agents/${TEST_AGENT_ID}/pages`)
        .send(pageData)
        .expect(400);

      expect(response.body.errors.length).toBeGreaterThan(0);
    });

    it('should validate multiple components in single request', async () => {
      const pageData = {
        title: 'Multi-Component Page',
        content_type: 'json',
        content_value: JSON.stringify({
          components: [
            { type: 'header', props: { title: 'Dashboard' } },
            { type: 'stat', props: { label: 'Users', value: 150 } },
            { type: 'stat', props: { label: 'Revenue', value: '$1M' } },
            {
              type: 'Sidebar',
              props: {
                items: [
                  { id: '1', label: 'Home', href: '/' }
                ]
              }
            },
            {
              type: 'form',
              props: {
                fields: [
                  { label: 'Name', type: 'text', required: true }
                ]
              }
            }
          ]
        })
      };

      const response = await request(app)
        .post(`/api/agent-pages/agents/${TEST_AGENT_ID}/pages`)
        .send(pageData)
        .expect(201);

      expect(response.body.success).toBe(true);
    });
  });
});
