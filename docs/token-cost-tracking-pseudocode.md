# Token Cost Tracking System - SPARC Pseudocode Design

## System Architecture Overview

```
TOKEN COST TRACKING SYSTEM ARCHITECTURE:

┌─────────────────┐    ┌─────────────────┐    ┌─────────────────┐
│   Data Sources  │────│ Tracking Engine │────│ Real-time Stream│
│                 │    │                 │    │                 │
│ • Claude API    │    │ • Token Counter │    │ • WebSocket     │
│ • OpenAI API    │    │ • Cost Calculator│    │ • Event Emitter │
│ • MCP Services  │    │ • Budget Manager│    │ • Data Batching │
│ • Claude-Flow   │    │ • Alert System  │    │ • UI Updates    │
└─────────────────┘    └─────────────────┘    └─────────────────┘
         │                       │                       │
         └───────────────────────┼───────────────────────┘
                                 │
                    ┌─────────────────┐
                    │ Data Persistence│
                    │                 │
                    │ • Time Series   │
                    │ • Aggregations  │
                    │ • Partitioning  │
                    │ • Backup/Recovery│
                    └─────────────────┘
```

---

## 1. TOKEN COST TRACKING ENGINE

### Core Token Tracking Algorithm

```pseudocode
ALGORITHM: TokenCostTrackingEngine
INPUT: None (singleton service)
OUTPUT: Continuous cost monitoring

CONSTANTS:
    PROVIDERS = {
        "claude": {baseRate: 0.015, premiumRate: 0.075},
        "openai": {gpt3Rate: 0.002, gpt4Rate: 0.03},
        "mcp": {baseRate: 0.001, premiumRate: 0.005},
        "claude-flow": {coordinationRate: 0.01, neuralRate: 0.02}
    }
    
    BATCH_SIZE = 100
    FLUSH_INTERVAL = 1000  // milliseconds
    MAX_MEMORY_BUFFER = 10000  // entries

DATA STRUCTURES:
    TokenBuffer: CircularBuffer<TokenEvent>
    CostAccumulator: Map<provider, CostMetrics>
    MemoryTracker: MemoryUsageMonitor

BEGIN
    // Initialize system
    buffer ← CreateCircularBuffer(MAX_MEMORY_BUFFER)
    costAccumulator ← CreateMap()
    memoryTracker ← CreateMemoryMonitor()
    
    // Start background workers
    StartWorker(TokenProcessor)
    StartWorker(CostCalculator) 
    StartWorker(MemoryCleanup)
    
    WHILE system.isRunning DO
        // Monitor system health
        IF memoryTracker.getUsage() > 0.8 THEN
            TriggerMemoryCleanup()
        END IF
        
        // Check buffer capacity
        IF buffer.size() > MAX_MEMORY_BUFFER * 0.9 THEN
            ForceFlush()
        END IF
        
        Sleep(FLUSH_INTERVAL)
    END WHILE
END

SUBROUTINE: RecordTokenUsage
INPUT: provider (string), tokens (integer), operation (string), metadata (object)
OUTPUT: success (boolean)

BEGIN TRY
    // Validate input
    IF tokens <= 0 OR provider NOT IN PROVIDERS THEN
        LogError("Invalid token usage data", {provider, tokens})
        RETURN false
    END IF
    
    // Create token event with memory safety
    event ← {
        id: GenerateUUID(),
        timestamp: GetCurrentTimestamp(),
        provider: provider,
        tokens: tokens,
        operation: operation,
        metadata: CloneDeep(metadata),  // Prevent reference leaks
        estimatedCost: CalculateEstimatedCost(provider, tokens)
    }
    
    // Thread-safe buffer insertion
    success ← buffer.TryAdd(event)
    
    IF NOT success THEN
        // Buffer full, force flush oldest entries
        buffer.ForceFlush(BATCH_SIZE)
        success ← buffer.TryAdd(event)
    END IF
    
    // Emit real-time event (non-blocking)
    EmitAsync("token-usage", event)
    
    RETURN success
    
CATCH error
    LogError("Token recording failed", error)
    RETURN false
END TRY
END

SUBROUTINE: CalculateEstimatedCost
INPUT: provider (string), tokens (integer)
OUTPUT: cost (float)

BEGIN
    providerConfig ← PROVIDERS[provider]
    
    SWITCH provider:
        CASE "claude":
            // Tier-based pricing
            IF tokens <= 1000 THEN
                cost ← tokens * providerConfig.baseRate / 1000
            ELSE
                cost ← 1000 * providerConfig.baseRate / 1000 + 
                       (tokens - 1000) * providerConfig.premiumRate / 1000
            END IF
            
        CASE "openai":
            // Model-based pricing (simplified)
            cost ← tokens * providerConfig.gpt4Rate / 1000
            
        CASE "mcp":
            // Service-based pricing
            cost ← tokens * providerConfig.baseRate / 1000
            
        CASE "claude-flow":
            // Operation-based pricing
            cost ← tokens * providerConfig.coordinationRate / 1000
            
        DEFAULT:
            cost ← tokens * 0.001  // Default fallback rate
    END SWITCH
    
    RETURN cost
END
```

---

## 2. REAL-TIME DATA STREAMING

### WebSocket Streaming with Resilience

