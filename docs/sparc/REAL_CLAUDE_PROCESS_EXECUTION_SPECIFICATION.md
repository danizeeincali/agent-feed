# SPARC Specification: Real Claude Process Execution Architecture

## 1. INTRODUCTION

### 1.1 Purpose
Transform the current mock Claude instance system into a real process spawning and management architecture that executes actual `claude` commands with proper process lifecycle management, I/O handling, and resource management.

### 1.2 Scope
- Real process spawning via Node.js child_process
- Process state management and monitoring  
- Terminal I/O integration with SSE streaming
- Resource management and cleanup
- Error handling and recovery
- Multi-instance concurrent execution

### 1.3 Current State Analysis
**Mock Implementation Issues:**
- Fake PIDs generated randomly (2426, 3891)
- Simulated terminal responses from hardcoded strings
- No actual Claude process execution
- Button commands stored as metadata but not executed
- SSE streams with mock terminal output

## 2. FUNCTIONAL REQUIREMENTS

### 2.1 Process Spawning (FR-001)
**Priority:** Critical
**Description:** System shall spawn real Claude processes with correct arguments
**Acceptance Criteria:**
- FR-001.1: Button click triggers real `spawn()` call
- FR-001.2: Process arguments correctly mapped from button type
- FR-001.3: Process spawned in correct working directory
- FR-001.4: Real PID returned and tracked

**Command Mapping:**
```javascript
const commandMap = {
  'prod': {
    command: ['claude'],
    cwd: '/workspaces/agent-feed/prod'
  },
  'skip-permissions': {
    command: ['claude', '--dangerously-skip-permissions'],
    cwd: '/workspaces/agent-feed/prod'
  },
  'skip-permissions-c': {
    command: ['claude', '--dangerously-skip-permissions', '-c'],
    cwd: '/workspaces/agent-feed/prod'
  },
  'skip-permissions-resume': {
    command: ['claude', '--dangerously-skip-permissions', '--resume'],
    cwd: '/workspaces/agent-feed/prod'
  }
};
```

### 2.2 Process Lifecycle Management (FR-002)
**Priority:** Critical
**Description:** System shall manage complete process lifecycle
**Acceptance Criteria:**
- FR-002.1: Process states: 'spawning' → 'running' → 'terminated'/'error'
- FR-002.2: Process registry tracks all active processes
- FR-002.3: Proper cleanup on process termination
- FR-002.4: Process health monitoring

**Process Registry Schema:**
```typescript
interface ProcessInstance {
  instanceId: string;
  process: ChildProcess;
  pid: number;
  status: 'spawning' | 'running' | 'terminated' | 'error';
  startTime: Date;
  command: string[];
  workingDirectory: string;
  lastActivity: Date;
}
```

### 2.3 Terminal I/O Integration (FR-003)
**Priority:** Critical
**Description:** System shall forward user input to processes and stream output via SSE
**Acceptance Criteria:**
- FR-003.1: User input → process.stdin with proper encoding
- FR-003.2: Process stdout/stderr → SSE broadcast in real-time
- FR-003.3: Input echo handling for responsive UI
- FR-003.4: ANSI escape sequence preservation

**I/O Flow:**
```
User Input → Frontend → HTTP POST → Backend → process.stdin
Process stdout/stderr → Backend SSE → Frontend → Terminal Display
```

### 2.4 Multi-Instance Management (FR-004)
**Priority:** High
**Description:** System shall support concurrent Claude processes
**Acceptance Criteria:**
- FR-004.1: Multiple instances with unique PIDs
- FR-004.2: Independent I/O streams per instance
- FR-004.3: Resource isolation between instances
- FR-004.4: Selective termination capability

## 3. NON-FUNCTIONAL REQUIREMENTS

### 3.1 Performance (NFR-001)
- NFR-001.1: Process spawn time < 2 seconds
- NFR-001.2: I/O latency < 100ms for 95% of operations
- NFR-001.3: Support up to 10 concurrent Claude instances
- NFR-001.4: Memory usage monitoring and limits

### 3.2 Reliability (NFR-002)
- NFR-002.1: Process crash recovery mechanisms
- NFR-002.2: 99.9% process spawn success rate
- NFR-002.3: Graceful handling of process failures
- NFR-002.4: Resource leak prevention

