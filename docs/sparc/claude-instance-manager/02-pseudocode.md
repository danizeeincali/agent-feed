# SPARC Phase 2: Claude Instance Manager Pseudocode

## 🧠 Core Algorithm Design

### ProcessManager Service
```pseudocode
CLASS ProcessManager {
    CONSTRUCTOR() {
        this.instances = new Map()
        this.terminalSessions = new Map()
        this.config = loadConfiguration()
        this.hubConnection = null
    }

    METHOD launchInstance(options) {
        // 1. Kill existing instance if running
        existingInstance = this.findInstanceByType(options.type)
        IF existingInstance EXISTS {
            this.killInstance(existingInstance.id, graceful=true)
            WAIT_FOR_SHUTDOWN(timeout=30s)
        }

        // 2. Generate instance name and ID
        instanceName = generateInstanceName(options)
        instanceId = generateUniqueId()
        
        // 3. Create working directory
        workDir = ensureWorkingDirectory(options.workDir || '/prod')
        
        // 4. Spawn Claude process with PTY
        ptyProcess = spawn('claude', {
            args: options.args || [],
            cwd: workDir,
            stdio: 'pipe',
            pty: true,
            env: prepareEnvironment(options.env)
        })
        
        // 5. Create instance record
        instance = {
            id: instanceId,
            name: instanceName,
            type: options.type,
            process: ptyProcess,
            status: 'starting',
            createdAt: Date.now(),
            lastSeen: Date.now(),
            config: options
        }
        
        // 6. Register instance
        this.instances.set(instanceId, instance)
        
        // 7. Set up process monitoring
        this.setupProcessMonitoring(instance)
        
        // 8. Create terminal session
        terminalSession = this.createTerminalSession(instance)
        
        // 9. Notify hub of new instance
        this.notifyHub('instance_created', instance)
        
        RETURN instanceId
    }

    METHOD killInstance(instanceId, graceful=false) {
        instance = this.instances.get(instanceId)
        IF NOT instance {
            THROW Error('Instance not found')
        }
        
        IF graceful {
            // Send SIGTERM first
            instance.process.kill('SIGTERM')
            
            // Wait for graceful shutdown
            timeoutId = setTimeout(() => {
                instance.process.kill('SIGKILL')
            }, 15000)
            
            instance.process.on('exit', () => {
                clearTimeout(timeoutId)
            })
        } ELSE {
            instance.process.kill('SIGKILL')
        }
        
        // Clean up resources
        this.cleanupInstance(instanceId)
    }

    METHOD setupProcessMonitoring(instance) {
        process = instance.process
        
        // Handle process events
        process.on('exit', (code, signal) => {
            this.handleProcessExit(instance, code, signal)
        })
        
        process.on('error', (error) => {
            this.handleProcessError(instance, error)
        })
        
        // Monitor resource usage
        this.startResourceMonitoring(instance)
        
        // Health check interval
        this.startHealthCheck(instance)
    }

    METHOD createTerminalSession(instance) {
        session = {
            id: generateSessionId(),
            instanceId: instance.id,
            pty: instance.process,
            clients: new Set(),
            buffer: new CircularBuffer(10000),
            lastActivity: Date.now()
        }
        
        // Set up PTY data handling
        instance.process.on('data', (data) => {
            session.buffer.write(data)
            this.broadcastToClients(session, data)
        })
        
        this.terminalSessions.set(session.id, session)
        RETURN session
    }
}
```

