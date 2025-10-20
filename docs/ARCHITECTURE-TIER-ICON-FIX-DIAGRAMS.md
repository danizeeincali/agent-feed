# Architecture Diagrams: Client-Side Filtering & Icon Fixes

Visual reference for the architectural changes.

---

## 1. State Management Architecture

### Before: Multiple Sources of Truth
```
┌─────────────────────────────────────────────────────────────┐
│                      Component State                         │
├─────────────────────────────────────────────────────────────┤
│  [agents]        ← Filtered list (changes on tier switch)   │
│  [currentTier]   ← Current filter ('1', '2', 'all')         │
├─────────────────────────────────────────────────────────────┤
│                     Computed Values                          │
├─────────────────────────────────────────────────────────────┤
│  tierCounts = {                                             │
│    tier1: agents.filter(tier === 1).length,  ← WRONG       │
│    tier2: agents.filter(tier === 2).length,  ← WRONG       │
│    total: agents.length                       ← WRONG       │
│  }                                                          │
└─────────────────────────────────────────────────────────────┘

Problem: tierCounts calculated from filtered data
```

### After: Single Source of Truth
```
┌─────────────────────────────────────────────────────────────┐
│                      Component State                         │
├─────────────────────────────────────────────────────────────┤
│  [allAgents]     ← Full dataset (never filtered)            │
│  [currentTier]   ← Current filter ('1', '2', 'all')         │
├─────────────────────────────────────────────────────────────┤
│                     Computed Values                          │
├─────────────────────────────────────────────────────────────┤
│  displayedAgents = useMemo(() => {                          │
│    if (currentTier === 'all') return allAgents;             │
│    return allAgents.filter(tier === currentTier);           │
│  }, [allAgents, currentTier]);                              │
│                                                              │
│  tierCounts = useMemo(() => ({                              │
│    tier1: allAgents.filter(tier === 1).length,  ← CORRECT  │
│    tier2: allAgents.filter(tier === 2).length,  ← CORRECT  │
│    total: allAgents.length                       ← CORRECT  │
│  }), [allAgents]);                                          │
└─────────────────────────────────────────────────────────────┘

Solution: tierCounts always calculated from full dataset
```

---

## 2. API Call Flow

### Before: Server-Side Filtering (3+ API Calls)
```
┌──────────┐     ┌───────────┐     ┌─────────┐     ┌──────────┐
│  Mount   │────▶│ API Call  │────▶│ Server  │────▶│ Response │
│          │     │ tier=all  │     │ Filter  │     │ 19 agents│
└──────────┘     └───────────┘     └─────────┘     └──────────┘
                                                           │
                                                           ▼
┌──────────┐     ┌───────────┐     ┌─────────┐     ┌──────────┐
│ Click T1 │────▶│ API Call  │────▶│ Server  │────▶│ Response │
│          │     │ tier=1    │     │ Filter  │     │ 9 agents │
└──────────┘     └───────────┘     └─────────┘     └──────────┘
                                                           │
                                                           ▼
┌──────────┐     ┌───────────┐     ┌─────────┐     ┌──────────┐
│ Click T2 │────▶│ API Call  │────▶│ Server  │────▶│ Response │
│          │     │ tier=2    │     │ Filter  │     │ 10 agents│
└──────────┘     └───────────┘     └─────────┘     └──────────┘

Total: 3 API calls, 3 database queries, 600ms latency
```

### After: Client-Side Filtering (1 API Call)
```
┌──────────┐     ┌───────────┐     ┌─────────┐     ┌──────────┐
│  Mount   │────▶│ API Call  │────▶│ Server  │────▶│ Response │
│          │     │ tier=all  │     │ Query   │     │ 19 agents│
└──────────┘     └───────────┘     └─────────┘     └────┬─────┘
                                                          │
                      ┌───────────────────────────────────┘
                      ▼
              ┌───────────────┐
              │  allAgents    │
              │  [19 agents]  │
              └───────┬───────┘
                      │
        ┌─────────────┼─────────────┐
        ▼             ▼             ▼
┌──────────┐   ┌──────────┐   ┌──────────┐
│ Click T1 │   │ Click T2 │   │ Click All│
│          │   │          │   │          │
└────┬─────┘   └────┬─────┘   └────┬─────┘
     │              │              │
     ▼              ▼              ▼
┌──────────┐   ┌──────────┐   ┌──────────┐
│  Filter  │   │  Filter  │   │  Return  │
│ in-memory│   │ in-memory│   │ allAgents│
│ 9 agents │   │ 10 agents│   │ 19 agents│
└──────────┘   └──────────┘   └──────────┘

Total: 1 API call, 1 database query, <1ms filtering
```

---

## 3. Data Flow Timeline

