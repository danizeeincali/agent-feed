# SPARC PHASE 1: React Router to Next.js Routing Migration Analysis

## Executive Summary

Complete analysis of React Router routes in `/workspaces/agent-feed/frontend/src/App.tsx` and mapping to Next.js file-based routing structure. This document provides the foundation for eliminating React Router entirely and converting to Next.js native routing.

## Current React Router Routes Analysis

### Identified Routes from App.tsx (Lines 246-321)

1. **Root Route - "/" (Lines 247-257)**
   - Component: `SocialMediaFeed` (via `SafeFeedWrapper`)
   - Wrapped with: `RouteWrapper`, `RouteErrorBoundary`, `Suspense`
   - Fallback: `FallbackComponents.FeedFallback`

2. **Dashboard Route - "/dashboard" (Lines 259-265)**
   - Component: `AgentDashboard`
   - Wrapped with: `RouteErrorBoundary`, `Suspense`
   - Fallback: `FallbackComponents.DashboardFallback`

3. **Agents List Route - "/agents" (Lines 266-274)**
   - Component: `IsolatedRealAgentManager`
   - Wrapped with: `RouteWrapper`, `RouteErrorBoundary`, `Suspense`
   - Fallback: `FallbackComponents.AgentManagerFallback`

4. **Agent Profile Route - "/agents/:agentId" (Lines 275-281)**
   - Component: `WorkingAgentProfile`
   - Uses `useParams()` for agentId
   - Wrapped with: `RouteErrorBoundary`, `Suspense`
   - Fallback: Generic loading message

5. **Dynamic Agent Pages Route - "/agents/:agentId/pages/:pageId" (Lines 282-288)**
   - Component: `DynamicPageRenderer`
   - Uses `useParams()` for agentId and pageId
   - Wrapped with: `RouteErrorBoundary`, `Suspense`
   - Fallback: Generic loading message

6. **Analytics Route - "/analytics" (Lines 290-296)**
   - Component: `RealAnalytics`
   - Wrapped with: `RouteErrorBoundary`, `Suspense`
   - Fallback: `FallbackComponents.AnalyticsFallback`

7. **Activity Feed Route - "/activity" (Lines 297-303)**
   - Component: `RealActivityFeed`
   - Wrapped with: `RouteErrorBoundary`, `Suspense`
   - Fallback: `FallbackComponents.ActivityFallback`

8. **Drafts Route - "/drafts" (Lines 304-310)**
   - Component: `DraftManager`
   - Wrapped with: `RouteErrorBoundary`, `Suspense`
   - Fallback: Generic loading message

9. **Debug Posts Route - "/debug-posts" (Lines 311-317)**
   - Component: `DebugPostsDisplay`
   - Wrapped with: `RouteErrorBoundary`, `Suspense`
   - Fallback: Generic loading message

10. **Catch-All Route - "*" (Line 320)**
    - Component: `FallbackComponents.NotFoundFallback`

### Removed Routes (Commented Out)
- `/workflows` route was removed (Line 289) - marked as "TDD GREEN Phase"

## Next.js File-Based Routing Mapping

### Current Next.js Pages Structure

```
/workspaces/agent-feed/pages/
├── _app.tsx (Next.js app wrapper)
├── index.tsx (Currently loads React Router App)
├── agents.tsx (Existing static page)
├── agents-react.tsx (Duplicate)
├── css-test.tsx (Test page)
└── api/
    └── activities/
        └── index.js (API route)
```

### Required Next.js Page Structure

```
pages/
├── _app.tsx (Global app configuration)
├── index.tsx (Feed page - "/" route)
├── dashboard.tsx (Dashboard page - "/dashboard" route)
├── agents/
│   ├── index.tsx (Agents list - "/agents" route)
│   ├── [agentId].tsx (Agent profile - "/agents/:agentId" route)
│   └── [agentId]/
│       └── pages/
│           └── [pageId].tsx (Dynamic pages - "/agents/:agentId/pages/:pageId")
├── analytics.tsx (Analytics page - "/analytics" route)
├── activity.tsx (Activity feed - "/activity" route)
├── drafts.tsx (Drafts page - "/drafts" route)
├── debug-posts.tsx (Debug posts - "/debug-posts" route)
└── 404.tsx (Not found page - "*" route)
```

## Component Dependencies Analysis

### Core Components and Their React Router Dependencies

1. **Navigation Dependencies (App.tsx Lines 95-156)**
   - Uses `useLocation()` from react-router-dom
   - Uses `Link` component for navigation
   - **Migration Required**: Replace with Next.js `useRouter()` and `Link`

2. **Component Dependencies with Router Hooks**

   a. **IsolatedRealAgentManager** (/workspaces/agent-feed/frontend/src/components/IsolatedRealAgentManager.tsx)
   - Uses: `useNavigate()` (Line 23)
   - Migration: Replace with Next.js `useRouter().push()`

   b. **WorkingAgentProfile** (/workspaces/agent-feed/frontend/src/components/WorkingAgentProfile.tsx)
   - Uses: `useParams()` (Line 28), `useNavigate()` (Line 29)
   - Migration: Replace with Next.js `useRouter().query` and `useRouter().push()`

   c. **DynamicPageRenderer** (/workspaces/agent-feed/frontend/src/components/DynamicPageRenderer.tsx)
   - Uses: `useParams()` (Line 36), `useNavigate()` (Line 37)
   - Migration: Replace with Next.js `useRouter().query` and `useRouter().push()`

   d. **DraftManager** (/workspaces/agent-feed/frontend/src/components/DraftManager.tsx)
   - Uses: `useNavigate()` (Line 2)
   - Migration: Replace with Next.js `useRouter().push()`

