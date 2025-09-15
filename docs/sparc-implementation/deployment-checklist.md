# SPARC Implementation Deployment Checklist
## Claude Code Integration in Avi DM System

### Pre-Deployment Verification

#### ✅ 1. API Endpoint Verification
- [ ] API server running on correct port (3001)
- [ ] `/api/claude/instances` endpoint accessible (NOT `/api/claude-instances`)
- [ ] POST `/api/claude/instances` creates new Claude Code instances
- [ ] POST `/api/claude/instances/{id}/message` sends messages to instances
- [ ] GET `/api/claude/instances/{id}/health` returns instance health
- [ ] DELETE `/api/claude/instances/{id}` terminates instances
- [ ] WebSocket endpoint `/ws/claude/{id}` accepts connections

#### ✅ 2. ClaudeProcessManager Integration
- [ ] ClaudeProcessManager correctly spawns Claude Code binary processes
- [ ] Working directory set to `/workspaces/agent-feed/prod`
- [ ] Real filesystem access working (can list files, read package.json)
- [ ] Command execution capabilities functional
- [ ] Process cleanup and termination working properly
- [ ] Error handling for process failures implemented

#### ✅ 3. Frontend Component Updates
- [ ] AviDirectChatRealFixed.tsx using correct API endpoints
- [ ] Mock implementation (AviDirectChatMock) replaced
- [ ] posting-interface/index.ts exports corrected component
- [ ] WebSocket integration for streaming responses
- [ ] Error handling and reconnection logic implemented
- [ ] Connection status indicators working

#### ✅ 4. Real Claude Code Functionality
- [ ] Can execute actual commands (pwd, ls, git status)
- [ ] Can read real files from project directory
- [ ] Responses come from Claude Code binary (not mocks)
- [ ] Context awareness of actual project state
- [ ] Session persistence across messages
- [ ] Real-time streaming responses via WebSocket

### Deployment Steps

#### Step 1: Backup Current System
```bash
# Backup current implementation
cp frontend/src/components/posting-interface/AviDirectChatReal.tsx \
   frontend/src/components/posting-interface/AviDirectChatReal.backup.tsx

# Backup posting interface exports
cp frontend/src/components/posting-interface/index.ts \
   frontend/src/components/posting-interface/index.backup.ts
```

#### Step 2: Deploy Updated Components
```bash
# Replace with corrected implementation
mv frontend/src/components/posting-interface/AviDirectChatRealFixed.tsx \
   frontend/src/components/posting-interface/AviDirectChatReal.tsx

# Update component imports if needed
# (Already updated in index.ts)
```

#### Step 3: API Server Configuration
```bash
# Ensure API server uses correct endpoints
# Verify src/api/server-claude-instances.js is running
# Check ClaudeProcessManager integration in src/services/ClaudeProcessManager.js

# Start API server
cd /workspaces/agent-feed
node src/api/server-claude-instances.js
```

#### Step 4: Run Integration Tests
```bash
# Run verification script
node src/scripts/verify-claude-endpoints.js

# Run TDD test suite
npm test -- src/tests/integration/claude-integration.test.ts

# Manual testing checklist (see below)
```

### Manual Testing Checklist

#### Basic Functionality
- [ ] Open Avi DM interface
- [ ] Verify connection status shows "Connected + WebSocket"
- [ ] Send message: "Hello Avi!"
- [ ] Verify response comes from real Claude Code
- [ ] Check working directory display shows `/workspaces/agent-feed/prod`

#### File System Integration
- [ ] Send: "What files are in my directory?"
- [ ] Verify response lists actual project files (package.json, src/, etc.)
- [ ] Send: "Show me package.json"
- [ ] Verify response shows actual package.json content
- [ ] Send: "What's my current working directory?"
- [ ] Verify response shows `/workspaces/agent-feed/prod`

#### Command Execution
- [ ] Send: "Run git status"
- [ ] Verify shows actual git status of repository
- [ ] Send: "What's my node version?"
- [ ] Verify shows actual Node.js version
- [ ] Send: "What's 1+1?"
- [ ] Verify mathematical response works

#### Error Handling
- [ ] Stop API server temporarily
- [ ] Verify error message appears with retry button
- [ ] Restart API server
- [ ] Click retry and verify reconnection works
- [ ] Test with invalid instance ID
- [ ] Verify appropriate error messages

#### WebSocket Streaming
- [ ] Send long request that would trigger streaming
- [ ] Verify typing indicator appears
- [ ] Verify streaming response chunks appear in real-time
- [ ] Verify stream completion marked properly

