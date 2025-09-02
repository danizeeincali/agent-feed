# WebSocket Connection Fix & Migration Plan

## 🚨 CRITICAL ISSUE IDENTIFIED
**Problem**: Dual WebSocket management systems causing connection conflicts
**Error**: "Connection Error: Connection lost: Unknown error"
**Root Cause**: Two competing connection managers (legacy + new) fighting for control

---

## 🔧 OPTION 1: IMMEDIATE FIX (REVERT TO WORKING STATE)

### Step 1: Revert Backend to Last Working Commit
```bash
# This restores the PROVEN WORKING WebSocket implementation
git checkout 13ddedfa simple-backend.js
```

### Step 2: Restart the Backend
```bash
# Kill any running backend processes
pkill -f "node simple-backend.js" || true

# Start fresh backend
node simple-backend.js
```

### Step 3: Verify Fix
```bash
# Test WebSocket connection
curl -X POST http://localhost:3000/api/claude/instances \
  -H "Content-Type: application/json" \
  -d '{"type": "test"}'

# Should see stable connections without "Unknown error"
```

### Expected Result
✅ WebSocket connections remain stable
✅ No "Connection lost: Unknown error" messages
✅ Commands work without disconnections

---

## 🚀 OPTION 3: FUTURE MIGRATION (PROPER INTEGRATION)

### Phase 1: Stabilize Current System (Week 1)
1. Use Option 1 to restore stability
2. Document all current WebSocket behaviors
3. Create comprehensive test suite

### Phase 2: Design Unified System (Week 2)
1. Design single WebSocket manager architecture
2. Plan migration without dual systems
3. Create feature flags for gradual rollout

### Phase 3: Implement Carefully (Week 3-4)
1. Create new branch for migration
2. Remove ALL old WebSocket code
3. Implement single new manager
4. Extensive testing at each step

### Key Principles for Migration:
- **ONE system, not two**
- **Gradual rollout with feature flags**
- **Comprehensive testing at each stage**
- **Rollback plan at every step**

---

## 🎯 RECOMMENDED APPROACH

### Immediate (Today):
1. **Execute Option 1** - Revert to working state
2. Verify system stability
3. Document current working behavior

### Short Term (This Week):
1. Create test suite for current WebSocket behavior
2. Identify which "improvements" are actually needed
3. Plan careful integration without conflicts

### Long Term (Next Month):
1. Design proper single-manager architecture
2. Implement with feature flags
3. Gradual migration with testing

---

## ⚠️ WHAT NOT TO DO

### Avoid These Mistakes:
1. ❌ Don't add new managers on top of old ones
2. ❌ Don't change multiple timeout values simultaneously
3. ❌ Don't modify both frontend and backend at once
4. ❌ Don't skip testing after each change

### Why Previous Fixes Failed:
- Added complexity instead of removing it
- Created race conditions between managers
- Changed timeouts without addressing root cause
- Tested new connections but not existing ones

---

## 📊 VERIFICATION CHECKLIST

After applying Option 1, verify:

- [ ] Backend starts without errors
- [ ] WebSocket connections establish successfully
- [ ] No "Connection lost: Unknown error" in logs
- [ ] Commands like "what directory are you in?" work
- [ ] Connections remain stable for 5+ minutes
- [ ] Frontend polling stops (no repeated GET requests)
- [ ] Clean connection closure (code 1000/1001, not errors)

---

## 🔍 MONITORING COMMANDS

```bash
# Watch for connection errors in real-time
tail -f logs/combined.log | grep -E "Connection Error|Unknown error|ping timeout"

# Monitor WebSocket connections
watch -n 1 'netstat -an | grep :3000 | grep ESTABLISHED | wc -l'

# Check for dual management conflicts
grep -n "WebSocketConnectionManager\|wsConnections\|wsConnectionsBySocket" simple-backend.js

# Test stability over time
while true; do 
  curl -s http://localhost:3000/health | jq .websockets
  sleep 5
done
```

---

## 💡 LESSONS LEARNED

1. **Simple > Complex**: Original simple WebSocket worked fine
2. **One Manager**: Never run two connection managers
3. **Test Existing**: Test existing connections, not just new ones
4. **Incremental Changes**: Change one thing at a time
5. **Revert First**: When in doubt, revert to known working state

---

## 📞 SUPPORT NOTES

If issues persist after Option 1:
1. Check if any background processes are still running
2. Clear browser cache and cookies
3. Restart both frontend and backend
4. Check for uncommitted changes: `git status`
5. Verify you're on the right commit: `git log --oneline -1`

---

**Document Created**: December 2024
**Issue**: WebSocket Connection Drops
**Solution**: Revert to commit 13ddedfa
**File Location**: `/workspaces/agent-feed/WEBSOCKET_FIX_PLAN.md`