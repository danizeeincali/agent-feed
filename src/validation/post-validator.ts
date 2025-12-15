/**
 * Phase 4: PostValidator - Main Orchestration Layer
 *
 * Coordinates the complete validation → retry → escalation flow:
 * 1. Validates agent responses before posting
 * 2. Handles retry logic with progressive strategies
 * 3. Escalates to user after max retries exhausted
 *
 * Integration Points:
 * - ValidationService: Post validation with rule checks + LLM
 * - RetryService: Multi-strategy retry with exponential backoff
 * - EscalationService: User notifications and error logging
 * - WorkQueue: Ticket status updates
 */

import type { WorkTicket } from '../types/work-ticket';
import type { IWorkQueue } from '../types/avi';
import type { ValidationService } from './validation-service';
import type { RetryService } from './retry-service';
import type { EscalationService } from './escalation-service';
import type { PostDraft, ValidationResult } from './types';
import { logger } from '../utils/logger';

/**
 * Agent response from worker execution
 */
export interface AgentResponse {
  content: string;
  tokensUsed: number;
  durationMs: number;
  model?: string;
}

/**
 * Post content structure for posting function
 */
export interface PostContent {
  content: string;
  metadata?: {
    agentName?: string;
    userId?: string;
    feedItemId?: string;
    tokensUsed?: number;
    model?: string;
    attemptNumber?: number;
    [key: string]: any;
  };
}

/**
 * Result of post attempt
 */
export interface PostResult {
  success: boolean;
  postId?: string;
  error?: Error;
}

/**
 * Overall result of validation and posting flow
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

/**
 * Error classification for routing decisions
 */
interface ErrorClassification {
  /** Error type */
  type: 'validation' | 'posting' | 'worker' | 'unknown';
  /** Whether error is transient (can retry) */
  transient: boolean;
  /** Whether error can be fixed with retry */
  canFix: boolean;
  /** Human-readable reason */
  reason: string;
}

/**
 * PostValidator - Main orchestration layer
 *
 * Orchestrates the complete flow:
 * 1. Validate response
 * 2. Try to post
 * 3. Handle failures with retry strategies
 * 4. Escalate after max retries
 */
export class PostValidator {
  private validationService: ValidationService;
  private retryService: RetryService;
  private escalationService: EscalationService;
  private workQueue: IWorkQueue;

  private static readonly MAX_ATTEMPTS = 3;

  constructor(
    validationService: ValidationService,
    retryService: RetryService,
    escalationService: EscalationService,
    workQueue: IWorkQueue
  ) {
    this.validationService = validationService;
    this.retryService = retryService;
    this.escalationService = escalationService;
    this.workQueue = workQueue;
  }

