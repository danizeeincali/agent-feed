import axios, { AxiosResponse } from 'axios';
import { 
  PageDefinition,
  CreatePageRequest,
  UpdatePageRequest,
  PageResponse,
  PageListResponse,
  PublishPageRequest,
  PageVersion
} from '../../types/page.types';

const API_BASE_URL = process.env.REACT_APP_API_URL || 'http://localhost:8000';

// Create axios instance with default config
const apiClient = axios.create({
  baseURL: `${API_BASE_URL}/api/v1`,
  timeout: 30000,
  headers: {
    'Content-Type': 'application/json',
  },
});

// Request interceptor for authentication
apiClient.interceptors.request.use((config) => {
  const token = localStorage.getItem('authToken');
  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});

export const pageManagementApi = {
  // Get all pages for a workspace
  async getPages(
    agentName: string,
    filters?: {
      status?: 'draft' | 'published' | 'archived';
      search?: string;
      tags?: string[];
      page?: number;
      limit?: number;
    }
  ): Promise<PageListResponse> {
    try {
      const params = new URLSearchParams();
      
      if (filters) {
        if (filters.status) params.append('status', filters.status);
        if (filters.search) params.append('search', filters.search);
        if (filters.tags) filters.tags.forEach(tag => params.append('tags', tag));
        if (filters.page) params.append('page', filters.page.toString());
        if (filters.limit) params.append('limit', filters.limit.toString());
      }

      const response: AxiosResponse<PageListResponse> = await apiClient.get(
        `/agent-workspaces/${encodeURIComponent(agentName)}/pages?${params}`
      );
      return response.data;
    } catch (error: any) {
      throw new Error(error.response?.data?.error || 'Failed to get pages');
    }
  },

  // Create a new page
  async createPage(agentName: string, request: CreatePageRequest): Promise<PageResponse> {
    try {
      const response: AxiosResponse<PageResponse> = await apiClient.post(
        `/agent-workspaces/${encodeURIComponent(agentName)}/pages`,
        request
      );
      return response.data;
    } catch (error: any) {
      throw new Error(error.response?.data?.error || 'Failed to create page');
    }
  },

  // Get a specific page
  async getPage(agentName: string, pageId: string): Promise<PageResponse> {
    try {
      const response: AxiosResponse<PageResponse> = await apiClient.get(
        `/agent-workspaces/${encodeURIComponent(agentName)}/pages/${pageId}`
      );
      return response.data;
    } catch (error: any) {
      throw new Error(error.response?.data?.error || 'Failed to get page');
    }
  },

  // Update a page
  async updatePage(
    agentName: string, 
    pageId: string, 
    request: UpdatePageRequest
  ): Promise<PageResponse> {
    try {
      const response: AxiosResponse<PageResponse> = await apiClient.put(
        `/agent-workspaces/${encodeURIComponent(agentName)}/pages/${pageId}`,
        request
      );
      return response.data;
    } catch (error: any) {
      throw new Error(error.response?.data?.error || 'Failed to update page');
    }
  },

  // Delete a page
  async deletePage(agentName: string, pageId: string): Promise<PageResponse> {
    try {
      const response: AxiosResponse<PageResponse> = await apiClient.delete(
        `/agent-workspaces/${encodeURIComponent(agentName)}/pages/${pageId}`
      );
      return response.data;
    } catch (error: any) {
      throw new Error(error.response?.data?.error || 'Failed to delete page');
    }
  },

  // Publish a page
  async publishPage(
    agentName: string, 
    pageId: string, 
    request?: PublishPageRequest
  ): Promise<PageResponse> {
    try {
      const response: AxiosResponse<PageResponse> = await apiClient.post(
        `/agent-workspaces/${encodeURIComponent(agentName)}/pages/${pageId}/publish`,
        request || {}
      );
      return response.data;
    } catch (error: any) {
      throw new Error(error.response?.data?.error || 'Failed to publish page');
    }
  },

  // Unpublish a page
  async unpublishPage(agentName: string, pageId: string): Promise<PageResponse> {
    try {
      const response: AxiosResponse<PageResponse> = await apiClient.post(
        `/agent-workspaces/${encodeURIComponent(agentName)}/pages/${pageId}/unpublish`
      );
      return response.data;
    } catch (error: any) {
      throw new Error(error.response?.data?.error || 'Failed to unpublish page');
    }
  },

  // Get page versions
  async getPageVersions(
    agentName: string, 
    pageId: string
  ): Promise<{ success: boolean; versions?: PageVersion[]; error?: string }> {
    try {
      const response = await apiClient.get(
        `/agent-workspaces/${encodeURIComponent(agentName)}/pages/${pageId}/versions`
      );
      return response.data;
    } catch (error: any) {
      throw new Error(error.response?.data?.error || 'Failed to get page versions');
    }
  },

  // Get specific page version
  async getPageVersion(
    agentName: string, 
    pageId: string, 
    versionNumber: number
  ): Promise<{ success: boolean; version?: PageVersion; error?: string }> {
    try {
      const response = await apiClient.get(
        `/agent-workspaces/${encodeURIComponent(agentName)}/pages/${pageId}/versions/${versionNumber}`
      );
      return response.data;
    } catch (error: any) {
      throw new Error(error.response?.data?.error || 'Failed to get page version');
    }
  },

  // Restore page version
  async restorePageVersion(
    agentName: string, 
    pageId: string, 
    versionNumber: number
  ): Promise<PageResponse> {
    try {
      const response: AxiosResponse<PageResponse> = await apiClient.post(
        `/agent-workspaces/${encodeURIComponent(agentName)}/pages/${pageId}/versions/${versionNumber}/restore`
      );
      return response.data;
    } catch (error: any) {
      throw new Error(error.response?.data?.error || 'Failed to restore page version');
    }
  },

  // Render page
  async renderPage(
    agentName: string, 
    pageId: string,
    context?: Record<string, any>
  ): Promise<PageResponse> {
    try {
      const response: AxiosResponse<PageResponse> = await apiClient.get(
        `/agent-workspaces/${encodeURIComponent(agentName)}/pages/${pageId}/render`,
        { params: context }
      );
      return response.data;
    } catch (error: any) {
      throw new Error(error.response?.data?.error || 'Failed to render page');
    }
  },

  // Preview page with changes
  async previewPage(
    agentName: string, 
    pageId: string, 
    changes: Partial<PageDefinition>
  ): Promise<PageResponse> {
    try {
      const response: AxiosResponse<PageResponse> = await apiClient.post(
        `/agent-workspaces/${encodeURIComponent(agentName)}/pages/${pageId}/preview`,
        changes
      );
      return response.data;
    } catch (error: any) {
      throw new Error(error.response?.data?.error || 'Failed to preview page');
    }
  },

  // Validate page
  async validatePage(
    agentName: string, 
    pageId: string
  ): Promise<{ success: boolean; isValid?: boolean; violations?: string[]; error?: string }> {
    try {
      const response = await apiClient.post(
        `/agent-workspaces/${encodeURIComponent(agentName)}/pages/${pageId}/validate`
      );
      return response.data;
    } catch (error: any) {
      throw new Error(error.response?.data?.error || 'Failed to validate page');
    }
  },

  // Duplicate page
  async duplicatePage(
    agentName: string, 
    pageId: string,
    newTitle?: string
  ): Promise<PageResponse> {
    try {
      const response: AxiosResponse<PageResponse> = await apiClient.post(
        `/agent-workspaces/${encodeURIComponent(agentName)}/pages/${pageId}/duplicate`,
        { newTitle }
      );
      return response.data;
    } catch (error: any) {
      throw new Error(error.response?.data?.error || 'Failed to duplicate page');
    }
  },

  // Export page
  async exportPage(
    agentName: string, 
    pageId: string,
    format: 'json' | 'html' | 'markdown' = 'json'
  ): Promise<{ success: boolean; content?: string; error?: string }> {
    try {
      const response = await apiClient.get(
        `/agent-workspaces/${encodeURIComponent(agentName)}/pages/${pageId}/export`,
        { params: { format } }
      );
      return response.data;
    } catch (error: any) {
      throw new Error(error.response?.data?.error || 'Failed to export page');
    }
  },

  // Import page
  async importPage(
    agentName: string, 
    content: string,
    format: 'json' | 'html' | 'markdown' = 'json'
  ): Promise<PageResponse> {
    try {
      const response: AxiosResponse<PageResponse> = await apiClient.post(
        `/agent-workspaces/${encodeURIComponent(agentName)}/pages/import`,
        { content, format }
      );
      return response.data;
    } catch (error: any) {
      throw new Error(error.response?.data?.error || 'Failed to import page');
    }
  }
};