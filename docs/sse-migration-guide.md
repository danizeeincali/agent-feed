# WebSocket to HTTP+SSE Migration Guide

## Overview

This guide documents the complete migration from WebSocket-based to HTTP+SSE-based communication for Claude instance management in the Interactive Control tab.

## Architecture Changes

### Before: WebSocket Architecture
- Single WebSocket connection per instance
- Bidirectional communication over persistent connection
- Real-time messaging via WebSocket protocol
- Complex connection state management

### After: HTTP+SSE Architecture
- **Server-Sent Events (SSE)** for real-time output streaming
- **HTTP POST** requests for command input
- Unidirectional SSE for output, HTTP for input
- Simplified connection management with better error handling

## Key Components

### 1. SSEClaudeInstanceManager
**Location**: `src/managers/ClaudeInstanceManager.ts`

Replaces the WebSocket-based manager with:
- SSE connection management
- HTTP command execution
- Connection state machine
- Automatic reconnection with exponential backoff
- Resource cleanup and error handling

### 2. useSSEClaudeInstance Hook
**Location**: `src/hooks/useSSEClaudeInstance.ts`

React hook providing:
- Reactive state management for SSE connections
- Instance lifecycle management
- Output streaming and command sending
- Connection status tracking
- Error handling and recovery

### 3. SSE Connection Service
**Location**: `src/services/SSEConnectionService.ts`

Low-level SSE management:
- EventSource connection handling
- Message parsing and routing
- Connection health monitoring
- Reconnection logic with backoff

### 4. HTTP Command Service
**Location**: `src/services/HTTPCommandService.ts`

HTTP-based command execution:
- POST request handling for commands
- Retry logic with exponential backoff
- Request/response validation
- Performance monitoring and statistics

## Component Updates

### Updated Components

1. **ClaudeInstanceManagerComponentSSE**
   - Complete SSE-based replacement
   - Reactive state management
   - Enhanced UI feedback
   - Better error handling

2. **SSETerminalInterface**
   - Dedicated terminal component
   - Command history navigation
   - Real-time output streaming
   - Connection status indicators

## Backend Endpoints Used

### SSE Endpoint
```
GET /api/claude/instances/{instanceId}/terminal/stream
```
- Streams real-time terminal output
- Returns Server-Sent Events
- Automatic reconnection support

### Command Input Endpoint
```
POST /api/claude/instances/{instanceId}/terminal/input
Content-Type: application/json

{
  "input": "command to execute\\n"
}
```

### Instance Management
```
GET /api/claude/instances
GET /api/claude/instances/{instanceId}
DELETE /api/claude/instances/{instanceId}
```

## Technical Benefits

### 1. Improved Reliability
- **Automatic Reconnection**: Exponential backoff with jitter
- **Connection Health Monitoring**: Heartbeat detection
- **Error Recovery**: Graceful degradation and recovery
- **Resource Management**: Proper cleanup and memory management

### 2. Better Performance
- **Reduced Connection Overhead**: HTTP requests vs persistent WebSockets
- **Bandwidth Efficiency**: Only send data when needed
- **Connection Pooling**: Browser HTTP/2 connection reuse
- **Caching**: HTTP caching for static resources

### 3. Enhanced Debugging
- **HTTP Request Logs**: Standard browser network tools
- **Clear Error Messages**: HTTP status codes and responses
- **Performance Metrics**: Request timing and statistics
- **Connection States**: Clear state machine transitions

### 4. Simplified Architecture
- **Unidirectional Streams**: SSE for output, HTTP for input
- **Standard Protocols**: HTTP/SSE vs custom WebSocket messages
- **Browser Support**: Native EventSource API
- **Firewall Friendly**: Standard HTTP ports and protocols

## Migration Implementation

### State Management
```typescript
// Old WebSocket approach
const [socket, setSocket] = useState<WebSocket | null>(null);

// New SSE approach
const {
  isConnected,
  connectionState,
  output,
  sendCommand,
  connectToInstance
} = useSSEClaudeInstance({ apiUrl });
```

### Connection Management
```typescript
// Old: Complex WebSocket lifecycle
useEffect(() => {
  const ws = new WebSocket(wsUrl);
  ws.onopen = () => setConnected(true);
  ws.onmessage = handleMessage;
  ws.onerror = handleError;
  ws.onclose = handleClose;
  return () => ws.close();
}, []);

// New: Simplified SSE lifecycle
const manager = new SSEClaudeInstanceManager({ apiUrl });
await manager.connectToInstance(instanceId);
```

