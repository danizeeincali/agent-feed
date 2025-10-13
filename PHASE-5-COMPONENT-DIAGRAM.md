# PHASE 5 - MONITORING TAB COMPONENT DIAGRAM

## Component Hierarchy

```
RealAnalytics.tsx
│
├─ TabsList
│  ├─ Claude SDK Tab
│  ├─ Performance Tab
│  └─ Monitoring Tab ◄──────────────────────────────────┐
│                                                        │
└─ TabsContent[monitoring] ────────────────────────────►│
                                                         │
                                                         │
┌────────────────────────────────────────────────────────┘
│
│  MonitoringTab.tsx (MAIN CONTAINER)
│  ┌──────────────────────────────────────────────────────────┐
│  │                                                            │
│  │  ┌──────────────────────────────────────────────────┐    │
│  │  │  Header Section                                   │    │
│  │  │  ┌────────────────────┐  ┌────────────────────┐  │    │
│  │  │  │ Title & Description│  │ RefreshControls.tsx│  │    │
│  │  │  └────────────────────┘  └────────────────────┘  │    │
│  │  └──────────────────────────────────────────────────┘    │
│  │                                                            │
│  │  ┌──────────────────────────────────────────────────┐    │
│  │  │  useMonitoringData Hook                          │    │
│  │  │  ┌────────────────────────────────────────────┐  │    │
│  │  │  │  MonitoringApiService.ts                   │  │    │
│  │  │  │  • getHealth()                             │  │    │
│  │  │  │  • getMetrics()                            │  │    │
│  │  │  │  • getAlerts()                             │  │    │
│  │  │  │  • getHistoricalStats()                    │  │    │
│  │  │  │  • Cache Layer (5s TTL)                    │  │    │
│  │  │  │  • Retry Logic (3 attempts)                │  │    │
│  │  │  └────────────────────────────────────────────┘  │    │
│  │  │         │                                         │    │
│  │  │         ▼                                         │    │
│  │  │  ┌────────────────────────────────────────────┐  │    │
│  │  │  │  State Management                          │  │    │
│  │  │  │  • health: HealthCheckResponse | null     │  │    │
│  │  │  │  • metrics: SystemMetrics | null          │  │    │
│  │  │  │  • alerts: Alert[]                        │  │    │
│  │  │  │  • stats: any[]                           │  │    │
│  │  │  │  • loading: boolean                       │  │    │
│  │  │  │  • error: Error | null                    │  │    │
│  │  │  └────────────────────────────────────────────┘  │    │
│  │  └──────────────────────────────────────────────────┘    │
│  │                                                            │
│  │  ┌──────────────────────────────────────────────────┐    │
│  │  │  Tabs Navigation                                 │    │
│  │  │  ┌─────────┐ ┌─────────┐ ┌─────────┐            │    │
│  │  │  │Overview │ │ Metrics │ │ Alerts  │            │    │
│  │  │  └─────────┘ └─────────┘ └─────────┘            │    │
│  │  └──────────────────────────────────────────────────┘    │
│  │                                                            │
│  │  ┌──────────────────────────────────────────────────┐    │
│  │  │  OVERVIEW TAB CONTENT                            │    │
│  │  │                                                   │    │
│  │  │  ┌────────────────────────────────────────────┐  │    │
│  │  │  │  HealthStatusCard.tsx                      │  │    │
│  │  │  │  ┌──────────────────────────────────────┐  │  │    │
│  │  │  │  │ Status Badge (Healthy/Degraded/...)  │  │  │    │
│  │  │  │  └──────────────────────────────────────┘  │  │    │
│  │  │  │  ┌──────────────────────────────────────┐  │  │    │
│  │  │  │  │ Version | Uptime | Last Check        │  │  │    │
│  │  │  │  └──────────────────────────────────────┘  │  │    │
│  │  │  │  ┌──────────────────────────────────────┐  │  │    │
│  │  │  │  │ Component Checks (DB, Memory, CPU)   │  │  │    │
│  │  │  │  └──────────────────────────────────────┘  │  │    │
│  │  │  └────────────────────────────────────────────┘  │    │
│  │  │                                                   │    │
│  │  │  ┌────────────────────────────────────────────┐  │    │
│  │  │  │  SystemMetricsGrid.tsx                     │  │    │
│  │  │  │  ┌──────────┬──────────┬──────────┐        │  │    │
│  │  │  │  │MetricCard│MetricCard│MetricCard│        │  │    │
│  │  │  │  │ CPU 45%  │Memory 65%│ Disk 50% │        │  │    │
│  │  │  │  └──────────┴──────────┴──────────┘        │  │    │
│  │  │  │  ┌──────────┬──────────┬──────────┐        │  │    │
│  │  │  │  │MetricCard│MetricCard│MetricCard│        │  │    │
│  │  │  │  │Network In│Response  │Throughput│        │  │    │
│  │  │  │  └──────────┴──────────┴──────────┘        │  │    │
│  │  │  └────────────────────────────────────────────┘  │    │
│  │  │                                                   │    │
│  │  │  ┌────────────────────────────────────────────┐  │    │
│  │  │  │  Recent Alerts Summary (if any)            │  │    │
│  │  │  └────────────────────────────────────────────┘  │    │
│  │  └──────────────────────────────────────────────────┘    │
│  │                                                            │
│  │  ┌──────────────────────────────────────────────────┐    │
│  │  │  METRICS TAB CONTENT                             │    │
│  │  │                                                   │    │
│  │  │  ┌────────────────────────────────────────────┐  │    │
│  │  │  │  SystemMetricsGrid.tsx (detailed=true)     │  │    │
│  │  │  │  ┌──────────┬──────────┬──────────┐        │  │    │
│  │  │  │  │ 6 Basic Metrics (as above)       │        │  │    │
│  │  │  │  └──────────┴──────────┴──────────┘        │  │    │
│  │  │  │  ┌──────────┬──────────┬──────────┐        │  │    │
│  │  │  │  │MetricCard│MetricCard│MetricCard│        │  │    │
│  │  │  │  │Error Rate│Active    │Queue     │        │  │    │
│  │  │  │  │          │Conns     │Depth     │        │  │    │
│  │  │  │  └──────────┴──────────┴──────────┘        │  │    │
│  │  │  └────────────────────────────────────────────┘  │    │
│  │  │                                                   │    │
│  │  │  ┌────────────────────────────────────────────┐  │    │
│  │  │  │  MonitoringCharts.tsx                      │  │    │
│  │  │  │  ┌──────────────────────────────────────┐  │  │    │
│  │  │  │  │ CPU Usage Chart (Line)               │  │  │    │
│  │  │  │  │ Chart.js with time series            │  │  │    │
│  │  │  │  └──────────────────────────────────────┘  │  │    │
│  │  │  │  ┌──────────────────────────────────────┐  │  │    │
│  │  │  │  │ Memory Usage Chart (Line)            │  │  │    │
│  │  │  │  └──────────────────────────────────────┘  │  │    │
│  │  │  │  ┌──────────────────────────────────────┐  │  │    │
│  │  │  │  │ Response Time & Throughput (Line)    │  │  │    │
│  │  │  │  │ Dual Y-axis chart                    │  │  │    │
│  │  │  │  └──────────────────────────────────────┘  │  │    │
│  │  │  └────────────────────────────────────────────┘  │    │
│  │  └──────────────────────────────────────────────────┘    │
│  │                                                            │
│  │  ┌──────────────────────────────────────────────────┐    │
│  │  │  ALERTS TAB CONTENT                              │    │
│  │  │                                                   │    │
│  │  │  ┌────────────────────────────────────────────┐  │    │
│  │  │  │  AlertsPanel.tsx                           │  │    │
│  │  │  │  ┌──────────────────────────────────────┐  │  │    │
│  │  │  │  │ Statistics Grid                      │  │  │    │
│  │  │  │  │ Total | Active | Critical | Warning │  │  │    │
│  │  │  │  └──────────────────────────────────────┘  │  │    │
│  │  │  │  ┌──────────────────────────────────────┐  │  │    │
│  │  │  │  │ Filters                              │  │  │    │
│  │  │  │  │ Severity | Status | Search           │  │  │    │
│  │  │  │  └──────────────────────────────────────┘  │  │    │
│  │  │  │  ┌──────────────────────────────────────┐  │  │    │
│  │  │  │  │ AlertCard.tsx (×N)                   │  │  │    │
│  │  │  │  │ ┌──────────────────────────────────┐ │  │  │    │
│  │  │  │  │ │ Icon | Title | Severity Badge    │ │  │  │    │
│  │  │  │  │ │ Message                          │ │  │  │    │
│  │  │  │  │ │ Timestamp | Source               │ │  │  │    │
│  │  │  │  │ │ [More Details] [Acknowledge]     │ │  │  │    │
│  │  │  │  │ │                                  │ │  │  │    │
│  │  │  │  │ │ Expandable Details Section       │ │  │  │    │
│  │  │  │  │ │ • Alert ID                       │ │  │  │    │
│  │  │  │  │ │ • Full Timestamp                 │ │  │  │    │
│  │  │  │  │ │ • Source System                  │ │  │  │    │
│  │  │  │  │ │ • Additional Details (JSON)      │ │  │  │    │
│  │  │  │  │ └──────────────────────────────────┘ │  │  │    │
│  │  │  │  └──────────────────────────────────────┘  │  │    │
│  │  │  │  ┌──────────────────────────────────────┐  │  │    │
│  │  │  │  │ Pagination Controls                  │  │  │    │
│  │  │  │  │ [Previous] Page 1 of 5 [Next]        │  │  │    │
│  │  │  │  └──────────────────────────────────────┘  │  │    │
│  │  │  └────────────────────────────────────────────┘  │    │
│  │  └──────────────────────────────────────────────────┘    │
│  │                                                            │
│  └──────────────────────────────────────────────────────────┘
```

