# SPARC Specification: SSE Status Broadcasting & Terminal Command Processing

## Mission Statement

Complete the SSE event flow for instance status updates and terminal command processing to eliminate the gap where:
1. Backend updates instance status but frontend UI remains stuck in "starting" state
2. Terminal echoes user input but fails to process commands and return responses

## Critical Analysis

### Issue 1: Instance Status Update Gap

**Current Flow (Broken)**:
```
Backend: Instance created ("starting") → Process starts → Status = "running" → ❌ NO SSE broadcast → Frontend stuck in "starting"
```

**Expected Flow (Fixed)**:
```
Backend: Instance created ("starting") → Process starts → Status = "running" → ✅ SSE broadcast → Frontend updates UI
```

**Root Cause**: Backend at line 170-172 in `/workspaces/agent-feed/simple-backend.js` updates instance status but **does not broadcast the status change via SSE**.

### Issue 2: Terminal Command Processing Chain Break

**Current Flow (Broken)**:
```
User Input → Backend Receives → Echo via SSE → ❌ Command processing incomplete → No response
```

**Expected Flow (Fixed)**:
```
User Input → Backend Receives → Echo via SSE → Process Command → Generate Response → Broadcast Response → Frontend Displays
```

**Root Cause**: Terminal processing at lines 405-448 and 450-493 handles echo correctly but command processing flow is incomplete.

## Technical Specifications

### 1. Instance Status Broadcasting Specification

#### 1.1 Backend Modifications

**File**: `/workspaces/agent-feed/simple-backend.js`

**Requirements**:
- Add SSE status broadcasting when instance status changes from "starting" to "running"
- Implement `broadcastInstanceStatus` function
- Ensure all instance status changes trigger broadcasts

**Implementation**:

```javascript
// Broadcast instance status change to all SSE connections
function broadcastInstanceStatus(instanceId, newStatus) {
  const statusMessage = {
    type: 'instance:status',
    instanceId,
    status: newStatus,
    timestamp: new Date().toISOString()
  };
  
  // Broadcast to instance-specific connections
  broadcastToInstance(instanceId, statusMessage);
  
  // Broadcast to all connections for general status updates
  const allConnections = Array.from(sseConnections.values()).flat();
  const data = `data: ${JSON.stringify(statusMessage)}\n\n`;
  
  allConnections.forEach((connection, index) => {
    try {
      connection.write(data);
    } catch (error) {
      console.error(`❌ Error broadcasting status to connection ${index}:`, error);
    }
  });
  
  console.log(`📡 Broadcasted status change for instance ${instanceId}: ${newStatus}`);
}
```

**Integration Points**:
- Line 170-172: Add status broadcast after setting `instance.status = 'running'`
- New instances: Add broadcast when status changes
- Instance termination: Add broadcast when status changes to "stopped"

#### 1.2 Frontend Status Event Handling

**File**: `/workspaces/agent-feed/frontend/src/hooks/useHTTPSSE.ts`

**Requirements**:
- Add `instance:status` event handler
- Update instance status in local state
- Trigger UI re-render

**Implementation**:

```javascript
// Add to SSE event handling (line 232+)
else if (data.type === 'instance:status') {
  // Handle instance status update events
  triggerHandlers('instance:status', {
    instanceId: data.instanceId,
    status: data.status,
    timestamp: data.timestamp
  });
}
```

**File**: `/workspaces/agent-feed/frontend/src/components/ClaudeInstanceManager.tsx`

**Requirements**:
- Listen for `instance:status` events
- Update instances array when status changes
- Refresh UI immediately

**Implementation**:

```javascript
// Add to setupEventHandlers() function (line 58+)
on('instance:status', (data) => {
  console.log('Instance status update received:', data);
  
  // Update instance status in local state
  setInstances(prev => 
    prev.map(instance => 
      instance.id === data.instanceId 
        ? { ...instance, status: data.status }
        : instance
    )
  );
});
```

### 2. Terminal Command Processing Completion Specification

#### 2.1 Backend Terminal Processing Enhancement

**File**: `/workspaces/agent-feed/simple-backend.js`

**Requirements**:
- Ensure command processing generates appropriate responses
- Broadcast both input echo AND command response
- Handle command not found scenarios properly

**Current Implementation Analysis**:
Lines 405-448 and 450-493 show terminal input handlers that:
- ✅ Process input via `processTerminalInput()`
- ✅ Broadcast input echo
- ✅ Broadcast command response
- ✅ Handle empty responses with prompt

**Issue**: Implementation appears complete. Potential issue may be in SSE connection handling or frontend event processing.

#### 2.2 Frontend Terminal Response Handling

**File**: `/workspaces/agent-feed/frontend/src/hooks/useHTTPSSE.ts`

**Requirements**:
- Ensure both echo and response events are handled
- Distinguish between input echo and command response
- Handle multiple message types correctly