```pseudocode
ALGORITHM: RealTimeStreamManager
INPUT: None (singleton service)
OUTPUT: Continuous data streaming

CONSTANTS:
    RECONNECT_DELAY = [1000, 2000, 4000, 8000, 16000]  // Exponential backoff
    MAX_RECONNECT_ATTEMPTS = 5
    BATCH_INTERVAL = 500  // milliseconds
    MAX_BATCH_SIZE = 50
    HEARTBEAT_INTERVAL = 30000  // 30 seconds
    CONNECTION_TIMEOUT = 10000  // 10 seconds

DATA STRUCTURES:
    ConnectionState: Enum {DISCONNECTED, CONNECTING, CONNECTED, ERROR}
    MessageQueue: PriorityQueue<StreamMessage>
    ConnectionPool: Map<clientId, WebSocketConnection>
    MemoryTracker: WeakMap<connection, metadata>

BEGIN
    state ← DISCONNECTED
    reconnectAttempts ← 0
    messageQueue ← CreatePriorityQueue()
    connectionPool ← CreateMap()
    memoryTracker ← CreateWeakMap()
    
    // Initialize connection manager
    InitializeWebSocketServer()
    StartWorker(BatchProcessor)
    StartWorker(HeartbeatMonitor)
    StartWorker(MemoryCleanupWorker)
END

SUBROUTINE: HandleClientConnection
INPUT: clientSocket (WebSocket), clientId (string)
OUTPUT: None

BEGIN TRY
    // Register connection with memory tracking
    connectionPool.set(clientId, clientSocket)
    memoryTracker.set(clientSocket, {
        connectedAt: GetCurrentTimestamp(),
        messagesSent: 0,
        bytesTransferred: 0
    })
    
    // Set up event handlers with memory safety
    clientSocket.onMessage(HandleClientMessage)
    clientSocket.onClose(() => {
        CleanupConnection(clientId)
    })
    clientSocket.onError((error) => {
        LogError("WebSocket error", error)
        AttemptReconnection(clientId)
    })
    
    // Send initial state
    SendMessage(clientId, {
        type: "connection-established",
        timestamp: GetCurrentTimestamp()
    })
    
    LogInfo("Client connected", {clientId})
    
CATCH error
    LogError("Connection setup failed", error)
    CleanupConnection(clientId)
END TRY
END

SUBROUTINE: StreamTokenData
INPUT: tokenData (TokenEvent), priority (integer = 1)
OUTPUT: success (boolean)

BEGIN TRY
    // Create stream message with memory optimization
    message ← {
        id: GenerateUUID(),
        type: "token-update",
        data: {
            tokens: tokenData.tokens,
            cost: tokenData.estimatedCost,
            provider: tokenData.provider,
            timestamp: tokenData.timestamp
        },
        priority: priority,
        createdAt: GetCurrentTimestamp()
    }
    
    // Add to batch queue
    success ← messageQueue.TryEnqueue(message)
    
    IF NOT success THEN
        // Queue full, drop lowest priority messages
        DropLowPriorityMessages(10)
        success ← messageQueue.TryEnqueue(message)
    END IF
    
    RETURN success
    
CATCH error
    LogError("Stream data failed", error)
    RETURN false
END TRY
END

SUBROUTINE: BatchProcessor
INPUT: None (background worker)
OUTPUT: None

BEGIN
    WHILE system.isRunning DO
        batch ← []
        batchStartTime ← GetCurrentTimestamp()
        
        // Collect messages for batching
        WHILE messageQueue.size() > 0 AND batch.length < MAX_BATCH_SIZE DO
            message ← messageQueue.Dequeue()
            
            // Check message age to prevent stale data
            messageAge ← GetCurrentTimestamp() - message.createdAt
            IF messageAge < 5000 THEN  // 5 second max age
                batch.append(message)
            ELSE
                // Drop stale message
                LogWarning("Dropping stale message", message.id)
            END IF
        END WHILE
        
        // Send batch to all connected clients
        IF batch.length > 0 THEN
            SendBatchToAllClients(batch)
        END IF
        
        // Memory cleanup - prevent accumulation
        ClearArray(batch)
        
        // Adaptive batching interval
        processingTime ← GetCurrentTimestamp() - batchStartTime
        sleepTime ← MAX(BATCH_INTERVAL - processingTime, 10)
        
        Sleep(sleepTime)
    END WHILE
END

SUBROUTINE: SendBatchToAllClients
INPUT: batch (array of StreamMessage)
OUTPUT: None

BEGIN TRY
    batchMessage ← {
        type: "batch-update",
        timestamp: GetCurrentTimestamp(),
        count: batch.length,
        data: batch
    }
    
    // Convert to JSON once for efficiency
    jsonData ← JSON.stringify(batchMessage)
    dataSize ← GetByteSize(jsonData)
    
    // Send to all connected clients
    FOR EACH clientId IN connectionPool.keys() DO
        connection ← connectionPool.get(clientId)
        
        IF connection.readyState = WebSocket.OPEN THEN
            TRY
                connection.send(jsonData)
                
                // Update metrics
                metadata ← memoryTracker.get(connection)
                IF metadata EXISTS THEN
                    metadata.messagesSent += 1
                    metadata.bytesTransferred += dataSize
                END IF
                
            CATCH sendError
                LogError("Failed to send to client", {clientId, error: sendError})
                AttemptReconnection(clientId)
            END TRY
        ELSE
            // Clean up dead connections
            CleanupConnection(clientId)
        END IF
    END FOR
    
CATCH error
    LogError("Batch send failed", error)
END TRY
END

SUBROUTINE: MemoryCleanupWorker
INPUT: None (background worker)
OUTPUT: None

BEGIN
    WHILE system.isRunning DO
        currentMemory ← GetMemoryUsage()
        
        // Aggressive cleanup if memory high
        IF currentMemory > 0.8 THEN
            // Clean old messages from queue
            CleanOldMessages(messageQueue, 2000)  // Keep last 2 seconds
            
            // Force garbage collection hint
            RequestGarbageCollection()
            
            LogWarning("Memory cleanup triggered", {memoryUsage: currentMemory})
        END IF
        
        // Clean up disconnected client metadata
        FOR EACH connection IN memoryTracker.keys() DO
            IF connection.readyState = WebSocket.CLOSED THEN
                memoryTracker.delete(connection)
            END IF
        END FOR
        
        Sleep(5000)  // Check every 5 seconds
    END WHILE
END

SUBROUTINE: AttemptReconnection
INPUT: clientId (string)
OUTPUT: None

BEGIN
    IF reconnectAttempts >= MAX_RECONNECT_ATTEMPTS THEN
        LogError("Max reconnection attempts reached", {clientId})
        CleanupConnection(clientId)
        RETURN
    END IF
    
    reconnectAttempts += 1
    delay ← RECONNECT_DELAY[MIN(reconnectAttempts - 1, RECONNECT_DELAY.length - 1)]
    
    LogInfo("Attempting reconnection", {clientId, attempt: reconnectAttempts, delay})
    
    Sleep(delay)
    
    // Attempt to re-establish connection
    TRY
        // Implementation depends on client-side reconnection logic
        EmitReconnectionEvent(clientId)
    CATCH error
        LogError("Reconnection failed", error)
    END TRY
END

SUBROUTINE: CleanupConnection
INPUT: clientId (string)
OUTPUT: None

BEGIN
    connection ← connectionPool.get(clientId)
    
    IF connection EXISTS THEN
        // Close connection if still open
        IF connection.readyState = WebSocket.OPEN THEN
            connection.close()
        END IF
        
        // Remove from pool
        connectionPool.delete(clientId)
        
        // Cleanup will happen automatically via WeakMap
        LogInfo("Connection cleaned up", {clientId})
    END IF
END
```

---

## 3. BUDGET MANAGEMENT SYSTEM

### Predictive Budget Algorithms

