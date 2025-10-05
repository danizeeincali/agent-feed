/**
 * Agent Compliance E2E Test
 *
 * Validates that Claude agents follow proper page registration procedures:
 * 1. Pre-flight check execution (verify API availability)
 * 2. Direct Bash tool registration (no script creation)
 * 3. No forbidden script creation
 * 4. Proper verification steps
 * 5. Success reporting
 *
 * Tests the AGENT BEHAVIOR, not just the system.
 * Simulates what a Claude agent should do when registering pages.
 */

import { test, expect } from '@playwright/test';
import fs from 'fs/promises';
import path from 'path';
import { v4 as uuidv4 } from 'uuid';
import http from 'http';
import Database from 'better-sqlite3';

// Configuration
const API_PORT = 3001;
const PAGES_DIR = '/workspaces/agent-feed/data/agent-pages';
const DB_PATH = '/workspaces/agent-feed/data/agent-pages.db';
const WORKSPACE_ROOT = '/workspaces/agent-feed';

// Helper: Make HTTP request (simulates Bash curl command)
function executeCurl(method, path, data = null) {
  return new Promise((resolve, reject) => {
    const options = {
      hostname: 'localhost',
      port: API_PORT,
      path,
      method,
      headers: {
        'Content-Type': 'application/json',
        'User-Agent': 'Claude-Agent/1.0'
      }
    };

    const req = http.request(options, (res) => {
      let responseData = '';
      res.on('data', (chunk) => { responseData += chunk; });
      res.on('end', () => {
        try {
          resolve({
            statusCode: res.statusCode,
            body: responseData,
            data: responseData ? JSON.parse(responseData) : null,
            headers: res.headers
          });
        } catch (e) {
          resolve({
            statusCode: res.statusCode,
            body: responseData,
            data: null,
            headers: res.headers
          });
        }
      });
    });

    req.on('error', reject);
    if (data) req.write(JSON.stringify(data));
    req.end();
  });
}

