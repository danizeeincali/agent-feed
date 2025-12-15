/**
 * Server Stability Test Suite
 * Tests memory management, graceful shutdown, and load handling
 */

import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import { spawn } from 'child_process';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

describe('Server Stability Tests', () => {
  let serverProcess;
  const SERVER_PORT = 3002; // Use different port for testing
  const AGENT_PAGES_DIR = path.join(__dirname, '../../data/agent-pages');

  beforeAll(async () => {
    // Ensure test directory exists
    if (!fs.existsSync(AGENT_PAGES_DIR)) {
      fs.mkdirSync(AGENT_PAGES_DIR, { recursive: true });
    }

    // Start server
    serverProcess = spawn('node', ['server.js'], {
      cwd: path.join(__dirname, '../..'),
      env: { ...process.env, PORT: SERVER_PORT },
      stdio: 'pipe'
    });

    // Wait for server to start
    await new Promise((resolve) => {
      serverProcess.stdout.on('data', (data) => {
        if (data.toString().includes('API Server running')) {
          resolve();
        }
      });
    });

    // Give extra time for initialization
    await new Promise(resolve => setTimeout(resolve, 2000));
  });

  afterAll(async () => {
    if (serverProcess) {
      // Send SIGTERM for graceful shutdown
      serverProcess.kill('SIGTERM');

      // Wait for shutdown
      await new Promise((resolve) => {
        serverProcess.on('exit', resolve);
        setTimeout(resolve, 5000); // Timeout after 5s
      });
    }
  });

  it('should respond to health check endpoint', async () => {
    const response = await fetch(`http://localhost:${SERVER_PORT}/health`);
    const data = await response.json();

    expect(response.status).toBe(200);
    expect(data.success).toBe(true);
    expect(data.data).toHaveProperty('status');
    expect(data.data).toHaveProperty('memory');
    expect(data.data).toHaveProperty('resources');
    expect(data.data).toHaveProperty('uptime');
  });

  it('should report memory usage in health check', async () => {
    const response = await fetch(`http://localhost:${SERVER_PORT}/health`);
    const data = await response.json();

    const memory = data.data.memory;
    expect(memory).toHaveProperty('heapUsed');
    expect(memory).toHaveProperty('heapTotal');
    expect(memory).toHaveProperty('heapPercentage');
    expect(memory).toHaveProperty('rss');
    expect(memory.unit).toBe('MB');

    // Memory values should be reasonable
    expect(memory.heapUsed).toBeGreaterThan(0);
    expect(memory.heapUsed).toBeLessThan(1000); // Less than 1GB
  });

  it('should report file watcher status in health check', async () => {
    const response = await fetch(`http://localhost:${SERVER_PORT}/health`);
    const data = await response.json();

    const resources = data.data.resources;
    expect(resources).toHaveProperty('fileWatcherActive');
    expect(resources).toHaveProperty('databaseConnected');
    expect(resources).toHaveProperty('agentPagesDbConnected');
    expect(resources).toHaveProperty('sseConnections');
    expect(resources).toHaveProperty('tickerMessages');
  });

  it('should handle multiple page registrations without memory leak', async () => {
    // Create multiple test pages
    const testPages = [];
    const pageCount = 50;

    for (let i = 0; i < pageCount; i++) {
      const pageId = `stability-test-${Date.now()}-${i}`;
      const pageData = {
        id: pageId,
        agent_id: 'stability-test-agent',
        title: `Stability Test Page ${i}`,
        content_type: 'text',
        content_value: `Test content for page ${i}`,
        status: 'published',
        version: 1
      };

      const filePath = path.join(AGENT_PAGES_DIR, `${pageId}.json`);
      fs.writeFileSync(filePath, JSON.stringify(pageData, null, 2));
      testPages.push(filePath);

      // Small delay to avoid overwhelming the watcher
      await new Promise(resolve => setTimeout(resolve, 10));
    }

    // Wait for all pages to be processed
    await new Promise(resolve => setTimeout(resolve, 3000));

    // Check memory usage hasn't exploded
    const response = await fetch(`http://localhost:${SERVER_PORT}/health`);
    const data = await response.json();

    expect(data.data.memory.heapPercentage).toBeLessThan(95);
    expect(data.data.status).not.toBe('critical');

    // Cleanup test files
    for (const filePath of testPages) {
      if (fs.existsSync(filePath)) {
        fs.unlinkSync(filePath);
      }
    }
  }, 15000); // Increase timeout for this test

  it('should warn when memory usage is high', async () => {
    const response = await fetch(`http://localhost:${SERVER_PORT}/health`);
    const data = await response.json();

    if (data.data.memory.heapPercentage > 80) {
      expect(data.data.warnings).toBeDefined();
      expect(data.data.warnings.length).toBeGreaterThan(0);
      expect(data.data.status).toMatch(/warning|critical/);
    }
  });

  it('should maintain stable uptime', async () => {
    const response1 = await fetch(`http://localhost:${SERVER_PORT}/health`);
    const data1 = await response1.json();
    const uptime1 = data1.data.uptime.seconds;

    // Wait 2 seconds
    await new Promise(resolve => setTimeout(resolve, 2000));

    const response2 = await fetch(`http://localhost:${SERVER_PORT}/health`);
    const data2 = await response2.json();
    const uptime2 = data2.data.uptime.seconds;

    // Uptime should increase
    expect(uptime2).toBeGreaterThan(uptime1);
    expect(uptime2 - uptime1).toBeGreaterThanOrEqual(1);
    expect(uptime2 - uptime1).toBeLessThan(5); // Should be ~2 seconds
  });

  it('should handle concurrent page registrations', async () => {
    const concurrentCount = 10;
    const promises = [];

    for (let i = 0; i < concurrentCount; i++) {
      const promise = (async () => {
        const pageId = `concurrent-test-${Date.now()}-${i}`;
        const pageData = {
          id: pageId,
          agent_id: 'concurrent-test-agent',
          title: `Concurrent Test Page ${i}`,
          content_type: 'text',
          content_value: `Test content for concurrent page ${i}`,
          status: 'published',
          version: 1
        };

        const filePath = path.join(AGENT_PAGES_DIR, `${pageId}.json`);
        fs.writeFileSync(filePath, JSON.stringify(pageData, null, 2));
        return filePath;
      })();

      promises.push(promise);
    }

    const filePaths = await Promise.all(promises);

    // Wait for processing
    await new Promise(resolve => setTimeout(resolve, 2000));

    // Verify server is still healthy
    const response = await fetch(`http://localhost:${SERVER_PORT}/health`);
    const data = await response.json();

    expect(response.status).toBe(200);
    expect(data.success).toBe(true);

    // Cleanup
    for (const filePath of filePaths) {
      if (fs.existsSync(filePath)) {
        fs.unlinkSync(filePath);
      }
    }
  }, 10000);
});
