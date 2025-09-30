# Claude SDK Analytics Enhancement Specification

## Document Information
- **Version**: 1.0
- **Date**: 2025-09-30
- **Status**: Draft for Implementation

---

## Executive Summary

This specification defines enhancements to the Claude SDK Analytics Dashboard to:
1. Add cost data visualization to the "Daily Usage (Last 30 Days)" chart
2. Increase recent messages display from 50 to 100 messages
3. Remove date filtering from messages to show all messages regardless of date

---

## 1. Current State Analysis

### 1.1 Database Schema
```sql
CREATE TABLE token_analytics (
    id TEXT PRIMARY KEY,
    timestamp TEXT NOT NULL,
    sessionId TEXT NOT NULL,
    operation TEXT NOT NULL,
    inputTokens INTEGER NOT NULL,
    outputTokens INTEGER NOT NULL,
    totalTokens INTEGER NOT NULL,
    estimatedCost REAL NOT NULL,        -- Stored in DOLLARS
    model TEXT NOT NULL,
    userId TEXT,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP
);
```

**Current Data**:
- 20 records total
- Date range: 2025-09-20
- Total cost: $0.111522
- Average cost per request: $0.0055761

### 1.2 Daily Endpoint (Lines 488-553)

**Current Behavior**:
- **Endpoint**: `GET /api/token-analytics/daily`
- **Query Parameter**: `days` (default: 30)
- **SQL Query**:
```sql
SELECT
  DATE(timestamp) as date,
  SUM(totalTokens) as total_tokens,
  COUNT(*) as total_requests,
  ROUND(SUM(estimatedCost) * 100) as total_cost  -- Converts $ to cents
FROM token_analytics
WHERE DATE(timestamp) >= DATE('now', '-${days} days')
GROUP BY DATE(timestamp)
ORDER BY date
```

**Current Response Format**:
```json
{
  "success": true,
  "data": {
    "labels": ["2025-09-20", "2025-09-21", ...],
    "datasets": [
      {
        "label": "Daily Tokens",
        "data": [12345, 23456, ...],
        "backgroundColor": "rgba(99, 102, 241, 0.5)",
        "yAxisID": "y"
      },
      {
        "label": "Daily Requests",
        "data": [10, 15, ...],
        "backgroundColor": "rgba(34, 197, 94, 0.5)",
        "yAxisID": "y1"
      }
    ]
  },
  "raw_data": [...],
  "timestamp": "..."
}
```

**Issue**: Cost data is calculated in SQL (`total_cost` in `raw_data`) but NOT included in the chart datasets.

### 1.3 Messages Endpoint (Lines 556-657)

**Current Behavior**:
- **Endpoint**: `GET /api/token-analytics/messages`
- **Query Parameters**:
  - `limit` (default: 50, max: 100)
  - `offset` (default: 0)
  - `provider` (optional filter)
  - `model` (optional filter)
- **No date filtering** in SQL query (already "regardless of date")

**Frontend Call** (Line 228):
```typescript
const response = await fetch(`${API_BASE}/messages?limit=50`);
```

---

## 2. Requirements

### FR-001: Add Cost to Daily Chart
**Priority**: HIGH
**Description**: Display daily cost data on the "Daily Usage (Last 30 Days)" chart alongside tokens and requests.

**Acceptance Criteria**:
- [ ] Cost dataset appears in daily chart
- [ ] Cost values displayed in dollars (not cents)
- [ ] Cost uses a third Y-axis (y2) on the right side
- [ ] Cost bars have distinct color (purple/pink theme)
- [ ] Tooltip shows formatted cost ($0.0123 format)
- [ ] Chart legend includes "Daily Cost ($)"
- [ ] Cost data aligns correctly with dates

### FR-002: Increase Message Limit
**Priority**: MEDIUM
**Description**: Change recent messages to display last 100 messages instead of 50.

**Acceptance Criteria**:
- [ ] Frontend requests 100 messages by default
- [ ] All 100 messages render without performance issues
- [ ] Pagination/offset still works correctly
- [ ] Search functionality works with 100 messages

### FR-003: Remove Date Filtering
**Priority**: LOW (Already Implemented)
**Description**: Messages should show regardless of date.

**Acceptance Criteria**:
- [ ] Verify no date filters in messages query
- [ ] Verify all historical data is accessible

---

## 3. Proposed Implementation

### 3.1 Backend Changes (server.js)

