#!/bin/bash

#############################################################################
# CommentThread Reply Functionality - Test Runner
#
# This script runs comprehensive integration tests for the CommentThread
# reply functionality with the REAL backend API (NO MOCKS)
#
# Prerequisites:
#   - Backend server running on localhost:3001
#   - SQLite database at /workspaces/agent-feed/database.db
#   - Node.js installed
#
# Usage:
#   ./tests/RUN-COMMENTTHREAD-TESTS.sh
#############################################################################

set -e  # Exit on error

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Configuration
API_PORT=3001
API_HOST=localhost
TEST_FILE="tests/integration/comment-thread-reply.test.js"

echo -e "${BLUE}╔════════════════════════════════════════════════════════════════════╗${NC}"
echo -e "${BLUE}║   CommentThread Reply Functionality - Integration Test Suite      ║${NC}"
echo -e "${BLUE}╚════════════════════════════════════════════════════════════════════╝${NC}"
echo ""

#############################################################################
# Step 1: Check Backend Server
#############################################################################
echo -e "${YELLOW}[1/4] Checking backend server...${NC}"

if curl -s -o /dev/null -w "%{http_code}" "http://${API_HOST}:${API_PORT}/health" | grep -q "200\|404"; then
    echo -e "${GREEN}✓ Backend server is running on ${API_HOST}:${API_PORT}${NC}"
else
    echo -e "${RED}✗ Backend server is NOT running on ${API_HOST}:${API_PORT}${NC}"
    echo -e "${YELLOW}  Please start the backend server:${NC}"
    echo -e "${YELLOW}    cd api-server && node server.js${NC}"
    exit 1
fi

#############################################################################
# Step 2: Check Database
#############################################################################
echo -e "${YELLOW}[2/4] Checking SQLite database...${NC}"

if [ -f "database.db" ]; then
    echo -e "${GREEN}✓ SQLite database found at database.db${NC}"

    # Check if comments table exists
    if sqlite3 database.db "SELECT name FROM sqlite_master WHERE type='table' AND name='comments';" | grep -q "comments"; then
        echo -e "${GREEN}✓ Comments table exists in database${NC}"
    else
        echo -e "${RED}✗ Comments table not found in database${NC}"
        exit 1
    fi
else
    echo -e "${RED}✗ SQLite database not found at database.db${NC}"
    exit 1
fi

#############################################################################
# Step 3: Check Test File
#############################################################################
echo -e "${YELLOW}[3/4] Checking test file...${NC}"

if [ -f "$TEST_FILE" ]; then
    echo -e "${GREEN}✓ Test file found: $TEST_FILE${NC}"
else
    echo -e "${RED}✗ Test file not found: $TEST_FILE${NC}"
    exit 1
fi

#############################################################################
# Step 4: Run Tests
#############################################################################
echo -e "${YELLOW}[4/4] Running integration tests...${NC}"
echo ""

# Run the test file with Node.js
node "$TEST_FILE"

TEST_EXIT_CODE=$?

echo ""

#############################################################################
# Summary
#############################################################################
if [ $TEST_EXIT_CODE -eq 0 ]; then
    echo -e "${GREEN}╔════════════════════════════════════════════════════════════════════╗${NC}"
    echo -e "${GREEN}║                    ALL TESTS PASSED! 🎉                            ║${NC}"
    echo -e "${GREEN}╚════════════════════════════════════════════════════════════════════╝${NC}"
    exit 0
else
    echo -e "${RED}╔════════════════════════════════════════════════════════════════════╗${NC}"
    echo -e "${RED}║                    SOME TESTS FAILED ⚠️                             ║${NC}"
    echo -e "${RED}╚════════════════════════════════════════════════════════════════════╝${NC}"
    exit 1
fi
