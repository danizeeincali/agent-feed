# SPARC ARCHITECTURE PHASE - System Dependency Mapping

## System Architecture Overview

```
┌─────────────────────────────────────────────────────────────────────┐
│                        CLAUDE CODE TERMINAL INTEGRATION             │
├─────────────────────────────────────────────────────────────────────┤
│                                                                     │
│  ┌─────────────────────┐    ┌─────────────────────┐                 │
│  │     FRONTEND        │    │      BACKEND        │                 │
│  │   React + TypeScript│    │   Node.js Express   │                 │
│  │                     │    │                     │                 │
│  │ ┌─────────────────┐ │    │ ┌─────────────────┐ │                 │
│  │ │ Terminal.tsx    │ │    │ │simple-backend.js│ │                 │
│  │ │                 │ │    │ │                 │ │                 │
│  │ │ ┌─────────────┐ │ │    │ │ ┌─────────────┐ │ │                 │
│  │ │ │xterm.js     │ │ │    │ │ │Process Mgmt │ │ │                 │
│  │ │ │Terminal     │ │ │◄───┤ │ │             │ │ │                 │
│  │ │ │Component    │ │ │    │ │ │activeProcesses│ │                 │
│  │ │ └─────────────┘ │ │    │ │ │Map          │ │ │                 │
│  │ │                 │ │    │ │ └─────────────┘ │ │                 │
│  │ │ ┌─────────────┐ │ │    │ │                 │ │                 │
│  │ │ │Loading      │ │ │    │ │ ┌─────────────┐ │ │                 │
│  │ │ │Animation    │ │ │    │ │ │WebSocket    │ │ │                 │
│  │ │ │State        │ │ │◄───┤ │ │Server       │ │ │                 │
│  │ │ └─────────────┘ │ │    │ │ │             │ │ │                 │
│  │ │                 │ │    │ │ └─────────────┘ │ │                 │
│  │ │ ┌─────────────┐ │ │    │ │                 │ │                 │
│  │ │ │Permission   │ │ │    │ │ ┌─────────────┐ │ │                 │
│  │ │ │Request      │ │ │◄───┤ │ │Tool Call    │ │ │                 │
│  │ │ │Handler      │ │ │    │ │ │Formatter    │ │ │                 │
│  │ │ └─────────────┘ │ │    │ │ └─────────────┘ │ │                 │
│  │ └─────────────────┘ │    │ └─────────────────┘ │                 │
│  │                     │    │                     │                 │
│  │ ┌─────────────────┐ │    │ ┌─────────────────┐ │                 │
│  │ │useWebSocketTerm │ │    │ │Directory        │ │                 │
│  │ │Hook             │ │◄───┤ │Resolver         │ │                 │
│  │ │                 │ │    │ │                 │ │                 │
│  │ │ ┌─────────────┐ │ │    │ │ ┌─────────────┐ │ │                 │
│  │ │ │Connection   │ │ │    │ │ │CLAUDE_      │ │ │                 │
│  │ │ │Manager      │ │ │◄───┤ │ │COMMANDS     │ │ │                 │
│  │ │ └─────────────┘ │ │    │ │ │Config       │ │ │                 │
│  │ └─────────────────┘ │    │ │ └─────────────┘ │ │                 │
│  └─────────────────────┘    │ └─────────────────┘ │                 │
│                             │                     │                 │
│                             │ ┌─────────────────┐ │                 │
│                             │ │Real Claude CLI  │ │                 │
│                             │ │Processes        │ │                 │
│                             │ │                 │ │                 │
│                             │ │ ┌─────────────┐ │ │                 │
│                             │ │ │Process PID: │ │ │                 │
│                             │ │ │7297, 1449   │ │ │                 │
│                             │ │ └─────────────┘ │ │                 │
│                             │ │                 │ │                 │
│                             │ │ ┌─────────────┐ │ │                 │
│                             │ │ │node-pty     │ │ │                 │
│                             │ │ │Integration  │ │ │                 │
│                             │ │ └─────────────┘ │ │                 │
│                             │ └─────────────────┘ │                 │
│                             └─────────────────────┘                 │
└─────────────────────────────────────────────────────────────────────┘
```

