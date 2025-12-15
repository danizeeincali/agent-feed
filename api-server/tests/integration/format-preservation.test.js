/**
 * Format Preservation Test
 * Demonstrates that auto-registration preserves original page format
 */

import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import Database from 'better-sqlite3';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import { dirname } from 'path';
import { initializeAutoRegistration } from '../../middleware/auto-register-pages.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

const AGENT_PAGES_DB_PATH = path.join(__dirname, '../../../data/agent-pages.db');
const AGENT_PAGES_DIR = path.join(__dirname, '../../../data/agent-pages');

describe('Format Preservation', () => {
  let watcher;
  let db;
  const testPageIds = [];

  beforeAll(() => {
    db = new Database(AGENT_PAGES_DB_PATH);
    db.pragma('foreign_keys = ON');
  });

  afterAll(() => {
    if (watcher) {
      watcher.close();
    }

    // Clean up all test pages
    testPageIds.forEach(id => {
      try {
        db.prepare('DELETE FROM agent_pages WHERE id = ?').run(id);
        const testFilePath = path.join(AGENT_PAGES_DIR, `${id}.json`);
        if (fs.existsSync(testFilePath)) {
          fs.unlinkSync(testFilePath);
        }
      } catch (error) {
        // Ignore cleanup errors
      }
    });

    if (db) {
      db.close();
    }
  });

  it('should preserve page-builder specification format exactly as created', async () => {
    // Initialize watcher
    watcher = initializeAutoRegistration(db, AGENT_PAGES_DIR);
    await new Promise(resolve => watcher.on('ready', resolve));

    // Create a realistic page-builder format page
    const pageId = `format-test-${Date.now()}`;
    testPageIds.push(pageId);

    const specification = {
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
                    }
                  ]
                }
              ]
            }
          ]
        }
      ]
    };

    const pageData = {
      id: pageId,
      agent_id: 'personal-todos-agent',
      title: 'Format Preservation Test',
      specification: JSON.stringify(specification),
      version: 1,
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString()
    };

    // Write page file
    const filePath = path.join(AGENT_PAGES_DIR, `${pageId}.json`);
    fs.writeFileSync(filePath, JSON.stringify(pageData, null, 2));

    // Wait for auto-registration
    await new Promise(resolve => setTimeout(resolve, 1500));

    // Verify the page was stored correctly
    const registered = db.prepare('SELECT * FROM agent_pages WHERE id = ?').get(pageId);

    expect(registered).toBeDefined();
    expect(registered.id).toBe(pageId);
    expect(registered.agent_id).toBe('personal-todos-agent');
    expect(registered.title).toBe('Format Preservation Test');

    // KEY ASSERTION: content_type should be 'json' for specification format
    expect(registered.content_type).toBe('json');

    // KEY ASSERTION: content_value should preserve the original specification
    expect(registered.content_value).toBe(JSON.stringify(specification));

    // Verify the specification can be parsed and used
    const parsedSpec = JSON.parse(registered.content_value);
    expect(parsedSpec.id).toBe('comprehensive-dashboard');
    expect(parsedSpec.title).toBe('Personal Todos Dashboard');
    expect(parsedSpec.layout).toBe('mobile-first');
    expect(parsedSpec.responsive).toBe(true);
    expect(parsedSpec.components).toHaveLength(1);
    expect(parsedSpec.components[0].type).toBe('Container');

    // Verify nested structure is intact
    const container = parsedSpec.components[0];
    expect(container.children).toHaveLength(1);
    expect(container.children[0].type).toBe('Stack');
    expect(container.children[0].children).toHaveLength(1);
    expect(container.children[0].children[0].type).toBe('Grid');
    expect(container.children[0].children[0].children).toHaveLength(1);
    expect(container.children[0].children[0].children[0].type).toBe('DataCard');
    expect(container.children[0].children[0].children[0].props.value).toBe('{{stats.total_tasks}}');
  }, 10000);

  it('should not transform specification to content_value schema', async () => {
    const pageId = `no-transform-test-${Date.now()}`;
    testPageIds.push(pageId);

    // Create page with specification field
    const pageData = {
      id: pageId,
      agent_id: 'test-agent',
      title: 'No Transform Test',
      specification: '{"message": "This should stay as specification"}',
      version: 1
    };

    const filePath = path.join(AGENT_PAGES_DIR, `${pageId}.json`);
    fs.writeFileSync(filePath, JSON.stringify(pageData, null, 2));

    await new Promise(resolve => setTimeout(resolve, 1500));

    const registered = db.prepare('SELECT * FROM agent_pages WHERE id = ?').get(pageId);

    // Should NOT transform to markdown or text
    expect(registered.content_type).toBe('json');

    // Should store specification value in content_value
    expect(registered.content_value).toBe('{"message": "This should stay as specification"}');

    // Should be able to parse it
    const parsed = JSON.parse(registered.content_value);
    expect(parsed.message).toBe('This should stay as specification');
  }, 10000);

  it('should preserve metadata from page-builder format', async () => {
    const pageId = `metadata-test-${Date.now()}`;
    testPageIds.push(pageId);

    const pageData = {
      id: pageId,
      agent_id: 'test-agent',
      title: 'Metadata Test',
      specification: JSON.stringify({ type: 'test' }),
      metadata: {
        author: 'page-builder-agent',
        version: '2.0',
        tags: ['dashboard', 'analytics']
      },
      version: 1
    };

    const filePath = path.join(AGENT_PAGES_DIR, `${pageId}.json`);
    fs.writeFileSync(filePath, JSON.stringify(pageData, null, 2));

    await new Promise(resolve => setTimeout(resolve, 1500));

    const registered = db.prepare('SELECT * FROM agent_pages WHERE id = ?').get(pageId);

    // Metadata should be preserved
    expect(registered.content_metadata).toBeDefined();
    const metadata = JSON.parse(registered.content_metadata);
    expect(metadata.author).toBe('page-builder-agent');
    expect(metadata.version).toBe('2.0');
    expect(metadata.tags).toEqual(['dashboard', 'analytics']);
  }, 10000);

  it('should allow API layer to handle transformation on read', async () => {
    const pageId = `api-transform-test-${Date.now()}`;
    testPageIds.push(pageId);

    // Store in specification format
    const specification = {
      components: [
        { type: 'Header', props: { title: 'API Transform Test' } }
      ]
    };

    const pageData = {
      id: pageId,
      agent_id: 'test-agent',
      title: 'API Transform Test',
      specification: JSON.stringify(specification),
      version: 1
    };

    const filePath = path.join(AGENT_PAGES_DIR, `${pageId}.json`);
    fs.writeFileSync(filePath, JSON.stringify(pageData, null, 2));

    await new Promise(resolve => setTimeout(resolve, 1500));

    // Read from database
    const registered = db.prepare('SELECT * FROM agent_pages WHERE id = ?').get(pageId);

    // Middleware stored it as-is
    expect(registered.content_type).toBe('json');
    expect(registered.content_value).toBe(JSON.stringify(specification));

    // API layer can transform if needed (simulating what API would do)
    const apiResponse = {
      id: registered.id,
      agent_id: registered.agent_id,
      title: registered.title,
      specification: JSON.parse(registered.content_value), // Transform back
      content_type: registered.content_type,
      content_value: registered.content_value,
      version: registered.version
    };

    // API can provide both formats
    expect(apiResponse.specification).toEqual(specification);
    expect(apiResponse.content_value).toBe(JSON.stringify(specification));
  }, 10000);
});
