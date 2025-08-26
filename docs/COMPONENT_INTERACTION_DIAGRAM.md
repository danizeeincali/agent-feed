# Component Interaction Diagram
*Detailed mapping of frontend-backend component relationships*

## 🔄 System Component Flow

```mermaid
sequenceDiagram
    participant U as User
    participant CIM as ClaudeInstanceManager
    participant Hook as useClaudeInstances
    participant WS as WebSocketProvider
    participant API as Main Server (3000)
    participant CIA as Claude Instances API (3001)
    participant TS as Terminal Server (3002)
    participant CLI as Claude CLI Process

    %% Claude Instance Creation Flow
    U->>CIM: Click "Launch Claude"
    CIM->>Hook: createInstance(config)
    Hook->>WS: emit('instance:create', config)
    WS->>API: WebSocket message
    API->>CIA: HTTP POST /api/claude/instances
    CIA->>CLI: spawn('claude', args)
    CLI-->>CIA: Process started (PID)
    CIA-->>API: Instance created response
    API-->>WS: emit('instance:created', instance)
    WS-->>Hook: instance:created event
    Hook-->>CIM: Instance state updated
    CIM-->>U: Button shows "Running" state

    %% Chat Communication Flow  
    U->>CIM: Send message to Claude
    CIM->>Hook: sendMessage(instanceId, message)
    Hook->>WS: emit('chat:message', message)
    WS->>API: Route to instance
    API->>CIA: Forward message to instance
    CIA->>CLI: Send via stdin
    CLI-->>CIA: Response via stdout  
    CIA-->>API: Chat response
    API-->>WS: emit('chat:response', response)
    WS-->>Hook: chat:response event
    Hook-->>CIM: Display response
    CIM-->>U: Show Claude's response

    %% Terminal Integration Flow
    U->>CIM: Open terminal for instance
    CIM->>WS: Request terminal connection
    WS->>API: Terminal request
    API->>TS: Create terminal session
    TS-->>API: Terminal session created
    API-->>WS: Terminal session ready
    WS-->>CIM: Terminal connection established
    CIM-->>U: Terminal interface active

    %% Status Monitoring Flow
    loop Status Updates
        CLI-->>CIA: Process metrics
        CIA-->>API: Status update
        API-->>WS: Broadcast status
        WS-->>Hook: instance:status event
        Hook-->>CIM: Update UI status
    end

    %% Error Handling Flow
    CLI-->>CIA: Process error/exit
    CIA-->>API: Instance error
    API-->>WS: emit('instance:error', error)
    WS-->>Hook: instance:error event
    Hook-->>CIM: Show error state
    CIM-->>U: Display error message
```

## 🏗 Frontend Component Architecture

```mermaid
graph TB
    %% Main App Components
    APP[App.tsx<br/>Main Application]
    
    %% Page Components  
    DUAL[DualInstance.tsx<br/>Main Page Layout]
    CIM[ClaudeInstanceManager.tsx<br/>Instance Management UI]
    
    %% Claude Instance Components
    CIMD[ClaudeInstanceManagementDemo.tsx<br/>Demo Interface]
    CIS[ClaudeInstanceSelector.tsx<br/>Instance Selection]
    ECI[EnhancedChatInterface.tsx<br/>Chat Interface]
    ISI[InstanceStatusIndicator.tsx<br/>Status Display]
    IUZ[ImageUploadZone.tsx<br/>File Upload]
    
    %% Terminal Components
    TL[TerminalLauncher.tsx<br/>Terminal UI]
    TC[TerminalComponent.tsx<br/>XTerm Interface]
    
    %% Hooks & Context
    WSP[RobustWebSocketProvider.tsx<br/>WebSocket Context]
    UCI[useClaudeInstances.ts<br/>Instance Management Hook]
    UWS[useWebSocket.ts<br/>WebSocket Hook]
    UT[useTerminal.ts<br/>Terminal Hook]
    
    %% Utilities
    WSU[websocket-url.ts<br/>URL Generation]
    
    %% Component Relationships
    APP --> DUAL
    DUAL --> CIM
    DUAL --> TL
    
    CIM --> CIMD
    CIMD --> CIS
    CIMD --> ECI  
    CIMD --> ISI
    ECI --> IUZ
    
    TL --> TC
    
    %% Hook Dependencies
    CIM -.-> UCI
    CIMD -.-> UCI
    UCI -.-> WSP
    TL -.-> UT
    UT -.-> UWS
    UWS -.-> WSU
    WSP -.-> UWS
    
    %% Context Flow
    APP -.-> WSP
    WSP -.-> UWS
    
    classDef component fill:#e1f5fe
    classDef hook fill:#f3e5f5  
    classDef context fill:#e8f5e8
    classDef util fill:#fff3e0
    
    class APP,DUAL,CIM,CIMD,CIS,ECI,ISI,IUZ,TL,TC component
    class UCI,UWS,UT hook
    class WSP context
    class WSU util
```

