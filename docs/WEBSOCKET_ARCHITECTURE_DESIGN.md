# WebSocket Communication Architecture Design
## SPARC Architecture Phase - Robust Claude Code ↔ Frontend Communication

### Executive Summary

The current WebSocket communication system experiences connection establishment failures where the backend broadcasts "Broadcasting output" but reports "No connections for claude-6038". The frontend calls `connect(instance.id)` but the connection is not properly established, preventing Claude Code responses from reaching the frontend.

### Problem Analysis

**Root Cause Identified:**
1. **Connection Registration Mismatch**: Backend WebSocket connection registration uses different keys than the broadcasting mechanism
2. **Instance ID Mapping**: Frontend uses formatted instance names while backend expects base instance IDs  
3. **Connection Timing**: Race condition between connection establishment and message broadcasting
4. **Singleton Pattern Issues**: Global WebSocket state conflicts with per-instance connections

**Evidence from Logs:**
- Backend: `Broadcasting to ${instanceWSConnections.size} WebSocket connections for ${instanceId}` shows 0 connections
- Frontend: `useWebSocketSingleton` calls `connect(terminalId)` but registration fails
- Backend: WebSocket message handling expects exact `terminalId` matching

## 1. WebSocket Connection Architecture Diagram

```
┌─────────────────────────────────────────────────────────────────────────────────────┐
│                          ROBUST WEBSOCKET ARCHITECTURE                              │
└─────────────────────────────────────────────────────────────────────────────────────┘

Frontend Layer                    Backend Layer                     Claude Process Layer
┌─────────────────┐              ┌─────────────────────────────┐    ┌──────────────────┐
│  Claude Manager │              │     WebSocket Server        │    │  Claude Process  │
│                 │              │                             │    │                  │
│ ┌─────────────┐ │              │ ┌─────────────────────────┐ │    │ ┌──────────────┐ │
│ │ Instance    │ │   WS://...   │ │ Connection Registry     │ │    │ │ PTY Process  │ │
│ │ Selection   │◄┼──────────────┤ │                         │ │    │ │              │ │
│ │             │ │              │ │ Map<instanceId, Set<WS>>│ │    │ │ stdin/stdout │ │
│ └─────────────┘ │              │ └─────────────────────────┘ │    │ └──────────────┘ │
│                 │              │                             │    │                  │
│ ┌─────────────┐ │              │ ┌─────────────────────────┐ │    │ ┌──────────────┐ │
│ │ WebSocket   │ │              │ │ Message Router          │ │    │ │ Output       │ │
│ │ Singleton   │ │              │ │                         │ │    │ │ Buffer       │ │
│ │             │ │              │ │ Route by instanceId     │◄┼────┤ │              │ │
│ │ State       │ │              │ │                         │ │    │ │ Position     │ │
│ └─────────────┘ │              │ └─────────────────────────┘ │    │ │ Tracking     │ │
│                 │              │                             │    │ └──────────────┘ │
│ ┌─────────────┐ │              │ ┌─────────────────────────┐ │    └──────────────────┘
│ │ Message     │ │              │ │ Connection Health       │ │
│ │ Handler     │ │              │ │                         │ │
│ │ Registry    │ │              │ │ Heartbeat & Timeout     │ │
│ │             │ │              │ │ Management              │ │
│ └─────────────┘ │              │ └─────────────────────────┘ │
└─────────────────┘              └─────────────────────────────┘

Connection Flow:
1. Frontend: connect(instanceId) → normalize ID → send {type: 'connect', terminalId}
2. Backend: Register connection in wsConnections.get(instanceId).add(websocket)  
3. Backend: Confirm registration → send {type: 'connect', terminalId: instanceId}
4. Claude Process: Generate output → route via instanceId → broadcast to registered connections
```

## 2. Connection Establishment Flow Architecture

### Current Problematic Flow
```
Frontend                          Backend                          Result
connect("claude-6038")     →     Message: {type: 'connect',      →  Registration fails
                                         terminalId: "claude-6038"}  
                                                                     
wsConnections lookup       ←     Extract terminalId              ←  ID mismatch
using formatted ID                Use raw terminalId                
                                                                     
No registration            ←     wsConnections.get(terminalId)   ←  Returns undefined
                                 returns empty set
```

