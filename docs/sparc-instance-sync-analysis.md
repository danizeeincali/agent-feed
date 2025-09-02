# SPARC Analysis: Claude Instance Synchronization Issue

## Phase 1: SPECIFICATION ✅

### Problem Statement
Frontend displays incorrect Claude instance ID (claude-3876) while backend has the correct running instance (claude-7800), causing connection failures.

### Requirements Analysis
1. **Primary Requirement**: Frontend must display only currently running backend instances
2. **Synchronization**: Real-time sync between frontend instance list and backend state
3. **Error Handling**: Graceful handling of instance mismatches
4. **State Consistency**: Single source of truth for instance state

### Root Cause Analysis
Based on backend logs and code analysis:

1. **Backend State**: Successfully manages multiple instances (claude-7800, claude-6548, claude-3876, claude-3336)
2. **Instance Creation**: Backend creates instances with correct IDs and broadcasts them
3. **Frontend Cache**: Frontend may be caching stale instance data
4. **API Endpoints**: `/api/claude/instances` returns current backend state
5. **SSE Broadcasting**: Backend broadcasts instance status changes correctly

### Edge Cases Identified
- Multiple rapid instance creations/deletions
- Network connectivity issues during instance sync
- Browser refresh with stale cached data
- Instance ID format validation failures

## Phase 2: PSEUDOCODE ✅

### Synchronization Algorithm Design

```
ALGORITHM: Instance Synchronization Fix
INPUT: Frontend component mount/instance operations
OUTPUT: Synchronized instance state

1. INITIALIZATION:
   - Clear any cached instance data on component mount
   - Fetch fresh instances from backend `/api/claude/instances`
   - Validate instance ID formats (must match /^claude-\d+$/)
   - Initialize real-time sync mechanisms

2. REAL-TIME SYNC:
   - Subscribe to SSE instance status broadcasts
   - Listen for 'instance:status' events
   - Update local state immediately on backend changes
   - Validate incoming instance data before state updates

3. STATE MANAGEMENT:
   - Use backend as single source of truth
   - Remove client-side instance creation prediction
   - Implement pessimistic UI updates (wait for backend confirmation)
   - Add instance existence validation before operations

4. ERROR RECOVERY:
   - Detect instance mismatch errors
   - Auto-refresh instance list on connection failures
   - Fallback to polling if SSE fails
   - Display meaningful error messages to users

5. CACHE INVALIDATION:
   - Clear stale instance data on errors
   - Refresh instance list after operations
   - Implement cache TTL for instance data
   - Add manual refresh capability
```

### Data Flow Architecture

```
Backend Instance State → API Endpoint → Frontend Fetch → Local State Update
                     ↓
                 SSE Broadcast → Event Listener → Real-time State Sync
                     ↓
                 Error Detection → Cache Clear → Fresh Data Fetch
```

## Phase 3: ARCHITECTURE (In Progress)

### Component Interaction Plan

```
┌─────────────────┐    ┌─────────────────┐    ┌─────────────────┐
│   Backend       │    │   API Layer     │    │   Frontend      │
│   Instance      │◄──►│   /instances    │◄──►│   Component     │
│   Manager       │    │   SSE Events    │    │   State         │
└─────────────────┘    └─────────────────┘    └─────────────────┘
         ▲                        ▲                        ▲
         │                        │                        │
         ▼                        ▼                        ▼
┌─────────────────┐    ┌─────────────────┐    ┌─────────────────┐
│   PTY Process   │    │   HTTP/SSE      │    │   UI Update     │
│   Management    │    │   Connection    │    │   Handlers      │
└─────────────────┘    └─────────────────┘    └─────────────────┘
```

### Key Components to Fix

1. **ClaudeInstanceManager.tsx**: Main component with instance state
2. **useHTTPSSE.ts**: Hook managing SSE connections
3. **SimpleLauncher.tsx**: Instance creation interface
4. **Backend Instance API**: `/api/claude/instances` endpoint

### Integration Points

- **Instance Fetching**: `fetchInstances()` function needs enhancement
- **SSE Event Handling**: `setupEventHandlers()` requires fixes
- **State Updates**: React state management needs synchronization
- **Error Handling**: Connection errors need proper recovery

## Next Steps

1. **REFINEMENT Phase**: Implement TDD solution with test coverage
2. **COMPLETION Phase**: Validate with comprehensive regression tests
3. **Deployment**: Ensure production-ready instance synchronization

## Technical Debt Identified

- Multiple instance manager components (need consolidation)
- Inconsistent error handling patterns
- Missing instance validation in several places
- Potential race conditions in instance operations