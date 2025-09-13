# SPARC Ultra Debug Phase 1: Specification Analysis

## Problem Statement
User navigates to URL: `http://127.0.0.1:5173/agents/personal-todos-agent/pages/b2935f20-b8a2-4be4-bed4-f6f467a8df9d`

**Expected Result**: Display "Personal Todos Dashboard" content
**Actual Result**: Error message "No pages found for agent, but looking for page 'b2935f20-b8a2-4be4-bed4-f6f467a8df9d'"

## Data Flow Specification

### 1. URL Route Resolution
```typescript
Route Pattern: /agents/:agentId/pages/:pageId
Parameters:
- agentId: "personal-todos-agent" 
- pageId: "b2935f20-b8a2-4be4-bed4-f6f467a8df9d"
```

### 2. API Data Flow Mapping

#### Backend API Endpoints
```javascript
// Route: /api/agents/personal-todos-agent/pages
// Expected Response:
{
  success: true,
  data: [
    {
      id: "b2935f20-b8a2-4be4-bed4-f6f467a8df9d",
      title: "Personal Todos Dashboard",
      content: { type: "markdown", value: "..." },
      agentId: "personal-todos-agent",
      status: "published"
    }
  ]
}
```

#### Frontend API Integration
```typescript
// File: /workspaces/agent-feed/frontend/src/services/api.ts
// Line 33: Backend URL construction issue
this.baseUrl = 'http://localhost:3000/api';

// Critical Issue: API paths fixed from `/api/v1/` to `/api/` (confirmed correct)
```

### 3. React Component Data Flow

#### AgentPagesTab Component Flow
```typescript
// File: /workspaces/agent-feed/frontend/src/components/AgentPagesTab.tsx
// Line 112-148: useEffect hook for fetching agent pages

useEffect(() => {
  const fetchAgentPages = async () => {
    if (!agent.id) return;
    
    try {
      const response = await workspaceApi.listPages(agent.id);
      if (isMounted) {
        setAgentPages(response.pages);  // Critical: response.pages vs response.data
      }
    } catch (err) {
      setError(err.message);
      setAgentPages([]);
    }
  };
}, [agent.id]);
```

#### UnifiedAgentPage URL Parameter Handling
```typescript
// File: /workspaces/agent-feed/frontend/src/components/UnifiedAgentPage.tsx
// Line 223: useParams hook
const { agentId } = useParams<{ agentId: string }>();

// Critical Gap: No pageId extraction from URL
// Missing: const { pageId } = useParams<{ pageId?: string }>();
```

### 4. Critical Data Flow Gaps Identified

#### Gap 1: Missing Router Configuration
**Issue**: No React Router route defined for `/agents/:agentId/pages/:pageId`
**Location**: App.tsx router configuration
**Impact**: URL navigation fails silently

#### Gap 2: API Response Structure Mismatch
**Backend Returns**: `{ success: true, data: [...] }`
**Frontend Expects**: `{ success: true, pages: [...] }`
**Location**: AgentPagesTab.tsx line 127

#### Gap 3: Page ID Parameter Not Extracted
**Issue**: UnifiedAgentPage doesn't extract pageId from URL
**Expected**: Page-specific rendering when pageId present
**Actual**: Generic agent overview always displayed

#### Gap 4: WorkspaceApi vs AgentPages API Confusion
**Issue**: Different API services for same functionality
- `workspaceApi.listPages()` (newer)
- Backend route: `/api/agents/:agentId/pages` (working)
**Conflict**: Incompatible response structures

## Specification Requirements for Fix

### R1: Router Configuration
```typescript
// Required in App.tsx
<Route path="/agents/:agentId/pages/:pageId" element={<AgentPageViewer />} />
```

### R2: API Response Structure Alignment
```typescript
// Backend should return consistent structure
interface PageListResponse {
  success: boolean;
  data: AgentPage[];
  total?: number;
}
```

### R3: Page-Specific Component
```typescript
// New component needed: AgentPageViewer
interface AgentPageViewerProps {
  agentId: string;
  pageId: string;
}
```

### R4: URL Parameter Extraction
```typescript
// In AgentPageViewer component
const { agentId, pageId } = useParams<{
  agentId: string;
  pageId: string;
}>();
```

## Root Cause Analysis Summary

**Primary Issue**: Missing React Router route for page-specific URLs
**Secondary Issues**: 
1. API response structure inconsistency
2. Missing page-specific rendering component  
3. URL parameter extraction gaps

**Impact**: Any direct navigation to page URLs fails with generic error message

## Next Phase: Pseudocode Implementation Plan

1. Create AgentPageViewer component
2. Add router configuration
3. Align API response structures
4. Implement page-specific data fetching
5. Add proper error handling for missing pages