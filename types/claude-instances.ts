/**
 * Claude Instances Type Definitions
 * Comprehensive TypeScript types for Claude Instance Management system
 */

export interface ClaudeInstanceConfig {
  id: string;
  name: string;
  description?: string;
  workingDirectory?: string;
  autoRestart?: boolean;
  autoRestartHours?: number;
  skipPermissions?: boolean;
  resumeSession?: boolean;
  useProductionMode?: boolean;
}

export interface ClaudeInstanceStatus {
  id: string;
  status: 'starting' | 'running' | 'stopping' | 'stopped' | 'error' | 'restarting';
  pid?: number;
  startTime?: Date;
  lastActivity?: Date;
  cpuUsage?: number;
  memoryUsage?: number;
  uptime?: number;
  connectionCount?: number;
  lastError?: string;
}

export interface ClaudeInstance extends ClaudeInstanceConfig, ClaudeInstanceStatus {
  createdAt: Date;
  updatedAt: Date;
  isConnected: boolean;
  hasOutput: boolean;
  outputBuffer?: string[];
  inputHistory?: string[];
  activeConversationId?: string;
}

export interface ClaudeInstanceCommand {
  type: 'terminal' | 'chat' | 'system';
  command: string;
  args?: string[];
  workingDirectory?: string;
  environmentVars?: Record<string, string>;
  timeout?: number;
}

export interface ClaudeInstanceMessage {
  id: string;
  instanceId: string;
  type: 'input' | 'output' | 'error' | 'system' | 'user' | 'assistant';
  content: string;
  timestamp: Date;
  metadata?: {
    exitCode?: number;
    duration?: number;
    tokensUsed?: number;
    model?: string;
  };
}

export interface ImageAttachment {
  id: string;
  name: string;
  size: number;
  type: string;
  url: string;
  dataUrl?: string;
  uploadProgress?: number;
  error?: string;
}

export interface ChatMessage extends ClaudeInstanceMessage {
  role: 'user' | 'assistant' | 'system';
  images?: ImageAttachment[];
  isStreaming?: boolean;
  streamingComplete?: boolean;
}

export interface ConversationSession {
  id: string;
  instanceId: string;
  title: string;
  createdAt: Date;
  updatedAt: Date;
  messageCount: number;
  isActive: boolean;
  lastMessage?: ChatMessage;
  tokenCount?: number;
  cost?: number;
}

export interface InstanceMetrics {
  instanceId: string;
  timestamp: Date;
  cpu: number;
  memory: number;
  diskUsage: number;
  networkIn: number;
  networkOut: number;
  responseTime: number;
  tokensPerMinute: number;
  errorRate: number;
  uptime: number;
}

export interface ClaudeInstanceSettings {
  maxInstances: number;
  defaultWorkingDirectory: string;
  autoRestartEnabled: boolean;
  autoRestartHours: number;
  maxOutputBufferSize: number;
  retainLogsHours: number;
  enableMetrics: boolean;
  allowSkipPermissions: boolean;
  productionModeDefault: boolean;
}

// WebSocket Event Types
export interface InstanceWebSocketEvents {
  // Instance lifecycle
  'instance:created': ClaudeInstance;
  'instance:started': ClaudeInstanceStatus;
  'instance:stopped': ClaudeInstanceStatus;
  'instance:error': { instanceId: string; error: string };
  'instance:status': ClaudeInstanceStatus;
  
  // Communication
  'instance:output': ClaudeInstanceMessage;
  'instance:input': ClaudeInstanceMessage;
  'chat:message': ChatMessage;
  'chat:stream': { instanceId: string; chunk: string; done: boolean };
  
  // System
  'instances:list': ClaudeInstance[];
  'metrics:update': InstanceMetrics;
  'system:health': { healthy: boolean; details: any };
}

// Hook interfaces
export interface UseClaudeInstancesOptions {
  autoConnect?: boolean;
  maxRetries?: number;
  retryInterval?: number;
  enableMetrics?: boolean;
}

