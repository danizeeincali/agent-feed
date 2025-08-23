# ProcessManager WebSocket Integration - Implementation Complete

## Overview

Successfully integrated ProcessManager WebSocket event handlers into the Express.js server to enable real-time process management through WebSocket connections.

## Implementation Details

### 1. Server.ts Modifications

**File**: `/workspaces/agent-feed/src/api/server.ts`

#### Imports Added:
```typescript
import { ProcessManager, processManager } from '@/services/ProcessManager';
```

#### WebSocket Event Handlers Added:

**Inside `io.on('connection')` callback:**

1. **process:launch** - Launches new Claude instance
   - Accepts optional configuration parameters
   - Returns process information on success
   - Emits `process:launched` with process details

2. **process:kill** - Terminates current instance
   - Gracefully shuts down running process
   - Emits `process:killed` confirmation

3. **process:restart** - Restarts current instance
   - Emits `process:restarting` during operation
   - Returns new process information
   - Emits `process:restarted` on completion

4. **process:info** - Gets current process status
   - Returns current process information
   - Includes PID, name, status, start time, auto-restart config

5. **terminal:input** - Sends input to process stdin
   - Validates input as string
   - Forwards input to running process
   - Includes error handling for invalid input

#### Process Event Forwarding:

**Outside the connection handler, ProcessManager events are forwarded to all clients:**

```typescript
processManager.on('terminal:output', (outputData) => {
  io.emit('terminal:output', outputData);
});

processManager.on('launched', (processInfo) => {
  io.emit('process:launched', processInfo);
});

processManager.on('killed', (data) => {
  io.emit('process:killed', data);
});

processManager.on('restarting', () => {
  io.emit('process:restarting');
});

processManager.on('auto-restart-triggered', () => {
  io.emit('process:auto-restart-triggered');
});

processManager.on('error', (error) => {
  io.emit('process:error', { error: error.message });
});
```

### 2. ProcessManager Service Updates

**File**: `/workspaces/agent-feed/src/services/ProcessManager.ts`

#### Interface Enhancement:
```typescript
export interface ProcessConfig {
  autoRestartHours: number;
  workingDirectory: string;
  resumeOnRestart: boolean;
  agentLinkEnabled: boolean;
  environment?: string; // Added for production flag support
}
```

### 3. Route Integration Fix

**File**: `/workspaces/agent-feed/src/api/routes/processManager.ts`

Fixed import path:
```typescript
import { processManager } from '../../services/ProcessManager';
```

## WebSocket Event Specification

### Client → Server Events

#### process:launch
```typescript
socket.emit('process:launch', {
  config?: {
    autoRestartHours?: number;
    workingDirectory?: string;
    resumeOnRestart?: boolean;
    agentLinkEnabled?: boolean;
    environment?: string;
  }
});
```

#### process:kill
```typescript
socket.emit('process:kill');
```

#### process:restart
```typescript
socket.emit('process:restart');
```

#### process:info
```typescript
socket.emit('process:info');
```

#### terminal:input
```typescript
socket.emit('terminal:input', {
  input: string
});
```

### Server → Client Events

#### process:launched
```typescript
{
  pid: number | null;
  name: string;
  status: 'running' | 'stopped' | 'restarting' | 'error';
  startTime: Date | null;
  autoRestartEnabled: boolean;
  autoRestartHours: number;
  timestamp: string;
}
```

#### process:killed
```typescript
{
  pid?: number;
  timestamp: string;
}
```

#### process:restarting
```typescript
{
  timestamp: string;
}
```

#### process:restarted
```typescript
{
  // Same as process:launched
  pid: number | null;
  name: string;
  status: 'running';
  startTime: Date;
  autoRestartEnabled: boolean;
  autoRestartHours: number;
  timestamp: string;
}
```

#### process:info:response
```typescript
{
  pid: number | null;
  name: string;
  status: 'running' | 'stopped' | 'restarting' | 'error';
  startTime: Date | null;
  autoRestartEnabled: boolean;
  autoRestartHours: number;
  timestamp: string;
}
```

#### terminal:output
```typescript
{
  type: 'stdout' | 'stderr';
  data: string;
  timestamp: Date;
}
```

#### process:error
```typescript
{
  action?: 'launch' | 'kill' | 'restart' | 'info';
  error: string;
  timestamp: string;
}
```

#### terminal:error
```typescript
{
  error: string;
  timestamp: string;
}
```

## Security Features

1. **Rate Limiting**: All events are subject to WebSocket rate limiting
2. **Authentication**: User ID required for all operations
3. **Input Validation**: Terminal input validated as string type
4. **Error Handling**: Comprehensive error catching and reporting
5. **Logging**: All operations logged with user context

## Testing

Created test file: `/workspaces/agent-feed/tests/websocket-processmanager-test.js`

The test includes:
- WebSocket connection validation
- Process info requests
- Terminal input handling
- Invalid input error handling  
- Event listener verification
- Process launch testing (may fail if Claude not available)

## Usage Example

```javascript
const socket = io('http://localhost:3000', {
  auth: {
    userId: 'user-123',
    username: 'Process Manager User'
  }
});

// Get process info
socket.emit('process:info');
socket.on('process:info:response', (data) => {
  console.log('Process info:', data);
});

// Launch process
socket.emit('process:launch', {
  config: {
    autoRestartHours: 6,
    workingDirectory: '/workspaces/agent-feed/prod'
  }
});

// Listen for terminal output
socket.on('terminal:output', (data) => {
  console.log(`[${data.type}] ${data.data}`);
});

// Send terminal input
socket.emit('terminal:input', {
  input: 'help\n'
});

// Kill process
socket.emit('process:kill');
```

## Integration Benefits

1. **Real-time Process Management**: Start, stop, restart Claude instances via WebSocket
2. **Live Terminal Access**: Interactive terminal I/O through WebSocket
3. **Process Monitoring**: Real-time status updates and process information
4. **Auto-restart Management**: Configure and monitor automatic restarts
5. **Error Recovery**: Comprehensive error handling and reporting
6. **Multi-client Support**: Process events broadcast to all connected clients

## Files Modified

1. `/workspaces/agent-feed/src/api/server.ts` - Added WebSocket handlers and event forwarding
2. `/workspaces/agent-feed/src/services/ProcessManager.ts` - Added environment config option
3. `/workspaces/agent-feed/src/api/routes/processManager.ts` - Fixed import path

## Files Created

1. `/workspaces/agent-feed/tests/websocket-processmanager-test.js` - Comprehensive WebSocket integration test

## Status: ✅ COMPLETE

The ProcessManager WebSocket integration is fully implemented and ready for use. The server can now handle real-time process management operations through WebSocket connections with proper authentication, rate limiting, error handling, and event broadcasting.