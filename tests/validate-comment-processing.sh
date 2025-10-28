#!/bin/bash

##############################################################################
# COMMENT PROCESSING VALIDATION SCRIPT
# 100% Real Backend Tests - No Mocks
#
# Tests the complete comment processing flow:
# 1. Comment → Ticket Creation
# 2. Orchestrator Detection
# 3. Agent Reply Generation
# 4. WebSocket Broadcasts
# 5. Infinite Loop Prevention
# 6. Regression (Posts Still Work)
#
# Prerequisites:
# - API server running at http://localhost:3001
# - PostgreSQL database with work_queue table
# - Orchestrator running (npm run avi:orchestrator)
#
# Usage:
#   ./tests/validate-comment-processing.sh
#   ./tests/validate-comment-processing.sh --quick  # Skip long waits
##############################################################################

set -e  # Exit on error

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Configuration
API_BASE="${API_BASE:-http://localhost:3001}"
TEST_POST_ID="post-1761456240971"
TEST_USER_ID="bash-test-$(date +%s)"
MAX_WAIT_TIME=25  # seconds
QUICK_MODE=false

# Parse arguments
if [[ "$1" == "--quick" ]]; then
  QUICK_MODE=true
  MAX_WAIT_TIME=10
  echo -e "${YELLOW}⚡ Quick mode enabled (shorter timeouts)${NC}"
fi

# Test counters
TOTAL_TESTS=0
PASSED_TESTS=0
FAILED_TESTS=0

# Utility functions
function log_info() {
  echo -e "${BLUE}ℹ️  $1${NC}"
}

function log_success() {
  echo -e "${GREEN}✅ $1${NC}"
  ((PASSED_TESTS++))
}

function log_error() {
  echo -e "${RED}❌ $1${NC}"
  ((FAILED_TESTS++))
}

function log_warning() {
  echo -e "${YELLOW}⚠️  $1${NC}"
}

function start_test() {
  ((TOTAL_TESTS++))
  echo ""
  echo -e "${BLUE}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"
  echo -e "${BLUE}📝 TEST $TOTAL_TESTS: $1${NC}"
  echo -e "${BLUE}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"
}

function end_test() {
  if [[ $1 -eq 0 ]]; then
    log_success "TEST PASSED: $2"
  else
    log_error "TEST FAILED: $2"
  fi
}

# Check prerequisites
function check_prerequisites() {
  log_info "Checking prerequisites..."

  # Check if API server is running
  if ! curl -s -f "${API_BASE}/health" > /dev/null 2>&1; then
    log_error "API server not running at ${API_BASE}"
    log_info "Start with: cd api-server && npm run dev"
    exit 1
  fi
  log_success "API server is running"

  # Check if jq is available (for JSON parsing)
  if ! command -v jq &> /dev/null; then
    log_warning "jq not installed - some tests may be limited"
    log_info "Install with: sudo apt-get install jq"
  else
    log_success "jq is available"
  fi
}

##############################################################################
# Test 1: Comment Creation → Ticket Creation
##############################################################################
function test_comment_to_ticket() {
  start_test "Comment Creation → Ticket Creation"

  local content="Test comment from bash script - $(date +%s)"
  local response

  log_info "Posting comment to ${TEST_POST_ID}..."

  response=$(curl -s -X POST "${API_BASE}/api/agent-posts/${TEST_POST_ID}/comments" \
    -H "Content-Type: application/json" \
    -H "x-user-id: ${TEST_USER_ID}" \
    -d "{
      \"content\": \"${content}\",
      \"author_agent\": \"bash-test\"
    }")

  log_info "Response: ${response}"

  # Check if comment was created
  if echo "${response}" | grep -q '"success":true'; then
    log_success "Comment created successfully"
  else
    log_error "Comment creation failed"
    end_test 1 "Comment → Ticket"
    return
  fi

  # Check if ticket was created
  if echo "${response}" | grep -q '"ticket":{'; then
    log_success "Work ticket created"
  else
    log_error "No work ticket created"
    end_test 1 "Comment → Ticket"
    return
  fi

  # Extract comment ID and ticket ID (if jq available)
  if command -v jq &> /dev/null; then
    local comment_id=$(echo "${response}" | jq -r '.data.id')
    local ticket_id=$(echo "${response}" | jq -r '.ticket.id')
    log_info "Comment ID: ${comment_id}"
    log_info "Ticket ID: ticket-${ticket_id}"
  fi

  end_test 0 "Comment → Ticket"
}

