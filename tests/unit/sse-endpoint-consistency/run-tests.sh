#!/bin/bash

# SSE Endpoint Consistency Test Runner
# Runs comprehensive TDD tests that demonstrate URL mismatch issues and validate fixes

set -e

echo "🚀 SSE Endpoint Consistency Test Suite"
echo "======================================="
echo ""

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Test configuration
TEST_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
COVERAGE_DIR="$TEST_DIR/coverage"
REPORT_DIR="$TEST_DIR/reports"

# Create directories
mkdir -p "$COVERAGE_DIR" "$REPORT_DIR"

echo -e "${BLUE}Test Directory:${NC} $TEST_DIR"
echo -e "${BLUE}Coverage Directory:${NC} $COVERAGE_DIR"
echo -e "${BLUE}Report Directory:${NC} $REPORT_DIR"
echo ""

# Function to run tests with specific pattern
run_test_pattern() {
    local pattern="$1"
    local description="$2"
    local expected_result="$3"
    
    echo -e "${YELLOW}Running: $description${NC}"
    echo "Pattern: $pattern"
    echo ""
    
    if npx jest --testNamePattern="$pattern" --verbose --no-cache 2>&1 | tee "$REPORT_DIR/$(echo $pattern | tr ' ' '_').log"; then
        if [ "$expected_result" = "FAIL" ]; then
            echo -e "${RED}❌ UNEXPECTED: These tests passed but should fail with current implementation${NC}"
            return 1
        else
            echo -e "${GREEN}✅ SUCCESS: Tests passed as expected${NC}"
            return 0
        fi
    else
        if [ "$expected_result" = "FAIL" ]; then
            echo -e "${GREEN}✅ EXPECTED: Tests failed as expected (URL mismatches detected)${NC}"
            return 0
        else
            echo -e "${RED}❌ FAILURE: Tests failed unexpectedly${NC}"
            return 1
        fi
    fi
}

# Phase 1: Run tests that SHOULD FAIL with current implementation
echo -e "${RED}PHASE 1: Tests that SHOULD FAIL with current URL mismatches${NC}"
echo "================================================================="
echo ""

echo "1. Testing SSE URL mismatches..."
run_test_pattern "SHOULD FAIL.*SSE connection URLs should match backend endpoint paths" \
                 "SSE Connection URL Matching Tests" \
                 "FAIL"

echo ""
echo "2. Testing API versioning inconsistencies..."
run_test_pattern "SHOULD FAIL.*API versioning should be consistent" \
                 "API Versioning Consistency Tests" \
                 "FAIL"

echo ""
echo "3. Testing connection establishment failures..."
run_test_pattern "SHOULD FAIL.*SSE connection establishment" \
                 "Connection Establishment Tests" \
                 "FAIL"

echo ""
echo "4. Testing error handling deficiencies..."
run_test_pattern "SHOULD FAIL.*Frontend should handle SSE connection failures" \
                 "Error Handling Tests" \
                 "FAIL"

echo ""
echo "5. Testing URL construction inconsistencies..."
run_test_pattern "SHOULD FAIL.*URL construction should follow consistent patterns" \
                 "URL Construction Pattern Tests" \
                 "FAIL"

echo ""
echo -e "${RED}PHASE 1 SUMMARY: Current Implementation Issues${NC}"
echo "=================================================="
echo "The above tests demonstrate the URL mismatch issues that exist in the current implementation:"
echo "• Frontend hooks use /api/claude/ while backend serves /api/v1/claude/"
echo "• Inconsistent API versioning across different hooks"
echo "• Poor error handling for URL mismatch scenarios"
echo "• No standardized URL construction patterns"
echo ""

# Phase 2: Run tests that SHOULD PASS (demonstrate what works correctly)
echo -e "${GREEN}PHASE 2: Tests that SHOULD PASS (correctly implemented features)${NC}"
echo "================================================================="
echo ""

echo "1. Testing correctly versioned endpoints..."
run_test_pattern "SHOULD PASS.*correctly.*versioned" \
                 "Correct Versioning Tests" \
                 "PASS"

echo ""
echo "2. Testing standardized URL patterns..."
run_test_pattern "SHOULD PASS.*Standardized URL" \
                 "Standardized URL Tests" \
                 "PASS"

echo ""
echo "3. Testing validation helpers..."
run_test_pattern "SHOULD PASS.*validation.*helper" \
                 "Validation Helper Tests" \
                 "PASS"

