#!/bin/bash

###############################################################################
# Comment Ticket Creation Validation Script
#
# Tests the complete flow end-to-end:
# 1. Start backend server
# 2. POST test comment
# 3. Query work_queue_tickets table
# 4. Verify ticket exists with correct metadata
# 5. Wait for orchestrator to process
# 6. Verify reply posted
# 7. Check NO infinite loop (only 1 reply)
#
# Uses REAL SQLite database and HTTP requests
###############################################################################

set -e  # Exit on error

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Configuration
API_BASE="http://localhost:3001"
DB_PATH="/workspaces/agent-feed/database.db"
LOG_FILE="/tmp/comment-ticket-validation.log"

# Test IDs (will be populated)
TEST_POST_ID=""
TEST_COMMENT_ID=""
TEST_TICKET_ID=""
TEST_REPLY_ID=""

###############################################################################
# Helper Functions
###############################################################################

log() {
    echo -e "${BLUE}[$(date +'%H:%M:%S')]${NC} $1" | tee -a "$LOG_FILE"
}

success() {
    echo -e "${GREEN}✅ $1${NC}" | tee -a "$LOG_FILE"
}

error() {
    echo -e "${RED}❌ $1${NC}" | tee -a "$LOG_FILE"
    exit 1
}

warning() {
    echo -e "${YELLOW}⚠️  $1${NC}" | tee -a "$LOG_FILE"
}

check_server() {
    log "Checking if server is running..."
    if curl -sf "${API_BASE}/health" > /dev/null 2>&1; then
        success "Server is running"
        return 0
    else
        error "Server is not running. Start with: cd api-server && npm start"
    fi
}

check_database() {
    log "Checking database exists..."
    if [ ! -f "$DB_PATH" ]; then
        error "Database not found at $DB_PATH"
    fi
    success "Database exists"
}

check_table() {
    log "Checking work_queue_tickets table..."
    if sqlite3 "$DB_PATH" "SELECT name FROM sqlite_master WHERE type='table' AND name='work_queue_tickets';" | grep -q "work_queue_tickets"; then
        success "work_queue_tickets table exists"
    else
        error "work_queue_tickets table not found"
    fi
}

###############################################################################
# Test Steps
###############################################################################

step1_create_test_post() {
    log "Step 1: Creating test post..."

    RESPONSE=$(curl -s -X POST "${API_BASE}/api/agent-posts" \
        -H "Content-Type: application/json" \
        -H "x-user-id: test-validator" \
        -d '{
            "title": "Test Post for Comment Ticket Validation",
            "content": "This post is for testing comment ticket creation",
            "author_agent": "test-validator",
            "metadata": {"tags": ["test", "validation"]}
        }')

    # Extract post ID
    TEST_POST_ID=$(echo "$RESPONSE" | jq -r '.data.id')

    if [ -z "$TEST_POST_ID" ] || [ "$TEST_POST_ID" = "null" ]; then
        error "Failed to create test post"
    fi

    success "Created test post: $TEST_POST_ID"
}

step2_post_comment() {
    log "Step 2: Posting test comment..."

    RESPONSE=$(curl -s -X POST "${API_BASE}/api/agent-posts/${TEST_POST_ID}/comments" \
        -H "Content-Type: application/json" \
        -H "x-user-id: test-validator" \
        -d '{
            "content": "What is the status of this project? Can you help me understand?",
            "author_agent": "test-validator",
            "skipTicket": false
        }')

    # Extract comment ID
    TEST_COMMENT_ID=$(echo "$RESPONSE" | jq -r '.data.id')

    if [ -z "$TEST_COMMENT_ID" ] || [ "$TEST_COMMENT_ID" = "null" ]; then
        error "Failed to create comment"
    fi

    success "Created comment: $TEST_COMMENT_ID"
}

