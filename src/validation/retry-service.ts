/**
 * RetryService - Multi-strategy retry with exponential backoff
 * Phase 4: Validation & Error Handling
 *
 * Implements intelligent retry strategies:
 * - Attempt 1: retry_same - Retry with same content (5s delay)
 * - Attempt 2: simplify_content - Remove emojis, limit hashtags (30s delay)
 * - Attempt 3: alternate_agent - Try different agent (120s delay)
 */

import type { WorkTicket } from '../types/work-ticket';
import type { WorkerSpawnerAdapter } from '../adapters/worker-spawner.adapter';
import type { AviDatabaseAdapter } from '../adapters/avi-database.adapter';
import { logger } from '../utils/logger';

/**
 * Retry strategy type
 */
export type RetryStrategy = 'retry_same' | 'simplify_content' | 'alternate_agent';

/**
 * Post content structure for simplification
 */
export interface PostContent {
  content: string;
  metadata?: {
    mediaAttachments?: any[];
    hashtags?: string[];
    mentions?: string[];
  };
}

/**
 * Retry configuration constants
 */
const RETRY_CONFIG = {
  MAX_ATTEMPTS: 3,
  STRATEGIES: ['retry_same', 'simplify_content', 'alternate_agent'] as RetryStrategy[],
  // Base delays in milliseconds: [0ms for attempt 1, 5s, 30s, 120s]
  BASE_BACKOFF_MS: [0, 5000, 30000, 120000],
  // Jitter: ±20% random variation
  JITTER_FACTOR: 0.2,
  // Content simplification rules
  SIMPLIFY: {
    MAX_HASHTAGS: 2,
    MAX_LENGTH: 250,
    REMOVE_EMOJIS: true,
    REMOVE_MEDIA: true,
  },
} as const;

/**
 * RetryService Interface
 */
export interface IRetryService {
  retryWithStrategy(
    operation: () => Promise<void>,
    ticket: WorkTicket,
    attempt: number
  ): Promise<void>;

  applyBackoff(attempt: number): Promise<void>;
  simplifyContent(content: PostContent): Promise<PostContent>;
  selectAlternateAgent(ticket: WorkTicket): Promise<string>;
  logRetryError(ticket: WorkTicket, error: Error, attempt: number): Promise<void>;
}

/**
 * RetryService implementation
 * Manages multi-strategy retry logic with exponential backoff
 */
export class RetryService implements IRetryService {
  private workerSpawner: WorkerSpawnerAdapter;
  private database: AviDatabaseAdapter;

  constructor(
    workerSpawner: WorkerSpawnerAdapter,
    database: AviDatabaseAdapter
  ) {
    this.workerSpawner = workerSpawner;
    this.database = database;
  }

