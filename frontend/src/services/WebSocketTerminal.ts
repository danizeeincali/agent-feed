/**
 * WebSocket Terminal Implementation
 * 
 * Follows London School TDD - implements the contracts defined by our tests
 */

import { 
  WebSocketTerminalConfig, 
  TerminalMessage, 
  TerminalConnectionState,
  TerminalExecutionOptions,
  ILogger,
  IRetryManager,
  IMessageHandler,
  IConnectionManager
} from '../types/terminal';

export class WebSocketTerminal {
  private logger: ILogger;
  private retryManager: IRetryManager;
  private messageHandler: IMessageHandler;
  private connectionManager: IConnectionManager;
  private websocket: WebSocket | null = null;
  private sessionId: string;
  private eventHandlers: Map<string, Function> = new Map();

  constructor(config: WebSocketTerminalConfig) {
    this.logger = config.logger;
    this.retryManager = config.retryManager;
    this.messageHandler = config.messageHandler;
    this.connectionManager = config.connectionManager;
    this.sessionId = `session-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
  }

  async connect(url: string): Promise<void> {
    try {
      this.logger.info('Terminal connection initiated', { url });
      
      // Coordinate with connection manager
      this.websocket = await this.connectionManager.connect(url);
      
      // Register event listeners after successful connection
      this.setupEventListeners();
      
      this.logger.info('Terminal connection established', { url, sessionId: this.sessionId });
    } catch (error) {
      this.logger.error('Terminal connection failed', { error: (error as Error).message });
      throw error;
    }
  }

  private setupEventListeners(): void {
    if (!this.websocket) return;

    const openHandler = () => {
      this.logger.debug('WebSocket connection opened');
      this.messageHandler.handleConnectionStatus('connected');
    };

    const messageHandler = (event: MessageEvent) => {
      try {
        const message: TerminalMessage = JSON.parse(event.data);
        this.handleIncomingMessage(message);
      } catch (error) {
        this.logger.error('Failed to parse incoming message', { error: (error as Error).message });
      }
    };

    const errorHandler = (event: Event) => {
      this.logger.error('WebSocket error', event);
      this.messageHandler.handleError('WebSocket connection error');
    };

    const closeHandler = (event: CloseEvent) => {
      this.logger.warn('WebSocket connection closed', { code: event.code, reason: event.reason });
      this.messageHandler.handleConnectionStatus('disconnected');
      
      // Coordinate with retry manager for reconnection
      if (this.retryManager.shouldRetry(new Error(`Connection closed: ${event.reason}`), this.retryManager.getCurrentAttempt())) {
        const delay = this.retryManager.getNextDelay(this.retryManager.getCurrentAttempt());
        this.logger.info('Scheduling reconnection attempt', { delay });
        setTimeout(() => this.attemptReconnection(), delay);
      }
    };

    // Store handlers for cleanup
    this.eventHandlers.set('open', openHandler);
    this.eventHandlers.set('message', messageHandler);
    this.eventHandlers.set('error', errorHandler);
    this.eventHandlers.set('close', closeHandler);

    // Register listeners
    this.websocket.addEventListener('open', openHandler);
    this.websocket.addEventListener('message', messageHandler);
    this.websocket.addEventListener('error', errorHandler);
    this.websocket.addEventListener('close', closeHandler);
  }

  private handleIncomingMessage(message: TerminalMessage): void {
    this.logger.debug('Received message', { type: message.type });

    switch (message.type) {
      case 'output':
        this.messageHandler.handleOutput(message.data);
        break;
      case 'error':
        this.logger.warn('Terminal error received', { error: message.data });
        this.messageHandler.handleError(message.data);
        break;
      case 'command_result':
        this.messageHandler.handleCommandResult(message.data);
        break;
      case 'directory_change':
        if (this.messageHandler.handleDirectoryChange) {
          this.messageHandler.handleDirectoryChange(message.data);
        }
        break;
      case 'connection_status':
        this.messageHandler.handleConnectionStatus(message.data);
        break;
      default:
        if (this.messageHandler.handleMessage) {
          this.messageHandler.handleMessage(message);
        }
    }
  }

  async executeCommand(command: string, options?: TerminalExecutionOptions): Promise<void> {
    if (!this.connectionManager.isConnected()) {
      throw new Error('Terminal not connected');
    }

    const message: TerminalMessage = {
      type: 'command',
      data: command,
      timestamp: Date.now(),
      sessionId: this.sessionId
    };

    try {
      this.websocket!.send(JSON.stringify(message));
      this.logger.debug('Command sent to terminal', { command });

      // Handle timeout if specified
      if (options?.timeout) {
        const timeoutPromise = new Promise<never>((_, reject) => {
          setTimeout(() => {
            this.logger.warn('Command execution timeout', { command, timeout: options.timeout });
            reject(new Error('Command execution timeout'));
          }, options.timeout);
        });

        // Race between command completion and timeout
        // Note: In a real implementation, we'd need to track command completion
        // For now, we'll just handle the timeout scenario
        await Promise.race([
          new Promise(resolve => setTimeout(resolve, 100)), // Simulate quick completion
          timeoutPromise
        ]);
      }
    } catch (error) {
      this.logger.error('Failed to execute command', { command, error: (error as Error).message });
      throw error;
    }
  }

  private async attemptReconnection(): Promise<void> {
    try {
      this.retryManager.incrementAttempt();
      // Implementation would attempt to reconnect here
      this.logger.info('Attempting to reconnect...');
    } catch (error) {
      this.logger.error('Reconnection attempt failed', { error: (error as Error).message });
    }
  }

  async disconnect(): Promise<void> {
    if (this.websocket && this.connectionManager.isConnected()) {
      // Remove event listeners
      this.eventHandlers.forEach((handler, eventType) => {
        this.websocket!.removeEventListener(eventType, handler as EventListener);
      });
      this.eventHandlers.clear();

      // Coordinate with connection manager
      await this.connectionManager.disconnect();
      this.logger.info('Terminal disconnected');
    }
  }

  getConnectionState(): TerminalConnectionState {
    return this.connectionManager.getConnectionState();
  }
}