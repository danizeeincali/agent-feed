/**
 * Claude Process Manager Contract Definition
 * London School TDD - Contract-first approach for Claude Code integration
 */

export interface ClaudeProcessManagerContract {
  // Instance Management
  createInstance(workspaceDir: string, config?: ClaudeInstanceConfig): Promise<ClaudeInstanceInfo>;
  destroyInstance(instanceId: string): Promise<void>;
  getInstanceStatus(instanceId: string): Promise<InstanceStatus>;
  listInstances(): Promise<ClaudeInstanceInfo[]>;

  // Message Handling
  sendInput(instanceId: string, input: string): Promise<MessageResponse>;
  streamOutput(instanceId: string): AsyncIterable<OutputChunk>;
  getMessageHistory(instanceId: string): Promise<Message[]>;

  // File Operations
  requestFileCreation(instanceId: string, request: FileCreationRequest): Promise<FileOperationResponse>;
  handlePermissionPrompt(instanceId: string, response: PermissionResponse): Promise<void>;

  // WebSocket Integration
  subscribeToEvents(instanceId: string, callback: EventCallback): void;
  unsubscribeFromEvents(instanceId: string): void;

  // Health & Monitoring
  healthCheck(): Promise<HealthStatus>;
  getMetrics(): Promise<ProcessMetrics>;
}

export interface ClaudeInstanceConfig {
  workspaceDir: string;
  maxMemoryMB?: number;
  timeoutMs?: number;
  environment?: 'development' | 'production';
  permissions?: PermissionSet;
}

export interface ClaudeInstanceInfo {
  id: string;
  pid: number;
  workspaceDir: string;
  status: InstanceStatus;
  createdAt: Date;
  config: ClaudeInstanceConfig;
}

export interface MessageResponse {
  success: boolean;
  messageId: string;
  timestamp: Date;
  error?: string;
}

export interface OutputChunk {
  instanceId: string;
  type: 'stdout' | 'stderr' | 'tool_use' | 'completion';
  content: string;
  timestamp: Date;
  metadata?: Record<string, any>;
}

export interface Message {
  id: string;
  instanceId: string;
  type: 'input' | 'output' | 'system';
  content: string;
  timestamp: Date;
  metadata?: Record<string, any>;
}

export interface FileCreationRequest {
  path: string;
  content: string;
  permissions?: string;
  overwrite?: boolean;
}

export interface FileOperationResponse {
  success: boolean;
  path: string;
  operation: 'create' | 'update' | 'delete';
  error?: string;
  requiresPermission?: boolean;
}

export interface PermissionResponse {
  granted: boolean;
  operation: string;
  path?: string;
  reason?: string;
}

export interface PermissionSet {
  fileSystem: {
    read: string[];
    write: string[];
    execute: string[];
  };
  network: {
    allowOutbound: boolean;
    allowedDomains?: string[];
  };
  dangerous: boolean;
}

export type InstanceStatus = 'initializing' | 'running' | 'idle' | 'error' | 'terminated';

export interface HealthStatus {
  healthy: boolean;
  instances: number;
  averageResponseTime: number;
  errors: string[];
}

export interface ProcessMetrics {
  totalInstances: number;
  activeInstances: number;
  totalMessages: number;
  averageResponseTime: number;
  memoryUsageMB: number;
  uptime: number;
}

export type EventCallback = (event: ClaudeEvent) => void;

export interface ClaudeEvent {
  instanceId: string;
  type: 'message' | 'status_change' | 'error' | 'file_operation' | 'permission_request';
  data: any;
  timestamp: Date;
}