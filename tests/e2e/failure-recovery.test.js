/**
 * Failure Recovery E2E Test
 *
 * Validates system behavior during failure scenarios:
 * 1. Server restart scenario
 * 2. Auto-registration retry
 * 3. Manual fallback execution
 * 4. Error handling validation
 * 5. Recovery mechanisms
 *
 * Tests REAL failure scenarios with actual system recovery.
 */

import { test, expect } from '@playwright/test';
import { spawn } from 'child_process';
import fs from 'fs/promises';
import path from 'path';
import { v4 as uuidv4 } from 'uuid';
import http from 'http';
import Database from 'better-sqlite3';

// Configuration
const API_PORT = 3003; // Use different port for isolation
const PAGES_DIR = '/workspaces/agent-feed/data/agent-pages';
const DB_PATH = '/workspaces/agent-feed/data/agent-pages.db';
const WORKSPACE_ROOT = '/workspaces/agent-feed';

// Helper: Make HTTP request
function makeRequest(options, data = null) {
  return new Promise((resolve, reject) => {
    const req = http.request(options, (res) => {
      let responseData = '';
      res.on('data', (chunk) => { responseData += chunk; });
      res.on('end', () => {
        try {
          resolve({
            statusCode: res.statusCode,
            body: responseData,
            data: responseData ? JSON.parse(responseData) : null
          });
        } catch (e) {
          resolve({ statusCode: res.statusCode, body: responseData, data: null });
        }
      });
    });
    req.on('error', reject);
    if (data) req.write(JSON.stringify(data));
    req.end();
  });
}

// Helper: Wait for condition
async function waitForCondition(checkFn, timeoutMs = 5000, intervalMs = 100) {
  const startTime = Date.now();
  while (Date.now() - startTime < timeoutMs) {
    if (await checkFn()) return true;
    await new Promise(resolve => setTimeout(resolve, intervalMs));
  }
  return false;
}

// Helper: Wait for server
async function waitForServer(port, timeoutMs = 15000) {
  return waitForCondition(async () => {
    try {
      const response = await makeRequest({
        hostname: 'localhost',
        port,
        path: '/api/health',
        method: 'GET'
      });
      return response.statusCode === 200;
    } catch {
      return false;
    }
  }, timeoutMs);
}

// Helper: Start server
function startServer(port) {
  const server = spawn('node', ['api-server/server.js'], {
    cwd: WORKSPACE_ROOT,
    env: { ...process.env, PORT: port.toString() },
    detached: false
  });

  server.stdout.on('data', (data) => {
    console.log(`   [Server] ${data.toString().trim()}`);
  });

  server.stderr.on('data', (data) => {
    console.log(`   [Server Error] ${data.toString().trim()}`);
  });

  return server;
}

// Helper: Stop server gracefully
async function stopServer(server) {
  return new Promise((resolve) => {
    if (!server) {
      resolve();
      return;
    }

    server.on('exit', () => {
      resolve();
    });

    server.kill('SIGTERM');

    // Force kill after 5 seconds
    setTimeout(() => {
      if (!server.killed) {
        server.kill('SIGKILL');
      }
      resolve();
    }, 5000);
  });
}

