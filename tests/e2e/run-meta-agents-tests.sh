#!/bin/bash

##############################################################################
# Meta-Agent Protected Config Tests - Execution Script
#
# This script runs comprehensive validation tests for meta-agent and
# meta-update-agent protected config functionality.
#
# Test Suites:
# 1. Meta-Agent Protected Config Creation Tests
# 2. Meta-Update-Agent Protected Config Update Tests
# 3. Integration Tests
# 4. Performance Tests
#
# Usage:
#   ./tests/e2e/run-meta-agents-tests.sh [options]
#
# Options:
#   --suite <name>    Run specific test suite (creation, update, integration, performance, all)
#   --debug           Enable debug output
#   --no-cleanup      Skip cleanup of test artifacts
#   --report          Generate detailed validation report
#   --help            Show this help message
##############################################################################

set -e

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
MAGENTA='\033[0;35m'
CYAN='\033[0;36m'
NC='\033[0m' # No Color

# Script directory
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
PROJECT_ROOT="$(cd "$SCRIPT_DIR/../.." && pwd)"

# Default options
SUITE="all"
DEBUG=false
NO_CLEANUP=false
GENERATE_REPORT=true

# Parse command-line options
while [[ $# -gt 0 ]]; do
  case $1 in
    --suite)
      SUITE="$2"
      shift 2
      ;;
    --debug)
      DEBUG=true
      shift
      ;;
    --no-cleanup)
      NO_CLEANUP=true
      shift
      ;;
    --report)
      GENERATE_REPORT=true
      shift
      ;;
    --help)
      head -n 25 "$0" | tail -n 23
      exit 0
      ;;
    *)
      echo -e "${RED}Unknown option: $1${NC}"
      exit 1
      ;;
  esac
done

# Print header
echo ""
echo -e "${MAGENTA}╔═══════════════════════════════════════════════════════════════════════════════╗${NC}"
echo -e "${MAGENTA}║                                                                               ║${NC}"
echo -e "${MAGENTA}║          META-AGENT PROTECTED CONFIG VALIDATION TEST SUITE                    ║${NC}"
echo -e "${MAGENTA}║                                                                               ║${NC}"
echo -e "${MAGENTA}╚═══════════════════════════════════════════════════════════════════════════════╝${NC}"
echo ""

# Navigate to project root
cd "$PROJECT_ROOT"

# Ensure test directories exist
mkdir -p tests/e2e/test-results
mkdir -p tests/e2e/screenshots
mkdir -p prod/agent_workspace/meta-update-agent/backups

# Function: Run specific test suite
run_test_suite() {
  local suite_name=$1
  local test_file=$2

  echo ""
  echo -e "${CYAN}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"
  echo -e "${CYAN}  Running: ${suite_name}${NC}"
  echo -e "${CYAN}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"
  echo ""

  if [ "$DEBUG" = true ]; then
    npx playwright test --config=playwright.config.meta-agents.ts "$test_file" --reporter=list,html --headed
  else
    npx playwright test --config=playwright.config.meta-agents.ts "$test_file" --reporter=list,html
  fi

  local exit_code=$?

  if [ $exit_code -eq 0 ]; then
    echo ""
    echo -e "${GREEN}✅ ${suite_name} PASSED${NC}"
  else
    echo ""
    echo -e "${RED}❌ ${suite_name} FAILED${NC}"
    return $exit_code
  fi
}

# Track test results
FAILED_SUITES=()

# Run Test Suite 1: Meta-Agent Creation
if [ "$SUITE" = "all" ] || [ "$SUITE" = "creation" ]; then
  if ! run_test_suite "Test Suite 1: Meta-Agent Protected Config Creation" \
                      "tests/e2e/meta-agent-creation-validation.spec.ts"; then
    FAILED_SUITES+=("Meta-Agent Creation")
  fi
fi

# Run Test Suite 2: Meta-Update-Agent Updates
if [ "$SUITE" = "all" ] || [ "$SUITE" = "update" ]; then
  if ! run_test_suite "Test Suite 2: Meta-Update-Agent Protected Config Updates" \
                      "tests/e2e/meta-update-agent-protected-updates.spec.ts"; then
    FAILED_SUITES+=("Meta-Update-Agent Updates")
  fi
fi

# Run Test Suite 3: Integration Tests
if [ "$SUITE" = "all" ] || [ "$SUITE" = "integration" ]; then
  if ! run_test_suite "Test Suite 3: Meta-Agents Integration Tests" \
                      "tests/integration/protected-agents/meta-agents-integration.spec.ts"; then
    FAILED_SUITES+=("Integration Tests")
  fi
fi

# Run Test Suite 4: Performance Tests
if [ "$SUITE" = "all" ] || [ "$SUITE" = "performance" ]; then
  if ! run_test_suite "Test Suite 4: Meta-Agents Performance Tests" \
                      "tests/performance/meta-agents-performance.spec.ts"; then
    FAILED_SUITES+=("Performance Tests")
  fi
fi

# Cleanup test artifacts (unless --no-cleanup specified)
if [ "$NO_CLEANUP" = false ]; then
  echo ""
  echo -e "${YELLOW}Cleaning up test artifacts...${NC}"

  # Remove test agents
  rm -f prod/.claude/agents/test-meta-*
  rm -f prod/.system/test-meta-*
  rm -rf prod/agent_workspace/test-meta-*

  # Remove test integration agents
  rm -f prod/.claude/agents/test-integration-*
  rm -f prod/.system/test-integration-*
  rm -rf prod/agent_workspace/test-integration-*

  # Remove test performance agents
  rm -f prod/.claude/agents/test-perf-*
  rm -f prod/.system/test-perf-*
  rm -rf prod/agent_workspace/test-perf-*

  echo -e "${GREEN}✅ Cleanup complete${NC}"
