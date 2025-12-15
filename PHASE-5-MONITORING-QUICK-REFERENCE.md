# PHASE 5 - MONITORING TAB QUICK REFERENCE

## Component Overview

| Component | File | Purpose | Dependencies |
|-----------|------|---------|--------------|
| **MonitoringApiService** | `services/MonitoringApiService.ts` | API wrapper with caching & retry | axios |
| **MonitoringTab** | `components/MonitoringTab.tsx` | Main container with tabs | All components below |
| **useMonitoringData** | `hooks/useMonitoringData.ts` | Data fetching hook | MonitoringApiService |
| **HealthStatusCard** | `components/HealthStatusCard.tsx` | Health display | lucide-react |
| **SystemMetricsGrid** | `components/SystemMetricsGrid.tsx` | Metrics grid | MetricCard |
| **MetricCard** | `components/MetricCard.tsx` | Individual metric | lucide-react |
| **MonitoringCharts** | `components/MonitoringCharts.tsx` | Historical charts | Chart.js, react-chartjs-2 |
| **AlertsPanel** | `components/AlertsPanel.tsx` | Alerts manager | AlertCard |
| **AlertCard** | `components/AlertCard.tsx` | Individual alert | lucide-react |
| **RefreshControls** | `components/RefreshControls.tsx` | Refresh controls | lucide-react |

## API Endpoints

| Endpoint | Method | Purpose | Response Time |
|----------|--------|---------|---------------|
| `/api/monitoring/health` | GET | Health check | ~50ms |
| `/api/monitoring/metrics` | GET | Current metrics | ~100ms |
| `/api/monitoring/alerts` | GET | Active alerts | ~150ms |
| `/api/monitoring/stats` | GET | Historical stats | ~200ms |

## Key Features

### 1. Auto-Refresh System
- **Default Interval:** 10 seconds
- **Options:** 5s, 10s, 30s, 1m, 5m
- **Toggle:** On/Off switch in header
- **Manual Refresh:** Button with loading state

### 2. Caching Strategy
- **TTL:** 5 seconds
- **Cleanup:** Every 60 seconds
- **Cache Key:** URL + params
- **Clear On:** Manual refresh

### 3. Error Handling
- **Retry Logic:** 3 attempts with exponential backoff
- **Timeout:** 10 seconds
- **Fallback:** Cached data or empty state
- **UI:** Non-blocking error banners

### 4. Alert Management
- **Filtering:** Severity, status, search
- **Pagination:** 10 per page
- **Actions:** Acknowledge, expand details
- **Bulk Actions:** Acknowledge all

## File Structure

```
frontend/
├── src/
│   ├── components/
│   │   ├── MonitoringTab.tsx           # Main component
│   │   ├── HealthStatusCard.tsx        # Health display
│   │   ├── SystemMetricsGrid.tsx       # Metrics grid
│   │   ├── MetricCard.tsx              # Single metric
│   │   ├── MonitoringCharts.tsx        # Charts
│   │   ├── AlertsPanel.tsx             # Alerts list
│   │   ├── AlertCard.tsx               # Single alert
│   │   └── RefreshControls.tsx         # Controls
│   ├── hooks/
│   │   └── useMonitoringData.ts        # Data hook
│   ├── services/
│   │   └── MonitoringApiService.ts     # API service
│   └── types/
│       └── monitoring.ts               # Type definitions
```

## Implementation Order

1. **Phase 5A: Foundation** (2 hours)
   - [ ] Create type definitions (`monitoring.ts`)
   - [ ] Implement `MonitoringApiService.ts`
   - [ ] Test API service with mock endpoints

2. **Phase 5B: Data Layer** (1 hour)
   - [ ] Implement `useMonitoringData.ts` hook
   - [ ] Test auto-refresh mechanism
   - [ ] Test error handling

3. **Phase 5C: Core Components** (3 hours)
   - [ ] Implement `HealthStatusCard.tsx`
   - [ ] Implement `MetricCard.tsx`
   - [ ] Implement `SystemMetricsGrid.tsx`
   - [ ] Test with mock data

