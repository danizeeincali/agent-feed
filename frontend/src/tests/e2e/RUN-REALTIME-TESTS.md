# Quick Start: Run Real-Time Comment Tests

## 🚀 Prerequisites Check

Before running tests, ensure:

### 1. Backend Running ✅
```bash
# Terminal 1: Start API server
cd /workspaces/agent-feed/api-server
npm run dev
# Should see: "Server running on port 3001"
```

### 2. Frontend Running ✅
```bash
# Terminal 2: Start frontend
cd /workspaces/agent-feed/frontend
npm run dev
# Should see: "Local: http://localhost:5173"
```

### 3. Database Ready ✅
```bash
# Verify database is running and accessible
# PostgreSQL should be running
```

## 🧪 Run Tests (Quick Commands)

### Run ALL Tests (Recommended First Run)
```bash
cd /workspaces/agent-feed/frontend
npm run test:e2e:realtime
```

### Run with Browser Visible (Debug Issues)
```bash
npm run test:e2e:realtime:headed
```

### Run with Playwright Inspector (Step Through)
```bash
npm run test:e2e:realtime:debug
```

## 📊 Expected Results

When all tests pass, you should see:

```
✅ Test 1: comment counter increments when new comment added (10-15s)
✅ Test 2: toast notification shows when comment added (10-15s)
✅ Test 3: new comment appears immediately without refresh (15-20s)
✅ Test 4: avi response renders with markdown formatting (15-20s)
✅ Test 5: handles multiple rapid comments via WebSocket (25-30s)
✅ Test 6: recovers from temporary WebSocket disconnection (20-25s)
✅ Database Validation: UI comment count matches database count (5-10s)

Total: 7 tests, 7 passed (100-120s total)
```

## 📸 Screenshots Generated

After tests complete, check:

```bash
ls -la /workspaces/agent-feed/frontend/src/tests/e2e/screenshots/

# Should see:
test1-counter-update-SUCCESS.png
test2-toast-notification-SUCCESS.png
test3-comment-appears-SUCCESS.png
test4-markdown-rendering-SUCCESS.png
test5-stress-test-SUCCESS.png
```

## 🐛 Troubleshooting

### Backend Not Running
```
Error: Failed to create comment: ECONNREFUSED
```
**Solution:** Start backend server on port 3001

### Frontend Not Running
```
Error: page.goto: net::ERR_CONNECTION_REFUSED
```
**Solution:** Start frontend on port 5173

### WebSocket Not Connecting
```
Warning: WebSocket connection not confirmed in logs
```
**Solution:** Check Socket.IO server is running and CORS is configured

### Tests Timing Out
```
Error: Timeout 60000ms exceeded
```
**Solution:**
- Check backend is processing requests
- Verify database is accessible
- Run in headed mode to see what's happening

## 📝 Test Coverage Summary

| Test | Validates | Success Criteria |
|------|-----------|-----------------|
| Test 1 | Counter updates in real-time | Counter increments without refresh |
| Test 2 | Toast notification | Toast appears and auto-dismisses |
| Test 3 | Comment appears | New comment visible without refresh |
| Test 4 | Markdown rendering | Avi response has formatted markdown |
| Test 5 | Multiple comments | All 5 comments appear correctly |
| Test 6 | Connection recovery | Works after disconnection |
| DB Test | State consistency | UI matches database state |

## 🔍 View Detailed Results

### HTML Report
```bash
# After tests complete
npx playwright show-report
```

### Individual Test Logs
```bash
# Test 1 only
npx playwright test comment-realtime-flow.spec.ts --grep "comment counter"

# Test 2 only
npx playwright test comment-realtime-flow.spec.ts --grep "toast notification"

# And so on...
```

## ✅ Success Checklist

- [ ] Backend server running (port 3001)
- [ ] Frontend server running (port 5173)
- [ ] Database accessible
- [ ] All 7 tests passing
- [ ] 5 screenshots generated
- [ ] No timeout errors
- [ ] WebSocket connection confirmed
- [ ] No console errors

## 📚 Full Documentation

See `comment-realtime-flow.README.md` for:
- Detailed test descriptions
- API endpoints used
- WebSocket events monitored
- Debugging strategies
- CI/CD integration
- Performance expectations

## 🎯 What These Tests Validate

**NO MOCKS - 100% Real Production Behavior:**

✅ Real backend API calls
✅ Real WebSocket connections
✅ Real database operations
✅ Real-time event propagation
✅ Real markdown rendering
✅ Real toast notifications
✅ Real state management
✅ Real DOM updates
✅ Real network recovery

**This is production validation, not unit testing!**

## 🚨 Common Issues & Solutions

### Issue: "Cannot find post"
**Cause:** Feed has no posts
**Solution:** Create a test post via UI or API first

### Issue: "Avi not responding"
**Cause:** Avi agent service not running
**Solution:** Check agent worker is running

### Issue: "Markdown not rendering"
**Cause:** Markdown processor not configured
**Solution:** Verify rehype plugins in `CommentSystem.tsx`

### Issue: "Toast not appearing"
**Cause:** Toast provider not initialized
**Solution:** Check `useToast` hook and toast container

## 📞 Need Help?

1. Run tests in debug mode: `npm run test:e2e:realtime:debug`
2. Check backend logs for API errors
3. Check browser console for WebSocket errors
4. Review screenshots for visual clues
5. Read full documentation in `comment-realtime-flow.README.md`

---

**Happy Testing! 🎉**

Remember: These tests validate REAL production behavior, not mocked functionality!
