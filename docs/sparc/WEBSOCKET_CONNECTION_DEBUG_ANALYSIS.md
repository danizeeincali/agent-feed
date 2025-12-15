# SPARC:DEBUG - WebSocket Connection Analysis Report

## Executive Summary
**Critical Finding**: Connection endpoint mismatch between test scripts and browser frontend causing WebSocket failures.

## SPARC Phase 1: Specification Analysis ✅

### Connection Requirements Identified:
1. **Backend Server**: Running on port 3000/3001 with Socket.IO
2. **Terminal Namespace**: `/terminal` configured with authentication
3. **Browser Frontend**: Attempting connections through multiple pathways
4. **Test Scripts**: Successfully connecting to port 3002 (WebSocket Hub)

## SPARC Phase 2: Debug Analysis ✅

### Key Findings:

#### Backend Configuration (✅ Working):
- Socket.IO server on port 3000 with CORS for `localhost:3000`, `localhost:3001`, `localhost:3002`
- Terminal namespace `/terminal` properly configured
- ClaudeInstanceTerminalWebSocket initialized successfully
- Authentication middleware in place

#### Frontend Configuration (❌ Problem Identified):
```typescript
// File: /workspaces/agent-feed/frontend/src/hooks/useTerminalSocket.ts:136
const socket = io('http://localhost:3001/terminal', {
  auth: {
    token: localStorage.getItem('auth-token') || 'dev-token',
    userId: localStorage.getItem('user-id') || 'dev-user-' + Date.now(),
    username: localStorage.getItem('username') || 'Development User'
  },
  transports: ['websocket', 'polling'],
  timeout: 10000,
  reconnection: false
});
```

#### Test Script Configuration (✅ Working):
```javascript
// File: /workspaces/agent-feed/tests/websocket-connection-test.js:8
const WEBSOCKET_HUB_URL = 'http://localhost:3002';
```

## SPARC Phase 3: Root Cause Analysis

### The Connection Gap:
1. **Frontend**: Trying to connect to `http://localhost:3001/terminal`
2. **Backend**: Running on `http://localhost:3000` (not 3001)
3. **Test Scripts**: Successfully connecting to `http://localhost:3002` (WebSocket Hub)
4. **Port Mismatch**: Frontend expecting 3001, backend on 3000

### Additional Issues:
1. **Authentication Headers**: Frontend providing proper auth but to wrong endpoint
2. **CORS Configuration**: Backend allows 3001 but serves on 3000
3. **Transport Strategy**: Both using similar Socket.IO config (good)

## SPARC Phase 4: Solution Architecture

### Fix Strategy:
1. **Correct Frontend Connection URL**: Change from 3001 to 3000
2. **Verify CORS Alignment**: Ensure CORS matches actual serving ports
3. **Environment Variable Management**: Centralize connection URLs
4. **Connection State Debugging**: Add better error reporting

### Implementation Plan:
1. Update `useTerminalSocket.ts` connection URL
2. Add environment variable for dynamic URL configuration
3. Enhance connection error reporting
4. Test both browser and node.js connections

## SPARC Phase 5: Implementation

### Files to Modify:
1. `/workspaces/agent-feed/frontend/src/hooks/useTerminalSocket.ts`
2. `/workspaces/agent-feed/frontend/.env` (if exists)
3. Connection status components for better debugging

### Expected Outcome:
- Browser WebSocket connections successful
- Terminal view shows "Connected" status
- Both test scripts and browser work consistently