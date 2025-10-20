# Architecture: IsolatedRealAgentManager Tier Filtering Integration

**Date:** 2025-10-19
**Version:** 1.0.0
**Status:** Design Complete

## Executive Summary

This document defines the component architecture for integrating tier filtering functionality into `IsolatedRealAgentManager` while preserving the existing two-panel layout and dark mode support.

**Current State:**
- IsolatedRealAgentManager: Two-panel layout with dark mode (WORKING)
- AgentManager: Tier filtering components (WORKING)
- Problem: Need to merge tier filtering into IsolatedRealAgentManager

**Solution:**
- Extract tier components from AgentManager
- Integrate into IsolatedRealAgentManager without breaking layout
- Preserve existing dark mode and routing isolation

---

## 1. Component Hierarchy

```
┌─────────────────────────────────────────────────────────────────┐
│                   IsolatedRealAgentManager                       │
│  Route-isolated component with cleanup                          │
│  ┌──────────────────┐  ┌──────────────────────────────────────┐│
│  │ AgentListSidebar │  │ Detail Panel (Right)                 ││
│  │ (Left Panel)     │  │                                      ││
│  │                  │  │  ┌────────────────────────────────┐  ││
│  │ ┌──────────────┐ │  │  │ Header with Tier Toggle        │  ││
│  │ │ Header       │ │  │  │  • Title                       │  ││
│  │ │ • Search     │ │  │  │  • AgentTierToggle (3-button)  │  ││
│  │ │ • Tier Toggle│ │  │  │  • Refresh button              │  ││
│  │ └──────────────┘ │  │  └────────────────────────────────┘  ││
│  │                  │  │                                      ││
│  │ Agent List       │  │  ┌────────────────────────────────┐  ││
│  │ ┌──────────────┐ │  │  │ WorkingAgentProfile            │  ││
│  │ │ • AgentIcon  │ │  │  │  • AgentIcon (SVG/emoji)       │  ││
│  │ │ • Tier Badge │ │  │  │  • AgentTierBadge              │  ││
│  │ │ • Protection │ │  │  │  • ProtectionBadge             │  ││
│  │ │   Badge      │ │  │  │  • Agent details               │  ││
│  │ └──────────────┘ │  │  │  • Tools & capabilities        │  ││
│  │                  │  │  └────────────────────────────────┘  ││
│  └──────────────────┘  └──────────────────────────────────────┘│
└─────────────────────────────────────────────────────────────────┘
```

### Component Tree

```
IsolatedRealAgentManager (parent)
├── useAgentTierFilter() hook
│   ├── currentTier: '1' | '2' | 'all'
│   ├── setCurrentTier: (tier) => void
│   ├── showTier1: boolean
│   └── showTier2: boolean
│
├── AgentListSidebar (left panel)
│   ├── Header section
│   │   ├── Search input
│   │   └── AgentTierToggle (NEW)
│   │       ├── Tier 1 button (Blue)
│   │       ├── Tier 2 button (Gray)
│   │       └── All button (Purple)
│   │
│   └── Agent list items (via render props)
│       ├── AgentIcon (SVG/emoji/initials)
│       ├── AgentTierBadge (T1/T2)
│       └── ProtectionBadge (if protected)
│
└── WorkingAgentProfile (right panel)
    ├── Agent header
    │   ├── AgentIcon
    │   ├── AgentTierBadge
    │   └── ProtectionBadge
    │
    └── Agent details
        ├── Overview tab
        └── Pages tab
```

---

## 2. Data Flow Architecture

```
┌─────────────────────────────────────────────────────────────────┐
│                         User Interaction                         │
└─────────────────────────────────────────────────────────────────┘
                              │
                              ▼
┌─────────────────────────────────────────────────────────────────┐
│              AgentTierToggle (User clicks button)                │
│              onTierChange('1' | '2' | 'all')                     │
└─────────────────────────────────────────────────────────────────┘
                              │
                              ▼
┌─────────────────────────────────────────────────────────────────┐
│              useAgentTierFilter.setCurrentTier()                 │
│              • Updates state                                     │
│              • Persists to localStorage                          │
└─────────────────────────────────────────────────────────────────┘
                              │
                              ▼
┌─────────────────────────────────────────────────────────────────┐
│              useEffect dependencies: [currentTier]               │
│              Triggers loadAgents() re-execution                  │
└─────────────────────────────────────────────────────────────────┘
                              │
                              ▼
┌─────────────────────────────────────────────────────────────────┐
│              API Call: /api/v1/claude-live/prod/agents           │
│              Query param: ?tier=${currentTier}                   │
│              • '1' = Tier 1 only                                 │
│              • '2' = Tier 2 only                                 │
│              • 'all' = All agents                                │
└─────────────────────────────────────────────────────────────────┘
                              │
                              ▼
┌─────────────────────────────────────────────────────────────────┐
│              Backend API Response                                │
│              {                                                   │
│                success: true,                                    │
│                agents: Agent[],                                  │
│                totalAgents: number                               │
│              }                                                   │
└─────────────────────────────────────────────────────────────────┘
                              │
                              ▼
┌─────────────────────────────────────────────────────────────────┐
│              setAgents(agentsData)                               │
│              Updates React state                                 │
└─────────────────────────────────────────────────────────────────┘
                              │
                              ▼
┌─────────────────────────────────────────────────────────────────┐
│              UI Re-render                                        │
│              • AgentListSidebar shows filtered agents            │
│              • Tier badges displayed correctly                   │
│              • Protection badges for protected agents            │
└─────────────────────────────────────────────────────────────────┘
```