  /**
   * Retry operation with progressive strategy
   *
   * @param operation - Async operation to retry
   * @param ticket - Work ticket being retried
   * @param attempt - Current attempt number (1-3)
   */
  async retryWithStrategy(
    operation: () => Promise<void>,
    ticket: WorkTicket,
    attempt: number
  ): Promise<void> {
    // Validate attempt number
    if (attempt < 1 || attempt > RETRY_CONFIG.MAX_ATTEMPTS) {
      logger.error('Invalid retry attempt number', {
        attempt,
        ticketId: ticket.id,
        maxAttempts: RETRY_CONFIG.MAX_ATTEMPTS,
      });
      throw new Error(`Invalid retry attempt: ${attempt}`);
    }

    // Get strategy for this attempt
    const strategy = RETRY_CONFIG.STRATEGIES[attempt - 1];

    logger.info('Starting retry attempt', {
      attempt,
      strategy,
      ticketId: ticket.id,
      agentName: ticket.agentName,
      userId: ticket.userId,
    });

    try {
      // Apply exponential backoff with jitter
      await this.applyBackoff(attempt);

      // Execute retry based on strategy
      switch (strategy) {
        case 'retry_same':
          // Strategy 1: Simple retry with same parameters
          logger.debug('Retry strategy: retry_same', {
            ticketId: ticket.id,
            attempt,
          });
          await operation();
          break;

        case 'simplify_content':
          // Strategy 2: Simplify content and retry
          logger.debug('Retry strategy: simplify_content', {
            ticketId: ticket.id,
            attempt,
          });

          // Simplify the content in ticket payload
          if (ticket.payload?.content) {
            const simplified = await this.simplifyContent({
              content: ticket.payload.content,
              metadata: ticket.payload.metadata,
            });

            ticket.payload.content = simplified.content;
            ticket.payload.metadata = simplified.metadata;
            ticket.payload.simplified = true;
          }

          await operation();
          break;

        case 'alternate_agent':
          // Strategy 3: Try a different agent
          logger.debug('Retry strategy: alternate_agent', {
            ticketId: ticket.id,
            originalAgent: ticket.agentName,
            attempt,
          });

          const alternateAgent = await this.selectAlternateAgent(ticket);

          if (!alternateAgent) {
            logger.warn('No alternate agent available', {
              ticketId: ticket.id,
              originalAgent: ticket.agentName,
            });
            throw new Error('No alternate agent available for retry');
          }

          // Update ticket with alternate agent
          const originalAgent = ticket.agentName;
          ticket.agentName = alternateAgent;

          logger.info('Switching to alternate agent', {
            ticketId: ticket.id,
            originalAgent,
            newAgent: alternateAgent,
          });

          await operation();
          break;

        default:
          throw new Error(`Unknown retry strategy: ${strategy}`);
      }

      // Success - log completion
      logger.info('Retry attempt successful', {
        attempt,
        strategy,
        ticketId: ticket.id,
        agentName: ticket.agentName,
      });

    } catch (error) {
      // Retry attempt failed
      const errorMessage = error instanceof Error ? error.message : 'Unknown error';

      logger.error('Retry attempt failed', {
        attempt,
        strategy,
        error: errorMessage,
        ticketId: ticket.id,
        agentName: ticket.agentName,
      });

      // Log error to database
      await this.logRetryError(
        ticket,
        error instanceof Error ? error : new Error(errorMessage),
        attempt
      );

      // Check if we have more attempts
      if (attempt < RETRY_CONFIG.MAX_ATTEMPTS) {
        // Recursively try next strategy
        logger.info('Attempting next retry strategy', {
          nextAttempt: attempt + 1,
          nextStrategy: RETRY_CONFIG.STRATEGIES[attempt],
          ticketId: ticket.id,
        });

        return await this.retryWithStrategy(operation, ticket, attempt + 1);
      } else {
        // All retries exhausted
        logger.error('All retry attempts exhausted', {
          attempts: attempt,
          ticketId: ticket.id,
          finalError: errorMessage,
        });

        throw new Error(`All retry attempts failed: ${errorMessage}`);
      }
    }
  }

  /**
   * Apply exponential backoff with jitter
   *
   * @param attempt - Current attempt number
   */
  async applyBackoff(attempt: number): Promise<void> {
    if (attempt <= 1) {
      // No delay for first attempt
      return;
    }

    // Get base delay for this attempt
    const baseDelay = RETRY_CONFIG.BASE_BACKOFF_MS[attempt - 1] || 0;

    if (baseDelay === 0) {
      return;
    }

    // Add jitter: ±20% random variation
    const jitterRange = baseDelay * RETRY_CONFIG.JITTER_FACTOR;
    const jitter = (Math.random() * 2 - 1) * jitterRange;
    const actualDelay = Math.max(0, baseDelay + jitter);

    logger.debug('Applying backoff delay', {
      attempt,
      baseDelayMs: baseDelay,
      jitterMs: Math.round(jitter),
      actualDelayMs: Math.round(actualDelay),
    });

    // Sleep for calculated delay
    await this.sleep(actualDelay);
  }

