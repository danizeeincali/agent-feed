# SPARC Mixed API Versioning Debug Analysis & Technical Specification

## Executive Summary

This specification provides a complete technical analysis of the mixed API versioning issue causing frontend instance fetching failures while SSE connections work correctly. The analysis follows SPARC methodology to identify root causes and provide a comprehensive fix specification.

## Problem Statement

**Core Issue**: Frontend uses `/api/v1/claude/instances` for fetching but backend only serves `/api/claude/instances` for instance listing, while SSE operations correctly use `/api/v1/` paths.

**Impact**: Claude instance manager displays empty instance lists while terminal streaming works perfectly.

---

## S - SPECIFICATION: Requirements Analysis

### Functional Requirements

#### FR-001: Unified API Versioning
- **Requirement**: All Claude instance operations must use consistent API versioning
- **Current State**: Mixed versioning causing fetch failures
- **Target State**: Unified `/api/v1/` or `/api/` versioning across all endpoints

#### FR-002: Backward Compatibility
- **Requirement**: Existing SSE connections must continue working
- **Priority**: Critical - SSE functionality is currently operational
- **Constraint**: Cannot break working terminal streaming

#### FR-003: Frontend Instance Fetching
- **Requirement**: Frontend must successfully retrieve instance lists
- **Current Failure**: `GET /api/v1/claude/instances` returns 404
- **Target**: 200 OK with valid instance data

### Non-Functional Requirements

#### NFR-001: Minimal Breaking Changes
- **Requirement**: Fix must not disrupt working features
- **Target**: Zero downtime for existing SSE connections
- **Approach**: Additive API changes only

#### NFR-002: API Consistency
- **Requirement**: All Claude endpoints must follow same versioning pattern
- **Standard**: RESTful API design principles
- **Validation**: Automated endpoint testing

---

## Root Cause Analysis

### Analysis Findings

#### 1. Backend Service Inconsistencies

**Primary Backend Server** (`/workspaces/agent-feed/src/api/server.ts`):
```typescript
// Lines 264-265: Inconsistent mounting
app.use('/api/claude/instances', claudeInstancesRoutes);        // ❌ No versioning
app.use('/api/v1/claude/instances', claudeInstancesRoutes);     // ✅ Versioned (duplicate)

// Line 296: SSE endpoints correctly versioned
app.get('/api/v1/claude/instances/:instanceId/terminal/stream', ...)  // ✅ Working
```

**Secondary Backend Server** (`simple-backend.js`):
```javascript
// Line 831: Non-versioned endpoint
app.get('/api/claude/instances', (req, res) => { ... })        // ❌ Missing v1

// Lines 524-526: Redirect aliases
app.get('/api/v1/claude/instances', (req, res) => {
  res.redirect('/api/claude/instances');                        // ❌ Redirects to non-versioned
});
```

**Integrated Backend Server** (`integrated-real-claude-backend.js`):
```javascript
// Line 238: Non-versioned instance list
app.get('/api/claude/instances', ...)                          // ❌ Missing v1

// Line 524: Versioned redirect
app.get('/api/v1/claude/instances', (req, res) => {
  res.redirect('/api/claude/instances');                        // ❌ Redirects away from v1
});
```

#### 2. Frontend Usage Patterns

**Primary Components**:
- `ClaudeInstanceManager.tsx` Line 202: `${apiUrl}/api/v1/claude/instances` ❌
- `ClaudeInstanceManagerModern.tsx` Line 154: `${apiUrl}/api/v1/claude/instances` ❌  
- `ClaudeInstanceManagerModernFixed.tsx` Line 187: `${apiUrl}/api/v1/claude/instances` ❌

**Working Patterns**:
- SSE connections use `/api/v1/claude/instances/:id/terminal/stream` ✅
- Terminal input uses `/api/v1/claude/instances/:id/terminal/input` ✅

#### 3. Service Architecture Confusion

**Multiple Backend Servers**:
1. **Main Backend** (`src/api/server.ts`) - TypeScript Express server with v1 support
2. **Simple Backend** (`simple-backend.js`) - JavaScript fallback server 
3. **Integrated Backend** (`integrated-real-claude-backend.js`) - Real Claude process server

**Endpoint Mapping Conflicts**:
- SSE endpoints: Properly versioned at `/api/v1/`
- Instance CRUD: Mixed versioning causing mismatches
- Health endpoints: Non-versioned working correctly

---

## Technical Specification for Resolution

### Solution Architecture

