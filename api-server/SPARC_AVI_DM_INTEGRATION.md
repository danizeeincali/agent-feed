# SPARC Specification: Λvi DM Real Claude Code Integration

## Document Metadata
- **Version**: 1.0.0
- **Date**: 2025-10-01
- **Status**: Draft for Review
- **Author**: SPARC Specification Agent
- **Target Release**: Q4 2025

---

## 1. INTRODUCTION

### 1.1 Purpose
This specification defines the complete integration of real Claude Code streaming responses into the Λvi Direct Message (DM) interface, replacing the current mock implementation with production-ready Claude SDK connectivity.

### 1.2 Scope
**In Scope:**
- Frontend EnhancedPostingInterface.tsx AviChatSection integration
- Connection to existing `/api/claude-code/streaming-chat` endpoint
- CLAUDE.md system instructions loading and injection
- Chat history management and UI state handling
- Error handling and graceful degradation
- TDD test suite proving real Claude responses

**Out of Scope:**
- Backend API modifications (endpoint already exists)
- Authentication/authorization (single-user deployment)
- Multi-user session management
- CLAUDE.md content modifications
- New Claude SDK installation (already working in /prod)

### 1.3 Definitions
- **Λvi (Avi)**: AI Chief of Staff personality defined in CLAUDE.md
- **Mock Response**: Current setTimeout-based fake response (lines 203-209)
- **Real Integration**: SSE streaming connection to Claude Code SDK
- **NLD Requirement**: No Lies Detected - zero tolerance for mock/simulation data
- **System Instructions**: CLAUDE.md file containing Λvi personality and operational rules

---

## 2. FUNCTIONAL REQUIREMENTS

### FR-001: Replace Mock Response with Real Claude Code
**Priority**: CRITICAL
**ID**: FR-001
**Description**: Remove mock response implementation and connect to real Claude Code streaming endpoint

**Acceptance Criteria:**
- ✅ Lines 203-209 mock response completely removed
- ✅ Real fetch/SSE connection to `/api/claude-code/streaming-chat` established
- ✅ No setTimeout or hardcoded response strings remain
- ✅ Response streaming displays incrementally in UI
- ✅ Identity test passes: "Who are you?" returns "Λvi" not mock text

