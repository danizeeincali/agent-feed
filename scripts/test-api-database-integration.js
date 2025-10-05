#!/usr/bin/env node

/**
 * End-to-End Integration Test Script
 * Demonstrates that auto-registered pages are accessible via API
 */

import fs from 'fs';
import path from 'path';
import Database from 'better-sqlite3';
import { fileURLToPath } from 'url';
import { dirname } from 'path';
import { initializeAutoRegistration } from '../api-server/middleware/auto-register-pages.js';
import express from 'express';
import agentPagesRouter, { initializeAgentPagesRoutes } from '../api-server/routes/agent-pages.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

// Test configuration
const TEST_DB_PATH = path.join(__dirname, './temp-test-integration.db');
const TEST_PAGES_DIR = path.join(__dirname, './temp-test-pages');
const PORT = 3999;

console.log('🧪 Starting API-Database Integration Test\n');

// Clean up any previous test files
if (fs.existsSync(TEST_DB_PATH)) {
  fs.unlinkSync(TEST_DB_PATH);
}
if (fs.existsSync(TEST_PAGES_DIR)) {
  fs.readdirSync(TEST_PAGES_DIR).forEach(file => {
    fs.unlinkSync(path.join(TEST_PAGES_DIR, file));
  });
  fs.rmdirSync(TEST_PAGES_DIR);
}

// Create test pages directory
fs.mkdirSync(TEST_PAGES_DIR, { recursive: true });

// Create test database
console.log('📦 Creating test database...');
const db = new Database(TEST_DB_PATH);
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

console.log('✅ Database created and schema initialized\n');

// Initialize auto-registration watcher
console.log('👀 Starting auto-registration watcher...');
const watcher = initializeAutoRegistration(db, TEST_PAGES_DIR);

// Initialize Express app with agent pages routes
const app = express();
app.use(express.json());
initializeAgentPagesRoutes(db);
app.use('/api/agent-pages', agentPagesRouter);

let server;

// Wait for watcher to be ready
watcher.on('ready', async () => {
  console.log('✅ Watcher is ready\n');

  // Start test server
  server = app.listen(PORT, async () => {
    console.log(`🚀 Test server running on http://localhost:${PORT}\n`);

    try {
      // Test 1: Create a new page file
      console.log('📝 Test 1: Creating new page file for auto-registration...');
      const testPage = {
        id: 'demo-page-1',
        agent_id: 'demo-agent',
        title: 'Demo Page 1',
        content_type: 'json',
        content_value: JSON.stringify({
          message: 'Hello from auto-registered page!',
          timestamp: new Date().toISOString()
        }),
        status: 'published'
      };

      const pageFilePath = path.join(TEST_PAGES_DIR, 'demo-page-1.json');
      fs.writeFileSync(pageFilePath, JSON.stringify(testPage, null, 2));
      console.log(`   ✅ Created: ${pageFilePath}`);

      // Wait for auto-registration
      console.log('   ⏳ Waiting for auto-registration (2 seconds)...');
      await new Promise(resolve => setTimeout(resolve, 2000));

      // Test 2: Verify page in database
      console.log('\n📊 Test 2: Verifying page in database...');
      const dbPage = db.prepare('SELECT * FROM agent_pages WHERE id = ?').get('demo-page-1');
      if (dbPage) {
        console.log('   ✅ Page found in database:');
        console.log(`      ID: ${dbPage.id}`);
        console.log(`      Agent ID: ${dbPage.agent_id}`);
        console.log(`      Title: ${dbPage.title}`);
        console.log(`      Status: ${dbPage.status}`);
      } else {
        console.log('   ❌ Page NOT found in database');
        throw new Error('Page not found in database');
      }

      // Test 3: Verify agent was auto-created
      console.log('\n🤖 Test 3: Verifying agent auto-creation...');
      const dbAgent = db.prepare('SELECT * FROM agents WHERE id = ?').get('demo-agent');
      if (dbAgent) {
        console.log('   ✅ Agent auto-created:');
        console.log(`      ID: ${dbAgent.id}`);
        console.log(`      Name: ${dbAgent.name}`);
      } else {
        console.log('   ❌ Agent NOT found in database');
        throw new Error('Agent not auto-created');
      }

      // Test 4: Access via API
      console.log('\n🌐 Test 4: Accessing page via API...');
      const response = await fetch(`http://localhost:${PORT}/api/agent-pages/agents/demo-agent/pages/demo-page-1`);
      const apiResult = await response.json();

      if (apiResult.success && apiResult.page) {
        console.log('   ✅ Page accessible via API:');
        console.log(`      Success: ${apiResult.success}`);
        console.log(`      Page ID: ${apiResult.page.id}`);
        console.log(`      Page Title: ${apiResult.page.title}`);
        console.log(`      Content Type: ${apiResult.page.content_type}`);
      } else {
        console.log('   ❌ Page NOT accessible via API');
        console.log(`      Response: ${JSON.stringify(apiResult, null, 2)}`);
        throw new Error('Page not accessible via API');
      }

      // Test 5: List all pages for agent
      console.log('\n📋 Test 5: Listing all pages for agent via API...');
      const listResponse = await fetch(`http://localhost:${PORT}/api/agent-pages/agents/demo-agent/pages`);
      const listResult = await listResponse.json();

      if (listResult.success && listResult.pages) {
        console.log('   ✅ Pages list retrieved via API:');
        console.log(`      Total: ${listResult.total}`);
        console.log(`      Pages count: ${listResult.pages.length}`);
        listResult.pages.forEach(page => {
          console.log(`      - ${page.title} (${page.id})`);
        });
      } else {
        console.log('   ❌ Failed to list pages via API');
        throw new Error('Failed to list pages via API');
      }

      console.log('\n✅ ALL TESTS PASSED!\n');
      console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
      console.log('✨ API-Database Integration is working correctly!');
      console.log('   - Auto-registration middleware writes to database ✓');
      console.log('   - Agent auto-creation works ✓');
      console.log('   - Pages accessible via database-backed API ✓');
      console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n');

    } catch (error) {
      console.error('\n❌ TEST FAILED:', error.message);
      console.error(error.stack);
    } finally {
      // Cleanup
      console.log('🧹 Cleaning up...');
      watcher.close();
      server.close();
      db.close();

      // Remove test files
      if (fs.existsSync(TEST_DB_PATH)) {
        fs.unlinkSync(TEST_DB_PATH);
      }
      if (fs.existsSync(TEST_PAGES_DIR)) {
        fs.readdirSync(TEST_PAGES_DIR).forEach(file => {
          fs.unlinkSync(path.join(TEST_PAGES_DIR, file));
        });
        fs.rmdirSync(TEST_PAGES_DIR);
      }

      console.log('✅ Cleanup complete\n');
      process.exit(0);
    }
  });
});

// Handle errors
process.on('unhandledRejection', (error) => {
  console.error('❌ Unhandled rejection:', error);
  process.exit(1);
});
