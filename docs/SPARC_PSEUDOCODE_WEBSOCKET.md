# SPARC PSEUDOCODE: WebSocket Connection Singleton Implementation

## ALGORITHM DESIGN FOR CONNECTION MULTIPLICITY FIX

### 1. CONNECTION SINGLETON MANAGER

```pseudocode
CLASS WebSocketSingleton:
    PRIVATE static instance: WebSocketSingleton = null
    PRIVATE static connections: Map<string, WebSocketConnection> = new Map()
    PRIVATE static connectionStates: Map<string, ConnectionState> = new Map()
    
    PUBLIC static getInstance(): WebSocketSingleton
        IF instance is null THEN
            instance = new WebSocketSingleton()
        END IF
        RETURN instance
    END
    
    PUBLIC getConnection(config: WebSocketConfig): Promise<WebSocketConnection>
        connectionKey = generateConnectionKey(config.url, config.userId)
        
        // Check if valid connection already exists
        IF connections.has(connectionKey) THEN
            existingConnection = connections.get(connectionKey)
            IF existingConnection.isConnected() THEN
                RETURN existingConnection
            ELSE
                // Clean up stale connection
                cleanupConnection(connectionKey)
            END IF
        END IF
        
        // Prevent concurrent connection attempts
        IF connectionStates.get(connectionKey) == ConnectionState.CONNECTING THEN
            RETURN waitForConnection(connectionKey)
        END IF
        
        // Create new connection
        connectionStates.set(connectionKey, ConnectionState.CONNECTING)
        newConnection = await createConnection(config)
        connections.set(connectionKey, newConnection)
        connectionStates.set(connectionKey, ConnectionState.CONNECTED)
        
        RETURN newConnection
    END
    
    PRIVATE generateConnectionKey(url: string, userId: string): string
        RETURN hash(url + ":" + userId)
    END
    
    PRIVATE cleanupConnection(connectionKey: string): void
        IF connections.has(connectionKey) THEN
            connection = connections.get(connectionKey)
            connection.disconnect()
            connections.delete(connectionKey)
            connectionStates.delete(connectionKey)
        END IF
    END
    
    PUBLIC forceCleanup(): void
        FOR EACH connection IN connections.values()
            connection.disconnect()
        END FOR
        connections.clear()
        connectionStates.clear()
    END
END CLASS
```

### 2. STABILIZED WEBSOCKET HOOK

```pseudocode
FUNCTION useWebSocket(config: WebSocketConfig): WebSocketHookReturn
    // Stable references to prevent infinite loops
    stableConfig = useMemo(() => config, [config.url, config.userId])
    socketRef = useRef<WebSocketConnection | null>(null)
    connectionStateRef = useRef<ConnectionState>(ConnectionState.DISCONNECTED)
    
    // Stable connection handler
    connectFunction = useCallback(async () => {
        IF connectionStateRef.current == ConnectionState.CONNECTED THEN
            RETURN // Already connected
        END IF
        
        IF connectionStateRef.current == ConnectionState.CONNECTING THEN
            RETURN // Connection in progress
        END IF
        
        TRY
            connectionStateRef.current = ConnectionState.CONNECTING
            singleton = WebSocketSingleton.getInstance()
            connection = await singleton.getConnection(stableConfig)
            socketRef.current = connection
            connectionStateRef.current = ConnectionState.CONNECTED
            
            // Setup event listeners
            setupEventListeners(connection)
            
        CATCH error
            connectionStateRef.current = ConnectionState.ERROR
            handleConnectionError(error)
        END TRY
    END, [stableConfig])
    
    // Stable disconnect handler
    disconnectFunction = useCallback(() => {
        IF socketRef.current THEN
            socketRef.current.disconnect()
            socketRef.current = null
            connectionStateRef.current = ConnectionState.DISCONNECTED
        END IF
    END, [])
    
    // Initialize connection only once
    useEffect(() => {
        IF stableConfig.autoConnect AND connectionStateRef.current == ConnectionState.DISCONNECTED THEN
            connectFunction()
        END IF
        
        // Cleanup on unmount
        RETURN () => {
            disconnectFunction()
        }
    END, [stableConfig.autoConnect, connectFunction, disconnectFunction])
    
    RETURN {
        socket: socketRef.current,
        isConnected: connectionStateRef.current == ConnectionState.CONNECTED,
        connect: connectFunction,
        disconnect: disconnectFunction,
        connectionState: connectionStateRef.current
    }
END FUNCTION
```

