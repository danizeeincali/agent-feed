#!/usr/bin/env node

/**
 * Creates a visual performance comparison chart
 */

console.log('\n╔════════════════════════════════════════════════════════════════╗');
console.log('║       PRIORITY SORTING QUERY - PERFORMANCE BENCHMARK          ║');
console.log('╚════════════════════════════════════════════════════════════════╝\n');

// Query Execution Time vs Dataset Size
console.log('📊 Query Execution Time (P95) vs Dataset Size\n');

const scalabilityData = [
  { posts: 22, time: 1.35, label: 'Initial' },
  { posts: 122, time: 0.37, label: '100 posts' },
  { posts: 522, time: 0.74, label: '500 posts' },
  { posts: 1022, time: 1.46, label: '1000 posts' }
];

const maxTime = Math.max(...scalabilityData.map(d => d.time));
const barWidth = 50;

scalabilityData.forEach(data => {
  const bars = Math.round((data.time / maxTime) * barWidth);
  const padding = String(data.posts).padStart(5);
  console.log(`  ${padding} posts  │${'█'.repeat(bars)}${'░'.repeat(barWidth - bars)}│ ${data.time.toFixed(2)}ms`);
});

console.log(`              │${' '.repeat(barWidth)}│`);
console.log(`              0${' '.repeat(Math.floor(barWidth/2) - 2)}${(maxTime/2).toFixed(1)}ms${' '.repeat(Math.floor(barWidth/2) - 4)}${maxTime.toFixed(1)}ms\n`);

// Success Criteria Comparison
console.log('✅ Success Criteria vs Actual Performance\n');

const criteria = [
  { name: 'Query < 10ms (100 posts)', target: 10, actual: 0.37, unit: 'ms' },
  { name: 'Query < 50ms (1000 posts)', target: 50, actual: 1.46, unit: 'ms' },
  { name: 'API < 100ms (P95)', target: 100, actual: 5.79, unit: 'ms' }
];

criteria.forEach(c => {
  const targetBar = Math.round((c.target / 100) * barWidth);
  const actualBar = Math.round((c.actual / 100) * barWidth);
  const improvement = ((c.target - c.actual) / c.target * 100).toFixed(0);

  console.log(`  ${c.name}`);
  console.log(`    Target:  │${'▓'.repeat(targetBar)}${'░'.repeat(barWidth - targetBar)}│ ${c.target}${c.unit}`);
  console.log(`    Actual:  │${'█'.repeat(actualBar)}${'░'.repeat(barWidth - actualBar)}│ ${c.actual}${c.unit} (${improvement}% better)`);
  console.log('');
});

// Old vs New Query Comparison
console.log('⚖️  Query Performance: Simple vs Priority Sorting\n');

const comparison = [
  { type: 'Simple Query', mean: 0.124, p95: 0.216 },
  { type: 'Priority Query', mean: 0.788, p95: 2.36 }
];

console.log('  Mean Execution Time:');
comparison.forEach(c => {
  const bars = Math.round((c.mean / 2.36) * barWidth);
  console.log(`    ${c.type.padEnd(15)} │${'█'.repeat(bars)}${'░'.repeat(barWidth - bars)}│ ${c.mean.toFixed(2)}ms`);
});

console.log('\n  P95 Execution Time:');
comparison.forEach(c => {
  const bars = Math.round((c.p95 / 2.36) * barWidth);
  console.log(`    ${c.type.padEnd(15)} │${'█'.repeat(bars)}${'░'.repeat(barWidth - bars)}│ ${c.p95.toFixed(2)}ms`);
});

console.log('\n  Overhead: 537% slower (but only 0.66ms absolute difference)');
console.log('  Verdict:  ✅ ACCEPTABLE - provides better UX for negligible cost\n');

// Performance Budget
console.log('💰 API Response Time Budget (2.08ms total)\n');

const budget = [
  { component: 'Query Execution', time: 0.84, pct: 40 },
  { component: 'JSON Parsing', time: 0.80, pct: 39 },
  { component: 'HTTP Overhead', time: 0.44, pct: 21 }
];

budget.forEach(b => {
  const bars = Math.round((b.pct / 100) * barWidth);
  console.log(`  ${b.component.padEnd(17)} │${'█'.repeat(bars)}${'░'.repeat(barWidth - bars)}│ ${b.time.toFixed(2)}ms (${b.pct}%)`);
});

console.log('\n  Key Insight: Query is NOT the bottleneck!\n');

// Index Impact
console.log('🔍 Index Effectiveness Test\n');

const indexTest = [
  { scenario: 'With Index', time: 0.142, icon: '⚠️' },
  { scenario: 'Without Index', time: 0.086, icon: '✅' }
];

indexTest.forEach(t => {
  const bars = Math.round((t.time / 0.15) * barWidth);
  console.log(`  ${t.icon} ${t.scenario.padEnd(14)} │${'█'.repeat(bars)}${'░'.repeat(barWidth - bars)}│ ${t.time.toFixed(3)}ms`);
});

console.log('\n  Impact: Index HURTS performance by 65%');
console.log('  Reason: Query uses calculated fields, can\'t use index');
console.log('  Action: ❌ REMOVE idx_posts_engagement_comments\n');

// Concurrent Load Test
console.log('🚀 API Performance Under Load\n');

const loadTest = [
  { scenario: 'Sequential', mean: 2.08, p95: 5.79, p99: 7.41 },
  { scenario: 'Concurrent (10x)', mean: 11.30, p95: 28.96, p99: 31.33 }
];

console.log('  Mean Response Time:');
loadTest.forEach(t => {
  const bars = Math.round((t.mean / 35) * barWidth);
  console.log(`    ${t.scenario.padEnd(20)} │${'█'.repeat(bars)}${'░'.repeat(barWidth - bars)}│ ${t.mean.toFixed(2)}ms`);
});

console.log('\n  P95 Response Time:');
loadTest.forEach(t => {
  const bars = Math.round((t.p95 / 35) * barWidth);
  console.log(`    ${t.scenario.padEnd(20)} │${'█'.repeat(bars)}${'░'.repeat(barWidth - bars)}│ ${t.p95.toFixed(2)}ms`);
});

console.log('\n  Throughput: 100+ requests/second with P95 < 30ms\n');

// Final Summary
console.log('╔════════════════════════════════════════════════════════════════╗');
console.log('║                      FINAL VERDICT                            ║');
console.log('╠════════════════════════════════════════════════════════════════╣');
console.log('║  Performance:        ✅ EXCELLENT (exceeds all targets)       ║');
console.log('║  Production Ready:   ✅ YES (no blockers)                     ║');
console.log('║  Optimization Need:  🟢 LOW (already fast enough)             ║');
console.log('║  Recommended Action: 🚀 DEPLOY NOW                            ║');
console.log('╚════════════════════════════════════════════════════════════════╝\n');

console.log('📋 Next Steps:\n');
console.log('  1. ✅ Deploy to production (performance is excellent)');
console.log('  2. 🗑️  Remove idx_posts_engagement_comments index (65% improvement)');
console.log('  3. 📊 Set up monitoring (alert if P95 > 20ms)');
console.log('  4. 💾 Consider caching at 10k+ posts (optional)\n');

console.log('📄 Full reports:');
console.log('  - PERFORMANCE_BENCHMARK_PRIORITY_SORTING.md');
console.log('  - PERFORMANCE_SUMMARY.md\n');
