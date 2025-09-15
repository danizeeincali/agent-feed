# SPARC Implementation: Claude Code Integration in Avi DM System

## 1. SPECIFICATION PHASE - Requirements Analysis

### Current State Analysis
- **Mock Pattern-Matching System**: AviDirectChatMock uses fake responses with pattern matching
- **Real Integration Exists**: AviDirectChatReal uses `/api/claude-instances` (WRONG endpoints)
- **ClaudeProcessManager**: Fully functional Claude Code binary integration in `/src/services/ClaudeProcessManager.js`
- **Required Endpoints**: Should use `/api/claude/instances` (Architecture Plan specifies)
- **Target Directory**: `/workspaces/agent-feed/prod` for Claude Code sessions

### Integration Requirements
1. **API Endpoint Correction**:
   - Current: `/api/claude-instances` (incorrect)
   - Required: `/api/claude/instances` (as per architecture plan)
   - Endpoint exists in `/src/api/server-claude-instances.js`

2. **Claude Code Session Management**:
   - Use ClaudeProcessManager for real Claude Code binary execution
   - Sessions in `/workspaces/agent-feed/prod` working directory
   - sendInput() for message sending
   - WebSocket events for real-time responses

3. **Frontend Integration**:
   - Replace AviDirectChatMock with AviDirectChatReal
   - Update API endpoints in AviDirectChatReal
   - Implement proper WebSocket event handling
   - Error handling and fallback mechanisms

4. **Session Context**:
   - Project context from `/workspaces/agent-feed/prod`
   - Real file system access
   - Git integration for code awareness
   - Persistent session state

## 2. PSEUDOCODE PHASE - Integration Flow Design

### API Flow Architecture
```pseudocode
FUNCTION createAviClaudeSession():
  POST /api/claude/instances
  BODY: {
    name: "Avi - Direct Message Assistant",
    workingDirectory: "/workspaces/agent-feed/prod",
    skipPermissions: true,
    resumeSession: true,
    metadata: { isAvi: true, purpose: "direct-messaging" }
  }
  RETURN instanceId

FUNCTION sendMessageToAvi(instanceId, message):
  POST /api/claude/instances/{instanceId}/message
  BODY: {
    content: message,
    metadata: { source: "avi-dm", timestamp: ISO_STRING }
  }
  RETURN claudeResponse

FUNCTION setupWebSocketConnection(instanceId):
  CONNECT ws://localhost:8080/ws/claude/{instanceId}
  LISTEN FOR:
    - message: Complete response
    - streaming: Partial response chunks
    - stream_end: Response completion
    - error: Error handling
```

### Component Integration Flow
```pseudocode
CLASS AviDirectChatReal:
  CONSTRUCTOR():
    SET endpoints to /api/claude/instances
    INITIALIZE websocket for real-time updates
    SET working directory to /workspaces/agent-feed/prod

  FUNCTION connectToClaudeInstance():
    instanceData = CREATE_SESSION via API
    instanceId = EXTRACT id from response
    SETUP WebSocket connection
    UPDATE connection status

  FUNCTION sendMessage(message):
    VALIDATE connection and instanceId
    SEND via HTTP API to correct endpoint
    UPDATE message status in UI
    HANDLE response and streaming

  FUNCTION handleWebSocketMessage(data):
    SWITCH data.type:
      CASE 'message': ADD complete response
      CASE 'streaming': UPDATE streaming response
      CASE 'stream_end': MARK stream complete
      CASE 'error': HANDLE error state
```

### Error Handling Flow
```pseudocode
FUNCTION handleConnectionError(error):
  LOG error details
  UPDATE connection status to disconnected
  SHOW user-friendly error message
  PROVIDE retry mechanism
  FALLBACK to offline mode if needed

FUNCTION handleAPIError(error, operation):
  IF error.status == 404:
    SHOW "Claude instance not found"
    ATTEMPT to recreate instance
  ELIF error.status == 500:
    SHOW "Server error, please try again"
    LOG error for debugging
  ELSE:
    SHOW generic error message
    PROVIDE retry option
```