```pseudocode
ALGORITHM: BudgetManagementSystem
INPUT: None (singleton service)
OUTPUT: Budget monitoring and predictions

CONSTANTS:
    ALERT_THRESHOLDS = [0.5, 0.8, 0.9, 1.0]  // 50%, 80%, 90%, 100%
    PREDICTION_HORIZON = 7  // days
    SAMPLING_WINDOW = 24   // hours for trend analysis
    MIN_DATA_POINTS = 10   // minimum for reliable predictions
    BUDGET_PERIODS = ["daily", "weekly", "monthly"]

DATA STRUCTURES:
    BudgetConfig: {
        daily: float,
        weekly: float, 
        monthly: float,
        alertThresholds: array<float>
    }
    UsageHistory: TimeSeries<float>
    PredictionModel: LinearRegressionModel

BEGIN
    budgetConfig ← LoadBudgetConfiguration()
    usageHistory ← CreateTimeSeries()
    predictionModel ← CreatePredictionModel()
    alertSystem ← CreateAlertManager()
    
    // Initialize background monitoring
    StartWorker(BudgetMonitor)
    StartWorker(PredictionEngine)
    StartWorker(OptimizationAnalyzer)
END

SUBROUTINE: UpdateBudgetUsage
INPUT: cost (float), provider (string), timestamp (integer)
OUTPUT: budgetStatus (object)

BEGIN TRY
    // Record usage in time series
    usageHistory.AddDataPoint(timestamp, cost)
    
    // Calculate current period usage
    currentUsage ← CalculateCurrentPeriodUsage()
    
    // Check against all budget periods
    budgetStatus ← {}
    
    FOR EACH period IN BUDGET_PERIODS DO
        periodBudget ← budgetConfig[period]
        periodUsage ← CalculatePeriodUsage(period)
        utilizationRate ← periodUsage / periodBudget
        
        budgetStatus[period] ← {
            budget: periodBudget,
            used: periodUsage,
            remaining: periodBudget - periodUsage,
            utilizationRate: utilizationRate,
            alerts: CheckAlertThresholds(utilizationRate)
        }
        
        // Trigger alerts if thresholds exceeded
        IF budgetStatus[period].alerts.length > 0 THEN
            TriggerBudgetAlerts(period, budgetStatus[period])
        END IF
    END FOR
    
    // Update prediction model with new data
    predictionModel.UpdateWithNewData(cost, timestamp)
    
    RETURN budgetStatus
    
CATCH error
    LogError("Budget update failed", error)
    RETURN CreateDefaultBudgetStatus()
END TRY
END

SUBROUTINE: PredictBudgetExhaustion
INPUT: period (string), currentUsage (float)
OUTPUT: prediction (object)

BEGIN TRY
    // Ensure sufficient data for prediction
    dataPoints ← usageHistory.GetRecentDataPoints(SAMPLING_WINDOW)
    
    IF dataPoints.length < MIN_DATA_POINTS THEN
        RETURN {
            reliable: false,
            message: "Insufficient data for reliable prediction",
            estimatedDays: null
        }
    END IF
    
    // Calculate usage trend
    trend ← CalculateUsageTrend(dataPoints)
    
    IF trend <= 0 THEN
        RETURN {
            reliable: true,
            message: "Usage trending downward or stable",
            estimatedDays: "∞"
        }
    END IF
    
    // Calculate remaining budget
    periodBudget ← budgetConfig[period]
    remainingBudget ← periodBudget - currentUsage
    
    // Predict exhaustion time
    estimatedDays ← remainingBudget / trend
    confidence ← CalculatePredictionConfidence(dataPoints, trend)
    
    // Generate optimization suggestions
    suggestions ← GenerateOptimizationSuggestions(trend, dataPoints)
    
    RETURN {
        reliable: confidence > 0.7,
        estimatedDays: estimatedDays,
        confidence: confidence,
        trend: trend,
        suggestions: suggestions,
        worstCaseScenario: remainingBudget / CalculateMaxDailyUsage(dataPoints),
        bestCaseScenario: remainingBudget / CalculateMinDailyUsage(dataPoints)
    }
    
CATCH error
    LogError("Prediction calculation failed", error)
    RETURN CreateDefaultPrediction()
END TRY
END

SUBROUTINE: CalculateUsageTrend
INPUT: dataPoints (array of {timestamp, cost})
OUTPUT: dailyTrend (float)

BEGIN
    // Simple linear regression for trend calculation
    n ← dataPoints.length
    sumX ← 0, sumY ← 0, sumXY ← 0, sumXX ← 0
    
    baseTime ← dataPoints[0].timestamp
    
    FOR i = 0 TO n-1 DO
        x ← (dataPoints[i].timestamp - baseTime) / 86400000  // days
        y ← dataPoints[i].cost
        
        sumX += x
        sumY += y
        sumXY += x * y
        sumXX += x * x
    END FOR
    
    // Calculate slope (trend per day)
    slope ← (n * sumXY - sumX * sumY) / (n * sumXX - sumX * sumX)
    
    RETURN slope
END

SUBROUTINE: GenerateOptimizationSuggestions
INPUT: trend (float), dataPoints (array)
OUTPUT: suggestions (array of string)

BEGIN
    suggestions ← []
    
    // Analyze usage patterns
    hourlyDistribution ← AnalyzeHourlyUsage(dataPoints)
    providerDistribution ← AnalyzeProviderUsage(dataPoints)
    peakHours ← FindPeakUsageHours(hourlyDistribution)
    
    // Generate targeted suggestions
    IF trend > budgetConfig.daily * 0.1 THEN  // High daily burn rate
        suggestions.append("Consider implementing usage quotas during peak hours (" + 
                          FormatHours(peakHours) + ")")
    END IF
    
    // Provider-specific suggestions
    expensiveProvider ← FindMostExpensiveProvider(providerDistribution)
    IF expensiveProvider.costRatio > 0.6 THEN
        suggestions.append("Consider reducing " + expensiveProvider.name + 
                          " usage which accounts for " + 
                          (expensiveProvider.costRatio * 100) + "% of costs")
    END IF
    
    // Batching suggestions
    IF AnalyzeBatchingEfficiency(dataPoints) < 0.7 THEN
        suggestions.append("Implement request batching to reduce API call overhead")
    END IF
    
    // Caching suggestions
    cacheHitRate ← AnalyzeCacheEfficiency(dataPoints)
    IF cacheHitRate < 0.8 THEN
        suggestions.append("Improve caching strategy - current hit rate: " + 
                          (cacheHitRate * 100) + "%")
    END IF
    
    RETURN suggestions
END

SUBROUTINE: BudgetMonitor
INPUT: None (background worker)
OUTPUT: None

BEGIN
    WHILE system.isRunning DO
        // Check all budget periods
        FOR EACH period IN BUDGET_PERIODS DO
            currentUsage ← CalculatePeriodUsage(period)
            budget ← budgetConfig[period]
            utilizationRate ← currentUsage / budget
            
            // Check for alert conditions
            FOR EACH threshold IN ALERT_THRESHOLDS DO
                IF utilizationRate >= threshold AND NOT IsAlertSent(period, threshold) THEN
                    alert ← {
                        type: "budget-threshold",
                        period: period,
                        threshold: threshold,
                        currentUsage: currentUsage,
                        budget: budget,
                        utilizationRate: utilizationRate,
                        timestamp: GetCurrentTimestamp()
                    }
                    
                    SendBudgetAlert(alert)
                    MarkAlertSent(period, threshold)
                END IF
            END FOR
        END FOR
        
        Sleep(60000)  // Check every minute
    END WHILE
END

SUBROUTINE: CheckAlertThresholds
INPUT: utilizationRate (float)
OUTPUT: triggeredAlerts (array)

BEGIN
    alerts ← []
    
    FOR EACH threshold IN ALERT_THRESHOLDS DO
        IF utilizationRate >= threshold THEN
            alerts.append({
                threshold: threshold,
                message: CreateAlertMessage(threshold, utilizationRate)
            })
        END IF
    END FOR
    
    RETURN alerts
END

SUBROUTINE: CreateAlertMessage
INPUT: threshold (float), utilizationRate (float)
OUTPUT: message (string)

BEGIN
    percentage ← threshold * 100
    currentPercentage ← utilizationRate * 100
    
    SWITCH threshold:
        CASE 0.5:
            RETURN "Budget 50% utilized (" + currentPercentage + "%). Monitor usage closely."
        CASE 0.8:
            RETURN "Budget 80% utilized (" + currentPercentage + "%). Consider optimization."
        CASE 0.9:
            RETURN "Budget 90% utilized (" + currentPercentage + "%). Immediate action recommended."
        CASE 1.0:
            RETURN "Budget exceeded (" + currentPercentage + "%). Usage restrictions may apply."
        DEFAULT:
            RETURN "Budget threshold " + percentage + "% reached (" + currentPercentage + "%)"
    END SWITCH
END
```

---

## 4. UI INTEGRATION ALGORITHMS

### SimpleAnalytics Component Extension

