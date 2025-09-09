# Avi DM + Claude Code Integration Architecture

## Overview

This document outlines the technical architecture for integrating Avi DM (Conversational Agent Interface) with Claude Code using HTTP API Integration (Option 1). The architecture provides seamless communication between the agent feed frontend and Claude Code's local instance.

## System Architecture

```
┌─────────────────────────────────────────────────────────────┐
│                    Agent Feed Frontend                      │
│  ┌─────────────────┐    ┌─────────────────┐                │
│  │   Avi DM UI     │    │  Context Bridge │                │
│  │   Component     │◄───┤    Manager      │                │
│  └─────────────────┘    └─────────────────┘                │
│           │                       │                        │
│           ▼                       ▼                        │
│  ┌─────────────────────────────────────────────────────────│
│  │            AviDMService (API Layer)                    │
│  └─────────────────────────────────────────────────────────│
│           │                       │                        │
│           ▼                       ▼                        │
│  ┌─────────────────┐    ┌─────────────────┐                │
│  │   HTTP Client   │    │  WebSocket/SSE  │                │
│  │    Manager      │    │   Connection    │                │
│  └─────────────────┘    └─────────────────┘                │
└─────────────────────────────────────────────────────────────┘
           │                       │                        
           ▼                       ▼                        
┌─────────────────────────────────────────────────────────────┐
│                   Claude Code Instance                      │
│  ┌─────────────────┐    ┌─────────────────┐                │
│  │   HTTP Server   │    │  WebSocket/SSE  │                │
│  │     API         │    │     Server      │                │
│  └─────────────────┘    └─────────────────┘                │
│  ┌─────────────────────────────────────────────────────────│
│  │              Claude Code Engine                        │
│  └─────────────────────────────────────────────────────────│
└─────────────────────────────────────────────────────────────┘
```

## 1. API Service Layer

### AviDMService Class

Core service class responsible for all Claude Code communication:

```typescript
interface ClaudeCodeConfig {
  baseUrl: string;
  apiKey?: string;
  timeout: number;
  retryAttempts: number;
  websocketUrl: string;
}

interface ClaudeRequest {
  id: string;
  message: string;
  context: ProjectContext;
  sessionId: string;
  timestamp: string;
  options?: {
    temperature?: number;
    maxTokens?: number;
    stream?: boolean;
  };
}

interface ClaudeResponse {
  id: string;
  requestId: string;
  content: string;
  metadata: {
    model: string;
    tokensUsed: number;
    processingTime: number;
    suggestions?: string[];
  };
  status: 'success' | 'error' | 'partial';
  error?: string;
}

class AviDMService {
  private config: ClaudeCodeConfig;
  private httpClient: HttpClient;
  private websocket: WebSocketManager;
  private contextManager: ContextManager;
  private sessionManager: SessionManager;
  private errorHandler: ErrorHandler;
  
  constructor(config: ClaudeCodeConfig);
  
  // Core API Methods
  async sendMessage(message: string, options?: SendMessageOptions): Promise<ClaudeResponse>;
  async sendMessageStream(message: string, onChunk: (chunk: string) => void): Promise<void>;
  async getConversationHistory(sessionId: string): Promise<ConversationMessage[]>;
  
  // Context Management
  async updateProjectContext(context: ProjectContext): Promise<void>;
  async injectFileContext(files: FileContext[]): Promise<void>;
  async injectGitContext(gitInfo: GitContext): Promise<void>;
  
  // Connection Management
  async checkConnection(): Promise<ConnectionStatus>;
  async reconnect(): Promise<void>;
  
  // Session Management
  createSession(projectId: string): Promise<string>;
  async endSession(sessionId: string): Promise<void>;
}
```

### HTTP Client Manager

```typescript
class HttpClient {
  private baseUrl: string;
  private defaultHeaders: Record<string, string>;
  private retryConfig: RetryConfig;
  
  async get<T>(endpoint: string, options?: RequestOptions): Promise<T>;
  async post<T>(endpoint: string, data: any, options?: RequestOptions): Promise<T>;
  async put<T>(endpoint: string, data: any, options?: RequestOptions): Promise<T>;
  async delete<T>(endpoint: string, options?: RequestOptions): Promise<T>;
  
  private async retry<T>(operation: () => Promise<T>, attempts: number): Promise<T>;
  private handleError(error: any): ClaudeCodeError;
}
```

## 2. Context Bridge System

### Project Context Interface

```typescript
interface ProjectContext {
  projectName: string;
  projectPath: string;
  currentBranch: string;
  fileTree: FileTreeNode[];
  recentChanges: GitChange[];
  activeFiles: ActiveFile[];
  dependencies: PackageInfo[];
  environmentInfo: EnvironmentInfo;
  userPreferences: UserPreferences;
}

interface FileContext {
  path: string;
  content: string;
  language: string;
  lastModified: string;
  size: number;
  encoding: string;
}

interface GitContext {
  currentBranch: string;
  recentCommits: GitCommit[];
  stagedChanges: GitChange[];
  unstagedChanges: GitChange[];
  remoteInfo: RemoteInfo;
}
```

