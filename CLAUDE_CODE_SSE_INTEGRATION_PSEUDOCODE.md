# Claude Code SSE Integration - Pseudocode Design

## Architecture Overview

```
┌─────────────────────────────────────────────────────────────┐
│                    Frontend (Browser)                        │
│  ┌───────────────────────────────────────────────────────┐  │
│  │ EnhancedPostingInterface                              │  │
│  │  ├─ useActivityStream hook                            │  │
│  │  └─ AviTypingIndicator (displays activity)            │  │
│  └───────────────────────────────────────────────────────┘  │
│                           ↑                                  │
│                           │ SSE Stream                       │
│                           │ (real-time updates)              │
└───────────────────────────┼──────────────────────────────────┘
                            │
┌───────────────────────────┼──────────────────────────────────┐
│                    Backend (Node.js)                         │
│  ┌────────────────────────┴─────────────────────────────┐   │
│  │ SSE Server (/api/streaming-ticker/stream)            │   │
│  │  ├─ Maintains connection pool (Set<Response>)        │   │
│  │  ├─ broadcastToSSE(message) → all clients            │   │
│  │  └─ Validates message format                         │   │
│  └──────────────────────┬───────────────────────────────┘   │
│                         ↑                                    │
│                         │ broadcasts                         │
│                         │                                    │
│  ┌──────────────────────┴───────────────────────────────┐   │
│  │ Claude Code SDK (/api/claude-code/streaming-chat)    │   │
│  │  ├─ Receives user messages                           │   │
│  │  ├─ Calls Claude API (streaming)                     │   │
│  │  ├─ Intercepts tool executions                       │   │
│  │  ├─ Formats activity messages                        │   │
│  │  └─ Calls broadcastToSSE()                           │   │
│  └──────────────────────────────────────────────────────┘   │
└──────────────────────────────────────────────────────────────┘
```

## Component 1: SSE Server (server.js)

### Export broadcastToSSE Function

```javascript
// Global connection pool
const sseConnections = new Set();

/**
 * Broadcast activity message to all SSE clients
 * @param {Object} message - Activity message to broadcast
 * @param {string} message.type - Message type (tool_activity, info, etc.)
 * @param {Object} message.data - Message data
 * @param {string} message.data.tool - Tool name
 * @param {string} message.data.action - Tool action
 * @param {string} message.data.priority - Priority (high, medium, low)
 */
FUNCTION broadcastToSSE(message)
  // Validate message structure
  IF NOT message.type OR NOT message.data:
    CONSOLE.ERROR('Invalid message format')
    RETURN

  // Add metadata
  message.id = generateUUID()
  message.data.timestamp = Date.now()

  // Validate with existing validator
  validatedMessage = validateSSEMessage(message)

  // Broadcast to all connected clients
  FOR EACH client IN sseConnections:
    IF client.writable:
      TRY:
        client.write(`data: ${JSON.stringify(validatedMessage)}\n\n`)
      CATCH error:
        CONSOLE.ERROR('Failed to broadcast to client:', error)
        sseConnections.delete(client)
END FUNCTION

// Export for use in other modules
EXPORT { broadcastToSSE }
```

### Modify SSE Stream Endpoint

```javascript
app.get('/api/streaming-ticker/stream', (req, res) => {
  // Set headers (unchanged)
  res.writeHead(200, { 'Content-Type': 'text/event-stream', ... })

  // Send connection message
  res.write(`data: ${JSON.stringify(connectionMessage)}\n\n`)

  // Add to connection pool
  sseConnections.add(res)

  // Heartbeat (unchanged)
  const heartbeat = setInterval(() => {
    IF res.writableEnded:
      clearInterval(heartbeat)
      sseConnections.delete(res)
      RETURN

    res.write(`data: ${JSON.stringify(heartbeatMessage)}\n\n`)
  }, 30000)

  // Cleanup on disconnect
  req.on('close', () => {
    clearInterval(heartbeat)
    sseConnections.delete(res)
  })
})
```

## Component 2: Claude Code SDK (claude-code-sdk.js)

### Import broadcastToSSE

```javascript
IMPORT { broadcastToSSE } from '../../api-server/server.js'

// Feature flag for gradual rollout
CONST BROADCAST_TOOL_ACTIVITY = process.env.BROADCAST_CLAUDE_ACTIVITY !== 'false'
```

### Activity Broadcasting Helper

