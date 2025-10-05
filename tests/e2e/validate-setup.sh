#!/bin/bash

###############################################################################
# E2E Test Environment Validation Script
#
# Validates that the system is ready to run E2E tests.
# Checks prerequisites, dependencies, and configuration.
###############################################################################

set -e

# Colors
RED='\033[0;31m'
GREEN='\033[0;32m'
BLUE='\033[0;34m'
YELLOW='\033[1;33m'
NC='\033[0m'

echo -e "${BLUE}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"
echo -e "${BLUE}  E2E Test Environment Validation${NC}"
echo -e "${BLUE}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"
echo ""

ERRORS=0
WARNINGS=0

# Helper functions
check_pass() {
  echo -e "  ${GREEN}✓${NC} $1"
}

check_fail() {
  echo -e "  ${RED}✗${NC} $1"
  ERRORS=$((ERRORS + 1))
}

check_warn() {
  echo -e "  ${YELLOW}⚠${NC} $1"
  WARNINGS=$((WARNINGS + 1))
}

# Check 1: Node.js version
echo -e "${BLUE}Checking Node.js...${NC}"
if command -v node &> /dev/null; then
  NODE_VERSION=$(node --version)
  NODE_MAJOR=$(echo $NODE_VERSION | cut -d'.' -f1 | sed 's/v//')

  if [ "$NODE_MAJOR" -ge 16 ]; then
    check_pass "Node.js $NODE_VERSION (>= 16 required)"
  else
    check_fail "Node.js $NODE_VERSION (>= 16 required, found $NODE_MAJOR)"
  fi
else
  check_fail "Node.js not found"
fi
echo ""

# Check 2: npm
echo -e "${BLUE}Checking npm...${NC}"
if command -v npm &> /dev/null; then
  NPM_VERSION=$(npm --version)
  check_pass "npm $NPM_VERSION"
else
  check_fail "npm not found"
fi
echo ""

# Check 3: Workspace structure
echo -e "${BLUE}Checking workspace structure...${NC}"
WORKSPACE_ROOT="/workspaces/agent-feed"

if [ -d "$WORKSPACE_ROOT" ]; then
  check_pass "Workspace root exists: $WORKSPACE_ROOT"
else
  check_fail "Workspace root not found: $WORKSPACE_ROOT"
fi

if [ -d "$WORKSPACE_ROOT/api-server" ]; then
  check_pass "API server directory exists"
else
  check_fail "API server directory not found"
fi

if [ -f "$WORKSPACE_ROOT/api-server/server.js" ]; then
  check_pass "Server file exists"
else
  check_fail "Server file not found"
fi

if [ -d "$WORKSPACE_ROOT/data/agent-pages" ]; then
  check_pass "Pages directory exists"
else
  check_warn "Pages directory not found (will be created)"
fi

if [ -f "$WORKSPACE_ROOT/data/agent-pages.db" ]; then
  check_pass "Database file exists"
else
  check_fail "Database file not found"
fi
echo ""

# Check 4: Database schema
echo -e "${BLUE}Checking database schema...${NC}"
if command -v sqlite3 &> /dev/null; then
  check_pass "SQLite3 installed"

  if [ -f "$WORKSPACE_ROOT/data/agent-pages.db" ]; then
    # Check tables exist
    AGENTS_TABLE=$(sqlite3 "$WORKSPACE_ROOT/data/agent-pages.db" "SELECT name FROM sqlite_master WHERE type='table' AND name='agents';" 2>/dev/null)
    PAGES_TABLE=$(sqlite3 "$WORKSPACE_ROOT/data/agent-pages.db" "SELECT name FROM sqlite_master WHERE type='table' AND name='agent_pages';" 2>/dev/null)

    if [ "$AGENTS_TABLE" = "agents" ]; then
      check_pass "agents table exists"
    else
      check_fail "agents table missing"
    fi

    if [ "$PAGES_TABLE" = "agent_pages" ]; then
      check_pass "agent_pages table exists"
    else
      check_fail "agent_pages table missing"
    fi
  fi
else
  check_warn "SQLite3 not found (optional for validation)"
