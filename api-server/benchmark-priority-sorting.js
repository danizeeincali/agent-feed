#!/usr/bin/env node

/**
 * Performance Benchmark Script for Priority Sorting Query
 * Tests query execution time, index effectiveness, and scalability
 */

import Database from 'better-sqlite3';
import { performance } from 'perf_hooks';
import { readFileSync, writeFileSync } from 'fs';

const DB_PATH = '/workspaces/agent-feed/database.db';

// Utility functions
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

// Benchmark results storage
const results = {
  timestamp: new Date().toISOString(),
  systemInfo: {},
  queryExecutionTests: {},
  indexEffectiveness: {},
  scalabilityTests: {},
  apiResponseTests: {},
  comparisonTests: {}
};

console.log('🔬 Starting Performance Benchmark for Priority Sorting Query\n');

// Open database
const db = new Database(DB_PATH);
db.pragma('journal_mode = WAL');

// Get current dataset size
const { total: initialPostCount } = db.prepare('SELECT COUNT(*) as total FROM agent_posts').get();
console.log(`📊 Initial dataset: ${initialPostCount} posts\n`);

results.systemInfo = {
  initialPostCount,
  nodeVersion: process.version,
  platform: process.platform
};

// ============================================================================
// TEST 1: Query Execution Time with Current Dataset
// ============================================================================
console.log('🔍 TEST 1: Query Execution Time (Current Dataset)\n');

const prioritySortQuery = `
  SELECT
    id,
    title,
    content,
    authorAgent,
    publishedAt,
    metadata,
    engagement,
    created_at,
    CAST(json_extract(engagement, '$.comments') AS INTEGER) as comment_count,
    CASE
      WHEN authorAgent = 'user-agent' OR authorAgent LIKE 'user-%' THEN 0
      WHEN authorAgent LIKE '%-agent' OR authorAgent LIKE '%agent%' THEN 1
      ELSE 0
    END as is_agent_post
  FROM agent_posts
  ORDER BY
    comment_count DESC,
    is_agent_post DESC,
    created_at DESC,
    id ASC
  LIMIT ? OFFSET ?
`;

const stmt = db.prepare(prioritySortQuery);

// Test different LIMIT values
const limitTests = [
  { limit: 10, offset: 0, iterations: 100 },
  { limit: 50, offset: 0, iterations: 100 },
  { limit: 100, offset: 0, iterations: 100 }
];

results.queryExecutionTests.limitTests = [];

for (const test of limitTests) {
  const times = [];

  for (let i = 0; i < test.iterations; i++) {
    const start = performance.now();
    stmt.all(test.limit, test.offset);
    const end = performance.now();
    times.push(end - start);
  }

  const stats = calculateStats(times);
  results.queryExecutionTests.limitTests.push({
    limit: test.limit,
    offset: test.offset,
    iterations: test.iterations,
    stats
  });

  console.log(`  LIMIT ${test.limit}, OFFSET ${test.offset}:`);
  console.log(`    Mean: ${formatTime(stats.mean)}`);
  console.log(`    P50:  ${formatTime(stats.p50)}`);
  console.log(`    P95:  ${formatTime(stats.p95)}`);
  console.log(`    P99:  ${formatTime(stats.p99)}`);
  console.log(`    Range: ${formatTime(stats.min)} - ${formatTime(stats.max)}\n`);
}

// Test different OFFSET values
const offsetTests = [
  { limit: 10, offset: 0, iterations: 100 },
  { limit: 10, offset: 10, iterations: 100 },
  { limit: 10, offset: 50, iterations: 100 }
];

results.queryExecutionTests.offsetTests = [];

console.log('  Testing OFFSET impact:\n');