## 3. ARCHITECTURE PHASE - Component Design

### System Architecture
```
┌─────────────────┐    HTTP/WS     ┌─────────────────┐    ProcessManager    ┌──────────────────┐
│ AviDirectChatReal │ ──────────────▶ │ API Server      │ ──────────────────▶ │ ClaudeProcessMgr │
│ (Frontend)       │                │ /api/claude/    │                    │ (Real Claude)    │
└─────────────────┘                │ instances       │                    └──────────────────┘
                                   └─────────────────┘                               │
                                            │                                        │
                                            ▼                                        ▼
                                   ┌─────────────────┐                    ┌──────────────────┐
                                   │ WebSocket Hub   │                    │ Claude Code      │
                                   │ Real-time Comms │                    │ Binary Process   │
                                   └─────────────────┘                    │ /workspaces/     │
                                                                         │ agent-feed/prod  │
                                                                         └──────────────────┘
```

### Data Flow Design
```
1. Frontend Request:
   AviDirectChatReal → POST /api/claude/instances → ClaudeProcessManager

2. Claude Session Creation:
   ClaudeProcessManager → spawn('claude', ['code']) → Real Claude Process

3. Message Flow:
   User Message → HTTP API → sendInput() → Claude Process → Response → WebSocket → UI

4. Session Context:
   Working Dir: /workspaces/agent-feed/prod
   File Access: Real filesystem via Claude Code
   Git Context: Actual repository state
```

### API Endpoint Structure
```
/api/claude/instances/
├── POST /              # Create new Claude Code instance
├── GET /               # List all instances
├── GET /{id}           # Get specific instance
├── POST /{id}/message  # Send message (uses sendInput)
├── GET /{id}/health    # Instance health check
└── DELETE /{id}        # Terminate instance

WebSocket: /ws/claude/{id} # Real-time communication
```

## 4. REFINEMENT PHASE - TDD Implementation

### Test-Driven Development Plan

#### Unit Tests
```typescript
describe('AviDirectChatReal Integration', () => {
  test('should create Claude Code instance with correct config', async () => {
    const response = await fetch('/api/claude/instances', {
      method: 'POST',
      body: JSON.stringify({
        name: 'Avi - Direct Message Assistant',
        workingDirectory: '/workspaces/agent-feed/prod',
        skipPermissions: true,
        resumeSession: true,
        metadata: { isAvi: true }
      })
    });
    expect(response.ok).toBe(true);
    const data = await response.json();
    expect(data.data.id).toBeDefined();
  });

  test('should send message to real Claude Code process', async () => {
    const instanceId = 'test-instance-id';
    const message = 'Hello Claude!';

    const response = await sendMessage(instanceId, message);
    expect(response.success).toBe(true);
    expect(response.data.response.content).toBeDefined();
    expect(response.data.response.metadata.realClaudeResponse).toBe(true);
  });

  test('should handle WebSocket streaming responses', (done) => {
    const ws = new WebSocket(`ws://localhost:8080/ws/claude/${instanceId}`);
    ws.onmessage = (event) => {
      const data = JSON.parse(event.data);
      expect(data.type).toBeOneOf(['message', 'streaming', 'stream_end']);
      done();
    };
  });
});
```

#### Integration Tests
```typescript
describe('End-to-End Claude Integration', () => {
  test('complete Avi DM workflow', async () => {
    // 1. Create instance
    const instance = await createAviClaudeSession();
    expect(instance.id).toBeDefined();

    // 2. Send message
    const response = await sendMessageToAvi(instance.id, 'What files are in my directory?');
    expect(response.content).toContain('package.json'); // Real filesystem

    // 3. Verify working directory
    const pwdResponse = await sendMessageToAvi(instance.id, 'pwd');
    expect(pwdResponse.content).toContain('/workspaces/agent-feed/prod');

    // 4. Clean up
    await terminateInstance(instance.id);
  });
});
```

### Implementation Steps with TDD
1. **Red**: Write failing tests for API endpoint changes
2. **Green**: Update AviDirectChatReal to use correct endpoints
3. **Refactor**: Clean up and optimize code
4. **Red**: Write tests for WebSocket integration
5. **Green**: Implement WebSocket event handling
6. **Refactor**: Optimize WebSocket management

## 5. COMPLETION PHASE - Production Implementation

### File Changes Required

#### 1. Update AviDirectChatReal.tsx
```typescript
// Change API endpoints from /api/claude-instances to /api/claude/instances
const response = await fetch('/api/claude/instances', {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({
    name: 'Avi - Direct Message Assistant',
    workingDirectory: '/workspaces/agent-feed/prod', // Use prod directory
    skipPermissions: true,
    resumeSession: true,
    metadata: {
      isAvi: true,
      purpose: 'direct-messaging',
      capabilities: ['code-review', 'debugging', 'architecture', 'general-assistance']
    }
  })
});

