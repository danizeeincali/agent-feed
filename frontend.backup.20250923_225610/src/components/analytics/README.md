# Analytics Components

Comprehensive analytics dashboard components for Claude Code SDK cost tracking, usage analytics, and performance insights.

## Features

✅ **Error Boundaries**: All components wrapped with robust error handling  
✅ **Loading States**: Skeleton loaders and loading fallbacks  
✅ **Dynamic Imports**: Lazy loading for better performance  
✅ **TypeScript**: Fully typed with comprehensive interfaces  
✅ **Real-time Updates**: WebSocket support for live data  
✅ **Export Functions**: PDF, CSV, JSON export capabilities  
✅ **Optimization Recommendations**: AI-powered cost optimization  
✅ **Responsive Design**: Mobile-first responsive layouts  

## Component Structure

```
src/components/analytics/
├── index.ts                          # Main exports
├── EnhancedAnalyticsPage.tsx         # Main analytics page with error boundaries
├── AnalyticsProvider.tsx             # Context provider for state management
├── AnalyticsErrorBoundary.tsx        # Error boundary with fallbacks
├── AnalyticsImportTest.tsx           # Import validation test component
├── CostOverviewDashboard.tsx         # Cost tracking dashboard
├── MessageStepAnalytics.tsx          # Message and step analytics
├── OptimizationRecommendations.tsx   # Cost optimization suggestions
├── ExportReportingFeatures.tsx       # Export and reporting tools
└── README.md                         # This file
```

## Usage

### Basic Usage

```tsx
import { AnalyticsPage } from '@/components/analytics';

export default function Analytics() {
  return <AnalyticsPage />;
}
```

### Advanced Usage with Custom Configuration

```tsx
import { 
  EnhancedAnalyticsPage,
  AnalyticsProvider,
  AnalyticsErrorBoundary 
} from '@/components/analytics';

export default function CustomAnalytics() {
  return (
    <AnalyticsProvider 
      enableRealTime={true}
      refreshInterval={15000}
    >
      <AnalyticsErrorBoundary>
        <EnhancedAnalyticsPage />
      </AnalyticsErrorBoundary>
    </AnalyticsProvider>
  );
}
```

### Individual Component Usage

```tsx
import { 
  CostOverviewDashboard,
  MessageStepAnalytics,
  withAnalyticsErrorBoundary 
} from '@/components/analytics';

const SafeCostDashboard = withAnalyticsErrorBoundary(CostOverviewDashboard);

export default function CustomDashboard() {
  return (
    <div>
      <SafeCostDashboard realTimeUpdates={true} />
      <MessageStepAnalytics timeRange="7d" />
    </div>
  );
}
```

## Available Components

### Core Components

- **`EnhancedAnalyticsPage`**: Main analytics page with all features
- **`CostOverviewDashboard`**: Cost tracking and budget monitoring
- **`MessageStepAnalytics`**: Message processing and step execution analytics
- **`OptimizationRecommendations`**: AI-powered cost optimization suggestions
- **`ExportReportingFeatures`**: Data export and reporting tools

### Utilities

- **`AnalyticsProvider`**: Context provider for global state
- **`AnalyticsErrorBoundary`**: Error boundary with user-friendly fallbacks
- **`AnalyticsLoadingFallback`**: Loading skeleton component
- **`useAnalytics`**: Hook for accessing analytics context
- **`withAnalyticsProvider`**: HOC for automatic provider wrapping
- **`withAnalyticsErrorBoundary`**: HOC for automatic error boundary wrapping

### Chart Components

- **`LineChart`**: Time series and trend visualization
- **`BarChart`**: Categorical data comparison
- **`PieChart`**: Distribution and proportion charts

## Error Handling

All components include comprehensive error handling:

1. **Component-level error boundaries**: Each major component is wrapped
2. **Graceful fallbacks**: User-friendly error messages with retry options
3. **Development debugging**: Detailed error information in development mode
4. **Automatic recovery**: Smart retry mechanisms for transient errors

## Loading States

Dynamic loading with skeleton screens:

1. **Lazy loading**: Components loaded on demand for better performance
2. **Skeleton loaders**: Animated placeholders during load
3. **Progressive loading**: Charts and data load incrementally
4. **Suspense boundaries**: React Suspense for smooth loading transitions

## Type Safety

Full TypeScript support with comprehensive types:

```tsx
import type {
  CostMetrics,
  TokenUsageMetrics,
  MessageAnalytics,
  StepAnalytics,
  AnalyticsDashboardState,
  ChartDataPoint,
  ExportData
} from '@/components/analytics';
```

## Real-time Features

- WebSocket connections for live data updates
- Configurable refresh intervals
- Automatic reconnection handling
- Bandwidth-efficient delta updates

## Performance

- **Code splitting**: Lazy loaded components
- **Bundle optimization**: Tree-shaking friendly exports
- **Memory management**: Automatic cleanup of subscriptions
- **Efficient rendering**: Memoized components and selective updates

## Testing

Validate imports and functionality:

```tsx
import { AnalyticsImportTest } from '@/components/analytics/AnalyticsImportTest';

// Test component validates all imports work correctly
<AnalyticsImportTest />
```

## Development

### Adding New Components

1. Create component in `/src/components/analytics/`
2. Add error boundary wrapper
3. Include loading states
4. Export from `index.ts`
5. Add to `AnalyticsImportTest.tsx`
6. Update this README

### Testing Import Issues

```bash
# Type check
npm run typecheck

# Build check
npm run build

# Lint check
npm run lint
```

## Integration

The analytics system integrates seamlessly with:

- Next.js App Router
- Tailwind CSS for styling
- Lucide React for icons
- React Query for data fetching
- WebSocket for real-time updates

## Troubleshooting

### Import Errors
- Ensure all dependencies are installed
- Check path aliases in `tsconfig.json`
- Verify component exports in `index.ts`

### Build Errors
- Run `npm run typecheck` for TypeScript errors
- Check for circular dependencies
- Ensure all lazy imports have proper fallbacks

### Runtime Errors
- Check browser console for error details
- Verify error boundaries are properly configured
- Test with `AnalyticsImportTest` component
