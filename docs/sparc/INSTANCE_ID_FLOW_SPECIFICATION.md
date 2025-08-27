# SPARC Phase 1: Specification - Instance ID Flow Debug

## Problem Statement

**Critical Issue**: Frontend terminal connections are receiving 'undefined' instead of actual instance IDs like 'claude-2643' when establishing terminal connections.

**Symptoms Observed**:
- Instance creation returns valid IDs (e.g., `claude-2643`)
- Terminal connection attempts pass 'undefined' as instance ID
- SSE/polling connections fail due to invalid instance ID

## Requirements Analysis

### Functional Requirements

#### FR1: Instance Creation ID Propagation
- **Description**: When an instance is created, the response must contain a valid instance ID
- **Input**: POST /api/claude/instances with instance configuration
- **Expected Output**: `{ success: true, instanceId: "claude-XXXX", ... }`
- **Current State**: ✅ Working correctly - returns valid IDs like "claude-2643"

#### FR2: Instance ID State Management
- **Description**: Frontend must maintain instance ID throughout component lifecycle
- **Components Involved**: 
  - `ClaudeInstanceManager.tsx` - Main instance management
  - `useHTTPSSE.ts` - Connection management hook
- **Current State**: ❌ BROKEN - ID becomes 'undefined' during terminal connection

#### FR3: Terminal Connection ID Forwarding
- **Description**: When connecting to terminal, correct instance ID must be passed
- **Flow**: User clicks instance → `connectSSE(instance.id)` → SSE connection with ID
- **Current State**: ❌ BROKEN - 'undefined' passed instead of actual ID

#### FR4: SSE/Polling Connection Validation
- **Description**: Backend must receive and validate instance ID for terminal connections
- **Expected Behavior**: Reject connections with invalid/undefined instance IDs
- **Current State**: ❌ Backend receives 'undefined' and cannot establish connection

### Non-Functional Requirements

#### NFR1: Data Flow Integrity
- Instance ID must remain consistent from creation through terminal connection
- No state mutation should cause ID loss

#### NFR2: Error Handling
- Clear error messages when instance ID is invalid
- Graceful fallback when ID propagation fails

#### NFR3: Debug Visibility
- Enhanced logging for ID flow tracking
- Console output for debugging ID propagation issues

## Current Code Analysis

### ClaudeInstanceManager.tsx Issues Identified

#### Issue 1: Connection State Management (Lines 256-263)
```typescript
// ISSUE: connectSSE called with data.instanceId, but connectionState tracking unclear
setTimeout(() => {
  try {
    console.log('Starting terminal connection for new instance:', data.instanceId);
    connectSSE(data.instanceId);  // ← data.instanceId could be undefined
    console.log('Started SSE streaming for instance:', data.instanceId);
  } catch (sseError) {
    console.log('SSE failed, falling back to polling:', sseError);
    startPolling(data.instanceId);  // ← Same issue here
  }
}, 500);
```

#### Issue 2: Instance Selection Flow (Lines 389-415)
```typescript
onClick={() => {
  console.log('Selecting instance:', instance.id);  // ← instance.id is valid here
  
  // Disconnect from current instance first
  if (selectedInstance && selectedInstance !== instance.id) {
    console.log('Disconnecting from previous instance:', selectedInstance);
    disconnectFromInstance();
  }
  
  setSelectedInstance(instance.id);  // ← Valid ID set
  
  // Start streaming for the selected instance if running
  if (instance.status === 'running') {
    setTimeout(() => {
      try {
        console.log('Starting SSE connection for selected instance:', instance.id);
        connectSSE(instance.id);  // ← Should be valid, but hook might lose it
      } catch (sseError) {
        console.log('SSE failed for selected instance, falling back to polling:', sseError);
        startPolling(instance.id);
      }
    }, 100);
  }
}}
```

### useHTTPSSE.ts Issues Identified

#### Issue 3: ConnectionState Instance ID Storage (Lines 232-271)
```typescript
const connectSSE = useCallback((instanceId: string) => {
  console.log('🔄 Attempting SSE connection for instance:', instanceId);  // ← Log shows if ID is valid
  
  // ... connection setup ...
  
  connectionState.current = {
    isSSE: true,
    isPolling: false,
    instanceId,  // ← Stored here, but might be undefined
    connectionType: 'sse'
  };
```

#### Issue 4: Terminal Input Emission (Lines 86-89)
```typescript
case 'terminal:input':
  endpoint = `/api/claude/instances/${connectionState.current.instanceId}/terminal/input`;
  payload = { input: data.input };
  break;
```
**CRITICAL**: If `connectionState.current.instanceId` is undefined, the endpoint becomes malformed.

## Root Cause Hypothesis

Based on code analysis, the most likely root causes are:

### Primary Hypothesis: Async State Race Condition
1. **Instance creation** succeeds and returns valid ID
2. **State update** (setSelectedInstance) happens asynchronously  
3. **connectSSE call** happens before state fully propagates
4. **Hook receives undefined** instead of the actual instance ID

### Secondary Hypothesis: Backend Response Structure
1. Backend returns different response structure than expected
2. Frontend expects `data.instanceId` but backend returns different key
3. Destructuring/access pattern fails silently

### Tertiary Hypothesis: Connection State Mutation
1. connectionState.current gets overwritten somewhere
2. Cleanup operations reset instanceId to null
3. Timing issues between disconnect and connect operations

## Edge Cases to Consider

### EC1: Multiple Rapid Instance Selection
- User rapidly clicks between instances
- Previous disconnect operations interfere with new connections
- State conflicts between multiple connectSSE calls

### EC2: Instance Status Changes During Connection
- Instance status changes from 'running' to 'stopped' during connection attempt
- Connection established but instance becomes unavailable
- Stale instance ID references

### EC3: Backend Instance Cleanup
- Backend terminates instance after frontend initiates connection
- Frontend maintains stale instance reference
- SSE/polling attempts to connect to non-existent instance

## Acceptance Criteria

### AC1: Valid Instance ID Propagation
```
GIVEN a user creates a new Claude instance
WHEN the creation response is received
THEN the instance ID must be a non-empty string matching pattern "claude-\\d+"
AND the ID must be stored correctly in component state
```

### AC2: Terminal Connection Success
```
GIVEN a valid instance ID exists in component state
WHEN user initiates terminal connection
THEN connectSSE/startPolling must be called with the correct instance ID
AND the backend must receive a valid instance ID in the connection request
AND the connection must be established successfully
```

### AC3: Error Handling for Invalid IDs
```
GIVEN an invalid or undefined instance ID
WHEN terminal connection is attempted
THEN a clear error message must be displayed
AND the connection attempt must fail gracefully
AND the user must be informed of the issue
```

### AC4: Debug Logging Completeness
```
GIVEN any instance ID operation
WHEN the operation occurs
THEN relevant console logs must show:
  - The actual instance ID value (not just variable names)
  - The operation being performed
  - Success/failure status
  - Any error conditions
```

## Next Steps (SPARC Phase 2: Pseudocode)

1. **Create detailed pseudocode** for ID tracking algorithm
2. **Design state management flow** with explicit ID validation
3. **Define error handling patterns** for ID propagation failures
4. **Specify logging requirements** for debugging ID flow issues

---

*This specification document defines the requirements for fixing the instance ID flow bug in the Claude Instance Manager frontend application.*