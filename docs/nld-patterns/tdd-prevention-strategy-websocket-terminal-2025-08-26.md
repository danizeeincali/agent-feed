# TDD Prevention Strategy: WebSocket Terminal Streaming Failures
**Target System**: agent-feed WebSocket Terminal Architecture  
**Failure Pattern**: Initialization Order Race Conditions & Connection Storms  
**TDD Approach**: London School (Mock-Heavy) + Property-Based Testing

## Overview

This TDD strategy prevents WebSocket terminal streaming failures through comprehensive test coverage that would have caught the initialization race condition before production. The approach focuses on testing service initialization order, WebSocket namespace isolation, and error propagation handling.

## Test-Driven Prevention Framework

### Phase 1: Unit Test Foundation

#### 1.1 Service Initialization Order Tests
```typescript
// tests/unit/server-initialization.test.ts
describe('Server Initialization Order', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('should initialize terminalStreamingServiceInstance before WebSocket handlers', async () => {
    // GIVEN: Server initialization process
    const mockIO = createMockSocketIO();
    
    // WHEN: Server initializes
    const serverInstance = await initializeServer(mockIO);
    
    // THEN: Terminal streaming service must be defined before WebSocket setup
    expect(serverInstance.terminalStreamingServiceInstance).toBeDefined();
    expect(serverInstance.terminalStreamingServiceInstance).not.toBeNull();
  });

  it('should fail fast if terminalStreamingServiceInstance is accessed before initialization', () => {
    // GIVEN: Uninitialized server state
    const mockSocket = createMockSocket();
    
    // WHEN: Handler tries to access terminalStreamingServiceInstance
    // THEN: Should throw clear error, not ReferenceError
    expect(() => {
      handleTerminalSessionsList(mockSocket);
    }).toThrow('Terminal streaming service not initialized');
  });

  it('should initialize WebSocket namespaces in correct order', () => {
    // GIVEN: Socket.IO server instance
    const mockIO = createMockSocketIO();
    
    // WHEN: Namespaces are created
    initializeWebSocketNamespaces(mockIO);
    
    // THEN: Terminal namespace should be created before streaming handlers
    expect(mockIO.of).toHaveBeenCalledWith('/terminal');
    expect(mockIO.of).toHaveBeenCalledBefore(
      mockIO.of.bind(mockIO, '/terminal-streaming')
    );
  });
});
```

#### 1.2 WebSocket Namespace Isolation Tests
```typescript
// tests/unit/websocket-namespace.test.ts
describe('WebSocket Namespace Isolation', () => {
  it('should prevent namespace conflicts between /terminal and /terminal-streaming', () => {
    // GIVEN: Mock Socket.IO with both namespaces
    const mockIO = createMockSocketIO();
    const terminalNamespace = mockIO.of('/terminal');
    const streamingNamespace = mockIO.of('/terminal-streaming');
    
    // WHEN: Both services initialize
    const terminalService = new ClaudeInstanceTerminalWebSocket(mockIO);
    const streamingService = new AdvancedTerminalStreamingService(mockIO);
    
    // THEN: Each should handle distinct event types
    expect(terminalNamespace.on).toHaveBeenCalledWith('connect_to_instance', expect.any(Function));
    expect(streamingNamespace.on).toHaveBeenCalledWith('streaming:start', expect.any(Function));
    
    // AND: No event handler conflicts
    const terminalEvents = getRegisteredEvents(terminalNamespace);
    const streamingEvents = getRegisteredEvents(streamingNamespace);
    expect(terminalEvents).not.toEqual(streamingEvents);
  });

  it('should route connections to correct namespace based on client request', async () => {
    // GIVEN: Client connects to specific namespace
    const mockSocket = createMockSocket();
    mockSocket.handshake.url = '/terminal';
    
    // WHEN: Connection is routed
    const handler = routeWebSocketConnection(mockSocket);
    
    // THEN: Should use correct service
    expect(handler).toBeInstanceOf(ClaudeInstanceTerminalWebSocket);
  });
});
```

### Phase 2: Integration Test Coverage

