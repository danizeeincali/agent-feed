# RefreshControls Component

A comprehensive, accessible control panel for managing data refresh behavior in monitoring dashboards and real-time applications.

## Features

- ✅ Auto-refresh toggle with visual state indicators
- ✅ Configurable refresh interval selector (5s, 10s, 30s, 1m, 5m)
- ✅ Manual refresh button with loading animation
- ✅ Real-time "last updated" display with automatic updates
- ✅ Full keyboard navigation support
- ✅ Screen reader friendly with proper ARIA labels
- ✅ Dark mode support
- ✅ Responsive layout (mobile & desktop)
- ✅ TypeScript typed with comprehensive interfaces

## Installation

The component is part of the monitoring components package:

```typescript
import { RefreshControls } from '@/components/monitoring';
```

## Props API

### RefreshControlsProps

| Prop | Type | Required | Description |
|------|------|----------|-------------|
| `autoRefresh` | `boolean` | ✅ | Whether auto-refresh is currently enabled |
| `onToggleAutoRefresh` | `() => void` | ✅ | Callback when auto-refresh toggle is clicked |
| `onManualRefresh` | `() => void` | ✅ | Callback when manual refresh button is clicked |
| `isRefreshing` | `boolean` | ✅ | Whether a refresh operation is currently in progress |
| `lastUpdated` | `Date \| null` | ✅ | Timestamp of the last successful update |
| `refreshInterval` | `number` | ✅ | Current refresh interval in milliseconds |
| `onIntervalChange` | `(ms: number) => void` | ❌ | Optional callback when refresh interval is changed |

## Basic Usage

```typescript
import React, { useState } from 'react';
import { RefreshControls } from '@/components/monitoring';

function MyDashboard() {
  const [autoRefresh, setAutoRefresh] = useState(false);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [lastUpdated, setLastUpdated] = useState<Date>(new Date());
  const [refreshInterval, setRefreshInterval] = useState(10000);

  const handleRefresh = async () => {
    setIsRefreshing(true);
    try {
      await fetchData();
      setLastUpdated(new Date());
    } finally {
      setIsRefreshing(false);
    }
  };

  return (
    <div>
      <RefreshControls
        autoRefresh={autoRefresh}
        onToggleAutoRefresh={() => setAutoRefresh(!autoRefresh)}
        onManualRefresh={handleRefresh}
        isRefreshing={isRefreshing}
        lastUpdated={lastUpdated}
        refreshInterval={refreshInterval}
        onIntervalChange={setRefreshInterval}
      />
      {/* Your dashboard content */}
    </div>
  );
}
```

## Advanced Usage

### Auto-Refresh with useEffect

```typescript
import React, { useState, useEffect, useCallback } from 'react';
import { RefreshControls } from '@/components/monitoring';

function AutoRefreshDashboard() {
  const [autoRefresh, setAutoRefresh] = useState(true);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [lastUpdated, setLastUpdated] = useState<Date>(new Date());
  const [refreshInterval, setRefreshInterval] = useState(30000);

  const fetchData = useCallback(async () => {
    setIsRefreshing(true);
    try {
      const response = await fetch('/api/metrics');
      const data = await response.json();
      // Process data...
      setLastUpdated(new Date());
    } catch (error) {
      console.error('Fetch failed:', error);
    } finally {
      setIsRefreshing(false);
    }
  }, []);

  useEffect(() => {
    if (!autoRefresh) return;

    // Initial fetch
    fetchData();

    // Set up interval
    const intervalId = setInterval(fetchData, refreshInterval);

    return () => clearInterval(intervalId);
  }, [autoRefresh, refreshInterval, fetchData]);

  return (
    <div className="dashboard-container">
      <header className="dashboard-header">
        <h1>System Metrics</h1>
        <RefreshControls
          autoRefresh={autoRefresh}
          onToggleAutoRefresh={() => setAutoRefresh(!autoRefresh)}
          onManualRefresh={fetchData}
          isRefreshing={isRefreshing}
          lastUpdated={lastUpdated}
          refreshInterval={refreshInterval}
          onIntervalChange={setRefreshInterval}
        />
      </header>
      {/* Dashboard content */}
    </div>
  );
}
```

### Custom Hook for Reusable Logic

```typescript
import { useState, useEffect, useCallback } from 'react';

function useRefreshableData<T>(
  fetchFn: () => Promise<T>,
  initialInterval: number = 10000
) {
  const [autoRefresh, setAutoRefresh] = useState(false);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [lastUpdated, setLastUpdated] = useState<Date | null>(null);
  const [refreshInterval, setRefreshInterval] = useState(initialInterval);
  const [data, setData] = useState<T | null>(null);
  const [error, setError] = useState<Error | null>(null);

  const refresh = useCallback(async () => {
    setIsRefreshing(true);
    setError(null);
    try {
      const result = await fetchFn();
      setData(result);
      setLastUpdated(new Date());
    } catch (err) {
      setError(err instanceof Error ? err : new Error('Unknown error'));
    } finally {
      setIsRefreshing(false);
    }
  }, [fetchFn]);

  useEffect(() => {
    if (!autoRefresh) return;

    refresh();
    const intervalId = setInterval(refresh, refreshInterval);

    return () => clearInterval(intervalId);
  }, [autoRefresh, refreshInterval, refresh]);

  return {
    data,
    error,
    isRefreshing,
    autoRefresh,
    lastUpdated,
    refreshInterval,
    setAutoRefresh,
    setRefreshInterval,
    refresh,
  };
}

// Usage:
function MyComponent() {
  const {
    data,
    isRefreshing,
    autoRefresh,
    lastUpdated,
    refreshInterval,
    setAutoRefresh,
    setRefreshInterval,
    refresh,
  } = useRefreshableData(fetchMyData, 10000);

  return (
    <RefreshControls
      autoRefresh={autoRefresh}
      onToggleAutoRefresh={() => setAutoRefresh(!autoRefresh)}
      onManualRefresh={refresh}
      isRefreshing={isRefreshing}
      lastUpdated={lastUpdated}
      refreshInterval={refreshInterval}
      onIntervalChange={setRefreshInterval}
    />
  );
}
```

