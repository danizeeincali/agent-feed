# SPARC:DEBUG - Terminal WebSocket Connectivity Pseudocode

## Phase 2: PSEUDOCODE - Connection Flow Design

### Core Connection Algorithm

#### **1. Frontend Terminal Connection Flow**

```pseudocode
FUNCTION initializeTerminalConnection(instanceId):
    // Phase 1: Validate Prerequisites
    IF terminal_container_not_available:
        THROW TerminalContainerError
    
    // Phase 2: Initialize Terminal with Fallback
    TRY:
        terminal = createXTermInstance(settings)
        addons = loadTerminalAddons()  // FitAddon, WebLinksAddon, SearchAddon
    CATCH AddonLoadError:
        terminal = createXTermInstance(settings)
        addons = loadEssentialAddons()  // Only FitAddon
        showNotification("Some features disabled")
    
    // Phase 3: WebSocket Connection with Retry Logic
    connection_state = "connecting"
    retry_count = 0
    max_retries = 5
    
    WHILE retry_count < max_retries AND connection_state != "connected":
        TRY:
            socket = createSocketIOConnection(websocket_url)
            socket.emit("terminal:join", { instanceId: instanceId })
            
            // Wait for connection confirmation
            await_with_timeout(socket.on("terminal:joined"), 5000)
            connection_state = "connected"
            
        CATCH ConnectionTimeout:
            retry_count += 1
            delay = calculateExponentialBackoff(retry_count)
            wait(delay)
            
        CATCH AuthenticationError:
            showError("Authentication failed")
            BREAK
    
    // Phase 4: Setup Event Handlers
    IF connection_state == "connected":
        setupTerminalEventHandlers(terminal, socket)
        setupWebSocketEventHandlers(socket, terminal)
        return SUCCESS
    ELSE:
        return CONNECTION_FAILED

FUNCTION setupTerminalEventHandlers(terminal, socket):
    terminal.onData((input) => {
        socket.emit("terminal:input", { data: input })
    })
    
    terminal.onResize((dimensions) => {
        socket.emit("terminal:resize", dimensions)
    })
    
    terminal.onSelectionChange(() => {
        selection = terminal.getSelection()
        IF selection AND clipboard_available:
            copyToClipboard(selection)
    })

FUNCTION setupWebSocketEventHandlers(socket, terminal):
    socket.on("terminal:output", (data) => {
        terminal.write(data.output)
    })
    
    socket.on("terminal:buffer", (data) => {
        terminal.clear()
        terminal.write(data.buffer)
    })
    
    socket.on("connection_error", (error) => {
        handleConnectionError(error)
    })
    
    socket.on("disconnect", () => {
        showConnectionLostOverlay()
        attemptReconnection()
    })
```

#### **2. Backend Terminal Session Management**

```pseudocode
FUNCTION handleTerminalConnection(socket, instanceId):
    // Phase 1: Validate Connection
    IF not_authenticated(socket):
        socket.emit("error", "Authentication required")
        return
    
    // Phase 2: Create or Join Session
    session = getOrCreateTerminalSession(instanceId)
    socket.join(session.room_name)
    session.add_socket(socket.id)
    
    // Phase 3: Send Current State
    socket.emit("terminal:joined", {
        sessionId: session.id,
        buffer: session.get_buffer(),
        process_info: session.get_process_info()
    })
    
    // Phase 4: Setup Session Event Handlers
    setupSessionEventHandlers(socket, session)

FUNCTION getOrCreateTerminalSession(instanceId):
    IF session_exists(instanceId):
        return get_session(instanceId)
    ELSE:
        return createNewTerminalSession(instanceId)

FUNCTION createNewTerminalSession(instanceId):
    // Create PTY process
    shell_command = get_default_shell()  // bash, powershell, etc.
    pty_process = spawn_pty(shell_command, {
        cols: 80,
        rows: 30,
        cwd: get_working_directory(),
        env: get_environment_variables()
    })
    
    session = new TerminalSession({
        id: instanceId,
        pty: pty_process,
        buffer: circular_buffer(max_size: 1000),
        sockets: set(),
        room_name: "terminal:" + instanceId
    })
    
    // Setup PTY event handlers
    pty_process.onData((output) => {
        session.buffer.add(output)
        broadcast_to_session(session, "terminal:output", { output })
    })
    
    pty_process.onExit((code) => {
        broadcast_to_session(session, "terminal:exit", { code })
        cleanup_session(session.id)
    })
    
    store_session(instanceId, session)
    return session

FUNCTION setupSessionEventHandlers(socket, session):
    socket.on("terminal:input", (data) => {
        IF session.pty AND session.pty.is_alive():
            session.pty.write(data.data)
        ELSE:
            socket.emit("terminal:error", "Terminal process not available")
    })
    
    socket.on("terminal:resize", (dimensions) => {
        IF session.pty:
            session.pty.resize(dimensions.cols, dimensions.rows)
    })
    
    socket.on("disconnect", () => {
        session.remove_socket(socket.id)
        IF session.socket_count() == 0:
            schedule_session_cleanup(session.id, delay: 60000)  // 1 minute
    })
```

