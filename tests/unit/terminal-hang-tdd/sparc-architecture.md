# SPARC ARCHITECTURE PHASE: System Design and Component Architecture

## System Overview

### High-Level Architecture Diagram
```
┌─────────────────────────────────────────────────────────────────┐
│                        Frontend Layer                           │
├─────────────────────────────────────────────────────────────────┤
│  ┌─────────────────┐  ┌─────────────────┐  ┌─────────────────┐  │
│  │   Claude UI     │  │   4-Button      │  │   System        │  │
│  │   Component     │  │   Launcher      │  │   Terminal      │  │
│  │                 │  │                 │  │   (Debug)       │  │
│  └─────────────────┘  └─────────────────┘  └─────────────────┘  │
│           │                     │                     │         │
├───────────┼─────────────────────┼─────────────────────┼─────────┤
│           │                     │                     │         │
│  ┌─────────────────┐  ┌─────────────────┐  ┌─────────────────┐  │
│  │   WebSocket     │  │   HTTP API      │  │   Debug         │  │
│  │   Client        │  │   Client        │  │   WebSocket     │  │
│  └─────────────────┘  └─────────────────┘  └─────────────────┘  │
└─────────────────────────────────────────────────────────────────┘
                            │
                            │ HTTP/WebSocket
                            │
┌─────────────────────────────────────────────────────────────────┐
│                        Backend Layer                            │
├─────────────────────────────────────────────────────────────────┤
│  ┌─────────────────┐  ┌─────────────────┐  ┌─────────────────┐  │
│  │   API Gateway   │  │   Process       │  │   WebSocket     │  │
│  │   (Express)     │  │   Manager       │  │   Server        │  │
│  │                 │  │                 │  │                 │  │
│  └─────────────────┘  └─────────────────┘  └─────────────────┘  │
│           │                     │                     │         │
├───────────┼─────────────────────┼─────────────────────┼─────────┤
│           │                     │                     │         │
│  ┌─────────────────┐  ┌─────────────────┐  ┌─────────────────┐  │
│  │   Session       │  │   Health        │  │   Log           │  │
│  │   Manager       │  │   Monitor       │  │   Manager       │  │
│  └─────────────────┘  └─────────────────┘  └─────────────────┘  │
└─────────────────────────────────────────────────────────────────┘
                            │
                            │ Process Control
                            │
┌─────────────────────────────────────────────────────────────────┐
│                    Claude Process Layer                         │
├─────────────────────────────────────────────────────────────────┤
│  ┌─────────────────┐  ┌─────────────────┐  ┌─────────────────┐  │
│  │   Claude        │  │   Claude        │  │   Claude        │  │
│  │   Instance 1    │  │   Instance 2    │  │   Instance N    │  │
│  │   (standard)    │  │   (skip-perms)  │  │   (resume)      │  │
│  └─────────────────┘  └─────────────────┘  └─────────────────┘  │
└─────────────────────────────────────────────────────────────────┘
```

## Component Architecture

### 1. Frontend Components

#### ClaudeInterface Component
```typescript
interface ClaudeInterfaceProps {
  processId?: string;
  initialCommand?: string;
  onProcessStart?: (processId: string) => void;
  onProcessStop?: () => void;
}

interface ClaudeInterfaceState {
  status: ProcessStatus;
  output: OutputLine[];
  commandHistory: string[];
  currentCommand: string;
  isLoading: boolean;
  error?: string;
}

class ClaudeInterface extends React.Component<Props, State> {
  private wsClient: WebSocketClient;
  private apiClient: HttpApiClient;
  
  // Component lifecycle methods
  // WebSocket event handlers
  // Command execution methods
  // Output rendering methods
}
```

#### 4-Button Launcher Integration
```typescript
interface LauncherButtonConfig {
  id: string;
  label: string;
  command: string;
  variant: 'primary' | 'warning' | 'info' | 'secondary';
  tooltip: string;
}

const LAUNCHER_CONFIGS: LauncherButtonConfig[] = [
  {
    id: 'standard',
    label: 'claude',
    command: 'cd prod && claude',
    variant: 'primary',
    tooltip: 'Launch Claude in prod directory'
  },
  {
    id: 'skip-perms',
    label: 'skip-permissions', 
    command: 'cd prod && claude --dangerously-skip-permissions',
    variant: 'warning',
    tooltip: 'Launch with permissions skipped'
  },
  // ... additional configs
];
```

