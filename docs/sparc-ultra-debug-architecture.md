# SPARC Ultra Debug Phase 3: Architecture Analysis

## Current System Architecture

### Component Hierarchy Analysis
```
App.tsx (Router)
├── Routes Configuration
│   ├── "/" → SocialMediaFeed
│   ├── "/agents" → RealAgentManager  
│   ├── "/agents/:agentId" → UnifiedAgentPage
│   └── MISSING: "/agents/:agentId/pages/:pageId" → AgentPageViewer
├── UnifiedAgentPage
│   ├── AgentPagesTab (handles agent.pages display)
│   ├── AgentDefinitionTab
│   ├── AgentProfileTab
│   └── AgentFileSystemTab
└── AgentPagesTab
    ├── Page listing functionality ✓
    ├── Page creation functionality ✓ 
    └── Page navigation (handlePageClick) → FAILS at routing level
```

### API Layer Architecture
```
API Layer Stack:
├── /frontend/src/services/api.ts (Main API service)
├── /frontend/src/services/api/workspaceApi.ts (Workspace specific)
├── /src/routes/agent-pages.js (Backend routes)
└── /src/database/DatabaseService.js (Data persistence)

Current Flow:
Browser → workspaceApi.listPages() → /api/agents/:id/pages → DatabaseService → SQLite

Working Endpoints:
✓ GET /api/agents/:agentId/pages
✓ POST /api/agents/:agentId/pages
✓ DELETE /api/agents/:agentId/pages/:pageId
```

### State Management Architecture
```
Data Flow:
UnifiedAgentPage (agentId from URL) 
└── AgentPagesTab (agent prop passed down)
    ├── agentPages: AgentPage[] (local state)
    ├── selectedPage: AgentPage | null (local state)
    └── handlePageClick() → window.location.href (PROBLEM!)
```

## Architecture Issues Identified

### Issue 1: Routing Architecture Gap
```typescript
// CURRENT: Hard-coded window.location navigation
const handlePageClick = (page: AgentPage) => {
  setSelectedPage(page);
  
  // This bypasses React Router completely!
  window.location.href = `/agents/${agent.id}/pages/${page.id}`;
  
  // Results in full page reload + missing route error
};

// NEEDED: React Router navigation
const handlePageClick = (page: AgentPage) => {
  navigate(`/agents/${agent.id}/pages/${page.id}`);
  // Requires route to exist in App.tsx
};
```

### Issue 2: Component Responsibility Misalignment
```
CURRENT RESPONSIBILITY:
AgentPagesTab:
- Display all pages ✓
- Handle page creation ✓
- Navigate to individual pages ✗ (fails due to missing route)

NEEDED ARCHITECTURE:
AgentPageViewer: (NEW COMPONENT)
- Display single page content
- Handle page-specific interactions
- Manage page state and updates

AgentPagesTab: (UPDATED)
- Display page listings
- Navigate to AgentPageViewer via React Router
- Handle bulk page operations
```

### Issue 3: Data Fetching Architecture
```
CURRENT:
UnifiedAgentPage → fetches agent data
AgentPagesTab → fetches agent pages (workspaceApi.listPages)

NEEDED:
AgentPageViewer → fetch specific page data
- Option A: Fetch from existing pages list (fast, but may be stale)
- Option B: Fetch individual page (GET /api/agents/:id/pages/:pageId) - MISSING ENDPOINT
- Option C: Filter from pages list endpoint (current working approach)
```

## Proposed Architecture Solution

### Solution 1: Router Configuration Update
```typescript
// App.tsx Routes - ADD page-specific route BEFORE generic agent route
<Routes>
  <Route path="/" element={<SocialMediaFeed />} />
  <Route path="/agents" element={<RealAgentManager />} />
  
  {/* NEW: Page-specific route - MUST come before generic agent route */}
  <Route path="/agents/:agentId/pages/:pageId" element={<AgentPageViewer />} />
  
  {/* EXISTING: Generic agent route */}
  <Route path="/agents/:agentId" element={<UnifiedAgentPage />} />
  
  {/* Other routes... */}
</Routes>
```

