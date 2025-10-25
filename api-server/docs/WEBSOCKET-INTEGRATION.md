# WebSocket Integration - Real-time Ticket Status Updates

## Overview

The WebSocket integration provides real-time ticket status updates via Socket.IO. When agent workers process tickets, status change events are broadcast to connected clients, enabling live UI updates without polling.

## Architecture

```
┌─────────────────────────────────────────────────────────┐
│                     Client (Frontend)                    │
│  - Connects to WebSocket server                         │
│  - Subscribes to specific posts/agents                  │
│  - Receives real-time status updates                    │
└─────────────────┬───────────────────────────────────────┘
                  │
                  │ WebSocket Connection
                  │
┌─────────────────▼───────────────────────────────────────┐
│              WebSocket Service (Socket.IO)              │
│  - Manages client connections                           │
│  - Handles subscriptions (rooms)                        │
│  - Broadcasts events to clients                         │
└─────────────────┬───────────────────────────────────────┘
                  │
                  │ Event Emission
                  │
┌─────────────────▼───────────────────────────────────────┐
│                   Agent Worker                          │
│  - Processes tickets from work queue                    │
│  - Emits status updates at key lifecycle points:        │
│    * Processing started                                 │
│    * Processing completed                               │
│    * Processing failed                                  │
└─────────────────────────────────────────────────────────┘
```

## Event Types

### 1. ticket:status:update

Emitted when a ticket status changes during worker processing.

**Event Payload:**
```json
{
  "post_id": "post-123",
  "ticket_id": "ticket-456",
  "status": "processing",
  "agent_id": "link-logger-agent",
  "timestamp": "2025-10-23T23:30:00.000Z",
  "error": null
}
```

**Status Values:**
- `pending` - Ticket created, waiting for processing
- `processing` - Worker has started processing the ticket
- `completed` - Worker successfully completed the ticket
- `failed` - Worker encountered an error (includes error message)

**Fields:**
- `post_id` (string) - ID of the post that triggered the ticket
- `ticket_id` (string) - Unique ticket identifier
- `status` (string) - Current status (see Status Values above)
- `agent_id` (string) - ID of the agent processing the ticket
- `timestamp` (string) - ISO 8601 timestamp
- `error` (string|null) - Error message if status is "failed"

### 2. worker:lifecycle

Emitted for worker lifecycle events (optional, for monitoring).

**Event Payload:**
```json
{
  "worker_id": "worker-1234567890-abc123",
  "ticket_id": "ticket-456",
  "event_type": "started",
  "timestamp": "2025-10-23T23:30:00.000Z"
}
```

## Client Implementation

### Basic Connection

```javascript
import { io } from 'socket.io-client';

const socket = io('http://localhost:3001', {
  transports: ['websocket', 'polling'],
  reconnection: true
});

socket.on('connect', () => {
  console.log('Connected to WebSocket server');
});

socket.on('ticket:status:update', (data) => {
  console.log('Ticket status updated:', data);
  // Update UI based on status change
});
```

### Subscribing to Specific Posts

To receive updates only for specific posts:

```javascript
// Subscribe to a specific post
socket.emit('subscribe:post', 'post-123');

// Unsubscribe from a post
socket.emit('unsubscribe:post', 'post-123');
```

### Subscribing to Specific Agents

To receive updates only for specific agents:

```javascript
// Subscribe to an agent
socket.emit('subscribe:agent', 'link-logger-agent');

// Unsubscribe from an agent
socket.emit('unsubscribe:agent', 'link-logger-agent');
```

### React Example

```javascript
import { useEffect, useState } from 'react';
import { io } from 'socket.io-client';

function useTicketStatus(postId) {
  const [status, setStatus] = useState(null);

  useEffect(() => {
    const socket = io('http://localhost:3001');

    socket.on('connect', () => {
      // Subscribe to this post's updates
      socket.emit('subscribe:post', postId);
    });

    socket.on('ticket:status:update', (data) => {
      if (data.post_id === postId) {
        setStatus(data);
      }
    });

    return () => {
      socket.emit('unsubscribe:post', postId);
      socket.disconnect();
    };
  }, [postId]);

  return status;
}

// Usage in component
function PostComponent({ postId }) {
  const ticketStatus = useTicketStatus(postId);

  return (
    <div>
      {ticketStatus && (
        <div className={`status-${ticketStatus.status}`}>
          {ticketStatus.status === 'processing' && 'Agent is analyzing...'}
          {ticketStatus.status === 'completed' && 'Analysis complete!'}
          {ticketStatus.status === 'failed' && `Error: ${ticketStatus.error}`}
        </div>
      )}
    </div>
  );
}
```

## Server Implementation

### WebSocket Service API

The WebSocket service is a singleton that manages Socket.IO connections.

```javascript
import websocketService from './services/websocket-service.js';

// Initialize (done automatically in server.js)
websocketService.initialize(httpServer, {
  cors: {
    origin: '*',
    methods: ['GET', 'POST']
  }
});

// Emit ticket status update
websocketService.emitTicketStatusUpdate({
  post_id: 'post-123',
  ticket_id: 'ticket-456',
  status: 'processing',
  agent_id: 'link-logger-agent',
  timestamp: new Date().toISOString()
});

// Get connection statistics
const stats = websocketService.getStats();
console.log(`Connected clients: ${stats.connected}`);
```

### Agent Worker Integration

Agent workers automatically emit status updates when:

1. Worker starts processing a ticket (status: `processing`)
2. Worker completes successfully (status: `completed`)
3. Worker encounters an error (status: `failed`)

