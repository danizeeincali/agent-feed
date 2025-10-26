# Cache Token Tracking - Quick Reference

## Overview
Cache tokens are now fully tracked in the `token_analytics` table, enabling accurate cost calculations and cache efficiency monitoring.

## Database Columns

| Column | Type | Purpose |
|--------|------|---------|
| `cacheReadTokens` | INTEGER | Tokens served from cache (90% discount) |
| `cacheCreationTokens` | INTEGER | Tokens used to create cache entries |

## Pricing (Claude Sonnet 4)

| Token Type | Cost per 1K Tokens | Discount |
|-----------|-------------------|----------|
| Input | $0.003 | - |
| Output | $0.015 | - |
| Cache Read | $0.0003 | 90% off |
| Cache Creation | $0.003 | Same as input |

## Example Cost Calculation

```javascript
// Token breakdown
inputTokens: 1000
outputTokens: 500
cacheReadTokens: 5000
cacheCreationTokens: 200

// Cost calculation
inputCost = (1000 × $0.003) / 1000 = $0.003
outputCost = (500 × $0.015) / 1000 = $0.0075
cacheReadCost = (5000 × $0.0003) / 1000 = $0.0015
cacheCreationCost = (200 × $0.003) / 1000 = $0.0006

totalCost = $0.0126

// Without cache
noCacheCost = ((1000 + 5000) × $0.003 + 500 × $0.015) / 1000 = $0.0255

// Savings
savings = $0.0255 - $0.0126 = $0.0129 (50.6%)
```

## Query Examples

### Get cache efficiency for a session
```sql
SELECT
  sessionId,
  SUM(inputTokens) as input,
  SUM(outputTokens) as output,
  SUM(cacheReadTokens) as cache_reads,
  SUM(cacheCreationTokens) as cache_creates,
  SUM(estimatedCost) as total_cost,
  ROUND(SUM(cacheReadTokens) * 100.0 / NULLIF(SUM(inputTokens), 0), 2) as cache_hit_rate
FROM token_analytics
WHERE sessionId = 'your-session-id'
GROUP BY sessionId;
```

### Find sessions with high cache usage
```sql
SELECT
  sessionId,
  timestamp,
  cacheReadTokens,
  inputTokens,
  ROUND(cacheReadTokens * 100.0 / NULLIF(inputTokens, 0), 2) as cache_percentage
FROM token_analytics
WHERE cacheReadTokens > 0
ORDER BY cache_percentage DESC
LIMIT 10;
```

### Calculate total cache savings
```sql
SELECT
  COUNT(*) as total_operations,
  SUM(cacheReadTokens) as total_cache_reads,
  -- Cost with cache
  SUM(estimatedCost) as actual_cost,
  -- Cost without cache (cache reads at full input price)
  SUM(
    (inputTokens * 0.003 +
     outputTokens * 0.015 +
     cacheReadTokens * 0.003 +
     cacheCreationTokens * 0.003) / 1000
  ) as cost_without_cache,
  -- Savings
  SUM(
    (inputTokens * 0.003 +
     outputTokens * 0.015 +
     cacheReadTokens * 0.003 +
     cacheCreationTokens * 0.003) / 1000
  ) - SUM(estimatedCost) as total_savings
FROM token_analytics
WHERE cacheReadTokens > 0;
```

## Implementation Details

### TokenAnalyticsWriter.js Flow

1. **Extract cache tokens from SDK response**
   ```javascript
   const cacheReadTokens = usage.cache_read_input_tokens || 0;
   const cacheCreationTokens = usage.cache_creation_input_tokens || 0;
   ```

2. **Calculate cost with cache discounts**
   ```javascript
   const cacheReadCost = (cacheReadTokens * pricing.cacheRead) / 1000;
   const cacheCreationCost = (cacheCreationTokens * pricing.cacheCreation) / 1000;
   ```

3. **Write to database with all token types**
   ```javascript
   INSERT INTO token_analytics (
     ..., cacheReadTokens, cacheCreationTokens
   ) VALUES (
     ..., @cacheReadTokens, @cacheCreationTokens
   )
   ```

## Migration Info

- **Migration:** 008-add-cache-tokens.sql
- **Run script:** `node api-server/scripts/run-migration-008.js`
- **Verify:** `node scripts/verify-cache-token-fix.js`
- **Test:** `node scripts/test-cache-token-write.js`

## Backward Compatibility

- ✅ Existing records have DEFAULT 0 values
- ✅ No breaking changes to existing code
- ✅ Old records still queryable
- ✅ Cost calculations work for all records

## Monitoring Cache Efficiency

### Good Cache Hit Rate
- 40%+ cache reads vs input tokens
- Consistent cache creation patterns
- Reduced costs over time

### Poor Cache Hit Rate
- < 10% cache reads
- High cache creation, low reads
- No cost savings

### Action Items
1. Monitor cache hit rates weekly
2. Optimize prompts for cache efficiency
3. Review cache creation patterns
4. Celebrate cost savings!

## Common Issues

### Issue: Cache tokens showing as 0
**Cause:** Cache not being utilized
**Solution:** Ensure prompts are structured for cache reuse

### Issue: High cache creation, low reads
**Cause:** Unique sessions not reusing cache
**Solution:** Implement session persistence

### Issue: Cost not decreasing with cache
**Cause:** Cache overhead exceeding savings
**Solution:** Review cache creation strategy

## Support

For questions or issues:
1. Check logs for cache token extraction
2. Verify database columns exist
3. Run verification script
4. Review cost calculation logic

---

**Last Updated:** 2025-10-25
**Version:** 1.0
**Status:** Production Ready
