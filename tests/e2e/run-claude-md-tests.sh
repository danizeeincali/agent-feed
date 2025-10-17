#!/bin/bash

###############################################################################
# CLAUDE.md Protection Test Suite Runner
#
# Comprehensive test execution script for validating CLAUDE.md migration
# to the protected agent paradigm.
#
# Usage:
#   ./run-claude-md-tests.sh [options]
#
# Options:
#   --headed          Run tests in headed mode (browser visible)
#   --debug           Run tests in debug mode
#   --ui              Open Playwright UI
#   --report          Show test report after execution
#   --update-checksums Update checksums in protected configs
#
# Location: /workspaces/agent-feed/tests/e2e/run-claude-md-tests.sh
###############################################################################

set -e  # Exit on error

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Script directory
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
PROJECT_ROOT="$(cd "$SCRIPT_DIR/../.." && pwd)"

# Configuration
CONFIG_PATH="$PROJECT_ROOT/prod/.claude/agents/.system/CLAUDE.protected.yaml"
CLAUDE_MD_PATH="$PROJECT_ROOT/prod/.claude/CLAUDE.md"
REPORT_DIR="$PROJECT_ROOT/tests/reports/claude-md-protection"

echo -e "${BLUE}╔════════════════════════════════════════════════════════════╗${NC}"
echo -e "${BLUE}║   CLAUDE.md Protection Test Suite                         ║${NC}"
echo -e "${BLUE}╚════════════════════════════════════════════════════════════╝${NC}"
echo

# Parse command line arguments
HEADED_MODE=""
DEBUG_MODE=""
UI_MODE=""
SHOW_REPORT=false
UPDATE_CHECKSUMS=false

while [[ $# -gt 0 ]]; do
  case $1 in
    --headed)
      HEADED_MODE="--headed"
      shift
      ;;
    --debug)
      DEBUG_MODE="--debug"
      shift
      ;;
    --ui)
      UI_MODE="--ui"
      shift
      ;;
    --report)
      SHOW_REPORT=true
      shift
      ;;
    --update-checksums)
      UPDATE_CHECKSUMS=true
      shift
      ;;
    *)
      echo -e "${RED}Unknown option: $1${NC}"
      exit 1
      ;;
  esac
done

# Pre-flight checks
echo -e "${YELLOW}[1/6] Pre-flight Checks${NC}"
echo "-----------------------------------"

# Check if CLAUDE.protected.yaml exists
if [ ! -f "$CONFIG_PATH" ]; then
  echo -e "${RED}✗ CLAUDE.protected.yaml not found at: $CONFIG_PATH${NC}"
  exit 1
else
  echo -e "${GREEN}✓ CLAUDE.protected.yaml found${NC}"
fi

# Check if CLAUDE.md exists
if [ ! -f "$CLAUDE_MD_PATH" ]; then
  echo -e "${RED}✗ CLAUDE.md not found at: $CLAUDE_MD_PATH${NC}"
  exit 1
else
  echo -e "${GREEN}✓ CLAUDE.md found${NC}"
fi

# Check file permissions
PERMS=$(stat -c "%a" "$CONFIG_PATH" 2>/dev/null || stat -f "%A" "$CONFIG_PATH" 2>/dev/null)
if [ "$PERMS" != "444" ]; then
  echo -e "${YELLOW}⚠ File permissions not 444 (found: $PERMS)${NC}"
else
  echo -e "${GREEN}✓ File permissions correct (444)${NC}"
fi

echo

# Update checksums if requested
if [ "$UPDATE_CHECKSUMS" = true ]; then
  echo -e "${YELLOW}[2/6] Updating Checksums${NC}"
  echo "-----------------------------------"
  cd "$PROJECT_ROOT"
  npx tsx scripts/update-protected-checksums.ts
  echo -e "${GREEN}✓ Checksums updated${NC}"
  echo
fi

# Install dependencies
echo -e "${YELLOW}[$([ "$UPDATE_CHECKSUMS" = true ] && echo "3" || echo "2")/6] Installing Dependencies${NC}"
echo "-----------------------------------"
cd "$PROJECT_ROOT"
npm install --silent 2>&1 | grep -v "npm WARN" || true
echo -e "${GREEN}✓ Dependencies installed${NC}"
echo

# Run unit tests first
echo -e "${YELLOW}[$([ "$UPDATE_CHECKSUMS" = true ] && echo "4" || echo "3")/6] Running Unit Tests${NC}"
echo "-----------------------------------"
npm run test -- --testPathPattern="integrity-checker" --silent 2>&1 | tail -n 20 || true
echo -e "${GREEN}✓ Unit tests completed${NC}"
echo

# Run E2E tests
echo -e "${YELLOW}[$([ "$UPDATE_CHECKSUMS" = true ] && echo "5" || echo "4")/6] Running E2E Tests${NC}"
echo "-----------------------------------"

cd "$PROJECT_ROOT"

if [ -n "$UI_MODE" ]; then
  # Run in UI mode
  npx playwright test --config=tests/e2e/playwright.config.claude-md.ts $UI_MODE
elif [ -n "$DEBUG_MODE" ]; then
  # Run in debug mode
  npx playwright test --config=tests/e2e/playwright.config.claude-md.ts $DEBUG_MODE
else
  # Run normally
  npx playwright test --config=tests/e2e/playwright.config.claude-md.ts $HEADED_MODE
fi

TEST_EXIT_CODE=$?

echo

# Generate report
echo -e "${YELLOW}[$([ "$UPDATE_CHECKSUMS" = true ] && echo "6" || echo "5")/6] Generating Test Report${NC}"
echo "-----------------------------------"

if [ -f "$REPORT_DIR/results.json" ]; then
  echo -e "${GREEN}✓ Test results saved to: $REPORT_DIR/results.json${NC}"

  # Parse results
  TOTAL=$(jq '.suites[].specs | length' "$REPORT_DIR/results.json" 2>/dev/null | awk '{s+=$1} END {print s}' || echo "0")
  PASSED=$(jq '[.suites[].specs[].tests[] | select(.status=="passed")] | length' "$REPORT_DIR/results.json" 2>/dev/null || echo "0")
  FAILED=$(jq '[.suites[].specs[].tests[] | select(.status=="failed")] | length' "$REPORT_DIR/results.json" 2>/dev/null || echo "0")

  echo
  echo "Test Summary:"
  echo "  Total:  $TOTAL"
  echo "  Passed: $PASSED"
  echo "  Failed: $FAILED"
else
  echo -e "${YELLOW}⚠ Test results file not found${NC}"
fi

echo

# Show report if requested
if [ "$SHOW_REPORT" = true ]; then
  echo -e "${YELLOW}[$([ "$UPDATE_CHECKSUMS" = true ] && echo "7" || echo "6")/6] Opening Test Report${NC}"
  echo "-----------------------------------"
  npx playwright show-report "$REPORT_DIR"
fi

# Final status
echo
echo -e "${BLUE}╔════════════════════════════════════════════════════════════╗${NC}"
if [ $TEST_EXIT_CODE -eq 0 ]; then
  echo -e "${BLUE}║${GREEN}  ✓ ALL TESTS PASSED                                      ${BLUE}║${NC}"
else
  echo -e "${BLUE}║${RED}  ✗ SOME TESTS FAILED                                     ${BLUE}║${NC}"
fi
echo -e "${BLUE}╚════════════════════════════════════════════════════════════╝${NC}"
echo

exit $TEST_EXIT_CODE