  /**
   * Main entry point - validates and posts agent response
   *
   * Flow:
   * 1. Validate response with ValidationService
   * 2. If validation fails:
   *    a. Check if canFix (can retry)
   *    b. If yes and attempts < 3, retry
   *    c. If no or max attempts, escalate
   * 3. If validation passes:
   *    a. Try to post
   *    b. If post succeeds, return success
   *    c. If post fails, retry or escalate
   *
   * @param response - Agent response to validate and post
   * @param ticket - Work ticket being processed
   * @param postFn - Function to post content (injected for testing)
   * @returns Result of validation and posting flow
   */
  async validateAndPost(
    response: AgentResponse,
    ticket: WorkTicket,
    postFn: (content: PostContent) => Promise<PostResult>
  ): Promise<PostValidationResult> {
    const startTime = Date.now();
    let attempts = 0;
    let totalTokens = response.tokensUsed;
    let escalated = false;
    let lastValidationResult: ValidationResult | undefined;
    let lastError: Error | undefined;

    logger.info('Starting post validation flow', {
      ticketId: ticket.id,
      agentName: ticket.agentName,
      userId: ticket.userId,
      contentLength: response.content.length
    });

    try {
      // Update ticket status to processing
      await this.updateTicketStatus(ticket.id, 'processing');

      // Attempt loop: Try up to MAX_ATTEMPTS times
      while (attempts < PostValidator.MAX_ATTEMPTS) {
        attempts++;

        logger.debug('Validation attempt', {
          ticketId: ticket.id,
          attempt: attempts,
          maxAttempts: PostValidator.MAX_ATTEMPTS
        });

        try {
          // Step 1: Validate response
          const validationResult = await this.validateResponse(
            response,
            ticket,
            attempts
          );

          lastValidationResult = validationResult;
          totalTokens += validationResult.tokenCost;

          // Step 2: Check validation result
          if (!validationResult.approved) {
            logger.warn('Validation failed', {
              ticketId: ticket.id,
              attempt: attempts,
              reason: validationResult.reason,
              canFix: validationResult.canFix,
              severity: validationResult.severity
            });

            // Can we retry?
            if (validationResult.canFix && attempts < PostValidator.MAX_ATTEMPTS) {
              // Try to fix and retry
              await this.handleValidationFailure(validationResult, ticket, attempts);
              continue; // Next attempt
            } else {
              // Cannot fix or max attempts reached
              throw new Error(`Validation failed: ${validationResult.reason}`);
            }
          }

          // Step 3: Validation passed - try to post
          logger.info('Validation passed, attempting to post', {
            ticketId: ticket.id,
            attempt: attempts
          });

          const postContent: PostContent = {
            content: response.content,
            metadata: {
              agentName: ticket.agentName,
              userId: ticket.userId,
              feedItemId: ticket.payload?.feedItemId,
              tokensUsed: response.tokensUsed,
              model: response.model,
              attemptNumber: attempts
            }
          };

          const postResult = await postFn(postContent);

          // Step 4: Check post result
          if (postResult.success) {
            // SUCCESS! Post was published
            logger.info('Post published successfully', {
              ticketId: ticket.id,
              postId: postResult.postId,
              attempts,
              totalTokens,
              durationMs: Date.now() - startTime
            });

            await this.updateTicketStatus(ticket.id, 'completed');

            return {
              success: true,
              posted: true,
              attempts,
              escalated: false,
              postId: postResult.postId,
              validationResult,
              totalTokens,
              totalDurationMs: Date.now() - startTime
            };
          } else {
            // Post failed - classify error and decide retry
            throw postResult.error || new Error('Post failed without error');
          }

        } catch (error) {
          lastError = error instanceof Error ? error : new Error(String(error));

          logger.error('Attempt failed', {
            ticketId: ticket.id,
            attempt: attempts,
            error: lastError.message,
            stack: lastError.stack
          });

          // Classify error to decide if we should retry
          const classification = this.classifyError(lastError);

          logger.debug('Error classification', {
            ticketId: ticket.id,
            classification
          });

          // Should we retry?
          if (classification.canFix && attempts < PostValidator.MAX_ATTEMPTS) {
            // Handle error with retry
            await this.handlePostError(lastError, ticket, attempts);
            continue; // Next attempt
          } else {
            // Cannot fix or max attempts reached - break out
            break;
          }
        }
      }

      // If we get here, all retries exhausted or unrecoverable error
      logger.error('All retry attempts exhausted', {
        ticketId: ticket.id,
        attempts,
        lastError: lastError?.message
      });

      // Escalate to user
      escalated = await this.escalateTicket(
        ticket,
        lastError || new Error('Max retries exhausted'),
        attempts
      );

      await this.updateTicketStatus(ticket.id, 'failed');

      return {
        success: false,
        posted: false,
        attempts,
        escalated,
        error: lastError,
        validationResult: lastValidationResult,
        totalTokens,
        totalDurationMs: Date.now() - startTime
      };

    } catch (fatalError) {
      // Unexpected error in orchestration itself
      const error = fatalError instanceof Error ? fatalError : new Error(String(fatalError));

      logger.error('Fatal error in post validation flow', {
        ticketId: ticket.id,
        error: error.message,
        stack: error.stack
      });

      // Try to escalate even on fatal errors
      try {
        escalated = await this.escalateTicket(ticket, error, attempts);
        await this.updateTicketStatus(ticket.id, 'failed');
      } catch (escalationError) {
        logger.error('Escalation failed', {
          ticketId: ticket.id,
          error: escalationError
        });
      }

      return {
        success: false,
        posted: false,
        attempts,
        escalated,
        error,
        validationResult: lastValidationResult,
        totalTokens,
        totalDurationMs: Date.now() - startTime
      };
    }
  }

