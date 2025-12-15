# HealthStatusCard Component

## Overview

The `HealthStatusCard` component is a fully-featured health monitoring card that displays system health status with visual indicators, health score, uptime information, and last update timestamp. It provides a comprehensive view of system health at a glance.

## Features

- ✅ **Visual Status Indicators**: Color-coded badges with icons (green/yellow/red)
- 📊 **Health Score**: 0-100 score with animated progress bar
- ⏱️ **Uptime Display**: Human-readable format (e.g., "5d 12h 34m")
- 🌐 **Network Quality**: Display network quality metrics
- ⚡ **Latency Monitoring**: Real-time latency display in milliseconds
- 🕐 **Last Update**: Relative timestamp display
- 🌙 **Dark Mode**: Full dark mode support
- ♿ **Accessible**: WCAG-compliant with proper ARIA labels
- 🔄 **Loading State**: Skeleton loader with shimmer animation
- 📭 **Empty State**: Friendly placeholder when no data is available
- ⚠️ **Alert Banner**: Automatic warning display for consecutive failures

## Installation

The component is already installed in the project. Import it from the monitoring components directory:

```typescript
import { HealthStatusCard } from '@/components/monitoring';
// or
import { HealthStatusCard } from '@/components/monitoring/HealthStatusCard';
```

## Props

### HealthStatusCardProps

```typescript
interface HealthStatusCardProps {
  healthStatus: HealthStatus | null;
  loading?: boolean;
}
```

### HealthStatus Type

```typescript
interface HealthStatus {
  isHealthy: boolean;
  latency: number | null;
  lastPing: Date | null;
  consecutiveFailures: number;
  uptime: number; // in seconds
  serverTimestamp: Date | null;
  networkQuality: 'excellent' | 'good' | 'fair' | 'poor' | 'unknown';
}
```

## Usage Examples

### Basic Usage

```tsx
import React from 'react';
import { HealthStatusCard } from '@/components/monitoring';

const MyComponent = () => {
  const healthStatus = {
    isHealthy: true,
    latency: 45,
    lastPing: new Date(),
    consecutiveFailures: 0,
    uptime: 432000, // 5 days in seconds
    serverTimestamp: new Date(),
    networkQuality: 'excellent'
  };

  return <HealthStatusCard healthStatus={healthStatus} />;
};
```

### With Loading State

```tsx
<HealthStatusCard healthStatus={null} loading={true} />
```

### Integration with Connection Manager

```tsx
import React, { useEffect, useState } from 'react';
import { HealthStatusCard } from '@/components/monitoring';
import { useConnectionManager } from '@/hooks/useConnectionManager';

const MonitoringDashboard = () => {
  const { health, isLoading } = useConnectionManager();

  return <HealthStatusCard healthStatus={health} loading={isLoading} />;
};
```

### Live Updating Data

```tsx
import React, { useEffect, useState } from 'react';
import { HealthStatusCard } from '@/components/monitoring';

const LiveHealthMonitor = () => {
  const [health, setHealth] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    // Initial load
    fetchHealthStatus().then(data => {
      setHealth(data);
      setLoading(false);
    });

    // Poll for updates every 30 seconds
    const interval = setInterval(() => {
      fetchHealthStatus().then(setHealth);
    }, 30000);

    return () => clearInterval(interval);
  }, []);

  return <HealthStatusCard healthStatus={health} loading={loading} />;
};
```

## Status Types

The component automatically determines the status type based on health data:

### Healthy (Green)
- `isHealthy: true`
- Health score ≥ 80
- Network quality: excellent or good
- No consecutive failures

### Degraded (Yellow)
- `isHealthy: true` but health score 50-79
- Network quality: fair or poor
- Minor issues detected

### Unhealthy (Red)
- `isHealthy: false` OR health score < 50
- Multiple consecutive failures
- Critical issues requiring attention

## Health Score Calculation

The health score (0-100) is calculated based on:

1. **Base Score**: Starts at 100
2. **Consecutive Failures**: -10 points per failure
3. **Network Quality**:
   - Excellent: -0 points
   - Good: -5 points
   - Fair: -15 points
   - Poor: -30 points
   - Unknown: -20 points
4. **Health Status**: -20 points if `isHealthy: false`

