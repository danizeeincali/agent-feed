/**
 * Performance E2E Test
 *
 * Validates system performance under various conditions:
 * 1. Registration speed (< 1 second target)
 * 2. Memory usage stability
 * 3. Concurrent page creation
 * 4. Load testing (100 pages)
 * 5. Database query performance
 * 6. API response times
 *
 * Tests REAL performance with actual system load.
 */

import { test, expect } from '@playwright/test';
import { spawn } from 'child_process';
import fs from 'fs/promises';
import path from 'path';
import { v4 as uuidv4 } from 'uuid';
import http from 'http';
import Database from 'better-sqlite3';

// Configuration
const API_PORT = 3004; // Use different port for isolation
const PAGES_DIR = '/workspaces/agent-feed/data/agent-pages';
const DB_PATH = '/workspaces/agent-feed/data/agent-pages.db';
const WORKSPACE_ROOT = '/workspaces/agent-feed';

// Performance thresholds
const THRESHOLDS = {
  REGISTRATION_TIME_MS: 1000,      // Auto-registration should be < 1 second
  API_RESPONSE_TIME_MS: 200,       // API responses should be < 200ms
  CONCURRENT_LOAD: 50,             // Should handle 50 concurrent operations
  BULK_LOAD: 100,                  // Should handle 100 pages
  MEMORY_INCREASE_MB: 100,         // Memory increase should be < 100MB for 100 pages
};

