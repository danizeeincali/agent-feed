# WebSocket Badge Updates - Testing Guide

## Quick Start

### 1. Start the Development Server
```bash
cd /workspaces/agent-feed/frontend
npm run dev
```

### 2. Open Browser Console
- Press F12 to open Developer Tools
- Go to "Console" tab
- Keep it open during testing

---

## Test Scenario 1: Real-Time Badge Updates

### Steps:
1. **Navigate to feed**: http://localhost:5173
2. **Create a new post with URL**:
   ```
   Title: Test URL Analysis
   Content: Check out this link: https://github.com/anthropics/claude
   ```
3. **Submit the post**

### Expected Console Output:
```
🎫 Ticket status update: {
  post_id: "abc123...",
  status: "pending",
  ticket_id: "ticket-xyz",
  agent: "LinkLogger"
}

🎫 Ticket status update: {
  post_id: "abc123...",
  status: "processing",
  ticket_id: "ticket-xyz",
  agent: "LinkLogger"
}

🎫 Ticket status update: {
  post_id: "abc123...",
  status: "completed",
  ticket_id: "ticket-xyz",
  agent: "LinkLogger"
}

🔄 RealSocialMediaFeed: loadPosts called { pageNum: 0, append: false, filterType: 'all' }
```

### Expected UI Behavior:
1. **Initial state**: Badge shows "analyzing" (gray spinner)
2. **After ~2s**: Badge shows "processing" (yellow)
3. **After ~10s**: Badge shows "completed" (green checkmark)
4. **Automatic refresh**: Feed reloads 500ms after completion

### Badge Visual States:
- **Analyzing**: Gray background, rotating spinner icon
- **Processing**: Yellow background, clock icon
- **Completed**: Green background, checkmark icon
- **Failed**: Red background, X icon

---

## Test Scenario 2: Manual Refresh

### Steps:
1. **Locate refresh button**: Top right corner of feed
2. **Click "Refresh" button**

### Expected Console Output:
```
🔄 Refreshing feed...
🔄 RealSocialMediaFeed: loadPosts called { pageNum: 0, append: false, filterType: 'all' }
🔄 Calling apiService.getAgentPosts...
📦 Raw API response: { success: true, data: [...], total: X }
✅ Feed refreshed successfully
```

### Expected UI Behavior:
1. **Button shows spinner**: RefreshCw icon spins
2. **Button disabled**: Can't click while refreshing
3. **Posts reload**: Feed updates with latest data
4. **Spinner stops**: Button re-enabled

---

## Test Scenario 3: Multiple Tickets

### Steps:
1. **Create post with multiple URLs**:
   ```
   Title: Multiple Link Analysis
   Content: Check these out:
   - https://github.com
   - https://npmjs.com
   - https://typescriptlang.org
   ```
2. **Submit and watch**

### Expected Behavior:
- Badge shows total ticket count (e.g., "3 tickets")
- Badge color reflects overall status:
  - All pending → Gray
  - Any processing → Yellow
  - All completed → Green
  - Any failed → Red
- Multiple `🎫 Ticket status update` messages in console

---

## Test Scenario 4: Error Handling

### Setup:
1. **Stop the API server**:
   ```bash
   # In another terminal
   cd /workspaces/agent-feed/api-server
   # Press Ctrl+C to stop
   ```

### Steps:
2. **Click refresh button**

### Expected Console Output:
```
🔄 Refreshing feed...
❌ Refresh failed: Error: Network request failed
```

### Expected UI Behavior:
- Error message appears at top of feed
- Refresh button re-enabled (not stuck in loading state)
- Existing posts remain visible

---

## Debugging Tips

### Check WebSocket Connection
Open browser console and run:
```javascript
// Check if WebSocket is connected
console.log(window.__websocket_status);
```

### Manually Trigger Event
For testing, you can manually emit an event:
```javascript
// Simulate a ticket status update
const event = {
  post_id: "your-post-id-here",
  status: "completed",
  ticket_id: "test-ticket",
  agent: "LinkLogger"
};

// This should trigger the handler
window.dispatchEvent(new CustomEvent('ticket:status:update', { detail: event }));
```

### Check Event Listeners
```javascript
// See all registered listeners (in apiService)
console.log(window.__websocket_listeners);
```

---

## Common Issues

### Issue 1: No Console Messages
**Problem**: No `🎫 Ticket status update` messages appear

**Solutions**:
1. Check WebSocket connection is active
2. Verify backend is emitting events
3. Check apiService event listener registration
4. Look for console errors about event handlers

### Issue 2: Badge Not Updating
**Problem**: Console shows events but badge doesn't change

**Solutions**:
1. Check `post_id` in event matches actual post ID
2. Verify TicketStatusBadge component is rendered
3. Check React DevTools for state updates
4. Look for `_ticketUpdate` property in post data

### Issue 3: Refresh Button Stuck
**Problem**: Refresh button spinner never stops

**Solutions**:
1. Check for JavaScript errors in console
2. Verify `loadPosts` completes successfully
3. Check network tab for API failures
4. Clear browser cache and reload

### Issue 4: Duplicate Refreshes
**Problem**: Feed refreshes multiple times

**Solutions**:
1. Check for duplicate event listeners
2. Verify cleanup function runs on unmount
3. Check for multiple WebSocket connections
4. Look for race conditions in useEffect

---

## Performance Monitoring

### Check Re-render Count
Add to component:
```typescript
useEffect(() => {
  console.log('🔄 RealSocialMediaFeed re-rendered', { postsCount: posts.length });
});
```

### Monitor WebSocket Events
```typescript
// Add to useEffect
apiService.on('*', (event, data) => {
  console.log('📡 WebSocket event:', event, data);
});
```

---

## Success Indicators

✅ Console shows `🎫 Ticket status update:` messages
✅ Badge color transitions: gray → yellow → green
✅ Refresh button works without errors
✅ Automatic refresh after ticket completion
✅ No duplicate event listeners
✅ No memory leaks (event cleanup works)
✅ Smooth UI updates (no flashing)

---

## Next Steps After Testing

1. **If all tests pass**:
   - Mark implementation as complete
   - Update production validation report
   - Deploy to staging environment

2. **If issues found**:
   - Document specific failures in console
   - Check backend event emission
   - Verify apiService implementation
   - Review WebSocket connection stability

---

## Related Files

- **Implementation**: `/workspaces/agent-feed/frontend/src/components/RealSocialMediaFeed.tsx`
- **Badge Component**: `/workspaces/agent-feed/frontend/src/components/TicketStatusBadge.jsx`
- **API Service**: `/workspaces/agent-feed/frontend/src/services/api.ts`
- **Hook**: `/workspaces/agent-feed/frontend/src/hooks/useTicketUpdates.js`

---

## Questions?

Check these resources:
1. WebSocket documentation in `/workspaces/agent-feed/api-server/docs/WEBSOCKET-INTEGRATION.md`
2. Ticket status API docs in `/workspaces/agent-feed/api-server/docs/TICKET-STATUS-API.md`
3. Implementation report in `/workspaces/agent-feed/WEBSOCKET-BADGE-FIX-IMPLEMENTATION.md`