### TerminalEmulator Service
```pseudocode
CLASS TerminalEmulator {
    CONSTRUCTOR(processManager, webSocketHub) {
        this.processManager = processManager
        this.hub = webSocketHub
        this.sessions = new Map()
    }

    METHOD handleTerminalConnection(socket, instanceId) {
        // 1. Authenticate connection
        IF NOT this.authenticateSocket(socket) {
            socket.disconnect('auth_failed')
            RETURN
        }
        
        // 2. Find terminal session
        session = this.processManager.getTerminalSession(instanceId)
        IF NOT session {
            socket.emit('error', 'Instance not found')
            RETURN
        }
        
        // 3. Add client to session
        session.clients.add(socket.id)
        this.sessions.set(socket.id, session)
        
        // 4. Send terminal history
        socket.emit('terminal_data', session.buffer.getHistory())
        
        // 5. Set up event handlers
        this.setupSocketHandlers(socket, session)
        
        // 6. Notify of connection
        socket.emit('terminal_connected', {
            instanceId: instanceId,
            sessionId: session.id,
            terminalSize: session.size
        })
    }

    METHOD setupSocketHandlers(socket, session) {
        // Handle input from client
        socket.on('terminal_input', (data) => {
            IF this.validateInput(data) {
                session.pty.write(data)
                session.lastActivity = Date.now()
            }
        })
        
        // Handle terminal resize
        socket.on('terminal_resize', (size) => {
            session.pty.resize(size.cols, size.rows)
            session.size = size
        })
        
        // Handle disconnect
        socket.on('disconnect', () => {
            this.handleClientDisconnect(socket, session)
        })
        
        // Handle ping for connection health
        socket.on('ping', () => {
            socket.emit('pong', Date.now())
        })
    }

    METHOD broadcastToClients(session, data) {
        FOR EACH clientId IN session.clients {
            client = this.hub.getClient(clientId)
            IF client AND client.connected {
                client.emit('terminal_data', data)
            } ELSE {
                session.clients.delete(clientId)
            }
        }
    }

    METHOD validateInput(data) {
        // Basic input validation
        IF NOT data OR typeof data !== 'string' {
            RETURN false
        }
        
        // Length check
        IF data.length > 1000 {
            RETURN false
        }
        
        // Rate limiting check
        IF this.isRateLimited() {
            RETURN false
        }
        
        RETURN true
    }
}
```

### InstanceLauncher Frontend Component
```pseudocode
COMPONENT InstanceLauncher {
    STATE: {
        isLaunching: false,
        instances: [],
        config: {
            autoRestart: false,
            restartInterval: 4,
            maxRestarts: 5
        },
        lastLaunch: null
    }

    METHOD launchInstance() {
        IF this.state.isLaunching {
            RETURN // Prevent double launch
        }
        
        this.setState({ isLaunching: true })
        
        TRY {
            // 1. Prepare launch options
            options = {
                type: 'production',
                workDir: '/prod',
                autoConnect: true,
                name: this.generateInstanceName(),
                config: this.state.config
            }
            
            // 2. Send launch command
            response = AWAIT this.api.launchInstance(options)
            
            // 3. Update state
            this.setState({
                lastLaunch: Date.now(),
                isLaunching: false
            })
            
            // 4. Navigate to terminal view
            this.router.navigate(`/dual-instance/terminal/${response.instanceId}`)
            
            // 5. Show success notification
            this.showNotification('Instance launched successfully', 'success')
            
        } CATCH error {
            this.setState({ isLaunching: false })
            this.showNotification(`Launch failed: ${error.message}`, 'error')
        }
    }

    METHOD generateInstanceName() {
        // Read from CLAUDE.md if available
        claudeConfig = this.readClaudeConfig()
        baseName = claudeConfig.name || 'Claude-Instance'
        timestamp = new Date().toISOString().slice(0, 19).replace(/:/g, '-')
        RETURN `${baseName}-${timestamp}`
    }

    METHOD handleAutoRestartToggle(enabled) {
        this.setState({
            config: {
                ...this.state.config,
                autoRestart: enabled
            }
        })
        
        // Save configuration
        this.saveConfiguration()
    }

    RENDER() {
        RETURN (
            <div className="instance-launcher">
                <LaunchButton 
                    onClick={this.launchInstance}
                    disabled={this.state.isLaunching}
                    loading={this.state.isLaunching}
                />
                
                <ConfigurationPanel
                    config={this.state.config}
                    onChange={this.updateConfig}
                />
                
                <InstanceList
                    instances={this.state.instances}
                    onTerminalOpen={this.openTerminal}
                    onKillInstance={this.killInstance}
                />
            </div>
        )
    }
}
```

