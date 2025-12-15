# AgentsApp Component Usage

This document shows how to use the standalone AgentsApp component in a Next.js application.

## Basic Usage

```typescript
// pages/agents.tsx
import dynamic from 'next/dynamic';
import { useRouter } from 'next/router';

// Dynamic import for the AgentsApp component
const AgentsApp = dynamic(() => import('../src/components/AgentsApp'), {
  loading: () => <div>Loading Agents...</div>,
  ssr: false
});

export default function AgentsPage() {
  const router = useRouter();

  const handleNavigateToAgent = (agentId: string) => {
    router.push(`/agents/${agentId}`);
  };

  const handleNavigateToAgentHome = (agentId: string) => {
    router.push(`/agents/${agentId}/home`);
  };

  return (
    <div className="min-h-screen bg-gray-50">
      <AgentsApp
        onNavigateToAgent={handleNavigateToAgent}
        onNavigateToAgentHome={handleNavigateToAgentHome}
      />
    </div>
  );
}
```

## Features Preserved

- ✅ **IsolatedRealAgentManager integration** - All agent management functionality preserved
- ✅ **Error boundaries** - Comprehensive error handling with RouteErrorBoundary
- ✅ **Loading states** - Suspense boundaries with proper fallback components
- ✅ **WebSocket connectivity** - Real-time agent updates
- ✅ **API service isolation** - Route-specific API service with cleanup
- ✅ **Search functionality** - Agent search and filtering
- ✅ **Agent operations** - Spawn, terminate, and manage agents
- ✅ **Navigation handlers** - Customizable navigation via props

## Key Differences from Original

1. **No React Router dependencies** - Uses prop-based navigation handlers
2. **Standalone component** - Can be imported into any React application
3. **Next.js compatible** - Designed for dynamic import in Next.js
4. **Self-contained** - Includes all necessary providers and context

## Props Interface

```typescript
interface AgentsAppProps {
  className?: string;
  onNavigateToAgent?: (agentId: string) => void;
  onNavigateToAgentHome?: (agentId: string) => void;
}
```

## Navigation Handling

The component accepts optional navigation handlers:
- If provided, they will be called when users click navigation buttons
- If not provided, navigation attempts will be logged to console
- This makes the component flexible for different routing strategies

## Context Providers

The component includes all necessary providers:
- QueryClientProvider for React Query
- VideoPlaybackProvider for media handling
- WebSocketProvider for real-time updates
- RouteWrapper for cleanup management

## Error Handling

Multiple layers of error boundaries:
1. Top-level ErrorBoundary for React errors
2. RouteErrorBoundary for route-specific errors
3. Component-level error states for API failures

This ensures robust error handling at all levels.