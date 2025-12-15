/**
 * Auto-Registration Middleware Tests
 * TDD: Tests written first, implementation follows
 */

import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import Database from 'better-sqlite3';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import { dirname } from 'path';
import { initializeAutoRegistration, transformPageData } from '../../middleware/auto-register-pages.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

// Test directories
const TEST_DB_PATH = path.join(__dirname, '../temp/test-auto-register.db');
const TEST_PAGES_DIR = path.join(__dirname, '../temp/test-pages');

// Helper to wait for watcher ready
async function waitForWatcherReady(watcher) {
  return new Promise((resolve) => {
    watcher.on('ready', resolve);
  });
}

describe('Auto-Registration Middleware', () => {
  let db;
  let watcher;

  beforeEach(() => {
    // Create temp directories
    fs.mkdirSync(path.dirname(TEST_DB_PATH), { recursive: true });
    fs.mkdirSync(TEST_PAGES_DIR, { recursive: true });

    // Setup test database
    db = new Database(TEST_DB_PATH);
    db.pragma('foreign_keys = ON');

    // Create schema matching production database
    db.exec(`
      CREATE TABLE IF NOT EXISTS agents (
        id TEXT PRIMARY KEY,
        name TEXT NOT NULL,
        description TEXT,
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
      );

      CREATE TABLE IF NOT EXISTS agent_pages (
        id TEXT PRIMARY KEY,
        agent_id TEXT NOT NULL,
        title TEXT NOT NULL,
        content_type TEXT NOT NULL DEFAULT 'text',
        content_value TEXT NOT NULL,
        content_metadata TEXT,
        status TEXT NOT NULL DEFAULT 'draft',
        tags TEXT,
        version INTEGER DEFAULT 1,
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
      );
    `);
  });

  afterEach(() => {
    // Stop watcher
    if (watcher) {
      watcher.close();
    }

    // Close database
    if (db) {
      db.close();
    }

    // Clean up test files
    if (fs.existsSync(TEST_PAGES_DIR)) {
      fs.rmSync(TEST_PAGES_DIR, { recursive: true, force: true });
    }
    if (fs.existsSync(TEST_DB_PATH)) {
      fs.unlinkSync(TEST_DB_PATH);
    }
  });

  it('should initialize watcher without errors', () => {
    expect(() => {
      watcher = initializeAutoRegistration(db, TEST_PAGES_DIR);
    }).not.toThrow();
  });

  it('should auto-register new page file', async () => {
    // Initialize watcher
    watcher = initializeAutoRegistration(db, TEST_PAGES_DIR);
    await waitForWatcherReady(watcher);

    // Create test page (legacy format with specification field)
    const pageData = {
      id: 'test-page-001',
      agent_id: 'test-agent',
      title: 'Test Page',
      specification: '# Test Specification',
      version: 1,
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString()
    };

    // Write page file
    const filePath = path.join(TEST_PAGES_DIR, 'test-page-001.json');
    fs.writeFileSync(filePath, JSON.stringify(pageData, null, 2));

    // Wait for file system and database operations
    await new Promise(resolve => setTimeout(resolve, 1500));

    // Verify registration
    const registered = db.prepare(
      'SELECT * FROM agent_pages WHERE id = ? AND agent_id = ?'
    ).get('test-page-001', 'test-agent');

    expect(registered).toBeDefined();
    expect(registered.title).toBe('Test Page');
    expect(registered.content_value).toBe('# Test Specification');
    // Legacy format with 'specification' field maps to 'json' content_type
    expect(registered.content_type).toBe('json');
  }, 10000);

  it('should not duplicate existing pages', async () => {
    // Pre-insert page
    db.prepare(`
      INSERT INTO agent_pages (id, agent_id, title, content_type, content_value, status, version)
      VALUES (?, ?, ?, ?, ?, ?, ?)
    `).run('existing-page', 'test-agent', 'Existing Page', 'markdown', '# Existing', 'published', 1);

    // Initialize watcher
    watcher = initializeAutoRegistration(db, TEST_PAGES_DIR);
    await waitForWatcherReady(watcher);

    // Write duplicate page
    const pageData = {
      id: 'existing-page',
      agent_id: 'test-agent',
      title: 'Updated Title',
      specification: '# Updated Spec',
      version: 2
    };

    const filePath = path.join(TEST_PAGES_DIR, 'existing-page.json');
    fs.writeFileSync(filePath, JSON.stringify(pageData, null, 2));

    // Wait for operations
    await new Promise(resolve => setTimeout(resolve, 1500));

    // Verify no duplication (should be replaced)
    const pages = db.prepare(
      'SELECT * FROM agent_pages WHERE id = ?'
    ).all('existing-page');

    expect(pages).toHaveLength(1);
    expect(pages[0].title).toBe('Updated Title'); // Should be updated due to INSERT OR REPLACE
  }, 10000);

  it('should handle invalid JSON gracefully', async () => {
    // Mock console.error to check error handling
    const errorSpy = vi.spyOn(console, 'error').mockImplementation(() => {});

    // Initialize watcher
    watcher = initializeAutoRegistration(db, TEST_PAGES_DIR);
    await waitForWatcherReady(watcher);

    // Write invalid JSON
    const filePath = path.join(TEST_PAGES_DIR, 'invalid-page.json');
    fs.writeFileSync(filePath, '{ invalid json }');

    // Wait for operations
    await new Promise(resolve => setTimeout(resolve, 1500));

    // Verify error was logged
    expect(errorSpy).toHaveBeenCalled();

    // Verify no page was created
    const pages = db.prepare('SELECT * FROM agent_pages').all();
    expect(pages.filter(p => p.id.includes('invalid'))).toHaveLength(0);

    errorSpy.mockRestore();
  }, 10000);

  it('should handle multiple files sequentially', async () => {
    // Initialize watcher
    watcher = initializeAutoRegistration(db, TEST_PAGES_DIR);
    await waitForWatcherReady(watcher);

    // Create multiple pages with delays
    for (let i = 1; i <= 3; i++) {
      const pageData = {
        id: `multi-page-${i}`,
        agent_id: 'test-agent',
        title: `Page ${i}`,
        specification: `# Page ${i} Spec`,
        version: 1
      };

      const filePath = path.join(TEST_PAGES_DIR, `multi-page-${i}.json`);
      fs.writeFileSync(filePath, JSON.stringify(pageData, null, 2));

      // Small delay between writes
      await new Promise(resolve => setTimeout(resolve, 1000));
    }

    // Wait for all operations
    await new Promise(resolve => setTimeout(resolve, 4000));

    // Verify all pages registered
    const pages = db.prepare(
      'SELECT * FROM agent_pages WHERE id LIKE ?'
    ).all('multi-page-%');

    expect(pages).toHaveLength(3);
    expect(pages.map(p => p.title).sort()).toEqual(['Page 1', 'Page 2', 'Page 3']);
  }, 15000);

  it('should log registration events', async () => {
    const logSpy = vi.spyOn(console, 'log').mockImplementation(() => {});

    // Initialize watcher
    watcher = initializeAutoRegistration(db, TEST_PAGES_DIR);
    await waitForWatcherReady(watcher);

    // Create page
    const pageData = {
      id: 'log-test-page',
      agent_id: 'test-agent',
      title: 'Log Test',
      specification: '# Test'
    };

    const filePath = path.join(TEST_PAGES_DIR, 'log-test-page.json');
    fs.writeFileSync(filePath, JSON.stringify(pageData, null, 2));

    // Wait for operations
    await new Promise(resolve => setTimeout(resolve, 1500));

    // Verify logging
    expect(logSpy).toHaveBeenCalledWith(
      expect.stringContaining('New page file detected')
    );
    expect(logSpy).toHaveBeenCalledWith(
      expect.stringContaining('Auto-registered')
    );

    logSpy.mockRestore();
  }, 10000);

  it('should handle missing required fields with defaults', async () => {
    // Initialize watcher
    watcher = initializeAutoRegistration(db, TEST_PAGES_DIR);
    await waitForWatcherReady(watcher);

    // Create page with minimal data
    const pageData = {
      id: 'minimal-page',
      agent_id: 'test-agent',
      title: 'Minimal Page'
      // Missing: specification, version, timestamps
    };

    const filePath = path.join(TEST_PAGES_DIR, 'minimal-page.json');
    fs.writeFileSync(filePath, JSON.stringify(pageData, null, 2));

    // Wait for operations
    await new Promise(resolve => setTimeout(resolve, 1500));

    // Verify page was created with defaults
    const page = db.prepare(
      'SELECT * FROM agent_pages WHERE id = ?'
    ).get('minimal-page');

    expect(page).toBeDefined();
    expect(page.version).toBe(1);
    expect(page.created_at).toBeDefined();
    expect(page.updated_at).toBeDefined();
  }, 10000);

  it('should use INSERT OR REPLACE for updates', async () => {
    // Pre-insert original version
    db.prepare(`
      INSERT INTO agent_pages (id, agent_id, title, content_type, content_value, status, version)
      VALUES (?, ?, ?, ?, ?, ?, ?)
    `).run('update-test', 'test-agent', 'Original', 'markdown', '# Original', 'published', 1);

    // Initialize watcher
    watcher = initializeAutoRegistration(db, TEST_PAGES_DIR);
    await waitForWatcherReady(watcher);

    // Write updated version
    const pageData = {
      id: 'update-test',
      agent_id: 'test-agent',
      title: 'Updated Title',
      specification: '# Updated Spec',
      version: 2
    };

    const filePath = path.join(TEST_PAGES_DIR, 'update-test.json');
    fs.writeFileSync(filePath, JSON.stringify(pageData, null, 2));

    // Wait for operations
    await new Promise(resolve => setTimeout(resolve, 1500));

    // Verify update
    const page = db.prepare(
      'SELECT * FROM agent_pages WHERE id = ?'
    ).get('update-test');

    expect(page.title).toBe('Updated Title');
    expect(page.version).toBe(2);
  }, 10000);
});