4. **Phase 5D: Charts** (2 hours)
   - [ ] Install Chart.js dependencies
   - [ ] Implement `MonitoringCharts.tsx`
   - [ ] Test chart rendering

5. **Phase 5E: Alerts** (2 hours)
   - [ ] Implement `AlertCard.tsx`
   - [ ] Implement `AlertsPanel.tsx`
   - [ ] Test filtering and pagination

6. **Phase 5F: Controls & Integration** (2 hours)
   - [ ] Implement `RefreshControls.tsx`
   - [ ] Implement `MonitoringTab.tsx`
   - [ ] Integrate with `RealAnalytics.tsx`

7. **Phase 5G: Testing & Polish** (2 hours)
   - [ ] Write unit tests
   - [ ] Write integration tests
   - [ ] Dark mode testing
   - [ ] Performance optimization

**Total Estimated Time:** 14 hours

## Dark Mode Classes

### Backgrounds
```css
bg-white dark:bg-gray-900           /* Main backgrounds */
bg-gray-50 dark:bg-gray-800         /* Secondary backgrounds */
bg-gray-100 dark:bg-gray-700        /* Tertiary backgrounds */
```

### Text
```css
text-gray-900 dark:text-gray-100    /* Primary text */
text-gray-700 dark:text-gray-300    /* Secondary text */
text-gray-600 dark:text-gray-400    /* Tertiary text */
```

### Borders
```css
border-gray-200 dark:border-gray-700  /* Standard borders */
border-gray-300 dark:border-gray-600  /* Input borders */
```

### Status Colors (maintain in both modes)
```css
text-green-600  bg-green-50  border-green-200   /* Healthy */
text-yellow-600 bg-yellow-50 border-yellow-200  /* Warning */
text-red-600    bg-red-50    border-red-200     /* Critical */
text-blue-600   bg-blue-50   border-blue-200    /* Info */
```

## Testing Commands

```bash
# Run unit tests
npm test -- MonitoringApiService
npm test -- useMonitoringData

# Run integration tests
npm test -- MonitoringTab.test

# Run E2E tests
npm run test:e2e -- monitoring

# Check TypeScript
npm run type-check

# Lint
npm run lint
```

## Performance Targets

| Metric | Target | Measurement |
|--------|--------|-------------|
| Initial Load | < 500ms | Time to first render |
| API Response | < 200ms | Average response time |
| Chart Render | < 100ms | Chart.js render time |
| Auto-Refresh | < 300ms | Data update latency |
| Alert Filter | < 50ms | Filter 100 alerts |
| Memory Usage | < 50MB | Per tab instance |

## Common Issues & Solutions

### Issue 1: Auto-refresh not working
**Solution:** Check if `autoRefresh` state is true and `refreshInterval` is valid (≥5000ms)

### Issue 2: Charts not rendering
**Solution:** Ensure Chart.js is registered: `ChartJS.register(...)`

### Issue 3: API cache stale
**Solution:** Call `monitoringApi.clearCache()` or reduce cache TTL

### Issue 4: Alerts not updating after acknowledgment
**Solution:** Call `clearAlertsCache()` after acknowledge action

### Issue 5: Dark mode colors broken
**Solution:** Verify all classes use `dark:` prefix consistently

## Dependencies to Install

```json
{
  "dependencies": {
    "chart.js": "^4.4.0",
    "react-chartjs-2": "^5.2.0",
    "axios": "^1.6.0",
    "lucide-react": "^0.300.0"
  }
}
```

## Integration with Existing Code

### Step 1: Update RealAnalytics.tsx
```typescript
// Add import
import MonitoringTab from './MonitoringTab'

// Add tab
<TabsTrigger value="monitoring">
  <Activity className="w-4 h-4" />
  <span>Monitoring</span>
</TabsTrigger>

// Add content
<TabsContent value="monitoring">
  <MonitoringTab />
</TabsContent>
```

### Step 2: Update server.js
```javascript
// Already implemented in Phase 5
import monitoringRouter from './routes/monitoring.js';
app.use('/api/monitoring', monitoringRouter);
```

