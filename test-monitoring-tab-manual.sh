#!/bin/bash

echo "╔════════════════════════════════════════════════════════════════════╗"
echo "║          PHASE 5 MONITORING TAB - MANUAL VALIDATION               ║"
echo "╚════════════════════════════════════════════════════════════════════╝"
echo ""

# Colors
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
RED='\033[0;31m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Test Results
PASS=0
FAIL=0

echo "${BLUE}📋 Testing Phase 5 Monitoring APIs...${NC}"
echo ""

# Test 1: Health Endpoint
echo "${YELLOW}Test 1: Health Endpoint${NC}"
HEALTH_RESPONSE=$(curl -s http://localhost:3001/api/monitoring/health)
HEALTH_STATUS=$(echo $HEALTH_RESPONSE | jq -r '.status' 2>/dev/null)

if [ "$HEALTH_STATUS" = "healthy" ] || [ "$HEALTH_STATUS" = "degraded" ]; then
    echo "${GREEN}✅ PASS${NC} - Health endpoint returns valid status: $HEALTH_STATUS"
    ((PASS++))
else
    echo "${RED}❌ FAIL${NC} - Health endpoint returned: $HEALTH_STATUS"
    ((FAIL++))
fi
echo ""

# Test 2: Metrics Endpoint
echo "${YELLOW}Test 2: Metrics Endpoint (JSON)${NC}"
METRICS_RESPONSE=$(curl -s http://localhost:3001/api/monitoring/metrics)
METRICS_TIMESTAMP=$(echo $METRICS_RESPONSE | jq -r '.timestamp' 2>/dev/null)

if [ ! -z "$METRICS_TIMESTAMP" ] && [ "$METRICS_TIMESTAMP" != "null" ]; then
    echo "${GREEN}✅ PASS${NC} - Metrics endpoint returns valid data (timestamp: $METRICS_TIMESTAMP)"
    ((PASS++))
else
    echo "${RED}❌ FAIL${NC} - Metrics endpoint did not return valid JSON"
    ((FAIL++))
fi
echo ""

# Test 3: Prometheus Format
echo "${YELLOW}Test 3: Prometheus Metrics Format${NC}"
PROM_RESPONSE=$(curl -s "http://localhost:3001/api/monitoring/metrics?format=prometheus")

if [ ! -z "$PROM_RESPONSE" ]; then
    echo "${GREEN}✅ PASS${NC} - Prometheus format endpoint returns data"
    ((PASS++))
else
    echo "${RED}❌ FAIL${NC} - Prometheus format endpoint failed"
    ((FAIL++))
fi
echo ""

# Test 4: Alerts Endpoint
echo "${YELLOW}Test 4: Alerts Endpoint${NC}"
ALERTS_RESPONSE=$(curl -s http://localhost:3001/api/monitoring/alerts)
ALERTS_TOTAL=$(echo $ALERTS_RESPONSE | jq -r '.total' 2>/dev/null)

if [ "$ALERTS_TOTAL" = "0" ] || [ "$ALERTS_TOTAL" -ge "0" ] 2>/dev/null; then
    echo "${GREEN}✅ PASS${NC} - Alerts endpoint returns valid response (total: $ALERTS_TOTAL)"
    ((PASS++))
else
    echo "${RED}❌ FAIL${NC} - Alerts endpoint did not return valid data"
    ((FAIL++))
fi
echo ""

# Test 5: Historical Stats
echo "${YELLOW}Test 5: Historical Stats Endpoint${NC}"
STATS_RESPONSE=$(curl -s http://localhost:3001/api/monitoring/stats)
STATS_DATAPOINTS=$(echo $STATS_RESPONSE | jq -r '.dataPoints' 2>/dev/null)

if [ "$STATS_DATAPOINTS" -ge "0" ] 2>/dev/null; then
    echo "${GREEN}✅ PASS${NC} - Stats endpoint returns valid response (dataPoints: $STATS_DATAPOINTS)"
    ((PASS++))
else
    echo "${RED}❌ FAIL${NC} - Stats endpoint did not return valid data"
    ((FAIL++))
fi
echo ""

# Test 6: Alert Rules
echo "${YELLOW}Test 6: Alert Rules Endpoint${NC}"
RULES_RESPONSE=$(curl -s http://localhost:3001/api/monitoring/rules)
RULES_TOTAL=$(echo $RULES_RESPONSE | jq -r '.total' 2>/dev/null)

if [ "$RULES_TOTAL" -ge "0" ] 2>/dev/null; then
    echo "${GREEN}✅ PASS${NC} - Rules endpoint returns valid response (total: $RULES_TOTAL)"
    ((PASS++))
else
    echo "${RED}❌ FAIL${NC} - Rules endpoint did not return valid data"
    ((FAIL++))
fi
echo ""

# Summary
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo "${BLUE}📊 API TEST SUMMARY${NC}"
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo "Tests Passed:  ${GREEN}$PASS${NC}"
echo "Tests Failed:  ${RED}$FAIL${NC}"
echo "Total Tests:   $((PASS + FAIL))"
echo ""

if [ $FAIL -eq 0 ]; then
    echo "${GREEN}✅ ALL API TESTS PASSED${NC}"
    EXIT_CODE=0
else
    echo "${RED}❌ SOME TESTS FAILED${NC}"
    EXIT_CODE=1
fi

echo ""
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo "${BLUE}🌐 FRONTEND VALIDATION${NC}"
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo ""
echo "${YELLOW}To manually test the Monitoring Tab UI:${NC}"
echo ""
echo "1. Open browser to: ${BLUE}http://localhost:5173${NC}"
echo "2. Click on ${YELLOW}Analytics${NC} in the sidebar"
echo "3. Click on the ${YELLOW}Monitoring${NC} tab (with Activity icon)"
echo "4. Verify you see:"
echo "   • Health Status Card (green/yellow/red badge)"
echo "   • 6 Metric Cards (CPU, Memory, Workers, Queue, Request Rate, Error Rate)"
echo "   • 4 Charts (CPU History, Memory History, Queue Depth, Active Workers)"
echo "   • Alerts Panel with filters"
echo "   • Refresh Controls (auto-refresh toggle + manual refresh button)"
echo ""
echo "5. Test Refresh:"
echo "   • Click ${YELLOW}Refresh${NC} button"
echo "   • Verify timestamp updates"
echo "   • Toggle ${YELLOW}Auto-refresh${NC}"
echo "   • Change interval (5s, 10s, 30s, 1m, 5m)"
echo ""
echo "6. Test Direct URL Navigation:"
echo "   • Navigate to: ${BLUE}http://localhost:5173/analytics?tab=monitoring${NC}"
echo "   • Verify Monitoring tab is pre-selected"
echo ""
echo "7. Check Console:"
echo "   • Press F12 to open DevTools"
echo "   • Check Console tab for errors"
echo "   • Check Network tab to verify API calls:"
echo "     - ${BLUE}GET /api/monitoring/health${NC}"
echo "     - ${BLUE}GET /api/monitoring/metrics${NC}"
echo "     - ${BLUE}GET /api/monitoring/alerts${NC}"
echo "     - ${BLUE}GET /api/monitoring/stats${NC}"
echo ""
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo "${BLUE}📋 FUNCTIONALITY CHECKLIST${NC}"
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo ""
echo "[ ] Tab Navigation Works"
echo "[ ] Health Status Card Displays"
echo "[ ] All 6 Metric Cards Render"
echo "[ ] All 4 Charts Display"
echo "[ ] Alerts Panel Shows"
echo "[ ] Refresh Button Works"
echo "[ ] Auto-Refresh Toggle Works"
echo "[ ] Interval Selector Works"
echo "[ ] API Calls Succeed (check Network tab)"
echo "[ ] No Console Errors"
echo "[ ] Dark Mode Support (if enabled)"
echo "[ ] Responsive Layout (resize browser)"
echo "[ ] Direct URL Navigation Works"
echo ""

echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo ""

exit $EXIT_CODE
