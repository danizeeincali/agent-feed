#!/usr/bin/env node

/**
 * Comprehensive End-to-End Validation for Auto-Registration System
 *
 * Tests the complete workflow:
 * 1. File creation → auto-registration
 * 2. Manual curl registration
 * 3. API accessibility verification
 * 4. Page count validation
 * 5. Error handling
 *
 * 100% REAL FUNCTIONALITY - NO MOCKS
 */

import http from 'http';
import https from 'https';
import fs from 'fs/promises';
import path from 'path';
import { fileURLToPath } from 'url';
import { v4 as uuidv4 } from 'uuid';
import { exec } from 'child_process';
import { promisify } from 'util';

const execAsync = promisify(exec);
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Configuration
const API_BASE = 'localhost';
const API_PORT = 3001;
const PAGES_DIR = '/workspaces/agent-feed/data/agent-pages';
const TEST_TIMEOUT = 30000;
const AUTO_REGISTER_DELAY = 2000; // Wait for chokidar to detect file

// Colors for console output
const colors = {
  reset: '\x1b[0m',
  bright: '\x1b[1m',
  green: '\x1b[32m',
  red: '\x1b[31m',
  yellow: '\x1b[33m',
  blue: '\x1b[34m',
  cyan: '\x1b[36m'
};

// Test results tracker
const results = {
  passed: 0,
  failed: 0,
  total: 0,
  tests: []
};

// Helper: Colored console output
function log(message, color = 'reset') {
  console.log(`${colors[color]}${message}${colors.reset}`);
}

// Helper: HTTP request wrapper
function makeRequest(options, data = null) {
  return new Promise((resolve, reject) => {
    const protocol = options.protocol === 'https:' ? https : http;
    const req = protocol.request(options, (res) => {
      let responseData = '';

      res.on('data', (chunk) => {
        responseData += chunk;
      });

      res.on('end', () => {
        try {
          resolve({
            statusCode: res.statusCode,
            headers: res.headers,
            body: responseData,
            data: responseData ? JSON.parse(responseData) : null
          });
        } catch (error) {
          resolve({
            statusCode: res.statusCode,
            headers: res.headers,
            body: responseData,
            data: null
          });
        }
      });
    });

    req.on('error', (error) => {
      reject(error);
    });

    if (data) {
      req.write(JSON.stringify(data));
    }

    req.end();
  });
}

// Helper: Wait for specified milliseconds
function wait(ms) {
  return new Promise(resolve => setTimeout(resolve, ms));
}

// Helper: Create test page file
async function createTestPageFile(pageData) {
  const filePath = path.join(PAGES_DIR, `${pageData.id}.json`);
  await fs.writeFile(filePath, JSON.stringify(pageData, null, 2), 'utf8');
  log(`   📄 Created file: ${path.basename(filePath)}`, 'cyan');
  return filePath;
}

// Helper: Cleanup test file
async function cleanupTestFile(filePath) {
  try {
    await fs.unlink(filePath);
    log(`   🗑️  Cleaned up: ${path.basename(filePath)}`, 'cyan');
  } catch (error) {
    // Ignore if file doesn't exist
  }
}

// Helper: Execute test
async function executeTest(name, testFn) {
  results.total++;
  log(`\n${'='.repeat(80)}`, 'blue');
  log(`TEST ${results.total}: ${name}`, 'bright');
  log('='.repeat(80), 'blue');

  try {
    await testFn();
    results.passed++;
    results.tests.push({ name, status: 'PASSED' });
    log(`✅ PASSED: ${name}`, 'green');
    return true;
  } catch (error) {
    results.failed++;
    results.tests.push({ name, status: 'FAILED', error: error.message });
    log(`❌ FAILED: ${name}`, 'red');
    log(`   Error: ${error.message}`, 'red');
    return false;
  }
}

// Helper: Verify API is running
async function verifyAPIRunning() {
  try {
    const response = await makeRequest({
      hostname: API_BASE,
      port: API_PORT,
      path: '/health',
      method: 'GET'
    });

    if (response.statusCode !== 200) {
      throw new Error(`API returned status ${response.statusCode}`);
    }

    return true;
  } catch (error) {
    throw new Error(`API server is not running on ${API_BASE}:${API_PORT}. Please start it first.`);
  }
}