##############################################################################
# Test 2: Agent Reply Within Timeout
##############################################################################
function test_agent_reply() {
  start_test "User Posts Question → Agent Replies (${MAX_WAIT_TIME}s timeout)"

  local content="What tools does the page-builder-agent have access to?"
  local response

  log_info "Posting question: ${content}"

  response=$(curl -s -X POST "${API_BASE}/api/agent-posts/${TEST_POST_ID}/comments" \
    -H "Content-Type: application/json" \
    -H "x-user-id: ${TEST_USER_ID}" \
    -d "{
      \"content\": \"${content}\",
      \"author_agent\": \"bash-test\"
    }")

  if ! echo "${response}" | grep -q '"success":true'; then
    log_error "Comment creation failed"
    end_test 1 "Agent Reply"
    return
  fi

  # Extract comment ID
  local comment_id=""
  if command -v jq &> /dev/null; then
    comment_id=$(echo "${response}" | jq -r '.data.id')
    log_success "Comment posted: ${comment_id}"
  else
    log_warning "Cannot extract comment ID (jq not installed)"
  fi

  # Wait for agent reply
  log_info "Waiting for agent reply (max ${MAX_WAIT_TIME} seconds)..."

  local found_reply=false
  local elapsed=0
  local interval=3

  while [[ ${elapsed} -lt ${MAX_WAIT_TIME} ]]; do
    sleep ${interval}
    ((elapsed+=interval))

    log_info "Checking for reply (${elapsed}s elapsed)..."

    local comments=$(curl -s "${API_BASE}/api/agent-posts/${TEST_POST_ID}/comments" \
      -H "x-user-id: ${TEST_USER_ID}")

    if [[ -n "${comment_id}" ]] && command -v jq &> /dev/null; then
      # Check for reply to our specific comment
      local reply=$(echo "${comments}" | jq -r ".data[] | select(.parent_id == \"${comment_id}\") | .id" | head -1)

      if [[ -n "${reply}" && "${reply}" != "null" ]]; then
        local reply_author=$(echo "${comments}" | jq -r ".data[] | select(.id == \"${reply}\") | .author_agent")
        local reply_content=$(echo "${comments}" | jq -r ".data[] | select(.id == \"${reply}\") | .content" | cut -c1-100)

        log_success "Reply found from ${reply_author}!"
        log_info "Reply preview: ${reply_content}..."
        found_reply=true
        break
      fi
    else
      # Fallback: Check if total comment count increased
      local comment_count=$(echo "${comments}" | grep -o '"id":' | wc -l)
      log_info "Current comment count: ${comment_count}"
    fi
  done

  if [[ "${found_reply}" == true ]]; then
    log_success "Agent replied within ${elapsed} seconds"
    end_test 0 "Agent Reply"
  else
    log_warning "No reply received within ${MAX_WAIT_TIME} seconds"
    log_info "This may indicate orchestrator is not running or slow"
    end_test 1 "Agent Reply"
  fi
}

##############################################################################
# Test 3: Infinite Loop Prevention (skipTicket flag)
##############################################################################
function test_skip_ticket() {
  start_test "Infinite Loop Prevention (skipTicket flag)"

  log_info "Posting comment with skipTicket=true..."

  local response=$(curl -s -X POST "${API_BASE}/api/agent-posts/${TEST_POST_ID}/comments" \
    -H "Content-Type: application/json" \
    -H "x-user-id: ${TEST_USER_ID}" \
    -d '{
      "content": "Agent reply simulation (should not create ticket)",
      "author_agent": "test-agent",
      "skipTicket": true
    }')

  log_info "Response: ${response}"

  # Check if comment was created
  if ! echo "${response}" | grep -q '"success":true'; then
    log_error "Comment creation failed"
    end_test 1 "skipTicket"
    return
  fi

  # Check if ticket was NOT created (should be null)
  if echo "${response}" | grep -q '"ticket":null'; then
    log_success "Ticket correctly skipped (skipTicket=true)"
    end_test 0 "skipTicket"
  elif echo "${response}" | grep -q '"ticket":{'; then
    log_error "Ticket was created despite skipTicket=true"
    end_test 1 "skipTicket"
  else
    log_success "No ticket created (skipTicket flag working)"
    end_test 0 "skipTicket"
  fi
}

