#!/bin/bash
# Comprehensive Text Post and Comment Ticket Testing
# Runs integration tests with REAL backend server

set -e

# Color codes
GREEN='\033[0;32m'
RED='\033[0;31m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

echo ""
echo "╔════════════════════════════════════════════════════════════╗"
echo "║  TEXT POST & COMMENT TICKET VALIDATION TEST SUITE          ║"
echo "║  Real Backend Integration Tests - NO MOCKS                 ║"
echo "╚════════════════════════════════════════════════════════════╝"
echo ""

# Project root
PROJECT_ROOT="/workspaces/agent-feed"
API_SERVER_DIR="$PROJECT_ROOT/api-server"
TESTS_DIR="$PROJECT_ROOT/tests"
DB_PATH="$PROJECT_ROOT/database.db"

# Server PID file
PID_FILE="/tmp/agent-feed-server.pid"

# Test results
SUMMARY_FILE="$TESTS_DIR/TEXT-POST-TEST-SUMMARY.md"

# Cleanup function
cleanup() {
    echo ""
    echo -e "${BLUE}🧹 Cleanup...${NC}"

    # Kill server if running
    if [ -f "$PID_FILE" ]; then
        SERVER_PID=$(cat "$PID_FILE")
        if ps -p "$SERVER_PID" > /dev/null 2>&1; then
            echo "   Stopping server (PID: $SERVER_PID)..."
            kill "$SERVER_PID" 2>/dev/null || true
            sleep 2
        fi
        rm -f "$PID_FILE"
    fi

    echo -e "${GREEN}✓${NC} Cleanup complete"
}

# Set trap for cleanup
trap cleanup EXIT

echo "📋 Pre-flight Checks:"
echo "   Project Root: $PROJECT_ROOT"
echo "   Database: $DB_PATH"
echo "   API Server: $API_SERVER_DIR"
echo ""

# Check database exists
if [ ! -f "$DB_PATH" ]; then
    echo -e "${RED}✗${NC} Database not found: $DB_PATH"
    exit 1
fi
echo -e "${GREEN}✓${NC} Database found"

# Check if server is already running
if curl -s http://localhost:3001/health > /dev/null 2>&1; then
    echo -e "${YELLOW}⚠${NC} Server already running - will use existing instance"
    SERVER_ALREADY_RUNNING=true
else
    SERVER_ALREADY_RUNNING=false

    echo ""
    echo -e "${BLUE}🚀 Starting Backend Server...${NC}"

    # Start server in background
    cd "$API_SERVER_DIR"
    npm start > /tmp/server.log 2>&1 &
    SERVER_PID=$!
    echo $SERVER_PID > "$PID_FILE"

    echo "   Server PID: $SERVER_PID"
    echo "   Log file: /tmp/server.log"

    # Wait for server to be ready
    echo "   Waiting for server to start..."
    MAX_WAIT=30
    WAITED=0

    while [ $WAITED -lt $MAX_WAIT ]; do
        if curl -s http://localhost:3001/health > /dev/null 2>&1; then
            echo -e "${GREEN}✓${NC} Server is ready (${WAITED}s)"
            break
        fi
        sleep 1
        WAITED=$((WAITED + 1))
        printf "."
    done

    if [ $WAITED -eq $MAX_WAIT ]; then
        echo ""
        echo -e "${RED}✗${NC} Server failed to start within ${MAX_WAIT}s"
        echo "   Check logs: /tmp/server.log"
        tail -20 /tmp/server.log
        exit 1
    fi
fi

echo ""
echo "════════════════════════════════════════════════════════════"
echo " PHASE 1: Node.js Integration Tests"
echo "════════════════════════════════════════════════════════════"
echo ""

cd "$TESTS_DIR/integration"

echo -e "${BLUE}Running text-post-validation.test.js...${NC}"
node --test text-post-validation.test.js > /tmp/text-post-test.log 2>&1
TEXT_POST_EXIT=$?

if [ $TEXT_POST_EXIT -eq 0 ]; then
    echo -e "${GREEN}✓${NC} Text post validation tests PASSED"
    cat /tmp/text-post-test.log
else
    echo -e "${RED}✗${NC} Text post validation tests FAILED"
    cat /tmp/text-post-test.log
fi

echo ""
echo "════════════════════════════════════════════════════════════"
echo " PHASE 2: Comment Ticket Regression Tests"
echo "════════════════════════════════════════════════════════════"
echo ""