#### Change 1: Update Daily Endpoint Dataset Response

**File**: `/workspaces/agent-feed/api-server/server.js`
**Location**: Lines 516-537

**Current Code**:
```javascript
const chartData = {
  labels: dailyData.map(d => d.date),
  datasets: [
    {
      label: 'Daily Tokens',
      data: dailyData.map(d => d.total_tokens),
      backgroundColor: 'rgba(99, 102, 241, 0.5)',
      borderColor: 'rgb(99, 102, 241)',
      borderWidth: 1,
      yAxisID: 'y'
    },
    {
      label: 'Daily Requests',
      data: dailyData.map(d => d.total_requests),
      backgroundColor: 'rgba(34, 197, 94, 0.5)',
      borderColor: 'rgb(34, 197, 94)',
      borderWidth: 1,
      yAxisID: 'y1'
    }
  ]
};
```

**Proposed Code**:
```javascript
const chartData = {
  labels: dailyData.map(d => d.date),
  datasets: [
    {
      label: 'Daily Tokens',
      data: dailyData.map(d => d.total_tokens),
      backgroundColor: 'rgba(99, 102, 241, 0.5)',
      borderColor: 'rgb(99, 102, 241)',
      borderWidth: 1,
      yAxisID: 'y'
    },
    {
      label: 'Daily Requests',
      data: dailyData.map(d => d.total_requests),
      backgroundColor: 'rgba(34, 197, 94, 0.5)',
      borderColor: 'rgb(34, 197, 94)',
      borderWidth: 1,
      yAxisID: 'y1'
    },
    {
      label: 'Daily Cost ($)',
      data: dailyData.map(d => (d.total_cost / 100).toFixed(4)), // Convert cents to dollars
      backgroundColor: 'rgba(168, 85, 247, 0.5)',
      borderColor: 'rgb(168, 85, 247)',
      borderWidth: 1,
      yAxisID: 'y2'
    }
  ]
};
```

**Rationale**:
- Uses purple color scheme (`rgba(168, 85, 247)`) to match design system
- Converts cents to dollars for readability
- Maps to new y2 axis for cost scale

#### Change 2: No SQL Changes Needed

The SQL query already includes cost calculation:
```sql
ROUND(SUM(estimatedCost) * 100) as total_cost
```

This correctly converts dollars (stored) to cents (API response).

---

### 3.2 Frontend Changes (TokenAnalyticsDashboard.tsx)

#### Change 1: Update Chart Configuration

**File**: `/workspaces/agent-feed/frontend/src/components/TokenAnalyticsDashboard.tsx`
**Location**: Lines 344-393

**Current Code**:
```typescript
const dailyChartOptions: ChartOptions<'bar'> = {
  responsive: true,
  maintainAspectRatio: false,
  interaction: {
    mode: 'index' as const,
    intersect: false,
  },
  plugins: {
    legend: {
      position: 'top' as const,
    },
    title: {
      display: false,
    },
    tooltip: {
      mode: 'index',
      intersect: false,
    },
  },
  scales: {
    x: {
      title: {
        display: true,
        text: 'Date',
      },
    },
    y: {
      type: 'linear' as const,
      title: {
        display: true,
        text: 'Tokens',
      },
      beginAtZero: true,
    },
    y1: {
      type: 'linear' as const,
      display: true,
      position: 'right' as const,
      title: {
        display: true,
        text: 'Requests',
      },
      grid: {
        drawOnChartArea: false,
      },
      beginAtZero: true,
    },
  },
};
```

**Proposed Code**:
```typescript
const dailyChartOptions: ChartOptions<'bar'> = {
  responsive: true,
  maintainAspectRatio: false,
  interaction: {
    mode: 'index' as const,
    intersect: false,
  },
  plugins: {
    legend: {
      position: 'top' as const,
    },
    title: {
      display: false,
    },
    tooltip: {
      mode: 'index',
      intersect: false,
      callbacks: {
        label: function(context) {
          let label = context.dataset.label || '';
          if (label) {
            label += ': ';
          }
          if (context.dataset.yAxisID === 'y2') {
            // Format cost with $ prefix
            label += '$' + parseFloat(context.parsed.y).toFixed(4);
          } else {
            label += context.parsed.y.toLocaleString();
          }
          return label;
        }
      }
    },
  },
  scales: {
    x: {
      title: {
        display: true,
        text: 'Date',
      },
    },
    y: {
      type: 'linear' as const,
      display: true,
      position: 'left' as const,
      title: {
        display: true,
        text: 'Tokens',
      },
      beginAtZero: true,
    },
    y1: {
      type: 'linear' as const,
      display: true,
      position: 'right' as const,
      title: {
        display: true,
        text: 'Requests',
      },
      grid: {
        drawOnChartArea: false,
      },
      beginAtZero: true,
    },
    y2: {
      type: 'linear' as const,
      display: true,
      position: 'right' as const,
      title: {
        display: true,
        text: 'Cost ($)',
      },
      grid: {
        drawOnChartArea: false,
      },
      beginAtZero: true,
      ticks: {
        callback: function(value) {
          return '$' + parseFloat(value as string).toFixed(4);
        }
      }
    },
  },
};
```

