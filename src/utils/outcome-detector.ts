/**
 * OutcomeDetector - Determines if worker outcomes are worthy of posting to the feed
 *
 * This utility filters out routine operations and intermediate steps, ensuring
 * only substantive work with user value gets posted to the agent feed.
 *
 * Classification Criteria:
 * - POST-WORTHY: File modifications, substantive analysis, multi-step tasks
 * - NOT POST-WORTHY: Single reads, routine checks, intermediate failures
 */

import { logger } from './logger';

/**
 * Worker execution result structure
 */
export interface WorkerResult {
  success: boolean;
  output?: {
    content: string;
    toolsUsed: string[];
    model: string;
  };
  error?: Error | string;
  tokensUsed: number;
  duration: number;
}

/**
 * Work ticket structure (minimal required fields)
 */
export interface WorkTicket {
  id: string;
  userId: string;
  agentName: string;
  payload: {
    content?: string;
    post?: {
      content?: string;
    };
    post_metadata?: {
      type?: 'post' | 'comment' | 'autonomous';
      [key: string]: any;
    };
  };
}

/**
 * Metadata extracted from worker outcome
 */
export interface OutcomeMetadata {
  summary: string;
  details: string;
  filesModified: string[];
  toolsUsed: string[];
  duration: number;
  tokensUsed: number;
  success: boolean;
  error?: string;
}

/**
 * Configuration for outcome detection
 */
export interface OutcomeDetectorConfig {
  minToolsUsed: number;
  substantiveTools: string[];
  routineTools: string[];
  requireSuccess: boolean;
  postFailures: boolean;
  minContentLength: number;
  minDuration: number;
}

/**
 * Default configuration
 */
const DEFAULT_CONFIG: OutcomeDetectorConfig = {
  minToolsUsed: 1,
  substantiveTools: ['Write', 'Edit', 'Bash', 'NotebookEdit'],
  routineTools: ['Read', 'Glob', 'Grep'],
  requireSuccess: true,
  postFailures: false,
  minContentLength: 50,
  minDuration: 1000,
};

/**
 * OutcomeDetector - Main classification utility
 */
export class OutcomeDetector {
  private config: OutcomeDetectorConfig;

  constructor(config?: Partial<OutcomeDetectorConfig>) {
    this.config = {
      ...DEFAULT_CONFIG,
      ...config,
    };

    logger.debug('OutcomeDetector initialized', {
      config: this.config,
    });
  }

  /**
   * Main decision method: Determine if outcome should be posted
   *
   * Decision tree:
   * 1. Check task completion (success or final failure)
   * 2. Check for file modifications (Write/Edit)
   * 3. Check for substantial content
   * 4. Check for complex multi-tool usage
   * 5. Filter out routine operations
   * 6. Default to posting for ambiguous cases
   */
  isPostWorthy(result: WorkerResult, ticket: WorkTicket): boolean {
    const ticketId = ticket.id;

    // 1. Check task completion
    if (!this.isTaskComplete(result)) {
      logger.debug('Outcome not post-worthy: task incomplete', {
        ticketId,
        success: result.success,
        hasError: !!result.error,
      });
      return false;
    }

    // 2. Check for file modifications (always post-worthy)
    if (this.hasFileModifications(result)) {
      logger.debug('Outcome is post-worthy: file modifications detected', {
        ticketId,
        toolsUsed: result.output?.toolsUsed,
      });
      return true;
    }

    // 3. Check for substantial content
    if (this.hasSubstantialContent(result)) {
      logger.debug('Outcome is post-worthy: substantial content', {
        ticketId,
        contentLength: result.output?.content.length,
      });
      return true;
    }

    // 4. Check for complex multi-tool usage
    if (this.isComplexTask(result)) {
      logger.debug('Outcome is post-worthy: complex multi-tool task', {
        ticketId,
        toolsUsed: result.output?.toolsUsed,
      });
      return true;
    }

    // 5. Filter out routine operations
    if (this.isRoutineOperation(result)) {
      logger.debug('Outcome not post-worthy: routine operation', {
        ticketId,
        toolsUsed: result.output?.toolsUsed,
      });
      return false;
    }

    // 6. Default to posting for ambiguous cases
    logger.debug('Outcome is post-worthy: default behavior', {
      ticketId,
    });
    return true;
  }

  /**
   * Extract metadata from worker result for posting
   */
  extractMetadata(result: WorkerResult): OutcomeMetadata {
    const toolsUsed = result.output?.toolsUsed || [];
    const content = result.output?.content || '';

    // Extract files modified from content or tools
    const filesModified = this.extractModifiedFiles(result);

    // Generate summary from content
    const summary = this.generateSummary(result);

    // Generate detailed description
    const details = this.generateDetails(result);

    return {
      summary,
      details,
      filesModified,
      toolsUsed,
      duration: result.duration,
      tokensUsed: result.tokensUsed,
      success: result.success,
      error: result.error ? String(result.error) : undefined,
    };
  }

  /**
   * Check if task is complete (not intermediate)
   */
  private isTaskComplete(result: WorkerResult): boolean {
    // Success is always complete
    if (result.success) {
      return true;
    }

    // Failure is complete only if configured to post failures
    if (!result.success && this.config.postFailures) {
      return this.isFinalFailure(result);
    }

    return false;
  }

  /**
   * Check if error is final (not retryable)
   */
  private isFinalFailure(result: WorkerResult): boolean {
    if (!result.error) {
      return false;
    }

    const errorStr = String(result.error).toLowerCase();

    // Retryable errors (not final)
    const retryablePatterns = [
      'timeout',
      'retry',
      'temporary',
      'transient',
      'connection refused',
      'network error',
    ];

    return !retryablePatterns.some(pattern => errorStr.includes(pattern));
  }

