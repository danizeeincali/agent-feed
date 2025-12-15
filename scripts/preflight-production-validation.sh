#!/bin/bash

# PRODUCTION VALIDATION PREFLIGHT CHECK
# Verifies all prerequisites before running validation

set -e

echo "=========================================="
echo "PRODUCTION VALIDATION - PREFLIGHT CHECK"
echo "=========================================="
echo ""

# Colors
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m'

PASSED=0
FAILED=0
WARNINGS=0

# Helper functions
check_pass() {
    echo -e "${GREEN}✓${NC} $1"
    ((PASSED++))
}

check_fail() {
    echo -e "${RED}✗${NC} $1"
    ((FAILED++))
}

check_warn() {
    echo -e "${YELLOW}⚠${NC} $1"
    ((WARNINGS++))
}

echo -e "${BLUE}=== System Checks ===${NC}"
echo ""

# Check Node.js
if command -v node &> /dev/null; then
    NODE_VERSION=$(node --version)
    check_pass "Node.js installed: $NODE_VERSION"
else
    check_fail "Node.js not installed"
fi

# Check npm
if command -v npm &> /dev/null; then
    NPM_VERSION=$(npm --version)
    check_pass "npm installed: $NPM_VERSION"
else
    check_fail "npm not installed"
fi

# Check Playwright
if npx playwright --version &> /dev/null; then
    PLAYWRIGHT_VERSION=$(npx playwright --version)
    check_pass "Playwright installed: $PLAYWRIGHT_VERSION"
else
    check_fail "Playwright not installed"
    echo "  Install with: npx playwright install"
fi

echo ""
echo -e "${BLUE}=== Backend Checks ===${NC}"
echo ""

