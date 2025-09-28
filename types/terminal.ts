/**
 * Terminal Type Definitions
 * 
 * Type contracts for terminal functionality following London School TDD approach
 */

export type TerminalConnectionState = 'connecting' | 'connected' | 'disconnected' | 'error';

export type TerminalMessageType = 
  | 'command'
  | 'output' 
  | 'error'
  | 'connection_status'
  | 'command_result'
  | 'directory_change'
  | 'ping'
  | 'pong';

export type TerminalOutputType = 'stdout' | 'stderr' | 'system';

export interface TerminalMessage {
  type: TerminalMessageType;
  data: any;
  timestamp: number;
  sessionId?: string;
  requestId?: string;
}

export interface TerminalCommandResult {
  command: string;
  exitCode: number;
  output?: string;
  error?: string;
  duration: number;
  timestamp?: number;
}

export interface TerminalOutput {
  content: string;
  type: TerminalOutputType;
  timestamp: number;
  isError?: boolean;
  isSystemMessage?: boolean;
}

export interface TerminalConnectionOptions {
  url: string;
  timeout?: number;
  retryAttempts?: number;
  retryDelay?: number;
}

export interface TerminalExecutionOptions {
  timeout?: number;
  cwd?: string;
  env?: Record<string, string>;
}

export interface TerminalSession {
  id: string;
  startTime: number;
  currentDirectory: string;
  commandHistory: TerminalCommandHistory[];
  connectionState: TerminalConnectionState;
}

export interface TerminalCommandHistory {
  command: string;
  timestamp: number;
  exitCode: number;
  duration?: number;
}

// Dependency injection interfaces for London School testing

export interface ILogger {
  info(message: string, meta?: any): void;
  warn(message: string, meta?: any): void;
  error(message: string, meta?: any): void;
  debug(message: string, meta?: any): void;
}

export interface IRetryManager {
  shouldRetry(error: Error, attempt: number): boolean;
  getNextDelay(attempt: number, options?: { jitter?: boolean }): number;
  reset(): void;
  incrementAttempt(): void;
  executeWithRetry<T>(operation: () => Promise<T>, options?: { timeout?: number }): Promise<T>;
  getCurrentAttempt(): number;
  getMetrics(): RetryMetrics;
}

export interface RetryMetrics {
  currentAttempt: number;
  maxRetries: number;
  currentDelay: number;
  isRetrying: boolean;
  lastError: Error | null;
}

export interface IConnectionManager {
  connect(url: string): Promise<WebSocket>;
  disconnect(): Promise<void>;
  getConnectionState(): TerminalConnectionState;
  isConnected(): boolean;
}

export interface IMessageHandler {
  handleOutput(data: string): void;
  handleError(error: string): void;
  handleConnectionStatus(status: string): void;
  handleCommandResult(result: TerminalCommandResult | any): void;
  handleDirectoryChange?(directory: string): void;
  handleMessage?(message: TerminalMessage | any): void;
  handleBatchMessages?(messages: TerminalMessage[]): void;
}

export interface IOutputRenderer {
  renderOutput(output: TerminalOutput): void;
  renderError(error: TerminalOutput): void;
  renderPrompt(options: { directory: string; exitCode: number }): void;
  clearScreen(): void;
  scrollToBottom(): void;
}

export interface IStateManager {
  updateConnectionState(state: TerminalConnectionState): void;
  updateCommandHistory(command: TerminalCommandHistory): void;
  getCurrentDirectory(): string;
  setCurrentDirectory(directory: string): void;
  getSessionId(): string;
}

export interface IEventEmitter {
  emit(event: string, data: any): void;
  on(event: string, listener: Function): void;
  off(event: string, listener: Function): void;
  removeAllListeners(event?: string): void;
}

export interface IAnalytics {
  trackCommand(data: TerminalCommandTracking): void;
  trackError(type: string, data: any): void;
  trackPerformance(metric: string, data: any): void;
  trackConnectionEvent(event: string, data: any): void;
}

export interface TerminalCommandTracking {
  command: string;
  exitCode: number;
  duration: number;
  timestamp: number;
}

export interface IBackoffCalculator {
  calculateDelay(attempt: number): number;
  reset(): void;
  getCurrentDelay(): number;
  getMaxDelay(): number;
}

export interface IHealthChecker {
  isHealthy(): boolean;
  checkConnectivity(): Promise<boolean>;
  getLastSuccessfulConnection(): number;
  recordFailure(): void;
  recordSuccess(): void;
}

// WebSocket Terminal configuration
export interface WebSocketTerminalConfig {
  logger: ILogger;
  retryManager: IRetryManager;
  messageHandler: IMessageHandler;
  connectionManager: IConnectionManager;
  url?: string;
  options?: TerminalConnectionOptions;
}

// Message Handler configuration
export interface TerminalMessageHandlerConfig {
  outputRenderer: IOutputRenderer;
  stateManager: IStateManager;
  eventEmitter: IEventEmitter;
  analytics: IAnalytics;
}

// Retry Manager configuration
export interface TerminalRetryManagerConfig {
  logger: ILogger;
  backoffCalculator: IBackoffCalculator;
  healthChecker: IHealthChecker;
  maxRetries: number;
  baseDelay: number;
  maxDelay: number;
}

// Event types for terminal system
export type TerminalEventType =
  | 'terminal:output'
  | 'terminal:error'
  | 'terminal:connection'
  | 'terminal:command_start'
  | 'terminal:command_complete'
  | 'terminal:directory_change'
  | 'terminal:unknown_message';

export interface TerminalEvent {
  type: TerminalEventType;
  data: any;
  timestamp: number;
}

// Mock factory interfaces for testing
export interface MockFactory {
  createWebSocketMock(): any;
  createLoggerMock(): ILogger;
  createRetryManagerMock(): IRetryManager;
  createMessageHandlerMock(): IMessageHandler;
  createConnectionManagerMock(): IConnectionManager;
}