```pseudocode
ALGORITHM: TokenCostAnalyticsUI
INPUT: None (React component)
OUTPUT: Real-time cost visualization

CONSTANTS:
    CHART_UPDATE_INTERVAL = 1000  // milliseconds
    MAX_DATA_POINTS = 100
    CHART_ANIMATION_DURATION = 300
    MEMORY_CLEANUP_INTERVAL = 5000

DATA STRUCTURES:
    ChartData: {
        timestamps: array<number>,
        tokenCounts: array<number>,
        costs: array<number>,
        providers: array<string>
    }
    UIState: {
        isLoading: boolean,
        error: string,
        lastUpdate: number,
        dataBuffer: CircularBuffer<DataPoint>
    }

BEGIN
    // Component initialization
    chartData ← InitializeChartData()
    uiState ← InitializeUIState()
    websocketConnection ← null
    cleanupRefs ← []
    
    // Memory leak prevention
    dataBuffer ← CreateCircularBuffer(MAX_DATA_POINTS)
    updateQueue ← CreateQueue()
    
    // Setup component lifecycle
    OnMount(() => {
        InitializeWebSocketConnection()
        StartPeriodicUpdates()
    })
    
    OnUnmount(() => {
        CleanupResources()
    })
END

SUBROUTINE: InitializeWebSocketConnection
INPUT: None
OUTPUT: None

BEGIN TRY
    // Establish WebSocket connection with retry logic
    websocketConnection ← CreateWebSocketConnection("ws://localhost:3001/token-stream")
    
    websocketConnection.onOpen(() => {
        LogInfo("Token stream connected")
        uiState.error ← null
        uiState.isLoading ← false
    })
    
    websocketConnection.onMessage((message) => {
        HandleTokenStreamMessage(message)
    })
    
    websocketConnection.onError((error) => {
        LogError("WebSocket error", error)
        uiState.error ← "Connection error: " + error.message
        ScheduleReconnection()
    })
    
    websocketConnection.onClose(() => {
        LogInfo("Token stream disconnected")
        ScheduleReconnection()
    })
    
CATCH error
    LogError("WebSocket initialization failed", error)
    uiState.error ← "Failed to connect to token stream"
END TRY
END

SUBROUTINE: HandleTokenStreamMessage
INPUT: message (WebSocketMessage)
OUTPUT: None

BEGIN TRY
    data ← JSON.parse(message.data)
    
    SWITCH data.type:
        CASE "batch-update":
            HandleBatchUpdate(data.data)
        CASE "token-update":
            HandleSingleUpdate(data.data)
        CASE "budget-alert":
            HandleBudgetAlert(data.data)
        DEFAULT:
            LogWarning("Unknown message type", data.type)
    END SWITCH
    
    uiState.lastUpdate ← GetCurrentTimestamp()
    
CATCH error
    LogError("Message parsing failed", error)
END TRY
END

SUBROUTINE: HandleBatchUpdate
INPUT: batchData (array of TokenEvent)
OUTPUT: None

BEGIN TRY
    // Process batch efficiently to prevent UI blocking
    processedData ← []
    
    FOR EACH tokenEvent IN batchData DO
        // Validate and clean data
        IF IsValidTokenEvent(tokenEvent) THEN
            cleanedEvent ← SanitizeTokenEvent(tokenEvent)
            processedData.append(cleanedEvent)
        END IF
    END FOR
    
    // Batch update chart data
    IF processedData.length > 0 THEN
        UpdateChartDataBatch(processedData)
        
        // Trigger UI update (throttled)
        IF ShouldUpdateUI() THEN
            RequestAnimationFrame(UpdateChartDisplay)
        END IF
    END IF
    
CATCH error
    LogError("Batch update failed", error)
END TRY
END

SUBROUTINE: UpdateChartDataBatch
INPUT: tokenEvents (array of TokenEvent)
OUTPUT: None

BEGIN
    // Aggregate data points for efficient rendering
    aggregatedData ← AggregateTokenEvents(tokenEvents)
    
    FOR EACH aggregatedPoint IN aggregatedData DO
        // Add to circular buffer (automatic memory management)
        dataBuffer.Add(aggregatedPoint)
    END FOR
    
    // Update chart data structure
    chartData.timestamps ← dataBuffer.GetTimestamps()
    chartData.tokenCounts ← dataBuffer.GetTokenCounts()
    chartData.costs ← dataBuffer.GetCosts()
    chartData.providers ← dataBuffer.GetProviders()
    
    // Trigger chart library update
    RequestChartUpdate()
END

SUBROUTINE: AggregateTokenEvents
INPUT: events (array of TokenEvent)
OUTPUT: aggregatedData (array of AggregatedPoint)

BEGIN
    // Group events by time window (1 second intervals)
    timeWindows ← GroupBy(events, (event) => {
        RETURN Math.floor(event.timestamp / 1000) * 1000
    })
    
    aggregatedData ← []
    
    FOR EACH timestamp, windowEvents IN timeWindows DO
        totalTokens ← Sum(windowEvents, (e) => e.tokens)
        totalCost ← Sum(windowEvents, (e) => e.estimatedCost)
        providers ← UniqueValues(windowEvents, (e) => e.provider)
        
        aggregatedPoint ← {
            timestamp: timestamp,
            tokens: totalTokens,
            cost: totalCost,
            providers: providers,
            eventCount: windowEvents.length
        }
        
        aggregatedData.append(aggregatedPoint)
    END FOR
    
    RETURN aggregatedData.sortBy('timestamp')
END

SUBROUTINE: RequestChartUpdate
INPUT: None
OUTPUT: None

BEGIN
    // Throttle chart updates to prevent performance issues
    IF GetCurrentTimestamp() - lastChartUpdate < CHART_UPDATE_INTERVAL THEN
        RETURN  // Skip update if too frequent
    END IF
    
    // Use requestAnimationFrame for smooth updates
    RequestAnimationFrame(() => {
        UpdateChartVisualization()
        lastChartUpdate ← GetCurrentTimestamp()
    })
END

SUBROUTINE: UpdateChartVisualization
INPUT: None
OUTPUT: None

BEGIN TRY
    // Update chart configuration
    chartConfig ← {
        data: {
            labels: chartData.timestamps.map(FormatTimestamp),
            datasets: [
                {
                    label: "Token Count",
                    data: chartData.tokenCounts,
                    borderColor: "rgb(75, 192, 192)",
                    backgroundColor: "rgba(75, 192, 192, 0.2)",
                    yAxisID: "tokens"
                },
                {
                    label: "Cost ($)",
                    data: chartData.costs,
                    borderColor: "rgb(255, 99, 132)",
                    backgroundColor: "rgba(255, 99, 132, 0.2)",
                    yAxisID: "cost"
                }
            ]
        },
        options: {
            responsive: true,
            maintainAspectRatio: false,
            animation: {
                duration: CHART_ANIMATION_DURATION
            },
            scales: {
                tokens: {
                    type: "linear",
                    display: true,
                    position: "left"
                },
                cost: {
                    type: "linear",
                    display: true,
                    position: "right"
                }
            },
            plugins: {
                legend: {
                    position: "top"
                }
            }
        }
    }
    
    // Update chart instance
    chartInstance.update(chartConfig)
    
CATCH error
    LogError("Chart update failed", error)
END TRY
END

SUBROUTINE: HandleBudgetAlert
INPUT: alertData (BudgetAlert)
OUTPUT: None

BEGIN
    // Create notification with appropriate urgency
    notification ← {
        type: GetAlertType(alertData.threshold),
        title: "Budget Alert",
        message: alertData.message,
        timestamp: alertData.timestamp,
        actions: GenerateAlertActions(alertData)
    }
    
    // Display notification
    ShowNotification(notification)
    
    // Update budget status indicator
    UpdateBudgetStatusIndicator(alertData)
END

SUBROUTINE: GetAlertType
INPUT: threshold (float)
OUTPUT: alertType (string)

BEGIN
    IF threshold >= 1.0 THEN
        RETURN "error"
    ELSE IF threshold >= 0.9 THEN
        RETURN "warning"
    ELSE IF threshold >= 0.8 THEN
        RETURN "info"
    ELSE
        RETURN "success"
    END IF
END

SUBROUTINE: CleanupResources
INPUT: None
OUTPUT: None

BEGIN
    // Close WebSocket connection
    IF websocketConnection AND websocketConnection.readyState = WebSocket.OPEN THEN
        websocketConnection.close()
    END IF
    
    // Clear all intervals and timeouts
    FOR EACH ref IN cleanupRefs DO
        clearInterval(ref)
    END FOR
    
    // Clear data structures
    dataBuffer.Clear()
    updateQueue.Clear()
    chartData ← null
    
    // Force garbage collection hint
    RequestGarbageCollection()
    
    LogInfo("Token analytics UI resources cleaned up")
END

SUBROUTINE: ShouldUpdateUI
INPUT: None
OUTPUT: shouldUpdate (boolean)

BEGIN
    // Prevent excessive updates that could cause performance issues
    timeSinceLastUpdate ← GetCurrentTimestamp() - uiState.lastUpdate
    
    // Update if enough time has passed or if this is critical data
    RETURN timeSinceLastUpdate >= CHART_UPDATE_INTERVAL OR 
           HasCriticalUpdates()
END

SUBROUTINE: HasCriticalUpdates
INPUT: None
OUTPUT: hasCritical (boolean)

BEGIN
    // Check for budget alerts or significant cost changes
    recentData ← dataBuffer.GetLast(5)
    
    IF recentData.length < 2 THEN
        RETURN false
    END IF
    
    // Check for significant cost spikes
    latestCost ← recentData[recentData.length - 1].cost
    previousCost ← recentData[recentData.length - 2].cost
    
    costIncrease ← (latestCost - previousCost) / previousCost
    
    RETURN costIncrease > 0.5  // 50% cost increase
END
```

---

## 5. DATA PERSISTENCE LOGIC

### High-Volume Time Series Storage

