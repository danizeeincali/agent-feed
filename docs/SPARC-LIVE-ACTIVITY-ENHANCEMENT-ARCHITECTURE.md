# SPARC Architecture: Enhanced Live Activity System

## Document Control
- **Version**: 1.0.0
- **Created**: 2025-10-25
- **Status**: Architecture Design
- **Phase**: SPARC Architecture
- **Objective**: Real-time telemetry capture, processing, and visualization of Claude Code SDK activity

---

## Table of Contents
1. [System Overview](#1-system-overview)
2. [Component Architecture](#2-component-architecture)
3. [Data Models](#3-data-models)
4. [Data Flow Architecture](#4-data-flow-architecture)
5. [Integration Points](#5-integration-points)
6. [API Design](#6-api-design)
7. [Frontend Architecture](#7-frontend-architecture)
8. [Performance Architecture](#8-performance-architecture)
9. [Security Architecture](#9-security-architecture)
10. [Deployment Architecture](#10-deployment-architecture)

---

## 1. System Overview

### 1.1 High-Level Architecture

```
┌─────────────────────────────────────────────────────────────────────────────┐
│                         ENHANCED LIVE ACTIVITY SYSTEM                        │
├─────────────────────────────────────────────────────────────────────────────┤
│                                                                              │
│  ┌──────────────────┐      ┌──────────────────┐      ┌──────────────────┐ │
│  │  Claude Code SDK │──────▶│ Event Capture    │──────▶│  Event Queue     │ │
│  │  (Tool Events)   │      │  Layer           │      │  (In-Memory)     │ │
│  └──────────────────┘      └──────────────────┘      └────────┬─────────┘ │
│                                                                 │           │
│                                                                 ▼           │
│  ┌──────────────────┐      ┌──────────────────┐      ┌──────────────────┐ │
│  │  SSE Broadcast   │◀─────│  Event Processor │◀─────│  Event Enricher  │ │
│  │  (Real-time)     │      │  (Async)         │      │  (Metadata)      │ │
│  └────────┬─────────┘      └────────┬─────────┘      └──────────────────┘ │
│           │                         │                                      │
│           │                         ▼                                      │
│           │                ┌──────────────────┐                           │
│           │                │  SQLite Database │                           │
│           │                │  (Persistence)   │                           │
│           │                └────────┬─────────┘                           │
│           │                         │                                      │
│           ▼                         ▼                                      │
│  ┌──────────────────┐      ┌──────────────────┐      ┌──────────────────┐ │
│  │  Frontend        │──────▶│  REST API        │──────▶│  Analytics       │ │
│  │  (React)         │      │  (Express)       │      │  Service         │ │
│  └──────────────────┘      └──────────────────┘      └──────────────────┘ │
│                                                                              │
└─────────────────────────────────────────────────────────────────────────────┘
```

### 1.2 System Components

| Component | Responsibility | Technology |
|-----------|---------------|------------|
| **Event Capture Layer** | Intercept SDK tool executions | EventEmitter, Hooks |
| **Event Processing Layer** | Enrich, aggregate, buffer events | Async queues, Workers |
| **Broadcasting Layer** | Real-time SSE streaming | Server-Sent Events |
| **Persistence Layer** | Database writes, indexing | SQLite, better-sqlite3 |
| **API Layer** | REST/WebSocket endpoints | Express, Socket.io |
| **Frontend Layer** | UI components, state management | React, Zustand |

### 1.3 Integration with Existing System

```
┌─────────────────────────────────────────────────────────────────────────────┐
│                          EXISTING AGENT-FEED SYSTEM                          │
├─────────────────────────────────────────────────────────────────────────────┤
│                                                                              │
│  ┌──────────────────────────────────────────────────────────────────────┐  │
│  │  api-server/server.js (Port 3001)                                    │  │
│  │  ┌────────────────┐  ┌────────────────┐  ┌────────────────────────┐ │  │
│  │  │ SSE Manager    │  │ Database Mgr   │  │ ClaudeCodeSDKManager   │ │  │
│  │  │ (broadcastSSE) │  │ (SQLite)       │  │ (Tool Execution)       │ │  │
│  │  └────────┬───────┘  └────────┬───────┘  └──────────┬─────────────┘ │  │
│  │           │                   │                      │               │  │
│  │           └───────────────────┴──────────────────────┘               │  │
│  │                               │                                      │  │
│  └───────────────────────────────┼──────────────────────────────────────┘  │
│                                  │                                         │
│  ┌───────────────────────────────┼──────────────────────────────────────┐  │
│  │  NEW: Live Activity Enhancement │                                     │  │
│  │  ┌────────────────────────────▼────────────────────────────────────┐ │  │
│  │  │ TelemetryService (new service/TelemetryService.js)              │ │  │
│  │  │  - captureToolExecution()                                        │ │  │
│  │  │  - enrichEvent()                                                 │ │  │
│  │  │  - broadcastEvent()                                              │ │  │
│  │  │  - persistEvent()                                                │ │  │
│  │  └──────────────────────────────────────────────────────────────────┘ │  │
│  │                                                                        │  │
│  │  ┌──────────────────────────────────────────────────────────────────┐ │  │
│  │  │ Database Tables (new migrations)                                 │ │  │
│  │  │  - activity_events                                               │ │  │
│  │  │  - agent_executions                                              │ │  │
│  │  │  - tool_executions                                               │ │  │
│  │  │  - session_metrics                                               │ │  │
│  │  └──────────────────────────────────────────────────────────────────┘ │  │
│  └────────────────────────────────────────────────────────────────────────┘  │
│                                                                              │
│  ┌──────────────────────────────────────────────────────────────────────┐  │
│  │  frontend/src (Port 5173)                                            │  │
│  │  ┌────────────────┐  ┌────────────────┐  ┌────────────────────────┐ │  │
│  │  │ ActivityFeed   │  │ SSE Hook       │  │ Zustand Store          │ │  │
│  │  │ Component (NEW)│  │ (useHTTPSSE)   │  │ (activityStore)        │ │  │
│  │  └────────────────┘  └────────────────┘  └────────────────────────┘ │  │
│  └──────────────────────────────────────────────────────────────────────┘  │
│                                                                              │
└─────────────────────────────────────────────────────────────────────────────┘
```

---

## 2. Component Architecture

### 2.1 Event Capture Layer

**Purpose**: Intercept and capture all Claude Code SDK tool execution events in real-time.

**Architecture**:

```
┌─────────────────────────────────────────────────────────────────────────────┐
│                           EVENT CAPTURE LAYER                                │
├─────────────────────────────────────────────────────────────────────────────┤
│                                                                              │
│  ClaudeCodeSDKManager.queryClaudeCode()                                     │
│          │                                                                   │
│          ▼                                                                   │
│  ┌──────────────────────────────────────────────────────────────────────┐  │
│  │  Event Detection (message.type === 'assistant')                       │  │
│  │                                                                        │  │
│  │  for await (const message of queryResponse) {                         │  │
│  │    if (message.type === 'assistant' && message.message?.content) {    │  │
│  │      content.forEach(block => {                                       │  │
│  │        if (block.type === 'tool_use') {                               │  │
│  │          // CAPTURE POINT                                             │  │
│  │          const event = {                                              │  │
│  │            tool: block.name,                                          │  │
│  │            action: formatToolAction(block.name, block.input),         │  │
│  │            block_id: block.id,                                        │  │
│  │            message_uuid: message.uuid,                                │  │
│  │            timestamp: Date.now()                                      │  │
│  │          };                                                            │  │
│  │          telemetryService.captureToolExecution(event);                │  │
│  │        }                                                               │  │
│  │      });                                                               │  │
│  │    }                                                                   │  │
│  │  }                                                                     │  │
│  └──────────────────────────────────────────────────────────────────────┘  │
│          │                                                                   │
│          ▼                                                                   │
│  ┌──────────────────────────────────────────────────────────────────────┐  │
│  │  Event Validation & Sanitization                                      │  │
│  │  - Validate event schema                                              │  │
│  │  - Truncate prompts (200 chars max)                                   │  │
│  │  - Redact API keys/tokens                                             │  │
│  │  - Sanitize file paths (remove user dirs)                             │  │
│  └──────────────────────────────────────────────────────────────────────┘  │
│          │                                                                   │
│          ▼                                                                   │
│  ┌──────────────────────────────────────────────────────────────────────┐  │
│  │  Event Buffering (In-Memory Queue)                                    │  │
│  │  - Rate limiting: 100 events/sec max                                  │  │
│  │  - Throttling: Debounce rapid events (50ms)                           │  │
│  │  - Priority queue: high/medium/low                                    │  │
│  └──────────────────────────────────────────────────────────────────────┘  │
│          │                                                                   │
│          ▼                                                                   │
│       To Event Processing Layer                                             │
│                                                                              │
└─────────────────────────────────────────────────────────────────────────────┘
```

**Key Files**:
- `/workspaces/agent-feed/src/services/ClaudeCodeSDKManager.js` (existing - modify)
- `/workspaces/agent-feed/src/services/TelemetryService.js` (new)

**Event Schema Validation**:

```javascript
const EVENT_SCHEMA = {
  tool: 'string', // Required
  action: 'string', // Required
  block_id: 'string', // Optional
  message_uuid: 'string', // Optional
  timestamp: 'number', // Required
  session_id: 'string', // Required
  agent_id: 'string', // Optional
  duration: 'number', // Optional (for completed events)
  status: 'string', // 'started' | 'success' | 'failed'
  error: 'string', // Optional (for failed events)
  metadata: 'object' // Optional
};
```

### 2.2 Event Processing Layer

**Purpose**: Enrich events with context, aggregate metrics, and prepare for persistence.

**Architecture**:

```
┌─────────────────────────────────────────────────────────────────────────────┐
│                         EVENT PROCESSING LAYER                               │
├─────────────────────────────────────────────────────────────────────────────┤
│                                                                              │
│  ┌──────────────────────────────────────────────────────────────────────┐  │
│  │  Event Enrichment Service                                             │  │
│  │                                                                        │  │
│  │  enrichEvent(event) {                                                 │  │
│  │    // Add session context                                             │  │
│  │    event.session_id = getCurrentSessionId();                          │  │
│  │    event.agent_id = getCurrentAgentId();                              │  │
│  │                                                                        │  │
│  │    // Calculate derived fields                                        │  │
│  │    if (event.tool === 'Read' || event.tool === 'Write') {            │  │
│  │      event.file_extension = extractExtension(event.action);           │  │
│  │      event.file_size = estimateFileSize(event);                       │  │
│  │    }                                                                   │  │
│  │                                                                        │  │
│  │    // Add priority based on tool type                                 │  │
│  │    event.priority = getToolPriority(event.tool);                      │  │
│  │                                                                        │  │
│  │    // Add execution context                                           │  │
│  │    event.context = {                                                  │  │
│  │      cwd: process.cwd(),                                              │  │
│  │      model: getCurrentModel(),                                        │  │
│  │      turn_count: getCurrentTurnCount()                                │  │
│  │    };                                                                  │  │
│  │                                                                        │  │
│  │    return event;                                                       │  │
│  │  }                                                                     │  │
│  └──────────────────────────────────────────────────────────────────────┘  │
│          │                                                                   │
│          ▼                                                                   │
│  ┌──────────────────────────────────────────────────────────────────────┐  │
│  │  Event Aggregation Service                                            │  │
│  │                                                                        │  │
│  │  aggregateMetrics(event) {                                            │  │
│  │    // Update session metrics                                          │  │
│  │    sessionMetrics[event.session_id].tool_count++;                     │  │
│  │    sessionMetrics[event.session_id].last_activity = Date.now();       │  │
│  │                                                                        │  │
│  │    // Update tool counters                                            │  │
│  │    toolCounters[event.tool] = (toolCounters[event.tool] || 0) + 1;   │  │
│  │                                                                        │  │
│  │    // Calculate running averages                                      │  │
│  │    if (event.duration) {                                              │  │
│  │      updateRunningAverage(event.tool, event.duration);                │  │
│  │    }                                                                   │  │
│  │  }                                                                     │  │
│  └──────────────────────────────────────────────────────────────────────┘  │
│          │                                                                   │
│          ▼                                                                   │
│  ┌──────────────────────────────────────────────────────────────────────┐  │
│  │  Event Batching & Queue Management                                    │  │
│  │                                                                        │  │
│  │  - Batch events for database writes (50 events or 500ms interval)    │  │
│  │  - Separate high/medium/low priority queues                           │  │
│  │  - Back-pressure handling (drop low priority if queue > 1000)        │  │
│  │  - Circuit breaker for database failures                              │  │
│  └──────────────────────────────────────────────────────────────────────┘  │
│          │                                                                   │
│          ├───────────────────────────────────────┬─────────────────────────┤
│          ▼                                       ▼                         │
│  To Broadcasting Layer                   To Persistence Layer              │
│                                                                              │
└─────────────────────────────────────────────────────────────────────────────┘
```

**Key Files**:
- `/workspaces/agent-feed/src/services/TelemetryService.js` (new)
- `/workspaces/agent-feed/src/services/EventEnricher.js` (new)
- `/workspaces/agent-feed/src/services/MetricsAggregator.js` (new)

### 2.3 Broadcasting Layer

**Purpose**: Stream events to connected clients via Server-Sent Events (SSE).

**Architecture**:

```
┌─────────────────────────────────────────────────────────────────────────────┐
│                          BROADCASTING LAYER (SSE)                            │
├─────────────────────────────────────────────────────────────────────────────┤
│                                                                              │
│  ┌──────────────────────────────────────────────────────────────────────┐  │
│  │  SSE Connection Manager (existing: api-server/server.js)              │  │
│  │                                                                        │  │
│  │  const sseClients = new Map(); // clientId -> response object        │  │
│  │  const clientFilters = new Map(); // clientId -> filter config        │  │
│  │                                                                        │  │
│  │  // Connection endpoint                                               │  │
│  │  app.get('/api/activity/stream', (req, res) => {                     │  │
│  │    const clientId = crypto.randomUUID();                              │  │
│  │    const filter = parseFilterFromQuery(req.query);                    │  │
│  │                                                                        │  │
│  │    // SSE headers                                                     │  │
│  │    res.writeHead(200, {                                               │  │
│  │      'Content-Type': 'text/event-stream',                             │  │
│  │      'Cache-Control': 'no-cache',                                     │  │
│  │      'Connection': 'keep-alive'                                       │  │
│  │    });                                                                 │  │
│  │                                                                        │  │
│  │    sseClients.set(clientId, res);                                     │  │
│  │    clientFilters.set(clientId, filter);                               │  │
│  │                                                                        │  │
│  │    // Heartbeat                                                       │  │
│  │    const heartbeat = setInterval(() => {                              │  │
│  │      res.write(': heartbeat\n\n');                                    │  │
│  │    }, 30000);                                                          │  │
│  │                                                                        │  │
│  │    req.on('close', () => {                                            │  │
│  │      clearInterval(heartbeat);                                        │  │
│  │      sseClients.delete(clientId);                                     │  │
│  │      clientFilters.delete(clientId);                                  │  │
│  │    });                                                                 │  │
│  │  });                                                                   │  │
│  └──────────────────────────────────────────────────────────────────────┘  │
│          │                                                                   │
│          ▼                                                                   │
│  ┌──────────────────────────────────────────────────────────────────────┐  │
│  │  Event Broadcasting (enhanced broadcastToSSE)                         │  │
│  │                                                                        │  │
│  │  function broadcastActivityEvent(event) {                             │  │
│  │    for (const [clientId, res] of sseClients) {                        │  │
│  │      const filter = clientFilters.get(clientId);                      │  │
│  │                                                                        │  │
│  │      // Apply client-specific filters                                 │  │
│  │      if (!matchesFilter(event, filter)) continue;                     │  │
│  │                                                                        │  │
│  │      // Format SSE message                                            │  │
│  │      const sseMessage = `data: ${JSON.stringify({                     │  │
│  │        type: 'tool_activity',                                         │  │
│  │        event: event,                                                  │  │
│  │        timestamp: Date.now()                                          │  │
│  │      })}\n\n`;                                                         │  │
│  │                                                                        │  │
│  │      // Write to client                                               │  │
│  │      try {                                                             │  │
│  │        res.write(sseMessage);                                         │  │
│  │      } catch (error) {                                                │  │
│  │        // Client disconnected                                         │  │
│  │        sseClients.delete(clientId);                                   │  │
│  │        clientFilters.delete(clientId);                                │  │
│  │      }                                                                 │  │
│  │    }                                                                   │  │
│  │  }                                                                     │  │
│  └──────────────────────────────────────────────────────────────────────┘  │
│          │                                                                   │
│          ▼                                                                   │
│  ┌──────────────────────────────────────────────────────────────────────┐  │
│  │  Event Filtering by Priority                                          │  │
│  │                                                                        │  │
│  │  Filter Config: {                                                     │  │
│  │    priority: 'high' | 'medium' | 'low' | 'all',                      │  │
│  │    tools: ['Bash', 'Read', 'Write'] or null (all),                   │  │
│  │    session_id: 'specific-session' or null (all)                       │  │
│  │  }                                                                     │  │
│  │                                                                        │  │
│  │  function matchesFilter(event, filter) {                              │  │
│  │    if (filter.priority && event.priority !== filter.priority) {      │  │
│  │      return false;                                                    │  │
│  │    }                                                                   │  │
│  │    if (filter.tools && !filter.tools.includes(event.tool)) {         │  │
│  │      return false;                                                    │  │
│  │    }                                                                   │  │
│  │    if (filter.session_id && event.session_id !== filter.session_id) {│  │
│  │      return false;                                                    │  │
│  │    }                                                                   │  │
│  │    return true;                                                       │  │
│  │  }                                                                     │  │
│  └──────────────────────────────────────────────────────────────────────┘  │
│                                                                              │
└─────────────────────────────────────────────────────────────────────────────┘
```

**Key Files**:
- `/workspaces/agent-feed/api-server/server.js` (existing - enhance)
- `/workspaces/agent-feed/src/api/routes/claude-code-sdk.js` (existing - modify broadcastToolActivity)

### 2.4 Persistence Layer

**Purpose**: Store events in SQLite database with optimized write performance.

**Architecture**:

```
┌─────────────────────────────────────────────────────────────────────────────┐
│                          PERSISTENCE LAYER                                   │
├─────────────────────────────────────────────────────────────────────────────┤
│                                                                              │
│  ┌──────────────────────────────────────────────────────────────────────┐  │
│  │  Database Write Service (TelemetryWriter)                             │  │
│  │                                                                        │  │
│  │  class TelemetryWriter {                                              │  │
│  │    constructor(db) {                                                  │  │
│  │      this.db = db;                                                    │  │
│  │      this.writeQueue = [];                                            │  │
│  │      this.batchSize = 50;                                             │  │
│  │      this.flushInterval = 500; // ms                                  │  │
│  │                                                                        │  │
│  │      // Start batch processor                                         │  │
│  │      this.startBatchProcessor();                                      │  │
│  │    }                                                                   │  │
│  │                                                                        │  │
│  │    async queueEvent(event) {                                          │  │
│  │      this.writeQueue.push(event);                                     │  │
│  │                                                                        │  │
│  │      // Flush if batch size reached                                   │  │
│  │      if (this.writeQueue.length >= this.batchSize) {                  │  │
│  │        await this.flush();                                            │  │
│  │      }                                                                 │  │
│  │    }                                                                   │  │
│  │                                                                        │  │
│  │    async flush() {                                                    │  │
│  │      if (this.writeQueue.length === 0) return;                        │  │
│  │                                                                        │  │
│  │      const batch = this.writeQueue.splice(0, this.batchSize);         │  │
│  │                                                                        │  │
│  │      // Use transaction for batch insert                              │  │
│  │      const insertMany = this.db.transaction((events) => {             │  │
│  │        for (const event of events) {                                  │  │
│  │          this.insertEvent(event);                                     │  │
│  │        }                                                               │  │
│  │      });                                                               │  │
│  │                                                                        │  │
│  │      try {                                                             │  │
│  │        insertMany(batch);                                             │  │
│  │      } catch (error) {                                                │  │
│  │        console.error('Batch insert failed:', error);                  │  │
│  │        // Re-queue on failure                                         │  │
│  │        this.writeQueue.unshift(...batch);                             │  │
│  │      }                                                                 │  │
│  │    }                                                                   │  │
│  │                                                                        │  │
│  │    startBatchProcessor() {                                            │  │
│  │      setInterval(() => this.flush(), this.flushInterval);             │  │
│  │    }                                                                   │  │
│  │  }                                                                     │  │
│  └──────────────────────────────────────────────────────────────────────┘  │
│          │                                                                   │
│          ▼                                                                   │
│  ┌──────────────────────────────────────────────────────────────────────┐  │
│  │  Database Schema (SQLite with WAL mode)                               │  │
│  │                                                                        │  │
│  │  PRAGMA journal_mode = WAL;                                           │  │
│  │  PRAGMA synchronous = NORMAL;                                         │  │
│  │  PRAGMA cache_size = -64000; // 64MB cache                            │  │
│  │  PRAGMA temp_store = MEMORY;                                          │  │
│  │                                                                        │  │
│  │  Tables:                                                               │  │
│  │    - activity_events (general event log)                              │  │
│  │    - agent_executions (agent-level tracking)                          │  │
│  │    - tool_executions (tool-level tracking)                            │  │
│  │    - session_metrics (session aggregates)                             │  │
│  └──────────────────────────────────────────────────────────────────────┘  │
│          │                                                                   │
│          ▼                                                                   │
│  ┌──────────────────────────────────────────────────────────────────────┐  │
│  │  Indexing Strategy (for fast queries)                                 │  │
│  │                                                                        │  │
│  │  CREATE INDEX idx_events_session_time                                 │  │
│  │    ON activity_events(session_id, timestamp DESC);                    │  │
│  │                                                                        │  │
│  │  CREATE INDEX idx_events_type_time                                    │  │
│  │    ON activity_events(event_type, timestamp DESC);                    │  │
│  │                                                                        │  │
│  │  CREATE INDEX idx_tools_session_tool                                  │  │
│  │    ON tool_executions(session_id, tool_name, timestamp DESC);         │  │
│  │                                                                        │  │
│  │  CREATE INDEX idx_agents_session_status                               │  │
│  │    ON agent_executions(session_id, status, start_time DESC);          │  │
│  └──────────────────────────────────────────────────────────────────────┘  │
│                                                                              │
└─────────────────────────────────────────────────────────────────────────────┘
```

**Key Files**:
- `/workspaces/agent-feed/src/services/TelemetryWriter.js` (new)
- `/workspaces/agent-feed/api-server/db/migrations/009-telemetry-tables.sql` (new)

---

## 3. Data Models

### 3.1 Database Schema

#### 3.1.1 activity_events Table

```sql
-- General event log for all SDK activity
CREATE TABLE IF NOT EXISTS activity_events (
  -- Primary Key
  id TEXT PRIMARY KEY DEFAULT (lower(hex(randomblob(16)))),

  -- Event Classification
  event_type TEXT NOT NULL,  -- 'tool_execution', 'agent_started', 'progress_update'
  session_id TEXT NOT NULL,
  agent_id TEXT,

  -- Tool Information
  tool_name TEXT,
  action TEXT,               -- Sanitized action description (max 200 chars)
  status TEXT NOT NULL,      -- 'started', 'success', 'failed'

  -- Performance Metrics
  duration INTEGER,          -- Milliseconds
  timestamp DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,

  -- Additional Context (JSON)
  metadata JSON,             -- { block_id, message_uuid, file_path, output_size, etc. }

  -- Constraints
  CHECK (event_type IN ('tool_execution', 'agent_started', 'agent_completed', 'progress_update')),
  CHECK (status IN ('started', 'success', 'failed'))
);

-- Indexes for performance
CREATE INDEX idx_events_session_time ON activity_events(session_id, timestamp DESC);
CREATE INDEX idx_events_type_time ON activity_events(event_type, timestamp DESC);
CREATE INDEX idx_events_tool_time ON activity_events(tool_name, timestamp DESC) WHERE tool_name IS NOT NULL;
CREATE INDEX idx_events_status ON activity_events(status, timestamp DESC);
```

#### 3.1.2 agent_executions Table

```sql
-- Agent-level execution tracking
CREATE TABLE IF NOT EXISTS agent_executions (
  -- Primary Key
  id TEXT PRIMARY KEY DEFAULT (lower(hex(randomblob(16)))),

  -- Session & Agent Info
  session_id TEXT NOT NULL,
  agent_type TEXT NOT NULL,   -- 'coder', 'researcher', 'tester', etc.
  status TEXT NOT NULL,        -- 'running', 'completed', 'failed'

  -- Execution Details
  prompt TEXT,                 -- Truncated to 200 chars
  model TEXT NOT NULL,         -- 'claude-sonnet-4-20250514'

  -- Timing
  start_time DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  end_time DATETIME,
  duration INTEGER,            -- Milliseconds (calculated on completion)

  -- Token & Cost Tracking
  tokens_used INTEGER,
  cost REAL,                   -- USD

  -- Error Handling
  error TEXT,                  -- Error message if failed

  -- Constraints
  CHECK (status IN ('running', 'completed', 'failed')),
  CHECK (duration IS NULL OR duration >= 0),
  CHECK (tokens_used IS NULL OR tokens_used >= 0),
  CHECK (cost IS NULL OR cost >= 0)
);

-- Indexes
CREATE INDEX idx_agents_session ON agent_executions(session_id, start_time DESC);
CREATE INDEX idx_agents_status ON agent_executions(status, start_time DESC);
CREATE INDEX idx_agents_type ON agent_executions(agent_type, start_time DESC);
```

#### 3.1.3 tool_executions Table

```sql
-- Tool-level execution tracking
CREATE TABLE IF NOT EXISTS tool_executions (
  -- Primary Key
  id TEXT PRIMARY KEY DEFAULT (lower(hex(randomblob(16)))),

  -- Session & Agent Context
  session_id TEXT NOT NULL,
  agent_id TEXT,               -- Reference to agent_executions.id

  -- Tool Information
  tool_name TEXT NOT NULL,     -- 'Bash', 'Read', 'Write', etc.
  action TEXT,                 -- Truncated action description
  status TEXT NOT NULL,        -- 'success', 'failed'

  -- Performance Metrics
  duration INTEGER NOT NULL,   -- Milliseconds
  output_size INTEGER,         -- Bytes (for Read/Write operations)

  -- File Operations
  file_path TEXT,              -- Sanitized file path (for file operations)

  -- Error Handling
  error TEXT,                  -- Error message if failed

  -- Timing
  timestamp DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,

  -- Constraints
  CHECK (status IN ('success', 'failed')),
  CHECK (duration >= 0),
  CHECK (output_size IS NULL OR output_size >= 0),

  -- Foreign Key
  FOREIGN KEY (agent_id) REFERENCES agent_executions(id) ON DELETE CASCADE
);

-- Indexes
CREATE INDEX idx_tools_session ON tool_executions(session_id, timestamp DESC);
CREATE INDEX idx_tools_agent ON tool_executions(agent_id, timestamp DESC) WHERE agent_id IS NOT NULL;
CREATE INDEX idx_tools_name_time ON tool_executions(tool_name, timestamp DESC);
CREATE INDEX idx_tools_status ON tool_executions(status, timestamp DESC);
```

#### 3.1.4 session_metrics Table

```sql
-- Aggregated session-level metrics
CREATE TABLE IF NOT EXISTS session_metrics (
  -- Primary Key
  session_id TEXT PRIMARY KEY,

  -- Timing
  start_time DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  end_time DATETIME,
  duration INTEGER,            -- Milliseconds

  -- Activity Counts
  request_count INTEGER DEFAULT 0 NOT NULL,
  total_tokens INTEGER DEFAULT 0 NOT NULL,
  total_cost REAL DEFAULT 0.0 NOT NULL,
  agent_count INTEGER DEFAULT 0 NOT NULL,
  tool_count INTEGER DEFAULT 0 NOT NULL,
  error_count INTEGER DEFAULT 0 NOT NULL,

  -- Status
  status TEXT,                 -- 'active', 'completed', 'failed'

  -- Constraints
  CHECK (request_count >= 0),
  CHECK (total_tokens >= 0),
  CHECK (total_cost >= 0),
  CHECK (agent_count >= 0),
  CHECK (tool_count >= 0),
  CHECK (error_count >= 0),
  CHECK (status IN ('active', 'completed', 'failed'))
);

-- Indexes
CREATE INDEX idx_session_start_time ON session_metrics(start_time DESC);
CREATE INDEX idx_session_status ON session_metrics(status, start_time DESC);
```

### 3.2 Event Schemas (TypeScript)

```typescript
// Base event interface
interface BaseEvent {
  id?: string;
  session_id: string;
  timestamp: number;
  metadata?: Record<string, any>;
}

// Tool execution event
interface ToolExecutionEvent extends BaseEvent {
  type: 'tool_execution';
  data: {
    tool: string;           // 'Bash', 'Read', 'Write', etc.
    action: string;         // Sanitized action description
    duration?: number;      // Milliseconds (on completion)
    status: 'started' | 'success' | 'failed';
    output_size?: number;   // Bytes
    error?: string;
    file_path?: string;     // Sanitized path
    agent_id?: string;
  };
}

// Agent started event
interface AgentStartedEvent extends BaseEvent {
  type: 'agent_started';
  data: {
    agent_id: string;
    agent_type: string;     // 'coder', 'researcher', etc.
    prompt: string;         // Truncated to 200 chars
    model: string;          // 'claude-sonnet-4-20250514'
  };
}

// Agent completed event
interface AgentCompletedEvent extends BaseEvent {
  type: 'agent_completed';
  data: {
    agent_id: string;
    agent_type: string;
    status: 'completed' | 'failed';
    duration: number;       // Milliseconds
    tokens_used?: number;
    cost?: number;          // USD
    error?: string;
  };
}

// Progress update event
interface ProgressUpdateEvent extends BaseEvent {
  type: 'progress_update';
  data: {
    current_step: number;
    total_steps: number;
    percentage: number;
    eta_seconds: number;
    step_description: string;
  };
}

// Union type for all events
type TelemetryEvent =
  | ToolExecutionEvent
  | AgentStartedEvent
  | AgentCompletedEvent
  | ProgressUpdateEvent;
```

### 3.3 API Response Schemas

```typescript
// GET /api/activity/events
interface ActivityEventsResponse {
  success: true;
  events: Array<{
    id: string;
    event_type: string;
    session_id: string;
    tool_name?: string;
    action?: string;
    status: string;
    duration?: number;
    timestamp: string;
    metadata?: Record<string, any>;
  }>;
  pagination: {
    page: number;
    limit: number;
    total: number;
    has_more: boolean;
  };
}

// GET /api/activity/sessions/:sessionId
interface SessionDetailsResponse {
  success: true;
  session: {
    session_id: string;
    start_time: string;
    end_time?: string;
    duration?: number;
    request_count: number;
    total_tokens: number;
    total_cost: number;
    agent_count: number;
    tool_count: number;
    error_count: number;
    status: string;
  };
  agents: Array<{
    id: string;
    agent_type: string;
    status: string;
    start_time: string;
    end_time?: string;
    duration?: number;
    tokens_used?: number;
    cost?: number;
  }>;
  tools: Array<{
    id: string;
    tool_name: string;
    action: string;
    status: string;
    duration: number;
    timestamp: string;
  }>;
}

// GET /api/activity/metrics
interface MetricsResponse {
  success: true;
  metrics: {
    total_sessions: number;
    active_sessions: number;
    total_events: number;
    total_agents: number;
    total_tools: number;
    total_errors: number;
    average_session_duration: number;
    average_tool_duration: number;
    tool_usage: Record<string, number>;
    agent_usage: Record<string, number>;
    error_rate: number;
  };
  time_range: {
    start: string;
    end: string;
  };
}
```

---

## 4. Data Flow Architecture

### 4.1 Event Capture to Persistence Flow

```
┌─────────────────────────────────────────────────────────────────────────────┐
│                    EVENT CAPTURE → PERSISTENCE FLOW                          │
├─────────────────────────────────────────────────────────────────────────────┤
│                                                                              │
│  1. SDK Tool Execution                                                       │
│     │                                                                         │
│     ▼                                                                         │
│  ┌──────────────────────────────────────────────────────────────────────┐  │
│  │ ClaudeCodeSDKManager.queryClaudeCode()                                │  │
│  │   - User sends message: "Create a React component"                    │  │
│  │   - SDK processes with tools: Read, Write, Bash                       │  │
│  └────────────────────────┬─────────────────────────────────────────────┘  │
│                            │                                                 │
│  2. Event Detection (in message loop)                                       │
│     │                                                                         │
│     ▼                                                                         │
│  ┌──────────────────────────────────────────────────────────────────────┐  │
│  │ for await (const message of queryResponse) {                          │  │
│  │   if (message.type === 'assistant' && block.type === 'tool_use') {   │  │
│  │     const event = {                                                   │  │
│  │       tool: block.name,                                               │  │
│  │       action: formatToolAction(block.name, block.input),              │  │
│  │       timestamp: Date.now()                                           │  │
│  │     };                                                                 │  │
│  │     telemetryService.captureToolExecution(event);                     │  │
│  │   }                                                                    │  │
│  │ }                                                                      │  │
│  └────────────────────────┬─────────────────────────────────────────────┘  │
│                            │                                                 │
│  3. Event Validation & Sanitization                                         │
│     │                                                                         │
│     ▼                                                                         │
│  ┌──────────────────────────────────────────────────────────────────────┐  │
│  │ TelemetryService.captureToolExecution(event)                          │  │
│  │   - Validate schema                                                   │  │
│  │   - Truncate prompts (200 chars)                                      │  │
│  │   - Redact API keys/tokens                                            │  │
│  │   - Sanitize file paths                                               │  │
│  │   - Add session_id                                                    │  │
│  └────────────────────────┬─────────────────────────────────────────────┘  │
│                            │                                                 │
│  4. Event Enrichment                                                        │
│     │                                                                         │
│     ▼                                                                         │
│  ┌──────────────────────────────────────────────────────────────────────┐  │
│  │ EventEnricher.enrichEvent(event)                                      │  │
│  │   - Add agent_id (if in agent context)                                │  │
│  │   - Calculate priority (high/medium/low)                              │  │
│  │   - Add execution context (cwd, model, turn_count)                    │  │
│  │   - Estimate file size (for file operations)                          │  │
│  └────────────────────────┬─────────────────────────────────────────────┘  │
│                            │                                                 │
│  5. Parallel Processing                                                     │
│     │                                                                         │
│     ├────────────────────────────────┬─────────────────────────────────────┤
│     ▼                                ▼                                       │
│  ┌──────────────────────┐  ┌──────────────────────────────────────────┐   │
│  │ Broadcasting         │  │ Persistence Queue                         │   │
│  │                      │  │                                           │   │
│  │ broadcastToSSE()     │  │ TelemetryWriter.queueEvent(event)         │   │
│  │   - Send to all SSE  │  │   - Add to write queue                    │   │
│  │     clients          │  │   - Batch if queue >= 50 events           │   │
│  │   - Apply filters    │  │   - Auto-flush every 500ms                │   │
│  │   - <50ms latency    │  │                                           │   │
│  └──────────────────────┘  └────────────────┬──────────────────────────┘   │
│                                             │                                │
│  6. Database Write (batched)                                                │
│     │                                                                         │
│     ▼                                                                         │
│  ┌──────────────────────────────────────────────────────────────────────┐  │
│  │ TelemetryWriter.flush()                                               │  │
│  │   - Transaction batch insert (50 events)                              │  │
│  │   - Write to activity_events table                                    │  │
│  │   - Write to tool_executions table                                    │  │
│  │   - Update session_metrics (aggregates)                               │  │
│  │   - <10ms write latency                                               │  │
│  └────────────────────────┬─────────────────────────────────────────────┘  │
│                            │                                                 │
│  7. Metrics Aggregation                                                     │
│     │                                                                         │
│     ▼                                                                         │
│  ┌──────────────────────────────────────────────────────────────────────┐  │
│  │ MetricsAggregator.updateMetrics(event)                                │  │
│  │   - Increment session.tool_count                                      │  │
│  │   - Update session.last_activity                                      │  │
│  │   - Calculate running averages                                        │  │
│  │   - Update tool usage counters                                        │  │
│  └──────────────────────────────────────────────────────────────────────┘  │
│                                                                              │
└─────────────────────────────────────────────────────────────────────────────┘
```

### 4.2 SSE Stream to Frontend Flow

```
┌─────────────────────────────────────────────────────────────────────────────┐
│                      SSE STREAM → FRONTEND FLOW                              │
├─────────────────────────────────────────────────────────────────────────────┤
│                                                                              │
│  1. Client Connection                                                        │
│     │                                                                         │
│     ▼                                                                         │
│  ┌──────────────────────────────────────────────────────────────────────┐  │
│  │ Frontend: useHTTPSSE('/api/activity/stream')                          │  │
│  │   - Establish SSE connection                                          │  │
│  │   - Pass filter params: ?priority=high&session_id=xyz                 │  │
│  │   - Handle reconnection (exponential backoff)                         │  │
│  └────────────────────────┬─────────────────────────────────────────────┘  │
│                            │                                                 │
│  2. Server SSE Connection                                                   │
│     │                                                                         │
│     ▼                                                                         │
│  ┌──────────────────────────────────────────────────────────────────────┐  │
│  │ Server: GET /api/activity/stream                                      │  │
│  │   - Generate clientId (UUID)                                          │  │
│  │   - Parse filter from query params                                    │  │
│  │   - Set SSE headers                                                   │  │
│  │   - Add client to sseClients map                                      │  │
│  │   - Start heartbeat (30s interval)                                    │  │
│  └────────────────────────┬─────────────────────────────────────────────┘  │
│                            │                                                 │
│  3. Event Broadcasting (when event occurs)                                  │
│     │                                                                         │
│     ▼                                                                         │
│  ┌──────────────────────────────────────────────────────────────────────┐  │
│  │ Server: broadcastActivityEvent(event)                                 │  │
│  │   for (const [clientId, res] of sseClients) {                         │  │
│  │     if (matchesFilter(event, clientFilters.get(clientId))) {          │  │
│  │       res.write(`data: ${JSON.stringify(event)}\n\n`);                │  │
│  │     }                                                                  │  │
│  │   }                                                                    │  │
│  └────────────────────────┬─────────────────────────────────────────────┘  │
│                            │                                                 │
│  4. Client Event Reception                                                  │
│     │                                                                         │
│     ▼                                                                         │
│  ┌──────────────────────────────────────────────────────────────────────┐  │
│  │ Frontend: useHTTPSSE event handler                                    │  │
│  │   eventSource.onmessage = (e) => {                                    │  │
│  │     const event = JSON.parse(e.data);                                 │  │
│  │     activityStore.addEvent(event);                                    │  │
│  │   };                                                                   │  │
│  └────────────────────────┬─────────────────────────────────────────────┘  │
│                            │                                                 │
│  5. State Management Update                                                 │
│     │                                                                         │
│     ▼                                                                         │
│  ┌──────────────────────────────────────────────────────────────────────┐  │
│  │ Zustand Store: activityStore.addEvent(event)                          │  │
│  │   - Add to events array (max 100 recent)                              │  │
│  │   - Update metrics (total_events, tool_counts)                        │  │
│  │   - Trigger React re-render                                           │  │
│  └────────────────────────┬─────────────────────────────────────────────┘  │
│                            │                                                 │
│  6. UI Component Render                                                     │
│     │                                                                         │
│     ▼                                                                         │
│  ┌──────────────────────────────────────────────────────────────────────┐  │
│  │ React: <ActivityFeed />                                               │  │
│  │   - Display event in activity feed                                    │  │
│  │   - Animate entry (fade in)                                           │  │
│  │   - Virtual scrolling (if >100 events)                                │  │
│  │   - Update tool usage chart                                           │  │
│  │   - Update session metrics display                                    │  │
│  └──────────────────────────────────────────────────────────────────────┘  │
│                                                                              │
└─────────────────────────────────────────────────────────────────────────────┘
```

### 4.3 Historical Data Query Flow

```
┌─────────────────────────────────────────────────────────────────────────────┐
│                       HISTORICAL DATA QUERY FLOW                             │
├─────────────────────────────────────────────────────────────────────────────┤
│                                                                              │
│  1. User Request                                                             │
│     │                                                                         │
│     ▼                                                                         │
│  ┌──────────────────────────────────────────────────────────────────────┐  │
│  │ Frontend: Load session history                                        │  │
│  │   GET /api/activity/sessions/:sessionId                               │  │
│  │   Query params: { include_tools: true, include_agents: true }         │  │
│  └────────────────────────┬─────────────────────────────────────────────┘  │
│                            │                                                 │
│  2. API Endpoint Processing                                                 │
│     │                                                                         │
│     ▼                                                                         │
│  ┌──────────────────────────────────────────────────────────────────────┐  │
│  │ Server: GET /api/activity/sessions/:sessionId                         │  │
│  │   - Validate sessionId                                                │  │
│  │   - Parse query params                                                │  │
│  │   - Query database (optimized with indexes)                           │  │
│  └────────────────────────┬─────────────────────────────────────────────┘  │
│                            │                                                 │
│  3. Database Queries (parallel)                                             │
│     │                                                                         │
│     ├────────────────┬──────────────────┬──────────────────────────────────┤
│     ▼                ▼                  ▼                                    │
│  ┌─────────────┐  ┌─────────────┐  ┌──────────────────────────────────┐   │
│  │ Session     │  │ Agents      │  │ Tools                            │   │
│  │             │  │             │  │                                  │   │
│  │ SELECT *    │  │ SELECT *    │  │ SELECT *                         │   │
│  │ FROM        │  │ FROM        │  │ FROM tool_executions             │   │
│  │ session_    │  │ agent_      │  │ WHERE session_id = ?             │   │
│  │ metrics     │  │ executions  │  │ ORDER BY timestamp DESC          │   │
│  │ WHERE       │  │ WHERE       │  │ LIMIT 100                        │   │
│  │ session_id  │  │ session_id  │  │                                  │   │
│  │ = ?         │  │ = ?         │  │ (uses idx_tools_session)         │   │
│  └─────────────┘  └─────────────┘  └──────────────────────────────────┘   │
│     │                │                  │                                    │
│     └────────────────┴──────────────────┘                                    │
│                      │                                                       │
│  4. Data Assembly                                                            │
│     │                                                                         │
│     ▼                                                                         │
│  ┌──────────────────────────────────────────────────────────────────────┐  │
│  │ Server: Assemble response                                             │  │
│  │   {                                                                   │  │
│  │     session: { ...session_metrics },                                  │  │
│  │     agents: [ ...agent_executions ],                                  │  │
│  │     tools: [ ...tool_executions ]                                     │  │
│  │   }                                                                    │  │
│  └────────────────────────┬─────────────────────────────────────────────┘  │
│                            │                                                 │
│  5. Response Compression & Caching                                          │
│     │                                                                         │
│     ▼                                                                         │
│  ┌──────────────────────────────────────────────────────────────────────┐  │
│  │ Server: Apply compression                                             │  │
│  │   - gzip compression (if client supports)                             │  │
│  │   - Cache-Control: max-age=60 (for completed sessions)                │  │
│  │   - ETag generation (for conditional requests)                        │  │
│  └────────────────────────┬─────────────────────────────────────────────┘  │
│                            │                                                 │
│  6. Frontend Processing                                                     │
│     │                                                                         │
│     ▼                                                                         │
│  ┌──────────────────────────────────────────────────────────────────────┐  │
│  │ Frontend: Process response                                            │  │
│  │   - Update sessionStore with data                                     │  │
│  │   - Render SessionDetailView component                                │  │
│  │   - Display charts (tool usage, timeline)                             │  │
│  │   - Enable drill-down (click tool to see details)                     │  │
│  └──────────────────────────────────────────────────────────────────────┘  │
│                                                                              │
└─────────────────────────────────────────────────────────────────────────────┘
```

---

## 5. Integration Points

### 5.1 ClaudeCodeSDKManager Integration

**File**: `/workspaces/agent-feed/src/services/ClaudeCodeSDKManager.js`

**Modification Points**:

```javascript
// BEFORE (existing code)
for await (const message of queryResponse) {
  if (message.type === 'assistant' && message.message?.content) {
    const content = Array.isArray(message.message.content)
      ? message.message.content
      : [message.message.content];

    content.forEach(block => {
      if (typeof block === 'object' && block.type === 'tool_use') {
        const toolName = block.name;
        const toolInput = block.input;
        const action = formatToolAction(toolName, toolInput);

        console.log(`🔧 Tool execution detected: ${toolName}(${action})`);

        // EXISTING: Broadcast to SSE
        broadcastToolActivity(toolName, action, {
          block_id: block.id,
          message_uuid: message.uuid
        });
      }
    });
  }
}

// AFTER (enhanced with telemetry)
import { TelemetryService } from './TelemetryService.js';
const telemetryService = new TelemetryService();

for await (const message of queryResponse) {
  if (message.type === 'assistant' && message.message?.content) {
    const content = Array.isArray(message.message.content)
      ? message.message.content
      : [message.message.content];

    content.forEach(block => {
      if (typeof block === 'object' && block.type === 'tool_use') {
        const toolName = block.name;
        const toolInput = block.input;
        const action = formatToolAction(toolName, toolInput);

        console.log(`🔧 Tool execution detected: ${toolName}(${action})`);

        // EXISTING: Broadcast to SSE
        broadcastToolActivity(toolName, action, {
          block_id: block.id,
          message_uuid: message.uuid
        });

        // NEW: Capture telemetry
        telemetryService.captureToolExecution({
          tool: toolName,
          action: action,
          block_id: block.id,
          message_uuid: message.uuid,
          session_id: options.sessionId || getCurrentSessionId(),
          agent_id: options.agentId,
          status: 'started',
          timestamp: Date.now()
        });
      }
    });
  }
}
```

### 5.2 Server.js Integration

**File**: `/workspaces/agent-feed/api-server/server.js`

**New SSE Endpoint**:

```javascript
// Add to existing SSE setup
app.get('/api/activity/stream', (req, res) => {
  const clientId = crypto.randomUUID();
  const filter = {
    priority: req.query.priority || 'all',
    tools: req.query.tools ? req.query.tools.split(',') : null,
    session_id: req.query.session_id || null
  };

  // SSE headers
  res.writeHead(200, {
    'Content-Type': 'text/event-stream',
    'Cache-Control': 'no-cache',
    'Connection': 'keep-alive',
    'Access-Control-Allow-Origin': '*'
  });

  // Register client
  sseClients.set(clientId, res);
  clientFilters.set(clientId, filter);

  console.log(`✅ SSE client connected: ${clientId} with filter:`, filter);

  // Send initial connection message
  res.write(`data: ${JSON.stringify({
    type: 'connection',
    client_id: clientId,
    timestamp: Date.now()
  })}\n\n`);

  // Heartbeat
  const heartbeat = setInterval(() => {
    res.write(': heartbeat\n\n');
  }, 30000);

  // Cleanup on disconnect
  req.on('close', () => {
    clearInterval(heartbeat);
    sseClients.delete(clientId);
    clientFilters.delete(clientId);
    console.log(`❌ SSE client disconnected: ${clientId}`);
  });
});
```

### 5.3 Database Integration

**File**: `/workspaces/agent-feed/api-server/db/migrations/009-telemetry-tables.sql`

**Migration Script**:

```sql
-- Migration 009: Telemetry Tables for Live Activity System
-- Created: 2025-10-25

BEGIN TRANSACTION;

-- Enable WAL mode for better concurrency
PRAGMA journal_mode = WAL;
PRAGMA synchronous = NORMAL;

-- activity_events table
CREATE TABLE IF NOT EXISTS activity_events (
  id TEXT PRIMARY KEY DEFAULT (lower(hex(randomblob(16)))),
  event_type TEXT NOT NULL,
  session_id TEXT NOT NULL,
  agent_id TEXT,
  tool_name TEXT,
  action TEXT,
  status TEXT NOT NULL,
  duration INTEGER,
  timestamp DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  metadata JSON,
  CHECK (event_type IN ('tool_execution', 'agent_started', 'agent_completed', 'progress_update')),
  CHECK (status IN ('started', 'success', 'failed'))
);

CREATE INDEX idx_events_session_time ON activity_events(session_id, timestamp DESC);
CREATE INDEX idx_events_type_time ON activity_events(event_type, timestamp DESC);
CREATE INDEX idx_events_tool_time ON activity_events(tool_name, timestamp DESC) WHERE tool_name IS NOT NULL;
CREATE INDEX idx_events_status ON activity_events(status, timestamp DESC);

-- agent_executions table
CREATE TABLE IF NOT EXISTS agent_executions (
  id TEXT PRIMARY KEY DEFAULT (lower(hex(randomblob(16)))),
  session_id TEXT NOT NULL,
  agent_type TEXT NOT NULL,
  status TEXT NOT NULL,
  prompt TEXT,
  model TEXT NOT NULL,
  start_time DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  end_time DATETIME,
  duration INTEGER,
  tokens_used INTEGER,
  cost REAL,
  error TEXT,
  CHECK (status IN ('running', 'completed', 'failed')),
  CHECK (duration IS NULL OR duration >= 0),
  CHECK (tokens_used IS NULL OR tokens_used >= 0),
  CHECK (cost IS NULL OR cost >= 0)
);

CREATE INDEX idx_agents_session ON agent_executions(session_id, start_time DESC);
CREATE INDEX idx_agents_status ON agent_executions(status, start_time DESC);
CREATE INDEX idx_agents_type ON agent_executions(agent_type, start_time DESC);

-- tool_executions table
CREATE TABLE IF NOT EXISTS tool_executions (
  id TEXT PRIMARY KEY DEFAULT (lower(hex(randomblob(16)))),
  session_id TEXT NOT NULL,
  agent_id TEXT,
  tool_name TEXT NOT NULL,
  action TEXT,
  status TEXT NOT NULL,
  duration INTEGER NOT NULL,
  output_size INTEGER,
  file_path TEXT,
  error TEXT,
  timestamp DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CHECK (status IN ('success', 'failed')),
  CHECK (duration >= 0),
  CHECK (output_size IS NULL OR output_size >= 0),
  FOREIGN KEY (agent_id) REFERENCES agent_executions(id) ON DELETE CASCADE
);

CREATE INDEX idx_tools_session ON tool_executions(session_id, timestamp DESC);
CREATE INDEX idx_tools_agent ON tool_executions(agent_id, timestamp DESC) WHERE agent_id IS NOT NULL;
CREATE INDEX idx_tools_name_time ON tool_executions(tool_name, timestamp DESC);
CREATE INDEX idx_tools_status ON tool_executions(status, timestamp DESC);

-- session_metrics table
CREATE TABLE IF NOT EXISTS session_metrics (
  session_id TEXT PRIMARY KEY,
  start_time DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  end_time DATETIME,
  duration INTEGER,
  request_count INTEGER DEFAULT 0 NOT NULL,
  total_tokens INTEGER DEFAULT 0 NOT NULL,
  total_cost REAL DEFAULT 0.0 NOT NULL,
  agent_count INTEGER DEFAULT 0 NOT NULL,
  tool_count INTEGER DEFAULT 0 NOT NULL,
  error_count INTEGER DEFAULT 0 NOT NULL,
  status TEXT,
  CHECK (request_count >= 0),
  CHECK (total_tokens >= 0),
  CHECK (total_cost >= 0),
  CHECK (agent_count >= 0),
  CHECK (tool_count >= 0),
  CHECK (error_count >= 0),
  CHECK (status IN ('active', 'completed', 'failed'))
);

CREATE INDEX idx_session_start_time ON session_metrics(start_time DESC);
CREATE INDEX idx_session_status ON session_metrics(status, start_time DESC);

COMMIT;
```

**Run Migration**:

```javascript
// File: /workspaces/agent-feed/api-server/scripts/run-migration-009.js
import dbManager from '../database.js';
import fs from 'fs';
import path from 'path';

const migrationPath = path.join(__dirname, '../db/migrations/009-telemetry-tables.sql');
const sql = fs.readFileSync(migrationPath, 'utf-8');

try {
  const db = dbManager.getDatabase();
  db.exec(sql);
  console.log('✅ Migration 009 completed successfully');
} catch (error) {
  console.error('❌ Migration 009 failed:', error);
  process.exit(1);
}
```

### 5.4 Frontend Integration

**New Hook**: `/workspaces/agent-feed/frontend/src/hooks/useActivityStream.js`

```javascript
import { useEffect } from 'react';
import { useHTTPSSE } from './useHTTPSSE';
import { useActivityStore } from '../stores/activityStore';

export function useActivityStream(options = {}) {
  const { priority = 'all', sessionId = null } = options;
  const addEvent = useActivityStore(state => state.addEvent);

  const sseUrl = `/api/activity/stream?priority=${priority}${sessionId ? `&session_id=${sessionId}` : ''}`;

  const { data, error, isConnected } = useHTTPSSE(sseUrl, {
    onMessage: (event) => {
      try {
        const data = JSON.parse(event.data);
        if (data.type === 'tool_activity') {
          addEvent(data.event);
        }
      } catch (err) {
        console.error('Failed to parse SSE event:', err);
      }
    }
  });

  return { isConnected, error };
}
```

**New Store**: `/workspaces/agent-feed/frontend/src/stores/activityStore.js`

```javascript
import create from 'zustand';

export const useActivityStore = create((set) => ({
  events: [],
  metrics: {
    total_events: 0,
    tool_counts: {},
    agent_counts: {}
  },

  addEvent: (event) => set((state) => ({
    events: [event, ...state.events].slice(0, 100), // Keep only 100 most recent
    metrics: {
      total_events: state.metrics.total_events + 1,
      tool_counts: {
        ...state.metrics.tool_counts,
        [event.tool]: (state.metrics.tool_counts[event.tool] || 0) + 1
      },
      agent_counts: event.agent_id
        ? {
            ...state.metrics.agent_counts,
            [event.agent_id]: (state.metrics.agent_counts[event.agent_id] || 0) + 1
          }
        : state.metrics.agent_counts
    }
  })),

  clearEvents: () => set({ events: [], metrics: { total_events: 0, tool_counts: {}, agent_counts: {} } })
}));
```

---

## 6. API Design

### 6.1 SSE Streaming Endpoint

**Endpoint**: `GET /api/activity/stream`

**Query Parameters**:
- `priority` (optional): Filter by priority level (`high`, `medium`, `low`, `all`)
- `tools` (optional): Comma-separated list of tools to filter (`Bash,Read,Write`)
- `session_id` (optional): Filter by specific session ID

**Response**: Server-Sent Events stream

**Event Format**:

```
event: tool_activity
data: {"type":"tool_activity","event":{"tool":"Bash","action":"npm install","priority":"high","timestamp":1730000000000,"session_id":"session_123"},"timestamp":1730000000000}

event: heartbeat
data: {"type":"heartbeat","timestamp":1730000000000}
```

**Example**:

```javascript
const eventSource = new EventSource('/api/activity/stream?priority=high');

eventSource.onmessage = (event) => {
  const data = JSON.parse(event.data);
  console.log('Received event:', data);
};

eventSource.onerror = (error) => {
  console.error('SSE error:', error);
};
```

### 6.2 Activity Events Endpoint

**Endpoint**: `GET /api/activity/events`

**Query Parameters**:
- `session_id` (optional): Filter by session ID
- `tool` (optional): Filter by tool name
- `status` (optional): Filter by status (`started`, `success`, `failed`)
- `page` (optional, default: 1): Page number for pagination
- `limit` (optional, default: 50): Number of events per page
- `start_time` (optional): Filter events after this timestamp (ISO 8601)
- `end_time` (optional): Filter events before this timestamp (ISO 8601)

**Response**:

```json
{
  "success": true,
  "events": [
    {
      "id": "evt_abc123",
      "event_type": "tool_execution",
      "session_id": "session_xyz",
      "tool_name": "Read",
      "action": "package.json",
      "status": "success",
      "duration": 45,
      "timestamp": "2025-10-25T12:00:00Z",
      "metadata": {
        "file_path": "/workspaces/agent-feed/package.json",
        "file_size": 1024
      }
    }
  ],
  "pagination": {
    "page": 1,
    "limit": 50,
    "total": 237,
    "has_more": true
  }
}
```

### 6.3 Session Details Endpoint

**Endpoint**: `GET /api/activity/sessions/:sessionId`

**Query Parameters**:
- `include_tools` (optional, default: true): Include tool executions
- `include_agents` (optional, default: true): Include agent executions

**Response**:

```json
{
  "success": true,
  "session": {
    "session_id": "session_xyz",
    "start_time": "2025-10-25T12:00:00Z",
    "end_time": "2025-10-25T12:15:00Z",
    "duration": 900000,
    "request_count": 15,
    "total_tokens": 12500,
    "total_cost": 0.375,
    "agent_count": 3,
    "tool_count": 42,
    "error_count": 2,
    "status": "completed"
  },
  "agents": [
    {
      "id": "agent_abc",
      "agent_type": "coder",
      "status": "completed",
      "start_time": "2025-10-25T12:00:00Z",
      "end_time": "2025-10-25T12:10:00Z",
      "duration": 600000,
      "tokens_used": 8000,
      "cost": 0.24
    }
  ],
  "tools": [
    {
      "id": "tool_123",
      "tool_name": "Read",
      "action": "package.json",
      "status": "success",
      "duration": 45,
      "timestamp": "2025-10-25T12:00:01Z"
    }
  ]
}
```

### 6.4 Metrics Endpoint

**Endpoint**: `GET /api/activity/metrics`

**Query Parameters**:
- `time_range` (optional, default: `24h`): Time range for metrics (`1h`, `24h`, `7d`, `30d`)
- `session_id` (optional): Calculate metrics for specific session

**Response**:

```json
{
  "success": true,
  "metrics": {
    "total_sessions": 45,
    "active_sessions": 3,
    "total_events": 1250,
    "total_agents": 12,
    "total_tools": 580,
    "total_errors": 18,
    "average_session_duration": 720000,
    "average_tool_duration": 156,
    "tool_usage": {
      "Read": 245,
      "Write": 132,
      "Bash": 89,
      "Edit": 67,
      "Grep": 47
    },
    "agent_usage": {
      "coder": 8,
      "tester": 3,
      "researcher": 1
    },
    "error_rate": 0.014
  },
  "time_range": {
    "start": "2025-10-24T12:00:00Z",
    "end": "2025-10-25T12:00:00Z"
  }
}
```

### 6.5 Health Check Endpoint

**Endpoint**: `GET /api/activity/health`

**Response**:

```json
{
  "success": true,
  "telemetry": {
    "status": "healthy",
    "database_connected": true,
    "event_queue_size": 12,
    "sse_clients_connected": 5,
    "events_processed_last_minute": 47,
    "average_event_latency_ms": 8.3,
    "last_event_timestamp": "2025-10-25T12:00:00Z"
  },
  "timestamp": "2025-10-25T12:00:00Z"
}
```

---

## 7. Frontend Architecture

### 7.1 Component Hierarchy

```
<App>
  └── <DashboardLayout>
      └── <ActivityDashboard>
          ├── <LiveActivityFeed>           (Real-time event stream)
          │   ├── <ActivityEventItem />    (Individual event)
          │   └── <VirtualScroll />        (Performance optimization)
          │
          ├── <SessionMetricsPanel>        (Current session stats)
          │   ├── <MetricCard />
          │   └── <ProgressIndicator />
          │
          ├── <ToolUsageChart>             (Tool execution breakdown)
          │   └── <BarChart />
          │
          ├── <AgentStatusPanel>           (Active agents)
          │   └── <AgentCard />
          │
          └── <SessionHistoryList>         (Past sessions)
              └── <SessionCard />
```

### 7.2 LiveActivityFeed Component

**File**: `/workspaces/agent-feed/frontend/src/components/LiveActivityFeed.jsx`

```jsx
import React, { useEffect, useRef } from 'react';
import { useActivityStream } from '../hooks/useActivityStream';
import { useActivityStore } from '../stores/activityStore';
import { ActivityEventItem } from './ActivityEventItem';
import { VirtualScroll } from './VirtualScroll';

export function LiveActivityFeed({ sessionId = null, priority = 'all' }) {
  const { isConnected, error } = useActivityStream({ sessionId, priority });
  const events = useActivityStore(state => state.events);
  const scrollRef = useRef(null);

  // Auto-scroll to top on new event
  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = 0;
    }
  }, [events.length]);

  return (
    <div className="live-activity-feed">
      <div className="feed-header">
        <h3>Live Activity</h3>
        <div className="connection-status">
          {isConnected ? (
            <span className="status-indicator connected">● Connected</span>
          ) : (
            <span className="status-indicator disconnected">● Disconnected</span>
          )}
        </div>
      </div>

      {error && (
        <div className="error-banner">
          Failed to connect to activity stream: {error.message}
        </div>
      )}

      <div ref={scrollRef} className="feed-content">
        <VirtualScroll
          items={events}
          itemHeight={60}
          renderItem={(event, index) => (
            <ActivityEventItem key={event.id || index} event={event} />
          )}
        />
      </div>
    </div>
  );
}
```

### 7.3 ActivityEventItem Component

**File**: `/workspaces/agent-feed/frontend/src/components/ActivityEventItem.jsx`

```jsx
import React from 'react';
import { formatDistanceToNow } from 'date-fns';
import { getToolIcon, getToolColor } from '../utils/toolHelpers';

export function ActivityEventItem({ event }) {
  const icon = getToolIcon(event.tool);
  const color = getToolColor(event.priority);
  const timeAgo = formatDistanceToNow(new Date(event.timestamp), { addSuffix: true });

  return (
    <div className="activity-event-item" style={{ borderLeftColor: color }}>
      <div className="event-icon" style={{ color }}>
        {icon}
      </div>

      <div className="event-content">
        <div className="event-header">
          <span className="event-tool">{event.tool}</span>
          <span className="event-time">{timeAgo}</span>
        </div>

        <div className="event-action">
          {event.action}
        </div>

        {event.duration && (
          <div className="event-metadata">
            <span className="duration">{event.duration}ms</span>
            {event.status === 'failed' && (
              <span className="status-badge error">Failed</span>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
```

### 7.4 SessionMetricsPanel Component

**File**: `/workspaces/agent-feed/frontend/src/components/SessionMetricsPanel.jsx`

```jsx
import React, { useEffect, useState } from 'react';
import { useActivityStore } from '../stores/activityStore';
import { MetricCard } from './MetricCard';

export function SessionMetricsPanel({ sessionId }) {
  const metrics = useActivityStore(state => state.metrics);
  const [sessionData, setSessionData] = useState(null);

  useEffect(() => {
    if (sessionId) {
      fetch(`/api/activity/sessions/${sessionId}`)
        .then(res => res.json())
        .then(data => setSessionData(data.session))
        .catch(err => console.error('Failed to load session data:', err));
    }
  }, [sessionId]);

  const displayMetrics = sessionData || {
    total_events: metrics.total_events,
    tool_count: Object.values(metrics.tool_counts).reduce((a, b) => a + b, 0),
    agent_count: Object.keys(metrics.agent_counts).length
  };

  return (
    <div className="session-metrics-panel">
      <h3>Session Metrics</h3>
      <div className="metrics-grid">
        <MetricCard
          label="Total Events"
          value={displayMetrics.total_events}
          icon="📊"
        />
        <MetricCard
          label="Tool Executions"
          value={displayMetrics.tool_count}
          icon="🛠️"
        />
        <MetricCard
          label="Active Agents"
          value={displayMetrics.agent_count}
          icon="🤖"
        />
        {sessionData?.total_cost && (
          <MetricCard
            label="Total Cost"
            value={`$${sessionData.total_cost.toFixed(3)}`}
            icon="💰"
          />
        )}
      </div>
    </div>
  );
}
```

### 7.5 State Management (Zustand)

**File**: `/workspaces/agent-feed/frontend/src/stores/activityStore.js`

```javascript
import create from 'zustand';
import { persist } from 'zustand/middleware';

export const useActivityStore = create(
  persist(
    (set, get) => ({
      // State
      events: [],
      sessions: new Map(),
      metrics: {
        total_events: 0,
        tool_counts: {},
        agent_counts: {}
      },
      filter: {
        priority: 'all',
        tools: null,
        sessionId: null
      },

      // Actions
      addEvent: (event) => set((state) => {
        const newEvents = [event, ...state.events].slice(0, 100);
        const newMetrics = {
          total_events: state.metrics.total_events + 1,
          tool_counts: {
            ...state.metrics.tool_counts,
            [event.tool]: (state.metrics.tool_counts[event.tool] || 0) + 1
          },
          agent_counts: event.agent_id
            ? {
                ...state.metrics.agent_counts,
                [event.agent_id]: (state.metrics.agent_counts[event.agent_id] || 0) + 1
              }
            : state.metrics.agent_counts
        };

        return {
          events: newEvents,
          metrics: newMetrics
        };
      }),

      setFilter: (filter) => set({ filter }),

      clearEvents: () => set({
        events: [],
        metrics: {
          total_events: 0,
          tool_counts: {},
          agent_counts: {}
        }
      }),

      loadSession: async (sessionId) => {
        const response = await fetch(`/api/activity/sessions/${sessionId}`);
        const data = await response.json();

        set((state) => {
          const sessions = new Map(state.sessions);
          sessions.set(sessionId, data);
          return { sessions };
        });

        return data;
      }
    }),
    {
      name: 'activity-store',
      partialize: (state) => ({
        // Only persist filter settings
        filter: state.filter
      })
    }
  )
);
```

---

## 8. Performance Architecture

### 8.1 Throughput Targets

| Metric | Target | Strategy |
|--------|--------|----------|
| **Events per Hour** | 10,000+ | Event batching, async processing |
| **Concurrent Sessions** | 100+ | Connection pooling, efficient indexing |
| **SSE Broadcast Latency** | <50ms | In-memory event queue, direct write |
| **Database Write Latency** | <10ms | Batch writes (50 events), WAL mode |
| **Query Response Time** | <100ms | Optimized indexes, query caching |
| **Frontend Update Rate** | 30 FPS | Debounced updates, virtual scrolling |

### 8.2 Optimization Techniques

#### 8.2.1 Event Batching

```javascript
class EventBatcher {
  constructor(flushSize = 50, flushInterval = 500) {
    this.queue = [];
    this.flushSize = flushSize;
    this.flushInterval = flushInterval;

    // Auto-flush on interval
    setInterval(() => this.flush(), this.flushInterval);
  }

  add(event) {
    this.queue.push(event);

    // Flush if batch size reached
    if (this.queue.length >= this.flushSize) {
      this.flush();
    }
  }

  async flush() {
    if (this.queue.length === 0) return;

    const batch = this.queue.splice(0, this.flushSize);

    try {
      await this.writeBatchToDatabase(batch);
    } catch (error) {
      console.error('Batch write failed:', error);
      // Re-queue on failure
      this.queue.unshift(...batch);
    }
  }

  writeBatchToDatabase(batch) {
    const insertMany = this.db.transaction((events) => {
      const stmt = this.db.prepare(`
        INSERT INTO activity_events
        (event_type, session_id, tool_name, action, status, duration, timestamp, metadata)
        VALUES (?, ?, ?, ?, ?, ?, ?, ?)
      `);

      for (const event of events) {
        stmt.run(
          event.event_type,
          event.session_id,
          event.tool_name,
          event.action,
          event.status,
          event.duration,
          event.timestamp,
          JSON.stringify(event.metadata)
        );
      }
    });

    return insertMany(batch);
  }
}
```

#### 8.2.2 Connection Pooling

```javascript
class SSEConnectionPool {
  constructor(maxConnections = 1000) {
    this.clients = new Map();
    this.filters = new Map();
    this.maxConnections = maxConnections;
  }

  addClient(clientId, response, filter) {
    // Enforce max connections
    if (this.clients.size >= this.maxConnections) {
      // Remove oldest connection
      const oldestClientId = this.clients.keys().next().value;
      this.removeClient(oldestClientId);
    }

    this.clients.set(clientId, response);
    this.filters.set(clientId, filter);
  }

  removeClient(clientId) {
    const response = this.clients.get(clientId);
    if (response) {
      try {
        response.end();
      } catch (error) {
        // Client already disconnected
      }
    }
    this.clients.delete(clientId);
    this.filters.delete(clientId);
  }

  broadcast(event) {
    const deadClients = [];

    for (const [clientId, response] of this.clients) {
      const filter = this.filters.get(clientId);

      if (!this.matchesFilter(event, filter)) continue;

      try {
        response.write(`data: ${JSON.stringify(event)}\n\n`);
      } catch (error) {
        deadClients.push(clientId);
      }
    }

    // Cleanup dead connections
    for (const clientId of deadClients) {
      this.removeClient(clientId);
    }
  }

  matchesFilter(event, filter) {
    if (filter.priority !== 'all' && event.priority !== filter.priority) {
      return false;
    }
    if (filter.tools && !filter.tools.includes(event.tool)) {
      return false;
    }
    if (filter.sessionId && event.session_id !== filter.sessionId) {
      return false;
    }
    return true;
  }
}
```

#### 8.2.3 Database Optimization

```sql
-- WAL mode for better concurrency
PRAGMA journal_mode = WAL;
PRAGMA synchronous = NORMAL;  -- Faster writes, minimal risk

-- Increase cache size (64MB)
PRAGMA cache_size = -64000;

-- Use memory for temporary tables
PRAGMA temp_store = MEMORY;

-- Optimize page size (4KB)
PRAGMA page_size = 4096;

-- Covering indexes for common queries
CREATE INDEX idx_events_session_time_covering
  ON activity_events(session_id, timestamp DESC, tool_name, status, duration);

-- Partial indexes for specific queries
CREATE INDEX idx_events_high_priority
  ON activity_events(timestamp DESC)
  WHERE priority = 'high';

CREATE INDEX idx_events_failed
  ON activity_events(timestamp DESC)
  WHERE status = 'failed';
```

#### 8.2.4 Frontend Optimization

**Virtual Scrolling**:

```jsx
// Use react-window for efficient list rendering
import { FixedSizeList as List } from 'react-window';

function VirtualActivityFeed({ events }) {
  const Row = ({ index, style }) => (
    <div style={style}>
      <ActivityEventItem event={events[index]} />
    </div>
  );

  return (
    <List
      height={600}
      itemCount={events.length}
      itemSize={60}
      width="100%"
    >
      {Row}
    </List>
  );
}
```

**Debounced Updates**:

```javascript
import { useMemo } from 'react';
import { debounce } from 'lodash';

function useActivityStore() {
  const addEvent = useMemo(
    () => debounce((event) => {
      store.setState((state) => ({
        events: [event, ...state.events].slice(0, 100)
      }));
    }, 50), // 50ms debounce
    []
  );

  return { addEvent };
}
```

### 8.3 Scalability Strategy

**Horizontal Scaling**:

```
┌─────────────────────────────────────────────────────────────────────────────┐
│                          HORIZONTAL SCALING STRATEGY                         │
├─────────────────────────────────────────────────────────────────────────────┤
│                                                                              │
│  Phase 1: Single Server (0-100 concurrent sessions)                         │
│  ┌──────────────────────────────────────────────────────────────────────┐  │
│  │  [Single Node]                                                        │  │
│  │    - In-memory event queue                                            │  │
│  │    - SQLite database (WAL mode)                                       │  │
│  │    - SSE connections (max 1000)                                       │  │
│  └──────────────────────────────────────────────────────────────────────┘  │
│                                                                              │
│  Phase 2: Load Balanced (100-1000 concurrent sessions)                      │
│  ┌──────────────────────────────────────────────────────────────────────┐  │
│  │  [Load Balancer]                                                      │  │
│  │         │                                                             │  │
│  │         ├──────────┬──────────┬──────────┐                           │  │
│  │         ▼          ▼          ▼          ▼                           │  │
│  │     [Node 1]   [Node 2]   [Node 3]   [Node 4]                        │  │
│  │         │          │          │          │                           │  │
│  │         └──────────┴──────────┴──────────┘                           │  │
│  │                      │                                                │  │
│  │                      ▼                                                │  │
│  │              [Shared Redis Pub/Sub]                                   │  │
│  │                      │                                                │  │
│  │                      ▼                                                │  │
│  │              [PostgreSQL Database]                                    │  │
│  └──────────────────────────────────────────────────────────────────────┘  │
│                                                                              │
│  Phase 3: Distributed (1000+ concurrent sessions)                           │
│  ┌──────────────────────────────────────────────────────────────────────┐  │
│  │  [API Gateway]                                                        │  │
│  │         │                                                             │  │
│  │         ├──────────────┬──────────────┬──────────────┐               │  │
│  │         ▼              ▼              ▼              ▼               │  │
│  │  [SSE Cluster]  [API Cluster]  [Worker Cluster]  [DB Cluster]        │  │
│  │    (Socket.io)   (Express)      (Bull Queue)     (PostgreSQL)        │  │
│  │         │              │              │              │               │  │
│  │         └──────────────┴──────────────┴──────────────┘               │  │
│  │                          │                                            │  │
│  │                          ▼                                            │  │
│  │                  [Kafka Event Stream]                                 │  │
│  │                          │                                            │  │
│  │         ├────────────────┼────────────────┐                          │  │
│  │         ▼                ▼                ▼                          │  │
│  │  [Analytics]      [Storage]        [Monitoring]                      │  │
│  │  (ClickHouse)     (S3)             (Prometheus)                      │  │
│  └──────────────────────────────────────────────────────────────────────┘  │
│                                                                              │
└─────────────────────────────────────────────────────────────────────────────┘
```

---

## 9. Security Architecture

### 9.1 Data Sanitization

**Prompt Truncation**:

```javascript
function sanitizePrompt(prompt, maxLength = 200) {
  if (!prompt) return '';

  let sanitized = String(prompt)
    // Remove API keys
    .replace(/sk-[a-zA-Z0-9]{48}/g, 'sk-***')
    // Remove tokens
    .replace(/token=[^&\s]+/gi, 'token=***')
    // Remove passwords
    .replace(/password=[^&\s]+/gi, 'password=***')
    // Remove secrets
    .replace(/secret=[^&\s]+/gi, 'secret=***');

  // Truncate
  if (sanitized.length > maxLength) {
    return sanitized.substring(0, maxLength - 3) + '...';
  }

  return sanitized;
}
```

**File Path Sanitization**:

```javascript
function sanitizeFilePath(filePath) {
  if (!filePath) return '';

  // Remove user home directory
  let sanitized = filePath.replace(/\/home\/[^/]+/g, '/home/***');
  sanitized = sanitized.replace(/\/Users\/[^/]+/g, '/Users/***');

  // Truncate long paths
  const parts = sanitized.split('/');
  if (parts.length > 5) {
    return '.../' + parts.slice(-3).join('/');
  }

  return sanitized;
}
```

**PII Filtering**:

```javascript
function filterPII(text) {
  if (!text) return '';

  return String(text)
    // Email addresses
    .replace(/[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}/g, '***@***.***')
    // Phone numbers
    .replace(/\b\d{3}[-.]?\d{3}[-.]?\d{4}\b/g, '***-***-****')
    // SSN
    .replace(/\b\d{3}-\d{2}-\d{4}\b/g, '***-**-****')
    // Credit card numbers
    .replace(/\b\d{4}[\s-]?\d{4}[\s-]?\d{4}[\s-]?\d{4}\b/g, '****-****-****-****');
}
```

### 9.2 Access Control

**API Key Authentication**:

```javascript
// Middleware for API key validation
function validateApiKey(req, res, next) {
  const apiKey = req.headers['x-api-key'];

  if (!apiKey) {
    return res.status(401).json({
      success: false,
      error: 'API key required'
    });
  }

  // Validate API key (check against database or environment)
  if (!isValidApiKey(apiKey)) {
    return res.status(403).json({
      success: false,
      error: 'Invalid API key'
    });
  }

  next();
}

// Apply to protected endpoints
app.get('/api/activity/events', validateApiKey, getActivityEvents);
app.get('/api/activity/sessions/:id', validateApiKey, getSessionDetails);
```

**Session-Based Authorization**:

```javascript
function validateSessionAccess(req, res, next) {
  const { sessionId } = req.params;
  const userId = req.user.id; // From authentication middleware

  // Check if user owns this session
  const session = db.prepare(
    'SELECT user_id FROM session_metrics WHERE session_id = ?'
  ).get(sessionId);

  if (!session || session.user_id !== userId) {
    return res.status(403).json({
      success: false,
      error: 'Access denied to this session'
    });
  }

  next();
}
```

### 9.3 Rate Limiting

**Per-Client Rate Limiting**:

```javascript
import rateLimit from 'express-rate-limit';

// API endpoint rate limiting
const apiLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 100, // Limit each IP to 100 requests per windowMs
  message: 'Too many requests from this IP, please try again later'
});

app.use('/api/activity/', apiLimiter);

// SSE connection rate limiting
const sseLimiter = rateLimit({
  windowMs: 60 * 1000, // 1 minute
  max: 5, // Limit each IP to 5 SSE connections per minute
  message: 'Too many SSE connections, please try again later'
});

app.get('/api/activity/stream', sseLimiter, sseStreamHandler);
```

### 9.4 CORS Configuration

```javascript
import cors from 'cors';

const corsOptions = {
  origin: (origin, callback) => {
    const allowedOrigins = [
      'http://localhost:5173', // Vite dev server
      'https://agent-feed.example.com' // Production
    ];

    if (!origin || allowedOrigins.includes(origin)) {
      callback(null, true);
    } else {
      callback(new Error('Not allowed by CORS'));
    }
  },
  credentials: true,
  optionsSuccessStatus: 200
};

app.use(cors(corsOptions));
```

---

## 10. Deployment Architecture

### 10.1 Service Topology

```
┌─────────────────────────────────────────────────────────────────────────────┐
│                          DEPLOYMENT ARCHITECTURE                             │
├─────────────────────────────────────────────────────────────────────────────┤
│                                                                              │
│  ┌──────────────────────────────────────────────────────────────────────┐  │
│  │  NGINX Reverse Proxy (Port 80/443)                                    │  │
│  │    - SSL termination                                                  │  │
│  │    - Static file serving                                              │  │
│  │    - Request routing                                                  │  │
│  │    - Rate limiting                                                    │  │
│  └────────────────────────┬─────────────────────────────────────────────┘  │
│                            │                                                 │
│           ├────────────────┼────────────────┐                               │
│           │                │                │                               │
│           ▼                ▼                ▼                               │
│  ┌────────────────┐  ┌────────────────┐  ┌────────────────────────────┐   │
│  │ Frontend       │  │ API Server     │  │ WebSocket Server           │   │
│  │ (React/Vite)   │  │ (Express)      │  │ (Socket.io)                │   │
│  │ Port: 5173     │  │ Port: 3001     │  │ Port: 3002                 │   │
│  │                │  │                │  │                            │   │
│  │ - Static files │  │ - REST API     │  │ - SSE streaming            │   │
│  │ - React app    │  │ - Auth         │  │ - Real-time events         │   │
│  │ - Assets       │  │ - Business     │  │ - Connection pooling       │   │
│  │                │  │   logic        │  │                            │   │
│  └────────────────┘  └────────┬───────┘  └────────┬───────────────────┘   │
│                               │                   │                         │
│                               └──────────┬────────┘                         │
│                                          │                                   │
│                                          ▼                                   │
│                               ┌──────────────────┐                          │
│                               │  SQLite Database │                          │
│                               │  (WAL mode)      │                          │
│                               │                  │                          │
│                               │  - activity_events                          │
│                               │  - agent_executions                         │
│                               │  - tool_executions                          │
│                               │  - session_metrics                          │
│                               └──────────────────┘                          │
│                                                                              │
│  ┌──────────────────────────────────────────────────────────────────────┐  │
│  │  Background Services                                                  │  │
│  │                                                                        │  │
│  │  ┌────────────────┐  ┌────────────────┐  ┌────────────────────────┐ │  │
│  │  │ TelemetryWriter│  │ MetricsAggr    │  │ DatabaseBackup         │ │  │
│  │  │ - Event batching  │ - Running avg  │  │ - Daily backups        │ │  │
│  │  │ - Queue flushing  │ - Counters     │  │ - WAL checkpoint       │ │  │
│  │  └────────────────┘  └────────────────┘  └────────────────────────┘ │  │
│  └──────────────────────────────────────────────────────────────────────┘  │
│                                                                              │
└─────────────────────────────────────────────────────────────────────────────┘
```

### 10.2 Docker Compose Configuration

**File**: `/workspaces/agent-feed/docker-compose.telemetry.yml`

```yaml
version: '3.8'

services:
  # Frontend service
  frontend:
    build:
      context: ./frontend
      dockerfile: Dockerfile
    ports:
      - "5173:5173"
    environment:
      - VITE_API_URL=http://api-server:3001
      - VITE_WS_URL=ws://websocket-server:3002
    volumes:
      - ./frontend/src:/app/src
    depends_on:
      - api-server

  # API server
  api-server:
    build:
      context: ./api-server
      dockerfile: Dockerfile
    ports:
      - "3001:3001"
    environment:
      - NODE_ENV=production
      - DATABASE_PATH=/data/agent-feed.db
      - BROADCAST_CLAUDE_ACTIVITY=true
    volumes:
      - ./data:/data
      - ./api-server/src:/app/src
    healthcheck:
      test: ["CMD", "curl", "-f", "http://localhost:3001/api/activity/health"]
      interval: 30s
      timeout: 10s
      retries: 3

  # WebSocket server for SSE
  websocket-server:
    build:
      context: ./api-server
      dockerfile: Dockerfile.websocket
    ports:
      - "3002:3002"
    environment:
      - NODE_ENV=production
      - REDIS_URL=redis://redis:6379
    depends_on:
      - redis

  # Redis for pub/sub (if scaling)
  redis:
    image: redis:7-alpine
    ports:
      - "6379:6379"
    volumes:
      - redis-data:/data

  # NGINX reverse proxy
  nginx:
    image: nginx:alpine
    ports:
      - "80:80"
      - "443:443"
    volumes:
      - ./nginx/nginx.conf:/etc/nginx/nginx.conf:ro
      - ./nginx/ssl:/etc/nginx/ssl:ro
    depends_on:
      - frontend
      - api-server
      - websocket-server

volumes:
  redis-data:
```

### 10.3 Environment Variables

```bash
# API Server (.env)
NODE_ENV=production
PORT=3001
DATABASE_PATH=/data/agent-feed.db

# Telemetry settings
BROADCAST_CLAUDE_ACTIVITY=true
TELEMETRY_BATCH_SIZE=50
TELEMETRY_FLUSH_INTERVAL=500

# Security
API_KEY_REQUIRED=true
CORS_ORIGIN=https://agent-feed.example.com

# Rate limiting
RATE_LIMIT_WINDOW_MS=900000
RATE_LIMIT_MAX_REQUESTS=100

# Frontend (.env)
VITE_API_URL=https://api.agent-feed.example.com
VITE_WS_URL=wss://ws.agent-feed.example.com
VITE_ENABLE_TELEMETRY=true
```

### 10.4 Monitoring & Alerting

**Health Check Endpoint**:

```javascript
app.get('/api/activity/health', (req, res) => {
  const health = {
    status: 'healthy',
    timestamp: new Date().toISOString(),
    telemetry: {
      database_connected: !!db,
      event_queue_size: telemetryWriter.writeQueue.length,
      sse_clients_connected: sseClients.size,
      events_processed_last_minute: getEventsProcessedLastMinute(),
      average_event_latency_ms: getAverageEventLatency()
    },
    uptime: process.uptime()
  };

  const isHealthy =
    health.telemetry.database_connected &&
    health.telemetry.event_queue_size < 500 &&
    health.telemetry.average_event_latency_ms < 100;

  res.status(isHealthy ? 200 : 503).json({
    success: isHealthy,
    ...health
  });
});
```

**Prometheus Metrics**:

```javascript
import promClient from 'prom-client';

const register = new promClient.Registry();

// Event counter
const eventCounter = new promClient.Counter({
  name: 'telemetry_events_total',
  help: 'Total number of telemetry events processed',
  labelNames: ['event_type', 'status'],
  registers: [register]
});

// Event processing duration
const eventDuration = new promClient.Histogram({
  name: 'telemetry_event_duration_ms',
  help: 'Event processing duration in milliseconds',
  buckets: [1, 5, 10, 25, 50, 100, 250, 500, 1000],
  registers: [register]
});

// SSE connections
const sseConnections = new promClient.Gauge({
  name: 'telemetry_sse_connections',
  help: 'Number of active SSE connections',
  registers: [register]
});

// Expose metrics endpoint
app.get('/metrics', (req, res) => {
  res.set('Content-Type', register.contentType);
  res.end(register.metrics());
});
```

---

## Summary

This architecture document provides a comprehensive design for the Enhanced Live Activity System, covering all aspects from event capture to frontend visualization. The system is designed to:

1. **Capture** all Claude Code SDK tool executions in real-time
2. **Process** events with enrichment, validation, and aggregation
3. **Broadcast** events to connected clients via SSE with <50ms latency
4. **Persist** events to SQLite with optimized batch writes (<10ms)
5. **Visualize** activity in React frontend with real-time updates
6. **Scale** from single server to distributed architecture
7. **Secure** data with sanitization, authentication, and rate limiting
8. **Monitor** system health with metrics and alerting

**Key Implementation Files**:

- `/workspaces/agent-feed/src/services/TelemetryService.js` (new)
- `/workspaces/agent-feed/src/services/ClaudeCodeSDKManager.js` (modify)
- `/workspaces/agent-feed/api-server/server.js` (enhance)
- `/workspaces/agent-feed/api-server/db/migrations/009-telemetry-tables.sql` (new)
- `/workspaces/agent-feed/frontend/src/components/LiveActivityFeed.jsx` (new)
- `/workspaces/agent-feed/frontend/src/stores/activityStore.js` (new)

**Next Steps**:
1. Review and approve architecture
2. Create SPARC Pseudocode for implementation
3. Implement TDD test suite
4. Build components incrementally
5. Deploy and monitor performance

---

**Document Version**: 1.0.0
**Last Updated**: 2025-10-25
**Status**: Ready for Review