### Context Manager

```typescript
class ContextManager {
  private projectContext: ProjectContext;
  private fileWatcher: FileWatcher;
  private gitWatcher: GitWatcher;
  
  async initializeContext(projectPath: string): Promise<ProjectContext>;
  async updateFileContext(filePath: string): Promise<void>;
  async getRelevantFiles(query: string): Promise<FileContext[]>;
  async serializeContext(): Promise<string>;
  
  // Event-driven updates
  onFileChange(callback: (file: FileContext) => void): void;
  onGitChange(callback: (gitInfo: GitContext) => void): void;
}
```

## 3. Real-time Communication

### WebSocket/SSE Manager

```typescript
interface StreamingMessage {
  type: 'chunk' | 'complete' | 'error' | 'typing' | 'status';
  requestId: string;
  content?: string;
  metadata?: any;
  error?: string;
}

class WebSocketManager {
  private connection: WebSocket | null = null;
  private reconnectAttempts: number = 0;
  private heartbeatInterval: number;
  private messageHandlers: Map<string, (message: StreamingMessage) => void>;
  
  async connect(url: string): Promise<void>;
  async disconnect(): Promise<void>;
  
  // Message handling
  send(message: any): void;
  onMessage(handler: (message: StreamingMessage) => void): void;
  
  // Connection management
  onConnect(handler: () => void): void;
  onDisconnect(handler: (reason: string) => void): void;
  onError(handler: (error: Error) => void): void;
  
  // Auto-reconnection
  private async attemptReconnection(): Promise<void>;
  private startHeartbeat(): void;
  private stopHeartbeat(): void;
}

class SSEManager {
  private eventSource: EventSource | null = null;
  private url: string;
  
  async connect(url: string): Promise<void>;
  async disconnect(): Promise<void>;
  
  onMessage(type: string, handler: (data: any) => void): void;
  onError(handler: (error: Event) => void): void;
}
```

## 4. Session Management

### Session Manager

```typescript
interface ConversationSession {
  id: string;
  projectId: string;
  startTime: string;
  lastActivity: string;
  messageCount: number;
  context: ProjectContext;
  preferences: SessionPreferences;
}

interface ConversationMessage {
  id: string;
  sessionId: string;
  role: 'user' | 'assistant';
  content: string;
  timestamp: string;
  metadata: {
    tokenCount?: number;
    processingTime?: number;
    contextFiles?: string[];
  };
}

class SessionManager {
  private activeSessions: Map<string, ConversationSession>;
  private storage: SessionStorage;
  
  async createSession(projectId: string, context: ProjectContext): Promise<string>;
  async getSession(sessionId: string): Promise<ConversationSession | null>;
  async updateSession(sessionId: string, updates: Partial<ConversationSession>): Promise<void>;
  async endSession(sessionId: string): Promise<void>;
  
  // Message management
  async addMessage(sessionId: string, message: ConversationMessage): Promise<void>;
  async getMessages(sessionId: string, limit?: number): Promise<ConversationMessage[]>;
  
  // Persistence
  async saveSession(sessionId: string): Promise<void>;
  async loadSession(sessionId: string): Promise<ConversationSession | null>;
  
  // Cleanup
  async cleanupExpiredSessions(): Promise<void>;
}
```

## 5. Error Handling & Fallbacks

### Error Handler

```typescript
interface ClaudeCodeError {
  code: string;
  message: string;
  details?: any;
  recoverable: boolean;
  timestamp: string;
}

class ErrorHandler {
  private fallbackResponses: Map<string, string>;
  private errorMetrics: ErrorMetrics;
  
  handleError(error: any, context: ErrorContext): ClaudeCodeError;
  getFallbackResponse(messageType: string): string;
  
  // Connection issues
  handleConnectionError(error: Error): Promise<void>;
  handleTimeoutError(requestId: string): Promise<void>;
  
  // Graceful degradation
  async enableOfflineMode(): Promise<void>;
  async disableOfflineMode(): Promise<void>;
  
  // Error reporting
  reportError(error: ClaudeCodeError): void;
  getErrorStats(): ErrorMetrics;
}
```

### Fallback System

```typescript
class FallbackSystem {
  private offlineResponses: OfflineResponseGenerator;
  private cachedResponses: ResponseCache;
  
  async generateFallbackResponse(query: string, context: ProjectContext): Promise<string>;
  async getCachedResponse(query: string): Promise<string | null>;
  
  // Offline capabilities
  async enableOfflineMode(): Promise<void>;
  isOfflineModeActive(): boolean;
  
  // Smart fallbacks
  generateContextualResponse(query: string, files: FileContext[]): string;
  generateHelpResponse(topic: string): string;
}
```

## 6. Security Architecture

### Security Manager

