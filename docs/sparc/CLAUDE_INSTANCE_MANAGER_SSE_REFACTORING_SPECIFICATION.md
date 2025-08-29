# SPARC SPECIFICATION: ClaudeInstanceManagerModern.tsx SSE Refactoring

## Executive Summary
The `ClaudeInstanceManagerModern.tsx` component has critical ReferenceError issues due to mixing SSE (`addHandler`/`removeHandler`) and WebSocket (`subscribe`/`unsubscribe`) APIs. This specification documents complete refactoring requirements to remove SSE dependencies and use pure WebSocket functionality.

## Problem Analysis

### Current Issues
1. **ReferenceError**: `addHandler` is not defined - lines 117, 124
2. **Mixed API Usage**: Component uses both SSE and WebSocket functions inconsistently
3. **Import Mismatch**: Uses `useWebSocketTerminal` but calls SSE functions
4. **Legacy Code**: Contains remnants of SSE implementation that needs removal

### Affected Lines
- Line 117: `addHandler('error', (error) => {`
- Line 124: `addHandler('disconnect', (data) => {`
- Line 139: `unsubscribe('disconnect');`
- Lines 61-95: Mixed subscribe/unsubscribe calls with addHandler calls

## Current Architecture Analysis

### Component Dependencies
```typescript
// CURRENT IMPORTS (ClaudeInstanceManagerModern.tsx)
import { useWebSocketTerminal } from '../hooks/useWebSocketTerminal';

// HOOK PROVIDES
const { 
  socket,
  isConnected,
  lastMessage,
  connectionError: wsConnectionError,
  connectToTerminal, 
  disconnectFromTerminal,
  send,
  subscribe,        // ✅ WebSocket function
  unsubscribe       // ✅ WebSocket function
} = useWebSocketTerminal({ url: apiUrl.replace('http://', 'ws://') });
```

### SSE vs WebSocket API Comparison

| Function | SSE (useSSEConnectionSingleton) | WebSocket (useWebSocketTerminal) | Status |
|----------|--------------------------------|----------------------------------|--------|
| Event Subscription | `addHandler(event, handler)` | `subscribe(event, handler)` | ✅ Available |
| Event Unsubscription | `removeHandler(event, handler)` | `unsubscribe(event, handler?)` | ✅ Available |
| Connection | `connectToInstance(instanceId)` | `connectToTerminal(terminalId)` | ✅ Available |
| Disconnection | `disconnectFromInstance()` | `disconnectFromTerminal()` | ✅ Available |
| Send Data | `sendCommand(instanceId, command)` | `send(data)` | ✅ Available |
| Connection State | `isConnected` | `isConnected` | ✅ Available |
| Error State | `connectionState.lastError` | `connectionError` | ✅ Available |

## Required Refactoring

### 1. Remove SSE Function Calls

**Replace:**
```typescript
// Lines 117-121 - REMOVE
addHandler('error', (error) => {
  console.error('SSE Connection error:', error);
  setError(error.message || error.error || 'Connection error');
  setConnectionType('Connection Error');
});

// Lines 124-130 - REMOVE  
addHandler('disconnect', (data) => {
  console.log('🔌 SSE Disconnected:', data);
  setConnectionType('Disconnected');
  if (data.instanceId === selectedInstance) {
    setCurrentInstanceId(null);
  }
});
```

**With WebSocket equivalents:**
```typescript
// Use existing subscribe calls (already present in lines 61-67)
subscribe('error', (error) => {
  console.error('WebSocket Connection error:', error);
  setError(error.message || error.error || 'Connection error');
  setConnectionType('Connection Error');
});

subscribe('disconnect', (data) => {
  console.log('🔌 WebSocket Disconnected:', data);
  setConnectionType('Disconnected');
  if (data.terminalId === selectedInstance) {
    setCurrentInstanceId(null);
  }
});
```

### 2. Update Event Handler Management

**Current mixed approach:**
```typescript
const setupEventHandlers = () => {
  // WebSocket handlers (KEEP)
  subscribe('connect', handler);
  subscribe('terminal:output', handler);
  
  // SSE handlers (REMOVE)  
  addHandler('error', handler);
  addHandler('disconnect', handler);
};

const cleanupEventHandlers = () => {
  // WebSocket cleanup (KEEP)
  unsubscribe('connect');
  
  // Missing WebSocket cleanup (ADD)
  unsubscribe('error');
  unsubscribe('disconnect');
};
```