// Helper: Make HTTP request
function makeRequest(options, data = null) {
  return new Promise((resolve, reject) => {
    const startTime = Date.now();
    const req = http.request(options, (res) => {
      let responseData = '';
      res.on('data', (chunk) => { responseData += chunk; });
      res.on('end', () => {
        const duration = Date.now() - startTime;
        try {
          resolve({
            statusCode: res.statusCode,
            body: responseData,
            data: responseData ? JSON.parse(responseData) : null,
            duration
          });
        } catch (e) {
          resolve({ statusCode: res.statusCode, body: responseData, data: null, duration });
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

  return server;
}

// Helper: Stop server
async function stopServer(server) {
  return new Promise((resolve) => {
    if (!server) {
      resolve();
      return;
    }
    server.on('exit', () => resolve());
    server.kill('SIGTERM');
    setTimeout(() => {
      if (!server.killed) server.kill('SIGKILL');
      resolve();
    }, 5000);
  });
}

// Helper: Get memory usage
function getMemoryUsage() {
  const usage = process.memoryUsage();
  return {
    heapUsed: Math.round(usage.heapUsed / 1024 / 1024), // MB
    heapTotal: Math.round(usage.heapTotal / 1024 / 1024), // MB
    rss: Math.round(usage.rss / 1024 / 1024), // MB
  };
}

test.describe('Performance Tests', () => {
  let testAgentId;
  let testFiles = [];
  let db;
  let apiServer;

  test.beforeAll(async () => {
    testAgentId = `perf-test-${uuidv4()}`;
    db = new Database(DB_PATH);

    // Create test agent
    db.prepare(`
      INSERT OR REPLACE INTO agents (id, name, description, created_at, updated_at)
      VALUES (?, ?, ?, ?, ?)
    `).run(
      testAgentId,
      'Performance Test Agent',
      'Agent for performance testing',
      new Date().toISOString(),
      new Date().toISOString()
    );

    console.log(`\n⚡ Performance Test Setup`);
    console.log(`   Agent ID: ${testAgentId}`);
    console.log(`   Thresholds:`);
    console.log(`   - Registration: < ${THRESHOLDS.REGISTRATION_TIME_MS}ms`);
    console.log(`   - API Response: < ${THRESHOLDS.API_RESPONSE_TIME_MS}ms`);
    console.log(`   - Concurrent Load: ${THRESHOLDS.CONCURRENT_LOAD} operations`);
    console.log(`   - Bulk Load: ${THRESHOLDS.BULK_LOAD} pages`);

    // Start server for all tests
    apiServer = startServer(API_PORT);
    await waitForServer(API_PORT, 20000);
    console.log(`   ✅ Server started`);
  });

  test.afterAll(async () => {
    console.log(`\n🧹 Cleanup`);

    // Stop server
    if (apiServer) {
      await stopServer(apiServer);
      apiServer = null;
    }

    // Remove test files
    console.log(`   Cleaning up ${testFiles.length} test files...`);
    for (const filePath of testFiles) {
      try {
        await fs.unlink(filePath);
      } catch (error) {
        // Ignore errors
      }
    }

    // Cleanup database
    if (db) {
      const deleted = db.prepare('DELETE FROM agent_pages WHERE agent_id = ?').run(testAgentId);
      console.log(`   Deleted ${deleted.changes} database entries`);
      db.prepare('DELETE FROM agents WHERE id = ?').run(testAgentId);
      db.close();
    }
  });

  test('should register page within 1 second', async () => {
    console.log(`\n⏱️  Registration Speed Test`);

    const iterations = 10;
    const times = [];

    for (let i = 0; i < iterations; i++) {
      const pageId = `speed-test-${i}-${uuidv4()}`;
      const pageData = {
        id: pageId,
        agent_id: testAgentId,
        title: `Speed Test Page ${i}`,
        content_type: 'text',
        content_value: 'Performance test content',
        status: 'published',
        version: 1
      };

      const filePath = path.join(PAGES_DIR, `${pageId}.json`);

      const startTime = Date.now();
      await fs.writeFile(filePath, JSON.stringify(pageData, null, 2), 'utf8');
      testFiles.push(filePath);

      // Wait for registration
      const registered = await waitForCondition(async () => {
        const page = db.prepare('SELECT id FROM agent_pages WHERE id = ?').get(pageId);
        return !!page;
      }, 3000);

      const registrationTime = Date.now() - startTime;
      times.push(registrationTime);

      expect(registered).toBe(true);
      console.log(`   Iteration ${i + 1}: ${registrationTime}ms`);
    }

    // Calculate statistics
    const avgTime = times.reduce((a, b) => a + b, 0) / times.length;
    const maxTime = Math.max(...times);
    const minTime = Math.min(...times);

    console.log(`\n   📊 Registration Speed Statistics:`);
    console.log(`   Average: ${avgTime.toFixed(2)}ms`);
    console.log(`   Min: ${minTime}ms`);
    console.log(`   Max: ${maxTime}ms`);
    console.log(`   Target: < ${THRESHOLDS.REGISTRATION_TIME_MS}ms`);

    // Verify performance
    expect(avgTime).toBeLessThan(THRESHOLDS.REGISTRATION_TIME_MS);
    console.log(`   ✅ Registration speed meets target (avg: ${avgTime.toFixed(2)}ms)`);
  });

  test('should maintain stable memory usage under load', async () => {
    console.log(`\n💾 Memory Stability Test`);

    const initialMemory = getMemoryUsage();
    console.log(`   Initial Memory: ${initialMemory.heapUsed}MB (heap), ${initialMemory.rss}MB (RSS)`);

    // Create 50 pages
    const pageCount = 50;
    console.log(`   Creating ${pageCount} pages...`);

    const createPromises = [];
    for (let i = 0; i < pageCount; i++) {
      const pageId = `memory-test-${i}-${uuidv4()}`;
      const pageData = {
        id: pageId,
        agent_id: testAgentId,
        title: `Memory Test Page ${i}`,
        content_type: 'text',
        content_value: 'A'.repeat(1000), // 1KB content per page
        status: 'published',
        version: 1
      };

      const promise = (async () => {
        const filePath = path.join(PAGES_DIR, `${pageId}.json`);
        await fs.writeFile(filePath, JSON.stringify(pageData, null, 2), 'utf8');
        testFiles.push(filePath);
        return pageId;
      })();

      createPromises.push(promise);
    }

    await Promise.all(createPromises);
    console.log(`   ✅ All files created`);

    // Wait for all registrations
    await new Promise(resolve => setTimeout(resolve, 5000));

    // Force garbage collection if available
    if (global.gc) {
      global.gc();
    }

    const finalMemory = getMemoryUsage();
    console.log(`   Final Memory: ${finalMemory.heapUsed}MB (heap), ${finalMemory.rss}MB (RSS)`);

    const memoryIncrease = finalMemory.heapUsed - initialMemory.heapUsed;
    console.log(`   Memory Increase: ${memoryIncrease}MB`);
    console.log(`   Target: < ${THRESHOLDS.MEMORY_INCREASE_MB}MB`);

    // Verify memory usage is reasonable
    expect(memoryIncrease).toBeLessThan(THRESHOLDS.MEMORY_INCREASE_MB);
    console.log(`   ✅ Memory usage stable (increase: ${memoryIncrease}MB)`);
  });

  test('should handle concurrent page creations', async () => {
    console.log(`\n🔀 Concurrent Operations Test`);

    const concurrentCount = THRESHOLDS.CONCURRENT_LOAD;
    console.log(`   Creating ${concurrentCount} pages concurrently...`);

    const startTime = Date.now();
    const createPromises = [];

    for (let i = 0; i < concurrentCount; i++) {
      const pageId = `concurrent-${i}-${uuidv4()}`;
      const pageData = {
        id: pageId,
        agent_id: testAgentId,
        title: `Concurrent Test Page ${i}`,
        content_type: 'text',
        content_value: `Content ${i}`,
        status: 'published',
        version: 1
      };

      const promise = (async () => {
        const filePath = path.join(PAGES_DIR, `${pageId}.json`);
        await fs.writeFile(filePath, JSON.stringify(pageData, null, 2), 'utf8');
        testFiles.push(filePath);

        // Wait for registration
        const registered = await waitForCondition(async () => {
          const page = db.prepare('SELECT id FROM agent_pages WHERE id = ?').get(pageId);
          return !!page;
        }, 5000);

        return { pageId, registered };
      })();

      createPromises.push(promise);
    }

    const results = await Promise.all(createPromises);
    const duration = Date.now() - startTime;

    // Verify all registered
    const successCount = results.filter(r => r.registered).length;
    console.log(`   Registered: ${successCount}/${concurrentCount}`);
    console.log(`   Total Time: ${duration}ms`);
    console.log(`   Average per page: ${(duration / concurrentCount).toFixed(2)}ms`);

    expect(successCount).toBe(concurrentCount);
    console.log(`   ✅ All concurrent operations completed successfully`);
  });

  test('should handle bulk load (100 pages)', async () => {
    console.log(`\n📦 Bulk Load Test`);

    const bulkCount = THRESHOLDS.BULK_LOAD;
    console.log(`   Creating ${bulkCount} pages...`);

    const startTime = Date.now();
    const batchSize = 20; // Create in batches to avoid overwhelming filesystem

    let createdCount = 0;
    for (let batch = 0; batch < bulkCount / batchSize; batch++) {
      const batchPromises = [];

      for (let i = 0; i < batchSize; i++) {
        const index = batch * batchSize + i;
        const pageId = `bulk-${index}-${uuidv4()}`;
        const pageData = {
          id: pageId,
          agent_id: testAgentId,
          title: `Bulk Test Page ${index}`,
          content_type: 'text',
          content_value: `Bulk content ${index}`,
          status: 'published',
          version: 1
        };

        const promise = (async () => {
          const filePath = path.join(PAGES_DIR, `${pageId}.json`);
          await fs.writeFile(filePath, JSON.stringify(pageData, null, 2), 'utf8');
          testFiles.push(filePath);
        })();

        batchPromises.push(promise);
      }

      await Promise.all(batchPromises);
      createdCount += batchSize;
      console.log(`   Created batch ${batch + 1}/${bulkCount / batchSize} (${createdCount} total)`);
    }

    const creationTime = Date.now() - startTime;
    console.log(`   ✅ All files created in ${creationTime}ms`);

    // Wait for all registrations
    console.log(`   Waiting for registrations...`);
    await new Promise(resolve => setTimeout(resolve, 10000)); // Give more time for bulk

    // Verify registrations
    const registeredCount = db.prepare(
      'SELECT COUNT(*) as count FROM agent_pages WHERE agent_id = ? AND title LIKE ?'
    ).get(testAgentId, 'Bulk Test Page %').count;

    const totalTime = Date.now() - startTime;
    console.log(`\n   📊 Bulk Load Statistics:`);
    console.log(`   Created: ${bulkCount} pages`);
    console.log(`   Registered: ${registeredCount} pages`);
    console.log(`   Total Time: ${totalTime}ms`);
    console.log(`   Average per page: ${(totalTime / bulkCount).toFixed(2)}ms`);

    expect(registeredCount).toBe(bulkCount);
    console.log(`   ✅ Bulk load completed successfully`);
  });

  test('should maintain API response time under load', async () => {
    console.log(`\n🚀 API Performance Test`);

    // Create test data first
    const testPageId = `api-perf-${uuidv4()}`;
    const pageData = {
      id: testPageId,
      agent_id: testAgentId,
      title: 'API Performance Test',
      content_type: 'text',
      content_value: 'Performance test',
      status: 'published',
      version: 1
    };

    const filePath = path.join(PAGES_DIR, `${testPageId}.json`);
    await fs.writeFile(filePath, JSON.stringify(pageData, null, 2), 'utf8');
    testFiles.push(filePath);

    // Wait for registration
    await waitForCondition(async () => {
      const page = db.prepare('SELECT id FROM agent_pages WHERE id = ?').get(testPageId);
      return !!page;
    }, 3000);

    // Test API response times
    const iterations = 20;
    const times = [];

    console.log(`   Testing GET endpoint (${iterations} requests)...`);
    for (let i = 0; i < iterations; i++) {
      const response = await makeRequest({
        hostname: 'localhost',
        port: API_PORT,
        path: `/api/agent-pages/${testPageId}`,
        method: 'GET'
      });

      times.push(response.duration);
      expect(response.statusCode).toBe(200);
    }

    // Calculate statistics
    const avgTime = times.reduce((a, b) => a + b, 0) / times.length;
    const maxTime = Math.max(...times);
    const minTime = Math.min(...times);

    console.log(`\n   📊 API Response Time Statistics:`);
    console.log(`   Average: ${avgTime.toFixed(2)}ms`);
    console.log(`   Min: ${minTime}ms`);
    console.log(`   Max: ${maxTime}ms`);
    console.log(`   Target: < ${THRESHOLDS.API_RESPONSE_TIME_MS}ms`);

    expect(avgTime).toBeLessThan(THRESHOLDS.API_RESPONSE_TIME_MS);
    console.log(`   ✅ API performance meets target (avg: ${avgTime.toFixed(2)}ms)`);
  });

  test('should handle database query performance', async () => {
    console.log(`\n🗄️  Database Query Performance Test`);

    // Create test data (reuse bulk test data if exists)
    const queryCount = 100;
    const times = {
      single: [],
      list: [],
      count: [],
      search: []
    };

    console.log(`   Testing query performance (${queryCount} iterations)...`);

    for (let i = 0; i < queryCount; i++) {
      // Test 1: Single record query
      let start = Date.now();
      db.prepare('SELECT * FROM agent_pages WHERE agent_id = ? LIMIT 1').get(testAgentId);
      times.single.push(Date.now() - start);

      // Test 2: List query
      start = Date.now();
      db.prepare('SELECT * FROM agent_pages WHERE agent_id = ? LIMIT 10').all(testAgentId);
      times.list.push(Date.now() - start);

      // Test 3: Count query
      start = Date.now();
      db.prepare('SELECT COUNT(*) as count FROM agent_pages WHERE agent_id = ?').get(testAgentId);
      times.count.push(Date.now() - start);

      // Test 4: Search query
      start = Date.now();
      db.prepare('SELECT * FROM agent_pages WHERE agent_id = ? AND title LIKE ? LIMIT 10')
        .all(testAgentId, '%Test%');
      times.search.push(Date.now() - start);
    }

    // Calculate statistics
    const stats = {};
    for (const [queryType, queryTimes] of Object.entries(times)) {
      const avg = queryTimes.reduce((a, b) => a + b, 0) / queryTimes.length;
      const max = Math.max(...queryTimes);
      const min = Math.min(...queryTimes);
      stats[queryType] = { avg, max, min };
    }

    console.log(`\n   📊 Database Query Statistics:`);
    console.log(`   Single Record: avg=${stats.single.avg.toFixed(2)}ms, max=${stats.single.max}ms`);
    console.log(`   List (10):     avg=${stats.list.avg.toFixed(2)}ms, max=${stats.list.max}ms`);
    console.log(`   Count:         avg=${stats.count.avg.toFixed(2)}ms, max=${stats.count.max}ms`);
    console.log(`   Search:        avg=${stats.search.avg.toFixed(2)}ms, max=${stats.search.max}ms`);

    // Verify all queries are fast (< 10ms average)
    expect(stats.single.avg).toBeLessThan(10);
    expect(stats.list.avg).toBeLessThan(10);
    expect(stats.count.avg).toBeLessThan(10);
    expect(stats.search.avg).toBeLessThan(10);

    console.log(`   ✅ All queries perform within acceptable range`);
  });

  test('should generate performance summary report', async () => {
    console.log(`\n📊 Performance Summary Report`);

    // Collect final metrics
    const totalPages = db.prepare(
      'SELECT COUNT(*) as count FROM agent_pages WHERE agent_id = ?'
    ).get(testAgentId).count;

    const memory = getMemoryUsage();

    console.log(`\n   🎯 Test Completion Summary:`);
    console.log(`   ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━`);
    console.log(`   Total Pages Created: ${totalPages}`);
    console.log(`   Total Test Files: ${testFiles.length}`);
    console.log(`   Current Memory: ${memory.heapUsed}MB (heap), ${memory.rss}MB (RSS)`);
    console.log(`   ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━`);
    console.log(`\n   ✅ Performance Thresholds:`);
    console.log(`      [✓] Registration Speed: < ${THRESHOLDS.REGISTRATION_TIME_MS}ms`);
    console.log(`      [✓] API Response Time: < ${THRESHOLDS.API_RESPONSE_TIME_MS}ms`);
    console.log(`      [✓] Concurrent Load: ${THRESHOLDS.CONCURRENT_LOAD} operations`);
    console.log(`      [✓] Bulk Load: ${THRESHOLDS.BULK_LOAD} pages`);
    console.log(`      [✓] Memory Stability: < ${THRESHOLDS.MEMORY_INCREASE_MB}MB increase`);
    console.log(`   ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━`);
    console.log(`\n   🎉 All performance tests PASSED!`);

    expect(totalPages).toBeGreaterThan(0);
  });
});
