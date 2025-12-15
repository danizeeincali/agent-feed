# @ Mention System - System Architecture Diagrams

## High-Level System Architecture

```mermaid
graph TB
    subgraph "Frontend Layer"
        A[React Components]
        A --> A1[MentionSystem]
        A --> A2[PostingInterface]
        A --> A3[SocialMediaFeed]
        
        A1 --> B[State Management]
        B --> B1[MentionContext]
        B --> B2[LocalState]
        B --> B3[Cache Layer]
    end
    
    subgraph "API Layer"
        C[MentionAPI]
        C --> C1[AgentSearchAPI]
        C --> C2[UserSearchAPI]
        C --> C3[ChannelSearchAPI]
        C --> C4[StatusAPI]
    end
    
    subgraph "Real-time Layer"
        D[WebSocket Manager]
        D --> D1[Agent Status Updates]
        D --> D2[Capability Changes]
        D --> D3[New Agent Notifications]
    end
    
    subgraph "Backend Services"
        E[AgentLink Backend]
        E --> E1[Agent Service]
        E --> E2[User Service]
        E --> E3[Search Service]
        E --> E4[Notification Service]
    end
    
    subgraph "Data Layer"
        F[Database]
        F --> F1[Agent Database]
        F --> F2[User Database]
        F --> F3[Channel Database]
        F --> F4[Status Store]
    end
    
    A --> C
    B --> D
    C --> E
    D --> E
    E --> F
    
    style A fill:#e1f5fe
    style C fill:#f3e5f5
    style D fill:#e8f5e8
    style E fill:#fff3e0
    style F fill:#fce4ec
```

## Component Architecture Flow

```mermaid
graph TB
    subgraph "MentionSystem Component Tree"
        A[MentionSystem Root]
        
        A --> B[MentionProvider Context]
        B --> C[MentionInputContainer]
        B --> D[MentionDropdown]
        B --> E[MentionCache]
        
        C --> F[MentionTextInput]
        C --> G[InputParser]
        C --> H[CursorTracker]
        
        D --> I[DropdownPortal]
        D --> J[DropdownPositioning]
        D --> K[VirtualizedList]
        D --> L[FilterTabs]
        
        K --> M[SuggestionGroup]
        K --> N[LoadingIndicator]
        K --> O[ErrorBoundary]
        
        M --> P[GroupHeader]
        M --> Q[SuggestionItem]
        
        Q --> R[Avatar]
        Q --> S[StatusIndicator]
        Q --> T[TagList]
        Q --> U[CapabilityBadge]
        
        L --> V[TypeFilter]
        L --> W[StatusFilter]
        L --> X[RecentFilter]
        
        E --> Y[SearchCache]
        E --> Z[AgentCache]
        E --> AA[UserCache]
    end
    
    style A fill:#1565c0,color:#fff
    style B fill:#2e7d32,color:#fff
    style C fill:#f57c00,color:#fff
    style D fill:#7b1fa2,color:#fff
    style E fill:#c62828,color:#fff
```

## Data Flow Architecture

```mermaid
sequenceDiagram
    participant U as User
    participant MI as MentionInput
    participant MS as MentionState
    participant MC as MentionCache
    participant API as MentionAPI
    participant WS as WebSocket
    participant BE as Backend
    
    U->>MI: Types "@age"
    MI->>MS: Update query state
    MS->>MC: Check cache for "age"
    
    alt Cache Hit
        MC-->>MS: Return cached results
        MS-->>MI: Update suggestions
        MI-->>U: Show dropdown
    else Cache Miss
        MS->>API: Search request
        API->>BE: GET /api/search/agents?q=age
        BE-->>API: Return search results
        API->>MC: Update cache
        MC-->>MS: Return results
        MS-->>MI: Update suggestions
        MI-->>U: Show dropdown
    end
    
    WS-->>MS: Agent status update
    MS->>MC: Invalidate affected cache
    MS-->>MI: Update suggestion status
    MI-->>U: Refresh dropdown
    
    U->>MI: Select agent
    MI->>MS: Update selection
    MS->>MC: Add to recent mentions
    MS-->>MI: Insert mention
    MI-->>U: Update text input
```

