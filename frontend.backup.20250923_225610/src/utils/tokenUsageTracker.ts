/**
 * Token Usage Tracker
 * Automatically tracks Claude API usage and sends data to analytics backend
 */

import { v4 as uuidv4 } from 'uuid';

interface TokenUsageData {
  session_id: string;
  user_id?: string;
  request_id: string;
  provider: 'anthropic' | 'claude-flow' | 'mcp' | 'openai';
  model: string;
  input_tokens: number;
  output_tokens: number;
  cached_tokens?: number;
  cost_input?: number; // cents
  cost_output?: number; // cents
  request_type: string;
  component?: string;
  processing_time_ms?: number;
  first_token_latency_ms?: number;
  tokens_per_second?: number;
  message_content?: string;
  response_content?: string;
  tools_used?: string[];
  metadata?: Record<string, any>;
}

class TokenUsageTracker {
  private sessionId: string;
  private userId: string;
  private isEnabled: boolean;
  private apiBase: string;
  private queue: TokenUsageData[] = [];
  private batchTimeout: NodeJS.Timeout | null = null;
  private readonly BATCH_SIZE = 10;
  private readonly BATCH_DELAY = 5000; // 5 seconds

  constructor() {
    this.sessionId = this.getOrCreateSessionId();
    this.userId = this.getUserId();
    this.isEnabled = this.checkIfEnabled();
    this.apiBase = this.getApiBase();

    // Set up periodic queue flush
    this.startPeriodicFlush();

    // Flush queue before page unload
    this.setupUnloadHandler();
  }

  private getOrCreateSessionId(): string {
    let sessionId = sessionStorage.getItem('token-analytics-session-id');
    if (!sessionId) {
      sessionId = uuidv4();
      sessionStorage.setItem('token-analytics-session-id', sessionId);
    }
    return sessionId;
  }

  private getUserId(): string {
    // Try to get user ID from various sources
    const userId = localStorage.getItem('user-id') ||
                   sessionStorage.getItem('user-id') ||
                   'anonymous';
    return userId;
  }

  private checkIfEnabled(): boolean {
    // Check if token tracking is enabled (can be controlled via environment or settings)
    return process.env.NODE_ENV !== 'test' &&
           localStorage.getItem('disable-token-tracking') !== 'true';
  }

  private getApiBase(): string {
    return process.env.REACT_APP_API_BASE || '/api/token-analytics';
  }

  private startPeriodicFlush(): void {
    setInterval(() => {
      if (this.queue.length > 0) {
        this.flushQueue();
      }
    }, this.BATCH_DELAY);
  }

  private setupUnloadHandler(): void {
    const handleUnload = () => {
      if (this.queue.length > 0) {
        // Use sendBeacon for reliable sending during page unload
        this.sendBeacon();
      }
    };

    window.addEventListener('beforeunload', handleUnload);
    window.addEventListener('pagehide', handleUnload);

    // Also handle visibility change (when tab becomes hidden)
    document.addEventListener('visibilitychange', () => {
      if (document.visibilityState === 'hidden' && this.queue.length > 0) {
        this.sendBeacon();
      }
    });
  }

  private sendBeacon(): void {
    if (!navigator.sendBeacon || this.queue.length === 0) return;

    try {
      const payload = JSON.stringify({ batch: this.queue });
      const blob = new Blob([payload], { type: 'application/json' });
      navigator.sendBeacon(`${this.apiBase}/batch`, blob);
      this.queue = [];
    } catch (error) {
      console.warn('Failed to send token usage beacon:', error);
    }
  }

  /**
   * Track a token usage event
   */
  track(data: Omit<TokenUsageData, 'session_id' | 'user_id' | 'request_id'>): void {
    if (!this.isEnabled) return;

    const usage: TokenUsageData = {
      ...data,
      session_id: this.sessionId,
      user_id: this.userId,
      request_id: uuidv4(),
    };

    // Add to queue
    this.queue.push(usage);

    // Flush immediately if batch size reached
    if (this.queue.length >= this.BATCH_SIZE) {
      this.flushQueue();
    }
  }

  /**
   * Track Claude API usage from Anthropic SDK response
   */
  trackClaudeUsage(
    response: any,
    request: {
      model: string;
      messages: any[];
      tools?: any[];
    },
    options: {
      component?: string;
      request_type?: string;
      processing_time_ms?: number;
    } = {}
  ): void {
    if (!this.isEnabled || !response?.usage) return;

    const usage = response.usage;
    const messageContent = this.extractMessageContent(request.messages);
    const responseContent = this.extractResponseContent(response);

    this.track({
      provider: 'anthropic',
      model: request.model,
      input_tokens: usage.input_tokens || 0,
      output_tokens: usage.output_tokens || 0,
      cached_tokens: usage.cache_creation_input_tokens || usage.cache_read_input_tokens || 0,
      request_type: options.request_type || 'chat',
      component: options.component || 'unknown',
      processing_time_ms: options.processing_time_ms,
      message_content: messageContent,
      response_content: responseContent,
      tools_used: request.tools?.map(t => t.name || t.function?.name) || [],
      metadata: {
        message_count: request.messages?.length || 0,
        has_tools: Boolean(request.tools?.length),
        response_stop_reason: response.stop_reason,
        response_stop_sequence: response.stop_sequence,
      }
    });
  }