### 3.3 Security (NFR-003)
- NFR-003.1: Process isolation via working directories
- NFR-003.2: Input sanitization for process stdin
- NFR-003.3: Resource limits per process
- NFR-003.4: Secure cleanup of sensitive data

### 3.4 Maintainability (NFR-004)
- NFR-004.1: Comprehensive error logging
- NFR-004.2: Process state debugging capabilities
- NFR-004.3: Performance metrics collection
- NFR-004.4: Configuration management

## 4. SYSTEM ARCHITECTURE

### 4.1 Process Management Layer
```typescript
class RealClaudeProcessManager {
  private processes: Map<string, ProcessInstance>;
  private sseConnections: Map<string, Response[]>;
  
  async spawnClaudeProcess(config: ProcessConfig): Promise<ProcessInstance>;
  async terminateProcess(instanceId: string): Promise<void>;
  getProcessStatus(instanceId: string): ProcessStatus;
  broadcastToSSE(instanceId: string, data: any): void;
}
```

### 4.2 I/O Handler Layer
```typescript
class ProcessIOHandler {
  constructor(process: ChildProcess, instanceId: string);
  
  setupStdoutHandler(): void;
  setupStderrHandler(): void;
  setupStdinPipe(): void;
  handleProcessExit(): void;
  sendInput(input: string): void;
}
```

### 4.3 SSE Broadcasting Layer
```typescript
class ProcessSSEBroadcaster {
  private connections: Map<string, Response[]>;
  
  addConnection(instanceId: string, response: Response): void;
  removeConnection(instanceId: string, response: Response): void;
  broadcast(instanceId: string, event: SSEEvent): void;
  broadcastProcessStatus(instanceId: string, status: ProcessStatus): void;
}
```

## 5. API SPECIFICATION

### 5.1 Process Creation Endpoint
```yaml
POST /api/claude/instances
Content-Type: application/json

Request:
{
  "command": ["claude", "--dangerously-skip-permissions"],
  "workingDirectory": "/workspaces/agent-feed/prod",
  "type": "skip-permissions"
}

Response:
{
  "success": true,
  "instanceId": "claude-real-1234",
  "pid": 5678,
  "status": "spawning",
  "startTime": "2024-08-27T10:30:00Z"
}
```

### 5.2 Process Termination Endpoint
```yaml
DELETE /api/claude/instances/{instanceId}

Response:
{
  "success": true,
  "instanceId": "claude-real-1234", 
  "terminatedAt": "2024-08-27T10:35:00Z",
  "reason": "user_request"
}
```

### 5.3 Terminal Input Endpoint
```yaml
POST /api/claude/instances/{instanceId}/terminal/input
Content-Type: application/json

Request:
{
  "input": "help\n"
}

Response:
{
  "success": true,
  "instanceId": "claude-real-1234",
  "input": "help\n",
  "timestamp": "2024-08-27T10:32:00Z"
}
```

### 5.4 SSE Event Stream
```yaml
GET /api/claude/instances/{instanceId}/terminal/stream
Content-Type: text/event-stream

Events:
- process:starting
- process:running  
- process:output
- process:error
- process:terminated
```

## 6. DATA MODELS

### 6.1 Process Instance
```typescript
interface ProcessInstance {
  instanceId: string;        // Unique identifier
  process: ChildProcess;     // Node.js ChildProcess object
  pid: number;              // Real system PID
  status: ProcessStatus;    // Current process state
  startTime: Date;          // Process start timestamp
  command: string[];        // Executed command array
  workingDirectory: string; // Process CWD
  lastActivity: Date;       // Last I/O activity
  metadata: {
    type: string;           // Button type that created instance
    buttonLabel: string;    // Original button text
  };
}
```

### 6.2 Process Status
```typescript
type ProcessStatus = 
  | 'spawning'    // Process creation initiated
  | 'running'     // Process active and responsive
  | 'terminated'  // Process ended normally
  | 'error'       // Process crashed or failed
  | 'zombie';     // Process ended but not cleaned up
```

### 6.3 SSE Event
```typescript
interface SSEEvent {
  type: string;
  instanceId: string;
  timestamp: string;
  data?: any;
  error?: string;
}
```

## 7. ERROR HANDLING & EDGE CASES

### 7.1 Process Spawn Failures
**Scenario:** Claude command not found or execution fails
**Handling:**
- Log detailed error with system diagnostics
- Broadcast 'process:error' SSE event
- Update instance status to 'error'
- Provide user-friendly error message
- Clean up allocated resources

