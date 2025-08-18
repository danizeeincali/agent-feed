import { Agent, Task, Workflow, OrchestrationState } from '@/types';

class ApiService {
  private baseUrl: string;

  constructor(baseUrl: string = '/api/v1') {
    this.baseUrl = baseUrl;
  }

  private async request<T>(
    endpoint: string,
    options: RequestInit = {}
  ): Promise<T> {
    const url = `${this.baseUrl}${endpoint}`;
    
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
      
      return await response.json();
    } catch (error) {
      console.error(`API request failed: ${endpoint}`, error);
      throw error;
    }
  }

  // Agent Management
  async getAgents(): Promise<Agent[]> {
    return this.request<Agent[]>('/agents');
  }

  // Agent Posts
  async getAgentPosts(limit = 20, offset = 0): Promise<any> {
    return this.request<any>(`/agent-posts?limit=${limit}&offset=${offset}`);
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

  // Health Check
  async healthCheck(): Promise<{ status: string; timestamp: string }> {
    return this.request<{ status: string; timestamp: string }>('/health');
  }
}

export const apiService = new ApiService();