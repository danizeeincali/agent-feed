# Agent Filtering Tests - Quick Start Guide

## Running Tests

### Option 1: Run All Tests (Recommended)

```bash
cd /workspaces/agent-feed
./tests/run-agent-filtering-tests.sh
```

This will run all test suites and generate a summary report.

### Option 2: Run Individual Test Suites

#### Unit Tests (No server required)
```bash
npm test -- tests/unit/filesystem-agent-repository.test.js
```

#### Integration Tests (Requires API server)
```bash
# Terminal 1: Start API server
cd api-server && npm run dev

# Terminal 2: Run tests
npm test -- tests/integration/agents-api-filtering.test.js
```

#### E2E Tests (Requires frontend)
```bash
# Terminal 1: Start API server
cd api-server && npm run dev

# Terminal 2: Start frontend
cd frontend && npm run dev

# Terminal 3: Run tests
npx playwright test tests/e2e/agent-list-filtering.spec.ts
```

#### Regression Tests (Requires API server)
```bash
# Terminal 1: Start API server
cd api-server && npm run dev

# Terminal 2: Run tests
npm test -- tests/regression/agent-filtering-regression.test.js
```

#### Performance Tests (Requires API server)
```bash
# Terminal 1: Start API server
cd api-server && npm run dev

# Terminal 2: Run tests
npm test -- tests/performance/filesystem-performance.test.js
```

## Test Files Location

- **Unit**: `/workspaces/agent-feed/tests/unit/filesystem-agent-repository.test.js`
- **Integration**: `/workspaces/agent-feed/tests/integration/agents-api-filtering.test.js`
- **E2E**: `/workspaces/agent-feed/tests/e2e/agent-list-filtering.spec.ts`
- **Regression**: `/workspaces/agent-feed/tests/regression/agent-filtering-regression.test.js`
- **Performance**: `/workspaces/agent-feed/tests/performance/filesystem-performance.test.js`

## Test Reports

After running tests, view the comprehensive report:

```bash
cat /workspaces/agent-feed/tests/reports/AGENT-FILTERING-TEST-REPORT.md
```

Or view individual test logs:

```bash
cat /workspaces/agent-feed/tests/reports/unit-tests.log
cat /workspaces/agent-feed/tests/reports/integration-tests.log
cat /workspaces/agent-feed/tests/reports/e2e-tests.log
cat /workspaces/agent-feed/tests/reports/regression-tests.log
```

## Expected Results

### Unit Tests
- ✅ 15 tests should pass
- ✅ Validates 13 production agents exist
- ✅ No system templates included

### Integration Tests
- ✅ 25 tests covering API endpoints
- ✅ GET /api/agents returns 13 agents
- ✅ All agent profiles accessible

### E2E Tests
- ✅ 30 tests covering UI interactions
- ✅ Agent list displays correctly
- ✅ Responsive design works

### Regression Tests
- ✅ 20 tests ensuring no breaking changes
- ✅ Feed, posts, comments still work
- ✅ PostgreSQL connection healthy

### Performance Tests
- ✅ 15 tests validating speed
- ✅ API response < 200ms
- ✅ No memory leaks

## Troubleshooting

### Tests fail with "server not running"
**Solution**: Start the API server:
```bash
cd api-server && npm run dev
```

### Playwright tests fail
**Solution**: Install Playwright browsers:
```bash
npx playwright install
```

### Unit tests fail on agent count
**Issue**: Expected 13 agents, found different number
**Solution**: Check `/workspaces/agent-feed/prod/.claude/agents/` directory

## Quick Validation

To quickly verify the system is working:

```bash
# Check agent count
ls -1 /workspaces/agent-feed/prod/.claude/agents/*.md | wc -l
# Should output: 13

# Run unit tests only
npm test -- tests/unit/filesystem-agent-repository.test.js

# Check API response (requires server)
curl http://localhost:3001/api/agents | jq '.total'
# Should output: 13
```

## Test Coverage

- **Total Tests**: 105
- **Unit Tests**: 15 (✅ Passing)
- **Integration Tests**: 25 (Requires server)
- **E2E Tests**: 30 (Requires frontend)
- **Regression Tests**: 20 (Requires server)
- **Performance Tests**: 15 (Requires server)

## Questions?

See the comprehensive report:
- `/workspaces/agent-feed/tests/reports/AGENT-FILTERING-TEST-REPORT.md`
