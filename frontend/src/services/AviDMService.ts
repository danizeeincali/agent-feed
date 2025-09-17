/**
 * Avi DM Service - Core integration service for Claude Code communication
 * 
 * This service provides the main interface between the Avi DM UI component
 * and the Claude Code instance, handling HTTP requests, WebSocket connections,
 * context management, and error handling.
 */

import {
  ClaudeCodeConfig,
  ClaudeRequest,
  ClaudeResponse,
  ConversationSession,
  ConversationMessage,
  ProjectContext,
  FileContext,
  GitContext,
  ConnectionStatus,
  ClaudeCodeError,
  SendMessageOptions,
  StreamingMessage,
  SessionPreferences,
  RequestOptions,
  SystemStatus,
  HealthCheckResponse
} from '../types/claude-integration';

import { HttpClient } from './HttpClient';
import { WebSocketManager } from './WebSocketManager';
import { ContextManager } from './ContextManager';
import { SessionManager } from './SessionManager';
import { ErrorHandler } from './ErrorHandler';
import { SecurityManager } from './SecurityManager';

/**
 * Main service class for Claude Code integration
 * 
 * Provides high-level interface for:
 * - Sending messages to Claude
 * - Managing conversations and sessions
 * - Handling project context
 * - Real-time communication
 * - Error handling and fallbacks
 */
export class AviDMService {
  private config: ClaudeCodeConfig;
  private httpClient: HttpClient;
  private websocketManager: WebSocketManager;
  private contextManager: ContextManager;
  private sessionManager: SessionManager;
  private errorHandler: ErrorHandler;
  private securityManager: SecurityManager;
  
  private isInitialized: boolean = false;
  private currentSessionId: string | null = null;
  private connectionStatus: ConnectionStatus;
  private eventListeners: Map<string, Set<Function>> = new Map();

  constructor(config: Partial<ClaudeCodeConfig> = {}) {
    this.config = this.mergeWithDefaults(config);
    
    // Initialize core components
    this.httpClient = new HttpClient({
      baseUrl: this.config.baseUrl,
      timeout: this.config.timeout,
      retryAttempts: this.config.retryAttempts
    });
    
    this.websocketManager = new WebSocketManager({
      url: this.config.websocketUrl,
      reconnectAttempts: 5,
      reconnectDelay: 2000,
      heartbeatInterval: 30000,
      messageQueueSize: 100
    });
    
    this.contextManager = new ContextManager();
    this.sessionManager = new SessionManager();
    this.errorHandler = new ErrorHandler();
    this.securityManager = new SecurityManager();
    
    this.connectionStatus = {
      isConnected: false,
      connectionQuality: 'offline',
      reconnectAttempts: 0
    };
    
    this.setupEventListeners();
  }

  // ============================================================================
  // INITIALIZATION AND CONFIGURATION
  // ============================================================================

  private mergeWithDefaults(config: Partial<ClaudeCodeConfig>): ClaudeCodeConfig {
    return {
      baseUrl: config.baseUrl || 'http://localhost:8080/api',
      timeout: config.timeout || 300000, // 5 minutes for Claude Code SDK variable performance (15-17s + buffer)
      retryAttempts: config.retryAttempts || 3,
      websocketUrl: config.websocketUrl || 'ws://localhost:8080/ws',
      apiKey: config.apiKey,
      rateLimits: {
        messagesPerMinute: 30,
        tokensPerHour: 50000,
        ...config.rateLimits
      },
      security: {
        enableAuth: false,
        allowedOrigins: ['localhost:5173', 'localhost:3000'],
        sanitizeContent: true,
        ...config.security
      },
      fallback: {
        enableOfflineMode: true,
        cacheResponses: true,
        maxCacheSize: 100,
        ...config.fallback
      }
    };
  }