## Interval Options

The component provides five preset intervals:

| Label | Value (ms) | Description |
|-------|-----------|-------------|
| `5s` | 5000 | Fast refresh for critical data |
| `10s` | 10000 | Default for most use cases |
| `30s` | 30000 | Moderate refresh rate |
| `1m` | 60000 | Low-frequency updates |
| `5m` | 300000 | Minimal refresh for stable data |

## Accessibility

The component follows WCAG 2.1 Level AA guidelines:

### Keyboard Navigation
- **Tab**: Navigate between controls
- **Space/Enter**: Activate buttons and toggle
- **Arrow Keys**: Navigate select options

### Screen Reader Support
- Toggle announces state changes ("Auto-refresh is on/off")
- Button announces refresh status ("Refreshing..." or "Refresh data")
- Live regions announce dynamic content updates
- Proper ARIA labels and roles throughout

### Visual Indicators
- High contrast colors for all states
- Clear focus indicators
- Loading animations for async operations
- Color-blind friendly state indicators

## Styling

The component uses Tailwind CSS with full dark mode support:

### Color Scheme
- **Auto-Refresh ON**: Green (green-600/green-500)
- **Auto-Refresh OFF**: Gray (gray-300/gray-600)
- **Refresh Button**: Blue (blue-600/blue-500)
- **Text**: Gray hierarchy (gray-600/gray-400)

### Responsive Breakpoints
- **Mobile**: Vertical stack layout
- **Desktop (sm+)**: Horizontal layout with proper spacing

### Dark Mode
All colors automatically adapt to dark mode using Tailwind's `dark:` prefix.

## Testing

### Unit Tests

```bash
npm test RefreshControls.test.tsx
```

Test coverage includes:
- ✅ Component rendering
- ✅ User interactions (clicks, selections)
- ✅ State management
- ✅ Timer updates
- ✅ Accessibility features
- ✅ Edge cases
- ✅ Dark mode classes
- ✅ Responsive layout

### Integration Testing

```typescript
import { render, screen, fireEvent } from '@testing-library/react';
import { RefreshControls } from './RefreshControls';

test('auto-refresh triggers data fetch', async () => {
  const mockFetch = jest.fn();
  const { rerender } = render(
    <RefreshControls
      autoRefresh={false}
      onToggleAutoRefresh={() => {}}
      onManualRefresh={mockFetch}
      isRefreshing={false}
      lastUpdated={new Date()}
      refreshInterval={10000}
    />
  );

  // Enable auto-refresh
  const toggle = screen.getByRole('switch');
  fireEvent.click(toggle);

  // Verify fetch was called
  expect(mockFetch).toHaveBeenCalled();
});
```

## Performance Considerations

1. **Timer Cleanup**: The component properly cleans up intervals on unmount
2. **Memoization**: Consider wrapping callbacks with `useCallback`
3. **Debouncing**: For expensive operations, debounce the refresh function
4. **Lazy Updates**: Relative time updates use efficient setInterval

## Common Patterns

### Disable Interval Selector

Simply omit the `onIntervalChange` prop:

```typescript
<RefreshControls
  autoRefresh={autoRefresh}
  onToggleAutoRefresh={() => setAutoRefresh(!autoRefresh)}
  onManualRefresh={handleRefresh}
  isRefreshing={isRefreshing}
  lastUpdated={lastUpdated}
  refreshInterval={10000}
  // No onIntervalChange - interval selector won't show
/>
```

### Handle Null Last Updated

The component gracefully handles `null` last updated:

```typescript
<RefreshControls
  // ... other props
  lastUpdated={null} // Shows "Never"
/>
```

### Prevent Refresh During Operations

Disable refresh while processing:

```typescript
const [isProcessing, setIsProcessing] = useState(false);

<RefreshControls
  // ... other props
  isRefreshing={isProcessing || isRefreshing}
/>
```

## Browser Support

- ✅ Chrome/Edge 90+
- ✅ Firefox 88+
- ✅ Safari 14+
- ✅ Mobile browsers (iOS Safari, Chrome Mobile)

## Dependencies

- `react` >= 18.0.0
- `lucide-react` (for RefreshCw icon)
- `tailwindcss` (for styling)

## Related Components

- `MonitoringTab`: Main monitoring dashboard
- `HealthStatusCard`: System health display
- `SystemMetricsGrid`: Metrics visualization

## Contributing

When modifying this component:

1. Maintain accessibility features
2. Update tests for new behavior
3. Preserve TypeScript types
4. Test dark mode appearance
5. Verify responsive layout
6. Update documentation

## License

Part of the Agent Feed project.
