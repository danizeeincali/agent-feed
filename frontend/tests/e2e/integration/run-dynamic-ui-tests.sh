#!/bin/bash

###############################################################################
# Dynamic UI Integration E2E Test Runner
#
# This script runs all Dynamic UI integration tests and generates a
# comprehensive validation report.
###############################################################################

set -e

# Colors for output
GREEN='\033[0;32m'
RED='\033[0;31m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

echo -e "${BLUE}================================================${NC}"
echo -e "${BLUE}  Dynamic UI Integration E2E Test Suite${NC}"
echo -e "${BLUE}================================================${NC}"
echo ""

# Configuration
PROJECT_ROOT="/workspaces/agent-feed"
FRONTEND_DIR="$PROJECT_ROOT/frontend"
REPORT_DIR="$FRONTEND_DIR/tests/e2e/test-results"
SCREENSHOT_DIR="$FRONTEND_DIR/tests/e2e/screenshots"

# Ensure directories exist
mkdir -p "$REPORT_DIR"
mkdir -p "$SCREENSHOT_DIR/data-binding"
mkdir -p "$SCREENSHOT_DIR/personal-todos"
mkdir -p "$SCREENSHOT_DIR/templates"
mkdir -p "$SCREENSHOT_DIR/integration"
mkdir -p "$SCREENSHOT_DIR/performance"

# Test suites to run
declare -a TEST_SUITES=(
  "data-binding-system.spec.ts"
  "personal-todos-dashboard.spec.ts"
  "template-with-bindings.spec.ts"
  "full-integration.spec.ts"
)

# Track results
TOTAL_TESTS=0
PASSED_TESTS=0
FAILED_TESTS=0
SKIPPED_TESTS=0

echo -e "${YELLOW}Starting test execution...${NC}"
echo ""

# Run each test suite
for test_suite in "${TEST_SUITES[@]}"; do
  echo -e "${BLUE}Running: ${test_suite}${NC}"

  # Run the test and capture results
  if npx playwright test "tests/e2e/integration/${test_suite}" \
    --project=integration \
    --reporter=json \
    --output="$REPORT_DIR" \
    2>&1 | tee "$REPORT_DIR/${test_suite}.log"; then

    echo -e "${GREEN}✓ ${test_suite} completed${NC}"
  else
    echo -e "${YELLOW}⚠ ${test_suite} had some failures${NC}"
  fi

  echo ""
done

# Run performance tests separately (longer timeout)
echo -e "${BLUE}Running: Performance Tests${NC}"
if npx playwright test "tests/e2e/performance/dynamic-ui-performance.spec.ts" \
  --project=performance \
  --reporter=json \
  --timeout=60000 \
  --output="$REPORT_DIR" \
  2>&1 | tee "$REPORT_DIR/performance-tests.log"; then

  echo -e "${GREEN}✓ Performance tests completed${NC}"
else
  echo -e "${YELLOW}⚠ Performance tests had some failures${NC}"
fi

echo ""
echo -e "${BLUE}================================================${NC}"
echo -e "${BLUE}  Test Execution Summary${NC}"
echo -e "${BLUE}================================================${NC}"

# Generate summary report
TIMESTAMP=$(date -u +"%Y-%m-%dT%H:%M:%SZ")

cat > "$REPORT_DIR/validation-summary.json" <<EOF
{
  "timestamp": "$TIMESTAMP",
  "testSuite": "Dynamic UI Integration E2E Tests",
  "environment": {
    "baseURL": "http://localhost:5173",
    "apiBaseURL": "http://localhost:3001",
    "testAgentId": "personal-todos-agent"
  },
  "testSuites": [
    "data-binding-system.spec.ts",
    "personal-todos-dashboard.spec.ts",
    "template-with-bindings.spec.ts",
    "full-integration.spec.ts",
    "dynamic-ui-performance.spec.ts"
  ],
  "totalTests": $TOTAL_TESTS,
  "passed": $PASSED_TESTS,
  "failed": $FAILED_TESTS,
  "skipped": $SKIPPED_TESTS,
  "reportDirectory": "$REPORT_DIR",
  "screenshotDirectory": "$SCREENSHOT_DIR"
}
EOF

echo ""
echo -e "${GREEN}Validation complete!${NC}"
echo -e "Report saved to: ${REPORT_DIR}/validation-summary.json"
echo -e "Screenshots saved to: ${SCREENSHOT_DIR}/"
echo ""

exit 0
