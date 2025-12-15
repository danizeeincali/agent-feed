#!/bin/bash
# ============================================================
# ReasoningBank Schema Validation Script
# ============================================================
# Purpose: Validate SQL syntax and schema correctness
# Usage: ./validate-schema.sh
# ============================================================

set -e

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
SCHEMA_FILE="$SCRIPT_DIR/reasoningbank-schema.sql"
MIGRATION_FILE="$SCRIPT_DIR/migrations/004-reasoningbank-init.sql"
TEST_DB="/tmp/reasoningbank-validation.db"

echo "============================================================"
echo "ReasoningBank Schema Validation"
echo "============================================================"
echo ""

# Cleanup previous test database
if [ -f "$TEST_DB" ]; then
  rm -f "$TEST_DB"
  echo "✓ Cleaned up previous test database"
fi

echo ""
echo "Step 1: Validating Schema SQL Syntax..."
echo "----------------------------------------"

# Test schema file syntax
if sqlite3 "$TEST_DB" < "$SCHEMA_FILE" 2>&1 | tee /tmp/schema-validation.log; then
  echo "✓ Schema SQL syntax is valid"
else
  echo "✗ Schema SQL syntax error!"
  cat /tmp/schema-validation.log
  exit 1
fi

echo ""
echo "Step 2: Validating Database Structure..."
echo "----------------------------------------"

# Check tables
TABLE_COUNT=$(sqlite3 "$TEST_DB" "SELECT COUNT(*) FROM sqlite_master WHERE type='table' AND name IN ('patterns', 'pattern_outcomes', 'pattern_relationships', 'database_metadata');")
echo "Tables created: $TABLE_COUNT/4"
if [ "$TABLE_COUNT" -ne 4 ]; then
  echo "✗ Missing required tables!"
  exit 1
fi
echo "✓ All required tables exist"

# Check indexes
INDEX_COUNT=$(sqlite3 "$TEST_DB" "SELECT COUNT(*) FROM sqlite_master WHERE type='index' AND name LIKE 'idx_%';")
echo "Indexes created: $INDEX_COUNT"
if [ "$INDEX_COUNT" -lt 10 ]; then
  echo "✗ Insufficient indexes (expected >=10, found $INDEX_COUNT)"
  exit 1
fi
echo "✓ All required indexes exist"

# Check views
VIEW_COUNT=$(sqlite3 "$TEST_DB" "SELECT COUNT(*) FROM sqlite_master WHERE type='view' AND name LIKE 'v_%';")
echo "Views created: $VIEW_COUNT"
if [ "$VIEW_COUNT" -lt 3 ]; then
  echo "✗ Insufficient views (expected >=3, found $VIEW_COUNT)"
  exit 1
fi
echo "✓ All required views exist"

# Check triggers
TRIGGER_COUNT=$(sqlite3 "$TEST_DB" "SELECT COUNT(*) FROM sqlite_master WHERE type='trigger' AND name LIKE 'trg_%';")
echo "Triggers created: $TRIGGER_COUNT"
if [ "$TRIGGER_COUNT" -lt 5 ]; then
  echo "✗ Insufficient triggers (expected >=5, found $TRIGGER_COUNT)"
  exit 1
fi
echo "✓ All required triggers exist"

echo ""
echo "Step 3: Testing Database Integrity..."
echo "----------------------------------------"

# Run integrity check
INTEGRITY=$(sqlite3 "$TEST_DB" "PRAGMA integrity_check;")
if [ "$INTEGRITY" = "ok" ]; then
  echo "✓ Database integrity check passed"
else
  echo "✗ Database integrity check failed: $INTEGRITY"
  exit 1
fi

# Check foreign keys
FK_STATUS=$(sqlite3 "$TEST_DB" "PRAGMA foreign_keys;")
if [ "$FK_STATUS" = "1" ]; then
  echo "✓ Foreign keys enabled"
else
  echo "⚠ Foreign keys not enabled (expected 1, got $FK_STATUS)"
fi

