# Claude SDK Analytics: Cost Display Conversion Specification

**Document Version:** 1.0
**Date:** 2025-09-30
**Status:** Draft

---

## Executive Summary

This specification details the changes required to convert the Claude SDK Analytics cost display from cents to dollars throughout the system. The database already stores costs in dollars, but the API multiplies by 100 to convert to cents, and the frontend displays "Cost (cents)". This conversion will remove the unnecessary multiplication and update all displays to show dollar amounts.

---

## Current System State

### Database Layer
- **Storage Format:** Dollars (decimal values, e.g., 0.111522)
- **Column:** `token_analytics.estimatedCost` (REAL type)
- **Example Value:** 0.111522 (stored as dollars)

### API Layer (server.js)
- **Current Behavior:** Multiplies database values by 100 to convert to cents
- **Output Format:** Integer cents (e.g., 11)
- **Example:** DB value 0.111522 → API returns 11 cents

### Frontend Layer
- **Display Label:** "Cost (cents)"
- **Processing:** Expects integer cent values from API
- **Display Format:** Converts back to dollars for display using `(cents / 100).toFixed(4)`

---

## Required Changes Overview

| Component | Current | After Change |
|-----------|---------|--------------|
| Database | `0.111522` (dollars) | `0.111522` (dollars) - NO CHANGE |
| API Response | `11` (cents) | `0.111522` (dollars) |
| Frontend Label | "Cost (cents)" | "Cost ($)" |
| Display Format | `$0.0111` | `$0.1115` |

---

## API Changes (server.js)

### File: `/workspaces/agent-feed/api-server/server.js`

#### Change 1: /api/token-analytics/hourly Endpoint

**Line 430:** Current SQL query with multiplication
```sql
ROUND(SUM(estimatedCost) * 100) as total_cost
```

**Change To:**
```sql
SUM(estimatedCost) as total_cost
```

**Location:** Lines 425-435
**Impact:** Hourly aggregation endpoint
**Response Field:** `total_cost` in chart datasets

---

#### Change 2: /api/token-analytics/daily Endpoint

**Line 507:** Current SQL query with multiplication
```sql
ROUND(SUM(estimatedCost) * 100) as total_cost
```

**Change To:**
```sql
SUM(estimatedCost) as total_cost
```

**Location:** Lines 502-512
**Impact:** Daily aggregation endpoint
**Response Field:** `total_cost` in chart datasets

---

#### Change 3: /api/token-analytics/messages Endpoint

**Line 596:** Current SQL query with casting and multiplication
```sql
CAST(estimatedCost * 100 AS INTEGER) as cost_total
```

**Change To:**
```sql
estimatedCost as cost_total
```

**Location:** Lines 584-611
**Impact:** Individual message records
**Response Field:** `cost_total` for each message

---

#### Change 4: /api/token-analytics/summary Endpoint

**Line 696:** Current SQL query with multiplication
```sql
ROUND(SUM(estimatedCost) * 100) as total_cost
```

**Change To:**
```sql
SUM(estimatedCost) as total_cost
```

**Location:** Lines 692-701
**Impact:** Summary statistics
**Response Field:** `summary.total_cost`

---

**Line 715:** Current SQL query for model stats
```sql
ROUND(SUM(estimatedCost) * 100) as cost
```

**Change To:**
```sql
SUM(estimatedCost) as cost
```

**Location:** Lines 710-719
**Impact:** Model-level cost aggregation
**Response Field:** `by_model[].cost`

---

#### Change 5: /api/token-analytics/export Endpoint

**Line 801:** Current SQL query with multiplication
```sql
ROUND(SUM(estimatedCost) * 100) as total_cost
```

**Change To:**
```sql
SUM(estimatedCost) as total_cost
```

**Location:** Lines 798-808
**Impact:** CSV export data
**CSV Column:** "Daily Cost (cents)" → "Daily Cost ($)"

**Line 813:** Current CSV header
```javascript
const headers = ['Date', 'Daily Cost (cents)', 'Daily Requests', 'Daily Tokens'];
```

**Change To:**
```javascript
const headers = ['Date', 'Daily Cost ($)', 'Daily Requests', 'Daily Tokens'];
```

