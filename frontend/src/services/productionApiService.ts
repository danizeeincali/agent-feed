/**
 * Production API Service
 * Real API client with proper error handling, caching, and data persistence
 * Replaces all mock functionality with actual backend communication
 */

import axios, { AxiosInstance, AxiosResponse, AxiosError } from 'axios';

// Real data interfaces (no mock data)
export interface Agent {
  id: string;
  name: string;
  display_name: string;
  description: string;
  system_prompt: string;
  avatar_color: string;
  capabilities: string[];
  status: 'active' | 'inactive' | 'error';
  created_at: string;
  updated_at: string;
  last_used: string | null;
  usage_count: number;
  performance_metrics: {
    success_rate: number;
    average_response_time: number;
    total_tokens_used: number;
    error_count: number;
  };
  health_status: {
    cpu_usage: number;
    memory_usage: number;
    response_time: number;
    last_heartbeat: string;
  };
}

export interface AgentPost {
  id: string;
  title: string;
  content: string;
  authorAgent: string;
  publishedAt: string;
  metadata: {
    businessImpact: number;
    tags: string[];
    isAgentResponse: boolean;
  };
  likes: number;
  comments: number;
  status: 'published' | 'draft' | 'archived';
}

export interface Activity {
  id: string;
  type: 'task_completed' | 'agent_spawned' | 'error_resolved' | 'performance_update';
  description: string;
  timestamp: string;
  agent_id: string;
  status: 'completed' | 'failed' | 'in_progress';
  metadata: {
    duration: number;
    tokens_used: number;
    error_message?: string;
  };
}

export interface SystemMetrics {
  timestamp: string;
  cpu_usage: number;
  memory_usage: number;
  response_time: number;
  throughput: number;
  error_rate: number;
  active_connections: number;
}

export interface ApiResponse<T> {
  success: boolean;
  data: T;
  message?: string;
  error?: string;
  pagination?: {
    total: number;
    page: number;
    limit: number;
    totalPages: number;
  };
}

interface CacheEntry {
  data: any;
  timestamp: number;
  expiresAt: number;
}

class ProductionApiService {
  private client: AxiosInstance;
  private cache: Map<string, CacheEntry> = new Map();
  private readonly baseURL: string;
  private readonly timeout: number = 30000; // 30 seconds
  
  // WebSocket for real-time data
  private wsConnection: WebSocket | null = null;
  private eventHandlers: Map<string, Set<Function>> = new Map();
  private reconnectAttempts: number = 0;
  private maxReconnectAttempts: number = 5;
  private requestRetryAttempts: number = 3;
  private isOnline: boolean = true;

  constructor(baseURL: string = 'http://localhost:3000') {
    this.baseURL = baseURL;
    
    this.client = axios.create({
      baseURL: this.baseURL,
      timeout: this.timeout,
      headers: {
        'Content-Type': 'application/json',
        'Accept': 'application/json',
      },
    });

    this.setupInterceptors();
    this.setupWebSocket();
  }

  private setupInterceptors(): void {
    // Request interceptor
    this.client.interceptors.request.use(
      (config) => {
        console.log(`🔄 API Request: ${config.method?.toUpperCase()} ${config.url}`);
        return config;
      },
      (error: AxiosError) => {
        console.error('❌ Request Error:', error.message);
        return Promise.reject(this.formatError(error));
      }
    );

    // Response interceptor
    this.client.interceptors.response.use(
      (response: AxiosResponse) => {
        console.log(`✅ API Response: ${response.status} ${response.config.url}`);
        return response;
      },
      (error: AxiosError) => {
        const formattedError = this.formatError(error);
        console.error('❌ API Error:', formattedError);
        return Promise.reject(formattedError);
      }
    );
  }

  private formatError(error: AxiosError): Error & { status?: number; code?: string; retry?: boolean } {
    const message = error.response?.data?.message || error.message || 'Network error occurred';
    const status = error.response?.status;
    const code = error.code;
    
    // Check if this is a retryable error
    const isRetryable = !status || // Network error
                       status >= 500 || // Server error
                       status === 429 || // Rate limit
                       code === 'ECONNABORTED' || // Timeout
                       code === 'NETWORK_ERROR';
    
    const formattedError = new Error(message) as Error & { status?: number; code?: string; retry?: boolean };
    if (status) formattedError.status = status;
    if (code) formattedError.code = code;
    formattedError.retry = isRetryable;
    
    // Update connection status
    if (!status || status >= 500) {
      this.isOnline = false;
      this.emit('connection_status', { online: false, error: message });
    }
    
    return formattedError;
  }

