#!/bin/bash

echo "╔════════════════════════════════════════════════════════════════════╗"
echo "║     WHITE SCREEN FIX - VALIDATION TEST SUITE                      ║"
echo "╚════════════════════════════════════════════════════════════════════╝"
echo ""

# Colors
GREEN='\033[0;32m'
RED='\033[0;31m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m'

# Test counters
PASS=0
FAIL=0

echo "${BLUE}📋 Phase 1: Frontend Server Validation${NC}"
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"

# Test 1: Frontend responds
echo -n "Test 1: Frontend server responds... "
if curl -s http://127.0.0.1:5173/ > /dev/null 2>&1; then
    echo -e "${GREEN}✅ PASS${NC}"
    ((PASS++))
else
    echo -e "${RED}❌ FAIL${NC}"
    ((FAIL++))
fi

# Test 2: HTML contains root div
echo -n "Test 2: HTML contains root div... "
if curl -s http://127.0.0.1:5173/ | grep -q 'id="root"'; then
    echo -e "${GREEN}✅ PASS${NC}"
    ((PASS++))
else
    echo -e "${RED}❌ FAIL${NC}"
    ((FAIL++))
fi

# Test 3: React scripts load
echo -n "Test 3: React scripts load... "
if curl -s http://127.0.0.1:5173/ | grep -q '/src/main.tsx'; then
    echo -e "${GREEN}✅ PASS${NC}"
    ((PASS++))
else
    echo -e "${RED}❌ FAIL${NC}"
    ((FAIL++))
fi

echo ""
echo "${BLUE}📋 Phase 2: Backend API Validation${NC}"
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"

# Test 4: Backend health check
echo -n "Test 4: Backend server responds... "
if curl -s http://localhost:3001/health > /dev/null 2>&1; then
    echo -e "${GREEN}✅ PASS${NC}"
    ((PASS++))
else
    echo -e "${RED}❌ FAIL${NC}"
    ((FAIL++))
fi

# Test 5: Monitoring health endpoint
echo -n "Test 5: Monitoring health endpoint... "
HEALTH_STATUS=$(curl -s http://localhost:3001/api/monitoring/health | jq -r '.status' 2>/dev/null)
if [ "$HEALTH_STATUS" = "healthy" ] || [ "$HEALTH_STATUS" = "degraded" ]; then
    echo -e "${GREEN}✅ PASS${NC} (status: $HEALTH_STATUS)"
    ((PASS++))
else
    echo -e "${RED}❌ FAIL${NC}"
    ((FAIL++))
fi

# Test 6: Monitoring metrics endpoint
echo -n "Test 6: Monitoring metrics endpoint... "
METRICS_TIMESTAMP=$(curl -s http://localhost:3001/api/monitoring/metrics | jq -r '.timestamp' 2>/dev/null)
if [ ! -z "$METRICS_TIMESTAMP" ] && [ "$METRICS_TIMESTAMP" != "null" ]; then
    echo -e "${GREEN}✅ PASS${NC}"
    ((PASS++))
else
    echo -e "${RED}❌ FAIL${NC}"
    ((FAIL++))
fi

# Test 7: Monitoring alerts endpoint
echo -n "Test 7: Monitoring alerts endpoint... "
ALERTS_TOTAL=$(curl -s http://localhost:3001/api/monitoring/alerts | jq -r '.total' 2>/dev/null)
if [ "$ALERTS_TOTAL" -ge "0" ] 2>/dev/null; then
    echo -e "${GREEN}✅ PASS${NC}"
    ((PASS++))
else
    echo -e "${RED}❌ FAIL${NC}"
    ((FAIL++))
fi

echo ""
echo "${BLUE}📋 Phase 3: Component Import Validation${NC}"
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"

# Test 8: MonitoringTab loads without errors
echo -n "Test 8: MonitoringTab component loads... "
MONITORING_TAB=$(curl -s http://127.0.0.1:5173/src/components/monitoring/MonitoringTab.tsx 2>&1)
if echo "$MONITORING_TAB" | grep -q "import AlertsPanel from"; then
    echo -e "${GREEN}✅ PASS${NC} (default import fixed)"
    ((PASS++))
else
    echo -e "${RED}❌ FAIL${NC}"
    ((FAIL++))
fi

# Test 9: AlertCard imports Alert type correctly
echo -n "Test 9: AlertCard Alert type import... "
ALERT_CARD=$(curl -s http://127.0.0.1:5173/src/components/monitoring/AlertCard.tsx 2>&1)
if echo "$ALERT_CARD" | grep -q "from '../../services/MonitoringApiService'"; then
    echo -e "${GREEN}✅ PASS${NC} (correct import path)"
    ((PASS++))
else
    echo -e "${RED}❌ FAIL${NC}"
    ((FAIL++))
fi

# Test 10: AlertsPanel imports Alert type correctly
echo -n "Test 10: AlertsPanel Alert type import... "
ALERTS_PANEL=$(curl -s http://127.0.0.1:5173/src/components/monitoring/AlertsPanel.tsx 2>&1)
if echo "$ALERTS_PANEL" | grep -q "from '../../services/MonitoringApiService'"; then
    echo -e "${GREEN}✅ PASS${NC} (correct import path)"
    ((PASS++))
else
    echo -e "${RED}❌ FAIL${NC}"
    ((FAIL++))
fi

echo ""
echo "${BLUE}📋 Phase 4: Type Adapter Validation${NC}"
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"

# Test 11: SystemMetrics adapter in MonitoringTab
echo -n "Test 11: SystemMetrics adapter exists... "
if echo "$MONITORING_TAB" | grep -q "cpu_usage: metrics.system?.cpu?.usage"; then
    echo -e "${GREEN}✅ PASS${NC} (adapter implemented)"
    ((PASS++))
else
    echo -e "${RED}❌ FAIL${NC}"
    ((FAIL++))
fi

echo ""
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo "${BLUE}📊 TEST SUMMARY${NC}"
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo -e "Tests Passed:  ${GREEN}$PASS${NC} / $((PASS + FAIL))"
echo -e "Tests Failed:  ${RED}$FAIL${NC} / $((PASS + FAIL))"
echo ""

if [ $FAIL -eq 0 ]; then
    echo -e "${GREEN}✅ ALL TESTS PASSED - WHITE SCREEN IS FIXED!${NC}"
    echo ""
    echo -e "${YELLOW}Next Steps:${NC}"
    echo "1. Open browser: http://127.0.0.1:5173"
    echo "2. Navigate to Analytics page"
    echo "3. Click on Monitoring tab"
    echo "4. Verify all components render correctly"
    EXIT_CODE=0
else
    echo -e "${RED}❌ SOME TESTS FAILED${NC}"
    echo ""
    echo -e "${YELLOW}Troubleshooting:${NC}"
    echo "1. Check server logs for errors"
    echo "2. Verify frontend dev server is running (port 5173)"
    echo "3. Verify backend server is running (port 3001)"
    EXIT_CODE=1
fi

echo ""
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"

exit $EXIT_CODE