**Location:** Line 813

---

## Frontend Changes

### File: `/workspaces/agent-feed/frontend/src/components/TokenAnalyticsDashboard.tsx`

#### Change 6: Interface Type Definitions

**Lines 60, 70:** Update comments for cost fields
```typescript
cost_total: number; // cents
```

**Change To:**
```typescript
cost_total: number; // dollars
```

**Locations:**
- Line 60: `TokenUsageRecord` interface
- Line 70: `UsageSummary` interface

---

#### Change 7: Chart Configuration - Daily Chart Y-Axis

**Line 399:** Current y-axis label
```typescript
text: 'Cost (cents)',
```

**Change To:**
```typescript
text: 'Cost ($)',
```

**Location:** Line 399
**Impact:** Chart axis label display

---

#### Change 8: Chart Dataset Labels

**Line 460:** Hourly chart dataset label
```typescript
label: 'Cost (cents)',
```

**Change To:**
```typescript
label: 'Cost ($)',
```

**Location:** Line 460

---

**Line 537:** Daily chart dataset label
```typescript
label: 'Daily Cost (cents)',
```

**Change To:**
```typescript
label: 'Daily Cost ($)',
```

**Location:** Line 537

---

#### Change 9: Message Display Format

**Line 524:** Cost display in message list
```typescript
<span>${((message.cost_total || 0) / 100).toFixed(4)}</span>
```

**Change To:**
```typescript
<span>${(message.cost_total || 0).toFixed(4)}</span>
```

**Location:** Line 524
**Impact:** Individual message cost display
**Note:** Remove division by 100

---

#### Change 10: formatCurrency Function

**Line 597:** Currency formatting function
```typescript
const formatCurrency = (cents: number) => `$${(cents / 100).toFixed(4)}`;
```

**Change To:**
```typescript
const formatCurrency = (dollars: number) => `$${dollars.toFixed(4)}`;
```

**Location:** Line 597
**Impact:** All summary card displays

---

## Test Changes

All test files in `/workspaces/agent-feed/api-server/tests/` need updates:

### Files to Update:
1. `token-analytics-enhancements.test.js`
2. `token-analytics-validation.test.js`
3. `token-analytics-real-data.test.js`
4. `token-analytics-queries.test.js`

### Test Change Pattern:

**Current Test Expectation:**
```javascript
// API returns cents
expect(response.body.data[0].total_cost).toBe(11); // cents
expect(summary.total_cost).toBe(expectedCostCents);
```

**Change To:**
```javascript
// API returns dollars
expect(response.body.data[0].total_cost).toBeCloseTo(0.11, 2); // dollars
expect(summary.total_cost).toBeCloseTo(expectedCostDollars, 4);
```

### Specific Test Updates:

#### SQL Query Updates in Tests
All test SQL queries with cost multiplication need updating:

**Current:**
```sql
CAST(estimatedCost * 100 AS INTEGER) as cost_total
ROUND(SUM(estimatedCost) * 100) as total_cost
SUM(estimatedCost) * 100 as total_cost
```

**Change To:**
```sql
estimatedCost as cost_total
SUM(estimatedCost) as total_cost
SUM(estimatedCost) as total_cost
```

#### Assertion Updates
**Current:**
```javascript
expect(Number.isInteger(summary.total_cost)).toBe(true); // cents are integers
expect(message.cost_total).toBe(11);
```

**Change To:**
```javascript
expect(typeof summary.total_cost).toBe('number'); // dollars are decimals
expect(message.cost_total).toBeCloseTo(0.11, 2);
```

---

## Sample Data Transformations

### Example 1: Message Cost
| Stage | Current | After Change |
|-------|---------|--------------|
| Database | 0.111522 | 0.111522 |
| API Response | 11 | 0.111522 |
| Frontend Display | $0.0011 | $0.1115 |

### Example 2: Daily Aggregation
| Stage | Current | After Change |
|-------|---------|--------------|
| Database (5 messages) | 0.55761 total | 0.55761 total |
| API Response | 56 | 0.55761 |
| Frontend Display | $0.56 | $0.5576 |

