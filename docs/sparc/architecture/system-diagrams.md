# Enhanced Link Preview System - Architectural Diagrams

## 1. SYSTEM OVERVIEW ARCHITECTURE

```mermaid
graph TB
    subgraph "Client Layer"
        WebApp[Web Application]
        MobileApp[Mobile App]
        API_Client[API Client]
    end
    
    subgraph "API Gateway Layer"
        Gateway[Link Preview API Gateway]
        RateLimit[Rate Limiter]
        Auth[Authentication]
    end
    
    subgraph "Core Service Layer"
        Orchestrator[Enhanced Link Preview Service]
        PlatformRouter[Platform Router]
        MetricsCollector[Metrics Collector]
    end
    
    subgraph "Handler Layer"
        LinkedInHandler[LinkedIn Handler]
        TwitterHandler[Twitter/X Handler]
        YouTubeHandler[YouTube Handler]
        GenericHandler[Generic Handler]
    end
    
    subgraph "External APIs"
        LinkedInAPI[LinkedIn oEmbed]
        TwitterAPI[Twitter API v2]
        TwitterOEmbed[Twitter oEmbed]
        YouTubeAPI[YouTube API]
    end
    
    subgraph "Caching Layer"
        MemoryCache[(L1: Memory Cache)]
        RedisCache[(L2: Redis Cache)]
        DatabaseCache[(L3: SQLite Cache)]
    end
    
    subgraph "Monitoring & Observability"
        Metrics[(Metrics Store)]
        Logs[Centralized Logging]
        Dashboard[Monitoring Dashboard]
        Alerts[Alert Manager]
    end
    
    %% Client connections
    WebApp --> Gateway
    MobileApp --> Gateway
    API_Client --> Gateway
    
    %% Gateway layer
    Gateway --> RateLimit
    Gateway --> Auth
    RateLimit --> Orchestrator
    Auth --> Orchestrator
    
    %% Core service connections
    Orchestrator --> PlatformRouter
    Orchestrator --> MetricsCollector
    Orchestrator --> MemoryCache
    
    %% Handler routing
    PlatformRouter --> LinkedInHandler
    PlatformRouter --> TwitterHandler
    PlatformRouter --> YouTubeHandler
    PlatformRouter --> GenericHandler
    
    %% External API connections
    LinkedInHandler --> LinkedInAPI
    TwitterHandler --> TwitterAPI
    TwitterHandler --> TwitterOEmbed
    YouTubeHandler --> YouTubeAPI
    
    %% Cache hierarchy
    MemoryCache --> RedisCache
    RedisCache --> DatabaseCache
    
    %% Monitoring connections
    MetricsCollector --> Metrics
    Orchestrator --> Logs
    Metrics --> Dashboard
    Dashboard --> Alerts
    
    %% Styling
    classDef clientLayer fill:#e1f5fe
    classDef gatewayLayer fill:#f3e5f5
    classDef serviceLayer fill:#e8f5e8
    classDef handlerLayer fill:#fff3e0
    classDef externalAPI fill:#ffebee
    classDef cacheLayer fill:#f1f8e9
    classDef monitoringLayer fill:#fce4ec
    
    class WebApp,MobileApp,API_Client clientLayer
    class Gateway,RateLimit,Auth gatewayLayer
    class Orchestrator,PlatformRouter,MetricsCollector serviceLayer
    class LinkedInHandler,TwitterHandler,YouTubeHandler,GenericHandler handlerLayer
    class LinkedInAPI,TwitterAPI,TwitterOEmbed,YouTubeAPI externalAPI
    class MemoryCache,RedisCache,DatabaseCache cacheLayer
    class Metrics,Logs,Dashboard,Alerts monitoringLayer
```

## 2. DATA FLOW ARCHITECTURE

```mermaid
sequenceDiagram
    participant C as Client
    participant G as API Gateway
    participant O as Orchestrator
    participant R as Platform Router
    participant H as Handler
    participant API as External API
    participant Cache as Cache Layer
    participant M as Metrics
    
    C->>G: GET /preview?url=...
    G->>G: Rate limiting check
    G->>O: getLinkPreview(url)
    
    O->>R: detectPlatform(url)
    R-->>O: platform type
    
    O->>Cache: checkCache(url)
    Cache-->>O: cached result (if exists)
    
    alt Cache Hit
        O->>M: recordCacheHit()
        O-->>G: return cached preview
        G-->>C: 200 OK + preview data
    else Cache Miss
        O->>R: getHandler(platform)
        R-->>O: handler instance
        
        O->>H: extract(url)
        H->>API: fetch metadata
        
        alt API Success
            API-->>H: raw metadata
            H->>H: transform & validate
            H-->>O: preview result
            O->>Cache: store(url, result)
            O->>M: recordSuccess()
        else API Failure
            H->>H: try fallback strategy
            alt Fallback Success
                H-->>O: fallback result
                O->>M: recordFallback()
            else Complete Failure
                O->>Cache: checkStaleCache(url)
                alt Stale Available
                    Cache-->>O: stale result
                    O->>M: recordStaleHit()
                else No Fallback
                    O->>O: generateErrorPreview()
                    O->>M: recordError()
                end
            end
        end
        
        O-->>G: return result
        G-->>C: 200 OK + preview data
    end
```