### 7.2 Process Crashes
**Scenario:** Claude process exits unexpectedly
**Handling:**
- Capture exit code and signal
- Broadcast final output if any
- Update status to 'terminated' or 'error'
- Clean up I/O streams and SSE connections
- Log crash details for debugging

### 7.3 I/O Pipe Failures
**Scenario:** stdin/stdout/stderr pipes break
**Handling:**
- Detect broken pipe errors
- Attempt to recover readable streams
- Notify frontend of connection issues
- Fall back to polling if SSE fails

### 7.4 Resource Exhaustion
**Scenario:** Too many processes or memory limits exceeded
**Handling:**
- Implement process limits (max 10 concurrent)
- Monitor memory usage per process
- Force terminate oldest processes if needed
- Queue new requests if at capacity

## 8. TESTING STRATEGY

### 8.1 Unit Tests
```typescript
describe('RealClaudeProcessManager', () => {
  test('should spawn process with correct arguments');
  test('should track process in registry');
  test('should handle process termination');
  test('should clean up resources on exit');
});

describe('ProcessIOHandler', () => {
  test('should forward stdin input to process');
  test('should broadcast stdout via SSE');
  test('should handle ANSI escape sequences');
  test('should detect process exit');
});
```

### 8.2 Integration Tests
```typescript
describe('Claude Process Integration', () => {
  test('end-to-end: spawn → input → output → terminate');
  test('multiple concurrent instances');
  test('SSE streaming with real process output');
  test('process crash recovery');
});
```

### 8.3 E2E Tests
```typescript
describe('Frontend Integration', () => {
  test('button click creates real process');
  test('terminal input reaches Claude process');
  test('real Claude responses display in UI');
  test('process termination removes from UI');
});
```

### 8.4 Performance Tests
- Process spawn latency under load
- Concurrent I/O handling (10 instances)
- Memory usage monitoring
- SSE connection scalability

## 9. IMPLEMENTATION PHASES

### Phase A: Core Process Management
**Duration:** 2-3 days
**Deliverables:**
- RealClaudeProcessManager class
- Process spawning with real PIDs
- Basic lifecycle management
- Process registry implementation

### Phase B: I/O Integration
**Duration:** 2-3 days  
**Deliverables:**
- ProcessIOHandler implementation
- Stdin forwarding functionality
- Stdout/stderr SSE broadcasting
- Terminal integration testing

### Phase C: Error Handling & Monitoring
**Duration:** 1-2 days
**Deliverables:**
- Comprehensive error handling
- Process health monitoring
- Resource management
- Logging and debugging tools

### Phase D: Testing & Validation
**Duration:** 1-2 days
**Deliverables:**
- Complete test suite
- Performance benchmarks
- E2E validation
- Documentation updates

## 10. VALIDATION CRITERIA

### 10.1 Success Metrics
- ✅ Button click spawns real Claude process (verifiable via `ps`)
- ✅ Real PID matches system process list
- ✅ Terminal input reaches Claude stdin
- ✅ Claude output streams to frontend in real-time
- ✅ Process termination cleans up all resources
- ✅ Multiple concurrent instances work independently
- ✅ Error states handled gracefully
- ✅ No memory leaks or zombie processes

### 10.2 Performance Benchmarks
- Process spawn: < 2 seconds
- I/O latency: < 100ms
- Concurrent instances: 10 processes
- Memory usage: < 100MB per process
- SSE throughput: > 1000 events/second

## 11. RISK MITIGATION

### 11.1 Technical Risks
- **Claude binary not available:** Implement fallback with detailed error
- **Permission issues:** Provide clear setup instructions
- **Resource limits:** Implement process quotas and monitoring
- **I/O blocking:** Use non-blocking streams and timeouts

### 11.2 Operational Risks
- **Process zombies:** Implement cleanup automation
- **Memory leaks:** Regular resource monitoring and limits
- **Connection storms:** SSE connection pooling and limits
- **Debugging complexity:** Comprehensive logging and state inspection

## CONCLUSION

This specification provides a comprehensive blueprint for transforming mock Claude instances into real process execution. The phased approach ensures systematic implementation with proper testing and validation at each stage. Success will be measured by real system processes being spawned, managed, and cleanly terminated while providing seamless terminal integration for users.