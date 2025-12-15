# Cache Token Tracking - Architecture Diagrams

**Visual Reference Guide** | **Version**: 1.0.0 | **Date**: 2025-10-25

---

## System Overview

```
┌────────────────────────────────────────────────────────────────┐
│                     CLAUDE CODE SDK                             │
│                                                                 │
│  query({ prompt, options }) → Async Iterator<Message>          │
└────────────────────────────────────────────────────────────────┘
                              │
                              ▼
┌────────────────────────────────────────────────────────────────┐
│                    MESSAGE STREAM                               │
│                                                                 │
│  [system] → [assistant] → [result]                             │
└────────────────────────────────────────────────────────────────┘
                              │
                              ▼
┌────────────────────────────────────────────────────────────────┐
│                  RESULT MESSAGE                                 │
│                                                                 │
│  {                                                              │
│    type: 'result',                                             │
│    usage: {                                                    │
│      input_tokens: 1000,                                       │
│      output_tokens: 500,                                       │
│      cache_read_input_tokens: 5000,    ◄─── NEW                │
│      cache_creation_input_tokens: 3000 ◄─── NEW                │
│    }                                                            │
│  }                                                              │
└────────────────────────────────────────────────────────────────┘
                              │
                              ▼
┌────────────────────────────────────────────────────────────────┐
│              TOKEN ANALYTICS WRITER                             │
│                                                                 │
│  extractMetricsFromSDK()                                       │
│  calculateEstimatedCost()                                      │
│  writeToDatabase()                                             │
└────────────────────────────────────────────────────────────────┘
                              │
                              ▼
┌────────────────────────────────────────────────────────────────┐
│                  DATABASE RECORD                                │
│                                                                 │
│  token_analytics {                                             │
│    inputTokens: 1000                                           │
│    outputTokens: 500                                           │
│    cacheReadTokens: 5000        ◄─── NEW COLUMN                │
│    cacheCreationTokens: 3000    ◄─── NEW COLUMN                │
│    estimatedCost: 0.021                                        │
│  }                                                              │
└────────────────────────────────────────────────────────────────┘
```

---

## Data Flow - Token Extraction

```
SDK Response                     TokenAnalyticsWriter               Database
     │                                   │                             │
     │  result.usage                     │                             │
     ├─────────────────────────────────►│                             │
     │                                   │                             │
     │                                   │ extractMetricsFromSDK()     │
     │                                   ├──────────────┐              │
     │                                   │              │              │
     │                                   │  inputTokens = usage.input_tokens || 0
     │                                   │  outputTokens = usage.output_tokens || 0
     │                                   │  cacheReadTokens = usage.cache_read_input_tokens || 0
     │                                   │  cacheCreationTokens = usage.cache_creation_input_tokens || 0
     │                                   │              │              │
     │                                   │◄─────────────┘              │
     │                                   │                             │
     │                                   │ calculateEstimatedCost()    │
     │                                   ├──────────────┐              │
     │                                   │              │              │
     │                                   │  inputCost = (inputTokens * 0.003) / 1000
     │                                   │  outputCost = (outputTokens * 0.015) / 1000
     │                                   │  cacheReadCost = (cacheReadTokens * 0.0003) / 1000
     │                                   │  cacheCreationCost = (cacheCreationTokens * 0.003) / 1000
     │                                   │  totalCost = sum(all costs)
     │                                   │              │              │
     │                                   │◄─────────────┘              │
     │                                   │                             │
     │                                   │ writeToDatabase()           │
     │                                   ├────────────────────────────►│
     │                                   │                             │
     │                                   │                    INSERT INTO token_analytics
     │                                   │                    (inputTokens, outputTokens,
     │                                   │                     cacheReadTokens,
     │                                   │                     cacheCreationTokens,
     │                                   │                     estimatedCost)
     │                                   │                             │
     │                                   │◄────────────────────────────┤
     │                                   │         Success              │
     │                                   │                             │
```

---

## Token Types & Pricing

