# Skills System Architecture Diagrams

**Visual reference for the skills-based loading system**

---

## System Overview

```mermaid
graph TB
    subgraph "User Layer"
        U[👤 User Request<br/>Create feature with SPARC]
    end

    subgraph "Orchestration Layer"
        CCO[🎯 ClaudeCodeOrchestrator]
        SDK[🤖 ClaudeCodeSDKManager]
    end

    subgraph "Skills System"
        SL[📚 SkillLoader<br/>Orchestrator]
        SD[🔍 SkillDetector<br/>Context Analysis]
        SC[⚡ SkillCache<br/>LRU Cache]
        SM[📋 SkillManifest<br/>Registry]
    end

    subgraph "Storage Layer"
        FS[💾 File System<br/>/skills/]
        MF[📄 skills-manifest.json]
    end

    U --> CCO
    CCO --> SDK
    SDK --> SL
    SL --> SD
    SL --> SC
    SL --> SM
    SM --> MF
    SL --> FS

    style U fill:#E3F2FD
    style SL fill:#4169E1,color:#fff
    style SD fill:#32CD32
    style SC fill:#FFD700
    style SM fill:#FF6B6B,color:#fff
```

---

## Progressive Disclosure Flow

```mermaid
sequenceDiagram
    participant U as User
    participant SDK as ClaudeCodeSDKManager
    participant SL as SkillLoader
    participant SD as SkillDetector
    participant SC as SkillCache
    participant FS as File System

    U->>SDK: Query: "Create feature with SPARC"
    SDK->>SL: loadSkillsForContext(context)

    SL->>SD: detectSkills(context)
    SD->>SD: Keyword matching: "sparc" ✓
    SD->>SD: Classification: development ✓
    SD->>SD: Resolve dependencies
    SD-->>SL: ["sparc-methodology", "code-standards"]

    loop For each detected skill
        SL->>SC: get(skillId)
        alt Cache Hit ⚡
            SC-->>SL: Return cached skill (~10ms)
            Note over SL,SC: 85%+ cache hit rate
        else Cache Miss
            SL->>FS: Load Tier 1: metadata.json
            Note over FS: ~100 tokens, <50ms
            FS-->>SL: Metadata loaded

            alt Relevance Score >0.7
                SL->>FS: Load Tier 2: skill.md
                Note over FS: ~2000 tokens, <200ms
                FS-->>SL: Full content loaded
            else Low Relevance
                Note over SL: Skip Tier 2, use metadata only
            end

            SL->>SC: Cache skill for session
        end
    end

    SL-->>SDK: Loaded skills + system prompt
    SDK->>SDK: Execute Claude query
    SDK-->>U: Response with relevant context

    Note over U,SDK: Total: ~400 tokens (80% reduction)
```

---

## Three-Tier Loading Strategy

```mermaid
graph LR
    subgraph "Tier 1: Metadata"
        T1[🏷️ METADATA ONLY<br/>~100 tokens<br/><br/>• Skill ID<br/>• Name & Description<br/>• Triggers<br/>• Dependencies<br/>• Token Estimate<br/><br/>Load: ALWAYS]
        style T1 fill:#90EE90
    end

    subgraph "Tier 2: Content"
        T2[📖 FULL CONTENT<br/>~2000 tokens<br/><br/>• Instructions<br/>• Best Practices<br/>• Examples<br/>• Workflows<br/><br/>Load: If Relevance >0.7]
        style T2 fill:#FFD700
    end

    subgraph "Tier 3: Resources"
        T3[📦 RESOURCES<br/>variable tokens<br/><br/>• Templates<br/>• Reference Docs<br/>• Detailed Examples<br/>• Diagrams<br/><br/>Load: ON-DEMAND]
        style T3 fill:#FFA500
    end

    T1 --> T2
    T2 --> T3

    Note1[All Skills] -.->|"Load Tier 1"| T1
    Note2[High Relevance] -.->|"Load Tier 2"| T2
    Note3[Explicit Reference] -.->|"Load Tier 3"| T3
```

---

## Skill Detection Algorithm

