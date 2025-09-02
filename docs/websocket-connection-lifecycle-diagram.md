# WebSocket Connection Lifecycle Diagram - Agent Feed System

## Connection Flow Sequence Diagram

```mermaid
sequenceDiagram
    participant User
    participant DualMode as DualModeInterface
    participant WSService as WebSocketService
    participant WSClient as WebSocket(Frontend)
    participant WSServer as WebSocket(Backend)
    participant ConnMgr as WebSocketConnectionManager
    participant HealthMon as ConnectionHealthMonitor  
    participant ClaudeAPI as Claude API Manager
    participant Process as Claude Process

    %% Initial Connection Setup
    User->>DualMode: Component loads
    DualMode->>WSService: getGlobalWebSocketService()
    WSService->>WSClient: new WebSocket(ws://localhost:3000)
    WSClient->>WSServer: Connection request
    WSServer->>ConnMgr: registerConnection()
    ConnMgr->>HealthMon: registerConnectionHealth()
    WSServer-->>WSClient: Connection established (OPEN)
    WSClient-->>DualMode: Connected status

    %% Normal Message Flow
    User->>DualMode: Types message
    DualMode->>WSService: sendToInstance()
    WSService->>WSClient: ws.send(message)
    WSClient->>WSServer: Message transmitted
    WSServer->>Process: Forward to Claude process
    Process-->>WSServer: Response data
    WSServer->>ConnMgr: broadcastToInstance()
    ConnMgr-->>WSClient: Response message
    WSClient-->>DualMode: Display response

    %% THE PROBLEMATIC FLOW - 30 Second Drops
    Note over User,Process: 🚨 CRITICAL: The 30-second drop scenario
    User->>DualMode: Complex Claude prompt (>30s processing)
    DualMode->>WSService: sendToInstance()
    WSService->>WSClient: ws.send(message)
    WSClient->>WSServer: Message transmitted
    WSServer->>ClaudeAPI: Long API call starts
    
    %% Parallel timeout processes start here
    par Grace Period Timer
        WSServer->>WSServer: Start 30s grace period timer
    and Health Check Timer  
        HealthMon->>HealthMon: Start health check (60s)
    and Frontend Heartbeat
        WSService->>WSService: Heartbeat every 30s
    and Connection Manager Timer
        ConnMgr->>ConnMgr: Reconnection window 30s
    end

    %% The cascade failure at T=30s
    Note over WSServer,ConnMgr: T=30s: Grace period expires
    WSServer->>WSServer: Mark connection as stale
    WSServer->>ConnMgr: Remove "dead" connection
    ConnMgr->>WSClient: Close connection (code: timeout)
    WSClient->>WSService: Handle disconnection
    WSService-->>DualMode: Connection lost status
    
    %% Claude finally responds (too late)
    ClaudeAPI-->>WSServer: Claude response ready (T=45s)
    WSServer->>ConnMgr: Try to broadcast response
    ConnMgr-->>WSServer: No connections available
    Note over WSServer: Response lost! ❌
    
    %% Frontend attempts reconnection
    WSService->>WSClient: Reconnection attempt
    WSClient->>WSServer: New connection request
    WSServer->>ConnMgr: Register new connection
    Note over User,DualMode: User sees disconnection + reconnection
```

## State Transition Diagram

```mermaid
stateDiagram-v2
    [*] --> Disconnected
    Disconnected --> Connecting: connect()
    Connecting --> Connected: onopen
    Connecting --> Failed: onerror/timeout
    Connected --> Processing: user_input_sent
    Processing --> Connected: response_received
    Processing --> Disconnected: timeout/error
    Connected --> Disconnected: close/error
    Failed --> Connecting: retry_attempt
    Failed --> [*]: max_retries_exceeded
    Disconnected --> [*]: destroy()

    note right of Processing
        🚨 VULNERABLE STATE
        30s timeout kills connection
        even during legitimate processing
    end note
```

## Component Interaction Map

```mermaid
graph TB
    subgraph "Frontend (React)"
        A[DualModeInterface] --> B[WebSocketService]
        B --> C[WebSocket Client]
        D[useRobustWebSocket] --> B
    end
    
    subgraph "Backend (Node.js)"
        E[WebSocket Server] --> F[WebSocketConnectionManager]
        E --> G[ConnectionHealthMonitor]
        E --> H[MessageHandler]
        I[Claude API Manager] --> J[Claude Process]
    end
    
    subgraph "Timeout Mechanisms"
        T1[Frontend Heartbeat: 30s]
        T2[Backend Grace Period: 30s] 
        T3[Health Monitor: 120s]
        T4[Connection Manager: 30s]
        T5[Claude API Timeout: 60s]
    end
    
    %% Connection flows
    C <-->|WebSocket| E
    F --> C
    G --> F
    H --> F
    
    %% Timeout conflicts
    T1 -.->|Conflicts| T2
    T2 -.->|Conflicts| T4  
    T2 -.->|Shorter than| T5
    
    %% Critical failure path
    T2 -->|Triggers| F
    F -->|Closes| C
    I -->|Still processing| J
    
    style T2 fill:#ff6b6b
    style T4 fill:#ff6b6b
    style F fill:#ff9999
```