### Step 3: Update navigation
```typescript
// Add to analytics navigation
?tab=monitoring&monitoringTab=overview
```

## API Response Examples

### Health Check Response
```json
{
  "status": "healthy",
  "version": "1.0.0",
  "uptime": 3600,
  "timestamp": 1697040000000,
  "checks": {
    "database": { "status": "healthy", "responseTime": 15 },
    "memory": { "status": "healthy", "usage": 65 },
    "cpu": { "status": "healthy", "usage": 45 }
  }
}
```

### Metrics Response
```json
{
  "timestamp": "2025-10-12T12:00:00Z",
  "system": {
    "server_id": "main-server",
    "cpu_usage": 45,
    "memory_usage": 65,
    "disk_usage": 50,
    "network_io": {
      "bytes_in": 1048576,
      "bytes_out": 2097152,
      "packets_in": 1000,
      "packets_out": 1500
    },
    "response_time": 150,
    "throughput": 250,
    "error_rate": 0.5,
    "active_connections": 42,
    "queue_depth": 5,
    "cache_hit_rate": 0.85
  }
}
```

### Alerts Response
```json
{
  "alerts": [
    {
      "id": "alert-001",
      "title": "High CPU Usage",
      "message": "CPU usage exceeded 80%",
      "severity": "warning",
      "timestamp": 1697040000000,
      "source": "monitoring-service",
      "acknowledged": false
    }
  ],
  "total": 1,
  "page": 1,
  "limit": 50,
  "totalPages": 1,
  "stats": {
    "total": 1,
    "active": 1,
    "bySeverity": {
      "critical": 0,
      "warning": 1,
      "info": 0
    }
  }
}
```

## Debugging Tips

### Enable Verbose Logging
```typescript
// In MonitoringApiService
console.log(`API call to ${url} took ${duration}ms`)
```

### Monitor Cache Performance
```typescript
// Check cache hit rate
const hitRate = cacheHits / (cacheHits + cacheMisses)
console.log(`Cache hit rate: ${hitRate * 100}%`)
```

### Track Re-renders
```typescript
// Use React DevTools Profiler
// Look for unnecessary re-renders in MetricCard
```

### Network Tab Analysis
```
- Check API response times
- Verify retry attempts
- Monitor request/response size
```

## Accessibility Checklist

- [ ] All buttons have `aria-label` or text
- [ ] Color is not the only indicator of status
- [ ] Charts have `alt` text descriptions
- [ ] Keyboard navigation works (Tab, Enter, Space)
- [ ] Focus indicators visible
- [ ] Screen reader friendly (semantic HTML)
- [ ] Dark mode has sufficient contrast

## Browser Support

| Browser | Version | Status |
|---------|---------|--------|
| Chrome | 90+ | ✅ Fully supported |
| Firefox | 88+ | ✅ Fully supported |
| Safari | 14+ | ✅ Fully supported |
| Edge | 90+ | ✅ Fully supported |

## Next Steps After Implementation

1. **Performance Monitoring**
   - Setup analytics for tab usage
   - Track API response times
   - Monitor error rates

2. **Feature Enhancements**
   - Add metric trend calculations
   - Implement alert rules configuration
   - Add export functionality (CSV/PDF)

3. **Documentation**
   - Write user guide
   - Create admin documentation
   - Document API endpoints

4. **Optimization**
   - Implement WebSocket for real-time updates
   - Add service worker for offline support
   - Optimize Chart.js bundle size

---

**Quick Start:**
1. Read full pseudocode: `PHASE-5-MONITORING-TAB-PSEUDOCODE.md`
2. Follow implementation order above
3. Test each phase before moving to next
4. Integrate with RealAnalytics.tsx
5. Run full test suite

**Need Help?**
- Pseudocode: `PHASE-5-MONITORING-TAB-PSEUDOCODE.md`
- Architecture: `PHASE-5-RESEARCH.md`
- API Spec: `PHASE-5-SPECIFICATION.md` (if created)