## 3. HANDLER HIERARCHY ARCHITECTURE

```mermaid
classDiagram
    class BaseHandler {
        <<abstract>>
        +platform: Platform
        +priority: number
        +extract(url: string): Promise~PreviewResult~
        +validateUrl(url: string): Promise~string~
        #performExtraction(url: string): Promise~PreviewResult~*
        #getCacheStrategy(): CacheStrategy*
        #handleErrors(error: Error): PreviewResult
    }
    
    class LinkedInHandler {
        -oembedClient: LinkedInOEmbedClient
        -scrapingFallback: LinkedInScraper
        +platform: Platform.LINKEDIN
        +performExtraction(url: string): Promise~PreviewResult~
        +extractPostMetadata(data: object): PreviewResult
        +extractProfileMetadata(data: object): PreviewResult
        +extractCompanyMetadata(data: object): PreviewResult
    }
    
    class TwitterXHandler {
        -apiClient: TwitterAPIv2Client
        -oembedClient: TwitterOEmbedClient
        -syndicationClient: TwitterSyndicationClient
        +platform: Platform.TWITTER
        +performExtraction(url: string): Promise~PreviewResult~
        +normalizeUrl(url: string): string
        +extractTweetId(url: string): string
        +handleMediaAttachments(data: object): MediaInfo[]
    }
    
    class YouTubeHandler {
        -oembedClient: YouTubeOEmbedClient
        -apiClient: YouTubeAPIClient
        +platform: Platform.YOUTUBE
        +performExtraction(url: string): Promise~PreviewResult~
        +extractVideoId(url: string): string
        +getVideoMetadata(videoId: string): VideoMetadata
    }
    
    class GenericHandler {
        -extractors: MetadataExtractor[]
        -imageOptimizer: ImageOptimizer
        +platform: Platform.GENERIC
        +performExtraction(url: string): Promise~PreviewResult~
        +detectContentType(html: string, url: string): ContentType
        +extractWithMultipleStrategies(html: string): CombinedMetadata
        +enhanceMetadata(metadata: Metadata, url: string): PreviewResult
    }
    
    class PlatformRouter {
        -handlers: Map~Platform, BaseHandler~
        -platformDetector: PlatformDetector
        +detectPlatform(url: string): Platform
        +getHandler(platform: Platform): BaseHandler
        +registerHandler(platform: Platform, handler: BaseHandler)
        +getHandlerPriority(platform: Platform): number
    }
    
    BaseHandler <|-- LinkedInHandler
    BaseHandler <|-- TwitterXHandler
    BaseHandler <|-- YouTubeHandler
    BaseHandler <|-- GenericHandler
    
    PlatformRouter --> BaseHandler : manages
    PlatformRouter --> LinkedInHandler : routes to
    PlatformRouter --> TwitterXHandler : routes to
    PlatformRouter --> YouTubeHandler : routes to
    PlatformRouter --> GenericHandler : routes to
```

## 4. CACHING ARCHITECTURE

```mermaid
graph TD
    subgraph "Request Flow"
        Request[Incoming Request]
        Response[Final Response]
    end
    
    subgraph "L1: Memory Cache (5 min TTL)"
        MemCache[LRU Cache<br/>Max: 1000 entries<br/>Access: <10ms]
    end
    
    subgraph "L2: Redis Cache (30 min TTL)"
        RedisCache[Redis Cluster<br/>Distributed<br/>Access: <50ms]
        RedisMetrics[Hit Ratio Metrics]
    end
    
    subgraph "L3: Database Cache (24h TTL)"
        SQLiteDB[(SQLite Database<br/>Persistent Storage<br/>Access: <200ms)]
        CacheMetadata[Cache Metadata<br/>- TTL per platform<br/>- Access patterns<br/>- Staleness info]
    end
    
    subgraph "Cache Management"
        CacheManager[Cache Manager]
        TTLStrategy[TTL Strategy Engine]
        Invalidation[Cache Invalidation]
        Cleanup[Background Cleanup]
    end
    
    Request --> MemCache
    MemCache -->|Hit| Response
    MemCache -->|Miss| RedisCache
    RedisCache -->|Hit| MemCache
    RedisCache -->|Hit| Response
    RedisCache -->|Miss| SQLiteDB
    SQLiteDB -->|Hit| RedisCache
    SQLiteDB -->|Hit| MemCache
    SQLiteDB -->|Hit| Response
    
    SQLiteDB -->|Miss| ExternalFetch[Fetch from External APIs]
    ExternalFetch --> SQLiteDB
    ExternalFetch --> RedisCache
    ExternalFetch --> MemCache
    ExternalFetch --> Response
    
    CacheManager --> MemCache
    CacheManager --> RedisCache
    CacheManager --> SQLiteDB
    TTLStrategy --> CacheManager
    Invalidation --> CacheManager
    Cleanup --> CacheManager
    
    RedisCache --> RedisMetrics
    
    %% Cache strategy flows
    TTLStrategy -.->|LinkedIn: 4h| SQLiteDB
    TTLStrategy -.->|Twitter: 30min| SQLiteDB
    TTLStrategy -.->|YouTube: 2h| SQLiteDB
    TTLStrategy -.->|Generic: 1h| SQLiteDB
```

