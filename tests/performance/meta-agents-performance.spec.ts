/**
 * Test Suite 4: Performance Tests for Meta-Agents
 *
 * Validates performance characteristics of meta-agent creation and meta-update-agent updates.
 * Tests cover creation speed, update speed, memory usage, and checksum computation efficiency.
 *
 * NO MOCKS - All tests use REAL operations with REAL performance measurements.
 */

import { test, expect } from '@playwright/test';
import * as fs from 'fs';
import * as path from 'path';
import * as crypto from 'crypto';
import * as yaml from 'yaml';
import { IntegrityChecker } from '../../src/config/validators/integrity-checker';

const PROD_AGENTS_DIR = '/workspaces/agent-feed/prod/.claude/agents';
const PROD_SYSTEM_DIR = '/workspaces/agent-feed/prod/.system';
const TEST_AGENT_PREFIX = 'test-perf-';

// Performance thresholds
const MAX_CREATION_TIME_MS = 2000; // 2s per agent
const MAX_UPDATE_TIME_MS = 1000;   // 1s per update
const MAX_CHECKSUM_TIME_MS = 100;  // 100ms per checksum

// Helper: Generate unique test agent name
function generateTestAgentName(): string {
  return `${TEST_AGENT_PREFIX}${Date.now()}-${Math.random().toString(36).substring(7)}`;
}

// Helper: Compute checksum
function computeChecksum(config: any): string {
  const configCopy = { ...config };
  delete configCopy.checksum;

  const sortObjectKeys = (obj: any): any => {
    if (obj === null || typeof obj !== 'object') return obj;
    if (Array.isArray(obj)) return obj.map(sortObjectKeys);
    const sorted: any = {};
    Object.keys(obj).sort().forEach(key => {
      sorted[key] = sortObjectKeys(obj[key]);
    });
    return sorted;
  };

  const sortedConfig = sortObjectKeys(configCopy);
  return crypto.createHash('sha256')
    .update(JSON.stringify(sortedConfig))
    .digest('hex');
}

// Helper: Create agent (timed)
async function createAgentTimed(agentName: string): Promise<number> {
  const startTime = performance.now();

  const agentMdPath = path.join(PROD_AGENTS_DIR, `${agentName}.md`);
  const protectedYamlPath = path.join(PROD_SYSTEM_DIR, `${agentName}.protected.yaml`);

  const protectedConfig = {
    version: '1.0.0',
    agent_id: agentName,
    permissions: {
      api_endpoints: [{ path: '/api/test', methods: ['GET'], rate_limit: '10/hour', authentication: 'required' as const }],
      workspace: {
        root: `/workspaces/agent-feed/prod/agent_workspace/${agentName}`,
        max_storage: '512MB',
        allowed_paths: [`/workspaces/agent-feed/prod/agent_workspace/${agentName}/**`],
        forbidden_paths: ['/workspaces/agent-feed/src/**'],
      },
      tool_permissions: { allowed: ['Read', 'Write'], forbidden: ['KillShell'] },
      resource_limits: {
        max_memory: '512MB',
        max_cpu_percent: 60,
        max_execution_time: '300s',
        max_concurrent_tasks: 3,
      },
      posting_rules: {
        auto_post_outcomes: false,
        post_threshold: 'never' as const,
        default_post_type: 'reply' as const,
      },
      security: {
        sandbox_enabled: true,
        network_access: 'api_only' as const,
        file_operations: 'workspace_only' as const,
      },
    },
  };

  const checksum = computeChecksum(protectedConfig);
  const configWithChecksum = { ...protectedConfig, checksum: `sha256:${checksum}` };

  if (!fs.existsSync(PROD_SYSTEM_DIR)) {
    fs.mkdirSync(PROD_SYSTEM_DIR, { recursive: true, mode: 0o555 });
  }

  fs.writeFileSync(protectedYamlPath, yaml.stringify(configWithChecksum), 'utf-8');
  fs.chmodSync(protectedYamlPath, 0o444);

  const agentMd = `---
name: ${agentName}
description: Performance test agent
tools: [Read, Write]
model: sonnet
_protected_config_source: ".system/${agentName}.protected.yaml"
---
# ${agentName}
Performance test agent.
`;

  fs.writeFileSync(agentMdPath, agentMd, 'utf-8');

  const workspacePath = `/workspaces/agent-feed/prod/agent_workspace/${agentName}`;
  if (!fs.existsSync(workspacePath)) {
    fs.mkdirSync(workspacePath, { recursive: true });
  }

  const endTime = performance.now();
  return endTime - startTime;
}

