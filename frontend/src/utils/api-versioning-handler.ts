/**
 * API Versioning Handler
 * Utilities for managing mixed API versioning scenarios in Claude Instance Manager
 * 
 * This module handles the complexity of having:
 * - Instance operations (CRUD) at /api/claude/
 * - SSE streaming at /api/v1/claude/instances/:id/terminal/stream
 * - Error recovery strategies for version mismatches
 */

export interface APIEndpoint {
  path: string;
  version: 'v1' | 'none';
  description: string;
}

export interface APIVersioningConfig {
  baseUrl: string;
  endpoints: {
    instances: APIEndpoint;
    instanceById: APIEndpoint;
    instanceCreate: APIEndpoint;
    instanceTerminate: APIEndpoint;
    sseStream: APIEndpoint;
  };
}

/**
 * Default API versioning configuration
 * Documents the mixed API versioning approach
 */
export const DEFAULT_API_CONFIG: APIVersioningConfig = {
  baseUrl: 'http://localhost:3000',
  endpoints: {
    instances: {
      path: '/api/claude/instances',
      version: 'none',
      description: 'List all Claude instances'
    },
    instanceById: {
      path: '/api/claude/instances/:id',
      version: 'none', 
      description: 'Get specific instance details'
    },
    instanceCreate: {
      path: '/api/claude/instances',
      version: 'none',
      description: 'Create new Claude instance'
    },
    instanceTerminate: {
      path: '/api/claude/instances/:id',
      version: 'none',
      description: 'Terminate Claude instance'
    },
    sseStream: {
      path: '/api/v1/claude/instances/:id/terminal/stream',
      version: 'v1',
      description: 'SSE terminal stream connection'
    }
  }
};

/**
 * Error types for API versioning issues
 */
export enum APIVersioningErrorType {
  ENDPOINT_NOT_FOUND = 'ENDPOINT_NOT_FOUND',
  VERSION_MISMATCH = 'VERSION_MISMATCH',
  NETWORK_ERROR = 'NETWORK_ERROR',
  TIMEOUT_ERROR = 'TIMEOUT_ERROR',
  PARSING_ERROR = 'PARSING_ERROR'
}

export interface APIVersioningError {
  type: APIVersioningErrorType;
  message: string;
  endpoint: string;
  suggestedAction: string;
  recoveryStrategy?: () => Promise<any>;
}

/**
 * Enhanced error classification for API versioning scenarios
 */
export class APIVersioningErrorHandler {
  static classifyError(error: any, endpoint: string): APIVersioningError {
    // Network or fetch errors
    if (error instanceof TypeError && error.message.includes('Failed to fetch')) {
      return {
        type: APIVersioningErrorType.NETWORK_ERROR,
        message: 'Network connection failed',
        endpoint,
        suggestedAction: 'Check network connection and server status'
      };
    }

    // 404 errors - likely endpoint version mismatch
    if (error.message?.includes('404') || error.status === 404) {
      return {
        type: APIVersioningErrorType.ENDPOINT_NOT_FOUND,
        message: 'API endpoint not found',
        endpoint,
        suggestedAction: 'Verify API endpoint version and path'
      };
    }

    // Parsing errors
    if (error instanceof SyntaxError) {
      return {
        type: APIVersioningErrorType.PARSING_ERROR,
        message: 'Invalid JSON response from server',
        endpoint,
        suggestedAction: 'Check server response format'
      };
    }

    // Timeout errors
    if (error.name === 'AbortError' || error.message?.includes('timeout')) {
      return {
        type: APIVersioningErrorType.TIMEOUT_ERROR,
        message: 'Request timeout',
        endpoint,
        suggestedAction: 'Retry request or check server performance'
      };
    }

    // Generic version mismatch
    return {
      type: APIVersioningErrorType.VERSION_MISMATCH,
      message: error.message || 'API version mismatch',
      endpoint,
      suggestedAction: 'Check API version compatibility'
    };
  }