## 🔌 WebSocket Event Flow

### Frontend to Backend Events
```typescript
// Instance Management Events
interface FrontendToBackendEvents {
  // Instance Lifecycle
  'instance:create': (config: ClaudeInstanceConfig) => void;
  'instance:start': (data: { instanceId: string }) => void;
  'instance:stop': (data: { instanceId: string }) => void;
  'instance:delete': (data: { instanceId: string }) => void;
  'instances:list': () => void;
  
  // Communication  
  'chat:message': (message: ChatMessage) => void;
  'instance:command': (data: { instanceId: string; command: ClaudeInstanceCommand }) => void;
  
  // Terminal
  'terminal:create': (data: { instanceId?: string }) => void;
  'terminal:input': (data: { terminalId: string; input: string }) => void;
  'terminal:resize': (data: { terminalId: string; cols: number; rows: number }) => void;
  
  // Monitoring
  'heartbeat': (data?: any) => void;
  'registerFrontend': (data: { clientType: 'web'; version: string }) => void;
}
```

### Backend to Frontend Events
```typescript
interface BackendToFrontendEvents {
  // Instance Lifecycle
  'instances:list': (instances: ClaudeInstance[]) => void;
  'instance:created': (instance: ClaudeInstance) => void;
  'instance:started': (status: ClaudeInstanceStatus) => void;
  'instance:stopped': (status: ClaudeInstanceStatus) => void;
  'instance:error': (data: { instanceId: string; error: string }) => void;
  'instance:status': (status: ClaudeInstanceStatus) => void;
  
  // Communication
  'chat:message': (message: ChatMessage) => void;
  'instance:output': (message: ClaudeInstanceMessage) => void;
  
  // Terminal  
  'terminal:created': (data: { terminalId: string; instanceId?: string }) => void;
  'terminal:output': (data: { terminalId: string; output: string }) => void;
  'terminal:error': (data: { terminalId: string; error: string }) => void;
  'terminal:closed': (data: { terminalId: string; code: number }) => void;
  
  // Monitoring
  'heartbeatAck': (data: { timestamp: string; uptime: number }) => void;
  'hubRegistered': (data: { clientId: string; type: string }) => void;
  'metrics:update': (metric: InstanceMetrics) => void;
}
```

## 🏢 Backend Service Architecture

```mermaid
graph TB
    %% External Clients
    FE[Frontend<br/>Port 5173]
    
    %% Main Backend Service
    MAIN[Main Backend Server<br/>Port 3000<br/>❌ MISSING]
    
    %% Microservices
    CIA[Claude Instances API<br/>Port 3001]
    TS[Terminal Server<br/>Port 3002] 
    WH[WebSocket Hub<br/>Port 3003]
    
    %% External Processes
    CLAUDE1[Claude Instance 1<br/>PID: dynamic]
    CLAUDE2[Claude Instance 2<br/>PID: dynamic]
    TERMINAL1[Terminal Session 1<br/>PTY Process]
    TERMINAL2[Terminal Session 2<br/>PTY Process]
    
    %% Storage & State
    MEM[(In-Memory State<br/>Process Registry)]
    FS[File System<br/>Working Directories]
    
    %% Frontend Communication
    FE -->|HTTP /api/*| MAIN
    FE -->|WebSocket /socket.io| MAIN
    
    %% Main Server Routing
    MAIN -->|Proxy /api/claude/*| CIA
    MAIN -->|WebSocket routing| WH
    MAIN -->|Terminal sessions| TS
    
    %% Service Interactions
    CIA --> CLAUDE1
    CIA --> CLAUDE2
    CIA --> MEM
    
    TS --> TERMINAL1
    TS --> TERMINAL2
    TS --> FS
    
    WH -.->|Message routing| CIA
    WH -.->|Message routing| TS
    
    %% Data Flow
    CLAUDE1 -.->|stdout/stderr| CIA
    CLAUDE2 -.->|stdout/stderr| CIA
    TERMINAL1 -.->|PTY output| TS
    TERMINAL2 -.->|PTY output| TS
    
    %% Status Indicators
    classDef missing stroke:#ff4444,stroke-width:3px
    classDef working stroke:#44ff44,stroke-width:2px
    classDef process stroke:#4488ff,stroke-width:2px
    classDef storage stroke:#ff8844,stroke-width:2px
    
    class MAIN missing
    class CIA,TS,WH working
    class CLAUDE1,CLAUDE2,TERMINAL1,TERMINAL2 process
    class MEM,FS storage
```

## 🔄 Data Flow Patterns

