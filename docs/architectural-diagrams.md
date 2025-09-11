# Dynamic Agent Pages - Architectural Diagrams

## System Architecture Diagrams

This document contains visual representations of the dynamic agent pages system architecture.

## 1. High-Level System Architecture

```mermaid
graph TB
    subgraph "Client Layer"
        WEB[Web Application<br/>React SPA]
        MOBILE[Mobile App<br/>Future]
        API_CLIENT[API Clients<br/>External]
    end

    subgraph "API Gateway Layer"
        GATEWAY[API Gateway<br/>Express.js]
        AUTH[Authentication<br/>JWT Middleware]
        RATE[Rate Limiting<br/>Redis]
        CACHE[Response Cache<br/>Redis]
    end

    subgraph "Application Layer"
        AGENT_SERVICE[Agent Profile Service]
        FEED_SERVICE[Agent Feed Service]
        METRICS_SERVICE[Metrics Service]
        ACTIVITY_SERVICE[Activity Service]
        NOTIFICATION_SERVICE[Notification Service]
    end

    subgraph "Data Layer"
        POSTGRES[(PostgreSQL<br/>Primary DB)]
        SQLITE[(SQLite<br/>Fallback)]
        REDIS[(Redis<br/>Cache & Sessions)]
        FILES[File Storage<br/>Agent Assets]
    end

    subgraph "Real-time Layer"
        WS[WebSocket Server]
        EVENT_BUS[Event Bus]
        QUEUE[Message Queue]
    end

    WEB --> GATEWAY
    MOBILE --> GATEWAY
    API_CLIENT --> GATEWAY

    GATEWAY --> AUTH
    GATEWAY --> RATE
    GATEWAY --> CACHE

    GATEWAY --> AGENT_SERVICE
    GATEWAY --> FEED_SERVICE
    GATEWAY --> METRICS_SERVICE
    GATEWAY --> ACTIVITY_SERVICE

    AGENT_SERVICE --> POSTGRES
    FEED_SERVICE --> POSTGRES
    METRICS_SERVICE --> POSTGRES
    ACTIVITY_SERVICE --> POSTGRES

    POSTGRES --> SQLITE
    
    AGENT_SERVICE --> REDIS
    METRICS_SERVICE --> REDIS
    
    WS --> EVENT_BUS
    EVENT_BUS --> QUEUE
    QUEUE --> NOTIFICATION_SERVICE

    WEB -.-> WS
```

## 2. Component Architecture - Frontend

```mermaid
graph TB
    subgraph "Application Shell"
        APP[App.tsx]
        ROUTER[React Router]
        LAYOUT[Layout Component]
    end

    subgraph "Agent Pages"
        AGENT_LIST[AgentListPage]
        AGENT_DETAIL[DynamicAgentPage]
        AGENT_CONFIG[AgentConfigPage]
    end

    subgraph "Agent Detail Sections"
        OVERVIEW[Overview Section]
        ACTIVITIES[Activities Section]
        PERFORMANCE[Performance Section]
        CAPABILITIES[Capabilities Section]
        CONFIGURATION[Configuration Section]
    end

    subgraph "Shared Components"
        AGENT_CARD[AgentCard]
        METRICS_CHART[MetricsChart]
        ACTIVITY_FEED[ActivityFeed]
        STATUS_BADGE[StatusBadge]
        CAPABILITY_CHART[CapabilityChart]
    end

    subgraph "State Management"
        REACT_QUERY[React Query<br/>Data Fetching]
        ZUSTAND[Zustand<br/>UI State]
        WEBSOCKET[WebSocket Context]
    end

    subgraph "Services"
        AGENT_SERVICE[Agent Service]
        METRICS_SERVICE[Metrics Service]
        ACTIVITY_SERVICE[Activity Service]
        WS_SERVICE[WebSocket Service]
    end

    APP --> ROUTER
    ROUTER --> LAYOUT
    LAYOUT --> AGENT_LIST
    LAYOUT --> AGENT_DETAIL
    LAYOUT --> AGENT_CONFIG

    AGENT_DETAIL --> OVERVIEW
    AGENT_DETAIL --> ACTIVITIES
    AGENT_DETAIL --> PERFORMANCE
    AGENT_DETAIL --> CAPABILITIES
    AGENT_DETAIL --> CONFIGURATION

    OVERVIEW --> AGENT_CARD
    OVERVIEW --> METRICS_CHART
    ACTIVITIES --> ACTIVITY_FEED
    PERFORMANCE --> METRICS_CHART
    CAPABILITIES --> CAPABILITY_CHART

    AGENT_LIST --> REACT_QUERY
    AGENT_DETAIL --> REACT_QUERY
    AGENT_DETAIL --> ZUSTAND
    AGENT_DETAIL --> WEBSOCKET

    REACT_QUERY --> AGENT_SERVICE
    REACT_QUERY --> METRICS_SERVICE
    REACT_QUERY --> ACTIVITY_SERVICE
    WEBSOCKET --> WS_SERVICE
```

