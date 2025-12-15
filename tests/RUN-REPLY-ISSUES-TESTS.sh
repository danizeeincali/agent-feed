#!/bin/bash

# Reply Issues Fix Test Runner
# Runs comprehensive integration tests for date display and UI refresh fixes
# ALL TESTS USE REAL BACKEND - NO MOCKS

set -e  # Exit on error

echo "🚀 Reply Issues Fix - Integration Test Runner"
echo "=============================================="
echo ""

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Check if server is running
check_server() {
  echo -e "${BLUE}🔍 Checking if API server is running...${NC}"

  # Try to connect to the server
  if curl -s -f http://localhost:3000/api/health > /dev/null 2>&1; then
    echo -e "${GREEN}✅ Server is running${NC}"
    return 0
  else
    echo -e "${YELLOW}⚠️  Server health check failed, trying basic connection...${NC}"
    if curl -s -f http://localhost:3000 > /dev/null 2>&1; then
      echo -e "${GREEN}✅ Server is responding${NC}"
      return 0
    else
      echo -e "${RED}❌ Server is not running on port 3000${NC}"
      echo ""
      echo "Please start the server first:"
      echo "  cd api-server && npm start"
      echo ""
      return 1
    fi
  fi
}

# Run test suite
run_tests() {
  echo ""
  echo -e "${BLUE}🧪 Running Reply Issues Fix Tests...${NC}"
  echo ""

  # Set environment variables
  export API_URL="http://localhost:3000"
  export NODE_ENV="test"

  # Run the test file
  node /workspaces/agent-feed/tests/integration/reply-issues-fix.test.js

  TEST_EXIT_CODE=$?

  echo ""
  if [ $TEST_EXIT_CODE -eq 0 ]; then
    echo -e "${GREEN}✅ All tests passed!${NC}"
  else
    echo -e "${RED}❌ Some tests failed${NC}"
  fi

  return $TEST_EXIT_CODE
}

# Main execution
main() {
  # Check server
  if ! check_server; then
    exit 1
  fi

  # Run tests
  if run_tests; then
    echo ""
    echo -e "${GREEN}✨ Test suite completed successfully${NC}"
    exit 0
  else
    echo ""
    echo -e "${RED}💥 Test suite failed${NC}"
    exit 1
  fi
}

# Run main
main
