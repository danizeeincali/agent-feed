# Component Relationship Diagram - Claude Instance Management UI

## High-Level System Architecture

```mermaid
graph TB
    subgraph "Frontend Layer"
        A[App.tsx] --> B[Layout Component]
        B --> C[ClaudeInstanceHub]
        
        subgraph "Instance Management"
            C --> D[InstanceManager]
            C --> E[InstanceList]
            C --> F[InstanceCreator]
            D --> G[InstanceCard]
            D --> H[InstanceMetrics]
        end
        
        subgraph "Conversation Interface"
            C --> I[ConversationPanel]
            I --> J[MessageList]
            I --> K[InputComposer]
            I --> L[AttachmentPreview]
            K --> M[FileUploadZone]
            M --> N[DragDropHandler]
        end
        
        subgraph "Real-time Communication"
            O[RobustWebSocketProvider] --> P[WebSocket Manager]
            P --> Q[Channel Router]
            Q --> R[Instance Channels]
            Q --> S[File Channels]
            Q --> T[System Channels]
        end
        
        subgraph "State Management"
            U[useClaudeInstances] --> V[Instance State]
            W[useConversation] --> X[Message State]
            Y[useFileUpload] --> Z[Upload State]
            AA[useInstanceMetrics] --> BB[Metrics State]
        end
    end
    
    subgraph "Backend Layer"
        CC[Express Server] --> DD[Claude Instance API]
        CC --> EE[WebSocket Server]
        CC --> FF[File Upload API]
        
        subgraph "Claude Instances"
            DD --> GG[Instance Manager Service]
            GG --> HH[Claude Process 1]
            GG --> II[Claude Process 2]
            GG --> JJ[Claude Process N]
        end
        
        subgraph "File Processing"
            FF --> KK[Image Processor]
            FF --> LL[File Storage]
            KK --> MM[Format Converter]
            KK --> NN[Metadata Extractor]
        end
    end
    
    subgraph "Data Flow"
        C -.-> O
        U -.-> P
        W -.-> P
        Y -.-> P
        P -.-> EE
        EE -.-> DD
        EE -.-> FF
    end
```

## Detailed Component Relationships

### 1. Primary Component Flow

```mermaid
sequenceDiagram
    participant User
    participant Hub as ClaudeInstanceHub
    participant Manager as InstanceManager
    participant Conv as ConversationPanel
    participant WS as WebSocket
    participant API as Backend API
    
    User->>Hub: Navigate to Claude Instances
    Hub->>Manager: Load Instance List
    Manager->>API: GET /api/claude/instances
    API-->>Manager: Instance Data
    Manager-->>Hub: Display Instances
    
    User->>Hub: Select Instance
    Hub->>Conv: Load Conversation
    Hub->>WS: Subscribe to Instance
    Conv->>API: GET /api/claude/{id}/messages
    API-->>Conv: Message History
    
    User->>Conv: Send Message
    Conv->>WS: Emit Message
    WS->>API: Route to Instance
    API-->>WS: Response Stream
    WS-->>Conv: Display Response
```

### 2. State Management Relationships

```mermaid
graph LR
    subgraph "Hook Layer"
        A[useClaudeInstances] --> B[Instance Operations]
        C[useConversation] --> D[Message Operations]
        E[useFileUpload] --> F[File Operations]
        G[useInstanceMetrics] --> H[Metrics Operations]
    end
    
    subgraph "Context Layer"
        I[WebSocketContext] --> J[Connection State]
        K[InstanceContext] --> L[Instance State]
        M[ConversationContext] --> N[Message State]
    end
    
    subgraph "Service Layer"
        O[ClaudeAPI] --> P[HTTP Requests]
        Q[WebSocketService] --> R[Real-time Events]
        S[FileService] --> T[Upload/Download]
    end
    
    B --> I
    D --> M
    F --> E
    H --> K
    
    J --> Q
    L --> O
    N --> O
```

### 3. File Upload Component Relationships

```mermaid
graph TD
    A[FileUploadZone] --> B[DragDropHandler]
    A --> C[FilePreview]
    A --> D[UploadProgress]
    
    B --> E[File Validation]
    E --> F[Thumbnail Generation]
    F --> G[Upload Queue]
    
    G --> H[ChunkedUploader]
    H --> I[Progress Tracker]
    I --> J[WebSocket Events]
    
    J --> K[Backend File API]
    K --> L[File Storage]
    K --> M[Image Processor]
    
    M --> N[Format Conversion]
    M --> O[Metadata Extraction]
    M --> P[Claude Integration]
```

## Integration Points with Existing System

### 1. Router Integration

```mermaid
graph LR
    A[App.tsx] --> B[BrowserRouter]
    B --> C[Layout]
    C --> D[Routes]
    
    D --> E["/claude-instances"]
    D --> F["/dual-instance"]
    D --> G["/agents"]
    D --> H["/* (existing)"]
    
    E --> I[ClaudeInstanceHub]
    F --> J[DualInstancePage]
    G --> K[AgentManager]
    
    I --> L[New Architecture]
    J --> M[Legacy Support]
    K --> N[Existing System]
```

### 2. WebSocket Provider Enhancement

```mermaid
graph TB
    subgraph "Enhanced WebSocket Architecture"
        A[RobustWebSocketProvider] --> B[Multi-Channel Support]
        A --> C[Connection Pooling]
        A --> D[Message Queuing]
        
        B --> E[Instance Channels]
        B --> F[System Channels]
        B --> G[File Channels]
        
        C --> H[Instance Connections]
        C --> I[Shared Connections]
        
        D --> J[Offline Queue]
        D --> K[Priority Queue]
    end
    
    subgraph "Legacy Support"
        L[Existing Components] --> M[WebSocketContext]
        M --> A
        
        N[Terminal Components] --> O[TerminalWebSocket]
        O --> A
    end
```

