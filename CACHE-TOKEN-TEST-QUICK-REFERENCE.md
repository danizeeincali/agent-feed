# Cache Token TDD Test Suite - Quick Reference

**Total: 37 Tests | 6 Test Files | London School TDD**

---

## Quick Test Execution

```bash
# Run ALL tests (recommended)
./tests/run-cache-token-tests.sh

# Run individual suites
npm run test:cache-migration     # 7 tests
npm run test:cache-writer        # 8 tests
npm run test:cache-cost          # 6 tests
npm run test:cache-real-data     # 5 tests
npm run test:cache-regression    # 5 tests
npm run test:cache-e2e           # 6 tests (requires servers)
```

---

## Test File Index

| # | File | Tests | Category |
|---|------|-------|----------|
| 1 | `tests/integration/migration-008-cache-tokens.test.js` | 7 | Migration |
| 2 | `src/services/__tests__/TokenAnalyticsWriter-cache.test.js` | 8 | Unit |
| 3 | `tests/integration/cache-token-cost-validation.test.js` | 6 | Integration |
| 4 | `tests/integration/cache-token-real-data.test.js` | 5 | Integration |
| 5 | `tests/integration/cache-token-regression.test.js` | 5 | Integration |
| 6 | `tests/e2e/cache-token-tracking.spec.ts` | 6 | E2E |

---

## Test Categories Breakdown

### 1. Migration Tests (7)
- Column addition (cacheReadTokens, cacheCreationTokens)
- Data preservation during migration
- NULL value handling
- Migration idempotency
- Schema validation

### 2. TokenAnalyticsWriter Tests (8)
- SDK response extraction (cache_read_input_tokens, cache_creation_input_tokens)
- Default value handling (0 when missing)
- Large value support (millions of tokens)
- Null/undefined handling
- Database INSERT verification

### 3. Cost Validation Tests (6)
- Cache read pricing ($0.0003/1K tokens)
- Cache creation pricing ($0.003/1K tokens)
- Combined cost calculation (all token types)
- Database-stored cost accuracy (0.1% tolerance)
- Edge cases (zero cache, only cache)

### 4. Real Data Tests (5)
- Real SDK response processing
- Complex response extraction
- Round-trip data integrity
- Batch query validation
- Anthropic pricing verification

### 5. Regression Tests (5)
- Legacy query compatibility
- Pre-cache API support (old SDK responses)
- Historical data queries (mixed old/new records)
- Analytics API compatibility
- Performance benchmarks (<1ms/write)

### 6. E2E Tests (6)
- API call with cache tokens
- Database field population
- Cost calculation in production
- Analytics vs billing comparison
- Query results display (screenshots)
- Migration verification

---

## Expected Results

```
✅ Migration Tests:          7/7 passing
✅ TokenAnalyticsWriter:     8/8 passing
✅ Cost Validation:          6/6 passing
✅ Real Data Integration:    5/5 passing
✅ Regression Tests:         5/5 passing
✅ E2E Playwright:           6/6 passing
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
   TOTAL:                   37/37 (100%)
```

---

## Key Test Scenarios

### Scenario 1: Normal Operation (All Token Types)
```javascript
{
  input_tokens: 1000,
  output_tokens: 500,
  cache_read_input_tokens: 5000,
  cache_creation_input_tokens: 3000
}
// Expected cost: $0.021
```

### Scenario 2: Warm Cache (Cache Read Only)
```javascript
{
  input_tokens: 0,
  output_tokens: 500,
  cache_read_input_tokens: 10000,
  cache_creation_input_tokens: 0
}
// Expected cost: $0.0105 (90% savings on input)
```

### Scenario 3: Legacy (No Cache)
```javascript
{
  input_tokens: 1000,
  output_tokens: 500
  // No cache tokens
}
// Expected: cacheReadTokens=0, cacheCreationTokens=0
```

---

## Pricing Reference