### State Flow Diagram

```
localStorage                  React State                  API Server
    │                             │                            │
    │  1. Initial load            │                            │
    ├────────────────────────────>│                            │
    │  (get saved tier)           │                            │
    │                             │                            │
    │                             │  2. loadAgents()           │
    │                             ├──────────────────────────> │
    │                             │  GET /agents?tier=1        │
    │                             │                            │
    │                             │  3. Response               │
    │                             │<────────────────────────── │
    │                             │  {agents: [...]}           │
    │                             │                            │
    │  4. Tier change             │                            │
    │<────────────────────────────┤                            │
    │  (persist preference)       │                            │
    │                             │                            │
    │                             │  5. Re-fetch agents        │
    │                             ├──────────────────────────> │
    │                             │  GET /agents?tier=2        │
    │                             │                            │
    │                             │  6. Response               │
    │                             │<────────────────────────── │
    │                             │  {agents: [...]}           │
```

---

## 3. Integration Points with Line Numbers

### File: `/workspaces/agent-feed/frontend/src/App.tsx`

**Integration Point 1: Import IsolatedRealAgentManager**
```typescript
// Line 25: Update import (ALREADY WORKING - no change needed)
import AgentManager from './components/AgentManager';
```

**Note:** IsolatedRealAgentManager is imported in AgentManager routes at lines 270-287. No changes needed in App.tsx.

---

### File: `/workspaces/agent-feed/frontend/src/components/IsolatedRealAgentManager.tsx`

**Integration Point 1: Import tier components** (Lines 1-10)
```typescript
import React, { useState, useEffect, useCallback } from 'react';
import { RefreshCw, AlertCircle, Bot } from 'lucide-react';
import { useNavigate, useParams } from 'react-router-dom';
import { Agent, ApiResponse } from '../types/api';
import { useRoute } from './RouteWrapper';
import { createApiService } from '../services/apiServiceIsolated';
import AgentListSidebar from './AgentListSidebar';
import WorkingAgentProfile from './WorkingAgentProfile';
import { generateSlug } from '@/utils/slugify';

// ADD IMPORTS (NEW):
import { useAgentTierFilter } from '../hooks/useAgentTierFilter';
import { AgentTierToggle } from './agents/AgentTierToggle';
import { AgentTierBadge } from './agents/AgentTierBadge';
import { AgentIcon } from './agents/AgentIcon';
import { ProtectionBadge } from './agents/ProtectionBadge';
```

**Integration Point 2: Add tier filtering hook** (After Line 31)
```typescript
// Line 31: Existing isolated API service
const [apiService] = useState(() => createApiService(routeKey));

// ADD (NEW): Tier filtering hook with localStorage persistence
const { currentTier, setCurrentTier, showTier1, showTier2 } = useAgentTierFilter();
```

**Integration Point 3: Update loadAgents function** (Lines 34-55)
```typescript
// Line 37: Update API call to include tier parameter
const loadAgents = useCallback(async () => {
  try {
    setError(null);

    // UPDATE: Add tier parameter to API call
    const response: any = await apiService.getAgents({ tier: currentTier });

    if (!apiService.getStatus().isDestroyed) {
      const agentsData = response.agents || response.data || [];
      setAgents(agentsData);
      console.log(`✅ Loaded ${agentsData.length} agents (tier: ${currentTier}):`, agentsData);
    }
  } catch (err) {
    if (err.name !== 'AbortError' && !apiService.getStatus().isDestroyed) {
      setError(err instanceof Error ? err.message : 'Failed to load agents');
      console.error('❌ Error loading agents:', err);
    }
  } finally {
    if (!apiService.getStatus().isDestroyed) {
      setLoading(false);
      setRefreshing(false);
    }
  }
}, [apiService, currentTier]); // ADD currentTier to dependencies
```

**Integration Point 4: Calculate tier counts** (After Line 140)
```typescript
// Line 140: Get selected agent details
const selectedAgent = agents.find(agent => agent.id === selectedAgentId);

// ADD (NEW): Calculate tier counts for toggle display
const tierCounts = {
  tier1: agents.filter(a => a.tier === 1).length,
  tier2: agents.filter(a => a.tier === 2).length,
  total: agents.length
};
```

