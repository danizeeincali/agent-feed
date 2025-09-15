# Streaming Ticker System - Complete Pseudocode Algorithms

## Document Information
- **Version**: 1.0.0
- **Date**: 2025-01-15
- **Phase**: Pseudocode Design
- **Authors**: SPARC Pseudocode Agent

## Overview

This document contains comprehensive algorithmic pseudocode for the Claude Code streaming ticker system, focusing on real-time tool execution feedback via Server-Sent Events (SSE).

---

## 1. Backend SSE Stream Handler Algorithm

### 1.1 SSE Connection Manager

```
ALGORITHM: SSEConnectionManager
INPUT: None
OUTPUT: Connection management interface

CONSTANTS:
    MAX_CONNECTIONS = 1000
    HEARTBEAT_INTERVAL = 30000  // 30 seconds
    CONNECTION_TIMEOUT = 300000 // 5 minutes
    CLEANUP_INTERVAL = 60000    // 1 minute

DATA STRUCTURES:
    ConnectionPool:
        Type: HashMap<connectionId, SSEConnection>
        Operations: O(1) add, remove, get

    InstanceMapping:
        Type: HashMap<instanceId, Set<connectionId>>
        Purpose: Track connections per Claude instance

    SSEConnection:
        id: string
        instanceId: string
        response: HTTPResponse
        startTime: timestamp
        lastMessage: timestamp
        messageCount: integer
        outputPosition: integer
        isAlive: boolean

BEGIN
    // Initialize data structures
    connections ← new HashMap()
    instanceMapping ← new HashMap()
    metrics ← new MetricsCollector()

    // Start background monitoring
    StartBackgroundTasks()

    FUNCTION CreateConnection(instanceId, response, connectionId?)
    BEGIN
        connectionId ← connectionId OR GenerateUniqueId()

        // Set SSE headers
        SetSSEHeaders(response)

        // Create connection object
        connection ← {
            id: connectionId,
            instanceId: instanceId,
            response: response,
            startTime: CurrentTime(),
            lastMessage: CurrentTime(),
            messageCount: 0,
            outputPosition: 0,
            isAlive: true
        }

        // Store connection
        connections[connectionId] ← connection

        // Update instance mapping
        IF NOT instanceMapping.has(instanceId) THEN
            instanceMapping[instanceId] ← new Set()
        END IF
        instanceMapping[instanceId].add(connectionId)

        // Setup event handlers
        SetupConnectionHandlers(connectionId)

        // Send welcome message
        SendMessage(connectionId, {
            type: 'connected',
            instanceId: instanceId,
            data: { message: `Connected to ${instanceId}` },
            timestamp: CurrentTime()
        })

        // Send buffered output
        SendBufferedOutput(connectionId)

        LogConnectionCreated(connectionId, instanceId)
        RETURN connectionId
    END

    FUNCTION RemoveConnection(connectionId)
    BEGIN
        connection ← connections[connectionId]
        IF connection is null THEN
            RETURN false
        END IF

        // Cleanup instance mapping
        instanceConnections ← instanceMapping[connection.instanceId]
        IF instanceConnections is not null THEN
            instanceConnections.remove(connectionId)
            IF instanceConnections.isEmpty() THEN
                instanceMapping.remove(connection.instanceId)
            END IF
        END IF

        // Remove from pool
        connections.remove(connectionId)

        LogConnectionRemoved(connectionId)
        RETURN true
    END

    FUNCTION GetConnectionsForInstance(instanceId)
    BEGIN
        connectionIds ← instanceMapping[instanceId] OR empty Set
        activeConnections ← []

        FOR EACH connectionId IN connectionIds DO
            connection ← connections[connectionId]
            IF connection is not null AND connection.isAlive THEN
                activeConnections.append(connection)
            END IF
        END FOR

        RETURN activeConnections
    END

    FUNCTION CleanupDeadConnections()
    BEGIN
        deadConnections ← []

        FOR EACH connection IN connections.values() DO
            IF NOT connection.isAlive OR
               (CurrentTime() - connection.lastMessage) > CONNECTION_TIMEOUT THEN
                deadConnections.append(connection.id)
            END IF
        END FOR

        cleanedCount ← 0
        FOR EACH connectionId IN deadConnections DO
            IF RemoveConnection(connectionId) THEN
                cleanedCount ← cleanedCount + 1
            END IF
        END FOR

        RETURN cleanedCount
    END

    FUNCTION StartBackgroundTasks()
    BEGIN
        // Heartbeat timer
        SetInterval(HEARTBEAT_INTERVAL, SendHeartbeats)

        // Cleanup timer
        SetInterval(CLEANUP_INTERVAL, CleanupDeadConnections)

        // Metrics collection
        SetInterval(10000, UpdateMetrics)
    END
END
```