### Proposed Robust Flow
```
┌─────────────────────────────────────────────────────────────────────────────────────┐
│                         ROBUST CONNECTION ESTABLISHMENT FLOW                        │
└─────────────────────────────────────────────────────────────────────────────────────┘

Phase 1: Connection Initiation
┌─────────────┐    ┌──────────────┐    ┌─────────────────┐    ┌─────────────────┐
│ Frontend    │    │ ID           │    │ WebSocket       │    │ Backend         │
│ Component   │    │ Normalizer   │    │ Transport       │    │ Handler         │
└─────────────┘    └──────────────┘    └─────────────────┘    └─────────────────┘
       │                   │                      │                      │
       │ connect(instId)   │                      │                      │
       │────────────────→  │                      │                      │
       │                   │ normalize(instId)    │                      │
       │                   │────────────────→     │                      │
       │                   │ baseId + metadata    │                      │
       │                   │←────────────────     │                      │
       │                   │                      │ WS connect           │
       │                   │                      │────────────────────→ │
       │                   │                      │                      │ validate connection
       │                   │                      │                      │ setup error handling
       │                   │                      │ connection ready     │
       │                   │                      │←────────────────────│

Phase 2: Registration & Validation
       │                   │                      │                      │
       │                   │                      │ {type: 'connect',    │
       │                   │                      │  terminalId: baseId, │
       │                   │                      │  metadata: {...}}    │
       │                   │                      │────────────────────→ │
       │                   │                      │                      │ extract baseId
       │                   │                      │                      │ validate instance exists
       │                   │                      │                      │ register connection:
       │                   │                      │                      │ wsConnections.get(baseId).add(ws)
       │                   │                      │                      │
       │                   │                      │ {type: 'connect',    │
       │                   │                      │  status: 'success',  │
       │                   │                      │  terminalId: baseId} │
       │                   │                      │←────────────────────│
       │ connection confirmed                     │                      │
       │←─────────────────────────────────────────│                      │

Phase 3: Health Check & Buffered Data
       │                   │                      │                      │
       │                   │                      │ {type: 'health'}     │
       │                   │                      │────────────────────→ │
       │                   │                      │                      │ send buffered output
       │                   │                      │ {buffered data...}   │
       │                   │                      │←────────────────────│
       │ start receiving data                     │                      │
       │←─────────────────────────────────────────│                      │
```

## 3. Message Routing Architecture

### Per-Instance Channel Design
```
┌─────────────────────────────────────────────────────────────────────────────────────┐
│                            MESSAGE ROUTING ARCHITECTURE                             │
└─────────────────────────────────────────────────────────────────────────────────────┘

Backend Message Router
┌─────────────────────────────────────────────────────────────────────────────────────┐
│                                                                                     │
│  Claude Process Output    │    Instance Router      │    Connection Registry      │
│                          │                         │                             │
│  ┌─────────────────────┐ │  ┌─────────────────────┐ │  ┌─────────────────────────┐ │
│  │ claude-1001         │ │  │ Route Decision      │ │  │ wsConnections           │ │
│  │ ├─ stdout           │→│  │                     │ │  │                         │ │
│  │ ├─ stderr           │ │  │ instanceId:         │ │  │ Map<string, Set<WS>>    │ │
│  │ └─ status           │ │  │ "claude-1001"       │→│  │                         │ │
│  └─────────────────────┘ │  │                     │ │  │ "claude-1001" → {ws1,   │ │
│                          │  │ Message Type:       │ │  │                 ws2}    │ │
│  ┌─────────────────────┐ │  │ "terminal_output"   │ │  │                         │ │
│  │ claude-2002         │ │  │                     │ │  │ "claude-2002" → {ws3}   │ │
│  │ ├─ stdout           │→│  │ Routing Key:        │ │  │                         │ │
│  │ ├─ stderr           │ │  │ instanceId          │ │  │ "claude-3003" → {}      │ │
│  │ └─ status           │ │  └─────────────────────┘ │  │ (no connections)        │ │
│  └─────────────────────┘ │                         │  └─────────────────────────┘ │
│                          │                         │                             │
│  ┌─────────────────────┐ │  ┌─────────────────────┐ │  ┌─────────────────────────┐ │
│  │ claude-3003         │ │  │ Broadcast Engine    │ │  │ Message Queue           │ │
│  │ ├─ stdout           │→│  │                     │ │  │                         │ │
│  │ ├─ stderr           │ │  │ For each WS in      │ │  │ Buffer for disconnected │ │
│  │ └─ status           │ │  │ connections[instId]:│ │  │ clients                 │ │
│  └─────────────────────┘ │  │   ws.send(message)  │ │  │                         │ │
│                          │  └─────────────────────┘ │  │ Map<instanceId, Queue>  │ │
└─────────────────────────────────────────────────────────────────────────────────────┘

Message Format Standardization:
┌─────────────────────────────────────────────────────────────────────────────────────┐
│ {                                                                                   │
│   "type": "terminal_output" | "status" | "error" | "heartbeat",                    │
│   "instanceId": "claude-XXXX",     // Always normalized base ID                    │
│   "data": "...",                   // Message payload                              │
│   "timestamp": 1234567890,         // Unix timestamp                               │
│   "source": "stdout" | "stderr" | "system",                                       │
│   "sequence": 123,                 // Message sequence number                      │
│   "metadata": {                    // Optional metadata                            │
│     "processType": "pty",                                                          │
│     "pid": 1234                                                                    │
│   }                                                                                │
│ }                                                                                   │
└─────────────────────────────────────────────────────────────────────────────────────┘
```