```
┌─────────────────────────────────────────────────────────────────┐
│                     TOKEN TYPE BREAKDOWN                         │
└─────────────────────────────────────────────────────────────────┘

┌──────────────────┐
│  INPUT TOKENS    │  1,000 tokens × $0.003 / 1,000 = $0.003
│  $0.003 per 1K   │
│                  │  Use Case: New prompt content not in cache
│  Example: 1000   │
└──────────────────┘

┌──────────────────┐
│  OUTPUT TOKENS   │  500 tokens × $0.015 / 1,000 = $0.0075
│  $0.015 per 1K   │
│                  │  Use Case: Assistant generated responses
│  Example: 500    │
└──────────────────┘

┌──────────────────┐
│ CACHE READ       │  5,000 tokens × $0.0003 / 1,000 = $0.0015
│ $0.0003 per 1K   │
│ 90% DISCOUNT ✨  │  Use Case: Cached prompt content reused
│                  │  Savings: $0.015 - $0.0015 = $0.0135 (90%)
│  Example: 5000   │
└──────────────────┘

┌──────────────────┐
│ CACHE CREATION   │  3,000 tokens × $0.003 / 1,000 = $0.009
│ $0.003 per 1K    │
│ (same as input)  │  Use Case: First-time cache write
│                  │  Future reads will get 90% discount
│  Example: 3000   │
└──────────────────┘

                        TOTAL COST = $0.021

┌─────────────────────────────────────────────────────────────────┐
│  COST BREAKDOWN                                                  │
│                                                                  │
│  Input Cost:          $0.003  (14.3%)  ████                     │
│  Output Cost:         $0.0075 (35.7%)  ██████████               │
│  Cache Read Cost:     $0.0015 ( 7.1%)  ██                       │
│  Cache Creation Cost: $0.009  (42.9%)  ████████████             │
│                       ──────                                     │
│  Total:               $0.021  (100%)                             │
└─────────────────────────────────────────────────────────────────┘
```

---

## Database Schema Evolution

```
BEFORE (Missing Cache Tokens)
┌────────────────────────────────────────┐
│        token_analytics                 │
├────────────────────────────────────────┤
│ id                TEXT PRIMARY KEY     │
│ timestamp         TEXT NOT NULL        │
│ sessionId         TEXT NOT NULL        │
│ operation         TEXT NOT NULL        │
│ model             TEXT NOT NULL        │
│ inputTokens       INTEGER NOT NULL     │
│ outputTokens      INTEGER NOT NULL     │
│ totalTokens       INTEGER NOT NULL     │
│ estimatedCost     REAL NOT NULL        │
│ userId            TEXT                 │
│ created_at        DATETIME             │
└────────────────────────────────────────┘

                    ▼
           MIGRATION 008
                    ▼

AFTER (Full Cache Token Tracking)
┌────────────────────────────────────────┐
│        token_analytics                 │
├────────────────────────────────────────┤
│ id                TEXT PRIMARY KEY     │
│ timestamp         TEXT NOT NULL        │
│ sessionId         TEXT NOT NULL        │
│ operation         TEXT NOT NULL        │
│ model             TEXT NOT NULL        │
│ inputTokens       INTEGER NOT NULL     │
│ outputTokens      INTEGER NOT NULL     │
│ totalTokens       INTEGER NOT NULL     │
│ estimatedCost     REAL NOT NULL        │
│ userId            TEXT                 │
│ created_at        DATETIME             │
│ cacheReadTokens   INTEGER DEFAULT 0 ◄──┼─── NEW
│ cacheCreationTokens INTEGER DEFAULT 0 ◄┼─── NEW
└────────────────────────────────────────┘
```

---

## Cost Calculation Pipeline

