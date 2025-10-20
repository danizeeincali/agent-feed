# Phase 4 ReasoningBank Test Suite

Comprehensive test suite for Phase 4 ReasoningBank SAFLA (Self-Aware Feedback Loop Algorithm) integration.

## Overview

**Total Tests:** 400+
**Target Execution Time:** <30 seconds
**Test Framework:** Jest (unit/integration) + Playwright (E2E)
**Coverage Target:** >95%

## Test Suites

### 1. Database Tests (`database.test.ts`) - 40+ tests

Tests SQLite database layer implementation including:

- **Schema Creation & Validation** (8 tests)
  - Patterns table structure
  - Pattern outcomes table
  - Pattern relationships table
  - Index creation
  - View creation
  - Default values
  - NOT NULL constraints
  - Primary key uniqueness

- **Table Integrity Constraints** (8 tests)
  - Foreign key enforcement
  - Cascade delete behavior
  - Confidence bounds validation
  - Outcome value validation
  - Duplicate relationship prevention
  - Multiple relationship types
  - Referential integrity
  - Concurrent insert safety

- **Index Performance** (8 tests)
  - Namespace query indexing
  - Namespace query speed (<3ms)
  - Confidence ordering index
  - Confidence query speed (<3ms)
  - Category filtering index
  - Composite query performance
  - Outcome history queries
  - Large dataset performance (10K+ patterns)

- **View Correctness** (6 tests)
  - high_confidence_patterns filtering
  - Confidence ordering in views
  - recent_learning time filtering
  - agent_learning_summary calculations
  - View column completeness
  - Dynamic view updates

- **Trigger Functionality** (3 tests)
  - Auto-update updated_at timestamp
  - Auto-increment total_invocations
  - Update last_used_at on query

- **Migration & Rollback** (3 tests)
  - Schema version tracking
  - Column addition migration
  - Data preservation during migration

- **Database Corruption Recovery** (2 tests)
  - Integrity check detection
  - Backup and restore functionality

- **Concurrent Access Safety** (2 tests)
  - WAL mode configuration
  - Transaction isolation

**Run:** `npx jest tests/reasoningbank/database.test.ts`

---

### 2. SAFLA Algorithm Tests (`safla.test.ts`) - 60+ tests

Tests core SAFLA learning algorithm including:

- **Embedding Generation** (12 tests)
  - Deterministic embedding generation
  - 1024-dimensional vectors
  - <1ms generation speed
  - Unit vector normalization
  - Text differentiation
  - Semantic similarity
  - Empty string handling
  - Long text handling
  - Special character handling
  - Case-insensitive normalization
  - Whitespace normalization
  - Consistency across calls

- **Similarity Calculations** (10 tests)
  - Cosine similarity correctness
  - Orthogonal vector detection
  - Opposite vector detection
  - Zero-magnitude handling
  - Dimension mismatch validation
  - 1024-dimension efficiency
  - Value range (-1 to 1)
  - Symmetry property
  - Semantic similarity correlation
  - Unrelated text distinction

- **Confidence Update Formulas** (12 tests)
  - +20% on success
  - -15% on failure
  - 95% upper bound
  - 5% lower bound
  - Multiple consecutive successes
  - Multiple consecutive failures
  - Convergence with mostly successes
  - Convergence with mostly failures
  - Delta calculation
  - Bounds maintenance
  - Recovery from low confidence
  - Stability with balanced outcomes

- **Confidence Bounds** (6 tests)
  - 5% minimum enforcement
  - 95% maximum enforcement
  - Invalid value rejection (below min)
  - Invalid value rejection (above max)
  - Valid value acceptance
  - 50% default initial confidence

- **Pattern Storage** (8 tests)
  - Complete pattern creation
  - Auto-generate embeddings
  - Default namespace assignment
  - Optional metadata storage
  - Unique ID assignment
  - Creation timestamps
  - Counter initialization
  - Required field validation

- **Semantic Search** (8 tests)
  - Semantic similarity matching
  - Result ranking by similarity
  - Minimum similarity filtering
  - Confidence-weighted scoring
  - Result limit enforcement
  - Empty pattern list handling
  - 87-95% accuracy target
  - <3ms search performance

- **MMR Ranking** (4 tests)
  - Relevance/diversity balancing
  - Lambda=1 (relevance only)
  - Lambda=0 (diversity only)
  - Performance with MMR

**Run:** `npx jest tests/reasoningbank/safla.test.ts`

---

### 3. Learning Workflows Tests (`learning-workflows.test.ts`) - 50+ tests