### 2. Backend Components

#### API Gateway (Express.js)
```typescript
interface ApiRoutes {
  'POST /api/claude/launch': LaunchRequest => LaunchResponse;
  'POST /api/claude/stop/:processId': {} => StopResponse;
  'GET /api/claude/status/:processId': {} => StatusResponse;
  'GET /api/claude/processes': {} => ProcessListResponse;
  'DELETE /api/claude/process/:processId': {} => CleanupResponse;
}

class ApiGateway {
  private processManager: ProcessManager;
  private sessionManager: SessionManager;
  private wsServer: WebSocketServer;
  
  setupRoutes(): void;
  handleLaunchRequest(req: Request, res: Response): Promise<void>;
  handleStopRequest(req: Request, res: Response): Promise<void>;
  validateRequest(req: Request): ValidationResult;
}
```

#### Process Manager
```typescript
interface ProcessInfo {
  id: string;
  pid: number;
  command: string;
  workingDirectory: string;
  status: 'starting' | 'running' | 'stopping' | 'stopped' | 'failed';
  startTime: Date;
  lastActivity: Date;
  exitCode?: number;
  error?: string;
}

class ProcessManager {
  private processes: Map<string, ProcessInfo>;
  private childProcesses: Map<string, ChildProcess>;
  
  async spawnProcess(config: ProcessConfig): Promise<string>;
  async terminateProcess(processId: string): Promise<void>;
  getProcessStatus(processId: string): ProcessInfo | null;
  listActiveProcesses(): ProcessInfo[];
  cleanupTerminatedProcesses(): void;
  
  private setupProcessHandlers(process: ChildProcess, processId: string): void;
  private handleProcessOutput(processId: string, data: Buffer): void;
  private handleProcessExit(processId: string, code: number, signal: string): void;
}
```

#### WebSocket Server
```typescript
interface WebSocketMessage {
  type: 'command' | 'input' | 'subscribe' | 'unsubscribe';
  processId?: string;
  data?: any;
  timestamp: number;
}

interface WebSocketResponse {
  type: 'output' | 'error' | 'status' | 'process_exit';
  processId: string;
  data: any;
  timestamp: number;
}

class WebSocketServer {
  private server: ws.WebSocketServer;
  private clients: Map<string, WebSocket>;
  private subscriptions: Map<string, Set<string>>; // processId -> clientIds
  
  initialize(httpServer: http.Server): void;
  handleConnection(socket: WebSocket): void;
  handleMessage(clientId: string, message: WebSocketMessage): void;
  broadcastToProcess(processId: string, data: WebSocketResponse): void;
  subscribeClient(clientId: string, processId: string): void;
}
```

### 3. Data Layer

#### Session Manager
```typescript
interface Session {
  id: string;
  processId?: string;
  userId?: string;
  createdAt: Date;
  lastActivity: Date;
  commandHistory: CommandHistoryEntry[];
  workingDirectory: string;
}

interface CommandHistoryEntry {
  command: string;
  timestamp: Date;
  exitCode?: number;
  duration?: number;
}

class SessionManager {
  private sessions: Map<string, Session>;
  
  createSession(): Session;
  getSession(sessionId: string): Session | null;
  updateSessionActivity(sessionId: string): void;
  addCommandToHistory(sessionId: string, entry: CommandHistoryEntry): void;
  cleanupExpiredSessions(): void;
}
```

#### Health Monitor
```typescript
interface HealthMetrics {
  processId: string;
  cpuUsage: number;
  memoryUsage: number;
  lastHeartbeat: Date;
  responseTime: number;
  isHealthy: boolean;
}

class HealthMonitor {
  private metrics: Map<string, HealthMetrics>;
  private monitoringInterval: NodeJS.Timeout;
  
  startMonitoring(): void;
  stopMonitoring(): void;
  checkProcessHealth(processId: string): Promise<HealthMetrics>;
  handleUnhealthyProcess(processId: string): Promise<void>;
  getHealthReport(): HealthMetrics[];
}
```

## Integration Contracts

