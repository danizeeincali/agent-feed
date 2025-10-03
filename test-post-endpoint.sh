#!/bin/bash

# Integration Test Suite for POST /api/v1/agent-posts
# Color codes for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

API_URL="http://localhost:3001/api/v1/agent-posts"
DB_PATH="/workspaces/agent-feed/backend/data/agents.db"

TESTS_PASSED=0
TESTS_FAILED=0
TEST_RESULTS=()

echo -e "${BLUE}========================================${NC}"
echo -e "${BLUE}POST /api/v1/agent-posts Integration Tests${NC}"
echo -e "${BLUE}========================================${NC}\n"

# Helper function to check database
check_database() {
    local post_id=$1
    local check_type=$2

    if [ "$check_type" == "exists" ]; then
        result=$(sqlite3 "$DB_PATH" "SELECT COUNT(*) FROM agent_posts WHERE id='$post_id';")
        if [ "$result" -eq "1" ]; then
            echo -e "${GREEN}✓ Database verification: Post exists${NC}"
            return 0
        else
            echo -e "${RED}✗ Database verification: Post not found${NC}"
            return 1
        fi
    fi
}

# Test 1: Valid Post Creation
echo -e "${YELLOW}Test 1: Valid Post Creation${NC}"
echo "Request: POST with title, content, author_agent"
response=$(curl -s -w "\n%{http_code}" -X POST "$API_URL" \
  -H "Content-Type: application/json" \
  -d '{"title":"Integration Test 1","content":"Valid post content","author_agent":"test-agent"}')

http_code=$(echo "$response" | tail -n1)
body=$(echo "$response" | sed '$d')

echo "Response Code: $http_code"
echo "Response Body: $body"

if [ "$http_code" -eq "201" ]; then
    post_id=$(echo "$body" | grep -o '"id":"[^"]*"' | cut -d'"' -f4)
    echo -e "${GREEN}✓ PASS: Status 201${NC}"
    if [ -n "$post_id" ]; then
        echo -e "${GREEN}✓ Post ID returned: $post_id${NC}"
        check_database "$post_id" "exists"
    fi
    TESTS_PASSED=$((TESTS_PASSED + 1))
    TEST_RESULTS+=("Test 1: PASS")
else
    echo -e "${RED}✗ FAIL: Expected 201, got $http_code${NC}"
    TESTS_FAILED=$((TESTS_FAILED + 1))
    TEST_RESULTS+=("Test 1: FAIL")
fi
echo ""

# Test 2: Missing Title
echo -e "${YELLOW}Test 2: Missing Title${NC}"
echo "Request: POST without title field"
response=$(curl -s -w "\n%{http_code}" -X POST "$API_URL" \
  -H "Content-Type: application/json" \
  -d '{"content":"Content without title","author_agent":"test-agent"}')

http_code=$(echo "$response" | tail -n1)
body=$(echo "$response" | sed '$d')

echo "Response Code: $http_code"
echo "Response Body: $body"

if [ "$http_code" -eq "400" ]; then
    echo -e "${GREEN}✓ PASS: Status 400${NC}"
    if echo "$body" | grep -q "error\|title"; then
        echo -e "${GREEN}✓ Error message present${NC}"
    fi
    TESTS_PASSED=$((TESTS_PASSED + 1))
    TEST_RESULTS+=("Test 2: PASS")
else
    echo -e "${RED}✗ FAIL: Expected 400, got $http_code${NC}"
    TESTS_FAILED=$((TESTS_FAILED + 1))
    TEST_RESULTS+=("Test 2: FAIL")
fi
echo ""

# Test 3: Missing Content
echo -e "${YELLOW}Test 3: Missing Content${NC}"
echo "Request: POST without content field"
response=$(curl -s -w "\n%{http_code}" -X POST "$API_URL" \
  -H "Content-Type: application/json" \
  -d '{"title":"Title without content","author_agent":"test-agent"}')

http_code=$(echo "$response" | tail -n1)
body=$(echo "$response" | sed '$d')

echo "Response Code: $http_code"
echo "Response Body: $body"

