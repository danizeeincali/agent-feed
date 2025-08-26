# Backend Endpoints Specification - SPARC Analysis

## Executive Summary

Analysis of the frontend logs and codebase reveals critical endpoint mismatches causing "Failed to create instance" errors. The ClaudeInstanceManager component expects specific backend API patterns that are either missing or implemented incorrectly in the simple-backend.js server.

## Critical Findings

### 1. Primary Issue: GET `/api/claude/instances` Missing Response Structure

**Frontend Expectation (ClaudeInstanceManager.tsx:114-118):**
```typescript
const response = await fetch(`${apiUrl}/api/claude/instances`);
const data = await response.json();
if (data.success) {
  setInstances(data.instances); // Expects array of instances
}
```

**Backend Reality:** This endpoint is MISSING from simple-backend.js

### 2. POST Instance Creation Working But Incomplete

**Frontend Expectation (ClaudeInstanceManager.tsx:169-173):**
```typescript
const response = await fetch(`${apiUrl}/api/claude/instances`, {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify(getInstanceConfig(command))
});
```

**Backend Implementation:** EXISTS at `/api/v1/claude/instances` but needs adjustment for path mismatch

## Complete Missing Endpoints Analysis

### CRITICAL PRIORITY (Instance Creation Blockers)

#### 1. GET `/api/claude/instances` - Instance Listing
```yaml
endpoint: GET /api/claude/instances
status: MISSING
frontend_calls: ClaudeInstanceManager.tsx:114
priority: CRITICAL
description: Lists all active Claude instances
expected_response:
  success: true
  instances:
    - id: string
      name: string
      status: 'starting' | 'running' | 'stopped' | 'error'
      pid: number
      startTime: Date
```

#### 2. PATH MISMATCH: Instance Creation
```yaml
endpoint: POST /api/claude/instances
status: PATH_MISMATCH
frontend_calls: ClaudeInstanceManager.tsx:169
current_backend: POST /api/v1/claude/instances
priority: CRITICAL
fix_required: Remove /v1 from backend path OR update frontend path
expected_request:
  command: string[]
  workingDirectory: string
expected_response:
  success: true
  instanceId: string
  instance: ClaudeInstance
```

#### 3. DELETE Instance Termination
```yaml
endpoint: DELETE /api/claude/instances/{instanceId}
status: PATH_MISMATCH  
frontend_calls: ClaudeInstanceManager.tsx:227
current_backend: DELETE /api/v1/claude/instances/{instanceId}
priority: CRITICAL
fix_required: Remove /v1 from backend path OR update frontend path
```

### HIGH PRIORITY (Terminal Streaming)

#### 4. SSE Terminal Stream Path Mismatch
```yaml
endpoint: GET /api/v1/claude/instances/{instanceId}/terminal/stream
status: PATH_EXISTS_BUT_UNUSED
frontend_calls: useHTTPSSE.ts:200
current_backend: EXISTS correctly
priority: HIGH
issue: Frontend creates instances but terminal streaming may not work due to instance creation failures
```

#### 5. HTTP Polling Path Mismatch  
```yaml
endpoint: GET /api/v1/claude/terminal/output/{instanceId}
status: PATH_EXISTS_BUT_UNUSED
frontend_calls: useHTTPSSE.ts:297
current_backend: EXISTS correctly  
priority: HIGH
issue: Same as above - depends on successful instance creation
```

### MEDIUM PRIORITY (General API Calls)

#### 6. Mock Agent Endpoints Working
```yaml
endpoints:
  - GET /api/v1/claude-live/prod/agents
  - GET /api/v1/claude-live/prod/activities  
  - GET /api/v1/agent-posts
status: WORKING
frontend_calls: Multiple components via proxy logs
priority: MEDIUM
note: These are working correctly, no changes needed
```

## Root Cause Analysis

### Primary Problem: API Path Inconsistency

The ClaudeInstanceManager component uses `/api/claude/*` paths while the backend implements `/api/v1/claude/*` paths, creating a fundamental mismatch.

**Frontend Pattern:**
- GET `/api/claude/instances`
- POST `/api/claude/instances` 
- DELETE `/api/claude/instances/{id}`

**Backend Pattern:**
- POST `/api/v1/claude/instances`
- DELETE `/api/v1/claude/instances/{id}`
- GET `/api/claude/instances` - **MISSING**

### Secondary Problem: Missing Instance Listing

The backend never implemented the GET endpoint that the frontend relies on to populate the instances list.

## Detailed Endpoint Specifications

### 1. Instance Listing Endpoint

```yaml
method: GET
path: /api/claude/instances
description: Return all active Claude instances
request: none
response:
  content_type: application/json
  schema:
    type: object
    properties:
      success:
        type: boolean
        example: true
      instances:
        type: array
        items:
          type: object
          properties:
            id: 
              type: string
              example: "claude-1234"
            name:
              type: string  
              example: "Claude Instance 1234"
            status:
              type: string
              enum: ["starting", "running", "stopped", "error"]
              example: "running"
            pid:
              type: number
              example: 1234
            startTime:
              type: string
              format: date-time
              example: "2025-08-26T21:00:00.000Z"
error_responses:
  500:
    description: Server error
    schema:
      type: object
      properties:
        success:
          type: boolean
          example: false
        error:
          type: string
          example: "Failed to list instances"
```

