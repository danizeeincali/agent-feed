# Mixed API Versioning Architecture Guide

## Overview

This system uses a **mixed API versioning approach** to balance functionality and migration requirements. This document explains the architecture, endpoints, error handling, and future migration path.

## Current API Structure

### Instance Operations (CRUD) - `/api/claude/`

These endpoints handle Claude instance lifecycle management:

- **List instances**: `GET /api/claude/instances`
- **Create instance**: `POST /api/claude/instances`
- **Get instance details**: `GET /api/claude/instances/:id`
- **Terminate instance**: `DELETE /api/claude/instances/:id`
- **Instance health**: `GET /api/claude/instances/:id/health`
- **Send message**: `POST /api/claude/instances/:id/message`

### SSE Streaming (Real-time) - `/api/v1/`

These endpoints handle real-time communication:

- **Terminal stream**: `/api/v1/claude/instances/:id/terminal/stream`
- **SSE connection status**: `/api/v1/claude/instances/:id/sse/status`
- **Close SSE connections**: `DELETE /api/v1/claude/instances/:id/sse/connections`
- **SSE statistics**: `/api/v1/sse/statistics`

## Architecture Rationale

### Why Mixed Versioning?

1. **Legacy Compatibility**: Existing SSE infrastructure works reliably at `/api/v1/`
2. **Simple Integration**: New instance management integrates easily at `/api/claude/`
3. **Gradual Migration**: Allows testing new endpoints without breaking existing functionality
4. **Separation of Concerns**: CRUD operations separate from real-time streaming

### Benefits

- **Risk Mitigation**: Changes to one API version don't affect the other
- **Independent Scaling**: Different performance characteristics for CRUD vs streaming
- **Easier Testing**: Can test each API version independently
- **Rollback Safety**: Can revert to previous implementation if needed

## Frontend Implementation

### ClaudeInstanceManagerModern Component

```typescript
// Instance operations use /api/claude/
const fetchInstances = async () => {
  const response = await fetch(`${apiUrl}/api/claude/instances`);
  // ...
};

// SSE connections continue using /api/v1/
useSSEConnectionSingleton(apiUrl); // Uses /api/v1/ internally
```

### Error Handling Strategy

The system includes comprehensive error handling for mixed API scenarios:

```typescript
import { APIVersioningErrorHandler, claudeInstanceAPI } from '@/utils/api-versioning-handler';

// Automatic error recovery and fallback
try {
  const instances = await claudeInstanceAPI.fetchInstances();
} catch (error) {
  const versioningError = APIVersioningErrorHandler.classifyError(error, endpoint);
  console.error(APIVersioningErrorHandler.getErrorMessage(versioningError));
}
```

## Error Recovery Mechanisms

### 1. Automatic Endpoint Fallback

If an endpoint fails at one version, the system attempts fallback URLs:

```typescript
const fallbackUrls = [
  '/api/claude/instances',           // Primary
  '/api/v1/claude/instances',        // Fallback 1  
  '/api/v2/claude/instances'         // Future fallback
];
```

### 2. Exponential Backoff Retry

Network issues are handled with intelligent retry logic:

```typescript
await APIRecoveryStrategies.retryWithBackoff(operation, maxRetries: 3, baseDelayMs: 1000);
```

### 3. Error Classification

Errors are classified for appropriate user messaging:

- `ENDPOINT_NOT_FOUND`: Version mismatch or missing route
- `NETWORK_ERROR`: Connection issues
- `TIMEOUT_ERROR`: Server overload
- `PARSING_ERROR`: Invalid response format
- `VERSION_MISMATCH`: General API compatibility issue

## Backend Configuration

### Server Route Mounting

The Express server mounts routes at both paths:

```typescript
// src/api/server.ts
app.use('/api/claude', simpleLauncherRoutes);
app.use('/api/claude/instances', claudeInstancesRoutes);
app.use('/api/v1/claude/instances', claudeInstancesRoutes); // Fallback

// SSE endpoints
app.get('/api/v1/claude/instances/:instanceId/terminal/stream', ...);
```

### CORS Configuration

Both API versions are configured for CORS:

```typescript
const allowedOrigins = [
  'http://localhost:3000',
  'http://localhost:3001', 
  'http://localhost:5173'
];
```

## Development Workflow

### When Working on Instance Operations

1. Use `/api/claude/` endpoints for CRUD operations
2. Test error scenarios with fallback recovery
3. Verify instance creation/termination works correctly
4. Check that instance listing displays proper data

### When Working on SSE Streaming

1. Use `/api/v1/` endpoints for real-time features  
2. Test connection establishment and cleanup
3. Verify terminal output streaming works
4. Check SSE connection health monitoring

### Testing Mixed API Scenarios

```bash
# Test instance listing (should use /api/claude/)
curl http://localhost:3000/api/claude/instances

# Test SSE stream (should use /api/v1/)  
curl -N -H "Accept: text/event-stream" \
  http://localhost:3000/api/v1/claude/instances/claude-123/terminal/stream
```

## Future Migration Path

### Phase 1: Current State (Mixed Versioning)
- Instance operations: `/api/claude/`
- SSE streaming: `/api/v1/`
- Full error recovery and fallback support

### Phase 2: Unification (Target)
- All endpoints: `/api/v2/`
- Consistent response formats
- Unified authentication and CORS
- Backward compatibility maintained

### Phase 3: Cleanup
- Deprecate mixed versioning
- Remove fallback mechanisms
- Single API version for all operations

## Troubleshooting

### Common Issues

#### "Failed to fetch instances"
- **Check**: Is simple-claude-launcher mounted at `/api/claude/`?
- **Solution**: Verify server route mounting in `src/api/server.ts`

#### "SSE connection failed"  
- **Check**: Are `/api/v1/` SSE endpoints available?
- **Solution**: Verify SSE routes in server configuration

#### CORS errors
- **Check**: Are both `/api/claude/` and `/api/v1/` configured for CORS?
- **Solution**: Update CORS configuration to include both patterns

#### Version mismatch errors
- **Check**: Is automatic fallback working?
- **Solution**: Use `APIRecoveryStrategies.attemptEndpointRecovery()`

### Debug Commands

```typescript
// Check API configuration
import { claudeInstanceAPI } from '@/utils/api-versioning-handler';
console.log(claudeInstanceAPI.getConfiguration());

// Test endpoint availability  
await APIRecoveryStrategies.attemptEndpointRecovery('/api/claude/instances');
```

## Best Practices

### For Frontend Development
1. Use the `ClaudeInstanceAPIClient` for all instance operations
2. Always handle `APIVersioningError` types appropriately
3. Provide user-friendly error messages for version mismatches
4. Test both API versions in development

### For Backend Development  
1. Mount routes at both paths during transition period
2. Ensure consistent response formats across versions
3. Implement proper error handling and status codes
4. Document any version-specific behavior

### For Testing
1. Test endpoint fallback scenarios
2. Verify error recovery mechanisms work
3. Check that SSE and CRUD operations don't interfere
4. Validate CORS for both API versions

## Monitoring and Metrics

### Instance API Metrics
- Request count per endpoint version
- Response times for `/api/claude/` vs `/api/v1/`
- Error rates and recovery success rates

### SSE Connection Metrics
- Active connection count per API version
- Connection duration and stability
- Error rates and reconnection attempts

This mixed API versioning approach provides a robust, maintainable solution that balances immediate functionality needs with long-term architectural goals.