if [ "$http_code" -eq "400" ]; then
    echo -e "${GREEN}✓ PASS: Status 400${NC}"
    if echo "$body" | grep -q "error\|content"; then
        echo -e "${GREEN}✓ Error message present${NC}"
    fi
    TESTS_PASSED=$((TESTS_PASSED + 1))
    TEST_RESULTS+=("Test 3: PASS")
else
    echo -e "${RED}✗ FAIL: Expected 400, got $http_code${NC}"
    TESTS_FAILED=$((TESTS_FAILED + 1))
    TEST_RESULTS+=("Test 3: FAIL")
fi
echo ""

# Test 4: Missing Author
echo -e "${YELLOW}Test 4: Missing Author${NC}"
echo "Request: POST without author_agent field"
response=$(curl -s -w "\n%{http_code}" -X POST "$API_URL" \
  -H "Content-Type: application/json" \
  -d '{"title":"No author","content":"Content here"}')

http_code=$(echo "$response" | tail -n1)
body=$(echo "$response" | sed '$d')

echo "Response Code: $http_code"
echo "Response Body: $body"

if [ "$http_code" -eq "400" ]; then
    echo -e "${GREEN}✓ PASS: Status 400${NC}"
    if echo "$body" | grep -q "error\|author"; then
        echo -e "${GREEN}✓ Error message present${NC}"
    fi
    TESTS_PASSED=$((TESTS_PASSED + 1))
    TEST_RESULTS+=("Test 4: PASS")
else
    echo -e "${RED}✗ FAIL: Expected 400, got $http_code${NC}"
    TESTS_FAILED=$((TESTS_FAILED + 1))
    TEST_RESULTS+=("Test 4: FAIL")
fi
echo ""

# Test 5: 10,000 Character Post
echo -e "${YELLOW}Test 5: 10,000 Character Post${NC}"
echo "Request: POST with exactly 10,000 characters"
# Generate 10,000 character content
long_content=$(printf 'A%.0s' {1..10000})
payload=$(jq -n --arg title "10k Character Test" --arg content "$long_content" --arg author "test-agent" \
  '{title: $title, content: $content, author_agent: $author}')

response=$(curl -s -w "\n%{http_code}" -X POST "$API_URL" \
  -H "Content-Type: application/json" \
  -d "$payload")

http_code=$(echo "$response" | tail -n1)
body=$(echo "$response" | sed '$d')

echo "Response Code: $http_code"
echo "Content Length: 10,000 characters"

if [ "$http_code" -eq "201" ]; then
    echo -e "${GREEN}✓ PASS: Status 201 - Accepted${NC}"
    post_id=$(echo "$body" | grep -o '"id":"[^"]*"' | cut -d'"' -f4)
    if [ -n "$post_id" ]; then
        echo -e "${GREEN}✓ Post ID returned: $post_id${NC}"
        check_database "$post_id" "exists"
    fi
    TESTS_PASSED=$((TESTS_PASSED + 1))
    TEST_RESULTS+=("Test 5: PASS")
else
    echo -e "${RED}✗ FAIL: Expected 201, got $http_code${NC}"
    TESTS_FAILED=$((TESTS_FAILED + 1))
    TEST_RESULTS+=("Test 5: FAIL")
fi
echo ""

# Test 6: Over 10,000 Characters
echo -e "${YELLOW}Test 6: Over 10,000 Characters${NC}"
echo "Request: POST with 10,001 characters"
# Generate 10,001 character content
long_content=$(printf 'B%.0s' {1..10001})
payload=$(jq -n --arg title "10k+1 Character Test" --arg content "$long_content" --arg author "test-agent" \
  '{title: $title, content: $content, author_agent: $author}')

response=$(curl -s -w "\n%{http_code}" -X POST "$API_URL" \
  -H "Content-Type: application/json" \
  -d "$payload")

http_code=$(echo "$response" | tail -n1)
body=$(echo "$response" | sed '$d')

echo "Response Code: $http_code"
echo "Content Length: 10,001 characters"
echo "Response Body: $body"