### Connection Registry Architecture
```
Connection Registry Data Structure:
┌─────────────────────────────────────────────────────────────────────────────────────┐
│ Interface ConnectionRegistry {                                                      │
│   // Primary connection mapping                                                    │
│   wsConnections: Map<instanceId: string, connections: Set<WebSocket>>              │
│                                                                                     │
│   // Reverse mapping for cleanup                                                   │
│   wsConnectionsBySocket: Map<WebSocket, instanceId: string>                        │
│                                                                                     │
│   // Connection metadata                                                           │
│   connectionMetadata: Map<WebSocket, {                                             │
│     connectedAt: Date,                                                             │
│     instanceId: string,                                                            │
│     lastPing: Date,                                                                │
│     messagesSent: number,                                                          │
│     health: 'healthy' | 'degraded' | 'unhealthy'                                  │
│   }>                                                                               │
│                                                                                     │
│   // Methods                                                                       │
│   register(websocket: WebSocket, instanceId: string): void                        │
│   unregister(websocket: WebSocket): void                                          │
│   getConnections(instanceId: string): Set<WebSocket>                              │
│   getInstanceId(websocket: WebSocket): string | null                              │
│   cleanup(): void  // Remove dead connections                                     │
│   getHealth(): ConnectionRegistryHealth                                           │
│ }                                                                                   │
└─────────────────────────────────────────────────────────────────────────────────────┘
```

## 4. Connection State Management System

### State Machine Architecture
```
┌─────────────────────────────────────────────────────────────────────────────────────┐
│                            CONNECTION STATE MACHINE                                │
└─────────────────────────────────────────────────────────────────────────────────────┘

Connection States:
┌─────────────┐    connect()    ┌──────────────┐    websocket.onopen    ┌─────────────┐
│ DISCONNECTED│─────────────────→│ CONNECTING   │───────────────────────→│ CONNECTED   │
└─────────────┘                 └──────────────┘                        └─────────────┘
       ▲                               │                                        │
       │                               │ timeout                                │
       │                               │ error                                  │
       │                               ▼                                        │
       │                        ┌──────────────┐                               │
       │                        │ CONNECT_FAILED│                              │
       │                        └──────────────┘                               │
       │                               │                                        │
       │         reconnection          │                                        │
       │◄──────────────────────────────┘                                        │
       │                                                                        │
       │                                                                        │
       │                        ┌──────────────┐                               │
       │                        │ RECONNECTING │◄──────────────────────────────┘
       │                        └──────────────┘    connection lost
       │                               │
       │         success               │
       │◄──────────────────────────────┘

State Transitions with Actions:
- DISCONNECTED → CONNECTING: Initialize WebSocket, set timeout, show loading
- CONNECTING → CONNECTED: Register connection, send buffered messages, clear timeout  
- CONNECTING → CONNECT_FAILED: Log error, schedule reconnection, show error state
- CONNECTED → RECONNECTING: Detect connection loss, buffer new messages, attempt reconnect
- RECONNECTING → CONNECTED: Re-register connection, send buffered messages
- RECONNECTING → DISCONNECTED: Max retries reached, show disconnected state
```