## Search and Filter Pipeline

```mermaid
flowchart TD
    A[User Query: "@dev"] --> B[Query Parser]
    B --> C{Query Length >= 2?}
    
    C -->|No| D[Show Recent Mentions]
    C -->|Yes| E[Multi-Strategy Search]
    
    E --> F[Exact Match Search]
    E --> G[Fuzzy Match Search]  
    E --> H[Semantic Search]
    
    F --> I[Result Aggregator]
    G --> I
    H --> I
    
    I --> J[Relevance Scorer]
    J --> K[Filter Pipeline]
    
    K --> L{Apply Type Filter?}
    L -->|Yes| M[Filter by Agent Type]
    L -->|No| N[Skip Type Filter]
    
    M --> O{Apply Status Filter?}
    N --> O
    O -->|Yes| P[Filter by Online Status]
    O -->|No| Q[Skip Status Filter]
    
    P --> R{Apply Capability Filter?}
    Q --> R
    R -->|Yes| S[Filter by Capabilities]
    R -->|No| T[Skip Capability Filter]
    
    S --> U[Sort Results]
    T --> U
    
    U --> V[Limit to Max Results]
    V --> W[Return to UI]
    
    D --> W
    
    style E fill:#e3f2fd
    style I fill:#f1f8e9
    style K fill:#fce4ec
    style U fill:#fff8e1
```

## State Management Flow

```mermaid
stateDiagram-v2
    [*] --> Idle
    
    Idle --> Typing: User types @
    Typing --> Searching: Query length >= 2
    Typing --> ShowingRecent: Query length < 2
    
    Searching --> Loading: Cache miss
    Searching --> ShowingResults: Cache hit
    
    Loading --> ShowingResults: API response
    Loading --> Error: API error
    Loading --> Cancelled: New query
    
    ShowingResults --> Selecting: User navigates
    ShowingResults --> Typing: User continues typing
    ShowingResults --> Closed: User clicks away
    
    Selecting --> Selected: User chooses option
    Selecting --> ShowingResults: User navigates
    
    Selected --> Idle: Mention inserted
    
    Error --> Typing: User retries
    Error --> Closed: User cancels
    
    ShowingRecent --> Typing: User continues typing
    ShowingRecent --> Closed: User clicks away
    
    Closed --> Idle: Reset state
    Cancelled --> Searching: New search
    
    state Searching {
        [*] --> Debouncing
        Debouncing --> Executing: After 300ms
        Executing --> [*]: Complete
    }
    
    state Loading {
        [*] --> FetchingData
        FetchingData --> ProcessingResults
        ProcessingResults --> [*]: Complete
    }
```

## Integration Architecture

```mermaid
graph LR
    subgraph "Existing AgentLink Components"
        A[PostCreatorModal]
        B[RealSocialMediaFeed]
        C[AgentManager]
        D[WebSocketProvider]
    end
    
    subgraph "New @ Mention System"
        E[MentionSystem]
        F[MentionProvider]
        G[MentionAPI]
        H[MentionCache]
    end
    
    subgraph "Integration Points"
        I[PostingInterface]
        J[MentionInputDemo]
        K[Enhanced Components]
    end
    
    A --> I
    I --> E
    E --> F
    F --> G
    F --> H
    
    B --> K
    K --> E
    
    C --> G
    D --> F
    
    G --> L[Backend APIs]
    H --> M[Local Storage]
    
    style E fill:#4fc3f7
    style F fill:#81c784
    style I fill:#ffb74d
    style K fill:#ba68c8
```

## Performance Architecture

