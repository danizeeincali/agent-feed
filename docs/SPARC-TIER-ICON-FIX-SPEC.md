# SPARC Specification: Tier Count, Icon, and Protection Badge Fixes

**Version**: 1.0.0
**Status**: Ready for Implementation
**Phase**: Bug Fix - Production Enhancement
**Created**: 2025-10-20
**Methodology**: SPARC (Specification, Pseudocode, Architecture, Refinement, Completion)

---

## Executive Summary

This specification addresses three critical user-facing issues in the agent management interface:

1. **Tier count calculation bug** - Inactive tier counts show 0 instead of total agent count
2. **Missing protection badges** - Tier 2 protected agents don't display lock badges despite correct backend data
3. **Emoji fallback displaying** - SVG icons from lucide-react fail to load, showing emoji fallbacks instead

All three issues impact user experience and system clarity. The root causes have been identified through investigation and concrete solutions are specified below.

---

## 1. Specification Phase

### 1.1 Problem Statement

**Current Behavior**:
- When filtering by Tier 1, toggle shows: "Tier 1 (9), Tier 2 (0), All (9)"
- Tier 2 protected agents (8+ agents) display without protection lock badges
- All agents display emoji icons (💬, 💡, ⏰) instead of clean SVG icons with tier-specific colors

**Expected Behavior**:
- When filtering by any tier, toggle shows: "Tier 1 (9), Tier 2 (10), All (19)"
- Tier 2 protected agents display red lock badges with "Protected" label
- All agents display lucide-react SVG icons: Blue for T1, Gray for T2

**Impact**:
- **Tier Counts**: HIGH - Confusing UX, makes system appear broken
- **Protection Badges**: MEDIUM - Security/modification warnings not visible to users
- **SVG Icons**: LOW-MEDIUM - Functional but unprofessional appearance

---

### 1.2 Functional Requirements

#### FR-001: Client-Side Tier Filtering
**Priority**: HIGH
**Description**: Implement client-side filtering to maintain full agent list in memory

**Acceptance Criteria**:
- [ ] Fetch all agents once on component mount
- [ ] Store full agent list in `allAgents` state
- [ ] Filter agents locally based on `currentTier` selection
- [ ] No additional API calls when switching tiers
- [ ] Tier switching response time < 50ms

**Rationale**: Current implementation fetches filtered agents from API, losing context of total counts. Client-side filtering maintains full dataset while providing instant filter updates.

---

#### FR-002: Accurate Tier Count Calculation
**Priority**: HIGH
**Description**: Calculate tier counts from full agent list, not filtered subset

**Acceptance Criteria**:
- [ ] Tier 1 count always shows 9 (total T1 agents)
- [ ] Tier 2 count always shows 10 (total T2 agents)
- [ ] Total count always shows 19 (all agents)
- [ ] Counts remain consistent regardless of active tier filter
- [ ] Counts update only when agent data changes

**Current Implementation** (BROKEN):
```typescript
// Line 177-182: IsolatedRealAgentManager.tsx
const tierCounts = {
  tier1: agents.filter(a => a.tier === 1).length,  // ❌ Filters filtered list
  tier2: agents.filter(a => a.tier === 2).length,  // ❌ Filters filtered list
  total: agents.length                             // ❌ Filtered list length
};
```

**Expected Implementation**:
```typescript
const tierCounts = {
  tier1: allAgents.filter(a => a.tier === 1).length,  // ✅ Full list
  tier2: allAgents.filter(a => a.tier === 2).length,  // ✅ Full list
  total: allAgents.length                             // ✅ Full list
};
```

---

#### FR-003: Protection Badge Visibility
**Priority**: MEDIUM
**Description**: Display protection badges for all Tier 2 agents with `visibility: protected`

**Acceptance Criteria**:
- [ ] All T2 protected agents show red lock badge
- [ ] Badge displays "Protected" text with Lock icon
- [ ] Hover tooltip shows protection reason
- [ ] Badge styling matches tier badge design system
- [ ] ARIA labels present for accessibility

**Protected Agents** (Expected to show badges):
- agent-architect-agent (T2, visibility: protected)
- agent-maintenance-agent (T2, visibility: protected)
- skills-architect-agent (T2, visibility: protected)
- skills-maintenance-agent (T2, visibility: protected)
- learning-optimizer-agent (T2, visibility: protected)
- system-architect-agent (T2, visibility: protected)
- meta-agent (T2, visibility: protected)
- meta-update-agent (T2, visibility: protected)

**Total**: 8+ Tier 2 protected agents

---

#### FR-004: SVG Icon Resolution
**Priority**: MEDIUM
**Description**: Resolve lucide-react SVG icons correctly, eliminating emoji fallbacks

**Acceptance Criteria**:
- [ ] All 19 agents display SVG icons (no emojis)
- [ ] Icon lookup succeeds for all icon names
- [ ] No "Failed to load icon" console warnings
- [ ] Icons render at correct sizes (w-6 h-6 in sidebar)
- [ ] Fallback to emoji only if icon truly doesn't exist

**Icon Mapping Verification**:

**Tier 1 Icons** (User-Facing):
- MessageSquare → agent-feedback-agent
- Lightbulb → agent-ideas-agent
- Clock → follow-ups-agent
- Users → get-to-know-you-agent
- FileText → meeting-next-steps-agent
- Link → link-logger-agent
- Calendar → meeting-prep-agent
- CheckSquare → personal-todos-agent
- Book → page-builder-agent (if T1)

**Tier 2 Icons** (System):
- Settings → meta-agent
- Wrench → agent-architect-agent
- Tool → skills-maintenance-agent
- Pencil → agent-maintenance-agent
- TrendingUp → learning-optimizer-agent
- Database → (system data agents)
- TestTube → dynamic-page-testing-agent
- ShieldCheck → (security agents)
- Layout → page-builder-agent (if T2)
- BookOpen → page-verification-agent

**All icons exist in lucide-react** - Lookup mechanism needs debugging.

---

#### FR-005: Tier-Specific Icon Styling
**Priority**: MEDIUM
**Description**: Apply tier-specific colors to SVG icons consistently

