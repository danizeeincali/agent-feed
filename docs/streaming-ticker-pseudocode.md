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
    FUNCTION CreateConnection(instanceId, response, connectionId?)
    BEGIN
        connectionId ← connectionId OR GenerateUniqueId()

        // Set SSE headers
        response.writeHead(200, {
            'Content-Type': 'text/event-stream',
            'Cache-Control': 'no-cache',
            'Connection': 'keep-alive',
            'Access-Control-Allow-Origin': '*'
        })

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

        // Store and track connection
        StoreConnection(connection)
        SetupConnectionHandlers(connectionId)
        SendWelcomeMessage(connectionId)
        SendBufferedOutput(connectionId)

        RETURN connectionId
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

        SWITCH target.type
            CASE 'connection':
                IF SendMessage(target.id, message) THEN
                    successCount ← 1
                END IF

            CASE 'instance':
                connections ← GetConnectionsForInstance(target.id)
                FOR EACH connection IN connections DO
                    IF SendMessage(connection.id, message) THEN
                        successCount ← successCount + 1
                    END IF
                END FOR

            CASE 'all':
                connections ← GetAllActiveConnections()
                FOR EACH connection IN connections DO
                    IF SendMessage(connection.id, message) THEN
                        successCount ← successCount + 1
                    END IF
                END FOR
        END SWITCH

        RETURN successCount
    END

    FUNCTION SendMessage(connectionId, message)
    BEGIN
        connection ← GetConnection(connectionId)
        IF connection is null OR NOT connection.isAlive THEN
            RETURN false
        END IF

        TRY
            sseData ← "data: " + JSON.stringify(message) + "\n\n"
            connection.response.write(sseData)

            // Update connection metrics
            connection.lastMessage ← CurrentTime()
            connection.messageCount ← connection.messageCount + 1

            RETURN true
        CATCH error
            MarkConnectionDead(connectionId)
            RETURN false
        END TRY
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
        function_call: /<function_calls>/,
        function_end: /<\/antml:function_calls>/,
        tool_invoke: /<invoke name="([^"]+)">/,
        tool_param: /<parameter name="([^"]+)">([^<]*)<\/antml:parameter>/,
        bash_exec: /Executing:\s+(.+)/,
        file_read: /Reading\s+(.+)/,
        file_write: /Writing\s+(.+)/
    }

    TOOL_STATES = ['initializing', 'executing', 'processing', 'completed', 'error']