### Solution 2: New Component Architecture
```typescript
// NEW: AgentPageViewer Component
interface AgentPageViewerProps {
  // No props - gets params from URL
}

const AgentPageViewer: React.FC = () => {
  const { agentId, pageId } = useParams<{
    agentId: string;
    pageId: string;
  }>();
  const navigate = useNavigate();
  
  // State management
  const [page, setPage] = useState<AgentPage | null>(null);
  const [agent, setAgent] = useState<Agent | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  
  // Data fetching logic
  useEffect(() => {
    fetchPageAndAgentData();
  }, [agentId, pageId]);
  
  // Navigation helpers
  const handleBackToAgent = () => {
    navigate(`/agents/${agentId}`);
  };
  
  const handleBackToPages = () => {
    navigate(`/agents/${agentId}`, { state: { activeTab: 'pages' } });
  };
  
  // Render logic
  return (
    <div className="page-viewer">
      {/* Breadcrumb navigation */}
      {/* Page content based on content_type */}
      {/* Action buttons */}
    </div>
  );
};
```

### Solution 3: Updated AgentPagesTab Navigation
```typescript
// UPDATED: AgentPagesTab handlePageClick
const navigate = useNavigate();

const handlePageClick = (page: AgentPage) => {
  setSelectedPage(page);
  
  // Use React Router navigation instead of window.location
  navigate(`/agents/${agent.id}/pages/${page.id}`);
  
  // Optional: Analytics tracking
  if (typeof window !== 'undefined' && window.gtag) {
    window.gtag('event', 'page_view', {
      page_id: page.id,
      page_title: page.title
    });
  }
  
  // Update recent pages
  setRecentPages(prev => {
    const updated = [page.id, ...prev.filter(id => id !== page.id)];
    return updated.slice(0, 5);
  });
};
```

### Solution 4: Data Fetching Strategy
```typescript
// AgentPageViewer data fetching
const fetchPageAndAgentData = async () => {
  if (!agentId || !pageId) return;
  
  setLoading(true);
  setError(null);
  
  try {
    // Fetch agent data and pages in parallel
    const [agentResponse, pagesResponse] = await Promise.all([
      fetch(`/api/agents/${agentId}`),
      fetch(`/api/agents/${agentId}/pages`)
    ]);
    
    if (!agentResponse.ok) {
      throw new Error('Agent not found');
    }
    
    if (!pagesResponse.ok) {
      throw new Error('Failed to load pages');
    }
    
    const agentData = await agentResponse.json();
    const pagesData = await pagesResponse.json();
    
    if (!pagesData.success) {
      throw new Error(pagesData.error || 'Failed to load pages');
    }
    
    // Find specific page
    const targetPage = pagesData.pages.find(p => p.id === pageId);
    
    if (!targetPage) {
      throw new Error(`Page '${pageId}' not found for agent '${agentId}'`);
    }
    
    setAgent(agentData.data);
    setPage(targetPage);
    
  } catch (err) {
    setError(err instanceof Error ? err.message : 'Unknown error');
  } finally {
    setLoading(false);
  }
};
```

## Architecture Benefits

### Benefit 1: Proper Separation of Concerns
- UnifiedAgentPage: Agent overview and management
- AgentPagesTab: Page listing and bulk operations  
- AgentPageViewer: Individual page display and interactions

### Benefit 2: React Router Integration
- Native routing instead of window.location hacks
- Browser history support (back/forward buttons work)
- State preservation during navigation
- URL sharing and bookmarking support

### Benefit 3: Performance Optimization
- Lazy loading of page content
- Cached agent data reuse
- Parallel data fetching
- Proper loading states

### Benefit 4: Error Handling
- Specific error messages for missing pages/agents
- Graceful degradation when backend is unavailable
- User-friendly error recovery options

## Next Phase: Refinement Implementation

The architecture is now clearly defined. The refinement phase will:
1. Create AgentPageViewer component
2. Update App.tsx routing configuration
3. Update AgentPagesTab navigation
4. Add comprehensive error handling
5. Implement TDD testing for all new functionality