/**
 * TypeScript interfaces for Avi DM + Claude Code Integration
 * 
 * This file defines all the types and interfaces needed for seamless
 * communication between the agent feed frontend and Claude Code instance.
 */

// ============================================================================
// CORE CONFIGURATION INTERFACES
// ============================================================================

export interface ClaudeCodeConfig {
  baseUrl: string;
  apiKey?: string;
  timeout: number;
  retryAttempts: number;
  websocketUrl: string;
  rateLimits: {
    messagesPerMinute: number;
    tokensPerHour: number;
  };
  security: {
    enableAuth: boolean;
    allowedOrigins: string[];
    sanitizeContent: boolean;
  };
  fallback: {
    enableOfflineMode: boolean;
    cacheResponses: boolean;
    maxCacheSize: number;
  };
}

export interface RequestOptions {
  timeout?: number;
  retries?: number;
  headers?: Record<string, string>;
  signal?: AbortSignal;
}

export interface RetryConfig {
  attempts: number;
  backoffMs: number;
  exponential: boolean;
}

// ============================================================================
// CLAUDE API COMMUNICATION INTERFACES
// ============================================================================

export interface ClaudeRequest {
  id: string;
  message: string;
  context: ProjectContext;
  sessionId: string;
  timestamp: string;
  options?: {
    temperature?: number;
    maxTokens?: number;
    stream?: boolean;
    systemPrompt?: string;
  };
}

export interface ClaudeResponse {
  id: string;
  requestId: string;
  content: string;
  metadata: {
    model: string;
    tokensUsed: number;
    processingTime: number;
    suggestions?: string[];
    contextFilesUsed?: string[];
  };
  status: 'success' | 'error' | 'partial';
  error?: ClaudeCodeError;
}

export interface SendMessageOptions {
  temperature?: number;
  maxTokens?: number;
  includeContext?: boolean;
  contextFiles?: string[];
  systemPrompt?: string;
  stream?: boolean;
}

// ============================================================================
// PROJECT CONTEXT INTERFACES
// ============================================================================

export interface ProjectContext {
  projectName: string;
  projectPath: string;
  currentBranch: string;
  fileTree: FileTreeNode[];
  recentChanges: GitChange[];
  activeFiles: ActiveFile[];
  dependencies: PackageInfo[];
  environmentInfo: EnvironmentInfo;
  userPreferences: UserPreferences;
  buildInfo?: BuildInfo;
}

export interface FileTreeNode {
  name: string;
  path: string;
  type: 'file' | 'directory';
  size?: number;
  lastModified?: string;
  children?: FileTreeNode[];
  gitStatus?: 'modified' | 'added' | 'deleted' | 'untracked' | 'clean';
}

export interface FileContext {
  path: string;
  content: string;
  language: string;
  lastModified: string;
  size: number;
  encoding: string;
  lineCount?: number;
  gitStatus?: string;
  importance?: 'high' | 'medium' | 'low'; // For context prioritization
}

export interface ActiveFile {
  path: string;
  isOpen: boolean;
  cursorPosition?: {
    line: number;
    column: number;
  };
  selectedText?: {
    start: { line: number; column: number };
    end: { line: number; column: number };
    content: string;
  };
  lastAccessed: string;
}

export interface GitContext {
  currentBranch: string;
  recentCommits: GitCommit[];
  stagedChanges: GitChange[];
  unstagedChanges: GitChange[];
  remoteInfo: RemoteInfo;
  workingDirectory: string;
}

export interface GitCommit {
  hash: string;
  author: string;
  date: string;
  message: string;
  filesChanged: string[];
}

export interface GitChange {
  path: string;
  status: 'modified' | 'added' | 'deleted' | 'renamed';
  oldPath?: string; // For renamed files
  additions?: number;
  deletions?: number;
}

export interface RemoteInfo {
  name: string;
  url: string;
  branch: string;
  ahead: number;
  behind: number;
}

export interface PackageInfo {
  name: string;
  version: string;
  type: 'dependency' | 'devDependency' | 'peerDependency';
  description?: string;
}

export interface EnvironmentInfo {
  nodeVersion?: string;
  npmVersion?: string;
  operatingSystem: string;
  architecture: string;
  availableMemory: number;
  cpuCount: number;
  workspaceType?: 'local' | 'codespaces' | 'container';
}

export interface UserPreferences {
  theme: 'light' | 'dark' | 'auto';
  fontSize: number;
  indentSize: number;
  preferredLanguage: string;
  autoSave: boolean;
  showLineNumbers: boolean;
}

