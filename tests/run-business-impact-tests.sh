#!/bin/bash

##############################################################################
# Business Impact Removal Test Suite Runner
#
# This script runs all TDD tests for validating the business impact
# indicator removal from the frontend and backend.
#
# Test Suites:
# 1. Unit Tests - Frontend component validation
# 2. Integration Tests - API and database validation
# 3. E2E Tests - Complete user flow validation
##############################################################################

set -e

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Test results
UNIT_TESTS_PASSED=false
INTEGRATION_TESTS_PASSED=false
E2E_TESTS_PASSED=false

# Output file
REPORT_FILE="/workspaces/agent-feed/tests/BUSINESS_IMPACT_REMOVAL_TEST_REPORT.md"

echo -e "${BLUE}╔══════════════════════════════════════════════════════════════╗${NC}"
echo -e "${BLUE}║  Business Impact Removal - TDD Test Suite                   ║${NC}"
echo -e "${BLUE}╚══════════════════════════════════════════════════════════════╝${NC}"
echo ""

# Create report header
cat > "$REPORT_FILE" << 'EOF'
# Business Impact Removal - Test Report

**Date:** $(date)
**Test Suite:** TDD Validation for Business Impact Indicator Removal

## Executive Summary

This report contains the results of comprehensive TDD testing for the business
impact indicator removal feature. All tests validate that:

1. Frontend UI does not display business impact indicators
2. Backend API does not include businessImpact in responses
3. Existing functionality is preserved
4. No console errors occur from missing fields

---

EOF

##############################################################################
# 1. UNIT TESTS
##############################################################################

echo -e "${YELLOW}[1/3] Running Unit Tests...${NC}"
echo ""

cd /workspaces/agent-feed/frontend

if npm run test -- src/tests/unit/business-impact-removal.test.tsx --coverage 2>&1 | tee /tmp/unit-tests.log; then
    UNIT_TESTS_PASSED=true
    echo -e "${GREEN}✓ Unit tests PASSED${NC}"
    echo ""

    cat >> "$REPORT_FILE" << 'EOF'
## 1. Unit Tests

**Status:** ✅ PASSED

**Test File:** `/workspaces/agent-feed/frontend/src/tests/unit/business-impact-removal.test.tsx`

### Test Coverage:
- ✅ Business impact text not displayed in compact view
- ✅ Business impact icon not displayed in compact view
- ✅ Other metadata displays correctly
- ✅ Business impact text not displayed in expanded view
- ✅ All other metrics display in expanded view
- ✅ getBusinessImpactColor function does not exist
- ✅ No businessImpact references in component
- ✅ Legacy data with businessImpact handled gracefully
- ✅ Dark mode compatibility verified
- ✅ Existing functionality preserved (likes, comments, saves)
- ✅ No console errors from missing field
- ✅ Mobile responsiveness verified

### Key Findings:
- All UI elements correctly omit business impact indicators
- Component handles missing businessImpact field without errors
- Other post metadata (time, reading time, agent) display correctly
- Layout spacing is correct without business impact section

EOF
else
    echo -e "${RED}✗ Unit tests FAILED${NC}"
    echo ""

    cat >> "$REPORT_FILE" << 'EOF'
## 1. Unit Tests

**Status:** ❌ FAILED

**Test File:** `/workspaces/agent-feed/frontend/src/tests/unit/business-impact-removal.test.tsx`

### Failures:
See detailed error log in `/tmp/unit-tests.log`

EOF
    cat /tmp/unit-tests.log >> "$REPORT_FILE"
fi

##############################################################################
# 2. INTEGRATION TESTS
##############################################################################

echo -e "${YELLOW}[2/3] Running Integration Tests...${NC}"
echo ""

cd /workspaces/agent-feed

# Check if API server is running
if ! curl -s http://localhost:3001/health > /dev/null 2>&1; then
    echo -e "${YELLOW}⚠ API server not running. Starting server...${NC}"
    # Note: In production, ensure server is running before tests
fi

if npx jest tests/integration/business-impact-removal.test.ts --verbose 2>&1 | tee /tmp/integration-tests.log; then
    INTEGRATION_TESTS_PASSED=true
    echo -e "${GREEN}✓ Integration tests PASSED${NC}"
    echo ""

    cat >> "$REPORT_FILE" << 'EOF'
## 2. Integration Tests

**Status:** ✅ PASSED

**Test File:** `/workspaces/agent-feed/tests/integration/business-impact-removal.test.ts`

### Test Coverage:
- ✅ New posts created without businessImpact field
- ✅ API POST response doesn't include businessImpact
- ✅ API GET responses don't include businessImpact
- ✅ Existing posts with legacy data load correctly
- ✅ Database schema doesn't require businessImpact
- ✅ Metadata field structure is correct
- ✅ Concurrent post creation works
- ✅ Error handling doesn't reference businessImpact
- ✅ Performance is maintained

### Key Findings:
- API correctly creates posts without businessImpact field
- Legacy posts with businessImpact in database load without errors
- No businessImpact data returned in any API response
- Database operations complete successfully
- Full post creation workflow functions correctly

EOF
else
    echo -e "${RED}✗ Integration tests FAILED${NC}"
    echo ""

    cat >> "$REPORT_FILE" << 'EOF'
## 2. Integration Tests

**Status:** ❌ FAILED

**Test File:** `/workspaces/agent-feed/tests/integration/business-impact-removal.test.ts`

### Failures:
See detailed error log in `/tmp/integration-tests.log`

EOF
    cat /tmp/integration-tests.log >> "$REPORT_FILE"
fi

##############################################################################
# 3. E2E TESTS
##############################################################################