```pseudocode
ALGORITHM: TokenDataPersistenceEngine
INPUT: None (singleton service)
OUTPUT: Persistent storage management

CONSTANTS:
    PARTITION_SIZE = 86400000  // 1 day in milliseconds
    BATCH_SIZE = 1000
    FLUSH_INTERVAL = 5000
    RETENTION_PERIODS = {
        raw: 7,      // days
        hourly: 30,  // days
        daily: 365   // days
    }
    COMPRESSION_THRESHOLD = 10000  // records

DATA STRUCTURES:
    PartitionManager: Map<partitionKey, PartitionMetadata>
    WriteBuffer: CircularBuffer<TokenRecord>
    CompressionQueue: PriorityQueue<PartitionKey>
    BackupScheduler: CronScheduler

BEGIN
    partitionManager ← CreatePartitionManager()
    writeBuffer ← CreateCircularBuffer(BATCH_SIZE * 2)
    compressionQueue ← CreatePriorityQueue()
    backupScheduler ← CreateCronScheduler()
    
    // Initialize database schema
    InitializeDatabaseSchema()
    
    // Start background workers
    StartWorker(BatchWriter)
    StartWorker(PartitionManager)
    StartWorker(CompressionWorker)
    StartWorker(BackupWorker)
    
    // Schedule maintenance tasks
    ScheduleMaintenanceTasks()
END

SUBROUTINE: PersistTokenData
INPUT: tokenEvents (array of TokenEvent)
OUTPUT: success (boolean)

BEGIN TRY
    processedRecords ← []
    
    FOR EACH event IN tokenEvents DO
        // Transform to database record format
        record ← {
            id: GenerateUUID(),
            timestamp: event.timestamp,
            provider: event.provider,
            operation: event.operation,
            tokens: event.tokens,
            estimated_cost: event.estimatedCost,
            metadata: JSON.stringify(event.metadata),
            partition_key: CalculatePartitionKey(event.timestamp),
            created_at: GetCurrentTimestamp()
        }
        
        processedRecords.append(record)
    END FOR
    
    // Add to write buffer
    success ← writeBuffer.AddBatch(processedRecords)
    
    IF NOT success THEN
        // Buffer full, force flush
        ForceFlushBuffer()
        success ← writeBuffer.AddBatch(processedRecords)
    END IF
    
    RETURN success
    
CATCH error
    LogError("Token data persistence failed", error)
    RETURN false
END TRY
END

SUBROUTINE: CalculatePartitionKey
INPUT: timestamp (integer)
OUTPUT: partitionKey (string)

BEGIN
    // Calculate daily partition
    dayStart ← Math.floor(timestamp / PARTITION_SIZE) * PARTITION_SIZE
    date ← FormatDate(dayStart, "YYYY-MM-DD")
    
    RETURN "token_data_" + date
END

SUBROUTINE: BatchWriter
INPUT: None (background worker)
OUTPUT: None

BEGIN
    WHILE system.isRunning DO
        // Check if buffer has enough data or enough time has passed
        IF writeBuffer.size() >= BATCH_SIZE OR 
           TimeSinceLastFlush() > FLUSH_INTERVAL THEN
            
            FlushWriteBuffer()
        END IF
        
        Sleep(1000)
    END WHILE
END

SUBROUTINE: FlushWriteBuffer
INPUT: None
OUTPUT: None

BEGIN TRY
    batch ← writeBuffer.DrainAll()
    
    IF batch.length = 0 THEN
        RETURN
    END IF
    
    // Group by partition for efficient insertion
    partitionBatches ← GroupBy(batch, (record) => record.partition_key)
    
    // Insert into each partition
    FOR EACH partitionKey, records IN partitionBatches DO
        // Ensure partition exists
        EnsurePartitionExists(partitionKey)
        
        // Batch insert with transaction
        ExecuteInTransaction(() => {
            InsertBatchIntoPartition(partitionKey, records)
            UpdatePartitionMetadata(partitionKey, records.length)
        })
        
        // Schedule compression if needed
        IF ShouldCompressPartition(partitionKey) THEN
            compressionQueue.Enqueue(partitionKey, GetCompressionPriority(partitionKey))
        END IF
    END FOR
    
    LogInfo("Flushed batch", {recordCount: batch.length, partitions: partitionBatches.size()})
    
CATCH error
    LogError("Batch flush failed", error)
    // Re-queue failed records for retry
    writeBuffer.AddBatch(batch)
END TRY
END

SUBROUTINE: EnsurePartitionExists
INPUT: partitionKey (string)
OUTPUT: None

BEGIN TRY
    IF partitionManager.has(partitionKey) THEN
        RETURN  // Partition already exists
    END IF
    
    // Create new partition table
    tableName ← partitionKey
    
    createTableSQL ← "
        CREATE TABLE IF NOT EXISTS " + tableName + " (
            id UUID PRIMARY KEY,
            timestamp BIGINT NOT NULL,
            provider VARCHAR(50) NOT NULL,
            operation VARCHAR(100) NOT NULL,
            tokens INTEGER NOT NULL,
            estimated_cost DECIMAL(10,6) NOT NULL,
            metadata JSONB,
            partition_key VARCHAR(50) NOT NULL,
            created_at BIGINT NOT NULL
        ) PARTITION OF token_data FOR VALUES IN ('" + partitionKey + "');
        
        CREATE INDEX IF NOT EXISTS idx_" + tableName + "_timestamp 
        ON " + tableName + " (timestamp);
        
        CREATE INDEX IF NOT EXISTS idx_" + tableName + "_provider 
        ON " + tableName + " (provider);
    "
    
    ExecuteSQL(createTableSQL)
    
    // Initialize partition metadata
    metadata ← {
        partitionKey: partitionKey,
        tableName: tableName,
        createdAt: GetCurrentTimestamp(),
        recordCount: 0,
        lastInsertAt: null,
        compressionStatus: "none",
        retentionApplied: false
    }
    
    partitionManager.set(partitionKey, metadata)
    
    LogInfo("Created partition", {partitionKey})
    
CATCH error
    LogError("Partition creation failed", {partitionKey, error})
END TRY
END

SUBROUTINE: CompressionWorker
INPUT: None (background worker)
OUTPUT: None

BEGIN
    WHILE system.isRunning DO
        // Process compression queue
        WHILE compressionQueue.size() > 0 DO
            partitionKey ← compressionQueue.Dequeue()
            CompressPartition(partitionKey)
        END WHILE
        
        Sleep(10000)  // Check every 10 seconds
    END WHILE
END

SUBROUTINE: CompressPartition
INPUT: partitionKey (string)
OUTPUT: None

BEGIN TRY
    metadata ← partitionManager.get(partitionKey)
    
    IF metadata.compressionStatus = "compressed" THEN
        RETURN  // Already compressed
    END IF
    
    tableName ← metadata.tableName
    
    // Create compressed aggregation table
    aggregationTable ← tableName + "_hourly"
    
    createAggregationSQL ← "
        CREATE TABLE " + aggregationTable + " AS
        SELECT 
            DATE_TRUNC('hour', TO_TIMESTAMP(timestamp/1000)) as hour,
            provider,
            SUM(tokens) as total_tokens,
            SUM(estimated_cost) as total_cost,
            COUNT(*) as event_count,
            AVG(tokens) as avg_tokens,
            MAX(tokens) as max_tokens,
            MIN(tokens) as min_tokens
        FROM " + tableName + "
        GROUP BY hour, provider
        ORDER BY hour;
        
        CREATE INDEX ON " + aggregationTable + " (hour);
        CREATE INDEX ON " + aggregationTable + " (provider);
    "
    
    ExecuteSQL(createAggregationSQL)
    
    // Update metadata
    metadata.compressionStatus ← "compressed"
    metadata.compressedAt ← GetCurrentTimestamp()
    
    LogInfo("Compressed partition", {partitionKey, tableName, aggregationTable})
    
CATCH error
    LogError("Compression failed", {partitionKey, error})
END TRY
END

SUBROUTINE: ApplyRetentionPolicy
INPUT: None
OUTPUT: None

BEGIN TRY
    currentTime ← GetCurrentTimestamp()
    
    FOR EACH partitionKey, metadata IN partitionManager DO
        partitionAge ← (currentTime - metadata.createdAt) / 86400000  // days
        
        // Apply retention based on data type
        shouldDelete ← false
        
        IF metadata.compressionStatus = "none" AND partitionAge > RETENTION_PERIODS.raw THEN
            shouldDelete ← true
        ELSE IF metadata.compressionStatus = "compressed" AND partitionAge > RETENTION_PERIODS.daily THEN
            shouldDelete ← true
        END IF
        
        IF shouldDelete THEN
            DeletePartition(partitionKey)
        END IF
    END FOR
    
CATCH error
    LogError("Retention policy application failed", error)
END TRY
END

SUBROUTINE: DeletePartition
INPUT: partitionKey (string)
OUTPUT: None

BEGIN TRY
    metadata ← partitionManager.get(partitionKey)
    tableName ← metadata.tableName
    
    // Drop partition table
    ExecuteSQL("DROP TABLE IF EXISTS " + tableName + " CASCADE;")
    
    // Drop aggregation table if exists
    aggregationTable ← tableName + "_hourly"
    ExecuteSQL("DROP TABLE IF EXISTS " + aggregationTable + " CASCADE;")
    
    // Remove from partition manager
    partitionManager.delete(partitionKey)
    
    LogInfo("Deleted partition", {partitionKey, tableName})
    
CATCH error
    LogError("Partition deletion failed", {partitionKey, error})
END TRY
END

SUBROUTINE: CreateBackup
INPUT: backupType (string), targetPath (string)
OUTPUT: success (boolean)

BEGIN TRY
    timestamp ← FormatDate(GetCurrentTimestamp(), "YYYY-MM-DD-HH-mm-ss")
    backupName ← "token_data_backup_" + timestamp
    
    SWITCH backupType:
        CASE "full":
            backupCommand ← "pg_dump -h localhost -U postgres -d agent_feed " +
                          "-t 'token_data*' -f " + targetPath + "/" + backupName + ".sql"
        CASE "incremental":
            // Backup only recent partitions
            recentPartitions ← GetRecentPartitions(7)  // Last 7 days
            backupCommand ← CreateIncrementalBackupCommand(recentPartitions, targetPath, backupName)
        DEFAULT:
            LogError("Unknown backup type", {backupType})
            RETURN false
    END SWITCH
    
    // Execute backup
    result ← ExecuteSystemCommand(backupCommand)
    
    IF result.exitCode = 0 THEN
        LogInfo("Backup completed", {backupName, type: backupType})
        RETURN true
    ELSE
        LogError("Backup failed", {backupName, error: result.stderr})
        RETURN false
    END IF
    
CATCH error
    LogError("Backup process failed", error)
    RETURN false
END TRY
END

SUBROUTINE: InitializeDatabaseSchema
INPUT: None
OUTPUT: None

BEGIN TRY
    schemaSQL ← "
        -- Main partitioned table
        CREATE TABLE IF NOT EXISTS token_data (
            id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
            timestamp BIGINT NOT NULL,
            provider VARCHAR(50) NOT NULL,
            operation VARCHAR(100) NOT NULL,
            tokens INTEGER NOT NULL,
            estimated_cost DECIMAL(10,6) NOT NULL,
            metadata JSONB,
            partition_key VARCHAR(50) NOT NULL,
            created_at BIGINT NOT NULL DEFAULT EXTRACT(EPOCH FROM NOW()) * 1000
        ) PARTITION BY LIST (partition_key);
        
        -- Indexes on partitioned table
        CREATE INDEX IF NOT EXISTS idx_token_data_timestamp ON token_data (timestamp);
        CREATE INDEX IF NOT EXISTS idx_token_data_provider ON token_data (provider);
        CREATE INDEX IF NOT EXISTS idx_token_data_created_at ON token_data (created_at);
        
        -- Budget configuration table
        CREATE TABLE IF NOT EXISTS budget_config (
            id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
            period VARCHAR(20) NOT NULL,
            budget_amount DECIMAL(10,2) NOT NULL,
            alert_thresholds JSONB NOT NULL,
            created_at TIMESTAMP DEFAULT NOW(),
            updated_at TIMESTAMP DEFAULT NOW(),
            UNIQUE(period)
        );
        
        -- Budget usage tracking
        CREATE TABLE IF NOT EXISTS budget_usage (
            id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
            period VARCHAR(20) NOT NULL,
            period_start TIMESTAMP NOT NULL,
            period_end TIMESTAMP NOT NULL,
            total_cost DECIMAL(10,6) NOT NULL DEFAULT 0,
            provider_breakdown JSONB,
            updated_at TIMESTAMP DEFAULT NOW()
        );
        
        -- Alert history
        CREATE TABLE IF NOT EXISTS alert_history (
            id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
            alert_type VARCHAR(50) NOT NULL,
            threshold_percent INTEGER,
            message TEXT NOT NULL,
            metadata JSONB,
            created_at TIMESTAMP DEFAULT NOW()
        );
    "
    
    ExecuteSQL(schemaSQL)
    
    LogInfo("Database schema initialized")
    
CATCH error
    LogError("Schema initialization failed", error)
END TRY
END
```