Tests end-to-end learning workflows including:

- **Pattern Query Before Execution** (10 tests)
  - Query relevant patterns
  - Relevance-based ordering
  - Confidence threshold filtering
  - Result limit enforcement
  - Global pattern inclusion
  - Global pattern exclusion
  - Empty result handling
  - <3ms query performance
  - Category filtering
  - Concurrent query safety

- **Outcome Recording** (10 tests)
  - Success outcome recording
  - Failure outcome recording
  - Success count updates
  - Failure count updates
  - Invocation count increment
  - Context and feedback storage
  - Last used timestamp update
  - Outcome history maintenance
  - Success rate calculation
  - Rapid outcome handling

- **Confidence Convergence** (8 tests)
  - High confidence with successes
  - Low confidence with failures
  - 80% confidence in 2 weeks
  - Stability with mixed outcomes
  - Confidence recovery
  - Trajectory tracking
  - Faster convergence with frequency
  - Bounds maintenance

- **Cross-Agent Pattern Sharing** (8 tests)
  - Share to target agent
  - Confidence reduction on sharing
  - Relationship creation
  - Content/category preservation
  - Share to multiple agents
  - Optional history preservation
  - Shared pattern metadata
  - Independent evolution

- **Namespace Isolation** (6 tests)
  - Pattern isolation by namespace
  - Global namespace access
  - Skill-specific namespaces
  - Cross-namespace prevention
  - Hierarchical namespaces
  - Pattern count per namespace

- **Learning from Failures** (4 tests)
  - Confidence lowering on failure
  - Failure reason tracking
  - Alternative pattern creation
  - Failure history maintenance

- **Pattern Relationships** (2 tests)
  - Relationship creation
  - Multiple relationship types

- **Memory Cleanup** (2 tests)
  - Low-confidence pattern pruning
  - Old pattern archival

**Run:** `npx jest tests/reasoningbank/learning-workflows.test.ts`

---

### 4. Skills Integration Tests (`skills-integration.test.ts`) - 70+ tests

Tests integration with 7 learning-enabled skills (10 tests each):

- **task-management** skill
- **meeting-prep** skill
- **agent-templates** skill
- **user-preferences** skill
- **idea-evaluation** skill
- **problem-solving** skill
- **productivity-patterns** skill

Each skill tested for:
- Pattern storage in skill namespace
- Skill-specific success criteria
- Integration with Skills Service
- Backward compatibility
- Performance impact (<5% overhead)
- Error handling
- Pattern retrieval
- Confidence updates
- Cross-skill pattern sharing
- Skill-specific validation

**Run:** `npx jest tests/reasoningbank/skills-integration.test.ts`

---

### 5. Agent Integration Tests (`agent-integration.test.ts`) - 50+ tests

Tests agent-specific learning workflows:

- **Personal-Todos-Agent** (10 tests)
  - Prioritization pattern queries
  - Task completion recording
  - Optimal strategy learning
  - Estimation accuracy improvement
  - Task categorization
  - Namespace isolation
  - Concurrent operations
  - Skill integration
  - Cross-session persistence
  - Performance targets

- **Meeting-Prep-Agent** (10 tests)
  - Agenda format learning
  - Duration estimate optimization
  - Participant preference adaptation
  - Effectiveness tracking
  - Context-appropriate agendas
  - Feedback learning
  - Meeting history
  - Template integration
  - Pattern sharing
  - Query latency

- **Agent-Ideas-Agent** (10 tests)
  - Evaluation criteria learning
  - Implementation success tracking
  - High-value pattern identification
  - Idea-outcome correlation
  - Low-quality filtering
  - Scoring algorithm adaptation
  - Idea history
  - Evaluation skill integration
  - Global pattern sharing
  - Efficient searches

- **Learning Hook Execution** (5 tests)
- **Agent-Specific Namespaces** (5 tests)
- **Multi-Agent Pattern Sharing** (5 tests)
- **Cross-Session Persistence** (5 tests)

**Run:** `npx jest tests/reasoningbank/agent-integration.test.ts`

---

### 6. Performance Tests (`performance.test.ts`) - 30+ tests

Tests performance benchmarks and scalability:

- **Query Latency (<3ms p95)** (8 tests)
  - Simple SELECT queries
  - Indexed query p95 latency
  - Composite queries
  - JOIN queries
  - View queries
  - 10K pattern dataset
  - Aggregate queries
  - Concurrent read handling

