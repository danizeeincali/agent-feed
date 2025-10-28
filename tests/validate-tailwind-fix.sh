#!/bin/bash

###############################################################################
# TAILWIND CLASS FIX - BASH VALIDATION SCRIPT
#
# Real-time validation of Tailwind CSS fix
# NO MOCKS - 100% REAL CHECKS
###############################################################################

set -e  # Exit on error

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Test counters
TESTS_RUN=0
TESTS_PASSED=0
TESTS_FAILED=0

# Paths
FRONTEND_DIR="/workspaces/agent-feed/frontend"
CSS_FILE="$FRONTEND_DIR/src/index.css"
MARKDOWN_CSS="$FRONTEND_DIR/src/styles/markdown.css"
DIST_DIR="$FRONTEND_DIR/dist"

echo -e "${BLUE}╔════════════════════════════════════════════════════════════╗${NC}"
echo -e "${BLUE}║  TAILWIND CLASS FIX - BASH VALIDATION SUITE               ║${NC}"
echo -e "${BLUE}║  NO MOCKS - 100% REAL TESTS                                ║${NC}"
echo -e "${BLUE}╚════════════════════════════════════════════════════════════╝${NC}"
echo ""

###############################################################################
# TEST SUITE 1: CSS FILE VALIDATION
###############################################################################

echo -e "${BLUE}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"
echo -e "${BLUE}TEST SUITE 1: CSS File Validation${NC}"
echo -e "${BLUE}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"

# Test 1.1: CSS file exists
((TESTS_RUN++))
if [ -f "$CSS_FILE" ]; then
    echo -e "${GREEN}✓${NC} Test 1.1: CSS file exists"
    ((TESTS_PASSED++))
else
    echo -e "${RED}✗${NC} Test 1.1: CSS file NOT found at $CSS_FILE"
    ((TESTS_FAILED++))
fi

# Test 1.2: CSS file is not empty
((TESTS_RUN++))
if [ -s "$CSS_FILE" ]; then
    echo -e "${GREEN}✓${NC} Test 1.2: CSS file is not empty"
    ((TESTS_PASSED++))
else
    echo -e "${RED}✗${NC} Test 1.2: CSS file is empty"
    ((TESTS_FAILED++))
fi

# Test 1.3: No invalid bg-gray-25 class
((TESTS_RUN++))
if ! grep -q "bg-gray-25" "$CSS_FILE"; then
    echo -e "${GREEN}✓${NC} Test 1.3: No invalid bg-gray-25 class found"
    ((TESTS_PASSED++))
else
    echo -e "${RED}✗${NC} Test 1.3: FOUND invalid bg-gray-25 class"
    grep -n "bg-gray-25" "$CSS_FILE"
    ((TESTS_FAILED++))
fi

# Test 1.4: No invalid bg-gray-850 class
((TESTS_RUN++))
if ! grep -q "bg-gray-850" "$CSS_FILE"; then
    echo -e "${GREEN}✓${NC} Test 1.4: No invalid bg-gray-850 class found"
    ((TESTS_PASSED++))
else
    echo -e "${RED}✗${NC} Test 1.4: FOUND invalid bg-gray-850 class"
    grep -n "bg-gray-850" "$CSS_FILE"
    ((TESTS_FAILED++))
fi

# Test 1.5: Contains valid bg-gray-50 class
((TESTS_RUN++))
if grep -q "bg-gray-50" "$CSS_FILE"; then
    echo -e "${GREEN}✓${NC} Test 1.5: Valid bg-gray-50 class found"
    ((TESTS_PASSED++))
else
    echo -e "${RED}✗${NC} Test 1.5: Valid bg-gray-50 class NOT found"
    ((TESTS_FAILED++))
fi

# Test 1.6: Contains valid bg-gray-800 class
((TESTS_RUN++))
if grep -q "bg-gray-800" "$CSS_FILE"; then
    echo -e "${GREEN}✓${NC} Test 1.6: Valid bg-gray-800 class found"
    ((TESTS_PASSED++))
else
    echo -e "${RED}✗${NC} Test 1.6: Valid bg-gray-800 class NOT found"
    ((TESTS_FAILED++))
fi

###############################################################################
# TEST SUITE 2: CSS IMPORT ORDER VALIDATION
###############################################################################

echo ""
echo -e "${BLUE}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"
echo -e "${BLUE}TEST SUITE 2: CSS Import Order Validation${NC}"
echo -e "${BLUE}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"

# Test 2.1: @import directive exists
((TESTS_RUN++))
if grep -q "@import" "$CSS_FILE"; then
    echo -e "${GREEN}✓${NC} Test 2.1: @import directive found"
    ((TESTS_PASSED++))