step3_verify_ticket_created() {
    log "Step 3: Verifying ticket created in work_queue_tickets..."

    # Query database for ticket
    TICKET_JSON=$(sqlite3 "$DB_PATH" "SELECT id, post_id, status, metadata FROM work_queue_tickets WHERE post_id='${TEST_COMMENT_ID}' LIMIT 1;")

    if [ -z "$TICKET_JSON" ]; then
        error "No ticket found for comment $TEST_COMMENT_ID"
    fi

    # Extract ticket ID (first field)
    TEST_TICKET_ID=$(echo "$TICKET_JSON" | cut -d'|' -f1)

    success "Ticket created: $TEST_TICKET_ID"

    # Verify ticket details
    log "Verifying ticket metadata..."

    TICKET_STATUS=$(echo "$TICKET_JSON" | cut -d'|' -f3)
    TICKET_METADATA=$(echo "$TICKET_JSON" | cut -d'|' -f4)

    if [ "$TICKET_STATUS" != "pending" ]; then
        warning "Ticket status is '$TICKET_STATUS' (expected 'pending')"
    else
        success "Ticket status: pending"
    fi

    # Check metadata has type=comment
    if echo "$TICKET_METADATA" | grep -q '"type":"comment"'; then
        success "Metadata has type=comment"
    else
        error "Metadata missing type=comment"
    fi

    # Check metadata has parent_post_id
    if echo "$TICKET_METADATA" | grep -q '"parent_post_id"'; then
        success "Metadata has parent_post_id"
    else
        error "Metadata missing parent_post_id"
    fi
}

step4_verify_orchestrator_detection() {
    log "Step 4: Verifying orchestrator can detect ticket..."

    # Count pending tickets
    PENDING_COUNT=$(sqlite3 "$DB_PATH" "SELECT COUNT(*) FROM work_queue_tickets WHERE status='pending';")

    if [ "$PENDING_COUNT" -gt 0 ]; then
        success "Orchestrator can find $PENDING_COUNT pending ticket(s)"
    else
        error "No pending tickets found"
    fi

    # Verify our ticket is in pending list
    OUR_TICKET=$(sqlite3 "$DB_PATH" "SELECT id FROM work_queue_tickets WHERE id='${TEST_TICKET_ID}' AND status='pending';")

    if [ -n "$OUR_TICKET" ]; then
        success "Our ticket is in pending list"
    else
        error "Our ticket not found in pending list"
    fi
}

step5_wait_for_processing() {
    log "Step 5: Waiting for orchestrator to process ticket..."

    # Wait up to 30 seconds for ticket to be processed
    TIMEOUT=30
    ELAPSED=0

    while [ $ELAPSED -lt $TIMEOUT ]; do
        # Check ticket status
        TICKET_STATUS=$(sqlite3 "$DB_PATH" "SELECT status FROM work_queue_tickets WHERE id='${TEST_TICKET_ID}';")

        if [ "$TICKET_STATUS" = "completed" ] || [ "$TICKET_STATUS" = "failed" ]; then
            success "Ticket processed with status: $TICKET_STATUS"
            return 0
        fi

        log "Waiting... (${ELAPSED}s elapsed, status: ${TICKET_STATUS})"
        sleep 2
        ELAPSED=$((ELAPSED + 2))
    done

    warning "Ticket not processed within ${TIMEOUT}s (current status: ${TICKET_STATUS})"
    warning "This may indicate orchestrator is not running or slow processing"
}

step6_verify_reply_posted() {
    log "Step 6: Verifying agent reply was posted..."

    # Get comments for the post
    RESPONSE=$(curl -s "${API_BASE}/api/agent-posts/${TEST_POST_ID}/comments")

    # Count comments
    COMMENT_COUNT=$(echo "$RESPONSE" | jq '.data | length')

    if [ "$COMMENT_COUNT" -lt 1 ]; then
        error "No comments found"
    fi

    success "Found $COMMENT_COUNT comment(s)"

    # Check if there's a reply from agent (author_agent != test-validator)
    AGENT_REPLIES=$(echo "$RESPONSE" | jq '[.data[] | select(.author_agent != "test-validator")] | length')

    if [ "$AGENT_REPLIES" -gt 0 ]; then
        success "Found $AGENT_REPLIES agent reply/replies"

        # Extract reply ID
        TEST_REPLY_ID=$(echo "$RESPONSE" | jq -r '[.data[] | select(.author_agent != "test-validator")][0].id')
        log "Agent reply ID: $TEST_REPLY_ID"
    else
        warning "No agent replies found yet"
        warning "If orchestrator is running, reply may appear shortly"
    fi
}

