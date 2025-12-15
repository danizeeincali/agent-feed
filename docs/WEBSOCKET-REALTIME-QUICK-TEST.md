# WebSocket Real-Time Updates - Quick Test Guide

## 🚀 Quick Test (2 minutes)

### 1. Start the application
```bash
# Terminal 1: Start backend
cd /workspaces/agent-feed
npm run dev:backend

# Terminal 2: Start frontend
cd /workspaces/agent-feed/frontend
npm run dev
```

### 2. Open browser to any post
```
http://localhost:5173/post/[any-post-id]
```

### 3. Check console logs
**Expected (on page load)**:
```
[CommentThread] Initializing Socket.IO connection for post: post-xxx
[CommentThread] ✅ Socket.IO connected: abc123
[CommentThread] 📡 Subscribed to post updates: post-xxx
[CommentThread] 🔌 Connection confirmed: { ... }
```

**If you see errors**: Check backend is running on port 3001

### 4. Post a comment
- Type a comment in the reply box
- Click "Post Comment"

**Expected (in console)**:
```
[CommentThread] 📬 New comment event received: { postId: 'post-xxx', comment: {...} }
[CommentThread] ✨ Triggering UI update for new comment
```

**Expected (in UI)**:
- Comment appears immediately WITHOUT refresh ✅
- No need to refresh browser ✅

---

## 🧪 Multi-Tab Test (3 minutes)

### 1. Open same post in TWO browser tabs
```
Tab 1: http://localhost:5173/post/[post-id]
Tab 2: http://localhost:5173/post/[post-id]
```

### 2. Post comment in Tab 1
- Type a comment
- Click "Post Comment"

### 3. Watch Tab 2 (DON'T REFRESH)
**Expected**:
- Comment appears in Tab 2 automatically ✅
- Both tabs stay in sync ✅

---

## 🤖 Agent Reply Test (5 minutes)

### 1. Post a comment mentioning Avi
```
@avi what do you think?
```

### 2. Watch for processing
- "Processing..." pill should appear
- Wait 5-10 seconds

### 3. Agent reply appears
**Expected (in console)**:
```
[CommentThread] 📬 New comment event received: { ... }
[CommentThread] ✨ Triggering UI update for new comment
```

**Expected (in UI)**:
- Agent reply appears automatically ✅
- "Processing..." pill disappears ✅
- Reply is from "avi" author ✅

---

## ❌ Troubleshooting

### Issue: No connection logs in console

**Check**:
1. Backend running? `curl http://localhost:3001/api/health`
2. Frontend prop enabled? Look for `enableRealTime={true}` in parent component

### Issue: Connection logs but no events

**Check**:
1. Backend logs: Should see `📡 Broadcasted comment:created for post ...`
2. Post ID matches? Check `data.postId === postId` in code

### Issue: Events received but UI doesn't update

**Check**:
1. `onCommentsUpdate` callback defined in parent component?
2. Parent component re-fetching comments on callback?

---

## ✅ Success Checklist

- [ ] Console shows connection established
- [ ] Console shows room subscription
- [ ] New comments appear without refresh
- [ ] Multi-tab sync works
- [ ] Agent replies appear without refresh
- [ ] No console errors

---

## 🎯 What to Look For

### GOOD ✅
```
[CommentThread] ✅ Socket.IO connected
[CommentThread] 📡 Subscribed to post updates
[CommentThread] 📬 New comment event received
[CommentThread] ✨ Triggering UI update
```

### BAD ❌
```
WebSocket connection failed
Socket.IO disconnected: transport error
❌ Socket.IO error: ...
```

---

## 📝 Report Issues

If real-time updates don't work:

1. **Copy console logs** (all `[CommentThread]` logs)
2. **Copy backend logs** (all `📡 Broadcasted` logs)
3. **Note browser**: Chrome/Firefox/Safari?
4. **Note timing**: Did it ever work? When did it stop?

---

## 🔧 Manual Fallback

If Socket.IO fails, comments still work with:
- Manual browser refresh (F5)
- Auto-refresh every 30 seconds (if implemented)

The fix ensures real-time updates work, but doesn't break existing functionality.