#### Option A: Standardize on `/api/v1/` (Recommended)

**Benefits**:
- Maintains working SSE functionality
- Future-proof versioning strategy  
- Consistent with modern API design
- No disruption to terminal streaming

**Implementation**:
```typescript
// Backend: Ensure all instance endpoints serve at /api/v1/
app.get('/api/v1/claude/instances', handleGetInstances);
app.post('/api/v1/claude/instances', handleCreateInstance);
app.delete('/api/v1/claude/instances/:id', handleDeleteInstance);

// Maintain legacy compatibility with redirects
app.get('/api/claude/instances', (req, res) => {
  res.redirect(301, '/api/v1/claude/instances');
});
```

#### Option B: Standardize on `/api/` (Alternative)

**Benefits**:
- Simpler endpoint structure
- Matches current working endpoints
- Less frontend changes required

**Implementation**:
```typescript
// Backend: Update SSE endpoints to non-versioned
app.get('/api/claude/instances/:id/terminal/stream', handleSSE);

// Frontend: Update fetch calls  
fetch(`${apiUrl}/api/claude/instances`)
```

### Recommended Implementation Plan

#### Phase 1: Backend Endpoint Standardization

**Step 1.1: Primary Server Updates** (`src/api/server.ts`)
```typescript
// Remove duplicate mounting, standardize on v1
app.use('/api/v1/claude/instances', claudeInstancesRoutes);

// Add legacy redirect for compatibility  
app.use('/api/claude/instances', (req, res) => {
  const newUrl = req.originalUrl.replace('/api/claude/', '/api/v1/claude/');
  res.redirect(301, newUrl);
});
```

**Step 1.2: Secondary Server Updates**
```javascript
// simple-backend.js: Fix the redirect
app.get('/api/v1/claude/instances', (req, res) => {
  // Direct implementation instead of redirect
  handleClaudeInstances(req, res);
});

// integrated-real-claude-backend.js: Same fix
app.get('/api/v1/claude/instances', (req, res) => {
  handleRealClaudeInstances(req, res);  
});
```

#### Phase 2: Frontend Consistency Verification

**Step 2.1: Verify Frontend Calls**
- All components already use `/api/v1/claude/instances` ✅
- No frontend changes required
- Validate working SSE endpoints unchanged

**Step 2.2: Integration Testing**
```typescript
// Test suite to validate endpoint consistency
describe('API Versioning Consistency', () => {
  test('GET /api/v1/claude/instances returns 200', async () => {
    const response = await fetch('/api/v1/claude/instances');
    expect(response.status).toBe(200);
  });
  
  test('SSE endpoint remains functional', async () => {
    const response = await fetch('/api/v1/claude/instances/test-id/terminal/stream');
    expect(response.headers.get('content-type')).toBe('text/event-stream');
  });
});
```

#### Phase 3: Validation & Rollback Plan

**Step 3.1: Pre-Deployment Validation**
```bash
# Endpoint availability check
curl -f http://localhost:3000/api/v1/claude/instances
curl -f http://localhost:3000/api/v1/claude/instances/test/terminal/stream

# Legacy compatibility check  
curl -f http://localhost:3000/api/claude/instances
```

**Step 3.2: Rollback Procedure**
```typescript
// Emergency rollback: Restore dual mounting
app.use('/api/claude/instances', claudeInstancesRoutes);      // Restore
app.use('/api/v1/claude/instances', claudeInstancesRoutes);   // Keep
```

---

## Implementation Code Specifications

### Backend Implementation

#### File: `/workspaces/agent-feed/src/api/server.ts`

**Current State (Lines 264-265)**:
```typescript
app.use('/api/claude/instances', claudeInstancesRoutes);
app.use('/api/v1/claude/instances', claudeInstancesRoutes);
```

**Required Change**:
```typescript
// PRIMARY ENDPOINT: Versioned API
app.use('/api/v1/claude/instances', claudeInstancesRoutes);

// LEGACY COMPATIBILITY: Redirect non-versioned to versioned
app.use('/api/claude/instances', (req, res, next) => {
  const versionedUrl = req.originalUrl.replace('/api/claude/', '/api/v1/claude/');
  res.redirect(301, versionedUrl);
});
```

#### File: `/workspaces/agent-feed/simple-backend.js`

**Current State (Lines 524-526)**:
```javascript
app.get('/api/v1/claude/instances', (req, res) => {
  res.redirect('/api/claude/instances');  // ❌ Wrong direction
});
```