### Frontend-Backend API Contract
```typescript
// HTTP API Contracts
interface LaunchRequest {
  command: string;
  workingDirectory: string;
  sessionId?: string;
}

interface LaunchResponse {
  success: boolean;
  processId?: string;
  sessionId: string;
  error?: string;
}

interface StatusResponse {
  success: boolean;
  process?: ProcessInfo;
  error?: string;
}

// WebSocket Message Contracts
interface CommandMessage {
  type: 'command';
  processId: string;
  command: string;
}

interface OutputMessage {
  type: 'output';
  processId: string;
  data: string;
  stream: 'stdout' | 'stderr';
}
```

### Process Lifecycle Events
```typescript
interface ProcessEvents {
  'process:starting': (processId: string) => void;
  'process:ready': (processId: string, pid: number) => void;
  'process:output': (processId: string, data: string, stream: 'stdout' | 'stderr') => void;
  'process:error': (processId: string, error: Error) => void;
  'process:exit': (processId: string, code: number, signal?: string) => void;
}
```

## Security Architecture

### Authentication & Authorization
```typescript
interface SecurityConfig {
  enableAuthentication: boolean;
  allowedOrigins: string[];
  rateLimit: {
    windowMs: number;
    maxRequests: number;
  };
  processLimits: {
    maxConcurrentProcesses: number;
    maxProcessLifetime: number;
  };
}

class SecurityManager {
  validateOrigin(origin: string): boolean;
  enforceRateLimit(clientId: string): boolean;
  checkProcessLimits(sessionId: string): boolean;
  sanitizeCommand(command: string): string;
}
```

### Process Security
- Isolated process execution environment
- Command sanitization and validation
- Resource limits (CPU, memory, file descriptors)
- Working directory restrictions
- Environment variable control

## Deployment Architecture

### Development Environment
```yaml
services:
  frontend:
    build: ./frontend
    ports: ["3000:3000"]
    environment:
      - VITE_API_BASE_URL=http://localhost:3001
      - VITE_WS_URL=ws://localhost:3001

  backend:
    build: ./backend
    ports: ["3001:3001"]
    environment:
      - NODE_ENV=development
      - PORT=3001
      - MAX_PROCESSES=10
    volumes:
      - ./prod:/app/prod

  debug-terminal:
    build: ./backend-terminal
    ports: ["3002:3002"]
    environment:
      - NODE_ENV=development
      - DEBUG=true
```

### Production Architecture
```yaml
# Production docker-compose.yml
services:
  nginx:
    image: nginx:alpine
    ports: ["80:80", "443:443"]
    volumes:
      - ./nginx.conf:/etc/nginx/nginx.conf
      - ./ssl:/etc/ssl/certs

  claude-api:
    build: 
      context: ./backend
      target: production
    environment:
      - NODE_ENV=production
      - MAX_PROCESSES=50
      - LOG_LEVEL=info
    deploy:
      replicas: 2
      resources:
        limits:
          memory: 1GB
          cpus: '0.5'

  claude-ui:
    build:
      context: ./frontend
      target: production
    environment:
      - NODE_ENV=production
```

## Scalability Considerations

### Horizontal Scaling
- Multiple backend instances behind load balancer
- Session affinity for WebSocket connections
- Shared process registry (Redis/Database)
- Distributed health monitoring

### Performance Optimization
- Connection pooling for WebSocket clients
- Output streaming with backpressure handling
- Process resource monitoring and throttling
- Cached responses for status endpoints

### Monitoring and Observability
- Application metrics (response times, error rates)
- Process metrics (CPU, memory, file descriptors)
- Business metrics (active processes, command throughput)
- Distributed tracing for request flows

## Data Flow Architecture

### Command Execution Flow
1. User clicks launch button → HTTP POST /api/claude/launch
2. Backend spawns Claude process → Returns processId
3. Frontend subscribes to WebSocket updates
4. Process outputs stream via WebSocket → Real-time UI updates
5. User sends commands via WebSocket → Process stdin
6. Process completion → Cleanup and session update

### Error Handling Flow
1. Process error detected → Health monitor triggers
2. Error classification → Recovery strategy selection
3. Automated recovery attempt OR manual intervention alert
4. UI notification → User feedback and options
5. Fallback mechanisms → Graceful degradation

This architecture provides a robust, scalable foundation for the dedicated Claude instance system while maintaining clean separation of concerns and enabling comprehensive testing.