### 1.2 SSE Message Broadcasting

```
ALGORITHM: SSEMessageBroadcaster
INPUT: message, target (connectionId | instanceId | 'all')
OUTPUT: number of successful sends

BEGIN
    FUNCTION BroadcastMessage(message, target)
    BEGIN
        successCount ← 0
        targetConnections ← []

        // Determine target connections
        SWITCH target.type
            CASE 'connection':
                connection ← GetConnection(target.id)
                IF connection is not null THEN
                    targetConnections ← [connection]
                END IF

            CASE 'instance':
                targetConnections ← GetConnectionsForInstance(target.id)

            CASE 'all':
                targetConnections ← GetAllActiveConnections()
        END SWITCH

        // Send to each connection
        FOR EACH connection IN targetConnections DO
            IF SendMessage(connection.id, message) THEN
                successCount ← successCount + 1
            END IF
        END FOR

        LogBroadcast(message.type, target, successCount)
        RETURN successCount
    END

    FUNCTION SendMessage(connectionId, message)
    BEGIN
        connection ← GetConnection(connectionId)
        IF connection is null OR NOT connection.isAlive THEN
            RETURN false
        END IF

        TRY
            // Format SSE message
            sseData ← FormatSSEMessage(message)

            // Write to response stream
            connection.response.write(sseData)

            // Update connection metrics
            connection.lastMessage ← CurrentTime()
            connection.messageCount ← connection.messageCount + 1

            // Update output position for terminal messages
            IF message.type = 'terminal_output' AND message.position is not null THEN
                connection.outputPosition ← message.position + message.data.length
            END IF

            RETURN true

        CATCH error
            LogError("Failed to send message", connectionId, error)
            MarkConnectionDead(connectionId)
            RETURN false
        END TRY
    END

    FUNCTION FormatSSEMessage(message)
    BEGIN
        // Add unique ID
        IF message.id is null THEN
            message.id ← GenerateUniqueId()
        END IF

        // Format for SSE protocol
        formattedMessage ← "data: " + JSON.stringify(message) + "\n\n"

        RETURN formattedMessage
    END
END
```

---

## 2. Claude Code Output Parser Algorithm

### 2.1 Tool Detection Engine

