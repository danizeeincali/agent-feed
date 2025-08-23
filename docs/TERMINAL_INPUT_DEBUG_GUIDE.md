# Terminal Input Debug Guide

This guide provides comprehensive debugging tools to identify why terminal input isn't working. The issue could be in multiple layers of the system.

## 🔍 Debugging Strategy

### Layer 1: XTerm.js Keyboard Capture
**Test**: Isolated xterm.js functionality
**Tool**: `debug-xterm-test.html`
**Purpose**: Verify xterm.js can capture keyboard events

### Layer 2: React Component Integration  
**Test**: React component with extensive logging
**Tool**: `TerminalDebugTest` component
**Purpose**: Test React lifecycle and state management

### Layer 3: WebSocket Communication
**Test**: Backend WebSocket server
**Tool**: `debug-terminal-backend.js`
**Purpose**: Verify WebSocket message flow

## 🛠️ Debug Tools Overview

### 1. XTerm.js Isolation Test (`debug-xterm-test.html`)

**Location**: `/workspaces/agent-feed/debug-xterm-test.html`

**How to use**:
```bash
# Open in browser
open debug-xterm-test.html
# OR serve via HTTP server
python3 -m http.server 8080
# Then open: http://localhost:8080/debug-xterm-test.html
```

**What it tests**:
- ✅ XTerm.js library loading
- ✅ Terminal initialization
- ✅ Keyboard event capture (onData)
- ✅ Focus management
- ✅ Character encoding
- ✅ Event bubbling

**Expected behavior**:
- Every keystroke increments counters
- Focus state changes when clicking in/out
- Special keys (Enter, Backspace, Ctrl+C) are logged correctly
- Console shows detailed event information

### 2. React Component Debug (`/terminal-debug`)

**Location**: Frontend route `/terminal-debug`

**How to use**:
```bash
cd frontend
npm start
# Navigate to http://localhost:3000/terminal-debug
```

**What it tests**:
- ✅ React component lifecycle
- ✅ useEffect hooks
- ✅ WebSocket connection
- ✅ State management
- ✅ Event handler registration
- ✅ Component re-rendering

**Features**:
- Real-time debug logs panel
- Connection status monitoring
- Keyboard event counting
- Manual focus testing
- WebSocket message tracking

### 3. Backend WebSocket Server (`debug-terminal-backend.js`)

**Location**: `/workspaces/agent-feed/debug-terminal-backend.js`

**How to use**:
```bash
node debug-terminal-backend.js
```

**What it provides**:
- Socket.IO server on port 3001
- `/terminal` namespace
- Complete message logging
- Process management
- Connection tracking

**Expected output**:
```
[2024-01-01T12:00:00.000Z] [SERVER] Debug terminal server running on http://localhost:3001
[2024-01-01T12:00:00.000Z] [CONNECTION] New terminal connection established
[2024-01-01T12:00:00.000Z] [INPUT] Received message from client
```

## 📋 Step-by-Step Debugging Process

### Step 1: Test XTerm.js in Isolation

1. **Open the test page**:
   ```bash
   open debug-xterm-test.html
   ```

2. **Run the test sequence**:
   - Click "Initialize Terminal"
   - Click in terminal area
   - Type some characters
   - Try special keys (Enter, Backspace, Ctrl+C)
   - Use "Test Keyboard" button

3. **Check for issues**:
   - ❌ **No terminal visible**: XTerm.js library not loaded
   - ❌ **No key events**: onData handler not working
   - ❌ **Focus problems**: CSS or event handling issues
   - ❌ **Character garbling**: Encoding problems

### Step 2: Test React Component

1. **Start the frontend**:
   ```bash
   cd frontend && npm start
   ```

2. **Navigate to debug page**:
   ```
   http://localhost:3000/terminal-debug
   ```

3. **Check the debug panel**:
   - Monitor real-time logs
   - Verify terminal initialization
   - Check keyboard event counts
   - Test focus management

4. **Look for issues**:
   - ❌ **Component not mounting**: React lifecycle issues
   - ❌ **State not updating**: useState/useEffect problems
   - ❌ **WebSocket errors**: Connection or configuration issues