```typescript
class SecurityManager {
  private apiKeyManager: ApiKeyManager;
  private rateLimiter: RateLimiter;
  private sanitizer: ContextSanitizer;
  
  // Authentication
  async authenticateRequest(request: ClaudeRequest): Promise<boolean>;
  generateSessionToken(sessionId: string): string;
  validateToken(token: string): boolean;
  
  // Data sanitization
  sanitizeContext(context: ProjectContext): ProjectContext;
  sanitizeFileContent(content: string): string;
  
  // Rate limiting
  async checkRateLimit(sessionId: string): Promise<boolean>;
  recordRequest(sessionId: string): void;
  
  // Local network security
  validateLocalConnection(origin: string): boolean;
  enableCORS(origins: string[]): void;
}
```

## 7. Component Integration

### Avi DM React Component

```typescript
interface AviDMProps {
  projectPath?: string;
  initialContext?: ProjectContext;
  onSessionStart?: (sessionId: string) => void;
  onSessionEnd?: (sessionId: string) => void;
  theme?: 'light' | 'dark' | 'auto';
  position?: 'sidebar' | 'modal' | 'inline';
}

const AviDM: React.FC<AviDMProps> = ({
  projectPath,
  initialContext,
  onSessionStart,
  onSessionEnd,
  theme = 'auto',
  position = 'sidebar'
}) => {
  const [isConnected, setIsConnected] = useState(false);
  const [currentSession, setCurrentSession] = useState<string | null>(null);
  const [messages, setMessages] = useState<ConversationMessage[]>([]);
  const [isTyping, setIsTyping] = useState(false);
  
  const aviDMService = useRef<AviDMService | null>(null);
  
  // Component implementation
};
```

## 8. API Endpoints

### Claude Code HTTP API

```typescript
// Core endpoints that Claude Code should expose
interface ClaudeCodeAPI {
  // Chat endpoints
  'POST /api/chat/message': (request: ClaudeRequest) => Promise<ClaudeResponse>;
  'POST /api/chat/stream': (request: ClaudeRequest) => Promise<ReadableStream>;
  'GET /api/chat/history/:sessionId': () => Promise<ConversationMessage[]>;
  
  // Context endpoints
  'POST /api/context/update': (context: ProjectContext) => Promise<void>;
  'POST /api/context/files': (files: FileContext[]) => Promise<void>;
  
  // Session endpoints
  'POST /api/sessions': (projectId: string) => Promise<{ sessionId: string }>;
  'DELETE /api/sessions/:sessionId': () => Promise<void>;
  'GET /api/sessions/:sessionId': () => Promise<ConversationSession>;
  
  // Health endpoints
  'GET /api/health': () => Promise<{ status: 'healthy' | 'degraded' | 'down' }>;
  'GET /api/status': () => Promise<SystemStatus>;
}
```

## 9. Implementation Phases

### Phase 1: Core Infrastructure
- Implement AviDMService class
- Create HTTP Client Manager
- Set up basic error handling
- Implement connection management

### Phase 2: Context Integration
- Build Context Manager
- Implement file watching
- Create git integration
- Add project context serialization

### Phase 3: Real-time Communication
- Implement WebSocket Manager
- Add SSE fallback support
- Create streaming message handling
- Add typing indicators

### Phase 4: Session Management
- Build Session Manager
- Implement message persistence
- Add conversation history
- Create session cleanup

### Phase 5: Security & Polish
- Implement security measures
- Add rate limiting
- Create fallback system
- Add comprehensive error handling

### Phase 6: UI Integration
- Build React components
- Add theme support
- Implement responsive design
- Add accessibility features

## 10. Configuration

### Default Configuration

```typescript
const defaultConfig: ClaudeCodeConfig = {
  baseUrl: 'http://localhost:8080/api',
  timeout: 30000,
  retryAttempts: 3,
  websocketUrl: 'ws://localhost:8080/ws',
  rateLimits: {
    messagesPerMinute: 30,
    tokensPerHour: 50000
  },
  security: {
    enableAuth: false,
    allowedOrigins: ['localhost:5173', 'localhost:3000'],
    sanitizeContent: true
  },
  fallback: {
    enableOfflineMode: true,
    cacheResponses: true,
    maxCacheSize: 100
  }
};
```

## 11. Performance Considerations

- **Connection Pooling**: Reuse HTTP connections
- **Request Debouncing**: Prevent rapid-fire requests
- **Context Optimization**: Send only relevant context
- **Caching Strategy**: Cache frequent responses
- **Lazy Loading**: Load components on demand
- **Memory Management**: Clean up unused sessions

## 12. Testing Strategy

- **Unit Tests**: Test individual components
- **Integration Tests**: Test API communication
- **E2E Tests**: Test full user workflows
- **Performance Tests**: Load and stress testing
- **Security Tests**: Vulnerability testing
- **Offline Tests**: Test fallback behavior

## 13. Monitoring & Metrics

- **Connection Health**: Monitor API availability
- **Response Times**: Track performance metrics
- **Error Rates**: Monitor failure patterns
- **Usage Analytics**: Track feature usage
- **Resource Usage**: Monitor memory/CPU

This architecture provides a robust, scalable, and maintainable solution for integrating Avi DM with Claude Code while maintaining excellent user experience and system reliability.