# SPARC API Server Enhancement - Pseudocode Specification

## Overview
This specification defines the comprehensive enhancement of the API server to eliminate all "failed to fetch" errors by implementing missing endpoints with realistic mock data and WebSocket support.

## PHASE 1: MOCK DATA GENERATION ALGORITHMS

### 1.1 Agent Data Generation

```
ALGORITHM: GenerateAgentMockData
PURPOSE: Create realistic agent data with proper relationships
OUTPUT: Array of Agent objects with consistent IDs

BEGIN
    // Base agent categories and types
    agentCategories ← [
        'Development', 'Analytics', 'Content', 'Creative', 'Productivity',
        'Security', 'DevOps', 'Integration', 'Testing', 'Documentation'
    ]

    agentStatuses ← ['active', 'inactive', 'busy', 'maintenance']

    mockAgents ← []

    FOR i ← 0 TO 50 DO
        agentId ← crypto.randomUUID()

        agent ← {
            id: agentId,
            name: GenerateAgentName(agentCategories[i % agentCategories.length]),
            status: RandomChoice(agentStatuses),
            category: agentCategories[i % agentCategories.length],
            description: GenerateAgentDescription(),
            capabilities: GenerateCapabilities(),
            created_at: RandomTimestamp(-365, 0), // Last 365 days
            updated_at: RandomTimestamp(-30, 0),   // Last 30 days
            metadata: {
                version: RandomVersion(),
                performance_score: Random(0.7, 1.0),
                load_factor: Random(0.0, 0.8)
            }
        }

        mockAgents.append(agent)
    END FOR

    RETURN mockAgents
END

SUBROUTINE: GenerateAgentName
INPUT: category (string)
OUTPUT: name (string)

BEGIN
    prefixes ← GetCategoryPrefixes(category)
    suffixes ← ['Assistant', 'Agent', 'Bot', 'Helper', 'Analyzer', 'Manager']

    RETURN RandomChoice(prefixes) + ' ' + RandomChoice(suffixes)
END

SUBROUTINE: GenerateCapabilities
OUTPUT: Array of capability strings

BEGIN
    allCapabilities ← [
        'code_generation', 'data_analysis', 'content_writing',
        'image_processing', 'file_management', 'api_integration',
        'testing', 'debugging', 'deployment', 'monitoring'
    ]

    numCapabilities ← Random(2, 6)
    RETURN RandomSample(allCapabilities, numCapabilities)
END
```

### 1.2 Activity Feed Data Generation

```
ALGORITHM: GenerateActivityFeedData
PURPOSE: Create realistic activity data for live feed
INPUT: agents (Array), timeRange (integer days)
OUTPUT: Array of Activity objects

BEGIN
    activities ← []
    activityTypes ← [
        'task_started', 'task_completed', 'error_occurred',
        'deployment', 'analysis_complete', 'file_processed',
        'api_call', 'data_sync', 'backup_created', 'system_update'
    ]

    FOR i ← 0 TO 1000 DO
        agent ← RandomChoice(agents)
        activityType ← RandomChoice(activityTypes)

        activity ← {
            id: crypto.randomUUID(),
            agent_id: agent.id,
            agent_name: agent.name,
            type: activityType,
            title: GenerateActivityTitle(activityType),
            description: GenerateActivityDescription(activityType),
            status: GenerateActivityStatus(activityType),
            timestamp: RandomTimestamp(-timeRange, 0),
            metadata: GenerateActivityMetadata(activityType),
            tags: GenerateActivityTags(activityType),
            priority: RandomChoice(['low', 'medium', 'high', 'urgent'])
        }

        activities.append(activity)
    END FOR

    // Sort by timestamp descending (newest first)
    activities.sortBy(timestamp, DESC)

    RETURN activities
END

SUBROUTINE: GenerateActivityTitle
INPUT: activityType (string)
OUTPUT: title (string)

BEGIN
    SWITCH activityType
        CASE 'task_started':
            RETURN 'Started ' + RandomChoice(['processing', 'analyzing', 'generating']) +
                   ' ' + RandomChoice(['data', 'content', 'reports', 'files'])
        CASE 'task_completed':
            RETURN 'Completed ' + RandomChoice(['analysis', 'generation', 'processing']) +
                   ' with ' + Random(85, 100) + '% success rate'
        CASE 'error_occurred':
            RETURN RandomChoice(['Connection timeout', 'Parse error', 'Invalid input']) +
                   ' in ' + RandomChoice(['data processing', 'file analysis', 'API call'])
        DEFAULT:
            RETURN 'System activity: ' + activityType
    END SWITCH
END
```

### 1.3 Token Analytics Data Generation

