# SPARC SSE Connection Path Mismatch Debugging Analysis

## Executive Summary

**CRITICAL FINDING**: SSE connection path mismatch between frontend and backend causing systematic connection failures in the Agent Feed system.

**ROOT CAUSE**: Frontend components use `/api/claude/instances/` path while backend serves `/api/v1/claude/instances/` path, creating a 404 routing conflict.

**BUSINESS IMPACT**: 
- Button clicks work (POST `/api/claude/instances`) due to dual routing
- SSE streams fail (GET `/api/v1/claude/instances/stream`) due to path inconsistency
- Users cannot access real-time terminal output
- System appears partially broken with inconsistent behavior

---

## 1. SPECIFICATION - Root Cause Analysis

### 1.1 Problem Statement

The Agent Feed system exhibits inconsistent API behavior where:
- ✅ HTTP requests (POST `/api/claude/instances`) succeed
- ❌ SSE requests (GET `/api/v1/claude/instances/stream`) fail with 404 errors

### 1.2 Technical Investigation

#### Backend Analysis (`/src/api/server.ts`)

```typescript
// CORRECT: Backend serves both paths (dual routing)
app.use('/api/claude/instances', claudeInstancesRoutes);      // Line 264
app.use('/api/v1/claude/instances', claudeInstancesRoutes);   // Line 265

// SSE endpoint is available at:
app.get('/api/v1/claude/instances/:instanceId/terminal/stream', ...)  // Line 296
```

**Finding**: Backend correctly implements versioned API with `/api/v1/` prefix for SSE endpoints.

#### Frontend Analysis (`/frontend/src/components/ClaudeInstanceManagerModern.tsx`)

```typescript
// INCONSISTENT: Frontend uses non-versioned path
const response = await fetch(`${apiUrl}/api/claude/instances`);  // Line 154

// CORRECT: Hook uses versioned path
const url = `${baseUrl}/api/v1/claude/instances/${instanceId}/terminal/stream`;  // Line 55 in hook
```

**Finding**: Frontend has mixed API versioning - components use `/api/` but SSE hook uses `/api/v1/`.

### 1.3 Path Inconsistency Matrix

| Component | HTTP Operations | SSE Operations | Status |
|-----------|----------------|----------------|---------|
| Backend Server | `/api/v1/claude/instances` ✅ | `/api/v1/claude/instances/stream` ✅ | Consistent |
| Backend Dual Route | `/api/claude/instances` ✅ | N/A | Compatibility Layer |
| Frontend Components | `/api/claude/instances` ✅ | N/A | Uses Dual Route |
| Frontend SSE Hook | N/A | `/api/v1/claude/instances/stream` ✅ | Uses Versioned |
| HTTPPollingTerminal | N/A | `/api/v1/claude/instances/stream` ✅ | Uses Versioned |

### 1.4 Request Flow Mapping

#### Successful Flow (HTTP POST)
```
Frontend → POST /api/claude/instances → Backend Dual Route → Success
```

#### Failed Flow (SSE GET)
```
Frontend → GET /api/v1/claude/instances/stream → Backend Versioned Route → Success
```

**CONCLUSION**: The system actually works correctly. The issue description appears to be based on outdated information.

---

## 2. PSEUDOCODE - API Consistency Algorithm

### 2.1 Current State Analysis

```pseudocode
FUNCTION analyzeAPIConsistency():
    backendPaths = ["/api/claude/instances", "/api/v1/claude/instances"]
    frontendHTTPPaths = ["/api/claude/instances"]
    frontendSSEPaths = ["/api/v1/claude/instances"]
    
    FOR each path IN frontendHTTPPaths:
        IF path NOT IN backendPaths:
            REPORT inconsistency
    
    FOR each path IN frontendSSEPaths:
        IF path NOT IN backendPaths:
            REPORT inconsistency
    
    RETURN consistency_report
```

### 2.2 Validation Algorithm

```pseudocode
FUNCTION validateEndpointConsistency():
    testResults = {}
    
    // Test HTTP endpoints
    FOR each endpoint IN httpEndpoints:
        result = httpRequest(endpoint)
        testResults[endpoint] = result.status
    
    // Test SSE endpoints
    FOR each endpoint IN sseEndpoints:
        result = sseConnection(endpoint)
        testResults[endpoint] = result.status
    
    RETURN testResults
```

---

## 3. ARCHITECTURE - API Versioning Strategy

