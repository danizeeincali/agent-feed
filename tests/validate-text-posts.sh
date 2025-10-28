#!/bin/bash

# Validation Script for Text Post and Reply Posting Fixes
# Tests URL validation and reply posting using REAL backend

set -e

echo "🧪 TEXT POST VALIDATION & REPLY POSTING - Integration Tests"
echo "============================================================"
echo ""

# Colors for output
GREEN='\033[0;32m'
RED='\033[0;31m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

# Check if database exists
if [ ! -f "database.db" ]; then
    echo -e "${RED}❌ Error: database.db not found${NC}"
    echo "Please ensure the database is initialized"
    exit 1
fi

echo "📊 Database Status:"
sqlite3 database.db "SELECT COUNT(*) as ticket_count FROM work_queue;" 2>/dev/null || echo "⚠️  Could not query work_queue table"
echo ""

# Run integration tests
echo -e "${YELLOW}▶ Running Integration Tests...${NC}"
echo ""

node --test tests/integration/text-post-validation.test.js

TEST_EXIT_CODE=$?

echo ""
echo "============================================================"

if [ $TEST_EXIT_CODE -eq 0 ]; then
    echo -e "${GREEN}✅ ALL TESTS PASSED${NC}"
    echo ""
    echo "Validation Summary:"
    echo "  ✓ Text posts without URL pass validation"
    echo "  ✓ Comments without URL pass validation"
    echo "  ✓ Link posts with URL pass validation"
    echo "  ✓ Missing required fields fail validation"
    echo "  ✓ Comment replies use parent_post_id correctly"
    echo "  ✓ Regular post replies use post_id correctly"
    echo ""
    exit 0
else
    echo -e "${RED}❌ TESTS FAILED${NC}"
    echo ""
    echo "Please review the test output above for details."
    echo ""
    exit 1
fi