**Rationale**:
- Adds `y2` axis for cost display
- Custom tooltip formatter for cost values
- Custom tick formatter to show $ prefix
- Maintains grid separation for readability

#### Change 2: Update Messages Query Limit

**File**: `/workspaces/agent-feed/frontend/src/components/TokenAnalyticsDashboard.tsx`
**Location**: Line 228

**Current Code**:
```typescript
const response = await fetch(`${API_BASE}/messages?limit=50`);
```

**Proposed Code**:
```typescript
const response = await fetch(`${API_BASE}/messages?limit=100`);
```

**Rationale**:
- Simple parameter change
- Backend already supports up to 100 (line 570: `Math.min(parseInt(req.query.limit) || 50, 100)`)
- No additional backend changes needed

#### Change 3: Update Interface for Cost Dataset

**File**: `/workspaces/agent-feed/frontend/src/components/TokenAnalyticsDashboard.tsx`
**Location**: Lines 77-87 (ChartData interface)

**No changes needed** - The interface is already flexible:
```typescript
interface ChartData {
  labels: string[];
  datasets: Array<{
    label: string;
    data: number[];
    backgroundColor: string;
    borderColor?: string;
    borderWidth?: number;
    yAxisID?: string;  // Already supports multiple axes
  }>;
}
```

---

## 4. Data Flow Diagram

```
┌─────────────────────────────────────────────────────────────┐
│ Database: token_analytics                                    │
│ - estimatedCost REAL (in dollars)                           │
└─────────────────────┬───────────────────────────────────────┘
                      │
                      │ SQL Query
                      │ ROUND(SUM(estimatedCost) * 100)
                      ▼
┌─────────────────────────────────────────────────────────────┐
│ Backend: /api/token-analytics/daily                         │
│ - raw_data: { total_cost: 1234 } (cents)                   │
│ - datasets[2]: { data: [12.34, 23.45] } (dollars)          │
└─────────────────────┬───────────────────────────────────────┘
                      │
                      │ HTTP Response
                      │ JSON with 3 datasets
                      ▼
┌─────────────────────────────────────────────────────────────┐
│ Frontend: TokenAnalyticsDashboard.tsx                       │
│ - Chart.js renders 3 bar series                            │
│ - y2 axis displays cost in dollars                         │
│ - Tooltip formats: "$0.0123"                                │
└─────────────────────────────────────────────────────────────┘
```

---

## 5. Visual Design Specification

### 5.1 Daily Chart Layout

```
┌──────────────────────────────────────────────────────────────┐
│ Daily Usage (Last 30 Days)                                   │
├──────────────────────────────────────────────────────────────┤
│                                                              │
│  [Tokens]  [Requests]  [Cost ($)]                          │
│                                                              │
│     ║                                                    ║   │
│ 15k ║ ██                                                 ║ 30│
│     ║ ██                                                 ║   │
│ 10k ║ ██  ██                                            ║ 20│
│     ║ ██  ██  ██                                        ║   │
│  5k ║ ██  ██  ██  ██                                    ║ 10│
│     ║ ██  ██  ██  ██                                    ║   │
│   0 ╠═══════════════════════════════════════════════════╣  0│
│     09/20  09/21  09/22  09/23  ...                        │
│                                                              │
│     Tokens ←                    → Requests                   │
│                                 → Cost ($)                   │
└──────────────────────────────────────────────────────────────┘
```

### 5.2 Color Scheme

