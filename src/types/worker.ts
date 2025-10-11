/**
 * Worker System Type Definitions
 * Phase 2: Agent Worker Spawning
 * TDD London School Implementation
 */

import { EventEmitter } from 'events';

/**
 * Worker status states
 */
export enum WorkerStatus {
  IDLE = 'IDLE',
  LOADING_CONTEXT = 'LOADING_CONTEXT',
  EXECUTING = 'EXECUTING',
  COMPLETED = 'COMPLETED',
  FAILED = 'FAILED'
}

/**
 * Agent worker configuration
 */
export interface AgentWorkerConfig {
  /** Worker ID (UUID) */
  workerId: string;

  /** Agent type/template name */
  agentType: string;

  /** User ID */
  userId: string;

  /** Work ticket to process */
  workTicket?: any;

  /** Maximum execution timeout in milliseconds (default: 60000) */
  timeout?: number;

  /** Whether to save memories after execution (default: true) */
  saveMemories?: boolean;
}

/**
 * Worker metrics for monitoring
 */
export interface WorkerMetrics {
  /** Worker ID */
  workerId: string;

  /** Token usage for this worker */
  tokensUsed: number;

  /** Execution time in milliseconds */
  executionTimeMs: number;

  /** Context loading time in milliseconds */
  contextLoadTimeMs: number;

  /** Memory save time in milliseconds */
  memorySaveTimeMs: number;

  /** Total lifecycle time in milliseconds */
  totalLifetimeMs: number;

  /** Final status */
  status: WorkerStatus;

  /** Error message if failed */
  error?: string;
}

/**
 * Worker pool slot information
 */
export interface WorkerSlot {
  /** Slot ID */
  slotId: number;

  /** Whether slot is currently occupied */
  occupied: boolean;

  /** Worker ID occupying this slot (if any) */
  workerId?: string;

  /** Timestamp when slot was acquired */
  acquiredAt?: number;
}

/**
 * Worker spawner statistics
 */
export interface WorkerSpawnerStats {
  /** Total workers spawned */
  totalSpawned: number;

  /** Currently active workers */
  activeWorkers: number;

  /** Completed workers */
  completedWorkers: number;

  /** Failed workers */
  failedWorkers: number;

  /** Average execution time (ms) */
  avgExecutionTime: number;

  /** Average tokens used */
  avgTokensUsed: number;
}

/**
 * Worker lifecycle events
 */
export interface WorkerEvents {
  'status-change': (status: WorkerStatus) => void;
  'context-loaded': (contextSize: number) => void;
  'execution-complete': (result: any) => void;
  'memory-saved': (memoryId: string) => void;
  'error': (error: Error) => void;
  'destroyed': () => void;
  'metrics': (metrics: WorkerMetrics) => void;
}

/**
 * Worker event emitter type
 */
export interface WorkerEventEmitter extends EventEmitter {
  on<K extends keyof WorkerEvents>(event: K, listener: WorkerEvents[K]): this;
  emit<K extends keyof WorkerEvents>(event: K, ...args: Parameters<WorkerEvents[K]>): boolean;
}

/**
 * Worker pool configuration
 */
export interface WorkerPoolConfig {
  /** Maximum concurrent workers */
  maxWorkers: number;

  /** Whether to auto-release workers on completion */
  autoRelease?: boolean;

  /** Slot timeout in milliseconds (auto-release if exceeded) */
  slotTimeout?: number;
}

/**
 * Worker spawner configuration
 */
export interface WorkerSpawnerConfig {
  /** Maximum concurrent workers */
  maxWorkers: number;

  /** Worker execution timeout in milliseconds */
  workerTimeout?: number;

  /** Whether to collect metrics */
  collectMetrics?: boolean;

  /** Whether to auto-retry failed workers */
  autoRetry?: boolean;

  /** Maximum retry attempts */
  maxRetries?: number;
}

// Legacy types (kept for compatibility)
export interface WorkerConfig {
  userId: string;
  agentName: string;
  taskType: 'post_response' | 'memory_update';
  payload: any;
}

export interface WorkerResult {
  success: boolean;
  output?: any;
  error?: Error;
  tokensUsed: number;
  duration: number;
}

export interface WorkerContext {
  userId: string;
  agentName: string;
  agentMemory: any;
  userPreferences: any;
  recentInteractions: any[];
}

// Phase 3B: Feed Response Generation Types

/**
 * Response from Claude API
 */
export interface GeneratedResponse {
  content: string;
  tokensUsed: number;
  durationMs: number;
  metadata: {
    model: string;
    stopReason: string;
    temperature: number;
  };
}

/**
 * Options for response generation
 */
export interface GenerationOptions {
  maxLength?: number;
  minLength?: number;
  temperature?: number;
}

/**
 * Validation result for response
 */
export interface ValidationResult {
  valid: boolean;
  errors: string[];
  warnings?: string[];
}

/**
 * Agent context for response generation
 */
export interface AgentContext {
  userId: string;
  agentName: string;
  personality: string;
  postingRules: {
    maxLength: number;
    minLength: number;
    allowedTopics?: string[];
    blockedWords?: string[];
  };
  responseStyle: {
    temperature: number;
    tone?: string;
    formality?: string;
  };
  memories: Array<{
    content: string;
    importance: number;
    createdAt: Date;
  }>;
  model?: string;
}

/**
 * Memory update data
 */
export interface MemoryUpdate {
  interaction: {
    post: string;
    response: string;
    context: string;
  };
  importance: number;
  topic?: string;
}