// Helper: Get page count for agent
async function getPageCount(agentId) {
  const response = await makeRequest({
    hostname: API_BASE,
    port: API_PORT,
    path: `/api/agent-pages/agents/${agentId}/pages`,
    method: 'GET'
  });

  if (response.statusCode === 200 && response.data?.data?.pages) {
    return response.data.data.pages.length;
  }

  return 0;
}

// Test 1: Auto-registration via file creation
async function testAutoRegistration() {
  const testAgentId = `auto-reg-test-${uuidv4()}`;
  const pageData = {
    id: `auto-page-${uuidv4()}`,
    agent_id: testAgentId,
    title: 'Auto-Registration Test Page',
    content_type: 'markdown',
    content_value: '# Auto-Registered Page\nThis page was automatically registered.',
    status: 'published',
    version: 1
  };

  let filePath;

  try {
    // Get initial page count
    const initialCount = await getPageCount(testAgentId);
    log(`   Initial page count: ${initialCount}`, 'cyan');

    // Create file and wait for auto-registration
    filePath = await createTestPageFile(pageData);
    log(`   ⏳ Waiting ${AUTO_REGISTER_DELAY}ms for auto-registration...`, 'yellow');
    await wait(AUTO_REGISTER_DELAY);

    // Verify page was auto-registered via API
    const response = await makeRequest({
      hostname: API_BASE,
      port: API_PORT,
      path: `/api/agent-pages/agents/${testAgentId}/pages/${pageData.id}`,
      method: 'GET'
    });

    if (response.statusCode !== 200) {
      throw new Error(`Page not found after auto-registration. Status: ${response.statusCode}`);
    }

    if (!response.data?.data?.page) {
      throw new Error('Page data missing from response');
    }

    const page = response.data.data.page;

    if (page.id !== pageData.id) {
      throw new Error(`Page ID mismatch: expected ${pageData.id}, got ${page.id}`);
    }

    if (page.title !== pageData.title) {
      throw new Error(`Page title mismatch: expected "${pageData.title}", got "${page.title}"`);
    }

    // Verify page count increased
    const finalCount = await getPageCount(testAgentId);
    log(`   Final page count: ${finalCount}`, 'cyan');

    if (finalCount <= initialCount) {
      throw new Error(`Page count did not increase (${initialCount} → ${finalCount})`);
    }

    log(`   ✅ Auto-registration successful`, 'green');
    log(`   ✅ Page accessible via API`, 'green');
    log(`   ✅ Page count increased correctly`, 'green');

  } finally {
    if (filePath) {
      await cleanupTestFile(filePath);
    }
  }
}

// Test 2: Manual curl registration workflow
async function testManualCurlRegistration() {
  const testAgentId = `curl-test-${uuidv4()}`;
  const pageData = {
    id: `curl-page-${uuidv4()}`,
    agent_id: testAgentId,
    title: 'Manual Curl Registration Test',
    content_type: 'json',
    content_value: JSON.stringify({
      type: 'dashboard',
      widgets: [
        { type: 'text', content: 'Registered via curl' }
      ]
    }),
    status: 'published',
    version: 1
  };

  let filePath;

  try {
    // Get initial page count
    const initialCount = await getPageCount(testAgentId);
    log(`   Initial page count: ${initialCount}`, 'cyan');

    // Create file first
    filePath = await createTestPageFile(pageData);

    // Execute manual registration via POST (simulating curl)
    log(`   🔧 Executing manual registration (curl simulation)...`, 'yellow');
    const response = await makeRequest({
      hostname: API_BASE,
      port: API_PORT,
      path: `/api/agent-pages/agents/${testAgentId}/pages`,
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      }
    }, pageData);

    if (response.statusCode !== 201) {
      throw new Error(`Registration failed. Status: ${response.statusCode}, Body: ${response.body}`);
    }

    if (!response.data?.success) {
      throw new Error('Registration response missing success flag');
    }

    if (!response.data?.data?.page) {
      throw new Error('Registration response missing page data');
    }

    // Verify page is accessible
    const getResponse = await makeRequest({
      hostname: API_BASE,
      port: API_PORT,
      path: `/api/agent-pages/agents/${testAgentId}/pages/${pageData.id}`,
      method: 'GET'
    });

    if (getResponse.statusCode !== 200) {
      throw new Error(`Page not accessible after registration. Status: ${getResponse.statusCode}`);
    }

    // Verify page count increased
    const finalCount = await getPageCount(testAgentId);
    log(`   Final page count: ${finalCount}`, 'cyan');

    if (finalCount <= initialCount) {
      throw new Error(`Page count did not increase (${initialCount} → ${finalCount})`);
    }

    log(`   ✅ Manual registration successful`, 'green');
    log(`   ✅ Page accessible immediately`, 'green');
    log(`   ✅ Page count updated correctly`, 'green');

  } finally {
    if (filePath) {
      await cleanupTestFile(filePath);
    }
  }
}

