import { Agent, Task, Workflow, OrchestrationState } from '@/types';

class ApiService {
  private baseUrl: string;
  private cache: Map<string, { data: any; timestamp: number; ttl: number }> = new Map();

  constructor(baseUrl: string = '/api/v1') {
    this.baseUrl = baseUrl;
  }

  // Cache management
  private getCacheKey(endpoint: string, params?: string): string {
    return `${endpoint}${params ? `?${params}` : ''}`;
  }

  private getCachedData<T>(key: string): T | null {
    const cached = this.cache.get(key);
    if (cached && Date.now() - cached.timestamp < cached.ttl) {
      return cached.data as T;
    }
    this.cache.delete(key);
    return null;
  }

  private setCachedData(key: string, data: any, ttl: number = 5000): void {
    this.cache.set(key, {
      data,
      timestamp: Date.now(),
      ttl
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

  private async request<T>(
    endpoint: string,
    options: RequestInit = {},
    useCache: boolean = false,
    cacheTtl: number = 5000
  ): Promise<T> {
    const url = `${this.baseUrl}${endpoint}`;
    const cacheKey = this.getCacheKey(endpoint, options.method === 'GET' ? JSON.stringify(options) : undefined);
    
    // Check cache for GET requests
    if (useCache && (!options.method || options.method === 'GET')) {
      const cachedData = this.getCachedData<T>(cacheKey);
      if (cachedData) {
        return cachedData;
      }
    }
    
    const config: RequestInit = {
      headers: {
        'Content-Type': 'application/json',
        ...options.headers,
      },
      ...options,
    };

    try {
      const response = await fetch(url, config);
      
      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }
      
      const data = await response.json();
      
      // Cache successful GET requests
      if (useCache && (!options.method || options.method === 'GET')) {
        this.setCachedData(cacheKey, data, cacheTtl);
      }
      
      return data;
    } catch (error) {
      console.error(`API request failed: ${endpoint}`, error);
      throw error;
    }
  }

  // Agent Management
  async getAgents(): Promise<Agent[]> {
    return this.request<Agent[]>('/agents');
  }

  // Agent Posts - Enhanced with full database API
  async getAgentPosts(
    limit = 50, 
    offset = 0, 
    filter = 'all', 
    search = '', 
    sortBy = 'published_at', 
    sortOrder = 'DESC'
  ): Promise<any> {
    const params = new URLSearchParams({
      limit: limit.toString(),
      offset: offset.toString(),
      filter,
      search,
      sortBy,
      sortOrder
    });
    return this.request<any>(`/agent-posts?${params}`, {}, false);
  }

  async getAgentPost(id: string): Promise<any> {
    return this.request<any>(`/agent-posts/${id}`);
  }

  async createAgentPost(postData: {
    title: string;
    content: string;
    authorAgent: string;
    metadata?: any;
  }): Promise<any> {
    this.clearCache('/agent-posts');
    return this.request<any>('/agent-posts', {
      method: 'POST',
      body: JSON.stringify(postData),
    });
  }

  async updatePostEngagement(postId: string, action: 'like' | 'unlike' | 'comment'): Promise<any> {
    this.clearCache('/agent-posts');
    return this.request<any>(`/agent-posts/${postId}/engagement`, {
      method: 'PUT',
      body: JSON.stringify({ action }),
    });
  }

  async searchPosts(query: string, limit = 20, offset = 0): Promise<any> {
    const params = new URLSearchParams({
      q: query,
      limit: limit.toString(),
      offset: offset.toString()
    });
    return this.request<any>(`/search/posts?${params}`);
  }

  async getFeedStats(): Promise<any> {
    return this.request<any>('/stats', {}, true, 30000); // Cache for 30 seconds
  }

  async getAgent(id: string): Promise<Agent> {
    return this.request<Agent>(`/agents/${id}`);
  }

  async spawnAgent(type: string, config?: any): Promise<Agent> {
    return this.request<Agent>('/agents/spawn', {
      method: 'POST',
      body: JSON.stringify({ type, config }),
    });
  }

  async terminateAgent(id: string): Promise<void> {
    return this.request<void>(`/agents/${id}/terminate`, {
      method: 'DELETE',
    });
  }

  // Task Management
  async getTasks(): Promise<Task[]> {
    return this.request<Task[]>('/tasks');
  }

  async getTask(id: string): Promise<Task> {
    return this.request<Task>(`/tasks/${id}`);
  }

  async createTask(task: Partial<Task>): Promise<Task> {
    return this.request<Task>('/tasks', {
      method: 'POST',
      body: JSON.stringify(task),
    });
  }

  async updateTask(id: string, updates: Partial<Task>): Promise<Task> {
    return this.request<Task>(`/tasks/${id}`, {
      method: 'PATCH',
      body: JSON.stringify(updates),
    });
  }

  async cancelTask(id: string): Promise<void> {
    return this.request<void>(`/tasks/${id}/cancel`, {
      method: 'POST',
    });
  }

  // Workflow Management
  async getWorkflows(): Promise<Workflow[]> {
    return this.request<Workflow[]>('/workflows');
  }

  async getWorkflow(id: string): Promise<Workflow> {
    return this.request<Workflow>(`/workflows/${id}`);
  }

  async createWorkflow(workflow: Partial<Workflow>): Promise<Workflow> {
    return this.request<Workflow>('/workflows', {
      method: 'POST',
      body: JSON.stringify(workflow),
    });
  }

  async startWorkflow(id: string): Promise<void> {
    return this.request<void>(`/workflows/${id}/start`, {
      method: 'POST',
    });
  }

  async pauseWorkflow(id: string): Promise<void> {
    return this.request<void>(`/workflows/${id}/pause`, {
      method: 'POST',
    });
  }

  async stopWorkflow(id: string): Promise<void> {
    return this.request<void>(`/workflows/${id}/stop`, {
      method: 'POST',
    });
  }

  // Orchestration
  async getOrchestrationState(): Promise<OrchestrationState> {
    return this.request<OrchestrationState>('/orchestration/state');
  }

  async orchestrateTask(description: string, options?: any): Promise<{ taskId: string; workflowId: string }> {
    return this.request<{ taskId: string; workflowId: string }>('/orchestration/task', {
      method: 'POST',
      body: JSON.stringify({ description, options }),
    });
  }

  // Background Operations
  async getBackgroundActivities(): Promise<any[]> {
    return this.request<any[]>('/activities/background');
  }

  async triggerBackgroundProcess(type: string, params: any): Promise<{ processId: string }> {
    return this.request<{ processId: string }>('/activities/trigger', {
      method: 'POST',
      body: JSON.stringify({ type, params }),
    });
  }

  // System Metrics
  async getSystemMetrics(): Promise<any> {
    return this.request<any>('/metrics/system');
  }

  async getPerformanceMetrics(): Promise<any> {
    return this.request<any>('/metrics/performance');
  }

  // Claude Instance Management
  async getClaudeInstances(useCache: boolean = false): Promise<any> {
    return this.request<any>('/claude/instances', {}, useCache, 2000); // 2 second cache
  }

  async createClaudeInstance(config: any): Promise<any> {
    // Clear cache after creating instance
    this.clearCache('/claude/instances');
    return this.request<any>('/v1/claude/instances', {
      method: 'POST',
      body: JSON.stringify(config),
    });
  }

  async terminateClaudeInstance(instanceId: string): Promise<any> {
    // Clear cache after terminating instance
    this.clearCache('/claude/instances');
    return this.request<any>(`/v1/claude/instances/${instanceId}`, {
      method: 'DELETE',
    });
  }

  async getClaudeInstanceStatus(instanceId: string): Promise<any> {
    return this.request<any>(`/claude/instances/${instanceId}/status`);
  }

  // Health Check
  async healthCheck(): Promise<{ status: string; timestamp: string }> {
    return this.request<{ status: string; timestamp: string }>('/health');
  }

  // Connection status check
  async checkDatabaseConnection(): Promise<{ connected: boolean; fallback: boolean }> {
    try {
      const health = await this.healthCheck();
      return {
        connected: health.status === 'healthy',
        fallback: false
      };
    } catch (error) {
      return {
        connected: false,
        fallback: true
      };
    }
  }
}

export const apiService = new ApiService();