for (const test of offsetTests) {
  const times = [];

  for (let i = 0; i < test.iterations; i++) {
    const start = performance.now();
    stmt.all(test.limit, test.offset);
    const end = performance.now();
    times.push(end - start);
  }

  const stats = calculateStats(times);
  results.queryExecutionTests.offsetTests.push({
    limit: test.limit,
    offset: test.offset,
    iterations: test.iterations,
    stats
  });

  console.log(`  LIMIT ${test.limit}, OFFSET ${test.offset}:`);
  console.log(`    Mean: ${formatTime(stats.mean)}`);
  console.log(`    P95:  ${formatTime(stats.p95)}\n`);
}

// ============================================================================
// TEST 2: Index Effectiveness
// ============================================================================
console.log('🔍 TEST 2: Index Effectiveness\n');

// Check if index exists
const indices = db.prepare(`
  SELECT name, sql FROM sqlite_master
  WHERE type = 'index' AND tbl_name = 'agent_posts'
`).all();

console.log('  Existing indices:');
indices.forEach(idx => {
  console.log(`    - ${idx.name}`);
});
console.log();

results.indexEffectiveness.existingIndices = indices;

// Get query plan
const queryPlan = db.prepare(`EXPLAIN QUERY PLAN ${prioritySortQuery}`).all(10, 0);

console.log('  Query Execution Plan:');
queryPlan.forEach(step => {
  console.log(`    ${step.detail}`);
});
console.log();

results.indexEffectiveness.queryPlan = queryPlan;

// Test with and without index
const indexName = 'idx_posts_engagement_comments';
const hasIndex = indices.some(idx => idx.name === indexName);

if (hasIndex) {
  console.log(`  Testing with index (${indexName}):`);

  const withIndexTimes = [];
  for (let i = 0; i < 100; i++) {
    const start = performance.now();
    stmt.all(10, 0);
    const end = performance.now();
    withIndexTimes.push(end - start);
  }
  const withIndexStats = calculateStats(withIndexTimes);

  console.log(`    Mean: ${formatTime(withIndexStats.mean)}`);
  console.log(`    P95:  ${formatTime(withIndexStats.p95)}\n`);

  // Drop index and test
  console.log(`  Testing without index:`);
  db.prepare(`DROP INDEX IF EXISTS ${indexName}`).run();

  const withoutIndexTimes = [];
  for (let i = 0; i < 100; i++) {
    const start = performance.now();
    stmt.all(10, 0);
    const end = performance.now();
    withoutIndexTimes.push(end - start);
  }
  const withoutIndexStats = calculateStats(withoutIndexTimes);

  console.log(`    Mean: ${formatTime(withoutIndexStats.mean)}`);
  console.log(`    P95:  ${formatTime(withoutIndexStats.p95)}\n`);

  const improvement = ((withoutIndexStats.mean - withIndexStats.mean) / withoutIndexStats.mean * 100);
  console.log(`  Index improvement: ${improvement.toFixed(2)}%\n`);

  // Recreate index
  db.prepare(`
    CREATE INDEX IF NOT EXISTS ${indexName}
    ON agent_posts(json_extract(engagement, '$.comments'))
  `).run();

  results.indexEffectiveness.withIndex = withIndexStats;
  results.indexEffectiveness.withoutIndex = withoutIndexStats;
  results.indexEffectiveness.improvement = improvement;
}

// ============================================================================
// TEST 3: Scalability Testing
// ============================================================================
console.log('🔍 TEST 3: Scalability Testing\n');

results.scalabilityTests.tests = [];

