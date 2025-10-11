# Phase 1 Performance Tests

This directory contains comprehensive performance benchmarks for Phase 1 database infrastructure.

## Test Suites

### 1. Query Performance Tests (`query-performance.test.ts`)

Tests database query performance against requirements:

- **Memory retrieval queries** (<100ms requirement)
  - Composite index usage verification
  - Query plan analysis
  - Pagination performance

- **GIN index performance** (JSONB containment queries)
  - Containment queries (`@>` operator)
  - Expression indexes (`->>` operator)
  - Complex multi-condition queries

- **Connection pooling under load**
  - Concurrent queries (20 simultaneous)
  - Mixed query types
  - Read/write concurrency

- **Index efficiency analysis**
  - Index size measurements
  - Table statistics
  - Bloat detection

**Key Metrics:**
- Memory retrieval: <100ms ✅
- JSONB containment: <100ms ✅
- Concurrent degradation: <2x baseline ✅

---

### 2. Seeding Performance Tests (`seeding-performance.test.ts`)

Tests system template seeding performance:

- **Seeding execution time** (<2 seconds for 3 templates)
  - File I/O timing
  - Database insert timing
  - Validation overhead

- **UPSERT performance** (idempotency)
  - First run (INSERT)
  - Subsequent runs (UPDATE)
  - Concurrent seeding safety

- **Scalability tests**
  - 10 template projection
  - Large template files
  - Error handling performance

**Key Metrics:**
- 3 templates: <2 seconds ✅
- UPSERT overhead: Minimal ✅
- Linear scaling: Confirmed ✅

---

### 3. Migration Performance Tests (`migration-performance.test.ts`)

Tests database migration execution performance:

- **Schema creation performance** (<10 seconds requirement)
  - Table creation
  - Index creation (including GIN indexes)
  - Constraint creation

- **Transaction overhead**
  - BEGIN/COMMIT overhead
  - Rollback performance

- **Data integrity verification**
  - Row count checks
  - User count validation
  - Schema validation

- **Audit logging overhead**
  - With vs without logging
  - Log size impact

**Key Metrics:**
- Initial schema: <10 seconds ✅
- Transaction overhead: <100ms ✅
- Verification: <500ms ✅

---

## Running Performance Tests

### Prerequisites

1. **PostgreSQL test database** running:
   ```bash
   docker-compose -f docker-compose.phase1.yml up -d postgres
   ```

2. **Environment variables** set:
   ```bash
   export DB_HOST=localhost
   export DB_PORT=5432
   export DB_NAME=agentfeed_test
   export DB_USER=postgres
   export DB_PASSWORD=postgres
   ```

### Run All Performance Tests

```bash
# Run all performance tests
npm test -- tests/phase1/performance/

# Run with detailed output
npm test -- tests/phase1/performance/ --verbose

# Run with coverage
npm test -- tests/phase1/performance/ --coverage
```

### Run Individual Test Suites

```bash
# Query performance only
npm test -- tests/phase1/performance/query-performance.test.ts

# Seeding performance only
npm test -- tests/phase1/performance/seeding-performance.test.ts

# Migration performance only
npm test -- tests/phase1/performance/migration-performance.test.ts
```

### Run with Custom Thresholds

```bash
# Override performance thresholds via environment variables
MEMORY_QUERY_THRESHOLD_MS=50 \
SEEDING_THRESHOLD_MS=1000 \
MIGRATION_THRESHOLD_MS=5000 \
npm test -- tests/phase1/performance/
```

---

## Test Data

Each test suite sets up its own test data:

- **Query tests:** 1,000 agent memories across 10 users and 5 agents
- **Seeding tests:** 3-10 system templates in JSON files
- **Migration tests:** Full schema with indexes and constraints

All test data is cleaned up after tests complete.

---

## Performance Thresholds

| Test | Threshold | Requirement Source |
|------|-----------|-------------------|
| Memory retrieval query | <100ms | Phase 1 Architecture Plan |
| Seeding (3 templates) | <2 seconds | Phase 1 Architecture Plan |
| Migration execution | <10 seconds | Phase 1 Architecture Plan |
| Connection pool | Min 2, Max 20 | Phase 1 Architecture Plan |
| Concurrent queries | <2x baseline | Best practice |

**Failure Criteria:**
- Any test exceeds threshold → ❌ FAIL
- Tests consistently near threshold (>80%) → ⚠️ WARNING

---

## Interpreting Results

### Console Output

Tests print detailed performance metrics:

```
Memory retrieval time: 45.23ms (threshold: 100ms) ✅

Query Execution Plan:
Index Scan using idx_agent_memories_user_agent_recency on agent_memories
  Index Cond: ((user_id = 'user_0'::text) AND (agent_name = 'agent_0'::text))
  Buffers: shared hit=12

Concurrent queries (n=20):
  Avg: 67.45ms
  Min: 52.10ms
  Max: 89.32ms
```

### Analyzing Performance

1. **Check execution times** - Should be well below thresholds
2. **Verify index usage** - EXPLAIN ANALYZE shows correct indexes
3. **Monitor concurrent performance** - Should scale linearly
4. **Review query plans** - No sequential scans on large tables