echo -e "${BLUE}Running comment-ticket-creation.test.js...${NC}"
node --test comment-ticket-creation.test.js > /tmp/comment-ticket-test.log 2>&1
COMMENT_EXIT=$?

if [ $COMMENT_EXIT -eq 0 ]; then
    echo -e "${GREEN}✓${NC} Comment ticket tests PASSED"
    cat /tmp/comment-ticket-test.log
else
    echo -e "${RED}✗${NC} Comment ticket tests FAILED"
    cat /tmp/comment-ticket-test.log
fi

echo ""
echo "════════════════════════════════════════════════════════════"
echo " PHASE 3: Shell Script Validation Tests"
echo "════════════════════════════════════════════════════════════"
echo ""

cd "$TESTS_DIR"

echo -e "${BLUE}Running validate-text-posts.sh...${NC}"
bash validate-text-posts.sh > /tmp/validate-text-posts.log 2>&1
VALIDATE_EXIT=$?

if [ $VALIDATE_EXIT -eq 0 ]; then
    echo -e "${GREEN}✓${NC} Shell validation tests PASSED"
    cat /tmp/validate-text-posts.log
else
    echo -e "${RED}✗${NC} Shell validation tests FAILED"
    cat /tmp/validate-text-posts.log
fi

echo ""
echo "════════════════════════════════════════════════════════════"
echo " PHASE 4: Database Verification"
echo "════════════════════════════════════════════════════════════"
echo ""

echo -e "${BLUE}Checking work_queue_tickets table...${NC}"

# Count tickets with null URL
NULL_URL_COUNT=$(sqlite3 "$DB_PATH" "SELECT COUNT(*) FROM work_queue_tickets WHERE url IS NULL;")
echo "   Tickets with url=NULL: $NULL_URL_COUNT"

# Count tickets with non-null URL
NON_NULL_URL_COUNT=$(sqlite3 "$DB_PATH" "SELECT COUNT(*) FROM work_queue_tickets WHERE url IS NOT NULL;")
echo "   Tickets with URL: $NON_NULL_URL_COUNT"

# Show recent tickets
echo ""
echo "   Recent tickets (last 5):"
sqlite3 "$DB_PATH" "SELECT id, post_id, url, status, priority FROM work_queue_tickets ORDER BY created_at DESC LIMIT 5;" | while read line; do
    echo "      $line"
done

# Check comment tickets
COMMENT_TICKETS=$(sqlite3 "$DB_PATH" "SELECT COUNT(*) FROM work_queue_tickets WHERE metadata LIKE '%\"type\":\"comment\"%';")
echo ""
echo "   Comment tickets: $COMMENT_TICKETS"

# Check post tickets
POST_TICKETS=$(sqlite3 "$DB_PATH" "SELECT COUNT(*) FROM work_queue_tickets WHERE metadata LIKE '%\"type\":\"post\"%';")
echo "   Post tickets: $POST_TICKETS"

echo ""
echo "════════════════════════════════════════════════════════════"
echo " PHASE 5: Server Logs Analysis"
echo "════════════════════════════════════════════════════════════"
echo ""

if [ -f "/tmp/server.log" ]; then
    echo -e "${BLUE}Recent server activity:${NC}"
    echo ""

    # Show errors
    if grep -i "error" /tmp/server.log > /dev/null 2>&1; then
        echo "   ERRORS found:"
        grep -i "error" /tmp/server.log | tail -10 | while read line; do
            echo -e "${RED}      $line${NC}"
        done
    else
        echo -e "${GREEN}   No errors in server logs${NC}"
    fi

    echo ""

    # Show orchestrator activity
    if grep -i "orchestrator" /tmp/server.log > /dev/null 2>&1; then
        echo "   Orchestrator activity:"
        grep -i "orchestrator" /tmp/server.log | tail -5 | while read line; do
            echo "      $line"
        done
    fi

    echo ""

    # Show ticket processing
    if grep -i "ticket" /tmp/server.log > /dev/null 2>&1; then
        echo "   Ticket processing:"
        grep -i "ticket" /tmp/server.log | tail -5 | while read line; do
            echo "      $line"
        done
    fi
fi

echo ""
echo "════════════════════════════════════════════════════════════"
echo " TEST SUMMARY"
echo "════════════════════════════════════════════════════════════"
echo ""

# Generate summary report
cat > "$SUMMARY_FILE" << EOF
# Text Post and Comment Ticket Validation - Test Summary

**Test Date:** $(date)
**Database:** $DB_PATH
**Server:** http://localhost:3001

## Test Results

