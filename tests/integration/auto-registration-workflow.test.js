/**
 * Auto-Registration Workflow Comprehensive Validation Test
 *
 * Tests the complete auto-registration workflow from end-to-end with 100% real functionality:
 * - File creation → auto-detection → registration → API accessibility
 * - Server crashes and recovery scenarios
 * - Multiple concurrent file creations
 * - Memory stability over 100+ registrations
 *
 * All tests use real API server and database - NO MOCKS
 */

import { describe, it, expect, beforeAll, afterAll, afterEach } from 'vitest';
import Database from 'better-sqlite3';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import { dirname } from 'path';
import { initializeAutoRegistration } from '../../api-server/middleware/auto-register-pages.js';
import express from 'express';
import { initializeAgentPagesRoutes } from '../../api-server/routes/agent-pages.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

// Use actual production paths
const AGENT_PAGES_DB_PATH = path.join(__dirname, '../../data/agent-pages.db');
const AGENT_PAGES_DIR = path.join(__dirname, '../../data/agent-pages');
const TEST_PREFIX = 'auto-reg-workflow-test';

describe('Auto-Registration Workflow - Complete E2E Validation', () => {
  let watcher;
  let db;
  let app;
  let server;
  let testPageIds = [];

  beforeAll(async () => {
    // Connect to REAL production database
    db = new Database(AGENT_PAGES_DB_PATH);
    db.pragma('foreign_keys = ON');
    console.log('✅ Connected to production database:', AGENT_PAGES_DB_PATH);

    // Initialize REAL Express app with production routes
    app = express();
    app.use(express.json());
    const agentPagesRouter = initializeAgentPagesRoutes(db);
    app.use('/api/agent-pages', agentPagesRouter);

    // Start REAL server
    server = app.listen(0); // Random port
    const port = server.address().port;
    console.log(`✅ Real API server started on port ${port}`);

    // Initialize REAL auto-registration watcher
    watcher = initializeAutoRegistration(db, AGENT_PAGES_DIR);
    await new Promise(resolve => watcher.on('ready', resolve));
    console.log('✅ Real auto-registration watcher initialized');
  });

  afterAll(async () => {
    // Clean up all test pages from REAL database
    if (db && testPageIds.length > 0) {
      const placeholders = testPageIds.map(() => '?').join(',');
      db.prepare(`DELETE FROM agent_pages WHERE id IN (${placeholders})`).run(...testPageIds);
      console.log(`✅ Cleaned up ${testPageIds.length} test pages from database`);
    }

    // Clean up test files from REAL filesystem
    const files = fs.readdirSync(AGENT_PAGES_DIR);
    files.forEach(file => {
      if (file.startsWith(TEST_PREFIX)) {
        fs.unlinkSync(path.join(AGENT_PAGES_DIR, file));
      }
    });

    // Shutdown REAL resources
    if (watcher) await watcher.close();
    if (server) await new Promise(resolve => server.close(resolve));
    if (db) db.close();
    console.log('✅ All real resources cleaned up');
  });

  afterEach(() => {
    // Track test page IDs for cleanup
    // Individual tests add their IDs to testPageIds array
  });

  describe('File Creation → Auto-Detection → Registration → API Accessibility', () => {
    it('should complete full workflow: file write → watcher detect → DB insert → API read', async () => {
      // Generate unique test page
      const pageId = `${TEST_PREFIX}-${Date.now()}-basic`;
      testPageIds.push(pageId);

      // STEP 1: Create REAL file in production directory
      const pageData = {
        id: pageId,
        agent_id: 'workflow-test-agent',
        title: 'Workflow Test Page',
        content_type: 'markdown',
        content_value: '# Workflow Test\n\nThis validates the complete auto-registration workflow.',
        status: 'published',
        version: 1
      };

      const filePath = path.join(AGENT_PAGES_DIR, `${pageId}.json`);
      fs.writeFileSync(filePath, JSON.stringify(pageData, null, 2));
      console.log(`📄 Created real file: ${filePath}`);

      // STEP 2: Wait for REAL watcher to detect and process
      await new Promise(resolve => setTimeout(resolve, 1500));

      // STEP 3: Verify REAL database insertion
      const dbRecord = db.prepare('SELECT * FROM agent_pages WHERE id = ?').get(pageId);
      expect(dbRecord).toBeDefined();
      expect(dbRecord.id).toBe(pageId);
      expect(dbRecord.agent_id).toBe('workflow-test-agent');
      expect(dbRecord.title).toBe('Workflow Test Page');
      expect(dbRecord.content_type).toBe('markdown');
      expect(dbRecord.content_value).toContain('Workflow Test');
      expect(dbRecord.status).toBe('published');
      console.log('✅ Database record verified');

      // STEP 4: Verify REAL API accessibility
      const port = server.address().port;
      const response = await fetch(`http://localhost:${port}/api/agent-pages/agents/workflow-test-agent/pages/${pageId}`);
      expect(response.ok).toBe(true);

      const apiData = await response.json();
      expect(apiData.success).toBe(true);
      // API might return data or page depending on implementation
      const pageResponse = apiData.data || apiData.page;
      expect(pageResponse).toBeDefined();
      expect(pageResponse.id).toBe(pageId);
      expect(pageResponse.title).toBe('Workflow Test Page');
      console.log('✅ API accessibility verified');

      // Clean up file
      if (fs.existsSync(filePath)) {
        fs.unlinkSync(filePath);
      }
    }, 15000);

    it('should handle legacy page-builder format with specification field', async () => {
      const pageId = `${TEST_PREFIX}-${Date.now()}-legacy`;
      testPageIds.push(pageId);

      // Legacy format (page-builder style)
      const legacyData = {
        id: pageId,
        agent_id: 'workflow-test-agent',
        title: 'Legacy Format Test',
        specification: '# Legacy Specification\n\nThis uses the old page-builder format.',
        metadata: { source: 'page-builder', version: '1.0' },
        status: 'published'
      };

      const filePath = path.join(AGENT_PAGES_DIR, `${pageId}.json`);
      fs.writeFileSync(filePath, JSON.stringify(legacyData, null, 2));

      await new Promise(resolve => setTimeout(resolve, 1500));

      // Verify transformation to new schema
      const dbRecord = db.prepare('SELECT * FROM agent_pages WHERE id = ?').get(pageId);
      expect(dbRecord).toBeDefined();
      expect(dbRecord.content_type).toBe('json'); // Legacy spec becomes json type
      expect(dbRecord.content_value).toContain('Legacy Specification');
      expect(dbRecord.content_metadata).toBeDefined();
      console.log('✅ Legacy format handled correctly');

      if (fs.existsSync(filePath)) {
        fs.unlinkSync(filePath);
      }
    }, 15000);

    it('should auto-create agent if it does not exist', async () => {
      const pageId = `${TEST_PREFIX}-${Date.now()}-new-agent`;
      const newAgentId = `auto-created-agent-${Date.now()}`;
      testPageIds.push(pageId);

      const pageData = {
        id: pageId,
        agent_id: newAgentId,
        title: 'Page for New Agent',
        content_type: 'text',
        content_value: 'This agent should be auto-created.',
        status: 'published'
      };

      const filePath = path.join(AGENT_PAGES_DIR, `${pageId}.json`);
      fs.writeFileSync(filePath, JSON.stringify(pageData, null, 2));

      await new Promise(resolve => setTimeout(resolve, 1500));

      // Verify agent was auto-created
      const agent = db.prepare('SELECT * FROM agents WHERE id = ?').get(newAgentId);
      expect(agent).toBeDefined();
      expect(agent.id).toBe(newAgentId);
      expect(agent.name).toBeTruthy();
      console.log(`✅ Agent auto-created: ${agent.name}`);

      // Verify page registered
      const page = db.prepare('SELECT * FROM agent_pages WHERE id = ?').get(pageId);
      expect(page).toBeDefined();

      // Clean up
      db.prepare('DELETE FROM agents WHERE id = ?').run(newAgentId);
      if (fs.existsSync(filePath)) {
        fs.unlinkSync(filePath);
      }
    }, 15000);
  });

  describe('Server Crashes and Recovery', () => {
    it('should resume watching after watcher restart', async () => {
      // Close existing watcher (simulating crash)
      await watcher.close();
      console.log('🔴 Watcher closed (simulating crash)');

      // Wait a moment
      await new Promise(resolve => setTimeout(resolve, 500));

      // Restart watcher (simulating recovery)
      watcher = initializeAutoRegistration(db, AGENT_PAGES_DIR);
      await new Promise(resolve => watcher.on('ready', resolve));
      console.log('🟢 Watcher restarted (recovery complete)');

      // Create new file after recovery
      const pageId = `${TEST_PREFIX}-${Date.now()}-recovery`;
      testPageIds.push(pageId);

      const pageData = {
        id: pageId,
        agent_id: 'recovery-test-agent',
        title: 'Post-Recovery Test',
        content_type: 'text',
        content_value: 'This was created after watcher recovery.',
        status: 'published'
      };

      const filePath = path.join(AGENT_PAGES_DIR, `${pageId}.json`);
      fs.writeFileSync(filePath, JSON.stringify(pageData, null, 2));

      await new Promise(resolve => setTimeout(resolve, 1500));

      // Verify registration still works
      const dbRecord = db.prepare('SELECT * FROM agent_pages WHERE id = ?').get(pageId);
      expect(dbRecord).toBeDefined();
      expect(dbRecord.title).toBe('Post-Recovery Test');
      console.log('✅ Auto-registration works after recovery');

      if (fs.existsSync(filePath)) {
        fs.unlinkSync(filePath);
      }
    }, 15000);

    it('should handle database reconnection gracefully', async () => {
      const pageId = `${TEST_PREFIX}-${Date.now()}-db-reconnect`;
      testPageIds.push(pageId);

      // Close and reopen database connection (simulating reconnection)
      const dbPath = db.name;
      db.close();
      console.log('🔴 Database closed (simulating disconnect)');

      await new Promise(resolve => setTimeout(resolve, 500));

      db = new Database(dbPath);
      db.pragma('foreign_keys = ON');
      console.log('🟢 Database reconnected');

      // Restart watcher with new database connection
      await watcher.close();
      watcher = initializeAutoRegistration(db, AGENT_PAGES_DIR);
      await new Promise(resolve => watcher.on('ready', resolve));

      // Test registration with new connection
      const pageData = {
        id: pageId,
        agent_id: 'db-reconnect-agent',
        title: 'DB Reconnection Test',
        content_type: 'text',
        content_value: 'Testing after database reconnection.',
        status: 'published'
      };

      const filePath = path.join(AGENT_PAGES_DIR, `${pageId}.json`);
      fs.writeFileSync(filePath, JSON.stringify(pageData, null, 2));

      await new Promise(resolve => setTimeout(resolve, 1500));

      const dbRecord = db.prepare('SELECT * FROM agent_pages WHERE id = ?').get(pageId);
      expect(dbRecord).toBeDefined();
      console.log('✅ Registration works after DB reconnection');

      if (fs.existsSync(filePath)) {
        fs.unlinkSync(filePath);
      }
    }, 15000);
  });

  describe('Multiple Concurrent File Creations', () => {
    it('should handle 10 concurrent file creations without race conditions', async () => {
      const pageIds = [];
      const files = [];

      // Create 10 files simultaneously
      for (let i = 0; i < 10; i++) {
        const pageId = `${TEST_PREFIX}-${Date.now()}-concurrent-${i}`;
        pageIds.push(pageId);
        testPageIds.push(pageId);

        const pageData = {
          id: pageId,
          agent_id: 'concurrent-test-agent',
          title: `Concurrent Test Page ${i}`,
          content_type: 'text',
          content_value: `Content for concurrent page ${i}`,
          status: 'published'
        };

        const filePath = path.join(AGENT_PAGES_DIR, `${pageId}.json`);
        files.push(filePath);
        fs.writeFileSync(filePath, JSON.stringify(pageData, null, 2));
      }

      console.log('📄 Created 10 concurrent files');

      // Wait for all to be processed
      await new Promise(resolve => setTimeout(resolve, 3000));

      // Verify all were registered
      const registered = db.prepare(
        `SELECT * FROM agent_pages WHERE id IN (${pageIds.map(() => '?').join(',')})`
      ).all(...pageIds);

      expect(registered.length).toBe(10);
      console.log(`✅ All 10 concurrent files registered successfully`);

      // Verify no duplicates
      const uniqueIds = new Set(registered.map(r => r.id));
      expect(uniqueIds.size).toBe(10);
      console.log('✅ No duplicate registrations');

      // Clean up files
      files.forEach(file => {
        if (fs.existsSync(file)) {
          fs.unlinkSync(file);
        }
      });
    }, 20000);

    it('should maintain data integrity with rapid sequential writes', async () => {
      const pageIds = [];
      const files = [];

      // Create files rapidly in sequence
      for (let i = 0; i < 20; i++) {
        const pageId = `${TEST_PREFIX}-${Date.now()}-rapid-${i}`;
        pageIds.push(pageId);
        testPageIds.push(pageId);

        const pageData = {
          id: pageId,
          agent_id: 'rapid-test-agent',
          title: `Rapid Test Page ${i}`,
          content_type: 'markdown',
          content_value: `# Rapid Test ${i}\n\nContent index: ${i}`,
          status: 'published'
        };

        const filePath = path.join(AGENT_PAGES_DIR, `${pageId}.json`);
        files.push(filePath);
        fs.writeFileSync(filePath, JSON.stringify(pageData, null, 2));

        // Very short delay between writes
        await new Promise(resolve => setTimeout(resolve, 50));
      }

      console.log('📄 Created 20 files rapidly');

      // Wait for processing
      await new Promise(resolve => setTimeout(resolve, 4000));

      // Verify all registered with correct data
      const registered = db.prepare(
        `SELECT * FROM agent_pages WHERE id IN (${pageIds.map(() => '?').join(',')})`
      ).all(...pageIds);

      expect(registered.length).toBe(20);

      // Verify content integrity
      registered.forEach((record, index) => {
        expect(record.content_value).toContain(`Rapid Test ${index}`);
      });

      console.log('✅ All 20 rapid writes processed with data integrity');

      // Clean up
      files.forEach(file => {
        if (fs.existsSync(file)) {
          fs.unlinkSync(file);
        }
      });
    }, 25000);
  });

  describe('Memory Stability Over 100+ Registrations', () => {
    it('should maintain stable memory usage over 100 registrations', async () => {
      const initialMemory = process.memoryUsage().heapUsed;
      const pageIds = [];
      const files = [];

      console.log(`📊 Initial memory: ${(initialMemory / 1024 / 1024).toFixed(2)} MB`);

      // Create 100 pages in batches
      const batchSize = 20;
      const totalPages = 100;

      for (let batch = 0; batch < totalPages / batchSize; batch++) {
        // Create batch
        for (let i = 0; i < batchSize; i++) {
          const index = batch * batchSize + i;
          const pageId = `${TEST_PREFIX}-${Date.now()}-mem-${index}`;
          pageIds.push(pageId);
          testPageIds.push(pageId);

          const pageData = {
            id: pageId,
            agent_id: 'memory-test-agent',
            title: `Memory Test Page ${index}`,
            content_type: 'markdown',
            content_value: `# Memory Test ${index}\n\n${'Content '.repeat(100)}`,
            status: 'published'
          };

          const filePath = path.join(AGENT_PAGES_DIR, `${pageId}.json`);
          files.push(filePath);
          fs.writeFileSync(filePath, JSON.stringify(pageData, null, 2));
        }

        console.log(`📄 Created batch ${batch + 1}/${totalPages / batchSize}`);

        // Wait for batch to process
        await new Promise(resolve => setTimeout(resolve, 2000));

        // Check memory after each batch
        const currentMemory = process.memoryUsage().heapUsed;
        const memoryIncrease = currentMemory - initialMemory;
        console.log(`   Memory: ${(currentMemory / 1024 / 1024).toFixed(2)} MB (+${(memoryIncrease / 1024 / 1024).toFixed(2)} MB)`);
      }

      // Final verification
      const registered = db.prepare(
        `SELECT COUNT(*) as count FROM agent_pages WHERE id LIKE ?`
      ).get(`${TEST_PREFIX}-%-mem-%`);

      // Allow for some existing pages from previous test runs
      expect(registered.count).toBeGreaterThanOrEqual(100);
      console.log(`✅ At least 100 pages registered successfully (found ${registered.count})`);

      // Check final memory
      if (global.gc) {
        global.gc();
      }

      const finalMemory = process.memoryUsage().heapUsed;
      const totalMemoryIncrease = finalMemory - initialMemory;

      console.log(`📊 Final memory: ${(finalMemory / 1024 / 1024).toFixed(2)} MB`);
      console.log(`📊 Total increase: ${(totalMemoryIncrease / 1024 / 1024).toFixed(2)} MB`);

      // Memory increase should be reasonable (< 100MB for 100 pages)
      expect(totalMemoryIncrease).toBeLessThan(100 * 1024 * 1024);
      console.log('✅ Memory usage is stable');

      // Clean up files
      files.forEach(file => {
        if (fs.existsSync(file)) {
          fs.unlinkSync(file);
        }
      });
    }, 60000);

    it('should handle database query performance with large dataset', async () => {
      // This test verifies query performance doesn't degrade
      const startTime = Date.now();

      // Query all test pages
      const results = db.prepare(
        'SELECT * FROM agent_pages WHERE id LIKE ?'
      ).all(`${TEST_PREFIX}%`);

      const queryTime = Date.now() - startTime;

      console.log(`📊 Query returned ${results.length} records in ${queryTime}ms`);

      // Query should be fast even with many records
      expect(queryTime).toBeLessThan(1000); // Less than 1 second
      console.log('✅ Database query performance is good');
    }, 10000);
  });

  describe('Error Handling and Edge Cases', () => {
    it('should gracefully handle invalid JSON files', async () => {
      const pageId = `${TEST_PREFIX}-${Date.now()}-invalid`;
      const filePath = path.join(AGENT_PAGES_DIR, `${pageId}.json`);

      // Write invalid JSON
      fs.writeFileSync(filePath, '{ invalid json here }');

      await new Promise(resolve => setTimeout(resolve, 1500));

      // Should NOT be registered
      const dbRecord = db.prepare('SELECT * FROM agent_pages WHERE id = ?').get(pageId);
      expect(dbRecord).toBeUndefined();
      console.log('✅ Invalid JSON handled gracefully');

      if (fs.existsSync(filePath)) {
        fs.unlinkSync(filePath);
      }
    }, 10000);

    it('should skip files missing required fields', async () => {
      const pageId = `${TEST_PREFIX}-${Date.now()}-missing-fields`;
      const filePath = path.join(AGENT_PAGES_DIR, `${pageId}.json`);

      // Missing required field (title)
      const invalidData = {
        id: pageId,
        agent_id: 'test-agent'
        // Missing title
      };

      fs.writeFileSync(filePath, JSON.stringify(invalidData, null, 2));

      await new Promise(resolve => setTimeout(resolve, 1500));

      const dbRecord = db.prepare('SELECT * FROM agent_pages WHERE id = ?').get(pageId);
      expect(dbRecord).toBeUndefined();
      console.log('✅ Missing required fields handled gracefully');

      if (fs.existsSync(filePath)) {
        fs.unlinkSync(filePath);
      }
    }, 10000);

    it('should only process .json files and ignore others', async () => {
      const testId = `${TEST_PREFIX}-${Date.now()}`;
      const txtPath = path.join(AGENT_PAGES_DIR, `${testId}.txt`);
      const mdPath = path.join(AGENT_PAGES_DIR, `${testId}.md`);

      // Create non-JSON files
      fs.writeFileSync(txtPath, 'This is a text file');
      fs.writeFileSync(mdPath, '# Markdown file');

      await new Promise(resolve => setTimeout(resolve, 1500));

      // Verify nothing was registered
      const records = db.prepare(
        'SELECT * FROM agent_pages WHERE id LIKE ?'
      ).all(`%${testId}%`);

      expect(records.length).toBe(0);
      console.log('✅ Non-JSON files ignored correctly');

      // Clean up
      if (fs.existsSync(txtPath)) fs.unlinkSync(txtPath);
      if (fs.existsSync(mdPath)) fs.unlinkSync(mdPath);
    }, 10000);

    it('should update existing pages with INSERT OR REPLACE', async () => {
      const pageId = `${TEST_PREFIX}-${Date.now()}-update`;
      testPageIds.push(pageId);

      // Create initial version
      const initialData = {
        id: pageId,
        agent_id: 'update-test-agent',
        title: 'Initial Title',
        content_type: 'text',
        content_value: 'Initial content',
        status: 'draft',
        version: 1
      };

      const filePath = path.join(AGENT_PAGES_DIR, `${pageId}.json`);
      fs.writeFileSync(filePath, JSON.stringify(initialData, null, 2));

      await new Promise(resolve => setTimeout(resolve, 1500));

      // Verify initial
      let dbRecord = db.prepare('SELECT * FROM agent_pages WHERE id = ?').get(pageId);
      expect(dbRecord.title).toBe('Initial Title');
      expect(dbRecord.status).toBe('draft');

      // Delete and recreate the file to trigger watcher
      fs.unlinkSync(filePath);
      await new Promise(resolve => setTimeout(resolve, 500));

      // Update the file
      const updatedData = {
        ...initialData,
        title: 'Updated Title',
        content_value: 'Updated content',
        status: 'published',
        version: 2
      };

      fs.writeFileSync(filePath, JSON.stringify(updatedData, null, 2));

      await new Promise(resolve => setTimeout(resolve, 2000));

      // Verify update
      dbRecord = db.prepare('SELECT * FROM agent_pages WHERE id = ?').get(pageId);
      expect(dbRecord.title).toBe('Updated Title');
      expect(dbRecord.content_value).toBe('Updated content');
      expect(dbRecord.status).toBe('published');
      expect(dbRecord.version).toBe(2);
      console.log('✅ Page updated successfully with INSERT OR REPLACE');

      if (fs.existsSync(filePath)) {
        fs.unlinkSync(filePath);
      }
    }, 15000);
  });
});
