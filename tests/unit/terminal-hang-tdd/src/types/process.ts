/**
 * SPARC REFINEMENT PHASE: Process Type Definitions
 * Type definitions for Claude process management
 */

export type ProcessStatus = 'starting' | 'running' | 'stopping' | 'stopped' | 'failed';

export interface ProcessConfig {
  command: string;
  workingDirectory: string;
  args?: string[];
  env?: Record<string, string>;
}

export interface ProcessInfo {
  id: string;
  command: string;
  workingDirectory: string;
  args: string[];
  status: ProcessStatus;
  pid: number;
  startTime: Date;
  lastActivity: Date;
  exitCode?: number | null;
  exitSignal?: string | null;
  error?: string;
  autoRestart?: AutoRestartConfig;
}

export interface AutoRestartConfig {
  enabled: boolean;
  maxAttempts: number;
  backoffDelay: number;
  attemptCount: number;
}

export interface HealthMetrics {
  processId: string;
  pid: number;
  cpuUsage: number;
  memoryUsage: number;
  lastHeartbeat: Date;
  responseTime: number;
  isHealthy: boolean;
}

export interface LaunchRequest {
  command: string;
  workingDirectory: string;
  sessionId?: string;
  args?: string[];
  env?: Record<string, string>;
}

export interface LaunchResponse {
  success: boolean;
  processId?: string;
  sessionId?: string;
  error?: string;
}

export interface StatusResponse {
  success: boolean;
  process?: ProcessInfo;
  error?: string;
}

export interface StopResponse {
  success: boolean;
  error?: string;
}

export interface ProcessListResponse {
  success: boolean;
  processes?: ProcessInfo[];
  error?: string;
}

export interface CleanupResponse {
  success: boolean;
  error?: string;
}

// WebSocket Message Types
export interface WebSocketMessage {
  type: 'command' | 'input' | 'subscribe' | 'unsubscribe' | 'resize';
  processId?: string;
  data?: any;
  timestamp: number;
  sessionId?: string;
}

export interface WebSocketResponse {
  type: 'output' | 'error' | 'status' | 'process_exit' | 'process_ready';
  processId: string;
  data: any;
  timestamp: number;
}

export interface CommandMessage extends WebSocketMessage {
  type: 'command';
  processId: string;
  command: string;
}

export interface InputMessage extends WebSocketMessage {
  type: 'input';
  processId: string;
  data: string;
}

export interface SubscribeMessage extends WebSocketMessage {
  type: 'subscribe';
  processId: string;
}

export interface OutputMessage extends WebSocketResponse {
  type: 'output';
  data: {
    stream: 'stdout' | 'stderr';
    content: string;
  };
}

export interface ErrorMessage extends WebSocketResponse {
  type: 'error';
  data: {
    message: string;
    code?: string;
  };
}

export interface StatusMessage extends WebSocketResponse {
  type: 'status';
  data: ProcessInfo;
}

export interface ProcessExitMessage extends WebSocketResponse {
  type: 'process_exit';
  data: {
    exitCode: number | null;
    signal: string | null;
  };
}

export interface ProcessReadyMessage extends WebSocketResponse {
  type: 'process_ready';
  data: {
    pid: number;
  };
}