## Data Flow Diagram

```
┌─────────────┐
│   Browser   │
└──────┬──────┘
       │ User Action (mount, refresh, filter)
       │
       ▼
┌─────────────────────────────────────────────────────────┐
│              MonitoringTab Component                    │
│                                                         │
│  ┌────────────────────────────────────────────────┐   │
│  │        useMonitoringData Hook                  │   │
│  │                                                 │   │
│  │  1. Check cache in MonitoringApiService        │   │
│  │     ├─ Cache HIT → Return cached data          │   │
│  │     └─ Cache MISS → Continue to API            │   │
│  │                                                 │   │
│  │  2. Make parallel API calls                    │   │
│  │     ├─ GET /api/monitoring/health              │   │
│  │     ├─ GET /api/monitoring/metrics             │   │
│  │     ├─ GET /api/monitoring/alerts              │   │
│  │     └─ GET /api/monitoring/stats               │   │
│  │                                                 │   │
│  │  3. Handle responses with Promise.allSettled   │   │
│  │     ├─ Success → Update state                  │   │
│  │     └─ Failure → Use fallback or retry         │   │
│  │                                                 │   │
│  │  4. Store in cache (5s TTL)                    │   │
│  │                                                 │   │
│  │  5. Return to component                        │   │
│  │     └─ { health, metrics, alerts, stats,      │   │
│  │         loading, error, refetch }              │   │
│  └────────────────────────────────────────────────┘   │
│                                                         │
│  State Update Triggers Re-render                       │
│           │                                             │
│           ▼                                             │
│  ┌────────────────────────────────────────────────┐   │
│  │  Conditional Rendering                         │   │
│  │                                                 │   │
│  │  IF loading AND no data:                       │   │
│  │    → Show loading spinner                      │   │
│  │                                                 │   │
│  │  IF error (non-blocking):                      │   │
│  │    → Show warning banner                       │   │
│  │                                                 │   │
│  │  ELSE:                                          │   │
│  │    → Render active tab content                 │   │
│  │      ├─ Overview: Health + Metrics + Summary   │   │
│  │      ├─ Metrics: Detailed Grid + Charts        │   │
│  │      └─ Alerts: Filtered List + Pagination     │   │
│  └────────────────────────────────────────────────┘   │
└─────────────────────────────────────────────────────────┘
       │
       ▼
┌─────────────────────────────────────────────────────────┐
│                  Child Components                       │
│                                                         │
│  Each receives props and renders independently:         │
│                                                         │
│  HealthStatusCard                                       │
│    ├─ Receives: health, loading                        │
│    └─ Renders: Status badge, uptime, checks            │
│                                                         │
│  SystemMetricsGrid                                      │
│    ├─ Receives: metrics, loading, detailed             │
│    ├─ Maps over METRIC_DEFINITIONS                     │
│    └─ Renders: MetricCard for each metric              │
│                                                         │
│  MonitoringCharts                                       │
│    ├─ Receives: stats, timeRange, loading              │
│    ├─ useMemo: Process data into chart format          │
│    └─ Renders: Chart.js Line components                │
│                                                         │
│  AlertsPanel                                            │
│    ├─ Receives: alerts, loading, onAcknowledge         │
│    ├─ useState: filters, currentPage                   │
│    ├─ useMemo: Filter and paginate alerts              │
│    └─ Renders: AlertCard for each alert                │
│                                                         │
│  RefreshControls                                        │
│    ├─ Receives: autoRefresh, interval, lastRefresh     │
│    ├─ Callbacks: onToggle, onRefresh, onChange         │
│    └─ Renders: Toggle, settings, refresh button        │
└─────────────────────────────────────────────────────────┘
       │
       ▼
┌─────────────────────────────────────────────────────────┐
│                  User Interactions                      │
│                                                         │
│  Auto-refresh Toggle                                    │
│    → Updates state → Starts/stops interval             │
│                                                         │
│  Manual Refresh Button                                  │
│    → Clears cache → Calls refetch()                    │
│                                                         │
│  Interval Change                                        │
│    → Updates interval → Restarts timer                 │
│                                                         │
│  Tab Switch                                             │
│    → Updates URL → Changes activeTab                   │
│                                                         │
│  Alert Filter                                           │
│    → Updates filter state → Recalculates filtered list │
│                                                         │
│  Alert Acknowledge                                      │
│    → Calls API → Clears cache → Triggers refetch       │
│                                                         │
│  Alert Expand                                           │
│    → Updates expandedAlertId → Shows details           │
└─────────────────────────────────────────────────────────┘
```

