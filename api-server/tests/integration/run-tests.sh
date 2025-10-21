#!/bin/bash
# Test Runner Script for Post Creation Fix
#
# Usage:
#   ./run-tests.sh              # Run all tests
#   ./run-tests.sh --watch      # Run in watch mode
#   ./run-tests.sh --coverage   # Run with coverage
#   ./run-tests.sh --specific "Schema Validation"  # Run specific suite

set -e

# Colors for output
GREEN='\033[0;32m'
BLUE='\033[0;34m'
YELLOW='\033[1;33m'
RED='\033[0;31m'
NC='\033[0m' # No Color

echo -e "${BLUE}========================================${NC}"
echo -e "${BLUE}  Post Creation Fix - TDD Test Suite  ${NC}"
echo -e "${BLUE}========================================${NC}"
echo ""

# Navigate to api-server directory
cd "$(dirname "$0")/../.."

# Clean up any existing test database
if [ -f "test-database.db" ]; then
  echo -e "${YELLOW}Cleaning up existing test database...${NC}"
  rm -f test-database.db*
fi

# Parse command line arguments
WATCH_MODE=false
COVERAGE_MODE=false
SPECIFIC_TEST=""

while [[ $# -gt 0 ]]; do
  case $1 in
    --watch|-w)
      WATCH_MODE=true
      shift
      ;;
    --coverage|-c)
      COVERAGE_MODE=true
      shift
      ;;
    --specific|-s)
      SPECIFIC_TEST="$2"
      shift 2
      ;;
    *)
      echo -e "${RED}Unknown option: $1${NC}"
      exit 1
      ;;
  esac
done

# Build the vitest command
VITEST_CMD="npx vitest"

if [ "$WATCH_MODE" = true ]; then
  echo -e "${GREEN}Running tests in WATCH mode...${NC}"
  VITEST_CMD="$VITEST_CMD --watch"
elif [ "$COVERAGE_MODE" = true ]; then
  echo -e "${GREEN}Running tests with COVERAGE...${NC}"
  VITEST_CMD="$VITEST_CMD run --coverage"
else
  echo -e "${GREEN}Running tests...${NC}"
  VITEST_CMD="$VITEST_CMD run"
fi

# Add specific test filter if provided
if [ -n "$SPECIFIC_TEST" ]; then
  echo -e "${YELLOW}Filtering for: $SPECIFIC_TEST${NC}"
  VITEST_CMD="$VITEST_CMD --testNamePattern='$SPECIFIC_TEST'"
fi

# Add the specific test file
VITEST_CMD="$VITEST_CMD tests/integration/create-post-fix.test.js"

echo ""
echo -e "${BLUE}Command: $VITEST_CMD${NC}"
echo ""

# Run the tests
eval $VITEST_CMD

# Check exit code
EXIT_CODE=$?

echo ""
if [ $EXIT_CODE -eq 0 ]; then
  echo -e "${GREEN}✓ All tests passed!${NC}"
  echo ""
  echo -e "${BLUE}Next steps:${NC}"
  echo -e "  1. Review coverage report: ${YELLOW}open coverage/index.html${NC}"
  echo -e "  2. Verify test database: ${YELLOW}sqlite3 test-database.db${NC}"
  echo -e "  3. Run specific suite: ${YELLOW}./run-tests.sh --specific 'Schema Validation'${NC}"
else
  echo -e "${RED}✗ Tests failed with exit code $EXIT_CODE${NC}"
  echo ""
  echo -e "${BLUE}Debugging tips:${NC}"
  echo -e "  1. Check test output above for specific failures"
  echo -e "  2. Run in watch mode: ${YELLOW}./run-tests.sh --watch${NC}"
  echo -e "  3. Inspect test database: ${YELLOW}sqlite3 test-database.db${NC}"
  echo -e "  4. Check server logs for errors"
fi

echo ""

exit $EXIT_CODE
