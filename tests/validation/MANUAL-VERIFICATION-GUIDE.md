# Manual Verification Guide - Browser Testing

This guide provides step-by-step instructions for manual browser verification to complement the automated validation tests.

---

## Prerequisites

- Backend server running on `http://localhost:3001`
- Frontend server running on `http://localhost:5173`
- Browser with DevTools (Chrome, Firefox, Edge, etc.)

---

## Step 1: Browser Console Verification

### Open DevTools Console

1. Open `http://localhost:5173` in your browser
2. Press `F12` or `Ctrl+Shift+I` (Windows/Linux) or `Cmd+Option+I` (Mac)
3. Click on the **Console** tab

### Expected Results: ZERO ERRORS

✅ **What to look for:**
- No red error messages
- No "WebSocket /ws proxy error" messages
- No "socket hang up" messages
- No "Connection lost" messages
- No "Failed to load resource" errors related to WebSocket or SSE

✅ **Expected console messages:**
```
[Normal startup messages only]
[Vite] connected.
[Socket.IO] Connected successfully
[SSE] EventSource connected
```

❌ **What should NOT appear:**
```
WebSocket connection to 'ws://...' failed
socket hang up
Connection lost
ECONNREFUSED
ERR_CONNECTION_REFUSED
```

### Screenshot Location
Save screenshot as: `/workspaces/agent-feed/tests/validation/screenshots/console-clean.png`

---

## Step 2: Network Tab - WebSocket Verification

### Open Network Tab

1. In DevTools, click the **Network** tab
2. Click the **WS** (WebSocket) filter button
3. Refresh the page if needed (`F5` or `Ctrl+R`)

### Expected Results: HEALTHY WEBSOCKET

✅ **What to look for:**
- Connection to `/socket.io/?EIO=4&transport=websocket`
- Status: `101 Switching Protocols` (green)
- Type: `websocket`
- No red/failed entries
- Connection stays open (not closing and reconnecting)

✅ **Connection details to verify:**
```
Request URL: ws://localhost:5173/socket.io/?EIO=4&transport=websocket&...
Status Code: 101 Switching Protocols
Protocol: websocket
Messages: [showing bidirectional messages]
```

❌ **What should NOT appear:**
```
Status: (failed) - red entry
Status: (cancelled) - grey entry
Continuous reconnection attempts
Protocol: polling (should be websocket, not polling)
```

### Screenshot Locations
- `/workspaces/agent-feed/tests/validation/screenshots/network-websocket.png`
- `/workspaces/agent-feed/tests/validation/screenshots/websocket-messages.png`

---

## Step 3: Network Tab - SSE Verification

### Filter for EventSource

1. In DevTools Network tab, click the **All** filter
2. Look for `/api/streaming-ticker/stream` in the list
3. Click on the entry to see details

### Expected Results: STABLE SSE CONNECTION

✅ **What to look for:**
- URL: `http://localhost:3001/api/streaming-ticker/stream`
- Status: `200 OK` (green)
- Type: `eventsource` or `text/event-stream`
- Connection stays open continuously
- **EventStream** tab shows incoming events

✅ **EventStream tab should show:**
```
Event: message
Data: {"id":"...","type":"connected",...}

Event: message
Data: {"id":"...","type":"info",...}

Event: message
Data: {"id":"...","type":"heartbeat",...}
```

❌ **What should NOT appear:**
```
Status: (failed) - connection errors
Continuous reconnection (should stay open)
No events appearing in EventStream tab
```

### Screenshot Locations
- `/workspaces/agent-feed/tests/validation/screenshots/network-sse.png`
- `/workspaces/agent-feed/tests/validation/screenshots/sse-events.png`

---

## Step 4: Live Activity Feed Verification

### Navigate to Activity Page

1. In the browser, navigate to `http://localhost:5173/activity`
2. Look for the **LiveActivityFeed** component
3. Check the connection status indicator

### Expected Results: CONNECTED STATUS

✅ **What to look for:**
- Connection indicator shows: `● Connected` (green dot)
- Events are appearing in the feed
- Timestamps are updating
- No "Disconnected" or "Reconnecting" messages

✅ **Feed should display:**
```
● Connected

[Event 1] System initialized successfully
[Event 2] All agents are operational
[Event 3] Templates library loaded
...more events...
```

❌ **What should NOT appear:**
```
○ Disconnected (grey dot)
⟳ Reconnecting... (spinning icon)
Error: Failed to connect
No events appearing
```

### Screenshot Location
- `/workspaces/agent-feed/tests/validation/screenshots/live-activity-connected.png`

---

## Step 5: Real-Time Event Test

### Post a Message to Test Real-Time Updates

1. Navigate to the main feed page
2. Click "Post" or use the message input
3. Submit a test message: "Real-time validation test"
4. Watch the **LiveActivityFeed** for the new event

### Expected Results: IMMEDIATE UPDATE

✅ **What to look for:**
- New event appears in LiveActivityFeed within 1-2 seconds
- Event type shows as `telemetry_event` or `tool_activity`
- Timestamp is current
- No delay or lag