## State Management Flow

```
┌─────────────────────────────────────────────────────────┐
│          Component State (React Hooks)                  │
├─────────────────────────────────────────────────────────┤
│                                                         │
│  MonitoringTab Level:                                   │
│  ┌────────────────────────────────────────┐            │
│  │ activeTab: string                      │            │
│  │ autoRefresh: boolean                   │            │
│  │ refreshInterval: number                │            │
│  │ lastRefreshTime: number                │            │
│  └────────────────────────────────────────┘            │
│                                                         │
│  useMonitoringData Hook:                               │
│  ┌────────────────────────────────────────┐            │
│  │ health: HealthCheckResponse | null     │            │
│  │ metrics: SystemMetrics | null          │            │
│  │ alerts: Alert[]                        │            │
│  │ stats: any[]                           │            │
│  │ loading: boolean                       │            │
│  │ error: Error | null                    │            │
│  └────────────────────────────────────────┘            │
│                                                         │
│  AlertsPanel Level:                                     │
│  ┌────────────────────────────────────────┐            │
│  │ filters: FilterState                   │            │
│  │   ├─ severity: string                  │            │
│  │   ├─ acknowledged: string              │            │
│  │   └─ searchTerm: string                │            │
│  │ currentPage: number                    │            │
│  │ expandedAlertId: string | null         │            │
│  └────────────────────────────────────────┘            │
│                                                         │
│  RefreshControls Level:                                │
│  ┌────────────────────────────────────────┐            │
│  │ showSettings: boolean                  │            │
│  └────────────────────────────────────────┘            │
│                                                         │
└─────────────────────────────────────────────────────────┘
```

