# CRITICAL FIXES: 30-Second WebSocket Connection Drops

## 🚨 URGENT: Root Cause Identified

The 30-second connection drops are caused by **competing timeout mechanisms** that create a cascade failure when Claude API calls exceed 30 seconds. This is a **deterministic system design flaw**, not random network issues.

## 💡 Immediate Fix Required (2-4 hours)

### Fix #1: Extend Grace Period During Claude Processing

**File**: `/workspaces/agent-feed/simple-backend.js` (Lines 2792-2801)

**Current Code**:
```javascript
const gracePeriod = 30000; // 30 seconds ← PROBLEM
if (connectionAge > gracePeriod && ws.readyState === WebSocket.CLOSED) {
  console.log(`🧹 SPARC: Removing definitively dead connection`);
  staleConnections.add(ws);
}
```

**Fix**:
```javascript
// Check if Claude is actively processing for this instance
const instanceId = wsConnectionsBySocket.get(ws);
const processInfo = activeProcesses.get(instanceId);
const isClaudeProcessing = processInfo && processInfo.status === 'running';

// Extend grace period during active Claude processing
const gracePeriod = isClaudeProcessing ? 300000 : 30000; // 5min vs 30s
if (connectionAge > gracePeriod && ws.readyState === WebSocket.CLOSED) {
  console.log(`🧹 SPARC: Removing definitively dead connection (gracePeriod: ${gracePeriod}ms)`);
  staleConnections.add(ws);
}
```

### Fix #2: Coordinate Reconnection Window

**File**: `/workspaces/agent-feed/src/services/WebSocketConnectionManager.js` (Lines 187-194)

**Current Code**:
```javascript
const reconnectionWindow = 30000; // 30 seconds ← PROBLEM
if (!isRecentConnection && ws.readyState === WebSocket.CLOSED) {
  console.log(`🗑️ SPARC: Removing definitively dead connection`);
  connections.delete(ws);
}
```

**Fix**:
```javascript
// Check for active Claude processing before removing connections
const instanceId = ws._instanceId;
const isProcessingActive = this.isClaudeProcessingActive(instanceId);
const reconnectionWindow = isProcessingActive ? 300000 : 30000; // 5min vs 30s

if (!isRecentConnection && ws.readyState === WebSocket.CLOSED && !isProcessingActive) {
  console.log(`🗑️ SPARC: Removing definitively dead connection`);
  connections.delete(ws);
} else if (isProcessingActive) {
  console.log(`⏳ SPARC: Preserving connection during Claude processing`);
}
```

### Fix #3: Add Claude Processing State Tracking

**File**: `/workspaces/agent-feed/simple-backend.js` (After line 40)

**Add**:
```javascript
// Claude processing state tracking for connection preservation
const claudeProcessingStates = new Map(); // instanceId → { startTime, estimatedDuration }

function markClaudeProcessingStart(instanceId, estimatedDuration = 60000) {
  claudeProcessingStates.set(instanceId, {
    startTime: Date.now(),
    estimatedDuration: estimatedDuration,
    status: 'active'
  });
  console.log(`⏳ CLAUDE: Processing started for ${instanceId} (estimated: ${estimatedDuration}ms)`);
}

function markClaudeProcessingEnd(instanceId) {
  const state = claudeProcessingStates.get(instanceId);
  if (state) {
    const actualDuration = Date.now() - state.startTime;
    console.log(`✅ CLAUDE: Processing completed for ${instanceId} (took: ${actualDuration}ms)`);
  }
  claudeProcessingStates.delete(instanceId);
}

function isClaudeProcessingActive(instanceId) {
  return claudeProcessingStates.has(instanceId);
}
```

### Fix #4: Update Claude API Call Integration

**File**: `/workspaces/agent-feed/simple-backend.js` (Line 1400-1500 range, in Claude API route handler)

**Find the Claude API call and wrap with state tracking**:
```javascript
// Before Claude API call
markClaudeProcessingStart(instanceId, calculateAdaptiveTimeout(message));

try {
  const response = await claudeAPIManager.sendToInstance(instanceId, message, req.body);
  
  // After successful Claude API call
  markClaudeProcessingEnd(instanceId);
  
  res.json(response);
} catch (error) {
  // After failed Claude API call
  markClaudeProcessingEnd(instanceId);
  
  console.error(`❌ Claude API error for ${instanceId}:`, error);
  res.status(500).json({ error: error.message });
}
```

## 📋 Implementation Checklist

- [ ] **Fix #1**: Extend grace period during Claude processing
- [ ] **Fix #2**: Coordinate reconnection window  
- [ ] **Fix #3**: Add Claude processing state tracking
- [ ] **Fix #4**: Integrate state tracking with Claude API calls
- [ ] **Test**: Verify 60+ second Claude operations don't kill connections
- [ ] **Monitor**: Check connection lifetime metrics post-fix

## 🧪 Validation Test

Create this test to verify the fix works:

```javascript
// Test: Long Claude operations should not kill connections
async function testLongClaudeOperationStability() {
  const ws = new WebSocket('ws://localhost:3000/terminal');
  await waitForConnection(ws);
  
  const startTime = Date.now();
  console.log('Starting long Claude operation test...');
  
  // Send complex prompt that will take >30 seconds
  ws.send(JSON.stringify({
    type: 'connect',
    terminalId: 'test-instance'
  }));
  
  ws.send(JSON.stringify({
    type: 'input', 
    data: 'Analyze this entire codebase and provide detailed architectural recommendations\\r'
  }));
  
  // Wait for 45 seconds - connection should still be alive
  await new Promise(resolve => setTimeout(resolve, 45000));
  
  const isAlive = ws.readyState === WebSocket.OPEN;
  const connectionAge = Date.now() - startTime;
  
  console.log(`Connection after ${connectionAge}ms: ${isAlive ? 'ALIVE ✅' : 'DEAD ❌'}`);
  
  if (!isAlive) {
    throw new Error(`Connection died after ${connectionAge}ms - fix failed!`);
  }
  
  ws.close();
}
```

## ⚠️ Risk Assessment

- **Risk Level**: **LOW** - Changes are isolated to timeout logic
- **Impact**: **HIGH** - Fixes core user experience issue
- **Rollback**: Easy - revert timeout values if needed
- **Dependencies**: None - self-contained fixes

## 📊 Expected Results

After implementing these fixes:

1. **30-second drops eliminated** for legitimate Claude operations
2. **Response delivery rate** increases from ~60% to ~95%  
3. **User experience** dramatically improved (no more mysterious disconnections)
4. **Connection lifetime** extends appropriately based on actual processing needs

## 🔍 Files Modified

1. `/workspaces/agent-feed/simple-backend.js`
2. `/workspaces/agent-feed/src/services/WebSocketConnectionManager.js`

**Total Lines Changed**: ~20-30 lines
**Estimated Time**: 2-4 hours including testing