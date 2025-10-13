/**
 * Phase 4: Validation & Error Handling - Escalation Types
 * Types for escalation service functionality
 */

/**
 * Result of escalation operation
 */
export interface EscalationResult {
  escalated: boolean;
  systemPostCreated: boolean;
  errorLogged: boolean;
  userNotified: boolean;
  notifications: NotificationResult[];
  timestamp: Date;
}

/**
 * Result of individual notification
 */
export interface NotificationResult {
  type: NotificationType;
  success: boolean;
  timestamp: Date;
  error?: string;
  metadata?: Record<string, any>;
}

/**
 * Notification type enumeration
 */
export enum NotificationType {
  SYSTEM_POST = 'system_post',
  EMAIL = 'email',
  WEBHOOK = 'webhook',
  ERROR_LOG = 'error_log'
}

/**
 * Error log entry
 */
export interface ErrorLog {
  id: string;
  ticketId: string;
  userId: string;
  agentId?: string;
  errorType: ErrorType;
  errorMessage: string;
  stackTrace?: string;
  metadata: {
    retryCount?: number;
    lastStrategy?: string;
    validationErrors?: string[];
    [key: string]: any;
  };
  timestamp: Date;
}

/**
 * Error type enumeration
 */
export enum ErrorType {
  VALIDATION_FAILED = 'validation_failed',
  WORKER_ERROR = 'worker_error',
  TIMEOUT = 'timeout',
  API_ERROR = 'api_error',
  UNKNOWN = 'unknown'
}

/**
 * System post for user notification
 */
export interface SystemPost {
  userId: string;
  content: string;
  metadata: {
    type: 'error_notification';
    ticketId: string;
    errorType: ErrorType;
    timestamp: Date;
    [key: string]: any;
  };
}

/**
 * Error alert structure
 */
export interface ErrorAlert {
  ticketId: string;
  userId: string;
  agentName: string;
  errorType: string;
  errorMessage: string;
  attempts: number;
  timestamp: Date;
  savedDraft?: string;
  context: {
    feedItemId?: string;
    retryStrategies?: string[];
    [key: string]: any;
  };
}

/**
 * Error context for logging
 */
export interface ErrorContext {
  ticketId: string;
  userId: string;
  agentName?: string;
  attempts?: number;
  escalated?: boolean;
  [key: string]: any;
}
