# Architecture Summary: IsolatedRealAgentManager Tier Filtering

**Quick Reference Guide**

## Key Integration Points

### 1. IsolatedRealAgentManager.tsx

**Lines 1-10**: Add imports
```typescript
import { useAgentTierFilter } from '../hooks/useAgentTierFilter';
import { AgentTierToggle } from './agents/AgentTierToggle';
import { AgentTierBadge } from './agents/AgentTierBadge';
import { AgentIcon } from './agents/AgentIcon';
import { ProtectionBadge } from './agents/ProtectionBadge';
```

**Line 31**: Add tier hook
```typescript
const { currentTier, setCurrentTier, showTier1, showTier2 } = useAgentTierFilter();
```

**Line 37**: Update API call
```typescript
const response = await apiService.getAgents({ tier: currentTier });
```

**Line 140**: Calculate tier counts
```typescript
const tierCounts = {
  tier1: agents.filter(a => a.tier === 1).length,
  tier2: agents.filter(a => a.tier === 2).length,
  total: agents.length
};
```

**Line 177**: Add tier toggle to header
```typescript
<AgentTierToggle
  currentTier={currentTier}
  onTierChange={setCurrentTier}
  tierCounts={tierCounts}
  loading={loading || refreshing}
/>
```

**Line 158**: Pass tier props to sidebar
```typescript
<AgentListSidebar
  tierFilterEnabled={true}
  currentTier={currentTier}
  onTierChange={setCurrentTier}
  tierCounts={tierCounts}
  renderAgentBadges={(agent) => (
    <>
      <AgentTierBadge tier={agent.tier || 1} variant="compact" />
      {agent.visibility === 'protected' && (
        <ProtectionBadge isProtected={true} />
      )}
    </>
  )}
  renderAgentIcon={(agent) => (
    <AgentIcon agent={agent} size="lg" />
  )}
/>
```

### 2. AgentListSidebar.tsx

**Update props interface** (Lines 5-13):
```typescript
interface AgentListSidebarProps {
  // Existing props...
  
  // NEW: Tier filtering
  tierFilterEnabled?: boolean;
  currentTier?: '1' | '2' | 'all';
  onTierChange?: (tier: '1' | '2' | 'all') => void;
  tierCounts?: { tier1: number; tier2: number; total: number };
  
  // NEW: Render props
  renderAgentBadges?: (agent: Agent) => React.ReactNode;
  renderAgentIcon?: (agent: Agent) => React.ReactNode;
}
```

### 3. WorkingAgentProfile.tsx

**Add tier badges** (Line 118):
```typescript
<div className="flex items-center gap-2 mt-1">
  <span className="status-badge">{agentData.status}</span>
  <AgentTierBadge tier={agentData.tier || 1} />
  {agentData.visibility === 'protected' && (
    <ProtectionBadge isProtected={true} />
  )}
</div>
```

## Component Hierarchy

```
IsolatedRealAgentManager
├── useAgentTierFilter() → manages tier state + localStorage
├── AgentListSidebar
│   ├── AgentTierToggle (in header)
│   └── Agent items with badges
│       ├── AgentIcon
│       ├── AgentTierBadge
│       └── ProtectionBadge
└── WorkingAgentProfile
    └── Agent header with badges
        ├── AgentIcon
        ├── AgentTierBadge
        └── ProtectionBadge
```

## Data Flow

```
User clicks tier button
  ↓
setCurrentTier('2')
  ↓
localStorage saves preference
  ↓
useEffect triggers loadAgents()
  ↓
API call: /agents?tier=2
  ↓
setAgents(response.agents)
  ↓
UI re-renders with filtered agents
```

## Dark Mode Colors

| Component | Light Mode | Dark Mode |
|-----------|------------|-----------|
| Tier 1 toggle | `bg-blue-600` | `bg-blue-700` |
| Tier 2 toggle | `bg-gray-600` | `bg-gray-700` |
| Tier 1 badge | `bg-blue-100 text-blue-800` | `bg-blue-900/30 text-blue-300` |
| Tier 2 badge | `bg-gray-100 text-gray-800` | `bg-gray-800 text-gray-300` |
| Protected badge | `bg-red-100 text-red-800` | `bg-red-900/30 text-red-300` |

## Files to Modify

1. `/workspaces/agent-feed/frontend/src/components/IsolatedRealAgentManager.tsx` - PRIMARY
2. `/workspaces/agent-feed/frontend/src/components/AgentListSidebar.tsx` - UPDATE PROPS
3. `/workspaces/agent-feed/frontend/src/components/WorkingAgentProfile.tsx` - ADD BADGES
4. `/workspaces/agent-feed/frontend/src/services/apiServiceIsolated.ts` - API UPDATE
5. `/workspaces/agent-feed/frontend/src/types/api.ts` - EXTEND INTERFACE

## No Changes Needed

- `/workspaces/agent-feed/frontend/src/App.tsx` - routing already correct
- `/workspaces/agent-feed/frontend/src/components/agents/*` - all components ready
- `/workspaces/agent-feed/frontend/src/hooks/useAgentTierFilter.ts` - hook ready

## Testing Checklist

- [ ] Tier toggle renders in header
- [ ] Tier badges show in sidebar
- [ ] Tier badges show in profile
- [ ] Protection badges show for protected agents
- [ ] Dark mode works on all components
- [ ] localStorage persists tier preference
- [ ] API filtering works correctly
- [ ] Route cleanup still works
- [ ] Two-panel layout preserved

## Full Documentation

See `/workspaces/agent-feed/docs/ARCHITECTURE-UI-LAYOUT-FIX.md` for complete details.