BEGIN
    activeTools ← new HashMap<toolId, ToolExecution>()

    FUNCTION ParseClaudeOutput(stdout)
    BEGIN
        lines ← SplitIntoLines(stdout)
        events ← []

        FOR EACH line IN lines DO
            cleanLine ← RemoveANSIEscapes(line)

            IF IsEmptyOrFormatting(cleanLine) THEN
                CONTINUE
            END IF

            // Detect tool function calls
            IF cleanLine.matches(TOOL_PATTERNS.function_call) THEN
                toolEvent ← {
                    type: 'tool-session-start',
                    timestamp: CurrentTime()
                }
                events.append(toolEvent)

            ELSE IF cleanLine.matches(TOOL_PATTERNS.tool_invoke) THEN
                match ← cleanLine.match(TOOL_PATTERNS.tool_invoke)
                toolName ← match[1]

                toolEvent ← {
                    type: 'tool-start',
                    toolName: toolName,
                    action: GenerateActionDescription(toolName),
                    timestamp: CurrentTime()
                }
                events.append(toolEvent)

            ELSE IF cleanLine.matches(TOOL_PATTERNS.function_end) THEN
                toolEvent ← {
                    type: 'tool-complete',
                    timestamp: CurrentTime()
                }
                events.append(toolEvent)

            // Detect specific tool outputs
            ELSE IF cleanLine.matches(TOOL_PATTERNS.bash_exec) THEN
                match ← cleanLine.match(TOOL_PATTERNS.bash_exec)
                command ← match[1]

                toolEvent ← {
                    type: 'tool-start',
                    toolName: 'Bash',
                    action: `Executing: ${command}`,
                    timestamp: CurrentTime()
                }
                events.append(toolEvent)
            END IF
        END FOR

        RETURN events
    END

    FUNCTION GenerateActionDescription(toolName)
    BEGIN
        SWITCH toolName
            CASE 'Read':
                RETURN 'Reading file'
            CASE 'Write':
                RETURN 'Writing file'
            CASE 'Edit':
                RETURN 'Editing file'
            CASE 'Bash':
                RETURN 'Executing command'
            CASE 'Grep':
                RETURN 'Searching text'
            CASE 'Glob':
                RETURN 'Finding files'
            DEFAULT:
                RETURN `Using ${toolName}`
        END SWITCH
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
    ANSI_ESCAPE_REGEX = /\x1B(?:[@-Z\\-_]|\[[0-?]*[ -/]*[@-~])/g

BEGIN
    streamBuffer ← ""
    eventEmitter ← new EventEmitter()

    FUNCTION ProcessInputStream(stdin)
    BEGIN
        stdin.on('data', HandleDataChunk)
        SetInterval(PARSE_INTERVAL, FlushPendingEvents)
    END

    FUNCTION HandleDataChunk(chunk)
    BEGIN
        streamBuffer ← streamBuffer + chunk.toString()

        WHILE streamBuffer.contains('\n') DO
            line ← ExtractNextLine()
            IF line is not null THEN
                ProcessLine(line)
            END IF
        END WHILE
    END

    FUNCTION ProcessLine(line)
    BEGIN
        cleanLine ← line.replace(ANSI_ESCAPE_REGEX, '')

        IF IsEmptyOrFormatting(cleanLine) THEN
            RETURN
        END IF

        // Detect and emit tool events
        toolEvents ← DetectToolActivity(cleanLine)
        FOR EACH event IN toolEvents DO
            EmitToolEvent(event)
        END FOR
    END

    FUNCTION RemoveANSIEscapes(text)
    BEGIN
        RETURN text.replace(ANSI_ESCAPE_REGEX, '')
    END

    FUNCTION IsEmptyOrFormatting(line)
    BEGIN
        // Check if line is empty or contains only formatting characters
        cleanedLine ← line.trim()
        IF cleanedLine.length = 0 THEN
            RETURN true
        END IF

        // Check for box drawing characters
        boxChars ← /[╭╮╰╯─│┌┐└┘]/g
        IF cleanedLine.replace(boxChars, '').trim().length = 0 THEN
            RETURN true
        END IF

        RETURN false
    END
END
```

---

## 3. Frontend Ticker Update Algorithm

### 3.1 Ticker Component State Management

```
ALGORITHM: TickerStateManager
INPUT: SSE events stream
OUTPUT: UI state updates

CONSTANTS:
    ANIMATION_DURATION = 300     // milliseconds
    QUEUE_CAPACITY = 50
    UPDATE_THROTTLE = 100        // milliseconds
    DISPLAY_TIMEOUT = 5000       // 5 seconds for completed tools

DATA STRUCTURES:
    TickerState:
        currentTool: ToolDisplay?
        messageQueue: Queue<ToolMessage>
        animationState: 'idle' | 'entering' | 'updating' | 'exiting'
        lastUpdate: timestamp

    ToolDisplay:
        toolName: string
        action: string
        status: 'initializing' | 'executing' | 'processing' | 'completed' | 'error'
        progress: number?
        startTime: timestamp
        duration: number?
        icon: string

    ToolMessage:
        type: 'tool-start' | 'tool-update' | 'tool-complete' | 'tool-error'
        toolName: string
        action: string
        data: any
        priority: 'low' | 'medium' | 'high'
        timestamp: timestamp

BEGIN
    tickerState ← new TickerState()
    updateScheduler ← new ThrottledScheduler(UPDATE_THROTTLE)
    animationManager ← new AnimationManager()

    FUNCTION Initialize()
    BEGIN
        // Set up SSE connection
        sseConnection ← EstablishSSEConnection()
        sseConnection.onMessage(HandleSSEMessage)
        sseConnection.onError(HandleConnectionError)
        sseConnection.onClose(HandleConnectionClose)

        // Initialize state
        tickerState.currentTool ← null
        tickerState.messageQueue ← new Queue()
        tickerState.animationState ← 'idle'
        tickerState.lastUpdate ← CurrentTime()

        // Start message processing loop
        StartMessageProcessor()
    END

    FUNCTION HandleSSEMessage(message)
    BEGIN
        parsedMessage ← ParseSSEMessage(message)

        SWITCH parsedMessage.event
            CASE 'tool-activity':
                HandleToolActivity(parsedMessage.data)

            CASE 'tool-status':
                HandleToolStatus(parsedMessage.data)

            CASE 'error':
                HandleError(parsedMessage.data)

            CASE 'heartbeat':
                HandleHeartbeat(parsedMessage.data)
        END SWITCH
    END

    FUNCTION HandleToolActivity(data)
    BEGIN
        toolMessage ← {
            type: data.type,
            toolName: data.tool,
            action: data.action,
            data: data,
            priority: DeterminePriority(data.type),
            timestamp: ParseTimestamp(data.timestamp)
        }

        // Add to queue if not at capacity
        IF tickerState.messageQueue.size() < QUEUE_CAPACITY THEN
            tickerState.messageQueue.enqueue(toolMessage)
        ELSE
            // Remove oldest low-priority messages
            RemoveOldLowPriorityMessages()
            tickerState.messageQueue.enqueue(toolMessage)
        END IF

        // Trigger immediate update for high priority
        IF toolMessage.priority = 'high' THEN
            updateScheduler.scheduleImmediate(ProcessMessageQueue)
        ELSE
            updateScheduler.schedule(ProcessMessageQueue)
        END IF
    END

    FUNCTION ProcessMessageQueue()
    BEGIN
        IF tickerState.messageQueue.isEmpty() THEN
            HandleIdleState()
            RETURN
        END IF

        nextMessage ← tickerState.messageQueue.peek()

        // Check if we need to wait for current animation
        IF tickerState.animationState IN ['entering', 'exiting'] THEN
            // Wait for animation to complete
            RETURN
        END IF

        // Process next message
        message ← tickerState.messageQueue.dequeue()
        UpdateTickerDisplay(message)
    END

    FUNCTION UpdateTickerDisplay(message)
    BEGIN
        newToolDisplay ← CreateToolDisplay(message)

        IF tickerState.currentTool is null THEN
            // First display
            ShowTool(newToolDisplay)
        ELSE IF tickerState.currentTool.toolName = newToolDisplay.toolName THEN
            // Update existing tool
            UpdateCurrentTool(newToolDisplay)
        ELSE
            // Switch to new tool
            TransitionToNewTool(newToolDisplay)
        END IF

        tickerState.lastUpdate ← CurrentTime()
    END

    FUNCTION CreateToolDisplay(message)
    BEGIN
        RETURN {
            toolName: message.toolName,
            action: FormatAction(message.action),
            status: DetermineStatus(message.type, message.data),
            progress: ExtractProgress(message.data),
            startTime: message.timestamp,
            duration: CalculateDuration(message),
            icon: GetToolIcon(message.toolName)
        }
    END

    FUNCTION ShowTool(toolDisplay)
    BEGIN
        tickerState.animationState ← 'entering'
        animationManager.enter(toolDisplay, ANIMATION_DURATION)

        // Set timeout for animation completion
        SetTimeout(ANIMATION_DURATION, () => {
            tickerState.animationState ← 'idle'
            tickerState.currentTool ← toolDisplay

            // Process next message if queued
            IF NOT tickerState.messageQueue.isEmpty() THEN
                updateScheduler.schedule(ProcessMessageQueue)
            END IF
        })
    END

    FUNCTION UpdateCurrentTool(newToolDisplay)
    BEGIN
        IF ShouldAnimate(tickerState.currentTool, newToolDisplay) THEN
            tickerState.animationState ← 'updating'
            animationManager.update(tickerState.currentTool, newToolDisplay, ANIMATION_DURATION)

            SetTimeout(ANIMATION_DURATION, () => {
                tickerState.animationState ← 'idle'
                tickerState.currentTool ← newToolDisplay
            })
        ELSE
            // Instant update for minor changes
            tickerState.currentTool ← newToolDisplay
            animationManager.updateImmediate(newToolDisplay)
        END IF
    END

    FUNCTION TransitionToNewTool(newToolDisplay)
    BEGIN
        tickerState.animationState ← 'exiting'

        // Fade out current tool
        animationManager.exit(tickerState.currentTool, ANIMATION_DURATION / 2)

        SetTimeout(ANIMATION_DURATION / 2, () => {
            // Fade in new tool
            ShowTool(newToolDisplay)
        })
    END

    FUNCTION HandleIdleState()
    BEGIN
        IF tickerState.currentTool is not null AND
           (CurrentTime() - tickerState.lastUpdate) > DISPLAY_TIMEOUT THEN

            // Hide ticker after timeout
            tickerState.animationState ← 'exiting'
            animationManager.exit(tickerState.currentTool, ANIMATION_DURATION)

            SetTimeout(ANIMATION_DURATION, () => {
                tickerState.currentTool ← null
                tickerState.animationState ← 'idle'
            })
        END IF
    END

    FUNCTION DeterminePriority(messageType)
    BEGIN
        SWITCH messageType
            CASE 'tool-error':
                RETURN 'high'
            CASE 'tool-start':
                RETURN 'high'
            CASE 'tool-complete':
                RETURN 'medium'
            DEFAULT:
                RETURN 'low'
        END SWITCH
    END

    FUNCTION ShouldAnimate(oldTool, newTool)
    BEGIN
        // Animate if status changes significantly
        IF oldTool.status ≠ newTool.status THEN
            RETURN true
        END IF

        // Animate if action changes
        IF oldTool.action ≠ newTool.action THEN
            RETURN true
        END IF

        // Don't animate for minor progress updates
        RETURN false
    END
END
```

### 3.2 Animation Manager

```
ALGORITHM: TickerAnimationManager
INPUT: animation commands
OUTPUT: DOM animations

CONSTANTS:
    EASING_CURVE = 'cubic-bezier(0.4, 0, 0.2, 1)'
    TRANSFORM_ORIGIN = 'center'

DATA STRUCTURES:
    AnimationState:
        element: DOMElement
        currentAnimation: Animation?
        pendingCallbacks: Function[]

BEGIN
    animationState ← new AnimationState()

    FUNCTION Initialize(tickerElement)
    BEGIN
        animationState.element ← tickerElement
        animationState.currentAnimation ← null
        animationState.pendingCallbacks ← []
    END

    FUNCTION Enter(toolDisplay, duration)
    BEGIN
        // Cancel any existing animation
        CancelCurrentAnimation()

        // Create enter animation
        keyframes ← [
            { opacity: 0, transform: 'translateY(-10px) scale(0.95)' },
            { opacity: 1, transform: 'translateY(0) scale(1)' }
        ]

        options ← {
            duration: duration,
            easing: EASING_CURVE,
            fill: 'forwards'
        }

        animation ← animationState.element.animate(keyframes, options)
        animationState.currentAnimation ← animation

        // Update content immediately
        UpdateTickerContent(toolDisplay)

        RETURN animation
    END

    FUNCTION Update(oldTool, newTool, duration)
    BEGIN
        // Create subtle update animation
        keyframes ← [
            { opacity: 1, transform: 'scale(1)' },
            { opacity: 0.8, transform: 'scale(1.05)' },
            { opacity: 1, transform: 'scale(1)' }
        ]

        options ← {
            duration: duration,
            easing: EASING_CURVE
        }

        animation ← animationState.element.animate(keyframes, options)
        animationState.currentAnimation ← animation

        // Update content at midpoint
        SetTimeout(duration / 2, () => {
            UpdateTickerContent(newTool)
        })

        RETURN animation
    END

    FUNCTION Exit(toolDisplay, duration)
    BEGIN
        // Cancel any existing animation
        CancelCurrentAnimation()

        // Create exit animation
        keyframes ← [
            { opacity: 1, transform: 'translateY(0) scale(1)' },
            { opacity: 0, transform: 'translateY(10px) scale(0.95)' }
        ]

        options ← {
            duration: duration,
            easing: EASING_CURVE,
            fill: 'forwards'
        }

        animation ← animationState.element.animate(keyframes, options)
        animationState.currentAnimation ← animation

        RETURN animation
    END

    FUNCTION UpdateImmediate(toolDisplay)
    BEGIN
        // Instant update without animation
        UpdateTickerContent(toolDisplay)
    END

    FUNCTION UpdateTickerContent(toolDisplay)
    BEGIN
        // Update tool icon
        iconElement ← animationState.element.querySelector('.tool-icon')
        iconElement.textContent ← toolDisplay.icon

        // Update tool name
        nameElement ← animationState.element.querySelector('.tool-name')
        nameElement.textContent ← toolDisplay.toolName

        // Update action text
        actionElement ← animationState.element.querySelector('.tool-action')
        actionElement.textContent ← toolDisplay.action

        // Update status indicator
        statusElement ← animationState.element.querySelector('.tool-status')
        statusElement.className ← `tool-status ${toolDisplay.status}`

        // Update progress if applicable
        IF toolDisplay.progress is not null THEN
            progressElement ← animationState.element.querySelector('.tool-progress')
            IF progressElement is not null THEN
                progressElement.style.width ← `${toolDisplay.progress}%`
            END IF
        END IF

        // Update duration display
        IF toolDisplay.duration is not null THEN
            durationElement ← animationState.element.querySelector('.tool-duration')
            IF durationElement is not null THEN
                durationElement.textContent ← FormatDuration(toolDisplay.duration)
            END IF
        END IF
    END

    FUNCTION CancelCurrentAnimation()
    BEGIN
        IF animationState.currentAnimation is not null THEN
            animationState.currentAnimation.cancel()
            animationState.currentAnimation ← null
        END IF

        // Execute any pending callbacks
        FOR EACH callback IN animationState.pendingCallbacks DO
            callback()
        END FOR
        animationState.pendingCallbacks ← []
    END

    FUNCTION FormatDuration(milliseconds)
    BEGIN
        IF milliseconds < 1000 THEN
            RETURN `${milliseconds}ms`
        ELSE IF milliseconds < 60000 THEN
            seconds ← Math.round(milliseconds / 1000)
            RETURN `${seconds}s`
        ELSE
            minutes ← Math.floor(milliseconds / 60000)
            seconds ← Math.round((milliseconds % 60000) / 1000)
            RETURN `${minutes}m ${seconds}s`
        END IF
    END
END
```

---

## 4. Error Recovery Algorithm

### 4.1 Connection Recovery Manager

```
ALGORITHM: ErrorRecoveryManager
INPUT: error events, connection state
OUTPUT: recovery actions

CONSTANTS:
    MAX_RETRY_ATTEMPTS = 5
    BASE_RETRY_DELAY = 1000      // 1 second
    MAX_RETRY_DELAY = 30000      // 30 seconds
    CONNECTION_TIMEOUT = 10000    // 10 seconds
    HEALTH_CHECK_INTERVAL = 5000  // 5 seconds

DATA STRUCTURES:
    RecoveryState:
        retryCount: integer
        lastError: Error?
        isRecovering: boolean
        recoveryStrategy: string
        circuitBreakerState: 'closed' | 'open' | 'half-open'

    ErrorPattern:
        type: string
        frequency: integer
        lastOccurrence: timestamp
        recoveryAction: string

BEGIN
    recoveryState ← new RecoveryState()
    errorPatterns ← new HashMap<string, ErrorPattern>()
    circuitBreaker ← new CircuitBreaker()

    FUNCTION Initialize()
    BEGIN
        recoveryState.retryCount ← 0
        recoveryState.lastError ← null
        recoveryState.isRecovering ← false
        recoveryState.recoveryStrategy ← 'exponential_backoff'
        recoveryState.circuitBreakerState ← 'closed'

        // Start health monitoring
        SetInterval(HEALTH_CHECK_INTERVAL, PerformHealthCheck)
    END

    FUNCTION HandleConnectionError(error)
    BEGIN
        LogError(error)

        // Record error pattern
        RecordErrorPattern(error)

        // Update recovery state
        recoveryState.lastError ← error

        // Determine recovery strategy
        strategy ← DetermineRecoveryStrategy(error)

        SWITCH strategy
            CASE 'immediate_retry':
                ExecuteImmediateRetry()

            CASE 'exponential_backoff':
                ExecuteExponentialBackoff()

            CASE 'circuit_breaker':
                ExecuteCircuitBreaker()

            CASE 'fallback_polling':
                ExecuteFallbackPolling()

            CASE 'user_intervention':
                RequestUserIntervention(error)
        END SWITCH
    END

    FUNCTION DetermineRecoveryStrategy(error)
    BEGIN
        SWITCH error.type
            CASE 'NetworkError':
                IF error.code = 'ECONNRESET' THEN
                    RETURN 'immediate_retry'
                ELSE IF error.code = 'ENOTFOUND' THEN
                    RETURN 'exponential_backoff'
                ELSE
                    RETURN 'circuit_breaker'
                END IF

            CASE 'SSEError':
                IF error.code = 'ConnectionClosed' THEN
                    RETURN 'immediate_retry'
                ELSE
                    RETURN 'exponential_backoff'
                END IF

            CASE 'AuthenticationError':
                RETURN 'user_intervention'

            CASE 'RateLimitError':
                RETURN 'exponential_backoff'

            DEFAULT:
                RETURN 'exponential_backoff'
        END SWITCH
    END

    FUNCTION ExecuteImmediateRetry()
    BEGIN
        IF recoveryState.retryCount >= MAX_RETRY_ATTEMPTS THEN
            ExecuteFallbackPolling()
            RETURN
        END IF

        recoveryState.isRecovering ← true
        recoveryState.retryCount ← recoveryState.retryCount + 1

        TRY
            // Attempt reconnection
            newConnection ← EstablishSSEConnection()

            IF newConnection.isConnected() THEN
                OnRecoverySuccess()
            ELSE
                // Failed, try exponential backoff
                ExecuteExponentialBackoff()
            END IF

        CATCH error
            LogError("Immediate retry failed", error)
            ExecuteExponentialBackoff()
        END TRY
    END

    FUNCTION ExecuteExponentialBackoff()
    BEGIN
        IF recoveryState.retryCount >= MAX_RETRY_ATTEMPTS THEN
            ExecuteFallbackPolling()
            RETURN
        END IF

        // Calculate backoff delay
        delay ← CalculateBackoffDelay(recoveryState.retryCount)

        recoveryState.isRecovering ← true
        recoveryState.retryCount ← recoveryState.retryCount + 1

        // Show user feedback
        ShowRecoveryProgress("Reconnecting", delay)

        SetTimeout(delay, () => {
            TRY
                newConnection ← EstablishSSEConnection()

                IF newConnection.isConnected() THEN
                    OnRecoverySuccess()
                ELSE
                    ExecuteExponentialBackoff()
                END IF

            CATCH error
                LogError("Exponential backoff retry failed", error)
                ExecuteExponentialBackoff()
            END TRY
        })
    END

    FUNCTION CalculateBackoffDelay(retryCount)
    BEGIN
        // Exponential backoff with jitter
        baseDelay ← BASE_RETRY_DELAY * Math.pow(2, retryCount - 1)
        jitter ← Math.random() * 0.1 * baseDelay
        delay ← Math.min(baseDelay + jitter, MAX_RETRY_DELAY)

        RETURN delay
    END

    FUNCTION ExecuteCircuitBreaker()
    BEGIN
        SWITCH recoveryState.circuitBreakerState
            CASE 'closed':
                // Too many failures, open circuit
                recoveryState.circuitBreakerState ← 'open'
                ExecuteFallbackPolling()

                // Schedule half-open attempt
                SetTimeout(30000, () => {
                    recoveryState.circuitBreakerState ← 'half-open'
                    ExecuteExponentialBackoff()
                })

            CASE 'half-open':
                // Test if service is back
                TRY
                    testConnection ← EstablishSSEConnection()
                    IF testConnection.isConnected() THEN
                        recoveryState.circuitBreakerState ← 'closed'
                        OnRecoverySuccess()
                    ELSE
                        recoveryState.circuitBreakerState ← 'open'
                        ExecuteFallbackPolling()
                    END IF
                CATCH error
                    recoveryState.circuitBreakerState ← 'open'
                    ExecuteFallbackPolling()
                END TRY

            CASE 'open':
                // Circuit is open, use fallback
                ExecuteFallbackPolling()
        END SWITCH
    END

    FUNCTION ExecuteFallbackPolling()
    BEGIN
        recoveryState.isRecovering ← true

        // Switch to HTTP polling as fallback
        ShowUserMessage("Connection lost, switching to polling mode")

        pollingManager ← new PollingManager()
        pollingManager.start({
            interval: 2000,
            endpoint: '/api/claude/status',
            onData: HandlePollingData,
            onError: HandlePollingError
        })

        // Continue trying to restore SSE in background
        SetInterval(60000, () => {
            IF recoveryState.circuitBreakerState ≠ 'open' THEN
                TryRestoreSSE()
            END IF
        })
    END

    FUNCTION TryRestoreSSE()
    BEGIN
        TRY
            testConnection ← EstablishSSEConnection()
            IF testConnection.isConnected() THEN
                // Successfully restored SSE
                pollingManager.stop()
                OnRecoverySuccess()
                ShowUserMessage("Real-time connection restored")
            END IF
        CATCH error
            // SSE still not available, continue polling
            LogError("SSE restoration attempt failed", error)
        END TRY
    END

    FUNCTION OnRecoverySuccess()
    BEGIN
        recoveryState.retryCount ← 0
        recoveryState.lastError ← null
        recoveryState.isRecovering ← false
        recoveryState.circuitBreakerState ← 'closed'

        HideRecoveryProgress()
        ShowSuccessMessage("Connection restored")

        // Resume normal operation
        ResumeNormalOperation()
    END

    FUNCTION RecordErrorPattern(error)
    BEGIN
        errorKey ← `${error.type}-${error.code}`

        IF errorPatterns.has(errorKey) THEN
            pattern ← errorPatterns.get(errorKey)
            pattern.frequency ← pattern.frequency + 1
            pattern.lastOccurrence ← CurrentTime()
        ELSE
            pattern ← {
                type: errorKey,
                frequency: 1,
                lastOccurrence: CurrentTime(),
                recoveryAction: DetermineRecoveryStrategy(error)
            }
            errorPatterns.set(errorKey, pattern)
        END IF
    END

    FUNCTION PerformHealthCheck()
    BEGIN
        IF NOT recoveryState.isRecovering THEN
            TRY
                // Ping server to check connectivity
                response ← Fetch('/api/health')
                IF response.status ≠ 200 THEN
                    LogWarning("Health check failed", response.status)
                END IF
            CATCH error
                LogError("Health check error", error)
                HandleConnectionError(error)
            END TRY
        END IF
    END

    FUNCTION ShowRecoveryProgress(message, estimatedTime)
    BEGIN
        // Display recovery UI to user
        progressUI ← {
            message: message,
            estimatedTime: estimatedTime,
            retryCount: recoveryState.retryCount,
            maxRetries: MAX_RETRY_ATTEMPTS
        }

        DisplayRecoveryUI(progressUI)
    END
END
```

### 4.2 Data Integrity Manager

```
ALGORITHM: DataIntegrityManager
INPUT: streaming data chunks
OUTPUT: validated and recovered data

CONSTANTS:
    CHECKSUM_ALGORITHM = 'SHA-256'
    MAX_SEQUENCE_GAP = 100
    REORDER_BUFFER_SIZE = 50
    DUPLICATE_DETECTION_WINDOW = 1000  // messages

DATA STRUCTURES:
    MessageState:
        sequence: integer
        checksum: string
        timestamp: timestamp
        data: any
        processed: boolean

    ReorderBuffer:
        messages: Map<sequence, MessageState>
        expectedSequence: integer
        maxSequence: integer

BEGIN
    reorderBuffer ← new ReorderBuffer()
    duplicateCache ← new LRUCache(DUPLICATE_DETECTION_WINDOW)
    integrityMetrics ← new IntegrityMetrics()

    FUNCTION ProcessIncomingMessage(rawMessage)
    BEGIN
        TRY
            // Parse and validate message structure
            message ← ParseMessage(rawMessage)
            IF NOT ValidateMessageStructure(message) THEN
                LogError("Invalid message structure", message)
                RETURN null
            END IF

            // Check for duplicates
            messageId ← GenerateMessageId(message)
            IF duplicateCache.has(messageId) THEN
                integrityMetrics.duplicateCount ← integrityMetrics.duplicateCount + 1
                LogWarning("Duplicate message detected", messageId)
                RETURN null
            END IF

            // Add to duplicate cache
            duplicateCache.set(messageId, true)

            // Validate checksum if present
            IF message.checksum is not null THEN
                calculatedChecksum ← CalculateChecksum(message.data)
                IF calculatedChecksum ≠ message.checksum THEN
                    integrityMetrics.checksumFailures ← integrityMetrics.checksumFailures + 1
                    LogError("Checksum validation failed", message)
                    RequestMessageRetransmission(message.sequence)
                    RETURN null
                END IF
            END IF

            // Handle sequence ordering
            IF message.sequence is not null THEN
                ProcessSequencedMessage(message)
            ELSE
                // Process immediately for non-sequenced messages
                ProcessValidatedMessage(message)
            END IF

        CATCH error
            LogError("Message processing failed", error)
            integrityMetrics.processingErrors ← integrityMetrics.processingErrors + 1
            RETURN null
        END TRY
    END

    FUNCTION ProcessSequencedMessage(message)
    BEGIN
        messageState ← {
            sequence: message.sequence,
            checksum: message.checksum,
            timestamp: message.timestamp,
            data: message.data,
            processed: false
        }

        // Add to reorder buffer
        reorderBuffer.messages.set(message.sequence, messageState)

        // Update sequence tracking
        IF message.sequence > reorderBuffer.maxSequence THEN
            reorderBuffer.maxSequence ← message.sequence
        END IF

        // Process messages in order
        ProcessOrderedMessages()

        // Check for sequence gaps
        DetectAndHandleSequenceGaps()
    END

    FUNCTION ProcessOrderedMessages()
    BEGIN
        WHILE reorderBuffer.messages.has(reorderBuffer.expectedSequence) DO
            messageState ← reorderBuffer.messages.get(reorderBuffer.expectedSequence)

            IF NOT messageState.processed THEN
                ProcessValidatedMessage(messageState.data)
                messageState.processed ← true
            END IF

            // Remove processed message
            reorderBuffer.messages.delete(reorderBuffer.expectedSequence)
            reorderBuffer.expectedSequence ← reorderBuffer.expectedSequence + 1
        END WHILE
    END

    FUNCTION DetectAndHandleSequenceGaps()
    BEGIN
        sequenceGap ← reorderBuffer.maxSequence - reorderBuffer.expectedSequence

        IF sequenceGap > MAX_SEQUENCE_GAP THEN
            // Large gap detected, request missing messages
            FOR sequence = reorderBuffer.expectedSequence TO reorderBuffer.maxSequence DO
                IF NOT reorderBuffer.messages.has(sequence) THEN
                    RequestMessageRetransmission(sequence)
                END IF
            END FOR

            integrityMetrics.sequenceGaps ← integrityMetrics.sequenceGaps + 1
            LogWarning("Large sequence gap detected", sequenceGap)
        END IF

        // Clean up old messages in buffer
        CleanupReorderBuffer()
    END

    FUNCTION RequestMessageRetransmission(sequence)
    BEGIN
        retransmissionRequest ← {
            type: 'retransmission-request',
            sequence: sequence,
            timestamp: CurrentTime()
        }

        // Send request to server (implementation depends on protocol)
        SendControlMessage(retransmissionRequest)

        integrityMetrics.retransmissionRequests ← integrityMetrics.retransmissionRequests + 1
    END

    FUNCTION ProcessValidatedMessage(messageData)
    BEGIN
        // Apply message to application state
        SWITCH messageData.type
            CASE 'tool-activity':
                UpdateToolActivity(messageData)

            CASE 'tool-status':
                UpdateToolStatus(messageData)

            CASE 'system-message':
                HandleSystemMessage(messageData)

            CASE 'error':
                HandleErrorMessage(messageData)
        END SWITCH

        integrityMetrics.messagesProcessed ← integrityMetrics.messagesProcessed + 1
    END

    FUNCTION CalculateChecksum(data)
    BEGIN
        // Calculate checksum using specified algorithm
        serializedData ← JSON.stringify(data)
        checksum ← Hash(serializedData, CHECKSUM_ALGORITHM)
        RETURN checksum
    END

    FUNCTION ValidateMessageStructure(message)
    BEGIN
        // Validate required fields
        IF message.type is null OR message.timestamp is null THEN
            RETURN false
        END IF

        // Validate timestamp format
        IF NOT IsValidTimestamp(message.timestamp) THEN
            RETURN false
        END IF

        // Validate type-specific structure
        SWITCH message.type
            CASE 'tool-activity':
                RETURN ValidateToolActivityMessage(message)
            CASE 'tool-status':
                RETURN ValidateToolStatusMessage(message)
            DEFAULT:
                RETURN true
        END SWITCH
    END

    FUNCTION CleanupReorderBuffer()
    BEGIN
        // Remove messages older than buffer size
        cutoffSequence ← reorderBuffer.expectedSequence - REORDER_BUFFER_SIZE

        FOR EACH sequence IN reorderBuffer.messages.keys() DO
            IF sequence < cutoffSequence THEN
                reorderBuffer.messages.delete(sequence)
            END IF
        END FOR
    END

    FUNCTION GetIntegrityMetrics()
    BEGIN
        RETURN {
            messagesProcessed: integrityMetrics.messagesProcessed,
            duplicateCount: integrityMetrics.duplicateCount,
            checksumFailures: integrityMetrics.checksumFailures,
            processingErrors: integrityMetrics.processingErrors,
            sequenceGaps: integrityMetrics.sequenceGaps,
            retransmissionRequests: integrityMetrics.retransmissionRequests,
            bufferSize: reorderBuffer.messages.size(),
            expectedSequence: reorderBuffer.expectedSequence,
            maxSequence: reorderBuffer.maxSequence
        }
    END
END
```

---

## 5. Performance Optimization Algorithms

### 5.1 Message Throttling and Batching

```
ALGORITHM: MessageOptimizer
INPUT: high-frequency message stream
OUTPUT: optimized message batches

CONSTANTS:
    BATCH_SIZE = 10
    BATCH_TIMEOUT = 100          // milliseconds
    THROTTLE_WINDOW = 50         // milliseconds
    PRIORITY_BYPASS_THRESHOLD = 5 // high priority messages skip batching

DATA STRUCTURES:
    MessageBatch:
        messages: MessageState[]
        batchId: string
        startTime: timestamp
        priority: 'low' | 'medium' | 'high'

    ThrottleState:
        messageCount: integer
        windowStart: timestamp
        pendingMessages: Queue<MessageState>

BEGIN
    throttleState ← new ThrottleState()
    currentBatch ← new MessageBatch()
    batchProcessor ← new BatchProcessor()

    FUNCTION OptimizeMessageStream(inputStream)
    BEGIN
        inputStream.onMessage(HandleIncomingMessage)

        // Start batch processing timer
        SetInterval(BATCH_TIMEOUT, FlushCurrentBatch)

        // Start throttle window reset
        SetInterval(THROTTLE_WINDOW, ResetThrottleWindow)
    END

    FUNCTION HandleIncomingMessage(message)
    BEGIN
        messageState ← {
            data: message,
            priority: DetermineMessagePriority(message),
            timestamp: CurrentTime(),
            size: EstimateMessageSize(message)
        }

        // Check if high priority message should bypass optimization
        IF messageState.priority = 'high' AND
           currentBatch.messages.length < PRIORITY_BYPASS_THRESHOLD THEN
            ProcessMessageImmediate(messageState)
            RETURN
        END IF

        // Apply throttling
        IF ShouldThrottleMessage(messageState) THEN
            throttleState.pendingMessages.enqueue(messageState)
            RETURN
        END IF

        // Add to current batch
        AddToBatch(messageState)
    END

    FUNCTION DetermineMessagePriority(message)
    BEGIN
        SWITCH message.type
            CASE 'tool-error':
                RETURN 'high'
            CASE 'tool-start':
                RETURN 'high'
            CASE 'tool-complete':
                RETURN 'medium'
            CASE 'tool-output':
                // Priority based on output type
                IF message.data.contains('error') OR message.data.contains('warning') THEN
                    RETURN 'high'
                ELSE
                    RETURN 'low'
                END IF
            DEFAULT:
                RETURN 'low'
        END SWITCH
    END

    FUNCTION ShouldThrottleMessage(messageState)
    BEGIN
        // Don't throttle high priority messages
        IF messageState.priority = 'high' THEN
            RETURN false
        END IF

        // Check if we're within throttle limits
        currentWindow ← CurrentTime() - throttleState.windowStart
        IF currentWindow < THROTTLE_WINDOW THEN
            // Calculate throttle limit based on priority
            limit ← GetThrottleLimit(messageState.priority)
            RETURN throttleState.messageCount >= limit
        END IF

        RETURN false
    END

    FUNCTION GetThrottleLimit(priority)
    BEGIN
        SWITCH priority
            CASE 'high':
                RETURN 100  // No practical limit
            CASE 'medium':
                RETURN 20
            CASE 'low':
                RETURN 5
        END SWITCH
    END

    FUNCTION AddToBatch(messageState)
    BEGIN
        // Initialize batch if empty
        IF currentBatch.messages.length = 0 THEN
            currentBatch.batchId ← GenerateUniqueId()
            currentBatch.startTime ← CurrentTime()
            currentBatch.priority ← messageState.priority
        END IF

        currentBatch.messages.push(messageState)

        // Update batch priority (highest priority wins)
        IF messageState.priority = 'high' OR
           (messageState.priority = 'medium' AND currentBatch.priority = 'low') THEN
            currentBatch.priority ← messageState.priority
        END IF

        // Check if batch is full
        IF currentBatch.messages.length >= BATCH_SIZE THEN
            FlushCurrentBatch()
        END IF
    END

    FUNCTION FlushCurrentBatch()
    BEGIN
        IF currentBatch.messages.length = 0 THEN
            RETURN
        END IF

        // Process batch
        batchProcessor.process(currentBatch)

        // Reset for next batch
        currentBatch ← new MessageBatch()

        // Process any pending throttled messages
        ProcessPendingMessages()
    END

    FUNCTION ProcessPendingMessages()
    BEGIN
        processCount ← 0
        maxProcess ← 5  // Limit to prevent blocking

        WHILE NOT throttleState.pendingMessages.isEmpty() AND
              processCount < maxProcess DO

            messageState ← throttleState.pendingMessages.dequeue()
            AddToBatch(messageState)
            processCount ← processCount + 1
        END WHILE
    END

    FUNCTION ProcessMessageImmediate(messageState)
    BEGIN
        // Create single-message batch for immediate processing
        immediateBatch ← {
            messages: [messageState],
            batchId: GenerateUniqueId(),
            startTime: CurrentTime(),
            priority: messageState.priority
        }

        batchProcessor.process(immediateBatch)
    END

    FUNCTION ResetThrottleWindow()
    BEGIN
        throttleState.messageCount ← 0
        throttleState.windowStart ← CurrentTime()
    END

    FUNCTION EstimateMessageSize(message)
    BEGIN
        // Rough estimation of message size for bandwidth optimization
        jsonString ← JSON.stringify(message)
        RETURN jsonString.length
    END
END
```

### 5.2 Memory Management

```
ALGORITHM: MemoryManager
INPUT: continuous data stream
OUTPUT: memory-optimized operations

CONSTANTS:
    MAX_BUFFER_SIZE = 10485760    // 10MB
    CLEANUP_INTERVAL = 30000      // 30 seconds
    GC_THRESHOLD = 0.8            // 80% memory usage
    RETENTION_PERIOD = 300000     // 5 minutes

DATA STRUCTURES:
    MemoryPool:
        buffers: Map<bufferId, Buffer>
        totalSize: integer
        lastCleanup: timestamp

    ObjectCache:
        cache: LRUCache
        hitCount: integer
        missCount: integer

BEGIN
    memoryPool ← new MemoryPool()
    objectCache ← new LRUCache(1000)
    memoryMetrics ← new MemoryMetrics()

    FUNCTION Initialize()
    BEGIN
        memoryPool.buffers ← new Map()
        memoryPool.totalSize ← 0
        memoryPool.lastCleanup ← CurrentTime()

        // Start memory monitoring
        SetInterval(CLEANUP_INTERVAL, PerformMemoryCleanup)
        SetInterval(5000, UpdateMemoryMetrics)
    END

    FUNCTION AllocateBuffer(size, purpose)
    BEGIN
        // Check if allocation would exceed limits
        IF memoryPool.totalSize + size > MAX_BUFFER_SIZE THEN
            // Try to free memory first
            freedSize ← PerformMemoryCleanup()

            IF memoryPool.totalSize + size > MAX_BUFFER_SIZE THEN
                LogWarning("Memory allocation failed, size limit exceeded")
                RETURN null
            END IF
        END IF

        bufferId ← GenerateUniqueId()
        buffer ← {
            id: bufferId,
            data: new ArrayBuffer(size),
            size: size,
            purpose: purpose,
            created: CurrentTime(),
            lastAccessed: CurrentTime(),
            accessCount: 0
        }

        memoryPool.buffers.set(bufferId, buffer)
        memoryPool.totalSize ← memoryPool.totalSize + size

        RETURN buffer
    END

    FUNCTION ReleaseBuffer(bufferId)
    BEGIN
        buffer ← memoryPool.buffers.get(bufferId)
        IF buffer is null THEN
            RETURN false
        END IF

        memoryPool.buffers.delete(bufferId)
        memoryPool.totalSize ← memoryPool.totalSize - buffer.size

        // Force garbage collection hint
        IF memoryPool.totalSize < MAX_BUFFER_SIZE * 0.5 THEN
            RequestGarbageCollection()
        END IF

        RETURN true
    END

    FUNCTION PerformMemoryCleanup()
    BEGIN
        freedSize ← 0
        currentTime ← CurrentTime()
        expiredBuffers ← []

        // Find expired buffers
        FOR EACH buffer IN memoryPool.buffers.values() DO
            age ← currentTime - buffer.lastAccessed

            IF age > RETENTION_PERIOD THEN
                expiredBuffers.push(buffer.id)
            ELSE IF age > RETENTION_PERIOD / 2 AND buffer.accessCount < 2 THEN
                // Cleanup rarely accessed buffers
                expiredBuffers.push(buffer.id)
            END IF
        END FOR

        // Remove expired buffers
        FOR EACH bufferId IN expiredBuffers DO
            buffer ← memoryPool.buffers.get(bufferId)
            IF buffer is not null THEN
                freedSize ← freedSize + buffer.size
                ReleaseBuffer(bufferId)
            END IF
        END FOR

        // Clean object cache if memory pressure is high
        memoryUsageRatio ← memoryPool.totalSize / MAX_BUFFER_SIZE
        IF memoryUsageRatio > GC_THRESHOLD THEN
            objectCache.clear()
            RequestGarbageCollection()
        END IF

        memoryPool.lastCleanup ← currentTime
        LogDebug(`Memory cleanup freed ${freedSize} bytes`)

        RETURN freedSize
    END

    FUNCTION CacheObject(key, object, ttl?)
    BEGIN
        cacheEntry ← {
            data: object,
            created: CurrentTime(),
            ttl: ttl OR 300000,  // Default 5 minutes
            accessCount: 0,
            size: EstimateObjectSize(object)
        }

        success ← objectCache.set(key, cacheEntry)

        IF success THEN
            objectCache.hitCount ← objectCache.hitCount + 1
        ELSE
            objectCache.missCount ← objectCache.missCount + 1
        END IF

        RETURN success
    END

    FUNCTION RetrieveFromCache(key)
    BEGIN
        cacheEntry ← objectCache.get(key)

        IF cacheEntry is null THEN
            objectCache.missCount ← objectCache.missCount + 1
            RETURN null
        END IF

        // Check TTL
        age ← CurrentTime() - cacheEntry.created
        IF age > cacheEntry.ttl THEN
            objectCache.delete(key)
            objectCache.missCount ← objectCache.missCount + 1
            RETURN null
        END IF

        // Update access statistics
        cacheEntry.accessCount ← cacheEntry.accessCount + 1
        objectCache.hitCount ← objectCache.hitCount + 1

        RETURN cacheEntry.data
    END

    FUNCTION OptimizeStringOperations(strings)
    BEGIN
        // Use string interning for repeated strings
        internedStrings ← new Map()
        optimizedStrings ← []

        FOR EACH str IN strings DO
            IF internedStrings.has(str) THEN
                optimizedStrings.push(internedStrings.get(str))
            ELSE
                internedStrings.set(str, str)
                optimizedStrings.push(str)
            END IF
        END FOR

        RETURN optimizedStrings
    END

    FUNCTION RequestGarbageCollection()
    BEGIN
        // Hint to runtime for garbage collection
        IF typeof gc = 'function' THEN
            gc()
        END IF
    END

    FUNCTION UpdateMemoryMetrics()
    BEGIN
        memoryMetrics.totalBufferSize ← memoryPool.totalSize
        memoryMetrics.bufferCount ← memoryPool.buffers.size
        memoryMetrics.cacheHitRatio ← objectCache.hitCount / (objectCache.hitCount + objectCache.missCount)
        memoryMetrics.memoryUsageRatio ← memoryPool.totalSize / MAX_BUFFER_SIZE

        // Log warning if memory usage is high
        IF memoryMetrics.memoryUsageRatio > GC_THRESHOLD THEN
            LogWarning("High memory usage detected", memoryMetrics)
        END IF
    END

    FUNCTION EstimateObjectSize(object)
    BEGIN
        // Rough estimation of object size in memory
        jsonString ← JSON.stringify(object)
        RETURN jsonString.length * 2  // Approximate for UTF-16
    END

    FUNCTION GetMemoryMetrics()
    BEGIN
        RETURN {
            totalBufferSize: memoryMetrics.totalBufferSize,
            bufferCount: memoryMetrics.bufferCount,
            cacheHitRatio: memoryMetrics.cacheHitRatio,
            memoryUsageRatio: memoryMetrics.memoryUsageRatio,
            lastCleanup: memoryPool.lastCleanup
        }
    END
END
```

---

## Conclusion

These pseudocode algorithms provide a comprehensive foundation for implementing the Claude Code streaming ticker system. The algorithms address:

1. **Backend SSE Management**: Robust connection handling and message broadcasting
2. **Output Parsing**: Intelligent tool detection and stream processing
3. **Frontend Updates**: Smooth UI animations and state management
4. **Error Recovery**: Comprehensive error handling and connection recovery
5. **Performance**: Memory management and message optimization

### Key Design Principles

- **Real-time Performance**: Sub-100ms latency for tool updates
- **Robustness**: Comprehensive error recovery and fallback mechanisms
- **Scalability**: Efficient resource management and connection pooling
- **User Experience**: Smooth animations and clear progress indication

### Implementation Notes

- Use TypeScript for type safety and better development experience
- Implement comprehensive logging for debugging and monitoring
- Add performance metrics collection for optimization
- Include automated testing for all critical paths
- Design for horizontal scaling with stateless architecture

This pseudocode serves as the algorithmic foundation for the Architecture phase of the SPARC methodology.