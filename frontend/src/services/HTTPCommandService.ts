/**
 * HTTPCommandService - HTTP-based Command Execution Service
 * 
 * Provides HTTP POST-based command execution for Claude instances,
 * replacing WebSocket command sending with RESTful API calls.
 */

export interface CommandRequest {
  input: string;
  instanceId: string;
  timeout?: number;
}

export interface CommandResponse {
  success: boolean;
  message?: string;
  error?: string;
  instanceId: string;
  timestamp: string;
  executionTime?: number;
}

export interface CommandExecutionConfig {
  apiUrl: string;
  timeout?: number;
  retryAttempts?: number;
  retryDelay?: number;
  headers?: Record<string, string>;
}

export interface CommandExecutionStats {
  totalCommands: number;
  successfulCommands: number;
  failedCommands: number;
  averageExecutionTime: number;
  lastCommandTime: Date | null;
}

export class HTTPCommandService {
  private config: CommandExecutionConfig;
  private stats: CommandExecutionStats = {
    totalCommands: 0,
    successfulCommands: 0,
    failedCommands: 0,
    averageExecutionTime: 0,
    lastCommandTime: null
  };
  private executionTimes: number[] = [];
  private abortController: AbortController = new AbortController();

  constructor(config: CommandExecutionConfig) {
    this.config = {
      timeout: 30000, // 30 seconds default
      retryAttempts: 3,
      retryDelay: 1000,
      headers: {
        'Content-Type': 'application/json'
      },
      ...config
    };
  }

  /**
   * Execute a command on a specific Claude instance
   */
  async executeCommand(request: CommandRequest): Promise<CommandResponse> {
    const startTime = Date.now();
    this.stats.totalCommands++;

    try {
      // Validate request
      this.validateRequest(request);

      // Execute with retry logic
      const response = await this.executeWithRetry(request);
      
      // Update success stats
      this.stats.successfulCommands++;
      this.updateExecutionStats(Date.now() - startTime);
      
      return {
        ...response,
        timestamp: new Date().toISOString(),
        executionTime: Date.now() - startTime
      };

    } catch (error) {
      // Update failure stats
      this.stats.failedCommands++;
      this.stats.lastCommandTime = new Date();

      const errorMessage = error instanceof Error ? error.message : 'Command execution failed';
      
      return {
        success: false,
        error: errorMessage,
        instanceId: request.instanceId,
        timestamp: new Date().toISOString(),
        executionTime: Date.now() - startTime
      };
    }
  }

  /**
   * Execute multiple commands in batch
   */
  async executeBatch(requests: CommandRequest[]): Promise<CommandResponse[]> {
    const results = await Promise.allSettled(
      requests.map(request => this.executeCommand(request))
    );

    return results.map((result, index) => {
      if (result.status === 'fulfilled') {
        return result.value;
      } else {
        return {
          success: false,
          error: result.reason instanceof Error ? result.reason.message : 'Batch command failed',
          instanceId: requests[index].instanceId,
          timestamp: new Date().toISOString()
        };
      }
    });
  }

  /**
   * Execute commands in sequence (one after another)
   */
  async executeSequence(requests: CommandRequest[]): Promise<CommandResponse[]> {
    const results: CommandResponse[] = [];
    
    for (const request of requests) {
      try {
        const result = await this.executeCommand(request);
        results.push(result);
        
        // Stop on first failure if desired
        if (!result.success) {
          console.warn(`Command failed in sequence, stopping at: ${request.input}`);
          break;
        }
      } catch (error) {
        const errorResponse: CommandResponse = {
          success: false,
          error: error instanceof Error ? error.message : 'Sequence execution failed',
          instanceId: request.instanceId,
          timestamp: new Date().toISOString()
        };
        results.push(errorResponse);
        break;
      }
    }
    
    return results;
  }

  /**
   * Get execution statistics
   */
  getStats(): CommandExecutionStats {
    return { ...this.stats };
  }

  /**
   * Reset statistics
   */
  resetStats(): void {
    this.stats = {
      totalCommands: 0,
      successfulCommands: 0,
      failedCommands: 0,
      averageExecutionTime: 0,
      lastCommandTime: null
    };
    this.executionTimes = [];
  }

  /**
   * Test connection to instance
   */
  async testConnection(instanceId: string): Promise<boolean> {
    try {
      const response = await fetch(
        `${this.config.apiUrl}/api/claude/instances/${instanceId}/status`,
        {
          method: 'GET',
          headers: this.config.headers,
          signal: AbortSignal.timeout(5000) // 5 second timeout for status check
        }
      );

      return response.ok;
    } catch (error) {
      console.error(`Connection test failed for ${instanceId}:`, error);
      return false;
    }
  }