### Step 3: Test Backend Communication

1. **Start debug server**:
   ```bash
   node debug-terminal-backend.js
   ```

2. **Verify server startup**:
   ```
   🚀 Ready for frontend connections!
   📍 Frontend should connect to: ws://localhost:3001/terminal
   ```

3. **Test with frontend**:
   - Refresh the `/terminal-debug` page
   - Check connection status
   - Type in terminal
   - Monitor server console logs

4. **Check for issues**:
   - ❌ **Connection refused**: Server not running or port blocked
   - ❌ **CORS errors**: Cross-origin policy issues
   - ❌ **No message logs**: Socket events not firing

## 🚨 Common Issues and Solutions

### Issue 1: XTerm.js Not Loading
**Symptoms**: Terminal container is empty or shows errors
**Solution**: Check CDN links, network connectivity, or bundle dependencies

### Issue 2: No Keyboard Events
**Symptoms**: Typing doesn't trigger any logs
**Causes**:
- Terminal not focused
- Event handlers not registered
- CSS preventing clicks
- JavaScript errors

**Solution**: 
```javascript
// Ensure terminal is focused
terminal.focus();

// Verify onData handler is registered
terminal.onData((data) => {
  console.log('Key pressed:', data);
});
```

### Issue 3: WebSocket Connection Fails
**Symptoms**: Status shows "Disconnected", console errors
**Causes**:
- Backend server not running
- Port 3001 not available
- CORS policy blocking connection
- Firewall or proxy issues

**Solution**:
```bash
# Check if port is in use
lsof -i :3001

# Start debug server
node debug-terminal-backend.js

# Check browser network tab for WebSocket errors
```

### Issue 4: Focus Problems
**Symptoms**: Terminal doesn't respond to clicks
**Causes**:
- CSS z-index issues
- Event propagation problems
- Container sizing issues

**Solution**:
```css
.terminal-container {
  position: relative;
  z-index: 1;
  cursor: text;
}
```

### Issue 5: Character Encoding Issues
**Symptoms**: Special characters display incorrectly
**Solution**: Verify UTF-8 encoding and proper escape sequences

## 🔧 Advanced Debugging

### Browser Developer Tools

1. **Console Tab**: Check for JavaScript errors
2. **Network Tab**: Monitor WebSocket connection
3. **Elements Tab**: Inspect terminal DOM structure
4. **Application Tab**: Check for service worker issues

### Useful Console Commands

```javascript
// Check if xterm is loaded
console.log(typeof Terminal);

// Inspect terminal instance
console.log(terminal);

// Test manual input
terminal.onData('test');

// Check focus state
console.log(document.activeElement);
```

### Network Debugging

```bash
# Check WebSocket connection
curl -i -N -H "Connection: Upgrade" \
     -H "Upgrade: websocket" \
     -H "Host: localhost:3001" \
     -H "Origin: http://localhost:3000" \
     http://localhost:3001/socket.io/

# Monitor port activity
netstat -an | grep 3001
```

## 📊 Debug Metrics to Monitor

### XTerm.js Layer
- Terminal initialization success
- onData event count
- Focus state changes
- Character encoding accuracy

### React Layer  
- Component mount/unmount cycles
- State update frequency
- Effect hook execution
- Props change propagation

### WebSocket Layer
- Connection establishment time
- Message send/receive counts  
- Reconnection attempts
- Error frequency

## ✅ Success Indicators

When everything works correctly, you should see:

1. **XTerm Test**: All counters incrementing, focus changes working
2. **React Component**: Clean debug logs, connection status "Connected"
3. **Backend Server**: Input/output messages logged, process spawned
4. **End-to-End**: Type in browser terminal, see output in server logs

## 🚀 Next Steps

Once you identify the failing layer:

1. **XTerm.js Issues**: Check library version, CDN availability, browser compatibility
2. **React Issues**: Review component lifecycle, state management, effect dependencies
3. **WebSocket Issues**: Verify server configuration, network connectivity, CORS settings
4. **Integration Issues**: Check data flow between layers, error handling, edge cases

This comprehensive debugging approach will help identify exactly where the terminal input pipeline is breaking and provide targeted solutions.