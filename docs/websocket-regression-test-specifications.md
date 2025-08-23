# WebSocket Regression Test Specifications

## SPARC Specification Phase: Comprehensive WebSocket Implementation Testing

### Document Overview

This specification defines comprehensive regression test requirements for the WebSocket implementation covering:
- WebSocket Hub (ports 3002/3003) connection handling and message routing
- Frontend WebSocket integration with connection manager and debug panel
- Performance section integration with tabbed interface and debug tools
- Production Claude connection and real-time communication
- Error handling, reconnection logic, and security boundaries

---

## 1. Functional Requirements

### FR-001: WebSocket Hub Connection Management
**Priority:** HIGH  
**Description:** The WebSocket Hub must establish and maintain reliable connections on configurable ports

**Acceptance Criteria:**
- Hub starts on primary port (3002) or falls back to alternative ports (3003, 3004, 3005)
- Accepts connections from frontend clients and Claude instances
- Maintains connection registry with client metadata
- Implements health check endpoints (/health, /hub/status, /debug)
- Supports graceful shutdown with client notification

**Test Scenarios:**
```yaml
test_cases:
  - name: "Hub startup on primary port"
    steps:
      - Start hub with port 3002 available
      - Verify hub listens on port 3002
      - Confirm health endpoint responds
    expected: "Hub operational on port 3002"
    
  - name: "Port fallback mechanism"
    steps:
      - Block port 3002
      - Start hub
      - Verify hub starts on port 3003
    expected: "Hub operational on fallback port"
    
  - name: "Client registration"
    steps:
      - Connect frontend client
      - Send registerFrontend event
      - Verify client stored in registry
    expected: "Client registered with metadata"
```

### FR-002: Frontend WebSocket Integration
**Priority:** HIGH  
**Description:** Frontend must seamlessly integrate with WebSocket hub using connection manager

**Acceptance Criteria:**
- ConnectionManager establishes reliable WebSocket connections
- Implements exponential backoff reconnection strategy
- Provides connection state management and metrics
- Supports singleton pattern for global access
- Integrates with React context for component access

**Test Scenarios:**
```yaml
test_cases:
  - name: "Connection establishment"
    steps:
      - Initialize WebSocketConnectionManager
      - Call connect() method
      - Verify socket connection established
    expected: "Connected state with active socket"
    
  - name: "Auto-reconnection on disconnect"
    steps:
      - Establish connection
      - Simulate network disconnection
      - Wait for reconnection attempt
    expected: "Automatic reconnection with exponential backoff"
    
  - name: "React context integration"
    steps:
      - Render component with WebSocketSingletonProvider
      - Use useWebSocketSingletonContext hook
      - Verify context provides connection methods
    expected: "Context methods available to components"
```

### FR-003: Message Routing and Protocol Translation
**Priority:** HIGH  
**Description:** Messages must route correctly between frontend, hub, and Claude instances

**Acceptance Criteria:**
- Frontend messages route to correct Claude instance (prod/dev)
- Claude responses route back to originating frontend
- Protocol translation between WebSocket and webhook formats
- Message delivery confirmation and error handling
- Support for multiple concurrent conversations

**Test Scenarios:**
```yaml
test_cases:
  - name: "Frontend to Claude message routing"
    steps:
      - Connect frontend and Claude prod instance
      - Send message from frontend with targetInstance: "production"
      - Verify message arrives at Claude instance
    expected: "Message delivered to correct Claude instance"
    
  - name: "Claude to frontend response routing"
    steps:
      - Establish bidirectional connection
      - Send response from Claude with targetId
      - Verify response arrives at correct frontend
    expected: "Response delivered to originating frontend"
    
  - name: "Protocol translation"
    steps:
      - Send webhook-format message
      - Verify translation to WebSocket format
      - Confirm message integrity preserved
    expected: "Message translated correctly between protocols"
```

### FR-004: Performance Section Integration
**Priority:** MEDIUM  
**Description:** Performance section must provide debug panel with WebSocket monitoring

**Acceptance Criteria:**
- Tabbed interface includes Performance/WebSocket/Error Testing tabs
- Real-time connection status display
- Message history and debugging tools
- Environment-specific feature availability
- Component isolation and error boundaries

**Test Scenarios:**
```yaml
test_cases:
  - name: "Debug panel visibility"
    steps:
      - Navigate to performance section
      - Verify WebSocket tab present
      - Check connection status display
    expected: "Debug panel accessible with status info"
    
  - name: "Real-time message monitoring"
    steps:
      - Open WebSocket debug panel
      - Send test message
      - Verify message appears in debug log
    expected: "Messages logged in real-time"
    
  - name: "Error boundary protection"
    steps:
      - Trigger WebSocket error
      - Verify error contained to component
      - Confirm rest of interface remains functional
    expected: "Error isolated, UI remains stable"
```

