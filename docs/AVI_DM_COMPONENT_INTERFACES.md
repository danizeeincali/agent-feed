# Avi DM Component Interfaces & Integration Specifications

**Document Version**: 1.0
**Date**: September 13, 2025
**Status**: Interface Specifications Complete
**Author**: System Architecture Designer

---

## 1. Core Component Interfaces

### 1.1 AviDirectChat Component Interface

```typescript
// /frontend/src/components/avi/AviDirectChat.tsx
interface AviDirectChatProps {
  // Required props
  userId: string;

  // Optional configuration
  className?: string;
  isMobile?: boolean;
  initialMessage?: string;

  // Event handlers
  onMessageSent?: (message: AviMessage) => void;
  onInstanceStatusChange?: (status: AviInstanceStatus) => void;
  onError?: (error: AviError) => void;

  // Feature flags
  enableFileUploads?: boolean;
  enableVoiceInput?: boolean;
  enableScheduledTasks?: boolean;
}

interface AviDirectChatState {
  // Connection state
  instanceId: string | null;
  connectionStatus: 'disconnected' | 'connecting' | 'connected' | 'error';

  // Conversation state
  messages: AviMessage[];
  isTyping: boolean;
  typingEstimate?: number;

  // UI state
  inputMessage: string;
  isSubmitting: boolean;
  showQuickActions: boolean;

  // Error state
  error: AviError | null;
  lastErrorTimestamp?: Date;
}

class AviDirectChat extends React.Component<AviDirectChatProps, AviDirectChatState> {
  private aviConnection: AviConnection | null = null;
  private websocket: AviWebSocketClient | null = null;

  // Lifecycle methods
  componentDidMount(): Promise<void>;
  componentWillUnmount(): Promise<void>;

  // Connection management
  private async initializeAviConnection(): Promise<void>;
  private async handleConnectionLost(): Promise<void>;
  private async attemptReconnection(): Promise<void>;

  // Message handling
  private async sendMessage(content: string): Promise<void>;
  private handleAviResponse(response: AviMessage): void;
  private handleTypingIndicator(isTyping: boolean): void;

  // UI event handlers
  private handleInputChange(value: string): void;
  private handleSubmit(event: React.FormEvent): Promise<void>;
  private handleKeyPress(event: React.KeyboardEvent): void;

  // Quick actions
  private getQuickActions(): QuickAction[];
  private handleQuickAction(action: QuickAction): Promise<void>;

  render(): React.ReactElement;
}
```

### 1.2 AviChatInterface Component Interface

```typescript
// /frontend/src/components/avi/AviChatInterface.tsx
interface AviChatInterfaceProps extends EnhancedChatInterfaceProps {
  // Avi-specific props
  aviPersonality: AviPersonalityConfig;
  enableAutonomousFeatures?: boolean;
  contextRetention?: boolean;

  // Extended event handlers
  onAgentInvocation?: (agentRequest: AgentInvocationRequest) => void;
  onScheduledTaskCreate?: (task: ScheduledTask) => void;
  onFeedMonitorSetup?: (config: FeedMonitorConfig) => void;
}

interface AviPersonalityConfig {
  traits: {
    helpfulness: 0.1 | 0.2 | 0.3 | 0.4 | 0.5 | 0.6 | 0.7 | 0.8 | 0.9 | 1.0;
    proactivity: 0.1 | 0.2 | 0.3 | 0.4 | 0.5 | 0.6 | 0.7 | 0.8 | 0.9 | 1.0;
    technicalDepth: 0.1 | 0.2 | 0.3 | 0.4 | 0.5 | 0.6 | 0.7 | 0.8 | 0.9 | 1.0;
  };
  communicationStyle: 'concise' | 'detailed' | 'adaptive';
  agentInvocationPreference: 'ask' | 'auto' | 'suggest';
}

class AviChatInterface extends EnhancedChatInterface {
  // Avi-specific methods
  private applyAviPersonality(message: Message): Message;
  private detectAgentInvocationNeed(content: string): AgentInvocationSuggestion | null;
  private suggestScheduledTask(content: string): ScheduledTaskSuggestion | null;

  // Override parent methods for Avi behavior
  protected formatMessage(message: Message): FormattedMessage;
  protected handleSpecialCommands(content: string): Promise<void>;

  // Avi-specific UI elements
  private renderAviStatusIndicator(): React.ReactElement;
  private renderQuickActions(): React.ReactElement;
  private renderScheduledTasksList(): React.ReactElement;
}
```

### 1.3 AviInstanceManager Interface