### 1. Claude Instance Lifecycle
```mermaid
stateDiagram-v2
    [*] --> Creating: User clicks Launch
    Creating --> Starting: Instance created
    Starting --> Running: Process spawned
    Running --> Stopping: User stops
    Running --> Error: Process crashes
    Stopping --> Stopped: Clean shutdown
    Error --> Starting: Auto-restart
    Stopped --> Starting: User restarts
    Stopped --> [*]: User deletes
    Error --> [*]: Delete on error
    
    Creating: Creating<br/>- Validating config<br/>- Allocating resources
    Starting: Starting<br/>- Spawning process<br/>- Establishing connections
    Running: Running<br/>- Processing messages<br/>- Monitoring health
    Stopping: Stopping<br/>- Graceful shutdown<br/>- Cleanup resources
    Stopped: Stopped<br/>- Process terminated<br/>- Resources released
    Error: Error<br/>- Process failed<br/>- Error logged
```

### 2. Message Flow Patterns
```mermaid
flowchart TD
    %% User Input
    USER[User Types Message]
    
    %% Frontend Processing
    UI[Chat Interface<br/>EnhancedChatInterface]
    VALIDATE[Input Validation<br/>& Image Processing]
    
    %% Hook Layer
    HOOK[useClaudeInstances<br/>sendMessage()]
    
    %% WebSocket Layer  
    WS_OUT[WebSocket Emit<br/>chat:message]
    
    %% Backend Processing
    MAIN_SERVER[Main Server<br/>Port 3000]
    ROUTE[Message Routing<br/>to Instance API]
    
    %% Instance Processing
    INSTANCE_API[Claude Instances API<br/>Port 3001]
    PROCESS[Claude CLI Process<br/>stdin/stdout]
    
    %% Response Path
    RESPONSE[Claude Response<br/>stdout capture]
    WS_IN[WebSocket Emit<br/>chat:response]
    HOOK_UPDATE[Hook Update<br/>Message State]
    UI_UPDATE[UI Update<br/>Display Response]
    
    %% Flow Connections
    USER --> UI
    UI --> VALIDATE
    VALIDATE --> HOOK
    HOOK --> WS_OUT
    WS_OUT --> MAIN_SERVER
    MAIN_SERVER --> ROUTE
    ROUTE --> INSTANCE_API
    INSTANCE_API --> PROCESS
    
    PROCESS --> RESPONSE
    RESPONSE --> WS_IN
    WS_IN --> HOOK_UPDATE
    HOOK_UPDATE --> UI_UPDATE
    
    %% Error Paths
    PROCESS -.->|Error| ERROR[Error Handling]
    ERROR -.-> WS_IN
    
    classDef frontend fill:#e3f2fd
    classDef backend fill:#f3e5f5
    classDef process fill:#e8f5e8
    classDef error fill:#ffebee
    
    class USER,UI,VALIDATE,HOOK,WS_OUT,HOOK_UPDATE,UI_UPDATE frontend
    class MAIN_SERVER,ROUTE,INSTANCE_API,WS_IN backend  
    class PROCESS,RESPONSE process
    class ERROR error
```

## 🚨 Critical Integration Points

### 1. Missing Main Server (Port 3000)
**Problem:** Frontend expects unified backend on port 3000
**Impact:** All API calls and WebSocket connections fail
**Solution:** Create main orchestration server

### 2. WebSocket Event Mapping  
**Problem:** Frontend emits events that no backend handles
**Impact:** Claude instance management buttons don't work
**Solution:** Implement complete event handlers in main server

### 3. Process Management Integration
**Problem:** Claude Instances API has no real process spawning
**Impact:** Instances are created but don't actually run Claude
**Solution:** Integrate actual Claude CLI process management

### 4. Terminal Integration
**Problem:** Terminal server runs independently 
**Impact:** No integration with Claude instances
**Solution:** Coordinate terminal sessions with instance lifecycle

## 📋 Implementation Checklist

### Phase 1: Core Infrastructure
- [ ] Create main backend server (Port 3000)
- [ ] Implement HTTP API routing (`/api/*`)
- [ ] Add Socket.IO server (`/socket.io`)
- [ ] Resolve port conflicts (move WebSocket hub to 3003)

### Phase 2: Claude Integration  
- [ ] Implement real Claude CLI process spawning
- [ ] Add process lifecycle management
- [ ] Create WebSocket event handlers for instance management
- [ ] Add error handling and recovery

### Phase 3: Frontend-Backend Binding
- [ ] Test all Claude instance management buttons
- [ ] Verify WebSocket event flow
- [ ] Implement real-time status updates
- [ ] Add comprehensive error states

### Phase 4: Terminal Integration
- [ ] Coordinate terminal sessions with instances
- [ ] Add instance-specific terminal access
- [ ] Implement terminal-to-instance communication
- [ ] Add terminal session persistence

## 🎯 Success Criteria

1. **Functional Buttons:** All Claude instance management buttons work
2. **Real Processes:** Actual Claude CLI processes are spawned and managed  
3. **Live Communication:** Real-time chat with Claude instances
4. **Status Updates:** Live status monitoring and updates
5. **Error Handling:** Comprehensive error states and recovery
6. **Terminal Integration:** Terminal access for each Claude instance

---

*This diagram shows the complete component interaction flow and identifies the critical missing piece: a main backend server that orchestrates all the existing microservices and provides the unified API the frontend expects.*