### TerminalView Frontend Component
```pseudocode
COMPONENT TerminalView {
    STATE: {
        terminal: null,
        socket: null,
        instanceId: null,
        connected: false,
        reconnecting: false
    }

    METHOD componentDidMount() {
        this.initializeTerminal()
        this.connectToInstance()
    }

    METHOD initializeTerminal() {
        // Initialize xterm.js
        terminal = new Terminal({
            fontSize: 14,
            fontFamily: 'Monaco, Menlo, monospace',
            theme: {
                background: '#1e1e1e',
                foreground: '#d4d4d4'
            },
            allowTransparency: true
        })
        
        // Attach to DOM
        terminal.open(this.terminalRef.current)
        
        // Handle user input
        terminal.onData((data) => {
            IF this.state.socket AND this.state.connected {
                this.state.socket.emit('terminal_input', data)
            }
        })
        
        // Handle terminal resize
        terminal.onResize((size) => {
            IF this.state.socket AND this.state.connected {
                this.state.socket.emit('terminal_resize', size)
            }
        })
        
        this.setState({ terminal })
    }

    METHOD connectToInstance() {
        instanceId = this.props.instanceId
        
        // Create WebSocket connection
        socket = io('/terminal', {
            query: { instanceId }
        })
        
        // Connection events
        socket.on('connect', () => {
            this.setState({ 
                connected: true, 
                reconnecting: false 
            })
        })
        
        socket.on('disconnect', () => {
            this.setState({ connected: false })
            this.attemptReconnection()
        })
        
        // Terminal events
        socket.on('terminal_data', (data) => {
            this.state.terminal.write(data)
        })
        
        socket.on('terminal_connected', (info) => {
            // Set initial terminal size
            IF info.terminalSize {
                this.state.terminal.resize(
                    info.terminalSize.cols, 
                    info.terminalSize.rows
                )
            }
        })
        
        socket.on('error', (error) => {
            this.showError(error)
        })
        
        this.setState({ socket, instanceId })
    }

    METHOD attemptReconnection() {
        IF this.state.reconnecting {
            RETURN
        }
        
        this.setState({ reconnecting: true })
        
        // Exponential backoff
        delay = Math.min(1000 * Math.pow(2, this.reconnectAttempts), 30000)
        
        setTimeout(() => {
            this.connectToInstance()
        }, delay)
        
        this.reconnectAttempts++
    }

    METHOD syncWithOtherTabs() {
        // Use BroadcastChannel for cross-tab sync
        IF typeof BroadcastChannel !== 'undefined' {
            channel = new BroadcastChannel(`terminal-${this.state.instanceId}`)
            
            channel.onmessage = (event) => {
                IF event.data.type === 'terminal_sync' {
                    this.state.terminal.write(event.data.data)
                }
            }
            
            // Send our terminal data to other tabs
            this.state.socket.on('terminal_data', (data) => {
                channel.postMessage({
                    type: 'terminal_sync',
                    data: data
                })
            })
        }
    }

    RENDER() {
        RETURN (
            <div className="terminal-view">
                <TerminalHeader
                    instanceId={this.state.instanceId}
                    connected={this.state.connected}
                    reconnecting={this.state.reconnecting}
                />
                
                <div 
                    ref={this.terminalRef}
                    className="terminal-container"
                />
                
                <TerminalControls
                    onClear={this.clearTerminal}
                    onReconnect={this.reconnect}
                    onResize={this.resizeTerminal}
                />
            </div>
        )
    }
}
```

### Auto-Restart Manager
```pseudocode
CLASS AutoRestartManager {
    CONSTRUCTOR(processManager) {
        this.processManager = processManager
        this.restartTimers = new Map()
        this.config = new Map()
    }

    METHOD enableAutoRestart(instanceId, intervalHours, maxRestarts) {
        config = {
            intervalHours: intervalHours,
            maxRestarts: maxRestarts,
            restartCount: 0,
            enabled: true
        }
        
        this.config.set(instanceId, config)
        this.scheduleRestart(instanceId)
    }

    METHOD scheduleRestart(instanceId) {
        config = this.config.get(instanceId)
        IF NOT config OR NOT config.enabled {
            RETURN
        }
        
        // Clear existing timer
        existingTimer = this.restartTimers.get(instanceId)
        IF existingTimer {
            clearTimeout(existingTimer)
        }
        
        // Schedule next restart
        intervalMs = config.intervalHours * 60 * 60 * 1000
        timer = setTimeout(() => {
            this.performScheduledRestart(instanceId)
        }, intervalMs)
        
        this.restartTimers.set(instanceId, timer)
    }

    METHOD performScheduledRestart(instanceId) {
        config = this.config.get(instanceId)
        
        // Check restart limits
        IF config.restartCount >= config.maxRestarts {
            this.disableAutoRestart(instanceId, 'Max restarts reached')
            RETURN
        }
        
        TRY {
            // Get current instance info
            instance = this.processManager.getInstance(instanceId)
            IF NOT instance {
                RETURN
            }
            
            // Graceful restart
            AWAIT this.processManager.killInstance(instanceId, graceful=true)
            newInstanceId = AWAIT this.processManager.launchInstance(instance.config)
            
            // Update config for new instance
            config.restartCount++
            this.config.delete(instanceId)
            this.config.set(newInstanceId, config)
            
            // Schedule next restart
            this.scheduleRestart(newInstanceId)
            
        } CATCH error {
            this.handleRestartError(instanceId, error)
        }
    }

    METHOD handleRestartError(instanceId, error) {
        config = this.config.get(instanceId)
        config.restartCount++
        
        IF config.restartCount >= config.maxRestarts {
            this.disableAutoRestart(instanceId, `Restart failed: ${error.message}`)
        } ELSE {
            // Retry with backoff
            setTimeout(() => {
                this.performScheduledRestart(instanceId)
            }, 60000) // Wait 1 minute before retry
        }
    }
}
```