#### 2.1 End-to-End Terminal Workflow Tests
```typescript
// tests/integration/terminal-streaming-e2e.test.ts
describe('Terminal Streaming End-to-End', () => {
  let server: Server;
  let client: Socket;
  
  beforeEach(async () => {
    server = await startTestServer();
    client = io('http://localhost:3001/terminal');
  });

  it('should complete full terminal streaming workflow without crashes', (done) => {
    // GIVEN: Client connects to terminal namespace
    client.on('connect', () => {
      // WHEN: Client requests instance connection
      client.emit('connect_to_instance', { instanceId: 'test-instance' });
    });

    // THEN: Should receive terminal data without reconnection storm
    client.on('terminal:instance_connected', (data) => {
      expect(data.instanceId).toBe('test-instance');
      expect(data.terminalSize).toBeDefined();
      done();
    });

    client.on('disconnect', (reason) => {
      if (reason === 'transport error') {
        done(new Error('Transport error indicates WebSocket failure'));
      }
    });
  });

  it('should handle WebSocket reconnection gracefully without storm', async () => {
    // GIVEN: Connected client
    await connectClient(client);
    
    // WHEN: Connection drops
    client.disconnect();
    
    // THEN: Reconnection should not create storm
    const reconnectAttempts = trackReconnectionAttempts(client);
    
    await new Promise(resolve => setTimeout(resolve, 10000)); // Wait 10 seconds
    expect(reconnectAttempts.length).toBeLessThan(5); // Max 5 attempts in 10 seconds
  });

  it('should maintain terminal session across reconnections', async () => {
    // GIVEN: Active terminal session
    const sessionId = await createTerminalSession(client);
    
    // WHEN: Client reconnects
    client.disconnect();
    await reconnectClient(client);
    
    // THEN: Session should be preserved
    const sessionStatus = await getSessionStatus(client, sessionId);
    expect(sessionStatus.isActive).toBe(true);
  });
});
```

#### 2.2 Dependency Chain Resilience Tests  
```typescript
// tests/integration/dependency-resilience.test.ts
describe('Dependency Chain Resilience', () => {
  it('should handle claude-instance-manager failures gracefully', async () => {
    // GIVEN: Mock claude-instance-manager that fails
    const failingManager = createFailingClaudeInstanceManager();
    const server = createServerWithMockedManager(failingManager);
    
    // WHEN: Client tries to connect to instance
    const client = io('http://localhost:3001/terminal');
    const result = await attemptInstanceConnection(client, 'test-instance');
    
    // THEN: Should receive error, not crash server
    expect(result.success).toBe(false);
    expect(result.error).toContain('Instance manager unavailable');
    expect(server.listening).toBe(true); // Server still running
  });

  it('should implement circuit breaker for connection failures', async () => {
    // GIVEN: Service with circuit breaker configuration
    const config = { 
      maxFailures: 3, 
      resetTimeout: 5000,
      monitorPeriod: 10000
    };
    const service = new AdvancedTerminalStreamingService(mockIO, config);
    
    // WHEN: Multiple connections fail
    for (let i = 0; i < 5; i++) {
      await attemptFailingConnection(service);
    }
    
    // THEN: Circuit breaker should open
    expect(service.circuitBreakerState).toBe('OPEN');
    
    // AND: New connections should be rejected quickly
    const start = Date.now();
    const result = await attemptConnection(service);
    const duration = Date.now() - start;
    
    expect(result.success).toBe(false);
    expect(duration).toBeLessThan(100); // Fast rejection
  });
});
```

### Phase 3: Property-Based & Stress Testing

#### 3.1 Connection Storm Prevention Tests
```typescript
// tests/stress/connection-storm.test.ts
describe('Connection Storm Prevention', () => {
  it('should prevent WebSocket reconnection storms', async () => {
    // PROPERTY: No client should reconnect more than X times per minute
    const maxReconnectsPerMinute = 10;
    
    fc.assert(fc.asyncProperty(
      fc.array(fc.record({
        clientId: fc.string(),
        reconnectInterval: fc.integer(1000, 5000),
        failureRate: fc.float(0, 1)
      }), { minLength: 10, maxLength: 50 }),
      async (clients) => {
        // GIVEN: Multiple clients with varying reconnect behavior
        const server = await startTestServer();
        const reconnectCounts = new Map();
        
        // WHEN: Clients connect and reconnect over 1 minute
        await Promise.all(clients.map(async (clientConfig) => {
          const client = createTestClient(clientConfig);
          const count = await simulateReconnections(client, 60000);
          reconnectCounts.set(clientConfig.clientId, count);
        }));
        
        // THEN: No client should exceed reconnect limit
        for (const [clientId, count] of reconnectCounts) {
          expect(count).toBeLessThanOrEqual(maxReconnectsPerMinute);
        }
      }
    ));
  });

  it('should handle concurrent terminal sessions without resource exhaustion', async () => {
    // PROPERTY: System should handle N concurrent terminals without degradation
    fc.assert(fc.asyncProperty(
      fc.integer(1, 100),
      async (concurrentSessions) => {
        // GIVEN: Multiple concurrent terminal sessions
        const server = await startTestServer();
        const sessions = [];
        
        // WHEN: Creating concurrent terminal sessions
        for (let i = 0; i < concurrentSessions; i++) {
          const session = await createTerminalSession();
          sessions.push(session);
        }
        
        // THEN: All sessions should be active
        const activeCount = sessions.filter(s => s.isActive).length;
        expect(activeCount).toBe(concurrentSessions);
        
        // AND: Server memory usage should be reasonable
        const memoryUsage = process.memoryUsage();
        expect(memoryUsage.heapUsed).toBeLessThan(500 * 1024 * 1024); // 500MB
      }
    ));
  });
});
```

### Phase 4: Mock Strategy & Test Doubles