export interface BuildInfo {
  lastBuildTime?: string;
  buildStatus: 'success' | 'failed' | 'in-progress' | 'not-started';
  testResults?: {
    passed: number;
    failed: number;
    total: number;
  };
  lintResults?: {
    errors: number;
    warnings: number;
  };
}

// ============================================================================
// REAL-TIME COMMUNICATION INTERFACES
// ============================================================================

export interface StreamingMessage {
  type: 'chunk' | 'complete' | 'error' | 'typing' | 'status' | 'context_update';
  requestId: string;
  sessionId: string;
  content?: string;
  metadata?: {
    tokenCount?: number;
    isPartial?: boolean;
    chunkIndex?: number;
    totalChunks?: number;
  };
  error?: ClaudeCodeError;
  timestamp: string;
}

export interface WebSocketConfig {
  url: string;
  reconnectAttempts: number;
  reconnectDelay: number;
  heartbeatInterval: number;
  messageQueueSize: number;
}

export interface ConnectionStatus {
  isConnected: boolean;
  lastConnected?: string;
  lastDisconnected?: string;
  connectionQuality: 'excellent' | 'good' | 'poor' | 'offline';
  latency?: number;
  reconnectAttempts: number;
  error?: string;
}

// ============================================================================
// SESSION MANAGEMENT INTERFACES
// ============================================================================

export interface ConversationSession {
  id: string;
  projectId: string;
  projectPath: string;
  startTime: string;
  lastActivity: string;
  messageCount: number;
  context: ProjectContext;
  preferences: SessionPreferences;
  isActive: boolean;
  metadata?: {
    totalTokens?: number;
    averageResponseTime?: number;
    topicsDiscussed?: string[];
  };
}

export interface SessionPreferences {
  autoSaveInterval: number;
  maxHistoryMessages: number;
  contextSensitivity: 'high' | 'medium' | 'low';
  includeGitContext: boolean;
  includeFileTree: boolean;
  preferredResponseStyle: 'concise' | 'detailed' | 'technical';
}

export interface ConversationMessage {
  id: string;
  sessionId: string;
  role: 'user' | 'assistant' | 'system';
  content: string;
  timestamp: string;
  metadata: {
    tokenCount?: number;
    processingTime?: number;
    contextFiles?: string[];
    codeBlocks?: CodeBlock[];
    suggestions?: string[];
  };
  isEdited?: boolean;
  editHistory?: {
    originalContent: string;
    editedAt: string;
  }[];
}

export interface CodeBlock {
  language: string;
  code: string;
  filename?: string;
  startLine?: number;
  endLine?: number;
  explanation?: string;
}

// ============================================================================
// ERROR HANDLING INTERFACES
// ============================================================================

export interface ClaudeCodeError {
  code: string;
  message: string;
  details?: any;
  recoverable: boolean;
  timestamp: string;
  context?: {
    requestId?: string;
    sessionId?: string;
    endpoint?: string;
    projectPath?: string;
  };
  suggestedAction?: string;
}

export interface ErrorContext {
  operation: string;
  requestId?: string;
  sessionId?: string;
  projectPath?: string;
  userAction?: string;
  metadata?: Record<string, any>;
}

export interface ErrorMetrics {
  totalErrors: number;
  errorsByType: Record<string, number>;
  errorRate: number;
  averageRecoveryTime: number;
  lastError?: ClaudeCodeError;
}

export interface FallbackResponse {
  content: string;
  isFallback: boolean;
  reason: 'offline' | 'timeout' | 'rate_limit' | 'error';
  suggestions: string[];
}

// ============================================================================
// STORAGE AND PERSISTENCE INTERFACES
// ============================================================================

export interface SessionStorage {
  saveSession(session: ConversationSession): Promise<void>;
  loadSession(sessionId: string): Promise<ConversationSession | null>;
  deleteSession(sessionId: string): Promise<void>;
  listSessions(projectId?: string): Promise<ConversationSession[]>;
  cleanupExpiredSessions(maxAge: number): Promise<number>;
}

export interface ResponseCache {
  get(key: string): Promise<ClaudeResponse | null>;
  set(key: string, response: ClaudeResponse, ttl?: number): Promise<void>;
  delete(key: string): Promise<void>;
  clear(): Promise<void>;
  size(): Promise<number>;
}

// ============================================================================
// COMPONENT PROPS INTERFACES
// ============================================================================