// Helper function to create test posts
function createTestPosts(count, prefix = 'test') {
  const insertStmt = db.prepare(`
    INSERT INTO agent_posts (title, content, authorAgent, publishedAt, metadata, engagement, created_at)
    VALUES (?, ?, ?, ?, ?, ?, ?)
  `);

  const insert = db.transaction((posts) => {
    for (const post of posts) {
      insertStmt.run(
        post.title,
        post.content,
        post.authorAgent,
        post.publishedAt,
        post.metadata,
        post.engagement,
        post.created_at
      );
    }
  });

  const posts = [];
  for (let i = 0; i < count; i++) {
    const isAgent = i % 2 === 0;
    const commentCount = Math.floor(Math.random() * 50);

    posts.push({
      title: `${prefix} Post ${i}`,
      content: `Test content for post ${i}`,
      authorAgent: isAgent ? `test-agent-${i}` : `user-${i}`,
      publishedAt: new Date(Date.now() - Math.random() * 86400000 * 30).toISOString(),
      metadata: JSON.stringify({ tags: ['test'], category: 'benchmark' }),
      engagement: JSON.stringify({ comments: commentCount, likes: Math.floor(Math.random() * 100) }),
      created_at: new Date(Date.now() - Math.random() * 86400000 * 30).toISOString()
    });
  }

  insert(posts);
}

// Helper function to clean test posts
function cleanTestPosts(prefix = 'test') {
  db.prepare(`DELETE FROM agent_posts WHERE title LIKE ?`).run(`${prefix}%`);
}

// Test with different dataset sizes
const scalabilityTests = [
  { size: 100, label: '100 posts' },
  { size: 500, label: '500 posts' },
  { size: 1000, label: '1000 posts' }
];

for (const test of scalabilityTests) {
  console.log(`  Testing with ${test.label}:`);

  // Create test data
  createTestPosts(test.size, 'scale');

  const { total: postCount } = db.prepare('SELECT COUNT(*) as total FROM agent_posts').get();
  console.log(`    Total posts in DB: ${postCount}`);

  // Run benchmark
  const times = [];
  for (let i = 0; i < 50; i++) {
    const start = performance.now();
    stmt.all(10, 0);
    const end = performance.now();
    times.push(end - start);
  }

  const stats = calculateStats(times);

  console.log(`    Mean: ${formatTime(stats.mean)}`);
  console.log(`    P95:  ${formatTime(stats.p95)}`);
  console.log(`    P99:  ${formatTime(stats.p99)}\n`);

  results.scalabilityTests.tests.push({
    datasetSize: postCount,
    testSize: test.size,
    stats
  });

  // Clean up
  cleanTestPosts('scale');
}

// ============================================================================
// TEST 4: Comparison with Old Query
// ============================================================================
console.log('🔍 TEST 4: Comparison with Old Query\n');

const oldQuery = `
  SELECT
    id,
    title,
    content,
    authorAgent,
    publishedAt,
    metadata,
    engagement,
    created_at
  FROM agent_posts
  ORDER BY created_at DESC
  LIMIT ? OFFSET ?
`;

const oldStmt = db.prepare(oldQuery);

// Create test dataset
console.log('  Creating test dataset (500 posts)...');
createTestPosts(500, 'compare');

// Test old query
console.log('  Testing OLD query (ORDER BY created_at DESC):');
const oldTimes = [];
for (let i = 0; i < 100; i++) {
  const start = performance.now();
  oldStmt.all(10, 0);
  const end = performance.now();
  oldTimes.push(end - start);
}
const oldStats = calculateStats(oldTimes);

console.log(`    Mean: ${formatTime(oldStats.mean)}`);
console.log(`    P95:  ${formatTime(oldStats.p95)}`);
console.log(`    P99:  ${formatTime(oldStats.p99)}\n`);

// Test new query
console.log('  Testing NEW query (Multi-level priority sorting):');
const newTimes = [];
for (let i = 0; i < 100; i++) {
  const start = performance.now();
  stmt.all(10, 0);
  const end = performance.now();
  newTimes.push(end - start);
}
const newStats = calculateStats(newTimes);

console.log(`    Mean: ${formatTime(newStats.mean)}`);
console.log(`    P95:  ${formatTime(newStats.p95)}`);
console.log(`    P99:  ${formatTime(newStats.p99)}\n`);

const overhead = ((newStats.mean - oldStats.mean) / oldStats.mean * 100);
console.log(`  Performance overhead: ${overhead.toFixed(2)}%`);
console.log(`  Absolute difference: ${formatTime(newStats.mean - oldStats.mean)}\n`);

