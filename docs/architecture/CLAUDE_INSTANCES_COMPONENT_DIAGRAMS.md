# Claude Instances System - Component Diagrams & Data Flow

## System Architecture Overview

```mermaid
graph TB
    subgraph "Client Layer"
        WEB[Web Interface<br/>React UI]
        SYS_TERM[System Terminal<br/>Simple Commands]
    end
    
    subgraph "API Gateway Layer"
        HTTP_API[HTTP REST API<br/>Port 3001]
        WS_API[WebSocket API<br/>Port 3002]
        AUTH[Authentication<br/>Middleware]
    end
    
    subgraph "Core Services Layer"
        CLAUDE_MGR[Claude Manager<br/>Process Lifecycle]
        COMM_MGR[Communication Manager<br/>Message Routing]
        STATE_MGR[State Manager<br/>Persistence]
    end
    
    subgraph "Process Layer"
        PROC_POOL[Process Pool<br/>Instance Management]
        MONITOR[Resource Monitor<br/>Health Checks]
        RECOVERY[Recovery Manager<br/>Auto-healing]
    end
    
    subgraph "Storage Layer"
        MEM_STORE[(Memory Store<br/>Active State)]
        FILE_STORE[(File System<br/>Conversations)]
        CONFIG_STORE[(Configuration<br/>System Settings)]
    end
    
    subgraph "Claude Processes"
        CLAUDE1[Claude Instance 1<br/>PID: 1234]
        CLAUDE2[Claude Instance 2<br/>PID: 5678]
        CLAUDEN[Claude Instance N<br/>PID: 9999]
    end
    
    %% Client to API connections
    WEB --> HTTP_API
    WEB --> WS_API
    SYS_TERM --> HTTP_API
    
    %% API to Auth
    HTTP_API --> AUTH
    WS_API --> AUTH
    
    %% Auth to Core Services
    AUTH --> CLAUDE_MGR
    AUTH --> COMM_MGR
    
    %% Core Services interactions
    CLAUDE_MGR --> PROC_POOL
    CLAUDE_MGR --> STATE_MGR
    COMM_MGR --> PROC_POOL
    COMM_MGR --> STATE_MGR
    
    %% Process Layer interactions
    PROC_POOL --> MONITOR
    PROC_POOL --> RECOVERY
    MONITOR --> RECOVERY
    
    %% Storage connections
    STATE_MGR --> MEM_STORE
    STATE_MGR --> FILE_STORE
    CLAUDE_MGR --> CONFIG_STORE
    
    %% Process connections
    PROC_POOL --> CLAUDE1
    PROC_POOL --> CLAUDE2
    PROC_POOL --> CLAUDEN
    
    %% Monitoring connections
    MONITOR --> CLAUDE1
    MONITOR --> CLAUDE2
    MONITOR --> CLAUDEN
    
    style WEB fill:#e1f5fe
    style SYS_TERM fill:#e8f5e8
    style CLAUDE_MGR fill:#fff3e0
    style PROC_POOL fill:#fce4ec
    style CLAUDE1 fill:#f3e5f5
    style CLAUDE2 fill:#f3e5f5
    style CLAUDEN fill:#f3e5f5
```

## Detailed Component Architecture

### 1. Web Interface Component Structure