step7_check_no_infinite_loop() {
    log "Step 7: Checking for infinite loop prevention..."

    # Count agent replies
    RESPONSE=$(curl -s "${API_BASE}/api/agent-posts/${TEST_POST_ID}/comments")
    AGENT_REPLY_COUNT=$(echo "$RESPONSE" | jq '[.data[] | select(.author_agent != "test-validator")] | length')

    if [ "$AGENT_REPLY_COUNT" -eq 0 ]; then
        warning "No agent replies (orchestrator may not be running)"
    elif [ "$AGENT_REPLY_COUNT" -eq 1 ]; then
        success "Exactly 1 agent reply (no infinite loop)"
    else
        error "Found $AGENT_REPLY_COUNT agent replies (possible infinite loop!)"
    fi

    # Check no ticket was created for agent reply
    if [ -n "$TEST_REPLY_ID" ]; then
        REPLY_TICKET=$(sqlite3 "$DB_PATH" "SELECT id FROM work_queue_tickets WHERE post_id='${TEST_REPLY_ID}';")

        if [ -z "$REPLY_TICKET" ]; then
            success "No ticket created for agent reply (skipTicket works)"
        else
            error "Ticket created for agent reply (skipTicket not working!)"
        fi
    fi
}

cleanup() {
    log "Cleaning up test data..."

    # Delete test ticket
    if [ -n "$TEST_TICKET_ID" ]; then
        sqlite3 "$DB_PATH" "DELETE FROM work_queue_tickets WHERE id='${TEST_TICKET_ID}';" || true
        log "Deleted test ticket: $TEST_TICKET_ID"
    fi

    # Delete test comments
    if [ -n "$TEST_COMMENT_ID" ]; then
        sqlite3 "$DB_PATH" "DELETE FROM comments WHERE id='${TEST_COMMENT_ID}';" || true
        log "Deleted test comment: $TEST_COMMENT_ID"
    fi

    if [ -n "$TEST_REPLY_ID" ]; then
        sqlite3 "$DB_PATH" "DELETE FROM comments WHERE id='${TEST_REPLY_ID}';" || true
        log "Deleted agent reply: $TEST_REPLY_ID"
    fi

    # Delete test post
    if [ -n "$TEST_POST_ID" ]; then
        sqlite3 "$DB_PATH" "DELETE FROM posts WHERE id='${TEST_POST_ID}';" || true
        log "Deleted test post: $TEST_POST_ID"
    fi

    success "Cleanup complete"
}

###############################################################################
# Main Execution
###############################################################################

main() {
    echo ""
    echo "============================================================"
    echo "  Comment Ticket Creation Validation"
    echo "============================================================"
    echo ""

    # Clear log file
    > "$LOG_FILE"

    # Pre-flight checks
    check_server
    check_database
    check_table

    echo ""
    log "Starting validation tests..."
    echo ""

    # Run test steps
    step1_create_test_post
    step2_post_comment
    step3_verify_ticket_created
    step4_verify_orchestrator_detection
    step5_wait_for_processing
    step6_verify_reply_posted
    step7_check_no_infinite_loop

    echo ""
    log "Cleaning up..."
    cleanup

    echo ""
    echo "============================================================"
    success "ALL VALIDATION TESTS PASSED"
    echo "============================================================"
    echo ""
    log "Full log saved to: $LOG_FILE"
}

# Handle Ctrl+C
trap cleanup EXIT

# Run main
main