### 3. OPTIMIZED WEBSOCKET CONTEXT

```pseudocode
FUNCTION WebSocketProvider({ children, config }): ReactElement
    // Stable configuration
    stableConfig = useMemo(() => ({
        url: config.url || DEFAULT_URL,
        userId: config.userId || generateUserId(),
        autoConnect: config.autoConnect ?? true
    }), [config.url, config.userId, config.autoConnect])
    
    // Use stabilized hook
    webSocketState = useWebSocket(stableConfig)
    
    // Stable event handlers
    eventHandlersRef = useRef<Map<string, Set<Function>>>(new Map())
    
    subscribeFunction = useCallback((event: string, handler: Function) => {
        IF NOT eventHandlersRef.current.has(event) THEN
            eventHandlersRef.current.set(event, new Set())
        END IF
        eventHandlersRef.current.get(event).add(handler)
        
        // Register with actual socket
        IF webSocketState.socket THEN
            webSocketState.socket.on(event, handler)
        END IF
    END, [webSocketState.socket])
    
    unsubscribeFunction = useCallback((event: string, handler?: Function) => {
        IF handler THEN
            eventHandlersRef.current.get(event)?.delete(handler)
            webSocketState.socket?.off(event, handler)
        ELSE
            eventHandlersRef.current.delete(event)
            webSocketState.socket?.removeAllListeners(event)
        END IF
    END, [webSocketState.socket])
    
    // Stable context value with proper memoization
    contextValue = useMemo(() => ({
        ...webSocketState,
        subscribe: subscribeFunction,
        unsubscribe: unsubscribeFunction,
        // Additional context-specific functionality
        emit: (event: string, data: any) => {
            webSocketState.socket?.emit(event, data)
        }
    }), [
        webSocketState.socket,
        webSocketState.isConnected,
        webSocketState.connectionState,
        subscribeFunction,
        unsubscribeFunction
    ])
    
    // Re-register event handlers when socket changes
    useEffect(() => {
        IF webSocketState.socket AND webSocketState.isConnected THEN
            FOR EACH [event, handlers] IN eventHandlersRef.current
                FOR EACH handler IN handlers
                    webSocketState.socket.on(event, handler)
                END FOR
            END FOR
        END IF
    END, [webSocketState.socket, webSocketState.isConnected])
    
    RETURN (
        <WebSocketContext.Provider value={contextValue}>
            {children}
        </WebSocketContext.Provider>
    )
END FUNCTION
```

### 4. SERVER-SIDE CONNECTION DEDUPLICATION

```pseudocode
CLASS SessionConnectionManager:
    PRIVATE userConnections: Map<string, Set<string>> = new Map()
    PRIVATE socketToUser: Map<string, string> = new Map()
    PRIVATE connectionTimestamps: Map<string, number> = new Map()
    
    PUBLIC registerConnection(userId: string, socketId: string): void
        // Initialize user connections if not exists
        IF NOT userConnections.has(userId) THEN
            userConnections.set(userId, new Set())
        END IF
        
        // Clean up any existing connections for this user
        existingConnections = userConnections.get(userId)
        FOR EACH existingSocketId IN existingConnections
            IF existingSocketId != socketId THEN
                // Disconnect older connection
                disconnectSocket(existingSocketId)
                socketToUser.delete(existingSocketId)
                connectionTimestamps.delete(existingSocketId)
            END IF
        END FOR
        
        // Register new connection
        userConnections.set(userId, new Set([socketId]))
        socketToUser.set(socketId, userId)
        connectionTimestamps.set(socketId, Date.now())
        
        logConnectionEvent("USER_CONNECTED", userId, socketId)
    END
    
    PUBLIC deregisterConnection(socketId: string): void
        IF socketToUser.has(socketId) THEN
            userId = socketToUser.get(socketId)
            userConnections.get(userId)?.delete(socketId)
            socketToUser.delete(socketId)
            connectionTimestamps.delete(socketId)
            
            logConnectionEvent("USER_DISCONNECTED", userId, socketId)
        END IF
    END
    
    PUBLIC enforceConnectionLimits(): void
        FOR EACH [userId, socketIds] IN userConnections
            IF socketIds.size > MAX_CONNECTIONS_PER_USER THEN
                // Keep only the most recent connection
                sortedSockets = Array.from(socketIds).sort((a, b) => 
                    connectionTimestamps.get(b) - connectionTimestamps.get(a)
                )
                
                FOR i = 1 TO sortedSockets.length - 1
                    disconnectSocket(sortedSockets[i])
                    deregisterConnection(sortedSockets[i])
                END FOR
            END IF
        END FOR
    END
    
    PUBLIC cleanupStaleConnections(): void
        currentTime = Date.now()
        staleThreshold = 5 * 60 * 1000 // 5 minutes
        
        FOR EACH [socketId, timestamp] IN connectionTimestamps
            IF currentTime - timestamp > staleThreshold THEN
                IF NOT isSocketActive(socketId) THEN
                    deregisterConnection(socketId)
                    disconnectSocket(socketId)
                END IF
            END IF
        END FOR
    END
END CLASS
```

