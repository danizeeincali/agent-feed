#!/usr/bin/env node

/**
 * API Endpoint Response Time Benchmark
 * Tests full HTTP request/response cycle
 */

import { spawn } from 'child_process';
import { performance } from 'perf_hooks';
import { writeFileSync } from 'fs';

function formatTime(ms) {
  if (ms < 1) return `${(ms * 1000).toFixed(2)}μs`;
  if (ms < 1000) return `${ms.toFixed(2)}ms`;
  return `${(ms / 1000).toFixed(2)}s`;
}

function calculateStats(times) {
  const sorted = [...times].sort((a, b) => a - b);
  const len = sorted.length;
  return {
    min: sorted[0],
    max: sorted[len - 1],
    mean: times.reduce((a, b) => a + b, 0) / len,
    p50: sorted[Math.floor(len * 0.50)],
    p95: sorted[Math.floor(len * 0.95)],
    p99: sorted[Math.floor(len * 0.99)],
    count: len
  };
}

async function makeRequest(url) {
  return new Promise((resolve, reject) => {
    const start = performance.now();

    fetch(url)
      .then(res => {
        if (!res.ok) throw new Error(`HTTP ${res.status}`);
        return res.json();
      })
      .then(data => {
        const end = performance.now();
        resolve({
          time: end - start,
          postCount: data.posts ? data.posts.length : 0,
          totalCount: data.total || 0
        });
      })
      .catch(err => {
        reject(err);
      });
  });
}