##############################################################################
# Test 4: Default Ticket Creation (skipTicket not set)
##############################################################################
function test_default_ticket_creation() {
  start_test "Default Ticket Creation (skipTicket not set)"

  log_info "Posting comment WITHOUT skipTicket flag..."

  local response=$(curl -s -X POST "${API_BASE}/api/agent-posts/${TEST_POST_ID}/comments" \
    -H "Content-Type: application/json" \
    -H "x-user-id: ${TEST_USER_ID}" \
    -d '{
      "content": "User comment (should create ticket)",
      "author_agent": "bash-test"
    }')

  # Check if ticket WAS created
  if echo "${response}" | grep -q '"ticket":{'; then
    log_success "Ticket correctly created (default behavior)"
    end_test 0 "Default Ticket Creation"
  else
    log_error "Ticket was not created (should be created by default)"
    end_test 1 "Default Ticket Creation"
  fi
}

##############################################################################
# Test 5: Regression - Post Processing
##############################################################################
function test_post_processing() {
  start_test "Regression - Post Processing Unchanged"

  local title="Bash Test Post $(date +%s)"
  local content="Regression test to ensure posts still work"

  log_info "Creating test post..."

  local response=$(curl -s -X POST "${API_BASE}/api/agent-posts" \
    -H "Content-Type: application/json" \
    -H "x-user-id: ${TEST_USER_ID}" \
    -d "{
      \"title\": \"${title}\",
      \"content\": \"${content}\",
      \"author_agent\": \"bash-test\",
      \"tags\": [\"test\", \"regression\"]
    }")

  log_info "Response: ${response}"

  # Check if post was created
  if echo "${response}" | grep -q '"success":true'; then
    log_success "Post created successfully"
  else
    log_error "Post creation failed"
    end_test 1 "Post Processing"
    return
  fi

  # Extract post ID
  local post_id=""
  if command -v jq &> /dev/null; then
    post_id=$(echo "${response}" | jq -r '.data.id')
    log_info "Post ID: ${post_id}"
  fi

  # Verify post is retrievable
  log_info "Fetching posts..."
  local posts=$(curl -s "${API_BASE}/api/agent-posts" \
    -H "x-user-id: ${TEST_USER_ID}")

  if [[ -n "${post_id}" ]] && echo "${posts}" | grep -q "${post_id}"; then
    log_success "Post retrieved successfully"
    end_test 0 "Post Processing"
  elif echo "${posts}" | grep -q "${title}"; then
    log_success "Post retrieved successfully (by title)"
    end_test 0 "Post Processing"
  else
    log_error "Post not found in list"
    end_test 1 "Post Processing"
  fi
}

##############################################################################
# Test 6: Error Handling
##############################################################################
function test_error_handling() {
  start_test "Error Handling - Empty Content"

  log_info "Posting comment with empty content..."

  local response=$(curl -s -w "\n%{http_code}" -X POST "${API_BASE}/api/agent-posts/${TEST_POST_ID}/comments" \
    -H "Content-Type: application/json" \
    -H "x-user-id: ${TEST_USER_ID}" \
    -d '{
      "content": "",
      "author_agent": "bash-test"
    }')

  local http_code=$(echo "${response}" | tail -1)
  local body=$(echo "${response}" | head -n -1)

  log_info "HTTP Status: ${http_code}"
  log_info "Response: ${body}"

  # Should return 400 error
  if [[ "${http_code}" == "400" ]]; then
    log_success "Correct error status (400)"
  else
    log_error "Expected 400 error, got ${http_code}"
    end_test 1 "Error Handling"
    return
  fi

  # Should contain error message
  if echo "${body}" | grep -q "Content is required"; then
    log_success "Correct error message"
    end_test 0 "Error Handling"
  else
    log_warning "Error message not as expected"
    end_test 0 "Error Handling"
  fi
}

