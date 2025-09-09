# @ Mention System - Component Diagrams & Data Flow

## 1. Component Hierarchy Diagram

```mermaid
graph TD
    A[Parent Components] --> B[MentionInput]
    A --> C[PostCreator]
    A --> D[QuickPostSection] 
    A --> E[CommentForm]
    
    C --> B
    D --> B
    E --> B
    
    B --> F[MentionDropdown]
    B --> G[useMentions Hook]
    B --> H[AgentItem Components]
    
    F --> H
    F --> I[VirtualizedList]
    
    G --> J[useAgents Hook]
    G --> K[useDebouncedCallback]
    
    J --> L[AgentService]
    J --> M[React Query Cache]
    
    L --> N[API Endpoints]
    N --> O["/api/v1/agents"]
    N --> P["/api/agents (fallback)"]
    
    style A fill:#e1f5fe
    style B fill:#f3e5f5
    style G fill:#e8f5e8
    style L fill:#fff3e0
```

## 2. Data Flow Architecture

```mermaid
sequenceDiagram
    participant U as User
    participant MI as MentionInput
    participant UH as useMentions Hook
    participant AS as AgentService
    participant API as API Endpoint
    participant DD as MentionDropdown
    
    U->>MI: Types "@tech"
    MI->>UH: detectMentionTrigger("@tech")
    UH->>AS: fetchAgents() if not cached
    AS->>API: GET /api/v1/agents
    API-->>AS: Agent[]
    AS-->>UH: Cached agents
    UH->>UH: filterAgents("tech")
    UH-->>MI: filteredAgents[3]
    MI->>DD: show dropdown
    DD-->>U: Display suggestions
    U->>DD: Click "TechReviewer"
    DD->>MI: onMentionSelect(agent)
    MI->>MI: insertMention(text, agent)
    MI->>UH: extractMentions(newText)
    UH-->>MI: ["TechReviewer"]
    MI-->>U: Updated text with mention
```

## 3. State Management Flow

```mermaid
stateDiagram-v2
    [*] --> Idle
    
    Idle --> Detecting: User types "@"
    Detecting --> Loading: Query length > 0
    Detecting --> Idle: Backspace/clear
    
    Loading --> Loaded: Agents fetched
    Loading --> Error: API failure
    
    Loaded --> Filtering: User types query
    Loaded --> Selecting: Arrow keys
    Loaded --> Idle: Escape key
    
    Filtering --> Loaded: Debounced filter
    
    Selecting --> Inserting: Enter/Tab/Click
    Selecting --> Loaded: Arrow keys
    
    Inserting --> Idle: Mention inserted
    
    Error --> Idle: Retry/timeout
    
    state Loaded {
        [*] --> ShowingDropdown
        ShowingDropdown --> NavigatingItems: Keyboard navigation
        NavigatingItems --> ShowingDropdown: Selection change
    }
```

## 4. Component Integration Pattern

```mermaid
graph LR
    subgraph "Existing Components (No Breaking Changes)"
        A[PostCreator.tsx]
        B[QuickPostSection.tsx]
        C[CommentForm.tsx]
    end
    
    subgraph "New Mention System"
        D[MentionInput.tsx]
        E[MentionDropdown.tsx]
        F[useMentions.ts]
        G[AgentService.ts]
    end
    
    subgraph "Enhanced Components"
        A1[PostCreator + Mentions]
        B1[QuickPost + Mentions]
        C1[CommentForm + Mentions]
    end
    
    A --> A1
    B --> B1
    C --> C1
    
    A1 --> D
    B1 --> D
    C1 --> D
    
    D --> E
    D --> F
    F --> G
    
    style A fill:#ffcdd2
    style B fill:#ffcdd2
    style C fill:#ffcdd2
    style A1 fill:#c8e6c9
    style B1 fill:#c8e6c9
    style C1 fill:#c8e6c9
    style D fill:#e1f5fe
    style E fill:#e1f5fe
    style F fill:#e1f5fe
    style G fill:#e1f5fe
```