---

## 2. Non-Functional Requirements

### NFR-001: Performance Requirements
**Category:** Performance  
**Description:** WebSocket implementation must meet latency and throughput requirements

**Specifications:**
- Message latency < 100ms for 95% of messages
- Support minimum 50 concurrent connections
- Throughput > 100 messages/second
- Memory usage < 50MB for typical load
- CPU usage < 10% for typical load

**Measurement Criteria:**
```yaml
performance_metrics:
  latency:
    p50: "<50ms"
    p95: "<100ms"
    p99: "<200ms"
  throughput:
    min_messages_per_second: 100
    concurrent_connections: 50
  resource_usage:
    memory_limit: "50MB"
    cpu_limit: "10%"
```

### NFR-002: Reliability Requirements
**Category:** Reliability  
**Description:** System must maintain 99.9% uptime with automatic recovery

**Specifications:**
- 99.9% uptime SLA
- Maximum 5 second reconnection time
- Zero message loss during reconnection
- Graceful degradation on component failure
- Comprehensive error logging and monitoring

### NFR-003: Security Requirements
**Category:** Security  
**Description:** WebSocket connections must implement security boundaries

**Specifications:**
- Channel isolation between users/sessions
- Input validation and sanitization
- CORS configuration for allowed origins
- Rate limiting to prevent abuse
- Authentication token validation

---

## 3. Test Scenarios

### TS-001: Connection Lifecycle Testing

```javascript
describe('WebSocket Connection Lifecycle', () => {
  test('Complete connection establishment flow', async () => {
    // 1. Hub startup
    const hub = new RobustWebSocketHub({ primaryPort: 3002 });
    await hub.start();
    
    // 2. Frontend connection
    const frontend = new WebSocketTestClient();
    await frontend.connect('ws://localhost:3002');
    
    // 3. Claude instance connection
    const claude = new WebSocketTestClient();
    await claude.connect('ws://localhost:3002');
    claude.send('registerClaude', { instanceType: 'production' });
    
    // 4. Verify connections registered
    expect(hub.getConnectedClients()).toHaveLength(2);
  });
  
  test('Reconnection after network interruption', async () => {
    // 1. Establish connection
    const client = new WebSocketConnectionManager();
    await client.connect();
    expect(client.isConnected()).toBe(true);
    
    // 2. Simulate disconnection
    client.disconnect();
    await waitFor(() => expect(client.getState()).toBe('DISCONNECTED'));
    
    // 3. Verify automatic reconnection
    await waitFor(() => expect(client.isConnected()).toBe(true), { timeout: 10000 });
  });
});
```

### TS-002: Message Routing Testing

```javascript
describe('Message Routing', () => {
  test('Frontend to Claude prod instance routing', async () => {
    // 1. Setup connections
    const hub = await setupTestHub();
    const frontend = await connectFrontend(hub);
    const claudeProd = await connectClaude(hub, 'production');
    
    // 2. Send message from frontend
    const messageId = 'test-msg-001';
    frontend.send('toClause', {
      messageId,
      targetInstance: 'production',
      prompt: 'Test message'
    });
    
    // 3. Verify message reaches Claude
    const claudeMessage = await claudeProd.waitForMessage('fromFrontend');
    expect(claudeMessage.messageId).toBe(messageId);
    expect(claudeMessage.prompt).toBe('Test message');
  });
  
  test('Claude response routing back to frontend', async () => {
    // 1. Setup bidirectional connection
    const { frontend, claude } = await setupBidirectionalConnection();
    
    // 2. Send response from Claude
    claude.send('toFrontend', {
      targetId: frontend.id,
      messageId: 'response-001',
      response: 'Claude response'
    });
    
    // 3. Verify response reaches frontend
    const frontendMessage = await frontend.waitForMessage('fromClaude');
    expect(frontendMessage.response).toBe('Claude response');
  });
});
```

### TS-003: Performance Testing