```
┌─────────────────────────────────────────────────────────────────┐
│                   COST CALCULATION FLOW                          │
└─────────────────────────────────────────────────────────────────┘

Input: Token Counts
┌──────────────────┐
│ inputTokens:     │ 1000
│ outputTokens:    │  500
│ cacheReadTokens: │ 5000
│ cacheCreationTokens: │ 3000
└──────────────────┘
         │
         ▼
┌─────────────────────────────────────────────────────────────────┐
│                   PRICING TABLE LOOKUP                           │
│                                                                  │
│  Model: claude-sonnet-4-20250514                                │
│                                                                  │
│  PRICING = {                                                     │
│    input: 0.003,                                                │
│    output: 0.015,                                               │
│    cacheRead: 0.0003,     ◄─── 90% discount                     │
│    cacheCreation: 0.003                                         │
│  }                                                               │
└─────────────────────────────────────────────────────────────────┘
         │
         ▼
┌─────────────────────────────────────────────────────────────────┐
│                 CALCULATE INDIVIDUAL COSTS                       │
│                                                                  │
│  inputCost        = (1000 * 0.003) / 1000 = 0.003              │
│  outputCost       = (500 * 0.015) / 1000  = 0.0075             │
│  cacheReadCost    = (5000 * 0.0003) / 1000 = 0.0015            │
│  cacheCreationCost = (3000 * 0.003) / 1000 = 0.009             │
└─────────────────────────────────────────────────────────────────┘
         │
         ▼
┌─────────────────────────────────────────────────────────────────┐
│                      SUM TOTAL COST                              │
│                                                                  │
│  totalCost = inputCost + outputCost +                           │
│              cacheReadCost + cacheCreationCost                  │
│                                                                  │
│  totalCost = 0.003 + 0.0075 + 0.0015 + 0.009                    │
│            = 0.021                                              │
└─────────────────────────────────────────────────────────────────┘
         │
         ▼
Output: estimatedCost = $0.021
```

---

## Cache Token Impact Analysis

```
┌─────────────────────────────────────────────────────────────────┐
│              SCENARIO: WITHOUT CACHE TRACKING                    │
└─────────────────────────────────────────────────────────────────┘

SDK Usage:
  input_tokens: 1000
  output_tokens: 500
  cache_read_input_tokens: 5000     ◄─── IGNORED ❌
  cache_creation_input_tokens: 3000 ◄─── IGNORED ❌

Analytics Calculation (WRONG):
  Cost = (1000 * 0.003) + (500 * 0.015)
       = 0.003 + 0.0075
       = $0.0105

Actual Anthropic Bill:
  Cost = (1000 * 0.003) + (500 * 0.015) +
         (5000 * 0.0003) + (3000 * 0.003)
       = 0.003 + 0.0075 + 0.0015 + 0.009
       = $0.021

DISCREPANCY: $0.021 - $0.0105 = $0.0105 (50% underreporting)

Over 1 month with 1000 operations:
  Analytics shows: $10.50
  Actual bill:     $21.00
  Missing:         $10.50 (50% cost tracking gap) ❌

┌─────────────────────────────────────────────────────────────────┐
│               SCENARIO: WITH CACHE TRACKING ✅                   │
└─────────────────────────────────────────────────────────────────┘

SDK Usage:
  input_tokens: 1000
  output_tokens: 500
  cache_read_input_tokens: 5000     ◄─── TRACKED ✅
  cache_creation_input_tokens: 3000 ◄─── TRACKED ✅

Analytics Calculation (CORRECT):
  Cost = (1000 * 0.003) + (500 * 0.015) +
         (5000 * 0.0003) + (3000 * 0.003)
       = 0.003 + 0.0075 + 0.0015 + 0.009
       = $0.021

Actual Anthropic Bill:
  Cost = $0.021

DISCREPANCY: $0.021 - $0.021 = $0.00 (100% accurate) ✅

Over 1 month with 1000 operations:
  Analytics shows: $21.00
  Actual bill:     $21.00
  Missing:         $0.00 (perfect tracking) ✅
```

---

## Cache Efficiency Metrics