```typescript
// /src/services/avi/AviInstanceManager.ts
interface AviInstanceManager {
  // Instance lifecycle
  createUserInteractiveInstance(config: UserInstanceConfig): Promise<string>;
  createAutonomousInstance(config: AutonomousInstanceConfig): Promise<string>;
  destroyInstance(instanceId: string): Promise<void>;

  // Connection management
  getInstanceConnection(instanceId: string): Promise<AviConnection>;
  checkInstanceHealth(instanceId: string): Promise<HealthStatus>;
  restartInstance(instanceId: string): Promise<string>;

  // Autonomous operations
  scheduleTask(task: ScheduledTask): Promise<string>;
  setupFeedMonitoring(config: FeedMonitorConfig): Promise<string>;
  executeAutonomousTask(taskId: string): Promise<ExecutionResult>;

  // Coordination
  acquireResourceLock(resourceId: string, timeout?: number): Promise<boolean>;
  releaseResourceLock(resourceId: string): Promise<void>;
  resolveInstanceConflict(conflictId: string): Promise<ResolutionResult>;
}

interface UserInstanceConfig {
  userId: string;
  personalityConfig: AviPersonalityConfig;
  capabilities: InstanceCapability[];
  resourceLimits: ResourceLimits;
  workingDirectory: string;
}

interface AutonomousInstanceConfig extends UserInstanceConfig {
  triggers: AutonomousTrigger[];
  schedule?: ScheduleConfig;
  permissions: AutonomousPermissions;
}

interface AutonomousTrigger {
  type: 'schedule' | 'feed_event' | 'user_request' | 'system_event';
  conditions: TriggerCondition[];
  actions: AutonomousAction[];
}

class AviInstanceManager extends ClaudeInstanceManager {
  private aviInstances: Map<string, AviInstance> = new Map();
  private autonomousScheduler: AutonomousScheduler;
  private conflictResolver: ConflictResolver;

  constructor() {
    super();
    this.autonomousScheduler = new AutonomousScheduler(this);
    this.conflictResolver = new ConflictResolver();
  }

  // Override parent methods for Avi-specific behavior
  protected generateInstanceName(config: LaunchOptions): string;
  protected setupInstancePersonality(instanceId: string, personality: AviPersonalityConfig): Promise<void>;

  // Avi-specific methods
  private async createAviSystemPrompt(personality: AviPersonalityConfig): Promise<string>;
  private async configureAutonomousCapabilities(instanceId: string, capabilities: InstanceCapability[]): Promise<void>;

  // Coordination methods
  private async handleInstanceConflict(conflict: InstanceConflict): Promise<void>;
  private async optimizeResourceAllocation(): Promise<void>;
}
```

### 1.4 AviWebSocketClient Interface

```typescript
// /frontend/src/services/avi/AviWebSocketClient.ts
interface AviWebSocketClient extends EventEmitter {
  // Connection management
  connect(instanceId: string, userId: string): Promise<void>;
  disconnect(): Promise<void>;
  reconnect(): Promise<void>;

  // Message handling
  sendMessage(message: AviMessage): Promise<void>;
  sendTypingIndicator(isTyping: boolean): Promise<void>;
  sendInstanceCommand(command: InstanceCommand): Promise<void>;

  // Event subscriptions
  onAviResponse(callback: (response: AviMessage) => void): void;
  onStatusUpdate(callback: (status: InstanceStatus) => void): void;
  onError(callback: (error: WebSocketError) => void): void;
  onReconnect(callback: () => void): void;

  // Health monitoring
  getConnectionHealth(): ConnectionHealthStatus;
  enableHeartbeat(interval?: number): void;
  disableHeartbeat(): void;
}

interface AviMessage {
  id: string;
  type: 'user_message' | 'avi_response' | 'system_notification' | 'agent_invocation';
  content: string;
  metadata: AviMessageMetadata;
  timestamp: Date;
  conversationId: string;
}

interface AviMessageMetadata {
  instanceId: string;
  userId: string;
  requiresResponse: boolean;
  priority: 'low' | 'medium' | 'high' | 'urgent';
  context?: ConversationContext;
  attachments?: MessageAttachment[];
  scheduledTaskRef?: string;
  agentInvocationSuggestion?: AgentInvocationSuggestion;
}

class AviWebSocketClient extends EventEmitter {
  private ws: WebSocket | null = null;
  private heartbeatInterval: NodeJS.Timeout | null = null;
  private reconnectAttempts: number = 0;
  private maxReconnectAttempts: number = 5;

  // Connection lifecycle
  async connect(instanceId: string, userId: string): Promise<void> {
    const wsUrl = this.buildWebSocketUrl(instanceId, userId);
    this.ws = new WebSocket(wsUrl);

    this.setupEventHandlers();
    await this.waitForConnection();
    this.startHeartbeat();
  }

  // Message handling
  async sendMessage(message: AviMessage): Promise<void> {
    this.validateMessage(message);
    const serialized = JSON.stringify(message);
    this.ws!.send(serialized);
    this.emit('messageSent', message);
  }

  // Event handling
  private setupEventHandlers(): void {
    this.ws!.onopen = () => this.handleOpen();
    this.ws!.onmessage = (event) => this.handleMessage(event);
    this.ws!.onclose = (event) => this.handleClose(event);
    this.ws!.onerror = (error) => this.handleError(error);
  }

  private handleMessage(event: MessageEvent): void {
    try {
      const message: AviMessage = JSON.parse(event.data);
      this.routeMessage(message);
    } catch (error) {
      this.emit('error', new WebSocketError('Invalid message format', error));
    }
  }

  private routeMessage(message: AviMessage): void {
    switch (message.type) {
      case 'avi_response':
        this.emit('aviResponse', message);
        break;
      case 'system_notification':
        this.emit('systemNotification', message);
        break;
      case 'agent_invocation':
        this.emit('agentInvocation', message.metadata.agentInvocationSuggestion);
        break;
      default:
        this.emit('unknownMessage', message);
    }
  }
}
```

---

## 2. State Management Interfaces

### 2.1 AviStateStore Interface

