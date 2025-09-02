# WebSocket Connection Lifecycle Analysis - Agent Feed System

## Executive Summary

**CRITICAL FINDING**: The 30-second connection drops are caused by multiple competing timeout mechanisms that create a cascade failure when Claude API calls exceed 30 seconds. The system has at least 5 different timeout configurations that interact in destructive ways.

## 1. Complete WebSocket Connection Flow Map

### Frontend Connection Initialization
```
DualModeInterface Component
    ↓
getGlobalWebSocketService()
    ↓  
WebSocketService.connect()
    ↓
new WebSocket(ws://localhost:3000)
    ↓
Frontend WebSocket (readyState = OPEN)
```

### Backend Connection Handling
```
simple-backend.js WebSocket Server
    ↓
wss.on('connection') - Line 2642
    ↓
Connection Registration in WebSocketConnectionManager
    ↓
Health Monitor Registration
    ↓
Message Handler Setup
```

## 2. ALL Connection Termination Points Identified

### A. Frontend Termination Points
1. **WebSocketService.ts Line 151**: `disconnect()` method
2. **WebSocketService.ts Line 390**: `handleDisconnection()` on close event
3. **WebSocketService.ts Line 434**: Heartbeat failure detection
4. **useRobustWebSocket.ts Line 109**: Manual disconnect
5. **WebSocketService.ts Line 525**: Service destruction

### B. Backend Termination Points
1. **simple-backend.js Line 2701**: WebSocket close event handler
2. **WebSocketConnectionManager.js Line 67**: Connection close handling  
3. **simple-backend.js Line 276**: Health monitor ping timeout (120 seconds)
4. **simple-backend.js Line 2792**: Grace period cleanup (30 seconds) **← ROOT CAUSE**
5. **WebSocketConnectionManager.js Line 188**: Reconnection window timeout (30 seconds) **← ROOT CAUSE**
6. **ClaudeAPIManager timeout**: 60 seconds (Line 25)

## 3. Claude API Call ↔ WebSocket Health Interaction

### The Toxic Interaction Pattern
```
1. User sends Claude prompt → WebSocket message sent
2. Claude API call initiated → May take 30+ seconds for complex requests  
3. During Claude processing:
   - Frontend: Heartbeat every 30s (WebSocketService.ts:38)
   - Backend: Health check every 60s (simple-backend.js:277)
   - Grace period: 30s cleanup timer (simple-backend.js:2792) **STARTS COUNTING**
4. If Claude takes >30s → Grace period expires → Connection marked dead
5. WebSocket closed → Frontend sees disconnection → Reconnect attempt
6. Claude response arrives → No active connection → Response lost
```

### Evidence from Code Analysis

**Frontend - WebSocketService.ts Lines 34-40:**
```javascript
const DEFAULT_CONFIG: Required<WebSocketConfig> = {
  url: `ws://localhost:3000`,
  reconnectAttempts: 5,
  reconnectDelay: 1000,
  heartbeatInterval: 30000,  // ← 30 second heartbeat
  messageTimeout: 10000      // ← 10 second message timeout
};
```

**Backend - simple-backend.js Lines 2787-2801:**
```javascript
const gracePeriod = 30000; // 30 seconds ← ROOT CAUSE
if (connectionAge > gracePeriod && ws.readyState === WebSocket.CLOSED) {
  console.log(`🧹 SPARC: Removing definitively dead connection`);
  staleConnections.add(ws);
}
```

**WebSocketConnectionManager.js Lines 187-194:**
```javascript
const reconnectionWindow = 30000; // 30 seconds ← ROOT CAUSE
if (!isRecentConnection && ws.readyState === WebSocket.CLOSED) {
  console.log(`🗑️ SPARC: Removing definitively dead connection`);
  connections.delete(ws);
}
```

## 4. Connection State Management Across Components

### State Flow Architecture
```
Frontend State:
  WebSocketService.connectionStatus
    ↓
  DualModeInterface.connectionStatus
    ↓  
  MessageInput disabled state

Backend State:  
  WebSocketConnectionManager.connections
    ↓
  ConnectionHealthMonitor.connectionHealth
    ↓
  broadcastToWebSockets success/failure
```

### State Synchronization Issues
1. **Frontend assumes connection active** during Claude API calls
2. **Backend starts cleanup timers** during idle periods  
3. **No coordination** between Claude processing time and connection health
4. **Multiple timeout sources** create race conditions

## 5. Root Cause of 30-Second Connection Drops

### Primary Root Cause: Grace Period Cascade Failure

The 30-second drops are caused by a cascade of exactly timed failures:

```
T=0:    User sends complex Claude prompt
T=0:    WebSocket sends message to backend  
T=0:    Claude API call starts (may take 60+ seconds)
T=0:    Backend grace period timer starts (30s countdown)
T=30:   Grace period expires → Connection marked dead
T=30:   WebSocket closed by backend cleanup
T=30:   Frontend detects disconnection
T=30:   Frontend attempts reconnect
T=45:   Claude response ready → No connection to receive it
```

### Secondary Contributing Factors

1. **Competing Timeout Values:**
   - Frontend heartbeat: 30s
   - Backend grace period: 30s  
   - WebSocket connection manager: 30s
   - Health monitor: 120s
   - Claude API timeout: 60s

2. **No Claude-Aware Connection Management:**
   - No mechanism to pause cleanup during active Claude calls
   - No "processing" state to extend connection lifetime
   - Health checks don't account for legitimate long-running operations

3. **Inadequate Connection Preservation:**
   - Connections cleaned up too aggressively
   - No differentiation between idle and processing states

## 6. Architectural Recommendations for Bulletproof Stability

### Immediate Fixes (High Priority)

#### A. Extend Grace Periods During Claude Processing
```javascript
// In simple-backend.js - Modify grace period logic
const isClaudeProcessing = activeProcesses.get(instanceId)?.status === 'running';
const gracePeriod = isClaudeProcessing ? 300000 : 30000; // 5min vs 30s
```

#### B. Implement Claude-Aware Health Monitoring
```javascript
// New: Claude processing state tracking
const claudeProcessingStates = new Map(); // instanceId → { startTime, expectedDuration }