| Token Type | Price per 1M | Price per 1K |
|------------|--------------|--------------|
| Input | $3.00 | $0.003 |
| Output | $15.00 | $0.015 |
| Cache Read | $0.30 | $0.0003 |
| Cache Creation | $3.00 | $0.003 |

**Cache Savings:** 90% discount on cache_read vs input (10x cheaper)

---

## Database Schema

```sql
ALTER TABLE token_analytics
ADD COLUMN cacheReadTokens INTEGER DEFAULT 0;

ALTER TABLE token_analytics
ADD COLUMN cacheCreationTokens INTEGER DEFAULT 0;
```

---

## Common Test Commands

```bash
# Run specific test file
NODE_OPTIONS=--experimental-vm-modules npx jest tests/integration/migration-008-cache-tokens.test.js --verbose

# Run with coverage
NODE_OPTIONS=--experimental-vm-modules npx jest --coverage --testPathPattern="cache"

# Watch mode (for development)
NODE_OPTIONS=--experimental-vm-modules npx jest --watch tests/integration/cache-token-cost-validation.test.js

# E2E with headed browser (debugging)
npx playwright test tests/e2e/cache-token-tracking.spec.ts --headed

# E2E with UI mode
npx playwright test tests/e2e/cache-token-tracking.spec.ts --ui
```

---

## Troubleshooting

### Issue: Tests fail with "database locked"
**Solution:** Ensure no other processes have database open
```bash
lsof database.db
killall -9 node  # If needed
```

### Issue: E2E tests timeout
**Solution:** Ensure servers are running
```bash
# Terminal 1: Frontend
npm run dev

# Terminal 2: Backend
cd api-server && npm start

# Terminal 3: Tests
npx playwright test tests/e2e/cache-token-tracking.spec.ts
```

### Issue: Jest ESM module errors
**Solution:** Use NODE_OPTIONS flag
```bash
NODE_OPTIONS=--experimental-vm-modules npx jest [test-file]
```

---

## London School TDD Principles Applied

1. **Mock-Driven:** Test interactions, not implementations
2. **Outside-In:** E2E tests → Integration → Unit
3. **Behavior Focus:** Test WHAT, not HOW
4. **Contract Testing:** Verify agreements between components

---

## Test Data Examples

### Minimal Test Case
```javascript
{ input: 100, output: 50, cacheRead: 0, cacheCreation: 0 }
// Cost: $0.00105
```

### Typical Test Case
```javascript
{ input: 2000, output: 1000, cacheRead: 8000, cacheCreation: 4000 }
// Cost: $0.0435
```

### Maximum Test Case
```javascript
{ input: 100000, output: 50000, cacheRead: 5000000, cacheCreation: 1000000 }
// Cost: $5.55
```

---

## Success Criteria Checklist

- [ ] All 37 tests passing
- [ ] Migration applied to database
- [ ] Cost calculations accurate (0.1% tolerance)
- [ ] No NULL values in cache columns
- [ ] Performance <1ms per write operation
- [ ] Legacy queries still work
- [ ] Screenshots generated (6 files)

---

## Files Created

```
/workspaces/agent-feed/
├── tests/
│   ├── integration/
│   │   ├── migration-008-cache-tokens.test.js
│   │   ├── cache-token-cost-validation.test.js
│   │   ├── cache-token-real-data.test.js
│   │   └── cache-token-regression.test.js
│   ├── e2e/
│   │   └── cache-token-tracking.spec.ts
│   └── run-cache-token-tests.sh
├── src/services/__tests__/
│   └── TokenAnalyticsWriter-cache.test.js
├── CACHE-TOKEN-TDD-TEST-SUITE-SUMMARY.md
└── CACHE-TOKEN-TEST-QUICK-REFERENCE.md (this file)
```

---

**Last Updated:** 2025-10-25
**Version:** 1.0.0
**Total Tests:** 37
