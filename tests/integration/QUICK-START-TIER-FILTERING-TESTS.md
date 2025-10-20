# Quick Start: Agent Tier Filtering Tests

## Prerequisites

1. **API Server Running**:
   ```bash
   npm run dev
   ```

2. **Backend Implementation Complete**:
   - Tier classification service
   - Repository filtering logic
   - Agents have `tier` field populated

## Run Tests

### All Tests
```bash
npm test -- tests/integration/agent-tier-filtering.test.js
```

### Specific Test Suite
```bash
# Default behavior tests
npm test -- tests/integration/agent-tier-filtering.test.js -t "Default Behavior"

# Tier parameter tests
npm test -- tests/integration/agent-tier-filtering.test.js -t "Tier Parameter"

# Metadata tests
npm test -- tests/integration/agent-tier-filtering.test.js -t "Metadata"

# Performance tests
npm test -- tests/integration/agent-tier-filtering.test.js -t "Performance"

# Backward compatibility tests
npm test -- tests/integration/agent-tier-filtering.test.js -t "Backward Compatibility"
```

### With Options
```bash
# Verbose output
npm test -- tests/integration/agent-tier-filtering.test.js --verbose

# Watch mode
npm test -- tests/integration/agent-tier-filtering.test.js --watch

# With coverage
npm test -- tests/integration/agent-tier-filtering.test.js --coverage
```

## Manual API Testing

### Quick Validation
```bash
# Check default behavior (should return tier 1 only)
curl 'http://localhost:3001/api/agents' | jq '{success, data_count: (.data|length), metadata}'

# Check tier filtering works
curl 'http://localhost:3001/api/agents?tier=1' | jq '.metadata'
curl 'http://localhost:3001/api/agents?tier=2' | jq '.metadata'
curl 'http://localhost:3001/api/agents?tier=all' | jq '.metadata'

# Check error handling
curl 'http://localhost:3001/api/agents?tier=invalid'
```

### Validate Agent Structure
```bash
# Check agents have tier field
curl 'http://localhost:3001/api/agents?tier=all' | \
  jq '.data[] | {name, tier, slug}' | head -20

# Verify tier 1 agents only
curl 'http://localhost:3001/api/agents?tier=1' | \
  jq '.data[] | select(.tier != 1) | {name, tier}'

# Verify tier 2 agents only
curl 'http://localhost:3001/api/agents?tier=2' | \
  jq '.data[] | select(.tier != 2) | {name, tier}'
```

## Expected Results

### Test Summary
```
Test Suites: 1 passed, 1 total
Tests:       37 passed, 37 total
Snapshots:   0 total
Time:        ~5 seconds
```

### Test Breakdown
- Default Behavior: 2 tests
- Tier Parameter: 6 tests
- Metadata: 4 tests
- Backward Compatibility: 3 tests
- Response Structure: 3 tests
- Performance: 4 tests
- Error Handling: 2 tests
- Data Integrity: 2 tests

**Total: 37 tests**

## Troubleshooting

### Server Not Available
```
⚠️  API server not running. Start with: npm run dev
```
**Solution**: Start the API server in a separate terminal

### Tests Timeout
**Solution**: Increase timeout in test file or check server health:
```bash
curl http://localhost:3001/health
```

### All Tests Fail
**Likely Cause**: Backend tier classification not implemented

**Check**:
```bash
# Agents should have tier field (not null)
curl 'http://localhost:3001/api/agents' | jq '.data[0].tier'

# Metadata should exist
curl 'http://localhost:3001/api/agents' | jq '.metadata'
```

## Test Coverage

Run with coverage report:
```bash
npm test -- tests/integration/agent-tier-filtering.test.js --coverage
```

View HTML report:
```bash
open coverage/lcov-report/index.html
```

## CI/CD Integration

Add to GitHub Actions:
```yaml
- name: Run Tier Filtering Tests
  run: npm test -- tests/integration/agent-tier-filtering.test.js
```

## Performance Benchmarks

Expected response times:
- `tier=1`: < 500ms
- `tier=2`: < 500ms
- `tier=all`: < 1000ms

Check actual performance:
```bash
# Tier 1 performance
time curl -s 'http://localhost:3001/api/agents?tier=1' > /dev/null

# Tier 2 performance
time curl -s 'http://localhost:3001/api/agents?tier=2' > /dev/null

# All agents performance
time curl -s 'http://localhost:3001/api/agents?tier=all' > /dev/null
```

## Next Steps

1. Implement backend tier classification
2. Run tests: `npm test -- tests/integration/agent-tier-filtering.test.js`
3. Fix any failures
4. Verify all 37 tests pass
5. Check coverage report
6. Integrate into CI/CD pipeline
