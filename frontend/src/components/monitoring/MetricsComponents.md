# System Metrics Components Documentation

## Overview

This document describes the `MetricCard` and `SystemMetricsGrid` components used for displaying real-time system monitoring metrics in the Agent Feed application.

## Components

### MetricCard

A reusable card component for displaying a single metric with visual indicators, progress bars, and threshold-based color coding.

#### Props

```typescript
interface MetricCardProps {
  title: string;                                      // Metric title/label
  icon: LucideIcon;                                   // Icon component from lucide-react
  value: number;                                      // Current metric value
  unit: string;                                       // Unit of measurement (%, ms, req/s, etc.)
  max?: number;                                       // Maximum value for progress bar
  threshold?: { warning: number; critical: number };  // Threshold values for color coding
  loading?: boolean;                                  // Show loading skeleton
  colorScheme?: 'blue' | 'green' | 'yellow' | 'red' | 'purple' | 'orange'; // Color theme
}
```

#### Features

- **Visual Progress Bar**: Shows percentage completion when `max` is provided
- **Threshold-Based Coloring**: Automatically applies green/yellow/red colors based on thresholds
- **Loading State**: Displays skeleton animation when loading
- **Dark Mode Support**: Full dark mode compatibility
- **Responsive Design**: Adapts to different screen sizes
- **Icon Integration**: Uses Lucide React icons for consistent iconography

#### Color Schemes

- **blue**: Default, suitable for general metrics (CPU, throughput)
- **green**: Good for resource metrics (memory, disk)
- **yellow**: Attention-grabbing (warnings)
- **red**: Critical metrics (errors, failures)
- **purple**: Distinctive metrics (workers, connections)
- **orange**: Queue and pending items

#### Thresholds

The component automatically colors values based on thresholds:

- **Green**: `value < warning` - Normal operation ✓
- **Yellow**: `warning <= value < critical` - Warning threshold reached ⚡
- **Red**: `value >= critical` - Critical threshold exceeded ⚠

#### Usage Example

```tsx
import { MetricCard } from './components/monitoring';
import { Cpu } from 'lucide-react';

<MetricCard
  title="CPU Usage"
  icon={Cpu}
  value={75.3}
  unit="%"
  max={100}
  threshold={{ warning: 70, critical: 90 }}
  colorScheme="blue"
/>
```

### SystemMetricsGrid

A grid layout component that displays 6 key system metrics using MetricCard components.

#### Props

```typescript
interface SystemMetricsGridProps {
  metrics: SystemMetrics | null;  // System metrics data from API
  loading?: boolean;               // Show loading state for all cards
}
```

#### SystemMetrics Type

```typescript
interface SystemMetrics {
  timestamp: string;
  server_id: string;
  cpu_usage: number;           // 0-100
  memory_usage: number;        // 0-100
  disk_usage: number;          // 0-100
  network_io: NetworkIO;
  response_time: number;       // milliseconds
  throughput: number;          // requests per second
  error_rate: number;          // 0-100
  active_connections: number;  // count
  queue_depth: number;         // count
  cache_hit_rate: number;      // 0-100
}
```

#### Displayed Metrics

1. **CPU Usage** (blue)
   - Icon: `Cpu`
   - Unit: `%`
   - Max: 100
   - Thresholds: warning=70, critical=90

2. **Memory Usage** (green)
   - Icon: `HardDrive`
   - Unit: `%`
   - Max: 100
   - Thresholds: warning=75, critical=90

3. **Active Workers** (purple)
   - Icon: `Users`
   - Unit: `workers`
   - No max or threshold

4. **Queue Length** (orange)
   - Icon: `List`
   - Unit: `items`
   - No max or threshold

5. **Request Rate** (blue)
   - Icon: `Activity`
   - Unit: `req/s`
   - No max or threshold

6. **Error Rate** (red)
   - Icon: `AlertTriangle`
   - Unit: `%`
   - Max: 100
   - Thresholds: warning=1, critical=5

#### Layout

- **Mobile** (< 768px): 1 column
- **Tablet** (768px - 1024px): 2 columns
- **Desktop** (> 1024px): 3 columns
- **Gap**: 1rem (16px) between cards

#### States

1. **Loading State**: Shows skeleton loaders in all cards
2. **Empty State**: Shows "No metrics data available" message
3. **Normal State**: Displays all metrics with proper formatting
4. **Timestamp**: Shows last update time below the grid

#### Usage Example

```tsx
import { SystemMetricsGrid } from './components/monitoring';
import { useSystemMetrics } from './hooks/useSystemMetrics';

function MonitoringDashboard() {
  const { metrics, loading } = useSystemMetrics();

  return (
    <div className="p-6">
      <h1 className="text-2xl font-bold mb-4">System Monitoring</h1>
      <SystemMetricsGrid metrics={metrics} loading={loading} />
    </div>
  );
}
```

## Integration Guide

### 1. Install Dependencies

The components use the following dependencies:

```json
{
  "react": "^18.x",
  "lucide-react": "^0.x",
  "tailwindcss": "^3.x"
}
```