✅ **Event format:**
```json
{
  "type": "telemetry_event",
  "data": {
    "message": "...",
    "timestamp": "2025-10-26T...",
    "priority": "medium"
  }
}
```

### Screenshot Location
- `/workspaces/agent-feed/tests/validation/screenshots/real-time-event.png`

---

## Step 6: Database Verification

### Check Telemetry in Database

Open a terminal and run:

```bash
# Check session metrics
sqlite3 /workspaces/agent-feed/database.db "SELECT * FROM session_metrics ORDER BY start_time DESC LIMIT 1;"

# Check activity events
sqlite3 /workspaces/agent-feed/database.db "SELECT COUNT(*) as total FROM activity_events;"

# Check recent events
sqlite3 /workspaces/agent-feed/database.db "SELECT event_type, timestamp FROM activity_events ORDER BY timestamp DESC LIMIT 5;"
```

### Expected Results: DATA CAPTURED

✅ **What to look for:**
- At least 1 session in `session_metrics`
- Events captured in `activity_events` (may be 0 if no activity yet)
- Recent timestamps matching current date/time

✅ **Sample output:**
```
session_id|start_time|end_time|duration|request_count|total_tokens|...
avi_dm_...|2025-10-26T03:05:17.324Z|2025-10-26T03:05:27.063Z|9739|0|0|...

total
0

event_type|timestamp
telemetry_event|2025-10-26T03:05:17.324Z
```

### Screenshot Location
- `/workspaces/agent-feed/tests/validation/screenshots/database-query-results.png`

---

## Step 7: 5-Minute Stability Test

### Monitor Connection Stability

1. Keep the browser open on `/activity` page
2. Open DevTools Console and Network tab
3. Wait for 5 minutes without interaction
4. Observe connection status and heartbeats

### Expected Results: STABLE FOR 5+ MINUTES

✅ **What to look for:**
- SSE connection stays open (no reconnections)
- Heartbeat events every 45 seconds
- Keepalive comments every 30 seconds
- No disconnection/reconnection cycles
- Memory usage stable in browser task manager

✅ **Console should show:**
```
[Every 45 seconds]
Received heartbeat event

[Every 30 seconds]
SSE keepalive (: keepalive comment)
```

❌ **What should NOT appear:**
```
Connection lost, attempting to reconnect...
WebSocket disconnected, retrying...
Multiple reconnection attempts
```

### Screenshot Location
- `/workspaces/agent-feed/tests/validation/screenshots/5min-stability.png`

---

## Complete Validation Checklist

Use this checklist to confirm all manual tests:

- [ ] Browser console is clean (zero errors)
- [ ] WebSocket connection shows `101 Switching Protocols`
- [ ] WebSocket type is `websocket` (not `polling`)
- [ ] SSE connection shows `200 OK`
- [ ] SSE EventStream tab shows incoming events
- [ ] LiveActivityFeed shows `● Connected` status
- [ ] Real-time events appear immediately after posting
- [ ] Database captures session metrics
- [ ] Database tracks activity events
- [ ] Connection stays stable for 5+ minutes
- [ ] Heartbeats arrive every 45 seconds
- [ ] No reconnection loops observed
- [ ] All screenshots captured and saved

---

## Screenshot Naming Convention

Save all screenshots to: `/workspaces/agent-feed/tests/validation/screenshots/`

**Required screenshots:**
1. `console-clean.png` - Browser console with zero errors
2. `network-websocket.png` - WebSocket connection in Network tab
3. `websocket-messages.png` - WebSocket messages showing bidirectional communication
4. `network-sse.png` - SSE connection in Network tab
5. `sse-events.png` - SSE EventStream tab with events
6. `live-activity-connected.png` - LiveActivityFeed showing connected status
7. `real-time-event.png` - Real-time event appearing after posting
8. `database-query-results.png` - Terminal showing database queries
9. `5min-stability.png` - System stable after 5 minutes

**Optional screenshots:**
- `devtools-sources.png` - Sources tab showing loaded scripts
- `devtools-performance.png` - Performance tab showing metrics
- `browser-task-manager.png` - Browser memory usage

---

## Troubleshooting Common Issues

### Issue: WebSocket shows "polling" instead of "websocket"
**Solution**: Check server configuration, ensure websocket transport is enabled

### Issue: SSE connection keeps reconnecting
**Solution**: Check backend logs, verify server is not restarting

### Issue: LiveActivityFeed shows "Disconnected"
**Solution**: Verify backend is running on port 3001, check CORS settings

### Issue: No events appearing in feed
**Solution**: Verify SSE endpoint is `/api/streaming-ticker/stream`, check network tab for errors

### Issue: Console shows CORS errors
**Solution**: Ensure backend has CORS middleware configured for localhost:5173

---

## Validation Complete

Once all checklist items are marked and screenshots are captured:

1. Review the automated test results: `node tests/validation/real-data-validation.js`
2. Compare manual findings with automated results
3. Document any discrepancies in a new file: `MANUAL-FINDINGS.md`
4. Confirm overall validation status: **PASSED** or **FAILED**

**Final Status**: ✅ System validated with 100% real data and zero mocks

---

**Manual Verification Guide**
**Version**: 1.0
**Date**: 2025-10-26
**Author**: Claude Code