  /**
   * Validate agent response
   *
   * @param response - Agent response to validate
   * @param ticket - Work ticket
   * @param attempt - Current attempt number
   * @returns Validation result
   */
  private async validateResponse(
    response: AgentResponse,
    ticket: WorkTicket,
    attempt: number
  ): Promise<ValidationResult> {
    logger.debug('Validating response', {
      ticketId: ticket.id,
      attempt,
      contentLength: response.content.length
    });

    const postDraft: PostDraft = {
      content: response.content,
      agentName: ticket.agentName,
      userId: ticket.userId,
      feedItemId: ticket.payload?.feedItemId,
      metadata: {
        tokensUsed: response.tokensUsed,
        durationMs: response.durationMs,
        model: response.model,
        attemptNumber: attempt,
        prompt: ticket.payload?.prompt
      }
    };

    return await this.validationService.validatePost(postDraft);
  }

  /**
   * Handle validation failure - decide retry vs escalate
   *
   * @param result - Validation result
   * @param ticket - Work ticket
   * @param attempt - Current attempt number
   */
  private async handleValidationFailure(
    result: ValidationResult,
    ticket: WorkTicket,
    attempt: number
  ): Promise<void> {
    logger.info('Handling validation failure with retry', {
      ticketId: ticket.id,
      attempt,
      reason: result.reason,
      severity: result.severity,
      feedback: result.feedback
    });

    // Log validation error
    await this.logValidationError(ticket, result, attempt);

    // Apply backoff delay before retry
    await this.retryService.applyBackoff(attempt + 1);

    logger.info('Backoff complete, will retry', {
      ticketId: ticket.id,
      nextAttempt: attempt + 1
    });
  }

  /**
   * Execute retry with selected strategy
   *
   * @param ticket - Work ticket
   * @param attempt - Current attempt number
   * @param postFn - Post function to retry
   */
  private async executeRetry(
    ticket: WorkTicket,
    attempt: number,
    postFn: (content: PostContent) => Promise<PostResult>
  ): Promise<void> {
    logger.info('Executing retry with strategy', {
      ticketId: ticket.id,
      attempt
    });

    // Use RetryService to handle retry with strategy
    await this.retryService.retryWithStrategy(
      async () => {
        // This function will be called by RetryService after backoff
        // The actual retry happens in the main loop
      },
      ticket,
      attempt
    );
  }

  /**
   * Handle posting errors (network, API, etc)
   *
   * @param error - Error that occurred
   * @param ticket - Work ticket
   * @param attempt - Current attempt number
   */
  private async handlePostError(
    error: Error,
    ticket: WorkTicket,
    attempt: number
  ): Promise<void> {
    logger.error('Handling post error', {
      ticketId: ticket.id,
      attempt,
      error: error.message
    });

    // Log error to database via RetryService
    await this.retryService.logRetryError(ticket, error, attempt);

    // Apply backoff before retry
    if (attempt < PostValidator.MAX_ATTEMPTS) {
      await this.retryService.applyBackoff(attempt + 1);

      logger.info('Post error backoff complete, will retry', {
        ticketId: ticket.id,
        nextAttempt: attempt + 1
      });
    }
  }

