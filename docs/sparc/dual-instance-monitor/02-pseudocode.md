# SPARC Phase 2: Dual Instance Monitor - Pseudocode Design

## Core Algorithm Design

### 1. Instance Discovery Algorithm

```pseudocode
ALGORITHM InstanceDiscovery
INPUT: configPorts[], environmentUrls[], discoveryTimeout
OUTPUT: detectedInstances[]

BEGIN
    detectedInstances = []
    discoveryPromises = []
    
    // Scan configured ports
    FOR EACH port IN configPorts
        url = "http://localhost:" + port
        promise = ProbeInstance(url, discoveryTimeout)
        discoveryPromises.ADD(promise)
    END FOR
    
    // Check environment variables
    FOR EACH envUrl IN environmentUrls
        IF envUrl IS_VALID
            promise = ProbeInstance(envUrl, discoveryTimeout)
            discoveryPromises.ADD(promise)
        END IF
    END FOR
    
    // Wait for all probes with timeout
    results = AWAIT Promise.allSettled(discoveryPromises)
    
    FOR EACH result IN results
        IF result.status == "fulfilled" AND result.value.isValid
            instance = CreateInstanceDescriptor(result.value)
            detectedInstances.ADD(instance)
        END IF
    END FOR
    
    RETURN detectedInstances
END

FUNCTION ProbeInstance(url, timeout)
BEGIN
    TRY
        response = AWAIT Fetch(url + "/health", {timeout: timeout})
        IF response.ok
            metadata = AWAIT response.json()
            RETURN {
                url: url,
                isValid: true,
                metadata: metadata,
                timestamp: NOW()
            }
        END IF
    CATCH error
        RETURN {
            url: url,
            isValid: false,
            error: error.message,
            timestamp: NOW()
        }
    END TRY
END
```

### 2. Dual Connection Manager Algorithm

```pseudocode
ALGORITHM DualConnectionManager
INPUT: instanceList[], connectionOptions
OUTPUT: connectionStates{}

BEGIN
    connections = {}
    reconnectionTimers = {}
    healthCheckers = {}
    
    WHILE system.isRunning
        FOR EACH instance IN instanceList
            currentState = connections[instance.id]?.state || "DISCONNECTED"
            
            CASE currentState OF
                "DISCONNECTED":
                    InitiateConnection(instance)
                
                "CONNECTING":
                    // Wait for connection resolution
                    CONTINUE
                
                "CONNECTED":
                    IF NOT HealthCheck(instance)
                        MarkUnhealthy(instance)
                        ScheduleReconnection(instance)
                    END IF
                
                "RECONNECTING":
                    IF ReconnectionReady(instance)
                        AttemptReconnection(instance)
                    END IF
                
                "ERROR":
                    IF ShouldRetry(instance)
                        ScheduleReconnection(instance)
                    ELSE
                        MarkPermanentFailure(instance)
                    END IF
            END CASE
        END FOR
        
        SLEEP(connectionOptions.pollInterval)
    END WHILE
END

FUNCTION InitiateConnection(instance)
BEGIN
    connection = connections[instance.id]
    connection.state = "CONNECTING"
    connection.attempts++
    
    socket = CreateWebSocket(instance.url)
    
    socket.onOpen = FUNCTION()
        connection.state = "CONNECTED"
        connection.socket = socket
        connection.lastConnected = NOW()
        ResetReconnectionStrategy(instance)
        StartHealthChecking(instance)
        EmitEvent("instance_connected", instance)
    END
    
    socket.onClose = FUNCTION(event)
        connection.state = "DISCONNECTED"
        connection.lastDisconnected = NOW()
        StopHealthChecking(instance)
        
        IF NOT event.wasClean
            ScheduleReconnection(instance)
        END IF
        
        EmitEvent("instance_disconnected", instance, event.reason)
    END
    
    socket.onError = FUNCTION(error)
        connection.state = "ERROR"
        connection.lastError = error
        LogError("Connection failed for instance " + instance.id, error)
        EmitEvent("instance_error", instance, error)
    END
    
    socket.onMessage = FUNCTION(message)
        ProcessInstanceMessage(instance, message)
    END
END
```

