# SPARC Specification: Real Claude Terminal I/O Streaming

## Phase 1: Specification - Requirements Analysis

### Problem Statement
The frontend-backend terminal pipe connection is broken where:
- Backend successfully spawns Claude processes in `/workspaces/agent-feed/prod`
- Frontend terminal shows hardcoded mock responses instead of real Claude stdout/stderr
- Input forwarding works but no authentic output streams back
- Frontend displays "[RESPONSE] Claude Code session started" instead of actual Claude output

### Current System Analysis

#### Backend Analysis (`simple-backend.js`)
✅ **Working Components:**
- Real Claude process spawning with `spawn()` API
- Proper SSE endpoint setup at `/api/claude/instances/:instanceId/terminal/stream`
- Process stdout/stderr event handlers configured
- `broadcastToAllConnections()` function exists for SSE streaming

❌ **Broken Components:**
- Mock terminal response system instead of real process output
- SSE connections tracking but not receiving real process data
- Hardcoded terminal responses in `processTerminalCommand()` function
- Terminal input forwarding works but output is mocked

#### Frontend Analysis (`ClaudeInstanceManager.tsx` & `useHTTPSSE.ts`)
✅ **Working Components:**
- SSE connection establishment via `connectSSE()`
- Terminal input sending via `/api/claude/instances/:instanceId/terminal/input`
- Event handlers for `terminal:output` events

❌ **Broken Components:**
- Receives mock responses instead of real Claude process output
- No direct pipe connection to actual Claude stdout/stderr streams

### Requirements

#### Functional Requirements
1. **Real Process Output Streaming**: Frontend must display actual Claude process stdout/stderr
2. **Elimination of Mock Responses**: Remove all hardcoded terminal responses
3. **Bidirectional I/O**: Input forwarding and output streaming must work seamlessly  
4. **Process State Sync**: Terminal status must reflect actual Claude process state
5. **Error Stream Handling**: Both stdout and stderr must be captured and displayed

#### Non-Functional Requirements
1. **Real-time Performance**: Output must appear within 100ms of process generation
2. **Connection Reliability**: SSE connection must handle reconnections gracefully
3. **Memory Efficiency**: No output buffering or memory leaks
4. **Error Recovery**: System must handle process crashes and restarts

### Success Criteria
- [ ] Frontend displays actual Claude command responses, not mock text
- [ ] Terminal shows real working directory and file system state
- [ ] Commands like `ls`, `pwd`, `cd` reflect actual file system
- [ ] Claude error messages and prompts appear in real-time
- [ ] No "[RESPONSE]" prefixed mock messages in terminal output

## Phase 2: Pseudocode - Algorithm Design

### Core Algorithm: Real-Time Process Output Streaming

```pseudocode
ALGORITHM: StreamRealClaudeOutput
INPUT: claudeProcessInstance, sseConnectionsMap
OUTPUT: Real-time terminal output to frontend

BEGIN
  // Setup process output handlers
  claudeProcess.stdout.on('data', (data) => {
    rawOutput = data.toString()
    
    // Broadcast to all connected SSE clients
    FOR EACH connection IN sseConnectionsMap[instanceId]:
      sseMessage = {
        type: 'terminal:output',
        data: rawOutput,
        timestamp: getCurrentTimestamp(),
        source: 'stdout'
      }
      connection.write(`data: ${JSON.stringify(sseMessage)}\n\n`)
  })
  
  claudeProcess.stderr.on('data', (data) => {
    errorOutput = data.toString()
    
    // Broadcast error output to SSE clients
    FOR EACH connection IN sseConnectionsMap[instanceId]:
      sseMessage = {
        type: 'terminal:error',
        data: errorOutput,
        timestamp: getCurrentTimestamp(),
        source: 'stderr'
      }
      connection.write(`data: ${JSON.stringify(sseMessage)}\n\n`)
  })
END
```

### Input Processing Algorithm

```pseudocode
ALGORITHM: ProcessRealClaudeInput
INPUT: instanceId, userInput, claudeProcessMap
OUTPUT: Command forwarded to real process

BEGIN
  claudeProcess = claudeProcessMap.get(instanceId)
  
  IF claudeProcess AND claudeProcess.status === 'running':
    // Forward input directly to Claude process stdin
    claudeProcess.stdin.write(userInput + '\n')
    
    // Echo input to frontend (terminal behavior)
    broadcastEcho(instanceId, userInput)
  ELSE:
    sendError(instanceId, "Process not running")
  END IF
END
```

### Mock Response Elimination Algorithm

```pseudocode
ALGORITHM: EliminateMockResponses
INPUT: backendCode
OUTPUT: Clean real-process-only code

BEGIN
  // Remove mock terminal functions
  REMOVE processTerminalCommand()
  REMOVE processTerminalInput()
  REMOVE hardcoded response mappings
  
  // Replace mock handlers with real process handlers
  REPLACE mock_output_generation WITH real_process_stdout_streaming
  REPLACE static_responses WITH dynamic_process_output
END
```

## Phase 3: Architecture - System Design

### Component Architecture