fi

# Generate validation report
if [ "$GENERATE_REPORT" = true ]; then
  echo ""
  echo -e "${CYAN}Generating validation report...${NC}"

  REPORT_FILE="tests/e2e/test-results/META-AGENTS-VALIDATION-REPORT.md"

  cat > "$REPORT_FILE" << EOF
# Meta-Agents Protected Config Validation Report

**Date**: $(date)
**Test Suite**: Meta-Agent and Meta-Update-Agent Protected Config Tests
**Environment**: $(uname -s) $(uname -r)

## Test Summary

### Test Suites Executed

1. **Meta-Agent Protected Config Creation Tests**
   - Test 1: Complete agent creation with protected config
   - Test 2: System agent template correctly applied
   - Test 3: User-Facing agent template correctly applied
   - Test 4: SHA-256 checksum computation
   - Test 5: File permissions enforcement

2. **Meta-Update-Agent Protected Config Update Tests**
   - Test 1: Protected field update routing
   - Test 2: User-editable field update routing
   - Test 3: Backup creation before modifications
   - Test 4: Checksum recomputation after updates
   - Test 5: IntegrityChecker validation
   - Test 6: Rollback functionality

3. **Integration Tests**
   - Test 1: Complete create-then-update workflow
   - Test 2: Field classification accuracy (31 protected, 28 user-editable)
   - Test 3: Multi-agent concurrent creation

4. **Performance Tests**
   - Test 1: Meta-agent creation performance (<2s per agent)
   - Test 2: Meta-update-agent update performance (<1s per update)
   - Test 3: Checksum computation performance (<100ms)
   - Test 4: Memory leak detection

## Test Results

EOF

  if [ ${#FAILED_SUITES[@]} -eq 0 ]; then
    cat >> "$REPORT_FILE" << EOF
### ✅ ALL TESTS PASSED

All meta-agent protected config validation tests passed successfully.

**Validation Status**: PASS ✅

### Key Validations Confirmed

- ✅ Protected config files created with correct structure
- ✅ SHA-256 checksums computed and validated
- ✅ File permissions enforced (444 for configs, 555 for directory)
- ✅ Field routing (protected vs user-editable) working correctly
- ✅ Backup and rollback functionality operational
- ✅ IntegrityChecker validation performed
- ✅ No race conditions in concurrent operations
- ✅ Performance targets met
- ✅ No memory leaks detected

### Architecture Components Validated

- Field Classification System (31 protected, 28 user-editable)
- IntegrityChecker (SHA-256 validation)
- Protected Config Schema
- Meta-Agent Creation Logic
- Meta-Update-Agent Update Logic
- Backup and Rollback System

### Conclusion

The meta-agent and meta-update-agent implementations are **production-ready** with
full protected config support, integrity checking, and rollback capabilities.

EOF
  else
    cat >> "$REPORT_FILE" << EOF
### ❌ SOME TESTS FAILED

The following test suites failed:

EOF
    for suite in "${FAILED_SUITES[@]}"; do
      echo "- ❌ $suite" >> "$REPORT_FILE"
    done

    cat >> "$REPORT_FILE" << EOF

**Validation Status**: FAIL ❌

Please review the test results and address failures before deploying to production.

EOF
  fi

  cat >> "$REPORT_FILE" << EOF

## Test Artifacts

- HTML Report: \`tests/e2e/test-results/meta-agents-html-report/index.html\`
- JSON Results: \`tests/e2e/test-results/meta-agents-results.json\`
- Screenshots: \`tests/e2e/screenshots/\`

## Recommendations

1. Review all test results in the HTML report
2. Verify checksum validation is functioning correctly
3. Ensure file permissions are enforced (444 for configs)
4. Validate backup and rollback procedures
5. Monitor performance metrics in production

---

*Generated by Meta-Agents Protected Config Test Suite*
EOF

  echo -e "${GREEN}✅ Validation report generated: $REPORT_FILE${NC}"
fi

# Print summary
echo ""
echo -e "${MAGENTA}╔═══════════════════════════════════════════════════════════════════════════════╗${NC}"
echo -e "${MAGENTA}║                                                                               ║${NC}"
echo -e "${MAGENTA}║                           TEST SUITE SUMMARY                                  ║${NC}"
echo -e "${MAGENTA}║                                                                               ║${NC}"
echo -e "${MAGENTA}╚═══════════════════════════════════════════════════════════════════════════════╝${NC}"
echo ""

if [ ${#FAILED_SUITES[@]} -eq 0 ]; then
  echo -e "${GREEN}✅ ALL TEST SUITES PASSED${NC}"
  echo ""
  echo -e "${CYAN}Summary:${NC}"
  echo -e "  • Meta-Agent Creation: ${GREEN}PASS${NC}"
  echo -e "  • Meta-Update-Agent Updates: ${GREEN}PASS${NC}"
  echo -e "  • Integration Tests: ${GREEN}PASS${NC}"
  echo -e "  • Performance Tests: ${GREEN}PASS${NC}"
  echo ""
  echo -e "${GREEN}🎉 Meta-agents are production-ready with full protected config support!${NC}"
  exit 0
else
  echo -e "${RED}❌ ${#FAILED_SUITES[@]} TEST SUITE(S) FAILED${NC}"
  echo ""
  echo -e "${CYAN}Failed Suites:${NC}"
  for suite in "${FAILED_SUITES[@]}"; do
    echo -e "  ${RED}✗${NC} $suite"
  done
  echo ""
  echo -e "${YELLOW}⚠️  Please review test results and fix failures before deploying.${NC}"
  exit 1
fi