### WebSocket Hub Integration
```pseudocode
CLASS InstanceManagerHub {
    CONSTRUCTOR(existingHub) {
        this.hub = existingHub
        this.instanceChannels = new Map()
        this.setupChannels()
    }

    METHOD setupChannels() {
        // Instance management channel
        this.hub.createChannel('instance-manager', {
            authentication: true,
            rateLimiting: {
                maxRequests: 10,
                windowMs: 60000
            }
        })
        
        // Terminal communication channel
        this.hub.createChannel('terminal', {
            authentication: true,
            rateLimiting: {
                maxRequests: 1000,
                windowMs: 60000
            }
        })
        
        // Status monitoring channel
        this.hub.createChannel('instance-status', {
            authentication: false, // Public read-only
            rateLimiting: {
                maxRequests: 100,
                windowMs: 60000
            }
        })
    }

    METHOD registerInstance(instance) {
        // Create dedicated channel for instance
        channelName = `instance-${instance.id}`
        
        this.hub.createChannel(channelName, {
            authentication: true,
            allowedUsers: instance.config.allowedUsers || []
        })
        
        this.instanceChannels.set(instance.id, channelName)
        
        // Broadcast instance creation
        this.hub.broadcast('instance-status', {
            type: 'instance_created',
            instance: this.sanitizeInstanceInfo(instance)
        })
    }

    METHOD broadcastInstanceStatus(instanceId, status) {
        this.hub.broadcast('instance-status', {
            type: 'status_update',
            instanceId: instanceId,
            status: status,
            timestamp: Date.now()
        })
    }

    METHOD handleTerminalConnection(socket, instanceId) {
        channelName = this.instanceChannels.get(instanceId)
        IF NOT channelName {
            socket.emit('error', 'Instance not found')
            RETURN
        }
        
        // Join instance-specific channel
        socket.join(channelName)
        
        // Set up terminal relay
        this.setupTerminalRelay(socket, instanceId)
    }
}
```

## 🔄 State Management Flow

### Instance Lifecycle
```pseudocode
FLOW InstanceLifecycle {
    START → CREATING → STARTING → RUNNING → STOPPING → STOPPED
    
    TRANSITIONS:
        START → CREATING: User clicks launch
        CREATING → STARTING: Process spawned
        STARTING → RUNNING: Process ready
        RUNNING → STOPPING: Kill command or auto-restart
        STOPPING → STOPPED: Process terminated
        STOPPED → CREATING: Restart requested
        
        ERROR_TRANSITIONS:
            CREATING → STOPPED: Spawn failed
            STARTING → STOPPED: Startup failed
            RUNNING → STOPPED: Process crashed
}
```

### Terminal Session Management
```pseudocode
FLOW TerminalSession {
    DISCONNECTED → CONNECTING → CONNECTED → SYNCING
    
    TRANSITIONS:
        DISCONNECTED → CONNECTING: User opens terminal
        CONNECTING → CONNECTED: WebSocket established
        CONNECTED → SYNCING: Multiple tabs detected
        
        ERROR_TRANSITIONS:
            CONNECTING → DISCONNECTED: Connection failed
            CONNECTED → CONNECTING: Connection lost
            SYNCING → CONNECTED: Tab closed
}
```

## 🧪 Algorithm Complexity Analysis

### Time Complexity
- Instance launch: O(1) + process spawn time
- Terminal input: O(n) where n = number of connected clients
- Status broadcast: O(m) where m = number of monitoring clients
- Auto-restart: O(1) scheduling + launch complexity

### Space Complexity
- Instance registry: O(i) where i = number of instances
- Terminal sessions: O(s) where s = number of active sessions
- Client connections: O(c) where c = number of connected clients
- Log buffers: O(b) where b = buffer size per instance

### Performance Optimizations
- Connection pooling for WebSocket efficiency
- Circular buffers for terminal history
- Event batching for status updates
- Lazy loading for inactive sessions

---

This pseudocode provides the detailed algorithmic foundation for implementing the Claude Instance Manager system with robust error handling, efficient resource management, and seamless user experience.