### 5. CONNECTION STATE MACHINE

```pseudocode
ENUM ConnectionState:
    DISCONNECTED = "disconnected"
    CONNECTING = "connecting"
    CONNECTED = "connected"
    RECONNECTING = "reconnecting"
    ERROR = "error"
    CLEANUP = "cleanup"
END ENUM

CLASS ConnectionStateMachine:
    PRIVATE currentState: ConnectionState = ConnectionState.DISCONNECTED
    PRIVATE stateTransitionHandlers: Map<string, Function> = new Map()
    
    PUBLIC transition(newState: ConnectionState, data?: any): boolean
        transition = currentState + "->" + newState
        
        // Validate transition
        IF NOT isValidTransition(currentState, newState) THEN
            logError("Invalid state transition", transition)
            RETURN false
        END IF
        
        // Execute pre-transition actions
        executePreTransitionActions(currentState, newState, data)
        
        // Update state
        previousState = currentState
        currentState = newState
        
        // Execute post-transition actions
        executePostTransitionActions(previousState, newState, data)
        
        // Notify listeners
        notifyStateChange(previousState, newState, data)
        
        RETURN true
    END
    
    PRIVATE isValidTransition(from: ConnectionState, to: ConnectionState): boolean
        validTransitions = {
            DISCONNECTED: [CONNECTING],
            CONNECTING: [CONNECTED, ERROR, DISCONNECTED],
            CONNECTED: [DISCONNECTED, RECONNECTING, ERROR, CLEANUP],
            RECONNECTING: [CONNECTED, ERROR, DISCONNECTED],
            ERROR: [CONNECTING, DISCONNECTED],
            CLEANUP: [DISCONNECTED]
        }
        
        RETURN validTransitions[from].includes(to)
    END
    
    PUBLIC getCurrentState(): ConnectionState
        RETURN currentState
    END
    
    PUBLIC isConnected(): boolean
        RETURN currentState == ConnectionState.CONNECTED
    END
    
    PUBLIC isTransitioning(): boolean
        RETURN currentState IN [ConnectionState.CONNECTING, ConnectionState.RECONNECTING]
    END
END CLASS
```

### 6. COMPREHENSIVE ERROR HANDLING

