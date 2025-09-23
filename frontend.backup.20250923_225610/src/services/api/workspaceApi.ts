/**
 * Agent Workspace API Client
 * TypeScript API client for agent workspace operations
 */

export interface WorkspaceInfo {
  id: string;
  agent_id: string;
  workspace_path: string;
  created_at: string;
  updated_at: string;
  pages: AgentPage[];
  statistics: {
    total_pages: number;
    pages_by_type: Record<string, number>;
    pages_by_status: Record<string, number>;
    last_activity: string;
  };
}

export interface AgentPage {
  id: string;
  agent_id: string;
  title: string;
  content_type: 'text' | 'markdown' | 'json' | 'component';
  content_value: string;
  page_type: 'persistent' | 'dynamic' | 'template';
  status: 'draft' | 'published' | 'archived';
  metadata?: Record<string, any>;
  version: number;
  created_at: string;
  updated_at: string;
}

export interface CreatePageData {
  title: string;
  content_type: 'text' | 'markdown' | 'json' | 'component';
  content_value: string;
  page_type?: 'persistent' | 'dynamic' | 'template';
  status?: 'draft' | 'published' | 'archived';
  metadata?: Record<string, any>;
}

export interface UpdatePageData {
  title?: string;
  content_type?: 'text' | 'markdown' | 'json' | 'component';
  content_value?: string;
  page_type?: 'persistent' | 'dynamic' | 'template';
  status?: 'draft' | 'published' | 'archived';
  metadata?: Record<string, any>;
}

export interface PageListFilters {
  page_type?: string;
  status?: string;
  content_type?: string;
  search?: string;
  limit?: number;
  offset?: number;
}

export interface PageListResponse {
  success: boolean;
  agent_id: string;
  pages: AgentPage[];
  total: number;
  limit: number;
  offset: number;
  has_more: boolean;
}

class WorkspaceApiClient {
  private baseUrl: string;

  constructor(baseUrl: string = '/api/agent-pages/agents') {
    this.baseUrl = baseUrl;
  }

  /**
   * Initialize workspace for an agent
   */
  async initializeWorkspace(agentId: string): Promise<WorkspaceInfo> {
    const response = await fetch(`${this.baseUrl}/${agentId}/workspace/init`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
    });

    if (!response.ok) {
      const error = await response.json();
      throw new Error(error.message || 'Failed to initialize workspace');
    }

    const result = await response.json();
    return result.workspace;
  }

  /**
   * Get workspace information for an agent
   */
  async getWorkspaceInfo(agentId: string): Promise<WorkspaceInfo> {
    const response = await fetch(`${this.baseUrl}/${agentId}/workspace`);

    if (!response.ok) {
      if (response.status === 404) {
        throw new Error('Workspace not found');
      }
      const error = await response.json();
      throw new Error(error.message || 'Failed to get workspace info');
    }

    const result = await response.json();
    return result;
  }

  /**
   * List pages for an agent
   */
  async listPages(agentId: string, filters?: PageListFilters): Promise<PageListResponse> {
    const params = new URLSearchParams();
    
    if (filters) {
      Object.entries(filters).forEach(([key, value]) => {
        if (value !== undefined && value !== null) {
          params.append(key, value.toString());
        }
      });
    }

    const url = `${this.baseUrl}/${agentId}/pages${params.toString() ? '?' + params.toString() : ''}`;
    const response = await fetch(url);

    if (!response.ok) {
      const error = await response.json();
      throw new Error(error.message || 'Failed to list pages');
    }

    return await response.json();
  }

  /**
   * Create a new page for an agent
   */
  async createPage(agentId: string, pageData: CreatePageData): Promise<AgentPage> {
    const response = await fetch(`${this.baseUrl}/${agentId}/pages`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(pageData),
    });

    if (!response.ok) {
      const error = await response.json();
      throw new Error(error.message || 'Failed to create page');
    }

    const result = await response.json();
    return result.page;
  }

  /**
   * Get a specific page
   */
  async getPage(agentId: string, pageId: string): Promise<AgentPage> {
    const response = await fetch(`${this.baseUrl}/${agentId}/pages/${pageId}`);

    if (!response.ok) {
      if (response.status === 404) {
        throw new Error('Page not found');
      }
      const error = await response.json();
      throw new Error(error.message || 'Failed to get page');
    }

    const result = await response.json();
    return result.page;
  }

  /**
   * Update a specific page
   */
  async updatePage(agentId: string, pageId: string, updateData: UpdatePageData): Promise<AgentPage> {
    const response = await fetch(`${this.baseUrl}/${agentId}/pages/${pageId}`, {
      method: 'PUT',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(updateData),
    });

    if (!response.ok) {
      if (response.status === 404) {
        throw new Error('Page not found');
      }
      const error = await response.json();
      throw new Error(error.message || 'Failed to update page');
    }

    const result = await response.json();
    return result.page;
  }

  /**
   * Delete a specific page
   */
  async deletePage(agentId: string, pageId: string): Promise<void> {
    const response = await fetch(`${this.baseUrl}/${agentId}/pages/${pageId}`, {
      method: 'DELETE',
    });

    if (!response.ok) {
      if (response.status === 404) {
        throw new Error('Page not found');
      }
      const error = await response.json();
      throw new Error(error.message || 'Failed to delete page');
    }
  }

  /**
   * Check workspace service health
   */
  async checkHealth(): Promise<any> {
    const response = await fetch('/api/workspace/health');

    if (!response.ok) {
      const error = await response.json();
      throw new Error(error.message || 'Workspace service unhealthy');
    }

    return await response.json();
  }
}

// Create singleton instance
export const workspaceApi = new WorkspaceApiClient();

// Export default instance
export default workspaceApi;