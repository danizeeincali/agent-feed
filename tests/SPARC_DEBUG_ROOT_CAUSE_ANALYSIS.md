# SPARC DEBUG: SSE Buffer Replay Bug - ROOT CAUSE ANALYSIS

## EXECUTIVE SUMMARY
**CRITICAL FINDING**: The SSE incremental output system is PROPERLY IMPLEMENTED but has a fatal integration gap between backend position tracking and frontend SSE consumption.

## SPECIFICATION PHASE ANALYSIS ✅

### Exact Failure Pattern Identified
1. **Backend Issue**: `broadcastIncrementalOutput()` function exists and works correctly
2. **Frontend Issue**: Frontend SSE consumption expects `data.type === 'terminal_output'` but backend sends `type: 'output'`
3. **Integration Gap**: Message type mismatch prevents incremental output from being processed

### Data Flow Tracing
```
Claude Process stdout → broadcastIncrementalOutput() → SSE stream → Frontend EventSource
                                     ↓
                           message.type = 'output' (backend)
                                     ↓
                           frontend expects 'terminal_output' (mismatch!)
                                     ↓
                              Messages ignored/unprocessed
```

## PSEUDOCODE PHASE ANALYSIS ✅

### Current Backend Flow (WORKING)
```javascript
// Lines 545, 561, 482 in simple-backend.js
claudeProcess.stdout.on('data', (data) => {
  broadcastIncrementalOutput(instanceId, realOutput, 'stdout');
});

function broadcastIncrementalOutput(instanceId, newData, source) {
  const message = {
    type: 'output',              // ← ISSUE: Frontend expects 'terminal_output'
    data: newDataSlice,          // ← This is correct incremental data
    position: outputBuffer.lastSentPosition,
    totalLength: outputBuffer.buffer.length,
    isIncremental: true          // ← This flag is correct
  };
  broadcastToConnections(instanceId, message);
}
```

### Current Frontend Flow (BROKEN)
```javascript
// HTTPPollingTerminal.tsx line 58
if (data.type === 'terminal_output') {  // ← MISMATCH: Backend sends 'output'
  addOutput(data.output, 'output');    // ← Never executes
}
```

## ARCHITECTURE PHASE ANALYSIS ✅

### SSE Integration Architecture Mapping

#### Working Components ✅
- `instanceOutputBuffers` Map with position tracking
- `broadcastIncrementalOutput()` with proper slicing
- `createTerminalSSEStream()` endpoint setup
- Backend incremental buffering system

#### Integration Gap ❌
- Message type inconsistency: backend `'output'` vs frontend `'terminal_output'`
- Frontend property access: frontend uses `data.output` vs backend sends `data.data`
- Missing error handling for message type mismatches

### SSE Endpoints Claude Uses
1. `/api/v1/claude/instances/:instanceId/terminal/stream` ✅ (primary)
2. `/api/claude/instances/:instanceId/terminal/stream` ✅ (alias)
3. Frontend connects to: `/api/v1/claude/instances/${instanceId}/terminal/stream`

## REFINEMENT PHASE - CRITICAL FIXES NEEDED 🔧

### Fix 1: Message Type Alignment
```javascript
// Backend change required in broadcastIncrementalOutput()
const message = {
  type: 'terminal_output',      // ← Change from 'output' to 'terminal_output'
  output: newDataSlice,         // ← Change from 'data' to 'output'
  instanceId: instanceId,
  timestamp: new Date().toISOString(),
  source: source,
  isReal: true,
  position: outputBuffer.lastSentPosition,
  totalLength: outputBuffer.buffer.length,
  isIncremental: true
};
```

### Fix 2: Frontend Property Access
```javascript
// Frontend HTTPPollingTerminal.tsx - Already correct!
if (data.type === 'terminal_output') {
  addOutput(data.output, 'output');  // ← Will work after backend fix
}
```

### Fix 3: Additional Message Types
Backend also sends these message types that need frontend handling:
- `type: 'connected'` ✅ (already handled)
- `type: 'output'` for non-terminal data ✅ (already handled by incremental system)
- `type: 'instance:status'` ❌ (not handled by frontend)

## COMPLETION PHASE - VERIFICATION STRATEGY 🎯

### Test Cases for Live Verification
1. **Incremental Output Test**: Send 10KB+ output, verify no duplication
2. **Position Tracking Test**: Verify `lastSentPosition` advances correctly
3. **Buffer Replay Test**: Disconnect/reconnect, verify buffered output sent once
4. **Message Type Test**: Verify frontend processes `terminal_output` messages

### Expected Behavior After Fix
1. Claude process stdout → backend buffers incrementally
2. Each SSE message contains only NEW output since last position
3. Frontend receives `terminal_output` messages with `data.output` property
4. No message duplication or buffer replay

## INTEGRATION GAP SUMMARY

**The incremental output system IS implemented and working correctly in backend.**
**The ONLY issue is a message type/property mismatch between backend and frontend.**

### Minimal Fix Required
- Change 2 lines in `simple-backend.js` line ~635
- Message type: `'output'` → `'terminal_output'`
- Property name: `data: newDataSlice` → `output: newDataSlice`

This explains why the user reported "SSE incremental output fix was implemented but NOT working" - the backend fix was correct, but the frontend was never receiving the messages due to type mismatch.

## RISK ASSESSMENT: LOW ✅
- Backend position tracking system is solid
- Frontend SSE handling is correct
- Only requires 2-line message format change
- No breaking changes to other components

---

**SPARC DEBUG CONCLUSION**: The bug is NOT in the incremental output logic itself, but in a simple message contract mismatch between backend and frontend. Fix deployment time: <5 minutes.