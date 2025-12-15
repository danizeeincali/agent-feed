import { WebSocket } from 'ws';
import { EventEmitter } from 'events';
import fs from 'fs/promises';
import path from 'path';
import { logger } from '@/utils/logger';

interface DevModeConfig {
  mode: string;
  devMode: boolean;
  devModeSettings: {
    enableChat: boolean;
    enhancedLogging: boolean;
    debugInfo: boolean;
    testExecution: boolean;
  };
}

interface ProdConfig {
  instance: {
    type: string;
    name: string;
    version: string;
  };
  workspace: {
    root: string;
    restricted_paths: string[];
    allowed_operations: string[];
  };
  permissions: {
    dangerous_skip: boolean;
    sandbox_mode: boolean;
    allowed_commands: string[];
  };
}

interface ClaudeMessage {
  id: string;
  type: 'command' | 'chat' | 'system';
  payload: any;
  timestamp: string;
  from: string;
  requiresResponse?: boolean;
}

interface SecurityBoundary {
  allowedPaths: string[];
  restrictedPaths: string[];
  allowedOperations: string[];
  allowedCommands: string[];
  sandboxMode: boolean;
}

/**
 * Production Claude WebSocket Client
 * Connects production Claude instance to the WebSocket hub
 */
export class ProdClaudeClient extends EventEmitter {
  private ws: WebSocket | null = null;
  private hubUrl: string;
  private reconnectAttempts = 0;
  private maxReconnectAttempts = 10;
  private reconnectDelay = 1000;
  private heartbeatInterval: NodeJS.Timeout | null = null;
  private isConnected = false;
  private instanceId = 'prod-claude';
  private devModeConfig: DevModeConfig | null = null;
  private prodConfig: ProdConfig | null = null;
  private securityBoundaries: SecurityBoundary | null = null;

  constructor(hubUrl = 'ws://localhost:3001') {
    super();
    this.hubUrl = hubUrl;
    this.setupEventHandlers();
  }

  /**
   * Initialize the client with configuration loading
   */
  async initialize(): Promise<void> {
    try {
      await this.loadConfigurations();
      await this.loadSecurityBoundaries();
      this.connect();
      
      logger.info('ProdClaudeClient initialized', {
        instanceId: this.instanceId,
        devMode: this.devModeConfig?.devMode || false,
        sandboxMode: this.securityBoundaries?.sandboxMode || true
      });
    } catch (error) {
      logger.error('Failed to initialize ProdClaudeClient:', error);
      throw error;
    }
  }