// Test 3: Verify both methods produce identical results
async function testMethodEquivalence() {
  const testAgentId = `equiv-test-${uuidv4()}`;

  // Auto-registered page
  const autoPageData = {
    id: `auto-equiv-${uuidv4()}`,
    agent_id: testAgentId,
    title: 'Auto-Registered Equivalence Test',
    content_type: 'text',
    content_value: 'Auto-registered content',
    status: 'published',
    version: 1
  };

  // Manually registered page
  const manualPageData = {
    id: `manual-equiv-${uuidv4()}`,
    agent_id: testAgentId,
    title: 'Manually-Registered Equivalence Test',
    content_type: 'text',
    content_value: 'Manually-registered content',
    status: 'published',
    version: 1
  };

  let autoFilePath, manualFilePath;

  try {
    // Create auto-registered page
    autoFilePath = await createTestPageFile(autoPageData);
    await wait(AUTO_REGISTER_DELAY);

    // Create manually-registered page
    manualFilePath = await createTestPageFile(manualPageData);
    await makeRequest({
      hostname: API_BASE,
      port: API_PORT,
      path: `/api/agent-pages/agents/${testAgentId}/pages`,
      method: 'POST',
      headers: { 'Content-Type': 'application/json' }
    }, manualPageData);

    // Retrieve both pages
    const autoResponse = await makeRequest({
      hostname: API_BASE,
      port: API_PORT,
      path: `/api/agent-pages/agents/${testAgentId}/pages/${autoPageData.id}`,
      method: 'GET'
    });

    const manualResponse = await makeRequest({
      hostname: API_BASE,
      port: API_PORT,
      path: `/api/agent-pages/agents/${testAgentId}/pages/${manualPageData.id}`,
      method: 'GET'
    });

    // Verify both are accessible
    if (autoResponse.statusCode !== 200) {
      throw new Error(`Auto-registered page not accessible: ${autoResponse.statusCode}`);
    }

    if (manualResponse.statusCode !== 200) {
      throw new Error(`Manually-registered page not accessible: ${manualResponse.statusCode}`);
    }

    // Verify both have same data structure
    const autoPage = autoResponse.data.data.page;
    const manualPage = manualResponse.data.data.page;

    const autoKeys = Object.keys(autoPage).sort();
    const manualKeys = Object.keys(manualPage).sort();

    if (JSON.stringify(autoKeys) !== JSON.stringify(manualKeys)) {
      throw new Error(`Page structure mismatch: auto has ${autoKeys.length} fields, manual has ${manualKeys.length} fields`);
    }

    log(`   ✅ Both methods produce identical structure`, 'green');
    log(`   ✅ Both pages accessible via same API`, 'green');
    log(`   ✅ No functional difference detected`, 'green');

  } finally {
    if (autoFilePath) await cleanupTestFile(autoFilePath);
    if (manualFilePath) await cleanupTestFile(manualFilePath);
  }
}

// Test 4: Error handling validation
async function testErrorHandling() {
  const testAgentId = `error-test-${uuidv4()}`;

  // Test 4.1: Invalid page data (missing required fields)
  const invalidPageData = {
    id: `invalid-page-${uuidv4()}`,
    agent_id: testAgentId,
    // Missing: title, content_type, content_value
  };

  const invalidResponse = await makeRequest({
    hostname: API_BASE,
    port: API_PORT,
    path: `/api/agent-pages/agents/${testAgentId}/pages`,
    method: 'POST',
    headers: { 'Content-Type': 'application/json' }
  }, invalidPageData);

  if (invalidResponse.statusCode !== 400) {
    throw new Error(`Expected 400 for invalid data, got ${invalidResponse.statusCode}`);
  }

  log(`   ✅ Invalid data rejected with 400 status`, 'green');

  // Test 4.2: Malformed JSON
  const malformedResponse = await new Promise((resolve, reject) => {
    const req = http.request({
      hostname: API_BASE,
      port: API_PORT,
      path: `/api/agent-pages/agents/${testAgentId}/pages`,
      method: 'POST',
      headers: { 'Content-Type': 'application/json' }
    }, (res) => {
      let data = '';
      res.on('data', chunk => data += chunk);
      res.on('end', () => resolve({ statusCode: res.statusCode, body: data }));
    });
    req.on('error', reject);
    req.write('{ invalid json }');
    req.end();
  });

  if (malformedResponse.statusCode !== 400) {
    throw new Error(`Expected 400 for malformed JSON, got ${malformedResponse.statusCode}`);
  }

  log(`   ✅ Malformed JSON rejected with 400 status`, 'green');

  // Test 4.3: Non-existent page retrieval
  const nonExistentResponse = await makeRequest({
    hostname: API_BASE,
    port: API_PORT,
    path: `/api/agent-pages/agents/${testAgentId}/pages/non-existent-page-id`,
    method: 'GET'
  });

  if (nonExistentResponse.statusCode !== 404) {
    throw new Error(`Expected 404 for non-existent page, got ${nonExistentResponse.statusCode}`);
  }

  log(`   ✅ Non-existent page returns 404`, 'green');
  log(`   ✅ All error cases handled correctly`, 'green');
}