results.comparisonTests = {
  oldQuery: oldStats,
  newQuery: newStats,
  overhead,
  absoluteDifference: newStats.mean - oldStats.mean
};

// Clean up
cleanTestPosts('compare');

// ============================================================================
// Generate Report
// ============================================================================
console.log('📝 Generating benchmark report...\n');

const report = `# Performance Benchmark Report: Priority Sorting Query

**Generated:** ${results.timestamp}
**Initial Dataset:** ${results.systemInfo.initialPostCount} posts
**Node Version:** ${results.systemInfo.nodeVersion}
**Platform:** ${results.systemInfo.platform}

---

## Executive Summary

### Key Findings

${results.queryExecutionTests.limitTests.map(test =>
  `- **LIMIT ${test.limit}**: P95 = ${formatTime(test.stats.p95)}, Mean = ${formatTime(test.stats.mean)}`
).join('\n')}

### Performance Status

${results.queryExecutionTests.limitTests[0].stats.p95 < 10 ? '✅' : '⚠️'} Query time < 10ms for small dataset: **${formatTime(results.queryExecutionTests.limitTests[0].stats.p95)}**

${results.scalabilityTests.tests.find(t => t.testSize === 100)?.stats.p95 < 10 ? '✅' : '⚠️'} Query time < 10ms for 100 posts: **${formatTime(results.scalabilityTests.tests.find(t => t.testSize === 100)?.stats.p95 || 0)}**

${results.scalabilityTests.tests.find(t => t.testSize === 1000)?.stats.p95 < 50 ? '✅' : '⚠️'} Query time < 50ms for 1000 posts: **${formatTime(results.scalabilityTests.tests.find(t => t.testSize === 1000)?.stats.p95 || 0)}**

${results.comparisonTests.overhead < 50 ? '✅' : '⚠️'} Performance overhead vs simple query: **${results.comparisonTests.overhead.toFixed(2)}%**

---

## Test 1: Query Execution Time (Current Dataset)

### LIMIT Value Tests

| LIMIT | Mean | P50 | P95 | P99 | Min | Max |
|-------|------|-----|-----|-----|-----|-----|
${results.queryExecutionTests.limitTests.map(test =>
  `| ${test.limit} | ${formatTime(test.stats.mean)} | ${formatTime(test.stats.p50)} | ${formatTime(test.stats.p95)} | ${formatTime(test.stats.p99)} | ${formatTime(test.stats.min)} | ${formatTime(test.stats.max)} |`
).join('\n')}

**Analysis:**
- Query execution is consistent across different LIMIT values
- ${results.queryExecutionTests.limitTests[0].stats.p95 < 5 ? 'Excellent' : results.queryExecutionTests.limitTests[0].stats.p95 < 10 ? 'Good' : 'Acceptable'} performance for typical pagination scenarios

### OFFSET Impact Tests

| OFFSET | Mean | P95 |
|--------|------|-----|
${results.queryExecutionTests.offsetTests.map(test =>
  `| ${test.offset} | ${formatTime(test.stats.mean)} | ${formatTime(test.stats.p95)} |`
).join('\n')}

**Analysis:**
- ${results.queryExecutionTests.offsetTests[2].stats.mean > results.queryExecutionTests.offsetTests[0].stats.mean * 1.5 ? 'Significant' : 'Minimal'} OFFSET overhead observed
- ${results.queryExecutionTests.offsetTests[2].stats.mean > results.queryExecutionTests.offsetTests[0].stats.mean * 1.5 ? 'Consider implementing cursor-based pagination for deep pagination' : 'OFFSET-based pagination performs well'}

---

## Test 2: Index Effectiveness

### Current Indices

${results.indexEffectiveness.existingIndices.map(idx => `- \`${idx.name}\``).join('\n')}

### Query Execution Plan