```
ALGORITHM: GenerateTokenAnalyticsData
PURPOSE: Create realistic token usage and cost analytics
INPUT: timeRange (string), granularity (string)
OUTPUT: Analytics data structure

BEGIN
    IF timeRange = '1h' THEN
        dataPoints ← 60  // 1 minute intervals
        intervalMinutes ← 1
    ELSE IF timeRange = '24h' THEN
        dataPoints ← 24  // 1 hour intervals
        intervalMinutes ← 60
    ELSE IF timeRange = '7d' THEN
        dataPoints ← 7   // 1 day intervals
        intervalMinutes ← 1440
    ELSE // '30d'
        dataPoints ← 30  // 1 day intervals
        intervalMinutes ← 1440
    END IF

    analytics ← {
        time_range: timeRange,
        total_tokens: 0,
        total_cost: 0.0,
        data_points: [],
        breakdown: {
            input_tokens: 0,
            output_tokens: 0,
            cached_tokens: 0
        },
        agents_usage: []
    }

    FOR i ← 0 TO dataPoints - 1 DO
        timestamp ← CurrentTime() - (i * intervalMinutes * 60)

        // Generate realistic token usage patterns
        baseUsage ← CalculateBaseUsage(timeRange, i)
        inputTokens ← Random(baseUsage * 0.6, baseUsage * 0.8)
        outputTokens ← Random(baseUsage * 0.2, baseUsage * 0.4)
        cachedTokens ← Random(0, baseUsage * 0.1)

        totalTokens ← inputTokens + outputTokens + cachedTokens
        cost ← CalculateTokenCost(inputTokens, outputTokens, cachedTokens)

        dataPoint ← {
            timestamp: timestamp,
            input_tokens: inputTokens,
            output_tokens: outputTokens,
            cached_tokens: cachedTokens,
            total_tokens: totalTokens,
            cost: cost,
            requests_count: Random(10, 100)
        }

        analytics.data_points.append(dataPoint)
        analytics.total_tokens += totalTokens
        analytics.total_cost += cost
    END FOR

    // Update breakdown totals
    FOR EACH point IN analytics.data_points DO
        analytics.breakdown.input_tokens += point.input_tokens
        analytics.breakdown.output_tokens += point.output_tokens
        analytics.breakdown.cached_tokens += point.cached_tokens
    END FOR

    RETURN analytics
END

SUBROUTINE: CalculateBaseUsage
INPUT: timeRange (string), intervalIndex (integer)
OUTPUT: baseUsage (integer)

BEGIN
    // Simulate realistic usage patterns
    IF timeRange = '1h' THEN
        // Higher granularity, smaller numbers
        RETURN Random(100, 1000)
    ELSE IF timeRange = '24h' THEN
        // Business hours simulation
        hour ← intervalIndex
        IF hour >= 9 AND hour <= 17 THEN
            RETURN Random(5000, 15000)  // Business hours
        ELSE
            RETURN Random(1000, 5000)   // Off hours
        END IF
    ELSE
        // Daily patterns
        RETURN Random(50000, 200000)
    END IF
END
```

## PHASE 2: ENHANCED API SERVER ARCHITECTURE

### 2.1 Main Server Structure Enhancement

```
ALGORITHM: EnhancedAPIServerInitialization
PURPOSE: Initialize comprehensive API server with all endpoints
OUTPUT: Configured Express server with WebSocket support

BEGIN
    // Import dependencies
    IMPORT express, cors, crypto, http, socketio, ws

    // Initialize Express app and HTTP server
    app ← express()
    server ← http.createServer(app)
    io ← socketio(server, {cors: {origin: "*"}})

    // Configure middleware
    ConfigureMiddleware(app)

    // Initialize mock data stores
    dataStore ← InitializeDataStores()

    // Configure API routes
    ConfigureStaticDataRoutes(app, dataStore)
    ConfigureV1Routes(app, dataStore)
    ConfigureClaudeRoutes(app, dataStore)
    ConfigureDualInstanceRoutes(app, dataStore)
    ConfigureAnalyticsRoutes(app, dataStore)
    ConfigureWorkspaceRoutes(app, dataStore)
    ConfigureStreamingRoutes(app, dataStore)

    // Initialize WebSocket handlers
    InitializeWebSocketHandlers(io, dataStore)

    // Initialize data refresh timers
    InitializeDataRefresh(dataStore, io)

    // Start server
    port ← process.env.PORT || 3001
    server.listen(port, () => {
        LogServerStartup(port)
    })

    RETURN server
END

SUBROUTINE: InitializeDataStores
PURPOSE: Create and populate all mock data structures
OUTPUT: Comprehensive data store object

BEGIN
    agents ← GenerateAgentMockData()
    activities ← GenerateActivityFeedData(agents, 30)
    agentPosts ← GenerateAgentPosts(agents, 100)

    dataStore ← {
        agents: agents,
        activities: activities,
        agentPosts: agentPosts,

        // Claude integration data
        claudeInstances: [],
        claudeTerminalSessions: new Map(),

        // Dual instance monitoring
        dualInstanceStatus: GenerateDualInstanceStatus(),
        dualInstanceMessages: GenerateDualInstanceMessages(50),
        pendingConfirmations: [],

        // Analytics data
        tokenAnalytics: new Map(),  // Cached by timeRange
        systemMetrics: GenerateSystemMetrics(),

        // Workspace data
        workspaces: new Map(),      // agent_id -> workspace info
        pages: new Map(),           // page_id -> page data

        // Real-time connections
        connectedClients: new Set(),
        activeStreams: new Map()
    }

    // Pre-generate analytics for common time ranges
    FOR EACH range IN ['1h', '24h', '7d', '30d'] DO
        dataStore.tokenAnalytics.set(range, GenerateTokenAnalyticsData(range, 'hourly'))
    END FOR

    RETURN dataStore
END
```