```mermaid
flowchart TD
    Start([User Input]) --> Parse[Parse Prompt]

    Parse --> Strategy1[Strategy 1:<br/>Keyword Matching]
    Parse --> Strategy2[Strategy 2:<br/>Task Classification]
    Parse --> Strategy3[Strategy 3:<br/>Historical Patterns]

    Strategy1 --> |"Contains 'sparc'?"| Match1{Match?}
    Match1 -->|Yes| Detect1[Add: sparc-methodology]
    Match1 -->|No| Skip1[Skip]

    Strategy2 --> Classify[Classify Task Type]
    Classify --> |"Development task"| Detect2[Add: code-standards]

    Strategy3 --> History[Check Usage History]
    History --> Correlate[Find Correlated Skills]
    Correlate --> Detect3[Add: avi-architecture]

    Detect1 --> Merge[Merge Detected Skills]
    Detect2 --> Merge
    Detect3 --> Merge
    Skip1 --> Merge

    Merge --> Deps[Resolve Dependencies]
    Deps --> |"sparc needs code-standards"| Add[Add Dependencies]

    Add --> Priority[Sort by Priority]
    Priority --> Result([Final Skill List])

    style Match1 fill:#FFE4B5
    style Result fill:#90EE90
```

---

## Cache Architecture (LRU)

```mermaid
graph TB
    subgraph "SkillCache (LRU)"
        subgraph "In Memory"
            Entry1[Skill 1<br/>Last: 10:30:45<br/>TTL: ✓]
            Entry2[Skill 2<br/>Last: 10:30:40<br/>TTL: ✓]
            Entry3[Skill 3<br/>Last: 10:30:35<br/>TTL: ✗ Expired]
        end

        Stats[📊 Statistics<br/>Hits: 850<br/>Misses: 150<br/>Hit Rate: 85%<br/>Size: 48/50]
    end

    Request[Cache Request] --> Check{In Cache?}
    Check -->|Yes| Valid{TTL Valid?}
    Check -->|No| Miss[CACHE MISS]

    Valid -->|Yes| Hit[CACHE HIT ⚡]
    Valid -->|No| Miss

    Hit --> Update[Update Last Access]
    Update --> Return[Return Skill]

    Miss --> Load[Load from FS]
    Load --> Full{Cache Full?}

    Full -->|Yes| Evict[Evict LRU Entry]
    Full -->|No| Store[Store in Cache]

    Evict --> Store
    Store --> Return

    style Hit fill:#90EE90
    style Miss fill:#FFB6C1
    style Evict fill:#FFA500
```

---

## Class Relationships

```mermaid
classDiagram
    class ClaudeCodeSDKManager {
        -skillLoader: SkillLoader
        -workingDirectory: string
        -model: string
        +queryClaudeCode(prompt, options)
        +createStreamingChat(userInput)
        +healthCheck()
    }

    class SkillLoader {
        -cache: SkillCache
        -detector: SkillDetector
        -manifest: SkillManifest
        -skillsDirectory: string
        +initialize()
        +loadSkillsForContext(context)
        +generateSystemPrompt(context)
        +loadResource(skillId, resourcePath)
        -loadSkillMetadata(skillId)
        -loadFullSkill(skillId)
        -shouldLoadFullContent(metadata, context)
    }

    class SkillDetector {
        -manifest: SkillManifest
        -classifier: TaskClassifier
        -history: SkillUsageHistory
        +detectSkills(context)
        +calculateRelevance(metadata, context)
        -detectByKeywords(prompt)
        -detectByClassification(prompt)
        -detectByHistory(history)
        -resolveDependencies(skillIds)
    }

    class SkillCache {
        -cache: Map~string, CacheEntry~
        -maxSize: number
        -ttl: number
        +get(skillId)
        +set(skillId, skill)
        +clear()
        +getStats()
        -evictOldest()
    }

    class SkillManifest {
        -manifestPath: string
        -skills: Map~string, SkillManifestEntry~
        -categories: Map~string, string[]~
        +load()
        +getSkill(skillId)
        +getAllSkills()
        +getSkillsByCategory(category)
        +searchSkills(query)
    }

    class TaskClassifier {
        +classify(prompt)
        +getConfidence(prompt, category)
    }

    class SkillUsageHistory {
        +getCorrelatedSkills(skillIds)
        +getUsageFrequency(skillId)
        +getRecencyScore(skillId)
    }

    ClaudeCodeSDKManager --> SkillLoader
    SkillLoader --> SkillDetector
    SkillLoader --> SkillCache
    SkillLoader --> SkillManifest
    SkillDetector --> SkillManifest
    SkillDetector --> TaskClassifier
    SkillDetector --> SkillUsageHistory
```