**Current Implementation Analysis**:
Lines 245-263 show message handling that:
- ✅ Routes terminal output events
- ✅ Handles input echo events
- ✅ Triggers appropriate handlers

**Enhancement**: Add debug logging to verify event flow.

### 3. Event Flow Verification Specification

#### 3.1 SSE Event Types

**Required Event Types**:
```javascript
// Instance Status Events
{
  type: 'instance:status',
  instanceId: string,
  status: 'starting' | 'running' | 'stopped' | 'error',
  timestamp: string
}

// Terminal Input Echo Events
{
  type: 'input_echo',
  instanceId: string,
  data: string,
  timestamp: string
}

// Terminal Output Events
{
  type: 'output',
  instanceId: string,
  data: string,
  timestamp: string
}

// Connection Events
{
  type: 'connected',
  instanceId: string,
  message: string,
  timestamp: string
}
```

#### 3.2 Backend Event Broadcasting Requirements

1. **Instance Creation**: Broadcast status "starting" → "running"
2. **Terminal Input**: Broadcast input echo immediately
3. **Command Processing**: Broadcast response after processing
4. **Instance Termination**: Broadcast status "stopped"

#### 3.3 Frontend Event Handling Requirements

1. **Status Updates**: Update instance list immediately
2. **Terminal Echo**: Display input in terminal
3. **Command Response**: Display response in terminal
4. **Connection Status**: Update UI connection indicators

## Implementation Priority

### Phase 1: Instance Status Broadcasting (Critical)
1. Add `broadcastInstanceStatus` function to backend
2. Integrate status broadcasts into instance lifecycle
3. Add status event handling to frontend hook
4. Add status update logic to ClaudeInstanceManager

### Phase 2: Terminal Processing Verification (High)
1. Add debug logging to terminal processing flow
2. Verify SSE event broadcasting works correctly
3. Test command processing end-to-end
4. Add response time monitoring

### Phase 3: Testing & Validation (Medium)
1. Unit tests for status broadcasting
2. Integration tests for terminal command flow
3. E2E tests for complete user workflows
4. Performance testing for SSE event handling

## Success Criteria

### Functional Requirements
1. **Status Update**: Instance status changes from "starting" to "running" within 2 seconds and UI reflects change immediately
2. **Terminal Echo**: User types "hello", sees immediate echo in terminal
3. **Command Response**: User types "help", sees both echo and help text response
4. **Connection Status**: UI shows correct connection status throughout

### Non-Functional Requirements
1. **Performance**: Status updates propagate within 100ms
2. **Reliability**: 99% of status updates successfully broadcast
3. **User Experience**: No visible delays in terminal interaction
4. **Error Handling**: Graceful degradation when SSE fails

## Test Specifications

### Unit Tests
```javascript
// Backend Status Broadcasting
describe('broadcastInstanceStatus', () => {
  it('should broadcast status change to all connections')
  it('should handle connection failures gracefully')
  it('should log status changes correctly')
})

// Frontend Status Handling
describe('instance:status handler', () => {
  it('should update instance status in state')
  it('should trigger UI re-render')
  it('should handle invalid status updates')
})
```

### Integration Tests
```javascript
// SSE Status Flow
describe('Instance Status SSE Flow', () => {
  it('should broadcast status from starting to running')
  it('should update frontend UI when status changes')
  it('should handle multiple instance status updates')
})

// Terminal Command Processing
describe('Terminal Command Processing', () => {
  it('should echo input and return command response')
  it('should handle command not found scenarios')
  it('should maintain terminal session state')
})
```

### End-to-End Tests
```javascript
// Complete User Workflow
describe('Instance Management Workflow', () => {
  it('should create instance and show running status')
  it('should connect to terminal and process commands')
  it('should terminate instance and update status')
})
```

## Implementation Files

### Primary Files
1. **Backend**: `/workspaces/agent-feed/simple-backend.js`
2. **Frontend Hook**: `/workspaces/agent-feed/frontend/src/hooks/useHTTPSSE.ts`
3. **Frontend Component**: `/workspaces/agent-feed/frontend/src/components/ClaudeInstanceManager.tsx`

### Test Files
1. **Backend Tests**: `/tests/backend-sse-status.test.js`
2. **Frontend Tests**: `/tests/frontend-status-handling.test.tsx`
3. **Integration Tests**: `/tests/sse-status-integration.test.js`
4. **E2E Tests**: `/tests/e2e-instance-workflow.test.js`

## Error Handling Specification

### Backend Error Scenarios
1. **SSE Connection Failure**: Log error, continue processing
2. **Invalid Status Update**: Validate status before broadcasting
3. **Connection Cleanup**: Remove dead connections from tracking

### Frontend Error Scenarios
1. **Invalid Status Event**: Log warning, ignore event
2. **Connection Loss**: Show error state, attempt reconnection
3. **State Update Failure**: Log error, maintain previous state

This specification provides the complete technical requirements for fixing both the instance status update gap and ensuring robust terminal command processing through SSE event broadcasting.