```pseudocode
CLASS WebSocketErrorHandler:
    PRIVATE retryAttempts: Map<string, number> = new Map()
    PRIVATE maxRetries: number = 5
    PRIVATE backoffMultiplier: number = 1.5
    PRIVATE baseDelay: number = 1000
    
    PUBLIC handleConnectionError(error: Error, connectionKey: string): void
        currentAttempts = retryAttempts.get(connectionKey) || 0
        
        // Log error with context
        logConnectionError(error, connectionKey, currentAttempts)
        
        // Determine error type and action
        errorType = categorizeError(error)
        
        SWITCH errorType:
            CASE "NETWORK_ERROR":
                IF currentAttempts < maxRetries THEN
                    scheduleRetry(connectionKey, currentAttempts)
                ELSE
                    handleMaxRetriesExceeded(connectionKey)
                END IF
                BREAK
                
            CASE "AUTH_ERROR":
                handleAuthenticationFailure(connectionKey)
                BREAK
                
            CASE "SERVER_ERROR":
                handleServerError(connectionKey, error)
                BREAK
                
            CASE "CLIENT_ERROR":
                handleClientError(connectionKey, error)
                BREAK
                
            DEFAULT:
                handleUnknownError(connectionKey, error)
        END SWITCH
    END
    
    PRIVATE scheduleRetry(connectionKey: string, attempts: number): void
        delay = baseDelay * Math.pow(backoffMultiplier, attempts)
        maxDelay = 30000 // 30 seconds maximum
        actualDelay = Math.min(delay, maxDelay)
        
        retryAttempts.set(connectionKey, attempts + 1)
        
        setTimeout(() => {
            attemptReconnection(connectionKey)
        }, actualDelay)
        
        logRetryScheduled(connectionKey, attempts + 1, actualDelay)
    END
    
    PUBLIC resetRetryCount(connectionKey: string): void
        retryAttempts.delete(connectionKey)
    END
    
    PRIVATE categorizeError(error: Error): string
        errorMessage = error.message.toLowerCase()
        
        IF errorMessage.includes("network") OR errorMessage.includes("timeout") THEN
            RETURN "NETWORK_ERROR"
        ELSE IF errorMessage.includes("auth") OR errorMessage.includes("unauthorized") THEN
            RETURN "AUTH_ERROR"
        ELSE IF errorMessage.includes("server") OR error.code >= 500 THEN
            RETURN "SERVER_ERROR"
        ELSE IF error.code >= 400 AND error.code < 500 THEN
            RETURN "CLIENT_ERROR"
        ELSE
            RETURN "UNKNOWN_ERROR"
        END IF
    END
END CLASS
```

### 7. PERFORMANCE OPTIMIZATION ALGORITHMS

```pseudocode
CLASS WebSocketPerformanceOptimizer:
    PRIVATE messageQueue: Queue<Message> = new Queue()
    PRIVATE batchSize: number = 10
    PRIVATE batchTimeout: number = 100 // milliseconds
    PRIVATE connectionPool: Map<string, WebSocketConnection> = new Map()
    
    PUBLIC optimizeMessageSending(connection: WebSocketConnection): void
        // Implement message batching
        batchTimer = null
        
        connection.onSend = (message: Message) => {
            messageQueue.enqueue(message)
            
            IF messageQueue.size >= batchSize THEN
                flushMessageBatch(connection)
            ELSE IF batchTimer is null THEN
                batchTimer = setTimeout(() => {
                    flushMessageBatch(connection)
                    batchTimer = null
                }, batchTimeout)
            END IF
        }
    END
    
    PRIVATE flushMessageBatch(connection: WebSocketConnection): void
        IF messageQueue.isEmpty() THEN
            RETURN
        END IF
        
        batch = []
        WHILE NOT messageQueue.isEmpty() AND batch.length < batchSize
            batch.push(messageQueue.dequeue())
        END WHILE
        
        // Send as single batched message
        connection.sendBatch(batch)
    END
    
    PUBLIC implementConnectionPooling(): void
        // Reuse connections across tabs for same user
        window.addEventListener("beforeunload", () => {
            // Don't disconnect immediately, keep connection alive
            // for potential reuse by other tabs
            markConnectionForReuse()
        })
        
        // Check for reusable connections on page load
        window.addEventListener("load", () => {
            existingConnection = checkForReusableConnection()
            IF existingConnection THEN
                reuseConnection(existingConnection)
            END IF
        })
    END
    
    PUBLIC optimizeMemoryUsage(): void
        // Implement circular buffer for message history
        maxHistorySize = 1000
        messageHistory = new CircularBuffer(maxHistorySize)
        
        // Cleanup old event listeners
        periodicCleanup = setInterval(() => {
            cleanupStaleEventListeners()
            garbageCollectConnections()
        }, 60000) // Every minute
    END
END CLASS
```

This pseudocode provides the complete algorithmic foundation for implementing the WebSocket connection singleton pattern, addressing all the issues identified in the specification phase. The algorithms ensure single connection per user, proper React integration, server-side deduplication, and comprehensive error handling.