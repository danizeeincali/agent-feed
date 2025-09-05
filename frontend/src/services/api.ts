import {
  Agent,
  AgentPost,
  Activity,
  SystemMetrics,
  AnalyticsData,
  ClaudeInstance,
  ApiResponse,
  SearchFilters,
  SearchResult,
  FilterStats,
  SavedPost
} from '@/types/api';
import { Task, Workflow, OrchestrationState } from '@/types';

class ApiService {
  private baseUrl: string;
  private cache: Map<string, { data: any; timestamp: number; ttl: number }> = new Map();
  private wsConnection: WebSocket | null = null;
  private eventHandlers: Map<string, Set<Function>> = new Map();

  constructor(baseUrl: string = 'http://localhost:3000/api/v1') {
    this.baseUrl = baseUrl;
    this.initializeWebSocket();
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
      ...options,
    };

    // Only set Content-Type header for requests with body content
    if (options.body || (!options.method || ['POST', 'PUT', 'PATCH'].includes(options.method))) {
      config.headers = {
        'Content-Type': 'application/json',
        ...options.headers,
      };
    } else if (options.headers) {
      config.headers = options.headers;
    }

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

  // WebSocket initialization for real-time updates
  private initializeWebSocket(): void {
    if (typeof window === 'undefined') return;
    
    try {
      const wsUrl = 'ws://localhost:3000/ws';
      this.wsConnection = new WebSocket(wsUrl);
      
      this.wsConnection.onopen = () => {
        console.log('✅ Real-time WebSocket connected');
        this.emit('connected', null);
      };
      
      this.wsConnection.onmessage = (event) => {
        try {
          const data = JSON.parse(event.data);
          this.handleRealTimeUpdate(data);
        } catch (error) {
          console.error('❌ WebSocket message parsing error:', error);
        }
      };
      
      this.wsConnection.onclose = () => {
        console.log('🔌 WebSocket connection closed');
        this.attemptReconnect();
      };
      
      this.wsConnection.onerror = (error) => {
        console.error('❌ WebSocket error:', error);
      };
    } catch (error) {
      console.error('❌ Failed to initialize WebSocket:', error);
    }
  }

  private handleRealTimeUpdate(data: any): void {
    // Clear relevant cache based on update type
    switch (data.type) {
      case 'agents_updated':
        this.clearCache('/agents');
        this.emit('agents_updated', data.payload);
        break;
      case 'posts_updated':
        this.clearCache('/agent-posts');
        this.emit('posts_updated', data.payload);
        break;
      case 'metrics_updated':
        this.clearCache('/metrics');
        this.emit('metrics_updated', data.payload);
        break;
      default:
        this.emit(data.type, data.payload);
    }
  }

  private attemptReconnect(): void {
    setTimeout(() => {
      console.log('🔄 Attempting WebSocket reconnection...');
      this.initializeWebSocket();
    }, 5000);
  }

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

  // Agent Management - Real database calls
  async getAgents(): Promise<ApiResponse<Agent[]>> {
    const cached = this.getCachedData<ApiResponse<Agent[]>>('/agents');
    if (cached) return cached;
    
    const response = await this.request<ApiResponse<Agent[]>>('/agents', {}, true, 15000);
    return response;
  }

  // Agent Posts - Real database integration
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
    
    const cacheKey = `/agent-posts?${params}`;
    const cached = this.getCachedData<any>(cacheKey);
    if (cached) return cached;
    
