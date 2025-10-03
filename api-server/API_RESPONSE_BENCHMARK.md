

---

## Test 5: API Endpoint Response Time

### Sequential Requests (100 iterations)

| Metric | Time |
|--------|------|
| Mean | 2.08ms |
| P50 | 1.44ms |
| P95 | 5.79ms |
| P99 | 7.41ms |
| Min | 795.94μs |
| Max | 7.41ms |

### Different LIMIT Values

| LIMIT | Mean | P95 |
|-------|------|-----|
| 10 | 3.02ms | 6.72ms |
| 50 | 1.44ms | 2.44ms |
| 100 | 1.79ms | 3.39ms |

### Concurrent Requests (10 concurrent)

| Metric | Time |
|--------|------|
| Mean | 11.30ms |
| P95 | 28.96ms |
| P99 | 31.33ms |

**Analysis:**
- ✅ Meets 100ms P95 target
- Full request cycle includes: Network + JSON parsing + Query execution
- Significant performance degradation under concurrent load
- Excellent overall API performance

**Breakdown:**
- Query execution: ~800.00μs (from direct query benchmark)
- API overhead: ~1.28ms (routing, JSON parsing, response formatting)