### 2.2 V1 API Routes Implementation

```
ALGORITHM: ConfigureV1Routes
PURPOSE: Implement all /api/v1/* endpoints
INPUT: app (Express app), dataStore (data structure)

BEGIN
    v1Router ← express.Router()

    // Agent management endpoints
    v1Router.get('/agents', (req, res) => {
        HandleAgentsList(req, res, dataStore)
    })

    v1Router.get('/agents/:id', (req, res) => {
        HandleAgentDetails(req, res, dataStore)
    })

    v1Router.post('/agents', (req, res) => {
        HandleCreateAgent(req, res, dataStore)
    })

    v1Router.put('/agents/:id', (req, res) => {
        HandleUpdateAgent(req, res, dataStore)
    })

    v1Router.delete('/agents/:id', (req, res) => {
        HandleDeleteAgent(req, res, dataStore)
    })

    // Activity endpoints
    v1Router.get('/activities', (req, res) => {
        HandleActivitiesList(req, res, dataStore)
    })

    v1Router.get('/activities/:id', (req, res) => {
        HandleActivityDetails(req, res, dataStore)
    })

    // Agent posts endpoints
    v1Router.get('/agent-posts', (req, res) => {
        HandleAgentPostsList(req, res, dataStore)
    })

    v1Router.post('/agent-posts', (req, res) => {
        HandleCreateAgentPost(req, res, dataStore)
    })

    v1Router.put('/agent-posts/:id/engagement', (req, res) => {
        HandlePostEngagement(req, res, dataStore)
    })

    // Claude live endpoints
    v1Router.get('/claude-live/prod/agents', (req, res) => {
        HandleClaudeLiveAgents(req, res, dataStore)
    })

    v1Router.get('/claude-live/prod/activities', (req, res) => {
        HandleClaudeLiveActivities(req, res, dataStore)
    })

    // Metrics endpoints
    v1Router.get('/metrics/system', (req, res) => {
        HandleSystemMetrics(req, res, dataStore)
    })

    v1Router.get('/agents/metrics', (req, res) => {
        HandleAgentMetrics(req, res, dataStore)
    })

    // Mount v1 router
    app.use('/api/v1', v1Router)
END

SUBROUTINE: HandleAgentsList
INPUT: req (Request), res (Response), dataStore (Object)
PURPOSE: Handle GET /api/v1/agents with filtering and pagination

BEGIN
    {limit = 20, offset = 0, status, category, search} ← req.query

    filteredAgents ← dataStore.agents

    // Apply status filter
    IF status IS NOT EMPTY THEN
        filteredAgents ← filteredAgents.filter(agent => agent.status = status)
    END IF

    // Apply category filter
    IF category IS NOT EMPTY THEN
        filteredAgents ← filteredAgents.filter(agent => agent.category = category)
    END IF

    // Apply search filter
    IF search IS NOT EMPTY THEN
        searchLower ← search.toLowerCase()
        filteredAgents ← filteredAgents.filter(agent =>
            agent.name.toLowerCase().includes(searchLower) OR
            agent.description.toLowerCase().includes(searchLower)
        )
    END IF

    // Apply pagination
    total ← filteredAgents.length
    paginatedAgents ← filteredAgents.slice(offset, offset + limit)

    response ← {
        success: true,
        data: paginatedAgents,
        pagination: {
            total: total,
            limit: parseInt(limit),
            offset: parseInt(offset),
            has_more: (offset + limit) < total
        },
        timestamp: new Date().toISOString()
    }

    res.json(response)
END
```