### Components WITHOUT Router Dependencies
- `RealSocialMediaFeed` - No React Router hooks
- `RealAnalytics` - No React Router hooks
- `RealActivityFeed` - No React Router hooks
- `AgentDashboard` - No React Router hooks
- `DebugPostsDisplay` - No React Router hooks

## Layout Component Analysis

### Current Layout Implementation (App.tsx Lines 86-213)
- **Location**: Embedded in App.tsx
- **Dependencies**: `useLocation()` from react-router-dom
- **Features**:
  - Responsive sidebar navigation
  - Search functionality
  - Connection status display
  - Mobile-responsive design

### Layout Migration Strategy
- Extract layout to `components/Layout.tsx`
- Replace `useLocation()` with Next.js `useRouter()`
- Replace React Router `Link` with Next.js `Link`
- Maintain responsive design and functionality

## Provider Dependencies

### Current Provider Structure (App.tsx Lines 227-329)
```tsx
<GlobalErrorBoundary>
  <QueryClientProvider client={queryClient}>
    <VideoPlaybackProvider>
      <WebSocketProvider>
        <Router> {/* React Router - TO BE REMOVED */}
          <Layout>
            <Routes> {/* TO BE REMOVED */}
              {/* Route definitions */}
            </Routes>
          </Layout>
        </Router>
      </WebSocketProvider>
    </VideoPlaybackProvider>
  </QueryClientProvider>
</GlobalErrorBoundary>
```

### Target Provider Structure (Next.js _app.tsx)
```tsx
<GlobalErrorBoundary>
  <QueryClientProvider client={queryClient}>
    <VideoPlaybackProvider>
      <WebSocketProvider>
        <Layout>
          <Component {...pageProps} /> {/* Next.js page component */}
        </Layout>
      </WebSocketProvider>
    </VideoPlaybackProvider>
  </QueryClientProvider>
</GlobalErrorBoundary>
```

## Conversion Strategy

### Phase 1: Preparation
1. **Extract Layout Component**
   - Move layout from App.tsx to separate component
   - Replace React Router hooks with Next.js equivalents
   - Test layout independently

2. **Create Page Structure**
   - Create all required page files in correct directory structure
   - Implement basic page components

### Phase 2: Component Migration
1. **Update Components with Router Dependencies**
   - Replace `useNavigate()` with `useRouter().push()`
   - Replace `useParams()` with `useRouter().query`
   - Replace `useLocation()` with `useRouter()`

2. **Update Navigation Links**
   - Replace React Router `Link` with Next.js `Link`
   - Update all navigation references

### Phase 3: Provider Restructuring
1. **Move Providers to _app.tsx**
   - Extract providers from App.tsx
   - Implement in Next.js _app.tsx structure
   - Remove React Router dependencies

### Phase 4: Testing and Cleanup
1. **Route Testing**
   - Test all page routes
   - Verify parameter passing
   - Test navigation functionality

2. **Remove React Router**
   - Remove React Router dependencies
   - Clean up unused imports
   - Remove App.tsx routing logic

## File Operations Required

### Files to Create
```
pages/dashboard.tsx
pages/agents/index.tsx
pages/agents/[agentId].tsx
pages/agents/[agentId]/pages/[pageId].tsx
pages/analytics.tsx
pages/activity.tsx
pages/drafts.tsx
pages/debug-posts.tsx
pages/404.tsx
components/Layout.tsx
```

### Files to Modify
```
pages/_app.tsx (Add providers and layout)
pages/index.tsx (Replace with actual feed component)
frontend/src/components/IsolatedRealAgentManager.tsx
frontend/src/components/WorkingAgentProfile.tsx
frontend/src/components/DynamicPageRenderer.tsx
frontend/src/components/DraftManager.tsx
```

### Files to Remove/Archive
```
frontend/src/App.tsx (After migration complete)
```

## Risk Assessment

### High Risk Areas
1. **Dynamic Routing**: `/agents/:agentId/pages/:pageId` structure
2. **Component State**: Ensuring state management works with new routing
3. **WebSocket Integration**: Maintaining WebSocket connections across route changes

### Medium Risk Areas
1. **Layout Consistency**: Ensuring layout works across all pages
2. **Error Boundaries**: Maintaining error handling structure
3. **Suspense Fallbacks**: Implementing proper loading states

### Low Risk Areas
1. **Static Routes**: Simple page-to-page migrations
2. **API Integration**: Existing API calls should work unchanged
3. **Styling**: CSS should remain compatible

## Success Criteria

1. **All routes functional** in Next.js file-based structure
2. **Navigation working** with Next.js Link components
3. **Parameter passing** working for dynamic routes
4. **Layout consistency** maintained across all pages
5. **Error handling** preserved with error boundaries
6. **Performance maintained** or improved
7. **React Router completely removed** from dependencies

## Next Steps

1. Begin with Phase 1: Extract Layout component
2. Create basic page structure
3. Migrate components one by one
4. Test each migration step thoroughly
5. Remove React Router dependencies last

This analysis provides the complete foundation for SPARC Phase 1 migration from React Router to Next.js file-based routing.