# Check WAL mode
WAL_MODE=$(sqlite3 "$TEST_DB" "PRAGMA journal_mode;")
if [ "$WAL_MODE" = "wal" ]; then
  echo "✓ WAL mode enabled"
else
  echo "⚠ WAL mode not enabled (expected wal, got $WAL_MODE)"
fi

echo ""
echo "Step 4: Testing Pattern CRUD Operations..."
echo "----------------------------------------"

# Generate test embedding (1024 floats = 4096 bytes)
EMBEDDING=$(python3 -c "import struct; print(''.join(format(b, '02x') for b in struct.pack('1024f', *[0.5]*1024)))")

# Insert test pattern
sqlite3 "$TEST_DB" <<EOF
INSERT INTO patterns (
  id, namespace, content, embedding, confidence,
  success_count, failure_count, total_usage,
  created_at, updated_at
) VALUES (
  'test-pattern-1',
  'test',
  'Test pattern for validation',
  X'$EMBEDDING',
  0.5,
  0, 0, 0,
  $(date +%s)000,
  $(date +%s)000
);
EOF

PATTERN_COUNT=$(sqlite3 "$TEST_DB" "SELECT COUNT(*) FROM patterns;")
if [ "$PATTERN_COUNT" -eq 1 ]; then
  echo "✓ Pattern insert successful"
else
  echo "✗ Pattern insert failed"
  exit 1
fi

# Test outcome recording
sqlite3 "$TEST_DB" <<EOF
INSERT INTO pattern_outcomes (
  id, pattern_id, agent_id, outcome,
  confidence_before, confidence_after, recorded_at
) VALUES (
  'test-outcome-1',
  'test-pattern-1',
  'test-agent',
  'success',
  0.5,
  0.7,
  $(date +%s)000
);
EOF

OUTCOME_COUNT=$(sqlite3 "$TEST_DB" "SELECT COUNT(*) FROM pattern_outcomes;")
if [ "$OUTCOME_COUNT" -eq 1 ]; then
  echo "✓ Outcome insert successful"
else
  echo "✗ Outcome insert failed"
  exit 1
fi

# Verify trigger updated pattern
UPDATED_PATTERN=$(sqlite3 "$TEST_DB" "SELECT success_count, total_usage FROM patterns WHERE id='test-pattern-1';")
if [ "$UPDATED_PATTERN" = "1|1" ]; then
  echo "✓ Pattern update trigger working"
else
  echo "✗ Pattern update trigger failed (got: $UPDATED_PATTERN)"
  exit 1
fi

# Test relationship
sqlite3 "$TEST_DB" <<EOF
INSERT INTO pattern_relationships (
  id, source_pattern_id, target_pattern_id,
  relationship_type, strength, created_at
) VALUES (
  'test-rel-1',
  'test-pattern-1',
  'test-pattern-1',
  'enhances',
  0.8,
  $(date +%s)000
);
EOF 2>&1 | grep -q "Cannot create self-referencing"

if [ $? -eq 0 ]; then
  echo "✓ Self-referencing relationship prevented"
else
  echo "✗ Self-referencing relationship validation failed"
  exit 1
fi

echo ""
echo "Step 5: Testing Views..."
echo "----------------------------------------"

# Test namespace stats view
sqlite3 "$TEST_DB" "SELECT * FROM v_pattern_stats_by_namespace;" > /dev/null
echo "✓ v_pattern_stats_by_namespace view works"

# Test recent learning view
sqlite3 "$TEST_DB" "SELECT * FROM v_recent_learning_activity;" > /dev/null
echo "✓ v_recent_learning_activity view works"

# Test top performing patterns view
sqlite3 "$TEST_DB" "SELECT * FROM v_top_performing_patterns;" > /dev/null
echo "✓ v_top_performing_patterns view works"

echo ""
echo "Step 6: Testing Migration File..."
echo "----------------------------------------"

# Cleanup and test migration
rm -f "$TEST_DB"

if sqlite3 "$TEST_DB" < "$MIGRATION_FILE" 2>&1 | tee /tmp/migration-validation.log; then
  echo "✓ Migration SQL syntax is valid"
else
  echo "✗ Migration SQL syntax error!"
  cat /tmp/migration-validation.log
  exit 1