### 2.3 Analytics Endpoints Implementation

```
ALGORITHM: ConfigureAnalyticsRoutes
PURPOSE: Implement comprehensive analytics endpoints
INPUT: app (Express app), dataStore (data structure)

BEGIN
    analyticsRouter ← express.Router()

    // Token analytics endpoints
    analyticsRouter.get('/tokens', (req, res) => {
        HandleTokenAnalytics(req, res, dataStore)
    })

    analyticsRouter.get('/tokens/hourly', (req, res) => {
        HandleHourlyTokenAnalytics(req, res, dataStore)
    })

    analyticsRouter.get('/tokens/summary', (req, res) => {
        HandleTokenSummary(req, res, dataStore)
    })

    // Performance analytics
    analyticsRouter.get('/performance', (req, res) => {
        HandlePerformanceAnalytics(req, res, dataStore)
    })

    // Budget and cost tracking
    analyticsRouter.get('/budget', (req, res) => {
        HandleBudgetAnalytics(req, res, dataStore)
    })

    analyticsRouter.get('/budget/config', (req, res) => {
        HandleBudgetConfig(req, res, dataStore)
    })

    analyticsRouter.post('/budget/config', (req, res) => {
        HandleUpdateBudgetConfig(req, res, dataStore)
    })

    // Agent-specific analytics
    analyticsRouter.get('/agents', (req, res) => {
        HandleAgentAnalytics(req, res, dataStore)
    })

    // Health check for analytics service
    analyticsRouter.get('/health', (req, res) => {
        HandleAnalyticsHealth(req, res, dataStore)
    })

    // Pricing information
    analyticsRouter.get('/pricing', (req, res) => {
        HandlePricingInfo(req, res, dataStore)
    })

    app.use('/api/v1/analytics', analyticsRouter)
    app.use('/api/token-analytics', analyticsRouter) // Legacy support
END

SUBROUTINE: HandleTokenAnalytics
INPUT: req (Request), res (Response), dataStore (Object)
PURPOSE: Handle token usage analytics with time range filtering

BEGIN
    {range = '24h', granularity = 'hourly', agent_id} ← req.query

    // Get or generate analytics data for the requested range
    IF dataStore.tokenAnalytics.has(range) THEN
        analytics ← dataStore.tokenAnalytics.get(range)
    ELSE
        analytics ← GenerateTokenAnalyticsData(range, granularity)
        dataStore.tokenAnalytics.set(range, analytics)
    END IF

    // Filter by agent if specified
    IF agent_id IS NOT EMPTY THEN
        analytics ← FilterAnalyticsByAgent(analytics, agent_id)
    END IF

    // Add current usage trends
    trends ← CalculateUsageTrends(analytics)

    response ← {
        success: true,
        data: {
            time_range: range,
            granularity: granularity,
            summary: {
                total_tokens: analytics.total_tokens,
                total_cost: analytics.total_cost,
                average_cost_per_1k_tokens: CalculateAverageCost(analytics),
                peak_usage_hour: FindPeakUsage(analytics)
            },
            breakdown: analytics.breakdown,
            data_points: analytics.data_points,
            trends: trends,
            projections: CalculateProjections(analytics, range)
        },
        meta: {
            generated_at: new Date().toISOString(),
            data_freshness: CalculateDataFreshness(),
            cache_status: 'hit'
        }
    }

    res.json(response)
END
```

## PHASE 3: WEBSOCKET INTEGRATION

### 3.1 WebSocket Connection Management