```mermaid
graph TB
    subgraph "React Application"
        APP[App Component<br/>Main Router]
        
        subgraph "Claude Interface"
            CLAUDE_UI[Claude Interface<br/>Main Chat UI]
            INST_MGR[Instance Manager<br/>Create/Delete]
            CONV_LIST[Conversation List<br/>History View]
            STATUS_BAR[Status Bar<br/>Connection Info]
        end
        
        subgraph "System Interface"
            SYS_TERM_UI[System Terminal<br/>Command Interface]
            FILE_BROWSER[File Browser<br/>Directory Navigation]
        end
        
        subgraph "Common Components"
            HEADER[Header<br/>Navigation]
            SIDEBAR[Sidebar<br/>Instance List]
            MODAL[Modal Manager<br/>Dialogs]
        end
        
        subgraph "Services Layer"
            API_CLIENT[API Client<br/>HTTP/WebSocket]
            STATE_MGR_UI[State Management<br/>React Context]
            NOTIFY[Notification System<br/>Alerts/Toasts]
        end
    end
    
    APP --> HEADER
    APP --> SIDEBAR
    APP --> CLAUDE_UI
    APP --> SYS_TERM_UI
    
    CLAUDE_UI --> INST_MGR
    CLAUDE_UI --> CONV_LIST
    CLAUDE_UI --> STATUS_BAR
    
    INST_MGR --> MODAL
    CONV_LIST --> MODAL
    
    CLAUDE_UI --> API_CLIENT
    INST_MGR --> API_CLIENT
    SYS_TERM_UI --> API_CLIENT
    
    API_CLIENT --> STATE_MGR_UI
    STATE_MGR_UI --> NOTIFY
    
    style CLAUDE_UI fill:#e3f2fd
    style SYS_TERM_UI fill:#e8f5e8
    style API_CLIENT fill:#fff3e0
```

### 2. Backend Service Architecture

```mermaid
graph TB
    subgraph "HTTP Server (Express)"
        ROUTES[Route Handlers<br/>REST Endpoints]
        MIDDLEWARE[Middleware Stack<br/>Auth, Logging, CORS]
        VALIDATION[Request Validation<br/>Schema Checking]
    end
    
    subgraph "WebSocket Server"
        WS_HANDLER[Connection Handler<br/>Client Management]
        MSG_ROUTER[Message Router<br/>Event Dispatch]
        HEARTBEAT[Heartbeat Manager<br/>Connection Health]
    end
    
    subgraph "Core Business Logic"
        CLAUDE_SERVICE[Claude Service<br/>Instance Operations]
        COMM_SERVICE[Communication Service<br/>Message Handling]
        HEALTH_SERVICE[Health Service<br/>System Monitoring]
    end
    
    subgraph "Data Access Layer"
        INSTANCE_DAO[Instance DAO<br/>Database Operations]
        CONVERSATION_DAO[Conversation DAO<br/>File Operations]
        CONFIG_DAO[Configuration DAO<br/>Settings Management]
    end
    
    subgraph "External Integrations"
        PROCESS_MGR[Process Manager<br/>Child Process Control]
        FILE_SYS[File System<br/>Storage Operations]
        SYSTEM_METRICS[System Metrics<br/>Resource Monitoring]
    end
    
    ROUTES --> MIDDLEWARE
    MIDDLEWARE --> VALIDATION
    VALIDATION --> CLAUDE_SERVICE
    VALIDATION --> COMM_SERVICE
    VALIDATION --> HEALTH_SERVICE
    
    WS_HANDLER --> MSG_ROUTER
    MSG_ROUTER --> HEARTBEAT
    MSG_ROUTER --> COMM_SERVICE
    
    CLAUDE_SERVICE --> INSTANCE_DAO
    CLAUDE_SERVICE --> PROCESS_MGR
    
    COMM_SERVICE --> CONVERSATION_DAO
    COMM_SERVICE --> PROCESS_MGR
    
    HEALTH_SERVICE --> SYSTEM_METRICS
    HEALTH_SERVICE --> INSTANCE_DAO
    
    INSTANCE_DAO --> FILE_SYS
    CONVERSATION_DAO --> FILE_SYS
    CONFIG_DAO --> FILE_SYS
    
    style CLAUDE_SERVICE fill:#e3f2fd
    style COMM_SERVICE fill:#e8f5e8
    style PROCESS_MGR fill:#fff3e0
```

## Data Flow Diagrams

### 3. Instance Creation Flow