fi
echo ""

# Check 5: Port availability
echo -e "${BLUE}Checking port availability...${NC}"
for PORT in 3001 3002 3003 3004; do
  if lsof -Pi :$PORT -sTCP:LISTEN -t >/dev/null 2>&1; then
    check_warn "Port $PORT is in use (may cause conflicts)"
  else
    check_pass "Port $PORT available"
  fi
done
echo ""

# Check 6: Test files
echo -e "${BLUE}Checking test files...${NC}"
TEST_DIR="$WORKSPACE_ROOT/tests/e2e"

if [ -f "$TEST_DIR/page-registration-workflow.test.js" ]; then
  check_pass "Workflow test exists"
else
  check_fail "Workflow test not found"
fi

if [ -f "$TEST_DIR/agent-compliance.test.js" ]; then
  check_pass "Compliance test exists"
else
  check_fail "Compliance test not found"
fi

if [ -f "$TEST_DIR/failure-recovery.test.js" ]; then
  check_pass "Recovery test exists"
else
  check_fail "Recovery test not found"
fi

if [ -f "$TEST_DIR/performance.test.js" ]; then
  check_pass "Performance test exists"
else
  check_fail "Performance test not found"
fi

if [ -x "$TEST_DIR/run-all-tests.sh" ]; then
  check_pass "Test runner is executable"
else
  check_warn "Test runner not executable (run: chmod +x)"
fi
echo ""

# Check 7: Dependencies
echo -e "${BLUE}Checking dependencies...${NC}"
if [ -f "$TEST_DIR/package.json" ]; then
  check_pass "package.json exists"

  if [ -d "$TEST_DIR/node_modules" ]; then
    check_pass "node_modules exists (dependencies installed)"
  else
    check_warn "node_modules missing (run: npm install)"
  fi
else
  check_fail "package.json not found"
fi
echo ""

# Check 8: API server dependencies
echo -e "${BLUE}Checking API server dependencies...${NC}"
if [ -f "$WORKSPACE_ROOT/api-server/package.json" ]; then
  check_pass "API server package.json exists"

  if [ -d "$WORKSPACE_ROOT/api-server/node_modules" ]; then
    check_pass "API server dependencies installed"
  else
    check_warn "API server dependencies missing"
  fi
else
  check_fail "API server package.json not found"
fi
echo ""

# Check 9: Playwright
echo -e "${BLUE}Checking Playwright...${NC}"
if [ -d "$TEST_DIR/node_modules/@playwright" ]; then
  check_pass "Playwright installed"
else
  check_warn "Playwright not installed (run: npm install)"
fi
echo ""

# Check 10: File permissions
echo -e "${BLUE}Checking file permissions...${NC}"
if [ -w "$WORKSPACE_ROOT/data/agent-pages" ]; then
  check_pass "Pages directory is writable"
else
  check_fail "Pages directory is not writable"
fi

if [ -w "$WORKSPACE_ROOT/data/agent-pages.db" ]; then
  check_pass "Database is writable"
else
  check_fail "Database is not writable"
fi
echo ""

# Summary
echo -e "${BLUE}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"
echo -e "${BLUE}  Validation Summary${NC}"
echo -e "${BLUE}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"
echo ""

if [ $ERRORS -eq 0 ] && [ $WARNINGS -eq 0 ]; then
  echo -e "${GREEN}✓ All checks passed!${NC}"
  echo ""
  echo -e "Ready to run tests:"
  echo -e "  ${BLUE}./tests/e2e/run-all-tests.sh${NC}"
  echo ""
  exit 0
elif [ $ERRORS -eq 0 ]; then
  echo -e "${YELLOW}⚠ Validation passed with warnings${NC}"
  echo -e "  Warnings: $WARNINGS"
  echo ""
  echo -e "You can proceed, but review warnings above."
  echo ""
  exit 0
else
  echo -e "${RED}✗ Validation failed${NC}"
  echo -e "  Errors: $ERRORS"
  echo -e "  Warnings: $WARNINGS"
  echo ""
  echo -e "Please fix errors before running tests."
  echo ""
  exit 1
fi