**Required Change**:
```javascript
// DIRECT IMPLEMENTATION: Serve instances at versioned endpoint  
app.get('/api/v1/claude/instances', (req, res) => {
  console.log('🔍 Fetching Claude instances for frontend (v1 endpoint)');
  
  const instanceList = Array.from(instances.values());
  console.log(`📋 Returning ${instanceList.length} instances:`, instanceList.map(i => `${i.id} (${i.name})`));
  
  res.json({
    success: true,
    instances: instanceList,
    timestamp: new Date().toISOString()
  });
});

// LEGACY COMPATIBILITY: Redirect old endpoint to new
app.get('/api/claude/instances', (req, res) => {
  res.redirect(301, '/api/v1/claude/instances');
});
```

#### File: `/workspaces/agent-feed/integrated-real-claude-backend.js`

**Current State (Line 524)**:
```javascript
app.get('/api/v1/claude/instances', (req, res) => {
  res.redirect('/api/claude/instances');
});
```

**Required Change**:
```javascript
// DIRECT IMPLEMENTATION: Copy logic from /api/claude/instances to /api/v1/claude/instances
app.get('/api/v1/claude/instances', (req, res) => {
  console.log('🔍 Fetching Claude instances for frontend (v1 endpoint)');
  
  // CRITICAL FIX: Return dynamic instances list for Option A validation
  const instanceList = Array.from(instances.values());
  console.log(`📋 Returning ${instanceList.length} instances:`, instanceList.map(i => `${i.id} (${i.name})`));
  
  res.json({
    success: true,
    instances: instanceList,
    timestamp: new Date().toISOString()
  });
});

// LEGACY COMPATIBILITY: Keep existing non-versioned for compatibility  
app.get('/api/claude/instances', (req, res) => {
  // Keep existing implementation unchanged to preserve working features
  console.log('🔍 Fetching Claude instances for frontend');
  // ... existing implementation
});
```

### Frontend Verification (No Changes Required)

**Components Already Correct**:
- `ClaudeInstanceManager.tsx` Line 202: ✅ Uses `/api/v1/claude/instances`
- `ClaudeInstanceManagerModern.tsx` Line 154: ✅ Uses `/api/v1/claude/instances`  
- `ClaudeInstanceManagerModernFixed.tsx` Line 187: ✅ Uses `/api/v1/claude/instances`

**SSE Connections Working**:
- All SSE endpoints already use `/api/v1/` paths ✅
- Terminal streaming functionality preserved ✅

---

## Validation & Testing Strategy

### Pre-Implementation Validation

#### Test 1: Current State Verification
```bash
# Verify current failures
curl -i http://localhost:3000/api/v1/claude/instances
# Expected: 404 or redirect

# Verify current working endpoints  
curl -i http://localhost:3000/api/claude/instances
# Expected: 200 OK with instances

# Verify SSE working
curl -i http://localhost:3000/api/v1/claude/instances/test/terminal/stream
# Expected: text/event-stream headers
```

#### Test 2: Post-Implementation Validation
```bash
# Verify fix works
curl -i http://localhost:3000/api/v1/claude/instances  
# Expected: 200 OK with instances

# Verify legacy compatibility
curl -i http://localhost:3000/api/claude/instances
# Expected: 301 redirect to /api/v1/claude/instances

# Verify SSE still working
curl -i http://localhost:3000/api/v1/claude/instances/test/terminal/stream
# Expected: text/event-stream headers unchanged
```

### Integration Testing

#### Frontend Integration Test
```typescript
// File: tests/api-versioning-fix-validation.test.js
describe('Mixed API Versioning Fix', () => {
  test('Frontend can fetch instances from v1 endpoint', async () => {
    const response = await fetch('http://localhost:3000/api/v1/claude/instances');
    expect(response.ok).toBe(true);
    
    const data = await response.json();
    expect(data.success).toBe(true);
    expect(Array.isArray(data.instances)).toBe(true);
  });
  
  test('Legacy endpoint redirects correctly', async () => {
    const response = await fetch('http://localhost:3000/api/claude/instances', {
      redirect: 'manual'
    });
    expect(response.status).toBe(301);
    expect(response.headers.get('location')).toContain('/api/v1/claude/instances');
  });
  
  test('SSE endpoints remain functional', async () => {
    const response = await fetch('http://localhost:3000/api/v1/claude/instances/test/terminal/stream');
    expect(response.headers.get('content-type')).toBe('text/event-stream');
  });
});
```

