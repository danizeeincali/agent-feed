# SPARC Specification: SSE Connection Management Fix

## Issue Analysis

### Critical Problems Identified

1. **Status Broadcasting Issue**: Backend broadcasts to 0 connections despite status changes
2. **Terminal Input Not Reaching Backend**: Missing ⌨️ Forwarding input messages in logs
3. **Frontend Status Stuck on "starting"**: Despite backend processes being "running"
4. **Connection Management**: SSE connections not properly established between frontend and backend

### Root Cause Analysis

#### Backend Issues (simple-backend.js)
- Line 425: `broadcastInstanceStatus` broadcasts to instance-specific connections but not general status listeners
- Line 448: General status connections stored in `sseConnections.get('__status__')` but frontend connects to different endpoint
- Lines 712-779: Terminal input endpoints exist but frontend may not be calling correct endpoint

#### Frontend Issues
- `useHTTPSSE.ts` Line 201: `connectStatusSSE()` connects to `/api/status/stream` 
- `useHTTPSSE.ts` Line 275: Instance-specific SSE connects to `/api/claude/instances/{id}/terminal/stream`
- `ClaudeInstanceManager.tsx` Line 276: `connectSSE(instanceId)` called after instance creation
- Frontend listens for `instance:status` events but may not be connected to correct stream

## SPARC Phase 1: Specification

### Requirements

#### R1: Status Broadcasting
- Backend MUST broadcast status changes to ALL connected frontend clients
- Status events MUST reach frontend within 100ms of backend status change
- Frontend MUST receive and process `instance:status` events immediately

#### R2: Terminal Input Forwarding  
- Frontend input MUST reach backend Claude process stdin
- Backend MUST log "⌨️ Forwarding input" messages for each input
- Terminal echo MUST be sent back to frontend immediately

#### R3: Connection Management
- Frontend MUST establish TWO SSE connections:
  1. General status stream at `/api/status/stream` 
  2. Instance-specific terminal stream at `/api/claude/instances/{id}/terminal/stream`
- Both connections MUST be active simultaneously
- Connection failures MUST trigger automatic reconnection

#### R4: Instance Lifecycle Synchronization
- Instance creation → Status "starting" → Backend process spawn → Status "running" → Frontend UI update
- Each step MUST complete before next step begins
- Frontend MUST show real-time status changes

### Acceptance Criteria

#### AC1: Status Updates Work
- GIVEN: Backend creates instance with status "starting"  
- WHEN: Backend process spawns and status changes to "running"
- THEN: Frontend receives status update within 100ms
- AND: Frontend UI shows "running" status immediately

#### AC2: Terminal Input Works
- GIVEN: Frontend user types command and presses Enter
- WHEN: Frontend sends input to backend
- THEN: Backend logs "⌨️ Forwarding input" message
- AND: Backend forwards input to Claude process stdin
- AND: Frontend receives terminal echo immediately

#### AC3: Connection Resilience
- GIVEN: SSE connection drops unexpectedly
- WHEN: Network reconnects
- THEN: Frontend automatically re-establishes both SSE streams
- AND: No status updates or terminal output is lost

## SPARC Phase 2: Pseudocode

### Frontend Connection Algorithm

```pseudocode
FUNCTION initializeSSEConnections():
    // Step 1: Connect to general status stream for all instances
    statusSSE = createEventSource("/api/status/stream")
    statusSSE.onmessage = handleStatusUpdate
    statusSSE.onopen = logStatusConnectionSuccess
    
    // Step 2: When instance selected, connect to terminal stream  
    IF selectedInstance != null:
        terminalSSE = createEventSource("/api/claude/instances/{selectedInstance}/terminal/stream")
        terminalSSE.onmessage = handleTerminalOutput
        terminalSSE.onopen = logTerminalConnectionSuccess

FUNCTION handleStatusUpdate(event):
    data = JSON.parse(event.data)
    IF data.type == "instance:status":
        updateInstanceStatus(data.instanceId, data.status)
        broadcastToUI(data)

FUNCTION sendTerminalInput(instanceId, input):
    // Critical Fix: Use correct endpoint and validation
    IF instanceId != null AND instanceId != "undefined":
        response = POST("/api/claude/instances/{instanceId}/terminal/input", {input: input})
        IF response.success:
            logInputSent(instanceId, input)
        ELSE:
            logInputError(instanceId, response.error)
```