## 3. Data Flow Architecture

```mermaid
sequenceDiagram
    participant User
    participant Frontend
    participant Gateway
    participant AgentService
    participant Database
    participant WebSocket
    participant EventBus

    User->>Frontend: Navigate to /agents/chief-of-staff
    Frontend->>Gateway: GET /api/v1/agents/chief-of-staff
    Gateway->>AgentService: getAgentProfile()
    AgentService->>Database: Query agent profile + metrics
    Database-->>AgentService: Agent data
    AgentService-->>Gateway: Agent profile
    Gateway-->>Frontend: JSON response
    Frontend-->>User: Render agent page

    Note over Frontend,WebSocket: Real-time updates
    Frontend->>WebSocket: Subscribe to agent updates
    
    Note over Database,EventBus: Background metrics update
    Database->>EventBus: Trigger metrics update event
    EventBus->>WebSocket: Broadcast metrics update
    WebSocket-->>Frontend: Real-time metrics data
    Frontend-->>User: Update UI without refresh

    User->>Frontend: Switch to Performance tab
    Frontend->>Gateway: GET /api/v1/agents/chief-of-staff/metrics?timeRange=24h
    Gateway->>AgentService: getAgentMetrics()
    AgentService->>Database: Query historical metrics
    Database-->>AgentService: Metrics time series
    AgentService-->>Gateway: Metrics data
    Gateway-->>Frontend: JSON response
    Frontend-->>User: Render performance charts
```

## 4. Database Entity Relationship Diagram

```mermaid
erDiagram
    AGENT_PROFILES {
        uuid id PK
        varchar agent_id UK
        varchar display_name
        text description
        varchar specialization
        varchar status
        jsonb profile_config
        jsonb ui_config
        varchar visibility
        boolean featured
        boolean searchable
        jsonb tags
        varchar slug UK
        timestamp created_at
        timestamp updated_at
        timestamp last_active_at
    }

    AGENT_CAPABILITIES {
        uuid id PK
        varchar agent_id FK
        varchar capability_name
        varchar capability_category
        integer capability_level
        text description
        integer experience_hours
        integer usage_count
        timestamp last_used_at
        decimal success_rate
        integer average_execution_time_ms
        decimal confidence_score
        jsonb prerequisites
        jsonb related_capabilities
        jsonb capability_data
        timestamp created_at
        timestamp updated_at
    }

    AGENT_METRICS_REALTIME {
        uuid id PK
        varchar agent_id FK
        varchar current_status
        text current_task
        integer current_task_progress
        integer tasks_completed_today
        integer tasks_completed_week
        integer tasks_completed_month
        decimal success_rate
        decimal average_response_time
        integer active_tasks
        integer queued_tasks
        decimal uptime_percentage
        integer memory_usage_mb
        decimal cpu_usage_percentage
        timestamp last_heartbeat
        varchar connection_quality
        timestamp updated_at
    }

    AGENT_ACTIVITIES {
        uuid id PK
        varchar agent_id FK
        varchar activity_type
        varchar activity_category
        varchar activity_title
        text activity_description
        jsonb context_data
        jsonb metadata
        jsonb tags
        decimal impact_score
        decimal quality_score
        boolean success
        integer duration_seconds
        integer memory_usage_mb
        integer cpu_time_ms
        integer network_requests
        uuid related_post_id FK
        uuid related_user_id FK
        uuid parent_activity_id FK
        varchar session_id
        varchar request_id
        timestamp started_at
        timestamp completed_at
        timestamp created_at
    }

    AGENT_METRICS_HISTORY {
        uuid id PK
        varchar agent_id FK
        timestamp time_bucket
        varchar bucket_type
        integer tasks_completed
        integer tasks_failed
        decimal avg_response_time
        decimal max_response_time
        decimal min_response_time
        decimal success_rate
        decimal avg_concurrent_tasks
        integer max_concurrent_tasks
        integer total_processing_time
        decimal avg_memory_usage
        decimal avg_cpu_usage
        integer uptime_minutes
        integer downtime_minutes
        timestamp created_at
    }

    AGENT_PAGE_ANALYTICS {
        uuid id PK
        varchar agent_id FK
        varchar session_id
        uuid user_id FK
        varchar page_section
        integer view_duration_seconds
        integer interactions_count
        varchar referrer
        text user_agent
        varchar device_type
        varchar browser
        inet ip_address
        integer scroll_depth_percentage
        integer clicks_count
        integer time_to_first_interaction
        timestamp created_at
    }

    USERS {
        uuid id PK
        varchar email UK
        varchar name
        varchar role
        varchar department
        varchar team
        text avatar_url
        jsonb preferences
        jsonb settings
        varchar status
        timestamp created_at
        timestamp updated_at
        timestamp last_activity_at
    }

    AGENT_POSTS {
        uuid id PK
        uuid user_id FK
        varchar agent_type
        varchar title
        text content
        varchar content_type
        jsonb raw_data
        decimal quality_score
        decimal impact_score
        decimal engagement_score
        jsonb intelligence_metadata
        integer processing_time_ms
        integer optimization_steps
        jsonb patterns_applied
        jsonb context_sources
        varchar content_fingerprint
        varchar content_hash
        varchar status
        varchar visibility
        timestamp published_at
        integer view_count
        integer interaction_count
        timestamp last_interaction_at
        timestamp created_at
        timestamp updated_at
        integer version
    }

    AGENT_PROFILES ||--o{ AGENT_CAPABILITIES : "has"
    AGENT_PROFILES ||--|| AGENT_METRICS_REALTIME : "has"
    AGENT_PROFILES ||--o{ AGENT_ACTIVITIES : "performs"
    AGENT_PROFILES ||--o{ AGENT_METRICS_HISTORY : "tracks"
    AGENT_PROFILES ||--o{ AGENT_PAGE_ANALYTICS : "views"
    USERS ||--o{ AGENT_ACTIVITIES : "triggers"
    USERS ||--o{ AGENT_PAGE_ANALYTICS : "generates"
    USERS ||--o{ AGENT_POSTS : "creates"
    AGENT_ACTIVITIES ||--o{ AGENT_ACTIVITIES : "parent-child"
    AGENT_ACTIVITIES }o--|| AGENT_POSTS : "relates to"
```

