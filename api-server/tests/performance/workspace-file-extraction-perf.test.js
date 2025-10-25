/**
 * Performance Tests for Workspace File Extraction
 *
 * Measures timing for:
 * - Reading agent frontmatter
 * - Extracting from workspace files
 * - Full extractIntelligence flow
 */

import { describe, test, beforeAll, expect } from 'vitest';
import { promises as fs } from 'fs';
import path from 'path';

// Import AgentWorker
import AgentWorker from '../../worker/agent-worker.js';

describe('Workspace File Extraction - Performance Tests', () => {
  let worker;
  const agentsDir = '/workspaces/agent-feed/prod/.claude/agents';
  const workspaceDir = '/workspaces/agent-feed/prod/agent_workspace/link-logger-agent';

  beforeAll(() => {
    worker = new AgentWorker({
      workerId: 'perf-test-worker',
      ticketId: 'perf-test-ticket',
      agentId: 'link-logger-agent'
    });
  });

  test('PERF-001: readAgentFrontmatter should complete in <50ms', async () => {
    const iterations = 10;
    const times = [];

    for (let i = 0; i < iterations; i++) {
      const start = performance.now();
      await worker.readAgentFrontmatter('link-logger-agent', agentsDir);
      const duration = performance.now() - start;
      times.push(duration);
    }

    const avgTime = times.reduce((a, b) => a + b, 0) / times.length;
    const maxTime = Math.max(...times);

    console.log(`\n📊 readAgentFrontmatter Performance:`);
    console.log(`   Average: ${avgTime.toFixed(2)}ms`);
    console.log(`   Max: ${maxTime.toFixed(2)}ms`);
    console.log(`   Min: ${Math.min(...times).toFixed(2)}ms`);

    expect(avgTime).toBeLessThan(50);
    expect(maxTime).toBeLessThan(100);
  }, 10000);

  test('PERF-002: extractFromWorkspaceFiles should complete in <100ms', async () => {
    // First, check if workspace exists
    let workspaceExists = false;
    try {
      await fs.access(workspaceDir);
      workspaceExists = true;
    } catch (error) {
      console.log(`⚠️  Workspace not found at ${workspaceDir}, skipping performance test`);
    }

    if (!workspaceExists) {
      console.log('✓ Test skipped (no workspace files)');
      return;
    }

    const iterations = 10;
    const times = [];

    for (let i = 0; i < iterations; i++) {
      const start = performance.now();
      await worker.extractFromWorkspaceFiles(workspaceDir);
      const duration = performance.now() - start;
      times.push(duration);
    }

    const avgTime = times.reduce((a, b) => a + b, 0) / times.length;
    const maxTime = Math.max(...times);

    console.log(`\n📊 extractFromWorkspaceFiles Performance:`);
    console.log(`   Average: ${avgTime.toFixed(2)}ms`);
    console.log(`   Max: ${maxTime.toFixed(2)}ms`);
    console.log(`   Min: ${Math.min(...times).toFixed(2)}ms`);

    expect(avgTime).toBeLessThan(100);
    expect(maxTime).toBeLessThan(200);
  }, 10000);

  test('PERF-003: extractIntelligence (full flow) should complete in <150ms', async () => {
    const iterations = 10;
    const times = [];

    // Mock messages for extraction
    const mockMessages = [
      {
        type: 'assistant',
        content: [
          { type: 'text', text: 'Test intelligence summary for performance testing.' }
        ]
      }
    ];

    for (let i = 0; i < iterations; i++) {
      const start = performance.now();
      await worker.extractIntelligence('link-logger-agent', mockMessages);
      const duration = performance.now() - start;
      times.push(duration);
    }

    const avgTime = times.reduce((a, b) => a + b, 0) / times.length;
    const maxTime = Math.max(...times);

    console.log(`\n📊 extractIntelligence (full flow) Performance:`);
    console.log(`   Average: ${avgTime.toFixed(2)}ms`);
    console.log(`   Max: ${maxTime.toFixed(2)}ms`);
    console.log(`   Min: ${Math.min(...times).toFixed(2)}ms`);

    expect(avgTime).toBeLessThan(150);
    expect(maxTime).toBeLessThan(300);
  }, 10000);

  test('PERF-004: Frontmatter parsing should handle large files efficiently', async () => {
    // Create a large agent file for testing
    const testAgentPath = path.join('/tmp', 'large-test-agent.md');
    const largeFrontmatter = `---
name: large-test-agent
tier: 1
visibility: public
posts_as_self: true
icon: TestIcon
icon_type: svg
icon_emoji: 🧪
${Array(100).fill('extra_field: value').join('\n')}
---

${'# Large Agent Instructions\n\n'.repeat(100)}
This is a very large agent file with lots of content for performance testing.
${'Lorem ipsum dolor sit amet, consectetur adipiscing elit. '.repeat(50)}
`;

    await fs.writeFile(testAgentPath, largeFrontmatter, 'utf-8');

    const iterations = 5;
    const times = [];

    for (let i = 0; i < iterations; i++) {
      const start = performance.now();
      await worker.readAgentFrontmatter('large-test-agent', '/tmp');
      const duration = performance.now() - start;
      times.push(duration);
    }

    // Cleanup
    await fs.unlink(testAgentPath);

    const avgTime = times.reduce((a, b) => a + b, 0) / times.length;
    const maxTime = Math.max(...times);

    console.log(`\n📊 Large File Frontmatter Parsing Performance:`);
    console.log(`   File size: ~${Math.round(largeFrontmatter.length / 1024)}KB`);
    console.log(`   Average: ${avgTime.toFixed(2)}ms`);
    console.log(`   Max: ${maxTime.toFixed(2)}ms`);

    expect(avgTime).toBeLessThan(100);
  }, 10000);

  test('PERF-005: Memory usage should remain stable during extraction', async () => {
    const initialMemory = process.memoryUsage().heapUsed;

    // Run extraction 100 times
    for (let i = 0; i < 100; i++) {
      await worker.readAgentFrontmatter('link-logger-agent', agentsDir);
    }

    // Force garbage collection if available
    if (global.gc) {
      global.gc();
    }

    const finalMemory = process.memoryUsage().heapUsed;
    const memoryIncrease = (finalMemory - initialMemory) / 1024 / 1024; // MB

    console.log(`\n📊 Memory Usage After 100 Extractions:`);
    console.log(`   Initial: ${(initialMemory / 1024 / 1024).toFixed(2)}MB`);
    console.log(`   Final: ${(finalMemory / 1024 / 1024).toFixed(2)}MB`);
    console.log(`   Increase: ${memoryIncrease.toFixed(2)}MB`);

    // Memory increase should be minimal (< 10MB for 100 operations)
    expect(memoryIncrease).toBeLessThan(10);
  }, 15000);
});