```mermaid
sequenceDiagram
    participant UI as Web Interface
    participant API as HTTP API
    participant CM as Claude Manager
    participant PP as Process Pool
    participant CP as Claude Process
    participant SM as State Manager
    participant FS as File Store
    
    UI->>+API: POST /api/claude/instances
    Note over UI,API: Request with config:<br/>command, workdir, limits
    
    API->>+CM: createInstance(config)
    CM->>+PP: spawnProcess(config)
    
    PP->>PP: Validate resource limits
    PP->>+CP: spawn("claude", args)
    CP-->>-PP: Process started (PID)
    
    PP->>+SM: saveInstanceState(instance)
    SM->>+FS: persist(instanceData)
    FS-->>-SM: saved
    SM-->>-PP: state saved
    
    PP-->>-CM: instance created
    CM-->>-API: instance details
    API-->>-UI: 201 Created + instance data
    
    Note over CP: Claude process running<br/>Ready for communication
    
    CP->>PP: stdout/stderr data
    PP->>CM: process output
    CM->>API: WebSocket broadcast
    API->>UI: real-time updates
```

### 4. Message Communication Flow

```mermaid
sequenceDiagram
    participant UI as Web Interface
    participant WS as WebSocket API
    participant CM as Comm Manager
    participant PP as Process Pool
    participant CP as Claude Process
    participant SM as State Manager
    
    UI->>+WS: WebSocket: message:send
    Note over UI,WS: Message content<br/>+ metadata
    
    WS->>+CM: routeMessage(instanceId, message)
    CM->>+PP: sendToInstance(instanceId, data)
    
    PP->>+CP: stdin.write(message)
    Note over CP: Claude processing<br/>input message
    
    CP->>PP: stdout data (response)
    PP->>-CM: processOutput(instanceId, output)
    
    CM->>+SM: saveMessage(conversation, message)
    SM-->>-CM: message saved
    
    CM->>-WS: responseReady(message)
    WS-->>-UI: WebSocket: message:received
    
    Note over UI: Display Claude's<br/>response in UI
```

### 5. Instance Health Monitoring Flow

```mermaid
sequenceDiagram
    participant HM as Health Monitor
    participant CP as Claude Process
    participant RM as Recovery Manager
    participant PP as Process Pool
    participant API as WebSocket API
    participant UI as Web Interface
    
    loop Every 5 seconds
        HM->>+CP: Check process health
        alt Process healthy
            CP-->>-HM: Health metrics
            HM->>API: Broadcast health update
        else Process unresponsive
            CP-->>-HM: No response/error
            HM->>+RM: initiateRecovery(instanceId)
            
            RM->>+PP: terminateInstance(instanceId)
            PP->>CP: SIGTERM
            Note over CP: Graceful shutdown
            PP-->>-RM: Process terminated
            
            RM->>+PP: recreateInstance(config)
            PP-->>-RM: New instance created
            
            RM-->>-HM: Recovery complete
            HM->>API: Broadcast recovery status
        end
        
        API->>UI: Real-time health updates
    end
```

### 6. System Terminal Separation

```mermaid
graph TB
    subgraph "Current Monolithic Terminal"
        MONO_TERM[Terminal Component<br/>Mixed Concerns]
        CLAUDE_LOGIC[Claude CLI Logic<br/>Cascade Prevention]
        XTERM_COMPLEX[XTerm Integration<br/>Width Calculations]
        WEBSOCKET_COMPLEX[WebSocket Complexity<br/>Protocol Handling]
    end
    
    subgraph "New Separated Architecture"
        subgraph "Claude Interface"
            CLAUDE_UI[Claude Chat UI<br/>Clean React Interface]
            MSG_INPUT[Message Input<br/>Simple Text Field]
            CONV_DISPLAY[Conversation Display<br/>Message List]
            CLAUDE_WS[Claude WebSocket<br/>Dedicated Connection]
        end
        
        subgraph "System Terminal"
            SYS_TERM[System Terminal<br/>Commands Only]
            SIMPLE_XTERM[Simple XTerm<br/>Basic Terminal]
            SYS_WS[System WebSocket<br/>Shell Commands]
        end
        
        subgraph "Shared Services"
            API_LAYER[API Layer<br/>Unified Backend]
            AUTH_SERVICE[Authentication<br/>Shared Security]
        end
    end
    
    MONO_TERM -.-> CLAUDE_UI
    CLAUDE_LOGIC -.-> CLAUDE_UI
    XTERM_COMPLEX -.-> SIMPLE_XTERM
    WEBSOCKET_COMPLEX -.-> CLAUDE_WS
    WEBSOCKET_COMPLEX -.-> SYS_WS
    
    CLAUDE_UI --> API_LAYER
    SYS_TERM --> API_LAYER
    API_LAYER --> AUTH_SERVICE
    
    style MONO_TERM fill:#ffcdd2
    style CLAUDE_LOGIC fill:#ffcdd2
    style XTERM_COMPLEX fill:#ffcdd2
    style WEBSOCKET_COMPLEX fill:#ffcdd2
    
    style CLAUDE_UI fill:#c8e6c9
    style SYS_TERM fill:#c8e6c9
    style API_LAYER fill:#c8e6c9
```