```javascript
describe('Performance Requirements', () => {
  test('Message latency under normal load', async () => {
    const { frontend, claude } = await setupBidirectionalConnection();
    const latencyMeasurements = [];
    
    for (let i = 0; i < 100; i++) {
      const startTime = performance.now();
      
      frontend.send('toClause', { messageId: `perf-${i}`, prompt: 'Test' });
      await claude.waitForMessage('fromFrontend');
      
      const latency = performance.now() - startTime;
      latencyMeasurements.push(latency);
    }
    
    const p95Latency = calculatePercentile(latencyMeasurements, 95);
    expect(p95Latency).toBeLessThan(100); // 100ms requirement
  });
  
  test('Concurrent connection handling', async () => {
    const hub = await setupTestHub();
    const clients = [];
    
    // Connect 50 concurrent clients
    for (let i = 0; i < 50; i++) {
      const client = new WebSocketTestClient();
      await client.connect(`ws://localhost:${hub.port}`);
      clients.push(client);
    }
    
    expect(hub.getConnectedClients()).toHaveLength(50);
    
    // Verify all can send messages simultaneously
    const promises = clients.map((client, index) => 
      client.send('testMessage', { clientIndex: index })
    );
    
    await Promise.all(promises);
    // All messages should be processed successfully
  });
});
```

### TS-004: Error Handling and Resilience

```javascript
describe('Error Handling and Resilience', () => {
  test('Graceful handling of malformed messages', async () => {
    const client = new WebSocketTestClient();
    await client.connect('ws://localhost:3002');
    
    // Send malformed messages
    const malformedMessages = [
      '{ invalid json',
      '{"type": null}',
      '{"type": "", "data": undefined}'
    ];
    
    malformedMessages.forEach(msg => {
      client.sendRaw(msg);
    });
    
    // Connection should remain stable
    await waitFor(2000);
    expect(client.isConnected()).toBe(true);
    
    // Valid messages should still work
    client.send('testMessage', { data: 'valid' });
    // Should receive response without errors
  });
  
  test('Claude instance failure handling', async () => {
    const { hub, frontend, claude } = await setupBidirectionalConnection();
    
    // Disconnect Claude instance
    claude.disconnect();
    
    // Frontend message should receive error
    frontend.send('toClause', { targetInstance: 'production' });
    const error = await frontend.waitForMessage('routingError');
    
    expect(error.error).toContain('Claude instance unavailable');
  });
});
```

### TS-005: Frontend Integration Testing

```javascript
describe('Frontend Integration', () => {
  test('React context provides WebSocket functionality', async () => {
    const TestComponent = () => {
      const { isConnected, connect, emit } = useWebSocketSingletonContext();
      
      return (
        <div>
          <span data-testid="connection-status">
            {isConnected ? 'Connected' : 'Disconnected'}
          </span>
          <button onClick={connect} data-testid="connect-btn">Connect</button>
          <button 
            onClick={() => emit('test', { data: 'test' })} 
            data-testid="send-btn"
          >
            Send
          </button>
        </div>
      );
    };
    
    render(
      <WebSocketSingletonProvider>
        <TestComponent />
      </WebSocketSingletonProvider>
    );
    
    // Initially disconnected
    expect(screen.getByTestId('connection-status')).toHaveTextContent('Disconnected');
    
    // Connect via UI
    fireEvent.click(screen.getByTestId('connect-btn'));
    
    // Should show connected
    await waitFor(() => {
      expect(screen.getByTestId('connection-status')).toHaveTextContent('Connected');
    });
  });
  
  test('Performance section debug panel integration', async () => {
    render(<PerformanceSection />);
    
    // Navigate to WebSocket tab
    fireEvent.click(screen.getByText('WebSocket'));
    
    // Should show connection status
    expect(screen.getByTestId('websocket-status')).toBeInTheDocument();
    
    // Should show message log
    expect(screen.getByTestId('message-log')).toBeInTheDocument();
    
    // Send test message
    fireEvent.click(screen.getByText('Send Test Message'));
    
    // Should appear in log
    await waitFor(() => {
      expect(screen.getByText('Test message sent')).toBeInTheDocument();
    });
  });
});
```

---

## 4. Regression Test Validation Criteria

### RTC-001: Existing Functionality Preservation
**Requirement:** All existing WebSocket features must continue to work without degradation

**Validation:**
- All existing API endpoints respond correctly
- Message routing preserves original behavior
- Connection management maintains stability
- Performance metrics remain within acceptable ranges

### RTC-002: No Breaking Changes
**Requirement:** New features must not break existing integrations

**Validation:**
- Existing frontend components continue to function
- WebSocket connection URLs remain compatible
- Message formats maintain backward compatibility
- Error handling doesn't introduce new failure modes

### RTC-003: Performance Impact Assessment
**Requirement:** New features must not negatively impact performance

**Validation:**
- Latency measurements within 10% of baseline
- Memory usage increase < 20%
- CPU usage increase < 15%
- Throughput maintains minimum requirements

---

## 5. End-to-End Test Scenarios

### E2E-001: Complete Communication Flow

```javascript
test('End-to-end frontend to Claude communication', async () => {
  // 1. Start all components
  const hub = await startWebSocketHub();
  const frontend = await startFrontendApp();
  const claude = await startClaudeInstance();
  
  // 2. Navigate to performance section
  await frontend.goto('/performance');
  await frontend.click('[data-testid="websocket-tab"]');
  
  // 3. Send message through UI
  await frontend.fill('[data-testid="message-input"]', 'Test message');
  await frontend.click('[data-testid="send-button"]');
  
  // 4. Verify message flow
  await expect(frontend.locator('[data-testid="message-status"]'))
    .toHaveText('Message sent');
  
  // 5. Verify Claude receives message
  const claudeMessage = await claude.waitForMessage();
  expect(claudeMessage.prompt).toBe('Test message');
  
  // 6. Send response from Claude
  claude.sendResponse('Response from Claude');
  
  // 7. Verify frontend receives response
  await expect(frontend.locator('[data-testid="response-text"]'))
    .toHaveText('Response from Claude');
});
```

### E2E-002: Multi-Instance Environment

```javascript
test('Multi-instance Claude routing', async () => {
  // 1. Start hub with prod and dev Claude instances
  const hub = await startWebSocketHub();
  const claudeProd = await startClaudeInstance('production');
  const claudeDev = await startClaudeInstance('development');
  const frontend = await startFrontendApp();
  
  // 2. Send message to production instance
  await frontend.selectClaudeInstance('production');
  await frontend.sendMessage('Production test');
  
  // 3. Verify only prod instance receives message
  const prodMessage = await claudeProd.waitForMessage();
  expect(prodMessage).toBeDefined();
  
  const devMessages = claudeDev.getReceivedMessages();
  expect(devMessages).toHaveLength(0);
  
  // 4. Switch to development instance
  await frontend.selectClaudeInstance('development');
  await frontend.sendMessage('Development test');
  
  // 5. Verify only dev instance receives message
  const devMessage = await claudeDev.waitForMessage();
  expect(devMessage).toBeDefined();
});
```

---

## 6. Security Test Requirements

### SEC-001: Channel Isolation
**Requirement:** Different user sessions must not access each other's messages

**Test:**
```javascript
test('Channel isolation between sessions', async () => {
  // 1. Create two isolated sessions
  const session1 = await createSession('user1');
  const session2 = await createSession('user2');
  
  // 2. Send sensitive message in session1
  session1.send('confidential data for user1');
  
  // 3. Verify session2 cannot access message
  const session2Messages = session2.getReceivedMessages();
  expect(session2Messages.find(msg => 
    msg.includes('confidential data for user1')
  )).toBeUndefined();
});
```

### SEC-002: Input Validation
**Requirement:** All message inputs must be validated and sanitized

**Test:**
```javascript
test('Input validation prevents injection attacks', async () => {
  const client = new WebSocketTestClient();
  await client.connect();
  
  const maliciousInputs = [
    '<script>alert("xss")</script>',
    '"; DROP TABLE users; --',
    'eval("process.exit(1)")'
  ];
  
  maliciousInputs.forEach(input => {
    client.send('message', { content: input });
  });
  
  // System should sanitize or reject malicious inputs
  const responses = await client.getReceivedMessages();
  responses.forEach(response => {
    expect(response).not.toContain('<script>');
    expect(response).not.toContain('DROP TABLE');
    expect(response).not.toContain('eval(');
  });
});
```

---

## 7. Implementation Guidelines

### Test Environment Setup
```yaml
test_environments:
  unit_tests:
    framework: "Jest"
    mocks: "Socket.IO mock, WebSocket mock"
    isolation: "Component-level testing"
    
  integration_tests:
    framework: "Jest + Testing Library"
    environment: "jsdom with WebSocket polyfill"
    dependencies: "Real WebSocket connections"
    
  e2e_tests:
    framework: "Playwright"
    browsers: "Chrome, Firefox, Safari"
    environment: "Real servers and connections"
