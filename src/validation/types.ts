/**
 * Phase 4: Validation & Error Handling Types
 * Comprehensive type definitions for post validation system
 */

/**
 * Post content draft to be validated
 */
export interface PostDraft {
  /** Post content text */
  content: string;
  /** Agent name that generated the post */
  agentName: string;
  /** User ID who owns the agent */
  userId: string;
  /** Feed item ID being responded to */
  feedItemId?: string;
  /** Additional metadata */
  metadata?: {
    tokensUsed?: number;
    durationMs?: number;
    model?: string;
    attemptNumber?: number;
    prompt?: string;
  };
}

/**
 * Overall validation result
 */
export interface ValidationResult {
  /** Whether post is approved for posting */
  approved: boolean;
  /** Whether issues can be fixed with retry */
  canFix: boolean;
  /** Human-readable reason for failure */
  reason: string;
  /** Actionable feedback for fixing issues */
  feedback: string;
  /** Severity of validation failure */
  severity: 'minor' | 'moderate' | 'critical';
  /** Individual rule check results */
  ruleChecks: RuleCheckResult[];
  /** LLM tone check result (if performed) */
  toneCheck?: ToneCheckResult;
  /** Total token cost of validation */
  tokenCost: number;
  /** Validation duration in milliseconds */
  durationMs: number;
  /** Timestamp of validation */
  timestamp: Date;
}

/**
 * Result of individual rule check
 */
export interface RuleCheckResult {
  /** Rule name being checked */
  ruleName: string;
  /** Whether rule passed */
  passed: boolean;
  /** Failure message if applicable */
  message?: string;
  /** Actual value that was checked */
  value?: any;
  /** Can this failure be fixed? */
  canFix: boolean;
  /** Suggestion for fixing */
  suggestion?: string;
}

/**
 * Result of LLM tone validation
 */
export interface ToneCheckResult {
  /** Whether tone is appropriate */
  appropriate: boolean;
  /** Confidence score 0-1 */
  score: number;
  /** Issues detected */
  issues: string[];
  /** Suggestions for improvement */
  suggestions: string[];
  /** Raw LLM analysis */
  analysis?: string;
  /** Tokens used for check */
  tokensUsed: number;
}

/**
 * Validation configuration
 */
export interface ValidationConfig {
  /** Enable LLM-based tone validation */
  enableLLMValidation: boolean;
  /** Maximum post length */
  maxLength: number;
  /** Minimum post length */
  minLength: number;
  /** List of prohibited words */
  prohibitedWords: string[];
  /** Maximum mentions per post */
  maxMentions: number;
  /** Maximum hashtags per post */
  maxHashtags: number;
  /** Maximum URLs per post */
  maxUrls: number;
  /** Allowed URL domains */
  allowedDomains: string[];
  /** Tone appropriateness threshold 0-1 */
  toneThreshold: number;
  /** Anthropic API key for LLM checks */
  anthropicApiKey?: string;
  /** Model to use for tone checking */
  toneCheckModel?: string;
  /** Timeout for tone check in ms */
  toneCheckTimeout?: number;
}

/**
 * Retry strategy enumeration
 */
export enum RetryStrategy {
  RETRY_SAME = 'retry_same',
  SIMPLIFY_POST = 'simplify_post',
  DIFFERENT_AGENT = 'different_agent'
}

/**
 * Retry configuration
 */
export interface RetryConfig {
  /** Maximum retry attempts */
  maxRetries: number;
  /** Base delay in seconds */
  baseDelay: number;
  /** Maximum delay in seconds */
  maxDelay: number;
  /** Exponential backoff multiplier */
  backoffMultiplier: number;
  /** Available retry strategies */
  strategies: RetryStrategy[];
  /** Attempt thresholds for each strategy */
  strategyThresholds: {
    retrySame: number;
    simplifyPost: number;
    differentAgent: number;
  };
}

/**
 * Retry result
 */