### 3. Log Streaming Aggregator

```pseudocode
ALGORITHM LogStreamAggregator
INPUT: connectedInstances[], bufferSize, filterCriteria
OUTPUT: aggregatedLogStream

BEGIN
    logBuffer = RingBuffer(bufferSize)
    logSubscriptions = {}
    filters = FilterChain(filterCriteria)
    
    FOR EACH instance IN connectedInstances
        IF instance.isConnected
            SubscribeToLogs(instance)
        END IF
    END FOR
    
    FUNCTION SubscribeToLogs(instance)
    BEGIN
        subscription = instance.socket.on("log_entry", FUNCTION(logData)
            enrichedLog = EnrichLogEntry(logData, instance)
            
            IF filters.shouldInclude(enrichedLog)
                logBuffer.add(enrichedLog)
                EmitLogUpdate(enrichedLog)
                
                // Store for offline instances
                IF HasOfflineInstances()
                    BufferForOfflineInstances(enrichedLog)
                END IF
            END IF
        END)
        
        logSubscriptions[instance.id] = subscription
    END
    
    FUNCTION EnrichLogEntry(logData, instance)
    BEGIN
        RETURN {
            ...logData,
            instanceId: instance.id,
            instanceType: instance.metadata.type,
            timestamp: logData.timestamp || NOW(),
            source: instance.metadata.name || instance.url,
            level: logData.level || "info"
        }
    END
    
    FUNCTION ProcessOfflineBuffer(instance)
    BEGIN
        bufferedLogs = GetBufferedLogs(instance.id)
        
        FOR EACH log IN bufferedLogs
            IF IsWithinTimeWindow(log, RECENT_THRESHOLD)
                logBuffer.add(log)
                EmitLogUpdate(log)
            END IF
        END FOR
        
        ClearBufferedLogs(instance.id)
    END
END
```

### 4. Connection State Management

```pseudocode
ALGORITHM ConnectionStateManager
INPUT: instanceConnections[], uiComponents[], persistenceLayer
OUTPUT: synchronizedState

BEGIN
    globalState = {
        instances: {},
        overallStatus: "INITIALIZING",
        metrics: {},
        alerts: []
    }
    
    FUNCTION UpdateInstanceState(instanceId, newState, metadata)
    BEGIN
        oldState = globalState.instances[instanceId]?.state
        
        globalState.instances[instanceId] = {
            ...globalState.instances[instanceId],
            state: newState,
            lastUpdate: NOW(),
            metadata: metadata
        }
        
        // Update overall system status
        UpdateOverallStatus()
        
        // Emit state change event
        EmitStateChange(instanceId, oldState, newState)
        
        // Persist state for recovery
        PersistState(globalState)
        
        // Update UI components
        NotifyUIComponents("state_change", {
            instanceId: instanceId,
            state: newState,
            overall: globalState.overallStatus
        })
    END
    
    FUNCTION UpdateOverallStatus()
    BEGIN
        connectedCount = CountInstancesByState("CONNECTED")
        totalCount = CountTotalInstances()
        
        IF connectedCount == 0
            globalState.overallStatus = "ALL_DISCONNECTED"
        ELSE IF connectedCount == totalCount
            globalState.overallStatus = "ALL_CONNECTED"
        ELSE
            globalState.overallStatus = "PARTIALLY_CONNECTED"
        END IF
        
        // Special case for dual instance setup
        IF totalCount == 2 AND connectedCount == 2
            globalState.overallStatus = "DUAL_INSTANCE_ACTIVE"
            EmitEvent("dual_instance_ready")
        END IF
    END
    
    FUNCTION HandleStateRecovery()
    BEGIN
        savedState = LoadPersistedState()
        
        IF savedState IS_VALID
            globalState = MergeStates(globalState, savedState)
            
            FOR EACH instanceId, instanceState IN savedState.instances
                IF instanceState.shouldReconnect
                    ScheduleConnectionAttempt(instanceId)
                END IF
            END FOR
        END IF
    END
END
```

### 5. Error Boundary and Recovery