### 3. API Service Extension

```mermaid
graph LR
    subgraph "Current API Service"
        A[ApiService] --> B[Agent Management]
        A --> C[Task Management] 
        A --> D[Workflow Management]
    end
    
    subgraph "Claude API Extension"
        E[ClaudeApiService] --> F[Instance Management]
        E --> G[Conversation Management]
        E --> H[File Operations]
    end
    
    subgraph "Unified Interface"
        I[ExtendedApiService] --> A
        I --> E
        J[Components] --> I
    end
```

## Data Flow Architecture

### 1. Instance Lifecycle Flow

```mermaid
stateDiagram-v2
    [*] --> Idle
    Idle --> Creating: User clicks "Create Instance"
    Creating --> Starting: API call successful
    Creating --> Error: API call failed
    Starting --> Running: Process started
    Starting --> Error: Process failed
    Running --> Processing: Receiving messages
    Processing --> Running: Message complete
    Running --> Terminating: User stops instance
    Terminating --> Idle: Process cleaned up
    Error --> Idle: User resets
```

### 2. Message Processing Flow

```mermaid
flowchart TD
    A[User Input] --> B{Has Attachments?}
    B -->|Yes| C[Upload Files]
    B -->|No| D[Send Message]
    
    C --> E{Upload Success?}
    E -->|Yes| F[Attach File IDs]
    E -->|No| G[Show Error]
    
    F --> D
    D --> H[WebSocket Send]
    
    H --> I[Backend Processing]
    I --> J[Claude Instance]
    J --> K[Response Generation]
    
    K --> L[WebSocket Response]
    L --> M[UI Update]
    M --> N[Message Display]
    
    G --> O[Retry Option]
    O --> C
```

### 3. Real-time Synchronization Flow

```mermaid
sequenceDiagram
    participant UI as UI Component
    participant WS as WebSocket
    participant BE as Backend
    participant CI as Claude Instance
    
    Note over UI,CI: Multiple instances running
    
    UI->>WS: Subscribe to instance events
    BE->>WS: Instance status update
    WS->>UI: Update instance list
    
    CI->>BE: Response ready
    BE->>WS: Message event
    WS->>UI: New message
    UI->>UI: Update conversation
    
    CI->>BE: Process complete
    BE->>WS: Status change
    WS->>UI: Update instance status
```

## Performance Considerations

### 1. Component Optimization

```mermaid
graph TD
    subgraph "Optimization Strategies"
        A[React.memo] --> B[Prevent Unnecessary Rerenders]
        C[useMemo] --> D[Expensive Calculations]
        E[useCallback] --> F[Stable Function References]
        G[Virtual Scrolling] --> H[Large Message Lists]
        I[Lazy Loading] --> J[Component Code Splitting]
    end
    
    subgraph "Applied To"
        B --> K[InstanceCard]
        B --> L[MessageItem]
        D --> M[Message Parsing]
        D --> N[File Processing]
        F --> O[Event Handlers]
        H --> P[ConversationPanel]
        J --> Q[Heavy Components]
    end
```

### 2. State Update Optimization

```mermaid
graph LR
    subgraph "State Updates"
        A[Batch Updates] --> B[React 18 Automatic Batching]
        C[Debounced Updates] --> D[Typing Indicators]
        E[Selective Updates] --> F[Component Subscriptions]
        G[Immutable Updates] --> H[State Consistency]
    end
    
    subgraph "Implementation"
        B --> I[startTransition]
        D --> J[useDebounce Hook]
        F --> K[Event Filtering]
        H --> L[Immer Integration]
    end
```

## Error Handling Relationships

```mermaid
graph TB
    subgraph "Error Boundary Hierarchy"
        A[GlobalErrorBoundary] --> B[RouteErrorBoundary]
        B --> C[ComponentErrorBoundary]
        
        C --> D[ClaudeInstanceError]
        C --> E[ConversationError]
        C --> F[FileUploadError]
        
        D --> G[Instance Fallback UI]
        E --> H[Message Error UI]
        F --> I[Upload Retry UI]
    end
    
    subgraph "Error Recovery"
        J[Connection Lost] --> K[Reconnection Strategy]
        L[API Failure] --> M[Retry with Backoff]
        N[Instance Crash] --> O[Restart Process]
        
        K --> P[Queue Messages]
        M --> Q[User Notification]
        O --> R[State Recovery]
    end
```

## Backward Compatibility Strategy

```mermaid
graph LR
    subgraph "Migration Phases"
        A[Phase 1: Foundation] --> B[New Components]
        B --> C[Phase 2: Integration]
        C --> D[Phase 3: Migration]
        D --> E[Phase 4: Cleanup]
    end
    
    subgraph "Compatibility Layer"
        F[Legacy Components] --> G[Adapter Layer]
        G --> H[New Architecture]
        
        I[Old API Calls] --> J[API Bridge]
        J --> K[New API Service]
        
        L[Legacy State] --> M[State Bridge]
        M --> N[New State Management]
    end
    
    A --> F
    B --> G
    C --> I
    D --> L
```

This comprehensive component relationship diagram shows how the Claude Instance Management UI integrates with the existing system while providing a clear migration path and maintaining backward compatibility. The architecture emphasizes scalability, performance, and maintainability through well-defined component relationships and data flow patterns.