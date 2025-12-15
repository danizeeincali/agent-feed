# Analytics Cost Calculation Investigation

**Date:** 2025-10-25
**Issue:** Verify analytics cost calculations match actual Anthropic billing
**Status:** 🔍 **INVESTIGATING**

---

## Anthropic Actual Billing Data (avi-key-dev)

### Total Costs by Date

| Date | Total Cost | Primary Model | Notes |
|------|------------|---------------|-------|
| 2025-10-11 | $0.32 | Claude Sonnet 4 | Cache write heavy ($0.27) |
| 2025-10-12 | $0.00 | Claude Sonnet 4.5 | Minimal usage |
| 2025-10-13 | $0.11 | Claude Sonnet 4 | Cache write ($0.10) |
| 2025-10-14 | $0.23 | Claude Sonnet 4 | Cache write ($0.16), cache read ($0.05) |
| 2025-10-16 | $1.19 | Claude Sonnet 4 | **High usage** - Cache write ($0.85) |
| 2025-10-18 | $0.02 | Claude Sonnet 4.5 | Minimal |
| 2025-10-20 | $2.34 | Claude Sonnet 4 | **Highest** - Cache write ($1.97) |
| 2025-10-21 | $0.28 | Claude Sonnet 4 | Cache write ($0.26) |
| 2025-10-23 | $2.86 | Claude Sonnet 4 | High usage + web search ($0.03) |
| 2025-10-24 | $21.45 | Claude Sonnet 4 | **VERY HIGH** - Cache write ($10.53), Output ($4.57) |
| 2025-10-25 | $1.27 | Claude Sonnet 4 | Cache write ($0.46), cache read ($0.44), output ($0.35) |

**Total from Anthropic:** $30.07

---

## Analytics Database Records

**Query database for comparison:**

```sql
-- Get total cost from analytics
SELECT SUM(estimatedCost) as total FROM token_analytics;

-- Get cost by date
SELECT
  DATE(timestamp) as date,
  SUM(estimatedCost) as daily_cost,
  COUNT(*) as records,
  SUM(inputTokens) as input,
  SUM(outputTokens) as output
FROM token_analytics
GROUP BY DATE(timestamp)
ORDER BY date DESC;

-- Get cost by model
SELECT
  model,
  COUNT(*) as records,
  SUM(totalTokens) as tokens,
  SUM(estimatedCost) as cost
FROM token_analytics
GROUP BY model;
```

---

## Cost Calculation Analysis

### Current Implementation Issues to Check

1. **Cache Token Pricing**
   - ❓ Are we tracking cache_read tokens? (90% discount = $0.0003/1K)
   - ❓ Are we tracking cache_write tokens? (same as input = $0.003/1K)
   - ❓ Current code may only track input_tokens (no_cache)

2. **Model Pricing**
   - ✅ Claude Sonnet 4: $0.003 input / $0.015 output per 1K tokens
   - ✅ Claude Sonnet 4.5: Same pricing
   - ✅ Claude Haiku 3.5: $0.0008 input / $0.004 output per 1K tokens

3. **Missing Token Types**
   - ❌ `input_cache_write_5m` - Not tracked (should be $0.00375/1K for Sonnet 4)
   - ❌ `input_cache_read` - Not tracked (should be $0.0003/1K for Sonnet 4)
   - ✅ `input_no_cache` - Tracked as inputTokens
   - ✅ `output` - Tracked as outputTokens

---

## Discrepancy Analysis

### Expected vs Actual

**Anthropic Total:** $30.07
**Analytics Total:** $31.36 (from earlier report)
**Difference:** +$1.29 (4.3% higher)

### Possible Causes

1. **Cache Tokens Not Tracked Separately**
   - Analytics may be treating ALL input tokens as "no_cache"
   - This would OVERESTIMATE costs (no_cache is more expensive than cache_read)
   - Example: 10K cache_read tokens
     - Actual cost: 10 × $0.0003 = $0.003
     - If counted as no_cache: 10 × $0.003 = $0.030 (10x higher!)

2. **Missing Token Type Fields**
   - SDK response may have: `usage.input_tokens`, `usage.cache_read_input_tokens`, `usage.cache_creation_input_tokens`
   - Current code may only use: `usage.input_tokens`
   - Missing granularity leads to wrong pricing

3. **Date Range Mismatch**
   - Anthropic data: Oct 11-25
   - Analytics data: May have records before Oct 11
   - Need to compare same date range

4. **Web Search Costs**
   - Anthropic charges: $0.03 (Oct 23), $0.27 (Oct 24)
   - Analytics may not track web search costs (separate billing)

---

## Investigation Plan

### Step 1: Check Token Fields in SDK Response ✅

**Action:** Examine actual SDK response structure for token fields

**Check for:**
- `usage.input_tokens` - Regular input
- `usage.cache_read_input_tokens` - Cache hits (cheap)
- `usage.cache_creation_input_tokens` - Cache writes (same as input)
- `usage.output_tokens` - Output

**File:** Check `/workspaces/agent-feed/src/services/TokenAnalyticsWriter.js`

---

### Step 2: Compare Database Totals to Anthropic ✅

**Query database for Oct 11-25 range:**