```
ALGORITHM: InitializeWebSocketHandlers
PURPOSE: Set up WebSocket connections for real-time features
INPUT: io (Socket.io server), dataStore (data structure)

BEGIN
    // Connection handling
    io.on('connection', (socket) => {
        HandleNewWebSocketConnection(socket, dataStore)
    })

    // Set up periodic broadcasts
    SetupPeriodicBroadcasts(io, dataStore)
END

SUBROUTINE: HandleNewWebSocketConnection
INPUT: socket (Socket), dataStore (Object)
PURPOSE: Handle new WebSocket client connections

BEGIN
    clientId ← crypto.randomUUID()
    dataStore.connectedClients.add(clientId)

    LogConnection(clientId, socket.id)

    // Send initial data
    socket.emit('initial_data', {
        agents: dataStore.agents.slice(0, 10),      // First 10 agents
        recent_activities: dataStore.activities.slice(0, 20), // Last 20 activities
        system_status: GenerateSystemStatus()
    })

    // Handle agent status subscription
    socket.on('subscribe_agent_status', (agentIds) => {
        FOR EACH agentId IN agentIds DO
            socket.join(`agent_${agentId}`)
        END FOR

        socket.emit('subscription_confirmed', {
            type: 'agent_status',
            agent_ids: agentIds
        })
    })

    // Handle activity feed subscription
    socket.on('subscribe_activities', (filters) => {
        socket.join('activities_feed')
        socket.emit('subscription_confirmed', {
            type: 'activities',
            filters: filters
        })
    })

    // Handle dual instance monitoring
    socket.on('subscribe_dual_instance', () => {
        socket.join('dual_instance_monitoring')
        socket.emit('dual_instance_status', dataStore.dualInstanceStatus)
    })

    // Handle analytics subscription
    socket.on('subscribe_analytics', (config) => {
        socket.join(`analytics_${config.type}`)
        IF config.type = 'tokens' THEN
            socket.emit('token_analytics_update',
                dataStore.tokenAnalytics.get(config.time_range || '24h'))
        END IF
    })

    // Handle terminal WebSocket for Claude instances
    socket.on('terminal_connect', (instanceId) => {
        HandleTerminalConnection(socket, instanceId, dataStore)
    })

    // Handle disconnection
    socket.on('disconnect', () => {
        dataStore.connectedClients.delete(clientId)
        LogDisconnection(clientId, socket.id)
    })
END

SUBROUTINE: SetupPeriodicBroadcasts
INPUT: io (Socket.io server), dataStore (Object)
PURPOSE: Set up periodic data broadcasts to connected clients

BEGIN
    // Broadcast new activities every 5 seconds
    setInterval(() => {
        IF HasNewActivities(dataStore) THEN
            newActivity ← GenerateRandomActivity(dataStore.agents)
            dataStore.activities.unshift(newActivity)

            io.to('activities_feed').emit('new_activity', newActivity)
        END IF
    }, 5000)

    // Broadcast agent status changes every 10 seconds
    setInterval(() => {
        FOR EACH agent IN dataStore.agents DO
            IF ShouldUpdateAgentStatus(agent) THEN
                oldStatus ← agent.status
                agent.status ← RandomAgentStatus()
                agent.updated_at ← new Date().toISOString()

                io.to(`agent_${agent.id}`).emit('agent_status_change', {
                    agent_id: agent.id,
                    old_status: oldStatus,
                    new_status: agent.status,
                    timestamp: agent.updated_at
                })
            END IF
        END FOR
    }, 10000)

    // Broadcast system metrics every 30 seconds
    setInterval(() => {
        metrics ← GenerateRealTimeSystemMetrics()
        dataStore.systemMetrics ← UpdateSystemMetrics(dataStore.systemMetrics, metrics)

        io.emit('system_metrics_update', {
            cpu_usage: metrics.cpu_usage,
            memory_usage: metrics.memory_usage,
            active_agents: CountActiveAgents(dataStore.agents),
            total_activities: dataStore.activities.length,
            timestamp: new Date().toISOString()
        })
    }, 30000)

    // Broadcast token analytics updates every 2 minutes
    setInterval(() => {
        FOR EACH range IN ['1h', '24h'] DO
            updatedAnalytics ← RefreshTokenAnalytics(dataStore, range)
            io.to(`analytics_tokens`).emit('token_analytics_update', {
                time_range: range,
                data: updatedAnalytics
            })
        END FOR
    }, 120000)
END
```

### 3.2 Claude Terminal WebSocket Implementation