```javascript
/**
 * Broadcast tool activity to SSE stream
 * @param {string} toolName - Name of the tool executed
 * @param {string} action - Tool action/description
 * @param {Object} metadata - Optional metadata
 */
FUNCTION broadcastToolActivity(toolName, action, metadata = {})
  IF NOT BROADCAST_TOOL_ACTIVITY:
    RETURN

  // Determine priority based on tool type
  priority = getToolPriority(toolName)

  // Truncate action to prevent data leakage
  truncatedAction = truncateAction(action, 100)

  message = {
    type: 'tool_activity',
    data: {
      tool: toolName,
      action: truncatedAction,
      priority: priority,
      timestamp: Date.now(),
      metadata: metadata
    }
  }

  TRY:
    broadcastToSSE(message)
    CONSOLE.LOG(`📡 Broadcast: ${toolName}(${truncatedAction})`)
  CATCH error:
    CONSOLE.ERROR('Failed to broadcast activity:', error)
    // Don't throw - broadcasting is non-critical
END FUNCTION

/**
 * Determine tool priority for filtering
 */
FUNCTION getToolPriority(toolName)
  highPriorityTools = ['Bash', 'Read', 'Write', 'Edit', 'Task', 'Grep', 'Glob']

  IF toolName IN highPriorityTools:
    RETURN 'high'
  ELSE:
    RETURN 'medium'
END FUNCTION

/**
 * Truncate action to prevent data leakage
 */
FUNCTION truncateAction(action, maxLength)
  // Remove sensitive patterns
  sanitized = action
    .replace(/token=[^&\s]+/gi, 'token=***')
    .replace(/key=[^&\s]+/gi, 'key=***')
    .replace(/password=[^&\s]+/gi, 'password=***')

  // Truncate length
  IF sanitized.length > maxLength:
    RETURN sanitized.substring(0, maxLength - 3) + '...'

  RETURN sanitized
END FUNCTION
```

### Intercept Tool Executions in Streaming Response

```javascript
router.post('/streaming-chat', async (req, res) => {
  const { message } = req.body

  // Broadcast initial processing message
  broadcastToolActivity('Claude', 'Processing request', {})

  TRY:
    // Call Claude API (existing code)
    const claudeResponse = await callClaudeAPI(message)

    // Set up streaming
    res.setHeader('Content-Type', 'text/event-stream')
    res.setHeader('Cache-Control', 'no-cache')

    // Parse Claude's response stream
    FOR EACH chunk IN claudeResponse:
      // Extract tool use from chunk
      IF chunk.type === 'content_block_start' AND chunk.content_block.type === 'tool_use':
        toolName = chunk.content_block.name
        toolInput = chunk.content_block.input

        // Broadcast tool execution
        action = formatToolAction(toolName, toolInput)
        broadcastToolActivity(toolName, action, {
          input: sanitizeToolInput(toolInput)
        })

      // Stream to frontend (unchanged)
      res.write(`data: ${JSON.stringify(chunk)}\n\n`)

    res.write('data: [DONE]\n\n')
    res.end()

  CATCH error:
    broadcastToolActivity('Error', error.message, { severity: 'high' })
    res.status(500).json({ error: error.message })
})
```

### Format Tool Actions

```javascript
FUNCTION formatToolAction(toolName, toolInput)
  SWITCH toolName:
    CASE 'bash':
      RETURN toolInput.command || 'command'

    CASE 'read_file':
      filename = extractFilename(toolInput.path)
      RETURN filename

    CASE 'write_to_file':
      filename = extractFilename(toolInput.path)
      RETURN filename

    CASE 'edit_file':
      filename = extractFilename(toolInput.path)
      RETURN `${filename} (${toolInput.old_str?.substring(0, 20)}...)`

    CASE 'grep':
      RETURN `pattern: ${toolInput.pattern}`

    CASE 'task':
      RETURN toolInput.prompt?.substring(0, 80) || 'task'

    DEFAULT:
      RETURN JSON.stringify(toolInput).substring(0, 100)
END FUNCTION

FUNCTION extractFilename(path)
  // Extract filename from path
  parts = path.split('/')
  filename = parts[parts.length - 1]

  // Truncate long filenames
  IF filename.length > 40:
    RETURN filename.substring(0, 37) + '...'

  RETURN filename
END FUNCTION
```

## Component 3: Integration Testing

### Test Suite: Claude Code → SSE → Frontend