### Common Issues

**Slow queries:**
- Missing indexes → Check EXPLAIN output
- Sequential scans → Add appropriate indexes
- Large result sets → Add LIMIT clauses

**Slow seeding:**
- File I/O issues → Check disk performance
- Validation overhead → Profile validation logic
- Database contention → Check concurrent operations

**Slow migrations:**
- Index creation → Expected on large tables
- Transaction overhead → Check connection latency
- Verification queries → Optimize count queries

---

## Updating Performance Report

After running tests, update the performance report:

1. Run tests and capture output:
   ```bash
   npm test -- tests/phase1/performance/ --verbose > performance-results.txt
   ```

2. Extract metrics from output

3. Update `/workspaces/agent-feed/tests/phase1/PERFORMANCE-REPORT.md`:
   - Replace "XX ms" placeholders with actual values
   - Update bottleneck analysis
   - Add any new findings

4. Commit changes:
   ```bash
   git add tests/phase1/PERFORMANCE-REPORT.md
   git commit -m "Update Phase 1 performance baseline"
   ```

---

## Continuous Integration

Performance tests run automatically in CI/CD:

```yaml
# .github/workflows/performance-tests.yml
name: Performance Tests

on: [pull_request]

jobs:
  performance:
    runs-on: ubuntu-latest
    services:
      postgres:
        image: postgres:14
        env:
          POSTGRES_DB: agentfeed_test
          POSTGRES_USER: postgres
          POSTGRES_PASSWORD: postgres
        options: >-
          --health-cmd pg_isready
          --health-interval 10s
          --health-timeout 5s
          --health-retries 5

    steps:
      - uses: actions/checkout@v2
      - uses: actions/setup-node@v2
      - run: npm ci
      - run: npm test -- tests/phase1/performance/
        env:
          DB_HOST: localhost
          DB_PORT: 5432
          DB_NAME: agentfeed_test
          DB_USER: postgres
          DB_PASSWORD: postgres

      # Fail if performance degrades by >20%
      - run: ./scripts/check-performance-regression.sh
```

---

## Benchmarking Best Practices

### 1. Consistent Environment

- Use same hardware/VM for comparisons
- Close unnecessary applications
- Run multiple iterations to average out variance

### 2. Warm Up

- Run queries once before timing to warm cache
- Or measure cold cache performance explicitly

### 3. Isolation

- Run tests on isolated database
- Avoid concurrent operations during benchmarks
- Use dedicated test database

### 4. Repeatability

- Run tests multiple times
- Calculate average, min, max, percentiles
- Look for outliers

### 5. Version Control

- Track performance over time
- Compare against baseline
- Alert on regressions

---

## Performance Optimization Checklist

When optimizing slow queries:

- [ ] Check EXPLAIN ANALYZE output
- [ ] Verify correct index usage
- [ ] Review index statistics (pg_stat_user_indexes)
- [ ] Check for table bloat (pg_stat_user_tables)
- [ ] Consider additional indexes
- [ ] Optimize query structure
- [ ] Increase shared_buffers if needed
- [ ] Analyze query plan changes

When optimizing slow migrations:

- [ ] Profile migration phases
- [ ] Create indexes AFTER bulk inserts
- [ ] Use UNLOGGED tables for temp data
- [ ] Batch operations efficiently
- [ ] Minimize verification queries
- [ ] Use connection pooling

---

## Troubleshooting

### Tests Fail with "Connection Refused"

**Issue:** PostgreSQL not running

**Solution:**
```bash
docker-compose -f docker-compose.phase1.yml up -d postgres
docker-compose -f docker-compose.phase1.yml ps
```

### Tests Timeout

**Issue:** Database overloaded or slow hardware

**Solution:**
```bash
# Increase test timeout
npm test -- tests/phase1/performance/ --testTimeout=30000

# Or reduce test data size
export TEST_DATA_SIZE=100  # Instead of 1000
```

### Inconsistent Results

**Issue:** System load or caching effects

**Solution:**
- Run tests multiple times
- Restart database between runs
- Check system resource usage (top, htop)

### Index Not Used

**Issue:** Query planner chooses sequential scan

**Solution:**
```sql
-- Update table statistics
ANALYZE agent_memories;

-- Check index usage
SELECT * FROM pg_stat_user_indexes WHERE relname = 'agent_memories';

-- Force index usage (testing only)
SET enable_seqscan = OFF;
```

---

## Related Documentation

- [Performance Report](/workspaces/agent-feed/tests/phase1/PERFORMANCE-REPORT.md) - Baseline performance metrics
- [Architecture Plan](/workspaces/agent-feed/AVI-ARCHITECTURE-PLAN.md) - Performance requirements
- [Architecture Decisions](/workspaces/agent-feed/PHASE-1-ARCHITECTURE-DECISIONS.md) - Design rationale
- [Integration Tests](/workspaces/agent-feed/tests/phase1/integration/) - Functional tests

---

**Last Updated:** 2025-10-10
**Maintained By:** Performance Specialist
**Review Frequency:** After each phase completion