```
ALGORITHM: HandleTerminalConnection
PURPOSE: Handle Claude instance terminal WebSocket connections
INPUT: socket (Socket), instanceId (string), dataStore (Object)

BEGIN
    // Verify instance exists or create mock instance
    IF NOT HasClaudeInstance(dataStore, instanceId) THEN
        instance ← CreateMockClaudeInstance(instanceId)
        dataStore.claudeInstances.push(instance)
    END IF

    // Initialize terminal session
    sessionId ← crypto.randomUUID()
    terminalSession ← {
        id: sessionId,
        instance_id: instanceId,
        socket_id: socket.id,
        connected_at: new Date().toISOString(),
        command_history: [],
        output_buffer: []
    }

    dataStore.claudeTerminalSessions.set(sessionId, terminalSession)

    // Send initial terminal state
    socket.emit('terminal_ready', {
        session_id: sessionId,
        instance_id: instanceId,
        prompt: 'claude-instance:~$ '
    })

    // Handle command input
    socket.on('terminal_input', (data) => {
        HandleTerminalInput(socket, sessionId, data, dataStore)
    })

    // Handle terminal resize
    socket.on('terminal_resize', (dimensions) => {
        terminalSession.dimensions ← dimensions
        socket.emit('terminal_resized', dimensions)
    })

    // Simulate periodic output for active sessions
    outputInterval ← setInterval(() => {
        IF Random(0, 1) < 0.3 THEN  // 30% chance of output
            mockOutput ← GenerateMockTerminalOutput()
            socket.emit('terminal_output', mockOutput)
            terminalSession.output_buffer.append(mockOutput)
        END IF
    }, 3000)

    // Handle disconnection
    socket.on('disconnect', () => {
        clearInterval(outputInterval)
        dataStore.claudeTerminalSessions.delete(sessionId)
    })
END

SUBROUTINE: HandleTerminalInput
INPUT: socket (Socket), sessionId (string), data (Object), dataStore (Object)
PURPOSE: Process terminal command input and generate appropriate responses

BEGIN
    session ← dataStore.claudeTerminalSessions.get(sessionId)
    command ← data.command.trim()

    // Add to command history
    session.command_history.push({
        command: command,
        timestamp: new Date().toISOString()
    })

    // Echo command
    socket.emit('terminal_output', {
        type: 'echo',
        data: `claude-instance:~$ ${command}\n`
    })

    // Generate realistic command response
    response ← GenerateCommandResponse(command)

    // Simulate processing delay
    setTimeout(() => {
        socket.emit('terminal_output', {
            type: 'output',
            data: response.output
        })

        socket.emit('terminal_output', {
            type: 'prompt',
            data: 'claude-instance:~$ '
        })
    }, response.delay)
END

SUBROUTINE: GenerateCommandResponse
INPUT: command (string)
OUTPUT: Response object with output and delay

BEGIN
    SWITCH command
        CASE 'ls':
            RETURN {
                output: 'agent_workspace/  config/  logs/  models/  temp/\n',
                delay: Random(100, 300)
            }
        CASE 'pwd':
            RETURN {
                output: '/home/claude/workspace\n',
                delay: Random(50, 150)
            }
        CASE 'ps aux':
            RETURN {
                output: GenerateProcessList(),
                delay: Random(200, 500)
            }
        CASE command.startsWith('cat '):
            filename ← command.substring(4)
            RETURN {
                output: GenerateMockFileContent(filename),
                delay: Random(100, 400)
            }
        DEFAULT:
            IF command IS EMPTY THEN
                RETURN {output: '', delay: 50}
            ELSE
                RETURN {
                    output: `bash: ${command}: command not found\n`,
                    delay: Random(100, 200)
                }
            END IF
    END SWITCH
END
```

## PHASE 4: ERROR HANDLING AND LOGGING

### 4.1 Comprehensive Error Handling

```
ALGORITHM: ConfigureErrorHandling
PURPOSE: Implement consistent error handling across all endpoints
INPUT: app (Express app)

BEGIN
    // Request logging middleware
    app.use((req, res, next) => {
        requestId ← crypto.randomUUID()
        req.requestId ← requestId

        LogRequest(requestId, req.method, req.path, req.query)
        next()
    })

    // Error handling middleware (must be last)
    app.use((error, req, res, next) => {
        HandleAPIError(error, req, res)
    })

    // 404 handler for missing endpoints
    app.use('*', (req, res) => {
        LogMissingEndpoint(req.method, req.path)

        res.status(404).json({
            success: false,
            error: {
                code: 'ENDPOINT_NOT_FOUND',
                message: `Endpoint ${req.method} ${req.path} not found`,
                suggestions: SuggestSimilarEndpoints(req.path)
            },
            request_id: req.requestId,
            timestamp: new Date().toISOString()
        })
    })
END

SUBROUTINE: HandleAPIError
INPUT: error (Error), req (Request), res (Response)
PURPOSE: Centralized error handling with consistent response format

BEGIN
    errorId ← crypto.randomUUID()
    statusCode ← error.statusCode || 500

    // Log error with context
    LogError(errorId, error, {
        request_id: req.requestId,
        method: req.method,
        path: req.path,
        user_agent: req.headers['user-agent']
    })

    // Determine error response based on type
    IF error.name = 'ValidationError' THEN
        errorResponse ← {
            success: false,
            error: {
                code: 'VALIDATION_ERROR',
                message: 'Request validation failed',
                details: FormatValidationErrors(error.errors)
            }
        }
    ELSE IF error.name = 'NotFoundError' THEN
        errorResponse ← {
            success: false,
            error: {
                code: 'RESOURCE_NOT_FOUND',
                message: error.message || 'Requested resource not found'
            }
        }
    ELSE IF error.name = 'RateLimitError' THEN
        errorResponse ← {
            success: false,
            error: {
                code: 'RATE_LIMIT_EXCEEDED',
                message: 'Too many requests, please try again later',
                retry_after: error.retryAfter || 60
            }
        }
    ELSE
        // Generic error response (don't leak internal details)
        errorResponse ← {
            success: false,
            error: {
                code: 'INTERNAL_SERVER_ERROR',
                message: 'An unexpected error occurred'
            }
        }
    END IF

    // Add common fields
    errorResponse.error_id ← errorId
    errorResponse.request_id ← req.requestId
    errorResponse.timestamp ← new Date().toISOString()

    res.status(statusCode).json(errorResponse)
END
```