### Before: Network-Dependent Filtering
```
Time (ms)  │ Event                      │ Network  │ UI State
───────────┼────────────────────────────┼──────────┼──────────────────
     0     │ Mount component            │          │ Loading...
   100     │ API request sent (tier=all)│ ───────▶ │ Loading...
   300     │ API response received      │ ◀─────── │ 19 agents shown
           │ tierCounts = (19, 0, 19)   │          │ ❌ WRONG COUNTS
───────────┼────────────────────────────┼──────────┼──────────────────
  1000     │ User clicks "Tier 1"       │          │ Loading...
  1100     │ API request sent (tier=1)  │ ───────▶ │ Spinner
  1300     │ API response received      │ ◀─────── │ 9 agents shown
           │ tierCounts = (9, 0, 9)     │          │ ❌ WRONG COUNTS
───────────┼────────────────────────────┼──────────┼──────────────────
  2000     │ User clicks "Tier 2"       │          │ Loading...
  2100     │ API request sent (tier=2)  │ ───────▶ │ Spinner
  2300     │ API response received      │ ◀─────── │ 10 agents shown
           │ tierCounts = (0, 10, 10)   │          │ ❌ WRONG COUNTS
───────────┴────────────────────────────┴──────────┴──────────────────

Total time: 2300ms
API calls: 3
Correct counts: 0/3 (0%)
```

### After: Instant Client-Side Filtering
```
Time (ms)  │ Event                      │ Network  │ UI State
───────────┼────────────────────────────┼──────────┼──────────────────
     0     │ Mount component            │          │ Loading...
   100     │ API request sent (tier=all)│ ───────▶ │ Loading...
   300     │ API response received      │ ◀─────── │ 19 agents shown
           │ tierCounts = (9, 10, 19)   │          │ ✅ CORRECT
───────────┼────────────────────────────┼──────────┼──────────────────
  1000     │ User clicks "Tier 1"       │          │ 9 agents shown
           │ In-memory filter (<1ms)    │          │ ✅ CORRECT
           │ tierCounts = (9, 10, 19)   │          │ (instant)
───────────┼────────────────────────────┼──────────┼──────────────────
  2000     │ User clicks "Tier 2"       │          │ 10 agents shown
           │ In-memory filter (<1ms)    │          │ ✅ CORRECT
           │ tierCounts = (9, 10, 19)   │          │ (instant)
───────────┴────────────────────────────┴──────────┴──────────────────

Total time: 300ms (first load only)
API calls: 1
Correct counts: 3/3 (100%)
```

---

## 4. Component Architecture

### Component Hierarchy
```
IsolatedRealAgentManager
├── State
│   ├── [allAgents]         ← Full dataset (19 agents)
│   ├── [currentTier]       ← Filter state ('1', '2', 'all')
│   ├── [loading]
│   ├── [error]
│   └── [selectedAgentId]
│
├── Computed (useMemo)
│   ├── displayedAgents     ← Filtered view (9, 10, or 19 agents)
│   └── tierCounts          ← Always accurate (9, 10, 19)
│
├── Effects
│   ├── Mount effect        ← Fetch all agents ONCE
│   │   └── loadAgents()
│   └── [REMOVED] Tier change effect
│
└── Render
    ├── AgentListSidebar
    │   ├── agents={displayedAgents}    ← Filtered list
    │   ├── tierCounts={tierCounts}     ← Accurate counts
    │   └── renderAgentBadges
    │       ├── AgentTierBadge
    │       └── ProtectionBadge
    │
    └── WorkingAgentProfile
        └── selectedAgent
```

---

## 5. Icon Resolution Flow

### Three-Level Fallback System
```
┌─────────────────────────────────────────────────────────────┐
│                    AgentIcon Component                       │
└────────────────────────┬────────────────────────────────────┘
                         │
                         ▼
          ┌──────────────────────────────┐
          │ Has icon + icon_type='svg'?  │
          └───────┬──────────────────┬───┘
                  │ YES              │ NO
                  ▼                  │
        ┌─────────────────┐          │
        │ getLucideIcon() │          │
        └────────┬────────┘          │
                 │                   │
         ┌───────┴────────┐          │
         │ Icon found?    │          │
         └───┬────────┬───┘          │
             │ YES    │ NO           │
             ▼        │              │
     ┌──────────┐    │              │
     │ Render   │    │              │
     │   SVG    │◀───┘              │
     └──────────┘                   │
                                    │
                 ┌──────────────────┘
                 │
                 ▼
          ┌──────────────────┐
          │ Has icon_emoji?  │
          └───────┬──────┬───┘
                  │ YES  │ NO
                  ▼      │
          ┌──────────┐   │
          │ Render   │   │
          │  Emoji   │◀──┘
          └──────────┘
                         │
                         ▼
                 ┌──────────────┐
                 │   Generate   │
                 │   Initials   │
                 └───────┬──────┘
                         │
                         ▼
                 ┌──────────────┐
                 │    Render    │
                 │   Initials   │
                 └──────────────┘
```