**Integration Point 5: Update AgentListSidebar props** (Line 158-165)
```typescript
// Line 158: UPDATE AgentListSidebar with tier render props
<AgentListSidebar
  agents={agents}
  selectedAgentId={selectedAgentId}
  onSelectAgent={handleSelectAgent}
  searchTerm={searchTerm}
  onSearchChange={setSearchTerm}
  loading={false}

  // ADD (NEW): Tier filtering props
  tierFilterEnabled={true}
  currentTier={currentTier}
  onTierChange={setCurrentTier}
  tierCounts={tierCounts}

  // ADD (NEW): Render props for badges
  renderAgentBadges={(agent) => (
    <>
      <AgentTierBadge tier={agent.tier || 1} variant="compact" />
      {agent.visibility === 'protected' && (
        <ProtectionBadge
          isProtected={true}
          protectionReason="System agent - protected from modification"
        />
      )}
    </>
  )}

  // ADD (NEW): Render prop for agent icon
  renderAgentIcon={(agent) => (
    <AgentIcon
      agent={{
        name: agent.name,
        icon: agent.icon,
        icon_type: agent.icon_type,
        icon_emoji: agent.icon_emoji,
        tier: agent.tier
      }}
      size="lg"
    />
  )}
/>
```

**Integration Point 6: Add tier toggle to header** (Line 170-187)
```typescript
// Line 170: UPDATE header section
<div className="border-b border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-900 px-6 py-4 sticky top-0 z-10">
  <div className="flex justify-between items-center">
    <div>
      <h2 className="text-xl font-bold text-gray-900 dark:text-gray-100">Agent Manager</h2>
      <p className="text-sm text-gray-600 dark:text-gray-400 mt-1">
        Route: {routeKey} | API Status: {apiService.getStatus().isDestroyed ? 'Destroyed' : 'Active'}
      </p>
    </div>

    <div className="flex items-center gap-3">
      {/* ADD (NEW): Tier toggle */}
      <AgentTierToggle
        currentTier={currentTier}
        onTierChange={setCurrentTier}
        tierCounts={tierCounts}
        loading={loading || refreshing}
      />

      {/* EXISTING: Refresh button */}
      <button
        onClick={handleRefresh}
        disabled={refreshing}
        className="flex items-center px-4 py-2 bg-white dark:bg-gray-800 border border-gray-300 dark:border-gray-600 rounded-lg hover:bg-gray-50 dark:hover:bg-gray-700 disabled:opacity-50 transition-colors text-gray-900 dark:text-gray-100"
      >
        <RefreshCw className={`w-4 h-4 mr-2 ${refreshing ? 'animate-spin' : ''}`} />
        Refresh
      </button>
    </div>
  </div>
</div>
```

**Integration Point 7: Update WorkingAgentProfile** (Line 207-208)
```typescript
// Line 207: UPDATE WorkingAgentProfile to receive tier props
{selectedAgent ? (
  <WorkingAgentProfile
    // ADD (NEW): Pass agent data with tier info
    agentData={{
      ...selectedAgent,
      tier: selectedAgent.tier || 1,
      visibility: selectedAgent.visibility || 'public'
    }}
  />
) : (
  // ... empty state
)}
```

---

### File: `/workspaces/agent-feed/frontend/src/components/AgentListSidebar.tsx`

**Integration Point 1: Update props interface** (Lines 5-13)
```typescript
interface AgentListSidebarProps {
  agents: Agent[];
  selectedAgentId: string | null;
  onSelectAgent: (agent: Agent) => void;
  searchTerm: string;
  onSearchChange: (value: string) => void;
  loading?: boolean;
  className?: string;

  // ADD (NEW): Tier filtering props
  tierFilterEnabled?: boolean;
  currentTier?: '1' | '2' | 'all';
  onTierChange?: (tier: '1' | '2' | 'all') => void;
  tierCounts?: {
    tier1: number;
    tier2: number;
    total: number;
  };

  // ADD (NEW): Render props for badges
  renderAgentBadges?: (agent: Agent) => React.ReactNode;
  renderAgentIcon?: (agent: Agent) => React.ReactNode;
}
```

**Integration Point 2: Add tier toggle to header** (After Line 83)
```typescript
// Line 83: After search input, add tier toggle
</div>

{/* ADD (NEW): Tier toggle in sidebar header */}
{tierFilterEnabled && currentTier && onTierChange && tierCounts && (
  <div className="mt-3">
    <AgentTierToggle
      currentTier={currentTier}
      onTierChange={onTierChange}
      tierCounts={tierCounts}
      loading={loading}
    />
  </div>
)}

{/* Results Count */}
<div className="mt-2 text-xs text-gray-500 dark:text-gray-400">
```

