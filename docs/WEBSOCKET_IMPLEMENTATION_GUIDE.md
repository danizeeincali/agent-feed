# WebSocket Implementation Guide
## SPARC Architecture - Fixing Claude Code ↔ Frontend Communication

### Implementation Summary

This guide provides step-by-step instructions to implement the robust WebSocket communication architecture designed to fix the connection establishment issues between Claude Code and the frontend.

## Files Created

### 1. Core Architecture Components

**`/src/utils/websocket-instance-normalizer.ts`**
- Normalizes instance IDs between frontend and backend
- Parses instance metadata (PID, process type, etc.)  
- Provides consistent ID mapping functions
- Fixes the core ID mismatch issue

**`/src/utils/websocket-connection-registry.ts`**
- Manages WebSocket connections per Claude instance
- Provides robust connection tracking and cleanup
- Implements health monitoring and metrics
- Handles connection registration/unregistration

**`/frontend/src/hooks/useWebSocketSingletonEnhanced.ts`**
- Enhanced WebSocket singleton hook with proper state management
- Implements reconnection logic with exponential backoff
- Provides connection health monitoring
- Integrates instance ID normalization

**`/src/backend-patches/websocket-connection-fix.js`**
- Backend patch to integrate new architecture
- Enhanced message handlers with proper ID normalization
- Improved broadcast mechanisms using connection registry
- Debugging and monitoring endpoints

### 2. Architecture Documentation

**`/docs/WEBSOCKET_ARCHITECTURE_DESIGN.md`**
- Comprehensive architecture design document
- Connection flow diagrams
- Message routing specifications  
- Error recovery strategies
- Scalability considerations

## Quick Implementation Steps

### Step 1: Compile TypeScript Utilities for Backend
```bash
# Compile TypeScript utilities for Node.js use
npx tsc src/utils/websocket-instance-normalizer.ts --target ES2020 --module CommonJS --outDir dist/
npx tsc src/utils/websocket-connection-registry.ts --target ES2020 --module CommonJS --outDir dist/
```

### Step 2: Apply Backend Patch
Add to `simple-backend.js`:
```javascript
// Import the patch
const { patchWebSocketHandlers, createConnectionStatusEndpoint } = require('./src/backend-patches/websocket-connection-fix');

// Apply the patch to existing WebSocket server
const enhancements = patchWebSocketHandlers(wss, activeProcesses, instanceOutputBuffers);

// Add debugging endpoint
app.get('/api/debug/websocket-connections', createConnectionStatusEndpoint());

// Replace existing broadcast functions
const broadcastToWebSockets = enhancements.enhancedBroadcast;
const broadcastIncrementalOutput = enhancements.enhancedIncrementalBroadcast;
```

### Step 3: Update Frontend Component
Replace in `ClaudeInstanceManagerModern.tsx`:
```typescript
import { useWebSocketSingletonEnhanced } from '../hooks/useWebSocketSingletonEnhanced';

// Replace existing hook usage
const webSocketSingleton = useWebSocketSingletonEnhanced(apiUrl);
```

### Step 4: Test Connection
1. Start the backend: `node simple-backend.js`
2. Start the frontend: `npm run dev`  
3. Create a Claude instance
4. Verify connection in browser network tab
5. Check debug endpoint: `http://localhost:3000/api/debug/websocket-connections`

## Connection Flow Verification

### Expected Log Sequence

**Backend:**
```
🚀 SPARC Enhanced: Patching WebSocket handlers
✅ SPARC Enhanced: WebSocket handlers patched
🔗 SPARC Enhanced: New WebSocket connection established
📨 SPARC Enhanced: WebSocket message received: connect
✅ SPARC Enhanced: Registering WebSocket for instance claude-6038
✅ SPARC Enhanced: WebSocket registered for claude-6038 (1 total connections)
📤 SPARC Enhanced: Broadcast to 1 connections for claude-6038
```

**Frontend:**
```
🚀 SPARC Enhanced: Creating WebSocket connection for claude-6038
✅ SPARC Enhanced: WebSocket connected to claude-6038
📨 SPARC Enhanced: Message received: connect claude-60
✅ SPARC Enhanced: Added handler for terminal:output
📺 SPARC Enhanced: Processing output for claude-60: [output content]
```

## Troubleshooting

### Issue: Connection Still Failing

**Check 1: Instance ID Normalization**
```javascript
// In browser console
const normalizeInstanceId = (id) => id.includes('(') ? id.split(' (')[0].trim() : id.trim();
console.log('Frontend ID:', instanceId);
console.log('Normalized:', normalizeInstanceId(instanceId));
```

**Check 2: WebSocket Message Flow**
```javascript
// Add to frontend debugging
webSocketSingleton.addHandler('connect', (data) => {
  console.log('🔗 Connection confirmed:', data);
});

webSocketSingleton.addHandler('error', (data) => {  
  console.error('❌ WebSocket error:', data);
});
```

