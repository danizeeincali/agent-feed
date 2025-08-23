# Manual Browser Testing Instructions

## 🧪 Quick Launch Functionality Manual Test

### Prerequisites
✅ Test server running on port 3001  
✅ Frontend built and deployed  
✅ WebSocket server responding correctly  

### Test Steps

#### 1. Navigate to Dashboard
1. Open browser to: `http://localhost:3001/dual-instance`
2. **Expected**: Page loads without errors
3. **Expected**: Dashboard UI elements visible

#### 2. UI Responsiveness Check
1. Look for interactive elements (buttons, inputs, etc.)
2. Hover over buttons to test responsiveness
3. **Expected**: UI elements respond to mouse interactions

#### 3. Quick Launch Button Test
1. Look for "Quick Launch", "Launch", or "Start" button
2. Click the button
3. **Expected**: Button responds to click
4. **Expected**: UI shows "Launching..." or similar status

#### 4. Monitor Console Output
**In Test Server Console, you should see:**
```
🔌 Client connected: [socket-id]
📨 Received process:launch event [data]
✅ Process launched successfully: {
  pid: [number],
  name: 'claude-instance', 
  status: 'running',
  startTime: '[timestamp]',
  directory: '/workspaces/agent-feed/prod'
}
```

#### 5. Process Status Verification
1. After clicking launch, wait 2-3 seconds
2. **Expected**: UI updates to show "Running" status
3. **Expected**: Process PID displayed (e.g., "PID: 2603")
4. **Expected**: Green indicator or "Active" status

#### 6. Stop/Restart Testing
1. Look for "Stop", "Kill", or "Terminate" button
2. Click the stop button
3. **Expected**: Process status changes to "Stopped" or "Idle"
4. **Expected**: Console shows process kill event

#### 7. Edge Case Testing
1. Try clicking launch multiple times quickly
2. Test with network interruption (disconnect WiFi briefly)
3. Refresh page and test again

### ✅ Success Criteria

**All of these should work:**
- ✅ Page loads successfully
- ✅ WebSocket connection established  
- ✅ Quick Launch button responds to clicks
- ✅ Process launch events sent via WebSocket
- ✅ Server receives and processes launch commands
- ✅ UI updates with process status
- ✅ PID generation and display
- ✅ Stop functionality works
- ✅ Console shows proper event flow

### 🐛 Common Issues & Solutions

**Issue**: Page won't load
- **Solution**: Check if server is running on port 3001
- **Check**: `curl http://localhost:3001/health`

**Issue**: WebSocket not connecting  
- **Solution**: Check browser console for WebSocket errors
- **Solution**: Verify CORS settings allow localhost connections

**Issue**: Button doesn't respond
- **Solution**: Check for JavaScript errors in browser console
- **Solution**: Verify button has proper event handlers

**Issue**: No process launch events
- **Solution**: Check WebSocket connection in browser dev tools
- **Solution**: Verify server is logging received events

### 📊 Test Results Format

Document results as:

```
✅ Navigation: PASS - Page loaded successfully
✅ UI Responsiveness: PASS - Buttons respond to interactions  
✅ WebSocket Connection: PASS - Connected successfully
✅ Quick Launch Click: PASS - Button responded to click
✅ Process Launch Event: PASS - Server received launch command
✅ Status Update: PASS - UI showed launching/running status
✅ PID Generation: PASS - Process PID displayed: 2603
✅ Stop Functionality: PASS - Stop button worked correctly
```

### 🚀 Advanced Testing

For thorough validation:

1. **Performance Test**: Click launch button multiple times rapidly
2. **Network Test**: Disconnect/reconnect network during process
3. **Browser Test**: Test in different browsers (Chrome, Firefox, Safari)
4. **Mobile Test**: Test on mobile device/responsive mode
5. **Concurrent Test**: Open multiple tabs and test simultaneously