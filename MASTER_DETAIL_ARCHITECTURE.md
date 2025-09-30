# Master-Detail Component Architecture
## Agents Page Redesign: Grid to Sidebar-Detail Layout

### Document Version: 1.0
### Created: 2025-09-30
### Architecture Phase - SPARC Methodology

---

## Table of Contents
1. [Executive Summary](#executive-summary)
2. [Component Hierarchy](#component-hierarchy)
3. [Component Specifications](#component-specifications)
4. [Data Flow Architecture](#data-flow-architecture)
5. [Routing Architecture](#routing-architecture)
6. [State Management Strategy](#state-management-strategy)
7. [Responsive Design Strategy](#responsive-design-strategy)
8. [Performance Optimization](#performance-optimization)
9. [Integration Plan](#integration-plan)
10. [Technical Decisions](#technical-decisions)

---

## Executive Summary

### Current State
- Grid-based agent listing in `IsolatedRealAgentManager.tsx`
- Separate route for agent details (`WorkingAgentProfile.tsx`)
- Navigation requires full page transitions
- No side-by-side comparison capability

### Target State
- Master-detail layout with persistent sidebar
- Selected agent details displayed in detail panel
- URL-synced selection state
- Seamless navigation without full page reload
- Mobile-responsive with collapsible sidebar

### Key Benefits
1. **Improved UX**: Side-by-side agent browsing
2. **Performance**: Reduced full-page reloads
3. **Context Preservation**: Maintain search/filter state
4. **Mobile Friendly**: Adaptive layout strategy
5. **Code Reuse**: Leverage existing components

---

## Component Hierarchy

```
AgentMasterDetailLayout (NEW)
├── AgentListSidebar (NEW)
│   ├── SearchBar (REUSE)
│   ├── FilterControls (REUSE)
│   └── AgentListItem (NEW - simplified AgentCard)
│       ├── AgentAvatar
│       ├── AgentName
│       ├── AgentStatus
│       └── AgentMetadata (condensed)
│
└── AgentDetailPanel (NEW)
    ├── EmptyState (when no selection)
    └── WorkingAgentProfile (MODIFIED - embedded mode)
        ├── AgentHeader (existing)
        ├── TabNavigation (existing)
        └── TabContent (existing)
            ├── Overview
            ├── DynamicPages
            ├── Activities
            ├── Performance
            └── Capabilities
```

### ASCII Component Tree

```
┌─────────────────────────────────────────────────────────────────┐
│                    /agents Route Container                       │
│  ┌────────────────────────────────────────────────────────────┐ │
│  │         AgentMasterDetailLayout Component                   │ │
│  │  ┌──────────────┬──────────────────────────────────────┐  │ │
│  │  │              │                                       │  │ │
│  │  │  Sidebar     │        Detail Panel                  │  │ │
│  │  │  (Master)    │        (Detail)                      │  │ │
│  │  │              │                                       │  │ │
│  │  │  ┌────────┐  │  ┌──────────────────────────────┐   │  │ │
│  │  │  │ Search │  │  │  Agent Detail / Empty State  │   │  │ │
│  │  │  └────────┘  │  │                              │   │  │ │
│  │  │  ┌────────┐  │  │  ┌────────────────────────┐ │   │  │ │
│  │  │  │Filters │  │  │  │  WorkingAgentProfile   │ │   │  │ │
│  │  │  └────────┘  │  │  │  (Embedded Mode)       │ │   │  │ │
│  │  │              │  │  │                        │ │   │  │ │
│  │  │  ┌────────┐  │  │  │  - Header             │ │   │  │ │
│  │  │  │Agent 1 │◄─┼──┼─►│  - Tabs               │ │   │  │ │
│  │  │  └────────┘  │  │  │  - Content            │ │   │  │ │
│  │  │  ┌────────┐  │  │  └────────────────────────┘ │   │  │ │
│  │  │  │Agent 2 │  │  └──────────────────────────────┘   │  │ │
│  │  │  └────────┘  │                                      │  │ │
│  │  │  ┌────────┐  │                                      │  │ │
│  │  │  │Agent 3 │  │                                      │  │ │
│  │  │  └────────┘  │                                      │  │ │
│  │  │              │                                      │  │ │
│  │  └──────────────┴──────────────────────────────────────┘  │ │
│  └────────────────────────────────────────────────────────────┘ │
└─────────────────────────────────────────────────────────────────┘
```

---

## Component Specifications

### 1. AgentMasterDetailLayout (NEW)

**Purpose**: Root container managing sidebar and detail panel layout.

**Location**: `/workspaces/agent-feed/frontend/src/components/AgentMasterDetailLayout.tsx`

#### TypeScript Interface

```typescript
import React, { useState, useEffect, useCallback } from 'react';
import { useParams, useNavigate, useSearchParams } from 'react-router-dom';
import { Agent } from '../types/api';
import AgentListSidebar from './AgentListSidebar';
import AgentDetailPanel from './AgentDetailPanel';
import { useRoute } from './RouteWrapper';
import { createApiService } from '../services/apiServiceIsolated';

interface AgentMasterDetailLayoutProps {
  className?: string;
}

interface LayoutState {
  agents: Agent[];
  loading: boolean;
  error: string | null;
  searchTerm: string;
  selectedAgentId: string | null;
}
```

#### Key Responsibilities
- Fetch and manage agent list data
- Handle URL routing and state synchronization
- Coordinate sidebar-detail interaction
- Manage responsive layout breakpoints
- Handle API service lifecycle (create/destroy)

#### State Management
```typescript
const [agents, setAgents] = useState<Agent[]>([]);
const [loading, setLoading] = useState(true);
const [error, setError] = useState<string | null>(null);
const [searchTerm, setSearchTerm] = useState('');
const [selectedAgentId, setSelectedAgentId] = useState<string | null>(null);
const [isSidebarVisible, setIsSidebarVisible] = useState(true);
```

#### Key Methods
```typescript
// URL synchronization
const syncUrlState = (agentId: string | null) => {
  if (agentId) {
    navigate(`/agents?selected=${agentId}`, { replace: true });
  } else {
    navigate('/agents', { replace: true });
  }
};

// Agent selection handler
const handleSelectAgent = useCallback((agent: Agent) => {
  setSelectedAgentId(agent.id);
  syncUrlState(agent.id);

  // On mobile, hide sidebar when agent selected
  if (window.innerWidth < 1024) {
    setIsSidebarVisible(false);
  }
}, [navigate]);

// Search handler
const handleSearchChange = useCallback((term: string) => {
  setSearchTerm(term);
}, []);

// Toggle sidebar (mobile)
const toggleSidebar = useCallback(() => {
  setIsSidebarVisible(prev => !prev);
}, []);
```

#### Layout Structure
```typescript
return (
  <div className="flex h-full bg-gray-50">
    {/* Sidebar - Master List */}
    <div className={cn(
      "w-80 flex-shrink-0 border-r border-gray-200 bg-white",
      "transition-transform duration-300 ease-in-out",
      "lg:translate-x-0",
      isSidebarVisible ? "translate-x-0" : "-translate-x-full absolute lg:relative z-20",
    )}>
      <AgentListSidebar
        agents={agents}
        selectedAgentId={selectedAgentId}
        onSelectAgent={handleSelectAgent}
        searchTerm={searchTerm}
        onSearchChange={handleSearchChange}
        loading={loading}
      />
    </div>

    {/* Detail Panel */}
    <div className="flex-1 overflow-hidden">
      <AgentDetailPanel
        selectedAgentId={selectedAgentId}
        onToggleSidebar={toggleSidebar}
        isSidebarVisible={isSidebarVisible}
      />
    </div>
  </div>
);
```

---

### 2. AgentListSidebar (NEW)

**Purpose**: Sidebar displaying searchable, filterable list of agents.

**Location**: `/workspaces/agent-feed/frontend/src/components/AgentListSidebar.tsx`

#### TypeScript Interface

```typescript
import React, { useMemo } from 'react';
import { Agent } from '../types/api';
import { Search, RefreshCw, Bot, CheckCircle, Clock, AlertCircle } from 'lucide-react';

interface AgentListSidebarProps {
  agents: Agent[];
  selectedAgentId: string | null;
  onSelectAgent: (agent: Agent) => void;
  searchTerm: string;
  onSearchChange: (term: string) => void;
  loading?: boolean;
  onRefresh?: () => void;
}

interface AgentListItemProps {
  agent: Agent;
  isSelected: boolean;
  onClick: () => void;
}
```

#### Key Responsibilities
- Display scrollable list of agents
- Highlight selected agent
- Implement search filtering
- Show loading/error states
- Provide visual feedback on selection

#### Filtered Agents Logic
```typescript
const filteredAgents = useMemo(() => {
  if (!searchTerm) return agents;

  const term = searchTerm.toLowerCase();
  return agents.filter(agent =>
    agent.name.toLowerCase().includes(term) ||
    agent.display_name?.toLowerCase().includes(term) ||
    agent.description?.toLowerCase().includes(term) ||
    agent.slug.toLowerCase().includes(term)
  );
}, [agents, searchTerm]);
```

#### UI Structure
```typescript
return (
  <div className="flex flex-col h-full">
    {/* Header with Search */}
    <div className="p-4 border-b border-gray-200">
      <div className="flex items-center justify-between mb-3">
        <h2 className="text-lg font-semibold text-gray-900">Agents</h2>
        <button
          onClick={onRefresh}
          className="p-2 hover:bg-gray-100 rounded-lg transition-colors"
        >
          <RefreshCw className="w-4 h-4 text-gray-600" />
        </button>
      </div>

      {/* Search Input */}
      <div className="relative">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
        <input
          type="text"
          placeholder="Search agents..."
          value={searchTerm}
          onChange={(e) => onSearchChange(e.target.value)}
          className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
        />
      </div>

      <div className="mt-2 text-xs text-gray-500">
        {filteredAgents.length} of {agents.length} agents
      </div>
    </div>

    {/* Agent List */}
    <div className="flex-1 overflow-y-auto">
      {loading ? (
        <LoadingState />
      ) : filteredAgents.length === 0 ? (
        <EmptyState searchTerm={searchTerm} />
      ) : (
        <div className="divide-y divide-gray-100">
          {filteredAgents.map(agent => (
            <AgentListItem
              key={agent.id}
              agent={agent}
              isSelected={agent.id === selectedAgentId}
              onClick={() => onSelectAgent(agent)}
            />
          ))}
        </div>
      )}
    </div>
  </div>
);
```

#### AgentListItem Component
```typescript
const AgentListItem: React.FC<AgentListItemProps> = ({
  agent,
  isSelected,
  onClick
}) => {
  const getStatusColor = (status: string) => {
    switch (status) {
      case 'active': return 'bg-green-100 text-green-800';
      case 'inactive': return 'bg-yellow-100 text-yellow-800';
      case 'error': return 'bg-red-100 text-red-800';
      default: return 'bg-gray-100 text-gray-800';
    }
  };

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'active': return <CheckCircle className="w-3 h-3" />;
      case 'inactive': return <Clock className="w-3 h-3" />;
      case 'error': return <AlertCircle className="w-3 h-3" />;
      default: return <Clock className="w-3 h-3" />;
    }
  };

  return (
    <button
      onClick={onClick}
      className={cn(
        "w-full p-3 text-left transition-all hover:bg-gray-50",
        isSelected && "bg-blue-50 border-l-4 border-l-blue-600"
      )}
    >
      <div className="flex items-start gap-3">
        {/* Avatar */}
        <div
          className="w-10 h-10 rounded-lg flex items-center justify-center flex-shrink-0"
          style={{ backgroundColor: agent.avatar_color || '#6B7280' }}
        >
          <Bot className="w-5 h-5 text-white" />
        </div>

        {/* Agent Info */}
        <div className="flex-1 min-w-0">
          <div className="flex items-center justify-between mb-1">
            <h3 className="font-medium text-sm text-gray-900 truncate">
              {agent.display_name || agent.name}
            </h3>
          </div>

          <p className="text-xs text-gray-600 truncate mb-2">
            {agent.description}
          </p>

          <div className="flex items-center gap-2">
            <span className={cn(
              "inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-medium",
              getStatusColor(agent.status)
            )}>
              {getStatusIcon(agent.status)}
              {agent.status}
            </span>
          </div>
        </div>
      </div>
    </button>
  );
};
```

---

### 3. AgentDetailPanel (NEW)

**Purpose**: Container for displaying selected agent details or empty state.

**Location**: `/workspaces/agent-feed/frontend/src/components/AgentDetailPanel.tsx`

#### TypeScript Interface

```typescript
import React from 'react';
import { Menu, Bot } from 'lucide-react';
import WorkingAgentProfile from './WorkingAgentProfile';

interface AgentDetailPanelProps {
  selectedAgentId: string | null;
  onToggleSidebar: () => void;
  isSidebarVisible: boolean;
}
```

#### Key Responsibilities
- Display WorkingAgentProfile when agent selected
- Show empty state when no selection
- Provide mobile sidebar toggle button
- Handle loading and error states

#### UI Structure
```typescript
const AgentDetailPanel: React.FC<AgentDetailPanelProps> = ({
  selectedAgentId,
  onToggleSidebar,
  isSidebarVisible
}) => {
  return (
    <div className="h-full flex flex-col bg-white">
      {/* Mobile Header with Sidebar Toggle */}
      <div className="lg:hidden flex items-center gap-3 p-4 border-b border-gray-200">
        <button
          onClick={onToggleSidebar}
          className="p-2 hover:bg-gray-100 rounded-lg"
        >
          <Menu className="w-5 h-5 text-gray-600" />
        </button>
        <h2 className="text-lg font-semibold text-gray-900">
          {selectedAgentId ? 'Agent Details' : 'Select an Agent'}
        </h2>
      </div>

      {/* Content Area */}
      <div className="flex-1 overflow-y-auto">
        {selectedAgentId ? (
          <WorkingAgentProfile
            mode="embedded"
            agentId={selectedAgentId}
          />
        ) : (
          <EmptyState />
        )}
      </div>
    </div>
  );
};

const EmptyState = () => (
  <div className="flex items-center justify-center h-full">
    <div className="text-center">
      <Bot className="w-16 h-16 text-gray-300 mx-auto mb-4" />
      <h3 className="text-lg font-medium text-gray-900 mb-2">
        No Agent Selected
      </h3>
      <p className="text-gray-500 max-w-sm">
        Select an agent from the sidebar to view details, manage pages,
        and monitor performance.
      </p>
    </div>
  </div>
);
```

---

### 4. WorkingAgentProfile (MODIFIED)

**Purpose**: Display comprehensive agent details with tabs (modified to support embedded mode).

**Location**: `/workspaces/agent-feed/frontend/src/components/WorkingAgentProfile.tsx`

#### Modified TypeScript Interface

```typescript
interface WorkingAgentProfileProps {
  mode?: 'standalone' | 'embedded';
  agentId?: string;  // Used in embedded mode (passed from parent)
  // agentSlug from useParams in standalone mode
}

const WorkingAgentProfile: React.FC<WorkingAgentProfileProps> = ({
  mode = 'standalone',
  agentId: propAgentId
}) => {
  const { agentSlug } = useParams<{ agentSlug: string }>();
  const navigate = useNavigate();

  // Use prop agentId if in embedded mode, otherwise use URL param
  const agentId = mode === 'embedded' ? propAgentId : agentSlug;

  const [agentData, setAgentData] = useState<AgentData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState<TabType>('overview');

  // ... rest of component logic remains same

  return (
    <div className={cn(
      "space-y-6",
      mode === 'embedded' ? "p-6" : "p-6"
    )}>
      {/* Header - conditionally show back button only in standalone mode */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-4">
          {mode === 'standalone' && (
            <button
              onClick={() => navigate('/agents')}
              className="p-2 text-gray-400 hover:text-gray-600 rounded-lg hover:bg-gray-100"
            >
              <ArrowLeft className="w-5 h-5" />
            </button>
          )}

          {/* Agent header content */}
          <div className="flex items-center gap-4">
            {/* ... existing header code ... */}
          </div>
        </div>
      </div>

      {/* Tabs and content - unchanged */}
      {/* ... rest of component ... */}
    </div>
  );
};
```

#### Key Modifications
1. Add `mode` prop to distinguish standalone vs embedded usage
2. Add `agentId` prop for embedded mode
3. Conditionally hide back button in embedded mode
4. Adjust padding/spacing for embedded context
5. Use prop-based agentId when in embedded mode

---

## Data Flow Architecture

### Data Flow Diagram

```
┌─────────────────────────────────────────────────────────────────┐
│                        API Service Layer                         │
│                   (IsolatedApiService)                           │
│                 Route Key: "agents-master-detail"                │
└───────────────┬───────────────────────────────────┬──────────────┘
                │                                   │
                │ GET /api/agents                   │ WebSocket
                │ GET /api/agents/:id               │ agents_updated
                ▼                                   ▼
┌───────────────────────────────────────────────────────────────────┐
│              AgentMasterDetailLayout (Container)                  │
│                                                                   │
│  State:                                                           │
│  - agents: Agent[]                    ┌─────────────────────┐   │
│  - loading: boolean                   │  useEffect Hook     │   │
│  - error: string | null               │  - Load agents      │   │
│  - selectedAgentId: string | null     │  - Listen WS events │   │
│  - searchTerm: string                 │  - Sync URL         │   │
│                                       └─────────────────────┘   │
│                                                                   │
│  Event Handlers:                                                 │
│  - handleSelectAgent(agent: Agent)                               │
│  - handleSearchChange(term: string)                              │
│  - handleRefresh()                                               │
└────────────┬──────────────────────────────────────┬──────────────┘
             │                                      │
             │ Props Down                           │ Props Down
             │ - agents[]                           │ - selectedAgentId
             │ - selectedAgentId                    │ - onToggleSidebar
             │ - onSelectAgent()                    │
             │ - searchTerm                         │
             │ - onSearchChange()                   │
             ▼                                      ▼
┌──────────────────────────┐          ┌──────────────────────────┐
│   AgentListSidebar       │          │   AgentDetailPanel       │
│                          │          │                          │
│  Renders:                │          │  Renders:                │
│  - Search input          │          │  - Mobile toggle         │
│  - Filtered agent list   │          │  - Empty state OR        │
│  - Selected highlight    │          │  - WorkingAgentProfile   │
│                          │          │                          │
│  User Actions:           │          │  Props to Profile:       │
│  - Click agent ────────────────────►│  - mode: "embedded"      │
│  - Type search           │   Event │  - agentId               │
│  - Scroll list           │  Bubble │                          │
└──────────────────────────┘          └────────────┬─────────────┘
                                                   │
                                                   │ Props Down
                                                   │ - agentId
                                                   │ - mode
                                                   ▼
                                      ┌──────────────────────────┐
                                      │  WorkingAgentProfile     │
                                      │  (Embedded Mode)         │
                                      │                          │
                                      │  - Fetches agent details │
                                      │  - Renders tabs          │
                                      │  - Manages tab state     │
                                      │  - No back button        │
                                      └──────────────────────────┘
```

### State Flow Explanation

#### 1. Initial Load Flow
```
User navigates to /agents
  ↓
AgentMasterDetailLayout mounts
  ↓
useEffect triggered
  ↓
apiService.getAgents() called
  ↓
Loading state = true
  ↓
API response received
  ↓
setAgents(response.agents)
  ↓
Loading state = false
  ↓
AgentListSidebar receives agents[]
  ↓
Render agent list
```

#### 2. Agent Selection Flow
```
User clicks agent in sidebar
  ↓
AgentListItem onClick triggered
  ↓
onSelectAgent(agent) called
  ↓
handleSelectAgent in parent
  ↓
setSelectedAgentId(agent.id)
  ↓
syncUrlState(agent.id)
  ↓
URL updates to /agents?selected={id}
  ↓
selectedAgentId prop updated
  ↓
AgentDetailPanel re-renders
  ↓
WorkingAgentProfile mounts/updates
  ↓
Fetches agent details by ID
  ↓
Renders agent details
```

#### 3. Real-time Update Flow
```
WebSocket message received
  ↓
apiService.emit('agents_updated', updatedAgent)
  ↓
Event listener in useEffect
  ↓
setAgents(current => {
  // Update or add agent
  return updatedAgents;
})
  ↓
AgentListSidebar re-renders with new data
  ↓
If selected agent updated:
  ↓
  AgentDetailPanel shows updated data
```

#### 4. Search Flow
```
User types in search input
  ↓
onChange handler
  ↓
onSearchChange(e.target.value)
  ↓
setSearchTerm in parent
  ↓
searchTerm prop updated
  ↓
AgentListSidebar useMemo recalculates
  ↓
filteredAgents updated
  ↓
List re-renders with filtered results
```

---

## Routing Architecture

### URL Structure Design

#### Route Patterns

```
/agents
  - List all agents
  - No agent selected
  - Shows empty state in detail panel

/agents?selected={agentId}
  - List all agents
  - Agent {agentId} selected
  - Shows agent details in detail panel

/agents?selected={agentId}&search={term}
  - List all agents
  - Filtered by search term
  - Agent {agentId} selected
  - Shows agent details

/agents/:agentSlug (LEGACY - still supported)
  - Full page agent view (standalone mode)
  - Used for direct links / bookmarks
  - WorkingAgentProfile in standalone mode
```

### React Router Integration

#### App.tsx Route Configuration

```typescript
// In App.tsx Routes
<Route
  path="/agents"
  element={
    <RouteWrapper routeKey="agents-master-detail">
      <RouteErrorBoundary routeName="AgentsMasterDetail">
        <Suspense fallback={<FallbackComponents.AgentManagerFallback />}>
          <AgentMasterDetailLayout />
        </Suspense>
      </RouteErrorBoundary>
    </RouteWrapper>
  }
/>

{/* Keep standalone route for backwards compatibility */}
<Route
  path="/agents/:agentSlug"
  element={
    <RouteErrorBoundary routeName="AgentProfile">
      <Suspense fallback={<FallbackComponents.LoadingFallback message="Loading agent profile..." />}>
        <WorkingAgentProfile mode="standalone" />
      </Suspense>
    </RouteErrorBoundary>
  }
/>
```

### URL State Synchronization

#### Implementation in AgentMasterDetailLayout

```typescript
import { useSearchParams, useNavigate } from 'react-router-dom';

const AgentMasterDetailLayout: React.FC = () => {
  const [searchParams, setSearchParams] = useSearchParams();
  const navigate = useNavigate();

  // Read initial state from URL
  useEffect(() => {
    const selectedId = searchParams.get('selected');
    const search = searchParams.get('search');

    if (selectedId) {
      setSelectedAgentId(selectedId);
    }

    if (search) {
      setSearchTerm(search);
    }
  }, []);

  // Sync selection to URL
  const handleSelectAgent = useCallback((agent: Agent) => {
    setSelectedAgentId(agent.id);

    // Update URL params without full page reload
    const newParams = new URLSearchParams(searchParams);
    newParams.set('selected', agent.id);
    setSearchParams(newParams, { replace: true });

    // Hide sidebar on mobile
    if (window.innerWidth < 1024) {
      setIsSidebarVisible(false);
    }
  }, [searchParams, setSearchParams]);

  // Sync search to URL
  const handleSearchChange = useCallback((term: string) => {
    setSearchTerm(term);

    const newParams = new URLSearchParams(searchParams);
    if (term) {
      newParams.set('search', term);
    } else {
      newParams.delete('search');
    }
    setSearchParams(newParams, { replace: true });
  }, [searchParams, setSearchParams]);

  // ... rest of component
};
```

### Navigation Patterns

#### From Other Components to Master-Detail

```typescript
// From Feed - click agent name
navigate(`/agents?selected=${agentId}`);

// From Analytics - click agent in chart
navigate(`/agents?selected=${agentId}&search=${agentName}`);

// From Activity - click agent activity
navigate(`/agents?selected=${agentId}`);
```

#### Deep Linking Support

```typescript
// User bookmarks: /agents?selected=abc123
// On page load:
//   1. Fetch all agents
//   2. Read 'selected' param
//   3. Auto-select agent abc123
//   4. Show details immediately

// Shareable Links
const getShareableLink = (agentId: string) => {
  return `${window.location.origin}/agents?selected=${agentId}`;
};
```

---

## State Management Strategy

### Local Component State

#### AgentMasterDetailLayout State

```typescript
interface LayoutState {
  // Data state
  agents: Agent[];
  loading: boolean;
  error: string | null;

  // UI state
  selectedAgentId: string | null;
  searchTerm: string;
  isSidebarVisible: boolean;

  // API service
  apiService: IsolatedApiService;
}
```

### State Initialization

```typescript
const AgentMasterDetailLayout: React.FC = () => {
  const { routeKey, registerCleanup } = useRoute();
  const [searchParams] = useSearchParams();

  // Initialize state from URL
  const [agents, setAgents] = useState<Agent[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [selectedAgentId, setSelectedAgentId] = useState<string | null>(
    searchParams.get('selected')
  );
  const [searchTerm, setSearchTerm] = useState(
    searchParams.get('search') || ''
  );
  const [isSidebarVisible, setIsSidebarVisible] = useState(true);

  // Create isolated API service
  const [apiService] = useState(() =>
    createApiService(routeKey)
  );

  // ... rest of component
};
```

### State Update Patterns

#### Optimistic Updates for Selection

```typescript
const handleSelectAgent = useCallback((agent: Agent) => {
  // Immediate UI update (optimistic)
  setSelectedAgentId(agent.id);

  // Update URL
  syncUrlState(agent.id);

  // Detail panel will fetch details independently
  // No need to wait for API response
}, []);
```

#### Real-time State Updates

```typescript
useEffect(() => {
  // Listen for real-time agent updates
  const handleAgentsUpdate = (updatedAgent: Agent) => {
    setAgents(current => {
      const index = current.findIndex(a => a.id === updatedAgent.id);

      if (index >= 0) {
        // Update existing agent
        const updated = [...current];
        updated[index] = updatedAgent;
        return updated;
      } else {
        // Add new agent
        return [updatedAgent, ...current];
      }
    });
  };

  apiService.on('agents_updated', handleAgentsUpdate);

  return () => {
    apiService.removeAllListeners('agents_updated');
  };
}, [apiService]);
```

### State Derivation (Computed Values)

```typescript
// In AgentListSidebar
const filteredAgents = useMemo(() => {
  if (!searchTerm) return agents;

  const term = searchTerm.toLowerCase();
  return agents.filter(agent =>
    agent.name.toLowerCase().includes(term) ||
    agent.display_name?.toLowerCase().includes(term) ||
    agent.description?.toLowerCase().includes(term)
  );
}, [agents, searchTerm]);

const selectedAgent = useMemo(() => {
  return agents.find(a => a.id === selectedAgentId) || null;
}, [agents, selectedAgentId]);
```

### State Persistence

#### URL as Single Source of Truth

```
User State Flow:
  User Action → Component State → URL Update → URL as Source
                    ↓
                Re-render with URL state

Page Reload Flow:
  Page Load → Read URL → Initialize State → Render
```

#### No localStorage Needed

- Selected agent ID: In URL (`?selected=`)
- Search term: In URL (`?search=`)
- Sidebar visibility: Responsive, resets on navigation
- Agent data: Fetched fresh on mount, cached in memory during session

---

## Responsive Design Strategy

### Breakpoint Strategy

```typescript
const BREAKPOINTS = {
  mobile: 0,      // 0-639px
  tablet: 640,    // 640-1023px
  desktop: 1024,  // 1024px+
};
```

### Layout Behavior by Screen Size

#### Mobile (< 640px)

```
┌─────────────────────────┐
│  [☰] Agent Details      │  ← Header with menu toggle
├─────────────────────────┤
│                         │
│   Agent Detail Panel    │  ← Full screen
│   (WorkingAgentProfile) │
│                         │
│                         │
└─────────────────────────┘

Sidebar is overlay (absolute positioned)
Clicking agent hides sidebar
Menu button shows sidebar
```

#### Tablet (640px - 1023px)

```
┌─────────────────────────┐
│  [☰] Agent Details      │  ← Header with menu toggle
├─────────────────────────┤
│                         │
│   Agent Detail Panel    │  ← Full screen
│                         │
│                         │
└─────────────────────────┘

Similar to mobile
Sidebar is overlay
Slightly larger detail panel
```

#### Desktop (1024px+)

```
┌──────────┬──────────────────────────────┐
│          │                              │
│ Sidebar  │     Agent Detail Panel       │
│ (320px)  │        (flex-1)              │
│          │                              │
│          │                              │
└──────────┴──────────────────────────────┘

Side-by-side layout
Sidebar always visible
No overlay
No toggle button
```

### Tailwind CSS Implementation

#### AgentMasterDetailLayout Responsive Classes

```typescript
<div className="flex h-full bg-gray-50">
  {/* Sidebar */}
  <div className={cn(
    // Base: fixed overlay on mobile/tablet
    "fixed inset-y-0 left-0 z-30 w-80 bg-white border-r border-gray-200",

    // Desktop: static sidebar
    "lg:static lg:translate-x-0",

    // Mobile: slide in/out
    "transition-transform duration-300 ease-in-out",
    isSidebarVisible ? "translate-x-0" : "-translate-x-full lg:translate-x-0"
  )}>
    <AgentListSidebar {...props} />
  </div>

  {/* Overlay backdrop on mobile when sidebar visible */}
  {isSidebarVisible && (
    <div
      className="fixed inset-0 bg-black bg-opacity-50 z-20 lg:hidden"
      onClick={() => setIsSidebarVisible(false)}
    />
  )}

  {/* Detail Panel */}
  <div className="flex-1 overflow-hidden">
    <AgentDetailPanel
      selectedAgentId={selectedAgentId}
      onToggleSidebar={() => setIsSidebarVisible(true)}
      isSidebarVisible={isSidebarVisible}
    />
  </div>
</div>
```

#### AgentDetailPanel Mobile Header

```typescript
<div className="h-full flex flex-col bg-white">
  {/* Mobile-only header with sidebar toggle */}
  <div className="lg:hidden flex items-center gap-3 p-4 border-b border-gray-200">
    <button
      onClick={onToggleSidebar}
      className="p-2 hover:bg-gray-100 rounded-lg transition-colors"
    >
      <Menu className="w-5 h-5 text-gray-600" />
    </button>
    <h2 className="text-lg font-semibold text-gray-900">
      {selectedAgentId ? 'Agent Details' : 'Select an Agent'}
    </h2>
  </div>

  {/* Content - always visible */}
  <div className="flex-1 overflow-y-auto">
    {/* ... */}
  </div>
</div>
```

### Touch Interaction Enhancements

#### Swipe Gesture Support (Optional Enhancement)

```typescript
// Using react-swipeable or similar library
import { useSwipeable } from 'react-swipeable';

const swipeHandlers = useSwipeable({
  onSwipedLeft: () => {
    // On mobile, swipe left to hide sidebar
    if (window.innerWidth < 1024) {
      setIsSidebarVisible(false);
    }
  },
  onSwipedRight: () => {
    // On mobile, swipe right to show sidebar
    if (window.innerWidth < 1024 && !selectedAgentId) {
      setIsSidebarVisible(true);
    }
  },
  trackMouse: false, // Only track touch
});

<div {...swipeHandlers} className="flex h-full">
  {/* ... */}
</div>
```

### Responsive Testing Checklist

- [ ] Mobile (320px - iPhone SE)
- [ ] Mobile (375px - iPhone standard)
- [ ] Mobile (414px - iPhone Plus)
- [ ] Tablet (768px - iPad)
- [ ] Tablet (1024px - iPad Pro)
- [ ] Desktop (1280px)
- [ ] Desktop (1920px)
- [ ] Ultra-wide (2560px)

---

## Performance Optimization

### 1. Memoization Strategy

#### Component Memoization

```typescript
// Memoize list items to prevent unnecessary re-renders
const AgentListItem = React.memo<AgentListItemProps>(
  ({ agent, isSelected, onClick }) => {
    // Component implementation
  },
  (prevProps, nextProps) => {
    // Only re-render if these props change
    return (
      prevProps.agent.id === nextProps.agent.id &&
      prevProps.isSelected === nextProps.isSelected &&
      prevProps.agent.status === nextProps.agent.status &&
      prevProps.agent.name === nextProps.agent.name
    );
  }
);
```

#### Data Memoization

```typescript
// Memoize filtered agents to avoid recalculation
const filteredAgents = useMemo(() => {
  if (!searchTerm) return agents;

  const term = searchTerm.toLowerCase();
  return agents.filter(agent =>
    agent.name.toLowerCase().includes(term) ||
    agent.display_name?.toLowerCase().includes(term) ||
    agent.description?.toLowerCase().includes(term)
  );
}, [agents, searchTerm]);

// Memoize callbacks to prevent child re-renders
const handleSelectAgent = useCallback((agent: Agent) => {
  setSelectedAgentId(agent.id);
  syncUrlState(agent.id);
}, [syncUrlState]);
```

### 2. Virtual Scrolling (Optional for 100+ Agents)

```typescript
import { FixedSizeList } from 'react-window';

const AgentListSidebar: React.FC<AgentListSidebarProps> = (props) => {
  // ... other code

  // Only implement if agents.length > 100
  const shouldUseVirtualScroll = filteredAgents.length > 100;

  if (shouldUseVirtualScroll) {
    return (
      <FixedSizeList
        height={600}
        itemCount={filteredAgents.length}
        itemSize={80}
        width="100%"
      >
        {({ index, style }) => (
          <div style={style}>
            <AgentListItem
              agent={filteredAgents[index]}
              isSelected={filteredAgents[index].id === selectedAgentId}
              onClick={() => onSelectAgent(filteredAgents[index])}
            />
          </div>
        )}
      </FixedSizeList>
    );
  }

  // Regular rendering for < 100 agents
  return (
    <div className="divide-y divide-gray-100">
      {filteredAgents.map(agent => (
        <AgentListItem key={agent.id} {...} />
      ))}
    </div>
  );
};
```

### 3. Lazy Loading Detail Content

```typescript
// In WorkingAgentProfile - lazy load tab content
const LazyDynamicPagesTab = React.lazy(() =>
  import('./RealDynamicPagesTab')
);

// Only render active tab content
{activeTab === 'pages' && (
  <Suspense fallback={<LoadingSpinner />}>
    <LazyDynamicPagesTab agentId={agentId} />
  </Suspense>
)}
```

### 4. Debounced Search

```typescript
import { useMemo } from 'react';
import debounce from 'lodash/debounce';

const AgentListSidebar: React.FC<AgentListSidebarProps> = ({
  onSearchChange,
  ...props
}) => {
  // Debounce search to avoid excessive filtering
  const debouncedSearch = useMemo(
    () => debounce((term: string) => {
      onSearchChange(term);
    }, 300),
    [onSearchChange]
  );

  const handleSearchInput = (e: React.ChangeEvent<HTMLInputElement>) => {
    const term = e.target.value;
    // Update input immediately for responsive UI
    setLocalSearchTerm(term);
    // Debounce the actual filtering
    debouncedSearch(term);
  };

  return (
    <input
      value={localSearchTerm}
      onChange={handleSearchInput}
      placeholder="Search agents..."
    />
  );
};
```

### 5. Code Splitting

```typescript
// Split master-detail layout into separate bundle
const AgentMasterDetailLayout = React.lazy(() =>
  import('./components/AgentMasterDetailLayout')
);

// In App.tsx
<Route
  path="/agents"
  element={
    <Suspense fallback={<LoadingFallback />}>
      <AgentMasterDetailLayout />
    </Suspense>
  }
/>
```

### 6. Prevent Unnecessary API Calls

```typescript
// Cache agent details in WorkingAgentProfile
const [agentCache, setAgentCache] = useState<Map<string, AgentData>>(
  new Map()
);

useEffect(() => {
  const fetchAgentData = async () => {
    // Check cache first
    if (agentCache.has(agentId!)) {
      setAgentData(agentCache.get(agentId!)!);
      setLoading(false);
      return;
    }

    // Fetch if not cached
    try {
      const response = await fetch(`/api/agents/${agentId}`);
      const data = await response.json();

      if (data.success) {
        setAgentData(data.data);
        // Update cache
        setAgentCache(prev => new Map(prev).set(agentId!, data.data));
      }
    } catch (err) {
      // Handle error
    } finally {
      setLoading(false);
    }
  };

  if (agentId) {
    fetchAgentData();
  }
}, [agentId]);
```

### Performance Metrics to Monitor

```typescript
// Performance monitoring
useEffect(() => {
  if (process.env.NODE_ENV === 'development') {
    const measureRenderTime = () => {
      performance.mark('master-detail-render-start');

      requestAnimationFrame(() => {
        performance.mark('master-detail-render-end');
        performance.measure(
          'master-detail-render',
          'master-detail-render-start',
          'master-detail-render-end'
        );

        const measure = performance.getEntriesByName('master-detail-render')[0];
        console.log(`Master-Detail Render Time: ${measure.duration}ms`);
      });
    };

    measureRenderTime();
  }
}, [agents, selectedAgentId]);
```

**Target Performance Metrics**:
- Initial render: < 100ms
- Agent selection: < 50ms
- Search filtering: < 100ms (with debounce)
- Scroll performance: 60 FPS
- Memory usage: < 50MB for 100 agents

---

## Integration Plan

### Phase 1: New Component Development (Week 1)

#### Tasks
1. **Create AgentMasterDetailLayout component**
   - Set up file structure
   - Implement layout container
   - Add state management
   - Integrate API service
   - Add URL synchronization

2. **Create AgentListSidebar component**
   - Build sidebar UI
   - Implement search functionality
   - Add agent list rendering
   - Style selected state
   - Add loading/error states

3. **Create AgentDetailPanel component**
   - Build panel container
   - Add empty state
   - Add mobile header
   - Integrate WorkingAgentProfile

#### Deliverables
- [ ] `/src/components/AgentMasterDetailLayout.tsx`
- [ ] `/src/components/AgentListSidebar.tsx`
- [ ] `/src/components/AgentDetailPanel.tsx`
- [ ] Unit tests for each component
- [ ] Storybook stories (optional)

### Phase 2: Component Modification (Week 1-2)

#### Tasks
1. **Modify WorkingAgentProfile**
   - Add `mode` prop
   - Add `agentId` prop
   - Conditionally hide back button
   - Adjust styling for embedded mode
   - Test both modes

#### Deliverables
- [ ] Updated WorkingAgentProfile with mode support
- [ ] Backward compatibility tests
- [ ] Updated PropTypes/TypeScript interfaces

### Phase 3: Routing Integration (Week 2)

#### Tasks
1. **Update App.tsx routes**
   - Add new /agents route
   - Keep legacy /agents/:agentSlug route
   - Test route transitions
   - Verify RouteWrapper integration

2. **Test navigation flows**
   - Direct URL access
   - Navigation from other components
   - Browser back/forward buttons
   - Deep linking

#### Deliverables
- [ ] Updated App.tsx with new routes
- [ ] Navigation tests
- [ ] Deep linking verification

### Phase 4: Responsive Design (Week 2)

#### Tasks
1. **Implement mobile layout**
   - Add sidebar overlay
   - Implement toggle button
   - Add backdrop
   - Test touch interactions

2. **Implement tablet layout**
   - Test breakpoints
   - Adjust spacing
   - Verify overlay behavior

3. **Implement desktop layout**
   - Side-by-side layout
   - Remove toggle button
   - Test wide screens

#### Deliverables
- [ ] Mobile responsive design
- [ ] Tablet responsive design
- [ ] Desktop responsive design
- [ ] Cross-browser testing

### Phase 5: Performance Optimization (Week 3)

#### Tasks
1. **Add memoization**
   - Memoize AgentListItem
   - Memoize filtered agents
   - Memoize callbacks

2. **Implement debounced search**
   - Add lodash debounce
   - Test search performance

3. **Add performance monitoring**
   - Measure render times
   - Profile memory usage
   - Identify bottlenecks

#### Deliverables
- [ ] Performance metrics report
- [ ] Optimized components
- [ ] Lighthouse score > 90

### Phase 6: Testing & QA (Week 3)

#### Tasks
1. **Unit testing**
   - Test all new components
   - Test modified components
   - Test utility functions

2. **Integration testing**
   - Test component interaction
   - Test API integration
   - Test URL synchronization

3. **E2E testing**
   - Test user flows
   - Test mobile interactions
   - Test edge cases

#### Deliverables
- [ ] Unit test coverage > 80%
- [ ] Integration tests passing
- [ ] E2E tests passing
- [ ] QA sign-off

### Phase 7: Documentation & Deployment (Week 4)

#### Tasks
1. **Update documentation**
   - Update component docs
   - Update architecture docs
   - Create user guide

2. **Deploy to staging**
   - Test in staging environment
   - Performance testing
   - Security review

3. **Production deployment**
   - Feature flag rollout
   - Monitor metrics
   - Gather feedback

#### Deliverables
- [ ] Updated documentation
- [ ] Staging deployment successful
- [ ] Production deployment successful
- [ ] Post-deployment monitoring

---

## Technical Decisions

### Decision Log

#### Decision 1: URL State vs Redux/Context

**Decision**: Use URL as single source of truth for selection state

**Rationale**:
- Shareable links
- Browser back/forward support
- No additional state management library needed
- Simpler mental model
- Better for SSR/SEO (future)

**Trade-offs**:
- URL updates trigger re-renders
- Limited data types (strings only)
- Must serialize/deserialize state

**Alternatives Considered**:
- Redux: Too heavy for this use case
- Context API: Doesn't provide URL persistence
- localStorage: Not shareable, harder to debug

---

#### Decision 2: Embedded vs Iframe for Detail Panel

**Decision**: Use embedded WorkingAgentProfile component directly

**Rationale**:
- Shared state and context
- Better performance
- Easier styling
- Single React app
- Simpler communication

**Trade-offs**:
- Need to modify WorkingAgentProfile for mode support
- Potential prop drilling
- Shared CSS namespace

**Alternatives Considered**:
- Iframe: Isolated but complex communication
- Web Components: Browser compatibility concerns
- Micro-frontends: Overkill for single app

---

#### Decision 3: Absolute Positioning vs Flexbox for Layout

**Decision**: Use Flexbox for desktop, absolute positioning for mobile overlay

**Rationale**:
- Flexbox provides natural responsive behavior
- Absolute positioning for overlay pattern on mobile
- CSS transforms for smooth animations
- Native browser support
- Easier to maintain

**Trade-offs**:
- Need conditional positioning logic
- More complex responsive CSS
- Potential z-index issues

**Alternatives Considered**:
- CSS Grid: Less flexible for this layout
- Absolute positioning only: Harder responsiveness
- Fixed positioning: Scroll issues

---

#### Decision 4: Real-time Updates via WebSocket

**Decision**: Use existing IsolatedApiService WebSocket events

**Rationale**:
- Already implemented in codebase
- Consistent with other components
- Automatic agent list updates
- No polling overhead

**Trade-offs**:
- Need WebSocket connection active
- Potential memory leaks if not cleaned up
- Complexity of event handling

**Alternatives Considered**:
- Polling: More resource intensive
- Server-Sent Events: Less bidirectional
- No real-time: Requires manual refresh

---

#### Decision 5: Search Implementation - Client vs Server

**Decision**: Client-side filtering for < 100 agents, server-side for more

**Rationale**:
- Fast client-side search for small datasets
- No API latency for common case
- Simpler implementation
- Can add server search later if needed

**Trade-offs**:
- All agents loaded in memory
- Not suitable for large datasets (1000+)
- Search limited to loaded agents

**Alternatives Considered**:
- Server-side only: Unnecessary latency for small lists
- Hybrid: Complex to implement correctly
- Full-text search: Overkill for current needs

---

#### Decision 6: Sidebar Width

**Decision**: Fixed 320px (20rem) sidebar width

**Rationale**:
- Enough space for agent name + metadata
- Consistent with design systems (Figma, Tailwind)
- Not too wide to crowd detail panel
- Works well on 1024px+ screens

**Trade-offs**:
- Fixed width may not be optimal for all screen sizes
- No user customization

**Alternatives Considered**:
- Percentage width: Inconsistent on large screens
- Resizable: Added complexity
- Narrower (256px): Too cramped
- Wider (400px): Too much space

---

#### Decision 7: Mobile Behavior - Overlay vs Stack

**Decision**: Sidebar overlay on mobile (not stacked vertically)

**Rationale**:
- Maintains full-width detail view
- Familiar mobile pattern (drawer)
- Better use of screen space
- Matches iOS/Android conventions

**Trade-offs**:
- Requires backdrop and toggle button
- Animation complexity
- z-index management

**Alternatives Considered**:
- Vertical stack: Too much scrolling
- Tabs: Loses context when switching
- Bottom sheet: Less conventional

---

#### Decision 8: Empty State Strategy

**Decision**: Show friendly empty state with call-to-action

**Rationale**:
- Clear user guidance
- Reduces confusion
- Professional appearance
- Encourages interaction

**Trade-offs**:
- Takes up space
- Only visible on first load

**Alternatives Considered**:
- Blank panel: Poor UX
- Auto-select first agent: Unexpected behavior
- Full-screen message: Too prominent

---

## Appendix

### Type Definitions Reference

```typescript
// /src/types/api.ts - Agent interface (already exists)
export interface Agent {
  id: string;
  slug: string;
  name: string;
  display_name: string;
  description: string;
  system_prompt: string;
  avatar_color: string;
  capabilities: string[];
  status: 'active' | 'inactive' | 'error' | 'maintenance';
  created_at: string;
  updated_at: string;
  last_used: string | null;
  usage_count: number;
  version: string;
  configuration: Record<string, any>;
  performance_metrics: AgentPerformanceMetrics;
  health_status: AgentHealthStatus;
  error_log?: ErrorLogEntry[];
}
```

### API Endpoints Reference

```typescript
// Agents API
GET  /api/agents                 // List all agents
GET  /api/agents/:id             // Get agent details
POST /api/agents                 // Create agent
PUT  /api/agents/:id             // Update agent
DELETE /api/agents/:id           // Delete agent

// Dynamic Pages API (used in WorkingAgentProfile)
GET  /api/agents/:id/pages       // List agent pages
GET  /api/agents/:id/pages/:pageId  // Get page details
```

### CSS Classes Reference

```css
/* Layout Container */
.master-detail-layout {
  display: flex;
  height: 100%;
  background-color: #f9fafb; /* gray-50 */
}

/* Sidebar */
.agent-sidebar {
  width: 20rem; /* 320px */
  flex-shrink: 0;
  background-color: white;
  border-right: 1px solid #e5e7eb; /* gray-200 */
}

/* Detail Panel */
.agent-detail-panel {
  flex: 1;
  overflow: hidden;
  background-color: white;
}

/* Mobile Overlay */
.sidebar-overlay {
  position: fixed;
  inset: 0;
  background-color: rgba(0, 0, 0, 0.5);
  z-index: 20;
}

/* Responsive breakpoints (Tailwind) */
/* sm: 640px */
/* md: 768px */
/* lg: 1024px */
/* xl: 1280px */
/* 2xl: 1536px */
```

### Component File Structure

```
/workspaces/agent-feed/frontend/src/
├── components/
│   ├── AgentMasterDetailLayout.tsx     (NEW - 300 lines)
│   ├── AgentListSidebar.tsx            (NEW - 200 lines)
│   ├── AgentDetailPanel.tsx            (NEW - 100 lines)
│   ├── WorkingAgentProfile.tsx         (MODIFIED - add mode prop)
│   ├── IsolatedRealAgentManager.tsx    (KEEP - legacy)
│   └── ...
├── types/
│   └── api.ts                           (EXISTING)
├── services/
│   └── apiServiceIsolated.ts            (EXISTING)
├── hooks/
│   └── useAgentSelection.ts             (OPTIONAL - custom hook)
└── App.tsx                              (MODIFIED - update routes)
```

### Testing Strategy

#### Unit Tests
- Component rendering
- Props validation
- Event handlers
- State updates
- Memoization

#### Integration Tests
- Component interaction
- API integration
- URL synchronization
- WebSocket events

#### E2E Tests
- User flows
- Navigation
- Search and filter
- Mobile interactions
- Cross-browser

#### Performance Tests
- Render time
- Memory usage
- Network requests
- Search latency
- Scroll performance

---

## Summary

This architecture transforms the agents page from a grid-based list into a modern master-detail interface. The design prioritizes:

1. **Component Reuse**: Leverages existing WorkingAgentProfile with minimal modifications
2. **Maintainability**: Clear separation of concerns between sidebar and detail panel
3. **Performance**: Optimized rendering with memoization and lazy loading
4. **Responsiveness**: Mobile-first design with adaptive layout
5. **User Experience**: Seamless navigation with URL-synced state

The architecture integrates cleanly with the existing codebase, using established patterns like `IsolatedApiService`, `RouteWrapper`, and the existing type system. The implementation plan provides a clear path from development to production deployment.

**Next Steps**: Proceed to pseudocode phase to define implementation details for each component.
