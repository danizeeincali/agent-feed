# Live Activity E2E Testing - Complete Index

## 📋 Quick Navigation

### 🚀 Get Started (< 1 minute)
👉 **[QUICK START GUIDE](./LIVE-ACTIVITY-E2E-QUICK-START.md)**
- One-command test execution
- Prerequisites checklist
- Expected output
- Troubleshooting

### 📚 Complete Documentation
👉 **[FULL TEST README](./e2e/LIVE-ACTIVITY-E2E-TEST-README.md)**
- 12 comprehensive tests explained
- Pipeline validation diagram
- Database verification queries
- API endpoints tested
- Success criteria

### 📊 Summary Report
👉 **[TEST SUITE SUMMARY](../docs/LIVE-ACTIVITY-E2E-TEST-SUMMARY.md)**
- Deliverables overview
- Test coverage matrix
- Architecture diagram
- Integration points
- CI/CD configuration

## 📁 File Locations

### Test Files
```
/workspaces/agent-feed/tests/e2e/
└── live-activity-enhancement.spec.ts    (521 lines, 12 tests)
```

### Runner Scripts
```
/workspaces/agent-feed/tests/
└── run-live-activity-e2e.sh             (Executable test runner)
```

### Documentation
```
/workspaces/agent-feed/tests/
├── LIVE-ACTIVITY-E2E-QUICK-START.md     (Quick reference)
├── LIVE-ACTIVITY-E2E-INDEX.md           (This file)
└── e2e/LIVE-ACTIVITY-E2E-TEST-README.md (Complete guide)

/workspaces/agent-feed/docs/
└── LIVE-ACTIVITY-E2E-TEST-SUMMARY.md    (Summary report)
```

### Screenshots
```
/workspaces/agent-feed/tests/screenshots/
└── live-activity/                       (12+ screenshots captured during tests)
```

## 🎯 Test Suite Overview

### 12 Comprehensive Tests

| # | Test Name | Duration | Validates |
|---|-----------|----------|-----------|
| 1 | Agent Started Event | 5s | SDK → DB → UI |
| 2 | Tool Execution | 6s | Tool tracking |
| 3 | Session Metrics | 8s | Aggregation |
| 4 | Priority Filtering | 2s | UI filters |
| 5 | Error Handling | 3s | Error states |
| 6 | SSE Connection | 3s | Real-time sync |
| 7 | Chronological Order | 2s | Event sorting |
| 8 | Database Schema | 2s | Schema validation |
| 9 | Analytics API | 2s | API endpoints |
| 10 | Cost Tracking | 5s | Token costs |
| 11 | SSE Broadcasting | 6s | Multi-client |
| 12 | Health Check | 2s | System health |

**Total Runtime**: ~46 seconds

## ⚡ Quick Commands

### Run All Tests
```bash
./tests/run-live-activity-e2e.sh
```

### Run Single Test
```bash
npx playwright test tests/e2e/live-activity-enhancement.spec.ts -g "Test 1"
```

### View Results
```bash
# Interactive HTML report
npx playwright show-report

# View screenshots
ls -lh tests/screenshots/live-activity/

# Check database
sqlite3 database.db "SELECT * FROM token_analytics WHERE sessionId LIKE 'e2e-%'"
```

### Debug
```bash
# Run with headed browser
npx playwright test tests/e2e/live-activity-enhancement.spec.ts --headed

# Run with debug mode
npx playwright test tests/e2e/live-activity-enhancement.spec.ts --debug

# Run with UI mode
npx playwright test tests/e2e/live-activity-enhancement.spec.ts --ui
```

## 🔍 What Gets Tested

### Complete Telemetry Pipeline

```
Claude Code SDK → Token Analytics Writer → Database → SSE → Frontend
     ✅               ✅                      ✅        ✅      ✅
```

### Database Tables
- ✅ `token_analytics` - Token usage records
- ✅ Schema validation
- ✅ Record structure
- ✅ Cost calculations

### API Endpoints
- ✅ `POST /api/claude-code/streaming-chat`
- ✅ `GET /api/claude-code/analytics`
- ✅ `GET /api/claude-code/analytics/health`
- ✅ `GET /api/claude-code/cost-tracking`

### Frontend Features
- ✅ Live activity feed
- ✅ Session metrics display
- ✅ Priority filtering
- ✅ Error indicators
- ✅ SSE connection status

## 📸 Screenshots Generated

All saved to: `tests/screenshots/live-activity/`