  private setupEventListeners(): void {
    // WebSocket event handlers
    this.websocketManager.onConnect(() => {
      this.updateConnectionStatus({ isConnected: true, connectionQuality: 'excellent' });
      this.emit('connected');
    });
    
    this.websocketManager.onDisconnect((reason) => {
      this.updateConnectionStatus({ 
        isConnected: false, 
        connectionQuality: 'offline',
        error: reason 
      });
      this.emit('disconnected', { reason });
    });
    
    this.websocketManager.onMessage((message: StreamingMessage) => {
      this.handleStreamingMessage(message);
    });
    
    this.websocketManager.onError((error) => {
      const claudeError = this.errorHandler.handleError(error, {
        operation: 'websocket_communication'
      });
      this.emit('error', claudeError);
    });
  }

  /**
   * Initialize the service and establish connections
   */
  async initialize(projectPath?: string): Promise<void> {
    try {
      // Check Claude Code health
      const health = await this.healthCheck();
      
      if (health.status === 'down') {
        throw new Error('Claude Code instance is not running');
      }
      
      // Initialize context if project path provided
      if (projectPath) {
        await this.contextManager.initializeContext(projectPath);
      }
      
      // Establish WebSocket connection
      await this.websocketManager.connect(this.config.websocketUrl);
      
      this.isInitialized = true;
      this.emit('initialized');
      
    } catch (error) {
      const claudeError = this.errorHandler.handleError(error, {
        operation: 'service_initialization',
        projectPath
      });
      
      if (this.config.fallback.enableOfflineMode) {
        await this.errorHandler.enableOfflineMode();
        this.isInitialized = true;
        this.emit('initialized', { offlineMode: true });
      } else {
        throw claudeError;
      }
    }
  }

  // ============================================================================
  // CORE MESSAGING API
  // ============================================================================

  /**
   * Send a message to Claude Code
   */
  async sendMessage(
    message: string, 
    options: SendMessageOptions = {}
  ): Promise<ClaudeResponse> {
    if (!this.isInitialized) {
      throw new Error('Service not initialized. Call initialize() first.');
    }
    
    // Rate limiting check
    if (this.currentSessionId) {
      const canProceed = await this.securityManager.checkRateLimit(this.currentSessionId);
      if (!canProceed) {
        throw this.errorHandler.handleError(
          new Error('Rate limit exceeded'),
          { operation: 'send_message' }
        );
      }
    }
    
    const requestId = this.generateRequestId();
    
    try {
      // Prepare context
      const context = await this.contextManager.serializeContext();
      
      // Build request
      const request: ClaudeRequest = {
        id: requestId,
        message: this.securityManager.sanitizeContent(message),
        context: JSON.parse(context),
        sessionId: this.currentSessionId || '',
        timestamp: new Date().toISOString(),
        options: {
          temperature: options.temperature,
          maxTokens: options.maxTokens,
          stream: options.stream || false,
          systemPrompt: options.systemPrompt
        }
      };
      
      // Send request to the correct Claude Code SDK endpoint
      console.log('🔧 AviDMService: Sending request to /api/claude-code/streaming-chat');
      const response = await this.httpClient.post<ClaudeResponse>(
        '/api/claude-code/streaming-chat',
        {
          message: request.message,
          options: {
            cwd: context.projectPath || '/workspaces/agent-feed',
            enableTools: true,
            ...request.options
          }
        }
      );
      
      // Record request for rate limiting
      if (this.currentSessionId) {
        this.securityManager.recordRequest(this.currentSessionId);
      }
      
      // Store message in session
      if (this.currentSessionId && response.status === 'success') {
        await this.sessionManager.addMessage(this.currentSessionId, {
          id: this.generateMessageId(),
          sessionId: this.currentSessionId,
          role: 'user',
          content: message,
          timestamp: request.timestamp,
          metadata: {
            tokenCount: message.length // Rough estimate
          }
        });
        
        await this.sessionManager.addMessage(this.currentSessionId, {
          id: response.id,
          sessionId: this.currentSessionId,
          role: 'assistant',
          content: response.content,
          timestamp: new Date().toISOString(),
          metadata: response.metadata
        });
      }
      
      this.emit('messageReceived', response);
      return response;
      
    } catch (error) {
      const claudeError = this.errorHandler.handleError(error, {
        operation: 'send_message',
        requestId,
        sessionId: this.currentSessionId
      });
      
      // Try fallback response
      if (this.config.fallback.enableOfflineMode) {
        const fallbackResponse = await this.errorHandler.generateFallbackResponse(
          message,
          await this.contextManager.getProjectContext()
        );
        
        return {
          id: requestId,
          requestId,
          content: fallbackResponse.content,
          metadata: {
            model: 'fallback',
            tokensUsed: 0,
            processingTime: 0,
            suggestions: fallbackResponse.suggestions
          },
          status: 'success'
        };
      }
      
      throw claudeError;
    }
  }