### 4.2 Data Validation Patterns

```
ALGORITHM: ValidateRequestData
PURPOSE: Consistent request validation across endpoints
INPUT: req (Request), schema (ValidationSchema)
OUTPUT: Boolean success and error details

BEGIN
    validationResult ← {
        success: true,
        errors: []
    }

    // Validate required fields
    FOR EACH field IN schema.required DO
        IF NOT HasField(req.body, field) THEN
            validationResult.errors.push({
                field: field,
                code: 'REQUIRED_FIELD_MISSING',
                message: `Field '${field}' is required`
            })
            validationResult.success ← false
        END IF
    END FOR

    // Validate field types and formats
    FOR EACH field, rules IN schema.fields DO
        IF HasField(req.body, field) THEN
            value ← GetFieldValue(req.body, field)

            // Type validation
            IF NOT ValidateType(value, rules.type) THEN
                validationResult.errors.push({
                    field: field,
                    code: 'INVALID_TYPE',
                    message: `Field '${field}' must be of type ${rules.type}`
                })
                validationResult.success ← false
            END IF

            // Format validation
            IF rules.format AND NOT ValidateFormat(value, rules.format) THEN
                validationResult.errors.push({
                    field: field,
                    code: 'INVALID_FORMAT',
                    message: `Field '${field}' has invalid format`
                })
                validationResult.success ← false
            END IF

            // Length validation
            IF rules.minLength AND value.length < rules.minLength THEN
                validationResult.errors.push({
                    field: field,
                    code: 'VALUE_TOO_SHORT',
                    message: `Field '${field}' must be at least ${rules.minLength} characters`
                })
                validationResult.success ← false
            END IF
        END IF
    END FOR

    RETURN validationResult
END
```

## PHASE 5: PERFORMANCE AND OPTIMIZATION

### 5.1 Caching Strategy

```
ALGORITHM: ImplementCachingStrategy
PURPOSE: Optimize API performance with intelligent caching
INPUT: dataStore (Object)

BEGIN
    // Initialize cache stores
    responseCache ← new Map()  // URL -> cached response
    dataCache ← new Map()      // Key -> cached data
    cacheTimestamps ← new Map() // Key -> last update time

    // Cache configuration
    cacheConfig ← {
        default_ttl: 300,    // 5 minutes
        agents_ttl: 600,     // 10 minutes
        activities_ttl: 60,  // 1 minute
        analytics_ttl: 1800  // 30 minutes
    }

    // Cache middleware
    cacheMiddleware ← (req, res, next) => {
        IF req.method != 'GET' THEN
            next()
            RETURN
        END IF

        cacheKey ← GenerateCacheKey(req.path, req.query)
        cachedResponse ← responseCache.get(cacheKey)

        IF cachedResponse AND NOT IsCacheExpired(cacheKey, cacheConfig) THEN
            res.set('X-Cache', 'HIT')
            res.json(cachedResponse)
            RETURN
        END IF

        // Monkey patch res.json to cache response
        originalJson ← res.json
        res.json ← (data) => {
            responseCache.set(cacheKey, data)
            cacheTimestamps.set(cacheKey, Date.now())
            res.set('X-Cache', 'MISS')
            originalJson.call(res, data)
        }

        next()
    }

    // Periodic cache cleanup
    setInterval(() => {
        CleanupExpiredCache(responseCache, cacheTimestamps, cacheConfig)
    }, 300000)  // Every 5 minutes

    RETURN cacheMiddleware
END

SUBROUTINE: GenerateCacheKey
INPUT: path (string), query (Object)
OUTPUT: cacheKey (string)

BEGIN
    // Create consistent cache key from path and query parameters
    sortedQuery ← SortObjectKeys(query)
    queryString ← JSON.stringify(sortedQuery)
    RETURN `${path}:${crypto.createHash('md5').update(queryString).digest('hex')}`
END
```

### 5.2 Rate Limiting Implementation