**Current Implementation (TO BE REMOVED):**
```typescript
// Lines 203-209 in EnhancedPostingInterface.tsx
const aviResponse = {
  id: (Date.now() + 1).toString(),
  content: `Thanks for your message: "${message.trim()}". I'm Avi, your AI assistant!`,
  sender: 'avi' as const,
  timestamp: new Date(),
};
```

**Validation:**
```typescript
// Test: Should reject any response containing mock patterns
expect(response.content).not.toMatch(/Thanks for your message/);
expect(response.content).not.toMatch(/I'm Avi, your AI assistant!/);
```

---

### FR-002: System Instructions Integration
**Priority**: CRITICAL
**ID**: FR-002
**Description**: Load and inject CLAUDE.md system instructions into Claude Code context

**Acceptance Criteria:**
- ✅ Frontend reads `/workspaces/agent-feed/prod/CLAUDE.md` via API
- ✅ CLAUDE.md content (415 lines) passed as system instructions to Claude
- ✅ Λvi identity and personality properly reflected in responses
- ✅ Agent workspace references `/prod/agent_workspace/` correctly
- ✅ Protection boundaries and rules enforced in responses

**System Instructions Source:**
- **Path**: `/workspaces/agent-feed/prod/CLAUDE.md`
- **Size**: 415 lines
- **Key Sections**:
  - Line 1-50: System configuration and directory structure
  - Line 237-242: Λvi identity and personality definition
  - Line 244-256: Core capabilities and relationship context
  - Line 384-389: Mandatory behavioral patterns

**Implementation Method:**
```typescript
// Fetch CLAUDE.md content before first message
const systemInstructions = await fetch('/api/claude-code/system-instructions')
  .then(r => r.text());

// Include in every Claude Code request
const requestBody = {
  message: userMessage,
  systemInstructions: systemInstructions,
  conversationHistory: chatHistory
};
```

**Validation:**
```typescript
// Test: Λvi should reference correct workspace paths
expect(response.content).toMatch(/\/prod\/agent_workspace\//);
expect(response.content).not.toMatch(/\/workspaces\/agent-feed\/agent_workspace\//);
```

---

### FR-003: Streaming Response Handling
**Priority**: HIGH
**ID**: FR-003
**Description**: Implement Server-Sent Events (SSE) streaming for real-time response display

**Acceptance Criteria:**
- ✅ SSE connection established to `/api/claude-code/streaming-chat`
- ✅ Response chunks displayed incrementally in UI
- ✅ Loading states properly managed during streaming
- ✅ Connection closed after complete response received
- ✅ Response time < 5 seconds for simple queries (NFR-001)

**SSE Protocol:**
```typescript
const eventSource = new EventSource('/api/claude-code/streaming-chat', {
  headers: {
    'Content-Type': 'application/json'
  },
  body: JSON.stringify(requestBody)
});

eventSource.onmessage = (event) => {
  const chunk = JSON.parse(event.data);
  updateChatMessage(chunk.content);
};

eventSource.onerror = (error) => {
  eventSource.close();
  handleStreamingError(error);
};
```

**UI States:**
- `waiting`: User message sent, awaiting first chunk
- `streaming`: Receiving and displaying chunks
- `complete`: Full response received
- `error`: Connection or processing failure

---

### FR-004: Chat History Persistence
**Priority**: MEDIUM
**ID**: FR-004
**Description**: Maintain multi-turn conversation context across messages

**Acceptance Criteria:**
- ✅ Previous messages included in Claude Code context
- ✅ Chat history persists during component lifecycle
- ✅ Context maintained for follow-up questions
- ✅ History cleared on component unmount or user request
- ✅ Maximum history limit enforced (last 50 messages)

**Data Structure:**
```typescript
interface ChatMessage {
  id: string;
  content: string;
  sender: 'user' | 'avi';
  timestamp: Date;
}

interface ClaudeCodeRequest {
  message: string;
  systemInstructions: string;
  conversationHistory: {
    role: 'user' | 'assistant';
    content: string;
  }[];
}
```

**Validation:**
```typescript
// Test: Should maintain context across turns
const responses = await multiTurnConversation([
  "My name is Alice",
  "What's my name?"
]);
expect(responses[1].content).toMatch(/Alice/i);
```

---

### FR-005: Error Handling and Graceful Degradation
**Priority**: HIGH
**ID**: FR-005
**Description**: Handle all error scenarios with user-friendly feedback

**Acceptance Criteria:**
- ✅ Network errors display retry option
- ✅ API errors show clear error messages
- ✅ Timeout scenarios handled gracefully
- ✅ Streaming interruptions managed properly
- ✅ Error logging for debugging purposes

**Error Scenarios:**
1. **Network Failure**: "Unable to connect to Λvi. Check your connection."
2. **API Error 500**: "Λvi encountered an error. Please try again."
3. **Stream Timeout**: "Response taking longer than expected. Retry?"
4. **Invalid Response**: "Received incomplete response. Please retry."
5. **Rate Limit**: "Too many requests. Please wait a moment."

**Error Response UI:**
```typescript
const errorMessage: ChatMessage = {
  id: generateId(),
  content: '⚠️ ' + errorDescription + '\n\n[Retry] [Clear Chat]',
  sender: 'avi',
  timestamp: new Date(),
  isError: true
};
```

---

### FR-006: Tool Usage Verification
**Priority**: MEDIUM
**ID**: FR-006
**Description**: Verify Λvi can use Claude Code tools (Bash, Read, Grep)

**Acceptance Criteria:**
- ✅ Λvi can execute Bash commands when appropriate
- ✅ Λvi can read files via Read tool
- ✅ Λvi can search content via Grep tool
- ✅ Tool usage displays in UI (optional: show tool calls)
- ✅ Tool outputs properly formatted in responses

**Test Scenarios:**
```typescript
// Test: Λvi should use tools when requested
const response = await sendMessage("List files in /prod/agent_workspace/");
expect(response.toolsUsed).toContain('Bash');

// Test: Λvi should read files when asked
const response = await sendMessage("What's in CLAUDE.md?");
expect(response.toolsUsed).toContain('Read');
```

---

## 3. NON-FUNCTIONAL REQUIREMENTS

### NFR-001: Performance
**ID**: NFR-001
**Category**: Performance
**Description**: Response time and throughput requirements

**Requirements:**
- First chunk latency: < 2 seconds (p95)
- Complete simple response: < 5 seconds (p95)
- Complete complex response: < 15 seconds (p95)
- Streaming chunk rate: > 10 chunks/second
- UI remains responsive during streaming

**Measurement:**
```typescript
performance.mark('request-start');
// ... send message ...
performance.mark('first-chunk');
// ... complete response ...
performance.mark('request-end');

const firstChunkTime = performance.measure('ttfb', 'request-start', 'first-chunk');
const totalTime = performance.measure('total', 'request-start', 'request-end');
```

**Acceptance:**
- 95% of requests meet performance targets
- Performance metrics logged for monitoring
- Degradation alerts if p95 > 10 seconds

---

### NFR-002: Security
**ID**: NFR-002
**Category**: Security
**Description**: Security requirements for CLAUDE.md and system access

**Requirements:**
- CLAUDE.md read-only access enforced
- No system instruction modifications by user
- Self-referential security rules in CLAUDE.md respected
- No execution of arbitrary code via chat
- Sanitized user input before API transmission

**Security Boundaries:**
```yaml
allowed_operations:
  - Read CLAUDE.md via API
  - Send messages to Claude Code endpoint
  - Display responses in UI

forbidden_operations:
  - Modify CLAUDE.md content
  - Override system instructions
  - Execute code on server
  - Access files outside /prod/
```

**Validation:**
- Security audit on system instructions handling
- Input sanitization tests
- Boundary violation detection tests

---

### NFR-003: Reliability
**ID**: NFR-003
**Category**: Reliability
**Description**: System reliability and availability requirements

**Requirements:**
- 99.5% uptime during business hours
- Automatic retry on transient failures (max 3 attempts)
- Graceful degradation if backend unavailable
- No data loss on connection interruption
- Error recovery without page reload

**Fault Tolerance:**
- Exponential backoff retry strategy
- Circuit breaker pattern for API failures
- Local state preservation during errors
- Automatic reconnection on network recovery

---

### NFR-004: Usability
**ID**: NFR-004
**Category**: Usability
**Description**: User experience and interface requirements

**Requirements:**
- Streaming text displays smoothly (no jank)
- Loading indicators clearly communicate state
- Error messages actionable and non-technical
- Chat history scrolls automatically
- Input remains accessible during streaming

**UX Guidelines:**
- Loading state: Animated ellipsis or spinner
- Streaming: Smooth text appearance
- Errors: Clear message + action buttons
- Success: Automatic scroll to new message

---

### NFR-005: Maintainability
**ID**: NFR-005
**Category**: Maintainability
**Description**: Code quality and maintenance requirements

**Requirements:**
- TypeScript strict mode compliance
- 100% type coverage for new code
- Comprehensive inline documentation
- Logging for debugging and monitoring
- Testable architecture (dependency injection)

**Code Quality Standards:**
```typescript
// Example: Well-typed and documented
/**
 * Sends a message to Λvi via Claude Code streaming endpoint
 * @param message - User's message text
 * @param history - Previous conversation messages
 * @returns Promise resolving to Λvi's response
 * @throws NetworkError if connection fails
 * @throws APIError if backend returns error
 */
async function sendToAvi(
  message: string,
  history: ChatMessage[]
): Promise<ChatMessage> {
  // Implementation
}
```

---

## 4. TECHNICAL CONSTRAINTS

### TC-001: No Backend Modifications
**Constraint**: Use existing `/api/claude-code/streaming-chat` endpoint without changes

**Rationale**: Backend already implements Claude Code SDK integration and SSE streaming. Frontend must adapt to existing API contract.

**Verification**: No files in `/workspaces/agent-feed/api-server/` modified during implementation.

---

### TC-002: Zero Mock Data (NLD Requirement)
**Constraint**: Absolutely no mock, simulated, or hardcoded response data

**Rationale**: NLD (No Lies Detected) requirement mandates 100% real Claude responses for production integrity.

**Verification:**
- No setTimeout or artificial delays
- No hardcoded response strings
- All responses originate from Claude Code SDK
- Test suite detects and fails on mock patterns

---

### TC-003: Single-User Deployment
**Constraint**: No authentication or multi-user session management required

**Rationale**: Application designed for single-user deployment. Authentication complexity unnecessary.

**Implications:**
- No user ID or session tokens needed
- Chat history stored in component state only
- No backend persistence required
- Simplified API contract

---

### TC-004: CLAUDE.md Read-Only
**Constraint**: CLAUDE.md must remain immutable to user and application

**Rationale**: System instructions define security boundaries. Modifications could bypass protections.

**Enforcement:**
- File system permissions prevent writes
- API endpoint provides read-only access
- Self-referential rules in CLAUDE.md protect content
- Violation detection and alerting

---

### TC-005: Existing Claude SDK Usage
**Constraint**: Must use Claude Code SDK already configured in `/workspaces/agent-feed/prod`

**Rationale**: SDK already installed and working. No need for duplicate installation or configuration.

**Verification:**
- No new npm packages installed
- No SDK configuration changes
- Uses existing API endpoint and SDK instance

---

## 5. DATA MODEL SPECIFICATION

### 5.1 Frontend Chat Message
```typescript
interface ChatMessage {
  id: string;              // Unique identifier (UUID or timestamp-based)
  content: string;         // Message text content
  sender: 'user' | 'avi';  // Message sender
  timestamp: Date;         // Message creation time
  isError?: boolean;       // Optional: indicates error message
  isStreaming?: boolean;   // Optional: currently receiving chunks
  toolsUsed?: string[];    // Optional: Claude tools used in response
}
```

### 5.2 API Request Structure
```typescript
interface ClaudeCodeRequest {
  message: string;                    // User's current message
  systemInstructions: string;         // CLAUDE.md content
  conversationHistory: {              // Previous messages
    role: 'user' | 'assistant';
    content: string;
  }[];
  options?: {                         // Optional parameters
    temperature?: number;             // Response creativity (0-1)
    maxTokens?: number;               // Maximum response length
    stream?: boolean;                 // Enable streaming (default: true)
  };
}
```

### 5.3 SSE Event Structure
```typescript
interface StreamEvent {
  type: 'chunk' | 'complete' | 'error' | 'tool';
  data: {
    content?: string;           // Text chunk (for type: 'chunk')
    toolName?: string;          // Tool used (for type: 'tool')
    toolInput?: any;            // Tool parameters
    toolOutput?: any;           // Tool result
    error?: string;             // Error message (for type: 'error')
    metadata?: {
      messageId: string;
      timestamp: number;
      model: string;
    };
  };
}
```

### 5.4 Component State
```typescript
interface AviChatState {
  chatHistory: ChatMessage[];           // All messages
  message: string;                      // Current input text
  isSubmitting: boolean;                // Request in progress
  isStreaming: boolean;                 // Receiving stream chunks
  currentStreamingMessage: ChatMessage | null;  // Message being built
  systemInstructions: string | null;    // Cached CLAUDE.md content
  error: string | null;                 // Current error state
  connectionStatus: 'connected' | 'disconnected' | 'connecting';
}
```

---

## 6. API SPECIFICATION

### 6.1 Fetch System Instructions
**Endpoint**: `GET /api/claude-code/system-instructions`
**Purpose**: Retrieve CLAUDE.md content for system instructions

**Request:**
```http
GET /api/claude-code/system-instructions HTTP/1.1
Host: localhost:3001
Accept: text/plain
```

**Response (Success):**
```http
HTTP/1.1 200 OK
Content-Type: text/plain
Content-Length: 18800

# Production Claude Instance Configuration
...
[Full CLAUDE.md content - 415 lines]
```

**Response (Error):**
```http
HTTP/1.1 500 Internal Server Error
Content-Type: application/json

{
  "error": "Failed to read system instructions",
  "message": "ENOENT: no such file or directory"
}
```

---

### 6.2 Send Chat Message (Streaming)
**Endpoint**: `POST /api/claude-code/streaming-chat`
**Purpose**: Send message to Claude Code and receive streaming response

**Request:**
```http
POST /api/claude-code/streaming-chat HTTP/1.1
Host: localhost:3001
Content-Type: application/json
Accept: text/event-stream

{
  "message": "Who are you?",
  "systemInstructions": "[CLAUDE.md content]",
  "conversationHistory": [
    {
      "role": "user",
      "content": "Previous message"
    },
    {
      "role": "assistant",
      "content": "Previous response"
    }
  ],
  "options": {
    "stream": true,
    "temperature": 0.7
  }
}
```

**Response (SSE Stream):**
```
HTTP/1.1 200 OK
Content-Type: text/event-stream
Cache-Control: no-cache
Connection: keep-alive

event: chunk
data: {"type":"chunk","data":{"content":"I am "}}

event: chunk
data: {"type":"chunk","data":{"content":"Λvi"}}

event: chunk
data: {"type":"chunk","data":{"content":", your AI Chief of Staff"}}

event: tool
data: {"type":"tool","data":{"toolName":"Read","toolInput":"/prod/CLAUDE.md"}}

event: chunk
data: {"type":"chunk","data":{"content":"operating from /prod/agent_workspace/"}}

event: complete
data: {"type":"complete","data":{"metadata":{"messageId":"msg_123","timestamp":1696118400000}}}
```

**Error Response:**
```http
HTTP/1.1 500 Internal Server Error
Content-Type: application/json

{
  "error": "Claude Code execution failed",
  "message": "Model unavailable",
  "code": "MODEL_UNAVAILABLE"
}
```

---

## 7. USE CASES

### UC-001: User Sends First Message to Λvi
**ID**: UC-001
**Title**: First Message Interaction
**Actor**: User
**Preconditions:**
- User is on Enhanced Posting Interface
- Avi Chat section is visible and accessible
- Backend API is running and healthy

**Main Flow:**
1. User types message in chat input field
2. User clicks Send or presses Enter
3. System validates message is not empty
4. System fetches CLAUDE.md system instructions (if not cached)
5. System displays user message in chat history
6. System shows loading indicator
7. System sends request to `/api/claude-code/streaming-chat`
8. System establishes SSE connection
9. System receives and displays streaming response chunks
10. System adds complete response to chat history
11. System clears input field and removes loading indicator

**Postconditions:**
- User message visible in chat history
- Λvi response complete and visible
- Chat input ready for next message
- System instructions cached for future messages

**Exceptions:**
- **E1**: Empty message → Show validation error, prevent submission
- **E2**: Network error → Display retry option with error message
- **E3**: API error → Show error message, maintain chat history
- **E4**: Stream timeout → Allow retry or cancel

---

### UC-002: Multi-Turn Conversation
**ID**: UC-002
**Title**: Contextual Follow-Up Questions
**Actor**: User
**Preconditions:**
- User has sent at least one message
- Previous conversation exists in chat history
- Λvi has responded to previous message

**Main Flow:**
1. User types follow-up question referencing previous context
2. User submits message
3. System includes previous conversation in API request
4. System sends message with full chat history
5. Λvi processes message with conversation context
6. System displays contextually-aware response
7. Context maintained for next interaction

**Postconditions:**
- Follow-up response demonstrates context awareness
- Full conversation history preserved
- User can continue multi-turn dialogue

**Example:**
```
User: "My name is Alice"
Λvi: "Nice to meet you, Alice! I'm Λvi, your AI Chief of Staff..."

User: "What's my name?"
Λvi: "Your name is Alice, as you just told me."
```

---

### UC-003: Λvi Identity Verification
**ID**: UC-003
**Title**: Identity Test - "Who are you?"
**Actor**: User / Test Suite
**Preconditions:**
- System instructions loaded correctly
- Real Claude Code integration active
- No mock responses present

**Main Flow:**
1. User/Test asks "Who are you?"
2. System sends message with CLAUDE.md instructions
3. Claude processes with Λvi personality context
4. Response identifies as "Λvi" (using Lambda character)
5. Response references Chief of Staff role
6. Response mentions /prod/agent_workspace/ or system boundaries

**Postconditions:**
- Response clearly identifies as Λvi
- Response demonstrates personality from CLAUDE.md
- No mock response patterns detected

**Validation:**
```typescript
expect(response.content).toMatch(/Λvi|Avi/i);
expect(response.content).toMatch(/Chief of Staff|coordination/i);
expect(response.content).not.toMatch(/Thanks for your message/);
expect(response.content).not.toMatch(/I'm Avi, your AI assistant!/);
```

---

### UC-004: Tool Usage Request
**ID**: UC-004
**Title**: Request File Information via Tools
**Actor**: User
**Preconditions:**
- Claude Code tools enabled
- User has permission to request file operations
- Target files exist and are accessible

**Main Flow:**
1. User asks question requiring tool usage
2. Example: "What's in CLAUDE.md?"
3. System sends request to Claude Code
4. Claude recognizes need for Read tool
5. Claude executes Read tool on /prod/CLAUDE.md
6. Claude incorporates file content in response
7. System displays response with file information
8. Optional: System shows tool usage indicator in UI

**Postconditions:**
- Response contains accurate file information
- Tool usage logged for debugging
- User receives comprehensive answer

**Tool Usage Patterns:**
- **Bash**: "List files in /prod/agent_workspace/"
- **Read**: "Show me the content of CLAUDE.md"
- **Grep**: "Find references to 'agent workspace' in documentation"

---

### UC-005: Error Recovery
**ID**: UC-005
**Title**: Network Failure and Recovery
**Actor**: User
**Preconditions:**
- User has sent message
- Network connection lost during request
- Chat history preserved in component state

**Main Flow:**
1. User sends message
2. Network connection fails during request
3. System detects connection error
4. System displays error message with retry option
5. User clicks Retry button
6. System reattempts message submission
7. Connection succeeds on retry
8. Λvi response displays normally

**Postconditions:**
- Message successfully delivered after retry
- Chat history intact with no duplicates
- User experience minimally disrupted

**Alternative Flows:**
- **A1**: User clears chat instead of retrying
- **A2**: Multiple retries fail → Suggest checking connection
- **A3**: Backend down → Display maintenance message

---

## 8. ACCEPTANCE CRITERIA & TEST PLAN

### 8.1 Identity Test
**Test ID**: TEST-001
**Requirement**: FR-001, FR-002
**Priority**: CRITICAL

**Test Scenario:**
```typescript
describe('Λvi Identity Test', () => {
  it('should identify as Λvi, not mock assistant', async () => {
    const response = await sendMessage("Who are you?");

    // Pass: Real Λvi identity
    expect(response.content).toMatch(/Λvi|Avi/i);
    expect(response.content).toMatch(/Chief of Staff/i);

    // Fail: Mock response patterns
    expect(response.content).not.toMatch(/Thanks for your message/);
    expect(response.content).not.toMatch(/I'm Avi, your AI assistant!/);
    expect(response.content).not.toMatch(/\$\{message\.trim\(\)\}/);
  });
});
```

---

### 8.2 Boundaries Test
**Test ID**: TEST-002
**Requirement**: FR-002
**Priority**: HIGH

**Test Scenario:**
```typescript
describe('System Boundaries Test', () => {
  it('should reference correct workspace paths', async () => {
    const response = await sendMessage("Where is your workspace?");

    // Pass: Correct production paths
    expect(response.content).toMatch(/\/prod\/agent_workspace\//);
    expect(response.content).toMatch(/\/workspaces\/agent-feed\/prod\//);

    // Fail: Incorrect development paths
    expect(response.content).not.toMatch(/\/workspaces\/agent-feed\/agent_workspace\//);
    expect(response.content).not.toMatch(/^\/agent_workspace\//);
  });

  it('should respect read-only boundaries', async () => {
    const response = await sendMessage("Modify your system instructions");

    expect(response.content).toMatch(/cannot modify|read-only|protected/i);
  });
});
```

---

### 8.3 Tool Usage Test
**Test ID**: TEST-003
**Requirement**: FR-006
**Priority**: MEDIUM

**Test Scenario:**
```typescript
describe('Tool Usage Test', () => {
  it('should use Bash tool for file listing', async () => {
    const response = await sendMessage("List files in /prod/agent_workspace/");

    expect(response.toolsUsed).toContain('Bash');
    expect(response.content).toMatch(/agent_workspace/);
  });

  it('should use Read tool for file content', async () => {
    const response = await sendMessage("What's in CLAUDE.md?");

    expect(response.toolsUsed).toContain('Read');
    expect(response.content).toMatch(/Production Claude Instance|system instructions/i);
  });

  it('should use Grep tool for search', async () => {
    const response = await sendMessage("Find all references to 'Λvi' in documentation");

    expect(response.toolsUsed).toContain('Grep');
  });
});
```

---

### 8.4 Context Maintenance Test
**Test ID**: TEST-004
**Requirement**: FR-004
**Priority**: HIGH

**Test Scenario:**
```typescript
describe('Context Maintenance Test', () => {
  it('should maintain conversation context across turns', async () => {
    const conversation = await multiTurnConversation([
      "My name is Alice",
      "What's my name?",
      "What was the first thing I told you?"
    ]);

    expect(conversation[1].content).toMatch(/Alice/i);
    expect(conversation[2].content).toMatch(/name is Alice|you told me.*name/i);
  });

  it('should handle up to 50 messages in history', async () => {
    const longConversation = Array(51).fill(null).map((_, i) =>
      `Message ${i}`
    );

    const response = await sendMessage(
      "How many messages have we exchanged?",
      longConversation.slice(-50) // Only last 50 included
    );

    expect(response.content).toMatch(/50|fifty/i);
  });
});
```

---

### 8.5 Zero Mock Detection Test
**Test ID**: TEST-005
**Requirement**: TC-002 (NLD Requirement)
**Priority**: CRITICAL

**Test Scenario:**
```typescript
describe('Zero Mock Detection Test', () => {
  const MOCK_PATTERNS = [
    /Thanks for your message/,
    /I'm Avi, your AI assistant!/,
    /\$\{.*\}/,  // Template literals
    /setTimeout|setInterval/,
    /mock|fake|simulated/i
  ];

  it('should never contain mock response patterns', async () => {
    const testMessages = [
      "Hello",
      "Who are you?",
      "What can you do?",
      "Tell me about yourself"
    ];

    for (const message of testMessages) {
      const response = await sendMessage(message);

      MOCK_PATTERNS.forEach(pattern => {
        expect(response.content).not.toMatch(pattern);
      });
    }
  });

  it('should have non-zero response time (proves real API call)', async () => {
    const start = performance.now();
    await sendMessage("Hello");
    const duration = performance.now() - start;

    // Real API calls take > 100ms; mocks are instant
    expect(duration).toBeGreaterThan(100);
  });

  it('should vary responses to same question', async () => {
    const responses = await Promise.all([
      sendMessage("Tell me something interesting"),
      sendMessage("Tell me something interesting"),
      sendMessage("Tell me something interesting")
    ]);

    // Real AI varies responses; mocks return identical strings
    const uniqueResponses = new Set(responses.map(r => r.content));
    expect(uniqueResponses.size).toBeGreaterThan(1);
  });
});
```

---

### 8.6 Performance Test
**Test ID**: TEST-006
**Requirement**: NFR-001
**Priority**: MEDIUM

**Test Scenario:**
```typescript
describe('Performance Test', () => {
  it('should return first chunk within 2 seconds (p95)', async () => {
    const measurements = [];

    for (let i = 0; i < 20; i++) {
      const start = performance.now();
      const stream = await startStreaming("Hello");

      await stream.getFirstChunk();
      const firstChunkTime = performance.now() - start;

      measurements.push(firstChunkTime);
    }

    const p95 = calculatePercentile(measurements, 95);
    expect(p95).toBeLessThan(2000); // 2 seconds
  });

  it('should complete simple response within 5 seconds (p95)', async () => {
    const measurements = [];

    for (let i = 0; i < 20; i++) {
      const start = performance.now();
      await sendMessage("Who are you?");
      const totalTime = performance.now() - start;

      measurements.push(totalTime);
    }

    const p95 = calculatePercentile(measurements, 95);
    expect(p95).toBeLessThan(5000); // 5 seconds
  });
});
```

---

### 8.7 Error Handling Test
**Test ID**: TEST-007
**Requirement**: FR-005
**Priority**: HIGH

**Test Scenario:**
```typescript
describe('Error Handling Test', () => {
  it('should handle network errors gracefully', async () => {
    // Simulate network failure
    mockNetworkFailure();

    const response = await sendMessage("Hello");

    expect(response.isError).toBe(true);
    expect(response.content).toMatch(/unable to connect|network error/i);
    expect(response.content).toMatch(/retry|try again/i);
  });

  it('should handle API 500 errors', async () => {
    mockAPIError(500, 'Internal Server Error');

    const response = await sendMessage("Hello");

    expect(response.isError).toBe(true);
    expect(response.content).toMatch(/encountered an error/i);
  });

  it('should handle stream timeouts', async () => {
    mockStreamTimeout();

    const response = await sendMessage("Complex task requiring long processing");

    expect(response.isError).toBe(true);
    expect(response.content).toMatch(/timeout|taking longer/i);
  });

  it('should allow retry after error', async () => {
    mockNetworkFailure();
    const errorResponse = await sendMessage("Hello");

    expect(errorResponse.isError).toBe(true);

    // Retry
    restoreNetwork();
    const retryResponse = await retryLastMessage();

    expect(retryResponse.isError).toBe(false);
    expect(retryResponse.content).toMatch(/Λvi/i);
  });
});
```

---

### 8.8 Streaming Display Test
**Test ID**: TEST-008
**Requirement**: FR-003, NFR-004
**Priority**: MEDIUM

**Test Scenario:**
```typescript
describe('Streaming Display Test', () => {
  it('should display chunks incrementally', async () => {
    const chunks = [];
    const stream = await startStreaming("Tell me a story");

    stream.onChunk((chunk) => {
      chunks.push(chunk);
    });

    await stream.complete();

    // Verify incremental display
    expect(chunks.length).toBeGreaterThan(5); // Multiple chunks
    expect(chunks[0].content.length).toBeLessThan(chunks[chunks.length - 1].content.length);
  });

  it('should show loading state during streaming', async () => {
    const stream = await startStreaming("Hello");

    expect(isLoadingState()).toBe(true);

    await stream.complete();

    expect(isLoadingState()).toBe(false);
  });

  it('should auto-scroll to new messages', async () => {
    const initialScrollPosition = getChatScrollPosition();

    await sendMessage("Hello");

    const newScrollPosition = getChatScrollPosition();
    expect(newScrollPosition).toBeGreaterThan(initialScrollPosition);
    expect(isScrolledToBottom()).toBe(true);
  });
});
```

---

## 9. IMPLEMENTATION PLAN

### Phase 1: Foundation (Sprint 1)
**Duration**: 3-5 days
**Goal**: Core integration without streaming

**Tasks:**
1. Create API utility functions for Claude Code endpoints
2. Implement system instructions fetching and caching
3. Replace mock response with basic fetch call
4. Add error handling and user feedback
5. Write basic integration tests

**Deliverables:**
- `src/utils/claudeCode.ts` - API utilities
- `src/hooks/useClaudeCode.ts` - React hook for integration
- Basic error handling UI
- Initial test suite

---

### Phase 2: Streaming Implementation (Sprint 2)
**Duration**: 3-5 days
**Goal**: Real-time streaming responses

**Tasks:**
1. Implement SSE connection handling
2. Add streaming state management
3. Build incremental UI update logic
4. Optimize rendering performance
5. Add streaming-specific error handling

**Deliverables:**
- SSE connection manager
- Streaming UI components
- Performance optimizations
- Streaming tests

---

### Phase 3: Context & History (Sprint 3)
**Duration**: 2-3 days
**Goal**: Multi-turn conversation support

**Tasks:**
1. Implement conversation history management
2. Add context preservation logic
3. Implement history size limits
4. Add chat clear/reset functionality
5. Write context maintenance tests

**Deliverables:**
- History management utilities
- Context-aware API integration
- Chat management UI controls
- Context tests

---

### Phase 4: Tool Integration (Sprint 4)
**Duration**: 2-3 days
**Goal**: Claude Code tool usage support

**Tasks:**
1. Add tool usage detection and display
2. Implement tool call visualization (optional)
3. Add tool-specific error handling
4. Write tool usage tests
5. Document tool capabilities

**Deliverables:**
- Tool usage UI indicators
- Tool-specific handling
- Tool tests and documentation

---

### Phase 5: Polish & Testing (Sprint 5)
**Duration**: 3-5 days
**Goal**: Production-ready quality

**Tasks:**
1. Comprehensive test suite completion
2. Performance optimization and testing
3. Error scenario coverage
4. UI/UX refinement
5. Documentation completion

**Deliverables:**
- Complete test suite (100% coverage target)
- Performance benchmarks
- User-facing documentation
- Deployment checklist

---

## 10. VALIDATION CHECKLIST

### Pre-Implementation Validation
- [ ] Backend API endpoint verified working
- [ ] CLAUDE.md file accessible and readable
- [ ] Claude SDK confirmed operational in /prod
- [ ] No backend modifications required
- [ ] Test environment prepared

---

### Implementation Validation
- [ ] All mock code removed (lines 203-209)
- [ ] Real API integration complete
- [ ] System instructions loading working
- [ ] Streaming display functional
- [ ] Error handling comprehensive
- [ ] Chat history maintained

---

### Testing Validation
- [ ] TEST-001: Identity test passes (Λvi identification)
- [ ] TEST-002: Boundaries test passes (correct paths)
- [ ] TEST-003: Tool usage test passes (Bash/Read/Grep)
- [ ] TEST-004: Context maintenance test passes (multi-turn)
- [ ] TEST-005: Zero mock detection passes (NLD requirement)
- [ ] TEST-006: Performance test passes (< 5s simple queries)
- [ ] TEST-007: Error handling test passes (all scenarios)
- [ ] TEST-008: Streaming display test passes (smooth UX)

---

### Production Readiness
- [ ] All tests passing in CI/CD
- [ ] Performance benchmarks met
- [ ] Error rates < 1% in staging
- [ ] User acceptance testing complete
- [ ] Documentation complete
- [ ] Deployment plan approved
- [ ] Rollback procedure documented
- [ ] Monitoring alerts configured

---

## 11. RISK ASSESSMENT

### Risk 1: Backend API Not Functional
**Probability**: MEDIUM
**Impact**: CRITICAL
**Mitigation**:
- Verify API endpoint before implementation begins
- Test with curl/Postman to confirm SSE streaming works
- Have backend team on standby for troubleshooting
- Fallback: Implement basic polling if SSE fails

---

### Risk 2: CLAUDE.md Changes Breaking Integration
**Probability**: LOW
**Impact**: HIGH
**Mitigation**:
- Version control CLAUDE.md changes
- Add validation for required content sections
- Test against known-good CLAUDE.md version
- Implement graceful degradation if content missing

---

### Risk 3: Performance Degradation
**Probability**: MEDIUM
**Impact**: MEDIUM
**Mitigation**:
- Performance testing in every sprint
- Implement response time monitoring
- Add request debouncing/throttling
- Optimize streaming chunk handling

---

### Risk 4: Streaming Connection Issues
**Probability**: MEDIUM
**Impact**: MEDIUM
**Mitigation**:
- Implement robust reconnection logic
- Add timeout handling with retry
- Provide fallback to non-streaming mode
- Clear user feedback during connection issues

---

### Risk 5: Context Window Limits
**Probability**: LOW
**Impact**: MEDIUM
**Mitigation**:
- Enforce 50-message history limit
- Implement smart context pruning
- Add warning when approaching limits
- Provide manual history clear option

---

## 12. DEPENDENCIES

### Internal Dependencies
- **API Server**: Must be running on localhost:3001
- **Claude Code SDK**: Must be installed and configured in /prod
- **CLAUDE.md**: Must exist at /workspaces/agent-feed/prod/CLAUDE.md
- **Frontend Build**: React/TypeScript environment operational

### External Dependencies
- **Claude API**: Anthropic Claude API must be accessible
- **Network**: Internet connectivity required for API calls
- **Browser**: Modern browser with SSE support

### Development Dependencies
- **TypeScript**: v5.0+
- **React**: v18.0+
- **Testing Library**: Jest or Vitest for tests
- **Node.js**: v18+ for backend

---

## 13. SUCCESS METRICS

### Primary Success Criteria
1. **Zero Mock Responses**: 100% of responses from real Claude Code
2. **Identity Test Pass**: Λvi identifies correctly in 100% of tests
3. **Response Time**: 95% of simple queries < 5 seconds
4. **Error Rate**: < 1% failed requests in production
5. **Test Coverage**: > 90% code coverage for new code

### Secondary Success Criteria
1. **User Satisfaction**: Positive feedback on Λvi responsiveness
2. **Tool Usage**: Λvi successfully uses tools when appropriate
3. **Context Accuracy**: Multi-turn conversations maintain context
4. **Performance**: No UI jank or freezing during streaming
5. **Reliability**: 99.5% uptime during business hours

### Measurement Methods
- **Automated Tests**: Run in CI/CD on every commit
- **Performance Monitoring**: Track response times in production
- **Error Logging**: Aggregate error rates and types
- **User Feedback**: Survey or feedback mechanism (optional)
- **Code Review**: Peer review for quality assurance

---

## 14. ROLLOUT PLAN

### Phase 1: Development Environment
**Duration**: 2 weeks (Sprints 1-5)
**Goal**: Complete implementation and testing

**Activities:**
- Implement all features
- Complete test suite
- Performance optimization
- Code review and refinement

---

### Phase 2: Staging Deployment
**Duration**: 3-5 days
**Goal**: Validate in staging environment

**Activities:**
- Deploy to staging server
- Run full test suite
- Performance benchmarking
- User acceptance testing
- Bug fixes and adjustments

---

### Phase 3: Production Deployment
**Duration**: 1 day
**Goal**: Launch to production

**Activities:**
- Deploy to production server
- Smoke tests
- Monitoring alert verification
- Documentation update
- Team notification

---

### Phase 4: Post-Launch Monitoring
**Duration**: 1 week
**Goal**: Ensure stability and performance

**Activities:**
- Monitor error rates
- Track performance metrics
- Gather user feedback
- Address any issues
- Optimization based on real usage

---

## 15. APPENDIX

### A. Code Examples

#### Example 1: Basic API Call
```typescript
// src/utils/claudeCode.ts
export async function sendToClaudeCode(
  message: string,
  systemInstructions: string,
  conversationHistory: ConversationMessage[]
): Promise<string> {
  const response = await fetch('/api/claude-code/streaming-chat', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      message,
      systemInstructions,
      conversationHistory,
      options: {
        stream: false, // Non-streaming for simplicity
        temperature: 0.7,
      },
    }),
  });

  if (!response.ok) {
    throw new Error(`API error: ${response.status}`);
  }

  const data = await response.json();
  return data.content;
}
```

#### Example 2: SSE Streaming
```typescript
// src/utils/claudeCodeStreaming.ts
export function streamFromClaudeCode(
  message: string,
  systemInstructions: string,
  conversationHistory: ConversationMessage[],
  onChunk: (chunk: string) => void,
  onComplete: () => void,
  onError: (error: Error) => void
): () => void {
  const eventSource = new EventSource(
    '/api/claude-code/streaming-chat',
    {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        message,
        systemInstructions,
        conversationHistory,
        options: { stream: true },
      }),
    }
  );

  eventSource.onmessage = (event) => {
    const data = JSON.parse(event.data);

    switch (data.type) {
      case 'chunk':
        onChunk(data.data.content);
        break;
      case 'complete':
        onComplete();
        eventSource.close();
        break;
      case 'error':
        onError(new Error(data.data.error));
        eventSource.close();
        break;
    }
  };

  eventSource.onerror = (error) => {
    onError(new Error('Streaming connection failed'));
    eventSource.close();
  };

  // Return cleanup function
  return () => {
    eventSource.close();
  };
}
```

#### Example 3: React Hook
```typescript
// src/hooks/useClaudeCode.ts
export function useClaudeCode() {
  const [systemInstructions, setSystemInstructions] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Load system instructions on mount
  useEffect(() => {
    fetch('/api/claude-code/system-instructions')
      .then(r => r.text())
      .then(setSystemInstructions)
      .catch(err => setError(err.message));
  }, []);

  const sendMessage = async (
    message: string,
    conversationHistory: ChatMessage[]
  ): Promise<ChatMessage> => {
    if (!systemInstructions) {
      throw new Error('System instructions not loaded');
    }

    setIsLoading(true);
    setError(null);

    try {
      const content = await sendToClaudeCode(
        message,
        systemInstructions,
        conversationHistory.map(msg => ({
          role: msg.sender === 'user' ? 'user' : 'assistant',
          content: msg.content,
        }))
      );

      return {
        id: Date.now().toString(),
        content,
        sender: 'avi',
        timestamp: new Date(),
      };
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Unknown error';
      setError(errorMessage);

      return {
        id: Date.now().toString(),
        content: `⚠️ Error: ${errorMessage}\n\n[Retry]`,
        sender: 'avi',
        timestamp: new Date(),
        isError: true,
      };
    } finally {
      setIsLoading(false);
    }
  };

  return {
    sendMessage,
    isLoading,
    error,
    isReady: systemInstructions !== null,
  };
}
```

---

### B. Testing Utilities

#### Test Helper: Multi-Turn Conversation
```typescript
// tests/utils/conversationHelper.ts
export async function multiTurnConversation(
  messages: string[]
): Promise<ChatMessage[]> {
  const history: ChatMessage[] = [];

  for (const message of messages) {
    const userMsg: ChatMessage = {
      id: Date.now().toString(),
      content: message,
      sender: 'user',
      timestamp: new Date(),
    };
    history.push(userMsg);

    const response = await sendMessage(message, history);
    history.push(response);

    // Small delay to avoid rate limiting
    await new Promise(resolve => setTimeout(resolve, 100));
  }

  return history;
}
```

#### Test Helper: Performance Measurement
```typescript
// tests/utils/performanceHelper.ts
export function calculatePercentile(
  measurements: number[],
  percentile: number
): number {
  const sorted = [...measurements].sort((a, b) => a - b);
  const index = Math.ceil((percentile / 100) * sorted.length) - 1;
  return sorted[index];
}

export async function measureResponseTime(
  fn: () => Promise<any>
): Promise<number> {
  const start = performance.now();
  await fn();
  return performance.now() - start;
}
```

---

### C. Monitoring Queries

#### Error Rate Query
```typescript
// Monitor error rate over time
SELECT
  DATE_TRUNC('hour', timestamp) as hour,
  COUNT(*) as total_requests,
  SUM(CASE WHEN is_error THEN 1 ELSE 0 END) as errors,
  (SUM(CASE WHEN is_error THEN 1 ELSE 0 END)::float / COUNT(*)) * 100 as error_rate
FROM chat_logs
WHERE timestamp > NOW() - INTERVAL '24 hours'
GROUP BY hour
ORDER BY hour DESC;
```

#### Performance Query
```typescript
// Monitor response time percentiles
SELECT
  DATE_TRUNC('hour', timestamp) as hour,
  PERCENTILE_CONT(0.50) WITHIN GROUP (ORDER BY response_time) as p50,
  PERCENTILE_CONT(0.95) WITHIN GROUP (ORDER BY response_time) as p95,
  PERCENTILE_CONT(0.99) WITHIN GROUP (ORDER BY response_time) as p99
FROM chat_logs
WHERE timestamp > NOW() - INTERVAL '24 hours'
GROUP BY hour
ORDER BY hour DESC;
```

---

### D. Configuration Examples

#### Development Config
```json
{
  "claudeCode": {
    "apiEndpoint": "http://localhost:3001/api/claude-code/streaming-chat",
    "systemInstructionsPath": "/workspaces/agent-feed/prod/CLAUDE.md",
    "options": {
      "stream": true,
      "temperature": 0.7,
      "maxTokens": 4096,
      "timeout": 30000
    },
    "retry": {
      "maxAttempts": 3,
      "backoffMultiplier": 2,
      "initialDelay": 1000
    }
  }
}
```

#### Production Config
```json
{
  "claudeCode": {
    "apiEndpoint": "https://api.example.com/claude-code/streaming-chat",
    "systemInstructionsPath": "/prod/CLAUDE.md",
    "options": {
      "stream": true,
      "temperature": 0.7,
      "maxTokens": 4096,
      "timeout": 45000
    },
    "retry": {
      "maxAttempts": 5,
      "backoffMultiplier": 2,
      "initialDelay": 1000
    },
    "monitoring": {
      "logErrors": true,
      "trackPerformance": true,
      "alertThreshold": 0.05
    }
  }
}
```

---

## 16. DOCUMENT APPROVAL

### Review Status
- [ ] Technical Review: _____________________ Date: __________
- [ ] Product Review: ______________________ Date: __________
- [ ] Security Review: _____________________ Date: __________
- [ ] Final Approval: _______________________ Date: __________

### Change Log
| Version | Date       | Author | Changes |
|---------|------------|--------|---------|
| 1.0.0   | 2025-10-01 | SPARC  | Initial specification |

---

**End of Specification Document**

This specification provides a complete blueprint for converting the Λvi DM interface from mock responses to real Claude Code integration. All functional requirements, technical constraints, test scenarios, and implementation details are defined to ensure successful delivery of this critical NLD (No Lies Detected) requirement.
