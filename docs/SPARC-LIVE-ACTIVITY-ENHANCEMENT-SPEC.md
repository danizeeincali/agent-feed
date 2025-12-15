# SPARC Specification: Enhanced Live Activity System with Claude Code SDK Integration

**Document ID:** SPEC-LIVE-ACTIVITY-001
**Version:** 1.0.0
**Date:** 2025-10-25
**Status:** Draft
**Owner:** Engineering Team
**Complexity:** High
**Priority:** High

---

## Table of Contents

1. [Introduction](#1-introduction)
2. [Problem Statement](#2-problem-statement)
3. [Solution Overview](#3-solution-overview)
4. [Functional Requirements](#4-functional-requirements)
5. [Non-Functional Requirements](#5-non-functional-requirements)
6. [System Architecture](#6-system-architecture)
7. [Data Models](#7-data-models)
8. [Event Types](#8-event-types)
9. [API Endpoints](#9-api-endpoints)
10. [Success Metrics](#10-success-metrics)
11. [Risks and Mitigations](#11-risks-and-mitigations)
12. [Acceptance Criteria](#12-acceptance-criteria)
13. [Appendices](#13-appendices)

---

## 1. Introduction

### 1.1 Purpose

This specification defines the requirements for enhancing the live activity monitoring system to capture comprehensive telemetry from Claude Code SDK executions. The enhanced system will provide real-time visibility into agent activity, tool usage, prompt information, token analytics, and execution status.

### 1.2 Scope

**In Scope:**
- Agent lifecycle tracking (started, executing, completed, failed)
- Tool execution details (duration, status, output size, errors)
- Prompt information capture (text, length, type, latency)
- Progress indicators (current step, percentage, ETA)
- Session metrics (active sessions, duration, requests, cost)
- Performance metrics (latency p50/p95/p99, throughput, error rate)
- File path tracking for file operations
- Agent hierarchy visualization (parent → child relationships)
- Real-time SSE broadcasting enhancements
- Database schema extensions
- Telemetry health monitoring
- Privacy and security controls

**Out of Scope:**
- Frontend UI components (separate implementation)
- Historical data migration
- Machine learning/predictive analytics
- External monitoring service integrations (DataDog, New Relic)
- Cost optimization algorithms
- Multi-tenant isolation

### 1.3 Background

**Current System Capabilities:**
- Basic tool activity broadcasting via SSE
- Token analytics tracking (input, output, cache tokens, cost)
- ActivityBroadcaster for WebSocket distribution
- SSEOutputChunker for incremental streaming
- TokenAnalyticsWriter for database persistence
- Database: `token_analytics` table with 350+ records

**Current Limitations:**
- No agent lifecycle tracking
- Limited tool execution context
- No prompt analytics
- Missing progress indicators
- No session-level aggregation
- No performance percentile metrics
- No agent hierarchy tracking
- Limited error categorization
- No telemetry health monitoring

**Business Drivers:**
- Real-time visibility into agent operations
- Performance optimization opportunities
- Cost control and budget management
- Debugging and troubleshooting support
- User experience transparency
- System health monitoring

### 1.4 Definitions

| Term | Definition |
|------|------------|
| **Agent** | Autonomous AI entity executing tasks via Claude Code SDK |
| **Agent Lifecycle** | Stages: created → thinking → executing → completed/failed |
| **Tool Execution** | Use of SDK tools (Bash, Read, Write, Edit, Grep, Glob, Task, etc.) |
| **Telemetry** | Automated collection and transmission of measurement data |
| **SSE** | Server-Sent Events - unidirectional real-time push from server |
| **Session** | Logical grouping of related requests with unique session ID |
| **Agent Hierarchy** | Parent-child relationships when agents spawn sub-agents |
| **Cache Tokens** | Reused tokens from prompt caching (90% cost reduction) |
| **P50/P95/P99** | 50th, 95th, 99th percentile latency measurements |

---

## 2. Problem Statement

### 2.1 Issue Description

The current live activity system provides basic tool broadcasting but lacks comprehensive telemetry needed for effective monitoring, debugging, and optimization of Claude Code SDK executions. Users cannot see:

- What agents are currently active
- What stage of execution agents are in
- How long tools are taking to execute
- What prompts are being processed
- Progress through multi-step workflows
- Session-level cost and performance metrics
- Agent spawning relationships
- Detailed error context

### 2.2 Impact Assessment

| Impact Area | Severity | Description |
|-------------|----------|-------------|
| **Debugging** | High | Difficult to diagnose execution issues without detailed telemetry |
| **Performance** | High | Cannot identify bottlenecks or slow operations |
| **Cost Control** | High | No real-time cost monitoring at session level |
| **User Experience** | Medium | Users lack visibility into what system is doing |
| **Reliability** | Medium | Cannot detect and alert on error patterns |
| **Optimization** | Medium | Missing data for informed optimization decisions |

### 2.3 User Stories

**US-1: Real-time Agent Monitoring**
> As a system administrator, I want to see all active agents and their current state, so I can monitor system health and identify issues quickly.

**US-2: Tool Execution Tracking**
> As a developer, I want to see execution time for each tool invocation, so I can identify performance bottlenecks.

**US-3: Prompt Analytics**
> As a product manager, I want to analyze prompt patterns and response times, so I can optimize user interactions.

**US-4: Progress Visibility**
> As a user, I want to see progress indicators for long-running operations, so I know the system is working.

**US-5: Session Cost Tracking**
> As a finance team member, I want to track cost per session in real-time, so I can enforce budget limits.

**US-6: Error Diagnosis**
> As a support engineer, I want detailed error context when failures occur, so I can resolve issues faster.

**US-7: Agent Hierarchy Visualization**
> As a researcher, I want to visualize agent spawning patterns, so I can understand multi-agent workflows.

---

## 3. Solution Overview

### 3.1 High-Level Approach

The enhanced system will implement a comprehensive telemetry pipeline that:

1. **Captures Events** - Instrument Claude Code SDK integration points
2. **Enriches Context** - Add metadata (session, agent hierarchy, timing)
3. **Validates Quality** - Sanitize sensitive data, enforce schemas
4. **Broadcasts Live** - Stream events via SSE with priority filtering
5. **Persists Analytics** - Store aggregated metrics in database
6. **Monitors Health** - Track telemetry system performance

### 3.2 Key Components

```
┌─────────────────────────────────────────────────────────────┐
│                    Claude Code SDK                          │
│  (Tool Invocations, Agent Operations, Token Usage)          │
└─────────────────┬───────────────────────────────────────────┘
                  │
                  ▼
┌─────────────────────────────────────────────────────────────┐
│              Telemetry Event Emitter                        │
│  • Agent lifecycle events                                   │
│  • Tool execution events                                    │
│  • Prompt analytics events                                  │
│  • Progress tracking events                                 │
└─────────────────┬───────────────────────────────────────────┘
                  │
                  ▼
┌─────────────────────────────────────────────────────────────┐
│              Event Enrichment Layer                         │
│  • Add session context                                      │
│  • Calculate durations                                      │
│  • Track agent hierarchy                                    │
│  • Sanitize sensitive data                                  │
└─────────────────┬───────────────────────────────────────────┘
                  │
         ┌────────┴────────┐
         │                 │
         ▼                 ▼
┌─────────────────┐ ┌──────────────────────┐
│  SSE Broadcaster│ │  Analytics Persister │
│  (Real-time)    │ │  (Database Storage)  │
└─────────────────┘ └──────────────────────┘
         │                 │
         ▼                 ▼
┌─────────────────┐ ┌──────────────────────┐
│  Live Dashboard │ │   Analytics API      │
│  (WebSocket)    │ │   (REST Queries)     │
└─────────────────┘ └──────────────────────┘
```

### 3.3 Integration Points

**Existing Systems:**
- `broadcastToSSE()` in `/api-server/server.js` (line 721)
- `TokenAnalyticsWriter` in `/src/services/TokenAnalyticsWriter.js`
- `ActivityBroadcaster` in `/src/websockets/activities/ActivityBroadcaster.js`
- `SSEOutputChunker` in `/src/SSEOutputChunker.js`
- Claude Code SDK routes in `/src/api/routes/claude-code-sdk.js`

**New Components:**
- `TelemetryEventEmitter` - Centralized event emission
- `AgentLifecycleTracker` - Agent state management
- `ToolExecutionMonitor` - Tool usage tracking
- `PromptAnalyzer` - Prompt metrics extraction
- `SessionMetricsAggregator` - Session-level analytics
- `TelemetryHealthMonitor` - System health tracking

---

## 4. Functional Requirements

### 4.1 Agent Activity Tracking

**FR-1.1: Agent Start Event**
- **Requirement:** System MUST emit event when agent starts execution
- **Event Data:** `{ agentId, agentName, agentType, sessionId, parentAgentId, timestamp }`
- **Trigger:** Claude Code SDK initializes agent instance
- **Acceptance:** Event appears in SSE stream within 50ms

**FR-1.2: Agent Status Transitions**
- **Requirement:** System MUST track agent state changes
- **States:** `created` → `thinking` → `executing` → `completed` | `failed`
- **Event Data:** `{ agentId, previousState, newState, timestamp, duration }`
- **Acceptance:** All state transitions emit events

**FR-1.3: Agent Hierarchy Tracking**
- **Requirement:** System MUST capture parent-child agent relationships
- **Event Data:** `{ childAgentId, parentAgentId, spawnReason, depth, timestamp }`
- **Use Case:** Agent spawns sub-agent using Task tool
- **Acceptance:** Hierarchy queryable via API

**FR-1.4: Agent Execution Results**
- **Requirement:** System MUST store agent output artifacts
- **Event Data:** `{ agentId, resultType, resultSize, success, errorMessage }`
- **Storage:** Link to artifact storage or embed small results
- **Acceptance:** Results accessible via API

**FR-1.5: Agent Idle Detection**
- **Requirement:** System MUST detect and mark idle agents
- **Threshold:** Agent with no activity for >5 minutes
- **Event Data:** `{ agentId, lastActivityTime, idleDuration }`
- **Acceptance:** Idle agents flagged in monitoring dashboard

### 4.2 Tool Execution Monitoring

**FR-2.1: Tool Execution Start**
- **Requirement:** System MUST emit event when tool invocation begins
- **Event Data:** `{ toolName, toolInput, agentId, sessionId, timestamp, executionId }`
- **Tools Tracked:** Bash, Read, Write, Edit, Grep, Glob, Task, TodoWrite, NotebookEdit
- **Acceptance:** Event precedes tool execution

**FR-2.2: Tool Execution Completion**
- **Requirement:** System MUST emit event when tool completes
- **Event Data:** `{ executionId, toolName, duration, success, outputSize, errorCode }`
- **Duration:** Milliseconds from start to completion
- **Acceptance:** Completion event follows start event

**FR-2.3: File Path Tracking**
- **Requirement:** System MUST capture file paths for file operations
- **Tools:** Read, Write, Edit, NotebookEdit, Glob
- **Event Data:** `{ executionId, filePath, operation, fileSize, mimeType }`
- **Privacy:** Truncate paths >100 chars, sanitize user directories
- **Acceptance:** File paths appear in tool execution events

**FR-2.4: Bash Command Output Size**
- **Requirement:** System MUST track bash command output volume
- **Event Data:** `{ executionId, command, stdoutSize, stderrSize, exitCode }`
- **Privacy:** Sanitize secrets from command strings
- **Acceptance:** Output sizes calculated accurately

**FR-2.5: Tool Error Categorization**
- **Requirement:** System MUST categorize tool execution errors
- **Categories:** `timeout`, `permission_denied`, `not_found`, `invalid_input`, `system_error`
- **Event Data:** `{ executionId, errorCategory, errorMessage, stackTrace }`
- **Acceptance:** Errors mapped to categories correctly

### 4.3 Prompt Analytics

**FR-3.1: Prompt Capture**
- **Requirement:** System MUST capture user prompts with privacy controls
- **Event Data:** `{ promptId, promptText, promptLength, sessionId, timestamp }`
- **Privacy:** Truncate to 500 chars, redact patterns (API keys, tokens, passwords)
- **Acceptance:** Prompts stored with sensitive data removed

**FR-3.2: Prompt Token Calculation**
- **Requirement:** System MUST estimate prompt token length
- **Method:** Use Claude tokenization library or character-based estimation
- **Event Data:** `{ promptId, estimatedTokens, actualTokens }`
- **Acceptance:** Estimation within ±10% of actual tokens

**FR-3.3: Prompt Type Classification**
- **Requirement:** System MUST classify prompt types
- **Types:** `chat`, `code_generation`, `code_analysis`, `debugging`, `documentation`, `other`
- **Method:** Pattern matching on prompt content
- **Event Data:** `{ promptId, promptType, confidence }`
- **Acceptance:** >80% classification accuracy

**FR-3.4: Prompt-to-Response Latency**
- **Requirement:** System MUST measure end-to-end latency
- **Start:** Prompt received at API endpoint
- **End:** First response token emitted
- **Event Data:** `{ promptId, latency, ttfb (time to first byte) }`
- **Acceptance:** Latency accurate to ±10ms

**FR-3.5: Prompt Template Detection**
- **Requirement:** System SHOULD detect common prompt patterns
- **Patterns:** System prompts, few-shot examples, structured formats
- **Event Data:** `{ promptId, templateMatches: [patternNames] }`
- **Use Case:** Identify opportunities for prompt optimization
- **Acceptance:** Pattern matching implemented with regex

### 4.4 Progress Tracking

**FR-4.1: Multi-Step Operation Detection**
- **Requirement:** System MUST identify multi-step workflows
- **Heuristic:** >3 tool executions in sequence OR Task tool invocation
- **Event Data:** `{ workflowId, estimatedSteps, currentStep, sessionId }`
- **Acceptance:** Multi-step operations flagged automatically

**FR-4.2: Completion Percentage Calculation**
- **Requirement:** System MUST calculate progress percentage
- **Method:** `(completedSteps / totalSteps) * 100`
- **Event Data:** `{ workflowId, percentage, completedSteps, totalSteps }`
- **Update Frequency:** After each step completion
- **Acceptance:** Percentage updates in real-time

**FR-4.3: ETA Estimation**
- **Requirement:** System SHOULD estimate time to completion
- **Method:** `remainingSteps * averageStepDuration`
- **Event Data:** `{ workflowId, estimatedSecondsRemaining, confidence }`
- **Accuracy:** Within 50% of actual time for >60% of workflows
- **Acceptance:** ETA provided for multi-step operations

**FR-4.4: Current Step Context**
- **Requirement:** System MUST display current step description
- **Event Data:** `{ workflowId, currentStepIndex, stepDescription, stepType }`
- **Examples:** "Reading file...", "Analyzing code...", "Writing tests..."
- **Acceptance:** Human-readable descriptions generated

**FR-4.5: Step Success/Failure Tracking**
- **Requirement:** System MUST track outcome of each step
- **Event Data:** `{ workflowId, stepIndex, success, duration, errorMessage }`
- **Use Case:** Identify which step failed in multi-step workflow
- **Acceptance:** Step outcomes persisted to database

### 4.5 Session Management

**FR-5.1: Session Tracking**
- **Requirement:** System MUST track all active sessions
- **Session Creation:** Generate UUID on first request
- **Event Data:** `{ sessionId, createdAt, userId, clientInfo }`
- **Acceptance:** Sessions queryable via API

**FR-5.2: Session Duration Calculation**
- **Requirement:** System MUST calculate session duration
- **Method:** `currentTime - sessionCreatedAt`
- **Event Data:** `{ sessionId, durationSeconds, lastActivityAt }`
- **Update Frequency:** Real-time
- **Acceptance:** Duration accurate to ±1 second

**FR-5.3: Requests Per Session**
- **Requirement:** System MUST count requests in session
- **Event Data:** `{ sessionId, requestCount, requestTypes }`
- **Request Types:** `chat`, `background_task`, `tool_execution`
- **Acceptance:** Counts increment accurately

**FR-5.4: Cost Per Session**
- **Requirement:** System MUST aggregate costs at session level
- **Method:** Sum all token costs for session requests
- **Event Data:** `{ sessionId, totalCost, tokenBreakdown: { input, output, cacheRead, cacheCreation } }`
- **Acceptance:** Costs match individual request costs

**FR-5.5: Session Termination**
- **Requirement:** System MUST detect and mark terminated sessions
- **Trigger:** Explicit close OR 30 minutes of inactivity
- **Event Data:** `{ sessionId, terminatedAt, reason, finalMetrics }`
- **Acceptance:** Sessions cleaned up properly

### 4.6 Performance Metrics

**FR-6.1: Request Latency Percentiles**
- **Requirement:** System MUST calculate p50, p95, p99 latency
- **Window:** Rolling 24-hour window
- **Event Data:** `{ metricType: 'latency', p50, p95, p99, sampleSize }`
- **Acceptance:** Percentiles calculated using reservoir sampling

**FR-6.2: Throughput Measurement**
- **Requirement:** System MUST calculate requests per hour
- **Method:** Count requests in sliding 1-hour window
- **Event Data:** `{ metricType: 'throughput', requestsPerHour, timestamp }`
- **Acceptance:** Throughput accurate to ±1 request

**FR-6.3: Error Rate Tracking**
- **Requirement:** System MUST calculate error rate percentage
- **Method:** `(failedRequests / totalRequests) * 100`
- **Window:** Rolling 1-hour window
- **Event Data:** `{ metricType: 'error_rate', percentage, errorCount, totalCount }`
- **Acceptance:** Error rate updates every 5 minutes

**FR-6.4: Cache Hit Rate**
- **Requirement:** System MUST track cache token utilization
- **Method:** `(cacheReadTokens / totalInputTokens) * 100`
- **Event Data:** `{ metricType: 'cache_hit_rate', percentage, savedCost }`
- **Acceptance:** Cache hit rate calculated per session

**FR-6.5: Error Type Distribution**
- **Requirement:** System MUST categorize and count error types
- **Categories:** `timeout`, `rate_limit`, `invalid_request`, `auth_failed`, `system_error`
- **Event Data:** `{ metricType: 'error_distribution', errorCounts: { [type]: count } }`
- **Acceptance:** Error types aggregated correctly

### 4.7 Real-time Broadcasting

**FR-7.1: SSE Event Streaming**
- **Requirement:** System MUST stream all events via SSE
- **Integration:** Use existing `broadcastToSSE()` function
- **Format:** `data: { type, data, timestamp, priority }\n\n`
- **Acceptance:** Events delivered within 50ms

**FR-7.2: Event Filtering by Priority**
- **Requirement:** System MUST support priority-based filtering
- **Priorities:** `critical`, `high`, `medium`, `low`
- **Use Case:** Dashboard subscribes to `high` and `critical` only
- **Acceptance:** Clients receive only subscribed priorities

**FR-7.3: Event History Buffer**
- **Requirement:** System MUST maintain recent event buffer
- **Buffer Size:** 1000 most recent events
- **Use Case:** New clients get recent history on connection
- **Acceptance:** Buffer rotates correctly, no memory leaks

**FR-7.4: Connection Recovery**
- **Requirement:** System MUST support SSE reconnection
- **Method:** Client sends last event ID, server resumes from there
- **Event Data:** `Last-Event-ID` header in reconnection request
- **Acceptance:** No event loss during reconnection

**FR-7.5: Multi-Client Broadcasting**
- **Requirement:** System MUST broadcast to all connected clients
- **Concurrency:** Support 100+ concurrent SSE connections
- **Acceptance:** All clients receive events reliably

---

## 5. Non-Functional Requirements

### 5.1 Performance

**NFR-1.1: Telemetry Overhead**
- **Requirement:** Telemetry MUST NOT add >5% overhead to request time
- **Measurement:** Compare request latency with/without telemetry
- **Acceptance:** p99 latency increase <5%

**NFR-1.2: SSE Broadcast Latency**
- **Requirement:** Events MUST reach SSE clients within 50ms
- **Measurement:** Timestamp difference between event creation and client receipt
- **Acceptance:** p95 latency <50ms

**NFR-1.3: Database Write Latency**
- **Requirement:** Analytics writes MUST NOT block API responses
- **Method:** Asynchronous database writes with fire-and-forget
- **Acceptance:** API responds before database write completes

**NFR-1.4: Concurrent Sessions**
- **Requirement:** System MUST support 100+ concurrent sessions
- **Load Test:** 100 concurrent users, 10 requests/minute each
- **Acceptance:** No degradation in response time under load

**NFR-1.5: Memory Efficiency**
- **Requirement:** Telemetry buffers MUST use <100MB memory
- **Monitoring:** Track heap usage of event buffers and caches
- **Acceptance:** Memory usage stable under sustained load

### 5.2 Reliability

**NFR-2.1: Non-Blocking Telemetry**
- **Requirement:** Telemetry failures MUST NOT block SDK execution
- **Method:** All telemetry operations wrapped in try-catch
- **Acceptance:** SDK continues executing even if telemetry fails

**NFR-2.2: Database Write Retry**
- **Requirement:** Failed database writes MUST retry automatically
- **Retry Policy:** Exponential backoff, max 3 retries
- **Acceptance:** Transient failures recover without data loss

**NFR-2.3: Event Buffer During Outage**
- **Requirement:** System MUST buffer events during database downtime
- **Buffer Size:** 10,000 events (approximately 1 hour of activity)
- **Acceptance:** Events written to database when connectivity restored

**NFR-2.4: Graceful Degradation**
- **Requirement:** System MUST degrade gracefully under high load
- **Behavior:** Drop low-priority events, keep critical events
- **Acceptance:** System remains responsive even when overloaded

**NFR-2.5: Data Integrity**
- **Requirement:** Telemetry data MUST be consistent and accurate
- **Validation:** Schema validation before database writes
- **Acceptance:** Zero data corruption in production

### 5.3 Security

**NFR-3.1: Sensitive Data Sanitization**
- **Requirement:** System MUST redact sensitive data from prompts
- **Patterns:** API keys, passwords, tokens, secrets
- **Method:** Regex replacement with `***`
- **Acceptance:** No secrets appear in telemetry logs

**NFR-3.2: File Path Truncation**
- **Requirement:** System MUST truncate long file paths
- **Max Length:** 100 characters
- **Method:** Keep filename, truncate directory path
- **Acceptance:** No full system paths leaked

**NFR-3.3: Access Control**
- **Requirement:** Telemetry endpoints MUST require authentication
- **Method:** API key validation middleware
- **Acceptance:** Unauthorized requests return 401

**NFR-3.4: Rate Limiting**
- **Requirement:** Telemetry APIs MUST enforce rate limits
- **Limit:** 100 requests/minute per API key
- **Acceptance:** Excessive requests return 429

**NFR-3.5: Audit Logging**
- **Requirement:** System MUST log access to sensitive telemetry
- **Events:** API queries, export requests, admin actions
- **Acceptance:** Audit trail queryable for 90 days

### 5.4 Scalability

**NFR-4.1: High Event Volume**
- **Requirement:** System MUST handle 10,000+ events per hour
- **Load Test:** Sustained 3 events/second for 1 hour
- **Acceptance:** No event loss or degradation

**NFR-4.2: Database Indexing**
- **Requirement:** Telemetry queries MUST return within 500ms
- **Indexes:** sessionId, timestamp, agentId, toolName
- **Acceptance:** Query performance meets SLA

**NFR-4.3: Event Aggregation**
- **Requirement:** High-volume metrics MUST be pre-aggregated
- **Frequency:** Hourly aggregation for performance metrics
- **Acceptance:** Aggregation completes within 5 minutes

**NFR-4.4: Log Rotation**
- **Requirement:** Telemetry logs MUST rotate automatically
- **Policy:** Daily rotation, 30-day retention
- **Acceptance:** Logs don't fill disk space

**NFR-4.5: Horizontal Scaling**
- **Requirement:** Telemetry system SHOULD support horizontal scaling
- **Method:** Stateless design with shared database
- **Acceptance:** Can run multiple API server instances

### 5.5 Observability

**NFR-5.1: Health Check Endpoint**
- **Requirement:** System MUST expose telemetry health endpoint
- **Endpoint:** `GET /api/telemetry/health`
- **Response:** `{ status, lastEventTime, bufferSize, errorRate }`
- **Acceptance:** Health check responds within 100ms

**NFR-5.2: Telemetry Metrics**
- **Requirement:** System MUST track its own performance
- **Metrics:** Events/second, buffer size, error count, latency
- **Acceptance:** Metrics available via `/metrics` endpoint

**NFR-5.3: Error Tracking**
- **Requirement:** Telemetry errors MUST be logged and alerted
- **Method:** Console logging with ERROR level
- **Acceptance:** Errors visible in server logs

**NFR-5.4: Data Quality Validation**
- **Requirement:** System MUST validate telemetry data quality
- **Checks:** Schema compliance, required fields, data types
- **Acceptance:** Invalid data rejected with clear error message

**NFR-5.5: Debugging Support**
- **Requirement:** System MUST support debug mode for troubleshooting
- **Method:** Environment variable `TELEMETRY_DEBUG=true`
- **Acceptance:** Debug logs help diagnose issues

### 5.6 Maintainability

**NFR-6.1: Modular Architecture**
- **Requirement:** Telemetry components MUST be modular
- **Structure:** Separate event emitters, processors, and persisters
- **Acceptance:** Components testable independently

**NFR-6.2: Clear Separation of Concerns**
- **Requirement:** Telemetry MUST NOT pollute SDK business logic
- **Method:** Event emitter pattern, dependency injection
- **Acceptance:** SDK code can run without telemetry

**NFR-6.3: Comprehensive Documentation**
- **Requirement:** All telemetry APIs MUST be documented
- **Format:** JSDoc comments + README.md
- **Acceptance:** Developers can integrate without asking questions

**NFR-6.4: Backward Compatibility**
- **Requirement:** Schema changes MUST be backward compatible
- **Method:** Add new fields, never remove or rename
- **Acceptance:** Old clients continue working after updates

**NFR-6.5: Testing Coverage**
- **Requirement:** Telemetry code MUST have >80% test coverage
- **Tests:** Unit tests, integration tests, e2e tests
- **Acceptance:** CI pipeline validates coverage

### 5.7 Usability

**NFR-7.1: Real-time UI Updates**
- **Requirement:** Dashboard MUST update without page refresh
- **Method:** SSE connection to live event stream
- **Acceptance:** Users see updates within 1 second

**NFR-7.2: Visual Status Indicators**
- **Requirement:** Agent status MUST be visually clear
- **Indicators:** Color-coded badges (green=active, red=failed, yellow=idle)
- **Acceptance:** Users understand status at a glance

**NFR-7.3: Filterable Activity Feed**
- **Requirement:** Users MUST be able to filter events
- **Filters:** By agent, by tool, by session, by priority
- **Acceptance:** Filters work correctly, results instant

**NFR-7.4: Exportable Data**
- **Requirement:** Users MUST be able to export telemetry data
- **Formats:** JSON, CSV
- **Acceptance:** Export completes within 10 seconds for 1000 events

**NFR-7.5: Mobile Responsiveness**
- **Requirement:** Telemetry dashboard SHOULD work on mobile
- **Method:** Responsive CSS, touch-friendly controls
- **Acceptance:** Usable on screens ≥375px width

---

## 6. System Architecture

### 6.1 Component Diagram

```
┌──────────────────────────────────────────────────────────────────┐
│                      Claude Code SDK Layer                        │
│  ┌────────────┐  ┌─────────────┐  ┌──────────────────────────┐  │
│  │ Agent      │  │ Tool        │  │ Streaming Chat           │  │
│  │ Operations │  │ Invocations │  │ (claude-code-sdk.js)     │  │
│  └─────┬──────┘  └──────┬──────┘  └──────────┬───────────────┘  │
└────────┼─────────────────┼──────────────────┼───────────────────┘
         │                 │                   │
         │                 │                   │
         ▼                 ▼                   ▼
┌──────────────────────────────────────────────────────────────────┐
│                  Telemetry Event Emitter                          │
│  ┌───────────────────────────────────────────────────────────┐  │
│  │  Event Emission Layer                                     │  │
│  │  • emitAgentEvent(type, data)                            │  │
│  │  • emitToolEvent(type, data)                             │  │
│  │  • emitPromptEvent(type, data)                           │  │
│  │  • emitProgressEvent(type, data)                         │  │
│  │  • emitSessionEvent(type, data)                          │  │
│  └───────────────────────────────────────────────────────────┘  │
└────────┬──────────────────────────────────────────────────────────┘
         │
         ▼
┌──────────────────────────────────────────────────────────────────┐
│                  Event Enrichment Pipeline                        │
│  ┌───────────────┐  ┌──────────────┐  ┌─────────────────────┐  │
│  │ Context       │  │ Sanitization │  │ Schema             │  │
│  │ Enricher      │  │ Filter       │  │ Validator          │  │
│  │               │  │              │  │                    │  │
│  │ • Session ID  │  │ • Redact     │  │ • Type checking    │  │
│  │ • Hierarchy   │  │   secrets    │  │ • Required fields  │  │
│  │ • Timing      │  │ • Truncate   │  │ • Format           │  │
│  │ • Correlation │  │   paths      │  │   validation       │  │
│  └───────────────┘  └──────────────┘  └─────────────────────┘  │
└────────┬──────────────────────────────────────────────────────────┘
         │
         ├───────────────────────────┬──────────────────────────────┐
         │                           │                              │
         ▼                           ▼                              ▼
┌─────────────────────┐  ┌─────────────────────┐  ┌────────────────────┐
│  SSE Broadcaster    │  │  Analytics          │  │  Metrics           │
│  (Real-time)        │  │  Persister          │  │  Aggregator        │
│                     │  │  (Database)         │  │  (In-memory)       │
│  • broadcastToSSE() │  │                     │  │                    │
│  • Priority filter  │  │  • Agent events     │  │  • p50/p95/p99     │
│  • Event buffer     │  │  • Tool executions  │  │  • Error rate      │
│  • Multi-client     │  │  • Prompt analytics │  │  • Throughput      │
│                     │  │  • Session metrics  │  │  • Cache hit rate  │
└──────────┬──────────┘  └──────────┬──────────┘  └────────┬───────────┘
           │                        │                       │
           │                        │                       │
           ▼                        ▼                       ▼
┌─────────────────────┐  ┌─────────────────────┐  ┌────────────────────┐
│  SSE Clients        │  │  Database           │  │  Metrics API       │
│  (Dashboard)        │  │  (SQLite)           │  │  Endpoints         │
│                     │  │                     │  │                    │
│  • WebSocket        │  │  Tables:            │  │  GET /metrics      │
│  • Event handlers   │  │  • agent_events     │  │  GET /performance  │
│  • UI updates       │  │  • tool_executions  │  │  GET /health       │
│                     │  │  • prompt_analytics │  │                    │
│                     │  │  • session_metrics  │  │                    │
└─────────────────────┘  └─────────────────────┘  └────────────────────┘
```

### 6.2 Data Flow

**Scenario: User sends prompt via Claude Code SDK**

```
1. User → API → POST /api/claude-code/streaming-chat
   └─ payload: { message: "Create a REST API", sessionId: "sess-123" }

2. API → TelemetryEventEmitter.emitPromptEvent()
   └─ event: { type: 'prompt_received', promptId, promptText, timestamp }

3. TelemetryEventEmitter → Event Enrichment Pipeline
   └─ adds: { sessionId, sanitizedPrompt, estimatedTokens }

4. Event Enrichment → SSE Broadcaster (async)
   └─ broadcastToSSE({ type: 'prompt_analytics', data: {...}, priority: 'high' })

5. Event Enrichment → Analytics Persister (async)
   └─ INSERT INTO prompt_analytics (...)

6. Claude Code SDK → Agent spawned → TelemetryEventEmitter.emitAgentEvent()
   └─ event: { type: 'agent_started', agentId, agentName, agentType, sessionId }

7. Agent → Tool: Read → TelemetryEventEmitter.emitToolEvent('tool_start')
   └─ event: { type: 'tool_start', toolName: 'Read', executionId, filePath }

8. Tool completes → TelemetryEventEmitter.emitToolEvent('tool_complete')
   └─ event: { type: 'tool_complete', executionId, duration: 120, success: true }

9. Agent completes → TelemetryEventEmitter.emitAgentEvent('agent_completed')
   └─ event: { type: 'agent_completed', agentId, duration, resultSize }

10. All events → SSE → Dashboard receives real-time updates
    └─ UI shows: "Agent active" → "Reading file..." → "Completed in 2.5s"
```

### 6.3 Integration Architecture

**New Components:**

```javascript
// /src/services/TelemetryEventEmitter.js
class TelemetryEventEmitter extends EventEmitter {
  emitAgentEvent(eventType, data) { ... }
  emitToolEvent(eventType, data) { ... }
  emitPromptEvent(eventType, data) { ... }
  emitProgressEvent(eventType, data) { ... }
  emitSessionEvent(eventType, data) { ... }
}

// /src/services/AgentLifecycleTracker.js
class AgentLifecycleTracker {
  trackAgentStart(agentId, metadata) { ... }
  trackStateTransition(agentId, newState) { ... }
  trackAgentCompletion(agentId, result) { ... }
  getActiveAgents() { ... }
}

// /src/services/ToolExecutionMonitor.js
class ToolExecutionMonitor {
  startToolExecution(toolName, input) { ... }
  completeToolExecution(executionId, result) { ... }
  getToolMetrics(toolName) { ... }
}

// /src/services/PromptAnalyzer.js
class PromptAnalyzer {
  analyzePrompt(promptText) { ... }
  classifyPromptType(promptText) { ... }
  sanitizePrompt(promptText) { ... }
  estimateTokens(promptText) { ... }
}

// /src/services/SessionMetricsAggregator.js
class SessionMetricsAggregator {
  trackSessionRequest(sessionId, requestData) { ... }
  calculateSessionMetrics(sessionId) { ... }
  getActiveSessionCount() { ... }
}

// /src/services/TelemetryHealthMonitor.js
class TelemetryHealthMonitor {
  checkHealth() { ... }
  getMetrics() { ... }
  validateDataQuality() { ... }
}
```

**Integration Points in Existing Code:**

```javascript
// In /src/api/routes/claude-code-sdk.js

import { TelemetryEventEmitter } from '../../services/TelemetryEventEmitter.js';
const telemetry = new TelemetryEventEmitter();

router.post('/streaming-chat', async (req, res) => {
  const { message, options = {} } = req.body;
  const sessionId = options.sessionId || `avi_dm_${Date.now()}_${crypto.randomUUID()}`;

  // EMIT PROMPT EVENT
  telemetry.emitPromptEvent('prompt_received', {
    promptId: uuidv4(),
    promptText: message,
    sessionId,
    timestamp: Date.now()
  });

  // EMIT AGENT START EVENT
  const agentId = uuidv4();
  telemetry.emitAgentEvent('agent_started', {
    agentId,
    agentName: 'claude-code-agent',
    agentType: 'streaming_chat',
    sessionId,
    timestamp: Date.now()
  });

  // Execute SDK
  const responses = await claudeCodeManager.createStreamingChat(message, options);

  // EMIT AGENT COMPLETED EVENT
  telemetry.emitAgentEvent('agent_completed', {
    agentId,
    success: true,
    duration: Date.now() - startTime,
    resultSize: JSON.stringify(responses).length
  });

  res.json({ success: true, ... });
});
```

### 6.4 Database Schema Extensions

**New Tables:**

```sql
-- Agent lifecycle events
CREATE TABLE agent_events (
  id TEXT PRIMARY KEY,
  timestamp TEXT NOT NULL,
  sessionId TEXT NOT NULL,
  agentId TEXT NOT NULL,
  agentName TEXT,
  agentType TEXT,
  eventType TEXT NOT NULL, -- 'started', 'state_transition', 'completed', 'failed'
  eventData TEXT, -- JSON blob
  parentAgentId TEXT,
  depth INTEGER DEFAULT 0,
  duration INTEGER,
  success BOOLEAN,
  errorMessage TEXT,
  INDEX idx_agent_events_session (sessionId),
  INDEX idx_agent_events_agent (agentId),
  INDEX idx_agent_events_timestamp (timestamp)
);

-- Tool execution tracking
CREATE TABLE tool_executions (
  id TEXT PRIMARY KEY,
  timestamp TEXT NOT NULL,
  sessionId TEXT NOT NULL,
  agentId TEXT,
  executionId TEXT UNIQUE NOT NULL,
  toolName TEXT NOT NULL,
  toolInput TEXT, -- JSON blob, sanitized
  filePath TEXT,
  startTime INTEGER NOT NULL,
  endTime INTEGER,
  duration INTEGER,
  success BOOLEAN,
  errorCode TEXT,
  errorMessage TEXT,
  outputSize INTEGER,
  exitCode INTEGER,
  INDEX idx_tool_executions_session (sessionId),
  INDEX idx_tool_executions_tool (toolName),
  INDEX idx_tool_executions_timestamp (timestamp)
);

-- Prompt analytics
CREATE TABLE prompt_analytics (
  id TEXT PRIMARY KEY,
  timestamp TEXT NOT NULL,
  sessionId TEXT NOT NULL,
  promptId TEXT UNIQUE NOT NULL,
  promptText TEXT, -- Truncated and sanitized
  promptLength INTEGER,
  estimatedTokens INTEGER,
  actualTokens INTEGER,
  promptType TEXT, -- 'chat', 'code_generation', etc.
  latency INTEGER, -- Time to first response token (ms)
  ttfb INTEGER, -- Time to first byte (ms)
  INDEX idx_prompt_analytics_session (sessionId),
  INDEX idx_prompt_analytics_timestamp (timestamp)
);

-- Session metrics
CREATE TABLE session_metrics (
  id TEXT PRIMARY KEY,
  sessionId TEXT UNIQUE NOT NULL,
  createdAt TEXT NOT NULL,
  lastActivityAt TEXT NOT NULL,
  terminatedAt TEXT,
  duration INTEGER,
  requestCount INTEGER DEFAULT 0,
  totalCost REAL DEFAULT 0.0,
  totalTokens INTEGER DEFAULT 0,
  inputTokens INTEGER DEFAULT 0,
  outputTokens INTEGER DEFAULT 0,
  cacheReadTokens INTEGER DEFAULT 0,
  cacheCreationTokens INTEGER DEFAULT 0,
  agentCount INTEGER DEFAULT 0,
  toolExecutionCount INTEGER DEFAULT 0,
  errorCount INTEGER DEFAULT 0,
  INDEX idx_session_metrics_timestamp (createdAt)
);

-- Performance metrics (aggregated)
CREATE TABLE performance_metrics (
  id TEXT PRIMARY KEY,
  timestamp TEXT NOT NULL,
  metricType TEXT NOT NULL, -- 'latency', 'throughput', 'error_rate', etc.
  metricValue REAL NOT NULL,
  metricData TEXT, -- JSON blob with p50/p95/p99, etc.
  windowSize TEXT, -- '1h', '24h', '7d'
  INDEX idx_performance_metrics_type (metricType),
  INDEX idx_performance_metrics_timestamp (timestamp)
);
```

**Schema Migration:**

```sql
-- Migration 009: Enhanced telemetry system
-- File: /src/database/migrations/009_create_telemetry_system.sql

BEGIN TRANSACTION;

-- Create agent_events table
CREATE TABLE IF NOT EXISTS agent_events (
  id TEXT PRIMARY KEY,
  timestamp TEXT NOT NULL,
  sessionId TEXT NOT NULL,
  agentId TEXT NOT NULL,
  agentName TEXT,
  agentType TEXT,
  eventType TEXT NOT NULL,
  eventData TEXT,
  parentAgentId TEXT,
  depth INTEGER DEFAULT 0,
  duration INTEGER,
  success BOOLEAN,
  errorMessage TEXT
);

CREATE INDEX IF NOT EXISTS idx_agent_events_session ON agent_events(sessionId);
CREATE INDEX IF NOT EXISTS idx_agent_events_agent ON agent_events(agentId);
CREATE INDEX IF NOT EXISTS idx_agent_events_timestamp ON agent_events(timestamp);

-- Create tool_executions table
CREATE TABLE IF NOT EXISTS tool_executions (
  id TEXT PRIMARY KEY,
  timestamp TEXT NOT NULL,
  sessionId TEXT NOT NULL,
  agentId TEXT,
  executionId TEXT UNIQUE NOT NULL,
  toolName TEXT NOT NULL,
  toolInput TEXT,
  filePath TEXT,
  startTime INTEGER NOT NULL,
  endTime INTEGER,
  duration INTEGER,
  success BOOLEAN,
  errorCode TEXT,
  errorMessage TEXT,
  outputSize INTEGER,
  exitCode INTEGER
);

CREATE INDEX IF NOT EXISTS idx_tool_executions_session ON tool_executions(sessionId);
CREATE INDEX IF NOT EXISTS idx_tool_executions_tool ON tool_executions(toolName);
CREATE INDEX IF NOT EXISTS idx_tool_executions_timestamp ON tool_executions(timestamp);

-- Create prompt_analytics table
CREATE TABLE IF NOT EXISTS prompt_analytics (
  id TEXT PRIMARY KEY,
  timestamp TEXT NOT NULL,
  sessionId TEXT NOT NULL,
  promptId TEXT UNIQUE NOT NULL,
  promptText TEXT,
  promptLength INTEGER,
  estimatedTokens INTEGER,
  actualTokens INTEGER,
  promptType TEXT,
  latency INTEGER,
  ttfb INTEGER
);

CREATE INDEX IF NOT EXISTS idx_prompt_analytics_session ON prompt_analytics(sessionId);
CREATE INDEX IF NOT EXISTS idx_prompt_analytics_timestamp ON prompt_analytics(timestamp);

-- Create session_metrics table
CREATE TABLE IF NOT EXISTS session_metrics (
  id TEXT PRIMARY KEY,
  sessionId TEXT UNIQUE NOT NULL,
  createdAt TEXT NOT NULL,
  lastActivityAt TEXT NOT NULL,
  terminatedAt TEXT,
  duration INTEGER,
  requestCount INTEGER DEFAULT 0,
  totalCost REAL DEFAULT 0.0,
  totalTokens INTEGER DEFAULT 0,
  inputTokens INTEGER DEFAULT 0,
  outputTokens INTEGER DEFAULT 0,
  cacheReadTokens INTEGER DEFAULT 0,
  cacheCreationTokens INTEGER DEFAULT 0,
  agentCount INTEGER DEFAULT 0,
  toolExecutionCount INTEGER DEFAULT 0,
  errorCount INTEGER DEFAULT 0
);

CREATE INDEX IF NOT EXISTS idx_session_metrics_timestamp ON session_metrics(createdAt);

-- Create performance_metrics table
CREATE TABLE IF NOT EXISTS performance_metrics (
  id TEXT PRIMARY KEY,
  timestamp TEXT NOT NULL,
  metricType TEXT NOT NULL,
  metricValue REAL NOT NULL,
  metricData TEXT,
  windowSize TEXT
);

CREATE INDEX IF NOT EXISTS idx_performance_metrics_type ON performance_metrics(metricType);
CREATE INDEX IF NOT EXISTS idx_performance_metrics_timestamp ON performance_metrics(timestamp);

COMMIT;
```

---

## 7. Data Models

### 7.1 Event Schemas

**Agent Event Schema:**

```typescript
interface AgentEvent {
  id: string;                    // UUID
  timestamp: string;             // ISO 8601
  sessionId: string;             // Session UUID
  agentId: string;               // Agent UUID
  agentName: string;             // "claude-code-agent", "link-logger-agent", etc.
  agentType: string;             // "streaming_chat", "background_task", "proactive"
  eventType: 'started' | 'state_transition' | 'completed' | 'failed';
  eventData?: {                  // Type-specific data
    previousState?: string;      // For state_transition
    newState?: string;           // For state_transition
    resultSize?: number;         // For completed
    errorCode?: string;          // For failed
  };
  parentAgentId?: string;        // Parent agent if spawned
  depth: number;                 // Nesting depth (0 for root)
  duration?: number;             // Milliseconds
  success?: boolean;             // For completed/failed
  errorMessage?: string;         // For failed
}
```

**Tool Execution Event Schema:**

```typescript
interface ToolExecutionEvent {
  id: string;                    // UUID
  timestamp: string;             // ISO 8601
  sessionId: string;             // Session UUID
  agentId?: string;              // Agent that invoked tool
  executionId: string;           // Unique execution UUID
  toolName: string;              // "Bash", "Read", "Write", "Edit", etc.
  toolInput: {                   // Sanitized input parameters
    [key: string]: any;
  };
  filePath?: string;             // For file operations (truncated)
  startTime: number;             // Unix timestamp (ms)
  endTime?: number;              // Unix timestamp (ms)
  duration?: number;             // Milliseconds
  success?: boolean;             // true/false after completion
  errorCode?: string;            // "timeout", "permission_denied", etc.
  errorMessage?: string;         // Error description
  outputSize?: number;           // Bytes (for Bash, Read)
  exitCode?: number;             // For Bash commands
}
```

**Prompt Analytics Event Schema:**

```typescript
interface PromptAnalyticsEvent {
  id: string;                    // UUID
  timestamp: string;             // ISO 8601
  sessionId: string;             // Session UUID
  promptId: string;              // Unique prompt UUID
  promptText: string;            // Truncated to 500 chars, sanitized
  promptLength: number;          // Original character count
  estimatedTokens: number;       // Token count estimate
  actualTokens?: number;         // Actual tokens (after processing)
  promptType: 'chat' | 'code_generation' | 'code_analysis' | 'debugging' | 'documentation' | 'other';
  latency?: number;              // Time to first response token (ms)
  ttfb?: number;                 // Time to first byte (ms)
}
```

**Progress Event Schema:**

```typescript
interface ProgressEvent {
  id: string;                    // UUID
  timestamp: string;             // ISO 8601
  sessionId: string;             // Session UUID
  workflowId: string;            // Workflow UUID
  estimatedSteps: number;        // Total steps
  currentStep: number;           // Current step index
  stepDescription: string;       // Human-readable description
  percentage: number;            // 0-100
  estimatedSecondsRemaining?: number; // ETA
  confidence?: number;           // 0.0-1.0 confidence in ETA
}
```

**Session Metrics Schema:**

```typescript
interface SessionMetrics {
  id: string;                    // UUID
  sessionId: string;             // Session UUID (unique)
  createdAt: string;             // ISO 8601
  lastActivityAt: string;        // ISO 8601
  terminatedAt?: string;         // ISO 8601 (if terminated)
  duration: number;              // Seconds
  requestCount: number;          // Total requests in session
  totalCost: number;             // USD
  totalTokens: number;           // Sum of input + output
  inputTokens: number;
  outputTokens: number;
  cacheReadTokens: number;
  cacheCreationTokens: number;
  agentCount: number;            // Agents spawned in session
  toolExecutionCount: number;    // Tools executed in session
  errorCount: number;            // Errors in session
}
```

**Performance Metrics Schema:**

```typescript
interface PerformanceMetrics {
  id: string;                    // UUID
  timestamp: string;             // ISO 8601
  metricType: 'latency' | 'throughput' | 'error_rate' | 'cache_hit_rate';
  metricValue: number;           // Primary metric value
  metricData: {                  // Detailed breakdown
    p50?: number;                // For latency
    p95?: number;                // For latency
    p99?: number;                // For latency
    requestsPerHour?: number;    // For throughput
    errorPercentage?: number;    // For error_rate
    cacheHitPercentage?: number; // For cache_hit_rate
    sampleSize?: number;         // Number of data points
  };
  windowSize: '1h' | '24h' | '7d' | '30d'; // Aggregation window
}
```

### 7.2 API Response Schemas

**GET /api/telemetry/agents/active**

```json
{
  "success": true,
  "data": {
    "activeAgents": [
      {
        "agentId": "agent-123",
        "agentName": "claude-code-agent",
        "agentType": "streaming_chat",
        "state": "executing",
        "sessionId": "sess-456",
        "startedAt": "2025-10-25T10:30:00Z",
        "duration": 45000,
        "currentTool": "Read",
        "parentAgentId": null,
        "depth": 0
      }
    ],
    "totalActive": 1,
    "totalToday": 23,
    "averageDuration": 12500
  },
  "timestamp": "2025-10-25T10:30:45Z"
}
```

**GET /api/telemetry/tools/executions?sessionId=sess-456**

```json
{
  "success": true,
  "data": {
    "executions": [
      {
        "executionId": "exec-789",
        "toolName": "Read",
        "filePath": "src/api/.../claude-code-sdk.js",
        "startTime": 1729854600000,
        "endTime": 1729854600120,
        "duration": 120,
        "success": true,
        "outputSize": 45600
      },
      {
        "executionId": "exec-790",
        "toolName": "Bash",
        "command": "npm test",
        "startTime": 1729854600500,
        "duration": 3400,
        "success": true,
        "exitCode": 0
      }
    ],
    "totalExecutions": 2,
    "averageDuration": 1760,
    "successRate": 100.0
  },
  "timestamp": "2025-10-25T10:30:45Z"
}
```

**GET /api/telemetry/session/:sessionId/metrics**

```json
{
  "success": true,
  "data": {
    "sessionId": "sess-456",
    "duration": 180,
    "requestCount": 5,
    "totalCost": 0.0425,
    "totalTokens": 12500,
    "tokenBreakdown": {
      "inputTokens": 8000,
      "outputTokens": 4500,
      "cacheReadTokens": 2000,
      "cacheCreationTokens": 3000
    },
    "agentCount": 2,
    "toolExecutionCount": 12,
    "errorCount": 0,
    "cacheHitRate": 25.0,
    "costSavings": 0.0054,
    "createdAt": "2025-10-25T10:27:00Z",
    "lastActivityAt": "2025-10-25T10:30:00Z"
  },
  "timestamp": "2025-10-25T10:30:45Z"
}
```

**GET /api/telemetry/performance?window=24h**

```json
{
  "success": true,
  "data": {
    "latency": {
      "p50": 850,
      "p95": 2400,
      "p99": 4200,
      "sampleSize": 456
    },
    "throughput": {
      "requestsPerHour": 38.5,
      "peakHour": 14,
      "peakRequests": 67
    },
    "errorRate": {
      "percentage": 2.3,
      "totalErrors": 11,
      "totalRequests": 478,
      "errorsByType": {
        "timeout": 6,
        "rate_limit": 3,
        "invalid_request": 2
      }
    },
    "cacheHitRate": {
      "percentage": 42.5,
      "savedCost": 1.23,
      "savedTokens": 245000
    }
  },
  "window": "24h",
  "timestamp": "2025-10-25T10:30:45Z"
}
```

**GET /api/telemetry/health**

```json
{
  "success": true,
  "health": {
    "status": "healthy",
    "lastEventTime": "2025-10-25T10:30:44Z",
    "timeSinceLastEvent": 1000,
    "eventBufferSize": 234,
    "maxBufferSize": 1000,
    "bufferUtilization": 23.4,
    "eventsPerSecond": 3.2,
    "databaseWriteLatency": 8,
    "sseConnectionCount": 5,
    "errorRate": 0.02,
    "uptime": 86400,
    "memoryUsage": {
      "heapUsed": 45000000,
      "heapTotal": 120000000,
      "external": 5000000
    }
  },
  "recommendations": [
    "System operating normally",
    "Cache hit rate above target (42.5%)"
  ],
  "timestamp": "2025-10-25T10:30:45Z"
}
```

---

## 8. Event Types

### 8.1 Event Taxonomy

**Agent Events:**
- `agent_created` - Agent instance created
- `agent_started` - Agent begins execution
- `agent_thinking` - Agent analyzing/planning
- `agent_executing` - Agent performing actions
- `agent_idle` - Agent waiting (>5 min no activity)
- `agent_completed` - Agent finished successfully
- `agent_failed` - Agent encountered fatal error
- `agent_spawned_child` - Agent created sub-agent

**Tool Events:**
- `tool_execution_start` - Tool invocation begins
- `tool_execution_progress` - Tool execution update (for long-running)
- `tool_execution_complete` - Tool finished successfully
- `tool_execution_failed` - Tool encountered error
- `tool_output_received` - Tool produced output

**Prompt Events:**
- `prompt_received` - User prompt received
- `prompt_analyzed` - Prompt classification complete
- `prompt_tokens_estimated` - Token count estimated
- `prompt_response_started` - First token generated
- `prompt_response_complete` - Full response generated

**Progress Events:**
- `workflow_started` - Multi-step operation begins
- `workflow_step_start` - Step begins
- `workflow_step_complete` - Step finishes
- `workflow_progress_update` - Progress percentage updated
- `workflow_completed` - All steps finished
- `workflow_failed` - Workflow encountered error

**Session Events:**
- `session_created` - New session initialized
- `session_request` - Request received in session
- `session_metrics_updated` - Session metrics recalculated
- `session_idle` - Session inactive >30 minutes
- `session_terminated` - Session explicitly closed

**Performance Events:**
- `latency_measurement` - Request latency recorded
- `throughput_calculated` - Requests/hour calculated
- `error_detected` - Error occurred
- `cache_hit` - Prompt cache utilized
- `performance_threshold_exceeded` - Metric exceeds SLA

**System Events:**
- `telemetry_buffer_full` - Event buffer at capacity
- `telemetry_database_error` - Database write failed
- `telemetry_degraded` - System under high load
- `telemetry_recovered` - System returned to normal

### 8.2 Event Priority Mapping

| Event Type | Priority | Reasoning |
|------------|----------|-----------|
| `agent_failed` | `critical` | Requires immediate attention |
| `tool_execution_failed` | `critical` | Indicates broken workflow |
| `session_terminated` | `high` | Important for cost tracking |
| `agent_completed` | `high` | Workflow completion signal |
| `prompt_received` | `high` | User interaction start |
| `workflow_progress_update` | `medium` | Nice-to-have visibility |
| `tool_execution_start` | `medium` | Debugging aid |
| `agent_thinking` | `low` | Verbose, low value |
| `cache_hit` | `low` | Informational only |

### 8.3 Event Payload Examples

**agent_started:**
```json
{
  "type": "agent_started",
  "data": {
    "agentId": "agent-abc-123",
    "agentName": "claude-code-agent",
    "agentType": "streaming_chat",
    "sessionId": "sess-xyz-456",
    "parentAgentId": null,
    "depth": 0,
    "timestamp": 1729854600000
  },
  "priority": "high",
  "timestamp": "2025-10-25T10:30:00Z"
}
```

**tool_execution_complete:**
```json
{
  "type": "tool_execution_complete",
  "data": {
    "executionId": "exec-def-789",
    "toolName": "Read",
    "filePath": "src/.../file.js",
    "duration": 120,
    "success": true,
    "outputSize": 45600,
    "agentId": "agent-abc-123",
    "sessionId": "sess-xyz-456",
    "timestamp": 1729854600120
  },
  "priority": "medium",
  "timestamp": "2025-10-25T10:30:00.120Z"
}
```

**prompt_analyzed:**
```json
{
  "type": "prompt_analyzed",
  "data": {
    "promptId": "prompt-ghi-101",
    "promptText": "Create a REST API with Express...",
    "promptLength": 87,
    "estimatedTokens": 45,
    "promptType": "code_generation",
    "sessionId": "sess-xyz-456",
    "timestamp": 1729854599950
  },
  "priority": "high",
  "timestamp": "2025-10-25T10:29:59.950Z"
}
```

**workflow_progress_update:**
```json
{
  "type": "workflow_progress_update",
  "data": {
    "workflowId": "workflow-jkl-202",
    "currentStep": 3,
    "estimatedSteps": 7,
    "percentage": 42.8,
    "stepDescription": "Writing unit tests...",
    "estimatedSecondsRemaining": 45,
    "confidence": 0.75,
    "sessionId": "sess-xyz-456",
    "timestamp": 1729854605000
  },
  "priority": "medium",
  "timestamp": "2025-10-25T10:30:05Z"
}
```

**session_metrics_updated:**
```json
{
  "type": "session_metrics_updated",
  "data": {
    "sessionId": "sess-xyz-456",
    "duration": 180,
    "requestCount": 5,
    "totalCost": 0.0425,
    "totalTokens": 12500,
    "cacheHitRate": 25.0,
    "errorCount": 0,
    "timestamp": 1729854780000
  },
  "priority": "high",
  "timestamp": "2025-10-25T10:33:00Z"
}
```

---

## 9. API Endpoints

### 9.1 Agent Endpoints

**GET /api/telemetry/agents/active**
- **Description:** Get all currently active agents
- **Response:** `{ success, data: { activeAgents, totalActive, totalToday, averageDuration }, timestamp }`
- **Use Case:** Real-time agent monitoring dashboard

**GET /api/telemetry/agents/:agentId**
- **Description:** Get details for specific agent
- **Response:** `{ success, data: { agent, events, toolExecutions, metrics }, timestamp }`
- **Use Case:** Agent execution drill-down

**GET /api/telemetry/agents/:agentId/hierarchy**
- **Description:** Get agent parent-child relationships
- **Response:** `{ success, data: { agent, children, parent, depth }, timestamp }`
- **Use Case:** Multi-agent workflow visualization

### 9.2 Tool Endpoints

**GET /api/telemetry/tools/executions**
- **Description:** Get recent tool executions
- **Query Params:** `?sessionId=X&toolName=Y&limit=100&offset=0`
- **Response:** `{ success, data: { executions, totalExecutions, averageDuration }, timestamp }`
- **Use Case:** Tool usage analysis

**GET /api/telemetry/tools/:toolName/metrics**
- **Description:** Get aggregated metrics for specific tool
- **Response:** `{ success, data: { toolName, executionCount, averageDuration, successRate, errorsByType }, timestamp }`
- **Use Case:** Tool performance optimization

### 9.3 Prompt Endpoints

**GET /api/telemetry/prompts/analytics**
- **Description:** Get prompt analytics
- **Query Params:** `?sessionId=X&promptType=Y&startDate=Z&endDate=W`
- **Response:** `{ success, data: { prompts, averageLatency, promptTypeDistribution, tokenUsage }, timestamp }`
- **Use Case:** Prompt pattern analysis

**GET /api/telemetry/prompts/:promptId**
- **Description:** Get specific prompt details
- **Response:** `{ success, data: { prompt, response, latency, tokenUsage }, timestamp }`
- **Use Case:** Individual prompt investigation

### 9.4 Session Endpoints

**GET /api/telemetry/sessions/active**
- **Description:** Get all active sessions
- **Response:** `{ success, data: { activeSessions, totalActive, totalCost, totalTokens }, timestamp }`
- **Use Case:** Real-time session monitoring

**GET /api/telemetry/sessions/:sessionId/metrics**
- **Description:** Get comprehensive session metrics
- **Response:** `{ success, data: { sessionId, duration, requestCount, totalCost, tokenBreakdown, agents, tools }, timestamp }`
- **Use Case:** Session cost and performance analysis

**GET /api/telemetry/sessions/:sessionId/timeline**
- **Description:** Get chronological event timeline for session
- **Response:** `{ success, data: { sessionId, timeline: [events], startTime, endTime }, timestamp }`
- **Use Case:** Debugging session execution

### 9.5 Performance Endpoints

**GET /api/telemetry/performance**
- **Description:** Get performance metrics
- **Query Params:** `?window=24h&metricType=latency`
- **Response:** `{ success, data: { latency, throughput, errorRate, cacheHitRate }, timestamp }`
- **Use Case:** Performance dashboard

**GET /api/telemetry/performance/trends**
- **Description:** Get performance trends over time
- **Query Params:** `?window=7d&granularity=1h`
- **Response:** `{ success, data: { timeSeries: [...], trend, forecast }, timestamp }`
- **Use Case:** Performance trend analysis

### 9.6 System Endpoints

**GET /api/telemetry/health**
- **Description:** Get telemetry system health
- **Response:** `{ success, health: { status, lastEventTime, bufferSize, errorRate, uptime }, recommendations, timestamp }`
- **Use Case:** System health monitoring

**GET /api/telemetry/metrics**
- **Description:** Get telemetry system metrics
- **Response:** `{ success, data: { eventsPerSecond, bufferUtilization, databaseLatency, memoryUsage }, timestamp }`
- **Use Case:** Telemetry system observability

**POST /api/telemetry/export**
- **Description:** Export telemetry data
- **Body:** `{ startDate, endDate, eventTypes, format: 'json' | 'csv' }`
- **Response:** Data file or streaming response
- **Use Case:** Data export for external analysis

---

## 10. Success Metrics

### 10.1 Key Performance Indicators (KPIs)

**Telemetry Coverage:**
- **Metric:** % of SDK executions with telemetry
- **Target:** ≥99%
- **Measurement:** `(executionsWithTelemetry / totalExecutions) * 100`

**Real-time Delivery:**
- **Metric:** SSE event delivery latency (p95)
- **Target:** <50ms
- **Measurement:** Time from event creation to client receipt

**Data Quality:**
- **Metric:** % of events with complete required fields
- **Target:** ≥98%
- **Measurement:** Schema validation pass rate

**System Overhead:**
- **Metric:** Telemetry overhead as % of request time
- **Target:** <5%
- **Measurement:** `(telemetryTime / totalRequestTime) * 100`

**Database Write Success:**
- **Metric:** % of telemetry writes succeeding
- **Target:** ≥99.5%
- **Measurement:** `(successfulWrites / totalWrites) * 100`

### 10.2 Business Metrics

**Cost Visibility:**
- **Metric:** Time to detect budget overrun
- **Target:** <5 minutes
- **Measurement:** Time from threshold breach to alert

**Debugging Efficiency:**
- **Metric:** Time to identify root cause with telemetry
- **Target:** 50% reduction vs. without telemetry
- **Measurement:** Average debugging time

**User Satisfaction:**
- **Metric:** User rating of system visibility
- **Target:** ≥4.5/5.0
- **Measurement:** User survey

**Uptime:**
- **Metric:** Telemetry system availability
- **Target:** ≥99.9%
- **Measurement:** Uptime monitoring

### 10.3 Acceptance Criteria Summary

| ID | Criterion | Target | Measurement |
|----|-----------|--------|-------------|
| **AC-1** | Agent lifecycle tracking | 100% of agents | All agents emit start/complete events |
| **AC-2** | Tool execution tracking | 100% of tool calls | All tool invocations tracked |
| **AC-3** | Prompt analytics | ≥95% of prompts | Prompts sanitized and analyzed |
| **AC-4** | Progress tracking | ≥80% of multi-step | Workflows show progress |
| **AC-5** | Session metrics | 100% of sessions | Sessions tracked end-to-end |
| **AC-6** | Performance metrics | p50/p95/p99 calculated | Percentiles accurate |
| **AC-7** | SSE broadcasting | <50ms latency (p95) | Events arrive in real-time |
| **AC-8** | Database writes | ≥99.5% success | Writes reliable |
| **AC-9** | Telemetry overhead | <5% request time | Minimal performance impact |
| **AC-10** | Data privacy | 0 leaked secrets | Sanitization effective |

---

## 11. Risks and Mitigations

### 11.1 Technical Risks

**Risk 1: Performance Degradation**
- **Description:** Telemetry overhead slows down SDK execution
- **Probability:** Medium
- **Impact:** High
- **Mitigation:**
  - Asynchronous event emission
  - Fire-and-forget database writes
  - Performance testing with realistic load
  - Circuit breaker for telemetry failures
- **Monitoring:** Track p99 latency with telemetry enabled vs. disabled

**Risk 2: Memory Leaks**
- **Description:** Event buffers grow unbounded, consuming memory
- **Probability:** Low
- **Impact:** Critical
- **Mitigation:**
  - Fixed-size circular buffers (max 1000 events)
  - Automatic buffer rotation
  - Memory usage monitoring
  - Graceful degradation when memory constrained
- **Monitoring:** Heap usage metrics, buffer size alerts

**Risk 3: Database Write Failures**
- **Description:** Database unavailable, analytics lost
- **Probability:** Low
- **Impact:** Medium
- **Mitigation:**
  - In-memory event buffering during outage
  - Automatic retry with exponential backoff
  - Write-ahead logging
  - Alert on prolonged write failures
- **Monitoring:** Database write success rate, retry counts

**Risk 4: SSE Connection Overload**
- **Description:** Too many concurrent SSE clients, server overwhelmed
- **Probability:** Low
- **Impact:** Medium
- **Mitigation:**
  - Connection limit (max 100 concurrent)
  - Priority-based event filtering
  - Connection pooling
  - Load shedding for low-priority events
- **Monitoring:** SSE connection count, event drop rate

**Risk 5: Sensitive Data Leakage**
- **Description:** API keys, passwords in telemetry logs
- **Probability:** Medium
- **Impact:** Critical
- **Mitigation:**
  - Comprehensive regex sanitization
  - Prompt text truncation (500 chars max)
  - File path truncation
  - Security audit of telemetry output
- **Monitoring:** Automated scanning for sensitive patterns

### 11.2 Operational Risks

**Risk 6: Schema Evolution Breaks Clients**
- **Description:** Database schema changes break existing queries
- **Probability:** Medium
- **Impact:** Medium
- **Mitigation:**
  - Add new fields only, never remove
  - Versioned API endpoints
  - Backward compatibility testing
  - Deprecation warnings with 30-day notice
- **Monitoring:** API error rates after deployments

**Risk 7: Telemetry Blind Spots**
- **Description:** Some code paths don't emit telemetry
- **Probability:** Medium
- **Impact:** Medium
- **Mitigation:**
  - Code coverage analysis for telemetry calls
  - Integration tests verify all paths emit events
  - Centralized event emitter enforces consistency
  - Quarterly telemetry audit
- **Monitoring:** Telemetry coverage metrics

**Risk 8: Alert Fatigue**
- **Description:** Too many low-value alerts, team ignores them
- **Probability:** High
- **Impact:** Low
- **Mitigation:**
  - Careful alert threshold tuning
  - Priority-based alert routing
  - Alert aggregation (don't spam for each event)
  - Weekly alert review and refinement
- **Monitoring:** Alert response time, false positive rate

### 11.3 Business Risks

**Risk 9: Cost of Telemetry Storage**
- **Description:** Telemetry data volume exceeds budget
- **Probability:** Low
- **Impact:** Low
- **Mitigation:**
  - Data retention policy (90 days for raw events)
  - Aggregation reduces storage needs
  - Compression for historical data
  - Cost monitoring dashboard
- **Monitoring:** Storage growth rate, monthly costs

**Risk 10: Privacy Compliance**
- **Description:** Telemetry violates GDPR/privacy regulations
- **Probability:** Low
- **Impact:** High
- **Mitigation:**
  - No personally identifiable information (PII) in telemetry
  - User consent mechanism
  - Data deletion API for right-to-be-forgotten
  - Legal review of telemetry policy
- **Monitoring:** Privacy audit trail

---

## 12. Acceptance Criteria

### 12.1 Functional Acceptance Criteria

**AC-F1: Agent Lifecycle Tracking**
- [ ] Agent start event emitted when agent begins execution
- [ ] Agent state transitions tracked (created → thinking → executing → completed)
- [ ] Agent completion event includes duration and success status
- [ ] Agent failure event includes error message and stack trace
- [ ] Agent hierarchy captured when agents spawn sub-agents
- [ ] All agent events queryable via API

**AC-F2: Tool Execution Monitoring**
- [ ] Tool execution start event emitted for all tool invocations
- [ ] Tool execution complete event includes duration and success
- [ ] File paths captured for Read, Write, Edit operations (truncated)
- [ ] Bash command output size tracked
- [ ] Tool errors categorized correctly
- [ ] Tool execution metrics queryable via API

**AC-F3: Prompt Analytics**
- [ ] User prompts captured with sanitization
- [ ] Prompt token length estimated accurately (±10%)
- [ ] Prompt type classified (chat, code_generation, etc.)
- [ ] Prompt-to-response latency measured (±10ms)
- [ ] Prompt analytics queryable via API

**AC-F4: Progress Tracking**
- [ ] Multi-step workflows detected automatically
- [ ] Progress percentage calculated and updated in real-time
- [ ] Current step description displayed
- [ ] ETA estimated for long-running operations
- [ ] Step success/failure tracked

**AC-F5: Session Metrics**
- [ ] Sessions created with unique session ID
- [ ] Session duration calculated accurately
- [ ] Requests per session counted correctly
- [ ] Cost per session aggregated from token usage
- [ ] Session termination detected (explicit or timeout)

**AC-F6: Performance Metrics**
- [ ] Latency percentiles (p50, p95, p99) calculated correctly
- [ ] Throughput measured (requests per hour)
- [ ] Error rate calculated as percentage
- [ ] Cache hit rate tracked from token analytics
- [ ] Error types distributed and counted

**AC-F7: Real-time Broadcasting**
- [ ] Events broadcast via SSE within 50ms (p95)
- [ ] Priority filtering works (clients receive only subscribed priorities)
- [ ] Event history buffer maintains last 1000 events
- [ ] SSE reconnection works without event loss
- [ ] All connected clients receive events

### 12.2 Non-Functional Acceptance Criteria

**AC-NF1: Performance**
- [ ] Telemetry overhead <5% of request time (p99)
- [ ] SSE broadcast latency <50ms (p95)
- [ ] Database writes complete asynchronously (don't block API)
- [ ] System supports 100+ concurrent sessions
- [ ] Memory usage <100MB for telemetry buffers

**AC-NF2: Reliability**
- [ ] Telemetry failures don't block SDK execution
- [ ] Database write failures retry automatically (max 3 retries)
- [ ] Events buffered during database outage (max 10,000 events)
- [ ] System degrades gracefully under high load
- [ ] Data integrity validated before database writes

**AC-NF3: Security**
- [ ] Sensitive data redacted from prompts (API keys, passwords)
- [ ] File paths truncated to 100 characters
- [ ] Telemetry endpoints require authentication
- [ ] Rate limiting enforced (100 req/min per API key)
- [ ] Access to sensitive telemetry logged in audit trail

**AC-NF4: Scalability**
- [ ] System handles 10,000+ events per hour
- [ ] Telemetry queries return within 500ms
- [ ] High-volume metrics pre-aggregated (hourly)
- [ ] Logs rotate automatically (daily, 30-day retention)
- [ ] System supports horizontal scaling (stateless design)

**AC-NF5: Observability**
- [ ] Health check endpoint responds within 100ms
- [ ] Telemetry system tracks its own metrics
- [ ] Errors logged with ERROR level and visible in logs
- [ ] Data quality validated (schema compliance)
- [ ] Debug mode available for troubleshooting

**AC-NF6: Maintainability**
- [ ] Telemetry components modular and testable independently
- [ ] Telemetry doesn't pollute SDK business logic
- [ ] All APIs documented with JSDoc + README
- [ ] Schema changes backward compatible
- [ ] Test coverage ≥80%

**AC-NF7: Usability**
- [ ] Dashboard updates without page refresh (SSE)
- [ ] Agent status visually clear (color-coded badges)
- [ ] Activity feed filterable by agent, tool, session, priority
- [ ] Telemetry data exportable (JSON, CSV)
- [ ] Dashboard responsive on mobile (≥375px width)

### 12.3 Integration Acceptance Criteria

**AC-I1: Claude Code SDK Integration**
- [ ] Telemetry integrated into `claude-code-sdk.js` routes
- [ ] All SDK tool invocations emit telemetry events
- [ ] Agent spawning tracked (Task tool integration)
- [ ] Token analytics integrated with existing TokenAnalyticsWriter
- [ ] Session IDs consistent across telemetry and analytics

**AC-I2: SSE Broadcasting Integration**
- [ ] Uses existing `broadcastToSSE()` function
- [ ] Integrates with existing SSE connection management
- [ ] Event format compatible with existing SSE clients
- [ ] Event history accessible via existing API
- [ ] SSE reconnection uses existing infrastructure

**AC-I3: Database Integration**
- [ ] New tables created via migration script
- [ ] Integrates with existing database connection
- [ ] Uses existing database error handling
- [ ] Indexes created for query performance
- [ ] Compatible with existing backup/restore processes

**AC-I4: WebSocket Integration**
- [ ] Integrates with ActivityBroadcaster if used
- [ ] Compatible with existing WebSocket infrastructure
- [ ] Event format consistent with WebSocket conventions
- [ ] Connection management uses existing patterns

### 12.4 Testing Acceptance Criteria

**AC-T1: Unit Tests**
- [ ] TelemetryEventEmitter unit tests (100% coverage)
- [ ] AgentLifecycleTracker unit tests
- [ ] ToolExecutionMonitor unit tests
- [ ] PromptAnalyzer unit tests
- [ ] SessionMetricsAggregator unit tests
- [ ] All tests pass in CI pipeline

**AC-T2: Integration Tests**
- [ ] End-to-end telemetry flow tested
- [ ] Database write/read tested
- [ ] SSE broadcasting tested
- [ ] Event filtering tested
- [ ] Error handling tested

**AC-T3: Performance Tests**
- [ ] Load test with 100 concurrent sessions
- [ ] Sustained load test (10,000 events/hour for 1 hour)
- [ ] SSE latency tested (p95 <50ms)
- [ ] Memory leak tested (24-hour soak test)
- [ ] Database query performance tested

**AC-T4: Security Tests**
- [ ] Sensitive data sanitization tested
- [ ] Authentication/authorization tested
- [ ] Rate limiting tested
- [ ] Input validation tested
- [ ] No secrets in telemetry output (automated scan)

---

## 13. Appendices

### 13.1 Glossary

| Term | Definition |
|------|------------|
| **Agent** | Autonomous AI entity executing tasks via Claude Code SDK |
| **Cache Tokens** | Tokens reused from prompt caching (90% cost discount) |
| **Event Emitter** | Component that generates and broadcasts telemetry events |
| **P50/P95/P99** | 50th, 95th, 99th percentile latency measurements |
| **Sanitization** | Process of removing sensitive data (API keys, passwords) |
| **Session** | Logical grouping of related requests with unique ID |
| **SSE** | Server-Sent Events - unidirectional real-time push protocol |
| **Telemetry** | Automated collection and transmission of system metrics |
| **Tool** | SDK function for file operations, bash, search, etc. |
| **Workflow** | Multi-step operation requiring multiple tool executions |

### 13.2 Related Documents

- **SPARC-ANALYTICS-FIX-SPEC.md** - Token analytics fix specification
- **SPARC-CACHE-TOKEN-FIX-SPEC.md** - Cache token tracking specification
- **CLAUDE-CODE-SDK-ANALYTICS-FIX-SUMMARY.md** - Analytics implementation summary
- **CACHE-TOKEN-TRACKING-FIX-COMPLETE.md** - Cache token implementation report

### 13.3 References

- **Claude Code SDK Documentation:** https://docs.anthropic.com/claude/docs/claude-code
- **Server-Sent Events Spec:** https://html.spec.whatwg.org/multipage/server-sent-events.html
- **OpenTelemetry:** https://opentelemetry.io/ (industry standard for telemetry)
- **better-sqlite3 Documentation:** https://github.com/WiseLibs/better-sqlite3

### 13.4 Change Log

| Version | Date | Author | Changes |
|---------|------|--------|---------|
| 1.0.0 | 2025-10-25 | Engineering Team | Initial specification |

### 13.5 Approval

| Role | Name | Signature | Date |
|------|------|-----------|------|
| Engineering Lead | - | - | - |
| Product Manager | - | - | - |
| Security Review | - | - | - |
| Architecture Review | - | - | - |

---

**End of Specification**

---

## Next Steps

1. **Review & Approval** - Stakeholder review of this specification
2. **Architecture Design** - Detailed component design (SPARC Architecture phase)
3. **Pseudocode** - Algorithm pseudocode for key components (SPARC Pseudocode phase)
4. **TDD Implementation** - Test-driven development (SPARC Refinement phase)
5. **Integration** - Integration with existing systems (SPARC Completion phase)
6. **Deployment** - Staged rollout with monitoring
7. **Documentation** - User-facing documentation and API docs