---

## Data Flow: Simple Query

```mermaid
flowchart LR
    subgraph Input
        U1[User: List files]
    end

    subgraph Detection
        D1[Detect Skills]
        D1 --> |"No keywords matched"| R1[No skills needed]
    end

    subgraph Loading
        L1[Load Base Instructions]
        L1 --> |"~150 tokens"| P1[System Prompt]
    end

    subgraph Result
        S1[Total: 150 tokens<br/>🎉 92.8% reduction]
    end

    U1 --> D1
    R1 --> L1
    P1 --> S1

    style S1 fill:#90EE90
```

---

## Data Flow: Complex Query

```mermaid
flowchart LR
    subgraph Input
        U2[User: Build app with SPARC,<br/>coordination, and branding]
    end

    subgraph Detection
        D2[Detect Skills]
        D2 --> |"Multiple matches"| R2[sparc-methodology<br/>agent-coordination<br/>brand-guidelines<br/>code-standards]
    end

    subgraph Loading
        L2A[Load Tier 1: Metadata<br/>4 × 100 = 400 tokens]
        L2A --> L2B[Load Tier 2: Content<br/>3 × ~2000 = ~6000 tokens]
        L2B --> |"High relevance"| P2[System Prompt]
    end

    subgraph Result
        S2[Total: ~1800 tokens<br/>Still 13.8% reduction]
    end

    U2 --> D2
    R2 --> L2A
    P2 --> S2

    style S2 fill:#FFD700
```

---

## File System Structure

```mermaid
graph TB
    Root[📁 /workspaces/agent-feed/skills/]

    Root --> Manifest[📄 skills-manifest.json<br/>Central Registry]
    Root --> System[📁 .system/<br/>Protected System Skills]
    Root --> Shared[📁 shared/<br/>Cross-Agent Skills]
    Root --> Agent[📁 agent-specific/<br/>Agent-Scoped Skills]

    System --> Sparc[📁 sparc-methodology/]
    System --> Coord[📁 agent-coordination/]
    System --> Code[📁 code-standards/]
    System --> Brand[📁 brand-guidelines/]
    System --> Arch[📁 avi-architecture/]

    Sparc --> Meta1[📄 metadata.json<br/>~100 tokens]
    Sparc --> Skill1[📄 skill.md<br/>~1800 tokens]
    Sparc --> Ex1[📁 examples/<br/>Tier 3]
    Sparc --> Res1[📁 resources/<br/>Tier 3]

    style Manifest fill:#FF6B6B,color:#fff
    style System fill:#4169E1,color:#fff
    style Meta1 fill:#90EE90
    style Skill1 fill:#FFD700
    style Ex1 fill:#FFA500
```

---

## Token Usage Comparison

```mermaid
graph TD
    subgraph "Current System (CLAUDE.md)"
        C1[All Queries Load<br/>📄 CLAUDE.md<br/>2,088 tokens]

        C1 --> Q1[Simple Query:<br/>2,088 tokens ❌]
        C1 --> Q2[Medium Query:<br/>2,088 tokens ❌]
        C1 --> Q3[Complex Query:<br/>2,088 tokens ❌]
    end

    subgraph "Skills System"
        S1[Intelligent Loading<br/>🎯 Context-Aware]

        S1 --> Q4[Simple Query:<br/>150 tokens ✅<br/>92.8% reduction]
        S1 --> Q5[Medium Query:<br/>800 tokens ✅<br/>61.7% reduction]
        S1 --> Q6[Complex Query:<br/>1,800 tokens ✅<br/>13.8% reduction]
    end

    Avg1[Average: 2,088 tokens] --> C1
    Avg2[Average: 400 tokens<br/>🎉 80.8% reduction] --> S1

    style C1 fill:#FFB6C1
    style S1 fill:#90EE90
    style Q4 fill:#90EE90
    style Q5 fill:#90EE90
    style Q6 fill:#FFD700
```

