# Monitoring Components

This directory contains all components related to system monitoring functionality.

## Components

### MonitoringTab
Main container component for the monitoring interface. Orchestrates all child components and manages state through the `useMonitoringData` hook.

**Features:**
- Real-time health status monitoring
- System metrics visualization
- Historical data charts
- Alert management
- Auto-refresh with configurable intervals
- Dark mode support
- Graceful error handling with retry
- Loading states for all sections

**Usage:**
```tsx
import MonitoringTab from './components/monitoring/MonitoringTab';

<MonitoringTab />
```

### Child Components (To be implemented)

#### RefreshControls
Controls for manual refresh, auto-refresh toggle, and refresh interval configuration.

#### HealthStatusCard
Displays overall system health status with visual indicators.

#### SystemMetricsGrid
Grid layout displaying key system metrics (CPU, Memory, Disk, Network, etc.).

#### MonitoringCharts
Historical charts showing metric trends over time.

#### AlertsPanel
Panel for displaying and managing system alerts with acknowledgement functionality.

## Architecture

```
MonitoringTab (Container)
├── RefreshControls
├── HealthStatusCard
├── SystemMetricsGrid
├── MonitoringCharts
└── AlertsPanel
```

## Data Flow

1. `useMonitoringData` hook provides all state and actions
2. MonitoringTab orchestrates child components
3. Each child component is responsible for its own rendering
4. Loading states prevent UI blocking
5. Errors are isolated and allow retry

## Styling

All components use Tailwind CSS with:
- Consistent spacing (space-y-6, space-y-4)
- Dark mode support (dark: prefix)
- Responsive layouts (grid, flex)
- Accessible color contrast
- Smooth transitions

## Development

### Adding New Components

1. Create component in this directory
2. Follow existing patterns from RealAnalytics.tsx
3. Add dark mode support
4. Include loading states
5. Export from index.ts
6. Update this README

### Testing

Each component should have:
- Unit tests for logic
- Snapshot tests for UI
- Integration tests with useMonitoringData hook
- Accessibility tests

## Next Steps

1. ✅ Create MonitoringTab (DONE)
2. Create RefreshControls component
3. Create HealthStatusCard component
4. Create SystemMetricsGrid component
5. Create MonitoringCharts component
6. Create AlertsPanel component
7. Integrate into RealAnalytics.tsx
8. Add tests