### Example 3: Summary Cost
| Stage | Current | After Change |
|-------|---------|--------------|
| Database (total) | 1.23456 | 1.23456 |
| API Response | 123 | 1.23456 |
| Frontend Display | $1.23 | $1.2346 |

---

## Data Type Considerations

### Current Data Types
- **API Response:** Integer (cents)
- **JSON:** `12` → easily serializable
- **Precision:** Lost after decimal point (11 cents from 0.111522)

### New Data Types
- **API Response:** Float (dollars)
- **JSON:** `0.111522` → natively supported
- **Precision:** Preserved (4-6 decimal places)

### Compatibility
- All modern JSON parsers support floating-point numbers
- No breaking changes to data structure
- Improved precision and accuracy

---

## Validation & Testing Strategy

### Pre-Deployment Validation
1. **Unit Tests:** Update all cost-related assertions
2. **Integration Tests:** Verify end-to-end data flow
3. **SQL Validation:** Test queries return dollar values
4. **Frontend Rendering:** Verify correct display format

### Test Data Set
Use consistent test data across all tests:
```javascript
const testCosts = {
  db: 0.111522,        // dollars in database
  api: 0.111522,       // dollars in API response (NEW)
  display: "$0.1115"   // formatted display (NEW)
};
```

### Regression Testing
- Compare total costs before/after conversion
- Verify aggregations match database totals
- Ensure export files contain correct values

---

## Rollback Plan

If issues arise, rollback requires reverting:

1. **API Changes:** Restore multiplication by 100
2. **Frontend Labels:** Restore "(cents)" labels
3. **Frontend Calculations:** Restore division by 100
4. **Test Updates:** Restore cent-based assertions

**Rollback SQL Pattern:**
```sql
-- Revert to cents
ROUND(SUM(estimatedCost) * 100) as total_cost
CAST(estimatedCost * 100 AS INTEGER) as cost_total
```

---

## Migration Checklist

- [ ] **API Changes (5 SQL queries)**
  - [ ] Line 430: `/hourly` endpoint
  - [ ] Line 507: `/daily` endpoint
  - [ ] Line 596: `/messages` endpoint
  - [ ] Line 696: `/summary` endpoint (main query)
  - [ ] Line 715: `/summary` endpoint (model stats)
  - [ ] Line 801: `/export` endpoint
  - [ ] Line 813: Export CSV header

- [ ] **Frontend Changes**
  - [ ] Lines 60, 70: Update type comments
  - [ ] Line 399: Update y-axis label
  - [ ] Line 460: Update hourly chart label
  - [ ] Line 537: Update daily chart label
  - [ ] Line 524: Remove division by 100
  - [ ] Line 597: Update formatCurrency function

- [ ] **Test Updates**
  - [ ] Update SQL queries in all test files
  - [ ] Update cost assertions (integers → decimals)
  - [ ] Update toBeCloseTo() precision arguments
  - [ ] Update mock data generators

- [ ] **Validation**
  - [ ] Run all unit tests
  - [ ] Run integration tests
  - [ ] Manual UI testing
  - [ ] Compare totals before/after

---

## Summary Statistics

| Metric | Count |
|--------|-------|
| Total API Changes | 7 locations |
| Total Frontend Changes | 6 locations |
| Total Test Files | 4 files |
| SQL Query Updates | 6 queries |
| Label Updates | 4 labels |
| Code Precision Improvements | Cents (2 decimals) → Dollars (4-6 decimals) |

---

## Expected Outcomes

### Accuracy Improvements
- **Current Precision Loss:** 0.111522 → 11 cents → $0.11 (loses 0.001522)
- **New Precision:** 0.111522 → $0.1115 (preserves accuracy)

### Display Improvements
- **Clearer Labels:** "Cost ($)" vs "Cost (cents)"
- **Standard Format:** Aligns with industry practice
- **Better UX:** Users see actual dollar costs

### Code Simplification
- **Removed Operations:** 6 multiplication operations
- **Removed Conversions:** 1 division in frontend
- **Simplified Logic:** Direct passthrough from DB to display

---

## Contact & Review

**Technical Lead:** [Name]
**Reviewer:** [Name]
**Approval Required:** Product Manager, Tech Lead

**Questions/Issues:** Open GitHub issue or contact development team

---

**END OF SPECIFICATION**