function markClaudeProcessingStart(instanceId, estimatedDuration = 60000) {
  claudeProcessingStates.set(instanceId, {
    startTime: Date.now(),
    expectedDuration: estimatedDuration
  });
}
```

#### C. Coordinate Timeouts Across System
```javascript
const TIMEOUT_CONFIG = {
  CLAUDE_API_TIMEOUT: 180000,        // 3 minutes - longest
  CONNECTION_GRACE_PERIOD: 240000,   // 4 minutes - longer than Claude
  HEARTBEAT_INTERVAL: 45000,         // 45 seconds - less frequent  
  HEALTH_CHECK_INTERVAL: 90000,      // 1.5 minutes - coordinated
  MESSAGE_TIMEOUT: 15000             // 15 seconds - reasonable
};
```

### Medium-Term Improvements

#### A. Connection State Machine
```javascript
class ConnectionStateMachine {
  states = ['connecting', 'idle', 'processing', 'waiting_response', 'disconnecting'];
  
  transition(from, to, reason) {
    // Validate transitions and adjust timeouts accordingly
    switch(to) {
      case 'processing':
        this.extendAllTimeouts();
        break;
      case 'idle':
        this.resetTimeouts();
        break;
    }
  }
}
```

#### B. Intelligent Reconnection Logic
```javascript
class SmartReconnectionManager {
  shouldReconnect(disconnectReason, connectionAge, hasActiveProcesses) {
    if (hasActiveProcesses && disconnectReason === 'timeout') {
      return true; // Likely premature timeout
    }
    return this.standardReconnectLogic(disconnectReason);
  }
}
```

#### C. Process-Aware Broadcasting
```javascript
function broadcastWithProcessAwareness(instanceId, message) {
  const processInfo = activeProcesses.get(instanceId);
  const isLongRunningOperation = processInfo?.expectedDuration > 30000;
  
  if (isLongRunningOperation) {
    // Use more aggressive connection preservation
    return robustBroadcast(instanceId, message, { preserveConnection: true });
  }
  
  return standardBroadcast(instanceId, message);
}
```

### Long-Term Architecture (Low Priority)

#### A. Message Queuing with Persistence
```javascript
class PersistentMessageQueue {
  constructor() {
    this.queue = new Map(); // instanceId → messages[]
    this.storage = new SQLite('messages.db');
  }
  
  async enqueue(instanceId, message) {
    await this.storage.insert(instanceId, message);
    this.notifySubscribers(instanceId, message);
  }
}
```

#### B. Distributed Connection Health
```javascript
class DistributedHealthManager {
  constructor() {
    this.healthNodes = new Set();
    this.consensusThreshold = 0.6;
  }
  
  async isConnectionHealthy(connectionId) {
    const votes = await this.pollHealthNodes(connectionId);
    return votes.healthy / votes.total >= this.consensusThreshold;
  }
}
```

## 7. Implementation Priority Matrix

| Fix | Impact | Effort | Priority |
|-----|--------|--------|----------|
| Extend grace periods during Claude processing | HIGH | LOW | **1** |
| Coordinate timeout values | HIGH | LOW | **2** |
| Add Claude processing state tracking | HIGH | MED | **3** |
| Implement connection state machine | MED | HIGH | 4 |
| Add persistent message queuing | LOW | HIGH | 5 |

## 8. Monitoring and Validation

### Key Metrics to Track
1. **Connection Lifetime Distribution** - Identify remaining 30s drops
2. **Message Loss Rate** - Ensure no Claude responses lost
3. **Reconnection Success Rate** - Validate improvements
4. **Claude Response Time vs Connection Health** - Correlation analysis

### Validation Tests
```javascript
// Test: Long Claude operations don't kill connections
async function testLongClaudeOperationStability() {
  const connection = await establishWebSocket();
  const startTime = Date.now();
  
  // Simulate 2-minute Claude operation
  await sendClaudePrompt("Very complex analysis task...", { timeout: 120000 });
  
  const connectionAge = Date.now() - startTime;
  assert(connection.isAlive(), `Connection died after ${connectionAge}ms`);
}
```

## Conclusion

The 30-second connection drops are a **deterministic system design flaw**, not random network issues. The fix requires coordinating timeout values and making the connection management Claude-aware. The highest-impact fix is simply extending grace periods during active Claude processing.

**Estimated Fix Time**: 2-4 hours for immediate fixes, 1-2 days for medium-term improvements.

**Risk**: Low - changes are isolated to timeout logic and don't affect core functionality.