if [ "$http_code" -eq "400" ]; then
    echo -e "${GREEN}✓ PASS: Status 400 - Rejected${NC}"
    if echo "$body" | grep -qi "character\|length\|limit\|10000"; then
        echo -e "${GREEN}✓ Appropriate error message${NC}"
    fi
    TESTS_PASSED=$((TESTS_PASSED + 1))
    TEST_RESULTS+=("Test 6: PASS")
else
    echo -e "${RED}✗ FAIL: Expected 400, got $http_code${NC}"
    TESTS_FAILED=$((TESTS_FAILED + 1))
    TEST_RESULTS+=("Test 6: FAIL")
fi
echo ""

# Test 7: Special Characters
echo -e "${YELLOW}Test 7: Special Characters${NC}"
echo "Request: POST with emojis, quotes, newlines"
special_content="Hello 🌟 World!\nLine 2 with \"quotes\" and 'apostrophes'\nLine 3 with symbols: @#$%^&*()\nEmojis: 😀 🎉 🚀 ✨"
payload=$(jq -n --arg title "Special Chars Test 🎯" --arg content "$special_content" --arg author "test-agent" \
  '{title: $title, content: $content, author_agent: $author}')

response=$(curl -s -w "\n%{http_code}" -X POST "$API_URL" \
  -H "Content-Type: application/json" \
  -d "$payload")

http_code=$(echo "$response" | tail -n1)
body=$(echo "$response" | sed '$d')

echo "Response Code: $http_code"
echo "Response Body: $body"

if [ "$http_code" -eq "201" ]; then
    echo -e "${GREEN}✓ PASS: Status 201 - Special chars accepted${NC}"
    post_id=$(echo "$body" | grep -o '"id":"[^"]*"' | cut -d'"' -f4)
    if [ -n "$post_id" ]; then
        echo -e "${GREEN}✓ Post ID returned: $post_id${NC}"
        # Verify special characters preserved in database
        db_content=$(sqlite3 "$DB_PATH" "SELECT content FROM agent_posts WHERE id='$post_id';")
        if echo "$db_content" | grep -q "🌟"; then
            echo -e "${GREEN}✓ Special characters preserved in database${NC}"
        else
            echo -e "${YELLOW}⚠ Warning: Special characters may not be preserved${NC}"
        fi
    fi
    TESTS_PASSED=$((TESTS_PASSED + 1))
    TEST_RESULTS+=("Test 7: PASS")
else
    echo -e "${RED}✗ FAIL: Expected 201, got $http_code${NC}"
    TESTS_FAILED=$((TESTS_FAILED + 1))
    TEST_RESULTS+=("Test 7: FAIL")
fi
echo ""

# Database Verification Summary
echo -e "${BLUE}========================================${NC}"
echo -e "${BLUE}Database Verification${NC}"
echo -e "${BLUE}========================================${NC}"
total_posts=$(sqlite3 "$DB_PATH" "SELECT COUNT(*) FROM agent_posts WHERE author_agent='test-agent';")
echo "Total test posts in database: $total_posts"

echo -e "\nRecent test posts:"
sqlite3 "$DB_PATH" "SELECT id, title, LENGTH(content) as content_length, created_at FROM agent_posts WHERE author_agent='test-agent' ORDER BY created_at DESC LIMIT 10;" -header -column

# Summary Report
echo -e "\n${BLUE}========================================${NC}"
echo -e "${BLUE}Test Summary Report${NC}"
echo -e "${BLUE}========================================${NC}"

for result in "${TEST_RESULTS[@]}"; do
    if echo "$result" | grep -q "PASS"; then
        echo -e "${GREEN}$result${NC}"
    else
        echo -e "${RED}$result${NC}"
    fi
done

echo -e "\n${BLUE}Total Tests Run: $((TESTS_PASSED + TESTS_FAILED))${NC}"
echo -e "${GREEN}Tests Passed: $TESTS_PASSED${NC}"
echo -e "${RED}Tests Failed: $TESTS_FAILED${NC}"

if [ $TESTS_FAILED -eq 0 ]; then
    echo -e "\n${GREEN}✓ ALL TESTS PASSED!${NC}"
    exit 0
else
    echo -e "\n${RED}✗ SOME TESTS FAILED${NC}"
    exit 1
fi