| Dataset | Color | RGBA |
|---------|-------|------|
| Tokens | Blue | `rgba(99, 102, 241, 0.5)` |
| Requests | Green | `rgba(34, 197, 94, 0.5)` |
| **Cost** | **Purple** | **`rgba(168, 85, 247, 0.5)`** |

### 5.3 Axis Configuration

| Axis | Position | Label | Data Type | Format |
|------|----------|-------|-----------|--------|
| y | Left | Tokens | Integer | 1,234 |
| y1 | Right | Requests | Integer | 123 |
| **y2** | **Right** | **Cost ($)** | **Float** | **$0.0123** |

**Note**: y1 and y2 will both be on the right side. Chart.js will automatically offset them.

---

## 6. Test Requirements

### 6.1 Backend Tests

**Test File**: `/workspaces/agent-feed/api-server/tests/token-analytics-daily-cost.test.js` (NEW)

```javascript
describe('Daily Analytics Endpoint - Cost Data', () => {
  test('should include cost dataset in response', async () => {
    const response = await request(app).get('/api/token-analytics/daily');
    expect(response.status).toBe(200);
    expect(response.body.data.datasets).toHaveLength(3);
    expect(response.body.data.datasets[2].label).toBe('Daily Cost ($)');
  });

  test('should convert cost from cents to dollars', async () => {
    const response = await request(app).get('/api/token-analytics/daily');
    const costDataset = response.body.data.datasets[2];

    // All values should be strings representing dollar amounts
    costDataset.data.forEach(value => {
      expect(typeof value).toBe('string');
      expect(parseFloat(value)).toBeGreaterThanOrEqual(0);
    });
  });

  test('should assign cost to y2 axis', async () => {
    const response = await request(app).get('/api/token-analytics/daily');
    expect(response.body.data.datasets[2].yAxisID).toBe('y2');
  });

  test('should maintain correct cost calculation', async () => {
    const response = await request(app).get('/api/token-analytics/daily');
    const rawData = response.body.raw_data;
    const chartData = response.body.data.datasets[2].data;

    rawData.forEach((raw, index) => {
      const expectedDollars = (raw.total_cost / 100).toFixed(4);
      expect(chartData[index]).toBe(expectedDollars);
    });
  });
});
```

### 6.2 Frontend Tests

**Test File**: `/workspaces/agent-feed/frontend/tests/e2e/claude-sdk-daily-cost.spec.ts` (NEW)

```typescript
import { test, expect } from '@playwright/test';

test.describe('Daily Cost Chart', () => {
  test('should display cost dataset in daily chart', async ({ page }) => {
    await page.goto('/');
    await page.click('text=Token Analytics');

    // Wait for daily chart to load
    await page.waitForSelector('text=Daily Usage (Last 30 Days)');

    // Check legend includes cost
    await expect(page.locator('text=Daily Cost ($)')).toBeVisible();
  });

  test('should show cost in tooltip', async ({ page }) => {
    await page.goto('/');
    await page.click('text=Token Analytics');

    // Hover over a bar in the daily chart
    const chart = page.locator('.bg-white:has-text("Daily Usage")');
    const canvas = chart.locator('canvas');
    await canvas.hover({ position: { x: 100, y: 100 } });

    // Tooltip should show cost with $ prefix
    await expect(page.locator('text=/\\$\\d+\\.\\d{4}/')).toBeVisible();
  });

  test('should display y2 axis for cost', async ({ page }) => {
    await page.goto('/');
    await page.click('text=Token Analytics');

    // Check for Cost ($) axis label
    await expect(page.locator('text=Cost ($)')).toBeVisible();
  });
});

test.describe('Messages Limit', () => {
  test('should load 100 messages', async ({ page }) => {
    await page.goto('/');
    await page.click('text=Token Analytics');

    // Wait for messages to load
    await page.waitForSelector('text=Recent Messages');

    // Count message rows (note: actual count may be less if < 100 in DB)
    const messageRows = await page.locator('.hover\\:bg-gray-50').count();

    // Should request 100 (may return fewer if less data)
    expect(messageRows).toBeLessThanOrEqual(100);
  });
});
```

### 6.3 Integration Tests

**Test Scenarios**:

1. **Empty Database**
   - Daily chart should show empty state
   - No cost data should cause errors

2. **Single Day Data**
   - Cost bar should display correctly
   - All three axes should scale appropriately

3. **30 Days Data**
   - All datasets should align by date
   - Cost values should match raw data