```pseudocode
ALGORITHM ErrorBoundaryManager
INPUT: componentTree, errorRecoveryStrategies
OUTPUT: resilientApplication

BEGIN
    errorHistory = []
    recoveryAttempts = {}
    circuitBreakers = {}
    
    FUNCTION HandleComponentError(error, errorInfo, componentStack)
    BEGIN
        errorRecord = {
            error: error,
            timestamp: NOW(),
            component: GetComponentName(componentStack),
            severity: ClassifyError(error),
            context: errorInfo
        }
        
        errorHistory.ADD(errorRecord)
        
        CASE errorRecord.severity OF
            "CRITICAL":
                ExecuteGracefulDegradation()
                NotifyUserOfCriticalError(error)
            
            "HIGH":
                AttemptComponentRecovery(errorRecord.component)
                ShowErrorMessage(error)
            
            "MEDIUM":
                LogError(error)
                AttemptSilentRecovery()
            
            "LOW":
                LogWarning(error)
                ContinueOperation()
        END CASE
    END
    
    FUNCTION ExecuteGracefulDegradation()
    BEGIN
        // Disable non-essential features
        DisableFeature("real_time_logs")
        DisableFeature("advanced_metrics")
        
        // Switch to simplified UI
        ActivateSimplifiedMode()
        
        // Maintain core functionality
        EnsureCoreConnectionManagement()
        
        NotifyUser("Operating in degraded mode. Some features may be limited.")
    END
    
    FUNCTION AttemptComponentRecovery(componentName)
    BEGIN
        attemptCount = recoveryAttempts[componentName] || 0
        
        IF attemptCount < MAX_RECOVERY_ATTEMPTS
            recoveryAttempts[componentName] = attemptCount + 1
            
            CASE componentName OF
                "ConnectionManager":
                    ResetConnectionManager()
                
                "LogStreamer":
                    ReinitializeLogStreaming()
                
                "StatusDisplay":
                    RefreshStatusComponents()
                
                DEFAULT:
                    RestartComponent(componentName)
            END CASE
        ELSE
            // Too many recovery attempts, circuit break
            CircuitBreakComponent(componentName)
        END IF
    END
END
```

### 6. Auto-Reconnection Strategy

```pseudocode
ALGORITHM AutoReconnectionStrategy
INPUT: instance, connectionFailure, reconnectionConfig
OUTPUT: reconnectionSchedule

BEGIN
    strategy = ExponentialBackoffStrategy(reconnectionConfig)
    
    FUNCTION ScheduleReconnection(instance, failure)
    BEGIN
        attempts = instance.reconnectionAttempts || 0
        
        IF attempts >= reconnectionConfig.maxAttempts
            MarkPermanentFailure(instance)
            EmitEvent("max_reconnection_attempts_exceeded", instance)
            RETURN
        END IF
        
        delay = strategy.calculateDelay(attempts, failure)
        
        // Add jitter to prevent thundering herd
        jitteredDelay = AddJitter(delay, reconnectionConfig.jitterRange)
        
        reconnectionTimer = SetTimeout(FUNCTION()
            AttemptReconnection(instance)
        END, jitteredDelay)
        
        instance.reconnectionTimer = reconnectionTimer
        instance.reconnectionAttempts = attempts + 1
        
        EmitEvent("reconnection_scheduled", {
            instance: instance,
            attempt: attempts + 1,
            delay: jitteredDelay
        })
    END
    
    FUNCTION ExponentialBackoffStrategy(config)
    BEGIN
        RETURN {
            calculateDelay: FUNCTION(attempt, failure)
                baseDelay = config.baseDelay
                maxDelay = config.maxDelay
                exponentialDelay = baseDelay * Math.pow(2, attempt)
                
                // Cap at maximum delay
                delay = Math.min(exponentialDelay, maxDelay)
                
                // Apply failure-specific adjustments
                IF failure.type == "NETWORK_ERROR"
                    delay = delay * 1.5  // Longer delay for network issues
                ELSE IF failure.type == "SERVER_ERROR"
                    delay = delay * 0.8  // Shorter delay for server errors
                END IF
                
                RETURN delay
            END
        }
    END
    
    FUNCTION AddJitter(delay, jitterRange)
    BEGIN
        jitterAmount = delay * jitterRange * (Random() - 0.5)
        RETURN delay + jitterAmount
    END
END
```