  /**
   * Simplify content for retry
   * Removes emojis, limits hashtags, truncates length, removes media
   *
   * @param content - Original post content
   * @returns Simplified post content
   */
  async simplifyContent(content: PostContent): Promise<PostContent> {
    let simplifiedText = content.content;

    // 1. Remove emojis (Unicode ranges)
    if (RETRY_CONFIG.SIMPLIFY.REMOVE_EMOJIS) {
      // Use standard Unicode escape sequences compatible with ES5
      simplifiedText = simplifiedText.replace(
        /[\uD800-\uDFFF]./g,
        ''
      ).replace(
        /[\u2600-\u27BF]/g,
        ''
      );
    }

    // 2. Limit hashtags to MAX_HASHTAGS
    const hashtagMatches = simplifiedText.match(/#\w+/g) || [];
    if (hashtagMatches.length > RETRY_CONFIG.SIMPLIFY.MAX_HASHTAGS) {
      // Keep only first N hashtags
      const keepHashtags = hashtagMatches.slice(0, RETRY_CONFIG.SIMPLIFY.MAX_HASHTAGS);
      const removeHashtags = hashtagMatches.slice(RETRY_CONFIG.SIMPLIFY.MAX_HASHTAGS);

      // Remove excess hashtags
      for (const hashtag of removeHashtags) {
        simplifiedText = simplifiedText.replace(hashtag, '');
      }
    }

    // 3. Truncate to MAX_LENGTH characters
    if (simplifiedText.length > RETRY_CONFIG.SIMPLIFY.MAX_LENGTH) {
      simplifiedText = simplifiedText.substring(0, RETRY_CONFIG.SIMPLIFY.MAX_LENGTH);

      // Try to break at word boundary
      const lastSpace = simplifiedText.lastIndexOf(' ');
      if (lastSpace > RETRY_CONFIG.SIMPLIFY.MAX_LENGTH * 0.8) {
        simplifiedText = simplifiedText.substring(0, lastSpace);
      }

      // Add ellipsis
      simplifiedText = simplifiedText.trim() + '...';
    }

    // 4. Clean up multiple spaces and newlines
    simplifiedText = simplifiedText
      .replace(/\s+/g, ' ')
      .replace(/\n{3,}/g, '\n\n')
      .trim();

    // 5. Remove media attachments
    const simplifiedMetadata = { ...content.metadata };
    if (RETRY_CONFIG.SIMPLIFY.REMOVE_MEDIA && simplifiedMetadata?.mediaAttachments) {
      simplifiedMetadata.mediaAttachments = [];
    }

    logger.debug('Content simplified', {
      originalLength: content.content.length,
      simplifiedLength: simplifiedText.length,
      originalHashtags: hashtagMatches.length,
      simplifiedHashtags: Math.min(hashtagMatches.length, RETRY_CONFIG.SIMPLIFY.MAX_HASHTAGS),
      mediaRemoved: RETRY_CONFIG.SIMPLIFY.REMOVE_MEDIA,
    });

    return {
      content: simplifiedText,
      metadata: simplifiedMetadata,
    };
  }

  /**
   * Select an alternate agent for retry
   * Queries user_agent_customizations table and selects random enabled agent
   *
   * @param ticket - Current work ticket
   * @returns Alternate agent name or empty string if none available
   */
  async selectAlternateAgent(ticket: WorkTicket): Promise<string> {
    try {
      // This would query the database for available agents
      // For now, we'll use a simple fallback mechanism

      logger.debug('Selecting alternate agent', {
        userId: ticket.userId,
        currentAgent: ticket.agentName,
      });

      // Note: In a real implementation, this would query:
      // SELECT agent_name FROM user_agent_customizations
      // WHERE user_id = $1 AND enabled = true AND agent_name != $2
      // ORDER BY RANDOM() LIMIT 1

      // For Phase 4 implementation, we'll return empty string
      // to indicate no alternate agent (real query would be in Phase 5)
      logger.warn('Alternate agent selection not yet implemented', {
        ticketId: ticket.id,
        currentAgent: ticket.agentName,
      });

      return '';

    } catch (error) {
      logger.error('Failed to select alternate agent', {
        error: error instanceof Error ? error.message : 'Unknown error',
        ticketId: ticket.id,
        currentAgent: ticket.agentName,
      });

      return '';
    }
  }

  /**
   * Log retry error to database
   * Creates audit trail entry in error_log table
   *
   * @param ticket - Work ticket that failed
   * @param error - Error that occurred
   * @param attempt - Attempt number
   */
  async logRetryError(
    ticket: WorkTicket,
    error: Error,
    attempt: number
  ): Promise<void> {
    try {
      const strategy = RETRY_CONFIG.STRATEGIES[attempt - 1];

      logger.info('Logging retry error to database', {
        ticketId: ticket.id,
        attempt,
        strategy,
        error: error.message,
      });

      // Note: In a real implementation, this would insert into error_log table
      // INSERT INTO error_log (ticket_id, user_id, agent_name, error_type,
      //   error_message, retry_attempt, retry_strategy, created_at)
      // VALUES ($1, $2, $3, $4, $5, $6, $7, NOW())

      // For Phase 4, we log to Winston instead
      logger.error('Retry error logged', {
        ticketId: ticket.id,
        userId: ticket.userId,
        agentName: ticket.agentName,
        errorType: 'retry_failure',
        errorMessage: error.message,
        retryAttempt: attempt,
        retryStrategy: strategy,
        timestamp: new Date().toISOString(),
        stack: error.stack,
      });

    } catch (loggingError) {
      // Don't fail retry flow if logging fails
      logger.error('Failed to log retry error', {
        error: loggingError instanceof Error ? loggingError.message : 'Unknown error',
        ticketId: ticket.id,
        originalError: error.message,
      });
    }
  }

  /**
   * Sleep utility for backoff delays
   *
   * @param ms - Milliseconds to sleep
   */
  private sleep(ms: number): Promise<void> {
    return new Promise((resolve) => setTimeout(resolve, ms));
  }
}