  /**
   * Get instance information
   */
  async getInstanceInfo(instanceId: string): Promise<any> {
    try {
      const response = await fetch(
        `${this.config.apiUrl}/api/claude/instances/${instanceId}`,
        {
          method: 'GET',
          headers: this.config.headers,
          signal: this.abortController.signal
        }
      );

      if (!response.ok) {
        throw new Error(`HTTP ${response.status}: ${response.statusText}`);
      }

      return await response.json();
    } catch (error) {
      console.error(`Failed to get instance info for ${instanceId}:`, error);
      throw error;
    }
  }

  /**
   * Cleanup resources
   */
  cleanup(): void {
    this.abortController.abort();
    this.abortController = new AbortController();
  }

  /**
   * Validate command request
   */
  private validateRequest(request: CommandRequest): void {
    if (!request.instanceId || !/^claude-[a-zA-Z0-9]+$/.test(request.instanceId)) {
      throw new Error(`Invalid instance ID format: ${request.instanceId}`);
    }

    if (!request.input || !request.input.trim()) {
      throw new Error('Command input cannot be empty');
    }

    if (request.input.length > 10000) {
      throw new Error('Command input too long (max 10000 characters)');
    }
  }

  /**
   * Execute command with retry logic
   */
  private async executeWithRetry(request: CommandRequest): Promise<CommandResponse> {
    let lastError: Error | null = null;
    
    for (let attempt = 0; attempt <= (this.config.retryAttempts || 3); attempt++) {
      try {
        return await this.performHttpRequest(request);
      } catch (error) {
        lastError = error instanceof Error ? error : new Error('Unknown error');
        
        if (attempt < (this.config.retryAttempts || 3)) {
          console.warn(`Command attempt ${attempt + 1} failed, retrying:`, error);
          await this.delay(this.config.retryDelay || 1000);
        }
      }
    }
    
    throw lastError;
  }

  /**
   * Perform the actual HTTP request
   */
  private async performHttpRequest(request: CommandRequest): Promise<CommandResponse> {
    const endpoint = `${this.config.apiUrl}/api/claude/instances/${request.instanceId}/terminal/input`;
    
    const timeoutMs = request.timeout || this.config.timeout || 30000;
    const timeoutSignal = AbortSignal.timeout(timeoutMs);
    
    // Combine abort signals
    const combinedController = new AbortController();
    const cleanup = () => combinedController.abort();
    
    this.abortController.signal.addEventListener('abort', cleanup);
    timeoutSignal.addEventListener('abort', cleanup);

    try {
      const response = await fetch(endpoint, {
        method: 'POST',
        headers: this.config.headers,
        body: JSON.stringify({
          input: request.input
        }),
        signal: combinedController.signal
      });

      if (!response.ok) {
        if (response.status === 404) {
          throw new Error(`Instance ${request.instanceId} not found`);
        } else if (response.status === 503) {
          throw new Error(`Instance ${request.instanceId} is not available`);
        } else {
          throw new Error(`HTTP ${response.status}: ${response.statusText}`);
        }
      }

      const data = await response.json();
      
      return {
        success: data.success !== false,
        message: data.message,
        error: data.error,
        instanceId: request.instanceId
      };
      
    } catch (error) {
      if (error instanceof Error) {
        if (error.name === 'AbortError') {
          throw new Error(`Command timeout after ${timeoutMs}ms`);
        }
        throw error;
      }
      throw new Error('HTTP request failed');
    } finally {
      this.abortController.signal.removeEventListener('abort', cleanup);
      timeoutSignal.removeEventListener('abort', cleanup);
    }
  }

  /**
   * Update execution statistics
   */
  private updateExecutionStats(executionTime: number): void {
    this.stats.lastCommandTime = new Date();
    this.executionTimes.push(executionTime);
    
    // Keep only last 100 execution times for moving average
    if (this.executionTimes.length > 100) {
      this.executionTimes = this.executionTimes.slice(-100);
    }
    
    // Calculate average execution time
    this.stats.averageExecutionTime = 
      this.executionTimes.reduce((sum, time) => sum + time, 0) / this.executionTimes.length;
  }

  /**
   * Utility delay function
   */
  private delay(ms: number): Promise<void> {
    return new Promise(resolve => setTimeout(resolve, ms));
  }
}

// Factory function
export const createHTTPCommandService = (config: CommandExecutionConfig): HTTPCommandService => {
  return new HTTPCommandService(config);
};

export default HTTPCommandService;