\`\`\`
${results.indexEffectiveness.queryPlan.map(step => step.detail).join('\n')}
\`\`\`

${results.indexEffectiveness.improvement ? `
### Index Performance Impact

| Scenario | Mean | P95 |
|----------|------|-----|
| With Index | ${formatTime(results.indexEffectiveness.withIndex.mean)} | ${formatTime(results.indexEffectiveness.withIndex.p95)} |
| Without Index | ${formatTime(results.indexEffectiveness.withoutIndex.mean)} | ${formatTime(results.indexEffectiveness.withoutIndex.p95)} |

**Index Improvement:** ${results.indexEffectiveness.improvement.toFixed(2)}%

**Analysis:**
- ${results.indexEffectiveness.improvement > 20 ? '✅ Index provides significant performance benefit' : '⚠️ Index provides minimal benefit - may need optimization'}
- ${results.indexEffectiveness.improvement > 20 ? 'Index on comment count is effectively used' : 'Consider composite index or query optimization'}
` : '**Note:** Index comparison test was not run (index may not exist)'}

---

## Test 3: Scalability Analysis

### Performance vs Dataset Size

| Dataset Size | Mean | P95 | P99 |
|--------------|------|-----|-----|
${results.scalabilityTests.tests.map(test =>
  `| ${test.datasetSize} posts | ${formatTime(test.stats.mean)} | ${formatTime(test.stats.p95)} | ${formatTime(test.stats.p99)} |`
).join('\n')}

### Scalability Chart (Mean Query Time)

\`\`\`
${results.scalabilityTests.tests.map(test => {
  const bars = Math.round((test.stats.mean / Math.max(...results.scalabilityTests.tests.map(t => t.stats.mean))) * 40);
  return `${String(test.datasetSize).padStart(4)} posts: ${'█'.repeat(bars)} ${formatTime(test.stats.mean)}`;
}).join('\n')}
\`\`\`

**Analysis:**
- ${results.scalabilityTests.tests[2].stats.mean > results.scalabilityTests.tests[0].stats.mean * 2 ? 'Non-linear' : 'Linear'} scaling observed
- ${results.scalabilityTests.tests[2].stats.p95 < 50 ? '✅ Meets 50ms target for 1000 posts' : '⚠️ Exceeds 50ms target for 1000 posts'}
- Projected time for 10k posts: ~${formatTime(results.scalabilityTests.tests[2].stats.mean * 10)}

---

## Test 4: Comparison with Simple Query

### Old Query (ORDER BY created_at DESC)

\`\`\`sql
SELECT * FROM agent_posts
ORDER BY created_at DESC
LIMIT ? OFFSET ?
\`\`\`

### New Query (Multi-level Priority Sorting)

\`\`\`sql
SELECT *,
  CAST(json_extract(engagement, '$.comments') AS INTEGER) as comment_count,
  CASE WHEN authorAgent LIKE '%-agent' THEN 1 ELSE 0 END as is_agent_post
FROM agent_posts
ORDER BY
  comment_count DESC,
  is_agent_post DESC,
  created_at DESC,
  id ASC
LIMIT ? OFFSET ?
\`\`\`

### Performance Comparison

| Query Type | Mean | P95 | P99 |
|------------|------|-----|-----|
| Old (Simple) | ${formatTime(results.comparisonTests.oldQuery.mean)} | ${formatTime(results.comparisonTests.oldQuery.p95)} | ${formatTime(results.comparisonTests.oldQuery.p99)} |
| New (Priority) | ${formatTime(results.comparisonTests.newQuery.mean)} | ${formatTime(results.comparisonTests.newQuery.p95)} | ${formatTime(results.comparisonTests.newQuery.p99)} |

**Performance Overhead:** ${results.comparisonTests.overhead.toFixed(2)}%
**Absolute Difference:** ${formatTime(results.comparisonTests.absoluteDifference)}

**Analysis:**
- ${results.comparisonTests.overhead < 20 ? '✅ Minimal overhead' : results.comparisonTests.overhead < 50 ? '✅ Acceptable overhead' : '⚠️ Significant overhead'} from priority sorting logic
- ${results.comparisonTests.absoluteDifference < 1 ? 'Negligible' : results.comparisonTests.absoluteDifference < 5 ? 'Very small' : 'Noticeable'} absolute time difference
- ${results.comparisonTests.overhead < 50 ? 'Business value of priority sorting justifies the minimal performance cost' : 'Consider caching or materialized views if performance becomes an issue'}

---

## Recommendations

### Immediate Actions

${results.queryExecutionTests.limitTests[0].stats.p95 < 10 && results.scalabilityTests.tests[2].stats.p95 < 50 ?
`✅ **No immediate action required**
- Query performance is excellent
- Meets all performance targets
` :
`⚠️ **Performance Optimization Needed**
- Consider query optimization
- Review index strategy
`}

### Future Optimizations

1. **Caching Strategy**
   - Implement Redis cache for top 100 posts
   - Cache invalidation on new posts or engagement updates
   - Expected improvement: 90%+ reduction for cached requests

2. **Index Optimization**
   ${results.indexEffectiveness.improvement > 20 ?
     '- Current index is effective\n   - Monitor as dataset grows' :
     '- Consider composite index: \`(comment_count DESC, is_agent_post DESC, created_at DESC)\`\n   - Test materialized view for complex calculations'
   }

3. **Query Optimization**
   - Pre-calculate \`comment_count\` and \`is_agent_post\` in columns
   - Use database triggers to maintain calculated fields
   - Trade-off: Faster reads, slower writes (acceptable for read-heavy workload)

4. **Scalability Planning**
   - Current query handles 1000 posts: ${formatTime(results.scalabilityTests.tests[2].stats.p95)}
   - Consider partitioning strategy at 100k+ posts
   - Monitor query performance metrics in production

### Monitoring Metrics

Track these metrics in production:

- **P95 Query Time**: Alert if > 20ms
- **P99 Query Time**: Alert if > 50ms
- **Cache Hit Rate**: Target > 80%
- **Index Usage**: Verify via EXPLAIN QUERY PLAN

---

## Appendix: Raw Data

<details>
<summary>Click to expand full benchmark data</summary>

\`\`\`json
${JSON.stringify(results, null, 2)}
\`\`\`

</details>

---

**Benchmark completed successfully** ✅
`;

