import { nldLogger } from './nld-logger';

interface TokenUsageData {
  provider: 'claude' | 'openai' | 'mcp' | 'claude-flow';
  model: string;
  tokensUsed: number;
  requestType: string;
  component?: string;
  metadata?: Record<string, any>;
}

type TokenTrackingCallback = (usage: TokenUsageData) => void;

/**
 * Global token usage tracking system
 * Intercepts API calls to track token consumption in real-time
 * Implements NLD-informed performance optimization and memory management
 */
class TokenInterceptor {
  private callbacks: Set<TokenTrackingCallback> = new Set();
  private originalFetch: typeof fetch;
  private isInitialized = false;

  constructor() {
    this.originalFetch = window.fetch;
  }

  /**
   * Initialize the token interceptor
   * Sets up fetch interception for automatic token tracking
   */
  public initialize(): void {
    if (this.isInitialized) {
      nldLogger.renderAttempt('TokenInterceptor', 'initialize-already-done', {});
      return;
    }

    try {
      nldLogger.renderAttempt('TokenInterceptor', 'initialize', {});

      // Intercept fetch requests
      window.fetch = this.interceptFetch.bind(this);

      // Intercept XMLHttpRequest (for older libraries)
      this.interceptXMLHttpRequest();

      // Set up MCP protocol interception
      this.interceptMCPProtocol();

      this.isInitialized = true;
      nldLogger.renderSuccess('TokenInterceptor', 'initialize');
    } catch (error) {
      nldLogger.renderFailure('TokenInterceptor', error as Error, {});
      throw error;
    }
  }

  /**
   * Add a callback to receive token usage notifications
   */
  public addCallback(callback: TokenTrackingCallback): () => void {
    this.callbacks.add(callback);
    
    // Return cleanup function
    return () => {
      this.callbacks.delete(callback);
    };
  }

  /**
   * Track token usage manually
   * Useful for tracking usage from non-HTTP sources
   */
  public trackTokenUsage(usage: TokenUsageData): void {
    try {
      nldLogger.renderAttempt('TokenInterceptor', 'trackTokenUsage', usage);

      // Notify all callbacks
      this.callbacks.forEach(callback => {
        try {
          callback(usage);
        } catch (error) {
          nldLogger.renderFailure('TokenInterceptor', error as Error, { callback: callback.name });
        }
      });

      nldLogger.renderSuccess('TokenInterceptor', 'trackTokenUsage');
    } catch (error) {
      nldLogger.renderFailure('TokenInterceptor', error as Error, usage);
    }
  }

  /**
   * Intercept fetch requests to track Claude and OpenAI API calls
   */
  private async interceptFetch(input: RequestInfo | URL, init?: RequestInit): Promise<Response> {
    const url = typeof input === 'string' ? input : input instanceof URL ? input.href : input.url;
    
    try {
      // Call original fetch
      const response = await this.originalFetch(input, init);
      
      // Check if this is an AI API call
      const tokenUsage = this.extractTokenUsageFromResponse(url, response, init);
      if (tokenUsage) {
        this.trackTokenUsage(tokenUsage);
      }

      return response;
    } catch (error) {
      nldLogger.renderFailure('TokenInterceptor', error as Error, { url });
      throw error;
    }
  }

  /**
   * Extract token usage from API response headers or body
   */
  private extractTokenUsageFromResponse(
    url: string,
    response: Response,
    init?: RequestInit
  ): TokenUsageData | null {
    try {
      // Claude API detection
      if (url.includes('anthropic.com') || url.includes('claude')) {
        const tokensUsed = this.extractClaudeTokens(response);
        if (tokensUsed > 0) {
          return {
            provider: 'claude',
            model: this.extractClaudeModel(init?.body),
            tokensUsed,
            requestType: this.getRequestType(url),
            component: this.getCurrentComponent(),
            metadata: { url, status: response.status }
          };
        }
      }

      // OpenAI API detection
      if (url.includes('openai.com') || url.includes('api.openai')) {
        const tokensUsed = this.extractOpenAITokens(response);
        if (tokensUsed > 0) {
          return {
            provider: 'openai',
            model: this.extractOpenAIModel(init?.body),
            tokensUsed,
            requestType: this.getRequestType(url),
            component: this.getCurrentComponent(),
            metadata: { url, status: response.status }
          };
        }
      }

      return null;
    } catch (error) {
      nldLogger.renderFailure('TokenInterceptor', error as Error, { url });
      return null;
    }
  }

  /**
   * Extract token count from Claude API response
   */
  private extractClaudeTokens(response: Response): number {
    try {
      // Claude typically returns token usage in headers
      const usageHeader = response.headers.get('anthropic-usage');
      if (usageHeader) {
        const usage = JSON.parse(usageHeader);
        return (usage.input_tokens || 0) + (usage.output_tokens || 0);
      }

      // Fallback: estimate from content length
      const contentLength = response.headers.get('content-length');
      if (contentLength) {
        // Rough estimate: 4 characters per token
        return Math.ceil(parseInt(contentLength) / 4);
      }

      return 0;
    } catch (error) {
      return 0;
    }
  }

  /**
   * Extract token count from OpenAI API response
   */
  private extractOpenAITokens(response: Response): number {
    try {
      // OpenAI returns usage in response body
      const usageHeader = response.headers.get('openai-usage');
      if (usageHeader) {
        const usage = JSON.parse(usageHeader);
        return usage.total_tokens || 0;
      }

      // Fallback estimation
      const contentLength = response.headers.get('content-length');
      if (contentLength) {
        return Math.ceil(parseInt(contentLength) / 4);
      }

      return 0;
    } catch (error) {
      return 0;
    }
  }