### Backend Broadcasting Algorithm

```pseudocode
FUNCTION broadcastInstanceStatus(instanceId, status, details):
    statusEvent = {
        type: "instance:status",
        instanceId: instanceId,
        status: status,
        timestamp: now(),
        ...details
    }
    
    // Fix 1: Broadcast to instance-specific connections
    instanceConnections = activeSSEConnections.get(instanceId) 
    FOR EACH connection IN instanceConnections:
        connection.write("data: " + JSON.stringify(statusEvent) + "\n\n")
    
    // Fix 2: Broadcast to general status connections  
    generalConnections = sseConnections.get("__status__")
    FOR EACH connection IN generalConnections:
        connection.write("data: " + JSON.stringify(statusEvent) + "\n\n")
        
    // Fix 3: Update instance record
    IF instances.has(instanceId):
        instance = instances.get(instanceId)
        instance.status = status
        instances.set(instanceId, instance)

FUNCTION handleTerminalInput(instanceId, input):
    processInfo = activeProcesses.get(instanceId)
    IF processInfo AND processInfo.status == "running":
        // Critical Fix: Log input forwarding 
        console.log("⌨️ Forwarding input to Claude " + instanceId + ": " + input)
        
        // Forward to real Claude process
        processInfo.process.stdin.write(input + "\n")
        
        // Echo back to terminal
        broadcastToAllConnections(instanceId, {
            type: "terminal:echo", 
            data: "$ " + input,
            timestamp: now()
        })
```

## SPARC Phase 3: Architecture

### Connection Architecture

```
┌─────────────────┐         ┌──────────────────┐
│    Frontend     │         │     Backend      │
│                 │         │                  │
│  ┌─────────────┐│  SSE    │┌─────────────────┐│
│  │Status Stream├┼────────►││/api/status/     ││
│  │Listener     ││         ││stream           ││
│  └─────────────┘│         │└─────────────────┘│
│                 │         │                  │
│  ┌─────────────┐│  SSE    │┌─────────────────┐│
│  │Terminal     ├┼────────►││/api/claude/     ││
│  │Stream       ││         ││instances/{id}/  ││
│  │Listener     ││         ││terminal/stream  ││
│  └─────────────┘│         │└─────────────────┘│
│                 │         │                  │
│  ┌─────────────┐│  HTTP   │┌─────────────────┐│
│  │Input Sender ├┼────────►││/api/claude/     ││
│  │             ││  POST   ││instances/{id}/  ││
│  │             ││         ││terminal/input   ││
│  └─────────────┘│         │└─────────────────┘│
└─────────────────┘         └──────────────────┘
```

### Data Flow Architecture

```
Instance Creation:
Frontend → POST /api/claude/instances → Backend
Backend → Spawn Claude Process → PID Generated
Backend → broadcastInstanceStatus(id, "starting") → General Status Stream
Frontend Status Stream → Receives status update → Updates UI

Terminal Input:
Frontend → POST /api/claude/instances/{id}/terminal/input → Backend
Backend → Forwards to Claude Process stdin → Logs "⌨️ Forwarding"
Backend → Broadcasts echo → Instance Terminal Stream
Frontend Terminal Stream → Receives echo → Displays in terminal

Process Status Changes:
Claude Process → Emits 'spawn' event → Backend Handler
Backend → Updates processInfo.status = "running" → broadcastInstanceStatus
Backend → Sends to both General + Instance streams → Frontend receives
Frontend → Updates instance status in UI → Shows "running"
```

### Connection State Management

```typescript
interface ConnectionState {
    statusSSE: EventSource | null;      // General status updates
    terminalSSE: EventSource | null;    // Instance terminal I/O  
    selectedInstance: string | null;     // Currently active instance
    connectionStatus: 'connected' | 'disconnected' | 'error';
}

interface BackendConnectionTracking {
    sseConnections: Map<string, Response[]>;        // "__status__" → [Response...]
    activeSSEConnections: Map<string, Response[]>;  // instanceId → [Response...]
    instances: Map<string, InstanceRecord>;        // instanceId → {id, status, ...}
    activeProcesses: Map<string, ProcessInfo>;     // instanceId → {process, pid, ...}
}
```