  /**
   * Track MCP tool usage
   */
  trackMCPUsage(
    toolName: string,
    inputSize: number,
    outputSize: number,
    options: {
      component?: string;
      processing_time_ms?: number;
      error?: boolean;
    } = {}
  ): void {
    if (!this.isEnabled) return;

    // Estimate tokens (rough approximation: 1 token ≈ 4 characters)
    const estimatedInputTokens = Math.ceil(inputSize / 4);
    const estimatedOutputTokens = Math.ceil(outputSize / 4);

    this.track({
      provider: 'mcp',
      model: toolName,
      input_tokens: estimatedInputTokens,
      output_tokens: estimatedOutputTokens,
      request_type: 'tool_use',
      component: options.component || 'mcp',
      processing_time_ms: options.processing_time_ms,
      metadata: {
        tool_name: toolName,
        input_size: inputSize,
        output_size: outputSize,
        error: options.error || false,
      }
    });
  }

  /**
   * Track Claude Flow agent usage
   */
  trackClaudeFlowUsage(
    agentType: string,
    tokenUsage: { input: number; output: number },
    options: {
      component?: string;
      processing_time_ms?: number;
      task_id?: string;
      swarm_id?: string;
    } = {}
  ): void {
    if (!this.isEnabled) return;

    this.track({
      provider: 'claude-flow',
      model: agentType,
      input_tokens: tokenUsage.input,
      output_tokens: tokenUsage.output,
      request_type: 'agent_spawn',
      component: options.component || 'claude-flow',
      processing_time_ms: options.processing_time_ms,
      metadata: {
        agent_type: agentType,
        task_id: options.task_id,
        swarm_id: options.swarm_id,
      }
    });
  }

  private extractMessageContent(messages: any[]): string {
    if (!messages?.length) return '';

    const lastUserMessage = messages
      .filter(m => m.role === 'user')
      .pop();

    if (typeof lastUserMessage?.content === 'string') {
      return this.truncateContent(lastUserMessage.content);
    }

    if (Array.isArray(lastUserMessage?.content)) {
      const textContent = lastUserMessage.content
        .filter((c: any) => c.type === 'text')
        .map((c: any) => c.text)
        .join(' ');
      return this.truncateContent(textContent);
    }

    return '';
  }

  private extractResponseContent(response: any): string {
    if (!response?.content?.length) return '';

    const textContent = response.content
      .filter((c: any) => c.type === 'text')
      .map((c: any) => c.text)
      .join(' ');

    return this.truncateContent(textContent);
  }

  private truncateContent(content: string, maxLength: number = 500): string {
    if (content.length <= maxLength) return content;
    return content.substring(0, maxLength) + '...';
  }

  private async flushQueue(): Promise<void> {
    if (this.queue.length === 0) return;

    const batch = [...this.queue];
    this.queue = [];

    try {
      const response = await fetch(`${this.apiBase}/batch`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ batch }),
      });

      if (!response.ok) {
        console.warn('Failed to send token usage batch:', response.statusText);
        // Re-add to queue for retry (but limit retries to prevent infinite loop)
        if (batch.length < 100) {
          this.queue.unshift(...batch);
        }
      }
    } catch (error) {
      console.warn('Failed to send token usage batch:', error);
      // Re-add to queue for retry
      if (batch.length < 100) {
        this.queue.unshift(...batch);
      }
    }
  }

  /**
   * Enable/disable tracking
   */
  setEnabled(enabled: boolean): void {
    this.isEnabled = enabled;
    localStorage.setItem('disable-token-tracking', enabled ? 'false' : 'true');

    if (!enabled && this.queue.length > 0) {
      // Flush remaining queue when disabling
      this.flushQueue();
    }
  }

  /**
   * Get tracking status
   */
  getStatus(): {
    enabled: boolean;
    sessionId: string;
    userId: string;
    queueSize: number;
  } {
    return {
      enabled: this.isEnabled,
      sessionId: this.sessionId,
      userId: this.userId,
      queueSize: this.queue.length,
    };
  }

  /**
   * Manually flush the queue
   */
  flush(): Promise<void> {
    return this.flushQueue();
  }

  /**
   * Reset session (generates new session ID)
   */
  resetSession(): void {
    this.sessionId = uuidv4();
    sessionStorage.setItem('token-analytics-session-id', this.sessionId);
  }
}

// Create singleton instance
export const tokenUsageTracker = new TokenUsageTracker();

// Export for testing
export { TokenUsageTracker };

// Helper function to wrap Claude API calls with automatic tracking
export function withTokenTracking<T extends (...args: any[]) => Promise<any>>(
  fn: T,
  options: {
    component: string;
    request_type?: string;
    extractRequest?: (args: Parameters<T>) => any;
  }
): T {
  return (async (...args: Parameters<T>) => {
    const startTime = Date.now();

    try {
      const result = await fn(...args);
      const processingTime = Date.now() - startTime;

      // Extract request data if function provided
      const request = options.extractRequest ? options.extractRequest(args) : args[0];

      // Track the usage
      if (result && typeof result === 'object' && result.usage) {
        tokenUsageTracker.trackClaudeUsage(result, request, {
          component: options.component,
          request_type: options.request_type || 'api_call',
          processing_time_ms: processingTime,
        });
      }

      return result;
    } catch (error) {
      // Track failed requests too (with 0 tokens)
      const processingTime = Date.now() - startTime;
      const request = options.extractRequest ? options.extractRequest(args) : args[0];

      tokenUsageTracker.track({
        provider: 'anthropic',
        model: request?.model || 'unknown',
        input_tokens: 0,
        output_tokens: 0,
        request_type: options.request_type || 'api_call',
        component: options.component,
        processing_time_ms: processingTime,
        metadata: {
          error: true,
          error_message: error instanceof Error ? error.message : 'Unknown error',
        }
      });

      throw error;
    }
  }) as T;
}

export default tokenUsageTracker;