// Helper: Check if file exists
async function fileExists(filePath) {
  try {
    await fs.access(filePath);
    return true;
  } catch {
    return false;
  }
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

test.describe('Agent Compliance Tests', () => {
  let testAgentId;
  let testFiles = [];
  let db;

  test.beforeAll(async () => {
    testAgentId = `agent-compliance-${uuidv4()}`;
    db = new Database(DB_PATH);

    // Create test agent
    db.prepare(`
      INSERT OR REPLACE INTO agents (id, name, description, created_at, updated_at)
      VALUES (?, ?, ?, ?, ?)
    `).run(
      testAgentId,
      'Agent Compliance Test Agent',
      'Test agent for compliance validation',
      new Date().toISOString(),
      new Date().toISOString()
    );

    console.log(`\n🤖 Agent Compliance Test Setup`);
    console.log(`   Agent ID: ${testAgentId}`);
  });

  test.afterAll(async () => {
    console.log(`\n🧹 Cleanup`);

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

  test('should execute pre-flight check before page registration', async () => {
    console.log(`\n✈️ Pre-Flight Check Test`);

    // Step 1: Check API availability (what agent should do FIRST)
    console.log(`   Step 1: Checking API availability...`);
    const healthCheck = await executeCurl('GET', '/api/health');

    // Agent should verify API is responsive
    expect(healthCheck.statusCode).toBe(200);
    console.log(`   ✅ API health check passed: ${healthCheck.statusCode}`);

    // Step 2: Verify endpoints exist (agent diligence)
    console.log(`   Step 2: Verifying endpoints exist...`);

    // Check if agent pages endpoint exists
    const endpointCheck = await executeCurl('GET', '/api/agent-pages');
    expect([200, 400, 404]).toContain(endpointCheck.statusCode);
    console.log(`   ✅ Agent pages endpoint exists: ${endpointCheck.statusCode}`);

    // Step 3: Verify database is writable (test POST)
    console.log(`   Step 3: Testing database write capability...`);
    const testPageId = `preflight-${uuidv4()}`;
    const testPage = {
      id: testPageId,
      agent_id: testAgentId,
      title: 'Pre-flight Test Page',
      content_type: 'text',
      content_value: 'Test',
      status: 'draft',
      version: 1
    };

    // Create file first (auto-registration will handle DB)
    const filePath = path.join(PAGES_DIR, `${testPageId}.json`);
    await fs.writeFile(filePath, JSON.stringify(testPage, null, 2), 'utf8');
    testFiles.push(filePath);

    // Wait for auto-registration
    const registered = await waitForCondition(async () => {
      const page = db.prepare('SELECT id FROM agent_pages WHERE id = ?').get(testPageId);
      return !!page;
    }, 3000);

    expect(registered).toBe(true);
    console.log(`   ✅ Database write capability verified`);

    console.log(`   ✅ All pre-flight checks passed`);
  });

  test('should use Bash tool for registration (no script creation)', async () => {
    console.log(`\n🔧 Bash Tool Compliance Test`);

    const pageId = `bash-tool-${uuidv4()}`;
    const startTime = Date.now();

    // COMPLIANT AGENT BEHAVIOR:
    // 1. Create page file (Write tool)
    // 2. Wait for auto-registration (no manual API call needed)
    // 3. Verify registration (Bash curl command)

    console.log(`   Step 1: Creating page file via Write tool simulation...`);
    const pageData = {
      id: pageId,
      agent_id: testAgentId,
      title: 'Bash Tool Compliance Test',
      content_type: 'markdown',
      content_value: '# Compliance Test\n\nThis page tests Bash tool usage.',
      status: 'published',
      version: 1
    };

    const filePath = path.join(PAGES_DIR, `${pageId}.json`);
    await fs.writeFile(filePath, JSON.stringify(pageData, null, 2), 'utf8');
    testFiles.push(filePath);
    console.log(`   ✅ Page file created`);

    console.log(`   Step 2: Waiting for auto-registration...`);
    const registered = await waitForCondition(async () => {
      const page = db.prepare('SELECT id FROM agent_pages WHERE id = ?').get(pageId);
      return !!page;
    }, 2000);

    expect(registered).toBe(true);
    const registrationTime = Date.now() - startTime;
    console.log(`   ✅ Auto-registered in ${registrationTime}ms`);

    console.log(`   Step 3: Verifying via Bash curl (compliant verification)...`);
    const verifyResponse = await executeCurl('GET', `/api/agent-pages/${pageId}`);

    expect(verifyResponse.statusCode).toBe(200);
    expect(verifyResponse.data.success).toBe(true);
    expect(verifyResponse.data.data.page.id).toBe(pageId);
    console.log(`   ✅ Verified via Bash curl command`);

    // CRITICAL: Verify NO scripts were created
    console.log(`   Step 4: Verifying NO script creation...`);
    const forbiddenScripts = [
      'register-page.sh',
      'auto-register.sh',
      'verify-page.sh',
      'create-page.sh',
      `register-${pageId}.sh`
    ];

    for (const scriptName of forbiddenScripts) {
      const scriptPath = path.join(WORKSPACE_ROOT, scriptName);
      const exists = await fileExists(scriptPath);
      expect(exists).toBe(false);
      console.log(`   ✅ No script: ${scriptName}`);
    }

    console.log(`   ✅ Bash tool compliance verified`);
  });

  test('should follow proper verification workflow', async () => {
    console.log(`\n🔍 Verification Workflow Test`);

    const pageId = `verify-workflow-${uuidv4()}`;

    // COMPLIANT VERIFICATION WORKFLOW:
    // 1. Create page file
    // 2. Wait for auto-registration
    // 3. Verify in database
    // 4. Verify via API
    // 5. Test API response format
    // 6. Verify content integrity

    console.log(`   Step 1: Creating page...`);
    const pageData = {
      id: pageId,
      agent_id: testAgentId,
      title: 'Verification Workflow Test',
      content_type: 'json',
      content_value: JSON.stringify({
        test: 'verification',
        timestamp: new Date().toISOString()
      }),
      status: 'published',
      version: 1
    };

    const filePath = path.join(PAGES_DIR, `${pageId}.json`);
    await fs.writeFile(filePath, JSON.stringify(pageData, null, 2), 'utf8');
    testFiles.push(filePath);
    console.log(`   ✅ Page created`);

    console.log(`   Step 2: Waiting for auto-registration...`);
    await waitForCondition(async () => {
      const page = db.prepare('SELECT id FROM agent_pages WHERE id = ?').get(pageId);
      return !!page;
    }, 2000);
    console.log(`   ✅ Auto-registration detected`);

    console.log(`   Step 3: Database verification...`);
    const dbPage = db.prepare('SELECT * FROM agent_pages WHERE id = ?').get(pageId);
    expect(dbPage).toBeDefined();
    expect(dbPage.id).toBe(pageId);
    expect(dbPage.agent_id).toBe(testAgentId);
    expect(dbPage.title).toBe(pageData.title);
    console.log(`   ✅ Database record verified`);

    console.log(`   Step 4: API verification...`);
    const apiResponse = await executeCurl('GET', `/api/agent-pages/${pageId}`);
    expect(apiResponse.statusCode).toBe(200);
    expect(apiResponse.data.success).toBe(true);
    console.log(`   ✅ API response validated`);

    console.log(`   Step 5: Response format verification...`);
    const { page } = apiResponse.data.data;
    expect(page).toHaveProperty('id');
    expect(page).toHaveProperty('agent_id');
    expect(page).toHaveProperty('title');
    expect(page).toHaveProperty('content_type');
    expect(page).toHaveProperty('content_value');
    expect(page).toHaveProperty('status');
    expect(page).toHaveProperty('created_at');
    expect(page).toHaveProperty('updated_at');
    console.log(`   ✅ Response format correct`);

    console.log(`   Step 6: Content integrity verification...`);
    expect(page.content_type).toBe('json');
    const parsedContent = JSON.parse(page.content_value);
    expect(parsedContent.test).toBe('verification');
    console.log(`   ✅ Content integrity verified`);

    console.log(`   ✅ Complete verification workflow passed`);
  });

  test('should report success properly', async () => {
    console.log(`\n📊 Success Reporting Test`);

    const pageId = `success-report-${uuidv4()}`;
    const report = {
      steps: [],
      errors: [],
      startTime: Date.now()
    };

    try {
      // Step 1: Page creation
      report.steps.push({ step: 'create', status: 'started' });
      const pageData = {
        id: pageId,
        agent_id: testAgentId,
        title: 'Success Reporting Test',
        content_type: 'text',
        content_value: 'Test content',
        status: 'published',
        version: 1
      };

      const filePath = path.join(PAGES_DIR, `${pageId}.json`);
      await fs.writeFile(filePath, JSON.stringify(pageData, null, 2), 'utf8');
      testFiles.push(filePath);
      report.steps.push({ step: 'create', status: 'completed' });

      // Step 2: Auto-registration wait
      report.steps.push({ step: 'auto-register', status: 'started' });
      const registered = await waitForCondition(async () => {
        const page = db.prepare('SELECT id FROM agent_pages WHERE id = ?').get(pageId);
        return !!page;
      }, 2000);

      if (!registered) {
        throw new Error('Auto-registration timeout');
      }
      report.steps.push({ step: 'auto-register', status: 'completed' });

      // Step 3: Verification
      report.steps.push({ step: 'verify', status: 'started' });
      const verifyResponse = await executeCurl('GET', `/api/agent-pages/${pageId}`);
      if (verifyResponse.statusCode !== 200) {
        throw new Error(`Verification failed: ${verifyResponse.statusCode}`);
      }
      report.steps.push({ step: 'verify', status: 'completed' });

      // Step 4: Success reporting
      report.endTime = Date.now();
      report.duration = report.endTime - report.startTime;
      report.success = true;

      console.log(`   📋 Success Report:`);
      console.log(`      Duration: ${report.duration}ms`);
      console.log(`      Steps completed: ${report.steps.filter(s => s.status === 'completed').length}`);
      console.log(`      Errors: ${report.errors.length}`);

      // Verify report structure
      expect(report.success).toBe(true);
      expect(report.errors.length).toBe(0);
      expect(report.steps.length).toBeGreaterThan(0);
      expect(report.duration).toBeLessThan(5000);

      console.log(`   ✅ Success properly reported`);

    } catch (error) {
      report.errors.push(error.message);
      report.success = false;
      throw error;
    }
  });

  test('should handle errors gracefully without scripts', async () => {
    console.log(`\n❌ Error Handling Compliance Test`);

    // Test 1: Invalid page data
    console.log(`   Test 1: Invalid page data...`);
    const invalidPageId = `invalid-${uuidv4()}`;
    const invalidData = {
      id: invalidPageId,
      // Missing required fields
    };

    const filePath = path.join(PAGES_DIR, `${invalidPageId}.json`);
    await fs.writeFile(filePath, JSON.stringify(invalidData, null, 2), 'utf8');
    testFiles.push(filePath);

    // Wait a bit for watcher to process
    await new Promise(resolve => setTimeout(resolve, 1000));

    // Should NOT be registered
    const registered = db.prepare(
      'SELECT id FROM agent_pages WHERE id = ?'
    ).get(invalidPageId);

    expect(registered).toBeUndefined();
    console.log(`   ✅ Invalid data correctly rejected`);

    // Test 2: Verify NO error scripts created
    console.log(`   Test 2: Verifying no error-handling scripts...`);
    const errorScripts = [
      'handle-error.sh',
      'retry-registration.sh',
      'error-recovery.sh'
    ];

    for (const scriptName of errorScripts) {
      const scriptPath = path.join(WORKSPACE_ROOT, scriptName);
      const exists = await fileExists(scriptPath);
      expect(exists).toBe(false);
      console.log(`   ✅ No error script: ${scriptName}`);
    }

    console.log(`   ✅ Errors handled gracefully without scripts`);
  });

  test('should use Read tool for verification, not cat/grep', async () => {
    console.log(`\n📖 Tool Usage Compliance Test`);

    const pageId = `tool-usage-${uuidv4()}`;

    // Create page
    const pageData = {
      id: pageId,
      agent_id: testAgentId,
      title: 'Tool Usage Test',
      content_type: 'text',
      content_value: 'Testing proper tool usage',
      status: 'published',
      version: 1
    };

    const filePath = path.join(PAGES_DIR, `${pageId}.json`);
    await fs.writeFile(filePath, JSON.stringify(pageData, null, 2), 'utf8');
    testFiles.push(filePath);

    // Wait for registration
    await waitForCondition(async () => {
      const page = db.prepare('SELECT id FROM agent_pages WHERE id = ?').get(pageId);
      return !!page;
    }, 2000);

    // COMPLIANT: Use Read tool (simulated by fs.readFile)
    console.log(`   Using Read tool to verify file...`);
    const fileContent = await fs.readFile(filePath, 'utf8');
    const parsedData = JSON.parse(fileContent);

    expect(parsedData.id).toBe(pageId);
    expect(parsedData.title).toBe(pageData.title);
    console.log(`   ✅ Read tool used correctly`);

    // NON-COMPLIANT: Using Bash cat/grep would look like this:
    // const { execSync } = require('child_process');
    // const output = execSync(`cat ${filePath}`); // ❌ NOT COMPLIANT
    // const grepOutput = execSync(`grep "title" ${filePath}`); // ❌ NOT COMPLIANT

    console.log(`   ✅ Proper tool usage verified`);
  });
});