export interface RetryResult {
  /** Whether retry was successful */
  success: boolean;
  /** Strategy used */
  strategy: RetryStrategy;
  /** Delay before retry in seconds */
  delay: number;
  /** When retry was scheduled */
  scheduledAt: Date;
  /** New agent ID if different agent strategy */
  newAgentId?: string;
  /** Simplified prompt if simplify strategy */
  simplifiedPrompt?: string;
  /** Error if retry scheduling failed */
  error?: string;
}

/**
 * Error types for classification
 */
export enum ErrorType {
  VALIDATION_FAILED = 'validation_failed',
  WORKER_ERROR = 'worker_error',
  TIMEOUT = 'timeout',
  API_ERROR = 'api_error',
  RATE_LIMIT = 'rate_limit',
  NETWORK_ERROR = 'network_error',
  UNKNOWN = 'unknown'
}

/**
 * Error log entry
 */
export interface ErrorLog {
  /** Unique error ID */
  id: string;
  /** Work ticket ID */
  ticketId: string;
  /** User ID */
  userId: string;
  /** Agent ID if applicable */
  agentId?: string;
  /** Error type classification */
  errorType: ErrorType;
  /** Error message */
  errorMessage: string;
  /** Stack trace if available */
  stackTrace?: string;
  /** Additional metadata */
  metadata: {
    retryCount?: number;
    lastStrategy?: string;
    validationErrors?: string[];
    [key: string]: any;
  };
  /** Error timestamp */
  timestamp: Date;
}

/**
 * Escalation result
 */
export interface EscalationResult {
  /** Whether escalation completed */
  escalated: boolean;
  /** System post created */
  systemPostCreated: boolean;
  /** Error logged to database */
  errorLogged: boolean;
  /** User notified */
  userNotified: boolean;
  /** Individual notification results */
  notifications: NotificationResult[];
  /** Escalation timestamp */
  timestamp: Date;
}

/**
 * Notification types
 */
export enum NotificationType {
  SYSTEM_POST = 'system_post',
  EMAIL = 'email',
  WEBHOOK = 'webhook',
  ERROR_LOG = 'error_log'
}

/**
 * Notification result
 */
export interface NotificationResult {
  /** Notification type */
  type: NotificationType;
  /** Whether notification succeeded */
  success: boolean;
  /** Notification timestamp */
  timestamp: Date;
  /** Error if notification failed */
  error?: string;
  /** Additional metadata */
  metadata?: Record<string, any>;
}

/**
 * System post for user notification
 */
export interface SystemPost {
  /** User ID to notify */
  userId: string;
  /** Notification content */
  content: string;
  /** Post metadata */
  metadata: {
    type: 'error_notification' | 'warning' | 'info';
    ticketId: string;
    errorType: ErrorType;
    timestamp: Date;
    [key: string]: any;
  };
}

/**
 * Interface for validation service
 */
export interface IValidationService {
  /**
   * Validate a post draft
   */
  validatePost(post: PostDraft): Promise<ValidationResult>;

  /**
   * Check post length
   */
  checkLength(post: PostDraft): RuleCheckResult;

  /**
   * Check for prohibited words
   */
  checkProhibitedWords(post: PostDraft): RuleCheckResult;

  /**
   * Check mentions format and count
   */
  checkMentions(post: PostDraft): RuleCheckResult;

  /**
   * Check hashtags format and count
   */
  checkHashtags(post: PostDraft): RuleCheckResult;

  /**
   * Check tone with LLM (optional, uses tokens)
   */
  checkToneWithLLM(post: PostDraft, agentName: string): Promise<ToneCheckResult>;
}

/**
 * Post validation result for PostValidator
 */
export interface PostValidationResult {
  /** Whether entire flow succeeded */
  success: boolean;
  /** Whether post was actually posted */
  posted: boolean;
  /** Number of attempts made */
  attempts: number;
  /** Whether ticket was escalated to user */
  escalated: boolean;
  /** Final error if any */
  error?: Error;
  /** Last validation result */
  validationResult?: ValidationResult;
  /** Post ID if posted successfully */
  postId?: string;
  /** Total tokens used across all attempts */
  totalTokens: number;
  /** Total duration in milliseconds */
  totalDurationMs: number;
}