**Acceptance Criteria**:
- [ ] Tier 1 icons display in blue (#3B82F6 / text-blue-600)
- [ ] Tier 2 icons display in gray (#6B7280 / text-gray-500)
- [ ] Stroke width consistent at 2px
- [ ] Colors apply to all icon instances (sidebar, detail panel)
- [ ] Dark mode color adjustments preserved

**Current Implementation** (CORRECT):
```typescript
const TIER_COLORS = {
  1: 'text-blue-600',  // ✅ User-facing blue
  2: 'text-gray-500'   // ✅ System gray
};
```

---

#### FR-006: Fallback System Integrity
**Priority**: LOW
**Description**: Maintain three-level fallback system for icon resolution

**Acceptance Criteria**:
- [ ] Level 1: SVG from lucide-react (preferred)
- [ ] Level 2: Emoji fallback (if SVG fails)
- [ ] Level 3: Initials (if no emoji)
- [ ] Each level logs attempt for debugging
- [ ] Fallback chain executes in correct order

**Fallback Logic**:
```typescript
// Level 1: SVG icon (if icon_type === 'svg')
if (agent.icon && agent.icon_type === 'svg') {
  const Icon = getLucideIcon(agent.icon);
  if (Icon) return <Icon />;
}

// Level 2: Emoji fallback
if (agent.icon_emoji) {
  return <span>{agent.icon_emoji}</span>;
}

// Level 3: Initials fallback
return <div>{generateInitials(agent.name)}</div>;
```

---

#### FR-007: Type Safety for Agent Interface
**Priority**: HIGH
**Description**: Ensure TypeScript Agent interface includes all required fields

**Acceptance Criteria**:
- [ ] `visibility` field defined as `'public' | 'protected'`
- [ ] `icon` field defined as optional string
- [ ] `icon_type` field defined as `'svg' | 'emoji'`
- [ ] `icon_emoji` field defined as optional string
- [ ] `tier` field defined as `1 | 2`
- [ ] No TypeScript compilation errors

**Current Type Definition** (VERIFIED CORRECT):
```typescript
// frontend/src/types/api.ts lines 27-36
export interface Agent {
  // ... other fields
  tier?: 1 | 2;                        // ✅ PRESENT
  visibility?: 'public' | 'protected'; // ✅ PRESENT
  icon?: string;                       // ✅ PRESENT
  icon_type?: 'svg' | 'emoji';        // ✅ PRESENT
  icon_emoji?: string;                 // ✅ PRESENT
}
```

**Status**: Type definitions are CORRECT. Issue lies in runtime data flow or component logic.

---

#### FR-008: Debug Logging and Observability
**Priority**: MEDIUM
**Description**: Add comprehensive debug logging for troubleshooting

**Acceptance Criteria**:
- [ ] Log icon lookup attempts with results
- [ ] Log agent data received by components
- [ ] Log protection badge render conditions
- [ ] Log tier count calculations
- [ ] Logs can be toggled via environment variable

**Debug Points**:
```typescript
// Icon lookup
console.log('🔍 Icon lookup:', { iconName, found: !!icon });

// Agent data
console.log('👤 Agent render:', {
  name: agent.name,
  icon: agent.icon,
  icon_type: agent.icon_type,
  visibility: agent.visibility
});

// Protection badge
console.log('🔒 Protection check:', {
  name: agent.name,
  visibility: agent.visibility,
  showBadge: agent.visibility === 'protected'
});

// Tier counts
console.log('📊 Tier counts:', {
  tier1: allAgents.filter(a => a.tier === 1).length,
  tier2: allAgents.filter(a => a.tier === 2).length,
  currentFilter: currentTier
});
```

---

### 1.3 Non-Functional Requirements

#### NFR-001: Performance
- Client-side filtering must execute in < 50ms
- Initial agent load must complete in < 500ms
- Icon rendering must not cause layout shifts
- Tier toggle clicks must feel instant (< 100ms perceived lag)

#### NFR-002: Reliability
- Icon fallback system must never render blank/broken icons
- Protection badges must display consistently across all agent list views
- Tier counts must remain accurate during concurrent user interactions
- Component must handle missing/malformed agent data gracefully

#### NFR-003: Maintainability
- Debug logging must be toggleable for production builds
- Icon mapping must be centralized and easily extensible
- State management must follow React best practices (single source of truth)
- TypeScript strict mode must pass without errors

#### NFR-004: Accessibility
- Protection badges must have proper ARIA labels
- Icons must have semantic role="img" and aria-label
- Tier filter toggles must be keyboard navigable
- Screen readers must announce tier counts correctly

#### NFR-005: Browser Compatibility
- Must work in Chrome 90+, Firefox 88+, Safari 14+, Edge 90+
- Must support dark mode without visual regression
- Must render correctly at viewport widths 320px - 2560px
- Must handle high DPI displays (2x, 3x scaling)

---

### 1.4 Constraints and Assumptions

**Constraints**:
- Must use existing lucide-react icon library (no new dependencies)
- Must maintain backward compatibility with existing agent frontmatter
- Must not modify backend API response format
- Must work within existing component architecture (AgentListSidebar, IsolatedRealAgentManager)
- Must complete within 4-6 hours development time

**Assumptions**:
- All agent files contain valid frontmatter with tier/visibility fields
- Backend API returns complete agent data including icon fields
- lucide-react exports all required icon components
- Component re-renders are acceptable for tier switching (no virtualization needed)
- Agent count (19 agents) remains manageable for client-side filtering

**Dependencies**:
- lucide-react: ^0.263.0 or compatible
- React: 18.x
- TypeScript: 5.x
- Tailwind CSS: 3.x

---

### 1.5 Success Criteria

#### Tier Count Fix
- [x] **Before**: Click T1 → shows "(9), (0), (9)"
- [ ] **After**: Click T1 → shows "(9), (10), (19)"
- [ ] **Validation**: All three numbers visible at all times regardless of filter

#### Protection Badge Fix
- [x] **Before**: T2 protected agents show no badge
- [ ] **After**: 8+ T2 agents show red lock badge
- [ ] **Validation**: Hover shows protection reason tooltip

#### SVG Icon Fix
- [x] **Before**: All agents show emoji (💬, 💡, ⏰)
- [ ] **After**: All agents show colored SVG icons
- [ ] **Validation**: T1 icons blue, T2 icons gray, no emojis visible

#### Performance Metrics
- [ ] Initial load: < 500ms
- [ ] Tier switching: < 50ms
- [ ] Icon rendering: No layout shifts
- [ ] Memory usage: < 5MB increase for agent data

#### Quality Metrics
- [ ] Zero TypeScript errors
- [ ] Zero console warnings about missing icons
- [ ] Zero accessibility violations (WCAG 2.1 AA)
- [ ] 100% test coverage for new state management logic

---

## 2. Technical Requirements

### 2.1 File Modifications

#### File 1: `frontend/src/components/IsolatedRealAgentManager.tsx`
**Lines to modify**: 50-100 (state management), 177-182 (tier counts)

**Changes Required**:
1. Add `allAgents` state variable
2. Add `displayedAgents` computed value (useMemo)
3. Modify `loadAgents` to fetch all agents once
4. Update `tierCounts` to use `allAgents` instead of `agents`
5. Pass `displayedAgents` to AgentListSidebar instead of `agents`

**Current State Management**:
```typescript
const [agents, setAgents] = useState<Agent[]>([]);
const [loading, setLoading] = useState(true);
const [currentTier, setCurrentTier] = useState<'all' | '1' | '2'>('all');

// Load agents when tier changes (❌ PROBLEM)
useEffect(() => {
  loadAgents();
}, [currentTier]);

const loadAgents = async () => {
  const response = await apiService.getAgents({ tier: currentTier });
  setAgents(response.agents || []);  // ❌ Only filtered agents
};
```

**Target State Management**:
```typescript
const [allAgents, setAllAgents] = useState<Agent[]>([]);
const [loading, setLoading] = useState(true);
const [currentTier, setCurrentTier] = useState<'all' | '1' | '2'>('all');

// Load all agents once on mount (✅ SOLUTION)
useEffect(() => {
  loadAllAgents();
}, []);

const loadAllAgents = async () => {
  setLoading(true);
  try {
    const response = await apiService.getAgents({ tier: 'all' });
    setAllAgents(response.agents || []);
  } catch (error) {
    console.error('Failed to load agents:', error);
  } finally {
    setLoading(false);
  }
};

// Filter client-side when tier changes (✅ INSTANT)
const displayedAgents = useMemo(() => {
  if (currentTier === 'all') return allAgents;
  return allAgents.filter(a => a.tier === Number(currentTier));
}, [allAgents, currentTier]);

// Calculate counts from full list (✅ ACCURATE)
const tierCounts = useMemo(() => ({
  tier1: allAgents.filter(a => a.tier === 1).length,
  tier2: allAgents.filter(a => a.tier === 2).length,
  total: allAgents.length
}), [allAgents]);
```

---

#### File 2: `frontend/src/components/agents/AgentIcon.tsx`
**Lines to modify**: 82-109 (getLucideIcon function)

**Changes Required**:
1. Add debug logging to icon lookup
2. Verify case sensitivity in icon name matching
3. Log successful/failed lookups
4. Add error boundary for icon rendering

**Current Implementation**:
```typescript
const getLucideIcon = (iconName: string): React.ComponentType<any> | null => {
  try {
    const icon = (LucideIcons as any)[iconName];
    if (icon && typeof icon === 'function') {
      return icon;
    }
    return null;  // ❌ Silent failure
  } catch (error) {
    console.warn(`Failed to load icon: ${iconName}`, error);
    return null;
  }
};
```

**Target Implementation**:
```typescript
const getLucideIcon = (iconName: string): React.ComponentType<any> | null => {
  try {
    // Debug logging (toggle via env var)
    if (process.env.NODE_ENV === 'development') {
      console.log('🔍 Looking up icon:', iconName);
    }

    // Direct lookup
    const icon = (LucideIcons as any)[iconName];

    if (icon && typeof icon === 'function') {
      if (process.env.NODE_ENV === 'development') {
        console.log('✅ Icon found:', iconName);
      }
      return icon;
    }

    // Try variations (PascalCase, camelCase, etc.)
    const variations = [
      iconName,
      iconName.charAt(0).toUpperCase() + iconName.slice(1), // Capitalize
      iconName.toLowerCase(),
      `${iconName}Icon`,
      `Lucide${iconName}`
    ];

    for (const variant of variations) {
      const variantIcon = (LucideIcons as any)[variant];
      if (variantIcon && typeof variantIcon === 'function') {
        if (process.env.NODE_ENV === 'development') {
          console.log(`✅ Icon found via variant: ${variant}`);
        }
        return variantIcon;
      }
    }

    // Not found - log and return null
    console.warn(`❌ Icon not found: ${iconName}. Available icons:`,
      Object.keys(LucideIcons).slice(0, 10) + '...');
    return null;

  } catch (error) {
    console.error(`💥 Error loading icon: ${iconName}`, error);
    return null;
  }
};
```

---

#### File 3: `frontend/src/components/agents/ProtectionBadge.tsx`
**Lines to modify**: None (component is correct)

**Verification Required**:
1. Confirm badge renders when `isProtected={true}`
2. Verify CSS classes apply correctly
3. Check tooltip positioning in sidebar context
4. Validate ARIA labels are announced

**Status**: Component implementation is CORRECT. Issue likely in:
- Data not reaching component (agent.visibility !== 'protected')
- CSS conflicts hiding badge
- Z-index issues with tooltip

**Debug Steps**:
```typescript
// Add to IsolatedRealAgentManager.tsx line 214
renderAgentBadges={(agent) => {
  // Debug logging
  console.log('🔒 Badge render:', {
    name: agent.name,
    tier: agent.tier,
    visibility: agent.visibility,
    shouldShowBadge: agent.visibility === 'protected'
  });

  return (
    <>
      <AgentTierBadge tier={agent.tier || 1} variant="compact" />
      {agent.visibility === 'protected' && (
        <ProtectionBadge
          isProtected={true}
          protectionReason="System agent - protected from modification"
        />
      )}
    </>
  );
}}
```

---

### 2.2 Data Flow Architecture

```
┌─────────────────────────────────────────────────────────────┐
│ 1. Component Mount                                           │
│    IsolatedRealAgentManager.tsx                             │
└────────────────────┬────────────────────────────────────────┘
                     │
                     │ useEffect([], ...)
                     ▼
┌─────────────────────────────────────────────────────────────┐
│ 2. API Request (Once)                                        │
│    GET /agents?tier=all                                     │
│    Returns: { agents: [19 agents with full data] }         │
└────────────────────┬────────────────────────────────────────┘
                     │
                     │ setAllAgents([...])
                     ▼
┌─────────────────────────────────────────────────────────────┐
│ 3. State Storage                                             │
│    allAgents: Agent[] (19 agents)                           │
│    currentTier: 'all' | '1' | '2'                           │
└────────────────────┬────────────────────────────────────────┘
                     │
                     │ useMemo(...)
                     ▼
┌─────────────────────────────────────────────────────────────┐
│ 4. Client-Side Filtering                                     │
│    displayedAgents = allAgents.filter(tier === currentTier) │
│                                                              │
│    Examples:                                                 │
│    - currentTier='1' → 9 agents                             │
│    - currentTier='2' → 10 agents                            │
│    - currentTier='all' → 19 agents                          │
└────────────────────┬────────────────────────────────────────┘
                     │
                     │ useMemo(...)
                     ▼
┌─────────────────────────────────────────────────────────────┐
│ 5. Tier Count Calculation                                    │
│    tierCounts = {                                            │
│      tier1: allAgents.filter(t===1).length  → 9             │
│      tier2: allAgents.filter(t===2).length  → 10            │
│      total: allAgents.length                → 19            │
│    }                                                         │
└────────────────────┬────────────────────────────────────────┘
                     │
                     │ Props
                     ▼
┌─────────────────────────────────────────────────────────────┐
│ 6. Render AgentListSidebar                                   │
│    <AgentListSidebar                                         │
│      agents={displayedAgents}      ← Filtered list          │
│      tierCounts={tierCounts}       ← Always full counts     │
│      currentTier={currentTier}                              │
│      onTierChange={setCurrentTier} ← No API call            │
│    />                                                        │
└────────────────────┬────────────────────────────────────────┘
                     │
                     │ For each agent
                     ▼
┌─────────────────────────────────────────────────────────────┐
│ 7. Render Agent Icon                                         │
│    <AgentIcon agent={{                                       │
│      icon: "MessageSquare",                                 │
│      icon_type: "svg",                                      │
│      tier: 1                                                 │
│    }} />                                                     │
│                                                              │
│    → getLucideIcon("MessageSquare")                         │
│    → Returns MessageSquare component                        │
│    → Renders with text-blue-600 (T1)                        │
└────────────────────┬────────────────────────────────────────┘
                     │
                     │ For each T2 protected agent
                     ▼
┌─────────────────────────────────────────────────────────────┐
│ 8. Render Protection Badge                                   │
│    {agent.visibility === 'protected' && (                   │
│      <ProtectionBadge                                        │
│        isProtected={true}                                    │
│        protectionReason="System agent"                      │
│      />                                                      │
│    )}                                                        │
│                                                              │
│    → Renders red lock badge                                 │
│    → Shows tooltip on hover                                 │
└─────────────────────────────────────────────────────────────┘
```

---

### 2.3 Component Interaction Diagram

```
┌────────────────────────────────────────────────────────────┐
│                  IsolatedRealAgentManager                   │
│                                                             │
│  State:                                                     │
│  - allAgents: Agent[]           (19 agents)                │
│  - currentTier: 'all'|'1'|'2'  (filter state)             │
│  - selectedAgentId: string      (detail panel)             │
│                                                             │
│  Computed:                                                  │
│  - displayedAgents = useMemo(filter by currentTier)       │
│  - tierCounts = useMemo(count from allAgents)             │
│                                                             │
│  Effects:                                                   │
│  - useEffect([], loadAllAgents)  ← Runs once               │
│                                                             │
└───────────────────────┬────────────────────────────────────┘
                        │
         ┌──────────────┼──────────────┐
         │              │              │
         ▼              ▼              ▼
┌────────────────┐ ┌─────────────┐ ┌──────────────┐
│ AgentListSidebar│ │AgentTierToggle│ │WorkingAgent  │
│                 │ │             │ │Profile       │
│ Props:          │ │ Props:      │ │              │
│ - agents: [9]   │ │ - tier1: 9  │ │ Props:       │
│   (filtered)    │ │ - tier2: 10 │ │ - agent: {...}│
│ - tierCounts    │ │ - total: 19 │ │              │
│ - currentTier   │ │ - current   │ └──────────────┘
│                 │ │             │
└────────┬────────┘ └─────────────┘
         │
         │ For each agent
         │
    ┌────┴────┬───────────┬──────────────┐
    ▼         ▼           ▼              ▼
┌────────┐ ┌──────────┐ ┌──────────┐ ┌──────────┐
│AgentIcon│ │AgentTier │ │Protection│ │Agent     │
│         │ │Badge     │ │Badge     │ │Metadata  │
│Props:   │ │          │ │          │ │          │
│- icon   │ │Props:    │ │Props:    │ │          │
│- type   │ │- tier    │ │- isProtect│ │          │
│- tier   │ │- variant │ │- reason  │ │          │
│         │ │          │ │          │ │          │
│Renders: │ │Renders:  │ │Renders:  │ │          │
│SVG icon │ │"T1"|"T2" │ │🔒 Protected│          │
│(blue/   │ │badge     │ │(red badge)│           │
│gray)    │ │          │ │          │ │          │
└─────────┘ └──────────┘ └──────────┘ └──────────┘
```

---

### 2.4 State Management Flow

```
User Action: Click "Tier 1" Toggle
         │
         ▼
    setCurrentTier('1')
         │
         ▼
    currentTier state updates
         │
         ▼
    useMemo re-executes:
    displayedAgents = allAgents.filter(tier === 1)
         │
         ▼
    Component re-renders:
    - AgentListSidebar receives new agents prop (9 agents)
    - tierCounts unchanged (still {9, 10, 19})
    - AgentTierToggle shows correct counts
         │
         ▼
    Render completes in < 50ms
    (No API calls, pure client-side filtering)
```

---

## 3. Implementation Plan

### 3.1 Phase 1: Tier Count Fix (1-2 hours)

**Step 1.1**: Modify state management
```typescript
// Add new state for all agents
const [allAgents, setAllAgents] = useState<Agent[]>([]);

// Keep existing displayedAgents logic
const [currentTier, setCurrentTier] = useState<'all' | '1' | '2'>('all');
```

**Step 1.2**: Update load function
```typescript
// Remove dependency on currentTier
useEffect(() => {
  loadAllAgents();
}, []); // ✅ Run once on mount

const loadAllAgents = async () => {
  setLoading(true);
  try {
    const response = await apiService.getAgents({ tier: 'all' });
    setAllAgents(response.agents || []);
  } catch (error) {
    console.error('Failed to load agents:', error);
    // Keep existing error handling
  } finally {
    setLoading(false);
  }
};
```

**Step 1.3**: Add client-side filtering
```typescript
const displayedAgents = useMemo(() => {
  if (currentTier === 'all') return allAgents;
  return allAgents.filter(a => a.tier === Number(currentTier));
}, [allAgents, currentTier]);
```

**Step 1.4**: Fix tier count calculation
```typescript
const tierCounts = useMemo(() => ({
  tier1: allAgents.filter(a => a.tier === 1).length,
  tier2: allAgents.filter(a => a.tier === 2).length,
  total: allAgents.length
}), [allAgents]);
```

**Step 1.5**: Update component props
```typescript
<AgentListSidebar
  agents={displayedAgents}  // ✅ Filtered list
  tierCounts={tierCounts}    // ✅ Full counts
  currentTier={currentTier}
  onTierChange={setCurrentTier}
  // ... other props
/>
```

**Validation**:
- [ ] Click T1 → shows (9), (10), (19)
- [ ] Click T2 → shows (9), (10), (19)
- [ ] Click All → shows (9), (10), (19)
- [ ] Tier switching is instant (< 50ms)

---

### 3.2 Phase 2: SVG Icon Fix (1 hour)

**Step 2.1**: Add debug logging
```typescript
const getLucideIcon = (iconName: string) => {
  if (process.env.NODE_ENV === 'development') {
    console.log('🔍 Icon lookup:', iconName);
  }

  const icon = (LucideIcons as any)[iconName];

  if (process.env.NODE_ENV === 'development') {
    console.log(icon ? '✅ Found' : '❌ Not found');
  }

  return icon;
};
```

**Step 2.2**: Test icon resolution in browser console
```javascript
// Open browser console on agent page
import * as LucideIcons from 'lucide-react';

// Test each icon
console.log('MessageSquare:', LucideIcons.MessageSquare);  // Should return function
console.log('Lightbulb:', LucideIcons.Lightbulb);          // Should return function
console.log('Settings:', LucideIcons.Settings);            // Should return function
```

**Step 2.3**: Verify icon_type field
```typescript
// Add logging to AgentIcon component render
console.log('AgentIcon render:', {
  name: agent.name,
  icon: agent.icon,           // e.g., "MessageSquare"
  icon_type: agent.icon_type, // Should be "svg"
  icon_emoji: agent.icon_emoji
});
```

**Step 2.4**: Fix icon lookup if needed
```typescript
// If icons aren't loading, check case sensitivity
const getLucideIcon = (iconName: string) => {
  // Try exact name first
  let icon = (LucideIcons as any)[iconName];
  if (icon) return icon;

  // Try PascalCase
  const pascalCase = iconName.charAt(0).toUpperCase() + iconName.slice(1);
  icon = (LucideIcons as any)[pascalCase];
  if (icon) return icon;

  // Try common variations
  const variations = [`${iconName}Icon`, `Lucide${iconName}`];
  for (const variant of variations) {
    icon = (LucideIcons as any)[variant];
    if (icon) return icon;
  }

  return null;
};
```

**Validation**:
- [ ] All 19 agents show SVG icons
- [ ] No emoji fallbacks visible
- [ ] T1 icons are blue
- [ ] T2 icons are gray
- [ ] No console warnings

---

### 3.3 Phase 3: Protection Badge Fix (30 minutes - 1 hour)

**Step 3.1**: Add debug logging to badge render
```typescript
renderAgentBadges={(agent) => {
  // Debug visibility field
  console.log('🔒 Protection badge check:', {
    name: agent.name,
    tier: agent.tier,
    visibility: agent.visibility,
    hasVisibilityField: 'visibility' in agent,
    visibilityType: typeof agent.visibility,
    shouldShow: agent.visibility === 'protected'
  });

  return (
    <>
      <AgentTierBadge tier={agent.tier || 1} variant="compact" />
      {agent.visibility === 'protected' && (
        <ProtectionBadge
          isProtected={true}
          protectionReason="System agent - protected from modification"
        />
      )}
    </>
  );
}}
```

**Step 3.2**: Verify API response includes visibility
```typescript
// In loadAllAgents function
const response = await apiService.getAgents({ tier: 'all' });
console.log('📡 API Response sample:', response.agents[0]);
// Should show: { ..., visibility: 'protected', ... }
```

**Step 3.3**: Check for CSS hiding issues
```typescript
// Inspect ProtectionBadge in browser DevTools
// Check if badge is rendered but hidden by CSS
// Common issues:
// - z-index conflicts
// - overflow: hidden on parent
// - display: none from parent
```

**Step 3.4**: Force badge visibility for testing
```typescript
// Temporarily show badge for ALL agents to test rendering
{true && (  // Force true instead of agent.visibility === 'protected'
  <ProtectionBadge
    isProtected={true}
    protectionReason="TEST - Badge rendering check"
  />
)}
```

**Validation**:
- [ ] 8+ T2 agents show lock badge
- [ ] Badge shows "Protected" text
- [ ] Hover shows tooltip
- [ ] Badge styling matches tier badge

---

### 3.4 Phase 4: Testing & Validation (1 hour)

**Step 4.1**: Manual browser testing
```
Test Checklist:
- [ ] Load agent manager page
- [ ] Verify all agents load (19 total)
- [ ] Verify tier counts show (9), (10), (19)
- [ ] Click Tier 1 toggle → see 9 agents, counts stay same
- [ ] Click Tier 2 toggle → see 10 agents, counts stay same
- [ ] Click All toggle → see 19 agents, counts stay same
- [ ] Verify all agents show SVG icons (no emojis)
- [ ] Verify T1 icons are blue
- [ ] Verify T2 icons are gray
- [ ] Verify T2 protected agents show lock badge
- [ ] Hover lock badge → see tooltip
- [ ] Test rapid tier switching → no lag
- [ ] Check browser console → no errors
```

**Step 4.2**: Update unit tests
```typescript
// Test tier count calculation
describe('IsolatedRealAgentManager', () => {
  it('should calculate tier counts from full agent list', () => {
    const { result } = renderHook(() => {
      const [allAgents] = useState(mockAgents); // 19 agents
      const tierCounts = useMemo(() => ({
        tier1: allAgents.filter(a => a.tier === 1).length,
        tier2: allAgents.filter(a => a.tier === 2).length,
        total: allAgents.length
      }), [allAgents]);
      return tierCounts;
    });

    expect(result.current.tier1).toBe(9);
    expect(result.current.tier2).toBe(10);
    expect(result.current.total).toBe(19);
  });

  it('should filter agents client-side', () => {
    // Test client-side filtering logic
  });
});

// Test icon resolution
describe('AgentIcon', () => {
  it('should resolve lucide-react icons correctly', () => {
    const icon = getLucideIcon('MessageSquare');
    expect(icon).toBeDefined();
    expect(typeof icon).toBe('function');
  });

  it('should apply tier-specific colors', () => {
    // Test tier color application
  });
});

// Test protection badge rendering
describe('ProtectionBadge', () => {
  it('should render for protected agents', () => {
    const { getByText } = render(
      <ProtectionBadge isProtected={true} />
    );
    expect(getByText('Protected')).toBeInTheDocument();
  });
});
```

**Step 4.3**: E2E testing
```typescript
// tests/e2e/tier-icon-protection-fix.spec.ts
test('Tier counts remain accurate when filtering', async ({ page }) => {
  await page.goto('/agents');

  // Check initial counts
  await expect(page.locator('[data-testid="tier1-count"]')).toHaveText('9');
  await expect(page.locator('[data-testid="tier2-count"]')).toHaveText('10');
  await expect(page.locator('[data-testid="total-count"]')).toHaveText('19');

  // Click Tier 1
  await page.click('[data-testid="tier1-toggle"]');
  await expect(page.locator('[data-testid="agent-list"] > div')).toHaveCount(9);

  // Counts should remain the same
  await expect(page.locator('[data-testid="tier1-count"]')).toHaveText('9');
  await expect(page.locator('[data-testid="tier2-count"]')).toHaveText('10');
  await expect(page.locator('[data-testid="total-count"]')).toHaveText('19');

  // Click Tier 2
  await page.click('[data-testid="tier2-toggle"]');
  await expect(page.locator('[data-testid="agent-list"] > div')).toHaveCount(10);

  // Counts still the same
  await expect(page.locator('[data-testid="tier1-count"]')).toHaveText('9');
  await expect(page.locator('[data-testid="tier2-count"]')).toHaveText('10');
  await expect(page.locator('[data-testid="total-count"]')).toHaveText('19');
});

test('SVG icons display correctly with tier colors', async ({ page }) => {
  await page.goto('/agents');

  // Check T1 agent icon
  const t1Icon = page.locator('[data-agent-tier="1"] svg').first();
  await expect(t1Icon).toHaveClass(/text-blue-600/);

  // Check T2 agent icon
  const t2Icon = page.locator('[data-agent-tier="2"] svg').first();
  await expect(t2Icon).toHaveClass(/text-gray-500/);

  // Verify no emoji fallbacks
  const emojiCount = await page.locator('span:has-text("💬")').count();
  expect(emojiCount).toBe(0);
});

test('Protection badges display for T2 protected agents', async ({ page }) => {
  await page.goto('/agents');

  // Click Tier 2 to show T2 agents
  await page.click('[data-testid="tier2-toggle"]');

  // Count protection badges
  const badges = page.locator('[data-testid="protection-badge"]');
  const count = await badges.count();

  expect(count).toBeGreaterThanOrEqual(8);

  // Verify badge content
  await expect(badges.first()).toContainText('Protected');

  // Hover to show tooltip
  await badges.first().hover();
  await expect(page.locator('[role="tooltip"]')).toBeVisible();
});
```

**Step 4.4**: Performance validation
```typescript
// Measure tier switching performance
test('Tier switching should be instant', async ({ page }) => {
  await page.goto('/agents');

  const measurements = [];

  for (let i = 0; i < 10; i++) {
    const start = Date.now();
    await page.click('[data-testid="tier1-toggle"]');
    await page.waitForSelector('[data-testid="agent-list"] > div');
    const end = Date.now();

    measurements.push(end - start);

    // Switch back
    await page.click('[data-testid="all-toggle"]');
  }

  const average = measurements.reduce((a, b) => a + b) / measurements.length;
  expect(average).toBeLessThan(50); // Should be < 50ms
});
```

---

## 4. Risk Assessment

### 4.1 High Risk Items

#### Risk 1: Icon Lookup Failure
**Probability**: Medium
**Impact**: High
**Description**: If lucide-react icon names don't match backend data, fallback to emoji will occur

**Mitigation**:
- Add comprehensive debug logging
- Test icon resolution in browser console first
- Create mapping table if names don't match
- Keep emoji fallback as safety net

**Contingency Plan**:
```typescript
// If icons still don't load, create explicit mapping
const ICON_NAME_MAP: Record<string, string> = {
  'MessageSquare': 'MessageSquare',  // Verify exact casing
  'Lightbulb': 'Lightbulb',
  // ... add all 19 agent icons
};

const getLucideIcon = (iconName: string) => {
  const mappedName = ICON_NAME_MAP[iconName] || iconName;
  return (LucideIcons as any)[mappedName];
};
```

---

#### Risk 2: State Management Complexity
**Probability**: Low
**Impact**: High
**Description**: Maintaining both `allAgents` and `displayedAgents` could cause sync issues

**Mitigation**:
- Use React.useMemo for derived state
- Single source of truth (allAgents)
- Clear data flow documented
- Comprehensive unit tests

**Monitoring**:
```typescript
// Add useEffect to log state changes
useEffect(() => {
  console.log('State sync check:', {
    allAgents: allAgents.length,
    displayedAgents: displayedAgents.length,
    currentTier,
    countsMatch: displayedAgents.length <= allAgents.length
  });
}, [allAgents, displayedAgents, currentTier]);
```

---

### 4.2 Medium Risk Items

#### Risk 3: Protection Badge CSS Conflicts
**Probability**: Medium
**Impact**: Medium
**Description**: Badge might render but be hidden by CSS (z-index, overflow, etc.)

**Mitigation**:
- Inspect rendered DOM in browser DevTools
- Verify badge is in correct z-index layer
- Check parent container doesn't have overflow: hidden
- Test in multiple browsers

**Debug Steps**:
```typescript
// Force badge to render for all agents temporarily
{true && <ProtectionBadge isProtected={true} />}

// If badge appears, issue is with conditional logic
// If badge still hidden, issue is with CSS
```

---

#### Risk 4: Performance Degradation
**Probability**: Low
**Impact**: Medium
**Description**: Client-side filtering of 19 agents might be slow on low-end devices

**Mitigation**:
- Use React.useMemo to memoize filtered results
- Profile performance in browser DevTools
- Test on low-end devices (throttled CPU)
- Monitor render times

**Performance Budget**:
- Initial load: < 500ms
- Tier switching: < 50ms
- Memory increase: < 5MB

**Monitoring**:
```typescript
useEffect(() => {
  const start = performance.now();
  // ... filtering logic
  const end = performance.now();

  if (end - start > 50) {
    console.warn('Slow filtering detected:', end - start, 'ms');
  }
}, [currentTier]);
```

---

### 4.3 Low Risk Items

#### Risk 5: TypeScript Type Errors
**Probability**: Low
**Impact**: Low
**Description**: Type definitions might not match runtime data

**Mitigation**:
- Agent interface already includes all required fields (verified)
- Run `tsc --noEmit` before committing
- Add runtime type validation in development

**Type Safety Check**:
```typescript
// Add runtime validation in development
if (process.env.NODE_ENV === 'development') {
  const validateAgent = (agent: any): agent is Agent => {
    return (
      typeof agent.name === 'string' &&
      (agent.tier === 1 || agent.tier === 2) &&
      (!agent.visibility || ['public', 'protected'].includes(agent.visibility)) &&
      (!agent.icon_type || ['svg', 'emoji'].includes(agent.icon_type))
    );
  };

  allAgents.forEach(agent => {
    if (!validateAgent(agent)) {
      console.error('Invalid agent data:', agent);
    }
  });
}
```

---

## 5. Acceptance Criteria

### 5.1 Functional Acceptance

#### AC-001: Tier Count Accuracy
- [ ] **Given** user is on agent manager page
- [ ] **When** page loads with "All" tier selected
- [ ] **Then** tier toggle shows "Tier 1 (9), Tier 2 (10), All (19)"

- [ ] **Given** user clicks "Tier 1" toggle
- [ ] **When** agent list filters to show 9 T1 agents
- [ ] **Then** tier toggle still shows "Tier 1 (9), Tier 2 (10), All (19)"

- [ ] **Given** user clicks "Tier 2" toggle
- [ ] **When** agent list filters to show 10 T2 agents
- [ ] **Then** tier toggle still shows "Tier 1 (9), Tier 2 (10), All (19)"

- [ ] **Given** user rapidly switches between tiers
- [ ] **When** clicking T1 → T2 → All → T1 in quick succession
- [ ] **Then** counts remain accurate and switching feels instant

---

#### AC-002: Protection Badge Visibility
- [ ] **Given** user filters to Tier 2 agents
- [ ] **When** viewing the agent list
- [ ] **Then** 8+ agents display red "Protected" lock badge

- [ ] **Given** user hovers over protection badge
- [ ] **When** mouse enters badge area
- [ ] **Then** tooltip displays "System agent - protected from modification"

- [ ] **Given** user views agent in detail panel
- [ ] **When** selecting a protected agent
- [ ] **Then** protection badge also visible in detail view

- [ ] **Given** screen reader user navigates to badge
- [ ] **When** badge receives focus
- [ ] **Then** screen reader announces "Protected agent - cannot be modified"

---

#### AC-003: SVG Icon Display
- [ ] **Given** user views agent list
- [ ] **When** page loads
- [ ] **Then** all 19 agents display SVG icons (no emojis visible)

- [ ] **Given** user views Tier 1 agents
- [ ] **When** filtering to T1
- [ ] **Then** all T1 agent icons are blue (#3B82F6)

- [ ] **Given** user views Tier 2 agents
- [ ] **When** filtering to T2
- [ ] **Then** all T2 agent icons are gray (#6B7280)

- [ ] **Given** user inspects browser console
- [ ] **When** page loads
- [ ] **Then** no "Failed to load icon" warnings appear

- [ ] **Given** user views icons across different viewport sizes
- [ ] **When** resizing browser from 320px to 2560px
- [ ] **Then** icons scale appropriately without layout shifts

---

### 5.2 Technical Acceptance

#### AC-004: State Management
- [ ] Component fetches all agents once on mount
- [ ] No additional API calls when switching tiers
- [ ] `allAgents` state contains 19 agents
- [ ] `displayedAgents` computed via useMemo
- [ ] `tierCounts` computed from `allAgents`, not `displayedAgents`

#### AC-005: Performance
- [ ] Initial agent load completes in < 500ms
- [ ] Tier switching completes in < 50ms
- [ ] Icon rendering causes zero layout shifts
- [ ] Memory usage increase < 5MB for agent data
- [ ] CPU usage < 10% during tier switching

#### AC-006: Code Quality
- [ ] Zero TypeScript compilation errors
- [ ] Zero ESLint warnings
- [ ] Unit test coverage > 80% for modified code
- [ ] E2E tests pass for all three issues
- [ ] No console errors or warnings in production build

#### AC-007: Accessibility
- [ ] All icons have aria-label attributes
- [ ] Protection badges have role="status"
- [ ] Tier toggles are keyboard navigable
- [ ] Screen readers announce tier counts correctly
- [ ] WCAG 2.1 AA compliance maintained

---

### 5.3 User Acceptance

#### UA-001: Visual Verification
- [ ] User confirms all agents show professional SVG icons
- [ ] User confirms tier counts look correct and helpful
- [ ] User confirms protected agents clearly identifiable
- [ ] User confirms no visual regressions in other areas
- [ ] User confirms dark mode appearance is correct

#### UA-002: Interaction Verification
- [ ] User confirms tier switching feels instant
- [ ] User confirms protection badge tooltips are helpful
- [ ] User confirms icon colors help differentiate tiers
- [ ] User confirms overall experience is improved

---

## 6. Testing Strategy

### 6.1 Unit Tests

**Location**: `frontend/src/tests/unit/`

**Tests to Create/Update**:

1. **IsolatedRealAgentManager.test.tsx**
```typescript
describe('Tier Count Calculation', () => {
  test('calculates counts from full agent list', () => {
    const mockAgents = [...Array(9)].map(() => ({ tier: 1 }))
      .concat([...Array(10)].map(() => ({ tier: 2 })));

    const counts = {
      tier1: mockAgents.filter(a => a.tier === 1).length,
      tier2: mockAgents.filter(a => a.tier === 2).length,
      total: mockAgents.length
    };

    expect(counts).toEqual({ tier1: 9, tier2: 10, total: 19 });
  });

  test('maintains counts when filtering', () => {
    const allAgents = createMockAgents(19);
    const filtered = allAgents.filter(a => a.tier === 1);

    const counts = {
      tier1: allAgents.filter(a => a.tier === 1).length,
      tier2: allAgents.filter(a => a.tier === 2).length
    };

    expect(filtered.length).toBe(9);
    expect(counts.tier1).toBe(9);
    expect(counts.tier2).toBe(10);
  });
});

describe('Client-Side Filtering', () => {
  test('filters to tier 1 correctly', () => {
    const agents = createMockAgents(19);
    const filtered = agents.filter(a => a.tier === 1);
    expect(filtered.length).toBe(9);
  });

  test('filters to tier 2 correctly', () => {
    const agents = createMockAgents(19);
    const filtered = agents.filter(a => a.tier === 2);
    expect(filtered.length).toBe(10);
  });

  test('shows all agents when filter is "all"', () => {
    const agents = createMockAgents(19);
    expect(agents.length).toBe(19);
  });
});
```

2. **AgentIcon.test.tsx**
```typescript
describe('Icon Resolution', () => {
  test('resolves MessageSquare icon', () => {
    const icon = getLucideIcon('MessageSquare');
    expect(icon).toBeDefined();
    expect(typeof icon).toBe('function');
  });

  test('resolves all T1 icons', () => {
    const t1Icons = ['MessageSquare', 'Lightbulb', 'Clock', 'Users',
                     'FileText', 'Link', 'Calendar', 'CheckSquare'];

    t1Icons.forEach(iconName => {
      const icon = getLucideIcon(iconName);
      expect(icon).toBeDefined();
    });
  });

  test('resolves all T2 icons', () => {
    const t2Icons = ['Settings', 'Wrench', 'Tool', 'Pencil',
                     'TrendingUp', 'Database', 'TestTube',
                     'ShieldCheck', 'Layout', 'BookOpen'];

    t2Icons.forEach(iconName => {
      const icon = getLucideIcon(iconName);
      expect(icon).toBeDefined();
    });
  });

  test('returns null for non-existent icon', () => {
    const icon = getLucideIcon('NonExistentIcon12345');
    expect(icon).toBeNull();
  });
});

describe('Icon Color by Tier', () => {
  test('applies blue color for tier 1', () => {
    const { container } = render(
      <AgentIcon agent={{ name: 'test', icon: 'MessageSquare',
                          icon_type: 'svg', tier: 1 }} />
    );
    const svg = container.querySelector('svg');
    expect(svg).toHaveClass('text-blue-600');
  });

  test('applies gray color for tier 2', () => {
    const { container } = render(
      <AgentIcon agent={{ name: 'test', icon: 'Settings',
                          icon_type: 'svg', tier: 2 }} />
    );
    const svg = container.querySelector('svg');
    expect(svg).toHaveClass('text-gray-500');
  });
});

describe('Fallback System', () => {
  test('renders SVG when icon_type is svg', () => {
    const { container } = render(
      <AgentIcon agent={{ name: 'test', icon: 'MessageSquare',
                          icon_type: 'svg', icon_emoji: '💬' }} />
    );
    expect(container.querySelector('svg')).toBeInTheDocument();
    expect(container.textContent).not.toContain('💬');
  });

  test('renders emoji when SVG fails', () => {
    const { container } = render(
      <AgentIcon agent={{ name: 'test', icon: 'InvalidIcon',
                          icon_type: 'svg', icon_emoji: '💬' }} />
    );
    expect(container.textContent).toContain('💬');
  });

  test('renders initials when no icon or emoji', () => {
    const { container } = render(
      <AgentIcon agent={{ name: 'personal-todos-agent' }} />
    );
    expect(container.textContent).toBe('PT');
  });
});
```

3. **ProtectionBadge.test.tsx**
```typescript
describe('Badge Rendering', () => {
  test('renders when isProtected is true', () => {
    const { getByText } = render(
      <ProtectionBadge isProtected={true} />
    );
    expect(getByText('Protected')).toBeInTheDocument();
  });

  test('does not render when isProtected is false', () => {
    const { container } = render(
      <ProtectionBadge isProtected={false} />
    );
    expect(container.firstChild).toBeNull();
  });

  test('shows tooltip on hover', async () => {
    const { getByText, getByRole } = render(
      <ProtectionBadge
        isProtected={true}
        protectionReason="System agent - protected"
      />
    );

    const badge = getByText('Protected');
    fireEvent.mouseEnter(badge);

    await waitFor(() => {
      expect(getByRole('tooltip')).toHaveTextContent('System agent - protected');
    });
  });

  test('has correct ARIA attributes', () => {
    const { getByLabelText } = render(
      <ProtectionBadge isProtected={true} />
    );

    const badge = getByLabelText('Protected agent - cannot be modified');
    expect(badge).toHaveAttribute('role', 'status');
  });
});
```

---

### 6.2 Integration Tests

**Location**: `tests/integration/`

**Tests to Create**:

```typescript
// tests/integration/tier-icon-protection.test.js
describe('Tier Count Integration', () => {
  test('API returns all agents and counts calculate correctly', async () => {
    const response = await apiService.getAgents({ tier: 'all' });
    const agents = response.agents;

    expect(agents.length).toBe(19);

    const t1Count = agents.filter(a => a.tier === 1).length;
    const t2Count = agents.filter(a => a.tier === 2).length;

    expect(t1Count).toBe(9);
    expect(t2Count).toBe(10);
  });

  test('Agent data includes icon fields', async () => {
    const response = await apiService.getAgents({ tier: 'all' });
    const agents = response.agents;

    agents.forEach(agent => {
      expect(agent).toHaveProperty('icon');
      expect(agent).toHaveProperty('icon_type');
      expect(['svg', 'emoji']).toContain(agent.icon_type);
    });
  });

  test('Protected agents include visibility field', async () => {
    const response = await apiService.getAgents({ tier: '2' });
    const protectedAgents = response.agents.filter(
      a => a.visibility === 'protected'
    );

    expect(protectedAgents.length).toBeGreaterThanOrEqual(8);
  });
});
```

---

### 6.3 E2E Tests

**Location**: `tests/e2e/`

**Test File**: `tier-icon-protection-fix-validation.spec.ts`

```typescript
import { test, expect } from '@playwright/test';

test.describe('Tier Count Fix Validation', () => {
  test('should display accurate tier counts regardless of filter', async ({ page }) => {
    await page.goto('/agents');

    // Wait for agents to load
    await page.waitForSelector('[data-testid="agent-list"]');

    // Check initial counts (All selected)
    await expect(page.locator('[data-testid="tier1-count"]')).toHaveText('9');
    await expect(page.locator('[data-testid="tier2-count"]')).toHaveText('10');
    await expect(page.locator('[data-testid="total-count"]')).toHaveText('19');

    // Click Tier 1
    await page.click('[data-testid="tier1-toggle"]');
    await page.waitForTimeout(100);

    // Verify 9 agents displayed
    const t1Agents = await page.locator('[data-testid="agent-list"] > div').count();
    expect(t1Agents).toBe(9);

    // Counts should still show totals
    await expect(page.locator('[data-testid="tier1-count"]')).toHaveText('9');
    await expect(page.locator('[data-testid="tier2-count"]')).toHaveText('10');
    await expect(page.locator('[data-testid="total-count"]')).toHaveText('19');

    // Click Tier 2
    await page.click('[data-testid="tier2-toggle"]');
    await page.waitForTimeout(100);

    // Verify 10 agents displayed
    const t2Agents = await page.locator('[data-testid="agent-list"] > div').count();
    expect(t2Agents).toBe(10);

    // Counts should still show totals
    await expect(page.locator('[data-testid="tier1-count"]')).toHaveText('9');
    await expect(page.locator('[data-testid="tier2-count"]')).toHaveText('10');
    await expect(page.locator('[data-testid="total-count"]')).toHaveText('19');
  });
});

test.describe('SVG Icon Display Validation', () => {
  test('should display SVG icons for all agents', async ({ page }) => {
    await page.goto('/agents');
    await page.waitForSelector('[data-testid="agent-list"]');

    // Count SVG icons
    const svgCount = await page.locator('[data-testid="agent-icon"] svg').count();
    expect(svgCount).toBeGreaterThanOrEqual(19);

    // Verify no emoji fallbacks
    const emojiText = await page.locator('text=/[💬💡⏰🔧⚙️]/').count();
    expect(emojiText).toBe(0);
  });

  test('should apply tier-specific colors', async ({ page }) => {
    await page.goto('/agents');

    // Click Tier 1 to isolate T1 agents
    await page.click('[data-testid="tier1-toggle"]');
    await page.waitForTimeout(100);

    // Check first T1 icon color
    const t1Icon = page.locator('[data-testid="agent-icon"] svg').first();
    await expect(t1Icon).toHaveClass(/text-blue-600/);

    // Click Tier 2 to isolate T2 agents
    await page.click('[data-testid="tier2-toggle"]');
    await page.waitForTimeout(100);

    // Check first T2 icon color
    const t2Icon = page.locator('[data-testid="agent-icon"] svg').first();
    await expect(t2Icon).toHaveClass(/text-gray-500/);
  });
});

test.describe('Protection Badge Validation', () => {
  test('should display protection badges for T2 protected agents', async ({ page }) => {
    await page.goto('/agents');

    // Click Tier 2 to show T2 agents
    await page.click('[data-testid="tier2-toggle"]');
    await page.waitForTimeout(100);

    // Count protection badges
    const badgeCount = await page.locator('[data-testid="protection-badge"]').count();
    expect(badgeCount).toBeGreaterThanOrEqual(8);

    // Verify badge content
    const firstBadge = page.locator('[data-testid="protection-badge"]').first();
    await expect(firstBadge).toContainText('Protected');

    // Verify lock icon present
    const lockIcon = firstBadge.locator('svg');
    await expect(lockIcon).toBeVisible();
  });

  test('should show tooltip on badge hover', async ({ page }) => {
    await page.goto('/agents');
    await page.click('[data-testid="tier2-toggle"]');

    const badge = page.locator('[data-testid="protection-badge"]').first();
    await badge.hover();

    // Tooltip should appear
    const tooltip = page.locator('[role="tooltip"]');
    await expect(tooltip).toBeVisible();
    await expect(tooltip).toContainText('protected');
  });
});

test.describe('Performance Validation', () => {
  test('tier switching should be instant', async ({ page }) => {
    await page.goto('/agents');
    await page.waitForSelector('[data-testid="agent-list"]');

    const measurements = [];

    for (let i = 0; i < 5; i++) {
      const start = Date.now();
      await page.click('[data-testid="tier1-toggle"]');
      await page.waitForSelector('[data-testid="agent-list"] > div');
      const end = Date.now();

      measurements.push(end - start);

      await page.click('[data-testid="all-toggle"]');
      await page.waitForTimeout(50);
    }

    const average = measurements.reduce((a, b) => a + b) / measurements.length;
    expect(average).toBeLessThan(100); // Should be instant
  });
});
```

---

### 6.4 Manual Testing Checklist

**Browser Testing**:
- [ ] Chrome (latest)
- [ ] Firefox (latest)
- [ ] Safari (latest)
- [ ] Edge (latest)

**Viewport Testing**:
- [ ] Mobile (320px - 768px)
- [ ] Tablet (768px - 1024px)
- [ ] Desktop (1024px - 1920px)
- [ ] Large desktop (1920px+)

**Color Mode Testing**:
- [ ] Light mode
- [ ] Dark mode

**Accessibility Testing**:
- [ ] Keyboard navigation
- [ ] Screen reader (NVDA/JAWS/VoiceOver)
- [ ] High contrast mode
- [ ] Zoom to 200%

**Functionality Testing**:
- [ ] Load agent page
- [ ] Verify tier counts (9, 10, 19)
- [ ] Click Tier 1 toggle
- [ ] Verify 9 agents displayed, counts stay (9, 10, 19)
- [ ] Click Tier 2 toggle
- [ ] Verify 10 agents displayed, counts stay (9, 10, 19)
- [ ] Click All toggle
- [ ] Verify 19 agents displayed, counts stay (9, 10, 19)
- [ ] Rapid tier switching (click rapidly between tiers)
- [ ] Verify no lag, no errors, counts stay accurate
- [ ] Verify all agents show SVG icons (no emojis)
- [ ] Verify T1 icons are blue
- [ ] Verify T2 icons are gray
- [ ] Filter to Tier 2
- [ ] Count protection badges (should be 8+)
- [ ] Hover over badge → verify tooltip shows
- [ ] Check browser console → no errors

---

## 7. Deployment Plan

### 7.1 Pre-Deployment

1. **Code Review**
   - [ ] All changes reviewed by team member
   - [ ] TypeScript compilation passes
   - [ ] ESLint passes with zero warnings
   - [ ] Unit tests pass (100% of modified code)
   - [ ] Integration tests pass
   - [ ] E2E tests pass

2. **Documentation Updates**
   - [ ] Update component documentation
   - [ ] Update API integration docs (if needed)
   - [ ] Add troubleshooting section
   - [ ] Update changelog

3. **Performance Validation**
   - [ ] Run performance profiling
   - [ ] Verify memory usage acceptable
   - [ ] Check bundle size impact
   - [ ] Test on low-end devices

---

### 7.2 Deployment Steps

1. **Staging Deployment**
   ```bash
   # Build production bundle
   npm run build

   # Run final test suite
   npm run test
   npm run test:e2e

   # Deploy to staging
   npm run deploy:staging
   ```

2. **Staging Validation**
   - [ ] Manual smoke test on staging
   - [ ] Verify tier counts accurate
   - [ ] Verify SVG icons display
   - [ ] Verify protection badges show
   - [ ] Check browser console for errors
   - [ ] Test across multiple browsers

3. **Production Deployment**
   ```bash
   # Deploy to production
   npm run deploy:production

   # Monitor deployment
   # Watch for errors in logs
   # Monitor performance metrics
   ```

4. **Post-Deployment Validation**
   - [ ] Verify production site loads
   - [ ] Quick smoke test (tier counts, icons, badges)
   - [ ] Monitor error logs for 15 minutes
   - [ ] Check analytics for user impact

---

### 7.3 Rollback Plan

**If critical issues occur**:

1. **Immediate Rollback**
   ```bash
   # Rollback to previous deployment
   npm run deploy:rollback
   ```

2. **Investigation**
   - Review error logs
   - Reproduce issue locally
   - Identify root cause

3. **Fix and Redeploy**
   - Apply hotfix
   - Test thoroughly
   - Redeploy with fix

**Rollback Triggers**:
- Tier counts showing incorrectly in production
- Icons completely broken (all showing emojis or initials)
- JavaScript errors preventing page load
- Performance degradation (> 2 second load times)
- Accessibility regressions

---

## 8. Monitoring and Observability

### 8.1 Metrics to Track

**Performance Metrics**:
- Initial page load time
- Tier switching response time
- Memory usage
- Component render time

**Error Metrics**:
- JavaScript errors
- Failed icon lookups
- API request failures
- Console warnings

**User Behavior Metrics**:
- Tier toggle usage frequency
- Agent selection patterns
- Protection badge hover rate
- Session duration

---

### 8.2 Logging Strategy

**Development Logging**:
```typescript
if (process.env.NODE_ENV === 'development') {
  console.log('🔍 Icon lookup:', iconName, found ? '✅' : '❌');
  console.log('📊 Tier counts:', tierCounts);
  console.log('🔒 Protection badge:', { name, visibility, show });
}
```

**Production Logging**:
```typescript
// Only log errors and warnings in production
if (!icon) {
  console.warn('Icon lookup failed:', iconName);
}

if (error) {
  console.error('Agent load failed:', error);
  // Send to error tracking service (Sentry, etc.)
}
```

**Performance Logging**:
```typescript
// Track slow operations
const start = performance.now();
// ... operation
const duration = performance.now() - start;

if (duration > 50) {
  console.warn('Slow operation:', { operation: 'tierSwitch', duration });
}
```

---

## 9. Future Enhancements

### 9.1 Short-Term Improvements

1. **Icon Caching**
   - Cache resolved lucide-react icons
   - Reduce lookup overhead
   - Implementation: 1 hour

2. **Virtualized List**
   - Implement virtual scrolling for agent list
   - Improves performance for large agent counts
   - Implementation: 2-4 hours

3. **Animation Polish**
   - Add smooth transitions for tier switching
   - Fade in/out effects for agent list
   - Implementation: 1-2 hours

---

### 9.2 Long-Term Enhancements

1. **Custom Icon System**
   - Allow agents to define custom SVG icons
   - Icon picker UI for agent configuration
   - Implementation: 1-2 weeks

2. **Advanced Filtering**
   - Filter by protection status
   - Search within filtered tier
   - Multiple filter combinations
   - Implementation: 1 week

3. **Analytics Dashboard**
   - Track tier usage patterns
   - Agent popularity metrics
   - Protection badge interaction stats
   - Implementation: 2-3 weeks

---

## 10. Appendices

### Appendix A: Icon Reference

**Tier 1 Icons** (User-Facing - Blue):
| Agent | Icon | Lucide Name |
|-------|------|-------------|
| agent-feedback-agent | 💬 | MessageSquare |
| agent-ideas-agent | 💡 | Lightbulb |
| follow-ups-agent | ⏰ | Clock |
| get-to-know-you-agent | 👥 | Users |
| meeting-next-steps-agent | 📄 | FileText |
| link-logger-agent | 🔗 | Link |
| meeting-prep-agent | 📅 | Calendar |
| personal-todos-agent | ✅ | CheckSquare |
| (9 total) | | |

**Tier 2 Icons** (System - Gray):
| Agent | Icon | Lucide Name |
|-------|------|-------------|
| meta-agent | ⚙️ | Settings |
| agent-architect-agent | 🔧 | Wrench |
| skills-maintenance-agent | 🛠️ | Tool |
| agent-maintenance-agent | ✏️ | Pencil |
| learning-optimizer-agent | 📈 | TrendingUp |
| dynamic-page-testing-agent | 🧪 | TestTube |
| page-builder-agent | 📐 | Layout |
| page-verification-agent | 📖 | BookOpen |
| system-architect-agent | 🗄️ | Database |
| (+ security agent) | 🛡️ | ShieldCheck |
| (10 total) | | |

---

### Appendix B: Protected Agents

**Tier 2 Protected Agents** (8+ agents):
1. agent-architect-agent (visibility: protected)
2. agent-maintenance-agent (visibility: protected)
3. skills-architect-agent (visibility: protected)
4. skills-maintenance-agent (visibility: protected)
5. learning-optimizer-agent (visibility: protected)
6. system-architect-agent (visibility: protected)
7. meta-agent (visibility: protected)
8. meta-update-agent (visibility: protected)

**Protection Reason**: "System agent - protected from modification"

---

### Appendix C: Component Hierarchy

```
IsolatedRealAgentManager
├── State: allAgents, currentTier, selectedAgentId
├── Computed: displayedAgents, tierCounts
│
├── AgentListSidebar
│   ├── Props: agents (displayedAgents), tierCounts
│   │
│   ├── AgentTierToggle
│   │   ├── Props: tierCounts, currentTier, onTierChange
│   │   └── Displays: "Tier 1 (9), Tier 2 (10), All (19)"
│   │
│   └── For Each Agent:
│       ├── AgentIcon
│       │   ├── Props: icon, icon_type, tier
│       │   └── Renders: SVG with tier color
│       │
│       ├── AgentTierBadge
│       │   ├── Props: tier, variant
│       │   └── Renders: "T1" or "T2" badge
│       │
│       └── ProtectionBadge (if protected)
│           ├── Props: isProtected, protectionReason
│           └── Renders: 🔒 Protected badge with tooltip
│
└── WorkingAgentProfile
    ├── Props: selectedAgent
    └── Displays: Agent details
```

---

### Appendix D: API Contract

**Endpoint**: `GET /agents`

**Query Parameters**:
- `tier`: 'all' | '1' | '2' (default: 'all')

**Response**:
```json
{
  "success": true,
  "agents": [
    {
      "id": "uuid",
      "name": "agent-feedback-agent",
      "display_name": "Agent Feedback Agent",
      "tier": 1,
      "visibility": "public",
      "icon": "MessageSquare",
      "icon_type": "svg",
      "icon_emoji": "💬",
      // ... other fields
    },
    {
      "id": "uuid",
      "name": "meta-agent",
      "display_name": "Meta Agent",
      "tier": 2,
      "visibility": "protected",
      "icon": "Settings",
      "icon_type": "svg",
      "icon_emoji": "⚙️",
      // ... other fields
    }
  ],
  "total": 19
}
```

**Expected Counts**:
- Tier 1: 9 agents
- Tier 2: 10 agents
- Total: 19 agents
- Protected (T2): 8+ agents

---

### Appendix E: Browser Compatibility Matrix

| Feature | Chrome 90+ | Firefox 88+ | Safari 14+ | Edge 90+ |
|---------|------------|-------------|------------|----------|
| Client-side filtering | ✅ | ✅ | ✅ | ✅ |
| SVG icons | ✅ | ✅ | ✅ | ✅ |
| Protection badges | ✅ | ✅ | ✅ | ✅ |
| Tooltips | ✅ | ✅ | ✅ | ✅ |
| useMemo | ✅ | ✅ | ✅ | ✅ |
| CSS Grid | ✅ | ✅ | ✅ | ✅ |
| Dark mode | ✅ | ✅ | ✅ | ✅ |

---

## Document History

| Version | Date | Author | Changes |
|---------|------|--------|---------|
| 1.0.0 | 2025-10-20 | SPARC Specification Agent | Initial specification created |

---

## Approval Signatures

**Specification Approved By**:
- [ ] Technical Lead: _______________  Date: _______
- [ ] Product Owner: _______________  Date: _______
- [ ] QA Lead: _______________  Date: _______

**Implementation Ready**: [ ] YES  [ ] NO

**Estimated Timeline**: 4-6 hours

**Priority**: HIGH (User-facing bugs impacting UX)

---

**END OF SPECIFICATION**