## Cache Architecture

```
┌─────────────────────────────────────────────────────────┐
│        MonitoringApiService Cache Layer                 │
├─────────────────────────────────────────────────────────┤
│                                                         │
│  requestCache: Map<string, CachedData>                  │
│  ┌────────────────────────────────────────┐            │
│  │ Key Structure:                         │            │
│  │   "url?params=json"                    │            │
│  │                                         │            │
│  │ Value Structure:                       │            │
│  │   {                                    │            │
│  │     data: any                          │            │
│  │     timestamp: number                  │            │
│  │   }                                    │            │
│  └────────────────────────────────────────┘            │
│                                                         │
│  Example Entries:                                       │
│  ┌────────────────────────────────────────┐            │
│  │ "/api/monitoring/health" → {           │            │
│  │   data: { status: "healthy", ... },    │            │
│  │   timestamp: 1697040000000             │            │
│  │ }                                      │            │
│  │                                        │            │
│  │ "/api/monitoring/alerts?page=1" → {   │            │
│  │   data: { alerts: [...], ... },       │            │
│  │   timestamp: 1697040005000             │            │
│  │ }                                      │            │
│  └────────────────────────────────────────┘            │
│                                                         │
│  Cache Policies:                                        │
│  ┌────────────────────────────────────────┐            │
│  │ • TTL: 5 seconds                       │            │
│  │ • Cleanup: Every 60 seconds            │            │
│  │ • Manual Clear: On refresh button      │            │
│  │ • Targeted Clear: On alert acknowledge │            │
│  └────────────────────────────────────────┘            │
│                                                         │
└─────────────────────────────────────────────────────────┘
```