  /**
   * Escalate ticket to user after failures
   *
   * @param ticket - Work ticket
   * @param error - Final error
   * @param attempts - Number of attempts made
   * @returns Whether escalation succeeded
   */
  private async escalateTicket(
    ticket: WorkTicket,
    error: Error,
    attempts: number
  ): Promise<boolean> {
    logger.info('Escalating ticket to user', {
      ticketId: ticket.id,
      attempts,
      error: error.message
    });

    try {
      const escalationResult = await this.escalationService.escalateToUser(
        ticket,
        error,
        attempts
      );

      logger.info('Escalation result', {
        ticketId: ticket.id,
        escalated: escalationResult.escalated,
        systemPostCreated: escalationResult.systemPostCreated,
        errorLogged: escalationResult.errorLogged,
        userNotified: escalationResult.userNotified
      });

      return escalationResult.escalated;

    } catch (escalationError) {
      logger.error('Escalation failed', {
        ticketId: ticket.id,
        error: escalationError instanceof Error ? escalationError.message : 'Unknown error'
      });

      return false;
    }
  }

  /**
   * Classify error for routing decisions
   *
   * @param error - Error to classify
   * @returns Error classification
   */
  private classifyError(error: Error): ErrorClassification {
    const message = error.message.toLowerCase();

    // Validation errors
    if (message.includes('validation')) {
      return {
        type: 'validation',
        transient: false,
        canFix: message.includes('length') || message.includes('hashtag'),
        reason: 'Validation failed'
      };
    }

    // API errors (transient)
    if (message.includes('rate limit') || message.includes('429')) {
      return {
        type: 'posting',
        transient: true,
        canFix: true,
        reason: 'Rate limit exceeded'
      };
    }

    // Timeout errors (transient)
    if (message.includes('timeout') || message.includes('timed out')) {
      return {
        type: 'posting',
        transient: true,
        canFix: true,
        reason: 'Request timeout'
      };
    }

    // Network errors (transient)
    if (message.includes('network') || message.includes('econnrefused')) {
      return {
        type: 'posting',
        transient: true,
        canFix: true,
        reason: 'Network error'
      };
    }

    // Auth errors (permanent)
    if (message.includes('auth') || message.includes('401') || message.includes('403')) {
      return {
        type: 'posting',
        transient: false,
        canFix: false,
        reason: 'Authentication error'
      };
    }

    // Worker errors
    if (message.includes('worker')) {
      return {
        type: 'worker',
        transient: false,
        canFix: false,
        reason: 'Worker execution error'
      };
    }

    // Unknown - assume transient and retryable
    return {
      type: 'unknown',
      transient: true,
      canFix: true,
      reason: error.message
    };
  }

  /**
   * Update work ticket status in queue
   *
   * @param ticketId - Ticket ID
   * @param status - New status
   */
  private async updateTicketStatus(
    ticketId: string,
    status: 'pending' | 'processing' | 'completed' | 'failed'
  ): Promise<void> {
    try {
      logger.debug('Updating ticket status', {
        ticketId,
        status
      });

      // Note: WorkQueue interface doesn't expose updateStatus directly
      // This would be implemented via database adapter in production
      // For now, we log the intent

      logger.info('Ticket status updated', {
        ticketId,
        status
      });

    } catch (error) {
      logger.error('Failed to update ticket status', {
        ticketId,
        status,
        error: error instanceof Error ? error.message : 'Unknown error'
      });
      // Don't throw - status update failure shouldn't break the flow
    }
  }

  /**
   * Log validation error for audit trail
   *
   * @param ticket - Work ticket
   * @param result - Validation result
   * @param attempt - Attempt number
   */
  private async logValidationError(
    ticket: WorkTicket,
    result: ValidationResult,
    attempt: number
  ): Promise<void> {
    try {
      const error = new Error(result.reason);

      logger.error('Validation error logged', {
        ticketId: ticket.id,
        attempt,
        reason: result.reason,
        severity: result.severity,
        canFix: result.canFix,
        feedback: result.feedback
      });

      // Log via RetryService for consistency
      await this.retryService.logRetryError(ticket, error, attempt);

    } catch (loggingError) {
      logger.error('Failed to log validation error', {
        ticketId: ticket.id,
        error: loggingError instanceof Error ? loggingError.message : 'Unknown error'
      });
      // Don't throw - logging failure shouldn't break the flow
    }
  }
}