# Check backend running
if curl -s http://localhost:3001/health > /dev/null 2>&1; then
    check_pass "Backend is running on port 3001"

    # Check health endpoint
    HEALTH=$(curl -s http://localhost:3001/health)
    if echo "$HEALTH" | grep -q "ok\|healthy\|up"; then
        check_pass "Backend health check passed"
    else
        check_warn "Backend health check unclear: $HEALTH"
    fi
else
    check_fail "Backend is NOT running on port 3001"
    echo "  Start with: cd api-server && npm start"
fi

# Check for .env file
if [ -f "/workspaces/agent-feed/api-server/.env" ]; then
    check_pass "Backend .env file exists"

    # Check for API key (without revealing it)
    if grep -q "ANTHROPIC_API_KEY=sk-ant-" /workspaces/agent-feed/api-server/.env 2>/dev/null; then
        check_pass "ANTHROPIC_API_KEY found in .env"
    else
        check_fail "ANTHROPIC_API_KEY not found or invalid in .env"
        echo "  Add to api-server/.env: ANTHROPIC_API_KEY=sk-ant-..."
    fi
else
    check_fail "Backend .env file not found"
    echo "  Create api-server/.env with ANTHROPIC_API_KEY"
fi

echo ""
echo -e "${BLUE}=== Frontend Checks ===${NC}"
echo ""

# Check frontend running
if curl -s http://localhost:5173 > /dev/null 2>&1; then
    check_pass "Frontend is running on port 5173"

    # Check if it's actually serving content
    CONTENT=$(curl -s http://localhost:5173)
    if echo "$CONTENT" | grep -q "<!DOCTYPE html\|<html"; then
        check_pass "Frontend serving HTML content"
    else
        check_warn "Frontend responding but content unclear"
    fi
else
    check_fail "Frontend is NOT running on port 5173"
    echo "  Start with: cd frontend && npm run dev"
fi

echo ""
echo -e "${BLUE}=== Test Files ===${NC}"
echo ""

# Check test file exists
if [ -f "/workspaces/agent-feed/tests/e2e/production-validation-real-browser.spec.ts" ]; then
    check_pass "Production validation test file exists"
else
    check_fail "Production validation test file not found"
fi

# Check scripts exist
if [ -f "/workspaces/agent-feed/scripts/run-production-validation.sh" ]; then
    check_pass "Validation runner script exists"

    if [ -x "/workspaces/agent-feed/scripts/run-production-validation.sh" ]; then
        check_pass "Validation runner is executable"
    else
        check_warn "Validation runner not executable"
        echo "  Fix with: chmod +x scripts/run-production-validation.sh"
    fi
else
    check_fail "Validation runner script not found"
fi

if [ -f "/workspaces/agent-feed/scripts/generate-validation-report.js" ]; then
    check_pass "Report generator script exists"
else
    check_fail "Report generator script not found"
fi

echo ""
echo -e "${BLUE}=== Directory Setup ===${NC}"
echo ""

# Check/create screenshots directory
if [ -d "/workspaces/agent-feed/screenshots" ]; then
    check_pass "Screenshots directory exists"
else
    mkdir -p /workspaces/agent-feed/screenshots/production-validation
    check_pass "Created screenshots directory"
fi

if [ -d "/workspaces/agent-feed/screenshots/production-validation" ]; then
    check_pass "Production validation screenshots directory ready"
else
    mkdir -p /workspaces/agent-feed/screenshots/production-validation
    check_pass "Created production validation screenshots directory"
fi

echo ""
echo -e "${BLUE}=== Environment Variables ===${NC}"
echo ""

# Check environment variables
if [ -n "$ANTHROPIC_API_KEY" ]; then
    check_pass "ANTHROPIC_API_KEY set in environment"
else
    check_warn "ANTHROPIC_API_KEY not set in environment (may be in .env only)"
    echo "  This is OK if it's in api-server/.env"
fi

echo ""
echo -e "${BLUE}=== Network Connectivity ===${NC}"
echo ""

# Check internet connectivity
if ping -c 1 google.com &> /dev/null; then
    check_pass "Internet connectivity OK"
else
    check_warn "Cannot reach google.com (may affect Claude API)"
fi

# Check Claude API (if possible)
if [ -n "$ANTHROPIC_API_KEY" ]; then
    CLAUDE_STATUS=$(curl -s -o /dev/null -w "%{http_code}" \
        -H "x-api-key: $ANTHROPIC_API_KEY" \
        -H "anthropic-version: 2023-06-01" \
        https://api.anthropic.com/v1/messages 2>/dev/null || echo "000")

    if [ "$CLAUDE_STATUS" = "400" ]; then
        check_pass "Claude API accessible (400 = API key works)"
    elif [ "$CLAUDE_STATUS" = "401" ]; then
        check_fail "Claude API key invalid (401 Unauthorized)"
    else
        check_warn "Claude API status unclear: $CLAUDE_STATUS"
    fi
else
    check_warn "Cannot test Claude API (no key in environment)"
fi

echo ""
echo "=========================================="
echo -e "${BLUE}PREFLIGHT CHECK SUMMARY${NC}"
echo "=========================================="
echo ""
echo -e "${GREEN}Passed:${NC}   $PASSED"
echo -e "${RED}Failed:${NC}   $FAILED"
echo -e "${YELLOW}Warnings:${NC} $WARNINGS"
echo ""

if [ $FAILED -eq 0 ]; then
    echo -e "${GREEN}=========================================="
    echo "✓ ALL CRITICAL CHECKS PASSED"
    echo "==========================================${NC}"
    echo ""
    echo "Ready to run production validation!"
    echo ""
    echo "Run with:"
    echo "  ./scripts/run-production-validation.sh"
    echo ""

    if [ $WARNINGS -gt 0 ]; then
        echo -e "${YELLOW}Note: $WARNINGS warnings detected (see above)${NC}"
        echo "These may not prevent the test from running."
        echo ""
    fi

    exit 0
else
    echo -e "${RED}=========================================="
    echo "✗ $FAILED CRITICAL CHECKS FAILED"
    echo "==========================================${NC}"
    echo ""
    echo "Please fix the issues above before running validation."
    echo ""
    echo "Common fixes:"
    echo "  - Start backend: cd api-server && npm start"
    echo "  - Start frontend: cd frontend && npm run dev"
    echo "  - Add API key: echo 'ANTHROPIC_API_KEY=sk-ant-...' >> api-server/.env"
    echo "  - Install Playwright: npx playwright install"
    echo ""
    exit 1
fi