```typescript
// /frontend/src/store/avi/AviStateStore.ts
interface AviStateStore {
  // Core state slices
  personality: AviPersonalityState;
  conversation: ConversationState;
  instance: InstanceState;
  coordination: CoordinationState;
  ui: UIState;
}

interface AviPersonalityState {
  config: AviPersonalityConfig;
  traits: PersonalityTrait[];
  behaviorPatterns: BehaviorPattern[];
  contextMemory: ContextMemoryEntry[];
}

interface ConversationState {
  currentConversationId: string | null;
  conversations: Map<string, Conversation>;
  activeMessage: string;
  isTyping: boolean;
  lastActivity: Date;
}

interface InstanceState {
  currentInstanceId: string | null;
  instances: Map<string, AviInstance>;
  connectionStatus: ConnectionStatus;
  health: InstanceHealth;
  metrics: InstanceMetrics;
}

interface CoordinationState {
  scheduledTasks: ScheduledTask[];
  activeTasks: ActiveTask[];
  feedMonitors: FeedMonitor[];
  resourceLocks: ResourceLock[];
}

// Action interfaces
interface AviActions {
  // Personality actions
  updatePersonality: (config: Partial<AviPersonalityConfig>) => void;
  learnFromInteraction: (interaction: UserInteraction) => void;

  // Conversation actions
  sendMessage: (content: string, metadata?: Partial<AviMessageMetadata>) => Promise<void>;
  receiveMessage: (message: AviMessage) => void;
  startTyping: () => void;
  stopTyping: () => void;

  // Instance actions
  connectToInstance: (instanceId: string) => Promise<void>;
  updateInstanceStatus: (status: InstanceStatus) => void;
  handleInstanceError: (error: InstanceError) => void;

  // Coordination actions
  scheduleTask: (task: ScheduledTaskRequest) => Promise<string>;
  cancelTask: (taskId: string) => Promise<void>;
  setupFeedMonitor: (config: FeedMonitorConfig) => Promise<string>;
}

// State selectors
interface AviSelectors {
  // Conversation selectors
  getCurrentConversation: (state: AviStateStore) => Conversation | null;
  getMessageHistory: (state: AviStateStore, conversationId: string) => AviMessage[];
  getIsTyping: (state: AviStateStore) => boolean;

  // Instance selectors
  getCurrentInstance: (state: AviStateStore) => AviInstance | null;
  getInstanceHealth: (state: AviStateStore) => InstanceHealth;
  getConnectionStatus: (state: AviStateStore) => ConnectionStatus;

  // Coordination selectors
  getActiveScheduledTasks: (state: AviStateStore) => ScheduledTask[];
  getFeedMonitorStatus: (state: AviStateStore) => FeedMonitorStatus[];
  getResourceLockStatus: (state: AviStateStore, resourceId: string) => ResourceLock | null;
}
```

### 2.2 Context Management Interface

```typescript
// /frontend/src/context/AviContext.tsx
interface AviContextValue {
  // State
  state: AviStateStore;

  // Actions
  actions: AviActions;

  // Selectors
  selectors: AviSelectors;

  // Utilities
  utils: AviUtils;
}

interface AviUtils {
  // Message utilities
  formatMessage: (message: AviMessage) => FormattedMessage;
  validateMessage: (content: string) => ValidationResult;
  estimateResponseTime: (content: string) => number;

  // Instance utilities
  getOptimalInstance: () => Promise<string>;
  checkInstanceAvailability: (instanceId: string) => Promise<boolean>;

  // Coordination utilities
  canScheduleTask: (task: ScheduledTaskRequest) => boolean;
  estimateTaskDuration: (task: ScheduledTaskRequest) => number;
  resolveConflicts: (conflicts: Conflict[]) => Resolution[];
}

const AviContext = React.createContext<AviContextValue | null>(null);

export const AviProvider: React.FC<{children: React.ReactNode}> = ({children}) => {
  const [state, dispatch] = useReducer(aviReducer, initialAviState);
  const actions = useMemo(() => bindActionCreators(aviActions, dispatch), [dispatch]);
  const selectors = useMemo(() => bindSelectors(aviSelectors, state), [state]);
  const utils = useMemo(() => createAviUtils(state, actions), [state, actions]);

  const contextValue: AviContextValue = {
    state,
    actions,
    selectors,
    utils
  };

  return (
    <AviContext.Provider value={contextValue}>
      {children}
    </AviContext.Provider>
  );
};

export const useAvi = (): AviContextValue => {
  const context = useContext(AviContext);
  if (!context) {
    throw new Error('useAvi must be used within an AviProvider');
  }
  return context;
};
```

---

## 3. Integration Layer Interfaces

### 3.1 Posting Interface Integration

```typescript
// /frontend/src/integrations/AviPostingIntegration.ts
interface AviPostingIntegration {
  // Integration setup
  initialize(postingInterface: PostingInterface): Promise<void>;

  // UI integration
  addAviDMButton(): void;
  replaceAgentSelection(): void;
  addAviQuickActions(): void;

  // Data integration
  bridgeAviToFeed(aviMessage: AviMessage): Promise<void>;
  bridgeFeedToAvi(feedPost: FeedPost): Promise<void>;

  // Event integration
  subscribeToPostingEvents(): void;
  subscribeToAviEvents(): void;
}

interface PostingIntegrationConfig {
  // UI configuration
  showAviDMButton: boolean;
  replaceAgentSelection: boolean;
  aviButtonPosition: 'primary' | 'secondary' | 'toolbar';

  // Behavior configuration
  autoOpenAviDM: boolean;
  contextualSuggestions: boolean;
  crossPostEnabled: boolean;

  // Feature flags
  enableScheduledPosts: boolean;
  enableFeedMonitoring: boolean;
  enableAgentCoordination: boolean;
}

class AviPostingIntegration {
  private postingInterface: PostingInterface;
  private aviInstance: AviInstance;
  private eventBridge: EventBridge;

  constructor(config: PostingIntegrationConfig) {
    this.eventBridge = new EventBridge();
  }

  async initialize(postingInterface: PostingInterface): Promise<void> {
    this.postingInterface = postingInterface;
    await this.setupUIIntegration();
    await this.setupEventBridge();
    await this.connectAviInstance();
  }

  private async setupUIIntegration(): Promise<void> {
    // Replace agent selection with Avi DM button
    this.postingInterface.replaceComponent('AgentSelector', 'AviDMButton');

    // Add Avi quick actions
    this.postingInterface.addQuickAction({
      id: 'avi-schedule',
      label: 'Schedule with Avi',
      icon: 'Calendar',
      handler: this.openAviScheduler.bind(this)
    });

    // Add contextual help
    this.postingInterface.addContextualHelp({
      trigger: 'complex-post',
      suggestion: 'Ask Avi for help with this complex task',
      handler: this.suggestAviHelp.bind(this)
    });
  }

  private async setupEventBridge(): Promise<void> {
    // Bridge posting events to Avi
    this.postingInterface.onPostCreate((post) => {
      this.eventBridge.emit('post_created', post);
    });

    // Bridge Avi events to posting interface
    this.eventBridge.on('avi_suggests_post', (suggestion) => {
      this.postingInterface.showSuggestion(suggestion);
    });

    this.eventBridge.on('avi_schedules_post', (scheduledPost) => {
      this.postingInterface.schedulePost(scheduledPost);
    });
  }
}
```