**Refactored approach:**
```typescript
const setupEventHandlers = () => {
  // All WebSocket handlers
  subscribe('connect', handleConnect);
  subscribe('terminal:output', handleOutput);
  subscribe('message', handleMessage);
  subscribe('terminal:status', handleStatus);
  subscribe('error', handleError);
  subscribe('disconnect', handleDisconnect);
};

const cleanupEventHandlers = () => {
  // Cleanup all WebSocket handlers
  unsubscribe('connect');
  unsubscribe('terminal:output');
  unsubscribe('message');
  unsubscribe('terminal:status');
  unsubscribe('error');
  unsubscribe('disconnect');
};
```

### 3. Standardize Data Structures

**Current inconsistent data handling:**
```typescript
// Line 72: terminalId vs instanceId confusion
setOutput(prev => ({
  ...prev,
  [data.terminalId]: (prev[data.terminalId] || '') + data.output
}));

// Line 106: instanceId vs terminalId
if (data.instanceId === selectedInstance) {
  // ...
}
```

**Standardized approach:**
```typescript
// Always use terminalId for WebSocket operations
setOutput(prev => ({
  ...prev,
  [data.terminalId]: (prev[data.terminalId] || '') + data.output
}));

// Update all references to use terminalId consistently
if (data.terminalId === selectedInstance) {
  // ...
}
```

## Event Handler Migration Map

### Connection Events
```typescript
// OLD SSE
addHandler('connect', (data) => {
  setConnectionType(`Connected via WebSocket${data.terminalId ? ` (${data.terminalId.slice(0,8)})` : ''}`);
});

// NEW WebSocket (already exists)
subscribe('connect', (data) => {
  setConnectionType(data.connectionType === 'websocket' ? 
    `Connected via WebSocket${data.terminalId ? ` (${data.terminalId.slice(0,8)})` : ''}` : 
    'Connected via WebSocket');
});
```

### Error Events
```typescript
// OLD SSE
addHandler('error', (error) => {
  console.error('SSE Connection error:', error);
  setError(error.message || error.error || 'Connection error');
  setConnectionType('Connection Error');
});

// NEW WebSocket
subscribe('error', (error) => {
  console.error('WebSocket Connection error:', error);
  setError(error.message || error.error || 'Connection error');
  setConnectionType('Connection Error');
});
```

### Disconnect Events
```typescript
// OLD SSE
addHandler('disconnect', (data) => {
  console.log('🔌 SSE Disconnected:', data);
  setConnectionType('Disconnected');
  if (data.instanceId === selectedInstance) {
    setCurrentInstanceId(null);
  }
});

// NEW WebSocket
subscribe('disconnect', (data) => {
  console.log('🔌 WebSocket Disconnected:', data);
  setConnectionType('Disconnected');
  if (data.terminalId === selectedInstance) {
    setCurrentInstanceId(null);
  }
});
```

## File Structure Analysis

### Current Files Using addHandler/removeHandler
1. `/workspaces/agent-feed/frontend/src/components/ClaudeInstanceManagerModern.tsx` ❌ (BROKEN)
2. `/workspaces/agent-feed/frontend/src/components/ClaudeInstanceManagerModernFixed.tsx` ✅ (WORKING)
3. `/workspaces/agent-feed/frontend/src/hooks/useSSEConnectionSingleton.ts` (SSE implementation)

### Working WebSocket Implementation Reference
The `ClaudeInstanceManagerModernFixed.tsx` shows the correct pattern:
```typescript
const { 
  addHandler,
  removeHandler,
  // ... other SSE functions
} = useSSEConnectionSingleton(apiUrl);

// Uses addHandler/removeHandler consistently
addHandler('terminal:output', handleOutput);
addHandler('message', handleOutput);
addHandler('instance:status', handleStatus);
```

## Implementation Strategy

### Phase 1: Remove SSE Function Calls ✅
- Remove lines 117-121 (addHandler 'error')
- Remove lines 124-130 (addHandler 'disconnect')

### Phase 2: Add WebSocket Event Handlers
- Add subscribe('error', handleError) 
- Add subscribe('disconnect', handleDisconnect)
- Update cleanupEventHandlers to unsubscribe from all events