```javascript
DESCRIBE 'Claude Code SSE Integration':

  TEST 'should broadcast tool execution to SSE':
    // Mock SSE client
    mockClient = createMockSSEClient()
    sseConnections.add(mockClient)

    // Execute tool via Claude Code
    POST '/api/claude-code/streaming-chat'
    BODY: { message: 'run git status' }

    // Wait for broadcast
    WAIT_FOR mockClient.receivedMessages.length > 0

    // Verify message
    lastMessage = mockClient.receivedMessages[0]
    EXPECT lastMessage.type === 'tool_activity'
    EXPECT lastMessage.data.tool === 'Bash'
    EXPECT lastMessage.data.action CONTAINS 'git status'
    EXPECT lastMessage.data.priority === 'high'

  TEST 'should broadcast multiple tools in sequence':
    mockClient = createMockSSEClient()
    sseConnections.add(mockClient)

    // Simulate Claude executing 3 tools
    broadcastToolActivity('Read', 'file.tsx')
    broadcastToolActivity('Edit', 'file.tsx')
    broadcastToolActivity('Bash', 'npm test')

    // Verify all received
    EXPECT mockClient.receivedMessages.length === 3
    EXPECT mockClient.receivedMessages[0].data.tool === 'Read'
    EXPECT mockClient.receivedMessages[1].data.tool === 'Edit'
    EXPECT mockClient.receivedMessages[2].data.tool === 'Bash'

  TEST 'should handle SSE client disconnection gracefully':
    mockClient = createMockSSEClient()
    sseConnections.add(mockClient)

    // Simulate disconnect
    mockClient.writable = false

    // Broadcast should not throw
    EXPECT_NO_ERROR:
      broadcastToolActivity('Bash', 'test')

    // Client should be removed from pool
    EXPECT sseConnections.has(mockClient) === false

  TEST 'should sanitize sensitive data from broadcasts':
    action = 'curl https://api.com?token=secret123&key=abc'
    sanitized = truncateAction(action, 100)

    EXPECT sanitized NOT_CONTAINS 'secret123'
    EXPECT sanitized NOT_CONTAINS 'abc'
    EXPECT sanitized CONTAINS 'token=***'
    EXPECT sanitized CONTAINS 'key=***'
```

## Component 4: E2E Test Flow

```javascript
TEST 'Full E2E: User message → Claude tools → SSE → Frontend display':

  STEP 1: Open Avi DM tab
    NAVIGATE '/feed'
    CLICK 'Avi DM' tab
    EXPECT input field visible

  STEP 2: Send message to Avi
    TYPE 'run git status and npm test'
    CLICK 'Send'

  STEP 3: Verify typing indicator appears
    EXPECT text matching /Avi/ visible

  STEP 4: Verify activity updates appear
    WAIT_FOR text matching /Avi - Claude\(Processing request\)/
    SCREENSHOT 'avi-activity-processing.png'

    WAIT_FOR text matching /Avi - Bash\(git status/
    SCREENSHOT 'avi-activity-bash-git.png'

    WAIT_FOR text matching /Avi - Bash\(npm test/
    SCREENSHOT 'avi-activity-bash-npm.png'

  STEP 5: Verify response appears
    WAIT_FOR Avi response message
    EXPECT typing indicator removed
    SCREENSHOT 'avi-response-complete.png'

  STEP 6: Verify no console errors
    errors = getConsoleErrors()
    EXPECT errors.length === 0
```

## Error Handling

### SSE Connection Failures

```javascript
FUNCTION broadcastToSSE(message)
  FOR EACH client IN sseConnections:
    TRY:
      client.write(`data: ${JSON.stringify(message)}\n\n`)
    CATCH error:
      CONSOLE.WARN(`Client write failed: ${error.message}`)

      // Remove dead connection
      sseConnections.delete(client)

      // Don't throw - continue broadcasting to other clients
END FUNCTION
```

### Claude API Failures

```javascript
router.post('/streaming-chat', async (req, res) => {
  TRY:
    // ... Claude API call
  CATCH error:
    // Broadcast error activity
    broadcastToolActivity('Error', error.message, {
      priority: 'high',
      severity: 'error'
    })

    // Return error to frontend
    res.status(500).json({ error: error.message })
})
```

## Performance Optimizations

### Message Batching (if needed)

```javascript
// Batch messages if >10 broadcasts/second
const messageBatch = []
const BATCH_INTERVAL = 100 // ms

setInterval(() => {
  IF messageBatch.length > 0:
    FOR EACH message IN messageBatch:
      broadcastToSSE(message)
    messageBatch = []
}, BATCH_INTERVAL)

FUNCTION queueBroadcast(message)
  messageBatch.push(message)
END FUNCTION
```

### Connection Pool Cleanup

```javascript
// Clean up stale connections every 60 seconds
setInterval(() => {
  FOR EACH client IN sseConnections:
    IF NOT client.writable OR client.destroyed:
      sseConnections.delete(client)
}, 60000)
```

## Rollback Strategy

```javascript
// Feature flag in .env
BROADCAST_CLAUDE_ACTIVITY=true

// Check before broadcasting
IF NOT process.env.BROADCAST_CLAUDE_ACTIVITY:
  RETURN // Skip broadcasting

// Emergency kill switch via API
app.post('/api/admin/toggle-broadcast', (req, res) => {
  process.env.BROADCAST_CLAUDE_ACTIVITY = req.body.enabled
  res.json({ enabled: process.env.BROADCAST_CLAUDE_ACTIVITY })
})
```