4. **Cost Precision**
   - Values under $0.01 should display correctly
   - Values over $1.00 should display correctly

---

## 7. Validation Criteria

### 7.1 Functional Validation

- [ ] **FR-001.1**: Daily chart displays three datasets (Tokens, Requests, Cost)
- [ ] **FR-001.2**: Cost values are in dollars, not cents
- [ ] **FR-001.3**: Cost bars use purple color scheme
- [ ] **FR-001.4**: Cost axis labeled "Cost ($)" on right side
- [ ] **FR-001.5**: Tooltip shows cost formatted as "$0.0123"
- [ ] **FR-001.6**: Legend shows "Daily Cost ($)"
- [ ] **FR-002.1**: Messages endpoint requests limit=100
- [ ] **FR-002.2**: Frontend displays up to 100 messages
- [ ] **FR-003.1**: No date filtering in messages query

### 7.2 Visual Validation

- [ ] **V-001**: Cost bars visible and distinct from other datasets
- [ ] **V-002**: All three axes labeled correctly
- [ ] **V-003**: Chart scales automatically for different cost ranges
- [ ] **V-004**: No visual overlap between datasets
- [ ] **V-005**: Tooltip readable with all three values

### 7.3 Browser Compatibility

Test in:
- [ ] Chrome 120+ (primary)
- [ ] Firefox 120+
- [ ] Safari 17+
- [ ] Edge 120+

### 7.4 Performance Validation

- [ ] **P-001**: Chart renders in < 1 second
- [ ] **P-002**: 100 messages render without lag
- [ ] **P-003**: Hover interactions remain smooth
- [ ] **P-004**: No memory leaks after 5 minutes

---

## 8. Rollback Plan

### 8.1 Backend Rollback

If issues occur, revert to two-dataset response:

```javascript
// Remove this dataset:
{
  label: 'Daily Cost ($)',
  data: dailyData.map(d => (d.total_cost / 100).toFixed(4)),
  backgroundColor: 'rgba(168, 85, 247, 0.5)',
  borderColor: 'rgb(168, 85, 247)',
  borderWidth: 1,
  yAxisID: 'y2'
}
```

### 8.2 Frontend Rollback

If chart rendering breaks:
1. Remove `y2` axis configuration from `dailyChartOptions`
2. Remove custom tooltip callback
3. Revert messages limit to 50

---

## 9. Implementation Checklist

### Phase 1: Backend Changes
- [ ] Update `/api/token-analytics/daily` dataset response (server.js lines 516-537)
- [ ] Add third dataset with cost data
- [ ] Test endpoint returns 3 datasets
- [ ] Verify cost conversion (cents → dollars)

### Phase 2: Frontend Changes
- [ ] Update `dailyChartOptions` with y2 axis (lines 344-393)
- [ ] Add custom tooltip formatter for cost
- [ ] Update messages query limit to 100 (line 228)
- [ ] Test chart rendering with cost data
- [ ] Verify all three axes display correctly

### Phase 3: Testing
- [ ] Write backend unit tests
- [ ] Write frontend E2E tests
- [ ] Manual browser testing (Chrome, Firefox, Safari)
- [ ] Performance testing with 30+ days of data
- [ ] Visual regression testing

### Phase 4: Documentation
- [ ] Update API documentation with cost dataset
- [ ] Update component documentation
- [ ] Add screenshots to README

---

## 10. Edge Cases & Error Handling

### 10.1 No Cost Data
**Scenario**: Database has no cost values (all 0)
**Expected**: Chart shows cost bars at 0, no errors
**Validation**: Y2 axis should show $0.0000

### 10.2 Very Small Costs
**Scenario**: Cost < $0.0001
**Expected**: Display as "$0.0000"
**Validation**: Tooltip shows 4 decimal places

### 10.3 Very Large Costs
**Scenario**: Cost > $100
**Expected**: Y2 axis auto-scales
**Validation**: Labels don't overlap

### 10.4 Missing Cost in Raw Data
**Scenario**: Backend returns null/undefined cost
**Expected**: Default to 0, log warning
**Implementation**:
```javascript
data: dailyData.map(d => ((d.total_cost || 0) / 100).toFixed(4))
```

### 10.5 Fewer than 100 Messages
**Scenario**: Database has < 100 total messages
**Expected**: Show all available messages
**Current**: Already handled by backend LIMIT clause

---

## 11. Success Metrics