```javascript
// In AgentWorker class
async execute() {
  try {
    // Fetch ticket
    const ticket = await this.fetchTicket();

    // Emit processing started
    this.emitStatusUpdate('processing');

    // Process the ticket
    const result = await this.processURL(ticket);

    // Emit completion
    this.emitStatusUpdate('completed');

    return result;
  } catch (error) {
    // Emit failure with error message
    this.emitStatusUpdate('failed', { error: error.message });
    throw error;
  }
}
```

## Configuration

WebSocket service is configured in `server.js`:

```javascript
websocketService.initialize(server, {
  cors: {
    origin: process.env.CORS_ORIGIN || '*',
    methods: ['GET', 'POST'],
    credentials: true
  },
  transports: ['websocket', 'polling'],
  path: '/socket.io/',
  pingTimeout: 60000,
  pingInterval: 25000
});
```

### Environment Variables

- `CORS_ORIGIN` - Allowed CORS origin (default: '*')
- `AVI_ORCHESTRATOR_ENABLED` - Enable/disable orchestrator (default: 'true')

## Testing

### Unit Tests

Run WebSocket integration tests:

```bash
npm test -- tests/integration/websocket-events.test.js
```

### Manual Testing

Use the manual test client:

```bash
node tests/manual/test-websocket-client.js
```

This will connect to the WebSocket server and log all events to the console.

### Testing with Real Tickets

1. Start the server:
   ```bash
   npm start
   ```

2. In another terminal, connect the test client:
   ```bash
   node tests/manual/test-websocket-client.js
   ```

3. Create a post with a URL to trigger the agent:
   ```bash
   curl -X POST http://localhost:3001/api/agent-posts \
     -H "Content-Type: application/json" \
     -d '{"content": "Check out https://example.com", "author": "test-user"}'
   ```

4. Watch the test client console for real-time status updates

## Monitoring

### Connection Statistics

Get current connection stats:

```javascript
const stats = websocketService.getStats();
console.log({
  connected: stats.connected,  // Number of connected clients
  rooms: stats.rooms,          // Number of active rooms
  timestamp: stats.timestamp   // Current timestamp
});
```

### Server Logs

WebSocket events are logged to the console:

```
WebSocket client connected: abc123def456
Client abc123def456 subscribed to post:post-123
Emitted ticket:status:update - Ticket: ticket-456, Status: processing
WebSocket client disconnected: abc123def456, reason: transport close
```

## Error Handling

### Client-Side

```javascript
socket.on('connect_error', (error) => {
  console.error('Connection failed:', error.message);
  // Implement reconnection logic or fallback to polling
});

socket.on('error', (error) => {
  console.error('Socket error:', error);
});
```

### Server-Side

The WebSocket service gracefully handles:
- Invalid status values (logs error, skips emission)
- Missing WebSocket service (silently skips emission)
- Client disconnections (automatic cleanup)
- Server errors (logged to console)

## Best Practices

1. **Always validate status values** - Only use: pending, processing, completed, failed
2. **Include timestamps** - Use ISO 8601 format for all timestamps
3. **No emojis in events** - Keep event payloads clean and parseable
4. **Subscribe to specific rooms** - Reduce unnecessary event traffic
5. **Handle disconnections** - Implement reconnection logic on client
6. **Graceful degradation** - Don't fail if WebSocket is unavailable

## Security Considerations

1. **CORS Configuration** - Restrict origins in production
2. **Authentication** - Add token-based auth for WebSocket connections (future enhancement)
3. **Rate Limiting** - Implement client-side rate limits (future enhancement)
4. **Event Validation** - All events are validated before emission

## Performance

- **Lightweight events** - Small JSON payloads (< 1KB)
- **Room-based broadcasting** - Only send to subscribed clients
- **Connection pooling** - Socket.IO handles connection reuse
- **Fallback to polling** - Automatic fallback if WebSocket unavailable

## Troubleshooting

### WebSocket not connecting

1. Check server is running: `curl http://localhost:3001/health`
2. Verify Socket.IO endpoint: `curl http://localhost:3001/socket.io/`
3. Check CORS configuration matches client origin
4. Ensure firewall allows WebSocket connections

### Not receiving events

1. Verify client is subscribed to correct room
2. Check server logs for emission confirmation
3. Verify ticket processing is triggering workers
4. Test with manual test client

### Events received but missing data

1. Verify event payload format matches documentation
2. Check for JSON parsing errors on client
3. Validate timestamp format is ISO 8601
4. Ensure all required fields are present

## Future Enhancements

1. **Authentication & Authorization** - Token-based WebSocket auth
2. **Event History** - Store recent events for late-joining clients
3. **Presence Detection** - Track online/offline users
4. **Typing Indicators** - Real-time collaboration features
5. **Batch Updates** - Coalesce rapid status changes
6. **Event Replay** - Replay missed events on reconnection

## API Reference

### WebSocket Service Methods

#### `initialize(httpServer, options)`
Initialize the WebSocket service with HTTP server.

#### `emitTicketStatusUpdate(payload)`
Emit a ticket status update event to all subscribed clients.

#### `emitWorkerEvent(payload)`
Emit a worker lifecycle event.

#### `getIO()`
Get the Socket.IO server instance.

#### `isInitialized()`
Check if the service is initialized.

#### `getStats()`
Get connection statistics.

### Client Events (Emit)

- `subscribe:post` - Subscribe to post-specific updates
- `unsubscribe:post` - Unsubscribe from post updates
- `subscribe:agent` - Subscribe to agent-specific updates
- `unsubscribe:agent` - Unsubscribe from agent updates

### Server Events (Listen)

- `connected` - Connection confirmation from server
- `ticket:status:update` - Ticket status changed
- `worker:lifecycle` - Worker lifecycle event
- `error` - Server error occurred