### Connection Health Monitoring
```
┌─────────────────────────────────────────────────────────────────────────────────────┐
│                          CONNECTION HEALTH MONITORING                              │
└─────────────────────────────────────────────────────────────────────────────────────┘

Health Check System:
┌─────────────────────────────────────────────────────────────────────────────────────┐
│ interface ConnectionHealth {                                                        │
│   status: 'healthy' | 'degraded' | 'unhealthy' | 'disconnected';                  │
│   latency: number;              // Average response time                           │
│   lastPing: Date;              // Last successful ping                            │
│   consecutiveFailures: number; // Failed ping attempts                            │
│   uptime: number;              // Connection duration                             │
│   messagesSent: number;        // Total messages sent                             │
│   messagesReceived: number;    // Total messages received                         │
│   bandwidth: {                 // Network performance                             │
│     bytesIn: number;                                                              │
│     bytesOut: number;                                                             │
│     averageThroughput: number;                                                    │
│   };                                                                              │
│   errors: Array<{              // Error history                                  │
│     timestamp: Date;                                                              │
│     type: string;                                                                 │
│     message: string;                                                              │
│   }>;                                                                             │
│ }                                                                                   │
└─────────────────────────────────────────────────────────────────────────────────────┘

Health Check Flow:
Frontend                          Backend
   │                                │
   │ Periodic ping (30s)            │
   │───────────────────────────────→│
   │                                │ Record ping time
   │                                │ Calculate latency
   │                                │ Update health metrics
   │                                │
   │ Pong + health data             │
   │←───────────────────────────────│
   │                                │
   │ Update UI health indicators    │
   │                                │

Health Thresholds:
- Healthy: latency < 100ms, 0 consecutive failures
- Degraded: latency 100-500ms, 1-2 consecutive failures  
- Unhealthy: latency > 500ms, 3+ consecutive failures
- Disconnected: No response for 90+ seconds
```

## 5. Error Recovery and Reconnection Strategy

### Multi-Tier Recovery Architecture
```
┌─────────────────────────────────────────────────────────────────────────────────────┐
│                         ERROR RECOVERY & RECONNECTION STRATEGY                     │
└─────────────────────────────────────────────────────────────────────────────────────┘

Recovery Tiers:
┌─────────────────────────────────────────────────────────────────────────────────────┐
│ Tier 1: Immediate Recovery (0-5 seconds)                                           │
│ ├─ Connection drops detected                                                       │
│ ├─ Immediate reconnection attempt                                                  │  
│ ├─ No user notification                                                            │
│ └─ Success rate: ~80%                                                              │
│                                                                                     │
│ Tier 2: Quick Recovery (5-30 seconds)                                              │
│ ├─ Exponential backoff: 1s, 2s, 4s, 8s                                          │
│ ├─ Show "Reconnecting..." indicator                                                │
│ ├─ Buffer messages during attempts                                                 │
│ └─ Success rate: ~15%                                                              │
│                                                                                     │
│ Tier 3: Persistent Recovery (30-300 seconds)                                       │
│ ├─ Extended backoff: 15s, 30s, 60s                                               │
│ ├─ Show "Connection issues" warning                                                │
│ ├─ Offer manual retry option                                                       │
│ └─ Success rate: ~4%                                                               │
│                                                                                     │
│ Tier 4: Fallback Mode (300+ seconds)                                               │
│ ├─ Switch to HTTP polling                                                          │
│ ├─ Show "Offline mode" status                                                      │
│ ├─ Periodic connection attempts (every 5 minutes)                                  │
│ └─ Success rate: ~1%                                                               │
└─────────────────────────────────────────────────────────────────────────────────────┘

Reconnection Algorithm:
┌─────────────────────────────────────────────────────────────────────────────────────┐
│ class ReconnectionManager {                                                         │
│   private attempts = 0;                                                            │
│   private maxAttempts = 20;                                                        │
│   private baseDelay = 1000; // 1 second                                           │
│   private maxDelay = 60000; // 1 minute                                           │
│   private backoffMultiplier = 1.5;                                                │
│                                                                                     │
│   async reconnect(): Promise<boolean> {                                            │
│     while (this.attempts < this.maxAttempts) {                                    │
│       const delay = Math.min(                                                     │
│         this.baseDelay * Math.pow(this.backoffMultiplier, this.attempts),        │
│         this.maxDelay                                                             │
│       );                                                                          │
│                                                                                     │
│       await this.sleep(delay);                                                    │
│       this.attempts++;                                                            │
│                                                                                     │
│       try {                                                                        │
│         await this.attemptConnection();                                           │
│         this.attempts = 0; // Reset on success                                    │
│         return true;                                                              │
│       } catch (error) {                                                           │
│         console.log(`Reconnection attempt ${this.attempts} failed:`, error);     │
│         this.notifyReconnectionAttempt(this.attempts, this.maxAttempts);         │
│       }                                                                           │
│     }                                                                             │
│     return false; // All attempts failed                                         │
│   }                                                                               │
│ }                                                                                   │
└─────────────────────────────────────────────────────────────────────────────────────┘
```