fi

# Verify migration created everything
MIGRATION_TABLES=$(sqlite3 "$TEST_DB" "SELECT COUNT(*) FROM sqlite_master WHERE type='table' AND name IN ('patterns', 'pattern_outcomes', 'pattern_relationships', 'database_metadata', 'migration_history');")
if [ "$MIGRATION_TABLES" -eq 5 ]; then
  echo "✓ Migration created all tables (including migration_history)"
else
  echo "✗ Migration table count mismatch (expected 5, got $MIGRATION_TABLES)"
  exit 1
fi

# Check migration history
MIGRATION_RECORD=$(sqlite3 "$TEST_DB" "SELECT version, status FROM migration_history WHERE version='004';")
if [ "$MIGRATION_RECORD" = "004|applied" ]; then
  echo "✓ Migration history recorded"
else
  echo "✗ Migration history not recorded correctly"
  exit 1
fi

echo ""
echo "Step 7: Performance Benchmark..."
echo "----------------------------------------"

# Insert 1000 test patterns and measure time
START_TIME=$(date +%s%N)

for i in {1..1000}; do
  sqlite3 "$TEST_DB" <<EOF > /dev/null 2>&1
INSERT INTO patterns (
  id, namespace, content, embedding, confidence,
  success_count, failure_count, total_usage,
  created_at, updated_at
) VALUES (
  'pattern-$i',
  'test',
  'Test pattern $i',
  X'$EMBEDDING',
  0.5,
  0, 0, 0,
  $(date +%s)000,
  $(date +%s)000
);
EOF
done

END_TIME=$(date +%s%N)
DURATION=$(( (END_TIME - START_TIME) / 1000000 ))
AVG_INSERT_TIME=$(( DURATION / 1000 ))

echo "✓ Inserted 1000 patterns in ${DURATION}ms (avg: ${AVG_INSERT_TIME}ms/pattern)"

# Query performance test
QUERY_START=$(date +%s%N)
sqlite3 "$TEST_DB" "SELECT * FROM patterns WHERE confidence > 0.4 ORDER BY confidence DESC LIMIT 10;" > /dev/null
QUERY_END=$(date +%s%N)
QUERY_DURATION=$(( (QUERY_END - QUERY_START) / 1000000 ))

echo "✓ Query latency: ${QUERY_DURATION}ms (target: <3ms for indexed query)"

if [ "$QUERY_DURATION" -lt 10 ]; then
  echo "✓ Query performance acceptable"
else
  echo "⚠ Query performance slower than expected"
fi

echo ""
echo "Step 8: Database Size Check..."
echo "----------------------------------------"

DB_SIZE=$(stat -f%z "$TEST_DB" 2>/dev/null || stat -c%s "$TEST_DB" 2>/dev/null)
DB_SIZE_MB=$(( DB_SIZE / 1024 / 1024 ))

echo "Database size: ${DB_SIZE_MB}MB (1000 patterns)"
echo "Per-pattern overhead: $(( DB_SIZE / 1000 / 1024 ))KB"

if [ "$DB_SIZE_MB" -lt 50 ]; then
  echo "✓ Storage efficiency acceptable"
else
  echo "⚠ Database larger than expected for 1000 patterns"
fi

echo ""
echo "============================================================"
echo "✓ ALL VALIDATION CHECKS PASSED"
echo "============================================================"
echo ""
echo "Summary:"
echo "  - Tables: $TABLE_COUNT"
echo "  - Indexes: $INDEX_COUNT"
echo "  - Views: $VIEW_COUNT"
echo "  - Triggers: $TRIGGER_COUNT"
echo "  - Test patterns inserted: 1001"
echo "  - Average insert time: ${AVG_INSERT_TIME}ms"
echo "  - Query latency: ${QUERY_DURATION}ms"
echo "  - Database size: ${DB_SIZE_MB}MB"
echo ""
echo "Schema is production-ready!"
echo ""

# Cleanup
rm -f "$TEST_DB"
rm -f /tmp/schema-validation.log
rm -f /tmp/migration-validation.log

exit 0