  /**
   * Extract model name from Claude API request
   */
  private extractClaudeModel(body?: BodyInit): string {
    try {
      if (typeof body === 'string') {
        const parsed = JSON.parse(body);
        return parsed.model || 'claude-3-sonnet';
      }
      return 'claude-3-sonnet';
    } catch (error) {
      return 'claude-3-sonnet';
    }
  }

  /**
   * Extract model name from OpenAI API request
   */
  private extractOpenAIModel(body?: BodyInit): string {
    try {
      if (typeof body === 'string') {
        const parsed = JSON.parse(body);
        return parsed.model || 'gpt-3.5-turbo';
      }
      return 'gpt-3.5-turbo';
    } catch (error) {
      return 'gpt-3.5-turbo';
    }
  }

  /**
   * Determine request type from URL
   */
  private getRequestType(url: string): string {
    if (url.includes('/completions')) return 'completion';
    if (url.includes('/chat')) return 'chat';
    if (url.includes('/embeddings')) return 'embedding';
    if (url.includes('/messages')) return 'message';
    return 'unknown';
  }

  /**
   * Get current React component context (if available)
   */
  private getCurrentComponent(): string | undefined {
    try {
      // Try to extract component name from React DevTools or stack trace
      const stack = new Error().stack;
      if (stack) {
        const componentMatch = stack.match(/at (\w+Component|\w+\.tsx|\w+\.jsx)/);
        if (componentMatch) {
          return componentMatch[1];
        }
      }
      return undefined;
    } catch (error) {
      return undefined;
    }
  }

  /**
   * Intercept XMLHttpRequest for legacy API calls
   */
  private interceptXMLHttpRequest(): void {
    const originalXHROpen = XMLHttpRequest.prototype.open;
    const originalXHRSend = XMLHttpRequest.prototype.send;

    XMLHttpRequest.prototype.open = function(method, url, ...args) {
      this._interceptedUrl = url;
      return originalXHROpen.apply(this, [method, url, ...args]);
    };

    XMLHttpRequest.prototype.send = function(body) {
      const xhr = this;
      const url = xhr._interceptedUrl;

      const originalOnReadyStateChange = xhr.onreadystatechange;
      xhr.onreadystatechange = function() {
        if (xhr.readyState === 4 && xhr.status === 200) {
          try {
            // Extract token usage from XHR response
            const tokenUsage = tokenInterceptor.extractTokenUsageFromXHR(url, xhr);
            if (tokenUsage) {
              tokenInterceptor.trackTokenUsage(tokenUsage);
            }
          } catch (error) {
            nldLogger.renderFailure('TokenInterceptor', error as Error, { url, method: 'XHR' });
          }
        }

        if (originalOnReadyStateChange) {
          originalOnReadyStateChange.apply(xhr);
        }
      };

      return originalXHRSend.apply(this, [body]);
    };
  }

  /**
   * Extract token usage from XMLHttpRequest response
   */
  private extractTokenUsageFromXHR(url: string, xhr: XMLHttpRequest): TokenUsageData | null {
    try {
      if (typeof url === 'string' && (url.includes('anthropic') || url.includes('openai'))) {
        // Simple estimation for XHR requests
        const responseLength = xhr.responseText?.length || 0;
        const estimatedTokens = Math.ceil(responseLength / 4);
        
        if (estimatedTokens > 0) {
          return {
            provider: url.includes('anthropic') ? 'claude' : 'openai',
            model: url.includes('anthropic') ? 'claude-3-sonnet' : 'gpt-3.5-turbo',
            tokensUsed: estimatedTokens,
            requestType: this.getRequestType(url),
            component: this.getCurrentComponent(),
            metadata: { url, method: 'XHR', status: xhr.status }
          };
        }
      }
      return null;
    } catch (error) {
      return null;
    }
  }

  /**
   * Set up MCP protocol interception
   */
  private interceptMCPProtocol(): void {
    try {
      // Intercept WebSocket messages for MCP protocol
      const originalWebSocket = window.WebSocket;
      
      window.WebSocket = class extends WebSocket {
        constructor(url: string | URL, protocols?: string | string[]) {
          super(url, protocols);
          
          // Intercept messages
          this.addEventListener('message', (event) => {
            try {
              const data = JSON.parse(event.data);
              
              // Check if this looks like an MCP message
              if (data.jsonrpc === '2.0' || data.method || data.result) {
                const estimatedTokens = Math.ceil(event.data.length / 4);
                
                if (estimatedTokens > 0) {
                  tokenInterceptor.trackTokenUsage({
                    provider: 'mcp',
                    model: 'mcp-protocol',
                    tokensUsed: estimatedTokens,
                    requestType: data.method || 'response',
                    component: 'WebSocket',
                    metadata: { 
                      messageType: data.method || 'response',
                      hasResult: !!data.result,
                      hasError: !!data.error
                    }
                  });
                }
              }
            } catch (error) {
              // Ignore parsing errors for non-JSON messages
            }
          });
        }
      };
    } catch (error) {
      nldLogger.renderFailure('TokenInterceptor', error as Error, { method: 'interceptMCPProtocol' });
    }
  }

  /**
   * Clean up and restore original functions
   */
  public cleanup(): void {
    try {
      if (this.isInitialized) {
        window.fetch = this.originalFetch;
        this.callbacks.clear();
        this.isInitialized = false;
        nldLogger.renderSuccess('TokenInterceptor', 'cleanup');
      }
    } catch (error) {
      nldLogger.renderFailure('TokenInterceptor', error as Error, {});
    }
  }
}

// Global instance
export const tokenInterceptor = new TokenInterceptor();

// Auto-initialize on import
if (typeof window !== 'undefined') {
  tokenInterceptor.initialize();
}

// Types for external use
export type { TokenUsageData, TokenTrackingCallback };