**Integration Point 3: Update agent list item rendering** (Lines 98-106)
```typescript
// Line 98: UPDATE agent list rendering with badges
<div className="divide-y divide-gray-100 dark:divide-gray-800">
  {filteredAgents.map((agent) => (
    <AgentListItem
      key={agent.id}
      agent={agent}
      isSelected={agent.id === selectedAgentId}
      onClick={() => onSelectAgent(agent)}

      // ADD (NEW): Pass render props
      renderBadges={renderAgentBadges}
      renderIcon={renderAgentIcon}
    />
  ))}
</div>
```

**Integration Point 4: Update AgentListItem component** (Lines 117-231)
```typescript
interface AgentListItemProps {
  agent: Agent;
  isSelected: boolean;
  onClick: () => void;

  // ADD (NEW): Render props
  renderBadges?: (agent: Agent) => React.ReactNode;
  renderIcon?: (agent: Agent) => React.ReactNode;
}

const AgentListItem: React.FC<AgentListItemProps> = React.memo(
  ({ agent, isSelected, onClick, renderBadges, renderIcon }) => {
    // ... existing code

    return (
      <button /* ... */>
        <div className="flex items-start gap-3">
          {/* UPDATE: Use render prop for icon if provided */}
          {renderIcon ? (
            renderIcon(agent)
          ) : (
            <div /* default avatar styling */>
              <Bot className="w-5 h-5 text-white" />
              {/* Status dot indicator */}
            </div>
          )}

          <div className="flex-1 min-w-0">
            {/* Agent name */}
            <h3>{agent.display_name || agent.name}</h3>

            {/* Description */}
            <p>{agent.description}</p>

            {/* UPDATE: Add badges using render prop */}
            <div className="flex items-center gap-2">
              <span className="status-badge">{agent.status}</span>

              {/* ADD (NEW): Render tier and protection badges */}
              {renderBadges && renderBadges(agent)}
            </div>
          </div>
        </div>
      </button>
    );
  }
);
```

---

### File: `/workspaces/agent-feed/frontend/src/components/WorkingAgentProfile.tsx`

**Integration Point 1: Update component to accept tier props** (Lines 23-29)
```typescript
interface WorkingAgentProfileProps {
  // ADD (NEW): Optional agent data override
  agentData?: AgentData & {
    tier?: 1 | 2;
    visibility?: 'public' | 'protected';
    icon?: string;
    icon_type?: 'svg' | 'emoji';
    icon_emoji?: string;
  };
}

const WorkingAgentProfile: React.FC<WorkingAgentProfileProps> = ({
  agentData: propAgentData
}) => {
  // ... existing state
```

**Integration Point 2: Add tier badge imports** (Lines 1-12)
```typescript
import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { ArrowLeft, User, Bot, FileText, Code } from 'lucide-react';
import RealDynamicPagesTab from './RealDynamicPagesTab';
import { getToolDescription } from '../constants/toolDescriptions';

// ADD (NEW): Tier component imports
import { AgentIcon } from './agents/AgentIcon';
import { AgentTierBadge } from './agents/AgentTierBadge';
import { ProtectionBadge } from './agents/ProtectionBadge';
```

**Integration Point 3: Update agent header** (Lines 118-137)
```typescript
// Line 118: UPDATE agent header with tier badges
<div className="flex items-center gap-4">
  {/* UPDATE: Use AgentIcon component */}
  <AgentIcon
    agent={{
      name: agentData.name,
      icon: agentData.icon,
      icon_type: agentData.icon_type,
      icon_emoji: agentData.icon_emoji,
      tier: agentData.tier
    }}
    size="2xl"
  />

  <div>
    <h1 className="text-2xl font-bold text-gray-900 dark:text-gray-100">
      {agentData.display_name || agentData.name}
    </h1>
    <p className="text-gray-600 dark:text-gray-400">{agentData.description}</p>

    {/* UPDATE: Add tier and protection badges */}
    <div className="flex items-center gap-2 mt-1">
      <span className="status-badge">{agentData.status}</span>

      {/* ADD (NEW): Tier badge */}
      <AgentTierBadge tier={agentData.tier || 1} variant="default" showLabel={true} />

      {/* ADD (NEW): Protection badge */}
      {agentData.visibility === 'protected' && (
        <ProtectionBadge
          isProtected={true}
          protectionReason="System agent - protected from modification"
        />
      )}

      <span className="text-xs text-gray-500 dark:text-gray-400">ID: {agentData.id}</span>
    </div>
  </div>
</div>
```

---

### File: `/workspaces/agent-feed/frontend/src/services/apiServiceIsolated.ts`

**Integration Point: Update getAgents method signature**
```typescript
// ADD: Support tier parameter in API calls
async getAgents(options?: { tier?: '1' | '2' | 'all' }): Promise<any> {
  const tier = options?.tier || 'all';
  const url = `/api/v1/claude-live/prod/agents?tier=${tier}`;
  return this.fetch(url);
}
```

