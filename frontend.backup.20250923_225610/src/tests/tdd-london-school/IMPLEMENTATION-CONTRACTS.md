# Implementation Contracts from TDD London School Tests

## Contract Definitions

The mock-driven tests have defined the following behavioral contracts that MUST be implemented:

## 1. InstanceManagerContract

```typescript
interface InstanceManagerContract {
  fetchInstances(): Promise<void>;
  selectInstance(instanceId: string): void;
  refreshInstances(): Promise<void>;
  connectToInstance(instanceId: string): Promise<boolean>;
}
```

### Expected Behaviors:
- `fetchInstances()` must call `/api/claude/instances` endpoint
- `selectInstance()` must coordinate connection and state updates
- `refreshInstances()` must handle cache invalidation
- `connectToInstance()` must return boolean success/failure

## 2. SSEConnectionContract

```typescript
interface SSEConnectionContract {
  connect(instanceId: string): EventSource;
  disconnect(): void;
  onMessage(callback: (data: any) => void): void;
  onError(callback: (error: Error) => void): void;
  getConnectionState(): ConnectionState;
  getConnectedInstanceId(): string | null;
}

type ConnectionState = 'disconnected' | 'connecting' | 'connected' | 'reconnecting' | 'error';
```

### Expected Behaviors:
- `connect()` must create EventSource with proper URL and credentials
- Event listeners must be set up for 'open', 'message', 'error'
- Connection state must transition properly
- Cleanup must remove all event listeners

## 3. API Contracts

### Instance List Endpoint
```
GET /api/claude/instances
Headers: { 'Content-Type': 'application/json' }

Response: {
  instances: [
    {
      id: string,
      status: 'active' | 'standby' | 'busy',
      type: 'primary' | 'secondary' | 'tertiary',
      lastSeen: ISO8601 timestamp,
      endpoint?: string
    }
  ]
}

Error: HTTP status with { error: string, message: string }
```

### SSE Endpoint
```
GET /api/claude/instances/{instanceId}/events
Headers: { withCredentials: true }

Message Types:
- instance_status: { status, currentTask? }
- instance_list_update: { instances }
- connection_confirmed: { connectionId }
- error: { error, message }
```

## 4. Component State Contracts

```typescript
interface ComponentState {
  instances: Instance[];
  selectedInstanceId: string;
  isLoading: boolean;
  error: Error | null;
  connectionState: ConnectionState;
}
```

### State Transitions:
1. **Initial Load**: isLoading=true → fetchInstances() → instances populated
2. **Instance Selection**: selectInstance() → connecting → connected/error
3. **Refresh**: refreshInstances() → isLoading=true → updated instances
4. **Error Handling**: error state set → user notification → recovery attempt

## 5. Error Handling Contracts

```typescript
interface ErrorHandler {
  handleConnectionError(instanceId: string, error: Error): void;
  handleApiError(error: Error): void;
  handleSSEError(instanceId: string, error: Error): void;
  attemptRecovery(instanceId: string): Promise<boolean>;
}
```

### Error Scenarios:
- **Network Errors**: Retry with exponential backoff
- **HTTP Errors**: Display user-friendly messages
- **Instance Not Found**: Fallback to available instance
- **SSE Connection Loss**: Auto-reconnect with backoff

## Implementation Priority

### P0 - Critical (Fixes sync issue)
1. Implement `InstanceService.fetchInstances()`
2. Add component lifecycle in existing managers
3. Implement instance selection coordination

### P1 - High (Improves reliability)
1. Create `SSEConnectionManager`
2. Add proper error handling
3. Implement cache invalidation

### P2 - Medium (Enhances UX)
1. Add exponential backoff for reconnections
2. Implement graceful fallbacks
3. Add connection state indicators

### P3 - Low (Nice-to-have)
1. Cross-tab synchronization
2. Advanced error recovery
3. Connection metrics

## Test-Driven Implementation Approach

1. **Red**: Tests are already failing (contracts not implemented)
2. **Green**: Implement minimal code to make tests pass
3. **Refactor**: Improve implementation while keeping tests green

Each contract MUST satisfy the behavioral expectations defined in the test mocks. No additional functionality should be implemented unless required by a test.

## Validation

Implementation is complete when:
- All TDD London School tests pass ✅
- Real Claude instance synchronization works ✅
- Error scenarios are handled gracefully ✅
- Component lifecycle is properly managed ✅