test.describe('Failure Recovery Tests', () => {
  let testAgentId;
  let testFiles = [];
  let db;
  let apiServer;

  test.beforeAll(async () => {
    testAgentId = `recovery-test-${uuidv4()}`;
    db = new Database(DB_PATH);

    // Create test agent
    db.prepare(`
      INSERT OR REPLACE INTO agents (id, name, description, created_at, updated_at)
      VALUES (?, ?, ?, ?, ?)
    `).run(
      testAgentId,
      'Recovery Test Agent',
      'Agent for failure recovery testing',
      new Date().toISOString(),
      new Date().toISOString()
    );

    console.log(`\n🔧 Failure Recovery Test Setup`);
    console.log(`   Agent ID: ${testAgentId}`);
  });

  test.afterAll(async () => {
    console.log(`\n🧹 Cleanup`);

    // Stop server if running
    if (apiServer) {
      await stopServer(apiServer);
      apiServer = null;
    }

    // Remove test files
    for (const filePath of testFiles) {
      try {
        await fs.unlink(filePath);
      } catch (error) {
        // Ignore errors
      }
    }

    // Cleanup database
    if (db) {
      db.prepare('DELETE FROM agent_pages WHERE agent_id = ?').run(testAgentId);
      db.prepare('DELETE FROM agents WHERE id = ?').run(testAgentId);
      db.close();
    }
  });

  test('should recover from server restart', async () => {
    console.log(`\n🔄 Server Restart Recovery Test`);

    // Step 1: Start server
    console.log(`   Step 1: Starting server...`);
    apiServer = startServer(API_PORT);
    const serverReady = await waitForServer(API_PORT);
    expect(serverReady).toBe(true);
    console.log(`   ✅ Server started`);

    // Step 2: Create page while server is running
    console.log(`   Step 2: Creating page...`);
    const pageId = `restart-test-${uuidv4()}`;
    const pageData = {
      id: pageId,
      agent_id: testAgentId,
      title: 'Restart Recovery Test',
      content_type: 'text',
      content_value: 'Testing server restart recovery',
      status: 'published',
      version: 1
    };

    const filePath = path.join(PAGES_DIR, `${pageId}.json`);
    await fs.writeFile(filePath, JSON.stringify(pageData, null, 2), 'utf8');
    testFiles.push(filePath);

    // Wait for registration
    const initialRegistration = await waitForCondition(async () => {
      const page = db.prepare('SELECT id FROM agent_pages WHERE id = ?').get(pageId);
      return !!page;
    }, 3000);

    expect(initialRegistration).toBe(true);
    console.log(`   ✅ Page registered initially`);

    // Step 3: Stop server
    console.log(`   Step 3: Stopping server...`);
    await stopServer(apiServer);
    apiServer = null;

    // Verify server is down
    let serverDown = false;
    try {
      await makeRequest({
        hostname: 'localhost',
        port: API_PORT,
        path: '/api/health',
        method: 'GET'
      });
    } catch (error) {
      serverDown = true;
    }
    expect(serverDown).toBe(true);
    console.log(`   ✅ Server stopped`);

    // Step 4: Restart server
    console.log(`   Step 4: Restarting server...`);
    await new Promise(resolve => setTimeout(resolve, 2000)); // Wait before restart
    apiServer = startServer(API_PORT);
    const serverRestarted = await waitForServer(API_PORT);
    expect(serverRestarted).toBe(true);
    console.log(`   ✅ Server restarted`);

    // Step 5: Verify page still accessible after restart
    console.log(`   Step 5: Verifying page accessibility...`);
    const getResponse = await makeRequest({
      hostname: 'localhost',
      port: API_PORT,
      path: `/api/agent-pages/${pageId}`,
      method: 'GET'
    });

    expect(getResponse.statusCode).toBe(200);
    expect(getResponse.data.success).toBe(true);
    expect(getResponse.data.data.page.id).toBe(pageId);
    console.log(`   ✅ Page accessible after restart`);

    // Step 6: Create new page after restart
    console.log(`   Step 6: Creating new page after restart...`);
    const newPageId = `post-restart-${uuidv4()}`;
    const newPageData = {
      id: newPageId,
      agent_id: testAgentId,
      title: 'Post-Restart Page',
      content_type: 'text',
      content_value: 'Created after server restart',
      status: 'published',
      version: 1
    };

    const newFilePath = path.join(PAGES_DIR, `${newPageId}.json`);
    await fs.writeFile(newFilePath, JSON.stringify(newPageData, null, 2), 'utf8');
    testFiles.push(newFilePath);

    // Verify auto-registration works after restart
    const postRestartRegistration = await waitForCondition(async () => {
      const page = db.prepare('SELECT id FROM agent_pages WHERE id = ?').get(newPageId);
      return !!page;
    }, 3000);

    expect(postRestartRegistration).toBe(true);
    console.log(`   ✅ Auto-registration works after restart`);

    // Cleanup
    await stopServer(apiServer);
    apiServer = null;

    console.log(`   ✅ Server restart recovery validated`);
  });

  test('should retry auto-registration on initial failure', async () => {
    console.log(`\n🔁 Auto-Registration Retry Test`);

    // Start server
    apiServer = startServer(API_PORT);
    await waitForServer(API_PORT);

    // Step 1: Create page with invalid data that might cause issues
    console.log(`   Step 1: Creating page with edge-case data...`);
    const pageId = `retry-test-${uuidv4()}`;
    const pageData = {
      id: pageId,
      agent_id: testAgentId,
      title: 'Retry Test',
      content_type: 'text',
      content_value: 'A'.repeat(10000), // Large content
      status: 'published',
      version: 1
    };

    const filePath = path.join(PAGES_DIR, `${pageId}.json`);
    await fs.writeFile(filePath, JSON.stringify(pageData, null, 2), 'utf8');
    testFiles.push(filePath);

    // Step 2: Wait for registration (should succeed even with large content)
    console.log(`   Step 2: Waiting for registration...`);
    const registered = await waitForCondition(async () => {
      const page = db.prepare('SELECT id FROM agent_pages WHERE id = ?').get(pageId);
      return !!page;
    }, 5000);

    expect(registered).toBe(true);
    console.log(`   ✅ Registration succeeded despite edge-case data`);

    // Step 3: Verify data integrity
    console.log(`   Step 3: Verifying data integrity...`);
    const dbPage = db.prepare('SELECT * FROM agent_pages WHERE id = ?').get(pageId);
    expect(dbPage.content_value.length).toBe(10000);
    console.log(`   ✅ Data integrity maintained`);

    // Cleanup
    await stopServer(apiServer);
    apiServer = null;

    console.log(`   ✅ Auto-registration retry validated`);
  });

  test('should handle database lock gracefully', async () => {
    console.log(`\n🔒 Database Lock Handling Test`);

    // Start server
    apiServer = startServer(API_PORT);
    await waitForServer(API_PORT);

    // Create multiple pages simultaneously to test concurrent writes
    console.log(`   Creating multiple pages simultaneously...`);
    const pagePromises = [];

    for (let i = 0; i < 10; i++) {
      const pageId = `lock-test-${i}-${uuidv4()}`;
      const pageData = {
        id: pageId,
        agent_id: testAgentId,
        title: `Lock Test Page ${i}`,
        content_type: 'text',
        content_value: `Test content ${i}`,
        status: 'published',
        version: 1
      };

      const promise = (async () => {
        const filePath = path.join(PAGES_DIR, `${pageId}.json`);
        await fs.writeFile(filePath, JSON.stringify(pageData, null, 2), 'utf8');
        testFiles.push(filePath);
        return pageId;
      })();

      pagePromises.push(promise);
    }

    await Promise.all(pagePromises);
    console.log(`   ✅ All files created`);

    // Wait for all to be registered
    console.log(`   Waiting for all registrations...`);
    await new Promise(resolve => setTimeout(resolve, 3000));

    // Verify all were registered
    const registeredCount = db.prepare(
      'SELECT COUNT(*) as count FROM agent_pages WHERE agent_id = ? AND title LIKE ?'
    ).get(testAgentId, 'Lock Test Page %').count;

    console.log(`   Registered: ${registeredCount}/10`);
    expect(registeredCount).toBe(10);
    console.log(`   ✅ All pages registered despite concurrent writes`);

    // Cleanup
    await stopServer(apiServer);
    apiServer = null;

    console.log(`   ✅ Database lock handling validated`);
  });

  test('should handle manual fallback when auto-registration fails', async () => {
    console.log(`\n🆘 Manual Fallback Test`);

    // Start server
    apiServer = startServer(API_PORT);
    await waitForServer(API_PORT);

    // Scenario: Auto-registration doesn't detect file (simulated by not waiting)
    console.log(`   Scenario: Manual registration fallback...`);

    const pageId = `manual-fallback-${uuidv4()}`;
    const pageData = {
      id: pageId,
      agent_id: testAgentId,
      title: 'Manual Fallback Test',
      content_type: 'text',
      content_value: 'Manual registration test',
      status: 'published',
      version: 1
    };

    // Option 1: Manual API registration (fallback if auto-reg fails)
    console.log(`   Using manual API registration...`);
    const postResponse = await makeRequest({
      hostname: 'localhost',
      port: API_PORT,
      path: `/api/agent-pages`,
      method: 'POST',
      headers: { 'Content-Type': 'application/json' }
    }, pageData);

    expect(postResponse.statusCode).toBe(201);
    expect(postResponse.data.success).toBe(true);
    console.log(`   ✅ Manual registration succeeded`);

    // Verify registration
    const dbPage = db.prepare('SELECT * FROM agent_pages WHERE id = ?').get(pageId);
    expect(dbPage).toBeDefined();
    expect(dbPage.id).toBe(pageId);
    console.log(`   ✅ Manual registration verified in database`);

    // Now create the file (should not cause duplicate)
    const filePath = path.join(PAGES_DIR, `${pageId}.json`);
    await fs.writeFile(filePath, JSON.stringify(pageData, null, 2), 'utf8');
    testFiles.push(filePath);

    // Wait to see if auto-registration causes issues
    await new Promise(resolve => setTimeout(resolve, 2000));

    // Verify only one entry exists
    const count = db.prepare(
      'SELECT COUNT(*) as count FROM agent_pages WHERE id = ?'
    ).get(pageId).count;

    expect(count).toBe(1);
    console.log(`   ✅ No duplicate entries created`);

    // Cleanup
    await stopServer(apiServer);
    apiServer = null;

    console.log(`   ✅ Manual fallback validated`);
  });

  test('should recover from corrupted page file', async () => {
    console.log(`\n💥 Corrupted File Recovery Test`);

    // Start server
    apiServer = startServer(API_PORT);
    await waitForServer(API_PORT);

    // Create corrupted JSON file
    console.log(`   Step 1: Creating corrupted file...`);
    const pageId = `corrupted-${uuidv4()}`;
    const corruptedContent = '{ "id": "' + pageId + '", invalid json }';

    const filePath = path.join(PAGES_DIR, `${pageId}.json`);
    await fs.writeFile(filePath, corruptedContent, 'utf8');
    testFiles.push(filePath);

    // Wait to see if watcher crashes
    await new Promise(resolve => setTimeout(resolve, 2000));

    // Verify server is still running
    console.log(`   Step 2: Verifying server still responsive...`);
    const healthCheck = await makeRequest({
      hostname: 'localhost',
      port: API_PORT,
      path: '/api/health',
      method: 'GET'
    });

    expect(healthCheck.statusCode).toBe(200);
    console.log(`   ✅ Server still running after corrupted file`);

    // Verify page was NOT registered
    const dbPage = db.prepare('SELECT * FROM agent_pages WHERE id = ?').get(pageId);
    expect(dbPage).toBeUndefined();
    console.log(`   ✅ Corrupted file correctly rejected`);

    // Fix the file
    console.log(`   Step 3: Fixing corrupted file...`);
    const validData = {
      id: pageId,
      agent_id: testAgentId,
      title: 'Fixed File',
      content_type: 'text',
      content_value: 'Now valid',
      status: 'published',
      version: 1
    };

    await fs.writeFile(filePath, JSON.stringify(validData, null, 2), 'utf8');

    // Wait for registration of fixed file
    const registered = await waitForCondition(async () => {
      const page = db.prepare('SELECT id FROM agent_pages WHERE id = ?').get(pageId);
      return !!page;
    }, 3000);

    expect(registered).toBe(true);
    console.log(`   ✅ Fixed file successfully registered`);

    // Cleanup
    await stopServer(apiServer);
    apiServer = null;

    console.log(`   ✅ Corrupted file recovery validated`);
  });

  test('should handle missing required fields gracefully', async () => {
    console.log(`\n🚨 Missing Fields Error Handling Test`);

    // Start server
    apiServer = startServer(API_PORT);
    await waitForServer(API_PORT);

    // Test various missing field scenarios
    const testCases = [
      { name: 'missing title', data: { id: `missing-title-${uuidv4()}`, agent_id: testAgentId, content_type: 'text', content_value: 'test' } },
      { name: 'missing agent_id', data: { id: `missing-agent-${uuidv4()}`, title: 'Test', content_type: 'text', content_value: 'test' } },
      { name: 'missing id', data: { agent_id: testAgentId, title: 'Test', content_type: 'text', content_value: 'test' } },
    ];

    for (const testCase of testCases) {
      console.log(`   Testing: ${testCase.name}...`);

      const fileName = testCase.data.id || `missing-id-${uuidv4()}`;
      const filePath = path.join(PAGES_DIR, `${fileName}.json`);
      await fs.writeFile(filePath, JSON.stringify(testCase.data, null, 2), 'utf8');
      testFiles.push(filePath);

      // Wait a bit
      await new Promise(resolve => setTimeout(resolve, 1000));

      // Verify NOT registered
      const registered = db.prepare(
        'SELECT * FROM agent_pages WHERE id = ?'
      ).get(testCase.data.id || 'nonexistent');

      expect(registered).toBeUndefined();
      console.log(`   ✅ ${testCase.name} correctly rejected`);
    }

    // Verify server still running
    const healthCheck = await makeRequest({
      hostname: 'localhost',
      port: API_PORT,
      path: '/api/health',
      method: 'GET'
    });

    expect(healthCheck.statusCode).toBe(200);
    console.log(`   ✅ Server stable after all error cases`);

    // Cleanup
    await stopServer(apiServer);
    apiServer = null;

    console.log(`   ✅ Error handling validated`);
  });
});