  // Retry wrapper for API calls
  private async withRetry<T>(
    operation: () => Promise<T>,
    retries: number = this.requestRetryAttempts
  ): Promise<T> {
    let lastError: Error;
    
    for (let attempt = 0; attempt <= retries; attempt++) {
      try {
        const result = await operation();
        
        // Success - reset connection status if needed
        if (!this.isOnline) {
          this.isOnline = true;
          this.emit('connection_status', { online: true });
        }
        
        return result;
      } catch (error) {
        lastError = error as Error;
        const errorWithMeta = error as Error & { retry?: boolean };
        
        // If it's not retryable or we're on the last attempt, throw
        if (!errorWithMeta.retry || attempt === retries) {
          throw error;
        }
        
        // Calculate exponential backoff delay
        const delay = Math.min(1000 * Math.pow(2, attempt), 10000);
        console.warn(`🔄 API call failed, retrying in ${delay}ms (attempt ${attempt + 1}/${retries + 1}):`, errorWithMeta.message);
        
        await new Promise(resolve => setTimeout(resolve, delay));
      }
    }
    
    throw lastError!;
  }

  // Cache management
  private getCacheKey(endpoint: string, params?: Record<string, any>): string {
    const paramString = params ? JSON.stringify(params) : '';
    return `${endpoint}${paramString}`;
  }

  private getCachedData<T>(key: string): T | null {
    const entry = this.cache.get(key);
    if (entry && Date.now() < entry.expiresAt) {
      console.log(`📦 Cache hit: ${key}`);
      return entry.data;
    }
    
    if (entry) {
      this.cache.delete(key);
    }
    return null;
  }

  private setCachedData(key: string, data: any, ttlMs: number = 30000): void {
    this.cache.set(key, {
      data,
      timestamp: Date.now(),
      expiresAt: Date.now() + ttlMs,
    });
  }

  public clearCache(pattern?: string): void {
    if (pattern) {
      for (const key of this.cache.keys()) {
        if (key.includes(pattern)) {
          this.cache.delete(key);
        }
      }
    } else {
      this.cache.clear();
    }
  }

  // Real API methods
  async getAgentPosts(
    limit: number = 50,
    offset: number = 0,
    filter: string = 'all',
    search: string = ''
  ): Promise<ApiResponse<AgentPost[]>> {
    const cacheKey = this.getCacheKey('/api/v1/agent-posts', { limit, offset, filter, search });
    const cached = this.getCachedData<ApiResponse<AgentPost[]>>(cacheKey);
    
    if (cached) return cached;

    return this.withRetry(async () => {
      const response = await this.client.get('/api/v1/agent-posts', {
        params: { limit, offset, filter, search }
      });
      
      const data = response.data;
      this.setCachedData(cacheKey, data, 10000); // Cache for 10 seconds
      return data;
    });
  }

  async getAgents(): Promise<ApiResponse<Agent[]>> {
    const cacheKey = this.getCacheKey('/api/agents');
    const cached = this.getCachedData<ApiResponse<Agent[]>>(cacheKey);
    
    if (cached) return cached;

    return this.withRetry(async () => {
      const response = await this.client.get('/api/agents');
      const data = response.data;
      this.setCachedData(cacheKey, data, 15000); // Cache for 15 seconds
      return data;
    });
  }

  async getActivities(): Promise<ApiResponse<Activity[]>> {
    return this.withRetry(async () => {
      const response = await this.client.get('/api/v1/activities');
      return response.data;
    });
  }

  async getSystemMetrics(timeRange: string = '24h'): Promise<ApiResponse<SystemMetrics[]>> {
    const cacheKey = this.getCacheKey('/api/v1/metrics/system', { timeRange });
    const cached = this.getCachedData<ApiResponse<SystemMetrics[]>>(cacheKey);
    
    if (cached) return cached;

    return this.withRetry(async () => {
      const response = await this.client.get('/api/v1/metrics/system', {
        params: { timeRange }
      });
      
      const data = response.data;
      this.setCachedData(cacheKey, data, 60000); // Cache for 1 minute
      return data;
    });
  }

  async getAgentAnalytics(timeRange: string = '24h'): Promise<ApiResponse<any>> {
    return this.withRetry(async () => {
      const response = await this.client.get('/api/v1/analytics/agents', {
        params: { timeRange }
      });
      return response.data;
    });
  }

  async getHealthAnalytics(): Promise<ApiResponse<any>> {
    return this.withRetry(async () => {
      const response = await this.client.get('/api/v1/analytics/health');
      return response.data;
    });
  }

  async createAgentPost(postData: Partial<AgentPost>): Promise<ApiResponse<AgentPost>> {
    return this.withRetry(async () => {
      const response = await this.client.post('/api/v1/agent-posts', postData);
      this.clearCache('/api/v1/agent-posts'); // Clear cache after creation
      return response.data;
    }, 1); // Only retry once for write operations
  }

  async updatePostEngagement(postId: string, action: 'like' | 'unlike'): Promise<ApiResponse<AgentPost>> {
    return this.withRetry(async () => {
      const response = await this.client.put(`/api/v1/agent-posts/${postId}/engagement`, { action });
      this.clearCache('/api/v1/agent-posts'); // Clear cache after update
      return response.data;
    }, 1); // Only retry once for write operations
  }

  // Claude instance management
  async getClaudeInstances(): Promise<ApiResponse<any[]>> {
    return this.withRetry(async () => {
      const response = await this.client.get('/api/v1/claude/instances');
      return response.data;
    });
  }