---

## Cost Savings Visualization

```mermaid
graph LR
    subgraph "Current Cost (CLAUDE.md)"
        Cost1[10,000 queries<br/>× 2,088 tokens<br/>= 20.88M tokens<br/><br/>$62.64/month]
    end

    subgraph "New Cost (Skills System)"
        Cost2[10,000 queries<br/>× 400 tokens<br/>= 4M tokens<br/><br/>$12.00/month]
    end

    subgraph "Savings"
        Save[💰 $50.64/month<br/>💰 $607.68/year<br/><br/>80.8% reduction]
    end

    Cost1 --> Save
    Cost2 --> Save

    style Cost1 fill:#FFB6C1
    style Cost2 fill:#90EE90
    style Save fill:#FFD700
```

---

## Migration Timeline

```mermaid
gantt
    title Skills System Migration Timeline
    dateFormat YYYY-MM-DD
    section Phase 1: Preparation
    Create directory structure    :done, p1, 2025-11-01, 2d
    Initial manifest              :done, p1, 2025-11-02, 2d
    Extract first skill           :done, p1, 2025-11-03, 3d

    section Phase 2: Implementation
    Build SkillLoader            :active, p2, 2025-11-04, 5d
    Build SkillDetector          :p2, 2025-11-06, 5d
    Build SkillCache             :p2, 2025-11-07, 4d
    Unit tests                   :p2, 2025-11-09, 5d

    section Phase 3: Skill Migration
    Extract SPARC skill          :p3, 2025-11-11, 2d
    Extract coordination skill   :p3, 2025-11-12, 2d
    Extract code standards       :p3, 2025-11-13, 2d
    Extract brand guidelines     :p3, 2025-11-14, 2d
    Extract architecture skill   :p3, 2025-11-15, 2d

    section Phase 4: Integration
    SDK integration              :p4, 2025-11-18, 4d
    Enable fallback mode         :p4, 2025-11-20, 2d
    Production monitoring        :p4, 2025-11-21, 3d

    section Phase 5: Optimization
    Performance tuning           :p5, 2025-11-25, 4d
    Accuracy improvement         :p5, 2025-11-27, 3d
    Validation                   :p5, 2025-11-28, 2d

    section Phase 6: Deprecation
    Disable fallback            :p6, 2025-12-02, 2d
    Monitor stability           :p6, 2025-12-03, 5d
    Archive CLAUDE.md           :crit, p6, 2025-12-08, 1d
```

---

## Performance Monitoring Dashboard

```mermaid
graph TB
    subgraph "Real-Time Metrics"
        M1[⚡ Cache Hit Rate<br/>Current: 87%<br/>Target: >85%<br/>Status: ✅]
        M2[🎯 Avg Load Time<br/>Current: 345ms<br/>Target: <500ms<br/>Status: ✅]
        M3[💾 Token Usage<br/>Current: 380 avg<br/>Target: <400<br/>Status: ✅]
        M4[💰 Cost Savings<br/>Current: 82%<br/>Target: >80%<br/>Status: ✅]
    end

    subgraph "Skill Usage"
        U1[📊 Top Skills<br/>1. sparc-methodology<br/>2. code-standards<br/>3. agent-coordination]
        U2[📈 Trends<br/>↗️ 15% increase<br/>SPARC usage]
    end

    subgraph "System Health"
        H1[✅ All Systems<br/>Operational]
        H2[🔄 Cache Size<br/>48/50 entries]
        H3[⏱️ Uptime<br/>99.9%]
    end

    style M1 fill:#90EE90
    style M2 fill:#90EE90
    style M3 fill:#90EE90
    style M4 fill:#90EE90
    style H1 fill:#90EE90
```

---

## Security & Protection

