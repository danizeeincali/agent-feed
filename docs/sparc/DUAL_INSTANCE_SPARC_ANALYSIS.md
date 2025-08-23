# SPARC Analysis: Dual Instance State Inconsistencies

## Phase 1: Specification Analysis - COMPLETED

### Issues Identified

1. **Stats Mismatch Problem**
   - UI shows running instance with PID but stats show "Running: 0, Stopped: 1"
   - Root cause: In `useInstanceManager.ts` line 170-177, stats calculation has logic error

2. **Terminal Navigation Error**
   - "Instance Not Found" error when clicking terminal from running instance  
   - Root cause: Instance ID generation inconsistency between `useInstanceManager` and routing

3. **Instance ID Generation Issues**
   - Line 160: `id: processInfo.pid?.toString() || 'unknown'`
   - PID-based IDs cause conflicts when process restarts
   - Timestamp changes on view toggle due to re-instantiation

4. **Data Flow Problems**
   - ProcessManager returns ProcessInfo with no ID field
   - useInstanceManager transforms ProcessInfo to InstanceInfo
   - Inconsistent ID generation leads to routing failures

### Key Discovery Points

- **ProcessManager.ts**: Returns ProcessInfo without ID, uses PID as identifier
- **useInstanceManager.ts**: Transforms ProcessInfo to InstanceInfo, creates ID from PID
- **DualInstancePage.tsx**: Expects consistent instance IDs for terminal routing
- **Stats calculation**: Logic error in status mapping

## Phase 2: Pseudocode Mapping - IN PROGRESS

### Current State Flow

```
ProcessManager.ts:
  ProcessInfo {
    pid: number | null
    name: string  
    status: 'running' | 'stopped' | 'restarting' | 'error'
    startTime: Date | null
    autoRestartEnabled: boolean
    autoRestartHours: number
  }

useInstanceManager.ts:
  InstanceInfo extends ProcessInfo {
    id: string              // PROBLEM: Generated from PID
    type: string
    createdAt: Date
  }
  
  instances = useMemo(() => {
    instanceInfo = {
      ...processInfo,
      id: processInfo.pid?.toString() || 'unknown',  // INCONSISTENT
      type: 'claude-instance',
      createdAt: processInfo.startTime || new Date()
    }
    return [instanceInfo]
  })

  stats = useMemo(() => {
    status = processInfo?.status || 'stopped'
    return {
      running: status === 'running' ? 1 : 0,     // LOGIC ERROR 
      stopped: status === 'stopped' ? 1 : 0,
      error: status === 'error' ? 1 : 0,
      total: processInfo ? 1 : 0
    }
  })
```

### Problem Identification

1. **ID Generation**: PID-based IDs change on restart
2. **Stats Logic**: No validation of processInfo existence
3. **State Synchronization**: Multiple sources of truth for instance state
4. **Terminal Routing**: Expected consistent ID for navigation

## Phase 3: Architecture Design - PENDING

### Proposed Solution Architecture

```
Consistent Instance Management:
1. Generate stable UUID for instance lifecycle
2. Separate PID (process identifier) from instance ID (UI identifier)  
3. Centralized state management for instance data
4. Proper validation of processInfo before stats calculation
```

## Phase 4: Refinement Tasks - PENDING

1. Fix useInstanceManager ID generation to use stable UUID
2. Correct stats calculation logic with proper validation
3. Update terminal navigation to use consistent IDs
4. Add state synchronization validation
5. Implement TDD tests for state consistency

## Phase 5: Completion Validation - PENDING

1. Test stats display matches instance state
2. Validate terminal navigation works consistently  
3. Verify timestamp stability across view changes
4. Confirm instance operations work with stable IDs