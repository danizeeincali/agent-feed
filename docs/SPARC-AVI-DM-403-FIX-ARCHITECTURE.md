# SPARC Architecture: AVI DM 403 Error Fix

**Date**: 2025-10-20
**SPARC Phase**: 3 - Architecture
**Status**: Complete

---

## 1. System Architecture Overview

### 1.1 High-Level Architecture

```
┌─────────────────────────────────────────────────────────────┐
│                    CLIENT BROWSER                           │
│                  (Port: Various)                            │
└─────────────────────────────────────────────────────────────┘
                            │
                            │ HTTP/WS
                            ↓
┌─────────────────────────────────────────────────────────────┐
│              VITE DEV SERVER (Frontend)                     │
│                    Port: 5173                               │
│                                                             │
│  ┌──────────────────────────────────────────────────────┐  │
│  │  React Application                                   │  │
│  │                                                      │  │
│  │  ┌─────────────────────────────────────┐           │  │
│  │  │  AviDMService.ts                    │           │  │
│  │  │  baseUrl: 'http://localhost:3001'   │  ←── FIX │  │
│  │  │  (NO /api suffix)                   │           │  │
│  │  └─────────────────────────────────────┘           │  │
│  │           │                                         │  │
│  │           ↓                                         │  │
│  │  ┌─────────────────────────────────────┐           │  │
│  │  │  HttpClient                         │           │  │
│  │  │  Constructs full URLs               │           │  │
│  │  └─────────────────────────────────────┘           │  │
│  └──────────────────────────────────────────────────────┘  │
│                                                             │
│  Proxy Configuration:                                      │
│  ┌──────────────────────────────────────────────────────┐  │
│  │  /api/* → http://127.0.0.1:3001                     │  │
│  │  /ws → ws://127.0.0.1:3001 (WebSocket)              │  │
│  └──────────────────────────────────────────────────────┘  │
└─────────────────────────────────────────────────────────────┘
                            │
                            │ HTTP POST
                            ↓
┌─────────────────────────────────────────────────────────────┐
│              BACKEND API SERVER                             │
│                  Port: 3001                                 │
│                                                             │
│  Routes:                                                    │
│  ┌──────────────────────────────────────────────────────┐  │
│  │  POST /api/claude-code/streaming-chat ✅             │  │
│  │  └─> Claude Code SDK Handler                        │  │
│  │                                                      │  │
│  │  GET /health ✅                                      │  │
│  │  GET /status ✅                                      │  │
│  └──────────────────────────────────────────────────────┘  │
│                                                             │
│  CORS Whitelist:                                           │
│  - http://localhost:5173 ✅                                │
│  - http://localhost:3000                                   │
│  - http://localhost:3001                                   │
└─────────────────────────────────────────────────────────────┘
```

---

## 2. Component Architecture

### 2.1 Frontend Service Layer

```
┌──────────────────────────────────────────────────────────┐
│                  AviDMService                            │
│  ┌────────────────────────────────────────────────────┐ │
│  │  Configuration Layer                               │ │
│  │                                                    │ │
│  │  mergeWithDefaults(config)                         │ │
│  │  ├─> baseUrl: 'http://localhost:3001' ←── FIX    │ │
│  │  ├─> websocketUrl: 'ws://localhost:3001/ws'       │ │
│  │  ├─> timeout: 300000ms                            │ │
│  │  └─> retryAttempts: 3                             │ │
│  └────────────────────────────────────────────────────┘ │
│                        ↓                                 │
│  ┌────────────────────────────────────────────────────┐ │
│  │  Core Components                                   │ │
│  │                                                    │ │
│  │  ┌──────────────┐  ┌────────────────────────┐    │ │
│  │  │ HttpClient   │  │ WebSocketManager       │    │ │
│  │  │              │  │                        │    │ │
│  │  │ baseUrl:     │  │ url: ws://localhost:   │    │ │
│  │  │ localhost:   │  │      3001/ws           │    │ │
│  │  │ 3001         │  │                        │    │ │
│  │  └──────────────┘  └────────────────────────┘    │ │
│  │                                                    │ │
│  │  ┌──────────────┐  ┌────────────────────────┐    │ │
│  │  │ ContextMgr   │  │ SessionManager         │    │ │
│  │  └──────────────┘  └────────────────────────┘    │ │
│  │                                                    │ │
│  │  ┌──────────────┐  ┌────────────────────────┐    │ │
│  │  │ ErrorHandler │  │ SecurityManager        │    │ │
│  │  └──────────────┘  └────────────────────────┘    │ │
│  └────────────────────────────────────────────────────┘ │
│                        ↓                                 │
│  ┌────────────────────────────────────────────────────┐ │
│  │  API Methods                                       │ │
│  │                                                    │ │
│  │  sendMessage(msg, options)                         │ │
│  │  sendMessageStream(msg, onChunk, options)         │ │
│  │  createSession(projectId, projectPath)            │ │
│  │  endSession(sessionId)                             │ │
│  │  healthCheck()                                     │ │
│  └────────────────────────────────────────────────────┘ │
└──────────────────────────────────────────────────────────┘
```

