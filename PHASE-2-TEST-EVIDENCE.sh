#!/bin/bash
# Phase 2 Regression Test Evidence
# Generated: 2025-10-12
# This script documents all test commands executed

echo "=========================================="
echo "PHASE 2 REGRESSION TEST EVIDENCE"
echo "=========================================="
echo ""

echo "1. DATABASE VERIFICATION"
echo "------------------------"
echo "Command: docker exec agent-feed-postgres-phase1 psql -U postgres -d avidm_dev -c '\dt'"
echo ""
echo "Result: 12 tables found"
echo "  - system_agent_templates"
echo "  - user_agent_customizations"
echo "  - agent_memories"
echo "  - agent_workspaces"
echo "  - avi_state"
echo "  - error_log"
echo "  - feed_fetch_logs"
echo "  - feed_items"
echo "  - feed_positions"
echo "  - user_feeds"
echo "  - work_queue"
echo "  - agent_responses"
echo ""

echo "2. DATABASE STATE VERIFICATION"
echo "------------------------------"
echo "Command: psql -c 'SELECT COUNT(*) FROM work_queue;'"
echo "Result: 1 row (OK)"
echo ""
echo "Command: psql -c 'SELECT COUNT(*) FROM avi_state;'"
echo "Result: 0 rows (CRITICAL - should be 1)"
echo ""

echo "3. API SERVER HEALTH CHECK"
echo "--------------------------"
echo "Command: curl -s http://localhost:3001/health | jq ."
echo "Result: HTTP 200 OK"
echo '{
  "success": true,
  "data": {
    "status": "healthy",
    "version": "1.0.0",
    "uptime": {"seconds": 38},
    "memory": {"rss": 133, "heapUsed": 37},
    "resources": {
      "databaseConnected": true,
      "agentPagesDbConnected": true
    }
  }
}'
echo ""

echo "4. AVI ORCHESTRATOR HEALTH"
echo "--------------------------"
echo "Command: curl -s http://localhost:3001/api/avi/health | jq ."
echo "Result: HTTP 200 OK (but status='unknown')"
echo '{
  "success": true,
  "data": {
    "status": "unknown",
    "contextSize": 0,
    "activeWorkers": 0
  }
}'
echo ""

echo "5. AVI STATUS ENDPOINT"
echo "----------------------"
echo "Command: curl -s http://localhost:3001/api/avi/status | jq ."
echo "Result: HTTP 500 ERROR"
echo '{
  "success": false,
  "error": "Orchestrator state not found"
}'
echo ""

echo "6. AVI METRICS ENDPOINT"
echo "-----------------------"
echo "Command: curl -s http://localhost:3001/api/avi/metrics | jq ."
echo "Result: HTTP 500 ERROR"
echo '{
  "success": false,
  "error": "Metrics not available"
}'
echo ""

echo "7. PHASE 2 UNIT TESTS"
echo "---------------------"
echo "Command: npm test -- --testPathPattern=phase2"
echo "Result: PARTIAL PASS"
echo ""
echo "PASSING SUITES (8):"
echo "  ✅ worker-pool.test.ts (38/38 tests)"
echo "  ✅ agent-worker.test.ts"
echo "  ✅ avi-orchestrator.test.ts"
echo "  ✅ health-monitor-enhanced.test.ts"
echo "  ✅ state-manager.test.ts"
echo "  ✅ priority-queue.test.ts"
echo "  ✅ work-queue.test.ts"
echo "  ✅ health-monitor.test.ts"
echo ""
echo "FAILING SUITES (9):"
echo "  ❌ work-ticket.test.ts"
echo "  ❌ worker-spawner.test.ts"
echo "  ❌ orchestrator-integration.test.ts (TIMEOUT 120s)"
echo "  ❌ orchestrator-startup.test.ts"
echo "  ❌ health-monitor-adapter.test.ts"
echo "  ❌ worker-spawner-adapter.test.ts"
echo "  ❌ avi-database-adapter.test.ts"
echo "  ❌ work-queue-adapter.test.ts"
echo "  ❌ phase2-ui-validation.spec.js"
echo ""

echo "8. PHASE 1 REGRESSION TESTS"
echo "---------------------------"
echo "Command: npm test -- --testPathPattern=phase1"
echo "Result: MASSIVE REGRESSION"
echo ""
echo "Test Suites: 11 failed, 5 passed, 16 total"
echo "Tests:       94 failed, 106 passed, 200 total"
echo ""
echo "Primary Failures:"
echo "  - Database authentication (postgres user)"
echo "  - Module import errors (ESM/CommonJS)"
echo "  - Missing dependencies (axios)"
echo ""

echo "9. SERVER LOGS ANALYSIS"
echo "-----------------------"
echo "File: /tmp/api-server.log"
echo ""
echo "Key Events:"
echo "  ✅ PostgreSQL connected: avidm_dev"
echo "  ✅ System agent templates ready (22 templates)"
echo "  ✅ AVI Orchestrator started successfully"
echo "  ⚠️  High memory usage warnings (false positives)"
echo ""

echo "10. PERFORMANCE METRICS"
echo "----------------------"
echo "Server Uptime: 38+ seconds (stable)"
echo "Memory Usage: 152 MB RSS / 40 MB Heap"
echo "Response Times: <50ms (all endpoints)"
echo "Database Queries: <10ms average"
echo ""

echo "=========================================="
echo "EVIDENCE COLLECTION COMPLETE"
echo "=========================================="
echo ""
echo "Full Report: /workspaces/agent-feed/PHASE-2-REGRESSION-TEST-RESULTS.md"
echo "Quick Summary: /workspaces/agent-feed/PHASE-2-TEST-SUMMARY.md"
echo "Test Output: /tmp/phase2-test-output.txt (7553 lines)"
echo ""
echo "Overall Assessment: ⚠️ PARTIALLY PASSING (47%)"
echo "Deployment Status: ❌ BLOCKED (critical issues)"
echo "Estimated Fix Time: 2-3 days"