## SPARC Phase 4: Refinement

### Frontend Fixes Required

#### Fix 1: Dual SSE Connection Management
```typescript
// useHTTPSSE.ts - Fix connection management
useEffect(() => {
    if (autoConnect && !isConnected) {
        connect();
        connectStatusSSE(); // Always connect to general status
    }
    return () => {
        disconnect();
        eventHandlers.current.clear();
    };
}, [autoConnect, connectStatusSSE]); // Add connectStatusSSE dependency
```

#### Fix 2: Enhanced Status Event Handling  
```typescript
// ClaudeInstanceManager.tsx - Fix status event handling
on('instance:status', (data) => {
    console.log('📲 Instance status update received:', data);
    
    setInstances(prev => prev.map(instance => 
        instance.id === data.instanceId 
            ? { ...instance, status: data.status as ClaudeInstance['status'] }
            : instance
    ));
    
    // Show status change in terminal output
    if (data.instanceId === selectedInstance) {
        const statusMessage = `[${new Date().toLocaleTimeString()}] Status: ${data.status}\n`;
        setOutput(prev => ({
            ...prev,
            [data.instanceId]: (prev[data.instanceId] || '') + statusMessage
        }));
    }
});
```

#### Fix 3: Terminal Input Validation & Error Handling
```typescript
// ClaudeInstanceManager.tsx - Enhanced sendInput
const sendInput = () => {
    if (!selectedInstance || selectedInstance === 'undefined') {
        setError('No valid instance selected');
        return;
    }
    
    if (!input.trim()) {
        return;
    }
    
    if (!/^claude-[a-zA-Z0-9]+$/.test(selectedInstance)) {
        setError(`Invalid instance ID: ${selectedInstance}`);
        return;
    }
    
    if (socket && isConnected) {
        console.log('⌨️ Sending input to instance:', selectedInstance, 'Input:', input);
        emit('terminal:input', {
            input: input + '\n',
            instanceId: selectedInstance
        });
        setInput('');
        setError(null); // Clear any previous errors
    } else {
        setError('Not connected to terminal');
    }
};
```

### Backend Fixes Required

#### Fix 1: Enhanced Status Broadcasting
```javascript
// simple-backend.js - Fix broadcastInstanceStatus function
function broadcastInstanceStatus(instanceId, status, details = {}) {
    const statusEvent = {
        type: 'instance:status',
        instanceId,
        status,  
        timestamp: new Date().toISOString(),
        ...details
    };
    
    console.log(`📡 Broadcasting status ${status} for ${instanceId}`);
    
    // Fix 1: Broadcast to instance-specific connections
    const instanceConnections = activeSSEConnections.get(instanceId) || [];
    console.log(`   → Instance connections: ${instanceConnections.length}`);
    instanceConnections.forEach((res, index) => {
        try {
            res.write(`data: ${JSON.stringify(statusEvent)}\n\n`);
        } catch (error) {
            console.error(`❌ Failed to broadcast to instance connection ${index}:`, error);
            instanceConnections.splice(index, 1);
        }
    });
    
    // Fix 2: Broadcast to general status connections
    const generalConnections = sseConnections.get('__status__') || [];
    console.log(`   → General status connections: ${generalConnections.length}`);
    generalConnections.forEach((res, index) => {
        try {
            res.write(`data: ${JSON.stringify(statusEvent)}\n\n`);
        } catch (error) {
            console.error(`❌ Failed to broadcast to general connection ${index}:`, error);
            generalConnections.splice(index, 1);
        }
    });
    
    // Fix 3: Update instance record
    if (instances.has(instanceId)) {
        const instance = instances.get(instanceId);
        instance.status = status;
        instances.set(instanceId, instance);
    }
    
    console.log(`📊 Total broadcasts sent: ${instanceConnections.length + generalConnections.length}`);
}
```

