# SPARC Pseudocode: Enhanced Live Activity System

## Document Overview

This document provides detailed algorithms and pseudocode for implementing real-time telemetry capture, event broadcasting, and data persistence for Claude Code SDK activity monitoring.

**Version:** 1.0.0
**Created:** 2025-10-25
**Status:** Design Phase

---

## Table of Contents

1. [Algorithm Overview](#algorithm-overview)
2. [Event Capture Algorithms](#event-capture-algorithms)
3. [Data Processing Algorithms](#data-processing-algorithms)
4. [Broadcasting Algorithms](#broadcasting-algorithms)
5. [Persistence Algorithms](#persistence-algorithms)
6. [Query Algorithms](#query-algorithms)
7. [Optimization Strategies](#optimization-strategies)
8. [Complexity Analysis](#complexity-analysis)
9. [Error Handling](#error-handling)
10. [Integration Points](#integration-points)

---

## 1. Algorithm Overview

### System Components

```
┌─────────────────────────────────────────────────────────────┐
│                    Live Activity System                      │
├─────────────────────────────────────────────────────────────┤
│                                                               │
│  ┌──────────────┐    ┌──────────────┐    ┌──────────────┐  │
│  │   Capture    │───>│  Processing  │───>│ Broadcasting │  │
│  │   Layer      │    │    Layer     │    │    Layer     │  │
│  └──────────────┘    └──────────────┘    └──────────────┘  │
│         │                    │                    │          │
│         └────────────────────┴────────────────────┘          │
│                              │                                │
│                    ┌─────────▼──────────┐                    │
│                    │   Persistence      │                    │
│                    │   Layer            │                    │
│                    └────────────────────┘                    │
└─────────────────────────────────────────────────────────────┘
```

### Core Algorithms

1. **Event Capture**
   - Tool execution tracking
   - Agent lifecycle management
   - Message flow monitoring

2. **Data Processing**
   - Progress calculation
   - Metrics aggregation
   - Performance analysis

3. **Broadcasting**
   - SSE event streaming
   - Buffer management
   - Retry logic

4. **Persistence**
   - Database writes
   - Transaction management
   - Error recovery

5. **Querying**
   - Session metrics retrieval
   - Performance queries
   - Real-time analytics

---

## 2. Event Capture Algorithms

### 2.1 Tool Execution Tracking

```pseudocode
ALGORITHM TrackToolExecution(toolName, toolInput, toolOutput, startTime, endTime)
  INPUT:
    toolName: String          // Name of the tool being executed
    toolInput: Object         // Input parameters to the tool
    toolOutput: Object        // Output from tool execution
    startTime: Timestamp      // Execution start time
    endTime: Timestamp        // Execution end time

  OUTPUT:
    event: ActivityEvent      // Structured activity event

  BEGIN
    // Calculate execution metrics
    duration = endTime - startTime
    status = (toolOutput.error != null) ? 'failed' : 'success'
    outputSize = calculateSize(toolOutput)

    // Extract tool-specific metadata
    metadata = extractToolMetadata(toolName, toolInput)

    // Create structured event
    event = {
      id: generateUUID(),
      type: 'tool_execution',
      session_id: getCurrentSessionId(),
      tool: toolName,
      action: formatToolAction(toolName, toolInput),
      duration_ms: duration,
      status: status,
      output_size_bytes: outputSize,
      error: toolOutput.error,
      file_path: extractFilePath(toolInput),
      metadata: metadata,
      timestamp: endTime,
      timestamp_start: startTime
    }

    // Async operations (non-blocking)
    async {
      broadcastToSSE(event)
      persistToDatabase(event)
      updateMetrics(event)
    }

    // Update in-memory session state
    updateSessionState(event)

    RETURN event
  END
END ALGORITHM

// Helper: Extract file path from tool input
FUNCTION extractFilePath(toolInput)
  BEGIN
    IF toolInput has 'file_path' THEN
      RETURN toolInput.file_path
    ELSE IF toolInput has 'path' THEN
      RETURN toolInput.path
    ELSE IF toolInput has 'notebook_path' THEN
      RETURN toolInput.notebook_path
    ELSE
      RETURN null
    END IF
  END
END FUNCTION

// Helper: Format human-readable action
FUNCTION formatToolAction(toolName, toolInput)
  BEGIN
    SWITCH toolName
      CASE 'Read':
        RETURN "Reading " + extractFileName(toolInput.file_path)
      CASE 'Write':
        RETURN "Writing to " + extractFileName(toolInput.file_path)
      CASE 'Edit':
        RETURN "Editing " + extractFileName(toolInput.file_path)
      CASE 'Bash':
        RETURN "Running: " + truncate(toolInput.command, 50)
      CASE 'Grep':
        RETURN "Searching for '" + toolInput.pattern + "'"
      CASE 'Glob':
        RETURN "Finding files matching '" + toolInput.pattern + "'"
      DEFAULT:
        RETURN toolName + " operation"
    END SWITCH
  END
END FUNCTION

// Helper: Calculate object size
FUNCTION calculateSize(obj)
  BEGIN
    IF obj is null THEN
      RETURN 0
    END IF

    jsonString = JSON.stringify(obj)
    RETURN length(jsonString)
  END
END FUNCTION
```

**Complexity:** O(1) for event creation, O(n) for size calculation where n is output size

---

### 2.2 Agent Lifecycle Management

```pseudocode
ALGORITHM ManageAgentLifecycle(sessionId, agentType, prompt, model, config)
  INPUT:
    sessionId: String         // Parent session identifier
    agentType: String         // Type of agent (e.g., 'researcher', 'coder')
    prompt: String            // Agent task description
    model: String             // Model being used
    config: Object            // Agent configuration

  OUTPUT:
    result: AgentResult       // Agent execution result

  BEGIN
    // Initialize agent tracking
    agentId = generateUUID()
    startTime = now()

    // Create agent context
    agentContext = {
      id: agentId,
      session_id: sessionId,
      type: agentType,
      model: model,
      start_time: startTime,
      status: 'initializing'
    }

    // Store agent in active agents map
    activeAgents.set(agentId, agentContext)

    // Emit start event
    emitEvent('agent_started', {
      agent_id: agentId,
      session_id: sessionId,
      agent_type: agentType,
      prompt: truncate(prompt, 200),
      model: model,
      config: sanitizeConfig(config),
      timestamp: startTime
    })

    TRY
      // Update status
      agentContext.status = 'running'
      emitEvent('agent_status_changed', {
        agent_id: agentId,
        status: 'running',
        timestamp: now()
      })

      // Execute agent with telemetry
      result = executeAgentWithTelemetry(agentId, prompt, model, config)

      // Calculate metrics
      endTime = now()
      duration = endTime - startTime

      // Update context
      agentContext.status = 'completed'
      agentContext.end_time = endTime
      agentContext.duration = duration
      agentContext.result = result

      // Emit completion event
      emitEvent('agent_completed', {
        agent_id: agentId,
        session_id: sessionId,
        status: 'success',
        result: sanitizeResult(result),
        duration_ms: duration,
        tokens_used: result.usage?.total_tokens || 0,
        cost: calculateCost(result.usage, model),
        tools_used: extractToolsUsed(result),
        timestamp: endTime
      })

      RETURN result

    CATCH error
      // Handle failure
      endTime = now()
      duration = endTime - startTime

      agentContext.status = 'failed'
      agentContext.end_time = endTime
      agentContext.error = error

      // Emit failure event
      emitEvent('agent_failed', {
        agent_id: agentId,
        session_id: sessionId,
        status: 'failed',
        error: {
          message: error.message,
          type: error.type,
          stack: sanitizeStack(error.stack)
        },
        duration_ms: duration,
        timestamp: endTime
      })

      THROW error

    FINALLY
      // Cleanup: Remove from active agents
      activeAgents.delete(agentId)

      // Archive agent context
      archiveAgentContext(agentId, agentContext)
    END TRY
  END
END ALGORITHM

// Helper: Execute agent with telemetry hooks
FUNCTION executeAgentWithTelemetry(agentId, prompt, model, config)
  BEGIN
    // Wrap tool calls with telemetry
    instrumentedConfig = {
      ...config,
      onToolCall: (toolName, input) => {
        emitEvent('agent_tool_started', {
          agent_id: agentId,
          tool: toolName,
          timestamp: now()
        })
      },
      onToolComplete: (toolName, output, duration) => {
        emitEvent('agent_tool_completed', {
          agent_id: agentId,
          tool: toolName,
          duration_ms: duration,
          timestamp: now()
        })
      }
    }

    // Execute agent
    result = claudeAPI.chat(prompt, model, instrumentedConfig)

    RETURN result
  END
END FUNCTION
```

**Complexity:** O(1) for lifecycle management, O(n) for agent execution where n is task complexity

---

### 2.3 Message Flow Monitoring

```pseudocode
ALGORITHM MonitorMessageFlow(conversationId, messages, currentIndex)
  INPUT:
    conversationId: String    // Conversation identifier
    messages: Array           // Array of conversation messages
    currentIndex: Integer     // Current message index

  OUTPUT:
    flowEvent: FlowEvent      // Message flow event

  BEGIN
    currentMessage = messages[currentIndex]
    previousMessage = (currentIndex > 0) ? messages[currentIndex - 1] : null

    // Detect message type
    messageType = detectMessageType(currentMessage)

    // Calculate thinking time (time between messages)
    thinkingTime = 0
    IF previousMessage != null THEN
      thinkingTime = currentMessage.timestamp - previousMessage.timestamp
    END IF

    // Detect multi-step workflows
    isMultiStep = detectMultiStepWorkflow(messages)

    // Create flow event
    flowEvent = {
      id: generateUUID(),
      type: 'message_flow',
      conversation_id: conversationId,
      message_index: currentIndex,
      message_type: messageType,
      thinking_time_ms: thinkingTime,
      is_multi_step: isMultiStep,
      role: currentMessage.role,
      content_length: length(currentMessage.content),
      tool_calls: extractToolCalls(currentMessage),
      timestamp: now()
    }

    // Emit event
    emitEvent('message_flow', flowEvent)

    // Update conversation metrics
    updateConversationMetrics(conversationId, flowEvent)

    RETURN flowEvent
  END
END ALGORITHM

// Helper: Detect message type
FUNCTION detectMessageType(message)
  BEGIN
    IF message.role == 'user' THEN
      RETURN 'user_input'
    ELSE IF message.role == 'assistant' THEN
      IF message has tool_calls THEN
        RETURN 'tool_execution'
      ELSE
        RETURN 'assistant_response'
      END IF
    ELSE IF message.role == 'system' THEN
      RETURN 'system_message'
    ELSE
      RETURN 'unknown'
    END IF
  END
END FUNCTION

// Helper: Detect multi-step workflow
FUNCTION detectMultiStepWorkflow(messages)
  BEGIN
    // Count assistant messages with tool calls
    toolUseCount = count(messages, m => m.role == 'assistant' AND m has tool_calls)

    // Multi-step if more than 2 tool-using messages
    RETURN toolUseCount > 2
  END
END FUNCTION
```

**Complexity:** O(n) where n is the number of messages in the conversation

---

## 3. Data Processing Algorithms

### 3.1 Progress Calculation

```pseudocode
ALGORITHM CalculateProgress(sessionId, messages, currentIndex)
  INPUT:
    sessionId: String         // Session identifier
    messages: Array           // Conversation messages
    currentIndex: Integer     // Current message index

  OUTPUT:
    progress: ProgressMetrics // Progress information or null

  BEGIN
    // Early exit if not a multi-step task
    IF NOT isMultiStepTask(messages) THEN
      RETURN null
    END IF

    // Identify distinct steps
    steps = identifySteps(messages)
    totalSteps = length(steps)

    // Find current step
    currentStep = findCurrentStep(steps, currentIndex)
    currentStepNumber = indexOf(steps, currentStep) + 1

    // Calculate percentage
    percentage = (currentStepNumber / totalSteps) * 100

    // Estimate time remaining
    eta = estimateTimeRemaining(steps, currentStepNumber)

    // Get step description
    stepDescription = extractStepDescription(currentStep)

    progress = {
      session_id: sessionId,
      current_step: currentStepNumber,
      total_steps: totalSteps,
      percentage: round(percentage, 2),
      eta_seconds: eta,
      step_description: stepDescription,
      completed_steps: getCompletedSteps(steps, currentStepNumber),
      timestamp: now()
    }

    // Emit progress event
    emitEvent('progress_update', progress)

    RETURN progress
  END
END ALGORITHM

// Helper: Identify steps in conversation
FUNCTION identifySteps(messages)
  BEGIN
    steps = []

    FOR EACH message IN messages DO
      IF message.role == 'assistant' AND message has tool_calls THEN
        // Each tool call sequence is a step
        step = {
          index: length(steps),
          message_index: indexOf(messages, message),
          tools: extractToolNames(message.tool_calls),
          start_time: message.timestamp,
          end_time: null,
          duration: null,
          status: 'pending'
        }
        steps.append(step)
      ELSE IF message.role == 'tool' AND length(steps) > 0 THEN
        // Mark step as completed
        lastStep = steps[length(steps) - 1]
        lastStep.end_time = message.timestamp
        lastStep.duration = message.timestamp - lastStep.start_time
        lastStep.status = 'completed'
      END IF
    END FOR

    RETURN steps
  END
END ALGORITHM

// Helper: Estimate time remaining
FUNCTION estimateTimeRemaining(steps, currentStepNumber)
  BEGIN
    // Calculate average duration of completed steps
    completedSteps = filter(steps, s => s.status == 'completed')

    IF length(completedSteps) == 0 THEN
      RETURN null  // Not enough data
    END IF

    totalDuration = sum(completedSteps.map(s => s.duration))
    avgStepDuration = totalDuration / length(completedSteps)

    // Remaining steps
    remainingSteps = length(steps) - currentStepNumber

    // Estimate
    eta = avgStepDuration * remainingSteps

    RETURN round(eta / 1000)  // Convert to seconds
  END
END ALGORITHM

// Helper: Check if multi-step task
FUNCTION isMultiStepTask(messages)
  BEGIN
    // Count tool-using messages
    toolMessages = filter(messages, m => m.role == 'assistant' AND m has tool_calls)

    // Multi-step if 3+ tool executions
    RETURN length(toolMessages) >= 3
  END
END FUNCTION
```

**Complexity:** O(n) where n is the number of messages

---

### 3.2 Performance Metrics Calculation

```pseudocode
ALGORITHM CalculatePerformanceMetrics(sessionId, timeWindowSeconds)
  INPUT:
    sessionId: String         // Session identifier (or 'global' for all)
    timeWindowSeconds: Integer // Time window for metrics (e.g., 3600 for 1 hour)

  OUTPUT:
    metrics: PerformanceMetrics // Aggregated performance data

  BEGIN
    // Fetch events in time window
    endTime = now()
    startTime = endTime - (timeWindowSeconds * 1000)

    IF sessionId == 'global' THEN
      events = fetchAllEventsInWindow(startTime, endTime)
    ELSE
      events = fetchSessionEventsInWindow(sessionId, startTime, endTime)
    END IF

    // Filter tool execution events
    toolEvents = filter(events, e => e.type == 'tool_execution')

    // Calculate latency percentiles
    latencies = toolEvents.map(e => e.duration_ms)
    sortedLatencies = sort(latencies)

    p50 = percentile(sortedLatencies, 0.50)
    p95 = percentile(sortedLatencies, 0.95)
    p99 = percentile(sortedLatencies, 0.99)
    avgLatency = average(latencies)
    maxLatency = max(latencies)

    // Calculate throughput (events per hour)
    durationHours = timeWindowSeconds / 3600
    throughput = length(events) / durationHours

    // Calculate error rate
    errorEvents = filter(events, e => e.status == 'failed')
    errorRate = length(errorEvents) / length(events)

    // Calculate cache metrics
    cacheHits = countCacheHits(toolEvents)
    cacheableRequests = countCacheableRequests(toolEvents)
    cacheHitRate = (cacheableRequests > 0) ? cacheHits / cacheableRequests : 0

    // Token usage
    tokenEvents = filter(events, e => e.tokens_used != null)
    totalTokens = sum(tokenEvents.map(e => e.tokens_used))
    avgTokensPerRequest = (length(tokenEvents) > 0) ? totalTokens / length(tokenEvents) : 0

    // Cost metrics
    totalCost = sum(events.map(e => e.cost || 0))

    // Tool usage breakdown
    toolUsage = aggregateToolUsage(toolEvents)

    metrics = {
      session_id: sessionId,
      time_window_seconds: timeWindowSeconds,
      start_time: startTime,
      end_time: endTime,

      // Latency metrics
      latency_p50_ms: round(p50, 2),
      latency_p95_ms: round(p95, 2),
      latency_p99_ms: round(p99, 2),
      latency_avg_ms: round(avgLatency, 2),
      latency_max_ms: maxLatency,

      // Throughput
      throughput_per_hour: round(throughput, 2),
      total_events: length(events),

      // Error metrics
      error_count: length(errorEvents),
      error_rate: round(errorRate * 100, 2),

      // Cache metrics
      cache_hits: cacheHits,
      cache_misses: cacheableRequests - cacheHits,
      cache_hit_rate: round(cacheHitRate * 100, 2),

      // Token metrics
      total_tokens: totalTokens,
      avg_tokens_per_request: round(avgTokensPerRequest, 0),

      // Cost
      total_cost_usd: round(totalCost, 4),

      // Tool breakdown
      tool_usage: toolUsage,

      timestamp: now()
    }

    RETURN metrics
  END
END ALGORITHM

// Helper: Aggregate tool usage statistics
FUNCTION aggregateToolUsage(toolEvents)
  BEGIN
    toolGroups = groupBy(toolEvents, 'tool')
    usage = []

    FOR EACH (toolName, events) IN toolGroups DO
      durations = events.map(e => e.duration_ms)
      errors = filter(events, e => e.status == 'failed')

      usage.append({
        tool: toolName,
        count: length(events),
        avg_duration_ms: round(average(durations), 2),
        max_duration_ms: max(durations),
        error_count: length(errors),
        error_rate: round(length(errors) / length(events) * 100, 2)
      })
    END FOR

    // Sort by usage count
    usage = sortBy(usage, 'count', 'desc')

    RETURN usage
  END
END FUNCTION

// Helper: Calculate percentile
FUNCTION percentile(sortedArray, p)
  BEGIN
    IF length(sortedArray) == 0 THEN
      RETURN 0
    END IF

    index = ceil(length(sortedArray) * p) - 1
    index = max(0, min(index, length(sortedArray) - 1))

    RETURN sortedArray[index]
  END
END FUNCTION
```

**Complexity:** O(n log n) due to sorting for percentile calculation, where n is event count

---

### 3.3 Session Metrics Aggregation

```pseudocode
ALGORITHM AggregateSessionMetrics(sessionId)
  INPUT:
    sessionId: String         // Session identifier

  OUTPUT:
    summary: SessionSummary   // Comprehensive session summary

  BEGIN
    // Fetch all events for session
    events = fetchEventsBySession(sessionId)

    IF length(events) == 0 THEN
      RETURN null
    END IF

    // Time metrics
    startTime = min(events.map(e => e.timestamp))
    endTime = max(events.map(e => e.timestamp))
    duration = endTime - startTime

    // Request metrics
    requestCount = countRequests(events)
    successCount = countSuccesses(events)
    failureCount = countFailures(events)

    // Token metrics
    tokenEvents = filter(events, e => e.tokens_used != null)
    totalTokens = sum(tokenEvents.map(e => e.tokens_used))
    inputTokens = sum(tokenEvents.map(e => e.input_tokens || 0))
    outputTokens = sum(tokenEvents.map(e => e.output_tokens || 0))
    cacheReadTokens = sum(tokenEvents.map(e => e.cache_read_tokens || 0))
    cacheCreationTokens = sum(tokenEvents.map(e => e.cache_creation_tokens || 0))

    // Cost metrics
    totalCost = sum(events.map(e => e.cost || 0))

    // Tool usage breakdown
    toolEvents = filter(events, e => e.type == 'tool_execution')
    toolUsage = aggregateToolUsage(toolEvents)

    // Agent metrics
    agentEvents = filter(events, e => e.type.startsWith('agent_'))
    agentCount = countUniqueAgents(agentEvents)
    agentTypes = extractAgentTypes(agentEvents)

    // Model usage
    modelUsage = aggregateModelUsage(events)

    // Determine session status
    status = determineSessionStatus(events)

    summary = {
      session_id: sessionId,

      // Time metrics
      start_time: startTime,
      end_time: endTime,
      duration_ms: duration,
      duration_formatted: formatDuration(duration),

      // Request metrics
      request_count: requestCount,
      success_count: successCount,
      failure_count: failureCount,
      success_rate: round(successCount / requestCount * 100, 2),

      // Token metrics
      total_tokens: totalTokens,
      input_tokens: inputTokens,
      output_tokens: outputTokens,
      cache_read_tokens: cacheReadTokens,
      cache_creation_tokens: cacheCreationTokens,
      cache_efficiency: calculateCacheEfficiency(cacheReadTokens, totalTokens),

      // Cost metrics
      total_cost_usd: round(totalCost, 4),
      cost_per_request: round(totalCost / requestCount, 6),

      // Tool metrics
      tool_count: length(toolUsage),
      tool_usage: toolUsage,
      most_used_tool: toolUsage[0]?.tool || null,

      // Agent metrics
      agent_count: agentCount,
      agent_types: agentTypes,

      // Model metrics
      model_usage: modelUsage,
      primary_model: modelUsage[0]?.model || null,

      // Status
      status: status,

      timestamp: now()
    }

    // Persist summary
    persistSessionSummary(summary)

    RETURN summary
  END
END ALGORITHM

// Helper: Determine session status
FUNCTION determineSessionStatus(events)
  BEGIN
    // Check for any active agents
    activeAgents = filter(events, e =>
      e.type == 'agent_started' AND
      NOT exists(events, end => end.type == 'agent_completed' AND end.agent_id == e.agent_id)
    )

    IF length(activeAgents) > 0 THEN
      RETURN 'active'
    END IF

    // Check for recent activity (within last 5 minutes)
    lastEventTime = max(events.map(e => e.timestamp))
    timeSinceLastEvent = now() - lastEventTime

    IF timeSinceLastEvent < 300000 THEN  // 5 minutes
      RETURN 'active'
    END IF

    // Check for failures
    failures = filter(events, e => e.status == 'failed')
    IF length(failures) > 0 THEN
      RETURN 'completed_with_errors'
    END IF

    RETURN 'completed'
  END
END FUNCTION

// Helper: Calculate cache efficiency
FUNCTION calculateCacheEfficiency(cacheReadTokens, totalTokens)
  BEGIN
    IF totalTokens == 0 THEN
      RETURN 0
    END IF

    efficiency = (cacheReadTokens / totalTokens) * 100
    RETURN round(efficiency, 2)
  END
END FUNCTION
```

**Complexity:** O(n) where n is the number of events in the session

---

## 4. Broadcasting Algorithms

### 4.1 SSE Event Broadcasting with Buffering

```pseudocode
ALGORITHM BroadcastEventWithBuffer(event, priority)
  INPUT:
    event: ActivityEvent      // Event to broadcast
    priority: String          // 'high', 'normal', 'low'

  OUTPUT:
    success: Boolean          // Whether broadcast succeeded

  BEGIN
    // Add event metadata
    event.broadcast_id = generateUUID()
    event.broadcast_time = now()
    event.priority = priority

    // Add to buffer for resilience
    bufferEntry = {
      id: event.broadcast_id,
      event: event,
      added_time: now(),
      retry_count: 0,
      status: 'pending'
    }
    eventBuffer.add(bufferEntry)

    // Attempt immediate broadcast
    TRY
      // Serialize event
      eventData = JSON.stringify(event)

      // Send to all connected clients
      connectedClients = getConnectedSSEClients()

      FOR EACH client IN connectedClients DO
        // Check if client is subscribed to this event type
        IF client.isSubscribedTo(event.type) THEN
          client.send({
            event: event.type,
            data: eventData,
            id: event.broadcast_id
          })
        END IF
      END FOR

      // Mark as sent in buffer
      bufferEntry.status = 'sent'
      bufferEntry.sent_time = now()

      // Emit broadcast success metric
      emitMetric('broadcast_success', {
        event_type: event.type,
        client_count: length(connectedClients)
      })

      RETURN true

    CATCH error
      // Keep in buffer for retry
      bufferEntry.status = 'failed'
      bufferEntry.error = error.message

      // Schedule retry based on priority
      retryDelay = calculateRetryDelay(priority, bufferEntry.retry_count)
      scheduleRetry(event.broadcast_id, retryDelay)

      // Emit broadcast failure metric
      emitMetric('broadcast_failure', {
        event_type: event.type,
        error: error.message
      })

      RETURN false

    FINALLY
      // Cleanup old events from buffer
      cleanupEventBuffer()
    END TRY
  END
END ALGORITHM

// Helper: Calculate retry delay with exponential backoff
FUNCTION calculateRetryDelay(priority, retryCount)
  BEGIN
    baseDelay = SWITCH priority
      CASE 'high': 1000      // 1 second
      CASE 'normal': 5000    // 5 seconds
      CASE 'low': 15000      // 15 seconds
    END SWITCH

    // Exponential backoff: delay * 2^retryCount
    delay = baseDelay * (2 ^ retryCount)

    // Cap at maximum
    maxDelay = 60000  // 1 minute
    delay = min(delay, maxDelay)

    RETURN delay
  END
END FUNCTION

// Helper: Schedule retry
FUNCTION scheduleRetry(broadcastId, delayMs)
  BEGIN
    setTimeout(() => {
      retryBroadcast(broadcastId)
    }, delayMs)
  END
END FUNCTION

// Helper: Retry broadcast
FUNCTION retryBroadcast(broadcastId)
  BEGIN
    bufferEntry = eventBuffer.get(broadcastId)

    IF bufferEntry == null OR bufferEntry.retry_count >= MAX_RETRIES THEN
      // Give up after max retries
      IF bufferEntry != null THEN
        bufferEntry.status = 'abandoned'
        logError('Broadcast abandoned after max retries', bufferEntry)
      END IF
      RETURN
    END IF

    // Increment retry count
    bufferEntry.retry_count += 1
    bufferEntry.status = 'retrying'

    // Attempt broadcast again
    success = broadcastEventWithBuffer(bufferEntry.event, bufferEntry.event.priority)

    IF NOT success THEN
      // Will be scheduled for another retry
      logWarning('Broadcast retry failed', {
        broadcast_id: broadcastId,
        retry_count: bufferEntry.retry_count
      })
    END IF
  END
END FUNCTION

// Helper: Cleanup old events from buffer
FUNCTION cleanupEventBuffer()
  BEGIN
    currentTime = now()
    maxAge = 3600000  // 1 hour

    // Remove old sent events
    eventBuffer.removeIf(entry =>
      entry.status == 'sent' AND
      (currentTime - entry.sent_time) > maxAge
    )

    // Remove abandoned events
    eventBuffer.removeIf(entry => entry.status == 'abandoned')

    // Enforce max buffer size
    IF eventBuffer.size > MAX_BUFFER_SIZE THEN
      // Remove oldest low-priority events
      entriesToRemove = eventBuffer.size - MAX_BUFFER_SIZE
      oldestLowPriority = eventBuffer
        .filter(e => e.event.priority == 'low')
        .sortBy('added_time')
        .take(entriesToRemove)

      FOR EACH entry IN oldestLowPriority DO
        eventBuffer.remove(entry.id)
      END FOR
    END IF
  END
END FUNCTION
```

**Complexity:** O(n) where n is the number of connected clients, O(log n) for buffer cleanup

---

### 4.2 SSE Connection Management

```pseudocode
ALGORITHM ManageSSEConnection(request, response)
  INPUT:
    request: HTTPRequest      // Client HTTP request
    response: HTTPResponse    // Server HTTP response

  OUTPUT:
    connection: SSEConnection // Managed SSE connection

  BEGIN
    // Extract client info
    clientId = extractClientId(request) || generateUUID()
    sessionId = extractSessionId(request)

    // Set SSE headers
    response.writeHead(200, {
      'Content-Type': 'text/event-stream',
      'Cache-Control': 'no-cache',
      'Connection': 'keep-alive',
      'X-Accel-Buffering': 'no'  // Disable nginx buffering
    })

    // Create connection object
    connection = {
      id: clientId,
      session_id: sessionId,
      response: response,
      connected_at: now(),
      last_event_at: now(),
      subscriptions: extractSubscriptions(request) || ['all'],
      is_active: true
    }

    // Add to active connections
    activeConnections.set(clientId, connection)

    // Send initial connection event
    sendSSEEvent(connection, {
      event: 'connected',
      data: {
        client_id: clientId,
        session_id: sessionId,
        timestamp: now()
      }
    })

    // Setup heartbeat
    heartbeatInterval = setInterval(() => {
      IF connection.is_active THEN
        sendSSEEvent(connection, {
          event: 'heartbeat',
          data: { timestamp: now() }
        })
      ELSE
        clearInterval(heartbeatInterval)
      END IF
    }, 30000)  // Every 30 seconds

    // Handle client disconnect
    request.on('close', () => {
      connection.is_active = false
      connection.disconnected_at = now()
      activeConnections.delete(clientId)
      clearInterval(heartbeatInterval)

      // Emit disconnect event
      emitMetric('client_disconnected', {
        client_id: clientId,
        session_id: sessionId,
        duration_ms: connection.disconnected_at - connection.connected_at
      })
    })

    // Handle errors
    response.on('error', (error) => {
      logError('SSE connection error', {
        client_id: clientId,
        error: error.message
      })
      connection.is_active = false
      activeConnections.delete(clientId)
      clearInterval(heartbeatInterval)
    })

    RETURN connection
  END
END ALGORITHM

// Helper: Send SSE event
FUNCTION sendSSEEvent(connection, { event, data, id })
  BEGIN
    IF NOT connection.is_active THEN
      RETURN false
    END IF

    TRY
      // Format SSE message
      message = ''

      IF id != null THEN
        message += 'id: ' + id + '\n'
      END IF

      IF event != null THEN
        message += 'event: ' + event + '\n'
      END IF

      dataString = (typeof data == 'string') ? data : JSON.stringify(data)
      message += 'data: ' + dataString + '\n\n'

      // Send to client
      connection.response.write(message)

      // Update last event time
      connection.last_event_at = now()

      RETURN true

    CATCH error
      logError('Failed to send SSE event', {
        client_id: connection.id,
        error: error.message
      })
      RETURN false
    END TRY
  END
END FUNCTION

// Helper: Check if client is subscribed to event type
FUNCTION isSubscribedTo(connection, eventType)
  BEGIN
    // 'all' subscription receives everything
    IF connection.subscriptions.includes('all') THEN
      RETURN true
    END IF

    // Check specific event type
    RETURN connection.subscriptions.includes(eventType)
  END
END FUNCTION
```

**Complexity:** O(1) for connection management, O(n) for broadcasting to all clients

---

## 5. Persistence Algorithms

### 5.1 Database Write with Error Handling

```pseudocode
ALGORITHM PersistActivityEvent(event)
  INPUT:
    event: ActivityEvent      // Event to persist

  OUTPUT:
    success: Boolean          // Whether persistence succeeded

  BEGIN
    // Validate event schema
    IF NOT validateEventSchema(event) THEN
      logError('Invalid event schema', {
        event_type: event.type,
        validation_errors: getValidationErrors(event)
      })
      RETURN false
    END IF

    // Sanitize sensitive data
    sanitizedEvent = sanitizeEvent(event)

    // Add persistence metadata
    sanitizedEvent.persisted_at = now()
    sanitizedEvent.persistence_version = SCHEMA_VERSION

    // Retry logic
    maxRetries = 3
    retryCount = 0
    lastError = null

    WHILE retryCount < maxRetries DO
      TRY
        // Start transaction
        transaction = db.beginTransaction()

        TRY
          // Insert main event
          eventId = db.insert('activity_events', sanitizedEvent)

          // Insert related records
          IF event.type == 'tool_execution' THEN
            insertToolExecutionDetails(transaction, eventId, event)
          ELSE IF event.type.startsWith('agent_') THEN
            insertAgentEventDetails(transaction, eventId, event)
          END IF

          // Update session metrics
          updateSessionMetricsTable(transaction, event.session_id)

          // Commit transaction
          transaction.commit()

          // Update event count metrics
          incrementEventCounter(event.type)

          // Emit persistence success metric
          emitMetric('persistence_success', {
            event_type: event.type,
            retry_count: retryCount
          })

          RETURN true

        CATCH transactionError
          // Rollback transaction
          transaction.rollback()
          THROW transactionError
        END TRY

      CATCH error
        lastError = error
        retryCount = retryCount + 1

        logWarning('Database write failed, retrying', {
          event_type: event.type,
          retry_count: retryCount,
          error: error.message
        })

        IF retryCount < maxRetries THEN
          // Exponential backoff
          backoffMs = exponentialBackoff(retryCount, baseMs = 100)
          sleep(backoffMs)
        END IF
      END TRY
    END WHILE

    // All retries failed
    logError('Database write failed after max retries', {
      event_type: event.type,
      max_retries: maxRetries,
      last_error: lastError.message
    })

    // Write to fallback buffer
    success = writeFallbackBuffer(sanitizedEvent)

    // Alert on persistence failure
    alertOnPersistenceFailure(lastError, event)

    // Emit persistence failure metric
    emitMetric('persistence_failure', {
      event_type: event.type,
      error: lastError.message
    })

    RETURN false
  END
END ALGORITHM

// Helper: Validate event schema
FUNCTION validateEventSchema(event)
  BEGIN
    // Required fields for all events
    requiredFields = ['id', 'type', 'session_id', 'timestamp']

    FOR EACH field IN requiredFields DO
      IF NOT event has field THEN
        RETURN false
      END IF
    END FOR

    // Type-specific validation
    SWITCH event.type
      CASE 'tool_execution':
        RETURN event has 'tool' AND event has 'duration_ms'
      CASE 'agent_started':
        RETURN event has 'agent_id' AND event has 'agent_type'
      CASE 'agent_completed':
        RETURN event has 'agent_id' AND event has 'status'
      DEFAULT:
        RETURN true
    END SWITCH
  END
END FUNCTION

// Helper: Sanitize event data
FUNCTION sanitizeEvent(event)
  BEGIN
    sanitized = clone(event)

    // Remove or redact sensitive fields
    sensitiveFields = ['api_key', 'password', 'token', 'secret']

    FOR EACH field IN sensitiveFields DO
      IF sanitized has field THEN
        sanitized[field] = '[REDACTED]'
      END IF
    END FOR

    // Truncate long strings
    IF sanitized has 'prompt' AND length(sanitized.prompt) > 1000 THEN
      sanitized.prompt = truncate(sanitized.prompt, 1000) + '...'
    END IF

    IF sanitized has 'output' AND length(sanitized.output) > 5000 THEN
      sanitized.output = truncate(sanitized.output, 5000) + '...'
    END IF

    RETURN sanitized
  END
END FUNCTION

// Helper: Exponential backoff
FUNCTION exponentialBackoff(attempt, baseMs)
  BEGIN
    // backoff = baseMs * 2^attempt + random jitter
    backoff = baseMs * (2 ^ attempt)
    jitter = random(0, backoff * 0.1)  // 10% jitter

    RETURN backoff + jitter
  END
END FUNCTION

// Helper: Write to fallback buffer
FUNCTION writeFallbackBuffer(event)
  BEGIN
    TRY
      // Write to file-based buffer
      bufferPath = getFallbackBufferPath()
      appendToFile(bufferPath, JSON.stringify(event) + '\n')

      // Schedule retry from buffer
      scheduleFallbackBufferProcessing()

      RETURN true
    CATCH error
      logError('Failed to write to fallback buffer', error)
      RETURN false
    END TRY
  END
END FUNCTION
```

**Complexity:** O(1) for single event persistence, O(n) worst case with retries

---

### 5.2 Batch Persistence Optimization

```pseudocode
ALGORITHM BatchPersistEvents(events, maxBatchSize)
  INPUT:
    events: Array<ActivityEvent>  // Events to persist
    maxBatchSize: Integer          // Maximum batch size

  OUTPUT:
    results: BatchResult          // Persistence results

  BEGIN
    // Split into batches
    batches = splitIntoBatches(events, maxBatchSize)

    results = {
      total: length(events),
      successful: 0,
      failed: 0,
      batches_processed: 0,
      errors: []
    }

    FOR EACH batch IN batches DO
      TRY
        // Start transaction for batch
        transaction = db.beginTransaction()

        TRY
          // Prepare batch insert
          sanitizedBatch = batch.map(e => sanitizeEvent(e))

          // Bulk insert
          insertedIds = db.bulkInsert('activity_events', sanitizedBatch)

          // Update related tables in batch
          FOR i = 0 TO length(batch) - 1 DO
            event = batch[i]
            eventId = insertedIds[i]

            IF event.type == 'tool_execution' THEN
              insertToolExecutionDetails(transaction, eventId, event)
            ELSE IF event.type.startsWith('agent_') THEN
              insertAgentEventDetails(transaction, eventId, event)
            END IF
          END FOR

          // Commit batch
          transaction.commit()

          results.successful += length(batch)
          results.batches_processed += 1

        CATCH transactionError
          transaction.rollback()
          THROW transactionError
        END TRY

      CATCH error
        // Log batch failure
        logError('Batch persistence failed', {
          batch_size: length(batch),
          error: error.message
        })

        results.failed += length(batch)
        results.errors.append({
          batch_index: results.batches_processed,
          error: error.message,
          event_count: length(batch)
        })

        // Fall back to individual persistence for this batch
        FOR EACH event IN batch DO
          IF persistActivityEvent(event) THEN
            results.successful += 1
            results.failed -= 1
          END IF
        END FOR
      END TRY
    END FOR

    // Emit batch metrics
    emitMetric('batch_persistence', {
      total: results.total,
      successful: results.successful,
      failed: results.failed,
      success_rate: results.successful / results.total * 100
    })

    RETURN results
  END
END ALGORITHM

// Helper: Split events into batches
FUNCTION splitIntoBatches(events, maxBatchSize)
  BEGIN
    batches = []
    currentBatch = []

    FOR EACH event IN events DO
      currentBatch.append(event)

      IF length(currentBatch) >= maxBatchSize THEN
        batches.append(currentBatch)
        currentBatch = []
      END IF
    END FOR

    // Add remaining events
    IF length(currentBatch) > 0 THEN
      batches.append(currentBatch)
    END IF

    RETURN batches
  END
END FUNCTION
```

**Complexity:** O(n) where n is the number of events, with significant performance improvement over individual inserts

---

## 6. Query Algorithms

### 6.1 Session Activity Query

```pseudocode
ALGORITHM QuerySessionActivity(sessionId, filters, pagination)
  INPUT:
    sessionId: String         // Session identifier
    filters: QueryFilters     // Optional filters (event types, time range, etc.)
    pagination: Pagination    // Page number and size

  OUTPUT:
    result: QueryResult       // Activity events and metadata

  BEGIN
    // Build query
    query = buildQuery()
    query.where('session_id', '=', sessionId)

    // Apply filters
    IF filters.eventTypes != null THEN
      query.whereIn('type', filters.eventTypes)
    END IF

    IF filters.startTime != null THEN
      query.where('timestamp', '>=', filters.startTime)
    END IF

    IF filters.endTime != null THEN
      query.where('timestamp', '<=', filters.endTime)
    END IF

    IF filters.status != null THEN
      query.where('status', '=', filters.status)
    END IF

    IF filters.tool != null THEN
      query.where('tool', '=', filters.tool)
    END IF

    // Get total count (before pagination)
    totalCount = query.count()

    // Apply pagination
    pageSize = pagination.pageSize || 50
    pageNumber = pagination.pageNumber || 1
    offset = (pageNumber - 1) * pageSize

    query.limit(pageSize)
    query.offset(offset)

    // Apply sorting
    sortBy = filters.sortBy || 'timestamp'
    sortOrder = filters.sortOrder || 'desc'
    query.orderBy(sortBy, sortOrder)

    // Execute query
    events = query.execute()

    // Calculate pagination metadata
    totalPages = ceil(totalCount / pageSize)
    hasNextPage = pageNumber < totalPages
    hasPreviousPage = pageNumber > 1

    result = {
      session_id: sessionId,
      events: events,
      pagination: {
        total_count: totalCount,
        page_number: pageNumber,
        page_size: pageSize,
        total_pages: totalPages,
        has_next_page: hasNextPage,
        has_previous_page: hasPreviousPage
      },
      filters_applied: filters,
      timestamp: now()
    }

    RETURN result
  END
END ALGORITHM
```

**Complexity:** O(log n + k) where n is total events, k is page size (with proper indexing)

---

### 6.2 Performance Analytics Query

```pseudocode
ALGORITHM QueryPerformanceAnalytics(timeRange, granularity, groupBy)
  INPUT:
    timeRange: TimeRange      // Start and end time
    granularity: String       // 'minute', 'hour', 'day'
    groupBy: String           // 'tool', 'session', 'agent_type', etc.

  OUTPUT:
    analytics: AnalyticsResult // Time-series performance data

  BEGIN
    // Determine time buckets
    buckets = generateTimeBuckets(timeRange.start, timeRange.end, granularity)

    // Initialize result structure
    analytics = {
      time_range: timeRange,
      granularity: granularity,
      group_by: groupBy,
      series: [],
      summary: {}
    }

    // Query events in time range
    query = buildQuery()
    query.where('timestamp', '>=', timeRange.start)
    query.where('timestamp', '<=', timeRange.end)

    // Group by specified dimension
    IF groupBy != null THEN
      query.groupBy(groupBy)
    END IF

    // Add time bucket grouping
    query.groupBy(timeBucket('timestamp', granularity))

    // Aggregate metrics
    query.select([
      timeBucket('timestamp', granularity) AS 'time_bucket',
      groupBy AS 'group_value',
      count(*) AS 'event_count',
      avg('duration_ms') AS 'avg_duration',
      percentile('duration_ms', 0.95) AS 'p95_duration',
      sum('tokens_used') AS 'total_tokens',
      sum('cost') AS 'total_cost',
      countIf('status = "failed"') AS 'error_count'
    ])

    // Execute query
    results = query.execute()

    // Transform results into time series
    IF groupBy != null THEN
      // Multiple series (one per group)
      groups = unique(results.map(r => r.group_value))

      FOR EACH group IN groups DO
        groupResults = filter(results, r => r.group_value == group)

        series = {
          name: group,
          data_points: []
        }

        FOR EACH bucket IN buckets DO
          dataPoint = findDataPoint(groupResults, bucket)

          series.data_points.append({
            timestamp: bucket,
            event_count: dataPoint?.event_count || 0,
            avg_duration_ms: dataPoint?.avg_duration || 0,
            p95_duration_ms: dataPoint?.p95_duration || 0,
            total_tokens: dataPoint?.total_tokens || 0,
            total_cost: dataPoint?.total_cost || 0,
            error_count: dataPoint?.error_count || 0
          })
        END FOR

        analytics.series.append(series)
      END FOR
    ELSE
      // Single series
      series = {
        name: 'all',
        data_points: []
      }

      FOR EACH bucket IN buckets DO
        dataPoint = findDataPoint(results, bucket)

        series.data_points.append({
          timestamp: bucket,
          event_count: dataPoint?.event_count || 0,
          avg_duration_ms: dataPoint?.avg_duration || 0,
          p95_duration_ms: dataPoint?.p95_duration || 0,
          total_tokens: dataPoint?.total_tokens || 0,
          total_cost: dataPoint?.total_cost || 0,
          error_count: dataPoint?.error_count || 0
        })
      END FOR

      analytics.series.append(series)
    END IF

    // Calculate summary statistics
    analytics.summary = {
      total_events: sum(results.map(r => r.event_count)),
      avg_events_per_bucket: average(results.map(r => r.event_count)),
      total_tokens: sum(results.map(r => r.total_tokens)),
      total_cost: sum(results.map(r => r.total_cost)),
      total_errors: sum(results.map(r => r.error_count)),
      error_rate: sum(results.map(r => r.error_count)) / sum(results.map(r => r.event_count)) * 100
    }

    RETURN analytics
  END
END ALGORITHM

// Helper: Generate time buckets
FUNCTION generateTimeBuckets(startTime, endTime, granularity)
  BEGIN
    buckets = []
    current = roundDownToGranularity(startTime, granularity)

    WHILE current <= endTime DO
      buckets.append(current)
      current = incrementByGranularity(current, granularity)
    END WHILE

    RETURN buckets
  END
END FUNCTION

// Helper: Round down to granularity
FUNCTION roundDownToGranularity(timestamp, granularity)
  BEGIN
    date = new Date(timestamp)

    SWITCH granularity
      CASE 'minute':
        date.setSeconds(0, 0)
      CASE 'hour':
        date.setMinutes(0, 0, 0)
      CASE 'day':
        date.setHours(0, 0, 0, 0)
    END SWITCH

    RETURN date.getTime()
  END
END FUNCTION
```

**Complexity:** O(n + b*g) where n is events in range, b is number of buckets, g is number of groups

---

## 7. Optimization Strategies

### 7.1 Event Caching Strategy

```pseudocode
ALGORITHM CacheEventData(key, data, ttlSeconds)
  INPUT:
    key: String               // Cache key
    data: Any                 // Data to cache
    ttlSeconds: Integer       // Time to live in seconds

  OUTPUT:
    success: Boolean          // Whether caching succeeded

  BEGIN
    TRY
      // Serialize data
      serialized = JSON.stringify(data)

      // Compress if large
      IF length(serialized) > COMPRESSION_THRESHOLD THEN
        serialized = compress(serialized)
        key = key + ':compressed'
      END IF

      // Store in cache
      cache.set(key, serialized, ttlSeconds)

      // Track cache metrics
      incrementCacheMetric('writes')

      RETURN true

    CATCH error
      logError('Cache write failed', { key: key, error: error.message })
      RETURN false
    END TRY
  END
END ALGORITHM

ALGORITHM GetCachedEventData(key)
  INPUT:
    key: String               // Cache key

  OUTPUT:
    data: Any | null          // Cached data or null if not found

  BEGIN
    TRY
      // Try to get from cache
      serialized = cache.get(key)

      IF serialized == null THEN
        incrementCacheMetric('misses')
        RETURN null
      END IF

      // Decompress if needed
      IF key.endsWith(':compressed') THEN
        serialized = decompress(serialized)
      END IF

      // Deserialize
      data = JSON.parse(serialized)

      // Track cache hit
      incrementCacheMetric('hits')

      RETURN data

    CATCH error
      logError('Cache read failed', { key: key, error: error.message })
      incrementCacheMetric('errors')
      RETURN null
    END TRY
  END
END ALGORITHM

// Multi-level cache strategy
ALGORITHM GetEventDataWithCache(sessionId, queryParams)
  INPUT:
    sessionId: String         // Session identifier
    queryParams: Object       // Query parameters

  OUTPUT:
    data: QueryResult         // Event data

  BEGIN
    // Generate cache key
    cacheKey = generateCacheKey('session', sessionId, queryParams)

    // Level 1: In-memory cache (fastest)
    data = memoryCache.get(cacheKey)
    IF data != null THEN
      RETURN data
    END IF

    // Level 2: Redis cache (fast)
    data = getCachedEventData(cacheKey)
    IF data != null THEN
      // Populate memory cache
      memoryCache.set(cacheKey, data, 60)  // 60 second TTL
      RETURN data
    END IF

    // Level 3: Database (slow)
    data = querySessionActivity(sessionId, queryParams.filters, queryParams.pagination)

    // Populate caches
    cacheEventData(cacheKey, data, 300)  // 5 minute TTL in Redis
    memoryCache.set(cacheKey, data, 60)   // 1 minute TTL in memory

    RETURN data
  END
END ALGORITHM
```

**Complexity:** O(1) for cache hit, O(n) for cache miss requiring database query

---

### 7.2 Database Query Optimization

```pseudocode
ALGORITHM OptimizeEventQuery(query)
  INPUT:
    query: QueryBuilder       // Query to optimize

  OUTPUT:
    optimized: QueryBuilder   // Optimized query

  BEGIN
    optimized = clone(query)

    // 1. Add proper indexes
    ensureIndexes([
      'idx_session_timestamp' ON (session_id, timestamp),
      'idx_type_timestamp' ON (type, timestamp),
      'idx_status' ON (status),
      'idx_tool' ON (tool)
    ])

    // 2. Use covering indexes when possible
    IF query.isSelectingOnlyIndexedColumns() THEN
      optimized.hint('USE INDEX (covering_index)')
    END IF

    // 3. Optimize time range queries
    IF query.hasTimeRangeFilter() THEN
      // Partition pruning
      partitions = determineRelevantPartitions(query.timeRange)
      optimized.partitions(partitions)
    END IF

    // 4. Limit result set early
    IF NOT query.hasLimit() THEN
      optimized.limit(1000)  // Default max
    END IF

    // 5. Use COUNT optimization for large datasets
    IF query.needsCount() AND query.estimatedRowCount() > 10000 THEN
      // Use approximate count for large datasets
      optimized.useApproximateCount()
    END IF

    // 6. Optimize JOIN operations
    IF query.hasJoins() THEN
      // Reorder joins for optimal execution
      optimized = reorderJoins(optimized)
    END IF

    // 7. Add query timeout
    optimized.timeout(30000)  // 30 second timeout

    RETURN optimized
  END
END ALGORITHM

// Table partitioning strategy
ALGORITHM PartitionEventTable(table, partitionBy)
  INPUT:
    table: String             // Table name
    partitionBy: String       // Partition strategy ('daily', 'weekly', 'monthly')

  OUTPUT:
    success: Boolean          // Whether partitioning succeeded

  BEGIN
    SWITCH partitionBy
      CASE 'daily':
        partitionDuration = 86400000  // 1 day in ms
      CASE 'weekly':
        partitionDuration = 604800000  // 7 days in ms
      CASE 'monthly':
        partitionDuration = 2592000000  // 30 days in ms
    END SWITCH

    // Create partitioned table
    sql = `
      ALTER TABLE ${table}
      PARTITION BY RANGE (UNIX_TIMESTAMP(timestamp)) (
        -- Partitions created dynamically
      )
    `

    // Create partitions for last 90 days + future
    startDate = now() - (90 * 86400000)
    endDate = now() + (30 * 86400000)

    current = startDate
    WHILE current <= endDate DO
      partitionName = generatePartitionName(table, current)
      partitionEnd = current + partitionDuration

      sql += `
        PARTITION ${partitionName} VALUES LESS THAN (UNIX_TIMESTAMP('${partitionEnd}')),
      `

      current = partitionEnd
    END WHILE

    // Add max value partition
    sql += `
      PARTITION pmax VALUES LESS THAN MAXVALUE
    `

    // Execute partitioning
    TRY
      db.execute(sql)
      RETURN true
    CATCH error
      logError('Table partitioning failed', error)
      RETURN false
    END TRY
  END
END ALGORITHM
```

**Complexity:** Query optimization is O(1), partitioning is O(p) where p is partition count

---

### 7.3 Async Processing with Queue

```pseudocode
ALGORITHM QueueEventProcessing(event, priority)
  INPUT:
    event: ActivityEvent      // Event to process
    priority: Integer         // Priority (0-10, higher = more urgent)

  OUTPUT:
    jobId: String             // Job identifier

  BEGIN
    // Create job
    job = {
      id: generateUUID(),
      type: 'process_event',
      payload: event,
      priority: priority,
      created_at: now(),
      attempts: 0,
      max_attempts: 3,
      status: 'queued'
    }

    // Determine queue based on priority
    queueName = (priority >= 7) ? 'high_priority' :
                (priority >= 4) ? 'normal_priority' :
                                  'low_priority'

    // Add to queue
    queue.add(queueName, job)

    // Track queued metric
    emitMetric('event_queued', {
      queue: queueName,
      priority: priority
    })

    RETURN job.id
  END
END ALGORITHM

ALGORITHM ProcessEventQueue(queueName)
  INPUT:
    queueName: String         // Queue to process

  OUTPUT:
    processed: Integer        // Number of jobs processed

  BEGIN
    processed = 0
    batchSize = 10

    WHILE true DO
      // Get batch of jobs
      jobs = queue.getBatch(queueName, batchSize)

      IF length(jobs) == 0 THEN
        BREAK
      END IF

      // Process jobs in parallel
      results = processJobsInParallel(jobs)

      FOR EACH result IN results DO
        IF result.success THEN
          queue.remove(queueName, result.jobId)
          processed += 1
        ELSE
          // Retry logic
          job = queue.get(queueName, result.jobId)
          job.attempts += 1

          IF job.attempts >= job.max_attempts THEN
            // Move to dead letter queue
            queue.move(queueName, 'dead_letter', result.jobId)
            logError('Job failed after max attempts', job)
          ELSE
            // Requeue with exponential backoff
            delay = exponentialBackoff(job.attempts, 1000)
            queue.requeue(queueName, result.jobId, delay)
          END IF
        END IF
      END FOR

      // Small delay between batches
      sleep(100)
    END WHILE

    RETURN processed
  END
END ALGORITHM

// Worker pool for parallel processing
ALGORITHM ProcessJobsInParallel(jobs)
  INPUT:
    jobs: Array<Job>          // Jobs to process

  OUTPUT:
    results: Array<Result>    // Processing results

  BEGIN
    workerCount = min(length(jobs), MAX_WORKERS)
    workers = createWorkerPool(workerCount)

    results = []
    pendingJobs = clone(jobs)

    // Distribute jobs to workers
    WHILE length(pendingJobs) > 0 OR workers.hasActiveJobs() DO
      // Assign jobs to idle workers
      FOR EACH worker IN workers DO
        IF worker.isIdle() AND length(pendingJobs) > 0 THEN
          job = pendingJobs.shift()
          worker.process(job).then(result => {
            results.append(result)
          })
        END IF
      END FOR

      // Small delay
      sleep(10)
    END WHILE

    // Cleanup workers
    workers.shutdown()

    RETURN results
  END
END ALGORITHM
```

**Complexity:** O(n/w) where n is job count, w is worker count (with parallelization)

---

## 8. Complexity Analysis

### Time Complexity Summary

| Algorithm | Best Case | Average Case | Worst Case | Notes |
|-----------|-----------|--------------|------------|-------|
| **Event Capture** |
| TrackToolExecution | O(1) | O(1) | O(n) | n = output size for serialization |
| ManageAgentLifecycle | O(1) | O(k) | O(k*m) | k = agent complexity, m = tool count |
| MonitorMessageFlow | O(1) | O(n) | O(n) | n = message count |
| **Data Processing** |
| CalculateProgress | O(1) | O(n) | O(n) | n = message count |
| CalculatePerformanceMetrics | O(n) | O(n log n) | O(n log n) | Due to sorting for percentiles |
| AggregateSessionMetrics | O(1) | O(n) | O(n) | n = event count |
| **Broadcasting** |
| BroadcastEventWithBuffer | O(1) | O(c) | O(c*r) | c = client count, r = retry count |
| ManageSSEConnection | O(1) | O(1) | O(1) | Connection management |
| **Persistence** |
| PersistActivityEvent | O(1) | O(1) | O(r) | r = retry count |
| BatchPersistEvents | O(n) | O(n) | O(n*r) | n = event count, r = retries |
| **Querying** |
| QuerySessionActivity | O(log n) | O(log n + k) | O(n) | With proper indexing, k = page size |
| QueryPerformanceAnalytics | O(n) | O(n + b*g) | O(n*b*g) | b = buckets, g = groups |
| **Optimization** |
| CacheEventData | O(1) | O(1) | O(n) | n = data size for compression |
| GetCachedEventData | O(1) | O(1) | O(1) | Cache hit |
| QueueEventProcessing | O(1) | O(log q) | O(log q) | q = queue size (priority queue) |
| ProcessJobsInParallel | O(n/w) | O(n/w) | O(n) | w = worker count |

### Space Complexity Summary

| Component | Space Complexity | Notes |
|-----------|------------------|-------|
| Event Buffer | O(b) | b = buffer size (capped) |
| Active Connections | O(c) | c = concurrent client count |
| In-Memory Cache | O(m) | m = cache size (LRU eviction) |
| Queue | O(q) | q = queued job count |
| Session State | O(s) | s = active session count |

### Database Indexing Strategy

```sql
-- Primary indexes for fast lookups
CREATE INDEX idx_session_timestamp ON activity_events(session_id, timestamp DESC);
CREATE INDEX idx_type_timestamp ON activity_events(type, timestamp DESC);
CREATE INDEX idx_status ON activity_events(status);
CREATE INDEX idx_tool ON activity_events(tool);

-- Composite indexes for common queries
CREATE INDEX idx_session_type_status ON activity_events(session_id, type, status);
CREATE INDEX idx_tool_timestamp ON activity_events(tool, timestamp DESC);

-- Covering index for metrics queries
CREATE INDEX idx_metrics_covering ON activity_events(
  session_id, type, timestamp, duration_ms, status, tokens_used, cost
);

-- Partial index for errors only
CREATE INDEX idx_errors ON activity_events(session_id, timestamp)
WHERE status = 'failed';
```

---

## 9. Error Handling

### Error Handling Patterns

```pseudocode
// Pattern 1: Graceful Degradation
ALGORITHM GracefulDegradation(primaryOperation, fallbackOperation)
  BEGIN
    TRY
      result = primaryOperation()
      RETURN result
    CATCH error
      logWarning('Primary operation failed, using fallback', error)

      TRY
        result = fallbackOperation()
        RETURN result
      CATCH fallbackError
        logError('Both primary and fallback failed', fallbackError)
        RETURN defaultValue()
      END TRY
    END TRY
  END
END ALGORITHM

// Pattern 2: Circuit Breaker
CLASS CircuitBreaker
  PROPERTIES:
    failureCount: Integer = 0
    failureThreshold: Integer = 5
    resetTimeout: Integer = 60000
    state: String = 'closed'  // 'closed', 'open', 'half-open'
    lastFailureTime: Timestamp = null

  METHOD execute(operation)
    BEGIN
      // Check if circuit is open
      IF state == 'open' THEN
        IF (now() - lastFailureTime) > resetTimeout THEN
          state = 'half-open'
          failureCount = 0
        ELSE
          THROW CircuitOpenError('Circuit breaker is open')
        END IF
      END IF

      TRY
        result = operation()

        // Success resets the circuit
        IF state == 'half-open' THEN
          state = 'closed'
          failureCount = 0
        END IF

        RETURN result

      CATCH error
        failureCount += 1
        lastFailureTime = now()

        IF failureCount >= failureThreshold THEN
          state = 'open'
          emitAlert('Circuit breaker opened', {
            threshold: failureThreshold,
            failures: failureCount
          })
        END IF

        THROW error
      END TRY
    END
  END METHOD
END CLASS

// Pattern 3: Retry with Exponential Backoff
ALGORITHM RetryWithBackoff(operation, maxRetries, baseDelayMs)
  BEGIN
    retryCount = 0
    lastError = null

    WHILE retryCount <= maxRetries DO
      TRY
        result = operation()

        IF retryCount > 0 THEN
          logInfo('Operation succeeded after retry', {
            retry_count: retryCount
          })
        END IF

        RETURN result

      CATCH error
        lastError = error
        retryCount += 1

        // Don't retry on certain error types
        IF isNonRetryableError(error) THEN
          logError('Non-retryable error encountered', error)
          THROW error
        END IF

        IF retryCount <= maxRetries THEN
          delay = baseDelayMs * (2 ^ (retryCount - 1))
          jitter = random(0, delay * 0.1)
          totalDelay = delay + jitter

          logWarning('Operation failed, retrying', {
            error: error.message,
            retry_count: retryCount,
            delay_ms: totalDelay
          })

          sleep(totalDelay)
        END IF
      END TRY
    END WHILE

    // All retries exhausted
    logError('Operation failed after all retries', {
      max_retries: maxRetries,
      last_error: lastError.message
    })

    THROW MaxRetriesExceededError(lastError)
  END
END ALGORITHM

// Pattern 4: Error Classification
FUNCTION classifyError(error)
  BEGIN
    // Network errors - retryable
    IF error.type IN ['ECONNREFUSED', 'ETIMEDOUT', 'ENOTFOUND'] THEN
      RETURN {
        category: 'network',
        retryable: true,
        severity: 'warning'
      }
    END IF

    // Database errors
    IF error.code STARTS WITH 'ER_' THEN
      IF error.code IN ['ER_DUP_ENTRY', 'ER_NO_REFERENCED_ROW'] THEN
        RETURN {
          category: 'database',
          retryable: false,
          severity: 'error'
        }
      ELSE IF error.code IN ['ER_LOCK_WAIT_TIMEOUT', 'ER_LOCK_DEADLOCK'] THEN
        RETURN {
          category: 'database',
          retryable: true,
          severity: 'warning'
        }
      END IF
    END IF

    // API errors
    IF error.statusCode != null THEN
      IF error.statusCode IN [429, 503] THEN
        RETURN {
          category: 'api',
          retryable: true,
          severity: 'warning'
        }
      ELSE IF error.statusCode IN [400, 401, 403, 404] THEN
        RETURN {
          category: 'api',
          retryable: false,
          severity: 'error'
        }
      ELSE IF error.statusCode >= 500 THEN
        RETURN {
          category: 'api',
          retryable: true,
          severity: 'error'
        }
      END IF
    END IF

    // Unknown errors - don't retry by default
    RETURN {
      category: 'unknown',
      retryable: false,
      severity: 'error'
    }
  END
END FUNCTION
```

### Error Recovery Strategies

```pseudocode
// Strategy 1: Fallback Buffer Processing
ALGORITHM ProcessFallbackBuffer()
  BEGIN
    bufferPath = getFallbackBufferPath()

    IF NOT fileExists(bufferPath) THEN
      RETURN
    END IF

    TRY
      // Read buffer contents
      lines = readFileLines(bufferPath)

      successCount = 0
      failedEvents = []

      FOR EACH line IN lines DO
        TRY
          event = JSON.parse(line)

          IF persistActivityEvent(event) THEN
            successCount += 1
          ELSE
            failedEvents.append(line)
          END IF

        CATCH parseError
          logError('Failed to parse buffered event', parseError)
          failedEvents.append(line)
        END TRY
      END FOR

      // Rewrite buffer with failed events
      IF length(failedEvents) > 0 THEN
        writeFile(bufferPath, failedEvents.join('\n'))
      ELSE
        deleteFile(bufferPath)
      END IF

      logInfo('Processed fallback buffer', {
        total: length(lines),
        succeeded: successCount,
        failed: length(failedEvents)
      })

    CATCH error
      logError('Failed to process fallback buffer', error)
    END TRY
  END
END ALGORITHM

// Strategy 2: Dead Letter Queue Processing
ALGORITHM ProcessDeadLetterQueue()
  BEGIN
    maxAge = 7 * 86400000  // 7 days
    currentTime = now()

    jobs = queue.getAll('dead_letter')

    FOR EACH job IN jobs DO
      age = currentTime - job.created_at

      IF age > maxAge THEN
        // Archive old failed jobs
        archiveFailedJob(job)
        queue.remove('dead_letter', job.id)
      ELSE
        // Attempt manual retry for recent failures
        TRY
          result = processJob(job)

          IF result.success THEN
            queue.remove('dead_letter', job.id)
            logInfo('Dead letter job recovered', { job_id: job.id })
          END IF

        CATCH error
          // Leave in dead letter queue
          logError('Dead letter job retry failed', {
            job_id: job.id,
            error: error.message
          })
        END TRY
      END IF
    END FOR
  END
END ALGORITHM
```

---

## 10. Integration Points

### Integration with ClaudeCodeSDKManager

```pseudocode
CLASS ClaudeCodeSDKManager
  PROPERTIES:
    eventEmitter: EventEmitter
    activityTracker: ActivityTracker
    sseManager: SSEManager
    metricsCollector: MetricsCollector

  // Integration Point 1: Tool Execution Wrapper
  METHOD executeTool(toolName, toolInput)
    BEGIN
      startTime = now()

      // Emit pre-execution event
      eventEmitter.emit('tool_execution_started', {
        tool: toolName,
        input: sanitizeInput(toolInput),
        timestamp: startTime
      })

      TRY
        // Execute tool
        toolOutput = super.executeTool(toolName, toolInput)
        endTime = now()

        // Track execution
        activityTracker.trackToolExecution(
          toolName,
          toolInput,
          toolOutput,
          startTime,
          endTime
        )

        RETURN toolOutput

      CATCH error
        endTime = now()

        // Track failed execution
        activityTracker.trackToolExecution(
          toolName,
          toolInput,
          { error: error },
          startTime,
          endTime
        )

        THROW error
      END TRY
    END
  END METHOD

  // Integration Point 2: Agent Spawning
  METHOD spawnAgent(agentType, prompt, model, config)
    BEGIN
      sessionId = getCurrentSessionId()

      // Track agent lifecycle
      RETURN activityTracker.manageAgentLifecycle(
        sessionId,
        agentType,
        prompt,
        model,
        config
      )
    END
  END METHOD

  // Integration Point 3: Message Processing
  METHOD processMessage(message, messageIndex, allMessages)
    BEGIN
      conversationId = getCurrentConversationId()

      // Monitor message flow
      activityTracker.monitorMessageFlow(
        conversationId,
        allMessages,
        messageIndex
      )

      // Calculate progress if multi-step
      progress = activityTracker.calculateProgress(
        conversationId,
        allMessages,
        messageIndex
      )

      IF progress != null THEN
        sseManager.broadcast({
          type: 'progress_update',
          data: progress
        }, 'high')
      END IF

      // Process message
      result = super.processMessage(message, messageIndex, allMessages)

      RETURN result
    END
  END METHOD

  // Integration Point 4: SSE Endpoint
  METHOD handleSSEConnection(request, response)
    BEGIN
      connection = sseManager.manageConnection(request, response)

      // Send initial state
      sessionId = extractSessionId(request)
      initialState = activityTracker.getSessionState(sessionId)

      sseManager.sendEvent(connection, {
        event: 'initial_state',
        data: initialState
      })

      RETURN connection
    END
  END METHOD

  // Integration Point 5: Metrics Endpoint
  METHOD getMetrics(timeWindow, sessionId)
    BEGIN
      // Calculate performance metrics
      metrics = metricsCollector.calculatePerformanceMetrics(
        sessionId || 'global',
        timeWindow
      )

      // Get session summary if specific session
      IF sessionId != null THEN
        summary = activityTracker.aggregateSessionMetrics(sessionId)
        metrics.session_summary = summary
      END IF

      RETURN metrics
    END
  END METHOD
END CLASS
```

### Event Emitter Integration

```pseudocode
CLASS ActivityTracker
  PROPERTIES:
    eventEmitter: EventEmitter
    persistenceQueue: Queue
    broadcastQueue: Queue

  METHOD initialize()
    BEGIN
      // Subscribe to all relevant events
      eventEmitter.on('tool_execution_started', onToolExecutionStarted)
      eventEmitter.on('tool_execution_completed', onToolExecutionCompleted)
      eventEmitter.on('agent_started', onAgentStarted)
      eventEmitter.on('agent_completed', onAgentCompleted)
      eventEmitter.on('agent_failed', onAgentFailed)
      eventEmitter.on('message_flow', onMessageFlow)
      eventEmitter.on('progress_update', onProgressUpdate)

      // Start background processors
      startPersistenceProcessor()
      startBroadcastProcessor()
      startMetricsAggregator()
    END
  END METHOD

  METHOD onToolExecutionCompleted(event)
    BEGIN
      // Queue for persistence
      persistenceQueue.add({
        type: 'persist',
        event: event,
        priority: 5
      })

      // Queue for broadcast
      broadcastQueue.add({
        type: 'broadcast',
        event: event,
        priority: 7
      })

      // Update real-time metrics
      updateMetrics(event)
    END
  END METHOD

  METHOD startPersistenceProcessor()
    BEGIN
      // Process persistence queue continuously
      setInterval(async () => {
        batch = persistenceQueue.getBatch(BATCH_SIZE)

        IF length(batch) > 0 THEN
          events = batch.map(item => item.event)
          batchPersistEvents(events, MAX_BATCH_SIZE)
        END IF
      }, PERSISTENCE_INTERVAL)
    END
  END METHOD

  METHOD startBroadcastProcessor()
    BEGIN
      // Process broadcast queue continuously
      setInterval(async () => {
        items = broadcastQueue.getAll()

        FOR EACH item IN items DO
          broadcastEventWithBuffer(item.event, 'normal')
          broadcastQueue.remove(item.id)
        END FOR
      }, BROADCAST_INTERVAL)
    END
  END METHOD
END CLASS
```

### Database Schema Integration

```sql
-- Main activity events table (partitioned by day)
CREATE TABLE activity_events (
  id VARCHAR(36) PRIMARY KEY,
  type VARCHAR(50) NOT NULL,
  session_id VARCHAR(36) NOT NULL,
  agent_id VARCHAR(36),
  tool VARCHAR(50),
  action TEXT,
  duration_ms INTEGER,
  status VARCHAR(20),
  error TEXT,
  file_path VARCHAR(500),
  metadata JSON,
  timestamp BIGINT NOT NULL,
  timestamp_start BIGINT,
  persisted_at BIGINT,

  INDEX idx_session_timestamp (session_id, timestamp DESC),
  INDEX idx_type_timestamp (type, timestamp DESC),
  INDEX idx_tool (tool),
  INDEX idx_status (status)
) PARTITION BY RANGE (timestamp);

-- Tool execution details (1:1 with tool_execution events)
CREATE TABLE tool_execution_details (
  event_id VARCHAR(36) PRIMARY KEY,
  input_size_bytes INTEGER,
  output_size_bytes INTEGER,
  cache_hit BOOLEAN,
  cache_read_tokens INTEGER,
  cache_creation_tokens INTEGER,

  FOREIGN KEY (event_id) REFERENCES activity_events(id) ON DELETE CASCADE
);

-- Agent event details (1:1 with agent_* events)
CREATE TABLE agent_event_details (
  event_id VARCHAR(36) PRIMARY KEY,
  agent_type VARCHAR(50),
  model VARCHAR(50),
  prompt TEXT,
  result TEXT,
  input_tokens INTEGER,
  output_tokens INTEGER,
  total_tokens INTEGER,
  cost DECIMAL(10, 6),

  FOREIGN KEY (event_id) REFERENCES activity_events(id) ON DELETE CASCADE
);

-- Session metrics (aggregated)
CREATE TABLE session_metrics (
  session_id VARCHAR(36) PRIMARY KEY,
  start_time BIGINT,
  end_time BIGINT,
  duration_ms BIGINT,
  request_count INTEGER,
  success_count INTEGER,
  failure_count INTEGER,
  total_tokens INTEGER,
  total_cost DECIMAL(10, 4),
  status VARCHAR(20),
  last_updated BIGINT,

  INDEX idx_status (status),
  INDEX idx_start_time (start_time DESC)
);

-- Performance metrics cache (time-series)
CREATE TABLE performance_metrics_cache (
  id VARCHAR(36) PRIMARY KEY,
  metric_type VARCHAR(50),
  time_bucket BIGINT,
  granularity VARCHAR(20),
  group_by VARCHAR(50),
  group_value VARCHAR(100),
  event_count INTEGER,
  avg_duration_ms DECIMAL(10, 2),
  p95_duration_ms DECIMAL(10, 2),
  total_tokens INTEGER,
  total_cost DECIMAL(10, 6),
  error_count INTEGER,
  created_at BIGINT,

  INDEX idx_type_bucket (metric_type, time_bucket),
  INDEX idx_group (group_by, group_value, time_bucket)
);
```

---

## Conclusion

This pseudocode specification provides comprehensive algorithms for implementing the Enhanced Live Activity System. All algorithms are designed with:

1. **Performance**: Optimized time/space complexity with proper indexing and caching
2. **Reliability**: Robust error handling with retry logic and fallback mechanisms
3. **Scalability**: Batch processing, queuing, and parallel execution strategies
4. **Observability**: Comprehensive metrics, logging, and monitoring integration

### Implementation Checklist

- [ ] Implement event capture layer with EventEmitter integration
- [ ] Build data processing pipeline with progress tracking
- [ ] Create SSE broadcasting system with buffering
- [ ] Develop persistence layer with batch optimization
- [ ] Build query layer with caching strategies
- [ ] Implement optimization strategies (caching, queuing, partitioning)
- [ ] Add comprehensive error handling and recovery
- [ ] Integrate with existing ClaudeCodeSDKManager
- [ ] Create database schema with proper indexing
- [ ] Build monitoring and alerting system

### Next Steps

1. **Architecture Phase**: Design system architecture based on these algorithms
2. **Refinement Phase**: Implement TDD test suite for each algorithm
3. **Completion Phase**: Build production-ready implementation
4. **Validation Phase**: Performance testing and optimization

---

**Document Version:** 1.0.0
**Last Updated:** 2025-10-25
**Status:** Ready for Architecture Phase