### 2.2 HttpClient URL Construction

```
┌──────────────────────────────────────────────────────────┐
│                     HttpClient                           │
│                                                          │
│  CONSTRUCTOR:                                            │
│  ┌────────────────────────────────────────────────────┐ │
│  │  Input: config.baseUrl                             │ │
│  │  ├─> 'http://localhost:3001' ✅ (after fix)       │ │
│  │  └─> Store in this.baseUrl                         │ │
│  └────────────────────────────────────────────────────┘ │
│                                                          │
│  POST METHOD:                                            │
│  ┌────────────────────────────────────────────────────┐ │
│  │  Input: endpoint, data                             │ │
│  │  │                                                  │ │
│  │  ├─> endpoint = '/api/claude-code/streaming-chat' │ │
│  │  │                                                  │ │
│  │  └─> Build URL:                                    │ │
│  │      fullUrl = this.baseUrl + endpoint             │ │
│  │                                                     │ │
│  │      = 'http://localhost:3001' +                   │ │
│  │        '/api/claude-code/streaming-chat'           │ │
│  │                                                     │ │
│  │      = 'http://localhost:3001/api/claude-code/     │ │
│  │        streaming-chat' ✅                          │ │
│  └────────────────────────────────────────────────────┘ │
│                                                          │
│  FETCH:                                                  │
│  ┌────────────────────────────────────────────────────┐ │
│  │  fetch(fullUrl, {                                  │ │
│  │    method: 'POST',                                 │ │
│  │    headers: { 'Content-Type': 'application/json' },│ │
│  │    body: JSON.stringify(data)                      │ │
│  │  })                                                │ │
│  └────────────────────────────────────────────────────┘ │
└──────────────────────────────────────────────────────────┘
```

---

## 3. Request Flow Architecture

### 3.1 Complete Request Flow (After Fix)

```
Step 1: USER ACTION
─────────────────────
User clicks "Send" in AVI DM interface
↓

Step 2: UI COMPONENT
─────────────────────
AviDM React Component calls:
  aviService.sendMessage("Hello Claude", options)
↓

Step 3: SERVICE LAYER (AviDMService)
─────────────────────────────────────
AviDMService.sendMessage():
  ├─> Validate initialization
  ├─> Check rate limits
  ├─> Sanitize message content
  ├─> Serialize project context
  └─> Build request payload
↓

Step 4: HTTP CLIENT
───────────────────
httpClient.post('/api/claude-code/streaming-chat', payload):
  ├─> baseUrl = 'http://localhost:3001' ✅
  ├─> endpoint = '/api/claude-code/streaming-chat'
  ├─> fullUrl = 'http://localhost:3001/api/claude-code/streaming-chat' ✅
  └─> fetch(fullUrl, options)
↓

Step 5: VITE PROXY (Development)
─────────────────────────────────
Vite intercepts request matching /api/*:
  ├─> Matches proxy rule: '/api' → 'http://127.0.0.1:3001'
  ├─> Forwards to backend
  ├─> Adds CORS headers
  └─> Sets changeOrigin: true
↓

Step 6: BACKEND SERVER (Port 3001)
───────────────────────────────────
Express server receives:
  POST /api/claude-code/streaming-chat

  ├─> CORS middleware validates origin
  │   └─> 'http://localhost:5173' ✅ (in whitelist)
  │
  ├─> Router matches route
  │   └─> app.post('/api/claude-code/streaming-chat', handler)
  │
  ├─> Handler executes
  │   └─> Call Claude Code SDK
  │
  └─> Return response
↓

Step 7: CLAUDE CODE SDK
────────────────────────
Claude processes request:
  ├─> Analyze message and context
  ├─> Generate response
  ├─> Execute any tool calls
  └─> Return structured response
↓

Step 8: RESPONSE FLOW
─────────────────────
Backend → Vite Proxy → Frontend:
  {
    success: true,
    message: "Claude's response...",
    responses: [...],
    claudeCode: true
  }
  Status: 200 OK ✅
↓

Step 9: SERVICE LAYER
─────────────────────
AviDMService.sendMessage():
  ├─> Receive response
  ├─> Store in session
  ├─> Emit 'messageReceived' event
  └─> Return response to caller
↓

Step 10: UI UPDATE
──────────────────
AviDM React Component:
  ├─> Receive response
  ├─> Update message history
  ├─> Display Claude's response
  └─> User sees answer ✅
```