else
    echo -e "${RED}✗${NC} Test 2.1: @import directive NOT found"
    ((TESTS_FAILED++))
fi

# Test 2.2: @import on line 2
((TESTS_RUN++))
IMPORT_LINE=$(sed -n '2p' "$CSS_FILE")
if echo "$IMPORT_LINE" | grep -q "@import"; then
    echo -e "${GREEN}✓${NC} Test 2.2: @import is on line 2"
    ((TESTS_PASSED++))
else
    echo -e "${RED}✗${NC} Test 2.2: @import is NOT on line 2"
    echo "    Line 2 content: $IMPORT_LINE"
    ((TESTS_FAILED++))
fi

# Test 2.3: @import comes before @tailwind
((TESTS_RUN++))
IMPORT_LINE_NUM=$(grep -n "@import" "$CSS_FILE" | head -1 | cut -d: -f1)
TAILWIND_LINE_NUM=$(grep -n "@tailwind" "$CSS_FILE" | head -1 | cut -d: -f1)
if [ "$IMPORT_LINE_NUM" -lt "$TAILWIND_LINE_NUM" ]; then
    echo -e "${GREEN}✓${NC} Test 2.3: @import comes before @tailwind (line $IMPORT_LINE_NUM < $TAILWIND_LINE_NUM)"
    ((TESTS_PASSED++))
else
    echo -e "${RED}✗${NC} Test 2.3: @import does NOT come before @tailwind"
    echo "    @import line: $IMPORT_LINE_NUM, @tailwind line: $TAILWIND_LINE_NUM"
    ((TESTS_FAILED++))
fi

# Test 2.4: markdown.css file exists
((TESTS_RUN++))
if [ -f "$MARKDOWN_CSS" ]; then
    echo -e "${GREEN}✓${NC} Test 2.4: markdown.css file exists"
    ((TESTS_PASSED++))
else
    echo -e "${RED}✗${NC} Test 2.4: markdown.css file NOT found at $MARKDOWN_CSS"
    ((TESTS_FAILED++))
fi

###############################################################################
# TEST SUITE 3: VITE BUILD VALIDATION
###############################################################################

echo ""
echo -e "${BLUE}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"
echo -e "${BLUE}TEST SUITE 3: Vite Build Validation${NC}"
echo -e "${BLUE}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"

# Test 3.1: Run Vite build
((TESTS_RUN++))
echo -e "${YELLOW}⏳${NC} Running Vite build (this may take a moment)..."
cd "$FRONTEND_DIR"

BUILD_OUTPUT=$(npm run build 2>&1)
BUILD_EXIT_CODE=$?

if [ $BUILD_EXIT_CODE -eq 0 ]; then
    echo -e "${GREEN}✓${NC} Test 3.1: Vite build completed successfully"
    ((TESTS_PASSED++))
else
    echo -e "${RED}✗${NC} Test 3.1: Vite build FAILED"
    echo "$BUILD_OUTPUT"
    ((TESTS_FAILED++))
fi

# Test 3.2: No PostCSS errors in build output
((TESTS_RUN++))
if ! echo "$BUILD_OUTPUT" | grep -iq "postcss.*error"; then
    echo -e "${GREEN}✓${NC} Test 3.2: No PostCSS errors in build output"
    ((TESTS_PASSED++))
else
    echo -e "${RED}✗${NC} Test 3.2: PostCSS errors found in build output"
    echo "$BUILD_OUTPUT" | grep -i "postcss.*error"
    ((TESTS_FAILED++))
fi

# Test 3.3: No CSS compilation errors
((TESTS_RUN++))
if ! echo "$BUILD_OUTPUT" | grep -iq "css.*error"; then
    echo -e "${GREEN}✓${NC} Test 3.3: No CSS compilation errors"
    ((TESTS_PASSED++))
else
    echo -e "${RED}✗${NC} Test 3.3: CSS compilation errors found"
    echo "$BUILD_OUTPUT" | grep -i "css.*error"
    ((TESTS_FAILED++))
fi

# Test 3.4: dist directory exists
((TESTS_RUN++))
if [ -d "$DIST_DIR" ]; then
    echo -e "${GREEN}✓${NC} Test 3.4: dist directory created"
    ((TESTS_PASSED++))
else
    echo -e "${RED}✗${NC} Test 3.4: dist directory NOT created"
    ((TESTS_FAILED++))
fi

# Test 3.5: index.html exists in dist
((TESTS_RUN++))
if [ -f "$DIST_DIR/index.html" ]; then
    echo -e "${GREEN}✓${NC} Test 3.5: index.html exists in dist"
    ((TESTS_PASSED++))
else
    echo -e "${RED}✗${NC} Test 3.5: index.html NOT found in dist"
    ((TESTS_FAILED++))