---

## 4. Props Interface Definitions

### AgentTierToggle Props
```typescript
interface AgentTierToggleProps {
  currentTier: '1' | '2' | 'all';
  onTierChange: (tier: '1' | '2' | 'all') => void;
  tierCounts: {
    tier1: number;
    tier2: number;
    total: number;
  };
  loading?: boolean;
}
```

### AgentTierBadge Props
```typescript
interface AgentTierBadgeProps {
  tier: 1 | 2;
  variant?: 'default' | 'compact' | 'icon-only';
  showLabel?: boolean;
  className?: string;
}
```

### AgentIcon Props
```typescript
interface AgentIconProps {
  agent: {
    name: string;
    icon?: string;
    icon_type?: 'svg' | 'emoji';
    icon_emoji?: string;
    tier?: 1 | 2;
  };
  size?: 'xs' | 'sm' | 'md' | 'lg' | 'xl' | '2xl';
  className?: string;
  showStatus?: boolean;
}
```

### ProtectionBadge Props
```typescript
interface ProtectionBadgeProps {
  isProtected: boolean;
  protectionReason?: string;
  showTooltip?: boolean;
  className?: string;
}
```

### Updated AgentListSidebar Props
```typescript
interface AgentListSidebarProps {
  // Existing props
  agents: Agent[];
  selectedAgentId: string | null;
  onSelectAgent: (agent: Agent) => void;
  searchTerm: string;
  onSearchChange: (value: string) => void;
  loading?: boolean;
  className?: string;

  // NEW: Tier filtering props
  tierFilterEnabled?: boolean;
  currentTier?: '1' | '2' | 'all';
  onTierChange?: (tier: '1' | '2' | 'all') => void;
  tierCounts?: {
    tier1: number;
    tier2: number;
    total: number;
  };

  // NEW: Render props for customization
  renderAgentBadges?: (agent: Agent) => React.ReactNode;
  renderAgentIcon?: (agent: Agent) => React.ReactNode;
}
```

### Extended Agent Type
```typescript
// Extend existing Agent interface with tier fields
interface Agent {
  // ... existing fields

  // Tier system fields (may not exist in api.ts yet)
  tier?: 1 | 2;
  visibility?: 'public' | 'protected';
  icon?: string;
  icon_type?: 'svg' | 'emoji';
  icon_emoji?: string;
  posts_as_self?: boolean;
  show_in_default_feed?: boolean;
}
```

---

## 5. State Management Strategy

### State Architecture

```
┌─────────────────────────────────────────────────────────────────┐
│                      State Management Layers                     │
├─────────────────────────────────────────────────────────────────┤
│                                                                  │
│  Layer 1: Persistent State (localStorage)                       │
│  ┌────────────────────────────────────────────────────────────┐ │
│  │ Key: 'agentTierFilter'                                     │ │
│  │ Value: '1' | '2' | 'all'                                   │ │
│  │ Default: '1'                                               │ │
│  └────────────────────────────────────────────────────────────┘ │
│                           ▲   │                                  │
│                           │   ▼                                  │
│  Layer 2: React Hook State (useAgentTierFilter)                 │
│  ┌────────────────────────────────────────────────────────────┐ │
│  │ currentTier: TierFilter                                    │ │
│  │ setCurrentTier: (tier: TierFilter) => void                │ │
│  │ showTier1: boolean                                         │ │
│  │ showTier2: boolean                                         │ │
│  └────────────────────────────────────────────────────────────┘ │
│                           │                                      │
│                           ▼                                      │
│  Layer 3: Component State (IsolatedRealAgentManager)            │
│  ┌────────────────────────────────────────────────────────────┐ │
│  │ agents: Agent[]                  (server data)             │ │
│  │ loading: boolean                 (UI state)                │ │
│  │ error: string | null             (error state)             │ │
│  │ selectedAgentId: string | null   (selection state)         │ │
│  │ searchTerm: string               (search state)            │ │
│  │ tierCounts: {...}                (derived state)           │ │
│  └────────────────────────────────────────────────────────────┘ │
│                                                                  │
└─────────────────────────────────────────────────────────────────┘
```

### State Synchronization Flow

```
User Action                    State Update                    Side Effects
────────────────────────────────────────────────────────────────────────────

Click tier button          → setCurrentTier('2')          → Save to localStorage
                          → currentTier = '2'            → Trigger useEffect
                          → showTier2 = true             → Call loadAgents()
                          → showTier1 = false            → API request
                                                         → Update agents state
                                                         → Re-render UI

Page refresh               → Read localStorage           → Initialize hook state
                          → currentTier = '2'            → Call loadAgents()
                          → showTier2 = true             → Populate UI
                          → showTier1 = false

Route change               → apiService.destroy()        → Clean up requests
                          → Clear component state        → Unregister listeners
                          → Keep localStorage            → Persist preference
```

### State Management Best Practices