## Process Lifecycle Management

### 7. Instance Lifecycle State Machine

```mermaid
stateDiagram-v2
    [*] --> Creating: Create Request
    
    Creating --> Starting: Process Spawned
    Creating --> Failed: Spawn Error
    
    Starting --> Running: Process Ready
    Starting --> Failed: Startup Error
    Starting --> Creating: Retry
    
    Running --> Stopping: Terminate Request
    Running --> Error: Process Error
    Running --> Running: Normal Operation
    
    Error --> Recovering: Auto Recovery
    Error --> Failed: Recovery Failed
    Error --> Stopping: Manual Termination
    
    Recovering --> Starting: Recovery Process
    Recovering --> Failed: Recovery Error
    
    Stopping --> Stopped: Graceful Shutdown
    Stopping --> Killed: Force Termination
    
    Stopped --> [*]: Cleanup Complete
    Failed --> [*]: Error Handled
    Killed --> [*]: Force Complete
    
    note right of Running
        Normal state for 
        active instances
    end note
    
    note right of Recovering
        Auto-healing process
        attempts restart
    end note
```

### 8. Resource Management Architecture

```mermaid
graph TB
    subgraph "Resource Monitor"
        CPU_MON[CPU Monitor<br/>Usage Tracking]
        MEM_MON[Memory Monitor<br/>Usage Tracking] 
        DISK_MON[Disk Monitor<br/>Usage Tracking]
        NET_MON[Network Monitor<br/>Connection Tracking]
    end
    
    subgraph "Limit Enforcement"
        CPU_LIMIT[CPU Limiter<br/>Process Throttling]
        MEM_LIMIT[Memory Limiter<br/>Process Killing]
        CONN_LIMIT[Connection Limiter<br/>Rate Limiting]
    end
    
    subgraph "Alert System"
        THRESHOLD_CHECK[Threshold Checker<br/>Rule Engine]
        ALERT_MGR[Alert Manager<br/>Notification System]
        ESCALATION[Escalation Manager<br/>Auto-actions]
    end
    
    subgraph "Claude Processes"
        CLAUDE_A[Claude Instance A]
        CLAUDE_B[Claude Instance B]  
        CLAUDE_C[Claude Instance C]
    end
    
    CPU_MON --> CLAUDE_A
    CPU_MON --> CLAUDE_B
    CPU_MON --> CLAUDE_C
    
    MEM_MON --> CLAUDE_A
    MEM_MON --> CLAUDE_B
    MEM_MON --> CLAUDE_C
    
    CPU_MON --> THRESHOLD_CHECK
    MEM_MON --> THRESHOLD_CHECK
    DISK_MON --> THRESHOLD_CHECK
    NET_MON --> THRESHOLD_CHECK
    
    THRESHOLD_CHECK --> ALERT_MGR
    THRESHOLD_CHECK --> CPU_LIMIT
    THRESHOLD_CHECK --> MEM_LIMIT
    THRESHOLD_CHECK --> CONN_LIMIT
    
    ALERT_MGR --> ESCALATION
    
    CPU_LIMIT --> CLAUDE_A
    CPU_LIMIT --> CLAUDE_B
    CPU_LIMIT --> CLAUDE_C
    
    MEM_LIMIT --> CLAUDE_A
    MEM_LIMIT --> CLAUDE_B
    MEM_LIMIT --> CLAUDE_C
    
    style CPU_MON fill:#e3f2fd
    style MEM_MON fill:#e3f2fd
    style DISK_MON fill:#e3f2fd
    style NET_MON fill:#e3f2fd
    
    style CPU_LIMIT fill:#ffecb3
    style MEM_LIMIT fill:#ffecb3
    style CONN_LIMIT fill:#ffecb3
    
    style CLAUDE_A fill:#f3e5f5
    style CLAUDE_B fill:#f3e5f5  
    style CLAUDE_C fill:#f3e5f5
```

