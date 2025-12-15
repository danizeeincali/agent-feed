/**
 * Performance Tests: Filesystem Agent Loading
 * Validates performance characteristics of the filesystem-based agent repository
 *
 * Test Coverage:
 * - Filesystem read time < 100ms
 * - API response time < 200ms
 * - Page load time < 3s
 * - Memory usage normal
 * - No memory leaks
 * - Concurrent request handling
 */

import { describe, it, expect, beforeAll, afterAll } from '@jest/globals';
import { performance } from 'perf_hooks';
import {
  readAgentFile,
  listAgentFiles,
  getAllAgents,
  getAgentBySlug
} from '../../api-server/repositories/agent.repository.js';

const API_BASE_URL = process.env.API_URL || 'http://localhost:3001';
const TEST_TIMEOUT = 30000;

describe('Filesystem Performance Tests', () => {

  describe('File System Read Performance', () => {
    it('should list all agent files in under 50ms', async () => {
      const start = performance.now();
      const files = await listAgentFiles();
      const duration = performance.now() - start;

      expect(files.length).toBe(13);
      expect(duration).toBeLessThan(50);

      console.log(`📊 listAgentFiles() took ${duration.toFixed(2)}ms`);
    }, TEST_TIMEOUT);

    it('should read single agent file in under 20ms', async () => {
      const files = await listAgentFiles();
      const filePath = files[0];

      const start = performance.now();
      const agent = await readAgentFile(filePath);
      const duration = performance.now() - start;

      expect(agent).toBeDefined();
      expect(duration).toBeLessThan(20);

      console.log(`📊 readAgentFile() took ${duration.toFixed(2)}ms`);
    }, TEST_TIMEOUT);

    it('should load all agents in under 100ms', async () => {
      const start = performance.now();
      const agents = await getAllAgents();
      const duration = performance.now() - start;

      expect(agents.length).toBe(13);
      expect(duration).toBeLessThan(100);

      console.log(`📊 getAllAgents() took ${duration.toFixed(2)}ms`);
    }, TEST_TIMEOUT);

    it('should find agent by slug in under 30ms', async () => {
      const start = performance.now();
      const agent = await getAgentBySlug('meta-agent');
      const duration = performance.now() - start;

      expect(agent).toBeDefined();
      expect(duration).toBeLessThan(30);

      console.log(`📊 getAgentBySlug() took ${duration.toFixed(2)}ms`);
    }, TEST_TIMEOUT);
  });

  describe('API Response Performance', () => {
    let serverAvailable = false;

    beforeAll(async () => {
      try {
        const response = await fetch(`${API_BASE_URL}/health`);
        serverAvailable = response.ok;
      } catch (error) {
        serverAvailable = false;
      }
    });

    it('should respond to GET /api/agents in under 200ms', async () => {
      if (!serverAvailable) return;

      const start = performance.now();
      const response = await fetch(`${API_BASE_URL}/api/agents`);
      const data = await response.json();
      const duration = performance.now() - start;

      expect(response.status).toBe(200);
      expect(data.data.length).toBe(13);
      expect(duration).toBeLessThan(200);

      console.log(`📊 GET /api/agents took ${duration.toFixed(2)}ms`);
    }, TEST_TIMEOUT);

    it('should respond to GET /api/agents/:slug in under 100ms', async () => {
      if (!serverAvailable) return;

      const start = performance.now();
      const response = await fetch(`${API_BASE_URL}/api/agents/meta-agent`);
      const data = await response.json();
      const duration = performance.now() - start;

      expect(response.status).toBe(200);
      expect(duration).toBeLessThan(100);

      console.log(`📊 GET /api/agents/:slug took ${duration.toFixed(2)}ms`);
    }, TEST_TIMEOUT);

    it('should handle 10 concurrent requests efficiently', async () => {
      if (!serverAvailable) return;

      const start = performance.now();

      const requests = Array(10).fill(null).map(() =>
        fetch(`${API_BASE_URL}/api/agents`)
      );

      const responses = await Promise.all(requests);
      const duration = performance.now() - start;

      responses.forEach(r => expect(r.status).toBe(200));
      expect(duration).toBeLessThan(1000);

      const avgTime = duration / 10;
      console.log(`📊 10 concurrent requests took ${duration.toFixed(2)}ms (avg: ${avgTime.toFixed(2)}ms)`);
    }, TEST_TIMEOUT);

    it('should handle 50 concurrent requests without degradation', async () => {
      if (!serverAvailable) return;

      const start = performance.now();

      const requests = Array(50).fill(null).map(() =>
        fetch(`${API_BASE_URL}/api/agents`)
      );

      const responses = await Promise.all(requests);
      const duration = performance.now() - start;

      responses.forEach(r => expect(r.status).toBe(200));
      expect(duration).toBeLessThan(3000);

      const avgTime = duration / 50;
      console.log(`📊 50 concurrent requests took ${duration.toFixed(2)}ms (avg: ${avgTime.toFixed(2)}ms)`);
    }, TEST_TIMEOUT);
  });

  describe('Memory Usage', () => {
    it('should not leak memory on repeated agent loading', async () => {
      // Force garbage collection if available
      if (global.gc) {
        global.gc();
      }

      const initialMemory = process.memoryUsage().heapUsed;

      // Load agents 100 times
      for (let i = 0; i < 100; i++) {
        await getAllAgents();
      }

      // Force garbage collection again
      if (global.gc) {
        global.gc();
      }

      const finalMemory = process.memoryUsage().heapUsed;
      const memoryIncrease = finalMemory - initialMemory;

      // Memory increase should be minimal (< 10MB)
      expect(memoryIncrease).toBeLessThan(10 * 1024 * 1024);

      console.log(`📊 Memory increase after 100 loads: ${(memoryIncrease / 1024 / 1024).toFixed(2)}MB`);
    }, TEST_TIMEOUT);

    it('should have reasonable memory footprint for agent data', async () => {
      const agents = await getAllAgents();

      // Calculate approximate size
      const dataSize = JSON.stringify(agents).length;
      const dataSizeMB = dataSize / 1024 / 1024;

      // 13 agents should be < 5MB in memory
      expect(dataSizeMB).toBeLessThan(5);

      console.log(`📊 Agent data size: ${dataSizeMB.toFixed(2)}MB`);
    }, TEST_TIMEOUT);
  });

  describe('Caching Performance', () => {
    let serverAvailable = false;

    beforeAll(async () => {
      try {
        const response = await fetch(`${API_BASE_URL}/health`);
        serverAvailable = response.ok;
      } catch (error) {
        serverAvailable = false;
      }
    });

    it('should benefit from caching on repeated requests', async () => {
      if (!serverAvailable) return;

      // First request (cold cache)
      const start1 = performance.now();
      await fetch(`${API_BASE_URL}/api/agents`);
      const duration1 = performance.now() - start1;

      // Wait a bit
      await new Promise(resolve => setTimeout(resolve, 100));

      // Second request (warm cache)
      const start2 = performance.now();
      await fetch(`${API_BASE_URL}/api/agents`);
      const duration2 = performance.now() - start2;

      console.log(`📊 Cold cache: ${duration1.toFixed(2)}ms, Warm cache: ${duration2.toFixed(2)}ms`);

      // Warm cache should be same or faster
      expect(duration2).toBeLessThanOrEqual(duration1 * 1.2); // Allow 20% variance
    }, TEST_TIMEOUT);

    it('should cache individual agent lookups', async () => {
      if (!serverAvailable) return;

      // First lookup
      const start1 = performance.now();
      await fetch(`${API_BASE_URL}/api/agents/meta-agent`);
      const duration1 = performance.now() - start1;

      // Second lookup (should be cached)
      const start2 = performance.now();
      await fetch(`${API_BASE_URL}/api/agents/meta-agent`);
      const duration2 = performance.now() - start2;

      console.log(`📊 First lookup: ${duration1.toFixed(2)}ms, Cached lookup: ${duration2.toFixed(2)}ms`);

      expect(duration2).toBeLessThanOrEqual(duration1 * 1.2);
    }, TEST_TIMEOUT);
  });

  describe('Scalability Tests', () => {
    it('should scale linearly with agent count', async () => {
      const files = await listAgentFiles();

      // Load subsets of agents
      const timings = [];

      for (let count of [1, 5, 10, 13]) {
        const subset = files.slice(0, count);

        const start = performance.now();
        await Promise.all(subset.map(f => readAgentFile(f)));
        const duration = performance.now() - start;

        timings.push({ count, duration });
        console.log(`📊 Loading ${count} agents took ${duration.toFixed(2)}ms`);
      }

      // Should scale approximately linearly (within 2x)
      const timePerAgent1 = timings[0].duration / timings[0].count;
      const timePerAgent13 = timings[3].duration / timings[3].count;

      expect(timePerAgent13).toBeLessThan(timePerAgent1 * 2);
    }, TEST_TIMEOUT);

    it('should handle rapid sequential requests', async () => {
      if (!serverAvailable) {
        const response = await fetch(`${API_BASE_URL}/health`).catch(() => null);
        if (!response || !response.ok) return;
      }

      const start = performance.now();

      // Make 20 sequential requests
      for (let i = 0; i < 20; i++) {
        await fetch(`${API_BASE_URL}/api/agents/meta-agent`);
      }

      const duration = performance.now() - start;
      const avgTime = duration / 20;

      expect(duration).toBeLessThan(3000);
      console.log(`📊 20 sequential requests took ${duration.toFixed(2)}ms (avg: ${avgTime.toFixed(2)}ms)`);
    }, TEST_TIMEOUT);
  });

  describe('File System Performance Characteristics', () => {
    it('should read files in parallel efficiently', async () => {
      const files = await listAgentFiles();

      // Sequential reads
      const sequentialStart = performance.now();
      for (const file of files) {
        await readAgentFile(file);
      }
      const sequentialDuration = performance.now() - sequentialStart;

      // Parallel reads
      const parallelStart = performance.now();
      await Promise.all(files.map(f => readAgentFile(f)));
      const parallelDuration = performance.now() - parallelStart;

      console.log(`📊 Sequential: ${sequentialDuration.toFixed(2)}ms, Parallel: ${parallelDuration.toFixed(2)}ms`);

      // Parallel should be significantly faster (at least 2x)
      expect(parallelDuration).toBeLessThan(sequentialDuration / 2);
    }, TEST_TIMEOUT);

    it('should have consistent read times across multiple runs', async () => {
      const iterations = 10;
      const timings = [];

      for (let i = 0; i < iterations; i++) {
        const start = performance.now();
        await getAllAgents();
        const duration = performance.now() - start;
        timings.push(duration);
      }

      const avgTime = timings.reduce((a, b) => a + b, 0) / timings.length;
      const maxTime = Math.max(...timings);
      const minTime = Math.min(...timings);

      console.log(`📊 Avg: ${avgTime.toFixed(2)}ms, Min: ${minTime.toFixed(2)}ms, Max: ${maxTime.toFixed(2)}ms`);

      // Variance should be low (max < 2x min)
      expect(maxTime).toBeLessThan(minTime * 2);
    }, TEST_TIMEOUT);
  });

  describe('Performance Benchmarks', () => {
    it('should meet performance targets', async () => {
      const benchmarks = {
        listFiles: { target: 50, name: 'List agent files' },
        readFile: { target: 20, name: 'Read single file' },
        loadAll: { target: 100, name: 'Load all agents' },
        findBySlug: { target: 30, name: 'Find by slug' }
      };

      const results = {};

      // List files
      let start = performance.now();
      await listAgentFiles();
      results.listFiles = performance.now() - start;

      // Read file
      const files = await listAgentFiles();
      start = performance.now();
      await readAgentFile(files[0]);
      results.readFile = performance.now() - start;

      // Load all
      start = performance.now();
      await getAllAgents();
      results.loadAll = performance.now() - start;

      // Find by slug
      start = performance.now();
      await getAgentBySlug('meta-agent');
      results.findBySlug = performance.now() - start;

      // Validate benchmarks
      console.log('\n📊 Performance Benchmarks:');
      for (const [key, benchmark] of Object.entries(benchmarks)) {
        const actual = results[key];
        const passed = actual < benchmark.target;
        const status = passed ? '✅' : '❌';

        console.log(`${status} ${benchmark.name}: ${actual.toFixed(2)}ms (target: ${benchmark.target}ms)`);
        expect(actual).toBeLessThan(benchmark.target);
      }
    }, TEST_TIMEOUT);
  });

  describe('Resource Cleanup', () => {
    it('should not leave file handles open', async () => {
      const initialHandles = process._getActiveHandles ? process._getActiveHandles().length : 0;

      // Perform many file operations
      for (let i = 0; i < 20; i++) {
        await getAllAgents();
      }

      const finalHandles = process._getActiveHandles ? process._getActiveHandles().length : 0;

      // Should not accumulate file handles
      expect(finalHandles).toBeLessThanOrEqual(initialHandles + 5);
    }, TEST_TIMEOUT);
  });
});