### 7. Health Monitoring Algorithm

```pseudocode
ALGORITHM HealthMonitor
INPUT: connectedInstances[], healthConfig
OUTPUT: healthMetrics[], healthAlerts[]

BEGIN
    healthCheckers = {}
    metrics = {}
    
    FOR EACH instance IN connectedInstances
        StartHealthMonitoring(instance)
    END FOR
    
    FUNCTION StartHealthMonitoring(instance)
    BEGIN
        checker = {
            interval: healthConfig.checkInterval,
            timeout: healthConfig.pingTimeout,
            consecutiveFailures: 0,
            lastSuccessfulPing: NOW()
        }
        
        intervalId = SetInterval(FUNCTION()
            PerformHealthCheck(instance, checker)
        END, checker.interval)
        
        checker.intervalId = intervalId
        healthCheckers[instance.id] = checker
    END
    
    FUNCTION PerformHealthCheck(instance, checker)
    BEGIN
        startTime = NOW()
        
        TRY
            response = AWAIT PingInstance(instance, checker.timeout)
            endTime = NOW()
            latency = endTime - startTime
            
            // Successful ping
            checker.consecutiveFailures = 0
            checker.lastSuccessfulPing = endTime
            
            UpdateHealthMetrics(instance, {
                isHealthy: true,
                latency: latency,
                lastPing: endTime,
                uptime: CalculateUptime(instance)
            })
            
        CATCH error
            checker.consecutiveFailures++
            
            UpdateHealthMetrics(instance, {
                isHealthy: false,
                latency: null,
                lastPing: NOW(),
                consecutiveFailures: checker.consecutiveFailures
            })
            
            IF checker.consecutiveFailures >= healthConfig.maxFailures
                TriggerHealthAlert(instance, "HEALTH_CHECK_FAILED")
                MarkInstanceUnhealthy(instance)
            END IF
        END TRY
    END
    
    FUNCTION PingInstance(instance, timeout)
    BEGIN
        RETURN new Promise(FUNCTION(resolve, reject)
            timer = SetTimeout(FUNCTION()
                reject(new Error("Ping timeout"))
            END, timeout)
            
            instance.socket.emit("ping", NOW(), FUNCTION(response)
                ClearTimeout(timer)
                resolve(response)
            END)
        END)
    END
END
```

## Data Flow Architecture

### 1. Instance Discovery Flow
```
Browser Start → Environment Check → Port Scanning → Health Probes → Instance Registration → Connection Initiation
```

### 2. Connection Management Flow
```
Instance Detected → Connection Attempt → Socket Handshake → Authentication → Health Monitor Start → Log Subscription
```

### 3. Error Recovery Flow
```
Error Detected → Error Classification → Recovery Strategy Selection → Backoff Calculation → Reconnection Attempt → Success/Failure Handling
```

### 4. Log Streaming Flow
```
Instance Log → Message Enrichment → Filter Application → Buffer Storage → UI Update → Offline Buffer Check
```

### 5. State Synchronization Flow
```
State Change → Validation → Persistence → UI Notification → Event Emission → External Integration
```

## Complexity Analysis

### Time Complexity
- Instance Discovery: O(n) where n = number of endpoints to probe
- Connection Management: O(m) where m = number of instances
- Log Processing: O(1) amortized with ring buffer
- Health Monitoring: O(m) for m monitored instances

### Space Complexity
- Instance Metadata: O(m) for m instances
- Log Buffer: O(k) for k buffered log entries
- Connection State: O(m) for m connections
- Health Metrics: O(m * t) for m instances over t time periods

### Performance Characteristics
- Connection Establishment: Target < 5 seconds
- Reconnection Time: Exponential backoff, max 30 seconds
- Log Streaming Latency: < 100ms
- Health Check Frequency: Every 30 seconds
- Memory Usage: < 50MB sustained