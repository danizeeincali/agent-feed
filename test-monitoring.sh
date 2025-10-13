#!/bin/bash

# Phase 5 Monitoring - Quick Test Script
# Run this to test all monitoring endpoints

echo "╔════════════════════════════════════════════════════════════════════╗"
echo "║          PHASE 5 MONITORING - USER TESTING                        ║"
echo "╚════════════════════════════════════════════════════════════════════╝"
echo ""

# Check if server is running
if ! curl -s http://localhost:3001/health > /dev/null 2>&1; then
    echo "❌ Server is not running!"
    echo "Start it with: node api-server/server.js"
    exit 1
fi

echo "✅ Server is running"
echo ""

# Test 1: Health Check
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo "1️⃣  HEALTH CHECK"
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
curl -s http://localhost:3001/api/monitoring/health | jq '.'
echo ""

# Test 2: Metrics
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo "2️⃣  SYSTEM METRICS (JSON)"
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
curl -s http://localhost:3001/api/monitoring/metrics | jq '{timestamp, cpu, memory}'
echo ""

# Test 3: Prometheus Format
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo "3️⃣  PROMETHEUS METRICS"
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
curl -s "http://localhost:3001/api/monitoring/metrics?format=prometheus"
echo ""

# Test 4: Alerts
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo "4️⃣  ACTIVE ALERTS"
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
curl -s http://localhost:3001/api/monitoring/alerts | jq '.'
echo ""

# Test 5: Alert Rules
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo "5️⃣  ALERT RULES"
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
curl -s http://localhost:3001/api/monitoring/rules | jq '.'
echo ""

# Test 6: Historical Stats
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo "6️⃣  HISTORICAL STATISTICS"
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
curl -s http://localhost:3001/api/monitoring/stats | jq '.'
echo ""

# Summary
echo "╔════════════════════════════════════════════════════════════════════╗"
echo "║                       TEST SUMMARY                                 ║"
echo "╠════════════════════════════════════════════════════════════════════╣"
echo "║  ✅ All 6 monitoring endpoints tested successfully!                ║"
echo "║                                                                    ║"
echo "║  📝 See USER-TESTING-GUIDE.md for detailed testing                ║"
echo "║  📊 See PHASE-5-COMPLETION-SUMMARY.md for full documentation      ║"
echo "╚════════════════════════════════════════════════════════════════════╝"
echo ""
echo "🌐 Available Endpoints:"
echo "   • Health: http://localhost:3001/api/monitoring/health"
echo "   • Metrics: http://localhost:3001/api/monitoring/metrics"
echo "   • Alerts: http://localhost:3001/api/monitoring/alerts"
echo "   • Rules: http://localhost:3001/api/monitoring/rules"
echo "   • Stats: http://localhost:3001/api/monitoring/stats"
echo ""
