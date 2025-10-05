/**
 * Integration Tests: API-Database Integration
 * Tests that auto-registered pages are accessible via API
 */

import { describe, it, expect, beforeAll, afterAll, beforeEach } from 'vitest';
import fs from 'fs';
import path from 'path';
import Database from 'better-sqlite3';
import { fileURLToPath } from 'url';
import { dirname } from 'path';
import { initializeAutoRegistration } from '../../middleware/auto-register-pages.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

// Test database path
const TEST_DB_PATH = path.join(__dirname, '../temp/test-api-integration.db');
const TEST_PAGES_DIR = path.join(__dirname, '../temp/test-pages');

let db;
let watcher;

describe('API-Database Integration', () => {
  beforeAll(() => {
    // Ensure temp directory exists
    const tempDir = path.join(__dirname, '../temp');
    if (!fs.existsSync(tempDir)) {
      fs.mkdirSync(tempDir, { recursive: true });
    }

    // Create test pages directory
    if (!fs.existsSync(TEST_PAGES_DIR)) {
      fs.mkdirSync(TEST_PAGES_DIR, { recursive: true });
    }

    // Remove old database if exists
    if (fs.existsSync(TEST_DB_PATH)) {
      fs.unlinkSync(TEST_DB_PATH);
    }

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
    `);

    console.log('Test database initialized');
  });

  afterAll(() => {
    // Stop watcher
    if (watcher) {
      watcher.close();
    }

    // Close database
    if (db) {
      db.close();
    }

    // Clean up test files
    if (fs.existsSync(TEST_DB_PATH)) {
      fs.unlinkSync(TEST_DB_PATH);
    }

    if (fs.existsSync(TEST_PAGES_DIR)) {
      fs.readdirSync(TEST_PAGES_DIR).forEach(file => {
        fs.unlinkSync(path.join(TEST_PAGES_DIR, file));
      });
      fs.rmdirSync(TEST_PAGES_DIR);
    }

    console.log('Test cleanup completed');
  });

  beforeEach(async () => {
    // Stop any existing watcher
    if (watcher) {
      watcher.close();
      watcher = null;
      // Wait for watcher to fully close
      await new Promise(resolve => setTimeout(resolve, 200));
    }

    // Clear database before each test
    db.prepare('DELETE FROM agent_pages').run();
    db.prepare('DELETE FROM agents').run();

    // Clear test pages directory
    if (fs.existsSync(TEST_PAGES_DIR)) {
      fs.readdirSync(TEST_PAGES_DIR).forEach(file => {
        fs.unlinkSync(path.join(TEST_PAGES_DIR, file));
      });
    }
  });

  describe('Auto-registration with Agent Auto-creation', () => {
    it('should auto-create agent and register page when new page file is added', async () => {
      // Initialize auto-registration watcher
      watcher = initializeAutoRegistration(db, TEST_PAGES_DIR);

      // Wait for watcher to be ready
      await new Promise(resolve => {
        watcher.on('ready', resolve);
      });

      // Create a new page file
      const testPage = {
        id: 'test-page-1',
        agent_id: 'test-agent-1',
        title: 'Test Page 1',
        content_type: 'json',
        content_value: JSON.stringify({ message: 'Hello World' }),
        status: 'published'
      };

      const pageFilePath = path.join(TEST_PAGES_DIR, 'test-page-1.json');
      fs.writeFileSync(pageFilePath, JSON.stringify(testPage, null, 2));

      // Wait for auto-registration to complete
      await new Promise(resolve => setTimeout(resolve, 1000));

      // Verify agent was auto-created
      const agent = db.prepare('SELECT * FROM agents WHERE id = ?').get('test-agent-1');
      expect(agent).toBeDefined();
      expect(agent.id).toBe('test-agent-1');
      expect(agent.name).toBe('Test Agent 1'); // Auto-generated name

      // Verify page was registered
      const page = db.prepare('SELECT * FROM agent_pages WHERE id = ?').get('test-page-1');
      expect(page).toBeDefined();
      expect(page.id).toBe('test-page-1');
      expect(page.agent_id).toBe('test-agent-1');
      expect(page.title).toBe('Test Page 1');
      expect(page.status).toBe('published');

      // Stop watcher
      watcher.close();
      watcher = null;
    });

    it('should register page when agent already exists', async () => {
      // Pre-create agent
      db.prepare(`
        INSERT INTO agents (id, name, description, created_at, updated_at)
        VALUES (?, ?, ?, ?, ?)
      `).run(
        'existing-agent',
        'Existing Agent',
        'Pre-existing agent',
        new Date().toISOString(),
        new Date().toISOString()
      );

      // Initialize auto-registration watcher
      watcher = initializeAutoRegistration(db, TEST_PAGES_DIR);

      // Wait for watcher to be ready
      await new Promise(resolve => {
        watcher.on('ready', resolve);
      });

      // Create a new page file
      const testPage = {
        id: 'test-page-2',
        agent_id: 'existing-agent',
        title: 'Test Page 2',
        content_type: 'markdown',
        content_value: '# Hello World',
        status: 'published'
      };

      const pageFilePath = path.join(TEST_PAGES_DIR, 'test-page-2.json');
      fs.writeFileSync(pageFilePath, JSON.stringify(testPage, null, 2));

      // Wait for auto-registration to complete
      await new Promise(resolve => setTimeout(resolve, 1500));

      // Verify agent count (should still be 1)
      const agentCount = db.prepare('SELECT COUNT(*) as count FROM agents').get();
      expect(agentCount.count).toBe(1);

      // Verify page was registered
      const page = db.prepare('SELECT * FROM agent_pages WHERE id = ?').get('test-page-2');
      expect(page).toBeDefined();
      expect(page.id).toBe('test-page-2');
      expect(page.agent_id).toBe('existing-agent');
      expect(page.title).toBe('Test Page 2');
      expect(page.content_type).toBe('markdown');

      // Stop watcher
      watcher.close();
      watcher = null;
    });

    it('should update existing page when file is updated', async () => {
      // Pre-create agent and page
      db.prepare(`
        INSERT INTO agents (id, name, description, created_at, updated_at)
        VALUES (?, ?, ?, ?, ?)
      `).run(
        'update-agent',
        'Update Agent',
        'Agent for update test',
        new Date().toISOString(),
        new Date().toISOString()
      );

      db.prepare(`
        INSERT INTO agent_pages (id, agent_id, title, content_type, content_value, status, version)
        VALUES (?, ?, ?, ?, ?, ?, ?)
      `).run(
        'update-page',
        'update-agent',
        'Original Title',
        'text',
        'Original content',
        'draft',
        1
      );

      // Initialize auto-registration watcher
      watcher = initializeAutoRegistration(db, TEST_PAGES_DIR);

      // Wait for watcher to be ready
      await new Promise(resolve => {
        watcher.on('ready', resolve);
      });

      // Create updated page file
      const updatedPage = {
        id: 'update-page',
        agent_id: 'update-agent',
        title: 'Updated Title',
        content_type: 'text',
        content_value: 'Updated content',
        status: 'published',
        version: 2
      };

      const pageFilePath = path.join(TEST_PAGES_DIR, 'update-page.json');
      fs.writeFileSync(pageFilePath, JSON.stringify(updatedPage, null, 2));

      // Wait for auto-registration to complete
      await new Promise(resolve => setTimeout(resolve, 1500));

      // Verify page was updated
      const page = db.prepare('SELECT * FROM agent_pages WHERE id = ?').get('update-page');
      expect(page).toBeDefined();
      expect(page.title).toBe('Updated Title');
      expect(page.content_value).toBe('Updated content');
      expect(page.status).toBe('published');
      expect(page.version).toBe(2);

      // Stop watcher
      watcher.close();
      watcher = null;
    });
  });

  describe('Database Query Operations', () => {
    beforeEach(() => {
      // Create test agent
      db.prepare(`
        INSERT INTO agents (id, name, description, created_at, updated_at)
        VALUES (?, ?, ?, ?, ?)
      `).run(
        'query-test-agent',
        'Query Test Agent',
        'Agent for query tests',
        new Date().toISOString(),
        new Date().toISOString()
      );

      // Create test pages
      const pages = [
        { id: 'page-1', title: 'Page 1', content_type: 'json', content_value: '{"test": 1}', status: 'published' },
        { id: 'page-2', title: 'Page 2', content_type: 'markdown', content_value: '# Page 2', status: 'published' },
        { id: 'page-3', title: 'Page 3', content_type: 'text', content_value: 'Page 3 content', status: 'draft' }
      ];

      pages.forEach(page => {
        db.prepare(`
          INSERT INTO agent_pages (id, agent_id, title, content_type, content_value, status)
          VALUES (?, ?, ?, ?, ?, ?)
        `).run(page.id, 'query-test-agent', page.title, page.content_type, page.content_value, page.status);
      });
    });

    it('should retrieve all pages for an agent', () => {
      const pages = db.prepare(
        'SELECT * FROM agent_pages WHERE agent_id = ? ORDER BY id ASC'
      ).all('query-test-agent');

      expect(pages).toHaveLength(3);
      expect(pages[0].title).toBe('Page 1');
      expect(pages[1].title).toBe('Page 2');
      expect(pages[2].title).toBe('Page 3');
    });

    it('should filter pages by status', () => {
      const publishedPages = db.prepare(
        'SELECT * FROM agent_pages WHERE agent_id = ? AND status = ?'
      ).all('query-test-agent', 'published');

      expect(publishedPages).toHaveLength(2);
      expect(publishedPages.every(p => p.status === 'published')).toBe(true);
    });

    it('should filter pages by content type', () => {
      const markdownPages = db.prepare(
        'SELECT * FROM agent_pages WHERE agent_id = ? AND content_type = ?'
      ).all('query-test-agent', 'markdown');

      expect(markdownPages).toHaveLength(1);
      expect(markdownPages[0].content_type).toBe('markdown');
    });

    it('should support pagination', () => {
      const limit = 2;
      const offset = 0;

      const paginatedPages = db.prepare(
        'SELECT * FROM agent_pages WHERE agent_id = ? ORDER BY created_at DESC LIMIT ? OFFSET ?'
      ).all('query-test-agent', limit, offset);

      expect(paginatedPages).toHaveLength(2);
    });

    it('should get total count for pagination', () => {
      const { total } = db.prepare(
        'SELECT COUNT(*) as total FROM agent_pages WHERE agent_id = ?'
      ).get('query-test-agent');

      expect(total).toBe(3);
    });
  });

  describe('Foreign Key Constraints', () => {
    it('should prevent page creation without agent when using INSERT', () => {
      expect(() => {
        db.prepare(`
          INSERT INTO agent_pages (id, agent_id, title, content_type, content_value, status)
          VALUES (?, ?, ?, ?, ?, ?)
        `).run('fk-page', 'non-existent-agent', 'FK Test', 'text', 'content', 'published');
      }).toThrow();
    });

    it('should cascade delete pages when agent is deleted', () => {
      // Create agent and page
      db.prepare(`
        INSERT INTO agents (id, name, description, created_at, updated_at)
        VALUES (?, ?, ?, ?, ?)
      `).run(
        'cascade-agent',
        'Cascade Agent',
        'Agent for cascade test',
        new Date().toISOString(),
        new Date().toISOString()
      );

      db.prepare(`
        INSERT INTO agent_pages (id, agent_id, title, content_type, content_value, status)
        VALUES (?, ?, ?, ?, ?, ?)
      `).run('cascade-page', 'cascade-agent', 'Cascade Page', 'text', 'content', 'published');

      // Verify page exists
      let page = db.prepare('SELECT * FROM agent_pages WHERE id = ?').get('cascade-page');
      expect(page).toBeDefined();

      // Delete agent
      db.prepare('DELETE FROM agents WHERE id = ?').run('cascade-agent');

      // Verify page was cascade deleted
      page = db.prepare('SELECT * FROM agent_pages WHERE id = ?').get('cascade-page');
      expect(page).toBeUndefined();
    });
  });
});