export interface AviDMProps {
  projectPath?: string;
  initialContext?: ProjectContext;
  config?: Partial<ClaudeCodeConfig>;
  onSessionStart?: (sessionId: string) => void;
  onSessionEnd?: (sessionId: string) => void;
  onMessage?: (message: ConversationMessage) => void;
  onError?: (error: ClaudeCodeError) => void;
  onConnectionChange?: (status: ConnectionStatus) => void;
  theme?: 'light' | 'dark' | 'auto';
  position?: 'sidebar' | 'modal' | 'inline' | 'floating';
  height?: string | number;
  width?: string | number;
  resizable?: boolean;
  minimizable?: boolean;
  className?: string;
  style?: React.CSSProperties;
}

export interface ChatMessageProps {
  message: ConversationMessage;
  isStreaming?: boolean;
  onEdit?: (messageId: string, newContent: string) => void;
  onDelete?: (messageId: string) => void;
  onCopy?: (content: string) => void;
  onCodeExecute?: (code: string, language: string) => void;
  theme?: 'light' | 'dark';
}

export interface ContextPanelProps {
  context: ProjectContext;
  onContextUpdate?: (context: ProjectContext) => void;
  onFileSelect?: (file: FileContext) => void;
  collapsible?: boolean;
  maxHeight?: number;
}

// ============================================================================
// SYSTEM STATUS INTERFACES
// ============================================================================

export interface SystemStatus {
  claudeCode: {
    isRunning: boolean;
    version?: string;
    uptime?: number;
    memoryUsage?: number;
    cpuUsage?: number;
  };
  api: {
    isHealthy: boolean;
    responseTime?: number;
    requestsPerMinute?: number;
    errorRate?: number;
  };
  websocket: {
    isConnected: boolean;
    connectionQuality: 'excellent' | 'good' | 'poor';
    messagesPerSecond?: number;
  };
  project: {
    isValid: boolean;
    fileCount: number;
    lastModified?: string;
    buildStatus?: 'success' | 'failed' | 'building';
  };
}

export interface HealthCheckResponse {
  status: 'healthy' | 'degraded' | 'down';
  timestamp: string;
  checks: {
    database?: boolean;
    filesystem?: boolean;
    network?: boolean;
    claude?: boolean;
  };
  metrics: {
    responseTime: number;
    memoryUsage: number;
    activeConnections: number;
  };
}

// ============================================================================
// UTILITY TYPES
// ============================================================================

export type EventCallback<T = any> = (data: T) => void;
export type AsyncEventCallback<T = any> = (data: T) => Promise<void>;

export interface EventEmitter {
  on<T>(event: string, callback: EventCallback<T>): void;
  off<T>(event: string, callback: EventCallback<T>): void;
  emit<T>(event: string, data: T): void;
  once<T>(event: string, callback: EventCallback<T>): void;
  removeAllListeners(event?: string): void;
}

export interface Disposable {
  dispose(): void;
}

export interface AsyncDisposable {
  dispose(): Promise<void>;
}

// ============================================================================
// API ENDPOINT TYPES
// ============================================================================

export interface ClaudeCodeAPI {
  // Chat endpoints
  'POST /api/chat/message': {
    request: ClaudeRequest;
    response: ClaudeResponse;
  };
  'POST /api/chat/stream': {
    request: ClaudeRequest;
    response: ReadableStream<Uint8Array>;
  };
  'GET /api/chat/history/:sessionId': {
    params: { sessionId: string };
    query?: { limit?: number; offset?: number };
    response: ConversationMessage[];
  };
  
  // Context endpoints
  'POST /api/context/update': {
    request: { sessionId: string; context: ProjectContext };
    response: { success: boolean };
  };
  'POST /api/context/files': {
    request: { sessionId: string; files: FileContext[] };
    response: { success: boolean; processed: number };
  };
  
  // Session endpoints
  'POST /api/sessions': {
    request: { projectId: string; projectPath: string; context?: ProjectContext };
    response: { sessionId: string };
  };
  'DELETE /api/sessions/:sessionId': {
    params: { sessionId: string };
    response: { success: boolean };
  };
  'GET /api/sessions/:sessionId': {
    params: { sessionId: string };
    response: ConversationSession;
  };
  
  // Health endpoints
  'GET /api/health': {
    response: HealthCheckResponse;
  };
  'GET /api/status': {
    response: SystemStatus;
  };
}

// ============================================================================
// EXPORT ALL
// ============================================================================

export default ClaudeCodeConfig;