### Debug Logging Points
```
🔍 Icon lookup: "MessageSquare"
    │
    ├─▶ Try: MessageSquare
    │   └─▶ ✅ Found
    │
    ├─▶ 🎨 AgentIcon rendering:
    │      {name, icon, icon_type, tier}
    │
    └─▶ ✅ Rendering SVG icon
```

---

## 6. Memory Layout

### Before: Variable Memory Usage
```
┌─────────────────────────────────────────┐
│          Component Memory               │
├─────────────────────────────────────────┤
│  agents: Array(19)        ~10KB         │
│    ↓ Filter to Tier 1                   │
│  agents: Array(9)         ~5KB          │
│    ↓ Filter to Tier 2                   │
│  agents: Array(10)        ~5KB          │
└─────────────────────────────────────────┘

Memory: 5-10KB (variable)
Churn: High (array replaced on filter)
```

### After: Stable Memory Usage
```
┌─────────────────────────────────────────┐
│          Component Memory               │
├─────────────────────────────────────────┤
│  allAgents: Array(19)     ~10KB         │  ← Never changes
│                                         │
│  displayedAgents:                       │  ← Computed reference
│    (reference to filtered allAgents)    │
│                                         │
│  tierCounts: Object       ~0.1KB        │  ← Memoized
└─────────────────────────────────────────┘

Memory: 10KB (stable)
Churn: Low (array never replaced)
```

---

## 7. Performance Comparison

### API Calls per Session
```
Before (Server-Side):
┌───────┬───────┬───────┬───────┐
│ Mount │  T1   │  T2   │  All  │
├───────┼───────┼───────┼───────┤
│  1    │  1    │  1    │  1    │
└───────┴───────┴───────┴───────┘
Total: 4 API calls

After (Client-Side):
┌───────┬───────┬───────┬───────┐
│ Mount │  T1   │  T2   │  All  │
├───────┼───────┼───────┼───────┤
│  1    │  0    │  0    │  0    │
└───────┴───────┴───────┴───────┘
Total: 1 API call (75% reduction)
```

### Latency Comparison
```
Before:
Mount:  ████████ 200ms
T1:     ████████ 200ms
T2:     ████████ 200ms
Total:  ████████████████████████ 600ms

After:
Mount:  ████████ 200ms
T1:     ▌ <1ms
T2:     ▌ <1ms
Total:  ████████ 200ms (67% faster)
```

---

## 8. Rollback Architecture

### Feature Flag Pattern
```
┌─────────────────────────────────────────────────────────────┐
│                    Environment Config                        │
├─────────────────────────────────────────────────────────────┤
│  VITE_CLIENT_SIDE_FILTERING = true | false                  │
└──────────────────────┬──────────────────────────────────────┘
                       │
                       ▼
            ┌──────────────────────┐
            │  Feature Flag Check  │
            └─────────┬────────────┘
                      │
          ┌───────────┴────────────┐
          │ true                   │ false
          ▼                        ▼
┌─────────────────────┐   ┌─────────────────────┐
│  Client-Side Mode   │   │  Server-Side Mode   │
├─────────────────────┤   ├─────────────────────┤
│ ✅ 1 API call       │   │ ❌ 3+ API calls     │
│ ✅ Instant filter   │   │ ❌ 200ms latency    │
│ ✅ Correct counts   │   │ ❌ Wrong counts     │
└─────────────────────┘   └─────────────────────┘

Rollback: Toggle flag, redeploy (<5 min)
```

---

## 9. Testing Strategy Diagram

### Test Coverage Layers
```
┌─────────────────────────────────────────────────────────────┐
│                         E2E Tests                            │
│  ✓ Full user flows                                          │
│  ✓ Visual regression                                        │
│  ✓ Performance benchmarks                                   │
└──────────────────────┬──────────────────────────────────────┘
                       │
┌──────────────────────▼──────────────────────────────────────┐
│                    Integration Tests                         │
│  ✓ Component interactions                                   │
│  ✓ API service mocks                                        │
│  ✓ State management                                         │
└──────────────────────┬──────────────────────────────────────┘
                       │
┌──────────────────────▼──────────────────────────────────────┐
│                       Unit Tests                             │
│  ✓ Pure functions                                           │
│  ✓ Computed values                                          │
│  ✓ Memoization                                              │
└─────────────────────────────────────────────────────────────┘
```

---

**References**:
- Full Documentation: `/workspaces/agent-feed/docs/ARCHITECTURE-TIER-ICON-FIX.md`
- Quick Reference: `/workspaces/agent-feed/docs/ARCHITECTURE-TIER-ICON-FIX-SUMMARY.md`