  /**
   * Send a streaming message to Claude Code
   */
  async sendMessageStream(
    message: string,
    onChunk: (chunk: string) => void,
    options: SendMessageOptions = {}
  ): Promise<void> {
    if (!this.connectionStatus.isConnected) {
      throw new Error('WebSocket connection required for streaming');
    }
    
    const requestId = this.generateRequestId();
    
    // Set up chunk handler for this specific request
    const handleChunk = (streamMessage: StreamingMessage) => {
      if (streamMessage.requestId === requestId) {
        switch (streamMessage.type) {
          case 'chunk':
            if (streamMessage.content) {
              onChunk(streamMessage.content);
            }
            break;
          case 'complete':
            this.emit('streamComplete', requestId);
            break;
          case 'error':
            this.emit('streamError', { requestId, error: streamMessage.error });
            break;
        }
      }
    };
    
    // Register temporary listener
    this.on('streamingMessage', handleChunk);
    
    try {
      // Prepare and send streaming request
      const context = await this.contextManager.serializeContext();
      
      const request: ClaudeRequest = {
        id: requestId,
        message: this.securityManager.sanitizeContent(message),
        context: JSON.parse(context),
        sessionId: this.currentSessionId || '',
        timestamp: new Date().toISOString(),
        options: {
          ...options,
          stream: true
        }
      };
      
      this.websocketManager.send({
        type: 'chat_request',
        data: request
      });
      
    } catch (error) {
      this.off('streamingMessage', handleChunk);
      throw this.errorHandler.handleError(error, {
        operation: 'send_message_stream',
        requestId
      });
    } finally {
      // Clean up listener after a timeout
      setTimeout(() => {
        this.off('streamingMessage', handleChunk);
      }, this.config.timeout);
    }
  }

  // ============================================================================
  // SESSION MANAGEMENT
  // ============================================================================

  /**
   * Create a new conversation session
   */
  async createSession(
    projectId: string,
    projectPath?: string,
    preferences?: Partial<SessionPreferences>
  ): Promise<string> {
    try {
      let context: ProjectContext | undefined;
      
      if (projectPath) {
        context = await this.contextManager.initializeContext(projectPath);
      }
      
      const response = await this.httpClient.post<{ sessionId: string }>(
        '/sessions',
        { projectId, projectPath, context }
      );
      
      const sessionId = response.sessionId;
      this.currentSessionId = sessionId;
      
      // Initialize local session
      const session: ConversationSession = {
        id: sessionId,
        projectId,
        projectPath: projectPath || '',
        startTime: new Date().toISOString(),
        lastActivity: new Date().toISOString(),
        messageCount: 0,
        context: context || {} as ProjectContext,
        preferences: {
          autoSaveInterval: 30000,
          maxHistoryMessages: 100,
          contextSensitivity: 'medium',
          includeGitContext: true,
          includeFileTree: true,
          preferredResponseStyle: 'detailed',
          ...preferences
        },
        isActive: true
      };
      
      await this.sessionManager.createSession(sessionId, session);
      
      this.emit('sessionStarted', { sessionId, projectId });
      return sessionId;
      
    } catch (error) {
      throw this.errorHandler.handleError(error, {
        operation: 'create_session',
        projectId,
        projectPath
      });
    }
  }