#### 4.1 WebSocket Service Mocks
```typescript
// tests/mocks/websocket-mocks.ts
export class MockSocketIOServer {
  private namespaces = new Map();
  
  of(namespace: string) {
    if (!this.namespaces.has(namespace)) {
      this.namespaces.set(namespace, new MockNamespace(namespace));
    }
    return this.namespaces.get(namespace);
  }
  
  // Track initialization order for testing
  getNamespaceCreationOrder(): string[] {
    return Array.from(this.namespaces.keys());
  }
}

export class MockNamespace {
  private eventHandlers = new Map();
  
  on(event: string, handler: Function) {
    this.eventHandlers.set(event, handler);
  }
  
  emit(event: string, data: any) {
    // Mock event emission for testing
  }
  
  getRegisteredEvents(): string[] {
    return Array.from(this.eventHandlers.keys());
  }
}
```

#### 4.2 Claude Instance Manager Mocks
```typescript
// tests/mocks/claude-instance-manager-mock.ts
export class MockClaudeInstanceManager extends EventEmitter {
  private instances = new Map();
  private failureMode = false;
  
  setFailureMode(enabled: boolean) {
    this.failureMode = enabled;
  }
  
  async getInstanceStatus(instanceId: string) {
    if (this.failureMode) {
      throw new Error('Instance manager failed');
    }
    return this.instances.get(instanceId) || null;
  }
  
  addTerminalClient(instanceId: string, clientId: string) {
    if (this.failureMode) {
      throw new Error('Cannot add terminal client');
    }
    // Mock implementation
  }
  
  // Simulate terminal data events for testing
  simulateTerminalData(instanceId: string, data: string) {
    this.emit('terminalData', instanceId, data);
  }
}
```

## Test Implementation Strategy

### 1. Red-Green-Refactor Cycles
1. **Red**: Write failing test that exposes initialization race condition
2. **Green**: Fix initialization order to make test pass  
3. **Refactor**: Improve service architecture while keeping tests green

### 2. Test Coverage Targets
- **Unit Tests**: 95% coverage on service initialization logic
- **Integration Tests**: 90% coverage on WebSocket connection workflows  
- **End-to-End Tests**: 100% coverage on critical user paths

### 3. Continuous Testing Pipeline
```yaml
# .github/workflows/websocket-tests.yml
name: WebSocket Terminal Tests
on: [push, pull_request]

jobs:
  unit-tests:
    runs-on: ubuntu-latest
    steps:
      - name: Run Unit Tests
        run: npm run test:unit:websocket
        
  integration-tests:
    runs-on: ubuntu-latest
    steps:
      - name: Run Integration Tests  
        run: npm run test:integration:terminal
        
  stress-tests:
    runs-on: ubuntu-latest
    if: github.ref == 'refs/heads/main'
    steps:
      - name: Run Connection Storm Tests
        run: npm run test:stress:websocket
```

## Monitoring & Alerting Integration

### Test-Driven Monitoring
```typescript
// tests/monitoring/websocket-health.test.ts
describe('WebSocket Health Monitoring', () => {
  it('should detect reconnection storms in real-time', async () => {
    // GIVEN: Health monitoring enabled
    const monitor = new WebSocketHealthMonitor();
    
    // WHEN: Reconnection storm occurs
    simulateReconnectionStorm(50); // 50 reconnects in 30 seconds
    
    // THEN: Alert should be triggered
    const alerts = await monitor.getAlerts();
    expect(alerts).toContainEqual(
      expect.objectContaining({
        type: 'RECONNECTION_STORM',
        severity: 'CRITICAL'
      })
    );
  });
});
```

## Success Metrics

### Test Effectiveness Measures
1. **Initialization Race Conditions**: 0 occurrences (currently: multiple daily)
2. **WebSocket Connection Success Rate**: >99% (currently: 0%)  
3. **Terminal Session Availability**: >99.9% (currently: 0%)
4. **Mean Time to Detection**: <30 seconds (vs current: hours)
5. **Mean Time to Resolution**: <5 minutes (vs current: manual intervention)

## Conclusion

This TDD strategy transforms the WebSocket terminal streaming architecture from a fragile, failure-prone system into a robust, well-tested service. By implementing these tests before fixing the current issues, similar problems will be prevented in the future and the codebase will have comprehensive regression protection.

**Implementation Priority**:
1. Phase 1 (Unit Tests) - Implement immediately alongside bug fixes
2. Phase 2 (Integration) - Complete within 1 week  
3. Phase 3 (Stress Testing) - Complete within 2 weeks
4. Phase 4 (Advanced Monitoring) - Complete within 1 month

**Expected Outcome**: Zero terminal streaming failures in production with comprehensive test coverage preventing regression.

---
**Report Generated by**: NLD Agent - TDD Prevention Analysis  
**Methodology**: London School TDD + Property-Based Testing  
**Target Architecture**: WebSocket Terminal Streaming Services