### Phase 1: Node.js Integration Tests - text-post-validation.test.js
$(if [ $TEXT_POST_EXIT -eq 0 ]; then echo "✅ **PASSED**"; else echo "❌ **FAILED**"; fi)

\`\`\`
$(cat /tmp/text-post-test.log)
\`\`\`

### Phase 2: Comment Ticket Regression Tests - comment-ticket-creation.test.js
$(if [ $COMMENT_EXIT -eq 0 ]; then echo "✅ **PASSED**"; else echo "❌ **FAILED**"; fi)

\`\`\`
$(cat /tmp/comment-ticket-test.log)
\`\`\`

### Phase 3: Shell Script Validation - validate-text-posts.sh
$(if [ $VALIDATE_EXIT -eq 0 ]; then echo "✅ **PASSED**"; else echo "❌ **FAILED**"; fi)

\`\`\`
$(cat /tmp/validate-text-posts.log)
\`\`\`

## Database State

### Ticket Statistics
- Tickets with url=NULL: $NULL_URL_COUNT
- Tickets with URL: $NON_NULL_URL_COUNT
- Comment tickets: $COMMENT_TICKETS
- Post tickets: $POST_TICKETS

### Recent Tickets
\`\`\`
$(sqlite3 "$DB_PATH" "SELECT id, post_id, url, status, priority FROM work_queue_tickets ORDER BY created_at DESC LIMIT 10;")
\`\`\`

## Server Logs

### Errors
\`\`\`
$(grep -i "error" /tmp/server.log 2>/dev/null | tail -20 || echo "No errors found")
\`\`\`

### Recent Activity
\`\`\`
$(tail -50 /tmp/server.log 2>/dev/null || echo "No server logs available")
\`\`\`

## Validation Checklist

- [$(if [ $TEXT_POST_EXIT -eq 0 ]; then echo "x"; else echo " "; fi)] Text posts create tickets with url=null
- [$(if [ $COMMENT_EXIT -eq 0 ]; then echo "x"; else echo " "; fi)] Comments create tickets with url=null
- [$(if [ $VALIDATE_EXIT -eq 0 ]; then echo "x"; else echo " "; fi)] Shell validation passes
- [$(if [ "$NULL_URL_COUNT" -gt 0 ]; then echo "x"; else echo " "; fi)] Database contains tickets with null URLs
- [$(if [ "$COMMENT_TICKETS" -gt 0 ]; then echo "x"; else echo " "; fi)] Comment tickets have correct metadata

## Overall Status

$(if [ $TEXT_POST_EXIT -eq 0 ] && [ $COMMENT_EXIT -eq 0 ] && [ $VALIDATE_EXIT -eq 0 ]; then
    echo "✅ **ALL TESTS PASSED**"
else
    echo "❌ **SOME TESTS FAILED**"
fi)

---
*Generated by RUN-TEXT-POST-TESTS.sh*
EOF

# Display summary
echo "Test Results:"
echo "   Text Post Tests: $(if [ $TEXT_POST_EXIT -eq 0 ]; then echo -e "${GREEN}PASSED${NC}"; else echo -e "${RED}FAILED${NC}"; fi)"
echo "   Comment Tests: $(if [ $COMMENT_EXIT -eq 0 ]; then echo -e "${GREEN}PASSED${NC}"; else echo -e "${RED}FAILED${NC}"; fi)"
echo "   Validation Tests: $(if [ $VALIDATE_EXIT -eq 0 ]; then echo -e "${GREEN}PASSED${NC}"; else echo -e "${RED}FAILED${NC}"; fi)"
echo ""
echo "Summary report: $SUMMARY_FILE"

# Overall exit code
if [ $TEXT_POST_EXIT -eq 0 ] && [ $COMMENT_EXIT -eq 0 ] && [ $VALIDATE_EXIT -eq 0 ]; then
    echo ""
    echo -e "${GREEN}╔════════════════════════════════════════════════════════════╗${NC}"
    echo -e "${GREEN}║  ✅ ALL TESTS PASSED - VALIDATION COMPLETE                 ║${NC}"
    echo -e "${GREEN}╚════════════════════════════════════════════════════════════╝${NC}"
    echo ""
    exit 0
else
    echo ""
    echo -e "${RED}╔════════════════════════════════════════════════════════════╗${NC}"
    echo -e "${RED}║  ❌ SOME TESTS FAILED - CHECK LOGS                          ║${NC}"
    echo -e "${RED}╚════════════════════════════════════════════════════════════╝${NC}"
    echo ""
    exit 1
fi
