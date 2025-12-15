/**
 * AgentFeedAPIClient - HTTP client for posting outcomes to the agent feed
 *
 * Features:
 * - Automatic retry logic with exponential backoff
 * - Comprehensive error handling
 * - Request/response logging
 * - Type-safe interfaces
 * - skipTicket parameter to prevent infinite loops
 *
 * Critical: Always use skipTicket=true when posting from workers to prevent
 * infinite recursion (agent post → ticket → agent post → ticket → ...)
 */

import axios, { AxiosInstance, AxiosError } from 'axios';
import logger from './logger';

/**
 * Configuration options for the API client
 */
export interface AgentFeedAPIClientConfig {
  /** Base URL for the API (e.g., 'http://localhost:3001/api') */
  baseUrl: string;
  /** Request timeout in milliseconds */
  timeout?: number;
  /** Maximum number of retry attempts for failed requests */
  retryAttempts?: number;
  /** Base delay between retries in milliseconds (will use exponential backoff) */
  retryDelay?: number;
}

/**
 * Request to create a comment on a post
 */
export interface CreateCommentRequest {
  /** Post ID to comment on */
  post_id: string;
  /** Comment content (markdown supported) */
  content: string;
  /** Author agent name (e.g., 'avi') */
  author_agent: string;
  /** Optional parent comment ID for threaded replies */
  parent_id?: string;
  /** User ID for multi-tenant support */
  userId: string;
  /** CRITICAL: Skip ticket creation to prevent infinite loops */
  skipTicket?: boolean;
}

/**
 * Request to create a new post
 */
export interface CreatePostRequest {
  /** Post title */
  title: string;
  /** Post content (markdown supported) */
  content: string;
  /** Author agent name (e.g., 'avi') */
  author_agent: string;
  /** User ID for multi-tenant support */
  userId: string;
  /** Optional tags */
  tags?: string[];
  /** Optional metadata */
  metadata?: Record<string, any>;
  /** CRITICAL: Skip ticket creation to prevent infinite loops */
  skipTicket?: boolean;
}

/**
 * Comment response from API
 */
export interface Comment {
  /** Comment ID */
  id: string;
  /** Post ID this comment belongs to */
  post_id: string;
  /** Comment content */
  content: string;
  /** Author agent name */
  author_agent: string;
  /** Parent comment ID (null for top-level) */
  parent_id: string | null;
  /** Mentioned users */
  mentioned_users: string[];
  /** Nesting depth */
  depth: number;
  /** Creation timestamp */
  created_at: string;
  /** Update timestamp */
  updated_at: string;
}

/**
 * Post response from API
 */
export interface Post {
  /** Post ID */
  id: number;
  /** Post title */
  title: string;
  /** Post content */
  content: string;
  /** Author agent name */
  author_agent: string;
  /** Optional hook */
  hook: string | null;
  /** Optional content body */
  content_body: string | null;
  /** Mentioned agents */
  mentioned_agents: string[];
  /** Tags */
  tags: string[];
  /** Creation timestamp */
  created_at: string;
  /** Update timestamp */
  updated_at: string;
  /** Published timestamp */
  published_at: string;
}

/**
 * Standard API response wrapper
 */
interface ApiResponse<T> {
  success: boolean;
  data: T;
  ticket?: {
    id: number;
    status: string;
  } | null;
  message: string;
  source: string;
  error?: string;
}

/**
 * HTTP client for Agent Feed API with retry logic and error handling
 */
export class AgentFeedAPIClient {
  private axiosInstance: AxiosInstance;
  private retryAttempts: number;
  private retryDelay: number;

  constructor(config: AgentFeedAPIClientConfig) {
    this.retryAttempts = config.retryAttempts ?? 3;
    this.retryDelay = config.retryDelay ?? 1000;

    // Create axios instance with base configuration
    this.axiosInstance = axios.create({
      baseURL: config.baseUrl,
      timeout: config.timeout ?? 10000,
      headers: {
        'Content-Type': 'application/json',
      },
    });

    // Add response interceptor for logging
    this.axiosInstance.interceptors.response.use(
      (response) => {
        logger.debug('API request succeeded', {
          url: response.config.url,
          status: response.status,
          duration: response.config.metadata?.duration,
        });
        return response;
      },
      (error) => {
        // Error will be handled by retry logic
        return Promise.reject(error);
      }
    );

    logger.info('AgentFeedAPIClient initialized', {
      baseUrl: config.baseUrl,
      timeout: config.timeout,
      retryAttempts: this.retryAttempts,
      retryDelay: this.retryDelay,
    });
  }