---

## 6. MEMORY LEAK PREVENTION ALGORITHMS

### Memory Management and Cleanup

```pseudocode
ALGORITHM: MemoryLeakPrevention
INPUT: None (system-wide service)
OUTPUT: Continuous memory management

CONSTANTS:
    MEMORY_CHECK_INTERVAL = 5000
    MEMORY_THRESHOLD = 0.8  // 80% of available memory
    CLEANUP_BATCH_SIZE = 100
    WEAK_REF_CLEANUP_INTERVAL = 10000
    GC_FORCE_THRESHOLD = 0.9

DATA STRUCTURES:
    MemoryTracker: Map<componentId, MemoryMetrics>
    WeakRefRegistry: WeakMap<object, cleanup_function>
    ResourcePool: Map<resourceType, ResourceManager>
    CleanupQueue: PriorityQueue<CleanupTask>

BEGIN
    memoryTracker ← CreateMemoryTracker()
    weakRefRegistry ← CreateWeakMap()
    resourcePool ← CreateResourcePool()
    cleanupQueue ← CreatePriorityQueue()
    
    // Register global memory monitoring
    StartWorker(MemoryMonitor)
    StartWorker(WeakRefCleaner)
    StartWorker(ResourceCleaner)
    
    // Register cleanup handlers
    RegisterCleanupHandlers()
END

SUBROUTINE: MemoryMonitor
INPUT: None (background worker)
OUTPUT: None

BEGIN
    WHILE system.isRunning DO
        currentUsage ← GetMemoryUsage()
        
        // Update memory metrics
        UpdateMemoryMetrics(currentUsage)
        
        // Check if memory usage is high
        IF currentUsage.heapUsed / currentUsage.heapTotal > MEMORY_THRESHOLD THEN
            LogWarning("High memory usage detected", currentUsage)
            TriggerMemoryCleanup(currentUsage)
        END IF
        
        // Force garbage collection if critical
        IF currentUsage.heapUsed / currentUsage.heapTotal > GC_FORCE_THRESHOLD THEN
            LogWarning("Forcing garbage collection")
            ForceGarbageCollection()
        END IF
        
        Sleep(MEMORY_CHECK_INTERVAL)
    END WHILE
END

SUBROUTINE: TriggerMemoryCleanup
INPUT: memoryUsage (MemoryStats)
OUTPUT: None

BEGIN TRY
    LogInfo("Starting memory cleanup", memoryUsage)
    
    // Priority-based cleanup
    cleanupTasks ← [
        {priority: 1, task: CleanupWebSocketConnections},
        {priority: 2, task: CleanupChartData},
        {priority: 3, task: CleanupTokenBuffers},
        {priority: 4, task: CleanupDatabaseConnections},
        {priority: 5, task: CleanupEventListeners}
    ]
    
    // Execute cleanup tasks in priority order
    FOR EACH task IN cleanupTasks DO
        IF GetMemoryUsage().heapUsed / GetMemoryUsage().heapTotal < MEMORY_THRESHOLD THEN
            BREAK  // Memory usage normalized
        END IF
        
        TRY
            task.task()
            LogInfo("Cleanup completed", {task: task.task.name})
        CATCH error
            LogError("Cleanup task failed", {task: task.task.name, error})
        END TRY
    END FOR
    
    // Force garbage collection after cleanup
    RequestGarbageCollection()
    
    afterUsage ← GetMemoryUsage()
    LogInfo("Memory cleanup completed", {before: memoryUsage, after: afterUsage})
    
CATCH error
    LogError("Memory cleanup failed", error)
END TRY
END

SUBROUTINE: CleanupWebSocketConnections
INPUT: None
OUTPUT: None

BEGIN
    cleanedCount ← 0
    
    // Clean up closed connections
    FOR EACH clientId, connection IN connectionPool DO
        IF connection.readyState ≠ WebSocket.OPEN THEN
            // Remove connection and associated data
            connectionPool.delete(clientId)
            
            // Clean up event listeners
            connection.removeAllListeners()
            
            cleanedCount += 1
        END IF
    END FOR
    
    LogInfo("WebSocket connections cleaned", {count: cleanedCount})
END

SUBROUTINE: CleanupChartData
INPUT: None
OUTPUT: None

BEGIN
    // Limit chart data points to prevent memory bloat
    FOR EACH componentId, chartData IN chartDataRegistry DO
        IF chartData.dataPoints.length > MAX_DATA_POINTS THEN
            // Keep only recent data points
            keepCount ← MAX_DATA_POINTS / 2
            chartData.dataPoints ← chartData.dataPoints.slice(-keepCount)
            
            LogInfo("Chart data trimmed", {componentId, kept: keepCount})
        END IF
    END FOR
    
    // Clean up unused chart instances
    CleanupUnusedChartInstances()
END

SUBROUTINE: CleanupTokenBuffers
INPUT: None
OUTPUT: None

BEGIN
    cleanedBytes ← 0
    
    // Clean up token buffers
    FOR EACH bufferId, buffer IN tokenBuffers DO
        oldSize ← buffer.size()
        
        // Remove old entries
        cutoffTime ← GetCurrentTimestamp() - (5 * 60 * 1000)  // 5 minutes
        buffer.removeOlderThan(cutoffTime)
        
        newSize ← buffer.size()
        cleanedBytes += (oldSize - newSize) * ESTIMATED_ENTRY_SIZE
    END FOR
    
    LogInfo("Token buffers cleaned", {bytesFreed: cleanedBytes})
END

SUBROUTINE: RegisterManagedResource
INPUT: resource (object), cleanupFn (function), componentId (string)
OUTPUT: None

BEGIN
    // Register resource for automatic cleanup
    weakRefRegistry.set(resource, cleanupFn)
    
    // Track resource in component
    IF NOT memoryTracker.has(componentId) THEN
        memoryTracker.set(componentId, {
            resources: [],
            lastCleanup: GetCurrentTimestamp(),
            memoryUsage: 0
        })
    END IF
    
    memoryTracker.get(componentId).resources.append(resource)
END

SUBROUTINE: WeakRefCleaner
INPUT: None (background worker)
OUTPUT: None

BEGIN
    WHILE system.isRunning DO
        // Process cleanup queue
        processedCount ← 0
        
        WHILE cleanupQueue.size() > 0 AND processedCount < CLEANUP_BATCH_SIZE DO
            cleanupTask ← cleanupQueue.Dequeue()
            
            TRY
                cleanupTask.execute()
                processedCount += 1
            CATCH error
                LogError("Cleanup task execution failed", error)
            END TRY
        END WHILE
        
        // Check for orphaned references
        CheckOrphanedReferences()
        
        Sleep(WEAK_REF_CLEANUP_INTERVAL)
    END WHILE
END

SUBROUTINE: CreateMemorySafeComponent
INPUT: componentType (string), props (object)
OUTPUT: component (ReactComponent)

BEGIN
    component ← CreateComponent(componentType, props)
    
    // Add memory tracking
    componentId ← GenerateComponentId()
    component._memoryId ← componentId
    
    // Wrap component lifecycle methods
    originalComponentDidMount ← component.componentDidMount
    component.componentDidMount ← () => {
        RegisterComponentMemory(componentId)
        IF originalComponentDidMount THEN
            originalComponentDidMount()
        END IF
    }
    
    originalComponentWillUnmount ← component.componentWillUnmount
    component.componentWillUnmount ← () => {
        CleanupComponentMemory(componentId)
        IF originalComponentWillUnmount THEN
            originalComponentWillUnmount()
        END IF
    }
    
    RETURN component
END

SUBROUTINE: RegisterComponentMemory
INPUT: componentId (string)
OUTPUT: None

BEGIN
    memoryTracker.set(componentId, {
        createdAt: GetCurrentTimestamp(),
        resources: [],
        eventListeners: [],
        timers: [],
        subscriptions: []
    })
    
    LogDebug("Component memory registered", {componentId})
END

SUBROUTINE: CleanupComponentMemory
INPUT: componentId (string)
OUTPUT: None

BEGIN TRY
    componentData ← memoryTracker.get(componentId)
    
    IF NOT componentData THEN
        RETURN
    END IF
    
    // Cleanup all registered resources
    FOR EACH resource IN componentData.resources DO
        IF resource AND resource.cleanup THEN
            resource.cleanup()
        END IF
    END FOR
    
    // Clear event listeners
    FOR EACH listener IN componentData.eventListeners DO
        listener.remove()
    END FOR
    
    // Clear timers
    FOR EACH timer IN componentData.timers DO
        clearTimeout(timer)
        clearInterval(timer)
    END FOR
    
    // Unsubscribe from subscriptions
    FOR EACH subscription IN componentData.subscriptions DO
        subscription.unsubscribe()
    END FOR
    
    // Remove from tracker
    memoryTracker.delete(componentId)
    
    LogDebug("Component memory cleaned", {componentId})
    
CATCH error
    LogError("Component memory cleanup failed", {componentId, error})
END TRY
END

SUBROUTINE: CreateMemorySafeWebSocket
INPUT: url (string), options (object)
OUTPUT: webSocket (WebSocket)

BEGIN
    webSocket ← new WebSocket(url)
    
    // Wrap WebSocket with memory management
    originalClose ← webSocket.close
    webSocket.close ← () => {
        // Clean up event listeners before closing
        webSocket.onopen ← null
        webSocket.onmessage ← null
        webSocket.onerror ← null
        webSocket.onclose ← null
        
        originalClose.call(webSocket)
    }
    
    // Auto-cleanup on disconnect
    webSocket.addEventListener('close', () => {
        // Ensure all references are cleared
        setTimeout(() => {
            webSocket.onopen ← null
            webSocket.onmessage ← null
            webSocket.onerror ← null
            webSocket.onclose ← null
        }, 1000)
    })
    
    RETURN webSocket
END
```

