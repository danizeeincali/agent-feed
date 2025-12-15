#!/bin/bash

echo "=========================================="
echo "TokenAnalyticsDashboard Lazy Import Fix Verification"
echo "=========================================="
echo ""

# Colors for output
GREEN='\033[0;32m'
RED='\033[0;31m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

echo "Step 1: Checking if dev server is running..."
if curl -s -o /dev/null -w "%{http_code}" http://127.0.0.1:5173/ | grep -q "200"; then
    echo -e "${GREEN}✓ Dev server is running${NC}"
else
    echo -e "${RED}✗ Dev server is NOT running${NC}"
    echo "Please start the dev server with: npm run dev"
    exit 1
fi

echo ""
echo "Step 2: Testing if TokenAnalyticsDashboard.tsx can be loaded..."
HTTP_CODE=$(curl -s -o /dev/null -w "%{http_code}" http://127.0.0.1:5173/src/components/TokenAnalyticsDashboard.tsx)
if [ "$HTTP_CODE" = "200" ]; then
    echo -e "${GREEN}✓ TokenAnalyticsDashboard.tsx is accessible${NC}"
else
    echo -e "${RED}✗ TokenAnalyticsDashboard.tsx returned HTTP $HTTP_CODE${NC}"
    exit 1
fi

echo ""
echo "Step 3: Verifying lazy import syntax in RealAnalytics.tsx..."
if grep -q "import('./TokenAnalyticsDashboard.tsx')" /workspaces/agent-feed/frontend/src/components/RealAnalytics.tsx; then
    echo -e "${GREEN}✓ RealAnalytics.tsx uses explicit .tsx extension${NC}"
else
    echo -e "${RED}✗ RealAnalytics.tsx missing .tsx extension${NC}"
    exit 1
fi

echo ""
echo "Step 4: Verifying lazy import syntax in test-lazy-import.tsx..."
if grep -q "import('./TokenAnalyticsDashboard.tsx')" /workspaces/agent-feed/frontend/src/test-lazy-import.tsx; then
    echo -e "${GREEN}✓ test-lazy-import.tsx uses explicit .tsx extension${NC}"
else
    echo -e "${RED}✗ test-lazy-import.tsx missing .tsx extension${NC}"
    exit 1
fi

echo ""
echo "Step 5: Verifying lazy import syntax in LazyTokenAnalyticsDashboard.tsx..."
if grep -q "import('./TokenAnalyticsDashboard.tsx')" /workspaces/agent-feed/frontend/src/components/LazyTokenAnalyticsDashboard.tsx; then
    echo -e "${GREEN}✓ LazyTokenAnalyticsDashboard.tsx uses explicit .tsx extension${NC}"
else
    echo -e "${RED}✗ LazyTokenAnalyticsDashboard.tsx missing .tsx extension${NC}"
    exit 1
fi

echo ""
echo "Step 6: Checking Vite logs for errors..."
if tail -50 /tmp/vite-dev.log 2>&1 | grep -qi "error.*TokenAnalytics"; then
    echo -e "${RED}✗ Errors found in Vite logs related to TokenAnalyticsDashboard${NC}"
    tail -50 /tmp/vite-dev.log | grep -i "error"
    exit 1
else
    echo -e "${GREEN}✓ No errors in Vite logs${NC}"
fi

echo ""
echo "Step 7: Testing main app page..."
HTTP_CODE=$(curl -s -o /dev/null -w "%{http_code}" http://127.0.0.1:5173/)
if [ "$HTTP_CODE" = "200" ]; then
    echo -e "${GREEN}✓ Main app page loads successfully${NC}"
else
    echo -e "${RED}✗ Main app page returned HTTP $HTTP_CODE${NC}"
    exit 1
fi

echo ""
echo "=========================================="
echo -e "${GREEN}✓ ALL VERIFICATION CHECKS PASSED!${NC}"
echo "=========================================="
echo ""
echo "Summary of Fix Applied:"
echo "  - Fix Attempt: #1 (Add explicit .tsx extension)"
echo "  - Files Modified:"
echo "    1. /workspaces/agent-feed/frontend/src/components/RealAnalytics.tsx"
echo "    2. /workspaces/agent-feed/frontend/src/test-lazy-import.tsx"
echo "    3. /workspaces/agent-feed/frontend/src/components/LazyTokenAnalyticsDashboard.tsx"
echo ""
echo "  - Change Applied:"
echo "    FROM: lazy(() => import('./TokenAnalyticsDashboard'))"
echo "    TO:   lazy(() => import('./TokenAnalyticsDashboard.tsx'))"
echo ""
echo "Root Cause:"
echo "  Vite's dynamic import resolution requires explicit file extensions"
echo "  for TypeScript files when using React.lazy(). This is due to"
echo "  Vite's ESM-based module resolution which differs from Webpack."
echo ""
echo "Next Steps:"
echo "  1. Navigate to http://127.0.0.1:5173/analytics?tab=claude-sdk"
echo "  2. Verify the Analytics tab loads without errors"
echo "  3. Check browser console for any import errors"
echo ""