## Timeline Analysis - 30 Second Drop

```mermaid
gantt
    title Connection Lifecycle During 30s Drop Scenario
    dateFormat X
    axisFormat %Ss

    section User Action
    Complex prompt sent       :active, prompt, 0, 5

    section Claude Processing  
    Claude API call           :active, claude, 0, 45
    
    section Timeout Timers
    Grace period (30s)        :crit, grace, 0, 30
    Health monitor (120s)     :monitor, 0, 120
    Frontend heartbeat (30s)  :heartbeat, 0, 30
    Conn manager (30s)        :connmgr, 0, 30
    
    section Connection State
    Connection alive          :active, conn1, 0, 30
    Connection dead           :crit, dead, 30, 45
    Reconnection attempt      :reconn, 45, 50
    New connection            :active, conn2, 50, 120
    
    section Critical Events
    Grace period expires      :milestone, expire, 30, 0
    Response ready (lost)     :milestone, lost, 45, 0
    Reconnection complete     :milestone, recon, 50, 0
```

## Root Cause Flow Chart

```mermaid
flowchart TD
    A[User sends complex Claude prompt] --> B[WebSocket message sent to backend]
    B --> C[Claude API call initiated]
    C --> D{Will Claude take >30s?}
    
    D -->|Yes| E[Backend starts 30s grace period timer]
    D -->|No| F[Normal flow - response in <30s]
    
    E --> G[T=30s: Grace period expires]
    G --> H[Connection marked as dead]
    H --> I[WebSocket closed by backend]
    I --> J[Frontend detects disconnection]
    J --> K[Frontend attempts reconnect]
    
    C --> L[Claude still processing...]
    L --> M[T=45s: Claude response ready]
    M --> N{Connection still alive?}
    N -->|No| O[❌ Response lost!]
    N -->|Yes| P[✅ Response delivered]
    
    K --> Q[New connection established]
    O --> R[User sees disconnection/reconnection]
    
    style E fill:#ff6b6b
    style G fill:#ff6b6b  
    style H fill:#ff6b6b
    style O fill:#ff0000,color:#ffffff
    style R fill:#ffcc00
```

## Recommended Architecture Fix

```mermaid
graph TB
    subgraph "Current (Broken)"
        C1[Claude API Call] 
        C2[Fixed 30s Grace Period]
        C3[Connection Killed]
        C1 --> C2
        C2 --> C3
    end
    
    subgraph "Fixed Architecture"  
        F1[Claude API Call]
        F2[Dynamic Grace Period]
        F3[Process-Aware Health]
        F4[Connection Preserved]
        
        F1 --> F2
        F1 --> F3
        F2 --> F4
        F3 --> F4
    end
    
    subgraph "Grace Period Logic"
        G1{Is Claude processing?}
        G2[Extend to 5 minutes]
        G3[Standard 30 seconds]
        
        G1 -->|Yes| G2
        G1 -->|No| G3
    end
    
    F2 --> G1
    
    style C2 fill:#ff6b6b
    style C3 fill:#ff0000,color:#ffffff
    style F2 fill:#90EE90
    style F4 fill:#90EE90
```

## Connection Health States

```mermaid
stateDiagram-v2
    [*] --> Healthy
    Healthy --> Slow: high_latency
    Healthy --> Processing: claude_call_active
    Processing --> Healthy: claude_call_complete
    Processing --> ProcessingExtended: exceeds_30s
    ProcessingExtended --> Healthy: claude_call_complete
    Slow --> Healthy: latency_normal
    Slow --> Unhealthy: continued_slow
    Unhealthy --> Dead: multiple_failures
    Dead --> [*]
    
    %% Current system kills connection here
    Processing --> Dead: current_30s_timeout
    
    note right of ProcessingExtended
        NEW STATE: Prevents premature
        connection termination during
        legitimate long operations
    end note
    
    note right of Dead
        Current system: Processing → Dead
        Fixed system: Processing → ProcessingExtended → Healthy
    end note
```

This comprehensive analysis reveals that the 30-second connection drops are a **deterministic design flaw** caused by competing timeout mechanisms. The fix requires making the connection management "Claude-aware" and coordinating timeout values across the system.