  /**
   * Load dev mode and production configurations
   */
  private async loadConfigurations(): Promise<void> {
    try {
      // Load dev mode configuration
      const devModeConfigPath = '/workspaces/agent-feed/prod/config/mode.json';
      const devModeData = await fs.readFile(devModeConfigPath, 'utf8');
      this.devModeConfig = JSON.parse(devModeData);

      // Load production configuration
      const prodConfigPath = '/workspaces/agent-feed/.claude/prod/config.json';
      const prodData = await fs.readFile(prodConfigPath, 'utf8');
      this.prodConfig = JSON.parse(prodData);

      // Also check environment variable for dev mode
      const envDevMode = process.env.DEV_MODE === 'true';
      if (envDevMode && this.devModeConfig) {
        this.devModeConfig.devMode = true;
      }

      logger.info('Configurations loaded', {
        devMode: this.devModeConfig?.devMode,
        instanceType: this.prodConfig?.instance.type,
        sandboxMode: this.prodConfig?.permissions.sandbox_mode
      });
    } catch (error) {
      logger.error('Failed to load configurations:', error);
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
  private async loadSecurityBoundaries(): Promise<void> {
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

      logger.info('Security boundaries loaded', {
        allowedPaths: this.securityBoundaries.allowedPaths.length,
        restrictedPaths: this.securityBoundaries.restrictedPaths.length,
        sandboxMode: this.securityBoundaries.sandboxMode
      });
    } catch (error) {
      logger.error('Failed to load security boundaries:', error);
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
  private connect(): void {
    try {
      logger.info('Connecting to WebSocket hub', { hubUrl: this.hubUrl });
      
      this.ws = new WebSocket(this.hubUrl);
      this.setupWebSocketHandlers();
    } catch (error) {
      logger.error('Failed to create WebSocket connection:', error);
      this.scheduleReconnect();
    }
  }

  /**
   * Setup WebSocket event handlers
   */
  private setupWebSocketHandlers(): void {
    if (!this.ws) return;

    this.ws.on('open', () => {
      this.isConnected = true;
      this.reconnectAttempts = 0;
      logger.info('Connected to WebSocket hub');

      // Register with hub
      this.registerWithHub();
      
      // Start heartbeat
      this.startHeartbeat();
      
      this.emit('connected');
    });

    this.ws.on('message', (data: Buffer) => {
      try {
        const message = JSON.parse(data.toString()) as ClaudeMessage;
        this.handleIncomingMessage(message);
      } catch (error) {
        logger.error('Failed to parse incoming message:', error);
      }
    });

    this.ws.on('close', (code: number, reason: Buffer) => {
      this.isConnected = false;
      this.stopHeartbeat();
      
      logger.warn('WebSocket connection closed', { 
        code, 
        reason: reason.toString() 
      });
      
      this.emit('disconnected', { code, reason: reason.toString() });
      this.scheduleReconnect();
    });

    this.ws.on('error', (error: Error) => {
      logger.error('WebSocket error:', error);
      this.emit('error', error);
    });

    this.ws.on('ping', () => {
      if (this.ws?.readyState === WebSocket.OPEN) {
        this.ws.pong();
      }
    });
  }

  /**
   * Register this instance with the hub
   */
  private registerWithHub(): void {
    if (!this.isConnected || !this.ws) return;

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
    logger.info('Registered with hub', registrationMessage);
  }

  /**
   * Handle incoming messages from the hub
   */
  private async handleIncomingMessage(message: ClaudeMessage): Promise<void> {
    logger.info('Received message', {
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
      let response: any;
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
    } catch (error) {
      logger.error('Error handling message:', error);
      this.sendErrorResponse(message.id, error instanceof Error ? error.message : 'Unknown error');
    }
  }

  /**
   * Validate message security based on boundaries
   */
  private validateMessageSecurity(message: ClaudeMessage): boolean {
    if (!this.securityBoundaries) {
      logger.warn('Security boundaries not loaded, denying message');
      return false;
    }

    // In sandbox mode, be extra strict
    if (this.securityBoundaries.sandboxMode) {
      // Check if message involves file operations
      if (message.payload?.operation && message.payload?.path) {
        const path = message.payload.path;
        
        // Check if path is in restricted areas
        const isRestricted = this.securityBoundaries.restrictedPaths.some(
          restrictedPath => path.startsWith(restrictedPath)
        );
        
        if (isRestricted) {
          logger.warn('Message targets restricted path', { path });
          return false;
        }

        // Check if path is in allowed areas
        const isAllowed = this.securityBoundaries.allowedPaths.some(
          allowedPath => path.startsWith(allowedPath)
        );
        
        if (!isAllowed) {
          logger.warn('Message targets non-allowed path', { path });
          return false;
        }
      }

      // Check if operation is allowed
      if (message.payload?.operation) {
        const operation = message.payload.operation;
        if (!this.securityBoundaries.allowedOperations.includes(operation)) {
          logger.warn('Message requests non-allowed operation', { operation });
          return false;
        }
      }
    }

    return true;
  }

  /**
   * Check if chat is allowed based on dev mode settings
   */
  private isChatAllowed(): boolean {
    return this.devModeConfig?.devMode === true && 
           this.devModeConfig?.devModeSettings.enableChat === true;
  }

  /**
   * Handle command messages
   */
  private async handleCommand(message: ClaudeMessage): Promise<any> {
    const { operation, payload } = message.payload;

    logger.info('Processing command', { operation, messageId: message.id });

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
  private async handleChat(message: ClaudeMessage): Promise<any> {
    if (!this.isChatAllowed()) {
      throw new Error('Chat not enabled in current mode');
    }

    logger.info('Processing chat message', { messageId: message.id });

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
  private async handleSystemMessage(message: ClaudeMessage): Promise<any> {
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
  private async executeCommand(payload: any): Promise<any> {
    const { command, args, workingDir } = payload;

    // Security check: only allow whitelisted commands
    if (!this.securityBoundaries?.allowedCommands.includes(command)) {
      throw new Error(`Command not allowed: ${command}`);
    }

    // Security check: validate working directory
    if (workingDir && !this.isPathAllowed(workingDir)) {
      throw new Error(`Working directory not allowed: ${workingDir}`);
    }

    logger.info('Executing command', { command, args, workingDir });

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
  private async readFile(filePath: string): Promise<any> {
    if (!this.isPathAllowed(filePath)) {
      throw new Error(`File path not allowed: ${filePath}`);
    }

    try {
      const content = await fs.readFile(filePath, 'utf8');
      return {
        status: 'success',
        path: filePath,
        content,
        timestamp: new Date().toISOString()
      };
    } catch (error) {
      throw new Error(`Failed to read file: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  /**
   * Write a file with path and content validation
   */
  private async writeFile(filePath: string, content: string): Promise<any> {
    if (!this.isPathAllowed(filePath)) {
      throw new Error(`File path not allowed: ${filePath}`);
    }

    if (!this.securityBoundaries?.allowedOperations.includes('write')) {
      throw new Error('Write operations not allowed');
    }

    try {
      await fs.writeFile(filePath, content, 'utf8');
      return {
        status: 'success',
        path: filePath,
        size: content.length,
        timestamp: new Date().toISOString()
      };
    } catch (error) {
      throw new Error(`Failed to write file: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  /**
   * List directory contents with path validation
   */
  private async listDirectory(dirPath: string): Promise<any> {
    if (!this.isPathAllowed(dirPath)) {
      throw new Error(`Directory path not allowed: ${dirPath}`);
    }

    try {
      const entries = await fs.readdir(dirPath, { withFileTypes: true });
      const files = entries.map(entry => ({
        name: entry.name,
        type: entry.isDirectory() ? 'directory' : 'file',
        path: path.join(dirPath, entry.name)
      }));

      return {
        status: 'success',
        path: dirPath,
        files,
        timestamp: new Date().toISOString()
      };
    } catch (error) {
      throw new Error(`Failed to list directory: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  /**
   * Check if a path is allowed based on security boundaries
   */
  private isPathAllowed(filePath: string): boolean {
    if (!this.securityBoundaries) return false;

    // Check restricted paths first
    const isRestricted = this.securityBoundaries.restrictedPaths.some(
      restrictedPath => filePath.startsWith(restrictedPath)
    );
    
    if (isRestricted) return false;

    // Check allowed paths
    return this.securityBoundaries.allowedPaths.some(
      allowedPath => filePath.startsWith(allowedPath)
    );
  }

  /**
   * Get current health status
   */
  private getHealthStatus(): any {
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
  private getCapabilities(): any {
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
  private sendResponse(messageId: string, response: any): void {
    if (!this.isConnected || !this.ws) return;

    const responseMessage = {
      type: 'response',
      messageId,
      instanceId: this.instanceId,
      payload: response,
      timestamp: new Date().toISOString()
    };

    this.ws.send(JSON.stringify(responseMessage));
    logger.debug('Sent response', { messageId, responseType: response.type || response.status });
  }

  /**
   * Send an error response
   */
  private sendErrorResponse(messageId: string, error: string): void {
    this.sendResponse(messageId, {
      status: 'error',
      error,
      timestamp: new Date().toISOString()
    });
  }

  /**
   * Start heartbeat mechanism
   */
  private startHeartbeat(): void {
    this.heartbeatInterval = setInterval(() => {
      if (this.isConnected && this.ws?.readyState === WebSocket.OPEN) {
        this.ws.ping();
        logger.debug('Sent heartbeat ping');
      }
    }, 30000); // Every 30 seconds
  }

  /**
   * Stop heartbeat mechanism
   */
  private stopHeartbeat(): void {
    if (this.heartbeatInterval) {
      clearInterval(this.heartbeatInterval);
      this.heartbeatInterval = null;
    }
  }

  /**
   * Schedule reconnection attempt
   */
  private scheduleReconnect(): void {
    if (this.reconnectAttempts >= this.maxReconnectAttempts) {
      logger.error('Max reconnection attempts reached');
      this.emit('maxReconnectAttemptsReached');
      return;
    }

    const delay = this.reconnectDelay * Math.pow(2, this.reconnectAttempts);
    this.reconnectAttempts++;

    logger.info(`Scheduling reconnect attempt ${this.reconnectAttempts} in ${delay}ms`);

    setTimeout(() => {
      logger.info(`Reconnection attempt ${this.reconnectAttempts}`);
      this.connect();
    }, delay);
  }

  /**
   * Setup event handlers for external use
   */
  private setupEventHandlers(): void {
    this.on('connected', () => {
      logger.info('ProdClaudeClient connected to hub');
    });

    this.on('disconnected', (details) => {
      logger.warn('ProdClaudeClient disconnected from hub', details);
    });

    this.on('error', (error) => {
      logger.error('ProdClaudeClient error:', error);
    });
  }

  /**
   * Graceful shutdown
   */
  async shutdown(): Promise<void> {
    logger.info('Shutting down ProdClaudeClient');
    
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
  getStatus(): {
    connected: boolean;
    instanceId: string;
    devMode: boolean;
    sandboxMode: boolean;
    reconnectAttempts: number;
  } {
    return {
      connected: this.isConnected,
      instanceId: this.instanceId,
      devMode: this.devModeConfig?.devMode || false,
      sandboxMode: this.securityBoundaries?.sandboxMode || true,
      reconnectAttempts: this.reconnectAttempts
    };
  }
}

// Export singleton instance
export const prodClaudeClient = new ProdClaudeClient();