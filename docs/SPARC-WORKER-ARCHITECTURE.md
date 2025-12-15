# SPARC: Worker Content Extraction Enhancement Architecture

**Version**: 1.0
**Date**: 2025-10-24
**Phase**: Architecture (A)
**Status**: Design Phase - Implementation Pending

---

## Table of Contents

1. [System Overview](#system-overview)
2. [Component Architecture](#component-architecture)
3. [Data Flow Architecture](#data-flow-architecture)
4. [File System Architecture](#file-system-architecture)
5. [Error Handling Architecture](#error-handling-architecture)
6. [Performance Architecture](#performance-architecture)
7. [Integration Architecture](#integration-architecture)
8. [Security Architecture](#security-architecture)

---

## System Overview

### Problem Statement

The AgentWorker currently extracts intelligence only from agent instruction files. This limits the depth and quality of agent responses, particularly for proactive agents that need access to:
- Skills definitions and frameworks
- Historical context from workspace files
- User preferences and patterns
- Rich contextual data beyond basic instructions

### Solution Architecture

Enhance the AgentWorker with intelligent content extraction capabilities that:
1. Read agent frontmatter for metadata and configuration
2. Extract workspace file patterns from frontmatter
3. Load and parse workspace files for contextual intelligence
4. Fall back to text message extraction when workspace files unavailable
5. Combine multiple sources into comprehensive context

### Architecture Principles

1. **Progressive Enhancement**: Graceful degradation from workspace files to text fallback
2. **Performance First**: Caching, size limits, and timeout protection
3. **Security by Design**: Path validation, file size limits, sanitization
4. **Error Resilience**: Comprehensive error handling with recovery strategies
5. **Observability**: Detailed logging and monitoring integration

---

## Component Architecture

### High-Level Component Diagram

```
┌─────────────────────────────────────────────────────────────────────┐
│                        AgentWorker Class                             │
├─────────────────────────────────────────────────────────────────────┤
│                                                                       │
│  ┌──────────────────────────────────────────────────────────────┐  │
│  │                    Core Methods (Existing)                    │  │
│  ├──────────────────────────────────────────────────────────────┤  │
│  │  - execute()              Main worker lifecycle               │  │
│  │  - fetchTicket()          Get ticket from work queue          │  │
│  │  - processURL()           Process URL with SDK                │  │
│  │  - postToAgentFeed()      Post comment to feed                │  │
│  │  - emitStatusUpdate()     WebSocket status events             │  │
│  └──────────────────────────────────────────────────────────────┘  │
│                                                                       │
│  ┌──────────────────────────────────────────────────────────────┐  │
│  │              NEW: Content Extraction Methods                  │  │
│  ├──────────────────────────────────────────────────────────────┤  │
│  │  + readAgentFrontmatter(agentId)                              │  │
│  │    → Reads agent .md file, extracts YAML frontmatter          │  │
│  │    → Returns: { metadata, skills, workspace_files }           │  │
│  │                                                                │  │
│  │  + extractFromWorkspaceFiles(agentId, filePatterns)           │  │
│  │    → Reads files from agent workspace using patterns          │  │
│  │    → Returns: { files: [{ path, content, size }] }            │  │
│  │                                                                │  │
│  │  + extractIntelligence(ticket)                                │  │
│  │    → Orchestrates extraction from all sources                 │  │
│  │    → Returns: { context, sources, intelligence }              │  │
│  │                                                                │  │
│  │  + buildEnhancedPrompt(intelligence, ticket)                  │  │
│  │    → Combines extracted content into SDK prompt               │  │
│  │    → Returns: formatted prompt string                         │  │
│  └──────────────────────────────────────────────────────────────┘  │
│                                                                       │
│  ┌──────────────────────────────────────────────────────────────┐  │
│  │                  Support Components                           │  │
│  ├──────────────────────────────────────────────────────────────┤  │
│  │  - FrontmatterCache        TTL-based metadata cache           │  │
│  │  - FileValidator           Path/size/type validation          │  │
│  │  - ContentSanitizer        XSS/injection prevention           │  │
│  │  - ErrorHandler            Categorized error recovery         │  │
│  └──────────────────────────────────────────────────────────────┘  │
│                                                                       │
└─────────────────────────────────────────────────────────────────────┘

┌─────────────────────────────────────────────────────────────────────┐
│                         Dependencies                                 │
├─────────────────────────────────────────────────────────────────────┤
│  fs/promises              File system operations                     │
│  path                     Path manipulation and validation           │
│  yaml                     YAML frontmatter parsing                   │
│  glob                     Workspace file pattern matching            │
│  WorkQueueRepository      Ticket data access                         │
│  WebSocketService         Real-time status updates                   │
│  ClaudeCodeSDKManager     Agent execution engine                     │
└─────────────────────────────────────────────────────────────────────┘
```

### Component Interaction Sequence

```
┌──────────┐     ┌──────────┐     ┌─────────────┐     ┌──────────┐
│  Ticket  │────▶│  Worker  │────▶│  Extractor  │────▶│   SDK    │
│  Queue   │     │          │     │             │     │          │
└──────────┘     └──────────┘     └─────────────┘     └──────────┘
                      │                  │                  │
                      │                  ▼                  │
                      │         ┌────────────────┐         │
                      │         │   Frontmatter  │         │
                      │         │     Cache      │         │
                      │         └────────────────┘         │
                      │                  │                  │
                      │                  ▼                  │
                      │         ┌────────────────┐         │
                      │         │   Workspace    │         │
                      │         │     Files      │         │
                      │         └────────────────┘         │
                      │                  │                  │
                      │                  ▼                  │
                      │         ┌────────────────┐         │
                      │         │   Enhanced     │         │
                      │         │    Context     │─────────┘
                      │         └────────────────┘
                      │                  │
                      ▼                  ▼
              ┌──────────────────────────────┐
              │      Agent Feed Comment       │
              └──────────────────────────────┘
```

### Class Structure Details

```typescript
class AgentWorker {
  // Existing properties
  private workerId: string;
  private ticketId: string;
  private agentId: string;
  private postId: string | null;
  private status: string;
  private workQueueRepo: WorkQueueRepository;
  private websocketService: WebSocketService;

  // NEW: Content extraction properties
  private frontmatterCache: Map<string, CachedFrontmatter>;
  private fileValidator: FileValidator;
  private contentSanitizer: ContentSanitizer;

  // NEW: Content extraction methods
  async readAgentFrontmatter(agentId: string): Promise<AgentFrontmatter>;
  async extractFromWorkspaceFiles(agentId: string, patterns: string[]): Promise<WorkspaceContent>;
  async extractIntelligence(ticket: Ticket): Promise<IntelligenceContext>;
  buildEnhancedPrompt(intelligence: IntelligenceContext, ticket: Ticket): string;

  // Updated method signature
  async processURL(ticket: Ticket): Promise<IntelligenceSummary>;
}

interface AgentFrontmatter {
  metadata: {
    name: string;
    tier: number;
    visibility: string;
    description: string;
    tools: string[];
    skills?: SkillReference[];
    proactive: boolean;
    priority: string;
  };
  workspace_files?: WorkspaceFilePattern[];
  content: string; // Main instruction content
}

interface WorkspaceFilePattern {
  path: string;           // Relative to agent workspace
  description?: string;   // What this file contains
  required: boolean;      // Critical for agent operation?
  max_size?: number;      // Override default 5MB limit
}

interface WorkspaceContent {
  files: WorkspaceFile[];
  totalSize: number;
  extractionTime: number;
}

interface WorkspaceFile {
  path: string;
  content: string;
  size: number;
  type: string;  // 'skill', 'context', 'data', 'config'
}

interface IntelligenceContext {
  sources: {
    frontmatter: AgentFrontmatter;
    workspace: WorkspaceContent;
    ticket: Ticket;
  };
  extractedContent: string;  // Formatted for SDK prompt
  metadata: {
    sourceCount: number;
    totalSize: number;
    extractionTime: number;
  };
}
```

---

## Data Flow Architecture

### Overall Data Flow: Ticket to Response

```
┌──────────────────────────────────────────────────────────────────────┐
│                    ENHANCED AGENT WORKER FLOW                         │
└──────────────────────────────────────────────────────────────────────┘

START: Ticket Created
    │
    ├─ [1] TICKET FETCH
    │      └─ WorkQueueRepository.getTicket(ticketId)
    │         Returns: { id, agent_id, url, post_id, content, ... }
    │
    ├─ [2] STATUS UPDATE: 'processing'
    │      └─ WebSocketService.emitTicketStatusUpdate(...)
    │
    ├─ [3] CONTENT EXTRACTION (NEW)
    │      │
    │      ├─ [3.1] Read Agent Frontmatter
    │      │        ├─ Check cache (TTL: 60 min)
    │      │        │   └─ Cache HIT → return cached
    │      │        │   └─ Cache MISS → continue
    │      │        │
    │      │        ├─ Read /prod/.claude/agents/{agent_id}.md
    │      │        ├─ Parse YAML frontmatter (using 'yaml' library)
    │      │        ├─ Extract metadata, skills, workspace_files
    │      │        └─ Cache result for 60 minutes
    │      │
    │      ├─ [3.2] Extract Workspace Files
    │      │        │
    │      │        ├─ IF frontmatter has workspace_files:
    │      │        │   ├─ For each pattern in workspace_files:
    │      │        │   │   ├─ Validate path (security check)
    │      │        │   │   ├─ Check file size (max 5MB)
    │      │        │   │   ├─ Read file content
    │      │        │   │   └─ Sanitize content (XSS prevention)
    │      │        │   └─ Collect all files
    │      │        │
    │      │        └─ ELSE: Use default patterns
    │      │            └─ /prod/agent_workspace/{agent_id}/**/*.{md,json}
    │      │
    │      ├─ [3.3] Fallback to Text Message (if workspace fails)
    │      │        └─ Extract from ticket.content using keywords
    │      │            └─ "context:", "data:", "files:", etc.
    │      │
    │      └─ [3.4] Build Intelligence Context
    │               └─ Combine: frontmatter + workspace + ticket
    │
    ├─ [4] BUILD ENHANCED PROMPT
    │      │
    │      ├─ Format workspace content
    │      ├─ Include skills definitions
    │      ├─ Add ticket URL and context
    │      └─ Construct comprehensive prompt:
    │          """
    │          {Agent Instructions}
    │
    │          ## Workspace Context
    │          {Workspace Files Content}
    │
    │          ## Skills Available
    │          {Skills Metadata}
    │
    │          ## Current Task
    │          Process this URL: {ticket.url}
    │
    │          Context: {ticket.content}
    │          """
    │
    ├─ [5] EXECUTE CLAUDE CODE SDK
    │      ├─ SDKManager.executeHeadlessTask(enhancedPrompt)
    │      ├─ Agent processes with full context
    │      └─ Returns: { messages, usage, result }
    │
    ├─ [6] EXTRACT INTELLIGENCE
    │      ├─ Parse SDK response messages
    │      ├─ Combine assistant responses
    │      ├─ Calculate token usage
    │      └─ Build intelligence summary
    │
    ├─ [7] POST TO AGENT FEED
    │      ├─ POST /api/agent-posts/{post_id}/comments
    │      ├─ Body: { content, author_agent, skipTicket: true }
    │      └─ Returns: { comment_id, ... }
    │
    ├─ [8] STATUS UPDATE: 'completed'
    │      └─ WebSocketService.emitTicketStatusUpdate(...)
    │
    └─ END: Return success result
```

### Content Extraction Flow (Detailed)

```
┌─────────────────────────────────────────────────────────────────┐
│              CONTENT EXTRACTION DECISION TREE                    │
└─────────────────────────────────────────────────────────────────┘

extractIntelligence(ticket)
    │
    ├─ TRY: readAgentFrontmatter(ticket.agent_id)
    │   │
    │   ├─ SUCCESS:
    │   │   └─ frontmatter = { metadata, workspace_files, content }
    │   │
    │   └─ CATCH (ERR-WCE-001: File Not Found):
    │       └─ LOG: "Agent instructions not found"
    │       └─ RETURN: Basic context (ticket content only)
    │
    ├─ IF frontmatter.workspace_files exists AND length > 0:
    │   │
    │   ├─ TRY: extractFromWorkspaceFiles(agentId, patterns)
    │   │   │
    │   │   ├─ For each pattern:
    │   │   │   │
    │   │   │   ├─ Validate path (ERR-WCE-003 if invalid)
    │   │   │   ├─ Check size (ERR-WCE-004 if > 5MB)
    │   │   │   ├─ Read file (ERR-WCE-002 if fails)
    │   │   │   └─ Add to workspace.files[]
    │   │   │
    │   │   ├─ SUCCESS:
    │   │   │   └─ workspace = { files: [...], totalSize, time }
    │   │   │
    │   │   └─ CATCH (File Error):
    │   │       ├─ LOG: "Workspace extraction failed: {error}"
    │   │       └─ FALLBACK: Try text message extraction
    │   │
    │   └─ RETURN: { frontmatter, workspace, ticket }
    │
    ├─ ELSE (No workspace_files in frontmatter):
    │   │
    │   └─ TRY: Extract from ticket.content
    │       ├─ Search for keywords: "context:", "data:", "files:"
    │       ├─ Extract structured data from message
    │       ├─ Parse JSON if embedded
    │       └─ RETURN: { frontmatter, textContext, ticket }
    │
    └─ FINAL: Build IntelligenceContext
        └─ Combine all sources with metadata
```

### Fallback Cascade

```
Primary Strategy: Workspace Files
    │
    ├─ Check frontmatter.workspace_files
    ├─ Validate each file pattern
    ├─ Read and parse files
    └─ Build rich context
        │
        └─ ON FAILURE ────────────────────┐
                                           │
Secondary Strategy: Default Patterns      │
    │                                      │
    ├─ Use /agent_workspace/{id}/**/*.md  │
    ├─ Glob pattern matching              │
    └─ Best-effort extraction             │
        │                                  │
        └─ ON FAILURE ────────────────┐   │
                                       │   │
Tertiary Strategy: Text Message        │   │
    │                                  │   │
    ├─ Parse ticket.content            │   │
    ├─ Extract embedded data           │   │
    └─ Use ticket context only         │   │
        │                              │   │
        └─ ON FAILURE ────────┐        │   │
                               │        │   │
Final Fallback: Basic Context  │        │   │
    │                          │        │   │
    ├─ Agent instructions only │        │   │
    ├─ Ticket URL              │        │   │
    └─ Minimal context         │────────┴───┘
```

---

## File System Architecture

### Directory Structure

```
/workspaces/agent-feed/
├── prod/
│   ├── .claude/
│   │   └── agents/
│   │       ├── link-logger-agent.md          ← Agent definitions
│   │       ├── personal-todos-agent.md
│   │       ├── follow-ups-agent.md
│   │       └── ...
│   │
│   ├── agent_workspace/
│   │   ├── link-logger-agent/
│   │   │   ├── knowledge-base/
│   │   │   │   ├── competitive-intel.json    ← Structured data
│   │   │   │   ├── market-research.md
│   │   │   │   └── strategic-links.db
│   │   │   │
│   │   │   ├── templates/
│   │   │   │   ├── executive-brief.md        ← Template files
│   │   │   │   └── intelligence-report.md
│   │   │   │
│   │   │   └── config/
│   │   │       ├── categorization-rules.json
│   │   │       └── priority-scoring.yaml
│   │   │
│   │   ├── personal-todos-agent/
│   │   │   └── ...
│   │   │
│   │   └── follow-ups-agent/
│   │       └── ...
│   │
│   └── skills/
│       ├── .system/
│       │   ├── brand-guidelines/
│       │   │   └── voice.md                  ← Skill definitions
│       │   └── code-standards/
│       │       └── typescript.md
│       │
│       └── shared/
│           ├── link-curation/
│           │   └── evaluation.md
│           └── user-preferences/
│               └── preferences.json
│
└── api-server/
    └── worker/
        └── agent-worker.js                    ← Worker implementation
```

### Agent Frontmatter Schema

```yaml
---
# Required Fields
name: link-logger-agent
tier: 1
visibility: public
description: Strategic link capture and progressive summarization
tools: [Read, Write, Grep, Bash, WebFetch, mcp__firecrawl__*]
model: sonnet
proactive: true
priority: P2

# NEW: Workspace Files Configuration
workspace_files:
  - path: knowledge-base/competitive-intel.json
    description: Historical competitive intelligence database
    required: true
    max_size: 10485760  # 10MB override

  - path: templates/*.md
    description: Report and brief templates
    required: false
    max_size: 1048576   # 1MB

  - path: config/*.{json,yaml}
    description: Agent configuration files
    required: true

# Skills Integration
skills:
  - name: brand-guidelines
    path: .system/brand-guidelines
    required: true

  - name: link-curation
    path: shared/link-curation
    required: true

# Skills Loading Strategy
skills_loading: progressive
skills_cache_ttl: 3600

# Page Configuration
page_config:
  route: /agents/link-logger-agent
  component: LinkLoggerPage
  data_endpoint: /api/agents/link-logger-agent/data
  layout: single
---

# Agent Instructions Follow...
```

### File Pattern Matching

```javascript
// Pattern Examples

// Single file
"knowledge-base/competitive-intel.json"
→ /prod/agent_workspace/link-logger-agent/knowledge-base/competitive-intel.json

// Wildcard filename
"templates/*.md"
→ /prod/agent_workspace/link-logger-agent/templates/executive-brief.md
→ /prod/agent_workspace/link-logger-agent/templates/intelligence-report.md

// Multi-extension
"config/*.{json,yaml}"
→ /prod/agent_workspace/link-logger-agent/config/categorization-rules.json
→ /prod/agent_workspace/link-logger-agent/config/priority-scoring.yaml

// Recursive glob
"knowledge-base/**/*.json"
→ All JSON files in knowledge-base and subdirectories

// Default pattern (if not specified)
"**/*.{md,json,yaml}"
→ All markdown, JSON, YAML in agent workspace
```

### Path Validation Rules

```javascript
// Security Validation

1. Path must be relative (no leading /)
2. Path must not contain '..'
3. Path must resolve within agent workspace
4. Path must not be a symlink
5. Path must not point to system files

// Valid Paths
✓ "knowledge-base/data.json"
✓ "templates/brief.md"
✓ "config/settings.yaml"

// Invalid Paths
✗ "/etc/passwd"                    → Absolute path
✗ "../../../system/secrets"        → Directory traversal
✗ "/prod/system_instructions/..."  → Outside workspace
✗ "~/.ssh/id_rsa"                  → Home directory access
```

### File Size Management

```javascript
// Default Limits
const FILE_SIZE_LIMITS = {
  default: 5 * 1024 * 1024,      // 5MB default
  workspace_total: 50 * 1024 * 1024,  // 50MB total per extraction

  // Per-type overrides
  json: 10 * 1024 * 1024,        // 10MB for JSON
  md: 2 * 1024 * 1024,           // 2MB for Markdown
  yaml: 1 * 1024 * 1024,         // 1MB for YAML
};

// Frontmatter Override
workspace_files:
  - path: large-dataset.json
    max_size: 20971520  // 20MB override
```

---

## Error Handling Architecture

### Error Code Taxonomy

```
┌─────────────────────────────────────────────────────────────┐
│              ERROR CODE STRUCTURE: ERR-WCE-XXX               │
│                  Worker Content Extraction                    │
└─────────────────────────────────────────────────────────────┘

ERR-WCE-001: Agent Instructions Not Found
  Severity: CRITICAL
  Category: File Access
  Recovery: Return basic context (ticket only)

ERR-WCE-002: Workspace File Read Error
  Severity: HIGH
  Category: File Access
  Recovery: Skip file, continue with others

ERR-WCE-003: Invalid File Path
  Severity: HIGH
  Category: Security
  Recovery: Skip file, log security event

ERR-WCE-004: File Size Limit Exceeded
  Severity: MEDIUM
  Category: Resource
  Recovery: Skip file, use smaller files

ERR-WCE-005: Frontmatter Parse Error
  Severity: HIGH
  Category: Data Format
  Recovery: Use raw content without metadata

ERR-WCE-006: Timeout During Extraction
  Severity: MEDIUM
  Category: Performance
  Recovery: Use partial results collected

ERR-WCE-007: Content Sanitization Failed
  Severity: HIGH
  Category: Security
  Recovery: Skip content, log security event

ERR-WCE-008: Cache Corruption
  Severity: LOW
  Category: Data Integrity
  Recovery: Invalidate cache, re-read from source
```

### Error Handling Flow

```
┌───────────────────────────────────────────────────────────────┐
│                  ERROR RECOVERY STRATEGY                       │
└───────────────────────────────────────────────────────────────┘

ERROR DETECTED
    │
    ├─ [1] CLASSIFY ERROR
    │      ├─ Check error code/type
    │      ├─ Determine severity
    │      └─ Select recovery strategy
    │
    ├─ [2] LOG ERROR
    │      ├─ Log level based on severity
    │      │   ├─ CRITICAL → error()
    │      │   ├─ HIGH → warn()
    │      │   ├─ MEDIUM → warn()
    │      │   └─ LOW → info()
    │      │
    │      └─ Include context:
    │          ├─ workerId
    │          ├─ ticketId
    │          ├─ agentId
    │          ├─ error code
    │          ├─ error message
    │          └─ stack trace
    │
    ├─ [3] EXECUTE RECOVERY
    │      │
    │      ├─ ERR-WCE-001 (No Agent Instructions):
    │      │   └─ RETURN: { ticket: {...}, workspace: null }
    │      │
    │      ├─ ERR-WCE-002 (File Read Error):
    │      │   └─ SKIP file, continue with remaining files
    │      │
    │      ├─ ERR-WCE-003 (Invalid Path):
    │      │   ├─ LOG security event
    │      │   └─ SKIP file, blacklist pattern
    │      │
    │      ├─ ERR-WCE-004 (Size Limit):
    │      │   ├─ LOG warning
    │      │   └─ SKIP file, suggest splitting
    │      │
    │      ├─ ERR-WCE-005 (Parse Error):
    │      │   └─ USE raw content without metadata
    │      │
    │      ├─ ERR-WCE-006 (Timeout):
    │      │   └─ RETURN partial results collected so far
    │      │
    │      ├─ ERR-WCE-007 (Sanitization Failed):
    │      │   ├─ LOG security event
    │      │   └─ SKIP content entirely
    │      │
    │      └─ ERR-WCE-008 (Cache Corruption):
    │          ├─ INVALIDATE cache entry
    │          └─ RE-READ from source
    │
    ├─ [4] UPDATE STATUS
    │      ├─ If recoverable: Continue with degraded data
    │      ├─ If critical: Fail ticket with retry
    │      └─ Emit WebSocket status update
    │
    └─ [5] MONITOR & ALERT
           ├─ Increment error counter metrics
           ├─ Check error rate threshold
           └─ Alert if > 10% error rate
```

### Error Response Structure

```javascript
class WorkerContentError extends Error {
  constructor(code, message, context) {
    super(message);
    this.code = code;              // ERR-WCE-XXX
    this.context = context;        // Additional context
    this.timestamp = Date.now();
    this.severity = this.getSeverity(code);
  }

  getSeverity(code) {
    const severityMap = {
      'ERR-WCE-001': 'CRITICAL',
      'ERR-WCE-002': 'HIGH',
      'ERR-WCE-003': 'HIGH',
      'ERR-WCE-004': 'MEDIUM',
      'ERR-WCE-005': 'HIGH',
      'ERR-WCE-006': 'MEDIUM',
      'ERR-WCE-007': 'HIGH',
      'ERR-WCE-008': 'LOW',
    };
    return severityMap[code] || 'UNKNOWN';
  }

  isRecoverable() {
    return this.severity !== 'CRITICAL';
  }

  getRecoveryStrategy() {
    // Returns specific recovery action
  }
}
```

### Retry Logic

```javascript
// Retry Configuration
const RETRY_CONFIG = {
  maxRetries: 3,
  backoff: 'exponential',  // linear | exponential | fixed
  initialDelay: 1000,      // 1 second
  maxDelay: 30000,         // 30 seconds

  // Retry conditions
  retryOn: [
    'ERR-WCE-002',  // File read error
    'ERR-WCE-006',  // Timeout
  ],

  noRetryOn: [
    'ERR-WCE-003',  // Invalid path (security)
    'ERR-WCE-007',  // Sanitization failed (security)
  ]
};

// Retry Implementation
async function withRetry(operation, config) {
  let lastError;

  for (let attempt = 0; attempt < config.maxRetries; attempt++) {
    try {
      return await operation();
    } catch (error) {
      lastError = error;

      // Check if retryable
      if (!config.retryOn.includes(error.code)) {
        throw error;
      }

      // Calculate backoff delay
      const delay = calculateBackoff(attempt, config);
      await sleep(delay);
    }
  }

  throw lastError;
}
```

---

## Performance Architecture

### Caching Strategy

```
┌─────────────────────────────────────────────────────────────┐
│              FRONTMATTER CACHE ARCHITECTURE                  │
└─────────────────────────────────────────────────────────────┘

In-Memory Cache (Map)
┌────────────────────────────────────────────────────┐
│ Key: agentId                                       │
│ Value: {                                           │
│   frontmatter: { metadata, workspace_files, ... }, │
│   cachedAt: timestamp,                             │
│   expiresAt: timestamp + TTL,                      │
│   size: bytes                                      │
│ }                                                  │
└────────────────────────────────────────────────────┘

Cache Lifecycle:
1. Worker starts → Cache empty
2. First readAgentFrontmatter() → Read from disk, cache result
3. Subsequent calls (within TTL) → Return cached
4. After TTL expires → Re-read from disk, refresh cache
5. Cache size limit reached → LRU eviction

Cache Configuration:
- TTL: 60 minutes (3600 seconds)
- Max entries: 100 agents
- Max size per entry: 1MB
- Eviction: LRU (Least Recently Used)
```

### Cache Implementation

```javascript
class FrontmatterCache {
  constructor(config = {}) {
    this.cache = new Map();
    this.ttl = config.ttl || 3600000;  // 60 minutes in ms
    this.maxEntries = config.maxEntries || 100;
    this.maxSize = config.maxSize || 1048576;  // 1MB per entry
  }

  get(agentId) {
    const entry = this.cache.get(agentId);

    if (!entry) return null;

    // Check expiration
    if (Date.now() > entry.expiresAt) {
      this.cache.delete(agentId);
      return null;
    }

    // Update access time for LRU
    entry.lastAccess = Date.now();

    return entry.frontmatter;
  }

  set(agentId, frontmatter) {
    // Evict if over limit
    if (this.cache.size >= this.maxEntries) {
      this.evictLRU();
    }

    const size = JSON.stringify(frontmatter).length;

    // Check size limit
    if (size > this.maxSize) {
      throw new Error(`Frontmatter too large: ${size} bytes`);
    }

    this.cache.set(agentId, {
      frontmatter,
      cachedAt: Date.now(),
      expiresAt: Date.now() + this.ttl,
      lastAccess: Date.now(),
      size
    });
  }

  evictLRU() {
    // Find least recently accessed entry
    let oldestKey = null;
    let oldestTime = Infinity;

    for (const [key, entry] of this.cache.entries()) {
      if (entry.lastAccess < oldestTime) {
        oldestTime = entry.lastAccess;
        oldestKey = key;
      }
    }

    if (oldestKey) {
      this.cache.delete(oldestKey);
    }
  }

  invalidate(agentId) {
    this.cache.delete(agentId);
  }

  clear() {
    this.cache.clear();
  }
}
```

### Performance Limits

```javascript
// Performance Configuration
const PERFORMANCE_CONFIG = {
  // File size limits
  maxFileSize: 5 * 1024 * 1024,         // 5MB per file
  maxTotalSize: 50 * 1024 * 1024,       // 50MB total per extraction

  // Time limits
  extractionTimeout: 10000,              // 10 seconds max
  fileReadTimeout: 2000,                 // 2 seconds per file

  // Concurrency limits
  maxConcurrentFiles: 10,                // Read 10 files in parallel

  // Cache limits
  frontmatterCacheTTL: 3600000,          // 60 minutes
  frontmatterCacheSize: 100,             // 100 agents max

  // Rate limits
  maxExtractionRate: 100,                // 100 extractions per minute
};
```

### Timeout Handling

```javascript
// Timeout Wrapper
async function withTimeout(promise, timeoutMs, operationName) {
  return Promise.race([
    promise,
    new Promise((_, reject) =>
      setTimeout(
        () => reject(new WorkerContentError(
          'ERR-WCE-006',
          `Timeout after ${timeoutMs}ms: ${operationName}`,
          { timeout: timeoutMs, operation: operationName }
        )),
        timeoutMs
      )
    )
  ]);
}

// Usage
const frontmatter = await withTimeout(
  readAgentFrontmatter(agentId),
  PERFORMANCE_CONFIG.extractionTimeout,
  'readAgentFrontmatter'
);
```

### Parallel File Reading

```javascript
// Concurrent File Reading
async function extractFromWorkspaceFiles(agentId, patterns) {
  const resolvedPaths = await resolvePatterns(agentId, patterns);

  // Read files in parallel with concurrency limit
  const files = await pMap(
    resolvedPaths,
    async (filePath) => {
      return await withTimeout(
        readAndValidateFile(filePath),
        PERFORMANCE_CONFIG.fileReadTimeout,
        `readFile: ${filePath}`
      );
    },
    { concurrency: PERFORMANCE_CONFIG.maxConcurrentFiles }
  );

  return files.filter(f => f !== null);
}
```

### Performance Monitoring

```javascript
// Performance Metrics
class PerformanceTracker {
  constructor() {
    this.metrics = {
      extractionTime: [],
      fileReadTime: [],
      cacheHitRate: { hits: 0, misses: 0 },
      errorRate: { success: 0, failure: 0 },
    };
  }

  recordExtraction(startTime, success) {
    const duration = Date.now() - startTime;
    this.metrics.extractionTime.push(duration);

    if (success) {
      this.metrics.errorRate.success++;
    } else {
      this.metrics.errorRate.failure++;
    }
  }

  recordCacheAccess(hit) {
    if (hit) {
      this.metrics.cacheHitRate.hits++;
    } else {
      this.metrics.cacheHitRate.misses++;
    }
  }

  getStats() {
    return {
      avgExtractionTime: this.average(this.metrics.extractionTime),
      p95ExtractionTime: this.percentile(this.metrics.extractionTime, 95),
      cacheHitRate: this.calculateHitRate(),
      errorRate: this.calculateErrorRate(),
    };
  }
}
```

---

## Integration Architecture

### Integration with Existing Systems

```
┌─────────────────────────────────────────────────────────────┐
│                  SYSTEM INTEGRATION POINTS                   │
└─────────────────────────────────────────────────────────────┘

1. Work Queue System
   ├─ Input: WorkQueueRepository.getTicket(ticketId)
   ├─ Output: WorkQueueRepository.updateTicket(...)
   └─ Status: WorkQueueRepository.completeTicket(...)

2. WebSocket Service
   ├─ Status Updates: emitTicketStatusUpdate(payload)
   └─ Real-time: { ticket_id, status, post_id, timestamp }

3. Claude Code SDK Manager
   ├─ Input: Enhanced prompt with workspace context
   ├─ Execution: executeHeadlessTask(prompt)
   └─ Output: { messages, usage, result }

4. Agent Feed API
   ├─ Comment Creation: POST /api/agent-posts/{post_id}/comments
   ├─ Body: { content, author_agent, skipTicket: true }
   └─ Response: { comment_id, created_at, ... }

5. File System
   ├─ Agent Definitions: /prod/.claude/agents/{id}.md
   ├─ Workspace Files: /prod/agent_workspace/{id}/**/*
   └─ Skills: /prod/skills/{.system|shared}/**/*

6. Logging & Monitoring
   ├─ Application Logs: Winston logger
   ├─ Performance Metrics: PerformanceTracker
   └─ Error Tracking: Sentry (future)
```

### Updated processURL() Method

```javascript
/**
 * Process URL and generate intelligence summary using Claude Code SDK
 * ENHANCED: Now includes workspace context and skills
 *
 * @param {Object} ticket - Ticket object with url, agent_id, content
 * @returns {Promise<Object>} Intelligence summary with real Claude analysis
 */
async processURL(ticket) {
  const startTime = Date.now();

  try {
    // 1. Extract intelligence from all sources (NEW)
    const intelligence = await this.extractIntelligence(ticket);

    // 2. Build enhanced prompt (NEW)
    const enhancedPrompt = this.buildEnhancedPrompt(intelligence, ticket);

    // 3. Execute headless task with Claude Code SDK
    const sdkManager = getClaudeCodeSDKManager();
    const result = await sdkManager.executeHeadlessTask(enhancedPrompt);

    if (!result.success) {
      throw new Error(`Claude Code SDK execution failed: ${result.error}`);
    }

    // 4. Extract and format response
    const summary = this.extractSummaryFromMessages(result.messages);
    const tokensUsed = this.calculateTokenUsage(result.messages);

    // 5. Track performance
    this.performanceTracker.recordExtraction(startTime, true);

    return {
      title: `Intelligence: ${ticket.url}`,
      summary,
      tokensUsed,
      completedAt: Date.now(),
      sources: intelligence.sources,  // NEW: Include source metadata
    };

  } catch (error) {
    this.performanceTracker.recordExtraction(startTime, false);
    throw error;
  }
}
```

### Backward Compatibility

```javascript
/**
 * Ensures backward compatibility with existing worker behavior
 */

// If frontmatter doesn't have workspace_files
if (!frontmatter.workspace_files || frontmatter.workspace_files.length === 0) {
  // Fall back to legacy behavior: agent instructions only
  return {
    frontmatter,
    workspace: null,
    ticket
  };
}

// If workspace extraction fails
try {
  workspace = await extractFromWorkspaceFiles(...);
} catch (error) {
  logger.warn('Workspace extraction failed, using legacy mode', { error });
  workspace = null;  // Graceful degradation
}

// Prompt building handles null workspace
const prompt = buildEnhancedPrompt(intelligence, ticket);
// Automatically adapts based on available data
```

### API Contract

```typescript
// Public API for AgentWorker content extraction

interface ContentExtractionAPI {
  /**
   * Read and parse agent frontmatter from .md file
   * @param agentId - Agent identifier
   * @returns Parsed frontmatter with metadata and config
   * @throws ERR-WCE-001 if file not found
   * @throws ERR-WCE-005 if parse error
   */
  readAgentFrontmatter(agentId: string): Promise<AgentFrontmatter>;

  /**
   * Extract files from agent workspace using patterns
   * @param agentId - Agent identifier
   * @param patterns - File patterns to match
   * @returns Array of workspace files with content
   * @throws ERR-WCE-002 on file read error
   * @throws ERR-WCE-003 on invalid path
   * @throws ERR-WCE-004 on size limit exceeded
   */
  extractFromWorkspaceFiles(
    agentId: string,
    patterns: string[]
  ): Promise<WorkspaceContent>;

  /**
   * Orchestrate extraction from all sources
   * @param ticket - Work queue ticket
   * @returns Combined intelligence context
   */
  extractIntelligence(ticket: Ticket): Promise<IntelligenceContext>;

  /**
   * Build enhanced SDK prompt from intelligence
   * @param intelligence - Extracted intelligence context
   * @param ticket - Work queue ticket
   * @returns Formatted prompt string
   */
  buildEnhancedPrompt(
    intelligence: IntelligenceContext,
    ticket: Ticket
  ): string;
}
```

---

## Security Architecture

### Security Principles

1. **Path Validation**: All file paths validated before access
2. **Content Sanitization**: All extracted content sanitized for XSS
3. **Size Limits**: Enforce strict file and total size limits
4. **Timeout Protection**: Prevent infinite loops and DoS
5. **Error Disclosure**: No sensitive information in error messages

### Path Security

```javascript
class FileValidator {
  validatePath(agentId, filePath) {
    // 1. Check for absolute path
    if (path.isAbsolute(filePath)) {
      throw new WorkerContentError(
        'ERR-WCE-003',
        'Absolute paths not allowed',
        { path: filePath }
      );
    }

    // 2. Check for directory traversal
    if (filePath.includes('..')) {
      throw new WorkerContentError(
        'ERR-WCE-003',
        'Directory traversal detected',
        { path: filePath }
      );
    }

    // 3. Resolve and validate within workspace
    const workspacePath = path.join(
      '/workspaces/agent-feed/prod/agent_workspace',
      agentId
    );

    const resolvedPath = path.resolve(workspacePath, filePath);

    if (!resolvedPath.startsWith(workspacePath)) {
      throw new WorkerContentError(
        'ERR-WCE-003',
        'Path outside workspace',
        { path: resolvedPath, workspace: workspacePath }
      );
    }

    // 4. Check for symlinks
    const stats = fs.lstatSync(resolvedPath);
    if (stats.isSymbolicLink()) {
      throw new WorkerContentError(
        'ERR-WCE-003',
        'Symbolic links not allowed',
        { path: resolvedPath }
      );
    }

    return resolvedPath;
  }
}
```

### Content Sanitization

```javascript
class ContentSanitizer {
  sanitize(content, filePath) {
    // 1. Remove null bytes
    content = content.replace(/\0/g, '');

    // 2. Limit line length (prevent buffer overflow)
    const maxLineLength = 10000;
    content = content.split('\n')
      .map(line => line.slice(0, maxLineLength))
      .join('\n');

    // 3. For JSON: validate and re-stringify
    if (filePath.endsWith('.json')) {
      try {
        const parsed = JSON.parse(content);
        content = JSON.stringify(parsed, null, 2);
      } catch (error) {
        throw new WorkerContentError(
          'ERR-WCE-007',
          'Invalid JSON content',
          { path: filePath }
        );
      }
    }

    // 4. For YAML: validate
    if (filePath.endsWith('.yaml') || filePath.endsWith('.yml')) {
      try {
        yaml.load(content);
      } catch (error) {
        throw new WorkerContentError(
          'ERR-WCE-007',
          'Invalid YAML content',
          { path: filePath }
        );
      }
    }

    // 5. Remove potential script injections
    content = this.removeScriptTags(content);

    return content;
  }

  removeScriptTags(content) {
    // Basic XSS prevention
    return content
      .replace(/<script\b[^<]*(?:(?!<\/script>)<[^<]*)*<\/script>/gi, '')
      .replace(/javascript:/gi, '')
      .replace(/on\w+\s*=/gi, '');
  }
}
```

### Rate Limiting

```javascript
class RateLimiter {
  constructor(maxRate, windowMs) {
    this.maxRate = maxRate;         // Max operations per window
    this.windowMs = windowMs;       // Time window in ms
    this.operations = new Map();    // workerId -> [timestamps]
  }

  checkLimit(workerId) {
    const now = Date.now();
    const windowStart = now - this.windowMs;

    // Get operations for this worker
    let ops = this.operations.get(workerId) || [];

    // Remove operations outside window
    ops = ops.filter(timestamp => timestamp > windowStart);

    // Check limit
    if (ops.length >= this.maxRate) {
      throw new WorkerContentError(
        'ERR-WCE-006',
        'Rate limit exceeded',
        { workerId, rate: this.maxRate, window: this.windowMs }
      );
    }

    // Record operation
    ops.push(now);
    this.operations.set(workerId, ops);

    return true;
  }
}

// Usage
const rateLimiter = new RateLimiter(100, 60000);  // 100 ops per minute
rateLimiter.checkLimit(this.workerId);
```

### Audit Logging

```javascript
class AuditLogger {
  logContentExtraction(context) {
    logger.audit('CONTENT_EXTRACTION', {
      timestamp: Date.now(),
      workerId: context.workerId,
      ticketId: context.ticketId,
      agentId: context.agentId,

      // What was accessed
      filesAccessed: context.files.map(f => ({
        path: f.path,
        size: f.size,
        type: f.type
      })),

      // Performance
      duration: context.duration,
      totalSize: context.totalSize,

      // Security
      pathValidations: context.validations,
      sanitizations: context.sanitizations,

      // Result
      success: context.success,
      errors: context.errors
    });
  }
}
```

---

## Deployment Considerations

### Environment Variables

```bash
# Worker Configuration
WORKER_CONTENT_EXTRACTION_ENABLED=true
WORKER_FRONTMATTER_CACHE_TTL=3600000      # 60 minutes
WORKER_MAX_FILE_SIZE=5242880              # 5MB
WORKER_MAX_TOTAL_SIZE=52428800            # 50MB
WORKER_EXTRACTION_TIMEOUT=10000           # 10 seconds
WORKER_MAX_CONCURRENT_FILES=10

# Paths
AGENT_DEFINITIONS_PATH=/workspaces/agent-feed/prod/.claude/agents
AGENT_WORKSPACE_PATH=/workspaces/agent-feed/prod/agent_workspace
SKILLS_PATH=/workspaces/agent-feed/prod/skills
```

### Docker Volume Mounts

```yaml
# docker-compose.yml
volumes:
  - ./prod/.claude/agents:/workspaces/agent-feed/prod/.claude/agents:ro
  - ./prod/agent_workspace:/workspaces/agent-feed/prod/agent_workspace:rw
  - ./prod/skills:/workspaces/agent-feed/prod/skills:ro
```

### Migration Strategy

```
Phase 1: Feature Flag Rollout
├─ Deploy with WORKER_CONTENT_EXTRACTION_ENABLED=false
├─ Enable for 10% of workers
├─ Monitor metrics and errors
└─ Gradually increase to 100%

Phase 2: Default Behavior
├─ Make content extraction default
├─ Keep legacy mode available via flag
└─ Monitor performance impact

Phase 3: Cleanup
├─ Remove legacy code paths
├─ Optimize based on production data
└─ Document lessons learned
```

---

## Monitoring & Observability

### Key Metrics

```javascript
// Metrics to Track

1. Content Extraction Performance
   - extraction_duration_ms (avg, p50, p95, p99)
   - file_read_duration_ms (avg, p95)
   - cache_hit_rate (percentage)
   - extraction_success_rate (percentage)

2. Resource Usage
   - files_extracted_count (sum)
   - total_bytes_extracted (sum)
   - concurrent_extractions (gauge)
   - cache_size_bytes (gauge)

3. Error Rates
   - error_rate_by_code (counter per ERR-WCE-XXX)
   - timeout_rate (percentage)
   - security_violation_rate (counter)

4. Business Metrics
   - workspace_enhancement_rate (% with workspace files)
   - fallback_usage_rate (% using fallback)
   - intelligence_quality_score (user feedback)
```

### Logging Strategy

```javascript
// Structured Logging Examples

// Success
logger.info('Content extraction completed', {
  workerId: this.workerId,
  ticketId: this.ticketId,
  agentId: this.agentId,
  duration: endTime - startTime,
  filesExtracted: workspace.files.length,
  totalSize: workspace.totalSize,
  cacheHit: cachedFrontmatter !== null,
  sources: ['frontmatter', 'workspace', 'ticket']
});

// Warning
logger.warn('Workspace extraction partial failure', {
  workerId: this.workerId,
  ticketId: this.ticketId,
  agentId: this.agentId,
  filesRequested: patterns.length,
  filesExtracted: files.length,
  filesFailed: failedFiles.length,
  errors: failedFiles.map(f => f.error)
});

// Error
logger.error('Content extraction failed', {
  workerId: this.workerId,
  ticketId: this.ticketId,
  agentId: this.agentId,
  errorCode: 'ERR-WCE-001',
  errorMessage: error.message,
  stack: error.stack,
  fallbackUsed: true
});
```

---

## Conclusion

This architecture document provides a comprehensive design for enhancing the AgentWorker with intelligent content extraction capabilities. The design prioritizes:

1. **Backward Compatibility**: Existing workers continue functioning without changes
2. **Progressive Enhancement**: Graceful degradation from workspace to fallback
3. **Performance**: Caching, limits, and parallel processing
4. **Security**: Path validation, sanitization, and audit logging
5. **Observability**: Detailed metrics and structured logging

### Next Steps

1. **Review & Approval**: Stakeholder review of architecture design
2. **Specification Phase**: Detailed functional requirements
3. **Pseudocode Phase**: Algorithm design and logic flow
4. **Implementation Phase**: TDD-based development
5. **Testing Phase**: Unit, integration, and E2E tests
6. **Deployment Phase**: Feature-flagged rollout

---

**Architecture Status**: Design Complete - Ready for Implementation Phase

**Document Version**: 1.0
**Last Updated**: 2025-10-24
**Next Review**: After implementation completion