### 3.2 Agent System Integration

```typescript
// /src/integrations/AviAgentIntegration.ts
interface AviAgentIntegration {
  // Agent coordination
  invokeAgent(request: AgentInvocationRequest): Promise<AgentInvocationResult>;
  coordinateAgents(coordination: AgentCoordination): Promise<CoordinationResult>;

  // Communication bridging
  bridgeAviToAgent(message: AviMessage, agentId: string): Promise<void>;
  bridgeAgentToAvi(agentResponse: AgentResponse, conversationId: string): Promise<void>;

  // Task delegation
  delegateTask(task: TaskDelegation): Promise<DelegationResult>;
  monitorTaskProgress(taskId: string): Promise<TaskProgress>;

  // System coordination
  resolveConflicts(conflicts: SystemConflict[]): Promise<ConflictResolution[]>;
  optimizeResourceAllocation(): Promise<ResourceOptimization>;
}

interface AgentInvocationRequest {
  requestId: string;
  conversationId: string;
  agentType: string;
  task: string;
  context: InvocationContext;
  priority: TaskPriority;
  deadline?: Date;
}

interface InvocationContext {
  userMessage: string;
  conversationHistory: AviMessage[];
  projectContext: ProjectContext;
  userPreferences: UserPreferences;
}

interface TaskDelegation {
  taskId: string;
  description: string;
  requirements: TaskRequirement[];
  constraints: TaskConstraint[];
  deliverables: TaskDeliverable[];
}

class AviAgentIntegration {
  private agentManager: AgentManager;
  private taskCoordinator: TaskCoordinator;
  private conflictResolver: ConflictResolver;

  constructor(agentManager: AgentManager) {
    this.agentManager = agentManager;
    this.taskCoordinator = new TaskCoordinator();
    this.conflictResolver = new ConflictResolver();
  }

  async invokeAgent(request: AgentInvocationRequest): Promise<AgentInvocationResult> {
    // Validate request
    this.validateInvocationRequest(request);

    // Find optimal agent
    const agentId = await this.findOptimalAgent(request.agentType, request.task);

    // Create agent task
    const task = await this.createAgentTask(request, agentId);

    // Monitor execution
    const result = await this.monitorAgentExecution(task);

    return result;
  }

  private async findOptimalAgent(agentType: string, task: string): Promise<string> {
    // Get available agents of the requested type
    const availableAgents = await this.agentManager.getAvailableAgents(agentType);

    // Score agents based on capability and load
    const scoredAgents = availableAgents.map(agent => ({
      id: agent.id,
      score: this.calculateAgentScore(agent, task)
    }));

    // Return the highest scored agent
    scoredAgents.sort((a, b) => b.score - a.score);
    return scoredAgents[0].id;
  }

  private async createAgentTask(request: AgentInvocationRequest, agentId: string): Promise<AgentTask> {
    const task: AgentTask = {
      id: generateTaskId(),
      agentId,
      type: request.agentType,
      description: request.task,
      context: request.context,
      priority: request.priority,
      deadline: request.deadline,
      status: 'pending',
      createdAt: new Date()
    };

    await this.taskCoordinator.scheduleTask(task);
    return task;
  }
}
```

---

## 4. API Integration Specifications

### 4.1 Backend API Extensions