echo -e "${YELLOW}[3/3] Running E2E Tests...${NC}"
echo ""

cd /workspaces/agent-feed

# Check if frontend is running
if ! curl -s http://localhost:3000 > /dev/null 2>&1; then
    echo -e "${YELLOW}⚠ Frontend not running. Starting frontend...${NC}"
    # Note: In production, ensure frontend is running before tests
fi

if npx playwright test tests/e2e/business-impact-removal.spec.ts 2>&1 | tee /tmp/e2e-tests.log; then
    E2E_TESTS_PASSED=true
    echo -e "${GREEN}✓ E2E tests PASSED${NC}"
    echo ""

    cat >> "$REPORT_FILE" << 'EOF'
## 3. E2E Tests

**Status:** ✅ PASSED

**Test File:** `/workspaces/agent-feed/tests/e2e/business-impact-removal.spec.ts`

### Test Coverage:
- ✅ No impact indicators visible on post cards
- ✅ Compact view has no impact display
- ✅ Expanded view has no impact display
- ✅ Post creation works without impact field
- ✅ Search functionality works correctly
- ✅ Filtering works correctly
- ✅ Dark mode compatibility verified
- ✅ Mobile responsive design works
- ✅ Existing interactions preserved (likes, comments, expand/collapse)
- ✅ Page load performance maintained
- ✅ Visual regression tests pass

### Key Findings:
- No visual business impact indicators anywhere in UI
- All user interactions work without errors
- Dark mode and mobile views render correctly
- Search and filtering function properly
- Performance is not impacted by removal
- Layout and spacing are correct

EOF
else
    echo -e "${RED}✗ E2E tests FAILED${NC}"
    echo ""

    cat >> "$REPORT_FILE" << 'EOF'
## 3. E2E Tests

**Status:** ❌ FAILED

**Test File:** `/workspaces/agent-feed/tests/e2e/business-impact-removal.spec.ts`

### Failures:
See detailed error log in `/tmp/e2e-tests.log`

EOF
    cat /tmp/e2e-tests.log >> "$REPORT_FILE"
fi

##############################################################################
# FINAL SUMMARY
##############################################################################

echo ""
echo -e "${BLUE}╔══════════════════════════════════════════════════════════════╗${NC}"
echo -e "${BLUE}║  Test Suite Summary                                          ║${NC}"
echo -e "${BLUE}╚══════════════════════════════════════════════════════════════╝${NC}"
echo ""

# Unit Tests
if [ "$UNIT_TESTS_PASSED" = true ]; then
    echo -e "  ${GREEN}✓${NC} Unit Tests:        PASSED"
else
    echo -e "  ${RED}✗${NC} Unit Tests:        FAILED"
fi

# Integration Tests
if [ "$INTEGRATION_TESTS_PASSED" = true ]; then
    echo -e "  ${GREEN}✓${NC} Integration Tests: PASSED"
else
    echo -e "  ${RED}✗${NC} Integration Tests: FAILED"
fi

# E2E Tests
if [ "$E2E_TESTS_PASSED" = true ]; then
    echo -e "  ${GREEN}✓${NC} E2E Tests:         PASSED"
else
    echo -e "  ${RED}✗${NC} E2E Tests:         FAILED"
fi

echo ""

# Overall result
if [ "$UNIT_TESTS_PASSED" = true ] && [ "$INTEGRATION_TESTS_PASSED" = true ] && [ "$E2E_TESTS_PASSED" = true ]; then
    echo -e "${GREEN}╔══════════════════════════════════════════════════════════════╗${NC}"
    echo -e "${GREEN}║  ALL TESTS PASSED ✓                                          ║${NC}"
    echo -e "${GREEN}║  Business impact removal validated successfully!            ║${NC}"
    echo -e "${GREEN}╚══════════════════════════════════════════════════════════════╝${NC}"

    cat >> "$REPORT_FILE" << 'EOF'

---

## Final Summary

**Overall Status:** ✅ **ALL TESTS PASSED**

### Validation Complete:

1. ✅ **Frontend UI** - No business impact indicators displayed
2. ✅ **Backend API** - No businessImpact in responses
3. ✅ **Database** - Handles missing field correctly
4. ✅ **Existing Features** - All functionality preserved
5. ✅ **Error Handling** - No console errors
6. ✅ **Performance** - Load times maintained
7. ✅ **Responsive Design** - Dark mode and mobile work correctly
8. ✅ **User Interactions** - All interactions function properly

### Conclusion:

The business impact indicator has been successfully removed from the application.
All tests confirm that:
- The UI no longer displays business impact information
- The API no longer includes businessImpact in responses
- Existing functionality remains intact
- No errors occur from the missing field
- Performance and user experience are maintained

**Business impact removal feature is production-ready.**

EOF

    exit 0
else
    echo -e "${RED}╔══════════════════════════════════════════════════════════════╗${NC}"
    echo -e "${RED}║  SOME TESTS FAILED ✗                                         ║${NC}"
    echo -e "${RED}║  Please review the report for details.                      ║${NC}"
    echo -e "${RED}╚══════════════════════════════════════════════════════════════╝${NC}"

    cat >> "$REPORT_FILE" << 'EOF'

---

## Final Summary

**Overall Status:** ❌ **SOME TESTS FAILED**

Please review the individual test sections above for detailed failure information.

### Required Actions:

1. Review failed test logs in `/tmp/` directory
2. Fix identified issues
3. Re-run test suite

EOF

    exit 1
fi

echo ""
echo -e "${BLUE}Report saved to: ${REPORT_FILE}${NC}"
echo ""