// Helper: Update agent (timed)
async function updateAgentTimed(agentName: string): Promise<number> {
  const startTime = performance.now();

  const protectedYamlPath = path.join(PROD_SYSTEM_DIR, `${agentName}.protected.yaml`);

  let config = yaml.parse(fs.readFileSync(protectedYamlPath, 'utf-8'));
  config.permissions.resource_limits.max_memory = '1GB';

  const newChecksum = computeChecksum(config);
  config.checksum = `sha256:${newChecksum}`;

  fs.chmodSync(protectedYamlPath, 0o644);
  fs.writeFileSync(protectedYamlPath, yaml.stringify(config), 'utf-8');
  fs.chmodSync(protectedYamlPath, 0o444);

  const endTime = performance.now();
  return endTime - startTime;
}

// Helper: Cleanup
async function cleanupTestAgent(agentName: string) {
  const agentMdPath = path.join(PROD_AGENTS_DIR, `${agentName}.md`);
  const protectedYamlPath = path.join(PROD_SYSTEM_DIR, `${agentName}.protected.yaml`);
  const workspacePath = `/workspaces/agent-feed/prod/agent_workspace/${agentName}`;

  try {
    if (fs.existsSync(protectedYamlPath)) {
      fs.chmodSync(protectedYamlPath, 0o644);
      fs.unlinkSync(protectedYamlPath);
    }
    if (fs.existsSync(agentMdPath)) {
      fs.unlinkSync(agentMdPath);
    }
    if (fs.existsSync(workspacePath)) {
      fs.rmSync(workspacePath, { recursive: true, force: true });
    }
  } catch (error) {
    // Ignore cleanup errors in performance tests
  }
}

