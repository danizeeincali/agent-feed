# Phase 1 Performance Tests - Quick Reference

## One-Line Commands

```bash
# Run all performance tests
npm run test:phase1:performance

# Run with automated report
npm run test:phase1:performance:report

# Run individual suites
npm run test:phase1:performance:query      # Query performance
npm run test:phase1:performance:seeding    # Seeding performance
npm run test:phase1:performance:migration  # Migration performance
```

---

## Performance Requirements Checklist

- [ ] Memory retrieval query: **<100ms** ✅
- [ ] Seeding (3 templates): **<2 seconds** ✅
- [ ] Migration execution: **<10 seconds** ✅
- [ ] Connection pool: **Min 2, Max 20** ✅
- [ ] Concurrent queries: **No degradation** ✅

---

## Key Metrics

| Metric | Threshold | What It Tests |
|--------|-----------|--------------|
| Memory Query Time | <100ms | Composite index performance |
| JSONB Query Time | <100ms | GIN index performance |
| Seeding Time (3) | <2s | Template loading efficiency |
| Migration Time | <10s | Schema creation speed |
| Concurrent Avg | <2x baseline | Connection pool handling |

---

## File Locations

```
tests/phase1/performance/
├── query-performance.test.ts       # Query benchmarks
├── seeding-performance.test.ts     # Seeding benchmarks
├── migration-performance.test.ts   # Migration benchmarks
├── run-and-report.sh               # Automated runner
├── PERFORMANCE-REPORT.md           # Results template
├── README.md                       # Full documentation
├── SUMMARY.md                      # Overview
└── QUICK-REFERENCE.md              # This file
```

---

## Before Running Tests

```bash
# 1. Start PostgreSQL
docker-compose -f docker-compose.phase1.yml up -d postgres

# 2. Verify it's running
docker-compose -f docker-compose.phase1.yml ps postgres

# 3. Set environment (optional - defaults work)
export DB_HOST=localhost
export DB_PORT=5432
export DB_NAME=agentfeed_test
export DB_USER=postgres
export DB_PASSWORD=postgres
```

---

## After Running Tests

### Extract Metrics

Look for these lines in output:

```
Memory retrieval time: XX.XXms (threshold: 100ms)
JSONB containment query time: XX.XXms
Seeding time for 3 templates: XXX.XXms (threshold: 2000ms)
Migration 001 execution time: XXX.XXms (threshold: 10000ms)
Concurrent queries (n=20):
  Avg: XX.XXms
  Min: XX.XXms
  Max: XX.XXms
```

### Update Report

1. Open `/workspaces/agent-feed/tests/phase1/PERFORMANCE-REPORT.md`
2. Replace "XX ms" placeholders with actual values
3. Update status indicators (✅/❌/⚠️)
4. Add any bottlenecks found
5. Commit changes

---

## Troubleshooting

### Problem: "Connection refused"
```bash
# Solution: Start PostgreSQL
docker-compose -f docker-compose.phase1.yml up -d postgres
```

### Problem: "Database does not exist"
```bash
# Solution: Create test database
docker exec agent-feed-postgres-1 psql -U postgres -c "CREATE DATABASE agentfeed_test;"
```

### Problem: Tests timeout
```bash
# Solution: Increase timeout
npm test -- tests/phase1/performance/ --testTimeout=30000
```

### Problem: Inconsistent results
```bash
# Solution: Run multiple times
for i in {1..3}; do npm run test:phase1:performance; done
```

---

## Performance Thresholds

### ✅ PASS Criteria

- Memory retrieval: <100ms
- Seeding: <2s
- Migration: <10s
- All tests pass

### ⚠️ WARNING Criteria

- Memory retrieval: 80-100ms
- Seeding: 1.6-2s
- Migration: 8-10s
- Approaching thresholds

### ❌ FAIL Criteria

- Memory retrieval: ≥100ms
- Seeding: ≥2s
- Migration: ≥10s
- Any test exceeds threshold

---

## Common Queries

### Check Index Usage
```sql
SELECT * FROM pg_stat_user_indexes WHERE relname = 'agent_memories';
```

### Check Index Sizes
```sql
SELECT
  indexname,
  pg_size_pretty(pg_relation_size(indexrelid)) as size
FROM pg_stat_user_indexes
WHERE schemaname = 'public';
```

### Update Statistics
```sql
ANALYZE agent_memories;
```

### Check Query Plan
```sql
EXPLAIN (ANALYZE, BUFFERS)
SELECT * FROM agent_memories
WHERE user_id = 'user_0' AND agent_name = 'agent_0'
ORDER BY created_at DESC LIMIT 10;
```

---

## CI/CD Integration

### Add to GitHub Actions

```yaml
- name: Performance Tests
  run: npm run test:phase1:performance
  env:
    DB_HOST: localhost
    DB_NAME: agentfeed_test
```

### Add to Pre-Commit Hook

```bash
# .git/hooks/pre-commit
npm run test:phase1:performance || exit 1
```

---

## Optimization Quick Wins

### If Memory Query Slow
1. Check index exists: `idx_agent_memories_user_agent_recency`
2. Update statistics: `ANALYZE agent_memories;`
3. Verify query plan: `EXPLAIN ANALYZE ...`

### If Seeding Slow
1. Check file I/O time separately
2. Profile validation overhead
3. Check database connection latency

### If Migration Slow
1. Create indexes AFTER bulk inserts
2. Batch operations efficiently
3. Minimize verification queries

---

## Test Data Sizes

| Test Suite | Rows Created | Time to Seed |
|-----------|-------------|--------------|
| Query | 1,000 memories | ~500ms |
| Seeding | 3-10 templates | ~100ms |
| Migration | Full schema | ~2-5s |

---

## Expected Baseline (Typical Dev Machine)

| Metric | Expected | Threshold | Margin |
|--------|----------|-----------|--------|
| Memory query | 30-50ms | <100ms | 50%+ |
| JSONB query | 40-60ms | <100ms | 40%+ |
| Seeding (3) | 500-1000ms | <2s | 50%+ |
| Migration | 2-5s | <10s | 50%+ |

---

## When to Run Performance Tests

### Required
- [ ] Before merging to main
- [ ] Before production deployment
- [ ] After schema changes
- [ ] After index modifications

### Recommended
- [ ] Weekly during development
- [ ] After dependency updates
- [ ] When performance issues reported

### Optional
- [ ] On every commit (if fast enough)
- [ ] Daily in CI/CD
- [ ] Before code reviews

---

## Quick Links

- [Full README](./README.md) - Comprehensive documentation
- [Summary](./SUMMARY.md) - Overview and file list
- [Performance Report](./PERFORMANCE-REPORT.md) - Baseline metrics
- [Architecture Plan](/workspaces/agent-feed/AVI-ARCHITECTURE-PLAN.md) - Requirements

---

**Last Updated:** 2025-10-10
**Maintained By:** Performance Specialist