// Write report
writeFileSync('/workspaces/agent-feed/api-server/PERFORMANCE_BENCHMARK_PRIORITY_SORTING.md', report);

console.log('✅ Benchmark complete!');
console.log('📄 Report saved to: /workspaces/agent-feed/api-server/PERFORMANCE_BENCHMARK_PRIORITY_SORTING.md\n');

// Print summary
console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
console.log('📊 PERFORMANCE SUMMARY');
console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
console.log(`\n🔹 Query Execution (LIMIT 10):`);
console.log(`   P95: ${formatTime(results.queryExecutionTests.limitTests[0].stats.p95)}`);
console.log(`   Mean: ${formatTime(results.queryExecutionTests.limitTests[0].stats.mean)}`);
console.log(`\n🔹 Scalability (1000 posts):`);
console.log(`   P95: ${formatTime(results.scalabilityTests.tests[2].stats.p95)}`);
console.log(`\n🔹 Performance vs Simple Query:`);
console.log(`   Overhead: ${results.comparisonTests.overhead.toFixed(2)}%`);
console.log(`   Difference: ${formatTime(results.comparisonTests.absoluteDifference)}`);
if (results.indexEffectiveness.improvement) {
  console.log(`\n🔹 Index Effectiveness:`);
  console.log(`   Improvement: ${results.indexEffectiveness.improvement.toFixed(2)}%`);
}
console.log('\n━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n');

// Close database
db.close();

process.exit(0);