// Update message sending endpoint
const messageResponse = await fetch(`/api/claude/instances/${instanceId}/message`, {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({
    content: messageContent,
    metadata: {
      source: 'avi-dm',
      timestamp: new Date().toISOString()
    }
  })
});
```

#### 2. Implement WebSocket Integration
```typescript
// Add real WebSocket connection for streaming
const protocol = window.location.protocol === 'https:' ? 'wss:' : 'ws:';
const wsUrl = `${protocol}//${window.location.host}/ws/claude/${instanceId}`;
const ws = new WebSocket(wsUrl);

ws.onmessage = (event) => {
  const data = JSON.parse(event.data);
  handleWebSocketMessage(data);
};
```

#### 3. Replace Mock with Real Implementation
```typescript
// In posting-interface/index.ts or main component
import { AviDirectChatReal } from './AviDirectChatReal';
// Remove: import { AviDirectChatMock } from './AviDirectChatMock';

export default AviDirectChatReal; // Use real implementation
```

#### 4. Add Error Handling
```typescript
const handleConnectionError = (error: Error) => {
  console.error('Claude connection error:', error);
  setError(`Connection failed: ${error.message}`);
  setIsConnected(false);

  // Attempt reconnection after delay
  setTimeout(() => {
    connectToClaudeInstance();
  }, 5000);
};
```

### Deployment Checklist
- [ ] Update API endpoints in AviDirectChatReal
- [ ] Implement WebSocket event handling
- [ ] Add error handling and reconnection logic
- [ ] Update working directory to `/workspaces/agent-feed/prod`
- [ ] Replace mock implementation with real one
- [ ] Add comprehensive error messages
- [ ] Test with real Claude Code binary
- [ ] Verify session persistence
- [ ] Test WebSocket streaming
- [ ] Add monitoring and logging

### Success Criteria
1. **API Integration**: All requests go to `/api/claude/instances`
2. **Real Claude Code**: Uses ClaudeProcessManager with actual binary
3. **Correct Directory**: Sessions run in `/workspaces/agent-feed/prod`
4. **WebSocket Streaming**: Real-time response updates work
5. **Error Handling**: Graceful error recovery and user feedback
6. **No Mock Responses**: All responses come from real Claude Code process
7. **Session Persistence**: Context maintained across messages
8. **File System Access**: Can read and interact with actual project files

## Implementation Timeline
1. **Phase 1**: API endpoint updates (30 minutes)
2. **Phase 2**: WebSocket integration (45 minutes)
3. **Phase 3**: Error handling and edge cases (30 minutes)
4. **Phase 4**: Testing and validation (45 minutes)
5. **Phase 5**: Mock replacement and final integration (30 minutes)

**Total Estimated Time**: 3 hours

This SPARC implementation provides a complete roadmap for replacing the mock pattern-matching system with real Claude Code integration through the existing ClaudeProcessManager infrastructure.