  /**
   * Generate user-friendly error messages for API versioning issues
   */
  static getErrorMessage(error: APIVersioningError): string {
    const messages = {
      [APIVersioningErrorType.ENDPOINT_NOT_FOUND]: 
        `API endpoint not available: ${error.endpoint}`,
      [APIVersioningErrorType.VERSION_MISMATCH]: 
        `API version mismatch for ${error.endpoint}`,
      [APIVersioningErrorType.NETWORK_ERROR]: 
        'Network connection error - please check your internet connection',
      [APIVersioningErrorType.TIMEOUT_ERROR]: 
        'Request timeout - server may be overloaded',
      [APIVersioningErrorType.PARSING_ERROR]: 
        'Server response format error'
    };

    return messages[error.type] || error.message;
  }
}

/**
 * URL builder for mixed API versioning
 */
export class APIEndpointBuilder {
  constructor(private config: APIVersioningConfig = DEFAULT_API_CONFIG) {}

  /**
   * Build URL for instance listing
   */
  buildInstanceListUrl(): string {
    return `${this.config.baseUrl}${this.config.endpoints.instances.path}`;
  }

  /**
   * Build URL for instance creation
   */
  buildInstanceCreateUrl(): string {
    return `${this.config.baseUrl}${this.config.endpoints.instanceCreate.path}`;
  }

  /**
   * Build URL for instance termination
   */
  buildInstanceTerminateUrl(instanceId: string): string {
    return `${this.config.baseUrl}${this.config.endpoints.instanceTerminate.path.replace(':id', instanceId)}`;
  }

  /**
   * Build URL for SSE stream connection
   */
  buildSSEStreamUrl(instanceId: string): string {
    return `${this.config.baseUrl}${this.config.endpoints.sseStream.path.replace(':id', instanceId)}`;
  }

  /**
   * Validate that an endpoint exists in configuration
   */
  validateEndpoint(endpoint: keyof APIVersioningConfig['endpoints']): boolean {
    return !!this.config.endpoints[endpoint];
  }
}

/**
 * Recovery strategies for API versioning errors
 */
export class APIRecoveryStrategies {
  /**
   * Attempt to recover from endpoint not found by trying fallback versions
   */
  static async attemptEndpointRecovery(
    originalUrl: string, 
    fetchOptions?: RequestInit
  ): Promise<Response> {
    const fallbackUrls = [
      originalUrl,
      originalUrl.replace('/api/claude/', '/api/v1/claude/'),
      originalUrl.replace('/api/v1/claude/', '/api/claude/'),
    ];

    for (const url of fallbackUrls) {
      try {
        const response = await fetch(url, fetchOptions);
        if (response.ok) {
          console.log(`✅ API Recovery successful with URL: ${url}`);
          return response;
        }
      } catch (error) {
        console.warn(`⚠️ Recovery attempt failed for ${url}:`, error);
        continue;
      }
    }

    throw new Error('All recovery attempts failed');
  }

  /**
   * Retry with exponential backoff
   */
  static async retryWithBackoff<T>(
    operation: () => Promise<T>,
    maxRetries: number = 3,
    baseDelayMs: number = 1000
  ): Promise<T> {
    let lastError: Error;

    for (let attempt = 0; attempt < maxRetries; attempt++) {
      try {
        return await operation();
      } catch (error) {
        lastError = error as Error;
        
        if (attempt === maxRetries - 1) {
          throw lastError;
        }

        const delay = baseDelayMs * Math.pow(2, attempt);
        console.log(`Retry attempt ${attempt + 1}/${maxRetries} after ${delay}ms`);
        await new Promise(resolve => setTimeout(resolve, delay));
      }
    }

    throw lastError!;
  }
}

/**
 * Comprehensive API client for mixed versioning scenarios
 */
export class ClaudeInstanceAPIClient {
  private endpointBuilder: APIEndpointBuilder;

  constructor(config?: APIVersioningConfig) {
    this.endpointBuilder = new APIEndpointBuilder(config);
  }

