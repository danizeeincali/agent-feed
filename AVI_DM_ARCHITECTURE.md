# Avi DM Long-Running Request Architecture

**Version:** 1.0.0
**Date:** October 1, 2025
**Status:** Production Architecture Specification
**Author:** SPARC Architecture Agent

---

## Executive Summary

This document defines the architecture for handling long-running Claude Code requests in the Avi DM chat interface, addressing timeout issues in both development (Vite proxy) and production environments. Claude Code responses typically take 5-60 seconds, with variable performance (15-17 seconds observed baseline).

**Key Challenge:** Current 10-second Vite proxy timeout causes Avi DM chat failures.

**Recommended Solution:** HTTP Long-Polling with progressive timeout architecture (Option 1)

---

## Table of Contents

1. [Architecture Overview](#architecture-overview)
2. [Current State Analysis](#current-state-analysis)
3. [Solution Architecture](#solution-architecture)
4. [Timeout Strategy](#timeout-strategy)
5. [Loading States & UX](#loading-states--ux)
6. [Error Handling](#error-handling)
7. [Alternative Approaches](#alternative-approaches)
8. [Production Considerations](#production-considerations)
9. [Implementation Plan](#implementation-plan)
10. [Configuration Matrix](#configuration-matrix)

---

## Architecture Overview

```
┌─────────────────────────────────────────────────────────────────┐
│                     AVI DM ARCHITECTURE                         │
├─────────────────────────────────────────────────────────────────┤
│                                                                 │
│  ┌───────────────┐         ┌──────────────┐         ┌────────┐│
│  │   Frontend    │◄───────►│  Vite Proxy  │◄───────►│ API    ││
│  │   (React)     │         │  (Dev Only)  │         │ Server ││
│  │               │         │              │         │(3001)  ││
│  │  - Loading UI │         │  10s timeout │         │        ││
│  │  - Abort      │         │  ↓ Increase  │         │ Claude ││
│  │  - Retry      │         │  60s timeout │         │ Code   ││
│  └───────────────┘         └──────────────┘         │ SDK    ││
│                                                      └────────┘│
│                                                                 │
│  Production: Frontend ◄──────────────────►  API Server         │
│                       (No Vite, Direct)                         │
└─────────────────────────────────────────────────────────────────┘
```

### System Components

1. **Frontend (React/TypeScript)**
   - AviDM chat interface
   - AviDMService.ts (service layer)
   - HttpClient with timeout handling
   - Progressive loading UI

2. **Development Proxy (Vite)**
   - HTTP proxy configuration
   - Timeout: 10s → 120s (recommended)
   - Environment: Development only

3. **API Server (Express)**
   - Claude Code SDK integration
   - Long-running request handler
   - Streaming ticker for status updates
   - Timeout: 300s (5 minutes)

4. **Claude Code SDK**
   - Variable response times (5-60s)
   - Tool execution capabilities
   - Token analytics

---

## Current State Analysis

### Current Flow

```
User Message
    ↓
AviDM Component
    ↓
AviDMService.sendMessage()
    ↓
HttpClient.post('/api/claude-code/streaming-chat')
    ↓
Vite Proxy [10s timeout] ❌ FAILURE POINT
    ↓
Express API Server [300s timeout]
    ↓
Claude Code SDK [5-60s processing]
    ↓
Response
```

### Identified Issues

1. **Vite Proxy Timeout (10s)**
   - Location: `vite.config.ts` line 36
   - Current: `timeout: 10000`
   - Problem: Claude Code takes 5-60s
   - Impact: Request fails before completion

2. **Frontend Service Timeout (5 minutes)**
   - Location: `AviDMService.ts` line 98
   - Current: `timeout: 300000`
   - Status: ✅ Appropriate for long operations

3. **No User Feedback During Wait**
   - No progressive loading indicators
   - No time estimates
   - No ability to cancel

4. **Error Recovery**
   - Basic error handling exists
   - No retry logic
   - No timeout-specific recovery

### Performance Baseline

```
Claude Code SDK Performance:
├── Minimum: 5s
├── Average: 15-17s
├── Maximum: 60s
└── P95: 30s (estimated)
```

---

## Solution Architecture

### Recommended: Progressive Timeout Architecture

```
┌─────────────────────────────────────────────────────────────────┐
│              PROGRESSIVE TIMEOUT ARCHITECTURE                   │
└─────────────────────────────────────────────────────────────────┘

Frontend Layer:
┌──────────────────────────────────────────────────────────────┐
│  User sends message                                          │
│    ↓                                                          │
│  Show loading: "Thinking..." (0-5s)                          │
│    ↓                                                          │
│  Update: "Processing with Claude..." (5-15s)                 │
│    ↓                                                          │
│  Update: "Still working... Claude Code is analyzing" (15-30s)│
│    ↓                                                          │
│  Update: "Almost done..." (30-60s)                           │
│    ↓                                                          │
│  [Show abort button after 15s]                               │
└──────────────────────────────────────────────────────────────┘

Network Layer:
┌──────────────────────────────────────────────────────────────┐
│  HTTP Request                                                 │
│    ↓                                                          │
│  Vite Proxy [120s timeout] ─────────────────────┐            │
│    ↓                                             │            │
│  API Server [300s timeout] ──────────────────┐  │            │
│    ↓                                          │  │            │
│  Claude Code SDK [5-60s processing]          │  │            │
│    ↓                                          │  │            │
│  Response ◄──────────────────────────────────┘  │            │
│    or                                            │            │
│  Timeout ◄───────────────────────────────────────┘            │
└──────────────────────────────────────────────────────────────┘

Error Recovery:
┌──────────────────────────────────────────────────────────────┐
│  Timeout at any layer                                         │
│    ↓                                                          │
│  Identify layer (proxy/server/claude)                        │
│    ↓                                                          │
│  Show appropriate error message                               │
│    ↓                                                          │
│  Offer retry with exponential backoff                         │
│    ↓                                                          │
│  Log for analytics                                            │
└──────────────────────────────────────────────────────────────┘
```

---

## Timeout Strategy

### Development Environment (Vite Proxy)

**vite.config.ts Configuration:**

```typescript
server: {
  proxy: {
    '/api': {
      target: 'http://127.0.0.1:3001',
      changeOrigin: true,
      secure: false,
      timeout: 120000, // 2 minutes (was 10s)
      proxyTimeout: 120000, // 2 minutes
      followRedirects: true,
      xfwd: true
    }
  }
}
```

**Rationale:**
- Claude Code P95 ≈ 30s
- 2-minute timeout provides 4x safety margin
- Balances user experience vs. hung requests
- Allows time for retries at lower layers

### Frontend Timeout Strategy

**AviDMService.ts Configuration:**

```typescript
// Current: 300000ms (5 minutes) ✅
timeout: config.timeout || 300000

// HttpClient per-request override
const response = await this.httpClient.post<ClaudeResponse>(
  '/api/claude-code/streaming-chat',
  { message, options },
  {
    timeout: 90000, // 90 seconds (1.5 minutes)
    onTimeout: (timeoutMs) => {
      // Progressive timeout handling
      this.emit('requestTimeout', {
        duration: timeoutMs,
        message: 'Request is taking longer than expected'
      });
    }
  }
);
```

### Backend Processing Limits

**API Server Configuration:**

```javascript
// Express server timeout (server.js)
const server = app.listen(PORT);
server.timeout = 300000; // 5 minutes

// Request-level timeout middleware
app.use('/api/claude-code', (req, res, next) => {
  req.setTimeout(180000); // 3 minutes per request
  res.setTimeout(180000);
  next();
});
```

### Timeout Hierarchy

```
┌─────────────────────────────────────────────────────────┐
│                 TIMEOUT HIERARCHY                       │
├─────────────────────────────────────────────────────────┤
│                                                         │
│  Layer 1: Frontend Abort (User-triggered)              │
│           Timeout: None (user controls)                │
│           Action: Cancel request via AbortController   │
│                                                         │
│  Layer 2: Frontend HTTP Timeout                        │
│           Timeout: 90 seconds                          │
│           Action: Show retry UI, log timeout           │
│                                                         │
│  Layer 3: Vite Proxy Timeout (Dev only)               │
│           Timeout: 120 seconds                         │
│           Action: HTTP 504 Gateway Timeout             │
│                                                         │
│  Layer 4: API Server Request Timeout                   │
│           Timeout: 180 seconds                         │
│           Action: Return 408 Request Timeout           │
│                                                         │
│  Layer 5: API Server Connection Timeout                │
│           Timeout: 300 seconds                         │
│           Action: Close socket, return 503             │
│                                                         │
└─────────────────────────────────────────────────────────┘

Progressive Timeouts: 90s → 120s → 180s → 300s
Each layer provides fallback for the next
```

---

## Loading States & UX

### Progressive Loading Indicator

```typescript
interface LoadingState {
  phase: 'initial' | 'processing' | 'analyzing' | 'finalizing';
  duration: number;
  message: string;
  showAbort: boolean;
  estimatedRemaining?: number;
}

// Loading state transitions
const loadingPhases: LoadingState[] = [
  {
    phase: 'initial',
    duration: 5000, // 0-5s
    message: '🤔 Thinking...',
    showAbort: false
  },
  {
    phase: 'processing',
    duration: 10000, // 5-15s
    message: '⚙️ Processing with Claude Code...',
    showAbort: false
  },
  {
    phase: 'analyzing',
    duration: 15000, // 15-30s
    message: '🔍 Claude is analyzing your request...',
    showAbort: true,
    estimatedRemaining: 30
  },
  {
    phase: 'finalizing',
    duration: 30000, // 30-60s
    message: '✨ Almost done, generating response...',
    showAbort: true,
    estimatedRemaining: 15
  }
];
```

### UI Components

**LoadingIndicator.tsx:**

```tsx
interface LoadingIndicatorProps {
  elapsed: number;
  onAbort?: () => void;
}

export const LoadingIndicator: React.FC<LoadingIndicatorProps> = ({
  elapsed,
  onAbort
}) => {
  const phase = getPhaseForElapsed(elapsed);
  const progress = calculateProgress(elapsed, phase.duration);

  return (
    <div className="loading-container">
      {/* Animated spinner */}
      <div className="spinner">
        <Loader2 className="animate-spin" />
      </div>

      {/* Phase message */}
      <p className="loading-message">{phase.message}</p>

      {/* Progress bar (after 5s) */}
      {elapsed > 5000 && (
        <div className="progress-bar">
          <div
            className="progress-fill"
            style={{ width: `${progress}%` }}
          />
        </div>
      )}

      {/* Time indicator (after 10s) */}
      {elapsed > 10000 && (
        <p className="time-indicator">
          {Math.floor(elapsed / 1000)}s elapsed
          {phase.estimatedRemaining &&
            ` • ~${phase.estimatedRemaining}s remaining`
          }
        </p>
      )}

      {/* Abort button (after 15s) */}
      {phase.showAbort && onAbort && (
        <button
          onClick={onAbort}
          className="abort-button"
        >
          Cancel Request
        </button>
      )}

      {/* Timeout warning (after 60s) */}
      {elapsed > 60000 && (
        <div className="warning">
          ⚠️ This is taking longer than usual.
          The request may time out soon.
        </div>
      )}
    </div>
  );
};
```

### Abort/Cancel Functionality

```typescript
// AviDMService enhancement
export class AviDMService {
  private activeRequests: Map<string, AbortController> = new Map();

  async sendMessage(
    message: string,
    options: SendMessageOptions = {}
  ): Promise<ClaudeResponse> {
    const requestId = this.generateRequestId();
    const abortController = new AbortController();

    // Store abort controller for this request
    this.activeRequests.set(requestId, abortController);

    try {
      const response = await this.httpClient.post<ClaudeResponse>(
        '/api/claude-code/streaming-chat',
        { message, options },
        {
          signal: abortController.signal,
          timeout: 90000
        }
      );

      return response;

    } catch (error) {
      if (error.name === 'AbortError') {
        throw new ClaudeCodeError(
          'Request cancelled by user',
          'USER_CANCELLED',
          { requestId }
        );
      }
      throw error;

    } finally {
      this.activeRequests.delete(requestId);
    }
  }

  /**
   * Cancel an in-flight request
   */
  cancelRequest(requestId: string): boolean {
    const controller = this.activeRequests.get(requestId);
    if (controller) {
      controller.abort();
      this.activeRequests.delete(requestId);
      return true;
    }
    return false;
  }

  /**
   * Cancel all in-flight requests
   */
  cancelAllRequests(): void {
    this.activeRequests.forEach(controller => controller.abort());
    this.activeRequests.clear();
  }
}
```

---

## Error Handling

### Timeout Error Classification

```typescript
enum TimeoutType {
  FRONTEND_TIMEOUT = 'FRONTEND_TIMEOUT',      // 90s - HttpClient timeout
  PROXY_TIMEOUT = 'PROXY_TIMEOUT',            // 120s - Vite proxy timeout
  SERVER_TIMEOUT = 'SERVER_TIMEOUT',          // 180s - API server timeout
  CLAUDE_TIMEOUT = 'CLAUDE_TIMEOUT',          // 60s+ - Claude processing timeout
  USER_CANCELLED = 'USER_CANCELLED'           // User abort
}

interface TimeoutError extends ClaudeCodeError {
  type: TimeoutType;
  elapsed: number;
  layer: 'frontend' | 'proxy' | 'server' | 'claude';
  recoverable: boolean;
  retryRecommended: boolean;
}
```

### Error Handling Flowchart

```
┌─────────────────────────────────────────────────────────┐
│              TIMEOUT ERROR HANDLER                      │
└─────────────────────────────────────────────────────────┘

Request Timeout Detected
    ↓
Identify Timeout Source
    ├─→ HTTP Error Code 408? → Server Timeout
    ├─→ HTTP Error Code 504? → Proxy Timeout
    ├─→ AbortError? → User Cancelled
    └─→ Network Timeout? → Frontend Timeout
    ↓
Classify Error Severity
    ├─→ < 60s: WARN (unexpected fast timeout)
    ├─→ 60-90s: INFO (expected timeout range)
    └─→ > 90s: ERROR (should not reach here)
    ↓
Determine Recovery Strategy
    ├─→ User Cancelled → No retry, log action
    ├─→ First attempt → Offer retry (0s delay)
    ├─→ Second attempt → Offer retry (5s delay)
    └─→ Third attempt → Show error, suggest support
    ↓
Update UI
    ├─→ Clear loading state
    ├─→ Show error message
    ├─→ Show retry button (if applicable)
    └─→ Log to analytics
    ↓
Emit Error Event
    └─→ this.emit('requestTimeout', errorDetails)
```

### Error Messages by Type

```typescript
const timeoutErrorMessages: Record<TimeoutType, ErrorMessage> = {
  FRONTEND_TIMEOUT: {
    title: 'Request Timeout',
    message: 'Your request took longer than expected (90s). Claude Code may be processing a complex task.',
    action: 'Retry Request',
    severity: 'warning',
    recoverable: true,
    retryDelay: 0
  },

  PROXY_TIMEOUT: {
    title: 'Gateway Timeout',
    message: 'The development proxy timed out after 2 minutes. This may indicate a hung request.',
    action: 'Retry Request',
    severity: 'error',
    recoverable: true,
    retryDelay: 5000
  },

  SERVER_TIMEOUT: {
    title: 'Server Timeout',
    message: 'The API server stopped responding after 3 minutes. This usually indicates a backend issue.',
    action: 'Report Issue',
    severity: 'error',
    recoverable: false,
    retryDelay: 10000
  },

  CLAUDE_TIMEOUT: {
    title: 'Claude Processing Timeout',
    message: 'Claude Code did not respond within the expected time. The task may be too complex.',
    action: 'Simplify Request',
    severity: 'warning',
    recoverable: true,
    retryDelay: 0,
    suggestions: [
      'Try breaking your request into smaller parts',
      'Check if Claude Code is still running',
      'Review recent streaming ticker messages'
    ]
  },

  USER_CANCELLED: {
    title: 'Request Cancelled',
    message: 'You cancelled the request.',
    action: null,
    severity: 'info',
    recoverable: false,
    retryDelay: 0
  }
};
```

### Retry Strategy

```typescript
interface RetryConfig {
  maxAttempts: number;
  backoffMultiplier: number;
  initialDelay: number;
  maxDelay: number;
  retryableErrors: string[];
}

class RetryHandler {
  private config: RetryConfig = {
    maxAttempts: 3,
    backoffMultiplier: 2,
    initialDelay: 1000,
    maxDelay: 30000,
    retryableErrors: [
      'FRONTEND_TIMEOUT',
      'PROXY_TIMEOUT',
      'NETWORK_ERROR'
    ]
  };

  async executeWithRetry<T>(
    operation: () => Promise<T>,
    context: { requestId: string; attempt: number }
  ): Promise<T> {
    let lastError: Error;

    for (let attempt = 1; attempt <= this.config.maxAttempts; attempt++) {
      try {
        // Attempt operation
        return await operation();

      } catch (error) {
        lastError = error as Error;

        // Check if error is retryable
        if (!this.isRetryable(error)) {
          throw error;
        }

        // Check if we've exhausted attempts
        if (attempt >= this.config.maxAttempts) {
          throw new Error(
            `Max retry attempts (${this.config.maxAttempts}) exceeded. ` +
            `Last error: ${lastError.message}`
          );
        }

        // Calculate backoff delay
        const delay = Math.min(
          this.config.initialDelay * Math.pow(this.config.backoffMultiplier, attempt - 1),
          this.config.maxDelay
        );

        // Log retry attempt
        console.warn(
          `Retry attempt ${attempt}/${this.config.maxAttempts} ` +
          `after ${delay}ms delay. Error: ${lastError.message}`
        );

        // Wait before retry
        await this.sleep(delay);
      }
    }

    throw lastError!;
  }

  private isRetryable(error: unknown): boolean {
    if (error instanceof ClaudeCodeError) {
      return this.config.retryableErrors.includes(error.code);
    }

    // Network errors are retryable
    if (error instanceof TypeError && error.message.includes('fetch')) {
      return true;
    }

    return false;
  }

  private sleep(ms: number): Promise<void> {
    return new Promise(resolve => setTimeout(resolve, ms));
  }
}
```

---

## Alternative Approaches

### Comparison Matrix

| Approach | Complexity | Real-time | Bandwidth | Dev Effort | Production Ready |
|----------|-----------|-----------|-----------|------------|------------------|
| **HTTP Long-Polling** (Recommended) | Low | No | Low | 1-2 days | ✅ Yes |
| Server-Sent Events (SSE) | Medium | Yes | Medium | 3-5 days | ✅ Yes |
| WebSocket Streaming | High | Yes | Medium | 5-7 days | ⚠️ Requires infra |
| Job Queue Pattern | High | No | Low | 7-10 days | ✅ Yes |
| HTTP/2 Server Push | Medium | Yes | Low | 5-7 days | ❌ No (deprecated) |

### Option 1: HTTP Long-Polling (Recommended) ⭐

**Architecture:**

```
Frontend                  API Server               Claude Code
   │                          │                         │
   │──── POST /chat ─────────►│                         │
   │    {message}              │                         │
   │                           │──── Execute ───────────►│
   │                           │                         │
   │ [Wait 90s max]            │ [Wait 180s max]        │ [Process 5-60s]
   │                           │                         │
   │                           │◄──── Response ──────────│
   │◄──── Response ────────────│                         │
   │    {content, metadata}    │                         │
   │                           │                         │
   │ [Timeout: retry]          │ [Timeout: 408]         │ [Timeout: error]
```

**Pros:**
- ✅ Simplest implementation (already exists)
- ✅ No infrastructure changes required
- ✅ Works in all environments
- ✅ Standard HTTP semantics
- ✅ Easy to test and debug

**Cons:**
- ❌ No real-time progress updates
- ❌ Ties up frontend during wait
- ❌ Limited to single request-response

**Implementation Changes:**
1. Update Vite config timeout: 10s → 120s
2. Add progressive loading UI
3. Add abort controller
4. Add retry logic

**Effort:** 1-2 days

---

### Option 2: Server-Sent Events (SSE)

**Architecture:**

```
Frontend                  API Server               Claude Code
   │                          │                         │
   │──── POST /chat ─────────►│                         │
   │    {message}              │                         │
   │                           │──── Execute ───────────►│
   │                           │                         │
   │◄─── SSE: "started" ───────│                         │
   │◄─── SSE: "thinking" ──────│                         │
   │◄─── SSE: "processing" ────│                         │ [Processing...]
   │◄─── SSE: "chunk" ─────────│◄─── Partial Result ────│
   │◄─── SSE: "chunk" ─────────│◄─── Partial Result ────│
   │◄─── SSE: "complete" ──────│◄─── Final Result ──────│
   │                           │                         │
   │ [Close SSE connection]    │                         │
```

**Pros:**
- ✅ Real-time progress updates
- ✅ Unidirectional (server → client)
- ✅ Built-in reconnection
- ✅ HTTP-based (firewall friendly)
- ✅ Streaming ticker already exists

**Cons:**
- ⚠️ Requires SSE implementation in AviDM
- ⚠️ Connection management complexity
- ⚠️ Browser compatibility (IE/Edge)

**Implementation:**

```typescript
// Frontend: SSE Consumer
class SSEChatClient {
  async sendMessage(message: string): Promise<void> {
    const requestId = generateId();

    // Initiate request
    await fetch('/api/claude-code/streaming-chat', {
      method: 'POST',
      body: JSON.stringify({ message, requestId })
    });

    // Open SSE connection for updates
    const eventSource = new EventSource(
      `/api/claude-code/stream/${requestId}`
    );

    eventSource.onmessage = (event) => {
      const data = JSON.parse(event.data);

      switch (data.type) {
        case 'status':
          this.updateLoadingMessage(data.message);
          break;
        case 'chunk':
          this.appendToResponse(data.content);
          break;
        case 'complete':
          this.finalizeResponse(data);
          eventSource.close();
          break;
        case 'error':
          this.handleError(data.error);
          eventSource.close();
          break;
      }
    };

    eventSource.onerror = () => {
      eventSource.close();
      this.handleConnectionError();
    };
  }
}
```

```javascript
// Backend: SSE Provider
router.post('/streaming-chat', async (req, res) => {
  const { message, requestId } = req.body;

  // Start processing asynchronously
  processClaudeRequest(message, requestId)
    .catch(error => {
      StreamingTickerManager.broadcast({
        type: 'error',
        requestId,
        error: error.message
      });
    });

  res.json({ success: true, requestId });
});

// SSE endpoint
router.get('/stream/:requestId', (req, res) => {
  const { requestId } = req.params;

  // Set SSE headers
  res.setHeader('Content-Type', 'text/event-stream');
  res.setHeader('Cache-Control', 'no-cache');
  res.setHeader('Connection', 'keep-alive');

  // Register client for this request
  StreamingTickerManager.registerClient(requestId, res);

  // Handle disconnect
  req.on('close', () => {
    StreamingTickerManager.unregisterClient(requestId, res);
  });
});
```

**Effort:** 3-5 days

---

### Option 3: WebSocket Streaming

**Architecture:**

```
Frontend                  API Server               Claude Code
   │                          │                         │
   │──── WS Connect ─────────►│                         │
   │                           │                         │
   │──── {type: "chat"} ──────►│                         │
   │     {message}             │                         │
   │                           │──── Execute ───────────►│
   │◄─── {type: "status"} ─────│                         │
   │     {status: "thinking"}  │                         │
   │◄─── {type: "chunk"} ──────│◄─── Partial ───────────│
   │     {content: "..."}      │                         │
   │◄─── {type: "chunk"} ──────│◄─── Partial ───────────│
   │     {content: "..."}      │                         │
   │◄─── {type: "complete"} ───│◄─── Complete ──────────│
   │     {content: "..."}      │                         │
```

**Pros:**
- ✅ True bidirectional communication
- ✅ Real-time updates
- ✅ Lowest latency
- ✅ Efficient for high-frequency updates
- ✅ WebSocketManager already exists

**Cons:**
- ❌ Complex connection management
- ❌ Load balancer compatibility issues
- ❌ Requires WebSocket infrastructure
- ❌ More difficult to debug
- ❌ Firewall/proxy challenges

**Implementation:**

```typescript
// Use existing WebSocketManager
await this.websocketManager.connect(this.config.websocketUrl);

// Send message
this.websocketManager.send({
  type: 'chat_request',
  data: {
    message,
    sessionId: this.currentSessionId
  }
});

// Handle responses
this.websocketManager.onMessage((message) => {
  switch (message.type) {
    case 'status':
      this.updateStatus(message.content);
      break;
    case 'chunk':
      this.appendChunk(message.content);
      break;
    case 'complete':
      this.finalize(message.content);
      break;
  }
});
```

**Effort:** 5-7 days (infrastructure + implementation)

---

### Option 4: Job Queue Pattern

**Architecture:**

```
Frontend                  API Server               Queue                Claude Code
   │                          │                       │                      │
   │──── POST /chat ─────────►│                       │                      │
   │    {message}              │                       │                      │
   │                           │──── Enqueue ─────────►│                      │
   │◄──── {jobId} ─────────────│                       │                      │
   │                           │                       │                      │
   │                           │                       │◄──── Dequeue ────────│
   │                           │                       │                      │
   │──── GET /status/{jobId} ─►│                       │                      │ [Processing]
   │◄──── {status:"pending"} ──│                       │                      │
   │                           │                       │                      │
   │──── GET /status/{jobId} ─►│                       │                      │
   │◄──── {status:"complete"}──│◄─── Update ───────────│◄─── Complete ───────│
   │                           │                       │                      │
   │──── GET /result/{jobId} ─►│                       │                      │
   │◄──── {content} ───────────│                       │                      │
```

**Pros:**
- ✅ Fully asynchronous
- ✅ Scalable to multiple workers
- ✅ Fault tolerant (can retry failed jobs)
- ✅ Decouples request from response
- ✅ No timeout issues

**Cons:**
- ❌ High complexity
- ❌ Requires queue infrastructure (Redis/RabbitMQ)
- ❌ Polling overhead
- ❌ Delayed user feedback
- ❌ More moving parts to maintain

**Effort:** 7-10 days

---

### Option 5: HTTP/2 Server Push (Not Recommended)

**Status:** ⚠️ Deprecated in most browsers (Chrome, Firefox)

**Rationale for Exclusion:**
- HTTP/2 Server Push deprecated by Chrome (2022)
- Limited browser support
- Not reliable for production use

---

## Production Considerations

### Architecture Changes: Development vs. Production

```
┌────────────────────────────────────────────────────────┐
│              DEVELOPMENT ENVIRONMENT                   │
├────────────────────────────────────────────────────────┤
│                                                        │
│  Browser (localhost:5173)                              │
│      ↓ fetch('/api/...')                               │
│  Vite Dev Server (localhost:5173)                      │
│      ↓ proxy to localhost:3001 [120s timeout]         │
│  API Server (localhost:3001)                           │
│      ↓                                                 │
│  Claude Code SDK [5-60s processing]                    │
│                                                        │
│  Key: Vite proxy is bottleneck (must configure)       │
└────────────────────────────────────────────────────────┘

┌────────────────────────────────────────────────────────┐
│              PRODUCTION ENVIRONMENT                    │
├────────────────────────────────────────────────────────┤
│                                                        │
│  Browser (example.com)                                 │
│      ↓ fetch('https://example.com/api/...')           │
│  Load Balancer (Nginx/ALB) [60s timeout]              │
│      ↓                                                 │
│  API Server (multiple instances)                       │
│      ↓                                                 │
│  Claude Code SDK [5-60s processing]                    │
│                                                        │
│  Key: No Vite, but load balancer timeout applies      │
└────────────────────────────────────────────────────────┘
```

### Load Balancer Timeout Configuration

**Nginx Configuration:**

```nginx
http {
  # Global timeout settings
  proxy_connect_timeout 120s;
  proxy_send_timeout 120s;
  proxy_read_timeout 120s;
  send_timeout 120s;

  # Keep-alive
  keepalive_timeout 120s;

  upstream api_backend {
    server api-1.internal:3001;
    server api-2.internal:3001;
    keepalive 32;
  }

  server {
    listen 443 ssl;
    server_name example.com;

    location /api/claude-code/ {
      # Extended timeout for Claude Code endpoints
      proxy_read_timeout 180s;
      proxy_send_timeout 180s;

      proxy_pass http://api_backend;
      proxy_http_version 1.1;
      proxy_set_header Connection "";

      # Buffering (important for large responses)
      proxy_buffering on;
      proxy_buffer_size 4k;
      proxy_buffers 8 4k;
      proxy_busy_buffers_size 8k;
    }

    location /api/ {
      # Standard timeout for other endpoints
      proxy_read_timeout 60s;
      proxy_send_timeout 60s;

      proxy_pass http://api_backend;
      proxy_http_version 1.1;
      proxy_set_header Connection "";
    }
  }
}
```

**AWS Application Load Balancer (ALB):**

```yaml
# ALB Target Group Configuration
TargetGroup:
  Type: AWS::ElasticLoadBalancingV2::TargetGroup
  Properties:
    Protocol: HTTP
    Port: 3001
    VpcId: !Ref VPC

    # Health check
    HealthCheckEnabled: true
    HealthCheckPath: /health
    HealthCheckIntervalSeconds: 30
    HealthCheckTimeoutSeconds: 10

    # Timeout settings
    TargetGroupAttributes:
      - Key: deregistration_delay.timeout_seconds
        Value: 30

      # Connection settings
      - Key: connection_termination.timeout_seconds
        Value: 120

      # Keep-alive
      - Key: target_group.keep_alive.timeout_seconds
        Value: 120
```

**Important:** ALB has hard 900s (15 min) idle timeout limit. Cannot be changed.

### CDN Timeout Considerations

**CloudFlare:**

```
┌─────────────────────────────────────────────────────┐
│           CLOUDFLARE TIMEOUT LIMITS                 │
├─────────────────────────────────────────────────────┤
│                                                     │
│  Free Plan:      100 seconds (cannot change)       │
│  Pro Plan:       100 seconds (cannot change)       │
│  Business Plan:  600 seconds (10 minutes)          │
│  Enterprise:     600 seconds (10 minutes)          │
│                                                     │
│  Recommendation: Bypass CDN for /api/claude-code/* │
│                  Route directly to origin           │
└─────────────────────────────────────────────────────┘
```

**CloudFlare Bypass Configuration:**

```javascript
// Page Rule: Bypass cache for Claude Code endpoints
// URL Pattern: *example.com/api/claude-code/*
// Settings:
//   - Cache Level: Bypass
//   - Browser Cache TTL: Respect Existing Headers
//   - Security Level: Medium
```

**AWS CloudFront:**

```yaml
# CloudFront Distribution Configuration
CloudFrontDistribution:
  Type: AWS::CloudFront::Distribution
  Properties:
    DistributionConfig:
      Origins:
        - Id: api-origin
          DomainName: api.example.com
          CustomOriginConfig:
            OriginProtocolPolicy: https-only
            OriginReadTimeout: 180  # 3 minutes
            OriginKeepaliveTimeout: 60

      CacheBehaviors:
        # Claude Code endpoints: no cache, extended timeout
        - PathPattern: /api/claude-code/*
          TargetOriginId: api-origin
          ViewerProtocolPolicy: redirect-to-https
          AllowedMethods: [GET, HEAD, OPTIONS, PUT, POST, PATCH, DELETE]
          CachedMethods: [GET, HEAD]

          # No caching
          MinTTL: 0
          MaxTTL: 0
          DefaultTTL: 0

          ForwardedValues:
            QueryString: true
            Headers: [Authorization, Content-Type]
            Cookies:
              Forward: all

        # Other API endpoints: short cache
        - PathPattern: /api/*
          TargetOriginId: api-origin
          ViewerProtocolPolicy: redirect-to-https

          # Short cache
          MinTTL: 0
          MaxTTL: 60
          DefaultTTL: 30
```

### Browser Timeout Limits

```
┌─────────────────────────────────────────────────────┐
│           BROWSER TIMEOUT CHARACTERISTICS           │
├─────────────────────────────────────────────────────┤
│                                                     │
│  Chrome:                                            │
│    - Default: None (controlled by server)          │
│    - Max: Unlimited                                │
│    - fetch() timeout: Must specify via AbortSignal │
│                                                     │
│  Firefox:                                           │
│    - Default: 90 seconds for network.http.response │
│    - Max: Configurable                             │
│    - fetch() timeout: Must specify via AbortSignal │
│                                                     │
│  Safari:                                            │
│    - Default: 60 seconds                           │
│    - Max: Not configurable                         │
│    - fetch() timeout: Must specify via AbortSignal │
│                                                     │
│  Edge:                                              │
│    - Default: Same as Chrome                       │
│    - Max: Unlimited                                │
│    - fetch() timeout: Must specify via AbortSignal │
│                                                     │
└─────────────────────────────────────────────────────┘
```

**Recommendation:** Always specify explicit timeout via `AbortSignal.timeout()` or `AbortController`:

```typescript
// Modern approach (Chrome 103+, Firefox 100+)
const response = await fetch('/api/claude-code/streaming-chat', {
  method: 'POST',
  body: JSON.stringify({ message }),
  signal: AbortSignal.timeout(90000) // 90 seconds
});

// Compatible approach (all browsers)
const controller = new AbortController();
const timeoutId = setTimeout(() => controller.abort(), 90000);

try {
  const response = await fetch('/api/claude-code/streaming-chat', {
    method: 'POST',
    body: JSON.stringify({ message }),
    signal: controller.signal
  });
  clearTimeout(timeoutId);
  return response;
} catch (error) {
  clearTimeout(timeoutId);
  throw error;
}
```

---

## Implementation Plan

### Phase 1: Immediate Fixes (Day 1)

**Goal:** Resolve current timeout failures

**Tasks:**

1. **Update Vite Configuration**
   ```typescript
   // vite.config.ts
   server: {
     proxy: {
       '/api': {
         timeout: 120000,      // 2 minutes
         proxyTimeout: 120000
       }
     }
   }
   ```

   **Files:** `/workspaces/agent-feed/frontend/vite.config.ts`
   **Lines:** 36
   **Testing:** Manual test Avi DM chat with 60s+ response

2. **Add AbortController to HttpClient**
   ```typescript
   // HttpClient.ts
   async post<T>(
     url: string,
     data: any,
     options: {
       timeout?: number;
       signal?: AbortSignal;
     } = {}
   ): Promise<T> {
     const controller = new AbortController();
     const timeoutId = setTimeout(
       () => controller.abort(),
       options.timeout || this.config.timeout
     );

     try {
       const response = await fetch(this.buildUrl(url), {
         method: 'POST',
         headers: this.getHeaders(),
         body: JSON.stringify(data),
         signal: options.signal || controller.signal
       });

       clearTimeout(timeoutId);
       return await this.handleResponse<T>(response);
     } catch (error) {
       clearTimeout(timeoutId);
       throw error;
     }
   }
   ```

   **Files:** `/workspaces/agent-feed/frontend/src/services/HttpClient.ts` (create if not exists)
   **Testing:** Unit tests for timeout handling

3. **Basic Loading State**
   ```tsx
   // AviDM component
   const [loadingState, setLoadingState] = useState<{
     isLoading: boolean;
     elapsed: number;
     message: string;
   }>({ isLoading: false, elapsed: 0, message: '' });

   // Update every second during loading
   useEffect(() => {
     if (!loadingState.isLoading) return;

     const interval = setInterval(() => {
       setLoadingState(prev => ({
         ...prev,
         elapsed: prev.elapsed + 1000,
         message: getMessageForElapsed(prev.elapsed)
       }));
     }, 1000);

     return () => clearInterval(interval);
   }, [loadingState.isLoading]);
   ```

   **Files:** `/workspaces/agent-feed/frontend/src/components/AviDM.tsx` (find actual file)
   **Testing:** Visual inspection during chat

**Deliverables:**
- ✅ Vite timeout increased to 120s
- ✅ AbortController integration
- ✅ Basic "Thinking..." → "Still processing..." messages
- ✅ Manual testing passes

**Risks:**
- 🔴 Breaking existing tests (update mocks)
- 🟡 Need to validate against production endpoint

---

### Phase 2: Enhanced UX (Days 2-3)

**Goal:** Professional loading experience with abort functionality

**Tasks:**

1. **Progressive Loading Component**
   ```tsx
   // components/LoadingIndicator.tsx
   export const LoadingIndicator: React.FC<LoadingIndicatorProps> = ({
     elapsed,
     onAbort
   }) => {
     const phase = useMemo(() => getPhaseForElapsed(elapsed), [elapsed]);

     return (
       <div className="relative p-6 bg-gray-50 rounded-lg">
         {/* Spinner */}
         <div className="flex items-center space-x-3 mb-4">
           <Loader2 className="h-5 w-5 animate-spin text-blue-600" />
           <span className="text-sm font-medium">{phase.message}</span>
         </div>

         {/* Progress bar (after 5s) */}
         {elapsed > 5000 && (
           <div className="mb-4">
             <div className="h-1 bg-gray-200 rounded-full overflow-hidden">
               <div
                 className="h-full bg-blue-600 transition-all duration-500"
                 style={{ width: `${phase.progress}%` }}
               />
             </div>
           </div>
         )}

         {/* Time & estimate */}
         {elapsed > 10000 && (
           <div className="text-xs text-gray-500 mb-3">
             {Math.floor(elapsed / 1000)}s elapsed
             {phase.estimatedRemaining &&
               ` • ~${phase.estimatedRemaining}s remaining`
             }
           </div>
         )}

         {/* Abort button (after 15s) */}
         {phase.showAbort && onAbort && (
           <button
             onClick={onAbort}
             className="text-sm text-red-600 hover:text-red-700 font-medium"
           >
             Cancel Request
           </button>
         )}
       </div>
     );
   };
   ```

   **Files:** `/workspaces/agent-feed/frontend/src/components/LoadingIndicator.tsx` (new)
   **Testing:** Storybook stories + visual regression

2. **Cancel Request Handler**
   ```typescript
   // AviDMService.ts enhancement
   private activeRequests = new Map<string, AbortController>();

   async sendMessage(message: string, options: SendMessageOptions = {}): Promise<ClaudeResponse> {
     const requestId = this.generateRequestId();
     const abortController = new AbortController();

     this.activeRequests.set(requestId, abortController);
     this.emit('requestStarted', { requestId });

     try {
       const response = await this.httpClient.post<ClaudeResponse>(
         '/api/claude-code/streaming-chat',
         { message, options },
         {
           signal: abortController.signal,
           timeout: 90000
         }
       );

       this.emit('requestCompleted', { requestId });
       return response;

     } catch (error) {
       if (error.name === 'AbortError') {
         this.emit('requestCancelled', { requestId });
         throw new ClaudeCodeError('Request cancelled by user', 'USER_CANCELLED', { requestId });
       }
       throw error;

     } finally {
       this.activeRequests.delete(requestId);
     }
   }

   cancelRequest(requestId: string): boolean {
     const controller = this.activeRequests.get(requestId);
     if (controller) {
       controller.abort();
       return true;
     }
     return false;
   }
   ```

   **Files:** `/workspaces/agent-feed/frontend/src/services/AviDMService.ts` (line 196-310)
   **Testing:** Unit tests + integration tests

3. **Integrate into AviDM Component**
   ```tsx
   const handleSendMessage = async (message: string) => {
     const requestId = generateRequestId();
     setCurrentRequestId(requestId);
     setLoadingState({ isLoading: true, elapsed: 0, message: 'Thinking...' });

     try {
       const response = await aviDMService.sendMessage(message);
       // Handle response...
     } catch (error) {
       if (error.code === 'USER_CANCELLED') {
         // User cancelled, no error UI
         console.log('User cancelled request');
       } else {
         // Show error UI
         setError(error);
       }
     } finally {
       setLoadingState({ isLoading: false, elapsed: 0, message: '' });
       setCurrentRequestId(null);
     }
   };

   const handleAbortRequest = () => {
     if (currentRequestId) {
       aviDMService.cancelRequest(currentRequestId);
     }
   };
   ```

   **Files:** AviDM component
   **Testing:** E2E tests with Playwright

**Deliverables:**
- ✅ LoadingIndicator component
- ✅ Cancel functionality working
- ✅ Phase-based messages (4 phases)
- ✅ Progress estimation
- ✅ Unit tests passing (>80% coverage)
- ✅ E2E test covering cancel flow

**Risks:**
- 🟡 UX refinement may require iterations
- 🟡 Accessibility considerations (ARIA labels)

---

### Phase 3: Error Handling & Retry (Days 4-5)

**Goal:** Robust error recovery with smart retry logic

**Tasks:**

1. **Timeout Error Classification**
   ```typescript
   // ErrorHandler.ts
   export class ErrorHandler {
     classifyTimeout(error: Error, context: {
       elapsed: number;
       responseStatus?: number;
     }): TimeoutError {
       let type: TimeoutType;
       let layer: 'frontend' | 'proxy' | 'server' | 'claude';

       if (error.name === 'AbortError') {
         type = TimeoutType.USER_CANCELLED;
         layer = 'frontend';
       } else if (context.responseStatus === 504) {
         type = TimeoutType.PROXY_TIMEOUT;
         layer = 'proxy';
       } else if (context.responseStatus === 408) {
         type = TimeoutType.SERVER_TIMEOUT;
         layer = 'server';
       } else if (context.elapsed > 60000) {
         type = TimeoutType.CLAUDE_TIMEOUT;
         layer = 'claude';
       } else {
         type = TimeoutType.FRONTEND_TIMEOUT;
         layer = 'frontend';
       }

       return {
         ...error,
         type,
         layer,
         elapsed: context.elapsed,
         recoverable: this.isRecoverable(type),
         retryRecommended: this.shouldRetry(type)
       };
     }
   }
   ```

   **Files:** `/workspaces/agent-feed/frontend/src/services/ErrorHandler.ts` (enhance existing)
   **Testing:** Unit tests for all timeout types

2. **Retry Handler**
   ```typescript
   // RetryHandler.ts
   export class RetryHandler {
     async executeWithRetry<T>(
       operation: () => Promise<T>,
       config: RetryConfig = {}
     ): Promise<T> {
       const {
         maxAttempts = 3,
         backoffMultiplier = 2,
         initialDelay = 1000,
         maxDelay = 30000
       } = config;

       let lastError: Error;

       for (let attempt = 1; attempt <= maxAttempts; attempt++) {
         try {
           return await operation();
         } catch (error) {
           lastError = error as Error;

           // Don't retry if not retryable
           if (!this.isRetryable(error)) {
             throw error;
           }

           // Don't retry if last attempt
           if (attempt >= maxAttempts) {
             throw new Error(`Max retry attempts exceeded: ${lastError.message}`);
           }

           // Calculate backoff
           const delay = Math.min(
             initialDelay * Math.pow(backoffMultiplier, attempt - 1),
             maxDelay
           );

           console.warn(`Retry attempt ${attempt}/${maxAttempts} in ${delay}ms`);
           await this.sleep(delay);
         }
       }

       throw lastError!;
     }
   }
   ```

   **Files:** `/workspaces/agent-feed/frontend/src/services/RetryHandler.ts` (new)
   **Testing:** Unit tests with mock operations

3. **Error UI Component**
   ```tsx
   // components/ErrorMessage.tsx
   export const ErrorMessage: React.FC<ErrorMessageProps> = ({
     error,
     onRetry,
     onDismiss
   }) => {
     const errorConfig = timeoutErrorMessages[error.type];

     return (
       <div className={`p-4 rounded-lg border ${getSeverityStyles(errorConfig.severity)}`}>
         <div className="flex items-start">
           <AlertTriangle className="h-5 w-5 mr-3 flex-shrink-0" />
           <div className="flex-1">
             <h3 className="font-semibold mb-1">{errorConfig.title}</h3>
             <p className="text-sm mb-3">{errorConfig.message}</p>

             {errorConfig.suggestions && (
               <ul className="text-sm space-y-1 mb-3">
                 {errorConfig.suggestions.map((suggestion, i) => (
                   <li key={i}>• {suggestion}</li>
                 ))}
               </ul>
             )}

             <div className="flex space-x-2">
               {errorConfig.recoverable && onRetry && (
                 <button
                   onClick={onRetry}
                   className="btn-primary-sm"
                 >
                   {errorConfig.action || 'Retry'}
                 </button>
               )}
               <button
                 onClick={onDismiss}
                 className="btn-secondary-sm"
               >
                 Dismiss
               </button>
             </div>
           </div>
         </div>
       </div>
     );
   };
   ```

   **Files:** `/workspaces/agent-feed/frontend/src/components/ErrorMessage.tsx` (new)
   **Testing:** Storybook + visual regression

4. **Integrate Retry Logic**
   ```typescript
   const handleSendMessage = async (message: string) => {
     const retryHandler = new RetryHandler();

     try {
       const response = await retryHandler.executeWithRetry(
         () => aviDMService.sendMessage(message),
         { maxAttempts: 3, initialDelay: 1000 }
       );

       // Handle success...
     } catch (error) {
       const timeoutError = errorHandler.classifyTimeout(error, {
         elapsed: loadingState.elapsed
       });

       setError(timeoutError);
     }
   };
   ```

   **Files:** AviDM component
   **Testing:** E2E tests with timeout simulation

**Deliverables:**
- ✅ ErrorHandler with timeout classification
- ✅ RetryHandler with exponential backoff
- ✅ ErrorMessage component
- ✅ Integration in AviDM component
- ✅ Tests covering all error paths
- ✅ Analytics logging for timeouts

**Risks:**
- 🟡 Retry logic may cause duplicate requests (add idempotency)
- 🟡 Need to handle rapid retry attempts (add rate limiting)

---

### Phase 4: Production Readiness (Days 6-7)

**Goal:** Validate production deployment and monitoring

**Tasks:**

1. **Production Configuration Checklist**
   ```markdown
   ## Pre-Deployment Checklist

   ### Load Balancer
   - [ ] Nginx proxy_read_timeout: 180s
   - [ ] Nginx proxy_send_timeout: 120s
   - [ ] ALB idle timeout: 120s (cannot exceed 900s)
   - [ ] Health check configured: /health

   ### CDN
   - [ ] CloudFlare page rule: Bypass /api/claude-code/*
   - [ ] CloudFront cache behavior: MinTTL=0, MaxTTL=0
   - [ ] Origin read timeout: 180s

   ### API Server
   - [ ] Express server.timeout: 300000ms
   - [ ] Request timeout middleware: 180000ms
   - [ ] CORS headers correct
   - [ ] Health endpoint responding

   ### Frontend
   - [ ] Build passes
   - [ ] Vite config NOT used (production uses direct)
   - [ ] HttpClient timeout: 90000ms
   - [ ] AbortController implemented
   - [ ] Error handling tested

   ### Monitoring
   - [ ] Timeout metrics logging
   - [ ] Error rate dashboard
   - [ ] Alert on timeout rate > 5%
   - [ ] Analytics tracking cancel events
   ```

   **Files:** `DEPLOYMENT_CHECKLIST.md` (new)

2. **Monitoring & Analytics**
   ```typescript
   // Analytics tracking
   export class TimeoutAnalytics {
     trackTimeout(event: TimeoutEvent): void {
       // Send to analytics service
       analytics.track('request_timeout', {
         type: event.type,
         layer: event.layer,
         elapsed: event.elapsed,
         sessionId: event.sessionId,
         timestamp: Date.now()
       });

       // Log to console (development)
       if (process.env.NODE_ENV === 'development') {
         console.warn('Timeout:', event);
       }
     }

     trackRetry(event: RetryEvent): void {
       analytics.track('request_retry', {
         attempt: event.attempt,
         maxAttempts: event.maxAttempts,
         delay: event.delay,
         reason: event.reason,
         sessionId: event.sessionId
       });
     }

     trackCancel(event: CancelEvent): void {
       analytics.track('request_cancel', {
         elapsed: event.elapsed,
         phase: event.phase,
         sessionId: event.sessionId
       });
     }
   }
   ```

   **Files:** `/workspaces/agent-feed/frontend/src/services/TimeoutAnalytics.ts` (new)
   **Testing:** Verify events sent to analytics

3. **Performance Testing**
   ```typescript
   // tests/performance/timeout-stress.test.ts
   describe('Timeout Stress Testing', () => {
     it('should handle 10 concurrent long-running requests', async () => {
       const requests = Array(10).fill(null).map(() =>
         aviDMService.sendMessage('Analyze this large codebase...')
       );

       const results = await Promise.allSettled(requests);

       const succeeded = results.filter(r => r.status === 'fulfilled').length;
       const failed = results.filter(r => r.status === 'rejected').length;

       expect(succeeded).toBeGreaterThan(7); // 70% success rate
       expect(failed).toBeLessThan(3);
     });

     it('should respect 90s frontend timeout', async () => {
       const start = Date.now();

       try {
         await aviDMService.sendMessage('Force 120s delay', {
           _testDelay: 120000
         });
         fail('Should have timed out');
       } catch (error) {
         const elapsed = Date.now() - start;
         expect(elapsed).toBeGreaterThan(85000); // ~90s
         expect(elapsed).toBeLessThan(95000);
         expect(error.type).toBe('FRONTEND_TIMEOUT');
       }
     });
   });
   ```

   **Files:** `/workspaces/agent-feed/frontend/src/tests/performance/` (new)
   **Testing:** CI pipeline integration

4. **Documentation**
   ```markdown
   # Avi DM Timeout Architecture - Operations Guide

   ## Monitoring

   ### Key Metrics
   - `request_timeout_rate`: % of requests timing out
   - `request_duration_p95`: 95th percentile response time
   - `request_cancel_rate`: % of user cancellations
   - `retry_success_rate`: % of retries that succeed

   ### Alerts
   - Critical: Timeout rate > 10% for 5 minutes
   - Warning: Timeout rate > 5% for 10 minutes
   - Info: P95 duration > 60s

   ## Troubleshooting

   ### High Timeout Rate
   1. Check Claude Code health: `curl http://localhost:3001/api/claude-code/health`
   2. Check API server logs: `docker logs api-server | grep timeout`
   3. Check load balancer metrics
   4. Verify network connectivity

   ### Users Cancelling Frequently
   1. Check average response time (should be < 30s)
   2. Verify loading messages are showing
   3. Check if Claude Code is slow (see logs)
   ```

   **Files:** `AVI_DM_OPERATIONS.md` (new)

**Deliverables:**
- ✅ Production deployment checklist
- ✅ Monitoring dashboards
- ✅ Performance test suite
- ✅ Operations documentation
- ✅ Runbook for incidents

**Risks:**
- 🔴 Production issues may surface new edge cases
- 🟡 Need to validate monitoring before full rollout

---

## Configuration Matrix

### Complete Timeout Configuration

```
┌────────────────────────────────────────────────────────────────────┐
│              TIMEOUT CONFIGURATION MATRIX                          │
├────────────────────────────────────────────────────────────────────┤
│                                                                    │
│  Component              │ Current │ Recommended │ Rationale        │
│  ──────────────────────────────────────────────────────────────── │
│                                                                    │
│  DEVELOPMENT ENVIRONMENT                                           │
│  ──────────────────────────────────────────────────────────────── │
│  Vite Proxy             │   10s   │    120s     │ 4x Claude P95    │
│  Frontend HttpClient    │  300s   │     90s     │ 3x Claude P95    │
│  AviDMService           │  300s   │     90s     │ Match HttpClient │
│                                                                    │
│  PRODUCTION ENVIRONMENT                                            │
│  ──────────────────────────────────────────────────────────────── │
│  Frontend HttpClient    │  300s   │     90s     │ 3x Claude P95    │
│  Nginx (if used)        │   60s   │    180s     │ 6x Claude P95    │
│  ALB (AWS)              │   60s   │    120s     │ 4x Claude P95    │
│  CloudFlare (bypass)    │  100s   │      -      │ Don't route here │
│  CloudFront             │   30s   │    180s     │ Origin timeout   │
│                                                                    │
│  BACKEND                                                           │
│  ──────────────────────────────────────────────────────────────── │
│  Express Server         │  120s   │    300s     │ Global timeout   │
│  Claude Code Route      │    -    │    180s     │ Per-request      │
│  Claude Code SDK        │  5-60s  │      -      │ Intrinsic        │
│                                                                    │
└────────────────────────────────────────────────────────────────────┘

Notes:
1. Claude Code baseline: 15-17s average, 30s P95 (estimated)
2. Timeouts should cascade: Frontend < Proxy < Server
3. Always allow 2-3x buffer above expected duration
4. User can abort at any time (no timeout)
```

### File Locations for Configuration

```
┌─────────────────────────────────────────────────────────────────┐
│                CONFIGURATION FILE LOCATIONS                     │
├─────────────────────────────────────────────────────────────────┤
│                                                                 │
│  File                                   │ Line │ Config         │
│  ─────────────────────────────────────────────────────────────  │
│                                                                 │
│  FRONTEND                                                       │
│  ─────────────────────────────────────────────────────────────  │
│  vite.config.ts                         │  36  │ timeout: 120000│
│  AviDMService.ts                        │  98  │ timeout: 90000 │
│  HttpClient.ts                          │  -   │ timeout: 90000 │
│                                                                 │
│  BACKEND                                                        │
│  ─────────────────────────────────────────────────────────────  │
│  api-server/server.js                   │2327  │ server.timeout │
│  src/api/routes/claude-code-sdk.js      │  19  │ req.setTimeout │
│                                                                 │
│  INFRASTRUCTURE (Production)                                    │
│  ─────────────────────────────────────────────────────────────  │
│  nginx.conf                             │  -   │ proxy_timeout  │
│  cloudformation.yaml (ALB)              │  -   │ IdleTimeout    │
│  cloudfront-config.json                 │  -   │ OriginTimeout  │
│                                                                 │
└─────────────────────────────────────────────────────────────────┘
```

---

## Migration Path

### From Current State to Recommended Architecture

```
┌─────────────────────────────────────────────────────────────────┐
│                    MIGRATION ROADMAP                            │
└─────────────────────────────────────────────────────────────────┘

CURRENT STATE (v0.9)
├── ❌ Vite proxy: 10s timeout
├── ❌ No loading indicators
├── ❌ No cancel functionality
├── ✅ AviDMService: 5 min timeout (good)
└── ❌ No retry logic

          ↓ Phase 1 (Day 1)

PHASE 1 COMPLETE (v1.0-alpha)
├── ✅ Vite proxy: 120s timeout
├── ✅ Basic loading messages
├── ✅ AbortController integrated
└── ⚠️ Manual retry only

          ↓ Phase 2 (Days 2-3)

PHASE 2 COMPLETE (v1.0-beta)
├── ✅ Progressive loading UI
├── ✅ Cancel button (15s+)
├── ✅ Time estimates
└── ⚠️ Basic error messages

          ↓ Phase 3 (Days 4-5)

PHASE 3 COMPLETE (v1.0-rc)
├── ✅ Smart error classification
├── ✅ Automatic retry logic
├── ✅ Detailed error messages
└── ✅ Analytics tracking

          ↓ Phase 4 (Days 6-7)

FINAL STATE (v1.0 Production)
├── ✅ Production config verified
├── ✅ Monitoring dashboards
├── ✅ Performance tests passing
├── ✅ Operations documentation
└── ✅ Ready for production deployment
```

### Rollback Plan

```
IF issues occur in production:

1. Immediate Rollback (< 5 min)
   - Revert frontend build to previous version
   - DNS failover if necessary
   - Notify users via status page

2. Partial Rollback (< 15 min)
   - Keep timeout fixes (vite.config.ts)
   - Disable new UI components (feature flag)
   - Revert error handling to basic try-catch

3. Configuration-Only Rollback (< 5 min)
   - Reduce Vite timeout back to 10s
   - Increase frontend timeout to 300s
   - Disable retry logic

4. Database State
   - No database migrations in this change
   - No rollback needed for data

5. Monitoring During Rollback
   - Watch error rates
   - Check user complaints
   - Verify Claude Code health
```

---

## Appendix

### A. Glossary

- **Long-Polling:** HTTP request held open until data available or timeout
- **SSE:** Server-Sent Events, unidirectional push from server
- **WebSocket:** Bidirectional, persistent connection
- **AbortController:** Browser API to cancel fetch requests
- **Proxy Timeout:** Maximum time Vite proxy waits for backend response
- **P95:** 95th percentile - 95% of requests faster than this value

### B. References

1. Vite Proxy Configuration: https://vitejs.dev/config/server-options.html#server-proxy
2. Fetch API AbortSignal: https://developer.mozilla.org/en-US/docs/Web/API/AbortSignal
3. Express Timeout: https://expressjs.com/en/4x/api.html#req.setTimeout
4. Nginx Proxy Timeouts: https://nginx.org/en/docs/http/ngx_http_proxy_module.html#proxy_read_timeout
5. AWS ALB Timeouts: https://docs.aws.amazon.com/elasticloadbalancing/latest/application/application-load-balancers.html#connection-idle-timeout
6. CloudFlare Timeouts: https://developers.cloudflare.com/support/troubleshooting/cloudflare-errors/troubleshooting-cloudflare-524-errors/

### C. Test Plan

```
┌─────────────────────────────────────────────────────────────────┐
│                     COMPREHENSIVE TEST PLAN                     │
├─────────────────────────────────────────────────────────────────┤
│                                                                 │
│  Test Type          │ Coverage │ Priority │ Duration           │
│  ──────────────────────────────────────────────────────────────│
│                                                                 │
│  Unit Tests                                                     │
│  - HttpClient       │   90%    │   High   │  < 5 min           │
│  - AviDMService     │   85%    │   High   │  < 5 min           │
│  - ErrorHandler     │   95%    │   High   │  < 2 min           │
│  - RetryHandler     │   90%    │   High   │  < 2 min           │
│  - Components       │   80%    │  Medium  │  < 5 min           │
│                                                                 │
│  Integration Tests                                              │
│  - End-to-end chat  │   100%   │   High   │  < 10 min          │
│  - Timeout handling │   100%   │   High   │  < 5 min           │
│  - Cancel flow      │   100%   │  Medium  │  < 3 min           │
│  - Retry logic      │   100%   │   High   │  < 5 min           │
│                                                                 │
│  E2E Tests (Playwright)                                         │
│  - Normal request   │   100%   │   High   │  30-60s per test   │
│  - Long request     │   100%   │   High   │  90-120s per test  │
│  - Timeout scenario │   100%   │   High   │  90-120s per test  │
│  - Cancel scenario  │   100%   │  Medium  │  20-30s per test   │
│                                                                 │
│  Performance Tests                                              │
│  - Concurrent reqs  │   100%   │  Medium  │  2-5 min           │
│  - Stress test      │   100%   │   Low    │  10-15 min         │
│  - Timeout accuracy │   100%   │   High   │  5-10 min          │
│                                                                 │
│  Manual Tests                                                   │
│  - UX validation    │    -     │  Medium  │  30-60 min         │
│  - Browser compat   │    -     │   Low    │  1-2 hours         │
│  - Accessibility    │    -     │  Medium  │  30-60 min         │
│                                                                 │
└─────────────────────────────────────────────────────────────────┘
```

### D. Success Criteria

**Launch Criteria:**

1. ✅ All unit tests passing (>85% coverage)
2. ✅ All integration tests passing (100% critical paths)
3. ✅ E2E tests passing (0 flakes in 10 runs)
4. ✅ Performance tests passing (P95 < 35s)
5. ✅ Manual QA sign-off
6. ✅ Security review complete
7. ✅ Documentation complete
8. ✅ Monitoring dashboards deployed

**Success Metrics (30 days post-launch):**

1. Timeout rate < 5% (currently ~50% due to 10s limit)
2. User cancel rate < 10%
3. Retry success rate > 70%
4. P95 response time < 35s
5. No production incidents related to timeouts
6. User satisfaction > 4.0/5.0

---

## Document History

| Version | Date | Author | Changes |
|---------|------|--------|---------|
| 1.0.0 | 2025-10-01 | SPARC Architecture Agent | Initial architecture specification |

---

**END OF ARCHITECTURE DOCUMENT**