## Uptime Formatting

The component automatically formats uptime seconds into a human-readable format:

- `86400` seconds → `1d`
- `3661` seconds → `1h 1m`
- `90061` seconds → `1d 1h 1m`
- `45` seconds → `45m`

## Accessibility

The component follows WCAG 2.1 Level AA guidelines:

- ✅ Semantic HTML structure
- ✅ ARIA labels for all interactive elements
- ✅ `role="status"` for status badge with `aria-live="polite"`
- ✅ `role="alert"` for warning messages with `aria-live="assertive"`
- ✅ `role="progressbar"` for health score with aria-valuenow/min/max
- ✅ Color is not the only means of conveying information
- ✅ Sufficient color contrast ratios
- ✅ Keyboard navigation support

## Dark Mode

The component fully supports dark mode using Tailwind's dark mode classes:

- Background: `dark:bg-gray-800`
- Text: `dark:text-gray-100`
- Borders: `dark:border-gray-700`
- Secondary text: `dark:text-gray-400`

Enable dark mode by adding the `dark` class to a parent element:

```tsx
<div className="dark">
  <HealthStatusCard healthStatus={healthStatus} />
</div>
```

## Styling

The component uses Tailwind CSS classes and the shadcn/ui Card component. It's fully responsive and adapts to different screen sizes.

### Customization

To customize the appearance, you can:

1. **Override Tailwind classes** by wrapping in a container with custom classes
2. **Modify the component file** directly for project-specific changes
3. **Use CSS-in-JS** or custom CSS to target specific elements

Example:

```tsx
<div className="custom-health-card">
  <HealthStatusCard healthStatus={healthStatus} />
</div>
```

```css
.custom-health-card [role="region"] {
  /* Custom styles */
}
```

## Performance

The component is optimized for performance:

- **No unnecessary re-renders**: Only updates when props change
- **Efficient calculations**: Health score and status computed once per render
- **Shimmer animations**: Hardware-accelerated CSS animations
- **Small bundle size**: No heavy dependencies

## Browser Support

- ✅ Chrome/Edge (latest)
- ✅ Firefox (latest)
- ✅ Safari (latest)
- ✅ Mobile browsers (iOS Safari, Chrome Mobile)

## Troubleshooting

### Issue: Component not rendering

**Solution**: Ensure the HealthStatus type matches the expected interface.

```typescript
// ✅ Correct
const health = {
  isHealthy: true,
  latency: 45,
  lastPing: new Date(),
  consecutiveFailures: 0,
  uptime: 86400,
  serverTimestamp: new Date(),
  networkQuality: 'excellent'
};

// ❌ Incorrect - missing required fields
const health = {
  isHealthy: true,
  latency: 45
};
```

### Issue: Dark mode not working

**Solution**: Add the `dark` class to a parent element:

```tsx
<div className="dark">
  <HealthStatusCard healthStatus={healthStatus} />
</div>
```

### Issue: Loading state not showing

**Solution**: Ensure `loading={true}` and `healthStatus={null}`:

```tsx
<HealthStatusCard healthStatus={null} loading={true} />
```

## API Reference

### Functions

#### `formatUptime(seconds: number): string`
Converts seconds to human-readable uptime format.

**Parameters:**
- `seconds` (number): Uptime in seconds

**Returns:** String in format "5d 12h 34m"

#### `calculateHealthScore(healthStatus: HealthStatus): number`
Calculates health score (0-100) based on health status.

**Parameters:**
- `healthStatus` (HealthStatus): Current health status

**Returns:** Number between 0 and 100

#### `getStatusType(healthStatus: HealthStatus): StatusType`
Determines status type from health data.

**Parameters:**
- `healthStatus` (HealthStatus): Current health status

**Returns:** 'healthy' | 'degraded' | 'unhealthy'

## Related Components

- **MonitoringTab**: Full monitoring dashboard
- **SystemMetricsGrid**: Detailed system metrics
- **AlertsPanel**: Active alerts and warnings

## Version History

- **v1.0.0** (2025-10-12): Initial release
  - Health status display
  - Health score with progress bar
  - Uptime formatting
  - Dark mode support
  - Loading and empty states
  - Full accessibility support

## License

Part of the Agent Feed project. See project license for details.