```typescript
// /src/api/routes/avi.ts
interface AviApiRoutes {
  // Instance management endpoints
  'POST /api/avi/instances': {
    body: CreateInstanceRequest;
    response: CreateInstanceResponse;
  };

  'GET /api/avi/instances/:id': {
    params: { id: string };
    response: InstanceDetailsResponse;
  };

  'DELETE /api/avi/instances/:id': {
    params: { id: string };
    response: DestroyInstanceResponse;
  };

  // Conversation endpoints
  'POST /api/avi/conversations': {
    body: CreateConversationRequest;
    response: CreateConversationResponse;
  };

  'GET /api/avi/conversations/:id/messages': {
    params: { id: string };
    query: { limit?: number; offset?: number };
    response: MessagesResponse;
  };

  'POST /api/avi/conversations/:id/messages': {
    params: { id: string };
    body: SendMessageRequest;
    response: SendMessageResponse;
  };

  // Autonomous operation endpoints
  'POST /api/avi/schedule': {
    body: ScheduleTaskRequest;
    response: ScheduleTaskResponse;
  };

  'GET /api/avi/scheduled-tasks': {
    query: { status?: string; limit?: number };
    response: ScheduledTasksResponse;
  };

  'PUT /api/avi/scheduled-tasks/:id': {
    params: { id: string };
    body: UpdateScheduledTaskRequest;
    response: UpdateScheduledTaskResponse;
  };

  'DELETE /api/avi/scheduled-tasks/:id': {
    params: { id: string };
    response: CancelScheduledTaskResponse;
  };
}

// Request/Response interfaces
interface CreateInstanceRequest {
  type: 'user-interactive' | 'autonomous';
  config: {
    personality: AviPersonalityConfig;
    capabilities: string[];
    workingDirectory?: string;
    resourceLimits?: ResourceLimits;
  };
  userId: string;
}

interface CreateInstanceResponse {
  instanceId: string;
  status: 'creating' | 'ready' | 'error';
  websocketUrl: string;
  estimatedReadyTime?: number;
}

interface SendMessageRequest {
  content: string;
  metadata?: {
    attachments?: MessageAttachment[];
    priority?: 'low' | 'medium' | 'high';
    requiresResponse?: boolean;
  };
}

interface SendMessageResponse {
  messageId: string;
  status: 'queued' | 'sent' | 'processing';
  estimatedResponseTime?: number;
}

interface ScheduleTaskRequest {
  description: string;
  schedule: {
    type: 'once' | 'recurring';
    datetime?: string; // ISO 8601 for 'once'
    cron?: string; // Cron expression for 'recurring'
  };
  task: {
    type: 'post_creation' | 'feed_monitoring' | 'agent_invocation' | 'custom';
    parameters: Record<string, any>;
  };
  notifications?: {
    onStart?: boolean;
    onComplete?: boolean;
    onError?: boolean;
  };
}
```

### 4.2 WebSocket API Extensions

```typescript
// WebSocket message protocol for Avi communication
interface AviWebSocketProtocol {
  // Client to server messages
  client_messages: {
    // Authentication
    authenticate: {
      token: string;
      instanceId: string;
    };

    // User interaction
    user_message: {
      conversationId: string;
      content: string;
      metadata?: MessageMetadata;
    };

    typing_indicator: {
      conversationId: string;
      isTyping: boolean;
    };

    // Instance commands
    instance_command: {
      command: 'pause' | 'resume' | 'restart';
      parameters?: Record<string, any>;
    };

    // Autonomous operations
    schedule_task: ScheduleTaskRequest;
    cancel_task: { taskId: string };
  };

  // Server to client messages
  server_messages: {
    // Connection status
    connection_status: {
      status: 'connected' | 'authenticated' | 'error';
      instanceId?: string;
      error?: string;
    };

    // Avi responses
    avi_response: {
      conversationId: string;
      messageId: string;
      content: string;
      metadata: ResponseMetadata;
    };

    // System notifications
    system_notification: {
      type: 'info' | 'warning' | 'error';
      title: string;
      message: string;
      actionRequired?: boolean;
    };

    // Status updates
    instance_status: {
      instanceId: string;
      status: InstanceStatus;
      metrics?: InstanceMetrics;
    };

    typing_indicator: {
      conversationId: string;
      isTyping: boolean;
      estimatedTime?: number;
    };

    // Autonomous operations
    task_scheduled: {
      taskId: string;
      nextExecution?: string;
    };

    task_executed: {
      taskId: string;
      result: TaskExecutionResult;
    };

    agent_invocation_suggestion: {
      conversationId: string;
      suggestion: AgentInvocationSuggestion;
    };
  };
}

interface ResponseMetadata {
  tokensUsed?: number;
  processingTime: number;
  confidence?: number;
  suggestedActions?: SuggestedAction[];
  agentInvocationNeeded?: boolean;
  contextUpdates?: ContextUpdate[];
}

interface SuggestedAction {
  id: string;
  type: 'agent_invocation' | 'schedule_task' | 'feed_post' | 'follow_up';
  label: string;
  description: string;
  parameters: Record<string, any>;
}
```

---

## 5. Error Handling Interfaces

### 5.1 Error Boundary Specifications

```typescript
// /frontend/src/components/avi/AviErrorBoundary.tsx
interface AviErrorBoundaryProps {
  children: React.ReactNode;
  fallback?: React.ComponentType<ErrorBoundaryFallbackProps>;
  onError?: (error: Error, errorInfo: ErrorInfo) => void;
  isolationLevel?: 'component' | 'feature' | 'application';
}

interface ErrorBoundaryFallbackProps {
  error: Error;
  resetErrorBoundary: () => void;
  errorInfo: ErrorInfo;
}

interface AviError extends Error {
  type: AviErrorType;
  code: string;
  severity: 'low' | 'medium' | 'high' | 'critical';
  recoverable: boolean;
  retryable: boolean;
  context: ErrorContext;
  timestamp: Date;
}

type AviErrorType =
  | 'connection_error'
  | 'instance_error'
  | 'message_error'
  | 'coordination_error'
  | 'authentication_error'
  | 'validation_error'
  | 'system_error';

interface ErrorContext {
  instanceId?: string;
  conversationId?: string;
  messageId?: string;
  userId: string;
  userAgent: string;
  url: string;
  stackTrace?: string;
}

class AviErrorBoundary extends React.Component<AviErrorBoundaryProps, AviErrorBoundaryState> {
  private errorReportingService: ErrorReportingService;
  private recoveryStrategies: Map<AviErrorType, RecoveryStrategy>;

  constructor(props: AviErrorBoundaryProps) {
    super(props);
    this.errorReportingService = new ErrorReportingService();
    this.initializeRecoveryStrategies();
  }

  static getDerivedStateFromError(error: Error): Partial<AviErrorBoundaryState> {
    const aviError = this.classifyError(error);
    return {
      hasError: true,
      error: aviError,
      errorId: generateErrorId(),
      recoveryAttempts: 0
    };
  }

  componentDidCatch(error: Error, errorInfo: ErrorInfo): void {
    const aviError = AviErrorBoundary.classifyError(error);

    // Report error
    this.errorReportingService.reportError(aviError, errorInfo);

    // Notify parent
    this.props.onError?.(error, errorInfo);

    // Attempt recovery
    this.attemptRecovery(aviError);
  }

  private async attemptRecovery(error: AviError): Promise<void> {
    const strategy = this.recoveryStrategies.get(error.type);

    if (strategy && error.recoverable && this.state.recoveryAttempts < 3) {
      try {
        await strategy.recover(error, this.state.recoveryAttempts);
        this.setState({ hasError: false, error: null, recoveryAttempts: 0 });
      } catch (recoveryError) {
        this.setState({ recoveryAttempts: this.state.recoveryAttempts + 1 });
        console.error('Recovery failed:', recoveryError);
      }
    }
  }
}
```