### 11.1 Technical Metrics
- API response time: < 200ms
- Chart render time: < 1 second
- Zero JavaScript errors
- 100% test coverage for new code

### 11.2 Business Metrics
- Cost visibility improves budget tracking
- Users can identify expensive days
- Detailed message history aids debugging

---

## 12. Dependencies

### 12.1 External Dependencies
- Chart.js 4.x (already installed)
- chartjs-adapter-date-fns (already installed)
- React Query (already installed)

### 12.2 Internal Dependencies
- No changes to database schema
- No changes to authentication
- No changes to other components

---

## 13. Security Considerations

- **Data Exposure**: Cost data is already accessible via raw_data field
- **Authorization**: Existing auth applies to all analytics endpoints
- **Input Validation**: Limit parameter already capped at 100
- **SQL Injection**: Using parameterized queries (already safe)

---

## 14. Future Enhancements

1. **Cost Breakdown by Model**: Show which models cost most
2. **Cost Alerts**: Notify when daily cost exceeds threshold
3. **Cost Projections**: Predict monthly costs based on trends
4. **Export Cost Report**: CSV/PDF with cost breakdowns
5. **Cost per Token**: Calculate efficiency metrics

---

## 15. Appendix

### A. File Locations

| Component | File Path | Lines |
|-----------|-----------|-------|
| Daily Endpoint | `/workspaces/agent-feed/api-server/server.js` | 488-553 |
| Messages Endpoint | `/workspaces/agent-feed/api-server/server.js` | 556-657 |
| Frontend Dashboard | `/workspaces/agent-feed/frontend/src/components/TokenAnalyticsDashboard.tsx` | 1-785 |
| Chart Options | `/workspaces/agent-feed/frontend/src/components/TokenAnalyticsDashboard.tsx` | 344-393 |
| Messages Query | `/workspaces/agent-feed/frontend/src/components/TokenAnalyticsDashboard.tsx` | 225-249 |

### B. Database Query Examples

**Get daily costs for last 30 days**:
```sql
SELECT
  DATE(timestamp) as date,
  SUM(totalTokens) as total_tokens,
  COUNT(*) as total_requests,
  ROUND(SUM(estimatedCost) * 100) as total_cost_cents,
  SUM(estimatedCost) as total_cost_dollars
FROM token_analytics
WHERE DATE(timestamp) >= DATE('now', '-30 days')
GROUP BY DATE(timestamp)
ORDER BY date;
```

**Get last 100 messages**:
```sql
SELECT *
FROM token_analytics
ORDER BY timestamp DESC
LIMIT 100;
```

### C. Color Reference

```javascript
// Current Colors
const TOKENS_COLOR = 'rgba(99, 102, 241, 0.5)';    // Indigo
const REQUESTS_COLOR = 'rgba(34, 197, 94, 0.5)';   // Green

// New Color
const COST_COLOR = 'rgba(168, 85, 247, 0.5)';      // Purple
```

### D. Sample API Response (After Implementation)

```json
{
  "success": true,
  "data": {
    "labels": ["2025-09-20", "2025-09-21"],
    "datasets": [
      {
        "label": "Daily Tokens",
        "data": [15000, 12000],
        "backgroundColor": "rgba(99, 102, 241, 0.5)",
        "yAxisID": "y"
      },
      {
        "label": "Daily Requests",
        "data": [20, 15],
        "backgroundColor": "rgba(34, 197, 94, 0.5)",
        "yAxisID": "y1"
      },
      {
        "label": "Daily Cost ($)",
        "data": ["0.0234", "0.0189"],
        "backgroundColor": "rgba(168, 85, 247, 0.5)",
        "yAxisID": "y2"
      }
    ]
  },
  "raw_data": [
    {
      "date": "2025-09-20",
      "total_tokens": 15000,
      "total_requests": 20,
      "total_cost": 234
    },
    {
      "date": "2025-09-21",
      "total_tokens": 12000,
      "total_requests": 15,
      "total_cost": 189
    }
  ],
  "timestamp": "2025-09-30T..."
}
```

---

## Document History

| Version | Date | Author | Changes |
|---------|------|--------|---------|
| 1.0 | 2025-09-30 | Claude Code | Initial specification |

---

## Approval Sign-Off

- [ ] Product Owner
- [ ] Technical Lead
- [ ] QA Lead
- [ ] DevOps

---

**End of Specification Document**