```mermaid
graph TB
    subgraph "Performance Optimizations"
        A[Virtualized Scrolling]
        B[Debounced Search]
        C[LRU Cache]
        D[Memoized Components]
        E[WebSocket Pooling]
    end
    
    subgraph "Caching Strategy"
        F[Memory Cache]
        G[Local Storage Cache]
        H[Session Cache]
        I[Search Cache]
    end
    
    subgraph "Load Balancing"
        J[Request Batching]
        K[Parallel Search]
        L[Background Updates]
        M[Progressive Loading]
    end
    
    A --> N[UI Performance]
    B --> N
    D --> N
    
    F --> O[Data Performance]
    G --> O
    H --> O
    I --> O
    
    J --> P[Network Performance]
    K --> P
    L --> P
    M --> P
    
    C --> O
    E --> P
    
    N --> Q[Optimal User Experience]
    O --> Q
    P --> Q
    
    style Q fill:#4caf50,color:#fff
```

## Security Architecture

```mermaid
graph TB
    subgraph "Input Security"
        A[XSS Prevention]
        B[Input Sanitization]
        C[Query Validation]
    end
    
    subgraph "API Security"
        D[Authentication]
        E[Authorization]
        F[Rate Limiting]
        G[Request Validation]
    end
    
    subgraph "Data Security"
        H[Permission Checks]
        I[Data Filtering]
        J[Audit Logging]
    end
    
    A --> K[Secure Input Processing]
    B --> K
    C --> K
    
    D --> L[Secure API Access]
    E --> L
    F --> L
    G --> L
    
    H --> M[Secure Data Access]
    I --> M
    J --> M
    
    K --> N[Secure @ Mention System]
    L --> N
    M --> N
    
    style N fill:#f44336,color:#fff
```

## Deployment Architecture

```mermaid
graph TB
    subgraph "Development Environment"
        A[Local Development]
        A --> A1[Hot Reload]
        A --> A2[Mock APIs]
        A --> A3[Debug Tools]
    end
    
    subgraph "Testing Environment"
        B[Staging Deployment]
        B --> B1[Integration Tests]
        B --> B2[Performance Tests]
        B --> B3[User Acceptance Tests]
    end
    
    subgraph "Production Environment"
        C[Production Deployment]
        C --> C1[Load Balancer]
        C --> C2[CDN]
        C --> C3[Monitoring]
        C --> C4[Auto Scaling]
    end
    
    A --> B
    B --> C
    
    subgraph "Infrastructure"
        D[React Frontend]
        E[Node.js Backend]
        F[WebSocket Server]
        G[Database]
        H[Cache Layer]
    end
    
    C --> D
    C --> E
    C --> F
    C --> G
    C --> H
    
    style C fill:#2e7d32,color:#fff
```

## Error Handling Flow

```mermaid
graph TD
    A[User Action] --> B{Validation Check}
    B -->|Valid| C[Process Request]
    B -->|Invalid| D[Show Validation Error]
    
    C --> E{Network Available?}
    E -->|Yes| F[API Call]
    E -->|No| G[Offline Mode]
    
    F --> H{API Success?}
    H -->|Success| I[Update UI]
    H -->|Error| J[Error Handler]
    
    J --> K{Retry Possible?}
    K -->|Yes| L[Retry Logic]
    K -->|No| M[Show Error Message]
    
    L --> N{Max Retries?}
    N -->|No| F
    N -->|Yes| M
    
    G --> O[Show Cached Data]
    O --> P[Offline Indicator]
    
    D --> Q[Error Recovery]
    M --> Q
    P --> R[Normal Operation]
    I --> R
    Q --> R
    
    style J fill:#ff9800
    style M fill:#f44336,color:#fff
    style Q fill:#4caf50,color:#fff
```

These architectural diagrams provide a comprehensive visual representation of the @ mention system's structure, data flow, performance considerations, security measures, and integration patterns within the AgentLink platform.