### Error Classification and Handling
```
Error Categories:
┌─────────────────────────────────────────────────────────────────────────────────────┐
│ Network Errors:                                                                     │
│ ├─ CONNECTION_REFUSED → Server down, retry with backoff                           │
│ ├─ NETWORK_UNREACHABLE → Network issues, extend retry interval                    │
│ ├─ TIMEOUT → Server overloaded, reduce connection frequency                        │
│ └─ DNS_RESOLUTION_FAILED → Hostname issues, try alternative endpoints             │
│                                                                                     │
│ Protocol Errors:                                                                   │
│ ├─ PROTOCOL_ERROR → WebSocket protocol violation, reset connection                 │
│ ├─ ABNORMAL_CLOSURE → Unexpected disconnection, immediate retry                    │
│ ├─ POLICY_VIOLATION → Security policy blocked, notify user                        │
│ └─ UNSUPPORTED_DATA → Message format error, log and continue                      │
│                                                                                     │
│ Application Errors:                                                                │
│ ├─ AUTHENTICATION_FAILED → Invalid credentials, show login                        │
│ ├─ AUTHORIZATION_DENIED → Permission denied, show error                           │
│ ├─ RATE_LIMITED → Too many requests, exponential backoff                          │
│ └─ SERVICE_UNAVAILABLE → Maintenance mode, show maintenance message               │
└─────────────────────────────────────────────────────────────────────────────────────┘
```

## 6. Scalability Architecture for Multiple Claude Instances

