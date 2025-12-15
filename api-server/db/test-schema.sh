#!/bin/bash
# Simple schema validation test
set -e

DB="/tmp/reasoningbank-test.db"
SCHEMA="/workspaces/agent-feed/api-server/db/reasoningbank-schema.sql"

echo "Testing ReasoningBank Schema..."
echo ""

# Clean up
rm -f "$DB"

# Apply schema
echo "1. Applying schema..."
sqlite3 "$DB" < "$SCHEMA"
echo "   ✓ Schema applied"

# Check tables
echo "2. Checking tables..."
TABLES=$(sqlite3 "$DB" "SELECT COUNT(*) FROM sqlite_master WHERE type='table' AND name IN ('patterns', 'pattern_outcomes', 'pattern_relationships', 'database_metadata');")
echo "   Found $TABLES/4 tables"

# Check indexes
echo "3. Checking indexes..."
INDEXES=$(sqlite3 "$DB" "SELECT COUNT(*) FROM sqlite_master WHERE type='index' AND name LIKE 'idx_%';")
echo "   Found $INDEXES indexes"

# Check views
echo "4. Checking views..."
VIEWS=$(sqlite3 "$DB" "SELECT COUNT(*) FROM sqlite_master WHERE type='view' AND name LIKE 'v_%';")
echo "   Found $VIEWS views"

# Check triggers
echo "5. Checking triggers..."
TRIGGERS=$(sqlite3 "$DB" "SELECT COUNT(*) FROM sqlite_master WHERE type='trigger' AND name LIKE 'trg_%';")
echo "   Found $TRIGGERS triggers"

# Integrity check
echo "6. Integrity check..."
sqlite3 "$DB" "PRAGMA integrity_check;" | grep -q "ok" && echo "   ✓ Database integrity OK"

# List all database objects
echo ""
echo "Database structure:"
sqlite3 "$DB" "SELECT type, name FROM sqlite_master WHERE name NOT LIKE 'sqlite_%' ORDER BY type, name;"

echo ""
echo "✓ Schema validation complete"
echo "  Database: $DB"
echo "  Size: $(du -h "$DB" | cut -f1)"

rm -f "$DB"
