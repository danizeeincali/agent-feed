/**
 * Auto-Registration Middleware Integration Test
 * Tests the middleware working with the actual agent pages database
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

// Use actual database and directory
const AGENT_PAGES_DB_PATH = path.join(__dirname, '../../../data/agent-pages.db');
const AGENT_PAGES_DIR = path.join(__dirname, '../../../data/agent-pages');

describe('Auto-Registration Integration', () => {
  let watcher;
  let db;
  let testPageId;

  beforeAll(() => {
    // Connect to actual database
    db = new Database(AGENT_PAGES_DB_PATH);
    db.pragma('foreign_keys = ON');

    // Generate unique test page ID
    testPageId = `integration-test-page-${Date.now()}`;
  });

  afterAll(() => {
    // Stop watcher
    if (watcher) {
      watcher.close();
    }

    // Clean up test page from database
    if (db && testPageId) {
      db.prepare('DELETE FROM agent_pages WHERE id = ?').run(testPageId);
      db.close();
    }

    // Clean up test file
    const testFilePath = path.join(AGENT_PAGES_DIR, `${testPageId}.json`);
    if (fs.existsSync(testFilePath)) {
      fs.unlinkSync(testFilePath);
    }
  });

  it('should auto-register page in production database', async () => {
    // Initialize watcher with production database
    watcher = initializeAutoRegistration(db, AGENT_PAGES_DIR);

    // Wait for watcher ready
    await new Promise((resolve) => {
      watcher.on('ready', resolve);
    });

    // Create test page with specification (page-builder format)
    const specification = {
      components: [
        { type: 'Header', props: { title: 'Integration Test' } },
        { type: 'Text', props: { content: 'This page was created by integration test.' } }
      ]
    };

    const pageData = {
      id: testPageId,
      agent_id: 'personal-todos-agent',
      title: 'Integration Test Page',
      specification: JSON.stringify(specification),
      version: 1,
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString()
    };

    // Write to actual agent pages directory
    const testFilePath = path.join(AGENT_PAGES_DIR, `${testPageId}.json`);
    fs.writeFileSync(testFilePath, JSON.stringify(pageData, null, 2));

    // Wait for auto-registration
    await new Promise(resolve => setTimeout(resolve, 1500));

    // Verify page was registered
    const registered = db.prepare(
      'SELECT * FROM agent_pages WHERE id = ?'
    ).get(testPageId);

    expect(registered).toBeDefined();
    expect(registered.id).toBe(testPageId);
    expect(registered.agent_id).toBe('personal-todos-agent');
    expect(registered.title).toBe('Integration Test Page');

    // Verify original specification format is preserved
    expect(registered.content_type).toBe('json');
    expect(registered.content_value).toBe(JSON.stringify(specification));

    // Parse and verify structure
    const parsedContent = JSON.parse(registered.content_value);
    expect(parsedContent.components).toBeDefined();
    expect(parsedContent.components[0].type).toBe('Header');
  }, 10000);

  it('should preserve content_value format when already in database schema', async () => {
    // Watcher should still be active from previous test
    expect(watcher).toBeDefined();

    // Create page with content_value (already in database format)
    const secondPageId = `integration-test-page-2-${Date.now()}`;
    const pageData = {
      id: secondPageId,
      agent_id: 'personal-todos-agent',
      title: 'Content Value Format Test',
      content_type: 'markdown',
      content_value: '# Markdown Content\n\nThis is already in database format.',
      version: 1
    };

    const testFilePath = path.join(AGENT_PAGES_DIR, `${secondPageId}.json`);
    fs.writeFileSync(testFilePath, JSON.stringify(pageData, null, 2));

    // Wait for auto-registration
    await new Promise(resolve => setTimeout(resolve, 1500));

    // Verify registration
    const registered = db.prepare(
      'SELECT * FROM agent_pages WHERE id = ?'
    ).get(secondPageId);

    expect(registered).toBeDefined();
    expect(registered.title).toBe('Content Value Format Test');

    // Verify content_value format is preserved
    expect(registered.content_type).toBe('markdown');
    expect(registered.content_value).toBe('# Markdown Content\n\nThis is already in database format.');

    // Clean up
    db.prepare('DELETE FROM agent_pages WHERE id = ?').run(secondPageId);
    if (fs.existsSync(testFilePath)) {
      fs.unlinkSync(testFilePath);
    }
  }, 10000);

  it('should handle both specification and content_value formats in separate files', async () => {
    // Test specification format
    const specPageId = `integration-test-spec-${Date.now()}`;
    const specPage = {
      id: specPageId,
      agent_id: 'personal-todos-agent',
      title: 'Specification Format Test',
      specification: JSON.stringify({ type: 'test', data: 'spec-format' }),
      version: 1
    };

    const specFilePath = path.join(AGENT_PAGES_DIR, `${specPageId}.json`);
    fs.writeFileSync(specFilePath, JSON.stringify(specPage, null, 2));

    // Wait for registration
    await new Promise(resolve => setTimeout(resolve, 1500));

    // Verify specification format
    const specRegistered = db.prepare(
      'SELECT * FROM agent_pages WHERE id = ?'
    ).get(specPageId);

    expect(specRegistered.content_type).toBe('json');
    expect(specRegistered.content_value).toBe(JSON.stringify({ type: 'test', data: 'spec-format' }));

    // Test content_value format in a different file
    const contentPageId = `integration-test-content-${Date.now()}`;
    const contentPage = {
      id: contentPageId,
      agent_id: 'personal-todos-agent',
      title: 'Content Value Format Test',
      content_type: 'text',
      content_value: 'Plain text content',
      version: 1
    };

    const contentFilePath = path.join(AGENT_PAGES_DIR, `${contentPageId}.json`);
    fs.writeFileSync(contentFilePath, JSON.stringify(contentPage, null, 2));

    // Wait for registration
    await new Promise(resolve => setTimeout(resolve, 1500));

    // Verify content_value format
    const contentRegistered = db.prepare(
      'SELECT * FROM agent_pages WHERE id = ?'
    ).get(contentPageId);

    expect(contentRegistered.content_type).toBe('text');
    expect(contentRegistered.content_value).toBe('Plain text content');

    // Clean up both
    db.prepare('DELETE FROM agent_pages WHERE id = ?').run(specPageId);
    db.prepare('DELETE FROM agent_pages WHERE id = ?').run(contentPageId);
    if (fs.existsSync(specFilePath)) {
      fs.unlinkSync(specFilePath);
    }
    if (fs.existsSync(contentFilePath)) {
      fs.unlinkSync(contentFilePath);
    }
  }, 10000);
});
