# useTicketUpdates Hook

React hook for listening to real-time ticket status updates via Socket.IO.

## Overview

The `useTicketUpdates` hook provides real-time WebSocket connectivity for ticket status updates in the Agent Feed application. It automatically manages connection lifecycle, integrates with React Query for cache invalidation, and provides optional toast notifications.

## Installation

The hook requires `socket.io-client` and `@tanstack/react-query`:

```bash
npm install socket.io-client @tanstack/react-query
```

## Files Created

- `/frontend/src/services/socket.js` - Socket.IO client service
- `/frontend/src/hooks/useTicketUpdates.js` - Main hook implementation
- `/frontend/src/hooks/useTicketUpdates.example.jsx` - Usage examples
- `/frontend/src/hooks/useTicketUpdates.README.md` - This documentation

## Basic Usage

```javascript
import { useTicketUpdates } from './hooks/useTicketUpdates';

function AgentFeed() {
  // Call at top level - handles everything automatically
  useTicketUpdates();

  return <div>Your feed content</div>;
}
```

## Features

- Automatic Socket.IO connection/disconnection lifecycle
- React Query cache invalidation on ticket updates
- Optional toast notifications for status changes
- Custom update handlers for advanced use cases
- Conditional activation (enable/disable)
- Proper cleanup on unmount
- Error handling and reconnection logic
- Support for post-specific and agent-specific subscriptions

## API

### Parameters

```typescript
useTicketUpdates(options?: {
  enabled?: boolean;           // Enable/disable hook (default: true)
  showNotifications?: boolean; // Show toast notifications (default: false)
  toast?: {                    // Toast handlers (required if showNotifications=true)
    success: (msg: string) => void;
    error: (msg: string) => void;
    info: (msg: string) => void;
  };
  onUpdate?: (data: TicketUpdate) => void; // Custom update handler
})
```

### Return Value

```typescript
{
  socket: Socket;      // Socket.IO instance for advanced usage
  isConnected: boolean; // Connection status
}
```

### Event Data Structure

The hook listens for `ticket:status:update` events with this payload:

```typescript
{
  post_id: string;      // Post being analyzed
  ticket_id: string;    // Unique ticket identifier
  status: 'pending' | 'processing' | 'completed' | 'failed';
  agent_id: string;     // Agent processing the ticket
  timestamp: string;    // ISO timestamp
  error?: string;       // Error message (only when status === 'failed')
}
```

## Usage Examples

### 1. Basic Integration

```javascript
import { useTicketUpdates } from './hooks/useTicketUpdates';

function AgentFeed() {
  useTicketUpdates();

  return <div>Your feed</div>;
}
```

### 2. With Toast Notifications

```javascript
import { useTicketUpdates } from './hooks/useTicketUpdates';
import { useToast } from './hooks/useToast';

function AgentFeed() {
  const toast = useToast();

  useTicketUpdates({
    showNotifications: true,
    toast: {
      success: (msg) => toast.showSuccess(msg),
      error: (msg) => toast.showError(msg),
      info: (msg) => toast.showInfo(msg)
    }
  });

  return <div>Your feed</div>;
}
```

### 3. With Custom Handler

```javascript
function AgentFeed() {
  const [lastUpdate, setLastUpdate] = useState(null);

  useTicketUpdates({
    onUpdate: (data) => {
      setLastUpdate(data);

      // Custom logic
      if (data.status === 'failed') {
        console.error('Ticket failed:', data.error);
      }
    }
  });

  return (
    <div>
      {lastUpdate && (
        <div>Last update: {lastUpdate.agent_id} - {lastUpdate.status}</div>
      )}
    </div>
  );
}
```

### 4. Conditional Activation

```javascript
function AgentFeed() {
  const [enableUpdates, setEnableUpdates] = useState(true);

  const { isConnected } = useTicketUpdates({
    enabled: enableUpdates
  });

  return (
    <div>
      <button onClick={() => setEnableUpdates(!enableUpdates)}>
        Toggle Updates
      </button>
      <span>Status: {isConnected ? 'Connected' : 'Disconnected'}</span>
    </div>
  );
}
```

### 5. Advanced: Direct Socket Access

```javascript
function AgentFeed() {
  const { socket } = useTicketUpdates();

  useEffect(() => {
    if (!socket) return;

    // Subscribe to specific posts or agents
    socket.emit('subscribe:post', 'post-123');
    socket.emit('subscribe:agent', 'link-logger-agent');

    return () => {
      socket.emit('unsubscribe:post', 'post-123');
      socket.emit('unsubscribe:agent', 'link-logger-agent');
    };
  }, [socket]);

  return <div>Your feed</div>;
}
```