## Error Handling Flow

```
┌─────────────────────────────────────────────────────────┐
│                   Error Scenarios                       │
├─────────────────────────────────────────────────────────┤
│                                                         │
│  1. Network Error (ECONNREFUSED, etc.)                  │
│     ├─ Retry #1 (delay: 1s)                            │
│     ├─ Retry #2 (delay: 2s)                            │
│     ├─ Retry #3 (delay: 4s)                            │
│     └─ All failed → Show error banner + cached data    │
│                                                         │
│  2. Timeout Error (>10s)                                │
│     ├─ Abort request with AbortController              │
│     └─ Show timeout error + cached data                │
│                                                         │
│  3. HTTP Error (4xx, 5xx)                               │
│     ├─ Parse error response                            │
│     ├─ No retry (client/server errors)                 │
│     └─ Show error message + cached data                │
│                                                         │
│  4. Invalid Response Data                               │
│     ├─ Validation fails                                │
│     ├─ Log warning to console                          │
│     └─ Use fallback/empty state                        │
│                                                         │
│  5. Component Render Error                              │
│     ├─ ErrorBoundary catches                           │
│     ├─ Show error UI with retry                        │
│     └─ Isolate error to failed component               │
│                                                         │
│  Error Recovery:                                        │
│  ┌────────────────────────────────────────┐            │
│  │ • Non-blocking error banners           │            │
│  │ • Retry button available               │            │
│  │ • Auto-retry on next refresh cycle     │            │
│  │ • Graceful degradation with cache      │            │
│  └────────────────────────────────────────┘            │
│                                                         │
└─────────────────────────────────────────────────────────┘
```

## Component Lifecycle

```
┌─────────────────────────────────────────────────────────┐
│              Component Mount Sequence                   │
├─────────────────────────────────────────────────────────┤
│                                                         │
│  1. MonitoringTab mounts                                │
│     ├─ Initialize state (activeTab, autoRefresh, etc.) │
│     ├─ Load from localStorage/URL                      │
│     └─ Initialize useMonitoringData hook               │
│                                                         │
│  2. useMonitoringData effect runs                       │
│     ├─ Set loading = true                              │
│     ├─ Create AbortController                          │
│     ├─ Fetch all data in parallel                      │
│     ├─ Process responses                               │
│     ├─ Update state                                    │
│     └─ Set loading = false                             │
│                                                         │
│  3. MonitoringTab re-renders with data                  │
│     ├─ Conditional rendering based on loading          │
│     └─ Pass data to child components as props          │
│                                                         │
│  4. Child components render                             │
│     ├─ HealthStatusCard                                │
│     ├─ SystemMetricsGrid → MetricCard (×6-10)          │
│     ├─ MonitoringCharts (if metrics tab)               │
│     ├─ AlertsPanel → AlertCard (×N) (if alerts tab)    │
│     └─ RefreshControls                                 │
│                                                         │
│  5. Auto-refresh timer starts (if enabled)              │
│     ├─ setInterval with refreshInterval                │
│     ├─ Calls fetchMonitoringData every N seconds       │
│     └─ Component state updates trigger re-renders      │
│                                                         │
├─────────────────────────────────────────────────────────┤
│              Component Unmount Sequence                 │
├─────────────────────────────────────────────────────────┤
│                                                         │
│  1. Cleanup effects run                                 │
│     ├─ Clear refresh interval                          │
│     ├─ Abort pending API requests                      │
│     ├─ Set isMounted = false                           │
│     └─ Remove event listeners                          │
│                                                         │
│  2. Cache remains (shared singleton)                    │
│     └─ Available for next mount                        │
│                                                         │
└─────────────────────────────────────────────────────────┘
```