async function runBenchmark() {
  console.log('🔬 API Endpoint Response Time Benchmark\n');

  // Check if server is running
  console.log('📡 Checking if server is running...');
  try {
    const response = await fetch('http://localhost:3001/health');
    if (!response.ok) {
      console.error('❌ Server is not responding. Please start the server first.');
      process.exit(1);
    }
    console.log('✅ Server is running\n');
  } catch (error) {
    console.error('❌ Server is not running. Please start the server first.');
    console.error('   Run: cd /workspaces/agent-feed/api-server && npm start\n');
    process.exit(1);
  }

  const results = {
    timestamp: new Date().toISOString(),
    tests: []
  };

  // Test 1: Sequential requests
  console.log('🔍 TEST 1: Sequential Requests (100 requests)\n');

  const sequentialTimes = [];
  for (let i = 0; i < 100; i++) {
    try {
      const result = await makeRequest('http://localhost:3001/api/agent-posts?limit=10&offset=0');
      sequentialTimes.push(result.time);

      if (i % 25 === 0) {
        console.log(`  Progress: ${i}/100 requests completed`);
      }
    } catch (error) {
      console.error(`  Request ${i} failed:`, error.message);
    }
  }

  const sequentialStats = calculateStats(sequentialTimes);

  console.log(`\n  Results:`);
  console.log(`    Total Requests: ${sequentialStats.count}`);
  console.log(`    Mean: ${formatTime(sequentialStats.mean)}`);
  console.log(`    P50:  ${formatTime(sequentialStats.p50)}`);
  console.log(`    P95:  ${formatTime(sequentialStats.p95)}`);
  console.log(`    P99:  ${formatTime(sequentialStats.p99)}`);
  console.log(`    Range: ${formatTime(sequentialStats.min)} - ${formatTime(sequentialStats.max)}\n`);

  results.tests.push({
    name: 'Sequential Requests',
    requestCount: 100,
    stats: sequentialStats
  });

  // Test 2: Different limit values
  console.log('🔍 TEST 2: Different LIMIT Values\n');

  const limitTests = [
    { limit: 10, iterations: 50 },
    { limit: 50, iterations: 50 },
    { limit: 100, iterations: 50 }
  ];

  for (const test of limitTests) {
    console.log(`  Testing LIMIT ${test.limit}:`);

    const times = [];
    for (let i = 0; i < test.iterations; i++) {
      try {
        const result = await makeRequest(`http://localhost:3001/api/agent-posts?limit=${test.limit}&offset=0`);
        times.push(result.time);
      } catch (error) {
        console.error(`    Request failed:`, error.message);
      }
    }

    const stats = calculateStats(times);

    console.log(`    Mean: ${formatTime(stats.mean)}`);
    console.log(`    P95:  ${formatTime(stats.p95)}\n`);

    results.tests.push({
      name: `LIMIT ${test.limit}`,
      requestCount: test.iterations,
      stats
    });
  }

  // Test 3: Concurrent requests
  console.log('🔍 TEST 3: Concurrent Requests (10 concurrent batches)\n');

  const concurrentTimes = [];
  const concurrency = 10;
  const totalRequests = 100;

  for (let batch = 0; batch < totalRequests / concurrency; batch++) {
    const batchStart = performance.now();

    const promises = [];
    for (let i = 0; i < concurrency; i++) {
      promises.push(makeRequest('http://localhost:3001/api/agent-posts?limit=10&offset=0'));
    }

    try {
      const results = await Promise.all(promises);
      results.forEach(r => concurrentTimes.push(r.time));

      console.log(`  Batch ${batch + 1}/${totalRequests / concurrency} completed`);
    } catch (error) {
      console.error(`  Batch ${batch + 1} failed:`, error.message);
    }
  }

  const concurrentStats = calculateStats(concurrentTimes);

  console.log(`\n  Results:`);
  console.log(`    Total Requests: ${concurrentStats.count}`);
  console.log(`    Mean: ${formatTime(concurrentStats.mean)}`);
  console.log(`    P50:  ${formatTime(concurrentStats.p50)}`);
  console.log(`    P95:  ${formatTime(concurrentStats.p95)}`);
  console.log(`    P99:  ${formatTime(concurrentStats.p99)}\n`);

  results.tests.push({
    name: 'Concurrent Requests',
    requestCount: concurrentTimes.length,
    concurrency,
    stats: concurrentStats
  });

  // Generate summary
  console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
  console.log('📊 API RESPONSE TIME SUMMARY');
  console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
  console.log(`\n🔹 Sequential Requests:`);
  console.log(`   P95: ${formatTime(sequentialStats.p95)}`);
  console.log(`   Mean: ${formatTime(sequentialStats.mean)}`);
  console.log(`\n🔹 Concurrent Requests:`);
  console.log(`   P95: ${formatTime(concurrentStats.p95)}`);
  console.log(`   Mean: ${formatTime(concurrentStats.mean)}`);
  console.log(`\n🔹 Success Criteria:`);
  console.log(`   ${sequentialStats.p95 < 100 ? '✅' : '⚠️'} API response time < 100ms P95: ${formatTime(sequentialStats.p95)}`);
  console.log('\n━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n');

  // Append to benchmark report
  const appendix = `

---

## Test 5: API Endpoint Response Time

### Sequential Requests (100 iterations)

| Metric | Time |
|--------|------|
| Mean | ${formatTime(sequentialStats.mean)} |
| P50 | ${formatTime(sequentialStats.p50)} |
| P95 | ${formatTime(sequentialStats.p95)} |
| P99 | ${formatTime(sequentialStats.p99)} |
| Min | ${formatTime(sequentialStats.min)} |
| Max | ${formatTime(sequentialStats.max)} |

### Different LIMIT Values

| LIMIT | Mean | P95 |
|-------|------|-----|
${results.tests.filter(t => t.name.startsWith('LIMIT')).map(test =>
  `| ${test.name.replace('LIMIT ', '')} | ${formatTime(test.stats.mean)} | ${formatTime(test.stats.p95)} |`
).join('\n')}

### Concurrent Requests (${concurrency} concurrent)

| Metric | Time |
|--------|------|
| Mean | ${formatTime(concurrentStats.mean)} |
| P95 | ${formatTime(concurrentStats.p95)} |
| P99 | ${formatTime(concurrentStats.p99)} |

**Analysis:**
- ${sequentialStats.p95 < 100 ? '✅ Meets 100ms P95 target' : '⚠️ Exceeds 100ms P95 target'}
- Full request cycle includes: Network + JSON parsing + Query execution
- ${concurrentStats.mean > sequentialStats.mean * 1.5 ? 'Significant' : 'Minimal'} performance degradation under concurrent load
- ${sequentialStats.p95 < 50 ? 'Excellent' : sequentialStats.p95 < 100 ? 'Good' : 'Acceptable'} overall API performance

**Breakdown:**
- Query execution: ~${formatTime(0.8)} (from direct query benchmark)
- API overhead: ~${formatTime(sequentialStats.mean - 0.8)} (routing, JSON parsing, response formatting)

`;

  // Append to existing report
  try {
    const existingReport = require('fs').readFileSync(
      '/workspaces/agent-feed/api-server/PERFORMANCE_BENCHMARK_PRIORITY_SORTING.md',
      'utf8'
    );

    // Insert before the "Appendix: Raw Data" section
    const updatedReport = existingReport.replace(
      '## Appendix: Raw Data',
      appendix + '\n## Appendix: Raw Data'
    );

    writeFileSync(
      '/workspaces/agent-feed/api-server/PERFORMANCE_BENCHMARK_PRIORITY_SORTING.md',
      updatedReport
    );

    console.log('✅ API benchmark results appended to report\n');
  } catch (error) {
    console.error('⚠️  Could not append to existing report:', error.message);
    writeFileSync(
      '/workspaces/agent-feed/api-server/API_RESPONSE_BENCHMARK.md',
      appendix
    );
    console.log('✅ API benchmark results saved separately\n');
  }
}

runBenchmark().catch(error => {
  console.error('❌ Benchmark failed:', error);
  process.exit(1);
});
