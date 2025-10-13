/**
 * Phase 4: Validation & Error Handling - Module Exports
 *
 * Central export point for all validation system components:
 * - ValidationService: Post validation with rules + LLM
 * - RetryService: Multi-strategy retry with backoff
 * - EscalationService: User notifications and error logging
 * - PostValidator: Main orchestration layer
 */

// Core Services
export { ValidationService } from './validation-service';
export { RetryService } from './retry-service';
export { EscalationService } from './escalation-service';
export { PostValidator } from './post-validator';

// Types - Validation
export type {
  PostDraft,
  ValidationResult,
  RuleCheckResult,
  ToneCheckResult,
  ValidationConfig,
  IValidationService
} from './types';

export {
  RetryStrategy,
  ErrorType,
  NotificationType
} from './types';

export type {
  RetryConfig,
  RetryResult,
  ErrorLog,
  EscalationResult,
  NotificationResult,
  SystemPost
} from './types';

// Types - PostValidator
export type {
  AgentResponse,
  PostContent,
  PostResult,
  PostValidationResult
} from './post-validator';

// Types - RetryService
export type {
  RetryStrategy as RetryStrategyType,
  PostContent as RetryPostContent
} from './retry-service';

// Types - Escalation
export type {
  EscalationResult as EscalationResultType,
  NotificationResult as NotificationResultType,
  NotificationType as NotificationTypeEnum,
  ErrorLog as ErrorLogType,
  ErrorType as ErrorTypeEnum,
  SystemPost as SystemPostType,
  ErrorAlert,
  ErrorContext
} from './types/escalation.types';

/**
 * Factory function to create a complete validation system
 *
 * @param config - Validation configuration
 * @param dependencies - Required service dependencies
 * @returns Configured PostValidator instance
 */
export function createPostValidator(
  config: import('./types').ValidationConfig,
  dependencies: {
    workerSpawner: any;
    database: any;
    workQueue: any;
  }
): InstanceType<typeof PostValidator> {
  const { ValidationService } = require('./validation-service');
  const { RetryService } = require('./retry-service');
  const { EscalationService } = require('./escalation-service');
  const { PostValidator } = require('./post-validator');

  // Create service instances
  const validationService = new ValidationService(config);
  const retryService = new RetryService(
    dependencies.workerSpawner,
    dependencies.database
  );
  const escalationService = new EscalationService(dependencies.database);

  // Create and return PostValidator
  return new PostValidator(
    validationService,
    retryService,
    escalationService,
    dependencies.workQueue
  );
}

/**
 * Default validation configuration
 */
export const DEFAULT_VALIDATION_CONFIG: import('./types').ValidationConfig = {
  enableLLMValidation: true,
  maxLength: 280,
  minLength: 10,
  prohibitedWords: [],
  maxMentions: 5,
  maxHashtags: 5,
  maxUrls: 4,
  allowedDomains: [],
  toneThreshold: 0.6,
  toneCheckModel: 'claude-3-5-haiku-20241022',
  toneCheckTimeout: 10000
};