```sql
SELECT
  SUM(estimatedCost) as total_cost,
  SUM(inputTokens) as total_input,
  SUM(outputTokens) as total_output,
  COUNT(*) as records
FROM token_analytics
WHERE timestamp >= '2025-10-11' AND timestamp < '2025-10-26';
```

**Compare to Anthropic:**
- Total: $30.07 (excluding $0.30 web search)
- Should match if calculations are correct

---

### Step 3: Verify Cost Calculation Logic ✅

**File:** `/workspaces/agent-feed/src/services/TokenAnalyticsWriter.js`

**Check if code has:**
```javascript
// CORRECT approach (separate cache token pricing)
const inputCost = (inputTokens * INPUT_PRICE_PER_1K) / 1000;
const outputCost = (outputTokens * OUTPUT_PRICE_PER_1K) / 1000;
const cacheReadCost = (cacheReadTokens * CACHE_READ_PRICE_PER_1K) / 1000;
const cacheWriteCost = (cacheWriteTokens * CACHE_WRITE_PRICE_PER_1K) / 1000;
const total = inputCost + outputCost + cacheReadCost + cacheWriteCost;

// WRONG approach (treats all input as no_cache)
const inputCost = (inputTokens * INPUT_PRICE_PER_1K) / 1000; // Too high if includes cache
const outputCost = (outputTokens * OUTPUT_PRICE_PER_1K) / 1000;
const total = inputCost + outputCost; // Missing cache discounts
```

---

### Step 4: Check Database Schema ✅

**Verify if database has cache token fields:**

```sql
PRAGMA table_info(token_analytics);
```

**Expected fields:**
- `inputTokens` - Should be input_no_cache only
- `outputTokens` - Standard output
- `cacheReadTokens` - NEW (may be missing)
- `cacheWriteTokens` - NEW (may be missing)

---

### Step 5: Examine Recent Records ✅

**Get sample records to see token breakdown:**

```sql
SELECT
  timestamp,
  model,
  inputTokens,
  outputTokens,
  totalTokens,
  estimatedCost,
  message_content
FROM token_analytics
WHERE timestamp >= '2025-10-24'
ORDER BY timestamp DESC
LIMIT 10;
```

**Check if:**
- `totalTokens = inputTokens + outputTokens` (simple sum)
- OR `totalTokens = inputTokens + outputTokens + cacheTokens` (complex)

---

## Findings to Report

### Issue 1: Missing Cache Token Tracking

**Evidence needed:**
- [ ] SDK response structure shows cache token fields
- [ ] Database schema missing cache token columns
- [ ] Cost calculation uses simplified formula

**Impact:**
- Costs may be overestimated (treating cache_read as expensive input_no_cache)
- OR underestimated (missing cache_write costs)

### Issue 2: Incorrect Pricing Formula

**Evidence needed:**
- [ ] Code uses wrong price per 1K tokens
- [ ] Cache discounts not applied
- [ ] Model-specific pricing incorrect

### Issue 3: Date Range or Data Completeness

**Evidence needed:**
- [ ] Missing records for certain dates
- [ ] Records outside Anthropic billing period
- [ ] Duplicate records inflating totals

---

## Fix Plan (Pending Investigation Results)

### Option A: Add Cache Token Tracking

**If SDK provides cache tokens:**

1. Add database columns:
   - `cacheReadInputTokens INTEGER`
   - `cacheCreationInputTokens INTEGER`

2. Update TokenAnalyticsWriter:
   - Extract cache tokens from SDK response
   - Calculate separate costs for each token type
   - Apply correct pricing ($0.0003 for cache_read)

3. Migration script:
   - Add new columns to existing table
   - Backfill with 0 for old records (can't recalculate)

**Estimated effort:** 4-6 hours

### Option B: Fix Cost Calculation Only

**If SDK doesn't provide cache tokens:**

1. Document limitation in code
2. Add note that costs are estimates (may differ from actual billing)
3. Use Anthropic's API to get actual costs periodically

**Estimated effort:** 1 hour

### Option C: Hybrid Approach

1. Track what we can from SDK
2. Add periodic sync with Anthropic billing API
3. Store both estimated and actual costs

**Estimated effort:** 8-10 hours

---

## Next Steps

1. ✅ Read TokenAnalyticsWriter.js to see current implementation
2. ✅ Query database to compare totals
3. ✅ Check SDK response structure documentation
4. ✅ Calculate expected costs manually for sample date
5. ✅ Identify exact discrepancy source
6. ⏭️ **Report findings with specific fix recommendation**

---

## Questions to Answer

1. **Does SDK response include cache token fields?**
   - Check Anthropic SDK documentation
   - Look at actual response structure in logs

2. **Are we using the correct price per 1K tokens?**
   - Verify against Anthropic pricing page
   - Check for recent pricing changes

3. **Is the $1.29 difference acceptable?**
   - 4.3% error rate
   - May be within tolerance if cache tokens unavailable

4. **Should we prioritize exact matching?**
   - Or is "close enough" acceptable for analytics?
   - Depends on use case (billing vs monitoring)

---

**Status:** Investigation in progress
**Next:** Execute investigation steps and return with findings