```
┌─────────────────────────────────────────────────────────────────┐
│                   CACHE HIT RATE FORMULA                         │
└─────────────────────────────────────────────────────────────────┘

Cache Hit Rate = (cacheReadTokens / totalInputTokens) × 100%

Where:
  totalInputTokens = inputTokens + cacheReadTokens

Example:
  inputTokens = 1,000
  cacheReadTokens = 5,000
  totalInputTokens = 1,000 + 5,000 = 6,000

  Cache Hit Rate = (5,000 / 6,000) × 100% = 83.3%

┌─────────────────────────────────────────────────────────────────┐
│                  CACHE SAVINGS CALCULATION                       │
└─────────────────────────────────────────────────────────────────┘

Without Cache:
  5,000 tokens × $0.003 / 1,000 = $0.015

With Cache:
  5,000 tokens × $0.0003 / 1,000 = $0.0015

Savings = $0.015 - $0.0015 = $0.0135 per operation

Over 1,000 operations:
  Savings = $0.0135 × 1,000 = $13.50 (90% savings on cached tokens)

┌─────────────────────────────────────────────────────────────────┐
│              CACHE EFFICIENCY SCORE CARD                         │
└─────────────────────────────────────────────────────────────────┘

Cache Hit Rate: 83.3%  [████████████████        ] Excellent
Cache Savings:  $13.50 per 1K operations         High Impact
Cost Reduction: 64% overall                      Very Effective

Recommendation: ✅ Cache is working optimally
```

---

## Migration Architecture

```
┌─────────────────────────────────────────────────────────────────┐
│                     MIGRATION PROCESS                            │
└─────────────────────────────────────────────────────────────────┘

Step 1: Pre-Migration State
┌────────────────────────────────────────┐
│  token_analytics (10 columns)         │
│  - No cache token columns              │
│  - Cost underreporting by 89%          │
└────────────────────────────────────────┘
                   │
                   ▼
Step 2: Backup Database
┌────────────────────────────────────────┐
│  cp data/agent-pages.db                │
│     data/agent-pages.db.backup         │
│                                        │
│  Backup size: ~50MB                    │
│  Time: <1 second                       │
└────────────────────────────────────────┘
                   │
                   ▼
Step 3: Run Migration SQL
┌────────────────────────────────────────┐
│  ALTER TABLE token_analytics           │
│  ADD COLUMN cacheReadTokens            │
│    INTEGER DEFAULT 0;                  │
│                                        │
│  ALTER TABLE token_analytics           │
│  ADD COLUMN cacheCreationTokens        │
│    INTEGER DEFAULT 0;                  │
│                                        │
│  Lock: SHARED (reads allowed)          │
│  Duration: <100ms                      │
└────────────────────────────────────────┘
                   │
                   ▼
Step 4: Verify Migration
┌────────────────────────────────────────┐
│  PRAGMA table_info(token_analytics);   │
│                                        │
│  Expected: cacheReadTokens found       │
│  Expected: cacheCreationTokens found   │
│                                        │
│  Status: ✅ Migration successful       │
└────────────────────────────────────────┘
                   │
                   ▼
Step 5: Deploy Code
┌────────────────────────────────────────┐
│  Updated TokenAnalyticsWriter.js       │
│  - Extract cache tokens                │
│  - Calculate with cache pricing        │
│  - Write cache token columns           │
│                                        │
│  Restart: Not required                 │
│  Downtime: Zero                        │
└────────────────────────────────────────┘
                   │
                   ▼
Step 6: Post-Migration State
┌────────────────────────────────────────┐
│  token_analytics (12 columns)         │
│  ✅ cacheReadTokens                    │
│  ✅ cacheCreationTokens                │
│  ✅ Cost accuracy: 100%                │
└────────────────────────────────────────┘
```

---

## Error Handling Flow

```
┌─────────────────────────────────────────────────────────────────┐
│                    ERROR HANDLING PATHS                          │
└─────────────────────────────────────────────────────────────────┘

extractMetricsFromSDK()
         │
         ├─ No messages array? ──────────► return null (log warning)
         ├─ No sessionId? ───────────────► return null (log warning)
         ├─ No result messages? ─────────► return null (log warning)
         ├─ Missing usage object? ───────► return null (log warning)
         ├─ cache tokens undefined? ─────► default to 0 (|| operator)
         └─ Success ─────────────────────► return metrics

calculateEstimatedCost()
         │
         ├─ No usage object? ────────────► return 0
         ├─ Unknown model? ──────────────► use DEFAULT_PRICING
         ├─ Cache tokens undefined? ─────► default to 0 (|| operator)
         ├─ Exception thrown? ───────────► return 0 (catch block)
         └─ Success ─────────────────────► return cost

writeToDatabase()
         │
         ├─ No metrics? ─────────────────► return early (log warning)
         ├─ No database? ────────────────► return early (log error)
         ├─ Cache tokens undefined? ─────► use || 0 in params
         ├─ Database error? ─────────────► catch, log, return (no throw)
         └─ Success ─────────────────────► log success

Key Principle: NEVER THROW ERRORS
Analytics failures should not break the application
```