---

## 7. PERFORMANCE OPTIMIZATION

### High-Frequency Update Optimization

```pseudocode
ALGORITHM: PerformanceOptimization
INPUT: None (system-wide service)
OUTPUT: Optimized performance monitoring

CONSTANTS:
    UPDATE_THROTTLE = 16  // ~60fps
    BATCH_OPTIMIZATION_THRESHOLD = 1000
    RENDER_BUDGET = 8  // milliseconds per frame
    IDLE_CLEANUP_DELAY = 5000
    PERFORMANCE_SAMPLE_SIZE = 100

DATA STRUCTURES:
    PerformanceMetrics: {
        frameTime: CircularBuffer<number>,
        updateTime: CircularBuffer<number>,
        renderTime: CircularBuffer<number>,
        memoryUsage: CircularBuffer<number>
    }
    RenderScheduler: RequestAnimationFrameScheduler
    UpdateQueue: PriorityQueue<UpdateTask>
    ThrottleManager: Map<string, ThrottleState>

BEGIN
    performanceMetrics ← InitializeMetrics()
    renderScheduler ← CreateRenderScheduler()
    updateQueue ← CreatePriorityQueue()
    throttleManager ← CreateThrottleManager()
    
    // Initialize performance monitoring
    StartPerformanceMonitoring()
    StartRenderLoop()
    StartUpdateProcessor()
END

SUBROUTINE: OptimizedTokenStreamProcessor
INPUT: None (singleton processor)
OUTPUT: None

BEGIN
    processingQueue ← CreateQueue()
    batchProcessor ← CreateBatchProcessor()
    
    // Main processing loop
    WHILE system.isRunning DO
        startTime ← GetHighResolutionTime()
        
        // Process updates within render budget
        WHILE HasBudgetRemaining(startTime) AND processingQueue.length > 0 DO
            batch ← CollectBatchFromQueue(processingQueue, 50)
            ProcessTokenBatch(batch)
        END WHILE
        
        // Yield control to maintain frame rate
        YieldToScheduler()
    END WHILE
END

SUBROUTINE: ProcessTokenBatch
INPUT: tokenBatch (array of TokenEvent)
OUTPUT: None

BEGIN TRY
    batchStartTime ← GetHighResolutionTime()
    
    // Pre-process batch for efficiency
    aggregatedData ← AggregateSimilarTokens(tokenBatch)
    validatedData ← ValidateBatch(aggregatedData)
    
    // Update data structures efficiently
    UpdateTokenAccumulators(validatedData)
    UpdateCostCalculations(validatedData)
    
    // Schedule UI updates (throttled)
    ScheduleUIUpdate(validatedData)
    
    // Record processing metrics
    processingTime ← GetHighResolutionTime() - batchStartTime
    performanceMetrics.updateTime.Add(processingTime)
    
CATCH error
    LogError("Batch processing failed", error)
END TRY
END

SUBROUTINE: AggregateSimilarTokens
INPUT: tokenBatch (array of TokenEvent)
OUTPUT: aggregatedBatch (array of AggregatedTokenEvent)

BEGIN
    // Group by provider and time window
    timeWindow ← 1000  // 1 second
    groups ← new Map()
    
    FOR EACH token IN tokenBatch DO
        windowStart ← Math.floor(token.timestamp / timeWindow) * timeWindow
        key ← token.provider + ":" + windowStart
        
        IF NOT groups.has(key) THEN
            groups.set(key, {
                provider: token.provider,
                timestamp: windowStart,
                tokens: 0,
                cost: 0,
                count: 0,
                operations: new Set()
            })
        END IF
        
        group ← groups.get(key)
        group.tokens += token.tokens
        group.cost += token.estimatedCost
        group.count += 1
        group.operations.add(token.operation)
    END FOR
    
    RETURN Array.from(groups.values())
END

SUBROUTINE: ScheduleUIUpdate
INPUT: data (array of AggregatedTokenEvent)
OUTPUT: None

BEGIN
    // Check if UI update is needed
    IF NOT ShouldUpdateUI(data) THEN
        RETURN
    END IF
    
    // Create update task
    updateTask ← {
        type: "ui-update",
        data: data,
        priority: CalculateUpdatePriority(data),
        createdAt: GetCurrentTimestamp()
    }
    
    // Add to render queue
    renderScheduler.Schedule(updateTask)
END

SUBROUTINE: ShouldUpdateUI
INPUT: data (array of AggregatedTokenEvent)
OUTPUT: shouldUpdate (boolean)

BEGIN
    // Throttle UI updates based on significance
    IF TimeSinceLastUIUpdate() < UPDATE_THROTTLE THEN
        RETURN false
    END IF
    
    // Check for significant changes
    totalCostChange ← Sum(data, (d) => d.cost)
    totalTokenChange ← Sum(data, (d) => d.tokens)
    
    // Update if changes are significant
    RETURN totalCostChange > 0.01 OR  // $0.01 threshold
           totalTokenChange > 100 OR  // 100 token threshold
           HasHighPriorityProvider(data)
END

SUBROUTINE: OptimizedChartRenderer
INPUT: chartData (ChartData), canvasElement (HTMLCanvasElement)
OUTPUT: None

BEGIN TRY
    renderStartTime ← GetHighResolutionTime()
    
    // Use off-screen canvas for complex rendering
    offscreenCanvas ← CreateOffscreenCanvas(canvasElement.width, canvasElement.height)
    ctx ← offscreenCanvas.getContext('2d')
    
    // Optimize rendering based on data size
    IF chartData.points.length > 1000 THEN
        // Use sampling for large datasets
        sampledData ← SampleDataPoints(chartData.points, 500)
        RenderChart(ctx, sampledData)
    ELSE
        // Full resolution for smaller datasets
        RenderChart(ctx, chartData.points)
    END IF
    
    // Copy to main canvas
    mainCtx ← canvasElement.getContext('2d')
    mainCtx.drawImage(offscreenCanvas, 0, 0)
    
    // Record render metrics
    renderTime ← GetHighResolutionTime() - renderStartTime
    performanceMetrics.renderTime.Add(renderTime)
    
    // Clean up off-screen canvas
    offscreenCanvas ← null
    
CATCH error
    LogError("Chart rendering failed", error)
END TRY
END

SUBROUTINE: SampleDataPoints
INPUT: dataPoints (array), targetCount (integer)
OUTPUT: sampledPoints (array)

BEGIN
    IF dataPoints.length <= targetCount THEN
        RETURN dataPoints
    END IF
    
    sampledPoints ← []
    step ← dataPoints.length / targetCount
    
    // Always include first and last points
    sampledPoints.append(dataPoints[0])
    
    // Sample intermediate points
    FOR i = 1 TO targetCount - 2 DO
        index ← Math.round(i * step)
        sampledPoints.append(dataPoints[index])
    END FOR
    
    // Always include last point
    sampledPoints.append(dataPoints[dataPoints.length - 1])
    
    RETURN sampledPoints
END

SUBROUTINE: HasBudgetRemaining
INPUT: startTime (number)
OUTPUT: hasRemaining (boolean)

BEGIN
    elapsed ← GetHighResolutionTime() - startTime
    RETURN elapsed < RENDER_BUDGET
END

SUBROUTINE: RenderScheduler
INPUT: None (background service)
OUTPUT: None

BEGIN
    WHILE system.isRunning DO
        frameStart ← GetHighResolutionTime()
        
        // Process render queue within frame budget
        WHILE updateQueue.size() > 0 AND HasBudgetRemaining(frameStart) DO
            updateTask ← updateQueue.Dequeue()
            
            TRY
                ExecuteUpdateTask(updateTask)
            CATCH error
                LogError("Update task failed", error)
            END TRY
        END WHILE
        
        // Request next animation frame
        RequestAnimationFrame(RenderScheduler)
    END WHILE
END

SUBROUTINE: CreateThrottledFunction
INPUT: fn (function), delay (integer)
OUTPUT: throttledFn (function)

BEGIN
    lastCall ← 0
    timeoutId ← null
    
    throttledFn ← (args...) => {
        currentTime ← GetCurrentTimestamp()
        
        IF currentTime - lastCall >= delay THEN
            // Execute immediately
            lastCall ← currentTime
            RETURN fn.apply(this, args)
        ELSE
            // Schedule for later
            IF timeoutId THEN
                clearTimeout(timeoutId)
            END IF
            
            remaining ← delay - (currentTime - lastCall)
            timeoutId ← setTimeout(() => {
                lastCall ← GetCurrentTimestamp()
                fn.apply(this, args)
            }, remaining)
        END IF
    }
    
    RETURN throttledFn
END

SUBROUTINE: PerformanceMonitor
INPUT: None (background worker)
OUTPUT: None

BEGIN
    WHILE system.isRunning DO
        // Collect performance metrics
        metrics ← {
            heapUsed: process.memoryUsage().heapUsed,
            heapTotal: process.memoryUsage().heapTotal,
            external: process.memoryUsage().external,
            cpuUsage: process.cpuUsage(),
            eventLoopLag: GetEventLoopLag()
        }
        
        // Update performance history
        performanceMetrics.memoryUsage.Add(metrics.heapUsed)
        
        // Check for performance issues
        IF metrics.eventLoopLag > 100 THEN  // 100ms lag
            LogWarning("High event loop lag detected", metrics)
            TriggerPerformanceOptimization()
        END IF
        
        IF metrics.heapUsed / metrics.heapTotal > 0.8 THEN
            LogWarning("High memory usage", metrics)
            TriggerMemoryOptimization()
        END IF
        
        Sleep(1000)
    END WHILE
END

SUBROUTINE: TriggerPerformanceOptimization
INPUT: None
OUTPUT: None

BEGIN
    // Reduce update frequency temporarily
    IncreaseThrottleDelays(1.5)  // 50% increase
    
    // Process fewer items per batch
    ReduceBatchSizes(0.8)  // 20% reduction
    
    // Enable aggressive caching
    EnableAggressiveCaching()
    
    LogInfo("Performance optimization activated")
    
    // Schedule restoration after 30 seconds
    setTimeout(() => {
        RestoreNormalPerformanceSettings()
        LogInfo("Normal performance settings restored")
    }, 30000)
END
```

