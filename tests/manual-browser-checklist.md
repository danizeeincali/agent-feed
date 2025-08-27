# Manual Browser Testing Checklist

## Production Validation - Complete E2E Workflow Testing

**Target URL:** http://localhost:5173/claude-instances

### Pre-Testing Setup
- [ ] Frontend server running on http://localhost:5173
- [ ] Backend server running on http://localhost:3000  
- [ ] Health check passes: `curl http://localhost:3000/health`
- [ ] Browser developer tools open (Network + Console tabs)

---

## Primary Test: 4 Instance Creation Buttons

### Button 1: 🚀 prod/claude
- [ ] **Click button** → Instance creation initiated
- [ ] **Creation time** < 2 seconds
- [ ] **Terminal connects automatically** to NEW instance
- [ ] **Terminal output visible** within 500ms
- [ ] **Instance ID shown** is NOT "claude-2426"
- [ ] **No hanging "Connecting to terminal stream..."** message
- [ ] **Instance appears** in instances list with "running" status

### Button 2: ⚡ skip-permissions  
- [ ] **Click button** → Instance creation initiated
- [ ] **Creation time** < 2 seconds
- [ ] **Terminal connects automatically** to NEW instance
- [ ] **Terminal output visible** within 500ms
- [ ] **Instance ID shown** is NOT "claude-2426"
- [ ] **No hanging "Connecting to terminal stream..."** message
- [ ] **Instance appears** in instances list with "running" status

### Button 3: ⚡ skip-permissions -c
- [ ] **Click button** → Instance creation initiated
- [ ] **Creation time** < 2 seconds
- [ ] **Terminal connects automatically** to NEW instance
- [ ] **Terminal output visible** within 500ms
- [ ] **Instance ID shown** is NOT "claude-2426"
- [ ] **No hanging "Connecting to terminal stream..."** message
- [ ] **Instance appears** in instances list with "running" status

### Button 4: ↻ skip-permissions --resume
- [ ] **Click button** → Instance creation initiated
- [ ] **Creation time** < 2 seconds
- [ ] **Terminal connects automatically** to NEW instance
- [ ] **Terminal output visible** within 500ms
- [ ] **Instance ID shown** is NOT "claude-2426"
- [ ] **No hanging "Connecting to terminal stream..."** message
- [ ] **Instance appears** in instances list with "running" status

---

## State Management Verification

### Instance Selection & Terminal Sync
- [ ] **selectedInstance state** updates to new instance ID
- [ ] **Terminal component** receives correct new instance ID
- [ ] **SSE connection** targets correct `/api/v1/claude/instances/{NEW_ID}/terminal/stream`
- [ ] **Old connections** properly closed before new ones
- [ ] **Terminal output** shows content from correct instance

### UI State Consistency
- [ ] **Selected instance** highlighted in instances list
- [ ] **Terminal header** shows correct instance ID/name
- [ ] **Connection status** shows "Connected" (not error states)
- [ ] **Instance count** updates correctly in header

---

## Error Scenarios & Recovery

### Connection Failure Testing
- [ ] **Disconnect network** → Graceful fallback to polling mode
- [ ] **Reconnect network** → SSE connection recovers automatically
- [ ] **Server restart** → Client reconnects to correct instance
- [ ] **Invalid instance ID** → Error handled gracefully

### Recovery Verification  
- [ ] **Reconnection attempts** use correct new instance ID (not claude-2426)
- [ ] **Error messages** clear and actionable
- [ ] **No infinite loading** states
- [ ] **Fallback polling** works when SSE fails

---

## Performance Benchmarks

### Response Time Requirements
- [ ] **Instance creation** completes < 2000ms
- [ ] **Terminal connection** establishes < 1000ms  
- [ ] **First output display** appears < 500ms
- [ ] **Total workflow** completes < 3000ms

### Connection Stability (60+ seconds)
- [ ] **SSE connection** remains stable for 60+ seconds
- [ ] **Terminal output** continues updating (no drops)
- [ ] **No console errors** related to connection drops
- [ ] **Memory usage** remains stable (no leaks)

---

## Browser Console Verification

### No Critical Errors
- [ ] **No console errors** during instance creation
- [ ] **No SSE connection errors** after initial connection
- [ ] **No WebSocket errors** (should be eliminated)
- [ ] **No memory leak warnings**

### Successful Debug Messages
- [ ] ✅ "SSE connection established" 
- [ ] ✅ "Claude instance created: claude-XXXX"
- [ ] ✅ "Started SSE streaming for instance: claude-XXXX"
- [ ] ✅ Terminal output flowing continuously

---

## Network Tab Verification

### API Calls Success
- [ ] **POST /api/claude/instances** → 201 Created
- [ ] **GET /api/claude/instances** → 200 OK with instance list
- [ ] **EventSource /api/v1/claude/instances/{id}/terminal/stream** → Connected
- [ ] **POST /api/claude/instances/{id}/terminal/input** → 200 OK (if tested)

### SSE Connection Health
- [ ] **EventSource connection** shows as active/persistent
- [ ] **Regular SSE messages** flowing (data events)
- [ ] **No connection drops** or reconnections
- [ ] **Proper CORS headers** on SSE responses

---

## Critical Success Criteria

### 🎯 Primary Goals
1. **100% button success rate** - All 4 buttons create and connect successfully
2. **0% claude-2426 connections** - Terminal never connects to old instance  
3. **100% SSE stability** - No connection drops during testing
4. **0 hanging states** - No "Connecting to terminal stream..." locks

### 🚨 Failure Indicators  
- ❌ Terminal connects to "claude-2426" instead of new instance
- ❌ "Connecting to terminal stream..." message persists > 3 seconds
- ❌ Console errors related to SSE connections  
- ❌ Instance creation takes > 2 seconds
- ❌ Terminal output not visible within 500ms

---

## Test Results Documentation

### Instance Creation Results
| Button | Instance ID | Creation Time | Connection Time | First Output | Success |
|--------|------------|---------------|-----------------|--------------|---------|
| prod/claude | claude-____ | ___ms | ___ms | ___ms | ✅/❌ |
| skip-permissions | claude-____ | ___ms | ___ms | ___ms | ✅/❌ |
| skip-permissions -c | claude-____ | ___ms | ___ms | ___ms | ✅/❌ |
| skip-permissions --resume | claude-____ | ___ms | ___ms | ___ms | ✅/❌ |

### Overall Assessment
- **Total Success Rate:** ___% (___/4 buttons working)
- **Critical Issues Found:** ___
- **Performance Compliance:** ✅/❌
- **Production Readiness:** ✅/❌

### Issues Log
1. ________________________________
2. ________________________________  
3. ________________________________
4. ________________________________

### Recommendations
- ________________________________
- ________________________________
- ________________________________

---

**Test Conducted By:** ________________  
**Date/Time:** ________________  
**Browser:** ________________  
**Frontend Version:** 2.0.0  
**Backend Version:** HTTP/SSE Only