### 3.2 Error Flow (Before Fix)

```
BEFORE FIX - BROKEN FLOW
────────────────────────

baseUrl = 'http://localhost:3001/api' ❌
endpoint = '/api/claude-code/streaming-chat'
         ↓
fullUrl = 'http://localhost:3001/api/api/claude-code/streaming-chat' ❌
         ↓
Vite Proxy forwards to backend
         ↓
Backend receives: POST /api/api/claude-code/streaming-chat
         ↓
Route NOT FOUND (no matching route)
         ↓
Backend returns: 404 Not Found OR 403 Forbidden
         ↓
Vite Proxy passes error to frontend
         ↓
HttpClient throws error
         ↓
ErrorHandler converts to ClaudeCodeError
         ↓
User sees: "I encountered an error: API error: 403 Forbidden" ❌
```

---

## 4. Configuration Architecture

### 4.1 Configuration Hierarchy

```
┌────────────────────────────────────────────────────────┐
│         Configuration Priority (High to Low)          │
└────────────────────────────────────────────────────────┘

Level 1: USER PROVIDED CONFIG (Highest Priority)
─────────────────────────────────────────────────
new AviDMService({
  baseUrl: 'https://custom-backend.com',  // User override
  timeout: 60000
})
↓ IF provided, use these values
↓ ELSE use defaults

Level 2: DEFAULT CONFIGURATION (Fallback)
──────────────────────────────────────────
mergeWithDefaults({}) returns:
{
  baseUrl: 'http://localhost:3001',  ←── FIX (remove /api)
  timeout: 300000,
  retryAttempts: 3,
  websocketUrl: 'ws://localhost:3001/ws',
  ...
}

Level 3: COMPONENT DEFAULTS
────────────────────────────
Individual components (HttpClient, WebSocketManager, etc.)
have their own defaults if not provided
```

### 4.2 Configuration Flow Diagram

```
┌──────────────────────────┐
│ User Creates Service     │
│                          │
│ new AviDMService(config) │
└──────────────────────────┘
            ↓
┌──────────────────────────────────────┐
│ mergeWithDefaults(config)            │
│                                      │
│ FOR EACH config property:            │
│   IF config[property] provided:      │
│     USE config[property]             │
│   ELSE:                              │
│     USE default[property]            │
│                                      │
│ SPECIAL CASE - baseUrl:              │
│   config.baseUrl || 'http://         │
│   localhost:3001' ✅                 │
│   (NO /api suffix)                   │
└──────────────────────────────────────┘
            ↓
┌──────────────────────────────────────┐
│ Initialize Components                │
│                                      │
│ httpClient = new HttpClient({        │
│   baseUrl: mergedConfig.baseUrl      │
│ })                                   │
│                                      │
│ websocketManager = new WebSocketMgr({│
│   url: mergedConfig.websocketUrl     │
│ })                                   │
└──────────────────────────────────────┘
            ↓
    Service Ready
```

---

## 5. Network Architecture

### 5.1 Port Allocation

```
┌──────────────────────────────────────────────────┐
│              PORT ALLOCATION MAP                 │
└──────────────────────────────────────────────────┘

Port 5173: Frontend Vite Dev Server
  ├─> Serves React application
  ├─> Handles HMR (Hot Module Replacement)
  ├─> Proxies API requests to 3001
  └─> User accesses: http://localhost:5173

Port 3001: Backend API Server ✅
  ├─> Express REST API
  ├─> Claude Code SDK integration
  ├─> WebSocket server (/ws)
  └─> Health checks, status endpoints

Port 8080: NOT USED ❌
  ├─> Old/incorrect configuration
  └─> REMOVE from all configs
```

### 5.2 Network Protocols

