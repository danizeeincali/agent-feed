"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.prodClaudeClient = exports.ProdClaudeClient = void 0;
const ws_1 = require("ws");
const events_1 = require("events");
const promises_1 = __importDefault(require("fs/promises"));
const path_1 = __importDefault(require("path"));
const logger_1 = require("@/utils/logger");
/**
 * Production Claude WebSocket Client
 * Connects production Claude instance to the WebSocket hub
 */
class ProdClaudeClient extends events_1.EventEmitter {
    ws = null;
    hubUrl;
    reconnectAttempts = 0;
    maxReconnectAttempts = 10;
    reconnectDelay = 1000;
    heartbeatInterval = null;
    isConnected = false;
    instanceId = 'prod-claude';
    devModeConfig = null;
    prodConfig = null;
    securityBoundaries = null;
    constructor(hubUrl = 'ws://localhost:3001') {
        super();
        this.hubUrl = hubUrl;
        this.setupEventHandlers();
    }
    /**
     * Initialize the client with configuration loading
     */
    async initialize() {
        try {
            await this.loadConfigurations();
            await this.loadSecurityBoundaries();
            this.connect();
            logger_1.logger.info('ProdClaudeClient initialized', {
                instanceId: this.instanceId,
                devMode: this.devModeConfig?.devMode || false,
                sandboxMode: this.securityBoundaries?.sandboxMode || true
            });
        }
        catch (error) {
            logger_1.logger.error('Failed to initialize ProdClaudeClient:', error);
            throw error;
        }
    }
    /**
     * Load dev mode and production configurations
     */
    async loadConfigurations() {
        try {
            // Load dev mode configuration
            const devModeConfigPath = '/workspaces/agent-feed/prod/config/mode.json';
            const devModeData = await promises_1.default.readFile(devModeConfigPath, 'utf8');
            this.devModeConfig = JSON.parse(devModeData);
            // Load production configuration
            const prodConfigPath = '/workspaces/agent-feed/.claude/prod/config.json';
            const prodData = await promises_1.default.readFile(prodConfigPath, 'utf8');
            this.prodConfig = JSON.parse(prodData);
            // Also check environment variable for dev mode
            const envDevMode = process.env.DEV_MODE === 'true';
            if (envDevMode && this.devModeConfig) {
                this.devModeConfig.devMode = true;
            }
            logger_1.logger.info('Configurations loaded', {
                devMode: this.devModeConfig?.devMode,
                instanceType: this.prodConfig?.instance.type,
                sandboxMode: this.prodConfig?.permissions.sandbox_mode
            });
        }
        catch (error) {
            logger_1.logger.error('Failed to load configurations:', error);
            // Set fallback configuration
            this.devModeConfig = {
                mode: 'PRODUCTION',
                devMode: false,
                devModeSettings: {
                    enableChat: false,
                    enhancedLogging: false,
                    debugInfo: false,
                    testExecution: false
                }
            };
        }
    }
    /**
     * Load and parse security boundaries from system instructions
     */
    async loadSecurityBoundaries() {
        try {
            if (!this.prodConfig) {
                throw new Error('Production config not loaded');
            }
            this.securityBoundaries = {
                allowedPaths: [this.prodConfig.workspace.root],
                restrictedPaths: this.prodConfig.workspace.restricted_paths,
                allowedOperations: this.prodConfig.workspace.allowed_operations,
                allowedCommands: this.prodConfig.permissions.allowed_commands,
                sandboxMode: this.prodConfig.permissions.sandbox_mode
            };
            logger_1.logger.info('Security boundaries loaded', {
                allowedPaths: this.securityBoundaries.allowedPaths.length,
                restrictedPaths: this.securityBoundaries.restrictedPaths.length,
                sandboxMode: this.securityBoundaries.sandboxMode
            });
        }
        catch (error) {
            logger_1.logger.error('Failed to load security boundaries:', error);
            // Set strict fallback boundaries
            this.securityBoundaries = {
                allowedPaths: ['/workspaces/agent-feed/agent_workspace/'],
                restrictedPaths: [
                    '/workspaces/agent-feed/src/',
                    '/workspaces/agent-feed/frontend/',
                    '/workspaces/agent-feed/.claude/dev/'
                ],
                allowedOperations: ['read'],
                allowedCommands: [],
                sandboxMode: true
            };
        }
    }
    /**
     * Connect to the WebSocket hub
     */
    connect() {
        try {
            logger_1.logger.info('Connecting to WebSocket hub', { hubUrl: this.hubUrl });
            this.ws = new ws_1.WebSocket(this.hubUrl);
            this.setupWebSocketHandlers();
        }
        catch (error) {
            logger_1.logger.error('Failed to create WebSocket connection:', error);
            this.scheduleReconnect();
        }
    }
    /**
     * Setup WebSocket event handlers
     */
    setupWebSocketHandlers() {
        if (!this.ws)
            return;
        this.ws.on('open', () => {
            this.isConnected = true;
            this.reconnectAttempts = 0;
            logger_1.logger.info('Connected to WebSocket hub');
            // Register with hub
            this.registerWithHub();
            // Start heartbeat
            this.startHeartbeat();
            this.emit('connected');
        });
        this.ws.on('message', (data) => {
            try {
                const message = JSON.parse(data.toString());
                this.handleIncomingMessage(message);
            }
            catch (error) {
                logger_1.logger.error('Failed to parse incoming message:', error);
            }
        });
        this.ws.on('close', (code, reason) => {
            this.isConnected = false;
            this.stopHeartbeat();
            logger_1.logger.warn('WebSocket connection closed', {
                code,
                reason: reason.toString()
            });
            this.emit('disconnected', { code, reason: reason.toString() });
            this.scheduleReconnect();
        });
        this.ws.on('error', (error) => {
            logger_1.logger.error('WebSocket error:', error);
            this.emit('error', error);
        });
        this.ws.on('ping', () => {
            if (this.ws?.readyState === ws_1.WebSocket.OPEN) {
                this.ws.pong();
            }
        });
    }
    /**
     * Register this instance with the hub
     */
    registerWithHub() {
        if (!this.isConnected || !this.ws)
            return;
        const registrationMessage = {
            type: 'register',
            instanceId: this.instanceId,
            instanceType: 'production',
            capabilities: {
                devMode: this.devModeConfig?.devMode || false,
                chatEnabled: this.devModeConfig?.devModeSettings.enableChat || false,
                sandboxMode: this.securityBoundaries?.sandboxMode || true,
                allowedOperations: this.securityBoundaries?.allowedOperations || ['read']
            },
            timestamp: new Date().toISOString()
        };
        this.ws.send(JSON.stringify(registrationMessage));
        logger_1.logger.info('Registered with hub', registrationMessage);
    }
    /**
     * Handle incoming messages from the hub
     */
    async handleIncomingMessage(message) {
        logger_1.logger.info('Received message', {
            id: message.id,
            type: message.type,
            from: message.from
        });
        try {
            // Security validation
            if (!this.validateMessageSecurity(message)) {
                this.sendErrorResponse(message.id, 'Security validation failed');
                return;
            }
            // Dev mode validation for chat messages
            if (message.type === 'chat' && !this.isChatAllowed()) {
                this.sendErrorResponse(message.id, 'Chat not enabled in production mode');
                return;
            }
            // Process the message based on type
            let response;
            switch (message.type) {
                case 'command':
                    response = await this.handleCommand(message);
                    break;
                case 'chat':
                    response = await this.handleChat(message);
                    break;
                case 'system':
                    response = await this.handleSystemMessage(message);
                    break;
                default:
                    response = { error: 'Unknown message type', type: message.type };
            }
            // Send response if required
            if (message.requiresResponse && response) {
                this.sendResponse(message.id, response);
            }
        }
        catch (error) {
            logger_1.logger.error('Error handling message:', error);
            this.sendErrorResponse(message.id, error instanceof Error ? error.message : 'Unknown error');
        }
    }
    /**
     * Validate message security based on boundaries
     */
    validateMessageSecurity(message) {
        if (!this.securityBoundaries) {
            logger_1.logger.warn('Security boundaries not loaded, denying message');
            return false;
        }
        // In sandbox mode, be extra strict
        if (this.securityBoundaries.sandboxMode) {
            // Check if message involves file operations
            if (message.payload?.operation && message.payload?.path) {
                const path = message.payload.path;
                // Check if path is in restricted areas
                const isRestricted = this.securityBoundaries.restrictedPaths.some(restrictedPath => path.startsWith(restrictedPath));
                if (isRestricted) {
                    logger_1.logger.warn('Message targets restricted path', { path });
                    return false;
                }
                // Check if path is in allowed areas
                const isAllowed = this.securityBoundaries.allowedPaths.some(allowedPath => path.startsWith(allowedPath));
                if (!isAllowed) {
                    logger_1.logger.warn('Message targets non-allowed path', { path });
                    return false;
                }
            }
            // Check if operation is allowed
            if (message.payload?.operation) {
                const operation = message.payload.operation;
                if (!this.securityBoundaries.allowedOperations.includes(operation)) {
                    logger_1.logger.warn('Message requests non-allowed operation', { operation });
                    return false;
                }
            }
        }
        return true;
    }
    /**
     * Check if chat is allowed based on dev mode settings
     */
    isChatAllowed() {
        return this.devModeConfig?.devMode === true &&
            this.devModeConfig?.devModeSettings.enableChat === true;
    }
    /**
     * Handle command messages
     */
    async handleCommand(message) {
        const { operation, payload } = message.payload;
        logger_1.logger.info('Processing command', { operation, messageId: message.id });
        switch (operation) {
            case 'execute':
                return this.executeCommand(payload);
            case 'read_file':
                return this.readFile(payload.path);
            case 'write_file':
                return this.writeFile(payload.path, payload.content);
            case 'list_directory':
                return this.listDirectory(payload.path);
            default:
                throw new Error(`Unknown command operation: ${operation}`);
        }
    }
    /**
     * Handle chat messages (only if dev mode allows)
     */
    async handleChat(message) {
        if (!this.isChatAllowed()) {
            throw new Error('Chat not enabled in current mode');
        }
        logger_1.logger.info('Processing chat message', { messageId: message.id });
        // In a real implementation, this would interface with Claude's chat capabilities
        // For now, return a simple acknowledgment
        return {
            type: 'chat_response',
            content: 'Production Claude instance received your message. Chat functionality is limited in production mode.',
            timestamp: new Date().toISOString()
        };
    }
    /**
     * Handle system messages
     */
    async handleSystemMessage(message) {
        const { operation } = message.payload;
        switch (operation) {
            case 'health_check':
                return this.getHealthStatus();
            case 'get_capabilities':
                return this.getCapabilities();
            case 'reload_config':
                await this.loadConfigurations();
                await this.loadSecurityBoundaries();
                return { status: 'config_reloaded' };
            default:
                throw new Error(`Unknown system operation: ${operation}`);
        }
    }
    /**
     * Execute a command with security validation
     */
    async executeCommand(payload) {
        const { command, args, workingDir } = payload;
        // Security check: only allow whitelisted commands
        if (!this.securityBoundaries?.allowedCommands.includes(command)) {
            throw new Error(`Command not allowed: ${command}`);
        }
        // Security check: validate working directory
        if (workingDir && !this.isPathAllowed(workingDir)) {
            throw new Error(`Working directory not allowed: ${workingDir}`);
        }
        logger_1.logger.info('Executing command', { command, args, workingDir });
        // In a real implementation, this would execute the command securely
        // For now, return a mock response
        return {
            status: 'executed',
            command,
            args,
            output: 'Command execution not implemented in this demo',
            timestamp: new Date().toISOString()
        };
    }
    /**
     * Read a file with path validation
     */
    async readFile(filePath) {
        if (!this.isPathAllowed(filePath)) {
            throw new Error(`File path not allowed: ${filePath}`);
        }
        try {
            const content = await promises_1.default.readFile(filePath, 'utf8');
            return {
                status: 'success',
                path: filePath,
                content,
                timestamp: new Date().toISOString()
            };
        }
        catch (error) {
            throw new Error(`Failed to read file: ${error instanceof Error ? error.message : 'Unknown error'}`);
        }
    }
    /**
     * Write a file with path and content validation
     */
    async writeFile(filePath, content) {
        if (!this.isPathAllowed(filePath)) {
            throw new Error(`File path not allowed: ${filePath}`);
        }
        if (!this.securityBoundaries?.allowedOperations.includes('write')) {
            throw new Error('Write operations not allowed');
        }
        try {
            await promises_1.default.writeFile(filePath, content, 'utf8');
            return {
                status: 'success',
                path: filePath,
                size: content.length,
                timestamp: new Date().toISOString()
            };
        }
        catch (error) {
            throw new Error(`Failed to write file: ${error instanceof Error ? error.message : 'Unknown error'}`);
        }
    }
    /**
     * List directory contents with path validation
     */
    async listDirectory(dirPath) {
        if (!this.isPathAllowed(dirPath)) {
            throw new Error(`Directory path not allowed: ${dirPath}`);
        }
        try {
            const entries = await promises_1.default.readdir(dirPath, { withFileTypes: true });
            const files = entries.map(entry => ({
                name: entry.name,
                type: entry.isDirectory() ? 'directory' : 'file',
                path: path_1.default.join(dirPath, entry.name)
            }));
            return {
                status: 'success',
                path: dirPath,
                files,
                timestamp: new Date().toISOString()
            };
        }
        catch (error) {
            throw new Error(`Failed to list directory: ${error instanceof Error ? error.message : 'Unknown error'}`);
        }
    }
    /**
     * Check if a path is allowed based on security boundaries
     */
    isPathAllowed(filePath) {
        if (!this.securityBoundaries)
            return false;
        // Check restricted paths first
        const isRestricted = this.securityBoundaries.restrictedPaths.some(restrictedPath => filePath.startsWith(restrictedPath));
        if (isRestricted)
            return false;
        // Check allowed paths
        return this.securityBoundaries.allowedPaths.some(allowedPath => filePath.startsWith(allowedPath));
    }
    /**
     * Get current health status
     */
    getHealthStatus() {
        return {
            status: 'healthy',
            instanceId: this.instanceId,
            connected: this.isConnected,
            devMode: this.devModeConfig?.devMode || false,
            sandboxMode: this.securityBoundaries?.sandboxMode || true,
            uptime: process.uptime(),
            memory: process.memoryUsage(),
            timestamp: new Date().toISOString()
        };
    }
    /**
     * Get current capabilities
     */
    getCapabilities() {
        return {
            instanceType: 'production',
            capabilities: {
                fileOperations: this.securityBoundaries?.allowedOperations || [],
                commandExecution: this.securityBoundaries?.allowedCommands || [],
                chatEnabled: this.isChatAllowed(),
                devMode: this.devModeConfig?.devMode || false,
                sandboxMode: this.securityBoundaries?.sandboxMode || true
            },
            restrictions: {
                allowedPaths: this.securityBoundaries?.allowedPaths || [],
                restrictedPaths: this.securityBoundaries?.restrictedPaths || []
            },
            timestamp: new Date().toISOString()
        };
    }
    /**
     * Send a response back through the hub
     */
    sendResponse(messageId, response) {
        if (!this.isConnected || !this.ws)
            return;
        const responseMessage = {
            type: 'response',
            messageId,
            instanceId: this.instanceId,
            payload: response,
            timestamp: new Date().toISOString()
        };
        this.ws.send(JSON.stringify(responseMessage));
        logger_1.logger.debug('Sent response', { messageId, responseType: response.type || response.status });
    }
    /**
     * Send an error response
     */
    sendErrorResponse(messageId, error) {
        this.sendResponse(messageId, {
            status: 'error',
            error,
            timestamp: new Date().toISOString()
        });
    }
    /**
     * Start heartbeat mechanism
     */
    startHeartbeat() {
        this.heartbeatInterval = setInterval(() => {
            if (this.isConnected && this.ws?.readyState === ws_1.WebSocket.OPEN) {
                this.ws.ping();
                logger_1.logger.debug('Sent heartbeat ping');
            }
        }, 30000); // Every 30 seconds
    }
    /**
     * Stop heartbeat mechanism
     */
    stopHeartbeat() {
        if (this.heartbeatInterval) {
            clearInterval(this.heartbeatInterval);
            this.heartbeatInterval = null;
        }
    }
    /**
     * Schedule reconnection attempt
     */
    scheduleReconnect() {
        if (this.reconnectAttempts >= this.maxReconnectAttempts) {
            logger_1.logger.error('Max reconnection attempts reached');
            this.emit('maxReconnectAttemptsReached');
            return;
        }
        const delay = this.reconnectDelay * Math.pow(2, this.reconnectAttempts);
        this.reconnectAttempts++;
        logger_1.logger.info(`Scheduling reconnect attempt ${this.reconnectAttempts} in ${delay}ms`);
        setTimeout(() => {
            logger_1.logger.info(`Reconnection attempt ${this.reconnectAttempts}`);
            this.connect();
        }, delay);
    }
    /**
     * Setup event handlers for external use
     */
    setupEventHandlers() {
        this.on('connected', () => {
            logger_1.logger.info('ProdClaudeClient connected to hub');
        });
        this.on('disconnected', (details) => {
            logger_1.logger.warn('ProdClaudeClient disconnected from hub', details);
        });
        this.on('error', (error) => {
            logger_1.logger.error('ProdClaudeClient error:', error);
        });
    }
    /**
     * Graceful shutdown
     */
    async shutdown() {
        logger_1.logger.info('Shutting down ProdClaudeClient');
        this.stopHeartbeat();
        if (this.ws) {
            this.ws.close(1000, 'Graceful shutdown');
            this.ws = null;
        }
        this.isConnected = false;
        this.emit('shutdown');
    }
    /**
     * Get connection status
     */
    getStatus() {
        return {
            connected: this.isConnected,
            instanceId: this.instanceId,
            devMode: this.devModeConfig?.devMode || false,
            sandboxMode: this.securityBoundaries?.sandboxMode || true,
            reconnectAttempts: this.reconnectAttempts
        };
    }
}
exports.ProdClaudeClient = ProdClaudeClient;
// Export singleton instance
exports.prodClaudeClient = new ProdClaudeClient();
//# sourceMappingURL=prod-claude-client.js.map