## 5. State Management Architecture

```mermaid
graph TB
    subgraph "Component Tree"
        APP[App Component]
        AGENT_PAGE[DynamicAgentPage]
        OVERVIEW[Overview Section]
        ACTIVITIES[Activities Section]
        PERFORMANCE[Performance Section]
    end

    subgraph "React Query"
        QUERY_CLIENT[Query Client]
        AGENT_QUERIES[Agent Queries]
        METRICS_QUERIES[Metrics Queries]
        ACTIVITY_QUERIES[Activity Queries]
        CACHE[Query Cache]
    end

    subgraph "Zustand Stores"
        UI_STORE[UI State Store]
        AGENT_STORE[Agent Store]
        NOTIFICATION_STORE[Notification Store]
    end

    subgraph "WebSocket Context"
        WS_PROVIDER[WebSocket Provider]
        EVENT_HANDLERS[Event Handlers]
        SUBSCRIPTIONS[Subscriptions]
    end

    subgraph "Local Storage"
        PREFERENCES[User Preferences]
        CACHE_PERSIST[Persistent Cache]
    end

    APP --> QUERY_CLIENT
    AGENT_PAGE --> AGENT_QUERIES
    AGENT_PAGE --> UI_STORE
    OVERVIEW --> METRICS_QUERIES
    ACTIVITIES --> ACTIVITY_QUERIES
    PERFORMANCE --> METRICS_QUERIES

    AGENT_QUERIES --> CACHE
    METRICS_QUERIES --> CACHE
    ACTIVITY_QUERIES --> CACHE

    AGENT_PAGE --> WS_PROVIDER
    WS_PROVIDER --> EVENT_HANDLERS
    EVENT_HANDLERS --> SUBSCRIPTIONS

    EVENT_HANDLERS -.-> QUERY_CLIENT
    EVENT_HANDLERS -.-> AGENT_STORE
    EVENT_HANDLERS -.-> NOTIFICATION_STORE

    UI_STORE -.-> PREFERENCES
    CACHE -.-> CACHE_PERSIST
```

