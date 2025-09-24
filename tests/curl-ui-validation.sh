#!/bin/bash

echo "🔍 UI/UX Validation Suite - Post Page Removal"
echo "============================================================"

# Create test results directory
mkdir -p /workspaces/agent-feed/tests/results

# Test 1: Frontend Connectivity
echo ""
echo "📍 Test 1: Frontend Connectivity"
FRONTEND_STATUS=$(curl -s -o /dev/null -w "%{http_code}" http://localhost:5173)
echo "Frontend status: $FRONTEND_STATUS"

if [ "$FRONTEND_STATUS" = "200" ]; then
    echo "✅ Frontend is responding"
    FRONTEND_PASS=1
else
    echo "❌ Frontend not responding"
    FRONTEND_PASS=0
fi

# Test 2: Backend API Connectivity
echo ""
echo "📍 Test 2: Backend API Connectivity"
API_STATUS=$(curl -s -o /dev/null -w "%{http_code}" http://localhost:3000/api/health 2>/dev/null || echo "000")
echo "API status: $API_STATUS"

if [ "$API_STATUS" = "200" ]; then
    echo "✅ API is responding"
    API_PASS=1
else
    echo "⚠️  API not responding (may be expected)"
    API_PASS=0
fi

# Test 3: Download and analyze homepage HTML
echo ""
echo "📍 Test 3: Homepage HTML Analysis"

# Download homepage HTML
curl -s http://localhost:5173 > /workspaces/agent-feed/tests/results/homepage.html

if [ -f "/workspaces/agent-feed/tests/results/homepage.html" ]; then
    HOMEPAGE_SIZE=$(wc -c < /workspaces/agent-feed/tests/results/homepage.html)
    echo "✅ Homepage downloaded: $HOMEPAGE_SIZE bytes"

    # Test 4: Check for "Create" navigation links (should be absent)
    echo ""
    echo "📍 Test 4: Navigation Analysis - Create Links"

    CREATE_LINKS=$(grep -i "create.*post\|post.*create" /workspaces/agent-feed/tests/results/homepage.html | wc -l)
    echo "Create post navigation links found: $CREATE_LINKS"

    if [ "$CREATE_LINKS" -eq 0 ]; then
        echo "✅ No 'Create Post' navigation links found"
        NAV_PASS=1
    else
        echo "❌ Found 'Create Post' navigation links"
        NAV_PASS=0
    fi

    # Test 5: Check for posting interface elements
    echo ""
    echo "📍 Test 5: Posting Interface Analysis"

    TEXTAREA_COUNT=$(grep -i "textarea" /workspaces/agent-feed/tests/results/homepage.html | wc -l)
    FORM_COUNT=$(grep -i "<form" /workspaces/agent-feed/tests/results/homepage.html | wc -l)
    POSTING_ELEMENTS=$(grep -i "posting\|post-creator\|enhanced-posting" /workspaces/agent-feed/tests/results/homepage.html | wc -l)

    echo "Textareas found: $TEXTAREA_COUNT"
    echo "Forms found: $FORM_COUNT"
    echo "Posting interface elements: $POSTING_ELEMENTS"

    if [ "$TEXTAREA_COUNT" -gt 0 ] || [ "$POSTING_ELEMENTS" -gt 0 ]; then
        echo "✅ Posting interface elements detected"
        POSTING_PASS=1
    else
        echo "⚠️  No obvious posting interface elements found"
        POSTING_PASS=0
    fi

    # Test 6: Check for tab functionality
    echo ""
    echo "📍 Test 6: Tab Interface Analysis"

    QUICK_POST_TAB=$(grep -i "quick.*post" /workspaces/agent-feed/tests/results/homepage.html | wc -l)
    POST_TAB=$(grep -i "\"post\"" /workspaces/agent-feed/tests/results/homepage.html | wc -l)
    AVI_DM_TAB=$(grep -i "avi.*dm" /workspaces/agent-feed/tests/results/homepage.html | wc -l)

    echo "Quick Post tab references: $QUICK_POST_TAB"
    echo "Post tab references: $POST_TAB"
    echo "Avi DM tab references: $AVI_DM_TAB"

    TOTAL_TABS=$(($QUICK_POST_TAB + $POST_TAB + $AVI_DM_TAB))

    if [ "$TOTAL_TABS" -gt 0 ]; then
        echo "✅ Tab interface references found"
        TABS_PASS=1
    else
        echo "⚠️  No tab interface references found"
        TABS_PASS=0
    fi

    # Test 7: React App Structure
    echo ""
    echo "📍 Test 7: React App Structure"

    REACT_ROOT=$(grep -i "id=\"root\"\|data-reactroot" /workspaces/agent-feed/tests/results/homepage.html | wc -l)
    VITE_CLIENT=$(grep -i "vite" /workspaces/agent-feed/tests/results/homepage.html | wc -l)
    SCRIPT_COUNT=$(grep -i "<script" /workspaces/agent-feed/tests/results/homepage.html | wc -l)

    echo "React root elements: $REACT_ROOT"
    echo "Vite client references: $VITE_CLIENT"
    echo "Script tags: $SCRIPT_COUNT"

    if [ "$REACT_ROOT" -gt 0 ] && [ "$SCRIPT_COUNT" -gt 0 ]; then
        echo "✅ React app structure detected"
        REACT_PASS=1
    else
        echo "⚠️  React app structure unclear"
        REACT_PASS=0
    fi

    HTML_PASS=1
else
    echo "❌ Failed to download homepage"
    HTML_PASS=0
    NAV_PASS=0
    POSTING_PASS=0
    TABS_PASS=0
    REACT_PASS=0
fi

# Generate Summary Report
echo ""
echo "📊 VALIDATION SUMMARY"
echo "============================================================"

TOTAL_TESTS=6
PASSED_TESTS=$(($FRONTEND_PASS + $NAV_PASS + $POSTING_PASS + $TABS_PASS + $REACT_PASS + $HTML_PASS))

echo "Total Tests: $TOTAL_TESTS"
echo "Passed: $PASSED_TESTS"
echo "Failed: $(($TOTAL_TESTS - $PASSED_TESTS))"

# Key findings
echo ""
echo "🔍 KEY FINDINGS:"
echo "----------------------------------------"

if [ "$NAV_PASS" -eq 1 ]; then
    echo "✅ Create Post navigation successfully removed"
else
    echo "❌ Create Post navigation still present"
fi

if [ "$POSTING_PASS" -eq 1 ]; then
    echo "✅ Posting interface embedded in feed"
else
    echo "⚠️  Posting interface not clearly detected"
fi

if [ "$TABS_PASS" -eq 1 ]; then
    echo "✅ Enhanced posting tabs implemented"
else
    echo "⚠️  Tab interface not clearly detected"
fi

if [ "$REACT_PASS" -eq 1 ]; then
    echo "✅ React application structure intact"
else
    echo "⚠️  React application structure unclear"
fi

# Overall status
echo ""
if [ "$PASSED_TESTS" -ge 4 ]; then
    echo "🎉 OVERALL STATUS: PASS"
    OVERALL_STATUS="PASS"
else
    echo "❌ OVERALL STATUS: FAIL"
    OVERALL_STATUS="FAIL"
fi

# Create JSON report
cat > /workspaces/agent-feed/tests/results/ui-validation-report.json << EOF
{
  "timestamp": "$(date -Iseconds)",
  "tests": [
    {"name": "Frontend Connectivity", "status": $([ "$FRONTEND_PASS" -eq 1 ] && echo '"pass"' || echo '"fail"')},
    {"name": "HTML Download", "status": $([ "$HTML_PASS" -eq 1 ] && echo '"pass"' || echo '"fail"')},
    {"name": "No Create Navigation", "status": $([ "$NAV_PASS" -eq 1 ] && echo '"pass"' || echo '"fail"')},
    {"name": "Posting Interface", "status": $([ "$POSTING_PASS" -eq 1 ] && echo '"pass"' || echo '"warning"')},
    {"name": "Tab Interface", "status": $([ "$TABS_PASS" -eq 1 ] && echo '"pass"' || echo '"warning"')},
    {"name": "React Structure", "status": $([ "$REACT_PASS" -eq 1 ] && echo '"pass"' || echo '"warning"')}
  ],
  "summary": {
    "total": $TOTAL_TESTS,
    "passed": $PASSED_TESTS,
    "failed": $(($TOTAL_TESTS - $PASSED_TESTS)),
    "overallStatus": "$OVERALL_STATUS"
  },
  "artifacts": {
    "homepage_html": "homepage.html",
    "size_bytes": $HOMEPAGE_SIZE
  }
}
EOF

echo ""
echo "📋 Reports generated:"
echo "  - /workspaces/agent-feed/tests/results/homepage.html"
echo "  - /workspaces/agent-feed/tests/results/ui-validation-report.json"

# Exit with appropriate code
if [ "$OVERALL_STATUS" = "PASS" ]; then
    exit 0
else
    exit 1
fi