// Schema Compatibility Tests
describe('Schema Compatibility - transformPageData', () => {
  it('should transform legacy page-builder format with specification field', () => {
    const legacyPageData = {
      id: 'legacy-page-001',
      agent_id: 'page-builder-agent',
      title: 'Legacy Dashboard',
      specification: '{"components": [{"type": "Card", "title": "Dashboard"}]}',
      version: 1,
      created_at: '2025-01-01T00:00:00.000Z',
      updated_at: '2025-01-01T00:00:00.000Z',
      metadata: {
        template: 'dashboard',
        layout: 'grid'
      }
    };

    const transformed = transformPageData(legacyPageData);

    expect(transformed).toEqual({
      id: 'legacy-page-001',
      agent_id: 'page-builder-agent',
      title: 'Legacy Dashboard',
      content_type: 'json',
      content_value: '{"components": [{"type": "Card", "title": "Dashboard"}]}',
      content_metadata: JSON.stringify({ template: 'dashboard', layout: 'grid' }),
      status: 'published',
      version: 1,
      created_at: '2025-01-01T00:00:00.000Z',
      updated_at: '2025-01-01T00:00:00.000Z'
    });
  });

  it('should transform new format with content_type and content_value', () => {
    const newPageData = {
      id: 'new-page-001',
      agent_id: 'modern-agent',
      title: 'Modern Page',
      content_type: 'json',
      content_value: '{"sections": [{"type": "header"}]}',
      content_metadata: { version: '2.0' },
      status: 'draft',
      version: 2,
      created_at: '2025-02-01T00:00:00.000Z',
      updated_at: '2025-02-01T00:00:00.000Z'
    };

    const transformed = transformPageData(newPageData);

    expect(transformed).toEqual({
      id: 'new-page-001',
      agent_id: 'modern-agent',
      title: 'Modern Page',
      content_type: 'json',
      content_value: '{"sections": [{"type": "header"}]}',
      content_metadata: JSON.stringify({ version: '2.0' }),
      status: 'draft',
      version: 2,
      created_at: '2025-02-01T00:00:00.000Z',
      updated_at: '2025-02-01T00:00:00.000Z'
    });
  });

  it('should handle markdown content type correctly', () => {
    const markdownPage = {
      id: 'md-page',
      agent_id: 'docs-agent',
      title: 'Markdown Document',
      content_type: 'markdown',
      content_value: '# Hello World\n\nThis is markdown.'
    };

    const transformed = transformPageData(markdownPage);

    expect(transformed.content_type).toBe('markdown');
    expect(transformed.content_value).toBe('# Hello World\n\nThis is markdown.');
  });

  it('should handle component content type correctly', () => {
    const componentPage = {
      id: 'component-page',
      agent_id: 'ui-agent',
      title: 'React Component',
      content_type: 'component',
      content_value: '<CustomComponent />'
    };

    const transformed = transformPageData(componentPage);

    expect(transformed.content_type).toBe('component');
    expect(transformed.content_value).toBe('<CustomComponent />');
  });

  it('should default to text for unknown content types', () => {
    const unknownPage = {
      id: 'unknown-page',
      agent_id: 'test-agent',
      title: 'Unknown Type',
      content_type: 'unknown-type',
      content_value: 'Some content'
    };

    const transformed = transformPageData(unknownPage);

    expect(transformed.content_type).toBe('text');
  });

  it('should handle missing optional fields with defaults', () => {
    const minimalPage = {
      id: 'minimal',
      agent_id: 'agent',
      title: 'Minimal',
      content_value: 'Content'
    };

    const transformed = transformPageData(minimalPage);

    expect(transformed.status).toBe('published');
    expect(transformed.version).toBe(1);
    expect(transformed.created_at).toBeDefined();
    expect(transformed.updated_at).toBeDefined();
    expect(transformed.content_type).toBe('text');
  });

  it('should fallback to JSON serialization when no content fields present', () => {
    const fallbackPage = {
      id: 'fallback',
      agent_id: 'agent',
      title: 'Fallback',
      customField: 'value'
    };

    const transformed = transformPageData(fallbackPage);

    expect(transformed.content_type).toBe('json');
    expect(transformed.content_value).toBe(JSON.stringify(fallbackPage));
    expect(transformed.content_metadata).toBeNull();
  });

  it('should handle content_metadata as string or object', () => {
    const pageWithStringMeta = {
      id: 'meta-string',
      agent_id: 'agent',
      title: 'Meta String',
      content_value: 'Content',
      content_metadata: '{"key": "value"}'
    };

    const transformed1 = transformPageData(pageWithStringMeta);
    expect(transformed1.content_metadata).toBe('{"key": "value"}');

    const pageWithObjectMeta = {
      id: 'meta-object',
      agent_id: 'agent',
      title: 'Meta Object',
      content_value: 'Content',
      content_metadata: { key: 'value' }
    };

    const transformed2 = transformPageData(pageWithObjectMeta);
    expect(transformed2.content_metadata).toBe(JSON.stringify({ key: 'value' }));
  });
});

