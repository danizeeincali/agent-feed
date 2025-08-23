# WebSocket Hub Implementation Guide

## Overview

The WebSocket Hub is a production-ready solution that solves the webhook/WebSocket protocol mismatch by providing intelligent protocol translation and real-time bidirectional communication between frontend clients and production Claude instances.

## Architecture

### Core Components

1. **WebSocketHub** - Main hub class managing all client connections
2. **MessageRouter** - Intelligent routing with load balancing strategies
3. **SecurityManager** - Channel isolation and access control
4. **ClientRegistry** - Instance registration and service discovery
5. **ProtocolTranslator** - WebSocket ↔ Webhook conversion

### Integration Features

- ✅ **Hybrid Routing** - Smart routing between hub and original Socket.IO
- ✅ **NLD Integration** - Neural Learning Development pattern analysis
- ✅ **Security Boundaries** - Channel isolation by instance type
- ✅ **Protocol Translation** - Seamless webhook/WebSocket conversion
- ✅ **Load Balancing** - Round-robin, weighted, and session-affinity routing
- ✅ **Real-time Metrics** - Connection health and performance monitoring

## Quick Start

### Environment Configuration

Add these environment variables to enable the WebSocket Hub:

```bash
# Enable WebSocket Hub
WEBSOCKET_HUB_ENABLED=true
WEBSOCKET_HUB_PORT=3001

# Enable Neural Learning Development (optional)
NLD_ENABLED=true

# WebSocket Configuration
WEBSOCKET_ENABLED=true
```

### Basic Usage

The WebSocket Hub automatically integrates with the existing server when enabled:

```typescript
// The hub is automatically initialized in server.ts
// No additional code needed for basic functionality

// Access hub status via API
GET /api/v1/websocket-hub/status

// Register Claude instances
POST /api/v1/websocket-hub/register-claude
{
  "instanceId": "claude-prod-1",
  "version": "1.0.0",
  "capabilities": ["webhook", "chat"],
  "webhookUrl": "https://api.claude.com/webhook"
}
```

## Client Connection Examples

### Frontend Client (React/TypeScript)

```typescript
import { io } from 'socket.io-client';

const socket = io('ws://localhost:3001', {
  auth: {
    userId: 'user-123',
    instanceType: 'frontend',
    capabilities: ['read', 'write', 'subscribe']
  }
});

// Subscribe to channels
socket.emit('subscribe', { channel: 'user-updates' });

// Send messages with protocol translation
socket.emit('sendMessage', {
  channel: 'claude-requests',
  message: { prompt: 'Hello Claude!' },
  protocol: 'webhook' // Will be translated automatically
});

// Listen for responses
socket.on('message', (data) => {
  console.log('Received:', data);
});
```

### Claude Production Instance

```typescript
import { io } from 'socket.io-client';

const claudeSocket = io('ws://localhost:3001', {
  auth: {
    instanceType: 'claude-production',
    capabilities: ['webhook', 'chat', 'translate']
  }
});

// Register Claude instance
claudeSocket.emit('registerClaudeInstance', {
  instanceId: 'claude-prod-1',
  version: '1.0.0',
  capabilities: ['webhook', 'chat'],
  webhookUrl: 'https://api.claude.com/webhook'
});

// Handle protocol translation requests
claudeSocket.on('translateProtocol', async (data) => {
  const { from, to, payload } = data;
  // Handle translation...
});
```

### Webhook Integration

```typescript
// For external webhooks that need WebSocket translation
const webhookSocket = io('ws://localhost:3001', {
  auth: {
    instanceType: 'webhook',
    capabilities: ['receive', 'translate']
  }
});

// Forward webhook payloads to WebSocket clients
webhookSocket.emit('sendMessage', {
  channel: 'webhook-bridge',
  message: webhookPayload,
  protocol: 'websocket'
});
```

## Security and Channel Isolation

### Instance Types and Permissions

The SecurityManager enforces strict channel isolation:

```typescript
// Channel access rules by instance type
const isolationRules = {
  'frontend': {
    allowed: ['public', 'user', 'feed'],
    restricted: ['claude-internal', 'admin', 'system']
  },
  'claude-production': {
    allowed: ['claude-internal', 'system', 'webhook-bridge'],
    restricted: ['user-private']
  },
  'claude-dev': {
    allowed: ['claude-internal', 'dev', 'test'],
    restricted: ['production', 'user-private']
  },
  'webhook': {
    allowed: ['webhook-bridge', 'public'],
    restricted: ['claude-internal', 'user-private', 'admin']
  }
};
```

### Rate Limiting

Built-in rate limiting protects against abuse:

```typescript
// Default rate limits
const rateLimit = {
  messagesPerSecond: 10,
  burstSize: 20,
  windowSize: 60000 // 1 minute
};
```

## Protocol Translation

### WebSocket to Webhook

```typescript
// WebSocket message format
const wsMessage = {
  type: 'chat_request',
  data: { prompt: 'Hello!' }
};

// Automatically translated to webhook format
const webhookMessage = {
  event: 'chat_request',
  data: { prompt: 'Hello!' },
  timestamp: '2024-01-20T12:00:00Z',
  source: 'websocket',
  metadata: {
    originalFormat: 'websocket',
    translatedAt: '2024-01-20T12:00:00Z'
  }
};
```

### Webhook to WebSocket