### 5.2 Fallback Strategy Interfaces

```typescript
// /src/services/avi/FallbackStrategies.ts
interface FallbackStrategy {
  canHandle(error: AviError): boolean;
  execute(error: AviError, context: FallbackContext): Promise<FallbackResult>;
  priority: number;
}

interface FallbackContext {
  userId: string;
  instanceId?: string;
  conversationId?: string;
  retryCount: number;
  lastAttempt: Date;
}

interface FallbackResult {
  success: boolean;
  action: FallbackAction;
  message?: string;
  data?: any;
}

type FallbackAction =
  | 'retry'
  | 'degrade'
  | 'redirect'
  | 'offline_mode'
  | 'manual_intervention';

class ConnectionFallbackStrategy implements FallbackStrategy {
  priority = 10;

  canHandle(error: AviError): boolean {
    return error.type === 'connection_error';
  }

  async execute(error: AviError, context: FallbackContext): Promise<FallbackResult> {
    if (context.retryCount < 3) {
      // Attempt reconnection with exponential backoff
      const delay = Math.pow(2, context.retryCount) * 1000;
      await new Promise(resolve => setTimeout(resolve, delay));

      return {
        success: true,
        action: 'retry',
        message: 'Attempting to reconnect...'
      };
    }

    // Degrade to offline mode
    return {
      success: true,
      action: 'offline_mode',
      message: 'Working in offline mode. Messages will be sent when connection is restored.'
    };
  }
}

class InstanceErrorFallbackStrategy implements FallbackStrategy {
  priority = 20;

  canHandle(error: AviError): boolean {
    return error.type === 'instance_error';
  }

  async execute(error: AviError, context: FallbackContext): Promise<FallbackResult> {
    if (error.code === 'INSTANCE_TIMEOUT' && context.retryCount < 2) {
      // Try to restart the instance
      return {
        success: true,
        action: 'retry',
        message: 'Restarting Avi instance...',
        data: { restartInstance: true }
      };
    }

    // Redirect to agent selection
    return {
      success: true,
      action: 'redirect',
      message: 'Avi is currently unavailable. Please select an agent directly.',
      data: { redirectTo: '/agent-selection' }
    };
  }
}
```

---

## 6. Performance Optimization Interfaces

### 6.1 Caching Strategy Interface

```typescript
// /src/services/avi/AviCacheManager.ts
interface AviCacheManager {
  // Message caching
  cacheMessage(conversationId: string, message: AviMessage): Promise<void>;
  getCachedMessages(conversationId: string, limit?: number): Promise<AviMessage[]>;

  // Response caching
  cacheResponse(messageHash: string, response: AviMessage, ttl?: number): Promise<void>;
  getCachedResponse(messageHash: string): Promise<AviMessage | null>;

  // Instance state caching
  cacheInstanceState(instanceId: string, state: InstanceState): Promise<void>;
  getCachedInstanceState(instanceId: string): Promise<InstanceState | null>;

  // Conversation context caching
  cacheConversationContext(conversationId: string, context: ConversationContext): Promise<void>;
  getCachedConversationContext(conversationId: string): Promise<ConversationContext | null>;

  // Cache management
  invalidateCache(pattern: string): Promise<void>;
  clearExpiredEntries(): Promise<void>;
  getCache Statistics(): Promise<CacheStatistics>;
}

interface CacheConfiguration {
  // Message caching
  messageCache: {
    enabled: boolean;
    ttl: number;
    maxEntries: number;
    compressionEnabled: boolean;
  };

  // Response caching
  responseCache: {
    enabled: boolean;
    ttl: number;
    maxEntries: number;
    hashAlgorithm: 'sha256' | 'md5';
  };

  // State caching
  stateCache: {
    enabled: boolean;
    ttl: number;
    persistToDisk: boolean;
  };

  // Context caching
  contextCache: {
    enabled: boolean;
    ttl: number;
    maxContextSize: number;
  };
}

class AviCacheManager {
  private memoryCache: Map<string, CacheEntry>;
  private persistentCache: PersistentCache;
  private config: CacheConfiguration;

  constructor(config: CacheConfiguration) {
    this.config = config;
    this.memoryCache = new Map();
    this.persistentCache = new PersistentCache();
  }

  async cacheMessage(conversationId: string, message: AviMessage): Promise<void> {
    if (!this.config.messageCache.enabled) return;

    const key = `msg:${conversationId}:${message.id}`;
    const entry: CacheEntry = {
      data: message,
      timestamp: Date.now(),
      ttl: this.config.messageCache.ttl,
      compressed: this.config.messageCache.compressionEnabled
    };

    if (entry.compressed) {
      entry.data = await this.compress(message);
    }

    this.memoryCache.set(key, entry);

    // Manage cache size
    if (this.memoryCache.size > this.config.messageCache.maxEntries) {
      this.evictOldestEntries();
    }
  }

  private async generateMessageHash(content: string, context?: ConversationContext): Promise<string> {
    const input = content + (context ? JSON.stringify(context) : '');
    const encoder = new TextEncoder();
    const data = encoder.encode(input);

    const hashBuffer = await crypto.subtle.digest(this.config.responseCache.hashAlgorithm, data);
    const hashArray = Array.from(new Uint8Array(hashBuffer));
    return hashArray.map(b => b.toString(16).padStart(2, '0')).join('');
  }

  private evictOldestEntries(): void {
    const entries = Array.from(this.memoryCache.entries());
    entries.sort(([, a], [, b]) => a.timestamp - b.timestamp);

    const entriesToRemove = entries.slice(0, Math.floor(this.config.messageCache.maxEntries * 0.1));
    entriesToRemove.forEach(([key]) => this.memoryCache.delete(key));
  }
}
```