  /**
   * Create a comment on a post
   *
   * CRITICAL: Always pass skipTicket=true when posting from workers
   * to prevent infinite loop (agent comment → ticket → agent comment → ...)
   *
   * @param request Comment creation request
   * @returns Created comment
   * @throws Error if request fails after all retries
   */
  async createComment(request: CreateCommentRequest): Promise<Comment> {
    const { post_id, userId, author_agent, ...rest } = request;

    logger.info('Creating comment', {
      postId: post_id,
      userId,
      author: author_agent,
      skipTicket: request.skipTicket,
      contentLength: request.content.length,
    });

    // API expects 'author' field, not 'author_agent'
    const body = {
      ...rest,
      author: author_agent,
    };

    const operation = async () => {
      const response = await this.axiosInstance.post<ApiResponse<Comment>>(
        `/agent-posts/${post_id}/comments`,
        body,
        {
          headers: {
            'x-user-id': userId,
          },
        }
      );

      if (!response.data.success) {
        throw new Error(response.data.error || 'Failed to create comment');
      }

      return response.data.data;
    };

    try {
      const comment = await this.withRetry(operation, 'createComment');

      logger.info('Comment created successfully', {
        commentId: comment.id,
        postId: post_id,
        skipTicket: request.skipTicket,
      });

      return comment;
    } catch (error) {
      logger.error('Failed to create comment after all retries', {
        postId: post_id,
        error: error instanceof Error ? error.message : String(error),
        retryAttempts: this.retryAttempts,
      });
      throw error;
    }
  }

  /**
   * Create a new post
   *
   * CRITICAL: Always pass skipTicket=true when posting from workers
   * to prevent infinite loop (agent post → ticket → agent post → ...)
   *
   * @param request Post creation request
   * @returns Created post
   * @throws Error if request fails after all retries
   */
  async createPost(request: CreatePostRequest): Promise<Post> {
    const { userId, ...body } = request;

    logger.info('Creating post', {
      title: request.title,
      userId,
      skipTicket: request.skipTicket,
      contentLength: request.content.length,
      tags: request.tags,
    });

    const operation = async () => {
      const response = await this.axiosInstance.post<ApiResponse<Post>>(
        '/v1/agent-posts',
        body,
        {
          headers: {
            'x-user-id': userId,
          },
        }
      );

      if (!response.data.success) {
        throw new Error(response.data.error || 'Failed to create post');
      }

      return response.data.data;
    };

    try {
      const post = await this.withRetry(operation, 'createPost');

      logger.info('Post created successfully', {
        postId: post.id,
        title: post.title,
        skipTicket: request.skipTicket,
      });

      return post;
    } catch (error) {
      logger.error('Failed to create post after all retries', {
        title: request.title,
        error: error instanceof Error ? error.message : String(error),
        retryAttempts: this.retryAttempts,
      });
      throw error;
    }
  }

  /**
   * Execute an operation with retry logic and exponential backoff
   *
   * Retryable errors:
   * - Network errors (ECONNREFUSED, ETIMEDOUT, ENOTFOUND)
   * - HTTP 5xx errors (server errors)
   * - HTTP 429 (rate limit exceeded)
   *
   * Non-retryable errors:
   * - HTTP 4xx errors (except 429) - client errors
   * - Invalid request data
   * - Validation errors
   *
   * @param operation Function to execute
   * @param operationName Name for logging
   * @returns Result from operation
   * @throws Error if operation fails after all retries
   */
  private async withRetry<T>(
    operation: () => Promise<T>,
    operationName: string
  ): Promise<T> {
    let lastError: Error | null = null;

    for (let attempt = 1; attempt <= this.retryAttempts; attempt++) {
      try {
        const startTime = Date.now();
        const result = await operation();
        const duration = Date.now() - startTime;

        if (attempt > 1) {
          logger.info(`${operationName} succeeded on retry`, {
            attempt,
            duration,
          });
        }

        return result;
      } catch (error) {
        lastError = error as Error;

        // Check if error is retryable
        const isRetryable = this.isRetryableError(error);
        const isLastAttempt = attempt === this.retryAttempts;

        // Log the error
        if (isRetryable && !isLastAttempt) {
          const delay = this.calculateBackoff(attempt);
          logger.warn(`${operationName} failed, retrying`, {
            attempt,
            maxAttempts: this.retryAttempts,
            error: this.getErrorMessage(error),
            errorCode: this.getErrorCode(error),
            retryDelay: delay,
          });

          // Wait before retrying
          await this.sleep(delay);
        } else if (!isRetryable) {
          logger.error(`${operationName} failed with non-retryable error`, {
            attempt,
            error: this.getErrorMessage(error),
            errorCode: this.getErrorCode(error),
            httpStatus: this.getHttpStatus(error),
          });
          throw error; // Don't retry
        } else {
          // Last attempt failed
          logger.error(`${operationName} failed after all retries`, {
            attempt,
            maxAttempts: this.retryAttempts,
            error: this.getErrorMessage(error),
            errorCode: this.getErrorCode(error),
          });
        }
      }
    }

    // All retries exhausted
    throw lastError!;
  }