## 5. ERROR HANDLING & RESILIENCE ARCHITECTURE

```mermaid
graph TB
    subgraph "Error Detection Layer"
        NetworkErrors[Network Errors]
        APIErrors[API Rate Limits & Failures]
        ParsingErrors[Content Parsing Errors]
        ValidationErrors[Data Validation Errors]
    end
    
    subgraph "Error Classification"
        Retryable[Retryable Errors<br/>- Network timeouts<br/>- Rate limits<br/>- Server errors 5xx]
        NonRetryable[Non-Retryable Errors<br/>- Invalid URLs<br/>- Auth failures<br/>- Client errors 4xx]
        Critical[Critical Errors<br/>- Service unavailable<br/>- Data corruption]
    end
    
    subgraph "Recovery Strategies"
        RetryLogic[Exponential Backoff<br/>Max 3 retries<br/>Jitter included]
        FallbackChain[Fallback Strategy Chain<br/>1. Primary API<br/>2. Secondary API<br/>3. Web scraping<br/>4. Cached stale data<br/>5. Default preview]
        CircuitBreaker[Circuit Breaker<br/>- Failure threshold: 50%<br/>- Timeout: 30s<br/>- Half-open retry: 5 req]
    end
    
    subgraph "Monitoring & Alerting"
        ErrorMetrics[Error Rate Monitoring]
        AlertManager[Real-time Alerts]
        HealthCheck[Health Check Endpoints]
    end
    
    NetworkErrors --> Retryable
    APIErrors --> Retryable
    ParsingErrors --> NonRetryable
    ValidationErrors --> NonRetryable
    
    Retryable --> RetryLogic
    NonRetryable --> FallbackChain
    Critical --> AlertManager
    
    RetryLogic --> FallbackChain
    FallbackChain --> CircuitBreaker
    
    RetryLogic --> ErrorMetrics
    FallbackChain --> ErrorMetrics
    CircuitBreaker --> ErrorMetrics
    
    ErrorMetrics --> AlertManager
    ErrorMetrics --> HealthCheck
```

## 6. PERFORMANCE OPTIMIZATION ARCHITECTURE

```mermaid
graph LR
    subgraph "Input Optimization"
        URLValidation[URL Validation<br/>& Normalization]
        Deduplication[Request Deduplication]
        Batching[Request Batching]
    end
    
    subgraph "Processing Optimization"
        Concurrency[Concurrent Processing<br/>Max: 100 requests]
        ResourcePool[Connection Pooling<br/>Keep-alive enabled]
        ContentLimit[Content Size Limits<br/>Max: 5MB per request]
    end
    
    subgraph "Response Optimization"
        Compression[Response Compression<br/>gzip/brotli]
        ImageOptim[Image Optimization<br/>- Resize & compress<br/>- CDN integration<br/>- WebP conversion]
        Minification[JSON Minification]
    end
    
    subgraph "System Optimization"
        MemoryManagement[Memory Management<br/>- GC optimization<br/>- Object pooling<br/>- Memory monitoring]
        DatabaseOptim[Database Optimization<br/>- Query indexes<br/>- Connection pooling<br/>- Background cleanup]
        CDNIntegration[CDN Integration<br/>- Static asset caching<br/>- Geographic distribution]
    end
    
    URLValidation --> Concurrency
    Deduplication --> Concurrency
    Batching --> Concurrency
    
    Concurrency --> Compression
    ResourcePool --> Compression
    ContentLimit --> ImageOptim
    
    Compression --> MemoryManagement
    ImageOptim --> DatabaseOptim
    Minification --> CDNIntegration
    
    MemoryManagement --> Performance[Performance Metrics<br/>- Response times<br/>- Throughput<br/>- Resource utilization]
    DatabaseOptim --> Performance
    CDNIntegration --> Performance
```

## 7. DEPLOYMENT ARCHITECTURE