### 6.2 Connection Optimization Interface

```typescript
// /frontend/src/services/avi/ConnectionOptimizer.ts
interface ConnectionOptimizer {
  // Connection pooling
  getOptimalConnection(): Promise<WebSocket>;
  releaseConnection(connection: WebSocket): void;

  // Load balancing
  selectBestEndpoint(): Promise<string>;
  updateEndpointHealth(endpoint: string, healthScore: number): void;

  // Request batching
  batchRequests(requests: AviRequest[]): Promise<AviResponse[]>;

  // Compression
  enableCompression(connection: WebSocket): void;
  compressMessage(message: AviMessage): Promise<CompressedMessage>;
  decompressMessage(compressed: CompressedMessage): Promise<AviMessage>;
}

interface ConnectionPool {
  maxConnections: number;
  minConnections: number;
  idleTimeout: number;
  healthCheckInterval: number;
}

interface EndpointHealth {
  endpoint: string;
  responseTime: number;
  errorRate: number;
  activeConnections: number;
  lastHealthCheck: Date;
  status: 'healthy' | 'degraded' | 'unhealthy';
}

class ConnectionOptimizer {
  private connectionPool: WebSocket[] = [];
  private endpoints: EndpointHealth[] = [];
  private requestQueue: AviRequest[] = [];
  private batchTimer: NodeJS.Timeout | null = null;

  constructor(private config: ConnectionPool) {
    this.initializeEndpoints();
    this.startHealthChecks();
  }

  async getOptimalConnection(): Promise<WebSocket> {
    // Try to get from pool first
    const pooledConnection = this.connectionPool.pop();
    if (pooledConnection && pooledConnection.readyState === WebSocket.OPEN) {
      return pooledConnection;
    }

    // Create new connection to best endpoint
    const endpoint = await this.selectBestEndpoint();
    const connection = new WebSocket(endpoint);

    // Set up connection optimization
    this.optimizeConnection(connection);

    return new Promise((resolve, reject) => {
      connection.onopen = () => resolve(connection);
      connection.onerror = (error) => reject(error);

      setTimeout(() => reject(new Error('Connection timeout')), 5000);
    });
  }

  private optimizeConnection(connection: WebSocket): void {
    // Enable compression
    this.enableCompression(connection);

    // Set up keep-alive
    this.setupKeepAlive(connection);

    // Monitor connection health
    this.monitorConnectionHealth(connection);
  }

  private setupKeepAlive(connection: WebSocket): void {
    const keepAliveInterval = setInterval(() => {
      if (connection.readyState === WebSocket.OPEN) {
        connection.send(JSON.stringify({ type: 'ping' }));
      } else {
        clearInterval(keepAliveInterval);
      }
    }, 30000); // 30 seconds
  }

  async batchRequests(requests: AviRequest[]): Promise<AviResponse[]> {
    this.requestQueue.push(...requests);

    if (!this.batchTimer) {
      this.batchTimer = setTimeout(() => {
        this.processBatchedRequests();
        this.batchTimer = null;
      }, 50); // 50ms batch window
    }

    // Return promises for the responses
    return requests.map(request => request.responsePromise);
  }

  private async processBatchedRequests(): Promise<void> {
    if (this.requestQueue.length === 0) return;

    const batch = this.requestQueue.splice(0);
    const connection = await this.getOptimalConnection();

    const batchMessage = {
      type: 'batch_request',
      requests: batch.map(req => ({
        id: req.id,
        type: req.type,
        data: req.data
      }))
    };

    connection.send(JSON.stringify(batchMessage));
  }
}
```

---

## 7. Testing Interface Specifications

### 7.1 Component Testing Interfaces