#### **3. Error Handling and Recovery Logic**

```pseudocode
FUNCTION handleConnectionError(error_type, context):
    SWITCH error_type:
        CASE "connection_timeout":
            retry_count = context.retry_count + 1
            IF retry_count <= MAX_RETRIES:
                delay = min(1000 * (2 ^ retry_count), 30000)  // Exponential backoff
                schedule_reconnect(delay, retry_count)
            ELSE:
                showPermanentErrorState()
        
        CASE "authentication_failed":
            showAuthenticationDialog()
            clearStoredCredentials()
        
        CASE "server_unavailable":
            showServerDownMessage()
            schedule_reconnect(5000, retry_count)
        
        CASE "rate_limit_exceeded":
            showRateLimitMessage()
            delay = context.reset_time - current_time()
            schedule_reconnect(delay, 0)
        
        CASE "pty_creation_failed":
            showTerminalUnavailableMessage()
            attemptFallbackTerminal()
        
        DEFAULT:
            logUnknownError(error_type, context)
            showGenericErrorMessage()

FUNCTION attemptReconnection():
    show_reconnecting_indicator()
    
    // Progressive fallback strategy
    connection_strategies = [
        websocket_connection,
        polling_connection,
        fallback_http_connection
    ]
    
    FOR strategy IN connection_strategies:
        TRY:
            result = strategy.connect()
            IF result.success:
                hide_reconnecting_indicator()
                return SUCCESS
        CATCH strategy_error:
            log_strategy_failure(strategy, strategy_error)
            continue
    
    // All strategies failed
    showConnectionFailedDialog()
    return FAILURE
```

#### **4. SearchAddon Integration with Fallback**

```pseudocode
FUNCTION initializeSearchAddon(terminal):
    TRY:
        search_addon = new SearchAddon()
        terminal.loadAddon(search_addon)
        search_available = true
        return search_addon
        
    CATCH addon_load_error:
        log_addon_error("SearchAddon", addon_load_error)
        search_available = false
        return null

FUNCTION performSearch(query, direction, search_addon):
    IF not search_available:
        showSearchUnavailableNotification()
        return
    
    IF query.length == 0:
        return
    
    TRY:
        IF direction == "next":
            search_addon.findNext(query)
        ELSE:
            search_addon.findPrevious(query)
            
    CATCH search_error:
        showSearchErrorNotification()
        log_search_error(search_error)

FUNCTION fallbackSearch(terminal, query):
    // Manual search implementation as fallback
    buffer_content = terminal.buffer.active.toString()
    matches = find_all_matches(buffer_content, query)
    
    IF matches.length > 0:
        highlight_matches(terminal, matches)
        showSearchResults(matches.length)
    ELSE:
        showNoMatchesFound()
```

#### **5. Cross-Instance Communication**

```pseudocode
FUNCTION initializeWebSocketHub():
    hub = new WebSocketHub({
        port: 3001,
        max_connections: 2000,
        routing_strategy: "hybrid"
    })
    
    // Register instance types
    hub.register_instance_type("frontend", frontend_handlers)
    hub.register_instance_type("production_claude", claude_handlers)
    
    // Setup routing rules
    hub.add_route("terminal:*", route_to_all_instances)
    hub.add_route("claude:command", route_to_claude_instances)
    hub.add_route("status:*", route_to_frontend_instances)
    
    return hub

FUNCTION handleCrossInstanceMessage(message, source_instance):
    SWITCH message.type:
        CASE "terminal:command":
            execute_command_across_instances(message.command, source_instance)
        
        CASE "status:request":
            collect_status_from_all_instances()
            broadcast_status_update()
        
        CASE "sync:terminal_state":
            synchronize_terminal_state(message.state)
        
        DEFAULT:
            route_message_by_pattern(message)
```

---

## Key Algorithmic Improvements

1. **Progressive Connection Strategy**: Multiple fallback mechanisms for robust connectivity
2. **Addon Loading with Graceful Degradation**: Essential functionality maintained even when optional addons fail
3. **Exponential Backoff with Jitter**: Prevents thundering herd problems during reconnection
4. **Session Management**: Per-instance sessions instead of shared global session
5. **Cross-Instance Coordination**: WebSocket Hub for production Claude integration

## Next Phase: ARCHITECTURE

The pseudocode design establishes the foundational algorithms for robust terminal connectivity with comprehensive error handling and recovery mechanisms.