```
ALGORITHM: ImplementRateLimiting
PURPOSE: Prevent abuse and ensure fair API usage
INPUT: app (Express app)

BEGIN
    // Rate limiting configuration
    rateLimitConfig ← {
        windowMs: 900000,        // 15 minutes
        maxRequests: 1000,       // Max requests per window
        standardDelay: 0,        // No delay for standard requests
        delayAfter: 500,         // Start delaying after 500 requests
        maxDelayMs: 2000,        // Maximum delay of 2 seconds

        // Skip conditions
        skipSuccessfulRequests: false,
        skipFailedRequests: false,

        // Key generator (per IP)
        keyGenerator: (req) => req.ip,

        // Custom error response
        handler: (req, res) => {
            res.status(429).json({
                success: false,
                error: {
                    code: 'RATE_LIMIT_EXCEEDED',
                    message: 'Too many requests from this IP, please try again later',
                    retry_after: Math.ceil(rateLimitConfig.windowMs / 1000)
                },
                request_id: req.requestId,
                timestamp: new Date().toISOString()
            })
        }
    }

    // Create rate limiter
    rateLimiter ← CreateRateLimiter(rateLimitConfig)

    // Apply to all routes
    app.use('/api/', rateLimiter)

    // Special rate limiting for expensive operations
    analyticsRateLimiter ← CreateRateLimiter({
        ...rateLimitConfig,
        maxRequests: 100,  // Lower limit for analytics
        windowMs: 300000   // 5 minute window
    })

    app.use('/api/v1/analytics', analyticsRateLimiter)
    app.use('/api/token-analytics', analyticsRateLimiter)
END
```

## PHASE 6: DEPLOYMENT AND MONITORING

### 6.1 Health Checks and Monitoring

```
ALGORITHM: ImplementHealthChecks
PURPOSE: Comprehensive health monitoring for the API server
INPUT: app (Express app), dataStore (Object)

BEGIN
    // Basic health check
    app.get('/health', (req, res) => {
        healthStatus ← {
            status: 'healthy',
            timestamp: new Date().toISOString(),
            version: '1.0.0',
            uptime: process.uptime(),
            environment: process.env.NODE_ENV || 'development'
        }

        res.json(healthStatus)
    })

    // Detailed health check
    app.get('/health/detailed', async (req, res) => {
        healthDetails ← await GenerateDetailedHealthCheck(dataStore)
        res.json(healthDetails)
    })

    // Ready check for Kubernetes
    app.get('/ready', (req, res) => {
        IF IsServerReady(dataStore) THEN
            res.status(200).json({status: 'ready'})
        ELSE
            res.status(503).json({status: 'not ready'})
        END IF
    })

    // Live check for Kubernetes
    app.get('/live', (req, res) => {
        res.status(200).json({status: 'alive'})
    })
END

SUBROUTINE: GenerateDetailedHealthCheck
INPUT: dataStore (Object)
OUTPUT: Detailed health status object

BEGIN
    memoryUsage ← process.memoryUsage()

    healthDetails ← {
        status: 'healthy',
        timestamp: new Date().toISOString(),
        checks: {
            database: {
                status: 'healthy',
                response_time: Random(1, 10) + 'ms'
            },
            cache: {
                status: 'healthy',
                hit_rate: CalculateCacheHitRate()
            },
            websockets: {
                status: 'healthy',
                active_connections: dataStore.connectedClients.size
            },
            memory: {
                status: memoryUsage.heapUsed < 500 * 1024 * 1024 ? 'healthy' : 'warning',
                heap_used: `${Math.round(memoryUsage.heapUsed / 1024 / 1024)}MB`,
                heap_total: `${Math.round(memoryUsage.heapTotal / 1024 / 1024)}MB`
            }
        },
        metrics: {
            total_requests: GetTotalRequestCount(),
            error_rate: CalculateErrorRate(),
            average_response_time: CalculateAverageResponseTime(),
            active_agents: CountActiveAgents(dataStore.agents),
            total_activities: dataStore.activities.length
        }
    }

    RETURN healthDetails
END
```

This comprehensive pseudocode specification provides a complete blueprint for enhancing the API server to eliminate all "failed to fetch" errors while maintaining realistic functionality and performance.

<function_calls>
<invoke name="TodoWrite">
<parameter name="todos">[{"content": "Analyze current API server structure and identify missing endpoints", "status": "completed", "activeForm": "Analyzing current API server structure and identifying missing endpoints"}, {"content": "Design comprehensive mock data generation algorithms for all endpoints", "status": "completed", "activeForm": "Designing comprehensive mock data generation algorithms for all endpoints"}, {"content": "Create enhanced API server architecture pseudocode", "status": "completed", "activeForm": "Creating enhanced API server architecture pseudocode"}, {"content": "Design WebSocket integration for real-time features", "status": "completed", "activeForm": "Designing WebSocket integration for real-time features"}, {"content": "Specify endpoint implementation patterns and error handling", "status": "completed", "activeForm": "Specifying endpoint implementation patterns and error handling"}]