This comprehensive pseudocode design addresses all the specified requirements:

1. **Token Cost Tracking Engine** with multi-provider support and accurate cost calculation
2. **Real-time Data Streaming** with WebSocket resilience and memory-safe batching
3. **Budget Management System** with predictive algorithms and optimization suggestions
4. **UI Integration** extending SimpleAnalytics with performance-optimized updates
5. **Data Persistence** with partitioning, compression, and retention strategies
6. **Memory Leak Prevention** with comprehensive cleanup mechanisms
7. **Performance Optimization** for high-frequency updates and smooth UI rendering

The design specifically addresses the NLD-identified risks:
- 78% risk of memory leaks through WeakMap usage, circular buffer management, and automatic cleanup
- 65% risk of WebSocket issues through connection pooling, exponential backoff, and connection lifecycle management

<function_calls>
<invoke name="TodoWrite">
<parameter name="todos">[{"id": "1", "content": "Design Token Cost Tracking Engine with multi-provider support", "status": "completed"}, {"id": "2", "content": "Create real-time data streaming algorithms with WebSocket resilience", "status": "completed"}, {"id": "3", "content": "Design budget management system with predictive algorithms", "status": "completed"}, {"id": "4", "content": "Create UI integration algorithms for SimpleAnalytics extension", "status": "completed"}, {"id": "5", "content": "Design data persistence logic with partitioning strategies", "status": "completed"}, {"id": "6", "content": "Implement memory leak prevention algorithms", "status": "completed"}, {"id": "7", "content": "Create WebSocket stability and error recovery mechanisms", "status": "completed"}, {"id": "8", "content": "Design performance optimization for high-frequency updates", "status": "completed"}]