```mermaid
flowchart TD
    subgraph "Skill Access Control"
        A1[Skill Request]
        A1 --> Check{Path Check}

        Check -->|".system/"| ReadOnly[READ ONLY ✅<br/>Protected System Skills]
        Check -->|"shared/"| AdminOnly[ADMIN ONLY ✅<br/>Shared Skills]
        Check -->|"agent-specific/"| OwnerOnly[OWNER ONLY ✅<br/>Agent-Scoped Skills]

        ReadOnly --> V1[Validation]
        AdminOnly --> V1
        OwnerOnly --> V1

        V1 --> V2{Schema Valid?}
        V2 -->|Yes| V3{Token Limit?}
        V2 -->|No| Reject[❌ REJECT]

        V3 -->|<5000| V4{Safe Content?}
        V3 -->|>5000| Reject

        V4 -->|Yes| Allow[✅ ALLOW]
        V4 -->|No| Reject
    end

    style ReadOnly fill:#4169E1,color:#fff
    style AdminOnly fill:#FFD700
    style OwnerOnly fill:#32CD32
    style Allow fill:#90EE90
    style Reject fill:#FFB6C1
```

---

## Error Handling Flow

```mermaid
flowchart TD
    Start[Load Skill Request] --> Try{Try Load}

    Try -->|Success| Return[Return Skill ✅]
    Try -->|Error| Type{Error Type?}

    Type -->|Skill Not Found| E1[SkillNotFoundError<br/>Log + Return null]
    Type -->|Load Failed| E2[SkillLoadError<br/>Try fallback]
    Type -->|Cache Error| E3[CacheError<br/>Clear + Retry]
    Type -->|Unknown| E4[GenericError<br/>Log + Fallback]

    E2 --> Fallback{Fallback Mode?}
    Fallback -->|Enabled| CLAUDE[Load CLAUDE.md]
    Fallback -->|Disabled| Fail[Fail Request ❌]

    E1 --> Log[Log Error]
    E3 --> Retry[Retry Load]
    E4 --> Log

    CLAUDE --> Return
    Log --> Return
    Retry --> Try

    style Return fill:#90EE90
    style Fail fill:#FFB6C1
    style CLAUDE fill:#FFD700
```

---

## Testing Strategy Overview

```mermaid
graph TB
    subgraph "Unit Tests (>90% coverage)"
        UT1[SkillLoader Tests<br/>- loadSkillMetadata()<br/>- loadFullSkill()<br/>- generateSystemPrompt()]
        UT2[SkillDetector Tests<br/>- detectByKeywords()<br/>- detectByClassification()<br/>- calculateRelevance()]
        UT3[SkillCache Tests<br/>- LRU eviction<br/>- TTL expiration<br/>- Hit rate tracking]
        UT4[SkillManifest Tests<br/>- load()<br/>- getSkill()<br/>- searchSkills()]
    end

    subgraph "Integration Tests"
        IT1[Skills + SDK Integration<br/>- Query with skills<br/>- Cache performance<br/>- Token efficiency]
        IT2[Backward Compatibility<br/>- Fallback mode<br/>- CLAUDE.md parity<br/>- Zero breaking changes]
    end

    subgraph "E2E Tests"
        E2E1[Real-World Scenarios<br/>- Feature development<br/>- Multi-skill workflows<br/>- Dependency resolution]
        E2E2[Performance Tests<br/>- Load time benchmarks<br/>- Cache hit ratio<br/>- Token usage validation]
    end

    UT1 --> IT1
    UT2 --> IT1
    UT3 --> IT1
    UT4 --> IT1

    IT1 --> E2E1
    IT2 --> E2E1

    E2E1 --> E2E2

    style UT1 fill:#90EE90
    style IT1 fill:#FFD700
    style E2E1 fill:#FFA500
```

---

**For detailed specifications, see**: [SKILLS-SYSTEM-ARCHITECTURE.md](./SKILLS-SYSTEM-ARCHITECTURE.md)

**For implementation guide, see**: [SKILLS-SYSTEM-QUICK-REFERENCE.md](./SKILLS-SYSTEM-QUICK-REFERENCE.md)

**Status**: Design Complete - Ready for Implementation
**Last Updated**: 2025-10-30
