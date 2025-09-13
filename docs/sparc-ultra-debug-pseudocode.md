# SPARC Ultra Debug Phase 2: Pseudocode Analysis

## Execution Path Tracing

### Current User Navigation Flow
```
1. User clicks URL: http://127.0.0.1:5173/agents/personal-todos-agent/pages/b2935f20-b8a2-4be4-bed4-f6f467a8df9d
2. Browser processes URL: /agents/:agentId/pages/:pageId
3. React Router evaluates routes in App.tsx
4. FAILURE: No matching route for `/agents/:agentId/pages/:pageId`
5. Router falls back to catch-all or 404 handling
6. Generic "No pages found" error displayed
```

### Backend Data Availability (CONFIRMED)
```
ENDPOINT: GET http://localhost:3000/api/agents/personal-todos-agent/pages
RESPONSE STATUS: 200 OK
DATA CONFIRMED: 
{
  "success": true,
  "agent_id": "personal-todos-agent", 
  "pages": [
    {
      "id": "b2935f20-b8a2-4be4-bed4-f6f467a8df9d",
      "title": "Personal Todos Dashboard",
      "page_type": "dynamic",
      "content_type": "json",
      "status": "published"
    }
  ],
  "total": 2
}
```

### Failing Execution Path Analysis

#### Path 1: React Router Resolution (FAILS HERE)
```pseudocode
FUNCTION handleURLNavigation(url: "/agents/personal-todos-agent/pages/b2935f20-b8a2-4be4-bed4-f6f467a8df9d")
  PARSE url_pattern = "/agents/:agentId/pages/:pageId"
  EXTRACT agentId = "personal-todos-agent"
  EXTRACT pageId = "b2935f20-b8a2-4be4-bed4-f6f467a8df9d"
  
  SEARCH routes_config IN App.tsx:
    - Route "/", "/agents", "/agents/:agentId" (EXISTS)
    - Route "/agents/:agentId/pages/:pageId" (MISSING!!!)
  
  RESULT: NO_MATCHING_ROUTE_FOUND
  FALLBACK: Generic 404 or agent overview
END FUNCTION
```

#### Path 2: API Integration Analysis (WORKING)
```pseudocode
FUNCTION verifyBackendAPI(agentId: "personal-todos-agent", pageId: "b2935f20...")
  ENDPOINT = "http://localhost:3000/api/agents/personal-todos-agent/pages"
  
  CALL fetch(ENDPOINT)
  RESPONSE = {
    success: true,
    agent_id: "personal-todos-agent",
    pages: [
      {
        id: "b2935f20-b8a2-4be4-bed4-f6f467a8df9d",
        title: "Personal Todos Dashboard",
        content_type: "json"
      }
    ],
    total: 2
  }
  
  VALIDATE pageId IN pages.map(p => p.id):
    FOUND: "b2935f20-b8a2-4be4-bed4-f6f467a8df9d"
  
  RESULT: BACKEND_DATA_AVAILABLE ✓
END FUNCTION
```

#### Path 3: Frontend Component Flow (BYPASSED)
```pseudocode
FUNCTION attemptPageRendering()
  // This never executes because Router fails at step 1
  
  EXPECTED_FLOW:
    1. Router matches "/agents/:agentId/pages/:pageId"
    2. Render AgentPageViewer component
    3. Extract agentId and pageId from useParams()
    4. Fetch page data from backend
    5. Render page content
    
  ACTUAL_FLOW:
    1. Router fails to match route
    2. Falls back to generic error or agent overview
    3. Page-specific rendering never attempted
END FUNCTION
```

## Critical Failure Points Identified

### Failure Point 1: Missing Route Configuration
```typescript
// CURRENT App.tsx routes (missing page-specific route)
<Route path="/" element={<SocialMediaFeed />} />
<Route path="/agents" element={<RealAgentManager />} />
<Route path="/agents/:agentId" element={<UnifiedAgentPage />} />
// MISSING: <Route path="/agents/:agentId/pages/:pageId" element={<AgentPageViewer />} />

// CURRENT: All page URLs fallback to "/agents/:agentId" generic agent view
```

### Failure Point 2: Component Architecture Gap
```pseudocode
MISSING_COMPONENT: AgentPageViewer
REQUIRED_PROPS:
  - agentId: string
  - pageId: string
  
REQUIRED_FUNCTIONALITY:
  1. Extract URL parameters
  2. Fetch specific page data 
  3. Render page content based on content_type
  4. Handle missing page errors
```

### Failure Point 3: API Integration Mismatch
```typescript
// WorkspaceApi expects different response structure
interface PageListResponse {
  success: boolean;
  pages: AgentPage[];  // ← Expects 'pages' property
}

// Backend actually returns:
{
  success: true,
  agent_id: string,
  pages: AgentPage[],  // ← Same property name, but different context
  total: number
}

// BUT: AgentPagesTab uses different API call pattern
const response = await workspaceApi.listPages(agent.id);
setAgentPages(response.pages);  // ← This should work, but doesn't in context
```

## Execution Path Fix Pseudocode

### Solution Path: Add Missing Route + Component
```pseudocode
FUNCTION implementPageSpecificRoute()
  1. CREATE AgentPageViewer component
  2. ADD route configuration in App.tsx
  3. IMPLEMENT page-specific data fetching
  4. ADD error handling for missing pages
END FUNCTION

COMPONENT AgentPageViewer {
  EXTRACT { agentId, pageId } = useParams<{agentId: string, pageId: string}>()
  
  STATE page = null
  STATE loading = true
  STATE error = null
  
  EFFECT onMount {
    ASYNC FUNCTION fetchPageData() {
      TRY {
        // Use existing working backend API
        const response = FETCH `/api/agents/${agentId}/pages`
        const data = AWAIT response.json()
        
        IF data.success {
          const targetPage = data.pages.find(p => p.id === pageId)
          IF targetPage {
            SET page = targetPage
          } ELSE {
            SET error = `Page '${pageId}' not found for agent '${agentId}'`
          }
        } ELSE {
          SET error = data.error || 'Failed to load pages'
        }
      } CATCH (err) {
        SET error = err.message
      } FINALLY {
        SET loading = false
      }
    }
    
    CALL fetchPageData()
  }
  
  IF loading RETURN LoadingSpinner
  IF error RETURN ErrorMessage(error) 
  IF page RETURN PageContent(page)
  RETURN PageNotFound
}
```

### Solution Path: Router Configuration Fix
```typescript
// ADD to App.tsx Routes configuration
<Route 
  path="/agents/:agentId/pages/:pageId" 
  element={<AgentPageViewer />} 
/>

// ENSURE order: More specific routes BEFORE generic ones
<Route path="/agents/:agentId/pages/:pageId" element={<AgentPageViewer />} />
<Route path="/agents/:agentId" element={<UnifiedAgentPage />} />
<Route path="/agents" element={<RealAgentManager />} />
```

## Next Phase: Architecture Design

Key architectural decisions needed:
1. Component placement and responsibility separation
2. State management for page-specific data
3. Error boundary implementation
4. URL parameter validation and sanitization
5. Cache strategy for page data
6. Navigation breadcrumbs and back button behavior