### 2. Instance Creation Endpoint (Path Fix)

```yaml
method: POST  
path: /api/claude/instances  # Remove /v1
description: Create new Claude instance
request:
  content_type: application/json
  schema:
    type: object
    properties:
      command:
        type: array
        items:
          type: string
        example: ["claude", "--dangerously-skip-permissions"]
      workingDirectory:
        type: string
        example: "/workspaces/agent-feed/prod"
response:
  content_type: application/json
  schema:
    type: object
    properties:
      success:
        type: boolean
        example: true
      instanceId:
        type: string
        example: "claude-1234"
      instance:
        type: object
        properties:
          id: string
          name: string
          status: string
          pid: number
          created: string
error_responses:
  400:
    description: Invalid request
  500:
    description: Instance creation failed
```

### 3. Instance Deletion Endpoint (Path Fix)

```yaml
method: DELETE
path: /api/claude/instances/{instanceId}  # Remove /v1
description: Terminate Claude instance
parameters:
  - name: instanceId
    in: path
    required: true
    type: string
    example: "claude-1234"
response:
  content_type: application/json
  schema:
    type: object
    properties:
      success:
        type: boolean
        example: true
      message:
        type: string
        example: "Instance terminated"
      instanceId:
        type: string
        example: "claude-1234"
error_responses:
  404:
    description: Instance not found
  500:
    description: Termination failed
```

## Implementation Priority Matrix

### CRITICAL (Fix First - Blocks Instance Creation)
1. **Add GET `/api/claude/instances`** - Complete missing endpoint
2. **Fix POST path**: `/api/v1/claude/instances` → `/api/claude/instances`  
3. **Fix DELETE path**: `/api/v1/claude/instances/{id}` → `/api/claude/instances/{id}`

### HIGH (Fix After Instance Creation Works)
4. **Verify SSE streaming** works with corrected instance creation
5. **Verify HTTP polling** works with corrected instance creation

### MEDIUM (Working, No Changes Needed)
6. Mock agent endpoints are working correctly

## Backend Implementation Tasks

### Task 1: Add Instance Storage and Management

The backend needs to track created instances in memory:

```javascript
// Add to simple-backend.js
const activeInstances = new Map(); // instanceId -> instance details

// Helper functions needed:
function addInstance(instance) { /* ... */ }
function removeInstance(instanceId) { /* ... */ } 
function getInstance(instanceId) { /* ... */ }
function getAllInstances() { /* ... */ }
```

### Task 2: Implement GET /api/claude/instances

```javascript
app.get('/api/claude/instances', (req, res) => {
  const instances = Array.from(activeInstances.values());
  res.json({
    success: true,
    instances
  });
});
```

### Task 3: Update POST and DELETE paths

Change `/api/v1/claude/instances` to `/api/claude/instances` to match frontend expectations.

### Task 4: Add Instance Lifecycle Management

- Track PIDs of spawned processes
- Monitor process status
- Clean up terminated instances
- Update instance status in real-time

## Testing Strategy

### Phase 1: Critical Path Testing
1. Test GET `/api/claude/instances` returns empty array initially
2. Test POST `/api/claude/instances` creates instance and returns correct response
3. Test GET `/api/claude/instances` returns created instance
4. Test DELETE `/api/claude/instances/{id}` removes instance
5. Test GET `/api/claude/instances` shows instance removed

### Phase 2: Integration Testing
1. Test full frontend flow: launch → select → interact → terminate
2. Test SSE terminal streaming with created instances
3. Test HTTP polling fallback with created instances

## Success Criteria

### Functional Requirements Met:
- [ ] ClaudeInstanceManager can fetch instances list without errors
- [ ] Users can create new Claude instances via UI buttons  
- [ ] Created instances appear in the instances list immediately
- [ ] Users can select instances and see terminal output
- [ ] Users can terminate instances via UI
- [ ] Terminal streaming (SSE or HTTP polling) works for created instances

### Technical Requirements Met:
- [ ] All API paths match frontend expectations exactly
- [ ] Backend maintains instance state correctly
- [ ] Error handling returns appropriate HTTP status codes
- [ ] Response schemas match frontend TypeScript interfaces
- [ ] No 404 errors in frontend logs for instance management endpoints

## Risk Assessment

### High Risk:
- **Process management**: Spawning actual Claude processes requires proper PID tracking and cleanup
- **Working directory permissions**: Ensure backend has access to specified directories  

### Medium Risk:
- **Memory leaks**: Instance map needs cleanup for terminated processes
- **Concurrent access**: Multiple users creating instances simultaneously

### Low Risk:
- **API compatibility**: Simple schema changes, low breaking change risk

This specification provides the complete roadmap for fixing the "Failed to create instance" errors by addressing the fundamental API path mismatches and missing endpoints.