    try {
      const response = await this.request<any>(`/agent-posts?${params}`, {}, false);
      this.setCachedData(cacheKey, response, 10000); // 10 second cache
      
      // Normalize the response format for components
      if (response.success && response.data) {
        return {
          success: true,
          data: response.data,
          total: response.total || response.data.length,
          posts: response.data // For backward compatibility
        };
      }
      
      return response;
    } catch (error) {
      console.error('API Error in getAgentPosts:', error);
      return {
        success: false,
        data: [],
        posts: [],
        total: 0,
        error: error instanceof Error ? error.message : 'Unknown error'
      };
    }
  }

  async getAgentPost(id: string): Promise<ApiResponse<AgentPost>> {
    return this.request<ApiResponse<AgentPost>>(`/agent-posts/${id}`);
  }

  async createAgentPost(postData: Partial<AgentPost>): Promise<ApiResponse<AgentPost>> {
    this.clearCache('/agent-posts');
    return this.request<ApiResponse<AgentPost>>('/agent-posts', {
      method: 'POST',
      body: JSON.stringify(postData),
    });
  }

  async updatePostEngagement(postId: string, action: 'comment'): Promise<ApiResponse<AgentPost>> {
    this.clearCache('/agent-posts');
    return this.request<ApiResponse<AgentPost>>(`/agent-posts/${postId}/engagement`, {
      method: 'PUT',
      body: JSON.stringify({ action }),
    });
  }


  // Save/unsave posts with improved error handling
  async savePost(postId: string, save: boolean, userId = 'anonymous'): Promise<ApiResponse<void>> {
    this.clearCache('/agent-posts');
    this.clearCache('/saved-posts');
    this.clearCache('/filter-stats');
    
    if (save) {
      // Save post - use POST
      return this.request<ApiResponse<void>>(`/agent-posts/${postId}/save`, {
        method: 'POST',
        body: JSON.stringify({ user_id: userId }),
      });
    } else {
      // Unsave post - use DELETE with query parameter (no body, no Content-Type header)
      return this.request<ApiResponse<void>>(`/agent-posts/${postId}/save?user_id=${userId}`, {
        method: 'DELETE'
      });
    }
  }

  // Check if post is saved by user
  async isPostSaved(postId: string, userId = 'anonymous'): Promise<boolean> {
    try {
      const response = await this.request<{ isSaved: boolean }>(`/agent-posts/${postId}/saved?user_id=${userId}`);
      return response.isSaved || false;
    } catch (error) {
      console.error('Error checking if post is saved:', error);
      return false;
    }
  }

  // Filter suggestions for multi-select
  async getFilterSuggestions(type: 'agents' | 'hashtags', query: string, limit: number = 10): Promise<any[]> {
    try {
      const params = new URLSearchParams({
        type: type === 'agents' ? 'agent' : 'hashtag',
        query: query.trim(),
        limit: limit.toString()
      });
      
      const response = await this.request<any>(`/filter-suggestions?${params}`, {}, false);
      
      if (response.success && response.data) {
        return response.data.map((item: any) => ({
          value: item.value,
          label: item.label || item.value,
          postCount: item.postCount || 0
        }));
      }
      
      return [];
    } catch (error) {
      console.error('Error fetching filter suggestions:', error);
      return [];
    }
  }

  // Report posts - REMOVED per user feedback

  // Delete posts
  async deletePost(postId: string): Promise<ApiResponse<void>> {
    this.clearCache('/agent-posts');
    return this.request<ApiResponse<void>>(`/agent-posts/${postId}`, {
      method: 'DELETE',
    });
  }

  // Get filtered posts - Enhanced for multi-select support
  async getFilteredPosts(
    limit = 50, 
    offset = 0, 
    filter: {
      type: 'all' | 'agent' | 'hashtag' | 'saved' | 'myposts' | 'multi-select';
      value?: string;
      agent?: string;
      hashtag?: string;
      agents?: string[];
      hashtags?: string[];
      combinationMode?: 'AND' | 'OR';
    }
  ): Promise<any> {
    // Use the main agent-posts endpoint with filter parameter (like backend expects)
    const params = new URLSearchParams({
      limit: limit.toString(),
      offset: offset.toString(),
      filter: 'all', // default
      search: '',
      sortBy: 'published_at',
      sortOrder: 'DESC'
    });
    
    // Map frontend filter types to backend filter types
    switch (filter.type) {
      case 'agent':
        if (filter.agent) {
          params.set('filter', 'by-agent');
          params.set('agent', filter.agent);
        }
        break;
      case 'hashtag':
        if (filter.hashtag) {
          params.set('filter', 'by-tags');
          params.set('tags', filter.hashtag);
        }
        break;
      case 'multi-select':
        // CRITICAL FIX: Enhanced multi-select filter handling with proper logic
        const hasAgents = filter.agents && filter.agents.length > 0;
        const hasHashtags = filter.hashtags && filter.hashtags.length > 0;
        const hasSavedPosts = filter.savedPostsEnabled === true;
        const hasMyPosts = filter.myPostsEnabled === true;
        
        // CRITICAL FIX: Multi-select should apply if ANY filter criteria exists
        // Previous bug: Only worked when saved/my posts were enabled
        if (hasAgents || hasHashtags || hasSavedPosts || hasMyPosts) {
          params.set('filter', 'multi-select');
          
          // Add agent filters - FIXED: Always set if agents exist
          if (hasAgents) {
            params.set('agents', filter.agents!.join(','));
            console.log('API: Setting agents filter:', filter.agents);
          }
          
          // Add hashtag filters - FIXED: Always set if hashtags exist
          if (hasHashtags) {
            params.set('hashtags', filter.hashtags!.join(','));
            console.log('API: Setting hashtags filter:', filter.hashtags);
          }
          
          // Add saved posts filter (optional)
          if (hasSavedPosts) {
            params.set('include_saved', 'true');
            params.set('user_id', filter.userId || 'anonymous');
            console.log('API: Setting saved posts filter');
          }
          
          // Add my posts filter (optional)
          if (hasMyPosts) {
            params.set('include_my_posts', 'true');
            params.set('user_id', filter.userId || 'anonymous');
            console.log('API: Setting my posts filter');
          }
          
          // Set combination mode (default to AND)
          params.set('mode', filter.combinationMode || 'AND');
          console.log('API: Multi-select filter applied with mode:', filter.combinationMode || 'AND');
        } else {
          // FALLBACK: No valid filters selected, show all posts
          params.set('filter', 'all');
          console.log('API: No multi-select criteria, falling back to all posts');
        }
        break;
      case 'saved':
        params.set('filter', 'saved');
        params.set('user_id', filter.userId || 'anonymous');
        break;
      case 'myposts':
        params.set('filter', 'my-posts');
        params.set('user_id', filter.userId || 'anonymous');
        break;
      default:
        params.set('filter', 'all');
    }
    
    const cacheKey = `/agent-posts?${params}`;
    const cached = this.getCachedData<any>(cacheKey);
    if (cached) return cached;
    
    try {
      const response = await this.request<any>(`/agent-posts?${params}`, {}, false);
      this.setCachedData(cacheKey, response, 5000); // 5 second cache for filtered results
      return response;
    } catch (error) {
      console.error('API Error in getFilteredPosts:', error);
      return {
        success: false,
        data: [],
        total: 0,
        error: error instanceof Error ? error.message : 'Unknown error'
      };
    }
  }

  // Get available agents and hashtags for filtering with enhanced stats
  async getFilterData(): Promise<{
    agents: string[];
    hashtags: string[];
    stats?: FilterStats;
  }> {
    const cacheKey = '/filter-data';
    const cached = this.getCachedData<{ agents: string[]; hashtags: string[]; stats?: FilterStats }>(cacheKey);
    if (cached) return cached;
    
    try {
      const response = await this.request<{ agents: string[]; hashtags: string[]; stats?: FilterStats }>('/filter-data', {}, false);
      this.setCachedData(cacheKey, response, 30000); // 30 second cache
      return response;
    } catch (error) {
      console.error('API Error in getFilterData:', error);
      return {
        agents: [],
        hashtags: []
      };
    }
  }

  // Get saved posts for current user
  async getSavedPosts(limit = 20, offset = 0, userId = 'anonymous'): Promise<ApiResponse<SavedPost[]>> {
    const params = new URLSearchParams({
      limit: limit.toString(),
      offset: offset.toString(),
      user_id: userId
    });
    return this.request<ApiResponse<SavedPost[]>>(`/saved-posts?${params}`);
  }

  // Get filter statistics with counts
  async getFilterStats(userId = 'anonymous'): Promise<FilterStats> {
    const cacheKey = `/filter-stats?user_id=${userId}`;
    const cached = this.getCachedData<FilterStats>(cacheKey);
    if (cached) return cached;
    
    try {
      const response = await this.request<FilterStats>(`/filter-stats?user_id=${userId}`, {}, false);
      this.setCachedData(cacheKey, response, 15000); // 15 second cache
      return response;
    } catch (error) {
      console.error('API Error in getFilterStats:', error);
      return {
        totalPosts: 0,
        savedPosts: 0,
        myPosts: 0,
        agentCounts: {},
        hashtagCounts: {}
      };
    }
  }

  async searchPosts(query: string, limit = 20, offset = 0): Promise<ApiResponse<SearchResult<AgentPost>>> {
    const params = new URLSearchParams({
      q: query,
      limit: limit.toString(),
      offset: offset.toString()
    });
    return this.request<ApiResponse<SearchResult<AgentPost>>>(`/search/posts?${params}`);
  }

  async getFeedStats(): Promise<ApiResponse<any>> {
    return this.request<ApiResponse<any>>('/stats', {}, true, 30000); // Cache for 30 seconds
  }

  async getAgent(id: string): Promise<ApiResponse<Agent>> {
    return this.request<ApiResponse<Agent>>(`/agents/${id}`);
  }

  async spawnAgent(type: string, config?: any): Promise<ApiResponse<Agent>> {
    this.clearCache('/agents');
    return this.request<ApiResponse<Agent>>('/agents/spawn', {
      method: 'POST',
      body: JSON.stringify({ type, config }),
    });
  }

  async terminateAgent(id: string): Promise<ApiResponse<void>> {
    this.clearCache('/agents');
    return this.request<ApiResponse<void>>(`/agents/${id}/terminate`, {
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


  async getPerformanceMetrics(): Promise<any> {
    return this.request<any>('/metrics/performance');
  }

  // System Activities - Real database calls
  async getActivities(limit = 50, offset = 0): Promise<ApiResponse<Activity[]>> {
    const params = new URLSearchParams({
      limit: limit.toString(),
      offset: offset.toString()
    });
    return this.request<ApiResponse<Activity[]>>(`/activities?${params}`);
  }

  // System Metrics - Real monitoring data
  async getSystemMetrics(timeRange: string = '24h'): Promise<ApiResponse<SystemMetrics[]>> {
    const cacheKey = `/metrics/system?range=${timeRange}`;
    const cached = this.getCachedData<ApiResponse<SystemMetrics[]>>(cacheKey);
    if (cached) return cached;
    
    const response = await this.request<ApiResponse<SystemMetrics[]>>(`/metrics/system?range=${timeRange}`);
    this.setCachedData(cacheKey, response, 60000); // 1 minute cache
    return response;
  }

  // Analytics - Real business intelligence
  async getAnalytics(timeRange: string = '24h'): Promise<ApiResponse<AnalyticsData>> {
    return this.request<ApiResponse<AnalyticsData>>(`/analytics?range=${timeRange}`);
  }

  // Claude Instance Management - Real process management
  async getClaudeInstances(useCache: boolean = false): Promise<ApiResponse<ClaudeInstance[]>> {
    return this.request<ApiResponse<ClaudeInstance[]>>('/claude/instances', {}, useCache, 2000);
  }

  async createClaudeInstance(config: any): Promise<ApiResponse<ClaudeInstance>> {
    this.clearCache('/claude/instances');
    return this.request<ApiResponse<ClaudeInstance>>('/v1/claude/instances', {
      method: 'POST',
      body: JSON.stringify(config),
    });
  }

  async terminateClaudeInstance(instanceId: string): Promise<ApiResponse<void>> {
    this.clearCache('/claude/instances');
    return this.request<ApiResponse<void>>(`/v1/claude/instances/${instanceId}`, {
      method: 'DELETE',
    });
  }

  async getClaudeInstanceStatus(instanceId: string): Promise<ApiResponse<ClaudeInstance>> {
    return this.request<ApiResponse<ClaudeInstance>>(`/claude/instances/${instanceId}/status`);
  }

  // Health Check - Real system monitoring
  async healthCheck(): Promise<ApiResponse<{ status: string; timestamp: string; database: boolean; services: Record<string, boolean> }>> {
    return this.request<ApiResponse<{ status: string; timestamp: string; database: boolean; services: Record<string, boolean> }>>('/health');
  }

  // Connection status check - Real database validation
  async checkDatabaseConnection(): Promise<{ connected: boolean; fallback: boolean; error?: string }> {
    try {
      const health = await this.healthCheck();
      return {
        connected: health.data.status === 'healthy' && health.data.database,
        fallback: false,
        error: health.data.database ? undefined : 'Database connection failed'
      };
    } catch (error) {
      return {
        connected: false,
        fallback: false,
        error: error instanceof Error ? error.message : 'Network error'
      };
    }
  }

  // Cleanup method
  public destroy(): void {
    if (this.wsConnection) {
      this.wsConnection.close();
      this.wsConnection = null;
    }
    this.eventHandlers.clear();
    this.cache.clear();
  }
}

export const apiService = new ApiService();