# SPARC Phase S: Comprehensive Regression Testing Specification

## Executive Summary

**Mission**: Create bulletproof regression testing architecture to permanently lock in the current working Claude process functionality, preventing ANY regression of hard-won system stability.

**Critical Success Definition**: Zero tolerance for regression in:
- Claude process spawning and lifecycle management
- Real-time terminal I/O streaming via SSE
- Working directory resolution (SPARC-enhanced)
- Authentication detection and handling
- All 4 button types (prod/claude, skip-permissions, skip-permissions -c, skip-permissions --resume)
- PTY vs pipe process handling
- Instance status broadcasting
- Error recovery and graceful degradation

## 1. WORKING STATE DEFINITION

### 1.1 Core Functional Requirements

**CLAUDE PROCESS LIFECYCLE:**
- ✅ Real Claude CLI spawning (no mock processes)
- ✅ Dynamic working directory resolution based on instance type
- ✅ Both PTY and pipe process support
- ✅ Graceful process termination with cleanup
- ✅ Process status broadcasting via SSE

**AUTHENTICATION SYSTEM:**
- ✅ Claude Code environment detection (`CLAUDECODE=1`)
- ✅ Credentials file verification (`~/.claude/.credentials.json`)
- ✅ CLI availability fallback testing
- ✅ No hardcoded authentication bypasses

**WORKING DIRECTORY RESOLUTION:**
- ✅ SPARC-enhanced DirectoryResolver class
- ✅ Security validation (within base directory)
- ✅ Instance type to directory mapping
- ✅ Fallback to base directory on errors
- ✅ Permission validation with caching

**TERMINAL I/O STREAMING:**
- ✅ HTTP/SSE architecture (WebSocket eliminated)
- ✅ Real stdout/stderr capture and broadcast
- ✅ Input forwarding to process stdin/PTY
- ✅ Connection tracking and cleanup
- ✅ Buffered output delivery

**FRONTEND INTEGRATION:**
- ✅ 4 launch buttons with distinct configurations
- ✅ Real-time instance status updates
- ✅ Terminal output display without mock responses
- ✅ Input validation and echo handling
- ✅ Connection state management

### 1.2 Button Type Matrix

| Button | Command | Instance Type | Working Dir | Use Case |
|--------|---------|---------------|-------------|----------|
| 🚀 prod/claude | `claude` | `prod` | `/workspaces/agent-feed/prod` | Production environment |
| ⚡ skip-permissions | `claude --dangerously-skip-permissions` | `skip-permissions` | `/workspaces/agent-feed` | Development mode |
| ⚡ skip-permissions -c | `claude --dangerously-skip-permissions -c` | `skip-permissions-c` | `/workspaces/agent-feed` | Conversation mode |
| ↻ skip-permissions --resume | `claude --dangerously-skip-permissions --resume` | `skip-permissions-resume` | `/workspaces/agent-feed` | Resume session |

### 1.3 Critical Success Paths

**SUCCESS PATH 1: Instance Creation Flow**
1. User clicks any of 4 launch buttons
2. Frontend sends POST to `/api/claude/instances` with correct config
3. Backend resolves working directory using SPARC DirectoryResolver
4. Real Claude process spawned with PTY or pipes
5. Process handlers setup immediately
6. Instance status broadcasts 'starting' → 'running'
7. Frontend receives status updates via SSE
8. Terminal connection established
9. Real Claude output streams to frontend

**SUCCESS PATH 2: Terminal Interaction Flow**
1. User types command in terminal input
2. Input validation (instance ID format, not empty)
3. Input forwarded to Claude process stdin/PTY
4. Real Claude processes command
5. stdout/stderr captured and broadcast via SSE
6. Frontend displays real output (no mock responses)
7. Process remains responsive for next input

**SUCCESS PATH 3: Process Termination Flow**
1. User clicks terminate button (✕)
2. DELETE request to `/api/claude/instances/{instanceId}`
3. Graceful process termination (SIGTERM → SIGKILL)
4. SSE connections cleaned up
5. Instance removed from tracking
6. Frontend updates instance list
7. Output area cleared

### 1.4 Error Recovery Requirements

**AUTHENTICATION FAILURES:**
- Must detect and report Claude CLI unavailability
- Must not proceed with process creation on auth failure
- Must provide clear error messages to user

**DIRECTORY RESOLUTION FAILURES:**
- Must fallback to base directory on permission errors
- Must validate directory exists and is writable
- Must prevent directory traversal attacks

**PROCESS SPAWN FAILURES:**
- Must report spawn errors immediately
- Must clean up partial state on failures
- Must broadcast error status via SSE

