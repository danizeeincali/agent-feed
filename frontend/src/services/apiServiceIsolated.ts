import { Agent, Post, ApiResponse } from '../types/api';

/**
 * Custom EventEmitter implementation for browser compatibility
 */
class BrowserEventEmitter {
  private listeners: Map<string, Function[]> = new Map();

  on(event: string, listener: Function): this {
    if (!this.listeners.has(event)) {
      this.listeners.set(event, []);
    }
    this.listeners.get(event)!.push(listener);
    return this;
  }

  emit(event: string, ...args: any[]): boolean {
    const eventListeners = this.listeners.get(event);
    if (eventListeners) {
      eventListeners.forEach(listener => listener(...args));
      return true;
    }
    return false;
  }

  removeAllListeners(event?: string): this {
    if (event) {
      this.listeners.delete(event);
    } else {
      this.listeners.clear();
    }
    return this;
  }

  listenerCount(event: string): number {
    return this.listeners.get(event)?.length || 0;
  }
}

/**
 * Isolated API Service - Prevents route conflicts
 * Each route gets its own instance with proper cleanup
 */
class IsolatedApiService extends BrowserEventEmitter {
  private baseURL: string;
  private routeKey: string;
  private abortController: AbortController;
  private activeRequests: Set<Promise<any>>;
  private isDestroyed: boolean;

  constructor(routeKey: string = 'default') {
    super();
    this.routeKey = routeKey;
    this.baseURL = '/api';
    this.abortController = new AbortController();
    this.activeRequests = new Set();
    this.isDestroyed = false;
    
    console.log(`🔌 API Service created for route: ${routeKey}`);
  }

  private async request<T>(
    endpoint: string, 
    options: RequestInit = {}
  ): Promise<ApiResponse<T>> {
    if (this.isDestroyed) {
      throw new Error(`API Service for ${this.routeKey} has been destroyed`);
    }

    const url = `${this.baseURL}${endpoint}`;
    
    const requestOptions: RequestInit = {
      ...options,
      signal: this.abortController.signal,
      headers: {
        'Content-Type': 'application/json',
        'X-Route-Key': this.routeKey,
        ...options.headers,
      },
    };

    console.log(`📡 ${this.routeKey}: ${options.method || 'GET'} ${endpoint}`);

    const requestPromise = fetch(url, requestOptions)
      .then(response => {
        if (!response.ok) {
          throw new Error(`HTTP ${response.status}: ${response.statusText}`);
        }
        return response.json();
      })
      .catch(error => {
        if (error.name === 'AbortError') {
          console.log(`🚫 Request aborted for ${this.routeKey}: ${endpoint}`);
          throw error;
        }
        console.error(`❌ Request failed for ${this.routeKey}:`, error);
        throw error;
      });

    this.activeRequests.add(requestPromise);
    
    requestPromise.finally(() => {
      this.activeRequests.delete(requestPromise);
    });

    return requestPromise;
  }

  async getAgents(): Promise<ApiResponse<Agent[]>> {
    return this.request<Agent[]>('/agents');
  }

  async getPosts(): Promise<ApiResponse<Post[]>> {
    return this.request<Post[]>('/agent-posts');
  }

  async spawnAgent(type: string, config: any): Promise<ApiResponse<Agent>> {
    return this.request<Agent>('/agents', {
      method: 'POST',
      body: JSON.stringify({ type, ...config }),
    });
  }

  async terminateAgent(agentId: string): Promise<ApiResponse<any>> {
    return this.request<any>(`/agents/${agentId}`, {
      method: 'DELETE',
    });
  }

  // Proper cleanup method
  destroy(): void {
    if (this.isDestroyed) return;
    
    console.log(`🧹 Destroying API Service for ${this.routeKey}...`);
    this.isDestroyed = true;
    
    // Cancel all active requests
    this.abortController.abort();
    
    // Wait for active requests to complete or cancel
    Promise.allSettled([...this.activeRequests]).then(() => {
      console.log(`✅ All requests cleaned up for ${this.routeKey}`);
    });
    
    // Clear all event listeners
    this.removeAllListeners();
    
    // Clear collections
    this.activeRequests.clear();
  }

  // Get status for debugging
  getStatus() {
    return {
      routeKey: this.routeKey,
      isDestroyed: this.isDestroyed,
      activeRequests: this.activeRequests.size,
      listeners: this.listenerCount('agents_updated')
    };
  }
}

// Factory function for creating isolated API services
export const createApiService = (routeKey: string): IsolatedApiService => {
  return new IsolatedApiService(routeKey);
};

export { IsolatedApiService };
export default IsolatedApiService;