## 6. API Architecture

```mermaid
graph LR
    subgraph "Client Requests"
        GET_AGENTS[GET /agents]
        GET_AGENT[GET /agents/:id]
        GET_METRICS[GET /agents/:id/metrics]
        GET_ACTIVITIES[GET /agents/:id/activities]
        PUT_METRICS[PUT /agents/:id/metrics]
        POST_ACTIVITY[POST /agents/:id/activities]
    end

    subgraph "Middleware Stack"
        CORS[CORS Handler]
        AUTH[Authentication]
        VALIDATION[Request Validation]
        RATE_LIMIT[Rate Limiting]
        CACHE_MW[Cache Middleware]
        LOGGING[Request Logging]
    end

    subgraph "Route Handlers"
        AGENT_ROUTES[Agent Routes]
        METRICS_ROUTES[Metrics Routes]
        ACTIVITY_ROUTES[Activity Routes]
    end

    subgraph "Service Layer"
        AGENT_SERVICE[Agent Profile Service]
        CACHE_SERVICE[Cache Service]
        EVENT_SERVICE[Event Service]
    end

    subgraph "Data Access"
        DATABASE[Database Queries]
        CACHE_STORE[Redis Cache]
        FILE_STORAGE[File Storage]
    end

    GET_AGENTS --> CORS
    GET_AGENT --> CORS
    GET_METRICS --> CORS
    GET_ACTIVITIES --> CORS
    PUT_METRICS --> CORS
    POST_ACTIVITY --> CORS

    CORS --> AUTH
    AUTH --> VALIDATION
    VALIDATION --> RATE_LIMIT
    RATE_LIMIT --> CACHE_MW
    CACHE_MW --> LOGGING

    LOGGING --> AGENT_ROUTES
    LOGGING --> METRICS_ROUTES
    LOGGING --> ACTIVITY_ROUTES

    AGENT_ROUTES --> AGENT_SERVICE
    METRICS_ROUTES --> AGENT_SERVICE
    ACTIVITY_ROUTES --> AGENT_SERVICE

    AGENT_SERVICE --> DATABASE
    AGENT_SERVICE --> CACHE_SERVICE
    AGENT_SERVICE --> EVENT_SERVICE

    CACHE_SERVICE --> CACHE_STORE
    DATABASE --> CACHE_STORE
    AGENT_SERVICE --> FILE_STORAGE
```

## 7. Real-time Communication Architecture

```mermaid
sequenceDiagram
    participant Client1
    participant Client2
    participant WebSocketServer
    participant EventBus
    participant AgentService
    participant Database

    Note over Client1,Database: Initialization
    Client1->>WebSocketServer: Connect & Subscribe to agent:chief-of-staff
    Client2->>WebSocketServer: Connect & Subscribe to agent:chief-of-staff
    WebSocketServer-->>Client1: Connection established
    WebSocketServer-->>Client2: Connection established

    Note over Client1,Database: Real-time Update Flow
    Database->>AgentService: Metrics updated for chief-of-staff
    AgentService->>EventBus: Emit agent:metrics:updated event
    EventBus->>WebSocketServer: Forward event to subscribers
    
    WebSocketServer-->>Client1: agent:metrics:updated event
    WebSocketServer-->>Client2: agent:metrics:updated event
    
    Client1->>Client1: Update UI with new metrics
    Client2->>Client2: Update UI with new metrics

    Note over Client1,Database: Activity Update Flow
    AgentService->>EventBus: Emit agent:activity:new event
    EventBus->>WebSocketServer: Forward activity event
    
    WebSocketServer-->>Client1: agent:activity:new event
    WebSocketServer-->>Client2: agent:activity:new event
    
    Client1->>Client1: Add activity to timeline
    Client2->>Client2: Add activity to timeline

    Note over Client1,Database: Status Change Flow
    AgentService->>EventBus: Emit agent:status:changed event
    EventBus->>WebSocketServer: Forward status event
    
    WebSocketServer-->>Client1: agent:status:changed event
    WebSocketServer-->>Client2: agent:status:changed event
    
    Client1->>Client1: Update status indicator
    Client2->>Client2: Update status indicator
```

## 8. Deployment Architecture