  /**
   * End the current session
   */
  async endSession(sessionId?: string): Promise<void> {
    const targetSessionId = sessionId || this.currentSessionId;
    
    if (!targetSessionId) {
      return;
    }
    
    try {
      // Save session before ending
      await this.sessionManager.saveSession(targetSessionId);
      
      // Notify Claude Code
      await this.httpClient.delete(`/sessions/${targetSessionId}`);
      
      // Clean up locally
      await this.sessionManager.endSession(targetSessionId);
      
      if (targetSessionId === this.currentSessionId) {
        this.currentSessionId = null;
      }
      
      this.emit('sessionEnded', { sessionId: targetSessionId });
      
    } catch (error) {
      this.errorHandler.handleError(error, {
        operation: 'end_session',
        sessionId: targetSessionId
      });
    }
  }

  /**
   * Get conversation history for a session
   */
  async getConversationHistory(
    sessionId?: string,
    limit?: number
  ): Promise<ConversationMessage[]> {
    const targetSessionId = sessionId || this.currentSessionId;
    
    if (!targetSessionId) {
      return [];
    }
    
    try {
      return await this.sessionManager.getMessages(targetSessionId, limit);
    } catch (error) {
      throw this.errorHandler.handleError(error, {
        operation: 'get_conversation_history',
        sessionId: targetSessionId
      });
    }
  }

  // ============================================================================
  // CONTEXT MANAGEMENT
  // ============================================================================

  /**
   * Update the project context
   */
  async updateProjectContext(context: Partial<ProjectContext>): Promise<void> {
    try {
      await this.contextManager.updateContext(context);
      
      if (this.currentSessionId && this.connectionStatus.isConnected) {
        await this.httpClient.post('/context/update', {
          sessionId: this.currentSessionId,
          context: await this.contextManager.getProjectContext()
        });
      }
      
      this.emit('contextUpdated', context);
      
    } catch (error) {
      throw this.errorHandler.handleError(error, {
        operation: 'update_project_context'
      });
    }
  }

  /**
   * Inject specific file contexts
   */
  async injectFileContext(files: FileContext[]): Promise<void> {
    try {
      const sanitizedFiles = files.map(file => ({
        ...file,
        content: this.securityManager.sanitizeContent(file.content)
      }));
      
      if (this.currentSessionId && this.connectionStatus.isConnected) {
        await this.httpClient.post('/context/files', {
          sessionId: this.currentSessionId,
          files: sanitizedFiles
        });
      }
      
      this.emit('fileContextInjected', sanitizedFiles);
      
    } catch (error) {
      throw this.errorHandler.handleError(error, {
        operation: 'inject_file_context'
      });
    }
  }

  /**
   * Inject Git context information
   */
  async injectGitContext(gitInfo: GitContext): Promise<void> {
    try {
      await this.contextManager.updateGitContext(gitInfo);
      
      if (this.currentSessionId) {
        await this.updateProjectContext({
          currentBranch: gitInfo.currentBranch,
          recentChanges: gitInfo.stagedChanges.concat(gitInfo.unstagedChanges)
        });
      }
      
      this.emit('gitContextInjected', gitInfo);
      
    } catch (error) {
      throw this.errorHandler.handleError(error, {
        operation: 'inject_git_context'
      });
    }
  }

  // ============================================================================
  // CONNECTION MANAGEMENT
  // ============================================================================

  /**
   * Check connection to Claude Code
   */
  async checkConnection(): Promise<ConnectionStatus> {
    try {
      const startTime = Date.now();
      const health = await this.healthCheck();
      const endTime = Date.now();
      
      const isHealthy = health.status === 'healthy';
      const latency = endTime - startTime;
      
      this.updateConnectionStatus({
        isConnected: isHealthy,
        connectionQuality: this.getQualityFromLatency(latency),
        latency,
        reconnectAttempts: 0
      });
      
      return this.connectionStatus;
      
    } catch (error) {
      this.updateConnectionStatus({
        isConnected: false,
        connectionQuality: 'offline',
        error: error instanceof Error ? error.message : 'Connection failed'
      });
      
      return this.connectionStatus;
    }
  }

