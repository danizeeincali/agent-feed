#!/usr/bin/env tsx

/**
 * Agent Loading Performance Benchmark
 *
 * Tests performance metrics for protected agent loading:
 * - Cold load times
 * - Cached load times
 * - Batch loading performance
 * - Memory usage
 * - Integrity check overhead
 */

import fs from 'fs';
import path from 'path';
import crypto from 'crypto';
import yaml from 'yaml';

// Color codes
const colors = {
  reset: '\x1b[0m',
  green: '\x1b[32m',
  yellow: '\x1b[33m',
  blue: '\x1b[34m',
  cyan: '\x1b[36m',
  bold: '\x1b[1m',
};

function log(message: string, color: keyof typeof colors = 'reset') {
  console.log(`${colors[color]}${message}${colors.reset}`);
}

interface PerformanceMetrics {
  agent: string;
  coldLoadTime: number;
  cachedLoadTime: number;
  integrityCheckTime: number;
  configSize: number;
  memoryUsed: number;
}

const PROD_AGENTS_DIR = '/workspaces/agent-feed/prod/.claude/agents';
const SYSTEM_DIR = '/workspaces/agent-feed/prod/.claude/agents/.system';

const MIGRATED_AGENTS = [
  'agent-feedback-agent',
  'agent-ideas-agent',
  'dynamic-page-testing-agent',
  'follow-ups-agent',
  'get-to-know-you-agent',
  'link-logger-agent',
  'meeting-next-steps-agent',
  'meeting-prep-agent',
  'meta-agent',
  'meta-update-agent',
  'page-builder-agent',
  'page-verification-agent',
  'personal-todos-agent',
];

// Simple in-memory cache
const cache = new Map<string, any>();

/**
 * Load agent with cold start (no cache)
 */
function loadAgentCold(agentName: string): { config: any; time: number } {
  const startTime = performance.now();

  // Load markdown file
  const mdPath = path.join(PROD_AGENTS_DIR, `${agentName}.md`);
  const mdContent = fs.readFileSync(mdPath, 'utf8');

  // Load protected config
  const configPath = path.join(SYSTEM_DIR, `${agentName}.protected.yaml`);
  const configContent = fs.readFileSync(configPath, 'utf8');
  const config = yaml.parse(configContent);

  const endTime = performance.now();

  return {
    config,
    time: endTime - startTime,
  };
}

/**
 * Load agent from cache
 */
function loadAgentCached(agentName: string): { config: any; time: number } {
  const startTime = performance.now();

  if (cache.has(agentName)) {
    const config = cache.get(agentName);
    const endTime = performance.now();
    return { config, time: endTime - startTime };
  }

  // Cold load if not cached
  const result = loadAgentCold(agentName);
  cache.set(agentName, result.config);

  const endTime = performance.now();
  return { config: result.config, time: endTime - startTime };
}

/**
 * Measure integrity check performance
 */
function measureIntegrityCheck(agentName: string): number {
  const configPath = path.join(SYSTEM_DIR, `${agentName}.protected.yaml`);
  const configContent = fs.readFileSync(configPath, 'utf8');

  const startTime = performance.now();

  // Parse YAML
  const config = yaml.parse(configContent);

  // Compute checksum (from YAML string without checksum line)
  const lines = configContent.split('\n');
  const linesWithoutChecksum = lines.filter(line => !line.includes('checksum:'));
  const contentWithoutChecksum = linesWithoutChecksum.join('\n');
  const computedChecksum = crypto.createHash('sha256').update(contentWithoutChecksum, 'utf-8').digest('hex');

  // Verify checksum
  const storedChecksum = config.checksum?.replace('sha256:', '') || '';
  const isValid = computedChecksum === storedChecksum;

  const endTime = performance.now();

  return endTime - startTime;
}

/**
 * Get memory usage in MB
 */
function getMemoryUsage(): number {
  const used = process.memoryUsage();
  return used.heapUsed / 1024 / 1024; // Convert to MB
}

/**
 * Get config file size in KB
 */
function getConfigSize(agentName: string): number {
  const configPath = path.join(SYSTEM_DIR, `${agentName}.protected.yaml`);
  const stats = fs.statSync(configPath);
  return stats.size / 1024; // Convert to KB
}