#### Fix 2: Process Handler Status Broadcasting
```javascript
// simple-backend.js - Fix setupProcessHandlers
function setupProcessHandlers(instanceId, processInfo) {
    const { process: claudeProcess } = processInfo;
    
    claudeProcess.on('spawn', () => {
        console.log(`✅ Claude process ${instanceId} spawned (PID: ${claudeProcess.pid})`);
        processInfo.status = 'running';
        
        // Critical Fix: Add delay to ensure SSE connections are ready
        setTimeout(() => {
            broadcastInstanceStatus(instanceId, 'running', {
                pid: claudeProcess.pid,
                command: processInfo.command
            });
        }, 100); // 100ms delay ensures connections are established
    });
    
    // ... rest of handlers remain the same
}
```

#### Fix 3: Enhanced Terminal Input Logging
```javascript  
// simple-backend.js - Fix terminal input endpoints
app.post('/api/claude/instances/:instanceId/terminal/input', (req, res) => {
    const { instanceId } = req.params;
    const { input } = req.body;
    
    const processInfo = activeProcesses.get(instanceId);
    if (!processInfo) {
        console.log(`❌ Terminal input failed - Instance ${instanceId} not found`);
        return res.status(404).json({ success: false, error: 'Instance not found' });
    }
    
    if (processInfo.status !== 'running') {
        console.log(`❌ Terminal input failed - Instance ${instanceId} status: ${processInfo.status}`);
        return res.status(400).json({ success: false, error: 'Instance not running' });
    }
    
    try {
        console.log(`⌨️ Forwarding input to Claude ${instanceId}: ${input}`);
        
        // Forward to real Claude process
        processInfo.process.stdin.write(input);
        
        // Enhanced echo broadcast
        broadcastToAllConnections(instanceId, {
            type: 'terminal:echo',
            data: `$ ${input.replace('\n', '')}`,
            timestamp: new Date().toISOString()
        });
        
        console.log(`✅ Input forwarded successfully to Claude ${instanceId}`);
        res.json({ success: true, processed: input });
        
    } catch (error) {
        console.error(`❌ Failed to send input to Claude ${instanceId}:`, error);
        res.status(500).json({ success: false, error: error.message });
    }
});
```

## SPARC Phase 5: Completion

### Testing Strategy

#### Test 1: Status Broadcasting
1. Start backend: `node simple-backend.js`
2. Start frontend: `cd frontend && npm run dev`
3. Open browser console and watch for SSE connection logs
4. Create new Claude instance via UI
5. Verify backend logs show: "📡 Broadcasting status running for claude-XXXX to N connections"
6. Verify frontend logs show: "📲 Instance status update received"
7. Verify UI shows instance status changes from "starting" to "running"

#### Test 2: Terminal Input Forwarding
1. With running instance from Test 1
2. Select instance and type "hello" in terminal input
3. Press Enter
4. Verify backend logs show: "⌨️ Forwarding input to Claude claude-XXXX: hello"
5. Verify frontend terminal shows echo: "$ hello"
6. Verify backend forwards input to actual Claude process

#### Test 3: Connection Management
1. Open Network tab in browser dev tools
2. Verify 2 active EventSource connections:
   - `/api/status/stream` (general status)
   - `/api/claude/instances/{id}/terminal/stream` (terminal I/O)
3. Kill backend process
4. Restart backend 
5. Verify frontend automatically reconnects both streams
6. Verify no status updates or terminal output lost

### Success Metrics

- ✅ Backend broadcasts status to >0 connections (not 0)
- ✅ Backend logs "⌨️ Forwarding input" for each user input
- ✅ Frontend UI shows real-time status changes within 100ms
- ✅ Terminal input/output flows bidirectionally without delays
- ✅ SSE connections remain stable under network interruption
- ✅ All 3 tests pass consistently

### Rollback Plan

If fixes cause regressions:
1. Revert frontend changes to ClaudeInstanceManager.tsx
2. Revert backend changes to simple-backend.js  
3. Test original functionality still works
4. Apply fixes incrementally with testing at each step

This specification ensures robust SSE connection management with proper status broadcasting and terminal input forwarding between frontend and backend systems.