describe('Schema Compatibility - Integration Tests', () => {
  let db;
  let watcher;

  beforeEach(() => {
    // Create temp directories
    fs.mkdirSync(path.dirname(TEST_DB_PATH), { recursive: true });
    fs.mkdirSync(TEST_PAGES_DIR, { recursive: true });

    // Setup test database
    db = new Database(TEST_DB_PATH);
    db.pragma('foreign_keys = ON');

    // Create schema matching production database
    db.exec(`
      CREATE TABLE IF NOT EXISTS agents (
        id TEXT PRIMARY KEY,
        name TEXT NOT NULL,
        description TEXT,
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
      );

      CREATE TABLE IF NOT EXISTS agent_pages (
        id TEXT PRIMARY KEY,
        agent_id TEXT NOT NULL,
        title TEXT NOT NULL,
        content_type TEXT NOT NULL DEFAULT 'text',
        content_value TEXT NOT NULL,
        content_metadata TEXT,
        status TEXT NOT NULL DEFAULT 'draft',
        tags TEXT,
        version INTEGER DEFAULT 1,
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
      );
    `);
  });

  afterEach(() => {
    // Stop watcher
    if (watcher) {
      watcher.close();
    }

    // Close database
    if (db) {
      db.close();
    }

    // Clean up test files
    if (fs.existsSync(TEST_PAGES_DIR)) {
      fs.rmSync(TEST_PAGES_DIR, { recursive: true, force: true });
    }
    if (fs.existsSync(TEST_DB_PATH)) {
      fs.unlinkSync(TEST_DB_PATH);
    }
  });

  it('should register legacy page-builder format pages', async () => {
    watcher = initializeAutoRegistration(db, TEST_PAGES_DIR);
    await waitForWatcherReady(watcher);

    const legacyPage = {
      id: 'legacy-integration-001',
      agent_id: 'page-builder-agent',
      title: 'Legacy Dashboard',
      specification: '{"components": [{"type": "Card"}]}',
      version: 1,
      created_at: '2025-01-01T00:00:00.000Z',
      updated_at: '2025-01-01T00:00:00.000Z',
      metadata: {
        template: 'dashboard'
      }
    };

    const filePath = path.join(TEST_PAGES_DIR, 'legacy-integration-001.json');
    fs.writeFileSync(filePath, JSON.stringify(legacyPage, null, 2));

    await new Promise(resolve => setTimeout(resolve, 1500));

    const registered = db.prepare(
      'SELECT * FROM agent_pages WHERE id = ?'
    ).get('legacy-integration-001');

    expect(registered).toBeDefined();
    expect(registered.content_type).toBe('json');
    expect(registered.content_value).toBe('{"components": [{"type": "Card"}]}');
    expect(registered.content_metadata).toBe(JSON.stringify({ template: 'dashboard' }));
  }, 10000);

  it('should register new format pages', async () => {
    watcher = initializeAutoRegistration(db, TEST_PAGES_DIR);
    await waitForWatcherReady(watcher);

    const newPage = {
      id: 'new-integration-001',
      agent_id: 'modern-agent',
      title: 'Modern Page',
      content_type: 'json',
      content_value: '{"sections": [{"type": "header"}]}',
      content_metadata: { version: '2.0' },
      status: 'draft',
      version: 2
    };

    const filePath = path.join(TEST_PAGES_DIR, 'new-integration-001.json');
    fs.writeFileSync(filePath, JSON.stringify(newPage, null, 2));

    await new Promise(resolve => setTimeout(resolve, 1500));

    const registered = db.prepare(
      'SELECT * FROM agent_pages WHERE id = ?'
    ).get('new-integration-001');

    expect(registered).toBeDefined();
    expect(registered.content_type).toBe('json');
    expect(registered.content_value).toBe('{"sections": [{"type": "header"}]}');
    expect(registered.status).toBe('draft');
    expect(registered.version).toBe(2);
  }, 10000);

  it('should handle mixed format pages in same directory', async () => {
    watcher = initializeAutoRegistration(db, TEST_PAGES_DIR);
    await waitForWatcherReady(watcher);

    // Legacy format
    const legacyPage = {
      id: 'mixed-legacy',
      agent_id: 'agent',
      title: 'Legacy',
      specification: '{"data": "legacy"}'
    };

    // New format
    const newPage = {
      id: 'mixed-new',
      agent_id: 'agent',
      title: 'New',
      content_type: 'markdown',
      content_value: '# New Format'
    };

    fs.writeFileSync(
      path.join(TEST_PAGES_DIR, 'mixed-legacy.json'),
      JSON.stringify(legacyPage, null, 2)
    );

    await new Promise(resolve => setTimeout(resolve, 1000));

    fs.writeFileSync(
      path.join(TEST_PAGES_DIR, 'mixed-new.json'),
      JSON.stringify(newPage, null, 2)
    );

    await new Promise(resolve => setTimeout(resolve, 1500));

    const legacyRegistered = db.prepare(
      'SELECT * FROM agent_pages WHERE id = ?'
    ).get('mixed-legacy');

    const newRegistered = db.prepare(
      'SELECT * FROM agent_pages WHERE id = ?'
    ).get('mixed-new');

    expect(legacyRegistered).toBeDefined();
    expect(legacyRegistered.content_type).toBe('json');

    expect(newRegistered).toBeDefined();
    expect(newRegistered.content_type).toBe('markdown');
  }, 15000);
});