```
┌──────────────────────────────────────────────────┐
│            PROTOCOL ARCHITECTURE                 │
└──────────────────────────────────────────────────┘

HTTP/HTTPS (REST API):
  Frontend → Backend
  ├─> POST /api/claude-code/streaming-chat
  ├─> GET /health
  ├─> GET /status
  └─> Standard HTTP request/response

WebSocket (Real-time):
  Frontend ↔ Backend
  ├─> ws://localhost:3001/ws
  ├─> Bidirectional communication
  ├─> Streaming messages
  └─> Status updates

CORS (Cross-Origin):
  Origin: http://localhost:5173
  Target: http://localhost:3001
  ├─> Vite proxy: changeOrigin: true
  ├─> Backend whitelist includes 5173
  └─> Credentials: true
```

---

## 6. Data Architecture

### 6.1 Request Data Structure

```typescript
// AviDMService sends this structure
interface ClaudeRequest {
  id: string;                    // Generated request ID
  message: string;               // User's message (sanitized)
  context: ProjectContext;       // Serialized project context
  sessionId: string;             // Current session ID
  timestamp: string;             // ISO timestamp
  options: {
    temperature?: number;
    maxTokens?: number;
    stream: boolean;
    systemPrompt?: string;
    cwd: string;                 // Project working directory
    enableTools: boolean;
  };
}
```

### 6.2 Response Data Structure

```typescript
// Backend returns this structure
interface ClaudeResponse {
  id: string;                    // Response ID
  requestId: string;             // Matches request ID
  content: string;               // Claude's response text
  status: 'success' | 'error';   // Request status
  metadata: {
    model: string;               // Claude model used
    tokensUsed: number;          // Token count
    processingTime: number;      // Response time (ms)
    suggestions?: string[];      // Optional suggestions
  };
}
```

### 6.3 Session Data Structure

```typescript
interface ConversationSession {
  id: string;                    // Session ID
  projectId: string;             // Project identifier
  projectPath: string;           // Filesystem path
  startTime: string;             // Session start
  lastActivity: string;          // Last message time
  messageCount: number;          // Total messages
  context: ProjectContext;       // Current context
  preferences: SessionPreferences;
  isActive: boolean;             // Session state
}
```

---

## 7. Error Handling Architecture

### 7.1 Error Flow

```
┌────────────────────────────────────────────────────┐
│            ERROR HANDLING LAYERS                   │
└────────────────────────────────────────────────────┘

Layer 1: NETWORK ERRORS
───────────────────────
  Connection refused, timeout, DNS failure
  ├─> Caught by HttpClient
  ├─> Wrapped in HttpError
  └─> Passed to ErrorHandler

Layer 2: HTTP ERRORS
────────────────────
  400, 403, 404, 500, etc.
  ├─> Caught by HttpClient
  ├─> Status code and message extracted
  └─> Passed to ErrorHandler

Layer 3: APPLICATION ERRORS
───────────────────────────
  Rate limiting, validation, etc.
  ├─> Caught by AviDMService
  ├─> Converted to ClaudeCodeError
  └─> Passed to ErrorHandler

Layer 4: FALLBACK HANDLING
──────────────────────────
  If config.fallback.enableOfflineMode:
  ├─> Generate fallback response
  ├─> Return cached/default content
  └─> User sees partial functionality

Layer 5: UI ERROR DISPLAY
─────────────────────────
  ├─> Error event emitted
  ├─> React component catches
  └─> User sees error message
```

### 7.2 Error Handler Architecture

```
┌──────────────────────────────────────────────────┐
│               ErrorHandler                       │
│                                                  │
│  handleError(error, context)                     │
│    ├─> Classify error type                      │
│    ├─> Log error details                        │
│    ├─> Enrich with context                      │
│    ├─> Determine severity                       │
│    └─> Return ClaudeCodeError                   │
│                                                  │
│  generateFallbackResponse(message, context)      │
│    ├─> Check offline mode enabled               │
│    ├─> Search cached responses                  │
│    ├─> Generate default response                │
│    └─> Return fallback                          │
│                                                  │
│  enableOfflineMode()                             │
│    ├─> Activate offline state                   │
│    ├─> Load cached data                         │
│    └─> Emit offline event                       │
└──────────────────────────────────────────────────┘
```

---

## 8. Security Architecture

### 8.1 Security Layers