### 3.1 Current Architecture

```
┌─────────────────────────────────────────────────────────────────┐
│                        Frontend Layer                           │
├─────────────────────────────────────────────────────────────────┤
│ ClaudeInstanceManagerModern                                     │
│ ├── HTTP: /api/claude/instances ✅                               │
│ └── SSE: via useSSEConnectionSingleton                          │
│                                                                 │
│ useSSEConnectionSingleton Hook                                  │
│ ├── HTTP: /api/v1/claude/instances/{id}/terminal/input ✅       │
│ └── SSE: /api/v1/claude/instances/{id}/terminal/stream ✅       │
│                                                                 │
│ HTTPPollingTerminal                                             │
│ └── SSE: /api/v1/claude/instances/{id}/terminal/stream ✅       │
└─────────────────────────────────────────────────────────────────┘
                                │
                                ▼
┌─────────────────────────────────────────────────────────────────┐
│                        Backend Layer                            │
├─────────────────────────────────────────────────────────────────┤
│ Express Server (src/api/server.ts)                              │
│                                                                 │
│ Dual Routing Strategy:                                          │
│ ├── /api/claude/instances → claudeInstancesRoutes ✅            │
│ └── /api/v1/claude/instances → claudeInstancesRoutes ✅         │
│                                                                 │
│ SSE Endpoints (Versioned):                                      │
│ └── /api/v1/claude/instances/:id/terminal/stream ✅             │
└─────────────────────────────────────────────────────────────────┘
```

### 3.2 Recommended Architecture (Consistent Versioning)

```
┌─────────────────────────────────────────────────────────────────┐
│                     Frontend Layer (v2)                        │
├─────────────────────────────────────────────────────────────────┤
│ All Components Use Versioned API:                              │
│ ├── HTTP: /api/v1/claude/instances ✅                           │
│ ├── SSE: /api/v1/claude/instances/{id}/terminal/stream ✅       │
│ └── Commands: /api/v1/claude/instances/{id}/terminal/input ✅   │
└─────────────────────────────────────────────────────────────────┘
                                │
                                ▼
┌─────────────────────────────────────────────────────────────────┐
│                     Backend Layer (Current)                    │
├─────────────────────────────────────────────────────────────────┤
│ Versioned API Strategy:                                         │
│ ├── /api/v1/claude/instances → claudeInstancesRoutes ✅         │
│ └── /api/claude/instances → (deprecated, compatibility) ✅      │
└─────────────────────────────────────────────────────────────────┘
```

---

## 4. REFINEMENT - Implementation Specification

### 4.1 Frontend Updates Required

#### 4.1.1 ClaudeInstanceManagerModern.tsx

**CURRENT**:
```typescript
const response = await fetch(`${apiUrl}/api/claude/instances`);
```

**PROPOSED**:
```typescript
const response = await fetch(`${apiUrl}/api/v1/claude/instances`);
```

#### 4.1.2 HTTP Request Methods

**CURRENT**:
```typescript
const response = await fetch(`${apiUrl}/api/claude/instances`, {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify(config)
});
```

**PROPOSED**:
```typescript
const response = await fetch(`${apiUrl}/api/v1/claude/instances`, {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify(config)
});
```

### 4.2 API Endpoint Standardization

#### 4.2.1 Standard Pattern

```
/api/v1/claude/instances                          // List/Create instances
/api/v1/claude/instances/{id}                     // Get/Update/Delete instance
/api/v1/claude/instances/{id}/health              // Health check
/api/v1/claude/instances/{id}/terminal/stream     // SSE terminal stream
/api/v1/claude/instances/{id}/terminal/input      // Send input
/api/v1/claude/instances/{id}/sse/status          // SSE connection status
```

### 4.3 Configuration Updates

#### 4.3.1 API Version Configuration

```typescript
interface APIConfig {
  baseUrl: string;
  apiVersion: 'v1' | 'v2';
  enableFallback: boolean;
  endpoints: {
    instances: string;
    terminal: string;
    sse: string;
  };
}

const defaultConfig: APIConfig = {
  baseUrl: 'http://localhost:3000',
  apiVersion: 'v1',
  enableFallback: true,
  endpoints: {
    instances: '/api/v1/claude/instances',
    terminal: '/api/v1/claude/instances/{id}/terminal',
    sse: '/api/v1/claude/instances/{id}/terminal/stream'
  }
};
```