```
ALGORITHM: ClaudeToolDetector
INPUT: stdout chunk
OUTPUT: detected tools and status

CONSTANTS:
    TOOL_PATTERNS = {
        tool_invocation: /\[TOOL\]\s+(\w+):\s+(.+)/,
        tool_output: /\[OUTPUT\]\s+(\w+):\s+(.+)/,
        tool_error: /\[ERROR\]\s+(\w+):\s+(.+)/,
        tool_complete: /\[COMPLETE\]\s+(\w+):\s+(.+)/,
        function_call: /<function_calls>/,
        function_result: /<\/antml:function_calls>/
    }

    TOOL_STATES = ['initializing', 'executing', 'processing', 'completed', 'error']

DATA STRUCTURES:
    ToolExecution:
        id: string
        name: string
        state: ToolState
        startTime: timestamp
        parameters: object
        output: string[]
        error: string?
        duration: number?

BEGIN
    // Tool execution tracking
    activeTools ← new HashMap<toolId, ToolExecution>()
    outputBuffer ← new CircularBuffer(1000)

    FUNCTION ParseClaudeOutput(stdout)
    BEGIN
        lines ← SplitIntoLines(stdout)
        events ← []

        FOR EACH line IN lines DO
            cleanLine ← RemoveANSIEscapes(line)

            // Skip empty lines and formatting
            IF IsEmptyOrFormatting(cleanLine) THEN
                CONTINUE
            END IF

            // Store in buffer for context
            outputBuffer.append(cleanLine)

            // Detect tool patterns
            toolEvent ← DetectToolActivity(cleanLine)
            IF toolEvent is not null THEN
                events.append(toolEvent)
                UpdateToolState(toolEvent)
            END IF

            // Detect function calls
            functionEvent ← DetectFunctionCall(cleanLine)
            IF functionEvent is not null THEN
                events.append(functionEvent)
            END IF
        END FOR

        RETURN events
    END

    FUNCTION DetectToolActivity(line)
    BEGIN
        FOR EACH pattern IN TOOL_PATTERNS DO
            match ← line.match(pattern.regex)
            IF match is not null THEN
                toolEvent ← CreateToolEvent(pattern.type, match)
                RETURN toolEvent
            END IF
        END FOR

        // Try heuristic detection
        heuristicEvent ← HeuristicToolDetection(line)
        RETURN heuristicEvent
    END

    FUNCTION CreateToolEvent(type, match)
    BEGIN
        SWITCH type
            CASE 'tool_invocation':
                toolName ← match[1]
                action ← match[2]

                toolId ← GenerateToolId(toolName)
                execution ← {
                    id: toolId,
                    name: toolName,
                    state: 'initializing',
                    startTime: CurrentTime(),
                    parameters: ParseParameters(action),
                    output: [],
                    error: null,
                    duration: null
                }

                activeTools[toolId] ← execution

                RETURN {
                    type: 'tool-start',
                    toolId: toolId,
                    toolName: toolName,
                    action: action,
                    timestamp: CurrentTime()
                }

            CASE 'tool_output':
                toolName ← match[1]
                output ← match[2]

                execution ← FindActiveToolByName(toolName)
                IF execution is not null THEN
                    execution.output.append(output)
                    execution.state ← 'executing'

                    RETURN {
                        type: 'tool-output',
                        toolId: execution.id,
                        toolName: toolName,
                        output: output,
                        timestamp: CurrentTime()
                    }
                END IF

            CASE 'tool_complete':
                toolName ← match[1]
                result ← match[2]

                execution ← FindActiveToolByName(toolName)
                IF execution is not null THEN
                    execution.state ← 'completed'
                    execution.duration ← CurrentTime() - execution.startTime

                    RETURN {
                        type: 'tool-complete',
                        toolId: execution.id,
                        toolName: toolName,
                        result: result,
                        duration: execution.duration,
                        timestamp: CurrentTime()
                    }
                END IF

            CASE 'tool_error':
                toolName ← match[1]
                error ← match[2]

                execution ← FindActiveToolByName(toolName)
                IF execution is not null THEN
                    execution.state ← 'error'
                    execution.error ← error
                    execution.duration ← CurrentTime() - execution.startTime

                    RETURN {
                        type: 'tool-error',
                        toolId: execution.id,
                        toolName: toolName,
                        error: error,
                        timestamp: CurrentTime()
                    }
                END IF
        END SWITCH

        RETURN null
    END

    FUNCTION HeuristicToolDetection(line)
    BEGIN
        // Common tool patterns based on Claude Code behavior
        patterns ← [
            {pattern: /Reading\s+(.+)/, tool: 'Read', action: 'reading file'},
            {pattern: /Writing\s+(.+)/, tool: 'Write', action: 'writing file'},
            {pattern: /Executing:\s+(.+)/, tool: 'Bash', action: 'executing command'},
            {pattern: /Searching\s+(.+)/, tool: 'Grep', action: 'searching'},
            {pattern: /Editing\s+(.+)/, tool: 'Edit', action: 'editing file'},
            {pattern: /Running\s+(.+)/, tool: 'Bash', action: 'running script'},
            {pattern: /Creating\s+(.+)/, tool: 'Write', action: 'creating file'},
            {pattern: /Checking\s+(.+)/, tool: 'Read', action: 'checking file'}
        ]

        FOR EACH pattern IN patterns DO
            match ← line.match(pattern.pattern)
            IF match is not null THEN
                RETURN {
                    type: 'tool-detected',
                    toolName: pattern.tool,
                    action: pattern.action,
                    target: match[1],
                    confidence: 0.8,
                    timestamp: CurrentTime()
                }
            END IF
        END FOR

        RETURN null
    END

    FUNCTION FindActiveToolByName(toolName)
    BEGIN
        FOR EACH execution IN activeTools.values() DO
            IF execution.name = toolName AND
               execution.state IN ['initializing', 'executing'] THEN
                RETURN execution
            END IF
        END FOR
        RETURN null
    END
END
```