### Error Handling
```typescript
// Old: Manual error handling
ws.onerror = (error) => {
  setError('WebSocket error');
  // Manual reconnection logic
};

// New: Automatic error recovery
manager.on('instance:error', ({ error }) => {
  // Automatic reconnection with backoff
  // Clear error messaging
});
```

## Connection State Machine

### States
1. **DISCONNECTED**: No active connection
2. **CONNECTING**: Establishing SSE connection
3. **CONNECTED**: Active SSE stream
4. **RECONNECTING**: Attempting reconnection
5. **ERROR**: Connection failed

### Transitions
```
DISCONNECTED → CONNECTING → CONNECTED
             ↑              ↓
ERROR ←───────────────── RECONNECTING
```

## Error Recovery Strategy

### 1. Automatic Reconnection
- Exponential backoff: 2s, 4s, 8s, 16s, 30s (max)
- Jitter to prevent thundering herd
- Maximum 5 reconnection attempts
- Reset counter on successful connection

### 2. Graceful Degradation
- Display connection status to user
- Queue commands during reconnection
- Preserve terminal output history
- Clear error feedback

### 3. Resource Cleanup
- Automatic EventSource closure
- AbortController for HTTP requests
- Timer cleanup for reconnection
- Memory leak prevention

## Testing Strategy

### Unit Tests
- SSEClaudeInstanceManager connection lifecycle
- HTTP command service error handling
- Connection state machine transitions
- Message parsing and validation

### Integration Tests
- End-to-end SSE connection flow
- Command execution and response
- Reconnection behavior
- Error recovery scenarios

### Manual Testing
- Multiple instance connections
- Network interruption recovery
- Long-running sessions
- Performance under load

## Performance Considerations

### Memory Management
- Output buffer size limits (1000 messages)
- Automatic cleanup of old connections
- Event listener deregistration
- Timer cleanup on unmount

### Network Efficiency
- HTTP/2 connection reuse
- Gzip compression for responses
- Minimal payload sizes
- Connection pooling

### UI Responsiveness
- Virtual scrolling for large outputs
- Debounced input handling
- Non-blocking state updates
- Progressive rendering

## Backwards Compatibility

### Legacy Support
- Original WebSocket components preserved
- Gradual migration path
- Feature flag support
- Parallel implementation testing

### API Compatibility
- Same component interfaces
- Equivalent functionality
- Similar error handling
- Consistent user experience

## Deployment Considerations

### Server Configuration
- SSE endpoint implementation
- CORS headers for EventSource
- Connection timeout settings
- Load balancer configuration

### Client Configuration
- EventSource polyfill (if needed)
- HTTP timeout settings
- Reconnection parameters
- Debug logging levels

### Monitoring
- Connection success rates
- Error frequency tracking
- Performance metrics
- User experience analytics

## Troubleshooting Guide

### Common Issues

1. **SSE Connection Fails**
   - Check CORS headers
   - Verify endpoint URL
   - Inspect network logs
   - Test with curl/wget

2. **Commands Not Executing**
   - Validate instance ID format
   - Check HTTP POST endpoint
   - Verify request payload
   - Review server logs

3. **Reconnection Loops**
   - Check server availability
   - Verify instance status
   - Review reconnection limits
   - Monitor connection health

### Debug Tools
- Browser Network tab
- EventSource connection status
- Console error messages
- React Developer Tools

## Future Enhancements

### Planned Improvements
1. **WebRTC Data Channels**: For high-frequency interactions
2. **GraphQL Subscriptions**: For structured real-time data
3. **Service Workers**: For offline capability
4. **Push Notifications**: For background updates

### Optimization Opportunities
1. **Connection Multiplexing**: Multiple instances over single SSE
2. **Compression**: Custom compression for terminal output
3. **Caching**: Intelligent output caching
4. **Prefetching**: Predictive instance loading

## Conclusion

The migration from WebSocket to HTTP+SSE provides:
- **Better reliability** through automatic reconnection
- **Improved performance** with standard HTTP protocols
- **Enhanced debugging** with browser network tools
- **Simplified architecture** using unidirectional streams

This implementation maintains full feature parity while providing a more robust and maintainable foundation for Claude instance management.