## Security Architecture

### 9. Authentication & Authorization Flow

```mermaid
sequenceDiagram
    participant Client as Web Client
    participant Auth as Auth Middleware
    participant JWT as JWT Service
    participant RBAC as RBAC Service
    participant API as API Handler
    participant Claude as Claude Manager
    
    Client->>+Auth: Request with token
    Auth->>+JWT: validateToken(token)
    JWT-->>-Auth: token valid + claims
    
    Auth->>+RBAC: checkPermission(userId, resource, action)
    RBAC-->>-Auth: permission granted
    
    Auth->>+API: authorized request
    API->>+Claude: perform operation
    Claude-->>-API: operation result
    API-->>-Auth: response
    Auth-->>-Client: authorized response
    
    alt Invalid token
        JWT-->>Auth: token invalid
        Auth-->>Client: 401 Unauthorized
    else Insufficient permissions
        RBAC-->>Auth: permission denied
        Auth-->>Client: 403 Forbidden
    end
```

### 10. Network Security Architecture

```mermaid
graph TB
    subgraph "External Access"
        INTERNET[Internet]
        FIREWALL[Firewall<br/>Port Filtering]
        LOAD_BALANCER[Load Balancer<br/>SSL Termination]
    end
    
    subgraph "DMZ Layer"
        REVERSE_PROXY[Reverse Proxy<br/>Nginx/Apache]
        WAF[Web Application Firewall<br/>Request Filtering]
        RATE_LIMITER[Rate Limiter<br/>DDoS Protection]
    end
    
    subgraph "Application Layer"
        API_GATEWAY[API Gateway<br/>Authentication]
        WS_GATEWAY[WebSocket Gateway<br/>Secure Connections]
    end
    
    subgraph "Internal Network"
        CLAUDE_SERVICES[Claude Services<br/>Internal Only]
        DATABASE[Database<br/>Encrypted Storage]
        FILE_STORAGE[File Storage<br/>Access Control]
    end
    
    INTERNET --> FIREWALL
    FIREWALL --> LOAD_BALANCER
    LOAD_BALANCER --> REVERSE_PROXY
    
    REVERSE_PROXY --> WAF
    WAF --> RATE_LIMITER
    RATE_LIMITER --> API_GATEWAY
    RATE_LIMITER --> WS_GATEWAY
    
    API_GATEWAY --> CLAUDE_SERVICES
    WS_GATEWAY --> CLAUDE_SERVICES
    
    CLAUDE_SERVICES --> DATABASE
    CLAUDE_SERVICES --> FILE_STORAGE
    
    style FIREWALL fill:#ffcdd2
    style WAF fill:#ffcdd2
    style API_GATEWAY fill:#ffcdd2
    style WS_GATEWAY fill:#ffcdd2
    
    style CLAUDE_SERVICES fill:#c8e6c9
    style DATABASE fill:#c8e6c9
    style FILE_STORAGE fill:#c8e6c9
```

This comprehensive component architecture provides clear separation of concerns, scalable design patterns, and robust security measures for the dedicated Claude instances system. Each diagram shows specific aspects of the system's design, from high-level overview to detailed process flows and security considerations.