```mermaid
graph TB
    subgraph "Development Environment"
        DevAPI[Dev API Server]
        DevRedis[(Dev Redis)]
        DevDB[(Dev SQLite)]
        DevTests[Unit & Integration Tests]
    end
    
    subgraph "Staging Environment"
        StagingAPI[Staging API Server]
        StagingRedis[(Staging Redis Cluster)]
        StagingDB[(Staging PostgreSQL)]
        E2ETests[E2E Tests]
        LoadTests[Load Testing]
    end
    
    subgraph "Production Environment"
        ProdLB[Load Balancer]
        ProdAPI1[API Server 1]
        ProdAPI2[API Server 2]
        ProdAPIN[API Server N]
        ProdRedis[(Production Redis Cluster)]
        ProdDB[(Production Database)]
        Monitoring[Monitoring Stack]
    end
    
    subgraph "CI/CD Pipeline"
        GitHub[GitHub Repository]
        Actions[GitHub Actions]
        Testing[Automated Testing]
        Security[Security Scanning]
        Deploy[Deployment Automation]
    end
    
    subgraph "Feature Flags"
        FeatureToggle[Feature Toggle Service]
        GradualRollout[Gradual Rollout<br/>10% → 25% → 50% → 100%]
        ABTesting[A/B Testing Framework]
    end
    
    %% Development flow
    GitHub --> Actions
    Actions --> Testing
    Testing --> Security
    Security --> Deploy
    
    Deploy --> DevAPI
    DevAPI --> DevRedis
    DevAPI --> DevDB
    DevTests --> DevAPI
    
    %% Staging flow
    Deploy --> StagingAPI
    StagingAPI --> StagingRedis
    StagingAPI --> StagingDB
    E2ETests --> StagingAPI
    LoadTests --> StagingAPI
    
    %% Production flow
    Deploy --> ProdLB
    ProdLB --> ProdAPI1
    ProdLB --> ProdAPI2
    ProdLB --> ProdAPIN
    ProdAPI1 --> ProdRedis
    ProdAPI2 --> ProdRedis
    ProdAPIN --> ProdRedis
    ProdAPI1 --> ProdDB
    ProdAPI2 --> ProdDB
    ProdAPIN --> ProdDB
    
    %% Feature flag integration
    FeatureToggle --> ProdAPI1
    FeatureToggle --> ProdAPI2
    FeatureToggle --> ProdAPIN
    GradualRollout --> FeatureToggle
    ABTesting --> FeatureToggle
    
    %% Monitoring
    ProdAPI1 --> Monitoring
    ProdAPI2 --> Monitoring
    ProdAPIN --> Monitoring
    ProdRedis --> Monitoring
    ProdDB --> Monitoring
```

## 8. MONITORING & OBSERVABILITY ARCHITECTURE

```mermaid
graph TB
    subgraph "Application Layer"
        AppMetrics[Application Metrics<br/>- Response times<br/>- Success rates<br/>- Cache hit ratios]
        BusinessMetrics[Business Metrics<br/>- Preview requests<br/>- Platform distribution<br/>- User engagement]
    end
    
    subgraph "Infrastructure Layer"
        SystemMetrics[System Metrics<br/>- CPU, Memory, Disk<br/>- Network I/O<br/>- Database performance]
        NetworkMetrics[Network Metrics<br/>- API response times<br/>- External service health<br/>- Rate limit status]
    end
    
    subgraph "Data Collection"
        MetricsCollector[Metrics Collector]
        LogAggregator[Log Aggregator]
        TraceCollector[Distributed Tracing]
    end
    
    subgraph "Storage Layer"
        MetricsDB[(Metrics Database<br/>Time-series data)]
        LogsDB[(Centralized Logs<br/>Elasticsearch)]
        TracesDB[(Trace Storage<br/>Distributed spans)]
    end
    
    subgraph "Visualization Layer"
        Dashboard[Grafana Dashboard]
        LogViewer[Log Viewer Interface]
        TraceViewer[Trace Analysis Tool]
    end
    
    subgraph "Alerting Layer"
        AlertManager[Alert Manager]
        NotificationChannels[Notification Channels<br/>- Email<br/>- Slack<br/>- PagerDuty]
    end
    
    AppMetrics --> MetricsCollector
    BusinessMetrics --> MetricsCollector
    SystemMetrics --> MetricsCollector
    NetworkMetrics --> MetricsCollector
    
    MetricsCollector --> MetricsDB
    LogAggregator --> LogsDB
    TraceCollector --> TracesDB
    
    MetricsDB --> Dashboard
    LogsDB --> LogViewer
    TracesDB --> TraceViewer
    
    MetricsDB --> AlertManager
    AlertManager --> NotificationChannels
```

These architectural diagrams provide a comprehensive visual representation of the enhanced link preview system's design, covering all major components from high-level system architecture to detailed deployment and monitoring strategies.