### Phase 3: Standardize Data Handling
- Replace all instanceId references with terminalId
- Update data.instanceId to data.terminalId
- Ensure consistent terminalId usage throughout

### Phase 4: Testing & Validation
- Verify all event handlers work correctly
- Test connection/disconnection flows
- Validate terminal output streaming
- Confirm error handling works

## Risk Assessment

### High Risk
- ❌ **ReferenceError**: Component completely broken
- ❌ **Event Handler Duplication**: May cause memory leaks
- ❌ **Data Inconsistency**: Mixed instanceId/terminalId usage

### Medium Risk  
- ⚠️ **API Endpoint Mismatches**: Different endpoints for SSE vs WebSocket
- ⚠️ **State Management**: Output buffering may differ

### Low Risk
- ✅ **UI Impact**: Minimal, mostly internal API changes
- ✅ **Performance**: WebSocket is generally more efficient than SSE

## Success Criteria
1. No ReferenceError exceptions
2. All event handlers working correctly
3. Terminal output streaming functional
4. Connection status updates working
5. Error handling operational
6. Clean component unmounting (no memory leaks)

## Next Steps
1. Apply the refactoring changes to remove SSE function calls
2. Add missing WebSocket event handlers
3. Standardize terminalId usage throughout
4. Test all functionality end-to-end
5. Remove any remaining SSE imports if unused

## Detailed Function Replacement Map

### Complete API Migration Table

| Current (Broken) | Replacement (Working) | Location | Status |
|------------------|----------------------|----------|---------|
| `addHandler('error', fn)` | `subscribe('error', fn)` | Line 117 | ❌ Remove |
| `addHandler('disconnect', fn)` | `subscribe('disconnect', fn)` | Line 124 | ❌ Remove |
| `unsubscribe('disconnect')` | `unsubscribe('disconnect')` | Line 139 | ✅ Keep |
| `disconnectFromInstance()` | `disconnectFromTerminal()` | Line 350 | ❌ Fix |
| `data.instanceId` | `data.terminalId` | Multiple | ❌ Fix |

### Event Handler Consolidation

**BEFORE (Broken Pattern):**
```typescript
const setupEventHandlers = () => {
  // WebSocket handlers (Lines 61-95)
  subscribe('connect', handler);
  subscribe('terminal:output', handler);  
  subscribe('message', handler);
  subscribe('terminal:status', handler);
  
  // SSE handlers (Lines 117-130) - BROKEN
  addHandler('error', handler);
  addHandler('disconnect', handler);
};
```

**AFTER (Fixed Pattern):**
```typescript
const setupEventHandlers = () => {
  // All WebSocket handlers - consistent API
  subscribe('connect', handleConnect);
  subscribe('terminal:output', handleOutput);
  subscribe('message', handleMessage);
  subscribe('terminal:status', handleStatus);
  subscribe('error', handleError);         // FIXED
  subscribe('disconnect', handleDisconnect); // FIXED
};
```

### Data Structure Standardization

**Current Inconsistencies:**
```typescript
// Line 64: setCurrentInstanceId(data.terminalId || null);
// Line 72: [data.terminalId]: output
// Line 106: data.instanceId === selectedInstance  // INCONSISTENT
// Line 127: data.instanceId === selectedInstance  // INCONSISTENT
```

**Standardized Approach:**
```typescript
// Always use terminalId for WebSocket operations
const handleConnect = (data) => {
  setCurrentInstanceId(data.terminalId || null);
  setConnectionType(`Connected via WebSocket${data.terminalId ? ` (${data.terminalId.slice(0,8)})` : ''}`);
};

const handleStatus = (data) => {
  if (data.terminalId === selectedInstance) {  // CONSISTENT
    const timestamp = new Date().toLocaleTimeString();
    const statusMessage = `[${timestamp}] Status changed to: ${data.status}\n`;
    setOutput(prev => ({
      ...prev,
      [data.terminalId]: (prev[data.terminalId] || '') + statusMessage
    }));
  }
};
```

## Working vs Broken Implementation Analysis

### ClaudeInstanceManagerModern.tsx (BROKEN)
```typescript
// PROBLEM: Mixed APIs
import { useWebSocketTerminal } from '../hooks/useWebSocketTerminal';

const { subscribe, unsubscribe } = useWebSocketTerminal();

// Uses WebSocket functions ✅
subscribe('connect', handler);
subscribe('terminal:output', handler);

// Uses SSE functions ❌ (NOT AVAILABLE)
addHandler('error', handler);
addHandler('disconnect', handler);
```