1. **Single Source of Truth**: `useAgentTierFilter` hook manages tier state
2. **Persistence**: localStorage ensures preference survives page refresh
3. **Derived State**: `tierCounts` calculated from `agents` array
4. **Route Isolation**: Each route instance has its own API service
5. **Cleanup**: Proper cleanup on route unmount prevents memory leaks

---

## 6. Dark Mode Preservation Strategy

### Dark Mode Architecture

```
┌─────────────────────────────────────────────────────────────────┐
│                    Dark Mode Implementation                      │
├─────────────────────────────────────────────────────────────────┤
│                                                                  │
│  Global Hook: useDarkMode() (App.tsx)                           │
│  ┌────────────────────────────────────────────────────────────┐ │
│  │ • Detects system preference                               │ │
│  │ • Adds 'dark' class to <html> element                     │ │
│  │ • Persists user preference                                │ │
│  └────────────────────────────────────────────────────────────┘ │
│                           │                                      │
│                           ▼                                      │
│  Tailwind CSS dark: variant                                     │
│  ┌────────────────────────────────────────────────────────────┐ │
│  │ • Automatic color scheme switching                        │ │
│  │ • No component-level logic needed                         │ │
│  └────────────────────────────────────────────────────────────┘ │
│                                                                  │
└─────────────────────────────────────────────────────────────────┘
```

### Dark Mode Color System

**Existing color classes used in IsolatedRealAgentManager:**
- `bg-white dark:bg-gray-900` - Background
- `text-gray-900 dark:text-gray-100` - Primary text
- `text-gray-600 dark:text-gray-400` - Secondary text
- `border-gray-200 dark:border-gray-700` - Borders
- `bg-gray-50 dark:bg-gray-800` - Subtle backgrounds
- `hover:bg-gray-100 dark:hover:bg-gray-800` - Hover states

**NEW classes for tier components:**

**AgentTierToggle:**
```css
/* Container */
border-gray-300 dark:border-gray-700
bg-white dark:bg-gray-900

/* Inactive buttons */
text-gray-700 dark:text-gray-300
hover:bg-gray-100 dark:hover:bg-gray-800

/* Active buttons */
bg-blue-600 dark:bg-blue-700        /* Tier 1 */
bg-gray-600 dark:bg-gray-700        /* Tier 2 */
bg-purple-600 dark:bg-purple-700    /* All */
text-white dark:text-white          /* Active text */

/* Count badges */
text-gray-500 dark:text-gray-400    /* Inactive count */
```

**AgentTierBadge:**
```css
/* Tier 1 (User-facing) */
bg-blue-100 dark:bg-blue-900/30
text-blue-800 dark:text-blue-300
border-blue-300 dark:border-blue-700

/* Tier 2 (System) */
bg-gray-100 dark:bg-gray-800
text-gray-800 dark:text-gray-300
border-gray-300 dark:border-gray-700
```

**ProtectionBadge:**
```css
bg-red-100 dark:bg-red-900/30
text-red-800 dark:text-red-300
border-red-300 dark:border-red-700
```

**AgentIcon:**
```css
/* Tier 1 icon color */
text-blue-600 dark:text-blue-400

/* Tier 2 icon color */
text-gray-500 dark:text-gray-400

/* Fallback initials */
bg-gray-200 dark:bg-gray-700
text-gray-600 dark:text-gray-300
```

### Dark Mode Testing Checklist

- [ ] IsolatedRealAgentManager maintains dark mode
- [ ] AgentTierToggle buttons visible in both modes
- [ ] AgentTierBadge readable in both modes
- [ ] ProtectionBadge stands out in both modes
- [ ] AgentIcon colors appropriate for tier
- [ ] Search input maintains dark mode
- [ ] Sidebar maintains dark mode
- [ ] WorkingAgentProfile maintains dark mode
- [ ] All hover states work in dark mode
- [ ] All focus states work in dark mode

---

## 7. Implementation Checklist

### Phase 1: Component Updates
- [ ] Update IsolatedRealAgentManager imports
- [ ] Add useAgentTierFilter hook
- [ ] Update loadAgents with tier parameter
- [ ] Calculate tierCounts
- [ ] Add AgentTierToggle to header
- [ ] Update WorkingAgentProfile props

### Phase 2: Sidebar Integration
- [ ] Update AgentListSidebar props interface
- [ ] Add tier toggle to sidebar header
- [ ] Add render props for badges and icon
- [ ] Update AgentListItem component
- [ ] Test sidebar filtering

### Phase 3: API Integration
- [ ] Update apiServiceIsolated.getAgents signature
- [ ] Test API calls with tier parameter
- [ ] Verify backend tier filtering
- [ ] Test localStorage persistence

### Phase 4: Testing
- [ ] Unit tests for useAgentTierFilter hook
- [ ] Integration tests for tier filtering
- [ ] E2E tests for UI interactions
- [ ] Dark mode visual regression tests
- [ ] Route isolation tests