```typescript
// Incoming webhook payload
const webhookPayload = {
  response: 'Hello there!',
  status: 'complete'
};

// Translated to WebSocket format
const wsResponse = {
  type: 'webhook_message',
  data: {
    response: 'Hello there!',
    status: 'complete'
  },
  timestamp: '2024-01-20T12:00:00Z'
};
```

## Routing Strategies

### Round Robin (Default)

Distributes messages evenly across available Claude instances:

```typescript
const config = {
  routingStrategy: 'round-robin'
};
```

### Weighted Routing

Routes based on instance capacity:

```typescript
// Register instances with weights
messageRouter.registerTarget('claude-1', ['chat'], 2); // 2x capacity
messageRouter.registerTarget('claude-2', ['chat'], 1); // 1x capacity
```

### Session Affinity

Maintains user session continuity:

```typescript
await messageRouter.routeWithLoadBalancing(
  payload,
  sourceClient,
  ['chat'],
  sessionId // Routes to same instance for this session
);
```

## Monitoring and Metrics

### Hub Metrics

```typescript
// Get real-time metrics
const metrics = hub.getMetrics();
console.log({
  totalConnections: metrics.totalConnections,
  activeChannels: metrics.activeChannels,
  messagesPerSecond: metrics.messagesPerSecond,
  protocolTranslations: metrics.protocolTranslations,
  uptime: metrics.uptime
});
```

### Connection Health

```typescript
// Monitor connection health
const health = hub.getClientHealthSummary();
console.log({
  healthy: health.healthy,
  unhealthy: health.unhealthy,
  averageLatency: health.averageLatency
});
```

### Performance Analytics

```typescript
// Get routing performance
const routingMetrics = messageRouter.getMetrics();
console.log({
  successfulDeliveries: routingMetrics.successfulDeliveries,
  failedDeliveries: routingMetrics.failedDeliveries,
  averageResponseTime: routingMetrics.averageResponseTime
});
```

## NLD Integration

When NLD (Neural Learning Development) is enabled, the hub automatically learns from connection patterns:

```typescript
// NLD events are automatically forwarded
hub.on('nldPatternDetected', (pattern) => {
  console.log('Connection pattern detected:', pattern);
});

hub.on('nldAlert', (alert) => {
  console.log('Performance alert:', alert);
});

// Manual pattern training
await nldIntegration.trainNeuralPatterns();
```

## API Endpoints

### Hub Status

```http
GET /api/v1/websocket-hub/status

Response:
{
  "initialized": true,
  "hubActive": true,
  "metrics": {
    "hubConnections": 15,
    "originalConnections": 8,
    "totalConnections": 23
  },
  "connectedClients": [...],
  "activeChannels": [...]
}
```

### Claude Instance Registration

```http
POST /api/v1/websocket-hub/register-claude
Content-Type: application/json

{
  "instanceId": "claude-prod-1",
  "version": "1.0.0",
  "capabilities": ["webhook", "chat"],
  "webhookUrl": "https://api.claude.com/webhook"
}

Response:
{
  "success": true,
  "message": "Claude instance registered successfully",
  "instanceId": "claude-prod-1"
}
```

## Production Deployment

### Scaling Considerations

1. **Connection Limits**: Default max 2000 connections, configurable
2. **Memory Usage**: ~50MB baseline + ~1KB per connection
3. **CPU Usage**: Minimal overhead, scales with message volume
4. **Network**: Efficient binary protocol, WebSocket compression enabled

### High Availability

```typescript
// Multiple hub instances with load balancer
const hubConfig = {
  maxConnections: 5000,
  enableMetrics: true,
  enableSecurity: true,
  routingStrategy: 'weighted'
};

// Redis adapter for multi-instance coordination (future enhancement)
```

### Security Best Practices

1. **Use HTTPS/WSS** in production
2. **Configure proper CORS** origins
3. **Enable rate limiting** 
4. **Monitor security violations**
5. **Regular security audits**

## Troubleshooting

### Common Issues

1. **Connection Refused**: Check if hub is enabled and port is correct
2. **Authentication Failed**: Verify instanceType and capabilities
3. **Channel Access Denied**: Check security isolation rules
4. **Rate Limit Exceeded**: Reduce message frequency or increase limits

### Debug Mode

```bash
# Enable debug logging
DEBUG=websocket-hub:* npm start

# Check hub status
curl http://localhost:3000/api/v1/websocket-hub/status
```

### Performance Issues

1. Monitor connection metrics
2. Check message routing efficiency
3. Analyze protocol translation overhead
4. Review security rule complexity

## Testing

### Unit Tests

```bash
# Run WebSocket Hub tests
npm test tests/websocket-hub/

# Run with coverage
npm run test:coverage
```

### Integration Tests

```bash
# Test hub integration
npm run test:integration

# Load testing
npm run test:load
```

## Future Enhancements

1. **Redis Adapter** - Multi-instance coordination
2. **GraphQL Subscriptions** - Advanced query support
3. **Message Persistence** - Offline message delivery
4. **Advanced Analytics** - ML-powered insights
5. **Auto-scaling** - Dynamic capacity management

## Support

For issues and questions:
- Check the troubleshooting section
- Review server logs for error details
- Monitor hub metrics via API
- Enable debug logging for detailed traces

The WebSocket Hub provides a robust foundation for real-time communication while solving the fundamental webhook/WebSocket protocol mismatch that enables seamless integration between frontend applications and production Claude instances.