**SSE CONNECTION FAILURES:**
- Must handle connection resets gracefully
- Must buffer output during connection gaps
- Must recover connections automatically

## 2. ANTI-PATTERN PROTECTION

### 2.1 Critical Anti-Patterns to Prevent

**NEVER ALLOW:**
- Mock Claude processes in production code paths
- Hardcoded authentication bypasses
- Directory resolution outside security boundaries
- WebSocket connections (eliminated architecture)
- Fake terminal output or mock responses
- Process spawning without proper error handling
- SSE connections without cleanup
- Instance status without validation
- Input forwarding without validation
- Process termination without cleanup

### 2.2 Regression Failure Categories

**CRITICAL (System Breaking):**
- Process spawning failures
- Authentication bypasses
- Directory traversal vulnerabilities
- Memory leaks in process tracking
- SSE connection storms

**HIGH (Functionality Breaking):**
- Terminal I/O failures
- Status broadcasting failures
- Instance lifecycle errors
- Working directory resolution errors

**MEDIUM (User Experience Impact):**
- UI status update delays
- Connection recovery delays
- Error message clarity

**LOW (Minor Issues):**
- Logging verbosity
- Performance optimizations
- UI polish

## 3. TEST COVERAGE REQUIREMENTS

### 3.1 Mandatory Test Categories

**UNIT TESTS (90%+ Coverage):**
- DirectoryResolver class methods
- Authentication detection functions
- Process lifecycle management
- SSE connection handling
- Input validation functions
- Error handling paths

**INTEGRATION TESTS (100% Critical Paths):**
- End-to-end instance creation
- Terminal I/O streaming
- Process termination cleanup
- Error recovery scenarios
- Multi-instance coordination

**E2E TESTS (100% User Workflows):**
- All 4 button launch scenarios
- Terminal interaction sequences
- Instance management workflows
- Error condition handling
- Browser compatibility

### 3.2 Performance Requirements

**RESPONSE TIMES:**
- Instance creation: < 3 seconds
- Terminal input response: < 100ms
- Status updates: < 50ms
- Process termination: < 1 second

**RESOURCE LIMITS:**
- Max concurrent instances: 10
- Memory usage per instance: < 100MB
- SSE connections per instance: < 5
- Process cleanup time: < 5 seconds

## 4. VALIDATION METRICS

### 4.1 Success Criteria

**FUNCTIONAL VALIDATION:**
- [ ] 100% of critical success paths pass
- [ ] 0% regression in existing functionality
- [ ] 100% error recovery scenarios handled
- [ ] All 4 button types work correctly
- [ ] Real Claude output streams properly

**PERFORMANCE VALIDATION:**
- [ ] All response times within limits
- [ ] No memory leaks detected
- [ ] SSE connections stable under load
- [ ] Process cleanup completes properly

**SECURITY VALIDATION:**
- [ ] No directory traversal vulnerabilities
- [ ] Authentication properly enforced
- [ ] Input validation prevents injection
- [ ] Process isolation maintained

### 4.2 Acceptance Gates

**GATE 1: Unit Test Suite**
- All unit tests pass (90%+ coverage)
- No critical anti-patterns detected
- Performance benchmarks meet requirements

**GATE 2: Integration Test Suite**
- All critical paths validated
- Error scenarios properly handled
- Multi-instance coordination works

**GATE 3: E2E Test Suite**
- All user workflows complete successfully
- Browser compatibility verified
- Production environment tested

**GATE 4: Load Testing**
- System stable under concurrent load
- Resource usage within limits
- Graceful degradation verified

## 5. IMPLEMENTATION PRIORITIES

### 5.1 Phase 1 (CRITICAL - Week 1)
- Unit tests for DirectoryResolver
- Authentication detection tests
- Process lifecycle management tests
- SSE connection stability tests

### 5.2 Phase 2 (HIGH - Week 2)
- Integration tests for all 4 button types
- Terminal I/O streaming validation
- Error recovery scenario tests
- Multi-instance coordination tests

### 5.3 Phase 3 (MEDIUM - Week 3)
- E2E browser automation tests
- Performance benchmarking suite
- Load testing framework
- Monitoring and alerting setup

### 5.4 Phase 4 (CONTINUOUS)
- CI/CD pipeline integration
- Automated regression detection
- Performance monitoring
- Security vulnerability scanning

---

**SPECIFICATION COMPLETION STATUS:** ✅ APPROVED
**NEXT PHASE:** Pseudocode Design (Phase P)
**CRITICAL REQUIREMENT:** Zero tolerance for regression in working Claude process functionality