## Optimization Strategies

```
┌─────────────────────────────────────────────────────────┐
│                  Performance Optimizations              │
├─────────────────────────────────────────────────────────┤
│                                                         │
│  1. Memoization                                         │
│     ├─ useMemo for filtered alerts (AlertsPanel)       │
│     ├─ useMemo for paginated alerts                    │
│     ├─ useMemo for chart data processing               │
│     └─ useMemo for alert statistics                    │
│                                                         │
│  2. Callbacks                                           │
│     ├─ useCallback for event handlers                  │
│     ├─ useCallback for refetch function                │
│     └─ Prevents unnecessary child re-renders           │
│                                                         │
│  3. API Layer                                           │
│     ├─ Request caching (5s TTL)                        │
│     ├─ Request deduplication                           │
│     ├─ Parallel fetching with Promise.allSettled       │
│     └─ AbortController for cleanup                     │
│                                                         │
│  4. Rendering                                           │
│     ├─ Conditional rendering to minimize DOM           │
│     ├─ Pagination to limit alerts (10/page)            │
│     ├─ Lazy expansion of alert details                 │
│     └─ Chart.js canvas (not SVG) for performance       │
│                                                         │
│  5. Code Splitting (Future)                             │
│     ├─ Lazy load MonitoringTab                         │
│     ├─ Lazy load Chart.js                              │
│     └─ Dynamic imports for heavy components            │
│                                                         │
└─────────────────────────────────────────────────────────┘
```

---

## Visual Component Breakdown

### MetricCard Anatomy
```
┌─────────────────────────────────────────────────┐
│ ┌────┐ CPU Usage            ▲ +2.5%            │
│ │ 🖥️ │                       (trend)            │
│ └────┘                                          │
│                                                 │
│        45 %                                     │
│        ▲▲▲                                      │
│        value                                    │
│                                                 │
│ ▓▓▓▓▓▓▓▓▓▓░░░░░░░░░░                            │
│ progress bar                                    │
│ 45.0%                            Normal         │
└─────────────────────────────────────────────────┘
```

### AlertCard Anatomy
```
┌─────────────────────────────────────────────────┐
│ ⚠️  High CPU Usage                 [WARNING]    │
│                                                 │
│     CPU usage exceeded 80% for 5 minutes       │
│                                                 │
│     2h ago • Source: monitoring-service         │
│                                                 │
│     [More Details ▼] [Acknowledge]              │
│                                                 │
│ ┌─────────────────────────────────────────────┐ │ (expanded)
│ │ Alert ID: alert-001                         │ │
│ │ Timestamp: 2025-10-12 12:00:00             │ │
│ │ Source: monitoring-service                  │ │
│ │ Details:                                    │ │
│ │   {                                         │ │
│ │     "cpu_usage": 82,                        │ │
│ │     "threshold": 80                         │ │
│ │   }                                         │ │
│ └─────────────────────────────────────────────┘ │
└─────────────────────────────────────────────────┘
```

### Chart Anatomy
```
┌─────────────────────────────────────────────────┐
│ CPU Usage                                       │
│                                                 │
│ 100% ┤                                          │
│      │              ╭─╮                         │
│  75% ┤            ╭─╯ ╰╮                        │
│      │          ╭─╯     ╰─╮                     │
│  50% ┤        ╭─╯         ╰─╮                   │
│      │      ╭─╯             ╰─╮                 │
│  25% ┤    ╭─╯                 ╰─╮               │
│      │  ╭─╯                     ╰─╮             │
│   0% └──┴───────────────────────────┴──────────  │
│      12:00  13:00  14:00  15:00  16:00         │
│                                                 │
│      Legend: ─── CPU Usage (%)                 │
└─────────────────────────────────────────────────┘
```

---

**This diagram provides:**
1. Complete component hierarchy
2. Data flow with API integration
3. State management structure
4. Cache architecture
5. Error handling flows
6. Component lifecycle
7. Optimization strategies
8. Visual component breakdowns

**Use this diagram alongside the pseudocode for implementation.**