  /**
   * Attempt to reconnect to Claude Code
   */
  async reconnect(): Promise<void> {
    try {
      this.updateConnectionStatus({
        ...this.connectionStatus,
        reconnectAttempts: this.connectionStatus.reconnectAttempts + 1
      });
      
      // Try HTTP connection first
      await this.checkConnection();
      
      // If successful, try WebSocket reconnection
      if (this.connectionStatus.isConnected) {
        await this.websocketManager.connect(this.config.websocketUrl);
      }
      
      this.emit('reconnected');
      
    } catch (error) {
      throw this.errorHandler.handleError(error, {
        operation: 'reconnect'
      });
    }
  }

  /**
   * Health check for Claude Code instance
   */
  async healthCheck(): Promise<HealthCheckResponse> {
    return await this.httpClient.get<HealthCheckResponse>('/health');
  }

  /**
   * Get system status
   */
  async getSystemStatus(): Promise<SystemStatus> {
    return await this.httpClient.get<SystemStatus>('/status');
  }

  // ============================================================================
  // EVENT HANDLING
  // ============================================================================

  /**
   * Register event listener
   */
  on(event: string, callback: Function): void {
    if (!this.eventListeners.has(event)) {
      this.eventListeners.set(event, new Set());
    }
    this.eventListeners.get(event)!.add(callback);
  }

  /**
   * Remove event listener
   */
  off(event: string, callback: Function): void {
    const listeners = this.eventListeners.get(event);
    if (listeners) {
      listeners.delete(callback);
    }
  }

  /**
   * Emit event to listeners
   */
  private emit(event: string, data?: any): void {
    const listeners = this.eventListeners.get(event);
    if (listeners) {
      listeners.forEach(callback => {
        try {
          callback(data);
        } catch (error) {
          console.error(`Error in event listener for ${event}:`, error);
        }
      });
    }
  }

  // ============================================================================
  // PRIVATE HELPER METHODS
  // ============================================================================

  private handleStreamingMessage(message: StreamingMessage): void {
    this.emit('streamingMessage', message);
    
    // Handle different message types
    switch (message.type) {
      case 'typing':
        this.emit('typing', { sessionId: message.sessionId });
        break;
      case 'status':
        this.emit('statusUpdate', message.content);
        break;
      case 'context_update':
        this.emit('contextUpdateReceived', message.content);
        break;
    }
  }

  private updateConnectionStatus(updates: Partial<ConnectionStatus>): void {
    this.connectionStatus = {
      ...this.connectionStatus,
      ...updates,
      lastConnected: updates.isConnected ? new Date().toISOString() : this.connectionStatus.lastConnected,
      lastDisconnected: updates.isConnected === false ? new Date().toISOString() : this.connectionStatus.lastDisconnected
    };
    
    this.emit('connectionStatusChanged', this.connectionStatus);
  }

  private getQualityFromLatency(latency: number): ConnectionStatus['connectionQuality'] {
    if (latency < 100) return 'excellent';
    if (latency < 300) return 'good';
    if (latency < 1000) return 'poor';
    return 'offline';
  }

  private generateRequestId(): string {
    return `req_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  }

  private generateMessageId(): string {
    return `msg_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  }

  // ============================================================================
  // CLEANUP AND DISPOSAL
  // ============================================================================

  /**
   * Clean up resources and close connections
   */
  async dispose(): Promise<void> {
    try {
      // End current session
      if (this.currentSessionId) {
        await this.endSession();
      }
      
      // Close WebSocket connection
      await this.websocketManager.disconnect();
      
      // Clean up managers
      this.contextManager.dispose();
      this.sessionManager.dispose();
      
      // Clear event listeners
      this.eventListeners.clear();
      
      this.isInitialized = false;
      
      this.emit('disposed');
      
    } catch (error) {
      console.error('Error during disposal:', error);
    }
  }

  // ============================================================================
  // GETTERS
  // ============================================================================

  get isConnected(): boolean {
    return this.connectionStatus.isConnected;
  }

  get currentSession(): string | null {
    return this.currentSessionId;
  }

  get status(): ConnectionStatus {
    return { ...this.connectionStatus };
  }

  get configuration(): ClaudeCodeConfig {
    return { ...this.config };
  }
}

// Export default instance
export default AviDMService;