  /**
   * Check if result includes file modifications
   */
  private hasFileModifications(result: WorkerResult): boolean {
    const toolsUsed = result.output?.toolsUsed || [];
    const { substantiveTools } = this.config;

    return toolsUsed.some(tool => substantiveTools.includes(tool));
  }

  /**
   * Check if result has substantial content
   */
  private hasSubstantialContent(result: WorkerResult): boolean {
    const content = result.output?.content || '';
    return content.length >= this.config.minContentLength;
  }

  /**
   * Check if this is a complex multi-step task
   */
  private isComplexTask(result: WorkerResult): boolean {
    const toolsUsed = result.output?.toolsUsed || [];
    return toolsUsed.length >= this.config.minToolsUsed + 2; // 3+ tools
  }

  /**
   * Check if this is a routine operation (filter out)
   */
  private isRoutineOperation(result: WorkerResult): boolean {
    // Check for single routine tool usage
    if (this.isSingleReadOperation(result)) {
      return true;
    }

    // Check for health check
    if (this.isHealthCheck(result)) {
      return true;
    }

    // Check for memory update
    if (this.isMemoryUpdate(result)) {
      return true;
    }

    return false;
  }

  /**
   * Check if only routine tools were used
   */
  private isSingleReadOperation(result: WorkerResult): boolean {
    const toolsUsed = result.output?.toolsUsed || [];
    const { routineTools } = this.config;

    // No tools used
    if (toolsUsed.length === 0) {
      return true;
    }

    // All tools are routine
    return toolsUsed.every(tool => routineTools.includes(tool));
  }

  /**
   * Check if this is a health check
   */
  private isHealthCheck(result: WorkerResult): boolean {
    const content = result.output?.content?.toLowerCase() || '';
    return (
      content.includes('health check') &&
      content.includes('operational')
    );
  }

  /**
   * Check if this is a memory update
   */
  private isMemoryUpdate(result: WorkerResult): boolean {
    const toolsUsed = result.output?.toolsUsed || [];
    return toolsUsed.includes('MemoryUpdate');
  }

  /**
   * Extract files modified from result
   */
  private extractModifiedFiles(result: WorkerResult): string[] {
    const content = result.output?.content || '';
    const toolsUsed = result.output?.toolsUsed || [];
    const files: string[] = [];

    // Extract from Write/Edit tools
    if (toolsUsed.includes('Write') || toolsUsed.includes('Edit')) {
      // Look for file paths in content
      const filePatterns = [
        /(?:modified|created|updated|wrote to|edited):\s*([^\n]+)/gi,
        /(?:file|path):\s*([^\s\n]+)/gi,
        /`([^`]+\.(ts|js|json|md|txt|py|go|rs))`/gi,
      ];

      for (const pattern of filePatterns) {
        const matches = content.matchAll(pattern);
        for (const match of matches) {
          if (match[1]) {
            files.push(match[1].trim());
          }
        }
      }
    }

    // Deduplicate
    return Array.from(new Set(files));
  }

  /**
   * Generate summary from result content
   */
  private generateSummary(result: WorkerResult): string {
    const content = result.output?.content || '';

    if (!result.success) {
      const errorMsg = String(result.error || 'Unknown error');
      return `Task failed: ${errorMsg}`;
    }

    // Extract first sentence or first 100 chars
    const firstSentence = content.split(/[.!?]\s/)[0];
    if (firstSentence && firstSentence.length > 0) {
      return firstSentence.length > 150
        ? firstSentence.substring(0, 147) + '...'
        : firstSentence;
    }

    // Fallback to first 100 chars
    return content.length > 100
      ? content.substring(0, 97) + '...'
      : content || 'Task completed';
  }

  /**
   * Generate detailed description
   */
  private generateDetails(result: WorkerResult): string {
    const content = result.output?.content || '';

    if (!result.success) {
      const errorMsg = String(result.error || 'Unknown error');
      return `Failed to complete task: ${errorMsg}`;
    }

    // Return full content, truncated if too long
    return content.length > 1000
      ? content.substring(0, 997) + '...'
      : content;
  }

  /**
   * Check for substantive work completion
   */
  hasSubstantiveWork(result: WorkerResult): boolean {
    return (
      this.hasFileModifications(result) ||
      this.hasSubstantialContent(result) ||
      this.isComplexTask(result)
    );
  }

  /**
   * Check if this is an intermediate step
   */
  isIntermediateStep(result: WorkerResult): boolean {
    // If task failed but error is retryable, it's intermediate
    if (!result.success && !this.isFinalFailure(result)) {
      return true;
    }

    // If duration is very short, might be intermediate
    if (result.duration < this.config.minDuration) {
      return true;
    }

    return false;
  }

  /**
   * Check if this is a tool-level operation (filter out)
   */
  isToolLevelOperation(result: WorkerResult): boolean {
    return this.isSingleReadOperation(result);
  }

  /**
   * Check if result has user-facing value
   */
  hasUserValue(result: WorkerResult): boolean {
    return (
      this.hasFileModifications(result) ||
      this.hasSubstantialContent(result) ||
      this.isComplexTask(result)
    );
  }
}

/**
 * Factory function to create OutcomeDetector with default config
 */
export function createOutcomeDetector(
  config?: Partial<OutcomeDetectorConfig>
): OutcomeDetector {
  return new OutcomeDetector(config);
}

/**
 * Convenience function to check if outcome is post-worthy
 */
export function isOutcomePostWorthy(
  result: WorkerResult,
  ticket: WorkTicket,
  config?: Partial<OutcomeDetectorConfig>
): boolean {
  const detector = new OutcomeDetector(config);
  return detector.isPostWorthy(result, ticket);
}