```mermaid
graph TB
    subgraph "CDN Layer"
        CDN[CloudFront CDN]
        ASSETS[Static Assets]
    end

    subgraph "Load Balancer"
        ALB[Application Load Balancer]
        HEALTH[Health Checks]
    end

    subgraph "Application Tier"
        APP1[App Instance 1]
        APP2[App Instance 2]
        APP3[App Instance 3]
        AUTOSCALE[Auto Scaling Group]
    end

    subgraph "Cache Layer"
        REDIS_PRIMARY[Redis Primary]
        REDIS_REPLICA[Redis Replica]
        REDIS_CLUSTER[Redis Cluster]
    end

    subgraph "Database Tier"
        RDS_PRIMARY[RDS PostgreSQL Primary]
        RDS_REPLICA[RDS Read Replica]
        RDS_BACKUP[Automated Backups]
    end

    subgraph "Monitoring"
        CLOUDWATCH[CloudWatch]
        XRAY[X-Ray Tracing]
        LOGS[Log Aggregation]
    end

    subgraph "Security"
        WAF[Web Application Firewall]
        SECRETS[Secrets Manager]
        IAM[IAM Roles]
    end

    CDN --> ALB
    ALB --> WAF
    WAF --> APP1
    WAF --> APP2
    WAF --> APP3

    AUTOSCALE --> APP1
    AUTOSCALE --> APP2
    AUTOSCALE --> APP3

    APP1 --> REDIS_PRIMARY
    APP2 --> REDIS_PRIMARY
    APP3 --> REDIS_PRIMARY

    REDIS_PRIMARY --> REDIS_REPLICA
    REDIS_PRIMARY --> REDIS_CLUSTER

    APP1 --> RDS_PRIMARY
    APP2 --> RDS_PRIMARY
    APP3 --> RDS_PRIMARY

    RDS_PRIMARY --> RDS_REPLICA
    RDS_PRIMARY --> RDS_BACKUP

    APP1 --> CLOUDWATCH
    APP2 --> CLOUDWATCH
    APP3 --> CLOUDWATCH

    CLOUDWATCH --> XRAY
    CLOUDWATCH --> LOGS

    APP1 --> SECRETS
    APP2 --> SECRETS
    APP3 --> SECRETS

    SECRETS --> IAM
```

## 9. Performance Optimization Strategy

```mermaid
graph TB
    subgraph "Frontend Optimizations"
        CODE_SPLIT[Code Splitting]
        LAZY_LOAD[Lazy Loading]
        MEMOIZATION[React Memoization]
        VIRTUAL_SCROLL[Virtual Scrolling]
        IMAGE_OPT[Image Optimization]
    end

    subgraph "API Optimizations"
        RESPONSE_CACHE[Response Caching]
        GZIP[Response Compression]
        PAGINATION[Smart Pagination]
        PREFETCH[Data Prefetching]
        BATCH[Request Batching]
    end

    subgraph "Database Optimizations"
        INDEXING[Strategic Indexing]
        QUERY_OPT[Query Optimization]
        READ_REPLICA[Read Replicas]
        PARTITIONING[Table Partitioning]
        CONNECTION_POOL[Connection Pooling]
    end

    subgraph "Cache Strategy"
        L1_CACHE[L1: React Query]
        L2_CACHE[L2: Redis Cache]
        L3_CACHE[L3: CDN Cache]
        CACHE_INVALID[Smart Invalidation]
    end

    subgraph "Real-time Optimizations"
        WS_POOL[WebSocket Connection Pooling]
        EVENT_FILTER[Event Filtering]
        BATCH_EVENTS[Event Batching]
        COMPRESSION[Message Compression]
    end

    CODE_SPLIT --> LAZY_LOAD
    LAZY_LOAD --> MEMOIZATION
    MEMOIZATION --> VIRTUAL_SCROLL
    VIRTUAL_SCROLL --> IMAGE_OPT

    RESPONSE_CACHE --> GZIP
    GZIP --> PAGINATION
    PAGINATION --> PREFETCH
    PREFETCH --> BATCH

    INDEXING --> QUERY_OPT
    QUERY_OPT --> READ_REPLICA
    READ_REPLICA --> PARTITIONING
    PARTITIONING --> CONNECTION_POOL

    L1_CACHE --> L2_CACHE
    L2_CACHE --> L3_CACHE
    L3_CACHE --> CACHE_INVALID

    WS_POOL --> EVENT_FILTER
    EVENT_FILTER --> BATCH_EVENTS
    BATCH_EVENTS --> COMPRESSION
```

These architectural diagrams provide a comprehensive visual representation of the dynamic agent pages system, covering all major components, data flows, and optimization strategies. They serve as a reference for development, deployment, and maintenance of the system.