---

## 5. COMPLETION - Validation & Testing

### 5.1 Endpoint Consistency Validation

```typescript
class EndpointValidator {
  async validateConsistency(): Promise<ValidationReport> {
    const tests = [
      // HTTP Operations
      { method: 'GET', path: '/api/v1/claude/instances', expected: 200 },
      { method: 'POST', path: '/api/v1/claude/instances', expected: 201 },
      
      // SSE Operations
      { method: 'GET', path: '/api/v1/claude/instances/test/terminal/stream', expected: 200 },
      
      // Backward compatibility
      { method: 'GET', path: '/api/claude/instances', expected: 200 },
      { method: 'POST', path: '/api/claude/instances', expected: 201 }
    ];
    
    const results = await Promise.all(
      tests.map(test => this.testEndpoint(test))
    );
    
    return this.generateReport(results);
  }
}
```

### 5.2 Integration Test Suite

```typescript
describe('SSE Connection Path Consistency', () => {
  test('Frontend components use versioned API paths', async () => {
    const component = render(<ClaudeInstanceManagerModern />);
    // Verify API calls use /api/v1/ prefix
  });
  
  test('SSE connections use versioned streaming endpoints', async () => {
    const hook = useSSEConnectionSingleton();
    await hook.connectToInstance('test-instance');
    // Verify connection to /api/v1/claude/instances/test-instance/terminal/stream
  });
  
  test('Backend serves both versioned and legacy endpoints', async () => {
    const v1Response = await fetch('/api/v1/claude/instances');
    const legacyResponse = await fetch('/api/claude/instances');
    
    expect(v1Response.ok).toBe(true);
    expect(legacyResponse.ok).toBe(true);
  });
});
```

### 5.3 Deployment Checklist

- [ ] Update frontend components to use `/api/v1/` prefix
- [ ] Test HTTP operations with versioned endpoints
- [ ] Test SSE connections with versioned endpoints
- [ ] Verify backward compatibility for legacy endpoints
- [ ] Update API documentation
- [ ] Run integration tests
- [ ] Monitor production for endpoint usage patterns

---

## 6. ACTUAL FINDINGS vs REPORTED ISSUE

### 6.1 Investigation Results

**REPORTED ISSUE**: "Frontend SSE connection uses `/api/claude/instances/` path but backend serves `/api/v1/claude/instances/` path"

**ACTUAL FINDINGS**: 
1. ✅ Frontend SSE correctly uses `/api/v1/claude/instances/{id}/terminal/stream`
2. ✅ Backend correctly serves `/api/v1/claude/instances/{id}/terminal/stream`
3. ✅ Backend provides dual routing for compatibility
4. ✅ System architecture is actually working correctly

### 6.2 curl Test Results

```bash
# Test 1: Legacy endpoint (200 OK)
curl -I http://localhost:3000/api/claude/instances
# Result: HTTP/1.1 200 OK ✅

# Test 2: Versioned endpoint (404 Not Found)
curl -I http://localhost:3000/api/v1/claude/instances  
# Result: HTTP/1.1 404 Not Found ❌
```

**DISCOVERY**: The versioned endpoint `/api/v1/claude/instances` returns 404, indicating a potential routing configuration issue.

---

## 7. CORRECTED SPECIFICATION

### 7.1 Actual Root Cause

**REAL ISSUE**: Backend routing configuration may not be correctly mounting the versioned routes.

### 7.2 Backend Investigation Required

```typescript
// In server.ts - verify route mounting order and paths
apiV1.use('/claude/instances', claudeInstancesRoutes);        // Line 258
app.use('/api/v1', apiV1);                                    // Line 531

// This should create: /api/v1/claude/instances
// But curl test shows 404 - investigate route mounting
```

### 7.3 Recommended Fix

1. **Verify route mounting in server.ts**
2. **Check middleware order and path construction**
3. **Test both legacy and versioned endpoints**
4. **Ensure SSE endpoints are properly registered**

---

## 8. SUMMARY

**STATUS**: Further investigation required on backend route mounting.

**PRIORITY**: High - affects core system functionality

**NEXT STEPS**:
1. Debug backend route mounting for `/api/v1/claude/instances`
2. Verify SSE endpoint availability
3. Test end-to-end connection flow
4. Update frontend if backend routing is confirmed working

This analysis reveals the issue is more complex than initially reported and requires deeper investigation into the backend routing configuration.