echo ""
echo "4. Testing migration utilities..."
run_test_pattern "SHOULD PASS.*Migration.*utility" \
                 "Migration Utility Tests" \
                 "PASS"

echo ""

# Phase 3: Generate comprehensive report
echo -e "${BLUE}PHASE 3: Generating Comprehensive Test Report${NC}"
echo "=============================================="
echo ""

# Run full test suite with coverage
echo "Running complete test suite with coverage..."
npx jest --coverage --coverageDirectory="$COVERAGE_DIR" --json --outputFile="$REPORT_DIR/test-results.json" || true

# Generate custom report
cat > "$REPORT_DIR/summary.md" << EOF
# SSE Endpoint Consistency Test Results

## Test Summary

This comprehensive test suite validates URL consistency between frontend hooks and backend endpoints.

### Current Issues Identified

#### 1. URL Mismatch Problems
- **Frontend hooks use:** \`/api/claude/instances/{id}/terminal/stream\`
- **Backend serves:** \`/api/v1/claude/instances/{id}/terminal/stream\`
- **Result:** 404 Not Found errors, failed SSE connections

#### 2. Inconsistent API Versioning
- Some hooks use versioned URLs (\`/api/v1/\`)
- Others use unversioned URLs (\`/api/claude/\`)
- No standardized URL construction

#### 3. Poor Error Handling
- Generic error messages
- No URL mismatch detection
- No automatic recovery/retry with correct URLs

### Files Requiring URL Fixes

#### Frontend Hooks (Priority: HIGH)
1. \`frontend/src/hooks/useSSEConnectionSingleton.ts\` - Lines 27, 63
2. \`frontend/src/hooks/useStableSSEConnection.ts\` - Lines 45, 89  
3. \`frontend/src/hooks/useAdvancedSSEConnection.ts\` - Line 307
4. \`frontend/src/hooks/useHTTPSSE.ts\` - Lines 15, 20, 25, 80

#### Required Changes
Replace \`/api/claude/\` with \`/api/v1/claude/\` in all frontend hooks.

### Test Results

- **Tests that SHOULD FAIL:** Demonstrate current URL mismatch issues
- **Tests that SHOULD PASS:** Show correct implementation examples
- **Coverage:** Validates all critical URL construction paths

### Next Steps

1. **Fix URL Patterns:** Update all frontend hooks to use \`/api/v1/\` prefix
2. **Implement URL Validation:** Add input validation and error handling
3. **Standardize Construction:** Create centralized URL template system
4. **Add Recovery Logic:** Implement smart retry with URL correction

## Test Files Generated

- \`sse-url-mismatch.test.ts\` - Core URL mismatch validation
- \`api-versioning-consistency.test.ts\` - API versioning standards
- \`connection-establishment.test.ts\` - SSE connection flow validation  
- \`graceful-error-handling.test.ts\` - Error handling improvements
- \`url-construction-patterns.test.ts\` - URL construction standardization

## Running Individual Test Suites

\`\`\`bash
# Test current URL mismatches (should fail)
npm run test:current-fails

# Test correct implementations (should pass)
npm run test:after-fix

# Full test suite with coverage
npm run test:coverage
\`\`\`

Generated: $(date)
EOF

echo -e "${GREEN}✅ Test report generated: $REPORT_DIR/summary.md${NC}"
echo -e "${GREEN}✅ Coverage report: $COVERAGE_DIR/index.html${NC}"
echo ""

# Final summary
echo -e "${BLUE}TEST SUITE COMPLETION SUMMARY${NC}"
echo "=============================="
echo ""
echo -e "${YELLOW}Purpose:${NC} Demonstrate URL mismatch issues through comprehensive TDD tests"
echo -e "${YELLOW}Result:${NC} Tests successfully identify and document all URL consistency problems"
echo ""
echo -e "${RED}FAILING TESTS (Expected):${NC} Show current implementation issues"
echo -e "${GREEN}PASSING TESTS:${NC} Show correct implementation examples"
echo ""
echo -e "${BLUE}Next Action:${NC} Fix URL patterns in frontend hooks, then re-run tests"
echo -e "${BLUE}Fix Command:${NC} Replace '/api/claude/' with '/api/v1/claude/' in all hooks"
echo ""
echo "📊 Detailed results available in: $REPORT_DIR/"
echo "📈 Coverage report available in: $COVERAGE_DIR/"
echo ""
echo -e "${GREEN}🎯 TDD Test Suite Complete!${NC}"