**Check 3: Backend Process Validation**
```javascript
// Add to backend debugging
console.log('🔍 Active processes:', Array.from(activeProcesses.keys()));
console.log('📊 Connection registry stats:', connectionRegistry.getStats());
```

### Issue: Messages Not Received

**Verify Message Broadcasting:**
```javascript
// In backend, add before broadcasting
console.log(`📤 Broadcasting to instance ${instanceId}`);
console.log(`📊 Connections available: ${connectionRegistry.getConnectionCount(instanceId)}`);
```

**Verify Frontend Handler Registration:**
```javascript
// In frontend component
useEffect(() => {
  const handler = (data) => {
    console.log('📺 Output received:', data.output.slice(0, 100));
  };
  
  webSocketSingleton.addHandler('terminal:output', handler);
  
  return () => {
    webSocketSingleton.removeHandler('terminal:output', handler);
  };
}, []);
```

## Performance Monitoring

### Connection Health Dashboard
Access: `http://localhost:3000/api/debug/websocket-connections`

**Expected Response:**
```json
{
  "success": true,
  "timestamp": "2025-01-15T...",
  "registry": {
    "totalConnections": 1,
    "healthyConnections": 1,
    "degradedConnections": 0,
    "unhealthyConnections": 0,
    "connectionsPerInstance": {
      "claude-6038": 1
    }
  },
  "architecture": "SPARC Enhanced WebSocket Communication"
}
```

### Frontend Health Monitoring
```typescript
const { connectionHealth, connectionState, lastError } = webSocketSingleton;

console.log('Connection State:', connectionState);
console.log('Health:', connectionHealth);
console.log('Last Error:', lastError);
```

## Advanced Configuration

### Customizing Reconnection Behavior
```typescript
// In useWebSocketSingletonEnhanced.ts
const maxAttempts = 20; // Increase max attempts
const baseDelay = 500;  // Faster initial retry  
const maxDelay = 60000; // Max 1 minute between attempts
```

### Adjusting Health Check Intervals
```typescript
// In WebSocketConnectionRegistry.ts
private readonly HEALTH_CHECK_INTERVAL = 15000; // 15 seconds
private readonly PING_TIMEOUT = 5000; // 5 seconds
```

### Enabling Detailed Logging
```javascript
// In backend patch
const connectionRegistry = new WebSocketConnectionRegistry(true); // Enable health checks
```

## Production Deployment

### Load Balancer Configuration
```nginx
upstream websocket_backend {
    server localhost:3000;
    server localhost:3001; 
    server localhost:3002;
}

server {
    location /terminal {
        proxy_pass http://websocket_backend;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection "upgrade";
        proxy_set_header Host $host;
        proxy_read_timeout 86400;
    }
}
```

### Docker Deployment
```dockerfile
FROM node:18-alpine
COPY src/ /app/src/
COPY simple-backend.js /app/
WORKDIR /app
RUN npm install && npx tsc src/utils/*.ts --outDir dist/
CMD ["node", "simple-backend.js"]
```

### Monitoring & Alerts
```javascript
// Add to backend
setInterval(() => {
  const stats = connectionRegistry.getStats();
  if (stats.unhealthyConnections > stats.totalConnections * 0.1) {
    console.warn('🚨 High unhealthy connection rate:', stats);
    // Send alert to monitoring system
  }
}, 60000); // Every minute
```

## Security Considerations

### Rate Limiting
```javascript
const connectionAttempts = new Map();

// Add to WebSocket connection handler
const clientIP = req.socket.remoteAddress;
const attempts = connectionAttempts.get(clientIP) || 0;

if (attempts > 10) {
  ws.close(1008, 'Rate limit exceeded');
  return;
}

connectionAttempts.set(clientIP, attempts + 1);
```

### Message Validation  
```javascript
// Add to message handlers
function validateMessage(message) {
  if (!message.type || typeof message.type !== 'string') {
    throw new Error('Invalid message type');
  }
  
  if (message.type === 'input' && (!message.data || message.data.length > 10000)) {
    throw new Error('Invalid input data');
  }
  
  return true;
}
```

## Success Metrics

### Connection Establishment Success Rate
- Target: >99% successful connections within 5 seconds
- Measure: `successfulConnections / totalConnectionAttempts`

### Message Delivery Latency  
- Target: <100ms average message delivery time
- Measure: Time from backend broadcast to frontend receipt

### Reconnection Recovery Time
- Target: <10 seconds for automatic reconnection
- Measure: Time from disconnect to successful reconnect

### Connection Stability
- Target: <1% unexpected disconnections per hour
- Measure: `unexpectedDisconnects / totalConnectionHours`

This implementation guide provides all necessary components and instructions to deploy the robust WebSocket architecture that fixes the connection establishment issues while providing a foundation for future scaling and enhancements.