### Performance Validation

#### Memory Usage
- [ ] Create multiple Claude instances
- [ ] Verify no memory leaks
- [ ] Terminate instances and verify cleanup
- [ ] Monitor process count and cleanup

#### Response Times
- [ ] Simple queries (1+1) respond within 2 seconds
- [ ] File operations respond within 5 seconds
- [ ] Complex commands complete within 10 seconds
- [ ] WebSocket connection establishes within 3 seconds

#### Concurrent Usage
- [ ] Multiple users can create instances simultaneously
- [ ] No race conditions in instance creation
- [ ] Proper isolation between user sessions
- [ ] Instance termination doesn't affect other sessions

### Security Validation

#### Access Controls
- [ ] Claude Code instances restricted to specified working directory
- [ ] No access to files outside `/workspaces/agent-feed/prod`
- [ ] Command execution properly sandboxed
- [ ] No privilege escalation possible

#### Input Sanitization
- [ ] Malicious commands properly handled
- [ ] SQL injection attempts blocked
- [ ] File path traversal attempts blocked
- [ ] Input length limits enforced

### Production Readiness

#### Monitoring
- [ ] API endpoint monitoring configured
- [ ] Claude process health monitoring active
- [ ] WebSocket connection monitoring in place
- [ ] Error logging and alerting configured

#### Documentation
- [ ] SPARC implementation documentation complete
- [ ] API endpoint documentation updated
- [ ] User guide for Avi DM functionality
- [ ] Troubleshooting guide created

#### Rollback Plan
- [ ] Backup files verified and accessible
- [ ] Rollback procedure documented and tested
- [ ] Database migration rollback tested (if applicable)
- [ ] Service restart procedures verified

### Post-Deployment Validation

#### User Acceptance Testing
- [ ] Real users can successfully create Claude sessions
- [ ] File operations work as expected in production
- [ ] Performance meets user expectations
- [ ] Error messages are clear and actionable

#### Operational Monitoring
- [ ] API response times within acceptable limits
- [ ] Claude process stability monitoring
- [ ] WebSocket connection success rates
- [ ] Resource utilization within bounds

#### Success Metrics
- [ ] Zero mock responses in production logs
- [ ] 100% real Claude Code integration
- [ ] Working directory correctly set to prod
- [ ] All API calls use `/api/claude/instances` endpoints
- [ ] WebSocket streaming functional
- [ ] Error rate < 5% for normal operations

### Rollback Triggers

Immediately rollback if:
- [ ] API endpoints returning 500 errors consistently
- [ ] Claude Code processes not spawning
- [ ] File system access not working
- [ ] WebSocket connections failing
- [ ] User sessions not creating properly
- [ ] Memory leaks or resource exhaustion
- [ ] Security vulnerabilities discovered

### Sign-off

#### Technical Lead Sign-off
- [ ] All technical requirements verified
- [ ] Code quality standards met
- [ ] Security review completed
- [ ] Performance benchmarks achieved

#### Product Owner Sign-off
- [ ] User requirements fulfilled
- [ ] Acceptance criteria met
- [ ] User experience validated
- [ ] Business objectives achieved

#### Operations Team Sign-off
- [ ] Monitoring systems configured
- [ ] Alerting thresholds set
- [ ] Runbook documentation complete
- [ ] On-call procedures updated

---

## Deployment Summary

**Objective**: Replace mock pattern-matching system with real Claude Code binary integration

**Key Changes**:
1. API endpoints corrected from `/api/claude-instances` to `/api/claude/instances`
2. ClaudeProcessManager integration for real Claude Code binary execution
3. Working directory set to `/workspaces/agent-feed/prod` for real file system access
4. WebSocket streaming for real-time response updates
5. Complete removal of mock responses and pattern matching

**Success Criteria**:
- ✅ All responses come from real Claude Code binary
- ✅ File system operations access actual project files
- ✅ Commands execute in real environment
- ✅ WebSocket streaming provides real-time updates
- ✅ No mock or pattern-matching responses remain
- ✅ Error handling graceful and informative
- ✅ Performance meets or exceeds mock system

**Estimated Deployment Time**: 30 minutes
**Estimated Testing Time**: 1 hour
**Total Implementation Time**: 3 hours (as planned in SPARC specification)

---

*This checklist ensures comprehensive validation of the SPARC implementation for Claude Code integration in the Avi DM system.*