fi

# Test 3.6: Built CSS does not contain invalid classes
((TESTS_RUN++))
INVALID_CLASSES_IN_BUILD=$(find "$DIST_DIR" -name "*.css" -exec grep -l "bg-gray-\(25\|850\)" {} \;)
if [ -z "$INVALID_CLASSES_IN_BUILD" ]; then
    echo -e "${GREEN}✓${NC} Test 3.6: No invalid gray classes in built CSS"
    ((TESTS_PASSED++))
else
    echo -e "${RED}✗${NC} Test 3.6: Invalid gray classes found in built CSS"
    echo "$INVALID_CLASSES_IN_BUILD"
    ((TESTS_FAILED++))
fi

###############################################################################
# TEST SUITE 4: FRONTEND ACCESSIBILITY
###############################################################################

echo ""
echo -e "${BLUE}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"
echo -e "${BLUE}TEST SUITE 4: Frontend Accessibility${NC}"
echo -e "${BLUE}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"

# Test 4.1: Frontend server responds
((TESTS_RUN++))
HTTP_RESPONSE=$(curl -s -o /dev/null -w "%{http_code}" http://localhost:5173 2>/dev/null || echo "000")
if [ "$HTTP_RESPONSE" = "200" ]; then
    echo -e "${GREEN}✓${NC} Test 4.1: Frontend server responds with 200 status"
    ((TESTS_PASSED++))
else
    echo -e "${YELLOW}⚠${NC}  Test 4.1: Frontend server not accessible (status: $HTTP_RESPONSE)"
    echo "    Note: Start server with 'cd frontend && npm run dev'"
    ((TESTS_FAILED++))
fi

# Test 4.2: Response is HTML
((TESTS_RUN++))
CONTENT_TYPE=$(curl -s -I http://localhost:5173 2>/dev/null | grep -i "content-type" || echo "")
if echo "$CONTENT_TYPE" | grep -iq "text/html"; then
    echo -e "${GREEN}✓${NC} Test 4.2: Response is HTML content"
    ((TESTS_PASSED++))
else
    echo -e "${YELLOW}⚠${NC}  Test 4.2: Response is not HTML (or server not running)"
    ((TESTS_FAILED++))
fi

# Test 4.3: HTML contains root div
((TESTS_RUN++))
HTML_CONTENT=$(curl -s http://localhost:5173 2>/dev/null || echo "")
if echo "$HTML_CONTENT" | grep -q 'id="root"'; then
    echo -e "${GREEN}✓${NC} Test 4.3: HTML contains root div for React"
    ((TESTS_PASSED++))
else
    echo -e "${YELLOW}⚠${NC}  Test 4.3: HTML does not contain root div (or server not running)"
    ((TESTS_FAILED++))
fi

###############################################################################
# TEST SUITE 5: BACKEND API VALIDATION
###############################################################################

echo ""
echo -e "${BLUE}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"
echo -e "${BLUE}TEST SUITE 5: Backend API Validation (Comment Replies)${NC}"
echo -e "${BLUE}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"

# Test 5.1: Backend server responds
((TESTS_RUN++))
API_RESPONSE=$(curl -s -o /dev/null -w "%{http_code}" http://localhost:3000/api/health 2>/dev/null || echo "000")
if [ "$API_RESPONSE" = "200" ] || [ "$API_RESPONSE" = "404" ]; then
    echo -e "${GREEN}✓${NC} Test 5.1: Backend server is accessible"
    ((TESTS_PASSED++))
else
    echo -e "${YELLOW}⚠${NC}  Test 5.1: Backend server not accessible (status: $API_RESPONSE)"
    echo "    Note: Start server with 'node api-server/server.js'"
    ((TESTS_FAILED++))
fi

# Test 5.2: Can create test post
((TESTS_RUN++))
POST_RESPONSE=$(curl -s -X POST http://localhost:3000/api/agent-posts \
    -H "Content-Type: application/json" \
    -d '{"content":"Test post for validation","agent_id":"test","platform":"test","tier":"free"}' \
    2>/dev/null || echo "")

if echo "$POST_RESPONSE" | grep -q '"id"'; then
    POST_ID=$(echo "$POST_RESPONSE" | grep -o '"id":"[^"]*"' | cut -d'"' -f4)
    echo -e "${GREEN}✓${NC} Test 5.2: Can create test post (ID: $POST_ID)"
    ((TESTS_PASSED++))

    # Test 5.3: Can create comment on post
    ((TESTS_RUN++))
    COMMENT_RESPONSE=$(curl -s -X POST "http://localhost:3000/api/agent-posts/$POST_ID/comments" \
        -H "Content-Type: application/json" \
        -d '{"content":"Test comment"}' \
        2>/dev/null || echo "")

    if echo "$COMMENT_RESPONSE" | grep -q '"id"'; then
        COMMENT_ID=$(echo "$COMMENT_RESPONSE" | grep -o '"id":"[^"]*"' | cut -d'"' -f4)
        echo -e "${GREEN}✓${NC} Test 5.3: Can create comment (ID: $COMMENT_ID)"
        ((TESTS_PASSED++))

        # Test 5.4: Can create reply with parent_id
        ((TESTS_RUN++))
        REPLY_RESPONSE=$(curl -s -X POST "http://localhost:3000/api/agent-posts/$POST_ID/comments" \
            -H "Content-Type: application/json" \
            -d "{\"content\":\"Test reply\",\"parent_id\":\"$COMMENT_ID\"}" \
            2>/dev/null || echo "")

        if echo "$REPLY_RESPONSE" | grep -q '"id"' && echo "$REPLY_RESPONSE" | grep -q '"parent_id"'; then
            echo -e "${GREEN}✓${NC} Test 5.4: Can create reply with parent_id"
            ((TESTS_PASSED++))

            # Test 5.5: Reply has valid created_at (not "Invalid Date")
            ((TESTS_RUN++))
            CREATED_AT=$(echo "$REPLY_RESPONSE" | grep -o '"created_at":"[^"]*"' | cut -d'"' -f4)
            if [ -n "$CREATED_AT" ] && [ "$CREATED_AT" != "Invalid Date" ]; then
                echo -e "${GREEN}✓${NC} Test 5.5: Reply has valid created_at timestamp"
                ((TESTS_PASSED++))
            else
                echo -e "${RED}✗${NC} Test 5.5: Reply has invalid created_at: $CREATED_AT"
                ((TESTS_FAILED++))
            fi
        else
            echo -e "${YELLOW}⚠${NC}  Test 5.4: Could not create reply"
            ((TESTS_FAILED++))
            ((TESTS_RUN++))
            echo -e "${YELLOW}⚠${NC}  Test 5.5: Skipped (depends on Test 5.4)"
            ((TESTS_FAILED++))
        fi
    else
        echo -e "${YELLOW}⚠${NC}  Test 5.3: Could not create comment"
        ((TESTS_FAILED++))
        ((TESTS_RUN+=2))
        echo -e "${YELLOW}⚠${NC}  Test 5.4: Skipped (depends on Test 5.3)"
        echo -e "${YELLOW}⚠${NC}  Test 5.5: Skipped (depends on Test 5.3)"
        ((TESTS_FAILED+=2))
    fi

    # Cleanup
    curl -s -X DELETE "http://localhost:3000/api/agent-posts/$POST_ID" >/dev/null 2>&1
else
    echo -e "${YELLOW}⚠${NC}  Test 5.2: Could not create test post (backend may not be running)"
    ((TESTS_FAILED++))
    ((TESTS_RUN+=3))
    echo -e "${YELLOW}⚠${NC}  Test 5.3-5.5: Skipped (depends on Test 5.2)"
    ((TESTS_FAILED+=3))
fi

###############################################################################
# RESULTS SUMMARY
###############################################################################

echo ""
echo -e "${BLUE}╔════════════════════════════════════════════════════════════╗${NC}"
echo -e "${BLUE}║  TEST RESULTS SUMMARY                                      ║${NC}"
echo -e "${BLUE}╚════════════════════════════════════════════════════════════╝${NC}"
echo ""
echo -e "Total Tests Run:    ${BLUE}$TESTS_RUN${NC}"
echo -e "Tests Passed:       ${GREEN}$TESTS_PASSED${NC}"
echo -e "Tests Failed:       ${RED}$TESTS_FAILED${NC}"
echo ""

if [ $TESTS_FAILED -eq 0 ]; then
    echo -e "${GREEN}╔════════════════════════════════════════════════════════════╗${NC}"
    echo -e "${GREEN}║  ✓ ALL TESTS PASSED!                                       ║${NC}"
    echo -e "${GREEN}║  Tailwind class fix is validated and working correctly.   ║${NC}"
    echo -e "${GREEN}╚════════════════════════════════════════════════════════════╝${NC}"
    exit 0
else
    PASS_RATE=$((TESTS_PASSED * 100 / TESTS_RUN))
    echo -e "${YELLOW}╔════════════════════════════════════════════════════════════╗${NC}"
    echo -e "${YELLOW}║  ⚠ SOME TESTS FAILED (Pass Rate: $PASS_RATE%)                    ║${NC}"
    echo -e "${YELLOW}║  Please review the failed tests above.                    ║${NC}"
    echo -e "${YELLOW}╚════════════════════════════════════════════════════════════╝${NC}"
    exit 1
fi