## 5. API Integration Architecture

```mermaid
graph TD
    subgraph "Frontend Layer"
        A[MentionInput Components]
        B[useMentions Hook]
        C[React Query Cache]
    end
    
    subgraph "Service Layer"
        D[AgentService]
        E[API Client]
        F[Cache Manager]
    end
    
    subgraph "API Layer"
        G["/api/v1/agents"]
        H["/api/agents (fallback)"]
        I[Agent Database]
    end
    
    A --> B
    B --> C
    B --> D
    D --> E
    D --> F
    E --> G
    E --> H
    G --> I
    H --> I
    
    C --> D
    
    style A fill:#e3f2fd
    style B fill:#e8f5e8
    style C fill:#f3e5f5
    style D fill:#fff3e0
    style E fill:#fff3e0
    style F fill:#fff3e0
    style G fill:#ffebee
    style H fill:#ffebee
    style I fill:#f1f8e9
```

## 6. Event Handling Flow

```mermaid
graph TD
    A[Text Input Change] --> B{Contains '@'?}
    B -->|Yes| C[Extract Query After @]
    B -->|No| D[Hide Dropdown]
    
    C --> E[Debounce Query 300ms]
    E --> F[Filter Agents]
    F --> G[Show Dropdown]
    
    G --> H[Keyboard Events]
    H --> I{Key Type?}
    
    I -->|Arrow Up/Down| J[Navigate Selection]
    I -->|Enter/Tab| K[Insert Mention]
    I -->|Escape| D
    
    J --> L[Update Selected Index]
    L --> M[Scroll Into View]
    
    K --> N[Replace @ + Query]
    N --> O[Update Text]
    O --> P[Extract All Mentions]
    P --> Q[Notify Parent Component]
    Q --> D
    
    style A fill:#e1f5fe
    style G fill:#f3e5f5
    style K fill:#e8f5e8
    style D fill:#ffebee
```

## 7. Performance Optimization Points

```mermaid
mindmap
  root((Performance Optimizations))
    API Layer
      Agent Data Caching
        React Query 5min stale
        10min cache time
        Background refetch
      Fallback Endpoints
        Primary: /api/v1/agents
        Fallback: /api/agents
    Component Layer
      Debounced Search
        300ms delay
        Prevents excessive filtering
      Virtual Scrolling
        Large agent lists (>50)
        React Window
      Memoization
        useMemo for filtered results
        useCallback for handlers
        React.memo for components
    UI Layer
      Lazy Dropdown Rendering
        Only render when open
        Portal for positioning
      Keyboard Navigation
        Prevent default scrolling
        Efficient selection updates
```

## 8. Mobile Responsive Strategy

```mermaid
graph TD
    A[Device Detection] --> B{Screen Width?}
    
    B -->|Desktop >768px| C[Floating Dropdown]
    B -->|Mobile ≤768px| D[Modal Overlay]
    
    C --> E[Position Near Cursor]
    C --> F[Max Height 240px]
    C --> G[Shadow & Border]
    
    D --> H[Full Screen Modal]
    D --> I[Search Input Header]
    D --> J[Scrollable Agent List]
    
    E --> K[Absolute Positioning]
    F --> L[Vertical Scrolling]
    G --> M[Dropdown Styling]
    
    H --> N[Fixed Position]
    I --> O[Sticky Header]
    J --> P[Touch-Friendly Items]
    
    style C fill:#e8f5e8
    style D fill:#e1f5fe
    style K fill:#f3e5f5
    style N fill:#fff3e0
```

## 9. Error Handling & Fallbacks