### 2. Import Components

```tsx
import { MetricCard, SystemMetricsGrid } from '@/components/monitoring';
```

### 3. Fetch Metrics Data

Create a custom hook or use an existing API service:

```tsx
import { useState, useEffect } from 'react';
import { SystemMetrics } from '@/types/api';

export const useSystemMetrics = (refreshInterval = 5000) => {
  const [metrics, setMetrics] = useState<SystemMetrics | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchMetrics = async () => {
      try {
        const response = await fetch('/api/monitoring/metrics');
        const data = await response.json();
        setMetrics(data.data);
      } catch (error) {
        console.error('Failed to fetch metrics:', error);
      } finally {
        setLoading(false);
      }
    };

    fetchMetrics();
    const interval = setInterval(fetchMetrics, refreshInterval);
    return () => clearInterval(interval);
  }, [refreshInterval]);

  return { metrics, loading };
};
```

### 4. Use in Component

```tsx
import React from 'react';
import { SystemMetricsGrid } from '@/components/monitoring';
import { useSystemMetrics } from '@/hooks/useSystemMetrics';

export const MonitoringPage: React.FC = () => {
  const { metrics, loading } = useSystemMetrics(3000); // Refresh every 3s

  return (
    <div className="container mx-auto p-6">
      <SystemMetricsGrid metrics={metrics} loading={loading} />
    </div>
  );
};
```

## Styling

### Tailwind Configuration

Ensure your `tailwind.config.js` includes:

```js
module.exports = {
  content: [
    './src/**/*.{js,jsx,ts,tsx}',
  ],
  darkMode: 'class', // Enable dark mode
  theme: {
    extend: {
      // Custom colors if needed
    },
  },
};
```

### Dark Mode

Both components fully support dark mode. Toggle dark mode by adding the `dark` class to your root element:

```html
<html class="dark">
  <!-- Your app -->
</html>
```

Or programmatically:

```tsx
document.documentElement.classList.toggle('dark');
```

## Testing

### Unit Tests

Run the test suite:

```bash
npm test -- MetricCard.test.tsx
npm test -- SystemMetricsGrid.test.tsx
```

### Coverage

Both components have comprehensive test coverage including:

- Rendering tests
- Loading states
- Empty states
- Threshold calculations
- Color scheme application
- Dark mode support
- Accessibility checks

## Performance Considerations

### Optimization Tips

1. **Memoization**: Wrap components in `React.memo()` if parent re-renders frequently
2. **Throttling**: Use throttle/debounce for high-frequency updates
3. **Lazy Loading**: Load monitoring components only when needed
4. **Pagination**: For large metric lists, implement pagination or virtualization

### Example with Memoization

```tsx
import { memo } from 'react';

export const MemoizedSystemMetricsGrid = memo(SystemMetricsGrid, (prev, next) => {
  return prev.metrics?.timestamp === next.metrics?.timestamp &&
         prev.loading === next.loading;
});
```

## API Endpoints

### Expected API Response

```json
{
  "success": true,
  "data": {
    "timestamp": "2024-10-12T10:30:00Z",
    "server_id": "server-001",
    "cpu_usage": 45.3,
    "memory_usage": 62.8,
    "disk_usage": 38.5,
    "network_io": {
      "bytes_in": 1024000,
      "bytes_out": 2048000,
      "packets_in": 500,
      "packets_out": 750
    },
    "response_time": 125,
    "throughput": 45.2,
    "error_rate": 0.5,
    "active_connections": 12,
    "queue_depth": 8,
    "cache_hit_rate": 87.3
  }
}
```

## Accessibility

Both components are built with accessibility in mind:

- Semantic HTML with proper heading structure
- ARIA labels where appropriate
- Keyboard navigation support
- Screen reader friendly
- High contrast support in dark mode
- Focus indicators

## Browser Support

- Chrome 90+
- Firefox 88+
- Safari 14+
- Edge 90+

## Troubleshooting

### Common Issues

1. **Icons not showing**: Ensure `lucide-react` is installed
2. **Styles not applied**: Check Tailwind CSS configuration
3. **Dark mode not working**: Verify `darkMode: 'class'` in Tailwind config
4. **TypeScript errors**: Ensure all type definitions are imported correctly

### Debug Mode

Enable debug logging:

```tsx
const metrics = useSystemMetrics();
console.log('Metrics:', metrics);
```

## Future Enhancements

Potential improvements:

- [ ] Trend indicators (↑↓) showing change over time
- [ ] Historical data charts
- [ ] Export to CSV/JSON
- [ ] Customizable threshold values via props
- [ ] Alerts and notifications
- [ ] Comparison view for multiple servers
- [ ] Real-time WebSocket updates

## Contributing

To contribute improvements:

1. Create a feature branch
2. Write tests for new functionality
3. Update documentation
4. Submit a pull request

## License

MIT License - see LICENSE file for details

## Support

For issues or questions:

- GitHub Issues: [Create an issue](https://github.com/your-org/agent-feed/issues)
- Documentation: [Full docs](https://docs.your-app.com)
- Email: support@your-app.com