/**
 * Run performance benchmarks
 */
async function runBenchmarks() {
  log('\n╔═══════════════════════════════════════════════════════════════════╗', 'cyan');
  log('║         AGENT LOADING PERFORMANCE BENCHMARK SUITE                 ║', 'bold');
  log('╚═══════════════════════════════════════════════════════════════════╝\n', 'cyan');

  const metrics: PerformanceMetrics[] = [];

  log('Running benchmarks for 13 migrated agents...\n', 'blue');

  for (const agentName of MIGRATED_AGENTS) {
    log(`\nBenchmarking: ${agentName}`, 'cyan');

    const initialMemory = getMemoryUsage();

    // Cold load
    const coldLoad = loadAgentCold(agentName);
    log(`  Cold Load: ${coldLoad.time.toFixed(2)}ms`, 'yellow');

    // Cached load (populate cache first)
    cache.set(agentName, coldLoad.config);
    const cachedLoad = loadAgentCached(agentName);
    log(`  Cached Load: ${cachedLoad.time.toFixed(2)}ms`, 'green');

    // Integrity check
    const integrityTime = measureIntegrityCheck(agentName);
    log(`  Integrity Check: ${integrityTime.toFixed(2)}ms`, 'yellow');

    // Config size
    const configSize = getConfigSize(agentName);
    log(`  Config Size: ${configSize.toFixed(2)} KB`, 'blue');

    const finalMemory = getMemoryUsage();
    const memoryUsed = finalMemory - initialMemory;

    metrics.push({
      agent: agentName,
      coldLoadTime: coldLoad.time,
      cachedLoadTime: cachedLoad.time,
      integrityCheckTime: integrityTime,
      configSize,
      memoryUsed,
    });
  }

  // Batch load test
  log('\n\n📦 Batch Loading Test (all 13 agents)...', 'bold');
  const batchStartTime = performance.now();
  for (const agentName of MIGRATED_AGENTS) {
    loadAgentCold(agentName);
  }
  const batchEndTime = performance.now();
  const batchTime = batchEndTime - batchStartTime;
  log(`  Total Time: ${batchTime.toFixed(2)}ms`, 'cyan');
  log(`  Average: ${(batchTime / MIGRATED_AGENTS.length).toFixed(2)}ms per agent`, 'cyan');

  // Summary statistics
  log('\n\n╔═══════════════════════════════════════════════════════════════════╗', 'cyan');
  log('║                     PERFORMANCE SUMMARY                           ║', 'bold');
  log('╚═══════════════════════════════════════════════════════════════════╝\n', 'cyan');

  const avgColdLoad = metrics.reduce((sum, m) => sum + m.coldLoadTime, 0) / metrics.length;
  const avgCachedLoad = metrics.reduce((sum, m) => sum + m.cachedLoadTime, 0) / metrics.length;
  const avgIntegrityCheck = metrics.reduce((sum, m) => sum + m.integrityCheckTime, 0) / metrics.length;
  const avgConfigSize = metrics.reduce((sum, m) => sum + m.configSize, 0) / metrics.length;

  const maxColdLoad = Math.max(...metrics.map(m => m.coldLoadTime));
  const minColdLoad = Math.min(...metrics.map(m => m.coldLoadTime));
  const maxCachedLoad = Math.max(...metrics.map(m => m.cachedLoadTime));
  const minCachedLoad = Math.min(...metrics.map(m => m.cachedLoadTime));

  log(`Average Cold Load:       ${avgColdLoad.toFixed(2)}ms`, 'yellow');
  log(`  Range:                 ${minColdLoad.toFixed(2)}ms - ${maxColdLoad.toFixed(2)}ms`, 'yellow');
  log(`  Target:                <200ms`, 'yellow');
  log(`  Status:                ${avgColdLoad < 200 ? '✅ PASS' : '❌ FAIL'}`, avgColdLoad < 200 ? 'green' : 'yellow');

  log(`\nAverage Cached Load:     ${avgCachedLoad.toFixed(2)}ms`, 'green');
  log(`  Range:                 ${minCachedLoad.toFixed(2)}ms - ${maxCachedLoad.toFixed(2)}ms`, 'green');
  log(`  Target:                <5ms`, 'green');
  log(`  Status:                ${avgCachedLoad < 5 ? '✅ PASS' : '❌ FAIL'}`, avgCachedLoad < 5 ? 'green' : 'yellow');

  log(`\nAverage Integrity Check: ${avgIntegrityCheck.toFixed(2)}ms`, 'yellow');
  log(`  Target:                <5ms`, 'yellow');
  log(`  Status:                ${avgIntegrityCheck < 5 ? '✅ PASS' : '❌ FAIL'}`, avgIntegrityCheck < 5 ? 'green' : 'yellow');

  log(`\nAverage Config Size:     ${avgConfigSize.toFixed(2)} KB`, 'blue');
  log(`\nBatch Load (13 agents):  ${batchTime.toFixed(2)}ms`, 'cyan');
  log(`  Target:                <3000ms`, 'cyan');
  log(`  Status:                ${batchTime < 3000 ? '✅ PASS' : '❌ FAIL'}`, batchTime < 3000 ? 'green' : 'yellow');

  // Speed improvement from caching
  const speedupFactor = avgColdLoad / avgCachedLoad;
  log(`\n🚀 Cache Speedup:        ${speedupFactor.toFixed(1)}x faster`, 'green');

  // Success criteria
  log('\n\n╔═══════════════════════════════════════════════════════════════════╗', 'cyan');
  log('║                     SUCCESS CRITERIA                              ║', 'bold');
  log('╚═══════════════════════════════════════════════════════════════════╝\n', 'cyan');

  const coldLoadPass = avgColdLoad < 200;
  const cachedLoadPass = avgCachedLoad < 5;
  const integrityPass = avgIntegrityCheck < 5;
  const batchPass = batchTime < 3000;

  log(`${coldLoadPass ? '✅' : '❌'} Cold Load < 200ms: ${avgColdLoad.toFixed(2)}ms`, coldLoadPass ? 'green' : 'yellow');
  log(`${cachedLoadPass ? '✅' : '❌'} Cached Load < 5ms: ${avgCachedLoad.toFixed(2)}ms`, cachedLoadPass ? 'green' : 'yellow');
  log(`${integrityPass ? '✅' : '❌'} Integrity Check < 5ms: ${avgIntegrityCheck.toFixed(2)}ms`, integrityPass ? 'green' : 'yellow');
  log(`${batchPass ? '✅' : '❌'} Batch Load < 3s: ${batchTime.toFixed(2)}ms`, batchPass ? 'green' : 'yellow');

  const allPassed = coldLoadPass && cachedLoadPass && integrityPass && batchPass;

  log('\n');
  if (allPassed) {
    log('🎉 ALL PERFORMANCE TARGETS MET!', 'green');
  } else {
    log('⚠️  SOME PERFORMANCE TARGETS NOT MET', 'yellow');
  }

  log('\n');

  // Export results as JSON
  const results = {
    summary: {
      avgColdLoad,
      avgCachedLoad,
      avgIntegrityCheck,
      avgConfigSize,
      batchTime,
      speedupFactor,
    },
    targets: {
      coldLoad: { target: 200, actual: avgColdLoad, passed: coldLoadPass },
      cachedLoad: { target: 5, actual: avgCachedLoad, passed: cachedLoadPass },
      integrityCheck: { target: 5, actual: avgIntegrityCheck, passed: integrityPass },
      batchLoad: { target: 3000, actual: batchTime, passed: batchPass },
    },
    metrics,
  };

  const resultsPath = '/workspaces/agent-feed/tests/performance/load-agents-results.json';
  fs.writeFileSync(resultsPath, JSON.stringify(results, null, 2));
  log(`✅ Results exported to: ${resultsPath}`, 'cyan');

  process.exit(allPassed ? 0 : 1);
}

// Run benchmarks
runBenchmarks().catch(error => {
  log(`\n❌ Benchmark failed: ${error.message}`, 'yellow');
  console.error(error);
  process.exit(1);
});
