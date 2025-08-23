# Production Claude WebSocket Client Implementation

## Overview

This implementation provides a secure WebSocket client that connects the production Claude instance to the WebSocket hub, enabling communication between the frontend and the production Claude instance while maintaining strict security boundaries.

## Architecture

### Core Components

1. **ProdClaudeClient** (`/src/websockets/prod-claude-client.ts`)
   - Main WebSocket client for production Claude instance
   - Handles connection management, security validation, and message processing
   - Integrates with dev mode configuration and security boundaries

2. **ProdClaudeService** (`/src/services/prod-claude-service.ts`)
   - Service wrapper for managing the client lifecycle
   - Provides event handling and status monitoring

3. **HubServer** (`/src/websockets/hub-server.ts`)
   - Central WebSocket hub for routing messages between instances
   - Handles instance registration and message forwarding

4. **API Routes** (`/src/api/routes/prod-claude.ts`)
   - REST API endpoints for managing the production Claude service
   - Status monitoring and message sending capabilities

5. **Startup Script** (`/src/scripts/start-prod-claude.ts`)
   - Standalone script for running the production Claude instance
   - Supports running with or without the hub server

## Security Features

### Boundary Enforcement
- **Path Validation**: Only allows operations within `/workspaces/agent-feed/agent_workspace/`
- **Restricted Areas**: Blocks access to `/src/`, `/frontend/`, and `/.claude/dev/`
- **Operation Limits**: Restricts allowed operations based on configuration
- **Command Whitelist**: Only permits pre-approved commands

### Dev Mode Integration
- **Config-based Control**: Reads dev mode settings from `/prod/config/mode.json`
- **Environment Override**: Supports `DEV_MODE=true` environment variable
- **Chat Restrictions**: Only enables chat when both dev mode and chat settings are enabled
- **Enhanced Logging**: Provides detailed logging when dev mode is active

### Sandbox Mode
- **Strict Validation**: All operations validated against security boundaries
- **Resource Limits**: Enforces memory, CPU, and storage limits per configuration
- **Audit Logging**: Comprehensive logging of all operations and security events

## Configuration Files

### Production Configuration (`/.claude/prod/config.json`)
```json
{
  "instance": {
    "type": "production",
    "name": "claude-prod",
    "version": "1.0.0"
  },
  "workspace": {
    "root": "/workspaces/agent-feed/agent_workspace/",
    "restricted_paths": [
      "/workspaces/agent-feed/src/",
      "/workspaces/agent-feed/frontend/",
      "/workspaces/agent-feed/.claude/dev/"
    ],
    "allowed_operations": ["read", "write", "execute"]
  },
  "permissions": {
    "sandbox_mode": true,
    "allowed_commands": ["node", "python", "curl", "wget", "sqlite3"]
  }
}
```

### Dev Mode Configuration (`/prod/config/mode.json`)
```json
{
  "mode": "PRODUCTION",
  "devMode": false,
  "devModeSettings": {
    "enableChat": false,
    "enhancedLogging": false,
    "debugInfo": false,
    "testExecution": false
  }
}
```

## API Endpoints

### Service Management
- `GET /api/v1/prod-claude/status` - Get service and client status
- `POST /api/v1/prod-claude/start` - Start the production Claude service
- `POST /api/v1/prod-claude/stop` - Stop the production Claude service
- `GET /api/v1/prod-claude/health` - Health check endpoint

### Message Handling
- `POST /api/v1/prod-claude/message` - Send message to production Claude instance
- `GET /api/v1/prod-claude/hub/status` - Get hub server status
- `GET /api/v1/prod-claude/hub/instances/:type` - Get instances by type
- `POST /api/v1/prod-claude/hub/send/:instanceId` - Send direct message to instance

## Message Types

### Command Messages
```typescript
{
  type: "command",
  payload: {
    operation: "execute" | "read_file" | "write_file" | "list_directory",
    // operation-specific payload
  }
}
```

### Chat Messages
```typescript
{
  type: "chat",
  payload: {
    content: string,
    context?: any
  }
}
```

### System Messages
```typescript
{
  type: "system",
  payload: {
    operation: "health_check" | "get_capabilities" | "reload_config"
  }
}
```

## Connection Flow

1. **Client Initialization**
   - Load production and dev mode configurations
   - Parse security boundaries from system instructions
   - Connect to WebSocket hub on port 3001

2. **Registration**
   - Register as 'prod-claude' instance with capabilities
   - Provide dev mode status and allowed operations
   - Receive confirmation and connected instances list

3. **Message Processing**
   - Validate incoming messages against security boundaries
   - Check dev mode permissions for chat messages
   - Execute operations within allowed scope
   - Send responses back through hub

4. **Health Monitoring**
   - Heartbeat mechanism with 30-second intervals
   - Auto-reconnection with exponential backoff
   - Connection status monitoring and logging

## Usage Examples

### Starting the Service
```bash
# Start with existing server
npm run start

# Start standalone with hub
node dist/scripts/start-prod-claude.js --with-hub

# Start with environment variable
PROD_CLAUDE_ENABLED=true npm run start
```

### Sending Messages via API
```javascript
// Send command
fetch('/api/v1/prod-claude/message', {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({
    type: 'command',
    payload: {
      operation: 'read_file',
      path: '/workspaces/agent-feed/agent_workspace/data/example.txt'
    }
  })
});

// Check status
fetch('/api/v1/prod-claude/status')
  .then(res => res.json())
  .then(status => console.log(status));
```

### WebSocket Integration
```javascript
// Frontend can connect to hub and receive responses
const ws = new WebSocket('ws://localhost:3001');
ws.onmessage = (event) => {
  const message = JSON.parse(event.data);
  if (message.type === 'response') {
    // Handle response from production Claude
  }
};
```

## Security Considerations

1. **Never** bypasses security boundaries
2. **Always** validates paths and operations
3. **Strictly** enforces dev mode restrictions
4. **Comprehensive** audit logging for all operations
5. **Graceful** handling of forbidden requests
6. **Automatic** disconnection on security violations

## Integration Points

- **Existing WebSocket Infrastructure**: Connects to established WebSocket system on port 3001
- **Logger Integration**: Uses existing logger with appropriate security event logging
- **Config Management**: Integrates with existing configuration system
- **Server Integration**: Optional integration with main server via environment variable

## Monitoring and Troubleshooting

### Status Monitoring
```bash
# Check service status
curl http://localhost:3000/api/v1/prod-claude/status

# Check health
curl http://localhost:3000/api/v1/prod-claude/health

# Check hub status
curl http://localhost:3000/api/v1/prod-claude/hub/status
```

### Log Analysis
- Service logs: Standard application logs
- Audit logs: Security and operation logs at `.claude/prod/logs/audit.log`
- Connection logs: WebSocket connection and disconnection events

## Error Handling

- **Connection Failures**: Automatic reconnection with exponential backoff
- **Security Violations**: Immediate rejection with detailed logging
- **Invalid Messages**: Error responses with specific validation failures
- **Service Errors**: Graceful error handling with status reporting

This implementation provides a robust, secure bridge between the WebSocket hub and production Claude instance while maintaining strict security boundaries and comprehensive monitoring capabilities.