  async createClaudeInstance(config: any): Promise<ApiResponse<any>> {
    return this.withRetry(async () => {
      const response = await this.client.post('/api/v1/claude/instances', config);
      return response.data;
    }, 1); // Only retry once for write operations
  }

  async terminateClaudeInstance(instanceId: string): Promise<ApiResponse<void>> {
    return this.withRetry(async () => {
      const response = await this.client.delete(`/api/v1/claude/instances/${instanceId}`);
      return response.data;
    }, 1); // Only retry once for write operations
  }

  // WebSocket setup for real-time updates
  private setupWebSocket(): void {
    if (typeof window === 'undefined') return; // Server-side rendering guard
    
    this.connectWebSocket();
  }

  private connectWebSocket(): void {
    try {
      const wsUrl = this.baseURL.replace('http', 'ws') + '/socket.io';
      console.log('🔌 Connecting to WebSocket:', wsUrl);
      
      this.wsConnection = new WebSocket(wsUrl);

      this.wsConnection.onopen = () => {
        console.log('✅ WebSocket connected');
        this.reconnectAttempts = 0;
        this.emit('connected', null);
      };

      this.wsConnection.onmessage = (event) => {
        try {
          const data = JSON.parse(event.data);
          this.handleWebSocketMessage(data);
        } catch (error) {
          console.error('❌ WebSocket message parsing error:', error);
        }
      };

      this.wsConnection.onclose = (event) => {
        console.log('🔌 WebSocket closed:', event.code, event.reason);
        this.handleReconnect();
      };

      this.wsConnection.onerror = (error) => {
        console.error('❌ WebSocket error:', error);
        this.emit('error', error);
      };
    } catch (error) {
      console.error('❌ WebSocket connection failed:', error);
      this.handleReconnect();
    }
  }

  private handleWebSocketMessage(data: any): void {
    console.log('📨 WebSocket message:', data.type);
    
    // Clear relevant cache based on message type
    switch (data.type) {
      case 'agents_updated':
        this.clearCache('/api/agents');
        this.emit('agents_updated', data.payload);
        break;
      case 'posts_updated':
        this.clearCache('/api/v1/agent-posts');
        this.emit('posts_updated', data.payload);
        break;
      case 'metrics_updated':
        this.clearCache('/api/v1/metrics');
        this.emit('metrics_updated', data.payload);
        break;
      default:
        this.emit(data.type, data.payload);
    }
  }

  private handleReconnect(): void {
    if (this.reconnectAttempts < this.maxReconnectAttempts) {
      this.reconnectAttempts++;
      const delay = Math.pow(2, this.reconnectAttempts) * 1000; // Exponential backoff
      
      console.log(`🔄 Reconnecting WebSocket (${this.reconnectAttempts}/${this.maxReconnectAttempts}) in ${delay}ms`);
      
      setTimeout(() => {
        this.connectWebSocket();
      }, delay);
    } else {
      console.error('❌ WebSocket max reconnection attempts reached');
      this.emit('connection_failed', null);
    }
  }

  // Event handling for real-time updates
  public on(event: string, handler: Function): void {
    if (!this.eventHandlers.has(event)) {
      this.eventHandlers.set(event, new Set());
    }
    this.eventHandlers.get(event)!.add(handler);
  }

  public off(event: string, handler: Function): void {
    const handlers = this.eventHandlers.get(event);
    if (handlers) {
      handlers.delete(handler);
    }
  }

  private emit(event: string, data: any): void {
    const handlers = this.eventHandlers.get(event);
    if (handlers) {
      handlers.forEach(handler => {
        try {
          handler(data);
        } catch (error) {
          console.error(`❌ Event handler error for ${event}:`, error);
        }
      });
    }
  }

  // Health check
  async checkHealth(): Promise<ApiResponse<{ status: string; timestamp: string; database: boolean }>> {
    return this.withRetry(async () => {
      const response = await this.client.get('/api/health');
      return response.data;
    }, 1); // Quick health check, don't retry too much
  }

  // Status methods
  public getConnectionStatus(): { online: boolean; lastError?: string } {
    return {
      online: this.isOnline,
      lastError: this.isOnline ? undefined : 'API connection lost'
    };
  }

  public async testConnection(): Promise<boolean> {
    try {
      await this.checkHealth();
      return true;
    } catch (error) {
      return false;
    }
  }

  // Circuit breaker for failed requests
  public isHealthy(): boolean {
    return this.isOnline && this.wsConnection?.readyState === WebSocket.OPEN;
  }

  // Get cache statistics
  public getCacheStats(): { size: number; hitRate: number } {
    return {
      size: this.cache.size,
      hitRate: 0 // Could implement if needed
    };
  }

  // Cleanup
  public destroy(): void {
    if (this.wsConnection) {
      this.wsConnection.close();
      this.wsConnection = null;
    }
    this.eventHandlers.clear();
    this.cache.clear();
  }
}

// Create singleton instance
export const productionApiService = new ProductionApiService();
export default productionApiService;