### Phase 5: Documentation
- [ ] Update component README files
- [ ] Create quick reference guide
- [ ] Document tier filtering behavior
- [ ] Add examples and screenshots

---

## 8. Performance Considerations

### Optimization Strategies

1. **Memoization**
   - `AgentListItem` is already memoized with custom comparison
   - `tierCounts` calculation is lightweight (no memoization needed)
   - `useAgentTierFilter` hook uses minimal state

2. **API Efficiency**
   - Server-side tier filtering reduces data transfer
   - localStorage caching prevents redundant API calls
   - Route-isolated API service prevents conflicts

3. **Render Optimization**
   - Render props pattern avoids prop drilling
   - Component-level memoization prevents cascading re-renders
   - Dark mode uses CSS classes (no JS overhead)

4. **State Management**
   - Single tier state source (no duplication)
   - Derived state computed on-demand
   - Cleanup prevents memory leaks

---

## 9. Error Handling

### Error Scenarios

1. **API Failure**
   ```typescript
   // Existing error handling in loadAgents()
   catch (err) {
     if (err.name !== 'AbortError' && !apiService.getStatus().isDestroyed) {
       setError(err instanceof Error ? err.message : 'Failed to load agents');
       console.error('❌ Error loading agents:', err);
     }
   }
   ```

2. **Invalid Tier Value**
   ```typescript
   // useAgentTierFilter validation
   const setCurrentTier = (tier: TierFilter) => {
     if (tier !== '1' && tier !== '2' && tier !== 'all') {
       console.error('Invalid tier value:', tier);
       return; // Silently fail, keep current tier
     }
     setCurrentTierState(tier);
   };
   ```

3. **localStorage Failure**
   ```typescript
   // Graceful fallback in useAgentTierFilter
   try {
     const saved = localStorage.getItem(STORAGE_KEY);
     // ... use saved value
   } catch (error) {
     console.warn('Failed to read tier filter:', error);
     return '1'; // Fall back to default
   }
   ```

4. **Missing Agent Data**
   ```typescript
   // Safe fallbacks in components
   tier={agent.tier || 1}
   visibility={agent.visibility || 'public'}
   icon_emoji={agent.icon_emoji || '🤖'}
   ```

---

## 10. Migration Path

### Before (Current State)

```
IsolatedRealAgentManager
├── No tier filtering
├── Shows all agents
├── Manual search only
└── No tier badges
```

### After (Target State)

```
IsolatedRealAgentManager
├── Tier filtering hook
├── API tier parameter
├── Tier toggle in header
├── Tier badges in sidebar
├── Tier badges in profile
└── localStorage persistence
```

### Migration Steps

1. **Non-breaking changes first**
   - Add tier imports (no existing code affected)
   - Add tier hook (coexists with existing state)
   - Extend Agent interface (optional fields)

2. **Extend existing components**
   - Add optional props to AgentListSidebar
   - Add render props (backward compatible)
   - Update WorkingAgentProfile (optional props)

3. **Update API calls**
   - Modify apiServiceIsolated.getAgents
   - Add tier parameter to backend
   - Maintain backward compatibility (default to 'all')

4. **Enable tier filtering**
   - Pass tier props to components
   - Enable tier toggle in UI
   - Test end-to-end flow

5. **Cleanup**
   - Remove old filtering logic (if any)
   - Update documentation
   - Remove feature flags

---

## 11. Testing Strategy

### Unit Tests

```typescript
// useAgentTierFilter.test.ts
describe('useAgentTierFilter', () => {
  it('defaults to tier 1', () => { /* ... */ });
  it('persists to localStorage', () => { /* ... */ });
  it('validates tier values', () => { /* ... */ });
  it('calculates showTier1/showTier2', () => { /* ... */ });
});

// AgentTierToggle.test.tsx
describe('AgentTierToggle', () => {
  it('renders three buttons', () => { /* ... */ });
  it('highlights active tier', () => { /* ... */ });
  it('calls onTierChange', () => { /* ... */ });
  it('disables when loading', () => { /* ... */ });
});
```

### Integration Tests

```typescript
// IsolatedRealAgentManager.integration.test.tsx
describe('IsolatedRealAgentManager with tier filtering', () => {
  it('loads tier 1 agents by default', () => { /* ... */ });
  it('filters agents when tier changes', () => { /* ... */ });
  it('updates URL with tier parameter', () => { /* ... */ });
  it('persists tier preference', () => { /* ... */ });
  it('displays tier badges correctly', () => { /* ... */ });
});
```

### E2E Tests (Playwright)