- **Embedding Generation (<1ms)** (6 tests)
  - Single embedding speed
  - 100 embeddings batch
  - Long text handling
  - Cosine similarity speed
  - Batch processing efficiency
  - Repeated call consistency

- **Database Size (<50MB/month/agent)** (4 tests)
  - Storage per pattern estimation
  - 1000 pattern projection
  - Compression effectiveness
  - Monthly growth estimation

- **Memory Usage (<100MB)** (4 tests)
  - Baseline memory measurement
  - Large pattern set handling
  - Post-query cleanup
  - Embedding cache limits

- **Concurrent Query Handling (>100 qps)** (4 tests)
  - 100 concurrent queries
  - >100 queries per second
  - Mixed read/write operations
  - Consistency under load

- **Large Pattern Sets** (2 tests)
  - 10K pattern loading
  - 10K pattern query speed

- **Index Effectiveness** (2 tests)
  - Index usage validation
  - Query plan optimization

**Run:** `npx jest tests/reasoningbank/performance.test.ts`

---

### 7. E2E Validation Tests (`phase4-reasoningbank-validation.spec.ts`) - 50+ tests

Tests complete end-to-end workflows using Playwright:

- **Complete Learning Cycle** (10 tests)
  - Full query → execute → record cycle
  - Pattern querying before execution
  - Skill augmentation
  - Success outcome recording
  - Failure outcome recording
  - Confidence updates
  - Invocation counting
  - Database persistence
  - Performance targets
  - Concurrent cycles

- **Pre-Trained Pattern Import** (10 tests)
  - Self-learning patterns (2,847)
  - Code-reasoning patterns (3,245)
  - Problem-solving patterns (2,134)
  - Agent-coordination patterns (1,876)
  - User-interaction patterns (898)
  - Total count validation (11,000+)
  - Embedding generation
  - Initial confidence values
  - Namespace assignment
  - Import time limit

- **Multi-Session Persistence** (8 tests)
- **Agent Improvement Over Time** (8 tests)
- **Pattern Quality Detection** (6 tests)
- **Database Backup & Restore** (4 tests)
- **Production Readiness** (4 tests)

**Run:** `npx playwright test tests/e2e/phase4-reasoningbank-validation.spec.ts`

---

### 8. Regression Tests (`regression.test.ts`) - 50+ tests

Tests backward compatibility and zero breaking changes:

- **Phase 1-3 Compatibility** (15 tests)
  - Skills loading without learning
  - Agent execution without ReasoningBank
  - Progressive disclosure preservation
  - Skill caching maintenance
  - Protected skill validation
  - All 25 skills loading
  - System/shared/agent-specific skills
  - Skill file structure
  - Metadata format
  - Non-learning workflows
  - API backward compatibility
  - Database schema preservation
  - UI functionality

- **Non-Learning Agents** (10 tests)
- **Skills Service Compatibility** (10 tests)
- **Agent Loading Modes** (8 tests)
- **Token Efficiency** (4 tests)
- **Zero Breaking Changes** (3 tests)

**Run:** `npx jest tests/reasoningbank/regression.test.ts`

---

## Running Tests

### Run All Tests

```bash
./tests/reasoningbank/run-phase4-tests.sh
```

### Run Individual Suites

```bash
# Database tests
npx jest tests/reasoningbank/database.test.ts

# SAFLA algorithm
npx jest tests/reasoningbank/safla.test.ts

# Learning workflows
npx jest tests/reasoningbank/learning-workflows.test.ts

# Skills integration
npx jest tests/reasoningbank/skills-integration.test.ts

# Agent integration
npx jest tests/reasoningbank/agent-integration.test.ts

# Performance tests
npx jest tests/reasoningbank/performance.test.ts

# Regression tests
npx jest tests/reasoningbank/regression.test.ts

# E2E validation
npx playwright test tests/e2e/phase4-reasoningbank-validation.spec.ts
```

### Run with Coverage

```bash
npx jest --coverage tests/reasoningbank/
```

### Run Specific Tests

```bash
# Run tests matching pattern
npx jest tests/reasoningbank/ -t "should generate embedding"

# Run single test file
npx jest tests/reasoningbank/database.test.ts

# Run in watch mode
npx jest tests/reasoningbank/ --watch
```

---

## Test Quality Standards

### TDD Methodology

All tests follow Test-Driven Development (TDD) principles:

1. **Test First:** Tests written before implementation
2. **Red-Green-Refactor:** Test fails → Make it pass → Refactor
3. **One Assertion:** Each test validates one behavior
4. **Clear Names:** Test names explain what and why
5. **No Mocks (for core logic):** Real implementations preferred
6. **Deterministic:** Same results every time
7. **Independent:** No test interdependence