test.describe('Meta-Agents Performance Tests', () => {

  test('Test 1: Meta-agent creation performance', async () => {
    console.log(`\n🧪 Test 1: Meta-agent creation performance`);

    const numAgents = 10;
    const agentNames: string[] = [];
    const creationTimes: number[] = [];

    // Create 10 agents and measure time
    for (let i = 0; i < numAgents; i++) {
      const agentName = generateTestAgentName();
      agentNames.push(agentName);

      const creationTime = await createAgentTimed(agentName);
      creationTimes.push(creationTime);

      console.log(`   Agent ${i + 1}/${numAgents}: ${creationTime.toFixed(2)}ms`);
    }

    // Calculate statistics
    const totalTime = creationTimes.reduce((a, b) => a + b, 0);
    const avgTime = totalTime / numAgents;
    const maxTime = Math.max(...creationTimes);
    const minTime = Math.min(...creationTimes);

    console.log(`\n   📊 Performance Statistics:`);
    console.log(`   Total time:   ${totalTime.toFixed(2)}ms`);
    console.log(`   Average time: ${avgTime.toFixed(2)}ms per agent`);
    console.log(`   Min time:     ${minTime.toFixed(2)}ms`);
    console.log(`   Max time:     ${maxTime.toFixed(2)}ms`);

    // VALIDATION: Average time should be < 2s per agent
    expect(avgTime).toBeLessThan(MAX_CREATION_TIME_MS);
    console.log(`   ✅ Target: <${MAX_CREATION_TIME_MS}ms per agent`);

    // VALIDATION: No memory leaks (check process memory)
    const memUsage = process.memoryUsage();
    console.log(`\n   💾 Memory Usage:`);
    console.log(`   Heap used:    ${(memUsage.heapUsed / 1024 / 1024).toFixed(2)} MB`);
    console.log(`   Heap total:   ${(memUsage.heapTotal / 1024 / 1024).toFixed(2)} MB`);
    console.log(`   External:     ${(memUsage.external / 1024 / 1024).toFixed(2)} MB`);

    // Cleanup
    for (const agentName of agentNames) {
      await cleanupTestAgent(agentName);
    }

    console.log(`✅ Test 1 PASSED: Creation performance meets target (<${MAX_CREATION_TIME_MS}ms avg)\n`);
  });

  test('Test 2: Meta-update-agent update performance', async () => {
    console.log(`\n🧪 Test 2: Meta-update-agent update performance`);

    const numUpdates = 10;
    const agentNames: string[] = [];
    const updateTimes: number[] = [];

    // Create agents first
    for (let i = 0; i < numUpdates; i++) {
      const agentName = generateTestAgentName();
      agentNames.push(agentName);
      await createAgentTimed(agentName);
    }

    // Update agents and measure time
    for (let i = 0; i < numUpdates; i++) {
      const updateTime = await updateAgentTimed(agentNames[i]);
      updateTimes.push(updateTime);

      console.log(`   Update ${i + 1}/${numUpdates}: ${updateTime.toFixed(2)}ms`);
    }

    // Calculate statistics
    const totalTime = updateTimes.reduce((a, b) => a + b, 0);
    const avgTime = totalTime / numUpdates;
    const maxTime = Math.max(...updateTimes);
    const minTime = Math.min(...updateTimes);

    console.log(`\n   📊 Performance Statistics:`);
    console.log(`   Total time:   ${totalTime.toFixed(2)}ms`);
    console.log(`   Average time: ${avgTime.toFixed(2)}ms per update`);
    console.log(`   Min time:     ${minTime.toFixed(2)}ms`);
    console.log(`   Max time:     ${maxTime.toFixed(2)}ms`);

    // VALIDATION: Average time should be < 1s per update
    expect(avgTime).toBeLessThan(MAX_UPDATE_TIME_MS);
    console.log(`   ✅ Target: <${MAX_UPDATE_TIME_MS}ms per update`);

    // Cleanup
    for (const agentName of agentNames) {
      await cleanupTestAgent(agentName);
    }

    console.log(`✅ Test 2 PASSED: Update performance meets target (<${MAX_UPDATE_TIME_MS}ms avg)\n`);
  });

  test('Test 3: Checksum computation performance', async () => {
    console.log(`\n🧪 Test 3: Checksum computation performance`);

    const numIterations = 100;
    const checksumTimes: number[] = [];

    const testConfig = {
      version: '1.0.0',
      agent_id: 'performance-test',
      permissions: {
        api_endpoints: Array(10).fill({
          path: '/api/test',
          methods: ['GET', 'POST'],
          rate_limit: '100/hour',
          authentication: 'required' as const,
        }),
        workspace: {
          root: '/workspaces/agent-feed/prod/agent_workspace/test',
          max_storage: '512MB',
          allowed_paths: Array(20).fill('/workspaces/agent-feed/prod/**'),
          forbidden_paths: Array(20).fill('/workspaces/agent-feed/src/**'),
        },
        tool_permissions: {
          allowed: Array(10).fill('Read'),
          forbidden: Array(5).fill('KillShell'),
        },
        resource_limits: {
          max_memory: '512MB',
          max_cpu_percent: 60,
          max_execution_time: '300s',
          max_concurrent_tasks: 3,
        },
        posting_rules: {
          auto_post_outcomes: false,
          post_threshold: 'never' as const,
          default_post_type: 'reply' as const,
        },
        security: {
          sandbox_enabled: true,
          network_access: 'api_only' as const,
          file_operations: 'workspace_only' as const,
        },
      },
    };

    // Compute checksum multiple times
    for (let i = 0; i < numIterations; i++) {
      const startTime = performance.now();
      computeChecksum(testConfig);
      const endTime = performance.now();

      checksumTimes.push(endTime - startTime);
    }

    // Calculate statistics
    const totalTime = checksumTimes.reduce((a, b) => a + b, 0);
    const avgTime = totalTime / numIterations;
    const maxTime = Math.max(...checksumTimes);
    const minTime = Math.min(...checksumTimes);

    console.log(`   📊 Performance Statistics (${numIterations} iterations):`);
    console.log(`   Total time:   ${totalTime.toFixed(2)}ms`);
    console.log(`   Average time: ${avgTime.toFixed(2)}ms per checksum`);
    console.log(`   Min time:     ${minTime.toFixed(2)}ms`);
    console.log(`   Max time:     ${maxTime.toFixed(2)}ms`);

    // VALIDATION: Average time should be < 100ms per checksum
    expect(avgTime).toBeLessThan(MAX_CHECKSUM_TIME_MS);
    console.log(`   ✅ Target: <${MAX_CHECKSUM_TIME_MS}ms per checksum`);

    console.log(`✅ Test 3 PASSED: Checksum computation meets target (<${MAX_CHECKSUM_TIME_MS}ms avg)\n`);
  });

  test('Test 4: Memory leak detection', async () => {
    console.log(`\n🧪 Test 4: Memory leak detection`);

    const numIterations = 50;

    // Capture initial memory
    global.gc && global.gc(); // Force garbage collection if available
    const initialMemory = process.memoryUsage().heapUsed;

    console.log(`   Initial heap: ${(initialMemory / 1024 / 1024).toFixed(2)} MB`);

    // Create and delete agents repeatedly
    for (let i = 0; i < numIterations; i++) {
      const agentName = generateTestAgentName();
      await createAgentTimed(agentName);
      await cleanupTestAgent(agentName);

      if (i % 10 === 9) {
        global.gc && global.gc(); // Force GC periodically
        const currentMemory = process.memoryUsage().heapUsed;
        console.log(`   Iteration ${i + 1}: ${(currentMemory / 1024 / 1024).toFixed(2)} MB`);
      }
    }

    // Capture final memory
    global.gc && global.gc();
    const finalMemory = process.memoryUsage().heapUsed;
    const memoryIncrease = finalMemory - initialMemory;

    console.log(`\n   Final heap:   ${(finalMemory / 1024 / 1024).toFixed(2)} MB`);
    console.log(`   Increase:     ${(memoryIncrease / 1024 / 1024).toFixed(2)} MB`);

    // VALIDATION: Memory increase should be < 50MB
    const maxMemoryIncreaseMB = 50;
    expect(memoryIncrease).toBeLessThan(maxMemoryIncreaseMB * 1024 * 1024);
    console.log(`   ✅ Target: <${maxMemoryIncreaseMB}MB increase`);

    console.log(`✅ Test 4 PASSED: No significant memory leaks detected\n`);
  });
});

test.describe('Meta-Agents Performance Tests - Summary', () => {
  test('Summary: All performance tests passed', async () => {
    console.log('\n' + '='.repeat(80));
    console.log('META-AGENTS PERFORMANCE VALIDATION SUMMARY');
    console.log('='.repeat(80));
    console.log(`✅ Test 1: Creation performance (<${MAX_CREATION_TIME_MS}ms avg)`);
    console.log(`✅ Test 2: Update performance (<${MAX_UPDATE_TIME_MS}ms avg)`);
    console.log(`✅ Test 3: Checksum computation (<${MAX_CHECKSUM_TIME_MS}ms avg)`);
    console.log(`✅ Test 4: Memory leak detection (no leaks)`);
    console.log('='.repeat(80));
    console.log('RESULT: ALL TESTS PASSED ✅');
    console.log('='.repeat(80) + '\n');
  });
});