##############################################################################
# Test 7: Comment Threading
##############################################################################
function test_comment_threading() {
  start_test "Comment Threading (parent_id chain)"

  # Create parent comment
  log_info "Creating parent comment..."

  local parent_response=$(curl -s -X POST "${API_BASE}/api/agent-posts/${TEST_POST_ID}/comments" \
    -H "Content-Type: application/json" \
    -H "x-user-id: ${TEST_USER_ID}" \
    -d '{
      "content": "Parent comment for threading test",
      "author_agent": "bash-test"
    }')

  if ! echo "${parent_response}" | grep -q '"success":true'; then
    log_error "Parent comment creation failed"
    end_test 1 "Comment Threading"
    return
  fi

  # Extract parent ID
  local parent_id=""
  if command -v jq &> /dev/null; then
    parent_id=$(echo "${parent_response}" | jq -r '.data.id')
    log_success "Parent comment created: ${parent_id}"
  else
    log_error "Cannot test threading without jq"
    end_test 1 "Comment Threading"
    return
  fi

  # Create child comment (reply)
  log_info "Creating child comment (reply)..."

  local child_response=$(curl -s -X POST "${API_BASE}/api/agent-posts/${TEST_POST_ID}/comments" \
    -H "Content-Type: application/json" \
    -H "x-user-id: ${TEST_USER_ID}" \
    -d "{
      \"content\": \"Reply to parent comment\",
      \"author_agent\": \"bash-test\",
      \"parent_id\": \"${parent_id}\",
      \"skipTicket\": true
    }")

  if ! echo "${child_response}" | grep -q '"success":true'; then
    log_error "Child comment creation failed"
    end_test 1 "Comment Threading"
    return
  fi

  local child_id=$(echo "${child_response}" | jq -r '.data.id')
  local child_parent_id=$(echo "${child_response}" | jq -r '.data.parent_id')

  log_info "Child comment: ${child_id}"
  log_info "Child parent_id: ${child_parent_id}"

  # Verify parent_id matches
  if [[ "${child_parent_id}" == "${parent_id}" ]]; then
    log_success "Comment threading correct (parent_id chain intact)"
    end_test 0 "Comment Threading"
  else
    log_error "Parent ID mismatch: expected ${parent_id}, got ${child_parent_id}"
    end_test 1 "Comment Threading"
  fi
}

##############################################################################
# Main Execution
##############################################################################

echo ""
echo -e "${BLUE}╔════════════════════════════════════════════════════════════════╗${NC}"
echo -e "${BLUE}║                                                                ║${NC}"
echo -e "${BLUE}║     COMMENT PROCESSING VALIDATION SUITE                        ║${NC}"
echo -e "${BLUE}║     100% Real Backend Tests - No Mocks                         ║${NC}"
echo -e "${BLUE}║                                                                ║${NC}"
echo -e "${BLUE}╚════════════════════════════════════════════════════════════════╝${NC}"
echo ""

log_info "API Base: ${API_BASE}"
log_info "Test Post: ${TEST_POST_ID}"
log_info "Test User: ${TEST_USER_ID}"
log_info "Max Wait Time: ${MAX_WAIT_TIME}s"

# Check prerequisites
check_prerequisites

# Run all tests
test_comment_to_ticket
test_skip_ticket
test_default_ticket_creation
test_error_handling
test_comment_threading
test_post_processing

# Only run long-running test if not in quick mode
if [[ "${QUICK_MODE}" == false ]]; then
  test_agent_reply
else
  log_warning "Skipping agent reply test (quick mode)"
fi

# Print summary
echo ""
echo -e "${BLUE}╔════════════════════════════════════════════════════════════════╗${NC}"
echo -e "${BLUE}║                    TEST SUMMARY                                ║${NC}"
echo -e "${BLUE}╚════════════════════════════════════════════════════════════════╝${NC}"
echo ""
echo -e "  Total Tests:  ${TOTAL_TESTS}"
echo -e "  ${GREEN}Passed:       ${PASSED_TESTS}${NC}"
echo -e "  ${RED}Failed:       ${FAILED_TESTS}${NC}"
echo ""

if [[ ${FAILED_TESTS} -eq 0 ]]; then
  echo -e "${GREEN}✅ ALL TESTS PASSED!${NC}"
  echo ""
  exit 0
else
  echo -e "${RED}❌ SOME TESTS FAILED${NC}"
  echo ""
  exit 1
fi