```

### Test Data Management
```yaml
test_data:
  fixtures:
    - valid_messages.json
    - malformed_messages.json
    - performance_scenarios.json
    
  mocks:
    - claude_responses.js
    - connection_scenarios.js
    - error_conditions.js
```

### Continuous Integration
```yaml
ci_pipeline:
  stages:
    - unit_tests: "Fast feedback on code changes"
    - integration_tests: "Component interaction validation"
    - e2e_tests: "Full system validation"
    - performance_tests: "Regression detection"
    
  triggers:
    - pull_request: "All test stages"
    - main_branch: "Full test suite + performance"
    - release: "Complete test suite + security scans"
```

---

## 8. Success Metrics

### Test Coverage Requirements
- Unit test coverage: ≥90%
- Integration test coverage: ≥80%
- E2E test coverage: ≥70%
- Security test coverage: 100% of endpoints

### Performance Benchmarks
- Test execution time: <10 minutes for full suite
- Parallel test execution: Support for 4+ concurrent streams
- Flaky test rate: <2%
- Test maintenance overhead: <10% of development time

### Quality Gates
- All tests must pass before merge
- Performance tests must meet baseline requirements
- Security tests must show no vulnerabilities
- Regression tests must validate no functionality loss

This comprehensive specification ensures thorough testing of the WebSocket implementation while maintaining high standards for reliability, performance, and security.