### Risk Assessment & Mitigation

#### Risk Level: LOW
- **Change Scope**: Backend endpoint routing only
- **Frontend Impact**: Zero (already using correct endpoints)  
- **Working Features**: SSE functionality preserved
- **Rollback**: Simple (restore dual mounting)

#### Mitigation Strategies

**Strategy 1: Gradual Deployment**
```typescript
// Phase 1: Add v1 endpoint alongside existing
app.use('/api/v1/claude/instances', claudeInstancesRoutes);
app.use('/api/claude/instances', claudeInstancesRoutes);  // Keep both

// Phase 2: Monitor for 24 hours, then add redirects
app.use('/api/claude/instances', (req, res) => {
  res.redirect(301, req.originalUrl.replace('/api/claude/', '/api/v1/claude/'));
});
```

**Strategy 2: Feature Flag Control**  
```typescript
const USE_V1_ONLY = process.env.API_V1_ONLY === 'true';

if (USE_V1_ONLY) {
  app.use('/api/v1/claude/instances', claudeInstancesRoutes);
  app.use('/api/claude/instances', (req, res) => {
    res.redirect(301, req.originalUrl.replace('/api/claude/', '/api/v1/claude/'));
  });
} else {
  // Dual mounting for safety
  app.use('/api/v1/claude/instances', claudeInstancesRoutes);
  app.use('/api/claude/instances', claudeInstancesRoutes);
}
```

---

## Acceptance Criteria

### Must-Have Requirements

#### ✅ AC-001: Frontend Instance Fetching
- **Given**: Frontend requests `GET /api/v1/claude/instances`
- **When**: Backend processes the request  
- **Then**: Returns 200 OK with valid instance data
- **Validation**: `curl -f http://localhost:3000/api/v1/claude/instances`

#### ✅ AC-002: SSE Functionality Preservation
- **Given**: Existing SSE connections use `/api/v1/` paths
- **When**: Implementation is deployed
- **Then**: SSE terminal streaming continues working without interruption
- **Validation**: Terminal connections remain active during deployment

#### ✅ AC-003: Legacy Compatibility
- **Given**: Systems may use non-versioned endpoints
- **When**: Request sent to `/api/claude/instances`
- **Then**: Gracefully redirects to `/api/v1/claude/instances`
- **Validation**: `curl -w "%{http_code}" http://localhost:3000/api/claude/instances`

#### ✅ AC-004: Zero Breaking Changes  
- **Given**: Working terminal streaming and other features
- **When**: API versioning fix is deployed
- **Then**: All existing functionality continues without disruption
- **Validation**: Comprehensive integration testing

### Performance Requirements

#### PR-001: Response Time
- **Requirement**: API response times remain under 200ms
- **Current**: SSE connections establish quickly
- **Target**: No degradation in response times

#### PR-002: Resource Utilization
- **Requirement**: Memory and CPU usage unchanged
- **Risk**: Redirect processing overhead minimal
- **Mitigation**: Use efficient 301 redirects

---

## Success Metrics

### Primary Success Indicators

1. **Frontend Instance Loading**: `200 OK` responses from `/api/v1/claude/instances`
2. **SSE Connection Stability**: Zero disconnections during implementation  
3. **Legacy Compatibility**: `301` redirects working for non-versioned endpoints
4. **Error Rate**: Zero 404 errors for instance fetching operations

### Monitoring & Alerting

```javascript
// Health check endpoint for monitoring
app.get('/api/v1/health/versioning', (req, res) => {
  res.json({
    status: 'healthy',
    endpoints: {
      'GET /api/v1/claude/instances': 'active',
      'GET /api/claude/instances': 'redirect_active',
      'SSE /api/v1/claude/instances/:id/terminal/stream': 'active'
    },
    timestamp: new Date().toISOString()
  });
});
```

---

## Conclusion

This specification provides a complete solution for the mixed API versioning issue affecting Claude instance fetching. The recommended approach standardizes on `/api/v1/` endpoints while maintaining backward compatibility and preserving all working SSE functionality.

**Implementation Priority**: HIGH
**Complexity**: LOW  
**Risk**: MINIMAL
**Estimated Implementation Time**: 2-4 hours
**Testing Time**: 4-6 hours

The fix addresses the core issue by ensuring both frontend and backend use consistent versioning patterns, eliminating the 404 errors that prevent instance lists from loading while maintaining all working terminal streaming capabilities.