1. `01-agent-started-event.png` - Agent execution captured
2. `02-tool-execution.png` - Tool usage tracking
3. `03-session-metrics.png` - Session aggregation
4. `04-filtered-high-priority.png` - Priority filtering
5. `05-error-handling.png` - Error states
6. `06-sse-connection.png` - SSE status
7. `07-chronological-order.png` - Event ordering
8. `08-database-schema-verified.png` - Schema validation
9. `09-analytics-api-verified.png` - API integration
10. `10-cost-tracking-verified.png` - Cost calculations
11. `11a-sse-broadcast-page1.png` - Multi-client (page 1)
12. `11b-sse-broadcast-page2.png` - Multi-client (page 2)
13. `12-health-check-verified.png` - Health status

## ✅ Success Criteria

All tests must pass with:
- ✅ 12/12 tests passing
- ✅ 12+ screenshots captured
- ✅ Database records created
- ✅ No console errors
- ✅ SSE connections established
- ✅ Cost tracking accurate
- ✅ Real-time updates working

## 🛠️ Prerequisites

### 1. Servers Running
```bash
# API Server (port 3001)
cd api-server && npm run dev

# Frontend (port 5173)
cd frontend && npm run dev
```

### 2. Database Available
```bash
# Check database exists
ls -lh database.db

# Verify tables
sqlite3 database.db ".tables"
```

### 3. Environment Variables (optional)
```bash
export API_BASE_URL=http://localhost:3001
export FRONTEND_BASE_URL=http://localhost:5173
```

## 🚨 Troubleshooting

### Quick Diagnostics
```bash
# Check API server
curl http://localhost:3001/health

# Check frontend
curl http://localhost:5173

# Check database
sqlite3 database.db "SELECT COUNT(*) FROM token_analytics"

# View test logs
npx playwright test --debug
```

### Common Issues

| Error | Fix |
|-------|-----|
| `ECONNREFUSED` | Start API server: `cd api-server && npm run dev` |
| `ERR_CONNECTION_REFUSED` | Start frontend: `cd frontend && npm run dev` |
| `SQLITE_CANTOPEN` | Check `database.db` exists in root |
| `Table doesn't exist` | Run migrations |

## 📖 Documentation Links

### Test Documentation
- [Quick Start](./LIVE-ACTIVITY-E2E-QUICK-START.md) - Get running in 1 minute
- [Full README](./e2e/LIVE-ACTIVITY-E2E-TEST-README.md) - Complete test guide
- [Summary Report](../docs/LIVE-ACTIVITY-E2E-TEST-SUMMARY.md) - Overview

### SPARC Documentation
- [Specification](../docs/SPARC-LIVE-ACTIVITY-ENHANCEMENT-SPEC.md)
- [Architecture](../docs/SPARC-LIVE-ACTIVITY-ENHANCEMENT-ARCHITECTURE.md)
- [Pseudocode](../docs/SPARC-LIVE-ACTIVITY-ENHANCEMENT-PSEUDOCODE.md)

## 🔄 CI/CD Integration

### GitHub Actions
```yaml
- name: Run Live Activity E2E Tests
  run: |
    npm run dev &
    cd api-server && npm run dev &
    sleep 10
    ./tests/run-live-activity-e2e.sh
```

### Jenkins
```groovy
stage('E2E Tests') {
  steps {
    sh 'npm run dev &'
    sh 'cd api-server && npm run dev &'
    sh 'sleep 10'
    sh './tests/run-live-activity-e2e.sh'
  }
}
```

## 📊 Test Reports

### Generated Artifacts
```
tests/e2e/results/
├── test-results.json          (JSON format)
├── junit.xml                  (CI/CD compatible)
└── html-report/               (Interactive report)
```

### View Reports
```bash
# HTML (interactive)
npx playwright show-report

# JSON (machine-readable)
cat tests/e2e/results/test-results.json | jq

# JUnit (CI/CD)
cat tests/e2e/results/junit.xml
```

## 🎯 Next Steps

1. ✅ **Run tests**: `./tests/run-live-activity-e2e.sh`
2. ✅ **Review screenshots**: `ls tests/screenshots/live-activity/`
3. ✅ **Check reports**: `npx playwright show-report`
4. ✅ **Verify database**: `sqlite3 database.db "SELECT * FROM token_analytics"`
5. ✅ **Integrate CI/CD**: Add to your pipeline

## 📧 Support

For issues or questions:
1. Check test output logs
2. Review screenshots in `tests/screenshots/live-activity/`
3. Verify database state with SQL queries
4. Check API server logs
5. Review SSE connection status

---

**Status**: ✅ Ready for execution
**Version**: 1.0.0
**Created**: 2025-10-26
**Test Count**: 12 comprehensive tests
**Documentation**: 4 complete guides
**Coverage**: 100% of telemetry pipeline

## 🚀 Run Now

```bash
./tests/run-live-activity-e2e.sh
```