```typescript
// tier-filtering-ui.spec.ts
test('tier filtering workflow', async ({ page }) => {
  await page.goto('/agents');

  // Should default to Tier 1
  await expect(page.locator('[aria-pressed="true"]')).toContainText('Tier 1');

  // Switch to Tier 2
  await page.click('button:has-text("Tier 2")');
  await expect(page.locator('[data-tier="2"]')).toBeVisible();

  // Refresh page - preference should persist
  await page.reload();
  await expect(page.locator('[aria-pressed="true"]')).toContainText('Tier 2');
});
```

---

## 12. Rollback Strategy

### Rollback Steps

If integration causes issues, rollback is simple:

1. **Remove tier imports** from IsolatedRealAgentManager
2. **Remove useAgentTierFilter hook** call
3. **Restore original loadAgents** (remove tier parameter)
4. **Restore original AgentListSidebar props** (remove tier props)
5. **Restore original header** (remove AgentTierToggle)
6. **Restore original WorkingAgentProfile** (remove tier props)

**Git rollback command:**
```bash
git revert <commit-hash>
```

**Feature flag approach:**
```typescript
const ENABLE_TIER_FILTERING = false; // Set to false to disable

{ENABLE_TIER_FILTERING && (
  <AgentTierToggle
    currentTier={currentTier}
    onTierChange={setCurrentTier}
    tierCounts={tierCounts}
  />
)}
```

---

## Appendix A: File Locations

```
frontend/src/
├── components/
│   ├── IsolatedRealAgentManager.tsx     (PRIMARY INTEGRATION)
│   ├── AgentListSidebar.tsx             (SIDEBAR INTEGRATION)
│   ├── WorkingAgentProfile.tsx          (PROFILE INTEGRATION)
│   └── agents/
│       ├── AgentTierToggle.tsx          (EXISTING - NO CHANGES)
│       ├── AgentTierBadge.tsx           (EXISTING - NO CHANGES)
│       ├── AgentIcon.tsx                (EXISTING - NO CHANGES)
│       ├── ProtectionBadge.tsx          (EXISTING - NO CHANGES)
│       └── index.ts                     (EXISTING - NO CHANGES)
├── hooks/
│   └── useAgentTierFilter.ts            (EXISTING - NO CHANGES)
├── services/
│   └── apiServiceIsolated.ts            (MINOR UPDATE)
├── types/
│   └── api.ts                           (EXTEND Agent interface)
└── App.tsx                              (NO CHANGES)
```

---

## Appendix B: Color Reference

### Tier Color Palette (Light Mode)

| Element | Tier 1 | Tier 2 | All | Protected |
|---------|--------|--------|-----|-----------|
| Toggle button (active) | `bg-blue-600` | `bg-gray-600` | `bg-purple-600` | N/A |
| Toggle text (active) | `text-white` | `text-white` | `text-white` | N/A |
| Badge background | `bg-blue-100` | `bg-gray-100` | N/A | `bg-red-100` |
| Badge text | `text-blue-800` | `text-gray-800` | N/A | `text-red-800` |
| Badge border | `border-blue-300` | `border-gray-300` | N/A | `border-red-300` |
| Icon color | `text-blue-600` | `text-gray-500` | N/A | `text-red-600` |

### Tier Color Palette (Dark Mode)

| Element | Tier 1 | Tier 2 | All | Protected |
|---------|--------|--------|-----|-----------|
| Toggle button (active) | `bg-blue-700` | `bg-gray-700` | `bg-purple-700` | N/A |
| Toggle text (active) | `text-white` | `text-white` | `text-white` | N/A |
| Badge background | `bg-blue-900/30` | `bg-gray-800` | N/A | `bg-red-900/30` |
| Badge text | `text-blue-300` | `text-gray-300` | N/A | `text-red-300` |
| Badge border | `border-blue-700` | `border-gray-700` | N/A | `border-red-700` |
| Icon color | `text-blue-400` | `text-gray-400` | N/A | `text-red-400` |

---

## Summary

This architecture document provides a complete blueprint for integrating tier filtering into IsolatedRealAgentManager while preserving:

1. **Two-panel layout**: Sidebar + detail panel structure maintained
2. **Dark mode**: Comprehensive dark mode color system documented
3. **Route isolation**: Existing cleanup and API service isolation preserved
4. **Performance**: Optimized state management and rendering
5. **Accessibility**: ARIA labels and keyboard navigation
6. **Type safety**: Full TypeScript interfaces defined

**Key Integration Points:**
- Line 1-10: Import tier components
- Line 31: Add useAgentTierFilter hook
- Line 37: Update API call with tier parameter
- Line 158: Pass tier props to sidebar
- Line 177: Add tier toggle to header
- Line 207: Update profile with tier data

**Next Steps:**
1. Review this architecture with team
2. Implement Phase 1 (Component Updates)
3. Test dark mode preservation
4. Validate tier filtering behavior
5. Deploy to staging environment

---

**Document Version:** 1.0.0
**Last Updated:** 2025-10-19
**Author:** SPARC Architecture Specialist
**Status:** Ready for Implementation