  /**
   * Determine if an error should be retried
   *
   * @param error Error to check
   * @returns true if error is retryable
   */
  private isRetryableError(error: any): boolean {
    // Network errors are retryable
    if (error.code === 'ECONNREFUSED' ||
        error.code === 'ETIMEDOUT' ||
        error.code === 'ENOTFOUND' ||
        error.code === 'ECONNRESET' ||
        error.code === 'EPIPE') {
      return true;
    }

    // Check HTTP status codes
    if (axios.isAxiosError(error)) {
      const status = error.response?.status;

      if (!status) {
        // No response received - network error
        return true;
      }

      // Retry on rate limiting
      if (status === 429) {
        return true;
      }

      // Retry on server errors (5xx)
      if (status >= 500 && status < 600) {
        return true;
      }

      // Don't retry on client errors (4xx)
      if (status >= 400 && status < 500) {
        return false;
      }
    }

    // Unknown error - retry to be safe
    return true;
  }

  /**
   * Calculate exponential backoff delay
   *
   * @param attempt Current attempt number (1-indexed)
   * @returns Delay in milliseconds
   */
  private calculateBackoff(attempt: number): number {
    // Exponential backoff: baseDelay * 2^(attempt-1)
    // attempt 1: baseDelay * 1 = 1000ms
    // attempt 2: baseDelay * 2 = 2000ms
    // attempt 3: baseDelay * 4 = 4000ms
    const delay = this.retryDelay * Math.pow(2, attempt - 1);

    // Add jitter (±10%) to prevent thundering herd
    const jitter = delay * (Math.random() * 0.2 - 0.1);

    return Math.round(delay + jitter);
  }

  /**
   * Sleep for specified milliseconds
   *
   * @param ms Milliseconds to sleep
   * @returns Promise that resolves after delay
   */
  private sleep(ms: number): Promise<void> {
    return new Promise(resolve => setTimeout(resolve, ms));
  }

  /**
   * Extract error message from various error types
   *
   * @param error Error object
   * @returns Error message string
   */
  private getErrorMessage(error: any): string {
    if (axios.isAxiosError(error)) {
      return error.response?.data?.error ||
             error.response?.data?.message ||
             error.message;
    }

    if (error instanceof Error) {
      return error.message;
    }

    return String(error);
  }

  /**
   * Extract error code from error object
   *
   * @param error Error object
   * @returns Error code string or undefined
   */
  private getErrorCode(error: any): string | undefined {
    return error.code || (axios.isAxiosError(error) ? error.code : undefined);
  }

  /**
   * Extract HTTP status code from axios error
   *
   * @param error Error object
   * @returns HTTP status code or undefined
   */
  private getHttpStatus(error: any): number | undefined {
    if (axios.isAxiosError(error)) {
      return error.response?.status;
    }
    return undefined;
  }

  /**
   * Health check - verify API is reachable
   *
   * @returns true if API is healthy
   */
  async healthCheck(): Promise<boolean> {
    try {
      await this.axiosInstance.get('/health');
      return true;
    } catch (error) {
      logger.warn('API health check failed', {
        error: this.getErrorMessage(error),
      });
      return false;
    }
  }
}

/**
 * Create a default AgentFeedAPIClient instance using environment variables
 *
 * @returns Configured API client
 */
export function createDefaultClient(): AgentFeedAPIClient {
  const baseUrl = process.env.AGENT_FEED_API_URL || 'http://localhost:3001/api';
  const timeout = parseInt(process.env.AGENT_FEED_API_TIMEOUT || '10000');
  const retryAttempts = parseInt(process.env.AGENT_FEED_API_RETRY_ATTEMPTS || '3');
  const retryDelay = parseInt(process.env.AGENT_FEED_API_RETRY_DELAY || '1000');

  return new AgentFeedAPIClient({
    baseUrl,
    timeout,
    retryAttempts,
    retryDelay,
  });
}