## Component Dependencies Matrix

### Critical Integration Points

| Component | Dependencies | Interfaces | Data Flow |
|-----------|-------------|-----------|-----------|
| **Terminal.tsx** | xterm.js, useWebSocketTerminal, ToolCallFormatter | React Props, DOM Events, WebSocket Messages | UI Events → WebSocket → Backend → Claude CLI |
| **useWebSocketTerminal** | WebSocket API, ClaudeOutputParser | Hook Interface, Event Handlers | Connection Management, Message Routing |
| **simple-backend.js** | Express, node-pty, WebSocket Server | HTTP API, WebSocket Protocol | Process Management, I/O Routing |
| **ToolCallFormatter** | Output Parsing Logic | Static Methods | Raw Output → Formatted Display |
| **Real Claude CLI** | System Process, File System | stdin/stdout/stderr | Command Processing, AI Responses |

## Data Flow Architecture

### 1. Button Click → Instance Creation Flow

```
User Click → Frontend Button
    ↓
React Event Handler
    ↓
HTTP POST /api/claude/instances
    ↓
Express Route Handler
    ↓
DirectoryResolver.extractDirectoryHint()
    ↓
spawn() with CLAUDE_COMMANDS[type]
    ↓
node-pty.spawn()
    ↓
Real Claude Process (PID assigned)
    ↓
activeProcesses.set(instanceId, process)
    ↓
HTTP Response {instanceId, pid, status}
    ↓
Frontend State Update
    ↓
UI Refresh (loading → success)
```

### 2. Command Input → Processing Flow

```
Terminal Input (xterm.js)
    ↓
onData Event Handler
    ↓
WebSocket.send({type: 'input', data: command})
    ↓
WebSocket Server Message Handler
    ↓
node-pty process.write(command)
    ↓
Real Claude CLI stdin
    ↓ [Processing by Claude AI]
Claude CLI stdout/stderr
    ↓
node-pty data event
    ↓
ToolCallFormatter.formatOutputWithToolCalls()
    ↓
WebSocket.send({type: 'data', data: formatted})
    ↓
WebSocket Client Message Handler
    ↓
Terminal.write(formattedData)
    ↓
User Sees Response
```

### 3. Loading Animation Flow

```
Command Sent
    ↓
setLoadingAnimation({isActive: true})
    ↓
React State Update
    ↓
Loading Overlay Displayed
    ↓
WebSocket Message: type: 'loading'
    ↓
Loading State Update
    ↓
[Wait for completion...]
    ↓
WebSocket Message: isComplete: true
    ↓
setLoadingAnimation({isActive: false})
    ↓
Loading Overlay Hidden
```

### 4. Permission Request Flow

```
Claude CLI Requests Permission
    ↓
Permission Detection in Output
    ↓
WebSocket: {type: 'permission_request', message, requestId}
    ↓
setPermissionRequest({isActive: true, message, requestId})
    ↓
React State Update
    ↓
Permission Dialog Overlay Shown
    ↓
User Input (Y/N/D)
    ↓
handlePermissionResponse()
    ↓
WebSocket: {type: 'permission_response', action, requestId}
    ↓
Backend Routes Response to Claude CLI
    ↓
Permission Dialog Hidden
    ↓
Command Processing Resumes
```

## System Integration Contracts

### Frontend-Backend API Contract

```typescript
// Instance Management
POST /api/claude/instances
Request: { type: string, command?: string, workingDirectory?: string }
Response: { instanceId: string, pid: number, status: string }

GET /api/claude/instances  
Response: Array<{ id: string, name: string, status: string }>

DELETE /api/claude/instances/:id
Response: { success: boolean, message: string }

// WebSocket Protocol
Connection: ws://localhost:3000/terminal/:instanceId

Messages:
- Client → Server: { type: 'input', data: string, timestamp: number }
- Server → Client: { type: 'data', data: string }
- Server → Client: { type: 'loading', message: string, isComplete: boolean }
- Server → Client: { type: 'permission_request', message: string, requestId: string }
- Client → Server: { type: 'permission_response', action: string, requestId: string }
```