```
┌────────────────────────────────────────────────────┐
│            SECURITY ARCHITECTURE                   │
└────────────────────────────────────────────────────┘

Layer 1: CORS PROTECTION
────────────────────────
Backend CORS middleware:
  ├─> Whitelist: ['http://localhost:5173', ...]
  ├─> Rejects unauthorized origins
  └─> Prevents XSS attacks

Layer 2: CONTENT SANITIZATION
──────────────────────────────
SecurityManager.sanitizeContent():
  ├─> Removes malicious scripts
  ├─> Escapes HTML entities
  └─> Validates input format

Layer 3: RATE LIMITING
──────────────────────
SecurityManager.checkRateLimit():
  ├─> messagesPerMinute: 30
  ├─> tokensPerHour: 50000
  └─> Prevents abuse

Layer 4: SESSION VALIDATION
───────────────────────────
  ├─> Session ID verification
  ├─> Timeout management
  └─> Cleanup expired sessions
```

---

## 9. Testing Architecture

### 9.1 Test Pyramid

```
┌────────────────────────────────────────────────────┐
│              TEST ARCHITECTURE                     │
└────────────────────────────────────────────────────┘

                    ╱╲
                   ╱  ╲
                  ╱ E2E ╲        Level 3: E2E Tests
                 ╱  Tests ╲      - Full user workflows
                ╱──────────╲     - Browser automation
               ╱            ╲    - Network validation
              ╱ Integration  ╲   Level 2: Integration Tests
             ╱     Tests      ╲  - Service ↔ Backend
            ╱──────────────────╲ - API connectivity
           ╱                    ╲ - CORS validation
          ╱      Unit Tests      ╲ Level 1: Unit Tests
         ╱                        ╲ - Individual functions
        ╱__________________________╲ - Configuration logic
                                    - URL construction
```

### 9.2 Test Coverage Map

```
┌──────────────────────────────────────────────────┐
│          TEST COVERAGE ARCHITECTURE              │
└──────────────────────────────────────────────────┘

UNIT TESTS:
  ├─> AviDMService.mergeWithDefaults()
  ├─> URL construction logic
  ├─> Configuration override
  └─> Error handling

INTEGRATION TESTS:
  ├─> HTTP request to backend
  ├─> Response parsing
  ├─> CORS validation
  └─> Session management

E2E TESTS:
  ├─> UI interaction
  ├─> Message send/receive
  ├─> Network inspection
  └─> Error display
```

---

## 10. Deployment Architecture

### 10.1 Development Environment

```
┌────────────────────────────────────────────────────┐
│        DEVELOPMENT ARCHITECTURE (Current)          │
└────────────────────────────────────────────────────┘

┌─────────────────┐         ┌─────────────────┐
│  Vite Dev       │  Proxy  │  Backend API    │
│  Server         │◄───────►│  Server         │
│  Port: 5173     │         │  Port: 3001     │
└─────────────────┘         └─────────────────┘
        │                            │
        │                            │
        ↓                            ↓
  React App                    Express + Claude SDK
  Hot Reload                   Direct execution
```

### 10.2 Production Architecture (Future)

```
┌────────────────────────────────────────────────────┐
│        PRODUCTION ARCHITECTURE (Planned)           │
└────────────────────────────────────────────────────┘

┌─────────────────┐         ┌─────────────────┐
│  Static Files   │         │  Backend API    │
│  (Nginx/CDN)    │         │  (Load Balanced)│
│  Port: 443      │         │  Port: 443      │
└─────────────────┘         └─────────────────┘
        │                            │
        │                            │
        ↓                            ↓
  Served via HTTPS            HTTPS + WSS
  baseUrl: 'https://api.production.com'
```

---

## SPARC Phase 3 Complete

**Status**: ✅ Architecture Complete
**Next Phase**: Phase 4 - Refinement (TDD Implementation)

**Key Architecture Decisions**:
1. ✅ Fix baseUrl to remove `/api` suffix
2. ✅ Keep HttpClient URL construction unchanged (already correct)
3. ✅ Leverage existing Vite proxy (already configured for port 3001)
4. ✅ Maintain all security and error handling layers
5. ✅ Zero backend modifications required

**Architecture Impact**:
- Minimal: Single line change in configuration
- High correctness: Fixes double `/api` prefix issue
- Backward compatible: Config override still works
- Future-proof: Production URLs can be injected

---

**Document Version**: 1.0
**Last Updated**: 2025-10-20
**Author**: SPARC Orchestrator Agent
**Review Status**: Ready for Phase 4