### 2.2 Real-time Stream Processing

```
ALGORITHM: RealTimeStreamProcessor
INPUT: continuous stdout stream
OUTPUT: parsed events stream

CONSTANTS:
    BUFFER_SIZE = 4096
    PARSE_INTERVAL = 50    // milliseconds
    MAX_LINE_LENGTH = 8192
    ANSI_ESCAPE_REGEX = /\x1B(?:[@-Z\\-_]|\[[0-?]*[ -/]*[@-~])/g

DATA STRUCTURES:
    StreamBuffer:
        buffer: string
        position: integer
        lines: string[]

    ParseState:
        inFunctionCall: boolean
        functionCallDepth: integer
        currentTool: string?
        toolStack: ToolExecution[]

BEGIN
    streamBuffer ← new StreamBuffer()
    parseState ← new ParseState()
    eventEmitter ← new EventEmitter()

    FUNCTION ProcessInputStream(stdin)
    BEGIN
        // Set up streaming parser
        stdin.on('data', HandleDataChunk)
        stdin.on('end', HandleStreamEnd)
        stdin.on('error', HandleStreamError)

        // Start periodic parsing
        SetInterval(PARSE_INTERVAL, FlushPendingEvents)
    END

    FUNCTION HandleDataChunk(chunk)
    BEGIN
        // Append to buffer
        streamBuffer.buffer ← streamBuffer.buffer + chunk.toString()

        // Process complete lines
        WHILE streamBuffer.buffer.contains('\n') DO
            line ← ExtractNextLine(streamBuffer)
            IF line is not null THEN
                ProcessLine(line)
            END IF
        END WHILE

        // Trigger immediate processing for tool events
        IF ContainsToolKeywords(chunk.toString()) THEN
            FlushPendingEvents()
        END IF
    END

    FUNCTION ExtractNextLine(buffer)
    BEGIN
        newlineIndex ← buffer.buffer.indexOf('\n', buffer.position)
        IF newlineIndex = -1 THEN
            RETURN null
        END IF

        line ← buffer.buffer.substring(buffer.position, newlineIndex)
        buffer.position ← newlineIndex + 1

        // Handle line length limits
        IF line.length > MAX_LINE_LENGTH THEN
            line ← line.substring(0, MAX_LINE_LENGTH) + "...[truncated]"
        END IF

        RETURN line
    END

    FUNCTION ProcessLine(line)
    BEGIN
        // Clean ANSI escape sequences
        cleanLine ← RemoveANSIEscapes(line)

        // Skip empty lines and pure formatting
        IF IsEmptyOrFormatting(cleanLine) THEN
            RETURN
        END IF

        // Update parse state
        UpdateParseState(cleanLine)

        // Detect and emit tool events
        toolEvents ← DetectToolActivity(cleanLine)
        FOR EACH event IN toolEvents DO
            EmitToolEvent(event)
        END FOR

        // Handle special message types
        IF IsWelcomeMessage(cleanLine) THEN
            EmitSystemEvent('welcome', ExtractWelcomeInfo(cleanLine))
        ELSE IF IsErrorMessage(cleanLine) THEN
            EmitSystemEvent('error', ExtractErrorInfo(cleanLine))
        ELSE IF IsProgressIndicator(cleanLine) THEN
            EmitProgressEvent(ExtractProgressInfo(cleanLine))
        END IF
    END

    FUNCTION UpdateParseState(line)
    BEGIN
        // Track function call nesting
        IF line.contains('<function_calls>') THEN
            parseState.inFunctionCall ← true
            parseState.functionCallDepth ← parseState.functionCallDepth + 1
        ELSE IF line.contains('