### ClaudeInstanceManagerModernFixed.tsx (WORKING)  
```typescript
// SOLUTION: Consistent SSE API
import { useSSEConnectionSingleton } from '../hooks/useSSEConnectionSingleton';

const { addHandler, removeHandler } = useSSEConnectionSingleton();

// Uses SSE functions consistently ✅
addHandler('terminal:output', handleOutput);
addHandler('message', handleOutput);
addHandler('error', handleError);
addHandler('disconnect', handleDisconnect);
```

### Recommended Fix Strategy

**Option 1: Switch to SSE (Like Fixed Component)**
```typescript
// Replace WebSocket hook with SSE hook
import { useSSEConnectionSingleton } from '../hooks/useSSEConnectionSingleton';

const { 
  addHandler,
  removeHandler,
  connectToInstance,
  disconnectFromInstance,
  sendCommand,
  isConnected,
  connectionState
} = useSSEConnectionSingleton(apiUrl);
```

**Option 2: Stick with WebSocket (Pure WebSocket)**
```typescript
// Keep WebSocket hook, fix function calls
import { useWebSocketTerminal } from '../hooks/useWebSocketTerminal';

// Replace all addHandler/removeHandler with subscribe/unsubscribe
// Update all instanceId references to terminalId  
// Use connectToTerminal instead of connectToInstance
```

## Implementation Roadmap

### Step 1: Choose Migration Strategy
- **Recommended**: Option 2 (Pure WebSocket) for consistency
- Reason: Component already imports WebSocket hook and has working WebSocket handlers

### Step 2: Function Replacements (5 minutes)
```typescript
// Line 117: REMOVE
// addHandler('error', (error) => {

// ADD to setupEventHandlers around line 95:
subscribe('error', (error) => {
  console.error('WebSocket Connection error:', error);
  setError(error.message || error.error || 'Connection error');
  setConnectionType('Connection Error');
});

// Line 124: REMOVE  
// addHandler('disconnect', (data) => {

// ADD to setupEventHandlers:
subscribe('disconnect', (data) => {
  console.log('🔌 WebSocket Disconnected:', data);
  setConnectionType('Disconnected');  
  if (data.terminalId === selectedInstance) {
    setCurrentInstanceId(null);
  }
});
```

### Step 3: Update Cleanup (2 minutes)
```typescript
const cleanupEventHandlers = () => {
  unsubscribe('connect');
  unsubscribe('terminal:output');
  unsubscribe('message'); 
  unsubscribe('terminal:status');
  unsubscribe('error');      // ADD
  unsubscribe('disconnect'); // ADD (already exists)
};
```

### Step 4: Fix Inconsistent References (3 minutes)
```typescript
// Line 106: Change instanceId to terminalId
if (data.terminalId === selectedInstance) {
  const timestamp = new Date().toLocaleTimeString();
  const statusMessage = `[${timestamp}] Status changed to: ${data.status}\n`;
  setOutput(prev => ({
    ...prev,
    [data.terminalId]: (prev[data.terminalId] || '') + statusMessage  
  }));
}

// Line 127: Change instanceId to terminalId  
if (data.terminalId === selectedInstance) {
  setCurrentInstanceId(null);
}
```

### Step 5: Test & Validate (10 minutes)
- Load component in browser
- Verify no ReferenceError exceptions
- Test terminal creation and connection
- Validate error and disconnect handling
- Check output streaming works

## Related Files to Monitor
- `/workspaces/agent-feed/frontend/src/hooks/useWebSocketTerminal.ts` - Primary WebSocket implementation
- `/workspaces/agent-feed/frontend/src/components/ClaudeInstanceManagerModernFixed.tsx` - Working reference implementation  
- `/workspaces/agent-feed/frontend/src/hooks/useSSEConnectionSingleton.ts` - SSE alternative (if switching)
- Terminal server endpoints for API consistency

---
**Priority**: CRITICAL - Component is currently broken and unusable
**Estimated Effort**: 20 minutes for complete refactoring and testing
**Dependencies**: None - all required WebSocket functions are available  
**Risk Level**: LOW - Simple function replacements with existing working handlers