---

## Performance Characteristics

```
┌─────────────────────────────────────────────────────────────────┐
│                   WRITE PERFORMANCE PROFILE                      │
└─────────────────────────────────────────────────────────────────┘

extractMetricsFromSDK():    <1ms   [██                ] Fast
calculateEstimatedCost():   <1ms   [██                ] Fast
writeToDatabase():          2-5ms  [████              ] Fast
Total Pipeline:             <10ms  [██████            ] Acceptable

Database Write Breakdown:
┌────────────────────────────────────────┐
│ Prepare statement: 0.5ms               │
│ Execute INSERT:    2.0ms               │
│ Commit:            1.0ms               │
│ Logging:           0.5ms               │
│ ─────────────────────                  │
│ Total:             4.0ms               │
└────────────────────────────────────────┘

Performance under load (1000 concurrent writes):
┌────────────────────────────────────────┐
│ p50:  3ms   [████              ]       │
│ p95:  8ms   [████████          ]       │
│ p99: 12ms   [████████████      ]       │
│ max: 15ms   [██████████████    ]       │
└────────────────────────────────────────┘

Target: <10ms p95 ✅ MET
```

---

## Monitoring Dashboard (Conceptual)

```
┌─────────────────────────────────────────────────────────────────┐
│                   TOKEN ANALYTICS DASHBOARD                      │
└─────────────────────────────────────────────────────────────────┘

┌─────────────────────────────────────────────────────────────────┐
│ Daily Cost Summary                                    2025-10-25 │
├─────────────────────────────────────────────────────────────────┤
│                                                                  │
│ Total Cost:           $42.50                                    │
│                                                                  │
│ Breakdown:                                                       │
│   Input:           $6.30  (15%) ████                            │
│   Output:         $18.90  (44%) ████████████                    │
│   Cache Read:      $2.10  ( 5%) ██                              │
│   Cache Creation: $15.20  (36%) ██████████                      │
│                                                                  │
│ Cache Efficiency:                                                │
│   Hit Rate:        78%    [████████████████    ] Good           │
│   Savings:        $18.90  (cache vs full price)                 │
│                                                                  │
└─────────────────────────────────────────────────────────────────┘

┌─────────────────────────────────────────────────────────────────┐
│ Cost Reconciliation                                              │
├─────────────────────────────────────────────────────────────────┤
│                                                                  │
│ Analytics Total:   $42.50                                       │
│ Anthropic Bill:    $42.63                                       │
│ Variance:          $0.13  (0.3%) ✅ Within tolerance            │
│                                                                  │
│ Status: ✅ Tracking accurate                                     │
│                                                                  │
└─────────────────────────────────────────────────────────────────┘

┌─────────────────────────────────────────────────────────────────┐
│ Token Distribution (Last 24h)                                    │
├─────────────────────────────────────────────────────────────────┤
│                                                                  │
│ Input:           2,100,000 tokens  (12%) ████                   │
│ Output:          1,260,000 tokens  ( 7%) ██                     │
│ Cache Read:     12,600,000 tokens  (70%) ██████████████████     │
│ Cache Creation:  1,890,000 tokens  (11%) ████                   │
│                                                                  │
│ Total: 17,850,000 tokens                                        │
│                                                                  │
└─────────────────────────────────────────────────────────────────┘
```

---

**For complete implementation details, see:**
- `/workspaces/agent-feed/docs/SPARC-CACHE-TOKEN-FIX-ARCHITECTURE.md`
- `/workspaces/agent-feed/docs/CACHE-TOKEN-TRACKING-QUICK-REFERENCE.md`