```
┌─────────────────────────────────────────────────────────────────┐
│                        Frontend Layer                          │
├─────────────────────────────────────────────────────────────────┤
│  ClaudeInstanceManager.tsx                                      │
│  ├── Terminal Display (output rendering)                       │
│  ├── Input Handler (command sending)                           │
│  └── SSE Event Listeners (real-time updates)                   │
├─────────────────────────────────────────────────────────────────┤
│  useHTTPSSE.ts Hook                                            │
│  ├── SSE Connection Management                                  │
│  ├── Event Handler Registration                                │
│  └── Input/Output Message Routing                              │
└─────────────────────────────────────────────────────────────────┘
                                │
                        HTTP/SSE Protocol
                                │
┌─────────────────────────────────────────────────────────────────┐
│                        Backend Layer                           │
├─────────────────────────────────────────────────────────────────┤
│  simple-backend.js                                             │
│  ├── SSE Endpoint (/api/claude/instances/:id/terminal/stream)  │
│  ├── Input Endpoint (/api/claude/instances/:id/terminal/input) │
│  └── Process Management (activeProcesses Map)                  │
├─────────────────────────────────────────────────────────────────┤
│  Real Claude Process Integration                                │
│  ├── Process Spawning (spawn('claude', args))                  │
│  ├── stdout/stderr Event Handlers                              │
│  ├── stdin Input Forwarding                                    │
│  └── Process Lifecycle Management                              │
└─────────────────────────────────────────────────────────────────┘
                                │
                        Node.js child_process
                                │
┌─────────────────────────────────────────────────────────────────┐
│                    Real Claude Process                          │
├─────────────────────────────────────────────────────────────────┤
│  claude --dangerously-skip-permissions                         │
│  ├── stdin  ← User input from frontend                         │
│  ├── stdout → Real responses to frontend                       │
│  └── stderr → Error messages to frontend                       │
└─────────────────────────────────────────────────────────────────┘
```

### Data Flow Architecture

```
User Input:
Frontend Input → HTTP POST → Backend → claude.stdin

Real Output:
claude.stdout → Backend SSE Broadcast → Frontend Display
claude.stderr → Backend SSE Broadcast → Frontend Display (error)
```

### Interface Contracts

#### SSE Message Format
```typescript
interface RealTerminalMessage {
  type: 'terminal:output' | 'terminal:error' | 'terminal:echo'
  data: string                    // Raw process output
  instanceId: string             // Claude process identifier
  timestamp: string              // ISO timestamp
  source: 'stdout' | 'stderr'    // Output source
  processInfo?: {                // Optional process metadata
    pid: number
    workingDirectory: string
    command: string
  }
}
```

#### Input Message Format
```typescript
interface TerminalInput {
  input: string      // User command + newline
  instanceId: string // Target Claude process
}
```

### Error Handling Strategy

1. **Process Crash Recovery**: Automatic process restart with state notification
2. **SSE Connection Loss**: Automatic reconnection with exponential backoff  
3. **Input Validation**: Sanitize and validate all user input before forwarding
4. **Output Buffering**: Handle large output bursts without blocking

## Phase 4: Refinement - TDD Implementation Plan

### Test Coverage Strategy

#### Unit Tests
- [ ] Real process output capture and SSE broadcasting
- [ ] Input forwarding to actual Claude process stdin  
- [ ] Mock response elimination verification
- [ ] SSE connection lifecycle management

#### Integration Tests
- [ ] End-to-end input→process→output flow
- [ ] Multiple concurrent Claude instances
- [ ] SSE reconnection during active processes
- [ ] Process termination and cleanup

#### Acceptance Tests
- [ ] User can see real `ls` command output
- [ ] `cd` commands change actual working directory
- [ ] Claude prompts and responses are authentic
- [ ] Error messages from Claude appear correctly

### Performance Requirements

1. **Output Latency**: < 100ms from process output to frontend display
2. **Memory Usage**: < 50MB per active Claude process connection
3. **Connection Limit**: Support up to 10 concurrent Claude instances
4. **Reconnection Time**: < 2 seconds for SSE reconnection

## Phase 5: Completion - Implementation Roadmap

### Implementation Phases

#### Phase 4.1: Backend Real Process Integration
1. Remove mock terminal response functions
2. Connect real stdout/stderr handlers to SSE broadcasting
3. Implement process health monitoring
4. Add proper error handling and logging

#### Phase 4.2: Frontend Output Processing  
1. Update event handlers to process real terminal data
2. Remove mock response handling code
3. Implement proper terminal display formatting
4. Add error state visualization

#### Phase 4.3: Testing and Validation
1. Create comprehensive test suite
2. Validate real Claude interaction
3. Performance testing and optimization  
4. User acceptance testing

#### Phase 4.4: Documentation and Deployment
1. Update API documentation
2. Create deployment guides
3. Monitor production performance
4. Gather user feedback

### Validation Criteria

The implementation is complete when:
- Frontend shows actual Claude responses, not mock text
- Terminal commands reflect real file system state
- No hardcoded "[RESPONSE]" messages appear
- Claude error messages display correctly
- SSE connection handles reconnections gracefully
- System supports multiple concurrent Claude instances

### Deployment Plan

1. **Staging Deployment**: Test with development Claude instances
2. **Integration Testing**: Validate frontend-backend communication
3. **Performance Testing**: Load test with multiple connections
4. **Production Deployment**: Gradual rollout with monitoring
5. **Post-deployment Monitoring**: Track connection stability and performance