// Test 5: Duplicate registration handling
async function testDuplicateHandling() {
  const testAgentId = `dup-test-${uuidv4()}`;
  const pageData = {
    id: `dup-page-${uuidv4()}`,
    agent_id: testAgentId,
    title: 'Duplicate Test Page',
    content_type: 'text',
    content_value: 'Test content',
    status: 'published',
    version: 1
  };

  let filePath;

  try {
    filePath = await createTestPageFile(pageData);

    // First registration
    const firstResponse = await makeRequest({
      hostname: API_BASE,
      port: API_PORT,
      path: `/api/agent-pages/agents/${testAgentId}/pages`,
      method: 'POST',
      headers: { 'Content-Type': 'application/json' }
    }, pageData);

    if (firstResponse.statusCode !== 201) {
      throw new Error(`First registration failed: ${firstResponse.statusCode}`);
    }

    log(`   ✅ First registration successful (201)`, 'green');

    // Second registration (duplicate)
    const secondResponse = await makeRequest({
      hostname: API_BASE,
      port: API_PORT,
      path: `/api/agent-pages/agents/${testAgentId}/pages`,
      method: 'POST',
      headers: { 'Content-Type': 'application/json' }
    }, pageData);

    // Should handle duplicate gracefully (200, 201, or 409)
    if (![200, 201, 409].includes(secondResponse.statusCode)) {
      throw new Error(`Unexpected duplicate response: ${secondResponse.statusCode}`);
    }

    log(`   ✅ Duplicate registration handled (${secondResponse.statusCode})`, 'green');

    // Verify page still accessible
    const getResponse = await makeRequest({
      hostname: API_BASE,
      port: API_PORT,
      path: `/api/agent-pages/agents/${testAgentId}/pages/${pageData.id}`,
      method: 'GET'
    });

    if (getResponse.statusCode !== 200) {
      throw new Error(`Page not accessible after duplicate: ${getResponse.statusCode}`);
    }

    log(`   ✅ Page remains accessible after duplicate`, 'green');

  } finally {
    if (filePath) await cleanupTestFile(filePath);
  }
}