```typescript
// /frontend/src/components/avi/__tests__/AviDirectChat.test.tsx
interface AviComponentTestUtils {
  // Mock utilities
  createMockAviInstance(): MockAviInstance;
  createMockWebSocket(): MockWebSocket;
  createMockConversation(): MockConversation;

  // Test helpers
  setupAviProvider(initialState?: Partial<AviStateStore>): TestAviProvider;
  renderWithAviProvider(component: React.ReactElement): RenderResult;

  // Assertion helpers
  expectMessageToBeSent(message: string): void;
  expectInstanceToBeConnected(instanceId: string): void;
  expectTypingIndicatorToShow(): void;
  expectErrorToBeDisplayed(error: string): void;
}

interface MockAviInstance {
  id: string;
  connect: jest.Mock;
  disconnect: jest.Mock;
  sendMessage: jest.Mock;
  onMessage: jest.Mock;
  onStatusChange: jest.Mock;
}

interface MockWebSocket extends EventTarget {
  send: jest.Mock;
  close: jest.Mock;
  readyState: number;

  // Test utilities
  simulateMessage(message: AviMessage): void;
  simulateClose(code?: number): void;
  simulateError(error: Error): void;
}

// Example test cases
describe('AviDirectChat Integration', () => {
  let testUtils: AviComponentTestUtils;

  beforeEach(() => {
    testUtils = createAviTestUtils();
  });

  describe('Instance Connection', () => {
    it('should connect to Avi instance on mount', async () => {
      const mockInstance = testUtils.createMockAviInstance();
      const { rerender } = testUtils.renderWithAviProvider(
        <AviDirectChat instanceId={mockInstance.id} />
      );

      await waitFor(() => {
        expect(mockInstance.connect).toHaveBeenCalledWith({
          userId: 'test-user',
          personalityConfig: expect.any(Object)
        });
      });
    });

    it('should handle connection failures gracefully', async () => {
      const mockInstance = testUtils.createMockAviInstance();
      mockInstance.connect.mockRejectedValue(new Error('Connection failed'));

      testUtils.renderWithAviProvider(
        <AviDirectChat instanceId={mockInstance.id} />
      );

      await waitFor(() => {
        testUtils.expectErrorToBeDisplayed('Unable to connect to Avi');
      });
    });
  });

  describe('Message Handling', () => {
    it('should send messages to Avi instance', async () => {
      const mockWebSocket = testUtils.createMockWebSocket();
      const { getByRole } = testUtils.renderWithAviProvider(
        <AviDirectChat websocket={mockWebSocket} />
      );

      const input = getByRole('textbox');
      const sendButton = getByRole('button', { name: /send/i });

      fireEvent.change(input, { target: { value: 'Hello Avi' } });
      fireEvent.click(sendButton);

      testUtils.expectMessageToBeSent('Hello Avi');
    });

    it('should display Avi responses', async () => {
      const mockWebSocket = testUtils.createMockWebSocket();
      const { getByText } = testUtils.renderWithAviProvider(
        <AviDirectChat websocket={mockWebSocket} />
      );

      const aviResponse: AviMessage = {
        id: 'response-1',
        type: 'avi_response',
        content: 'Hello! How can I help you?',
        conversationId: 'conv-1',
        timestamp: new Date(),
        metadata: {
          instanceId: 'inst-1',
          userId: 'user-1',
          requiresResponse: false,
          priority: 'medium'
        }
      };

      act(() => {
        mockWebSocket.simulateMessage(aviResponse);
      });

      expect(getByText('Hello! How can I help you?')).toBeInTheDocument();
    });
  });
});
```

### 7.2 Integration Testing Interfaces

```typescript
// /tests/integration/AviIntegration.test.ts
interface AviIntegrationTestSuite {
  // End-to-end workflow tests
  testCompleteConversationFlow(): Promise<void>;
  testAgentInvocationWorkflow(): Promise<void>;
  testScheduledTaskWorkflow(): Promise<void>;

  // Cross-system integration tests
  testPostingInterfaceIntegration(): Promise<void>;
  testAgentSystemIntegration(): Promise<void>;
  testFeedMonitoringIntegration(): Promise<void>;

  // Performance integration tests
  testConcurrentUserScenarios(): Promise<void>;
  testHighVolumeMessageHandling(): Promise<void>;
  testInstanceScalingBehavior(): Promise<void>;
}

describe('Avi System Integration', () => {
  let integrationSuite: AviIntegrationTestSuite;

  beforeAll(async () => {
    integrationSuite = await createIntegrationTestSuite();
    await integrationSuite.setup();
  });

  afterAll(async () => {
    await integrationSuite.teardown();
  });

  describe('Complete User Workflows', () => {
    it('should handle full conversation with agent invocation', async () => {
      await integrationSuite.testCompleteConversationFlow();
    });

    it('should successfully create and execute scheduled tasks', async () => {
      await integrationSuite.testScheduledTaskWorkflow();
    });
  });

  describe('System Integration', () => {
    it('should integrate seamlessly with posting interface', async () => {
      await integrationSuite.testPostingInterfaceIntegration();
    });

    it('should coordinate properly with agent system', async () => {
      await integrationSuite.testAgentSystemIntegration();
    });
  });

  describe('Performance Under Load', () => {
    it('should handle 100 concurrent users', async () => {
      await integrationSuite.testConcurrentUserScenarios();
    }, 60000); // 60 second timeout

    it('should maintain responsiveness with high message volume', async () => {
      await integrationSuite.testHighVolumeMessageHandling();
    }, 30000);
  });
});
```

---

## Conclusion

This comprehensive component interface specification provides the detailed technical contracts needed for implementing Avi DM Phase 1. Each interface is designed to:

1. **Maintain Backward Compatibility**: All interfaces preserve existing system functionality
2. **Enable Progressive Enhancement**: Components can be enhanced incrementally
3. **Support Future Extensibility**: Interfaces are designed for Phase 2+ autonomous features
4. **Ensure Type Safety**: Full TypeScript coverage with strict typing
5. **Facilitate Testing**: Clear testing interfaces and mocking strategies
6. **Optimize Performance**: Built-in caching, connection pooling, and optimization patterns

The interfaces follow established patterns from the existing codebase while introducing new capabilities specific to Avi's requirements. Implementation should proceed component by component, with continuous integration testing to validate interface contracts.

**Next Action**: Begin implementation with the `AviDirectChat` component, following the specified interface exactly to ensure seamless integration with the overall architecture.