### Test Structure

```typescript
describe('Component Name', () => {
  // Setup
  beforeEach(() => {
    // Initialize test fixtures
  });

  afterEach(() => {
    // Cleanup
  });

  describe('Feature Name', () => {
    test('should <expected behavior> when <condition>', () => {
      // Arrange
      const input = setupInput();

      // Act
      const result = executeFunction(input);

      // Assert
      expect(result).toBe(expected);
    });
  });
});
```

### Performance Requirements

- **Query Latency:** <3ms (p95)
- **Embedding Generation:** <1ms
- **Database Growth:** <50MB/month/agent
- **Memory Usage:** <100MB
- **Concurrent Queries:** >100 qps
- **Total Test Time:** <30s

### Coverage Requirements

- **Statements:** >80%
- **Branches:** >75%
- **Functions:** >80%
- **Lines:** >80%

---

## Performance Benchmarking

### Benchmark Report

After running tests, a performance benchmark report is generated:

```
tests/reasoningbank/reports/performance-benchmark-{DATE}.md
```

### Key Metrics Tracked

- Test suite execution times
- Query latency (p95, p99)
- Embedding generation speed
- Database size growth
- Memory usage
- Concurrent throughput
- Semantic search accuracy
- Confidence convergence rate

---

## Troubleshooting

### Tests Failing

1. **Check Prerequisites:**
   ```bash
   npm install
   npx playwright install
   ```

2. **Verify Database:**
   ```bash
   # Ensure SQLite is available
   sqlite3 --version
   ```

3. **Run Individual Tests:**
   ```bash
   # Isolate failing suite
   npx jest tests/reasoningbank/database.test.ts --verbose
   ```

### Performance Issues

1. **Check Test Parallelization:**
   ```bash
   # Run tests in parallel
   npx jest --maxWorkers=4
   ```

2. **Profile Slow Tests:**
   ```bash
   # Identify slow tests
   npx jest --verbose | grep "ms"
   ```

3. **Optimize Database Queries:**
   - Verify indexes are created
   - Run ANALYZE on SQLite database
   - Check query plans with EXPLAIN

### Coverage Gaps

1. **Generate Coverage Report:**
   ```bash
   npx jest --coverage --coverageDirectory=reports/coverage
   ```

2. **View HTML Report:**
   ```bash
   open reports/coverage/index.html
   ```

3. **Identify Missing Tests:**
   - Check uncovered branches
   - Add edge case tests
   - Test error paths

---

## Contributing

### Adding New Tests

1. **Choose Appropriate Suite:**
   - Unit tests → `safla.test.ts` or similar
   - Integration → `learning-workflows.test.ts`
   - E2E → `phase4-reasoningbank-validation.spec.ts`
   - Performance → `performance.test.ts`

2. **Follow Naming Conventions:**
   - Test files: `*.test.ts` (Jest) or `*.spec.ts` (Playwright)
   - Test names: `should <action> when <condition>`

3. **Maintain Test Quality:**
   - One assertion per test
   - Clear, descriptive names
   - Independent tests
   - No flaky tests

4. **Update Documentation:**
   - Add test description to this README
   - Update test count targets
   - Document any new requirements

### Test Review Checklist

- [ ] Test is deterministic (passes consistently)
- [ ] Test name clearly describes behavior
- [ ] Test has single, clear assertion
- [ ] Test is independent of other tests
- [ ] Test includes edge cases
- [ ] Test meets performance targets
- [ ] Test is properly categorized
- [ ] Documentation updated

---

## References

- [Phase 4 Architecture](/workspaces/agent-feed/docs/PHASE-4-ARCHITECTURE.md)
- [SAFLA Algorithm Specification](/workspaces/agent-feed/docs/PHASE-4-ARCHITECTURE.md#51-safla-algorithm-implementation)
- [Performance Targets](/workspaces/agent-feed/docs/PHASE-4-ARCHITECTURE.md#12-performance-targets)
- [Test Runner Script](/workspaces/agent-feed/tests/reasoningbank/run-phase4-tests.sh)
- [Benchmark Template](/workspaces/agent-feed/tests/reasoningbank/PERFORMANCE-BENCHMARK-TEMPLATE.md)

---

**Last Updated:** October 18, 2025
**Test Suite Version:** 1.0
**Total Tests:** 400+
**Status:** ✅ All tests passing