### Backend-Claude CLI Integration Contract

```javascript
// Process Management
const process = pty.spawn('claude', args, {
  name: 'xterm-color',
  cols: 80,
  rows: 24,
  cwd: workingDirectory,
  env: process.env
});

// I/O Handling
process.onData((data) => {
  // Parse for tool calls, permissions, etc.
  // Format and forward via WebSocket
});

process.write(input + '\r');
```

## Critical Dependencies

### External Dependencies

| Package | Version | Purpose | Critical Path |
|---------|---------|---------|---------------|
| **xterm** | Latest | Terminal UI | User interface rendering |
| **node-pty** | Latest | Process spawning | Claude CLI integration |
| **ws** | Latest | WebSocket server | Real-time communication |
| **express** | Latest | HTTP server | API endpoints |
| **react** | Latest | Frontend framework | UI state management |

### Internal Dependencies

| Component | Critical Dependencies | Failure Impact |
|-----------|----------------------|----------------|
| **Terminal.tsx** | xterm.js, WebSocket connection | Complete terminal failure |
| **useWebSocketTerminal** | WebSocket availability, Backend up | No real-time communication |
| **Backend Process Manager** | node-pty, Claude CLI installed | No command execution |
| **Tool Call Formatter** | Output parsing logic | No tool call visualization |

## Performance Bottlenecks

### Identified Performance Risks

1. **Large Output Processing**
   - Risk: Tool call parsing on large responses
   - Mitigation: Streaming parser, chunked processing

2. **Concurrent WebSocket Connections**  
   - Risk: Memory exhaustion with many instances
   - Mitigation: Connection pooling, cleanup timers

3. **Terminal Rendering**
   - Risk: Large output causing UI lag
   - Mitigation: Virtual scrolling, output batching

4. **Process Memory**
   - Risk: Claude processes consuming system memory
   - Mitigation: Process limits, automatic cleanup

## Failure Points Analysis

### Single Points of Failure

1. **WebSocket Server Down**
   - Impact: Complete terminal functionality loss
   - Recovery: Auto-reconnection logic, fallback polling

2. **Claude CLI Process Crash**
   - Impact: Individual instance failure  
   - Recovery: Process restart, error reporting

3. **Frontend Bundle Load Failure**
   - Impact: Complete application failure
   - Recovery: CDN fallbacks, local caching

4. **Backend API Server Down**
   - Impact: No new instance creation
   - Recovery: Health checks, service restart

## Security Architecture

### Security Boundaries

```
Internet ↔ Frontend (Public)
    ↓ HTTPS
Frontend ↔ Backend API (Internal Network)
    ↓ WebSocket/HTTP
Backend ↔ Claude CLI (Local Process)
    ↓ stdin/stdout
Claude CLI ↔ File System (Restricted)
```

### Security Controls

- **Input Sanitization**: Command injection prevention
- **Process Isolation**: Separate Claude instances
- **Directory Restrictions**: Working directory validation
- **WebSocket Authentication**: Connection validation
- **Output Sanitization**: XSS prevention in terminal

## Monitoring and Observability

### Critical Metrics

1. **Instance Creation Time**: < 2 seconds
2. **Command Response Time**: < 5 seconds  
3. **WebSocket Connection Success Rate**: > 99%
4. **Memory Usage per Instance**: < 100MB
5. **Concurrent Instance Limit**: 10 active
6. **Tool Call Parse Success Rate**: > 95%

### Health Checks

- Backend API health endpoint
- WebSocket server connectivity
- Claude CLI process status
- Frontend bundle loading
- Database/state consistency

Next phase: SPARC REFINEMENT for TDD implementation.