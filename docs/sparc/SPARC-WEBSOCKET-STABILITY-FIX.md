# SPARC WEBSOCKET STABILITY FIX EXECUTION PLAN

## CRITICAL ISSUE ANALYSIS

**Root Cause Identified:**
- WebSocket connections are being marked as "dead" and removed when Claude API subprocess completes
- The backend removes WebSocket connections from `wsConnections` map during cleanup
- Frontend experiences "Connection lost: Unknown error" and enters polling storm
- Connection lifecycle is coupled to API subprocess lifecycle instead of being persistent

## SPARC PHASE 1: SPECIFICATION

### Requirements Analysis
1. **WebSocket Persistence**: Connections must survive Claude API subprocess completion
2. **Lifecycle Separation**: WebSocket management must be decoupled from API processes
3. **Connection Health**: Implement proper heartbeat/keepalive mechanism
4. **Error Recovery**: Graceful reconnection without polling storms
5. **State Management**: Maintain connection state independently of process state

### Technical Specifications
- WebSocket connections persist for entire browser session
- Heartbeat every 30 seconds with 10 second timeout
- Reconnection with exponential backoff (1s, 2s, 4s, 8s, 16s max)
- Connection state: connecting, connected, disconnected, error
- Message acknowledgment system for reliability

## SPARC PHASE 2: PSEUDOCODE

### Connection Manager Algorithm
```
WebSocketConnectionManager:
  - connections: Map<instanceId, Set<WebSocket>>
  - connectionHealth: Map<connectionId, HealthData>
  - heartbeatInterval: 30000ms
  - connectionTimeout: 10000ms

  ON_CONNECTION:
    register(websocket, instanceId)
    startHeartbeat(websocket)
    addToConnectionPool(instanceId, websocket)

  ON_MESSAGE:
    if (type === 'ping') sendPong()
    if (type === 'connect') associateInstance()
    if (type === 'input') forwardToProcess()

  ON_PROCESS_COMPLETE:
    // CRITICAL: DO NOT remove WebSocket connections
    keepConnectionsAlive()
    markProcessCompleted()

  ON_DISCONNECT:
    removeFromPool()
    stopHeartbeat()
```

### Frontend Reconnection Strategy
```
WebSocketService:
  reconnectAttempts: 5
  reconnectDelay: [1000, 2000, 4000, 8000, 16000]

  ON_DISCONNECT:
    if (code !== 1000): // Not normal close
      scheduleReconnect()

  scheduleReconnect():
    delay = reconnectDelay[currentAttempt]
    setTimeout(() => connect(), delay)
```

## SPARC PHASE 3: ARCHITECTURE

### Component Design
1. **WebSocketConnectionManager**: Persistent connection pool management
2. **ProcessManager**: API subprocess lifecycle (isolated from connections)  
3. **HeartbeatService**: Connection health monitoring
4. **MessageRouter**: Route messages between connections and processes
5. **ReconnectionManager**: Handle frontend reconnection logic

### Integration Points
- Backend: Separate WebSocket lifecycle from process lifecycle
- Frontend: Enhanced error handling and reconnection
- Monitoring: Connection health metrics and alerting

## SPARC PHASE 4: REFINEMENT (TDD Implementation)

### Test Cases Required
1. **Connection Persistence**: WebSocket survives API subprocess completion
2. **Heartbeat Mechanism**: Ping/pong keeps connections alive
3. **Reconnection Logic**: Exponential backoff on disconnect
4. **Error Scenarios**: Network failures, server restarts
5. **Multi-Instance**: Multiple Claude instances with independent connections

## SPARC PHASE 5: COMPLETION

### Validation Criteria
1. All 4 instance creation buttons work without connection errors
2. "what directory are you in" command works reliably 
3. No "Connection lost: Unknown error" messages
4. Visual confirmation: No red error badges
5. Load test: 100+ API calls without connection drops

### Deployment Checklist
- [ ] Backend WebSocket lifecycle fixes
- [ ] Frontend reconnection enhancements  
- [ ] Heartbeat mechanism implemented
- [ ] TDD tests passing
- [ ] E2E validation complete
- [ ] Production monitoring enabled

## IMPLEMENTATION PLAN

1. **Immediate Fix**: Separate WebSocket lifecycle from API subprocess
2. **Enhanced Monitoring**: Add heartbeat and health checks
3. **Frontend Improvements**: Better error handling and reconnection
4. **Testing**: Comprehensive TDD suite
5. **Validation**: Playwright E2E tests with visual confirmation