```mermaid
stateDiagram-v2
    [*] --> LoadingAgents
    
    LoadingAgents --> AgentsLoaded: Success
    LoadingAgents --> APIError: Network/Server Error
    LoadingAgents --> CacheHit: Cached Data Available
    
    APIError --> RetryRequest: Auto Retry (3x)
    APIError --> FallbackAPI: Try /api/agents
    APIError --> ShowError: All Attempts Failed
    
    RetryRequest --> AgentsLoaded: Success
    RetryRequest --> ShowError: Max Retries
    
    FallbackAPI --> AgentsLoaded: Success
    FallbackAPI --> ShowError: Also Failed
    
    CacheHit --> AgentsLoaded: Use Cached
    
    ShowError --> [*]: User Dismisses
    AgentsLoaded --> [*]: Normal Flow
    
    state ShowError {
        [*] --> DisplayMessage
        DisplayMessage --> OfferRetry
        DisplayMessage --> DegradeGracefully
    }
```

## 10. Testing Strategy Diagram

```mermaid
graph TD
    subgraph "Unit Tests"
        A[MentionInput Component]
        B[useMentions Hook]
        C[AgentService]
        D[Text Parsing Utils]
    end
    
    subgraph "Integration Tests"
        E[PostCreator + Mentions]
        F[QuickPost + Mentions]
        G[CommentForm + Mentions]
        H[API Integration]
    end
    
    subgraph "E2E Tests"
        I[Complete Mention Flow]
        J[Keyboard Navigation]
        K[Mobile Interactions]
        L[Error Scenarios]
    end
    
    A --> E
    B --> E
    B --> F
    B --> G
    C --> H
    
    E --> I
    F --> I
    G --> I
    H --> I
    
    I --> J
    I --> K
    I --> L
    
    style A fill:#e1f5fe
    style E fill:#e8f5e8
    style I fill:#f3e5f5
```

## 11. Implementation Timeline

```mermaid
gantt
    title @ Mention System Implementation Timeline
    dateFormat  YYYY-MM-DD
    section Phase 1: Core Infrastructure
    useMentions Hook          :a1, 2024-01-01, 3d
    MentionInput Component    :a2, after a1, 4d
    Agent Service            :a3, after a1, 2d
    Basic Dropdown           :a4, after a2, 3d
    
    section Phase 2: Integration
    PostCreator Integration  :b1, after a4, 2d
    QuickPost Integration    :b2, after a4, 2d
    CommentForm Integration  :b3, after a4, 2d
    API Connection          :b4, after a3, 3d
    
    section Phase 3: Enhancement
    Keyboard Navigation     :c1, after b1, 3d
    Mobile Optimization     :c2, after b2, 4d
    Performance Tuning      :c3, after b3, 3d
    Error Handling         :c4, after b4, 2d
    
    section Phase 4: Polish
    Accessibility          :d1, after c1, 2d
    Testing Suite          :d2, after c2, 4d
    Documentation          :d3, after c3, 2d
    Production Deploy      :d4, after d2, 1d
```

## 12. Security & Validation Flow

```mermaid
graph TD
    A[User Input: @username] --> B[Input Sanitization]
    B --> C{Valid Characters?}
    
    C -->|No| D[Reject Input]
    C -->|Yes| E[Length Validation]
    
    E --> F{≤ 50 characters?}
    F -->|No| D
    F -->|Yes| G[XSS Prevention]
    
    G --> H[DOMPurify.sanitize]
    H --> I{Safe Content?}
    
    I -->|No| D
    I -->|Yes| J[Agent Validation]
    
    J --> K[Check Agent Exists]
    K --> L{Valid Agent?}
    
    L -->|No| M[Highlight Invalid]
    L -->|Yes| N[Accept Mention]
    
    D --> O[Show Error Message]
    M --> P[Allow Edit/Remove]
    N --> Q[Include in Submission]
    
    style A fill:#e1f5fe
    style D fill:#ffcdd2
    style N fill:#c8e6c9
    style O fill:#ffcdd2
    style Q fill:#c8e6c9
```

This comprehensive set of diagrams provides a complete visual representation of the @ mention system architecture, showing all major components, data flows, state management, and implementation strategies. The diagrams support the detailed written architecture and provide clear guidance for implementation teams.