## Backend Integration

The hook connects to the Socket.IO server at `http://localhost:3001` (development) or same origin (production).

### Backend Events

The backend emits these events:

- `ticket:status:update` - Ticket status changed
- `worker:lifecycle` - Agent worker lifecycle events
- `connected` - Initial connection confirmation

### Backend Subscriptions

You can subscribe to specific rooms:

```javascript
socket.emit('subscribe:post', postId);      // Subscribe to post updates
socket.emit('unsubscribe:post', postId);    // Unsubscribe from post
socket.emit('subscribe:agent', agentId);    // Subscribe to agent updates
socket.emit('unsubscribe:agent', agentId);  // Unsubscribe from agent
```

## React Query Integration

The hook automatically invalidates React Query cache when ticket updates occur:

```javascript
// Global posts query invalidation
queryClient.invalidateQueries({ queryKey: ['posts'] });

// Specific post query invalidation
queryClient.invalidateQueries({ queryKey: ['post', data.post_id] });
```

It also optimistically updates the cache for instant UI updates:

```javascript
queryClient.setQueryData(['posts'], (oldData) => {
  // Update specific post with ticket status
  // Works with both array and paginated data structures
});
```

## Configuration

### Socket.IO Client (`/frontend/src/services/socket.js`)

The socket client is configured with:

- Auto-detect backend URL (localhost:3001 for dev, same origin for prod)
- Manual connection control (autoConnect: false)
- Automatic reconnection (5 attempts with exponential backoff)
- Both WebSocket and polling transports
- 20-second timeout
- Debug logging in development mode

### Environment Detection

```javascript
// Development
http://localhost:3001

// Production
window.location.origin
```

## Error Handling

The hook handles these error cases:

1. Connection failures - automatic reconnection
2. Disconnections - reconnection with exponential backoff
3. Invalid event data - logged but doesn't crash
4. Network issues - graceful degradation

## Performance Considerations

- Only one socket connection per app instance
- Efficient cache updates (optimistic + invalidation)
- Cleanup on unmount prevents memory leaks
- Room-based subscriptions reduce unnecessary updates

## Testing

See `/frontend/src/hooks/useTicketUpdates.example.jsx` for test examples.

### Manual Testing

1. Start the backend server: `cd api-server && npm start`
2. Start the frontend: `cd frontend && npm run dev`
3. Open browser console to see WebSocket logs
4. Create a post - watch for ticket status updates

### Backend Test Client

The backend includes a test client at `/api-server/tests/manual/test-websocket-client.js`:

```bash
cd api-server
node tests/manual/test-websocket-client.js
```

## Troubleshooting

### Socket not connecting

1. Check backend is running on port 3001
2. Check CORS configuration in backend
3. Check browser console for errors
4. Verify Socket.IO version compatibility (both should be ^4.8.1)

### Updates not appearing in UI

1. Verify React Query is configured
2. Check query keys match (['posts'])
3. Ensure component is wrapped in QueryClientProvider
4. Check browser console for update logs

### TypeScript errors

The hook is written in JavaScript but can be used in TypeScript projects. For type safety, create a `.d.ts` file:

```typescript
declare module './hooks/useTicketUpdates' {
  export interface TicketUpdate {
    post_id: string;
    ticket_id: string;
    status: 'pending' | 'processing' | 'completed' | 'failed';
    agent_id: string;
    timestamp: string;
    error?: string;
  }

  export function useTicketUpdates(options?: {
    enabled?: boolean;
    showNotifications?: boolean;
    toast?: {
      success: (msg: string) => void;
      error: (msg: string) => void;
      info: (msg: string) => void;
    };
    onUpdate?: (data: TicketUpdate) => void;
  }): {
    socket: any;
    isConnected: boolean;
  };
}
```

## Implementation Notes

- NO EMOJIS used in code or logs (as per requirements)
- Compatible with React 18
- Works with both array and paginated React Query data
- Socket connection shared across all hook instances
- Proper cleanup prevents memory leaks
- Development logging for debugging

## Related Files

- Backend WebSocket service: `/api-server/services/websocket-service.js`
- Backend documentation: `/api-server/docs/WEBSOCKET-INTEGRATION.md`
- Backend tests: `/api-server/tests/integration/websocket-events.test.js`

## Support

For issues or questions:
1. Check browser console for WebSocket logs
2. Check backend logs for connection events
3. Review examples in `useTicketUpdates.example.jsx`
4. Check backend integration tests for expected behavior