// Test 6: Performance validation
async function testPerformance() {
  const testAgentId = `perf-test-${uuidv4()}`;
  const pageCount = 10;
  const createdFiles = [];

  try {
    log(`   📊 Creating ${pageCount} pages for performance test...`, 'cyan');

    const startTime = Date.now();

    // Create and register multiple pages
    const promises = [];
    for (let i = 0; i < pageCount; i++) {
      const pageData = {
        id: `perf-page-${i}-${uuidv4()}`,
        agent_id: testAgentId,
        title: `Performance Test Page ${i}`,
        content_type: 'text',
        content_value: `Content for performance test page ${i}`,
        status: 'published',
        version: 1
      };

      const promise = (async () => {
        const filePath = await createTestPageFile(pageData);
        createdFiles.push(filePath);

        const response = await makeRequest({
          hostname: API_BASE,
          port: API_PORT,
          path: `/api/agent-pages/agents/${testAgentId}/pages`,
          method: 'POST',
          headers: { 'Content-Type': 'application/json' }
        }, pageData);

        return response;
      })();

      promises.push(promise);
    }

    const responses = await Promise.all(promises);
    const endTime = Date.now();
    const duration = endTime - startTime;

    // Verify all succeeded
    const successCount = responses.filter(r => r.statusCode === 201).length;

    if (successCount !== pageCount) {
      throw new Error(`Only ${successCount}/${pageCount} pages registered successfully`);
    }

    // Verify all are accessible
    const listResponse = await makeRequest({
      hostname: API_BASE,
      port: API_PORT,
      path: `/api/agent-pages/agents/${testAgentId}/pages`,
      method: 'GET'
    });

    if (listResponse.statusCode !== 200) {
      throw new Error(`Failed to list pages: ${listResponse.statusCode}`);
    }

    const retrievedCount = listResponse.data.data.pages.length;

    if (retrievedCount < pageCount) {
      throw new Error(`Only ${retrievedCount}/${pageCount} pages accessible`);
    }

    const avgTime = duration / pageCount;

    log(`   ✅ ${pageCount} pages registered in ${duration}ms`, 'green');
    log(`   ✅ Average: ${avgTime.toFixed(2)}ms per page`, 'green');
    log(`   ✅ All pages accessible via API`, 'green');

    if (avgTime > 1000) {
      log(`   ⚠️  Warning: Average time exceeds 1 second`, 'yellow');
    }

  } finally {
    // Cleanup
    for (const filePath of createdFiles) {
      await cleanupTestFile(filePath);
    }
  }
}

// Generate final report
function generateReport() {
  log('\n\n' + '='.repeat(80), 'blue');
  log('VALIDATION REPORT', 'bright');
  log('='.repeat(80), 'blue');

  log(`\nTotal Tests: ${results.total}`, 'cyan');
  log(`Passed: ${results.passed}`, 'green');
  log(`Failed: ${results.failed}`, results.failed > 0 ? 'red' : 'green');

  const successRate = ((results.passed / results.total) * 100).toFixed(1);
  log(`Success Rate: ${successRate}%`, successRate === '100.0' ? 'green' : 'yellow');

  log('\nTest Results:', 'cyan');
  results.tests.forEach((test, index) => {
    const status = test.status === 'PASSED' ? '✅' : '❌';
    const color = test.status === 'PASSED' ? 'green' : 'red';
    log(`${index + 1}. ${status} ${test.name}`, color);
    if (test.error) {
      log(`   Error: ${test.error}`, 'red');
    }
  });

  log('\n' + '='.repeat(80), 'blue');

  if (results.failed === 0) {
    log('🎉 ALL VALIDATION TESTS PASSED! 🎉', 'green');
    log('The auto-registration system is fully operational.', 'green');
  } else {
    log('⚠️  SOME TESTS FAILED', 'red');
    log('Please review the errors above and fix the issues.', 'yellow');
  }

  log('='.repeat(80) + '\n', 'blue');

  return results.failed === 0 ? 0 : 1;
}

// Main execution
async function main() {
  log('\n' + '='.repeat(80), 'blue');
  log('AUTO-REGISTRATION SYSTEM - END-TO-END VALIDATION', 'bright');
  log('='.repeat(80), 'blue');

  log('\n📋 Configuration:', 'cyan');
  log(`   API Endpoint: http://${API_BASE}:${API_PORT}`, 'cyan');
  log(`   Pages Directory: ${PAGES_DIR}`, 'cyan');
  log(`   Test Timeout: ${TEST_TIMEOUT}ms`, 'cyan');
  log(`   Auto-Register Delay: ${AUTO_REGISTER_DELAY}ms`, 'cyan');

  try {
    // Pre-flight check
    log('\n🔍 Pre-flight Checks:', 'yellow');
    await verifyAPIRunning();
    log('   ✅ API server is running', 'green');

    // Execute tests
    await executeTest(
      'Auto-registration via file creation',
      testAutoRegistration
    );

    await executeTest(
      'Manual curl registration workflow',
      testManualCurlRegistration
    );

    await executeTest(
      'Method equivalence verification',
      testMethodEquivalence
    );

    await executeTest(
      'Error handling validation',
      testErrorHandling
    );

    await executeTest(
      'Duplicate registration handling',
      testDuplicateHandling
    );

    await executeTest(
      'Performance validation',
      testPerformance
    );

    // Generate and display report
    const exitCode = generateReport();
    process.exit(exitCode);

  } catch (error) {
    log(`\n❌ FATAL ERROR: ${error.message}`, 'red');
    log('\nStack trace:', 'red');
    log(error.stack, 'red');
    process.exit(1);
  }
}

// Run validation
main();