### Horizontal Scaling Design
```
┌─────────────────────────────────────────────────────────────────────────────────────┐
│                        HORIZONTAL SCALING ARCHITECTURE                             │
└─────────────────────────────────────────────────────────────────────────────────────┘

Load Distribution:
┌─────────────────────────────────────────────────────────────────────────────────────┐
│                                                                                     │
│  Frontend Load Balancer    │    Backend Pool           │    Claude Instance Pool   │
│                           │                           │                            │
│  ┌─────────────────────┐  │  ┌─────────────────────┐  │  ┌──────────────────────┐ │
│  │ Connection Manager  │  │  │ WebSocket Server 1  │  │  │ Claude Instance 1-50 │ │
│  │                     │  │  │ Port 3000           │  │  │                      │ │
│  │ Route by hash(      │──┼─→│ Handles instances   │──┼─→│ Managed by Server 1  │ │
│  │   instanceId)       │  │  │ 1-50                │  │  │                      │ │
│  │                     │  │  └─────────────────────┘  │  └──────────────────────┘ │
│  │                     │  │                           │                            │
│  │                     │  │  ┌─────────────────────┐  │  ┌──────────────────────┐ │
│  │                     │  │  │ WebSocket Server 2  │  │  │ Claude Instance 51-100│ │
│  │                     │──┼─→│ Port 3001           │──┼─→│                      │ │
│  │                     │  │  │ Handles instances   │  │  │ Managed by Server 2  │ │
│  │                     │  │  │ 51-100              │  │  │                      │ │
│  │                     │  │  └─────────────────────┘  │  └──────────────────────┘ │
│  │                     │  │                           │                            │
│  │                     │  │  ┌─────────────────────┐  │  ┌──────────────────────┐ │ 
│  │                     │  │  │ WebSocket Server N  │  │  │ Claude Instance N... │ │
│  │                     │──┼─→│ Port 3000+N         │──┼─→│                      │ │
│  │                     │  │  │ Handles instances   │  │  │ Managed by Server N  │ │
│  │                     │  │  │ N*50+1 to (N+1)*50 │  │  │                      │ │
│  │                     │  │  └─────────────────────┘  │  └──────────────────────┘ │
│  └─────────────────────┘  │                           │                            │
│                           │                           │                            │
└─────────────────────────────────────────────────────────────────────────────────────┘

Instance Distribution Algorithm:
┌─────────────────────────────────────────────────────────────────────────────────────┐
│ function getServerForInstance(instanceId: string): ServerEndpoint {                 │
│   const numericId = parseInt(instanceId.replace('claude-', ''));                   │
│   const serverIndex = Math.floor(numericId / 50);                                  │
│   const serverPort = 3000 + serverIndex;                                           │
│   return {                                                                         │
│     url: `ws://localhost:${serverPort}/terminal`,                                  │
│     serverId: serverIndex,                                                         │
│     port: serverPort                                                               │
│   };                                                                               │
│ }                                                                                   │
└─────────────────────────────────────────────────────────────────────────────────────┘
```

### Resource Management
```
Resource Allocation per Server:
┌─────────────────────────────────────────────────────────────────────────────────────┐
│ Server Capacity Planning:                                                           │
│ ├─ Max Claude Instances: 50 per server                                            │
│ ├─ Max WebSocket Connections: 200 per server (4 connections per instance avg)     │
│ ├─ Memory per Instance: ~50MB                                                      │
│ ├─ Total Memory per Server: ~2.5GB                                                │
│ ├─ CPU Cores: 4-8 cores per server                                                │
│ └─ Network Bandwidth: 1Gbps per server                                            │
│                                                                                     │
│ Auto-scaling Triggers:                                                             │
│ ├─ CPU Usage > 80% for 5+ minutes → Scale up                                     │
│ ├─ Memory Usage > 85% → Scale up                                                  │
│ ├─ Connection Count > 150 per server → Scale up                                   │
│ ├─ Response time > 500ms average → Scale up                                       │
│ └─ Instance creation rate > 10/minute → Pre-scale                                 │
└─────────────────────────────────────────────────────────────────────────────────────┘
```

## 7. Connection Lifecycle Management

### Complete Lifecycle Flow
```
┌─────────────────────────────────────────────────────────────────────────────────────┐
│                            CONNECTION LIFECYCLE MANAGEMENT                         │
└─────────────────────────────────────────────────────────────────────────────────────┘

Phase 1: Pre-Connection
┌─────────────────────────────────────────────────────────────────────────────────────┐
│ 1. Instance Selection          │ 2. Server Discovery      │ 3. Pre-flight Checks    │
│    ├─ User selects instance   │    ├─ Hash instanceId     │    ├─ Network reachable  │
│    ├─ Validate instanceId     │    ├─ Lookup server       │    ├─ Server healthy     │
│    └─ Check instance exists   │    └─ Get WebSocket URL   │    └─ Resource available │
└─────────────────────────────────────────────────────────────────────────────────────┘

Phase 2: Connection Establishment  
┌─────────────────────────────────────────────────────────────────────────────────────┐
│ 4. WebSocket Creation         │ 5. Handshake             │ 6. Registration          │
│    ├─ Create WebSocket        │    ├─ Send connect msg    │    ├─ Register in map    │
│    ├─ Set event handlers      │    ├─ Wait for confirm    │    ├─ Setup health check │
│    └─ Start timeout timer     │    └─ Exchange metadata   │    └─ Send buffered data │
└─────────────────────────────────────────────────────────────────────────────────────┘