  /**
   * Fetch instances with automatic error recovery
   */
  async fetchInstances(): Promise<any> {
    const url = this.endpointBuilder.buildInstanceListUrl();
    
    try {
      return await APIRecoveryStrategies.retryWithBackoff(async () => {
        const response = await APIRecoveryStrategies.attemptEndpointRecovery(url);
        const data = await response.json();
        
        if (!data.success) {
          throw new Error(data.error || data.message || 'Failed to fetch instances');
        }
        
        return data;
      });
    } catch (error) {
      const versioningError = APIVersioningErrorHandler.classifyError(error, url);
      throw new Error(APIVersioningErrorHandler.getErrorMessage(versioningError));
    }
  }

  /**
   * Create instance with automatic error recovery
   */
  async createInstance(config: any): Promise<any> {
    const url = this.endpointBuilder.buildInstanceCreateUrl();
    
    try {
      return await APIRecoveryStrategies.retryWithBackoff(async () => {
        const response = await APIRecoveryStrategies.attemptEndpointRecovery(url, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(config)
        });
        
        const data = await response.json();
        
        if (!data.success) {
          throw new Error(data.error || data.message || 'Failed to create instance');
        }
        
        return data;
      });
    } catch (error) {
      const versioningError = APIVersioningErrorHandler.classifyError(error, url);
      throw new Error(APIVersioningErrorHandler.getErrorMessage(versioningError));
    }
  }

  /**
   * Terminate instance with automatic error recovery
   */
  async terminateInstance(instanceId: string): Promise<any> {
    const url = this.endpointBuilder.buildInstanceTerminateUrl(instanceId);
    
    try {
      return await APIRecoveryStrategies.retryWithBackoff(async () => {
        const response = await APIRecoveryStrategies.attemptEndpointRecovery(url, {
          method: 'DELETE'
        });
        
        const data = await response.json();
        
        if (!data.success) {
          throw new Error(data.error || data.message || 'Failed to terminate instance');
        }
        
        return data;
      });
    } catch (error) {
      const versioningError = APIVersioningErrorHandler.classifyError(error, url);
      throw new Error(APIVersioningErrorHandler.getErrorMessage(versioningError));
    }
  }

  /**
   * Get API configuration for debugging
   */
  getConfiguration(): APIVersioningConfig {
    return this.endpointBuilder['config'];
  }
}

/**
 * Singleton instance for easy access
 */
export const claudeInstanceAPI = new ClaudeInstanceAPIClient();

/**
 * Development documentation helper
 */
export const MIXED_API_VERSIONING_DOCS = {
  overview: `
    This system uses mixed API versioning to handle the transition from WebSocket to HTTP/SSE:
    
    Instance Operations (CRUD):
    - List instances: GET /api/claude/instances
    - Create instance: POST /api/claude/instances  
    - Get instance: GET /api/claude/instances/:id
    - Terminate instance: DELETE /api/claude/instances/:id
    
    SSE Streaming (Real-time):
    - Terminal stream: /api/v1/claude/instances/:id/terminal/stream
    - Connection status: /api/v1/claude/instances/:id/sse/status
    
    Error Recovery:
    - Automatic fallback between versioned and non-versioned endpoints
    - Exponential backoff retry strategy
    - Comprehensive error classification and user-friendly messages
  `,
  
  migrationPath: `
    Future migration path to unify API versioning:
    1. Phase 1: Current mixed versioning (instance ops at /api/claude/, SSE at /api/v1/)
    2. Phase 2: Move all endpoints to /api/v1/ or /api/v2/
    3. Phase 3: Deprecate mixed versioning, single version for all endpoints
  `,

  troubleshooting: `
    Common issues and solutions:
    - 404 on instance listing: Check if simple-claude-launcher routes are mounted correctly
    - SSE connection failures: Verify /api/v1/ SSE endpoints are available
    - CORS issues: Ensure both /api/claude/ and /api/v1/ have proper CORS configuration
    - Version mismatches: Use APIRecoveryStrategies.attemptEndpointRecovery()
  `
};