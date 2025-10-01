# AVI DM MANUAL VALIDATION GUIDE - PRODUCTION VALIDATOR AGENT

## Status: ALL FIXES APPLIED ✅

### Applied Fixes:
1. ✅ Vite proxy `/api/claude-code`: 120s timeout (vite.config.ts:32-50)
2. ✅ Frontend AbortController: 90s timeout
3. ✅ Better error messages (timeout, network, server)
4. ✅ Debug logging added to trace response flow
5. ✅ Vite dev server running on port 5173
6. ✅ API server running on port 3001

## Manual Test Procedure

### Prerequisites
- Frontend: http://localhost:5173 (RUNNING ✅)
- API Server: http://localhost:3001 (RUNNING ✅)
- Browser: Chrome/Firefox with DevTools

### Test Steps

#### 1. Open Application
```bash
# In browser, navigate to:
http://localhost:5173
```

#### 2. Navigate to Avi DM
- Click on "Avi DM" tab in the posting interface
- You should see: "Chat with Avi" heading
- You should see: "Direct message with your Chief of Staff"
- You should see: Input field with placeholder "Type your message to Avi..."

#### 3. Open DevTools Console
- Press F12 (Windows/Linux) or Cmd+Option+I (Mac)
- Click on "Console" tab
- Clear any existing logs (trash can icon)

#### 4. Send Test Message
**Message**: `hello what directory are you in?`

- Type the message in the input field
- Click "Send" button
- **START TIMER** ⏱️

#### 5. Monitor Debug Logs

Watch the console for these debug messages in sequence:

```
✅ Expected Log Sequence:
1. 🔍 DEBUG: Calling Avi Claude Code with message: hello what directory are you in?
2. 🔍 DEBUG: Fetching from /api/claude-code/streaming-chat
3. 🔍 SPARC DEBUG: Claude Code proxy request: POST /api/claude-code/streaming-chat
4. 🔍 DEBUG: Response status: 200 OK
5. 🔍 DEBUG: Parsed JSON data: {success: true, message: "...", ...}
6. 🔍 DEBUG: Received response: I'm in `/workspaces/agent-feed/prod`...
7. 🔍 DEBUG: Adding response to chat history: {id: "...", content: "...", sender: "avi", ...}
8. 🔍 DEBUG: New chat history length: 2
```

#### 6. Wait for Response
- Maximum wait time: 60 seconds
- Loading indicator should appear
- Response should appear in chat UI

#### 7. Validate Response
**Response MUST contain:**
- ✅ Working directory: `/workspaces/agent-feed/prod` or `/workspaces/agent-feed`
- ✅ Response from real Claude Code (not mock data)
- ✅ Avi personality/formatting

**Response MUST NOT contain:**
- ❌ "Failed to fetch"
- ❌ "Empty reply from server"
- ❌ "timeout"
- ❌ "mock" or "simulation"

#### 8. Record Results

**Response Time**: ______ seconds

**Debug Logs Found** (✅/❌):
- [ ] Log 1: Calling Avi Claude Code
- [ ] Log 2: Fetching from endpoint
- [ ] Log 3: Proxy request
- [ ] Log 4: Response status 200
- [ ] Log 5: Parsed JSON data
- [ ] Log 6: Received response
- [ ] Log 7: Adding to chat history
- [ ] Log 8: New chat history length

**Response Content** (✅/❌):
- [ ] Contains working directory path
- [ ] Is real Claude Code response (not mock)
- [ ] Appears in UI correctly
- [ ] No timeout errors
- [ ] No network errors

**Screenshots to Capture**:
1. Initial Avi DM interface
2. Console logs before sending message
3. Message typed in input field
4. Console logs showing debug sequence
5. Response received in UI
6. Final console state

---

## Expected Outcomes

### ✅ SUCCESS CRITERIA (100% REAL + DEBUG PROOF)

All of the following MUST be true:

1. ✅ All 8 debug logs appear in correct sequence
2. ✅ Response status: 200 OK
3. ✅ Response contains `/workspaces/agent-feed/prod` or similar
4. ✅ Chat history length increases from 1 → 2
5. ✅ UI shows Avi response bubble
6. ✅ Zero timeout errors
7. ✅ Zero "Failed to fetch" errors
8. ✅ Response time < 60 seconds

### ❌ FAILURE INDICATORS

If ANY of these occur, the test has FAILED:

- ❌ Missing debug logs
- ❌ Response status != 200
- ❌ Console shows "Failed to fetch"
- ❌ Console shows "Empty reply from server"
- ❌ Console shows timeout error
- ❌ Response contains "mock" or "simulation"
- ❌ No response after 60 seconds
- ❌ Response doesn't appear in UI despite API success

---

## Example Success Log

```
🔍 DEBUG: Calling Avi Claude Code with message: hello what directory are you in?
🔍 DEBUG: Fetching from /api/claude-code/streaming-chat
🔍 SPARC DEBUG: Claude Code proxy request: POST /api/claude-code/streaming-chat -> /api/claude-code/streaming-chat
🔍 DEBUG: Response status: 200 OK
🔍 DEBUG: Parsed JSON data: {success: true, message: "I'm currently in `/workspaces/agent-feed/prod`...", timestamp: "2025-10-01T03:00:00.000Z"}
🔍 DEBUG: Received response: I'm currently in `/workspaces/agent-feed/prod`, which is the production environment directory...
🔍 DEBUG: Adding response to chat history: {id: "msg-123", content: "I'm currently in...", sender: "avi", timestamp: 1727744400000}
🔍 DEBUG: New chat history length: 2
```

---

## Troubleshooting

### If no response appears:
1. Check API server is running: `curl http://localhost:3001/api/claude-code/streaming-chat`
2. Check Vite proxy logs in terminal
3. Check for CORS errors in console
4. Verify Anthropic API key is configured

### If debug logs don't appear:
1. Refresh the page (clear cache: Ctrl+Shift+R)
2. Verify you're on the Avi DM tab
3. Check console filter settings (should show "log" level)

### If timeout occurs:
1. Check network tab for request status
2. Verify timeout values in vite.config.ts
3. Check API server logs for errors

---

## Automated Validation

To run automated validation (if Playwright test works):

```bash
cd /workspaces/agent-feed/frontend
npx playwright test --config=playwright.config.debug-validation.ts
```

---

## Report Template

```
PRODUCTION VALIDATION REPORT - AVI DM
Date: [DATE]
Tester: Production Validator Agent
Test Duration: [X] seconds

✅ ALL SUCCESS CRITERIA MET
or
❌ FAILED - [reason]

Debug Logs: [X]/8 found
Response Time: [X]s
Response Content: [first 500 chars]
Screenshots: [paths]

VERDICT: PRODUCTION READY / NOT READY
```