Phase 3: Active Connection
┌─────────────────────────────────────────────────────────────────────────────────────┐
│ 7. Message Routing           │ 8. Health Monitoring      │ 9. Error Handling        │
│    ├─ Receive messages       │    ├─ Periodic pings      │    ├─ Detect failures    │
│    ├─ Route to handlers      │    ├─ Latency tracking    │    ├─ Initiate recovery  │
│    └─ Send responses         │    └─ Update health UI    │    └─ Log error details  │
└─────────────────────────────────────────────────────────────────────────────────────┘

Phase 4: Connection Termination
┌─────────────────────────────────────────────────────────────────────────────────────┐
│ 10. Graceful Shutdown       │ 11. Resource Cleanup      │ 12. State Reset          │
│     ├─ Send close message   │     ├─ Remove from maps   │     ├─ Clear handlers     │
│     ├─ Wait for ack         │     ├─ Stop health checks │     ├─ Reset connection   │
│     └─ Close WebSocket      │     └─ Free memory        │     └─ Update UI status   │
└─────────────────────────────────────────────────────────────────────────────────────┘
```

### Lifecycle State Tracking
```
┌─────────────────────────────────────────────────────────────────────────────────────┐
│ interface ConnectionLifecycle {                                                     │
│   state: ConnectionState;                                                           │
│   instanceId: string;                                                              │
│   websocket: WebSocket | null;                                                     │
│   createdAt: Date;                                                                 │
│   connectedAt: Date | null;                                                        │
│   lastMessageAt: Date | null;                                                      │
│   disconnectedAt: Date | null;                                                     │
│   reconnectionAttempts: number;                                                    │
│   totalUptime: number;                                                             │
│   totalDowntime: number;                                                           │
│   messageStats: {                                                                  │
│     sent: number;                                                                  │
│     received: number;                                                              │
│     errors: number;                                                                │
│   };                                                                               │
│   healthHistory: Array<{                                                           │
│     timestamp: Date;                                                               │
│     latency: number;                                                               │
│     status: string;                                                                │
│   }>;                                                                              │
│ }                                                                                   │
└─────────────────────────────────────────────────────────────────────────────────────┘
```

## 8. Implementation Recommendations

### Critical Fixes Required

1. **Fix Instance ID Mapping**
   ```typescript
   // Current problematic code
   connect(instanceId) // "claude-6038 (PID: 1234)"
   
   // Fixed code  
   function normalizeInstanceId(id: string): string {
     return id.includes('(') ? id.split(' (')[0] : id;
   }
   connect(normalizeInstanceId(instanceId)) // "claude-6038"
   ```

2. **Fix Connection Registration**
   ```typescript
   // Backend registration fix
   const baseInstanceId = normalizeInstanceId(message.terminalId);
   if (!wsConnections.has(baseInstanceId)) {
     wsConnections.set(baseInstanceId, new Set());
   }
   wsConnections.get(baseInstanceId).add(websocket);
   ```

3. **Fix Message Broadcasting**
   ```typescript
   // Use consistent instanceId for lookup
   function broadcastToWebSockets(instanceId: string, message: any) {
     const normalizedId = normalizeInstanceId(instanceId);
     const connections = wsConnections.get(normalizedId);
     // ... rest of broadcast logic
   }
   ```

4. **Add Connection Validation**
   ```typescript
   // Verify connection is registered before broadcasting
   function validateConnection(instanceId: string): boolean {
     const normalizedId = normalizeInstanceId(instanceId);
     const connections = wsConnections.get(normalizedId);
     return connections && connections.size > 0;
   }
   ```

### Performance Optimizations

1. **Message Batching**: Group multiple small messages into batches
2. **Connection Pooling**: Reuse connections across instances  
3. **Lazy Loading**: Only connect when instance is actively used
4. **Memory Management**: Implement connection cleanup and garbage collection
5. **Monitoring**: Add comprehensive metrics and alerting

### Security Considerations

1. **Authentication**: Validate client permissions per instance
2. **Rate Limiting**: Prevent connection spam and message flooding
3. **Input Validation**: Sanitize all incoming WebSocket messages
4. **Error Isolation**: Prevent one connection failure from affecting others
5. **Audit Logging**: Track all connection events for security analysis

This architecture design provides a robust, scalable foundation for reliable WebSocket communication between Claude Code and the frontend, addressing the current connection establishment issues while preparing for future scaling requirements.