export interface UseClaudeInstancesReturn {
  instances: ClaudeInstance[];
  selectedInstance: ClaudeInstance | null;
  isConnected: boolean;
  isLoading: boolean;
  error: string | null;
  
  // Instance management
  createInstance: (config: Partial<ClaudeInstanceConfig>) => Promise<ClaudeInstance>;
  startInstance: (instanceId: string) => Promise<void>;
  stopInstance: (instanceId: string) => Promise<void>;
  restartInstance: (instanceId: string) => Promise<void>;
  deleteInstance: (instanceId: string) => Promise<void>;
  selectInstance: (instanceId: string | null) => void;
  
  // Communication
  sendCommand: (instanceId: string, command: ClaudeInstanceCommand) => Promise<void>;
  sendMessage: (instanceId: string, message: string, images?: ImageAttachment[]) => Promise<void>;
  
  // Data
  getInstanceStatus: (instanceId: string) => ClaudeInstanceStatus | null;
  getInstanceMessages: (instanceId: string, limit?: number) => ClaudeInstanceMessage[];
  getInstanceMetrics: (instanceId: string) => InstanceMetrics | null;
  
  // WebSocket
  connect: () => Promise<void>;
  disconnect: () => void;
  emit: (event: string, data?: any) => void;
  subscribe: (event: keyof InstanceWebSocketEvents, handler: (data: any) => void) => void;
  unsubscribe: (event: keyof InstanceWebSocketEvents, handler?: (data: any) => void) => void;
}

export interface UseImageUploadOptions {
  maxFileSize?: number;
  allowedTypes?: string[];
  maxFiles?: number;
  autoUpload?: boolean;
}

export interface UseImageUploadReturn {
  images: ImageAttachment[];
  isUploading: boolean;
  uploadProgress: number;
  error: string | null;
  
  addImages: (files: FileList | File[]) => Promise<void>;
  removeImage: (imageId: string) => void;
  clearImages: () => void;
  uploadImages: () => Promise<ImageAttachment[]>;
  validateFile: (file: File) => { valid: boolean; error?: string };
}

// Component Props
export interface ClaudeInstanceSelectorProps {
  instances: ClaudeInstance[];
  selectedInstance: ClaudeInstance | null;
  onSelect: (instance: ClaudeInstance | null) => void;
  onCreateNew?: () => void;
  showCreateButton?: boolean;
  className?: string;
  placeholder?: string;
}

export interface EnhancedChatInterfaceProps {
  instance: ClaudeInstance;
  messages: ChatMessage[];
  isConnected: boolean;
  isLoading: boolean;
  onSendMessage: (message: string, images?: ImageAttachment[]) => void;
  onClearMessages?: () => void;
  enableImageUpload?: boolean;
  className?: string;
}

export interface ImageUploadZoneProps {
  images: ImageAttachment[];
  onAddImages: (files: FileList | File[]) => void;
  onRemoveImage: (imageId: string) => void;
  maxFiles?: number;
  maxFileSize?: number;
  allowedTypes?: string[];
  className?: string;
  disabled?: boolean;
}

export interface InstanceStatusIndicatorProps {
  instance: ClaudeInstance;
  showDetails?: boolean;
  showMetrics?: boolean;
  className?: string;
  size?: 'sm' | 'md' | 'lg';
}

// Terminal command mapping
export interface TerminalCommandMapping {
  '-c': ClaudeInstanceConfig;
  '--resume': ClaudeInstanceConfig;
  'cd prod': ClaudeInstanceConfig;
  '--dangerously-skip-permissions': ClaudeInstanceConfig;
}

// Error types
export class ClaudeInstanceError extends Error {
  constructor(
    message: string,
    public instanceId?: string,
    public code?: string,
    public details?: any
  ) {
    super(message);
    this.name = 'ClaudeInstanceError';
  }
}

export class ImageUploadError extends Error {
  constructor(
    message: string,
    public fileName?: string,
    public fileSize?: number,
    public fileType?: string
  ) {
    super(message);
    this.name = 'ImageUploadError';
  }
}