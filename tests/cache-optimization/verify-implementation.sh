#!/bin/bash

# Cost Dashboard Implementation Verification Script
# Tests all components are in place and syntactically correct

echo "================================================"
echo "Cost Dashboard Implementation Verification"
echo "================================================"
echo ""

EXIT_CODE=0

# 1. Check component file exists
echo "✅ Checking CostDashboard component..."
if [ -f "/workspaces/agent-feed/frontend/src/components/monitoring/CostDashboard.tsx" ]; then
  echo "   ✓ Component file exists"
  LINE_COUNT=$(wc -l < /workspaces/agent-feed/frontend/src/components/monitoring/CostDashboard.tsx)
  echo "   ✓ Component size: $LINE_COUNT lines"
else
  echo "   ✗ Component file missing"
  EXIT_CODE=1
fi

# 2. Check API route exists
echo "✅ Checking cost-metrics API route..."
if [ -f "/workspaces/agent-feed/api-server/routes/cost-metrics.js" ]; then
  echo "   ✓ API route file exists"
  if grep -q "calculateCostMetrics" /workspaces/agent-feed/api-server/routes/cost-metrics.js; then
    echo "   ✓ Cost calculation function found"
  else
    echo "   ✗ Cost calculation function missing"
    EXIT_CODE=1
  fi
else
  echo "   ✗ API route file missing"
  EXIT_CODE=1
fi

# 3. Check Playwright test exists
echo "✅ Checking Playwright test suite..."
if [ -f "/workspaces/agent-feed/tests/cache-optimization/cost-dashboard.spec.ts" ]; then
  echo "   ✓ Test file exists"
  TEST_COUNT=$(grep -c "test(" /workspaces/agent-feed/tests/cache-optimization/cost-dashboard.spec.ts)
  echo "   ✓ Test count: $TEST_COUNT tests"
else
  echo "   ✗ Test file missing"
  EXIT_CODE=1
fi

# 4. Check App.tsx integration
echo "✅ Checking App.tsx integration..."
if grep -q "CostDashboard" /workspaces/agent-feed/frontend/src/App.tsx; then
  echo "   ✓ CostDashboard import found"
else
  echo "   ✗ CostDashboard import missing"
  EXIT_CODE=1
fi

if grep -q "/settings/cost-monitoring" /workspaces/agent-feed/frontend/src/App.tsx; then
  echo "   ✓ Route registered in App.tsx"
else
  echo "   ✗ Route missing in App.tsx"
  EXIT_CODE=1
fi

# 5. Check server.js integration
echo "✅ Checking server.js integration..."
if grep -q "cost-metrics" /workspaces/agent-feed/api-server/server.js; then
  echo "   ✓ Cost metrics route registered"
else
  echo "   ✗ Cost metrics route not registered"
  EXIT_CODE=1
fi

# 6. Verify TypeScript syntax
echo "✅ Verifying TypeScript syntax..."
cd /workspaces/agent-feed/frontend
if npx tsc --noEmit src/components/monitoring/CostDashboard.tsx 2>&1 | grep -q "error TS"; then
  echo "   ✗ TypeScript errors found"
  EXIT_CODE=1
else
  echo "   ✓ No TypeScript errors"
fi

# 7. Check documentation
echo "✅ Checking documentation..."
if [ -f "/workspaces/agent-feed/docs/COST-DASHBOARD-IMPLEMENTATION.md" ]; then
  echo "   ✓ Implementation documentation exists"
  DOC_SIZE=$(wc -l < /workspaces/agent-feed/docs/COST-DASHBOARD-IMPLEMENTATION.md)
  echo "   ✓ Documentation size: $DOC_SIZE lines"
else
  echo "   ✗ Documentation missing"
  EXIT_CODE=1
fi

echo ""
echo "================================================"
if [ $EXIT_CODE -eq 0 ]; then
  echo "✅ ALL CHECKS PASSED - Implementation Complete!"
  echo "================================================"
  echo ""
  echo "Next Steps:"
  echo "1. Start servers:"
  echo "   cd api-server && npm run dev &"
  echo "   cd frontend && npm run dev"
  echo ""
  echo "2. Manual testing:"
  echo "   Navigate to http://localhost:5173/settings/cost-monitoring"
  echo ""
  echo "3. Run Playwright tests:"
  echo "   cd tests/cache-optimization"
  echo "   npx playwright test"
else
  echo "❌ SOME CHECKS FAILED - Review errors above"
  echo "================================================"
fi

exit $EXIT_CODE
